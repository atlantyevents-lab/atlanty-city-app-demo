/* sync.js — синхронизация состояния с сервером закрытого теста.
   Состояние и сеть — только при <meta name="atl-server" content="1">.
   Публичная сборка Pages (<meta name="atl-server" content="pub">) получает
   только PWA-часть: подсказка установки, service worker, fitDesk.
   Без метки 1 или pub файл ничего не делает. */
(function () {
  'use strict';
  var meta = document.querySelector('meta[name="atl-server"]');
  var ON = !!(meta && meta.content === '1');
  var PUB = !!(meta && meta.content === 'pub');
  window.__ATL_SERVER = ON;
  if (!ON && !PUB) return;

  var F = window.FIX, D = window.Demo;
  var LS_STATE = 'atl-state-v1';
  var LS_LATER = 'atl-install-later';
  var SCHEMA = 1;
  var baseRev = 0;
  var dirty = false, saving = false, queuePending = false;
  var evQueue = [];
  var saveTimer = null;

  function logErr(e) { try { console.warn('[atl-sync]', e); } catch (_) {} }

  // ---------- реестр сохраняемого состояния ----------
  // FIX: сравнение со снимком при загрузке — сохраняются только изменённые
  // объекты (статические фикстуры не сериализуются и не занимают место).
  var snap = {};
  function jstr(v) { try { return JSON.stringify(v); } catch (e) { return undefined; } }
  function snapshotFIX() {
    if (!F) return;
    Object.keys(F).forEach(function (k) {
      var v = F[k];
      if (v === null || typeof v !== 'object') return;      // функции и примитивы пропускаем
      var s = jstr(v);
      if (s !== undefined && s.length < 400000) snap[k] = s; // слишком большие не диффим
    });
  }
  function diffFIX() {
    var out = {};
    if (!F) return out;
    Object.keys(snap).forEach(function (k) {
      var s = jstr(F[k]);
      if (s !== undefined && s !== snap[k]) out[k] = JSON.parse(s);
    });
    return out;
  }
  // D.st(): живые объекты экранов (shared-состояния вида _book/_fav/PATH)
  var states = (D && D.states) || {};
  function snapshotST() {
    Object.keys(states).forEach(function (k) { var s = jstr(states[k]); if (s !== undefined) snap['@' + k] = s; });
  }
  function diffST() {
    var out = {};
    Object.keys(states).forEach(function (k) {
      var s = jstr(states[k]);
      if (s !== undefined && s !== snap['@' + k]) out[k] = JSON.parse(s);
    });
    return out;
  }
  function themeNow() {
    try { return localStorage.getItem('atlanty-demo-theme') || document.documentElement.getAttribute('data-theme') || 'summer'; }
    catch (e) { return 'summer'; }
  }
  function buildPayload() {
    var data = { theme: themeNow(), st: diffST(), fix: diffFIX() };
    var p = { schema: SCHEMA, savedAt: new Date().toISOString(), data: data };
    // лимит 256 КБ: если больше — оставляем только shared-ключи '_' и важные FIX
    var js = JSON.stringify(p);
    if (js.length > 250000) {
      var st2 = {};
      Object.keys(data.st).forEach(function (k) { if (k.charAt(0) === '_') st2[k] = data.st[k]; });
      var fix2 = {};
      ['PS', 'ME', 'CONSENTS', 'PATH_ITEMS', 'PATH_ADDED', 'PATH_ALTS', 'PATH_DISMISSED',
       'MY_BOOKINGS', 'INCOMING_REQS', 'OUTGOING_REQS', 'CHATS', 'PENDING_SCANS',
       'FEED_POSTS', 'FEED_REPORTS', 'FEED_NOTICES', 'MODERATION_QUEUE_FEED', 'FEED_MOD_LOG'
      ].forEach(function (k) { if (data.fix[k] !== undefined) fix2[k] = data.fix[k]; });
      p.data = { theme: data.theme, st: st2, fix: fix2 };
      js = JSON.stringify(p);
      if (js.length > 255000) { logErr('state too large: ' + js.length); return null; }
    }
    return p;
  }

  // глубокое слияние сохранённого в живой объект (функции и прототипы сохраняются)
  function mergeInto(dst, src) {
    if (!dst || !src || typeof dst !== 'object' || typeof src !== 'object') return;
    if (Array.isArray(src)) {
      if (Array.isArray(dst)) { dst.length = 0; src.forEach(function (x) { dst.push(x); }); }
      return;
    }
    Object.keys(src).forEach(function (k) {
      var sv = src[k], dv = dst[k];
      if (sv && typeof sv === 'object' && !Array.isArray(sv) && dv && typeof dv === 'object' && !Array.isArray(dv)) {
        mergeInto(dv, sv);
      } else {
        dst[k] = sv;
      }
    });
  }
  function applyPayload(p) {
    if (!p || p.schema !== SCHEMA || !p.data) return false;
    var d = p.data, changed = false;
    if (d.theme) {
      try { localStorage.setItem('atlanty-demo-theme', d.theme); } catch (e) {}
      if (document.documentElement.getAttribute('data-theme') !== d.theme) {
        document.documentElement.setAttribute('data-theme', d.theme); changed = true;
      }
    }
    if (d.st) {
      Object.keys(d.st).forEach(function (k) {
        var cur = states[k];
        if (cur && typeof cur === 'object') mergeInto(cur, d.st[k]);
        else states[k] = d.st[k];
        changed = true;
      });
    }
    if (d.fix && F) {
      Object.keys(d.fix).forEach(function (k) {
        if (F[k] === undefined) return;                 // неизвестные ключи игнорируем
        var sv = d.fix[k];
        if (sv && typeof sv === 'object' && F[k] && typeof F[k] === 'object') mergeInto(F[k], sv);
        else F[k] = sv;
        changed = true;
      });
    }
    return changed;
  }

  // ---------- сохранение ----------
  function persistLocal(p) {
    try { localStorage.setItem(LS_STATE, JSON.stringify({ rev: baseRev, payload: p })); } catch (e) {}
  }
  function doSave() {
    if (saving) { dirty = true; return; }
    var p = buildPayload();
    if (!p) return;
    persistLocal(p);
    saving = true;
    fetch('/api/state', {
      method: 'PUT', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ baseRev: baseRev, state: p })
    }).then(function (r) {
      if (r.status === 409) {
        return r.json().then(function (cf) {
          // серверная версия новее — забираем её
          return fetch('/api/state', { credentials: 'same-origin' }).then(function (r2) {
            return r2.json();
          }).then(function (srv) {
            if (srv && srv.state) {
              baseRev = srv.rev || baseRev;
              var changed = applyPayload(srv.state);
              D.toast('Данные обновлены с другого устройства');
              if (changed && D.rerender) D.rerender();
            }
          });
        });
      }
      if (r.ok) return r.json().then(function (j) { baseRev = j.rev; });
      if (r.status === 401) { /* сессия истекла — локально сохраняем, на сервер нет */ }
    }).catch(function () { queuePending = true; }).then(function () {
      saving = false;
      if (dirty) { dirty = false; scheduleSave(300); }
      if (queuePending) { queuePending = false; scheduleSave(1000); }
    });
  }
  function scheduleSave(ms) {
    if (saveTimer) clearTimeout(saveTimer);
    saveTimer = setTimeout(doSave, ms || 1500);
  }
  // изменения: любые клики/ввод в приложении → отложенное сохранение (только сервер)
  if (ON) {
    document.addEventListener('click', function () { scheduleSave(1500); }, true);
    document.addEventListener('input', function () { scheduleSave(1500); }, true);
    document.addEventListener('change', function () { scheduleSave(1500); }, true);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'hidden') { if (saveTimer) clearTimeout(saveTimer); doSave(); }
    });
    window.addEventListener('pagehide', function () { if (saveTimer) clearTimeout(saveTimer); doSave(); });
    window.addEventListener('online', function () { if (queuePending) scheduleSave(300); });
    setInterval(function () { if (queuePending) scheduleSave(300); }, 30000);
  }

  // ---------- восстановление ----------
  function restoreLocal() {
    try {
      var raw = localStorage.getItem(LS_STATE);
      if (!raw) return;
      var wrap = JSON.parse(raw);
      if (wrap && wrap.payload) { applyPayload(wrap.payload); baseRev = wrap.rev || 0; }
    } catch (e) { try { localStorage.removeItem(LS_STATE); } catch (_) {} sendEvent('error', { message: 'restore_error: ' + String(e).slice(0, 200) }); }
  }
  function syncFromServer() {
    fetch('/api/state', { credentials: 'same-origin' }).then(function (r) {
      if (!r.ok) return null;
      return r.json();
    }).then(function (srv) {
      if (!srv || !srv.state) { baseRev = srv ? srv.rev : baseRev; return; }
      if (srv.rev === baseRev) return;
      baseRev = srv.rev;
      var changed = applyPayload(srv.state);
      if (changed && D.rerender) D.rerender();
    }).catch(function () {});
  }

  // ---------- события ----------
  function sendEvent(kind, extra) {
    evQueue.push(Object.assign({ kind: kind, route: (location.hash || '#/A1').slice(0, 120), ts: Date.now() }, extra || {}));
    if (evQueue.length >= 20) flushEvents();
  }
  function flushEvents() {
    if (!evQueue.length) return;
    var batch = evQueue.splice(0, 50);
    fetch('/api/events', {
      method: 'POST', credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ events: batch })
    }).catch(function () { /* офлайн — теряем пачку, не критично */ });
  }
  if (ON) {
    setInterval(flushEvents, 10000);
    document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'hidden') flushEvents(); });
    window.addEventListener('pagehide', flushEvents);

    var lastHash = location.hash;
    window.addEventListener('hashchange', function () {
      var h = location.hash || '#/A1';
      if (h !== lastHash) { lastHash = h; sendEvent('view', {}); }
    });
    // действия: только имя data-act, без аргументов и без введённого текста
    document.addEventListener('click', function (e) {
      var el = e.target && e.target.closest ? e.target.closest('[data-act]') : null;
      if (el) {
        var act = el.getAttribute('data-act');
        if (act && act.indexOf('atl-') !== 0) sendEvent('action', { action: act.slice(0, 60) });
      }
    }, true);
    window.addEventListener('error', function (e) {
      sendEvent('error', { message: String(e.message || 'js error').slice(0, 300) });
    });
    window.addEventListener('unhandledrejection', function (e) {
      sendEvent('error', { message: ('promise: ' + String(e.reason && e.reason.message || e.reason)).slice(0, 300) });
    });
    window.addEventListener('load', function () {
      sendEvent('load', { ms: Math.round(performance.now()) });
    });
  }

  // ---------- UI: лист отзыва / сброс / подсказка установки ----------
  function sheet(title, bodyHTML, onSend) {
    closeSheetEl();
    var w = document.createElement('div');
    w.className = 'atl-sheet'; w.id = 'atlSheet';
    w.innerHTML = '<div class="atl-sheet-card" role="dialog" aria-modal="true" aria-label="' + title + '">' +
      '<div class="atl-sheet-h">' + title + '<button class="atl-x" data-atl="close" aria-label="Закрыть">×</button></div>' +
      '<div class="atl-sheet-b">' + bodyHTML + '</div></div>';
    w.addEventListener('click', function (e) {
      if (e.target === w || (e.target.closest && e.target.closest('[data-atl="close"]'))) closeSheetEl();
    });
    document.body.appendChild(w);
    var snd = w.querySelector('[data-atl="send"]');
    if (snd && onSend) snd.addEventListener('click', onSend);
    return w;
  }
  function closeSheetEl() { var s = document.getElementById('atlSheet'); if (s) s.remove(); }
  function toast(msg) { if (D && D.toast) D.toast(msg); }

  function openFeedback() {
    sheet('Сообщить о проблеме или идее',
      '<div class="atl-fb-row"><label>Тип</label>' +
      '<select id="atlFbType"><option value="bug">Ошибка</option><option value="idea" selected>Идея</option><option value="question">Вопрос</option></select></div>' +
      '<div class="atl-fb-row"><label>Оценка (необязательно)</label>' +
      '<select id="atlFbRate"><option value="">—</option>' + [1, 2, 3, 4, 5].map(function (n) { return '<option>' + n + '</option>'; }).join('') + '</select></div>' +
      '<textarea id="atlFbText" maxlength="2000" rows="5" placeholder="Что произошло или что хотели бы видеть"></textarea>' +
      '<div class="atl-fb-hint">Маршрут: ' + (location.hash || '#/A1') + ' · автоматически приложится тип устройства</div>' +
      '<button class="atl-btn" data-atl="send">Отправить</button>',
      function () {
        var text = document.getElementById('atlFbText').value.trim();
        if (!text) { toast('Напишите текст сообщения'); return; }
        var rate = document.getElementById('atlFbRate').value;
        fetch('/api/feedback', {
          method: 'POST', credentials: 'same-origin',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            type: document.getElementById('atlFbType').value,
            rating: rate ? parseInt(rate, 10) : null,
            text: text, route: (location.hash || '#/A1').slice(0, 120)
          })
        }).then(function (r) {
          if (r.ok) { closeSheetEl(); toast('Отправлено, спасибо'); }
          else toast('Не удалось отправить, попробуйте ещё раз');
        }).catch(function () { toast('Нет соединения, попробуйте позже'); });
      });
  }
  function openReset() {
    sheet('Сбросить мои данные теста',
      '<p class="atl-fb-hint">Будут удалены ваше состояние на сервере и локальная копия: путь, записи, избранное, профиль, отзывы остаются у организатора.</p>' +
      '<button class="atl-btn atl-danger" data-atl="send">Сбросить данные</button>',
      function () {
        fetch('/api/state', { method: 'DELETE', credentials: 'same-origin' }).catch(function () {});
        try { localStorage.removeItem(LS_STATE); } catch (e) {}
        closeSheetEl(); toast('Данные сброшены');
        setTimeout(function () { location.reload(); }, 600);
      });
  }
  if (ON && D && D.action) {
    D.action('atl-feedback', openFeedback);
    D.action('atl-reset', openReset);
  }

  // ---------- подсказка установки ----------
  var deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault(); deferredPrompt = e; maybeInstallTip();
  });
  function isStandalone() {
    return window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  }
  function maybeInstallTip() {
    if (isStandalone()) return;
    try {
      var t = parseInt(localStorage.getItem(LS_LATER) || '0', 10);
      if (t && Date.now() - t < 7 * 86400e3) return;
    } catch (e) {}
    var isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
    var body;
    if (isIOS) {
      body = '<p class="atl-fb-hint">Установите «Атланты» на экран «Домой»:<br>' +
        '1. Нажмите «Поделиться» в Safari<br>2. Выберите «На экран „Домой“»<br>3. Нажмите «Добавить»</p>';
    } else {
      body = '<p class="atl-fb-hint">Установите «Атланты» как приложение — оно будет открываться с домашнего экрана.</p>' +
        (deferredPrompt ? '<button class="atl-btn" data-atl="install">Установить</button>' :
          '<p class="atl-fb-hint">Меню браузера (⋮) → «Установить приложение» или «Добавить на главный экран».</p>');
    }
    sheet('Установите как приложение', body, function () {
      var b = document.querySelector('#atlSheet [data-atl="install"]');
      if (!b) return;
      if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.finally(function () { deferredPrompt = null; closeSheetEl(); });
      }
    });
    // кнопка «Установить» внутри beforeinstallprompt-ветки: обработчик выше;
    // «Позже» запоминается на 7 дней
    var w = document.getElementById('atlSheet');
    if (w && !w.querySelector('[data-atl="later"]')) {
      var later = document.createElement('button');
      later.className = 'atl-btn atl-sec'; later.setAttribute('data-atl', 'later'); later.textContent = 'Позже';
      w.querySelector('.atl-sheet-b').appendChild(later);
      later.addEventListener('click', function () {
        try { localStorage.setItem(LS_LATER, String(Date.now())); } catch (e) {}
        closeSheetEl();
      });
    }
    // data-atl="install" уже привязан через onSend? — нет: onSend срабатывает на send.
    // вешаем отдельно:
    var inst = w && w.querySelector('[data-atl="install"]');
    if (inst) inst.addEventListener('click', function () {
      if (deferredPrompt) { deferredPrompt.prompt(); deferredPrompt.userChoice.finally(function () { deferredPrompt = null; closeSheetEl(); }); }
    });
  }
  setTimeout(maybeInstallTip, 2500);

  // ---------- десктопные P-экраны в app-native: масштаб под ширину ----------
  function fitDesk() {
    if (!document.documentElement.classList.contains('app-native')) return;
    var stage = document.querySelector('.stage');
    var desk = document.querySelector('.frame.desk');
    if (stage && desk) {
      var s = Math.min(1, stage.clientWidth / 1440);
      desk.style.zoom = s < 1 ? String(s) : '';
    }
  }
  window.addEventListener('resize', fitDesk);
  setInterval(fitDesk, 1500);

  // ---------- старт (серверная часть — только atl-server=1) ----------
  if (ON) {
    snapshotFIX();
    snapshotST();
    restoreLocal();          // локальное — до первого рендера (скрипт выполняется до DOMContentLoaded)
    syncFromServer();        // серверное — асинхронно, при расхождении ревизий перерендер
    sendEvent('view', {});   // начальный просмотр экрана
  }

  // сервис-воркер: при atl-server=1 и в публичной сборке (pub), на статике 0 — нет
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register('sw.js').catch(function (e) { logErr(e); });
    });
  }
})();
