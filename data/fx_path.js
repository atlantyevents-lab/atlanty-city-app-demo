/* Пункты пути, версии и альтернативы (PATH_ITEMS, PATH_VERSIONS, PATH_ALTS). Каркас F0b, наполнение S2. Расширяет window.FIX (Object.assign). Схемы — design/04_REBUILD_V3.md, часть 5. */
/* Наполнение F0b. Подключается после data/fixtures.js (fx_shared.js не нужен при загрузке).
   Демо-момент: 27.02, 11:10; человек — ME (владелец демо, данные fixtures.js), цели G2 и G6, запрос «Масштабирование».

   Пункт пути: { id, type, ref, day, time, dur, hall, place, title, reason: {kind, text}, source, status, paid?, taskKind? }
   Типы и значение ref:
     session, practice, leisure — id сессии (SESSIONS); practice — только форматы из TAXO.PRACTICE_FORMATS;
     networking — id сессии или id записи ленты с #ивент (FEED_POSTS, вид event);
     mentor     — ключ спикера (SPEAKERS); день и время совпадают с окном в speaker(key).mentor.mw;
     kipatalk   — id экспонента; день и время совпадают с записью в KIPATALK;
     stand      — id экспонента (EXHIBITORS);
     person     — id человека (PEOPLE); buyer — id человека с hb: true (приглашённый покупатель);
     task       — дело дня; taskKind: confirm и note — id сессии, rate — id сессии, reply — id входящей заявки (INCOMING_REQS).
   Поля сверх части 5.4 (отмечены в отчёте F0b): hall — id зала для матрицы переездов (null у дел и там, где зала нет),
   taskKind у дел. day в формате '27.02' (как в SESSIONS), time — 'ЧЧ:ММ', dur — минуты.
   Значения status: suggested — предложен; accepted — принят в путь; booked — запись подтверждена; done — выполнен;
   skipped — пропущен; replaced — заменён. На 27.02 11:10: done — до 11:10; на 25.02 и 26.02 (прошли) — done, skipped, replaced.
   Для фазы B1/pre и экрана A11 значение status у пунктов прошедших дней экран переопределяет на suggested.
   Причина reason.kind: goal («ваша цель: <домен>»), request («ваш запрос: <задача каталога>»), overlap («общее: …» — пересечение
   с профилем или с человеком; формат в таксономии не задан), onsite («на площадке»), self («вы добавили»).
   paid: true — экспонент пакета «Экспо+» или «Премиум»; интерфейс подписывает такие пункты «на площадке».
   Конфликты между пунктами в одном окне (suggested рядом с booked) оставлены намеренно для B4 и B7:
     pi07 — запись из MY_BOOKINGS (D5), статус booked; практикум сдвинут на 30 минут (SCHEDULE_NOTICES), поэтому пересекается с pi06 на 5 минут;
     это умышленный конфликт для B7. Остальные умышленные конфликты: pi33–pi36 (см. ниже), pi18–pi39 (два предложения ИИ: снимается пересборкой). */
