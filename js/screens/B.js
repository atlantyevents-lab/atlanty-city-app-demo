/* Блок B — «Мой путь» v3 (раздел S2): B1 (три фазы), B3, B4–B8.
   Общий модуль D.pth (состояние пути, конфликты, версии, разметка пунктов) используют N.js и другие разделы.
   Данные — data/fx_path.js (PATH_ITEMS, PATH_VERSIONS, PATH_ALTS, PATH_GROUPS, ...);
   контракт «+ Путь» — FIX.pathFind / pathAdd / pathRemove (действия path-add и path-remove лежат в Z.js).
   Стили — css/path.css, классы с префиксом pth-. */
(function () {
  'use strict';
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag, tariffTag, avatar } = D;
  const plural = D.plural;
  const PU = D.pth = {};

  if (F.pathSyncProgram) F.pathSyncProgram();

  /* ---------- общее состояние пути (живёт между экранами) ---------- */
  const PS = D.st('PATH');
  if (!PS.init) {
    PS.init = true;
    PS.phase = 'event';      /* event | pre | after: задаёт B1 по параметру маршрута */
    PS.version = 'pv03';     /* применённая версия пути */
    PS.vhide = {};           /* id пунктов, скрытых версией: id -> прежний статус */
    PS.gchosen = {};         /* выбор в группах параллельных вариантов: id группы -> id пункта */
    PS.groups = [];          /* группы, собранные кнопкой «В избранное» (B7) */
    PS.altOff = 0;           /* указатель кругового набора «Три возможности на сейчас» */
    PS.altShown = null;
    PS.rebuilds = 0;         /* пересборок за сутки */
    PS.log = [];             /* события пути для дайджеста (FR-PATH-16) */
    PS.q = '';
    PS.fresh = {};           /* пункты, появившиеся после замены или пересборки: id -> подпись метки (V-13) */
    PS.orig = {};
    F.PATH_ITEMS.forEach(it => { PS.orig[it.id] = it.status; });
  }
  PU.PS = PS;
  /* фаза пути (до события, событие, после) задаётся на B1 и действует на экранах B и N, пока человек остаётся внутри раздела;
     при входе с экрана вне раздела фаза возвращается к дню события. Предыдущий адрес читается до того, как слушатель ниже его обновит. */
  function syncPhase() {
    const prev = PS.curHash || '';
    PS.curHash = location.hash;
    if (!/^#\/[BN]\d/.test(prev)) PS.phase = 'event';
  }
  PU.syncPhase = syncPhase;
  /* тост после перерисовки: route() заменяет весь кадр, поэтому тост, показанный до перерисовки или перехода, исчезает сразу */
  PU.say = (msg, ms, act) => { setTimeout(() => D.toast(msg, ms, act), 60); };

  /* «в пути» и «предложено»: pathFind возвращает принятые, записанные и состоявшиеся пункты, pathFindAny ещё и предложенные;
     до изменения контракта оболочкой pathFindAny может отсутствовать, тогда поведение то же, что у pathFind */
  const findAny = (t, r, d, tm) => (F.pathFindAny || F.pathFind)(t, r, d, tm);
  const findIn = (t, r, d, tm) => { const it = findAny(t, r, d, tm); return it && it.status !== 'suggested' ? it : null; };
  /* человек из пути может быть и встречей «Знакомство», и покупателем: ищем оба типа */
  const findPerson = ref => findAny('person', ref) || findAny('buyer', ref);
  const isDismissed = (type, ref) => !!(F.pathDismissed && F.pathDismissed(type, ref));
  const dismiss = (type, ref) => { if (F.pathDismiss) F.pathDismiss(type, ref); };
  const isPinned = it => !!(it && it.pin);
  Object.assign(PU, { findAny, findIn, findPerson, isDismissed, dismiss, isPinned });
  window.addEventListener('hashchange', () => { PS.curHash = location.hash; });
  PU.REBUILD_LIMIT = (F.PATH_LIMITS && F.PATH_LIMITS.rebuildsPerDay) || 3;

  /* ---------- время ---------- */
  const tm = t => parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3, 5), 10);
  const fmt = m => F.fmtTime(m);
  const DAYS = ['25.02', '26.02', '27.02', '28.02'];
  const dayKey = d => 'd' + d.slice(0, 2) + d.slice(3, 5);
  const dayOfKey = k => { const m = /^d(\d\d)(\d\d)$/.exec(k || ''); return m && DAYS.indexOf(m[1] + '.' + m[2]) >= 0 ? m[1] + '.' + m[2] : null; };
  const abs = (d, t) => DAYS.indexOf(d) * 1440 + tm(t);
  const NOW_ABS = abs(F.PATH_NOW.day, F.PATH_NOW.time);
  const nowAbs = () => PS.phase === 'pre' ? -1 : PS.phase === 'after' ? 99999 : NOW_ABS;
  const startAbs = it => abs(it.day, it.time);
  const endAbs = it => startAbs(it) + (it.dur || 0);
  const endLabel = it => fmt(tm(it.time) + (it.dur || 0));
  const dayInfo = d => (F.DAYS || []).find(x => x.id === d) || { id: d, week: '', title: '' };
  const dayLong = d => ({ '25.02': '25 февраля, четверг', '26.02': '26 февраля, пятница', '27.02': '27 февраля, суббота', '28.02': '28 февраля, воскресенье' }[d] || d);
  const hallShort = id => { const h = id && F.hall(id); return h ? h.short : ''; };
  /* правка текста при показе: названия сессий в общих данных (fixtures.js) содержат латиницу и знак доллара,
     validate.js требует, чтобы названия пунктов совпадали с сессиями, поэтому данные не трогаем, а подменяем в показе (V-20) */
  const FIXT = [[/Welcome-встреча/g, 'Встреча при заезде'], [/partner-каналы/g, 'каналы партнёров'], [/\$500/g, '500 долларов']];
  const fixTitle = s => FIXT.reduce((t, r) => t.replace(r[0], r[1]), String(s == null ? '' : s));
  PU.fixTitle = fixTitle;
  const cut = (s, n) => {
    s = fixTitle(s);
    if (s.length <= n) return s;
    let t = s.slice(0, n - 1);
    const sp = t.lastIndexOf(' ');
    if (sp > n * 0.55) t = t.slice(0, sp);
    return t.replace(/[\s,.:;—-]+$/, '') + '…';
  };
  Object.assign(PU, { tm, fmt, DAYS, dayKey, dayOfKey, abs, startAbs, endAbs, endLabel, dayLong, hallShort, cut });

  /* ---------- статус и видимость пункта ----------
     Эффективный статус: в фазе «до события» прошедшие пункты снова предложены; в дни события пункт без отметки
     по окончании окна считается пропущенным (FR-PATH-16, предложение). Убранные будущие пункты и заменённые не показываются. */
  function stat(it) {
    const raw = it.status;
    if (PS.phase === 'pre') return (raw === 'done' || raw === 'skipped') ? 'suggested' : raw;
    if (raw === 'skipped' || raw === 'done' || raw === 'replaced') return raw;
    if (it.type !== 'task' && endAbs(it) <= nowAbs()) return 'skipped';
    return raw;
  }
  function visible(it) {
    if (!it || it.status === 'replaced' || it.vh) return false;
    if (it.status === 'skipped') {
      if (PS.phase === 'pre') return PS.orig[it.id] === 'skipped';
      return endAbs(it) <= nowAbs();
    }
    return true;
  }
  const dayItems = day => F.pathItems(day).filter(visible);
  Object.assign(PU, { stat, visible, dayItems });

  /* ---------- подписи ---------- */
  const GRP = { session: 'sess', practice: 'sess', mentor: 'meet', person: 'meet', buyer: 'meet',
    stand: 'expo', kipatalk: 'expo', networking: 'leis', leisure: 'leis', task: 'task' };
  const KIND = { session: 'Сессия', practice: 'Практика', leisure: 'Досуг', networking: 'Нетворкинг',
    mentor: 'Менторская встреча', kipatalk: 'КипяTALK', stand: 'Стенд', person: 'Знакомство', buyer: 'Покупатель', task: 'Дело' };
  const STATUS = { suggested: 'предложено', accepted: 'принято', booked: 'записано', done: 'состоялось', skipped: 'пропущено', replaced: 'заменено' };
  function kindOf(x) {
    const s = (x.type === 'session' || x.type === 'practice' || x.type === 'leisure') ? F.session(x.ref) : null;
    if (s && (x.type === 'session' || x.type === 'practice')) return s.format;
    if (s && x.type === 'leisure') return 'Досуг' + (s.label ? ' · ' + s.label : '');
    if (x.type === 'networking') return /^fp/.test(x.ref) ? 'Встреча участников' : 'Нетворкинг';
    return KIND[x.type] || 'Пункт';
  }
  const isPaid = exId => { const e = F.exhibitor(exId); return !!e && (e.pack === 'Экспо+' || e.pack === 'Премиум'); };
  const srcTag = it => it.source === 'ai' ? tag('ИИ', 'accent') : it.source === 'self' ? tag('вы добавили')
    : it.source === 'feed' ? tag('из ленты') : it.source === 'org' ? tag('организатор') : '';
  const paidTag = x => x.paid ? tag('на площадке', 'fill') : '';
  /* причина показа: вид и текст из данных; «вы добавили» показывается меткой, а у пунктов организатора
     вместо «на площадке» пишем «от организаторов»: подпись «на площадке» зарезервирована за платным размещением */
  /* нижний регистр без порчи аббревиатур: ИИ, CRM, B2B, WMS, HR остаются прописными (V-09) */
  const lc = s => String(s == null ? '' : s).replace(/[A-Za-zА-Яа-яЁё0-9]+/g, w => (w.length > 1 && w === w.toUpperCase() && /[A-ZА-ЯЁ]/.test(w)) ? w : w.toLowerCase());
  PU.lc = lc;
  /* причина показа в одном виде везде в S2: «Причина: ваша цель — …», «Причина: общее у вас — …»; аббревиатуры прописные (V-09, V-12).
     В данных остаётся формат таксономии «ваша цель: …», «общее: …»; здесь он только оформляется для показа. */
  const whyBody = t => {
    const m = /^(ваша цель|ваш запрос|общее)\s*:\s*(.*)$/.exec(String(t || ''));
    return m ? (m[1] === 'общее' ? 'общее у вас — ' + lc(m[2]) : m[1] + ' — ' + m[2]) : String(t || '');
  };
  const whyLine = t => { const b = whyBody(t); return b ? 'Причина: ' + b : ''; };
  PU.whyBody = whyBody; PU.whyLine = whyLine; PU.reasonLine = whyLine;
  function reasonText(x) {
    const r = x.reason; if (!r) return '';
    if (r.kind === 'self') return '';
    if (r.kind === 'onsite') return 'Причина: ' + (x.paid ? 'на площадке' : 'от организаторов');
    /* причина собирается из живого профиля (запрос, цели): PS.whyText; пустая — причина скрывается */
    const t = (F.PS && F.PS.whyText) ? F.PS.whyText(r) : r.text;
    return t ? whyLine(t) : '';
  }
  function taskLink(it) {
    return it.taskKind === 'reply' ? 'F4' : it.taskKind === 'rate' ? 'M3' : it.taskKind === 'note' ? 'M2/new'
      : it.taskKind === 'confirm' ? 'D2' : 'B4/' + dayKey(it.day);
  }
  function linkOf(x) {
    switch (x.type) {
      case 'session': case 'practice': case 'leisure': return 'C3/' + x.ref;
      case 'networking': return /^fp/.test(x.ref) ? 'R4/' + x.ref : 'C3/' + x.ref;
      case 'mentor': return 'C5/' + x.ref;
      case 'kipatalk': case 'stand': return 'H2/' + x.ref;
      case 'person': case 'buyer': return 'F2/' + x.ref;
      case 'task': return taskLink(x);
    }
    return 'B1';
  }
  Object.assign(PU, { GRP, KIND, STATUS, kindOf, isPaid, srcTag, paidTag, reasonText, linkOf, taskLink });

  function logEv(kind, text) { PS.log.unshift({ kind, text }); }
  PU.logEv = logEv;

  /* ---------- переходы между залами ---------- */
  const leadMin = walk => Math.ceil((walk + 5) / 5) * 5;   /* «выйти за N минут»: время пешком и запас */
  function transit(a, b) {
    if (!a || !b || !a.hall || !b.hall) return null;
    const walk = F.pathTransit(a.hall, b.hall);
    if (walk == null || walk === 0) return null;
    const gap = startAbs(b) - endAbs(a);
    const lead = gap >= walk ? Math.min(leadMin(walk), gap) : leadMin(walk);   /* совет укладывается в перерыв */
    return { walk, gap, lead, tight: gap < walk, from: hallShort(a.hall), to: hallShort(b.hall) };
  }
  PU.transit = transit; PU.leadMin = leadMin;

  /* ---------- группы параллельных вариантов (избранное по программе) ---------- */
  const groups = () => F.PATH_GROUPS.concat(PS.groups);
  function liveOpts(g) {
    return g.options.map(id => F.pathItem(id)).filter(it => it && visible(it) && stat(it) !== 'skipped');
  }
  function chosenOf(g) {
    const live = liveOpts(g), id = PS.gchosen[g.id] || g.chosen;
    return live.find(it => it.id === id) || live[0] || null;
  }
  function groupOf(it) {
    return groups().find(g => g.options.indexOf(it.id) >= 0 && liveOpts(g).length > 1) || null;
  }
  const isOff = it => { const g = groupOf(it); return !!g && chosenOf(g).id !== it.id; };
  Object.assign(PU, { groups, liveOpts, chosenOf, groupOf, isOff });

  /* ---------- конфликты (четыре вида, FR-PATH-09) ---------- */
  function active(it) {
    if (it.type === 'task' || !visible(it)) return false;
    const s = stat(it);
    return (s === 'suggested' || s === 'accepted' || s === 'booked') && !isOff(it);
  }
  function tariffClosed(it) {
    const s = (it.type === 'session' || it.type === 'practice' || it.type === 'leisure') ? F.session(it.ref) : null;
    if (!s) return null;
    const t = F.ME.tariff;
    if (s.access === 'fc' && t !== 'Первый класс') return 'Первый класс';
    if (s.access === 'biz_fc' && t !== 'Бизнес' && t !== 'Первый класс') return 'Бизнес';
    if (s.access === 'sat') return 'программа «Спутник»';
    return null;
  }
  function seatsOut(it) {
    if (F.WAITLIST && F.WAITLIST.session === it.ref && (it.type === 'session' || it.type === 'practice')) return F.WAITLIST.pos;
    const s = (it.type === 'session' || it.type === 'practice') ? F.session(it.ref) : null;
    return s && s.left === 0 ? 1 : 0;
  }
  const byStart = (a, b) => startAbs(a) - startAbs(b) || (a.id < b.id ? -1 : 1);
  function conflictsAll(day) {
    const out = [];
    (day ? [day] : DAYS).forEach(d => {
      const list = dayItems(d).filter(active).sort(byStart);
      for (let i = 0; i < list.length; i++) {
        const a = list[i];
        for (let j = i + 1; j < list.length; j++) {
          const b = list[j];
          if (startAbs(b) < endAbs(a)) {
            out.push({ id: 'ov:' + a.id + ':' + b.id, kind: 'overlap', day: d, a, b,
              min: Math.min(endAbs(a), endAbs(b)) - startAbs(b) });
          }
        }
        const nx = list[i + 1];
        if (nx && startAbs(nx) >= endAbs(a)) {
          const t = transit(a, nx);
          if (t && t.tight) out.push({ id: 'tr:' + a.id + ':' + nx.id, kind: 'transit', day: d, a, b: nx, t });
        }
      }
      list.forEach(it => {
        const need = tariffClosed(it);
        if (need) out.push({ id: 'ta:' + it.id, kind: 'tariff', day: d, a: it, need });
        const pos = seatsOut(it);
        if (pos) out.push({ id: 'se:' + it.id, kind: 'seats', day: d, a: it, pos });
      });
    });
    return out;
  }
  /* счёт конфликтов (B1, B4, B7) по одному правилу: считаются пункты, которые вы приняли, на которые записаны или которые добавили сами
     (источник «вы добавили» и «из ленты»); у предложений ИИ пересечение показывается меткой на карточке и в счёт не входит */
  const isFirm = it => { const s = stat(it); return s === 'accepted' || s === 'booked' || s === 'done' || it.source === 'self' || it.source === 'feed'; };
  const conflicts = day => conflictsAll(day).filter(c => isFirm(c.a) && (!c.b || isFirm(c.b)));
  const confOf = it => conflictsAll(it.day).filter(c => c.a === it || c.b === it);
  Object.assign(PU, { conflictsAll, isFirm });
  const KIND_RU = { overlap: 'пересечение', transit: 'мало времени на переход', tariff: 'закрыто по тарифу', seats: 'мест нет' };
  function confText(c) {
    const q = x => '«' + cut(x.title, 38) + '»';
    if (c.kind === 'overlap') return q(c.a) + ' и ' + q(c.b) + ' пересекаются на ' + c.min + ' ' + plural(c.min, ['минуту', 'минуты', 'минут']);
    if (c.kind === 'transit') return 'После ' + q(c.a) + ' до ' + q(c.b) + ' остаётся ' + Math.max(c.t.gap, 0) + ' ' +
      plural(Math.max(c.t.gap, 0), ['минута', 'минуты', 'минут']) + ', на переход нужно ' + c.t.walk + ' (' + c.t.from + ' — ' + c.t.to + ')';
    if (c.kind === 'tariff') return q(c.a) + ': закрыто по вашему тарифу «' + F.ME.tariff + '», нужен «' + c.need + '»';
    return q(c.a) + ': мест нет, вы ' + c.pos + '-й в листе ожидания';
  }
  function confShort(c, it) {
    if (c.kind === 'overlap') { const o = c.a === it ? c.b : c.a; return 'пересекается с «' + cut(o.title, 30) + '»'; }
    if (c.kind === 'transit') return c.a === it ? 'до следующего пункта не успеть: нужно ' + c.t.walk + ' мин, есть ' + Math.max(c.t.gap, 0)
      : 'после прошлого пункта не успеть: нужно ' + c.t.walk + ' мин, есть ' + Math.max(c.t.gap, 0);
    if (c.kind === 'tariff') return 'закрыто по тарифу «' + F.ME.tariff + '»';
    return 'мест нет, вы ' + c.pos + '-й в листе ожидания';
  }
  Object.assign(PU, { conflicts, confOf, confText, confShort, KIND_RU, tariffClosed, active });

  /* конфликты альтернативы и свободного предложения с текущим путём (для «Три возможности» и B6) */
  function altConflicts(a, exceptId, firm) {
    const out = [], aS = abs(a.day, a.time), aE = aS + a.dur;
    const list = dayItems(a.day).filter(active).filter(it => it.id !== exceptId && !(a.type === it.type && a.ref === it.ref) && (!firm || isFirm(it)));
    const ov = list.filter(it => startAbs(it) < aE && aS < endAbs(it));
    ov.forEach(it => out.push({ kind: 'overlap', with: it, text: 'пересекается с «' + cut(it.title, 32) + '» в ' + it.time }));
    if (!ov.length) {
      const prev = list.filter(it => endAbs(it) <= aS).sort((x, y) => endAbs(y) - endAbs(x))[0];
      const next = list.filter(it => startAbs(it) >= aE).sort((x, y) => startAbs(x) - startAbs(y))[0];
      const tp = prev && transit(prev, { hall: a.hall, day: a.day, time: a.time });
      const tn = next && transit({ hall: a.hall, day: a.day, time: a.time, dur: a.dur }, next);
      if (tp && tp.tight) out.push({ kind: 'transit', with: prev, text: 'после «' + cut(prev.title, 28) + '» нужно ' + tp.walk + ' мин на переход, есть ' + Math.max(tp.gap, 0) });
      else if (tn && tn.tight) out.push({ kind: 'transit', with: next, text: 'до «' + cut(next.title, 28) + '» нужно ' + tn.walk + ' мин на переход, есть ' + Math.max(tn.gap, 0) });
    }
    if (a.conflict && (a.conflict.kind === 'seats' || a.conflict.kind === 'tariff')) out.push({ kind: a.conflict.kind, text: a.conflict.text });
    return out;
  }
  PU.altConflicts = altConflicts;

  /* ---------- кнопка «+ Путь» / состояние ---------- */
  function specOf(x) { return { type: x.type, ref: x.ref, day: x.day, time: x.time, dur: x.dur, hall: x.hall, place: x.place, title: x.title, paid: !!x.paid }; }
  function plusBtn(sp, found, cls) {
    const s = found ? stat(found) : null;
    if (found && s !== 'suggested') {
      return '<span class="pth-in">' + icon('check') + (s === 'booked' ? 'Записано' : s === 'done' ? 'Состоялось' : 'В пути') + '</span>';
    }
    const a = ' data-type="' + sp.type + '" data-ref="' + esc(sp.ref) + '" data-day="' + sp.day + '" data-time="' + sp.time + '"' +
      (sp.dur ? ' data-dur="' + sp.dur + '"' : '') + (sp.hall ? ' data-hall="' + sp.hall + '"' : '') +
      (sp.place ? ' data-place="' + esc(sp.place) + '"' : '') + (sp.title ? ' data-title="' + esc(sp.title) + '"' : '') +
      (sp.paid || ((sp.type === 'stand' || sp.type === 'kipatalk') && isPaid(sp.ref)) ? ' data-paid="1"' : '');
    return '<button class="btn btn-secondary btn-sm pth-plus' + (cls ? ' ' + cls : '') + '" data-act="pth-add"' + a + '>+ Путь</button>';
  }
  PU.plusBtn = plusBtn; PU.specOf = specOf;

  /* добавление в путь по описанию; метка платного размещения копируется из источника или берётся по пакету экспонента */
  function addSpec(sp, o) {
    const it = F.pathAdd(sp.type, sp.ref, Object.assign({ day: sp.day, time: sp.time, dur: sp.dur, hall: sp.hall, place: sp.place, title: sp.title }, o || {}));
    if (it && !it.paid && (sp.paid || ((sp.type === 'stand' || sp.type === 'kipatalk') && isPaid(sp.ref)))) it.paid = true;
    return it;
  }
  PU.addSpec = addSpec;

  D.action('pth-add', el => {
    const d = el.dataset, o = {};
    ['day', 'time', 'title', 'place', 'hall'].forEach(k => { if (d[k]) o[k] = d[k]; });
    if (d.dur) o.dur = +d.dur;
    const it = F.pathAdd(d.type, d.ref, o);
    if (!it) { D.toast('Не удалось добавить: нужно выбрать время'); return; }
    if (!it.paid && (d.paid || ((it.type === 'stand' || it.type === 'kipatalk') && isPaid(it.ref)))) it.paid = true;
    logEv('added', 'Добавлено: ' + it.title);
    const clash = confOf(it).length;
    D.rerender();
    PU.say(clash ? 'Добавлено. Есть конфликт: см. «Конфликты»' : 'Добавлено в «Мой путь»', clash ? 3200 : 2200);
  });

  /* ---------- лист подтверждения ---------- */
  function sheet(title, body, act, arg, label) {
    D.openSheet('<div class="sheet-title">' + esc(title) + '</div>' + body +
      '<button class="btn btn-primary btn-block" data-act="' + act + '" data-arg="' + esc(arg == null ? '' : arg) + '">' + esc(label) + '</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>');
  }
  const ul = arr => '<ul class="pth-sheet-list">' + arr.map(t => '<li>' + t + '</li>').join('') + '</ul>';
  Object.assign(PU, { sheet, ul });

  /* ---------- разметка пункта пути (B4, B6) ---------- */
  function footStatus(it) {
    const s = stat(it);
    const ic = (s === 'booked' || s === 'done') ? icon('check') : '';
    return '<span class="pth-st s-' + s + '">' + ic + STATUS[s] + '</span>';
  }
  const softTag = (c, it) => confTag({ kind: c.kind, with: c.a === it ? c.b : c.a });
  function itemHTML(it, o) {
    o = o || {};
    const s = stat(it), all = o.noConf ? [] : confOf(it);
    const conf = all.filter(c => isFirm(c.a) && (!c.b || isFirm(c.b)));      /* считаются: принятые, записанные и ваши пункты */
    const soft = all.filter(c => conf.indexOf(c) < 0);                       /* пересечение с предложением ИИ: меткой, в счёт не входит */
    const rs = (it.reason && it.reason.kind === 'onsite' && !it.paid) ? '' : reasonText(it);
    const added = F.PATH_ADDED.indexOf(it.id) >= 0;
    let act = '';
    if (o.actHTML != null) act = o.actHTML;
    else if (!o.noAct) {
      if (s === 'suggested') act = plusBtn(specOf(it), it);
      else if (added) act = '<button class="btn btn-ghost btn-sm pth-rm" data-act="path-remove" data-id="' + it.id + '">Убрать</button>';
    }
    const when = (o.dayLabel ? it.day + ' · ' : '') + it.time + (it.type === 'task' ? '' : '–' + endLabel(it));
    return '<div class="pth-it pth-g-' + GRP[it.type] + ' s-' + s + (conf.length ? ' conf' : '') + (o.sel ? ' sel' : '') + '" data-it="' + it.id + '">' +
      '<div class="pth-it-top">' +
      '<button class="pth-it-main" data-go="' + linkOf(it) + '">' +
      '<span class="pth-time">' + when + '</span>' +
      '<span class="pth-it-k"><span class="pth-kind">' + esc(kindOf(it)) + '</span>' + srcTag(it) + paidTag(it) + (PS.fresh[it.id] ? tag(PS.fresh[it.id], 'accent') : '') +
      (it.pin ? tag('закреплено', 'accent') : '') + (soft.length && !conf.length ? softTag(soft[0], it) : '') + '</span>' +
      '<span class="pth-it-t">' + esc(fixTitle(it.title)) + '</span>' +
      '<span class="pth-it-s">' + icon('pin') + '<span>' + esc(it.place || '') + '</span></span>' +
      (rs ? '<span class="pth-it-why">' + esc(rs) + '</span>' : '') +
      '</button>' +
      (o.noMore || (it.type !== 'task' && PS.phase === 'event' && endAbs(it) <= NOW_ABS) ? '' : '<button class="pth-more" data-go="B6/' + it.id + '" aria-label="Заменить или убрать пункт">' + icon('more') + '</button>') +
      '</div>' +
      (conf.length ? '<button class="pth-confl" data-go="B7/' + it.id + '">' + icon('alert') +
        '<span>' + esc(confShort(conf[0], it)) + (conf.length > 1 ? ' · ещё ' + (conf.length - 1) + ' ' + plural(conf.length - 1, ['конфликт', 'конфликта', 'конфликтов']) : '') + '</span><b>Решить</b></button>' : '') +
      '<div class="pth-it-foot">' + footStatus(it) + (act ? '<span class="pth-it-act">' + act + '</span>' : '') + '</div>' +
      '</div>';
  }
  PU.itemHTML = itemHTML;

  /* карточка предложения (альтернатива, человек, решение) для блоков B1 и B6 */
  const confTag = c => '<span class="pth-conf-tag">' + icon('alert') + (c.kind === 'overlap' ? 'пересекается с «' + esc(cut(c.with.title, 20)) + '»' :
    c.kind === 'transit' ? 'мало времени на переход' : c.kind === 'seats' ? 'мест нет' : 'закрыто по тарифу') + '</span>';
  function altHTML(a, o) {
    o = o || {};
    const found = a.type === 'person' || a.type === 'buyer' ? findPerson(a.ref) : findAny(a.type, a.ref);
    const conf = altConflicts(a, o.except, o.compact);
    const rs = reasonText(a);
    return '<div class="pth-card pth-g-' + GRP[a.type] + (conf.length ? ' conf' : '') + '">' +
      '<button class="pth-it-main" data-go="' + linkOf(a) + '">' +
      '<span class="pth-it-k"><span class="pth-kind">' + esc(kindOf(a)) + '</span>' + paidTag(a) + (o.compact && conf.length ? confTag(conf[0]) : '') + '</span>' +
      '<span class="pth-it-t">' + esc(fixTitle(a.title)) + '</span>' +
      '<span class="pth-it-s">' + icon('clock') + '<span>' + (o.dayLabel || a.day !== F.PATH_NOW.day ? esc(a.day) + ' · ' : '') + esc(a.time) + '–' + endLabel(a) + ' · ' + esc(a.place) + '</span></span>' +
      (rs ? '<span class="pth-it-why">' + esc(rs) + '</span>' : '') + '</button>' +
      (conf.length && !o.compact ? '<div class="pth-confl-s">' + icon('alert') + '<span>' + esc(conf[0].text) + (conf.length > 1 ? ' · ещё ' + (conf.length - 1) + ' ' + plural(conf.length - 1, ['конфликт', 'конфликта', 'конфликтов']) : '') + '</span></div>' : '') +
      '<div class="pth-it-foot">' + (o.foot || '') + '<span class="pth-it-act">' + (o.actHTML != null ? o.actHTML : plusBtn(specOf(a), found)) + '</span></div>' +
      '</div>';
  }
  PU.altHTML = altHTML;

  /* ---------- версии пути ---------- */
  function applyVersion(vid) {
    const v = F.pathVersion(vid); if (!v) return;
    Object.keys(PS.vhide).forEach(id => {
      const it = F.pathItem(id);
      if (it && it.vh) { it.status = PS.vhide[id]; delete it.vh; }
    });
    PS.vhide = {};
    hiddenBy(vid).forEach(it => { PS.vhide[it.id] = it.status; it.status = 'skipped'; it.vh = vid; });
    PS.version = vid;
  }
  /* пункты, которые версия скрывает: предложенные системой или организатором, будущие, не закреплённые, не из состава версии */
  function hiddenBy(vid) {
    const v = F.pathVersion(vid);
    return F.PATH_ITEMS.filter(it => {
      if (it.type === 'task' || it.source === 'self' || it.source === 'feed') return false;
      const base = it.vh ? PS.vhide[it.id] : it.status;
      if (base !== 'suggested' || it.pin || endAbs(it) <= NOW_ABS) return false;
      return v.items.indexOf(it.id) < 0;
    });
  }
  function versionDiff(vid) {
    const now = {}; Object.keys(PS.vhide).forEach(id => { now[id] = 1; });
    const nxt = {}; hiddenBy(vid).forEach(it => { nxt[it.id] = it; });
    const add = Object.keys(now).filter(id => !nxt[id]).map(id => F.pathItem(id));
    const del = Object.keys(nxt).filter(id => !now[id]).map(id => nxt[id]);
    return { add, del };
  }
  PU.applyVersion = applyVersion; PU.versionDiff = versionDiff; PU.hiddenBy = hiddenBy;
  applyVersion(PS.version);   /* состояние по умолчанию: версия «Сбалансированный» применена */

  /* ================= B1 «Мой путь» ================= */

  /* строка ИИ: поле, микрофон (макет, D-49), три быстрых запроса, ссылка «История» (FR-PATH-14) */
  const VOICE = ['Запиши меня к ментору', 'Покажи решения для склада', 'Кто из участников занимается логистикой'];
  function aiLineHTML() {
    return '<div class="pth-ai">' +
      '<div class="pth-ai-row">' +
      '<label class="pth-ai-field">' + icon('spark') +
      '<input id="pth-q" type="text" placeholder="Где мне быть в 14:00?" autocomplete="off" aria-label="Запрос к ассистенту"></label>' +
      '<button class="pth-mic" data-act="pth-voice" aria-pressed="false" aria-label="Голосовой ввод">' + icon('mic') + '</button>' +
      '<button class="pth-send" data-act="pth-ai-send" aria-label="Отправить запрос">' + icon('send') + '</button>' +
      '</div>' +
      '<div class="pth-ai-quick">' +
      [['Что рядом через час?', 'Программа'], ['Подбери решения по моему запросу', 'Маркетплейс'], ['С кем мне познакомиться по моим целям?', 'Участники']].map(q =>
        '<button class="chip" data-act="pth-ai-ask" data-q="' + esc(q[0]) + '">' + q[1] + '</button>').join('') +
      '</div>' +
      '<div class="pth-ai-cap"><span id="pth-ai-note">ИИ только предлагает, действие совершается кнопкой</span>' +
      '<button class="pth-link" data-act="pth-ai-hist">История</button></div>' +
      '</div>';
  }
  D.action('pth-ai-send', () => {
    const t = (PS.q || '').trim();
    if (!t) { D.toast('Напишите запрос или выберите тему'); return; }
    PS.aiPending = t; PS.q = '';
    location.hash = '#/N1';
  });
  /* быстрый вопрос: готовая формулировка уходит в N1 и сразу получает ответ */
  D.action('pth-ai-ask', el => {
    PS.aiPending = el.dataset.q; PS.q = '';
    location.hash = '#/N1';
  });
  D.action('pth-ai-hist', () => {
    const n = D.st('N1');
    n.tab = 'hist';
    location.hash = '#/N1';
  });
  D.action('pth-ai-quick', el => {
    const n = D.st('N1');
    n.block = el.dataset.arg; n.tab = 'dialog';
    location.hash = '#/N1';
  });
  D.action('pth-voice', el => {
    const note = document.getElementById('pth-ai-note'), inp = document.getElementById('pth-q');
    if (!inp || el.classList.contains('on')) return;
    el.classList.add('on'); el.setAttribute('aria-pressed', 'true');
    if (note) note.textContent = 'Слушаю… говорите';
    setTimeout(() => {
      const i2 = document.getElementById('pth-q'), b2 = document.querySelector('.pth-mic');
      if (!i2) return;
      PS.vi = ((PS.vi || 0) + 1) % VOICE.length;
      i2.value = VOICE[PS.vi]; PS.q = i2.value;
      if (b2) { b2.classList.remove('on'); b2.setAttribute('aria-pressed', 'false'); }
      const n2 = document.getElementById('pth-ai-note');
      if (n2) n2.textContent = 'Распознавание речи уточняется: проверьте текст и отправьте';
    }, 1400);
  });

  /* «Сейчас»: ближайший пункт, где он, сколько идти, кнопка «Маршрут» (только в дни события) */
  function upcoming(day) {
    return dayItems(day).filter(it => active(it) && endAbs(it) > NOW_ABS).sort(byStart);
  }
  function nowHTML() {
    const day = F.PATH_NOW.day, ups = upcoming(day), it = ups[0], nxt = ups.slice(1, 3);
    const head = '<div class="pth-now-top"><span class="now-line">Сейчас ' + F.PATH_NOW.time + '</span>' +
      '<span class="cap">вы в зале «' + esc(F.PATH_NOW.place) + '»</span></div>';
    const links = '<div class="pth-now-links"><button class="pth-link" data-go="B4/' + dayKey(day) + '">Весь день</button>' +
      '<button class="pth-link" data-go="M3">Оценить сессии</button></div>';
    if (!it) {
      return '<div class="card pth-now">' + head + '<div class="pth-now-t">На сегодня всё</div>' +
        '<div class="cap">Ближайшие пункты есть на другие дни.</div>' +
        '<div class="pth-now-act"><button class="btn btn-secondary btn-sm" data-go="B4/d2802">Таймлайн на завтра</button></div>' + links + '</div>';
    }
    claim(it); nxt.forEach(claim);
    const ongoing = startAbs(it) <= NOW_ABS;
    const toStart = startAbs(it) - NOW_ABS;
    const when = ongoing ? 'идёт сейчас, до ' + endLabel(it)
      : 'через ' + toStart + ' ' + plural(toStart, ['минуту', 'минуты', 'минут']);
    const t = transit({ hall: F.PATH_NOW.hall, day: F.PATH_NOW.day, time: F.PATH_NOW.time, dur: 0 }, it);
    const walk = it.hall && !ongoing ? (t ? 'идти ' + t.walk + ' ' + plural(t.walk, ['минуту', 'минуты', 'минут']) + ' пешком, выйти за ' + t.lead + ' ' + plural(t.lead, ['минуту', 'минуты', 'минут']) + ' до начала'
      : 'вы уже в этом зале') : '';
    return '<div class="card accent-edge pth-now pth-g-' + GRP[it.type] + '">' + head +
      '<button class="pth-it-main" data-go="' + linkOf(it) + '">' +
      '<span class="pth-it-k"><span class="pth-kind">' + esc(kindOf(it)) + '</span>' + srcTag(it) + paidTag(it) + '</span>' +
      '<span class="pth-now-t">' + esc(fixTitle(it.title)) + '</span>' +
      '<span class="pth-it-s">' + icon('clock') + '<span>' + it.time + '–' + endLabel(it) + ' · ' + when + '</span></span>' +
      '<span class="pth-it-s">' + icon('pin') + '<span>' + esc(it.place) + '</span></span></button>' +
      (walk ? '<div class="pth-walk">' + icon('route') + '<span>' + walk + '</span></div>' : '') +
      '<div class="pth-now-act">' +
      (it.hall ? '<button class="btn btn-primary btn-sm" data-go="E4/' + it.hall + '">' + icon('route') + 'Маршрут</button>' : '') +
      '<button class="btn btn-ghost btn-sm" data-go="N8/' + it.id + '">Почему в пути</button></div>' +
      (nxt.length ? '<div class="pth-next"><div class="pth-next-h">Дальше по пути</div>' + nxt.map(n =>
        '<button class="pth-next-row pth-g-' + GRP[n.type] + ' s-' + stat(n) + '" data-go="' + linkOf(n) + '">' +
        '<span class="pth-mini-t">' + n.time + '</span><span class="pth-mark"></span>' +
        '<span class="pth-mini-b"><b>' + esc(fixTitle(n.title)) + '</b><small>' + esc(n.place) + ' · ' + STATUS[stat(n)] + '</small></span>' + icon('chevR') + '</button>').join('') + '</div>' : '') +
      links + '</div>';
  }

  /* отметка «план Штурмана» (N3): день получает метку после подтверждения в листе */
  function planHTML() {
    if (!PS.plan) return '';
    return '<button class="banner info pth-banner" data-go="N3">' + icon('route') + '<span class="grow"><b class="b-title">План дня: «' + esc(PS.plan.title) + '»</b>' +
      '<span class="cap">отметка Штурмана, записи и встречи делаются отдельно</span></span>' + icon('chevR') + '</button>';
  }
  PU.planHTML = planHTML;

  /* «Сегодня — N пунктов»: дела дня */
  function tasksHTML() {
    const list = dayItems(F.PATH_NOW.day).filter(it => it.type === 'task').sort(byStart);
    if (!list.length) return '';
    const left = list.filter(it => stat(it) !== 'done'), open = !!PS.tasksOpen;
    const first = left[0];
    return '<div class="card pth-tasks pth-tasks-acc' + (open ? ' open' : '') + '">' +
      '<button class="pth-tasks-head" data-act="pth-tasks-toggle" aria-expanded="' + open + '">' +
      '<span class="grow"><b class="pth-tasks-t">Сегодня — ' + list.length + ' ' + plural(list.length, ['пункт', 'пункта', 'пунктов']) + '</b>' +
      '<span class="cap">' + (left.length ? 'осталось ' + left.length + ': ' + esc(cut(first.title, 34)) : 'всё выполнено') + '</span></span>' +
      '<span class="pth-chev">' + icon('chevD') + '</span></button>' +
      (open ? list.map(it => {
        const done = stat(it) === 'done';
        return '<div class="pth-task' + (done ? ' done' : '') + '">' +
          '<button class="pth-tick" data-act="pth-tick" data-id="' + it.id + '" role="checkbox" aria-checked="' + done +
          '" aria-label="' + (done ? 'Снять отметку' : 'Отметить выполненным') + '">' + icon('check') + '</button>' +
          '<button class="pth-task-main" data-go="' + taskLink(it) + '"><span class="pth-task-t">' + esc(fixTitle(it.title)) + '</span>' +
          '<span class="cap">' + it.time + ' · ' + esc(it.place) + '</span></button>' + icon('chevR') + '</div>';
      }).join('') : '') + '</div>';
  }
  D.action('pth-tasks-toggle', () => { PS.tasksOpen = !PS.tasksOpen; D.rerender(); });
  D.action('pth-tick', el => {
    const it = F.pathItem(el.dataset.id); if (!it) return;
    it.status = it.status === 'done' ? 'suggested' : 'done';
    logEv(it.status === 'done' ? 'done' : 'undone', (it.status === 'done' ? 'Выполнено: ' : 'Снята отметка: ') + it.title);
    PU.say(it.status === 'done' ? 'Дело отмечено выполненным' : 'Отметка снята');
    D.rerender();
  });

  /* компактный таймлайн (3 пункта) и ссылка «Весь день» */
  function confBannerHTML(day) {
    const cf = conflicts(day).length;
    return cf ? '<button class="banner warn pth-banner pth-banner-s" data-go="B7/' + dayKey(day) + '">' + icon('alert') +
      '<span class="grow"><b class="b-title">Конфликтов в пути: ' + cf + '</b><span class="cap">принятые и ваши пункты. Решить</span></span>' + icon('chevR') + '</button>' : '';
  }
  function miniHTML(day, list, title) {
    return '<div class="sec-title">' + title + '<button class="more" data-go="B4/' + dayKey(day) + '">Весь день</button></div>' +
      (list.length ? '<div class="card pth-mini-list">' + list.map(it =>
        '<button class="pth-mini pth-g-' + GRP[it.type] + ' s-' + stat(it) + '" data-go="' + linkOf(it) + '">' +
        '<span class="pth-mini-t">' + it.time + '</span><span class="pth-mark"></span>' +
        '<span class="pth-mini-b"><b>' + esc(fixTitle(it.title)) + '</b><small>' + esc(it.place) + ' · ' + STATUS[stat(it)] + '</small></span>' +
        icon('chevR') + '</button>').join('') + '</div>'
        : '<div class="card pth-empty"><div class="cap">На этот день в пути пока ничего нет. Добавьте пункты из программы или выберите версию пути.</div>' +
        '<div class="pth-now-act"><button class="btn btn-secondary btn-sm" data-go="C1">Вся программа</button>' +
        '<button class="btn btn-ghost btn-sm" data-go="B5">Версии пути</button></div></div>') + confBannerHTML(day);
  }

  /* ключ сущности для отказов и исключения повторов между блоками: как в FIX.pathDismiss */
  const PATH_FAM = { session: 1, practice: 1, leisure: 1, networking: 1 };
  const ekey = (type, ref) => (PATH_FAM[type] ? 'session' : type === 'buyer' ? 'person' : type) + ':' + ref;
  PU.ekey = ekey;
  let USED = {};                                  /* ключи, уже показанные в B1 выше по странице: в других блоках не повторяются */
  const claim = it => { USED[ekey(it.type, it.ref)] = 1; };

  /* люди и решения для блоков B1 и ответов N1: без отказов, с запасом из подбора */
  function peopleList(n, fresh) {
    return F.PATH_PEOPLE.filter(pp => F.person(pp.person) && !isDismissed('person', pp.person) &&
      !(fresh && (findPerson(pp.person) || USED[ekey('person', pp.person)]))).slice(0, n == null ? 3 : n);
  }
  const STAND_SLOTS = ['12:35', '12:55', '13:15'];
  function solutionsList(n, fresh) {
    const out = [], seen = {}, max = n == null ? 3 : n;
    const ok = ex => F.exhibitor(ex) && !isDismissed('stand', ex) && !seen[ex] && out.length < max &&
      !(fresh && (findAny('stand', ex) || USED[ekey('stand', ex)]));
    F.PATH_SOLUTIONS.forEach(s => {
      if (ok(s.ex)) { seen[s.ex] = 1; out.push({ ex: s.ex, reason: s.reason, itemId: s.itemId, altId: s.altId }); }
    });
    F.PATH_PICKER.picks.forEach(p => {
      if (ok(p.ex)) { seen[p.ex] = 1; out.push({ ex: p.ex, reason: p.reason, fill: out.length }); }
    });
    return out;
  }
  PU.peopleList = peopleList; PU.solutionsList = solutionsList;
  const B1_PEOPLE = 2, B1_SOL = 2;
  const reservedKeys = () => {
    const r = Object.assign({}, USED);
    peopleList(B1_PEOPLE, true).forEach(pp => { r[ekey('person', pp.person)] = 1; });
    solutionsList(B1_SOL, true).forEach(x => { r[ekey('stand', x.ex)] = 1; });
    return r;
  };

  /* «Три возможности на сейчас» с кнопкой «Обновить»: круговой набор из FIX.PATH_ALTS в порядке времени */
  const nowLoc = () => ({ hall: F.PATH_NOW.hall, day: F.PATH_NOW.day, time: F.PATH_NOW.time, dur: 0 });
  function reachable(a) {
    if (!a.hall) return true;
    const t = transit(nowLoc(), { hall: a.hall, day: a.day, time: a.time });
    return !(t && t.tight);
  }
  function altPool() {
    const res = reservedKeys();
    return F.PATH_ALTS.filter(a => a.day === F.PATH_NOW.day && abs(a.day, a.time) >= NOW_ABS && !isDismissed(a.type, a.ref) && !res[ekey(a.type, a.ref)] &&
      reachable(a) && !(a.conflict && (a.conflict.kind === 'seats' || a.conflict.kind === 'tariff')) && !inPathAny(a))
      .map(a => ({ a, c: altConflicts(a, null, true).length }))
      .sort((x, y) => (x.c ? 1 : 0) - (y.c ? 1 : 0) || abs(x.a.day, x.a.time) - abs(y.a.day, y.a.time) || (x.a.id < y.a.id ? -1 : 1))
      .map(x => x.a);
  }
  const inPathAny = a => (a.type === 'person' || a.type === 'buyer') ? findPerson(a.ref) : findAny(a.type, a.ref);
  PU.inPathAny = inPathAny;
  function nextAlts() {
    const pool = altPool(); if (!pool.length) return [];
    const order = [];
    for (let k = 0; k < pool.length; k++) order.push(pool[(PS.altOff + k) % pool.length]);
    /* три карточки не должны мешать друг другу по времени, пока есть другие варианты (V-03) */
    const cand = order.filter(a => !inPathAny(a)), take = [];
    const clash = (a, b) => abs(a.day, a.time) < abs(b.day, b.time) + b.dur && abs(b.day, b.time) < abs(a.day, a.time) + a.dur;
    cand.forEach(a => { if (take.length < 3 && !take.some(b => clash(a, b))) take.push(a); });
    cand.forEach(a => { if (take.length < 3 && take.indexOf(a) < 0) take.push(a); });
    const last = take.length ? Math.max.apply(null, take.map(a => order.indexOf(a))) : 0;
    PS.altOff = (PS.altOff + last + 1) % pool.length;
    return take.map(a => a.id);
  }
  function altsHTML() {
    if (!PS.altShown) PS.altShown = nextAlts();
    const res = reservedKeys();
    const list = PS.altShown.map(id => F.pathAlt(id)).filter(a => a && !isDismissed(a.type, a.ref) && !res[ekey(a.type, a.ref)] && !inPathAny(a));
    return '<div class="sec-title">Возможности на сейчас<button class="more pth-refresh" data-act="pth-alts-refresh">' +
      icon('refresh') + 'Обновить</button></div>' +
      '<div class="pth-tagrow"><span class="cap">Три возможности, сначала без пересечений</span></div>' +
      (list.length ? list.map(a => altHTML(a, { compact: true })).join('') :
        '<div class="card pth-empty"><div class="cap">Все возможности на сейчас уже в пути или убраны. Нажмите «Обновить» позже: набор меняется вместе с расписанием.</div></div>');
  }
  D.action('pth-alts-refresh', () => {
    PS.altShown = nextAlts();
    D.rerender();
    PU.say(PS.altShown.length ? 'Набор обновлён' : 'Новых возможностей пока нет');
  });

  /* окно для «+ Путь» у человека: из пункта пути, из данных подбора или по умолчанию */
  function personSlot(pp, p) {
    const item = pp.itemId ? F.pathItem(pp.itemId) : null;
    return (pp.slot && Object.assign({ type: 'person', ref: pp.person, title: 'Знакомство: ' + p.name }, pp.slot)) ||
      (item ? specOf(item) : { type: 'person', ref: p.id, day: '27.02', time: '14:00', dur: 15, place: 'Нетворкинг-зона', title: 'Знакомство: ' + p.name });
  }
  PU.personSlot = personSlot;

  /* карточка человека для знакомства: B1 и N6 одинаковые (V-21); в N6 справа вверху «Скрыть» */
  function personCardHTML(pp, o) {
    o = o || {};
    const p = F.person(pp.person);
    const found = findPerson(pp.person);
    const slot = personSlot(pp, p);
    return '<div class="pth-card pth-g-meet">' +
      '<div class="pth-person"><button class="pth-it-main pth-person-main" data-go="F2/' + p.id + '">' + avatar(p.name, 'sm') +
      '<span class="pth-pt"><span class="pth-it-t">' + esc(p.name) + '</span>' +
      '<span class="pth-it-s"><span>' + esc(p.company) + ' · ' + esc(p.role) + '</span></span>' +
      '<span class="pth-it-why">' + esc(whyLine(pp.reason.text)) + '</span></span></button>' +
      (o.hide ? '<button class="btn btn-ghost btn-sm pth-hide" data-act="n6-hide" data-arg="' + p.id + '" aria-label="Скрыть: ' + esc(p.name) + '">Скрыть</button>' : '') + '</div>' +
      '<div class="pth-it-foot"><button class="btn btn-ghost btn-sm" data-go="F11/' + p.id + '">Предложить встречу</button>' +
      '<span class="pth-it-act">' + plusBtn(slot, found) + '</span></div></div>';
  }
  PU.personCardHTML = personCardHTML;

  /* «Люди для знакомства»: причина, «+ Путь», «Предложить встречу» (F11) */
  function peopleHTML() {
    const list = peopleList(B1_PEOPLE, true);
    return '<div class="sec-title">Люди для знакомства<button class="more" data-go="N6">Все</button></div>' +
      (list.length ? list.map(pp => personCardHTML(pp)).join('') : '<div class="card pth-empty"><div class="cap">Подборка пуста: люди скрыты. Вернуть их можно кнопкой «Сбросить отказы» в настройках уведомлений.</div>' +
        '<div class="pth-now-act"><button class="btn btn-secondary btn-sm" data-go="B3">Настройки</button></div></div>');
  }

  /* «Решения для вашего запроса» (3), «на площадке» у платных */
  function solutionsHTML() {
    const list = solutionsList(B1_SOL, true);
    return '<div class="sec-title">Решения для вашего запроса<button class="more" data-go="N5">Все</button></div>' +
      '<div class="pth-tagrow"><span class="cap">Решения для роста бизнеса · ваш запрос: ' + esc(F.ME.requestTask || 'Масштабирование') + '</span></div>' +
      (list.length ? list.map(s => {
        const ex = F.exhibitor(s.ex);
        const item = s.itemId ? F.pathItem(s.itemId) : null;
        const alt = s.altId ? F.pathAlt(s.altId) : null;
        const found = findAny('stand', s.ex);
        const base = found || item || alt || { type: 'stand', ref: s.ex, day: '28.02', time: STAND_SLOTS[s.fill || 0] || '13:15', dur: 15, hall: 'congress', place: 'Экспо · ' + ex.stand, title: 'Стенд: ' + ex.name };
        const sp = specOf(base);
        sp.paid = isPaid(s.ex);
        return '<div class="pth-card pth-g-expo">' +
          '<button class="pth-it-main" data-go="H2/' + ex.id + '">' +
          '<span class="pth-it-k"><span class="pth-kind">Стенд · ' + esc(ex.stand) + '</span>' + (sp.paid ? tag('на площадке', 'fill') : '') + '</span>' +
          '<span class="pth-it-t">' + esc(ex.name) + '</span>' +
          '<span class="pth-it-s"><span>' + esc(ex.what) + '</span></span>' +
          '<span class="pth-it-why">' + esc(whyLine(s.reason.text)) + '</span></button>' +
          '<div class="pth-it-foot"><button class="btn btn-ghost btn-sm" data-go="G3/' + ex.id + '">Предложить встречу</button>' +
          '<span class="pth-it-act">' + plusBtn(sp, found) + '</span></div></div>';
      }).join('') : '<div class="card pth-empty"><div class="cap">Решения скрыты. Вернуть их можно кнопкой «Сбросить отказы» в настройках уведомлений.</div>' +
        '<div class="pth-now-act"><button class="btn btn-secondary btn-sm" data-go="B3">Настройки</button></div></div>');
  }

  function footBtnsHTML() {
    return '<button class="pth-link pth-why-link" data-go="N8">Почему это в вашем пути</button>';
  }
  /* переключатель даты «Мой путь» только для показа: вынесен из B1 в настройки уведомлений (B3) */
  function phaseSwitchHTML(ph) {
    return D.segbar([['B1/pre', 'До события'], ['B1', '27.02'], ['B1/after', 'После']], ph === 'pre' ? 'B1/pre' : ph === 'after' ? 'B1/after' : 'B1');
  }
  /* строка версии и пересборки: сразу под строкой ИИ (V-02) */
  function verRowHTML() {
    const v = F.pathVersion(PS.version);
    return '<div class="card pth-verrow"><div class="pth-ver-t"><span class="cap">Версия пути</span><b>«' + esc(v.name) + '»</b></div>' +
      '<div class="pth-ver-act"><button class="btn btn-secondary btn-sm" data-go="B5">' + icon('layers') + 'Версии</button>' +
      '<button class="btn btn-primary btn-sm" data-act="pth-rebuild-ask">' + icon('refresh') + 'Пересобрать</button></div></div>';
  }

  /* фаза «до события»: заполненность профиля по полям (PS.fill, FR-PROF-13 — то же число, что в L0/L7/A12) и «Усилить путь» */
  function preHTML() {
    const fl = (F.PS && F.PS.fill) ? F.PS.fill() : { pct: 0, req: 0, reqTotal: 8, opt: 0, optTotal: 7 };
    return '<div class="card pth-profile"><div class="pth-prof-top"><div><div class="card-title">Профиль заполнен на ' + fl.pct + '%</div>' +
      '<div class="cap">обязательных полей: ' + fl.req + ' из ' + fl.reqTotal + ' · дополнительных: ' + fl.opt + ' из ' + fl.optTotal +
      '. Чем полнее профиль, тем точнее путь</div></div></div>' +
      '<div class="progress"><i style="width:' + fl.pct + '%"></i></div>' +
      '<div class="pth-now-act"><button class="btn btn-primary btn-sm" data-go="A12">' + icon('spark') + 'Усилить путь</button>' +
      '<button class="btn btn-ghost btn-sm" data-go="L8">Цели и запросы</button></div></div>';
  }
  /* фаза «после события»: итоги, дорожная карта, контакты */
  function afterHTML() {
    const n = (F.POST_CONTACTS || []).length;
    const days = DAYS.map(d => {
      const its = F.pathItems(d).filter(it => it.type !== 'task' && it.status !== 'replaced' && !it.vh);
      const done = its.filter(it => stat(it) === 'done').length;
      return '<button class="row clickable" data-go="B4/' + dayKey(d) + '"><div class="grow"><div class="r-title">' + dayLong(d) + '</div>' +
        '<div class="r-sub">в пути ' + its.length + ' · с отметкой «состоялось» ' + done + '</div></div>' + icon('chevR') + '</button>';
    }).join('');
    const card = (go, ic, t, s) => '<button class="card interactive pth-after-card" data-go="' + go + '">' + icon(ic) +
      '<span class="grow"><b class="card-title">' + t + '</b><span class="cap">' + s + '</span></span>' + icon('chevR') + '</button>';
    return card('M4', 'chart', 'Мои итоги', 'встречи, стенды, заметки, договорённости и оценки; файл PDF «Мои итоги фестиваля»') +
      card('M5', 'route', 'Дорожная карта на полгода', 'этапы по вашим запросам и контактам, напоминания, следующий фестиваль') +
      card('M6', 'userPlus', 'Контакты после события', (n ? n + ' ' + plural(n, ['контакт', 'контакта', 'контактов']) + ' с напоминанием «написать через неделю»' : 'напоминание «написать через неделю» и черновик письма')) +
      '<div class="sec-title">Как прошли дни</div><div class="card" style="padding:2px 16px"><div class="list">' + days + '</div></div>' +
      '<div class="cap pth-note">«Состоялось» ставится по отметке прихода или вручную. Итоги встреч, стендов и договорённостей собраны в «Моих итогах».</div>';
  }

  D.register('B1', {
    tab: 'B1',
    meta: {
      title: 'B1 · Мой путь',
      role: 'Участник, главный экран (корневая вкладка)',
      fr: ['FR-PATH-01', 'FR-PATH-03', 'FR-PATH-05', 'FR-PATH-06', 'FR-PATH-12', 'FR-PATH-14', 'FR-AI-04', 'FR-AI-05'],
      ac: ['AC-PATH-01', 'AC-PATH-03', 'AC-PATH-06', 'AC-PATH-12', 'AC-PATH-14', 'AC-AI-02'],
      what: [
        'Три фазы по параметру маршрута: событие (по умолчанию, 27.02 11:10), B1/pre (до события: «До фестиваля 12 дней», заполненность профиля, «Усилить путь», путь на 26.02), B1/after (итоги M4, дорожная карта M5, контакты M6).',
        'Блоки сверху вниз: приветствие; строка ИИ (поле, микрофон, три быстрых запроса, «История»); «Сейчас» (ближайший пункт, где, сколько идти, «Маршрут»); «Сегодня — N пунктов» (дела с отметкой); компактный таймлайн из трёх пунктов и «Весь день»; «Три возможности на сейчас» с кнопкой «Обновить» (круг по PATH_ALTS); «Люди для знакомства»; «Решения для вашего запроса»; «Мероприятия, столы и практики»; «Версии пути» и «Пересобрать».',
        'Каждая карточка: «+ Путь» или статус, причина мелким шрифтом, переход в карточку сущности; платные решения помечены «на площадке».',
        'Пересборка подтверждается листом, лимит пересборок в сутки виден в листе.'
      ],
      rules: [
        'Планировщик на правилах строит путь, ИИ только предлагает и объясняет; изменения совершает нажатие кнопки (D-49).',
        'Доля пунктов «на площадке» в версии не выше параметра (по умолчанию 30%, FR-PATH-06); пометка есть у каждого платного пункта.',
        'Блок «Сейчас» и «Сегодня» показываются только в дни события; вне события блоки заменяются фазами pre и after.',
        'Пункт «+ Путь» запись не создаёт: запись и заявка делаются отдельными действиями.',
        'Лимит пересборок в сутки в демо равен 3 (значение задаёт админ, заказчик не называл).'
      ],
      depends: ['D-36', 'D-45', 'D-46', 'D-49', 'D-52', 'D-57', 'матрица переездов', 'FIX.PATH_*']
    },
    html(ctx) {
      const ph = ctx.param === 'pre' ? 'pre' : ctx.param === 'after' ? 'after' : 'event';
      PS.phase = ph; PS.curHash = location.hash;
      if (F.pathSyncProgram) F.pathSyncProgram();
      const ME = F.ME, v = F.pathVersion(PS.version);
      let head, body;
      if (ph === 'pre') {
        const P = F.PATH_PHASES.pre, n = P.daysTo;
        head = D.head({ eyebrow: esc(P.dateLong), title: 'До фестиваля ' + n + ' ' + plural(n, ['день', 'дня', 'дней']),
          sub: 'Люди, стенды и встречи можно добавлять и назначать уже сейчас', paren: paren('путь на ' + P.focusDay + ' собран по версии «' + v.name + '»'), topo: 1 });
        const list = dayItems(P.focusDay).filter(it => it.type !== 'task').sort(byStart).slice(0, 3);
        USED = {}; list.forEach(claim);
        body = preHTML() + aiLineHTML() + verRowHTML() + miniHTML(P.focusDay, list, 'Путь на 26 февраля') +
          peopleHTML() + solutionsHTML() + footBtnsHTML();
      } else if (ph === 'after') {
        const A = F.PATH_PHASES.after;
        head = D.head({ eyebrow: esc(A.dateLong), title: 'Фестиваль позади', sub: 'Итоги, договорённости и контакты собраны в одном месте',
          paren: paren('доступ к приложению ещё ' + A.accessDays + ' ' + plural(A.accessDays, ['день', 'дня', 'дней'])), topo: 1 });
        body = aiLineHTML() + afterHTML();
      } else {
        const todayN = upcoming(F.PATH_NOW.day).length;
        head = D.head({ eyebrow: esc(F.NOW.dateLong) + ' · ' + F.NOW.time, title: 'Доброе утро, ' + esc(ME.first),
          sub: esc(ME.company) + ' · ' + tariffTag(ME.tariff) + ' ' + tag('Зима 2027', 'accent'),
          paren: paren('впереди ' + todayN + ' ' + plural(todayN, ['пункт', 'пункта', 'пунктов']) + ', версия «' + v.name + '»'), topo: 1 });
        USED = {};
        body = aiLineHTML() + verRowHTML() + nowHTML() + confBannerHTML(F.PATH_NOW.day) + planHTML() + tasksHTML() +
          peopleHTML() + solutionsHTML() + altsHTML() + footBtnsHTML();
      }
      return '<div class="scr">' + head + '<div class="pth-body">' + body + '<div class="pth-end"></div></div></div>';
    },
    mount(host) {
      const q = host.querySelector('#pth-q'); if (!q) return;
      q.value = PS.q || '';
      q.addEventListener('input', () => { PS.q = q.value; });
      q.addEventListener('keydown', e => {
        if (e.key !== 'Enter') return;
        e.preventDefault();
        const b = host.querySelector('.pth-send'); if (b) b.click();
      });
    }
  });

  /* ================= B3 «Настройки уведомлений» ================= */
  const CH = ['wp', 'tg', 'sms', 'em'];
  const CH_RU = ['Web Push', 'Telegram', 'SMS', 'E-mail'];
  const NAME_SHORT = { path: 'Мой путь', feed: 'Лента', chat: 'Чаты встреч' };
  const MAIN = { ann: 'Telegram', 'rem-s': 'Web Push', meet: 'Web Push', 'rem-m': 'Web Push', prog: 'Web Push', code: 'SMS', urgent: 'Web Push + Telegram' };
  function notifTypes() {
    const extra = (F.PATH_NOTIF_TYPES || []).map(t => ({ id: t.id, name: t.name, def: t.def, extra: true, main: t.main, hint: t.hint, sample: t.sample }));
    return F.NOTIF_TYPES.concat(extra);
  }

  D.register('B3', {
    tab: 'B1',
    meta: {
      title: 'B3 · Настройки уведомлений',
      role: 'Участник, кабинет и значок колокольчика',
      fr: ['FR-NTF-04', 'FR-NTF-05', 'FR-NTF-07'],
      ac: ['AC-NTF-04', 'AC-NTF-06'],
      what: [
        'Матрица «тип × канал»: Web Push, Telegram, SMS, e-mail; шесть прежних типов и срочное.',
        'Новые типы v3: «Мой путь» (перенос или отмена пункта, конфликт, итог пересборки, «выйти за N минут»), «Лента» (срочная новость и изменение программы, отклик на интро, приглашение в чат), «Чаты встреч» (сообщения, архивация, действия модератора).',
        'У новых типов показан пример уведомления; тихие часы 23:00–07:00; срочные не отключаются.',
        'Отключённый тип «Лента» не отключает срочную новость фестиваля: она придёт по резервному каналу.'
      ],
      rules: [
        'Основной и резервный канал видны в подписях типов; одно событие не дублируется по каналам, если push доставлен (дедупликация).',
        'Тихие часы 23:00–07:00 не действуют на срочные уведомления.',
        'На iOS Web Push работает только после установки на экран и разрешения.',
        'Новости и изменения фестиваля, а также записи партнёров скрыть настройкой нельзя (D-35).'
      ],
      depends: ['D-33', 'D-35', 'D-09', 'матрица каналов TZ_01, раздел 7']
    },
    html(ctx) {
      const st = ctx.state, types = notifTypes();
      st.val = st.val || {};
      const ntfOn = !!(F.PS && F.PS.consent && F.PS.consent('notify'));
      types.forEach(t => { if (!st.val[t.id]) st.val[t.id] = Object.assign({}, t.def); });
      const rows = types.map(t => {
        const chs = CH.map((k, i) => {
          const v = st.val[t.id][k];
          return t.urgent || !ntfOn
            ? '<span class="pth-ch fixed" title="' + (t.urgent ? 'срочное: всегда включено, отключить нельзя' : 'сначала включите уведомления') + '" aria-label="' + esc(CH_RU[i]) + ': ' + (t.urgent ? 'включено всегда' : 'недоступно без согласия') + '">' + esc(CH_RU[i]) + '</span>'
            : '<button class="pth-ch' + (v ? ' on' : '') + '" data-act="b3-toggle" data-arg="' + t.id + ':' + k + '" role="switch" aria-checked="' + !!v +
              '" aria-label="' + esc(NAME_SHORT[t.id] || t.name) + ' · ' + esc(CH_RU[i]) + '">' + esc(CH_RU[i]) + '</button>';
        }).join('');
        const main = t.extra ? t.main : MAIN[t.id];
        return '<div class="pth-nt"><div class="pth-nt-h"><b>' + esc(NAME_SHORT[t.id] || t.name) + '</b>' + (t.urgent ? '<span class="ntf-urgent pth-locked">' + icon('lock') + 'срочное, не отключается</span>' : '') +
          '<span class="cap">основной канал: ' + esc(main) + '</span></div><div class="pth-nt-ch" role="group" aria-label="Каналы">' + chs + '</div></div>';
      }).join('');
      const feedOff = !CH.some(k => st.val.feed[k]);
      const extra = types.filter(t => t.extra);
      return '<div class="scr">' +
        D.head({ backHist: true, eyebrow: 'Кабинет', title: 'Уведомления', sub: 'Каналы и типы · тихие часы ' + esc(F.QUIET_HOURS.from) + '–' + esc(F.QUIET_HOURS.to), paren: paren('срочные уведомления приходят всегда') }) +
        '<div class="pth-body pth-b3">' +
        (ntfOn ? '' : '<div class="banner warn">' + icon('bell') + '<div class="grow"><div class="b-title">Уведомления не включены</div>' +
          '<div class="cap">Без согласия пуши в демо не приходят: настройки типов и каналов сохранятся и применятся после включения.</div>' +
          '<div style="margin-top:8px"><button class="btn btn-primary btn-sm" data-act="b3-ntf-on">Включить уведомления</button></div></div></div>') +
        '<div class="card pth-nts">' + rows + '</div>' +
        (feedOff ? '<div class="banner warn">' + icon('alert') + '<div><div class="b-title">Тип «Лента» отключён</div>' +
          '<div class="cap">Срочные новости фестиваля всё равно придут по резервному каналу: Telegram или SMS.</div></div></div>' : '') +
        '<div class="sec-title">Что входит в новые типы</div>' +
        '<div class="card" style="padding:2px 16px"><div class="list">' + extra.map(t =>
          '<div class="row"><div class="grow"><div class="r-title">' + esc(NAME_SHORT[t.id]) + '</div>' +
          '<div class="r-sub">' + esc(t.name.replace(/^[^:]+:\s*/, '')) + '</div>' +
          '<div class="pth-sample">' + icon('bell') + '<span>' + esc(t.sample) + '</span></div>' +
          (t.hint ? '<div class="cap" style="margin-top:6px">' + esc(t.hint) + '</div>' : '') + '</div></div>').join('') + '</div></div>' +
        '<div class="sec-title">Скрытые и убранные</div>' +
        '<div class="card pth-dis"><div class="cap">' + (PU.dismissedCount() ? 'Скрыто и убрано: ' + PU.dismissedCount() + '. Эти люди, стенды и сессии не предлагаются в «Моём пути», подборках и ответах ассистента.' :
          'Отказов нет: «Убрать и больше не предлагать» и «Скрыть» собираются здесь.') + '</div>' +
        '<button class="btn btn-secondary btn-sm" data-act="pth-reset-ask"' + (PU.dismissedCount() ? '' : ' disabled') + '>Сбросить отказы</button></div>' +
        '<div class="banner">' + icon('clock') + '<div><div class="b-title">Тихие часы ' + esc(F.QUIET_HOURS.from) + '–' + esc(F.QUIET_HOURS.to) + '</div>' +
        '<div class="cap">В это время уведомления не приходят, кроме срочных по площадке.</div></div></div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Если Web Push недоступен (нет установки на экран), важные уведомления придут в Telegram и по SMS.</div></div>' +
        '<div class="sec-title">Только в демо</div>' +
        '<div class="card pth-phase"><div class="cap">Показать «Мой путь» на другую дату: до события, 27.02 или после</div>' + phaseSwitchHTML(PS.phase === 'pre' ? 'pre' : PS.phase === 'after' ? 'after' : 'event') + '</div>' +
        '<div class="pth-end"></div></div></div>';
    }
  });
  /* согласие на уведомления — то же, что в онбординге (A4) и «Приватности» (L6): PS.consents.notify */
  D.action('b3-ntf-on', () => {
    const c = (F.CONSENTS || []).filter(x => x.id === 'notify')[0] || { title: 'Уведомления', sub: '', ver: '' };
    PU.sheet('Включить уведомления?', PU.ul([
      '<b>' + esc(c.title) + '</b>' + (c.sub ? '<br><span class="cap">' + esc(c.sub) + '</span>' : ''),
      'Типы и каналы настраиваются ниже: «Мой путь», «Лента», «Чаты встреч», встречи и записи. Отозвать согласие можно в «Приватности» (L6).' +
      (c.ver ? '<br><span class="cap">' + esc(c.ver) + '</span>' : '')
    ]), 'b3-ntf-do', '', 'Разрешить');
  });
  D.action('b3-ntf-do', () => {
    D.closeSheet();
    if (F.PS && F.PS.grant) { F.PS.grant('notify', true); }
    const fc = (F.CONSENTS || []).filter(x => x.id === 'notify')[0];
    if (fc) { fc.given = '27.02.2027'; }
    D.rerender();
    D.toast('Уведомления включены');
  });
  D.action('b3-toggle', el => {
    const [tid, k] = el.dataset.arg.split(':');
    const st = D.st('B3');
    st.val[tid][k] = !st.val[tid][k];
    D.rerender();
  });

  /* ================= B4 «Таймлайн дня» ================= */
  const LEGEND = [['sess', 'Сессии и практики'], ['meet', 'Встречи'], ['expo', 'Стенды и КипяTALK'], ['leis', 'Нетворкинг и досуг'], ['task', 'Дела']];

  function transitHTML(prev, cur) {
    const t = transit(prev, cur);
    if (!t || t.gap < 0 || t.gap > 120) return '';
    if (t.tight) {
      return '<div class="pth-row tr"><span class="pth-mk"></span><button class="pth-tr tight" data-go="B7/' + cur.id + '">' + icon('alert') +
        '<span>На переход нужно ' + t.walk + ' ' + plural(t.walk, ['минута', 'минуты', 'минут']) + ', остаётся ' + Math.max(t.gap, 0) +
        ' (' + esc(t.from) + ' — ' + esc(t.to) + ')</span><b>Решить</b></button></div>';
    }
    return '<div class="pth-row tr"><span class="pth-mk"></span><div class="pth-tr">' + icon('route') +
      '<span>выйти за ' + t.lead + ' ' + plural(t.lead, ['минуту', 'минуты', 'минут']) + ' до начала · ' + esc(t.from) + ' — ' + esc(t.to) + ', ' +
      t.walk + ' ' + plural(t.walk, ['минута', 'минуты', 'минут']) + ' пешком</span></div></div>';
  }

  function dayEntries(day) {
    const items = dayItems(day), used = {}, out = [];
    groups().filter(g => g.day === day).forEach(g => {
      const live = liveOpts(g);
      if (live.length > 1) { live.forEach(x => { used[x.id] = 1; }); out.push({ k: 'group', g, live, start: tm(g.time), id: g.id }); }
    });
    items.forEach(it => { if (!used[it.id]) out.push({ k: it.type === 'task' ? 'task' : 'item', it, start: tm(it.time), id: it.id }); });
    if (day === F.PATH_NOW.day && PS.phase === 'event') out.push({ k: 'now', start: tm(F.PATH_NOW.time), id: '0now' });
    out.sort((a, b) => a.start - b.start || (a.k === 'now' ? -1 : b.k === 'now' ? 1 : a.id < b.id ? -1 : 1));
    return out;
  }

  function taskRow(it) {
    const done = stat(it) === 'done';
    return '<div class="pth-row task"><span class="pth-mk"></span><div class="pth-task' + (done ? ' done' : '') + '">' +
      '<button class="pth-tick" data-act="pth-tick" data-id="' + it.id + '" role="checkbox" aria-checked="' + done +
      '" aria-label="' + (done ? 'Снять отметку' : 'Отметить выполненным') + '">' + icon('check') + '</button>' +
      '<button class="pth-task-main" data-go="' + taskLink(it) + '"><span class="pth-task-t">' + esc(fixTitle(it.title)) + '</span>' +
      '<span class="cap">дело · ' + it.time + '</span></button></div></div>';
  }

  function groupBlock(e) {
    const g = e.g, ch = chosenOf(g), n = e.live.length;
    const endMax = Math.max.apply(null, e.live.map(x => tm(x.time) + x.dur));
    return '<div class="pth-row grp pth-g-' + GRP[ch.type] + '"><span class="pth-mk"></span><div class="pth-grp">' +
      '<div class="pth-grp-h"><b>Выберите: ' + n + ' ' + plural(n, ['вариант', 'варианта', 'вариантов']) + '</b>' +
      '<span class="cap">окно ' + g.time + '–' + fmt(endMax) + ' · избранное по программе, выбор за вами</span></div>' +
      e.live.map(it => {
        const on = it.id === ch.id;
        const btn = on ? '<span class="pth-in">' + icon('check') + 'Выбрано</span>'
          : '<button class="btn btn-secondary btn-sm" data-act="pth-gsel" data-g="' + g.id + '" data-id="' + it.id + '">Выбрать</button>';
        return itemHTML(it, { sel: on, actHTML: btn, noConf: !on });
      }).join('') + '</div></div>';
  }

  D.action('pth-gsel', el => {
    const it = F.pathItem(el.dataset.id); if (!it) return;
    PS.gchosen[el.dataset.g] = it.id;
    logEv('choose', 'Выбран вариант: ' + it.title);
    PU.say('Выбрано. Остальные в избранном', 3000);
    D.rerender();
  });

  function dayHTML(day) {
    const ent = dayEntries(day);
    if (!ent.length) {
      return '<div class="card pth-empty"><div class="e-title">День пока пуст</div>' +
        '<div class="cap">В пути на этот день ничего нет. Добавьте пункты из программы или соберите путь по версии.</div>' +
        '<div class="pth-now-act"><button class="btn btn-primary btn-sm" data-go="C1">Вся программа</button>' +
        '<button class="btn btn-ghost btn-sm" data-go="B5">Версии пути</button></div></div>';
    }
    let prev = null, html = '';
    ent.forEach(e => {
      if (e.k === 'now') {
        html += '<div class="pth-row now"><span class="pth-mk"></span><div class="pth-nowline"><span>Сейчас ' + F.PATH_NOW.time +
          '</span><span class="cap">вы в зале «' + esc(F.PATH_NOW.place) + '»</span></div></div>';
        prev = { hall: F.PATH_NOW.hall, day: F.PATH_NOW.day, time: F.PATH_NOW.time, dur: 0 };
        return;
      }
      if (e.k === 'task') { html += taskRow(e.it); return; }
      const cur = e.k === 'group' ? chosenOf(e.g) : e.it;
      const act = active(cur);
      if (prev && act) html += transitHTML(prev, cur);
      html += e.k === 'group' ? groupBlock(e)
        : '<div class="pth-row pth-g-' + GRP[e.it.type] + '"><span class="pth-mk"></span>' + itemHTML(e.it) + '</div>';
      if (act) prev = cur;
    });
    return '<div class="pth-tl">' + html + '</div>';
  }

  D.register('B4', {
    tab: 'B1',
    meta: {
      title: 'B4 · Таймлайн дня',
      role: 'Участник, раздел «Мой путь»',
      fr: ['FR-PATH-10', 'FR-PATH-11', 'FR-PATH-03', 'FR-PATH-09', 'FR-PATH-02'],
      ac: ['AC-PATH-10', 'AC-PATH-11', 'AC-PATH-03', 'AC-PATH-09'],
      what: [
        'Переключатель дней 25–28.02 (параметры d2502…d2802) и вертикальная шкала времени; цвет и форма метки зависят от типа пункта.',
        'Параллельные варианты одного окна собраны в группу «Выберите: N варианта» (избранное по программе): выбор одного, остальные остаются в избранном.',
        'Подписи переходов («выйти за 10 минут», время пешком по матрице переездов); конфликт отмечен красной пунктирной рамкой со ссылкой в B7.',
        'Метки «ИИ», «вы добавили», «из ленты», «организатор» и «на площадке»; пункты, добавленные кнопкой «+ Путь» (id pu01…), видны здесь и убираются кнопкой «Убрать».',
        'Тап по пункту открывает карточку сущности; кнопка «…» или долгое нажатие открывает «Заменить пункт» (B6).'
      ],
      rules: [
        'Пункт со статусом «заменено» и убранный будущий пункт в таймлайне не показываются; прошедший без отметки показывается как «пропущено».',
        'Подпись «выйти за N минут» считается как время пешком по матрице переездов плюс запас, округлённо до пяти минут.',
        'Платные пункты (экспоненты «Экспо+» и «Премиум») подписаны «на площадке».',
        'Таймлайн собирается из тех же пунктов, что B1; число пунктов совпадает с данными.'
      ],
      depends: ['D-36', 'D-49', 'D-52', 'D-57', 'матрица переездов']
    },
    html(ctx) {
      PU.syncPhase();
      const day = dayOfKey(ctx.param) || (PS.phase === 'pre' ? F.PATH_PHASES.pre.focusDay : F.PATH_NOW.day);
      const items = dayItems(day).filter(it => it.type !== 'task');
      const cf = conflicts(day).length, paid = items.filter(it => it.paid).length;
      const ahead = PS.phase === 'event' && abs(day, '23:59') > NOW_ABS ? items.filter(it => active(it) && endAbs(it) > NOW_ABS).length : null;
      const back = PS.phase === 'pre' ? 'B1/pre' : PS.phase === 'after' ? 'B1/after' : 'B1';
      const di = dayInfo(day), n = items.length;
      const isToday = PS.phase === 'event' && day === F.PATH_NOW.day;
      return '<div class="scr">' +
        D.head({ back, eyebrow: 'Мой путь', title: 'Таймлайн дня', sub: esc(dayLong(day)) + ' · в дне ' + n + ' ' + plural(n, ['пункт', 'пункта', 'пунктов']),
          paren: paren(di.title ? di.title.toLowerCase() + ', версия «' + F.pathVersion(PS.version).name + '»' : 'версия «' + F.pathVersion(PS.version).name + '»') }) +
        D.segbar(DAYS.map(d => ['B4/' + dayKey(d), d + ' ' + dayInfo(d).week]), 'B4/' + dayKey(day)) +
        '<div class="pth-body">' +
        '<div class="pth-sum">' + (ahead != null ? tag('впереди: ' + ahead) : '') +
        '<button class="tag accent pth-tagbtn" data-go="B5">версия «' + esc(F.pathVersion(PS.version).name) + '»</button>' +
        (paid ? tag('на площадке: ' + paid, 'fill') : '') +
        (PS.plan && day === F.PATH_NOW.day && PS.phase === 'event' ? '<button class="tag accent pth-tagbtn" data-go="N3">план Штурмана: ' + esc(PS.plan.title) + '</button>' : '') +
        (cf ? '<button class="tag warn pth-tagbtn" data-go="B7/' + dayKey(day) + '">' + icon('alert') + 'конфликтов: ' + cf + '</button>' : tag('конфликтов нет', 'ok')) + '</div>' +
        '<div class="pth-legend pth-legend-top">' + LEGEND.map(l => '<span class="pth-g-' + l[0] + '"><i class="pth-lg"></i>' + l[1] + '</span>').join('') + '</div>' +
        dayHTML(day) +
        '<div class="pth-foot-btns">' +
        '<button class="btn btn-secondary" data-go="B7">' + icon('alert') + 'Конфликты</button>' +
        '<button class="btn btn-secondary" data-go="B8">' + icon('calendar') + 'Дайджест</button></div>' +
        '<div class="pth-end"></div></div>' + (isToday ? '<div class="pth-fab"><button class="btn btn-primary btn-sm" data-pth-now>' + icon('clock') + 'Сейчас</button>' +
        '<button class="btn btn-secondary btn-sm" data-pth-top>Весь день</button></div>' : '') + '</div>';
    },
    mount(host) {
      /* сегодняшний день открывается на ближайшем пункте: линия «Сейчас» в первом экране; кнопки «Сейчас» и «Весь день» */
      const scr = host.querySelector('.scr'), nowEl = host.querySelector('.pth-row.now');
      const toNow = smooth => {
        if (!scr || !nowEl) return;
        const top = nowEl.getBoundingClientRect().top - scr.getBoundingClientRect().top + scr.scrollTop;
        scr.scrollTo({ top: Math.max(0, top - 110), behavior: smooth ? 'smooth' : 'auto' });
      };
      const bn = host.querySelector('[data-pth-now]'), bt = host.querySelector('[data-pth-top]');
      if (bn) bn.addEventListener('click', () => toNow(true));
      if (bt) bt.addEventListener('click', () => scr && scr.scrollTo({ top: 0, behavior: 'smooth' }));
      if (nowEl && scr && !scr.scrollTop) { toNow(false); requestAnimationFrame(() => { if (scr.scrollTop < 5) toNow(false); }); }
      /* долгое нажатие и правая кнопка открывают «Заменить пункт» (B6) */
      host.querySelectorAll('.pth-it[data-it]').forEach(el => {
        let h = null;
        const go = () => { location.hash = '#/B6/' + el.getAttribute('data-it'); };
        const stop = () => { if (h) { clearTimeout(h); h = null; } };
        el.addEventListener('pointerdown', ev => { if (ev.target.closest('.btn, .pth-more, .pth-confl')) return; stop(); h = setTimeout(go, 600); });
        ['pointerup', 'pointerleave', 'pointercancel', 'pointermove'].forEach(n => el.addEventListener(n, stop));
        el.addEventListener('contextmenu', ev => { ev.preventDefault(); stop(); go(); });
      });
    }
  });

  /* ================= B6 «Заменить пункт» ================= */
  const findAlt = id => F.pathAlt(id) || (PS.gen && PS.gen[id]) || null;
  const genAlt = o => { PS.gen = PS.gen || {}; PS.gen[o.id] = o; return o; };
  const isPractice = s => (F.isPractice ? F.isPractice(s) : s.format === 'Практикум' || s.format === 'Бизнес-разбор');
  /* причина для сгенерированной альтернативы: цель из профиля, если рычаг сессии входит в узкий домен цели, иначе пересечение */
  function leverReason(lever) {
    const doms = (F.TAXO && F.TAXO.DOMAINS) || [];
    const d = doms.filter(x => (F.ME.domains || []).indexOf(x.code) >= 0 && x.levers.length && x.levers.length < 6 && x.levers.indexOf(lever) >= 0)[0];
    return d ? { kind: 'goal', text: 'ваша цель: ' + d.title, goal: d.code } : { kind: 'overlap', text: 'общее: ' + lc(lever || 'программа') };
  }
  /* 3–5 альтернатив: сначала данные (replaces), затем подбор по тому же типу и окну; готовое к показу — без повторов и уже добавленных */
  function altsFor(it) {
    const out = [], seen = {};
    const push = a => {
      const key = a.type + ':' + a.ref;
      if (seen[key] || a.ref === it.ref && a.type === it.type || isDismissed(a.type, a.ref) || inPathAny(a)) return;
      seen[key] = 1; out.push(a);
    };
    F.PATH_ALTS.filter(a => a.replaces === it.id).forEach(push);
    const itS = startAbs(it);
    if (it.type === 'session' || it.type === 'practice' || it.type === 'leisure' || it.type === 'networking') {
      F.SESSIONS.filter(s => s.day === it.day && abs(s.day, s.time) + s.dur > NOW_ABS && !tariffClosed({ type: 'session', ref: s.id }) && s.left !== 0)
        .map(s => ({ s, near: Math.abs(abs(s.day, s.time) - itS), lv: s.lever === 'Рост и рынки' ? 0 : 1 }))
        .sort((x, y) => (x.near > 60) - (y.near > 60) || x.lv - y.lv || x.near - y.near)
        .slice(0, 8).forEach(o => {
          const s = o.s, h = F.hall(s.hall);
          const type = isPractice(s) ? 'practice' : (s.label && s.label !== 'Бизнес' ? 'leisure' : 'session');
          push(genAlt({ id: 'ga_' + s.id, type, ref: s.id, title: s.title, reason: leverReason(s.lever), day: s.day, time: s.time, dur: s.dur, hall: s.hall, place: h ? h.name : '' }));
        });
    } else if (it.type === 'person' || it.type === 'buyer') {
      (F.PATH_PEOPLE || []).concat(F.PEOPLE.map(p => ({ person: p.id, reason: { kind: 'overlap', text: 'общее: ' + (p.industry || 'отрасль') } }))).forEach(pp => {
        const p = F.person(pp.person); if (!p || p.id === it.ref) return;
        push(genAlt({ id: 'ga_' + p.id, type: 'person', ref: p.id, title: 'Знакомство: ' + p.name + ', ' + p.company, reason: pp.reason,
          day: it.day, time: it.time, dur: Math.min(it.dur || 20, 30), hall: it.hall, place: it.place }));
      });
    } else if (it.type === 'stand' || it.type === 'kipatalk') {
      F.EXHIBITORS.forEach(e => {
        push(genAlt({ id: 'ga_' + e.id, type: 'stand', ref: e.id, title: 'Стенд «' + e.name + '»: ' + lc(e.what), paid: isPaid(e.id),
          reason: { kind: 'overlap', text: 'общее: ' + lc(e.cluster) }, day: it.day, time: it.time, dur: it.dur || 15, hall: 'congress', place: 'Экспо · ' + e.stand }));
      });
    } else if (it.type === 'mentor') {
      F.MENTORS.forEach(m => {
        m.mw.forEach(w => {
          if (w[0] !== it.day || abs(w[0], w[1]) < NOW_ABS) return;
          push(genAlt({ id: 'ga_' + m.id + '_' + w[1].replace(':', ''), type: 'mentor', ref: m.id, title: 'Менторская встреча: ' + m.name,
            reason: { kind: 'overlap', text: 'общее: ' + lc(m.topic) }, day: w[0], time: w[1], dur: 30, hall: 'magnolia', place: 'Магнолия · стол ' + w[2] }));
        });
      });
    }
    /* платные в предложении не раньше неплатных: платных не больше одной карточки */
    let paid = 0;
    return out.filter(a => !(a.paid && paid++ >= 1)).slice(0, 5);
  }

  function replaceList() {
    const list = [];
    DAYS.forEach(d => dayItems(d).filter(x => x.type !== 'task' && active(x) && endAbs(x) > nowAbs()).forEach(x => list.push(x)));
    return list.slice(0, 14);
  }

  D.register('B6', {
    tab: 'B1',
    meta: {
      title: 'B6 · Заменить пункт',
      role: 'Участник, управление пунктом пути',
      fr: ['FR-PATH-08', 'FR-PATH-04', 'FR-PATH-03', 'FR-AI-02'],
      ac: ['AC-PATH-08', 'AC-PATH-04', 'AC-AI-02'],
      what: [
        'Исходный пункт (параметр маршрута — id пункта: pi04, pu01 и так далее) и переключатель «Закрепить»: пересборка закреплённый пункт не трогает.',
        'От трёх до пяти альтернатив с причиной, временем и конфликтом по времени (пересечение, мало времени на переход, мест нет); платных не больше одной карточки, подпись «на площадке».',
        '«Заменить» открывает лист подтверждения; «Убрать и больше не предлагать» тоже подтверждается в листе.',
        'Без параметра экран показывает список пунктов, которые можно заменить.'
      ],
      rules: [
        'Альтернативы берутся из данных (PATH_ALTS с replaces), затем подбираются по тому же типу и окну; сессии, закрытые по тарифу и без мест, не предлагаются.',
        'Замена меняет только путь; запись на сессию или встречу делается отдельным действием.',
        'Убранный пункт не возвращается после пересборки (D-49: все изменения — нажатием кнопки).',
        'Дела дня заменить нельзя: их отмечают выполненными или убирают.'
      ],
      depends: ['D-49', 'D-52', 'D-57', 'матрица переездов']
    },
    html(ctx) {
      PU.syncPhase();
      const it = ctx.param ? F.pathItem(ctx.param) : null;
      const back = it ? 'B4/' + dayKey(it.day) : 'B4';
      if (!it || !visible(it)) {
        const list = replaceList();
        return '<div class="scr">' +
          D.head({ back, eyebrow: 'Мой путь', title: 'Заменить пункт', sub: ctx.param && !it ? 'Пункта «' + esc(ctx.param) + '» в пути нет' : 'Выберите пункт, который хотите заменить', paren: paren('замену подтверждаете вы') }) +
          '<div class="pth-body">' +
          (dismissedCount() ? '<div class="banner">' + icon('info') + '<span class="grow"><b class="b-title">Скрыто и убрано: ' + dismissedCount() + '</b><span class="cap">эти люди, стенды и сессии больше не предлагаются</span></span>' +
            '<button class="btn btn-ghost btn-sm" data-act="pth-reset-ask">Сбросить отказы</button></div>' : '') +
          (list.length ? '<div class="card" style="padding:2px 16px"><div class="list">' + list.map(x =>
            '<button class="row clickable" data-go="B6/' + x.id + '"><div class="grow"><div class="r-title">' + esc(fixTitle(x.title)) + '</div>' +
            '<div class="r-sub">' + x.day + ' · ' + x.time + ' · ' + esc(x.place || '') + ' · ' + STATUS[stat(x)] + '</div></div>' + icon('chevR') + '</button>').join('') + '</div></div>'
            : '<div class="card pth-empty"><div class="e-title">Заменять нечего</div><div class="cap">В пути нет пунктов, которые можно заменить. Добавьте пункты из программы.</div>' +
            '<div class="pth-now-act"><button class="btn btn-primary btn-sm" data-go="C1">Вся программа</button></div></div>') +
          '<div class="pth-end"></div></div></div>';
      }
      if (it.type === 'task') {
        return '<div class="scr">' +
          D.head({ back, eyebrow: 'Мой путь', title: 'Заменить пункт', sub: 'Дело нельзя заменить', paren: paren('отметьте выполненным или уберите') }) +
          '<div class="pth-body">' + itemHTML(it, { noMore: true, noAct: true, dayLabel: true }) +
          '<button class="btn btn-secondary btn-block" data-act="pth-tick" data-id="' + it.id + '">' + (stat(it) === 'done' ? 'Снять отметку' : 'Отметить выполненным') + '</button>' +
          '<div class="pth-end"></div></div></div>';
      }
      const past = PS.phase === 'event' && endAbs(it) <= NOW_ABS;
      const alts = past ? [] : altsFor(it), pinned = isPinned(it), n = alts.length;
      if (past) {
        return '<div class="scr">' +
          D.head({ back, eyebrow: 'Мой путь', title: 'Заменить пункт', sub: esc(dayLong(it.day)), paren: paren('пункт уже прошёл') }) +
          '<div class="pth-body">' + itemHTML(it, { noMore: true, noAct: true, dayLabel: true }) +
          '<div class="card pth-empty"><div class="cap">Пункт прошёл: заменить его нельзя. Следующие пункты дня — в таймлайне.</div>' +
          '<div class="pth-now-act"><button class="btn btn-primary btn-sm" data-go="B4/' + dayKey(it.day) + '">Таймлайн дня</button></div></div>' +
          '<div class="pth-end"></div></div></div>';
      }
      const act = a => '<button class="btn btn-primary btn-sm pth-plus" data-act="pth-replace-ask" data-it="' + it.id + '" data-alt="' + esc(a.id) + '">Заменить</button>';
      return '<div class="scr">' +
        D.head({ back, eyebrow: 'Мой путь', title: 'Заменить пункт', sub: esc(dayLong(it.day)),
          paren: paren(n >= 3 ? 'ИИ предлагает ' + n + ' ' + plural(n, ['вариант', 'варианта', 'вариантов']) + ', замену подтверждаете вы' : 'ИИ только предлагает, замену подтверждаете вы') }) +
        '<div class="pth-body">' +
        '<div class="sec-title">Сейчас в пути</div>' +
        itemHTML(it, { noMore: true, noAct: true, dayLabel: true }) +
        '<button class="pth-pin" data-act="pth-pin" data-id="' + it.id + '" role="switch" aria-checked="' + pinned + '">' +
        '<span class="grow"><b>Закрепить в пути</b><span class="cap">пересборка закреплённый пункт не трогает</span></span>' +
        '<i class="tg-mini' + (pinned ? ' on' : '') + '"></i></button>' +
        '<div class="sec-title">Альтернативы</div>' +
        (n ? alts.map(a => altHTML(a, { except: it.id, actHTML: act(a) })).join('') :
          '<div class="card pth-empty"><div class="cap">Подходящих альтернатив без нарушения ограничений нет. Можно оставить пункт, закрепить его или убрать из пути.</div></div>') +
        '<button class="btn btn-ghost btn-block pth-dismiss" data-act="pth-dismiss-ask" data-id="' + it.id + '">Убрать и больше не предлагать</button>' +
        '<button class="pth-link pth-why-link" data-go="N8/' + it.id + '">Почему это в вашем пути</button>' +
        '<div class="pth-end"></div></div></div>';
    }
  });

  const dismissedCount = () => Object.keys(F.PATH_DISMISSED || {}).length;
  PU.dismissedCount = dismissedCount;
  D.action('pth-reset-ask', () => {
    const n = dismissedCount();
    if (!n) { D.toast('Отказов нет'); return; }
    sheet('Сбросить отказы?', ul(['Снова можно будет предлагать ' + n + ' ' + plural(n, ['скрытый или убранный объект', 'скрытых или убранных объекта', 'скрытых или убранных объектов']) +
      ': людей, стенды и сессии.', 'Убранные пункты сами в путь не вернутся: их можно добавить кнопкой «+ Путь».']), 'pth-reset-do', '', 'Сбросить отказы');
  });
  D.action('pth-reset-do', () => {
    const n = F.pathResetDismissed ? F.pathResetDismissed() : 0;
    PS.altShown = null;
    logEv('reset', 'Отказы сброшены: ' + n);
    D.closeSheet();
    D.rerender();
    PU.say('Отказы сброшены');
  });

  D.action('pth-pin', el => {
    const it = F.pathItem(el.dataset.id); if (!it) return;
    if (it.pin) delete it.pin; else it.pin = true;
    logEv(it.pin ? 'pin' : 'unpin', (it.pin ? 'Закреплено: ' : 'Закрепление снято: ') + it.title);
    D.rerender();
    PU.say(it.pin ? 'Пункт закреплён' : 'Закрепление снято');
  });
  D.action('pth-replace-ask', el => {
    const it = F.pathItem(el.dataset.it), a = findAlt(el.dataset.alt); if (!it || !a) return;
    const conf = altConflicts(a, it.id);
    sheet('Заменить пункт?', ul([
      'Убрать из пути: <b>' + esc(cut(it.title, 60)) + '</b>, ' + it.time + '–' + endLabel(it),
      'Добавить: <b>' + esc(cut(a.title, 60)) + '</b>, ' + a.time + '–' + endLabel(a) + ', ' + esc(a.place)
    ].concat(conf.length ? ['Есть конфликт: ' + esc(conf[0].text) + '. Он появится в списке «Конфликты».'] : ['Конфликтов по времени нет.'])
      .concat(['Замена меняет только путь. Запись на сессию или встречу делается отдельно.'])),
      'pth-replace-do', it.id + '|' + a.id, 'Заменить');
  });
  D.action('pth-replace-do', el => {
    const [iid, aid] = el.dataset.arg.split('|');
    const it = F.pathItem(iid), a = findAlt(aid); if (!it || !a) { D.closeSheet(); return; }
    const n = addSpec(a, { reason: { kind: a.reason.kind, text: a.reason.text }, source: 'ai' });
    if (!n) { D.closeSheet(); D.toast('Не удалось заменить пункт'); return; }
    if (F.PATH_ADDED.indexOf(it.id) >= 0) F.pathRemove(it.id); else it.status = 'replaced';
    PS.fresh[n.id] = 'после замены';
    logEv('replaced', 'Заменено: ' + cut(it.title, 40) + ' на ' + cut(a.title, 40));
    D.closeSheet();
    PU.say('Пункт заменён');
    location.hash = '#/B4/' + dayKey(a.day);
  });
  D.action('pth-dismiss-ask', el => {
    const it = F.pathItem(el.dataset.id); if (!it) return;
    sheet('Убрать пункт?', ul(['Пункт <b>' + esc(cut(it.title, 60)) + '</b> уйдёт из пути.',
      'Больше не предлагается: пересборка и подбор его исключат.']
      .concat(stat(it) === 'booked' ? ['Запись на сессию или встречу остаётся: отменить её можно в «Моих записях».'] : [])),
      'pth-dismiss-do', it.id, 'Убрать');
  });
  D.action('pth-dismiss-do', el => {
    const it = F.pathItem(el.dataset.arg); if (!it) { D.closeSheet(); return; }
    dismiss(it.type, it.ref);
    const day = it.day;
    logEv('removed', 'Убрано: ' + cut(it.title, 50));
    F.pathRemove(it.id);
    D.closeSheet(); PU.say('Убрано, больше не предлагается');
    location.hash = '#/B4/' + dayKey(day);
  });

  /* ================= B7 «Конфликты и переходы» ================= */
  const CF_KINDS = [['overlap', 'Пересечения'], ['transit', 'Переходы'], ['tariff', 'Тариф'], ['seats', 'Мест нет']];
  const mini = (it, label) => '<button class="pth-opt" data-go="' + linkOf(it) + '"><span class="pth-opt-l">' + label + '</span>' +
    '<span class="pth-opt-b"><b>' + esc(cut(it.title, 64)) + '</b><small>' + it.time + '–' + endLabel(it) + ' · ' + esc(it.place || '') + (stat(it) === 'booked' ? ' · записано' : '') + '</small></span></button>';

  function cfCard(c, focus) {
    const pair = c.kind === 'overlap' || c.kind === 'transit';
    const a = c.a, b = c.b;
    let body = '<div class="pth-cf-h"><span class="pth-cf-k">' + esc(KIND_RU[c.kind]) + '</span><span class="cap">' + c.day + '</span></div>' +
      '<div class="pth-cf-t">' + esc(confText(c)) + '</div>';
    if (c.kind === 'transit') {
      body += '<div class="pth-walk">' + icon('route') + '<span>Нужно ' + c.t.walk + ' ' + plural(c.t.walk, ['минута', 'минуты', 'минут']) + ' пешком (' + esc(c.t.from) + ' — ' + esc(c.t.to) +
        '), есть ' + Math.max(c.t.gap, 0) + '. Чтобы успеть, выйдите за ' + c.t.lead + ' ' + plural(c.t.lead, ['минуту', 'минуты', 'минут']) + ' до начала.</span></div>';
    }
    if (pair) {
      body += '<div class="pth-opts">' + mini(a, 'это') + mini(b, 'то') + '</div>' +
        '<div class="pth-cf-btns"><button class="btn btn-secondary btn-sm" data-act="pth-cf-ask" data-k="keep-a" data-c="' + esc(c.id) + '">Оставить это</button>' +
        '<button class="btn btn-secondary btn-sm" data-act="pth-cf-ask" data-k="keep-b" data-c="' + esc(c.id) + '">Оставить то</button></div>' +
        ((PU.groupOf(a) || PU.groupOf(b))
          ? '<div class="pth-cf-note cap">' + icon('info') + '<span>В избранное нельзя: один из пунктов уже входит в группу вариантов</span></div>'
          : '<button class="btn btn-secondary btn-sm pth-cf-fav" data-act="pth-cf-ask" data-k="fav" data-c="' + esc(c.id) + '">В избранное: оба в одном окне</button>');
    } else {
      body += '<div class="pth-opts">' + mini(a, 'пункт') + '</div>' +
        '<div class="pth-cf-btns"><button class="btn btn-secondary btn-sm" data-act="pth-cf-ask" data-k="drop" data-c="' + esc(c.id) + '">Убрать из пути</button>' +
        (c.kind === 'tariff' ? '<button class="btn btn-ghost btn-sm" data-go="D4/' + esc(a.ref) + '">Почему закрыто</button>' : '<button class="btn btn-ghost btn-sm" data-go="D3">Лист ожидания</button>') + '</div>';
    }
    return '<div class="card pth-cf' + (focus ? ' focus' : '') + '" id="cf-' + esc(c.id.replace(/:/g, '-')) + '">' + body + '</div>';
  }
  const findConf = id => conflictsAll().filter(c => c.id === id)[0] || null;

  /* список переходов дня: от текущей точки и между пунктами */
  function transitList(day) {
    const list = dayItems(day).filter(active).filter(x => endAbs(x) > nowAbs()).sort(byStart);
    const rows = []; let prev = (day === F.PATH_NOW.day && PS.phase === 'event') ? { hall: F.PATH_NOW.hall, day, time: F.PATH_NOW.time, dur: 0, here: true } : null;
    list.forEach(x => {
      if (prev) {
        const t = transit(prev, x);
        if (t && t.gap >= 0 && t.gap <= 180) rows.push({ t, from: prev, to: x });
      }
      prev = x;
    });
    return rows.slice(0, 8);
  }

  D.register('B7', {
    tab: 'B1',
    meta: {
      title: 'B7 · Конфликты и переходы',
      role: 'Участник, раздел «Мой путь»',
      fr: ['FR-PATH-09', 'FR-PATH-04', 'FR-PATH-16', 'FR-PATH-10'],
      ac: ['AC-PATH-09', 'AC-PATH-16', 'AC-PATH-04'],
      what: [
        'Список конфликтов четырёх видов: пересечение, мало времени на переход, закрыто по тарифу, мест нет; значения «нужно N минут» взяты из матрицы переездов.',
        'Решения «Оставить это», «Оставить то», «В избранное» (оба пункта собираются в группу «Выберите» в таймлайне); для тарифа и листа ожидания — «Убрать из пути».',
        'Каждое решение подтверждается в листе, меняет путь и пишет событие; решённый конфликт исчезает из списка.',
        'Блок «Переходы»: куда и за сколько выйти (от точки «вы здесь» и между пунктами дня).',
        'Параметр маршрута: dNNNN — только этот день, id пункта (pi07) — конфликты пункта подсвечены.'
      ],
      rules: [
        'Планировщик не предлагает пункт, нарушающий ограничение; конфликты возникают из ручных добавлений и переносов (FR-PATH-04).',
        '«Выйти за N минут» = время пешком по матрице переездов плюс запас, округлённо до пяти минут.',
        'Запись на сессию (если есть) при снятии пункта с пути остаётся: её отменяют в «Моих записях».',
        'Параллельные варианты одного окна в конфликты не попадают: считается выбранный.'
      ],
      depends: ['D-26', 'D-49', 'D-52', 'матрица переездов']
    },
    html(ctx) {
      PU.syncPhase();
      const st = ctx.state;
      const dayF = dayOfKey(ctx.param), focusIt = !dayF && ctx.param ? F.pathItem(ctx.param) : null;
      let all = conflicts(dayF);
      const counts = {}; all.forEach(c => { counts[c.kind] = (counts[c.kind] || 0) + 1; });
      st.kind = st.kind && (st.kind === 'all' || counts[st.kind]) ? st.kind : 'all';
      let list = all.filter(c => st.kind === 'all' || c.kind === st.kind);
      if (focusIt) list = list.slice().sort((x, y) => ((y.a === focusIt || y.b === focusIt) ? 1 : 0) - ((x.a === focusIt || x.b === focusIt) ? 1 : 0));
      const backDay = dayF || (focusIt ? focusIt.day : F.PATH_NOW.day);
      const tday = dayF || (focusIt && focusIt.day) || (PS.phase === 'pre' ? F.PATH_PHASES.pre.focusDay : F.PATH_NOW.day);
      const tr = transitList(tday);
      const n = all.length;
      const chips = '<div class="chip-rail pth-rail"><button class="chip' + (st.kind === 'all' ? ' on' : '') + '" data-act="pth-cf-kind" data-arg="all">Все ' + n + '</button>' +
        CF_KINDS.filter(k => counts[k[0]]).map(k => '<button class="chip' + (st.kind === k[0] ? ' on' : '') + '" data-act="pth-cf-kind" data-arg="' + k[0] + '">' + k[1] + ' ' + counts[k[0]] + '</button>').join('') + '</div>';
      return '<div class="scr">' +
        D.head({ back: 'B4/' + dayKey(backDay), eyebrow: 'Мой путь', title: 'Конфликты и переходы',
          sub: n ? n + ' ' + plural(n, ['конфликт', 'конфликта', 'конфликтов']) + (dayF ? ' · ' + dayLong(dayF) : ' в пути') : 'Конфликтов нет',
          paren: paren('решение подтверждается в листе') }) +
        (n ? chips : '') +
        '<div class="pth-body">' +
        (dayF ? '<div class="cap">Показаны конфликты за ' + dayLong(dayF) + '. <button class="pth-link" data-go="B7">Все дни</button></div>' : '') +
        (list.length ? list.map(c => cfCard(c, focusIt && (c.a === focusIt || c.b === focusIt))).join('') :
          '<div class="card pth-empty"><div class="e-title">Конфликтов нет</div>' +
          '<div class="cap">Пересечений, нехватки времени на переход и закрытых по тарифу пунктов в пути не найдено.</div>' +
          '<div class="pth-now-act"><button class="btn btn-primary btn-sm" data-go="B4/' + dayKey(backDay) + '">Таймлайн дня</button></div></div>') +
        '<div class="sec-title">Переходы · ' + tday + '</div>' +
        (tr.length ? '<div class="card pth-trs">' + tr.map(r => {
          const t = r.t, toI = r.to;
          return '<button class="pth-trow' + (t.tight ? ' tight' : '') + '" data-go="' + linkOf(toI) + '"><span class="pth-trow-t">' + toI.time + '</span>' +
            '<span class="pth-trow-b"><b>' + esc(t.from) + ' — ' + esc(t.to) + '</b><small>' + t.walk + ' ' + plural(t.walk, ['минута', 'минуты', 'минут']) + ' пешком · ' +
            (t.tight ? 'не успеть: есть ' + Math.max(t.gap, 0) : 'выйти за ' + t.lead + ' ' + plural(t.lead, ['минуту', 'минуты', 'минут'])) + '</small></span>' + icon('chevR') + '</button>';
        }).join('') + '</div>'
          : '<div class="card pth-empty"><div class="cap">Переходов между залами в этот день нет.</div></div>') +
        '<button class="btn btn-secondary btn-block" data-go="B4/' + dayKey(backDay) + '">Таймлайн дня</button>' +
        '<div class="pth-end"></div></div></div>';
    },
    mount(host) {
      const f = host.querySelector('.pth-cf.focus');
      if (f && f.scrollIntoView) f.scrollIntoView({ block: 'center' });
    }
  });
  D.action('pth-cf-kind', el => { D.st('B7').kind = el.dataset.arg; D.rerender(); });
  D.action('pth-cf-ask', el => {
    const c = findConf(el.dataset.c), k = el.dataset.k; if (!c) { D.rerender(); return; }
    const keep = k === 'keep-a' ? c.a : k === 'keep-b' ? c.b : null;
    const drop = k === 'keep-a' ? c.b : k === 'keep-b' ? c.a : k === 'drop' ? c.a : null;
    const line = x => '<b>' + esc(cut(x.title, 56)) + '</b>, ' + x.time + '–' + endLabel(x);
    let title, items, label;
    if (k === 'fav') {
      title = 'Сохранить оба варианта?';
      items = ['Пункты соберутся в группу «Выберите: 2 варианта»: ' + line(c.a) + '; ' + line(c.b) + '.',
        'В таймлайне вы выберете один, второй останется в избранном.'];
      if (PU.groupOf(c.a) || PU.groupOf(c.b)) items = ['Один из пунктов уже входит в группу вариантов. Выберите «Оставить это» или «Оставить то».'];
      label = 'В избранное';
    } else {
      title = k === 'drop' ? 'Убрать из пути?' : 'Оставить ' + (k === 'keep-a' ? 'это' : 'то') + '?';
      items = (keep ? ['Остаётся в пути: ' + line(keep) + '.'] : []).concat(['Будет убрано из пути: ' + line(drop) + '.', 'Убранный пункт больше не предлагается.']);
      if (stat(drop) === 'booked') items.push('Запись остаётся: отменить её можно в «Моих записях».');
      label = k === 'drop' ? 'Убрать из пути' : 'Оставить ' + (k === 'keep-a' ? 'это' : 'то');
    }
    sheet(title, ul(items), 'pth-cf-do', k + '|' + c.id, label);
  });
  D.action('pth-cf-do', el => {
    const [k, cid] = el.dataset.arg.split('|');
    const c = findConf(cid); if (!c) { D.closeSheet(); D.rerender(); return; }
    if (k === 'fav') {
      if (PU.groupOf(c.a) || PU.groupOf(c.b)) { D.closeSheet(); return; }
      const t = fmt(Math.min(tm(c.a.time), tm(c.b.time)));
      PS.groups.push({ id: 'pgu' + (PS.groups.length + 1), day: c.day, time: t, options: [c.a.id, c.b.id], chosen: c.a.id });
      logEv('fav', 'В избранное: ' + cut(c.a.title, 30) + ' и ' + cut(c.b.title, 30));
      D.closeSheet(); PU.say('Оба в избранном: выберите один', 3000);
    } else {
      const drop = k === 'keep-a' ? c.b : k === 'keep-b' ? c.a : c.a;
      dismiss(drop.type, drop.ref);
      logEv('conflict', 'Конфликт решён: убрано «' + cut(drop.title, 40) + '»');
      F.pathRemove(drop.id);
      D.closeSheet(); PU.say('Конфликт решён, пункт убран');
    }
    D.rerender();
  });

  /* ================= пересборка и версии: общие функции и листы ================= */
  const PAID_LIMIT = (() => {
    const p = (F.PARAMS_V3 || []).filter(x => x.id === 'n01')[0];
    const v = p && parseInt(String(p.value), 10);
    return v > 0 ? v : 30;
  })();
  PU.PAID_LIMIT = PAID_LIMIT;
  /* краткий итог изменений словами: «убрано 2 пункта, заменён 1 пункт»; нули не показываем (V-13) */
  function chg(n1, one1, many1, n2, one2, many2) {
    const w = (n, one, many) => (n % 10 === 1 && n % 100 !== 11 ? one : many) + ' ' + n + ' ' + plural(n, ['пункт', 'пункта', 'пунктов']);
    const out = [];
    if (n1) out.push(w(n1, one1, many1));
    if (n2) out.push(w(n2, one2, many2));
    return out.length ? out.join(', ') : 'изменений в составе нет';
  }
  const limitLeft = () => Math.max(PU.REBUILD_LIMIT - PS.rebuilds, 0);
  const limitLine = () => 'Пересборок сегодня: ' + PS.rebuilds + ' из ' + PU.REBUILD_LIMIT + '';
  function blockedSheet(title) {
    D.openSheet('<div class="sheet-title">' + esc(title) + '</div>' +
      '<div class="banner warn">' + icon('alert') + '<div><div class="b-title">Лимит пересборок на сегодня исчерпан</div>' +
      '<div class="cap">' + esc(limitLine()) + '. Новые пересборки откроются завтра; пока можно менять путь вручную: заменять и убирать пункты.</div></div></div>' +
      '<button class="btn btn-primary btn-block" data-act="sheet-close">Понятно</button>');
  }

  /* план пересборки: предложенные системой пункты, нарушающие ограничения относительно ваших и принятых, заменяются
     альтернативой без нарушений либо убираются; закреплённые, ваши добавления и записи не трогаются */
  function planRebuild() {
    const firm = it => it.source === 'self' || it.source === 'feed' || !!it.pin || it.status === 'accepted' || it.status === 'booked';
    const cand = it => it.type !== 'task' && it.source === 'ai' && it.status === 'suggested' && !it.pin && visible(it) && active(it) && endAbs(it) > NOW_ABS && !groupOf(it);
    const bad = F.PATH_ITEMS.filter(cand).filter(it => confOf(it).some(c => {
      if (c.kind !== 'overlap' && c.kind !== 'transit') return false;
      const o = c.a === it ? c.b : c.a;
      if (firm(o)) return true;
      /* два предложения системы мешают друг другу: остаётся более раннее, более позднее снимается */
      return cand(o) && (startAbs(it) > startAbs(o) || (startAbs(it) === startAbs(o) && it.id > o.id));
    }));
    const repl = [], drop = [];
    bad.forEach(it => {
      const a = altsFor(it).filter(x => !altConflicts(x, it.id).length)[0];
      if (a) repl.push({ it, a }); else drop.push(it);
    });
    return { repl, drop, booked: F.PATH_ITEMS.filter(it => stat(it) === 'booked' && visible(it) && endAbs(it) > NOW_ABS).length, pinned: F.PATH_ITEMS.filter(it => it.pin && visible(it) && endAbs(it) > NOW_ABS).length,
      own: F.PATH_ITEMS.filter(it => it.source === 'self' && visible(it) && endAbs(it) > NOW_ABS).length };
  }
  D.action('pth-rebuild-ask', () => {
    if (limitLeft() === 0) { blockedSheet('Пересобрать путь?'); return; }
    const pl = planRebuild(), v = F.pathVersion(PS.version), q = x => '<b>«' + esc(cut(x.title, 52)) + '»</b>';
    const items = ['Путь пересоберётся заново по версии «' + esc(v.name) + '» с учётом убранных и закреплённых пунктов.'];
    pl.repl.forEach(r => items.push('Заменим ' + q(r.it) + ' на ' + q(r.a) + ': нет пересечения с вашими пунктами.'));
    pl.drop.forEach(it => items.push('Уберём из предложений ' + q(it) + ': мешает другому пункту, замены без нарушений нет.'));
    if (!pl.repl.length && !pl.drop.length) items.push('Предложения не мешают друг другу и вашим пунктам: изменений в составе не будет.');
    const kept = [];
    if (pl.own) kept.push('ваши добавления (' + pl.own + ')');
    if (pl.booked) kept.push('записи (' + pl.booked + ')');
    if (pl.pinned) kept.push('закреплённые (' + pl.pinned + ')');
    items.push('Остаются без изменений: ' + (kept.length ? kept.join(', ') : 'принятые вами пункты') + '.');
    items.push(esc(limitLine()) + '.');
    sheet('Пересобрать путь?', ul(items), 'pth-rebuild-do', '', 'Пересобрать');
  });
  D.action('pth-rebuild-do', () => {
    if (limitLeft() === 0) { D.closeSheet(); blockedSheet('Пересобрать путь?'); return; }
    const pl = planRebuild();
    pl.repl.forEach(r => {
      const n = addSpec(r.a, { reason: { kind: r.a.reason.kind, text: r.a.reason.text }, source: 'ai' });
      if (n) { n.status = 'suggested'; r.it.status = 'replaced'; PS.fresh[n.id] = 'после пересборки'; }
    });
    pl.drop.forEach(it => { it.status = 'skipped'; it.vh = 'rebuild'; dismiss(it.type, it.ref); });
    PS.rebuilds++;
    PS.altShown = null;
    logEv('rebuild', 'Путь пересобран: заменено ' + pl.repl.length + ', убрано ' + pl.drop.length);
    D.closeSheet();
    PU.say('Пересобрано: ' + chg(pl.drop.length, 'убран', 'убрано', pl.repl.length, 'заменён', 'заменено'), 3000);
    D.rerender();
  });

  /* ================= B5 «Версии пути» ================= */
  /* показатели текущего пути (все дни, без дел): те же категории, что у версий */
  function curStats() {
    const s = { sessions: 0, meetings: 0, stands: 0, leisure: 0, total: 0, paid: 0, paidShare: 0 };
    F.PATH_ITEMS.filter(it => it.type !== 'task' && visible(it) && stat(it) !== 'skipped').forEach(it => {
      s.total++;
      if (it.paid) s.paid++;
      if (it.type === 'session' || it.type === 'practice' || it.type === 'kipatalk') s.sessions++;
      else if (it.type === 'mentor' || it.type === 'person' || it.type === 'buyer') s.meetings++;
      else if (it.type === 'stand') s.stands++;
      else s.leisure++;
    });
    s.paidShare = s.total ? Math.round(s.paid * 100 / s.total) : 0;
    return s;
  }
  function statCell(n, label) { return '<div class="pth-vs"><b>' + n + '</b><span>' + label + '</span></div>'; }
  function verCard(v, sel) {
    const s = v.stats, on = PS.version === v.id;
    return '<div class="pth-ver' + (sel ? ' sel' : '') + '">' +
      '<button class="pth-ver-main" data-act="pth-ver-sel" data-arg="' + v.id + '" aria-pressed="' + sel + '">' +
      '<span class="pth-ver-h"><span class="pth-ver-n">' + esc(v.name) + '</span>' +
      (on ? tag('Сейчас у вас', 'fill') : v.isDefault ? tag('по умолчанию') : '') + '</span>' +
      '<span class="pth-ver-d">' + esc(v.desc) + '</span>' +
      '<span class="pth-ver-lb">' + v.labels.map(l => tag(l, 'accent')).join('') + '</span>' +
      '<span class="pth-vstats">' + statCell(s.sessions, plural(s.sessions, ['сессия', 'сессии', 'сессий'])) +
      statCell(s.meetings, plural(s.meetings, ['встреча', 'встречи', 'встреч'])) +
      statCell(s.stands, plural(s.stands, ['стенд', 'стенда', 'стендов'])) +
      statCell(s.leisure, 'досуг') + '</span>' +
      '<span class="pth-paid"><span class="pth-paid-t"><span>На площадке <b>' + s.paidShare + '%</b> пунктов</span><small>не выше ' + PAID_LIMIT + '%</small></span>' +
      '<span class="progress pth-paid-bar"><i style="width:' + Math.min(100, Math.round(s.paidShare * 100 / PAID_LIMIT)) + '%"></i></span></span>' +
      '</button>' +
      '<div class="pth-ver-pick">' + (on ? '<span class="pth-in">' + icon('check') + 'Эта версия действует у вас</span>'
        : '<button class="btn btn-primary btn-block" data-act="pth-ver-ask" data-arg="' + v.id + '">Выбрать версию «' + esc(v.name) + '»</button>') + '</div></div>';
  }
  const delta = (a, b) => { const d = b - a; return d === 0 ? '<span class="pth-d0">0</span>' : '<span class="pth-d' + (d > 0 ? 'p' : 'm') + '">' + (d > 0 ? '+' + d : '−' + Math.abs(d)) + '</span>'; };

  D.register('B5', {
    tab: 'B1',
    meta: {
      title: 'B5 · Версии пути',
      role: 'Участник, раздел «Мой путь»',
      fr: ['FR-PATH-07', 'FR-PATH-06', 'FR-PATH-05', 'FR-PATH-08'],
      ac: ['AC-PATH-07', 'AC-PATH-06', 'AC-AI-02'],
      what: [
        'Три карточки: «Максимум бизнеса», «Больше знакомств», «Сбалансированный»; у каждой число сессий, встреч, стендов, досуга и доля «на площадке» относительно параметра.',
        'Сравнение выбранной версии с текущим путём: по каждому показателю значение и разница.',
        '«Выбрать версию» открывает лист подтверждения с составом изменений; путь не меняется до нажатия «Применить версию».',
        '«Пересобрать» (лист подтверждения) и счётчик пересборок за сутки; при исчерпании лимита действие блокируется с пояснением.'
      ],
      rules: [
        'Версии различаются составом по таксономии: «Максимум бизнеса» берёт метку Бизнес, «Больше знакомств» добавляет нетворкинг и Развлечения, «Сбалансированный» добавляет Спорт и Семью (D-57).',
        'Доля платных пунктов (экспоненты «Экспо+» и «Премиум») в версии не выше параметра, по умолчанию 30% (FR-PATH-06); платные подписаны «на площадке».',
        'Версии можно срезать до одной (D-52): тогда экран показывает единственную карточку без выбора.',
        'Ваши добавления, записи и закреплённые пункты версия не меняет.'
      ],
      depends: ['D-46', 'D-52', 'D-57', 'параметр «доля платных пунктов»']
    },
    html(ctx) {
      PU.syncPhase();
      const st = ctx.state, vs = F.PATH_VERSIONS;
      st.sel = st.sel && F.pathVersion(st.sel) ? st.sel : PS.version;
      const cur = F.pathVersion(PS.version), sel = F.pathVersion(st.sel);
      const same = sel.id === cur.id;
      const rows = [['Сессии и практики', 'sessions'], ['Встречи', 'meetings'], ['Стенды', 'stands'], ['Нетворкинг и досуг', 'leisure'], ['На площадке, %', 'paidShare']];
      const cs = curStats();
      const cmp = '<div class="card pth-cmp"><div class="pth-cmp-n"><span><b>Сейчас</b> ' + esc(cur.name) + ' и ваши правки</span><span><b>Выбрано</b> ' + esc(sel.name) + '</span></div>' +
        '<div class="pth-cmp-h"><span></span><span>Сейчас</span><span>Выбрано</span></div>' +
        rows.map(r => '<div class="pth-cmp-r"><span>' + r[0] + '</span><b>' + cs[r[1]] + '</b><b>' + sel.stats[r[1]] + (same ? '' : ' ' + delta(cs[r[1]], sel.stats[r[1]])) + '</b></div>').join('') +
        '</div>';
      return '<div class="scr">' +
        D.head({ back: 'B1', eyebrow: 'Мой путь', title: 'Версии пути', sub: 'Три сборки под вашу цель и запрос',
          paren: paren('изменения применяются после подтверждения') }) +
        '<div class="pth-body">' +
        '<div class="sec-title pth-choose">Выберите версию пути</div>' +
        '<div class="cap pth-note">Версия задаёт, какие пункты предлагать: деловые, со знакомствами или с отдыхом. Ваши добавления и записи остаются.</div>' +
        vs.slice().sort((x, y) => (y.id === PS.version) - (x.id === PS.version)).map(v => verCard(v, v.id === st.sel)).join('') +
        '<div class="sec-title">Сравнение</div>' + cmp +
        '<button class="btn btn-secondary btn-block" data-act="pth-rebuild-ask">' + icon('refresh') + 'Пересобрать</button>' +
        '<div class="cap pth-note">' + esc(limitLine()) + '.</div>' +
        '<button class="pth-link pth-why-link" data-go="N8">Почему это в вашем пути</button>' +
        '<div class="pth-end"></div></div></div>';
    }
  });
  D.action('pth-ver-sel', el => { D.st('B5').sel = el.dataset.arg; D.rerender(); });
  D.action('pth-ver-ask', el => {
    const v = F.pathVersion(el.dataset.arg); if (!v || v.id === PS.version) return;
    if (limitLeft() === 0) { blockedSheet('Применить версию?'); return; }
    const d = versionDiff(v.id), q = x => '«' + esc(cut(x.title, 44)) + '»';
    const items = ['Версия «' + esc(v.name) + '» заменит текущую «' + esc(F.pathVersion(PS.version).name) + '».'];
    if (d.add.length) items.push('Добавится в путь: ' + d.add.length + ' ' + plural(d.add.length, ['пункт', 'пункта', 'пунктов']) + ': ' + d.add.slice(0, 3).map(q).join(', ') + (d.add.length > 3 ? ' и ещё ' + (d.add.length - 3) : '') + '.');
    if (d.del.length) items.push('Уйдёт из предложений: ' + d.del.length + ' ' + plural(d.del.length, ['пункт', 'пункта', 'пунктов']) + ': ' + d.del.slice(0, 3).map(q).join(', ') + (d.del.length > 3 ? ' и ещё ' + (d.del.length - 3) : '') + '.');
    if (!d.add.length && !d.del.length) items.push('Состав предложений не изменится.');
    items.push('Ваши добавления, записи и закреплённые пункты остаются. Доля «на площадке»: ' + v.stats.paidShare + '%, не выше ' + PAID_LIMIT + '%.');
    items.push(esc(limitLine()) + '.');
    sheet('Применить версию?', ul(items), 'pth-ver-do', v.id, 'Применить версию');
  });
  D.action('pth-ver-do', el => {
    const v = F.pathVersion(el.dataset.arg); if (!v) { D.closeSheet(); return; }
    if (limitLeft() === 0) { D.closeSheet(); blockedSheet('Применить версию?'); return; }
    const d = versionDiff(v.id);
    applyVersion(v.id);
    PS.rebuilds++; PS.altShown = null;
    logEv('version', 'Версия пути: «' + v.name + '»');
    D.closeSheet();
    PU.say('Версия применена: ' + chg(d.add.length, 'добавлен', 'добавлено', d.del.length, 'убран', 'убрано'), 3000);
    D.rerender();
  });

  Object.assign(PU, { altsFor, findAlt, upcoming, nowLoc, curStats, reachable, leverReason });

  /* ================= B8 «Дайджест дня» ================= */
  function digestPicks() {
    const ids = ['pi03', 'pi06', 'pi12', 'pi18'];
    const l = ids.map(id => F.pathItem(id)).filter(it => it && visible(it));
    return l.length ? l : dayItems(F.PATH_NOW.day).filter(it => it.type !== 'task' && active(it)).slice(0, 4);
  }
  const dRow = (it, sub) => '<button class="row clickable" data-go="' + linkOf(it) + '"><span class="pth-mini-t">' + it.time + '</span><div class="grow">' +
    '<div class="r-title">' + esc(cut(it.title, 70)) + '</div><div class="r-sub">' + esc(sub || it.place || '') + '</div></div>' + icon('chevR') + '</button>';
  function changesHTML(pm) {
    const post = id => (F.FEED_POSTS || []).filter(p => p.id === id)[0];
    const rows = [];
    if (!pm) return '<div class="card pth-empty"><div class="cap">С вечера изменений по вашим пунктам нет. Если расписание изменится, придёт отдельное уведомление типа «Мой путь».</div></div>';
    [['fp01', 'срочно'], ['fp02', 'изменение']].forEach(x => {
      const p = post(x[0]); if (!p) return;
      rows.push('<button class="row clickable" data-go="R4/' + p.id + '"><div class="grow"><div class="r-title">' + tag(x[1], x[1] === 'срочно' ? 'urgent' : 'accent') + ' ' + esc(p.time) + '</div>' +
        '<div class="r-sub">' + esc(cut(p.text.replace(/^(Срочно|Изменение в программе):\s*/, ''), 120)) + '</div></div>' + icon('chevR') + '</button>');
    });
    (F.SCHEDULE_NOTICES || []).forEach(n => {
      const s = F.session(n.sid); if (!s) return;
      rows.push('<button class="row clickable" data-go="C3/' + s.id + '"><div class="grow"><div class="r-title">' + tag('перенос', 'accent') + ' ' + esc(n.at) + '</div>' +
        '<div class="r-sub">«' + esc(cut(s.title, 60)) + '»: было ' + esc(n.was) + ', стало ' + esc(n.now) + '. Он в вашем пути.</div></div>' + icon('chevR') + '</button>');
    });
    PS.log.slice(0, 3).forEach(l => rows.push('<div class="row"><div class="grow"><div class="r-title">' + tag('вы') + '</div><div class="r-sub">' + esc(l.text) + '</div></div></div>'));
    return '<div class="card" style="padding:2px 16px"><div class="list">' + rows.join('') + '</div></div>';
  }
  D.register('B8', {
    tab: 'B1',
    meta: {
      title: 'B8 · Дайджест дня',
      role: 'Участник, сводка Секретаря',
      fr: ['FR-FEED-11', 'FR-NTF-07', 'FR-NOTE-04', 'FR-PATH-01'],
      ac: ['AC-FEED-02', 'AC-PATH-14'],
      what: [
        'Две сводки: в 08:00 (утро) и в 19:00 (вечер), переключатель по параметру маршрута (B8 и B8/pm).',
        'Блоки: что изменилось, что рекомендовано, оценить день (ссылка на M3); утренняя сводка совпадает с записью fp14 в ленте.',
        'Вечерняя сводка показана предварительно по данным на 11:10: срочная новость, перенос практикума, ваши действия, пункты на завтра.',
        'Подпись «собирает Секретарь; без ИИ формируется по шаблону из данных» и ссылка на настройки уведомлений (B3).'
      ],
      rules: [
        'Дайджест формирует Секретарь (AI-SEC) в 08:00 и 19:00; без ИИ собирается по шаблону: изменения программы и ближайшие пункты пути (FR-FEED-11).',
        'Срезается при росте объёма (D-52): тогда остаётся лента и уведомления типа «Мой путь».',
        'Дайджест ничего не меняет в пути: действия совершаются кнопками на других экранах.'
      ],
      depends: ['D-35', 'D-49', 'D-52', 'FR-NOTE-04']
    },
    html(ctx) {
      PU.syncPhase();
      const pm = ctx.param === 'pm';
      const picks = pm ? dayItems('28.02').filter(it => it.type !== 'task' && active(it)).slice(0, 3) : digestPicks();
      const rate = (F.DAY_RATINGS || []).length;
      return '<div class="scr">' +
        D.head({ back: 'B1', eyebrow: 'Секретарь · ' + esc(F.NOW.dateLong), title: 'Дайджест дня',
          sub: pm ? 'Сводка на 19:00, предварительно по данным на ' + F.NOW.time : 'Сводка на 08:00: что в пути и что изменилось',
          paren: paren('сводку собирает Секретарь, при сбое ИИ — по шаблону') }) +
        D.segbar([['B8', '08:00 · утро'], ['B8/pm', '19:00 · вечер']], pm ? 'B8/pm' : 'B8') +
        '<div class="pth-body">' +
        '<div class="sec-title">Что изменилось</div>' + changesHTML(pm) +
        '<div class="sec-title">' + (pm ? 'Что рекомендовано на завтра' : 'Что рекомендовано сегодня') + '</div>' +
        (picks.length ? '<div class="card" style="padding:2px 16px"><div class="list">' + picks.map(it =>
          dRow(it, (pm ? '28.02 · ' : '') + it.place + ' · ' + STATUS[stat(it)])).join('') + '</div></div>'
          : '<div class="card pth-empty"><div class="cap">В пути пока нет пунктов на этот день: откройте версии пути или программу.</div></div>') +
        '<div class="pth-now-act"><button class="btn btn-secondary btn-sm" data-go="B4/' + (pm ? 'd2802' : 'd2702') + '">Таймлайн дня</button></div>' +
        '<div class="sec-title">Оценить день</div>' +
        '<button class="card interactive pth-after-card" data-go="M3">' + icon('star') + '<span class="grow"><b class="card-title">Оцените день</b>' +
        '<span class="cap">' + (pm ? 'Сессий для оценки: ' + rate + '. Оценка одним касанием, не больше одного напоминания в день.' : 'В 19:00 придёт просьба оценить сессии, где вы записаны или отмечены.') +
        '</span></span>' + icon('chevR') + '</button>' +
        '<button class="card interactive pth-after-card" data-go="R4/fp14">' + icon('feed') + '<span class="grow"><b class="card-title">Запись в ленте</b>' +
        '<span class="cap">утренний дайджест приходит и записью в ленте</span></span>' + icon('chevR') + '</button>' +
        '<button class="pth-link pth-why-link" data-go="B3">Настроить уведомления</button>' +
        '<div class="pth-end"></div></div></div>';
    }
  });
})();
