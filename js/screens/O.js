/* Блок O — команда и допуск. Фаза B: O1 «Сканер допуска». */
(function () {
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag } = D;

  /* ---------- O1 Сканер допуска (команда) ---------- */
  D.register('O1', {
    tab: 'MORE',
    meta: {
      title: 'O1 · Допуск',
      role: 'Команда площадки',
      fr: ['FR-ACC-01', 'FR-ACC-02'],
      ac: ['AC-ACC-01'],
      what: [
        'Сканер бейджа гостя с тремя исходами: в списке, нет в списке, уже отмечен.',
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
        D.head({back:'P1', eyebrow:'Команда · ' + esc(F.NOW.time), title:'Допуск', sub:'Скан бейджа на входе', paren:paren('три исхода: список, отказ, повтор')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="scan-stage">' +
        '<div class="scan-frame"><span class="c"></span><div class="scan-line"></div></div>' +
        '<div class="scan-hint">Наведите камеру на QR-код бейджа</div>' +
        '</div>' +
        '<div class="chips">' + chips + '</div>' +
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
  D.action('o1-scan', el => { D.st('O1').scan = el.dataset.arg; D.toast('Демо: исход «' + el.textContent.trim() + '»'); D.rerender(); });

  /* ---------- O2 Поиск гостя ---------- */
  D.register('O2', {
    tab: 'MORE',
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
  D.action('o2-find', () => { D.st('O2').found = true; D.toast('Гость найден: ' + F.DESK_GUEST.name); D.rerender(); });
  D.action('o2-issued', () => D.toast('Код выдан и продиктован гостю'));

  /* ---------- O3 Закрытая сессия ---------- */
  D.register('O3', {
    tab: 'MORE',
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
      const closed = F.SESSIONS.filter(s => s.access && s.access !== 'all').slice(0, 5);
      const rows = closed.map(s => {
        const h = F.hall(s.hall);
        const pct = Math.round((s.cap - (s.left || 0)) / s.cap * 100);
        return '<div class="row"><div class="grow"><div class="r-title" style="font-size:14px">' + esc(s.title) + '</div>' +
          '<div class="r-sub">' + esc(s.time) + ' · ' + esc(h.name) + ' · ' + esc(s.access) + '</div>' +
          '<div class="progress" style="margin-top:6px"><i style="width:' + pct + '%"></i></div></div>' +
          '<div style="text-align:right"><div style="font-size:13px;font-weight:600">' + (s.cap - (s.left || 0)) + '/' + s.cap + '</div>' +
          '<div class="cap">вошло</div></div></div>';
      }).join('');
      return '<div class="scr">' +
        D.head({back:'O1', eyebrow:'Контроль зала', title:'Закрытые сессии', sub:closed.length + ' сессий с ограниченным входом', paren:paren('вход по записи или тарифу')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="card" style="padding:2px 16px"><div class="list">' + rows + '</div></div>' +
        '<button class="btn btn-primary btn-block" data-go="O1">Сканировать гостя</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });

  /* ---------- O4 Статистика допуска ---------- */
  D.register('O4', {
    tab: 'MORE',
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
        '<div class="vbar-lbl">' + esc(x.day.slice(3)) + (x.future ? ' · план' : '') + '</div></div>').join('');
      const hallRows = d.halls.map(h => {
        const pct = Math.round(h.v / 890 * 100);
        return '<div class="funnel-row"><span class="fr-label">' + esc(h.name) + '</span><span class="fr-bar"><i style="width:' + pct + '%"></i></span><span class="fr-val">' + h.v + '</span></div>';
      }).join('');
      return '<div class="scr">' +
        D.head({back:'O1', eyebrow:'Аналитика', title:'Допуск', sub:'по дням и точкам входа', paren:paren('обновляется по мере сканирования')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="stat-tiles four">' + d.days.filter(x => !x.future).map(x =>
          '<div class="stat-tile"><span class="num">' + x.entered + '</span><span class="lbl">' + esc(x.day) + ' · из ' + x.expected + '</span></div>').join('') + '</div>' +
        '<div class="card"><div class="cap" style="margin-bottom:8px">Вошло по дням</div><div class="vbars">' + bars + '</div></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:10px">По точкам входа · сегодня</div>' + hallRows + '</div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
})();
