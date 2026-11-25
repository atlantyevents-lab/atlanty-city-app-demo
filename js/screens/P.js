/* Блок P — консоль организатора (рабочий стол 1440×900): P1 табло встреч, P2 аккредитация, P3 уведомления,
   P4 дашборд (залы, план-факт, воронка входа), P5 параметры (D-40, D-46, D-48, D-49, D-55), P6 синхронизация,
   P7 оценки спикеров, P8 план-факт путей, P9 модерация, P10 ИИ: режимы, лимиты, бюджет.
   Стили — css/console.css (префикс con-) и общие классы консоли из app.css. */
(function () {
  const D = window.Demo, F = window.FIX;
  const { esc, icon, tag } = D;

  const NAV = [
    ['P1', 'Табло встреч', 'grid'], ['P2', 'Аккредитация', 'scan'], ['P3', 'Уведомления', 'bell'],
    ['P4', 'Дашборд', 'layers'], ['P5', 'Параметры', 'cog'], ['P6', 'Программа', 'program'], ['P7', 'Оценки', 'star'],
    ['P8', 'План-факт путей', 'chart'], ['P9', 'Модерация', 'inbox'], ['P10', 'ИИ и бюджет', 'sparkle']
  ];
  /* экраны площадки в рамке телефона: сканеры допуска и зала */
  const NAV_FIELD = [['O1', 'Допуск гостей', 'qr'], ['O5', 'Сканер зала', 'scan']];

  /* ---------- общие помощники консоли ---------- */
  /* перерисовка с сохранением прокрутки рабочей области и правой колонки */
  function rerender() {
    const m = document.querySelector('.c-main'), r = document.querySelector('.c-right');
    const my = m ? m.scrollTop : 0, ry = r ? r.scrollTop : 0;
    D.rerender();
    const m2 = document.querySelector('.c-main'), r2 = document.querySelector('.c-right');
    if (m2) m2.scrollTop = my;
    if (r2) r2.scrollTop = ry;
  }
  const fmt = n => Number(n).toLocaleString('ru');
  const pctOf = (a, b) => b ? Math.round(a / b * 100) : 0;
  const t2m = t => { const p = String(t).split(':'); return (+p[0]) * 60 + (+p[1]); };
  const m2t = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  /* группы менее 5 человек не показываются (FR-ANL-05): малое число заменяется подписью */
  const thr = n => (n > 0 && n < 5) ? 'меньше 5' : fmt(n);
  /* переключатель-кнопка; label нужен для доступности */
  const sw = (act, arg, on, label, extra, cls) =>
    '<button class="con-sw' + (cls ? ' ' + cls : '') + '" role="switch" aria-checked="' + !!on + '" aria-pressed="' + !!on + '" aria-label="' + esc(label) + '" data-act="' + act + '"' +
    (arg != null ? ' data-arg="' + esc(arg) + '"' : '') + (extra || '') + '></button>';
  const nothing = t => '<span class="con-unset">' + esc(t || 'не задано') + '</span>';
  /* запись журнала аудита (FR-ADM-03): автор, действие, причина, значение до и после */
  const audit = (who, what, reason, before, after) => F.opsAudit(who, what, reason, before, after);
  /* диалог подтверждения на рабочем столе: заголовок, содержимое и кнопки */
  function dialog(title, bodyHtml, okLabel, okAct, okArg, opts) {
    opts = opts || {};
    D.openSheet('<div class="sheet-title">' + esc(title) + '</div>' + bodyHtml +
      '<div class="con-sheet-btns"><button class="btn btn-ghost" data-act="sheet-close">Отмена</button>' +
      '<button class="btn ' + (opts.danger ? 'btn-secondary con-danger' : 'btn-primary') + '" data-act="' + okAct + '"' +
      (okArg != null ? ' data-arg="' + esc(okArg) + '"' : '') + '>' + esc(okLabel) + '</button></div>');
  }
  const val = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const setErr = (id, msg) => {
    const el = document.getElementById(id + '-err'), inp = document.getElementById(id);
    if (el) el.textContent = msg || '';
    if (inp) inp.classList.toggle('err', !!msg);
  };

  D.register('P1', {
    tab: null,
    meta: {
      title: 'P1 · Табло встреч',
      role: 'Команда организатора',
      fr: ['FR-MEET-13'],
      ac: ['AC-MEET-10'],
      what: [
        'Консоль рабочего стола: боковое меню, метрики встреч за день, загрузка пространств.',
        'Карточки пространств: занятость окон за день полосой и легендой.',
        'Правая колонка: идущие встречи, неявки, очередь переносов и блокировок.'
      ],
      rules: [
        'Табло обновляется не реже раза в 10 секунд; ручной перенос пишется в журнал и уведомляет стороны.',
        'Неявки фиксируются по отметке прихода; повторная неявка влияет на приоритет в листах ожидания.',
        'Все числа — из фикстур консоли; данных реальных гостей нет.'
      ],
      depends: ['D-12', 'права ролей ADM']
    },
    html(ctx) {
      const C = F.CONSOLE, M = C.meetings;
      const total = F.windows.length;

      const nav = navHtml('P1');

      const tiles = [
        ['Заявок сегодня', M.requests], ['Подтверждено', M.confirmed], ['Состоялось', M.held], ['Неявок', M.noShow]
      ].map(([l, v]) => '<div class="stat-tile"><span class="num">' + v + '</span><span class="lbl">' + l + '</span></div>').join('');

      const spaceCards = F.MEETING_SPACES.map(sp => {
        const wins = F.spaceWindows(sp.id);
        const taken = wins.filter(w => w.status === 'taken').length;
        const free = total - taken;
        const pctT = Math.round(taken / total * 100), pctF = 100 - pctT;
        return '<div class="space-card"><div class="sc-head"><div><div class="sc-name">' + esc(sp.name) + ' ' + esc(sp.num) + '</div>' +
          '<div class="sc-place">' + esc(sp.place) + ' · до ' + sp.cap + ' чел.</div></div>' +
          '<div style="text-align:right"><div style="font-family:var(--font-display);font-size:22px">' + free + '/' + total + '</div><div class="cap">окон свободно</div></div></div>' +
          '<div class="sc-bar"><i style="width:' + pctT + '%;background:var(--accent-solid)"></i><i style="width:' + pctF + '%;background:var(--surface-2)"></i></div>' +
          '<div class="sc-legend"><span><i class="legend-dot" style="background:var(--accent-solid)"></i>занято <b>' + taken + '</b></span>' +
          '<span><i class="legend-dot" style="background:var(--surface-2);border:1px solid var(--line)"></i>свободно <b>' + free + '</b></span></div></div>';
      }).join('');

      const cur = C.current.map(c =>
        '<div class="feed-item"><span class="feed-kind"></span><div style="flex:1"><div class="feed-time">' + esc(c.time) + ' · ' + esc(c.space) + '</div>' +
        '<div class="feed-text">' + esc(c.who) + ' ' + tag(c.note) + '</div></div></div>').join('');

      const noShow = C.noShows.map(n =>
        '<div class="feed-item"><span class="feed-kind" style="background:var(--err)"></span><div style="flex:1"><div class="feed-text"><b>' + esc(n.name) + '</b></div>' +
        '<div class="feed-time">' + esc(n.space) + ' · ' + esc(n.time) + ' · не пришёл</div></div>' +
        '<button class="btn btn-ghost btn-sm" data-act="p1-noshow" data-arg="' + esc(n.name) + '">перенести</button></div>').join('');

      const queue = C.queue.map(q =>
        '<div class="feed-item"><span class="feed-kind" style="background:var(--accent-solid)"></span><div style="flex:1"><div class="feed-text">' + esc(q.text) + '</div>' +
        '<div class="feed-time">' + esc(q.time) + '</div></div></div>').join('');

      return '<div class="console">' +
        '<aside class="c-side"><div class="c-logo">АТЛАНТЫ.<br>СИТИ · ЗИМА</div>' + nav +
        '<div style="margin-top:auto;padding:10px;font-size:12px;color:var(--ink-dim)">консоль организатора<br>' + esc(C.today) + '</div></aside>' +
        '<main class="c-main"><h2>Табло встреч</h2>' +
        '<div class="c-sub">' + esc(F.NOW.dateLong) + ' · обновляется каждые 10 секунд · демо-данные</div>' +
        '<div class="stat-tiles four" style="margin-bottom:18px">' + tiles + '</div>' +
        '<div class="sec-title" style="margin-top:0">Пространства</div>' +
        '<div style="display:grid;grid-template-columns:1fr 1fr;gap:14px">' + spaceCards + '</div></main>' +
        '<aside class="c-right"><div class="sec-title" style="margin-top:0">Сейчас</div><div>' + cur + '</div>' +
        '<div class="sec-title">Неявки · ' + C.noShows.length + '</div><div>' + noShow + '</div>' +
        '<div class="sec-title">Очередь · ' + C.queue.length + '</div><div>' + queue + '</div>' +
        '<div class="banner" style="margin-top:14px">' + icon('info') + '<div class="cap">Ручной перенос и блокировка пишутся в журнал и уведомляют обе стороны.</div></div></aside>' +
        '</div>';
    }
  });
  D.action('p1-noshow', el => D.toast('Перенос оформлен: ' + el.dataset.arg + ' › лист ожидания'));

  /* ---------- общая разметка консоли ---------- */
  function navHtml(activeId) {
    return NAV.map(([id, label, ic]) =>
      '<button class="c-nav-item' + (id === activeId ? ' on' : '') + '" data-go="' + id + '">' + icon(ic) + '<span>' + esc(label) + '</span></button>').join('') +
      '<div class="con-nav-sec">Площадка</div>' +
      NAV_FIELD.map(([id, label, ic]) =>
        '<button class="c-nav-item" data-go="' + id + '">' + icon(ic) + '<span>' + esc(label) + '</span></button>').join('');
  }
  function consoleShell(activeId, title, sub, mainHtml, rightHtml) {
    return '<div class="console' + (rightHtml ? '' : ' con-wide') + '">' +
      '<aside class="c-side"><div class="c-logo">АТЛАНТЫ.<br>СИТИ · ЗИМА</div>' + navHtml(activeId) +
      '<div style="margin-top:auto;padding:10px;font-size:12px;color:var(--ink-dim)">консоль организатора<br>' + esc(F.CONSOLE.today) + '</div></aside>' +
      '<main class="c-main"><h2>' + esc(title) + '</h2><div class="c-sub">' + esc(sub) + ' · демо-данные</div>' + mainHtml + '</main>' +
      (rightHtml ? '<aside class="c-right">' + rightHtml + '</aside>' : '') +
      '</div>';
  }

  /* ---------- P2 Очередь аккредитации ---------- */
  D.register('P2', {
    tab: null,
    meta: {
      title: 'P2 · Аккредитация экспонентов',
      role: 'Команда организатора',
      fr: ['FR-ACC-03', 'FR-ACC-04'],
      ac: ['AC-ACC-02'],
      what: [
        'Таблица заявок экспонентов с результатом проверки по ИНН (ДаДата и Checko).',
        'Флаги проверки: регистрация менее 6 месяцев, расхождение названия.',
        'Правая панель с деталями и действия: принять, запросить исправления, отклонить.'
      ],
      rules: [
        'Проверка по ИНН идёт по двум источникам; расхождение — флаг, не отказ.',
        '«Запросить исправления» возвращает заявку экспоненту с комментарием.',
        'Все решения пишутся в журнал аккредитации.'
      ],
      depends: ['реестр экспонентов', 'интеграции ДаДата/Checko']
    },
    html(ctx) {
      const st = ctx.state;
      st.sel = st.sel || 'a1';
      st.dec = st.dec || {};
      const rows = F.ACC_QUEUE.map(a => {
        const stt = st.dec[a.id] || 'new';
        const lbl = { new: 'новая', ok: 'принята', fix: 'на исправлении', no: 'отклонена' }[stt];
        return '<tr class="queue-row' + (st.sel === a.id ? ' on' : '') + '" data-act="p2-sel" data-arg="' + a.id + '">' +
          '<td><div class="co">' + esc(a.company) + '</div><div class="chk">ИНН ' + esc(a.inn) + ' · ' + esc(a.pack) + '</div></td>' +
          '<td>' + esc(a.contact) + '</td>' +
          '<td>' + (a.flag ? '<span class="flag">' + icon('alert') + esc(a.flag) + '</span>' : '<span class="chk">—</span>') + '</td>' +
          '<td><span class="pill-count">' + lbl + '</span></td></tr>';
      }).join('');

      const a = F.ACC_QUEUE.find(x => x.id === st.sel) || F.ACC_QUEUE[0];
      const stt = st.dec[a.id] || 'new';
      const detail = '<div class="acc-panel"><div class="cap" style="margin-bottom:4px">Заявка · ' + esc(a.id.toUpperCase()) + '</div>' +
        '<div style="font-weight:700;font-size:16px">' + esc(a.company) + '</div>' +
        '<div class="cap" style="margin-top:2px">' + esc(a.contact) + ' · пакет ' + esc(a.pack) + ' · ИНН ' + esc(a.inn) + '</div>' +
        '<div class="cap" style="margin-top:10px;font-weight:600">Проверка ИНН</div>' +
        '<div class="chk" style="margin-top:4px">' + esc(a.check) + '</div>' +
        (a.flag ? '<div class="flag" style="margin-top:8px">' + icon('alert') + ' ' + esc(a.flag) + '</div>' : '') +
        '<div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">' +
        (stt === 'new' || stt === 'fix'
          ? '<button class="btn btn-primary btn-block" data-act="p2-ok" data-arg="' + a.id + '">Принять</button>' +
            '<button class="btn btn-secondary btn-block" data-act="p2-fix" data-arg="' + a.id + '">Запросить исправления</button>' +
            '<button class="btn btn-ghost btn-block" data-act="p2-no" data-arg="' + a.id + '">Отклонить</button>'
          : '<div class="banner ok">' + icon('check') + '<div class="cap">Решение по заявке уже принято: ' + { ok: 'принята', fix: 'на исправлении', no: 'отклонена' }[stt] + '.</div></div>') +
        '</div></div>';

      const main = '<div class="sec-title" style="margin-top:0">Очередь аккредитации · ' + F.ACC_QUEUE.length + '</div>' +
        '<div class="acc-tbl-wrap"><table class="c-table"><thead><tr><th>Компания</th><th>Контакт</th><th>Флаг</th><th>Статус</th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<div class="cap" style="margin-top:10px">Проверка по ИНН: ДаДата и Checko · решения в журнале</div>';

      return consoleShell('P2', 'Аккредитация', F.NOW.dateLong + ' · очередь заявок экспонентов', main, detail);
    }
  });
  ['ok', 'fix', 'no'].forEach(k => {
    D.action('p2-' + k, el => {
      const st = D.st('P2');
      st.dec = st.dec || {};
      st.dec[el.dataset.arg] = k === 'ok' ? 'ok' : k === 'fix' ? 'fix' : 'no';
      rerender();
      D.toast(k === 'ok' ? 'Заявка принята' : k === 'fix' ? 'Запрошены исправления' : 'Заявка отклонена');
    });
  });
  D.action('p2-sel', el => { D.st('P2').sel = el.dataset.arg; rerender(); });

  /* ---------- P3 Консоль уведомлений ---------- */
  D.register('P3', {
    tab: null,
    meta: {
      title: 'P3 · Уведомления',
      role: 'Команда организатора',
      fr: ['FR-NTF-06', 'FR-NTF-07', 'FR-NTF-08'],
      ac: ['AC-NTF-05'],
      what: [
        'Форма составления: заголовок, текст, аудитория, расписание отправки.',
        'Окно отмены 5 минут после отправки и лимит 2 рассылки в час.',
        'Предпросмотр уведомления на телефоне.'
      ],
      rules: [
        'Отправленное уведомление можно отменить в течение 5 минут.',
        'Не более 2 рассылок в час на площадку; срочные идут вне лимита.',
        'Аудитория — сегменты по тарифу и роли.'
      ],
      depends: ['матрица каналов TZ_01 §7', 'D-09']
    },
    html(ctx) {
      const st = ctx.state;
      const N = F.NTFC;
      st.title = st.title != null ? st.title : N.preview.title;
      st.text = st.text != null ? st.text : N.preview.text;
      st.aud = st.aud || 0;
      st.sched = st.sched || 0;
      st.sent = !!st.sent;

      const audChips = N.audience.map((a, i) =>
        '<button class="chip' + (st.aud === i ? ' on' : '') + '" data-act="p3-aud" data-arg="' + i + '">' + esc(a) + '</button>').join('');
      const schedChips = N.schedule.map((s, i) =>
        '<button class="chip' + (st.sched === i ? ' on' : '') + '" data-act="p3-sched" data-arg="' + i + '">' + esc(s) + '</button>').join('');

      const left = N.hourlyLimit - N.sentToday;
      const main = '<div class="sec-title" style="margin-top:0">Новое уведомление</div>' +
        '<div class="acc-tbl-wrap" style="padding:18px"><div style="display:grid;grid-template-columns:1.4fr 1fr;gap:18px">' +
        '<div>' +
        '<div class="field" style="margin-bottom:12px"><label for="p3-t">Заголовок</label><input class="input" id="p3-t" maxlength="80" value="' + esc(st.title) + '"></div>' +
        '<div class="field" style="margin-bottom:12px"><label for="p3-x">Текст</label><textarea class="textarea" id="p3-x" maxlength="280" style="min-height:80px">' + esc(st.text) + '</textarea></div>' +
        '<div class="cap" style="margin-bottom:6px">Аудитория</div><div class="chips" style="margin-bottom:12px">' + audChips + '</div>' +
        '<div class="cap" style="margin-bottom:6px">Когда</div><div class="chips">' + schedChips + '</div>' +
        '</div>' +
        '<div><div class="cap" style="margin-bottom:8px">Предпросмотр на телефоне</div>' +
        '<div class="ntf-phone"><div class="np-head">Атланты Сити</div>' +
        '<div class="np-item"><b>' + esc(st.title) + '</b><span>' + esc(st.text) + '</span></div>' +
        '<div class="np-item"><b>Сессия начнётся через час</b><span>«Практикум: юнит-экономика» — Дойбица, 12:30.</span></div>' +
        '<div class="np-app">'+ esc(F.NOW.dateLong) + ' · ' + esc(F.NOW.time) + '</div></div>' +
        '<div style="margin-top:12px" class="banner">' + icon('clock') + '<div class="cap">Окно отмены — ' + N.cancelWindow + ' ' + D.plural(N.cancelWindow, ['минута', 'минуты', 'минут']) + ' после отправки.</div></div>' +
        '<div style="margin-top:8px" class="' + (left > 0 ? 'ntf-ok' : 'ntf-lim') + '">' +
        (left > 0 ? 'Лимит: отправлено ' + N.sentToday + ' из ' + N.hourlyLimit + ' за час — осталось ' + left : 'Лимит исчерпан: ' + N.hourlyLimit + ' рассылки в час') + '</div>' +
        '</div></div>' +
        '<div style="margin-top:14px;display:flex;gap:10px">' +
        '<button class="btn btn-primary" data-act="p3-send"' + ((st.title && st.text && left > 0) ? '' : ' disabled') + '>Отправить</button>' +
        '<button class="btn btn-ghost" data-act="p3-reset">Сбросить</button></div>' +
        (st.sent ? '<div class="banner ok" style="margin-top:12px">' + icon('check') + '<div><div class="b-title">Отправлено</div><div class="cap">Уведомление ушло аудитории «' + esc(N.audience[st.aud]) + '». Отмена возможна ' + N.cancelWindow + ' ' + D.plural(N.cancelWindow, ['минута', 'минуты', 'минут']) + '.</div></div>' +
          '<button class="btn btn-ghost btn-sm" data-act="p3-cancel">Отменить рассылку</button></div>' : '') +
        '</div>';

      const right = '<div class="sec-title" style="margin-top:0">Правила</div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Не более ' + N.hourlyLimit + ' рассылок в час на площадку. Срочные уведомления идут вне лимита.</div></div>' +
        '<div class="banner">' + icon('clock') + '<div class="cap">После отправки есть ' + N.cancelWindow + ' минут на отмену — дальше уведомления уже у людей.</div></div>' +
        '<div class="banner">' + icon('bell') + '<div class="cap">Доставки по каналам из матрицы: Web Push, Telegram, SMS, e-mail — по типу и настройкам гостя.</div></div>';

      return consoleShell('P3', 'Уведомления', F.NOW.dateLong + ' · рассылки и push', main, right);
    },
    mount(host) {
      const t = host.querySelector('#p3-t'), x = host.querySelector('#p3-x');
      if (t) t.addEventListener('input', () => { D.st('P3').title = t.value; });
      if (x) x.addEventListener('input', () => { D.st('P3').text = x.value; });
    }
  });
  D.action('p3-aud', el => { D.st('P3').aud = parseInt(el.dataset.arg, 10); rerender(); });
  D.action('p3-sched', el => { D.st('P3').sched = parseInt(el.dataset.arg, 10); rerender(); });
  D.action('p3-send', () => {
    const st = D.st('P3');
    if (!st.title || !st.text) return;
    st.sent = true;
    F.NTFC.sentToday += 1;
    rerender();
    D.toast('Уведомление отправлено');
  });
  D.action('p3-cancel', () => {
    const st = D.st('P3');
    st.sent = false;
    F.NTFC.sentToday = Math.max(0, F.NTFC.sentToday - 1);
    rerender();
    D.toast('Рассылка отменена в окне ' + F.NTFC.cancelWindow + ' минут');
  });
  D.action('p3-reset', () => {
    const st = D.st('P3');
    st.title = F.NTFC.preview.title; st.text = F.NTFC.preview.text;
    rerender();
  });

  /* ---------- P4 Дашборд ---------- */
  /* Загрузка залов: вход и выход по отметкам сканеров залов O5 (FR-CHK-07, FR-ANL-08). Данные HALL_FLOW общие с O5,
     поэтому скан на экране O5 меняет числа здесь. Группы менее 5 человек не показываются (FR-ANL-05). */
  function hallLoadHtml() {
    let total = 0;
    /* пороги загрузки: от 80% — заполнен, от 50% — загружен, ниже — свободен (подпись под таблицей) */
    const loadTone = p => p >= 80 ? 'var(--err)' : p >= 50 ? 'var(--warn)' : 'var(--accent-solid)';
    const rows = F.HALL_IDS.map(id => {
      const h = F.hall(id), fl = F.HALL_FLOW[id], inside = fl.entered - fl.exited, hs = F.opsHallSession(id), s = hs.s;
      total += inside;
      const p = Math.min(100, pctOf(inside, h.cap));
      const closed = s && s.access && s.access !== 'all';
      const sess = s
        ? '<button class="con-lnk" data-go="C3/' + esc(s.id) + '">' + esc(s.title) + '</button><div class="chk">' +
          (hs.state === 'now' ? 'идёт, начало ' : 'дальше, начало ') + esc(s.time) + (closed ? ' · закрытая' : '') + '</div>'
        : nothing('сессий больше нет');
      return '<tr><td><button class="con-lnk" data-go="E3/' + id + '">' + esc(h.short) + '</button><div class="chk">до ' + h.cap + ' ' + D.plural(h.cap, ['места', 'мест', 'мест']) + '</div></td>' +
        '<td>' + sess + '</td><td class="num">' + fmt(fl.entered) + '</td><td class="num">' + fmt(fl.exited) + '</td>' +
        '<td><div class="con-load"><span class="con-bar"><i style="width:' + p + '%;background:' + loadTone(p) + '"></i></span><span class="con-load-v">' + fmt(inside) + ' <small>' + p + '%</small></span></div></td></tr>';
    }).join('');
    return '<div class="acc-panel" style="padding:8px 16px 12px">' +
      '<table class="c-table con-halltbl"><thead><tr><th>Зал</th><th>Сессия сейчас</th><th class="num">Вошло</th><th class="num">Вышло</th><th>В зале сейчас, доля вместимости</th></tr></thead><tbody>' + rows + '</tbody></table>' +
      '<div class="cap" style="margin-top:8px">В залах сейчас: <b>' + fmt(total) + '</b> · по отметкам сканеров залов, обновляется не позднее чем через 10 секунд · ' +
      'цвет полосы: до 50% — свободен, 50–79% — загружен, от 80% — заполнен · группы людей меньше 5 не показываются</div></div>';
  }
  function stackHtml(s, withLegend) {
    const p = k => Math.max(0, pctOf(s[k], s.planned));
    return '<div class="con-stack" role="img" aria-label="Выполнено ' + p('done') + '%, заменено ' + p('replaced') + '%, пропущено ' + p('skipped') + '%, впереди ' + p('ahead') + '%">' +
      '<i class="st-done" style="width:' + (s[('done')] / s.planned * 100) + '%"></i><i class="st-rep" style="width:' + (s.replaced / s.planned * 100) + '%"></i>' +
      '<i class="st-skip" style="width:' + (s.skipped / s.planned * 100) + '%"></i><i class="st-ahead" style="width:' + (s.ahead / s.planned * 100) + '%"></i></div>' +
      (withLegend
        ? '<div class="con-legend"><span><i class="legend-dot st-done"></i>выполнено <b>' + fmt(s.done) + '</b></span><span><i class="legend-dot st-rep"></i>заменено <b>' + fmt(s.replaced) + '</b></span>' +
          '<span><i class="legend-dot st-skip"></i>пропущено <b>' + fmt(s.skipped) + '</b></span><span><i class="legend-dot st-ahead"></i>впереди <b>' + fmt(s.ahead) + '</b></span></div>'
        : '');
  }
  function funnelHtml() {
    const OF = F.ONB_FUNNEL, base = OF.steps[0].v;
    const row = (s, i, prev) => '<div class="con-fn"><span class="fn-l">' + esc(s.label) +
      (prev ? '<small>потеряно на шаге: ' + fmt(prev.v - s.v) + '</small>' : '') + '</span>' +
      '<span class="con-bar"><i style="width:' + pctOf(s.v, base) + '%"></i></span><span class="fn-v">' + fmt(s.v) + '</span><span class="fn-p">' + pctOf(s.v, base) + '%</span></div>';
    return OF.steps.map((s, i) => row(s, i, i > 0 ? OF.steps[i - 1] : null)).join('') +
      '<div class="con-fn-sep">После входа</div>' + OF.side.map(s => row(s, 0, null)).join('');
  }

  D.register('P4', {
    tab: null,
    meta: {
      title: 'P4 · Дашборд',
      role: 'Команда организатора',
      fr: ['FR-ANL-04', 'FR-ANL-07', 'FR-ANL-08', 'FR-ANL-10', 'FR-CHK-04', 'FR-ADM-10'],
      ac: ['AC-ANL-01', 'AC-ANL-05', 'AC-ANL-06', 'AC-ANL-08', 'AC-CHK-06'],
      what: [
        'Активации билетов, активные пользователи по часам, заполняемость залов по записи, воронка встреч, оценки сессий (как в v2).',
        'Новое: загрузка залов по отметкам входа и выхода (сканер зала O5), план-факт путей и воронка входа (вход, шаги диагностики, «Усилить путь»).',
        'Ссылки в «План-факт путей» (P8), на карту зала (E3) и в карточку сессии (C3).'
      ],
      rules: [
        'Все числа из фикстур; загрузка залов считается как вошло минус вышло и меняется после скана на экране O5.',
        'Группы меньше 5 человек не показываются (FR-ANL-05); персональные перемещения в дашборд не попадают, только агрегаты.',
        'Воронка входа: «Путь принят» совпадает с числом участников в плане-факте путей; медианное время прохождения диагностики ориентир — 3 минуты (D-45).',
        'Загрузка залов обновляется не позднее чем через 10 секунд после отметки (AC-CHK-06).'
      ],
      depends: ['D-45', 'D-48', 'FR-ANL-05']
    },
    html(ctx) {
      const DSH = F.DASH, C = F.CONSOLE;
      const actPct = Math.round(DSH.activations.done / DSH.activations.total * 100);
      const nowH = +String(F.NOW.time).split(':')[0];
      const W = 560, H = 160, maxV = Math.max(...DSH.hourly.map(h => h.v));
      const bw = W / DSH.hourly.length;
      const hourly = '<svg class="chart" viewBox="0 0 ' + W + ' ' + H + '">' +
        '<line class="grid-l" x1="0" y1="' + (H - 20) + '" x2="' + W + '" y2="' + (H - 20) + '"/>' +
        DSH.hourly.map((h, i) => {
          const fut = +h.h > nowH; /* часы позже текущего — прогноз, не факт */
          const bh = h.v / maxV * (H - 40);
          return '<rect class="bar' + (fut ? ' fut' : '') + '" x="' + (i * bw + 4).toFixed(1) + '" y="' + (H - 20 - bh).toFixed(1) + '" width="' + (bw - 8).toFixed(1) + '" height="' + bh.toFixed(1) + '" rx="3">' +
            '<title>' + h.h + ':00 — ' + h.v + (fut ? ' (прогноз)' : '') + '</title></rect>' +
            '<text class="lbl" x="' + (i * bw + bw / 2).toFixed(1) + '" y="' + (H - 4) + '" text-anchor="middle">' + h.h + '</text>' +
            '<text class="val" x="' + (i * bw + bw / 2).toFixed(1) + '" y="' + (H - 24 - bh).toFixed(1) + '" text-anchor="middle">' + h.v + '</text>';
        }).join('') + '</svg>';
      const fill = DSH.fill.map(f =>
        '<div class="funnel-row"><div class="fr-label">' + esc(f.label) + '</div>' +
        '<div class="fr-bar"><i style="width:' + f.pct + '%"></i></div>' +
        '<div class="fr-val">' + f.pct + '%</div></div>').join('');
      const m = C.meetings, mMax = m.requests;
      const funnel = [['Заявки', m.requests], ['Подтверждено', m.confirmed], ['Состоялось', m.held], ['Неявки', m.noShow]].map(([l, v]) =>
        '<div class="funnel-row"><div class="fr-label">' + l + '</div>' +
        '<div class="fr-bar"><i style="width:' + Math.round(v / mMax * 100) + '%;background:' + (l === 'Неявки' ? 'var(--err)' : 'var(--accent-solid)') + '"></i></div>' +
        '<div class="fr-val">' + v + '</div></div>').join('');
      const ratings = DSH.ratings.map(r =>
        '<div class="funnel-row"><div class="fr-label">' + r.stars + ' из 5</div>' +
        '<div class="fr-bar"><i style="width:' + r.pct + '%"></i></div>' +
        '<div class="fr-val">' + r.pct + '%</div></div>').join('');

      const pf = F.pfSum('all'), OF = F.ONB_FUNNEL;
      const pfPanel = '<div class="acc-panel"><div class="con-ph"><div class="cap">План-факт путей · все дни</div><button class="con-lnk" data-go="P8">Подробно</button></div>' +
        '<div class="con-pf-big"><span class="num">' + fmt(pf.done) + '</span><span class="cap">выполнено из ' + fmt(pf.planned) + ' запланированных пунктов · ' + fmt(F.PF.people) + ' ' + D.plural(F.PF.people, ['участник', 'участника', 'участников']) + ' с путём</span></div>' +
        stackHtml(pf, true) + '</div>';
      const onbPanel = '<div class="acc-panel"><div class="cap" style="margin-bottom:8px">Воронка входа · от активации билета до принятого пути</div>' + funnelHtml() +
        '<div class="cap" style="margin-top:8px">Медианное время прохождения трёх шагов: <b>' + esc(OF.median) + '</b> (ориентир — 3 минуты)</div></div>';

      /* «Требует внимания»: очереди и отклонения со ссылками на экраны решений */
      const attn = [];
      const pendMod = (F.MOD_QUEUE || []).filter(x => x.status === 'pending').length;
      if (pendMod) attn.push({ n: pendMod, txt: 'записей ждут решения модератора', go: 'P9', lbl: 'Открыть модерацию' });
      const newAcc = (F.ACC_QUEUE || []).filter(a => !((D.st('P2').dec) || {})[a.id]).length;
      if (newAcc) attn.push({ n: newAcc, txt: 'новых заявок на аккредитацию', go: 'P2', lbl: 'Открыть аккредитацию' });
      if (C.meetings.noShow) attn.push({ n: C.meetings.noShow, txt: 'неявок на встречах за день', go: 'P1', lbl: 'Табло встреч' });
      const attnPanel = attn.length
        ? '<div class="acc-panel" style="border-color:var(--warn)"><div class="con-ph"><div class="cap" style="color:var(--warn);font-weight:700">Требует внимания</div></div>' +
          attn.map(a => '<button class="con-lnk" style="width:100%;justify-content:space-between" data-go="' + a.go + '">' +
            '<span><b>' + a.n + '</b> ' + esc(a.txt) + '</span><span>' + esc(a.lbl) + ' ' + icon('chevR') + '</span></button>').join('') + '</div>'
        : '';

      const main = '<div class="stat-tiles four" style="margin-bottom:16px">' +
        '<div class="stat-tile"><span class="num">' + DSH.activations.done.toLocaleString('ru') + '</span><span class="lbl">активаций · из ' + DSH.activations.total.toLocaleString('ru') + '</span></div>' +
        '<div class="stat-tile"><span class="num">' + actPct + '%</span><span class="lbl">билетов активировано</span></div>' +
        '<div class="stat-tile"><span class="num">' + C.meetings.held + '</span><span class="lbl">встреч состоялось · из ' + C.meetings.requests + ' заявок</span></div>' +
        '<div class="stat-tile"><span class="num">' + C.meetings.noShow + '</span><span class="lbl">неявок</span></div></div>' +
        attnPanel +
        '<div class="sec-title" style="margin-top:16px">Загрузка залов · вход и выход</div>' + hallLoadHtml() +
        '<div class="con-grid2" style="margin-top:16px">' + pfPanel + onbPanel + '</div>' +
        '<div class="sec-title">Активные пользователи по часам</div>' +
        '<div class="acc-tbl-wrap" style="padding:14px">' + hourly +
        '<div class="cap" style="margin-top:6px">Сейчас ' + esc(F.NOW.time) + ' — столбцы позже ' + nowH + ':00 прогнозные (приглушены), подписи над столбцами — значения.</div></div>' +
        '<div class="con-grid2" style="margin-top:16px">' +
        '<div class="acc-panel"><div class="cap" style="margin-bottom:8px">Заполняемость залов по записи</div>' + fill + '</div>' +
        '<div class="acc-panel"><div class="cap" style="margin-bottom:8px">Воронка встреч</div>' + funnel + '</div></div>' +
        '<div class="acc-panel" style="margin-top:14px"><div class="cap" style="margin-bottom:8px">Оценки сессий</div>' + ratings + '</div>';

      /* «Больше всего людей» — по числу человек (opsInside), а не по доле вместимости */
      const hallPeople = F.HALL_IDS.map(id => ({ id: id, n: F.opsInside(id), p: pctOf(F.opsInside(id), F.hall(id).cap) }));
      const topN = hallPeople.slice().sort((a, b) => b.n - a.n)[0];
      const topP = hallPeople.slice().sort((a, b) => b.p - a.p)[0];
      const right = '<div class="sec-title" style="margin-top:0">Итого за день</div>' +
        '<div class="banner">' + icon('star') + '<div class="cap">Пик активности — ' + (function (pk) { return pk.h + ':00 (' + pk.v + ' активных)'; })(DSH.hourly.reduce((a, b) => a.v > b.v ? a : b)) + '. Часы после ' + F.NOW.time.slice(0, 2) + ':00 на графике — прогноз.</div></div>' +
        '<div class="banner">' + icon('check') + '<div class="cap">Конверсия воронки встреч: ' + Math.round(m.held / m.requests * 100) + '% от заявок до состоявшихся.</div></div>' +
        '<div class="banner">' + icon('building') + '<div class="cap">Больше всего людей сейчас в зале «' + esc(F.hall(topN.id).short) + '»: ' + fmt(topN.n) + ' (' + topN.p + '% вместимости). По доле заполнен «' + esc(F.hall(topP.id).short) + '» — ' + topP.p + '%.</div></div>' +
        '<div class="banner">' + icon('route') + '<div class="cap">Путь принят у ' + pctOf(OF.steps[4].v, OF.steps[0].v) + '% активировавших билет. Диагностику не закончили ' + fmt(OF.steps[0].v - OF.steps[3].v) + ' ' + D.plural(OF.steps[0].v - OF.steps[3].v, ['человек', 'человека', 'человек']) + '.</div></div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Все числа демо. Загрузка залов меняется после скана на экране «Сканер зала».</div></div>' +
        '<button class="btn btn-secondary btn-block" style="margin-top:6px" data-go="O5">Открыть сканер зала</button>';
      return consoleShell('P4', 'Дашборд', F.NOW.dateLong + ' · метрики площадки', main, right);
    }
  });

  /* ---------- P5 Параметры ---------- */
  /* Параметры новых модулей (D-40, D-46, D-49, FR-ADM-08): значения, которые заказчик не назвал, показываются «не задано».
     Меняются в листе с подтверждением и пишутся в журнал аудита (FR-ADM-03). Волонтёры залов и параметры зоны B2B — здесь же. */
  const STATUS_TAG = {
    set: () => tag('задано', 'ok'),
    suggested: () => tag('предложено, согласовать', 'accent'),
    clarify: () => tag('уточнить', 'warn'),
    unset: () => tag('не задано')
  };
  const PHINT = {
    pct: 'Целое число от 0 до 100, в процентах',
    int: 'Целое число, 0 или больше',
    hours: 'Число часов, 1 или больше',
    text: 'Короткая формулировка до 120 знаков'
  };
  const byName = (a, b) => a.name.localeCompare(b.name, 'ru');
  function auditFeed(limit) {
    return F.AUDIT.slice(0, limit).map(e =>
      '<div class="feed-item"><span class="feed-kind"></span><div style="flex:1;min-width:0"><div class="feed-time">' + esc(e.t) + ' · ' + esc(e.who) + '</div>' +
      '<div class="feed-text">' + esc(e.what) + '</div>' +
      (e.reason ? '<div class="feed-time">причина: ' + esc(e.reason) + '</div>' : '') +
      (e.before || e.after ? '<div class="feed-time">было: ' + esc(e.before || 'не задано') + ' · стало: ' + esc(e.after || 'не задано') + '</div>' : '') + '</div></div>').join('');
  }
  function volCell(shId, hId) {
    const ids = (F.HALL_ASSIGN[shId] || {})[hId] || [];
    const me = ids.indexOf(F.O5_ME.vol) >= 0;
    return '<button class="con-cell' + (me ? ' is-me' : '') + '" data-act="p5-vol" data-arg="' + shId + '|' + hId + '" aria-label="Назначить волонтёров: ' + esc(F.hall(hId).short) + ', ' + esc(F.SHIFTS.filter(s => s.id === shId)[0].label) + '">' +
      ids.map(i => '<span>' + esc((F.opsVolunteer(i) || {}).name || '—') + '</span>').join('') + '</button>';
  }

  D.register('P5', {
    tab: null,
    meta: {
      title: 'P5 · Параметры',
      role: 'Команда организатора',
      fr: ['FR-ADM-04', 'FR-ADM-08', 'FR-ADM-10', 'FR-ADM-03', 'FR-CHK-07', 'FR-PATH-06', 'FR-PATH-07', 'FR-FEED-08', 'FR-AI-07'],
      ac: ['AC-ADM-06', 'AC-ADM-01', 'AC-ADM-08', 'AC-PATH-06', 'AC-CHK-07'],
      what: [
        'Параметры новых модулей: доля платных пунктов в пути (30%, значение предложено), число пересборок в сутки, квоты постов по пакетам «Экспо», «Экспо+», «Премиум», срок жизни записи в ленте, лимиты чатов, лимит ИИ, подбор. Значения, которые заказчик не назвал, показаны «не задано».',
        'Волонтёры залов по сменам: на зал и смену назначают двух (D-48); назначение меняет доступ в сканере зала O5.',
        'Нетворкинг-зона B2B: вместимость, место, брендирование, номера столов (D-55); пока место и столы не заполнены, зона участникам не показывается.',
        'Флаги функций и параметры из ТЗ (раздел 4) как в v2. Журнал изменений справа.'
      ],
      rules: [
        'Каждый параметр меняется без релиза и применяется не позднее чем через 60 секунд; изменение пишется в журнал со значениями до и после (AC-ADM-06).',
        'Изменение, флаг и назначение подтверждаются нажатием кнопки в листе.',
        'Статусы значений: задано решением заказчика, предложено (согласовать), уточнить, не задано. Выдуманных значений нет.',
        'Квота постов «Экспо» равна 0 по трактовке заказчика D-40 (уточнить, O-19); правило квот не редактируется здесь, оно задано пакетами.'
      ],
      depends: ['D-40', 'D-46', 'D-48', 'D-49', 'D-55', 'O-19', 'O-23', 'O-27', 'O-33']
    },
    html(ctx) {
      const st = ctx.state;
      st.grp = st.grp || 'all';
      const prm = F.PARAMS_V3.filter(p => st.grp === 'all' || p.group === st.grp);
      const grpChips = F.PARAM_GROUPS.map(g =>
        '<button class="chip' + (st.grp === g[0] ? ' on' : '') + '" data-act="p5-grp" data-arg="' + g[0] + '">' + esc(g[1]) + '</button>').join('');
      /* лимиты ИИ по режимам живут на экране P10: здесь строка-сводка по ним (FR-AI-07) */
      const aiSet = F.AI_MODES.filter(m => m.limit != null).length;
      const aiLimRow = '<tr><td><div class="t-name">Лимит ИИ по режимам</div><div class="chk">FR-AI-07 · меняет: админ · девять режимов, значения задаются на экране «ИИ и бюджет»</div></td>' +
        '<td class="con-v">' + (aiSet ? 'задан у ' + aiSet + ' из ' + F.AI_MODES.length : nothing()) + '</td><td>' + (aiSet ? STATUS_TAG.set() : STATUS_TAG.unset()) + '</td>' +
        '<td class="r"><button class="btn btn-ghost btn-sm" data-go="P10">Открыть</button></td></tr>';
      const rows = prm.map(p =>
        '<tr><td><div class="t-name">' + esc(p.name) + '</div><div class="chk">' + esc(p.ref) + ' · меняет: ' + esc(p.who) + (p.note ? ' · ' + esc(p.note) : '') + '</div></td>' +
        '<td class="con-v">' + (p.value == null ? nothing() : esc(p.value)) + '</td><td>' + STATUS_TAG[p.status]() + '</td>' +
        '<td class="r">' + (p.kind === 'fixed' ? '<span class="cap">правило</span>' : '<button class="btn btn-ghost btn-sm" data-act="p5-edit" data-arg="' + p.id + '">Изменить</button>') + '</td></tr>' +
        (p.id === 'n03' ? aiLimRow : '')).join('');
      const unset = F.PARAMS_V3.filter(p => p.status === 'unset').length;

      const jump = [['p5-new', 'Новые модули'], ['p5-vol', 'Волонтёры залов'], ['p5-b2b', 'Зона B2B'], ['p5-flags', 'Флаги'], ['p5-old', 'Параметры из ТЗ']]
        .map(j => '<button class="chip" data-act="p5-jump" data-arg="' + j[0] + '">' + j[1] + '</button>').join('');

      const hallRows = F.HALL_IDS.map(h =>
        '<tr><td class="t-name">' + esc(F.hall(h).short) + '</td>' + F.SHIFTS.map(s => '<td>' + volCell(s.id, h) + '</td>').join('') + '</tr>').join('');
      const vol = '<div class="acc-panel" style="padding:8px 14px"><table class="c-table con-voltbl"><thead><tr><th>Зал</th>' +
        F.SHIFTS.map(s => '<th>' + esc(s.label) + ' · ' + esc(s.from) + '–' + esc(s.to) + '</th>').join('') + '</tr></thead><tbody>' + hallRows + '</tbody></table>' +
        '<div class="cap" style="margin-top:6px">На зал и смену назначают двух волонтёров-админов (D-48). Нажмите на ячейку, чтобы изменить. Выделена ячейка волонтёра, чьё устройство открыто в сканере зала.</div></div>';

      const zoneReady = !!(F.B2B_ZONE.filter(z => z.id === 'place')[0].value && F.B2B_ZONE.filter(z => z.id === 'tables')[0].value);
      const zone = '<div class="acc-panel">' + F.B2B_ZONE.map(z =>
        '<div class="toggle-row"><div><div class="tr-title" style="font-weight:500;font-size:14px">' + esc(z.label) + '</div></div><div class="con-v">' +
        (z.value == null ? nothing() : esc(z.value)) + '</div></div>').join('') +
        '<div style="display:flex;gap:12px;align-items:center;margin-top:10px"><button class="btn btn-secondary btn-sm" data-act="p5-zone">Заполнить параметры зоны</button>' +
        '<span class="cap">' + (zoneReady ? 'Место и столы заполнены: зона показывается участникам.' : 'Пока место и столы не заполнены, зона участникам не показывается.') + '</span></div></div>';

      const flags = '<div class="acc-panel">' + F.PARAM_FLAGS.map(f =>
        '<div class="toggle-row"><div class="tr-title" style="font-weight:500;font-size:14px">' + esc(f.name) + '</div>' + sw('p5-flag', f.id, f.on, f.name) + '</div>').join('') +
        '<div class="cap" style="margin-top:8px">Режимы ИИ включаются на экране «ИИ и бюджет» (P10).</div></div>';

      const old = F.PARAMS.map(p =>
        '<tr><td class="t-name">' + esc(p.param) + '</td><td>' + esc(p.value) + '</td><td class="cap">' + esc(p.who) + '</td></tr>').join('');

      const main = '<div class="chips" style="margin-bottom:6px">' + jump + '</div>' +
        '<div class="sec-title" id="p5-new" style="margin-top:6px">Параметры новых модулей</div>' +
        '<div class="cap" style="margin-bottom:8px">Решения D-40, D-46, D-48, D-49 и параметры из ТЗ (FR-ADM-08). Не задано заказчиком: ' + (unset + (aiSet ? 0 : 1)) + ' из ' + (F.PARAMS_V3.length + 1) + '.</div>' +
        '<div class="chips" style="margin-bottom:6px">' + grpChips + '</div>' +
        '<div class="acc-panel" style="padding:4px 14px"><table class="c-table con-ptbl"><thead><tr><th>Параметр</th><th>Значение</th><th>Статус</th><th></th></tr></thead><tbody>' + rows + '</tbody></table></div>' +
        '<div class="sec-title" id="p5-vol">Волонтёры залов по сменам</div>' + vol +
        '<div class="sec-title" id="p5-b2b">Нетворкинг-зона B2B</div>' + zone +
        '<div class="sec-title" id="p5-flags">Флаги функций</div>' + flags +
        '<div class="sec-title" id="p5-old">Параметры и лимиты из ТЗ, раздел 4</div>' +
        '<div class="acc-panel" style="padding:8px 14px;overflow-x:auto"><table class="c-table"><thead><tr><th>Параметр</th><th>Значение</th><th>Меняет</th></tr></thead><tbody>' + old + '</tbody></table></div>';

      const right = '<div class="sec-title" style="margin-top:0">Журнал изменений</div>' + auditFeed(7) +
        '<div class="banner" style="margin-top:14px">' + icon('info') + '<div class="cap">Значения по умолчанию из ТЗ. Квота Оптимума = 0: запись на менторские и гостиные закрыта, они доступны тарифам Бизнес и Первый класс.</div></div>' +
        '<div class="banner" style="margin-top:8px">' + icon('clock') + '<div class="cap">Изменение применяется не позднее чем через 60 секунд, подтверждённые встречи не пересчитываются.</div></div>';
      return consoleShell('P5', 'Параметры', 'квоты, лимиты, волонтёры, флаги функций', main, right);
    }
  });
  D.action('p5-grp', el => { D.st('P5').grp = el.dataset.arg; rerender(); });
  D.action('p5-jump', el => {
    const t = document.getElementById(el.dataset.arg);
    if (t && t.scrollIntoView) t.scrollIntoView({ block: 'start', behavior: 'smooth' });
  });

  /* изменение параметра нового модуля */
  D.action('p5-edit', el => {
    const p = F.PARAMS_V3.filter(x => x.id === el.dataset.arg)[0];
    if (!p) return;
    const cur = p.value == null ? '' : (p.kind === 'text' ? String(p.value) : String(p.value).replace(/[^\d]/g, ''));
    dialog('Изменить параметр',
      '<div class="con-sheet-lead"><b>' + esc(p.name) + '</b><div class="cap" style="margin-top:2px">' + esc(p.ref) + ' · меняет: ' + esc(p.who) + '</div></div>' +
      '<div class="con-field"><label for="p5-v">Новое значение</label>' +
      '<input class="input" id="p5-v" value="' + esc(cur) + '" ' + (p.kind === 'text' ? 'maxlength="120"' : 'inputmode="numeric" maxlength="4"') + ' autocomplete="off">' +
      '<div class="con-hint">' + esc(PHINT[p.kind] || '') + '</div><div class="con-err" id="p5-v-err"></div></div>' +
      '<div class="con-sheet-note">Сейчас: ' + (p.value == null ? 'не задано' : esc(p.value)) + '. Изменение применится не позднее чем через 60 секунд и запишется в журнал со значениями до и после.</div>',
      'Сохранить', 'p5-save', p.id);
  });
  D.action('p5-save', el => {
    const p = F.PARAMS_V3.filter(x => x.id === el.dataset.arg)[0];
    if (!p) return;
    const v = val('p5-v');
    let out;
    if (p.kind === 'text') {
      if (!v) { setErr('p5-v', 'Введите значение'); return; }
      out = v;
    } else {
      if (!/^\d+$/.test(v)) { setErr('p5-v', 'Введите целое число'); return; }
      const n = parseInt(v, 10);
      if (p.kind === 'pct' && n > 100) { setErr('p5-v', 'Доля не может быть больше 100%'); return; }
      if (p.kind === 'hours' && n < 1) { setErr('p5-v', 'Срок не меньше 1 часа'); return; }
      if (p.id === 'n10' && (n < 1 || n > 4)) { setErr('p5-v', 'Волонтёров на смену — от 1 до 4'); return; }
      if (p.id === 'n03' && n < 1) { setErr('p5-v', 'Лимит не меньше 1 запроса'); return; }
      out = p.kind === 'pct' ? n + '%' : p.kind === 'hours' ? n + ' ч' : String(n);
    }
    const before = p.value == null ? 'не задано' : p.value;
    p.value = out; p.status = 'set'; p.note = 'изменено в консоли';
    if (p.id === 'n03') F.AI_TOTAL.perPerson = parseInt(out, 10);
    audit('Администратор', 'Параметр «' + p.name + '»', '', before, out);
    D.closeSheet();
    rerender();
    D.toast('Параметр сохранён: ' + out);
  });

  /* волонтёры зала на смену */
  const volN = () => { const p = F.PARAMS_V3.filter(x => x.id === 'n10')[0]; const n = p ? parseInt(p.value, 10) : 2; return n >= 1 && n <= 4 ? n : 2; };
  const VOL_ORD = ['Первый', 'Второй', 'Третий', 'Четвёртый'], VOL_ID = ['p5-va', 'p5-vb', 'p5-vc', 'p5-vd'];
  D.action('p5-vol', el => {
    const parts = el.dataset.arg.split('|'), shId = parts[0], hId = parts[1];
    const sh = F.SHIFTS.filter(s => s.id === shId)[0], ids = F.HALL_ASSIGN[shId][hId];
    const opts = sel => F.VOLUNTEERS.slice().sort(byName).map(v => '<option value="' + v.id + '"' + (v.id === sel ? ' selected' : '') + '>' + esc(v.name) + '</option>').join('');
    dialog('Волонтёры зала',
      '<div class="con-sheet-lead"><b>' + esc(F.hall(hId).short) + '</b> · ' + esc(sh.label) + ', ' + esc(sh.from) + '–' + esc(sh.to) + '</div>' +
      Array.from({ length: volN() }, (_, i) => '<div class="con-field"><label for="' + VOL_ID[i] + '">' + VOL_ORD[i] + ' волонтёр</label><select class="input" id="' + VOL_ID[i] + '">' + opts(ids[i]) + '</select>' + (i === volN() - 1 ? '<div class="con-err" id="' + VOL_ID[i] + '-err"></div>' : '') + '</div>').join('') +
      '<div class="con-sheet-note">Волонтёров на смену: ' + volN() + ' (параметр «Волонтёров-сканеров на смену в зале»). Один волонтёр работает в одном зале смены. Назначение меняет доступ к сканеру зала; запись попадёт в журнал.</div>',
      'Назначить', 'p5-vol-save', el.dataset.arg);
  });
  D.action('p5-vol-save', el => {
    const parts = el.dataset.arg.split('|'), shId = parts[0], hId = parts[1];
    const n = volN(), sel = Array.from({ length: n }, (_, i) => val(VOL_ID[i])), errId = VOL_ID[n - 1];
    if (sel.some((v, i) => sel.indexOf(v) !== i)) { setErr(errId, n === 2 ? 'Выберите двух разных волонтёров' : 'Выберите разных волонтёров'); return; }
    const clash = F.HALL_IDS.filter(h => h !== hId && (F.HALL_ASSIGN[shId][h] || []).some(v => sel.indexOf(v) >= 0))[0];
    if (clash) {
      const who = (F.HALL_ASSIGN[shId][clash] || []).filter(v => sel.indexOf(v) >= 0)[0];
      setErr(errId, (F.opsVolunteer(who) || {}).name + ' уже назначен(а) в зал «' + F.hall(clash).short + '» этой смены');
      return;
    }
    const nm = ids => ids.map(i => (F.opsVolunteer(i) || {}).name).join(', ');
    const before = nm(F.HALL_ASSIGN[shId][hId]);
    F.HALL_ASSIGN[shId][hId] = sel;
    audit('Администратор', 'Назначение волонтёров: ' + F.hall(hId).short + ', ' + F.SHIFTS.filter(s => s.id === shId)[0].label, '', before, nm(sel));
    D.closeSheet();
    rerender();
    D.toast('Волонтёры назначены: ' + F.hall(hId).short);
  });

  /* параметры нетворкинг-зоны B2B (D-55) */
  D.action('p5-zone', () => {
    const z = F.B2B_ZONE;
    const f = (id, label, hint, num) => {
      const cur = z.filter(x => x.id === id)[0].value;
      return '<div class="con-field"><label for="p5-z-' + id + '">' + label + '</label><input class="input" id="p5-z-' + id + '" value="' + esc(cur == null ? '' : cur) + '" maxlength="80"' +
        (num ? ' inputmode="numeric"' : '') + '><div class="con-hint">' + hint + '</div><div class="con-err" id="p5-z-' + id + '-err"></div></div>';
    };
    dialog('Нетворкинг-зона B2B',
      f('cap', 'Вместимость, человек', 'Целое число; оставьте пустым, если не определена', true) +
      f('place', 'Место на планировке Экспо', 'Название или номер площадки') +
      f('brand', 'Брендирование', 'Кто оформляет зону') +
      f('tables', 'Номера столов', 'Например: 1–12') +
      '<div class="con-sheet-note">Значения заказчик не называл (D-55): уточняются по планировке Экспо. Пустые поля остаются «не задано».</div>',
      'Сохранить', 'p5-zone-save');
  });
  D.action('p5-zone-save', () => {
    const capV = val('p5-z-cap');
    if (capV && !/^\d+$/.test(capV)) { setErr('p5-z-cap', 'Введите целое число'); return; }
    let changed = 0;
    F.B2B_ZONE.forEach(zz => {
      const v = val('p5-z-' + zz.id) || null;
      if (v !== zz.value) {
        audit('Администратор', 'Нетворкинг-зона B2B: ' + zz.label.toLowerCase(), '', zz.value == null ? 'не задано' : zz.value, v == null ? 'не задано' : v);
        zz.value = v; changed++;
      }
    });
    D.closeSheet();
    rerender();
    D.toast(changed ? 'Параметры зоны сохранены' : 'Изменений нет');
  });

  /* флаги функций с подтверждением */
  D.action('p5-flag', el => {
    const f = F.PARAM_FLAGS.filter(x => x.id === el.dataset.arg)[0];
    if (!f) return;
    dialog(f.on ? 'Выключить функцию?' : 'Включить функцию?',
      '<div class="con-sheet-lead"><b>' + esc(f.name) + '</b></div><div class="cap" style="font-size:13.5px;line-height:1.5;color:var(--ink)">' +
      (f.on ? 'Функция перестанет показываться участникам; выключенный флаг не показывает интерфейс.' : 'Функция появится у участников не позднее чем через 60 секунд.') + '</div>' +
      '<div class="con-sheet-note">Изменение запишется в журнал со значениями до и после.</div>',
      f.on ? 'Выключить' : 'Включить', 'p5-flag-ok', f.id);
  });
  D.action('p5-flag-ok', el => {
    const f = F.PARAM_FLAGS.filter(x => x.id === el.dataset.arg)[0];
    if (!f) return;
    f.on = !f.on;
    audit('Администратор', 'Флаг функции «' + f.name + '»', '', f.on ? 'выключено' : 'включено', f.on ? 'включено' : 'выключено');
    D.closeSheet();
    rerender();
    D.toast(f.name + ': ' + (f.on ? 'включено' : 'выключено'));
  });

  /* ---------- P6 Синхронизация программы ---------- */
  D.register('P6', {
    tab: null,
    meta: {
      title: 'P6 · Синхронизация программы',
      role: 'Команда организатора',
      fr: ['FR-INT-05'],
      ac: ['AC-INT-05'],
      what: [
        'Журнал изменений фида программы: версия, время, что изменилось, источник.',
        'Последняя версия фида и статус синхронизации.',
        'Фильтр по источнику: фид программы или ручной редактор.'
      ],
      rules: [
        'Каждое изменение фида — новая версия с меткой времени.',
        'Изменения помечаются в приложении пользователей меткой «изменено».',
        'Ручные правки редактора и фида не конфликтуют: приоритет у фида по расписанию.'
      ],
      depends: ['фид программы', 'редактор']
    },
    html(ctx) {
      const last = F.SYNC_JOURNAL[0];
      const rows = F.SYNC_JOURNAL.map(j =>
        '<tr><td class="cap">' + esc(j.ver) + '</td><td class="cap">' + esc(j.time) + '</td>' +
        '<td class="t-name">' + esc(j.what) + '</td><td class="cap">' + esc(j.by) + '</td></tr>').join('');
      const main = '<div class="sec-title" style="margin-top:0">Статус</div>' +
        '<div class="stat-tiles four" style="margin-bottom:16px">' +
        '<div class="stat-tile"><span class="num">' + esc(last.ver) + '</span><span class="lbl">последняя версия</span></div>' +
        '<div class="stat-tile"><span class="num">' + esc(last.time) + '</span><span class="lbl">обновлено</span></div>' +
        '<div class="stat-tile"><span class="num">' + F.SYNC_JOURNAL.length + '</span><span class="lbl">изменений за 2 дня</span></div>' +
        '<div class="stat-tile"><span class="num" style="color:var(--ok)">ок</span><span class="lbl">синхронизация</span></div></div>' +
        '<div class="sec-title">Журнал изменений</div>' +
        '<div class="acc-panel" style="padding:8px 14px;overflow-x:auto"><table class="c-table"><thead><tr><th>Версия</th><th>Время</th><th>Изменение</th><th>Источник</th></tr></thead><tbody>' + rows + '</tbody></table></div>';
      const right = '<div class="sec-title" style="margin-top:0">Как это работает</div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Фид публикуется по расписанию; каждое изменение получает версию. Пользователи видят метку «изменено» у затронутых сессий.</div></div>' +
        '<div class="banner">' + icon('refresh') + '<div class="cap">Записанным на изменённую сессию уходит уведомление по каналам из их настроек.</div></div>';
      return consoleShell('P6', 'Синхронизация программы', 'журнал фида · последняя версия ' + last.ver, main, right);
    }
  });

  /* ---------- P7 Оценки спикеров ---------- */
  D.register('P7', {
    tab: null,
    meta: {
      title: 'P7 · Оценки спикеров',
      role: 'Команда организатора',
      fr: ['FR-NOTE-05'],
      ac: ['AC-NOTE-05'],
      what: [
        'Агрегированные оценки спикеров: средняя, число оценок, распределение.',
        'Показ только при не менее 5 оценках — анонимность малого числа.',
        'Распределение оценок столбцами 1–5.'
      ],
      rules: [
        'Спикер виден в рейтинге при 5+ оценках; меньше — скрыт до порога.',
        'Оценки анонимны: видны только агрегаты, не голоса.',
        'Распределение считается по шкале 1–5 после сессии.'
      ],
      depends: ['оценки сессий', 'анонимность']
    },
    html(ctx) {
      /* порядок: по убыванию средней; ниже порога в 5 оценок — только в «Мало оценок» (FR-ANL-05) */
      const shown = F.SPEAKER_RATINGS.filter(r => r.show).slice().sort((a, b) => b.avg - a.avg);
      const rows = shown.map(r => {
        const max = Math.max.apply(null, r.dist);
        const bars = r.dist.map((v, i) =>
          '<div class="vbar-col" style="height:56px"><div class="vbar" style="height:' + Math.round(v / max * 100) + '%"></div>' +
          '<div class="vbar-lbl">' + (5 - i) + '</div></div>').join('');
        return '<div class="acc-panel"><div style="display:flex;justify-content:space-between;align-items:baseline;gap:10px;flex-wrap:wrap">' +
          '<div><b>' + esc(r.speaker) + '</b> <span class="cap">· ' + r.count + ' оценок</span></div>' +
          '<div style="font-family:var(--font-display);font-size:24px;color:var(--accent-display)">' + r.avg.toFixed(1) + ' <span class="cap" style="font-family:var(--font-accent);font-size:11px">из 5</span></div></div>' +
          '<div class="vbars" style="height:56px;margin-top:10px">' + bars + '</div></div>';
      }).join('');
      const hidden = F.SPEAKER_RATINGS.filter(r => !r.show).map(r =>
        '<div class="feed-item"><span class="feed-kind"></span><div class="feed-text"><b>' + esc(r.speaker) + '</b> — ' + r.count + ' ' + D.plural(r.count, ['оценка', 'оценки', 'оценок']) + ', покажется при 5+</div></div>').join('');
      const main = '<div class="sec-title" style="margin-top:0">Спикеры · по убыванию средней · ' + shown.length + ' ' + D.plural(shown.length, ['спикер', 'спикера', 'спикеров']) + '</div>' + rows;
      const right = '<div class="sec-title" style="margin-top:0">Мало оценок</div>' + hidden +
        '<div class="banner" style="margin-top:14px">' + icon('info') + '<div class="cap">Порог показа — 5 оценок: защита от деанонимизации при малом числе голосов. Спикеры ниже порога видны только здесь, без средней и распределения.</div></div>';
      return consoleShell('P7', 'Оценки спикеров', 'агрегаты и распределение · демо-оценки · порог 5 оценок', main, right);
    }
  });

  /* ---------- P8 План-факт путей ---------- */
  /* Запланировано — пункты, принятые в путь; выполнено — по отметке прихода (сканер зала, встреча, стенд) или вручную;
     срезы по дням, залам и типам; группы меньше 5 человек не показываются (FR-ANL-05, FR-ANL-07, FR-PATH-16). */
  function pfRowHtml(r, by, selDay) {
    const lbl = (by === 'hall' && r.key !== 'none')
      ? '<button class="con-lnk" data-go="E3/' + esc(r.key) + '">' + esc(r.label) + '</button>'
      : '<span class="t-name">' + esc(r.label) + '</span>';
    if (r.hidden) {
      return '<tr class="con-hidden"><td>' + lbl + '</td><td class="num">меньше 5</td><td colspan="6"><span class="con-unset">меньше 5 человек не показываются</span></td></tr>';
    }
    const s = r.sum, passed = s.done + s.replaced + s.skipped;
    const p = passed ? pctOf(s.done, passed) : null;
    return '<tr' + (by === 'day' && selDay === r.key.slice(0, 5) ? ' class="on"' : '') + '><td>' + lbl + '</td><td class="num">' + fmt(r.people) + '</td>' +
      '<td class="num">' + fmt(s.planned) + '</td><td class="num">' + fmt(s.done) + '</td><td class="num">' + fmt(s.replaced) + '</td>' +
      '<td class="num">' + fmt(s.skipped) + '</td><td class="num">' + fmt(s.ahead) + '</td>' +
      '<td>' + (p == null ? '<span class="con-unset">окна впереди</span>' : '<div class="con-load"><span class="con-bar"><i style="width:' + p + '%"></i></span><span class="con-load-v" style="width:44px">' + p + '%</span></div>') + '</td></tr>';
  }
  D.register('P8', {
    tab: null,
    meta: {
      title: 'P8 · План-факт путей',
      role: 'Команда организатора',
      fr: ['FR-ANL-07', 'FR-ANL-05', 'FR-PATH-16', 'FR-ADM-10', 'FR-CHK-09'],
      ac: ['AC-ANL-05', 'AC-ADM-08'],
      what: [
        'Сводные показатели: запланировано, выполнено, заменено, пропущено; отдельно пункты, до которых ещё не дошло время.',
        'Срезы по дням, залам и типам пунктов с выбором дня; доля выполненных среди наступивших.',
        'Порог «меньше 5 человек не показываются»: такой срез показан строкой без чисел. Проверочный путь одного участника для сверки пересчёта.'
      ],
      rules: [
        'Запланировано — пункты, принятые в путь; предложенные и не принятые не считаются.',
        '«Выполнен» ставится по отметке прихода (сканер зала O5, отметка на встрече, посещение стенда) либо вручную; «пропущен» — по окончании окна без отметки (предложение, согласовать).',
        'Срезы с числом участников меньше 5 не показываются (FR-ANL-05); индивидуальные пути экспонентам и спикерам не передаются.',
        'Итоги по дням, залам и типам суммируются из одних и тех же ячеек и совпадают между собой.'
      ],
      depends: ['D-48', 'D-46', 'FR-ANL-05']
    },
    html(ctx) {
      const st = ctx.state;
      st.day = st.day || 'all'; st.by = st.by || 'day';
      const day = st.day, by = st.by;
      const sum = F.pfSum(day), people = F.PF.peopleCap(day);
      const dayChips = [['all', 'Все дни']].concat(F.DAYS.map(d => [d.id, d.label + ' · ' + d.week])).map(d =>
        '<button class="chip' + (day === d[0] ? ' on' : '') + '" data-act="p8-day" data-arg="' + d[0] + '">' + esc(d[1]) + '</button>').join('');
      const tile = (n, lbl, k) => '<div class="stat-tile"><span class="num">' + fmt(n) + '</span><span class="lbl">' + lbl + '</span>' +
        (k ? '<span class="sub">' + pctOf(n, sum.planned) + '% от запланированных</span>' : '<span class="sub">пункты, принятые в путь</span>') + '</div>';
      const tiles = '<div class="con-tiles5">' + tile(sum.planned, 'запланировано', 0) + tile(sum.done, 'выполнено', 1) + tile(sum.replaced, 'заменено', 1) +
        tile(sum.skipped, 'пропущено', 1) + tile(sum.ahead, 'впереди', 1) + '</div>';
      const by3 = [['day', 'По дням'], ['hall', 'По залам'], ['type', 'По типам пунктов']].map(b =>
        '<button class="seg' + (by === b[0] ? ' on' : '') + '" data-act="p8-by" data-arg="' + b[0] + '">' + b[1] + '</button>').join('');
      const rows = F.pfRows(by, day);
      const hiddenN = rows.filter(r => r.hidden).length;
      const smp = F.pfSample('all');
      const main = '<div class="chips" style="margin-bottom:10px" role="group" aria-label="День">' + dayChips + '</div>' +
        tiles +
        '<div class="acc-panel" style="margin-top:14px">' + stackHtml(sum, true) +
        '<div class="cap" style="margin-top:8px">Участников с путём: <b>' + fmt(people) + '</b> · ' + (day === 'all' ? 'за все четыре дня' : 'за ' + esc(day)) + '</div></div>' +
        '<div class="sec-title">Срезы</div>' +
        '<div class="segbar con-seg" role="group" aria-label="Срез">' + by3 + '</div>' +
        '<div class="acc-panel" style="margin-top:12px;padding:4px 14px 10px"><table class="c-table con-pftbl"><thead><tr><th>' + (by === 'day' ? 'День' : by === 'hall' ? 'Зал' : 'Тип пункта') + '</th>' +
        '<th class="num">Участников</th><th class="num">Запланировано</th><th class="num">Выполнено</th><th class="num">Заменено</th><th class="num">Пропущено</th><th class="num">Впереди</th><th>Выполнено от наступивших</th></tr></thead>' +
        '<tbody>' + rows.map(r => pfRowHtml(r, by, day)).join('') + '</tbody></table>' +
        '<div class="con-pf-foot"><span class="cap">Скрыто срезов: <b>' + hiddenN + '</b>. Группы меньше 5 человек не показываются.</span>' +
        (hiddenN ? '' : '<button class="chip" data-act="p8-demo-hidden">Показать пример скрытого среза</button>') + '</div></div>';

      const right = '<div class="sec-title" style="margin-top:0">Как считается</div>' +
        '<div class="banner">' + icon('route') + '<div class="cap"><b>Запланировано</b> — пункты, принятые в путь. Предложенные и не принятые не считаются.</div></div>' +
        '<div class="banner">' + icon('check') + '<div class="cap"><b>Выполнено</b> — по отметке прихода: сканер зала, отметка на встрече, посещение стенда или вручную.</div></div>' +
        '<div class="banner">' + icon('clock') + '<div class="cap"><b>Пропущено</b> — окно закончилось без отметки (предложение, согласовать). <b>Впереди</b> — окно ещё не наступило.</div></div>' +
        '<div class="sec-title">Проверка пересчёта</div>' +
        '<div class="acc-panel" style="padding:12px 14px"><div class="cap" style="margin-bottom:6px">Путь одного участника на фикстуре (' + esc(F.ME.name) + ')</div>' +
        '<div class="con-smp"><span>запланировано <b>' + smp.planned + '</b></span><span>выполнено <b>' + smp.done + '</b></span><span>заменено <b>' + smp.replaced + '</b></span>' +
        '<span>пропущено <b>' + smp.skipped + '</b></span><span>впереди <b>' + smp.ahead + '</b></span></div>' +
        '<div class="cap" style="margin-top:6px">Предложено и не принято: ' + smp.suggested + ' ' + D.plural(smp.suggested, ['пункт', 'пункта', 'пунктов']) + '. В план-факт они не входят.</div></div>' +
        '<div class="banner" style="margin-top:12px">' + icon('lock') + '<div class="cap">Срезы меньше 5 человек не показываются; индивидуальные пути и перемещения экспонентам и спикерам не передаются.</div></div>';
      return consoleShell('P8', 'План-факт путей', F.NOW.dateLong + ' · сколько пунктов «Моего пути» выполнено', main, right);
    }
  });
  D.action('p8-day', el => { D.st('P8').day = el.dataset.arg; rerender(); });
  D.action('p8-by', el => { D.st('P8').by = el.dataset.arg; rerender(); });
  D.action('p8-demo-hidden', () => { const s = D.st('P8'); s.day = '25.02'; s.by = 'type'; rerender(); });

  /* ---------- P9 Модерация: лента, интро, чаты ---------- */
  /* Очередь постов экспонентов, первых интро автора и жалоб; роли «главный модератор», «дежурный», «группа админов чатов» (D-33, D-54).
     Действия меняют очередь и журнал аудита и подтверждаются в листе (FR-ADM-07, FR-FEED-10, FR-CHAT-06, AC-ADM-05). */
  const MOD_AREA = { chief: 'feed', duty: 'feed', chats: 'chat' };
  const MOD_WHO = { chief: 'Главный модератор', duty: 'Дежурный', chats: 'Группа админов чатов' };
  const MOD_KIND = { ad: 'Пост экспонента', intro: 'Интро', complaint: 'Жалоба на запись', 'chat-msg': 'Жалоба на сообщение', 'chat-user': 'Жалоба на участника',
    'chat-room': 'Жалоба на чат', 'chat-new': 'Чат встречи' };
  const FEED_TABS = [['ad', 'Посты экспонентов'], ['intro', 'Интро'], ['complaint', 'Жалобы'], ['done', 'Решено']];
  const CHAT_TABS = [['chat-msg', 'Сообщения'], ['chat-user', 'Участники'], ['chat-room', 'Чаты встреч'], ['done', 'Решено']];
  /* какие виды записей попадают во вкладку: «Чаты встреч» — жалобы на чат целиком и новые чаты, ждущие одобрения */
  const TAB_KINDS = { ad: ['ad'], intro: ['intro'], complaint: ['complaint'], 'chat-msg': ['chat-msg'], 'chat-user': ['chat-user'], 'chat-room': ['chat-room', 'chat-new'] };
  const MOD_ACT = {
    ok: { label: 'Одобрить', past: 'Одобрено', needReason: false },
    ret: { label: 'Вернуть с причиной', past: 'Возвращено с причиной', needReason: true },
    del: { label: 'Удалить с уведомлением автору', past: 'Удалено с уведомлением автору', needReason: true, danger: true },
    hide: { label: 'Скрыть сообщение', past: 'Скрыто сообщение', needReason: true },
    rm: { label: 'Удалить сообщение', past: 'Удалено сообщение', needReason: true, danger: true },
    mute: { label: 'Запретить писать на время', past: 'Запрещено писать на время', needReason: true },
    block: { label: 'Заблокировать в чате', past: 'Заблокирован участник в чате', needReason: true, danger: true },
    close: { label: 'Закрыть чат', past: 'Закрыт чат', needReason: true, danger: true },
    warn: { label: 'Предупредить чат', past: 'Чат предупреждён', needReason: true },
    dismiss: { label: 'Оставить без действий', past: 'Жалоба отклонена', needReason: false }
  };
  const MOD_ACTS_BY_KIND = {
    ad: ['ok', 'ret', 'del'], intro: ['ok', 'ret', 'del'], complaint: ['ok', 'ret', 'del'],
    'chat-msg': ['hide', 'rm', 'close', 'dismiss'], 'chat-user': ['mute', 'block', 'close', 'dismiss'],
    'chat-room': ['warn', 'close', 'dismiss'], 'chat-new': ['ok', 'ret', 'close']
  };
  /* Действия P9 → действие контракта S6 FIX.moderationResolve (approve | reject | delete). Мягкие действия (вернуть, скрыть, запретить писать,
     предупредить) — 'reject'; жёсткие (удалить, заблокировать, закрыть чат) — 'delete'; одобрить и «оставить без действий» — 'approve'. */
  const FEED_ACT = { ok: 'approve', dismiss: 'approve', ret: 'reject', hide: 'reject', mute: 'reject', warn: 'reject', del: 'delete', rm: 'delete', block: 'delete', close: 'delete' };
  /* подпись решения для записей чатов (в Решено): вид × действие контракта */
  const FEED_DONE = {
    'chat-msg': { approve: 'Жалоба отклонена', return: 'Скрыто сообщение', delete: 'Удалено сообщение' },
    'chat-user': { approve: 'Жалоба отклонена', return: 'Запрещено писать на время', delete: 'Заблокирован участник в чате' },
    'chat-room': { approve: 'Жалоба отклонена', return: 'Чат предупреждён', delete: 'Закрыт чат' },
    'chat-new': { approve: 'Чат одобрен', return: 'Чат возвращён автору', delete: 'Закрыт чат' }
  };
  const lbl = (a, it, k) => k === 'ok' && it && it.kind === 'complaint' ? 'Оставить запись' : a.label;
  const tMin = t => { const m = /(\d\d):(\d\d)/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : -1; };

  /* Запись очереди ленты и чатов (FIX.MODERATION_QUEUE_FEED, контракт S6) → запись P9. Прежняя очередь F.MOD_QUEUE остаётся как есть. */
  function feedKind(q) {
    if (q.kind === 'intro') return 'intro';
    if (q.kind === 'chat') return 'chat-new';
    return q.target === 'post' ? 'complaint' : q.target === 'message' ? 'chat-msg' : q.target === 'person' ? 'chat-user' : 'chat-room';
  }
  function feedItem(q, doneIdx) {
    const kind = feedKind(q), done = q.status !== 'pending', area = q.area;
    const it = { id: done ? 'fd' + doneIdx : 'f:' + q.kind + ':' + q.id, src: 'feed', fkind: q.kind, fid: q.id, kind: kind, area: area,
      time: q.ts, text: q.text, author: q.author, count: q.count || 0, reasons: q.reasons || [], postKind: q.postKind, tags: q.tags || [] };
    if (q.kind === 'report') {
      if (q.target === 'post') it.postId = q.postId || q.ref;
      else if (q.target === 'chat') it.chatId = q.chatId || q.ref;
      else if (q.target === 'message') { const p = String(q.ref).split(':'); it.chatId = q.chatId || p[0]; it.msg = q.msg != null ? q.msg : Number(p[1]); }
      else { it.chatId = q.chatId || ''; it.person = q.ref; }
    } else if (q.kind === 'chat') it.chatId = q.id;
    it.reason = it.reasons.join(', ');
    it.tag = it.tags[0] || '';
    if (!done) { it.status = 'pending'; return it; }
    const fa = q.action || (q.status === 'approved' ? 'approve' : 'return');
    it.status = area === 'chat' ? 'done' : fa === 'approve' ? 'approved' : fa === 'delete' ? 'removed' : 'returned';
    it.act = area === 'chat' ? ((FEED_DONE[kind] || {})[fa] || 'Решено') : '';
    it.by = area === 'chat' ? MOD_WHO.chats : 'Главный модератор или дежурный';
    it.reasonPicked = q.reason || '';
    it.resTime = q.ts;
    return it;
  }
  /* единый список: прежняя очередь + ленточная (ждущие решения и уже решённые), новые сверху */
  function modAll() {
    const old = F.MOD_QUEUE;
    let di = 0;
    const feed = typeof F.MODERATION_QUEUE_FEED === 'function'
      ? F.MODERATION_QUEUE_FEED({ all: true }).map(q => feedItem(q, q.status === 'pending' ? -1 : di++)) : [];
    const dup = x => x.kind === 'complaint' && feed.some(f => f.kind === 'complaint' && f.postId && f.postId === x.postId);
    const all = old.filter(x => !dup(x)).concat(feed);
    const key = x => tMin(x.resTime || x.time);
    return all.map((x, i) => [x, i]).sort((a, b) => (key(b[0]) - key(a[0])) || (a[1] - b[1])).map(p => p[0]);
  }
  const modItem = id => modAll().filter(x => x.id === id)[0];
  const modActs = it => {
    const base = MOD_ACTS_BY_KIND[it.kind] || [];
    /* у жалобы из ленты на сообщение или участника «закрыть чат» не предусмотрено контрактом: чат закрывается по жалобе на чат целиком */
    return it.src === 'feed' && (it.kind === 'chat-msg' || it.kind === 'chat-user') ? base.filter(k => k !== 'close') : base;
  };
  function modWho(ref, type) {
    if (type === 'exhibitor') { const ex = F.exhibitor(ref); return { name: ex ? ex.name : ref, sub: 'экспонент', go: 'H2/' + ref }; }
    if (ref === 'me') return { name: F.ME.name, sub: F.ME.company, go: null };
    const p = F.person(ref);
    return p ? { name: p.name, sub: p.company, go: 'F2/' + ref } : { name: ref, sub: '', go: null };
  }
  /* автор записи из ленты: человек (в том числе владелец демо через FIX.ME), экспонент, партнёр или организатор */
  function feedWho(a) {
    a = a || {};
    if (a.type === 'person' || a.type === 'exhibitor') return modWho(a.ref, a.type);
    if (a.type === 'partner') return { name: a.name || a.ref, sub: 'партнёр', go: 'K2/' + a.ref };
    return { name: a.name || a.ref || '—', sub: 'организатор фестиваля', go: null };
  }
  /* то же для записей, пришедших из ленты и чатов участников (контракт S6) */
  function feedInfo(it) {
    const who = feedWho(it.author);
    const ch = it.chatId ? (F.chat(it.chatId) || {}) : {};
    const chT = ch.title ? 'чат «' + ch.title + '»' : '';
    const chIn = ch.title ? 'в чате «' + ch.title + '»' : 'в чате встречи';
    const cnt = it.count + ' ' + D.plural(it.count, ['жалоба', 'жалобы', 'жалоб']);
    if (it.kind === 'intro') {
      const lbl = it.postKind === 'ask' ? 'первое интро с #запрос' : it.postKind === 'event' ? 'первое интро с #ивент' : 'первое интро автора';
      return { who: who, text: it.text, sub: lbl, subj: 'интро: ' + who.name };
    }
    if (it.kind === 'complaint') {
      const post = F.post(it.postId) || {};
      return { who: who, text: it.text || post.text || '', sub: cnt, extra: '', subj: 'жалоба на запись «' + who.name + '»' };
    }
    if (it.kind === 'chat-msg') return { who: who, text: it.text, sub: chT || 'чат', subj: 'сообщение ' + chIn };
    if (it.kind === 'chat-user') return { who: who, text: it.text, sub: chT || 'чат участника', subj: 'участник «' + who.name + '» ' + chIn };
    if (it.kind === 'chat-room') return { who: who, text: it.text, sub: 'жалоба на ' + (chT || 'чат встречи') + ' · ' + cnt, subj: 'жалоба на ' + (chT || 'чат встречи') };
    return { who: who, text: it.text, sub: 'новый чат встречи, ждёт одобрения', subj: 'новый ' + (chT || 'чат встречи') };
  }
  /* автор, текст и подпись элемента очереди */
  function modInfo(it) {
    if (it.src === 'feed') return feedInfo(it);
    if (it.kind === 'ad') {
      const a = modWho(it.exh, 'exhibitor');
      return { who: a, text: it.text, sub: it.subject === 'person' ? 'пост о человеке' : 'пост о компании', subj: 'пост «' + a.name + '» ' + (it.subject === 'person' ? 'о человеке' : 'о компании') };
    }
    if (it.kind === 'intro') {
      const a = modWho(it.person, 'person');
      return { who: a, text: it.text, sub: 'первое интро автора' + (it.tags && it.tags.length ? ' · ' + it.tags.join(' ') : ''), subj: 'интро: ' + a.name };
    }
    if (it.kind === 'complaint') {
      const post = F.post(it.postId) || {};
      const au = post.author || {};
      const a = modWho(au.ref, au.type === 'exhibitor' ? 'exhibitor' : 'person');
      return { who: a, text: post.text || '', sub: 'жалоб: ' + it.count, extra: it.text, subj: 'жалоба на запись «' + a.name + '»' };
    }
    const ch = F.chat(it.chatId) || {};
    if (it.kind === 'chat-msg') {
      const m = (ch.messages || [])[it.msg] || {};
      const a = modWho(m.from, 'person');
      return { who: a, text: m.text || '', sub: 'чат «' + (ch.title || it.chatId) + '»', chat: ch, subj: 'сообщение в чате «' + (ch.title || it.chatId) + '»' };
    }
    const a = modWho(it.person, 'person');
    return { who: a, text: 'Жалоба на участника чата. Причина: ' + it.reason + '.', sub: 'чат «' + (ch.title || it.chatId) + '»', chat: ch, subj: 'участник «' + a.name + '» в чате «' + (ch.title || it.chatId) + '»' };
  }
  const modStatusLbl = it => it.status === 'approved' ? 'Одобрено' : it.status === 'returned' ? 'Возвращено с причиной' : it.status === 'removed' ? 'Удалено, автор уведомлён' : (it.act || 'Решено');
  function modTabItems(st) {
    const area = MOD_AREA[st.role];
    const mine = modAll().filter(x => x.area === area);
    if (st.tab === 'done') return mine.filter(x => x.status !== 'pending');
    return mine.filter(x => x.status === 'pending' && (TAB_KINDS[st.tab] || []).indexOf(x.kind) >= 0);
  }
  function modInit(st) {
    if (!st.role) st.role = 'chief';
    const tabs = MOD_AREA[st.role] === 'chat' ? CHAT_TABS : FEED_TABS;
    if (!st.tab || !tabs.some(t => t[0] === st.tab)) st.tab = tabs[0][0];
    const items = modTabItems(st);
    if (!st.sel || !items.some(x => x.id === st.sel)) st.sel = items.length ? items[0].id : null;
  }

  D.register('P9', {
    tab: null,
    meta: {
      title: 'P9 · Модерация: лента, интро, чаты',
      role: 'Главный модератор, дежурный, группа админов чатов',
      fr: ['FR-ADM-07', 'FR-ADM-03', 'FR-ADM-10', 'FR-FEED-07', 'FR-FEED-09', 'FR-FEED-10', 'FR-CHAT-05', 'FR-CHAT-06'],
      ac: ['AC-ADM-05', 'AC-ADM-01', 'AC-CHAT-05', 'AC-CHAT-06'],
      what: [
        'Очередь ленты: посты экспонентов до публикации, первые интро автора, жалобы на записи. Очередь чатов встреч: жалобы на сообщения, участников и чаты, новые чаты встреч до одобрения.',
        'Очередь объединяет прежние записи консоли и записи, которые участники создают в приложении (интро из R3, чаты из R7, жалобы из R4 и R6): решение сразу меняет статус записи и чата у участника и уведомляет автора.',
        'Переключатель роли: главный модератор и дежурный видят ленту, группа админов чатов видит только чаты.',
        'Действия «Одобрить», «Вернуть с причиной», «Удалить с уведомлением автору» (для чатов — скрыть, удалить, запретить писать, заблокировать, закрыть чат). Каждое подтверждается в листе и пишется в журнал.'
      ],
      rules: [
        'Один главный модератор и дежурный из команды отвечают за ленту и интро (D-54); чаты встреч модерирует отдельная группа админов (D-33).',
        'Первое интро автора проверяется до публикации, следующие публикуются сразу и проверяются по жалобам и автофильтру (предложение, согласовать).',
        'Новости организаторов участник скрыть не может; жалоба на них уходит только модератору и приходит во вкладку «Жалобы» (D-35).',
        'Возврат и удаление требуют причины из списка; автор получает уведомление. Каждое действие записывается в журнал с автором, временем и причиной (AC-ADM-05).',
        '«Оставить без действий» для жалоб в чатах и «Запретить писать на время» без срока: срок ограничения и сроки реакции модератора заказчик не задавал (O-34).'
      ],
      depends: ['D-33', 'D-35', 'D-54', 'O-34']
    },
    html(ctx) {
      const st = ctx.state;
      modInit(st);
      const area = MOD_AREA[st.role];
      const tabs = area === 'chat' ? CHAT_TABS : FEED_TABS;
      /* счётчики вкладок считаются от объединённой очереди: прежняя F.MOD_QUEUE + очередь ленты и чатов FIX.MODERATION_QUEUE_FEED */
      const mine = modAll().filter(x => x.area === area);
      const cnt = t => t === 'done' ? mine.filter(x => x.status !== 'pending').length
        : mine.filter(x => x.status === 'pending' && (TAB_KINDS[t] || []).indexOf(x.kind) >= 0).length;
      const roleChips = F.MOD_ROLES.map(r =>
        '<button class="chip' + (st.role === r.id ? ' on' : '') + '" data-act="p9-role" data-arg="' + r.id + '">' + esc(r.name) + '</button>').join('');
      const role = F.MOD_ROLES.filter(r => r.id === st.role)[0];
      const tabBtns = tabs.map(t => '<button class="seg' + (st.tab === t[0] ? ' on' : '') + '" data-act="p9-tab" data-arg="' + t[0] + '">' + esc(t[1]) + ' · ' + cnt(t[0]) + '</button>').join('');
      const items = modTabItems(st);
      const done = st.tab === 'done';
      const body = items.length ? items.map(it => {
        const inf = modInfo(it);
        return '<tr class="queue-row' + (st.sel === it.id ? ' on' : '') + '" data-act="p9-sel" data-arg="' + it.id + '"><td class="cap">' + esc(done ? (it.resTime || it.time) : it.time) + '</td>' +
          '<td><div class="t-name">' + esc(MOD_KIND[it.kind]) + '</div><div class="chk">' + esc(inf.sub) + '</div></td>' +
          '<td>' + esc(inf.who.name) + '<div class="chk">' + esc(inf.who.sub) + '</div></td>' +
          '<td><div class="con-clip">' + esc(inf.text) + '</div></td>' +
          '<td>' + (done ? '<span class="pill-count">' + esc(modStatusLbl(it)) + '</span>' : (it.reason ? '<span class="pill-count">' + esc(it.reason) + '</span>' : it.tag ? '<span class="pill-count">' + esc(it.tag) + '</span>' : '')) + '</td></tr>';
      }).join('') : '';
      const empty = '<div class="con-empty">' + icon('check') + '<div><div class="b-title">' + (done ? 'Решений пока нет' : 'Очередь пуста') + '</div>' +
        '<div class="cap">' + (done ? 'Принятые решения появятся здесь вместе с записью в журнале.' : 'Новые записи и жалобы появятся здесь, как только поступят.') + '</div></div></div>';

      /* журнал: ленте — записи главного модератора и дежурного, чатам — группы админов (роль не видит чужую очередь) */
      const mineAudit = F.AUDIT.filter(e => (e.who === MOD_WHO.chats) === (area === 'chat')).slice(0, 6);
      const aud = mineAudit.length ? '<table class="c-table"><thead><tr><th>Время</th><th>Кто</th><th>Действие</th><th>Причина</th><th>Было и стало</th></tr></thead><tbody>' +
        mineAudit.map(e => '<tr><td class="cap">' + esc(e.t) + '</td><td>' + esc(e.who) + '</td><td>' + esc(e.what) + '</td><td class="cap">' + esc(e.reason || '—') + '</td>' +
          '<td class="cap">' + esc(e.before || '—') + ' · ' + esc(e.after || '—') + '</td></tr>').join('') + '</tbody></table>'
        : '<div class="cap">Записей пока нет.</div>';

      const waitTabs = tabs.filter(t => t[0] !== 'done');
      const tiles = '<div class="stat-tiles' + (waitTabs.length === 3 ? ' four' : '') + '" style="margin-bottom:14px">' + waitTabs.map(t =>
        '<div class="stat-tile"><span class="num">' + cnt(t[0]) + '</span><span class="lbl">' + esc(t[1]) + '</span></div>').join('') +
        '<div class="stat-tile"><span class="num">' + cnt('done') + '</span><span class="lbl">решено</span></div></div>';

      const main = '<div class="cap" style="margin-bottom:6px">Вы смотрите очередь как</div>' +
        '<div class="chips" role="group" aria-label="Роль">' + roleChips + '</div>' +
        '<div class="banner" style="margin:4px 0 14px">' + icon(area === 'chat' ? 'msg' : 'inbox') + '<div class="cap">' + esc(role.note) + '</div></div>' +
        tiles +
        '<div class="segbar con-seg" role="group" aria-label="Очередь">' + tabBtns + '</div>' +
        '<div class="acc-tbl-wrap" style="margin-top:12px">' + (items.length
          ? '<table class="c-table con-modtbl"><thead><tr><th>Время</th><th>Что</th><th>Автор</th><th>Текст</th><th>' + (done ? 'Решение' : 'Причина или метка') + '</th></tr></thead><tbody>' + body + '</tbody></table>'
          : empty) + '</div>' +
        '<div class="sec-title">Журнал действий</div><div class="acc-panel" style="padding:4px 14px 10px">' + aud + '</div>';

      const it = st.sel ? modItem(st.sel) : null;
      let detail;
      if (!it) {
        detail = '<div class="banner">' + icon('info') + '<div class="cap">Выберите запись в таблице: справа появятся текст и действия.</div></div>';
      } else {
        const inf = modInfo(it);
        const acts = modActs(it).map((k, i, arr) => {
          const a = MOD_ACT[k];
          return '<button class="btn ' + (i === 0 ? 'btn-primary' : 'btn-secondary' + (a.danger ? ' con-danger' : '')) + ' btn-block" data-act="p9-act" data-arg="' + it.id + '|' + k + '">' + esc(lbl(a, it, k)) + '</button>';
        }).join('');
        const idLbl = (it.src === 'feed' ? String(it.fid).replace(':', ' · ') : it.id).toUpperCase();
        detail = '<div class="acc-panel"><div class="cap" style="margin-bottom:4px">' + esc(MOD_KIND[it.kind]) + ' · ' + esc(idLbl) + ' · ' + esc(it.resTime || it.time) + '</div>' +
          '<div style="font-weight:700;font-size:16px">' + (inf.who.go ? '<button class="con-lnk" style="font-size:16px" data-go="' + esc(inf.who.go) + '">' + esc(inf.who.name) + '</button>' : esc(inf.who.name)) + '</div>' +
          '<div class="cap" style="margin-top:2px">' + esc(inf.who.sub) + (inf.sub ? ' · ' + esc(inf.sub) : '') + '</div>' +
          (it.tag ? '<div style="margin-top:8px">' + tag(it.tag, 'accent') + '</div>' : '') +
          (it.src === 'feed' ? '<div class="cap" style="margin-top:6px">Источник: ' + (it.area === 'chat' ? 'чаты встреч участников' : 'лента участников') + '</div>' : '') +
          '<div class="cap" style="margin:12px 0 4px;font-weight:600">' + (it.kind === 'complaint' ? 'Запись' : it.kind === 'chat-new' ? 'Чат' : it.kind === 'chat-room' ? 'Чат, на который жалуются' : it.kind.indexOf('chat') === 0 ? 'Сообщение' : 'Текст') + '</div>' +
          '<div class="con-quote">' + esc(inf.text) + '</div>' +
          (it.kind === 'complaint' ? '<div class="cap" style="margin:10px 0 4px;font-weight:600">Жалоба · ' + esc(it.reason) + ' · ' + it.count + '</div>' + (inf.extra ? '<div class="con-quote">' + esc(inf.extra) + '</div>' : '') : '') +
          (it.kind === 'chat-msg' || it.kind === 'chat-user' || it.kind === 'chat-room' ? '<div class="cap" style="margin-top:10px">Причина жалобы: <b>' + esc(it.reason) + '</b>' + (it.src === 'feed' && it.count ? ' · ' + it.count + ' ' + D.plural(it.count, ['жалоба', 'жалобы', 'жалоб']) : '') + '</div>' : '') +
          (it.status === 'pending'
            ? '<div style="display:flex;flex-direction:column;gap:8px;margin-top:14px">' + acts + '</div>'
            : '<div class="banner ok" style="margin-top:14px">' + icon('check') + '<div class="cap"><b>' + esc(modStatusLbl(it)) + '</b>' + (it.by ? ' · ' + esc(it.by) : '') +
              (it.reasonPicked ? '<br>Причина: ' + esc(it.reasonPicked) : '') + (it.note ? '<br>Комментарий: ' + esc(it.note) : '') + '<br>Запись в журнале, автор уведомлён.</div></div>') +
          '</div>';
      }
      const right = '<div class="sec-title" style="margin-top:0">Запись</div>' + detail +
        '<div class="banner" style="margin-top:14px">' + icon('clock') + '<div class="cap">Сроки реакции модератора и срок ограничения участника в чате заказчик не задавал.</div></div>' +
        '<div class="banner" style="margin-top:8px">' + icon('lock') + '<div class="cap">Группа админов чатов видит только чаты и не видит очередь ленты.</div></div>';
      return consoleShell('P9', 'Модерация', 'лента, интро и чаты встреч · ' + esc(role.name), main, right);
    }
  });
  D.action('p9-role', el => { const s = D.st('P9'); s.role = el.dataset.arg; s.tab = null; s.sel = null; rerender(); });
  D.action('p9-tab', el => { const s = D.st('P9'); s.tab = el.dataset.arg; s.sel = null; rerender(); });
  D.action('p9-sel', el => { D.st('P9').sel = el.dataset.arg; rerender(); });

  /* лист подтверждения действия модерации */
  D.action('p9-act', el => {
    const parts = el.dataset.arg.split('|'), it = modItem(parts[0]), a = MOD_ACT[parts[1]];
    if (!it || !a) return;
    const st = D.st('P9'), inf = modInfo(it), area = it.area;
    st.reason = (area === 'chat' && it.reason && MOD_ACT[parts[1]].needReason && F.MOD_REASONS.chat.indexOf(it.reason) >= 0) ? it.reason : null;
    const isNewChat = it.kind === 'chat-new';
    const lead = {
      ok: it.kind === 'complaint' ? 'Жалоба будет закрыта, запись остаётся в ленте.' : isNewChat ? 'Чат будет открыт для участников. Автор получит уведомление.' : 'Запись будет опубликована в ленте. Автор получит уведомление.',
      ret: it.kind === 'complaint' ? 'Запись будет скрыта из ленты и возвращена автору с причиной. Автор получит уведомление.' : isNewChat ? 'Чат вернётся автору с причиной и останется на проверке. Автор сможет исправить и отправить снова.' : 'Запись вернётся автору с причиной, в ленте её не будет. Автор сможет исправить и отправить снова.',
      del: 'Запись будет удалена, автор получит уведомление с причиной. Действие записывается в журнал.',
      hide: 'Сообщение будет скрыто для участников чата. Автор получит уведомление типа «Чаты встреч».',
      rm: 'Сообщение будет удалено, автор получит уведомление с причиной.',
      mute: 'Участник не сможет писать в чате на время, которое определяет группа админов. Он получит уведомление.',
      block: 'Участник будет заблокирован в этом чате и получит уведомление. Остальные чаты и приложение ему доступны.',
      close: 'Чат будет закрыт: чтение останется, писать будет нельзя. Участники получат уведомление.',
      warn: 'Чат получит предупреждение о правилах (напоминание в чате). Автор чата получит уведомление.',
      dismiss: 'Жалоба будет закрыта без действий в отношении автора.'
    }[parts[1]];
    const reasons = a.needReason
      ? '<div class="cap" style="margin:8px 0 6px;font-weight:600">Причина</div><div class="con-reasons" role="group" aria-label="Причина">' +
        F.MOD_REASONS[area === 'chat' ? 'chat' : 'feed'].map(r => '<button class="chip' + (st.reason === r ? ' on' : '') + '" data-act="p9-reason" data-arg="' + esc(r) + '">' + esc(r) + '</button>').join('') + '</div>' +
        '<div class="con-field"><label for="p9-note">Комментарий автору (необязательно)</label><textarea class="textarea" id="p9-note" maxlength="200" style="min-height:64px" placeholder="Что исправить"></textarea></div>'
      : '';
    dialog(lbl(a, it, parts[1]) + '?',
      '<div class="con-sheet-lead"><b>' + esc(MOD_KIND[it.kind]) + ': ' + esc(inf.who.name) + '</b><div class="cap" style="margin-top:2px">' + esc(inf.subj) + '</div></div>' +
      '<div class="cap" style="font-size:13.5px;line-height:1.5;color:var(--ink)">' + lead + '</div>' + reasons +
      '<div class="con-sheet-note">Как ' + esc(MOD_WHO[st.role].toLowerCase()) + '. Действие запишется в журнал с автором, временем и причиной.</div>',
      lbl(a, it, parts[1]), 'p9-do', it.id + '|' + parts[1], { danger: !!a.danger });
    const ok = document.querySelector('.sheet [data-act="p9-do"]');
    if (ok && a.needReason && !st.reason) ok.setAttribute('disabled', 'disabled');
  });
  D.action('p9-reason', el => {
    const st = D.st('P9');
    st.reason = el.dataset.arg;
    document.querySelectorAll('.con-reasons .chip').forEach(c => c.classList.toggle('on', c === el));
    const ok = document.querySelector('.sheet [data-act="p9-do"]');
    if (ok) ok.removeAttribute('disabled');
  });
  D.action('p9-do', el => {
    const parts = el.dataset.arg.split('|'), it = modItem(parts[0]), a = MOD_ACT[parts[1]], st = D.st('P9');
    if (!it || !a || it.status !== 'pending') return;
    if (a.needReason && !st.reason) return;
    const note = val('p9-note'), inf = modInfo(it), who = MOD_WHO[st.role];
    const isChat = it.area === 'chat', k = parts[1], isNewChat = it.kind === 'chat-new';
    const after = k === 'ok' ? (it.kind === 'complaint' ? 'жалоба закрыта, запись остаётся' : isNewChat ? 'чат открыт' : 'опубликовано')
      : k === 'ret' ? (it.kind === 'complaint' ? 'скрыто и возвращено автору' : isNewChat ? 'чат возвращён автору' : 'возвращено с причиной')
      : k === 'del' ? 'удалено, автор уведомлён' : a.past.toLowerCase();
    const before = isNewChat ? 'чат ждёт одобрения' : it.kind === 'complaint' || isChat ? 'жалоба в очереди' : 'на проверке';
    const why = a.needReason ? st.reason + (note ? ' — ' + note : '') : '';
    let log = null;
    if (it.src === 'feed') {
      /* запись ленты или чата участников: решение проходит через контракт S6, он же меняет статус в R1, R3, R4, R5, R6 и уведомляет автора */
      log = F.moderationResolve(it.fkind, it.fid, FEED_ACT[k], why);
      if (!log) { st.reason = null; st.sel = null; D.closeSheet(); rerender(); D.toast('Запись уже решена'); return; }
    } else {
      it.status = isChat ? 'done' : k === 'ok' ? 'approved' : k === 'ret' ? 'returned' : 'removed';
      it.act = lbl(a, it, k); it.by = who; it.note = note; it.reasonPicked = a.needReason ? st.reason : (it.reason || '');
      /* одобренные посты экспонентов и интро публикуются в ленту R1 (контракт FIX.feedPublish);
         «вернуть» оставляет запись у автора (status returned), «удалить» — removed */
      if (k === 'ok' && (it.kind === 'ad' || it.kind === 'intro') && typeof F.feedPublish === 'function') {
        if (it.kind === 'ad') {
          const ex = F.exhibitor(it.exh) || {};
          const pk = ex.pack && F.pack ? F.pack(ex.pack) : null;
          const paid = !!(pk && pk.posts && (pk.posts.company + pk.posts.person) > 0);
          F.feedPublish({ kind: 'ad', author: { type: 'exhibitor', ref: it.exh }, subject: it.subject,
            tags: it.tag ? [it.tag] : ['Решения для роста бизнеса'], text: it.text, link: 'H2/' + it.exh, paid: paid });
        } else {
          const tags = it.tags || [];
          const pk2 = tags.indexOf('#запрос') >= 0 ? 'ask' : tags.indexOf('#ивент') >= 0 ? 'event' : 'intro';
          const co = ((F.COMPANIES || []).filter(c => c.pid === it.person))[0];
          F.feedPublish({ kind: pk2, author: { type: 'person', ref: it.person }, tags: tags, text: it.text,
            link: co ? 'F12/' + co.id : null });
        }
      }
      if (k === 'del' && (it.kind === 'ad' || it.kind === 'intro')) {
        /* у ранее опубликованной записи (если такая уже была в ленте) — снять её */
        const pid = it.kind === 'ad' ? it.feedId : null;
        if (pid && typeof F.feedRemove === 'function') F.feedRemove(pid, why);
      }
    }
    const ae = F.opsAudit(who, a.past + ': ' + inf.subj, why, before, after);
    if (log) ae.t = log.time;                 // время в журнале консоли совпадает со временем решения в очереди
    else it.resTime = ae.t;
    st.reason = null; st.sel = null;
    D.closeSheet();
    rerender();
    D.toast(k === 'ok' ? (isNewChat ? 'Чат открыт, автор уведомлён' : it.kind === 'complaint' ? 'Жалоба закрыта, запись остаётся' : 'Одобрено, автор уведомлён') : k === 'dismiss' ? 'Жалоба отклонена' : a.past + ', автор уведомлён');
  });

  /* ---------- P10 ИИ: режимы, лимиты, бюджет ---------- */
  /* Девять режимов (D-49, FR-ADM-09): лимит, статус, замена без ИИ, переключатели. Бюджет в токенах и оценка стоимости
     не внесены: «ждём оценку Руслана» (Q-26, O-23). Режим нельзя включить без бюджета (AC-AI-13). */
  const aiStatus = m => m.on ? (m.fb ? 'Замена без ИИ' : 'Включён') : (m.budget == null ? 'Выключен: нет бюджета' : 'Выключен');
  const aiMode = id => F.AI_MODES.filter(m => m.id === id)[0];
  function aiRow(m) {
    const lock = m.budget == null, fbLock = !m.on;
    return '<div class="con-ai-row" role="row" data-act="p10-cfg" data-arg="' + m.id + '">' +
      '<div class="ai-n"><b>' + esc(m.name) + '</b><span>' + esc(m.code) + '</span></div>' +
      '<div class="ai-fb">' + esc(m.fallback) + '</div>' +
      '<div class="ai-v">' + (m.limit == null ? nothing() : fmt(m.limit) + ' в сутки') + '</div>' +
      '<div class="ai-v">' + (m.budget == null ? nothing('ждём оценку Руслана') : fmt(m.budget) + ' токенов в сутки') + '</div>' +
      '<div class="ai-v">' + (m.cost == null ? nothing('ждём оценку Руслана') : fmt(m.cost) + ' ₽ в сутки') + '</div>' +
      '<div class="ai-v">' + tag(aiStatus(m), m.on ? (m.fb ? '' : 'accent') : '') + '</div>' +
      '<div class="ai-s">' + sw('p10-on', m.id, m.on, 'Режим ИИ «' + m.name + '»', '', lock ? 'is-locked' : '') + '</div>' +
      '<div class="ai-s">' + sw('p10-fb', m.id, m.on ? m.fb : true, 'Замена без ИИ «' + m.name + '»', '', fbLock ? 'is-locked' : '') + '</div></div>';
  }
  D.register('P10', {
    tab: null,
    meta: {
      title: 'P10 · ИИ: режимы, лимиты, бюджет',
      role: 'Администратор, команда организатора',
      fr: ['FR-ADM-09', 'FR-ADM-10', 'FR-AI-05', 'FR-AI-07', 'FR-AI-08', 'FR-AI-09', 'FR-ANL-11'],
      ac: ['AC-ADM-07', 'AC-AI-12', 'AC-AI-13', 'AC-AI-14', 'AC-ANL-09'],
      what: [
        'Таблица девяти режимов ИИ: Диагност, Автор питча, Планировщик пути, Подбор людей, Подборщик решений, Умный поиск, Секретарь, FAQ, Хроникёр.',
        'У каждого: замена без ИИ, лимит на человека, бюджет в токенах и оценка стоимости («ждём оценку Руслана»), статус и два переключателя: «Режим ИИ» и «Замена без ИИ».',
        'Выбранный режим: что делает, замена, порог выпуска, настройка лимита и бюджета. Общий лимит человека и рычаги снижения стоимости.'
      ],
      rules: [
        'Режим нельзя включить в production без внесённого бюджета в токенах; пока значение не внесено, консоль показывает «ждём оценку Руслана» (AC-AI-13). Цифр стоимости в демо нет.',
        'Выключенный режим работает через замену без ИИ без сообщений об ошибке модели (AC-AI-14); переключатель замены у включённого режима переводит его на замену вручную.',
        'Общий лимит человека (значение задаётся в параметрах, P5) действует вместе с лимитом режима: запрос расходует оба (предложение, согласовать). Лимиты меняются без релиза, применяются не позднее чем через 60 секунд.',
        'В модель уходит полный набор данных без контактов, имена шифруются; зарубежные модели не получают данных людей (D-49).'
      ],
      depends: ['D-49', 'D-46', 'Q-26', 'O-23', 'O-29']
    },
    html(ctx) {
      const M = F.AI_MODES;
      const nOn = M.filter(m => m.on).length, nNoBud = M.filter(m => m.budget == null).length, nFb = M.filter(m => !m.on || m.fb).length;
      const tiles = '<div class="stat-tiles four" style="margin-bottom:14px">' +
        '<div class="stat-tile"><span class="num">' + M.length + '</span><span class="lbl">режимов ИИ</span></div>' +
        '<div class="stat-tile"><span class="num">' + nOn + '</span><span class="lbl">включено</span></div>' +
        '<div class="stat-tile"><span class="num">' + nNoBud + '</span><span class="lbl">без бюджета</span></div>' +
        '<div class="stat-tile"><span class="num">' + nFb + ' из ' + M.length + '</span><span class="lbl">работают на замене без ИИ</span></div></div>';
      const head = '<div class="con-ai-row con-ai-head" role="row"><div>Режим</div><div>Чем заменяем</div><div>Лимит на человека</div><div>Бюджет в токенах</div><div>Оценка стоимости</div><div>Статус</div><div>Режим ИИ</div><div>Замена без ИИ</div></div>';
      const notes = '<div class="con-grid2" style="margin-top:14px">' +
        '<div class="acc-panel"><div class="cap" style="margin-bottom:6px">Общие правила</div>' +
        '<dl class="con-dl"><dt>Общий лимит человека</dt><dd>' + F.AI_TOTAL.perPerson + ' запросов в сутки; действует вместе с лимитом режима: запрос расходует оба (предложение, согласовать)</dd>' +
        '<dt>Общий предел бюджета</dt><dd>' + (F.AI_TOTAL.budget == null ? nothing('ждём оценку Руслана') : fmt(F.AI_TOTAL.budget) + ' токенов в сутки') + ', с автоотключением</dd>' +
        '<dt>Данные в модель</dt><dd>Полный набор без контактов, имена шифруются; зарубежные модели не получают данных людей (D-49).</dd></dl></div>' +
        '<div class="acc-panel"><div class="cap" style="margin-bottom:6px">Метрики и стоимость</div>' +
        '<dl class="con-dl"><dt>Метрики вызовов</dt><dd>Число вызовов, токены и доля замен по режимам появятся после включения режимов (ai_run).</dd>' +
        '<dt>Как снизить стоимость</dt><dd>Ночной предрасчёт путей, кэш версий, малая модель для маршрутизации, лимит пересборок (<button class="con-lnk" data-go="P5">параметр в P5</button>).</dd></dl></div></div>';
      const main = tiles +
        '<div class="banner warn" style="margin-bottom:14px">' + icon('lock') + '<div class="cap"><b>Режим нельзя включить без бюджета в токенах.</b> Пока значения не внесены, поля «бюджет в токенах» и «оценка стоимости» показывают «ждём оценку Руслана». Нажмите на строку, чтобы открыть режим.</div></div>' +
        '<div class="con-ai" role="table" aria-label="Режимы ИИ">' + head + M.map(m => aiRow(m)).join('') + '</div>' + notes;
      return consoleShell('P10', 'ИИ: режимы, лимиты, бюджет', 'девять режимов, замена без ИИ · стоимость не оценена', main, null);
    }
  });
  /* режим ИИ: включение требует бюджета и подтверждения */
  D.action('p10-on', el => {
    const m = aiMode(el.dataset.arg);
    if (!m) return;
    if (m.budget == null) { D.toast('Нельзя включить: ждём оценку Руслана'); return; }
    dialog(m.on ? 'Выключить режим?' : 'Включить режим в production?',
      '<div class="con-sheet-lead"><b>' + esc(m.name) + '</b> · ' + esc(m.code) + '</div>' +
      '<div class="cap" style="font-size:13.5px;line-height:1.5;color:var(--ink)">' + (m.on
        ? 'Запросы режима пойдут в замену без ИИ: ' + esc(m.fallback) + '. Ошибок модели участники не увидят.'
        : 'Порог выпуска: ' + esc(m.gate) + '. Включайте режим только после подтверждения порога отчётом.') + '</div>' +
      '<div class="con-sheet-note">Изменение применится не позднее чем через 60 секунд и запишется в журнал.</div>',
      m.on ? 'Выключить' : 'Включить', 'p10-on-ok', m.id);
  });
  D.action('p10-on-ok', el => {
    const m = aiMode(el.dataset.arg);
    if (!m) return;
    m.on = !m.on;
    if (m.on) m.fb = false;
    audit('Администратор', 'Режим ИИ «' + m.name + '»', '', m.on ? 'выключен' : 'включён', m.on ? 'включён' : 'выключен');
    D.closeSheet();
    rerender();
    D.toast(m.name + ': ' + (m.on ? 'включён' : 'выключен, работает замена'));
  });
  /* замена без ИИ: у выключенного режима включена всегда */
  D.action('p10-fb', el => {
    const m = aiMode(el.dataset.arg);
    if (!m) return;
    if (!m.on) { D.toast('Режим выключен: замена без ИИ включена всегда'); return; }
    dialog(m.fb ? 'Вернуть режим на ИИ?' : 'Перевести на замену без ИИ?',
      '<div class="con-sheet-lead"><b>' + esc(m.name) + '</b> · ' + esc(m.code) + '</div>' +
      '<div class="cap" style="font-size:13.5px;line-height:1.5;color:var(--ink)">' + (m.fb
        ? 'Запросы снова пойдут в модель в рамках лимита и бюджета.'
        : 'Запросы пойдут в замену: ' + esc(m.fallback) + '. Сообщений об ошибке модели не будет.') + '</div>' +
      '<div class="con-sheet-note">Изменение применится не позднее чем через 60 секунд и запишется в журнал.</div>',
      m.fb ? 'Вернуть на ИИ' : 'Перевести на замену', 'p10-fb-ok', m.id);
  });
  D.action('p10-fb-ok', el => {
    const m = aiMode(el.dataset.arg);
    if (!m) return;
    m.fb = !m.fb;
    audit('Администратор', 'Замена без ИИ «' + m.name + '»', '', m.fb ? 'выключена' : 'включена', m.fb ? 'включена' : 'выключена');
    D.closeSheet();
    rerender();
    D.toast(m.name + ': ' + (m.fb ? 'замена без ИИ включена' : 'снова на ИИ'));
  });
  /* лимит, бюджет и оценка стоимости режима (значения вносит администратор по оценке Руслана) */
  D.action('p10-cfg', el => {
    const m = aiMode(el.dataset.arg);
    if (!m) return;
    const f = (id, label, cur, hint) => '<div class="con-field"><label for="p10-' + id + '">' + label + '</label><input class="input" id="p10-' + id + '" value="' + esc(cur == null ? '' : cur) +
      '" inputmode="numeric" maxlength="9" autocomplete="off"><div class="con-hint">' + hint + '</div><div class="con-err" id="p10-' + id + '-err"></div></div>';
    dialog('Режим «' + m.name + '»',
      '<div class="con-sheet-lead"><span class="cap">' + esc(m.code) + ' · ' + esc(aiStatus(m)) + '</span></div>' +
      '<dl class="con-dl"><dt>Что делает</dt><dd>' + esc(m.does) + '</dd><dt>Замена без ИИ</dt><dd>' + esc(m.fallback) + '</dd><dt>Порог выпуска</dt><dd>' + esc(m.gate) + '</dd></dl>' +
      f('lim', 'Лимит запросов на человека в сутки', m.limit, 'Действует вместе с общим лимитом ' + F.AI_TOTAL.perPerson + ' запросов в сутки. Пусто: не задан.') +
      f('bud', 'Бюджет в токенах в сутки', m.budget, 'Вносится по оценке Руслана. Пусто: ждём оценку, режим включить нельзя.') +
      f('cost', 'Оценка стоимости, ₽ в сутки', m.cost, 'Вносится по оценке Руслана. Пусто: ждём оценку.') +
      '<div class="con-sheet-note">Цифр по умолчанию нет: значения вносит администратор. Изменение применится не позднее чем через 60 секунд и запишется в журнал.</div>',
      'Сохранить', 'p10-cfg-ok', m.id);
  });
  D.action('p10-cfg-ok', el => {
    const m = aiMode(el.dataset.arg);
    if (!m) return;
    const vals = { lim: val('p10-lim'), bud: val('p10-bud'), cost: val('p10-cost') };
    let bad = false;
    Object.keys(vals).forEach(k => {
      if (vals[k] && (!/^\d+$/.test(vals[k]) || parseInt(vals[k], 10) < 1)) { setErr('p10-' + k, 'Введите целое число больше нуля'); bad = true; } else setErr('p10-' + k, '');
    });
    if (bad) return;
    const nv = { limit: vals.lim ? parseInt(vals.lim, 10) : null, budget: vals.bud ? parseInt(vals.bud, 10) : null, cost: vals.cost ? parseInt(vals.cost, 10) : null };
    const lbl = { limit: 'лимит', budget: 'бюджет в токенах', cost: 'оценка стоимости' };
    let changed = 0;
    Object.keys(nv).forEach(k => {
      const old = m[k] == null ? null : m[k];
      if (old !== nv[k]) {
        audit('Администратор', 'Режим ИИ «' + m.name + '»: ' + lbl[k], '', old == null ? 'не задано' : String(old), nv[k] == null ? 'не задано' : String(nv[k]));
        m[k] = nv[k]; changed++;
      }
    });
    if (nv.budget == null && m.on) { m.on = false; m.fb = true; }
    D.closeSheet();
    rerender();
    D.toast(changed ? 'Сохранено: ' + m.name : 'Изменений нет');
  });
})();
