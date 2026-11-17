/* Блок G — встречи. Фаза B: G1, G2, G3, G4, G8, G9, G10. */
(function () {
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag, avatar } = D;

  const HOLD_MS = 120000; // удержание окна — параметр 120 секунд
  const toMin = t => parseInt(t.slice(0, 2)) * 60 + parseInt(t.slice(3));

  function ringSVG(frac) {
    const r = 26, c = 2 * Math.PI * r;
    return '<span class="ring"><svg width="64" height="64" viewBox="0 0 64 64">' +
      '<circle class="ring-bg" cx="32" cy="32" r="' + r + '" fill="none" stroke-width="5"/>' +
      '<circle class="ring-fg" cx="32" cy="32" r="' + r + '" fill="none" stroke-width="5" stroke-dasharray="' + c + '" stroke-dashoffset="' + (c * (1 - frac)).toFixed(1) + '"/>' +
      '</svg><span class="ring-num" data-ring-num></span></span>';
  }

  /* подпись свободных мест в окне: комнаты/столы — «свободно N из M», занято — «все заняты» */
  function winLabel(w, mine) {
    const total = w.units || w.cap;
    if (mine) return 'удержано · свободно ' + w.freeUnits + ' из ' + total;
    if (w.status === 'taken' || w.freeUnits <= 0) return 'все заняты';
    return 'свободно ' + w.freeUnits + ' из ' + total;
  }

  /* ---------- G1 Хаб встреч ---------- */
  D.register('G1', {
    tab: 'F1',
    meta: {
      title: 'G1 · Встречи',
      role: 'Гость / участник',
      fr: ['FR-MEET-01', 'FR-MEET-04', 'FR-MEET-05'],
      ac: ['AC-MEET-01'],
      what: [
        'Точка входа в встречи: мои встречи дня, входящие и исходящие заявки.',
        'Кнопки «Найти окно» и «Встречи сегодня» ведут в выбор окна и хаб пространства.',
        'Счётчики квот: входящих в день и исходящих ожидающих.'
      ],
      rules: [
        'Входящих заявок в день не более 4, исходящих ожидающих — не более 5.',
        'Встречи только внутри окон дня; время встречи — 30 минут.',
        'Мягкий конфликт встреч — предупреждение о запасе времени на переход.'
      ],
      depends: ['D-07', 'матрица переездов']
    },
    html(ctx) {
      const mine = F.MY_MEETINGS;
      const incoming = F.INCOMING_REQS.filter(r => r.status === 'new').length;
      const outgoing = F.OUTGOING_REQS.filter(r => r.status === 'pending').length;
      const meetRows = mine.map(m =>
        '<div class="row" data-go="G4"><div class="grow"><div class="r-title" style="font-size:14px">' + esc(m.with_) + '</div>' +
        '<div class="r-sub">' + esc(m.time) + ' · ' + esc(m.space) + '</div></div>' +
        '<span class="mc-status ' + (m.status === 'confirmed' ? 'ok' : 'wait') + '">' + (m.status === 'confirmed' ? 'подтверждена' : 'ждёт') + '</span>' + icon('chevR') + '</div>').join('');
      return '<div class="scr">' +
        D.head({eyebrow:esc(F.NOW.dateLong), title:'Встречи', sub:'Окна, заявки, договорённости',
          actions:'<button class="icon-btn" data-go="G2" aria-label="Выбрать окно">' + icon('route') + '</button>' +
          '<button class="icon-btn" data-go="F7" aria-label="Визитка">' + icon('qr') + '</button>' +
          '<button class="icon-btn" data-go="F4" aria-label="Заявки">' + icon('inbox') + '<span class="ibadge">' + F.INCOMING_REQS.filter(r => r.status === 'new').length + '</span></button>',
          paren:paren('окна по 30 минут · 11:30–17:30')}) +
        D.segbar([['F1', 'Участники'], ['F9', 'Спикеры'], ['G1', 'Встречи']], 'G1') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="card" style="flex-direction:row;gap:10px">' +
        '<div class="kpi-cell"><div class="k">Встречи</div><div class="v">' + mine.length + '</div></div>' +
        '<div class="kpi-cell"><div class="k">Входящие</div><div class="v">' + incoming + '</div></div>' +
        '<div class="kpi-cell"><div class="k">Ожидают</div><div class="v">' + outgoing + '</div></div></div>' +
        '<div class="sec-title" style="margin-top:4px">Мои встречи<button class="more" data-go="G2">Новое окно</button></div>' +
        '<div class="card" style="padding:2px 16px"><div class="list">' + (meetRows || '<div class="empty"><div class="e-title">Встреч нет</div><div class="e-text">Выберите окно — и отправьте заявку.</div></div>') + '</div></div>' +
        '<div class="sec-title">Быстро</div>' +
        '<div class="grid-2">' +
        '<button class="card interactive" data-go="G2"><div class="card-row">' + icon('clock') + '<b style="font-size:14px">Окна встреч</b></div><div class="cap">свободное время и места</div></button>' +
        '<button class="card interactive" data-go="F4"><div class="card-row">' + icon('bell') + '<b style="font-size:14px">Заявки</b></div><div class="cap">' + incoming + ' новых входящих</div></button>' +
        '<button class="card interactive" data-go="G10"><div class="card-row">' + icon('star') + '<b style="font-size:14px">Приглашённый покупатель</b></div><div class="cap"> Hosted Buyer: обязательство 20 встреч</div></button>' +
        '<button class="card interactive" data-go="G9"><div class="card-row">' + icon('check') + '<b style="font-size:14px">Договорённости</b></div><div class="cap">что договорились после встреч</div></button>' +
        '</div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });

  /* ---------- G2 Выбор окна ---------- */
  D.register('G2', {
    tab: 'F1',
    meta: {
      title: 'G2 · Выбор окна',
      role: 'Гость / участник встречи',
      fr: ['FR-MEET-01', 'FR-MEET-02', 'FR-MEET-03', 'FR-MEET-09'],
      ac: ['AC-MEET-02', 'AC-MEET-09'],
      what: [
        'Пространства встреч чипами: комнаты сделок, менторские и экспертные столы, стенды, кофе-точка.',
        'Сетка окон по 30 минут со статусами «свободно N из M» и «все заняты».',
        'Выбранное окно удерживается 2 минуты — кольцевой таймер обратного отсчёта.',
        'Кнопка «Отправить заявку на встречу» ведёт к форме заявки.'
      ],
      rules: [
        'Окна по 30 минут в интервале дня; занятость — демо-раскладка из фикстур.',
        'Удержание выбранного окна — 120 секунд; по истечении окно освобождается.',
        'Лимиты: входящих встреч в день не более 4, исходящих ожидающих — не более 5 (параметры).',
        'Жёсткий конфликт двух подтверждённых встреч невозможен; мягкий — предупреждение о запасе времени на переход.',
        'К покупателю с бейджем Hosted Buyer записывается участник со своим продуктом.'
      ],
      depends: ['D-07', 'D-25', 'параметры MEET', 'матрица переездов']
    },
    html(ctx) {
      const st = ctx.state;
      const personId = (ctx.param && F.person(ctx.param)) ? ctx.param : null;
      const p = personId ? F.person(personId) : null;

      const area = st.area || 'ms-deal';
      const winIdx = st.win != null ? st.win : null;
      const wins = F.spaceWindows(area);
      const space = F.MEETING_SPACES.find(s => s.id === area);
      const held = st.heldUntil && st.heldUntil > Date.now();

      const areaChips = F.MEETING_SPACES.map(s =>
        '<button class="chip' + (s.id === area ? ' on' : '') + '" data-act="g2-area" data-arg="' + s.id + '">' +
        esc(s.name) + ' · ' + esc(s.num) + '</button>').join('');

      const cells = wins.map((w, i) => {
        const taken = w.status === 'taken' || w.freeUnits <= 0;
        const mine = i === winIdx && held;
        const cls = taken ? 'taken' : (mine ? 'mine' : 'free');
        return '<button class="win-cell ' + cls + '" data-act="g2-win" data-arg="' + i + '"' + (taken ? ' disabled' : '') + '>' +
          '<span class="t">' + esc(w.label) + '</span><span class="s">' + esc(winLabel(w, mine)) + '</span></button>';
      }).join('');

      let holdBar = '';
      if (winIdx != null && held) {
        const left = Math.max(0, st.heldUntil - Date.now());
        const frac = left / HOLD_MS;
        const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
        holdBar = '<div class="card" style="border-color:var(--accent-edge)"><div class="ring-wrap">' + ringSVG(frac) +
          '<div><div class="b-title" style="font-size:15px">Окно ' + esc(wins[winIdx].label) + ' удерживается</div>' +
          '<div class="cap">осталось ' + mm + ':' + String(ss).padStart(2, '0') + ' · ' + esc(space.name) + ' · ' + esc(space.place) + '</div>' +
          '<div class="cap" style="margin-top:6px">' + (p ? 'встреча с ' + esc(p.name) + ' · ' + esc(p.company) : 'новая встреча') + '</div></div></div>' +
          '<button class="btn btn-primary btn-block" data-go="G3" style="margin-top:12px">Отправить заявку на встречу</button></div>';
      } else if (winIdx != null) {
        holdBar = '<div class="banner warn">' + icon('clock') + '<div><div class="b-title">Удержание истекло</div><div class="cap">Окно ' + esc(wins[winIdx].label) + ' освобождено — выберите другое.</div></div></div>';
      } else {
        holdBar = '<div class="card"><div class="cap">Выберите свободное окно — оно удержится на 2 минуты, затем отправьте заявку.</div></div>';
      }

      return '<div class="scr">' +
        D.head({back:'G1', eyebrow:(p ? 'встреча с ' + esc(p.name) : 'встречи'), title:'Выбор окна', sub:esc(F.NOW.dateLong) + ' · ' + esc(space.name) + ' · ' + esc(space.place) + ' · до ' + space.cap + ' ' + D.plural(space.cap, ['человека', 'человек', 'человек']), paren:paren('окно удерживается 2 минуты — не откладывайте заявку'), topo:1}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        (p ? '<div class="card" style="flex-direction:row;align-items:center;gap:12px;padding:12px 14px">' + avatar(p.name, 'sm') +
          '<div class="grow"><div class="r-title" style="font-size:14px">' + esc(p.name) + '</div><div class="r-sub">' + esc(p.company) + ' · ' + esc(p.role) + '</div></div>' + tag(p.tariff, 'tariff') + '</div>' : '') +
        '<div class="chips">' + areaChips + '</div>' +
        '<div class="card" style="padding:14px"><div class="win-grid">' + cells + '</div>' +
        '<div class="cap" style="margin-top:10px">' + esc(F.NOW.dateLong) + ' · окна с ' + esc(F.windows[0].label) + ' до ' + esc(F.fmtTime(F.WIN_END)) + ' · шаг 30 минут</div></div>' +
        holdBar +
        '<div class="banner">' + icon('info') + '<div class="cap">Лимиты дня: входящих встреч — не более 4, исходящих ожидающих — не более 5. При занятости предложим другие окна и хостов.</div></div>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      clearInterval(window.__g2timer);
      const tick = () => {
        const st = D.st('G2');
        const el = document.querySelector('.ring-num');
        if (!el) { clearInterval(window.__g2timer); return; }
        if (st.win == null) { clearInterval(window.__g2timer); return; }
        const left = Math.max(0, (st.heldUntil || 0) - Date.now());
        const mm = Math.floor(left / 60000), ss = Math.floor((left % 60000) / 1000);
        el.textContent = mm + ':' + String(ss).padStart(2, '0');
        const fg = document.querySelector('.ring-fg');
        if (fg) {
          const r = 26, c = 2 * Math.PI * r;
          fg.setAttribute('stroke-dashoffset', (c * (1 - left / HOLD_MS)).toFixed(1));
        }
        if (left <= 0) {
          clearInterval(window.__g2timer);
          st.win = null; st.heldUntil = null;
          D.toast('Удержание окна истекло');
          D.rerender();
        }
      };
      tick();
      window.__g2timer = setInterval(tick, 500);
    }
  });
  D.action('g2-area', el => {
    const s = D.st('G2');
    s.area = el.dataset.arg; s.win = null; s.heldUntil = null;
    D.rerender();
  });
  D.action('g2-win', el => {
    const s = D.st('G2');
    const idx = parseInt(el.dataset.arg, 10);
    const wins = F.spaceWindows(s.area || 'ms-deal');
    if (wins[idx].status === 'taken' || wins[idx].freeUnits <= 0) return;
    s.win = idx;
    s.heldUntil = Date.now() + HOLD_MS;
    D.rerender();
  });

  /* ---------- G3 Заявка на встречу ---------- */
  D.register('G3', {
    tab: 'F1',
    meta: {
      title: 'G3 · Заявка на встречу',
      role: 'Гость / участник',
      fr: ['FR-MEET-02', 'FR-MEET-03', 'FR-MEET-04'],
      ac: ['AC-MEET-03'],
      what: [
        'Форма заявки: контекст адресата, выбранные место и окно, участник и причина.',
        'Три предложенных окна из выбранного пространства.',
        'Валидация: без причины отправка недоступна, занятое окно не выбирается.',
        'Квота: видно, сколько окон осталось у адресата.'
      ],
      rules: [
        'Причина обязательна; адресат видит её вместе с целью и пользой.',
        'Окно удерживается 2 минуты; занятие окна происходит при отправке.',
        'Лимит исходящих ожидающих — 5; при превышении — предупреждение.'
      ],
      depends: ['FR-MEET-03 причина', 'параметры MEET']
    },
    html(ctx) {
      const st = ctx.state;
      const g2 = D.st('G2');
      const R = F.MEET_REQ;
      st.reason = st.reason != null ? st.reason : '';
      st.win = st.win != null ? st.win : 1; // по умолчанию среднее предложенное окно
      st.sent = !!st.sent;
      const len = st.reason.length;
      const ok = len >= 10 && len <= 280;
      const winT = R.slots[st.win];

      const winChips = R.slots.map((s, i) =>
        '<button class="chip' + (i === st.win ? ' on' : '') + '" data-act="g3-win" data-arg="' + i + '">' + esc(s) + '</button>').join('');

      if (st.sent) {
        return '<div class="scr">' +
        D.head({back:'G1', eyebrow:'Заявка отправлена', title:'Ждём подтверждения', sub:esc(R.addressee) + ' · ' + esc(R.spaces), paren:paren('окно удержано за вами до ответа')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card"><div class="cap" style="margin-bottom:4px">Детали заявки</div>' +
        '<div class="r-title">' + esc(R.addressee) + ' · ' + esc(R.rep) + '</div>' +
        '<div class="cap" style="margin-top:6px">' + winT + '–' + esc(F.fmtTime(toMin(winT) + 30)) + ' · ' + esc(R.spaces) + '</div>' +
        '<div class="cap" style="margin-top:6px">«' + esc(st.reason) + '»</div></div>' +
        '<div class="banner">' + icon('clock') + '<div class="cap">Подтверждение обычно занимает до 15 минут. Окно удерживается за вами.</div></div>' +
        '<button class="btn btn-primary btn-block" data-go="G1">К встречам</button>' +
        '<div style="height:16px"></div></div></div>';
      }

      return '<div class="scr">' +
        D.head({back:'G2', eyebrow:'Новая встреча', title:'Заявка на встречу', sub:esc(F.NOW.dateLong) + ' · 30 минут', paren:paren('адресат увидит вашу причину и цель')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card"><div class="cap" style="margin-bottom:4px">С кем и где</div>' +
        '<div class="r-title">' + esc(R.addressee) + ' · ' + esc(R.rep) + '</div>' +
        '<div class="cap" style="margin-top:4px">' + esc(R.spaces) + ' · ' + esc(F.NOW.dateLong) + '</div></div>' +
        '<div><div class="cap" style="margin-bottom:6px">Окно · 30 минут</div><div class="chips">' + winChips + '</div></div>' +
        '<div class="banner">' + icon('clock') + '<div class="cap">Выбрано ' + esc(winT) + '–' + esc(F.fmtTime(toMin(winT) + 30)) + '. Окно удерживается до отправки заявки.</div></div>' +
        '<div class="field"><label for="g3-reason">Причина встречи <span class="cap">· обязательно, до 280 знаков</span></label>' +
        '<textarea class="textarea" id="g3-reason" maxlength="280" placeholder="Что хотите обсудить — адресат увидит это вместе с вашей целью">' + esc(st.reason) + '</textarea>' +
        '<div class="counter"><span>' + len + ' / 280</span></div></div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">У ' + esc(R.addressee) + ' сегодня свободно 2 окна из 4 на стенде. Ваша цель и польза видны адресату.</div></div>' +
        '<button class="btn btn-primary btn-block" data-act="g3-send"' + (ok ? '' : ' disabled') + '>Отправить запрос</button>' +
        '<div class="cap" style="text-align:center">' + (ok ? '' : 'заполните причину, чтобы отправить') + '</div>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      const ta = host.querySelector('#g3-reason');
      if (ta) ta.addEventListener('input', () => {
        const st = D.st('G3');
        st.reason = ta.value.slice(0, 280);
        const btn = host.querySelector('.btn-primary');
        if (btn) btn.disabled = !(st.reason.length >= 10 && st.reason.length <= 280);
        const cnt = host.querySelector('.counter');
        if (cnt) cnt.innerHTML = '<span>' + st.reason.length + ' / 280</span>';
      });
    }
  });
  D.action('g3-win', el => { D.st('G3').win = parseInt(el.dataset.arg, 10); D.rerender(); });
  D.action('g3-send', () => {
    D.st('G3').sent = true;
    D.toast('Заявка на встречу отправлена');
    D.rerender();
  });

  /* ---------- G4 Подтверждённая встреча ---------- */
  D.register('G4', {
    tab: 'F1',
    meta: {
      title: 'G4 · Подтверждённая встреча',
      role: 'Участник встречи',
      fr: ['FR-MEET-05', 'FR-MEET-07', 'FR-MEET-08'],
      ac: ['AC-MEET-04'],
      what: [
        'Карточка подтверждённой встречи: оба участника, место, дата и время.',
        'Источник встречи («после подбора», «по заявке», «Hosted Buyer»).',
        'Напоминания за 60, 15 и 5 минут.',
        'Действия: добавить в личное расписание, открыть маршрут, отменить.'
      ],
      rules: [
        'Время и место фиксируются при подтверждении; перенос — только по согласованию.',
        'Напоминания адресные: за 60, 15 и 5 минут до начала.',
        'Отмена подтверждённой встречи освобождает окно и уведомляет вторую сторону.'
      ],
      depends: ['матрица переездов', 'D-09']
    },
    html(ctx) {
      const st = ctx.state;
      const m = F.MY_MEETINGS[0];
      const p = F.person('p03');
      const added = !!st.added;
      return '<div class="scr">' +
        D.head({back:'G1', eyebrow:'Подтверждена · ' + esc(m.time), title:'Встреча', sub:esc(F.NOW.dateLong), paren:paren('источник: после подбора')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="meet-card card"><div class="mc-status ok" style="margin-bottom:8px">подтверждена</div>' +
        '<div class="card-title" style="font-size:17px">' + esc(m.with_) + '</div>' +
        '<div class="sess-meta" style="margin-top:8px">' + tag(m.space.split('·')[0].trim()) + tag('30 минут', 'accent') + tag('по заявке', '') + '</div>' +
        '<div class="card-sub" style="margin-top:8px">' + esc(m.time) + ' · ' + esc(m.space) + ' · ' + esc(F.hall('congress').name) + '</div>' +
        '<div style="display:flex;gap:10px;margin-top:12px;align-items:center">' +
        avatar(F.ME.name || 'Александр', 'sm') + avatar('Марина Крылова', 'sm') +
        '<div class="cap grow" style="overflow-wrap:anywhere">' + esc(F.ME.name || 'Вы') + ' · ' + esc(m.with_) + '</div></div>' +
        '<div class="banner">' + icon('bell') + '<div class="cap">Напомним за 60, 15 и 5 минут. Запас на переход до места — по матрице.</div></div>' +
        '<div class="grid-2">' +
        '<button class="btn ' + (added ? 'btn-secondary' : 'btn-primary') + '" data-act="g4-add">' + icon('calendar') + (added ? 'В программе' : 'В программу') + '</button>' +
        '<button class="btn btn-secondary" data-go="E4">' + icon('route') + 'Маршрут</button></div>' +
        '<button class="btn btn-ghost btn-block" data-act="g4-cancel">Отменить встречу</button>' +
        '</div>' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Перед встречей</div>' +
        '<div class="r-sub">· Придите к ' + esc(m.time.split('–')[0]) + ' — комната откроется за 5 минут</div>' +
        '<div class="r-sub">· QR-код на билете действует как пропуск на встречу</div>' +
        '<div class="r-sub">· После встречи отметьте итог — это займёт минуту</div></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('g4-add', () => {
    const st = D.st('G4');
    st.added = !st.added;
    D.toast(st.added ? 'Встреча добавлена в программу' : 'Встреча убрана из программы');
    D.rerender();
  });
  D.action('g4-cancel', () => {
    D.st('G4').cancelled = true;
    D.toast('Встреча отменена — вторая сторона уведомлена');
    D.rerender();
  });

  /* ---------- G8 Итог встречи ---------- */
  D.register('G8', {
    tab: 'F1',
    meta: {
      title: 'G8 · Итог встречи',
      role: 'Участник после встречи',
      fr: ['FR-MEET-08', 'FR-MEET-09'],
      ac: ['AC-MEET-05'],
      what: [
        'Отметка «я пришёл» и выбор исхода встречи.',
        'Следующий шаг: повторная встреча, материалы, знакомство, созвон или ничего.',
        'Срок договорённости и заметка — сохраняются в профиле встречи.'
      ],
      rules: [
        'Отметка прихода фиксируется по времени начала окна.',
        'Итог и следующий шаг видны второй стороне после сохранения.',
        'Срок — параметр (по умолчанию 3 дня на следующий шаг).'
      ],
      depends: ['FR-MEET-08', 'FR-MEET-09']
    },
    html(ctx) {
      const st = ctx.state;
      const m = F.MY_MEETINGS[1]; // вторая встреча — для разнообразия
      const O = F.MEET_OUTCOME;
      st.arrived = !!st.arrived;
      if (st.outcome === undefined) st.outcome = null;
      if (st.step === undefined) st.step = null;
      st.note = st.note != null ? st.note : '';
      st.saved = !!st.saved;

      if (!st.arrived && !st.saved) {
        return '<div class="scr">' +
        D.head({back:'G1', eyebrow:'Встреча · ' + esc(m.time), title:'Отметьте приход', sub:esc(m.with_) + ' · ' + esc(m.space), paren:paren('отметка фиксирует ваше участие')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card" style="text-align:center;padding:26px 16px">' +
        '<div style="font-family:var(--font-display);font-size:34px">' + esc(m.time) + '</div>' +
        '<div class="cap" style="margin-top:6px">' + esc(m.with_) + '</div></div>' +
        '<button class="btn btn-primary btn-block" data-act="g8-arrive">' + icon('check') + 'Я пришёл на встречу</button>' +
        '<button class="btn btn-ghost btn-block" data-act="g8-noshow">Не смогу прийти</button>' +
        '<div style="height:16px"></div></div></div>';
      }
      if (st.outcome == null) {
        return '<div class="scr">' +
        D.head({back:'G1', eyebrow:esc(m.with_), title:esc(O.q), sub:esc(m.time) + ' · ' + esc(m.space)}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="grid-2">' + O.options.map((o, i) =>
          '<button class="card interactive" data-act="g8-outcome" data-arg="' + i + '"><div style="font-weight:600;font-size:14.5px;text-align:center">' + esc(o) + '</div></button>').join('') + '</div>' +
        '<div style="height:16px"></div></div></div>';
      }
      if (st.step == null) {
        return '<div class="scr">' +
        D.head({backAct:'g8-back', eyebrow:'Следующий шаг', title:'Что дальше?', sub:'Срок: ' + O.dueInDays + ' ' + D.plural(O.dueInDays, ['день', 'дня', 'дней']) + ' на выполнение'}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:10px">' +
        O.nextSteps.map((s, i) =>
          '<button class="card interactive" data-act="g8-step" data-arg="' + i + '"><div class="card-row">' + icon('chevR') + '<span style="font-weight:600;font-size:14px">' + esc(s) + '</span></div></button>').join('') +
        '<div style="height:16px"></div></div></div>';
      }
      /* финальная форма */
      return '<div class="scr">' +
        D.head({backAct:'g8-reset', eyebrow:'Итог встречи', title:'Сохранить?', sub:esc(m.with_) + ' · ' + esc(m.time), paren:paren('итог увидит вторая сторона')}) +
        (st.saved ? '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Итог сохранён</div><div class="cap">Вторая сторона увидит его в карточке встречи.</div></div></div>' : '') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card"><div class="r-title" style="font-size:14.5px">' + esc(O.options[st.outcome]) + '</div>' +
        '<div class="cap" style="margin-top:4px">Следующий шаг: ' + esc(O.nextSteps[st.step]) + ' · срок ' + O.dueInDays + ' ' + D.plural(O.dueInDays, ['день', 'дня', 'дней']) + '</div></div>' +
        '<div class="field"><label for="g8-note">Заметка <span class="cap">· необязательно</span></label>' +
        '<textarea class="textarea" id="g8-note" maxlength="280" placeholder="О чём договорились, что прислать, к кому обратиться">' + esc(st.note) + '</textarea>' +
        '<div class="counter"><span>' + st.note.length + ' / 280</span></div></div>' +
        '<button class="btn btn-primary btn-block" data-act="g8-save">Сохранить итог</button>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      const ta = host.querySelector('#g8-note');
      if (ta) ta.addEventListener('input', () => {
        const st = D.st('G8');
        st.note = ta.value.slice(0, 280);
        const cnt = host.querySelector('.counter');
        if (cnt) cnt.innerHTML = '<span>' + st.note.length + ' / 280</span>';
      });
    }
  });
  D.action('g8-arrive', () => {
    const st = D.st('G8');
    st.arrived = true; st.outcome = null; st.step = null;
    D.toast('Отметка прихода сохранена');
    D.rerender();
  });
  D.action('g8-noshow', () => {
    D.st('G8').saved = true; D.st('G8').outcome = 1; D.st('G8').step = 4;
    D.toast('Сообщили второй стороне');
    D.rerender();
  });
  D.action('g8-outcome', el => {
    const st = D.st('G8');
    st.outcome = parseInt(el.dataset.arg, 10);
    D.rerender();
  });
  D.action('g8-step', el => {
    const st = D.st('G8');
    st.step = parseInt(el.dataset.arg, 10);
    D.rerender();
  });
  D.action('g8-back', () => {
    const st = D.st('G8');
    st.step = null;
    D.rerender();
  });
  D.action('g8-reset', () => {
    const st = D.st('G8');
    st.outcome = null; st.step = null;
    D.rerender();
  });
  D.action('g8-save', () => {
    const st = D.st('G8');
    st.saved = true;
    D.toast('Итог встречи сохранён');
    D.rerender();
  });

  /* ---------- G9 Договорённости ---------- */
  D.register('G9', {
    tab: 'F1',
    meta: {
      title: 'G9 · Договорённости',
      role: 'Участник встреч',
      fr: ['FR-MEET-09', 'FR-MEET-10'],
      ac: ['AC-MEET-06'],
      what: [
        'Список договорённостей после встреч с авторством инициатора.',
        'Статусы: ждёт подтверждения второй стороны, согласовано обеими сторонами.',
        'Действие «Согласовать» переводит статус в «согласовано обеими сторонами».'
      ],
      rules: [
        'Договорённость создаётся по итогу встречи (G8) или вручную.',
        'Статус меняется только согласием обеих сторон — односторонне не закрывается.',
        'Срок выполнения показывается и подсвечивается при приближении.'
      ],
      depends: ['FR-MEET-09']
    },
    html(ctx) {
      const st = ctx.state;
      st.confirmed = !!st.confirmed;
      const O = F.MEET_OUTCOME;
      const who = st.confirmed ? 'согласовано обеими сторонами' : 'ждёт подтверждения';
      return '<div class="scr">' +
        D.head({back:'G1', eyebrow:'После встреч', title:'Договорённости', sub:'Следующие шаги и их статусы', paren:paren('статус меняется согласием обеих сторон')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="meet-card card"><div class="card-title" style="font-size:15px">' + esc(O.nextSteps[1]) + '</div>' +
        '<div class="cap" style="margin-top:4px">Елена Сорока · менторская гостиная · вы инициатор</div>' +
        '<div class="sess-meta" style="margin-top:8px"><span class="mc-status ' + (st.confirmed ? 'ok' : 'wait') + '">' + who + '</span>' +
        tag('срок: ' + O.dueInDays + ' ' + D.plural(O.dueInDays, ['день', 'дня', 'дней']), 'tariff') + '</div>' +
        '<div class="card-foot"><span class="cap">заметка: «пришлю деку до вечера»</span>' +
        (st.confirmed ? '' : '<button class="btn btn-secondary btn-sm" data-act="g9-ok">Согласовать</button>') + '</div></div>' +
        '<div class="meet-card card" style="opacity:.75"><div class="card-title" style="font-size:15px">' + esc(O.nextSteps[2]) + '</div>' +
        '<div class="cap" style="margin-top:4px">Павел Гусев · комната сделок · инициатор — он</div>' +
        '<div class="sess-meta" style="margin-top:8px"><span class="mc-status ' + (st.confirmed2 ? 'ok' : 'wait') + '">' + (st.confirmed2 ? 'согласовано обеими сторонами' : 'ждёт вас') + '</span>' + tag('срок: завтра', 'tariff') + '</div>' +
        '<div class="card-foot">' + (st.confirmed2 ? '<span class="cap">согласовано</span>' : '<button class="btn btn-secondary btn-sm" data-act="g9-ok2">Согласовать</button>') + '</div></div>' +
        '<div class="empty"><div class="e-title">Как это работает</div><div class="e-text">После каждой встречи отметьте итог — договорённость появится здесь со статусом «ждёт подтверждения», пока вторая сторона не согласует.</div></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('g9-ok', () => {
    D.st('G9').confirmed = true;
    D.toast('Договорённость согласована');
    D.rerender();
  });
  D.action('g9-ok2', () => {
    D.st('G9').confirmed2 = true;
    D.toast('Договорённость согласована');
    D.rerender();
  });

  /* ---------- G10 Hosted Buyer ---------- */
  D.register('G10', {
    tab: 'F1',
    meta: {
      title: 'G10 · Приглашённый покупатель',
      role: 'Hosted Buyer',
      fr: ['FR-MEET-07', 'FR-ACC-07'],
      ac: ['AC-MEET-04'],
      what: [
        'Вид приглашённого покупателя: метка, квалификация и цель закупок.',
        'Обязательство по встречам: проведено 8, осталось 12 из 20.',
        'Кто может записаться и как работает автопринятие у экспонентов.'
      ],
      rules: [
        'Приглашённый покупатель берёт обязательство провести 20 встреч за билет (D-25).',
        'Записаться к покупателю может участник со своим продуктом.',
        'Заявки к экспонентам принимаются автоматически; раннее окно записи — параметр, по умолчанию выключено.'
      ],
      depends: ['D-25', 'D-07']
    },
    html(ctx) {
      const st = ctx.state;
      const hb = F.HB;
      return '<div class="scr">' +
        D.head({back:'G1', eyebrow:'Приглашённый покупатель', title:esc(hb.name), sub:esc(hb.company) + ' · ' + esc(hb.role), actions:'<span class="hb-badge">' + esc(hb.badge) + '</span>'}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card"><div class="cap" style="margin-bottom:4px">Ваша квалификация</div>' +
        '<div class="r-title">' + esc(hb.seeks) + '</div>' +
        '<div class="cap" style="margin-top:4px">цель: покупаю · тариф ' + esc(F.ME.tariff) + '</div>' +
        '<div class="cap" style="margin-top:8px">Записаться к вам может участник со своим продуктом.</div></div>' +
        '<div class="card" style="flex-direction:row;gap:10px">' +
        '<div class="kpi-cell"><div class="k">Обязательство</div><div class="v">' + hb.quota.total + '<span class="k"> встреч</span></div></div>' +
        '<div class="kpi-cell"><div class="k">Проведено</div><div class="v">' + hb.quota.done + '<span class="k"> · осталось ' + hb.quota.left + '</span></div></div></div>' +
        '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Автопринятие у экспонентов</div>' +
        '<div class="cap">Ваши заявки на стенды подтверждаются сразу.</div></div></div>' +
        '<div class="sec-title" style="margin-top:4px">Записи на сегодня<button class="more" data-go="H1">Экспоненты</button></div>' +
        '<div class="card" style="padding:2px 16px"><div class="list">' +
        F.MY_MEETINGS.map(m => '<div class="row"><div class="grow"><div class="r-title" style="font-size:14px">' + esc(m.with_) + '</div><div class="r-sub">' + esc(m.time) + ' · ' + esc(m.space) + '</div></div><span class="mc-status ok">ок</span></div>').join('') +
        '</div></div>' +
        '<button class="btn btn-primary btn-block" data-go="G2">Выбрать окно встречи</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });

  /* ---------- G5 Другое время ---------- */
  D.register('G5', {
    tab: 'F1',
    meta: {
      title: 'G5 · Другое время',
      role: 'Гость, встреча',
      fr: ['FR-MEET-03'],
      ac: ['AC-MEET-03'],
      what: [
        'Встречное предложение времени от второй стороны.',
        'Три варианта с местом и пояснением, почему предложены.',
        'Исходное окно и кнопки «Принять вариант» / «Написать своё».'
      ],
      rules: [
        'Встречное предложение живёт 12 часов — срок заявки на встречу.',
        'Каждый вариант проверен на свободное окно и запас на переход.',
        'Принятие варианта сразу создаёт подтверждённую встречу.'
      ],
      depends: ['окна встреч', 'матрица переездов']
    },
    html(ctx) {
      const c = F.COUNTER;
      const opts = c.proposals.map((p, i) =>
        '<button class="card interactive" data-act="g5-pick" data-arg="' + i + '" style="text-align:left;width:100%">' +
        '<div class="card-row"><div><div class="card-title" style="font-size:16px">' + esc(p.time) + '</div>' +
        '<div class="r-sub" style="margin-top:2px">' + esc(p.space) + '</div></div>' + icon('chevR') + '</div>' +
        '<div class="cap" style="margin-top:6px">' + esc(p.note) + '</div></button>').join('');
      return '<div class="scr">' +
        D.head({back:'G1', eyebrow:'Встреча', title:'Другое время', sub:esc(c.orig.who) + ' предлагает варианты', paren:paren('выберите удобный вариант')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="card"><div class="cap" style="margin-bottom:4px">Вы просили</div>' +
        '<div class="r-title">' + esc(c.orig.time) + '</div>' +
        '<div class="r-sub" style="margin-top:2px">' + esc(c.orig.space) + ' · ' + esc(c.orig.who) + '</div></div>' +
        '<div class="sec-title" style="margin-top:0">Варианты</div>' + opts +
        '<button class="btn btn-ghost btn-block" data-act="g5-custom">' + icon('msg') + 'Предложить своё время</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('g5-pick', el => { const p = F.COUNTER.proposals[el.dataset.arg]; D.toast('Встреча подтверждена: ' + p.time); setTimeout(() => { location.hash = '#/G4'; }, 600); });
  D.action('g5-custom', () => D.toast('Откроется выбор своего окна — в демо не выполняется'));

  /* ---------- G6 Напоминание ---------- */
  D.register('G6', {
    tab: 'F1',
    meta: {
      title: 'G6 · Напоминание о встрече',
      role: 'Гость, уведомление',
      fr: ['FR-MEET-06'],
      ac: ['AC-MEET-06'],
      what: [
        'Пуш-напоминание «через 15 минут» с местом и кнопкой «Я опаздываю».',
        'Карточка встречи: с кем, где, запас на переход.',
        'Действия: «Я опаздываю», «Маршрут», «Перенести».'
      ],
      rules: [
        'Напоминания приходят за −60, −15 и −5 минут по каналам из настроек.',
        '«Я опаздываю» уведомляет вторую сторону и оставляет окно за вами.',
        'Маршрут строится от текущей точки по матрице переездов.'
      ],
      depends: ['каналы уведомлений', 'матрица переездов']
    },
    html(ctx) {
      const m = F.MY_MEETINGS[0];
      return '<div class="scr">' +
        D.head({back:'G1', eyebrow:'Напоминание', title:'Через 15 минут', sub:'встреча ждёт вас', paren:paren('окно удерживается за вами')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="banner warn">' + icon('clock') + '<div style="flex:1"><div class="b-title">' + esc(m.with_) + '</div>' +
        '<div class="cap">' + esc(m.time) + ' · ' + esc(m.space) + '</div></div></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Маршрут</div>' +
        '<div class="r-sub">От вашего следующего события — запас ' + (F.travelMin('magnolia','congress') || 9) + ' мин по матрице переездов.</div>' +
        '<button class="btn btn-secondary btn-block" style="margin-top:10px" data-go="E4">' + icon('route') + 'Построить маршрут</button></div>' +
        '<button class="btn btn-primary btn-block" data-act="g6-late">' + icon('alert') + 'Я опаздываю</button>' +
        '<button class="btn btn-ghost btn-block" data-act="g6-move">Перенести встречу</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('g6-late', () => D.toast('Вторая сторона уведомлена — окно за вами ещё 10 минут'));
  D.action('g6-move', () => D.toast('Откроется выбор нового окна'));

  /* ---------- G7 Отметка прихода ---------- */
  D.register('G7', {
    tab: 'F1',
    meta: {
      title: 'G7 · Отметка прихода',
      role: 'Гость, встреча',
      fr: ['FR-MEET-06'],
      ac: ['AC-MEET-06'],
      what: [
        'Сканирование QR пространства встречи — честная заглушка камеры.',
        'Карточка точки: стенд, зона, как отмечается приход.',
        'Кнопка «Я на месте» фиксирует приход без скана (резерв).'
      ],
      rules: [
        'Отметка фиксируется по QR пространства или геозоне стенда — не по скриншоту.',
        'Повторный скан обновляет время, не создаёт дубль.',
        'Без отметки через 15 минут после окна — статус «неявка» в консоли.'
      ],
      depends: ['QR-токены', 'геозоны стендов']
    },
    html(ctx) {
      const cp = F.CHECKIN_POINT;
      return '<div class="scr">' +
        D.head({back:'G1', eyebrow:'Отметка прихода', title:'Я на месте', sub:esc(F.MY_MEETINGS[0].space), paren:paren('покажите QR пространства или подтвердите вручную')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="scan-stage" style="min-height:220px">' +
        '<div class="scan-frame"><i class="c"></i></div><div class="scan-line"></div>' +
        '<div class="scan-hint">Наведите камеру на QR у ' + esc(cp.name) + '</div></div>' +
        '<div class="card"><div class="r-title" style="font-size:15px">' + esc(cp.name) + '</div>' +
        '<div class="r-sub" style="margin-top:4px">' + esc(cp.zone) + ' · ' + esc(cp.note) + '</div></div>' +
        '<button class="btn btn-primary btn-block" data-act="g7-here">Я на месте</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('g7-here', () => { D.toast('Приход отмечен: ' + F.CHECKIN_POINT.name); setTimeout(() => { location.hash = '#/G8'; }, 700); });

  /* ---------- G11 Нет окон ---------- */
  D.register('G11', {
    tab: 'F1',
    meta: {
      title: 'G11 · Нет окон',
      role: 'Гость, встреча',
      fr: ['FR-MEET-12'],
      ac: ['AC-MEET-12'],
      what: [
        'Свободных окон нет — лист ожидания и ожидание подтверждения.',
        'Три альтернативы от Секретаря: другие время и формат.',
        'Позиция в листе и правило подтверждения за 15 минут.'
      ],
      rules: [
        'Лист ожидания: место подтверждается за 15 минут, иначе уходит дальше.',
        'Альтернативы Секретаря учитывают вашу программу и матрицу переездов.',
        'Лимит исходящих заявок — 5 активных; лист ожидания в лимит не входит.'
      ],
      depends: ['окна встреч', 'Секретарь']
    },
    html(ctx) {
      const w = F.WAITLIST;
      const alts = F.SECRETARY_ALT.alts.map(a =>
        '<button class="card interactive" data-go="G2" style="text-align:left;width:100%">' +
        '<div class="card-row"><div><div class="card-title" style="font-size:15px">' + esc(a.title) + '</div>' +
        '<div class="r-sub" style="margin-top:2px">' + esc(a.time) + ' · ' + esc(a.hall) + ' · ' + esc(a.move) + '</div></div>' + icon('chevR') + '</div>' +
        '<div class="cap" style="margin-top:6px">' + esc(a.note) + '</div></button>').join('');
      return '<div class="scr">' +
        D.head({back:'G2', eyebrow:'Встречи', title:'Окон нет', sub:esc(F.SECRETARY_ALT.cancelled.slice(0, 34)) + '…', paren:paren('секретарь подобрал три варианта')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="banner info">' + icon('clock') + '<div style="flex:1"><div class="b-title">Лист ожидания</div>' +
        '<div class="cap">Позиция ' + w.pos + ' · при освобождении места у вас будет ' + w.confirmMin + ' ' + D.plural(w.confirmMin, ['минута', 'минуты', 'минут']) + ' на подтверждение.</div></div></div>' +
        '<button class="btn btn-primary btn-block" data-act="g11-join">Встать в лист ожидания</button>' +
        '<div class="sec-title">Альтернативы Секретаря</div>' + alts +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('g11-join', () => D.toast('Вы в листе ожидания — позиция 3'));
})();
