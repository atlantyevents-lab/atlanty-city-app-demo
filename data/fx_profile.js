/* Профиль, цели, итоги, заметки. Владелец S7. Расширяет window.FIX (Object.assign). Схемы — design/04_REBUILD_V3.md, часть 5.
   Подключается после data/fixtures.js и data/fx_shared.js; существующих полей FIX не меняет, только добавляет.
   Все люди и компании вымышленные. Данные ME берутся из fx_shared.js (расширенный ME, TAXO, COMPANIES, PRODUCTS).
   Содержимое:
     VIS_INFO, PROFILE_HELP, CONSENTS — уровни видимости (D-47), подсказки полей профиля, согласия (D-44, D-47);
     GOAL_NOTES, GOALS_HISTORY — формулировки целей и история изменений (FR-PROF-11);
     FAMILY_DB — семья и дети из данных менеджеров и билетной базы (D-45, FR-PROF-12);
     MY_NOTES — заметки без самого ME в роли контакта (в NOTES заметка n4 описывала ME) и с прошедшим временем;
     MY_RESULTS, POST_CONTACTS, ROADMAP, ROADMAP_TIPS — итоги, контакты после события, дорожная карта (M4–M6);
     VIDEOS, TOUR, CODEX, FAQ — материалы «Как пользоваться», «Кодекс участника», «Вопросы и ответы» (L9–L11);
     profileFill — расчёт заполненности профиля (FR-PROF-13);
     PS — рабочее состояние профиля демо (видимость, значения полей, согласия, цели и запрос, семья, заметки, отметки итогов):
       общее для L5–L8 и M1–M6, живёт, пока открыта страница; видимость хранится в FIX.ME.visibility, значения, цели и запрос
       записываются и в FIX.ME, чтобы другие разделы видели правки;
     CONSENT_TEXT, EXPORT_PARTS, DELETE_EFFECTS, VIS_AUDIENCES — тексты и справочники экрана «Приватность». */
