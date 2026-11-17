/* Блок L — билет и кабинет. Фаза A: L1 «Билет». */
(function () {
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag, tariffTag, avatar } = D;

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
  function hash(s) { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }

  D.register('L1', {
    tab: 'MORE',
    meta: {
      title: 'L1 · Билет',
      role: 'Гость, документ',
      fr: ['FR-TKT-01', 'FR-TKT-02', 'FR-TKT-03', 'FR-TKT-04', 'FR-TKT-05', 'FR-TKT-06'],
      ac: ['AC-TKT-03', 'AC-TKT-05'],
      what: [
        'Бейдж-билет: участник, тариф, издание, даты, QR-узор (код-нативный, не сканируется).',
        'Режим «Показать на стойке» — переключатель состояния экрана.',
        'Ссылки на PDF-приглашение, проживание, платёжные данные, тариф, семью и приватность.'
      ],
      rules: [
        'QR-бейдж — подписанный токен с обновлением каждые 60 секунд; скриншот не принимается.',
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
        D.head({back:'B1', eyebrow:'Ваш документ', title:'Билет', sub:esc(ME.edition) + ' · ' + tariffTag(ME.tariff), actions:'<button class="icon-btn' + (standby ? ' on' : '') + '" data-act="l1-stand" aria-label="Показать на стойке" aria-pressed="' + standby + '">' + icon('scan') + '</button>'}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +

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
        tkRow('Доступ', 'до 01.03.2027') +
        '</div>' +
        '<div class="tk-perf"></div>' +
        '<div class="qr-band"><div style="flex:1"><div class="qr-mini" style="width:104px;height:104px">' + qrSVG('atlanty-' + ME.patronymic, 104) + '</div>' +
        '<div class="tk-sub" style="margin-top:8px">токен обновляется каждые 60 секунд · скриншот не принимается</div></div>' +
        '<div style="flex:1;display:flex;flex-direction:column;gap:8px">' +
        '<span class="tag" style="align-self:flex-start;white-space:normal">' + icon('check') + 'Аккредитация подтверждена</span>' +
        '<span class="tag" style="align-self:flex-start;white-space:normal">' + icon('people') + 'Спутник: не подключён</span>' +
        '</div></div></div>' +

        '<div class="card"><div class="sec-title" style="margin:0 0 4px">Детали и документы</div><div class="list">' +
        '<button class="row clickable" data-go="L2">' + icon('file') + '<div class="grow"><div class="r-title">PDF-приглашение</div><div class="r-sub">скачать или отправить</div></div>' + icon('chevR') + '</button>' +
        '<button class="row clickable" data-go="L4">' + icon('building') + '<div class="grow"><div class="r-title">Проживание</div><div class="r-sub">отель и даты из брони</div></div>' + icon('chevR') + '</button>' +
        '<button class="row clickable" data-go="L3">' + icon('card') + '<div class="grow"><div class="r-title">Платёжные данные</div><div class="r-sub">только чтение, если есть в заказе</div></div>' + icon('chevR') + '</button>' +
        '<button class="row clickable" data-go="L5">' + icon('people') + '<div class="grow"><div class="r-title">Семья и команда</div><div class="r-sub">Спутник и коллеги по контакту</div></div>' + icon('chevR') + '</button>' +
        '<button class="row clickable" data-go="L6">' + icon('lock') + '<div class="grow"><div class="r-title">Приватность</div><div class="r-sub">согласия, выгрузка, удаление</div></div>' + icon('chevR') + '</button>' +
        '</div></div>' +

        '<div class="banner">' + icon('info') + '<div><div class="b-title">Оплата в приложении не проводится</div>' +
        '<div class="cap">Смена тарифа и условия — через Telegram организатору. Кнопка «Изменить тариф» в разделе оплаты.</div></div></div>' +
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
    tab: null,
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
        D.head({back:'L1', eyebrow:'Билет', title:'Приглашение', sub:'PDF-документ для печати и пересылки', paren:paren('документ формируется из вашего билета')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
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
    tab: null,
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
      const line = (l, v, strong) => '<div class="row" style="padding:8px 0"><div class="grow' + (strong ? '' : '') + '"><div class="' + (strong ? 'r-title' : 'r-sub') + '">' + esc(l) + '</div></div><div class="' + (strong ? 'r-title' : 'r-sub') + '">' + esc(v) + '</div></div>';
      return '<div class="scr">' +
        D.head({back:'L1', eyebrow:'Билет', title:'Оплата', sub:'заказ на проживание и участие', paren:paren('данные платежа зафиксированы')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
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
    tab: null,
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
      const row = (l, v) => '<div class="row"><div class="grow"><div class="r-sub">' + esc(l) + '</div></div><div class="r-sub" style="text-align:right">' + esc(v) + '</div></div>';
      return '<div class="scr">' +
        D.head({back:'L1', eyebrow:'Билет', title:'Проживание', sub:esc(h.hotel), paren:paren('изменения — через организатора')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
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

  /* ---------- L5 Семья и команда ---------- */
  D.register('L5', {
    tab: null,
    meta: {
      title: 'L5 · Семья и команда',
      role: 'Гость, профиль',
      fr: ['FR-PROF-05'],
      ac: ['AC-PROF-05'],
      what: [
        'Спутник: имя, роль, разрешённые программы.',
        'Дети: имена и возрасты, отметки согласий.',
        'Согласия семьи: детский клуб, фото, участие Спутника.'
      ],
      rules: [
        'Данные детей собираются только для программ «Спутник» и детского клуба.',
        'Фото детей не публикуется без отдельного согласия.',
        'Согласия можно отозвать в разделе «Приватность».'
      ],
      depends: ['программы Спутника', 'согласия']
    },
    html(ctx) {
      const fm = F.FAMILY;
      const kids = fm.kids.map(k =>
        '<div class="row"><div class="grow"><div class="r-title" style="font-size:14px">' + esc(k.name) + ', ' + k.age + ' лет</div></div>' +
        '<span class="mc-status ok">в детском клубе</span></div>').join('');
      const cons = fm.consents.map(c =>
        '<label class="toggle-row"><div class="tr-title" style="font-weight:500;font-size:14px">' + esc(c) + '</div>' +
        '<span class="toggle"><input type="checkbox" checked><span class="tr"></span></span></label>').join('');
      return '<div class="scr">' +
        D.head({back:'L1', eyebrow:'Кабинет', title:'Семья и команда', sub:'спутник, дети, согласия', paren:paren('данные детей — только для программ')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Спутник</div>' +
        '<div class="r-title">' + esc(fm.satellite) + ' · ' + esc(fm.satelliteRole) + '</div>' +
        '<div class="r-sub" style="margin-top:4px">' + esc(fm.satellitePerm) + '</div></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:6px">Дети · ' + fm.kids.length + '</div>' +
        '<div class="list" style="padding:0">' + kids + '</div></div>' +
        '<div class="card"><div class="cap" style="margin-bottom:4px">Согласия</div>' + cons + '</div>' +
        '<button class="btn btn-primary btn-block" data-act="l5-save">Сохранить</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('l5-save', () => D.toast('Данные семьи сохранены'));

  /* ---------- L6 Приватность ---------- */
  D.register('L6', {
    tab: null,
    meta: {
      title: 'L6 · Приватность',
      role: 'Гость, профиль',
      fr: ['FR-AUTH-06'],
      ac: ['AC-AUTH-06'],
      what: [
        'Согласия на обработку данных с версиями текстов.',
        'Выгрузка всех моих данных файлом.',
        'Удаление аккаунта с последствиями и сроком.'
      ],
      rules: [
        'Согласия версионируются: видно, на какую редакцию дано согласие.',
        'Выгрузка включает профиль, контакты, заметки и историю — в читаемом виде.',
        'Удаление аккаунта необратимо; данные хранятся 30 дней на случай восстановления.'
      ],
      depends: ['права на данные', 'хранение']
    },
    html(ctx) {
      const consents = [
        ['Обработка персональных данных', 'редакция от 15.11.2026'],
        ['Фото и публикация имени в программе', 'редакция от 15.11.2026'],
        ['Аналитика использования приложения', 'редакция от 15.11.2026'],
        ['Передача контактов по моему согласию', 'редакция от 15.11.2026']
      ];
      const rows = consents.map(([t, v]) =>
        '<label class="toggle-row"><div style="flex:1"><div class="tr-title" style="font-weight:500;font-size:14px">' + esc(t) + '</div>' +
        '<div class="tr-sub">' + esc(v) + '</div></div>' +
        '<span class="toggle"><input type="checkbox" checked><span class="tr"></span></span></label>').join('');
      return '<div class="scr">' +
        D.head({back:'L1', eyebrow:'Кабинет', title:'Приватность', sub:'согласия, данные, удаление', paren:paren('выгрузка и удаление — по вашему запросу')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card">' + rows + '</div>' +
        '<button class="btn btn-secondary btn-block" data-act="l6-export">' + icon('download') + 'Выгрузить мои данные</button>' +
        '<div class="card" style="border-color:var(--err)"><div class="cap" style="color:var(--err);margin-bottom:6px">Опасная зона</div>' +
        '<div class="r-sub">Удаление аккаунта отменит билеты, записи и встречи. Данные хранятся 30 дней, затем стираются.</div>' +
        '<button class="btn btn-ghost btn-block" style="margin-top:10px;color:var(--err)" data-act="l6-del">Удалить аккаунт</button></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('l6-export', () => D.toast('Архив данных формируется — в демо загрузка не выполняется'));
  D.action('l6-del', () => D.openSheet('<div class="sheet-title">Удалить аккаунт?</div>' +
    '<div class="cap" style="margin-bottom:10px">Действие необратимо: билеты, записи и встречи будут отменены.</div>' +
    '<button class="btn btn-primary btn-block" data-act="sheet-close">Подтвердить удаление</button>' +
    '<button class="btn btn-ghost btn-block" data-act="sheet-close">Оставить аккаунт</button>'));

  /* ---------- L7 Профиль ---------- */
  D.register('L7', {
    tab: null,
    meta: {
      title: 'L7 · Профиль',
      role: 'Гость, кабинет',
      fr: ['FR-PROF-01'],
      ac: ['AC-PROF-01'],
      what: [
        'Все поля профиля с текущими значениями.',
        'Видимость каждого поля: публично, по запросу, только для подбора, скрыто.',
        'Связь с «Мои контакты» и каталогом людей.'
      ],
      rules: [
        '«Только для подбора» — поле видно алгоритму подбора, но не другим участникам.',
        '«По запросу» — открывается после принятой заявки на знакомство.',
        'Обязательные поля (имя, e-mail) скрыть нельзя.'
      ],
      depends: ['видимость полей', 'каталог']
    },
    html(ctx) {
      const st = ctx.state;
      st.vis = st.vis || {};
      const visOpts = F.VISIBILITY;
      const rows = F.PROFILE_FIELDS.map((f, i) => {
        const v = st.vis[f.field] || f.vis;
        return '<div class="toggle-row"><div style="flex:1;min-width:0"><div class="tr-title" style="font-weight:500;font-size:14px">' + esc(f.field) + '</div>' +
          '<div class="tr-sub" style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + esc(f.value) + '</div></div>' +
          '<select class="input" style="width:auto;padding:6px 10px;font-size:12.5px" data-l7vis="' + i + '" aria-label="Видимость: ' + esc(f.field) + '">' +
          visOpts.map(o => '<option' + (o === v ? ' selected' : '') + '>' + esc(o) + '</option>').join('') + '</select></div>';
      }).join('');
      return '<div class="scr">' +
        D.head({back:'L1', eyebrow:'Кабинет', title:'Профиль', sub:'поля и их видимость', paren:paren('видимость решаете вы для каждого поля')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card" style="padding:4px 14px">' + rows + '</div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">«Только для подбора» — поле помогает находить совпадения, но не показывается другим участникам.</div></div>' +
        '<button class="btn btn-primary btn-block" data-act="l7-save">Сохранить профиль</button>' +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      host.querySelectorAll('[data-l7vis]').forEach(sel => sel.addEventListener('change', () => {
        const i = parseInt(sel.dataset.l7vis, 10);
        D.st('L7').vis[F.PROFILE_FIELDS[i].field] = sel.value;
        D.toast('Видимость «' + F.PROFILE_FIELDS[i].field + '» обновлена');
      }));
    }
  });
  D.action('l7-save', () => D.toast('Профиль сохранён'));

  /* ---------- L0 Кабинет ---------- */
  D.register('L0', {
    tab: null,
    meta: {
      title: 'L0 · Кабинет',
      role: 'Гость, личный раздел',
      fr: ['FR-TKT-01'],
      ac: ['AC-TKT-01'],
      what: [
        'Профиль участника: имя, компания, тариф, бейдж.',
        'Меню кабинета: билет, оплата, проживание, семья, приватность, профиль.',
        'Кабинет доступен из аватара в строке приложения на любом экране.'
      ],
      rules: ['Кабинет — не раздел нижней панели: вход через аватар в шапке.',
        'Данные профиля — вымышленные, как во всех экранах демо.']
    },
    html(ctx) {
      const ME = F.ME;
      const items = [
        ['L1', 'Билет', 'Документ, QR и условия тарифа'],
        ['L2', 'Приглашение PDF', 'Печать и пересылка'],
        ['L3', 'Оплата', 'Заказы и чеки'],
        ['L4', 'Проживание', 'Отель и номер'],
        ['L5', 'Семья и команда', 'Спутник, дети, согласия'],
        ['L6', 'Приватность', 'Согласия и данные'],
        ['L7', 'Профиль', 'Поля и их видимость']
      ];
      const rows = items.map(it =>
        '<button class="row clickable" data-go="' + it[0] + '"><div class="grow">' +
        '<div class="r-title">' + it[1] + '</div><div class="r-sub">' + it[2] + '</div></div>' + icon('chevR') + '</button>').join('');
      return '<div class="scr">' +
        D.head({eyebrow:'Кабинет', title:esc(ME.name), sub:esc(ME.company) + ' · тариф ' + esc(ME.tariff) + ' · ' + esc(ME.edition), paren:paren('личный раздел — вход через аватар в шапке')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card" style="display:flex;align-items:center;gap:14px">' + avatar(ME.name, 'l accent') +
        '<div class="grow"><div class="r-title" style="font-size:16px">' + esc(ME.name) + '</div>' +
        '<div class="r-sub">' + esc(ME.patronymic) + '</div>' +
        '<div class="sess-meta" style="margin-top:6px">' + tariffTag(ME.tariff) + '<span class="cap">' + esc(ME.memberSince) + '</span></div></div></div>' +
        '<div class="card" style="padding:2px 16px"><div class="list">' + rows + '</div></div>' +
        '<div class="cap" style="text-align:center">кабинет экспонента — в разделе Экспо, после выбора компании</div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
})();
