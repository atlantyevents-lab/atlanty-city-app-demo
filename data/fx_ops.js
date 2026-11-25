/* Параметры консоли, статистика допуска, модерация, ИИ-режимы. Владелец S8. Расширяет window.FIX (Object.assign). Схемы — design/04_REBUILD_V3.md, часть 5. */
/* Наполнение S8. Подключается после data/fixtures.js, fx_shared.js, fx_path.js, fx_feed.js (данные людей, пакетов, чатов и записей ленты берутся оттуда).
   Все цифры — демонстрационные; там, где заказчик значение не назвал, стоит null и подпись «не задано» / «ждём оценку Руслана».
   Содержимое:
     SHIFTS, VOLUNTEERS, HALL_ASSIGN, HALL_IDS, O5_ME — смены и волонтёры-админы залов (D-48, FR-CHK-07), двое на смену;
     HALL_FLOW, HALL_GUESTS — вход и выход из залов (счётчик «в зале сейчас» = входы минус выходы), гости для сканера O5;
     MOD_ROLES, MOD_QUEUE, MOD_REASONS, AUDIT — модерация ленты, интро и чатов (D-33, D-54, FR-ADM-07);
     AI_MODES, AI_TOTAL — девять режимов ИИ (FR-ADM-09, FR-AI-05…09), бюджет и стоимость не заданы;
     PARAMS_V3, B2B_ZONE — параметры новых модулей (FR-ADM-08) и нетворкинг-зона B2B (D-55);
     ONB_FUNNEL, PF — воронка входа (FR-ANL-10) и план-факт путей (FR-ANL-07);
     вспомогательные функции opsInside, opsHallSession, opsVolunteer, opsAudit, pfSum, pfRows, pfSample. */
