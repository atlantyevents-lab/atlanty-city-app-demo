/* Блок A — вход и онбординг (раздел S1, демо v3).
   A1–A7: вход, согласия, как работает приложение, установка, Telegram.
   A8–A10: диагностика из трёх шагов. A11: первый путь. A12–A14: усилить путь, питч, уточняющие вопросы.
   Состояние живёт в D.st(id): A8 (кто вы), A9 (цель), A10 (запрос), A11 (путь), A12 (шаги), A13 (питч), A14 (диалог).
   Стили — css/onboarding.css (префикс onb-). Данные — FIX.TAXO, FIX.ME, FIX.PATH_ITEMS (только чтение). */
(function () {
  'use strict';
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag, plural } = D;
  const T = F.TAXO;
  const ME = F.ME;
  const POLICY = 'https://atlantycity.ru/legal#privacy';

  /* ---------- общие помощники ---------- */
  /* перерисовка с сохранением прокрутки экрана (core.route пересоздаёт весь экран) */
  function rr() {
    const sc = document.querySelector('.scr-host .scr');
    const top = sc ? sc.scrollTop : 0;
    D.rerender();
    const sc2 = document.querySelector('.scr-host .scr');
    if (sc2) sc2.scrollTop = top;
  }
  const onScreen = id => (location.hash || '').indexOf('#/' + id) === 0;
  const dom = code => T.DOMAINS.find(d => d.code === code);
  const domTitle = code => (dom(code) || {}).title || code;
  const lowerFirst = s => s ? s.charAt(0).toLowerCase() + s.slice(1) : s;
  const trimDot = s => String(s || '').trim().replace(/[.!\s]+$/, '');

  /* шаг, с которого продолжить диагностику (прогресс хранится в D.st) */
  function resumeStep() {
    if (!D.st('A8').done) return 1;
    if (!D.st('A9').done) return 2;
    if (!D.st('A10').done) return 3;
    return 4;
  }
  const STEP_SCREEN = { 1: 'A8', 2: 'A9', 3: 'A10', 4: 'A11' };

  /* ---------- запись введённого в общее состояние профиля (FIX.PS и FIX.ME) ----------
     Контракт с S7 (fx_profile.js): PS.set(id, v) пишет в PS.val и в ME; цели, запрос и горизонт — PS.goals, PS.main,
     PS.request, PS.requestTask, PS.justMeet, PS.horizon и те же поля ME, как делает L8; согласия — PS.consents[ключ L6]
     (булево) вместе с FIX.CONSENTS[i].given (дата выдачи, её показывает L6) и записью в PS.consentLog.
     Экраны A читают введённое обратно из PS (snap, A12, A13), поэтому кабинет и диагностика не расходятся. */
  const PS = F.PS;
  /* снимок демо-участника до любых записей: источник для «Для показа» и признак того, что введён другой человек */
  const DEMO = Object.assign({}, ME, { domains: (ME.domains || []).slice(), communities: (ME.communities || []).slice() });
  const ONB_DATE = '12.02.2027';
  let onbMin = 40, histReset = false;
  const onbStamp = () => { const m = 18 * 60 + onbMin++, h = Math.floor(m / 60), mm = m % 60; return ONB_DATE + ', ' + h + ':' + (mm < 10 ? '0' : '') + mm; };
  /* запись в журнал изменений целей и запроса (L8): время дня онбординга; прежние записи демо-участника убираются один раз */
  function onbLog(what, from, to) {
    if (!PS || !PS.log) return;
    if (!histReset) { histReset = true; PS.history.length = 0; }
    PS.log(what, from || '—', to || '—');
    if (PS.history[0]) PS.history[0].time = onbStamp();
  }
  /* введён не демо-участник: его личные поля из демо-данных ему не принадлежат */
  const otherPerson = () => !!D.st('A8').other;

  /* A4 → PS.consents: ключи L6 (pd, profile, scan, notify, club), значение — булево; дата и версия — в FIX.CONSENTS и журнале */
  const CONS_KEY = { pd: 'pd', show: 'profile', scan: 'scan', ntf: 'notify', club: 'club' };
  function pushConsents() {
    const v = D.st('A4').val;
    if (!PS || !v) return;
    const log = [];
    onbMin = 40;
    Object.keys(CONS_KEY).forEach(id => {
      const key = CONS_KEY[id], on = !!v[id], fc = (F.CONSENTS || []).find(x => x.id === key);
      PS.consents[key] = on;
      if (fc) fc.given = on ? ONB_DATE : null;
      if (on) log.push({ time: onbStamp(), title: fc ? fc.title : key, to: 'дано', ver: fc ? fc.ver : '' });
    });
    PS.consentLog.length = 0;
    log.reverse().forEach(e => PS.consentLog.push(e));
  }

  /* ---------- A1 Приветствие ---------- */
  D.register('A1', {
    tab: null,
    meta: {
      title: 'A1 · Приветствие',
      role: 'Гость, первый запуск',
      fr: ['FR-AUTH-02', 'FR-UI-01'],
      ac: ['AC-UI-01', 'AC-AUTH-02'],
      what: [
        'Заставка: логотип Сити, топографические линии, дорожная пиктограмма, название фестиваля, дата, город.',
        'Кнопка «Войти» ведёт к вводу контакта; «Смотреть без входа» открывает «Мой путь» в режиме просмотра.',
        'Три обещания приложения: «Мой путь», «Маркетплейс и встречи», «Участники».',
        'Нижняя подпись в скобках: напоминание, что данные демонстрационные.'
      ],
      rules: [
        'Вход не требуется для просмотра программы и карты (D-07: список людей виден всем тарифам).',
        'Тема по умолчанию тёмная; светлая — переключателем оболочки.',
        'Все данные вымышленные, даты и залы настоящие.',
        'Порядок входа: контакт (A2), код (A3), согласия (A4), как работает приложение (A6), три шага (A8–A10), первый путь (A11).'
      ],
      depends: ['D-07', 'D-16', 'D-17', 'D-45']
    },
    html() {
      return '<div class="scr">' +
        '<div class="a1-hero onb-a1h topo-host">' +
        D.topo() +
        D.pict('icon-star-square-solid', 'width:150px;right:-48px;top:40px;transform:rotate(12deg)') +
        '<div class="logo-img lg"></div>' +
        '<h1 class="a1-title">Атланты Сити.<br>Зима 2027</h1>' +
        '<div class="a1-dates">25 февраля — 1 марта · Завидово</div>' +
        paren('ваш путь по фестивалю') +
        '</div>' +
        '<div class="a1-points">' +
        '<div class="a1-point"><span class="a1-num">01</span><div><b>Мой путь</b><span>программа на каждый день под вашу цель</span></div></div>' +
        '<div class="a1-point"><span class="a1-num">02</span><div><b>Маркетплейс и встречи</b><span>решения экспонентов и окна встреч</span></div></div>' +
        '<div class="a1-point"><span class="a1-num">03</span><div><b>Участники</b><span>знакомства по целям и пользе</span></div></div>' +
        '</div>' +
        '<div class="a1-foot onb-a1-foot">' +
        '<button class="btn btn-primary btn-block" data-go="A2">Войти</button>' +
        '<button class="btn btn-ghost btn-block" data-go="B1">Смотреть без входа</button>' +
        paren('демонстрационные данные') +
        '</div>' +
        '</div>';
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
        'Кнопка «Получить код» ведёт на ввод кода; пока контакт не похож на телефон (10 цифр) или e-mail, она неактивна. При смене способа поле очищается.'
      ],
      rules: [
        'Один способ связи достаточен; e-mail и телефон равноправны.',
        'Без входа приложение работает в режиме просмотра (D-07).',
        'Контакт используется для кода входа и важных уведомлений.',
        'Контакт должен быть в базе билетов или приглашений; ответ одинаков для известного и неизвестного контакта.'
      ],
      depends: ['D-07']
    },
    html(ctx) {
      const st = ctx.state;
      st.mode = st.mode || 'phone';
      st.value = st.value != null ? st.value : '';
      const ph = st.mode === 'phone' ? '+7 ___ ___-__-__' : 'name@example.ru';
      return '<div class="scr">' +
        D.head({ back: 'A1', noBell: true, eyebrow: 'Вход', title: 'Ваш контакт', sub: 'Пришлём код — вход без пароля', paren: paren('код действует 5 минут') }) +
        '<div class="onb-body">' +
        '<div class="chips onb-chips">' +
        '<button class="chip' + (st.mode === 'phone' ? ' on' : '') + '" data-act="a2-mode" data-arg="phone">Телефон</button>' +
        '<button class="chip' + (st.mode === 'email' ? ' on' : '') + '" data-act="a2-mode" data-arg="email">E-mail</button></div>' +
        '<div class="field"><label for="a2-value">' + (st.mode === 'phone' ? 'Номер телефона' : 'Электронная почта') + '</label>' +
        '<input class="input" id="a2-value" type="' + (st.mode === 'phone' ? 'tel' : 'email') + '" placeholder="' + ph + '" value="' + esc(st.value) + '">' +
        '<span class="counter">' + esc(st.mode === 'phone' ? 'например +7 900 123-45-67' : 'например alex@demo.ru') + '</span></div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Контакт нужен для кода входа и важных уведомлений. Программу и карту можно смотреть без входа.</div></div>' +
        '<button class="btn btn-primary btn-block" data-go="A3"' + (contactOk(st) ? '' : ' disabled') + '>Получить код</button>' +
        '<button class="btn btn-ghost btn-block" data-go="B1">Смотреть без входа</button>' +
        '<div class="onb-end"></div></div></div>';
    },
    mount(host) {
      const inp = host.querySelector('#a2-value');
      if (inp) inp.addEventListener('input', () => {
        const st = D.st('A2');
        st.value = inp.value;
        const btn = host.querySelector('.btn-primary');
        if (btn) btn.disabled = !contactOk(st);
      });
    }
  });
  /* контакт годен: телефон — не меньше десяти цифр, e-mail — с «@» и доменом */
  function contactOk(st) {
    const v = (st.value || '').trim();
    return st.mode === 'email' ? /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v) : v.replace(/\D/g, '').length >= 10;
  }
  D.action('a2-mode', el => { const st = D.st('A2'); if (st.mode !== el.dataset.arg) { st.mode = el.dataset.arg; st.value = ''; } rr(); });

  /* ---------- A3 Код ---------- */
  function contactLine() {
    const a2 = D.st('A2'), v = (a2.value || '').trim();
    return v ? 'Отправили код на ' + esc(v) : 'Отправили код на ваш телефон или e-mail';
  }
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
        'Состояние ошибки: нейтральное сообщение без подсказки, какая цифра неверна (кнопка «Показать пример ошибки»).'
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
        D.head({ back: 'A2', noBell: true, eyebrow: 'Вход', title: 'Введите код', sub: contactLine(), paren: paren('код действует 5 минут') }) +
        '<div class="onb-body">' +
        '<div class="code-row">' + boxes + '</div>' +
        (st.err ? '<div class="banner warn">' + icon('info') + '<div><div class="b-title">Код не подошёл</div><div class="cap">Проверьте цифры и попробуйте ещё раз. Осталось 4 попытки.</div></div></div>' : '') +
        '<div class="cap" style="text-align:center">код действует ещё <span data-countdown>04:32</span></div>' +
        '<button class="btn btn-primary btn-block" data-go="A4"' + (filled && !st.err ? '' : ' disabled') + '>Продолжить</button>' +
        '<button class="btn btn-ghost btn-block" data-act="a3-resend">Не пришёл код</button>' +
        '<button class="btn btn-ghost btn-block" data-act="a3-demoerr">Показать пример ошибки</button>' +
        '<div class="onb-end"></div></div></div>';
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
          const bn = host.querySelector('.banner.warn'); if (bn) bn.remove();
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
        if (left <= 0) { clearInterval(t); cd.textContent = '00:00: запросите новый'; return; }
        cd.textContent = '0' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0');
      }, 1000);
      if (boxes[0]) boxes[0].focus();
    }
  });
  D.action('a3-resend', () => { const s = D.st('A3'); s.digits = ['', '', '', '', '', '']; s.err = false; D.toast('Код отправлен повторно'); rr(); });
  D.action('a3-demoerr', () => { D.st('A3').err = true; rr(); });

  /* ---------- A4 Согласия ---------- */
  const VER = 'редакция от 15.11.2026';
  const CONSENTS = [
    { id: 'pd', req: true, title: 'Обработка персональных данных',
      sub: 'Имя, контакты, данные билета и ответы диагностики: для работы приложения, подбора и связи с организатором', policy: true },
    { id: 'show', title: 'Показывать профиль другим участникам',
      sub: 'Уровни видимости каждого поля вы увидите на следующем шаге' },
    { id: 'scan', title: 'Передавать контакты экспонентам при сканировании',
      sub: 'При сканировании вашего QR экспонент увидит поля, которым вы дали уровень «Экспоненты и спикеры по согласию». Без согласия — только имя и компания' },
    { id: 'ntf', title: 'Уведомления',
      sub: 'Новости, изменения пути и напоминания о встречах' }
  ];

  D.register('A4', {
    tab: null,
    meta: {
      title: 'A4 · Согласия',
      role: 'Гость, онбординг',
      fr: ['FR-AUTH-02', 'FR-ONB-08', 'FR-ONB-09'],
      ac: ['AC-AUTH-04', 'AC-ONB-08', 'AC-ONB-09'],
      what: [
        'Четыре согласия переключателями: обработка персональных данных (обязательно, со ссылкой на политику), показ профиля, передача контактов экспонентам при сканировании, уведомления.',
        'Отдельная карточка с необязательным согласием «Передавать мои данные клубу «Атланты» как потенциальному резиденту»: не отмечено заранее, пометка «решение юриста».',
        '«Продолжить» активна только после обязательного согласия; без него показана подсказка.'
      ],
      rules: [
        'Согласие на ПДн обязательно; остальные добровольные и отзываются в «Приватность» (L6).',
        'Согласие клубу (D-44) на доступ к функциям не влияет; без него исходящая передача клубу не создаётся.',
        'Текст согласия на передачу контактов экспонентам определяет, что экспонент видит при сканировании (D-47).',
        'Версия текста сохраняется вместе с отметкой (дата редакции в демо вымышленная).',
        'Каждое переключение сразу пишется в общее состояние профиля: «Приватность» (L6) показывает те же значения, дату выдачи и журнал, а F1, F7 и J2 читают их же. Не выданное здесь согласие в L6 не показывается как выданное.'
      ],
      depends: ['D-44', 'D-47', '152-ФЗ', 'O-21']
    },
    html(ctx) {
      const st = ctx.state;
      st.val = st.val || { pd: false, show: true, scan: false, ntf: true, club: false };
      const rows = CONSENTS.map(c =>
        '<div class="toggle-row"><div style="flex:1;min-width:0"><div class="tr-title">' + esc(c.title) + (c.req ? ' <span class="cap">· обязательно</span>' : '') + '</div>' +
        '<div class="tr-sub">' + esc(c.sub) + '</div>' +
        (c.policy ? '<button class="onb-lnk" data-act="a4-policy"><span>Политика обработки персональных данных</span><small>' + esc(POLICY) + '</small></button>' : '') +
        '</div>' +
        '<label class="toggle"><input type="checkbox" data-consent="' + c.id + '" aria-label="' + esc(c.title) + '"' + (st.val[c.id] ? ' checked' : '') + '><span class="tr"></span></label></div>'
      ).join('');

      return '<div class="scr">' +
        D.head({ back: 'A3', noBell: true, eyebrow: 'Перед началом', title: 'Согласия', sub: 'Что приложение делает с вашими данными', paren: paren('отозвать любое согласие можно в разделе приватности') }) +
        '<div class="onb-body">' +
        '<div class="card" style="padding:4px 16px">' + rows + '</div>' +
        '<div class="card onb-club">' +
        '<div class="toggle-row"><div style="flex:1;min-width:0">' +
        '<div class="tr-title">Передавать мои данные клубу «Атланты» как потенциальному резиденту</div>' +
        '<div class="onb-club-tags" style="margin:6px 0">' + tag('необязательно') + tag('решение юриста', 'accent') + '</div>' +
        '<div class="onb-club-note">По умолчанию не отмечено и не влияет на доступ к приложению. Отозвать можно в разделе «Приватность». Текст и основание уточняет юрист.</div>' +
        '</div>' +
        '<label class="toggle"><input type="checkbox" data-consent="club" aria-label="Передавать мои данные клубу «Атланты»"' + (st.val.club ? ' checked' : '') + '><span class="tr"></span></label></div>' +
        '</div>' +
        '<div class="onb-note">Тексты согласий: ' + esc(VER) + '. Версия текста сохраняется вместе с отметкой.</div>' +
        '<div class="onb-end"></div></div>' +
        '<div class="onb-foot">' +
        '<div class="onb-note" data-need' + (st.val.pd ? ' hidden' : '') + '>Отметьте обязательное согласие на обработку персональных данных, чтобы продолжить.</div>' +
        '<button class="btn btn-primary btn-block" data-go="A6"' + (st.val.pd ? '' : ' disabled') + '>Продолжить</button>' +
        '</div></div>';
    },
    mount(host) {
      host.querySelectorAll('[data-consent]').forEach(inp => {
        inp.addEventListener('change', () => {
          const s = D.st('A4');
          s.val[inp.dataset.consent] = inp.checked;
          pushConsents();
          const btn = host.querySelector('.onb-foot .btn-primary');
          if (btn) btn.disabled = !s.val.pd;
          const need = host.querySelector('[data-need]');
          if (need) need.hidden = !!s.val.pd;
        });
      });
    }
  });
  D.action('a4-policy', () => D.toast('Политика на сайте организатора'));

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
      role: 'Участник, онбординг (необязательно)',
      fr: ['FR-UI-04', 'FR-NTF-01', 'FR-ONB-12'],
      ac: ['AC-NTF-02', 'AC-ONB-12'],
      what: [
        'Три шага установки приложения на экран для iOS и Android с переключателем платформы.',
        'Кнопка «Разрешить уведомления» — главный призыв экрана; после нажатия показан статус.',
        'Пояснение, зачем ставить на экран: уведомления и быстрый вход.'
      ],
      rules: [
        'Установка необязательна: веб-версия работает в браузере. Вход на экран — из финала диагностики (A11).',
        'Разрешение на уведомления запрашивается только после согласия в A4.',
        'Шаги различаются для iOS (Safari) и Android (Chrome).',
        'Установка на экран и разрешение push пишутся событиями воронки входа (FR-ONB-12).'
      ],
      depends: ['Web Push', 'D-16']
    },
    html(ctx) {
      const st = ctx.state;
      st.os = st.os || 'ios';
      const steps = INSTALL_STEPS[st.os];
      const list = steps.map((s, i) =>
        '<div class="onb-why"><span class="onb-num">' + String(i + 1).padStart(2, '0') + '</span><div class="onb-why-t" style="font-weight:400">' + esc(s) + '</div></div>').join('');
      return '<div class="scr">' +
        D.head({ backHist: true, eyebrow: 'Необязательно', title: 'Установка на экран', sub: 'Уведомления и быстрый вход в один тап', paren: paren('можно пропустить и вернуться позже') }) +
        '<div class="onb-body">' +
        '<div class="chips onb-chips">' +
        '<button class="chip' + (st.os === 'ios' ? ' on' : '') + '" data-act="a5-os" data-arg="ios">iPhone</button>' +
        '<button class="chip' + (st.os === 'android' ? ' on' : '') + '" data-act="a5-os" data-arg="android">Android</button></div>' +
        '<div class="card" style="padding:4px 16px">' + list + '</div>' +
        (st.allowed
          ? '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Уведомления разрешены</div><div class="cap">Напоминания о пути и встречах придут на это устройство.</div></div></div>'
          : '<button class="btn btn-primary btn-block" data-act="a5-allow">' + icon('bell') + 'Разрешить уведомления</button>') +
        '<button class="btn btn-ghost btn-block" data-act="nav-back">' + (st.allowed ? 'Готово' : 'Пропустить') + '</button>' +
        '<div class="onb-end"></div></div></div>';
    }
  });
  D.action('a5-os', el => { D.st('A5').os = el.dataset.arg; rr(); });
  D.action('a5-allow', () => { D.st('A5').allowed = true; D.toast('Уведомления разрешены'); rr(); });

  /* ---------- A7 Telegram ---------- */
  D.register('A7', {
    tab: null,
    meta: {
      title: 'A7 · Telegram',
      role: 'Участник, привязка (необязательно)',
      fr: ['FR-NTF-03'],
      ac: ['AC-NTF-03'],
      what: [
        'Объяснение, зачем привязывать Telegram: важные уведомления и быстрые ответы помощнику.',
        'Кнопки «Привязать» и «Позже» — привязка добровольная; «Позже» и «Готово» возвращают на прежний экран (A11).',
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
      const pt = (n, t) => '<div class="onb-why"><span class="onb-num">' + n + '</span><div class="onb-why-t" style="font-weight:400">' + t + '</div></div>';
      return '<div class="scr">' +
        D.head({ backHist: true, eyebrow: 'Канал уведомлений', title: 'Telegram', sub: 'Важные новости и быстрые ответы', paren: paren('можно привязать позже в настройках') }) +
        '<div class="onb-body">' +
        '<div class="card" style="text-align:center;padding:26px 16px">' +
        '<div class="logo-img" style="width:64px;height:64px;border-radius:18px;margin:0 auto 10px;background-size:28px"></div>' +
        '<div style="font-weight:600;font-size:15px">Бот «Атланты Сити»</div>' +
        '<div class="cap" style="margin-top:4px">@atlanty_city_bot · вымышленный адрес</div></div>' +
        '<div class="card" style="padding:4px 16px">' +
        pt('01', 'Срочные изменения программы и входа — быстрее, чем push.') +
        pt('02', 'Ответы помощника и Штурмана — вопросом в чат.') +
        pt('03', 'Напоминания о встречах дублируются в выбранный канал.') + '</div>' +
        (linked
          ? '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Telegram привязан</div><div class="cap">Уведомления уже идут в выбранные каналы.</div></div></div>'
          : '<button class="btn btn-primary btn-block" data-act="a7-link">' + icon('send') + 'Привязать Telegram</button>') +
        '<button class="btn btn-ghost btn-block" data-act="nav-back">' + (linked ? 'Готово' : 'Позже') + '</button>' +
        '<div class="onb-end"></div></div></div>';
    }
  });
  D.action('a7-link', () => { D.st('A7').linked = true; D.toast('Telegram привязан'); rr(); });

  /* ---------- A6 Как работает приложение ---------- */
  const WHY5 = [
    ['Свой путь по фестивалю', 'Цель и запрос превращаются в программу на каждый день, у каждого пункта есть причина.'],
    ['Нужные люди', 'Подбор людей и «Предметный кофе» по вашему запросу, отрасли и пользе для других.'],
    ['Решения под ваш запрос', 'Экспоненты Маркетплейса подбираются по задаче, которую вы решаете за 30–90 дней.'],
    ['Меньше лишнего', 'Расписание без пересечений и с запасом времени на переходы между залами.'],
    ['Итоги после фестиваля', 'Контакты, заметки и договорённости собираются в «Мои итоги» и дорожную карту.']
  ];
  /* факты о хранении и защите: только из ТЗ (TZ_01 разд. 10 и 11, D-29, D-46, D-49); формулировки уточняет юрист (O-21) */
  const SAFE5 = [
    ['Хранение в России', 'Данные граждан РФ хранятся и обрабатываются в РФ.'],
    ['ИИ без контактов', 'В языковую модель контакты не передаются, имена шифруются.'],
    ['Контакты скрыты', 'Они раскрываются обменом QR либо вашим согласием на заявку.'],
    ['Оператор назван', 'Организатор и оператор названы в политике обработки персональных данных.'],
    ['Подбор автоматический', 'Правила подбора описаны в политике, оценка совпадения людям не показывается.']
  ];
  const VIS_ICON = { only_me: 'lock', meeting: 'calendar', all: 'people', partners: 'briefcase' };
  const VIS_SHORT = {
    only_me: 'Видите только вы',
    meeting: 'После назначенной встречи',
    all: 'Каталог «Участники»',
    partners: 'При сканировании, по согласию'
  };
  const VIS_WHO = {
    only_me: 'Видите только вы. Эти поля использует подбор, другим участникам они не показываются.',
    meeting: 'Видят те, с кем у вас назначена встреча.',
    all: 'Видят все участники в каталоге «Участники».',
    partners: 'Видят экспоненты и спикеры, если вы дали согласие при сканировании.'
  };
  function profVal(id) {
    switch (id) {
      case 'communities': return ME.communities && ME.communities.length ? ME.communities.join(', ') : 'Не состою';
      case 'goals': return (ME.domains || []).map(domTitle).join(', ');
      default: return ME[id] || '—';
    }
  }
  function visBlock(level) {
    const lv = T.VISIBILITY.find(v => v.id === level) || T.VISIBILITY[2];
    const list = T.VISIBILITY.map(v =>
      '<button class="onb-vis' + (v.id === lv.id ? ' on' : '') + '" data-act="a6-vis" data-arg="' + v.id + '" aria-pressed="' + (v.id === lv.id) + '">' +
      '<span class="onb-vis-ic">' + icon(VIS_ICON[v.id]) + '</span>' +
      '<span class="grow"><span class="onb-vis-t">' + esc(v.label) + '</span><span class="onb-vis-w">' + esc(VIS_SHORT[v.id]) + '</span></span></button>').join('');
    let rows;
    if (lv.id === 'partners') {
      rows = [['Без согласия', 'имя и компания'], ['С согласием', 'поля, которым вы дали этот уровень']];
    } else {
      const all = T.PROFILE_FIELDS.filter(f => ((ME.visibility || {})[f.id] || f.defaultVis) === lv.id).map(f => [f.label, profVal(f.id)]);
      rows = all.slice(0, 6);
      if (all.length > 6) { const n = all.length - 6; rows.push(['', 'и ещё ' + n + ' ' + plural(n, ['поле', 'поля', 'полей'])]); }
    }
    const ex = '<div class="card onb-ex"><div class="onb-ex-h">Что увидят: ' + esc(lowerFirst(lv.label)) + '</div>' +
      '<div class="onb-ex-who">' + esc(VIS_WHO[lv.id]) + '</div>' +
      rows.map(r => '<div class="onb-ex-row"><span class="k">' + esc(r[0]) + '</span><span class="v">' + esc(r[1]) + '</span></div>').join('') +
      '<div class="onb-ex-foot">' + (D.st('A8').done ? 'Данные из вашего профиля.' : 'Пример на данных демо-участника.') + ' Уровень каждого поля меняется в разделе «Приватность».</div>' +
      '<button class="onb-lnk" data-go="L6"><span>Открыть «Приватность»</span></button></div>';
    return '<div class="onb-vis-list">' + list + '</div>' + ex;
  }

  const VID_LEN = 30;
  let vidTimer = null;
  const mmss = s => '0:' + String(s).padStart(2, '0');
  function paintVid() {
    const s = D.st('A6');
    const box = document.querySelector('[data-vid]');
    if (!box) { clearInterval(vidTimer); return; }
    const pl = box.querySelector('.onb-vid-play');
    pl.innerHTML = icon(s.playing ? 'pause' : 'play');
    pl.setAttribute('aria-label', s.playing ? 'Пауза' : 'Смотреть ролик');
    box.querySelector('.onb-vid-bar i').style.width = (s.pos / VID_LEN * 100) + '%';
    box.querySelector('[data-vt]').textContent = mmss(s.pos);
    box.querySelector('.onb-vid-cap').textContent = s.playing ? 'Идёт воспроизведение (макет плеера)' : (s.pos ? 'Пауза' : 'Как устроено приложение · 30 секунд');
  }

  D.register('A6', {
    tab: null,
    meta: {
      title: 'A6 · Как работает приложение',
      role: 'Участник, онбординг',
      fr: ['FR-ONB-10', 'FR-ONB-08', 'FR-AUTH-06'],
      ac: ['AC-ONB-10', 'AC-ONB-08'],
      what: [
        'Ролик о приложении на 30 секунд: макет плеера (воспроизведение имитируется, внешних запросов нет).',
        'Пять причин, зачем нужны данные: что участник получает взамен.',
        'Четыре уровня видимости (D-47): «Только вы», «Те, с кем у меня встреча», «Все участники», «Экспоненты и спикеры по согласию»; по нажатию на уровень показан пример «что увидят» на данных демо-участника.',
        'Блок «Куда уходят данные и как защищены»: хранение в РФ, контакты не передаются языковой модели, имена шифруются, контакты скрыты, оператор назван в политике, подбор автоматический; подпись «текст уточняется юристом (O-21)».',
        'Выгрузка и удаление данных ведут в Кабинет, «Приватность», вкладка «Мои данные» (L6), и политика ПДн.',
        'Кнопка внизу ведёт на первый непройденный шаг диагностики: «Начать» или «Продолжить с шага N».'
      ],
      rules: [
        'Экран показывается один раз до шага 1 и открывается позже из меню («Как пользоваться»).',
        'Ролик готовят Борис и Александр (D-56); в демо вместо ролика макет плеера.',
        'Прогресс диагностики хранится, поэтому после перерыва кнопка предлагает вернуться на тот же шаг (FR-ONB-12).',
        'Поля, не открытые по уровню, участнику-собеседнику не возвращаются.',
        'Факты о хранении и защите взяты из TZ_01 (разделы 10 и 11) и решений D-29, D-46, D-49; новых юридических утверждений нет.'
      ],
      depends: ['D-47', 'D-56', 'D-45', 'D-29', 'D-46', 'D-49', 'O-21']
    },
    html(ctx) {
      const st = ctx.state;
      st.vis = st.vis || 'all';
      const rs = resumeStep();
      const label = rs === 1 ? 'Начать: три шага' : (rs <= 3 ? 'Продолжить с шага ' + rs + ' из 3' : 'Открыть первый путь');
      return '<div class="scr">' +
        D.head({ back: 'A4', noBell: true, eyebrow: 'Перед началом', title: 'Как работает приложение', sub: 'Ролик, зачем нужны данные и кто что увидит', paren: paren('около минуты') }) +
        '<div class="onb-body">' +
        '<div class="onb-vid" data-vid>' +
        '<div class="onb-vid-stage"><span class="tag onb-vid-tag">макет</span><button class="onb-vid-play" data-act="a6-play" aria-label="Смотреть ролик">' + icon('play') + '</button>' +
        '<div class="onb-vid-cap">Как устроено приложение · 30 секунд</div></div>' +
        '<div class="onb-vid-bar"><i style="width:0"></i></div>' +
        '<div class="onb-vid-time"><span data-vt>0:00</span><span>' + mmss(VID_LEN) + '</span></div></div>' +

        '<div class="sec-title">Зачем нужны ваши данные</div>' +
        '<div class="card" style="padding:4px 16px">' +
        WHY5.map((w, i) => '<div class="onb-why"><span class="onb-num">' + String(i + 1).padStart(2, '0') + '</span><div><div class="onb-why-t">' + esc(w[0]) + '</div><div class="onb-why-d">' + esc(w[1]) + '</div></div></div>').join('') +
        '</div>' +

        '<div class="sec-title">Кто что увидит</div>' +
        '<div class="onb-vis-box" data-visbox>' + visBlock(st.vis) + '</div>' +

        '<div class="sec-title">Куда уходят данные и как защищены</div>' +
        '<div class="card" style="padding:4px 16px">' +
        SAFE5.map(w => '<div class="onb-why"><span class="onb-num">' + icon('check') + '</span><div><div class="onb-why-t">' + esc(w[0]) + '</div><div class="onb-why-d">' + esc(w[1]) + '</div></div></div>').join('') +
        '</div>' +
        paren('текст уточняется юристом (O-21)') +

        '<div class="sec-title">Ваши данные</div>' +
        '<div class="card" style="padding:2px 16px"><div class="list">' +
        '<button class="row clickable" data-act="a6-data"><div class="grow"><div class="r-title">Выгрузить мои данные</div><div class="r-sub">Кабинет, «Приватность», вкладка «Мои данные»</div></div>' + icon('chevR') + '</button>' +
        '<button class="row clickable" data-act="a6-data"><div class="grow"><div class="r-title">Удалить мои данные</div><div class="r-sub">Кабинет, «Приватность», вкладка «Мои данные»</div></div>' + icon('chevR') + '</button>' +
        '<button class="row clickable" data-act="a4-policy"><div class="grow"><div class="r-title">Политика обработки персональных данных</div><div class="r-sub">' + esc(POLICY) + '</div></div>' + icon('chevR') + '</button>' +
        '</div></div>' +
        '<div class="onb-end"></div></div>' +
        '<div class="onb-foot">' +
        '<button class="btn btn-primary btn-block" data-go="' + STEP_SCREEN[rs] + '">' + label + '</button>' +
        '</div></div>';
    },
    mount() {
      const s = D.st('A6');
      clearInterval(vidTimer);
      s.playing = false;
      s.pos = s.pos || 0;
      paintVid();
    }
  });
  /* ссылки «Выгрузить» и «Удалить»: открыть «Приватность» (L6) сразу на вкладке «Мои данные» */
  D.action('a6-data', () => { D.st('L6').tab = 'data'; location.hash = '#/L6'; });
  D.action('a6-vis', el => {
    const s = D.st('A6');
    s.vis = el.dataset.arg;
    const box = document.querySelector('[data-visbox]');
    if (box) box.innerHTML = visBlock(s.vis);
  });
  D.action('a6-play', () => {
    const s = D.st('A6');
    s.playing = !s.playing;
    clearInterval(vidTimer);
    if (s.playing) {
      vidTimer = setInterval(() => {
        if (!document.querySelector('[data-vid]')) { clearInterval(vidTimer); return; }
        s.pos += 1;
        if (s.pos >= VID_LEN) { s.pos = 0; s.playing = false; clearInterval(vidTimer); D.toast('Ролик закончился (макет)'); }
        paintVid();
      }, 1000);
    }
    paintVid();
  });

  /* ---------- общая полоса шагов «N из 3» ---------- */
  const progBar = n => '<div class="onb-prog" aria-label="Шаг ' + n + ' из 3">' +
    [1, 2, 3].map(i => '<i' + (i <= n ? ' class="on"' : '') + '></i>').join('') + '</div>';

  /* «просто знакомиться» общее для A9 и A10 и хранится в D.st('A10') */
  const jm = () => !!D.st('A10').justMeet;
  const JM_TEXT = 'подбор сделает упор на знакомства, досуг, спорт и семью';

  /* ---------- A8 Шаг 1 из 3: кто вы ---------- */
  function s8() {
    const s = D.st('A8');
    if (!s.init) {
      /* имя, телефон, e-mail и тариф — из билетной базы; остальное человек вводит сам */
      Object.assign(s, { init: true, name: ME.name, phone: ME.phone, email: ME.email, company: '', site: '', industry: '', revenue: '', comm: [], edit: false, tried: false, done: false });
    }
    return s;
  }
  const siteOk = v => /^(https?:\/\/)?([a-zа-яё0-9-]+\.)+[a-zа-яё]{2,}(\/\S*)?$/i.test(String(v).trim());
  function errs8(s) {
    const e = {};
    if (!s.name.trim()) e.name = 'Укажите имя';
    if (!s.company.trim()) e.company = 'Укажите компанию';
    if (!s.site.trim()) e.site = 'Укажите сайт компании, например example-company.ru';
    else if (!siteOk(s.site)) e.site = 'Похоже на опечатку: нужен адрес вида example-company.ru';
    if (!s.industry) e.industry = 'Выберите отрасль из списка';
    if (!s.revenue) e.revenue = 'Выберите диапазон оборота';
    if (!s.comm.length) e.comm = 'Отметьте сообщества или «Не состою»';
    return e;
  }
  const LBL8 = { name: 'имя', company: 'компания', site: 'сайт', industry: 'отрасль', revenue: 'оборот', comm: 'бизнес-сообщества' };
  const sum8 = e => { const k = Object.keys(e); return k.length ? 'Заполните обязательные поля: ' + k.map(x => LBL8[x]).join(', ') : ''; };
  const errBox = (key, e) => '<span class="err-msg" data-err="' + key + '"' + (e[key] ? '' : ' hidden') + '>' + esc(e[key] || '') + '</span>';

  function paint8(host) {
    const s = s8(), e = errs8(s);
    Object.keys(LBL8).forEach(k => host.querySelectorAll('[data-err="' + k + '"]').forEach(b => { b.textContent = e[k] || ''; b.hidden = !e[k]; }));
    [['#a8-name', 'name'], ['#a8-company', 'company'], ['#a8-site', 'site']].forEach(p => {
      const el = host.querySelector(p[0]); if (el) el.classList.toggle('err', !!e[p[1]]);
    });
    const pk = host.querySelector('.onb-pick'); if (pk) pk.classList.toggle('err', !!e.industry);
    const sm = host.querySelector('[data-sum]');
    if (sm) { const t = sum8(e); sm.textContent = t; sm.hidden = !t; }
  }

  D.register('A8', {
    tab: null,
    meta: {
      title: 'A8 · Шаг 1 из 3: кто вы',
      role: 'Участник, диагностика',
      fr: ['FR-ONB-01', 'FR-ONB-02', 'FR-ONB-06', 'FR-ONB-12'],
      ac: ['AC-ONB-01', 'AC-ONB-02', 'AC-ONB-06', 'AC-ONB-12'],
      what: [
        'Полоса шагов «1 из 3». Карточка «Мы уже знаем это из вашего билета»: имя, телефон, e-mail и тариф предзаполнены и правятся кнопкой «Изменить».',
        'Обязательные поля: компания, сайт, отрасль (16 вариантов в листе), оборот (5 диапазонов), бизнес-сообщества (можно «Не состою»).',
        'Кнопка «Далее» не блокируется молча: при пустом обязательном поле показаны сообщения у полей и строка внизу, переход не происходит.',
        'Введённое сохраняется (D.st), при возврате с шага 2 поля на месте. Для показа есть ссылка «подставить данные демо-участника».'
      ],
      rules: [
        'Обязательны имя, компания, сайт, отрасль, оборот, бизнес-сообщества (D-45, FR-ONB-02); выбор «Не состою» считает поле заполненным.',
        'Оборот по умолчанию виден только вам и используется подбором (D-47); вариант «Нераспределённые» в списке отраслей оставлен с пометкой для заказчика (O-18).',
        'Список бизнес-сообществ заказчик не передал (O-17): в демо три варианта.',
        'Семейное положение и дети на этом шаге не спрашиваются: подтверждаются позже в «Усилить путь» (шаг 4).'
      ],
      depends: ['D-45', 'D-47', 'O-17', 'O-18']
    },
    html() {
      const s = s8();
      const e = s.tried ? errs8(s) : {};
      const kv = (k, v) => '<div class="onb-kv"><span class="cap">' + k + '</span><span class="v">' + v + '</span></div>';
      const ticket = '<div class="card onb-tk">' +
        '<div class="onb-tk-h">' + icon('ticket') + 'Мы уже знаем это из вашего билета</div>' +
        (s.edit
          ? '<div class="field"><label for="a8-name">Имя</label><input class="input' + (e.name ? ' err' : '') + '" id="a8-name" autocomplete="name" value="' + esc(s.name) + '">' + errBox('name', e) + '</div>' +
            '<div class="field"><label for="a8-phone">Телефон</label><input class="input" id="a8-phone" type="tel" value="' + esc(s.phone) + '"></div>' +
            '<div class="field"><label for="a8-email">E-mail</label><input class="input" id="a8-email" type="email" value="' + esc(s.email) + '"></div>' +
            kv('Тариф', D.tariffTag(ME.tariff))
          : kv('Имя', esc(s.name || '—')) + kv('Телефон', esc(s.phone || '—')) + kv('E-mail', esc(s.email || '—')) + kv('Тариф', D.tariffTag(ME.tariff)) + errBox('name', e)) +
        '<button class="btn btn-ghost btn-sm" style="align-self:flex-start;min-height:40px" data-act="a8-edit">' + (s.edit ? 'Готово' : 'Изменить') + '</button>' +
        '</div>';

      const rev = T.REVENUE.map((r, i) => '<button class="chip' + (s.revenue === r ? ' on' : '') + '" data-act="a8-rev" data-arg="' + i + '" aria-pressed="' + (s.revenue === r) + '">' + esc(r) + '</button>').join('');
      const com = T.COMMUNITIES.map((c, i) => '<button class="chip' + (s.comm.includes(c) ? ' on' : '') + '" data-act="a8-comm" data-arg="' + i + '" aria-pressed="' + s.comm.includes(c) + '">' + esc(c) + '</button>').join('');

      return '<div class="scr">' +
        D.head({ back: 'A6', noBell: true, eyebrow: 'Шаг 1 из 3', title: 'Кто вы', sub: 'Несколько полей, чтобы подобрать людей и решения', paren: paren('около минуты') }) +
        progBar(1) +
        '<div class="onb-body">' + ticket +
        '<div class="field"><label for="a8-company">Компания</label><input class="input' + (e.company ? ' err' : '') + '" id="a8-company" autocomplete="organization" placeholder="Название компании" value="' + esc(s.company) + '">' + errBox('company', e) + '</div>' +
        '<div class="field"><label for="a8-site">Сайт компании</label><input class="input' + (e.site ? ' err' : '') + '" id="a8-site" type="text" inputmode="url" autocomplete="url" placeholder="example-company.ru" value="' + esc(s.site) + '">' + errBox('site', e) + '</div>' +
        '<div class="field"><span class="onb-lab">Отрасль</span>' +
        '<button class="onb-pick' + (s.industry ? '' : ' ph') + (e.industry ? ' err' : '') + '" data-act="a8-ind-open"><span class="onb-pick-v">' + esc(s.industry || 'Выберите из 16 вариантов') + '</span>' + icon('chevD') + '</button>' + errBox('industry', e) + '</div>' +
        '<div class="field"><span class="onb-lab">Оборот компании в год <span class="cap">· видите только вы, использует подбор</span></span><div class="onb-chips">' + rev + '</div>' + errBox('revenue', e) + '</div>' +
        '<div class="field"><span class="onb-lab">Бизнес-сообщества <span class="cap">· можно несколько</span></span><div class="onb-chips">' + com + '</div>' + errBox('comm', e) + '</div>' +
        '<button class="onb-lnk" data-act="a8-demo"><span>Для показа: подставить данные демо-участника</span></button>' +
        '<div class="onb-end"></div></div>' +
        '<div class="onb-foot">' +
        '<div class="onb-err" data-sum' + (s.tried && sum8(e) ? '' : ' hidden') + '>' + esc(sum8(e)) + '</div>' +
        '<button class="btn btn-primary btn-block" data-act="a8-next">Далее: цель</button>' +
        '</div></div>';
    },
    mount(host) {
      const s = s8();
      [['#a8-name', 'name'], ['#a8-phone', 'phone'], ['#a8-email', 'email'], ['#a8-company', 'company'], ['#a8-site', 'site']].forEach(p => {
        const el = host.querySelector(p[0]);
        if (el) el.addEventListener('input', () => { s[p[1]] = el.value; if (s.tried) paint8(host); });
      });
    }
  });
  D.action('a8-edit', () => { const s = s8(); s.edit = !s.edit; rr(); });
  D.action('a8-rev', el => { const s = s8(); s.revenue = T.REVENUE[+el.dataset.arg]; rr(); });
  D.action('a8-comm', el => {
    const s = s8(), v = T.COMMUNITIES[+el.dataset.arg], none = T.COMMUNITIES[0];
    if (v === none) s.comm = s.comm.includes(none) ? [] : [none];
    else { s.comm = s.comm.filter(x => x !== none); const i = s.comm.indexOf(v); if (i >= 0) s.comm.splice(i, 1); else s.comm.push(v); }
    rr();
  });
  D.action('a8-ind-open', () => {
    const s = s8();
    D.openSheet('<div class="onb-sheet"><div class="onb-sheet-h"><div class="sheet-title">Отрасль</div><button class="icon-btn" data-act="sheet-close" aria-label="Закрыть">' + icon('x') + '</button></div>' +
      '<div class="cap" style="margin-bottom:6px">Один вариант из ' + T.INDUSTRIES.length + '</div>' +
      '<div class="onb-opts">' + T.INDUSTRIES.map((n, i) =>
        '<button class="onb-opt' + (n === s.industry ? ' on' : '') + '" data-act="a8-ind" data-arg="' + i + '"><span>' + esc(n) + '</span>' + (n === s.industry ? icon('check') : '') + '</button>').join('') + '</div></div>');
  });
  D.action('a8-ind', el => { s8().industry = T.INDUSTRIES[+el.dataset.arg]; D.closeSheet(); rr(); });
  D.action('a8-demo', () => { fillDemo(false); D.toast('Данные демо-участника подставлены'); rr(); });
  D.action('a8-next', () => {
    const s = s8(), e = errs8(s);
    if (Object.keys(e).length) {
      s.tried = true;
      rr();
      const bad = document.querySelector('.scr-host .err-msg:not([hidden])');
      if (bad) bad.scrollIntoView({ block: 'center' });
      return;
    }
    s.tried = false; s.done = true;
    push8();
    location.hash = '#/A9';
  });

  /* ---------- A9 Шаг 2 из 3: цель ---------- */
  function s9() {
    const s = D.st('A9');
    if (!s.init) Object.assign(s, { init: true, doms: [], main: null, limit: false, tried: false, done: false });
    return s;
  }
  D.register('A9', {
    tab: null,
    meta: {
      title: 'A9 · Шаг 2 из 3: цель',
      role: 'Участник, диагностика',
      fr: ['FR-ONB-04', 'FR-ONB-01'],
      ac: ['AC-ONB-04', 'AC-ONB-12'],
      what: [
        'Вопрос «Что главное в этом году?» и восемь доменов целей G1–G8 карточками с описаниями (таксономия D-57).',
        'Многовыбор до пяти целей; у выбранной цели кнопка «Сделать главной»; главная ровно одна (первая выбранная становится главной сама).',
        'Кнопка «Просто знакомиться» рядом с целями (не домен): выбор цели становится необязательным.',
        'Состояния: ничего не выбрано (сообщение внизу, переход закрыт), шестая цель (сообщение «до пяти»), выбрано «Просто знакомиться».'
      ],
      rules: [
        'Домены, их тексты и соответствия — design/05_TAXONOMY.md, раздел 2.',
        'При выборе шестой цели она не сохраняется, предлагается снять одну (FR-ONB-04).',
        '«Просто знакомиться» даёт подбору вес G6 и меток «Развлечения», «Спорт», «Семья» и снимает вес рычагов программы; это отметка, а не домен.',
        'Цели правятся позже в «Цели и запросы» (L8) и пересчитывают путь.'
      ],
      depends: ['D-45', 'D-57']
    },
    html() {
      const s = s9();
      const cards = T.DOMAINS.map(d => {
        const on = s.doms.includes(d.code);
        return '<div class="onb-dom' + (on ? ' on' : '') + '">' +
          '<button class="onb-dom-btn" data-act="a9-dom" data-arg="' + d.code + '" aria-pressed="' + on + '">' +
          '<span class="onb-ck">' + icon('check') + '</span>' +
          '<span class="grow"><span class="onb-dom-t">' + esc(d.title) + '</span><span class="onb-dom-d">Покажем: ' + esc(lowerFirst(d.desc)) + '</span></span></button>' +
          (on ? '<div class="onb-dom-foot">' + (s.main === d.code
            ? tag('Главная цель', 'fill')
            : '<button class="btn btn-secondary btn-sm" data-act="a9-main" data-arg="' + d.code + '">Сделать главной</button>') + '</div>' : '') +
          '</div>';
      }).join('');
      const j = jm();
      const need = !j && !s.doms.length;
      let foot;
      if (s.limit) foot = '<div class="onb-err">Можно выбрать до пяти целей. Снимите одну, чтобы добавить другую.</div>';
      else if (s.tried && need) foot = '<div class="onb-err">Отметьте хотя бы одну цель или нажмите «Просто знакомиться».</div>';
      else if (s.doms.length) foot = '<div class="onb-count">Выбрано <b>' + s.doms.length + '</b> из 5. Главная цель отмечена в карточке.</div>';
      else foot = '<div class="onb-count">' + (j ? 'Цели можно не выбирать или отметить и их: подбор учтёт оба варианта.' : 'Отметьте от одной до пяти целей.') + '</div>';
      return '<div class="scr">' +
        D.head({ back: 'A8', noBell: true, eyebrow: 'Шаг 2 из 3', title: 'Что главное в этом году?', sub: 'Отметьте до пяти целей и выберите главную', paren: paren('по ним подбираем программу, людей и решения') }) +
        progBar(2) +
        '<div class="onb-body">' +
        '<button class="onb-just' + (j ? ' on' : '') + '" data-act="a9-just" aria-pressed="' + j + '">' + icon('people') +
        '<span class="grow"><span class="onb-just-t">Просто знакомиться</span><span class="onb-just-d">Без цели: ' + esc(JM_TEXT) + '</span></span>' + (j ? icon('check') : '') + '</button>' +
        '<div class="onb-lab">Или отметьте свои цели</div>' +
        '<div class="onb-doms">' + cards + '</div>' +
        '<div class="onb-end"></div></div>' +
        '<div class="onb-foot">' + foot +
        '<button class="btn btn-primary btn-block" data-act="a9-next">Далее: запрос</button>' +
        '</div></div>';
    }
  });
  D.action('a9-dom', el => {
    const s = s9(), code = el.dataset.arg, i = s.doms.indexOf(code);
    s.limit = false; s.tried = false;
    if (i >= 0) { s.doms.splice(i, 1); if (s.main === code) s.main = s.doms[0] || null; }
    else if (s.doms.length >= 5) s.limit = true;
    else { s.doms.push(code); if (!s.main) s.main = code; }
    rr();
  });
  D.action('a9-main', el => { const s = s9(); s.main = el.dataset.arg; rr(); });
  D.action('a9-just', () => { const s10 = D.st('A10'); s10.justMeet = !s10.justMeet; s9().tried = false; rr(); });
  D.action('a9-next', () => {
    const s = s9();
    if (!jm() && !s.doms.length) { s.tried = true; rr(); return; }
    s.tried = false; s.done = true;
    push9(true);
    location.hash = '#/A10';
  });

  /* ---------- A10 Шаг 3 из 3: запрос ---------- */
  function s10() {
    const s = D.st('A10');
    if (!s.init) Object.assign(s, { init: true, tpl: null, own: false, text: '', horizon: 60, useful: '', hobby: '', tried: false, done: false });
    if (s.justMeet == null) s.justMeet = false;
    return s;
  }
  const textOk10 = s => s.text.trim().length >= 10;
  D.register('A10', {
    tab: null,
    meta: {
      title: 'A10 · Шаг 3 из 3: запрос',
      role: 'Участник, диагностика',
      fr: ['FR-ONB-05', 'FR-ONB-01', 'FR-ONB-12'],
      ac: ['AC-ONB-05', 'AC-ONB-12'],
      what: [
        'Вопрос «Что решить за 30–90 дней?»: поле запроса сверху, под ним девять шаблонов по темам (задачам каталога) и «Свой текст»; шаблон подставляется в поле и правится.',
        'Поле запроса с примером прозрачным текстом, выбор срока 30, 60 или 90 дней, поля «Чем могу быть полезен» и «Хобби» (хобби входит в минимум D-45).',
        'Кнопка «Просто знакомиться» рядом с запросом: запрос становится необязательным. Кнопка «Собрать путь» строит первый путь (A11).',
        'Состояния: запрос пуст (сообщение, переход закрыт), выбран шаблон (тег «Тема запроса»), выбрано «Просто знакомиться».'
      ],
      rules: [
        'Обязательно одно из двух: запрос или отметка «Просто знакомиться» (AC-ONB-05).',
        'У каждого шаблона есть задача каталога, по ней подбираются решения Маркетплейса; у своего текста задача уточняется вопросами (A14).',
        'Срок запроса 30, 60 или 90 дней: способ задания предложен, согласовать (FR-ONB-05).',
        'Хобби и польза необязательны; подбор использует их для знакомств по интересам.'
      ],
      depends: ['D-45', 'D-57']
    },
    html() {
      const s = s10();
      const j = s.justMeet;
      const bad = s.tried && !j && !textOk10(s);
      const isOwn = !s.tpl && (s.own || s.text.trim());
      const chips = T.REQUEST_TEMPLATES.map(t =>
        '<button class="chip' + (s.tpl === t.id ? ' on' : '') + '" data-act="a10-tpl" data-arg="' + t.id + '" aria-pressed="' + (s.tpl === t.id) + '">' + esc(t.task) + '</button>').join('') +
        '<button class="chip' + (isOwn ? ' on' : '') + '" data-act="a10-tpl" data-arg="own" aria-pressed="' + !!isOwn + '">Свой текст</button>';
      const tpl = T.REQUEST_TEMPLATES.find(t => t.id === s.tpl);
      const hz = [30, 60, 90].map(h => '<button class="chip' + (s.horizon === h ? ' on' : '') + '" data-act="a10-hz" data-arg="' + h + '" aria-pressed="' + (s.horizon === h) + '">' + h + ' дней</button>').join('');
      let foot;
      if (bad) foot = '<div class="onb-err">Опишите запрос хотя бы одной фразой или выберите шаблон. Если запрос пока не нужен, нажмите «Просто знакомиться».</div>';
      else foot = '<div class="onb-count">' + (j ? 'Запрос необязателен: вы отметили «Просто знакомиться».' : 'Последний шаг: после него соберём первый путь.') + '</div>';
      return '<div class="scr">' +
        D.head({ back: 'A9', noBell: true, eyebrow: 'Шаг 3 из 3', title: 'Что решить за 30–90 дней?', sub: 'Решения и люди подбираются под ваш запрос', paren: paren('можно взять шаблон и поправить') }) +
        progBar(3) +
        '<div class="onb-body">' +
        '<div class="onb-req">' +
        '<div class="field"><label for="a10-text">Ваш запрос' + (j ? ' <span class="cap">· необязательно</span>' : '') + '</label>' +
        '<textarea class="textarea' + (bad ? ' err' : '') + '" id="a10-text" maxlength="280" placeholder="Например: хочу открыть склад в новом регионе и найти партнёра по доставке за 60 дней">' + esc(s.text) + '</textarea>' +
        '<span class="counter" data-cnt>' + s.text.length + ' / 280</span>' +
        (tpl ? '<div class="onb-chips">' + tag('Тема запроса: ' + tpl.task, 'accent') + '</div>'
          : (s.text.trim() ? '<div class="onb-note">Свой текст. Тему запроса уточним вопросами в «Усилить путь».</div>' : '')) + '</div>' +
        '<div class="field"><span class="onb-lab">Или возьмите шаблон по теме</span><div class="onb-chips">' + chips + '</div></div>' +
        '<div class="field"><span class="onb-lab">Срок</span><div class="onb-chips">' + hz + '</div></div>' +
        '</div>' +
        '<button class="onb-just' + (j ? ' on' : '') + '" data-act="a9-just" aria-pressed="' + j + '">' + icon('people') +
        '<span class="grow"><span class="onb-just-t">Просто знакомиться</span><span class="onb-just-d">Запрос не обязателен: ' + esc(JM_TEXT) + '</span></span>' + (j ? icon('check') : '') + '</button>' +
        '<div class="field"><label for="a10-use">Чем могу быть полезен <span class="cap">· необязательно</span></label>' +
        '<textarea class="textarea" id="a10-use" maxlength="280" placeholder="Опыт, экспертиза, ресурсы: что вы можете предложить другим участникам">' + esc(s.useful) + '</textarea>' +
        '<span class="counter" data-cnt2>' + s.useful.length + ' / 280</span></div>' +
        '<div class="field"><label for="a10-hobby">Хобби <span class="cap">· необязательно</span></label>' +
        '<input class="input" id="a10-hobby" placeholder="Например: лыжи, шахматы, походы" value="' + esc(s.hobby) + '">' +
        '<span class="hint">Подбор использует хобби, чтобы знакомить по интересам</span></div>' +
        '<div class="onb-end"></div></div>' +
        '<div class="onb-foot">' + foot +
        '<button class="btn btn-primary btn-block" data-act="a10-build">Собрать путь</button>' +
        '</div></div>';
    },
    mount(host) {
      const s = s10();
      const bindTa = (sel, key, cnt) => {
        const el = host.querySelector(sel); if (!el) return;
        el.addEventListener('input', () => {
          s[key] = el.value;
          const c = host.querySelector(cnt); if (c) c.textContent = el.value.length + ' / 280';
          if (key === 'text' && s.tried && (s.justMeet || textOk10(s))) {
            el.classList.remove('err');
            const er = host.querySelector('.onb-foot .onb-err');
            if (er) { er.className = 'onb-count'; er.textContent = 'Последний шаг: после него соберём первый путь.'; }
          }
        });
      };
      bindTa('#a10-text', 'text', '[data-cnt]');
      bindTa('#a10-use', 'useful', '[data-cnt2]');
      const hb = host.querySelector('#a10-hobby');
      if (hb) hb.addEventListener('input', () => { s.hobby = hb.value; });
      const t1 = host.querySelector('#a10-text');
      const grow = () => { if (t1) { t1.style.height = 'auto'; t1.style.height = Math.max(112, t1.scrollHeight + 2) + 'px'; } };
      grow();
      if (t1) t1.addEventListener('input', grow);
      if (s.focusText) { s.focusText = false; if (t1) t1.focus(); }
    }
  });
  D.action('a10-tpl', el => {
    const s = s10(), id = el.dataset.arg;
    if (id === 'own') {
      /* «Свой текст»: снять шаблон; подставленный шаблонный текст очищается, собственный остаётся */
      const was = T.REQUEST_TEMPLATES.find(t => t.id === s.tpl);
      if (was && s.text === was.text) s.text = '';
      s.tpl = null; s.own = true; s.focusText = true;
    } else {
      const t = T.REQUEST_TEMPLATES.find(x => x.id === id);
      s.tpl = id; s.own = false; s.text = t.text;
    }
    rr();
  });
  D.action('a10-hz', el => { s10().horizon = +el.dataset.arg; rr(); });
  D.action('a10-build', () => {
    const s = s10();
    if (!s.justMeet && !textOk10(s)) { s.tried = true; rr(); const ta = document.querySelector('#a10-text'); if (ta) ta.focus(); return; }
    s.tried = false; s.done = true;
    push10();
    D.st('A11').phase = 'build'; D.st('A11').accepted = false;
    location.hash = '#/A11';
  });

  /* ---------- A8–A10 → PS и ME: запись при подтверждении шага ----------
     Вызываются из «Далее» (A8, A9), «Собрать путь» (A10) и из мест, которые потом меняют те же поля (A12 шаг 5, быстрый аудит, A14). */
  function push8() {
    const a = D.st('A8');
    if (!PS || !a.done) return;
    const name = a.name.trim(), parts = name.split(/\s+/);
    a.other = name !== DEMO.name || a.company.trim() !== DEMO.company;
    PS.set('name', name);
    ME.first = parts[0];
    /* строка билета «Фамилия Имя Отчество»: отчество не спрашивается, для двух слов — «Фамилия Имя» */
    ME.patronymic = name === DEMO.name ? DEMO.patronymic : (parts.length === 2 ? parts[1] + ' ' + parts[0] : name);
    ME.phone = a.phone.trim();
    ME.email = a.email.trim();
    PS.set('company', a.company.trim());
    PS.set('site', a.site.trim());
    PS.set('industry', a.industry);
    PS.set('revenue', a.revenue);
    PS.set('communities', a.comm.slice());
    /* другой человек: спорт, Instagram и Telegram демо-участника ему не принадлежат; их вводят в «Усилить путь» (A12) */
    if (a.other && !a.blanked) { a.blanked = true; ['sport', 'instagram', 'telegram'].forEach(id => PS.set(id, '')); }
  }
  /* form: запись из формы A9 (там же переключается «Просто знакомиться»); из A12 и A14 эта отметка не трогается */
  function push9(form) {
    const a = D.st('A9');
    if (!PS || !a.done) return;
    const first = !a.pushed, before = PS.goalsLine(), keep = {}, doms = (a.doms || []).slice();
    if (!first) PS.goals.forEach(g => { keep[g.code] = g.note; });
    PS.goals = doms.map(c => ({ code: c, note: keep[c] || '' }));
    PS.main = a.main && doms.includes(a.main) ? a.main : (doms[0] || null);
    ME.domains = doms.slice(); ME.mainDomain = PS.main;
    if (form || first) { PS.justMeet = !!D.st('A10').justMeet; ME.justMeet = PS.justMeet; }
    a.pushed = true;
    const after = PS.goalsLine();
    if (first && !histReset) { histReset = true; PS.history.length = 0; }
    if (after !== before || (first && after)) onbLog('Цели', first ? '' : before, after);
  }
  /* keep: запись из A14 после того, как поля могли поправить в кабинете (срок, «просто знакомиться», хобби остаются как в PS) */
  function push10(keep) {
    const a = D.st('A10');
    if (!PS || !a.done) return;
    const first = !a.pushed, tpl = T.REQUEST_TEMPLATES.find(t => t.id === a.tpl);
    const text = (a.text || '').trim();
    const j = keep && !first ? !!PS.justMeet : !!a.justMeet, hz = keep && !first ? PS.horizon : (a.horizon || 60);
    const oldReq = PS.requestLine(), oldH = PS.horizon, oldUse = PS.val.usefulness || '';
    const keepDemo = !otherPerson();
    PS.request = text; PS.requestTask = tpl ? tpl.task : '';
    PS.justMeet = j; PS.horizon = hz;
    ME.request = text; ME.requestTask = PS.requestTask; ME.justMeet = j;
    const use = (a.useful || '').trim() || (keepDemo ? DEMO.usefulness : '');
    PS.set('usefulness', use);
    if (!keep || first) PS.set('hobby', (a.hobby || '').trim() || (keepDemo ? DEMO.hobby : ''));
    a.pushed = true;
    if (first && !histReset) { histReset = true; PS.history.length = 0; }
    const newReq = PS.requestLine();
    if (first || oldReq !== newReq) onbLog('Запрос на 30–90 дней', first ? '' : oldReq, newReq);
    if (first || oldH !== hz) onbLog('Горизонт запроса', first ? '' : oldH + ' дней', hz + ' дней');
    if (use !== oldUse && (use || !first)) onbLog('Чем могу быть полезен', first ? '' : oldUse, use);
  }

  /* ---------- снимок диагностики: что сейчас в общем состоянии профиля (FIX.PS) ----------
     Введённое в A8–A10 записано туда при подтверждении шага; если шаги не пройдены, там данные демо-участника.
     Читают A11–A14; наружу отдан как Demo.onboarding() (для других разделов, только чтение). */
  function snap() {
    const a9 = D.st('A9'), a10 = D.st('A10'), v = PS.val;
    const sn = {};
    sn.goalsOwn = !!a9.done;
    sn.reqOwn = !!a10.done;
    sn.demo = !(a9.done || a10.done);
    sn.doms = PS.goals.map(g => g.code);
    sn.main = PS.main;
    sn.justMeet = !!PS.justMeet;
    sn.request = sn.justMeet && !a10.done ? '' : (PS.request || '');
    sn.task = sn.request ? (PS.requestTask || null) : null;
    sn.horizon = PS.horizon || 60;
    sn.useful = v.usefulness || '';
    sn.hobby = v.hobby || '';
    sn.company = v.company || '';
    sn.industry = v.industry || '';
    sn.site = v.site || '';
    sn.revenue = v.revenue || '';
    sn.name = v.name || '';
    return sn;
  }
  D.onboarding = snap;

  /* ---------- A11 Ваш первый путь ---------- */
  const FIRST_DAY = '26.02';
  const SOC = { networking: 1, leisure: 1, person: 1, buyer: 1 };
  const SESSION_LIKE = { session: 1, practice: 1, leisure: 1, networking: 1 };
  const TYPE_LABEL = { session: 'Сессия', practice: 'Практика', leisure: 'Досуг', networking: 'Нетворкинг', kipatalk: 'КипяTALK',
    stand: 'Стенд', mentor: 'Менторская встреча', person: 'Знакомство', buyer: 'Встреча с покупателем', task: 'Дело' };
  const toMin = t => { const p = String(t).split(':'); return (+p[0]) * 60 + (+p[1]); };

  function itemMeta(it) {
    return {
      sess: SESSION_LIKE[it.type] && F.session ? F.session(it.ref) : null,
      ex: (it.type === 'kipatalk' || it.type === 'stand') && F.exhibitor ? F.exhibitor(it.ref) : null
    };
  }
  /* домен цели для пункта по таблице соответствий (05_TAXONOMY, раздел 2): рычаг сессии, задача экспонента, метка досуга;
     G6 «окружение» подходит людям и нетворкингу; главный домен проверяется первым */
  function matchDomain(it, sn) {
    const m = itemMeta(it);
    const order = sn.doms.slice();
    if (sn.main && order.includes(sn.main)) { order.splice(order.indexOf(sn.main), 1); order.unshift(sn.main); }
    const lever = m.sess ? m.sess.lever : null;
    const task = m.ex ? m.ex.cluster : null;
    const label = m.sess ? (m.sess.label || 'Бизнес') : null;
    for (const code of order) {
      if (code === 'G6') continue;
      const d = dom(code); if (!d) continue;
      if (lever && d.levers.includes(lever)) return code;
      if (task && d.tasks.includes(task)) return code;
      if (label && label !== 'Бизнес' && d.labels.includes(label)) return code;
    }
    return order.includes('G6') && (it.type === 'networking' || it.type === 'person' || it.type === 'buyer') ? 'G6' : null;
  }
  function reasonOf(it, sn) {
    const m = itemMeta(it);
    if (sn.justMeet && SOC[it.type]) return { text: 'вы выбрали: просто знакомиться', match: true, req: false };
    if (!sn.justMeet && m.ex && sn.task && m.ex.cluster === sn.task) return { text: 'ваш запрос: ' + sn.task, match: true, req: true };
    const code = sn.justMeet && !SOC[it.type] ? null : matchDomain(it, sn);
    if (code) return { text: 'ваша цель: ' + domTitle(code), match: true, req: false };
    return { text: 'общая программа первого дня', match: false, req: false };
  }
  /* первый путь: пункты первого дня (26.02) из FIX.PATH_ITEMS, 4–5 штук, без пересечений по времени.
     С запросом — деловые пункты вперёд и не больше одного пункта знакомств; «просто знакомиться» — знакомства и досуг
     вперёд и не больше двух деловых (AC-ONB-05). Статус для показа везде «предложен». */
  function firstPath(sn) {
    try { if (F.pathSyncProgram) F.pathSyncProgram(); } catch (e) { /* данные S3 могут быть не подключены */ }
    const pool = (F.PATH_ITEMS || []).filter(it => it.day === FIRST_DAY && !/^pu/.test(it.id) && it.type !== 'task' && it.status !== 'skipped' && it.status !== 'replaced');
    const rows = pool.map(it => {
      const r = reasonOf(it, sn);
      return { it, r, soc: !!SOC[it.type], score: (r.match ? 2 : 0) + (r.req ? 1 : 0) };
    }).sort((a, b) => (b.score - a.score) || (toMin(a.it.time) - toMin(b.it.time)));
    const quota = sn.justMeet ? { soc: 9, biz: 2 } : { soc: 1, biz: 9 };
    const chosen = [];
    const clash = r => chosen.some(c => toMin(r.it.time) < toMin(c.it.time) + c.it.dur && toMin(c.it.time) < toMin(r.it.time) + r.it.dur);
    const count = soc => chosen.filter(c => c.soc === soc).length;
    rows.forEach(r => {
      if (chosen.length >= 5 || clash(r)) return;
      if (count(r.soc) >= (r.soc ? quota.soc : quota.biz)) return;
      chosen.push(r);
    });
    if (chosen.length < 4) rows.forEach(r => { if (chosen.length < 4 && !chosen.includes(r) && !clash(r)) chosen.push(r); });
    return chosen.sort((a, b) => toMin(a.it.time) - toMin(b.it.time));
  }
  function linkOf(it) {
    switch (it.type) {
      case 'session': case 'practice': case 'leisure': return 'C3/' + it.ref;
      case 'networking': return /^fp/.test(it.ref) ? 'R4/' + it.ref : 'C3/' + it.ref;
      case 'mentor': return 'C5/' + it.ref;
      case 'kipatalk': case 'stand': return 'H2/' + it.ref;
      case 'person': case 'buyer': return 'F2/' + it.ref;
      default: return null;
    }
  }

  D.register('A11', {
    tab: null,
    meta: {
      title: 'A11 · Ваш первый путь',
      role: 'Участник, диагностика',
      fr: ['FR-ONB-01', 'FR-PATH-05', 'FR-PATH-07'],
      ac: ['AC-ONB-01', 'AC-ONB-05'],
      what: [
        'Состояние загрузки «Собираем ваш путь», затем экран «Ваш путь готов» с подписью «Готово за 3 минуты».',
        'Первым стоит путь: черновик на первый день (26.02) из FIX.PATH_ITEMS, 4–5 пунктов с временем, местом, причиной и ссылкой на карточку; у платных экспонентов метка «на площадке». Путь виден на первом экране.',
        'Ниже компактная сводка введённого, она читается из общего состояния профиля (FIX.PS): имя, компания и отрасль; цель (и остальные цели); запрос на 30–90 дней с темой запроса; у каждой строки «Изменить» (A8, A9, A10).',
        'Кнопка «Принять путь» (ведёт в «Мой путь», B1) закреплена внизу; «Другие версии» (B5), «Усилить путь» (A12), строки установки на экран (A5) и Telegram (A7).'
      ],
      rules: [
        'Пункты выбираются по цели и запросу: деловые вперёд и не больше одного пункта знакомств; при «Просто знакомиться» знакомства и досуг вперёд и не больше двух деловых (AC-ONB-05).',
        'Причина — по таксономии: «ваша цель: …», «ваш запрос: …», «вы выбрали: просто знакомиться»; у пункта без совпадения — «общая программа первого дня».',
        'Статус пунктов прошедших дней для показа считается «предложен» (в данных они done, replaced): общая подпись под списком, а не метка у каждого пункта.',
        'Платные пункты (экспоненты «Экспо+» и «Премиум») подписаны «на площадке»; их доля ограничена параметром менеджера Экспо (30% предложено, согласовать).',
        'Если шаги диагностики не пройдены, показан пример на данных демо-участника (плашка внизу экрана). После новой сборки путь снова надо принять.'
      ],
      depends: ['D-45', 'D-57', 'D-40']
    },
    html(ctx) {
      const st = ctx.state;
      if (st.phase === 'build') {
        return '<div class="scr">' +
          D.head({ back: 'A10', noBell: true, eyebrow: 'Собираем', title: 'Собираем ваш путь', sub: 'Учитываем цель, запрос и программу первого дня', paren: paren('подбор выполняется автоматически') }) +
          '<div class="onb-body">' +
          '<div class="card onb-build">' + icon('spark') + '<div><div class="card-title">Собираем ваш путь</div><div class="cap">Это займёт несколько секунд</div></div></div>' +
          '<div class="onb-skel"></div><div class="onb-skel"></div><div class="onb-skel"></div>' +
          '<div class="onb-end"></div></div></div>';
      }
      const sn = snap();
      const path = firstPath(sn);
      const n = path.length;
      const more = sn.doms.filter(c => c !== sn.main);
      const goalV = sn.main ? domTitle(sn.main) : (sn.justMeet ? 'Просто знакомиться' : 'Цель не выбрана');
      const goalM = (sn.main && sn.justMeet ? '<span class="onb-cs-m">и «Просто знакомиться»</span>' : '') +
        (more.length ? '<span class="onb-cs-m">ещё: ' + esc(more.map(domTitle).join(', ')) + '</span>' : '');
      const reqV = sn.request || (sn.justMeet ? 'Не указан: вы выбрали «Просто знакомиться»' : 'Не указан');
      const who = '<div class="onb-cs"><div class="onb-cs-t"><span class="onb-cs-k">Участник</span><span class="onb-cs-v">' + esc(sn.name || '—') + '</span>' +
        '<span class="onb-cs-m">' + esc([sn.company, sn.industry].filter(Boolean).join(' · ')) + '</span></div>' +
        '<button class="onb-edit" data-go="A8">Изменить</button></div>';
      const sum = '<div class="card onb-cs-card">' + who +
        '<div class="onb-cs"><div class="onb-cs-t"><span class="onb-cs-k">' + (sn.doms.length > 1 ? 'Главная цель' : 'Цель') + '</span><span class="onb-cs-v">' + esc(goalV) + '</span>' + goalM + '</div>' +
        '<button class="onb-edit" data-go="A9">Изменить</button></div>' +
        '<div class="onb-cs"><div class="onb-cs-t"><span class="onb-cs-k">Запрос на ' + sn.horizon + ' дней</span><span class="onb-cs-v">' + esc(reqV) + '</span>' +
        (sn.task ? '<span class="onb-cs-m">Тема запроса: ' + esc(sn.task) + '</span>' : '') + '</div>' +
        '<button class="onb-edit" data-go="A10">Изменить</button></div>' +
        '</div>';

      const rows = path.map(r => {
        const it = r.it, go = linkOf(it);
        return '<div class="prog-item"><div class="pi-time">' + esc(it.time) + '</div><div class="pi-body">' +
          '<div class="onb-pi-meta"><span>' + esc(TYPE_LABEL[it.type] || '') + '</span><span>' + it.dur + ' мин</span>' + (it.place ? '<span>' + esc(it.place) + '</span>' : '') + '</div>' +
          '<div class="pi-title">' + (go ? '<button class="onb-go" data-go="' + esc(go) + '">' + esc(it.title) + '</button>' : esc(it.title)) + '</div>' +
          '<div class="onb-reason">' + icon('spark') + '<span>' + esc(r.r.text) + '</span></div>' +
          (it.paid ? '<div class="onb-pi-tags">' + tag('на площадке', 'accent') + '</div>' : '') +
          '</div></div>';
      }).join('');
      const paid = path.filter(r => r.it.paid).length;
      const A5s = D.st('A5').allowed, A7s = D.st('A7').linked;
      const ntf = '<div class="card onb-ntf-rows"><div class="list">' +
        '<button class="row clickable" data-go="A5">' + icon('bell') + '<div class="grow"><div class="r-title">Установить на экран</div><div class="r-sub">' + (A5s ? 'Уведомления разрешены' : 'Уведомления и быстрый вход в один тап') + '</div></div>' + icon('chevR') + '</button>' +
        '<button class="row clickable" data-go="A7">' + icon('send') + '<div class="grow"><div class="r-title">Привязать Telegram</div><div class="r-sub">' + (A7s ? 'Telegram привязан' : 'Срочные изменения пути и ответы помощника') + '</div></div>' + icon('chevR') + '</button>' +
        '</div></div>';

      return '<div class="scr">' +
        D.head({ back: 'A10', noBell: true, eyebrow: 'Готово за 3 минуты', title: 'Ваш путь готов', sub: 'Первый день, 26 февраля: ' + n + ' ' + plural(n, ['пункт', 'пункта', 'пунктов']) + ' под вашу цель и запрос', paren: paren('подбор выполняется автоматически, менять можно всё') }) +
        '<div class="onb-body">' +
        '<div class="sec-title">Первый день<button class="more" data-go="B4/d2602">Весь день</button></div>' +
        '<div class="card onb-pi-list">' + rows + '</div>' +
        '<div class="onb-note">' + (paid ? 'Метка «на площадке» у решений экспонентов: ' + paid + ' из ' + n + '. ' : '') + 'Все пункты предложены: примите путь, замените или уберите любой из них позже.</div>' +
        (st.accepted ? '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Путь принят</div><div class="cap">Он открыт в «Мой путь». Версии и замены доступны там же.</div></div></div>' : '') +
        sum +
        '<div style="display:flex;gap:8px"><button class="btn btn-secondary btn-block" data-go="B5">Другие версии</button>' +
        '<button class="btn btn-secondary btn-block" data-go="A12">Усилить путь</button></div>' +
        ntf +
        (sn.demo ? '<div class="banner info">' + icon('info') + '<div><div class="cap">Показан пример на данных демо-участника. Пройдите три шага, чтобы собрать свой путь.</div></div></div>' : '') +
        '<div class="onb-end"></div></div>' +
        '<div class="onb-foot">' +
        (st.accepted
          ? '<button class="btn btn-primary btn-block" data-go="B1">Открыть «Мой путь»</button>'
          : '<button class="btn btn-primary btn-block" data-act="a11-accept">Принять путь</button>') +
        '</div></div>';
    },
    mount(host, ctx) {
      const st = D.st('A11');
      if (st.phase === 'build') {
        setTimeout(() => { st.phase = 'ready'; if (onScreen('A11')) D.rerender(); }, 1400);
      }
    }
  });
  D.action('a11-accept', () => {
    D.st('A11').accepted = true;
    D.toast('Путь принят');
    location.hash = '#/B1';
  });

  /* ---------- A12 Усилить путь ---------- */
  const STEPS = [
    { n: 1, t: 'Спорт', d: 'Подберём спортивные форматы' },
    { n: 2, t: 'Польза для других подробнее', d: 'Чем можете помочь другим' },
    { n: 3, t: 'Instagram и Telegram', d: 'Видят те, с кем у вас встреча' },
    { n: 4, t: 'Семья и дети', d: 'Подтвердите данные, полученные от менеджеров' },
    { n: 5, t: 'Ещё цели', d: 'До пяти целей, одна главная' },
    { n: 6, t: 'Фото', d: 'Участники узнают вас на встрече' },
    { n: 7, t: 'Уточняющие вопросы', d: 'Три вопроса: чипами или голосом', go: 'A14' },
    { n: 8, t: 'Питч для интро', d: 'ИИ предлагает, публикуете вы', go: 'A13' },
    { n: 9, t: 'Быстрый аудит', d: 'Для тех, кто не знает свою цель' },
    { n: 10, t: 'Три ролика', d: 'О фестивале, программе и приложении' }
  ];
  const AUDIT_Q = [
    ['G1', 'Выручка и прибыль'], ['G3', 'Команда и внедрение ИИ'],
    ['G5', 'Ресурс и состояние собственника'], ['G6', 'Окружение: партнёры, клиенты, связи']
  ];
  const VIDEOS = [['О фестивале', '5 минут'], ['О программе', '5 минут'], ['О приложении', '2 минуты']];
  const famField = id => T.PROFILE_FIELDS.find(f => f.id === id);
  const normFamily = v => (v === 'Женат' || v === 'Замужем') ? 'Женат/замужем' : v;

  /* Статус шага считается только по введённому человеком (A8–A10, A12–A14). Данные демо-участника подставляются
     кнопкой «Для показа» (fillDemo), а не берутся из ME молча. */
  function s12() {
    const s = D.st('A12');
    if (!s.init) {
      Object.assign(s, { init: true, skipped: {}, sport: '', use: '', insta: '', tg: '', family: '', kids: '', famOk: false, famTmp: null,
        photo: false, vids: {}, audit: {}, auditDone: false, auditRes: null, last: null, dirty: false, goalsEdit: null });
    }
    return s;
  }
  /* для показа: данные демо-участника в A8 и в шагах 1–4 «Усилить путь» (и цели G2+G6, если A9 не пройден) */
  function fillDemo(withGoals) {
    const a8 = s8();
    Object.assign(a8, { company: DEMO.company, site: DEMO.site, industry: DEMO.industry, revenue: DEMO.revenue, comm: [T.COMMUNITIES[0]] });
    const s = s12();
    Object.assign(s, { sport: DEMO.sport, use: DEMO.usefulness, insta: DEMO.instagram, tg: DEMO.telegram, family: normFamily(DEMO.family), kids: DEMO.kids, famOk: true });
    push12(1); push12(2); push12(3); push12(4);
    if (withGoals) {
      const a9 = s9();
      if (!a9.done) { a9.doms = DEMO.domains.slice(); a9.main = DEMO.mainDomain; a9.done = true; push9(); }
    }
    syncSteps();
  }
  /* A12, шаги 1–4 → PS и ME. Семейное положение подтверждается в самом шаге («Подтвердить данные»); дети записываются как
     заявленное значение (PS.val.kids, ME.kids), а подтверждение по именам остаётся в «Семья и команда» (L5): PS.family.kids не меняется. */
  function push12(n) {
    if (!PS) return;
    const s = s12();
    switch (n) {
      case 1: PS.set('sport', s.sport.trim()); break;
      case 2: {
        const old = PS.val.usefulness || '', t = (s.use || '').trim();
        PS.set('usefulness', t);
        if (t !== old) onbLog('Чем могу быть полезен', old, t);
        break;
      }
      case 3: PS.set('instagram', s.insta.trim()); PS.set('telegram', s.tg.trim()); break;
      case 4:
        PS.set('family', s.family);
        PS.set('kids', s.kids);
        PS.family.marital = { value: s.family, state: 'confirmed' };
        break;
      default: break;
    }
  }
  /* введённое в A12 живёт в общем состоянии: если поле позже правили в «Профиле» (L7) или в «Цели и запросы» (L8), A12 это видит */
  function pull12() {
    if (!PS) return;
    const s = s12(), v = PS.val;
    if (s.sport) s.sport = v.sport || '';
    if (s.use) s.use = v.usefulness || '';
    if (s.insta || s.tg) { s.insta = v.instagram || ''; s.tg = v.telegram || ''; }
  }
  /* число выполненных шагов «Усилить путь» читает и «Мой путь» до события (B1/pre): ME.profileStepsDone — это шаги, а не проценты полей */
  function syncSteps() { ME.profileStepsDone = doneCount(); ME.profileStepsTotal = STEPS.length; }
  const useVal = () => {
    const s = s12(), a10 = D.st('A10');
    const entered = (s.use || '').trim() || (a10.done ? (a10.useful || '').trim() : '');
    return entered && PS ? (PS.val.usefulness || '') : entered;
  };
  const goalsEntered = () => { const a9 = D.st('A9'); return a9.done ? (PS ? PS.goals.length : (a9.doms || []).length) : 0; };
  function stepDone(n) {
    const s = s12();
    switch (n) {
      case 1: return !!s.sport.trim();
      case 2: return !!useVal();
      case 3: return !!(s.insta.trim() || s.tg.trim());
      case 4: return !!s.famOk;
      case 5: return goalsEntered() >= 2;
      case 6: return !!s.photo;
      case 7: return !!D.st('A14').completed;
      case 8: return !!D.st('A13').progress;
      case 9: return !!s.auditDone;
      case 10: return Object.keys(s.vids).length >= VIDEOS.length;
      default: return false;
    }
  }
  const doneCount = () => STEPS.filter(p => stepDone(p.n)).length;
  function valueOf(n) {
    const s = s12();
    switch (n) {
      case 1: return s.sport;
      case 2: return useVal();
      case 3: return [s.insta, s.tg].filter(Boolean).join(' · ');
      case 4: return s.family + (s.kids ? ' · дети: ' + lowerFirst(s.kids) + ', подтвердите в разделе «Семья и команда»' : '');
      case 5: return 'Целей: ' + goalsEntered() + ' из 5';
      case 6: return 'Фото выбрано';
      case 7: return 'Ответы разобраны, путь обновлён';
      case 8: return D.st('A13').published ? 'Питч отправлен в ленту' : 'Черновики сохранены';
      case 9: return s.auditRes ? 'Предложена цель: ' + domTitle(s.auditRes) : 'Аудит пройден, цель можно не добавлять';
      case 10: return 'Просмотрено: ' + VIDEOS.length + ' из ' + VIDEOS.length;
      default: return '';
    }
  }
  const pathLine = id => { const it = F.pathItem && F.pathItem(id); return it ? it.title + ' (' + it.day + ', ' + it.time + ')' : null; };
  /* что пересчёт пути предлагает после шага: берётся из пунктов, которые уже есть в FIX.PATH_ITEMS (источник «ИИ», статус «предложен») */
  const RECALC = {
    1: { ids: ['pi28'], note: 'Спорт учтён: подбор предлагает спортивный и утренний формат.' },
    2: { ids: ['pi31'], note: 'Польза учтена: подбор предлагает менторскую встречу по вашей теме.' },
    3: { ids: [], note: 'Путь не менялся. Instagram и Telegram видят только те, с кем у вас назначена встреча.' },
    4: { ids: ['pi37'], note: 'Семья учтена: подбор предлагает семейный формат.' },
    5: { ids: [], note: 'Новые цели учтены: подбор применит их при следующей пересборке пути.' },
    6: { ids: [], note: 'Путь не менялся. Фото появится в вашей карточке у участников.' },
    7: { ids: [], note: 'Ответы учтены: подбор применил их при пересчёте пути.' },
    8: { ids: [], note: 'Путь не менялся. Питч увидят участники в ленте после проверки модератора.' },
    9: { ids: [], note: 'Аудит учтён. Предложенную цель можно добавить кнопкой в листе аудита.' },
    10: { ids: [], note: 'Путь не менялся. Ролики помогают быстрее освоить приложение.' }
  };
  const visCap = id => {
    const v = (ME.visibility || {})[id] || 'all';
    const lv = T.VISIBILITY.find(x => x.id === v);
    return '<div class="onb-vis-cap">' + icon(v === 'only_me' ? 'lock' : 'eye') + 'Видимость: ' + esc(lv ? lv.label : '') + '</div>';
  };

  function sheetHTML(n) {
    const s = s12(), p = STEPS[n - 1], done = stepDone(n);
    const head = '<div class="sheet-title">' + esc(p.t) + '</div><div class="cap" style="margin-bottom:10px">' + esc(n === 9 ? 'Для тех, кто не знает свою цель: оцените четыре сферы, а мы предложим цель' : p.d) + '</div>';
    const later = n === 9 && s.auditDone ? '' : (done
      ? '<button class="btn btn-ghost btn-block" data-act="a12-close">Закрыть</button>'
      : '<button class="btn btn-ghost btn-block" data-act="a12-skip" data-arg="' + n + '">Пропустить пока</button>');
    const foot = '<button class="btn btn-primary btn-block" data-act="a12-save" data-arg="' + n + '">Сохранить</button>' + later;
    const chipsOf = (grp, list, cur) => '<div class="onb-chips">' + list.map(v =>
      '<button class="chip' + (cur === v ? ' on' : '') + '" data-act="a12-pick" data-grp="' + grp + '" data-val="' + esc(v) + '">' + esc(v) + '</button>').join('') + '</div>';
    switch (n) {
      case 1: return head + visCap('sport') +
        '<div class="field"><label for="a12-f">Спорт</label><input class="input" id="a12-f" placeholder="Например: горные лыжи, бег по утрам" value="' + esc(s.sport) + '"></div>' + foot;
      case 2: return head + visCap('usefulness') +
        '<div class="field"><label for="a12-f">Чем могу быть полезен</label><textarea class="textarea" id="a12-f" maxlength="280" placeholder="Опыт, экспертиза, ресурсы: что вы можете предложить другим">' + esc(useVal()) + '</textarea></div>' + foot;
      case 3: return head + visCap('instagram') +
        '<div class="field"><label for="a12-f">Instagram</label><input class="input" id="a12-f" placeholder="@имя" value="' + esc(s.insta) + '"></div>' +
        '<div class="field" style="margin-top:10px"><label for="a12-g">Telegram</label><input class="input" id="a12-g" placeholder="@имя" value="' + esc(s.tg) + '"></div>' + foot;
      case 4: {
        /* значения из билета предложены, но в профиль попадают только после «Подтвердить данные» */
        s.famTmp = { family: s.family || normFamily(ME.family), kids: s.kids || ME.kids };
        return head +
          '<div class="banner info">' + icon('ticket') + '<div class="cap">Эти данные мы получили от менеджеров. Они никому не показываются, пока вы их не подтвердите, и не попадают в подбор. Семейное положение подтверждается здесь; детей и спутника подтвердите по именам в разделе «Семья и команда».</div></div>' +
          '<div class="field" style="margin-top:12px"><span class="onb-lab">Семейное положение <span class="cap">· из вашего билета</span></span>' + chipsOf('family', famField('family').options, s.famTmp.family) + '</div>' +
          '<div class="field" style="margin-top:12px"><span class="onb-lab">Дети <span class="cap">· из вашего билета</span></span>' + chipsOf('kids', famField('kids').options, s.famTmp.kids) + '</div>' +
          '<button class="btn btn-primary btn-block" data-act="a12-save" data-arg="4">Подтвердить данные</button>' + later;
      }
      case 5: {
        const a9 = D.st('A9');
        s.goalsEdit = a9.done ? snap().doms : [];
        return head +
          '<div class="onb-chips">' + T.DOMAINS.map(d =>
            '<button class="chip' + (s.goalsEdit.includes(d.code) ? ' on' : '') + '" data-act="a12-goal" data-val="' + d.code + '">' + esc(d.title) + '</button>').join('') + '</div>' +
          '<div class="onb-err" data-glimit hidden style="margin-top:8px">Можно выбрать до пяти целей. Снимите одну, чтобы добавить другую.</div>' + foot;
      }
      case 6: return head +
        '<div class="onb-photo"><div class="onb-photo-ph' + (s.photo ? ' on' : '') + '" data-ph>' + (s.photo ? 'Фото выбрано' : 'фото') + '</div>' +
        '<div><button class="btn btn-secondary btn-sm" style="min-height:40px" data-act="a12-photo">' + (s.photo ? 'Заменить фото' : 'Выбрать фото') + '</button>' +
        '<div class="cap" style="margin-top:6px">Макет: файл в демо не загружается</div></div></div>' + foot;
      case 9: return head +
        '<div class="onb-rate-l onb-rate-top"><span>1 — тревожит</span><span>5 — всё хорошо</span></div>' +
        AUDIT_Q.map((q, i) => '<div class="onb-sph"><div class="onb-sph-t">' + esc(q[1]) + '</div><div class="onb-rate">' +
          [1, 2, 3, 4, 5].map(v => '<button class="chip' + (s.audit[i] === v ? ' on' : '') + '" data-act="a12-rate" data-i="' + i + '" data-val="' + v + '" aria-label="' + esc(q[1]) + ': ' + v + ' из 5">' + v + '</button>').join('') +
          '</div></div>').join('') +
        '<div data-audit-res>' + (s.auditDone ? auditResHTML() : '') + '</div>' +
        '<button class="btn btn-primary btn-block" data-act="a12-audit-do" data-arg="9">' + (s.auditDone ? 'Пересчитать' : 'Показать результат') + '</button>' + later;
      case 10: return head +
        VIDEOS.map((v, i) => '<div class="onb-vd" data-vd="' + i + '"><div class="onb-vd-ph">' + icon('play') + '</div>' +
          '<div class="grow"><div class="onb-vd-t">' + esc(v[0]) + '</div><div class="cap">' + esc(v[1]) + (s.vids[i] ? ' · просмотрен' : '') + '</div></div>' +
          '<button class="btn btn-secondary btn-sm" data-act="a12-vid" data-arg="' + i + '">' + (s.vids[i] ? 'Ещё раз' : 'Смотреть') + '</button></div>').join('') +
        '<div class="onb-note" style="margin-top:8px">Ролики готовятся: в демо воспроизведение имитируется.</div>' +
        '<button class="btn btn-primary btn-block" data-act="a12-close">Закрыть</button>';
      default: return head;
    }
  }
  function auditResHTML() {
    const s = s12();
    if (s.auditRes) {
      return '<div class="banner info" style="margin-top:8px">' + icon('spark') + '<div><div class="b-title">Предлагаем цель</div><div class="cap">Меньше всего вас устраивает: ' + esc(domTitle(s.auditRes)) + '. Её можно сделать целью.</div>' +
        '<button class="btn btn-secondary btn-sm" style="min-height:40px;margin-top:8px" data-act="a12-audit-add">Добавить как цель</button></div></div>';
    }
    return '<div class="banner ok" style="margin-top:8px">' + icon('check') + '<div class="cap">Во всех четырёх сферах оценки высокие. Новую цель добавлять не нужно.</div></div>';
  }

  function openStep(n) {
    const s = s12();
    D.openSheet('<div class="onb-sheet">' + sheetHTML(n) + '</div>');
    const fr = document.querySelector('.frame');
    if (!fr) return;
    /* лист закрыт крестом, подложкой или Esc: если состояние менялось внутри, перерисовать список шагов */
    const obs = new MutationObserver(() => {
      if (!fr.querySelector('.sheet-wrap')) { obs.disconnect(); if (s.dirty && onScreen('A12')) { s.dirty = false; rr(); } }
    });
    obs.observe(fr, { childList: true });
  }

  D.register('A12', {
    tab: null,
    meta: {
      title: 'A12 · Усилить путь',
      role: 'Участник, диагностика',
      fr: ['FR-ONB-03', 'FR-ONB-06', 'FR-ONB-07', 'FR-ONB-11'],
      ac: ['AC-ONB-03', 'AC-ONB-06'],
      what: [
        'Список из ровно десяти шагов с прогрессом «N из 10»: 1 Спорт; 2 Польза для других подробнее; 3 Instagram и Telegram; 4 Семья и дети; 5 Ещё цели; 6 Фото; 7 Уточняющие вопросы; 8 Питч для интро; 9 Быстрый аудит; 10 Три ролика. Счёт идёт по шагам (подпись «шагов выполнено»); при десяти из десяти метка «Все шаги выполнены». Под счётом отдельной строкой заполненность профиля по полям (FIX.PS.fill(), формула FR-PROF-13): то же число, что в кабинете.',
        'Рядом с прогрессом карточка «Следующий шаг» с главной кнопкой, которая открывает именно его. Невыполненные шаги стоят выше выполненных; у каждого чип статуса («Готово», «Пропущено», «Не начато») и кнопка («Открыть» или «Изменить»).',
        'Шаги 1–6, 9 и 10 открываются листом; шаги 7 и 8 ведут в A14 и A13. После шага показан итог пересчёта пути.',
        'Статус шага считается по введённому в A8–A10 и в самом A12 (по умолчанию «Не начато»); введённое пишется в общее состояние профиля (FIX.PS и FIX.ME), поэтому кабинет и «Мой путь» его видят. Ссылка «Для показа: подставить данные демо-участника» заполняет шаги 1–5 данными демо-участника, тогда прогресс «5 из 10».'
      ],
      rules: [
        'Не больше десяти шагов; любой шаг пропускается и открывается позже, пропущенный не блокирует остальные (AC-ONB-03).',
        'Шаг 4: значения из билета только предлагаются, в профиль попадают после «Подтвердить данные»; до подтверждения никому не показываются и не передаются в подбор и в языковую модель (FR-ONB-06; основание — вопрос юристу O-08). Шаг 6 без выбранного фото не засчитывается.',
        'Состав шагов в design/04 отличается от TZ_02 (FR-ONB-03: хобби первым, нет быстрого аудита): в демо действует design/04.',
        'Быстрый аудит: четыре оценки сфер от 1 до 5, предлагается цель по самой низкой оценке (ничья — по порядку вопросов).',
        'Метка о минимуме профиля показывает, пройдены ли три шага диагностики (A8–A10).'
      ],
      depends: ['D-45', 'D-49', 'D-56', 'O-08']
    },
    html() {
      pull12();
      const s = s12();
      syncSteps();
      const n = doneCount(), total = STEPS.length;
      const fill = PS.fill();
      const todo = STEPS.filter(p => !stepDone(p.n) && !s.skipped[p.n]);
      const skipped = STEPS.filter(p => !stepDone(p.n) && s.skipped[p.n]);
      const done = STEPS.filter(p => stepDone(p.n));
      const next = todo[0] || skipped[0] || null;
      const rest = todo.concat(skipped).filter(p => p !== next);
      const minOk = D.st('A8').done && D.st('A9').done && D.st('A10').done;
      const btnOf = (p, primary) => {
        const d = stepDone(p.n);
        const label = d ? 'Изменить' : 'Открыть';
        const cls = 'btn ' + (primary ? 'btn-primary' : (d ? 'btn-ghost' : 'btn-secondary'));
        return p.go ? '<button class="' + cls + '" data-go="' + p.go + '">' + label + '</button>'
          : '<button class="' + cls + '" data-act="a12-open" data-arg="' + p.n + '">' + label + '</button>';
      };
      const row = p => {
        const d = stepDone(p.n), sk = !d && s.skipped[p.n];
        const st = d ? tag('Готово', 'ok') : (sk ? tag('Пропущено') : tag('Не начато'));
        return '<div class="onb-step"><span class="onb-num">' + p.n + '</span>' +
          '<div style="min-width:0"><div class="onb-step-t">' + esc(p.t) + '</div><div class="onb-step-d">' + esc(p.d) + '</div>' +
          (d ? '<div class="onb-step-v">' + esc(valueOf(p.n)) + '</div>' : '') + '<div class="onb-step-s">' + st + '</div></div>' + btnOf(p, false) + '</div>';
      };
      const rc = s.last && RECALC[s.last] ? (() => {
        const r = RECALC[s.last], lines = r.ids.map(pathLine).filter(Boolean);
        return '<div class="card onb-rc accent-edge"><div class="onb-ex-h">Путь пересчитан по шагу ' + s.last + '</div>' +
          '<ul>' + (lines.length ? lines.map(l => '<li>Предложено в путь: ' + esc(l) + '</li>').join('') + '<li>Убрано: ничего</li>' : '<li>' + esc(r.note) + '</li>') + '</ul>' +
          (lines.length ? '<div class="onb-note">' + esc(r.note) + '</div>' : '') +
          '<button class="onb-lnk" data-go="B1"><span>Открыть «Мой путь»</span></button></div>';
      })() : '';
      const nextCard = next
        ? '<div class="card onb-next accent-edge"><div class="onb-ex-h">Следующий шаг · ' + next.n + ' из ' + total + '</div>' +
          '<div class="onb-next-t">' + esc(next.t) + '</div><div class="onb-step-d">' + esc(next.d) + '</div>' +
          (s.skipped[next.n] ? '<div class="onb-step-s">' + tag('Пропущено') + '</div>' : '') + btnOf(next, true) + '</div>'
        : '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Все десять шагов выполнены</div><div class="cap">Подбор учитывает всё, что вы рассказали.</div></div></div>';
      const minTag = n >= total ? tag('Все шаги выполнены', 'ok')
        : (minOk ? tag('Три шага диагностики пройдены', 'ok') : tag('Три шага диагностики не пройдены', 'warn'));
      const rs = resumeStep();
      return '<div class="scr">' +
        D.head({ backHist: true, eyebrow: 'Профиль', title: 'Усилить путь', sub: 'Десять шагов, каждый уточняет подбор', paren: paren('любой шаг можно пропустить и вернуться позже') }) +
        '<div class="onb-body">' +
        '<div class="card onb-meter">' +
        '<div class="onb-meter-top"><div class="onb-big">' + n + '<small> из ' + total + '</small></div><div class="onb-meter-l">шагов выполнено</div></div>' +
        '<div class="progress" role="progressbar" aria-valuemin="0" aria-valuemax="' + total + '" aria-valuenow="' + n + '"><i style="width:' + (n / total * 100) + '%"></i></div>' +
        '<div>' + minTag + '</div>' +
        '<div class="cap" data-fill>Заполненность профиля по полям: <b>' + fill.pct + '%</b>, столько же в кабинете</div>' +
        (!minOk && n < total ? '<button class="onb-lnk" data-go="' + STEP_SCREEN[rs] + '"><span>Пройти три шага диагностики</span></button>' : '') + '</div>' +
        nextCard + rc +
        (rest.length ? '<div class="sec-title">Ещё не выполнено · ' + rest.length + '</div><div class="card onb-steps">' + rest.map(row).join('') + '</div>' : '') +
        (done.length ? '<div class="sec-title">Выполнено · ' + done.length + '</div><div class="card onb-steps">' + done.map(row).join('') + '</div>' : '') +
        '<button class="onb-lnk" data-act="a12-demo"><span>Для показа: подставить данные демо-участника</span></button>' +
        '<button class="btn btn-secondary btn-block" data-go="B1">В «Мой путь»</button>' +
        '<div class="onb-end"></div></div></div>';
    }
  });
  D.action('a12-demo', () => { fillDemo(true); D.toast('Данные демо-участника подставлены'); rr(); });
  D.action('a12-open', el => openStep(+el.dataset.arg));
  D.action('a12-close', () => { D.closeSheet(); s12().dirty = false; rr(); });
  D.action('a12-skip', el => {
    const s = s12(), n = +el.dataset.arg;
    if (!stepDone(n)) s.skipped[n] = true;
    s.dirty = false; D.closeSheet(); D.toast('Шаг ' + n + ' пропущен'); rr();
  });
  D.action('a12-pick', el => {
    const s = s12(), g = el.dataset.grp, v = el.dataset.val;
    if (s.famTmp) s.famTmp[g] = v;
    document.querySelectorAll('.sheet [data-grp="' + g + '"]').forEach(b => b.classList.toggle('on', b.dataset.val === v));
  });
  D.action('a12-goal', el => {
    const s = s12(), code = el.dataset.val, i = s.goalsEdit.indexOf(code);
    const lim = document.querySelector('.sheet [data-glimit]');
    if (i >= 0) { s.goalsEdit.splice(i, 1); el.classList.remove('on'); if (lim) lim.hidden = true; }
    else if (s.goalsEdit.length >= 5) { if (lim) lim.hidden = false; }
    else { s.goalsEdit.push(code); el.classList.add('on'); if (lim) lim.hidden = true; }
  });
  D.action('a12-photo', el => {
    const s = s12(), had = s.photo;
    s.photo = true;
    const ph = document.querySelector('.sheet [data-ph]');
    if (ph) { ph.classList.add('on'); ph.textContent = 'Фото выбрано'; }
    el.textContent = 'Заменить фото';
    D.toast(had ? 'Фото заменено' : 'Фото выбрано');
  });
  D.action('a12-rate', el => {
    const s = s12(), i = +el.dataset.i, v = +el.dataset.val;
    s.audit[i] = v;
    document.querySelectorAll('.sheet [data-act="a12-rate"][data-i="' + i + '"]').forEach(b => b.classList.toggle('on', +b.dataset.val === v));
  });
  D.action('a12-audit-do', () => {
    const s = s12();
    if (AUDIT_Q.some((q, i) => !s.audit[i])) { D.toast('Оцените все четыре сферы'); return; }
    let low = 0;
    AUDIT_Q.forEach((q, i) => { if (s.audit[i] < s.audit[low]) low = i; });
    s.auditRes = s.audit[low] <= 3 ? AUDIT_Q[low][0] : null;
    s.auditDone = true; s.last = 9; s.dirty = true;
    const box = document.querySelector('.sheet [data-audit-res]'); if (box) { box.innerHTML = auditResHTML(); box.scrollIntoView({ block: 'center' }); }
    const b = document.querySelector('.sheet [data-act="a12-audit-do"]'); if (b) b.textContent = 'Пересчитать';
    const sk = document.querySelector('.sheet [data-act="a12-skip"]'); if (sk) { sk.setAttribute('data-act', 'a12-close'); sk.removeAttribute('data-arg'); sk.textContent = 'Закрыть'; }
    D.toast('Шаг 9 выполнен');
  });
  D.action('a12-audit-add', () => {
    const s = s12(), a9 = s9(), code = s.auditRes;
    const cur = snap().doms.slice();
    if (!code) return;
    if (cur.includes(code)) { D.toast('Эта цель уже выбрана'); return; }
    if (cur.length >= 5) { D.toast('Уже пять целей: снимите одну'); return; }
    const main = snap().main;
    cur.push(code);
    a9.doms = cur; a9.main = main && cur.includes(main) ? main : code; a9.done = true;
    push9(); syncSteps();
    s.dirty = true;
    D.toast('Цель добавлена');
  });
  D.action('a12-vid', el => {
    const s = s12(), i = +el.dataset.arg;
    s.vids[i] = true; s.dirty = true;
    const row = document.querySelector('.sheet [data-vd="' + i + '"]');
    if (row) { row.querySelector('.cap').textContent = VIDEOS[i][1] + ' · просмотрен'; el.textContent = 'Ещё раз'; }
    if (Object.keys(s.vids).length >= VIDEOS.length) { s.last = 10; D.toast('Шаг 10 выполнен'); }
    else D.toast('Ролик открыт (макет)');
  });
  D.action('a12-save', el => {
    const s = s12(), n = +el.dataset.arg;
    const f = document.querySelector('.sheet #a12-f'), g = document.querySelector('.sheet #a12-g');
    const handle = v => { v = v.trim(); return v && v.charAt(0) !== '@' ? '@' + v : v; };
    switch (n) {
      case 1: if (!f.value.trim()) { D.toast('Впишите ответ или пропустите шаг'); return; } s.sport = f.value.trim(); push12(1); break;
      case 2: if (!f.value.trim()) { D.toast('Впишите ответ или пропустите шаг'); return; } s.use = f.value.trim(); push12(2); break;
      case 3:
        if (!f.value.trim() && !g.value.trim()) { D.toast('Впишите хотя бы один контакт'); return; }
        s.insta = handle(f.value); s.tg = handle(g.value); push12(3); break;
      case 4:
        if (!s.famTmp || !s.famTmp.family || !s.famTmp.kids) { D.toast('Выберите оба значения'); return; }
        s.family = s.famTmp.family; s.kids = s.famTmp.kids; s.famOk = true; push12(4); break;
      case 5: {
        if (!s.goalsEdit || s.goalsEdit.length < 2) { D.toast('Выберите хотя бы две цели'); return; }
        const a9 = s9(), main = snap().main;
        a9.doms = s.goalsEdit.slice();
        a9.main = main && a9.doms.includes(main) ? main : a9.doms[0];
        a9.done = true;
        push9();
        break;
      }
      case 6: if (!s.photo) { D.toast('Выберите фото или пропустите шаг'); return; } break;
      default: break;
    }
    delete s.skipped[n]; s.last = n; s.dirty = false; syncSteps();
    D.closeSheet(); D.toast('Шаг ' + n + ' выполнен'); rr();
  });

  /* ---------- A13 Ваш питч для интро ---------- */
  const sentences = t => (String(t).match(/[^.!?]+[.!?]+(?=\s|$)/g) || [String(t)]).filter(x => x.trim()).length;
  const feedLim = () => F.FEED_LIMIT || { intro: 400, minIntro: 20 };
  /* автофильтр интро (как в ленте, FR-FEED-06): внешние ссылки и телефоны не принимаются */
  function badContent(t) {
    const x = String(t || '');
    if (/(https?:\/\/|www\.|t\.me\/|\b[a-zа-я0-9-]+\.(ru|com|org|net|рф|io|me|ly|shop|store)\b)/i.test(x)) return true;
    const m = x.match(/\+?\d[\d\s().-]{8,}\d/g) || [];
    return m.some(v => v.replace(/\D/g, '').length >= 10);
  }
  const firstName = nm => String(nm || '').trim().split(/\s+/)[0] || ME.first;
  /* черновик строится только из полей профиля, без выдуманных фактов (AC-ONB-07) и читается как представление живой речью:
     имя и компания, чем занимается, что ищет, чем полезен; variant 1 — короткий */
  function genPitch(variant) {
    const sn = snap();
    const co = F.company && F.company('co00');
    const intro = 'Меня зовут ' + firstName(sn.name) + ', я из компании «' + sn.company + '».';
    const about = (co && sn.company === DEMO.company && co.desc ? (co.desc.match(/^.*?[.!?](?=\s|$)/) || [co.desc])[0] : '');
    const sphere = sn.industry
      ? 'Наша сфера — ' + lowerFirst(sn.industry) + (about ? ': ' + lowerFirst(trimDot(about)) : '') + '.'
      : (about || '');
    const need = sn.request ? 'Сейчас ' + lowerFirst(trimDot(sn.request)) + '.' : (sn.justMeet ? 'Приехал просто знакомиться.' : '');
    const use = sn.useful ? 'Могу помочь: ' + lowerFirst(trimDot(sn.useful)) + '.' : '';
    const bye = 'Буду рад познакомиться на фестивале.';
    if (variant === 1) return [intro, need, use].filter(Boolean).join(' ');
    let t = [intro, sphere, need, use, bye].filter(Boolean).join(' ');
    if (t.length > feedLim().intro) t = [intro, sphere, need, use].filter(Boolean).join(' ');
    return t;
  }
  function s13() {
    const s = D.st('A13');
    if (!s.init) {
      const who = 'Меня зовут ' + DEMO.first + ', я из компании «' + DEMO.company + '». ';
      const t0 = genPitch(0);
      /* два сохранённых черновика — пример на данных демо-участника; у другого человека черновиков пока нет */
      const sample = otherPerson() ? [] : [
        { id: 'dr1', title: 'Склады и партнёр по доставке', when: 'вчера, 21:10',
          text: who + 'Запускаем склад в новом регионе за один квартал. Ищу партнёра по доставке на юге.' },
        { id: 'dr2', title: 'Закупщики сетей и опыт запуска', when: 'сегодня, 08:05',
          text: who + 'Хочу познакомиться с закупщиками сетей, которым нужна логистика. Могу рассказать, как запустить склад и собрать команду продаж.' }
      ];
      Object.assign(s, { init: true, variant: 0, text: t0, base: t0, cur: null, published: false, postId: null, pubErr: false, progress: false, seq: 3, drafts: sample });
    }
    return s;
  }
  function pvCard(text, clamp) {
    return '<div class="card onb-pv"><div class="onb-pv-h">' + D.avatar(ME.name, 'sm') +
      '<div style="min-width:0"><div class="r-title">' + esc(ME.name) + '</div><div class="cap">Интро · ' + esc(ME.company) + '</div></div></div>' +
      '<div class="onb-pv-text' + (clamp ? ' clamp' : '') + '" data-pv>' + esc(text) + '</div>' +
      '<button class="onb-co-row" data-go="F12/co00">' + icon('building') + '<div><div class="t">' + esc(ME.company) + '</div><div class="s">Карточка компании</div></div>' + icon('chevR') + '</button></div>';
  }

  D.register('A13', {
    tab: null,
    meta: {
      title: 'A13 · Ваш питч для интро',
      role: 'Участник, усиление пути',
      fr: ['FR-ONB-07', 'FR-FEED-05', 'FR-PROF-10'],
      ac: ['AC-ONB-07', 'AC-AI-02'],
      what: [
        'Черновик интро от ИИ из профиля: 3–5 предложений живой речью («Меня зовут…, я из компании…, наша сфера…, сейчас…, могу помочь…»); редактируемое поле со счётчиком знаков (лимит интро из ленты, 400) и предпросмотр записи со ссылкой на карточку компании (F12/co00).',
        '«Предложить заново» меняет вариант черновика (полный и короткий); «Сохранить черновик» добавляет или обновляет запись в списке черновиков (у демо-участника изначально два образца, у другого человека список пуст); открытие черновика поверх несохранённых правок просит подтверждения.',
        '«Опубликовать в ленте» только по нажатию и только после подтверждения в листе; после подтверждения запись создаётся в ленте с пометкой «Проверит модератор», а главная кнопка меняется на «Открыть в ленте» (карточка R4 созданной записи); повторная публикация невозможна.',
        'Подпись «ИИ предлагает, публикуете вы».'
      ],
      rules: [
        'Публикация без нажатия и без подтверждения невозможна (D-49, AC-ONB-07); запись рекламного характера запрещена, о бизнесе рассказывают через интро (D-35); внешние ссылки и телефоны автофильтр отклоняет, как в ленте.',
        'Черновик строится только из полей профиля: название компании, отрасль, описание компании, запрос, польза; фактов, которых нет в профиле, в нём нет. Без ИИ подставляется тот же шаблон из полей профиля (AI-PITCH).',
        'Запись в ленте создаётся по тому же контракту, что и в R3 (FIX.FEED_POSTS, mine, review): видна в ленте с пометкой «Проверит модератор» (D-54).'
      ],
      depends: ['D-49', 'D-35', 'D-54']
    },
    html() {
      const s = s13();
      const lim = feedLim().intro;
      const cur = s.drafts.find(d => d.id === s.cur);
      const drafts = s.drafts.length
        ? '<div class="card onb-draft"><div class="list">' + s.drafts.map(d =>
          '<div class="row"><div class="grow"><div class="r-title">' + esc(d.title) + '</div><div class="r-sub">' + esc(d.when) + ' · ' + sentences(d.text) + ' ' + plural(sentences(d.text), ['предложение', 'предложения', 'предложений']) + '</div></div>' +
          '<button class="btn ' + (s.cur === d.id ? 'btn-ghost' : 'btn-secondary') + '" data-act="a13-open" data-arg="' + d.id + '">' + (s.cur === d.id ? 'Открыт' : 'Открыть') + '</button></div>').join('') + '</div></div>'
        : '<div class="onb-note">Черновиков пока нет: сохраните текст выше, и он появится здесь.</div>';
      const feedGo = s.postId ? 'R4/' + s.postId : 'R1';
      return '<div class="scr">' +
        D.head({ backHist: true, eyebrow: 'Усилить путь · шаг 8', title: 'Ваш питч для интро', sub: 'Коротко о вас и вашей компании для ленты', paren: paren('ИИ предлагает, публикуете вы') }) +
        '<div class="onb-body">' +
        (s.published ? '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Интро отправлено в ленту</div><div class="cap">Запись проверит модератор, затем её увидят участники.</div>' +
          '<button class="onb-lnk" data-go="' + esc(feedGo) + '"><span>Открыть в ленте</span></button></div></div>' : '') +
        '<div class="field"><label for="a13-text">' + (cur ? 'Черновик «' + esc(cur.title) + '»' : 'Текст интро') + '</label>' +
        '<textarea class="textarea' + (s.pubErr ? ' err' : '') + '" id="a13-text" maxlength="' + lim + '" style="min-height:200px" placeholder="Расскажите, кто вы, чем занимаетесь и что ищете">' + esc(s.text) + '</textarea>' +
        '<span class="counter" data-cnt>' + s.text.length + ' / ' + lim + '</span></div>' +
        '<div class="sec-title" style="margin-top:2px">Как увидят в ленте</div>' + pvCard(s.text) +
        '<button class="btn btn-secondary btn-block" data-act="a13-save">' + icon('bookmark') + (cur ? 'Обновить черновик' : 'Сохранить черновик') + '</button>' +
        '<button class="btn btn-ghost btn-block" data-act="a13-regen">' + icon('refresh') + 'Предложить заново</button>' +
        (cur ? '<button class="btn btn-ghost btn-block btn-danger-text" data-act="a13-del">Удалить черновик</button>' : '') +
        '<div class="sec-title">Черновики · ' + s.drafts.length + '</div>' + drafts +
        '<div class="onb-end"></div></div>' +
        '<div class="onb-foot">' +
        (s.published
          ? '<button class="btn btn-primary btn-block" data-go="' + esc(feedGo) + '">Открыть в ленте</button>'
          : (s.pubErr ? '<div class="onb-err" data-puberr>В интро нельзя указывать внешние ссылки и телефоны. Расскажите о себе словами.</div>' : '') +
            '<button class="btn btn-primary btn-block" data-act="a13-pub-ask">Опубликовать в ленте</button>') +
        '</div></div>';
    },
    mount(host) {
      const s = s13();
      const lim = feedLim().intro;
      const ta = host.querySelector('#a13-text');
      const grow = () => { if (ta) { ta.style.height = 'auto'; ta.style.height = Math.max(200, ta.scrollHeight + 2) + 'px'; } };
      grow();
      if (ta) ta.addEventListener('input', () => {
        grow();
        s.text = ta.value;
        const c = host.querySelector('[data-cnt]'); if (c) c.textContent = ta.value.length + ' / ' + lim;
        const pv = host.querySelector('[data-pv]'); if (pv) pv.textContent = ta.value;
        if (s.pubErr) { s.pubErr = false; ta.classList.remove('err'); const er = host.querySelector('[data-puberr]'); if (er) er.remove(); }
      });
    }
  });
  D.action('a13-regen', () => { const s = s13(); s.variant = s.variant ? 0 : 1; s.text = genPitch(s.variant); s.base = s.text; s.cur = null; s.pubErr = false; D.toast('Предложен другой вариант'); rr(); });
  /* открытие черновика: если текст в поле менялся и не сохранён, сначала спрашиваем */
  function openDraft(id) {
    const s = s13(), d = s.drafts.find(x => x.id === id);
    if (!d) return;
    s.cur = d.id; s.text = d.text; s.base = d.text; s.pubErr = false;
    D.closeSheet(); rr();
    const sc = document.querySelector('.scr-host .scr'); if (sc) sc.scrollTop = 0;
  }
  D.action('a13-open', el => {
    const s = s13();
    if (s.text.trim() !== (s.base || '').trim()) {
      D.openSheet('<div class="onb-sheet"><div class="sheet-title">Открыть черновик?</div><div class="cap">Правки в тексте выше не сохранены и пропадут.</div>' +
        '<button class="btn btn-primary btn-block" data-act="a13-open-go" data-arg="' + esc(el.dataset.arg) + '">Открыть черновик</button>' +
        '<button class="btn btn-ghost btn-block" data-act="sheet-close">Вернуться к тексту</button></div>');
      return;
    }
    openDraft(el.dataset.arg);
  });
  D.action('a13-open-go', el => openDraft(el.dataset.arg));
  D.action('a13-save', () => {
    const s = s13(), t = s.text.trim();
    if (t.length < feedLim().minIntro) { D.toast('Напишите хотя бы пару предложений'); return; }
    const cur = s.drafts.find(d => d.id === s.cur);
    if (cur) { cur.text = t; cur.when = 'только что'; }
    else {
      const id = 'dr' + (++s.seq);
      const sn2 = t.match(/[^.!?]+[.!?]*/g) || [t];
      const title = trimDot((sn2[1] || sn2[0]).trim()).slice(0, 40);
      s.drafts.unshift({ id, title: title || 'Черновик ' + s.seq, when: 'только что', text: t });
      s.cur = id;
    }
    s.base = t; s.progress = true; s12().last = 8;
    D.toast('Черновик сохранён');
    rr();
  });
  D.action('a13-del', () => {
    const s = s13(), i = s.drafts.findIndex(d => d.id === s.cur);
    if (i >= 0) { s.drafts.splice(i, 1); s.cur = null; D.toast('Черновик удалён'); rr(); }
  });
  D.action('a13-pub-ask', () => {
    const s = s13(), t = s.text.trim();
    if (s.published) return;
    if (t.length < feedLim().minIntro) { D.toast('Напишите хотя бы пару предложений'); return; }
    if (badContent(t)) { s.pubErr = true; rr(); return; }
    D.openSheet('<div class="onb-sheet"><div class="sheet-title">Опубликовать в ленте?</div>' + pvCard(t, true) +
      '<div class="cap" style="margin-top:10px">Запись проверит модератор, затем её увидят участники. Рекламные посты запрещены: о бизнесе рассказывают через интро.</div>' +
      '<button class="btn btn-primary btn-block" data-act="a13-pub">Опубликовать</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Вернуться к тексту</button></div>');
  });
  D.action('a13-pub', () => {
    const s = s13();
    if (s.published) { D.closeSheet(); return; }
    /* запись попадает в ленту по контракту R3 (FIX.FEED_POSTS, mine, review): дальше её ведёт раздел «Лента» */
    if (F.FEED_POSTS && F.post) {
      let n = 16; while (F.post('fp' + n)) n++;
      s.postId = 'fp' + n;
      F.FEED_POSTS.unshift({ id: s.postId, kind: 'intro', author: { type: 'person', ref: 'me' }, tags: [], text: s.text.trim(),
        time: (F.NOW || {}).time || '11:10', ago: 0, mine: true, review: true, link: 'F12/co00' });
    }
    s.published = true; s.progress = true; s.base = s.text; s12().last = 8;
    D.closeSheet();
    D.toast('Интро ушло на проверку модератору');
    rr();
    const sc = document.querySelector('.scr-host .scr'); if (sc) sc.scrollTop = 0;
  });

  /* ---------- A14 Уточняющие вопросы ---------- */
  const QS = [
    { q: 'Какой результат для бизнеса вы хотите получить за ближайшие 30–90 дней?', chips: [
      ['Выстроить продажи', 'G1', 'rq01'], ['Выйти в новые регионы', 'G2', 'rq02'], ['Закрыть вакансии и усилить команду', 'G3', 'rq06'], ['Найти финансирование', 'G4', 'rq05']] },
    { q: 'В какой отрасли работает ваша компания?', chips: [
      [T.INDUSTRIES[5]], [T.INDUSTRIES[2]], [T.INDUSTRIES[0]], [T.INDUSTRIES[1]]] },
    { q: 'Чем вы можете быть полезны другим участникам?', chips: [
      ['Опыт запуска и масштабирования'], ['Экспертиза в продажах'], ['Контакты поставщиков и закупщиков'], ['Пока только ищу решения', null, null, 'none']] }
  ];
  /* макет голосового ввода: «распознанный» текст берётся из профиля демо-участника */
  const voiceText = q => {
    if (!otherPerson()) return [(DEMO.goals3 && DEMO.goals3[0]) || 'Открыть склады в двух новых регионах', DEMO.industry, DEMO.usefulness][q] || '';
    return [PS.request || 'Хочу найти партнёров и клиентов', PS.val.industry, PS.val.usefulness][q] || '';
  };
  /* Разбор свободного ответа в домен цели (05_TAXONOMY, раздел 2): по корням слов, считается число совпавших корней.
     Граница слова \b в JS не работает с кириллицей, поэтому границы заданы явно. При равенстве побеждает домен раньше
     в списке: «здоровье команды» даёт G7, а не G3. */
  const wordRe = w => new RegExp('(^|[^а-яёa-z0-9])' + w + '($|[^а-яёa-z0-9])', 'i');
  const KEYS = [
    ['G7', [/здоров/i, /спорт/i, /медицин/i, /самочувств/i, /врач/i]],
    ['G4', [/инвест/i, /финанс/i, /капитал/i, /кредит/i, /лизинг/i, /заём/i, /займ/i]],
    ['G5', [/ресурс/i, /выгор/i, /собственник/i, /приоритет/i, /состояни/i, /устал/i, /восстанов/i, /баланс/i]],
    ['G3', [/команд/i, /вакан/i, /найм/i, /персонал/i, wordRe('ии'), /нейросет/i, /искусственн/i, /внедр/i, /автоматиз/i, /сотрудник/i, /эффективн/i]],
    ['G1', [/продаж/i, /выруч/i, /прибыл/i, /клиент/i, /марж/i, /заявк/i, /расход/i, /налог/i, /обращен/i, /воронк/i]],
    ['G2', [/регион/i, /масштаб/i, /рынк/i, /выйти/i, /выход/i, /открыть/i, /расшир/i, /франшиз/i, /канал/i, /экспорт/i]],
    ['G8', [/семь[яеёи]|семей/i, /отдых/i, wordRe('дет(и|ей|ск[а-я]*)'), /радост/i, /развлеч/i]],
    ['G6', [/партн/i, /связ/i, /знаком/i, /окружен/i, /нетворк/i, /клиент/i]]
  ];
  const guessDomain = t => {
    let best = null, bestN = 0;
    KEYS.forEach(k => { const n = k[1].filter(re => re.test(t)).length; if (n > bestN) { bestN = n; best = k[0]; } });
    return best;
  };
  const matchIndustry = t => {
    const x = String(t).trim().toLowerCase(); if (x.length < 4) return null;
    return T.INDUSTRIES.find(n => n.toLowerCase() === x) || T.INDUSTRIES.find(n => n.toLowerCase().indexOf(x) >= 0) || null;
  };
  function s14() {
    const s = D.st('A14');
    if (!s.init) Object.assign(s, { init: true, q: 0, ans: [], draft: '', listening: false, phase: 'ask', stick: false, completed: false });
    return s;
  }
  function parsed(s) {
    const a = s.ans;
    const tpl = T.REQUEST_TEMPLATES.find(t => t.id === a[0].tpl);
    return {
      tpl: tpl ? tpl.id : null,
      request: tpl ? tpl.text : a[0].text,
      domain: a[0].dom || guessDomain(a[0].text),
      industry: matchIndustry(a[1].text),
      industryRaw: a[1].text,
      useful: a[2].none ? '' : a[2].text
    };
  }
  const bot = (t, n) => '<div class="onb-msg bot">' + (n ? '<span class="onb-qn">Вопрос ' + n + ' из 3</span>' : '') + esc(t) + '</div>';
  const me = t => '<div class="onb-msg me">' + esc(t) + '</div>';
  function parsedRows(p) {
    const row = (k, v) => '<div class="onb-parsed-row"><div class="onb-parsed-k">' + k + '</div><div class="onb-parsed-v">' + v + '</div></div>';
    return row('Цель', p.domain ? esc(domTitle(p.domain)) : 'Не определена: выберите в «Цели и запросы»') +
      row('Запрос', esc(p.request)) +
      row('Отрасль', p.industry ? esc(p.industry) : esc(p.industryRaw) + ' <span class="cap">· не из списка, уточните в профиле</span>') +
      row('Польза для других', p.useful ? esc(p.useful) : 'Не указана');
  }

  D.register('A14', {
    tab: null,
    meta: {
      title: 'A14 · Уточняющие вопросы',
      role: 'Участник, усиление пути',
      fr: ['FR-ONB-11', 'FR-AI-04', 'FR-ONB-03'],
      ac: ['AC-ONB-11', 'AC-AI-02'],
      what: [
        'Диалоговая оболочка над управляемым сценарием: три уточняющих вопроса (цель и запрос, отрасль, польза), ответы чипами или текстом.',
        'Кнопка микрофона: макет голосового ввода (состояние «слушаю», затем текст в поле, который виден и правится до отправки); подпись «распознавание речи уточняется».',
        'После третьего ответа бот показывает разобранные поля (цель, запрос, отрасль, польза); сохранение только кнопкой «Подтвердить и обновить путь».',
        'Итог «Путь обновлён» со ссылкой в «Мой путь» (B1); шаг 7 в «Усилить путь» получает статус «Готово».'
      ],
      rules: [
        'Режим «Диагност» разбирает свободные ответы в поля цели, запроса, отрасли и пользы; сам ничего не сохраняет, поля сохраняются после подтверждения (D-49).',
        'Без ИИ все вопросы доступны формой с тем же результатом; недоступность распознавания речи не блокирует ввод с клавиатуры (AC-ONB-11).',
        'Голосовой ввод (Whisper, сверить): сервис и обработка ПДн уточняются (O-22); в демо ответ подставляется из профиля.',
        'Подтверждённые поля обновляют цели, запрос и отрасль в диагностике; путь пересчитывается.'
      ],
      depends: ['D-49', 'D-52', 'O-22']
    },
    html() {
      const s = s14();
      let chat = bot('Задам три коротких вопроса, чтобы точнее настроить путь. Отвечайте чипом, текстом или голосом.');
      for (let i = 0; i < Math.min(s.q, 3); i++) chat += bot(QS[i].q, i + 1) + me(s.ans[i].text);
      let compose = '';
      if (s.q < 3) {
        const q = QS[s.q];
        chat += bot(q.q, s.q + 1) +
          '<div class="onb-quick">' + q.chips.map((c, i) => '<button class="chip" data-act="a14-chip" data-arg="' + i + '">' + esc(c[0]) + '</button>').join('') + '</div>';
        compose = '<div class="onb-compose"><div class="onb-compose-row">' +
          '<button class="icon-btn onb-mic' + (s.listening ? ' on' : '') + '" data-act="a14-mic" aria-label="' + (s.listening ? 'Остановить запись' : 'Голосовой ввод') + '" aria-pressed="' + s.listening + '">' + icon('mic') + '</button>' +
          (s.listening
            ? '<div class="onb-listen"><div class="onb-wave"><i></i><i></i><i></i><i></i><i></i></div><div class="onb-listen-t">Слушаю…</div></div>'
            : '<input class="input" id="a14-in" aria-label="Ваш ответ" placeholder="Напишите ответ" autocomplete="off" value="' + esc(s.draft) + '">') +
          '<button class="icon-btn onb-send" data-act="a14-send" aria-label="Отправить ответ"' + (s.listening ? ' disabled' : '') + '>' + icon('send') + '</button></div>' +
          '<div class="cap">Голосовой ввод: распознавание речи уточняется</div></div>';
      } else if (s.phase === 'parsed') {
        const p = parsed(s);
        chat += bot('Спасибо. Вот как я разобрал ваши ответы. В профиль они попадут после вашего подтверждения.') +
          '<div class="card onb-parsed">' + parsedRows(p) + '</div>' +
          '<button class="btn btn-primary btn-block" data-act="a14-confirm">Подтвердить и обновить путь</button>' +
          '<button class="btn btn-ghost btn-block" data-act="a14-restart">Ответить заново</button>';
      } else {
        const p = parsed(s);
        chat += '<div class="card onb-done accent-edge"><div class="card-head"><div class="card-title">Путь обновлён</div>' + icon('check') + '</div>' +
          '<ul><li>Цель: ' + esc(p.domain ? domTitle(p.domain) : 'без изменений') + '</li><li>Запрос: ' + esc(p.request) + '</li><li>Отрасль: ' + esc(p.industry || p.industryRaw) + '</li></ul>' +
          '<div class="cap">Путь пересчитан по вашим ответам. Предложенные пункты ждут решения в «Мой путь»: примите, замените или уберите их.</div>' +
          '<button class="btn btn-primary btn-block" data-go="B1">Открыть «Мой путь»</button>' +
          '<button class="btn btn-ghost btn-block" data-act="a14-restart">Пройти ещё раз</button></div>';
      }
      return '<div class="scr">' +
        D.head({ backHist: true, eyebrow: 'Усилить путь · шаг 7', title: 'Уточняющие вопросы', sub: 'Три вопроса, чтобы подбор попал точнее', paren: paren('ИИ только предлагает, сохраняете вы кнопкой') }) +
        '<div class="onb-body"><div class="onb-chat" aria-live="polite">' + chat + '</div><div class="onb-end"></div></div>' + compose + '</div>';
    },
    mount(host) {
      const s = s14();
      const inp = host.querySelector('#a14-in');
      if (inp) {
        inp.addEventListener('input', () => { s.draft = inp.value; });
        inp.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); sendAnswer(); } });
      }
      if (s.stick) { s.stick = false; const sc = host.querySelector('.scr'); if (sc) sc.scrollTop = sc.scrollHeight; }
    }
  });
  let micTimer = null;
  function answer(text, dom, tpl, none) {
    const s = s14();
    s.ans.push({ text, dom: dom || null, tpl: tpl || null, none: !!none });
    s.q += 1; s.draft = ''; s.listening = false;
    if (s.q >= 3) s.phase = 'parsed';
    s.stick = true;
    D.rerender();
  }
  function sendAnswer() {
    const s = s14(), inp = document.querySelector('#a14-in');
    const t = (inp ? inp.value : s.draft).trim();
    if (!t) { D.toast('Напишите ответ или выберите вариант'); return; }
    answer(t, null);
  }
  D.action('a14-chip', el => { const s = s14(), c = QS[s.q].chips[+el.dataset.arg]; if (c) answer(c[0], c[1] || null, c[2] || null, c[3] === 'none'); });
  D.action('a14-send', () => sendAnswer());
  function stopListen() {
    clearTimeout(micTimer);
    const s = s14();
    if (!s.listening) return;
    s.listening = false;
    s.draft = voiceText(s.q);
    if (onScreen('A14')) { s.stick = true; D.rerender(); }
  }
  D.action('a14-mic', () => {
    const s = s14();
    if (s.listening) { stopListen(); return; }
    s.listening = true; s.stick = true;
    D.rerender();
    clearTimeout(micTimer);
    micTimer = setTimeout(stopListen, 1800);
  });
  D.action('a14-restart', () => { const s = s14(); Object.assign(s, { q: 0, ans: [], draft: '', listening: false, phase: 'ask' }); D.rerender(); });
  D.action('a14-confirm', () => {
    const s = s14(), p = parsed(s);
    if (p.domain) {
      const a9 = s9(), cur = snap().doms.slice(), main = snap().main;
      if (!cur.includes(p.domain) && cur.length < 5) cur.push(p.domain);
      a9.doms = cur; a9.main = main && cur.includes(main) ? main : (cur.includes(p.domain) ? p.domain : cur[0]); a9.done = true;
      push9();
    }
    const a10 = s10();
    a10.text = p.request; a10.tpl = p.tpl; a10.own = !p.tpl; a10.useful = p.useful; a10.done = true;
    push10(true);
    if (p.industry) { s8().industry = p.industry; if (PS) PS.set('industry', p.industry); }
    s.completed = true; s.phase = 'done'; s.stick = true; s12().last = 7; syncSteps();
    D.toast('Путь обновлён');
    D.rerender();
  });

  /* @@APPEND@@ */
})();
