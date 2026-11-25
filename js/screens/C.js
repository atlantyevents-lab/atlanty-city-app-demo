/* Блок C — «Программа» v3 (раздел S3): C1 список, C2 фильтры, C3 карточка сессии, C4 избранное, C5 спикер, C6 изменение расписания, C7 сетка.
   Общие вещи раздела (состояние записей и избранного, фильтр, карточка сессии, кнопка «+ Путь», шапка видов) собраны здесь и отдаются файлу D.js через D.prog.
   Состояние: D.st('_prog').f — фильтр (ключи: day, halls, speakers, levers, formats, practices, labels, q, booked, avail, fav);
   D.st('_book') — записи на сессии; D.st('_fav') — избранное и выбор в окнах («Выберите одну»).
   Данные и правила — data/fx_program.js (canBook, bookCheck, canCancel, sessionState); «+ Путь» — общий контракт data/fx_path.js (data-act="path-add"). */
(function () {
  'use strict';
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag, avatar } = D;
  const pl = D.plural;
  const EV = ['событие', 'события', 'событий'];
  const tmin = t => parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3), 10);
  const DAY_LONG = { '25.02': '25 февраля, четверг', '26.02': '26 февраля, пятница', '27.02': '27 февраля, суббота', '28.02': '28 февраля, воскресенье' };
  const dayParam = day => 'd' + day.replace('.', '');
  const transit = (a, b) => (a === b ? 0 : (F.pathTransit ? F.pathTransit(a, b) : F.travelMin(a, b)));
  const go = id => { location.hash = '#/' + id; };
  /* тост после перерисовки: D.rerender() пересобирает рамку и стирает показанный тост, поэтому показываем его чуть позже */
  const say = msg => setTimeout(() => D.toast(msg), 60);
  /* внутри «ёлочек» название с «ёлочками» получает «лапки» */
  const qt = t => '«' + String(t).replace(/«/g, '„').replace(/»/g, '“') + '»';
  const mm = n => n + ' ' + pl(n, ['минута', 'минуты', 'минут']);
  const surname = nm => { const p = String(nm).trim().split(/\s+/); return p.length > 1 ? p[0].charAt(0) + '. ' + p.slice(1).join(' ') : p[0]; };
  const lastName = nm => String(nm).trim().split(/\s+/).slice(-1)[0];
  /* название зала: у «Зоны митапов» полное по заданию, у остальных короткое (одно написание во всех видах) */
  const hallLabel = h => (h.id === 'meetups' ? h.name : (h.short || h.name));
  const ACCESS_TEXT = { biz_fc: 'только Бизнес и Первый класс', fc: 'только Первый класс', sat: 'только программа «Спутник»' };
  const accessText = s => ACCESS_TEXT[s.access] || 'по тарифу';
  const mentorParam = (key, day, time) => 'm_' + key + '_' + day.replace('.', '') + '_' + time.replace(':', '');

  /* «+ Путь»: «в пути» — только принятые, записанные и пройденные пункты; предложенные ИИ показывает pathFindAny */
  const findAny = (t, r, d, tm) => (F.pathFindAny || F.pathFind)(t, r, d, tm);
  const inPath = (t, r, d, tm) => { const it = F.pathFind(t, r, d, tm); return it && it.status !== 'suggested' ? it : null; };

  /* ---------- состояние ---------- */
  const pg = () => D.st('_prog');
  function pf() { const p = pg(); if (!p.f) { p.f = {}; } if (!p.f.day) { p.f.day = F.NOW.day; } return p.f; }
  const qOf = () => String(pf().q || '').trim();

  function bk() {
    const b = D.st('_book');
    if (!b.init) {
      b.init = true; b.booked = b.booked || {}; b.unbooked = b.unbooked || {}; b.wait = b.wait || {}; b.declined = b.declined || {}; b.waitPos = b.waitPos || {};
      if (F.WAITLIST && F.WAITLIST.session) { b.wait[F.WAITLIST.session] = true; }
    }
    return b;
  }
  function isBookedNow(id) { const b = bk(); if (b.unbooked[id]) { return false; } return F.isBooked(id) || !!b.booked[id]; }
  function bookedList() {
    const b = bk(), ids = F.MY_BOOKINGS.slice();
    Object.keys(b.booked).forEach(k => { if (ids.indexOf(k) < 0) { ids.push(k); } });
    return ids.filter(isBookedNow);
  }
  function isWaiting(id) { return !!bk().wait[id]; }
  /* пункт пути записанной сессии получает статус «запись подтверждена» (путь и запись не расходятся) */
  function syncBooked() {
    bookedList().forEach(id => {
      const s = F.session(id), it = s && findAny(F.pathTypeOf(s), id);
      if (it && it.status === 'accepted') { it.status = 'booked'; }
    });
  }

  function fv() {
    const v = D.st('_fav');
    if (!v.init) {
      v.init = true; v.on = {}; v.chosen = {};
      (F.FAV_SEED.ids || []).forEach(i => { v.on[i] = true; });
      (F.FAV_SEED.chosen || []).forEach(i => { const s = F.session(i); if (s) { v.chosen[s.day + '|' + s.time] = i; } });
    }
    return v;
  }
  const isFav = id => !!fv().on[id];

  /* место закрепляется при записи и возвращается при отмене (FR-BOOK-02): у зоны митапов растёт число записавшихся */
  function seatMove(s, d) {
    if (F.isZone(s)) { s.signed = Math.max(0, (s.signed || 0) + d); }
    else if (s.left != null) { s.left = Math.max(0, Math.min(s.cap, s.left - d)); }
  }
  /* запись на сессию и отмена: меняют и состояние записей, и пункт пути (пункт получает статус booked); запись по правилам bookCheck */
  function bookSession(id, o) {
    const s = F.session(id); if (!s) { return null; }
    if (!F.bookCheck(s, o).ok) { return null; }
    const b = bk(); b.booked[id] = true; delete b.unbooked[id]; delete b.wait[id];
    seatMove(s, 1);
    const it = F.pathAdd(F.pathTypeOf(s), id);
    if (it) { it.status = 'booked'; }
    b.last = { kind: 'session', id: id };
    return s;
  }
  function cancelSession(id) {
    const s = F.session(id), b = bk();
    if (!isBookedNow(id)) { return; }
    if (F.isBooked(id)) { b.unbooked[id] = true; } else { delete b.booked[id]; }
    if (s) { seatMove(s, -1); }
    const it = s && findAny(F.pathTypeOf(s), id);
    if (it && it.status === 'booked') { it.status = 'accepted'; }
  }

  /* ---------- фильтр ---------- */
  function filterArg() { return Object.assign({}, pf(), { q: qOf(), isBooked: isBookedNow, isFav: isFav }); }
  function scopeList(day) { const a = filterArg(); if (day) { a.day = day; } return F.progFilter(a); }
  /* сетка показывает один день: «Все дни» в ней превращается в демо-день */
  const gridDay = () => (pf().day === 'all' ? F.NOW.day : pf().day);
  const dayEyebrow = () => (pf().day === 'all' ? 'Все дни' : DAY_LONG[pf().day]) + ' · ' + F.ME.tariff;

  function practiceSet() { return (pf().practices || []); }
  function activeChips() {
    const f = pf(), out = [];
    (f.halls || []).forEach(h => { const x = F.hall(h); out.push(['halls', h, x ? hallLabel(x) : h]); });
    (f.speakers || []).forEach(k => { const p = F.speaker(k); out.push(['speakers', k, p ? p.name : k]); });
    (f.levers || []).forEach(l => out.push(['levers', l, l]));
    (f.formats || []).forEach(x => out.push(['formats', x, x]));
    const pr = practiceSet();
    if (pr.length === F.PRACTICES.length) { out.push(['practices', '*', 'Практики']); }
    else { pr.forEach(x => out.push(['practices', x, 'Практика: ' + x])); }
    (f.labels || []).forEach(l => out.push(['labels', l, 'Метка: ' + l]));
    if (f.booked) { out.push(['booked', '1', 'С записью']); }
    if (f.avail) { out.push(['avail', '1', 'Доступно мне']); }
    if (f.fav) { out.push(['fav', '1', 'Избранное']); }
    const q = qOf();
    if (q) { out.push(['q', '', 'Поиск: «' + (q.length > 16 ? q.slice(0, 15) + '…' : q) + '»']); }
    return out;
  }
  function clearChip(k, v) {
    const f = pf();
    if (k === 'booked' || k === 'avail' || k === 'fav' || k === 'q') { delete f[k]; }
    else if (k === 'practices' && v === '*') { f.practices = []; }
    else if (Array.isArray(f[k])) { f[k] = f[k].filter(x => x !== v); }
  }
  const countFilters = () => activeChips().length;

  /* менторские окна подчиняются тому же фильтру, что и сессии: strict — ещё и «Формат» и «Практики» (окно не сессия формата) */
  function mentorFilterOk(key, strict) {
    const f = pf(), sp = F.speaker(key), q = qOf().toLowerCase();
    if (!sp) { return false; }
    if ((f.speakers || []).length && f.speakers.indexOf(key) < 0) { return false; }
    if ((f.levers || []).length && f.levers.indexOf(sp.lever) < 0) { return false; }
    if ((f.halls || []).length && f.halls.indexOf('magnolia') < 0) { return false; }
    if ((f.labels || []).length && f.labels.indexOf('Бизнес') < 0) { return false; }
    if (f.avail && F.ME.tariff === 'Оптимум') { return false; }
    if (strict && ((f.formats || []).length || (f.practices || []).length)) { return false; }
    if (q && (sp.name + ' ' + sp.company + ' ' + sp.role + ' ' + sp.lever).toLowerCase().indexOf(q) < 0) { return false; }
    return true;
  }
  /* подтверждённые менторские окна в области дня (источник — пункты пути mentor со статусом booked) */
  function mentorBookings(day) {
    return F.PATH_ITEMS.filter(it => it.type === 'mentor' && it.status === 'booked' && (day === 'all' || it.day === day) && mentorFilterOk(it.ref, true))
      .sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
  }

  /* ---------- общие элементы интерфейса ---------- */
  function fmtSeat(s) {
    const st = F.sessionState(s);
    if (st === 'past') { return { text: 'состоялась', cls: '' }; }
    if (F.isZone(s)) { const n = s.signed || 0; return { text: 'по записи · ' + n + ' ' + pl(n, ['записался', 'записались', 'записались']), cls: '' }; }
    if (s.left === 0) { return { text: 'мест нет', cls: 'low' }; }
    const low = s.left / s.cap <= 0.15 && s.left <= 30;
    return { text: (low ? 'мало мест: ' : 'мест: ') + s.left + ' из ' + s.cap, cls: low ? 'low' : '' };
  }
  const isNowRunning = s => F.sessionState(s) === 'live';

  function marksOf(s) {
    const m = [];
    if (isNowRunning(s)) { m.push('<span class="now-line">идёт сейчас</span>'); }
    if (s.changed) { m.push('<span class="mark-changed">' + icon('refresh') + 'изменено</span>'); }
    if (isBookedNow(s.id)) { m.push(tag('вы записаны', 'ok')); }
    else if (isWaiting(s.id)) { m.push(tag('лист ожидания', 'accent')); }
    F.labelsOf(s).forEach(l => { if (l !== 'Бизнес') { m.push(tag(l)); } });
    return m;
  }

  /* «+ Путь» по контракту: найденный пункт — «В пути» (второе нажатие открывает таймлайн дня), иначе кнопка добавления */
  function pathBtn(type, ref, o) {
    o = o || {};
    const it = inPath(type, ref, o.day, o.time);
    if (it) {
      return '<button class="btn btn-secondary btn-sm prg-path is-on" data-go="B4/' + dayParam(it.day) + '" aria-label="Уже в пути, открыть таймлайн дня">' + icon('check') + 'В пути' + icon('chevR') + '</button>';
    }
    return '<button class="btn btn-secondary btn-sm prg-path" data-act="path-add" data-type="' + type + '" data-ref="' + esc(ref) + '"' +
      (o.day ? ' data-day="' + esc(o.day) + '"' : '') + (o.time ? ' data-time="' + esc(o.time) + '"' : '') + '>+ Путь</button>';
  }
  function favBtn(s) {
    if (isBookedNow(s.id) || F.sessionState(s) === 'past') { return ''; }
    const on = isFav(s.id);
    return '<button class="icon-btn prg-fav' + (on ? ' on' : '') + '" data-act="prg-fav" data-arg="' + s.id + '" aria-pressed="' + on + '" aria-label="' + (on ? 'Убрать из избранного' : 'В избранное') + '">' + icon('star') + '</button>';
  }
  const hallLk = h => '<button class="prg-tl" data-go="E3/' + h.id + '">' + icon('pin') + esc(hallLabel(h)) + '</button>';
  /* строка «зал · спикер +N»: ссылки на зал и первого спикера, остальные спикеры — в карточке сессии */
  function linkLine(s) {
    const h = F.hall(s.hall), sp = (s.speakers || []).filter(k => F.speaker(k));
    let out = hallLk(h);
    if (sp.length) {
      out += '<span class="prg-dot">·</span><button class="prg-tl" data-go="C5/' + sp[0] + '">' + esc(surname(F.speaker(sp[0]).name)) + '</button>';
      if (sp.length > 1) { out += '<button class="prg-tl prg-more" data-go="C3/' + s.id + '" aria-label="Все спикеры сессии">+' + (sp.length - 1) + '</button>'; }
    }
    return out;
  }

  /* карточка сессии в списках (C1, C4, D4): текст ведёт в C3, зал и спикер — свои ссылки; закрытая тарифом приглушена и подписана */
  function sessCard(s, o) {
    o = o || {};
    const ok = F.canBook(s), booked = isBookedNow(s.id), seat = fmtSeat(s), mk = marksOf(s), past = F.sessionState(s) === 'past';
    const type = F.pathTypeOf(s);
    const acts = past ? '' : (o.noFav ? '' : favBtn(s)) + (ok || inPath(type, s.id) ? pathBtn(type, s.id) : '');
    return '<article class="prg-card' + (booked ? ' is-mine' : '') + (ok ? '' : ' is-closed') + (past ? ' is-past' : '') + '" data-sid="' + s.id + '">' +
      '<div class="prg-main" data-go="C3/' + s.id + '">' +
      '<div class="prg-top"><span class="prg-time">' + esc(s.time) + '–' + esc(F.sessionEnd(s)) + '</span>' +
      '<span class="prg-seat' + (seat.cls ? ' ' + seat.cls : '') + '">' + esc(seat.text) + '</span></div>' +
      '<div class="prg-title">' + esc(s.title) + '</div>' +
      '<div class="prg-sub">' + esc(s.format) + ' · ' + esc(s.lever) + '</div>' +
      (mk.length ? '<div class="prg-marks">' + mk.join('') + '</div>' : '') +
      (ok ? '' : '<div class="prg-closed">' + icon('lock') + 'Закрыто для вашего тарифа: ' + esc(accessText(s)) + '</div>') +
      '</div>' +
      '<div class="prg-foot"><div class="prg-line">' + linkLine(s) + '</div>' +
      (acts ? '<div class="prg-acts">' + acts + '</div>' : '') + '</div>' +
      '</article>';
  }

  const VIEWS = [['C1', 'Список'], ['C7', 'Сетка'], ['D1', 'Менторские'], ['C4', 'Избранное']];
  function dayChips(noAll) {
    const day = pf().day;
    let h = noAll ? '' : '<button class="chip' + (day === 'all' ? ' on' : '') + '" data-act="c1-day" data-arg="all">Все дни</button>';
    F.DAYS.forEach(d => {
      const on = d.id === (noAll && day === 'all' ? F.NOW.day : day);
      h += '<button class="chip' + (on ? ' on' : '') + '" data-act="c1-day" data-arg="' + d.id + '" aria-label="' + esc(d.label) + ' ' + esc(d.week) + (d.demo ? ', сегодня' : '') + '">' + esc(d.label) + (d.demo ? '<i class="prg-today" aria-hidden="true"></i>' : '') + '</button>';
    });
    return '<div class="chip-rail prg-days">' + h + '</div>';
  }
  function activeRow() {
    const a = activeChips();
    if (!a.length) { return ''; }
    return '<div class="chip-rail prg-active">' + a.map(c =>
      '<button class="chip on" data-act="c1-fclr" data-arg="' + c[0] + ':' + esc(c[1]) + '" aria-label="Снять фильтр: ' + esc(c[2]) + '">' + esc(c[2]) + ' ' + icon('x') + '</button>').join('') + '</div>';
  }
  /* верх всех видов программы, липкий при прокрутке: сегменты закреплены у верха, под ними при прокрутке остаются ряд дней и чипы фильтров;
     строка поиска и «Фильтры» уходит под сегменты (на C1 они же доступны в плавающей панели) */
  function viewTop(active, o) {
    o = o || {};
    const n = countFilters();
    return '<div class="prg-sbw">' + D.segbar(VIEWS, active) + '</div>' +
      '<div class="prg-sub2"><div class="prg-tools"><label class="prg-search">' + icon('search') +
      '<input id="prg-q" class="input" type="search" placeholder="Поиск по программе" value="' + esc(pf().q || '') + '" aria-label="Поиск по программе" autocomplete="off"></label>' +
      '<button class="btn btn-secondary prg-fbtn" data-act="prg-filters" data-arg="' + active + '" aria-label="Фильтры">' + icon('filter') + 'Фильтры' +
      (n ? '<span class="ibadge">' + n + '</span>' : '') + '</button></div>' +
      dayChips(o.noAll) + activeRow() + '</div>';
  }

  /* смена фильтра или дня: запомненное положение прокрутки видов программы сбрасывается */
  function touchFilter() {
    const st = D.st('_scroll');
    ['#/C1', '#/C7', '#/C4', '#/D1'].forEach(k => { st[k] = 0; });
    Object.keys(st).forEach(k => { if (k.indexOf('grid:') === 0) { delete st[k]; } });
  }
  /* перерисовка видов программы после смены фильтра: оболочка сохраняет прокрутку при перерисовке того же маршрута, а после смены дня,
     чипа или поиска список должен начинаться с начала */
  function refilter() {
    touchFilter(); D.rerender();
    if (/^#\/(C1|C7|C4|D1)$/.test(location.hash)) { const s = document.querySelector('.scr'); if (s) { s.scrollTop = 0; } }
  }
  function bindTop(host) {
    const inp = host.querySelector('#prg-q');
    if (inp) {
      const p = pg();
      if (p.focusQ) { p.focusQ = false; inp.focus(); const n = inp.value.length; try { inp.setSelectionRange(n, n); } catch (e) { /* поле без выделения */ } }
      inp.addEventListener('input', () => { pf().q = inp.value; pg().focusQ = true; refilter(); });
    }
    /* ряд дней открывается на выбранном дне */
    const rail = host.querySelector('.prg-days'), on = rail && rail.querySelector('.chip.on');
    if (rail && on && rail.scrollWidth > rail.clientWidth + 2) { rail.scrollLeft += on.getBoundingClientRect().left - rail.getBoundingClientRect().left - 20; }
    keepScroll(host);
  }
  /* положение прокрутки экрана запоминается по адресу: после «+ Путь» и «звезды» список остаётся на месте, возврат из карточки тоже */
  function keepScroll(host) {
    const scr = host.querySelector('.scr'); if (!scr) { return; }
    const store = D.st('_scroll'), k = location.hash;
    if (store[k]) { scr.scrollTop = store[k]; }
    scr.addEventListener('scroll', () => { store[k] = scr.scrollTop; }, { passive: true });
  }

  /* конфликты новой записи с подтверждёнными (FR-BOOK-05, AC-PROG-04): пересечение блокирует, нехватка времени на переход — предупреждение */
  function committed() {
    const out = [];
    bookedList().forEach(id => { const s = F.session(id); if (s) { out.push({ id: id, title: s.title, day: s.day, time: s.time, dur: s.dur, hall: s.hall }); } });
    F.PATH_ITEMS.forEach(it => {
      if (it.status !== 'booked' || it.type === 'task') { return; }
      if (['session', 'practice', 'leisure', 'networking'].indexOf(it.type) >= 0) { return; }
      out.push({ id: it.id, title: it.title, day: it.day, time: it.time, dur: it.dur, hall: it.hall });
    });
    return out;
  }
  function conflictsFor(c, skipId) {
    const hard = [], soft = [], a1 = tmin(c.time), a2 = a1 + c.dur;
    committed().forEach(o => {
      if (o.day !== c.day || o.id === skipId || o.id === c.id) { return; }
      const b1 = tmin(o.time), b2 = b1 + o.dur;
      if (b1 < a2 && a1 < b2) { hard.push(o); return; }
      const need = o.hall && c.hall ? transit(o.hall, c.hall) : null;
      if (b2 <= a1 && need != null && a1 - b2 < need) { soft.push({ o: o, need: need, gap: a1 - b2, before: true }); }
      else if (a2 <= b1 && need != null && b1 - a2 < need) { soft.push({ o: o, need: need, gap: b1 - a2, before: false }); }
    });
    return { hard: hard, soft: soft };
  }
  /* allow: пересечение не блокирует (место из очереди держится ограниченное время), конфликт решается позже в B7 */
  function conflictBanners(cf, allow) {
    return cf.hard.map(o => '<div class="banner warn">' + icon('alert') + '<div><div class="b-title">Пересекается с вашей записью</div><div class="cap">' +
      esc(o.time) + ' · ' + esc(qt(o.title)) + (allow ? '. После подтверждения решите это в «Конфликты и переходы».' : '. Чтобы записаться сюда, отмените ту запись в «Мои записи».') + '</div></div></div>').join('') +
      cf.soft.map(x => '<div class="banner conflict-warn">' + icon('clock') + '<div><div class="b-title">Не успеваете</div><div class="cap">' +
        (x.before ? 'После ' : 'Перед ') + esc(qt(x.o.title)) + ' нужно ' + mm(x.need) + ' на переход, между событиями ' + mm(x.gap) + '.</div></div></div>').join('');
  }

  /* лист записи: подтверждается кнопкой в листе (Q-27), затем тост и перерисовка */
  function bookSheet(s) {
    const h = F.hall(s.hall), cf = conflictsFor(s), seat = fmtSeat(s);
    D.openSheet('<div class="sheet-title">Записаться</div>' +
      '<div class="card"><div class="card-title">' + esc(s.title) + '</div>' +
      '<div class="cap">' + esc(DAY_LONG[s.day] || s.day) + ' · ' + esc(s.time) + '–' + esc(F.sessionEnd(s)) + '</div>' +
      '<div class="cap">' + esc(h.name) + ' · ' + esc(h.place) + '</div>' +
      '<div class="cap">' + esc(seat.text) + (F.isZone(s) ? ' · зона митапов Экспо, открыта всем' : '') + '</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">' + conflictBanners(cf) +
      '<div class="banner">' + icon('bell') + '<div class="cap">Напомним за 60 минут и за 10 минут. Отмена — не позднее чем за 2 часа до начала.</div></div></div>' +
      '<button class="btn btn-primary btn-block" data-act="c3-book-ok" data-arg="' + s.id + '"' + (cf.hard.length ? ' disabled' : '') + '>Подтвердить запись</button>' +
      (cf.hard.length ? '<button class="btn btn-secondary btn-block" data-go="D5">Открыть «Мои записи»</button>' : '') +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Не сейчас</button>');
  }
  function waitSheet(s) {
    const h = F.hall(s.hall);
    D.openSheet('<div class="sheet-title">Лист ожидания</div>' +
      '<div class="card"><div class="card-title">' + esc(s.title) + '</div>' +
      '<div class="cap">' + esc(s.time) + '–' + esc(F.sessionEnd(s)) + ' · ' + esc(h.name) + '</div>' +
      '<div class="cap">Мест нет. Если место освободится, оно сохранится за вами на ' + F.WAITLIST.confirmMin + ' минут, затем уйдёт следующему.</div></div>' +
      '<button class="btn btn-primary btn-block" data-act="c3-wait-ok" data-arg="' + s.id + '">Встать в очередь</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Не сейчас</button>');
  }
  D.action('c3-book', el => {
    const s = F.session(el.dataset.arg); if (!s) { return; }
    const chk = F.bookCheck(s);
    if (!chk.ok) { say(chk.reason === 'past' || chk.reason === 'live' ? 'Запись на эту сессию закрыта' : chk.reason === 'tariff' ? 'Закрыто для вашего тарифа' : 'Мест нет'); return; }
    bookSheet(s);
  });
  D.action('c3-book-ok', el => {
    D.closeSheet();
    const s = bookSession(el.dataset.arg);
    if (s) { D.rerender(); say('Вы записаны · ' + s.time); }
  });
  D.action('c3-wait', el => { const s = F.session(el.dataset.arg); if (s) { waitSheet(s); } });
  D.action('c3-wait-ok', el => {
    D.closeSheet(); const b = bk(), id = el.dataset.arg;
    b.wait[id] = true;
    if (id === F.WAITLIST.session) { b.waitPos[id] = F.WAITLIST.pos + 3; }
    D.rerender(); say('Вы в очереди на сессию');
  });
  D.action('c3-share', () => say('Ссылка на сессию скопирована'));
  D.action('c3-cal', () => say('Файл календаря добавлен'));

  /* ---------- действия фильтра ---------- */
  D.action('c1-day', el => { pf().day = el.dataset.arg; refilter(); if (pf().day === F.NOW.day && location.hash === '#/C1') { scrollToNow(document.querySelector('.scr-host')); } });
  D.action('c1-fclr', el => {
    const i = el.dataset.arg.indexOf(':');
    clearChip(el.dataset.arg.slice(0, i), el.dataset.arg.slice(i + 1)); refilter();
  });
  D.action('prg-filters', el => { pg().from = el.dataset.arg || 'C1'; go('C2'); });
  D.action('prg-reset', () => { const f = pf(); pg().f = { day: f.day }; D.st('C2').sq = ''; D.st('C2').spq = ''; refilter(); });
  /* клик по метке, рычагу или формату в карточке: открывается программа, отфильтрованная только по нему, за все дни;
     форматы «Практик» задаются фильтром «Практики» (один способ выбрать такой формат) */
  D.action('prg-pick', el => {
    const i = el.dataset.arg.indexOf(':');
    let k = el.dataset.arg.slice(0, i); const v = el.dataset.arg.slice(i + 1);
    if (k === 'formats' && F.PRACTICES.indexOf(v) >= 0) { k = 'practices'; }
    pg().f = { day: 'all' }; pg().f[k] = [v]; touchFilter();
    go('C1');
  });
  D.action('prg-fav', el => {
    const v = fv(), id = el.dataset.arg, s = F.session(id);
    if (v.on[id]) { delete v.on[id]; if (s && v.chosen[s.day + '|' + s.time] === id) { delete v.chosen[s.day + '|' + s.time]; } D.rerender(); say('Убрано из избранного'); }
    else { v.on[id] = true; D.rerender(); say('В избранном'); }
  });
  D.action('prg-top', () => { const scr = document.querySelector('.scr'); if (scr) { scr.scrollTop = 0; } });
  D.action('prg-now', () => {
    const f = pf();
    if (f.day !== 'all' && f.day !== F.NOW.day) { f.day = F.NOW.day; refilter(); }
    scrollToNow(document.querySelector('.scr-host'));
  });

  /* экран «не найдено»: вместо чужой карточки по неверному адресу */
  function notFound(title, text, btn) {
    return '<div class="scr prg-scr">' +
      D.head({ backHist: true, eyebrow: 'Программа', title: title, sub: text }) +
      '<div class="prg-c3body"><div class="empty"><div class="e-title">' + esc(title) + '</div><div class="e-text">' + esc(text) + '</div>' +
      '<button class="btn btn-primary" data-go="C1">' + esc(btn || 'К программе') + '</button></div></div></div>';
  }

  /* ---------- C1 Вся программа ---------- */
  function groupByHour(list) {
    const out = []; let cur = null;
    list.forEach(s => {
      const key = s.day + '|' + s.time.slice(0, 2);
      if (!cur || cur.key !== key) { cur = { key: key, day: s.day, hour: s.time.slice(0, 2) + ':00', items: [] }; out.push(cur); }
      cur.items.push(s);
    });
    return out;
  }
  function emptyState(text) {
    return '<div class="empty"><div class="e-title">Ничего не найдено</div><div class="e-text">' + esc(text) + '</div>' +
      '<button class="btn btn-secondary" data-act="prg-reset">Сбросить фильтры</button></div>';
  }
  function listBody(list) {
    if (!list.length) { return emptyState('В выбранные дни по этим фильтрам событий нет. Снимите часть фильтров или смените день.'); }
    const all = pf().day === 'all';
    let h = '', lastDay = null;
    groupByHour(list).forEach(g => {
      if (all && g.day !== lastDay) { lastDay = g.day; h += '<div class="prg-day">' + esc(DAY_LONG[g.day] || g.day) + '</div>'; }
      h += '<div class="prg-hour"><span>' + g.hour + '</span><i>' + g.items.length + ' ' + pl(g.items.length, EV) + '</i></div>' + g.items.map(s => sessCard(s)).join('');
    });
    return h;
  }
  /* прокрутка списка к ближайшей сессии: идёт сейчас или следующая (демо-день) */
  function scrollToNow(host) {
    const scr = host && host.querySelector('.scr'); if (!scr) { return false; }
    const now = F.NOW.time;
    const cards = [].slice.call(scr.querySelectorAll('.prg-card[data-sid]'));
    const card = cards.filter(c => { const s = F.session(c.dataset.sid); return s && s.day === F.NOW.day && tmin(s.time) + s.dur > tmin(now); })[0];
    if (!card) { return false; }
    const sbw = scr.querySelector('.prg-sbw'), sub = scr.querySelector('.prg-sub2'), tools = scr.querySelector('.prg-tools');
    const stuck = (sbw ? sbw.offsetHeight : 0) + (sub ? sub.offsetHeight : 0) - (tools ? tools.offsetHeight : 0);
    const prev = card.previousElementSibling, anchor = prev && prev.classList.contains('prg-hour') ? prev : card;
    scr.scrollTop += anchor.getBoundingClientRect().top - scr.getBoundingClientRect().top - stuck - 8;
    return true;
  }

  D.register('C1', {
    tab: 'C1',
    meta: {
      title: 'C1 · Вся программа',
      role: 'Гость, расписание',
      fr: ['FR-PROG-01', 'FR-PROG-02', 'FR-PROG-05', 'FR-PROG-10', 'FR-PROG-11', 'FR-PROG-12', 'FR-PROG-13', 'FR-PROG-14'],
      ac: ['AC-PROG-03', 'AC-PROG-08', 'AC-PROG-09', 'AC-PROG-10', 'AC-PROG-11', 'AC-PROG-12'],
      what: [
        'Сегменты: Список · Сетка · Менторские · Избранное; значки шапки: карта, уведомления, аватар. При прокрутке сегменты и ряд дней остаются на месте; плавающая панель: «Фильтры», «Сейчас», «Наверх».',
        'Список по часам с днями 25–28.02 и режимом «Все дни»; на демо-дне открывается на ближайшей сессии. Поиск по названию, спикеру, компании.',
        'Фильтры C2 (залы, спикеры, рычаги, формат, «Практики», метки досуга, «С записью», «Доступно мне») работают во всех видах; активные фильтры снимаются чипами.',
        'Компактная карточка: время, название, формат и рычаг, строка «зал · спикер +N» ссылками, звезда и «+ Путь». Состоявшиеся сессии без записи и «+ Путь»; закрытые тарифом приглушены и подписаны.',
        'Питч-сессии и митапы идут в «Зоне митапов · Экспо»: «по записи», без числа мест.'
      ],
      rules: [
        'Сессии Бизнеса и Первого класса видны всем тарифам с пометкой; запись и «+ Путь» — по тарифу (AC-PROG-03).',
        'Круглые столы и воркшопы в программу не входят: они в разделе «КипяTALK» Маркетплейса (H5); менторские — вид «Менторские».',
        'Список, сетка, менторские и избранное используют один фильтр F.progFilter; счётчик «Показать N» считает на тех же данных.',
        'Кнопка «+ Путь» — общий контракт: после нажатия на карточке «В пути», повторное нажатие открывает таймлайн дня (B4).'
      ],
      depends: ['D-07', 'D-26', 'D-36', 'D-41', 'D-42']
    },
    html() {
      syncBooked();
      const list = scopeList();
      const n = countFilters();
      return '<div class="scr prg-scr">' +
        D.head({ eyebrow: esc(dayEyebrow()), title: 'Программа',
          sub: list.length + ' ' + pl(list.length, EV) + (n ? ' · фильтры: ' + n : '') }) +
        viewTop('C1') +
        '<div class="prg-list" id="prg-list">' + listBody(list) + '</div>' +
        '<div class="prg-fab"><button class="icon-btn prg-fabf" data-act="prg-filters" data-arg="C1" aria-label="Фильтры">' + icon('filter') +
        (n ? '<span class="ibadge">' + n + '</span>' : '') + '</button>' +
        '<button class="btn btn-primary btn-sm" data-act="prg-now">Сейчас</button>' +
        '<button class="icon-btn" data-act="prg-top" aria-label="Наверх">' + icon('chevD', 'up') + '</button></div></div>';
    },
    mount(host) {
      bindTop(host);
      const store = D.st('_scroll');
      if (!store[location.hash] && pf().day === F.NOW.day) { scrollToNow(host); }
    }
  });

  /* ---------- C2 Фильтры ---------- */
  D.register('C2', {
    tab: 'C1',
    meta: {
      title: 'C2 · Фильтры программы',
      role: 'Гость, программа',
      fr: ['FR-PROG-02', 'FR-PROG-12', 'FR-PROG-13'],
      ac: ['AC-PROG-09', 'AC-PROG-10', 'AC-PROG-11'],
      what: [
        'Сверху сводка выбранного со снимаемыми чипами; затем день, залы по названиям (в том числе «Зона митапов · Экспо», вместимость «по записи»), спикеры по алфавиту с поиском, шесть рычагов, форматы по пяти группам панели.',
        '«Практики»: шесть форматов одним переключателем и по отдельности; метки досуга: Спорт, Бизнес, Семья, Развлечения.',
        'Переключатели «С записью», «Доступно мне» и «Только избранное».',
        'Фильтры комбинируются по «И»; кнопка «Показать N» считает результат на данных и возвращает в тот вид, откуда открыт экран.'
      ],
      rules: [
        '«Доступно мне» учитывает тариф: закрытые тарифом сессии скрываются (AC-PROG-03).',
        '«Практики» — шесть форматов по таксономии (состав подтвердить, O-20); они не повторяются в разделе «Формат» (AC-PROG-11).',
        'Метка досуга — поле дирекции в фиде; если метки нет, выводится «Бизнес» по умолчанию (FR-PROG-12).',
        'Поиск из одних пробелов фильтром не считается; пустой результат показывает пустое состояние с кнопкой «Сбросить фильтры».'
      ],
      depends: ['D-07', 'D-41', 'D-42', 'D-57']
    },
    html() {
      const f = pf(), st = D.st('C2'), from = pg().from || 'C1';
      const day = from === 'C7' && f.day === 'all' ? F.NOW.day : f.day;
      const fa = filterArg(); fa.day = day; if (from === 'C4') { fa.fav = true; }
      const count = from === 'D1' && D.prog.mentorCount ? D.prog.mentorCount() : F.progFilter(fa).length;
      const unit = from === 'D1' ? ['ментор', 'ментора', 'менторов'] : EV;
      const has = (a, v) => (a || []).indexOf(v) >= 0;
      const sq = (st.sq || '').trim().toLowerCase(), spq = (st.spq || '').trim().toLowerCase();
      const ch = (act, arg, label, on, extra) => '<button class="chip prg-fchip' + (on ? ' on' : '') + '" data-act="' + act + '" data-arg="' + esc(arg) + '">' + label + (extra || '') + '</button>';

      const days = (from === 'C7' ? '' : ch('c1-day', 'all', 'Все дни', f.day === 'all')) +
        F.DAYS.map(d => ch('c1-day', d.id, esc(d.label) + ' ' + esc(d.week), d.id === day)).join('');
      const halls = F.HALLS.filter(h => !sq || (h.name + ' ' + h.place).toLowerCase().indexOf(sq) >= 0).map(h =>
        ch('c2-pick', 'halls:' + h.id, esc(hallLabel(h)), has(f.halls, h.id), ' <span class="cap">' + (h.cap == null ? esc(h.capNote || 'по записи') : h.cap) + '</span>')).join('');
      const spkAll = Object.keys(F.SPEAKERS).filter(k => { const p = F.SPEAKERS[k]; return !spq || (p.name + ' ' + p.company + ' ' + p.lever).toLowerCase().indexOf(spq) >= 0; })
        .sort((a, b) => lastName(F.SPEAKERS[a].name).localeCompare(lastName(F.SPEAKERS[b].name), 'ru'));
      const spkShown = spq || st.spAll ? spkAll : spkAll.filter((k, i) => i < 10 || has(f.speakers, k));
      const spk = spkShown.map(k => ch('c2-pick', 'speakers:' + k, esc(F.SPEAKERS[k].name), has(f.speakers, k))).join('');
      const spkMore = !spq && !st.spAll && spkAll.length > spkShown.length
        ? '<button class="btn btn-ghost btn-sm" data-act="c2-spk-all">Все спикеры · ' + spkAll.length + '</button>' : '';
      const levers = F.LEVERS.map(l => ch('c2-pick', 'levers:' + l, esc(l), has(f.levers, l))).join('');
      /* форматы — пять групп панели (analysis/11); форматы «Практик» не повторяются (AC-PROG-11) */
      const fmtGroups = Object.keys(F.FORMAT_GROUPS_PANEL || {}).map(g => {
        const items = (F.FORMAT_GROUPS_PANEL[g] || []).filter(x => F.FORMATS.indexOf(x) >= 0 && F.PRACTICES.indexOf(x) < 0);
        if (!items.length) { return ''; }
        return '<div class="prg-fsub">' + esc(g) + '</div><div class="prg-fchips">' +
          items.map(x => ch('c2-pick', 'formats:' + x, esc(x), has(f.formats, x))).join('') + '</div>';
      }).join('');
      const pr = practiceSet(), prAll = pr.length === F.PRACTICES.length;
      const prChips = F.PRACTICES.map(x => ch('c2-pick', 'practices:' + x, esc(x), has(f.practices, x))).join('');
      const labels = F.LABELS.map(l => ch('c2-pick', 'labels:' + l, esc(l), has(f.labels, l))).join('');
      const tgl = (key, title, sub) => '<div class="toggle-row"><div style="flex:1"><div class="tr-title">' + title + '</div><div class="tr-sub">' + sub + '</div></div>' +
        '<label class="toggle"><input type="checkbox" data-c2flag="' + key + '"' + (f[key] ? ' checked' : '') + ' aria-label="' + esc(title) + '"><span class="tr"></span></label></div>';
      const act = activeChips();
      const sum = act.length
        ? '<section class="prg-fsec prg-fsum"><div class="prg-fh">Выбрано · ' + act.length + '</div><div class="prg-fchips">' + act.map(c =>
            '<button class="chip on prg-fchip" data-act="c1-fclr" data-arg="' + c[0] + ':' + esc(c[1]) + '" aria-label="Снять фильтр: ' + esc(c[2]) + '">' + esc(c[2]) + ' ' + icon('x') + '</button>').join('') + '</div></section>'
        : '<section class="prg-fsec prg-fsum"><div class="cap">Ничего не выбрано: показаны все сессии выбранного дня.</div></section>';

      return '<div class="scr prg-scr">' +
        D.head({ back: from, eyebrow: 'Программа', title: 'Фильтры', sub: (from === 'D1' ? 'Сузьте список менторов · ' : 'Сузьте список сессий · ') + count + ' ' + pl(count, unit),
          paren: paren('фильтры комбинируются, все виды покажут один набор') }) +
        '<div class="prg-fbody">' + sum +
        '<section class="prg-fsec"><div class="prg-fh">День</div><div class="prg-fchips">' + days + '</div></section>' +
        '<section class="prg-fsec"><div class="prg-fh">Залы</div>' +
        '<input class="input" type="search" id="c2-hq" placeholder="Название зала" value="' + esc(st.sq || '') + '" aria-label="Поиск зала" autocomplete="off">' +
        '<div class="prg-fchips">' + (halls || '<div class="cap">Такого зала нет</div>') + '</div></section>' +
        '<section class="prg-fsec"><div class="prg-fh">Спикеры</div>' +
        '<input class="input" type="search" id="c2-sq" placeholder="Имя или компания" value="' + esc(st.spq || '') + '" aria-label="Поиск спикера" autocomplete="off">' +
        '<div class="prg-fchips">' + (spk || '<div class="cap">Спикера с таким именем нет</div>') + '</div>' + spkMore + '</section>' +
        '<section class="prg-fsec"><div class="prg-fh">Рычаги</div><div class="prg-fchips">' + levers + '</div></section>' +
        '<section class="prg-fsec"><div class="prg-fh">Формат</div>' + fmtGroups + '</section>' +
        '<section class="prg-fsec prg-pract"><div class="toggle-row"><div style="flex:1"><div class="tr-title">Практики</div>' +
        '<div class="tr-sub">Шесть форматов, где вы действуете сами. Питч-сессии проходят в зоне митапов Экспо и открыты всем</div></div>' +
        '<label class="toggle"><input type="checkbox" data-c2flag="practices-all"' + (prAll ? ' checked' : '') + ' aria-label="Практики"><span class="tr"></span></label></div>' +
        '<div class="prg-fchips">' + prChips + '</div></section>' +
        '<section class="prg-fsec"><div class="prg-fh">Метки досуга</div><div class="prg-fchips">' + labels + '</div></section>' +
        '<section class="prg-fsec">' +
        tgl('booked', 'С записью', 'Только события, на которые вы записаны') +
        tgl('avail', 'Доступно мне', 'Скрыть сессии, закрытые для вашего тарифа') +
        tgl('fav', 'Только избранное', 'Сессии со звездой') + '</section>' +
        '</div>' +
        '<div class="prg-fbar"><button class="btn btn-ghost" data-act="prg-reset">Сбросить</button>' +
        '<button class="btn btn-primary" style="flex:1" data-go="' + from + '">Показать ' + count + '</button></div>' +
        '</div>';
    },
    mount(host) {
      const st = D.st('C2');
      const bind = (sel, key, focusKey) => {
        const inp = host.querySelector(sel); if (!inp) { return; }
        if (st.focus === focusKey) { st.focus = null; inp.focus(); const n = inp.value.length; try { inp.setSelectionRange(n, n); } catch (e) { /* без выделения */ } }
        inp.addEventListener('input', () => { st[key] = inp.value; st.focus = focusKey; D.rerender(); });
      };
      bind('#c2-hq', 'sq', 'hq'); bind('#c2-sq', 'spq', 'sq');
      host.querySelectorAll('[data-c2flag]').forEach(inp => inp.addEventListener('change', () => {
        const f = pf(), k = inp.dataset.c2flag;
        if (k === 'practices-all') { f.practices = inp.checked ? F.PRACTICES.slice() : []; }
        else if (inp.checked) { f[k] = true; } else { delete f[k]; }
        touchFilter(); D.rerender();
      }));
      keepScroll(host);
    }
  });
  D.action('c2-pick', el => {
    const i = el.dataset.arg.indexOf(':'), k = el.dataset.arg.slice(0, i), v = el.dataset.arg.slice(i + 1);
    const f = pf(), a = f[k] || (f[k] = []), j = a.indexOf(v);
    if (j >= 0) { a.splice(j, 1); } else { a.push(v); }
    touchFilter(); D.rerender();
  });
  D.action('c2-spk-all', () => { D.st('C2').spAll = true; D.rerender(); });
  /* прежнее имя действия: клик по формату из других экранов */
  D.action('c2-open-format', el => { pg().f = { day: 'all' }; pg().f[F.PRACTICES.indexOf(el.dataset.arg) >= 0 ? 'practices' : 'formats'] = [el.dataset.arg]; touchFilter(); go('C1'); });

  /* ---------- C3 Карточка сессии ---------- */
  const STATUS_RU = { suggested: 'предложен', accepted: 'принят в путь', booked: 'запись подтверждена', done: 'пройден' };
  const rowLink = (go2, time, title, sub) =>
    '<button class="row clickable" data-go="' + go2 + '"><div class="prg-rtime">' + esc(time) + '</div><div class="grow"><div class="r-title">' + esc(title) + '</div>' +
    '<div class="r-sub">' + esc(sub) + '</div></div>' + icon('chevR') + '</button>';
  const rowSess = x => rowLink('C3/' + x.id, x.time, x.title, hallLabel(F.hall(x.hall)) + ' · ' + x.format);
  D.action('c3-par', el => { D.st('C3').par = el.dataset.arg; D.rerender(); });
  /* лист «Что такое формат»: описание, длительность, состав сцены, где идёт (справочник панели) */
  D.action('c3-fmtinfo', el => {
    const f = el.dataset.arg, i = F.FORMAT_INFO[f]; if (!i) { return; }
    const halls = F.SESSIONS.filter(x => x.format === f).map(x => x.hall)
      .filter((v, ix, a) => a.indexOf(v) === ix)
      .map(id => F.hall(id) ? F.hall(id).name : id).join(', ');
    D.openSheet('<div class="sheet-title">' + esc(f) + '</div>' +
      '<div class="cap">' + esc(F.formatPanelGroup(f)) + (i.practice ? ' · в фильтре «Практики»' : '') + '</div>' +
      '<div class="prg-text" style="margin-top:8px">' + esc(i.text) + '</div>' +
      '<div class="card" style="margin-top:10px">' +
      '<div class="cap">Длительность</div><div>' + i.dur + ' ' + pl(i.dur, ['минута', 'минуты', 'минут']) + '</div>' +
      '<div class="cap" style="margin-top:6px">Людей на сцене</div><div>' + esc(i.people) + '</div>' +
      (halls ? '<div class="cap" style="margin-top:6px">Где идёт</div><div>' + esc(halls) + '</div>' : '') + '</div>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Закрыть</button>');
  });

  D.register('C3', {
    tab: 'C1',
    meta: {
      title: 'C3 · Карточка сессии',
      role: 'Гость, событие',
      fr: ['FR-PROG-03', 'FR-PROG-05', 'FR-PROG-11', 'FR-PROG-12', 'FR-PROG-14', 'FR-BOOK-02', 'FR-BOOK-03', 'FR-BOOK-04', 'FR-BOOK-05', 'FR-PATH-11'],
      ac: ['AC-PROG-03', 'AC-PROG-04', 'AC-PROG-08', 'AC-PROG-10', 'AC-PROG-12', 'AC-BOOK-05'],
      what: [
        'Время, длительность, зал со ссылкой на карту (E3, маршрут E4), остаток мест или «по записи» для зоны митапов; число мест меняется при записи и отмене.',
        'Спикеры ссылками на карточку (C5); формат, рычаг и метки досуга чипами: нажатие открывает программу, отфильтрованную по значению.',
        'Описание формата (для питч-сессии: «зона митапов Экспо, открыта всем») и описание сессии.',
        'Ещё в этом зале (до и после) и «Параллельно» — сессии других залов в то же время (с кнопкой «Ещё N»); переходы внутри карточки.',
        'Нижняя панель: «Записаться» (лист подтверждения, пересечения и нехватка времени на переход), «+ Путь», звезда; у записанной — «Отменить запись» через лист и по сроку; у состоявшейся — «Состоялась», заметка и оценка дня; у закрытой тарифом — объяснение; без мест — лист ожидания.',
        'Неверный адрес даёт «Сессия не найдена», а не чужую карточку.'
      ],
      rules: [
        'Запись по нажатию кнопки в листе; жёсткое пересечение с подтверждённой записью блокирует, нехватка времени на переход — предупреждение (FR-BOOK-05).',
        'Отмена записи — только через лист и не позднее чем за 2 часа до начала (FR-BOOK-04), одно правило с D2 и D5; на состоявшуюся и идущую сессию записаться нельзя.',
        'Запись создаёт пункт в «Мой путь» со статусом «запись подтверждена»; у записанной сессии пункт не убирается, пока запись не отменена.',
        'Сессии Бизнеса и Первого класса видны Оптимуму с пометкой, кнопка записи и «+ Путь» для закрытых тарифом недоступны (AC-PROG-03); Оптимум не выступает в деловой программе (D-41).',
        'Метка досуга — поле дирекции; если её нет, ставится «Бизнес» и подписывается «по умолчанию» (FR-PROG-12).'
      ],
      depends: ['D-07', 'D-26', 'D-41', 'D-42', 'тарифная сетка', 'фид программы']
    },
    html(ctx) {
      let s;
      if (ctx.param) {
        s = F.session(ctx.param);
        if (!s) { return notFound('Сессия не найдена', 'Такой сессии нет в программе. Откройте её из списка.'); }
      } else { s = F.session('s2704'); }
      syncBooked();
      const h = F.hall(s.hall), ok = F.canBook(s), booked = isBookedNow(s.id), waiting = isWaiting(s.id);
      const state = F.sessionState(s), past = state === 'past', live = state === 'live';
      const type = F.pathTypeOf(s), seat = fmtSeat(s), info = F.FORMAT_INFO[s.format];
      const pit = inPath(type, s.id), zone = F.isZone(s);
      const ci = F.canCancel(s.day, s.time);

      const speakers = (s.speakers || []).map(k => {
        const p = F.speaker(k); if (!p) { return ''; }
        const mw = F.mentorWindows(k).length;
        return '<button class="spk-row prg-spk" data-go="C5/' + k + '">' + avatar(p.name, 'sm') +
          '<div class="grow"><div class="spk-name">' + esc(p.name) + (mw ? ' <span class="cap">· ментор</span>' : '') + '</div>' +
          '<div class="spk-role">' + esc(p.role) + ' · ' + esc(p.company) + '</div></div>' + icon('chevR') + '</button>';
      }).join('');

      const prev = F.prevInHall(s), next = F.nextInHall(s);
      const hallRows = (prev ? rowSess(prev) : '') + (next ? rowSess(next) : '');
      const parAll = F.overlapping(s), showAll = D.st('C3').par === s.id, par = showAll ? parAll : parAll.slice(0, 6);

      /* заметки-состояния */
      let notes = '';
      if (past) {
        notes += '<div class="banner">' + icon('check') + '<div class="grow"><div class="b-title">Состоялась</div><div class="cap">Сессия уже прошла: запись и «+ Путь» закрыты. Мысли с неё можно сохранить в заметке.</div>' +
          '<div class="prg-inl-row"><button class="btn btn-ghost btn-sm" data-go="M2/' + s.id + '">Заметка</button><button class="btn btn-ghost btn-sm" data-go="M3">Оценить день</button></div></div></div>';
      } else if (live && !booked) {
        notes += '<div class="banner info">' + icon('clock') + '<div><div class="b-title">Идёт сейчас</div><div class="cap">Запись на начавшуюся сессию закрыта.</div></div></div>';
      }
      if (s.changed) {
        notes += '<div class="banner conflict-warn">' + icon('refresh') + '<div class="grow"><div class="b-title">Сессию перенесли</div><div class="cap">' +
          esc(s.changeNote || 'Время или зал изменились.') + '</div><button class="btn btn-ghost btn-sm prg-inl" data-go="C6/' + s.id + '">Что изменилось</button></div></div>';
      }
      if (!ok && !past) {
        notes += '<div class="banner warn">' + icon('lock') + '<div><div class="b-title">Закрыто для вашего тарифа</div>' +
          '<div class="cap">Доступно: ' + esc(accessText(s)) + '. Ваш тариф — ' + esc(F.ME.tariff) + '. Программа и карточка видны всем, запись откроется с другим тарифом.</div></div></div>';
      }
      if (booked) {
        notes += '<div class="banner ok">' + icon('check') + '<div class="grow"><div class="b-title">Вы записаны · в вашем пути</div><div class="cap">Место подтверждено. Напомним за 60 минут и за 10 минут. ' +
          (ci.ok ? 'Отмена — не позднее ' + esc(ci.text) + '.' : 'Отмена закрыта: до начала меньше двух часов.') + '</div>' +
          '<div class="prg-inl-row"><button class="btn btn-ghost btn-sm" data-go="D2/' + s.id + '">Подтверждение</button>' +
          '<button class="btn btn-ghost btn-sm" data-act="c3-cal">В календарь</button>' +
          (ci.ok ? '' : '<button class="btn btn-ghost btn-sm" data-act="d-tg" data-arg="cancel:' + s.id + '">Написать организатору</button>') + '</div></div></div>';
      } else if (waiting) {
        const wp = bk().waitPos[s.id] || F.WAITLIST.pos;
        notes += '<div class="banner info">' + icon('clock') + '<div class="grow"><div class="b-title">Вы в листе ожидания</div><div class="cap">Ваше место в очереди: ' + wp + '. Освободится место — предложим его первым.</div>' +
          '<button class="btn btn-ghost btn-sm prg-inl" data-go="D3">Открыть очередь</button></div></div>';
      }
      if (pit && !booked && !past) {
        notes += '<div class="card prg-pathrow"><div class="grow"><div class="r-title">В вашем пути</div>' +
          '<div class="cap">' + esc(pit.day) + ', ' + esc(pit.time) + ' · ' + esc(STATUS_RU[pit.status] || pit.status) + ' · ' + esc((pit.reason && pit.reason.text) || '') + '</div>' +
          (!ok ? '<div class="cap prg-err">Закрыто для вашего тарифа: пункт остаётся с конфликтом (B7)</div>' : '') + '</div>' +
          '<button class="btn btn-ghost btn-sm" data-act="path-remove" data-id="' + esc(pit.id) + '">Убрать из пути</button></div>';
      }

      /* нижняя панель действий */
      let main;
      if (past) { main = '<button class="btn btn-secondary prg-main-btn" data-go="M2/' + s.id + '">Заметка</button><button class="btn btn-secondary prg-main-btn" data-go="M3">Оценить день</button>'; }
      else if (booked) {
        main = ci.ok ? '<button class="btn btn-secondary prg-main-btn" data-act="d-cancel" data-arg="s|' + s.id + '">Отменить запись</button>'
          : '<button class="btn btn-secondary prg-main-btn" disabled>Отмена закрыта</button>';
      }
      else if (waiting) { main = '<button class="btn btn-secondary prg-main-btn" data-go="D3">Лист ожидания</button>'; }
      else if (!ok) { main = '<button class="btn btn-secondary prg-main-btn" data-go="L3">Условия тарифа</button>'; }
      else if (live) { main = '<button class="btn btn-secondary prg-main-btn" disabled>Запись закрыта</button>'; }
      else if (s.left === 0 && !zone) { main = '<button class="btn btn-primary prg-main-btn" data-act="c3-wait" data-arg="' + s.id + '">Встать в очередь</button>'; }
      else { main = '<button class="btn btn-primary prg-main-btn" data-act="c3-book" data-arg="' + s.id + '">Записаться</button>'; }
      const cta = '<div class="prg-cta">' + main + (!past && (ok || pit) ? pathBtn(type, s.id) : '') + favBtn(s) + '</div>';

      const lbl = F.labelsOf(s).map(l => '<button class="chip" data-act="prg-pick" data-arg="labels:' + esc(l) + '">' + esc(l) +
        (s.labelSrc === 'default' ? ' · по умолчанию' : '') + '</button>').join('');

      return '<div class="scr prg-scr prg-c3">' +
        D.head({ backHist: true, eyebrow: 'Программа · ' + esc(s.day) + ' · ' + esc(F.DAYS.find(d => d.id === s.day).week), title: esc(s.format),
          sub: esc(s.time) + '–' + esc(F.sessionEnd(s)) + ' · ' + esc(hallLabel(h)),
          actions: '<button class="btn btn-secondary btn-sm" data-go="M2/' + s.id + '">' + icon('file') + 'Заметка</button>' +
            (past ? '' : '<button class="icon-btn" data-act="c3-cal" aria-label="В календарь">' + icon('calendar') + '</button>') +
            '<button class="icon-btn" data-act="c3-share" aria-label="Поделиться">' + icon('share') + '</button>' }) +
        '<div class="prg-c3body">' +
        '<div class="prg-c3title">' + esc(s.title) + '</div>' +
        '<div class="prg-c3tags"><button class="chip on" data-act="prg-pick" data-arg="formats:' + esc(s.format) + '" aria-label="Все сессии формата">' + esc(s.format) + '</button>' +
        '<button class="chip" data-act="prg-pick" data-arg="levers:' + esc(s.lever) + '">' + esc(s.lever) + '</button>' + lbl +
        (F.isPractice(s) ? '<span class="tag accent">Практика</span>' : '') + '</div>' +
        '<div class="cap" style="margin-top:2px">Формат · ' + esc(F.formatPanelGroup ? F.formatPanelGroup(s.format) : '') + '</div>' +
        notes +

        '<div class="card prg-c3when"><div class="prg-c3row"><div><div class="prg-time">' + esc(s.time) + '–' + esc(F.sessionEnd(s)) + '</div>' +
        '<div class="cap">' + s.dur + ' ' + pl(s.dur, ['минута', 'минуты', 'минут']) + ' · ' + esc(DAY_LONG[s.day]) + '</div></div>' +
        '<div class="prg-seat' + (seat.cls ? ' ' + seat.cls : '') + '">' + esc(seat.text) + '</div></div>' +
        '<button class="prg-hallbtn" data-go="E3/' + h.id + '">' + icon('pin') + '<span class="grow"><b>' + esc(h.name) + '</b><span class="cap">' + (zone ? 'зона митапов Экспо, открыта всем' : esc(h.place) + ' · до ' + h.cap + ' ' + pl(h.cap, ['место', 'места', 'мест'])) + '</span></span>' +
        '<span class="prg-onmap">На карте</span>' + icon('chevR') + '</button></div>' +

        (info ? '<div class="card"><div class="cap">О формате · ' + esc(F.formatPanelGroup ? F.formatPanelGroup(s.format) : '') + '</div><div class="prg-text">' + esc(info.text) + '</div>' +
        '<div style="margin-top:8px"><button class="btn btn-ghost btn-sm" data-act="c3-fmtinfo" data-arg="' + esc(s.format) + '">Что такое формат</button></div></div>' : '') +

        (speakers ? '<div><div class="sec-title" style="margin-top:0">' + (s.speakers.length > 1 ? 'Спикеры' : 'Спикер') + '</div><div class="card" style="padding:4px 14px">' + speakers + '</div></div>' : '') +

        '<div><div class="sec-title" style="margin-top:0">О событии</div><div class="card"><div class="prg-text">' + esc(s.desc) + '</div></div></div>' +

        (hallRows ? '<div><div class="sec-title" style="margin-top:0">Ещё в этом зале</div><div class="card" style="padding:2px 14px"><div class="list">' + hallRows + '</div></div></div>' : '') +
        (par.length ? '<div><div class="sec-title" style="margin-top:0">Параллельно</div><div class="card" style="padding:2px 14px"><div class="list">' + par.map(rowSess).join('') + '</div>' +
          (!showAll && parAll.length > par.length ? '<button class="btn btn-ghost btn-sm" data-act="c3-par" data-arg="' + s.id + '">Ещё ' + (parAll.length - par.length) + '</button>' : '') + '</div></div>' : '') +

        '<div class="card"><div class="cap">Как добраться</div><div class="prg-text">' + esc(h.name) + ' — ' + esc(h.place) + (h.note ? '. ' + esc(h.note) : '') + '</div>' +
        '<div class="grid-2"><button class="btn btn-secondary btn-sm" data-go="E4/' + h.id + '">' + icon('route') + 'Маршрут</button>' +
        '<button class="btn btn-secondary btn-sm" data-go="E1">' + icon('map') + 'План Завидово</button></div></div>' +
        '</div>' + cta + '</div>';
    },
    mount(host) { keepScroll(host); }
  });

  /* ---------- C4 Избранное ---------- */
  const winKey = s => s.day + '|' + s.time;
  /* окна: одна дата и одно время начала; в окне из двух и более сессий выбор остаётся за человеком (FR-PATH-11) */
  function windowsOf(list) {
    const map = {}, order = [];
    list.forEach(s => { const k = winKey(s); if (!map[k]) { map[k] = { key: k, day: s.day, time: s.time, items: [] }; order.push(k); } map[k].items.push(s); });
    return order.map(k => map[k]);
  }
  function chosenOf(w) {
    const v = fv(), c = v.chosen[w.key];
    if (c && w.items.some(s => s.id === c)) { return c; }
    const b = w.items.filter(s => isBookedNow(s.id));
    return b.length ? b[0].id : null;
  }
  function favList() {
    const a = filterArg(); a.fav = true; return F.progFilter(a);
  }
  const mentorPseudo = it => ({ id: 'm:' + it.id, title: it.title, day: it.day, time: it.time, dur: it.dur || 30, hall: 'magnolia', mentor: it });
  /* выбранные сессии и подтверждённые менторские окна: одиночные и выбранные в окнах «Выберите одну» */
  function effectiveOf(list, ments) {
    const eff = [];
    windowsOf(list).forEach(w => {
      if (w.items.length === 1) { eff.push(w.items[0]); return; }
      const c = chosenOf(w); if (c) { eff.push(F.session(c)); }
    });
    (ments || []).forEach(it => eff.push(mentorPseudo(it)));
    return eff.sort((a, b) => a.day.localeCompare(b.day) || tmin(a.time) - tmin(b.time));
  }
  /* предупреждения: пересечения и нехватка времени на переход (AC-PROG-04), с записями к менторам */
  function favWarnings(list, ments) {
    const eff = effectiveOf(list, ments), out = [];
    for (let i = 1; i < eff.length; i++) {
      const p = eff[i - 1], c = eff[i];
      if (p.day !== c.day) { continue; }
      const gap = tmin(c.time) - (tmin(p.time) + p.dur), need = transit(p.hall, c.hall);
      if (gap < 0) { out.push('Пересечение: ' + qt(p.title) + ' и ' + qt(c.title) + ' накладываются на ' + mm(-gap)); }
      else if (need != null && gap < need) {
        out.push('Не успеваете: между «' + hallLabel(F.hall(p.hall)) + '» и «' + hallLabel(F.hall(c.hall)) + '» нужно ' + mm(need) + ', а между событиями ' + mm(gap));
      }
    }
    return out;
  }
  function noticeHTML(list) {
    const v = fv();
    const n = (F.SCHEDULE_NOTICES || [])[0];
    if (!n || v.noticeOff) { return ''; }
    const s = F.session(n.sid);
    if (!s || !list.some(x => x.id === s.id)) { return ''; }
    const nx = F.nextInHall(s);
    return '<div class="banner conflict-warn prg-notice">' + icon('refresh') + '<div class="grow">' +
      '<div class="b-title">Ваша сессия перенесена на полчаса</div>' +
      '<div class="cap">' + esc(qt(s.title)) + ': было ' + esc(n.was) + ', стало ' + esc(n.now) + ' · ' + esc(F.hall(s.hall).name) + '. Уведомление в ' + esc(n.at) + '.</div>' +
      (v.nextShown && nx ? '<div class="prg-next"><div class="cap">Следующая в этом зале</div>' +
        '<button class="row clickable" data-go="C3/' + nx.id + '"><div class="prg-rtime">' + esc(nx.time) + '</div><div class="grow"><div class="r-title">' + esc(nx.title) + '</div>' +
        '<div class="r-sub">' + esc(F.hall(nx.hall).name) + ' · ' + esc(nx.format) + '</div></div>' + icon('chevR') + '</button></div>' : '') +
      '<div class="prg-inl-row">' +
      (nx && !v.nextShown ? '<button class="btn btn-secondary btn-sm" data-act="c4-next">Показать следующую в этом зале</button>' : '') +
      '<button class="btn btn-ghost btn-sm" data-go="C6/' + s.id + '">Что изменилось</button>' +
      '<button class="btn btn-ghost btn-sm" data-act="c4-notice-off">Понятно</button></div></div></div>';
  }
  D.action('c4-next', () => { fv().nextShown = true; D.rerender(); });
  D.action('c4-notice-off', () => { fv().noticeOff = true; D.rerender(); say('Уведомление скрыто'); });
  D.action('c4-choose', el => {
    const v = fv(), s = F.session(el.dataset.arg), k = winKey(s);
    /* запись и выбор в окне согласованы: при действующей записи другую сессию окна выбрать нельзя, пока запись не отменена */
    const other = F.SESSIONS.filter(x => winKey(x) === k && x.id !== s.id && isBookedNow(x.id) && (isFav(x.id) || true))[0];
    if (other && !isBookedNow(s.id)) { say('В этом окне у вас запись: отмените её'); return; }
    if (v.chosen[k] === s.id) { delete v.chosen[k]; D.rerender(); say('Выбор снят'); } else { v.chosen[k] = s.id; D.rerender(); say('Выбрана: ' + s.time); }
  });
  D.action('c4-all-cal', () => say('Выбранные добавлены в календарь'));

  function optCard(s, chosen) {
    return '<div class="prg-opt' + (chosen ? ' is-chosen' : '') + '">' +
      '<button class="prg-radio" data-act="c4-choose" data-arg="' + s.id + '" role="radio" aria-checked="' + chosen + '" aria-label="' + (chosen ? 'Выбрана: ' : 'Выбрать: ') + esc(s.title) + '">' +
      (chosen ? icon('check') : '') + '</button>' + sessCard(s) + '</div>';
  }
  /* запись к ментору в избранном: отдельный тип карточки, ведёт в D2 */
  function mentorCard(it) {
    const sp = F.speaker(it.ref), w = F.mentorSlots(it.ref).filter(x => x.day === it.day && x.time === it.time)[0];
    return '<article class="prg-card is-mine prg-mcard">' +
      '<div class="prg-main" data-go="D2/' + mentorParam(it.ref, it.day, it.time) + '">' +
      '<div class="prg-top"><span class="prg-time">' + esc(it.time) + '–' + esc(F.fmtTime(tmin(it.time) + 30)) + '</span><span class="prg-seat">менторская встреча</span></div>' +
      '<div class="prg-title">' + esc(it.title) + '</div>' +
      '<div class="prg-sub">' + (w ? 'стол ' + w.table + ' · ' : '') + '30 минут · один на один</div>' +
      '<div class="prg-marks">' + tag('вы записаны', 'ok') + '</div></div>' +
      '<div class="prg-foot"><div class="prg-line">' + hallLk(F.hall('magnolia')) + '<span class="prg-dot">·</span><button class="prg-tl" data-go="C5/' + it.ref + '">' + esc(surname(sp.name)) + '</button></div></div></article>';
  }
  function favEntries(list, ments) {
    const ent = windowsOf(list).map(w => ({ kind: 'win', day: w.day, time: w.time, w: w }));
    ments.forEach(it => ent.push({ kind: 'mentor', day: it.day, time: it.time, it: it }));
    return ent.sort((a, b) => a.day.localeCompare(b.day) || a.time.localeCompare(b.time) || (a.kind === 'win' ? -1 : 1));
  }
  function favBody(list, ments) {
    const all = pf().day === 'all';
    let h = '', lastDay = null;
    favEntries(list, ments).forEach(e => {
      if (all && e.day !== lastDay) { lastDay = e.day; h += '<div class="prg-day">' + esc(DAY_LONG[e.day]) + '</div>'; }
      if (e.kind === 'mentor') { h += '<div class="prg-hour"><span>' + esc(e.time) + '</span></div>' + mentorCard(e.it); return; }
      const w = e.w;
      if (w.items.length === 1) { h += '<div class="prg-hour"><span>' + esc(w.time) + '</span></div>' + sessCard(w.items[0]); return; }
      const c = chosenOf(w), n = w.items.length;
      h += '<section class="prg-win' + (c ? '' : ' is-open') + '"><div class="prg-hour"><span>' + esc(w.time) + '</span><i>Выберите одну · ' + n + ' ' + pl(n, ['вариант', 'варианта', 'вариантов']) + '</i>' +
        (c ? tag('выбор сделан', 'ok') : tag('выбор не сделан', 'warn')) + '</div>' +
        w.items.map(s => optCard(s, s.id === c)).join('') + '</section>';
    });
    return h;
  }
  /* пустой экран говорит правду: в избранном пусто совсем, всё скрыто фильтром или пусто только в этот день */
  function favEmpty(total, hidden, otherDays) {
    if (!total) {
      return '<div class="empty"><div class="e-title">В избранном пусто</div><div class="e-text">Отметьте сессии звездой в списке или в карточке: они соберутся здесь по часам. Записи на сессии попадают сюда сами.</div>' +
        '<button class="btn btn-primary" data-go="C1">К программе</button></div>';
    }
    if (hidden > 0) {
      return '<div class="empty"><div class="e-title">Под фильтр ничего не подошло</div><div class="e-text">Скрыто фильтром: ' + hidden + '. Снимите фильтры, и избранное вернётся.</div>' +
        '<button class="btn btn-primary" data-act="prg-reset">Сбросить фильтры</button></div>';
    }
    return '<div class="empty"><div class="e-title">На этот день пусто</div><div class="e-text">В избранном на других днях: ' + otherDays + '. Откройте все дни или выберите другой.</div>' +
      '<button class="btn btn-primary" data-act="c1-day" data-arg="all">Все дни</button></div>';
  }

  D.register('C4', {
    tab: 'C1',
    meta: {
      title: 'C4 · Избранное',
      role: 'Гость, личное расписание',
      fr: ['FR-PATH-11', 'FR-PROG-04', 'FR-PROG-10', 'FR-NTF-03', 'FR-BOOK-05'],
      ac: ['AC-PATH-11', 'AC-PROG-04', 'AC-PROG-09'],
      what: [
        'Сегмент «Избранное» вместо прежнего «Мой день»: избранные и записанные сессии по часам плюс записи к менторам отдельным типом карточки; фильтры и дни как в других видах.',
        'Окно, где отмечены несколько параллельных сессий, собрано в группу «Выберите одну» с отметкой выбора; выбор запоминается; при действующей записи в окне другую выбрать нельзя.',
        'Пересечения и нехватка времени на переход (в том числе с записью к ментору) выводятся предупреждением по выбранному, со ссылкой на «Конфликты и переходы» (B7).',
        'Уведомление «ваша сессия перенесена на полчаса» с кнопкой «Показать следующую в этом зале» и ссылкой на C6.',
        'Пустой экран говорит причину: пусто совсем, скрыто фильтром (с числом) или пусто только в этот день.'
      ],
      rules: [
        'Записи на сессии попадают в избранное сами и в нём не снимаются: отмена записи — в карточке сессии или в «Мои записи» (D5).',
        'Окно — сессии с одним временем начала; из окна можно выбрать одну, остальные остаются в избранном без выбора.',
        'Предупреждения строятся по выбранным сессиям и записям к менторам матрицей переездов издания (AC-PROG-04).',
        'Уведомление о переносе приходит не позднее 60 секунд после правки в панели (AC-PATH-11).'
      ],
      depends: ['D-36', 'матрица переездов', 'фид программы']
    },
    html() {
      syncBooked();
      const f = pf();
      const list = favList(), ments = mentorBookings(f.day);
      const warns = favWarnings(list, ments);
      const nb = list.filter(s => isBookedNow(s.id)).length + ments.length;
      const base = { fav: true, isFav: isFav, isBooked: isBookedNow };
      const allMent = F.PATH_ITEMS.filter(it => it.type === 'mentor' && it.status === 'booked');
      const total = F.progFilter(Object.assign({ day: 'all' }, base)).length + allMent.length;
      const dayOnly = F.progFilter(Object.assign({ day: f.day }, base)).length + allMent.filter(it => f.day === 'all' || it.day === f.day).length;
      const shown = list.length + ments.length, hidden = Math.max(0, dayOnly - shown);
      const empty = shown === 0;
      return '<div class="scr prg-scr">' +
        D.head({ eyebrow: esc(dayEyebrow()), title: 'Программа',
          sub: 'избранное: ' + list.length + ' ' + pl(list.length, ['сессия', 'сессии', 'сессий']) + ' · записей: ' + nb + (hidden ? ' · скрыто фильтром: ' + hidden : '') }) +
        viewTop('C4') +
        '<div class="prg-list">' + noticeHTML(list) +
        (empty ? favEmpty(total, hidden, total - dayOnly) : (warns.length
          ? '<div class="banner conflict-warn">' + icon('alert') + '<div class="grow">' + warns.map(w => '<div class="prg-warn">' + esc(w) + '</div>').join('') +
            '<button class="btn btn-ghost btn-sm prg-inl" data-go="B7">Конфликты и переходы</button></div></div>'
          : '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Конфликтов нет</div><div class="cap">Между выбранными сессиями хватает времени на переходы.</div></div></div>')) +
        (empty ? '' : favBody(list, ments)) +
        (empty ? '' : '<button class="btn btn-secondary btn-block" data-act="c4-all-cal">' + icon('calendar') + 'Выбранные в календарь</button>' +
          '<button class="btn btn-ghost btn-block" data-go="D5">Мои записи</button>') +
        '</div></div>';
    },
    mount(host) { bindTop(host); }
  });

  /* ---------- C7 Сетка программы ---------- */
  D.action('c7-scale', el => { pg().scale = el.dataset.arg === 'large' ? 'large' : 'compact'; D.rerender(); });
  /* срез: всё, что идёт в выбранное время (сравнение параллельных сессий одним списком) */
  D.action('c7-slice', el => {
    const day = gridDay(); let t = el.dataset.arg;
    if (t === 'now') { t = F.NOW.time; }
    const tm = tmin(t), order = F.HALLS.map(h => h.id);
    const items = scopeList(day).filter(s => tmin(s.time) <= tm && tm < tmin(s.time) + s.dur).sort((a, b) => order.indexOf(a.hall) - order.indexOf(b.hall));
    const halls = {}; items.forEach(s => { halls[s.hall] = 1; });
    const nh = Object.keys(halls).length;
    D.openSheet('<div class="sheet-title">В ' + esc(t) + '</div>' +
      '<div class="cap" style="margin-bottom:8px">' + esc(DAY_LONG[day]) + ' · ' + (items.length ? items.length + ' ' + pl(items.length, ['сессия', 'сессии', 'сессий']) + ' в ' + nh + ' ' + pl(nh, ['зале', 'залах', 'залах']) : 'сессий в это время нет') + '</div>' +
      (items.length ? '<div class="card" style="padding:2px 14px"><div class="list">' + items.map(s =>
        '<button class="row clickable" data-go="C3/' + s.id + '"><div class="grow"><div class="r-title">' + esc(s.title) + '</div>' +
        '<div class="r-sub">' + esc(hallLabel(F.hall(s.hall))) + ' · ' + esc(s.time) + '–' + esc(F.sessionEnd(s)) +
        ((s.speakers || []).length ? ' · ' + esc(s.speakers.map(k => lastName(F.speaker(k).name)).join(', ')) : '') + '</div></div>' + icon('chevR') + '</button>').join('') + '</div></div>' : '') +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Закрыть</button>');
  });

  D.register('C7', {
    tab: 'C1',
    meta: {
      title: 'C7 · Сетка программы',
      role: 'Гость, расписание',
      fr: ['FR-PROG-10', 'FR-PROG-02', 'FR-PROG-14'],
      ac: ['AC-PROG-07', 'AC-PROG-09', 'AC-PROG-12'],
      what: [
        'Время по вертикали, залы по горизонтали; параллельные сессии рядом; шкала времени и названия залов закреплены, внутри прокрутка. Переключатель масштаба «Компактно / Крупно» (крупно: шире колонки, название до 4 строк, фамилии спикеров).',
        'Строка «Сейчас идёт N сессий в M залах» и нажатие на время слева открывают срез: все сессии в это время одним списком.',
        'Отдельная колонка «Зона митапов · Экспо» с подписью «по записи» (питч-сессии и митапы, открыты всем).',
        'Тот же фильтр и поиск, что у списка C1: число блоков сессий равно числу сессий списка за день.',
        'Рамка — запись, звезда — избранное, «!» — пересечение или нехватка времени в моей программе (в том числе с записью к ментору), замок и штриховка — закрыто тарифом; запись к ментору — отдельный блок в колонке Магнолии.',
        'Блок ведёт в C3, заголовок зала — на карту (E3).'
      ],
      rules: [
        'Сетка и список используют один F.progFilter — один источник истины.',
        'Сетка показывает один день: режим «Все дни» превращается в демо-день.',
        'Пустые клетки времени не рисуются — только реальные сессии; в одном зале сессии не пересекаются (проверка данных).'
      ],
      depends: ['D-41', 'FR-PROG-14']
    },
    html() {
      syncBooked();
      const day = gridDay();
      const list = scopeList(day), ments = mentorBookings(day);
      const n = countFilters();
      const large = pg().scale === 'large';
      const nowRun = day === F.NOW.day ? list.filter(isNowRunning) : [];
      const nowHalls = {}; nowRun.forEach(s => { nowHalls[s.hall] = 1; });
      const nh = Object.keys(nowHalls).length;
      let gridHtml = '', hallCount = 0;
      if (list.length || ments.length) {
        const PX = large ? 2.4 : 46 / 30, ROW = Math.round(PX * 30), HEAD_H = 44, COL_W = large ? 200 : 150, TIME_W = 56, LH = large ? 16.9 : 14.4;
        const hallIds = {}; list.forEach(s => { hallIds[s.hall] = 1; }); if (ments.length) { hallIds.magnolia = 1; }
        const halls = F.HALLS.filter(h => hallIds[h.id]);
        hallCount = halls.length;
        const pseudo = ments.map(mentorPseudo), all = list.concat(pseudo);
        const startMin = Math.floor(Math.min.apply(null, all.map(s => tmin(s.time))) / 30) * 30;
        const endMin = Math.ceil(Math.max.apply(null, all.map(s => tmin(s.time) + s.dur)) / 30) * 30;
        const slots = (endMin - startMin) / 30;
        const ini = nm => nm.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase();

        /* дорожки внутри зала: сессии и записи к менторам Магнолии не накладываются друг на друга */
        const laneOf = {}, laneCount = {}, byHall = {};
        all.forEach(s => { (byHall[s.hall] = byHall[s.hall] || []).push(s); });
        Object.keys(byHall).forEach(hid => {
          const arr = byHall[hid].slice().sort((a, b) => tmin(a.time) - tmin(b.time) || a.id.localeCompare(b.id)), laneEnd = [];
          arr.forEach(s => {
            const st = tmin(s.time), en = st + s.dur;
            let li = laneEnd.findIndex(e => e <= st);
            if (li < 0) { li = laneEnd.length; laneEnd.push(en); } else { laneEnd[li] = en; }
            laneOf[s.id] = li;
          });
          laneCount[hid] = laneEnd.length;
        });

        /* моя программа дня: записи, выбранные избранные и записи к менторам; метка «!» — пересечение или нехватка времени на переход */
        const dayFav = F.SESSIONS.filter(s => s.day === day && (isFav(s.id) || isBookedNow(s.id)));
        const allDayMent = F.PATH_ITEMS.filter(it => it.type === 'mentor' && it.status === 'booked' && it.day === day);
        const effective = effectiveOf(dayFav, allDayMent);
        const ovl = {};
        for (let i = 0; i < effective.length; i++) {
          const a1 = tmin(effective[i].time), a2 = a1 + effective[i].dur;
          for (let j = i + 1; j < effective.length; j++) {
            const b1 = tmin(effective[j].time);
            if (b1 < a2) { ovl[effective[i].id] = ovl[effective[j].id] = true; }
            else if (effective[i].hall !== effective[j].hall) {
              const need = transit(effective[i].hall, effective[j].hall) || 0;
              if (b1 - a2 < need) { ovl[effective[i].id] = ovl[effective[j].id] = true; }
            }
          }
        }

        let cells = '<div class="pg-corner"></div>';
        halls.forEach((h, i) => {
          cells += '<button class="pg-hall prg-hallh" data-go="E3/' + h.id + '" style="grid-column:' + (i + 2) + ';grid-row:1">' + esc(hallLabel(h)) +
            '<span class="pg-cap">' + (h.cap == null ? esc(h.capNote || 'по записи') : h.cap + ' ' + pl(h.cap, ['место', 'места', 'мест'])) + '</span></button>';
        });
        for (let r = 0; r < slots; r++) {
          const m = startMin + r * 30, hhmm = String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
          cells += '<button class="pg-time" style="grid-row:' + (r + 2) + '" data-act="c7-slice" data-arg="' + hhmm + '" aria-label="Что идёт в ' + hhmm + '">' + hhmm + '</button>';
          halls.forEach((h, i) => { cells += '<div class="pg-cell" style="grid-column:' + (i + 2) + ';grid-row:' + (r + 2) + '"></div>'; });
        }
        const pos = s => {
          const hIdx = halls.findIndex(h => h.id === s.hall), lanes = laneCount[s.hall] || 1, pitch = (COL_W - 10) / lanes;
          return { top: HEAD_H + (tmin(s.time) - startMin) * PX, hgt: s.dur * PX, left: TIME_W + hIdx * COL_W + 5 + laneOf[s.id] * pitch, width: pitch - 4 };
        };
        const blocks = list.map(s => {
          const p = pos(s), lines = Math.max(1, Math.min(large ? 5 : 4, Math.floor((p.hgt - 30) / LH)));
          const who = large ? (s.speakers || []).map(k => { const sp = F.speaker(k); return sp ? lastName(sp.name) : ''; }).filter(Boolean).join(', ')
            : (s.speakers || []).map(k => { const sp = F.speaker(k); return sp ? ini(sp.name) : ''; }).filter(Boolean).join(' ');
          const mine = isBookedNow(s.id), fav = isFav(s.id), closed = !F.canBook(s);
          return '<div class="pg-block prg-blk' + (mine ? ' mine' : '') + (ovl[s.id] ? ' ovl' : '') + (closed ? ' is-closed' : '') + (F.isZone(s) ? ' is-zone' : '') + '" ' +
            'data-go="C3/' + s.id + '" data-hall="' + s.hall + '" data-sid="' + s.id + '" data-top="' + Math.round(p.top) + '" ' +
            'style="left:' + Math.round(p.left) + 'px;top:' + Math.round(p.top) + 'px;width:' + Math.round(p.width) + 'px;height:' + Math.round(p.hgt) + 'px">' +
            '<div class="pg-btitle" style="-webkit-line-clamp:' + lines + '">' + esc(s.title) + '</div>' +
            '<div class="pg-bbot"><span class="pg-inits">' + esc(who) + '</span>' +
            '<span class="prg-bic">' + (fav ? icon('star', 'fill') : '') + (closed ? icon('lock') : '') + '</span>' +
            '<span class="pg-btime">' + esc(s.time) + '</span></div></div>';
        }).join('');
        const mblocks = pseudo.map(ps => {
          const p = pos(ps), sp = F.speaker(ps.mentor.ref);
          return '<div class="prg-mblk' + (ovl[ps.id] ? ' ovl' : '') + '" data-go="D2/' + mentorParam(ps.mentor.ref, ps.day, ps.time) + '" ' +
            'style="left:' + Math.round(p.left) + 'px;top:' + Math.round(p.top) + 'px;width:' + Math.round(p.width) + 'px;height:' + Math.round(p.hgt) + 'px">' +
            '<div class="pg-btitle" style="-webkit-line-clamp:' + Math.max(1, Math.floor((p.hgt - 22) / LH)) + '">Ментор: ' + esc(lastName(sp.name)) + '</div>' +
            '<div class="pg-bbot"><span class="pg-inits">вы записаны</span><span class="pg-btime">' + esc(ps.time) + '</span></div></div>';
        }).join('');
        let nowLine = '';
        if (day === F.NOW.day) {
          const nm = tmin(F.NOW.time);
          if (nm >= startMin && nm <= endMin) { nowLine = '<div class="pg-now" style="top:' + Math.round(HEAD_H + (nm - startMin) * PX) + 'px"><span>' + esc(F.NOW.time) + '</span></div>'; }
        }
        gridHtml = '<div class="pgrid-wrap prg-gridwrap' + (large ? ' is-large' : '') + '" id="prg-grid"><div class="pgrid" style="grid-template-columns:' + TIME_W + 'px repeat(' + halls.length + ',' + COL_W + 'px);grid-template-rows:' + HEAD_H + 'px repeat(' + slots + ',' + ROW + 'px)">' +
          cells + blocks + mblocks + nowLine + '</div></div>' +
          '<div class="prg-legend"><span><i class="lg-mine"></i>вы записаны</span><span>' + icon('star', 'fill') + 'в избранном</span><span><i class="lg-ovl">!</i>пересечение</span><span>' + icon('lock') + 'закрыто тарифом</span><span><i class="lg-mentor"></i>запись к ментору</span></div>';
      }
      const hint = day === F.NOW.day
        ? '<button class="prg-hint" data-act="c7-slice" data-arg="now">' + icon('clock') + (nowRun.length ? 'Сейчас идёт ' + nowRun.length + ' ' + pl(nowRun.length, ['сессия', 'сессии', 'сессий']) + ' в ' + nh + ' ' + pl(nh, ['зале', 'залах', 'залах']) : 'Сейчас сессий нет') + '</button>'
        : '<div class="prg-hint is-text">Нажмите на время слева: покажем всё, что идёт в это время</div>';
      const bar = '<div class="prg-c7bar">' + hint + '<div class="prg-scale" role="group" aria-label="Масштаб сетки">' +
        '<button class="chip' + (large ? '' : ' on') + '" data-act="c7-scale" data-arg="compact" aria-pressed="' + !large + '">Компактно</button>' +
        '<button class="chip' + (large ? ' on' : '') + '" data-act="c7-scale" data-arg="large" aria-pressed="' + large + '">Крупно</button></div></div>';
      return '<div class="scr prg-scr prg-c7">' +
        D.head({ eyebrow: esc(dayEyebrow()), title: 'Программа',
          sub: list.length + ' ' + pl(list.length, EV) + ' · ' + hallCount + ' ' + pl(hallCount, ['зал', 'зала', 'залов']) + (n ? ' · фильтры: ' + n : '') }) +
        viewTop('C7', { noAll: true }) +
        (gridHtml ? bar + gridHtml : '<div class="prg-list">' + emptyState('За этот день по фильтрам ничего не нашлось.') + '</div>') +
        '</div>';
    },
    mount(host) {
      bindTop(host);
      const wrap = host.querySelector('#prg-grid');
      if (!wrap) { return; }
      const store = D.st('_scroll'), k = 'grid:' + gridDay() + ':' + (pg().scale === 'large' ? 'l' : 'c');
      if (store[k]) { wrap.scrollLeft = store[k].l; wrap.scrollTop = store[k].t; }
      else {
        const now = wrap.querySelector('.pg-now');
        if (now) { wrap.scrollTop = Math.max(0, parseInt(now.style.top, 10) - 120); }
      }
      wrap.addEventListener('scroll', () => { store[k] = { l: wrap.scrollLeft, t: wrap.scrollTop }; }, { passive: true });
    }
  });

  /* ---------- C5 Спикер ---------- */
  const mentorEnd = w => F.fmtTime(tmin(w.time) + 30);
  const isPastWin = w => w.day < F.NOW.day || (w.day === F.NOW.day && w.time <= F.NOW.time);
  D.register('C5', {
    tab: 'C1',
    meta: {
      title: 'C5 · Спикер',
      role: 'Гость, карточка спикера',
      fr: ['FR-PROG-07', 'FR-PROG-11', 'FR-BOOK-10'],
      ac: ['AC-PROG-08', 'AC-BOOK-06'],
      what: [
        'Карточка спикера: инициалы вместо фото, роль и компания, рычаг, число сессий и менторских окон.',
        'Сессии спикера за фестиваль: переход в карточку сессии, зал и время в строке.',
        'Менторские окна спикера (по 30 минут, Магнолия, стол): «Записаться» открывает лист подтверждения, «+ Путь» добавляет окно в «Мой путь».',
        '«Предложить встречу» ведёт к заявке на встречу; неверный адрес даёт «Спикер не найден».'
      ],
      rules: [
        'Публичные поля спикера заполняются в панели; оценки и внутренние поля гостям не показываются (FR-PROG-07).',
        'Менторские гостиные назначаются в программе и видны здесь: окна привязаны к спикеру и залу (FR-BOOK-10).',
        'Запись на менторские закрыта для Оптимума (D-26); у спикеров нет Оптимума, они не выступают как участники этого тарифа (D-41).',
        'Круглые столы и воркшопы — в разделе «КипяTALK» Маркетплейса (H5), здесь их нет.'
      ],
      depends: ['модерация профилей', 'D-26', 'D-41']
    },
    html(ctx) {
      if (ctx.param && !F.speaker(ctx.param)) { return notFound('Спикер не найден', 'Такого спикера нет в программе. Откройте его из карточки сессии.'); }
      const key = ctx.param || 'levin';
      const sp = F.speaker(key);
      const sessions = F.speakerSessions(key);
      const slots = F.mentorSlots(key).filter(w => !isPastWin(w));
      const mentor = F.mentorWindows(key).length > 0;
      const sessRows = sessions.map(s => rowLink('C3/' + s.id, s.day.slice(0, 5) + ' ' + s.time, s.title, hallLabel(F.hall(s.hall)) + ' · ' + s.lever)).join('');
      const winRows = slots.map(w => {
        const it = inPath('mentor', key, w.day, w.time), mine = it && it.status === 'booked';
        const chk = F.mentorCheck(w);
        const state = mine ? tag('вы записаны', 'ok') : (w.taken ? '<span class="cap">занято</span>' : '');
        const acts = (w.taken && !mine) ? '' :
          (mine || !chk.ok ? '' : '<button class="btn btn-secondary btn-sm" data-act="d1-open" data-arg="' + key + ':' + w.i + '">Записаться</button>') +
          pathBtn('mentor', key, { day: w.day, time: w.time });
        return '<div class="prg-mrow"><div class="grow"><div class="r-title">' + esc(w.day) + ' · ' + esc(w.time) + '–' + mentorEnd(w) + '</div>' +
          '<div class="r-sub">стол ' + w.table + ' · ' + esc(F.hall('magnolia').name) + '</div></div>' + state + '<div class="prg-macts">' + acts + '</div></div>';
      }).join('');
      const facts = (sp.bio ? esc(sp.bio) + ' ' : '') + 'Сессий в программе: ' + sessions.length + (mentor ? ' · менторских окон: ' + F.mentorWindows(key).length : '') + '.';
      return '<div class="scr prg-scr">' +
        D.head({ backHist: true, eyebrow: 'Спикер · ' + esc(sp.lever || ''), title: esc(sp.name), sub: esc(sp.role) + ' · ' + esc(sp.company), paren: paren('публичный профиль спикера') }) +
        '<div class="prg-c3body">' +
        '<div class="card prg-spkhead"><div class="avatar xl accent" style="border-radius:24px;font-size:26px">' + esc(sp.name.split(' ').map(w => w[0]).join('')) + '</div>' +
        '<div class="grow"><div class="prg-c3tags"><button class="chip on" data-act="prg-pick" data-arg="levers:' + esc(sp.lever || '') + '">' + esc(sp.lever || '') + '</button>' +
        (mentor ? '<button class="chip" data-go="D1">ментор</button>' : '') + '</div><div class="cap" style="margin-top:8px">' + facts + '</div></div></div>' +
        (mentor ? '<div><div class="sec-title" style="margin-top:0">Менторские окна · ' + slots.length + '</div>' +
          '<div class="card" style="padding:4px 14px">' + (winRows || '<div class="cap" style="padding:12px 0">Свободных окон не осталось</div>') + '</div>' +
          '<div class="cap" style="margin-top:6px">окна по 30 минут · ' + esc(F.hall('magnolia').name) + '</div></div>' : '') +
        '<div><div class="sec-title" style="margin-top:0">Сессии · ' + sessions.length + '</div>' +
        '<div class="card" style="padding:2px 14px"><div class="list">' + (sessRows || '<div class="cap" style="padding:12px 0">Выступлений в программе нет</div>') + '</div></div></div>' +
        '<button class="btn btn-secondary btn-block" data-go="G2">' + icon('userPlus') + 'Предложить встречу</button>' +
        '</div></div>';
    }
  });

  /* ---------- C6 Изменение расписания ---------- */
  D.register('C6', {
    tab: 'C1',
    meta: {
      title: 'C6 · Изменение расписания',
      role: 'Гость, уведомление об изменении',
      fr: ['FR-PROG-05', 'FR-PROG-08', 'FR-NTF-03'],
      ac: ['AC-PROG-01', 'AC-PATH-11'],
      what: [
        'Баннер об изменении сессии и кнопка «Обновить мой день».',
        'Карточка «Было» и «Стало»: зал и время; если было неизвестно, показано только новое.',
        'Что это значит для вас: запись, избранное или сессия вне вашей программы; время перехода из текущего места.',
        'Экран открывается из карточки сессии (C3), из избранного (C4) и по уведомлению; без параметра показывает перенесённую в Соболь сессию; неверный адрес — «Сессия не найдена», сессия без изменений — «Эту сессию не переносили».'
      ],
      rules: [
        'Изменение помечается в программе меткой «изменено» до конца фестиваля.',
        'Записанным и тем, у кого сессия в избранном, уходит адресное уведомление (не позднее 60 секунд, AC-PROG-01).',
        '«Обновить мой день» пересчитывает путь, маршрут и подсказки Секретаря.'
      ],
      depends: ['фид программы', 'матрица переездов']
    },
    html(ctx) {
      let s;
      if (ctx.param) {
        const g = F.session(ctx.param);
        if (!g) { return notFound('Сессия не найдена', 'Такой сессии нет в программе. Откройте её из списка.'); }
        if (!g.changed) {
          return '<div class="scr prg-scr">' + D.head({ backHist: true, eyebrow: 'Изменение', title: 'Без изменений', sub: 'Эту сессию не переносили' }) +
            '<div class="prg-c3body"><div class="empty"><div class="e-title">Эту сессию не переносили</div><div class="e-text">' + esc(g.title) + '. Время и зал в программе прежние.</div>' +
            '<button class="btn btn-primary" data-go="C3/' + g.id + '">Карточка сессии</button><button class="btn btn-ghost" data-go="C1">К программе</button></div></div></div>';
        }
        s = g;
      } else { s = F.session('s2707'); }
      const h = F.hall(s.hall), wh = s.wasHall ? F.hall(s.wasHall) : null;
      const end = x => F.fmtTime(tmin(x) + s.dur);
      const timeChanged = !!s.was;
      const wasLine = wh ? s.time + '–' + end(s.time) + ' · ' + wh.name : (timeChanged ? s.was + '–' + end(s.was) + ' · ' + h.name : null);
      const here = F.PATH_NOW && F.PATH_NOW.hall, tmv = here && s.day === F.NOW.day ? transit(here, s.hall) : null;
      const booked = isBookedNow(s.id), fav = isFav(s.id);
      return '<div class="scr prg-scr">' +
        D.head({ backHist: true, eyebrow: 'Изменение · ' + esc(F.NOW.time), title: 'Расписание обновлено',
          sub: timeChanged ? 'Сессия сдвинута по времени' : 'Сессия перенесена в другой зал', paren: paren('в программе такие сессии помечены') }) +
        '<div class="prg-c3body">' +
        '<div class="banner conflict-warn">' + icon('alert') + '<div style="flex:1"><div class="b-title">' + (timeChanged ? 'Время изменилось' : 'Зал изменился') + '</div>' +
        '<div class="cap">' + esc(qt(s.title)) + '</div>' + (s.changeNote ? '<div class="cap" style="margin-top:4px">' + esc(s.changeNote) + '</div>' : '') + '</div></div>' +
        '<div class="card"><div class="cap">Было и стало</div>' +
        (wasLine ? '<div class="row"><div class="grow"><div class="cap">Было</div><div class="r-title prg-was">' + esc(wasLine) + '</div></div></div>' : '') +
        '<div class="row"' + (wasLine ? ' style="border-top:1px solid var(--line)"' : '') + '><div class="grow"><div class="cap">Стало</div>' +
        '<div class="r-title" style="color:var(--accent-text)">' + esc(s.time) + '–' + esc(F.sessionEnd(s)) + ' · ' + esc(h.name) + '</div>' +
        '<div class="r-sub">' + esc(h.place) + '</div></div>' + icon('pin') + '</div></div>' +
        '<div class="card"><div class="cap">Что это значит для вас</div>' +
        '<div class="prg-text">' + (booked ? 'Вы записаны: запись сохранена, новое время и зал в карточке.' : fav ? 'Сессия в избранном: уведомление отправлено, отметка осталась.' : 'Вы не записаны на эту сессию и не отметили её звездой: изменение вас не затрагивает.') + '</div>' +
        '<button class="btn btn-primary btn-block" data-act="c6-refresh">' + icon('refresh') + 'Обновить мой день</button></div>' +
        (tmv != null ? '<div class="banner">' + icon('info') + '<div class="cap">От вашего места сейчас (' + esc(F.hall(here).name) + ') до зала «' + esc(hallLabel(h)) + '» — ' + mm(tmv) + '.</div></div>' : '') +
        '<div class="grid-2"><button class="btn btn-secondary" data-go="C3/' + s.id + '">Карточка сессии</button>' +
        '<button class="btn btn-secondary" data-go="C4">Избранное</button></div>' +
        '</div></div>';
    }
  });
  D.action('c6-refresh', () => { say('Мой день обновлён'); });

  /* общие вещи раздела для D.js */
  D.prog = { say: say, bk: bk, fv: fv, pf: pf, pg: pg, go: go, isBookedNow: isBookedNow, bookedList: bookedList, isWaiting: isWaiting, isFav: isFav,
    bookSession: bookSession, cancelSession: cancelSession, syncBooked: syncBooked, pathBtn: pathBtn, favBtn: favBtn, sessCard: sessCard, marksOf: marksOf, fmtSeat: fmtSeat,
    conflictsFor: conflictsFor, conflictBanners: conflictBanners, committed: committed, mm: mm, qt: qt, transit: transit, DAY_LONG: DAY_LONG, dayParam: dayParam,
    viewTop: viewTop, bindTop: bindTop, keepScroll: keepScroll, filterArg: filterArg, activeChips: activeChips, countFilters: countFilters, emptyState: emptyState,
    hallLk: hallLk, hallLabel: hallLabel, rowLink: rowLink, tmin: tmin, mentorEnd: mentorEnd, isPastWin: isPastWin, mentorParam: mentorParam,
    mentorFilterOk: mentorFilterOk, notFound: notFound, dayEyebrow: dayEyebrow, inPath: inPath, findAny: findAny, accessText: accessText, lastName: lastName };
})();
