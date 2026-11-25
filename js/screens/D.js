/* Блок D — «Записи» v3 (раздел S3): D1 менторские, D2 подтверждение записи, D3 лист ожидания, D4 недоступно по тарифу, D5 мои записи, D6 освободилось место.
   Общие помощники (состояние записей, фильтр, карточка сессии, «+ Путь») — из C.js через D.prog; C.js подключается раньше.
   Правила записи общие и лежат в data/fx_program.js: FIX.bookCheck (прошла, идёт, закрыто тарифом, мест нет), FIX.mentorCheck, FIX.canCancel (не позднее чем за 2 часа до начала).
   Менторская запись: источник правды — пункт пути типа mentor со статусом booked (контракт «+ Путь», data/fx_path.js);
   запись и отмена по сессиям — D.st('_book'). Всё, что создаёт запись или меняет расписание, подтверждается кнопкой в листе (Q-27) и тостом. */
(function () {
  'use strict';
  const D = window.Demo, F = window.FIX, P = D.prog;
  const { esc, icon, paren, tag, avatar } = D;
  const pl = D.plural;
  const tmin = P.tmin, mm = P.mm, qt = P.qt, DAY_LONG = P.DAY_LONG, say = P.say, mentorParam = P.mentorParam, hallLabel = P.hallLabel;
  const WINS = ['окно', 'окна', 'окон'];

  /* ---------- общие правила записи ---------- */
  function parseMentorParam(p) {
    const m = /^m_([a-z]+)_(\d\d)(\d\d)_(\d\d)(\d\d)$/.exec(p || '');
    return m && F.speaker(m[1]) ? { key: m[1], day: m[2] + '.' + m[3], time: m[4] + ':' + m[5] } : null;
  }
  const slotOf = (key, day, time) => F.mentorSlots(key).filter(w => w.day === day && w.time === time)[0] || null;

  function bookMentor(key, day, time) {
    const w = slotOf(key, day, time); if (!w || !F.mentorCheck(w).ok) { return null; }
    const it = F.pathAdd('mentor', key, { day: day, time: time, place: 'Магнолия · стол ' + w.table });
    if (!it) { return null; }
    it.status = 'booked';
    P.bk().last = { kind: 'mentor', key: key, day: day, time: time };
    return it;
  }
  function cancelMentor(key, day, time) {
    const it = P.findAny('mentor', key, day, time);
    if (it && it.status === 'booked') { it.status = 'accepted'; }
  }
  const mentorBooked = (key, day, time) => { const it = P.findAny('mentor', key, day, time); return !!it && it.status === 'booked'; };
  /* все подтверждённые менторские окна */
  function myMentorWins() {
    return F.PATH_ITEMS.filter(it => it.type === 'mentor' && it.status === 'booked').sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
  }

  /* запись по описанию: session или mentor */
  function recOf(kind, a, b, c) {
    if (kind === 'mentor') {
      const sp = F.speaker(a), w = slotOf(a, b, c);
      return { kind: 'mentor', key: a, day: b, time: c, dur: 30, hall: 'magnolia', table: w ? w.table : null, name: sp.name, slot: w,
        title: 'Менторская встреча: ' + sp.name, booked: mentorBooked(a, b, c), param: mentorParam(a, b, c) };
    }
    const s = F.session(a);
    return { kind: 'session', id: a, s: s, day: s.day, time: s.time, dur: s.dur, hall: s.hall, title: s.title, booked: P.isBookedNow(a), param: a };
  }
  function recFromParam(p) {
    const mp = parseMentorParam(p);
    if (mp) { return recOf('mentor', mp.key, mp.day, mp.time); }
    if (p && F.session(p)) { return recOf('session', p); }
    const last = P.bk().last;
    if (last && last.kind === 'mentor' && slotOf(last.key, last.day, last.time)) { return recOf('mentor', last.key, last.day, last.time); }
    if (last && last.kind === 'session' && F.session(last.id)) { return recOf('session', last.id); }
    return recOf('session', 's2704');
  }
  /* проверка записи (тариф, места, время): прямой адрес D2/<id> не обходит правила */
  function recCheck(r, o) {
    if (r.kind === 'mentor') { return r.slot ? F.mentorCheck(r.slot) : { ok: false, reason: 'none' }; }
    return F.bookCheck(r.s, o);
  }
  const recConflicts = r => P.conflictsFor({ id: r.kind === 'mentor' ? 'm:' + r.param : r.id, day: r.day, time: r.time, dur: r.dur, hall: r.hall });
  const cancelAct = r => r.kind === 'mentor' ? 'm|' + r.key + '|' + r.day + '|' + r.time : 's|' + r.id;
  const endOf = r => F.fmtTime(tmin(r.time) + r.dur);

  /* отмена: только через лист и только в срок */
  function openCancelSheet(arg) {
    const p = arg.split('|');
    const r = p[0] === 'm' ? recOf('mentor', p[1], p[2], p[3]) : recOf('session', p[1]);
    const ci = F.canCancel(r.day, r.time);
    if (!ci.ok) { say('Отмена закрыта: до начала меньше двух часов'); return; }
    D.openSheet('<div class="sheet-title">Отменить запись</div>' +
      '<div class="card"><div class="card-title">' + esc(r.title) + '</div><div class="cap">' + esc(DAY_LONG[r.day] || r.day) + ' · ' + esc(r.time) + '–' + esc(endOf(r)) + '</div>' +
      '<div class="cap">Отмена возможна до ' + esc(ci.text) + '.</div></div>' +
      '<div class="banner" style="margin-top:10px">' + icon('info') + '<div class="cap">Место освободится и уйдёт следующему в очереди. Пункт останется в «Мой путь» принятым, его можно убрать там.</div></div>' +
      '<button class="btn btn-primary btn-block" data-act="d-cancel-ok" data-arg="' + esc(arg) + '">Отменить запись</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Оставить запись</button>');
  }
  D.action('d-cancel', el => openCancelSheet(el.dataset.arg));
  D.action('d-cancel-ok', el => {
    const p = el.dataset.arg.split('|');
    D.closeSheet();
    const day = p[0] === 'm' ? p[2] : F.session(p[1]).day, time = p[0] === 'm' ? p[3] : F.session(p[1]).time;
    if (!F.canCancel(day, time).ok) { say('Отмена закрыта: до начала меньше двух часов'); return; }
    if (p[0] === 'm') { cancelMentor(p[1], p[2], p[3]); } else { P.cancelSession(p[1]); }
    D.rerender(); say('Запись отменена');
  });
  D.action('d-cal', () => say('Файл календаря добавлен'));
  /* письмо организатору: из D4 (варианты для Оптимума) и при закрытой отмене (cancel:<id сессии> или cancel:m|ключ|день|время) */
  D.action('d-tg', el => {
    const arg = el.dataset.arg || '';
    let body = 'Здравствуйте! Подскажите, пожалуйста, какие варианты есть у участника с тарифом Оптимум на это время.';
    if (arg.indexOf('cancel:') === 0) {
      const ref = arg.slice(7), p = ref.split('|');
      const title = p[0] === 'm' ? 'Менторская встреча: ' + F.speaker(p[1]).name : (F.session(ref) || { title: '' }).title;
      body = 'Здравствуйте! Прошу снять мою запись на ' + qt(title) + '. До начала меньше двух часов, в приложении отмена закрыта.';
    }
    D.openSheet('<div class="sheet-title">Организатору</div>' +
      '<div class="cap" style="margin-bottom:10px">Сообщение уйдёт в Telegram организатора фестиваля</div>' +
      '<div class="card"><div class="prg-text">' + esc(body) + '</div></div>' +
      '<button class="btn btn-primary btn-block" data-act="sheet-close">Скопировать текст</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Закрыть</button>');
  });

  /* ---------- D1 Менторские ---------- */
  function mentorRows() {
    const f = P.pf(), day = f.day;
    return F.MENTORS.map(m => {
      const sp = F.speaker(m.id);
      let slots = P.mentorFilterOk(m.id, false) ? F.mentorSlots(m.id).filter(w => !P.isPastWin(w) && (day === 'all' || w.day === day)) : [];
      if (f.booked) { slots = slots.filter(w => mentorBooked(m.id, w.day, w.time)); }
      return { m: m, sp: sp, slots: slots };
    }).filter(x => x.slots.length);
  }
  const winLabel = w => esc(w.time) + ' · стол ' + w.table;
  const slotConf = (key, w) => P.conflictsFor({ id: 'm:' + mentorParam(key, w.day, w.time), day: w.day, time: w.time, dur: 30, hall: 'magnolia' });

  D.register('D1', {
    tab: 'C1',
    meta: {
      title: 'D1 · Менторские',
      role: 'Гость, запись 1:1',
      fr: ['FR-BOOK-01', 'FR-BOOK-04', 'FR-BOOK-05', 'FR-BOOK-10', 'FR-PROG-07', 'FR-PROG-10'],
      ac: ['AC-BOOK-05', 'AC-BOOK-06'],
      what: [
        'Сегмент «Менторские» в Программе: менторы карточками (спикеры с окнами), окна по 30 минут в Магнолии по дням, статусы «свободно», «занято», «вы записаны»; окно с пересечением помечено значком.',
        'Те же день, поиск и фильтры, что в списке и сетке (залы, спикеры, рычаги, метка «Бизнес», «С записью», «Доступно мне»); «Формат», «Практики» и «Только избранное» к менторским не относятся, об этом сказано на экране.',
        'Выбор окна открывает нижнюю панель: «Записаться» (лист подтверждения с пересечениями и временем на переход) и «+ Путь» (тип mentor, день и время окна); при пересечении кнопка неактивна, рядом «Мои записи».',
        'Менторские гостиные назначаются в программе и записываются из карточки спикера (C5); круглые столы и воркшопы — только в разделе «КипяTALK» Маркетплейса (H5).'
      ],
      rules: [
        'Запись на менторские и экспертные гостиные закрыта для Оптимума, доступна Бизнесу и Первому классу (D-26); экран D4 показывает вид для Оптимума.',
        'Жёсткое пересечение с подтверждённой записью блокирует кнопку, нехватка времени на переход (матрица переездов) — предупреждение (FR-BOOK-05).',
        'Занятость окон — детерминированная демо-раскладка; прошедшие окна скрыты (демо-момент 27.02 11:10).',
        'Отмена — не позднее чем за 2 часа до начала; после подтверждения окно появляется в «Мой путь» со статусом «запись подтверждена».'
      ],
      depends: ['D-07', 'D-26', 'D-41']
    },
    html() {
      P.syncBooked();
      const st = D.st('D1'), rows = mentorRows(), closed = F.ME.tariff === 'Оптимум';
      if (closed) { st.sel = null; }
      /* выбранное окно сбрасывается, если оно пропало из выдачи, занято или уже записано вами */
      let sel = st.sel || null, selSlot = null;
      if (sel) { selSlot = slotOf(sel.key, sel.day, sel.time); if (!selSlot || mentorBooked(sel.key, sel.day, sel.time) || selSlot.taken) { st.sel = sel = null; selSlot = null; } }
      const f = P.pf();
      const cards = rows.map(x => {
        const m = x.m, sp = x.sp;
        const byDay = {}, order = [];
        x.slots.forEach(w => { if (!byDay[w.day]) { byDay[w.day] = []; order.push(w.day); } byDay[w.day].push(w); });
        const chips = order.map(d => '<div class="prg-mday">' + esc(DAY_LONG[d]) + '</div><div class="prg-fchips">' + byDay[d].map(w => {
          const mine = mentorBooked(m.id, w.day, w.time), on = sel && sel.key === m.id && sel.day === w.day && sel.time === w.time;
          if (mine) { return '<span class="chip prg-wmine" aria-label="Вы записаны">' + icon('check') + winLabel(w) + ' · записан</span>'; }
          const conf = !w.taken && !closed && slotConf(m.id, w).hard.length > 0;
          return '<button class="chip prg-wchip' + (on ? ' on' : '') + (w.taken ? ' is-taken' : '') + (conf ? ' has-conflict' : '') + '" data-act="d1-win" data-arg="' + m.id + ':' + w.i + '"' + (w.taken || closed ? ' disabled' : '') +
            ' aria-pressed="' + !!on + '"' + (conf ? ' aria-label="' + winLabel(w).replace(/<[^>]*>/g, '') + ', пересекается с вашей записью"' : '') + '>' + (conf ? icon('alert') : '') + winLabel(w) + (w.taken ? ' · занято' : '') + '</button>';
        }).join('') + '</div>').join('');
        return '<article class="card prg-mentor' + (sel && sel.key === m.id ? ' accent-edge' : '') + '">' +
          '<button class="prg-mhead" data-go="C5/' + m.id + '">' + avatar(m.name, 'sm') +
          '<span class="grow"><b>' + esc(m.name) + '</b><span class="cap">' + esc(sp.role) + ' · ' + esc(sp.company) + '</span></span>' + icon('chevR') + '</button>' +
          '<div class="cap">' + esc(m.topic) + ' · проведено ' + m.done + ' ' + pl(m.done, ['беседа', 'беседы', 'бесед']) + ' · ' + x.slots.length + ' ' + pl(x.slots.length, WINS) + '</div>' +
          chips + '</article>';
      }).join('');

      const noteFmt = ((f.formats || []).length || (f.practices || []).length || f.fav)
        ? '<div class="cap prg-fnote">Фильтры «Формат», «Практики» и «Только избранное» к менторским окнам не применяются.</div>' : '';
      const selbar = selSlot ? (() => {
        const sp = F.speaker(sel.key), cf = slotConf(sel.key, sel), hard = cf.hard[0];
        return '<div class="prg-selbar"><div class="grow"><div class="r-title">' + esc(sp.name) + ' · ' + esc(sel.day) + ' ' + esc(sel.time) + '–' + esc(P.mentorEnd(sel)) + '</div>' +
          '<div class="cap' + (hard ? ' prg-err' : '') + '">' + (hard ? 'Пересекается с вашей записью: ' + esc(hard.time) + ' ' + esc(qt(hard.title)) : 'стол ' + selSlot.table + ' · ' + esc(F.hall('magnolia').name)) + '</div></div>' +
          '<div class="prg-selacts">' + (hard
            ? '<button class="btn btn-secondary" style="flex:1" data-go="D5">Мои записи</button>'
            : '<button class="btn btn-primary" style="flex:1" data-act="d1-book">Записаться</button>' + P.pathBtn('mentor', sel.key, { day: sel.day, time: sel.time })) +
          '<button class="icon-btn" data-act="d1-clear" aria-label="Снять выбор">' + icon('x') + '</button></div></div>';
      })() : '';

      return '<div class="scr prg-scr">' +
        D.head({ eyebrow: esc(P.dayEyebrow()), title: 'Программа', sub: 'менторские · ' + esc(F.hall('magnolia').place) + ' · столы 1–8' }) +
        P.viewTop('D1') +
        '<div class="prg-list">' + (closed ? '<div class="banner warn">' + icon('lock') + '<div class="grow"><div class="b-title">Запись закрыта для вашего тарифа</div><div class="cap">Менторские и экспертные гостиные доступны Бизнесу и Первому классу.</div>' +
          '<button class="btn btn-ghost btn-sm prg-inl" data-go="D4">Подробнее</button></div></div>' : '') + noteFmt +
        (rows.length ? '<div class="sec-title" style="margin:6px 0 0">Менторы · ' + rows.length + '</div>' + cards : P.emptyState('В выбранные дни по этим фильтрам менторских окон нет. Смените день или снимите фильтры.')) +
        '<div class="banner">' + icon('info') + '<div class="cap">Менторские назначаются в программе и записываются из карточки спикера. Круглые столы и воркшопы — в разделе «КипяTALK». ' +
        'Запись открыта тарифам Бизнес и Первый класс.</div></div>' +
        '<div class="prg-inl-row"><button class="btn btn-ghost btn-sm" data-go="H5">КипяTALK</button><button class="btn btn-ghost btn-sm" data-go="D4">Вид для тарифа Оптимум</button>' +
        '<button class="btn btn-ghost btn-sm" data-go="D5">Мои записи</button></div></div>' +
        selbar + '</div>';
    },
    mount(host) { P.bindTop(host); }
  });
  D.prog.mentorCount = () => mentorRows().length;
  D.action('d1-win', el => {
    if (F.ME.tariff === 'Оптимум') { say('Запись на менторские закрыта для вашего тарифа'); return; }
    const a = el.dataset.arg.split(':'), key = a[0], w = F.mentorSlots(key)[parseInt(a[1], 10)];
    if (!w) { return; }
    const st = D.st('D1'), on = st.sel && st.sel.key === key && st.sel.day === w.day && st.sel.time === w.time;
    st.sel = on ? null : { key: key, day: w.day, time: w.time };
    D.rerender();
  });
  D.action('d1-clear', () => { D.st('D1').sel = null; D.rerender(); });

  function mentorSheet(key, day, time) {
    const r = recOf('mentor', key, day, time), sp = F.speaker(key), cf = recConflicts(r);
    D.openSheet('<div class="sheet-title">Менторская встреча</div>' +
      '<div class="card"><div class="card-title">' + esc(sp.name) + '</div><div class="cap">' + esc(sp.role) + ' · ' + esc(sp.company) + '</div>' +
      '<div class="cap">' + esc(DAY_LONG[day]) + ' · ' + esc(time) + '–' + esc(P.mentorEnd({ time: time })) + ' · 30 минут</div>' +
      '<div class="cap">Стол ' + r.table + ' · ' + esc(F.hall('magnolia').name) + ', ' + esc(F.hall('magnolia').place) + '</div></div>' +
      '<div style="display:flex;flex-direction:column;gap:8px;margin-top:10px">' + P.conflictBanners(cf) +
      '<div class="banner">' + icon('bell') + '<div class="cap">Напомним за 60 минут и за 10 минут. Отмена — не позднее чем за 2 часа до начала.</div></div></div>' +
      '<button class="btn btn-primary btn-block" data-act="d1-confirm" data-arg="' + key + '|' + day + '|' + time + '"' + (cf.hard.length ? ' disabled' : '') + '>Подтвердить запись</button>' +
      (cf.hard.length ? '<button class="btn btn-secondary btn-block" data-go="D5">Открыть «Мои записи»</button>' : '') +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Не сейчас</button>');
  }
  D.action('d1-book', () => { const s = D.st('D1').sel; if (s) { mentorSheet(s.key, s.day, s.time); } });
  /* из карточки спикера (C5): ключ и номер окна */
  D.action('d1-open', el => {
    if (F.ME.tariff === 'Оптимум') { say('Запись на менторские закрыта для вашего тарифа'); return; }
    const a = el.dataset.arg.split(':'), w = F.mentorSlots(a[0])[parseInt(a[1], 10)];
    if (w && F.mentorCheck(w).ok) { mentorSheet(a[0], w.day, w.time); }
  });
  D.action('d1-confirm', el => {
    const a = el.dataset.arg.split('|');
    D.closeSheet();
    if (bookMentor(a[0], a[1], a[2])) {
      D.st('D1').sel = null;
      D.rerender(); say('Вы записаны к ментору · ' + a[2]);
    }
  });

  /* ---------- D2 Подтверждение записи ---------- */
  function refusal(r, chk) {
    const back = r.kind === 'mentor' ? 'D1' : 'C3/' + r.id, h = F.hall(r.hall);
    const mk = (title, sub, banner, btns) => '<div class="scr prg-scr">' + D.head({ backHist: true, eyebrow: 'Запись', title: title, sub: esc(r.title) }) +
      '<div class="prg-c3body">' + banner + '<div class="card"><div class="card-title">' + esc(r.title) + '</div><div class="cap">' + esc(DAY_LONG[r.day]) + ' · ' + esc(r.time) + '–' + esc(endOf(r)) + '</div>' +
      '<div class="cap">' + esc(r.kind === 'mentor' ? 'Стол ' + r.table + ' · ' + h.name : h.name) + '</div></div>' + btns + '</div></div>';
    const bn = (cls, ic, t, c) => '<div class="banner ' + cls + '">' + icon(ic) + '<div><div class="b-title">' + t + '</div><div class="cap">' + c + '</div></div></div>';
    if (chk.reason === 'tariff') {
      const why = r.kind === 'mentor' ? 'Менторские доступны тарифам Бизнес и Первый класс.' : 'Доступно: ' + esc(P.accessText(r.s)) + '.';
      return mk('Недоступно по тарифу', '', bn('warn', 'lock', 'Закрыто для вашего тарифа', why + ' Ваш тариф — ' + esc(F.ME.tariff) + '.'),
        '<button class="btn btn-primary btn-block" data-go="D4/' + (r.kind === 'mentor' ? r.key : r.id) + '">Что доступно вам</button><button class="btn btn-ghost btn-block" data-go="' + back + '">Назад</button>');
    }
    if (chk.reason === 'full') {
      return mk('Мест нет', '', bn('info', 'clock', 'Свободных мест не осталось', 'Можно встать в очередь: освободится место, предложим его первым.'),
        '<button class="btn btn-primary btn-block" data-act="c3-wait" data-arg="' + r.id + '">Встать в очередь</button><button class="btn btn-ghost btn-block" data-go="' + back + '">Карточка сессии</button>');
    }
    if (chk.reason === 'past' || chk.reason === 'live') {
      const done = chk.reason === 'past';
      const t = r.kind === 'mentor' ? 'Окно прошло' : (done ? 'Сессия завершена' : 'Сессия уже идёт');
      return mk(t, '', bn('', 'clock', t, r.kind === 'mentor' ? 'Время менторского окна прошло, выберите другое.' : (done ? 'Сессия состоялась, запись закрыта. Заметку и оценку дня можно оставить в итогах.' : 'Запись на начавшуюся сессию закрыта.')),
        r.kind === 'mentor' ? '<button class="btn btn-primary btn-block" data-go="D1">Другие окна</button>'
          : '<button class="btn btn-primary btn-block" data-go="M2/' + r.id + '">Заметка</button><button class="btn btn-secondary btn-block" data-go="M3">Оценить день</button><button class="btn btn-ghost btn-block" data-go="C3/' + r.id + '">Карточка сессии</button>');
    }
    return mk('Окно занято', '', bn('warn', 'alert', 'Это окно уже занято', 'Другой участник записался раньше. Выберите свободное окно.'),
      '<button class="btn btn-primary btn-block" data-go="D1">Другие окна</button>');
  }

  D.register('D2', {
    tab: 'C1',
    meta: {
      title: 'D2 · Подтверждение записи',
      role: 'Гость, запись',
      fr: ['FR-BOOK-01', 'FR-BOOK-02', 'FR-BOOK-04', 'FR-BOOK-05', 'FR-BOOK-08'],
      ac: ['AC-BOOK-02', 'AC-BOOK-05', 'AC-PROG-03'],
      what: [
        'Экран записи по сессии (адрес D2 с идентификатором сессии) или менторскому окну: что, когда, где, с кем.',
        'До подтверждения — «Проверьте запись», пересечения и нехватка времени на переход, кнопка «Подтвердить запись».',
        'Прямой адрес не обходит правила: закрыто тарифом, мест нет, сессия завершена или идёт, окно занято или прошло — вместо записи осмысленное состояние со ссылкой (D4, лист ожидания, заметка и оценка дня, другие окна).',
        'После подтверждения — «Вы записаны»: напоминания за 60 и 10 минут, срок отмены, «В календарь» и «Отменить запись» через лист; при закрытой отмене кнопка «Написать организатору».',
        'Без параметра открывает последнюю запись; неверный адрес — «Запись не найдена».'
      ],
      rules: [
        'Запись атомарная: место закрепляется сразу, подтверждение мгновенное (FR-BOOK-02); одно правило bookCheck с карточкой сессии и листом ожидания.',
        'Жёсткое пересечение блокирует подтверждение; нехватка времени на переход — предупреждение (FR-BOOK-05).',
        'Отмена — не позднее чем за 2 часа до начала, одно правило canCancel с C3 и D5; позже только через организатора (FR-BOOK-04).',
        'Запись создаёт пункт в «Мой путь» со статусом «запись подтверждена»; отмена оставляет пункт принятым.'
      ],
      depends: ['D-07', 'D-26', 'D-41']
    },
    html(ctx) {
      const p = ctx.param;
      if (p && !parseMentorParam(p) && !F.session(p)) { return P.notFound('Запись не найдена', 'Такой записи или сессии нет. Откройте её из программы.'); }
      P.syncBooked();
      const r = recFromParam(p), booked = r.booked;
      if (!booked) { const chk = recCheck(r); if (!chk.ok) { return refusal(r, chk); } }
      const cf = recConflicts(r), ci = F.canCancel(r.day, r.time), h = F.hall(r.hall);
      const rows = r.kind === 'mentor'
        ? [['Ментор', r.name], ['Стол', r.table + ' · ' + h.name + ', ' + h.place], ['Когда', DAY_LONG[r.day] + ' · ' + r.time + '–' + P.mentorEnd(r)], ['Длительность', '30 минут']]
        : [['Зал', r.hall === 'meetups' ? h.name : h.name + ' — ' + h.place], ['Когда', DAY_LONG[r.day] + ' · ' + r.time + '–' + F.sessionEnd(r.s)], ['Формат', r.s.format], ['Спикеры', (r.s.speakers || []).map(k => F.speaker(k).name).join(', ') || 'без спикеров']];
      const row = x => '<div class="prg-krow"><span class="cap">' + esc(x[0]) + '</span><b>' + esc(x[1]) + '</b></div>';
      const backTo = r.kind === 'mentor' ? 'D1' : 'C3/' + r.id;
      const cancelNote = ci.ok ? 'Отмена — не позднее ' + esc(ci.text) + '.' : 'Отмена закрыта: до начала меньше двух часов.';
      return '<div class="scr prg-scr">' +
        D.head({ backHist: true, eyebrow: booked ? 'Запись' : 'Подтверждение', title: booked ? 'Вы записаны' : 'Проверьте запись',
          sub: esc(r.title), paren: paren(booked ? (ci.ok ? 'отмена не позднее чем за 2 часа до начала' : 'отмена закрыта: до начала меньше двух часов') : 'место закрепится сразу после подтверждения') }) +
        '<div class="prg-c3body">' +
        (booked ? '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Место подтверждено</div>' +
          '<div class="cap">Напомним за 60 минут и за 10 минут. ' + cancelNote + '</div></div></div>' : '') +
        '<div class="card"><div class="cap">' + (booked ? 'Ваша запись' : 'Детали записи') + '</div><div class="card-title">' + esc(r.title) + '</div>' + rows.map(row).join('') + '</div>' +
        (booked ? '' : '<div style="display:flex;flex-direction:column;gap:8px">' + P.conflictBanners(cf) +
          '<div class="banner">' + icon('bell') + '<div class="cap">Напомним за 60 минут и за 10 минут. Место закреплено за вами.</div></div></div>') +
        (booked
          ? '<div class="grid-2"><button class="btn btn-secondary" data-act="d-cal">' + icon('calendar') + 'В календарь</button>' +
            (ci.ok ? '<button class="btn btn-ghost" data-act="d-cancel" data-arg="' + esc(cancelAct(r)) + '">Отменить запись</button>'
              : '<button class="btn btn-ghost" disabled>Отмена закрыта</button>') + '</div>' +
            (ci.ok ? '' : '<button class="btn btn-secondary btn-block" data-act="d-tg" data-arg="cancel:' + esc(r.kind === 'mentor' ? 'm|' + r.key + '|' + r.day + '|' + r.time : r.id) + '">Написать организатору</button>') +
            '<button class="btn btn-ghost btn-block" data-go="D5">Мои записи</button>'
          : '<button class="btn btn-primary btn-block" data-act="d2-confirm" data-arg="' + esc(r.param) + '"' + (cf.hard.length ? ' disabled' : '') + '>Подтвердить запись</button>' +
            (cf.hard.length ? '<button class="btn btn-secondary btn-block" data-go="D5">Открыть «Мои записи»</button>' : '') +
            '<button class="btn btn-ghost btn-block" data-go="' + backTo + '">Изменить выбор</button>') +
        '</div></div>';
    }
  });
  D.action('d2-confirm', el => {
    const r = recFromParam(el.dataset.arg), chk = recCheck(r);
    if (!chk.ok) { D.rerender(); say('Записаться нельзя: правила записи не выполнены'); return; }
    if (recConflicts(r).hard.length) { say('Пересечение с вашей записью'); return; }
    if (r.kind === 'mentor') { bookMentor(r.key, r.day, r.time); D.rerender(); say('Вы записаны к ментору · ' + r.time); }
    else { P.bookSession(r.id); D.rerender(); say('Запись подтверждена · ' + r.time); }
  });

  /* ---------- D3 Лист ожидания ---------- */
  D.register('D3', {
    tab: 'C1',
    meta: {
      title: 'D3 · Лист ожидания',
      role: 'Гость, запись на сессию',
      fr: ['FR-BOOK-03', 'FR-BOOK-08'],
      ac: ['AC-BOOK-02'],
      what: [
        'Ваше место в очереди на сессию без свободных мест и срок подтверждения — 15 минут.',
        'Что произойдёт при освобождении места; карточка сессии и «+ Путь» (состояние «В пути»).',
        'Выход из очереди через лист подтверждения; после выхода экран показывает пустое состояние, повторный вход ставит в конец очереди.'
      ],
      rules: [
        'Место из очереди подтверждается за 15 минут, иначе переходит к следующему (FR-BOOK-03).',
        'Продвижение автоматическое: уведомление приходит на основной канал и в приложение (FR-BOOK-08).',
        'Одна заявка в очереди на человека на сессию; встать в очередь можно из карточки сессии без свободных мест.'
      ],
      depends: ['D-07', 'каналы уведомлений']
    },
    html() {
      const w = F.WAITLIST, s = F.session(w.session), waiting = P.isWaiting(w.session), pos = P.bk().waitPos[w.session] || w.pos;
      if (!waiting) {
        return '<div class="scr prg-scr">' + D.head({ backHist: true, eyebrow: 'Лист ожидания', title: 'Вы не в очереди', sub: esc(w.title), paren: paren('встать в очередь можно из карточки сессии') }) +
          '<div class="prg-c3body"><div class="empty"><div class="e-title">Очереди нет</div><div class="e-text">Вы вышли из листа ожидания. Если места ещё нет, встать в очередь можно снова: вы займёте последнее место.</div>' +
          '<button class="btn btn-primary" data-go="C3/' + w.session + '">К карточке сессии</button></div></div></div>';
      }
      return '<div class="scr prg-scr">' +
        D.head({ backHist: true, eyebrow: 'Лист ожидания', title: 'Вы в очереди', sub: esc(w.hall) + ' · ' + esc(w.was), paren: paren('место подтвердится автоматически') }) +
        '<div class="prg-c3body">' +
        '<div class="card accent-edge" style="text-align:center;padding:26px 16px"><div class="cap">ваше место в очереди</div>' +
        '<div class="prg-bignum">' + pos + '</div><div class="cap" style="margin-top:6px">' + esc(w.title) + '</div></div>' +
        '<div class="banner info">' + icon('clock') + '<div style="flex:1"><div class="b-title">Как это работает</div>' +
        '<div class="cap">Освободится место — система предложит его вам первой. У вас будет ' + w.confirmMin + ' ' + pl(w.confirmMin, ['минута', 'минуты', 'минут']) + ' на подтверждение, затем предложение уйдёт дальше.</div></div></div>' +
        '<div class="card"><div class="grow"><div class="r-title">' + esc(w.title) + '</div>' +
        '<div class="r-sub">' + esc(w.hall) + ' · ' + esc(w.was) + ' · запрошено сегодня</div></div>' +
        '<div class="grid-2"><button class="btn btn-secondary btn-sm" data-go="C3/' + w.session + '">Карточка</button>' + P.pathBtn(F.pathTypeOf(s), s.id) + '</div></div>' +
        '<button class="btn btn-ghost btn-block" data-act="d3-leave">Выйти из листа ожидания</button>' +
        '</div></div>';
    }
  });
  D.action('d3-leave', () => {
    D.openSheet('<div class="sheet-title">Выйти из очереди</div>' +
      '<div class="card"><div class="card-title">' + esc(F.WAITLIST.title) + '</div><div class="cap">Ваше место пропадёт, вернуться можно только в конец очереди.</div></div>' +
      '<button class="btn btn-primary btn-block" data-act="d3-leave-ok">Выйти из очереди</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Остаться</button>');
  });
  D.action('d3-leave-ok', () => { D.closeSheet(); delete P.bk().wait[F.WAITLIST.session]; D.rerender(); say('Вы вышли из листа ожидания'); });

  /* ---------- D4 Недоступно по тарифу ---------- */
  D.register('D4', {
    tab: 'C1',
    meta: {
      title: 'D4 · Недоступно по тарифу',
      role: 'Гость, тариф Оптимум (демо-вид)',
      fr: ['FR-BOOK-01', 'FR-PROG-15', 'FR-PROG-03'],
      ac: ['AC-BOOK-05', 'AC-PROG-03', 'AC-PROG-13'],
      what: [
        'Вид для гостя с тарифом Оптимум: менторские окна (D4 без параметра, ментор — D4 с ключом спикера) или сессия (D4 с идентификатором сессии): закрытая тарифом получает своё правило («Доступно: только Первый класс»), открытая всем (питч-сессия, митап) — «Открыто всем тарифам».',
        'Объяснение без давления: запись закрыта тарифом, программа и карточка видны всем.',
        'Что доступно в это время: открытые сессии с кнопкой «+ Путь»; «Написать организатору» — лист с текстом.',
        'Неверный адрес — «Не найдено».'
      ],
      rules: [
        'Оптимум не записывается на менторские и экспертные гостиные (D-26); квота 0 по умолчанию, меняется настройкой (FR-BOOK-01, AC-BOOK-05).',
        'Оптимум не выступает в деловой программе (D-41, FR-PROG-15); питч-сессии и митапы в зоне митапов Экспо открыты всем тарифам.',
        'Сессии «Бизнес и Первый класс» видны Оптимуму с пометкой, запись и «+ Путь» для закрытых недоступны (AC-PROG-03).'
      ],
      depends: ['тарифная сетка', 'D-07', 'D-26', 'D-41']
    },
    html(ctx) {
      const prm = ctx.param;
      const sess = prm && F.session(prm) ? F.session(prm) : null;
      if (prm && !sess && !(F.speaker(prm) && F.mentorWindows(prm).length)) { return P.notFound('Не найдено', 'Такой сессии или ментора нет. Откройте их из программы.'); }
      const key = !sess && prm ? prm : 'levin';
      let title, sub, body, alt, backTo, banner;
      const lock = (t, c) => '<div class="banner warn">' + icon('lock') + '<div><div class="b-title">' + t + '</div><div class="cap">' + c + '</div></div></div>';
      if (sess) {
        const open = F.canBook(sess, 'Оптимум');
        title = sess.format; backTo = 'C3/' + sess.id;
        sub = esc(sess.time) + '–' + esc(F.sessionEnd(sess)) + ' · ' + esc(hallLabel(F.hall(sess.hall)));
        body = '<div class="card"><div class="prg-c3title" style="font-size:16px">' + esc(sess.title) + '</div><div class="prg-text">' + esc(sess.desc) + '</div></div>';
        banner = open
          ? '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Открыто всем тарифам</div><div class="cap">' + (F.isZone(sess) ? 'Зона митапов Экспо открыта всем, в том числе тарифу Оптимум. ' : '') + 'Записаться можно в карточке сессии.</div></div></div>'
          : lock('Закрыто для вашего тарифа', 'Доступно: ' + esc(P.accessText(sess)) + '. Ваш тариф — Оптимум; программа и карточка видны всем.');
        alt = F.overlapping(sess).concat(F.SESSIONS.filter(x => x.id !== sess.id && x.day === sess.day && x.hall === sess.hall && x.time === sess.time));
      } else {
        const sp = F.speaker(key), slots = F.mentorSlots(key).filter(w => !P.isPastWin(w)), next = slots[0];
        title = sp.name; backTo = 'D1'; sub = esc(sp.role) + ' · ' + esc(sp.company);
        body = '<div class="card"><div class="cap">Менторская гостиная · 30 минут · ' + esc(F.hall('magnolia').name) + '</div>' +
          slots.map(w => '<div class="row prg-lockrow"><div class="grow"><div class="r-title">' + esc(w.day) + ' · ' + esc(w.time) + '–' + P.mentorEnd(w) + '</div>' +
            '<div class="r-sub">стол ' + w.table + '</div></div><span class="lock-note">' + icon('lock') + 'запись закрыта</span></div>').join('') + '</div>';
        banner = lock('Закрыто для вашего тарифа', 'Менторские и экспертные гостиные доступны тарифам Бизнес и Первый класс. Ваш тариф — Оптимум; программа и карточка видны всем.');
        alt = next ? F.SESSIONS.filter(x => x.day === next.day && tmin(x.time) < tmin(next.time) + 30 && tmin(next.time) < tmin(x.time) + x.dur) : [];
      }
      alt = alt.filter((x, i, a) => F.canBook(x, 'Оптимум') && F.sessionState(x) !== 'past' && a.indexOf(x) === i && (!sess || x.id !== sess.id)).slice(0, 4);
      const altRows = alt.map(x => '<div class="row"><div class="grow prg-altgo" data-go="C3/' + x.id + '"><div class="r-title">' + esc(x.title) + '</div>' +
        '<div class="r-sub">' + esc(x.time) + ' · ' + esc(hallLabel(F.hall(x.hall))) + '</div></div>' + P.pathBtn(F.pathTypeOf(x), x.id) + '</div>').join('');
      return '<div class="scr prg-scr">' +
        D.head({ backHist: true, eyebrow: 'Вид тарифа Оптимум', title: esc(title), sub: sub, actions: '<span class="hb-badge">Оптимум</span>',
          paren: paren('демо-вид: как экран выглядит у гостя тарифа Оптимум') }) +
        '<div class="prg-c3body">' + body + banner +
        (altRows ? '<div><div class="sec-title" style="margin-top:0">Открыто вам в это время</div><div class="card" style="padding:2px 14px"><div class="list">' + altRows + '</div></div></div>' : '') +
        '<button class="btn btn-primary btn-block" data-act="d-tg">' + icon('send') + 'Написать организатору</button>' +
        '<button class="btn btn-secondary btn-block" data-go="C1">К программе дня</button>' +
        '</div></div>';
    }
  });

  /* ---------- D5 Мои записи ---------- */
  /* предупреждения по подтверждённому: пересечения и нехватка времени на переход (в том числе с записью на стенд) */
  function recWarnings() {
    const eff = P.committed().sort((a, b) => a.day.localeCompare(b.day) || tmin(a.time) - tmin(b.time)), out = [];
    for (let i = 1; i < eff.length; i++) {
      const p = eff[i - 1], c = eff[i];
      if (p.day !== c.day) { continue; }
      const gap = tmin(c.time) - (tmin(p.time) + p.dur), need = p.hall && c.hall ? P.transit(p.hall, c.hall) : null;
      if (gap < 0) { out.push('Пересечение: ' + qt(p.title) + ' и ' + qt(c.title) + ' накладываются на ' + mm(-gap)); }
      else if (need != null && gap < need) { out.push('Не успеваете: после ' + qt(p.title) + ' до ' + qt(c.title) + ' ' + mm(gap) + ', на переход нужно ' + mm(need)); }
    }
    return out;
  }
  D.register('D5', {
    tab: 'C1',
    meta: {
      title: 'D5 · Мои записи',
      role: 'Гость, записи на сессии и менторские',
      fr: ['FR-BOOK-04', 'FR-BOOK-03', 'FR-BOOK-05', 'FR-BOOK-08'],
      ac: ['AC-BOOK-02', 'AC-PROG-04'],
      what: [
        'Все подтверждённые записи: сессии по дням, менторские окна отдельным блоком, очередь в листе ожидания.',
        'Предупреждение о пересечении или нехватке времени между подтверждёнными (в исходных данных две записи пересекаются на 5 минут: демонстрация конфликта для «Конфликты и переходы»).',
        'Срок отмены у каждой записи (не позднее чем за 2 часа до начала); если срок вышел, сказано, что делать, и есть «Написать организатору».',
        'Отмена через лист подтверждения: место уходит в очередь, пункт остаётся в «Мой путь».'
      ],
      rules: [
        'Отмена возможна не позднее чем за 2 часа до начала; позже — только через организатора (FR-BOOK-04); одно правило canCancel с C3 и D2.',
        'Менторские окна показываются отдельно от сессий; записи экспонентов (КипяTALK) — в разделе Маркетплейс.',
        'Список строится по состоянию записей демо: новые записи из C3, D1 и D2 появляются здесь сразу.'
      ],
      depends: ['D-07']
    },
    html() {
      P.syncBooked();
      const ss = P.bookedList().map(id => F.session(id)).filter(Boolean).sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
      const ms = myMentorWins();
      const wait = P.isWaiting(F.WAITLIST.session);
      const n = ss.length + ms.length, warns = recWarnings();
      const cancelBlock = (arg, day, time) => {
        const ci = F.canCancel(day, time);
        return ci.ok
          ? '<div class="cap">отмена не позднее ' + esc(ci.text) + '</div><button class="btn btn-ghost btn-sm" data-act="d-cancel" data-arg="' + esc(arg) + '">Отменить</button>'
          : '<div class="cap">отмена закрыта: до начала меньше двух часов</div><button class="btn btn-ghost btn-sm" data-act="d-tg" data-arg="cancel:' + esc(arg.slice(0, 2) === 's|' ? arg.slice(2) : arg) + '">Организатору</button>';
      };
      const sRows = ss.map(s => '<div class="prg-rec"><div class="prg-rec-main" data-go="C3/' + s.id + '"><div class="prg-time">' + esc(s.day.slice(0, 5)) + ' · ' + esc(s.time) + '</div>' +
        '<div class="r-title">' + esc(s.title) + '</div><div class="r-sub">' + esc(hallLabel(F.hall(s.hall))) + ' · ' + esc(s.format) + '</div></div>' +
        '<div class="prg-rec-act">' + cancelBlock('s|' + s.id, s.day, s.time) + '</div></div>').join('');
      const mRows = ms.map(it => {
        const w = slotOf(it.ref, it.day, it.time);
        return '<div class="prg-rec"><div class="prg-rec-main" data-go="D2/' + mentorParam(it.ref, it.day, it.time) + '"><div class="prg-time">' + esc(it.day.slice(0, 5)) + ' · ' + esc(it.time) + '</div>' +
          '<div class="r-title">' + esc(it.title) + '</div><div class="r-sub">' + (w ? 'стол ' + w.table + ' · ' : '') + esc(F.hall('magnolia').name) + ' · 30 минут</div></div>' +
          '<div class="prg-rec-act">' + cancelBlock('m|' + it.ref + '|' + it.day + '|' + it.time, it.day, it.time) + '</div></div>';
      }).join('');
      const wRow = wait ? '<div class="prg-rec"><div class="prg-rec-main" data-go="D3"><div class="prg-time">' + esc(F.WAITLIST.was.slice(0, 5)) + '</div>' +
        '<div class="r-title">' + esc(F.WAITLIST.title) + '</div><div class="r-sub">место в очереди: ' + (P.bk().waitPos[F.WAITLIST.session] || F.WAITLIST.pos) + ' · ' + esc(F.WAITLIST.hall) + '</div></div>' +
        '<div class="prg-rec-act"><div class="cap">ожидает подтверждения места</div><button class="btn btn-ghost btn-sm" data-go="D3">Очередь</button></div></div>' : '';
      return '<div class="scr prg-scr">' +
        D.head({ backHist: true, eyebrow: 'Программа', title: 'Мои записи', sub: n + ' ' + pl(n, ['запись', 'записи', 'записей']) + (wait ? ' · очередь: 1' : ''),
          paren: paren('отмена не позднее чем за 2 часа до начала') }) +
        '<div class="prg-c3body">' +
        (warns.length ? '<div class="banner conflict-warn">' + icon('alert') + '<div class="grow">' + warns.map(w => '<div class="prg-warn">' + esc(w) + '</div>').join('') +
          '<button class="btn btn-ghost btn-sm prg-inl" data-go="B7">Конфликты и переходы</button></div></div>' : '') +
        (n || wait ? '' : '<div class="empty"><div class="e-title">Записей нет</div><div class="e-text">Запишитесь на сессию в карточке или к ментору в разделе «Менторские».</div><button class="btn btn-primary" data-go="C1">К программе</button></div>') +
        (sRows ? '<div><div class="sec-title" style="margin-top:0">Сессии · ' + ss.length + '</div><div class="card" style="padding:2px 14px">' + sRows + '</div></div>' : '') +
        (mRows ? '<div><div class="sec-title" style="margin-top:0">Менторские окна · ' + ms.length + '</div><div class="card" style="padding:2px 14px">' + mRows + '</div></div>' : '') +
        (wRow ? '<div><div class="sec-title" style="margin-top:0">Лист ожидания</div><div class="card" style="padding:2px 14px">' + wRow + '</div></div>' : '') +
        '<div class="banner">' + icon('info') + '<div class="cap">Отменённое место сразу уходит в лист ожидания: система предложит его первому в очереди.</div></div>' +
        '<div class="grid-2"><button class="btn btn-secondary" data-go="D1">Менторские</button><button class="btn btn-secondary" data-go="C4">Избранное</button></div>' +
        '</div></div>';
    }
  });

  /* ---------- D6 Освободилось место ---------- */
  const fmtTimer = n => Math.floor(n / 60) + ':' + String(n % 60).padStart(2, '0');
  D.register('D6', {
    tab: 'C1',
    meta: {
      title: 'D6 · Освободилось место',
      role: 'Гость, лист ожидания',
      fr: ['FR-BOOK-03', 'FR-BOOK-08'],
      ac: ['AC-BOOK-02'],
      what: [
        'Уведомление об освободившемся месте, обратный отсчёт срока подтверждения — 15 минут (идёт на экране).',
        'Кнопка «Подтвердить запись» создаёт запись и ведёт в D2; «Отказаться» (через лист) передаёт место следующему, решение сохраняется: экран остаётся в состоянии «Место передано».',
        'Если место пересекается с вашей записью, это видно в предупреждении; когда время вышло, экран показывает, что место передано.'
      ],
      rules: [
        'Подтверждение обязательно в течение 15 минут, иначе место уйдёт следующему в очереди (FR-BOOK-03).',
        'Предложение приходит на основной канал и дублируется в приложении; одно активное предложение на человека.',
        'Для предложения из очереди пересечение показывается предупреждением и не блокирует (место держится ограниченное время); решить конфликт можно позже в «Конфликты и переходы» (допущение, согласовать).'
      ],
      depends: ['D-07', 'каналы уведомлений']
    },
    html() {
      const st = D.st('D6'), fs = F.FREED_SEAT, s = F.session(fs.session);
      if (st.deadline == null) { st.deadline = 900; }
      const done = P.isBookedNow(fs.session), declined = !!P.bk().declined[fs.session], expired = !done && !declined && st.deadline <= 0;
      const cf = P.conflictsFor(s);
      const head = D.head({ backHist: true, eyebrow: 'Лист ожидания', title: done ? 'Вы записаны' : declined ? 'Место передано' : expired ? 'Время вышло' : 'Место для вас', sub: esc(fs.hall) + ' · ' + esc(fs.time),
        paren: paren(done ? 'запись подтверждена' : declined ? 'вы отказались от места' : expired ? 'место ушло следующему' : 'подтвердите, пока место за вами') });
      if (done || declined || expired) {
        return '<div class="scr prg-scr">' + head + '<div class="prg-c3body">' +
          (done ? '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Запись подтверждена</div><div class="cap">' + esc(qt(fs.title)) + ' · ' + esc(fs.time) + ' · ' + esc(fs.hall) + '</div></div></div>' +
            '<button class="btn btn-primary btn-block" data-go="D2/' + fs.session + '">Открыть подтверждение</button>'
            : '<div class="banner warn">' + icon('clock') + '<div><div class="b-title">Место передано следующему</div><div class="cap">' + (declined ? 'Вы отказались от места, вернуть его нельзя.' : 'Вы не подтвердили запись за ' + F.WAITLIST.confirmMin + ' минут.') + ' Вы остаётесь в очереди на другие сессии.</div></div></div>' +
              '<button class="btn btn-primary btn-block" data-go="C3/' + fs.session + '">К карточке сессии</button>') +
          '<button class="btn btn-ghost btn-block" data-go="D5">Мои записи</button></div></div>';
      }
      return '<div class="scr prg-scr">' + head + '<div class="prg-c3body">' +
        '<div class="banner ok">' + icon('check') + '<div style="flex:1"><div class="b-title">Освободилось место</div>' +
        '<div class="cap">' + esc(qt(fs.title)) + ' · ' + esc(fs.time) + ' · ' + esc(fs.hall) + '</div></div></div>' +
        '<div class="card" style="text-align:center;padding:20px 16px"><div class="cap">на подтверждение осталось</div>' +
        '<div class="prg-bignum prg-timer" id="d6-timer">' + fmtTimer(st.deadline) + '</div>' +
        '<div class="cap" style="margin-top:4px">ваше место в очереди: ' + F.WAITLIST.pos + ' · предложение ваше</div></div>' +
        (cf.hard.length || cf.soft.length ? '<div style="display:flex;flex-direction:column;gap:8px">' + P.conflictBanners(cf, true) + '</div>' : '') +
        '<button class="btn btn-primary btn-block" data-act="d6-confirm">Подтвердить запись</button>' +
        '<button class="btn btn-ghost btn-block" data-act="d6-decline">Отказаться</button></div></div>';
    },
    mount(host) {
      const el = host.querySelector('#d6-timer'); if (!el) { return; }
      const st = D.st('D6'), iv = setInterval(() => {
        if (!document.body.contains(el)) { clearInterval(iv); return; }
        st.deadline = Math.max(0, st.deadline - 1);
        el.textContent = fmtTimer(st.deadline);
        if (st.deadline <= 0) { clearInterval(iv); D.rerender(); }
      }, 1000);
    }
  });
  D.action('d6-confirm', () => {
    if (!P.bookSession(F.FREED_SEAT.session, { ignoreFull: true })) { say('Записаться нельзя: правила записи не выполнены'); return; }
    D.rerender(); say('Вы записаны на сессию');
  });
  D.action('d6-decline', () => {
    D.openSheet('<div class="sheet-title">Отказаться от места</div>' +
      '<div class="card"><div class="card-title">' + esc(F.FREED_SEAT.title) + '</div><div class="cap">Место перейдёт следующему в очереди, вернуть его будет нельзя.</div></div>' +
      '<button class="btn btn-primary btn-block" data-act="d6-decline-ok">Отказаться</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Оставить место</button>');
  });
  D.action('d6-decline-ok', () => { D.closeSheet(); P.bk().declined[F.FREED_SEAT.session] = true; D.rerender(); say('Место передано следующему'); });
})();
