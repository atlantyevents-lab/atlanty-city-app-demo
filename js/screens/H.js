/* Блок H — «Маркетплейс» (S4a): H1 Решения, H2 Карточка решения, H3 Мой список «Изучить», H4 Маршрут по Экспо,
   H5 КипяTALK, H6 Предложения, H7 Отметка стенда, H8 Экспо: стенды и зоны, H9 Продукты участников, H10 Продукт участника.
   Данные: FIX.EXHIBITORS, KIPATALK, STAND_ROUTE (fixtures.js), FIX.EXH_EXT, EXPO_ZONES, STAND_GEO, rankExhibitors (fx_market.js),
   FIX.COMPANIES, PRODUCTS, PACKS (fx_shared.js), контракт «+ Путь» FIX.pathFind / pathAdd (fx_path.js, действия в Z.js).
   Состояние «Изучить» живёт в D.st('H3'), записи на КипяTALK — в D.st('H5'), сохранённые предложения — в D.st('H6'). */
(function () {
  'use strict';
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag } = D;
  const NOW = F.NOW;
  const ME = F.ME;

  /* ================= общие помощники ================= */
  const ex = id => F.exhibitor(id);
  const ext = id => F.exExt(id) || {};
  const toMin = t => { const p = String(t).split(':'); return Number(p[0]) * 60 + Number(p[1]); };
  const fmtT = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  const dayId = d => 'd' + String(d).replace('.', '');            /* 27.02 → d2702 (маршрут B4) */
  const isPast = (day, time) => day < NOW.day || (day === NOW.day && toMin(time) < toMin(NOW.time));
  /* Словарь (подробно в шапке data/fx_market.js): «на площадке» — метка платного размещения (пакеты «Экспо+» и «Премиум», как в B.js paidTag);
     пакет — тег «Экспонент» / «Пакет Экспо+» / «Пакет Премиум»; физическое присутствие — «На стенде сейчас», часы — «Часы Экспо сегодня».
     Присутствие и часы «на площадке» не называются. */
  const PAID = { 'Экспо+': true, 'Премиум': true };
  const isPaid = e => !!PAID[e.pack];                              /* платное размещение: пакеты «Экспо+» и «Премиум» */
  const packLabel = e => e.pack === 'Экспо' ? 'Экспонент' : 'Пакет ' + e.pack;
  const packTag = e => tag(packLabel(e), 'tariff');
  const paidTag = e => isPaid(e) ? tag('на площадке', 'fill') : '';      /* платное размещение: тот же тег, что paidTag в B.js */
  const packTags = e => packTag(e) + paidTag(e);                       /* тег пакета и рядом метка платного размещения */
  const kindOf = e => e.pack === 'Премиум' ? 'prem' : (e.pack === 'Экспо+' ? 'plus' : 'base');
  const logoLetters = name => (String(name).replace(/[^А-ЯЁA-Z]/g, '').slice(0, 2) || String(name).slice(0, 2)).toUpperCase();
  const planSt = e => String(e.stand).split('·').map(s => s.trim());   /* ['Зона 1', 'А-12'] */
  const DISCLAIMER = 'Сделки заключаются участниками самостоятельно, организаторы не отвечают за сделки';
  /* срок спецпредложения: одна формула для карточки H1 и карточки H2 (в данных уже целая фраза: «сегодня», «до 28.02», «сегодня до 18:00») */
  const untilText = x => String(x.offerUntil || '').trim();

  /* Переход из листа: закрыть лист и открыть экран */
  D.action('mk-go', el => { D.closeSheet(); location.hash = '#/' + el.dataset.arg; });

  /* Прокрутку, рейки чипов и тост при перерисовке сохраняет ядро (core.js route, paintToast): своих обходов нет. */
  const reg = (id, def) => D.register(id, def);

  /* «Назад»: если внутри демо уже были переходы — возврат по истории (data-act="nav-back" в D.head, ядро), чтобы из ленты, пути
     или карты человек вернулся туда, откуда пришёл; при открытии экрана «с нуля» — жёсткая ссылка на родителя раздела.
     «С нуля» = ни одного перехода и хэш равен хэшу загрузки (порядок слушателей hashchange не важен). */
  const HASH0 = location.hash;                                    /* хэш при загрузке страницы */
  let NAVS = 0;
  window.addEventListener('hashchange', () => { NAVS++; });
  const backOpt = fallback => ((NAVS > 0 || location.hash !== HASH0) ? { backHist: true } : { back: fallback });
  const secTitle = t => '<div class="sec-title" role="heading" aria-level="2">' + t + '</div>';
  /* неизвестный идентификатор: честное состояние вместо молчаливой подстановки первой записи */
  function notFound(eyebrow, title, text, parent, btn) {
    return '<div class="scr">' +
      D.head(Object.assign({ eyebrow: esc(eyebrow), title: esc(title), sub: esc(text) }, backOpt(parent))) +
      '<div class="mkt-body"><div class="empty topo-host">' + D.topo() + '<div class="e-title">' + esc(title) + '</div><div class="e-text">' + esc(text) + '</div>' +
      '<button class="btn btn-primary mkt-empty-btn" data-go="' + esc(parent) + '">' + esc(btn) + '</button></div></div></div>';
  }

  /* ---------- «Изучить»: единый список (H3), используют H1, H2, H8, H7 ---------- */
  const STATUSES = ['хочу посетить', 'посетил', 'связаться'];
  function study() {
    const s = D.st('H3');
    if (!s.list) { s.list = F.STAND_ROUTE.map(r => r.ex); s.status = {}; s.notes = {}; }
    return s;
  }
  const inStudy = id => study().list.indexOf(id) >= 0;
  D.action('mk-study', el => {
    const s = study(), id = el.dataset.arg, i = s.list.indexOf(id);
    let msg;
    if (i >= 0) { s.list.splice(i, 1); msg = 'Убрано из «Изучить»'; }
    else { s.list.push(id); msg = 'Добавлено в «Изучить»'; }
    D.rerender();
    D.toast(msg);
  });
  function studyBtn(id, cls) {
    const on = inStudy(id);
    return '<button class="btn btn-secondary' + (on ? ' is-on' : '') + (cls ? ' ' + cls : '') + '" data-act="mk-study" data-arg="' + esc(id) + '">' +
      (on ? icon('check') + 'В списке' : 'Изучить') + '</button>';
  }
  /* «+ Путь» по общему контракту: добавленное показывается как «В пути» с переходом в таймлайн B4 */
  function pathBtn(type, ref, o) {
    o = o || {};
    const it = F.pathFind(type, ref, o.day, o.time);
    const cls = 'btn btn-secondary' + (o.cls ? ' ' + o.cls : '');
    if (it) return '<button class="' + cls + ' is-on" data-go="B4/' + dayId(it.day) + '">' + icon('check') + 'В пути</button>';
    return '<button class="' + cls + '" data-act="path-add" data-type="' + type + '" data-ref="' + esc(ref) + '"' +
      (o.day ? ' data-day="' + esc(o.day) + '"' : '') + (o.time ? ' data-time="' + esc(o.time) + '"' : '') + '>+ Путь</button>';
  }
  /* экспонент без окон на стенде: кнопки «Предложить встречу» нет, текст не противоречит контакту (встречи без записи, на стенде) */
  const noMeetText = () => 'Встречи без записи: подойдите на стенд' + (F.EXPO_HOURS[NOW.day] ? ' в часы работы Экспо' : '');
  function meetBtn(e) {
    const x = ext(e.id);
    return x.accepts
      ? '<button class="btn btn-primary btn-block" data-go="G3/' + e.id + '">Предложить встречу</button>'
      : '<div class="mkt-nomeet">' + icon('info') + noMeetText() + '</div>';
  }

  /* Заметка к решению (общая для H2 и H3) */
  D.action('mk-note', el => {
    const id = el.dataset.arg, e = ex(id), cur = study().notes[id] || '';
    D.openSheet('<div class="mkt-sheet"><div class="sheet-title">Заметка</div>' +
      '<div class="mkt-sh-s">' + esc(e.name) + '. Заметку видите только вы.</div>' +
      '<div class="field mkt-sh-box"><textarea class="textarea" id="mk-note-ta" maxlength="280" placeholder="Что запомнить по этому решению">' + esc(cur) + '</textarea>' +
      '<div class="counter"><span id="mk-note-cnt">' + cur.length + ' / 280</span></div></div>' +
      '<button class="btn btn-primary btn-block" data-act="mk-note-save" data-arg="' + esc(id) + '">Сохранить</button></div>', {
      mount(w) {
        const ta = w.querySelector('#mk-note-ta'), c = w.querySelector('#mk-note-cnt');
        if (ta) ta.addEventListener('input', () => { if (c) c.textContent = ta.value.length + ' / 280'; });
      }
    });
  });
  D.action('mk-note-save', el => {
    const ta = document.querySelector('#mk-note-ta');
    study().notes[el.dataset.arg] = ta ? ta.value.trim().slice(0, 280) : '';
    D.closeSheet();
    D.rerender();
    D.toast('Заметка сохранена');
  });

  /* ---------- сегменты и переключатель Маркетплейса ---------- */
  const SEGS = [['H1', 'Решения'], ['H8', 'Экспо'], ['H5', 'КипяTALK'], ['H3', 'Мой список']];
  const segs = on => '<div class="mkt-seg">' + D.segbar(SEGS, on) + '</div>';
  const switchRail = on => '<div class="chip-rail mkt-rail">' +
    '<button class="chip' + (on === 'ex' ? ' on' : '') + '" data-go="H1">Экспоненты</button>' +
    '<button class="chip' + (on === 'pr' ? ' on' : '') + '" data-go="H9">Продукты участников</button></div>';

  /* ---------- присутствие на стенде и причина показа ---------- */
  function presence(e) {
    if (!F.EXPO_HOURS[NOW.day]) return { away: true, text: 'Экспо сегодня закрыта' };
    if (F.exOnSite(e.id, NOW.day, NOW.time)) return { away: false, text: 'На стенде сейчас' };
    const back = F.exAwayUntil(e.id, NOW.day, NOW.time);
    return { away: true, text: back ? 'Отошёл, вернётся в ' + back : 'Сейчас не на стенде' };
  }
  /* day=true добавляет вторую строку: присутствие в течение дня (часы работы Экспо) */
  const presHTML = (e, day) => {
    const p = presence(e), h = F.EXPO_HOURS[NOW.day];
    return '<div class="mkt-pres' + (p.away ? ' away' : '') + '"><i></i>' + esc(p.text) + '</div>' +
      (day && h ? '<div class="mkt-pres-day">Часы Экспо сегодня: ' + esc(h[0] + '–' + h[1]) + '</div>' : '');
  };
  function myDomains() {
    const all = (F.TAXO && F.TAXO.DOMAINS) || [];
    return all.filter(d => (ME.domains || []).indexOf(d.code) >= 0 && d.code !== 'G6');
  }
  /* Запрос подборки и задача связаны: выбранная задача (чип в рейке или лист «Изменить») и есть запрос подборки,
     «Все задачи» возвращают запрос из профиля (L8). Задача из рейки одновременно фильтрует список. */
  const reqOf = st => (st.task && st.task !== 'all') ? st.task : ME.requestTask;
  function reasonOf(e, req) {
    if (e.cluster === req) return 'ваш запрос: ' + req;
    const d = myDomains().find(x => x.tasks.indexOf(e.cluster) >= 0);
    return d ? 'ваша цель: ' + d.title : '';
  }

  /* ---------- КипяTALK: запись = пункт «Мой путь» (одно состояние), места считаются отдельным счётчиком ----------
     Запись создаёт пункт kipatalk через FIX.pathAdd (статус accepted, повтор не дублирует), отмена убирает его через FIX.pathRemove.
     Свободные места «осталось N из M» — отдельный счётчик D.st('H5').booked: моё место учитывается, пока пункт есть в пути
     (если человек убрал пункт в «Мой путь», запись считается снятой и место возвращается). */
  const ktKey = k => k.day + '|' + k.ex + '|' + k.time;
  const ktByKey = key => F.KIPATALK.find(k => ktKey(k) === key);
  const ktBooked = () => { const s = D.st('H5'); return s.booked || (s.booked = {}); };
  const ktKind = k => k.title.indexOf('Воркшоп') === 0 ? 'Воркшоп' : 'Круглый стол';
  const ktName = k => k.title.replace(/^(Круглый стол|Воркшоп):\s*/, '');
  const capFirst = t => String(t).charAt(0).toUpperCase() + String(t).slice(1);
  const ktEnd = k => fmtT(toMin(k.time) + k.dur);
  const ktPath = k => F.pathFind('kipatalk', k.ex, k.day, k.time);
  function ktInfo(k) {
    const path = ktPath(k), b = !!(ktBooked()[ktKey(k)] && path);
    const left = Math.max(0, k.cap - k.signed - (b ? 1 : 0));
    return { key: ktKey(k), booked: b, path: path, left: left, past: isPast(k.day, k.time), full: left === 0 && !b };
  }
  const ktSeats = (k, i) => 'осталось ' + i.left + ' из ' + k.cap;
  /* пересечение по времени с принятыми и записанными пунктами пути (предупреждение в листе записи) */
  function ktClash(k) {
    const s0 = toMin(k.time), e0 = s0 + k.dur, firm = { accepted: 1, booked: 1, done: 1 };
    return (F.PATH_ITEMS || []).find(x => x.day === k.day && firm[x.status] &&
      !(x.type === 'kipatalk' && x.ref === k.ex && x.time === k.time) &&
      toMin(x.time) < e0 && s0 < toMin(x.time) + (x.dur || 30)) || null;
  }
  /* ссылка на пункт в таймлайне дня: показывается у записанных событий */
  const ktPathLink = k => '<button class="mkt-lk mkt-kt-path" data-go="B4/' + dayId(k.day) + '">' + icon('check') + 'В «Мой путь» · ' + esc(k.time) + '</button>';

  /* ================= H1 Решения ================= */
  function filterList(st) {
    const q = (st.q || '').trim().toLowerCase();
    return F.EXHIBITORS.filter(e => {
      const x = ext(e.id);
      if (st.task && st.task !== 'all' && e.cluster !== st.task) return false;
      if (st.meet && !x.accepts) return false;
      if (st.work && !e.workshop) return false;
      if (st.offer && !x.offerOn) return false;
      if (q && !(e.name + ' ' + e.what + ' ' + e.cluster + ' ' + e.offer + ' ' + e.desc).toLowerCase().includes(q)) return false;
      return true;
    });
  }

  /* Крупная карточка экспонента: «Премиум» и «Экспо+» — баннер-плашка, «Экспо» — крупная строка (FR-EXPO-12) */
  function exCard(e, reason) {
    const x = ext(e.id), kind = kindOf(e);
    const tags = packTags(e);
    const head = kind === 'base'
      ? '<button class="mkt-base" data-go="H2/' + e.id + '"><span class="mkt-plate-top">' + tags + '</span>' +
        '<span class="mkt-plate-name">' + esc(e.name) + '</span><span class="mkt-plate-what">' + esc(e.what) + '</span>' +
        '<span class="mkt-plate-stand">' + icon('pin') + esc(e.stand) + '</span></button>'
      : '<button class="mkt-plate ' + kind + '" data-go="H2/' + e.id + '"><span class="topo-bg" aria-hidden="true"></span>' +
        '<span class="mkt-plate-top">' + tags + '</span><span class="mkt-plate-name">' + esc(e.name) + '</span>' +
        '<span class="mkt-plate-what">' + esc(e.what) + '</span>' +
        '<span class="mkt-plate-stand">' + icon('pin') + esc(e.stand) + '</span></button>';
    return '<div class="card mkt-ex" data-go="H2/' + e.id + '">' + head + '<div class="mkt-ex-in">' +
      (reason ? '<div class="mkt-reason">' + esc(reason) + '</div>' : '') +
      (x.offerOn ? '<div><div class="mkt-offer-l">Предложение участникам · ' + esc(untilText(x)) + '</div><div class="mkt-offer">' + esc(e.offer) + '</div></div>' : '') +
      '<div class="mkt-meta">' + tag(e.cluster, 'accent') + (e.workshop ? tag('воркшоп', 'ok') : '') + (x.accepts ? tag('принимает встречи') : '') + '</div>' +
      presHTML(e) +
      '<div class="mkt-acts"><div class="mkt-acts2">' + studyBtn(e.id) + pathBtn('stand', e.id) + '</div>' + meetBtn(e) + '</div></div></div>';
  }

  function h1List(st) {
    const req = reqOf(st);
    const list = filterList(st);
    const ranked = F.rankExhibitors(list, { requestTask: req, domains: ME.domains || [] });
    const hit = ranked.filter(e => reasonOf(e, req));
    const rest = ranked.filter(e => !reasonOf(e, req));
    let h = '<div class="mkt-reqline"><span>Подборка по запросу: <b>' + esc(req || 'не задан') + '</b></span>' +
      '<button class="mkt-lk" data-act="h1-req">Изменить</button></div>';
    /* пояснение про порядок показывается только когда в выдаче есть платное размещение */
    const paidNote = ranked.some(isPaid)
      ? '<div class="mkt-note">Метка «на площадке» — платное размещение: пакеты «Премиум» и «Экспо+» стоят выше остальных в своей группе.</div>' : '';
    if (!ranked.length) {
      return h + '<div class="empty"><div class="e-title">Ничего не нашлось</div>' +
        '<div class="e-text">Снимите фильтры или измените запрос.</div>' +
        '<button class="btn btn-secondary mkt-empty-btn" data-act="h1-reset">Сбросить фильтры</button></div>';
    }
    h += '<div class="cap mkt-count">Найдено: ' + ranked.length + ' ' + D.plural(ranked.length, ['решение', 'решения', 'решений']) + '</div>';
    if (hit.length) {
      h += '<div class="mkt-sec">' + secTitle('Решения для роста бизнеса') + paren('под ваш запрос и цели') + paidNote + '</div>' +
        '<div class="mkt-list">' + hit.map(e => exCard(e, reasonOf(e, req))).join('') + '</div>';
    }
    if (rest.length) {
      h += '<div class="mkt-sec">' + secTitle(hit.length ? 'Все решения' : 'Решения') + (hit.length ? '' : paidNote) + '</div>' +
        '<div class="mkt-list">' + rest.map(e => exCard(e, '')).join('') + '</div>';
    }
    return h;
  }

  reg('H1', {
    tab: 'H1',
    meta: {
      title: 'H1 · Решения',
      role: 'Гость, участник',
      fr: ['FR-EXPO-01', 'FR-EXPO-09', 'FR-EXPO-12', 'FR-EXPO-13', 'FR-SRCH-03'],
      ac: ['AC-EXPO-06', 'AC-EXPO-09', 'AC-EXPO-10'],
      what: [
        'Корень вкладки «Маркетплейс»: сегменты Решения · Экспо · КипяTALK · Мой список; под ними переключатель «Экспоненты» / «Продукты участников».',
        'Подборка «Решения для роста бизнеса» (название без числа и оценочных слов, D-39): состав зависит от запроса и целей человека. Выбор задачи в рейке и «Изменить» запрос — один механизм: выбранная задача становится запросом подборки и фильтром, чип подсвечивается; «Все задачи» возвращают запрос из профиля.',
        'Фильтры по девяти задачам каталога, «Принимает встречи», «Есть воркшоп», «Есть предложение участникам»; поиск по названию и описанию.',
        'Карточки экспонентов: «Премиум» и «Экспо+» — баннер-плашка, «Экспо» — крупная строка; пакет тегом («Экспонент», «Пакет Экспо+», «Пакет Премиум»), у платных пакетов рядом метка «на площадке»; присутствие на стенде отдельной строкой («На стенде сейчас»), часы работы Экспо в шапке («Часы Экспо сегодня»).',
        'Кнопки «Изучить», «+ Путь» (общий контракт), «Предложить встречу» (G3).'
      ],
      rules: [
        'Приоритет выдачи по пакету (FIX.rankExhibitors): сначала совпавшие с запросом и целями, внутри группы — «Премиум», «Экспо+», «Экспо»; платное размещение помечено меткой «на площадке» (FR-SRCH-07, AC-SRCH-07), пояснение под заголовком видно, только когда платные есть в выдаче.',
        'Нет плашек проверки экспонентов (D-39); дисклеймер об ответственности за сделки — в карточке решения (H2).',
        'Словарь: «на площадке» — только платное размещение (пакеты «Экспо+» и «Премиум», тег fill рядом с тегом пакета; у «Экспо» метки нет); присутствие — «На стенде сейчас», «Отошёл, вернётся в ЧЧ:ММ»; часы — «Часы Экспо сегодня: ЧЧ:ММ–ЧЧ:ММ». Слово «на площадке» не означает присутствие (FR-PATH-06, AC-PATH-06, FR-SRCH-07, AC-SRCH-07).',
        'Название подборки неизменно; пакет в ленте не показывается, в каталоге показан тегом (FR-EXPO-12).'
      ],
      depends: ['D-36', 'D-37', 'D-39', 'D-40', 'FR-PATH-06 (доля платных)']
    },
    html(ctx) {
      const st = ctx.state;
      if (!st.task) st.task = 'all';
      const hours = F.EXPO_HOURS[NOW.day];
      const tasks = (F.CLUSTERS || []).map(c =>
        '<button class="chip' + (st.task === c ? ' on' : '') + '" data-act="h1-task" data-arg="' + esc(c) + '">' + esc(c) + '</button>').join('');
      const flags = [['meet', 'Принимает встречи'], ['work', 'Есть воркшоп'], ['offer', 'Есть предложение участникам']].map(f =>
        '<button class="chip' + (st[f[0]] ? ' on' : '') + '" data-act="h1-flag" data-arg="' + f[0] + '">' + f[1] + '</button>').join('');
      return '<div class="scr">' +
        D.head({ eyebrow: esc(NOW.dateLong), title: 'Маркетплейс', sub: 'Решения для бизнеса и стенды Экспо',
          paren: paren(hours ? 'Часы Экспо сегодня: ' + hours[0] + '–' + hours[1] : 'Экспо сегодня закрыта') }) +
        segs('H1') + switchRail('ex') +
        '<div class="mkt-search"><input class="input" type="search" id="h1-q" placeholder="Решение, задача, компания" value="' + esc(st.q || '') + '" aria-label="Поиск по экспонентам"></div>' +
        '<div class="chip-rail mkt-rail">' + '<button class="chip' + (st.task === 'all' ? ' on' : '') + '" data-act="h1-task" data-arg="all">Все задачи</button>' + tasks + '</div>' +
        '<div class="chip-rail mkt-rail mkt-rail-2">' + flags + '</div>' +
        '<div class="mkt-body" id="h1-list">' + h1List(st) +
        '<div class="mkt-more"><button class="mkt-row" data-go="H6"><div class="grow"><div class="r-title">Предложения участникам</div><div class="r-sub">скидки, демо и приглашения на сегодня</div></div>' + icon('chevR') + '</button>' +
        '<button class="mkt-row" data-go="H4"><div class="grow"><div class="r-title">Маршрут по Экспо</div><div class="r-sub">обход стендов из списка «Изучить»</div></div>' + icon('chevR') + '</button></div>' +
        '</div></div>';
    },
    mount(host) {
      const inp = host.querySelector('#h1-q');
      if (inp) inp.addEventListener('input', () => {
        const st = D.st('H1'); st.q = inp.value;
        const box = host.querySelector('#h1-list');
        const more = box && box.querySelector('.mkt-more');
        if (box) { const keep = more; box.innerHTML = h1List(st); if (keep) box.appendChild(keep); }
      });
    }
  });
  D.action('h1-task', el => { D.st('H1').task = el.dataset.arg; D.rerender(); });
  D.action('h1-flag', el => { const s = D.st('H1'), k = el.dataset.arg; s[k] = !s[k]; D.rerender(); });
  D.action('h1-reset', () => { const s = D.st('H1'); s.task = 'all'; s.meet = s.work = s.offer = false; s.q = ''; D.rerender(); });
  /* «Изменить» запрос подборки: тот же выбор задачи, что и чипы в рейке (задача = запрос + фильтр); запрос в профиле правится в L8 */
  D.action('h1-req', () => {
    const s = D.st('H1'), cur = reqOf(s);
    s.reqDraft = cur;
    const chips = (F.CLUSTERS || []).map(c =>
      '<button class="chip' + (c === cur ? ' on' : '') + '" data-act="h1-req-pick" data-arg="' + esc(c) + '">' + esc(c) + '</button>').join('');
    D.openSheet('<div class="mkt-sheet"><div class="sheet-title">Запрос для подборки</div>' +
      '<div class="mkt-sh-s">Выбранная задача станет запросом подборки: в списке останутся решения этой задачи. Запрос в профиле не меняется, его правят в «Цели и запросы».</div>' +
      '<div class="mkt-sh-chips" id="h1-req-chips">' + chips + '</div>' +
      '<button class="mkt-lk" data-act="mk-go" data-arg="L8">Цели и запросы</button>' +
      '<button class="btn btn-primary btn-block" data-act="h1-req-apply">Показать подборку</button></div>');
  });
  D.action('h1-req-pick', el => {
    D.st('H1').reqDraft = el.dataset.arg;
    document.querySelectorAll('#h1-req-chips .chip').forEach(c => c.classList.toggle('on', c === el));
  });
  D.action('h1-req-apply', () => {
    const s = D.st('H1');
    s.task = s.reqDraft || ME.requestTask;
    D.closeSheet();
    D.rerender();
    D.toast('Подборка пересобрана');
  });

  /* ================= H2 Карточка решения ================= */
  const block = (title, inner) => '<div class="card"><div class="mkt-card-h">' + title + '</div>' + inner + '</div>';

  /* Строка расписания КипяTALK внутри карточки решения: запись — одна кнопка, она же создаёт пункт «Мой путь»;
     у прошедшего события мест нет (подпись «прошёл»). */
  function ktRowH2(k) {
    const i = ktInfo(k);
    const when = k.day + ' · ' + k.time + '–' + ktEnd(k);
    let btn;
    if (i.past) btn = '';
    else if (i.booked) btn = '<button class="btn btn-secondary btn-sm is-on" data-act="h5-ask" data-arg="' + esc(i.key) + '">' + icon('check') + 'Вы записаны</button>' + ktPathLink(k);
    else if (i.full) btn = '<span class="mkt-st">мест нет</span>';
    else btn = '<button class="btn btn-primary btn-sm" data-act="h5-ask" data-arg="' + esc(i.key) + '">Записаться</button>';
    return '<div class="mkt-kt-row"><div class="grow"><div class="mkt-kt-t">' + esc(ktKind(k) + ': ' + ktName(k)) + '</div>' +
      '<div class="mkt-kt-s">' + esc(when) + ' · ' + (i.past ? 'прошёл' : esc(ktSeats(k, i))) + '</div></div>' +
      (btn ? '<div class="mkt-kt-acts">' + btn + '</div>' : '') + '</div>';
  }

  reg('H2', {
    tab: 'H1',
    meta: {
      title: 'H2 · Карточка решения',
      role: 'Гость, участник',
      fr: ['FR-EXPO-02', 'FR-EXPO-03', 'FR-EXPO-12', 'FR-EXPO-14'],
      ac: ['AC-EXPO-02', 'AC-EXPO-11'],
      what: [
        'Компания, решение, для кого, кейсы, предложение участникам (по желанию экспонента), расписание КипяTALK, стенд со ссылками на схему Экспо (H8) и карту, контактное лицо по правам, заметка, пост экспонента.',
        'Действия: «Предложить встречу» (G3), «Изучить», «+ Путь», «Заметка», запись на КипяTALK с подтверждением в листе (запись создаёт пункт «Мой путь», отмена его убирает).',
        'Присутствие на стенде в эту минуту («На стенде сейчас»), часы работы Экспо («Часы Экспо сегодня») и окна встреч на стенде сегодня (из данных экспонента); у платного размещения («Экспо+», «Премиум») рядом с тегом пакета метка «на площадке».',
        'Экспонент без окон на стенде: кнопки «Предложить встречу» нет, показано «Встречи без записи: подойдите на стенд в часы работы Экспо».'
      ],
      rules: [
        'Плашек проверки экспонентов нет; проверка в приложении и рекламе не упоминается (D-39).',
        'Внизу дисклеймер: «Сделки заключаются участниками самостоятельно, организаторы не отвечают за сделки» (FR-EXPO-14, текст согласовать с юристом).',
        'Контактное лицо показывается по правам: телефон и почта открываются при встрече или сканировании с согласием (D-47).',
        'Пакет показан тегом («Экспонент», «Пакет Экспо+», «Пакет Премиум»); у «Экспо+» и «Премиум» рядом метка платного размещения «на площадке», как в «Мой путь» (FR-PATH-06, FR-SRCH-07); присутствие и часы «на площадке» не называются; пакет в ленте не показывается.',
        'Спецпредложение участникам желательное, формат и срок индивидуальны (D-40); срок собирается одной формулой untilText; если спецпредложения нет, блок «На стенде» показывает обычное предложение экспонента.'
      ],
      depends: ['D-37', 'D-39', 'D-40', 'D-47']
    },
    html(ctx) {
      if (ctx.param && !ex(ctx.param)) return notFound('Маркетплейс', 'Решение не найдено', 'Такого экспонента нет в каталоге: откройте его из списка решений.', 'H1', 'К решениям');
      const id = ctx.param || 'ex01';
      const e = ex(id), x = ext(id);
      const note = study().notes[id] || '';
      const kts = F.KIPATALK.filter(k => k.ex === id).sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time));
      const posts = (F.FEED_POSTS || []).filter(p => p.author && p.author.type === 'exhibitor' && p.author.ref === id);
      const st = planSt(e);
      const win = x.windows;
      const tags = tag(e.cluster, 'accent') + packTags(e) + (e.workshop ? tag('воркшоп', 'ok') : '') + tag(e.format);

      const company = '<div class="card"><div class="mkt-co"><span class="mkt-logo" aria-hidden="true">' + esc(logoLetters(e.name)) + '</span>' +
        '<div class="grow"><div class="mkt-co-name">' + esc(e.name) + '</div><div class="mkt-co-site">' + esc(x.site || '') + '</div></div></div>' +
        '<div class="mkt-meta">' + tags + '</div>' + presHTML(e, true) + '</div>';

      const acts = '<div class="mkt-acts">' + meetBtn(e) +
        '<div class="mkt-acts2">' + studyBtn(id) + pathBtn('stand', id) + '</div>' +
        '<button class="btn btn-ghost btn-block" data-act="mk-note" data-arg="' + id + '">' + (note ? 'Изменить заметку' : 'Заметка') + '</button></div>';

      const offer = x.offerOn
        ? '<div class="mkt-special">' + tag(untilText(x), 'accent') + '<div class="mkt-text">' + esc(e.offer) + '</div></div>'
        : '<div class="mkt-text">' + esc(e.offer) + '</div>';

      const standCard = '<div class="mkt-zone-card"><div class="mkt-kt-t">Стенд ' + esc(st[1] || '') + ' · ' + esc(st[0] || '') + '</div>' +
        '<div class="mkt-kt-s">' + esc(e.format) + (win ? ' · сегодня свободно ' + win.free + ' ' + D.plural(win.free, ['окно', 'окна', 'окон']) + ' из ' + win.total : (x.accepts ? '' : ' · встречи без записи')) + '</div>' +
        '<div class="mkt-btn-row"><button class="btn btn-secondary btn-sm" data-go="H8/' + id + '">Схема Экспо</button>' +
        '<button class="btn btn-secondary btn-sm" data-go="E3/congress">На карте</button>' +
        '<button class="btn btn-ghost btn-sm" data-go="H7/' + id + '">Отметка стенда</button></div></div>';

      const reps = (x.reps || []).map(r => '<div class="mkt-rep">' + esc(r.name) + '<span class="mkt-rep-r">' + esc(r.role) + '</span></div>').join('');
      const contact = reps + '<div class="mkt-note">' + (x.accepts
        ? 'Связаться можно через заявку на встречу. '
        : 'Встречи без записи: подойдите на стенд ' + esc(st[1] || '') + ' в часы работы Экспо. ') +
        'Телефон и почта открываются при встрече или после сканирования с вашего согласия.</div>';

      const postCard = posts.map(p =>
        '<button class="mkt-post" data-go="R4/' + p.id + '"><span class="mkt-post-k">' + esc((p.tags && p.tags[0]) || 'Решения для роста бизнеса') + ' · ' + esc(p.time) + '</span>' +
        '<span class="mkt-post-t">' + esc(p.text) + '</span></button>').join('');

      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: 'Решение', title: esc(e.name), sub: esc(e.what) }, backOpt('H1'))) +
        '<div class="mkt-body">' + company + acts +
        block('Решение', '<div class="mkt-text">' + esc(e.desc) + '</div>') +
        block('Для кого', '<div class="mkt-text">' + esc(x.forWhom || '') + '</div>') +
        block('Кейсы', '<div class="mkt-cases"><div class="mkt-case">' + esc(capFirst(e.cases)) + '</div>' +
          (x.casesMore || []).map(c => '<div class="mkt-case">' + esc(c) + '</div>').join('') + '</div>') +
        block(x.offerOn ? 'Предложение участникам' : 'На стенде', offer) +
        (kts.length ? block('Расписание КипяTALK', '<div class="mkt-kt-list">' + kts.map(ktRowH2).join('') + '</div>') : '') +
        block('Стенд', standCard) +
        block('Контактное лицо', contact) +
        (note ? block('Ваша заметка', '<div class="mkt-note-box">' + esc(note) + '</div>') : '') +
        (postCard ? block('Пост экспонента', postCard) : '') +
        '<div class="mkt-disc">' + esc(DISCLAIMER) + '</div></div></div>';
    }
  });

  /* ================= H8 Экспо: стенды и зоны ================= */
  function standMatches(e, f) {
    if (f === 'mine') return inStudy(e.id);
    if (f === 'meet') return !!ext(e.id).accepts;
    return true;
  }

  /* название стенда в две строки: по пробелу или по смене регистра («ТехноСклад» → «Техно» / «Склад»); слишком длинные части обрезаются */
  function nameLines(name) {
    let parts = String(name).split(' ');
    if (parts.length === 1) parts = String(name).replace(/([а-яёa-z])([А-ЯЁA-Z])/g, '$1 $2').split(' ');
    if (parts.length > 2) parts = [parts[0], parts.slice(1).join(' ')];
    return parts.map(t => t.length > 11 ? t.slice(0, 10) + '…' : t);
  }
  const SVG_H = 352;                                               /* высота схемы (viewBox 330×352), см. fx_market.js */

  function expoSVG(st) {
    const Z = F.EXPO_ZONES, A = F.EXPO_AREAS, G = F.STAND_GEO, EN = F.EXPO_ENTRY;
    let s = '<svg viewBox="0 0 330 ' + SVG_H + '" role="img" aria-label="Схема Экспо: зоны 1–3, КипяTALK, зона митапов, главный вход">';
    Z.forEach(z => {
      s += '<rect class="mkt-zone" x="' + z.x + '" y="' + z.y + '" width="' + z.w + '" height="' + z.h + '" rx="12"/>' +
        '<text class="mkt-zone-t" x="' + (z.x + 10) + '" y="' + (z.y + 15) + '">' + esc(z.name.toUpperCase()) + '</text>';
    });
    A.forEach(a => {
      const sel = st.sel === a.id;
      s += '<g class="mkt-stand-g mkt-area-g' + (sel ? ' sel' : '') + '" data-act="h8-pick" data-arg="' + a.id + '" role="button" tabindex="0" aria-label="' + esc(a.name + ': ' + a.note) + '">' +
        '<rect class="mkt-area ' + a.id + '" x="' + a.x + '" y="' + a.y + '" width="' + a.w + '" height="' + a.h + '" rx="12"/>' +
        '<text class="mkt-area-t" x="' + (a.x + 12) + '" y="' + (a.y + 26) + '">' + esc(a.name.toUpperCase()) + '</text>' +
        '<text class="mkt-area-n" x="' + (a.x + 12) + '" y="' + (a.y + 43) + '">' + esc(a.note) + '</text></g>';
    });
    s += '<rect class="mkt-entry" x="' + EN.x + '" y="' + EN.y + '" width="' + EN.w + '" height="' + EN.h + '" rx="10"/>' +
      '<text class="mkt-entry-t" x="' + EN.cx + '" y="' + (EN.cy + 4) + '" text-anchor="middle">Главный вход</text>';
    F.EXHIBITORS.forEach(e => {
      const g = G[e.id]; if (!g) return;
      const match = standMatches(e, st.f), mine = inStudy(e.id), x = ext(e.id);
      s += '<g class="mkt-stand-g' + (mine ? ' mine' : '') + (st.sel === e.id ? ' sel' : '') + (match ? '' : ' dim') + '" data-act="h8-pick" data-arg="' + e.id + '" role="button" tabindex="0" aria-label="' + esc('Стенд ' + g.code + ', ' + e.name) + '">' +
        '<rect class="mkt-stand" x="' + g.x + '" y="' + g.y + '" width="' + g.w + '" height="' + g.h + '" rx="9"/>' +
        '<text class="mkt-stand-code" x="' + (g.x + 8) + '" y="' + (g.y + 19) + '">' + esc(g.code) + '</text>' +
        nameLines(e.name).map((t, i) => '<text class="mkt-stand-name" x="' + (g.x + 8) + '" y="' + (g.y + 35 + i * 12.5) + '">' + esc(t) + '</text>').join('') +
        (x.accepts ? '<circle class="mkt-stand-meet" cx="' + (g.x + g.w - 11) + '" cy="' + (g.y + 12) + '" r="4.5"/>' : '') + '</g>';
    });
    return s + '</svg>';
  }

  function h8Sel(st) {
    if (st.sel === 'kt') {
      return '<div class="card mkt-sel"><div class="mkt-sel-h"><div><div class="card-title">Зона КипяTALK</div><div class="mkt-kt-s">Круглые столы и воркшопы · Конгресс-центр, 1-й этаж</div></div></div>' +
        '<div class="mkt-text">Столы ведут экспоненты пакета «Премиум», запись по кнопке в расписании.</div>' +
        '<div class="mkt-btn-row"><button class="btn btn-primary btn-sm" data-go="H5">Расписание</button><button class="btn btn-secondary btn-sm" data-go="E2">План этажа</button></div></div>';
    }
    if (st.sel === 'mt') {
      return '<div class="card mkt-sel"><div class="mkt-sel-h"><div><div class="card-title">Зона митапов · Экспо</div><div class="mkt-kt-s">Вместимость не определена: по записи</div></div></div>' +
        '<div class="mkt-text">Здесь проходят питч-сессии и митапы, зона открыта всем тарифам. Расписание — в «Программе».</div>' +
        '<div class="mkt-btn-row"><button class="btn btn-primary btn-sm" data-go="C1">Программа</button><button class="btn btn-secondary btn-sm" data-go="E3/congress">На карте</button></div></div>';
    }
    const e = st.sel && ex(st.sel);
    if (!e) {
      return '<div class="banner info">' + icon('route') + '<div><div class="b-title">Нажмите на стенд</div>' +
        '<div class="cap">Откроется краткая карточка с переходом в решение. Обход стендов из списка «Изучить» — в «Маршруте по Экспо».</div></div></div>' +
        '<button class="btn btn-secondary btn-block" data-go="H4">' + icon('route') + 'Маршрут по Экспо</button>';
    }
    const g = F.STAND_GEO[e.id], x = ext(e.id);
    return '<div class="card mkt-sel"><div class="mkt-sel-h"><div class="grow"><button class="mkt-lk plain mkt-sel-name" data-go="H2/' + e.id + '">' + esc(e.name) + icon('chevR') + '</button>' +
      '<div class="mkt-kt-s">' + esc(e.what) + '</div></div></div>' +
      '<div class="mkt-meta">' + packTags(e) + tag('Зона ' + g.zone + ' · ' + g.code) + (x.accepts ? tag('принимает встречи') : tag('встречи без записи')) + '</div>' +
      presHTML(e) +
      '<div class="mkt-btn-row"><button class="btn btn-primary btn-sm" data-go="H2/' + e.id + '">Карточка</button><button class="btn btn-secondary btn-sm" data-go="E3/congress">На карте</button></div>' +
      '<div class="mkt-acts2">' + studyBtn(e.id) + pathBtn('stand', e.id) + '</div>' +
      (x.accepts ? '<button class="btn btn-secondary btn-block" data-go="G3/' + e.id + '">Предложить встречу</button>' : '') + '</div>';
  }

  reg('H8', {
    tab: 'H1',
    meta: {
      title: 'H8 · Экспо: стенды и зоны',
      role: 'Гость, участник',
      fr: ['FR-EXPO-09', 'FR-EXPO-10', 'FR-EXPO-05'],
      ac: ['AC-EXPO-07'],
      what: [
        'Схема экспозоны: три зоны со стендами из каталога экспонентов, зоны КипяTALK и митапов, главный вход.',
        'Фильтры «Все», «Мои «Изучить»», «Принимают встречи» (стенды вне фильтра приглушены; счётчик «показано N из 12»).',
        'Нажатие на стенд — краткая карточка: «Карточка» (H2), «На карте» (E3), «Изучить», «+ Путь», «Предложить встречу» (G3); нажатие на зону КипяTALK или митапов — описание зоны.',
        'Подсказка и переход в «Маршрут по Экспо» (H4); параметр маршрута H8 с идентификатором экспонента выбирает стенд.'
      ],
      rules: [
        'Схема демонстрационная: положение стендов условное, привязка стенда к карточке — по полю «стенд» экспонента (AC-EXPO-02).',
        'Рамка стенда — он в списке «Изучить»; зелёная точка — экспонент принимает встречи на стенде.',
        'В краткой карточке стенда рядом с тегом пакета у «Экспо+» и «Премиум» метка «на площадке» (платное размещение); присутствие — «На стенде сейчас».',
        'Вместимость зоны митапов не определена, подпись «по записи» (O-31).'
      ],
      depends: ['D-37', 'FR-PROG-14 (зона митапов)', 'план Экспо']
    },
    html(ctx) {
      const st = ctx.state;
      if (!st.f) st.f = 'all';
      if (ctx.param !== st.pp) { st.pp = ctx.param; if (ctx.param && ex(ctx.param)) { st.sel = ctx.param; st.f = 'all'; st.scrollSel = true; } }
      const all = F.EXHIBITORS.filter(e => F.STAND_GEO[e.id]);
      const nMine = all.filter(e => inStudy(e.id)).length, nMeet = all.filter(e => ext(e.id).accepts).length;
      const shown = all.filter(e => standMatches(e, st.f)).length;
      const chip = (id, label, n) => '<button class="chip' + (st.f === id ? ' on' : '') + '" data-act="h8-filter" data-arg="' + id + '">' + label + ' · ' + n + '</button>';
      return '<div class="scr">' +
        D.head({ eyebrow: esc(NOW.dateLong), title: 'Экспо', sub: 'Стенды по зонам, КипяTALK и митапы', paren: paren('схема демонстрационная') }) +
        segs('H8') +
        '<div class="chip-rail mkt-rail">' + chip('all', 'Все', all.length) + chip('mine', 'Мои «Изучить»', nMine) + chip('meet', 'Принимают встречи', nMeet) + '</div>' +
        '<div class="mkt-body">' +
        '<div class="mkt-expo">' + expoSVG(st) +
        '<div class="mkt-legend"><span><i></i>в «Изучить»</span><span><i class="m"></i>принимает встречи</span><span><i class="s"></i>выбран</span></div></div>' +
        '<div class="cap">Показано ' + shown + ' из ' + all.length + ' ' + D.plural(all.length, ['стенда', 'стендов', 'стендов']) + '</div>' +
        (st.f === 'mine' && !nMine ? '<div class="empty"><div class="e-title">Список пуст</div><div class="e-text">Нажмите «Изучить» в карточке решения, и стенд появится здесь.</div></div>' : '') +
        h8Sel(st) +
        '</div></div>';
    },
    mount(host) {
      /* строки названия длиннее стенда (62 единицы схемы) слегка сжимаются по ширине, чтобы не обрезаться */
      host.querySelectorAll('.mkt-stand-name').forEach(t => {
        if (t.getComputedTextLength && t.getComputedTextLength() > 62) { t.setAttribute('textLength', '62'); t.setAttribute('lengthAdjust', 'spacingAndGlyphs'); }
      });
      host.querySelectorAll('.mkt-stand-g').forEach(g => g.addEventListener('keydown', ev => {
        if (ev.key === 'Enter' || ev.key === ' ') { ev.preventDefault(); g.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
      }));
      /* выбранный стенд (нажатие или вход из H2): карточка стенда — в центр экрана; ядро применяет прокрутку до mount */
      const st = D.st('H8');
      if (st.scrollSel) { st.scrollSel = false; const c = host.querySelector('.mkt-sel'); if (c && c.scrollIntoView) c.scrollIntoView({ block: 'center' }); }
    }
  });
  D.action('h8-filter', el => { D.st('H8').f = el.dataset.arg; D.rerender(); });
  D.action('h8-pick', el => {
    const st = D.st('H8');
    st.sel = (st.sel === el.dataset.arg) ? null : el.dataset.arg;
    st.scrollSel = !!st.sel;
    D.rerender();
  });

  /* ================= H9 Продукты участников, H10 Продукт участника ================= */
  const prodPerson = p => {
    let c = F.company(p.companyId) || {};
    /* своя компания читается живьём (PS.val), как в F12: переименование в онбординге видно и здесь */
    if (c.ownerId === 'me' && F.PS && F.PS.val) {
      c = Object.assign({}, c, { name: F.PS.val.company || c.name, industry: F.PS.val.industry || c.industry,
        site: F.PS.val.site || c.site, revenue: F.PS.val.revenue || c.revenue });
    }
    return { company: c, own: c.ownerId === 'me', person: c.ownerId === 'me' ? null : F.person(c.ownerId) };
  };
  /* Свои продукты в каталоге: при скрытом профиле (отозвано согласие «Показывать профиль»)
     или компании на уровне «Только вы» они не показываются — то же правило, что в поиске (Z2)
     и карточке компании (F12): L6 обещает «компания и продукты не будут помечены как ваши». */
  const ownHidden = () => {
    const ps = F.PS;
    return !ps || !ps.profileVisible() || ps.vis('company') === 'only_me';
  };
  /* Заявка на знакомство по продукту — заявка раздела «Участники» (S5): FIX.PPL.store.out, тот же вид, что создаёт F3.
     Состояние не копируется: «отправлена / принята / отклонена» читается через PPL.reqStatus, лимит — PPL.pendingOut() и PPL.LIMITS.
     Заявка видна в F5 «Исходящие», повторная заявка этому человеку блокируется и здесь, и в F3. */
  const PPL = F.PPL;
  function introBlock(pid) {
    const rs = PPL.reqStatus(pid);
    if (rs === 'pending' || rs === 'accepted') return 'Заявка этому человеку уже отправлена. Повторно знакомиться по заявке нельзя.';
    if (rs === 'declined') return 'Человек отклонил заявку. Новую заявку отправить нельзя.';
    if (PPL.pendingOut() >= PPL.LIMITS.outPending) return 'Лимит ожидающих заявок исчерпан: ' + PPL.LIMITS.outPending + ' из ' + PPL.LIMITS.outPending + '. Дождитесь ответа или отзовите одну в «Исходящих».';
    return '';
  }
  /* блок действия: свой продукт / заявка отправлена или принята / отклонена / кнопка «Предложить знакомство» */
  function introAct(p, r, cls) {
    if (r.own) return '<div class="mkt-own">Ваш продукт: его видят участники в поиске и интро</div>';
    if (!r.person) return '';
    const rs = PPL.reqStatus(r.person.id);
    if (rs === 'pending') return '<div class="mkt-prod-sent">' + icon('check') + 'Заявка на знакомство отправлена<button class="mkt-lk" data-go="F5">Исходящие</button></div>';
    if (rs === 'accepted') return '<div class="mkt-prod-sent">' + icon('check') + 'Заявка принята<button class="mkt-lk" data-go="F2/' + r.person.id + '">К человеку</button></div>';
    if (rs === 'declined') return '<div class="mkt-own">Человек отклонил заявку на знакомство</div>';
    return '<button class="btn btn-secondary ' + cls + '" data-act="h9-ask" data-arg="' + p.id + '">Предложить знакомство</button>';
  }

  function prodRow(p) {
    const r = prodPerson(p);
    return '<div class="mkt-prod"><div class="mkt-prod-h"><button class="mkt-prod-name" data-go="H10/' + p.id + '">' + esc(p.name) + '</button>' + tag(p.kind) + '</div>' +
      '<div class="mkt-prod-meta"><button class="mkt-lk plain" data-go="F12/' + esc(r.company.id) + '">' + esc(r.company.name) + '</button>' +
      '<span class="mkt-dot-sep">·</span>' +
      (r.own ? '<span class="mkt-own-n">' + esc(ME.name) + ' (вы)</span>'
        : (r.person ? '<button class="mkt-lk plain" data-go="F2/' + r.person.id + '">' + esc(r.person.name) + '</button>' : '')) + '</div>' +
      '<div class="mkt-prod-desc">' + esc(p.short) + '</div>' +
      '<div class="mkt-prod-site">' + esc(p.site) + '</div>' + introAct(p, r, 'btn-block mkt-prod-btn') + '</div>';
  }
  function prodList(st) {
    const q = (st.q || '').trim().toLowerCase();
    const list = (F.PRODUCTS || []).filter(p => {
      const r0 = prodPerson(p);
      if (r0.own && ownHidden()) return false;
      if (st.kind && st.kind !== 'all' && p.kind !== st.kind) return false;
      if (!q) return true;
      const r = r0;
      return (p.name + ' ' + p.short + ' ' + p.kind + ' ' + (r.company.name || '') + ' ' + (r.person ? r.person.name : ME.name)).toLowerCase().includes(q);
    });
    if (!list.length) {
      return '<div class="empty"><div class="e-title">Ничего не нашлось</div><div class="e-text">Измените запрос или снимите фильтр.</div>' +
        '<button class="btn btn-secondary mkt-empty-btn" data-act="h9-reset">Сбросить</button></div>';
    }
    return '<div class="cap mkt-count">Найдено: ' + list.length + ' ' + D.plural(list.length, ['продукт или услуга', 'продукта или услуги', 'продуктов или услуг']) + '</div>' +
      '<div class="card mkt-prod-card">' + list.map(prodRow).join('') + '</div>';
  }

  reg('H9', {
    tab: 'H1',
    meta: {
      title: 'H9 · Продукты участников',
      role: 'Участник',
      fr: ['FR-EXPO-11', 'FR-PROF-10', 'FR-SRCH-01'],
      ac: ['AC-EXPO-08'],
      what: [
        'Переключатель «Экспоненты» / «Продукты участников» под сегментами «Маркетплейс»; здесь выбран второй вариант.',
        'Простые строки: продукт или услуга, компания (F12), человек (F2), короткое описание, ссылка на сайт.',
        'Кнопка «Предложить знакомство» открывает лист: причина от 10 знаков и «Отправить заявку» создают заявку на знакомство из раздела «Участники» (она видна в «Исходящих» F5 и учитывается в лимите 5); чата и сообщения нет.',
        'Поиск по названию, компании, человеку и описанию; фильтр «Продукты» / «Услуги».'
      ],
      rules: [
        'Без заказов, отзывов, цен и точек на карте (D-37, AC-EXPO-08).',
        'Подпись: «участники рассказывают о себе в интро; реклама запрещена» (FR-FEED-06).',
        'Свой продукт отмечен «вы», кнопки знакомства у него нет; повторная заявка тому же человеку блокируется (как в F3): «Заявка на знакомство отправлена».',
        'Срезается первым при недостатке бюджета (D-52, «услуги участников»); тогда продукты остаются в профиле компании.'
      ],
      depends: ['D-33', 'D-37', 'D-38', 'D-52', 'FR-PPL-03 (заявка на знакомство)']
    },
    html(ctx) {
      const st = ctx.state;
      if (!st.kind) st.kind = 'all';
      const kinds = [['all', 'Все'], ['продукт', 'Продукты'], ['услуга', 'Услуги']].map(k =>
        '<button class="chip' + (st.kind === k[0] ? ' on' : '') + '" data-act="h9-kind" data-arg="' + k[0] + '">' + k[1] + '</button>').join('');
      return '<div class="scr">' +
        D.head({ eyebrow: 'Маркетплейс', title: 'Продукты участников', sub: 'Что предлагают участники фестиваля',
          paren: paren('участники рассказывают о себе в интро; реклама запрещена') }) +
        segs('H1') + switchRail('pr') +
        '<div class="mkt-search"><input class="input" type="search" id="h9-q" placeholder="Продукт, услуга, компания, человек" value="' + esc(st.q || '') + '" aria-label="Поиск по продуктам участников"></div>' +
        '<div class="chip-rail mkt-rail">' + kinds + '</div>' +
        '<div class="mkt-body" id="h9-list">' + prodList(st) + '</div></div>';
    },
    mount(host) {
      const inp = host.querySelector('#h9-q');
      if (inp) inp.addEventListener('input', () => {
        const st = D.st('H9'); st.q = inp.value;
        const box = host.querySelector('#h9-list'); if (box) box.innerHTML = prodList(st);
      });
    }
  });
  D.action('h9-kind', el => { D.st('H9').kind = el.dataset.arg; D.rerender(); });
  D.action('h9-reset', () => { const s = D.st('H9'); s.kind = 'all'; s.q = ''; D.rerender(); });

  /* «Предложить знакомство»: лист с причиной и подтверждением кнопкой; чата в приложении нет (D-33), заявка уходит человеку на рассмотрение */
  D.action('h9-ask', el => {
    const p = F.product(el.dataset.arg); if (!p) return;
    const r = prodPerson(p); if (!r.person) return;
    const L = PPL.LIMITS, block = introBlock(r.person.id);
    D.openSheet('<div class="mkt-sheet"><div class="sheet-title">Заявка на знакомство</div>' +
      '<div class="mkt-sh-t">' + esc(r.person.name) + ' · ' + esc(r.company.name) + '</div>' +
      '<div class="mkt-sh-s">Продукт: «' + esc(p.name) + '». ' + esc(r.person.name.split(' ')[0]) + ' получит заявку и решит, принять её. После принятия откроются контакты, которые вы выберете. Чата в приложении нет.</div>' +
      (block ? '<div class="banner warn">' + icon('alert') + '<div class="cap">' + esc(block) + '</div></div>' : '') +
      '<div class="field mkt-sh-box"><label for="h9-msg">Почему хотите познакомиться <span class="cap">· обязательно, от ' + L.reasonMin + ' знаков</span></label>' +
      '<textarea class="textarea" id="h9-msg" maxlength="' + L.reasonMax + '" placeholder="Например: подойдёт ли «' + esc(p.name) + '» моей компании"' + (block ? ' disabled' : '') + '></textarea>' +
      '<div class="counter"><span id="h9-cnt">0 / ' + L.reasonMax + '</span></div></div>' +
      '<div class="cap mkt-sh-lim">Ожидают ответа: ' + PPL.pendingOut() + ' из ' + L.outPending + '. Заявка живёт ' + PPL.REQ_TTL_H + ' часов.</div>' +
      '<button class="btn btn-primary btn-block" id="h9-send" data-act="h9-send" data-arg="' + p.id + '" disabled>Отправить заявку</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Не сейчас</button></div>', {
      mount(w) {
        const ta = w.querySelector('#h9-msg'), c = w.querySelector('#h9-cnt'), b = w.querySelector('#h9-send');
        if (ta) ta.addEventListener('input', () => {
          if (c) c.textContent = ta.value.length + ' / ' + L.reasonMax;
          if (b) b.disabled = !!block || ta.value.trim().length < L.reasonMin;
        });
      }
    });
  });
  D.action('h9-send', el => {
    const p = F.product(el.dataset.arg); if (!p) return;
    const r = prodPerson(p); if (!r.person) return;
    const L = PPL.LIMITS, ta = document.querySelector('#h9-msg'), text = (ta ? ta.value : '').trim();
    if (introBlock(r.person.id) || text.length < L.reasonMin) return;
    PPL.store.out.push({ id: 'ox' + (PPL.store.seq++), to: r.person.id, reason: ('Продукт «' + p.name + '»: ' + text).slice(0, L.reasonMax), status: 'pending', at: NOW.time });
    D.closeSheet();
    D.rerender();
    D.toast('Заявка на знакомство отправлена');
  });

  reg('H10', {
    tab: 'H1',
    meta: {
      title: 'H10 · Продукт участника',
      role: 'Участник',
      fr: ['FR-EXPO-11', 'FR-EXPO-14', 'FR-PROF-10'],
      ac: ['AC-EXPO-08', 'AC-EXPO-11'],
      what: [
        'Карточка продукта или услуги: название, вид, описание, задача каталога.',
        'Компания (F12) и человек-владелец (F2) ссылками; остальные продукты компании; ссылка на сайт (в демо не открывается).',
        'Кнопка «Предложить знакомство» (заявка на знакомство из раздела «Участники», лист с подтверждением); статус заявки совпадает с F3 и F5.'
      ],
      rules: [
        'Без заказов, отзывов, цен и точек на карте (D-37).',
        'Дисклеймер о сделках внизу карточки (FR-EXPO-14).',
        'Описание проходит автофильтр телефонов и внешних ссылок, кроме сайта компании (предложение, согласовать).'
      ],
      depends: ['D-37', 'D-38', 'D-39']
    },
    html(ctx) {
      if (ctx.param && !F.product(ctx.param)) return notFound('Маркетплейс', 'Продукт не найден', 'Такого продукта или услуги нет: откройте его из списка «Продукты участников».', 'H9', 'К продуктам участников');
      const p = F.product(ctx.param || 'pr01');
      const r = prodPerson(p);
      if (r.own && ownHidden()) return notFound('Маркетплейс', 'Продукт не найден', 'Ваши продукты скрыты настройками видимости: включите показ профиля или уровень компании в «Приватности» (L6).', 'H9', 'К продуктам участников');
      const others = (F.productsOf(r.company.id) || []).filter(o => o.id !== p.id);
      const acts = introAct(p, r, 'btn-block mkt-p-btn');
      const personRow = r.own
        ? '<div class="mkt-row"><div class="grow"><div class="r-title">' + esc(ME.name) + ' (вы)</div><div class="r-sub">владелец компании</div></div></div>'
        : (r.person ? '<button class="mkt-row" data-go="F2/' + r.person.id + '"><div class="grow"><div class="r-title">' + esc(r.person.name) + '</div><div class="r-sub">' + esc(r.person.role) + '</div></div>' + icon('chevR') + '</button>' : '');
      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: (p.kind === 'услуга' ? 'Услуга участника' : 'Продукт участника'), title: p.name.length > 30 ? '<span class="mkt-h-long">' + esc(p.name) + '</span>' : esc(p.name), sub: esc(r.company.name) }, backOpt('H9'))) +
        '<div class="mkt-body">' +
        '<div class="card mkt-p-card"><div class="mkt-meta">' + tag(p.kind) + (p.task ? tag(p.task, 'accent') : '') + '</div>' +
        '<div class="mkt-text">' + esc(p.short) + '</div>' +
        '<div class="mkt-site-row">' + icon('link') + '<span class="mkt-prod-site">' + esc(p.site) + '</span></div>' +
        '<button class="btn btn-ghost btn-sm mkt-site-btn" data-act="h10-site">Открыть сайт</button></div>' +
        (acts ? '<div class="mkt-acts">' + acts + '</div>' : '') +
        '<div class="card"><div class="mkt-card-h">Компания и человек</div><div class="mkt-rows">' +
        '<button class="mkt-row" data-go="F12/' + esc(r.company.id) + '"><div class="grow"><div class="r-title">' + esc(r.company.name) + '</div><div class="r-sub">' + esc(r.company.industry) + '</div></div>' + icon('chevR') + '</button>' +
        personRow + '</div></div>' +
        (others.length ? '<div class="card"><div class="mkt-card-h">Ещё у компании</div><div class="mkt-rows">' +
          others.map(o => '<button class="mkt-row" data-go="H10/' + o.id + '"><div class="grow"><div class="r-title">' + esc(o.name) + '</div><div class="r-sub">' + esc(o.kind) + '</div></div>' + icon('chevR') + '</button>').join('') + '</div></div>' : '') +
        '<div class="mkt-disc">' + esc(DISCLAIMER) + '</div></div></div>';
    }
  });
  D.action('h10-site', () => D.toast('В демо сайты не открываются'));

  /* ================= H3 Мой список «Изучить» ================= */
  const savedOffers = () => { const s = D.st('H6'); return s.saved || (s.saved = {}); };

  reg('H3', {
    tab: 'H1',
    meta: {
      title: 'H3 · Мой список «Изучить»',
      role: 'Гость, участник',
      fr: ['FR-EXPO-04', 'FR-EXPO-05', 'FR-EXPO-09'],
      ac: ['AC-EXPO-03', 'AC-EXPO-07'],
      what: [
        'Сегмент «Мой список» вкладки «Маркетплейс»: изученные решения по порядку добавления, у каждого статус (хочу посетить, посетил, связаться), заметка, «+ Путь», «Убрать».',
        'Вкладка «Сохранено»: предложения, сохранённые в H6.',
        'Пустое состояние и переход в «Маршрут по Экспо» (H4).'
      ],
      rules: [
        '«Изучить» из каталога (H1), карточки (H2) и схемы (H8) добавляет решение сюда и в маршрут по Экспо.',
        'Отметка посещения сканированием метки стенда (H7) ставит статус «посетил».',
        'Список синхронизируется между устройствами и работает без сети (AC-EXPO-03); в демо хранится на экране.',
        'У решений платного размещения («Экспо+», «Премиум») под названием тег пакета и метка «на площадке»; у пакета «Экспо» меток нет.'
      ],
      depends: ['D-37', 'FR-EXPO-07']
    },
    html(ctx) {
      const st = ctx.state, s = study();
      st.tab = st.tab || 'study';
      const list = s.list.filter(id => ex(id));
      const saved = F.OFFERS.filter(o => savedOffers()[o.id]);
      const items = list.map((id, i) => {
        const e = ex(id), cur = s.status[id] || STATUSES[0], g = planSt(e);
        return '<div class="card mkt-li"><div class="mkt-li-h"><span class="pill-count">' + (i + 1) + '</span>' +
          '<div class="grow"><button class="mkt-li-name" data-go="H2/' + id + '">' + esc(e.name) + '<span class="mkt-li-what"> · ' + esc(e.what) + '</span></button>' +
          '<div class="r-sub">' + esc(g[0] + ' · ' + g[1]) + ' · ' + esc(e.cluster) + '</div>' +
          (isPaid(e) ? '<div class="mkt-meta mkt-li-tags">' + packTags(e) + '</div>' : '') + '</div></div>' +
          '<div class="mkt-li-row"><button class="chip' + (cur === STATUSES[0] ? '' : ' on') + '" data-act="h3-status" data-arg="' + id + '" aria-label="Статус: ' + esc(cur) + '. Нажмите, чтобы сменить">' + esc(cur) + '</button>' +
          pathBtn('stand', id, { cls: 'btn-sm' }) + '</div>' +
          (s.notes[id] ? '<div class="cap">заметка: ' + esc(s.notes[id]) + '</div>' : '') +
          '<div class="mkt-li-acts"><button class="btn btn-ghost btn-sm" data-act="mk-note" data-arg="' + id + '">' + (s.notes[id] ? 'Изменить заметку' : 'Заметка') + '</button>' +
          '<button class="btn btn-ghost btn-sm btn-danger-text" data-act="mk-study" data-arg="' + id + '">Убрать</button></div></div>';
      }).join('');
      const savedRows = saved.map(o => {
        const xo = (F.OFFERS_EXT || {})[o.id] || {};
        return '<div class="mkt-row"><div class="grow"><div class="r-title">' + esc(o.from) + '</div><div class="r-sub">' + esc(o.text) + '</div>' +
          '<div class="r-sub">' + esc(o.until) + '</div></div>' +
          '<div class="mkt-li-side">' + (xo.go ? '<button class="btn btn-ghost btn-sm" data-go="' + xo.go + '">Открыть</button>' : '') +
          '<button class="btn btn-ghost btn-sm" data-act="h6-save" data-arg="' + o.id + '">Убрать</button></div></div>';
      }).join('');
      const empty = (t, txt, btn) => '<div class="empty topo-host">' + D.topo() + '<div class="e-title">' + t + '</div><div class="e-text">' + txt + '</div>' + (btn || '') + '</div>';
      return '<div class="scr">' +
        D.head({ eyebrow: 'Маркетплейс', title: 'Мой список', sub: 'Изученные решения и статусы', paren: paren('список попадает в маршрут по Экспо') }) +
        segs('H3') +
        '<div class="chip-rail mkt-rail">' +
        '<button class="chip' + (st.tab === 'study' ? ' on' : '') + '" data-act="h3-tab" data-arg="study">Изучить · ' + list.length + '</button>' +
        '<button class="chip' + (st.tab === 'saved' ? ' on' : '') + '" data-act="h3-tab" data-arg="saved">Сохранено · ' + saved.length + '</button></div>' +
        '<div class="mkt-body">' +
        (st.tab === 'study'
          ? (items || empty('Список пуст', 'Нажмите «Изучить» в карточке решения, и оно появится здесь.', '<button class="btn btn-secondary mkt-empty-btn" data-go="H1">К решениям</button>')) +
            (list.length ? '<button class="btn btn-primary btn-block" data-go="H4">' + icon('route') + 'Построить маршрут по Экспо</button>' +
              '<button class="btn btn-secondary btn-block" data-go="H8">Показать на схеме Экспо</button>' : '')
          : (savedRows ? '<div class="card mkt-prod-card"><div class="mkt-rows">' + savedRows + '</div></div>'
            : empty('Ничего не сохранено', 'Сохранённые предложения участникам появятся здесь.', '<button class="btn btn-secondary mkt-empty-btn" data-go="H6">К предложениям</button>'))) +
        '</div></div>';
    }
  });
  D.action('h3-tab', el => { D.st('H3').tab = el.dataset.arg; D.rerender(); });
  D.action('h3-status', el => {
    const s = study(), id = el.dataset.arg;
    const next = STATUSES[(STATUSES.indexOf(s.status[id] || STATUSES[0]) + 1) % STATUSES.length];
    s.status[id] = next;
    D.rerender();
    D.toast('Статус: ' + next);
  });

  /* ================= H4 Маршрут по Экспо ================= */
  /* Порядок обхода — жадный по схеме от главного входа (AC-EXPO-04). Переход: 2 минуты и больше, по расстоянию на схеме;
     остановка на стенде — параметр демо (предложение, согласовать). */
  const VISIT_MIN = 5;
  const walkMin = d => Math.max(2, Math.round(d / 40));
  function buildRoute(ids) {
    const G = F.STAND_GEO, EN = F.EXPO_ENTRY;
    const left = ids.filter(id => G[id]);
    let cur = { cx: EN.cx, cy: EN.cy };
    const out = [];
    while (left.length) {
      let bi = 0, bd = Infinity;
      left.forEach((id, i) => { const d = Math.hypot(cur.cx - G[id].cx, cur.cy - G[id].cy); if (d < bd) { bd = d; bi = i; } });
      const id = left.splice(bi, 1)[0];
      out.push({ ex: id, n: out.length + 1, walk: walkMin(bd), geo: G[id] });
      cur = G[id];
    }
    return out;
  }
  function routeSVG(route) {
    const Z = F.EXPO_ZONES, A = F.EXPO_AREAS, EN = F.EXPO_ENTRY, G = F.STAND_GEO;
    let s = '<svg viewBox="0 0 330 ' + SVG_H + '" role="img" aria-label="Схема обхода стендов из списка «Изучить»">';
    Z.forEach(z => { s += '<rect class="mkt-zone" x="' + z.x + '" y="' + z.y + '" width="' + z.w + '" height="' + z.h + '" rx="12"/>' +
      '<text class="mkt-zone-t" x="' + (z.x + 10) + '" y="' + (z.y + 15) + '">' + esc(z.name.toUpperCase()) + '</text>'; });
    A.forEach(a => { s += '<rect class="mkt-area ' + a.id + '" x="' + a.x + '" y="' + a.y + '" width="' + a.w + '" height="' + a.h + '" rx="12"/>' +
      '<text class="mkt-area-t" x="' + (a.x + 12) + '" y="' + (a.y + 26) + '">' + esc(a.name.toUpperCase()) + '</text>'; });
    s += '<rect class="mkt-entry" x="' + EN.x + '" y="' + EN.y + '" width="' + EN.w + '" height="' + EN.h + '" rx="10"/>' +
      '<text class="mkt-entry-t" x="' + EN.cx + '" y="' + (EN.cy + 4) + '" text-anchor="middle">Главный вход</text>';
    const inRoute = {}; route.forEach(r => { inRoute[r.ex] = r.n; });
    F.EXHIBITORS.forEach(e => { const g = G[e.id]; if (!g) return;
      s += '<rect class="mkt-stand' + (inRoute[e.id] ? ' on' : ' faint') + '" x="' + g.x + '" y="' + g.y + '" width="' + g.w + '" height="' + g.h + '" rx="9"/>'; });
    let pts = EN.cx + ',' + (EN.y);
    route.forEach(r => { pts += ' ' + r.geo.cx + ',' + r.geo.cy; });
    if (route.length) s += '<polyline class="mkt-route-line" points="' + pts + '"/>';
    route.forEach(r => { s += '<circle class="mkt-route-dot" cx="' + r.geo.cx + '" cy="' + r.geo.cy + '" r="11"/>' +
      '<text class="mkt-route-n" x="' + r.geo.cx + '" y="' + r.geo.cy + '">' + r.n + '</text>'; });
    return s + '</svg>';
  }

  reg('H4', {
    tab: 'H1',
    meta: {
      title: 'H4 · Маршрут по Экспо',
      role: 'Гость, участник',
      fr: ['FR-EXPO-05', 'FR-MAP-04'],
      ac: ['AC-EXPO-04'],
      what: [
        'Маршрут по стендам из списка «Изучить»: схема с номерами точек, порядок обхода списком, время перехода между стендами и общее время.',
        'Старт у главного входа Экспо; при изменении списка маршрут перестраивается.',
        'Пустое состояние, переходы в карточку решения (H2), на схему Экспо (H8) и на карту.'
      ],
      rules: [
        'Порядок — жадный обход по схеме от главного входа (последовательность не длиннее жадного, AC-EXPO-04).',
        'Время перехода считается по расстоянию на схеме, от двух минут; на стенд заложено ' + VISIT_MIN + ' минут (параметр демо, согласовать).',
        'События КипяTALK экспонентов из списка «Изучить» подсвечены в расписании КипяTALK (FR-EXPO-05): метка «в вашем списке «Изучить»».'
      ],
      depends: ['план Экспо', 'список «Изучить» (H3)']
    },
    html() {
      const route = buildRoute(study().list);
      const n = route.length;
      const total = route.reduce((a, r) => a + r.walk + VISIT_MIN, 0);
      const steps = route.map(r => {
        const e = ex(r.ex), g = planSt(e);
        return '<button class="prog-item mkt-step" data-go="H2/' + r.ex + '"><div class="pi-time">' + r.n + '</div><div class="pi-body">' +
          '<div class="pi-title">' + esc(e.name) + '</div><div class="pi-sub">' + esc(e.what) + '</div>' +
          '<div class="pi-sub">' + esc(g[0] + ' · ' + g[1]) + ' · ' + (r.n === 1 ? 'от входа' : 'переход') + ' ' + r.walk + ' ' + D.plural(r.walk, ['минута', 'минуты', 'минут']) + '</div></div>' +
          icon('chevR') + '</button>';
      }).join('');
      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: esc(NOW.dateLong), title: 'Маршрут по Экспо',
          sub: n ? n + ' ' + D.plural(n, ['стенд', 'стенда', 'стендов']) + ' · около ' + total + ' мин' : 'Список «Изучить» пока пуст',
          paren: paren('время обхода с переходами между зонами') }, backOpt('H3'))) +
        '<div class="mkt-body">' +
        (n
          ? '<div class="mkt-expo">' + routeSVG(route) + '</div>' +
            '<div class="card mkt-prod-card">' + secTitle('Порядок обхода').replace('class="sec-title"', 'class="sec-title mkt-st-t"') + steps + '</div>' +
            '<div class="banner">' + icon('clock') + '<div class="cap">Старт: главный вход Экспо. На каждый стенд заложено ' + VISIT_MIN + ' минут, переходы считаются по схеме.</div></div>' +
            '<div class="mkt-btn-row"><button class="btn btn-secondary" data-go="H8">Схема Экспо</button><button class="btn btn-secondary" data-go="E3/congress">На карте</button></div>'
          : '<div class="empty topo-host">' + D.topo() + '<div class="e-title">Маршрута пока нет</div><div class="e-text">Добавьте решения в «Изучить», и обход построится сам.</div>' +
            '<button class="btn btn-primary mkt-empty-btn" data-go="H1">К решениям</button></div>') +
        '</div></div>';
    }
  });

  /* ================= H5 КипяTALK ================= */
  function miniSVG() {
    return '<svg class="mkt-mini" viewBox="0 0 330 84" role="img" aria-label="Зона КипяTALK на схеме Экспо">' +
      '<rect class="r" x="0" y="0" width="108" height="84" rx="12"/><text x="12" y="36">ЗОНЫ 1–3</text><text class="sm" x="12" y="56">стенды</text>' +
      '<rect class="r lit" x="116" y="0" width="134" height="84" rx="12"/><text class="lit" x="128" y="36">КИПЯTALK</text><text class="sm" x="128" y="56">столы, воркшопы</text>' +
      '<rect class="r" x="258" y="0" width="72" height="84" rx="12"/><text x="268" y="36">МИТАПЫ</text><text class="sm" x="268" y="56">запись</text></svg>';
  }
  /* Карточка события: одна кнопка записи; запись создаёт пункт «Мой путь» (accepted), отдельной кнопки «+ Путь» у КипяTALK нет.
     У прошедшего события мест нет — только «Прошёл». Контраст прошедших не гасится прозрачностью (стиль .past в market.css). */
  function ktCard(k) {
    const i = ktInfo(k), e = ex(k.ex);
    const pct = Math.min(100, Math.round((k.signed + (i.booked ? 1 : 0)) / k.cap * 100));
    let main;
    if (i.past) main = '<span class="btn btn-ghost mkt-kt-state">Прошёл</span>';
    else if (i.booked) main = '<button class="btn btn-secondary is-on" data-act="h5-ask" data-arg="' + esc(i.key) + '">' + icon('check') + 'Вы записаны</button>' + ktPathLink(k);
    else if (i.full) main = '<span class="btn btn-ghost mkt-kt-state">Мест нет</span>';
    else main = '<button class="btn btn-primary" data-act="h5-ask" data-arg="' + esc(i.key) + '">Записаться</button>';
    return '<div class="kt-card' + (i.past ? ' past' : '') + '"><div class="kt-time"><div class="kt-t">' + esc(k.time) + '</div><div class="kt-till">до ' + esc(ktEnd(k)) + '</div></div>' +
      '<div class="kt-main"><div class="kt-kind">' + esc(ktKind(k)) + '</div><div class="kt-title">' + esc(capFirst(ktName(k))) + '</div>' +
      (e ? '<button class="kt-host" data-go="H2/' + k.ex + '">Ведёт: ' + esc(e.name) + '</button>' : '') +
      (inStudy(k.ex) ? '<div class="mkt-kt-flag">' + tag('в вашем списке «Изучить»', 'accent') + '</div>' : '') +
      (i.past ? '' : '<div class="kt-seats"><div class="kt-bar"><i style="width:' + pct + '%"></i></div><span class="kt-seat-txt">' + esc(ktSeats(k, i)) + '</span></div>') +
      '<div class="mkt-kt-btns">' + main + '</div></div></div>';
  }

  reg('H5', {
    tab: 'H1',
    meta: {
      title: 'H5 · КипяTALK',
      role: 'Гость, участник',
      fr: ['FR-EXPO-06', 'FR-EXPO-10', 'FR-EXPO-09'],
      ac: ['AC-EXPO-07'],
      what: [
        'Сегмент «КипяTALK»: расписание круглых столов и воркшопов экспонентов по дням, зона на схеме Экспо, ссылки на план этажа и карту.',
        'У каждого события: время, ведущий-экспонент (ссылка на H2), «осталось N из M», запись по кнопке с подтверждением в листе.',
        'Запись создаёт пункт «Мой путь» (статус «принято», FIX.pathAdd), отмена записи убирает его (FIX.pathRemove), повторная запись пункт не дублирует; ссылка «В «Мой путь»» ведёт в таймлайн дня.',
        'Запись уменьшает «осталось N из M», отмена возвращает место; события, которые уже прошли, помечены «Прошёл», мест у них не показано. События экспонентов из «Изучить» отмечены.'
      ],
      rules: [
        'Круглые столы и воркшопы КипяTALK живут только здесь и в карточке экспонента, в «Программу» не входят (FR-PROG-14).',
        'КипяTALK ведут экспоненты пакета «Премиум»: три окна по 30 минут, группы 8–10 человек (D-27, D-40).',
        'Запись не превышает ёмкость (AC-EXPO-07); место закреплено до начала, при неявке бронь снимается за 10 минут до старта (в демо не моделируется).',
        'Одно состояние: пункт пути — единственная запись о том, что человек идёт на событие; места считаются отдельным счётчиком. Если пункт убрать в «Мой путь», запись считается снятой и место возвращается.',
        'Менторских встреч здесь нет: они в «Программе» у спикеров.'
      ],
      depends: ['D-27', 'D-36', 'D-40', 'FR-BOOK-10']
    },
    html(ctx) {
      const st = ctx.state;
      st.day = st.day || NOW.day;
      const items = F.KIPATALK.filter(k => k.day === st.day).sort((a, b) => a.time.localeCompare(b.time));
      const dayChips = F.DAYS.map(d => {
        const n = F.KIPATALK.filter(k => k.day === d.id).length;
        return '<button class="chip' + (d.id === st.day ? ' on' : '') + '" data-act="h5-day" data-arg="' + d.id + '">' + esc(d.label) + (n ? ' · ' + n : '') + '</button>';
      }).join('');
      return '<div class="scr">' +
        D.head({ eyebrow: esc(NOW.dateLong), title: 'КипяTALK', sub: 'Круглые столы и воркшопы экспонентов', paren: paren('запись держит место за вами') }) +
        segs('H5') +
        '<div class="chip-rail mkt-rail">' + dayChips + '</div>' +
        '<div class="mkt-body">' +
        '<div class="card mkt-kt-zone"><div class="mkt-kt-zone-h">' + icon('pin') + 'Зона КипяTALK · Конгресс-центр, 1-й этаж</div>' + miniSVG() +
        '<div class="mkt-kt-links"><button class="btn btn-secondary btn-sm" data-go="H8">Схема Экспо</button><button class="btn btn-secondary btn-sm" data-go="E2">План этажа</button><button class="btn btn-secondary btn-sm" data-go="E3/congress">На карте</button></div></div>' +
        '<div class="card mkt-kt-card">' +
        (items.length ? items.map(ktCard).join('')
          : '<div class="empty"><div class="e-title">В этот день событий нет</div><div class="e-text">Выберите другой день: события есть 26, 27 и 28 февраля.</div></div>') +
        '</div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">КипяTALK ведут экспоненты пакета «Премиум»: три окна по 30 минут, группы 8–10 человек. Менторские встречи — в «Программе» у спикеров.</div></div>' +
        '</div></div>';
    }
  });
  D.action('h5-day', el => { D.st('H5').day = el.dataset.arg; D.rerender(); });
  /* Запись и отмена — через лист с подтверждением (создаёт запись, меняет расписание и «Мой путь») */
  D.action('h5-ask', el => {
    const k = ktByKey(el.dataset.arg); if (!k) return;
    const i = ktInfo(k), e = ex(k.ex), when = k.day + ' · ' + k.time + '–' + ktEnd(k);
    if (i.past) return;
    if (i.booked) {
      D.openSheet('<div class="mkt-sheet"><div class="sheet-title">Отменить запись</div>' +
        '<div class="mkt-sh-t">' + esc(ktKind(k) + ': ' + ktName(k)) + '</div>' +
        '<div class="mkt-sh-s">' + esc(when) + ' · ведёт ' + esc(e.name) + '</div>' +
        '<div class="banner info">' + icon('info') + '<div class="cap">Место вернётся в список: станет «осталось ' + (i.left + 1) + ' из ' + k.cap + '». Пункт уйдёт из «Мой путь».</div></div>' +
        '<button class="btn btn-primary btn-block" data-act="h5-unbook" data-arg="' + esc(i.key) + '">Отменить запись</button>' +
        '<button class="btn btn-ghost btn-block" data-act="sheet-close">Оставить запись</button></div>');
      return;
    }
    const clash = ktClash(k);
    D.openSheet('<div class="mkt-sheet"><div class="sheet-title">Запись на КипяTALK</div>' +
      '<div class="mkt-sh-t">' + esc(ktKind(k) + ': ' + ktName(k)) + '</div>' +
      '<div class="mkt-sh-s">' + esc(when) + ' · ведёт ' + esc(e.name) + ' · зона КипяTALK, Конгресс-центр</div>' +
      '<div class="banner info">' + icon('info') + '<div class="cap">Сейчас ' + esc(ktSeats(k, i)) + '. После записи останется ' + (i.left - 1) + ' из ' + k.cap + '. Запись появится в «Мой путь» как принятый пункт.</div></div>' +
      (clash ? '<div class="banner warn">' + icon('alert') + '<div class="cap">Пересекается с пунктом «' + esc(clash.title) + '» (' + esc(clash.time + '–' + fmtT(toMin(clash.time) + (clash.dur || 30))) + '). Записаться можно, конфликт покажет «Мой путь».</div></div>' : '') +
      '<button class="btn btn-primary btn-block" data-act="h5-book" data-arg="' + esc(i.key) + '">Записаться</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Не сейчас</button></div>');
  });
  D.action('h5-book', el => {
    const k = ktByKey(el.dataset.arg); if (!k) return;
    const i = ktInfo(k);
    if (i.booked || i.full || i.past) { D.closeSheet(); return; }
    const it = F.pathAdd('kipatalk', k.ex, { day: k.day, time: k.time });   /* идемпотентно: уже добавленный пункт не дублируется */
    D.closeSheet();
    if (!it) { D.toast('Не удалось записаться: событие не найдено'); return; }
    ktBooked()[i.key] = true;
    D.rerender();
    D.toast('Вы записаны на КипяTALK, пункт добавлен в «Мой путь»', 2800);
  });
  D.action('h5-unbook', el => {
    const k = ktByKey(el.dataset.arg), it = k && ktPath(k);
    delete ktBooked()[el.dataset.arg];
    if (it) F.pathRemove(it.id);
    D.closeSheet();
    D.rerender();
    D.toast('Запись отменена, пункт убран из «Мой путь»', 2800);
  });

  /* ================= H6 Предложения ================= */
  reg('H6', {
    tab: 'H1',
    meta: {
      title: 'H6 · Предложения',
      role: 'Гость, участник',
      fr: ['FR-PART-03', 'FR-EXPO-02'],
      ac: ['AC-PART-03'],
      what: [
        'Лента предложений участникам на сегодня: от партнёров, экспонентов, участников и организатора; у каждого вид, срок и переход к источнику.',
        '«Сохранить» кладёт предложение в «Мой список», вкладка «Сохранено» (H3).'
      ],
      rules: [
        'Предложения экспонентов и партнёров публикуются после модерации; просроченные скрываются.',
        'Частота: не больше одной рассылки в час на человека, кроме срочных.',
        'Спецпредложение у экспонента желательное, не обязательное условие (D-40).'
      ],
      depends: ['D-40', 'FR-PART-06', 'модерация предложений']
    },
    html() {
      const kindTag = { 'партнёр': 'accent', 'экспонент': '', 'участник': '', 'организатор': 'tariff' };
      const rows = F.OFFERS.map(o => {
        const xo = (F.OFFERS_EXT || {})[o.id] || {};
        const isSaved = !!savedOffers()[o.id];
        const name = xo.go ? '<button class="mkt-off-from" data-go="' + xo.go + '">' + esc(o.from) + '</button>' : '<span class="mkt-off-from">' + esc(o.from) + '</span>';
        return '<div class="feed-item"><span class="feed-kind"></span><div class="grow">' +
          '<div class="mkt-off-head">' + name + tag(o.kind, kindTag[o.kind] || '') + (xo.type ? tag(xo.type) : '') + '</div>' +
          '<div class="feed-text">' + esc(o.text) + '</div><div class="feed-time">' + esc(o.until) + '</div>' +
          '<div class="mkt-off-acts">' + (xo.go ? '<button class="mkt-lk" data-go="' + xo.go + '">' + esc(xo.label || 'Открыть') + icon('chevR') + '</button>' : '') +
          '<button class="mkt-lk" data-act="h6-save" data-arg="' + o.id + '">' + (isSaved ? icon('check') + 'Сохранено' : 'Сохранить') + '</button></div></div></div>';
      }).join('');
      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: 'Маркетплейс', title: 'Предложения', sub: 'Предложения участникам на сегодня', paren: paren('публикуются после модерации') }, backOpt('H1'))) +
        '<div class="mkt-body"><div class="card mkt-prod-card"><div class="list">' + rows + '</div></div>' +
        '<button class="btn btn-secondary btn-block" data-go="H3">Сохранённые: Мой список</button></div></div>';
    }
  });
  D.action('h6-save', el => {
    const m = savedOffers(), id = el.dataset.arg;
    let msg;
    if (m[id]) { delete m[id]; msg = 'Убрано из сохранённых'; } else { m[id] = true; msg = 'Предложение сохранено'; }
    D.rerender();
    D.toast(msg);
  });

  /* ================= H7 Отметка стенда ================= */
  reg('H7', {
    tab: 'H1',
    meta: {
      title: 'H7 · Отметка стенда',
      role: 'Гость, участник',
      fr: ['FR-EXPO-07'],
      ac: ['AC-EXPO-05'],
      what: [
        'Сканирование QR-метки стенда: в демо камера — заглушка, отметку ставит кнопка «Отметить стенд».',
        'Результат: стенд, экспонент, время визита; статус в «Изучить» становится «посетил».',
        'Действия после визита: «Предложить встречу» (G3), «Заметка», «Изучить».'
      ],
      rules: [
        'Метка идентифицирует стенд и не даёт прав (FR-EXPO-07).',
        'Отметка создаётся один раз за 30 минут (AC-EXPO-05); повторное нажатие сообщает об этом.',
        'Визит попадает в «Мои итоги» и в воронку экспонента.'
      ],
      depends: ['метки стендов', 'D-47']
    },
    html(ctx) {
      const st = ctx.state;
      if (ctx.param && !ex(ctx.param)) return notFound('Экспо', 'Стенд не найден', 'Такого стенда нет на схеме Экспо: откройте его из каталога решений.', 'H8', 'К схеме Экспо');
      const id = ctx.param || F.STAND_CHECK.ex;
      const e = ex(id), g = planSt(e), x = ext(id);
      const seen = (st.seen || (st.seen = {}))[id];
      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: 'Экспо · ' + esc(g[0]), title: 'Стенд ' + esc(g[1]), sub: esc(e.name), paren: paren('метка привязана к стенду') }, backOpt('H2/' + id))) +
        '<div class="mkt-body">' +
        '<div class="scan-stage"><div class="scan-frame"><i class="c"></i></div><div class="scan-hint">Наведите камеру на метку стенда ' + esc(g[1]) + '</div></div>' +
        (seen
          ? '<div class="scan-result scan-ok"><div class="card-row">' + icon('check') + '<div><div class="r-title">Визит отмечен · ' + esc(seen) + '</div>' +
            '<div class="r-sub">' + esc(e.name) + ' · стенд ' + esc(g[1]) + '. Повторная отметка возможна через 30 минут.</div></div></div></div>'
          : '<button class="btn btn-primary btn-block" data-act="h7-scan" data-arg="' + id + '">' + icon('scan') + 'Отметить стенд</button>') +
        '<div class="mkt-acts2">' +
        (x.accepts ? '<button class="btn ' + (seen ? 'btn-primary' : 'btn-secondary') + '" data-go="G3/' + id + '">Предложить встречу</button>' : '<button class="btn btn-secondary" data-go="H2/' + id + '">Карточка</button>') +
        '<button class="btn btn-secondary" data-act="mk-note" data-arg="' + id + '">Заметка</button></div>' +
        studyBtn(id, 'btn-block') + '</div></div>';
    }
  });
  D.action('h7-scan', el => {
    const st = D.st('H7'), id = el.dataset.arg;
    st.seen = st.seen || {};
    if (st.seen[id]) { D.toast('Визит уже отмечен'); return; }
    st.seen[id] = NOW.time;
    if (inStudy(id)) study().status[id] = 'посетил';
    D.rerender();
    D.toast('Визит отмечен');
  });
})();
