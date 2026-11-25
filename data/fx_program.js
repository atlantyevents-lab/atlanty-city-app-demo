/* Дополнения программы: метки досуга, форматы практик, зона митапов. Владелец S3. Расширяет window.FIX (Object.assign). Схемы — design/04_REBUILD_V3.md, часть 5. */
/* Что добавляется поверх data/fixtures.js (сам fixtures.js не правится):
   1. форматы «Страт-сессия», «Развлекательный практикум», «Митап» (FIX.FORMATS, FIX.FORMAT_GROUPS) и справочник FIX.FORMAT_INFO;
   2. место «Зона митапов · Экспо» (id meetups) без вместимости: в HALLS добавляется запись с cap: null и подписью capNote «по записи»;
   3. 12 новых сессий (в том числе зарезервированные sx01…sx04 для раздела S2) и метка досуга label (+ label2) у ВСЕХ сессий;
   4. фильтр FIX.progFilter с «Практиками», метками досуга, поиском и «Избранным» (старые ключи работают как прежде);
   5. данные для вида «Избранное»: FIX.FAV_SEED и уведомление о переносе FIX.SCHEDULE_NOTICES;
   6. у спикеров поле tariff (Бизнес или Первый класс): Оптимум не выступает в деловой программе (D-41, FR-PROG-15).
   Отступления от правила «существующие записи не менять» (все осознанные, перечислены в отчёте S3):
     s2628, s2706 — питч-сессии переведены из Конгресс-центра в зону митапов (D-41, FR-PROG-14, AC-PROG-12), cap и left сняты;
     s2711 — left 5 → 0 (в D3 и в путях S2 человек стоит третьим в листе ожидания, мест нет);
     s2705 — перенос на 30 минут (было 12:00): добавлены changed, was, changeNote; s2707, s2710 — добавлено changeNote;
     s2707 — добавлено wasHall: 'congress' (прежний зал для экрана C6).
   Хелперы для экранов: FIX.canBook, ACCESS_LABEL, pathTypeOf, sessionEnd, overlapping, prevInHall, nextInHall, mentorSlots. */
