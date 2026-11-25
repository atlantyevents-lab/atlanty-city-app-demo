/* Записи ленты и чаты (FEED_POSTS, CHATS). Каркас F0b, наполнение S6. Расширяет window.FIX (Object.assign). Схемы — design/04_REBUILD_V3.md, часть 5. */
/* Наполнение F0b: FEED_POSTS (14 записей; S6 добавил fp15 и справочники). Подключается после data/fixtures.js (fx_shared.js при загрузке не нужен).
   Чаты (CHATS) лежат в fx_shared.js (часть 5.1 спецификации): ch01 привязан к fp12, ch02 — к fp13.

   Запись: { id, kind, author: {type, ref}, tags, text, time, ago, link?, locked?, attach?, chatId?, speaker?, subject? }
     kind: news (locked, скрыть нельзя) · insight · mentor · ad · intro · ask · event · digest.
     author.type: org (ref — «Атланты Сити») · exhibitor (ref — id экспонента) · person (ref — id человека из PEOPLE).
     tags: метки карточки. news — «срочно» или «изменение»; ad — «Решения для роста бизнеса»; ask — «#запрос»; event — «#ивент»;
       у обычного интро тегов нет (D-35: теги #запрос и #ивент только у интро).
     link: маршрут экрана (C3/<id сессии>, D1, B8, E1, F12/<id компании>, H2/<id экспонента>).
     time — как в FEED: «ЧЧ:ММ» сегодня (27.02) или «вчера, ЧЧ:ММ»; ago — минут назад от демо-момента 27.02 11:10 (для сортировки).
     Поля сверх части 5.4 (отмечены в отчёте F0b): ago; speaker (ключ спикера у mentor); subject у ad — company или person
     (квота постов по пакету: о компании и о человеке); chatId у event.
     urgent (у news): срочная операционная новость; R1 закрепляет такие записи над лентой, и они остаются на виду при любом фильтре.
     Дополнения S6: у event — going (участники, отметившие «Иду», без владельца демо) и whenWhere («когда и где» одной строкой,
     место организует автор: D-34); у ad от партнёра — author.type 'partner' (ref — id партнёра из FIX.PARTNERS), метка «Партнёр» и locked.
     Справочники раздела: FEED_KINDS (виды, подписи, замки), FEED_PROMPTS (прозрачные примеры-подсказки по видам, D-34),
     FEED_REASONS (причины жалобы, FR-FEED-09), FEED_LIMIT (длина интро: параметр, значение не задано заказчиком, в демо 400). */
