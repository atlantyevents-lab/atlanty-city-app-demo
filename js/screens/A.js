/* Блок A — вход и онбординг. Фаза B: A1, A4, A6. */
(function () {
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag } = D;

  D.register('A1', {
    tab: null,
    meta: {
      title: 'A1 · Приветствие',
      role: 'Гость, первый запуск',
      fr: ['FR-AUTH-02', 'FR-UI-01'],
      ac: ['AC-UI-01', 'AC-AUTH-02'],
      what: [
        'Стартовый экран: логотип Сити, топографические линии, дорожная пиктограмма, название фестиваля, дата, город.',
        'Кнопки «Войти или зарегистрироваться» и «Смотреть без входа».',
        'Три обещания приложения одной строкой каждое.',
        'Нижняя подпись в скобках — напоминание, что это демо.'
      ],
      rules: [
        'Вход не требуется для просмотра программы и карты (D-07: список людей виден всем тарифам).',
        'Тема по умолчанию тёмная; светлая — переключателем оболочки.',
        'Все данные вымышленные, даты и залы настоящие.'
      ],
      depends: ['D-07', 'D-16', 'D-17']
    },
    html(ctx) {
      return '<div class="scr">' +
        '<div class="a1-hero topo-host">' +
        D.topo() +
        D.pict('icon-star-square-solid', 'width:190px;right:-64px;top:96px;transform:rotate(12deg)') +
        '<div class="logo-img lg" style="margin-bottom:6px"></div>' +
        '<div class="a1-kicker">Атланты Сити</div>' +
        '<h1 class="a1-title">Атланты Сити.<br>Зима 2027</h1>' +
        '<div class="a1-dates">25 февраля — 1 марта · Завидово</div>' +
        paren('единая программа, карта и аккаунт для всех ролей') +
        '</div>' +
        '<div class="a1-points">' +
        '<div class="a1-point"><span class="a1-num">01</span><div><b>Программа</b><span>сессии, спикеры и запись в один тап</span></div></div>' +
        '<div class="a1-point"><span class="a1-num">02</span><div><b>Экспо и встречи</b><span>стенды, окна и договорённости</span></div></div>' +
        '<div class="a1-point"><span class="a1-num">03</span><div><b>Люди</b><span>знакомства по целям и пользе</span></div></div>' +
        '</div>' +
        '<div class="a1-foot">' +
        '<button class="btn btn-primary btn-block" data-go="A2">Войти или зарегистрироваться</button>' +
        '<button class="btn btn-ghost btn-block" data-go="B1">Смотреть без входа</button>' +
        paren('демонстрационные данные: люди и компании вымышленные') +
        '</div>' +
        '</div>';
    }
  });

  /* ---------- A4 Согласия ---------- */
  const CONSENTS = [
    { id: 'pd', req: true, title: 'Обработка персональных данных', sub: 'Имя, контакты и данные билета — для работы приложения и связи с организатором', ver: 'редакция от 15.11.2026' },
    { id: 'show', req: false, title: 'Показ моего профиля другим участникам', sub: 'Публичные поля появятся в каталоге «Люди»', ver: 'редакция от 15.11.2026' },
    { id: 'scan', req: false, title: 'Передача контактов при сканировании', sub: 'Когда вас сканируют на стенде, представитель увидит контакты', ver: 'редакция от 15.11.2026' },
    { id: 'ntf', req: false, title: 'Уведомления', sub: 'Новости, изменения программы и напоминания о встречах', ver: 'редакция от 15.11.2026' }
  ];

  D.register('A4', {
    tab: null,
    meta: {
      title: 'A4 · Согласия',
      role: 'Гость, онбординг',
      fr: ['FR-AUTH-02'],
      ac: ['AC-AUTH-04'],
      what: [
        'Четыре переключателя согласий с короткими пояснениями и версией текста каждого.',
        'Первое согласие (персональные данные) обязательное — кнопка активна только при нём.',
        'Кнопка «Продолжить» ведёт к целям и пользе.'
      ],
      rules: [
        'Согласие на ПДн обязательно; остальные — добровольные, отзываются в центре приватности (L6).',
        'Отзыв согласия на показ профиля убирает человека из каталога и подсказок.',
        'Версия текста согласия сохраняется вместе с отметкой (редакция от 15.11.2026 — вымышленная дата).'
      ],
      depends: ['152-ФЗ', 'O-09']
    },
    html(ctx) {
      const st = ctx.state;
      st.val = st.val || { pd: true, show: true, scan: false, ntf: true };
      const rows = CONSENTS.map(c =>
        '<div class="toggle-row"><div style="flex:1;min-width:0"><div class="tr-title">' + esc(c.title) + (c.req ? ' <span class="cap">· обязательно</span>' : '') + '</div>' +
        '<div class="tr-sub">' + esc(c.sub) + '</div>' +
        '<div class="cap" style="margin-top:3px">' + esc(c.ver) + '</div></div>' +
        '<label class="toggle"><input type="checkbox" data-consent="' + c.id + '"' + (st.val[c.id] ? ' checked' : '') + '><span class="tr"></span></label></div>'
      ).join('');

      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="A1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div></div>' +
        '<div style="margin-top:10px"><div class="eyebrow">Шаг 2 из 3</div>' +
        '<h1>Согласия</h1>' +
        '<div class="sub">Что приложение может делать с вашими данными</div></div>' +
        '</div>' +
        paren('отозвать любое согласие можно в разделе приватности') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card" style="padding:4px 16px">' + rows + '</div>' +
        '<button class="btn btn-primary btn-block" data-go="A6"' + (st.val.pd ? '' : ' disabled') + '>Продолжить</button>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      host.querySelectorAll('[data-consent]').forEach(inp => {
        inp.addEventListener('change', () => {
          const s = D.st('A4');
          s.val[inp.dataset.consent] = inp.checked;
          const btn = host.querySelector('.btn-primary');
          if (btn) btn.disabled = !s.val.pd;
        });
      });
    }
  });

  /* ---------- A6 Цели и польза ---------- */
  const CAL_STEPS = [
    { id: 'cal1', title: 'Какие у вас задачи на фестивале?', sub: 'Отметьте всё подходящее — приложение подстроит рекомендации', multi: true },
    { id: 'cal2', title: 'Сколько времени готовы уделять нетворкингу?', sub: '15–20 минут в день или полный день встреч', multi: false }
  ];

  D.register('A6', {
    tab: null,
    meta: {
      title: 'A6 · Цели и польза',
      role: 'Гость, онбординг',
      fr: ['FR-AUTH-02', 'FR-PROF-03', 'FR-PPL-08'],
      ac: ['AC-PROF-06'],
      what: [
        'Мультивыбор целей чипами из справочника форума.',
        'Поле «чем могу быть полезен» — используется во встречах и рекомендациях.',
        'Быстрая калибровка: два шага карточками выбора.'
      ],
      rules: [
        'Цели и «польза» обязательны для рекомендаций «Люди для знакомства» и «Подборщик».',
        'Выбор сохраняется в профиле и виден в карточке человека как «цель».',
        'Калибровка — два вопроса, можно пропустить.'
      ],
      depends: ['D-07']
    },
    html(ctx) {
      const st = ctx.state;
      st.goals = st.goals || ['ищу партнёра', 'ищу решения'];
      st.use = st.use != null ? st.use : F.ME.usefulness;
      st.cal = st.cal || {};
      const calStep = st.calStep || 0;

      const goalChips = F.GOALS.map(g =>
        '<button class="chip' + (st.goals.includes(g) ? ' on' : '') + '" data-act="a6-goal" data-arg="' + esc(g) + '">' + esc(g) + '</button>').join('');

      let calBlock;
      if (calStep < CAL_STEPS.length) {
        const cs = CAL_STEPS[calStep];
        const opts = cs.multi
          ? [['meetings', '2–3 встречи в день'], ['program', 'Всю деловую программу'], ['expo', 'Только экспо и стенды']]
          : [['lite', '15–20 минут в день'], ['full', 'Полный день встреч']];
        calBlock = '<div class="card"><div class="cap">Быстрая калибровка · ' + (calStep + 1) + ' из ' + CAL_STEPS.length + '</div>' +
          '<div class="card-title" style="font-size:16px">' + esc(cs.title) + '</div>' +
          '<div class="card-sub">' + esc(cs.sub) + '</div>' +
          '<div class="step-cards" style="margin-top:8px">' +
          opts.map(([id, t]) =>
            '<button class="card interactive step-card' + ((st.cal[cs.id] || []).includes(id) ? ' accent-edge' : '') + '" data-act="a6-cal" data-arg="' + cs.id + ':' + id + '">' +
            '<div class="sc-num">' + String(opts.indexOf ? '' : '') + (cs.multi ? 'несколько' : 'один') + '</div><div style="font-weight:600;font-size:14px">' + esc(t) + '</div></button>').join('') +
          '</div></div>';
      } else {
        calBlock = '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Калибровка сохранена</div><div class="cap">Рекомендации уже учитывают ваши ответы.</div></div></div>';
      }

      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="A4" aria-label="Назад">' + icon('back') + '</button>' +
        '</div></div>' +
        '<div style="margin-top:10px"><div class="eyebrow">Шаг 3 из 3</div>' +
        '<h1>Цели и польза</h1>' +
        '<div class="sub">По ним подбираем людей и решения</div></div>' +
        '</div>' +
        paren('можно изменить в профиле в любой момент') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div><div class="sec-title" style="margin-top:0">Мои цели</div>' +
        '<div class="chips" style="flex-wrap:wrap">' + goalChips + '</div></div>' +
        '<div class="field"><label for="a6-use">Чем могу быть полезен</label>' +
        '<textarea class="textarea" id="a6-use" maxlength="280" placeholder="Опыт, экспертиза, ресурсы — что вы можете предложить другим">' + esc(st.use) + '</textarea>' +
        '<span class="counter">' + (st.use || '').length + ' / 280</span></div>' +
        calBlock +
        '<button class="btn btn-primary btn-block" data-go="B1">Начать</button>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      const ta = host.querySelector('#a6-use');
      if (ta) ta.addEventListener('input', () => { D.st('A6').use = ta.value; });
    }
  });
  D.action('a6-goal', el => {
    const st = D.st('A6');
    const g = el.dataset.arg;
    const i = st.goals.indexOf(g);
    if (i >= 0) st.goals.splice(i, 1); else st.goals.push(g);
    D.rerender();
  });
  D.action('a6-cal', el => {
    const st = D.st('A6');
    const [step, opt] = el.dataset.arg.split(':');
    st.cal[step] = st.cal[step] || [];
    const i = st.cal[step].indexOf(opt);
    if (CAL_STEPS.find(c => c.id === step).multi) {
      if (i >= 0) st.cal[step].splice(i, 1); else st.cal[step].push(opt);
      D.rerender();
    } else {
      st.cal[step] = [opt];
      st.calStep = (st.calStep || 0) + 1;
      D.rerender();
    }
  });

  /* ---------- A2 Контакт ---------- */
  D.register('A2', {
    tab: null,
    meta: {
      title: 'A2 · Контакт',
      role: 'Гость, вход',
      fr: ['FR-AUTH-01'],
      ac: ['AC-AUTH-01'],
      what: [
        'Поле телефона или e-mail с переключателем способа связи.',
        'Короткий текст о том, зачем нужен контакт и что будет дальше.',
        'Кнопка «Получить код» ведёт на ввод кода.'
      ],
      rules: [
        'Один способ связи достаточен; e-mail и телефон равноправны.',
        'Без входа приложение работает в режиме просмотра (D-07).',
        'Контакт используется для кода входа и важных уведомлений.'
      ],
      depends: ['D-07']
    },
    html(ctx) {
      const st = ctx.state;
      st.mode = st.mode || 'phone';
      st.value = st.value != null ? st.value : '';
      const ph = st.mode === 'phone' ? '+7 ___ ___-__-__' : 'name@example.ru';
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="A1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div></div>' +
        '<div style="margin-top:10px"><div class="eyebrow">Вход</div>' +
        '<h1>Ваш контакт</h1>' +
        '<div class="sub">Пришлём код — вход без пароля</div></div>' +
        '</div>' +
        paren('код действует 5 минут') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="chips">' +
        '<button class="chip' + (st.mode === 'phone' ? ' on' : '') + '" data-act="a2-mode" data-arg="phone">Телефон</button>' +
        '<button class="chip' + (st.mode === 'email' ? ' on' : '') + '" data-act="a2-mode" data-arg="email">E-mail</button></div>' +
        '<div class="field"><label for="a2-value">' + (st.mode === 'phone' ? 'Номер телефона' : 'Электронная почта') + '</label>' +
        '<input class="input" id="a2-value" type="' + (st.mode === 'phone' ? 'tel' : 'email') + '" placeholder="' + ph + '" value="' + esc(st.value) + '">' +
        '<span class="counter">' + esc(st.mode === 'phone' ? 'например +7 900 123-45-67' : 'например alex@demo.ru') + '</span></div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Контакт нужен для кода входа и важных уведомлений. Программу и карту можно смотреть без входа.</div></div>' +
        '<button class="btn btn-primary btn-block" data-go="A3"' + (st.value.trim() ? '' : ' disabled') + '>Получить код</button>' +
        '<button class="btn btn-ghost btn-block" data-go="B1">Смотреть без входа</button>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      const inp = host.querySelector('#a2-value');
      if (inp) inp.addEventListener('input', () => {
        const st = D.st('A2');
        st.value = inp.value;
        const btn = host.querySelector('.btn-primary');
        if (btn) btn.disabled = !inp.value.trim();
      });
    }
  });
  D.action('a2-mode', el => { const st = D.st('A2'); st.mode = el.dataset.arg; D.rerender(); });

  /* ---------- A3 Код ---------- */
  D.register('A3', {
    tab: null,
    meta: {
      title: 'A3 · Код',
      role: 'Гость, вход',
      fr: ['FR-AUTH-01'],
      ac: ['AC-AUTH-01', 'AC-AUTH-03'],
      what: [
        'Шесть полей для цифр кода с автопереходом между ними.',
        'Обратный отсчёт действия кода и кнопка «Не пришёл код».',
        'Нейтральное сообщение об ошибке без подсказки, какая цифра неверна.'
      ],
      rules: [
        'Код — 6 цифр, действует 5 минут, 5 попыток, затем блокировка на 15 минут.',
        'Повторная отправка доступна через 60 секунд после первой.',
        'Ошибка не раскрывает, какая позиция кода неверна.'
      ],
      depends: ['служба кодов']
    },
    html(ctx) {
      const st = ctx.state;
      st.digits = st.digits || ['', '', '', '', '', ''];
      st.err = !!st.err;
      const filled = st.digits.every(d => d);
      const boxes = st.digits.map((d, i) =>
        '<input class="code-box' + (st.err ? ' err' : '') + '" inputmode="numeric" maxlength="1" data-code="' + i + '" value="' + esc(d) + '" aria-label="Цифра ' + (i + 1) + '">').join('');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="A2" aria-label="Назад">' + icon('back') + '</button>' +
        '</div></div>' +
        '<div style="margin-top:10px"><div class="eyebrow">Вход</div>' +
        '<h1>Введите код</h1>' +
        '<div class="sub">Отправили на контакт из прошлого шага</div></div>' +
        '</div>' +
        paren('код действует 5 минут') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="code-row">' + boxes + '</div>' +
        (st.err ? '<div class="banner warn">' + icon('info') + '<div class="b-title">Код не подошёл</div><div class="cap">Проверьте цифры и попробуйте ещё раз. Осталось 4 попытки.</div></div>' : '') +
        '<div class="cap" style="text-align:center">повторная отправка через <span data-countdown>04:32</span></div>' +
        '<button class="btn btn-ghost btn-block" data-act="a3-resend">Не пришёл код</button>' +
        '<button class="btn btn-primary btn-block" data-go="A4"' + (filled && !st.err ? '' : ' disabled') + '>Продолжить</button>' +
        '<button class="btn btn-ghost btn-block" data-act="a3-demoerr">Показать пример ошибки</button>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      const st = D.st('A3');
      const boxes = [...host.querySelectorAll('[data-code]')];
      const sync = () => {
        st.digits = boxes.map(b => b.value.replace(/\D/g, '').slice(0, 1));
        const btn = host.querySelector('.btn-primary');
        if (btn) btn.disabled = !(st.digits.every(d => d) && !st.err);
      };
      boxes.forEach((b, i) => {
        b.addEventListener('input', () => {
          b.value = b.value.replace(/\D/g, '').slice(0, 1);
          if (b.value && i < 5) boxes[i + 1].focus();
          st.err = false;
          host.querySelectorAll('.code-box.err').forEach(x => x.classList.remove('err'));
          sync();
        });
        b.addEventListener('keydown', e => { if (e.key === 'Backspace' && !b.value && i > 0) boxes[i - 1].focus(); });
      });
      /* демо-обратный отсчёт */
      const cd = host.querySelector('[data-countdown]');
      let left = 272;
      const t = setInterval(() => {
        if (!document.contains(cd)) { clearInterval(t); return; }
        left--;
        if (left <= 0) { clearInterval(t); cd.textContent = 'можно отправить снова'; return; }
        cd.textContent = '0' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
      }, 1000);
      if (boxes[0]) boxes[0].focus();
    }
  });
  D.action('a3-resend', () => { D.st('A3').digits = ['', '', '', '', '', '']; D.st('A3').err = false; D.toast('Код отправлен повторно'); D.rerender(); });
  D.action('a3-demoerr', () => { const st = D.st('A3'); st.err = true; D.rerender(); });

  /* ---------- A5 Установка на экран ---------- */
  const INSTALL_STEPS = {
    ios: [
      'Откройте меню «Поделиться» в Safari (значок квадрата со стрелкой).',
      'Прокрутите вниз и выберите «На экран „Домой“».',
      'Подтвердите «Добавить» — иконка появится на домашнем экране.'
    ],
    android: [
      'Откройте меню браузера (три точки справа вверху).',
      'Выберите «Установить приложение» или «Добавить на главный экран».',
      'Подтвердите — иконка появится рядом с остальными.'
    ]
  };
  D.register('A5', {
    tab: null,
    meta: {
      title: 'A5 · Установка на экран',
      role: 'Гость, онбординг',
      fr: ['FR-UI-04', 'FR-NTF-01'],
      ac: ['AC-NTF-02'],
      what: [
        'Три шага установки приложения на экран для iOS и Android с переключателем платформы.',
        'Кнопка «Разрешить уведомления» — главный призыв экрана.',
        'Пояснение, зачем ставить на экран: уведомления и быстрый вход.'
      ],
      rules: [
        'Установка необязательна: веб-версия работает в браузере.',
        'Разрешение на уведомления запрашивается только после согласия в A4.',
        'Шаги различаются для iOS (Safari) и Android (Chrome).'
      ],
      depends: ['Web Push', 'D-16']
    },
    html(ctx) {
      const st = ctx.state;
      st.os = st.os || 'ios';
      const steps = INSTALL_STEPS[st.os];
      const list = steps.map((s, i) =>
        '<div class="row" style="align-items:flex-start;padding:10px 0"><span class="a1-num" style="font-size:15px;min-width:34px;color:var(--accent-text)">' + String(i + 1).padStart(2, '0') + '</span>' +
        '<div class="grow"><div style="font-size:14px;line-height:1.45">' + esc(s) + '</div></div></div>').join('');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="A4" aria-label="Назад">' + icon('back') + '</button>' +
        '</div></div>' +
        '<div style="margin-top:10px"><div class="eyebrow">Шаг 4 · необязательно</div>' +
        '<h1>На экран</h1>' +
        '<div class="sub">Уведомления и быстрый вход в один тап</div></div>' +
        '</div>' +
        paren('можно пропустить и вернуться позже') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="chips">' +
        '<button class="chip' + (st.os === 'ios' ? ' on' : '') + '" data-act="a5-os" data-arg="ios">iPhone</button>' +
        '<button class="chip' + (st.os === 'android' ? ' on' : '') + '" data-act="a5-os" data-arg="android">Android</button></div>' +
        '<div class="card" style="padding:6px 16px">' + list + '</div>' +
        '<button class="btn btn-primary btn-block" data-act="a5-allow">' + icon('bell') + 'Разрешить уведомления</button>' +
        '<button class="btn btn-ghost btn-block" data-go="A6">Пропустить</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('a5-os', el => { D.st('A5').os = el.dataset.arg; D.rerender(); });
  D.action('a5-allow', () => { D.st('A5').allowed = true; D.toast('Уведомления разрешены'); D.rerender(); });

  /* ---------- A7 Telegram ---------- */
  D.register('A7', {
    tab: null,
    meta: {
      title: 'A7 · Telegram',
      role: 'Гость, привязка',
      fr: ['FR-NTF-03'],
      ac: ['AC-NTF-03'],
      what: [
        'Объяснение, зачем привязывать Telegram: важные уведомления и быстрые ответы помощнику.',
        'Кнопки «Привязать» и «Позже» — привязка добровольная.',
        'После привязки показывается состояние «Telegram привязан».'
      ],
      rules: [
        'Telegram — дополнительный канал, Web Push и SMS остаются основными (матрица B3).',
        'Отвязка доступна в настройках уведомлений.',
        'Бот получает только уведомления и ответы на вопросы помощника — не личные данные.'
      ],
      depends: ['NTF', 'O-09']
    },
    html(ctx) {
      const st = ctx.state;
      const linked = !!st.linked;
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="A6" aria-label="Назад">' + icon('back') + '</button>' +
        '</div></div>' +
        '<div style="margin-top:10px"><div class="eyebrow">Канал уведомлений</div>' +
        '<h1>Telegram</h1>' +
        '<div class="sub">Важные новости и быстрые ответы</div></div>' +
        '</div>' +
        paren('можно привязать позже в настройках') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card" style="text-align:center;padding:26px 16px">' +
        '<div class="logo-img" style="width:64px;height:64px;border-radius:18px;margin:0 auto 10px;background-size:28px"></div>' +
        '<div style="font-weight:600;font-size:15px">Бот «Атланты Сити»</div>' +
        '<div class="cap" style="margin-top:4px">@atlanty_city_bot · вымышленный адрес</div></div>' +
        '<div class="row" style="align-items:flex-start"><span class="a1-num" style="font-size:15px;min-width:34px;color:var(--accent-text)">01</span><div class="grow"><div style="font-size:14px;line-height:1.45">Срочные изменения программы и входа — быстрее, чем push.</div></div></div>' +
        '<div class="row" style="align-items:flex-start"><span class="a1-num" style="font-size:15px;min-width:34px;color:var(--accent-text)">02</span><div class="grow"><div style="font-size:14px;line-height:1.45">Ответы помощника и Штурмана — вопросом в чат.</div></div></div>' +
        '<div class="row" style="align-items:flex-start"><span class="a1-num" style="font-size:15px;min-width:34px;color:var(--accent-text)">03</span><div class="grow"><div style="font-size:14px;line-height:1.45">Напоминания о встречах дублируются в выбранный канал.</div></div></div>' +
        (linked
          ? '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Telegram привязан</div><div class="cap">Уведомления уже идут в выбранные каналы.</div></div></div>'
          : '<button class="btn btn-primary btn-block" data-act="a7-link">' + icon('send') + 'Привязать Telegram</button>') +
        '<button class="btn btn-ghost btn-block" data-go="B1">' + (linked ? 'Продолжить' : 'Позже') + '</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('a7-link', () => { D.st('A7').linked = true; D.toast('Telegram привязан'); D.rerender(); });
})();
