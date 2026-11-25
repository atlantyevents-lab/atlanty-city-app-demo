/* Блок G — встречи. Этап S5 (демо v3): G1…G11.
   Источник правды — FIX.PPL.store.meets (data/fx_people.js) и общие помощники window.PPLUI (js/screens/F.js, подключается раньше).
   Два пространства в хабе (D-55): «Менторская» (рецепция, сервис) и «Нетворкинг-зона B2B» (столы с номерами). */
(function () {
  'use strict';
  const D = window.Demo, F = window.FIX, P = F.PPL, S = P.store, U = window.PPLUI;
  const { esc, icon, paren, tag, tariffTag, avatar } = D;
  const plural = D.plural;
  const { inferSrc, routeParam, backOf, autosize, pathBtn, meetOf, meetWho, newMeetId, range, confirmSheet, sumRow, linksRail, SEG, MST, MST_CLS, mstOf, SRC, PEOPLE_FORMS, sees, when, dateOf } = U;
  const person = id => F.person(id);
  const HOLD_MS = 120000;                                   /* удержание окна: параметр, 120 секунд */
  const LEAD_MIN = 11 * 60 + 40;                            /* сегодня окно доступно, если до начала не меньше 30 минут (сейчас 11:10) */
  const MEET_FORMS = ['встреча', 'встречи', 'встреч'];
  const DAYS = P.DAYS;
  const dayWord = d => P.dayWord(d);
  const NETSP = 'Нетворкинг-зона B2B';
  const keyOf = x => x.day + ' ' + x.label + ' ' + (x.table || '');

  function ringSVG(frac) {
    const r = 26, c = 2 * Math.PI * r;
    return '<span class="ring"><svg width="64" height="64" viewBox="0 0 64 64">' +
      '<circle class="ring-bg" cx="32" cy="32" r="' + r + '" fill="none" stroke-width="5"/>' +
      '<circle class="ring-fg" cx="32" cy="32" r="' + r + '" fill="none" stroke-width="5" stroke-dasharray="' + c + '" stroke-dashoffset="' + (c * (1 - frac)).toFixed(1) + '"/>' +
      '</svg><span class="ring-num" data-ring-num></span></span>';
  }
  const meetById = id => P.meet(id);
  function meetPathAttrs(m) {
    const w = m.who || {};
    if (w.type === 'speaker') { return { type: 'mentor', ref: w.key, day: m.day, time: m.start }; }
    if (w.type === 'exhibitor') { return { type: 'stand', ref: w.id, day: m.day, time: m.start }; }
    const p = person(w.id);
    return { type: p && p.hb ? 'buyer' : 'person', ref: w.id, day: m.day, time: m.start };
  }
  function meetPathBtn(m, cls) { const a = meetPathAttrs(m); return pathBtn(a.type, a.ref, { day: a.day, time: a.time, cls: cls || 'btn-secondary' }); }
  /* пункт «Мой путь», который соответствует встрече: отмена встречи снимает его из пути, перенос меняет время (через общий контракт FIX.pathRemove) */
  function syncPath(m, oldStart, newStart) {
    const a = meetPathAttrs(m), it = F.pathFindAny ? F.pathFindAny(a.type, a.ref, m.day, oldStart) : null;
    if (!it) { return; }
    if (newStart) { it.time = newStart; } else { F.pathRemove(it.id); }
  }
  /* параметр G2 для встречи: человек или экспонент (иначе висящий слэш) */
  function whoParam(m) { const w = m.who || {}; return w.type === 'person' ? w.id : (w.type === 'exhibitor' ? w.id : ''); }
  function whoCard(m) {
    const w = meetWho(m);
    const isP = m.who && m.who.type === 'person';
    const p = isP ? person(m.who.id) : null;
    return '<button class="ppl-who" data-go="' + w.go + '">' + avatar(w.av || w.name, 'sm') + '<span class="grow"><span class="r-title">' + esc(w.name) + '</span><span class="r-sub">' + esc(w.sub) + '</span></span>' +
      (p ? tariffTag(p.tariff) : '') + icon('chevR') + '</button>';
  }
  /* ================= G1 «Встречи: хаб» ================= */

  function meetRow(m) {
    const w = meetWho(m);
    return '<button class="ppl-meet" data-go="G4/' + m.id + '"><span class="tm">' + esc(m.start) + '<small>' + esc(dayWord(m.day)) + '</small></span>' +
      '<span class="grow"><span class="r-title">' + esc(w.name) + '</span><span class="r-sub">' + esc(m.place) + '</span>' +
      '<span class="ppl-st ' + MST_CLS[m.status] + '">' + esc(mstOf(m)) + '</span></span>' + icon('chevR') + '</button>';
  }
  /* ближайшее окно нетворкинг-зоны, свободное у вас (не занято встречей и «Мой путь») и со свободным столом */
  function nearestNet() {
    for (let d = 0; d < DAYS.length; d++) {
      for (let i = 0; i < P.WIN.length; i++) {
        const label = P.WIN[i];
        if (d === 0 && P.toMin(label) < LEAD_MIN) { continue; }
        if (P.busyAt(DAYS[d], label)) { continue; }
        const n = P.netFree(i, DAYS[d]).length;
        if (n) { return { day: DAYS[d], label: label, free: n }; }
      }
    }
    return null;
  }
  function spaceCard(sp) {
    let note = '';
    if (sp.type === 'network') {
      const nn = nearestNet();
      note = '<span class="ppl-note">' + (nn ? 'Ближайшее окно, свободное у вас: ' + esc(when(nn.day, nn.label)) + '; свободных столов: ' + nn.free + ' из ' + sp.units + '. ' : '') + esc(P.NET.note) + '</span>';
    }
    return '<button class="ppl-space" data-act="g1-space" data-arg="' + sp.id + '">' +
      '<span class="h"><span class="t">' + esc(sp.name) + '</span>' + tag(sp.access) + '</span>' +
      '<span class="d">' + esc(sp.desc) + '</span>' +
      '<span class="m">' + tag(sp.place) + tag('столы 1–' + sp.units) + tag('окна по 30 минут') + '</span>' +
      note +
      '<span class="go">Выбрать окно' + icon('chevR') + '</span></button>';
  }

  D.register('G1', {
    tab: 'F1',
    meta: {
      title: 'G1 · Встречи',
      role: 'Гость, участник',
      fr: ['FR-MEET-01', 'FR-MEET-09', 'FR-MEET-15', 'FR-PPL-11'],
      ac: ['AC-MEET-11', 'AC-PPL-07'],
      what: [
        'Сегмент «Встречи» вкладки «Участники»: мои ближайшие встречи (сегодня и завтра), прошедшие и отменённые, счётчики встреч на сегодня, входящих заявок и ожидающих ответа.',
        'Два разных пространства (D-55): «Менторская» (рецепция и сервис ментора, окна по 30 минут, столы 1–8) и «Нетворкинг-зона B2B» (столы с номерами; система предлагает окно и стол).',
        'Быстрые переходы: окна встреч, заявки, приглашённый покупатель, договорённости, исходящие.'
      ],
      rules: [
        'Входящих заявок в день не более 4, исходящих ожидающих не более 5; окна по 30 минут.',
        'Параметры нетворкинг-зоны (вместимость, место, оформление, номера столов) задаются организаторами и уточняются по планировке Экспо (D-55, O-24); столы 1–24 демонстрационные.',
        'Слово «комната сделок» нетворкинг-зоной не заменяется: это отдельное пространство (FR-MEET-15).',
        'После сохранённого итога встреча получает статус «Состоялась» и уходит в «Прошедшие».',
        'Мягкий конфликт встреч даёт предупреждение о времени на переход.'
      ],
      depends: ['D-36', 'D-55', 'FR-MEET-15']
    },
    html() {
      const all = S.meets.slice().sort((a, b) => (a.day + a.start).localeCompare(b.day + b.start));
      const live = all.filter(m => m.day >= '27.02' && m.status !== 'cancelled' && m.status !== 'held');
      const today = live.filter(m => m.day === '27.02');
      const past = all.filter(m => m.day < '27.02' || m.status === 'held' || m.status === 'cancelled');
      const incoming = P.inboxNew();
      const youAg = S.agreements.filter(a => a.status === 'you').length;
      const spaces = P.SPACES.filter(x => x.type === 'mentor' || x.type === 'network');
      spaces.sort(a => a.type === 'network' ? 1 : -1);
      return '<div class="scr">' +
        D.head({ eyebrow: esc(F.NOW.dateLong), title: 'Встречи', sub: 'Окна, заявки, договорённости', paren: paren('окна по 30 минут · 11:30–17:30') }) +
        D.segbar(SEG, 'G1') + linksRail() +
        '<div class="ppl-body">' +
        '<div class="ppl-kpis"><div class="kpi-cell"><div class="k">Сегодня</div><div class="v">' + today.length + '</div></div>' +
        '<div class="kpi-cell"><div class="k">Входящие</div><div class="v">' + incoming + '</div></div>' +
        '<div class="kpi-cell"><div class="k">Ожидают</div><div class="v">' + P.pendingOut() + '</div></div></div>' +
        '<div class="ppl-sec">Мои встречи<button class="more" data-go="G2">Новая встреча</button></div>' +
        (live.length ? '<div class="ppl-box">' + live.map(meetRow).join('') + '</div>' :
          '<div class="card ppl-empty"><div class="e-title">Ближайших встреч нет</div><div class="e-text">Выберите окно и отправьте заявку человеку или экспоненту.</div><button class="btn btn-secondary btn-sm" data-go="G2">Выбрать окно</button></div>') +
        (past.length ? '<div class="ppl-sec">Прошедшие и отменённые</div><div class="ppl-box">' + past.map(meetRow).join('') + '</div>' : '') +
        '<div class="ppl-sec">Пространства встреч</div>' +
        spaces.map(spaceCard).join('') +
        '<div class="ppl-sec">Быстро</div>' +
        '<div class="ppl-quick">' +
        '<button class="ppl-q" data-go="G2"><b>' + icon('clock') + 'Окна встреч</b><span>свободное время и столы</span></button>' +
        '<button class="ppl-q" data-go="F4"><b>' + icon('inbox') + 'Заявки</b><span>' + (incoming ? incoming + ' ' + plural(incoming, ['новая входящая заявка', 'новые входящие заявки', 'новых входящих заявок']) : 'новых заявок нет') + '</span></button>' +
        '<button class="ppl-q" data-go="G10"><b>' + icon('star') + 'Приглашённый покупатель</b><span>Hosted Buyer, 20 встреч</span></button>' +
        '<button class="ppl-q" data-go="G9"><b>' + icon('check') + 'Договорённости</b><span>' + (youAg ? 'ждут вашего ответа: ' + youAg : 'все согласованы') + '</span></button>' +
        '</div>' +
        '<button class="btn btn-ghost btn-block" data-go="F5">Исходящие заявки · ' + P.pendingOut() + ' из ' + P.LIMITS.outPending + '</button>' +
        '</div></div>';
    }
  });
  D.action('g1-space', el => {
    const st = D.st('G2');
    st.area = el.dataset.arg; st.win = null; st.heldUntil = null; st.table = null; st.day = null;
    location.hash = '#/G2';
  });

  /* ================= G2 «Выбор окна» ================= */

  function isPerson(id) { return !!(id && /^p\d+$/.test(id) && person(id)); }
  function isExh(id) { return !!(id && /^ex\d+$/.test(id) && F.exhibitor(id)); }
  function whoInfo(id) {
    if (isPerson(id)) { const p = person(id); return { id: id, kind: 'person', name: p.name, sub: p.role + ' · ' + p.company, go: 'F2/' + id, tariff: p.tariff }; }
    if (isExh(id)) {
      const ex = F.exhibitor(id), ee = F.EXH_EXT && F.EXH_EXT[id];
      return { id: id, kind: 'exhibitor', name: ex.name, sub: ex.what + ' · стенд ' + ex.stand, go: 'H2/' + id, rep: ee && ee.reps && ee.reps[0] ? ee.reps[0].name : '' };
    }
    return null;
  }
  const exExt = id => (F.EXH_EXT && F.EXH_EXT[id]) || null;
  const exAccepts = id => { const x = exExt(id); return !x || x.accepts !== false; };
  /* ячейки сетки окон на день: окно занято, если у вас в это время встреча или принятый/записанный пункт «Мой путь» */
  function g2Cells(area, who, day) {
    const di = Math.max(0, DAYS.indexOf(day)), sp = P.space(area);
    const e = isPerson(who) ? P.ext(who) : null;
    const avail = e ? (di === 0 ? e.avail : (e.avail2 || [])) : null;
    const wins = area === 'ms-network' ? null : F.spaceWindows(area);
    const xe = (area === 'ms-booth' && isExh(who)) ? exExt(who) : null;
    let exLeft = xe && xe.windows ? (di === 0 ? xe.windows.free : xe.windows.total) : null;
    return P.WIN.map((label, i) => {
      if (di === 0 && P.toMin(label) < LEAD_MIN) { return { label: label, state: 'off', sub: 'скоро начало' }; }
      const b = P.busyAt(day, label);
      if (b) { return { label: label, state: 'mebusy', sub: b.kind === 'meet' ? 'занято у вас' : 'в вашем пути', why: b.kind === 'path' ? b.it.title : '' }; }
      if (avail && avail.indexOf(label) < 0) { return { label: label, state: 'off', sub: 'нет у человека' }; }
      if (area === 'ms-booth' && isExh(who)) {
        if (!exAccepts(who)) { return { label: label, state: 'taken', sub: 'не принимает встречи' }; }
        if (F.exOnSite && !F.exOnSite(who, day, label)) { return { label: label, state: 'off', sub: 'на стенде перерыв' }; }
        if (exLeft != null) {
          if (exLeft <= 0) { return { label: label, state: 'taken', sub: 'все заняты' }; }
          exLeft--;
          return { label: label, state: 'free', sub: 'окно на стенде' };
        }
      }
      if (area === 'ms-network') {
        const n = P.netFree(i, day).length;
        return n ? { label: label, state: 'free', sub: 'свободно ' + n + ' из ' + sp.units } : { label: label, state: 'taken', sub: 'все заняты' };
      }
      const w = wins[(i + 5 * di) % wins.length];
      if (!w || w.status === 'taken' || w.freeUnits <= 0) { return { label: label, state: 'taken', sub: 'все заняты' }; }
      return { label: label, state: 'free', sub: 'свободно ' + w.freeUnits + ' из ' + w.units };
    });
  }
  const freeCount = cells => cells.filter(c => c.state === 'free').length;
  /* день по умолчанию: ближайший, где есть свободное окно (сегодня все окна могут быть заняты вашим «Мой путь») */
  function defaultDay(area, who) {
    for (let d = 0; d < DAYS.length; d++) { if (freeCount(g2Cells(area, who, DAYS[d]))) { return DAYS[d]; } }
    return DAYS[0];
  }
  function pickTable(wi, day, prefer) {
    const tf = P.netFree(wi, day);
    if (prefer && tf.indexOf(prefer) >= 0) { return prefer; }
    return tf.indexOf(18) >= 0 ? 18 : tf[Math.floor(tf.length / 2)];
  }

  D.register('G2', {
    tab: 'F1',
    meta: {
      title: 'G2 · Выбор окна',
      role: 'Гость, участник',
      fr: ['FR-MEET-01', 'FR-MEET-02', 'FR-MEET-09', 'FR-MEET-15'],
      ac: ['AC-MEET-03', 'AC-MEET-09', 'AC-MEET-11'],
      what: [
        'Пространства чипами: Нетворкинг-зона B2B, Менторская, Комната сделок, Экспертный стол, Стенд экспонента, Кофе-точка; в Нетворкинг-зоне после окна выбирается стол с номером (предложенный системой отмечен).',
        'День: «Сегодня» и «Завтра»; открывается тот день, где у вас есть свободное окно. Сетка окон по 30 минут: свободно N из M, все заняты, занято у вас (встреча), в вашем пути (принятый или записанный пункт «Мой путь»), нет у человека, скоро начало.',
        'Выбранное окно удерживается 2 минуты (кольцевой таймер); по истечении окно освобождается. Выбор участника или экспонента, если он не задан; смена человека сохраняет удержание, если окно у него свободно.',
        'Продолжение к заявке G3 с выбранными днём, окном и столом.'
      ],
      rules: [
        'Окна по 30 минут с 11:30 до 17:30; сегодня окно доступно, если до его начала не меньше 30 минут.',
        'Окно, пересекающееся с вашей встречей или с принятым или записанным пунктом «Мой путь», не предлагается и свободным не показывается.',
        'Удержание выбранного окна — 120 секунд (параметр); заявка занимает окно при отправке.',
        'Лимиты: входящих встреч в день не более 4, исходящих ожидающих не более 5.',
        'Столы и окна нетворкинг-зоны — демонстрационная раскладка; параметры зоны задают организаторы (D-55).',
        'Менторская и Нетворкинг-зона B2B — два разных пространства; запись к конкретному ментору — в «Менторские» (D1).'
      ],
      depends: ['D-25', 'D-55', 'параметры MEET', 'матрица переездов']
    },
    html(ctx) {
      const st = ctx.state;
      if (ctx.param && (isPerson(ctx.param) || isExh(ctx.param))) {
        if (st.who !== ctx.param) {
          st.who = ctx.param; st.win = null; st.heldUntil = null; st.table = null; st.day = null;
          if (isExh(ctx.param)) { st.area = 'ms-booth'; } else if (st.area === 'ms-booth') { st.area = 'ms-network'; }
        }
      }
      st.area = st.area || 'ms-network';
      const area = st.area, sp = P.space(area), who = st.who || null, wi = whoInfo(who);
      if (isPerson(ctx.param)) { const sc = inferSrc(); if (sc) { S.srcMap = S.srcMap || {}; S.srcMap[ctx.param] = sc; } }
      const held = st.win != null && st.heldUntil && st.heldUntil > Date.now();
      if (st.win != null && !held) { st.win = null; st.heldUntil = null; st.table = null; }
      const day = held ? st.winDay : (st.day && DAYS.indexOf(st.day) >= 0 ? st.day : defaultDay(area, who));
      const cells = g2Cells(area, who, day);
      const net = area === 'ms-network';
      const todayCells = day === DAYS[0] ? cells : g2Cells(area, who, DAYS[0]);
      const todayBlocked = !freeCount(todayCells) && todayCells.some(c => c.state === 'mebusy');

      const areaChips = P.SPACES.map(s =>
        '<button class="chip' + (s.id === area ? ' on' : '') + '" data-act="g2-area" data-arg="' + s.id + '">' + esc(s.name) + '</button>').join('');
      const dayBar = '<div class="segbar ppl-days">' + DAYS.map(d =>
        '<button class="seg' + (d === day ? ' on' : '') + '" data-act="g2-day" data-arg="' + d + '">' + esc(dayWord(d).replace(/^./, ch => ch.toUpperCase())) + ', ' + d + '</button>').join('') + '</div>';
      const grid = cells.map((c, i) => {
        const mine = held && st.win === i;
        const cls = mine ? 'mine' : c.state;
        const dis = !mine && c.state !== 'free';
        return '<button class="win-cell ' + cls + '" data-act="g2-win" data-arg="' + i + '" data-day="' + day + '"' + (dis ? ' disabled' : '') + (c.why ? ' title="' + esc(c.why) + '"' : '') + '><span class="t">' + esc(c.label) + '</span><span class="s">' + esc(mine ? 'удержано' : c.sub) + '</span></button>';
      }).join('');

      let tables = '';
      if (net && held) {
        const tf = P.netFree(st.win, day);
        const sug = pickTable(st.win, day);
        tables = '<div class="ppl-box pad"><div class="ppl-note"><b>Стол</b> в окне ' + esc(cells[st.win].label) + ': система предлагает стол ' + sug + '. Свободно ' + tf.length + ' из ' + P.NET.tables + '.</div><div class="ppl-tbls">';
        for (let n = 1; n <= P.NET.tables; n++) {
          const free = tf.indexOf(n) >= 0;
          tables += '<button class="ppl-tbl' + (st.table === n ? ' on' : '') + '" data-act="g2-table" data-arg="' + n + '"' + (free ? '' : ' disabled') + ' aria-label="Стол ' + n + (free ? '' : ', занят') + '">' + n + '</button>';
        }
        tables += '</div></div>';
      }
      let hold;
      if (held) {
        const left = Math.max(0, st.heldUntil - Date.now()), mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
        const ready = who && (!net || st.table);
        hold = '<div class="ppl-hold"><div class="ring-wrap">' + ringSVG(left / HOLD_MS) +
          '<div><div class="b-title" style="font-size:15px">Окно ' + esc((day === DAYS[0] ? '' : dayWord(day) + ', ') + cells[st.win].label) + (net && st.table ? ', стол ' + st.table : '') + ' удерживается</div>' +
          '<div class="cap">осталось ' + mm + ':' + String(ss).padStart(2, '0') + ' · ' + esc(sp.name) + '</div></div></div>' +
          (who ? '' : '<div class="ppl-note">Чтобы продолжить, выберите, с кем встреча.</div>') +
          '<button class="btn btn-primary btn-block" data-act="g2-go"' + (ready ? '' : ' disabled') + '>Продолжить к заявке</button></div>';
      } else {
        hold = '<div class="ppl-box pad"><div class="ppl-note">Выберите свободное окно: оно удержится на 2 минуты, затем отправьте заявку.</div></div>';
      }
      const noAvail = isPerson(who) && !P.hasAvail(who);

      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: wi ? 'Встреча: ' + esc(wi.name) : 'Встречи', title: 'Выбор окна', sub: esc(P.dayLong(day)) + ' · ' + esc(sp.name) + ' · ' + esc(sp.place), paren: paren('окно удерживается 2 минуты, не откладывайте заявку') }, backOf('G1'))) +
        '<div class="ppl-body">' +
        (wi ? '<button class="ppl-who" data-go="' + wi.go + '">' + avatar(wi.name, 'sm') + '<span class="grow"><span class="r-title">' + esc(wi.name) + '</span><span class="r-sub">' + esc(wi.sub) + '</span></span>' + (wi.tariff ? tariffTag(wi.tariff) : '') + icon('chevR') + '</button>' :
          '<button class="ppl-who" data-act="g2-who"><span class="ppl-sq">' + icon('userPlus') + '</span><span class="grow"><span class="r-title">С кем встреча</span><span class="r-sub">Выберите ' + (area === 'ms-booth' ? 'экспонента' : 'участника') + '</span></span>' + icon('chevR') + '</button>') +
        (wi ? '<div class="ppl-acts" style="padding-left:0"><button class="btn ppl-quiet btn-sm" data-act="g2-who">Выбрать другого</button></div>' : '') +
        '<div class="chip-rail ppl-spaces">' + areaChips + '</div>' +
        '<div class="ppl-note">' + esc(sp.desc) + (area === 'ms-mentor' ? ' <button class="ppl-inline" data-go="D1">К менторам</button>' : '') + '</div>' +
        dayBar +
        (todayBlocked && day !== DAYS[0] ? '<div class="banner info">' + icon('info') + '<div class="cap">Сегодня все окна заняты вашими встречами и пунктами «Мой путь»: ближайшие свободные показаны на завтра. <button class="ppl-inline" data-act="g2-day" data-arg="' + DAYS[0] + '">Посмотреть сегодня</button></div></div>' : '') +
        (noAvail ? '<div class="banner warn">' + icon('alert') + '<div class="cap"><b>В ближайшие дни у этого участника нет открытых окон.</b> <button class="ppl-inline" data-go="G11/' + who + '">Что можно сделать</button></div></div>' : '') +
        '<div class="card" style="padding:14px"><div class="win-grid">' + grid + '</div>' +
        '<div class="cap" style="margin-top:10px">' + esc(dayWord(day).replace(/^./, ch => ch.toUpperCase())) + ', ' + esc(day) + ' · окна с 11:30 до 17:30 · шаг 30 минут</div></div>' +
        tables + hold +
        '<div class="banner">' + icon('info') + '<div class="cap">Лимиты дня: входящих встреч не более 4, исходящих ожидающих не более 5. Если окон нет, предложим лист ожидания и другие варианты.</div></div>' +
        '</div></div>';
    },
    mount() {
      clearInterval(window.__g2timer);
      const tick = () => {
        const st = D.st('G2');
        const el = document.querySelector('.ring-num');
        if (!el || st.win == null) { clearInterval(window.__g2timer); return; }
        const left = Math.max(0, (st.heldUntil || 0) - Date.now());
        el.textContent = Math.floor(left / 60000) + ':' + String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
        const fg = document.querySelector('.ring-fg');
        if (fg) { const c = 2 * Math.PI * 26; fg.setAttribute('stroke-dashoffset', (c * (1 - left / HOLD_MS)).toFixed(1)); }
        if (left <= 0) {
          clearInterval(window.__g2timer);
          st.win = null; st.heldUntil = null; st.table = null;
          D.rerender();
          D.toast('Удержание окна истекло');
        }
      };
      tick();
      window.__g2timer = setInterval(tick, 500);
    }
  });
  D.action('g2-area', el => { const s = D.st('G2'); s.area = el.dataset.arg; s.win = null; s.heldUntil = null; s.table = null; s.day = null; D.rerender(); });
  D.action('g2-day', el => { const s = D.st('G2'); s.day = el.dataset.arg; s.win = null; s.heldUntil = null; s.table = null; D.rerender(); });
  D.action('g2-win', el => {
    const s = D.st('G2'), i = parseInt(el.dataset.arg, 10), day = el.dataset.day || DAYS[0];
    const c = g2Cells(s.area || 'ms-network', s.who, day)[i];
    if (!c || c.state !== 'free') { return; }
    s.win = i; s.winDay = day; s.day = day; s.heldUntil = Date.now() + HOLD_MS;
    s.table = (s.area || 'ms-network') === 'ms-network' ? pickTable(i, day, (S.draft && S.draft[s.who] && S.draft[s.who].table) || null) : null;
    D.rerender();
    const tb = document.querySelector('.ppl-tbls'), tgt = tb ? tb.parentNode : document.querySelector('.ppl-hold');
    if (tgt && tgt.scrollIntoView) { tgt.scrollIntoView({ block: 'center', behavior: 'smooth' }); }
  });
  D.action('g2-table', el => { const s = D.st('G2'); s.table = parseInt(el.dataset.arg, 10); D.rerender(); });
  D.action('g2-go', () => {
    const s = D.st('G2');
    if (!s.who || s.win == null || ((s.area || 'ms-network') === 'ms-network' && !s.table)) { return; }
    S.draft = S.draft || {};
    S.draft[s.who] = { day: s.winDay || DAYS[0], label: P.WIN[s.win], table: s.table, space: P.space(s.area).name, spaceId: s.area };
    location.hash = '#/G3/' + s.who;
  });
  D.action('g2-who', () => {
    const st = D.st('G2'), area = st.area || 'ms-network';
    let rows;
    if (area === 'ms-booth') {
      rows = F.EXHIBITORS.filter(e => { const x = F.EXH_EXT && F.EXH_EXT[e.id]; return !x || x.accepts; }).slice(0, 8).map(e =>
        '<button class="ppl-opt" data-act="g2-who-set" data-arg="' + e.id + '"><span>' + esc(e.name) + ' <span class="n">· стенд ' + esc(e.stand) + '</span></span>' + icon('chevR') + '</button>').join('');
    } else {
      rows = P.COFFEE_PICKS.concat(['p12', 'p19']).filter((v, i, a) => a.indexOf(v) === i).slice(0, 9).map(id => {
        const p = person(id);
        return '<button class="ppl-opt" data-act="g2-who-set" data-arg="' + id + '"><span>' + esc(p.name) + ' <span class="n">· ' + esc(p.company) + '</span></span>' + icon('chevR') + '</button>';
      }).join('');
    }
    D.openSheet('<div class="sheet-title">' + (area === 'ms-booth' ? 'Экспонент' : 'С кем встреча') + '</div><div class="ppl-opts">' + rows + '</div>');
  });
  D.action('g2-who-set', el => {
    const st = D.st('G2'), keepWin = st.win, keepDay = st.winDay, keepUntil = st.heldUntil, keepTable = st.table;
    st.who = el.dataset.arg;
    /* окно остаётся удержанным, если у нового человека оно свободно; иначе сбрасывается */
    const held = keepWin != null && keepUntil && keepUntil > Date.now();
    const c = held ? g2Cells(st.area || 'ms-network', st.who, keepDay)[keepWin] : null;
    if (held && c && c.state === 'free') {
      st.win = keepWin; st.winDay = keepDay; st.day = keepDay; st.heldUntil = keepUntil;
      st.table = (st.area || 'ms-network') === 'ms-network' ? (P.netFree(keepWin, keepDay).indexOf(keepTable) >= 0 ? keepTable : pickTable(keepWin, keepDay)) : null;
      D.closeSheet(); D.rerender();
    } else {
      st.win = null; st.heldUntil = null; st.table = null; st.day = null;
      D.closeSheet(); D.rerender();
      if (held) { D.toast('Это окно у выбранного человека недоступно, выберите другое'); }
    }
  });

  /* ================= G3 «Заявка на встречу» ================= */

  const chipText = x => (x.day === DAYS[0] ? '' : dayWord(x.day) + ' ') + x.label + (x.table ? ' · стол ' + x.table : '');
  function g3Options(key) {
    const wi = whoInfo(key);
    if (!wi) { return []; }
    const d = (S.draft || {})[key];
    const custom = d && d.label ? { day: d.day || DAYS[0], label: d.label, table: d.table, space: d.space || (wi.kind === 'person' ? NETSP : 'Стенд экспонента'), spaceId: d.spaceId, custom: true } : null;
    if (wi.kind === 'person') {
      /* окно из другого пространства (например, Комната сделок из G10): чипы смешивать нельзя, остаётся выбранное */
      if (custom && custom.spaceId && custom.spaceId !== 'ms-network') { return [custom]; }
      const list = P.suggestions(key, 3).map(x => ({ day: x.day, label: x.label, table: x.table, space: NETSP }));
      if (custom && !list.some(x => keyOf(x) === keyOf(custom))) { list.unshift(custom); }
      return list;
    }
    const list = [];
    DAYS.forEach(day => g2Cells('ms-booth', key, day).forEach(c => {
      if (c.state === 'free' && list.length < 3) { list.push({ day: day, label: c.label, table: null, space: 'Стенд экспонента' }); }
    }));
    if (custom && !list.some(x => keyOf(x) === keyOf(custom))) { list.unshift(custom); }
    return list;
  }
  function g3Cur(key) {
    const st = D.st('G3');
    st.by = st.by || {};
    return st.by[key] || (st.by[key] = { pick: 0 });
  }
  function g3Blockers(key, text) {
    if (isExh(key) && !exAccepts(key)) { return 'Этот экспонент не принимает встречи через приложение. Можно зайти на стенд или написать в карточке решения.'; }
    if (isPerson(key) && meetOf(key)) { return 'У вас уже есть встреча с этим человеком.'; }
    if (P.pendingOut() >= P.LIMITS.outPending) { return 'Лимит ожидающих заявок исчерпан: ' + P.LIMITS.outPending + ' из ' + P.LIMITS.outPending + '. Дождитесь ответа или отзовите одну.'; }
    if (!text || text.trim().length < P.LIMITS.reasonMin) { return 'Напишите сообщение, не короче ' + P.LIMITS.reasonMin + ' знаков.'; }
    return '';
  }
  function g3Selected(key) {
    const opts = g3Options(key), cur = g3Cur(key);
    const sel = Math.min(cur.pick || 0, Math.max(0, opts.length - 1));
    return { opts: opts, sel: sel, pr: opts[sel] || null };
  }
  const hasTable = m => !!m.table;

  function g3Status(m) {
    const w = meetWho(m);
    const pend = m.status === 'pending', conf = m.status === 'confirmed', canc = m.status === 'cancelled';
    return '<div class="scr">' +
      D.head({ back: 'G1', eyebrow: pend ? 'Заявка отправлена' : 'Заявка на встречу', title: pend ? 'Ждём подтверждения' : conf ? 'Встреча подтверждена' : canc ? 'Заявка отозвана' : 'Встреча состоялась',
        sub: esc(w.name) + ' · ' + esc(m.space), paren: paren(pend ? (hasTable(m) ? 'окно и стол удержаны за вами до ответа' : 'окно удержано за вами до ответа') : srcPhrase(m)) }) +
      '<div class="ppl-body">' +
      whoCard(m) +
      '<div class="ppl-box pad"><div class="ppl-dl">' + sumRow('Когда', when(m.day, range(m.start, m.dur))) + sumRow('Где', m.place) + sumRow('Откуда заявка', m.source || '') +
      sumRow('Состояние', mstOf(m)) + '</div>' +
      (m.greeting ? '<div class="ppl-quote">«' + esc(m.greeting) + '»</div>' : '') + '</div>' +
      (pend ? '<div class="banner">' + icon('clock') + '<div class="cap">Заявка живёт ' + P.REQ_TTL_H + ' часов, обычно отвечают в течение часа. Если окно не подойдёт, придёт встречное время (экран «Другое время»).</div></div>' : '') +
      (canc ? '<div class="banner">' + icon('info') + '<div class="cap">' + (hasTable(m) ? 'Окно и стол освобождены.' : 'Окно освобождено.') + ' Можно отправить новую заявку.</div></div>' : '') +
      (conf ? '<button class="btn btn-primary btn-block" data-go="G4/' + m.id + '">Открыть встречу</button>' : '') +
      (pend ? '<button class="btn btn-secondary btn-block" data-go="G4/' + m.id + '">Карточка встречи</button>' : '') +
      '<button class="btn ' + (conf ? 'btn-secondary' : 'btn-primary') + ' btn-block" data-go="G1">К встречам</button>' +
      (pend ? '<button class="btn btn-ghost btn-block" data-act="g4-cancel-ask" data-arg="' + m.id + '">Отозвать заявку</button>' : '') +
      '</div></div>';
  }
  /* откуда появилась встреча: человеческая фраза вместо технической метки */
  function srcPhrase(m) {
    const s = m.source || 'по заявке';
    const map = { 'карточка человека': 'создана из карточки человека', 'интро или лента': 'создана из ленты', 'подборка по запросу': 'создана из подборки по запросу',
      'Предметный кофе': 'создана из «Предметного кофе»', 'альтернатива Секретаря': 'создана по варианту Секретаря', 'ИИ-подбор': 'создана по ИИ-подбору',
      'скан на стенде': 'создана после скана на стенде', 'Hosted Buyer': 'создана через Hosted Buyer', 'по заявке': 'создана по заявке', 'менторская': 'запись в Менторскую' };
    return map[s] || ('источник: ' + s);
  }

  D.register('G3', {
    tab: 'F1',
    meta: {
      title: 'G3 · Заявка на встречу',
      role: 'Гость, участник',
      fr: ['FR-MEET-03', 'FR-MEET-04', 'FR-MEET-09', 'FR-MEET-16'],
      ac: ['AC-MEET-03', 'AC-MEET-12', 'AC-PPL-06'],
      what: [
        'Форма заявки: с кем и где, до трёх предложенных окон (день, время, стол в нетворкинг-зоне), сообщение до 280 знаков с живым счётчиком. Окна не пересекаются с вашими встречами и принятыми или записанными пунктами «Мой путь»; если сегодня все заняты, предлагаются завтрашние.',
        'Отправка через лист подтверждения; после отправки тот же экран показывает отправленную заявку (параметр mtNN) со сроком и ссылкой на карточку встречи.',
        'Адресат: человек (pNN), экспонент (exNN) либо заявка уже создана (mtNN); без параметра — демонстрационный экспонент «ТехноСклад».',
        'Состояния: встреча уже есть, лимит ожидающих заявок, отозванная заявка.'
      ],
      rules: [
        'Сообщение обязательно (от 10 знаков), не длиннее 280; адресат видит его вместе с теми вашими полями, которые настройки видимости открывают всем (цель при уровне «Только вы» не показывается и не обещается).',
        'Окно удерживается 120 секунд при выборе, занимается при отправке; заявка живёт 12 часов.',
        'Ожидающих исходящих заявок не более 5 (FR-MEET-09); у заявки записан источник (FR-MEET-16): карточка человека, интро и лента, подборка по запросу, Предметный кофе, скан на стенде, Hosted Buyer.',
        'Заявка создаётся только после нажатия подтверждения в листе.'
      ],
      depends: ['FR-MEET-03', 'параметры MEET', 'O-24']
    },
    html(ctx) {
      const prm = ctx.param || 'ex01';
      if (/^mt\d+$/.test(prm)) {
        const m = meetById(prm);
        if (m) { return g3Status(m); }
      }
      const key = (isPerson(prm) || isExh(prm)) ? prm : 'ex01';
      const wi = whoInfo(key);
      const o = g3Selected(key);
      S.greeting[key] = S.greeting[key] || '';
      const text = S.greeting[key], len = text.length, block = g3Blockers(key, text);
      const ee = wi.kind === 'exhibitor' && F.EXH_EXT && F.EXH_EXT[key];
      const net = wi.kind === 'person';
      const sv = sees();
      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: 'Новая встреча', title: 'Заявка на встречу', sub: esc(P.dayLong(o.pr ? o.pr.day : DAYS[0])) + ' · 30\u00A0минут', paren: paren(sv.paren) }, backOf(net ? 'F2/' + key : 'G1'))) +
        '<div class="ppl-body">' +
        '<button class="ppl-who" data-go="' + wi.go + '">' + avatar(wi.name, 'sm') + '<span class="grow"><span class="r-title">' + esc(wi.name) + (wi.rep ? ' · ' + esc(wi.rep) : '') + '</span><span class="r-sub">' + esc(wi.sub) + '</span></span>' + (wi.tariff ? tariffTag(wi.tariff) : '') + icon('chevR') + '</button>' +
        (o.pr ? '<div class="ppl-prop"><div class="lbl">Окно и место</div><div class="big">' + esc(o.pr.label) + (o.pr.table ? ', стол ' + o.pr.table : '') + '</div>' +
          '<div class="sub">' + esc(o.pr.space) + ' · ' + esc(dayWord(o.pr.day)) + ', ' + esc(o.pr.day) + ', ' + esc(range(o.pr.label)) + ' · 30\u00A0минут</div>' +
          (o.opts.length > 1 ? '<div class="ppl-chips">' + o.opts.map((x, i) => '<button class="chip' + (i === o.sel ? ' on' : '') + '" data-act="g3-win" data-arg="' + key + '|' + i + '">' + esc(chipText(x)) + '</button>').join('') + '</div>' : '') +
          '<div class="acts"><button class="btn ppl-quiet btn-sm" data-go="G2/' + key + '">Другое окно' + (net ? ' или стол' : '') + '</button></div></div>'
          : '<div class="card ppl-empty"><div class="e-title">Подходящих окон нет</div><div class="e-text">Свободных окон у вас и у адресата в ближайшие дни не нашлось.</div><button class="btn btn-secondary btn-sm" data-go="G11/' + (net ? key : 'p04') + '">Что можно сделать</button></div>') +
        (ee && ee.windows ? '<div class="ppl-note">Окна на стенде сегодня: свободно ' + ee.windows.free + ' из ' + ee.windows.total + '.</div>' : '') +
        '<div class="banner warn" id="g3-block" style="' + (block && (len || !/^Напишите/.test(block)) ? '' : 'display:none') + '">' + icon('alert') + '<div class="cap" id="g3-block-t">' + esc(block) + '</div></div>' +
        '<div class="field ppl-textarea-wrap"><label for="g3-reason">Сообщение <span class="cap">· обязательно, до 280 знаков</span></label>' +
        '<textarea class="textarea" id="g3-reason" maxlength="280" placeholder="Что хотите обсудить: адресат увидит это вместе с теми вашими полями, что открыты настройками видимости">' + esc(text) + '</textarea>' +
        '<div class="counter"><span id="g3-cnt">' + len + ' / 280</span></div></div>' +
        '<div class="ppl-note">Адресат увидит ' + esc(sv.text) + '.' + (sv.note ? ' ' + esc(sv.note) + ' <button class="ppl-inline" data-go="L6">Изменить в «Приватности»</button>' : '') + '</div>' +
        '<button class="btn btn-primary btn-block" id="g3-send" data-act="g3-ask" data-arg="' + key + '"' + (block || !o.pr ? ' disabled' : '') + '>Отправить заявку на встречу</button>' +
        '<div class="cap" style="text-align:center" id="g3-hint">' + (block && !len ? 'заполните сообщение, чтобы отправить' : '') + '</div>' +
        '</div></div>';
    },
    mount(host) {
      const ta = host.querySelector('#g3-reason');
      if (!ta) { return; }
      const m = routeParam() || 'ex01';
      const key = (isPerson(m) || isExh(m)) ? m : 'ex01';
      autosize(ta, 220);
      ta.addEventListener('input', () => {
        const t = ta.value.slice(0, 280);
        S.greeting[key] = t;
        autosize(ta, 220);
        const b = g3Blockers(key, t), o = g3Selected(key), g = id => host.querySelector(id);
        if (g('#g3-cnt')) { g('#g3-cnt').textContent = t.length + ' / 280'; }
        if (g('#g3-send')) { g('#g3-send').disabled = !!b || !o.pr; }
        if (g('#g3-block')) { g('#g3-block').style.display = b && (t.length || !/^Напишите/.test(b)) ? '' : 'none'; }
        if (g('#g3-block-t')) { g('#g3-block-t').textContent = b; }
        if (g('#g3-hint')) { g('#g3-hint').textContent = b && !t.length ? 'заполните сообщение, чтобы отправить' : ''; }
      });
    }
  });
  D.action('g3-win', el => { const a = el.dataset.arg.split('|'); g3Cur(a[0]).pick = parseInt(a[1], 10); D.rerender(); });
  D.action('g3-ask', el => {
    const key = el.dataset.arg, wi = whoInfo(key), text = S.greeting[key] || '', o = g3Selected(key);
    const b = g3Blockers(key, text);
    if (b || !o.pr) { D.toast(b || 'Нет подходящего окна'); return; }
    const sc = (S.srcMap || {})[key];
    confirmSheet({
      title: 'Отправить заявку на встречу?',
      body: '<div class="ppl-sheet-sum"><div class="ppl-dl">' + sumRow('С кем', wi.name + (wi.rep ? ' · ' + wi.rep : '')) + sumRow('Когда', dayWord(o.pr.day) + ', ' + o.pr.day + ', ' + range(o.pr.label)) +
        sumRow('Где', o.pr.space + (o.pr.table ? ', стол ' + o.pr.table : '')) + (wi.kind === 'person' && sc ? sumRow('Откуда заявка', SRC[sc] || SRC.card) : '') + '</div></div>' +
        '<div class="ppl-note">«' + esc(text.length > 120 ? text.slice(0, 120) + '…' : text) + '»</div>' +
        '<div class="ppl-note" style="margin-top:8px">' + (o.pr.table ? 'Окно и стол будут удержаны' : 'Окно будет удержано') + ' за вами до ответа. Заявка живёт ' + P.REQ_TTL_H + ' часов.</div>',
      ok: 'Отправить заявку', act: 'g3-confirm', arg: key
    });
  });
  D.action('g3-confirm', el => {
    const key = el.dataset.arg, wi = whoInfo(key), text = S.greeting[key] || '', o = g3Selected(key);
    if (g3Blockers(key, text) || !o.pr) { D.closeSheet(); return; }
    const m = { id: newMeetId(), kind: wi.kind === 'exhibitor' ? 'stand' : 'meet', day: o.pr.day, start: o.pr.label, dur: 30, space: o.pr.space,
      table: o.pr.table, status: 'pending', source: wi.kind === 'exhibitor' ? 'по заявке' : (SRC[(S.srcMap || {})[key]] || SRC.card), greeting: text,
      who: wi.kind === 'exhibitor' ? { type: 'exhibitor', id: key, rep: wi.rep || '' } : { type: 'person', id: key },
      place: wi.kind === 'exhibitor' ? 'Экспо · ' + F.exhibitor(key).stand : o.pr.space + (o.pr.table ? ' · стол ' + o.pr.table : '') };
    S.meets.push(m);
    if (S.draft) { delete S.draft[key]; }
    D.closeSheet();
    location.hash = '#/G3/' + m.id;
    D.toast('Заявка на встречу отправлена');
  });

  /* ================= G4 «Встреча подтверждена» ================= */

  const cap1 = s => s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
  function reminderNote() { return 'Напомним за 60, 15 и 5 минут. Запас на переход до места посчитан по матрице переездов.'; }

  D.register('G4', {
    tab: 'F1',
    meta: {
      title: 'G4 · Встреча',
      role: 'Участник встречи',
      fr: ['FR-MEET-04', 'FR-MEET-05', 'FR-MEET-06', 'FR-MEET-16'],
      ac: ['AC-MEET-03', 'AC-MEET-06', 'AC-MEET-12'],
      what: [
        'Карточка встречи по параметру mtNN: подтверждённая, ждущая ответа, состоявшаяся или отменённая; с кем, место и стол, время, источник заявки.',
        'Для подтверждённой: «+ Путь» (общий контракт), маршрут (E4), «Я на месте» (G7), напоминания (G6), отмена через лист подтверждения. После сохранённого итога встреча получает статус «Состоялась»: кнопки «Я на месте» и «Отменить» уходят, появляются «Итог встречи» и «Договорённости».',
        'Для ожидающей: отзыв заявки через лист и, если пришло встречное время, переход в «Другое время» (G5). Для состоявшейся: итог встречи (G8) и договорённости (G9).'
      ],
      rules: [
        'Время и место фиксируются при подтверждении; перенос и отмена любой стороной до срока (по умолчанию за 2 часа, FR-MEET-05).',
        'Напоминания за 60, 15 и 5 минут (FR-MEET-06).',
        'Отмена подтверждённой встречи освобождает окно и стол и уведомляет вторую сторону; отменить можно только через лист подтверждения.',
        'Источник заявки виден аналитике (FR-MEET-16).'
      ],
      depends: ['матрица переездов', 'D-55', 'FR-MEET-04']
    },
    html(ctx) {
      const id = (ctx.param && meetById(ctx.param)) ? ctx.param : 'mt2';
      const m = meetById(id), w = meetWho(m);
      const conf = m.status === 'confirmed', pend = m.status === 'pending', held = m.status === 'held', canc = m.status === 'cancelled';
      const counter = pend && P.COUNTER.meetId === id;
      const wp = m.who && m.who.type === 'person' ? person(m.who.id) : null;
      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: cap1(mstOf(m)) + ' · ' + esc(range(m.start, m.dur)), title: 'Встреча', sub: esc(P.dayLong(m.day)), paren: paren(srcPhrase(m)) }, backOf('G1'))) +
        '<div class="ppl-body">' +
        '<div class="meet-card card"><div class="mc-status ' + MST_CLS[m.status] + '">' + esc(mstOf(m)) + '</div>' +
        '<button class="ppl-who" data-go="' + w.go + '" style="border:0;padding:0;background:transparent">' + avatar(w.av || w.name, 'sm') + '<span class="grow"><span class="r-title" style="font-size:17px">' + esc(w.name) + '</span><span class="r-sub">' + esc(w.sub) + '</span></span>' + (wp ? tariffTag(wp.tariff) : '') + icon('chevR') + '</button>' +
        '<div class="sess-meta" style="margin-top:4px">' + tag(m.space) + tag('30 минут', 'accent') + (m.source && m.source !== m.space && m.source !== 'по заявке' ? tag(m.source) : '') + '</div>' +
        '<div class="ppl-dl" style="margin-top:6px">' + sumRow('Когда', when(m.day, range(m.start, m.dur))) + sumRow('Где', m.place) + (m.table ? sumRow('Стол', String(m.table)) : '') + '</div></div>' +
        (m.greeting ? '<div class="ppl-box pad"><div class="ppl-note">Приветствие</div><div class="ppl-quote">«' + esc(m.greeting) + '»</div></div>' : '') +
        (counter ? '<div class="banner info">' + icon('clock') + '<div class="grow"><div class="b-title">Предложено другое время</div><div class="cap">Выберите удобный вариант из предложенных.</div></div><button class="btn btn-primary btn-sm" data-go="G5/' + id + '">Варианты</button></div>' : '')+
        (pend && !counter ? '<div class="banner">' + icon('clock') + '<div class="cap">Ждём ответа. Заявка живёт ' + P.REQ_TTL_H + ' часов, ' + (m.table ? 'окно и стол удержаны' : 'окно удержано') + ' за вами.</div></div>' : '') +
        (conf || pend ? '<div class="banner">' + icon('bell') + '<div class="cap">' + esc(reminderNote()) + '</div></div>' : '') +
        (canc ? '<div class="banner">' + icon('info') + '<div class="cap">' + (m.table ? 'Окно и стол освобождены' : 'Окно освобождено') + ', вторая сторона уведомлена. Можно отправить новую заявку.</div></div>' : '') +
        '<div class="ppl-actions">' +
        (conf || pend ? '<div class="grid-2">' + meetPathBtn(m, 'btn-secondary') + '<button class="btn btn-secondary" data-go="E4">' + icon('route') + 'Маршрут</button></div>' : '') +
        (conf ? '<button class="btn btn-primary btn-block" data-go="G7/' + id + '">Я на месте</button><button class="btn btn-ghost btn-block" data-go="G6/' + id + '">Как придёт напоминание</button>' : '') +
        (held ? '<button class="btn btn-primary btn-block" data-go="G8/' + id + '">Итог встречи</button><button class="btn btn-ghost btn-block" data-go="G9">Договорённости</button>' : '') +
        (canc && wp ? '<button class="btn btn-primary btn-block" data-go="F11/' + wp.id + '">Предложить новое время</button>' : '') +
        (conf || pend ? '<button class="btn btn-ghost btn-block" data-act="g4-cancel-ask" data-arg="' + id + '">' + (pend ? 'Отозвать заявку' : 'Отменить встречу') + '</button>' : '') +
        '</div>' +
        (conf ? '<div class="ppl-box pad"><div class="ppl-note"><b>Перед встречей</b></div><div class="ppl-note">Придите к ' + esc(m.start) + ': ' + (m.table ? 'номер стола ' + m.table + ' подскажут на стойке зоны' : 'место ' + esc(m.place)) + '. QR на билете действует как пропуск. После встречи отметьте итог, это займёт минуту.</div></div>' : '') +
        '</div></div>';
    }
  });
  D.action('g4-cancel-ask', el => {
    const m = meetById(el.dataset.arg), w = meetWho(m), pend = m.status === 'pending';
    confirmSheet({
      title: pend ? 'Отозвать заявку?' : 'Отменить встречу?',
      body: '<div class="ppl-sheet-sum"><div class="ppl-dl">' + sumRow('С кем', w.name) + sumRow('Когда', dayWord(m.day) + ', ' + range(m.start, m.dur)) + sumRow('Где', m.place) + '</div></div>' +
        '<div class="ppl-note">Окно и стол освободятся, ' + esc(w.name.split(' ')[0]) + ' получит уведомление.</div>',
      ok: pend ? 'Отозвать заявку' : 'Отменить встречу', act: 'g4-cancel-do', arg: m.id, danger: true, cancel: 'Оставить'
    });
  });
  D.action('g4-cancel-do', el => {
    const m = meetById(el.dataset.arg), wasPending = m.status === 'pending';
    m.status = 'cancelled';
    m.withdrawn = wasPending;
    if (m.kind === 'coffee' && m.who && m.who.type === 'person') { delete S.invited[m.who.id]; }
    syncPath(m, m.start, null);
    D.closeSheet();
    D.rerender();
    D.toast(wasPending ? (m.kind === 'coffee' ? 'Приглашение отозвано' : 'Заявка отозвана, вторая сторона уведомлена') : 'Встреча отменена, вторая сторона уведомлена');
  });

  /* ================= G5 «Другое время» ================= */

  D.register('G5', {
    tab: 'F1',
    meta: {
      title: 'G5 · Другое время',
      role: 'Участник встречи',
      fr: ['FR-MEET-03', 'FR-MEET-05', 'FR-MEET-12'],
      ac: ['AC-MEET-02', 'AC-MEET-03'],
      what: [
        'Встречное предложение времени от второй стороны: три варианта с местом, столом и пояснением, почему предложены.',
        'Исходное окно; принять вариант (лист подтверждения) или предложить своё время (выбор окна G2).',
        'Пустое состояние: у выбранной встречи встречных предложений нет.'
      ],
      rules: [
        'Встречное предложение живёт 12 часов, как и заявка.',
        'Каждый вариант проверен на свободное окно у вас и на запас времени на переход; вариант, пересекающийся с другой вашей встречей, недоступен.',
        'Принятие варианта сразу подтверждает встречу и освобождает прежнее окно; принять можно только через лист подтверждения.'
      ],
      depends: ['окна встреч', 'матрица переездов', 'D-55']
    },
    html(ctx) {
      const id = (ctx.param && meetById(ctx.param)) ? ctx.param : P.COUNTER.meetId;
      const m = meetById(id), w = meetWho(m), c = P.COUNTER;
      if (id !== c.meetId || m.status === 'cancelled') {
        return '<div class="scr">' + D.head({ back: 'G4/' + id, eyebrow: 'Встреча', title: 'Другое время', sub: esc(w.name), paren: paren('встречных предложений нет') }) +
          '<div class="ppl-body"><div class="card ppl-empty"><div class="e-title">Предложений нет</div><div class="e-text">По этой встрече другое время никто не предлагал. Можно выбрать своё окно.</div>' +
          '<button class="btn btn-secondary btn-sm" data-go="G2/' + whoParam(m) + '">Выбрать окно</button></div></div></div>';
      }
      const opts = c.proposals.map((pr, i) => {
        const b = P.busyAt(m.day, pr.start), conflict = b && b.kind === 'meet' && b.m.id !== m.id;
        const soft = b && b.kind === 'path' ? b.it : null;
        const accepted = m.status === 'confirmed' && m.start === pr.start;
        return '<button class="card interactive" data-act="g5-pick" data-arg="' + id + '|' + i + '"' + (conflict || m.status === 'confirmed' ? ' disabled' : '') + ' style="text-align:left;width:100%' + (conflict ? ';opacity:.5' : '') + '">' +
          '<div class="card-row"><div><div class="card-title" style="font-size:18px">' + esc(range(pr.start)) + '</div>' +
          '<div class="r-sub" style="margin-top:2px">' + esc(pr.place) + (pr.table ? ', стол ' + pr.table : '') + '</div></div>' + (accepted ? '<span class="ppl-st ok">принято</span>' : icon('chevR')) + '</div>' +
          '<div class="cap" style="margin-top:6px">' + esc(conflict ? 'пересекается с вашей встречей в ' + pr.start : pr.note) + '</div>' +
          (soft ? '<div class="cap" style="margin-top:4px;color:var(--warn)">В это время у вас в «Мой путь»: ' + esc(soft.title) + '</div>' : '') + '</button>';
      }).join('');
      return '<div class="scr">' +
        D.head({ back: 'G4/' + id, eyebrow: 'Встреча', title: 'Другое время', sub: esc(w.name) + ' предлагает варианты', paren: paren('выберите удобный вариант') }) +
        '<div class="ppl-body">' +
        (m.status === 'confirmed' ? '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Время согласовано</div><div class="cap">Встреча подтверждена на ' + esc(range(m.start, m.dur)) + ', ' + esc(m.place) + '.</div></div></div>' : '') +
        '<div class="ppl-box pad"><div class="ppl-note">Вы просили</div><div class="r-title">' + esc(range(c.orig.start)) + '</div><div class="r-sub">' + esc(c.orig.place) + ' · ' + esc(w.name) + '</div></div>' +
        '<div class="ppl-sec">Варианты</div>' + opts +
        '<button class="btn btn-ghost btn-block" data-go="G2/' + whoParam(m) + '">' + icon('clock') + 'Предложить своё время</button>' +
        '<div class="ppl-note">Встречное предложение живёт ' + P.REQ_TTL_H + ' часов. Вариант, пересекающийся с другой вашей встречей, недоступен.</div>' +
        '</div></div>';
    }
  });
  D.action('g5-pick', el => {
    const a = el.dataset.arg.split('|'), m = meetById(a[0]), pr = P.COUNTER.proposals[parseInt(a[1], 10)], w = meetWho(m);
    const b = P.busyAt(m.day, pr.start), soft = b && b.kind === 'path' ? b.it : null;
    confirmSheet({
      title: 'Принять это время?',
      body: '<div class="ppl-sheet-sum"><div class="ppl-dl">' + sumRow('С кем', w.name) + sumRow('Когда', when(m.day, range(pr.start))) + sumRow('Где', pr.place + (pr.table ? ', стол ' + pr.table : '')) + '</div></div>' +
        (soft ? '<div class="banner warn">' + icon('alert') + '<div class="cap">В это время в «Мой путь»: ' + esc(soft.title) + '. Встреча подтвердится, а пункт пути останется: проверьте его в конфликтах «Мой путь».</div></div>' : '') +
        '<div class="ppl-note">Встреча будет подтверждена сразу, прежнее окно ' + esc(m.start) + ' освободится, ' + esc(w.name.split(' ')[0]) + ' получит уведомление.</div>',
      ok: 'Принять и подтвердить', act: 'g5-do', arg: el.dataset.arg
    });
  });
  D.action('g5-do', el => {
    const a = el.dataset.arg.split('|'), m = meetById(a[0]), pr = P.COUNTER.proposals[parseInt(a[1], 10)], was = m.start;
    syncPath(m, was, pr.start);
    m.start = pr.start; m.table = pr.table; m.place = pr.place + (pr.table ? ' · стол ' + pr.table : ''); m.space = pr.table ? 'Нетворкинг-зона B2B' : m.space; m.status = 'confirmed';
    D.closeSheet();
    location.hash = '#/G4/' + m.id;
    D.toast('Встреча подтверждена на ' + pr.start);
  });

  /* ================= G6 «Напоминание» ================= */

  D.register('G6', {
    tab: 'F1',
    meta: {
      title: 'G6 · Напоминание о встрече',
      role: 'Участник встречи',
      fr: ['FR-MEET-06', 'FR-MEET-05'],
      ac: ['AC-MEET-06'],
      what: [
        'Напоминание «через 15 минут» (из серии 60, 15 и 5 минут) с кем, где и запасом на переход.',
        'Действия: «Я опаздываю» (лист подтверждения: вторая сторона получает уведомление), «Маршрут» (E4), «Отметить приход» (G7), «Перенести» (G5 или выбор окна).'
      ],
      rules: [
        'Напоминания приходят за 60, 15 и 5 минут по каналам из настроек уведомлений (B3), резервный канал срабатывает при недоставке.',
        '«Я опаздываю» оставляет окно за вами ещё на 10 минут и уведомляет вторую сторону.',
        'Маршрут строится от текущей точки по матрице переездов.'
      ],
      depends: ['каналы уведомлений', 'матрица переездов']
    },
    html(ctx) {
      const id = (ctx.param && meetById(ctx.param)) ? ctx.param : 'mt2';
      const m = meetById(id), w = meetWho(m);
      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: 'Напоминание', title: 'Через 15 минут', sub: 'Встреча ждёт вас', paren: paren('окно удерживается за вами') }, backOf('G4/' + id))) +
        '<div class="ppl-body">' +
        '<div class="banner warn">' + icon('clock') + '<div class="grow"><div class="b-title">' + esc(w.name) + '</div><div class="cap">' + esc(range(m.start, m.dur)) + ' · ' + esc(m.place) + '</div></div></div>' +
        '<div class="ppl-box pad"><div class="ppl-note"><b>Маршрут</b></div><div class="ppl-note">От вашего следующего события: запас ' + (F.travelMin('magnolia', 'congress') || 9) + ' минут по матрице переездов.</div>' +
        '<button class="btn btn-secondary btn-block" data-go="E4">' + icon('route') + 'Построить маршрут</button></div>' +
        '<button class="btn btn-primary btn-block" data-go="G7/' + id + '">Отметить приход</button>' +
        '<div class="grid-2"><button class="btn btn-secondary" data-act="g6-late-ask" data-arg="' + id + '">Я опаздываю</button><button class="btn btn-ghost" data-go="G5/' + id + '">Перенести</button></div>' +
        '<div class="ppl-note">Напоминания приходят за 60, 15 и 5 минут. Каналы настраиваются в разделе «Уведомления».</div>' +
        '</div></div>';
    }
  });
  D.action('g6-late-ask', el => {
    const m = meetById(el.dataset.arg), w = meetWho(m);
    confirmSheet({
      title: 'Сообщить, что опаздываете?',
      body: '<div class="ppl-note">' + esc(w.name.split(' ')[0]) + ' получит уведомление. Окно ' + esc(range(m.start, m.dur)) + ' останется за вами ещё на 10 минут.</div>',
      ok: 'Сообщить', act: 'g6-late-do', arg: m.id
    });
  });
  D.action('g6-late-do', () => { D.closeSheet(); D.toast('Вторая сторона уведомлена, окно за вами ещё 10 минут'); });

  /* ================= G7 «Отметка прихода» ================= */

  D.register('G7', {
    tab: 'F1',
    meta: {
      title: 'G7 · Отметка прихода',
      role: 'Участник встречи',
      fr: ['FR-MEET-06', 'FR-MEET-15'],
      ac: ['AC-MEET-06'],
      what: [
        'Сканирование QR пространства встречи (макет камеры) и карточка точки: стол, зона или стенд.',
        '«Я на месте» фиксирует приход вручную (резерв) и ведёт к итогу встречи (G8).'
      ],
      rules: [
        'Отметка фиксируется по QR пространства или геозоне стенда, не по скриншоту; повторный скан обновляет время.',
        'Без отметки через 15 минут после начала окна встреча попадает на табло организатора как неявка.',
        'У стола в нетворкинг-зоне QR с номером стола.'
      ],
      depends: ['QR-токены', 'геозоны стендов', 'D-55']
    },
    html(ctx) {
      const id = (ctx.param && meetById(ctx.param)) ? ctx.param : 'mt2';
      const m = meetById(id), w = meetWho(m);
      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: 'Отметка прихода', title: 'Я на месте', sub: esc(m.space), paren: paren('покажите QR пространства или подтвердите вручную') }, backOf('G4/' + id))) +
        '<div class="ppl-body">' +
        '<div class="scan-stage ppl-scan"><div class="scan-frame"><i class="c"></i></div><div class="scan-line"></div>' +
        '<div class="scan-hint">Наведите камеру на QR ' + (m.table ? 'у стола ' + m.table : 'в точке встречи') + '</div></div>' +
        '<div class="ppl-box pad"><div class="r-title" style="font-size:15px">' + esc(m.place) + '</div><div class="r-sub">' + esc(w.name) + ' · ' + esc(range(m.start, m.dur)) + '</div>' +
        '<div class="ppl-note">Если камера не работает, подтвердите приход кнопкой ниже.</div></div>' +
        (m.arrived ? '<div class="banner ok">' + icon('check') + '<div class="cap">Приход отмечен. Можно перейти к итогу встречи.</div></div>' : '') +
        '<button class="btn btn-primary btn-block" data-act="g7-here" data-arg="' + id + '">' + (m.arrived ? 'Перейти к итогу' : 'Я на месте') + '</button>' +
        '</div></div>';
    }
  });
  D.action('g7-here', el => {
    const m = meetById(el.dataset.arg);
    const first = !m.arrived;
    m.arrived = true;
    location.hash = '#/G8/' + m.id;
    if (first) { D.toast('Приход отмечен: ' + m.place); }
  });

  /* ================= G8 «Итог встречи» ================= */

  function g8Cur(id) {
    const st = D.st('G8'); st.by = st.by || {};
    if (!st.by[id]) {
      const m = meetById(id);
      st.by[id] = { arrived: !!(m && (m.arrived || m.status === 'held')), outcome: null, step: null, note: '', saved: false };
    }
    return st.by[id];
  }
  D.register('G8', {
    tab: 'F1',
    meta: {
      title: 'G8 · Исход встречи',
      role: 'Участник встречи',
      fr: ['FR-MEET-06', 'FR-MEET-10', 'FR-MEET-11'],
      ac: ['AC-MEET-07', 'AC-MEET-08'],
      what: [
        'Отметка «я пришёл» (или «не смогу прийти» через лист подтверждения), вопрос «Как прошла встреча?»: «Было полезно» или «Не в этот раз».',
        'Следующий шаг: повторная встреча, отправить материалы, познакомить, созвон или ничего; срок 3 дня; заметка до 280 знаков.',
        'Сохранение: исход остаётся у вас; договорённость уходит второй стороне на подтверждение через лист (G9).'
      ],
      rules: [
        'Экран исхода предлагается через 10 минут после окончания встречи (допуск 1 минута); исход приватен по умолчанию (FR-MEET-10).',
        'Договорённость фиксирует инициатор, вторая сторона подтверждает или правит; статус «согласовано обеими сторонами» ставится только после подтверждения.',
        'Напоминания о следующих шагах: через 3, 7, 30 дней по настройке (FR-MEET-11).'
      ],
      depends: ['FR-MEET-10', 'FR-MEET-11']
    },
    html(ctx) {
      const id = (ctx.param && meetById(ctx.param)) ? ctx.param : 'mt5';
      const m = meetById(id), w = meetWho(m), c = g8Cur(id), O = F.MEET_OUTCOME;
      const due = O.dueInDays + ' ' + plural(O.dueInDays, ['день', 'дня', 'дней']);
      const sub = esc(w.name) + ' · ' + esc(m.space);
      if (!c.arrived && !c.saved) {
        return '<div class="scr">' +
          D.head(Object.assign({ eyebrow: 'Встреча · ' + esc(range(m.start, m.dur)), title: 'Отметьте приход', sub: sub, paren: paren('отметка фиксирует ваше участие') }, backOf('G4/' + id))) +
          '<div class="ppl-body"><div class="ppl-box pad" style="text-align:center"><div class="ppl-big">' + esc(range(m.start, m.dur)) + '</div><div class="r-sub">' + esc(w.name) + '</div></div>' +
          '<button class="btn btn-primary btn-block" data-act="g8-arrive" data-arg="' + id + '">' + icon('check') + 'Я пришёл на встречу</button>' +
          '<button class="btn btn-ghost btn-block" data-act="g8-noshow-ask" data-arg="' + id + '">Не смогу прийти</button></div></div>';
      }
      if (c.saved) {
        return '<div class="scr">' +
          D.head({ back: 'G1', eyebrow: 'Итог встречи', title: 'Итог сохранён', sub: sub, paren: paren('исход виден только вам') }) +
          '<div class="ppl-body"><div class="banner ok">' + icon('check') + '<div><div class="b-title">' + esc(c.outcome == null ? 'Встреча отменена' : O.options[c.outcome]) + '</div><div class="cap">' +
          (c.step != null && c.step !== 4 ? 'Договорённость «' + esc(O.nextSteps[c.step]) + '» отправлена на подтверждение, срок ' + due + '.' : 'Следующих шагов нет.') + '</div></div></div>' +
          (c.step != null && c.step !== 4 ? '<button class="btn btn-primary btn-block" data-go="G9">Договорённости</button>' : '') +
          '<button class="btn btn-secondary btn-block" data-go="G1">К встречам</button></div></div>';
      }
      if (c.outcome == null) {
        return '<div class="scr">' +
          D.head(Object.assign({ eyebrow: esc(w.name), title: esc(O.q), sub: esc(range(m.start, m.dur)) + ' · ' + esc(m.space), paren: paren('исход остаётся у вас') }, backOf('G4/' + id))) +
          '<div class="ppl-body"><div class="ppl-steps">' + O.options.map((o, i) => '<button class="ppl-step" data-act="g8-outcome" data-arg="' + id + '|' + i + '"><span>' + esc(o) + '</span>' + icon('chevR') + '</button>').join('') + '</div></div></div>';
      }
      if (c.step == null) {
        return '<div class="scr">' +
          D.head({ backAct: 'g8-back', eyebrow: 'Следующий шаг', title: 'Что дальше?', sub: 'Срок: ' + due + ' на выполнение', paren: paren(O.options[c.outcome]) }) +
          '<div class="ppl-body"><div class="ppl-steps">' + O.nextSteps.map((s, i) => '<button class="ppl-step" data-act="g8-step" data-arg="' + id + '|' + i + '"><span>' + esc(cap1(s)) + '</span>' + icon('chevR') + '</button>').join('') + '</div></div></div>';
      }
      return '<div class="scr">' +
        D.head({ backAct: 'g8-reset', eyebrow: 'Итог встречи', title: 'Сохранить?', sub: esc(w.name) + ' · ' + esc(range(m.start, m.dur)), paren: paren('исход виден только вам') }) +
        '<div class="ppl-body">' +
        '<div class="ppl-box pad"><div class="r-title" style="font-size:14.5px">' + esc(O.options[c.outcome]) + '</div>' +
        '<div class="ppl-note">Следующий шаг: ' + esc(O.nextSteps[c.step]) + (c.step !== 4 ? ' · срок ' + due : '') + '</div></div>' +
        '<div class="field ppl-textarea-wrap"><label for="g8-note">Заметка <span class="cap">· необязательно, до 280 знаков</span></label>' +
        '<textarea class="textarea" id="g8-note" maxlength="280" placeholder="О чём договорились, что прислать, к кому обратиться">' + esc(c.note) + '</textarea>' +
        '<div class="counter"><span id="g8-cnt">' + c.note.length + ' / 280</span></div></div>' +
        '<button class="btn btn-primary btn-block" data-act="g8-save" data-arg="' + id + '">Сохранить итог</button></div></div>';
    },
    mount(host) {
      const ta = host.querySelector('#g8-note');
      if (!ta) { return; }
      const id = g8Id();
      ta.addEventListener('input', () => {
        g8Cur(id).note = ta.value.slice(0, 280);
        const cnt = host.querySelector('#g8-cnt'); if (cnt) { cnt.textContent = g8Cur(id).note.length + ' / 280'; }
      });
    }
  });
  const g8Id = () => { const r = routeParam(); return meetById(r) ? r : 'mt5'; };
  D.action('g8-arrive', el => { const c = g8Cur(el.dataset.arg); c.arrived = true; c.outcome = null; c.step = null; D.rerender(); D.toast('Приход отмечен'); });
  D.action('g8-outcome', el => { const a = el.dataset.arg.split('|'); g8Cur(a[0]).outcome = parseInt(a[1], 10); D.rerender(); });
  D.action('g8-step', el => { const a = el.dataset.arg.split('|'); g8Cur(a[0]).step = parseInt(a[1], 10); D.rerender(); });
  D.action('g8-back', () => { g8Cur(g8Id()).outcome = null; D.rerender(); });
  D.action('g8-reset', () => { g8Cur(g8Id()).step = null; D.rerender(); });
  D.action('g8-noshow-ask', el => {
    const m = meetById(el.dataset.arg), w = meetWho(m);
    confirmSheet({
      title: 'Сообщить, что не придёте?',
      body: '<div class="ppl-note">Встреча будет отменена, ' + esc(w.name.split(' ')[0]) + ' получит уведомление, окно освободится.</div>',
      ok: 'Отменить встречу', act: 'g8-noshow-do', arg: m.id, danger: true, cancel: 'Оставить'
    });
  });
  D.action('g8-noshow-do', el => {
    const m = meetById(el.dataset.arg), c = g8Cur(m.id);
    m.status = 'cancelled'; c.saved = true; c.outcome = null; c.step = 4;
    D.closeSheet(); D.rerender(); D.toast('Встреча отменена, вторая сторона уведомлена');
  });
  D.action('g8-save', el => {
    const m = meetById(el.dataset.arg), c = g8Cur(m.id), w = meetWho(m), O = F.MEET_OUTCOME;
    if (c.step === 4) { c.saved = true; m.outcome = { result: c.outcome, step: c.step }; m.status = 'held'; D.rerender(); D.toast('Итог встречи сохранён'); return; }
    confirmSheet({
      title: 'Сохранить и предложить договорённость?',
      body: '<div class="ppl-sheet-sum"><div class="ppl-dl">' + sumRow('Исход', O.options[c.outcome]) + sumRow('Следующий шаг', O.nextSteps[c.step]) + sumRow('Срок', O.dueInDays + ' ' + plural(O.dueInDays, ['день', 'дня', 'дней'])) + '</div></div>' +
        '<div class="ppl-note">Исход остаётся у вас. Договорённость уйдёт второй стороне на подтверждение: статус «согласовано обеими сторонами» появится после его ответа.</div>',
      ok: 'Сохранить и отправить', act: 'g8-do', arg: m.id
    });
  });
  D.action('g8-do', el => {
    const m = meetById(el.dataset.arg), c = g8Cur(m.id), w = meetWho(m), O = F.MEET_OUTCOME;
    c.saved = true; m.outcome = { result: c.outcome, step: c.step };
    m.status = 'held';                                      /* после итога встреча «Состоялась»: G1 и G4 показывают это */
    S.agreements.push({ id: 'ag' + (S.seq++), who: m.who && m.who.type === 'person' ? m.who.id : null, whoLabel: w.name, meetId: m.id, initiator: 'me',
      step: O.nextSteps[c.step], text: c.note || ('Следующий шаг после встречи: ' + O.nextSteps[c.step]), due: 'через ' + O.dueInDays + ' ' + plural(O.dueInDays, ['день', 'дня', 'дней']), status: 'wait' });
    D.closeSheet(); D.rerender(); D.toast('Итог сохранён, договорённость отправлена');
  });

  /* ================= G9 «Договорённость» ================= */

  const AG_LBL = { wait: 'ждёт подтверждения', you: 'ждёт вашего ответа', done: 'согласовано обеими сторонами' };
  const AG_CLS = { wait: 'wait', you: 'wait', done: 'ok' };
  function agWho(a) {
    if (a.who && person(a.who)) { const p = person(a.who); return { name: p.name, go: 'F2/' + p.id }; }
    return { name: a.whoLabel || 'участник', go: '' };
  }
  function agCard(a) {
    const w = agWho(a), ini = a.initiator === 'me' ? 'вы' : (person(a.initiator) ? person(a.initiator).name : '');
    let acts = '';
    if (a.status === 'you') {
      acts = '<button class="btn btn-primary btn-sm" data-act="g9-ok-ask" data-arg="' + a.id + '">Согласовать</button><button class="btn btn-ghost btn-sm" data-act="g9-edit" data-arg="' + a.id + '">Предложить правку</button>';
    } else if (a.status === 'wait') {
      acts = '<button class="btn btn-ghost btn-sm" data-act="g9-edit" data-arg="' + a.id + '">Изменить</button>';
    }
    return '<div class="ppl-agr"><div class="tt">' + esc(cap1(a.step)) + '</div>' +
      '<div class="ppl-quote">«' + esc(a.text) + '»</div>' +
      '<div class="ppl-note">Инициатор: ' + esc(ini) + '</div>' +
      '<div class="ppl-tags" style="padding-left:0">' + (w.go ? '<button class="ppl-link" data-go="' + w.go + '">' + icon('user') + esc(w.name) + '</button>' : '<span class="tag">' + esc(w.name) + '</span>') +
      (a.meetId && meetById(a.meetId) ? '<button class="ppl-link" data-go="G4/' + a.meetId + '">' + icon('clock') + 'Встреча</button>' : '') + '</div>' +
      '<div class="ft"><span class="ppl-st ' + AG_CLS[a.status] + '">' + esc(AG_LBL[a.status]) + '</span>' + tag('срок: ' + a.due, 'tariff') + '</div>' +
      (acts ? '<div class="ppl-acts" style="padding-left:0">' + acts + '</div>' : '') + '</div>';
  }

  D.register('G9', {
    tab: 'F1',
    meta: {
      title: 'G9 · Договорённость',
      role: 'Участник встреч',
      fr: ['FR-MEET-10', 'FR-MEET-11'],
      ac: ['AC-MEET-07', 'AC-MEET-08'],
      what: [
        'Список договорённостей после встреч: следующий шаг, текст, срок, инициатор, ссылка на встречу.',
        'Состояния: «ждёт подтверждения» (вторая сторона), «ждёт вашего ответа», «согласовано обеими сторонами».',
        '«Согласовать» (лист подтверждения), «Предложить правку» (правка сбрасывает подтверждение и возвращает договорённость в ожидание), «Предложить договорённость» вручную.'
      ],
      rules: [
        'Договорённость фиксирует инициатор; вторая сторона подтверждает или правит (FR-MEET-10).',
        'Статус «согласовано обеими сторонами» ставится только после подтверждения второй стороны; любая правка сбрасывает подтверждение (AC-MEET-07).',
        'Срок по умолчанию — 3 дня; напоминания о следующих шагах через 3, 7 и 30 дней по настройке (FR-MEET-11).'
      ],
      depends: ['FR-MEET-10', 'D-47']
    },
    html() {
      const list = S.agreements;
      const you = list.filter(a => a.status === 'you'), wait = list.filter(a => a.status === 'wait'), done = list.filter(a => a.status === 'done');
      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: 'После встреч', title: 'Договорённости', sub: 'Следующие шаги и их согласование', paren: paren('согласовано, когда ответят обе стороны') }, backOf('G1'))) +
        '<div class="ppl-body">' +
        (you.length ? '<div class="ppl-sec">Ждут вашего ответа</div>' + you.map(agCard).join('') : '') +
        (wait.length ? '<div class="ppl-sec">Ждут подтверждения</div>' + wait.map(agCard).join('') : '') +
        (done.length ? '<div class="ppl-sec">Согласованные</div>' + done.map(agCard).join('') : '') +
        (!list.length ? '<div class="card ppl-empty"><div class="e-title">Договорённостей нет</div><div class="e-text">После встречи отметьте итог: договорённость появится здесь.</div></div>' : '') +
        '<button class="btn btn-secondary btn-block" data-act="g9-new">' + icon('plus') + 'Предложить договорённость</button>' +
        '<div class="ppl-note">Напомним о следующем шаге через 3, 7 и 30 дней: настройка в разделе «Уведомления».</div>' +
        '</div></div>';
    }
  });
  D.action('g9-ok-ask', el => {
    const a = S.agreements.filter(x => x.id === el.dataset.arg)[0], w = agWho(a);
    confirmSheet({
      title: 'Согласовать договорённость?',
      body: '<div class="ppl-sheet-sum"><div class="ppl-dl">' + sumRow('С кем', w.name) + sumRow('Шаг', cap1(a.step)) + sumRow('Срок', a.due) + '</div></div><div class="ppl-quote">«' + esc(a.text) + '»</div>' +
        '<div class="ppl-note" style="margin-top:8px">После вашего ответа договорённость получит статус «согласовано обеими сторонами».</div>',
      ok: 'Согласовать', act: 'g9-ok-do', arg: a.id
    });
  });
  D.action('g9-ok-do', el => {
    const a = S.agreements.filter(x => x.id === el.dataset.arg)[0];
    a.status = 'done'; D.closeSheet(); D.rerender(); D.toast('Договорённость согласована');
  });
  D.action('g9-edit', el => {
    const a = S.agreements.filter(x => x.id === el.dataset.arg)[0];
    D.openSheet('<div class="sheet-title">' + (a.status === 'you' ? 'Предложить правку' : 'Изменить текст') + '</div>' +
      '<div class="ppl-note" style="margin-bottom:8px">После правки подтверждение сбрасывается: вторая сторона согласует текст заново.</div>' +
      '<div class="field ppl-textarea-wrap"><textarea class="textarea" id="g9-text" maxlength="280" aria-label="Текст договорённости">' + esc(a.text) + '</textarea></div>' +
      '<div class="ppl-sheet-actions"><button class="btn btn-primary btn-block" data-act="g9-edit-do" data-arg="' + a.id + '">Отправить на подтверждение</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button></div>');
  });
  D.action('g9-edit-do', el => {
    const a = S.agreements.filter(x => x.id === el.dataset.arg)[0], t = (document.getElementById('g9-text') || {}).value || '';
    if (t.trim().length < 5) { D.toast('Опишите договорённость, не короче 5 знаков'); return; }
    a.text = t.trim().slice(0, 280); a.status = 'wait'; a.initiator = 'me';
    D.closeSheet(); D.rerender(); D.toast('Правка отправлена, подтверждение сброшено');
  });
  D.action('g9-new', () => {
    const steps = F.MEET_OUTCOME.nextSteps.filter(s => s !== 'ничего');
    D.openSheet('<div class="sheet-title">Предложить договорённость</div>' +
      '<div class="field"><label for="g9-who">С кем</label><select class="input" id="g9-who">' + P.CONTACTS.map(c => '<option value="' + c.pid + '">' + esc(person(c.pid).name) + '</option>').join('') + '</select></div>' +
      '<div class="field" style="margin-top:10px"><label for="g9-step">Следующий шаг</label><select class="input" id="g9-step">' + steps.map(s => '<option>' + esc(s) + '</option>').join('') + '</select></div>' +
      '<div class="field ppl-textarea-wrap" style="margin-top:10px"><label for="g9-text">Что договорились сделать</label><textarea class="textarea" id="g9-text" maxlength="280" placeholder="Например: пришлю расчёт до пятницы"></textarea></div>' +
      '<div class="ppl-note" style="margin-top:8px">Договорённость уйдёт второй стороне на подтверждение, срок 3 дня.</div>' +
      '<div class="ppl-sheet-actions"><button class="btn btn-primary btn-block" data-act="g9-new-do">Отправить на подтверждение</button><button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button></div>');
  });
  D.action('g9-new-do', () => {
    const who = (document.getElementById('g9-who') || {}).value, step = (document.getElementById('g9-step') || {}).value, t = ((document.getElementById('g9-text') || {}).value || '').trim();
    if (t.length < 5) { D.toast('Опишите договорённость, не короче 5 знаков'); return; }
    S.agreements.push({ id: 'ag' + (S.seq++), who: who, meetId: null, initiator: 'me', step: step, text: t.slice(0, 280), due: 'через 3 дня', status: 'wait' });
    D.closeSheet(); D.rerender(); D.toast('Договорённость отправлена на подтверждение');
  });

  /* ================= G10 «Hosted Buyer» ================= */

  D.register('G10', {
    tab: 'F1',
    meta: {
      title: 'G10 · Hosted Buyer',
      role: 'Участник, приглашённый покупатель',
      fr: ['FR-MEET-07', 'FR-MEET-09', 'FR-PPL-02'],
      ac: ['AC-MEET-04'],
      what: [
        'Карточка приглашённого покупателя (Hosted Buyer): компания, что ищет, обязательство «20 встреч» и сколько проведено.',
        'Кто может записаться: участник со своим продуктом; показаны ваши продукты и ваша заявка к покупателю.',
        'Запись через выбор окна (G2, Комната сделок) и заявку (G3) с листом подтверждения.'
      ],
      rules: [
        'Приглашённый покупатель берёт обязательство провести 20 встреч за билет (D-25).',
        'Записаться к покупателю может участник со своим продуктом: экспонент или признак «продаю» в анкете (FR-MEET-07, AC-MEET-04).',
        'Раннее окно записи для покупателя — параметр организаторов, по умолчанию выключено; заявки покупателя к экспонентам принимаются автоматически по настройке экспонента.'
      ],
      depends: ['D-25', 'D-07', 'FR-MEET-07']
    },
    html() {
      const hb = F.HB, p = person('p02'), c = P.company('p02'), prods = F.productsOf('co00');
      const m = meetOf('p02');
      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: 'Приглашённый покупатель', title: esc(hb.name), sub: esc(hb.company) + ' · ' + esc(hb.role), paren: paren('Hosted Buyer · обязательство 20 встреч') }, backOf('G1'))) +
        '<div class="ppl-body">' +
        '<button class="ppl-who" data-go="F2/p02">' + avatar(hb.name, 'sm') + '<span class="grow"><span class="r-title">' + esc(hb.name) + '</span><span class="r-sub">' + esc(hb.company) + (P.goalOf('p02') ? ' · цель: ' + esc(P.goalOf('p02')) : '') + '</span></span><span class="ppl-hb">Hosted Buyer</span>' + icon('chevR') + '</button>' +
        '<div class="ppl-box pad"><div class="ppl-note">Что ищет</div><div class="r-title">' + esc(hb.seeks) + '</div>' +
        (c ? '<div class="ppl-acts" style="padding-left:0"><button class="btn ppl-quiet btn-sm" data-go="F12/' + c.id + '">Компания</button></div>' : '') + '</div>' +
        '<div class="ppl-kpis"><div class="kpi-cell"><div class="k">Обязательство</div><div class="v">' + hb.quota.total + '<span class="k"> встреч</span></div></div>' +
        '<div class="kpi-cell"><div class="k">Проведено</div><div class="v">' + hb.quota.done + '<span class="k"> · осталось ' + hb.quota.left + '</span></div></div></div>' +
        '<div class="ppl-box pad"><div class="ppl-prog"><span class="progress"><i style="width:' + Math.round(hb.quota.done / hb.quota.total * 100) + '%"></i></span><b>' + hb.quota.done + ' из ' + hb.quota.total + '</b></div></div>' +
        '<div class="ppl-sec">Как записаться</div>' +
        '<div class="ppl-box pad"><div class="ppl-note">Записаться может участник со своим продуктом. ' + (prods.length ? 'У вас он есть, можно подавать заявку:' : 'Добавьте продукт в профиль, чтобы записаться.') + '</div>' +
        prods.map(x => '<button class="ppl-rowlink" data-go="H10/' + x.id + '"><span class="ppl-sq">' + icon('briefcase') + '</span><span class="grow"><span class="r-title">' + esc(x.name) + '</span><span class="r-sub">' + esc(x.kind) + '</span></span>' + icon('chevR') + '</button>').join('') + '</div>' +
        (m ? '<div class="ppl-sec">Ваша заявка</div><div class="ppl-box">' + meetRowLocal(m) + '</div>' :
          '<button class="btn btn-primary btn-block" data-act="g10-book">Записаться на встречу</button>') +
        '<div class="ppl-note">Заявки покупателя к экспонентам принимаются автоматически, если экспонент это включил.</div>' +
        '</div></div>';
    }
  });
  function meetRowLocal(m) {
    const w = meetWho(m);
    return '<button class="ppl-meet" data-go="G4/' + m.id + '"><span class="tm">' + esc(m.start) + '<small>' + esc(dayWord(m.day)) + '</small></span>' +
      '<span class="grow"><span class="r-title">' + esc(w.name) + '</span><span class="r-sub">' + esc(m.place) + '</span><span class="ppl-st ' + MST_CLS[m.status] + '">' + esc(MST[m.status]) + '</span></span>' + icon('chevR') + '</button>';
  }
  D.action('g10-book', () => {
    const st = D.st('G2');
    st.area = 'ms-deal'; st.who = 'p02'; st.win = null; st.heldUntil = null; st.table = null; st.day = null;
    S.srcMap = S.srcMap || {}; S.srcMap.p02 = 'hb';
    location.hash = '#/G2/p02';
  });

  /* ================= G11 «Нет окон» ================= */

  function g11Alts(pid) {
    const pool = P.COFFEE_PICKS.concat(['p12', 'p19', 'p20', 'p23']).filter((v, i, a) => a.indexOf(v) === i);
    const out = [];
    pool.forEach(id => {
      if (id === pid || out.length >= 3 || meetOf(id)) { return; }
      const s = P.suggest(id);
      if (s) { out.push({ id: id, s: s }); }
    });
    return out;
  }
  D.register('G11', {
    tab: 'F1',
    meta: {
      title: 'G11 · Нет окон',
      role: 'Участник',
      fr: ['FR-MEET-12', 'FR-MEET-09'],
      ac: ['AC-MEET-09'],
      what: [
        'Нет свободного окна у вас и у выбранного человека: объяснение причины, лист ожидания и три альтернативы от Секретаря (другие люди с общим окном и столом).',
        'Вход в лист ожидания через лист подтверждения; после входа видна позиция и можно выйти из листа.',
        'Из альтернатив — «Хочу встретиться» (F11) с источником «альтернатива Секретаря».'
      ],
      rules: [
        'Лист ожидания: при освобождении окна на подтверждение даётся 15 минут, иначе место уходит следующему; в лимит заявок лист не входит.',
        'Альтернативы учитывают вашу программу и матрицу переездов; предлагаются не менее трёх вариантов (AC-MEET-09).',
        'Окна и столы нетворкинг-зоны — демонстрационная раскладка (D-55).'
      ],
      depends: ['окна встреч', 'Секретарь', 'D-55']
    },
    html(ctx) {
      const pid = (ctx.param && person(ctx.param)) ? ctx.param : 'p04';
      const p = person(pid), e = P.ext(pid);
      const pos = S.waitlist[pid];
      const alts = g11Alts(pid);
      const reason = !P.hasAvail(pid) ? 'В ближайшие дни у этого участника нет открытых окон для встреч.' : 'Его окна совпадают с вашими встречами и пунктами «Мой путь», или в них заняты все столы.';
      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: 'Встречи', title: 'Окон нет', sub: esc(p.name) + ' · ' + esc(p.company), paren: paren('Секретарь подобрал три варианта') }, backOf('G2/' + pid))) +
        '<div class="ppl-body">' +
        '<div class="banner info">' + icon('clock') + '<div class="grow"><div class="b-title">Нет общего окна</div><div class="cap">' + esc(reason) + '</div></div></div>' +
        (pos ? '<div class="banner ok">' + icon('check') + '<div class="grow"><div class="b-title">Вы в листе ожидания</div><div class="cap">Позиция ' + pos + '. Если окно освободится, у вас будет 15 минут на подтверждение.</div></div><button class="btn btn-ghost btn-sm" data-act="g11-leave" data-arg="' + pid + '">Выйти</button></div>'
          : '<div class="ppl-box pad"><div class="ppl-note"><b>Лист ожидания</b></div><div class="ppl-note">Если у участника освободится окно, предложим его вам. На подтверждение будет 15 минут, потом место уйдёт следующему.</div>' +
            '<button class="btn btn-primary btn-block" data-act="g11-join-ask" data-arg="' + pid + '">Встать в лист ожидания</button></div>') +
        '<div class="ppl-sec">Варианты от Секретаря</div>' +
        (alts.length ? alts.map(a => {
          const q = person(a.id), qe = P.ext(a.id);
          return '<div class="ppl-res"><button class="ppl-main" data-go="F2/' + a.id + '">' + avatar(q.name, 'sm') + '<span class="ppl-t"><span class="ppl-name">' + esc(q.name) + tariffTag(q.tariff) + '</span><span class="ppl-role">' + esc(q.role) + ' · ' + esc(q.company) + '</span>' +
            '<span class="ppl-why">' + paren((F.PS && F.PS.whyText) ? F.PS.whyText(qe.why) : (qe.why && qe.why.text) || '') + '</span></span><span class="ppl-chev">' + icon('chevR') + '</span></button>' +
            '<div class="ppl-note">Ближайшее общее окно: ' + esc(when(a.s.day, a.s.label)) + ', стол ' + a.s.table + '</div>' +
            '<div class="ppl-acts" style="padding-left:0"><button class="btn btn-secondary btn-sm" data-go="F11/' + a.id + '_alt">Хочу встретиться</button></div></div>';
        }).join('') : '<div class="card ppl-empty"><div class="e-title">Вариантов пока нет</div><div class="e-text">Общих свободных окон сегодня не осталось. Попробуйте завтра.</div></div>') +
        '<button class="btn btn-ghost btn-block" data-go="G2/' + pid + '">Выбрать другое окно</button>' +
        '</div></div>';
    }
  });
  D.action('g11-join-ask', el => {
    const p = person(el.dataset.arg);
    confirmSheet({
      title: 'Встать в лист ожидания?',
      body: '<div class="ppl-sheet-sum"><div class="ppl-dl">' + sumRow('Участник', p.name + ' · ' + p.company) + '</div></div><div class="ppl-note">Если у него освободится окно, мы предложим его вам. На подтверждение будет 15 минут, потом место перейдёт следующему. Лист ожидания в лимит заявок не входит.</div>',
      ok: 'Встать в лист', act: 'g11-join-do', arg: p.id
    });
  });
  D.action('g11-join-do', el => {
    S.waitlist[el.dataset.arg] = 2 + Object.keys(S.waitlist).length;
    D.closeSheet(); D.rerender(); D.toast('Вы в листе ожидания, позиция ' + S.waitlist[el.dataset.arg]);
  });
  D.action('g11-leave', el => { delete S.waitlist[el.dataset.arg]; D.rerender(); D.toast('Вы вышли из листа ожидания'); });
})();
