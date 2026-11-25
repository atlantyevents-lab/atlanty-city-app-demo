/* Блок R — «Лента и чаты». Этап S6: R1 Лента, R2 Настройка ленты, R3 Новая запись, R4 Карточка записи,
   R5 Мой чат, R6 Чат встречи, R7 Создать чат встречи. Данные: FIX.FEED_POSTS, FEED_KINDS, FEED_PROMPTS, FEED_REASONS,
   FEED_LIMIT (data/fx_feed.js) и FIX.CHATS (data/fx_shared.js, только чтение; новые чаты и сообщения добавляются в память).
   Стили — css/feed.css (префикс fd-). Состояние раздела живёт в D.st('R'), состояние экранов — в D.st(<id экрана>). */
(function () {
  'use strict';
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag, avatar, plural } = D;

  /* ---------- общее состояние раздела ---------- */
  const S = D.st('R');
  if (!S.ready) {
    Object.assign(S, {
      ready: true,
      cfg: { hidden: {}, people: [] },   // сохранённая настройка ленты: скрытые виды и люди
      once: null,                        // настройка «Только в этот раз» (не сохраняется)
      reported: {},                      // postId → причина жалобы (запись скрыта у заявителя)
      sent: {},                          // postId → причина жалобы на нескрываемую запись (запись остаётся в ленте)
      going: {},                         // postId → отметка «Иду» владельца демо
      left: {}, joined: {},              // chatId (у архивного примера 'arch:chatId') → вышел из чата / вошёл в чат
      msgHidden: {},                     // 'chatId:индекс' → сообщение скрыто жалобой
      reports: [],                       // журнал жалоб демо (дубль в FIX.FEED_REPORTS, его читает консоль)
      rsel: null,                        // выбранная причина в листе жалобы
      keepBox: null, keepBoxAt: 0, keepBoxHash: ''   // прокрутка переписки R6 при перерисовке (экран .scr хранит оболочка)
    });
  }

  const cfg = () => S.once || S.cfg;
  const kinds = () => F.FEED_KINDS || [];
  const kindById = id => kinds().find(k => k.id === id);
  const go = id => { location.hash = '#/' + id; };
  const dayId = d => 'd' + String(d).replace('.', '');
  const KIND_IDS = ['news', 'insight', 'mentor', 'ad', 'intro', 'ask', 'event', 'digest'];

  /* Правила и тексты, которые повторяются на нескольких экранах */
  const RULE_AD = 'Рекламные посты участников запрещены. О бизнесе рассказывают через интро: кто вы, чем занимаетесь и кого ищете.';
  const MOD_NOTE = 'Запись проверит модератор. Участники увидят её после проверки.';
  const CHAT_TERM = 'Чат встречи живёт до конца фестиваля; модерирует группа админов.';

  /* Автофильтр интро и чатов: внешние ссылки и телефоны не принимаются, внутренние ссылки допустимы (FR-FEED-06, FR-CHAT-07).
     Ссылка: протокол, www, t.me, e-mail или любой домен «имя.зона» с зоной из двух и более букв (.ru, .рф, .tech, .xyz…);
     зона пишется целиком строчными или прописными, иначе это конец предложения без пробела («конец.Начало»).
     Телефон: 10–11 цифр с «+», скобками, дефисами либо российская запись 8/7 и десять цифр; число без этих признаков
     (оборот, ИНН) телефоном не считается. */
  function hasLink(s) {
    if (/(https?:\/\/|hxxps?:\/\/|www\.|t\.me\/|[a-z0-9._-]+@[a-z0-9-]+\.[a-z]{2,})/i.test(s)) return true;
    return /[A-Za-zА-Яа-яЁё0-9][A-Za-zА-Яа-яЁё0-9-]*\.(?:[a-zа-яё]{2,}|[A-ZА-ЯЁ]{2,})(?![A-Za-zА-Яа-яЁё0-9-])/.test(s);
  }
  function hasPhone(s) {
    const m = s.match(/\+?[\d(][\d\s().-]{7,}\d/g) || [];
    for (let i = 0; i < m.length; i++) {
      const t = m[i].trim(), d = t.replace(/\D/g, '');
      if (d.length < 10) continue;
      const plus = t.charAt(0) === '+';
      if (plus && d.length <= 15) return true;
      if (d.length > 11) continue;
      const marked = /[()]/.test(t) || /\d\s?[-–]\s?\d/.test(t);
      const ru = d.length === 11 && /^[78][\s-]?\d{3}[\s-]?\d{3}[\s-]?\d{2}[\s-]?\d{2}$/.test(t);
      if (marked || ru) return true;
    }
    return false;
  }
  function badContent(t) {
    const s = String(t || '');
    if (hasLink(s)) return 'ссылки';
    if (hasPhone(s)) return 'телефоны';
    return '';
  }
  const BAD_TEXT = 'В интро нельзя указывать внешние ссылки и телефоны. Расскажите о себе словами: контакты откроются после знакомства.';

  /* ---------- люди и авторы ---------- */
  const nameOf = id => id === 'me' ? F.ME.name : ((F.person(id) || {}).name || id);
  const firstName = n => String(n || '').split(' ')[0];
  const isOrg = p => !p.author || (p.author.type !== 'person' && p.author.type !== 'exhibitor' && p.author.type !== 'partner');

  function authorOf(p) {
    const a = p.author || {};
    if (a.type === 'person') {
      if (a.ref === 'me') return { name: F.ME.name, sub: 'Вы · ' + F.ME.company, go: 'L7', cls: '', pid: 'me' };
      const pe = F.person(a.ref) || {};
      return { name: pe.name || a.ref, sub: [pe.role, pe.company].filter(Boolean).join(' · '), go: 'F2/' + a.ref, cls: '', pid: a.ref };
    }
    if (a.type === 'exhibitor') {
      const ex = F.exhibitor(a.ref) || {};
      return { name: ex.name || a.ref, sub: 'Экспонент' + (ex.stand ? ' · ' + ex.stand : ''), go: 'H2/' + a.ref, cls: '' };
    }
    if (a.type === 'partner') {
      const pt = (F.PARTNERS || []).find(x => x.id === a.ref) || {};
      return { name: pt.name || a.ref, sub: 'Партнёр фестиваля', go: 'K2/' + a.ref, cls: '' };
    }
    return { name: a.ref || 'Атланты Сити', sub: 'Организаторы', go: '', cls: 'accent' };
  }

  /* ---------- «Иду», чат записи ---------- */
  function chatOfPost(p) {
    if (p.chatId) return F.chat(p.chatId);
    return (F.CHATS || []).find(c => c.postId === p.id);
  }
  function isGoing(p) {
    if (S.going[p.id] !== undefined) return S.going[p.id];
    return !!(F.pathFind && F.pathFind('networking', p.id));
  }
  function goingIds(p) {
    const ids = (p.going || []).slice();
    if (isGoing(p)) ids.unshift('me');
    return ids;
  }
  /* мест нет: отметок «Иду» столько, сколько мест в чате записи (лимит из данных), а сам участник не отмечен */
  function noSeats(p) {
    const ch = chatOfPost(p);
    return !!(ch && ch.limit && !isGoing(p) && goingIds(p).length >= ch.limit);
  }

  /* ---------- видимость и порядок записей ---------- */
  const isUrgent = p => p.kind === 'news' && !!p.urgent;
  function visible(p) {
    if (p.removed) return false;                               // удалена модератором
    if ((p.review || p.returned) && !p.mine) return false;     // на проверке или возвращена: видит только автор
    if (S.reported[p.id]) return false;                        // жалоба скрывает запись у заявителя (новости и партнёров она не скрывает)
    if (p.mine || p.locked || p.kind === 'news') return true;  // замок: скрыть нельзя (D-35)
    const c = cfg();
    if (c.hidden[p.kind]) return false;
    if (p.author && p.author.type === 'person' && c.people.indexOf(p.author.ref) >= 0) return false;
    return true;
  }
  /* срочные новости организаторов закреплены сверху, дальше новее выше (FR-FEED-08) */
  function sortedPosts() {
    const ago = p => p.ago == null ? 9e6 : p.ago;
    return (F.FEED_POSTS || []).slice().sort((a, b) => (Number(isUrgent(b)) - Number(isUrgent(a))) || (ago(a) - ago(b)));
  }

  /* ---------- общие кнопки ---------- */
  function pathBtn(type, ref, o) {
    o = o || {};
    const it = F.pathFind ? F.pathFind(type, ref, o.day, o.time) : null;
    if (it) {
      return '<button class="btn btn-secondary btn-sm fd-b in" data-go="B4/' + dayId(it.day) + '">' + icon('check') + 'В пути</button>';
    }
    return '<button class="btn btn-secondary btn-sm fd-b" data-act="path-add" data-type="' + type + '" data-ref="' + esc(ref) + '"' +
      (o.day ? ' data-day="' + esc(o.day) + '"' : '') + (o.time ? ' data-time="' + esc(o.time) + '"' : '') + '>+ Путь</button>';
  }
  const goBtn = (to, label, cls, extra) =>
    '<button class="btn ' + (cls || 'btn-secondary') + ' btn-sm fd-b' + (extra || '') + '" data-go="' + esc(to) + '">' + label + '</button>';

  function linkLabel(link) {
    return ({ E1: 'На карте', C3: 'К сессии', D1: 'Менторские', B8: 'Открыть дайджест', F12: 'Компания автора', H2: 'Карточка решения', K2: 'Карточка партнёра' })[String(link).split('/')[0]] || 'Открыть';
  }

  /* ---------- вид записи: метка типа, значок и тон левой линии (цвета из токенов) ---------- */
  function viewOf(p) {
    const a = p.author || {}, tg = p.tags || [], urgent = tg.indexOf('срочно') >= 0;
    switch (p.kind) {
      case 'news': return { ic: urgent ? 'alert' : 'bell', label: 'Новость фестиваля', tone: urgent ? 'err' : 'accent' };
      case 'insight': return p.attach ? { ic: 'file', label: 'Материал', tone: 'ok' } : { ic: 'spark', label: 'Инсайт', tone: 'ok' };
      case 'mentor': return { ic: 'mic', label: 'Ментор time', tone: 'accent' };
      case 'ad': return a.type === 'partner' ? { ic: 'briefcase', label: 'Партнёр', tone: 'warn', ad: true }
        : { ic: 'market', label: 'Реклама · Экспонент', tone: 'warn', ad: true };
      case 'intro': return { ic: 'user', label: 'Интро', tone: 'dim' };
      case 'ask': return { ic: 'help', label: '#запрос', tone: 'accent' };
      case 'event': return { ic: 'calendar', label: '#ивент', tone: 'ok' };
      case 'digest': return { ic: 'list', label: 'Дайджест дня', tone: 'dim' };
      default: return { ic: 'dot', label: 'Запись', tone: 'dim' };
    }
  }

  /* ---------- метки записи (дополнительные: тип показывает верхняя строка карточки) ---------- */
  function tagsHTML(p) {
    const t = [], tg = p.tags || [];
    switch (p.kind) {
      case 'news': tg.forEach(x => t.push(tag(x, x === 'срочно' ? 'urgent' : 'accent'))); break;
      case 'insight': tg.filter(x => x !== 'материал').forEach(x => t.push(tag(x))); break;
      case 'ad':
        if (!(p.author && p.author.type === 'partner')) t.push(tag(tg[0] || 'Решения для роста бизнеса'));
        /* «на площадке» — только при платном размещении (пакеты «Экспо+» и «Премиум»); у партнёров метка в строке типа */
        if (p.paid && !(p.author && p.author.type === 'partner')) t.push(tag('на площадке'));
        break;
      default: break;
    }
    if (p.locked) t.push('<span class="fd-lock">' + icon('lock') + 'Скрыть нельзя</span>');
    if (p.review) t.push('<span class="tag fd-review">' + icon('clock') + 'Проверит модератор</span>');
    if (p.returned) t.push('<span class="tag fd-review">' + icon('alert') + 'Возвращена</span>');
    return t.join('');
  }
  /* верхняя строка карточки: значок и подпись типа, организаторы, время */
  function kindRow(p, o) {
    const v = viewOf(p);
    return '<div class="fd-kind"><span class="fd-kic">' + icon(v.ic) + '</span><span class="fd-klabel">' + esc(v.label) + '</span>' +
      (isOrg(p) && p.kind !== 'news' ? '<span class="fd-kcap">Организаторы</span>' : '') +
      (o && o.noTime ? '' : '<span class="fd-time">' + esc(p.time || '') + '</span>') + '</div>';
  }
  function authorRow(p, o) {
    if (isOrg(p)) return '';
    const a = authorOf(p);
    const inner = avatar(a.name, a.cls) + '<span class="fd-who"><span class="fd-name">' + esc(a.name) + '</span><span class="fd-sub">' + esc(a.sub) + '</span></span>';
    return '<div class="fd-head">' + (a.go && !(o && o.plain)
      ? '<button class="fd-author" data-go="' + esc(a.go) + '">' + inner + '</button>'
      : '<div class="fd-author">' + inner + '</div>') + '</div>';
  }
  const tagsRow = p => { const h = tagsHTML(p); return h ? '<div class="fd-tags">' + h + '</div>' : ''; };

  /* ---------- содержимое карточки по видам ---------- */
  function fileHTML(p, full) {
    const a = p.attach; if (!a) return '';
    const inner = icon('file') + '<span class="fd-file-t"><b>' + esc(a.name) + '</b><span class="cap">' + esc(a.size || '') + '</span></span>' +
      (full ? '<span class="fd-file-go">Открыть</span>' : '');
    return full
      ? '<button class="fd-file" data-act="r-file" data-arg="' + esc(a.name) + '">' + inner + '</button>'
      : '<div class="fd-file">' + inner + '</div>';
  }
  function speakerHTML(p) {
    const sp = p.speaker && F.speaker ? F.speaker(p.speaker) : null;
    if (!sp) return '';
    return '<button class="fd-ref" data-go="C5/' + esc(p.speaker) + '">' + avatar(sp.name, 'sm') +
      '<span class="fd-ref-t"><b>' + esc(sp.name) + '</b><span class="cap">' + esc(sp.role || '') + '</span></span>' + icon('chevR') + '</button>';
  }
  function eventHTML(p, full) {
    const ids = goingIds(p), ch = chatOfPost(p);
    let h = '';
    if (p.whenWhere) h += '<div class="fd-when">' + icon('pin') + '<span>' + esc(p.whenWhere) + '</span></div>';
    if (!ids.length) {
      h += '<div class="fd-going"><span class="cap">Пока никто не отметился</span></div>';
    } else {
      const stack = ids.slice(0, 5).map(id => avatar(nameOf(id), 'sm')).join('');
      h += '<div class="fd-going"><div class="avatar-stack">' + stack + '</div><span class="cap"><b>Идут: ' + ids.length + '</b>' +
        (ch && ch.limit ? ' из ' + ch.limit : '') + '</span></div>';
    }
    return h;
  }
  function extraHTML(p, full) {
    let h = '';
    if (p.kind === 'insight') h += fileHTML(p, full);
    if (p.kind === 'mentor') h += speakerHTML(p);
    if (p.kind === 'event') h += eventHTML(p, full);
    return h;
  }

  /* ---------- кнопки действий по видам (FR-FEED-01) ---------- */
  function actsHTML(p) {
    const a = p.author || {};
    const pid = a.type === 'person' ? a.ref : null;
    if (p.mine) {
      if (p.returned) return '<div class="fd-acts">' + goBtn('R3', 'Написать заново', 'btn-secondary', ' wide') + '</div>';
      if (p.kind === 'event' && !chatOfPost(p)) return '<div class="fd-acts">' + goBtn('R7/' + p.id, 'Создать чат встречи', 'btn-secondary', ' wide') + '</div>';
      if (p.kind === 'event') return '<div class="fd-acts">' + goBtn('R6/' + chatOfPost(p).id, 'Чат встречи', 'btn-secondary', ' wide') + '</div>';
      return '';
    }
    switch (p.kind) {
      case 'news':
        return p.link ? '<div class="fd-acts">' + goBtn(p.link, linkLabel(p.link), 'btn-secondary', ' wide') + '</div>' : '';
      case 'insight':
        return p.link ? '<div class="fd-acts">' + goBtn(p.link, linkLabel(p.link), 'btn-secondary', ' wide') + '</div>' : '';
      case 'mentor':
        return '<div class="fd-acts">' + goBtn('D1', 'Записаться', 'btn-primary', ' wide') + '</div>';
      case 'ad': {
        if (a.type === 'partner') return '<div class="fd-acts">' + goBtn(p.link || ('K2/' + a.ref), 'Карточка партнёра', 'btn-secondary', ' wide') + '</div>';
        const kt = p.subject === 'person' && F.KIPATALK ? F.KIPATALK.find(k => k.ex === a.ref && k.day === F.NOW.day) : null;
        const pb = kt ? pathBtn('kipatalk', a.ref, { day: kt.day, time: kt.time }) : pathBtn('stand', a.ref);
        return '<div class="fd-acts">' + goBtn(p.link || ('H2/' + a.ref), 'Карточка решения', 'btn-secondary') + pb + '</div>';
      }
      case 'intro':
        return '<div class="fd-acts">' + goBtn('F11/' + pid, 'Хочу познакомиться', 'btn-primary', ' wide') +
          pathBtn('person', pid) + goBtn('G2/' + pid, 'Встреча', 'btn-secondary') + '</div>';
      case 'ask':
        return '<div class="fd-acts">' + goBtn('F11/' + pid, 'Откликнуться', 'btn-primary', ' wide') + '</div>';
      case 'event': {
        const ch = chatOfPost(p), on = isGoing(p), full = noSeats(p);
        const going = full
          ? '<button class="btn btn-sm fd-b btn-secondary" disabled aria-disabled="true">Мест нет</button>'
          : '<button class="btn btn-sm fd-b ' + (on ? 'btn-primary' : 'btn-secondary') + '" data-act="r-going" data-arg="' + esc(p.id) +
            '" aria-pressed="' + on + '">' + (on ? icon('check') : '') + 'Иду</button>';
        return '<div class="fd-acts">' + going + (ch ? goBtn('R6/' + ch.id, 'Чат встречи', 'btn-secondary') : '') + '</div>';
      }
      case 'digest':
        return '<div class="fd-acts">' + goBtn('B8', 'Открыть дайджест', 'btn-secondary', ' wide') + '</div>';
      default: return '';
    }
  }

  /* ---------- карточка записи в ленте (R1) и в полном виде (R4) ---------- */
  function mineNote(p) {
    if (!p.mine) return '';
    return '<div class="cap fd-mine">' + (p.returned ? 'Модератор вернул запись. Причина: ' + esc(p.returned) + '.'
      : p.review ? 'Ваша запись. Видна вам, у участников появится после проверки модератора.'
        : 'Ваша запись опубликована: её видят участники.') + '</div>';
  }
  function cardHTML(p, o) {
    o = o || {};
    const v = viewOf(p);
    return '<article class="card interactive fd-card fd-t-' + v.tone + (v.ad ? ' fd-ad' : '') + (o.pinned ? ' fd-pinned' : '') +
      '" data-go="R4/' + esc(p.id) + '" data-kind="' + esc(p.kind) + '" data-post="' + esc(p.id) + '">' +
      kindRow(p) + authorRow(p) + tagsRow(p) +
      '<p class="fd-text">' + esc(p.text) + '</p>' +
      extraHTML(p, false) + mineNote(p) + actsHTML(p) +
      '</article>';
  }

  /* ---------- листы подтверждения ---------- */
  function reasonsHTML() {
    return '<div class="fd-reasons">' + (F.FEED_REASONS || []).map(r =>
      '<button class="chip fd-chip" data-act="r-reason" data-arg="' + esc(r) + '">' + esc(r) + '</button>').join('') + '</div>';
  }
  /* Лист жалобы: kind — post | chat | msg | user. Подтверждение кнопкой в листе (FR-FEED-09, FR-CHAT-05).
     Новость организаторов и запись партнёра скрыть нельзя (D-35): жалоба уходит модератору, запись остаётся в ленте. */
  function openReport(o) {
    S.rsel = null; S.report = o;
    const title = { post: 'Пожаловаться на запись', chat: 'Пожаловаться на чат', msg: 'Пожаловаться на сообщение', user: 'Пожаловаться на участника' }[o.kind];
    const note = o.kind === 'post'
      ? (o.locked ? 'Новости фестиваля и записи партнёров скрыть нельзя: обращение получит модератор, а запись останется в ленте.'
        : 'Запись сразу скроется у вас. Обращение получат главный модератор и дежурный.')
      : o.kind === 'msg'
        ? 'Сообщение сразу скроется у вас. Обращение получит группа админов чатов.'
        : o.kind === 'chat'
          ? 'Обращение получит группа админов чатов. Чтобы пожаловаться на сообщение или участника, нажмите на сообщение в переписке.'
          : 'Обращение получит группа админов чатов; решение и причина попадут в журнал.';
    D.openSheet('<div class="sheet-title">' + esc(title) + '</div>' +
      (o.preview ? '<div class="fd-quote">' + esc(o.preview) + '</div>' : '') +
      '<div class="cap" style="margin:10px 0 8px">Причина</div>' + reasonsHTML() +
      '<p class="cap" style="margin-top:12px">' + esc(note) + '</p>' +
      '<button class="btn btn-primary btn-block" data-act="r-report-send" disabled>Отправить жалобу</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Отмена</button>');
  }
  D.action('r-reason', el => {
    S.rsel = el.dataset.arg;
    document.querySelectorAll('.fd-reasons .chip').forEach(c => c.classList.toggle('on', c === el));
    const b = document.querySelector('[data-act="r-report-send"]'); if (b) b.removeAttribute('disabled');
  });
  /* запись в журнал жалоб консоли (FIX.FEED_REPORTS): очередь модерации читает её через FIX.MODERATION_QUEUE_FEED() */
  function logReport(o, why) {
    if (!F.feedReport) return;
    if (o.kind === 'post') F.feedReport({ kind: 'post', ref: o.id, reason: why });
    else if (o.kind === 'chat') F.feedReport({ kind: 'chat', ref: o.id, reason: why });
    else if (o.kind === 'msg') F.feedReport({ kind: 'message', ref: o.id, reason: why, chatId: o.chatId, msg: Number(String(o.id).split(':')[1]) });
    else F.feedReport({ kind: 'person', ref: o.id, reason: why, chatId: o.chatId, person: o.id });
  }
  D.action('r-report-send', () => {
    const o = S.report, why = S.rsel; if (!o || !why) return;
    S.reports.push({ kind: o.kind, id: o.id, reason: why });
    logReport(o, why);
    D.closeSheet();
    if (o.kind === 'post') {
      if (o.locked) {
        S.sent[o.id] = why;
        D.toast('Жалоба отправлена модератору. Запись остаётся в ленте: скрыть её нельзя');
        D.rerender();
        return;
      }
      S.reported[o.id] = why;
      D.toast('Жалоба отправлена. Запись скрыта у вас');
      if (/^#\/R4/.test(location.hash)) { go('R1'); } else { D.rerender(); }
    } else if (o.kind === 'msg') {
      S.msgHidden[o.id] = true;
      D.toast('Жалоба отправлена. Сообщение скрыто у вас');
      D.rerender();
    } else {
      D.toast('Жалоба отправлена группе админов чатов');
    }
  });

  /* Выход из раздела сбрасывает «Только в этот раз»; уход с R2 сбрасывает неприменённый черновик */
  window.addEventListener('hashchange', () => {
    const m = location.hash.match(/^#\/([A-Z])(\d+)/);
    if (!m || m[1] !== 'R') S.once = null;
    if (!(m && m[1] === 'R' && m[2] === '2')) D.st('R2').draft = null;
  });

  /* ---------- общие части экрана ---------- */
  const seg = active => '<div class="fd-segwrap">' + D.segbar([['R1', 'Лента'], ['R5', 'Мой чат']], active) + '</div>';
  function emptyBox(title, text, btn, ic) {
    return '<div class="empty fd-empty">' + icon(ic || 'feed') + '<div class="e-title">' + esc(title) + '</div><div class="e-text">' + esc(text) + '</div>' + (btn || '') + '</div>';
  }

  /* ======================= R1 Лента ======================= */
  D.register('R1', {
    tab: 'R1',
    meta: {
      title: 'R1 · Лента',
      role: 'Участник: лента записей (корневой экран вкладки «Лента»)',
      fr: ['FR-FEED-01', 'FR-FEED-02', 'FR-FEED-03', 'FR-FEED-08', 'FR-FEED-12', 'FR-UI-08'],
      ac: ['AC-FEED-01', 'AC-FEED-03', 'AC-FEED-08', 'AC-FEED-12'],
      what: [
        'Сегменты «Лента» и «Мой чат», ряд чипов по восьми видам с числом записей, кнопка «Настроить» (R2), плавающая «+» (R3).',
        'Срочные новости организаторов закреплены над лентой (при любом фильтре), ниже записи новее сверху. У каждой записи значок, подпись вида и цвет левой линии: новость фестиваля (метки «срочно» и «изменение», скрыть нельзя), инсайт и материал, «Ментор time», «Реклама · Экспонент» или «Партнёр», интро, интро с #запрос, интро с #ивент, дайджест дня.',
        'Кнопки по виду записи: «Хочу познакомиться» и «Откликнуться» ведут в F11, «Встреча» в выбор окна, «+ Путь» добавляет в «Мой путь», «Записаться» в «Менторские», «Иду» меняет отметку и счётчик, «Чат встречи» открывает чат. Карточка целиком открывает R4.',
        'Состояния: фильтр без записей, настройка «Только в этот раз», своя запись с пометкой «проверит модератор», запись скрыта жалобой.'
      ],
      rules: [
        'Источники ленты: организаторы, экспоненты и партнёры, интро участников; внешних лент и соцсетей нет.',
        'Новости фестиваля и записи партнёров скрыть нельзя (замок); остальные виды скрываются настройкой.',
        'У постов экспонентов пометка «Решения для роста бизнеса» или «Партнёр»; пакет не показывается.',
        'Рекламные посты участников запрещены; участники публикуют только интро с тегами #запрос и #ивент.',
        'Посты экспонентов подписаны «Реклама · Экспонент» (честная пометка рекламы); в строке автора стенд, пакет не показывается.',
        'Отметка «Иду» не создаёт записи в расписании; когда мест нет, вместо неё «Мест нет». Порядок записей по времени публикации, срочные новости закреплены сверху.'
      ],
      depends: ['D-33', 'D-34', 'D-35', 'D-36', 'D-54']
    },
    html(ctx) {
      const f = KIND_IDS.indexOf(ctx.param) >= 0 ? ctx.param : 'all';
      const posts = sortedPosts().filter(visible);
      const cnt = {}; posts.forEach(p => { cnt[p.kind] = (cnt[p.kind] || 0) + 1; });
      /* срочные новости организаторов закреплены над лентой при любом фильтре (в фильтре «Новости» они стоят в самом списке) */
      const pinned = f === 'news' ? [] : posts.filter(isUrgent);
      const list = (f === 'all' ? posts : posts.filter(p => p.kind === f)).filter(p => pinned.indexOf(p) < 0);
      const total = f === 'all' ? posts.length : list.length;

      let chips = '<button class="chip fd-chip' + (f === 'all' ? ' on' : '') + '" data-go="R1">Все <span class="fd-n">' + posts.length + '</span></button>';
      kinds().forEach(k => {
        if (!cnt[k.id] && f !== k.id) return;
        chips += '<button class="chip fd-chip' + (f === k.id ? ' on' : '') + '" data-go="R1/' + k.id + '">' + esc(k.short) +
          ' <span class="fd-n">' + (cnt[k.id] || 0) + '</span></button>';
      });

      const hiddenKinds = Object.keys(cfg().hidden).filter(k => cfg().hidden[k]).length;
      const note = S.once
        ? '<div class="banner info fd-notice">' + icon('eye') + '<div class="grow"><div class="b-title">Настройка только на этот раз</div>' +
          '<div class="cap">Сохранённая настройка вернётся, когда вы выйдете из раздела «Лента».</div>' +
          '<button class="feed-link" data-act="r-once-reset">Вернуть сохранённую ' + icon('chevR') + '</button></div></div>'
        : '';
      /* решения модератора по записям и чатам владельца демо (FIX.FEED_NOTICES) */
      const notices = (F.FEED_NOTICES || []).filter(n => n.to === 'me' && !n.seen).map(n =>
        '<div class="banner info fd-notice">' + icon('info') + '<div class="grow"><div class="b-title">' + (n.kind === 'approve' ? 'Модератор одобрил' : 'Решение модератора') + '</div>' +
        '<div class="cap">' + esc(n.text) + '</div><button class="feed-link" data-act="r-notice-seen" data-arg="' + esc(n.id) + '">Понятно</button></div></div>').join('');

      const filterLabel = f === 'all' ? 'Все виды' : (kindById(f) || {}).label;
      const meta = '<div class="fd-meta"><span class="cap"><b>' + esc(filterLabel) + '</b> · ' + total + ' ' +
        plural(total, ['запись', 'записи', 'записей']) + (hiddenKinds ? ' · скрыто видов: ' + hiddenKinds : '') + '</span>' +
        '<button class="btn btn-secondary btn-sm fd-b" data-go="R2">' + icon('cog') + 'Настроить</button></div>';

      const pin = pinned.length
        ? '<section class="fd-pinbox" aria-label="Закреплено"><div class="fd-pinhead">' + icon('pin') + '<b>Закреплено</b><span class="cap">срочное от организаторов</span></div>' +
          '<div class="fd-list">' + pinned.map(p => cardHTML(p, { pinned: true })).join('') + '</div></section>'
        : '';
      const body = list.length
        ? '<div class="fd-list">' + list.map(p => cardHTML(p)).join('') + '</div>'
        : emptyBox('Записей нет', f === 'all'
          ? 'Все виды скрыты настройкой или записи закончились. Включите виды в настройке ленты.'
          : 'В этом виде пока ничего нет или он скрыт настройкой. Посмотрите все записи.',
        '<button class="btn btn-secondary btn-sm fd-b" data-go="' + (f === 'all' ? 'R2' : 'R1') + '">' + (f === 'all' ? 'Настроить ленту' : 'Показать все') + '</button>');

      const myChats = (F.CHATS || []).filter(c => c.kind === 'meetup' && isMemberOf(c));
      const teaser = '<button class="card interactive fd-teaser" data-go="R5">' + icon('chat') +
        '<span class="grow"><b>Мой чат</b><span class="cap">Чат по билету «' + esc(F.ME.tariff) + '» и ' + myChats.length + ' ' +
        plural(myChats.length, ['чат встречи', 'чата встреч', 'чатов встреч']) + '</span></span>' + icon('chevR') + '</button>';

      return '<div class="scr">' +
        D.head({ eyebrow: 'Лента и чаты', title: 'Лента', sub: 'Новости фестиваля, инсайты и интро участников', paren: paren('сначала срочное, затем новое') }) +
        seg('R1') + D.chipRail(chips) +
        '<div class="fd-body">' + notices + note + meta + pin + body + (f === 'all' ? teaser : '') + '</div>' +
        '</div>' +
        /* плавающая «+» лежит рядом с .scr в оболочке экрана: не прокручивается и не входит в сетку содержимого */
        '<div class="fd-fab-wrap"><button class="fd-fab" data-go="R3" aria-label="Новая запись">' + icon('plus') + '</button></div>';
    }
  });

  D.action('r-notice-seen', el => {
    const n = (F.FEED_NOTICES || []).find(x => x.id === el.dataset.arg); if (n) n.seen = true;
    D.rerender();
  });

  D.action('r-once-reset', () => { S.once = null; D.toast('Сохранённая настройка вернулась'); D.rerender(); });
  D.action('r-going', el => {
    const p = F.post(el.dataset.arg); if (!p) return;
    const on = !isGoing(p);
    if (on && noSeats(p)) { D.toast('Мест нет: все места на встречу заняты'); return; }
    S.going[p.id] = on;
    D.toast(on ? 'Отметка «Иду» поставлена. В расписание встреча не добавляется' : 'Отметка «Иду» снята');
    D.rerender();
  });
  D.action('r-file', el => D.toast('Файл «' + el.dataset.arg + '» откроется на телефоне; в демо он не загружается'));

  /* участие в чате: общий помощник для R1 и экранов чатов */
  const skey = (c, arch) => (arch ? 'arch:' : '') + c.id;   // у архивного примера своё состояние: выход из него не затрагивает живой чат
  function isMemberOf(c, arch) {
    const k = skey(c, arch);
    if (S.left[k]) return false;
    return S.joined[k] === true || (c.memberIds || []).indexOf('me') >= 0;
  }

  /* ======================= R2 Настройка ленты ======================= */
  const R2_KIND_ORDER = ['insight', 'mentor', 'ad', 'intro', 'ask', 'event', 'digest'];
  const R2_DESC = { ad: 'Посты экспонентов фестиваля с пометкой' };
  const cloneCfg = c => ({ hidden: Object.assign({}, c.hidden), people: c.people.slice() });

  D.register('R2', {
    tab: 'R1',
    meta: {
      title: 'R2 · Настройка ленты',
      role: 'Участник: настройка ленты',
      fr: ['FR-FEED-03', 'FR-FEED-04'],
      ac: ['AC-FEED-03', 'AC-FEED-04'],
      what: [
        'Переключатели видов записей: инсайты и материалы, «Ментор time», посты экспонентов, интро, #запрос, #ивент, дайджест дня.',
        'Замки на «Новости фестиваля» и «Партнёры» с подписью «скрыть нельзя».',
        'Список скрытых людей с кнопкой «Вернуть» (скрыть автора можно в карточке записи R4).',
        'Кнопки «Сохранить» (настройка действует всегда) и «Только в этот раз» (настройка не сохраняется).',
        'Выход из экрана с несохранёнными изменениями открывает лист «Сохранить настройки?» с выбором «Сохранить», «Не сохранять», «Остаться».'
      ],
      rules: [
        'Новости фестиваля и записи партнёров скрыть нельзя (D-35); посты экспонентов скрываются настройкой (трактовка заказчика не уточнена).',
        'Скрытый вид и скрытый человек не попадают в ленту и в уведомления типа «Лента».',
        '«Только в этот раз» применяется до выхода из раздела и не меняет сохранённую настройку.'
      ],
      depends: ['D-35', 'D-54']
    },
    html(ctx) {
      const st = ctx.state;
      if (!st.draft) st.draft = cloneCfg(cfg());
      const d = st.draft;
      const rows = R2_KIND_ORDER.map(id => {
        const k = kindById(id); if (!k) return '';
        return '<label class="toggle-row fd-set"><span class="fd-set-t"><span class="tr-title">' + esc(k.label) + '</span>' +
          '<span class="tr-sub">' + esc(R2_DESC[id] || k.desc) + '</span></span>' +
          '<span class="toggle"><input type="checkbox" data-act="r2-kind" data-arg="' + id + '"' + (d.hidden[id] ? '' : ' checked') + ' aria-label="' + esc(k.label) + '"><span class="tr"></span></span></label>';
      }).join('');
      const lock = (title, sub) => '<div class="toggle-row fd-set fd-lockrow"><span class="fd-set-t"><span class="tr-title">' + esc(title) + '</span>' +
        '<span class="tr-sub">' + esc(sub) + '</span></span><span class="fd-lockbadge">' + icon('lock') + 'скрыть нельзя</span></div>';
      const ppl = d.people.length
        ? d.people.map(id => {
          const pe = F.person(id) || { name: id, role: '', company: '' };
          return '<div class="row fd-person"><button class="fd-plink" data-go="F2/' + esc(id) + '">' + avatar(pe.name, 'sm') +
            '<span class="fd-who"><span class="fd-name">' + esc(pe.name) + '</span><span class="fd-sub">' + esc([pe.role, pe.company].filter(Boolean).join(' · ')) + '</span></span></button>' +
            '<button class="btn btn-secondary btn-sm fd-b" data-act="r2-unhide" data-arg="' + esc(id) + '">Вернуть</button></div>';
        }).join('')
        : '<div class="fd-none cap">Вы никого не скрывали. Скрыть автора интро можно в карточке записи.</div>';
      const reported = Object.keys(S.reported).length;
      return '<div class="scr">' +
        D.head({ back: 'R1', eyebrow: 'Лента', title: 'Настройка ленты', sub: 'Какие записи показывать', paren: paren('новости и партнёров скрыть нельзя') }) +
        '<div class="fd-body">' +
        '<div class="sec-title fd-sec">Виды записей</div>' +
        '<div class="card fd-box">' + lock('Новости фестиваля', 'Срочные сообщения и изменения программы') + lock('Партнёры', 'Записи партнёров фестиваля') + rows + '</div>' +
        '<div class="sec-title fd-sec">Скрытые люди</div>' +
        '<div class="card fd-box">' + ppl + '</div>' +
        (reported ? '<div class="cap">Скрыто жалобами: ' + reported + ' ' + plural(reported, ['запись', 'записи', 'записей']) + '. Решение принимает модератор.</div>' : '') +
        '<p class="cap fd-hint">«Сохранить» оставляет настройку насовсем. «Только в этот раз» действует, пока вы в разделе «Лента», и не меняет сохранённую.</p>' +
        '</div>' +
        '<div class="fd-foot"><button class="btn btn-primary" data-act="r2-save">Сохранить</button>' +
        '<button class="btn btn-secondary" data-act="r2-once">Только в этот раз</button></div>' +
        '</div>';
    },
  });
  D.action('r2-kind', el => {
    const st = D.st('R2'); if (!st.draft) return;
    st.draft.hidden[el.dataset.arg] = !el.checked;
  });
  D.action('r2-unhide', el => {
    const st = D.st('R2'); if (!st.draft) return;
    st.draft.people = st.draft.people.filter(x => x !== el.dataset.arg);
    D.rerender();
  });
  D.action('r2-save', () => {
    const st = D.st('R2'); if (!st.draft) return;
    S.cfg = cloneCfg(st.draft); S.once = null; st.draft = null;
    D.toast('Настройка ленты сохранена');
    go('R1');
  });
  /* Несохранённые изменения не теряются молча: уход с R2 (кнопка «назад», вкладки, меню) открывает лист «Сохранить настройки?» */
  function r2Dirty() {
    const d = D.st('R2').draft, c = cfg();
    if (!d || !/^#\/R2(\/|$)/.test(location.hash)) return false;
    if (R2_KIND_ORDER.some(id => !!d.hidden[id] !== !!c.hidden[id])) return true;
    return d.people.slice().sort().join() !== c.people.slice().sort().join();
  }
  document.addEventListener('click', ev => {
    if (!r2Dirty()) return;
    const t = ev.target.closest && ev.target.closest('[data-go]');
    if (!t || t.closest('.sheet-wrap')) return;
    const to = t.getAttribute('data-go');
    if (/^R2(\/|$)/.test(to)) return;
    ev.preventDefault(); ev.stopPropagation();
    S.leaveTo = to;
    D.openSheet('<div class="sheet-title">Сохранить настройки?</div>' +
      '<p class="fd-rules-t">Вы изменили настройку ленты. Сохраните её, чтобы лента осталась такой, или выйдите без сохранения.</p>' +
      '<button class="btn btn-primary btn-block" data-act="r2-leave-save">Сохранить</button>' +
      '<button class="btn btn-secondary btn-block" data-act="r2-leave-drop">Не сохранять</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Остаться</button>');
  }, true);
  D.action('r2-leave-save', () => {
    const st = D.st('R2'); if (st.draft) { S.cfg = cloneCfg(st.draft); S.once = null; st.draft = null; }
    D.closeSheet(); D.toast('Настройка ленты сохранена'); go(S.leaveTo || 'R1');
  });
  D.action('r2-leave-drop', () => { D.st('R2').draft = null; D.closeSheet(); go(S.leaveTo || 'R1'); });
  D.action('r2-once', () => {
    const st = D.st('R2'); if (!st.draft) return;
    S.once = cloneCfg(st.draft); st.draft = null;
    D.toast('Настройка применена только на этот раз');
    go('R1');
  });

  /* ======================= R3 Новая запись ======================= */
  const R3_OPTS = [
    ['intro', 'Интро', 'Расскажите, кто вы и чем занимаетесь'],
    ['ask', 'Интро с #запрос', 'Ищете партнёра, решение или совет'],
    ['event', 'Интро с #ивент', 'Приглашаете за стол и в чат встречи']
  ];
  const lim = () => (F.FEED_LIMIT || { intro: 400, minIntro: 20 });

  function r3Check(st) {
    const t = (st.text || '').trim(), e = {};
    if (t.length < lim().minIntro) e.text = 'Напишите ещё хотя бы ' + (lim().minIntro - t.length) + ' ' + plural(lim().minIntro - t.length, ['знак', 'знака', 'знаков']);
    else if (t.length > lim().intro) e.text = 'Слишком длинно: не больше ' + lim().intro + ' знаков';
    else if (badContent(t)) e.text = BAD_TEXT;
    if (st.kind === 'event') {
      const w = (st.when || '').trim();
      if (w.length < 6) e.when = 'Укажите, когда и где вы встречаетесь';
      else if (badContent(w)) e.when = BAD_TEXT;
    }
    return e;
  }
  function nextPostId() { let n = 16; while (F.post('fp' + n)) n++; return 'fp' + n; }

  /* предпросмотр записи в листе подтверждения */
  function previewHTML(st) {
    const p = { kind: st.kind, tags: st.kind === 'ask' ? ['#запрос'] : st.kind === 'event' ? ['#ивент'] : [], review: true,
      author: { type: 'person', ref: 'me' }, time: '' };
    return '<div class="card fd-preview fd-card fd-t-' + viewOf(p).tone + '">' + kindRow(p, { noTime: true }) + authorRow(p, { plain: true }) + tagsRow(p) +
      '<p class="fd-text full">' + esc(st.text.trim()) + '</p>' +
      (st.kind === 'event' ? '<div class="fd-when">' + icon('pin') + '<span>' + esc(st.when.trim()) + '</span></div>' : '') + '</div>';
  }

  D.register('R3', {
    tab: 'R1',
    meta: {
      title: 'R3 · Новая запись',
      role: 'Участник: публикация интро',
      fr: ['FR-FEED-02', 'FR-FEED-05', 'FR-FEED-06', 'FR-CHAT-01'],
      ac: ['AC-FEED-02', 'AC-FEED-05', 'AC-FEED-06', 'AC-CHAT-01'],
      what: [
        'Выбор вида: «Интро», «Интро с #запрос», «Интро с #ивент»; в поле прозрачный пример-подсказка и кнопка «Вставить пример».',
        'Для #ивент поле «когда и где» и кнопка «Создать чат встречи» (переход в R7).',
        'Правило «рекламные посты запрещены, о бизнесе рассказывают через интро», пометка «запись проверит модератор».',
        'Публикация только по кнопке и после подтверждения в листе с предпросмотром; новая запись попадает в ленту с пометкой «Проверит модератор».',
        'Состояния: короткий и слишком длинный текст, внешняя ссылка или телефон (отклоняются), не заполнено «когда и где», чат уже создан.'
      ],
      rules: [
        'Участник публикует только интро, при желании с тегами #запрос и #ивент; других способов создать запись нет.',
        'Рекламные посты участников запрещены (D-35). Внешние ссылки и телефоны автофильтр отклоняет, внутренние ссылки допустимы.',
        'Лимит длины интро — параметр, значение заказчик не задал: в демо 400 знаков, минимум 20.',
        'Место для #ивент организует автор, приложение его не бронирует; запись #ивент не создаёт сессии, записи на сессию и файла календаря.'
      ],
      depends: ['D-34', 'D-35', 'D-33', 'D-54']
    },
    html(ctx) {
      const st = ctx.state;
      st.kind = st.kind || 'intro'; st.text = st.text || ''; st.when = st.when || '';
      const prompt = F.FEED_PROMPTS || {};
      const opts = R3_OPTS.map(o =>
        '<button class="fd-opt' + (st.kind === o[0] ? ' on' : '') + '" data-act="r3-kind" data-arg="' + o[0] + '" role="radio" aria-checked="' + (st.kind === o[0]) + '">' +
        '<span class="fd-radio"></span><span class="fd-set-t"><span class="tr-title">' + esc(o[1]) + '</span><span class="tr-sub">' + esc(o[2]) + '</span></span></button>').join('');
      const ch = st.chatId ? F.chat(st.chatId) : null;
      const eventBlock = st.kind === 'event'
        ? '<div class="field"><label for="r3-when">Когда и где</label>' +
          '<input class="input" id="r3-when" type="text" autocomplete="off" placeholder="' + esc(prompt.eventWhen || '28.02 · 10:45 · лобби основного отеля') + '" value="' + esc(st.when) + '">' +
          '<div class="hint">Место организуете вы: приложение его не бронирует.</div><div class="err-msg" id="r3-werr" hidden></div></div>' +
          (ch
            ? '<div class="banner ok">' + icon('chat') + '<div class="grow"><div class="b-title">Чат встречи создан</div><div class="cap">' + esc(ch.title) + '. Он откроется для участников после публикации записи.</div>' +
              '<button class="feed-link" data-go="R6/' + esc(ch.id) + '">Открыть чат ' + icon('chevR') + '</button></div></div>'
            : '<button class="btn btn-secondary btn-block" id="r3-chat" data-go="R7/draft" disabled>' + icon('chat') + 'Создать чат встречи</button>')
        : '';
      return '<div class="scr">' +
        D.head({ back: 'R1', eyebrow: 'Лента', title: 'Новая запись', sub: 'Интро для участников фестиваля', paren: paren('запись проверит модератор') }) +
        '<div class="fd-body nofab">' +
        '<div class="sec-title fd-sec">Что публикуем</div>' +
        '<div class="fd-opts" role="radiogroup" aria-label="Вид записи">' + opts + '</div>' +
        '<div class="banner info fd-rule">' + icon('info') + '<div class="grow"><div class="b-title">Рекламные посты запрещены</div>' +
        '<div class="cap">О бизнесе рассказывают через интро: кто вы, чем занимаетесь и кого ищете. Внешние ссылки и телефоны не принимаются.</div>' +
        '<button class="feed-link" data-go="L10">Кодекс участника ' + icon('chevR') + '</button></div></div>' +
        '<div class="field"><label for="r3-text">Текст интро</label>' +
        '<textarea class="textarea fd-ta" id="r3-text" rows="6" placeholder="' + esc(prompt[st.kind] || '') + '">' + esc(st.text) + '</textarea>' +
        '<div class="fd-fline"><button class="btn btn-ghost btn-sm fd-b" data-act="r3-example">Вставить пример</button>' +
        '<span class="counter" id="r3-count"><span id="r3-n">0</span> / ' + lim().intro + '</span></div>' +
        '<div class="err-msg" id="r3-err" hidden></div></div>' +
        eventBlock +
        (st.kind === 'event' && !ch ? '<p class="cap fd-hint">Чат встречи необязателен: запись можно опубликовать без него, а чат создать позже в карточке записи.</p>' : '') +
        '<button class="btn btn-primary btn-block" id="r3-pub" data-act="r3-publish" disabled>Опубликовать</button>' +
        '<p class="cap fd-note">' + icon('clock') + MOD_NOTE + '</p>' +
        '</div></div>';
    },
    mount(root) {
      const st = D.st('R3');
      const ta = root.querySelector('#r3-text'), wh = root.querySelector('#r3-when');
      const err = root.querySelector('#r3-err'), werr = root.querySelector('#r3-werr');
      const pub = root.querySelector('#r3-pub'), chat = root.querySelector('#r3-chat');
      const refresh = () => {
        if (ta) st.text = ta.value;
        if (wh) st.when = wh.value;
        const e = r3Check(st), len = st.text.trim().length;
        const n = root.querySelector('#r3-n'); if (n) n.textContent = len;
        const showT = len > 0 && !!e.text;
        if (err) { err.hidden = !showT; err.textContent = showT ? e.text : ''; }
        if (ta) ta.classList.toggle('err', showT && len >= lim().minIntro);
        const showW = !!(wh && st.when.trim().length > 0 && e.when);
        if (werr) { werr.hidden = !showW; werr.textContent = showW ? e.when : ''; }
        if (wh) wh.classList.toggle('err', showW);
        const ok = !e.text && !e.when;
        if (pub) pub.disabled = !ok;
        if (chat) chat.disabled = !ok;
      };
      if (ta) ta.addEventListener('input', refresh);
      if (wh) wh.addEventListener('input', refresh);
      refresh();
    }
  });
  D.action('r3-kind', el => {
    const st = D.st('R3');
    if (st.chatId && el.dataset.arg !== 'event') { D.toast('Чат встречи уже создан: запись остаётся с #ивент'); return; }
    st.kind = el.dataset.arg; D.rerender();
  });
  D.action('r3-example', () => {
    const st = D.st('R3'); st.text = (F.FEED_PROMPTS || {})[st.kind] || '';
    if (st.kind === 'event') st.when = st.when || (F.FEED_PROMPTS || {}).eventWhen || '';
    D.rerender();
  });
  D.action('r3-publish', () => {
    const st = D.st('R3');
    if (Object.keys(r3Check(st)).length) { D.toast('Проверьте текст записи'); return; }
    D.openSheet('<div class="sheet-title">Опубликовать запись?</div>' + previewHTML(st) +
      '<p class="cap" style="margin-top:12px">' + esc(MOD_NOTE) + '</p>' +
      '<button class="btn btn-primary btn-block" data-act="r3-confirm">Опубликовать</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Продолжить редактирование</button>');
  });
  D.action('r3-confirm', () => {
    const st = D.st('R3');
    if (Object.keys(r3Check(st)).length) { D.closeSheet(); return; }
    const id = nextPostId();
    const p = {
      id, kind: st.kind, author: { type: 'person', ref: 'me' },
      tags: st.kind === 'ask' ? ['#запрос'] : st.kind === 'event' ? ['#ивент'] : [],
      text: st.text.trim(), time: F.feedNow ? F.feedNow() : F.NOW.time, ago: 0, mine: true, review: true, link: 'F12/co00'
    };
    if (st.kind === 'event') {
      p.whenWhere = st.when.trim(); p.going = [];
      if (st.chatId) {
        p.chatId = st.chatId;
        const ch = F.chat(st.chatId);
        if (ch) { ch.postId = id; ch.draft = false; }     // запись опубликована: метка «ждёт публикации записи» снимается, чат ждёт проверки
      }
    }
    F.FEED_POSTS.unshift(p);
    st.text = ''; st.when = ''; st.chatId = null;
    D.closeSheet();
    D.toast('Запись отправлена модератору на проверку');
    go('R1');
  });

  /* ======================= R4 Карточка записи ======================= */
  const KIND_TITLE = { news: 'Новость фестиваля', insight: 'Инсайт', mentor: 'Ментор time', ad: 'Реклама экспонента',
    intro: 'Интро', ask: 'Интро · #запрос', event: 'Интро · #ивент', digest: 'Дайджест дня' };
  function r4Title(p) {
    if (p.kind === 'insight' && p.attach) return 'Материал';
    if (p.kind === 'ad' && p.author && p.author.type === 'partner') return 'Партнёр';
    return KIND_TITLE[p.kind] || 'Запись';
  }
  function goingListHTML(p) {
    const ids = goingIds(p);
    let h = '<div class="sec-title fd-sec">Идут · ' + ids.length + '</div>';
    if (!ids.length) return h + '<div class="card fd-box"><div class="fd-none cap">Пока никто не отметился. Отметка «Иду» не добавляет встречу в расписание.</div></div>';
    h += '<div class="card fd-box">' + ids.map(id => {
      if (id === 'me') {
        return '<div class="row fd-person"><span class="fd-plink">' + avatar(F.ME.name, 'sm') + '<span class="fd-who"><span class="fd-name">Вы</span><span class="fd-sub">' +
          esc(F.ME.name + ' · ' + F.ME.company) + '</span></span></span></div>';
      }
      const pe = F.person(id) || { name: id };
      return '<div class="row fd-person"><button class="fd-plink" data-go="F2/' + esc(id) + '">' + avatar(pe.name, 'sm') + '<span class="fd-who"><span class="fd-name">' +
        esc(pe.name) + '</span><span class="fd-sub">' + esc([pe.role, pe.company].filter(Boolean).join(' · ')) + '</span></span>' + icon('chevR') + '</button></div>';
    }).join('') + '</div>' +
      '<div class="cap">Отметка «Иду» не создаёт записи в расписании: встреча добавляется в «Мой путь» отдельно.</div>';
    return h;
  }

  D.register('R4', {
    tab: 'R1',
    meta: {
      title: 'R4 · Карточка записи',
      role: 'Участник: запись ленты целиком',
      fr: ['FR-FEED-01', 'FR-FEED-09', 'FR-FEED-12', 'FR-FEED-04'],
      ac: ['AC-FEED-09', 'AC-FEED-12'],
      what: [
        'Полный текст записи, автор (ссылка на профиль, карточку решения или карточку партнёра), метки и вложение.',
        'Действия по виду записи те же, что в ленте; для #ивент список «Иду» со счётчиком и ссылка на чат встречи.',
        'Кнопки «Пожаловаться» (лист с причинами и подтверждением) и «Скрыть автора» (для интро).',
        'Состояния: запись не найдена, запись скрыта жалобой, своя запись на проверке модератора.'
      ],
      rules: [
        'Жалоба сразу скрывает запись у заявителя; обращение получают главный модератор и дежурный.',
        'Причины жалобы: реклама, оскорбление, спам, другое.',
        'Список «Иду» показан участникам (по спецификации v3); в ТЗ видимость списка автору — предложение, согласовать.',
        'Пакет экспонента в записи не показывается.'
      ],
      depends: ['D-35', 'D-54']
    },
    html(ctx) {
      const p = ctx.param ? F.post(ctx.param) : null;
      const wrap = inner => '<div class="scr">' + inner + '</div>';
      if (!p || p.removed || ((p.review || p.returned) && !p.mine)) {
        return wrap(D.head({ backHist: true, eyebrow: 'Запись ленты', title: 'Запись не найдена', paren: paren('возможно, срок жизни записи вышел') }) +
          '<div class="fd-body nofab">' + emptyBox('Нет такой записи', 'Она могла быть удалена модератором или скрыта настройкой.',
            '<button class="btn btn-secondary btn-sm fd-b" data-go="R1">В ленту</button>') + '</div>');
      }
      if (S.reported[p.id]) {
        return wrap(D.head({ backHist: true, eyebrow: 'Запись ленты', title: 'Запись скрыта', paren: paren('жалоба отправлена') }) +
          '<div class="fd-body nofab">' + emptyBox('Вы пожаловались', 'Запись скрыта у вас. Причина: ' + String(S.reported[p.id]).toLowerCase() + '. Решение принимает модератор.',
            '<button class="btn btn-secondary btn-sm fd-b" data-go="R1">В ленту</button>') + '</div>');
      }
      const a = authorOf(p), v = viewOf(p);
      const co = p.link && p.link.indexOf('F12/') === 0 ? F.company(p.link.slice(4)) : null;
      const ch = p.kind === 'event' ? chatOfPost(p) : null;
      const canHide = a.pid && a.pid !== 'me';
      const locked = !!(p.locked || p.kind === 'news');
      const state = p.review
        ? '<div class="banner info fd-notice">' + icon('clock') + '<div class="grow"><div class="b-title">Запись на проверке</div><div class="cap">Её видите вы. У участников она появится после проверки модератора.</div></div></div>'
        : p.returned
          ? '<div class="banner warn fd-notice">' + icon('alert') + '<div class="grow"><div class="b-title">Модератор вернул запись</div><div class="cap">Причина: ' + esc(p.returned) + '. Напишите запись заново.</div></div></div>'
          : '';
      const card = '<article class="card fd-card fd-full fd-t-' + v.tone + (v.ad ? ' fd-ad' : '') + '" data-post="' + esc(p.id) + '">' + kindRow(p, { noTime: true }) + authorRow(p) + tagsRow(p) +
        '<p class="fd-text full">' + esc(p.text) + '</p>' +
        extraHTML(p, true) +
        (co ? '<button class="fd-ref" data-go="F12/' + esc(co.id) + '">' + icon('building') + '<span class="fd-ref-t"><b>' + esc(co.name) + '</b><span class="cap">Компания автора</span></span>' + icon('chevR') + '</button>' : '') +
        (ch ? '<div class="cap fd-chatline">' + icon('chat') + '<span>Чат встречи: ' + esc(ch.title) + ', участников ' + memberIdsOf(ch).length + ' из ' + esc(ch.limit) + '</span></div>' : '') +
        mineNote(p) + actsHTML(p) + '</article>';
      const at = /^вчера, /.test(p.time || '') ? 'вчера в ' + esc(String(p.time).replace(/^вчера, /, '')) : 'в ' + esc(p.time || '');
      const sub = p.mine ? (p.review ? 'Отправлена на проверку ' : p.returned ? 'Отправлена ' : 'Опубликована ') + at : 'Опубликовано ' + at;
      const tools = p.mine ? '' : S.sent[p.id]
        ? '<div class="banner info fd-notice">' + icon('check') + '<div class="grow"><div class="b-title">Жалоба отправлена</div><div class="cap">Причина: ' + esc(String(S.sent[p.id]).toLowerCase()) + '. Модератор рассмотрит её; запись остаётся в ленте.</div></div></div>'
        : '<div class="fd-tools">' +
          '<button class="btn btn-ghost btn-sm fd-b" data-act="r4-report" data-arg="' + esc(p.id) + '">' + icon('alert') + 'Пожаловаться</button>' +
          (canHide ? '<button class="btn btn-secondary btn-sm fd-b" data-act="r4-hide" data-arg="' + esc(a.pid) + '">' + icon('minusCircle') + 'Скрыть автора</button>' : '') + '</div>';
      return wrap(D.head({ backHist: true, eyebrow: 'Запись ленты', title: r4Title(p), sub, paren: locked ? paren('скрыть нельзя') : '' }) +
        '<div class="fd-body nofab">' + state + card +
        (p.kind === 'event' ? goingListHTML(p) : '') + tools +
        '</div>');
    }
  });
  D.action('r4-report', el => {
    const p = F.post(el.dataset.arg); if (!p) return;
    openReport({ kind: 'post', id: p.id, locked: !!(p.locked || p.kind === 'news'), preview: p.text.length > 110 ? p.text.slice(0, 107) + '…' : p.text });
  });
  D.action('r4-hide', el => {
    const pid = el.dataset.arg; if (!pid) return;
    [S.cfg, S.once].forEach(c => { if (c && c.people.indexOf(pid) < 0) c.people.push(pid); });
    D.toast('Автор скрыт. Вернуть его можно в настройке ленты');
    go('R1');
  });
  /* ======================= чаты: общие помощники ======================= */
  const chatsOf = kind => (F.CHATS || []).filter(c => c.kind === kind);
  function memberIdsOf(c, arch) {
    const ids = (c.memberIds || []).filter(id => id !== 'me');
    if (isMemberOf(c, arch)) ids.unshift('me');
    return ids;
  }
  const isFull = (c, arch) => !isMemberOf(c, arch) && memberIdsOf(c, arch).length >= (c.limit || 0);
  const sender = from => from === 'me' ? 'Вы' : from === 'mod' ? 'Модератор' : firstName(nameOf(from));
  const msgGone = (c, m, i) => !!(S.msgHidden[c.id + ':' + i] || (m && (m.hidden || m.removed)));
  function lastMsg(c) {
    const ms = c.messages || [];
    for (let i = ms.length - 1; i >= 0; i--) { if (!msgGone(c, ms[i], i)) return ms[i]; }
    return null;
  }
  const hhmm = t => String(t || '').replace(/^вчера, /, '');
  const nowTime = () => F.feedNow ? F.feedNow() : F.NOW.time;
  function chatParam() {
    const m = location.hash.match(/^#\/R6\/(arch-)?(ch\d+)/);
    return m ? { arch: !!m[1], id: m[2] } : null;
  }
  /* метки чата: до публикации записи «ждёт публикации записи», после неё чат ждёт проверки модератора */
  function chatTags(c, arch) {
    const t = [];
    if (arch || c.archived) t.push(tag('архивирован'));
    if (c.closed) t.push('<span class="tag fd-review">' + icon('lock') + 'закрыт модератором</span>');
    else if (c.returned) t.push('<span class="tag fd-review">' + icon('alert') + 'возвращён модератором</span>');
    else if (c.pending && c.draft) t.push('<span class="tag fd-review">' + icon('clock') + 'ждёт публикации записи</span>');
    else if (c.pending) t.push('<span class="tag fd-review">' + icon('clock') + 'проверит модератор</span>');
    if (c.owner === 'me') t.push(tag('ваш чат', 'accent'));
    return t.join('');
  }

  /* ======================= R5 Мой чат ======================= */
  D.register('R5', {
    tab: 'R1',
    meta: {
      title: 'R5 · Мой чат',
      role: 'Участник: чат по билету и чаты встреч (сегмент вкладки «Лента»)',
      fr: ['FR-CHAT-08', 'FR-CHAT-04', 'FR-CHAT-10', 'FR-CHAT-11', 'FR-UI-08'],
      ac: ['AC-CHAT-08', 'AC-CHAT-10'],
      what: [
        '«Чат по моему билету»: строка с пометкой «откроется в Telegram» (группа по праву тарифа; только своего тарифа).',
        '«Чаты встреч» — чаты, в которых вы участвуете: название, число участников, время встречи, последнее сообщение, метки «архивирован», «ждёт публикации записи», «ваш чат».',
        'Пустое состояние, если чатов нет; пример архивного чата по ссылке внизу.',
        'Подпись: чат встречи живёт до конца фестиваля, модерирует группа админов.'
      ],
      rules: [
        'Чатов по тарифам внутри приложения нет (D-30, D-33): чат по билету — группа Telegram, ссылка раскрывается по правам.',
        'Общего чата для всех участников нет; единственные чаты в приложении — чаты встреч.',
        'Ссылку на группу тарифа, которой нет по праву, не показываем.'
      ],
      depends: ['D-30', 'D-33', 'D-54']
    },
    html() {
      const tg = chatsOf('telegram')[0];
      const mine = chatsOf('meetup').filter(c => isMemberOf(c));
      const tgRow = tg
        ? '<button class="card interactive fd-teaser" data-go="R6/' + tg.id + '">' + icon('send') +
          '<span class="grow"><b>' + esc(tg.title) + '</b><span class="cap">Группа Telegram для билета «' + esc(tg.tariff) + '»</span>' +
          '<span class="fd-ctags">' + tag('откроется в Telegram', 'accent') + '</span></span>' + icon('chevR') + '</button>'
        : '<div class="card fd-box"><div class="fd-none cap">Чат по билету появится после оплаты билета.</div></div>';
      const rows = mine.map(c => {
        const lm = lastMsg(c), n = memberIdsOf(c).length;
        return '<button class="fd-crow" data-go="R6/' + esc(c.id) + '">' +
          '<span class="fd-cic">' + icon('chat') + '</span>' +
          '<span class="fd-ct"><span class="fd-ctitle">' + esc(c.title) + '</span>' +
          '<span class="fd-cmeta">' + n + ' ' + plural(n, ['участник', 'участника', 'участников']) + ' · ' + esc(c.when) + '</span>' +
          (lm ? '<span class="fd-clast"><b>' + esc(sender(lm.from)) + ':</b> ' + esc(lm.text) + '</span>' : '') +
          '<span class="fd-ctags">' + chatTags(c) + '</span></span>' +
          '<span class="fd-cr">' + (lm ? '<span class="fd-ctime">' + esc(hhmm(lm.time)) + '</span>' : '') + icon('chevR') + '</span></button>';
      }).join('');
      const list = mine.length
        ? '<div class="card fd-box fd-clist">' + rows + '</div>'
        : emptyBox('Чатов встреч пока нет', 'Откликнитесь на запись #ивент в ленте: кнопка «Чат встречи» откроет чат.',
          '<button class="btn btn-secondary btn-sm fd-b" data-go="R1/event">Записи #ивент</button>', 'chat');
      return '<div class="scr">' +
        D.head({ eyebrow: 'Лента и чаты', title: 'Мой чат', sub: 'Чат по билету и чаты встреч', paren: paren(CHAT_TERM.toLowerCase().replace(/\.$/, '')) }) +
        seg('R5') +
        '<div class="fd-body nofab">' +
        '<div class="sec-title fd-sec">Чат по моему билету</div>' + tgRow +
        '<div class="sec-title fd-sec">Чаты встреч · ' + mine.length + '</div>' + list +
        '<button class="btn btn-ghost btn-block fd-b" data-go="R6/arch-ch01">Пример: чат после конца фестиваля</button>' +
        '</div></div>';
    }
  });

  /* ======================= R6 Чат встречи ======================= */
  function tgScreen(c) {
    return '<div class="scr">' +
      D.head({ back: 'R5', eyebrow: 'Мой чат', title: 'Чат по билету', sub: 'Группа Telegram · билет «' + esc(c.tariff) + '»', paren: paren('откроется в Telegram') }) +
      '<div class="fd-body nofab">' +
      '<div class="card fd-box fd-tgbox"><div class="fd-tgic">' + icon('send') + '</div>' +
      '<div class="fd-tgt"><b>' + esc(c.title) + '</b><span class="cap">Этот чат живёт в Telegram, внутри приложения его нет. Ссылка раскрывается по праву вашего тарифа.</span></div></div>' +
      '<button class="btn btn-primary btn-block" data-act="r6-tg">' + icon('arrowUR') + 'Открыть в Telegram</button>' +
      '<button class="btn btn-ghost btn-block" data-go="R5">Вернуться в «Мой чат»</button>' +
      '<p class="cap">В демо переход в Telegram не выполняется: внешних запросов нет. Чаты встреч живут в приложении и открываются из ленты.</p>' +
      '</div></div>';
  }
  function msgHTML(c, m, i) {
    const t = hhmm(m.time);
    if (S.msgHidden[c.id + ':' + i]) return '<div class="fd-hid cap">' + icon('eye') + 'Сообщение скрыто: жалоба отправлена группе админов</div>';
    if (m.hidden || m.removed) return '<div class="fd-hid cap">' + icon('eye') + 'Сообщение скрыто модератором</div>';
    if (m.from === 'me') {
      return '<div class="fd-m me"><div class="fd-bub"><span class="fd-bt">' + esc(m.text) + '</span><span class="fd-mt">' + esc(t) + '</span></div></div>';
    }
    if (m.from === 'mod') {
      return '<div class="fd-m"><div class="fd-bub mod"><span class="fd-bn">' + tag('Модератор', 'accent') + '<b>Группа админов</b></span>' +
        '<span class="fd-bt">' + esc(m.text) + '</span><span class="fd-mt">' + esc(t) + '</span></div></div>';
    }
    const pe = F.person(m.from) || { name: m.from };
    return '<div class="fd-m"><button class="fd-mav" data-go="F2/' + esc(m.from) + '" aria-label="Профиль: ' + esc(pe.name) + '">' + avatar(pe.name, 'sm') + '</button>' +
      '<button class="fd-bub other" data-act="r6-msg" data-arg="' + i + '">' +
      '<span class="fd-bn"><b>' + esc(pe.name) + '</b>' + (m.from === c.owner ? '<span class="fd-own">автор чата</span>' : '') + '</span>' +
      '<span class="fd-bt">' + esc(m.text) + '</span><span class="fd-mt">' + esc(t) + '</span></button></div>';
  }
  function thread(c) {
    let h = '', day = '';
    (c.messages || []).forEach((m, i) => {
      const d = /^вчера/.test(m.time) ? 'Вчера' : 'Сегодня';
      if (d !== day) { day = d; h += '<div class="fd-day"><span>' + d + '</span></div>'; }
      h += msgHTML(c, m, i);
    });
    return h;
  }

  D.register('R6', {
    tab: 'R1',
    meta: {
      title: 'R6 · Чат встречи',
      role: 'Участник чата встречи (чат по билету ch00 открывает Telegram)',
      fr: ['FR-CHAT-02', 'FR-CHAT-03', 'FR-CHAT-04', 'FR-CHAT-05', 'FR-CHAT-06', 'FR-CHAT-07', 'FR-CHAT-11'],
      ac: ['AC-CHAT-02', 'AC-CHAT-03', 'AC-CHAT-04', 'AC-CHAT-05', 'AC-CHAT-07', 'AC-CHAT-11'],
      what: [
        'Компактная шапка: название чата, время и место в одну строку; под ней закреплённое правило и «Участники N из M». «Правила чата», «Пожаловаться на чат» и «Выйти из чата» в меню «…» в шапке; переписке отдана больше половины экрана.',
        'Сообщения: свои справа, чужие слева с именем (профиль по нажатию на аватар), метка «Модератор» у группы админов; решение модератора скрывает сообщение у всех.',
        'Поле ввода: отправка добавляет сообщение (только текст, до 500 знаков; телефоны и внешние ссылки отклоняются).',
        '«Пожаловаться» на чат, сообщение (нажать на сообщение) и участника; «Выйти из чата» с подтверждением; жалоба скрывает сообщение у заявителя.',
        'Состояния по параметру маршрута: ch01, ch02, ch03 — обычный чат; arch-ch01 — «чат архивирован» (чтение есть, записи нет; выход из примера не затрагивает живой чат); ch00 — чат по билету, открывает Telegram; вы вышли из чата, мест нет, ждёт публикации записи, чат проверит модератор, возвращён или закрыт модератором, чат не найден.'
      ],
      rules: [
        'Чат живёт до конца фестиваля, затем архивируется; модерирует отдельная группа админов (D-33, D-54).',
        'Читать и писать могут только участники; вложений, голосовых, реакций и личных сообщений нет (предложение, согласовать).',
        'Лимиты длины и частоты сообщений — параметры, значения не заданы: в демо 500 знаков, частота не ограничена.',
        'Заблокированные друг другом и блокировка в чате (FR-CHAT-06/07) в демо не показаны.'
      ],
      depends: ['D-30', 'D-33', 'D-54']
    },
    html(ctx) {
      const wrap = inner => '<div class="scr">' + inner + '</div>';
      const pr = (ctx.param || '').match(/^(arch-)?(ch\d+)$/);
      const c = pr ? F.chat(pr[2]) : null;
      if (!c) {
        return wrap(D.head({ back: 'R5', eyebrow: 'Мой чат', title: 'Чат не найден', paren: paren('проверьте ссылку') }) +
          '<div class="fd-body nofab">' + emptyBox('Нет такого чата', 'Чат мог быть закрыт группой админов или не существует.',
            '<button class="btn btn-secondary btn-sm fd-b" data-go="R5">К моим чатам</button>', 'chat') + '</div>');
      }
      if (c.kind === 'telegram') return tgScreen(c);

      const arch = !!pr[1] || !!c.archived;
      const member = isMemberOf(c, arch);
      const ids = memberIdsOf(c, arch);
      const eyebrow = arch ? 'Чат архивирован' : 'Лента и чаты';
      const sub = '<b class="fd-ctt">' + esc(c.title) + '</b>', pr2 = paren(c.when + (c.place ? ' · ' + c.place : ''));

      if (!member) {
        const full = isFull(c, arch), wasIn = !!S.left[skey(c, arch)];
        return wrap(D.head({ backHist: true, eyebrow, title: 'Чат встречи', sub, paren: pr2 }) +
          '<div class="fd-body nofab">' + (arch
            ? emptyBox(wasIn ? 'Вы вышли из архива' : 'Вы не в этом чате', 'Чат архивирован: вступить нельзя. Это пример: архив можно открыть заново.',
              '<button class="btn btn-secondary btn-sm fd-b" data-act="r6-join" data-arg="' + esc(c.id) + '">Открыть пример заново</button>', 'chat')
            : emptyBox(wasIn ? 'Вы вышли из чата' : 'Вы не в этом чате',
              full ? 'Мест нет: лимит участников ' + c.limit + ' достигнут.' : 'Читать и писать могут только участники. Свободно мест: ' + (c.limit - ids.length) + ' из ' + c.limit + '.',
              full ? '' : '<button class="btn btn-primary btn-sm fd-b" data-act="r6-join" data-arg="' + esc(c.id) + '">Вступить в чат</button>', 'chat')) + '</div>');
      }

      const st = ctx.state;
      const pin = String(c.rules || 'Без рекламы и рассылок, только вопросы по теме встречи').replace(/^Чат живёт до конца фестиваля\.\s*/, '');
      /* состояние чата у автора: до публикации записи, на проверке, возвращён или закрыт модератором */
      let pend = '';
      if (c.closed) pend = '<div class="fd-pend off">' + icon('lock') + '<span><b>Чат закрыт модератором.</b> Причина: ' + esc(c.closed) + '.</span></div>';
      else if (c.returned) pend = '<div class="fd-pend off">' + icon('alert') + '<span><b>Модератор вернул чат.</b> Причина: ' + esc(c.returned) + '.</span></div>';
      else if (arch) pend = '';
      else if (c.pending && c.draft) pend = '<button class="fd-pend" data-go="R3">' + icon('clock') +
        '<span><b>Ждёт публикации записи.</b> Участники войдут, когда запись появится в ленте. К черновику записи</span>' + icon('chevR') + '</button>';
      else if (c.pending) pend = '<button class="fd-pend" data-go="' + (c.postId ? 'R4/' + esc(c.postId) : 'R3') + '">' + icon('clock') +
        '<span><b>Чат проверит модератор.</b> Участники войдут после проверки. ' + (c.postId ? 'К записи' : 'К черновику записи') + '</span>' + icon('chevR') + '</button>';
      const composer = arch
        ? '<div class="fd-compose off">' + icon('lock') + '<span>Чат архивирован: запись закрыта</span></div>'
        : c.closed
          ? '<div class="fd-compose off">' + icon('lock') + '<span>Чат закрыт: писать нельзя</span></div>'
          : '<div class="fd-cerr err-msg" id="r6-err" hidden></div>' +
          '<div class="fd-compose"><input class="fd-input" id="r6-in" type="text" autocomplete="off" placeholder="Сообщение" value="' + esc((st.drafts || {})[c.id] || '') + '" aria-label="Сообщение">' +
          '<button class="fd-send" data-act="r6-send" aria-label="Отправить">' + icon('send') + '</button></div>';

      return '<div class="scr fd-chatscr">' +
        D.head({ backHist: true, noBell: true, right: '<button class="icon-btn" data-act="r6-menu" aria-label="Меню чата">' + icon('more') + '</button>',
          eyebrow, title: 'Чат встречи', sub, paren: pr2 }) +
        '<div class="fd-strip">' + pend +
        '<div class="fd-prow"><button class="fd-pin" data-act="r6-rules">' + icon('bookmark') + '<span><b>Правило</b> ' + esc(pin) + '</span></button>' +
        '<button class="fd-mem" data-act="r6-members">Участники<span class="fd-sbn">' + ids.length + ' из ' + esc(c.limit) + '</span></button></div></div>' +
        '<div class="fd-msgs" id="r6-msgs">' + thread(c) + '</div>' +
        '<div class="fd-foot2">' + composer + '</div>' +
        '</div>';
    },
    mount(root, ctx) {
      const box = root.querySelector('#r6-msgs');
      if (box) {
        const keep = S.keepBox != null && S.keepHash === location.hash && Date.now() - S.keepAt < 1500;
        box.scrollTop = keep ? S.keepBox : box.scrollHeight;
      }
      S.keepBox = null;
      const inp = root.querySelector('#r6-in'); if (!inp) return;
      const st = D.st('R6');
      const cid = (chatParam() || {}).id;
      inp.addEventListener('input', () => { st.drafts = st.drafts || {}; st.drafts[cid] = inp.value; const e = root.querySelector('#r6-err'); if (e) e.hidden = true; });
      inp.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); send(); } });
      if (S.refocus) { inp.focus(); S.refocus = false; }
    }
  });
  /* прокрутка переписки сохраняется при перерисовке (жалоба, листы): запоминаем в момент нажатия */
  document.addEventListener('click', ev => {
    if (!/^#\/R6\//.test(location.hash) || !ev.target.closest('[data-act]')) return;
    const b = document.querySelector('#r6-msgs'); S.keepBox = b ? b.scrollTop : null; S.keepAt = Date.now(); S.keepHash = location.hash;
  }, true);

  function send() {
    const c = chatParam() && F.chat(chatParam().id); if (!c) return;
    const inp = document.querySelector('#r6-in'), err = document.querySelector('#r6-err'); if (!inp) return;
    const text = inp.value.trim(), st = D.st('R6');
    const fail = m => { if (err) { err.textContent = m; err.hidden = false; } };
    if (!text) { fail('Напишите сообщение'); return; }
    if (text.length > 500) { fail('Слишком длинно: не больше 500 знаков'); return; }
    if (badContent(text)) { fail('В чате нельзя отправлять телефоны и внешние ссылки'); return; }
    c.messages.push({ from: 'me', text, time: nowTime() });
    st.drafts = st.drafts || {}; st.drafts[c.id] = ''; S.refocus = true; S.keepBox = null;
    D.rerender();
  }
  D.action('r6-send', send);
  D.action('r6-tg', () => D.toast('В демо переход в Telegram не выполняется'));
  D.action('r6-join', el => {
    const c = F.chat(el.dataset.arg), pc = chatParam(), arch = !!(pc && pc.arch) || !!(c && c.archived); if (!c) return;
    if (isFull(c, arch)) { D.toast('Мест нет: лимит участников достигнут'); return; }
    S.left[skey(c, arch)] = false; S.joined[skey(c, arch)] = true;
    D.toast(arch ? 'Архив открыт' : 'Вы вошли в чат'); D.rerender();
  });
  D.action('r6-rules', () => {
    const pc = chatParam(), c = pc && F.chat(pc.id); if (!c) return;
    const own = c.owner === 'me' ? 'Вы' : nameOf(c.owner);
    D.openSheet('<div class="sheet-title">Правила чата</div>' +
      '<p class="fd-rules-t">' + esc(c.rules || '') + '</p>' +
      '<div class="list"><div class="row"><div class="grow"><div class="r-title">Название</div><div class="r-sub fd-wrap">' + esc(c.title) + '</div></div></div>' +
      '<div class="row"><div class="grow"><div class="r-title">Когда</div><div class="r-sub">' + esc(c.when) + '</div></div></div>' +
      '<div class="row"><div class="grow"><div class="r-title">Где</div><div class="r-sub">' + esc(c.place || 'место уточняет автор') + '</div></div></div>' +
      '<div class="row"><div class="grow"><div class="r-title">Автор чата</div><div class="r-sub">' + esc(own) + '</div></div></div>' +
      '<div class="row"><div class="grow"><div class="r-title">Лимит участников</div><div class="r-sub">' + esc(c.limit) + '</div></div></div></div>' +
      '<p class="cap" style="margin-top:10px">' + esc(CHAT_TERM) + ' Только текстовые сообщения.</p>' +
      '<button class="btn btn-secondary btn-block" data-act="sheet-close">Понятно</button>');
  });
  D.action('r6-members', () => {
    const pc = chatParam(), c = pc && F.chat(pc.id); if (!c) return;
    const ids = memberIdsOf(c, pc.arch || c.archived);
    const rows = ids.map(id => {
      if (id === 'me') {
        return '<div class="row fd-person"><span class="fd-plink">' + avatar(F.ME.name, 'sm') + '<span class="fd-who"><span class="fd-name">Вы' + (c.owner === 'me' ? ' · автор чата' : '') +
          '</span><span class="fd-sub">' + esc(F.ME.name + ' · ' + F.ME.company) + '</span></span></span></div>';
      }
      const pe = F.person(id) || { name: id };
      return '<div class="row fd-person"><button class="fd-plink" data-go="F2/' + esc(id) + '">' + avatar(pe.name, 'sm') + '<span class="fd-who"><span class="fd-name">' + esc(pe.name) +
        (id === c.owner ? ' · автор чата' : '') + '</span><span class="fd-sub">' + esc([pe.role, pe.company].filter(Boolean).join(' · ')) + '</span></span>' + icon('chevR') + '</button></div>';
    }).join('');
    D.openSheet('<div class="sheet-title">Участники · ' + ids.length + ' из ' + esc(c.limit) + '</div>' +
      '<div class="list">' + rows + '</div>' +
      '<p class="cap" style="margin-top:10px">Профили детей в чатах не участвуют. Модерирует группа админов чатов.</p>' +
      '<button class="btn btn-secondary btn-block" data-act="sheet-close">Закрыть</button>');
  });
  /* меню «…» в шапке чата: правила, жалоба на чат, выход (в шапке остаётся место для переписки) */
  D.action('r6-menu', () => {
    D.openSheet('<div class="sheet-title">Чат встречи</div>' +
      '<button class="btn btn-secondary btn-block" data-act="r6-rules">' + icon('bookmark') + 'Правила чата</button>' +
      '<button class="btn btn-secondary btn-block" data-act="r6-report">' + icon('alert') + 'Пожаловаться на чат</button>' +
      '<button class="btn btn-secondary btn-block" data-act="r6-leave">' + icon('back') + 'Выйти из чата</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Закрыть</button>');
  });
  D.action('r6-report', () => {
    const pc = chatParam(); if (!pc) return;
    openReport({ kind: 'chat', id: pc.id });
  });
  D.action('r6-msg', el => {
    const pc = chatParam(), c = pc && F.chat(pc.id), i = Number(el.dataset.arg), m = c && c.messages[i]; if (!m) return;
    const pe = F.person(m.from) || { name: m.from };
    D.openSheet('<div class="sheet-title">Сообщение</div>' +
      '<div class="fd-quote"><b>' + esc(pe.name) + '</b><br>' + esc(m.text) + '</div>' +
      '<button class="btn btn-secondary btn-block" data-act="r6-rep-msg" data-arg="' + i + '">Пожаловаться на сообщение</button>' +
      '<button class="btn btn-secondary btn-block" data-act="r6-rep-user" data-arg="' + esc(m.from) + '">Пожаловаться на участника</button>' +
      '<button class="btn btn-ghost btn-block" data-go="F2/' + esc(m.from) + '">Открыть профиль</button>');
  });
  D.action('r6-rep-msg', el => {
    const pc = chatParam(), c = pc && F.chat(pc.id), i = Number(el.dataset.arg), m = c && c.messages[i]; if (!m) return;
    openReport({ kind: 'msg', id: c.id + ':' + i, preview: m.text });
  });
  D.action('r6-rep-user', el => openReport({ kind: 'user', id: el.dataset.arg, preview: nameOf(el.dataset.arg) }));
  D.action('r6-leave', () => {
    const pc = chatParam(), c = pc && F.chat(pc.id); if (!c) return;
    const arch = pc.arch || c.archived;
    D.openSheet('<div class="sheet-title">Выйти из чата?</div>' +
      '<p class="fd-rules-t">' + (arch
        ? 'Архив чата «' + esc(c.title) + '» исчезнет из вашего списка. Вернуться в него нельзя: чат архивирован.'
        : 'Вы перестанете получать сообщения чата «' + esc(c.title) + '». Вернуться можно, пока в чате есть места.' +
          (c.owner === 'me' ? ' Вы автор чата: после вашего выхода его ведёт группа админов.' : '')) + '</p>' +
      '<button class="btn btn-primary btn-block" data-act="r6-leave-ok" data-arg="' + esc(c.id) + '">Выйти из чата</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Остаться</button>');
  });
  D.action('r6-leave-ok', el => {
    const c = F.chat(el.dataset.arg), pc = chatParam(), arch = !!(pc && pc.arch) || !!(c && c.archived); if (!c) return;
    S.left[skey(c, arch)] = true; S.joined[skey(c, arch)] = false;
    D.closeSheet(); D.toast('Вы вышли из чата'); go('R5');
  });

  /* ======================= R7 Создать чат встречи ======================= */
  const R7_RULES = 'Чат живёт до конца фестиваля. Без рекламы и рассылок, только вопросы по теме встречи. Модерирует группа админов.';
  function splitWhen(w) {
    const parts = String(w || '').split(' · ').map(x => x.trim()).filter(Boolean);
    if (parts.length >= 3) return { when: parts[0] + ' · ' + parts[1], place: parts.slice(2).join(' · ') };
    return { when: parts.join(' · '), place: '' };
  }
  function r7Check(st) {
    const e = {};
    if (st.title.trim().length < 5) e.title = 'Назовите чат: не меньше 5 знаков';
    else if (badContent(st.title)) e.title = 'В названии нельзя указывать ссылки и телефоны';
    if (st.when.trim().length < 3) e.when = 'Укажите время встречи';
    if (st.place.trim().length < 3) e.place = 'Укажите место встречи';
    if (st.rules.trim().length < 10) e.rules = 'Напишите правило хотя бы в одно предложение';
    else if (badContent(st.rules)) e.rules = 'В правилах нельзя указывать ссылки и телефоны';
    return e;
  }
  function nextChatId() { let n = 4; while (F.chat('ch' + String(n).padStart(2, '0'))) n++; return 'ch' + String(n).padStart(2, '0'); }

  D.register('R7', {
    tab: 'R1',
    meta: {
      title: 'R7 · Создать чат встречи',
      role: 'Автор записи #ивент: создание чата встречи',
      fr: ['FR-CHAT-01', 'FR-CHAT-04', 'FR-CHAT-06', 'FR-FEED-05'],
      ac: ['AC-CHAT-01', 'AC-FEED-05'],
      what: [
        'Поля: название, время, место, лимит участников (шаг 1, от 2 до 30), правила чата.',
        'Предзаполнение «когда и где» из черновика записи R3 (маршрут R7/draft) или из своей записи (R7 с идентификатором записи).',
        'Создание только по кнопке с подтверждением в листе; после создания открывается R6 нового чата, автор становится владельцем.',
        'Состояния: не заполнены поля (подсказки, кнопка неактивна), ссылки и телефоны в названии и правилах отклоняются; у записи уже есть чат или запись чужая (создать чат нельзя).'
      ],
      rules: [
        'Чат привязан к записи #ивент и становится доступным участникам после её публикации (проверяет модератор).',
        'Место организует автор, приложение его не бронирует (D-34). Чат живёт до конца фестиваля, модерирует группа админов (D-33).',
        'Создание чата без записи ленты допущено только в данных F0b (ch03); из интерфейса чат создаётся из записи #ивент.'
      ],
      depends: ['D-33', 'D-34', 'D-54']
    },
    html(ctx) {
      const st = ctx.state, key = ctx.param || 'new';
      const own = key !== 'draft' && F.post(key) ? F.post(key) : null;
      if (own && (!own.mine || chatOfPost(own))) {
        const ex = chatOfPost(own);
        return '<div class="scr">' + D.head({ back: 'R4/' + own.id, eyebrow: 'Чат встречи', title: ex ? 'Чат уже создан' : 'Чат создаёт автор', paren: paren('один чат на запись #ивент') }) +
          '<div class="fd-body nofab">' + emptyBox(ex ? 'У записи уже есть чат' : 'Создать чат может автор записи',
            ex ? 'К одной записи #ивент привязан один чат встречи.' : 'Участники входят в чат по кнопке «Чат встречи» на записи.',
            ex ? '<button class="btn btn-secondary btn-sm fd-b" data-go="R6/' + esc(ex.id) + '">Открыть чат</button>' : '<button class="btn btn-secondary btn-sm fd-b" data-go="R4/' + esc(own.id) + '">К записи</button>', 'chat') + '</div></div>';
      }
      /* черновик записи уже имеет чат: второй чат на ту же запись не создаётся (возврат по истории браузера) */
      const dch = key === 'draft' && D.st('R3').chatId ? F.chat(D.st('R3').chatId) : null;
      if (dch) {
        return '<div class="scr">' + D.head({ back: 'R3', eyebrow: 'Чат встречи', title: 'Чат уже создан', paren: paren('один чат на запись #ивент') }) +
          '<div class="fd-body nofab">' + emptyBox('У записи уже есть чат', 'К одной записи #ивент привязан один чат встречи: «' + dch.title + '».',
            '<button class="btn btn-secondary btn-sm fd-b" data-go="R6/' + esc(dch.id) + '">Открыть чат</button>', 'chat') + '</div></div>';
      }
      if (st.key !== key) {
        st.key = key; st.title = ''; st.limit = 10; st.rules = R7_RULES; st.when = ''; st.place = ''; st.src = null;
      }
      /* время и место берутся из записи: если автор поменял «когда и где» в R3 (или запись), форма подхватывает новое значение */
      const src = key === 'draft' ? (D.st('R3').when || '') : ((F.post(key) || {}).whenWhere || '');
      if (st.src !== src) { const sp = splitWhen(src); st.when = sp.when; st.place = sp.place; st.src = src; }
      const post = key !== 'draft' && F.post(key) ? F.post(key) : null;
      const back = key === 'draft' ? 'R3' : post ? 'R4/' + post.id : 'R5';
      const fld = (id, label, val, ph, hint) =>
        '<div class="field"><label for="' + id + '">' + label + '</label><input class="input" id="' + id + '" type="text" autocomplete="off" placeholder="' + esc(ph) + '" value="' + esc(val) + '">' +
        (hint ? '<div class="hint">' + hint + '</div>' : '') + '<div class="err-msg" id="' + id + '-e" hidden></div></div>';
      return '<div class="scr">' +
        D.head({ back, eyebrow: 'Чат встречи', title: 'Создать чат', sub: 'Для участников вашей записи #ивент', paren: paren('чат живёт до конца фестиваля') }) +
        '<div class="fd-body nofab">' +
        fld('r7-title', 'Название чата', st.title, 'Франшиза и поставщики: разговор за столом') +
        fld('r7-when', 'Время', st.when, '28.02 · 10:45') +
        fld('r7-place', 'Место', st.place, 'Лобби основного отеля', 'Место организуете вы: приложение его не бронирует.') +
        '<div class="field"><label>Лимит участников</label><div class="fd-step">' +
        '<button class="fd-stepb" data-act="r7-lim" data-arg="-1" aria-label="Меньше"' + (st.limit <= 2 ? ' disabled' : '') + '>' + icon('minus') + '</button>' +
        '<span class="fd-stepn" aria-live="polite">' + st.limit + '</span>' +
        '<button class="fd-stepb" data-act="r7-lim" data-arg="1" aria-label="Больше"' + (st.limit >= 30 ? ' disabled' : '') + '>' + icon('plus') + '</button></div>' +
        '<div class="hint">Вы входите в число участников. От 2 до 30.</div></div>' +
        '<div class="field"><label for="r7-rules">Правила чата</label><textarea class="textarea" id="r7-rules" rows="4">' + esc(st.rules) + '</textarea>' +
        '<div class="hint">Закрепляются вверху чата.</div><div class="err-msg" id="r7-rules-e" hidden></div></div>' +
        '<div class="banner info">' + icon('info') + '<div class="cap">' + esc(CHAT_TERM) + ' Только текстовые сообщения; вложений и личных сообщений нет.</div></div>' +
        '<button class="btn btn-primary btn-block" id="r7-go" data-act="r7-create" disabled>Создать чат</button>' +
        '</div></div>';
    },
    mount(root) {
      if (!root.querySelector('#r7-title')) return;     // экран «Чат уже создан» или «Чат создаёт автор»: формы нет
      const st = D.st('R7');
      const map = { 'r7-title': 'title', 'r7-when': 'when', 'r7-place': 'place', 'r7-rules': 'rules' };
      const refresh = () => {
        Object.keys(map).forEach(id => { const el = root.querySelector('#' + id); if (el) st[map[id]] = el.value; });
        const e = r7Check(st);
        Object.keys(map).forEach(id => {
          const el = root.querySelector('#' + id), er = root.querySelector('#' + id + '-e');
          const show = !!(el && st[map[id]].trim().length > 0 && e[map[id]]);
          if (er) { er.hidden = !show; er.textContent = show ? e[map[id]] : ''; }
          if (el) el.classList.toggle('err', show);
        });
        const b = root.querySelector('#r7-go'); if (b) b.disabled = Object.keys(e).length > 0;
      };
      Object.keys(map).forEach(id => { const el = root.querySelector('#' + id); if (el) el.addEventListener('input', refresh); });
      refresh();
    }
  });
  D.action('r7-lim', el => {
    const st = D.st('R7'); st.limit = Math.max(2, Math.min(30, st.limit + Number(el.dataset.arg))); D.rerender();
  });
  D.action('r7-create', () => {
    const st = D.st('R7');
    if (Object.keys(r7Check(st)).length) { D.toast('Заполните поля чата'); return; }
    D.openSheet('<div class="sheet-title">Создать чат встречи?</div>' +
      '<div class="card fd-preview"><div class="card-title">' + esc(st.title.trim()) + '</div>' +
      '<div class="r-sub">' + esc(st.when.trim()) + ' · ' + esc(st.place.trim()) + '</div>' +
      '<div class="r-sub">Участников до ' + st.limit + ', вы автор чата</div>' +
      '<p class="fd-rules-t">' + esc(st.rules.trim()) + '</p></div>' +
      '<p class="cap" style="margin-top:12px">Участники смогут войти после публикации записи #ивент; запись проверит модератор.</p>' +
      '<button class="btn btn-primary btn-block" data-act="r7-confirm">Создать чат</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Продолжить редактирование</button>');
  });
  D.action('r7-confirm', () => {
    const st = D.st('R7');
    if (Object.keys(r7Check(st)).length) { D.closeSheet(); return; }
    const key = st.key, post = key !== 'draft' ? F.post(key) : null;
    const id = nextChatId();
    const chat = {
      id, kind: 'meetup', title: st.title.trim(), when: st.when.trim(), place: st.place.trim(),
      members: 1, memberIds: ['me'], limit: st.limit, postId: post ? post.id : null, owner: 'me', rules: st.rules.trim(),
      messages: [{ from: 'mod', text: 'Чат встречи создан. ' + st.rules.trim(), time: F.NOW.time }],
      archived: false, mine: true, pending: key === 'draft' || !!post,
      draft: key === 'draft',            // true: запись #ивент ещё не опубликована (метка «ждёт публикации записи»); после публикации чат уходит на проверку модератору
      created: nowTime()
    };
    F.CHATS.push(chat);
    if (key === 'draft') D.st('R3').chatId = id;
    else if (post) post.chatId = id;
    st.key = null;
    D.closeSheet();
    D.toast('Чат встречи создан');
    /* форма создания заменяется чатом в истории: «назад» из чата ведёт к записи, а не к пустой форме */
    location.replace('#/R6/' + id);
  });
})();