(function () {
  'use strict';
  window.FIX = window.FIX || {};
  var FIX = window.FIX;
  if (!FIX.HALLS || !FIX.PEOPLE) { throw new Error('fx_ops.js: сначала подключите data/fixtures.js'); }

  function t2m(t) { var p = String(t).split(':'); return Number(p[0]) * 60 + Number(p[1]); }
  function m2t(m) { return String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0'); }

  /* ================= смены и волонтёры-админы залов (D-48, FR-CHK-07) ================= */

  var SHIFTS = [
    { id: 'sh1', label: 'Смена 1', from: '09:00', to: '14:00' },
    { id: 'sh2', label: 'Смена 2', from: '14:00', to: '19:00' },
    { id: 'sh3', label: 'Смена 3', from: '19:00', to: '22:00' }
  ];
  var HALL_IDS = ['congress', 'edelveis', 'magnolia', 'ballroomB', 'ballroomS', 'doybitsa', 'sobol', 'shosha'];

  /* Имена вымышленные: семь мужских и семь женских имён, три фамилии каждого рода; сочетания не повторяются. */
  var MN = ['Егор', 'Тимофей', 'Артур', 'Глеб', 'Матвей', 'Даниил', 'Фёдор'];
  var ML = ['Лаптев', 'Бережной', 'Мельников'];
  var FN = ['Алина', 'Вера', 'Полина', 'Яна', 'Ульяна', 'Кира', 'Злата'];
  var FL = ['Панина', 'Федотова', 'Зуева'];
  var VOLUNTEERS = [];
  var HALL_ASSIGN = {};
  SHIFTS.forEach(function (sh, s) {
    HALL_ASSIGN[sh.id] = {};
    HALL_IDS.forEach(function (h, i) {
      var a = { id: 'v' + s + i + '0', name: MN[i % MN.length] + ' ' + ML[(i + s) % 3] };
      var b = { id: 'v' + s + i + '1', name: FN[(i + 2) % 7] + ' ' + FL[(i + s) % 3] };
      VOLUNTEERS.push(a, b);
      HALL_ASSIGN[sh.id][h] = [a.id, b.id];
    });
  });
  /* резерв: волонтёры без назначения на эту смену */
  ['Лев Мельников', 'Мирон Лаптев', 'Ева Панина', 'Алиса Зуева', 'Ника Федотова', 'Богдан Бережной'].forEach(function (n, i) {
    VOLUNTEERS.push({ id: 'vr' + (i + 1), name: n });
  });
  /* волонтёр, чьё устройство открыто в сканере зала O5: смена 1, зал Магнолия */
  var O5_ME = { vol: 'v020', shift: 'sh1', hall: 'magnolia' };

  function opsVolunteer(id) {
    for (var i = 0; i < VOLUNTEERS.length; i++) { if (VOLUNTEERS[i].id === id) { return VOLUNTEERS[i]; } }
    return undefined;
  }

  /* ================= вход и выход из залов ================= */

  /* Накопленные за день (27.02, 11:10) отметки сканеров залов считаются из программы дня, чтобы не расходиться с ней:
     завершённая сессия — вошли все записавшиеся (вместимость минус осталось мест), вышли все, кроме 0–2 задержавшихся;
     идущая — вошли 97% записавшихся, никто не вышел; начинающаяся в ближайшие 30 минут — вошла малая часть.
     «В зале сейчас» = вошло − вышло (AC-CHK-07). Зона митапов (вместимость «по записи») сканерами залов не охвачена. */
  /* вошло по сессии на демо-момент: state — ended | now | soon | later */
  function opsSessionEntered(s) {
    var now = t2m(FIX.NOW.time), booked = Math.max(0, (s.cap || 0) - (s.left || 0)), start = t2m(s.time), end = start + s.dur;
    if (end <= now) { return { state: 'ended', booked: booked, entered: booked }; }
    if (start <= now) { return { state: 'now', booked: booked, entered: Math.round(booked * 0.97) }; }
    if (start - now <= 30) { return { state: 'soon', booked: booked, entered: Math.min(Math.round(booked * 0.08), 40) }; }
    return { state: 'later', booked: booked, entered: 0 };
  }
  var HALL_FLOW = {};
  (function seedFlow() {
    var day = FIX.NOW.day;
    HALL_IDS.forEach(function (h) {
      var list = FIX.SESSIONS.filter(function (s) { return s.day === day && s.hall === h; })
        .sort(function (a, b) { return t2m(a.time) - t2m(b.time); });
      var entered = 0, exited = 0, k = 0;
      list.forEach(function (s) {
        var e = opsSessionEntered(s);
        entered += e.entered;
        if (e.state === 'ended') { exited += e.entered - (k % 3); k += 1; }
      });
      HALL_FLOW[h] = { entered: entered, exited: exited };
    });
  })();
  function opsInside(hallId) {
    var f = HALL_FLOW[hallId];
    return f ? f.entered - f.exited : 0;
  }
  /* сессия зала на демо-момент: идущая сейчас или ближайшая; { s, state: 'now'|'next'|'none' } */
  function opsHallSession(hallId) {
    var now = t2m(FIX.NOW.time), day = FIX.NOW.day;
    var list = FIX.SESSIONS.filter(function (s) { return s.day === day && s.hall === hallId; })
      .sort(function (a, b) { return t2m(a.time) - t2m(b.time); });
    var cur = list.filter(function (s) { return t2m(s.time) <= now && now < t2m(s.time) + s.dur; })[0];
    if (cur) { return { s: cur, state: 'now' }; }
    var nxt = list.filter(function (s) { return t2m(s.time) > now; })[0];
    return nxt ? { s: nxt, state: 'next' } : { s: null, state: 'none' };
  }

  /* Гости для сканера зала: id человека из PEOPLE или 'me'; inside — находится ли в зале до начала демонстрации. */
  var HALL_GUESTS = [
    { id: 'me', inside: false },
    { id: 'p02', inside: true },
    { id: 'p06', inside: true },
    { id: 'p04', inside: false },
    { id: 'p11', inside: false },
    { id: 'p17', inside: false }
  ];

  /* ================= модерация (D-33, D-54, FR-ADM-07, FR-FEED-10, FR-CHAT-06) ================= */

  var MOD_ROLES = [
    { id: 'chief', name: 'Главный модератор', sees: 'feed',
      note: 'Один на фестиваль. Видит очередь ленты и интро и жалобы на записи.' },
    { id: 'duty', name: 'Дежурный', sees: 'feed',
      note: 'Из команды организаторов. Те же очередь и действия, что у главного модератора.' },
    { id: 'chats', name: 'Группа админов чатов', sees: 'chat',
      note: 'Назначается отдельно. Видит только чаты встреч; очередь ленты ей недоступна.' }
  ];
  var MOD_REASONS = {
    feed: ['Реклама в интро', 'Внешняя ссылка или телефон', 'Нет срока или условий предложения', 'Утверждение без источника', 'Другое'],
    chat: ['Реклама', 'Оскорбление', 'Спам', 'Другое']
  };

  /* area: feed — очередь главного модератора и дежурного; chat — очередь группы админов чатов.
     kind: ad — пост экспонента до публикации (премодерация); intro — первое интро автора до публикации;
           complaint — жалоба на уже опубликованную запись (postId из FEED_POSTS);
           chat-msg — жалоба на сообщение чата, chat-user — жалоба на участника чата (chatId и msg из CHATS).
     status: pending — ждёт решения; approved — одобрено; returned — возвращено с причиной; removed — удалено с уведомлением.
     Для чатов решение хранится в status: done, в act — выбранное действие. */
  var MOD_QUEUE = [
    { id: 'mq01', area: 'feed', kind: 'ad', exh: 'ex02', subject: 'company', tag: 'Решения для роста бизнеса', time: '10:48', status: 'pending',
      text: 'КлиентПоток разбирает воронку B2B-продаж на стенде Б-04: приносите свои цифры по этапам, и мы покажем, где теряются заявки. Разбор занимает 20 минут, запись у стенда.' },
    { id: 'mq02', area: 'feed', kind: 'ad', exh: 'ex06', subject: 'person', tag: 'Решения для роста бизнеса', time: '10:31', status: 'pending',
      text: 'Павел Нестеров, руководитель внедрений «ИнтеллектОпс», в 16:30 показывает на стенде А-20, как автоматизировать приём заявок без найма людей. Принесите описание своего процесса, разберём его на месте.' },
    { id: 'mq03', area: 'feed', kind: 'ad', exh: 'ex11', subject: 'company', tag: 'Решения для роста бизнеса', time: '10:12', status: 'pending',
      text: 'Логистик Про считает доставку по вашему маршруту на стенде Б-09 в Зоне 1: приносите адреса и объёмы, расчёт готов за 15 минут. По итогам вы получите сравнение трёх вариантов.' },
    { id: 'mq04', area: 'feed', kind: 'intro', person: 'p07', tags: [], time: '10:55', status: 'pending',
      text: 'Виктория, детский центр «Радуга», двенадцать филиалов. Ищу CRM для записи детей и учёта абонементов, хочу сверить опыт с теми, кто уже внедрял такую систему.' },
    { id: 'mq05', area: 'feed', kind: 'intro', person: 'p10', tags: ['#запрос'], time: '10:37', status: 'pending',
      text: 'Ищу агротех-проекты для инвестиций и пилот на полях юга: готов дать площадку и данные по дронам. Подробности расскажу на встрече.' },
    { id: 'mq06', area: 'feed', kind: 'complaint', postId: 'fp11', reason: 'Реклама', count: 2, time: '10:20', status: 'pending',
      text: 'Похоже на рекламу услуг компании.' },
    { id: 'mq07', area: 'feed', kind: 'complaint', postId: 'fp08', reason: 'Другое', count: 1, time: '09:52', status: 'pending',
      text: 'Утверждение «в три раза» дано без источника.' },
    { id: 'mc01', area: 'chat', kind: 'chat-msg', chatId: 'ch01', msg: 4, reason: 'Реклама', time: '10:44', status: 'pending', act: null },
    { id: 'mc02', area: 'chat', kind: 'chat-msg', chatId: 'ch02', msg: 2, reason: 'Реклама', time: '10:26', status: 'pending', act: null },
    { id: 'mc03', area: 'chat', kind: 'chat-user', chatId: 'ch03', person: 'p06', reason: 'Спам', time: '09:58', status: 'pending', act: null }
  ];

  /* Журнал аудита консоли (FR-ADM-03): утренние записи берутся из опубликованных постов ленты. */
  var AUDIT = [];
  var auditMin = 0;
  function opsAudit(who, what, reason, before, after) {
    auditMin += 1;
    var e = { t: m2t(t2m(FIX.NOW.time) + auditMin), who: who, what: what, reason: reason || '', before: before == null ? '' : before, after: after == null ? '' : after };
    AUDIT.unshift(e);
    return e;
  }
  function seedAudit() {
    var posts = (FIX.FEED_POSTS || []).filter(function (p) { return p.kind === 'ad'; });
    posts.sort(function (a, b) { return t2m(a.time) - t2m(b.time); });
    posts.forEach(function (p) {
      var ex = p.author.type === 'partner'
        ? (FIX.PARTNERS || []).filter(function (x) { return x.id === p.author.ref; })[0]
        : FIX.exhibitor(p.author.ref);
      AUDIT.unshift({ t: p.time, who: 'Главный модератор',
        what: 'Одобрен пост «' + (ex ? ex.name : p.author.ref) + '» ' + (p.author.type === 'partner' ? 'партнёра' : p.subject === 'person' ? 'о человеке' : 'о компании'),
        reason: '', before: 'на проверке', after: 'опубликован' });
    });
    AUDIT.unshift({ t: '09:50', who: 'Дежурный', what: 'Возвращён пост «ЭнергоЭффект» о компании',
      reason: 'Не указан срок специального предложения', before: 'на проверке', after: 'возвращён с причиной' });
    AUDIT.sort(function (a, b) { return t2m(b.t) - t2m(a.t); });
  }
  seedAudit();

  /* ================= ИИ: девять режимов (FR-ADM-09, FR-AI-05…09) ================= */

  /* limit и budget: null — не задано (общий лимит человека 30 запросов в сутки, TZ_00 раздел 4, действует вместе с лимитом режима).
     Бюджет в токенах и оценку стоимости до оценки Руслана не заполняем (FR-AI-08, O-23). fb — переключатель «замена без ИИ»:
     пока бюджета нет, режим не включается в production, и замена включена всегда. gate — порог выпуска из TZ_03, раздел AI. */
  var AI_MODES = [
    { id: 'diag', name: 'Диагност', code: 'AI-DIAG',
      does: 'Разбирает свободные ответы диагностики в поля цели, запроса, отрасли и пользы',
      fallback: 'Форма', gate: '50 ответов, не менее 90% верно разобранных полей (предложение)' },
    { id: 'pitch', name: 'Автор питча', code: 'AI-PITCH',
      does: 'Готовит черновик интро по профилю; публикует только человек',
      fallback: 'Шаблон питча с подстановкой полей профиля', gate: '40 профилей, ни одного выдуманного факта (предложение)' },
    { id: 'plan', name: 'Планировщик пути', code: 'AI-NAV',
      does: 'Версии пути с причинами; жёсткие ограничения считает планировщик правил',
      fallback: 'Правила по рычагу, тарифу, цели и запросу', gate: 'Жёсткие ограничения нарушены в 0% тестов; доля платных не выше параметра' },
    { id: 'match', name: 'Подбор людей', code: 'AI-MATCH',
      does: 'Рекомендует людей с причиной; оценка совпадения участнику не показывается',
      fallback: 'Подборка по тегам', gate: 'Не менее 70% релевантных в первой пятёрке на выборке из 50 профилей' },
    { id: 'pick', name: 'Подборщик решений', code: 'AI-PICK',
      does: 'Шорт-лист из пяти экспонентов с причинами по каталогу',
      fallback: 'Фильтр по задаче каталога', gate: '30 задач, не менее 70% релевантных' },
    { id: 'srch', name: 'Умный поиск', code: 'AI-SRCH',
      does: 'Разбирает обычную фразу в фильтры и подборку по запросу',
      fallback: 'Поиск по полям', gate: '30 фраз, не менее 80% релевантных (предложение)' },
    { id: 'sec', name: 'Секретарь', code: 'AI-SEC',
      does: 'Сводки в 08:00 и 19:00, альтернативы при переносе, напоминания',
      fallback: 'Правила и очередь', gate: 'Все предложения в тестах выполнимы без конфликтов' },
    { id: 'faq', name: 'FAQ', code: 'AI-FAQ',
      does: 'Отвечает по базе знаний с источником; не знает — передаёт организатору',
      fallback: 'Поиск по FAQ', gate: '60 сценариев, не менее 90% верных, 100% по правам доступа' },
    { id: 'chr', name: 'Хроникёр', code: 'AI-CHR',
      does: 'Итог встречи и черновик письма по заметкам самого человека',
      fallback: 'Шаблон', gate: 'Нет выдуманных фактов на 40 примерах' }
  ];
  /* cost — оценка стоимости (₽ в сутки), on — режим включён в production (нельзя при budget === null, AC-AI-13); оба вносит администратор на экране P10 */
  AI_MODES.forEach(function (m) { m.limit = null; m.budget = null; m.cost = null; m.on = false; m.fb = true; });
  var AI_TOTAL = { perPerson: 30, budget: null };

  /* ================= параметры новых модулей (FR-ADM-08, таблица в TZ_03, раздел ADM) ================= */

  /* status: set — задано решением заказчика; suggested — предложено, согласовать; clarify — уточнить; unset — не задано.
     kind: pct, int, hours, text, fixed (правило без редактирования). */
  function packQuota(name) {
    var k = FIX.pack ? FIX.pack(name) : undefined;
    if (!k) { return '—'; }
    var n = k.posts.company + k.posts.person;
    return n === 0 ? '0' : n === 1 ? '1 пост о компании' : '2: о компании и о человеке';
  }
  var PARAMS_V3 = [
    { id: 'n01', group: 'path', name: 'Доля платных пунктов в пути', value: '30%', status: 'suggested', who: 'менеджер Экспо', ref: 'FR-PATH-06 · O-27', kind: 'pct',
      note: 'значение предложено, согласовать' },
    { id: 'n02', group: 'path', name: 'Число пересборок пути в сутки', value: null, status: 'unset', who: 'админ', ref: 'FR-PATH-07 · O-23', kind: 'int',
      note: 'зависит от оценки Руслана' },
    { id: 'n03', group: 'path', name: 'Лимит запросов к ИИ на человека в сутки (общий)', value: '30', status: 'set', who: 'админ', ref: 'FR-AI-07 · TZ_00', kind: 'int',
      note: 'лимиты по режимам — на экране P10' },
    { id: 'n04', group: 'feed', name: 'Квота постов: «Экспо»', value: packQuota('Экспо'), status: 'set', who: 'менеджер Экспо', ref: 'FR-ACC-12 · решение заказчика', kind: 'fixed',
      note: 'постов нет' },
    { id: 'n05', group: 'feed', name: 'Квота постов: «Экспо+»', value: packQuota('Экспо+'), status: 'set', who: 'менеджер Экспо', ref: 'FR-ACC-12 · D-40', kind: 'fixed', note: '' },
    { id: 'n06', group: 'feed', name: 'Квота постов: «Премиум»', value: packQuota('Премиум'), status: 'set', who: 'менеджер Экспо', ref: 'FR-ACC-12 · D-40', kind: 'fixed', note: '' },
    { id: 'n07', group: 'feed', name: 'Срок жизни записи в ленте', value: null, status: 'unset', who: 'модератор', ref: 'FR-FEED-08', kind: 'hours', note: '' },
    { id: 'n08', group: 'feed', name: 'Длина записи ленты и число записей в сутки', value: null, status: 'unset', who: 'модератор', ref: 'FR-FEED-05', kind: 'text', note: '' },
    { id: 'n09', group: 'feed', name: 'Лимиты чата: длина сообщения, частота, число участников по умолчанию', value: null, status: 'unset', who: 'группа админов чатов', ref: 'FR-CHAT-03', kind: 'text', note: '' },
    { id: 'n10', group: 'hall', name: 'Волонтёров-сканеров на смену в зале', value: '2', status: 'set', who: 'администратор', ref: 'FR-CHK-07 · D-48', kind: 'int',
      note: 'назначение — в таблице «Волонтёры залов» ниже' },
    { id: 'n11', group: 'hall', name: 'Срок заблаговременного уведомления о сканировании залов', value: null, status: 'unset', who: 'модератор', ref: 'FR-CHK-08', kind: 'hours',
      note: 'заказчик срок не называл' },
    { id: 'n12', group: 'hall', name: 'Порог раннего выхода из зала', value: null, status: 'unset', who: 'программная дирекция', ref: 'FR-ANL-08', kind: 'text',
      note: 'в разговоре назван диапазон 5–15 минут, значение не утверждено' },
    { id: 'n13', group: 'match', name: 'Подбор людей и решений: отказ от подбора', value: 'отказа нет', status: 'set', who: 'правило продукта', ref: 'FR-AI-06 · D-46', kind: 'fixed',
      note: 'подбор работает на лету, оценка совпадения участнику не показывается' },
    { id: 'n14', group: 'match', name: 'Размер подборки «Предметный кофе»', value: '8–10', status: 'suggested', who: 'админ', ref: 'FR-PPL-09', kind: 'text', note: 'значение демо v3, согласовать' },
    { id: 'n15', group: 'match', name: 'Число людей в подборке по запросу', value: '5–8', status: 'suggested', who: 'админ', ref: 'FR-SRCH-05', kind: 'text', note: 'значение демо v3, согласовать' },
    { id: 'n16', group: 'match', name: 'Приоритет выдачи по пакету', value: 'включён', status: 'suggested', who: 'менеджер Экспо', ref: 'FR-EXPO-12', kind: 'text', note: 'включён по design/04, согласовать' },
    { id: 'n17', group: 'prog', name: 'Запись на питч-сессии в зоне митапов', value: 'RSVP без лимита', status: 'suggested', who: 'менеджер программы', ref: 'FR-PROG-14', kind: 'text', note: 'предложение' },
    { id: 'n18', group: 'prog', name: 'Состав фильтра «Практики»', value: 'шесть форматов', status: 'clarify', who: 'менеджер программы', ref: 'FR-PROG-13 · O-20', kind: 'fixed',
      note: 'страт-сессия, бизнес-разбор, питч-сессия, практикум, развлекательный практикум, митап; подтвердить' },
    { id: 'n19', group: 'data', name: 'Сроки хранения: сообщения чатов, отметки входа и выхода, черновики питча, история диалога с ИИ', value: null, status: 'unset', who: 'админ', ref: 'O-33', kind: 'text',
      note: 'определяет юрист' },
    { id: 'n20', group: 'prog', name: 'Формат КипяTALK: камерные сектора', value: '4 сектора по 125 мест', status: 'suggested', who: 'менеджер программы', ref: 'решение заказчика · панель 24.11', kind: 'text',
      note: 'без общей сцены; предложено, согласовать' },
    { id: 'n21', group: 'feed', name: 'Квота записей: партнёры фестиваля', value: '1 запись в ленте + пуши', status: 'set', who: 'менеджер Экспо', ref: 'FR-ACC-12 · решение заказчика', kind: 'fixed',
      note: 'число пушей — по договору с партнёром' }
  ];
  var PARAM_GROUPS = [['all', 'Все'], ['path', 'Мой путь и ИИ'], ['feed', 'Лента и чаты'], ['hall', 'Допуск и залы'], ['match', 'Подбор и поиск'], ['prog', 'Программа'], ['data', 'Данные']];

  /* нетворкинг-зона B2B (D-55, FR-MEET-15): значения заказчик не называл, зона участникам не показывается, пока не заполнены место и столы */
  var B2B_ZONE = [
    { id: 'cap', label: 'Вместимость', value: null },
    { id: 'place', label: 'Место', value: null },
    { id: 'brand', label: 'Брендирование', value: null },
    { id: 'tables', label: 'Номера столов', value: null }
  ];

  /* ================= воронка входа (FR-ANL-10) ================= */

  /* Демо-значения; «Путь принят» равен числу участников с путём в плане-факте (PF.people). */
  var ONB_FUNNEL = {
    steps: [
      { label: 'Вход в приложение (активация билета)', v: FIX.DASH.activations.done },
      { label: 'Шаг 1 из 3: кто вы', v: 1575 },
      { label: 'Шаг 2 из 3: цель', v: 1498 },
      { label: 'Шаг 3 из 3: запрос', v: 1453 },
      { label: 'Путь принят', v: 1412 }
    ],
    side: [
      { label: 'Установили на экран', v: 1175 },
      { label: 'Разрешили push', v: 1018 },
      { label: 'Начали «Усилить путь»', v: 612 },
      { label: 'Выполнили хотя бы один шаг', v: 468 },
      { label: 'Прошли все 10 шагов', v: 37 }
    ],
    median: '2 мин 40 с'
  };

  /* ================= план-факт путей (FR-ANL-07, FR-PATH-16) ================= */

  /* Запланировано — пункты, принятые в путь (принят, записан, выполнен, пропущен, заменён).
     Выполнено — по отметке прихода (сканер зала, отметка на встрече, посещение стенда) или вручную; впереди — окно ещё не наступило.
     Все срезы суммируются из ячеек «день × тип × зал», поэтому итоги по дням, залам и типам совпадают. */
  var PF_DAYS = ['25.02', '26.02', '27.02', '28.02'];
  var PF_PEOPLE_DAY = { '25.02': 1038, '26.02': 1396, '27.02': 1412, '28.02': 1412 };
  var PF_PEOPLE = 1412;
  var PF_PROFILE = {
    '25.02': { done: 0.86, rep: 0.04, skip: 0.10 },
    '26.02': { done: 0.78, rep: 0.06, skip: 0.16 },
    '27.02': { done: 0.17, rep: 0.012, skip: 0.025 },
    '28.02': { done: 0, rep: 0, skip: 0 }
  };
  var PF_TYPES = [
    { id: 'session', label: 'Сессии программы', ipp: 3.0, plan: [1190, 4210, 4480, 2930],
      hall: { congress: 34, edelveis: 30, ballroomB: 24, ballroomS: 6, sobol: 3, doybitsa: 2, magnolia: 1 } },
    { id: 'practice', label: 'Практики', ipp: 1.2, plan: [0, 380, 640, 410], hall: { doybitsa: 70, sobol: 20, magnolia: 10 } },
    { id: 'mentor', label: 'Менторские окна', ipp: 1.0, plan: [0, 360, 410, 280], hall: { magnolia: 100 } },
    { id: 'kipatalk', label: 'КипяTALK', ipp: 1.1, plan: [0, 520, 590, 430], hall: { congress: 100 } },
    { id: 'stand', label: 'Стенды', ipp: 3.0, plan: [140, 980, 1130, 760], hall: { congress: 100 } },
    { id: 'person', label: 'Встречи с людьми', ipp: 1.3, plan: [90, 610, 700, 520], hall: { magnolia: 45, congress: 30, edelveis: 25 } },
    { id: 'buyer', label: 'Встречи с покупателями', ipp: 1.2, plan: [4, 38, 44, 31], hall: { congress: 100 }, adj: { done: 0.05 } },
    { id: 'networking', label: 'Нетворкинг', ipp: 1.4, plan: [410, 760, 830, 540], hall: { edelveis: 34, ballroomB: 30, congress: 30, ballroomS: 4, doybitsa: 2 }, adj: { skip: 0.08 } },
    { id: 'leisure', label: 'Досуг', ipp: 1.2, plan: [320, 540, 610, 480], hall: { ballroomB: 36, congress: 30, edelveis: 30, ballroomS: 4 }, adj: { done: -0.04, skip: 0.06 } },
    { id: 'task', label: 'Дела в приложении', ipp: 2.4, plan: [1850, 2960, 3120, 1980], hall: null, adj: { done: 0.06, skip: -0.04 } }
  ];

  function alloc(total, weights) {
    var keys = Object.keys(weights), out = {}, used = 0, rem = [];
    keys.forEach(function (k) {
      var x = total * weights[k] / 100, f = Math.floor(x);
      out[k] = f; used += f; rem.push([k, x - f]);
    });
    rem.sort(function (a, b) { return b[1] - a[1]; });
    for (var i = 0; used < total; i++, used++) { out[rem[i % rem.length][0]] += 1; }
    return out;
  }
  function split(planned, p, adj, day) {
    var done = p.done, rep = p.rep, skip = p.skip;
    if (adj && day !== '28.02') {
      done = Math.max(0, done + (adj.done || 0)); skip = Math.max(0, skip + (adj.skip || 0));
    }
    var d = Math.round(planned * done), r = Math.round(planned * rep), s = Math.round(planned * skip);
    var a = planned - d - r - s;
    if (a < 0) { d += a; a = 0; }
    return { planned: planned, done: d, replaced: r, skipped: s, ahead: a };
  }
  var PF_CELLS = [];
  PF_TYPES.forEach(function (ty) {
    PF_DAYS.forEach(function (day, di) {
      var planned = ty.plan[di];
      if (!planned) { return; }
      var byHall = ty.hall ? alloc(planned, ty.hall) : { none: planned };
      Object.keys(byHall).forEach(function (h) {
        if (!byHall[h]) { return; }
        var c = split(byHall[h], PF_PROFILE[day], ty.adj, day);
        c.day = day; c.type = ty.id; c.hall = h === 'none' ? null : h;
        PF_CELLS.push(c);
      });
    });
  });

  function pfAdd(acc, c) {
    acc.planned += c.planned; acc.done += c.done; acc.replaced += c.replaced; acc.skipped += c.skipped; acc.ahead += c.ahead;
    return acc;
  }
  function pfZero() { return { planned: 0, done: 0, replaced: 0, skipped: 0, ahead: 0 }; }
  /* сводка по фильтру: day — '25.02'…'28.02' или 'all' */
  function pfSum(day) {
    var acc = pfZero();
    PF_CELLS.forEach(function (c) { if (day === 'all' || c.day === day) { pfAdd(acc, c); } });
    return acc;
  }
  function pfPeopleCap(day) { return day === 'all' ? PF_PEOPLE : PF_PEOPLE_DAY[day]; }
  /* строки среза: by — 'day' | 'hall' | 'type'; hidden — меньше 5 человек (FR-ANL-05) */
  function pfRows(by, day) {
    var rows = [];
    function people(planned, perPerson, d, perDay) {
      if (d !== 'all') { return Math.min(PF_PEOPLE_DAY[d], Math.ceil(planned / perPerson)); }
      var mx = 0;
      PF_DAYS.forEach(function (x) { mx = Math.max(mx, Math.min(PF_PEOPLE_DAY[x], Math.ceil((perDay[x] || 0) / perPerson))); });
      return Math.min(PF_PEOPLE, mx);
    }
    if (by === 'day') {
      PF_DAYS.forEach(function (d) {
        var s = pfSum(d);
        rows.push({ key: d, label: d + ' · ' + (FIX.DAYS.filter(function (x) { return x.id === d; })[0] || {}).week, sum: s, people: PF_PEOPLE_DAY[d], hidden: false });
      });
      return rows;
    }
    var groups = {};
    PF_CELLS.forEach(function (c) {
      if (day !== 'all' && c.day !== day) { return; }
      var k = by === 'type' ? c.type : (c.hall || 'none');
      var g = groups[k] || (groups[k] = { sum: pfZero(), perDay: {} });
      pfAdd(g.sum, c);
      g.perDay[c.day] = (g.perDay[c.day] || 0) + c.planned;
    });
    var order = by === 'type' ? PF_TYPES.map(function (t) { return t.id; }) : HALL_IDS.concat(['none']);
    order.forEach(function (k) {
      var g = groups[k];
      if (!g) { return; }
      var label, ipp;
      if (by === 'type') {
        var ty = PF_TYPES.filter(function (t) { return t.id === k; })[0];
        label = ty.label; ipp = ty.ipp;
      } else if (k === 'none') { label = 'Без зала (дела в приложении)'; ipp = 2.4; }
      else { label = FIX.hall(k).short; ipp = 2.2; }
      var pe = people(g.sum.planned, ipp, day, g.perDay);
      rows.push({ key: k, label: label, sum: g.sum, people: pe, hidden: pe < 5 });
    });
    return rows;
  }
  /* образец для проверки: путь одного участника (PATH_ITEMS), пересчёт по тем же правилам */
  function pfSample(day) {
    var acc = pfZero(), notTaken = 0;
    (FIX.PATH_ITEMS || []).forEach(function (it) {
      if (day !== 'all' && it.day !== day) { return; }
      if (it.status === 'suggested') { notTaken += 1; return; }
      acc.planned += 1;
      if (it.status === 'done') { acc.done += 1; }
      else if (it.status === 'replaced') { acc.replaced += 1; }
      else if (it.status === 'skipped') { acc.skipped += 1; }
      else { acc.ahead += 1; }
    });
    acc.suggested = notTaken;
    return acc;
  }

  Object.assign(FIX, {
    SHIFTS: SHIFTS, HALL_IDS: HALL_IDS, VOLUNTEERS: VOLUNTEERS, HALL_ASSIGN: HALL_ASSIGN, O5_ME: O5_ME,
    HALL_FLOW: HALL_FLOW, HALL_GUESTS: HALL_GUESTS,
    MOD_ROLES: MOD_ROLES, MOD_QUEUE: MOD_QUEUE, MOD_REASONS: MOD_REASONS, AUDIT: AUDIT,
    AI_MODES: AI_MODES, AI_TOTAL: AI_TOTAL,
    PARAMS_V3: PARAMS_V3, PARAM_GROUPS: PARAM_GROUPS, B2B_ZONE: B2B_ZONE,
    ONB_FUNNEL: ONB_FUNNEL,
    PF: { days: PF_DAYS, types: PF_TYPES, cells: PF_CELLS, people: PF_PEOPLE, peopleDay: PF_PEOPLE_DAY, peopleCap: pfPeopleCap },
    opsInside: opsInside, opsHallSession: opsHallSession, opsSessionEntered: opsSessionEntered, opsVolunteer: opsVolunteer, opsAudit: opsAudit,
    pfSum: pfSum, pfRows: pfRows, pfSample: pfSample
  });
})();