(function () {
  'use strict';
  var FIX = window.FIX = window.FIX || {};
  if (!FIX.SESSIONS || !FIX.HALLS) { throw new Error('fx_program.js: сначала подключите data/fixtures.js'); }
  var TAXO = FIX.TAXO || {};

  var LABELS = (TAXO.LABELS || ['Спорт', 'Бизнес', 'Семья', 'Развлечения']).slice();
  /* шесть форматов «Практики» (состав подтвердить, O-20) */
  var PRACTICES = (TAXO.PRACTICE_FORMATS ||
    ['Страт-сессия', 'Бизнес-разбор', 'Питч-сессия', 'Практикум', 'Развлекательный практикум', 'Митап']).slice();

  function byId(id) { for (var i = 0; i < FIX.SESSIONS.length; i++) { if (FIX.SESSIONS[i].id === id) { return FIX.SESSIONS[i]; } } return null; }
  function tmin(t) { return parseInt(t.slice(0, 2), 10) * 60 + parseInt(t.slice(3), 10); }

  /* ---------- 1. форматы ---------- */
  ['Страт-сессия', 'Развлекательный практикум', 'Митап'].forEach(function (f) {
    if (FIX.FORMATS.indexOf(f) < 0) { FIX.FORMATS.push(f); }
  });
  if (FIX.FORMAT_GROUPS) {
    var gBiz = FIX.FORMAT_GROUPS['деловая'], gMk = FIX.FORMAT_GROUPS['гостиные и мастер-классы'];
    if (gBiz && gBiz.indexOf('Страт-сессия') < 0) { gBiz.push('Страт-сессия', 'Митап'); }
    if (gMk && gMk.indexOf('Развлекательный практикум') < 0) { gMk.push('Развлекательный практикум'); }
  }

  /* Пять групп форматов панели программы (analysis/11_FORMATS_AND_SESSION_TYPES.md, раздел 2–3).
     Группы цвета метки (FIX.FORMAT_GROUPS: деловая / гостиные и мастер-классы / для сопровождающих)
     — отдельная ось, используется progFilter; здесь — таксономия панели для фильтра и карточки C3. */
  var FORMAT_GROUPS_PANEL = {
    'Выступление': ['Бизнес-встреча', 'Мастер-класс', 'Кейс', 'Лекция', 'Паблик-ток', 'Дискуссия', 'Личная презентация',
      'Атланты говорят', 'ТЭД', 'Питч-сессия', 'Тренд-репорт', 'Печа-куча', 'Тренинг', 'Квартирник', 'Интервью'],
    'Практика': ['Практикум', 'Бизнес-разбор', 'Отношеничная', 'Страт-сессия', 'Развлекательный практикум', 'Митап'],
    'Шоу': ['Баттл', 'Синемалогия', 'Вечер бизнес-провалов'],
    'Нетворкинг': ['Знакомишная', 'Партнёришная'],
    'Гостиная': ['Экспертная гостиная', 'Менторская гостиная', 'Точка сборки']
  };
  function formatPanelGroup(f) {
    for (var g in FORMAT_GROUPS_PANEL) { if (FORMAT_GROUPS_PANEL[g].indexOf(f) >= 0) { return g; } }
    return '';
  }

  /* Справочник форматов (analysis/11_FORMATS_AND_SESSION_TYPES.md, раздел 3): группа панели,
     описание 1–2 предложения (формулировки панели сокращены; где описания в панели нет —
     по названию и примерам, без выдуманных цифр), длительность и состав сцены — по панели.
     practice: true только у шести форматов фильтра «Практики» (D-41, Q-14). Показывается
     в карточке C3 и в листе «Что такое формат». */
  var FORMAT_INFO = {
    'Бизнес-встреча': { group: 'Выступление', dur: 60, people: '1–6', practice: false, text: 'Деловая встреча в малом кругу: участники разбирают задачу вместе с экспертом.' },
    'Мастер-класс': { group: 'Выступление', dur: 60, people: '1–2', practice: false, text: 'Эксперт показывает свои рабочие приёмы и инструменты на реальных примерах и кейсах.' },
    'Кейс': { group: 'Выступление', dur: 30, people: '1', practice: false, text: 'История из практики спикера: что решали, что сработало, где ошиблись.' },
    'Лекция': { group: 'Выступление', dur: 45, people: '1', practice: false, text: 'Выступление спикера с вопросами в конце.' },
    'Паблик-ток': { group: 'Выступление', dur: 60, people: '2–3', practice: false, text: 'Открытый живой разговор или интервью при зрителях: можно не только слушать, но и задавать вопросы и влиять на ход беседы.' },
    'Дискуссия': { group: 'Выступление', dur: 60, people: '2–5', practice: false, text: 'Несколько спикеров обсуждают тему и отвечают на вопросы зала.' },
    'Личная презентация': { group: 'Выступление', dur: 30, people: '1', practice: false, text: 'Выступление спикера, которое собирает воедино ключевые смыслы для аудитории.' },
    'Атланты говорят': { group: 'Выступление', dur: 90, people: '2–3', practice: false, text: 'Разговорный формат: короткие выступления организаторов и гостей, свободное общение.' },
    'ТЭД': { group: 'Выступление', dur: 18, people: '1–4', practice: false, text: 'Короткие концентрированные выступления: за 10–18 минут одна большая идея через личную историю и понятный вывод.' },
    'Питч-сессия': { group: 'Выступление', dur: 60, people: '1–6', practice: true, text: 'Зона митапов Экспо, открыта всем. Команды выступают с короткими питчами, затем вопросы из зала.' },
    'Тренд-репорт': { group: 'Выступление', dur: 45, people: '1', practice: false, text: 'Аналитический обзор ключевых тенденций и сигналов будущего в отрасли: помогает принимать решения на 1–3 года вперёд.' },
    'Печа-куча': { group: 'Выступление', dur: 7, people: '1', practice: false, text: 'Динамичный формат коротких выступлений: спикер показывает 20 слайдов, каждый переключается каждые 20 секунд.' },
    'Тренинг': { group: 'Выступление', dur: 60, people: '1–2', practice: false, text: 'Групповая отработка навыка под руководством тренера.' },
    'Квартирник': { group: 'Выступление', dur: 60, people: '1–2', practice: false, text: 'Неформальный разговор в малом кругу, как у друзей дома.' },
    'Интервью': { group: 'Выступление', dur: 60, people: '1–2', practice: false, text: 'Разговор ведущего со спикером о его опыте.' },
    'Практикум': { group: 'Практика', dur: 90, people: '1–2', practice: true, text: 'Участники работают со своими данными и задачами по шагам.' },
    'Бизнес-разбор': { group: 'Практика', dur: 120, people: '2–6', practice: true, text: 'Разбор бизнеса участника на живых цифрах, вопросы из зала.' },
    'Отношеничная': { group: 'Практика', dur: 90, people: '1–2', practice: false, text: 'Разбор партнёрских недопониманий и конфликтов в реальном времени.' },
    'Страт-сессия': { group: 'Практика', dur: 120, people: '1–2', practice: true, text: 'Рабочая сессия в малой группе: участники строят стратегию своей компании. Только для Первого класса.' },
    'Развлекательный практикум': { group: 'Практика', dur: 60, people: '1–2', practice: true, text: 'Игровой или творческий формат: участник делает сам, результат остаётся с ним.' },
    'Митап': { group: 'Практика', dur: 60, people: '1–2', practice: true, text: 'Знакомство по теме за свободным столом в зоне митапов Экспо, открыт всем.' },
    'Баттл': { group: 'Шоу', dur: 60, people: '2–8', practice: false, text: 'Спикеры с противоположными позициями публично спорят на одну тему и дают увидеть сильные и слабые стороны каждой точки зрения.' },
    'Синемалогия': { group: 'Шоу', dur: 120, people: '1–2', practice: false, text: 'Участники вместе смотрят фильм или его фрагменты, а затем разбирают увиденное как кейсы из жизни.' },
    'Вечер бизнес-провалов': { group: 'Шоу', dur: 90, people: '3–12', practice: false, text: 'Предприниматели честно рассказывают не про успехи, а про провалы: что пошло не так, сколько это стоило и какие выводы сделали.' },
    'Знакомишная': { group: 'Нетворкинг', dur: 60, people: '1–2', practice: false, text: 'Бизнес-знакомство один на один по методологии «Атлантов»: возможность найти новых друзей и партнёров.' },
    'Партнёришная': { group: 'Нетворкинг', dur: 60, people: '1–2', practice: false, text: 'Живой экспресс-формат: участники за короткое время находят друг друга для коллабораций и проектов.' },
    'Экспертная гостиная': { group: 'Гостиная', dur: 30, people: '1–10', practice: false, text: 'Стол на 8–12 мест, модератор держит регламент, вопросы по таймеру.' },
    'Менторская гостиная': { group: 'Гостиная', dur: 20, people: '1', practice: false, text: 'Пространство, где можно назначить личную встречу с ментором, экспертом или инвестором и обсудить свой запрос один на один.' },
    'Точка сборки': { group: 'Гостиная', dur: 90, people: '2–5', practice: false, text: 'Разговор с владельцем крупного бизнеса: в узком кругу можно задать свои вопросы топ-предпринимателю.' }
  };

  /* ---------- 2. место «Зона митапов · Экспо» ---------- */
  if (!FIX.hall('meetups')) {
    FIX.HALLS.push({
      id: 'meetups', short: 'Зона митапов', name: 'Зона митапов · Экспо', place: 'Экспо',
      cap: null, capNote: 'по записи', byRequest: true, zone: 'экспо',
      note: 'зона митапов Экспо, открыта всем; вместимость не определена, запись без лимита мест',
      /* демо-координата рядом с Конгресс-центром (схема, не изыскание) */
      geo: [36.5218, 56.5909], siteId: 'pin_bay', pinId: 'congress',
      mapNote: 'зона в экспозоне рядом с Конгресс-центром; точное место уточняется по планировке Экспо'
    });
  }

  /* переходы до зоны митапов: только внутри экспозоны, демо-оценка; остальные пары не заданы (предупреждение не строится) */
  var origTravel = FIX.travelMin;
  var EXTRA_TRAVEL = {
    'meetups>congress': 2, 'congress>meetups': 2,
    'meetups>doybitsa': 4, 'doybitsa>meetups': 4,
    'meetups>sobol': 4, 'sobol>meetups': 4
  };
  FIX.travelMin = function (a, b) {
    var k = a + '>' + b;
    return Object.prototype.hasOwnProperty.call(EXTRA_TRAVEL, k) ? EXTRA_TRAVEL[k] : origTravel(a, b);
  };

  /* ---------- 3. правки существующих записей (см. шапку файла) ---------- */
  ['s2628', 's2706'].forEach(function (id) {
    var s = byId(id);
    if (s && s.hall !== 'meetups') {
      s.hall = 'meetups'; s.cap = null; s.left = null; s.signed = id === 's2628' ? 24 : 31; s.byRequest = true;
    }
  });
  var s2711 = byId('s2711'); if (s2711) { s2711.left = 0; }
  var s2705 = byId('s2705');
  if (s2705) {
    s2705.changed = true; s2705.was = '12:00';
    s2705.changeNote = 'Перенесён на 30 минут: было 12:00, стало 12:30. Зал тот же.';
  }
  var s2707 = byId('s2707');
  if (s2707) { s2707.changeNote = 'Сменился зал: был Конгресс-центр · сцена, стал Соболь. Время то же.'; }
  var s2710 = byId('s2710');
  if (s2710) { s2710.changeNote = 'Сменился зал: теперь Баллрум (С). Начало в 15:30.'; }
  /* s2707: прежний зал нужен экрану C6 для строки «было → стало» и времени перехода (fixtures: лента f1 «перенесена из Конгресс-центра») */
  if (s2707) { s2707.wasHall = 'congress'; }

  /* s2601: «все уровни» заменено на нейтральное «любой уровень подготовки» (слово «уровни» в приложении только у D-47) */
  var s2601 = byId('s2601');
  if (s2601 && /все уровни/.test(s2601.desc)) { s2601.desc = s2601.desc.replace('все уровни', 'любой уровень подготовки'); }

  /* ---------- 3б. двойная занятость спикеров (тест S3: 16 пар из v2 и один конфликт после переноса s2705) ----------
     Спикер не может быть в двух местах сразу: окна менторов сдвинуты на свободное время (окна из путей S2 — soroka 27.02 16:00,
     levin 28.02 14:00, kovalev 27.02 15:30 — не тронуты), а в сессиях-дублях заменён один из спикеров на подходящего по теме.
     Схема данных не менялась: меняются только значения speakers и время окна в speaker(key).mentor.mw. */
  function setSpeakers(id, list) { var s = byId(id); if (s) { s.speakers = list; } }
  function moveWindow(key, day, from, to, table) {
    var sp = FIX.SPEAKERS[key], mw = sp && sp.mentor && sp.mentor.mw;
    (mw || []).forEach(function (w) { if (w[0] === day && w[1] === from) { w[1] = to; if (table) { w[2] = table; } } });
  }
  setSpeakers('s2609', ['markov', 'gromov']);      /* было demina + volkov: demina ведёт практикум s2603, volkov — лекцию s2620 */
  setSpeakers('s2617', ['filippova', 'frolov']);   /* было kovalev + frolov: kovalev в s2605 */
  setSpeakers('s2623', ['krylova']);               /* было gromov: gromov ведёт практикум s2611 в 15:00 */
  setSpeakers('s2614', ['filippova', 'zaitsev']);  /* было nikitina + filippova: nikitina в интервью s2622 */
  setSpeakers('s27021', ['smirnova']);             /* было vetrova: vetrova в дискуссии s2708 */
  setSpeakers('s2709', ['tarasov']);               /* было garipov: garipov в дискуссии s2708 */
  setSpeakers('s27039', ['vetrova']);              /* было smirnova: smirnova читает лекцию s27018 */
  setSpeakers('s2809', ['markov', 'belyaev']);     /* было markov + morozova: morozova в гостиной s2829 */
  setSpeakers('s2811', ['orlov']);                 /* было morozova: morozova в гостиной s2829 */
  moveWindow('kovalev', '26.02', '14:30', '15:00');
  moveWindow('soroka', '26.02', '13:30', '14:00');
  moveWindow('demina', '27.02', '13:30', '14:00');
  moveWindow('soroka', '27.02', '12:30', '15:00');
  moveWindow('roshchina', '27.02', '17:00', '14:30');
  moveWindow('ermakova', '28.02', '12:00', '14:30', 4);

  /* ---------- 4. новые сессии ---------- */
  var NEW_SESSIONS = [
    /* четыре открытые для Бизнеса сессии для версии пути «Сбалансированный» (раздел S2): идентификаторы зарезервированы */
    { id: 'sx01', day: '26.02', time: '17:30', dur: 90, title: 'Семейная прогулка и мастер-класс по росписи пряников', format: 'Развлекательный практикум', hall: 'ballroomS', lever: 'Собственник', speakers: [], cap: 60, left: 34, access: 'all', label: 'Семья', desc: 'Прогулка по набережной с ведущим и мастер-класс для взрослых и детей. Материалы выдаются на месте.' },
    { id: 'sx02', day: '26.02', time: '20:00', dur: 90, title: 'Игровой вечер для всех: командные игры и призы', format: 'Развлекательный практикум', hall: 'edelveis', lever: 'Собственник', speakers: [], cap: 120, left: 78, access: 'all', label: 'Развлечения', desc: 'Команды собираются на месте, ведущий раздаёт задания. Подойдёт и тем, кто приехал без компании.' },
    { id: 'sx03', day: '27.02', time: '14:00', dur: 75, title: 'Семейный мастер-класс по лепке из глины', format: 'Развлекательный практикум', hall: 'ballroomS', lever: 'Собственник', speakers: [], cap: 40, left: 15, access: 'all', label: 'Семья', desc: 'Взрослые и дети лепят вместе под руководством мастера. Готовые работы остаются участникам.' },
    { id: 'sx04', day: '27.02', time: '20:30', dur: 60, title: 'Вечер настольных игр', format: 'Развлекательный практикум', hall: 'ballroomB', lever: 'Собственник', speakers: [], cap: 80, left: 46, access: 'all', label: 'Развлечения', desc: 'Столы с играми разной сложности, ведущий подскажет правила и соберёт компании.' },

    /* зона митапов Экспо: открыта всем тарифам, вместимость не определена, запись без лимита (RSVP) */
    { id: 'sm01', day: '28.02', time: '12:00', dur: 60, title: 'Питч-сессия: пять команд — инвестору за пять минут', format: 'Питч-сессия', hall: 'meetups', lever: 'Капитал и защита', speakers: ['belyaev'], cap: null, left: null, signed: 22, byRequest: true, access: 'all', label: 'Бизнес', desc: 'Пять отобранных команд по пять минут, затем вопросы инвестора и зала.' },
    { id: 'sm02', day: '27.02', time: '12:30', dur: 60, title: 'Питч-сессия: решения для склада и логистики за три минуты', format: 'Питч-сессия', hall: 'meetups', lever: 'Рост и рынки', speakers: ['krylova'], cap: null, left: null, signed: 18, byRequest: true, access: 'all', label: 'Бизнес', desc: 'Короткие питчи о решениях для складов и доставки, после каждого — вопросы зала.' },
    { id: 'sm03', day: '27.02', time: '17:30', dur: 60, title: 'Митап: логистика и склады — знакомство по теме', format: 'Митап', hall: 'meetups', lever: 'Рост и рынки', speakers: [], cap: null, left: null, signed: 17, byRequest: true, access: 'all', label: 'Бизнес', desc: 'Свободные столы по теме, ведущий помогает найти собеседников по задаче.' },
    { id: 'sm04', day: '28.02', time: '15:00', dur: 60, title: 'Митап: найм и команда в регионах', format: 'Митап', hall: 'meetups', lever: 'Люди и ИИ', speakers: [], cap: null, left: null, signed: 12, byRequest: true, access: 'all', label: 'Бизнес', desc: 'Разговор за столами о найме и удержании людей вне столиц, обмен контактами по итогам.' },

    /* страт-сессия: только для Первого класса (слова Саши, правило задаёт дирекция) */
    { id: 'ss01', day: '27.02', time: '16:30', dur: 90, title: 'Страт-сессия: стратегия роста на три года', format: 'Страт-сессия', hall: 'magnolia', lever: 'Рост и рынки', speakers: ['safonov', 'krylova'], cap: 12, left: 5, access: 'fc', label: 'Бизнес', desc: 'Малая группа: каждый участник собирает план роста своей компании, спикеры разбирают его по шагам.' },

    /* бизнес-разборы */
    { id: 'br01', day: '27.02', time: '15:00', dur: 60, title: 'Бизнес-разбор: склад растёт, маржа падает', format: 'Бизнес-разбор', hall: 'sobol', lever: 'Деньги и маржа', speakers: ['levin'], cap: 30, left: 9, access: 'biz_fc', label: 'Бизнес', desc: 'Разбор складской экономики участника на живых цифрах: где маржа уходит и что менять первым.' },
    { id: 'br02', day: '26.02', time: '16:00', dur: 60, title: 'Бизнес-разбор: воронка B2B на цифрах участника', format: 'Бизнес-разбор', hall: 'magnolia', lever: 'Клиент', speakers: ['zaitsev'], cap: 40, left: 11, access: 'all', label: 'Бизнес', desc: 'Берём воронку участника по этапам и находим этап, на котором теряется больше всего заявок.' },

    /* спортивная */
    { id: 'sp01', day: '28.02', time: '08:30', dur: 60, title: 'Йога и растяжка для собственника', format: 'Развлекательный практикум', hall: 'edelveis', lever: 'Собственник', speakers: [], cap: 40, left: 17, access: 'all', label: 'Спорт', desc: 'Спокойный темп, коврики выдаются на месте. Подойдёт любой уровень подготовки.' },

    /* новые форматы панели (B1): по одной сессии на формат, в свободных окнах залов,
       спикеры — существующие демо-персоны без пересечений по времени */
    { id: 'fm01', day: '26.02', time: '11:00', dur: 60, title: 'Мастер-класс: как читать запрос клиента за первые пять минут', format: 'Мастер-класс', hall: 'ballroomB', lever: 'Клиент', speakers: ['krylova', 'safonov'], cap: 200, left: 74, access: 'biz_fc', label: 'Бизнес', desc: 'Эксперты разбирают записи реальных переговоров и показывают приёмы, которые работают в первой части разговора.' },
    { id: 'fm02', day: '27.02', time: '16:30', dur: 60, title: 'Знакомишная: пары по запросам на шестьдесят минут', format: 'Знакомишная', hall: 'ballroomS', lever: 'Собственник', speakers: [], cap: 40, left: 22, access: 'all', label: 'Бизнес', desc: 'Знакомство один на один по методологии «Атлантов»: ведущий собирает пары по запросам участников.' },
    { id: 'fm03', day: '28.02', time: '14:30', dur: 60, title: 'Партнёришная: ищем друг друга для коллабораций', format: 'Партнёришная', hall: 'congress', lever: 'Рост и рынки', speakers: ['smirnova'], cap: 120, left: 55, access: 'biz_fc', label: 'Бизнес', desc: 'Экспресс-формат: короткие презентации запросов, затем свободный поиск партнёров по столам.' },
    { id: 'fm04', day: '27.02', time: '18:00', dur: 60, title: 'Паблик-ток: цена честности в переговорах', format: 'Паблик-ток', hall: 'ballroomB', lever: 'Деньги и маржа', speakers: ['vetrova', 'tarasov'], cap: 150, left: 61, access: 'all', label: 'Бизнес', desc: 'Открытый разговор при зале: когда честность в переговорах работает на сделку, а когда вредит.' },
    { id: 'fm05', day: '28.02', time: '11:00', dur: 60, title: 'Баттл: подрядчик или штат — где граница', format: 'Баттл', hall: 'ballroomB', lever: 'Люди и ИИ', speakers: ['gromov', 'volkov', 'nikitina', 'safonov'], cap: 200, left: 88, access: 'all', label: 'Бизнес', desc: 'Две команды с противоположными позициями спорят на сцене, зал голосует и задаёт вопросы.' },
    { id: 'fm06', day: '28.02', time: '15:00', dur: 90, title: 'Точка сборки: вопросы собственнику крупного холдинга', format: 'Точка сборки', hall: 'magnolia', lever: 'Капитал и защита', speakers: ['soroka', 'belova', 'krylova'], cap: 24, left: 9, access: 'biz_fc', label: 'Бизнес', desc: 'Узкий круг в Магнолии: участники задают свои вопросы топ-предпринимателю в формате предпринимательской гостиной.' },
    { id: 'fm07', day: '28.02', time: '16:00', dur: 18, title: 'ТЭД: три идеи, которые изменят вашу неделю', format: 'ТЭД', hall: 'edelveis', lever: 'Собственник', speakers: ['garipov', 'smirnova', 'tarasov'], cap: 150, left: 66, access: 'all', label: 'Бизнес', desc: 'Три коротких выступления по 18 минут: одна большая идея, личная история и понятный вывод.' },
    { id: 'fm08', day: '27.02', time: '14:30', dur: 90, title: 'Отношеничная: конфликт с партнёром — разбор вживую', format: 'Отношеничная', hall: 'congress', lever: 'Собственник', speakers: ['filippova', 'nikitina'], cap: 100, left: 38, access: 'biz_fc', label: 'Бизнес', desc: 'Участники приносят партнёрские недопонимания и разбирают их в реальном времени с экспертами.' },
    { id: 'fm09', day: '26.02', time: '18:30', dur: 90, title: 'Вечер бизнес-провалов: что пошло не так и сколько стоило', format: 'Вечер бизнес-провалов', hall: 'edelveis', lever: 'Собственник', speakers: ['soroka', 'vetrova', 'krylova', 'safonov', 'tarasov'], cap: 200, left: 97, access: 'all', label: 'Бизнес', desc: 'Предприниматели честно рассказывают про свои провалы: что пошло не так, во что обошлось и какие выводы они сделали.' },
    { id: 'fm10', day: '27.02', time: '16:00', dur: 120, title: 'Синемалогия: «Владелец» — разговор после сеанса', format: 'Синемалогия', hall: 'edelveis', lever: 'Собственник', speakers: ['markov', 'belova'], cap: 200, left: 84, access: 'all', label: 'Бизнес', desc: 'Смотрим фильм вместе, затем разбираем увиденное как кейсы из жизни: решения, отношения и цена выбора.' }
  ];
  NEW_SESSIONS.forEach(function (s) { if (!byId(s.id)) { FIX.SESSIONS.push(s); } });

  /* ---------- 5. метки досуга у всех сессий ----------
     Правила design/05_TAXONOMY, раздел 4: деловые форматы — Бизнес; «Спутник» и детская — Семья; спортивные — Спорт;
     вечерние и игровые — Развлечения. Явные решения (labelSrc: director) заданы таблицей; остальным сессиям метка
     «Бизнес» ставится по умолчанию из формата (labelSrc: default) — в карточке это подписано (FR-PROG-12). */
  var LABEL_BY_ID = {
    s2501: ['Бизнес'], s2502: ['Бизнес'], s2503: ['Развлечения', 'Бизнес'], s2504: ['Бизнес'], s2505: ['Бизнес'],
    s2601: ['Спорт'], s2607: ['Семья'], s2619: ['Развлечения', 'Бизнес'], s2627: ['Бизнес'], s2630: ['Бизнес'], s2635: ['Бизнес', 'Спорт'],
    s2701: ['Бизнес'], s2710: ['Семья', 'Бизнес'], s2715: ['Развлечения', 'Бизнес'], s2716: ['Бизнес'], s27026: ['Семья', 'Спорт'],
    s2801: ['Спорт'], s2806: ['Бизнес', 'Развлечения'], s2817: ['Развлечения'], s2838: ['Развлечения'], s2839: ['Семья'],
    s2628: ['Бизнес'], s2706: ['Бизнес']
  };
  FIX.SESSIONS.forEach(function (s) {
    if (s.label) { if (!s.labelSrc) { s.labelSrc = 'director'; } return; }
    var m = LABEL_BY_ID[s.id];
    if (m) { s.label = m[0]; if (m[1]) { s.label2 = m[1]; } s.labelSrc = 'director'; }
    else { s.label = 'Бизнес'; s.labelSrc = 'default'; }
  });

  /* ---------- 6. спикеры: тариф (Оптимум не выступает в деловой программе) ---------- */
  Object.keys(FIX.SPEAKERS).forEach(function (k) {
    var sp = FIX.SPEAKERS[k];
    if (!sp.tariff) { sp.tariff = sp.mentor ? 'Первый класс' : 'Бизнес'; }
  });

  /* ---------- 7. помощники ---------- */
  function labelsOf(s) { return [s.label, s.label2].filter(Boolean); }
  function isZone(s) { return !!s && s.hall === 'meetups'; }
  function isPractice(s) { return PRACTICES.indexOf(s.format) >= 0; }
  function has(a) { return a && a.length; }

  /* Фильтр программы: общий для C1 (список), C7 (сетка), C2 (счётчик), C4.
     Прежние ключи: day, halls, levers, speakers, formats, groups, booked, avail.
     Новые: practices (список форматов из шести), labels (метки досуга), fav, q (поиск по названию, спикеру, компании);
     day 'all' — все дни. Функции f.isBooked и f.isFav подставляют экраны (записи и избранное из демо). */
  function progFilter(f) {
    f = f || {};
    var isBooked = f.isBooked || FIX.isBooked;
    var isFav = f.isFav || function () { return false; };
    var q = (f.q || '').trim().toLowerCase();
    return FIX.SESSIONS.filter(function (s) {
      if (f.day && f.day !== 'all' && s.day !== f.day) { return false; }
      if (has(f.halls) && f.halls.indexOf(s.hall) < 0) { return false; }
      if (has(f.levers) && f.levers.indexOf(s.lever) < 0) { return false; }
      if (has(f.speakers) && !(s.speakers || []).some(function (k) { return f.speakers.indexOf(k) >= 0; })) { return false; }
      if (has(f.formats) && f.formats.indexOf(s.format) < 0) { return false; }
      if (has(f.practices) && f.practices.indexOf(s.format) < 0) { return false; }
      if (has(f.groups) && f.groups.indexOf(FIX.formatGroup(s.format)) < 0) { return false; }
      if (has(f.labels) && !labelsOf(s).some(function (l) { return f.labels.indexOf(l) >= 0; })) { return false; }
      if (f.booked && !isBooked(s.id)) { return false; }
      if (f.fav && !(isFav(s.id) || isBooked(s.id))) { return false; }
      if (f.avail && !canBook(s)) { return false; }
      if (q) {
        var hay = [s.title, s.desc, s.format, s.lever, (FIX.hall(s.hall) || {}).name]
          .concat((s.speakers || []).map(function (k) { var p = FIX.SPEAKERS[k]; return p ? p.name + ' ' + p.company : ''; }))
          .join(' ').toLowerCase();
        if (hay.indexOf(q) < 0) { return false; }
      }
      return true;
    }).sort(function (a, b) { return (a.day + a.time + a.id).localeCompare(b.day + b.time + b.id); });
  }

  /* ---------- 8. избранное и уведомление о переносе ---------- */
  /* Избранное по умолчанию (вид C4): записи из MY_BOOKINGS попадают туда сами; здесь — дополнительные отметки.
     Для 27.02 два окна с параллельными сессиями (11:00 и 12:30), для 28.02 окно 11:30 без сделанного выбора. */
  var FAV_SEED = {
    ids: ['s2703', 's27019', 's2814', 's2818', 's2806', 'sx04'],
    chosen: ['s2712', 'sx04', 's2806']
  };
  /* Уведомление о переносе избранной сессии (FR-NTF-03, AC-PATH-11): практикум сдвинут на 30 минут */
  var SCHEDULE_NOTICES = [
    { id: 'sn01', sid: 's2705', shiftMin: 30, was: '12:00', now: '12:30', at: '10:42' }
  ];

  /* ---------- 9. хелперы для экранов программы и записей ---------- */
  var ACCESS_LABEL = { biz_fc: 'Бизнес и Первый класс', fc: 'Первый класс', sat: 'Спутник' };
  /* доступ по тарифу: all | biz_fc | fc | sat (AC-PROG-03, D-07, D-26, D-41) */
  function canBook(s, tariff) {
    var t = tariff || FIX.ME.tariff;
    if (!s || s.access === 'all' || !s.access) { return true; }
    if (s.access === 'biz_fc') { return t === 'Бизнес' || t === 'Первый класс'; }
    if (s.access === 'fc') { return t === 'Первый класс'; }
    if (s.access === 'sat') { return t === 'Спутник'; }
    return false;
  }
  /* тип пункта пути по сессии (контракт «+ Путь»): метка Спорт/Семья/Развлечения даёт досуг,
     форматы «Практик» — практику, «нетворкинг» в названии — нетворкинг, остальное — сессию. Согласовано с fx_path (sx — leisure, питч и митап — practice) */
  function pathTypeOf(s) {
    if (!s) { return 'session'; }
    if (s.label === 'Спорт' || s.label === 'Семья' || s.label === 'Развлечения') { return 'leisure'; }
    if (PRACTICES.indexOf(s.format) >= 0) { return 'practice'; }
    if (/нетворкинг/i.test(s.title || '')) { return 'networking'; }
    return 'session';
  }
  function sessionEnd(s) { return FIX.fmtTime(tmin(s.time) + s.dur); }
  /* единая шкала минут: день месяца × 1440 + минуты (все даты издания в феврале) */
  function absMin(day, time) { return parseInt(day, 10) * 1440 + tmin(time); }
  /* состояние сессии относительно демо-момента NOW (27.02 11:10): past — состоялась, live — идёт, future — впереди */
  function sessionState(s) {
    var now = absMin(FIX.NOW.day, FIX.NOW.time), a = absMin(s.day, s.time);
    if (a + s.dur <= now) { return 'past'; }
    return a <= now ? 'live' : 'future';
  }
  /* единое правило отмены записи для C3, D2, D5 (FR-BOOK-04): не позднее чем за 2 часа до начала */
  function canCancel(day, time) {
    var dl = absMin(day, time) - 120, now = absMin(FIX.NOW.day, FIX.NOW.time);
    var dd = Math.floor(dl / 1440), t = FIX.fmtTime(((dl % 1440) + 1440) % 1440);
    var dayStr = (dd < 10 ? '0' + dd : String(dd)) + '.02';
    return { ok: now <= dl, until: t, untilDay: dayStr, text: (dayStr === FIX.NOW.day ? 'сегодня в ' : dayStr + ' в ') + t };
  }
  /* можно ли записаться на сессию: reason — past | live | tariff | full (o.ignoreFull — место из очереди, o.allowLive) */
  function bookCheck(s, o) {
    o = o || {};
    var st = sessionState(s);
    if (st === 'past') { return { ok: false, reason: 'past' }; }
    if (st === 'live' && !o.allowLive) { return { ok: false, reason: 'live' }; }
    if (!canBook(s)) { return { ok: false, reason: 'tariff' }; }
    if (!isZone(s) && s.left === 0 && !o.ignoreFull) { return { ok: false, reason: 'full' }; }
    return { ok: true };
  }
  /* менторское окно: past — прошло, taken — занято, tariff — закрыто для Оптимума */
  function mentorCheck(w) {
    if (w.day < FIX.NOW.day || (w.day === FIX.NOW.day && w.time <= FIX.NOW.time)) { return { ok: false, reason: 'past' }; }
    if (w.taken) { return { ok: false, reason: 'taken' }; }
    if (FIX.ME.tariff === 'Оптимум') { return { ok: false, reason: 'tariff' }; }
    return { ok: true };
  }
  /* параллельные сессии: пересечение по времени в другом зале в тот же день (шире, чем FIX.parallel — только одно время начала) */
  function overlapping(s) {
    var a1 = tmin(s.time), a2 = a1 + s.dur;
    return FIX.SESSIONS.filter(function (x) {
      return x.id !== s.id && x.day === s.day && x.hall !== s.hall && tmin(x.time) < a2 && a1 < tmin(x.time) + x.dur;
    }).sort(function (p, q) { return tmin(p.time) - tmin(q.time) || p.id.localeCompare(q.id); });
  }
  function prevInHall(s) {
    return FIX.SESSIONS.filter(function (x) { return x.id !== s.id && x.day === s.day && x.hall === s.hall && tmin(x.time) + x.dur <= tmin(s.time); })
      .sort(function (a, b) { return tmin(b.time) - tmin(a.time); })[0] || null;
  }
  /* окна менторов: занятость — детерминированная демо-раскладка (около четверти окон занято), окно ME из пути не занято чужими */
  function mentorSlots(key) {
    return FIX.mentorWindows(key).map(function (w, i) {
      var seed = key.length * 7 + key.charCodeAt(0) + parseInt(w.time.slice(0, 2), 10) * 3 + w.table * 5 + parseInt(w.day.slice(0, 2), 10);
      var any = FIX.pathFindAny || FIX.pathFind, mine = any && any('mentor', key, w.day, w.time);
      return { key: key, i: i, day: w.day, time: w.time, table: w.table, taken: !mine && seed % 4 === 0 };
    });
  }

  Object.assign(FIX, {
    PRACTICES: PRACTICES, LABELS: LABELS, FORMAT_INFO: FORMAT_INFO, ACCESS_LABEL: ACCESS_LABEL,
    FORMAT_GROUPS_PANEL: FORMAT_GROUPS_PANEL, formatPanelGroup: formatPanelGroup,
    FAV_SEED: FAV_SEED, SCHEDULE_NOTICES: SCHEDULE_NOTICES,
    progFilter: progFilter, labelsOf: labelsOf, isZone: isZone, isPractice: isPractice,
    canBook: canBook, pathTypeOf: pathTypeOf, sessionEnd: sessionEnd, sessionState: sessionState, canCancel: canCancel, bookCheck: bookCheck, mentorCheck: mentorCheck, overlapping: overlapping, prevInHall: prevInHall,
    mentorSlots: mentorSlots,
    /* ближайшая сессия в том же зале после окончания этой (для «Показать следующую в этом зале») */
    nextInHall: function (s) {
      var end = tmin(s.time) + s.dur;
      return FIX.SESSIONS.filter(function (x) { return x.id !== s.id && x.day === s.day && x.hall === s.hall && tmin(x.time) >= end; })
        .sort(function (a, b) { return tmin(a.time) - tmin(b.time); })[0] || null;
    }
  });
})();