(function () {
  'use strict';
  var FIX = window.FIX;
  if (!FIX || !FIX.PEOPLE) { throw new Error('fx_feed.js: сначала подключите data/fixtures.js'); }

  var ORG = { type: 'org', ref: 'Атланты Сити' };
  function org() { return { type: ORG.type, ref: ORG.ref }; }
  function person(id) { return { type: 'person', ref: id }; }
  function exh(id) { return { type: 'exhibitor', ref: id }; }

  /* минут назад от 27.02 11:10 по полю time */
  function agoMin(time) {
    var m = /^(вчера, )?(\d\d):(\d\d)$/.exec(time);
    if (!m) { return null; }
    var mins = Number(m[2]) * 60 + Number(m[3]);
    var now = 11 * 60 + 10;
    return m[1] ? now + 24 * 60 - mins : now - mins;
  }

  var FEED_POSTS = [
    { id: 'fp01', kind: 'news', author: org(), tags: ['срочно'], time: '09:15', locked: true, urgent: true, link: 'E1',
      text: 'Срочно: с 18:00 вход на территорию только через главный вход Экспо. Остальные входы закрываются, учитывайте это при переходах между площадками.' },

    { id: 'fp02', kind: 'news', author: org(), tags: ['изменение'], time: '10:42', locked: true, urgent: true, link: 'C3/s2707',
      text: 'Изменение в программе: «Бизнес-разбор: продукт есть, клиентов нет» в 14:00 проходит в зале Соболь, 2-й этаж Экспо. Время начала прежнее.' },

    { id: 'fp03', kind: 'insight', author: org(), tags: ['маржа', 'логистика'], time: '11:04', link: 'C3/s2702',
      text: 'Инсайт с сессии «Кейс: маржа в логистике — считаем честно»: считайте маржу по каждой машине и по каждому дню. Средняя цифра по тонне прячет холостые рейсы, где теряются деньги.' },

    { id: 'fp04', kind: 'insight', author: org(), tags: ['материал', 'логистика'], time: '10:30', link: 'C3/s2702',
      attach: { kind: 'file', name: 'Расчёт маржи по машине.xlsx', size: '86 КБ' },
      text: 'Материал к сессии «Кейс: маржа в логистике — считаем честно»: таблица расчёта маржи по машине и по дню. Подставьте свои рейсы и посмотрите, где маржа уходит.' },

    { id: 'fp05', kind: 'mentor', author: org(), tags: ['Ментор time'], time: '08:40', link: 'D1', speaker: 'kovalev',
      text: 'Ментор time: сегодня Андрей Ковалёв принимает в Магнолии, окно 15:30, стол 2. Тема встречи: партнёрские каналы продаж. Запись открыта в разделе «Менторские».' },

    { id: 'fp06', kind: 'ad', author: exh('ex01'), tags: ['Решения для роста бизнеса'], time: '09:40', link: 'H2/ex01', subject: 'company',
      text: 'ТехноСклад на стенде А-12 разбирает план вашего склада и показывает, какие операции переносятся в WMS первыми. Двенадцать внедрений, средний срок три месяца.' },

    { id: 'fp07', kind: 'ad', author: exh('ex01'), tags: ['Решения для роста бизнеса'], time: '10:15', link: 'H2/ex01', subject: 'person',
      text: 'Ольга Рябова, представитель «ТехноСклад», в 15:30 ведёт круглый стол «WMS без боли — с чего начать». Десять мест, приходите со схемой своего склада.' },

    { id: 'fp08', kind: 'ad', author: exh('ex04'), tags: ['Решения для роста бизнеса'], time: '09:05', link: 'H2/ex04', subject: 'company',
      text: 'ПотокКлиентов проводит аудит каналов привлечения для производств и сервисных компаний, стенд В-11 в зоне 2. По итогам участник получает план на квартал. У клиентов входящие заявки выросли в три раза.' },

    { id: 'fp09', kind: 'intro', author: person('p03'), tags: [], time: 'вчера, 19:20', link: 'F12/co03',
      text: 'Меня зовут Марина, студия «Кедр» делает сайты и клиентские кабинеты для B2B-компаний. Ищу тех, кто уже автоматизировал клиентский сервис, чтобы сверить подходы за кофе.' },

    { id: 'fp10', kind: 'ask', author: person('p05'), tags: ['#запрос'], time: '08:20', link: 'F12/co05',
      text: 'Ищу партнёра в переработку плодоовощной продукции на юге: нужен цех или инвестор в совместную модель. Расчёт покажу на встрече.' },

    { id: 'fp11', kind: 'intro', author: person('p12'), tags: [], time: 'вчера, 21:05', link: 'F12/co12',
      text: 'Михаил, «СтройГрупп». Строим складские и производственные комплексы под ключ. Ищу субподрядчиков по инженерным сетям и перевозчиков стройматериалов в регионы.' },

    { id: 'fp12', kind: 'event', author: person('p13'), tags: ['#ивент'], time: '08:50', chatId: 'ch01',
      whenWhere: '27.02 · 18:15 · холл Эдельвейса, у кофе-точки', going: ['p11', 'p07', 'p16', 'p17', 'p04'],
      text: 'Собираю за одним столом тех, кто думает о франшизе или ищет поставщиков для общепита. 27.02 в 18:15, холл Эдельвейса у кофе-точки, двенадцать мест. Чат встречи уже открыт.' },

    { id: 'fp13', kind: 'event', author: person('p02'), tags: ['#ивент'], time: 'вчера, 22:10', chatId: 'ch02',
      whenWhere: '28.02 · 10:45 · лобби основного отеля', going: ['p18', 'p14', 'p01', 'p08', 'p05'],
      text: 'Хочу собрать закупщиков и поставщиков упаковки и логистики на кофе: 28.02 в 10:45, лобби основного отеля, десять мест. Приходите с вопросами и образцами. Чат встречи открыт.' },

    { id: 'fp14', kind: 'digest', author: org(), tags: ['дайджест'], time: '08:00', link: 'B8',
      text: 'Дайджест дня, 27 февраля. В вашем пути кейс про маржу в логистике в 10:00, гостиная в Магнолии в 11:35 и встреча на стенде «ТехноСклад» в 14:00. Вечером нетворкинг у Конгресс-центра в 19:00.' }
  ];

  /* fp15: пост партнёра фестиваля (метка «Партнёр», скрыть нельзя: D-35, FR-FEED-03). Партнёр — запись FIX.PARTNERS (k5). */
  FEED_POSTS.push(
    { id: 'fp15', kind: 'ad', author: { type: 'partner', ref: 'k5' }, tags: ['Партнёр'], time: '09:50', locked: true, link: 'K2/k5',
      text: 'Партнёр фестиваля «Логистика Юг» считает маршрут перевозки на месте и держит штаб помощи на площадке. Если нужно отправить оборудование или образцы домой, подойдите в штаб и расскажите, что везём.' }
  );

  FEED_POSTS.forEach(function (p) { p.ago = agoMin(p.time); });

  /* Виды записей: одно имя вида в чипе, настройке и карточке (label = short); замки (locked: скрыть нельзя, D-35).
     У постов партнёров (author.type 'partner', locked) вид тот же, 'ad': в настройке они вынесены отдельной строкой с замком. */
  var FEED_KINDS = [
    { id: 'news', label: 'Новости', short: 'Новости', desc: 'Срочные сообщения и изменения программы', locked: true },
    { id: 'insight', label: 'Инсайты', short: 'Инсайты', desc: 'Выводы сессий, файлы и ссылки' },
    { id: 'mentor', label: 'Ментор time', short: 'Ментор time', desc: 'Анонсы менторских окон' },
    { id: 'ad', label: 'Экспоненты', short: 'Экспоненты', desc: 'Реклама экспонентов с пометкой «Реклама · Экспонент»' },
    { id: 'intro', label: 'Интро', short: 'Интро', desc: 'Участники рассказывают о себе и своём деле' },
    { id: 'ask', label: '#запрос', short: '#запрос', desc: 'Интро, где человек ищет партнёра, решение или совет' },
    { id: 'event', label: '#ивент', short: '#ивент', desc: 'Приглашения за стол и в чат встречи' },
    { id: 'digest', label: 'Дайджест', short: 'Дайджест', desc: 'Сводка в 08:00 и 19:00' }
  ];

  /* Прозрачные примеры-подсказки в поле записи (D-34); набор по видам правится в админке */
  var FEED_PROMPTS = {
    intro: 'Меня зовут ' + FIX.ME.first + ', «' + FIX.ME.company + '». Запускаем региональные склады под ключ. Ищу тех, кто выходит в новые регионы, чтобы сверить опыт за кофе.',
    ask: 'Ищу партнёра по доставке на юге: нужен перевозчик с рейсами между складами. Расскажу о задаче на встрече.',
    event: 'Собираю за одним столом тех, кто открывает склады в регионах. Обсудим площадки, поставщиков и людей. Приходите с вопросами.',
    eventWhen: '28.02 · 10:45 · лобби основного отеля'
  };

  /* Причины жалобы на запись, сообщение и участника (FR-FEED-09, FR-CHAT-05) */
  var FEED_REASONS = ['Реклама', 'Оскорбление', 'Спам', 'Другое'];

  /* Лимит длины интро: параметр, значение заказчик не задал (FR-FEED-05); в демо 400 знаков */
  var FEED_LIMIT = { intro: 400, minIntro: 20 };

  /* ================= журнал жалоб и модерация: стабильный контракт для S8 (P9 «Модерация») =================
     Ленту и чаты ведёт R.js (S6); консоль читает и решает ТОЛЬКО через функции ниже, поля внутри не правит.

     FIX.FEED_REPORTS — журнал жалоб участника демо, массив
       { id: 'rp01', kind: 'post' | 'chat' | 'message' | 'person', ref, reason, time, by: 'me', chatId?, msg?, person?, resolved? }
       ref: post — id записи (fpNN); chat — id чата (chNN); message — 'chNN:индекс' (индекс в chat.messages); person — id человека.
       chatId (у message и person), msg (индекс), person (id) — для удобства; resolved — действие решения ('approve'|'return'|'delete').
       reason — одна из FEED_REASONS. time — «ЧЧ:ММ» демо-часов (11:11, 11:12, … после 11:10). Записывает FIX.feedReport({kind, ref, reason, ...}).

     FIX.feedModItems() — очередь модерации (только то, что ждёт решения), массив
       { id, kind: 'intro' | 'chat' | 'complaint', area: 'feed' | 'chat', ref, author: {type, ref, name}, text, time, reasons: [], status: 'pending', ... }
       intro — запись участника с review=true (первое интро до публикации): ref — id записи; postKind — intro | ask | event; tags.
       chat — чат встречи с pending=true и draft=false (запись уже опубликована, чат ждёт одобрения): ref — id чата.
       complaint — жалобы на одну цель, сгруппированные: target ('post'|'chat'|'message'|'person'), ref (как в FEED_REPORTS),
         count (число жалоб), reasons (уникальные причины), chatId (у chat, message, person), msg (индекс), postId (у post).
       area: feed — главный модератор и дежурный (интро, жалобы на записи), chat — группа админов чатов (чаты, жалобы в чатах).
       id стабильный: 'intro:<id записи>', 'chat:<id чата>', 'complaint:<target>:<ref>'.

     FIX.feedModDecide(id, action, reason) — action: 'approve' | 'return' | 'delete'; возвращает запись журнала
       { id: 'ml01', itemId, kind, ref, action, reason, time } (она же в FIX.FEED_MOD_LOG) или null, если элемента нет в очереди.
       intro:   approve — review=false, запись видна всем; чат записи pending=false (опубликован);
                return — review=false, post.returned=<причина>: автор видит «возвращена: причина», другим запись скрыта;
                delete — review=false, post.removed=true: запись скрыта, автору уведомление; чат записи закрыт.
       chat:    approve — pending=false (чат открыт); return — chat.returned=<причина> (остаётся на проверке); delete — chat.closed=<причина>.
       complaint: approve — жалоба отклонена (цель остаётся); return — post: post.returned; message: message.hidden=<причина>;
                person: chat.muted += id; chat: chat.warned=<причина>; delete — post.removed=true; message.removed=true;
                person: chat.blocked += id; chat: chat.closed=<причина>. Жалобы цели получают resolved=<action>.
       Если автор — владелец демо (ref 'me'), в FIX.FEED_NOTICES добавляется уведомление { id, to: 'me', kind, ref, text, time, seen: false };
       R1 показывает его баннером. Каждое решение дописывается в FIX.FEED_MOD_LOG.

     ---- ПУБЛИЧНЫЙ КОНТРАКТ ДЛЯ S8 (P9): единый реестр очереди ленты и чатов ----
     FIX.MODERATION_QUEUE_FEED(opts?) — массив записей, которые ждут решения модератора (собирается на лету из трёх источников:
       записи участника FEED_POSTS с mine и review, жалобы участника D.st('R').reports (они же FIX.FEED_REPORTS) и чаты CHATS с pending):
       { kind: 'intro' | 'report' | 'chat', id, text, author: {type, ref, name}, ts: 'ЧЧ:ММ', status: 'pending', area: 'feed' | 'chat', ...подробности }
       kind 'intro'  — запись участника на проверке; id = id записи (fp16…); подробности: postKind (intro|ask|event), tags.
       kind 'report' — жалобы на одну цель одним элементом; id = '<цель>:<ссылка>' ('post:fp11', 'chat:ch01', 'message:ch01:3', 'person:p05');
                       подробности: target, ref, count (число жалоб), reasons (уникальные причины), postId | chatId | msg.
       kind 'chat'   — чат встречи, который уже можно открыть участникам, но он ждёт одобрения (pending и запись опубликована); id = id чата (ch04…).
       area: 'feed' — главный модератор и дежурный, 'chat' — группа админов чатов (в P9 фильтруйте по роли).
       opts.all === true добавляет уже решённые записи со status 'approved' | 'rejected' (поля action, reason, ts — время решения).
     FIX.moderationResolve(kind, id, action, reason?) — закрывает запись очереди; action:
       'approve' — содержимое остаётся или публикуется (запись видна всем, чат открыт, жалоба отклонена);
       'reject'  — мягкое отклонение: запись или чат возвращаются автору с причиной (то же, что 'return'), на жалобу — сообщение скрыто, участник
                   лишён права писать, чат получает предупреждение;
       'return' и 'delete' — точные варианты решения (delete — запись скрыта и удалена, чат закрыт, участник заблокирован).
       Возвращает запись журнала { id, itemId, kind, ref, action, reason, time, status, text, author } либо null, если записи нет в очереди.
       Побочные действия (видимость записи и чата у участника, уведомление автору в FIX.FEED_NOTICES, R1 показывает баннером) выполняет само решение.
     Пример для P9:
       FIX.MODERATION_QUEUE_FEED().filter(function (q) { return q.area === 'feed' && q.kind === 'intro'; })
         .forEach(function (q) { rows.push(q.ts + ' ' + q.author.name + ': ' + q.text); });
       FIX.moderationResolve('intro', q.id, 'approve');                    // одобрить
       FIX.moderationResolve('report', 'post:fp11', 'reject', 'Реклама');  // жалоба обоснована: запись возвращена автору */
  var FEED_REPORTS = [];
  var FEED_MOD_LOG = [];
  var FEED_NOTICES = [];
  var feedClock = 0;

  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  /* демо-часы: каждый вызов — следующая минута после 11:10 (сообщения, жалобы, решения) */
  function feedNow() { feedClock++; var m = 11 * 60 + 10 + feedClock; return pad2(Math.floor(m / 60)) + ':' + pad2(m % 60); }
  function byId(list, id) { for (var i = 0; i < list.length; i++) { if (list[i].id === id) { return list[i]; } } return undefined; }
  function nextId(list, prefix) {
    var n = list.length + 1, id;
    do { id = prefix + pad2(n); n++; } while (byId(list, id));
    return id;
  }
  function personName(ref) {
    if (ref === 'me') { return FIX.ME.name; }
    var pe = FIX.person && FIX.person(ref);
    return pe ? pe.name : String(ref);
  }
  function authorOfPost(p) {
    var a = p.author || {}, name = a.ref;
    if (a.type === 'person') { name = personName(a.ref); }
    else if (a.type === 'exhibitor') { var ex = FIX.exhibitor && FIX.exhibitor(a.ref); name = ex ? ex.name : a.ref; }
    else if (a.type === 'partner') { var pt = (FIX.PARTNERS || []).filter(function (x) { return x.id === a.ref; })[0]; name = pt ? pt.name : a.ref; }
    return { type: a.type, ref: a.ref, name: name };
  }
  function chatOfPostId(pid) {
    var chats = FIX.CHATS || [];
    for (var i = 0; i < chats.length; i++) { if (chats[i].postId === pid) { return chats[i]; } }
    return undefined;
  }

  function feedReport(r) {
    var rep = { id: nextId(FEED_REPORTS, 'rp'), kind: r.kind, ref: r.ref, reason: r.reason, time: feedNow(), by: 'me' };
    ['chatId', 'msg', 'person'].forEach(function (k) { if (r[k] !== undefined && r[k] !== null) { rep[k] = r[k]; } });
    FEED_REPORTS.push(rep);
    return rep;
  }

  function complaintGroups() {
    var groups = [], idx = {};
    FEED_REPORTS.forEach(function (r) {
      if (r.resolved) { return; }
      var key = r.kind + ':' + r.ref;
      if (!idx[key]) { idx[key] = { target: r.kind, ref: r.ref, reports: [] }; groups.push(idx[key]); }
      idx[key].reports.push(r);
    });
    return groups;
  }

  function feedModItems() {
    var out = [];
    FEED_POSTS.forEach(function (p) {
      if (!p.review || p.removed) { return; }
      out.push({ id: 'intro:' + p.id, kind: 'intro', area: 'feed', ref: p.id, postKind: p.kind, tags: (p.tags || []).slice(),
        author: authorOfPost(p), text: p.text, time: p.time, reasons: [], status: 'pending' });
    });
    (FIX.CHATS || []).forEach(function (c) {
      if (c.kind !== 'meetup' || !c.pending || c.draft || c.closed || c.returned) { return; }
      out.push({ id: 'chat:' + c.id, kind: 'chat', area: 'chat', ref: c.id,
        author: { type: 'person', ref: c.owner, name: personName(c.owner) },
        text: c.title + ' · ' + c.when + (c.place ? ' · ' + c.place : ''), time: c.created || c.when, reasons: [], status: 'pending' });
    });
    complaintGroups().forEach(function (g) {
      var last = g.reports[g.reports.length - 1], reasons = [];
      g.reports.forEach(function (r) { if (reasons.indexOf(r.reason) < 0) { reasons.push(r.reason); } });
      var it = { id: 'complaint:' + g.target + ':' + g.ref, kind: 'complaint', target: g.target, ref: g.ref, count: g.reports.length,
        reasons: reasons, time: last.time, status: 'pending', area: g.target === 'post' ? 'feed' : 'chat' };
      if (g.target === 'post') {
        var p = byId(FEED_POSTS, g.ref);
        it.postId = g.ref; it.author = p ? authorOfPost(p) : { type: 'person', ref: '', name: g.ref }; it.text = p ? p.text : '';
      } else if (g.target === 'chat') {
        var c = byId(FIX.CHATS || [], g.ref);
        it.chatId = g.ref; it.author = { type: 'person', ref: c ? c.owner : '', name: c ? personName(c.owner) : g.ref }; it.text = c ? c.title : '';
      } else if (g.target === 'message') {
        var cm = String(g.ref).split(':'), ch = byId(FIX.CHATS || [], cm[0]), m = ch && ch.messages ? ch.messages[Number(cm[1])] : null;
        it.chatId = cm[0]; it.msg = Number(cm[1]);
        it.author = { type: 'person', ref: m ? m.from : '', name: m ? personName(m.from) : '' }; it.text = m ? m.text : '';
      } else {
        it.chatId = last.chatId || ''; it.author = { type: 'person', ref: g.ref, name: personName(g.ref) };
        it.text = 'Жалоба на участника чата: ' + personName(g.ref);
      }
      out.push(it);
    });
    return out;
  }

  function feedNotice(kind, ref, text) {
    var n = { id: nextId(FEED_NOTICES, 'nt'), to: 'me', kind: kind, ref: ref, text: text, time: feedNow(), seen: false };
    FEED_NOTICES.push(n);
    return n;
  }
  function pushUniq(list, v) { if (list.indexOf(v) < 0) { list.push(v); } }

  function feedModDecide(id, action, reason) {
    if (['approve', 'return', 'delete'].indexOf(action) < 0) { return null; }
    var it = null, items = feedModItems();
    for (var i = 0; i < items.length; i++) { if (items[i].id === id) { it = items[i]; break; } }
    if (!it) { return null; }
    var why = reason || '';
    var post, ch, ct;
    if (it.kind === 'intro') {
      post = byId(FEED_POSTS, it.ref); ch = chatOfPostId(it.ref);
      post.review = false;
      if (action === 'approve') {
        post.modState = 'approved'; if (ch) { ch.pending = false; ch.draft = false; }
      } else if (action === 'return') {
        post.modState = 'returned'; post.returned = why || 'нужны правки';
      } else {
        post.modState = 'removed'; post.removed = true; post.removedReason = why || 'нарушение правил ленты';
        if (ch) { ch.pending = false; ch.closed = 'запись удалена модератором'; }
      }
      if (post.author && post.author.ref === 'me') {
        feedNotice(action, post.id, action === 'approve' ? 'Модератор одобрил вашу запись: она видна участникам.'
          : action === 'return' ? 'Модератор вернул вашу запись. Причина: ' + post.returned + '.'
          : 'Модератор удалил вашу запись. Причина: ' + post.removedReason + '.');
      }
    } else if (it.kind === 'chat') {
      ch = byId(FIX.CHATS || [], it.ref);
      if (action === 'approve') { ch.pending = false; ch.draft = false; delete ch.returned; }
      else if (action === 'return') { ch.returned = why || 'нужны правки'; }
      else { ch.pending = false; ch.closed = why || 'нарушение правил чатов'; }
      if (ch.owner === 'me') {
        feedNotice(action, ch.id, action === 'approve' ? 'Чат «' + ch.title + '» открыт для участников.'
          : action === 'return' ? 'Чат «' + ch.title + '» возвращён. Причина: ' + ch.returned + '.'
          : 'Чат «' + ch.title + '» закрыт. Причина: ' + ch.closed + '.');
      }
    } else {
      ct = it.target;
      if (ct === 'post') {
        post = byId(FEED_POSTS, it.ref);
        if (post && action === 'return') { post.returned = why || 'нужны правки'; post.modState = 'returned'; }
        if (post && action === 'delete') { post.removed = true; post.removedReason = why || 'нарушение правил ленты'; post.modState = 'removed'; }
        if (post && action !== 'approve' && post.author && post.author.ref === 'me') {
          feedNotice(action, post.id, action === 'return' ? 'Модератор вернул вашу запись. Причина: ' + post.returned + '.' : 'Модератор удалил вашу запись. Причина: ' + post.removedReason + '.');
        }
      } else if (ct === 'chat') {
        ch = byId(FIX.CHATS || [], it.ref);
        if (ch && action === 'return') { ch.warned = why || 'напоминание о правилах'; }
        if (ch && action === 'delete') { ch.closed = why || 'нарушение правил чатов'; ch.pending = false; }
      } else if (ct === 'message') {
        ch = byId(FIX.CHATS || [], it.chatId);
        var msg = ch && ch.messages ? ch.messages[it.msg] : null;
        if (msg && action === 'return') { msg.hidden = why || 'скрыто модератором'; }
        if (msg && action === 'delete') { msg.removed = true; }
      } else if (ct === 'person') {
        ch = byId(FIX.CHATS || [], it.chatId);
        if (ch && action === 'return') { ch.muted = ch.muted || []; pushUniq(ch.muted, it.ref); }
        if (ch && action === 'delete') { ch.blocked = ch.blocked || []; pushUniq(ch.blocked, it.ref); }
      }
      FEED_REPORTS.forEach(function (r) { if (!r.resolved && r.kind === ct && r.ref === it.ref) { r.resolved = action; } });
    }
    var log = { id: nextId(FEED_MOD_LOG, 'ml'), itemId: id, kind: it.kind, ref: it.ref, action: action, reason: why, time: feedNow(),
      status: action === 'approve' ? 'approved' : 'rejected', text: it.text, author: it.author, area: it.area, queued: it.time };
    if (it.kind === 'complaint') { log.target = it.target; log.count = it.count; log.reasons = it.reasons; }
    FEED_MOD_LOG.push(log);
    return log;
  }

  /* ---- единый реестр для консоли (контракт S8, описание в шапке раздела) ---- */
  function queueEntry(it) {
    var rep = it.kind === 'complaint';
    var e = { kind: rep ? 'report' : it.kind, id: rep ? it.target + ':' + it.ref : it.ref, text: it.text, author: it.author,
      ts: it.time, status: 'pending', area: it.area };
    if (rep) {
      e.target = it.target; e.ref = it.ref; e.count = it.count; e.reasons = it.reasons;
      ['postId', 'chatId', 'msg'].forEach(function (k) { if (it[k] !== undefined) { e[k] = it[k]; } });
    } else if (it.kind === 'intro') {
      e.postKind = it.postKind; e.tags = it.tags;
    }
    return e;
  }
  function logEntry(l) {
    var rep = l.kind === 'complaint';
    var e = { kind: rep ? 'report' : l.kind, id: rep ? l.itemId.replace(/^complaint:/, '') : l.ref, text: l.text, author: l.author,
      ts: l.time, status: l.status, area: l.area, action: l.action, reason: l.reason };
    if (rep) { e.target = l.target; e.ref = l.ref; e.count = l.count; e.reasons = l.reasons; }
    return e;
  }
  function moderationQueue(opts) {
    var out = feedModItems().map(queueEntry);
    if (opts && opts.all) { FEED_MOD_LOG.forEach(function (l) { out.push(logEntry(l)); }); }
    return out;
  }
  function moderationResolve(kind, id, action, reason) {
    var act = action === 'reject' ? 'return' : action;
    var itemId = kind === 'report' ? 'complaint:' + id : kind === 'intro' || kind === 'chat' ? kind + ':' + id : '';
    if (!itemId) { return null; }
    return feedModDecide(itemId, act, reason);
  }

  /* Публикация записи модератором (контракт для консоли P9): «Одобрить» по очереди экспонентов и интро
     создаёт видимую участникам запись в FEED_POSTS. item: {kind:'ad'|'intro'|'ask'|'event', author:{type,ref},
     subject?, tags?, text, link?, paid?}. Возвращает созданный пост. */
  function feedPublish(item) {
    var p = { id: nextId(FEED_POSTS, 'fp'), kind: item.kind || 'intro',
      author: item.author, tags: (item.tags || []).slice(), text: item.text,
      time: feedNow(), ago: 0, link: item.link || null };
    if (item.subject) { p.subject = item.subject; }
    if (item.paid) { p.paid = true; }
    if (item.speaker) { p.speaker = item.speaker; }
    if (item.chatId) { p.chatId = item.chatId; }
    p.ago = agoMin(p.time);
    FEED_POSTS.unshift(p);
    return p;
  }
  /* Снятие записи модератором после публикации (жалоба подтверждена, решение «удалить»). */
  function feedRemove(pid, reason) {
    var p = byId(FEED_POSTS, pid);
    if (!p) { return null; }
    p.removed = true; p.removedReason = reason || 'нарушение правил ленты';
    if (p.author && p.author.type === 'person' && p.author.ref === 'me') {
      feedNotice('delete', p.id, 'Модератор удалил вашу запись. Причина: ' + p.removedReason + '.');
    }
    return p;
  }

  Object.assign(window.FIX, {
    FEED_POSTS: FEED_POSTS,
    FEED_KINDS: FEED_KINDS,
    FEED_PROMPTS: FEED_PROMPTS,
    FEED_REASONS: FEED_REASONS,
    FEED_LIMIT: FEED_LIMIT,
    FEED_REPORTS: FEED_REPORTS,
    FEED_MOD_LOG: FEED_MOD_LOG,
    FEED_NOTICES: FEED_NOTICES,
    feedNow: feedNow,
    feedReport: feedReport,
    feedModItems: feedModItems,
    feedModDecide: feedModDecide,
    MODERATION_QUEUE_FEED: moderationQueue,
    moderationResolve: moderationResolve,
    feedPublish: feedPublish,
    feedRemove: feedRemove,
    post: function (id) {
      for (var i = 0; i < FEED_POSTS.length; i++) { if (FEED_POSTS[i].id === id) { return FEED_POSTS[i]; } }
      return undefined;
    }
  });
})();
