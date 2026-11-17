/* Блок D — записи. Фаза A: D1 «Менторская гостиная». */
(function () {
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag, avatar } = D;

  function stars(r) {
    let h = '<span class="stars">';
    for (let i = 1; i <= 5; i++) h += icon('star', i <= Math.round(r) ? 'fill' : '');
    return h + '</span>';
  }

  D.register('D1', {
    tab: 'C1',
    meta: {
      title: 'D1 · Менторская гостиная',
      role: 'Гость, запись 1:1',
      fr: ['FR-BOOK-01', 'FR-BOOK-02', 'FR-PROG-03'],
      ac: ['AC-BOOK-05'],
      what: [
        'Выбор ментора карточками: тема, рейтинг, число проведённых бесед.',
        'Сетка окон по 30 минут в менторских столах Магнолии со статусами «свободно/занято».',
        'Итоговая карточка выбранного окна и кнопка бронирования.',
        'После брони — подтверждение с деталями и переходом к подтверждению записи.'
      ],
      rules: [
        'Окна по 30 минут, шаг сетки — из фикстур; занятость — детерминированная демо-раскладка.',
        'Запись мгновенная при свободном окне; пересечения с подтверждёнными событиями блокируются.',
        'Запись на менторские и экспертные гостиные закрыта для Оптимума — доступна Бизнесу и Первому классу (параметр).'
      ],
      depends: ['D-07', 'D-26']
    },
    html(ctx) {
      const st = ctx.state;
      const sel = st.sel || {};
      const mentorId = sel.mentor || null;
      const booked = st.booked || null;
      const mentorSpaces = F.MEETING_SPACES.find(s => s.id === 'ms-mentor');
      const optClosed = F.ME.tariff === 'Оптимум';

      /* менторские — только через спикеров: у каждого свои окна по дням и столам */
      const mentorCards = F.MENTORS.map(m => {
        const wins = F.mentorWindows(m.id);
        const winRows = wins.map((w, i) =>
          '<button class="chip' + (sel.mentor === m.id && sel.win === i ? ' on' : '') + '" data-act="d1-win" data-arg="' + m.id + ':' + i + '"' + (optClosed ? ' disabled' : '') + '>' +
          esc(w.day) + ' ' + esc(w.time) + ' · ст.' + w.table + '</button>').join('');
        return '<div class="card' + (sel.mentor === m.id ? ' accent-edge' : '') + '" style="padding:12px 14px">' +
          '<div class="card-row" data-go="C5/' + m.id + '" style="cursor:pointer">' + avatar(m.name, 'sm') +
          '<div class="grow"><div class="card-title" style="font-size:14px">' + esc(m.name) + '</div>' +
          '<div class="card-sub">' + esc(m.topic) + ' · ' + esc(F.hall('magnolia').name) + '</div></div>' +
          '<span class="rating-line">' + stars(m.rating) + '</span>' + icon('chevR') + '</div>' +
          '<div class="cap" style="margin:8px 0 6px">' + m.done + ' ' + D.plural(m.done, ['беседа', 'беседы', 'бесед']) + ' · ' + wins.length + ' ' + D.plural(wins.length, ['окно', 'окна', 'окон']) + '</div>' +
          '<div class="chips" style="flex-wrap:wrap">' + winRows + '</div></div>';
      }).join('');

      let confirm;
      if (booked) {
        const m = F.mentor(booked.mentor);
        const w = F.mentorWindows(booked.mentor)[booked.win] || {};
        confirm = '<div class="banner ok">' + icon('check') + '<div style="flex:1">' +
          '<div class="b-title">Окно забронировано</div>' +
          '<div class="cap">' + esc(m.name) + ' · ' + esc(w.day || '') + ' ' + esc(w.time || '') + ' · стол ' + (w.table || '') + ' · ' + esc(mentorSpaces.place) + '</div>' +
          '</div></div>' +
          '<div class="card"><div class="cap">Детали записи</div>' +
          '<div class="row" style="padding:8px 0"><div class="grow"><div class="r-title" style="font-size:14px">Менторская встреча · 30 минут</div>' +
          '<div class="r-sub">' + esc(F.NOW.dateLong) + ' · ' + esc(w.day || '') + ' ' + esc(w.time || '') + '–' + esc(F.fmtTime((parseInt((w.time || '0:00').slice(0, 2)) * 60 + parseInt((w.time || '0:00').slice(3)) + 30) || '')) + '</div></div>' + icon('pin') + '</div>' +
          '<div style="display:flex;gap:8px;margin-top:6px">' +
          '<button class="btn btn-secondary btn-sm" data-go="D2">Подтверждение</button>' +
          '<button class="btn btn-ghost btn-sm" data-go="C1">К программе</button></div></div>';
      } else {
        const ready = sel.mentor != null && sel.win != null && !optClosed;
        const m = ready ? F.mentor(sel.mentor) : null;
        const w = ready ? F.mentorWindows(sel.mentor)[sel.win] : null;
        confirm = '<div class="card"><div class="cap">Выбранное окно</div>' +
          '<div class="card-title" style="font-size:16px">' + (ready ? esc(m.name) + ' · ' + esc(w.day) + ' ' + esc(w.time) + ' · ст.' + w.table : 'пока не выбрано') + '</div>' +
          '<button class="btn btn-primary btn-block" data-act="d1-book"' + (ready ? '' : ' disabled') + '>Забронировать окно</button>' +
          '<div class="cap" style="text-align:center">' + (optClosed ? 'запись закрыта для вашего тарифа — доступна Бизнесу и Первому классу' : (ready ? 'удерживается 2 минуты после выбора' : 'выберите ментора и окно выше')) + '</div></div>';
      }

      return '<div class="scr">' +
        D.head({eyebrow:'Запись 1:1 · 30 минут', title:'Программа', sub:'менторские · ' + esc(mentorSpaces.place) + ' · столы 1–8', paren:paren('беседа один на один с ментором фестиваля')}) +
        D.segbar([['C1', 'Список'], ['C7', 'Сетка'], ['D1', 'Менторские'], ['C4', 'Мой день']], 'D1') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        (optClosed ? '<div class="banner warn">' + icon('lock') + '<div><div class="b-title">Запись закрыта для Оптимума</div><div class="cap">Менторские и экспертные гостиные доступны тарифам Бизнес и Первый класс.</div></div></div>' : '') +
        '<div><div class="sec-title" style="margin-top:0">Менторы · ' + F.MENTORS.length + '</div><div style="display:flex;flex-direction:column;gap:10px">' + mentorCards + '</div></div>' +
        confirm +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('d1-mentor', el => { const s = D.st('D1'); s.sel = s.sel || {}; s.sel.mentor = el.dataset.arg; D.rerender(); });
  D.action('d1-win', el => {
    const [m, i] = el.dataset.arg.split(':');
    const s = D.st('D1'); s.sel = s.sel || {};
    s.sel.mentor = m; s.sel.win = parseInt(i, 10);
    D.rerender();
  });
  D.action('d1-book', () => {
    const s = D.st('D1');
    s.booked = { mentor: (s.sel && s.sel.mentor) || 'm1', win: s.sel ? s.sel.win : 0 };
    /* запоминаем последнюю запись для D2 */
    const bk = D.st('_book');
    bk.last = { kind: 'mentor', mentor: s.booked.mentor, win: s.booked.win };
    D.toast('Окно забронировано');
    D.rerender();
  });

  /* ---------- D2 Подтверждение записи ---------- */
  D.register('D2', {
    tab: 'C1',
    meta: {
      title: 'D2 · Подтверждение записи',
      role: 'Гость, запись',
      fr: ['FR-BOOK-02', 'FR-BOOK-04', 'FR-BOOK-08'],
      ac: ['AC-BOOK-02'],
      what: [
        'Лист подтверждения записи: что, когда, где, с кем.',
        'После подтверждения — состояние «Вы записаны» с напоминаниями и сроком отмены.',
        'Кнопки «В календарь» и «Отменить запись».'
      ],
      rules: [
        'Запись атомарная: место закрепляется сразу, подтверждение мгновенное.',
        'Напоминания за 60 и 10 минут до начала; при переносе — адресное сообщение.',
        'Отмена записи возможна до срока (по умолчанию за 2 часа до начала).'
      ],
      depends: ['D-07']
    },
    html(ctx) {
      const st = ctx.state;
      const bk = D.st('_book');
      const last = bk.last || null;
      const confirmed = !!st.confirmed;

      let title, sub, rows, reminders;
      if (last && last.kind === 'mentor') {
        const m = F.mentor(last.mentor), wins = F.spaceWindows('ms-mentor'), w = wins[last.win];
        title = 'Менторская гостиная · 30 минут';
        sub = esc(m.name) + ' · ' + esc(w.label) + '–' + esc(F.fmtTime(w.t + 30)) + ' · ' + esc(F.hall('magnolia').name);
        rows = [['Ментор', m.name + ' — ' + m.topic], ['Стол', 'Менторский стол · Магнолия, 9-й этаж'], ['Дата', F.NOW.dateLong + ' · ' + w.label + '–' + F.fmtTime(w.t + 30)]];
        reminders = ['за 60 минут', 'за 10 минут'];
      } else {
        const s = F.session('s2704');
        const h = F.hall(s.hall);
        title = s.title;
        sub = esc(s.time) + '–' + esc(F.fmtTime(parseInt(s.time.slice(0,2))*60+parseInt(s.time.slice(3))+s.dur)) + ' · ' + esc(h.name) + ' · ' + esc(s.format);
        rows = [['Зал', h.name + ' — ' + h.place], ['Дата', F.NOW.dateLong], ['Мест', String(s.left) + ' из ' + s.cap]];
        reminders = ['за 60 минут', 'за 10 минут'];
      }

      const row = (k, v) => '<div class="tk-row"><span class="k">' + k + '</span><span>' + v + '</span></div>';

      return '<div class="scr">' +
        D.head({back:'D1', eyebrow:(confirmed ? 'Запись' : 'Подтверждение'), title:(confirmed ? 'Вы записаны' : 'Проверьте запись'), sub:sub}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        (confirmed
          ? '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Место подтверждено</div>' +
            '<div class="cap">Напомним ' + reminders.join(' и ') + ' до начала. Отмена — до ' + esc(cancelDeadline()) + '.</div></div></div>' +
            '<div class="card"><div class="cap" style="margin-bottom:6px">Ваша запись</div>' +
            '<div class="card-title" style="font-size:15px">' + esc(title) + '</div>' + rows.map(r => '<div class="cap" style="margin-top:4px"><b>' + esc(r[0]) + ':</b> ' + esc(r[1]) + '</div>').join('') + '</div>' +
            '<div class="grid-2">' +
            '<button class="btn btn-secondary" data-act="d2-cal">' + icon('calendar') + 'В календарь</button>' +
            '<button class="btn btn-ghost" data-act="d2-cancel">Отменить запись</button></div>'
          : '<div class="card"><div class="cap" style="margin-bottom:6px">Детали записи</div>' +
            '<div class="card-title" style="font-size:16px">' + esc(title) + '</div>' +
            '<div class="card-sub" style="margin-bottom:6px">' + sub + '</div>' +
            rows.map(r => '<div style="display:flex;justify-content:space-between;font-size:13px;padding:5px 0;border-bottom:1px solid var(--line)"><span class="cap">' + esc(r[0]) + '</span><span style="font-weight:600;text-align:right">' + esc(r[1]) + '</span></div>').join('') +
            '</div>' +
            '<div class="banner">' + icon('bell') + '<div class="cap">Напомним ' + reminders.join(' и ') + '. Место закреплено за вами.</div></div>' +
            '<button class="btn btn-primary btn-block" data-act="d2-confirm">Подтвердить запись</button>' +
            '<button class="btn btn-ghost btn-block" data-go="D1">Изменить выбор</button>') +
        paren('отмена записи возможна до начала минус 2 часа') +
        '<div style="height:16px"></div></div></div>';
    }
  });
  function cancelDeadline() {
    /* параметр: отмена за 2 часа до начала; для демо — ближайшее событие 11:35 */
    return '09:35';
  }
  D.action('d2-confirm', () => {
    D.st('D2').confirmed = true;
    D.toast('Запись подтверждена');
    D.rerender();
  });
  D.action('d2-cal', () => D.toast('Файл календаря добавлен'));
  D.action('d2-cancel', () => {
    const bk = D.st('_book');
    if (bk.last && bk.last.kind === 'mentor') {
      const s = D.st('D1'); s.booked = null;
    }
    D.st('D2').confirmed = false;
    D.toast('Запись отменена');
    D.rerender();
  });

  /* ---------- D4 Недоступно по тарифу ---------- */
  D.register('D4', {
    tab: 'C1',
    meta: {
      title: 'D4 · Недоступно по тарифу',
      role: 'Гость, тариф Оптимум (демо-вид)',
      fr: ['FR-BOOK-01', 'FR-PROG-03'],
      ac: ['AC-BOOK-05', 'AC-PROG-03'],
      what: [
        'Карточка события, закрытого для тарифа Оптимум: формат, время, зал.',
        'Пояснение: «Доступно тарифам Бизнес и Первый класс» без давления.',
        'Кнопка «Написать организатору» — переход в Telegram.'
      ],
      rules: [
        'Сессии «Бизнес и Первый класс» видны всем тарифам с пометкой (D-07), запись — по тарифу.',
        'Запись на менторские и экспертные гостиные закрыта для Оптимума — доступна Бизнесу и Первому классу (D-26).',
        'Экран не блокирует и не стыдит: доступно объяснение и связь с организатором.'
      ],
      depends: ['тарифная сетка', 'D-07', 'D-26']
    },
    html(ctx) {
      const s = F.session('s2707'); // Бизнес-разбор, доступ biz_fc
      const h = F.hall(s.hall);
      const toMin = t => parseInt(t.slice(0, 2)) * 60 + parseInt(t.slice(3));
      const end = F.fmtTime(toMin(s.time) + s.dur);
      return '<div class="scr">' +
        D.head({back:'C1', eyebrow:esc(F.NOW.dateLong) + ' · вид тарифа Оптимум', title:esc(s.title), sub:esc(s.time) + '–' + esc(end) + ' · ' + esc(h.name) + ' · ' + esc(s.format), actions:'<span class="hb-badge">Оптимум</span>', paren:paren('демо-вид: как экран выглядит у гостя тарифа Оптимум')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card"><div class="sess-meta">' + tag(s.format, 'accent') + tag(s.track) + (s.changed ? '<span class="mark-changed">' + icon('refresh') + 'изменено</span>' : '') + '</div>' +
        '<div style="font-size:14px;line-height:1.55;margin-top:6px">' + esc(s.desc) + '</div></div>' +
        '<div class="banner warn">' + icon('lock') + '<div><div class="b-title">Доступно тарифам Бизнес и Первый класс</div>' +
        '<div class="cap">Ваш тариф — Оптимум. Запись на этот формат откроется с тарифом Бизнес или Первым классом. Программа и карточка видны всем.</div></div></div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Если хотите попасть — организатор может предложить вариант: свободные места на общих сессиях дня и открытые окна встреч.</div></div>' +
        '<div style="display:flex;flex-direction:column;gap:10px">' +
        '<button class="btn btn-primary btn-block" data-act="d4-tg">' + icon('send') + 'Написать организатору</button>' +
        '<button class="btn btn-secondary btn-block" data-go="C1">К программе дня</button></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('d4-tg', () => {
    D.openSheet('<div class="sheet-title">Организатору</div>' +
      '<div class="cap" style="margin-bottom:10px">Сообщение уйдёт в Telegram организатора фестиваля</div>' +
      '<div class="card"><div style="font-size:13.5px">Здравствуйте! Хочу попасть на «Бизнес-разбор: заявка есть, сделки нет» — подскажите варианты с тарифом Оптимум.</div></div>' +
      '<button class="btn btn-primary btn-block" data-act="sheet-close">Скопировать текст</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Закрыть</button>');
    D.toast('В демо переход в Telegram не выполняется');
  });

  /* ---------- D3 Лист ожидания ---------- */
  D.register('D3', {
    tab: 'C4',
    meta: {
      title: 'D3 · Лист ожидания',
      role: 'Гость, запись на сессию',
      fr: ['FR-BOOK-03'],
      ac: ['AC-BOOK-03'],
      what: [
        'Позиция в листе ожидания: «3-е место из N», сессия и время.',
        'Автоматическое продвижение и срок подтверждения — 15 минут.',
        'Что произойдёт при освобождении места и кнопка выхода из листа.'
      ],
      rules: [
        'Место из листа ожидания подтверждается за 15 минут, иначе переходит к следующему.',
        'Продвижение автоматическое: уведомление приходит на основной канал.',
        'Одна заявка в листе на человека; повторная — после подтверждения или выхода.'
      ],
      depends: ['D-07', 'каналы уведомлений']
    },
    html(ctx) {
      const w = F.WAITLIST;
      return '<div class="scr">' +
        D.head({back:'C3/' + w.session, eyebrow:'Лист ожидания', title:'Вы в очереди', sub:esc(w.hall) + ' · ' + esc(w.was), paren:paren('место подтвердится автоматически')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card accent-edge" style="text-align:center;padding:26px 16px">' +
        '<div class="cap">ваша позиция</div>' +
        '<div style="font-family:var(--font-display);font-size:64px;line-height:1;color:var(--accent-display)">' + w.pos + '</div>' +
        '<div class="cap" style="margin-top:6px">из ожидающих · ' + esc(w.title) + '</div></div>' +
        '<div class="banner info">' + icon('clock') + '<div style="flex:1"><div class="b-title">Как это работает</div>' +
        '<div class="cap">Освободится место — система предложит его вам первой. У вас будет ' + w.confirmMin + ' ' + D.plural(w.confirmMin, ['минута', 'минуты', 'минут']) + ' на подтверждение, затем предложение уйдёт дальше.</div></div></div>' +
        '<div class="card"><div class="row"><div class="grow"><div class="r-title">' + esc(w.title) + '</div>' +
        '<div class="r-sub">' + esc(w.hall) + ' · ' + esc(w.was) + ' · запрошено сегодня</div></div>' +
        '<button class="btn btn-ghost btn-sm" data-go="C3/' + w.session + '">Карточка</button></div></div>' +
        '<button class="btn btn-ghost btn-block" data-act="d3-leave">Выйти из листа ожидания</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('d3-leave', () => { D.toast('Вы вышли из листа ожидания'); setTimeout(() => { location.hash = '#/C3/s2711'; }, 600); });

  /* ---------- D5 Мои записи ---------- */
  D.register('D5', {
    tab: 'C4',
    meta: {
      title: 'D5 · Мои записи',
      role: 'Гость, записи на сессии',
      fr: ['FR-BOOK-04'],
      ac: ['AC-BOOK-04'],
      what: [
        'Все записи на демо-день с временем, залом и форматом.',
        'У каждой записи — срок отмены и кнопка «Отменить».',
        'Записи в программе отмечены и ведут в карточку сессии.'
      ],
      rules: [
        'Отмена возможна за 2 часа до начала; позже — только через организатора.',
        'Отмена освобождает место для листа ожидания и снимает напоминания.',
        'Записи на менторские окна показываются в отдельном блоке.'
      ],
      depends: ['D-07']
    },
    html(ctx) {
      const st = ctx.state;
      st.removed = st.removed || {};
      const rows = F.MY_DAY.map(d => {
        const s = F.session(d.session);
        if (!s) return '';
        const h = F.hall(s.hall);
        const mins = parseInt(s.time.slice(0,2)) * 60 + parseInt(s.time.slice(3)) - 120;
        return '<div class="row"><div class="grow"><div class="r-title">' + esc(s.title) + '</div>' +
          '<div class="r-sub">' + esc(s.time) + ' · ' + esc(h.name) + ' · ' + esc(s.format) + '</div>' +
          '<div class="cap" style="margin-top:2px">отмена до ' + esc(F.fmtTime(mins < 0 ? 0 : mins)) + ' · ' + esc(d.note) + '</div></div>' +
          '<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">' +
          '<button class="btn btn-ghost btn-sm" data-go="C3/' + s.id + '">Открыть</button>' +
          '<button class="btn btn-ghost btn-sm" data-act="d5-cancel" data-arg="' + s.id + '">Отменить</button></div></div>';
      }).join('');
      return '<div class="scr">' +
        D.head({back:'B1', eyebrow:'Программа', title:'Мои записи', sub:esc(F.NOW.dateLong) + ' · ' + F.MY_DAY.length + ' ' + D.plural(F.MY_DAY.length, ['событие', 'события', 'событий']), paren:paren('отмена за 2 часа до начала')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="card" style="padding:2px 16px"><div class="list">' + rows + '</div></div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Отменённое место сразу уходит в лист ожидания — система предложит его первым в очереди.</div></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('d5-cancel', el => { const st = D.st('D5'); st.removed = st.removed || {}; st.removed[el.dataset.arg] = true; D.toast('Запись отменена, место ушло в лист ожидания'); D.rerender(); });

  /* ---------- D6 Освободилось место ---------- */
  D.register('D6', {
    tab: 'C4',
    meta: {
      title: 'D6 · Освободилось место',
      role: 'Гость, лист ожидания',
      fr: ['FR-BOOK-03'],
      ac: ['AC-BOOK-03'],
      what: [
        'Уведомление об освобождении места и кнопка подтверждения.',
        'Обратный отсчёт срока подтверждения — 15 минут.',
        'Карточка сессии, для которой предложено место.'
      ],
      rules: [
        'Подтверждение обязательно в течение 15 минут, иначе место уйдёт следующему в очереди.',
        'Уведомление приходит на основной канал и дублируется в приложении.',
        'Одно активное предложение на человека одновременно.'
      ],
      depends: ['D-07', 'каналы уведомлений']
    },
    html(ctx) {
      const st = ctx.state;
      st.deadline = st.deadline || 900;
      const s = F.session(F.FREED_SEAT.session);
      return '<div class="scr">' +
        D.head({back:'C3/' + F.FREED_SEAT.session, eyebrow:'Лист ожидания', title:'Место для вас', sub:esc(F.FREED_SEAT.hall) + ' · ' + esc(F.FREED_SEAT.time), paren:paren('подтвердите, пока место за вами')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="banner ok">' + icon('check') + '<div style="flex:1"><div class="b-title">Освободилось место</div>' +
        '<div class="cap">«' + esc(F.FREED_SEAT.title) + '» · ' + esc(F.FREED_SEAT.time) + ' · ' + esc(F.FREED_SEAT.hall) + '</div></div></div>' +
        '<div class="card" style="text-align:center;padding:20px 16px"><div class="cap">на подтверждение осталось</div>' +
        '<div style="font-family:var(--font-display);font-size:44px;color:var(--warn)">' + Math.floor(st.deadline / 60) + ':' + String(st.deadline % 60).padStart(2, '0') + '</div>' +
        '<div class="cap" style="margin-top:4px">' + F.WAITLIST.pos + ' ' + D.plural(F.WAITLIST.pos, ['место', 'места', 'мест']) + ' в очереди · предложение ваше</div></div>' +
        '<button class="btn btn-primary btn-block" data-act="d6-confirm">Подтвердить запись</button>' +
        '<button class="btn btn-ghost btn-block" data-act="d6-decline">Отказаться</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('d6-confirm', () => { D.toast('Вы записаны на сессию'); setTimeout(() => { location.hash = '#/D2'; }, 600); });
  D.action('d6-decline', () => { D.toast('Место передано следующему в очереди'); setTimeout(() => { location.hash = '#/C3/s2707'; }, 600); });
})();