(function () {
  'use strict';
  var FIX = window.FIX;
  if (!FIX || !FIX.SESSIONS) { throw new Error('fx_path.js: сначала подключите data/fixtures.js'); }

  /* ---------- причины (каждый раз новый объект) ---------- */
  /* goal — код домена (G2, G6): текст причины читается живьём через PS.whyText (PS.goalTitle), здесь только запасной вариант */
  function why(kind, text, goal) { var o = { kind: kind, text: text }; if (goal) { o.goal = goal; } return o; }
  function g2() { return why('goal', 'ваша цель: Вырасти и масштабировать бизнес', 'G2'); }
  function g6() { return why('goal', 'ваша цель: Окружение: партнёры, клиенты, связи', 'G6'); }
  function rq() { return why('request', 'ваш запрос: Масштабирование'); }
  function on() { return why('onsite', 'на площадке'); }
  function me() { return why('self', 'вы добавили'); }
  function ov(t) { return why('overlap', 'общее: ' + t); }

  function pi(id, type, ref, day, time, dur, hall, place, title, reason, source, status, extra) {
    var o = { id: id, type: type, ref: ref, day: day, time: time, dur: dur, hall: hall, place: place,
              title: title, reason: reason, source: source, status: status };
    if (extra) { Object.keys(extra).forEach(function (k) { o[k] = extra[k]; }); }
    return o;
  }

  var CONGRESS = 'КипяTALK';

  var PATH_ITEMS = [
    /* ---------- 27.02, демо-день (18 пунктов), сейчас 11:10 ---------- */
    pi('pi01', 'session', 's2701', '27.02', '09:00', 60, 'edelveis', 'Эдельвейс',
      'Атланты говорят: как устроен день', on(), 'org', 'skipped'),
    pi('pi02', 'task', 's2704', '27.02', '09:20', 5, null, 'в приложении',
      'Подтвердить запись на гостиную в 11:35', me(), 'ai', 'done', { taskKind: 'confirm' }),
    pi('pi03', 'session', 's2702', '27.02', '10:00', 60, 'congress', CONGRESS,
      'Кейс: маржа в логистике — считаем честно', me(), 'self', 'done'),
    pi('pi04', 'task', 'r1', '27.02', '11:15', 5, null, 'в приложении',
      'Ответить на заявку: Ольга Мартынова', g6(), 'ai', 'suggested', { taskKind: 'reply' }),
    pi('pi05', 'task', 's2702', '27.02', '11:20', 5, null, 'в приложении',
      'Оценить кейс «Маржа в логистике»', me(), 'ai', 'suggested', { taskKind: 'rate' }),
    pi('pi06', 'session', 's2704', '27.02', '11:35', 60, 'magnolia', 'Магнолия',
      'Экспертная гостиная: продажи через партнёрскую сеть', me(), 'self', 'booked'),
    pi('pi07', 'practice', 's2705', '27.02', '12:30', 90, 'doybitsa', 'Дойбица',
      'Практикум: юнит-экономика для нетехнаря', ov('маржа и юнит-экономика'), 'self', 'booked'),
    pi('pi08', 'task', 's2704', '27.02', '12:40', 5, null, 'в приложении',
      'Записать заметку после гостиной', me(), 'ai', 'suggested', { taskKind: 'note' }),
    pi('pi09', 'person', 'p05', '27.02', '12:40', 20, 'magnolia', 'Бизнес-лаунж, Магнолия, 9-й этаж',
      'Кофе: Ольга Мартынова, АгроПарк Южный', g6(), 'ai', 'suggested'),
    pi('pi10', 'person', 'p12', '27.02', '13:00', 30, 'magnolia', 'Бизнес-лаунж, Магнолия, 9-й этаж',
      'Предметный кофе: Михаил Орлов, СтройГрупп', ov('склады'), 'ai', 'accepted'),
    pi('pi11', 'stand', 'ex05', '27.02', '13:45', 15, 'congress', 'Экспо · Зона 3 · Г-02',
      'Стенд «ПерсоналПлюс»: подбор персонала для складов', ov('найм для складов'), 'ai', 'suggested'),
    pi('pi12', 'stand', 'ex01', '27.02', '14:00', 30, 'congress', 'Экспо · Зона 1 · А-12',
      'Встреча на стенде «ТехноСклад»', me(), 'self', 'booked', { paid: true }),
    pi('pi13', 'buyer', 'p02', '27.02', '14:30', 30, 'congress', 'Дойбица · комнаты сделок',
      'Встреча с покупателем: Дмитрий Аврамов, Группа Аврона', g6(), 'ai', 'accepted'),
    pi('pi14', 'stand', 'ex11', '27.02', '15:00', 30, 'congress', 'Экспо · Зона 1 · Б-09',
      'Стенд «Логистик Про»: расчёт доставки по вашему маршруту', rq(), 'ai', 'suggested', { paid: true }),
    pi('pi15', 'mentor', 'soroka', '27.02', '16:00', 30, 'magnolia', 'Магнолия · стол 2',
      'Менторская встреча: Елена Сорока', me(), 'self', 'booked'),
    pi('pi16', 'practice', 's2712', '27.02', '17:00', 60, 'doybitsa', 'Дойбица',
      'Практикум: переговоры о цене — разбор живых кейсов', me(), 'self', 'booked'),
    pi('pi17', 'networking', 'fp12', '27.02', '18:15', 30, 'edelveis', 'Холл Эдельвейса, у кофе-точки',
      'Встреча участников: франшиза и поставщики', me(), 'feed', 'accepted'),
    pi('pi18', 'leisure', 's2715', '27.02', '19:00', 90, 'congress', CONGRESS,
      'Вечерний нетворкинг: бар у Конгресс-центра', g6(), 'ai', 'suggested'),

    /* ---------- 26.02, день 1 (прошёл) ---------- */
    pi('pi19', 'session', 's2602', '26.02', '10:30', 60, 'congress', CONGRESS,
      'Кейс: сеть складов выросла с 3 до 11 точек за два года', me(), 'self', 'done'),
    pi('pi20', 'kipatalk', 'ex01', '26.02', '11:30', 30, 'congress', 'Конгресс-центр · КипяTALK',
      'Круглый стол: WMS без боли — с чего начать', rq(), 'ai', 'done', { paid: true }),
    pi('pi21', 'practice', 's2603', '26.02', '12:00', 60, 'doybitsa', 'Дойбица',
      'Практикум: считаем юнит-экономику за 60 минут', me(), 'self', 'replaced'),
    pi('pi22', 'session', 's2633', '26.02', '12:30', 60, 'sobol', 'Соболь',
      'Экспертная гостиная: MVP за месяц', g2(), 'ai', 'done'),
    pi('pi23', 'networking', 's2619', '26.02', '19:30', 90, 'ballroomB', 'Баллрум (Б)',
      'Вечерний нетворкинг: первый день, итоги', g6(), 'ai', 'done'),

    /* ---------- 25.02, заезд (прошёл) ---------- */
    pi('pi24', 'session', 's2501', '25.02', '12:00', 90, 'edelveis', 'Эдельвейс',
      'Welcome-встреча: как устроен фестиваль', on(), 'org', 'done'),
    pi('pi25', 'networking', 's2502', '25.02', '15:00', 60, 'ballroomB', 'Баллрум (Б)',
      'Нетворкинг заезда: знакомимся до старта', g6(), 'ai', 'done'),
    pi('pi26', 'session', 's2505', '25.02', '16:30', 90, 'congress', CONGRESS,
      'Экскурсия по экспо-зоне: план на три дня', g2(), 'ai', 'done'),
    pi('pi27', 'session', 's2503', '25.02', '18:30', 120, 'congress', CONGRESS,
      'Вечер открытия: слово основателей', on(), 'org', 'done'),

    /* ---------- 28.02, день 3 (впереди) ---------- */
    pi('pi28', 'leisure', 's2801', '28.02', '09:30', 60, 'edelveis', 'Эдельвейс',
      'Утренняя зарядка и дыхание', ov('бег и горные лыжи'), 'ai', 'suggested'),
    pi('pi29', 'networking', 'fp13', '28.02', '10:45', 30, 'edelveis', 'Лобби основного отеля',
      'Встреча участников: упаковка и логистика', me(), 'feed', 'accepted'),
    pi('pi30', 'session', 's2818', '28.02', '11:30', 60, 'congress', CONGRESS,
      'Дискуссия: второй бизнес после первого — когда', g2(), 'ai', 'suggested'),
    pi('pi31', 'mentor', 'levin', '28.02', '14:00', 30, 'magnolia', 'Магнолия · стол 3',
      'Менторская встреча: Роман Левин', ov('логистика и склады'), 'ai', 'suggested'),
    pi('pi32', 'leisure', 's2817', '28.02', '19:00', 90, 'ballroomB', 'Баллрум (Б)',
      'Вечер закрытия: награждение и тосты', on(), 'org', 'suggested')
  ];

  /* ---------- дополнения S2 (только добавления, идентификаторы pi01…pi32 не тронуты) ----------
     pi33…pi36 — пункты, которые человек добавил сам из программы (источник self); они нужны, чтобы все четыре вида
     конфликта (пересечение, мало времени на переход, закрыто по тарифу, мест нет) были на фикстуре, а в таймлайне
     было окно с параллельными вариантами (группа pg01, окно 15:00):
       pi33 — Страт-сессия ss01 (только Первый класс; тариф Бизнес — «закрыто по тарифу»);
       pi34 — гостиная s2711 (мест нет, человек третий в листе ожидания, как в D3);
       pi35, pi36 — параллельные варианты окна 15:00 вместе с pi14 (стенд «Логистик Про»). */
  PATH_ITEMS.push(
    pi('pi33', 'practice', 'ss01', '27.02', '16:30', 90, 'magnolia', 'Магнолия',
      'Страт-сессия: стратегия роста на три года', me(), 'self', 'accepted'),
    pi('pi34', 'session', 's2711', '27.02', '16:00', 60, 'sobol', 'Соболь',
      'Экспертная гостиная: выход на новые регионы', me(), 'self', 'accepted'),
    pi('pi35', 'session', 's2708', '27.02', '15:00', 60, 'edelveis', 'Эдельвейс',
      'Дискуссия: команда под нагрузкой — удержание без бюджета', me(), 'self', 'accepted'),
    pi('pi36', 'practice', 'br01', '27.02', '15:00', 60, 'sobol', 'Соболь',
      'Бизнес-разбор: склад растёт, маржа падает', me(), 'self', 'suggested')
  );

  /* ---------- версии пути ----------
     Состав — id пунктов всей поездки (25–28.02). В каждую версию входят пункты, которые человек уже принял
     (done, booked, accepted) и дела; пропущенные и заменённые не входят. Версии различаются предложенными пунктами.
     pi07 (запись из D5) и добавленные человеком pi33, pi34, pi35 входят во все версии как принятые; их конфликты (B7) умышленные.
     Предложенные пункты pi09 (кофе 12:40) и pi11 (стенд 13:45) в версии не входят: после переноса практикума pi07 на 12:30 они пересекаются с ним, пересборка предлагает им новое время.
     Показатели stats считаются по составу при загрузке (дела не считаются):
       sessions — session, practice, kipatalk; meetings — mentor, person, buyer; stands — stand;
       leisure — leisure и networking; total — пунктов без дел; paid — платных; paidShare — доля платных в процентах. */
  var BASE = ['pi02', 'pi03', 'pi04', 'pi05', 'pi06', 'pi07', 'pi08', 'pi10', 'pi12', 'pi13', 'pi15', 'pi16', 'pi17',
              'pi19', 'pi20', 'pi22', 'pi23', 'pi24', 'pi25', 'pi26', 'pi27', 'pi29', 'pi33', 'pi34', 'pi35'];

  var PATH_VERSIONS = [
    { id: 'pv01', name: 'Максимум бизнеса', labels: ['Бизнес'],
      desc: 'Сессии, стенды и встречи по вашей цели и запросу; нетворкинг и досуг сверх принятых вами в путь не добавляются.',
      items: BASE.concat(['pi14', 'pi30', 'pi31']) },
    { id: 'pv02', name: 'Больше знакомств', labels: ['Бизнес', 'Развлечения'],
      desc: 'Кофе, встречи и вечерние форматы; деловых сессий меньше.',
      items: BASE.concat(['pi14', 'pi18', 'pi31', 'pi32']) },
    { id: 'pv03', name: 'Сбалансированный', labels: ['Бизнес', 'Развлечения', 'Спорт'], isDefault: true,
      desc: 'Бизнес-программа и знакомства плюс утренняя зарядка и вечерние форматы.',
      items: BASE.concat(['pi14', 'pi18', 'pi28', 'pi30']) }
  ];

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) { if (list[i].id === id) { return list[i]; } }
    return undefined;
  }

  function stats(ids) {
    var s = { sessions: 0, meetings: 0, stands: 0, leisure: 0, total: 0, paid: 0, paidShare: 0 };
    ids.forEach(function (id) {
      var it = byId(PATH_ITEMS, id);
      if (!it || it.type === 'task') { return; }
      s.total++;
      if (it.paid) { s.paid++; }
      if (it.type === 'session' || it.type === 'practice' || it.type === 'kipatalk') { s.sessions++; }
      else if (it.type === 'mentor' || it.type === 'person' || it.type === 'buyer') { s.meetings++; }
      else if (it.type === 'stand') { s.stands++; }
      else if (it.type === 'leisure' || it.type === 'networking') { s.leisure++; }
    });
    s.paidShare = s.total ? Math.round(s.paid * 100 / s.total) : 0;
    return s;
  }
  PATH_VERSIONS.forEach(function (v) { v.stats = stats(v.items); });

  /* ---------- альтернативы ----------
     { id, replaces?, type, ref, title, reason, conflict?, day, time, dur, hall, place }
     replaces — id заменяемого пункта; без replaces — свободное предложение (блок «Три возможности на сейчас»).
     conflict: { kind: 'overlap'|'transit'|'seats'|'tariff', with?, text } — главный конфликт с принятыми пунктами или местами.
     day, time, dur, hall, place добавлены, чтобы замена могла создать пункт. */
  var PATH_ALTS = [
    { id: 'pa01', type: 'stand', ref: 'ex07', title: 'Стенд «Эксперт Лизинг»: расчёт платежа по вашему сценарию',
      reason: ov('транспорт и спецтехника'),
      day: '28.02', time: '12:35', dur: 15, hall: 'congress', place: 'Экспо · Зона 2 · В-03' },
    { id: 'pa02', type: 'session', ref: 's27023', title: 'Кейс: выход в новый город за 90 дней',
      reason: g2(),
      conflict: { kind: 'overlap', with: 'pi06', text: 'пересекается с вашей записью: экспертная гостиная в 11:35' },
      day: '27.02', time: '11:30', dur: 60, hall: 'congress', place: CONGRESS },
    { id: 'pa03', replaces: 'pi09', type: 'person', ref: 'p14', title: 'Кофе: Денис Воронов, ТрансЛайн',
      reason: ov('логистика и автопарк'),
      conflict: { kind: 'overlap', with: 'pi07', text: 'пересекается с практикумом «Юнит-экономика» (запись на 12:30)' },
      day: '27.02', time: '12:40', dur: 20, hall: 'magnolia', place: 'Бизнес-лаунж, Магнолия, 9-й этаж' },
    { id: 'pa04', replaces: 'pi07', type: 'session', ref: 's27028', title: 'Дискуссия: partner-каналы — с кем идти в рост',
      reason: g2(),
      conflict: { kind: 'overlap', with: 'pi12', text: 'пересекается со встречей на стенде «ТехноСклад» в 14:00' },
      day: '27.02', time: '13:30', dur: 60, hall: 'congress', place: CONGRESS },
    { id: 'pa05', replaces: 'pi14', type: 'session', ref: 's27040', title: 'Экспертная гостиная: переговоры с закупками',
      reason: ov('работа с закупщиками'),
      conflict: { kind: 'transit', with: 'pi13', text: 'после встречи с покупателем до начала остаётся 0 минут, на переход нужно 13' },
      day: '27.02', time: '15:00', dur: 60, hall: 'magnolia', place: 'Магнолия' },
    { id: 'pa06', replaces: 'pi14', type: 'mentor', ref: 'kovalev', title: 'Менторская встреча: Андрей Ковалёв',
      reason: ov('продажи через партнёрскую сеть'),
      conflict: { kind: 'overlap', with: 'pi35', text: 'пересекается с дискуссией в Эдельвейсе в 15:00 и с экспертной гостиной в Соболе в 16:00' },
      day: '27.02', time: '15:30', dur: 30, hall: 'magnolia', place: 'Магнолия · стол 2' },
    { id: 'pa07', replaces: 'pi30', type: 'session', ref: 's2802', title: 'Кейс: как «КлиентПоток» сократил цикл сделки вдвое',
      reason: g2(),
      conflict: { kind: 'overlap', with: 'pi29', text: 'пересекается со встречей «упаковка и логистика» в 10:45' },
      day: '28.02', time: '10:30', dur: 60, hall: 'congress', place: CONGRESS },
    { id: 'pa08', replaces: 'pi15', type: 'session', ref: 's2711', title: 'Экспертная гостиная: выход на новые регионы',
      reason: g2(),
      conflict: { kind: 'seats', text: 'мест нет: вы третий в листе ожидания' },
      day: '27.02', time: '16:00', dur: 60, hall: 'sobol', place: 'Соболь' }
  ];

  /* Дополнения S2 (pa09…pa14) и ведущего (pa15, pa16: свободные от конфликтов вечерние возможности): добавления для блока «Три возможности на сейчас» и для замен в B6.
     paid — у экспонентов «Экспо+» и «Премиум». Конфликты, которых здесь нет в поле conflict, экран считает сам. */
  PATH_ALTS.push(
    { id: 'pa09', replaces: 'pi07', type: 'practice', ref: 'sm02', title: 'Питч-сессия: решения для склада и логистики за три минуты',
      reason: ov('склады и логистика'),
      conflict: { kind: 'overlap', with: 'pi06', text: 'пересекается с экспертной гостиной в 11:35 на 5 минут' },
      day: '27.02', time: '12:30', dur: 60, hall: 'meetups', place: 'Зона митапов · Экспо' },
    { id: 'pa10', type: 'kipatalk', ref: 'ex02', title: 'Круглый стол: воронка B2B за 30 минут',
      reason: ov('продажи B2B'), paid: true,
      conflict: { kind: 'overlap', with: 'pi06', text: 'пересекается с вашей записью: экспертная гостиная в 11:35' },
      day: '27.02', time: '12:00', dur: 30, hall: 'congress', place: 'Конгресс-центр · КипяTALK' },
    { id: 'pa11', replaces: 'pi34', type: 'practice', ref: 's27025', title: 'Практикум: тест нового рынка на $500',
      reason: g2(),
      conflict: { kind: 'overlap', with: 'pi15', text: 'пересекается с менторской встречей: Елена Сорока в 16:00' },
      day: '27.02', time: '16:00', dur: 60, hall: 'doybitsa', place: 'Дойбица' },
    { id: 'pa12', replaces: 'pi33', type: 'practice', ref: 'sm03', title: 'Митап: логистика и склады — знакомство по теме',
      reason: g6(),
      conflict: { kind: 'overlap', with: 'pi16', text: 'пересекается с практикумом «Переговоры о цене» в 17:00' },
      day: '27.02', time: '17:30', dur: 60, hall: 'meetups', place: 'Зона митапов · Экспо' },
    { id: 'pa13', replaces: 'pi34', type: 'person', ref: 'p14', title: 'Кофе: Денис Воронов, ТрансЛайн',
      reason: ov('логистика и автопарк'),
      conflict: { kind: 'overlap', with: 'pi33', text: 'пересекается со страт-сессией в 16:30' },
      day: '27.02', time: '16:30', dur: 20, hall: 'magnolia', place: 'Бизнес-лаунж, Магнолия, 9-й этаж' },
    { id: 'pa14', type: 'leisure', ref: 'sx03', title: 'Семейный мастер-класс по лепке из глины',
      reason: ov('семья и дети'),
      conflict: { kind: 'overlap', with: 'pi12', text: 'пересекается со встречей на стенде «ТехноСклад» в 14:00' },
      day: '27.02', time: '14:00', dur: 75, hall: 'ballroomS', place: 'Баллрум (С)' },
    { id: 'pa15', type: 'session', ref: 's2716', title: 'Атланты говорят: итоги дня и вопросы спикерам',
      reason: g2(),
      day: '27.02', time: '21:00', dur: 60, hall: 'edelveis', place: 'Эдельвейс' },
    { id: 'pa16', type: 'person', ref: 'p09', title: 'Кофе: Наталья Бурова, Бюро Б',
      reason: g6(),
      day: '27.02', time: '19:30', dur: 20, hall: 'magnolia', place: 'Бизнес-лаунж, Магнолия, 9-й этаж' }
  );

  /* Параллельные варианты в одном окне (избранное по программе, выбор одного; FR-PATH-10, FR-PATH-11).
     chosen — выбранный вариант на старте демо. */
  var PATH_GROUPS = [
    { id: 'pg01', day: '27.02', time: '15:00', options: ['pi35', 'pi14', 'pi36'], chosen: 'pi35' }
  ];

  /* Точка «вы здесь» в демо-момент 27.02 11:10: Эдельвейс (из подсказки Секретаря «на переход хватит 4 минуты»
     до Магнолии, как на прежнем экране «Сегодня»). Фазы: до события (13.02, до фестиваля 12 дней) и после (01.03). */
  var PATH_NOW = { day: '27.02', time: '11:10', hall: 'edelveis', place: 'Эдельвейс' };
  var PATH_PHASES = {
    pre: { date: '13.02', dateLong: '13 февраля', daysTo: 12, focusDay: '26.02' },
    event: { date: '27.02', dateLong: '27 февраля, суббота', time: '11:10' },
    after: { date: '01.03', dateLong: '1 марта', accessDays: 180 }
  };

  /* Люди для знакомства: структурированная причина (kind/text по таксономии), окно для «+ Путь», если пункта ещё нет.
     itemId — существующий пункт пути. Причины не содержат оценок и скрытых сигналов о человеке (FR-AI-06). */
  var PATH_PEOPLE = [
    { id: 'pp01', person: 'p05', itemId: 'pi09', reason: g6() },
    { id: 'pp02', person: 'p12', itemId: 'pi10', reason: ov('склады') },
    { id: 'pp03', person: 'p14', altId: 'pa13', reason: ov('логистика и автопарк'),
      slot: { day: '27.02', time: '16:30', dur: 20, hall: 'magnolia', place: 'Бизнес-лаунж, Магнолия, 9-й этаж' } },
    { id: 'pp04', person: 'p08', reason: ov('дилеры в регионах'),
      slot: { day: '28.02', time: '13:00', dur: 30, hall: 'magnolia', place: 'Бизнес-лаунж, Магнолия, 9-й этаж' } },
    { id: 'pp05', person: 'p01', reason: ov('поставки в федеральные сети'),
      slot: { day: '28.02', time: '13:30', dur: 20, hall: 'magnolia', place: 'Бизнес-лаунж, Магнолия, 9-й этаж' } }
  ];

  /* Решения для вашего запроса (B1): экспонент, причина, связанный пункт или альтернатива.
     Один из трёх платный (ТехноСклад, «Премиум»): человек сам записан на стенд (pi12), подпись «на площадке» обязательна. */
  var PATH_SOLUTIONS = [
    { id: 'ps01', ex: 'ex01', itemId: 'pi12', reason: rq() },
    { id: 'ps02', ex: 'ex05', itemId: 'pi11', reason: ov('найм для складов') },
    { id: 'ps03', ex: 'ex07', altId: 'pa01', reason: ov('транспорт и спецтехника') }
  ];

  /* Подборщик N5: до пяти решений, один платный из пяти (20%, не выше параметра 30%), рядом четыре без платного размещения. */
  var PATH_PICKER = {
    task: 'Нужен подрядчик на автоматизацию склада: приёмка, размещение, сборка.',
    picks: [
      { ex: 'ex01', reason: rq() },
      { ex: 'ex07', reason: ov('складская техника в лизинг') },
      { ex: 'ex03', reason: ov('оборотный капитал на внедрение') },
      { ex: 'ex05', reason: ov('персонал для склада') },
      { ex: 'ex12', reason: ov('налоговая нагрузка склада') }
    ]
  };

  /* Новые типы уведомлений B3 (FR-NTF-07): добавляются к FIX.NOTIF_TYPES при показе. */
  var PATH_NOTIF_TYPES = [
    { id: 'path', name: 'Мой путь: перенос пункта, конфликт, итог пересборки, «выйти за N минут»', def: { wp: 1, tg: 1, sms: 0, em: 0 },
      main: 'Web Push', sample: 'Выйти за 10 минут: экспертная гостиная в Магнолии начнётся в 11:35, идти 4 минуты.' },
    { id: 'feed', name: 'Лента: новости фестиваля, отклики на интро, приглашение в чат', def: { wp: 1, tg: 1, sms: 0, em: 0 },
      main: 'Web Push', hint: 'срочные новости фестиваля придут по резервному каналу, даже если тип выключен',
      sample: 'Изменение в программе: практикум «Юнит-экономика для нетехнаря» сдвинут на 30 минут, начало в 12:30.' },
    { id: 'chat', name: 'Чаты встреч: сообщения, архивация, действия модератора', def: { wp: 1, tg: 0, sms: 0, em: 0 },
      main: 'Web Push', sample: 'Новое сообщение в чате встречи «Франшиза и поставщики».' }
  ];

  /* История запросов к ассистенту (N1, вкладка «История»): режим — из списка режимов ИИ (FR-AI-05). */
  var PATH_AI_HISTORY = [
    { when: 'вчера, 21:05', q: 'Что взять с собой на заезд?', mode: 'FAQ' },
    { when: 'вчера, 20:40', q: 'Собери мне путь на три дня', mode: 'Планировщик пути' },
    { when: '26.02, 09:12', q: 'Кто из участников занимается складской логистикой?', mode: 'Подбор людей' },
    { when: '26.02, 12:30', q: 'Какие стенды помогут снизить расходы на склад?', mode: 'Подборщик решений' }
  ];

  /* Лимит пересборок пути в сутки (FR-PATH-07): заказчик значение не называл, оно зависит от оценки стоимости ИИ (O-23);
     для демо принято 3, в консоли параметр показан как «не задан» (fx_ops, параметр n02). */
  var PATH_LIMITS = { rebuildsPerDay: 3, note: 'значение демо, заказчик не задал' };

  /* Хроникёр (N7): письмо собирается из профиля ME, итогов встречи и договорённостей (MY_RESULTS, S7); фактов вне данных нет.
     Функция читает данные при вызове: fx_profile.js подключается позже fx_path.js. Адресат — человек со встречи, подпись — владелец приложения. */
  function pathChronicle() {
    var R = FIX.MY_RESULTS || {}, ME = FIX.ME;
    var m = (R.meetings || []).filter(function (x) { return x.kind === 'person' && x.status === 'done' && x.day === '27.02'; })[0] || (R.meetings || [])[0];
    var p = m ? FIX.person(m.ref) : null;
    var ag = (R.agreements || []).filter(function (a) { return m && a.who === m.ref && a.owner === 'me'; })[0];
    var first = p ? p.name.split(' ')[0] : 'Коллега';
    var draft = first + ', добрый день! Спасибо за встречу' + (m ? ' ' + m.day + ' в ' + m.time + (m.place ? ' (' + m.place.split(',')[0] + ')' : '') : '') + '. ' +
      (ag ? 'По нашей договорённости: ' + ag.text.charAt(0).toLowerCase() + ag.text.slice(1) + ' до ' + ag.due + '. ' : '') +
      'Если удобно, продолжим разговор после фестиваля. С уважением, ' + ME.name + ', ' + ME.company + '.';
    return {
      to: p ? p.name : '', toCompany: p ? p.company : '', meeting: m ? (p ? p.name + ' · ' : '') + m.time + (m.place ? ' · ' + m.place : '') : '',
      outcome: (m && m.outcome) || 'Было полезно', step: ag ? ag.text.charAt(0).toLowerCase() + ag.text.slice(1) + ' до ' + ag.due : 'договориться о следующей встрече',
      draft: draft, facts: ['встреча ' + (m ? m.day + ' ' + m.time : ''), ag ? 'договорённость: ' + ag.text : '', 'профиль: ' + ME.name + ', ' + ME.company].filter(Boolean)
    };
  }

  /* ---------- помощники ---------- */
  function normDay(day) {
    var m = /^d(\d\d)(\d\d)$/.exec(String(day));
    return m ? m[1] + '.' + m[2] : String(day);
  }

  /* Время перехода между залами в минутах: прямая пара из матрицы переездов или кратчайший путь через промежуточные залы
     (например, Конгресс-центр → Магнолия = 9 + 4 = 13). Матрица читается при первом вызове, когда все fx_*.js уже загружены
     (раздел S3 добавил зону митапов и дополнил travelMin). null — если связи нет. */
  var TRANSIT = null;
  function buildTransit() {
    var ids = (FIX.HALLS || []).map(function (h) { return h.id; });
    var INF = 1e9, T = {};
    ids.forEach(function (a) {
      T[a] = {};
      ids.forEach(function (b) {
        if (a === b) { T[a][b] = 0; return; }
        var d = FIX.travelMin(a, b);
        T[a][b] = (d == null) ? INF : d;
      });
    });
    ids.forEach(function (k) { ids.forEach(function (i) { ids.forEach(function (j) {
      if (T[i][k] + T[k][j] < T[i][j]) { T[i][j] = T[i][k] + T[k][j]; }
    }); }); });
    TRANSIT = { T: T, INF: INF };
  }
  function pathTransit(a, b) {
    if (!a || !b) { return null; }
    if (a === b) { return 0; }
    var direct = FIX.travelMin(a, b);
    if (direct != null) { return direct; }   /* прямая пара матрицы переездов важнее суммы через промежуточные залы */
    if (!TRANSIT) { buildTransit(); }
    var row = TRANSIT.T[a];
    if (!row || row[b] == null || row[b] >= TRANSIT.INF) { return null; }
    return row[b];
  }

  function sessionAny(id) {
    var l = FIX.SESSIONS || [];
    for (var i = 0; i < l.length; i++) { if (l[i].id === id) { return l[i]; } }
    return null;
  }

  function recalcStats() { PATH_VERSIONS.forEach(function (v) { v.stats = stats(v.items); }); }

  /* Подключение сессий sx01, sx02, sx04 раздела S3 (Семья и Развлечения) к пунктам пути и версиям.
     Вызывается экраном B1 при загрузке, когда fx_program.js уже подключён; безопасно вызывать повторно.
     sx03 (14:00) пересекается с записью pi12 в то же время и в версии не входит: она предложена как возможность (pa14). */
  function pathSyncProgram() {
    var map = [['sx01', 'pi37', 'общее: семья и дети'], ['sx02', 'pi38', 'общее: настольные игры'], ['sx04', 'pi39', 'общее: настольные игры']];
    var added = 0;
    map.forEach(function (m) {
      var s = sessionAny(m[0]);
      if (!s || byId(PATH_ITEMS, m[1])) { return; }
      var h = FIX.hall(s.hall);
      PATH_ITEMS.push(pi(m[1], 'leisure', s.id, s.day, s.time, s.dur, s.hall, h ? h.name : '', s.title,
        why('overlap', m[2]), 'ai', 'suggested'));
      added++;
    });
    var v2 = byId(PATH_VERSIONS, 'pv02'), v3 = byId(PATH_VERSIONS, 'pv03');
    [['pi38', v2], ['pi39', v2], ['pi37', v3], ['pi38', v3], ['pi39', v3]].forEach(function (p) {
      if (p[1] && byId(PATH_ITEMS, p[0]) && p[1].items.indexOf(p[0]) < 0) { p[1].items.push(p[0]); added++; }
    });
    if (added) { recalcStats(); }
    return added;
  }

  /* ---------- общий контракт «+ Путь» (все разделы вызывают только его) ----------
     pathFind(type, ref, day?, time?)  — действующий пункт (не skipped, не replaced) или null; session, practice, leisure,
                                         networking считаются одним семейством по id сессии;
     pathAdd(type, ref, opts?)         — добавляет пункт (id вида pu01) source 'self', status 'accepted', причина «вы добавили»; идемпотентно (у существующего suggested ставит accepted);
                                         day, time, dur, title, place, hall, reason, source берутся из сущности и переопределяются opts;
                                         mentor требует opts.day и opts.time (окно), person и buyer без времени ставятся на 27.02 14:00;
                                         возвращает пункт или null (сущность не найдена или не хватает окна);
     pathRemove(id)                    — убирает добавленный в этом сеансе пункт, у остальных ставит status 'skipped';
     PATH_ADDED                        — id пунктов, добавленных в этом сеансе. */
  var PATH_ADDED = [];
  var PATH_FAMILY = { session: 1, practice: 1, leisure: 1, networking: 1 };
  var PATH_FIRM = { accepted: 1, booked: 1, done: 1 };
  /* pathFind — только твёрдые статусы (accepted/booked/done): «В пути» не показывается у предложенного, но не принятого пункта.
     pathFindAny — любой действующий пункт, включая suggested (для «уже предложено»-проверок и идемпотентного pathAdd). */
  function pathFindAny(type, ref, day, time) {
    for (var i = 0; i < PATH_ITEMS.length; i++) {
      var it = PATH_ITEMS[i];
      if (it.status === 'skipped' || it.status === 'replaced' || it.ref !== ref) { continue; }
      if (!(it.type === type || (PATH_FAMILY[it.type] && PATH_FAMILY[type]))) { continue; }
      if ((day && it.day !== day) || (time && it.time !== time)) { continue; }
      return it;
    }
    return null;
  }
  function pathFind(type, ref, day, time) {
    for (var i = 0; i < PATH_ITEMS.length; i++) {
      var it = PATH_ITEMS[i];
      if (!PATH_FIRM[it.status] || it.ref !== ref) { continue; }
      if (!(it.type === type || (PATH_FAMILY[it.type] && PATH_FAMILY[type]))) { continue; }
      if ((day && it.day !== day) || (time && it.time !== time)) { continue; }
      return it;
    }
    return null;
  }
  /* paid: у экспонентов пакетов «Экспо+» и «Премиум» — стенд и кипя-TALK по exponенту,
     у сессий — если у сессии есть платный экспонент; person и buyer — без paid. */
  function isPaidEx(id) {
    var e = id && FIX.exhibitor && FIX.exhibitor(id);
    return !!(e && e.pack && e.pack !== 'Экспо');
  }
  function pathPaid(type, ref, ent) {
    if (type === 'stand') { return isPaidEx(ref); }
    if (type === 'kipatalk') { return isPaidEx(ref) || isPaidEx(ent && ent.ex); }
    if (PATH_FAMILY[type] && ent) {
      var exs = [];
      if (ent.ex) { exs = exs.concat(ent.ex); }
      if (ent.exId) { exs.push(ent.exId); }
      if (ent.exhibitors) { exs = exs.concat(ent.exhibitors); }
      return exs.some(isPaidEx);
    }
    return false;
  }
  function pathAdd(type, ref, o) {
    o = o || {};
    var ex = pathFindAny(type, ref, o.day, o.time);
    if (ex) { if (ex.status === 'suggested') { ex.status = 'accepted'; } return ex; }
    var d = null, h, ent = null;
    if (PATH_FAMILY[type]) {
      var s = sessionAny(ref);
      if (!s) { return null; }
      ent = s;
      h = FIX.hall(s.hall);
      d = { day: s.day, time: s.time, dur: s.dur, hall: s.hall, place: h ? h.name : '', title: s.title };
    } else if (type === 'mentor') {
      var sp = FIX.speaker && FIX.speaker(ref);
      if (!sp || !o.day || !o.time) { return null; }
      h = FIX.hall('magnolia');
      d = { day: o.day, time: o.time, dur: 30, hall: 'magnolia', place: h ? h.name : 'Магнолия', title: 'Менторская встреча: ' + sp.name };
    } else if (type === 'kipatalk') {
      var kt = null;
      (FIX.KIPATALK || []).forEach(function (k) { if (!kt && k.ex === ref && (!o.day || k.day === o.day) && (!o.time || k.time === o.time)) { kt = k; } });
      if (!kt) { return null; }
      ent = kt;
      d = { day: kt.day, time: kt.time, dur: kt.dur, hall: null, place: 'КипяTALK · Экспо', title: kt.title };
    } else if (type === 'stand') {
      var xe = FIX.exhibitor && FIX.exhibitor(ref);
      if (!xe) { return null; }
      ent = xe;
      d = { day: '27.02', time: '12:30', dur: 15, hall: null, place: 'Экспо', title: 'Стенд: ' + xe.name };
    } else if (type === 'person' || type === 'buyer') {
      var pe = FIX.person && FIX.person(ref);
      if (!pe) { return null; }
      ent = pe;
      d = { day: '27.02', time: '14:00', dur: 15, hall: null, place: 'Нетворкинг-зона', title: (type === 'buyer' ? 'Встреча с покупателем: ' : 'Знакомство: ') + pe.name };
    } else { return null; }
    ['day', 'time', 'dur', 'title', 'place', 'hall'].forEach(function (k) { if (o[k] != null) { d[k] = o[k]; } });
    var n = PATH_ADDED.length + 1, id;
    do { id = 'pu' + (n < 10 ? '0' : '') + n; n++; } while (byId(PATH_ITEMS, id));
    var item = pi(id, type, ref, d.day, d.time, d.dur, d.hall, d.place, d.title,
      o.reason || why('self', 'вы добавили'), o.source || 'self', 'accepted',
      pathPaid(type, ref, ent) ? { paid: true } : null);
    PATH_ITEMS.push(item);
    PATH_ADDED.push(id);
    return item;
  }
  function pathRemove(id) {
    var i = PATH_ADDED.indexOf(id), it = byId(PATH_ITEMS, id);
    if (!it) { return false; }
    if (i >= 0) { PATH_ADDED.splice(i, 1); PATH_ITEMS.splice(PATH_ITEMS.indexOf(it), 1); } else { it.status = 'skipped'; }
    return true;
  }

  /* ---------- отказы человека (FR-PATH-08) ----------
     «Убрать и больше не предлагать» (B6), «Скрыть» (N6), пункты, снятые решением конфликта (B7) и пересборкой.
     Ключ type:ref; семейство session/practice/leisure/networking сведено к session, buyer — к person.
     Все предложения раздела «Мой путь и ИИ» (B1, N1, N5, N6, «Три возможности», замены) пропускают такие сущности;
     сброс — pathResetDismissed (кнопка «Сбросить отказы» в B3). */
  var PATH_DISMISSED = {};
  function dismissKey(type, ref) {
    var t = PATH_FAMILY[type] ? 'session' : (type === 'buyer' ? 'person' : type);
    return t + ':' + ref;
  }
  function pathDismiss(type, ref) { PATH_DISMISSED[dismissKey(type, ref)] = true; }
  function pathDismissed(type, ref) { return !!PATH_DISMISSED[dismissKey(type, ref)]; }
  function pathResetDismissed() {
    var n = Object.keys(PATH_DISMISSED).length;
    Object.keys(PATH_DISMISSED).forEach(function (k) { delete PATH_DISMISSED[k]; });
    return n;
  }

  Object.assign(window.FIX, {
    PATH_DISMISSED: PATH_DISMISSED,
    pathDismiss: pathDismiss,
    pathDismissed: pathDismissed,
    pathResetDismissed: pathResetDismissed,
    PATH_ADDED: PATH_ADDED,
    pathFind: pathFind,
    pathFindAny: pathFindAny,
    pathAdd: pathAdd,
    pathRemove: pathRemove,
    PATH_ITEMS: PATH_ITEMS,
    PATH_VERSIONS: PATH_VERSIONS,
    PATH_ALTS: PATH_ALTS,
    PATH_GROUPS: PATH_GROUPS,
    PATH_NOW: PATH_NOW,
    PATH_PHASES: PATH_PHASES,
    PATH_PEOPLE: PATH_PEOPLE,
    PATH_SOLUTIONS: PATH_SOLUTIONS,
    PATH_PICKER: PATH_PICKER,
    PATH_NOTIF_TYPES: PATH_NOTIF_TYPES,
    PATH_AI_HISTORY: PATH_AI_HISTORY,
    PATH_LIMITS: PATH_LIMITS,
    pathChronicle: pathChronicle,
    pathItem: function (id) { return byId(PATH_ITEMS, id); },
    pathItems: function (day) {
      var d = normDay(day);
      return PATH_ITEMS.filter(function (it) { return it.day === d; })
        .sort(function (a, b) { return a.time < b.time ? -1 : a.time > b.time ? 1 : (a.id < b.id ? -1 : 1); });
    },
    pathVersion: function (id) { return byId(PATH_VERSIONS, id); },
    pathAlt: function (id) { return byId(PATH_ALTS, id); },
    pathTransit: pathTransit,
    pathSyncProgram: pathSyncProgram
  });
})();