(function () {
  'use strict';
  window.FIX = window.FIX || {};
  var FIX = window.FIX;

  /* ================= уровни видимости (D-47) ================= */

  /* label — подпись в интерфейсе (дословно из D-47); short равна label: везде показываются полные метки уровней
     (Д-15, Q-20), сокращённых вариантов нет. example — «что увидят» на примере полей по умолчанию (FR-ONB-08). */
  var VIS_INFO = {
    only_me: { id: 'only_me', label: 'Только вы', short: 'Только вы', icon: 'lock',
      desc: 'Поле видите только вы. Подбор учитывает его, но людям оно не показывается.',
      example: 'По умолчанию: оборот компании, цели, семейное положение, дети.' },
    meeting: { id: 'meeting', label: 'Те, с кем у меня встреча', short: 'Те, с кем у меня встреча', icon: 'calendar',
      desc: 'Поле видят люди, с которыми у вас подтверждена или состоялась встреча.',
      example: 'По умолчанию: запрос на фестиваль, Instagram, Telegram.' },
    all: { id: 'all', label: 'Все участники', short: 'Все участники', icon: 'people',
      desc: 'Поле видят все участники фестиваля в карточке и в поиске.',
      example: 'По умолчанию: имя, компания, сайт, отрасль, сообщества, хобби, спорт, польза.' },
    partners: { id: 'partners', label: 'Экспоненты и спикеры по согласию', short: 'Экспоненты и спикеры по согласию', icon: 'briefcase',
      desc: 'Поле видят экспоненты и спикеры при сканировании вашего QR и в карточке, если вы дали согласие на передачу контактов.',
      example: 'Например: Telegram и Instagram, которые вы готовы показать экспоненту на стенде.' }
  };

  /* Подсказки под полями профиля (список полей и порядок — TAXO.PROFILE_FIELDS, часть 5.3) */
  var PROFILE_HELP = {
    name: 'Из вашего билета. Видно в каталоге и в карточке.',
    company: 'Название компании из билета. Карточка компании открывается из профиля.',
    site: 'Адрес сайта компании без внешних ссылок в тексте интро.',
    industry: 'Одна из 16 отраслей. Используется в подборе людей и решений.',
    revenue: 'Диапазон, не точное число. По умолчанию используется только подбором; открыть его другим можете вы.',
    communities: 'Можно выбрать несколько. «Не состою» считается заполненным полем.',
    hobby: 'Помогает подбору и разговору за кофе.',
    sport: 'Помогает подбору спортивных и семейных форматов.',
    usefulness: 'Чем вы можете быть полезны другим участникам.',
    request: 'Что решить за 30–90 дней. Правится в разделе «Цели и запросы».',
    goals: 'От одной до пяти целей, одна главная. Правятся в разделе «Цели и запросы».',
    instagram: 'Ссылка на профиль. Видна только тем, кому вы её открыли.',
    family: 'Подтягивается из вашего билета, подтверждается в разделе «Семья и команда».',
    kids: 'Число детей. Подтягивается из вашего билета, подтверждается в разделе «Семья и команда».',
    telegram: 'Ваш @username. Видят те, у кого с вами встреча, и экспоненты по согласию.'
  };

  /* ================= согласия (L6) =================
     req — обязательное; lawyer — пометка «решение юриста» (D-44); def — значение по умолчанию (club не отмечен заранее). */
  var CONSENTS = [
    { id: 'pd', title: 'Обработка персональных данных', req: true, def: true,
      sub: 'Обязательное: без него приложение не работает. Политика обработки данных опубликована на сайте организатора.',
      ver: 'редакция от 15.11.2026', given: '12.02.2027' },
    { id: 'profile', title: 'Показывать профиль другим участникам', def: true,
      sub: 'Уровни видимости задаются по каждому полю на вкладке «Видимость». Отзыв согласия убирает вас из каталога.',
      ver: 'редакция от 15.11.2026', given: '12.02.2027' },
    { id: 'scan', title: 'Передавать контакты экспонентам при сканировании', def: true,
      sub: 'Экспонент при сканировании QR видит поля уровня «Экспоненты и спикеры по согласию». Без согласия видны только имя и компания.',
      ver: 'редакция от 15.11.2026', given: '12.02.2027' },
    { id: 'notify', title: 'Уведомления', def: true,
      sub: 'Типы и каналы настраиваются отдельно: «Мой путь», «Лента», «Чаты встреч», встречи и записи.',
      ver: 'редакция от 15.11.2026', given: '12.02.2027', link: 'B3' },
    /* Текст — решение ведущего (D-44, Д-13): состав данных названа, контакты других людей не передаются; внутренних пометок нет.
       Версия текста не называется (редакция юриста не передана): строка версии у согласия пустая и не показывается. */
    { id: 'club', title: 'Передавать мои данные клубу «Атланты»', def: false,
      sub: 'Профиль (имя, компания, отрасль, цели и запрос) и итоги фестиваля. Контакты других людей не передаются. Согласие необязательное, можно отозвать в любой момент.',
      ver: '', given: null }
  ];
  /* дата выдачи, которую L6 показывает у выданного согласия: берётся из FIX.CONSENTS[i].given (A4 и L6 пишут её сюда) */

  /* ================= цели и запросы (L8) ================= */

  /* Формулировки целей ME по доменам (ME.goals3 из fx_shared.js: первые две привязаны к доменам G2 и G6) */
  var GOAL_NOTES = {
    G2: 'Открыть склады в двух новых регионах за год',
    G6: 'Найти партнёра по доставке на юге'
  };

  /* История изменений: время, поле, прежнее и новое значение (FR-PROF-11, AC-PROF-11) */
  var GOALS_HISTORY = [
    { id: 'gh1', time: '12.02.2027, 18:42', what: 'Цели', from: '—',
      to: 'Главная: «Вырасти и масштабировать бизнес»; ещё: «Окружение: партнёры, клиенты, связи»' },
    { id: 'gh2', time: '12.02.2027, 18:44', what: 'Запрос на 30–90 дней', from: '—',
      to: 'Хочу масштабироваться на новые регионы и найти партнёров по складской логистике' },
    { id: 'gh3', time: '20.02.2027, 09:15', what: 'Горизонт запроса', from: '30 дней', to: '60 дней' }
  ];

  /* ================= семья и дети из данных менеджеров и билетной базы (L5, D-45, FR-PROF-12) =================
     state: 'ticket' — предложено из билета, не подтверждено (видно только владельцу, не идёт в подбор и в ИИ);
     'confirmed' — подтверждено; 'added' — добавлено вами; 'rejected' — отклонено. */
  var FAMILY_DB = {
    source: 'из вашего билета',
    loadedAt: '12.02.2027',
    marital: { value: 'Женат/замужем', state: 'ticket' },
    companion: { id: 'fc1', name: 'Елена Власова', role: 'супруга', perm: 'программа «Спутник» и детский клуб', state: 'ticket' },
    kids: [
      { id: 'k1', name: 'Миша', age: 9, interests: ['Спорт', 'Игры'], state: 'ticket' },
      { id: 'k2', name: 'Алиса', age: 6, interests: ['Творчество'], state: 'ticket' }
    ],
    interests: ['Спорт', 'Творчество', 'Игры', 'Языки'],
    consents: [
      { id: 'kidsClub', title: 'Участие детей в детском клубе', sub: 'Детская программа для детей от 6 лет', def: true },
      { id: 'kidsPhoto', title: 'Публиковать фото детей', sub: 'Без отдельного согласия фото детей не публикуется', def: false },
      { id: 'satellite', title: 'Спутник участвует в программе «Спутник»', sub: 'Вечер «Спутник» и родительский нетворкинг', def: true }
    ]
  };

  /* ================= заметки (M1, M2) =================
     Копия NOTES без записи, где ME был контактом самому себе (n4), и с временем не позже 27.02, 11:10. */
  var MY_NOTES = [
    { id: 'n1', title: 'Кейс Левина: маржа в логистике', session: 's2702', time: 'сегодня, 10:30', tags: ['кейс', 'логистика'],
      text: 'Маржа утекает на холостых рейсах — считать по машине, не по тонне.' },
    { id: 'n2', title: 'Вопрос Деминой про факторинг', session: 's2713', time: 'сегодня, 09:40', tags: ['финансы', 'вопрос'],
      text: 'Спросить про ставку при сезонности.' },
    { id: 'n3', title: 'Идея: юнит-экономика склада', session: 's2603', time: 'вчера, 13:10', tags: ['практикум', 'идея'],
      text: 'Перенести таблицу на свой продукт: стоимость паллетоместа по регионам.' },
    { id: 'n4', title: 'Контакт: Марина Крылова', session: null, person: 'p03', time: 'вчера, 15:30', tags: ['контакт', 'встреча'],
      text: 'Нужен клиентский кабинет для клиентов склада: заказы, остатки, документы. Она пришлёт 2–3 примера кабинетов. Следующий шаг — созвон после фестиваля.' },
    { id: 'n5', title: 'Переговоры о цене', session: 's2712', time: 'сегодня, 09:55', tags: ['практикум', 'навык'],
      text: 'Приём «якорь по объёму» — разобрать в парах.' }
  ];

  /* ================= итоги (M4), контакты после события (M6), дорожная карта (M5) =================
     Копий нет: встречи и договорённости читаются из FIX.PPL.store (источник G1/G4/G9), контакты — из FIX.PPL.CONTACTS (F8),
     список «Изучить» и статусы стендов — из D.st('H3') (S4a; пока H3 не открывали, список как в H3 по умолчанию, FIX.STAND_ROUTE),
     поэтому M4–M6 показывают тех же людей, даты и статусы, что G1, F8, H3 и G9.
     Два среза M4: 'now' — 27.02.2027, 11:10 (середина фестиваля), 'after' — итог после фестиваля (01.03.2027):
     подтверждённые встречи считаются состоявшимися (проекция демо), заявка без ответа остаётся «без ответа», «впереди» нет. */
  var NOW_STAMP = '27.02.2027, 11:10', END_STAMP = '01.03.2027';
  /* срок доступа: около полугода после фестиваля (D-18): 28.02.2027 + 6 месяцев; один источник для L1, M4, M5 */
  var ACCESS_UNTIL = '28.08.2027';
  var PPL = FIX.PPL;

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function addDays(dm, n) {
    var p = String(dm).split('.'), d = new Date(2027, +p[1] - 1, +p[0] + n);
    return pad2(d.getDate()) + '.' + pad2(d.getMonth() + 1);
  }
  function cap1(s) { s = String(s || ''); return s.charAt(0).toUpperCase() + s.slice(1); }
  function dateKey(dm) { return String(dm).split('.').reverse().join(''); }
  function plural(n, f) { var a = Math.abs(n) % 100, b = a % 10; return (a > 10 && a < 20) ? f[2] : b > 1 && b < 5 ? f[1] : b === 1 ? f[0] : f[2]; }

  /* состояние «Изучить» и статусов стендов (H3) без зависимости от порядка загрузки */
  function h3() { var D = window.Demo; return D && D.st ? D.st('H3') : null; }
  function studyList() {
    var s = h3();
    return (s && s.list) ? s.list.slice() : (FIX.STAND_ROUTE || []).map(function (r) { return r.ex; });
  }
  function studyStatus(ex) { var s = h3(); return s && s.status ? s.status[ex] || null : null; }

  /* встречи: статус итогов done | planned | nores | cancelled; raw — статус G1 (pending, confirmed, held, cancelled) */
  function resultMeetings(mode) {
    var list = PPL.store.meets.slice().sort(function (a, b) { return (a.day.split('.').reverse().join('') + a.start).localeCompare(b.day.split('.').reverse().join('') + b.start); });
    return list.map(function (m) {
      var w = m.who || {}, st = m.status;
      var kind = w.type === 'speaker' ? 'speaker' : w.type === 'exhibitor' ? 'exhibitor' : 'person';
      var fin = st === 'cancelled' ? 'cancelled'
        : mode === 'after' ? (st === 'pending' ? 'nores' : 'done')
        : (st === 'held' ? 'done' : 'planned');
      return { id: m.id, kind: kind, ref: w.type === 'speaker' ? w.key : w.id, day: m.day, time: m.start, place: m.place,
        status: fin, raw: st, outcome: typeof m.outcome === 'string' ? m.outcome : null };
    });
  }
  /* договорённости из G9; срок: дата из текста («до 28.02») или «через N дней» от дня встречи/знакомства */
  function agBase(a) {
    var m = a.meetId ? PPL.meet(a.meetId) : null;
    if (m) { return m.day; }
    for (var i = 0; i < PPL.CONTACTS.length; i++) { if (PPL.CONTACTS[i].pid === a.who) { return String(PPL.CONTACTS[i].when).slice(0, 5); } }
    return '26.02';
  }
  function agDue(a) {
    var t = /\s+до\s+(\d\d\.\d\d)\s*$/.exec(a.text || '');
    if (t) { return t[1]; }
    var n = /(\d+)/.exec(a.due || '');
    return n ? addDays(agBase(a), +n[1]) : '';
  }
  function resultAgreements() {
    return PPL.store.agreements.map(function (a) {
      return { id: a.id, who: a.who, raw: String(a.text || ''), text: String(a.text || '').replace(/\s+до\s+\d\d\.\d\d\s*$/, ''), owner: a.initiator === 'me' ? 'me' : 'them',
        due: agDue(a), dueText: a.due, status: a.status === 'done' ? 'done' : 'open', g9: a.status, step: a.step,
        initiator: a.initiator, meetId: a.meetId || null };
    });
  }
  /* стенды из «Изучить»; был — отметка «посетил» в H3 или встреча на стенде (состоялась; в срезе after и подтверждённая) */
  function standMeeting(ex, mode) {
    for (var i = 0; i < PPL.store.meets.length; i++) {
      var m = PPL.store.meets[i], w = m.who || {};
      if (w.type === 'exhibitor' && w.id === ex && (m.status === 'held' || (mode === 'after' && m.status === 'confirmed'))) { return m; }
    }
    return null;
  }
  function resultStands(mode) {
    return studyList().filter(function (ex) { return FIX.exhibitor && FIX.exhibitor(ex); }).map(function (ex) {
      var mt = standMeeting(ex, mode), seen = studyStatus(ex) === 'посетил';
      return { ex: ex, studied: true, visited: mt ? mt.day + ', ' + mt.start : seen ? 'отмечено в «Изучить»' : null };
    });
  }

  var MY_RESULTS = { asOf: NOW_STAMP, endDate: END_STAMP, pdfName: 'Мои итоги фестиваля.pdf' };
  Object.defineProperty(MY_RESULTS, 'meetings', { enumerable: true, get: function () { return resultMeetings('now'); } });
  Object.defineProperty(MY_RESULTS, 'agreements', { enumerable: true, get: resultAgreements });
  Object.defineProperty(MY_RESULTS, 'stands', { enumerable: true, get: function () { return resultStands('now'); } });
  MY_RESULTS.meetingsAt = resultMeetings;
  MY_RESULTS.standsAt = resultStands;

  /* ---- контакты после события = «Мои контакты» (F8) ----
     id, person, note, tag, remind берутся из PPL.CONTACTS; tg — @username из профиля человека, tgOpen — виден ли он по его уровню. */
  function postContacts() {
    return PPL.CONTACTS.map(function (k) {
      var acc = PPL.fieldAccess(k.pid, 'telegram'), x = PPL.EXT[k.pid] || {};
      return { id: k.id, person: k.pid, when: k.when, day: String(k.when).slice(0, 5), note: k.note, tag: k.tag, remind: k.remind || '',
        meeting: !!PPL.meetWith(k.pid), tgOpen: !!acc.visible, tg: x.telegram || '' };
    });
  }

  /* Формулировки для черновика: только то, что записано. По тексту заметки F8 и по заметкам M1; заметка, которую правили,
     входит в письмо своим текстом без пересказа. */
  var DRAFT_S = {
    'кабинет для клиентов, пришлю расчёт': 'Мы говорили про кабинет для клиентов; расчёт я пришлю.',
    'совместные рейсы на юг, созвон в марте': 'Мы обсуждали совместные рейсы на юг и созвон в марте.',
    'дистрибуция и логистика на юге': 'Мы говорили про дистрибуцию и логистику на юге.',
    'аудит воронки продаж': 'Мы говорили про аудит воронки продаж.',
    'приглашённый покупатель, упаковка и логистика': 'Мы говорили про упаковку и логистику.'
  };
  var DRAFT_NOTE_S = {
    n4: { seed: 'Нужен клиентский кабинет для клиентов склада: заказы, остатки, документы. Она пришлёт 2–3 примера кабинетов. Следующий шаг — созвон после фестиваля.',
      s: ['Мы говорили про клиентский кабинет для клиентов склада: заказы, остатки, документы.', 'Вы обещали прислать 2–3 примера кабинетов.'] }
  };
  /* предложения, которые участник может добавить в письмо сам; по умолчанию выключены (фактами не являются) */
  var DRAFT_OFFERS = [
    { id: 'call', label: 'Предложить созвониться после фестиваля', s: 'Предлагаю созвониться после фестиваля.' },
    { id: 'meet', label: 'Предложить встретиться на следующем фестивале', s: 'Предлагаю встретиться на следующем фестивале.' },
    { id: 'mat', label: 'Предложить обменяться материалами', s: 'Предлагаю обменяться материалами.' }
  ];

  /* заметки о человеке: запись F8 и заметки M1, привязанные к контакту (note.person); t — как показать, s — для письма */
  function contactNotes(pid) {
    var out = [], k = null, i;
    for (i = 0; i < PPL.CONTACTS.length; i++) { if (PPL.CONTACTS[i].pid === pid) { k = PPL.CONTACTS[i]; } }
    if (k && k.note) { out.push({ src: 'f8', t: cap1(k.note), s: DRAFT_S[k.note] || ('Из моих заметок: ' + k.note + '.') }); }
    (PS.notes || []).forEach(function (n) {
      if (n.person !== pid) { return; }
      var d = DRAFT_NOTE_S[n.id], text = String(n.text || '').trim();
      var seeded = d && d.seed === text;
      out.push({ src: 'note', id: n.id, t: text, s: seeded ? d.s.join(' ') : text });
    });
    return out;
  }

  /* ---- дорожная карта: шаги строятся из живых данных (контакты, договорённости, «Изучить», запрос и цели) ----
     stages — этапы (срок до конца доступа), items — шаги; id шагов стабильны, чтобы отметки выполнения не терялись. */
  var ROADMAP = {
    stages: [
      { id: 'st1', title: 'Первая неделя', range: 'до 06.03', hint: 'контакты и договорённости' },
      { id: 'st2', title: 'Март и апрель', range: 'до 30.04', hint: 'ваш запрос на фестиваль' },
      { id: 'st3', title: 'Май и июнь', range: 'до 30.06', hint: 'ваши цели на год' },
      { id: 'st4', title: 'Лето', range: 'до 28.08', hint: 'итоги и следующий фестиваль' }
    ]
  };
  function roadmapItems() {
    var items = [], pcs = postContacts(), n = pcs.length;
    var dates = pcs.map(function (c) { return PS.remindDate(c); }).filter(Boolean).sort(function (a, b) { return dateKey(a) < dateKey(b) ? -1 : 1; });
    if (n) {
      items.push({ id: 'rd1', stage: 'st1', src: 'contact', title: 'Написать ' + n + ' ' + plural(n, ['контакту', 'контактам', 'контактам']) + ' после фестиваля',
        due: 'до ' + (dates.length ? dates[dates.length - 1] : '06.03'), why: 'напоминания из контактов после события', link: 'M6', remind: true });
    }
    resultAgreements().forEach(function (a) {
      var p = a.who && FIX.person ? FIX.person(a.who) : null;
      if (a.status === 'done') { return; }
      items.push({ id: 'rd-ag-' + a.id, stage: 'st1', src: 'contact', title: cap1(a.step) + (p ? ': ' + p.name : ''), due: 'до ' + (a.due || '06.03'),
        who: a.who, why: 'договорённость, ' + (a.g9 === 'you' ? 'ждёт вашего ответа' : 'ждёт подтверждения'), link: 'G9', remind: true });
    });
    var req = PS.justMeet;
    if (req) {
      items.push({ id: 'rd-req', stage: 'st2', src: 'request', title: 'Сформулировать запрос на 30–90 дней', due: 'до 15.04',
        why: 'сейчас выбрано «Просто знакомиться»', link: 'L8', remind: false });
    } else {
      items.push({ id: 'rd-req', stage: 'st2', src: 'request', title: 'Проверить, что сделано по запросу', due: 'до 30.04',
        why: 'ваш запрос: ' + (PS.requestTask || 'свой текст'), link: 'L8', remind: false });
    }
    studyList().filter(function (ex) { return FIX.exhibitor && FIX.exhibitor(ex); }).slice(0, 2).forEach(function (ex, i) {
      var e = FIX.exhibitor(ex);
      items.push({ id: 'rd-st-' + ex, stage: 'st2', src: 'request', title: 'Запросить предложение: «' + e.name + '»', due: i ? 'до 30.04' : 'до 15.04',
        ex: ex, why: 'решение в вашем списке «Изучить»', link: 'H2/' + ex, remind: false });
    });
    var goals = PS.goals;
    if (goals.length) {
      var main = PS.main || goals[0].code, mg = null;
      goals.forEach(function (g) { if (g.code === main) { mg = g; } });
      mg = mg || goals[0];
      items.push({ id: 'rd-main', stage: 'st2', src: 'goal', title: 'Наметить три шага по главной цели', due: 'до 31.03',
        why: 'ваша цель: ' + PS.goalTitle(mg.code), link: 'L8', remind: false });
      var other = goals.filter(function (g) { return g.code !== mg.code; })[0];
      if (other) {
        items.push({ id: 'rd-goal2', stage: 'st3', src: 'goal', title: 'Найти людей и решения под цель «' + PS.goalTitle(other.code) + '»', due: 'до 31.05',
          why: 'ваша цель: ' + PS.goalTitle(other.code), link: 'F1', remind: false });
      }
    }
    items.push({ id: 'rd-rev', stage: 'st3', src: 'request', title: 'Пересмотреть запрос и цели', due: 'до 15.06',
      why: 'запрос действует ' + PS.horizon + ' ' + plural(PS.horizon, ['день', 'дня', 'дней']), link: 'L8', remind: true });
    if (goals.length) {
      items.push({ id: 'rd-end', stage: 'st4', src: 'goal', title: 'Подвести итоги по целям', due: 'до 31.07', why: 'ваши цели: ' + goals.length + ' из 5', link: 'L8', remind: false });
    }
    return items;
  }
  Object.defineProperty(ROADMAP, 'items', { enumerable: true, get: roadmapItems });

  /* «Куда ещё сходить»: подсказки без названий конкретных мероприятий (списка и дат заказчик не передал); причины из вашего профиля.
     Подсказок клуба нет: функций клуба в объёме нет (D-32, D-44), клубу передаются только данные по согласию. */
  function roadmapTips() {
    var tips = [], v = PS.val;
    if (v.industry) { tips.push({ id: 'tp1', title: 'Отраслевые встречи по вашей отрасли', why: 'ваша отрасль: ' + v.industry, stage: 'st2' }); }
    if (PS.goals.length) {
      var m = PS.main || PS.goals[0].code;
      tips.push({ id: 'tp2', title: 'Встречи предпринимателей по вашей главной цели', why: 'ваша цель: ' + PS.goalTitle(m), stage: 'st3' });
    }
    var hs = [v.hobby, v.sport].filter(Boolean).join(', ');
    if (hs) { tips.push({ id: 'tp4', title: 'Спортивные и семейные форматы на выходных', why: 'ваши хобби и спорт: ' + hs.toLowerCase(), stage: 'st3' }); }
    return tips;
  }
  Object.defineProperty(FIX, 'ROADMAP_TIPS', { enumerable: true, configurable: true, get: roadmapTips });

  var NEXT_FEST = { title: 'Атланты Сити. Лето 2027', when: 'даты объявим позже', site: 'atlantycity.ru' };

  /* ================= «Как пользоваться» (L9) ================= */
  var VIDEOS = [
    { id: 'v1', title: 'О фестивале', min: 5, author: 'Борис и Александр',
      desc: 'Что такое «Атланты Сити», как устроены три дня и зачем вам Экспо.',
      chapters: ['Что такое «Атланты Сити»', 'Три дня: ритм программы', 'Экспо и встречи на площадке'] },
    { id: 'v2', title: 'О программе', min: 5, author: 'Борис и Александр',
      desc: 'Залы, рычаги, менторские и практики: как выбирать сессии под свою цель.',
      chapters: ['Залы и расписание', 'Рычаги: на что смотреть', 'Менторские и экспертные гостиные', 'Практики и питч-сессии'] },
    { id: 'v3', title: 'О приложении', min: 2, author: 'Борис и Александр',
      desc: 'Мой путь, встречи, лента и приватность за две минуты.',
      chapters: ['Мой путь и «+ Путь»', 'Встречи и заявки', 'Лента и чаты', 'Приватность'] }
  ];

  var TOUR = [
    { id: 't1', title: 'Мой путь', ic: 'route', go: 'B1', text: 'Главный экран: что сейчас, что дальше, люди и решения под ваш запрос. Всё найденное добавляется кнопкой «+ Путь».' },
    { id: 't2', title: 'Программа', ic: 'program', go: 'C1', text: 'Список, сетка, менторские и избранное. Фильтры по залам, рычагам, практикам и меткам досуга.' },
    { id: 't3', title: 'Маркетплейс', ic: 'market', go: 'H1', text: 'Решения для роста бизнеса, стенды Экспо, КипяTALK и ваш список «Изучить».' },
    { id: 't4', title: 'Участники', ic: 'people', go: 'F1', text: 'Люди и компании, умная строка, «Предметный кофе», заявки и встречи.' },
    { id: 't5', title: 'Лента', ic: 'feed', go: 'R1', text: 'Новости фестиваля, интро участников и чаты встреч. «Мой чат» открывает группу вашего билета в Telegram.' },
    { id: 't6', title: 'Меню и карта', ic: 'menu', go: 'Z1', text: 'Все разделы собраны в меню слева в шапке. Карта площадки — значок в шапке.' },
    { id: 't7', title: 'Кабинет', ic: 'user', go: 'L0', text: 'Билет, профиль, цели, приватность, заметки и итоги: всё, что относится лично к вам.' }
  ];

  /* ================= «Кодекс участника» (L10) =================
     Тексты по решениям D-33, D-35, D-47, D-49 и требованиям FR-FEED-05/06, FR-CHAT-02/03/05/06; редакция на согласовании
     (клубные тексты передают Миша и Олеся, analysis/09). */
  var CODEX = {
    version: 'проект редакции',
    sections: [
      { id: 'cx1', title: 'Поведение на площадке', ic: 'people', rules: [
        'Уважайте время и границы собеседника: «нет» принимается без объяснений.',
        'Не фотографируйте и не записывайте людей без их согласия.',
        'Данные из карточек и со сканера используйте только для знакомства, которое вы обозначили.',
        'Детей и Спутников приглашайте в программы, которые для них открыты.'
      ] },
      { id: 'cx2', title: 'Знакомства и заявки', ic: 'userPlus', rules: [
        'В заявке на знакомство пишите причину: чем вы можете быть полезны друг другу.',
        'Не отправляйте одну и ту же заявку повторно и не пишите в Telegram тем, кто ещё не принял заявку.',
        'Встречу, которую не можете провести, отмените заранее: окно освободится для других.',
        'Без согласия человека не передавайте его контакты и не добавляйте его в рассылки.'
      ] },
      { id: 'cx3', title: 'Интро и запросы в ленте', ic: 'feed', rules: [
        'Интро — рассказ о себе в 3–5 предложениях: кто вы, чем полезны, что ищете.',
        'Теги «#запрос» и «#ивент» только для запроса к участникам и приглашения на встречу.',
        'Во внутренних ссылках можно указывать карточку компании и профиль; внешние ссылки и телефоны не публикуются.',
        'Каждую запись проверяет модератор: возврат с причиной и удаление сопровождаются уведомлением автору.'
      ] },
      { id: 'cx4', title: 'Чаты встреч', ic: 'chat', rules: [
        'В чате обсуждают только тему встречи: без рекламы, рассылок и личных сообщений.',
        'Чат живёт до конца фестиваля, затем архивируется: читать можно, писать нельзя.',
        'Автор встречи сам выбирает место и время, приложение их не бронирует.',
        'Нарушение правил — кнопка «Пожаловаться»: жалоба уходит группе админов чатов.'
      ] },
      { id: 'cx5', title: 'Реклама', ic: 'alert', rules: [
        'Рекламные посты участников запрещены: о бизнесе рассказывают через интро.',
        'Экспоненты и партнёры публикуют материалы только в рамках пакета, с пометкой «Решения для роста бизнеса» или «Партнёр».',
        'Информацию фестиваля и партнёров скрыть нельзя: это новости, изменения и срочные сообщения.',
        'Сделки заключаются участниками самостоятельно; организаторы не отвечают за сделки.'
      ] }
    ]
  };

  /* ================= «Вопросы и ответы» (L11): 12 вопросов, без упоминания внутренних баз организаторов ================= */
  var FAQ = [
    { id: 'q1', cat: 'Билет и вход', q: 'Не приходит код входа, что делать?',
      a: 'Код из шести цифр действует 5 минут. Запросите его повторно по ссылке «Не пришёл код». После пяти неверных попыток вход блокируется на 15 минут. Если вашего контакта нет в базе билетов, подойдите на стойку: после проверки документа вам выдадут временный код.' },
    { id: 'q2', cat: 'Билет и вход', q: 'Где мой билет и как пройти по QR?',
      a: 'Билет с QR лежит в разделе «Кабинет», пункт «Билет и QR». QR обновляется каждые 60 секунд, когда есть связь; скриншот не принимается. Последний QR виден и без сети. На стойке включите режим «Показать на стойке».' },
    { id: 'q3', cat: 'Билет и вход', q: 'Что даёт мой тариф и можно ли его изменить в приложении?',
      a: 'Тариф виден в профиле и другим участникам. Запись на менторские встречи и экспертные гостиные доступна тарифам «Бизнес» и «Первый класс»; для «Оптимума» она закрыта. Оплата в приложении не проводится: изменить тариф можно через Telegram организатору, права меняются сразу после изменения тарифа.' },
    { id: 'q4', cat: 'Программа и записи', q: 'Как записаться на сессию, менторскую встречу или гостиную?',
      a: 'Сессию добавьте в «Мой путь» кнопкой «+ Путь». Запись на менторские окна и экспертные гостиные — в разделе «Менторские». Запись всегда подтверждается нажатием кнопки. Если мест нет, можно встать в лист ожидания: освободившееся место придёт уведомлением.' },
    { id: 'q5', cat: 'Программа и записи', q: 'Что такое «Мой путь» и откуда он берётся?',
      a: 'Мой путь — ваш план на дни фестиваля: сессии, встречи, стенды, досуг. Его собирают правила по вашей цели, запросу, отрасли и тарифу; ИИ только предлагает и объясняет, а изменения совершает ваша кнопка. Пункты экспонентов помечены «на площадке», у каждого пункта есть причина.' },
    { id: 'q6', cat: 'Встречи', q: 'Как договориться о встрече с участником?',
      a: 'Откройте карточку человека и нажмите «Хочу встретиться». Напишите приветствие до 280 знаков, приложение предложит окно и стол. Встреча подтверждается обеими сторонами; напоминания придут за 60, 15 и 5 минут.' },
    { id: 'q7', cat: 'ИИ и подбор', q: 'Почему мне показывают именно этих людей и решения?',
      a: 'Подбор работает автоматически по вашим целям, запросу на 30–90 дней, отрасли, хобби и пользе для других. У каждой рекомендации есть причина. Числовой оценки совпадения нет, отказаться от подбора нельзя: без него приложение не сможет собрать «Мой путь». Оборот по умолчанию используется только подбором.' },
    { id: 'q8', cat: 'Чаты и лента', q: 'Есть ли в приложении общий чат участников?',
      a: 'Нет. В приложении живут групповые чаты встреч: они создаются из записи с тегом #ивент, действуют до конца фестиваля, их модерирует группа админов. Чат вашего тарифа — группа в Telegram, ссылка в «Мой чат». Личных сообщений в приложении нет: знакомьтесь через заявку.' },
    { id: 'q9', cat: 'Чаты и лента', q: 'Можно ли публиковать рекламу в ленте?',
      a: 'Участникам нельзя: о бизнесе рассказывают через интро в 3–5 предложениях со ссылкой на карточку компании. Реклама экспонентов выходит только в рамках пакета, с пометкой «Решения для роста бизнеса» или «Партнёр», после модерации. Подробнее — в разделе «Кодекс участника».' },
    { id: 'q10', cat: 'Данные', q: 'Кто видит мой профиль и контакты?',
      a: 'Вы выбираете уровень для каждого поля: «Только вы», «Те, с кем у меня встреча», «Все участники», «Экспоненты и спикеры по согласию». Экспонент при сканировании QR видит ваши поля по этим настройкам; без согласия он видит только имя и компанию. Настройки — в разделе «Приватность».' },
    { id: 'q11', cat: 'Данные', q: 'Как выгрузить или удалить мои данные?',
      a: 'В разделе «Приватность»: «Выгрузить мои данные» формирует файл с профилем, заметками, контактами и итогами встреч (до 5 минут); «Удалить аккаунт» отправляет запрос на удаление. Сроки обработки запроса определяет закон о персональных данных. Пока запрос не исполнен, его можно отменить.' },
    { id: 'q12', cat: 'ИИ и подбор', q: 'Что делает ИИ и какие мои данные он получает?',
      a: 'ИИ предлагает путь, черновик интро, подборки и ответы; любое действие совершается вашей кнопкой. В модель не передаются контакты: телефон, e-mail, Telegram и ссылки на соцсети. Имена шифруются. У каждого режима есть замена без ИИ. Голосовой ввод есть в строке «Мой путь» и в ассистенте; распознанный текст виден и правится до отправки.' }
  ];

  /* ================= заполненность профиля (FR-PROF-13, AC-PROF-06) =================
     Обязательные поля весят 50 %, остальные — поровну (50 %). Обязательные по FR-PROF-07: имя, компания, сайт, отрасль,
     оборот, бизнес-сообщества, цель, запрос (или «просто знакомиться»). Необязательные: хобби, спорт, польза, Instagram,
     семейное положение, дети, Telegram. filled — объект { fieldId: true/false }. */
  var REQ_FIELDS = ['name', 'company', 'site', 'industry', 'revenue', 'communities', 'goals', 'request'];
  var OPT_FIELDS = ['hobby', 'sport', 'usefulness', 'instagram', 'family', 'kids', 'telegram'];
  function profileFill(filled) {
    var r = REQ_FIELDS.filter(function (k) { return filled[k]; }).length;
    var o = OPT_FIELDS.filter(function (k) { return filled[k]; }).length;
    var pct = 50 * r / REQ_FIELDS.length + 50 * o / OPT_FIELDS.length;
    return { pct: Math.round(pct), req: r, reqTotal: REQ_FIELDS.length, opt: o, optTotal: OPT_FIELDS.length };
  }

  /* ================= тексты согласия и данных (L6) ================= */
  var CONSENT_TEXT = {
    scan: 'Я разрешаю экспонентам при сканировании моего QR-кода видеть поля профиля уровней «Все участники» и «Экспоненты и спикеры по согласию», а поля уровня «Те, с кем у меня встреча» — если у меня есть встреча с их компанией. Поля уровня «Только вы» не передаются никогда. Без согласия экспонент видит только имя и компанию.',
    /* решение ведущего (D-44, Д-13): дословный текст для участника; тот же текст читает A4 (S1) */
    club: 'Передавать мои данные клубу «Атланты»: профиль (имя, компания, отрасль, цели и запрос) и итоги фестиваля. Контакты других людей не передаются. Согласие необязательное, можно отозвать в любой момент.',
    ver: 'редакция от 15.11.2026'
  };
  var EXPORT_PARTS = [
    'Профиль и уровни видимости полей', 'Цели, запросы и история изменений', 'Заметки', 'Контакты и договорённости',
    'Итоги встреч и оценки сессий', 'Журнал согласий'
  ];
  var DELETE_EFFECTS = [
    'Билет, записи на сессии и встречи будут отменены.',
    'Профиль исчезнет из каталога, подсказок и умной строки.',
    'Заметки и итоги будут удалены без возможности восстановления после исполнения запроса.',
    'Пока запрос не исполнен, его можно отменить в этом разделе.'
  ];
  /* Посмотреть глазами: кто и какие поля видит (FR-LEAD-08, AC-LEAD-06) */
  var VIS_AUDIENCES = [
    { id: 'any', label: 'Любой участник', note: 'Видит поля уровня «Все участники».' },
    { id: 'meet', label: 'С кем у меня встреча', note: 'Видит поля уровней «Все участники» и «Те, с кем у меня встреча».' },
    { id: 'scan', label: 'Экспонент при сканировании', note: 'Видит поля «Все участники» и «Экспоненты и спикеры по согласию», если согласие выдано.' }
  ];

  /* ================= рабочее состояние профиля демо =================
     Общее для L5–L8 и M1–M6: живёт, пока открыта страница. КОПИЙ НЕТ: PS.val, PS.request, PS.requestTask, PS.justMeet, PS.horizon,
     PS.main — живые обращения к FIX.ME (геттеры/сеттеры); запись из A8–A10 (PS.set, присваивание PS.goals/PS.request…)
     и из L7/L8 попадает в ME сразу, а компания co00 (FIX.COMPANIES) читает те же поля ME. Видимость — FIX.ME.visibility. */
  var ME = FIX.ME;
  if (ME.horizon == null) { ME.horizon = 60; }
  var stampMin = 10;
  function nowStamp() {
    stampMin += 1;
    var m = 11 * 60 + stampMin, h = Math.floor(m / 60), mm = m % 60;
    return '27.02.2027, ' + h + ':' + (mm < 10 ? '0' : '') + mm;
  }
  function clone(o) { return JSON.parse(JSON.stringify(o)); }
  function domainOf(code) {
    var list = (FIX.TAXO && FIX.TAXO.DOMAINS) || [];
    for (var i = 0; i < list.length; i++) { if (list[i].code === code) { return list[i]; } }
    return null;
  }

  var PS = {
    consents: { pd: true, profile: true, scan: true, notify: true, club: false },
    consentLog: [
      { time: '12.02.2027, 18:40', title: 'Обработка персональных данных', to: 'дано', ver: 'редакция от 15.11.2026' },
      { time: '12.02.2027, 18:40', title: 'Показывать профиль другим участникам', to: 'дано', ver: 'редакция от 15.11.2026' },
      { time: '12.02.2027, 18:40', title: 'Передавать контакты экспонентам при сканировании', to: 'дано', ver: 'редакция от 15.11.2026' },
      { time: '12.02.2027, 18:41', title: 'Уведомления', to: 'дано', ver: 'редакция от 15.11.2026' }
    ],
    exportReq: null, deleteReq: null,
    history: clone(GOALS_HISTORY).reverse(),
    family: clone(FAMILY_DB),
    notes: clone(MY_NOTES),
    declared: {},   /* поля, которые участник ввёл сам (A12): family, kids; они не из билета и показываются без подтверждения по именам */
    agDone: {}, rdDone: {}, rdRemind: {}, post: {}, videos: {}, festSub: false
  };

  /* ---- значения полей профиля: живое чтение ME ---- */
  var VAL_IDS = ['name', 'company', 'site', 'industry', 'revenue', 'communities', 'hobby', 'sport', 'usefulness', 'instagram', 'telegram', 'family', 'kids'];
  var val = {};
  function defVal(id) {
    Object.defineProperty(val, id, {
      enumerable: true, configurable: true,
      get: function () {
        if (id === 'communities') { return (ME.communities && ME.communities.length) ? ME.communities : ['Не состою']; }
        return ME[id];
      },
      set: function (v) { ME[id] = v; syncPerson(); }
    });
  }
  VAL_IDS.forEach(defVal);
  Object.defineProperty(PS, 'val', { enumerable: true, get: function () { return val; } });

  /* запрос, цели, срок — поля ME (читают B1, F1, F6, N8…) */
  function defMe(prop, meKey, norm) {
    Object.defineProperty(PS, prop, {
      enumerable: true, configurable: true,
      get: function () { return norm ? norm(ME[meKey]) : ME[meKey]; },
      set: function (v) { ME[meKey] = v; }
    });
  }
  defMe('request', 'request');
  defMe('requestTask', 'requestTask');
  defMe('justMeet', 'justMeet', function (v) { return !!v; });
  defMe('horizon', 'horizon', function (v) { return v || 60; });
  defMe('main', 'mainDomain');
  var goalsList = (ME.domains || []).map(function (c) { return { code: c, note: GOAL_NOTES[c] || '' }; });
  Object.defineProperty(PS, 'goals', {
    enumerable: true, configurable: true,
    get: function () { return goalsList; },
    set: function (v) { goalsList = v; PS.syncMe(); }
  });
  /* после любой правки списка целей: ME.domains и главная цель (главная всегда среди целей) */
  PS.syncMe = function () {
    ME.domains = goalsList.map(function (g) { return g.code; });
    if (goalsList.length && !goalsList.some(function (g) { return g.code === ME.mainDomain; })) { ME.mainDomain = goalsList[0].code; }
  };

  /* ---- компания участника co00 читает ME живьём (название, сайт, отрасль, оборот), оборот открыт при уровне «Все участники» ---- */
  (function liveCompany() {
    var c = FIX.company && FIX.company('co00');
    if (!c) { return; }
    [['name', 'company'], ['site', 'site'], ['industry', 'industry'], ['revenue', 'revenue']].forEach(function (m) {
      Object.defineProperty(c, m[0], { enumerable: true, configurable: true,
        get: function () { return ME[m[1]] || ''; }, set: function (v) { ME[m[1]] = v; } });
    });
    Object.defineProperty(c, 'revenueOpen', { enumerable: true, configurable: true,
      get: function () { return (ME.visibility && ME.visibility.revenue) === 'all'; }, set: function () {} });
  })();
  /* запись демо-участника в FIX.PEOPLE, если она есть (id 'me', 'p00' или признак isMe): только существующие поля */
  function syncPerson() {
    var list = FIX.PEOPLE || [];
    for (var i = 0; i < list.length; i++) {
      var p = list[i];
      if (p.id === 'me' || p.id === 'p00' || p.isMe) {
        ['name', 'company', 'industry', 'site', 'hobby', 'sport', 'usefulness', 'instagram', 'telegram'].forEach(function (k) {
          if (k in p) { p[k] = ME[k]; }
        });
        return;
      }
    }
  }

  PS.stamp = nowStamp;
  PS.domain = domainOf;
  PS.fields = function () { return FIX.TAXO.PROFILE_FIELDS; };
  PS.vis = function (id) { return (ME.visibility && ME.visibility[id]) || 'only_me'; };
  PS.setVis = function (id, level) { ME.visibility[id] = level; };
  /* запись значения поля: PS.val (а значит ME) и согласованные чужие данные (co00 читает ME сам, PEOPLE — по записи демо-участника) */
  PS.set = function (id, v) {
    if (!Object.prototype.hasOwnProperty.call(val, id)) { defVal(id); }
    ME[id] = v;
    if (id === 'family' || id === 'kids') { PS.declared[id] = true; }
    /* участник сам указал «Нет» детей (A12): детей из билета ждать подтверждения не нужно, они отклонены (в L5 можно вернуть) */
    if (id === 'kids' && /^нет$/i.test(String(v).trim())) {
      PS.family.kids.forEach(function (k) { if (k.state === 'ticket') { k.state = 'rejected'; } });
    }
    syncPerson();
  };
  PS.log = function (what, from, to) {
    PS.history.unshift({ id: 'gh' + (PS.history.length + 1) + 'x', time: nowStamp(), what: what, from: from, to: to });
  };
  PS.goalTitle = function (code) { var d = domainOf(code); return d ? d.title : code; };
  PS.goalsLine = function () {
    return PS.goals.map(function (g) { return PS.goalTitle(g.code) + (g.code === PS.main ? ' (главная)' : ''); }).join('; ');
  };

  /* ---- видимость профиля: единый предикат и «кто что видит» (для F1, F7, F12, H9, H10, J2, Z2 и др.) ----
     profileVisible — выдано согласие «Показывать профиль» (D-47, AC-AUTH-04): иначе человека нет в каталоге, подсказках,
     умной строке и поиске, а компания и продукты не помечаются «(вы)».
     canSee(aud, id): aud 'any' (любой участник), 'meet' (участник со встречей), 'scan' (экспонент при сканировании). */
  PS.profileVisible = function () { return PS.consents.profile !== false; };
  PS.canSee = function (aud, id) {
    var v = PS.vis(id);
    if (aud === 'scan') { return PS.consents.scan ? (v === 'all' || v === 'partners') : (id === 'name' || id === 'company'); }
    if (!PS.profileVisible()) { return false; }
    return aud === 'any' ? v === 'all' : (v === 'all' || v === 'meeting');
  };
  PS.visibleFields = function (aud) {
    return PS.fields().filter(function (f) { return PS.canSee(aud, f.id) && PS.display(f.id); });
  };

  PS.confirmedKids = function () {
    return PS.family.kids.filter(function (k) { return k.state === 'confirmed' || k.state === 'added'; });
  };
  PS.kidsLabel = function () {
    var n = PS.confirmedKids().length;
    return n === 0 ? 'Нет' : n === 1 ? '1 ребёнок' : n === 2 ? '2 ребёнка' : '3+ детей';
  };
  /* сколько позиций из билета ждут подтверждения */
  PS.pending = function () {
    var f = PS.family, n = 0;
    if (f.marital && f.marital.state === 'ticket') { n++; }
    if (f.companion && f.companion.state === 'ticket') { n++; }
    f.kids.forEach(function (k) { if (k.state === 'ticket') { n++; } });
    return n;
  };
  PS.maritalOk = function () { var m = PS.family.marital; return !!m && (m.state === 'confirmed' || m.state === 'added'); };
  PS.requestLine = function () { return PS.justMeet ? 'Просто знакомиться' : PS.request; };
  /* значение поля для показа; null — поле не заполнено или не подтверждено */
  PS.display = function (id) {
    var v = PS.val;
    switch (id) {
      case 'communities': return v.communities.length ? v.communities.join(', ') : null;
      case 'request': return PS.requestLine() || null;
      case 'goals': return PS.goals.length ? PS.goals.map(function (g) { return PS.goalTitle(g.code); }).join('; ') : null;
      case 'family': return PS.maritalOk() ? PS.family.marital.value : null;
      case 'kids':
        if (PS.confirmedKids().length) { return PS.kidsLabel(); }
        if (PS.declared.kids && ME.kids) { return ME.kids; }
        return PS.family.kids.every(function (k) { return k.state !== 'ticket'; }) ? PS.kidsLabel() : null;
      default: return v[id] || null;
    }
  };
  PS.filled = function () {
    var f = {}, all = PS.fields();
    all.forEach(function (fl) { f[fl.id] = !!PS.display(fl.id); });
    return f;
  };
  /* единственный расчёт заполненности профиля (FR-PROF-13): L0, L7, A12, B1/pre */
  PS.fill = function () { return profileFill(PS.filled()); };

  /* ---- согласия ---- */
  /* дата выдачи у согласия (FIX.CONSENTS[i].given): выдача пишет сегодняшнюю дату демо, отзыв очищает */
  PS.grant = function (id, on) {
    var c = null;
    CONSENTS.forEach(function (x) { if (x.id === id) { c = x; } });
    PS.consents[id] = !!on;
    if (c && id !== 'pd') { c.given = on ? '27.02.2027' : null; }
  };

  /* ---- напоминания M6: состояние по контакту F8 (id c1…) ----
     Дата берётся из F8 (PPL.CONTACTS[i].remind, «написать 04.03»); выбор срока 3, 7 или 30 дней считает дату от дня знакомства. */
  PS.postState = function (c) {
    var s = PS.post[c.id];
    if (!s) {
      var m = /(\d\d\.\d\d)/.exec(c.remind || '');
      s = PS.post[c.id] = { days: null, on: !!m, date: m ? m[1] : '', written: false };
    }
    return s;
  };
  PS.remindDate = function (c) { var s = PS.postState(c); return s.on ? s.date : ''; };
  PS.addDays = addDays;
  PS.contactNotes = contactNotes;
  PS.postContacts = postContacts;
  PS.offers = DRAFT_OFFERS;
  /* согласие выдано сейчас (id) — для L6 и других читателей */
  PS.consent = function (id) { return !!PS.consents[id]; };
  PS.remindOn = function (it) { var r = PS.rdRemind[it.id]; return r === undefined ? !!it.remind : !!r; };
  PS.roadmapTips = roadmapTips;
  /* короткая подпись запроса для чужих экранов («ваш запрос: …»): тема задачи, иначе начало текста; пусто при «Просто знакомиться» */
  PS.requestLabel = function () {
    if (PS.justMeet) { return ''; }
    if (PS.requestTask) { return PS.requestTask; }
    var t = String(PS.request || '').trim();
    return t.length > 60 ? t.slice(0, 60).replace(/\s+\S*$/, '') + '…' : t;
  };
  /* живая причина «почему показано» для чужих экранов (B1, F1, F6, F11, карточки людей):
     request — из текущего запроса (PS.requestLabel; при «Просто знакомиться» причина скрывается),
     goal — по коду цели w.goal, если она ещё есть в профиле (иначе причина скрывается),
     detail — уточнение из данных («ищет партнёров по логистике»); overlap/onsite/self — текст как в данных. */
  PS.whyText = function (w) {
    if (!w) { return ''; }
    var det = w.detail;
    if (det === undefined && w.text) { var ci = w.text.indexOf(', '); if (ci >= 0) { det = w.text.slice(ci + 2); } }
    det = det ? ', ' + det : '';
    if (w.kind === 'request') {
      var lbl = PS.requestLabel();
      return lbl ? 'ваш запрос: ' + lbl + det : '';
    }
    if (w.kind === 'goal') {
      if (w.goal) {
        var has = PS.goals.some(function (g) { return g.code === w.goal; });
        return has ? 'ваша цель: ' + PS.goalTitle(w.goal) + det : '';
      }
      return w.text || '';
    }
    return w.text || '';
  };

  Object.assign(FIX, {
    /* единый словарь согласий для экранов (контракт design/06_UX_CONTRACTS.md §4):
       consent — записи CONSENTS (title/sub/ver/given/link), text — развёрнутые тексты CONSENT_TEXT */
    COPY: { consent: CONSENTS, text: CONSENT_TEXT },
    CONSENT_TEXT: CONSENT_TEXT, EXPORT_PARTS: EXPORT_PARTS, DELETE_EFFECTS: DELETE_EFFECTS, VIS_AUDIENCES: VIS_AUDIENCES, PS: PS,
    VIS_INFO: VIS_INFO, PROFILE_HELP: PROFILE_HELP, CONSENTS: CONSENTS,
    GOAL_NOTES: GOAL_NOTES, GOALS_HISTORY: GOALS_HISTORY,
    FAMILY_DB: FAMILY_DB, MY_NOTES: MY_NOTES,
    MY_RESULTS: MY_RESULTS, ROADMAP: ROADMAP, NEXT_FEST: NEXT_FEST,
    ACCESS_UNTIL: ACCESS_UNTIL, RESULTS_NOW: NOW_STAMP, RESULTS_END: END_STAMP,
    VIDEOS: VIDEOS, TOUR: TOUR, CODEX: CODEX, FAQ: FAQ,
    PROFILE_REQ_FIELDS: REQ_FIELDS, PROFILE_OPT_FIELDS: OPT_FIELDS, profileFill: profileFill
  });
  /* контакты после события = «Мои контакты» (F8), живой список; FIX.ROADMAP_TIPS — подсказки «Куда ещё сходить» из профиля */
  Object.defineProperty(FIX, 'POST_CONTACTS', { enumerable: true, configurable: true, get: postContacts });
})();
