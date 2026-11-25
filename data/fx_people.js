/* Дополнения людей и подборок. Владелец S5. Расширяет window.FIX (Object.assign). Схемы — design/04_REBUILD_V3.md, часть 5. */
/* Наполнение S5 (экраны F1…F12, G1…G11).
   Подключается после fixtures.js и fx_shared.js. Существующих полей и идентификаторов не меняет, только добавляет:
   — шесть людей p19…p24 с компаниями co19…co24 и продуктами pr25…pr30 (в добавок к p01…p18: подборка по запросу
     должна давать 5–8 людей, на 18 человек отрасль «Строительство и недвижимость» даёт одного);
   — расширение профилей людей (PPL.EXT): хобби, спорт, польза, запрос, контакты и уровни видимости по D-47;
   — мои встречи (MEETS), встречное время (COUNTER), договорённости, предложение окна и стола, нетворкинг-зона B2B;
   — справочник умной строки и подборок (PPL.parseAsk / PPL.runAsk), изменяемое состояние сессии (PPL.store).
   Все люди и компании вымышленные; Telegram и Instagram — демонстрационные псевдонимы, контактов нет. */
(function () {
  'use strict';
  var FIX = window.FIX;
  if (!FIX || !FIX.PEOPLE || !FIX.COMPANIES || !FIX.PRODUCTS || !FIX.TAXO) {
    throw new Error('fx_people.js: сначала подключите data/fixtures.js и data/fx_shared.js');
  }

  /* ================= новые люди, компании, продукты (добавление записей) ================= */

  var NEW_PEOPLE = [
    { id: 'p19', name: 'Андрей Крутов', company: 'Опора Девелопмент', role: 'Генеральный директор', industry: 'строительство', tariff: 'Первый класс', goal: 'инвестирую', use: 'Ищет проекты складской и коммерческой недвижимости', free: '3 из 4', edu: 'Строительный университет' },
    { id: 'p20', name: 'Вера Лукина', company: 'СК «Фундамент Юг»', role: 'Директор по развитию', industry: 'строительство', tariff: 'Бизнес', goal: 'ищу партнёра', use: 'Ищет подрядчиков по инженерным сетям и поставщиков бетона', free: '2 из 4', edu: 'Строительный институт' },
    { id: 'p21', name: 'Степан Рогов', company: 'Парус Девелопмент', role: 'Основатель', industry: 'строительство', tariff: 'Бизнес', goal: 'продаю', use: 'Продаёт коммерческую недвижимость и подбирает участки', free: '1 из 4', edu: 'РЭУ' },
    { id: 'p22', name: 'Нина Пестова', company: 'Отделка Про', role: 'Владелица', industry: 'строительство', tariff: 'Оптимум', goal: 'ищу решения', use: 'Ищет поставщиков отделочных материалов', free: '0 из 2', edu: '—' },
    { id: 'p23', name: 'Тимофей Басов', company: 'Магистраль Групп', role: 'Основатель', industry: 'логистика', tariff: 'Первый класс', goal: 'инвестиции', use: 'Выходит на международные рынки: коридор Китай и Россия', free: '3 из 4', edu: 'МАДИ' },
    { id: 'p24', name: 'Алла Верещагина', company: 'Донское масло', role: 'Генеральный директор', industry: 'производство', tariff: 'Первый класс', goal: 'продаю', use: 'Продаёт масло за рубеж, ищет логистов', free: '2 из 4', edu: 'Аграрный университет' }
  ];

  var NEW_COMPANIES = [
    { id: 'co19', ownerId: 'p19', name: 'Опора Девелопмент', industry: 'Строительство и недвижимость', revenue: 'более 1 млрд', revenueOpen: true, site: 'example-opora.ru',
      desc: 'Девелопер складской и коммерческой недвижимости на юге и в центре. Строим под аренду и под продажу.', productIds: ['pr25'] },
    { id: 'co20', ownerId: 'p20', name: 'СК «Фундамент Юг»', industry: 'Строительство и недвижимость', revenue: '200–500 млн', revenueOpen: false, site: 'example-fundament-yug.ru',
      desc: 'Строим склады, цеха и торговые центры на юге: от проекта до сдачи объекта.', productIds: ['pr26'] },
    { id: 'co21', ownerId: 'p21', name: 'Парус Девелопмент', industry: 'Строительство и недвижимость', revenue: '60–200 млн', revenueOpen: false, site: 'example-parus.ru',
      desc: 'Подбираем участки и объекты коммерческой недвижимости под склады, производство и торговлю.', productIds: ['pr27'] },
    { id: 'co22', ownerId: 'p22', name: 'Отделка Про', industry: 'Строительство и недвижимость', revenue: '0–60 млн', revenueOpen: false, site: 'example-otdelka-pro.ru',
      desc: 'Отделка офисов, магазинов и складских помещений под ключ небольшой бригадой.', productIds: ['pr28'] },
    { id: 'co23', ownerId: 'p23', name: 'Магистраль Групп', industry: 'Транспорт и логистика', revenue: 'более 1 млрд', revenueOpen: true, site: 'example-magistral.ru',
      desc: 'Международные и междугородные перевозки: коридор между Китаем и Россией, склады в портах и на границе.', productIds: ['pr29'] },
    { id: 'co24', ownerId: 'p24', name: 'Донское масло', industry: 'Производство', revenue: 'более 1 млрд', revenueOpen: false, site: 'example-donskoe-maslo.ru',
      desc: 'Маслозавод: подсолнечное и рапсовое масло для розницы, общепита и экспорта.', productIds: ['pr30'] }
  ];

  var NEW_PRODUCTS = [
    { id: 'pr25', companyId: 'co19', name: 'Склады и производственные площади в аренду', kind: 'услуга',
      short: 'Сдаём склады класса А в Подмосковье и на юге, договор на пять лет с индексацией.', site: 'example-opora.ru/arenda', task: 'Масштабирование', contactVia: 'заявка' },
    { id: 'pr26', companyId: 'co20', name: 'Каркасные здания под ключ', kind: 'услуга',
      short: 'Быстровозводимые склады и цеха из металлического каркаса за четыре–шесть месяцев.', site: 'example-fundament-yug.ru/karkas', task: 'Масштабирование', contactVia: 'заявка' },
    { id: 'pr27', companyId: 'co21', name: 'Подбор участка под склад или производство', kind: 'услуга',
      short: 'Находим участок с коммуникациями и подъездом, проверяем ограничения до сделки.', site: 'example-parus.ru/uchastki', task: 'Масштабирование', contactVia: 'заявка' },
    { id: 'pr28', companyId: 'co22', name: 'Отделка офисов и магазинов', kind: 'услуга',
      short: 'Отделка помещений до 500 квадратных метров за шесть недель, фиксированная смета.', site: 'example-otdelka-pro.ru/otdelka', task: 'Снижение расходов', contactVia: 'заявка' },
    { id: 'pr29', companyId: 'co23', name: 'Перевозки Китай и Россия', kind: 'услуга',
      short: 'Сборные и прямые отправки из Китая с таможенным оформлением и доставкой до склада.', site: 'example-magistral.ru/kitay', task: 'Масштабирование', contactVia: 'заявка' },
    { id: 'pr30', companyId: 'co24', name: 'Подсолнечное масло, экспортные партии', kind: 'продукт',
      short: 'Нерафинированное и рафинированное масло от 20 тонн, сертификаты для экспорта.', site: 'example-donskoe-maslo.ru/eksport', task: 'Рост продаж', contactVia: 'заявка' }
  ];

  NEW_PEOPLE.forEach(function (p) { FIX.PEOPLE.push(p); });
  NEW_COMPANIES.forEach(function (c) { FIX.COMPANIES.push(c); });
  NEW_PRODUCTS.forEach(function (p) { FIX.PRODUCTS.push(p); });

  /* ================= расширение профилей (D-45, D-47) =================
     vis: уровень видимости по полю. all — «Все участники»; meeting — «Те, с кем у меня встреча»;
     partners — «Экспоненты и спикеры по согласию»; only_me — «Только вы».
     По умолчанию (design/04, часть 5.3): хобби, спорт, польза, сообщества, сайт, отрасль — all;
     запрос, Instagram, Telegram — meeting; оборот, цели, семья, дети — only_me.
     why — причина показа (design/05, раздел 6): строка из структурированных данных, без оценок;
     avail — окна, в которые человек готов встретиться сегодня (число равно N из «N из M» в поле free). */
  var VIS0 = { hobby: 'all', sport: 'all', usefulness: 'all', communities: 'all', request: 'meeting', instagram: 'meeting', telegram: 'meeting',
    goals: 'only_me', family: 'only_me', kids: 'only_me' };

  function ext(o) {
    var vis = Object.assign({}, VIS0, o.vis || {});
    return Object.assign({ communities: ['Не состою'], instagram: '', telegram: '', avail: [] }, o, { vis: vis });
  }

  var EXT = {
    p01: ext({ hobby: 'Рыбалка и походы на выходных', sport: 'Теннис',
      usefulness: 'Опыт вывода продуктов на международные рынки и работы с федеральными сетями',
      request: 'Ищем партнёров по дистрибуции и логистике на юге', communities: ['Клуб «Атланты»'],
      instagram: '@asokolova.demo', telegram: '@asokolova_demo',
      why: { kind: 'request', text: 'ваш запрос: Масштабирование, ищет партнёров по логистике' }, avail: ['12:30', '15:30'] }),
    p02: ext({ hobby: 'Коллекционирует винил, ходит на джазовые вечера', sport: 'Плавание',
      usefulness: 'Знаю, как проходят закупки в розничных сетях и что нужно поставщику для первой партии',
      request: 'Ищу поставщиков упаковки и логистики для региональных магазинов',
      instagram: '@davramov.demo', telegram: '@davramov_demo',
      why: { kind: 'goal', goal: 'G6', detail: 'приглашённый покупатель', text: 'ваша цель: Окружение; приглашённый покупатель' },
      avail: ['11:30', '12:00', '12:30', '13:30', '15:00', '15:30', '16:30', '17:00'] }),
    p03: ext({ hobby: 'Керамика и настольные игры', sport: 'Йога',
      usefulness: 'Делаем сайты и кабинеты для B2B и умеем объяснять разработку языком собственника',
      request: 'Хочу автоматизировать клиентский сервис в логистике и торговле', communities: ['Клуб «Атланты»'],
      instagram: '@kedr.studio.demo', telegram: '@mkrylova_demo',
      why: { kind: 'overlap', text: 'общее: встреча 26.02, вы обсуждали клиентский кабинет' }, avail: ['15:00'] }),
    p04: ext({ hobby: 'Шахматы', sport: 'Бег',
      usefulness: 'Разбираю воронку продаж: где теряются заявки и что исправить за квартал',
      request: 'Ищу экспертов по продажам для клиентов', vis: { sport: 'only_me' },
      instagram: '@pgusev.demo', telegram: '@pgusev_demo',
      why: { kind: 'request', text: 'ваш запрос: Масштабирование, аудит отдела продаж' }, avail: [] }),
    p05: ext({ hobby: 'Огород и консервирование', sport: 'Горные лыжи',
      usefulness: 'Опыт выхода на экспорт плодоовощной продукции в страны ЕАЭС и работы с переработчиками',
      request: 'Ищу партнёра для расширения переработки', communities: ['Клуб «Атланты»'],
      instagram: '@omartynova.demo', telegram: '@omartynova_demo',
      why: { kind: 'goal', goal: 'G2', text: 'ваша цель: Вырасти и масштабировать бизнес' }, avail: ['12:30', '15:30', '17:00'] }),
    p06: ext({ hobby: 'Парусный спорт', sport: 'Горные лыжи', vis: { hobby: 'partners' },
      usefulness: 'Организую корпоративные медицинские программы для компаний с филиалами',
      request: 'Ищу партнёров среди клиник и страховых', instagram: '@slapin.demo', telegram: '@slapin_demo',
      why: { kind: 'overlap', text: 'общее: горные лыжи' }, avail: ['11:30', '13:30', '15:00', '16:30'] }),
    p07: ext({ hobby: 'Путешествия на машине с детьми', sport: 'Плавание',
      usefulness: 'Умею выстраивать единую запись и учёт в сети филиалов',
      request: 'Ищу CRM и систему записи для двенадцати филиалов', instagram: '@vzaytseva.demo', telegram: '@vzaytseva_demo',
      why: { kind: 'overlap', text: 'общее: путешествия на машине' }, avail: [] }),
    p08: ext({ hobby: 'Рыбалка', sport: 'Хоккей',
      usefulness: 'Поставляю складское оборудование и подскажу, как расставить стеллажи под ваш товар',
      request: 'Ищу дилеров в регионах', instagram: '@isavelyev.demo', telegram: '@isavelyev_demo',
      why: { kind: 'request', text: 'ваш запрос: Масштабирование, стеллажи для новых складов' }, avail: ['12:00', '15:00'] }),
    p09: ext({ hobby: 'Садовый дизайн', sport: 'Пилатес', vis: { hobby: 'only_me' },
      usefulness: 'Подбираю руководителей среднего звена и оцениваю команды',
      request: 'Ищу компании, которым нужен подбор руководителей', instagram: '@nburova.demo', telegram: '@nburova_demo',
      why: { kind: 'goal', goal: 'G6', text: 'ваша цель: Окружение: партнёры, клиенты, связи' }, avail: ['11:30', '13:30', '16:30'] }),
    p10: ext({ hobby: 'Квадрокоптеры и фотография', sport: 'Бег по утрам',
      usefulness: 'Делаю карты состояния полей и помогаю тратить меньше удобрений',
      request: 'Смотрю агротех-проекты для инвестиций', instagram: '@achayka.demo', telegram: '@achayka_demo',
      why: { kind: 'overlap', text: 'общее: бег по утрам' }, avail: ['16:30'] }),
    p11: ext({ hobby: 'Рукоделие и настольные игры', sport: 'Скандинавская ходьба',
      usefulness: 'Расскажу, как устроена мелкая розница и что болит у магазина',
      request: 'Ищу учёт для магазина и склада', instagram: '@eshtern.demo', telegram: '@eshtern_demo',
      why: { kind: 'overlap', text: 'общее: настольные игры' }, avail: [] }),
    p12: ext({ hobby: 'Горные походы', sport: 'Горные лыжи',
      usefulness: 'Строим склады под ключ и знаем, из чего складывается срок и стоимость',
      request: 'Ищу субподрядчиков по инженерным сетям и перевозчиков стройматериалов', communities: ['Клуб «Атланты»'],
      instagram: '@morlov.demo', telegram: '@morlov_demo',
      why: { kind: 'request', text: 'ваш запрос: Масштабирование, строит склады под ключ' }, avail: ['11:30', '12:30', '15:30', '17:00'] }),
    p13: ext({ hobby: 'Кофе и выпечка', sport: 'Йога', vis: { telegram: 'all' },
      usefulness: 'Знаю, как открыть кофейню и посчитать роялти по франшизе',
      request: 'Думаю о франшизе и ищу поставщиков', instagram: '@yfadeeva.demo', telegram: '@yfadeeva_demo',
      why: { kind: 'overlap', text: 'общее: вы идёте на встречу участников 27.02 в 18:15' }, avail: ['12:30'] }),
    p14: ext({ hobby: 'Автопутешествия по югу', sport: 'Футбол', vis: { instagram: 'only_me' },
      usefulness: 'Перевожу грузы по югу России и сдаю в аренду складскую технику',
      request: 'Ищу инвестора в автопарк', instagram: '@dvoronov.demo', telegram: '@dvoronov_demo',
      why: { kind: 'request', text: 'ваш запрос: Масштабирование, перевозки по югу' }, avail: ['13:30', '16:30'] }),
    p15: ext({ hobby: 'Театр и стендап', sport: 'Бег по утрам',
      usefulness: 'Помогаю рассказать о компании так, чтобы её запомнили',
      request: 'Ищу клиентов среди участников фестиваля', instagram: '@klobova.demo', telegram: '@klobova_demo',
      why: { kind: 'overlap', text: 'общее: бег по утрам, оба идёте на пробежку 28.02' }, avail: ['12:00', '15:00', '17:00'] }),
    p16: ext({ hobby: 'Горные лыжи и сноуборд', sport: 'Бег и горные лыжи',
      usefulness: 'Организую корпоративный спорт для команд',
      request: 'Ищу мобильное приложение для клуба', instagram: '@rgladkov.demo', telegram: '@rgladkov_demo',
      why: { kind: 'overlap', text: 'общее: бег и горные лыжи' }, avail: [] }),
    p17: ext({ hobby: 'Настольные игры и иллюстрация', sport: 'Плавание',
      usefulness: 'Делаю фирменный стиль и упаковку, которые видно на полке',
      request: 'Ищу клиентов и коллаборации', instagram: '@smiller.demo', telegram: '@smiller_demo',
      why: { kind: 'overlap', text: 'общее: настольные игры' }, avail: ['13:30', '16:30'] }),
    p18: ext({ hobby: 'Путешествия на машине', sport: 'Хоккей',
      usefulness: 'Подберу упаковку из переработанного картона под ваш товар и экспорт',
      request: 'Ищу производителей, которым нужна упаковка', instagram: '@gtarasov.demo', telegram: '@gtarasov_demo',
      why: { kind: 'request', text: 'ваш запрос: Масштабирование, упаковка для регионов' }, avail: ['15:30'] }),
    p19: ext({ hobby: 'Яхтинг', sport: 'Гольф',
      usefulness: 'Знаю, как выбрать площадку под склад и договориться с банком о проектном финансировании',
      request: 'Ищу проекты складской и коммерческой недвижимости', communities: ['Клуб «Атланты»'],
      instagram: '@akrutov.demo', telegram: '@akrutov_demo',
      why: { kind: 'request', text: 'ваш запрос: Масштабирование, сдаёт склады на юге' }, avail: ['11:30', '13:30', '16:30'] }),
    p20: ext({ hobby: 'Садоводство', sport: 'Велосипед',
      usefulness: 'Подскажу, как заложить в смету запас и не сорвать срок',
      request: 'Ищу подрядчиков по инженерным сетям', instagram: '@vlukina.demo', telegram: '@vlukina_demo',
      why: { kind: 'request', text: 'ваш запрос: Масштабирование, каркасные склады под ключ' }, avail: ['12:00', '15:30'] }),
    p21: ext({ hobby: 'Картинг', sport: 'Тренажёрный зал',
      usefulness: 'Помогаю проверить участок: коммуникации, подъезд и ограничения',
      request: 'Ищу покупателей коммерческой недвижимости', instagram: '@srogov.demo', telegram: '@srogov_demo',
      why: { kind: 'request', text: 'ваш запрос: Масштабирование, подбирает участки под склады' }, avail: ['17:00'] }),
    p22: ext({ hobby: 'Пэчворк', sport: 'Скандинавская ходьба',
      usefulness: 'Расскажу, как принять работу у подрядчика и что проверить до акта',
      request: 'Ищу поставщиков отделочных материалов', instagram: '@npestova.demo', telegram: '@npestova_demo',
      why: { kind: 'goal', goal: 'G6', text: 'ваша цель: Окружение: партнёры, клиенты, связи' }, avail: [] }),
    p23: ext({ hobby: 'Хождение под парусом', sport: 'Бег',
      usefulness: 'Опыт выхода на международные рынки и таможенного оформления небольших грузов',
      request: 'Ищу инвестора в склады на границе', communities: ['Клуб «Атланты»'],
      instagram: '@tbasov.demo', telegram: '@tbasov_demo',
      why: { kind: 'request', text: 'ваш запрос: Масштабирование, международные перевозки' }, avail: ['12:00', '13:30', '17:00'] }),
    p24: ext({ hobby: 'Конный спорт', sport: 'Верховая езда',
      usefulness: 'Опыт экспорта продуктов питания в Казахстан и Китай и работы с сертификацией',
      request: 'Ищу логистов для экспортных партий', instagram: '@averesh.demo', telegram: '@averesh_demo',
      why: { kind: 'goal', goal: 'G6', text: 'ваша цель: Окружение: партнёры, клиенты, связи' }, avail: ['11:30', '15:00'] })
  };

  /* Цели (D-45, D-47): по умолчанию «Только вы». Эти люди сами открыли цель всем участникам, только у них
     цель видна в карточке, в фильтре «Цель» на F1 и в подборке по запросу; у остальных цель не показывается нигде. */
  var GOALS_OPEN = ['p01', 'p02', 'p05', 'p06', 'p08', 'p10', 'p12', 'p14', 'p19', 'p20', 'p23', 'p24'];
  GOALS_OPEN.forEach(function (id) { EXT[id].vis.goals = 'all'; });

  /* Окна на завтра (28.02): ближайшие свободные окна, когда все сегодняшние пересекаются с «Мой путь». Те, у кого нет окон
     сегодня (p04, p07, p11, p16, p22), не принимают встречи и завтра. Данные демонстрационные. */
  var AVAIL2 = {
    p01: ['11:30', '13:00', '15:30'], p02: ['11:30', '12:30', '14:00', '15:00', '16:30', '17:00'], p03: ['13:30', '16:00'],
    p05: ['11:30', '14:30', '16:00'], p06: ['12:00', '14:00', '15:30', '17:00'], p08: ['12:30', '15:00'],
    p09: ['11:30', '14:30', '16:30'], p10: ['13:00', '16:00'], p12: ['11:30', '13:30', '15:00', '16:30'],
    p13: ['12:00', '15:30'], p14: ['12:30', '14:00', '16:30'], p15: ['11:30', '14:30', '17:00'],
    p17: ['13:00', '15:30'], p18: ['12:00', '14:30'], p19: ['12:30', '15:00', '17:00'], p20: ['11:30', '14:00', '16:00'],
    p21: ['13:30', '16:30'], p23: ['12:30', '14:30', '16:00'], p24: ['12:00', '13:30', '16:30']
  };
  Object.keys(EXT).forEach(function (id) { EXT[id].avail2 = AVAIL2[id] || []; });

  /* Состоявшиеся встречи с владельцем демо: по ним открывается уровень «Те, с кем у меня встреча» (FR-PROF-08).
     Здесь только исходные (до начала сеанса); дальше уровень открывают подтверждённые встречи (G4, G5) и принятые заявки (F4):
     см. met(pid) ниже, она читает живое состояние. */
  var MET = {
    p03: 'у вас была встреча 26.02, стенд А-12 · Экспо',
    p14: 'у вас была встреча 26.02, вечерний нетворкинг'
  };

  /* ================= окна, нетворкинг-зона B2B, пространства ================= */

  var WIN = FIX.windows.map(function (w) { return w.label; });        /* 11:30 … 17:00, шаг 30 минут */
  var NET = {
    id: 'ms-network', name: 'Нетворкинг-зона B2B', tables: 24, cap: 2,
    place: 'место уточняется по планировке Экспо',
    note: 'Столы с номерами 1–24 демонстрационные: вместимость, место и оформление зоны уточняются по планировке Экспо.'
  };
  /* Дни, на которые можно назначить встречу: сегодня (27.02) и завтра (28.02). Окна нетворкинг-зоны B2B одни и те же,
     раскладка столов по дням разная. */
  var DAYS = ['27.02', '28.02'];
  var DAY_WORD = { '27.02': 'сегодня', '28.02': 'завтра' };
  var DAY_LONG = { '25.02': '25 февраля, четверг', '26.02': '26 февраля, пятница', '27.02': '27 февраля, суббота', '28.02': '28 февраля, воскресенье' };
  function dayWord(d) { return DAY_WORD[d] || d; }
  function dayLong(d) { return DAY_LONG[d] || (String(d).slice(0, 2).replace(/^0/, '') + ' февраля'); }
  function dayDate(d) { return String(d).slice(0, 2).replace(/^0/, '') + ' февраля'; }
  function dayIdx(d) { var i = DAYS.indexOf(d); return i < 0 ? 0 : i; }
  /* «сегодня, 12:30» / «завтра, 28.02, 11:30»: подпись дня и времени одной строкой */
  function dayTime(d, t) { return DAY_WORD[d] ? DAY_WORD[d] + (d === '27.02' ? '' : ', ' + d) + ', ' + t : d + ', ' + t; }

  /* столы, занятые в окне wi в день day: детерминированная раскладка; сегодня в пиковое окно 14:30 свободных нет */
  function netBusy(wi, day) {
    var di = dayIdx(day), seed = wi + 12 * di, busy = {};
    for (var n = 1; n <= NET.tables; n++) { if ((seed * 31 + n * 17 + 7) % 10 < 4) { busy[n] = 1; } }
    if (di === 0 && (wi === 1 || wi === 8)) { busy[18] = 1; } else { delete busy[18]; }
    if (di === 0 && wi === 6) { for (var k = 1; k <= NET.tables; k++) { busy[k] = 1; } }
    return busy;
  }
  function netFree(wi, day) {
    var b = netBusy(wi, day || '27.02'), out = [];
    for (var n = 1; n <= NET.tables; n++) { if (!b[n]) { out.push(n); } }
    return out;
  }

  /* Пространства встреч v3: два разных пространства (D-55) плюс прежние. Идентификаторы ms-* как в MEETING_SPACES */
  var SPACES = [
    { id: 'ms-network', name: 'Нетворкинг-зона B2B', short: 'Нетворкинг-зона B2B', type: 'network',
      desc: 'Столы с номерами для встреч участников. Система предлагает окно и стол, вы подтверждаете.',
      place: NET.place, units: NET.tables, cap: NET.cap, access: 'все участники' },
    { id: 'ms-mentor', name: 'Менторская', short: 'Менторская', type: 'mentor',
      desc: 'Рецепция и сервис ментора, окна по 30 минут, столы 1–8. Запись к конкретному ментору в разделе «Менторские».',
      place: 'Магнолия, 9-й этаж', units: 8, cap: 2, access: 'Бизнес и Первый класс' },
    { id: 'ms-deal', name: 'Комнаты сделок', short: 'Комнаты сделок', type: 'deal',
      desc: 'Залы Дойбица и Шоша на 2-м этаже Конгресс-центра, по записи в окнах без сессий программы.',
      place: 'Конгресс-центр, 2-й этаж · Дойбица и Шоша (Экспо)', units: 2, cap: 8, access: 'по заявке' },
    { id: 'ms-expert', name: 'Экспертный стол', short: 'Экспертный стол', type: 'expert',
      desc: 'Столы экспертной гостиной, ведёт спикер.',
      place: 'Соболь, 2-й этаж Экспо', units: 3, cap: 12, access: 'по записи' },
    { id: 'ms-booth', name: 'Стенд экспонента', short: 'Стенд экспонента', type: 'booth',
      desc: 'Встреча у стенда с представителем экспонента.',
      place: 'Экспо', units: 6, cap: 4, access: 'по заявке' },
    { id: 'ms-coffee', name: 'Кофе-точка', short: 'Кофе-точка', type: 'coffee',
      desc: 'Короткий кофе без брони стола.',
      place: 'холл Эдельвейса', units: 2, cap: 2, access: 'свободно' }
  ];

  /* ================= мои встречи (источник правды для G1, G4…G9) =================
     Согласовано с пунктами пути fx_path.js: pi10 (13:00, Михаил Орлов), pi12 (14:00, стенд ТехноСклад),
     pi13 (14:30, Дмитрий Аврамов), pi15 (16:00, менторская Елена Сорока). Пункты со статусом accepted — это
     заявки, которые ждут ответа второй стороны (pending); booked — подтверждены. mt5 — состоявшаяся 26.02. */
  var MEETS = [
    { id: 'mt1', kind: 'coffee', who: { type: 'person', id: 'p12' }, day: '27.02', start: '13:00', dur: 30,
      space: 'Предметный кофе', place: 'Бизнес-лаунж · Магнолия, 9-й этаж', table: null, status: 'pending', source: 'Предметный кофе',
      greeting: 'Михаил, добрый день! Мы строим склады на юге, давайте за кофе обсудим сроки и стоимость.' },
    { id: 'mt2', kind: 'stand', who: { type: 'exhibitor', id: 'ex01', rep: 'Ольга Рябова' }, day: '27.02', start: '14:00', dur: 30,
      space: 'Стенд экспонента', place: 'Экспо · Зона 1 · А-12', table: null, status: 'confirmed', source: 'по заявке',
      greeting: 'Хочу разобрать план нашего склада и понять, с чего начать внедрение.' },
    { id: 'mt4', kind: 'buyer', who: { type: 'person', id: 'p02' }, day: '27.02', start: '14:30', dur: 30,
      space: 'Комнаты сделок', place: 'Дойбица · Конгресс-центр, 2-й этаж', table: null, status: 'pending', source: 'Hosted Buyer',
      greeting: 'Дмитрий, мы строим региональные склады и можем взять на себя доставку для ваших магазинов.' },
    { id: 'mt3', kind: 'mentor', who: { type: 'speaker', key: 'soroka' }, day: '27.02', start: '16:00', dur: 30,
      space: 'Менторская', place: 'Менторская · Магнолия, 9-й этаж · стол 2', table: 2, status: 'confirmed', source: 'менторская',
      greeting: 'Хочу обсудить, как выстроить команду продаж в новом регионе.' },
    { id: 'mt5', kind: 'meet', who: { type: 'person', id: 'p03' }, day: '26.02', start: '15:00', dur: 30,
      space: 'Стенд экспонента', place: 'Экспо · Зона 1 · А-12', table: null, status: 'held', source: 'по заявке', outcome: null,
      greeting: 'Марина, хочу показать нашу задачу по клиентскому кабинету.' }
  ];

  /* Встречное время для G5: Михаил Орлов предложил другое время на 13:00 (mt1) */
  var COUNTER = {
    meetId: 'mt1', who: 'p12', orig: { start: '13:00', place: 'Бизнес-лаунж · Магнолия, 9-й этаж' },
    proposals: [
      { start: '12:30', place: 'Бизнес-лаунж · Магнолия, 9-й этаж', table: null, note: 'окно свободно у вас обоих, до встречи вы успеете выйти из зала' },
      { start: '13:30', place: 'Нетворкинг-зона B2B', table: 18, note: 'после обеда, стол свободен' },
      { start: '15:30', place: 'Нетворкинг-зона B2B', table: 7, note: 'после вашей встречи в 14:30, переход заранее посчитан' }
    ]
  };

  /* Договорённости (G9): initiator me или идентификатор человека; status: wait — ждёт подтверждения второй стороны,
     you — ждёт вашего подтверждения, done — согласовано обеими сторонами. Срок по умолчанию — 3 дня (MEET_OUTCOME.dueInDays). */
  var AGREEMENTS = [
    { id: 'ag1', who: 'p03', meetId: 'mt5', initiator: 'me', step: 'отправить материалы',
      text: 'Пришлю расчёт и пример клиентского кабинета до 28.02', due: 'через 3 дня', status: 'wait' },
    { id: 'ag2', who: 'p14', meetId: null, initiator: 'p14', step: 'созвон после фестиваля',
      text: 'Созвонимся в марте и обсудим совместные рейсы на юг', due: 'через 5 дней', status: 'you' }
  ];

  /* Точки для «Предметного кофе»: допуск по тарифу (D-26 не относится: лаунж Бизнес и Первый класс) */
  var COFFEE_POINTS = [
    { id: 'lounge', name: 'Бизнес-лаунж · Магнолия, 9-й этаж', note: 'для Бизнеса и Первого класса, 12:00–18:00', tariffs: ['Бизнес', 'Первый класс'] },
    { id: 'coffee', name: 'Кофе-точка · холл Эдельвейса', note: 'для всех тарифов', tariffs: ['Оптимум', 'Бизнес', 'Первый класс', 'Спутник'] }
  ];
  var COFFEE_PICKS = ['p05', 'p14', 'p23', 'p01', 'p08', 'p20', 'p15', 'p13', 'p10'];

  /* Контакты (F8): метки — собственные пометки следующего шага (не оценки людей), видны только вам */
  var CONTACT_TAGS = [
    { id: 'write', label: 'Написать' }, { id: 'meet', label: 'Договориться о встрече' },
    { id: 'send', label: 'Отправить материалы' }, { id: 'know', label: 'Просто знакомство' }
  ];
  var CONTACTS = [
    { id: 'c1', pid: 'p03', tag: 'send', note: 'кабинет для клиентов, пришлю расчёт', when: '26.02, стенд А-12 · Экспо', remind: 'написать 04.03' },
    { id: 'c2', pid: 'p14', tag: 'meet', note: 'совместные рейсы на юг, созвон в марте', when: '26.02, вечерний нетворкинг', remind: 'написать 05.03' },
    { id: 'c3', pid: 'p01', tag: 'write', note: 'дистрибуция и логистика на юге', when: '26.02, кейс про маржу', remind: 'написать 04.03' },
    { id: 'c4', pid: 'p04', tag: 'know', note: 'аудит воронки продаж', when: '27.02, дискуссия', remind: '' },
    { id: 'c5', pid: 'p02', tag: 'meet', note: 'приглашённый покупатель, упаковка и логистика', when: '27.02, Комната сделок', remind: 'написать 03.03' }
  ];

  /* Заявки на знакомство: срок жизни, часы до истечения (D-47 и FR-PPL-03: заявка живёт 12 часов) */
  var REQ_TTL_H = 12;
  var INCOMING_TTL = { r1: 'осталось 9 ч 20 мин', r2: 'осталось 4 ч 30 мин', r3: 'принята' };
  var LIMITS = { outPending: 5, inDay: 4, reasonMax: 280, reasonMin: 10, holdSec: 120 };

  /* ================= помощники ================= */

  function norm(s) { return String(s == null ? '' : s).toLowerCase().replace(/ё/g, 'е'); }
  function toMin(t) { return parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3), 10); }
  function fmt(m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }
  function endOf(start, dur) { return fmt(toMin(start) + (dur || 30)); }
  function winIdx(label) { return WIN.indexOf(label); }
  function person(id) { return FIX.person(id); }
  function extOf(id) { return EXT[id] || ext({}); }
  function companyOf(id) { return FIX.companyOfPerson(id) || null; }
  function productsOf(id) { var c = companyOf(id); return c ? FIX.productsOf(c.id) : []; }

  /* mutable-состояние сессии: общее для экранов F и G */
  var store = {
    meets: MEETS.map(function (m) { return Object.assign({}, m); }),
    out: [],            /* новые исходящие заявки на знакомство: {id, to, reason, status, at} */
    inPath: {},         /* pid → { time, id } добавлено в «Мой путь» */
    invited: {},        /* pid → true: приглашён на кофе */
    saved: {},          /* pid → true: сохранён */
    waitlist: {},       /* pid → позиция */
    agreements: AGREEMENTS.map(function (a) { return Object.assign({}, a); }),
    greeting: {},       /* pid → приветствие, набранное в F11 */
    hideCoffee: false,
    withdrawn: {},      /* id исходящей заявки → true: отозвана */
    inDec: {},          /* id входящей заявки → accepted | later | declined */
    inShared: {},       /* id входящей заявки → список переданных контактов */
    seq: 10
  };

  /* число входящих заявок, ждущих ответа */
  function inboxNew() {
    return FIX.INCOMING_REQS.filter(function (r) { return r.status === 'new' && !store.inDec[r.id]; }).length;
  }
  /* сколько входящих принято сегодня: уже принятые в списке (статус done) плюс принятые в демо; в списке «Ранее» столько же строк */
  function inAccepted() {
    var n = FIX.INCOMING_REQS.filter(function (r) { return r.status === 'done'; }).length;
    Object.keys(store.inDec).forEach(function (k) { if (store.inDec[k] === 'accepted') { n++; } });
    return n;
  }

  function overlap1(s1, d1, s2, d2) { return s1 < s2 + d2 && s2 < s1 + d1; }
  /* встречи, занимающие время (без отменённых), на день */
  function meetAt(day, label, dur) {
    var s = toMin(label);
    for (var i = 0; i < store.meets.length; i++) {
      var m = store.meets[i];
      if (m.day === day && m.status !== 'cancelled' && overlap1(s, dur || 30, toMin(m.start), m.dur || 30)) { return m; }
    }
    return null;
  }
  /* принятые и записанные пункты «Мой путь» (accepted, booked, done), кроме дел из пяти минут: окно, которое с ними пересекается, занято */
  var FIRM = { accepted: 1, booked: 1, done: 1 };
  function pathAt(day, label, dur) {
    var s = toMin(label), items = FIX.PATH_ITEMS || [];
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!FIRM[it.status] || it.type === 'task' || it.day !== day || !it.time) { continue; }
      if (overlap1(s, dur || 30, toMin(it.time), it.dur || 30)) { return it; }
    }
    return null;
  }
  /* чем занято окно у владельца демо: { kind: 'meet', m } | { kind: 'path', it } | null */
  function busyAt(day, label, dur) {
    var m = meetAt(day, label, dur);
    if (m) { return { kind: 'meet', m: m }; }
    var it = pathAt(day, label, dur);
    return it ? { kind: 'path', it: it } : null;
  }
  /* прежний вид: занятость сегодняшних окон встречами по времени начала (для совместимости) */
  function meBusy() {
    var out = {};
    store.meets.forEach(function (m) {
      if (m.day === '27.02' && m.status !== 'cancelled') { out[m.start] = m; }
    });
    return out;
  }
  function pendingOut() {
    var n = FIX.OUTGOING_REQS.filter(function (r) { return r.status === 'pending' && !(store.withdrawn || {})[r.id]; }).length;
    n += store.out.filter(function (r) { return r.status === 'pending'; }).length;
    n += store.meets.filter(function (m) { return m.status === 'pending' && m.day >= '27.02'; }).length;
    return n;
  }
  /* число входящих заявок, ждущих ответа: берётся и решение из F4, и базовые данные */
  function reqStatus(pid) {
    var i, r;
    for (i = 0; i < store.out.length; i++) { if (store.out[i].to === pid) { return store.out[i].status; } }
    for (i = 0; i < FIX.OUTGOING_REQS.length; i++) {
      r = FIX.OUTGOING_REQS[i];
      if (r.to === pid) { return (store.withdrawn || {})[r.id] ? null : r.status; }
    }
    if (pid === 'p15') { return 'expired'; }
    return null;
  }
  /* Открывает ли человек поля уровня «Те, с кем у меня встреча» (FR-PROF-08): читает живое состояние сеанса.
     Возвращает строку-основание или null. Основания: исходные встречи (MET); подтверждённая или состоявшаяся встреча (G4, G5);
     принятая заявка на знакомство в любую сторону (F4, F5; принятая заявка раскрывает контакты обеим сторонам, FR-PPL-04). */
  function met(pid) {
    var i, m, r;
    if (MET[pid]) { return MET[pid]; }
    for (i = 0; i < store.meets.length; i++) {
      m = store.meets[i];
      if (m.who && m.who.type === 'person' && m.who.id === pid && (m.status === 'confirmed' || m.status === 'held')) {
        return (m.status === 'held' ? 'у вас состоялась встреча: ' : 'у вас подтверждена встреча: ') + dayTime(m.day, m.start);
      }
    }
    for (i = 0; i < FIX.INCOMING_REQS.length; i++) {
      r = FIX.INCOMING_REQS[i];
      if (r.from === pid && (r.status === 'done' || store.inDec[r.id] === 'accepted')) { return 'вы приняли заявку на знакомство'; }
    }
    for (i = 0; i < FIX.OUTGOING_REQS.length; i++) {
      r = FIX.OUTGOING_REQS[i];
      if (r.to === pid && r.status === 'accepted' && !(store.withdrawn || {})[r.id]) { return 'принята ваша заявка на знакомство'; }
    }
    for (i = 0; i < store.out.length; i++) {
      if (store.out[i].to === pid && store.out[i].status === 'accepted') { return 'принята ваша заявка на знакомство'; }
    }
    return null;
  }
  function meetWith(pid) { return met(pid); }

  /* может ли владелец демо (участник, не экспонент и не спикер) видеть поле человека, и почему */
  function fieldAccess(pid, fieldId) {
    var e = extOf(pid), lvl = e.vis[fieldId] || 'all';
    if (fieldId === 'revenue') { var c = companyOf(pid); lvl = c && c.revenueOpen ? 'all' : 'only_me'; }
    if (lvl === 'all') { return { level: lvl, visible: true, because: 'поле открыто для всех участников' }; }
    if (lvl === 'meeting') {
      var mt = met(pid);
      return mt ? { level: lvl, visible: true, because: mt }
                : { level: lvl, visible: false, because: 'откроется после встречи' };
    }
    if (lvl === 'partners') { return { level: lvl, visible: false, because: 'доступно экспонентам и спикерам по согласию' }; }
    return { level: lvl, visible: false, because: 'видно только владельцу' };
  }
  /* цель человека показывается только если он сам открыл её (по D-47); иначе null */
  function goalOf(pid) {
    var p = person(pid);
    return p && p.goal && fieldAccess(pid, 'goals').visible ? p.goal : null;
  }

  /* у человека вообще есть окна для встреч на ближайшие дни (иначе встреча невозможна, экран G11) */
  function hasAvail(pid) { var e = extOf(pid); return !!(e.avail.length || (e.avail2 || []).length); }
  /* окна, свободные у человека и у владельца демо: сегодня не раньше 11:40; окно, которое занято встречей или пересекается
     с принятым или записанным пунктом «Мой путь», не предлагается. Порядок: по дню, затем по времени. */
  function slots(pid) {
    var out = [], e = extOf(pid);
    DAYS.forEach(function (day, di) {
      (di === 0 ? e.avail : (e.avail2 || [])).forEach(function (l) {
        if (di === 0 && toMin(l) < 11 * 60 + 40) { return; }
        if (busyAt(day, l)) { return; }
        out.push({ day: day, label: l, wi: winIdx(l) });
      });
    });
    return out;
  }
  /* прежний вид: свободные сегодняшние окна (подписи) */
  function freeWindows(pid) {
    return slots(pid).filter(function (s) { return s.day === '27.02'; }).map(function (s) { return s.label; });
  }
  function withTable(s) {
    var tf = netFree(s.wi, s.day);
    if (!tf.length) { return null; }
    return { day: s.day, label: s.label, wi: s.wi, table: tf.indexOf(18) >= 0 ? 18 : tf[Math.floor(tf.length / 2)], tables: tf, end: endOf(s.label, 30) };
  }
  /* предложение системы: первое свободное окно со свободным столом (стол 18, если свободен); может быть и на завтра */
  function suggest(pid) { return suggestions(pid, 1)[0] || null; }
  /* все предложения по человеку для G3: до трёх вариантов окно + стол */
  function suggestions(pid, limit) {
    var out = [], ws = slots(pid);
    for (var i = 0; i < ws.length && out.length < (limit || 3); i++) {
      var x = withTable(ws[i]);
      if (x) { out.push(x); }
    }
    return out;
  }
  /* почему сегодня нет предложения: у человека есть окна, но все пересекаются с вашим «Мой путь» или заняты */
  function todayNote(pid) {
    var e = extOf(pid), first = suggest(pid);
    if (!e.avail.length || !first || first.day === '27.02') { return ''; }
    return 'Сегодня окна человека пересекаются с вашими встречами и пунктами «Мой путь»: ближайшее свободное — завтра.';
  }

  /* ---------- поиск и фильтры вкладки «Участники» (FR-SRCH-03) ---------- */

  function searchParts(p) {
    var c = companyOf(p.id), e = extOf(p.id), parts = [];
    parts.push({ kind: 'name', text: p.name });
    parts.push({ kind: 'role', text: p.role });
    if (c) {
      parts.push({ kind: 'company', text: c.name });
      parts.push({ kind: 'industry', text: c.industry });
      parts.push({ kind: 'companyDesc', text: c.desc });
    }
    productsOf(p.id).forEach(function (pr) {
      parts.push({ kind: pr.kind === 'услуга' ? 'service' : 'product', text: pr.name, extra: pr.short });
    });
    if (fieldAccess(p.id, 'hobby').visible) { parts.push({ kind: 'hobby', text: e.hobby }); }
    if (fieldAccess(p.id, 'sport').visible) { parts.push({ kind: 'sport', text: e.sport }); }
    if (fieldAccess(p.id, 'usefulness').visible) { parts.push({ kind: 'usefulness', text: e.usefulness }); }
    return parts;
  }
  /* возвращает null (не найдено) или список звеньев, по которым нашлось */
  function matchQuery(p, q) {
    var tokens = norm(q).split(/\s+/).filter(Boolean);
    if (!tokens.length) { return []; }
    var parts = searchParts(p), hits = [];
    for (var i = 0; i < tokens.length; i++) {
      var found = null;
      for (var j = 0; j < parts.length && !found; j++) {
        if (norm(parts[j].text + ' ' + (parts[j].extra || '')).indexOf(tokens[i]) >= 0) { found = parts[j]; }
      }
      if (!found) { return null; }
      if (!hits.some(function (h) { return h.kind === found.kind && h.text === found.text; })) { hits.push({ kind: found.kind, text: found.text }); }
    }
    return hits;
  }
  var HIT_LABEL = { name: '', role: 'нашлось по должности', company: 'нашлось по компании', industry: 'нашлось по отрасли',
    companyDesc: 'нашлось по описанию компании', product: 'нашлось по продукту', service: 'нашлось по услуге',
    hobby: 'нашлось по хобби', sport: 'нашлось по спорту', usefulness: 'нашлось по полю «Польза для других»' };
  function hitLabel(h) {
    var l = HIT_LABEL[h.kind];
    if (!l) { return ''; }
    return (h.kind === 'product' || h.kind === 'service') ? l + ' «' + h.text + '»' : l;
  }

  function people() { return FIX.PEOPLE; }
  function industryOf(p) { var c = companyOf(p.id); return c ? c.industry : ''; }

  function filterPeople(opt) {
    opt = opt || {};
    var out = [];
    people().forEach(function (p) {
      if (opt.tariff && p.tariff !== opt.tariff) { return; }
      if (opt.industry && industryOf(p) !== opt.industry) { return; }
      if (opt.goal && goalOf(p.id) !== opt.goal) { return; }
      var hits = [];
      if (opt.q && opt.q.trim()) {
        hits = matchQuery(p, opt.q);
        if (hits === null) { return; }
      }
      out.push({ p: p, hits: hits });
    });
    return out;
  }

  /* ---------- умная строка (FR-SRCH-04, FR-SRCH-05) ---------- */

  var INDUSTRY_WORDS = [
    [/стро[йи]к|строител|недвижим|девелоп|застройщ/, 'Строительство и недвижимость'],
    [/логист|склад|перевоз|транспорт|грузоперевоз/, 'Транспорт и логистика'],
    [/агро|сельск|ферм|аграр|урожа/, 'Сельское хозяйство'],
    [/производств|завод|фабрик/, 'Производство'],
    [/розниц|торгов|магазин|e-?commerce|маркетплейс/, 'Торговля и E-commerce'],
    [/разработ|софт|digital|программ|медиа|связь/, 'IT, связь и медиа'],
    [/медицин|клиник|здравоохран/, 'Здравоохранение и социальные услуги'],
    [/образован|школ|обучен|детск/, 'Образование'],
    [/кафе|ресторан|гостин|отел|туризм|общепит/, 'Гостиничный бизнес и туризм'],
    [/спорт|развлечен|фитнес/, 'Индустрия развлечений, культура и спорт'],
    [/консалт|юрист|подбор персонал|рекрут|пиар|pr\b/, 'Профессиональные услуги (B2B)'],
    [/финанс|страхов|банк/, 'Финансы и страхование']
  ];
  /* Оборот в умной строке сравнивается по диапазонам справочника FIX.TAXO.REVENUE (пять диапазонов, от меньшего к большему).
     Границы в миллионах: [0, 60, 200, 500, 1000, ∞]; диапазон i покрывает [B[i], B[i+1]).
     «до 60 млн» даёт только первый диапазон, «60–200 млн» только второй, «от 200 млн» и выше — третий и дальше, «миллиард плюс» — последний. */
  var REV = FIX.TAXO.REVENUE, REV_B = [0, 60, 200, 500, 1000, Infinity];
  var WORD_NUM = { 'шестьдесят': 60, 'двести': 200, 'пятьсот': 500 };
  var RE_N = '(\\d+(?:[.,]\\d+)?|шестьдесят|двести|пятьсот)', RE_U = '(млн|миллион\\w*|млрд|миллиард\\w*)';
  var RE_N2 = '(\\d+(?:[.,]\\d+)?|шестьдесят|двести|пятьсот|миллиард\\w*)';
  var RE_RANGE = new RegExp('(?:от\\s+)?' + RE_N + '\\s*' + RE_U + '?\\s*(?:-|–|—|до)\\s*' + RE_N2 + '\\s*' + RE_U + '?');
  var RE_ONE = new RegExp(RE_N + '\\s*' + RE_U + '|(?:^|[^а-я])(миллиард\\w*|млрд)');
  function revVal(n, unit, dflt) {
    if (/^миллиард/.test(n)) { return 1000; }
    var v = WORD_NUM[n] != null ? WORD_NUM[n] : parseFloat(String(n).replace(',', '.'));
    var u = unit || dflt || 'млн';
    return /^(млрд|миллиард)/.test(u) ? v * 1000 : v;
  }
  function revFirst(v) { for (var i = 0; i < 5; i++) { if (REV_B[i + 1] > v) { return i; } } return 4; }      /* первый диапазон, который заканчивается выше v */
  function revLast(v) { for (var i = 4; i >= 0; i--) { if (REV_B[i] < v) { return i; } } return 0; }          /* последний диапазон, который начинается ниже v */
  function revB(v) { return v >= 1000 ? (v / 1000) + ' млрд' : v + ' млн'; }
  function revLabel(lo, hi) {
    if (lo === hi) { return REV[lo]; }
    if (lo === 0) { return 'до ' + revB(REV_B[hi + 1]); }
    if (hi === 4) { return 'от ' + revB(REV_B[lo]); }
    var a = REV_B[lo], b = REV_B[hi + 1];
    return (b >= 1000 && a < 1000 ? revB(a) : String(a)) + '–' + revB(b);
  }
  /* возвращает { lo, hi } (индексы диапазонов справочника) или null, если оборот во фразе не назван */
  function parseRevenue(s) {
    var m = RE_RANGE.exec(s), lo, hi;
    if (m && (m[2] || m[4] || /^миллиард/.test(m[3]))) {
      var u2 = m[4] || m[2], a = revVal(m[1], m[2], u2), b = revVal(m[3], m[4], u2);
      if (a > b) { var t = a; a = b; b = t; }
      lo = revFirst(a); hi = revLast(b);
      return { lo: lo, hi: Math.max(lo, hi) };
    }
    m = RE_ONE.exec(s);
    if (!m) { return null; }
    var v = m[3] ? 1000 : revVal(m[1], m[2]), at = m.index, before = s.slice(Math.max(0, at - 16), at), after = s.slice(at + m[0].length, at + m[0].length + 14);
    if (/(?:^|[^а-я])(до|менее|меньше|не более|не выше|не больше)\s*$/.test(before)) { hi = revLast(v); return { lo: 0, hi: hi }; }
    if (/(?:^|[^а-я])(от|более|больше|свыше|выше|не менее|минимум)\s*$/.test(before) || /^\s*(плюс|\+|и более|и больше|и выше)/.test(after)) { lo = revFirst(v); return { lo: lo, hi: 4 }; }
    lo = revFirst(v);                                                                       /* без уточнения: диапазон, в который попадает сумма */
    for (var i = 4; i >= 0; i--) { if (REV_B[i] <= v) { lo = i; break; } }
    return { lo: lo, hi: lo };
  }
  var GOAL_WORDS = [
    [/ищут партн|ищу партн|ищет партн|ищем партн/, 'ищу партнёра'],
    [/инвестор|ищут инвест|инвестиру/, 'инвестирую'],
    [/покупател|закупщик|закупк/, 'покупаю'],
    [/продают|продаю/, 'продаю'],
    [/ментор/, 'готов быть ментором']
  ];
  var INTL = /междунар|экспорт|зарубеж|за границ|внешн[а-я]+ рын|китай|казахстан/;

  /* примеры запросов обычной фразой (прозрачные подсказки в строке; решение заказчика, A-23) */
  var ASK_EXAMPLES = ['подборка предпринимателей стройки', 'оборот миллиард плюс', 'выходят на международный рынок'];

  function parseAsk(phrase) {
    var s = norm(phrase).trim(), chips = [], i;
    if (!s) { return { chips: [], phrase: '' }; }
    for (i = 0; i < INDUSTRY_WORDS.length; i++) {
      if (INDUSTRY_WORDS[i][0].test(s)) { chips.push({ id: 'ind', kind: 'отрасль', value: INDUSTRY_WORDS[i][1], label: 'отрасль: ' + INDUSTRY_WORDS[i][1] }); break; }
    }
    var rv = parseRevenue(s);
    if (rv) {
      var rl = revLabel(rv.lo, rv.hi);
      chips.push({ id: 'rev', kind: 'оборот', value: rl, lo: rv.lo, hi: rv.hi, label: 'оборот: ' + rl + ', у открывших' });
    }
    if (INTL.test(s)) { chips.push({ id: 'intl', kind: 'тема', value: 'международный рынок', label: 'тема: международный рынок' }); }
    for (i = 0; i < GOAL_WORDS.length; i++) {
      if (GOAL_WORDS[i][0].test(s)) { chips.push({ id: 'goal', kind: 'цель', value: GOAL_WORDS[i][1], label: 'цель: ' + GOAL_WORDS[i][1] + ', у открывших' }); break; }
    }
    if (!chips.length) {
      var words = s.replace(/[^а-яa-z0-9\s-]/g, ' ').split(/\s+/).filter(function (w) { return w.length >= 4; });
      if (words.length) { chips.push({ id: 'words', kind: 'слова', value: words.join(' '), label: 'слова: ' + words.join(' ') }); }
    }
    return { chips: chips, phrase: phrase };
  }

  var REV_ORDER = REV;
  function intlText(p) {
    var c = companyOf(p.id), e = extOf(p.id), t = [];
    if (c) { t.push(c.desc); }
    productsOf(p.id).forEach(function (pr) { t.push(pr.name + ' ' + pr.short); });
    if (fieldAccess(p.id, 'usefulness').visible) { t.push(e.usefulness); }
    return norm(t.join(' '));
  }

  /* chips — оставшиеся (не снятые) чипы. Возвращает { exact: [{p, how}], more: [{p, how}], notes: [] }.
     Оборот: отбор только по людям, открывшим его всем участникам; значения оборота в результатах и причинах не показываются. */
  function runAsk(chips) {
    var exact = [], more = [], notes = [], active = chips || [];
    var hasRev = active.some(function (c) { return c.id === 'rev'; }), hasGoal = active.some(function (c) { return c.id === 'goal'; });
    var onlyWords = active.length > 0 && active.every(function (c) { return c.id === 'words'; });
    people().forEach(function (p) {
      var c = companyOf(p.id), how = [], ok = true;
      active.forEach(function (ch) {
        if (!ok) { return; }
        if (ch.id === 'ind') {
          if (c && c.industry === ch.value) { how.push('отрасль совпала'); } else { ok = false; }
        } else if (ch.id === 'rev') {
          var ri = c ? REV.indexOf(c.revenue) : -1;
          if (c && c.revenueOpen && ri >= ch.lo && ri <= ch.hi) { how.push('оборот открыт владельцем'); } else { ok = false; }
        } else if (ch.id === 'intl') {
          if (INTL.test(intlText(p))) { how.push('выход на международный рынок'); } else { ok = false; }
        } else if (ch.id === 'goal') {
          if (goalOf(p.id) === ch.value) { how.push('цель открыта владельцем: ' + ch.value); } else { ok = false; }
        } else if (ch.id === 'words') {
          var h = matchQuery(p, ch.value);
          if (h && h.length) { how.push(hitLabel(h[0]) || 'нашлось по имени'); } else { ok = false; }
        }
      });
      if (ok && active.length) { exact.push({ p: p, how: how }); }
    });
    if (hasRev || hasGoal) {
      notes.push((hasRev && hasGoal ? 'Оборот и цель учитываются' : hasRev ? 'Оборот учитывается' : 'Цель учитывается') +
        ' только у тех, кто открыл ' + (hasRev && hasGoal ? 'их' : hasRev ? 'его' : 'её') + ' всем участникам. У остальных значение не показывается и в отбор не входит.');
    }
    exact = exact.slice(0, 8);
    /* добор до пяти («рядом по смыслу»): смежные признаки; порядок по полезности для владельца демо. Тех, у кого открытое значение
       оборота или цели противоречит условию, не берём; закрытый оборот лишь исключает явное противоречие и нигде не показывается. */
    var ids = exact.map(function (r) { return r.p.id; });
    if (exact.length < 5 && active.length && !onlyWords) {
      var order = hasRev ? ['p24', 'p01', 'p14', 'p12', 'p05', 'p08'] : ['p12', 'p14', 'p05', 'p08', 'p01', 'p20', 'p23', 'p18'];
      var activeInd = active.filter(function (c) { return c.id === 'ind'; })[0];
      var rc = active.filter(function (c) { return c.id === 'rev'; })[0];
      var pool = order;
      if (rc) {
        pool = people().map(function (x) { return x.id; }).filter(function (id) {
          var cc = companyOf(id), ri = cc ? REV.indexOf(cc.revenue) : -1;
          return cc && !cc.revenueOpen && ri >= rc.lo - 1 && ri <= rc.hi + 1;
        });
        pool.sort(function (x, y) {
          var dx = Math.abs(REV.indexOf(companyOf(x).revenue) - (rc.lo + rc.hi) / 2), dy = Math.abs(REV.indexOf(companyOf(y).revenue) - (rc.lo + rc.hi) / 2);
          return dx - dy || (order.indexOf(x) < 0 ? 99 : order.indexOf(x)) - (order.indexOf(y) < 0 ? 99 : order.indexOf(y));
        });
      }
      pool.forEach(function (pid) {
        if (ids.indexOf(pid) >= 0 || exact.length + more.length >= 5) { return; }
        var pp = person(pid);
        if (!pp) { return; }
        if (activeInd && industryOf(pp) === activeInd.value) { return; }
        if (hasGoal && goalOf(pid)) { return; }
        more.push({ p: pp, how: [] });
      });
    }
    return { exact: exact, more: more, notes: notes };
  }

  /* ---------- заявка на знакомство: единый путь для F3 и для других разделов (H9, H10 и т. д.) ---------- */
  /* текст причины отказа или пустая строка: заявку этому человеку можно отправить */
  function introBlock(pid) {
    if (!person(pid)) { return 'Человек не найден.'; }
    var rs = reqStatus(pid);
    if (rs === 'pending' || rs === 'accepted') { return 'Заявка этому человеку уже отправлена. Повторно знакомиться по заявке нельзя.'; }
    if (rs === 'declined') { return 'Человек отклонил заявку. Новую заявку отправить нельзя.'; }
    if (pendingOut() >= LIMITS.outPending) { return 'Лимит ожидающих заявок исчерпан: ' + LIMITS.outPending + ' из ' + LIMITS.outPending + '. Дождитесь ответа или отзовите одну в разделе «Исходящие».'; }
    return '';
  }
  /* sendIntro(pid, reason, source): создаёт заявку на знакомство тем же путём, что кнопка подтверждения на F3;
     учитывает общий лимит ожидающих (5) и дубли. source: подпись источника («карточка человека», «Продукты участников» и т. п.).
     Возвращает { ok, reason, code, id }: reason — готовая русская фраза о причине отказа (пустая при успехе),
     code — dup | declined | limit | short | nopid. */
  function sendIntro(pid, reason, source) {
    var b = introBlock(pid), t = String(reason == null ? '' : reason).trim();
    if (b) {
      return { ok: false, reason: b, code: !person(pid) ? 'nopid' : /отклонил/.test(b) ? 'declined' : /Лимит/.test(b) ? 'limit' : 'dup', id: null };
    }
    if (t.length < LIMITS.reasonMin) { return { ok: false, reason: 'Напишите причину не короче ' + LIMITS.reasonMin + ' знаков.', code: 'short', id: null }; }
    var id = 'ox' + (store.seq++);
    store.out.push({ id: id, to: pid, reason: t.slice(0, LIMITS.reasonMax), status: 'pending', at: '11:10', source: source || 'карточка человека' });
    return { ok: true, reason: '', code: '', id: id };
  }

  /* Ранее принятая сегодня входящая заявка (F4, «Ранее»): счётчик «принято 2 из 4» совпадает со списком */
  if (!FIX.INCOMING_REQS.some(function (r) { return r.id === 'r4'; })) {
    FIX.INCOMING_REQS.push({ id: 'r4', from: 'p19', reason: 'Ищем проекты складской недвижимости, вам может быть интересно партнёрство по перевозкам для наших объектов.', status: 'done' });
    INCOMING_TTL.r4 = 'принята';
  }

  /* ================= публикация ================= */

  Object.assign(window.FIX, {
    PPL: {
      store: store, EXT: EXT, MET: MET, LIMITS: LIMITS, REQ_TTL_H: REQ_TTL_H, INCOMING_TTL: INCOMING_TTL,
      WIN: WIN, NET: NET, SPACES: SPACES, MEETS: MEETS, COUNTER: COUNTER, AGREEMENTS: AGREEMENTS,
      COFFEE_POINTS: COFFEE_POINTS, COFFEE_PICKS: COFFEE_PICKS, CONTACTS: CONTACTS, CONTACT_TAGS: CONTACT_TAGS,
      ASK_EXAMPLES: ASK_EXAMPLES, REV_ORDER: REV_ORDER,
      norm: norm, toMin: toMin, fmt: fmt, endOf: endOf, winIdx: winIdx,
      ext: extOf, company: companyOf, products: productsOf, industryOf: industryOf,
      inboxNew: inboxNew, inAccepted: inAccepted,
      meBusy: meBusy, pendingOut: pendingOut, reqStatus: reqStatus, meetWith: meetWith, met: met, fieldAccess: fieldAccess, goalOf: goalOf,
      freeWindows: freeWindows, slots: slots, hasAvail: hasAvail, suggest: suggest, suggestions: suggestions, todayNote: todayNote, netFree: netFree,
      DAYS: DAYS, dayWord: dayWord, dayLong: dayLong, dayDate: dayDate, dayTime: dayTime, busyAt: busyAt, meetAt: meetAt, pathAt: pathAt,
      introBlock: introBlock, sendIntro: sendIntro,
      matchQuery: matchQuery, hitLabel: hitLabel, filterPeople: filterPeople,
      parseAsk: parseAsk, runAsk: runAsk,
      space: function (id) { for (var i = 0; i < SPACES.length; i++) { if (SPACES[i].id === id) { return SPACES[i]; } } return null; },
      meet: function (id) { for (var i = 0; i < store.meets.length; i++) { if (store.meets[i].id === id) { return store.meets[i]; } } return null; }
    }
  });
})();
