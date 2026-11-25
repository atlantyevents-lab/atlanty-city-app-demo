/* Блок O — команда и допуск: O1 сканер допуска, O2 поиск гостя, O3 закрытая сессия, O4 статистика,
   O5 сканер зала «Вход / Выход» (волонтёр-админ зала, D-48). Панель вкладок видна без активной вкладки ('-'):
   экраны открываются из пункта «Допуск» бокового меню, и из них должен оставаться выход в приложение. */
(function () {
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag } = D;

  /* ---------- O1 Сканер допуска (команда) ---------- */
  D.register('O1', {
    tab: '-',
    meta: {
      title: 'O1 · Допуск',
      role: 'Команда площадки',
      fr: ['FR-ACC-01', 'FR-ACC-02'],
      ac: ['AC-ACC-01'],
      what: [
        'Сканер пропуска гостя с тремя исходами: в списке, нет в списке, уже отмечен.',
        'Цвета состояний из токенов --ok, --err, --warn.',
        'Время последней отметки при повторном сканировании.'
      ],
      rules: [
        'Список билетов — из системы регистрации; скан не создаёт запись задним числом.',
        'Повторное сканирование показывает время первой отметки, не дублирует.',
        'Цвета состояний — только семантические токены, в обеих темах AA.'
      ],
      depends: ['реестр билетов', 'журнал отметок']
    },
    html(ctx) {
      const st = ctx.state;
      st.scan = st.scan || 'ok';
      const cur = F.SCAN_STATES.find(s => s.id === st.scan);
      const chips = F.SCAN_STATES.map(s =>
        '<button class="chip' + (s.id === st.scan ? ' on' : '') + '" data-act="o1-scan" data-arg="' + s.id + '">' + esc(s.label) + '</button>').join('');
      return '<div class="scr">' +
        D.head({back:'P1', eyebrow:'Команда · ' + esc(F.NOW.time), title:'Допуск', sub:'Скан пропуска на входе', paren:paren('три исхода: список, отказ, повтор')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="scan-stage">' +
        '<div class="scan-frame"><span class="c"></span><div class="scan-line"></div></div>' +
        '<div class="scan-hint">Наведите камеру на QR-код пропуска</div>' +
        '</div>' +
        '<div class="chips chips-wrap con-chips40">' + chips + '</div>' +
        '<button class="con-link" data-go="O5">' + icon('scan') + '<span class="cl-main"><span class="cl-t">Сканер зала: вход и выход</span>' +
        '<span class="cl-s" style="display:block">Волонтёры-админы залов, двое на смену</span></span>' + icon('chevR') + '</button>' +
        '<div class="scan-result scan-' + (cur.tone === 'ok' ? 'ok' : cur.tone === 'err' ? 'err' : 'warn') + '">' +
        '<div class="mc-status ' + cur.tone + '" style="font-size:13px">' + esc(cur.label) + '</div>' +
        '<div style="font-size:15px;font-weight:600;margin-top:6px">' + esc(cur.text) + '</div>' +
        (st.scan === 'dup' ? '<div class="cap" style="margin-top:4px">первая отметка — сегодня в 10:42, вход через главный вход</div>' : '') +
        (st.scan === 'deny' ? '<div class="cap" style="margin-top:4px">проверьте билет или направьте к стойке регистрации</div>' : '') +
        '</div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Демо-режим: исход выбирается чипами. В проде определяется сканированием.</div></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('o1-scan', el => { const lbl = el.textContent.trim(); D.st('O1').scan = el.dataset.arg; D.rerender(); D.toast('Демо: исход «' + lbl + '»'); });

  /* ---------- O2 Поиск гостя ---------- */
  D.register('O2', {
    tab: '-',
    meta: {
      title: 'O2 · Поиск гостя',
      role: 'Команда, стойка регистрации',
      fr: ['FR-CHK-01'],
      ac: ['AC-CHK-01'],
      what: [
        'Поиск гостя по имени, e-mail или номеру билета на стойке.',
        'Карточка найденного: тариф, статус, заметки.',
        'Выдача кода входа: 6 цифр, срок 5 минут, 5 попыток.'
      ],
      rules: [
        'Код входа — 6 цифр, живёт 5 минут, 5 попыток, блокировка 15 минут.',
        'Выдача кода пишется в журнал стойки с именем сотрудника.',
        'Поиск не раскрывает контакты — только то, что нужно для допуска.'
      ],
      depends: ['реестр билетов', 'коды входа']
    },
    html(ctx) {
      const st = ctx.state;
      st.found = st.found || false;
      const g = F.DESK_GUEST;
      const result = st.found
        ? '<div class="scan-result scan-err"><div class="card-row">' + icon('alert') +
          '<div><div class="r-title">' + esc(g.name) + '</div>' +
          '<div class="r-sub">' + esc(g.ticket) + ' · ' + esc(g.note) + '</div></div></div>' +
          '<div class="card" style="margin-top:10px"><div class="cap" style="margin-bottom:8px">Код входа на сегодня</div>' +
          '<div class="code-row">' + '482913'.split('').map(d => '<span class="code-box" style="pointer-events:none">' + d + '</span>').join('') + '</div>' +
          '<div class="cap" style="text-align:center;margin-top:8px">' + esc(g.issue) + '</div></div>' +
          '<button class="btn btn-primary btn-block" style="margin-top:10px" data-act="o2-issued">Код выдан</button></div>'
        : '';
      return '<div class="scr">' +
        D.head({back:'O1', eyebrow:'Стойка', title:'Найти гостя', sub:'поиск по имени, e-mail или билету', paren:paren('код входа — на 5 минут')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="row"><input class="input" style="flex:1" placeholder="Имя, e-mail или № билета" data-o2q>' +
        '<button class="btn btn-primary btn-sm" data-act="o2-find">Найти</button></div>' +
        result +
        '<div class="banner">' + icon('info') + '<div class="cap">Демо: поиск находит тестового гостя «' + esc(g.name) + '» по любой строке.</div></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('o2-find', () => { D.st('O2').found = true; D.rerender(); D.toast('Гость найден: ' + F.DESK_GUEST.name); });
  D.action('o2-issued', () => D.toast('Код выдан и продиктован гостю'));
  D.action('o3-day', el => { D.st('O3').day = el.dataset.arg; D.rerender(); });

  /* ---------- O3 Закрытая сессия ---------- */
  D.register('O3', {
    tab: '-',
    meta: {
      title: 'O3 · Закрытая сессия',
      role: 'Команда, контроль зала',
      fr: ['FR-CHK-02'],
      ac: ['AC-CHK-02'],
      what: [
        'Список закрытых сессий дня с вместимостью и записью.',
        'Сканирование гостя на входе в зал.',
        'Счётчик вошедших и остаток мест.'
      ],
      rules: [
        'Вход только по записи или тарифу сессии; скан сверяется со списком.',
        'Вместимость зала ограничивает вход — после заполнения скан отклоняется.',
        'Список закрытых сессий формируется из программы с пометкой доступа.'
      ],
      depends: ['программа', 'реестр записей']
    },
    html(ctx) {
      const st = ctx.state;
      st.day = st.day || F.NOW.day;
      const days = (F.DAYS || []).map(x => x.id);
      const dayChips = '<div class="chips chips-wrap">' + days.map(d =>
        '<button class="chip' + (d === st.day ? ' on' : '') + '" data-act="o3-day" data-arg="' + d + '">' + esc(d) + '</button>').join('') + '</div>';
      const closed = F.SESSIONS.filter(s => s.day === st.day && s.access && s.access !== 'all');
      const rows = closed.map(s => {
        const h = F.hall(s.hall);
        const signed = s.cap - (s.left || 0);
        const pct = Math.round(signed / s.cap * 100);
        return '<div class="row"><div class="grow"><div class="r-title" style="font-size:14px">' + esc(s.title) + '</div>' +
          '<div class="r-sub">' + esc(s.time) + ' · ' + esc(h.name) + ' · ' + esc(ACCESS_LABEL[s.access] || 'по тарифу') + '</div>' +
          '<div class="progress" style="margin-top:6px"><i style="width:' + pct + '%"></i></div></div>' +
          '<div style="text-align:right"><div style="font-size:13px;font-weight:600">' + signed + '/' + s.cap + '</div>' +
          '<div class="cap">записались</div></div></div>';
      }).join('');
      return '<div class="scr">' +
        D.head({back:'O1', eyebrow:'Контроль зала', title:'Закрытые сессии', sub:st.day + ' · ' + closed.length + ' ' + D.plural(closed.length, ['сессия', 'сессии', 'сессий']) + ' с ограниченным входом', paren:paren('вход по записи или тарифу')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        dayChips +
        (rows ? '<div class="card" style="padding:2px 16px"><div class="list">' + rows + '</div></div>'
              : '<div class="card"><div class="cap">В этот день закрытых сессий нет — все события открыты для всех тарифов.</div></div>') +
        '<button class="btn btn-primary btn-block" data-go="O1">Сканировать гостя</button>' +
        '<button class="con-link" data-go="O5">' + icon('scan') + '<span class="cl-main"><span class="cl-t">Сканер зала: вход и выход</span>' +
        '<span class="cl-s" style="display:block">счётчик «в зале сейчас» по залам</span></span>' + icon('chevR') + '</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });

  /* ---------- O4 Статистика допуска ---------- */
  D.register('O4', {
    tab: '-',
    meta: {
      title: 'O4 · Статистика допуска',
      role: 'Команда, аналитика',
      fr: ['FR-CHK-04'],
      ac: ['AC-CHK-04'],
      what: [
        'Вход по дням: прошло гостей против ожидаемых.',
        'Распределение по точкам входа.',
        'Прогноз загрузки на оставшиеся дни.'
      ],
      rules: [
        'Статистика считается по отметкам сканера, без двойного счёта повторных сканов.',
        '«Ожидается» — из билетов и программ; день без отметок не считается нулём ошибок.',
        'Данные обновляются по мере сканирования, задержка до минуты.'
      ],
      depends: ['журнал отметок', 'реестр билетов']
    },
    html(ctx) {
      const d = F.ADMISSION_STATS;
      const maxE = Math.max.apply(null, d.days.map(x => x.expected));
      const bars = d.days.map(x =>
        '<div class="vbar-col"><div class="vbar" style="height:' + (x.future ? 3 : Math.round(x.entered / maxE * 100)) + '%;background:' + (x.future ? 'var(--surface-2)' : 'var(--accent-solid)') + (x.future ? ';border:1px solid var(--line)' : '') + '"></div>' +
        '<div class="vbar-lbl">' + esc(x.day) + (x.future ? ' · план' : '') + '</div></div>').join('');
      const hallRows = d.halls.map(h => {
        const pct = Math.round(h.v / 890 * 100);
        return '<div class="funnel-row"><span class="fr-label">' + esc(h.name) + '</span><span class="fr-bar"><i style="width:' + pct + '%"></i></span><span class="fr-val">' + h.v + '</span></div>';
      }).join('');
      return '<div class="scr">' +
        D.head({back:'O1', eyebrow:'Аналитика', title:'Допуск', sub:'по дням и точкам входа', paren:paren('обновляется по мере сканирования')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="stat-tiles' + ({ 2: ' two', 4: ' four' }[d.days.filter(x => !x.future).length] || '') + '">' + d.days.filter(x => !x.future).map(x =>
          '<div class="stat-tile"><span class="num">' + x.entered + '</span><span class="lbl">' + esc(x.day) + ' · из ' + x.expected + '</span></div>').join('') + '</div>' +
        '<div class="card"><div class="cap" style="margin-bottom:8px">Вошло по дням</div><div class="vbars">' + bars + '</div></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:10px">По точкам входа · сегодня</div>' + hallRows + '</div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });

  /* =====================================================================
     O5 · Сканер зала: вход и выход (D-48, FR-CHK-07, AC-CHK-07)
     Волонтёр-админ зала (двое на смену) выбирает зал и режим «Вход / Выход», сканирует пропуск.
     Данные: FIX.SHIFTS, VOLUNTEERS, HALL_ASSIGN, O5_ME, HALL_FLOW, HALL_GUESTS (data/fx_ops.js).
     Счётчик «в зале сейчас» = входы минус выходы; общий счётчик HALL_FLOW читает и дашборд P4.
     ===================================================================== */
  const t2m = t => { const p = String(t).split(':'); return (+p[0]) * 60 + (+p[1]); };
  const m2t = m => String(Math.floor(m / 60) % 24).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const ACCESS_LABEL = { biz_fc: 'Бизнес и Первый класс', fc: 'Первый класс', sat: 'Спутник' };
  function canEnter(tariff, access) {
    if (!access || access === 'all') return true;
    if (access === 'biz_fc') return tariff === 'Бизнес' || tariff === 'Первый класс';
    if (access === 'fc') return tariff === 'Первый класс';
    if (access === 'sat') return tariff === 'Спутник';
    return true;
  }
  const o5shift = () => F.SHIFTS.filter(s => s.id === F.O5_ME.shift)[0];
  /* залы, на которые волонтёр назначен в смене (HALL_ASSIGN меняется на экране P5) */
  const o5halls = () => F.HALL_IDS.filter(h => ((F.HALL_ASSIGN[F.O5_ME.shift] || {})[h] || []).indexOf(F.O5_ME.vol) >= 0);
  function o5guest(id) {
    if (id === 'me') return { id: id, name: F.ME.name, tariff: F.ME.tariff };
    const p = F.person(id);
    return { id: id, name: p ? p.name : id, tariff: p ? p.tariff : '' };
  }
  function o5state() {
    const st = D.st('O5');
    if (!st.init) {
      st.init = true;
      st.mode = 'in';
      st.offline = false;
      st.hall = F.O5_ME.hall;
      st.inside = {};         /* зал → { id гостя: в зале ли }, учитывает только отметки этого устройства и стартовый набор */
      st.events = [];         /* журнал устройства, новые сверху */
      st.pend = {};           /* зал → { in, out }: отметки без связи, ещё не попавшие в общий счётчик */
      st.clock = t2m(F.NOW.time);
      st.last = null;
      st.inside[F.O5_ME.hall] = {};
      F.HALL_GUESTS.forEach(g => { if (g.inside) st.inside[F.O5_ME.hall][g.id] = true; });
    }
    return st;
  }
  const o5pend = (st, h) => st.pend[h] || { in: 0, out: 0 };
  const o5saveScroll = st => { const sc = document.querySelector('.scr'); st.scrollTop = sc ? sc.scrollTop : 0; };

  /* строка идущей или ближайшей сессии зала: ссылка в карточку сессии */
  function o5sessionRow(hall) {
    const hs = F.opsHallSession(hall), s = hs.s;
    if (!s) return '<div class="cap">В этом зале сегодня больше нет сессий.</div>';
    const end = m2t(t2m(s.time) + s.dur);
    const closed = s.access && s.access !== 'all' ? ' · закрытая: ' + esc(ACCESS_LABEL[s.access] || s.access) : '';
    return '<button class="con-link" data-go="C3/' + esc(s.id) + '">' + icon('clock') + '<span class="cl-main"><span class="cl-t">' + esc(s.title) + '</span>' +
      '<span class="cl-s" style="display:block">' + (hs.state === 'now' ? 'Идёт' : 'Дальше') + ' · ' + esc(s.time) + '–' + end + closed + '</span></span>' + icon('chevR') + '</button>';
  }

  function o5scan(gid) {
    const st = o5state(), hall = st.hall;
    if (o5halls().indexOf(hall) < 0) { D.toast('Вы не назначены на этот зал'); return; }
    const g = o5guest(gid), dir = st.mode;
    st.clock += 1;
    const ins = st.inside[hall] || (st.inside[hall] = {});
    const prev = st.events.filter(e => e.hall === hall && e.gid === gid && (e.res === 'ok' || e.res === 'note'))[0];
    const s = F.opsHallSession(hall).s;
    let res, note = '', counted = false;
    if (prev && prev.dir === dir && st.clock - prev.min < 10) {
      res = 'dup'; note = 'уже отмечен в ' + prev.time;
    } else if (dir === 'in') {
      if (s && !canEnter(g.tariff, s.access)) { res = 'wrong'; }
      else if (ins[gid]) { res = 'note'; note = 'повторный вход без выхода'; }
      else { res = 'ok'; ins[gid] = true; counted = true; }
    } else if (!ins[gid]) {
      res = 'note'; note = 'выход без входа';
    } else {
      res = 'ok'; ins[gid] = false; counted = true;
    }
    if (counted) {
      if (st.offline) {
        const p = st.pend[hall] || (st.pend[hall] = { in: 0, out: 0 });
        p[dir]++;
      } else {
        F.HALL_FLOW[hall][dir === 'in' ? 'entered' : 'exited']++;
      }
    }
    const ev = { gid: gid, name: g.name, tariff: g.tariff, hall: hall, dir: dir, min: st.clock, time: m2t(st.clock), res: res, note: note,
      queued: st.offline && res !== 'wrong', synced: false, sess: s ? { id: s.id, title: s.title, access: s.access } : null };
    st.events.unshift(ev);
    st.last = ev;
    st.justScanned = true;
    o5saveScroll(st);
    D.rerender();
  }
  /* связь восстановлена: очередь уходит на сервер, дубли отбрасываются, счётчик зала обновляется */
  function o5sync(st) {
    const q = st.events.filter(e => e.queued && !e.synced);
    const sent = q.filter(e => e.res === 'ok' || e.res === 'note').length;
    const dups = q.filter(e => e.res === 'dup').length;
    Object.keys(st.pend).forEach(h => { F.HALL_FLOW[h].entered += st.pend[h].in; F.HALL_FLOW[h].exited += st.pend[h].out; });
    st.pend = {};
    q.forEach(e => { e.synced = true; });
    return { sent: sent, dups: dups };
  }

  D.register('O5', {
    tab: '-',
    meta: {
      title: 'O5 · Сканер зала: вход и выход',
      role: 'Волонтёр-админ зала (двое на смену)',
      fr: ['FR-CHK-07', 'FR-CHK-08', 'FR-CHK-09', 'FR-CHK-03', 'FR-CHK-02', 'FR-ANL-08'],
      ac: ['AC-CHK-07', 'AC-CHK-08', 'AC-CHK-02', 'AC-CHK-09'],
      what: [
        'Волонтёр смены, выбор зала из семи (залы, на которые он не назначен, закрыты замком), режим «Вход» или «Выход».',
        'Результат скана: «Допущен», «Принят с пометкой» (повторный вход без выхода, выход без входа), «Уже отмечен», «Неверный зал» для закрытой сессии.',
        'Счётчик «в зале сейчас» = входы минус выходы; идущая или ближайшая сессия зала; журнал отметок устройства.',
        'Режим «Нет связи»: офлайн-очередь, отправка при восстановлении связи без дублей. Подпись «участников предупредили заранее».'
      ],
      rules: [
        'Сканирует волонтёр, назначенный на зал и смену; на смену назначают двух (параметр, значение по D-48 равно двум); назначение делает администратор (P5).',
        'Не назначенный на зал волонтёр получает отказ. Для закрытой сессии гость без права на неё получает «неверный зал».',
        'Выход без входа и повторный вход без выхода принимаются с пометкой и в счётчик не входят (трактовка демо: счётчик остаётся равен входам минус выходам; закрытие пребывания по окончании сессии — предложение, согласовать).',
        'Повторный скан в течение 10 минут показывает «уже отмечен ЧЧ:ММ» и не засчитывается (AC-CHK-02).',
        'Индивидуальные перемещения видят только организаторы с правом и записью в журнал; экспонентам и спикерам не передаются (FR-CHK-09). Основание и срок хранения — вопрос юристу (O-33).',
        'Участников уведомляют заранее: баннер в приложении, запись ленты, рассылка, объявление у входа; срок «заблаговременно» не задан (FR-CHK-08).'
      ],
      depends: ['D-48', 'D-47', 'O-33']
    },
    html(ctx) {
      const st = o5state();
      const me = F.opsVolunteer(F.O5_ME.vol), sh = o5shift(), mine = o5halls();
      const hall = st.hall, hObj = F.hall(hall), assigned = mine.indexOf(hall) >= 0;
      const mates = ((F.HALL_ASSIGN[sh.id] || {})[hall] || []).filter(v => v !== me.id).map(v => (F.opsVolunteer(v) || {}).name).filter(Boolean);
      const sub = esc(sh.label) + ' · ' + esc(sh.from) + '–' + esc(sh.to) +
        (assigned ? (mates.length ? ' · с вами: ' + esc(mates.join(', ')) : ' · вы один на смене') : ' · на выбранный зал не назначены');

      const vol = '<div class="con-vol">' + D.avatar(me.name, 'sm') +
        '<div class="cv-main"><div class="cv-name">' + esc(me.name) + '</div><div class="cv-sub">' + sub + '</div></div>' +
        tag('волонтёр зала', 'accent') + '</div>';

      const hallOrder = mine.concat(F.HALL_IDS.filter(h => mine.indexOf(h) < 0));
      const chips = '<div class="con-halls" role="group" aria-label="Выбор зала">' + hallOrder.map(id => {
        const ok = mine.indexOf(id) >= 0;
        return '<button class="chip' + (id === hall ? ' on' : '') + (ok ? '' : ' is-lock') + '" data-act="o5-hall" data-arg="' + id + '"' +
          ' aria-label="' + esc(F.hall(id).short) + (ok ? '' : ', вы не назначены') + '">' + (ok ? '' : icon('lock')) + esc(F.hall(id).short) + '</button>';
      }).join('') + '</div>';

      const mode = '<div class="segbar con-mode" role="group" aria-label="Режим">' +
        '<button class="seg' + (st.mode === 'in' ? ' on' : '') + '" data-act="o5-mode" data-arg="in">Вход</button>' +
        '<button class="seg' + (st.mode === 'out' ? ' on' : '') + '" data-act="o5-mode" data-arg="out">Выход</button></div>';

      let body;
      if (!assigned) {
        const names = ((F.HALL_ASSIGN[sh.id] || {})[hall] || []).map(v => (F.opsVolunteer(v) || {}).name).filter(Boolean);
        body = '<div class="con-deny"><div class="cd-head">' + icon('lock') + '<span>Отказ: вы не назначены на этот зал</span></div>' +
          '<div class="cap" style="font-size:13.5px;line-height:1.45;color:var(--ink)">Зал «' + esc(hObj.short) + '» в этой смене сканируют ' +
          (names.length ? '<b>' + esc(names.join(' и ')) + '</b>' : 'другие волонтёры') + '. Сканировать вход и выход может только назначенный на зал и смену.</div>' +
          (mine.length
            ? '<button class="btn btn-primary btn-block" data-act="o5-hall" data-arg="' + mine[0] + '">К моему залу: ' + esc(F.hall(mine[0]).short) + '</button>'
            : '<div class="cap">Вы не назначены ни на один зал смены. Назначение делает администратор: консоль, «Параметры», «Волонтёры залов».</div>' +
              '<button class="btn btn-secondary btn-block" data-go="P5">Открыть параметры</button>') +
          '</div>';
      } else {
        const pe = o5pend(st, hall), flow = F.HALL_FLOW[hall];
        const ent = flow.entered + pe.in, exi = flow.exited + pe.out, inside = ent - exi;
        const counter = '<div class="con-count"><div class="cc-n" id="o5-n">' + inside + '</div><div class="cc-body">' +
          '<div class="cc-lbl">В зале сейчас · ' + esc(hObj.short) + '</div>' +
          '<div class="cc-eq">вошло ' + ent + ' − вышло ' + exi + '</div>' +
          (st.offline ? '<div class="cc-sess" style="color:var(--warn);font-weight:600">Нет связи — отметки копятся на устройстве</div>' : '') +
          (pe.in || pe.out ? '<div class="cc-sess"><b>На устройстве до отправки:</b> входов ' + pe.in + ', выходов ' + pe.out + '</div>' : '') +
          '</div></div>';

        const stage = '<div class="scan-stage con-stage con-stage-' + st.mode + '"><div class="scan-frame"><span class="c"></span><div class="scan-line"></div></div>' +
          '<div class="scan-hint">Режим «' + (st.mode === 'in' ? 'Вход' : 'Выход') + '». Наведите камеру на QR-код или коснитесь гостя ниже</div></div>';

        const ins = st.inside[hall] || {};
        const guests = F.HALL_GUESTS.map(g => {
          const x = o5guest(g.id);
          return '<button class="con-guest' + (ins[g.id] ? ' is-in' : '') + '" data-act="o5-scan" data-arg="' + esc(g.id) + '">' +
            '<span class="cg-name">' + esc(x.name) + '</span>' +
            '<span class="cg-sub">' + esc(x.tariff) + ' · ' + (ins[g.id] ? '<b>в зале</b>' : 'вне зала') + '</span></button>';
        }).join('');

        let result;
        const L = st.last;
        if (!L || L.hall !== hall) {
          result = '<div class="con-res-empty" id="o5-res">' + icon('scan') + '<span>Результат скана появится здесь. Допуск, пометка, повтор или «неверный зал».</span></div>';
        } else {
          const dirTxt = L.dir === 'in' ? 'вход' : 'выход';
          const q = L.queued ? ' · в очереди на отправку' : '';
          let tone, head, text;
          if (L.res === 'ok') {
            tone = 'ok'; head = L.dir === 'in' ? 'Допущен' : 'Выход отмечен';
            text = (L.dir === 'in' ? 'Вход в зал «' : 'Выход из зала «') + F.hall(L.hall).short + '». Счётчик «в зале сейчас» обновлён.';
          } else if (L.res === 'note') {
            tone = 'warn'; head = 'Принят с пометкой';
            text = 'Пометка: ' + L.note + '. В счётчик «в зале сейчас» не входит, запись попадёт в журнал.';
          } else if (L.res === 'dup') {
            tone = 'warn'; head = 'Уже отмечен';
            text = 'Гость ' + L.note + ' (' + dirTxt + '). Повторный скан в течение 10 минут не засчитывается.';
          } else {
            tone = 'err'; head = 'Неверный зал';
            text = 'Закрытая сессия «' + (L.sess ? L.sess.title : '') + '» открыта для тарифов: ' + (L.sess ? (ACCESS_LABEL[L.sess.access] || L.sess.access) : '') +
              '. У гостя тариф ' + L.tariff + '. Вход не отмечен: объясните гостю, где его сессия.';
          }
          result = '<div class="scan-result scan-' + tone + ' con-res" id="o5-res"><div class="cr-head">' + icon(tone === 'ok' ? 'check' : 'alert') + '<span>' + head + '</span></div>' +
            '<div class="cr-name">' + esc(L.name) + '</div><div class="cr-text">' + esc(text) + '</div>' +
            '<div class="cr-meta">' + esc(L.tariff) + ' · ' + esc(F.hall(L.hall).short) + ' · ' + L.time + q + '</div></div>';
        }

        const offline = '<button class="con-offline' + (st.offline ? ' is-on' : '') + '" data-act="o5-offline" aria-pressed="' + st.offline + '">' +
          icon('wifi') + '<span class="co-main"><span class="co-t">Нет связи</span>' +
          '<span class="co-s" style="display:block">' + (st.offline ? 'Отметки копятся на устройстве и уйдут, когда связь вернётся.' : 'Включите, чтобы проверить офлайн-очередь без дублей.') + '</span></span>' +
          '<span class="con-sw' + (st.offline ? ' is-on' : '') + '" aria-hidden="true"></span></button>';

        const queued = st.events.filter(e => e.queued && !e.synced);
        const queue = queued.length
          ? '<div class="con-queue"><div class="cq-head"><span>В очереди: ' + queued.length + '</span>' + tag('ждёт связи', 'warn') + '</div>' +
            '<div class="con-log">' + queued.map(e =>
              '<div class="cl-row"><span class="cl-t">' + e.time + '</span><span class="cl-main"><b>' + esc(e.name) + '</b> · ' + (e.dir === 'in' ? 'вход' : 'выход') +
              '<span class="cl-st ' + (e.res === 'ok' ? 'ok' : 'warn') + '">' + (e.res === 'ok' ? 'будет засчитан' : e.res === 'note' ? 'с пометкой: ' + esc(e.note) : 'дубль, при отправке отбросим') + '</span></span></div>').join('') +
            '</div></div>'
          : '';

        const log = st.events.length
          ? '<div class="card" style="padding:4px 16px"><div class="con-log">' + st.events.slice(0, 6).map(e => {
              const tone = e.res === 'ok' ? 'ok' : e.res === 'wrong' ? 'err' : 'warn';
              const lbl = e.res === 'ok' ? (e.dir === 'in' ? 'вход отмечен' : 'выход отмечен') : e.res === 'wrong' ? 'неверный зал' : e.res === 'dup' ? 'уже отмечен' : 'с пометкой';
              return '<div class="cl-row"><span class="cl-t">' + e.time + '</span><span class="cl-main"><b>' + esc(e.name) + '</b> · ' + (e.dir === 'in' ? 'вход' : 'выход') +
                '<span class="cl-st ' + tone + '">' + lbl + (e.queued && !e.synced ? ' · в очереди' : '') + '</span></span></div>';
            }).join('') + '</div></div>'
          : '';

        body = counter + stage +
          '<div class="con-guests">' + guests + '</div>' + result +
          o5sessionRow(hall) + offline + queue +
          (log ? '<div class="con-sub">Журнал устройства</div>' + log : '');
      }

      return '<div class="scr">' +
        D.head({ back: 'O1', eyebrow: 'Команда · ' + esc(F.NOW.time), title: 'Сканер зала', sub: 'Вход и выход из залов', paren: paren('участников предупредили заранее') }) +
        '<div class="con-o5">' + vol + chips + mode + body +
        '<div class="banner info">' + icon('info') + '<div><div class="b-title">Участников предупредили заранее</div>' +
        '<div class="cap">Баннер в приложении до первого входа в зал, запись в ленте, рассылка и объявление у входа.</div></div></div>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host, ctx) {
      const st = D.st('O5');
      const sc = host.querySelector('.scr');
      if (sc && st.scrollTop) sc.scrollTop = st.scrollTop;
      const hallBox = host.querySelector('.con-halls'), hallOn = host.querySelector('.con-halls .chip.on');
      if (hallBox && hallOn) hallBox.scrollLeft = Math.max(0, hallOn.offsetLeft - (hallBox.clientWidth - hallOn.offsetWidth) / 2);
      if (st.justScanned) {
        const r = host.querySelector('#o5-res');
        if (r && r.scrollIntoView) r.scrollIntoView({ block: 'nearest' });
        st.justScanned = false;
      }
    }
  });
  D.action('o5-hall', el => { const st = o5state(); st.hall = el.dataset.arg; st.scrollTop = 0; D.rerender(); });
  D.action('o5-mode', el => { const st = o5state(); st.mode = el.dataset.arg; o5saveScroll(st); D.rerender(); });
  D.action('o5-scan', el => o5scan(el.dataset.arg));
  D.action('o5-offline', () => {
    const st = o5state();
    st.offline = !st.offline;
    let msg;
    if (st.offline) {
      msg = 'Нет связи: отметки копятся на устройстве';
    } else {
      const r = o5sync(st);
      msg = r.sent || r.dups
        ? 'Связь вернулась: отправлено ' + r.sent + ' ' + D.plural(r.sent, ['отметка', 'отметки', 'отметок']) + ', дублей отброшено ' + r.dups
        : 'Связь вернулась, очередь пуста';
    }
    o5saveScroll(st);
    D.rerender();
    D.toast(msg);
  });
})();
