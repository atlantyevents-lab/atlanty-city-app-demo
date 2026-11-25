/* Блок L — билет и кабинет (раздел S7, демо v3).
   L1–L4 оставлены (правки ссылок и метки спутника); L0, L5, L6, L7 переделаны; L8–L11 новые.
   Общее состояние профиля — FIX.PS (data/fx_profile.js); экранное — D.st(id). */
(function () {
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag, tariffTag, avatar } = D;
  const PS = F.PS;

  /* ---------- общие помощники S7 ---------- */
  /* перерисовка без прыжка прокрутки; лист закрывается (иначе остаётся класс sheet-open на body) */
  function rr(msg, ms) {
    const s = document.querySelector('.scr'), y = s ? s.scrollTop : 0;
    D.closeSheet();
    D.rerender();
    const n = document.querySelector('.scr');
    if (n) n.scrollTop = y;
    if (msg) D.toast(msg, ms);   /* тост после перерисовки: рамка пересоздаётся и старый тост пропал бы */
  }
  /* кнопки в конце листа закрепляются внизу (sticky), чтобы «Отмена» не уходила за край при длинном содержимом */
  function pinFoot(sh) {
    if (!sh) return;
    const kids = [...sh.children];
    let i = kids.length;
    while (i > 0 && kids[i - 1].matches('button.btn')) i--;
    const tail = kids.slice(i);
    if (!tail.length || i <= 1) return;
    const foot = document.createElement('div');
    foot.className = 'cab-sheet-foot';
    tail.forEach(b => foot.appendChild(b));
    sh.appendChild(foot);
  }
  const sheet = (title, body, opts) => { D.openSheet('<div class="sheet-title">' + title + '</div>' + body, opts); pinFoot(document.querySelector('.sheet')); };
  const val = sel => { const el = document.querySelector('.sheet ' + sel); return el ? el.value : ''; };
  const sec = (t, more) => '<div class="sec-title">' + t + (more || '') + '</div>';
  const fld = id => PS.fields().find(f => f.id === id);
  const lvl = id => F.VIS_INFO[id];

  /* код-нативный узор QR: декоративный, не сканируется */
  function qrSVG(seed, px) {
    const N = 21, cell = px / N;
    let h = hash(seed), out = '';
    const bit = (x, y) => {
      h = (h * 1103515245 + 12345 + x * 97 + y * 31) >>> 0;
      return (h >>> 8) % 5 < 2;
    };
    const finder = (fx, fy) => {
      for (let y = 0; y < 7; y++) for (let x = 0; x < 7; x++) {
        const edge = x === 0 || x === 6 || y === 0 || y === 6;
        const core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
        if (edge || core) out += '<rect x="' + ((fx + x) * cell).toFixed(1) + '" y="' + ((fy + y) * cell).toFixed(1) + '" width="' + cell.toFixed(1) + '" height="' + cell.toFixed(1) + '"/>';
      }
    };
    out += '<rect width="' + px + '" height="' + px + '" fill="#fff"/>';
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const inFinder = (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
      if (!inFinder && bit(x, y)) out += '<rect x="' + (x * cell).toFixed(1) + '" y="' + (y * cell).toFixed(1) + '" width="' + cell.toFixed(1) + '" height="' + cell.toFixed(1) + '"/>';
    }
    finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
    return '<svg class="qr" viewBox="0 0 ' + px + ' ' + px + '" shape-rendering="crispEdges" aria-label="Демонстрационный QR-узор">' + out + '</svg>';
  }
  /* строка про спутника в билете: по состоянию данных семьи (L5) */
  function satelliteLine() {
    const c = PS.family.companion;
    if (!c || c.state === 'rejected') return 'Спутник: не подключён';
    if (c.state === 'ticket') return 'Спутник: из билета, ждёт подтверждения';
    return 'Спутник: ' + c.name;
  }
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  D.register('L1', {
    tab: 'MORE',
    meta: {
      title: 'L1 · Билет',
      role: 'Гость, документ',
      fr: ['FR-TKT-01', 'FR-TKT-02', 'FR-TKT-03', 'FR-TKT-04', 'FR-TKT-05', 'FR-TKT-06'],
      ac: ['AC-TKT-03', 'AC-TKT-05'],
      what: [
        'QR-билет: участник, тариф, издание, даты, QR-узор (код-нативный, не сканируется).',
        'Режим «Показать на стойке» — переключатель состояния экрана.',
        'Ссылки на PDF-приглашение, проживание, платёжные данные, тариф, семью и приватность.'
      ],
      rules: [
        'QR билета — подписанный токен с обновлением каждые 60 секунд; скриншот не принимается.',
        'Оплаты в приложении нет: смена тарифа и условия — через Telegram организатору (D-08).',
        'Платёжные данные — только чтение, если есть в импорте; проживание — только чтение.',
        'QR в демо — декоративный узор, не сканируется.'
      ],
      depends: ['D-08', 'D-02', 'импорт билетов']
    },
    html(ctx) {
      const st = ctx.state;
      const ME = F.ME;
      const standby = !!st.standby;
      const tkRow = (k, v) => '<div class="tk-row"><span class="k">' + k + '</span><span>' + v + '</span></div>';

      return '<div class="scr">' +
        D.head({back:'L0', eyebrow:'Ваш документ', title:'Билет', sub:esc(ME.edition) + ' · ' + tariffTag(ME.tariff), actions:'<button class="icon-btn' + (standby ? ' on' : '') + '" data-act="l1-stand" aria-label="Показать на стойке" aria-pressed="' + standby + '">' + icon('scan') + '</button>'}) +
        '<div class="cab-body">' +

        (standby ? '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Режим «на стойке»</div><div class="cap">Экран не гаснет, яркость максимальная. Покажите QR сотруднику.</div></div></div>' : '') +

        '<div class="ticket-card">' +
        '<div class="tk-head"><div class="logo-img sm" style="margin-bottom:8px"></div>' +
        '<div class="tk-sub">Атланты Сити</div>' +
        '<div class="tk-title">Атланты Сити.<br>Зима</div>' +
        '<div class="tk-sub" style="margin-top:6px">25 февраля — 1 марта · Завидово</div></div>' +
        '<div class="tk-body">' +
        tkRow('Участник', esc(ME.patronymic)) +
        tkRow('Компания', esc(ME.company)) +
        tkRow('Тариф', esc(ME.tariff)) +
        tkRow('Издание', esc(ME.edition)) +
        tkRow('Доступ', 'до ' + F.ACCESS_UNTIL) +
        '</div>' +
        '<div class="tk-perf"></div>' +
        '<div class="qr-band"><div class="qr-mini" style="width:104px;height:104px">' + qrSVG('atlanty-' + ME.patronymic, 104) + '</div>' +
        '<div class="tk-sub cab-tk-cap">токен обновляется каждые 60 секунд · скриншот не принимается</div></div>' +
        '<div class="cab-tk-tags">' +
        '<span class="tag">' + icon('check') + 'Аккредитация подтверждена</span>' +
        '<span class="tag">' + icon('people') + esc(satelliteLine()) + '</span>' +
        '</div></div>' +

        '<div class="card"><div class="sec-title" style="margin:0 0 4px">Детали и документы</div><div class="list">' +
        '<button class="row clickable" data-go="L2">' + icon('file') + '<div class="grow"><div class="r-title">PDF-приглашение</div><div class="r-sub">скачать или отправить</div></div>' + icon('chevR') + '</button>' +
        '<button class="row clickable" data-go="L4">' + icon('building') + '<div class="grow"><div class="r-title">Проживание</div><div class="r-sub">отель и даты из брони</div></div>' + icon('chevR') + '</button>' +
        '<button class="row clickable" data-go="L3">' + icon('card') + '<div class="grow"><div class="r-title">Платёжные данные</div><div class="r-sub">только чтение, если есть в заказе</div></div>' + icon('chevR') + '</button>' +
        '<button class="row clickable" data-go="L5">' + icon('people') + '<div class="grow"><div class="r-title">Семья и команда</div><div class="r-sub">Спутник и коллеги по контакту</div></div>' + icon('chevR') + '</button>' +
        '<button class="row clickable" data-go="L6">' + icon('lock') + '<div class="grow"><div class="r-title">Приватность</div><div class="r-sub">согласия, выгрузка, удаление</div></div>' + icon('chevR') + '</button>' +
        '</div></div>' +

        '<div class="banner">' + icon('info') + '<div><div class="b-title">Оплата в приложении не проводится</div>' +
        '<div class="cap">Смена тарифа и условия — через Telegram организатору.</div></div></div>' +
        paren('QR-узор в демо декоративный и не сканируется') +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('l1-stand', () => {
    const s = D.st('L1');
    s.standby = !s.standby;
    D.toast(s.standby ? 'Режим «на стойке» включён' : 'Режим «на стойке» выключен');
    D.rerender();
  });

  /* ---------- L2 PDF-приглашение ---------- */
  D.register('L2', {
    tab: '-',
    meta: {
      title: 'L2 · PDF-приглашение',
      role: 'Гость, билет',
      fr: ['FR-TKT-03'],
      ac: ['AC-TKT-03'],
      what: [
        'Предпросмотр PDF-приглашения: участник, тариф, даты, QR-узор.',
        'Состав документа: заголовок, данные, программа дня, контакты.',
        'Кнопки «Скачать PDF» и «Отправить на e-mail».'
      ],
      rules: [
        'PDF формируется из билета и содержит подписанный QR-токен.',
        'Документ доступен после оплаты; демо показывает готовый макет.',
        'Отправка на e-mail — только на адрес из профиля.'
      ],
      depends: ['билет', 'PDF-генерация']
    },
    html(ctx) {
      const ME = F.ME, B = F.BOOKING_PAY;
      return '<div class="scr">' +
        D.head({backHist:true, eyebrow:'Билет', title:'Приглашение', sub:'PDF-документ для печати и пересылки', paren:paren('документ формируется из вашего билета')}) +
        '<div class="cab-body">' +
        '<div class="doc"><div class="doc-kicker">Атланты Сити · Зима 2027</div>' +
        '<div class="doc-title">Приглашение на фестиваль</div>' +
        '<div class="doc-line"></div><div class="doc-line short"></div>' +
        '<div style="margin-top:14px;font-size:13px;line-height:1.7">' +
        '<b>' + esc(ME.patronymic) + '</b><br>' + esc(ME.company) + '<br>' +
        'Тариф: ' + esc(ME.tariff) + ' · ' + esc(B.dates) + '<br>' +
        'Заезд: 25 февраля с 14:00 · выезд 28 февраля</div>' +
        '<div class="doc-qr">' + qrSVG('invite-' + ME.patronymic, 110) + '</div>' +
        '<div class="doc-foot">Покажите документ на регистрации · QR обновляется при входе в приложение</div></div>' +
        '<button class="btn btn-primary btn-block" data-act="l2-dl">' + icon('download') + 'Скачать PDF</button>' +
        '<button class="btn btn-ghost btn-block" data-act="l2-mail">Отправить на e-mail</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('l2-dl', () => D.toast('PDF сформирован — в демо загрузка не выполняется'));
  D.action('l2-mail', () => D.toast('Приглашение отправлено на ' + F.ME.email));

  /* ---------- L3 Оплата ---------- */
  D.register('L3', {
    tab: '-',
    meta: {
      title: 'L3 · Оплата',
      role: 'Гость, билет',
      fr: ['FR-TKT-04'],
      ac: ['AC-TKT-04'],
      what: [
        'Данные оплаты: даты, сумма, скидка, промокод и источник скидки.',
        'Статус: оплачено, дата платежа.',
        'История платежа и ссылка на чек.'
      ],
      rules: [
        'Сумма и скидка фиксируются на момент оплаты; промокод применяется один раз.',
        'Источник скидки виден для аналитики, но не влияет на условия.',
        'Возврат — по правилам тарифов, через организатора.'
      ],
      depends: ['билет', 'платёжная система']
    },
    html(ctx) {
      const B = F.BOOKING_PAY;
      const line = (l, v, strong) => '<div class="cab-kv' + (strong ? ' strong' : '') + '"><span class="k">' + esc(l) + '</span><span class="v">' + esc(v) + '</span></div>';
      return '<div class="scr">' +
        D.head({backHist:true, eyebrow:'Билет', title:'Оплата', sub:'заказ на проживание и участие', paren:paren('данные платежа зафиксированы')}) +
        '<div class="cab-body">' +
        '<div class="card">' +
        line('Даты', B.dates) + line('Ночей', B.nights) + line('Место', B.place) + line('Гости', B.guests) +
        '<div style="border-top:1px solid var(--line);margin-top:6px;padding-top:10px">' +
        line('Сумма', B.amount) + line('Скидка', B.discount) +
        line('Промокод', B.promo + ' · источник: ' + B.source) + '</div>' +
        '<div style="border-top:1px solid var(--line);margin-top:6px;padding-top:10px">' +
        line('Итого', B.total, true) + '</div>' +
        '<div class="cap" style="margin-top:10px">Оплачено ' + esc(B.paid) + ' · чек доступен по кнопке ниже</div></div>' +
        '<button class="btn btn-secondary btn-block" data-act="l3-check">Чек об оплате</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('l3-check', () => D.toast('Чек открыт — в демо файл не формируется'));

  /* ---------- L4 Проживание ---------- */
  D.register('L4', {
    tab: '-',
    meta: {
      title: 'L4 · Проживание',
      role: 'Гость, билет',
      fr: ['FR-TKT-05'],
      ac: ['AC-TKT-05'],
      what: [
        'Данные брони: отель, даты, номер, гости.',
        'Контакт организатора проживания и стойки.',
        'Редактирование недоступно — изменения через организатора.'
      ],
      rules: [
        'Бронь подтверждена организатором; самостоятельная отмена — за 14 дней.',
        'Изменение дат и номеров — только через контакт ниже.',
        'Проживание включено в тариф «Бизнес» и выше.'
      ],
      depends: ['бронирование отелей', 'тарифы']
    },
    html(ctx) {
      const h = F.HOTEL_BOOKING;
      const row = (l, v) => '<div class="cab-kv"><span class="k">' + esc(l) + '</span><span class="v">' + esc(v) + '</span></div>';
      return '<div class="scr">' +
        D.head({backHist:true, eyebrow:'Билет', title:'Проживание', sub:esc(h.hotel), paren:paren('изменения — через организатора')}) +
        '<div class="cab-body">' +
        '<div class="card">' + tag('бронь подтверждена', 'ok') +
        '<div style="margin-top:8px">' + row('Даты', h.dates) + row('Номер', h.room) +
        row('Бронь', h.booking) + '</div></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:8px">Связь</div>' +
        '<div class="row"><div class="grow"><div class="r-title" style="font-size:14px">' + esc(h.hotel) + ' · стойка регистрации</div>' +
        '<div class="r-sub">' + esc(h.contact) + '</div></div>' + icon('phone') + '</div>' +
        '<button class="btn btn-secondary btn-block" style="margin-top:10px" data-act="l4-call">Позвонить организатору</button></div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Перенос заезда, смена номера и продление — только через организатора. Самостоятельное редактирование отключено.</div></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('l4-call', () => D.toast('В демо звонок не выполняется — номер: ' + F.HOTEL_BOOKING.contact));


  /* ---------- общие действия листов S7 ---------- */
  /* переключение чипа внутри листа без перерисовки экрана (одиночный и множественный выбор) */
  D.action('cab-chip', el => {
    const single = el.dataset.single === '1';
    if (single) el.parentElement.querySelectorAll('.chip').forEach(c => { c.classList.remove('on'); c.setAttribute('aria-pressed', 'false'); });
    const on = single ? true : !el.classList.contains('on');
    el.classList.toggle('on', on);
    el.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  /* ошибка показывается под полем, к которому относится (контейнер .field), иначе в конце формы */
  const sheetErr = (msg, sel) => {
    const e = document.querySelector('.sheet [data-err]');
    const i = sel && document.querySelector('.sheet ' + sel);
    if (e) {
      e.textContent = msg;
      const host = i && i.closest('.field');
      if (host && e.parentElement !== host) host.appendChild(e);
    }
    if (i) { i.classList.add('err'); i.focus(); }
    return false;
  };
  const chipsOn = sel => [...document.querySelectorAll('.sheet ' + sel + '.on')].map(c => c.dataset.v);

  /* ---------- L0 Кабинет ---------- */
  D.register('L0', {
    tab: '-',
    meta: {
      title: 'L0 · Кабинет',
      role: 'Гость, личный раздел',
      fr: ['FR-TKT-01', 'FR-PROF-11', 'FR-PROF-13', 'FR-AUTH-06', 'FR-NOTE-01'],
      ac: ['AC-PROF-06', 'AC-PROF-13'],
      what: [
        'Карточка участника: имя, компания, тариф, заполненность профиля с переходом в профиль.',
        'Личное: билет, профиль, цели и запросы, приватность, семья и команда, проживание, оплата, уведомления, заметки, итоги.',
        'Помощь: как пользоваться, вопросы и ответы, кодекс участника.',
        'Тема оформления (тёмная и дневная) и выход с подтверждением в листе.'
      ],
      rules: [
        'Меню отвечает на вопрос «куда пойти», Кабинет — «что у меня»: вход через аватар в шапке на любом экране.',
        'Заполненность считается по формуле FR-PROF-13: обязательные поля весят 50%, остальные поровну.',
        'Данные из билета о семье показываются только владельцу и ждут подтверждения в разделе «Семья и команда».',
        'Данные профиля вымышленные, как во всём демо.'
      ],
      depends: ['D-36', 'D-45', 'D-47']
    },
    html() {
      const ME = F.ME, fill = PS.fill(), pend = PS.pending(), th = D.currentTheme();
      const given = Object.keys(PS.consents).filter(k => PS.consents[k]).length, total = Object.keys(PS.consents).length;
      const nN = PS.notes.length, B = F.BOOKING_PAY, H = F.HOTEL_BOOKING;
      const row = (ic, go, t, s) =>
        '<button class="row clickable cab-row" data-go="' + go + '"><span class="cab-ic">' + icon(ic) + '</span>' +
        '<div class="grow"><div class="r-title">' + esc(t) + '</div><div class="r-sub cab-sub1">' + esc(s) + '</div></div>' + icon('chevR') + '</button>';
      return '<div class="scr">' +
        D.head({ eyebrow: 'Личное', title: 'Кабинет', sub: esc(ME.company) + ' · тариф ' + esc(ME.tariff) + ' · ' + esc(ME.edition), paren: paren('всё, что относится лично к вам') }) +
        '<div class="cab-body">' +
        '<button class="card cab-me" data-go="L7"><span class="cab-me-top">' + avatar(ME.name, 'l accent') +
        '<span class="grow cab-me-txt"><span class="r-title">' + esc(ME.name) + '</span><span class="r-sub">' + esc(ME.patronymic) + '</span>' +
        '<span class="cab-me-meta">' + tariffTag(ME.tariff) + '<span class="cap">' + esc(ME.memberSince) + '</span></span></span>' + icon('chevR') + '</span>' +
        '<span class="cab-fill"><span class="cab-fill-t">Профиль заполнен на <b>' + fill.pct + '%</b></span>' +
        '<span class="progress" aria-hidden="true"><i style="width:' + fill.pct + '%"></i></span>' +
        '<span class="cap">обязательных полей ' + fill.req + ' из ' + fill.reqTotal + ', остальных ' + fill.opt + ' из ' + fill.optTotal + '</span></span></button>' +
        (pend ? '<button class="banner info cab-bn" data-go="L5">' + icon('people') + '<span><span class="b-title">Из билета ждут подтверждения: ' + pend + '</span>' +
          '<span class="cap">Спутник, дети и семейное положение. Пока вы их не подтвердили, видите их только вы.</span></span></button>' : '') +
        sec('Личное') +
        '<div class="card cab-list"><div class="list">' +
        row('ticket', 'L1', 'Билет и QR', 'Тариф ' + ME.tariff + ' · ' + ME.edition) +
        row('user', 'L7', 'Профиль', 'Заполнен на ' + fill.pct + '%') +
        row('layers', 'L8', 'Цели и запросы', PS.goals.length + ' ' + D.plural(PS.goals.length, ['цель', 'цели', 'целей']) + ' · запрос на ' + PS.horizon + ' дней') +
        row('lock', 'L6', 'Приватность', 'Согласия: ' + given + ' из ' + total + ' · данные') +
        row('people', 'L5', 'Семья и команда', pend ? 'Из билета ждут: ' + pend : 'Спутник, дети, коллеги') +
        row('building', 'L4', 'Проживание', H.hotel + ' · 25–28.02') +
        row('card', 'L3', 'Оплата', 'Оплачено ' + B.paid) +
        row('bell', 'B3', 'Уведомления', 'Типы и каналы') +
        row('file', 'M1', 'Заметки', nN + ' ' + D.plural(nN, ['заметка', 'заметки', 'заметок']) + ' · только вам') +
        row('chart', 'M4', 'Мои итоги', 'Встречи, контакты, PDF') +
        '</div></div>' +
        sec('Помощь') +
        '<div class="card cab-list"><div class="list">' +
        row('play', 'L9', 'Как пользоваться', 'Тур по приложению и три ролика') +
        row('help', 'L11', 'Вопросы и ответы', F.FAQ.length + ' ' + D.plural(F.FAQ.length, ['вопрос', 'вопроса', 'вопросов']) + ' и ответы') +
        row('info', 'L10', 'Кодекс участника', 'Знакомства, лента, чаты, реклама') +
        '</div></div>' +
        sec('Оформление') +
        '<div class="card cab-theme"><div><div class="r-title">Тема оформления</div><div class="r-sub">тёмная по умолчанию, дневная светлая</div></div>' +
        '<div class="cab-seg2">' +
        '<button class="chip' + (th === 'summer' ? ' on' : '') + '" data-act="l0-theme" data-arg="summer" aria-pressed="' + (th === 'summer') + '">' + icon('moon') + 'Тёмная</button>' +
        '<button class="chip' + (th === 'winter' ? ' on' : '') + '" data-act="l0-theme" data-arg="winter" aria-pressed="' + (th === 'winter') + '">' + icon('sun') + 'Дневная</button></div></div>' +
        '<button class="btn btn-secondary btn-block" data-act="l0-logout">' + icon('logout') + 'Выйти</button>' +
        '<div class="cab-end"></div></div></div>';
    }
  });
  D.action('l0-theme', el => {
    D.setTheme(el.dataset.arg, true);
    setTimeout(() => { if (document.querySelector('.cab-theme')) rr(); }, 720);
  });
  D.action('l0-logout', () => sheet('Выйти из приложения?',
    '<div class="cap">Билет, профиль и заметки сохранятся. Войти снова можно по коду из SMS или e-mail.</div>' +
    '<button class="btn btn-primary btn-block" data-act="l0-logout-yes">Выйти</button>' +
    '<button class="btn btn-ghost btn-block" data-act="sheet-close">Остаться</button>'));
  D.action('l0-logout-yes', () => { D.closeSheet(); location.hash = '#/A1'; });

  /* ---------- L5 Семья и команда ---------- */
  const ST = { ticket: ['из вашего билета', 'accent'], confirmed: ['подтверждено', 'ok'], added: ['добавлено вами', ''], invited: ['приглашение отправлено', ''], rejected: ['отклонено', ''] };
  const stTag = s => ST[s] ? tag(ST[s][0], ST[s][1]) : '';
  const yrs = n => n + ' ' + D.plural(n, ['год', 'года', 'лет']);
  const L5ACTS = {
    ticket: [['l5-ok', 'Подтвердить', 'btn-secondary'], ['l5-edit', 'Править', 'btn-ghost']],
    confirmed: [['l5-edit', 'Править', 'btn-secondary']],
    added: [['l5-edit', 'Править', 'btn-secondary']],
    invited: [['l5-revoke', 'Отозвать приглашение', 'btn-secondary']],
    rejected: [['l5-back', 'Вернуть', 'btn-secondary']]
  };
  function memCard(o) {
    return '<div class="cab-mem' + (o.state === 'rejected' ? ' dim' : '') + '"><div class="cab-mem-h">' + o.lead +
      '<div class="grow"><div class="r-title">' + o.title + '</div>' + (o.sub ? '<div class="r-sub">' + o.sub + '</div>' : '') +
      '<div class="cab-mem-tag">' + stTag(o.state) + '</div></div></div>' +
      '<div class="cab-mem-act">' + (L5ACTS[o.state] || []).map(a =>
        '<button class="btn ' + a[2] + ' btn-sm" data-act="' + a[0] + '" data-arg="' + o.ref + '">' + a[1] + '</button>').join('') + '</div></div>';
  }
  D.register('L5', {
    tab: '-',
    meta: {
      title: 'L5 · Семья и команда',
      role: 'Гость, профиль',
      fr: ['FR-PROF-05', 'FR-PROF-06', 'FR-PROF-12', 'FR-ONB-06'],
      ac: ['AC-PROF-04', 'AC-PROF-05', 'AC-PROF-12', 'AC-ONB-06'],
      what: [
        'Семейное положение, спутник и дети подтягиваются из данных менеджеров и билета с меткой «из вашего билета».',
        'Подтвердить, поправить или отклонить каждую позицию; «Подтвердить всё» открывает лист со списком.',
        'Добавить ребёнка; пригласить спутника или коллегу по контакту (связь после подтверждения приглашённым).',
        'Согласия семьи: детский клуб, фото детей, участие спутника.'
      ],
      rules: [
        'До подтверждения данные видите только вы: они не показываются другим, не участвуют в подборе и не передаются в языковую модель.',
        'Профиль ребёнка не попадает в каталог и не получает заявок: его видят родитель и организаторы детской программы.',
        'Приглашение не создаёт связь и не раскрывает данные, пока приглашённый его не подтвердит.',
        'Основание для данных о детях — вопрос юристу (решение заказчика не получено).'
      ],
      depends: ['D-45', 'программы Спутника', 'вопрос юристу: данные о детях']
    },
    html() {
      const f = PS.family, pend = PS.pending(), m = f.marital, c = f.companion;
      f.invites = f.invites || [];
      const kids = f.kids;
      const nk = f.kids.filter(k => k.state !== 'rejected').length;
      const consRow = x => {
        const on = x.on === undefined ? x.def : x.on;
        return '<label class="toggle-row"><div class="grow"><div class="tr-title">' + esc(x.title) + '</div><div class="tr-sub">' + esc(x.sub) + '</div></div>' +
          '<span class="toggle"><input type="checkbox" data-act="l5-cons" data-arg="' + x.id + '"' + (on ? ' checked' : '') + ' aria-label="' + esc(x.title) + '"><span class="tr"></span></span></label>';
      };
      const lead = ic => '<span class="cab-ic">' + icon(ic) + '</span>';
      return '<div class="scr">' +
        D.head({ backHist: true, eyebrow: 'Кабинет', title: 'Семья и команда', sub: 'спутник, дети, коллеги по контакту', paren: paren('до подтверждения видите только вы') }) +
        '<div class="cab-body">' +
        (pend
          ? '<div class="banner info">' + icon('inbox') + '<div class="grow"><div class="b-title">Мы получили данные из вашего билета</div>' +
            '<div class="cap">Загружено ' + esc(f.loadedAt) + ' из данных менеджеров. Они не показываются другим, не участвуют в подборе и не передаются ИИ, пока вы не подтвердите.</div>' +
            '<button class="btn btn-primary btn-sm cab-bn-btn" data-act="l5-all">Подтвердить всё (' + pend + ')</button></div></div>'
          : '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Данные из билета разобраны</div><div class="cap">Подтверждённое можно поправить в любой момент.</div></div></div>') +
        sec('Семья') +
        (m ? memCard({ ref: 'marital', lead: lead('user'), title: 'Семейное положение', sub: esc(m.value), state: m.state }) : '') +
        (c ? memCard({ ref: 'companion', lead: avatar(c.name, 'sm'), title: esc(c.name) + ' · ' + esc(c.role), sub: esc(c.perm), state: c.state })
           : '<div class="cab-empty">Спутник не указан. Билет «Спутник» оформляется через организатора, приглашение — ниже.</div>') +
        sec('Дети · ' + nk) +
        (kids.map(k => memCard({ ref: 'kid:' + k.id, lead: avatar(k.name, 'sm'), title: esc(k.name) + ', ' + yrs(k.age),
          sub: k.interests.length ? 'интересы: ' + esc(k.interests.join(' · ')) : 'интересы не указаны', state: k.state })).join('') ||
          '<div class="cab-empty">Детей нет. Добавьте ребёнка, чтобы записать его в детскую программу.</div>') +
        '<button class="btn btn-secondary btn-block" data-act="l5-addkid">' + icon('plus') + 'Добавить ребёнка</button>' +
        sec('Команда') +
        (f.invites.map(v => memCard({ ref: 'inv:' + v.id, lead: avatar(v.name, 'sm'), title: esc(v.name) + ' · ' + esc(v.type), sub: esc(v.contact), state: v.state })).join('') ||
          '<div class="cab-empty">Приглашений нет. Спутник или коллега по контакту появится здесь после подтверждения приглашения.</div>') +
        '<button class="btn btn-secondary btn-block" data-act="l5-invite">' + icon('userPlus') + 'Пригласить спутника или коллегу</button>' +
        sec('Согласия семьи') +
        '<div class="card cab-cons">' + f.consents.map(consRow).join('') + '</div>' +
        paren('ребёнка нет в каталоге участников') +
        '<div class="cab-end"></div></div></div>';
    }
  });

  /* поиск позиции по ссылке «вид:id» */
  function l5find(ref) {
    const f = PS.family, p = ref.split(':');
    if (p[0] === 'marital') return { kind: 'marital', o: f.marital };
    if (p[0] === 'companion') return { kind: 'companion', o: f.companion };
    if (p[0] === 'kid') return { kind: 'kid', o: f.kids.find(k => k.id === p[1]) };
    if (p[0] === 'inv') return { kind: 'inv', o: (f.invites || []).find(v => v.id === p[1]), list: f.invites };
    return {};
  }
  D.action('l5-ok', el => {
    const r = l5find(el.dataset.arg);
    if (!r.o) return;
    r.o.state = 'confirmed';
    rr('Подтверждено: теперь это данные вашего профиля');
  });
  D.action('l5-back', el => {
    const r = l5find(el.dataset.arg);
    if (!r.o) return;
    r.o.state = 'ticket';
    rr('Данные снова ждут подтверждения');
  });
  D.action('l5-revoke', el => {
    const r = l5find(el.dataset.arg);
    if (!r.list) return;
    r.list.splice(r.list.indexOf(r.o), 1);
    rr('Приглашение отозвано');
  });
  D.action('l5-all', () => {
    const f = PS.family, items = [];
    if (f.marital && f.marital.state === 'ticket') items.push('Семейное положение: ' + f.marital.value);
    if (f.companion && f.companion.state === 'ticket') items.push('Спутник: ' + f.companion.name + ', ' + f.companion.role);
    f.kids.filter(k => k.state === 'ticket').forEach(k => items.push('Ребёнок: ' + k.name + ', ' + yrs(k.age)));
    sheet('Подтвердить данные из билета',
      '<div class="cap">Эти данные станут частью вашего профиля. Дети в каталог не попадают в любом случае.</div>' +
      '<div class="cab-sheet-list">' + items.map(t => '<div class="cab-sl">' + icon('check') + '<span>' + esc(t) + '</span></div>').join('') + '</div>' +
      '<button class="btn btn-primary btn-block" data-act="l5-all-yes">Подтвердить</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>');
  });
  D.action('l5-all-yes', () => {
    const f = PS.family;
    if (f.marital && f.marital.state === 'ticket') f.marital.state = 'confirmed';
    if (f.companion && f.companion.state === 'ticket') f.companion.state = 'confirmed';
    f.kids.forEach(k => { if (k.state === 'ticket') k.state = 'confirmed'; });
    rr('Данные из билета подтверждены');
  });
  let famSeq = 0;   /* счётчик идентификаторов добавленных детей и приглашений: после удаления номера не повторяются */
  D.action('l5-cons', el => {
    const x = PS.family.consents.find(c => c.id === el.dataset.arg);
    if (!x) return;
    x.on = el.checked;
    rr(el.checked ? 'Согласие выдано: ' + x.title.toLowerCase() : 'Согласие отозвано: ' + x.title.toLowerCase());
  });

  /* лист правки позиции */
  const errField = '<div class="err-msg" data-err></div>';
  D.action('l5-edit', el => {
    const ref = el.dataset.arg, r = l5find(ref), o = r.o;
    if (!o) return;
    const isTicket = o.state === 'ticket';
    const foot = (saveLabel, extra) =>
      '<button class="btn btn-primary btn-block" data-act="l5-save" data-arg="' + ref + '">' + saveLabel + '</button>' + (extra || '') +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>';
    const rejectBtn = isTicket ? '<button class="btn btn-ghost btn-block btn-danger-text" data-act="l5-reject" data-arg="' + ref + '">Отклонить: это не про меня</button>' : '';
    const delBtn = o.state === 'added' && r.kind === 'kid' ? '<button class="btn btn-ghost btn-block btn-danger-text" data-act="l5-del" data-arg="' + ref + '">Удалить</button>' : '';
    if (r.kind === 'marital') {
      sheet('Семейное положение',
        '<div class="field"><label>Выберите вариант</label><select class="input" data-f="v">' +
        ['Женат/замужем', 'Не женат/не замужем'].map(x => '<option' + (o.value === x ? ' selected' : '') + '>' + x + '</option>').join('') + '</select></div>' +
        '<div class="cap cab-gap">Поле необязательное и по умолчанию видно только вам.</div>' + foot(isTicket ? 'Сохранить и подтвердить' : 'Сохранить', rejectBtn));
    } else if (r.kind === 'companion') {
      sheet('Спутник',
        '<div class="field"><label>Имя и фамилия</label><input class="input" data-f="name" value="' + esc(o.name) + '"></div>' +
        '<div class="field cab-gap"><label>Кем приходится</label><input class="input" data-f="role" value="' + esc(o.role) + '"></div>' + errField +
        '<div class="cap cab-gap">' + esc(o.perm) + '</div>' + foot(isTicket ? 'Сохранить и подтвердить' : 'Сохранить', rejectBtn));
    } else if (r.kind === 'kid') {
      sheet('Ребёнок', kidForm(o) + foot(isTicket ? 'Сохранить и подтвердить' : 'Сохранить', rejectBtn + delBtn));
    }
  });
  function kidForm(k) {
    k = k || { name: '', age: 8, interests: [] };
    return '<div class="field"><label>Имя</label><input class="input" data-f="name" value="' + esc(k.name) + '" placeholder="Например, Миша"></div>' +
      '<div class="field cab-gap"><label>Возраст</label><select class="input" data-f="age">' +
      Array.from({ length: 18 }, (_, i) => '<option value="' + i + '"' + (i === k.age ? ' selected' : '') + '>' + yrs(i) + '</option>').join('') + '</select></div>' +
      '<div class="field cab-gap"><label>Интересы для детской программы</label><div class="cab-chips">' +
      F.FAMILY_DB.interests.map(t => '<button class="chip' + (k.interests.includes(t) ? ' on' : '') + '" data-act="cab-chip" data-v="' + esc(t) + '" data-k="int" aria-pressed="' + k.interests.includes(t) + '">' + esc(t) + '</button>').join('') + '</div></div>' + errField;
  }
  D.action('l5-addkid', () => sheet('Новый ребёнок', kidForm() +
    '<div class="cap cab-gap">Данные ребёнка видят только вы и организаторы детской программы.</div>' +
    '<button class="btn btn-primary btn-block" data-act="l5-save" data-arg="kid:new">Добавить ребёнка</button>' +
    '<button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>'));
  D.action('l5-save', el => {
    const ref = el.dataset.arg, f = PS.family;
    if (ref === 'kid:new') {
      const name = val('[data-f="name"]').trim();
      if (!name) return sheetErr('Укажите имя ребёнка', '[data-f="name"]');
      f.kids.push({ id: 'ka' + (++famSeq), name, age: +val('[data-f="age"]'), interests: chipsOn('[data-k="int"]'), state: 'added' });
      return rr('Ребёнок добавлен: ' + name);
    }
    const r = l5find(ref), o = r.o;
    if (!o) return;
    if (r.kind === 'marital') o.value = val('[data-f="v"]');
    if (r.kind === 'companion') {
      const name = val('[data-f="name"]').trim();
      if (!name) return sheetErr('Укажите имя спутника', '[data-f="name"]');
      o.name = name; o.role = val('[data-f="role"]').trim() || o.role;
    }
    if (r.kind === 'kid') {
      const name = val('[data-f="name"]').trim();
      if (!name) return sheetErr('Укажите имя ребёнка', '[data-f="name"]');
      o.name = name; o.age = +val('[data-f="age"]'); o.interests = chipsOn('[data-k="int"]');
    }
    if (o.state === 'ticket') o.state = 'confirmed';
    rr('Данные сохранены');
  });
  D.action('l5-reject', el => {
    const r = l5find(el.dataset.arg);
    if (!r.o) return;
    r.o.state = 'rejected';
    rr('Данные отклонены: они не будут использоваться');
  });
  D.action('l5-del', el => {
    const r = l5find(el.dataset.arg), f = PS.family;
    if (r.kind === 'kid' && r.o) { f.kids.splice(f.kids.indexOf(r.o), 1); rr('Ребёнок удалён'); }
  });
  D.action('l5-invite', () => {
    const c = PS.family.companion, taken = c && c.state !== 'rejected';
    sheet('Пригласить в команду',
      '<div class="field"><label>Кого приглашаете</label><div class="cab-chips">' +
      '<button class="chip' + (taken ? '' : ' on') + '" data-act="cab-chip" data-single="1" data-v="Спутник"' + (taken ? ' disabled' : '') + ' aria-pressed="' + (!taken) + '">Спутник</button>' +
      '<button class="chip' + (taken ? ' on' : '') + '" data-act="cab-chip" data-single="1" data-v="Коллега по контакту" aria-pressed="' + taken + '">Коллега по контакту</button></div>' +
      (taken ? '<div class="hint">Спутник уже есть в билете: второго пригласить нельзя.</div>' : '') + '</div>' +
      '<div class="field cab-gap"><label>Имя и фамилия</label><input class="input" data-f="name" placeholder="Как зовут"></div>' +
      '<div class="field cab-gap"><label>Телефон или e-mail</label><input class="input" data-f="contact" placeholder="+7 900 000-00-00 или name@example.ru"></div>' + errField +
      '<div class="banner cab-gap">' + icon('info') + '<div class="cap">Связь появится, когда человек подтвердит приглашение. До этого он не увидит ваши данные.</div></div>' +
      '<button class="btn btn-primary btn-block" data-act="l5-invite-send">Отправить приглашение</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>');
  });
  D.action('l5-invite-send', () => {
    const name = val('[data-f="name"]').trim(), contact = val('[data-f="contact"]').trim();
    const type = chipsOn('.chip')[0] || 'Коллега по контакту';
    if (!name) return sheetErr('Укажите имя', '[data-f="name"]');
    if (!/@/.test(contact) && contact.replace(/\D/g, '').length < 10) return sheetErr('Укажите телефон (10 цифр и больше) или e-mail', '[data-f="contact"]');
    const f = PS.family;
    f.invites = f.invites || [];
    f.invites.push({ id: 'ia' + (++famSeq), type, name, contact, state: 'invited' });
    rr('Приглашение отправлено: ' + name);
  });

  /* ---------- уровни видимости: общие компоненты L6 и L7 ---------- */
  function visPill(id) {
    const lv = PS.vis(id), i = lvl(lv), f = fld(id);
    const off = lv === 'partners' && !PS.consents.scan;
    return '<button class="cab-vis v-' + lv + (off ? ' off' : '') + '" data-act="l-vis" data-arg="' + id + '" aria-label="Видимость поля «' + esc(f.label) + '»: ' + esc(i.label) + (off ? ', без согласия не передаётся' : '') + '">' +
      icon(i.icon) + '<span>' + esc(i.label) + '</span></button>';
  }
  /* поле ждёт подтверждения данных из билета (семья, дети): L5 */
  const tickPending = id => id === 'family' ? !!(PS.family.marital && PS.family.marital.state === 'ticket')
    : id === 'kids' ? PS.family.kids.some(k => k.state === 'ticket') : false;
  const unsetText = f => tickPending(f.id) ? 'из билета: ждёт подтверждения' : 'не заполнено';
  function visOptions(sel, compact) {
    return '<div class="cab-opts' + (compact ? ' compact' : '') + '" role="radiogroup">' + F.TAXO.VISIBILITY.map(v => {
      const i = lvl(v.id), on = sel === v.id;
      return '<button class="cab-opt' + (on ? ' on' : '') + '" role="radio" aria-checked="' + on + '" data-act="l-vis-pick" data-v="' + v.id + '">' +
        '<span class="cab-ic">' + icon(i.icon) + '</span><span class="grow"><span class="cab-opt-t">' + esc(i.label) + '</span><span class="cab-opt-d">' + esc(i.desc) + '</span></span>' +
        '<span class="cab-opt-ck">' + icon('check') + '</span></button>';
    }).join('') + '</div>';
  }
  const visNote = id => id === 'revenue'
    ? 'Оборот по умолчанию используется только подбором. Другие участники увидят его, только если вы выберете «Все участники».'
    : id === 'kids' ? 'Показывается только число детей. Имена, возраст и интересы детей в каталог не попадают на любом уровне.'
    : 'Подбор учитывает поле независимо от уровня видимости: решает только то, что увидят люди.';
  D.action('l-vis', el => {
    const id = el.dataset.arg, f = fld(id);
    sheet(esc(f.label), '<div class="cap">Кто видит это поле</div>' + visOptions(PS.vis(id)) +
      '<div class="cab-note cab-gap">' + esc(visNote(id)) + '</div>' +
      '<button class="btn btn-primary btn-block" data-act="l-vis-save" data-arg="' + id + '">Сохранить</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>');
  });
  D.action('l-vis-pick', el => {
    el.parentElement.querySelectorAll('.cab-opt').forEach(b => { b.classList.remove('on'); b.setAttribute('aria-checked', 'false'); });
    el.classList.add('on');
    el.setAttribute('aria-checked', 'true');
  });
  D.action('l-vis-save', el => {
    const on = document.querySelector('.sheet .cab-opt.on'), id = el.dataset.arg;
    if (!on) return;
    PS.setVis(id, on.dataset.v);
    rr('Видимость «' + fld(id).label + '»: ' + lvl(on.dataset.v).label + (on.dataset.v === 'partners' && !PS.consents.scan ? ' (согласие экспонентам выключено)' : ''), 2800);
  });

  /* ---------- L6 Приватность ---------- */
  const L6TABS = ['vis', 'cons', 'data'];
  L6TABS.forEach(t => D.action('l6-tab-' + t, () => { D.st('L6').tab = t; rr(); }));
  D.action('l6-aud', el => { D.st('L6').aud = el.dataset.arg; rr(); });
  D.action('l6-log-all', () => { const s = D.st('L6'); s.logAll = !s.logAll; rr(); });
  D.action('l6-policy', () => D.toast('Политика откроется в браузере: atlantycity.ru/legal#privacy', 3200));

  /* что видит зритель: уровни по FR-LEAD-08 и AC-LEAD-06 */
  const seesField = (aud, id) => PS.canSee(aud, id);
  const CONS_REVOKE = {
    profile: 'Вас не будет в каталоге, подсказках и умной строке не позднее чем через минуту. Компания и продукты также не будут помечены как ваши. Билет, записи и встречи сохранятся.',
    scan: 'Экспоненты при сканировании будут видеть только ваше имя и компанию. Остальные поля им не передаются.',
    notify: 'Уведомления о «Моём пути», ленте, чатах встреч, встречах и записях перестанут приходить. Настройки типов и каналов сохранятся, согласие можно выдать снова.',
    club: 'Передача данных клубу «Атланты» прекратится сразу. На доступ к приложению это не влияет.'
  };
  /* короткие названия согласий для тостов (длинный тост закрывает экран) */
  const CONS_SHORT = { profile: 'показ профиля', scan: 'передача контактов экспонентам', notify: 'уведомления', club: 'передача данных клубу' };

  D.register('L6', {
    tab: '-',
    meta: {
      title: 'L6 · Приватность',
      role: 'Гость, профиль',
      fr: ['FR-AUTH-06', 'FR-PROF-08', 'FR-PROF-09', 'FR-ONB-08', 'FR-ONB-09', 'FR-LEAD-08', 'FR-LEAD-09', 'FR-PPL-12', 'FR-AI-06'],
      ac: ['AC-AUTH-04', 'AC-PROF-08', 'AC-PROF-09', 'AC-LEAD-06', 'AC-LEAD-07', 'AC-ONB-08', 'AC-ONB-09'],
      what: [
        'Видимость: четыре уровня (D-47) по каждому полю профиля; лист выбора применяется по кнопке «Сохранить» и сразу виден в разделе «Профиль» (L7).',
        'Блок «Что увидят»: глазами любого участника, участника со встречей и экспонента при сканировании (по согласию).',
        'Согласия с версиями и датой: обязательное, показ профиля, передача контактов экспонентам, уведомления и необязательное «Передавать мои данные клубу «Атланты»» (D-44: профиль и итоги, без контактов других людей).',
        'Подбор: «работает автоматически, отключить нельзя» (D-46), без числовой оценки людей.',
        'Мои данные: выгрузка файлом, запрос на удаление с подтверждением в листе, журнал согласий, «Кто меня сканировал».'
      ],
      rules: [
        'Поле уровня «Только вы» не видит никто, кроме владельца; поле уровня «Экспоненты и спикеры по согласию» передаётся только при выданном согласии, без согласия экспонент видит имя и компанию.',
        'Оборот по умолчанию — «Только вы» и используется только подбором; открыть его на уровне «Все участники» может сам участник.',
        'Уровень видимости не отключает поле от подбора; отказаться от автоматизированного подбора нельзя (D-46).',
        'Отзыв согласия на показ профиля убирает человека из каталога; согласие клубу не отмечено заранее и на доступ к приложению не влияет (D-44).',
        'Удаление выполняется по запросу, пока запрос не исполнен, его можно отменить.'
      ],
      depends: ['D-44', 'D-46', 'D-47', 'D-29 политика обработки данных', 'решение юриста по согласию клубу (O-21)']
    },
    html(ctx) {
      const st = ctx.state;
      st.tab = st.tab || 'vis';
      st.aud = st.aud || 'any';
      const tab = st.tab, ME = F.ME;
      let body = '';

      if (tab === 'vis') {
        const aud = F.VIS_AUDIENCES.find(a => a.id === st.aud) || F.VIS_AUDIENCES[0];
        const seen = PS.fields().filter(f => seesField(aud.id, f.id) && PS.display(f.id));
        const hidden = PS.fields().length - seen.length;
        const pv = (k, v, lock) => '<div class="cab-pv"><span class="k">' + esc(k) + '</span><span class="v">' + esc(v) + (lock ? ' ' + icon('lock') : '') + '</span></div>';
        const emptyAud = !seen.length && aud.id !== 'scan';
        body += (!PS.consents.profile ? '<div class="banner warn">' + icon('alert') + '<div><div class="b-title">Показ профиля выключен</div><div class="cap">Вас нет в каталоге, подсказках и умной строке. Включить можно на вкладке «Согласия».</div></div></div>' : '') +
          sec('Что увидят') +
          '<div class="cab-chips">' + F.VIS_AUDIENCES.map(a => '<button class="chip' + (a.id === aud.id ? ' on' : '') + '" data-act="l6-aud" data-arg="' + a.id + '" aria-pressed="' + (a.id === aud.id) + '">' + esc(a.label) + '</button>').join('') + '</div>' +
          '<div class="card cab-prev"><div class="cab-note">' + esc(aud.note) + '</div>' +
          (aud.id === 'scan' && !PS.consents.scan ? '<div class="banner warn cab-in">' + icon('alert') + '<div class="cap">Согласие на передачу контактов выключено: экспонент видит только имя и компанию и может запросить контакт.</div></div>' : '') +
          (aud.id !== 'scan' && PS.profileVisible() ? pv('Тариф', ME.tariff, true) : '') +
          (seen.length ? seen.map(f => pv(f.label, PS.display(f.id))).join('') : (emptyAud ? '<div class="cab-empty">Профиль скрыт из каталога: участники не видят ничего.</div>' : '')) +
          '<div class="cab-note">Скрыто от них: ' + hidden + ' ' + D.plural(hidden, ['поле', 'поля', 'полей']) + (aud.id === 'scan' ? '. Поля «Те, с кем у меня встреча» видны, только если встреча с их компанией есть.' : '.') + '</div></div>' +
          sec('Поля и уровни') +
          '<div class="card cab-list"><div class="list">' +
          '<div class="cab-lrow"><div class="cab-lmain"><div class="r-title">Тариф</div><div class="cab-lv">' + esc(ME.tariff) + '</div></div>' +
          '<span class="cab-vis fixed">' + icon('people') + '<span>Все участники</span></span></div>' +
          PS.fields().map(f => {
            const dv = PS.display(f.id), off = PS.vis(f.id) === 'partners' && !PS.consents.scan;
            return '<div class="cab-lrow"><div class="cab-lmain"><div class="r-title">' + esc(f.label) + '</div>' +
              '<div class="cab-lv' + (dv ? '' : ' unset') + '">' + (dv ? esc(dv) : unsetText(f)) + '</div>' +
              (off ? '<div class="cab-warn">без согласия не передаётся</div>' : '') + '</div>' + visPill(f.id) + '</div>';
          }).join('') + '</div></div>' +
          '<div class="cab-note">Тариф виден всем и не редактируется. Подбор учитывает поля на любом уровне видимости.</div>' +
          sec('Что значат уровни') +
          '<div class="card cab-list"><div class="list">' + F.TAXO.VISIBILITY.map(v => {
            const i = lvl(v.id);
            return '<div class="cab-lvl"><span class="cab-ic">' + icon(i.icon) + '</span><div class="grow"><div class="r-title">' + esc(i.label) + '</div><div class="r-sub">' + esc(i.desc) + '</div><div class="cab-ex">' + esc(i.example) + '</div></div></div>';
          }).join('') + '</div></div>';
      }

      if (tab === 'cons') {
        const crow = c => {
          const on = !!PS.consents[c.id];
          const status = on ? (c.given ? 'выдано ' + c.given : 'выдано') : 'не выдано';
          const meta = [c.ver, status].filter(Boolean).join(' · ');
          if (c.req) {
            return '<div class="cab-crow cab-crow-req"><div class="cab-crow-h"><div class="grow"><div class="r-title">' + esc(c.title) + '</div></div>' +
              '<span class="cab-reqtag">' + icon('lock') + 'Обязательное</span></div>' +
              '<div class="cab-crow-s">' + esc(c.sub) + '</div><div class="cab-crow-m"><span class="cap">' + esc(meta) + '</span></div></div>';
          }
          return '<div class="cab-crow"><div class="cab-crow-h"><div class="grow"><div class="r-title">' + esc(c.title) + '</div></div>' +
            '<label class="toggle"><input type="checkbox" data-act="l6-cons" data-arg="' + c.id + '"' + (on ? ' checked' : '') + ' aria-label="' + esc(c.title) + '"><span class="tr"></span></label></div>' +
            '<div class="cab-crow-s">' + esc(c.sub) + '</div>' +
            '<div class="cab-crow-m">' + (c.id === 'club' ? tag('необязательное') : '') + '<span class="cap">' + esc(meta) + '</span></div>' +
            (c.id === 'scan' || c.id === 'club' ? '<button class="cab-link" data-act="l6-text" data-arg="' + c.id + '">Показать текст согласия' + icon('chevR') + '</button>' : '') +
            (c.link ? '<button class="cab-link" data-go="' + c.link + '">Настроить типы и каналы' + icon('chevR') + '</button>' : '') + '</div>';
        };
        const log = st.logAll ? PS.consentLog : PS.consentLog.slice(0, 3);
        body += sec('Согласия') +
          '<div class="card cab-cons">' + F.CONSENTS.map(crow).join('') + '</div>' +
          '<button class="row clickable cab-solo" data-act="l6-policy"><span class="cab-ic">' + icon('file') + '</span><div class="grow"><div class="r-title">Политика обработки данных</div><div class="r-sub">atlantycity.ru/legal#privacy</div></div>' + icon('chevR') + '</button>' +
          sec('Подбор') +
          '<div class="card"><div class="r-title">Работает автоматически, отключить нельзя</div>' +
          '<div class="cab-note cab-pad">Подбор людей и решений идёт сам: по целям, запросу, отрасли, хобби и пользе для других. Числовой оценки совпадения и рейтинга людей нет. Уровень видимости не отключает поле от подбора, а оборот используется только им. Без подбора «Мой путь» не соберётся. Скрыть себя от других можно, отозвав показ профиля.</div>' +
          '<div class="cab-lock">' + icon('lock') + '<span>Автоматический подбор: всегда включён</span></div>' +
          '<button class="cab-link" data-go="N8">Почему это в вашем пути' + icon('chevR') + '</button></div>' +
          sec('Журнал согласий', '<button class="more" data-act="l6-log-all">' + (st.logAll ? 'Свернуть' : 'Показать всё') + '</button>') +
          '<div class="card cab-list"><div class="list">' + log.map(l =>
            '<div class="cab-log"><div class="grow"><div class="r-title">' + esc(l.title) + '</div><div class="r-sub">' + esc(l.time) + (l.ver ? ' · ' + esc(l.ver) : '') + '</div></div>' +
            tag(l.to, l.to === 'дано' ? 'ok' : 'warn') + '</div>').join('') + '</div></div>';
      }

      if (tab === 'data') {
        body += (PS.exportReq ? '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Выгрузка запрошена</div><div class="cap">' + esc(PS.exportReq) + ' · файл формируется до 5 минут. В демо файл не создаётся.</div></div></div>' : '') +
          (PS.deleteReq ? '<div class="banner warn">' + icon('alert') + '<div class="grow"><div class="b-title">Запрос на удаление отправлен</div><div class="cap">' + esc(PS.deleteReq) + ' · пока запрос не исполнен, его можно отменить.</div>' +
            '<button class="btn btn-secondary btn-sm cab-bn-btn" data-act="l6-del-cancel">Отменить запрос</button></div></div>' : '') +
          sec('Мои данные') +
          '<div class="card"><div class="r-title">Выгрузить мои данные</div><div class="cab-note cab-pad">Файл в читаемом виде: ' + esc(F.EXPORT_PARTS.slice(0, 4).join(', ').toLowerCase()) + ' и другое.</div>' +
          '<button class="btn btn-secondary btn-block" data-act="l6-export">' + icon('download') + 'Выгрузить мои данные</button></div>' +
          '<div class="card cab-danger"><div class="r-title">Удалить аккаунт и данные</div><div class="cab-note cab-pad">Билеты, записи и встречи будут отменены, профиль исчезнет из каталога. Запрос исполняется в сроки, которые определяет закон о персональных данных.</div>' +
          '<button class="btn btn-secondary btn-block cab-btn-danger" data-act="l6-del">' + icon('alert') + 'Удалить аккаунт</button></div>' +
          sec('Кто видел мои данные') +
          '<div class="card cab-list"><div class="list">' +
          '<button class="row clickable cab-row" data-go="J6"><span class="cab-ic">' + icon('scan') + '</span><div class="grow"><div class="r-title">Кто меня сканировал</div><div class="r-sub">экспоненты, текст и версия согласия</div></div>' + icon('chevR') + '</button>' +
          '</div></div>' +
          sec('Как вас видят') +
          '<div class="card cab-list"><div class="list">' +
          '<button class="row clickable cab-row" data-go="F7"><span class="cab-ic">' + icon('qr') + '</span><div class="grow"><div class="r-title">Моя визитка</div><div class="r-sub">так вас видят при обмене контактами</div></div>' + icon('chevR') + '</button>' +
          '</div></div>';
      }

      return '<div class="scr">' +
        D.head({ back: 'L0', eyebrow: 'Кабинет', title: 'Приватность', sub: 'кто видит поля, согласия и ваши данные', paren: paren('решаете вы, подбор работает всегда') }) +
        '<div class="cab-segwrap">' + D.segbar([['l6-tab-vis', 'Видимость'], ['l6-tab-cons', 'Согласия'], ['l6-tab-data', 'Мои данные']], 'l6-tab-' + tab, 'data-act') + '</div>' +
        '<div class="cab-body">' + body + '<div class="cab-end"></div></div></div>';
    }
  });

  D.action('l6-text', el => {
    const id = el.dataset.arg === 'club' ? 'club' : 'scan';
    sheet('Текст согласия',
      '<div class="cab-quote">' + esc(F.CONSENT_TEXT[id]) + '</div>' +
      (id === 'scan' ? '<div class="cap cab-gap">' + esc(F.CONSENT_TEXT.ver) + '. Версия текста записывается в каждое сканирование.</div>'
        : '<div class="cap cab-gap">Согласие не влияет на доступ к приложению. Отозвать его можно в любой момент в этом разделе.</div>') +
      '<button class="btn btn-primary btn-block" data-act="sheet-close">Понятно</button>');
  });
  /* выдача и отзыв согласия: значение, дата выдачи (FIX.CONSENTS[i].given) и запись в журнале */
  function consSet(id, want) {
    const c = F.CONSENTS.find(x => x.id === id);
    PS.grant(id, want);
    PS.consentLog.unshift({ time: PS.stamp(), title: c.title, to: want ? 'дано' : 'отозвано', ver: c.ver });
    rr((want ? 'Выдано: ' : 'Отозвано: ') + (CONS_SHORT[id] || c.title.toLowerCase()), 2800);
  }
  D.action('l6-cons', (el, ev) => {
    const id = el.dataset.arg, want = el.checked, c = F.CONSENTS.find(x => x.id === id);
    if (!c || id === 'pd') return;
    if (!want && CONS_REVOKE[id]) {
      ev.preventDefault();
      sheet('Отозвать согласие?', '<div class="r-title">' + esc(c.title) + '</div><div class="cap cab-gap">' + esc(CONS_REVOKE[id]) + '</div>' +
        '<button class="btn btn-primary btn-block" data-act="l6-cons-yes" data-arg="' + id + ':0">Отозвать согласие</button>' +
        '<button class="btn btn-ghost btn-block" data-act="sheet-close">Оставить</button>');
      return;
    }
    if (want && id === 'club') {
      ev.preventDefault();
      sheet('Передавать данные клубу?', '<div class="cab-quote">' + esc(F.CONSENT_TEXT.club) + '</div>' +
        '<div class="cap cab-gap">На доступ к приложению согласие не влияет.</div>' +
        '<button class="btn btn-primary btn-block" data-act="l6-cons-yes" data-arg="' + id + ':1">Согласен</button>' +
        '<button class="btn btn-ghost btn-block" data-act="sheet-close">Не сейчас</button>');
      return;
    }
    consSet(id, want);
  });
  D.action('l6-cons-yes', el => {
    const [id, w] = el.dataset.arg.split(':');
    consSet(id, w === '1');
  });
  D.action('l6-export', () => sheet('Выгрузка данных',
    '<div class="cap">Файл будет содержать:</div><div class="cab-sheet-list">' + F.EXPORT_PARTS.map(t => '<div class="cab-sl">' + icon('check') + '<span>' + esc(t) + '</span></div>').join('') + '</div>' +
    '<div class="cap cab-gap">Формирование занимает до 5 минут.</div>' +
    '<button class="btn btn-primary btn-block" data-act="l6-export-yes">Запросить выгрузку</button>' +
    '<button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>'));
  D.action('l6-export-yes', () => { PS.exportReq = 'Запрос от ' + PS.stamp(); rr('Выгрузка запрошена: файл формируется'); });
  D.action('l6-del', () => sheet('Удалить аккаунт?',
    '<div class="cab-sheet-list">' + F.DELETE_EFFECTS.map(t => '<div class="cab-sl">' + icon('alert') + '<span>' + esc(t) + '</span></div>').join('') + '</div>' +
    '<div class="cab-chips cab-gap"><button class="chip cab-ack" data-act="l6-del-ack" aria-pressed="false">' + icon('check') + 'Я понимаю последствия</button></div>' +
    '<button class="btn btn-primary btn-block" data-act="l6-del-yes" id="l6-del-btn" disabled>Отправить запрос на удаление</button>' +
    '<button class="btn btn-ghost btn-block" data-act="sheet-close">Оставить аккаунт</button>'));
  D.action('l6-del-ack', el => {
    const on = !el.classList.contains('on');
    el.classList.toggle('on', on);
    el.setAttribute('aria-pressed', on ? 'true' : 'false');
    const b = document.getElementById('l6-del-btn');
    if (b) b.disabled = !on;
  });
  D.action('l6-del-yes', () => { PS.deleteReq = 'Запрос от ' + PS.stamp(); rr('Запрос на удаление отправлен', 2800); });
  D.action('l6-del-cancel', () => { PS.deleteReq = null; rr('Запрос на удаление отменён'); });

  /* ---------- L7 Профиль ---------- */
  const L7GO = { request: 'L8', goals: 'L8', family: 'L5', kids: 'L5' };
  D.action('l7-preview', () => { const s = D.st('L6'); s.tab = 'vis'; location.hash = '#/L6'; });
  D.register('L7', {
    tab: '-',
    meta: {
      title: 'L7 · Профиль',
      role: 'Гость, кабинет',
      fr: ['FR-PROF-04', 'FR-PROF-07', 'FR-PROF-08', 'FR-PROF-09', 'FR-PROF-10', 'FR-PROF-12', 'FR-PROF-13'],
      ac: ['AC-PROF-02', 'AC-PROF-06', 'AC-PROF-08', 'AC-PROF-09', 'AC-PROF-10', 'AC-PROF-13'],
      what: [
        'Поля профиля (часть 5.3): имя, компания, сайт, отрасль, оборот, бизнес-сообщества, хобби, спорт, польза, запрос, цели, Instagram, семья, дети, Telegram.',
        'У каждого поля метка уровня видимости (D-47); нажатие на метку или на значение открывает лист: значение и уровень сохраняются кнопкой.',
        'Цели и запрос правятся в разделе «Цели и запросы» (L8), семья и дети — в разделе «Семья и команда» (L5); неподтверждённые данные из билета не показываются как значения.',
        'Индикатор заполненности: обязательные поля весят 50%, остальные поровну; тариф виден всем и не редактируется.',
        'Компания и продукты участника (F12, H10) и ссылка «Как вас видят» (L6).'
      ],
      rules: [
        'Обязательные: имя, компания, сайт, отрасль, оборот, бизнес-сообщества (можно «Не состою»), цель, запрос или «просто знакомиться».',
        'Оборот — диапазон; по умолчанию «Только вы» и используется только подбором; участник может открыть его всем.',
        'Тариф показывается всем (D-07) и пользователем не редактируется.',
        'Видимость не отключает поле от подбора (D-46).'
      ],
      depends: ['D-45', 'D-47', 'D-37', 'D-46']
    },
    html() {
      const ME = F.ME, fill = PS.fill(), pend = PS.pending(), co = F.company('co00'), prods = F.productsOf('co00');
      const miss = PS.fields().filter(f => !PS.display(f.id));
      const frow = f => {
        const dv = PS.display(f.id), go = L7GO[f.id];
        const attrs = go ? 'data-go="' + go + '"' : 'data-act="l7-edit" data-arg="' + f.id + '"';
        const unset = tickPending(f.id) ? 'из билета: подтвердите в разделе «Семья и команда»' : (f.required ? 'обязательное поле, не заполнено' : 'не заполнено');
        return '<div class="cab-frow"><button class="cab-fmain" ' + attrs + '><span class="cab-flabel">' + esc(f.label) + '</span>' +
          '<span class="cab-fv' + (dv ? '' : ' unset' + (f.required ? ' req' : '')) + '">' + (dv ? esc(dv) : unset) + '</span></button>' + visPill(f.id) + '</div>';
      };
      const req = PS.fields().filter(f => f.required), opt = PS.fields().filter(f => !f.required);
      return '<div class="scr">' +
        D.head({ back: 'L0', eyebrow: 'Кабинет', title: 'Профиль', sub: esc(ME.name) + ' · ' + esc(ME.company), paren: paren('видимость решаете вы, поле за полем') }) +
        '<div class="cab-body">' +
        '<div class="card cab-pfill"><div class="cab-me-top">' + avatar(ME.name, 'l accent') +
        '<div class="grow cab-me-txt"><span class="r-title">Профиль заполнен на <b class="cab-pct">' + fill.pct + '%</b></span>' +
        '<div class="progress" aria-hidden="true"><i style="width:' + fill.pct + '%"></i></div>' +
        '<span class="cap">обязательных ' + fill.req + ' из ' + fill.reqTotal + ', остальных ' + fill.opt + ' из ' + fill.optTotal + '</span></div></div>' +
        (miss.length ? '<div class="cab-note">Не заполнено: ' + esc(miss.map(f => f.label.toLowerCase()).join(', ')) + '.</div>' : '<div class="cab-note">Все поля заполнены.</div>') +
        (pend ? '<button class="cab-link" data-go="L5">Подтвердить данные из билета' + icon('chevR') + '</button>' : '') + '</div>' +
        '<button class="btn btn-secondary btn-block" data-act="l7-preview">' + icon('eye') + 'Как вас видят другие</button>' +
        '<div class="card cab-tariff"><div class="grow"><div class="r-title">Тариф</div><div class="r-sub">виден всем, не редактируется</div></div>' + tariffTag(ME.tariff) + '</div>' +
        sec('Обязательные поля') +
        '<div class="card cab-flist">' + req.map(frow).join('') + '</div>' +
        sec('Необязательные поля') +
        '<div class="card cab-flist">' + opt.map(frow).join('') + '</div>' +
        sec('Компания и продукты') +
        '<div class="card cab-list"><div class="list">' +
        '<button class="row clickable cab-row" data-go="F12/co00"><span class="cab-ic">' + icon('building') + '</span><div class="grow"><div class="r-title">' + esc(co.name) + '</div><div class="r-sub cab-sub1">' + esc(co.industry) + ' · ' + esc(co.site) + '</div></div>' + icon('chevR') + '</button>' +
        prods.map(p => '<button class="row clickable cab-row" data-go="H10/' + p.id + '"><span class="cab-ic">' + icon('layers') + '</span><div class="grow"><div class="r-title">' + esc(p.name) + '</div><div class="r-sub cab-sub1">' + esc(p.kind) + ' · ' + esc(p.short) + '</div></div>' + icon('chevR') + '</button>').join('') +
        '<button class="row clickable cab-row" data-go="F7"><span class="cab-ic">' + icon('qr') + '</span><div class="grow"><div class="r-title">Моя визитка</div><div class="r-sub cab-sub1">QR для обмена контактами</div></div>' + icon('chevR') + '</button>' +
        '</div></div>' +
        '<div class="cab-end"></div></div></div>';
    }
  });

  /* лист правки поля: значение и уровень видимости сохраняются вместе */
  D.action('l7-comm', el => {
    const none = el.dataset.v === 'Не состою', box = el.parentElement;
    if (none) box.querySelectorAll('.chip').forEach(c => { c.classList.remove('on'); c.setAttribute('aria-pressed', 'false'); });
    else { const n = box.querySelector('[data-v="Не состою"]'); if (n) { n.classList.remove('on'); n.setAttribute('aria-pressed', 'false'); } }
    const on = none ? true : !el.classList.contains('on');
    el.classList.toggle('on', on);
    el.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  function editor(f) {
    const v = PS.val[f.id];
    const text = (ph, extra) => '<input class="input" data-f="v" value="' + esc(v || '') + '" placeholder="' + esc(ph || '') + '"' + (extra || '') + '>';
    switch (f.id) {
      case 'industry': return '<select class="input" data-f="v">' + F.TAXO.INDUSTRIES.map(x => '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select>';
      case 'revenue': return '<select class="input" data-f="v">' + F.TAXO.REVENUE.map(x => '<option' + (x === v ? ' selected' : '') + '>' + esc(x) + '</option>').join('') + '</select>';
      case 'communities': return '<div class="cab-chips">' + F.TAXO.COMMUNITIES.map(x => '<button class="chip' + (v.includes(x) ? ' on' : '') + '" data-act="l7-comm" data-v="' + esc(x) + '" aria-pressed="' + v.includes(x) + '">' + esc(x) + '</button>').join('') + '</div>';
      case 'usefulness': return '<textarea class="textarea" data-f="v" rows="3" placeholder="Чем вы можете быть полезны другим участникам">' + esc(v || '') + '</textarea>';
      case 'site': return text('example-company.ru');
      case 'instagram': return text('@ваш_профиль');
      case 'telegram': return text('@username');
      case 'hobby': return text('Например, путешествия, настольные игры');
      case 'sport': return text('Например, горные лыжи, бег');
      default: return text('');
    }
  }
  D.action('l7-edit', el => {
    const id = el.dataset.arg, f = fld(id);
    sheet(esc(f.label),
      '<div class="cab-note">' + esc(F.PROFILE_HELP[id] || '') + '</div>' +
      '<div class="field cab-gap">' + editor(f) + '<div class="err-msg" data-err></div></div>' +
      '<div class="cap cab-gap">Кто видит это поле</div>' + visOptions(PS.vis(id), true) +
      '<button class="btn btn-primary btn-block" data-act="l7-save" data-arg="' + id + '">Сохранить</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>');
  });
  D.action('l7-save', el => {
    const id = el.dataset.arg, f = fld(id);
    let v;
    if (id === 'communities') {
      v = chipsOn('[data-act="l7-comm"]');
      if (!v.length) return sheetErr('Выберите вариант или «Не состою»');
    } else {
      v = val('[data-f="v"]').trim();
      if (!v && f.required) return sheetErr('Обязательное поле', '[data-f="v"]');
      if (id === 'instagram' && v) {
        /* ссылка на профиль (instagram.com/имя) приводится к @имя */
        const m = /^(?:https?:\/\/)?(?:www\.)?instagram\.com\/([\w.]{3,})\/?$/i.exec(v);
        if (m) v = '@' + m[1];
      }
      if ((id === 'telegram' || id === 'instagram') && v && !/^@[\w.]{3,}$/.test(v)) return sheetErr('Укажите @имя или ссылку на профиль: латиница, цифры, точка и подчёркивание, от трёх знаков', '[data-f="v"]');
      if (id === 'site' && !/^(https?:\/\/)?([a-zа-яё0-9-]+\.)+[a-zа-яё]{2,}(\/\S*)?$/i.test(v)) return sheetErr('Нужен адрес вида example-company.ru', '[data-f="v"]');
    }
    PS.set(id, v);
    const on = document.querySelector('.sheet .cab-opt.on');
    if (on) PS.setVis(id, on.dataset.v);
    rr('Сохранено: ' + f.label);
  });

  /* ---------- L8 Цели и запросы ---------- */
  const MAXGOALS = 5;
  const goalOf = c => PS.goals.find(g => g.code === c);
  /* цели и главная цель записываются и в FIX.ME, чтобы другие разделы видели правки */
  const syncGoals = () => PS.syncMe();
  D.action('l8-hist', () => { const s = D.st('L8'); s.histAll = !s.histAll; rr(); });
  D.action('l8-main', el => {
    const c = el.dataset.arg, old = PS.main;
    if (c === old) return;
    PS.main = c;
    syncGoals();
    PS.log('Главная цель', PS.goalTitle(old), PS.goalTitle(c));
    rr('Главная цель: ' + PS.goalTitle(c));
  });
  D.register('L8', {
    tab: '-',
    meta: {
      title: 'L8 · Цели и запросы',
      role: 'Гость, кабинет',
      fr: ['FR-PROF-11', 'FR-ONB-04', 'FR-ONB-05', 'FR-PATH-05'],
      ac: ['AC-PROF-11', 'AC-ONB-04', 'AC-ONB-05'],
      what: [
        'До пяти целей по восьми доменам G1–G8, ровно одна главная; шестой домен предлагает снять одну из целей.',
        'Запрос на 30–90 дней: девять шаблонов по задачам каталога или свой текст, горизонт 30, 60 или 90 дней.',
        'Кнопка «Просто знакомиться» вместо запроса: поднимает вес окружения и досуга, снимает вес рычагов программы.',
        'Поле «Чем могу быть полезен» и история изменений со временем, прежним и новым значением.'
      ],
      rules: [
        'Цель — домен из таксономии (G1–G8); главная цель одна; целей не больше пяти, минимум одна.',
        'Любое изменение записывается в историю; «Мой путь» пересобирается кнопкой «Пересобрать» (D-49), подбор читает новые значения.',
        'Обязательно одно из двух: запрос или отметка «просто знакомиться».',
        'Каждое изменение сохраняется нажатием кнопки в листе.'
      ],
      depends: ['D-45', 'D-57', 'D-46']
    },
    html(ctx) {
      const st = ctx.state, n = PS.goals.length;
      const hist = st.histAll ? PS.history : PS.history.slice(0, 3);
      const goalCard = g => {
        const d = PS.domain(g.code), main = g.code === PS.main;
        return '<div class="cab-goal' + (main ? ' main' : '') + '"><div class="cab-goal-h"><span class="cab-ic">' + icon(main ? 'star' : 'layers') + '</span>' +
          '<div class="grow"><div class="r-title">' + esc(d.title) + '</div>' + (main ? '<div class="cab-mem-tag">' + tag('главная', 'fill') + '</div>' : '') + '</div></div>' +
          '<div class="cab-goal-t' + (g.note ? '' : ' unset') + '">' + (g.note ? esc(g.note) : 'Формулировка не задана') + '</div>' +
          '<div class="cab-goal-d cab-sub2">Влияет на подбор: ' + esc(d.desc) + '</div>' +
          '<div class="cab-mem-act">' + (main ? '' : '<button class="btn btn-secondary btn-sm" data-act="l8-main" data-arg="' + g.code + '">Сделать главной</button>') +
          '<button class="btn btn-secondary btn-sm" data-act="l8-goal-edit" data-arg="' + g.code + '">Править</button></div></div>';
      };
      const reqCard = PS.justMeet
        ? '<div class="card"><div class="cab-req-h">' + tag('просто знакомиться', 'fill') + '<span class="cap">запрос не обязателен</span></div>' +
          '<div class="cab-note">В подборе растёт вес «Окружение: партнёры, клиенты, связи» и досуга (развлечения, спорт, семья), вес рычагов программы снимается.</div>' +
          '<div class="cab-mem-act"><button class="btn btn-primary btn-sm" data-act="l8-req">Задать запрос</button></div></div>'
        : '<div class="card"><div class="cab-req-h">' + (PS.requestTask ? tag(PS.requestTask, 'accent') : tag('свой текст')) + '<span class="cap">на ' + PS.horizon + ' ' + D.plural(PS.horizon, ['день', 'дня', 'дней']) + '</span></div>' +
          '<div class="cab-req-t">' + esc(PS.request) + '</div>' +
          '<div class="cab-mem-act"><button class="btn btn-primary btn-sm" data-act="l8-req">Изменить запрос</button>' +
          '<button class="btn btn-secondary btn-sm" data-act="l8-meet">Просто знакомиться</button></div></div>';
      return '<div class="scr">' +
        D.head({ back: 'L0', eyebrow: 'Кабинет', title: 'Цели и запросы', sub: 'до пяти целей и запрос на 30–90 дней', paren: paren('путь пересобирается кнопкой') }) +
        '<div class="cab-body">' +
        sec('Цели · ' + n + ' из ' + MAXGOALS) +
        PS.goals.map(goalCard).join('') +
        '<button class="btn btn-secondary btn-block" data-act="l8-goal-add">' + icon(n >= MAXGOALS ? 'refresh' : 'plus') + (n >= MAXGOALS ? 'Заменить цель' : 'Добавить цель') + '</button>' +
        sec('Запрос на 30–90 дней') + reqCard +
        sec('Чем могу быть полезен') +
        '<div class="card"><div class="cab-req-t' + (PS.val.usefulness ? '' : ' unset') + '">' + esc(PS.val.usefulness || 'Не заполнено') + '</div>' +
        '<div class="cab-mem-act"><button class="btn btn-secondary btn-sm" data-act="l8-use">Править</button></div></div>' +
        sec('История изменений', PS.history.length > 3 ? '<button class="more" data-act="l8-hist">' + (st.histAll ? 'Свернуть' : 'Показать всё') + '</button>' : '') +
        '<div class="card cab-list"><div class="list">' + hist.map(h =>
          '<div class="cab-hi"><div class="cab-hi-h"><span class="r-title">' + esc(h.what) + '</span><span class="cap">' + esc(h.time) + '</span></div>' +
          '<div class="cab-hi-c"><span class="k">было</span><span>' + esc(h.from) + '</span></div><div class="cab-hi-c"><span class="k">стало</span><span>' + esc(h.to) + '</span></div></div>').join('') + '</div></div>' +
        '<div class="card cab-list"><div class="list">' +
        '<button class="row clickable cab-row" data-go="N8"><span class="cab-ic">' + icon('info') + '</span><div class="grow"><div class="r-title">Почему это в вашем пути</div><div class="r-sub cab-sub1">что учтено и что не передаётся</div></div>' + icon('chevR') + '</button>' +
        '<button class="row clickable cab-row" data-go="A12"><span class="cab-ic">' + icon('spark') + '</span><div class="grow"><div class="r-title">Усилить путь</div><div class="r-sub cab-sub1">ещё шаги профиля</div></div>' + icon('chevR') + '</button>' +
        '</div></div>' +
        '<div class="cab-end"></div></div></div>';
    }
  });

  /* цель: добавить или заменить */
  const domOpts = (list, exclude) => '<div class="cab-opts compact scroll">' + list.filter(d => !exclude.includes(d.code)).map(d =>
    '<button class="cab-opt" role="radio" aria-checked="false" data-act="l-vis-pick" data-v="' + d.code + '"><span class="cab-ic">' + icon('layers') + '</span>' +
    '<span class="grow"><span class="cab-opt-t">' + esc(d.title) + '</span><span class="cab-opt-d">' + esc(d.desc) + '</span></span><span class="cab-opt-ck">' + icon('check') + '</span></button>').join('') + '</div>';
  D.action('l8-goal-add', () => {
    const taken = PS.goals.map(g => g.code), full = taken.length >= MAXGOALS;
    sheet(full ? 'Заменить цель' : 'Добавить цель',
      (full ? '<div class="banner warn">' + icon('alert') + '<div class="cap">Целей не больше пяти. Выберите, какую снять, и новый домен.</div></div>' +
        '<div class="cap cab-gap">Снять цель</div><div class="cab-chips" id="l8-drop">' + taken.map(c => '<button class="chip" data-act="cab-chip" data-single="1" data-v="' + c + '" aria-pressed="false">' + esc(PS.goalTitle(c)) + '</button>').join('') + '</div>' : '') +
      '<div class="cap cab-gap">Новая цель</div>' + domOpts(F.TAXO.DOMAINS, taken) +
      '<div class="field cab-gap"><label>Формулировка (необязательно)</label><input class="input" data-f="note" placeholder="Например: склад в новом регионе"></div><div class="err-msg" data-err></div>' +
      '<button class="btn btn-primary btn-block" data-act="l8-goal-add-yes">' + (full ? 'Заменить цель' : 'Добавить цель') + '</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>');
  });
  D.action('l8-goal-add-yes', () => {
    const pick = document.querySelector('.sheet .cab-opts .cab-opt.on'), full = PS.goals.length >= MAXGOALS;
    if (!pick) return sheetErr('Выберите домен новой цели');
    let drop = null;
    if (full) {
      const d = document.querySelector('.sheet #l8-drop .chip.on');
      if (!d) return sheetErr('Выберите, какую цель снять');
      drop = d.dataset.v;
    }
    const before = PS.goalsLine(), wasMain = !!drop && PS.main === drop;
    if (drop) PS.goals = PS.goals.filter(g => g.code !== drop);
    PS.goals.push({ code: pick.dataset.v, note: val('[data-f="note"]').trim() });
    if (wasMain) PS.main = pick.dataset.v;
    syncGoals();
    PS.log('Цели', before, PS.goalsLine());
    rr('Цель сохранена. Путь обновится при пересборке', 2800);
  });
  D.action('l8-goal-edit', el => {
    const c = el.dataset.arg, g = goalOf(c);
    if (!g) return;
    const only = PS.goals.length < 2;
    sheet(esc(PS.goalTitle(c)),
      '<div class="cab-note">' + esc(PS.domain(c).desc) + '</div>' +
      '<div class="field cab-gap"><label>Формулировка</label><input class="input" data-f="note" value="' + esc(g.note) + '" placeholder="Что именно вы хотите"></div>' +
      '<button class="btn btn-primary btn-block" data-act="l8-goal-save" data-arg="' + c + '">Сохранить</button>' +
      (only ? '<div class="cap cab-gap">Должна остаться хотя бы одна цель.</div>' : '<button class="btn btn-ghost btn-block btn-danger-text" data-act="l8-goal-drop" data-arg="' + c + '">Снять цель</button>') +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>');
  });
  D.action('l8-goal-save', el => {
    const g = goalOf(el.dataset.arg), note = val('[data-f="note"]').trim();
    if (g.note !== note) PS.log('Цель «' + PS.goalTitle(g.code) + '»', g.note || '—', note || '—');
    g.note = note;
    rr('Цель сохранена');
  });
  D.action('l8-goal-drop', el => {
    const c = el.dataset.arg, before = PS.goalsLine();
    PS.goals = PS.goals.filter(g => g.code !== c);
    if (PS.main === c) PS.main = PS.goals[0].code;
    syncGoals();
    PS.log('Цели', before, PS.goalsLine());
    rr('Цель снята. Путь обновится при пересборке', 2800);
  });

  /* запрос на 30–90 дней */
  D.action('l8-meet', () => {
    PS.log('Запрос на 30–90 дней', PS.requestLine(), 'Просто знакомиться');
    PS.justMeet = true;
    F.ME.justMeet = true;
    rr('Отмечено «Просто знакомиться»');
  });
  D.action('l8-mode', el => {
    const meet = el.dataset.v === 'meet', sh = document.querySelector('.sheet');
    el.parentElement.querySelectorAll('.chip').forEach(c => { c.classList.remove('on'); c.setAttribute('aria-pressed', 'false'); });
    el.classList.add('on');
    el.setAttribute('aria-pressed', 'true');
    const b = sh && sh.querySelector('[data-block="req"]');
    if (b) b.hidden = meet;
  });
  D.action('l8-req', () => {
    const T = F.TAXO.REQUEST_TEMPLATES, cur = T.find(t => t.text === PS.request);
    const hz = [30, 60, 90];
    D.openSheet('<div class="sheet-title">Запрос на 30–90 дней</div>' +
      '<div class="cab-chips"><button class="chip' + (PS.justMeet ? '' : ' on') + '" data-act="l8-mode" data-v="req" aria-pressed="' + !PS.justMeet + '">Есть запрос</button>' +
      '<button class="chip' + (PS.justMeet ? ' on' : '') + '" data-act="l8-mode" data-v="meet" aria-pressed="' + PS.justMeet + '">Просто знакомиться</button></div>' +
      '<div data-block="req"' + (PS.justMeet ? ' hidden' : '') + '>' +
      '<div class="field cab-gap"><label>Шаблон по задаче каталога</label><select class="input" data-f="tpl"><option value="">Свой текст</option>' +
      T.map(t => '<option value="' + t.id + '"' + (cur && cur.id === t.id ? ' selected' : '') + '>' + esc(t.task) + '</option>').join('') + '</select></div>' +
      '<div class="field cab-gap"><label>Что решить за 30–90 дней</label><textarea class="textarea" data-f="req" rows="4" placeholder="Например: нужен подрядчик на автоматизацию склада">' + esc(PS.request || '') + '</textarea></div>' +
      '<div class="field cab-gap"><label>Горизонт</label><div class="cab-chips">' + hz.map(h => '<button class="chip' + (h === PS.horizon ? ' on' : '') + '" data-act="cab-chip" data-single="1" data-v="' + h + '" data-k="hz" aria-pressed="' + (h === PS.horizon) + '">' + h + ' ' + D.plural(h, ['день', 'дня', 'дней']) + '</button>').join('') + '</div></div></div>' +
      '<div class="err-msg" data-err></div>' +
      '<button class="btn btn-primary btn-block" data-act="l8-req-save">Сохранить запрос</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>',
      { mount: w => {
        const sel = w.querySelector('[data-f="tpl"]'), ta = w.querySelector('[data-f="req"]');
        sel.addEventListener('change', () => { const t = T.find(x => x.id === sel.value); if (t) ta.value = t.text; });
      } });
    pinFoot(document.querySelector('.sheet'));
  });
  D.action('l8-req-save', () => {
    const meet = document.querySelector('.sheet [data-act="l8-mode"][data-v="meet"]').classList.contains('on');
    const old = PS.requestLine(), oldH = PS.horizon;
    if (meet) {
      PS.justMeet = true;
      F.ME.justMeet = true;
      PS.log('Запрос на 30–90 дней', old, 'Просто знакомиться');
    } else {
      const text = val('[data-f="req"]').trim();
      if (text.length < 10) return sheetErr('Опишите запрос: хотя бы одно предложение', '[data-f="req"]');
      const T = F.TAXO.REQUEST_TEMPLATES, tpl = T.find(t => t.id === val('[data-f="tpl"]'));
      const hz = +(chipsOn('[data-k="hz"]')[0] || PS.horizon);
      PS.justMeet = false;
      PS.request = text;
      PS.requestTask = tpl && tpl.text === text ? tpl.task : '';
      F.ME.request = text; F.ME.requestTask = PS.requestTask; F.ME.justMeet = false;
      PS.horizon = hz;
      if (old !== text) PS.log('Запрос на 30–90 дней', old, text);
      if (hz !== oldH) PS.log('Горизонт запроса', oldH + ' дней', hz + ' дней');
    }
    rr('Запрос сохранён. Путь обновится при пересборке', 2800);
  });
  D.action('l8-use', () => sheet('Чем могу быть полезен',
    '<div class="field"><textarea class="textarea" data-f="use" rows="4" placeholder="Чем вы можете быть полезны другим участникам">' + esc(PS.val.usefulness || '') + '</textarea></div><div class="err-msg" data-err></div>' +
    '<button class="btn btn-primary btn-block" data-act="l8-use-save">Сохранить</button>' +
    '<button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>'));
  D.action('l8-use-save', () => {
    const t = val('[data-f="use"]').trim();
    if (t !== (PS.val.usefulness || '')) PS.log('Чем могу быть полезен', PS.val.usefulness || '—', t || '—');
    PS.set('usefulness', t);
    rr('Сохранено');
  });

  /* ---------- L9 Как пользоваться ---------- */
  const mmss = sec => Math.floor(sec / 60) + ':' + (sec % 60 < 10 ? '0' : '') + (sec % 60);
  D.action('l9-play', el => { const s = D.st('L9'); s.play = s.play === el.dataset.arg ? null : el.dataset.arg; s.paused = false; rr(); });
  D.action('l9-pause', () => { const s = D.st('L9'); s.paused = !s.paused; rr(); });
  D.action('l9-ch', el => { const s = D.st('L9'), [v, i] = el.dataset.arg.split(':'); s.pos = s.pos || {}; s.pos[v] = +i; s.play = v; s.paused = false; rr(); });
  D.action('l9-seen', el => { const v = el.dataset.arg; PS.videos[v] = !PS.videos[v]; rr(PS.videos[v] ? 'Отмечено: просмотрено' : 'Отметка снята'); });
  D.action('l9-step', el => {
    const s = D.st('L9'), d = el.dataset.arg, n = F.TOUR.length;
    s.step = Math.max(0, Math.min(n - 1, (s.step || 0) + (d === 'next' ? 1 : -1)));
    rr();
  });
  D.action('l9-done', () => { D.st('L9').tourDone = true; rr('Тур пройден'); });
  D.register('L9', {
    tab: '-',
    meta: {
      title: 'L9 · Как пользоваться',
      role: 'Гость, помощь',
      fr: ['FR-ONB-10', 'FR-ONB-03'],
      ac: ['AC-ONB-10', 'AC-ONB-03'],
      what: [
        'Три ролика: о фестивале (5 минут), о программе (5 минут), о приложении (2 минуты) — карточки-макеты с главами и макетом плеера.',
        'Тур по приложению: семь шагов с переходом в раздел.',
        'Метка «просмотрено» по каждому ролику.'
      ],
      rules: [
        'Ролики снимают Борис и Александр по готовому демо (скринкаст); в демо видео нет, плеер — макет.',
        'Экран открывается из меню (группа «Начало», пункт «Как пользоваться») и из Кабинета; ролик о приложении есть и на экране «Как работает приложение».',
        'Внешних запросов нет: ролики и тур работают без сети.'
      ],
      depends: ['D-56', 'D-45']
    },
    html(ctx) {
      const st = ctx.state, seen = F.VIDEOS.filter(v => PS.videos[v.id]).length;
      st.pos = st.pos || {};
      const n = F.TOUR.length, step = st.step || 0, t = F.TOUR[step];
      const vid = v => {
        const playing = st.play === v.id, pos = st.pos[v.id] || 0, k = v.chapters.length;
        const total = v.min * 60, cur = Math.round(total * pos / k);
        return '<div class="card cab-vid">' +
          (playing
            ? '<div class="cab-player"><div class="cab-screen"><span class="cab-mock">макет плеера</span><span class="cab-bigplay">' + icon(st.paused ? 'play' : 'pause') + '</span></div>' +
              '<div class="cab-ctl"><button class="icon-btn" data-act="l9-pause" aria-label="' + (st.paused ? 'Продолжить' : 'Пауза') + '">' + icon(st.paused ? 'play' : 'pause') + '</button>' +
              '<div class="progress grow"><i style="width:' + Math.round(100 * pos / k) + '%"></i></div><span class="cap cab-time">' + mmss(cur) + ' / ' + mmss(total) + '</span></div></div>'
            : '<button class="cab-poster" data-act="l9-play" data-arg="' + v.id + '" aria-label="Смотреть ролик «' + esc(v.title) + '»"><span class="cab-bigplay">' + icon('play') + '</span><span class="cab-dur">' + v.min + ' мин</span><span class="cab-mock">макет</span></button>') +
          '<div class="cab-vid-h"><div class="grow"><div class="r-title">' + esc(v.title) + '</div><div class="r-sub">' + esc(v.desc) + '</div></div>' + (PS.videos[v.id] ? tag('просмотрено', 'ok') : '') + '</div>' +
          '<div class="cab-chap">' + v.chapters.map((c, i) => '<button class="cab-ch' + (playing && i === pos ? ' on' : '') + '" data-act="l9-ch" data-arg="' + v.id + ':' + i + '"><span class="cab-ch-n">' + (i + 1) + '</span><span class="grow">' + esc(c) + '</span></button>').join('') + '</div>' +
          '<div class="cab-mem-act">' + (playing ? '<button class="btn btn-secondary btn-sm" data-act="l9-play" data-arg="' + v.id + '">' + icon('x') + 'Закрыть плеер</button>' : '') +
          '<button class="btn btn-ghost btn-sm" data-act="l9-seen" data-arg="' + v.id + '">' + (PS.videos[v.id] ? 'Снять отметку «просмотрено»' : 'Отметить просмотренным') + '</button></div>' +
          '<div class="cap">Авторы: ' + esc(v.author) + '</div></div>';
      };
      return '<div class="scr">' +
        D.head({ backHist: true, eyebrow: 'Помощь', title: 'Как пользоваться', sub: 'тур по приложению и три ролика', paren: paren('просмотрено ' + seen + ' из ' + F.VIDEOS.length) }) +
        '<div class="cab-body">' +
        sec('Тур по приложению') +
        '<div class="card cab-tour"><div class="cab-tour-h"><span class="cab-ic big">' + icon(t.ic) + '</span><div class="grow"><div class="cab-tour-n">Шаг ' + (step + 1) + ' из ' + n + '</div><div class="cab-tour-t">' + esc(t.title) + '</div></div></div>' +
        '<div class="cab-tour-x">' + esc(t.text) + '</div>' +
        '<button class="btn btn-secondary btn-block" data-go="' + t.go + '">Открыть: ' + esc(t.title) + '</button>' +
        '<div class="cab-dots" aria-hidden="true">' + F.TOUR.map((x, i) => '<i class="' + (i === step ? 'on' : '') + '"></i>').join('') + '</div>' +
        '<div class="cab-mem-act"><button class="btn btn-secondary btn-sm"' + (step === 0 ? ' disabled' : '') + ' data-act="l9-step" data-arg="prev">' + icon('chevL') + 'Назад</button>' +
        (step === n - 1 ? '<button class="btn btn-primary btn-sm" data-act="l9-done">' + icon('check') + (st.tourDone ? 'Тур пройден' : 'Завершить тур') + '</button>'
          : '<button class="btn btn-primary btn-sm" data-act="l9-step" data-arg="next">Далее' + icon('chevR') + '</button>') + '</div></div>' +
        sec('Ролики') + F.VIDEOS.map(vid).join('') +
        '<div class="cab-end"></div></div></div>';
    }
  });

  /* ---------- L10 Кодекс участника ---------- */
  D.register('L10', {
    tab: '-',
    meta: {
      title: 'L10 · Кодекс участника',
      role: 'Гость, помощь',
      fr: ['FR-FEED-05', 'FR-FEED-06', 'FR-CHAT-02', 'FR-CHAT-03', 'FR-CHAT-05', 'FR-CHAT-06'],
      ac: ['AC-FEED-05', 'AC-FEED-06', 'AC-CHAT-05'],
      what: [
        'Пять разделов правил: поведение на площадке, знакомства и заявки, интро и запросы в ленте, чаты встреч, реклама.',
        'Правила совпадают с решениями о ленте и чатах: рекламные посты участников запрещены, записи проверяет модератор.',
        'Ссылки на вопросы и ответы и на ленту.'
      ],
      rules: [
        'Рекламные посты участников запрещены: о бизнесе рассказывают через интро в 3–5 предложениях (D-35).',
        'Экспоненты и партнёры публикуют материалы только в рамках пакета и с пометкой; сделки заключаются участниками самостоятельно.',
        'Редакция кодекса на согласовании (тексты клубных правил передают Михаил и Олеся).'
      ],
      depends: ['D-33', 'D-35', 'D-47', 'D-49']
    },
    html() {
      const cx = F.CODEX;
      return '<div class="scr">' +
        D.head({ backHist: true, eyebrow: 'Помощь', title: 'Кодекс участника', sub: 'как вести себя на площадке, в ленте и в чатах', paren: paren('правила для знакомств и чатов') }) +
        '<div class="cab-body">' +
        '<div class="cab-chips">' + tag(cx.version, 'accent') + tag('5 разделов') + '</div>' +
        cx.sections.map((s, i) => '<div class="card cab-cx"><div class="cab-cx-h"><span class="cab-ic">' + icon(s.ic) + '</span><div class="cab-cx-t">' + (i + 1) + '. ' + esc(s.title) + '</div></div>' +
          '<ol class="cab-rules">' + s.rules.map(r => '<li>' + esc(r) + '</li>').join('') + '</ol></div>').join('') +
        '<div class="card cab-list"><div class="list">' +
        '<button class="row clickable cab-row" data-go="L11"><span class="cab-ic">' + icon('help') + '</span><div class="grow"><div class="r-title">Вопросы и ответы</div><div class="r-sub cab-sub1">ответы о билете, записи и данных</div></div>' + icon('chevR') + '</button>' +
        '<button class="row clickable cab-row" data-go="R1"><span class="cab-ic">' + icon('feed') + '</span><div class="grow"><div class="r-title">Лента</div><div class="r-sub cab-sub1">кнопка «Пожаловаться» есть в записи и в чате</div></div>' + icon('chevR') + '</button>' +
        '</div></div>' +
        '<div class="cab-end"></div></div></div>';
    }
  });

  /* ---------- L11 Вопросы и ответы ---------- */
  D.action('l11-cat', el => { D.st('L11').cat = el.dataset.arg; rr(); });
  D.action('l11-open', el => {
    const s = D.st('L11'), id = el.dataset.arg, was = s.open === id;
    s.open = was ? null : id;
    document.querySelectorAll('.cab-qa').forEach(q => {
      const on = q.dataset.id === s.open;
      q.classList.toggle('open', on);
      q.querySelector('.cab-q').setAttribute('aria-expanded', on ? 'true' : 'false');
    });
  });
  D.action('l11-ask', () => sheet('Вопрос организаторам',
    '<div class="cap">Ответ придёт в уведомлениях. Вопрос увидят организаторы фестиваля.</div>' +
    '<div class="field cab-gap"><textarea class="textarea" data-f="q" rows="4" placeholder="Что вы хотите узнать"></textarea></div><div class="err-msg" data-err></div>' +
    '<button class="btn btn-primary btn-block" data-act="l11-ask-yes">Отправить вопрос</button>' +
    '<button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>'));
  D.action('l11-ask-yes', () => {
    const q = val('[data-f="q"]').trim();
    if (q.length < 5) return sheetErr('Напишите вопрос', '[data-f="q"]');
    const s = D.st('L11');
    s.asked = q;
    rr('Вопрос отправлен организаторам');
  });
  D.register('L11', {
    tab: '-',
    meta: {
      title: 'L11 · Вопросы и ответы',
      role: 'Гость, помощь',
      fr: ['FR-AI-03', 'FR-AUTH-01', 'FR-AUTH-06'],
      ac: ['AC-AI-08'],
      what: [
        'Аккордеон из двенадцати вопросов: билет и вход, программа и записи, встречи, ИИ и подбор, чаты и лента, данные.',
        'Поиск по вопросам и ответам и фильтр по разделу; пустой результат с предложением спросить организатора.',
        'Вопрос организаторам отправляется кнопкой в листе.'
      ],
      rules: [
        'Ответы берутся из базы знаний с источником; вне базы — «передаю организатору» (FR-AI-03).',
        'В базе нет материалов внутренних баз организаторов.',
        'Отказаться от автоматизированного подбора нельзя; ИИ предлагает, действие совершает кнопка.'
      ],
      depends: ['D-46', 'D-49']
    },
    html(ctx) {
      const st = ctx.state, cats = [...new Set(F.FAQ.map(q => q.cat))];
      st.cat = st.cat || 'all';
      const shown = F.FAQ.filter(q => st.cat === 'all' || q.cat === st.cat);
      return '<div class="scr">' +
        D.head({ backHist: true, eyebrow: 'Помощь', title: 'Вопросы и ответы', sub: F.FAQ.length + ' ' + D.plural(F.FAQ.length, ['вопрос', 'вопроса', 'вопросов']) + ' о билете, записи, встречах и данных', paren: paren('ИИ только предлагает, решаете вы') }) +
        '<div class="cab-body">' +
        '<div class="cab-search">' + icon('search') + '<input class="input" data-q placeholder="Поиск по вопросам" value="' + esc(st.q || '') + '" aria-label="Поиск по вопросам"></div></div>' +
        '<div class="chip-rail cab-rail"><button class="chip' + (st.cat === 'all' ? ' on' : '') + '" data-act="l11-cat" data-arg="all">Все</button>' +
          cats.map(c => '<button class="chip' + (st.cat === c ? ' on' : '') + '" data-act="l11-cat" data-arg="' + esc(c) + '">' + esc(c) + '</button>').join('') + '</div>' +
        '<div class="cab-body cab-qa-list">' +
        shown.map(q => '<div class="cab-qa' + (st.open === q.id ? ' open' : '') + '" data-id="' + q.id + '" data-text="' + esc((q.q + ' ' + q.a).toLowerCase()) + '">' +
          '<button class="cab-q" data-act="l11-open" data-arg="' + q.id + '" aria-expanded="' + (st.open === q.id) + '"><span class="cab-q-t">' + esc(q.q) + '</span>' + icon('chevD') + '</button>' +
          '<div class="cab-a"><div class="cab-a-c">' + esc(q.a) + '</div><div class="cab-a-m">' + tag(q.cat) + '</div></div></div>').join('') +
        '<div class="cab-empty cab-noq" hidden>Ничего не найдено. Попробуйте другое слово или задайте вопрос организаторам.</div>' +
        '<div class="card"><div class="r-title">Не нашли ответ?</div><div class="cab-note cab-pad">' + (st.asked ? 'Ваш вопрос отправлен: «' + esc(st.asked.slice(0, 80)) + '». Ответ придёт в уведомлениях.' : 'Задайте вопрос организаторам, ответ придёт в уведомлениях.') + '</div>' +
        '<button class="btn btn-secondary btn-block" data-act="l11-ask">' + icon('msg') + 'Задать вопрос организаторам</button></div>' +
        '<div class="card cab-list"><div class="list">' +
        '<button class="row clickable cab-row" data-go="L10"><span class="cab-ic">' + icon('info') + '</span><div class="grow"><div class="r-title">Кодекс участника</div><div class="r-sub cab-sub1">правила знакомств, ленты и чатов</div></div>' + icon('chevR') + '</button>' +
        '<button class="row clickable cab-row" data-go="L6"><span class="cab-ic">' + icon('lock') + '</span><div class="grow"><div class="r-title">Приватность</div><div class="r-sub cab-sub1">видимость, согласия, данные</div></div>' + icon('chevR') + '</button>' +
        '</div></div>' +
        '<div class="cab-end"></div></div></div>';
    },
    mount(host) {
      const inp = host.querySelector('[data-q]');
      if (!inp) return;
      const apply = () => {
        const q = inp.value.trim().toLowerCase();
        D.st('L11').q = inp.value;
        let n = 0;
        host.querySelectorAll('.cab-qa').forEach(el => { const ok = !q || el.dataset.text.includes(q); el.hidden = !ok; if (ok) n++; });
        const e = host.querySelector('.cab-noq');
        if (e) e.hidden = n > 0;
      };
      inp.addEventListener('input', apply);
      apply();
    }
  });
})();
