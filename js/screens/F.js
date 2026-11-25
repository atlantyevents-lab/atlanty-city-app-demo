/* Блок F — участники. Этап S5 (демо v3): F1…F12.
   Данные: window.FIX.PPL (data/fx_people.js): люди, компании, продукты, встречи, умная строка (PPL.parseAsk / PPL.runAsk),
   изменяемое состояние сеанса PPL.store. Стили: css/people.css (префикс ppl-).
   Общие помощники блоков F и G выставлены как window.PPLUI (G.js подключается после F.js). */
(function () {
  'use strict';
  const D = window.Demo, F = window.FIX, P = F.PPL, S = P.store;
  const { esc, icon, paren, tag, tariffTag, avatar } = D;
  const plural = D.plural;

  /* ================= общие помощники ================= */

  const person = id => F.person(id);
  /* причина показа живьём из профиля (PS.whyText): запрос и цели читаются текущие, у «Просто знакомиться» запросная причина скрыта */
  const whyText = w => (F.PS && F.PS.whyText) ? F.PS.whyText(w) : (w ? (w.text || '') : '');
  /* параметр маршрута текущего экрана (в mount он не передаётся) */
  function routeParam() { const m = location.hash.match(/^#\/[A-Z]\d+\/([A-Za-z0-9_-]+)/); return m ? m[1] : ''; }

  /* «Назад» идёт по истории оболочки (data-act="nav-back"), а не по собственному стеку: так F2 → H10 → назад → назад
     не зацикливается. Пока внутри приложения ещё не было переходов (прямое открытие экрана), вместо истории
     ставится запасной экран. История браузера читается через Navigation API (в браузерах без него — запасной экран). */
  const NAV = window.navigation || null;
  /* записи истории, которые открывались в этом сеансе страницы: только для них работает nav-back оболочки
     (история браузера ограничена по длине, поэтому номер записи для этого не годится) */
  const SEEN = new Set();
  function markEntry() { try { SEEN.add(NAV.currentEntry.key); } catch (err) { /* без Navigation API */ } }
  if (NAV && NAV.currentEntry) { markEntry(); NAV.addEventListener('currententrychange', markEntry); }
  function prevEntry() {
    try {
      if (NAV && NAV.currentEntry && NAV.currentEntry.index > 0) { return NAV.entries()[NAV.currentEntry.index - 1] || null; }
    } catch (err) { /* без истории */ }
    return null;
  }
  function prevHash() {
    const e = prevEntry();
    try {
      const h = e && e.url ? new URL(e.url).hash : '';
      return /^#\/[A-Z]\d+/.test(h) && h.indexOf('#/A') !== 0 ? h : '';
    } catch (err) { return ''; }
  }
  function backOf(fallback) {
    const e = prevEntry();
    return e && SEEN.has(e.key) && prevHash() ? { backHist: true } : { back: fallback };
  }
  /* источник заявки по экрану, с которого человек пришёл (ссылки других разделов приходят без суффикса источника) */
  function inferSrc() {
    const prev = prevHash();
    if (!prev) { return 'card'; }
    if (/^#\/(F11|G2|G3)/.test(prev)) { return null; }
    if (/^#\/R\d/.test(prev)) { return 'feed'; }
    if (/^#\/F10/.test(prev)) { return 'ask'; }
    if (/^#\/F6/.test(prev)) { return 'coffee'; }
    if (/^#\/G11/.test(prev)) { return 'alt'; }
    if (/^#\/G10/.test(prev)) { return 'hb'; }
    if (/^#\/J\d/.test(prev)) { return 'scan'; }
    if (/^#\/[BN]\d/.test(prev)) { return 'ai'; }
    return 'card';
  }
  /* данные кабинета (S7): значение поля, уровень видимости и согласия; без FIX.PS работают значения ME */
  const myVal = id => (F.PS && F.PS.display) ? F.PS.display(id) : (F.ME[id] || null);
  const myVis = id => (F.PS && F.PS.vis) ? F.PS.vis(id) : ((F.ME.visibility || {})[id] || 'only_me');
  const myConsent = id => (F.PS && F.PS.consents) ? !!F.PS.consents[id] : true;
  const dayId = day => 'd' + String(day).replace('.', '');          /* '27.02' → 'd2702' (маршрут B4) */
  const VIS = {};
  F.TAXO.VISIBILITY.forEach(v => { VIS[v.id] = v.label; });
  const PEOPLE_FORMS = ['человек', 'человека', 'человек'];
  const SRC = { card: 'карточка человека', feed: 'интро или лента', ask: 'подборка по запросу', coffee: 'Предметный кофе', alt: 'альтернатива Секретаря', ai: 'ИИ-подбор', scan: 'скан на стенде', hb: 'Hosted Buyer' };
  const MST = { pending: 'ждёт ответа', confirmed: 'подтверждена', held: 'состоялась', cancelled: 'отменена' };
  const MST_CLS = { pending: 'wait', confirmed: 'ok', held: '', cancelled: 'off' };
  /* подпись состояния встречи: отозванная заявка называется «отозвана», не «отменена» */
  const mstOf = m => (m.status === 'cancelled' && m.withdrawn) ? 'отозвана' : MST[m.status];
  /* что увидит адресат заявки: причина и только те поля, которые ваши настройки видимости открывают всем (D-47) */
  function sees() {
    const goal = myVis('goals') === 'all' ? ((F.PS && F.PS.goalTitle && F.PS.main) ? F.PS.goalTitle(F.PS.main) : (F.ME.goals[0] || '')) : '';
    const use = myVis('usefulness') === 'all' ? (myVal('usefulness') || '') : '';
    const parts = ['причину'];
    if (goal) { parts.push('вашу цель «' + goal + '»'); }
    if (use) { parts.push('пользу: ' + use); }
    const text = parts.length > 1 ? parts.slice(0, -1).join(', ') + ' и ' + parts[parts.length - 1] : parts[0];
    const note = !goal && !use ? 'Цель и польза скрыты вашими настройками видимости, адресат их не увидит.'
      : !goal ? 'Цель скрыта вашими настройками видимости, адресат её не увидит.'
      : !use ? 'Польза скрыта вашими настройками видимости, адресат её не увидит.' : '';
    return { goal: goal, use: use, text: text, note: note, paren: 'адресат увидит ' + (goal || use ? 'причину' + (goal ? ', цель' : '') + (use ? ' и пользу' : '') : 'только причину') };
  }
  const dateOf = d => P.dayDate(d);
  const when = (d, t) => P.dayTime(d, t);

  /* кнопка «+ Путь» по общему контракту: «В пути» (переход в таймлайн дня) либо «+ Путь» */
  function pathBtn(type, ref, o) {
    o = o || {};
    const cls = o.cls || 'btn-secondary btn-sm';
    const it = F.pathFind(type, ref);
    if (it) {
      return '<button class="btn ' + cls + ' on" data-go="B4/' + dayId(it.day) + '" aria-label="В пути, открыть таймлайн дня">' + icon('check') + 'В пути</button>';
    }
    return '<button class="btn ' + cls + '" data-act="path-add" data-type="' + type + '" data-ref="' + esc(ref) + '"' +
      (o.day ? ' data-day="' + esc(o.day) + '"' : '') + (o.time ? ' data-time="' + esc(o.time) + '"' : '') + '>+ Путь</button>';
  }
  function pathBtnPerson(p, o) {
    o = Object.assign({}, o || {});
    if (!o.time) {
      const s = P.suggest(p.id);
      if (s) { o.day = s.day; o.time = s.label; }
    }
    return pathBtn(p.hb ? 'buyer' : 'person', p.id, o);
  }

  /* встреча с человеком (ожидает или подтверждена) */
  function meetOf(pid) {
    for (let i = 0; i < S.meets.length; i++) {
      const m = S.meets[i];
      if (m.who && m.who.type === 'person' && m.who.id === pid && (m.status === 'pending' || m.status === 'confirmed')) { return m; }
    }
    return null;
  }
  function meetWho(m) {
    const w = m.who || {};
    if (w.type === 'person') {
      const p = person(w.id);
      return { name: p ? p.name : w.id, av: p ? p.name : w.id, sub: p ? p.role + ' · ' + p.company : '', go: 'F2/' + w.id };
    }
    if (w.type === 'exhibitor') {
      const ex = F.exhibitor(w.id);
      return { name: (ex ? ex.name : w.id) + (w.rep ? ' · ' + w.rep : ''), av: ex ? ex.name : w.id, sub: ex ? 'стенд ' + ex.stand : '', go: 'H2/' + w.id };
    }
    if (w.type === 'speaker') {
      const sp = F.SPEAKERS[w.key];
      return { name: sp ? sp.name : w.key, av: sp ? sp.name : w.key, sub: sp ? sp.role + ' · ' + sp.company : '', go: 'C5/' + w.key };
    }
    return { name: '', sub: '', go: '' };
  }
  function newMeetId() { return 'mt' + (S.seq++); }

  /* окно, подходящее по времени для подтверждённой картины «11:30–12:00» */
  const range = (start, dur) => start + '–' + P.endOf(start, dur || 30);

  /* лист подтверждения (Q-27): всё, что пишет другому человеку или создаёт запись, идёт через него */
  function confirmSheet(o) {
    D.openSheet('<div class="sheet-title">' + esc(o.title) + '</div>' + (o.body || '') +
      '<div class="ppl-sheet-actions"><button class="btn ' + (o.danger ? 'btn-secondary' : 'btn-primary') + ' btn-block" data-act="' + esc(o.act) + '" data-arg="' + esc(o.arg == null ? '' : o.arg) + '"' + (o.disabled ? ' disabled' : '') + '>' + esc(o.ok) + '</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">' + esc(o.cancel || 'Отмена') + '</button></div>');
  }
  const sumRow = (k, v) => '<div><span class="k">' + esc(k) + '</span><span class="v">' + esc(v) + '</span></div>';

  /* ряд чипов под сегментами: Заявки (N) · Моя визитка · Мои контакты · Партнёры */
  function linksRail() {
    const n = P.inboxNew();
    return '<div class="chip-rail ppl-links">' +
      '<button class="chip" data-go="F4">Заявки <span class="n">(' + n + ')</span></button>' +
      '<button class="chip" data-go="F7">Моя визитка</button>' +
      '<button class="chip" data-go="F8">Мои контакты</button>' +
      '<button class="chip" data-go="K1">Партнёры</button></div>';
  }
  const SEG = [['F1', 'Участники'], ['F9', 'Спикеры'], ['G1', 'Встречи']];

  const meetGo = (pid, src) => 'F11/' + pid + (src ? '_' + src : '');
  function meetBtn(p, src, cls) {
    const m = meetOf(p.id);
    if (m) { return '<button class="btn btn-secondary btn-sm" data-go="G4/' + m.id + '">Встреча: ' + esc(MST[m.status]) + '</button>'; }
    return '<button class="btn ' + (cls || 'btn-secondary btn-sm') + '" data-go="' + meetGo(p.id, src) + '">Хочу встретиться</button>';
  }

  /* компактная строка человека: аватар, имя и тариф, должность · компания, причина показа одной строкой,
     одна главная кнопка и «+ Путь» рядом (контурные: заливка оранжевым только у главной кнопки экрана) */
  function personRow(p, o) {
    o = o || {};
    const e = P.ext(p.id);
    const why = o.why != null ? o.why : (e.why ? whyText(e.why) : '');
    const line = o.hit ? '<span class="ppl-hit">' + esc(o.hit) + '</span>' : (why ? '<span class="ppl-why">' + paren(why) + '</span>' : '');
    return '<div class="ppl-row">' +
      '<button class="ppl-main" data-go="F2/' + p.id + '">' + avatar(p.name, 'sm') +
      '<span class="ppl-t"><span class="ppl-name"><span class="nm">' + esc(p.name) + '</span>' + tariffTag(p.tariff) + (p.hb ? '<span class="ppl-hb">Hosted Buyer</span>' : '') + '</span>' +
      '<span class="ppl-role" title="' + esc(p.role + ' · ' + p.company) + '">' + esc(p.role) + ' · ' + esc(p.company) + '</span></span>' +
      '<span class="ppl-chev">' + icon('chevR') + '</span>' + line + '</button>' +
      '<div class="ppl-acts">' + (o.acts != null ? o.acts : meetBtn(p, o.src) + pathBtnPerson(p, { cls: 'ppl-quiet btn-sm' })) + '</div></div>';
  }

  /* ================= умная строка ================= */

  function smartBar(value) {
    return '<div class="ppl-smart">' + icon('spark') +
      '<textarea id="ppl-ask" rows="1" maxlength="200" placeholder="Кого ищете? Опишите фразой" enterkeyhint="search" autocomplete="off" aria-label="Умная строка: запрос обычной фразой">' + esc(value || '') + '</textarea>' +
      '<button class="ppl-go" data-act="ask-go" aria-label="Найти">' + icon('search') + '</button></div>';
  }
  function askExamples() {
    return '<div class="ppl-exs"><div class="ppl-note" style="padding:0 4px">Например:</div>' + P.ASK_EXAMPLES.map((q, i) =>
      '<button class="ppl-ex" data-act="ask-ex" data-arg="' + i + '">' + icon('chevR') + '<span class="ppl-ex-q">«' + esc(q) + '»</span></button>').join('') + '</div>';
  }
  /* поле растёт по тексту до трёх строк, длинная фраза запроса видна целиком */
  function autosize(ta, max) {
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, max || 150) + 'px';
    ta.style.overflowY = ta.scrollHeight > (max || 150) ? 'auto' : 'hidden';
  }
  function bindAsk(host) {
    const inp = host.querySelector('#ppl-ask');
    if (!inp) { return; }
    autosize(inp, 84);
    inp.addEventListener('input', () => autosize(inp, 84));
    inp.addEventListener('keydown', ev => { if (ev.key === 'Enter' && !ev.shiftKey) { ev.preventDefault(); runAskPhrase(inp.value); } });
  }
  function runAskPhrase(phrase) {
    phrase = String(phrase || '').trim();
    if (!phrase) { D.toast('Введите запрос обычной фразой'); return; }
    S.ask = { phrase: phrase, chips: P.parseAsk(phrase).chips };
    const st = D.st('F10');
    st.off = {}; st.noai = false;
    if (/^#\/F10/.test(location.hash)) { D.rerender(); } else { location.hash = '#/F10'; }
  }
  D.action('ask-go', () => { const i = document.getElementById('ppl-ask'); runAskPhrase(i ? i.value : ''); });
  D.action('ask-ex', el => runAskPhrase(P.ASK_EXAMPLES[parseInt(el.dataset.arg, 10)]));

  /* ================= F1 «Участники» ================= */

  /* цели для фильтра: только те, которые люди сами открыли всем участникам (D-47) */
  function goalSet() {
    const out = [];
    F.PEOPLE.forEach(p => { const g = P.goalOf(p.id); if (g && out.indexOf(g) < 0) { out.push(g); } });
    return out;
  }

  function f1Filtered(st) {
    return P.filterPeople({ q: st.q || '', tariff: st.tariff || '', industry: st.industry || '', goal: st.goal || '' });
  }
  function f1Count(key, val) {
    const o = { q: '', tariff: '', industry: '', goal: '' };
    const st = D.st('F1');
    ['tariff', 'industry', 'goal'].forEach(k => { o[k] = st[k] || ''; });
    o.q = st.q || '';
    o[key] = val;
    return P.filterPeople(o).length;
  }
  function f1ListHTML(st) {
    const res = f1Filtered(st), lim = st.limit || 8;
    const has = st.q || st.tariff || st.industry || st.goal;
    let h = '<div class="ppl-count"><span>Найдено: ' + res.length + ' ' + plural(res.length, PEOPLE_FORMS) + '</span>' +
      (has ? '<button data-act="f1-reset">Сбросить</button>' : '') + '</div>';
    if (!res.length) {
      h += '<div class="card ppl-empty"><div class="e-title">Никого не нашли</div>' +
        '<div class="e-text">Снимите часть фильтров или опишите запрос обычной фразой в умной строке.</div>' +
        '<button class="btn btn-secondary btn-sm" data-act="f1-reset">Сбросить фильтры</button></div>';
      return h;
    }
    h += '<div class="ppl-box"><div class="ppl-list">' + res.slice(0, lim).map(r => {
      const hit = r.hits && r.hits.filter(x => x.kind !== 'name').map(x => P.hitLabel(x)).filter(Boolean)[0];
      return personRow(r.p, { hit: hit || '' });
    }).join('') + '</div></div>';
    if (res.length > lim) { h += '<button class="btn btn-secondary btn-block" data-act="f1-more">Показать ещё</button>'; }
    return h;
  }
  function f1CoffeeBlock() {
    if (S.hideCoffee) {
      return '<div class="ppl-box pad"><div class="ppl-note">Блок «Предметный кофе» скрыт. Подбор продолжает работать автоматически, подборка дня доступна по ссылке из меню.</div>' +
        '<button class="btn btn-secondary btn-sm" data-act="coffee-show">Показать блок</button></div>';
    }
    const rows = P.COFFEE_PICKS.slice(0, 3).map(id => {
      const p = person(id), e = P.ext(id);
      return '<button class="ppl-cof-row" data-go="F2/' + id + '">' + avatar(p.name, 'sm') +
        '<span class="grow"><span class="ppl-name">' + esc(p.name) + '</span><span class="ppl-role">' + esc(p.company) + '</span>' +
        '<span class="ppl-why">' + paren(e.why ? whyText(e.why) : '') + '</span></span>' + icon('chevR') + '</button>';
    }).join('');
    return '<div class="ppl-box">' + rows +
      '<div class="ppl-cof-foot"><div class="ppl-note">Подборка дня: ' + P.COFFEE_PICKS.length + ' ' + plural(P.COFFEE_PICKS.length, PEOPLE_FORMS) + ', у каждого есть причина показа. Подбор выполняется автоматически.</div>' +
      '<button class="btn btn-ghost btn-sm" data-act="coffee-hide">Скрыть блок</button></div></div>';
  }

  D.register('F1', {
    tab: 'F1',
    meta: {
      title: 'F1 · Участники',
      role: 'Гость, участник',
      fr: ['FR-PPL-01', 'FR-PPL-09', 'FR-PPL-11', 'FR-PPL-12', 'FR-SRCH-03', 'FR-SRCH-04', 'FR-SRCH-06'],
      ac: ['AC-PPL-05', 'AC-PPL-07', 'AC-SRCH-03', 'AC-SRCH-04'],
      what: [
        'Корень вкладки «Участники»: сегменты «Участники», «Спикеры», «Встречи»; ряд ссылок «Заявки (N)», «Моя визитка», «Мои контакты», «Партнёры».',
        'Умная строка: запрос обычной фразой («подборка предпринимателей стройки», «оборот миллиард плюс», «выходят на международный рынок») ведёт в подборку по запросу F10; под строкой три примера.',
        'Блок «Предметный кофе»: подборка дня, первые три человека с причиной, «Все» ведёт в F6; блок можно скрыть.',
        'Список людей: причина показа, компания и продукт тегами, «+ Путь» и «Хочу встретиться»; поиск по имени, компании, продукту, услуге, хобби; фильтры по тарифу, отрасли и цели; «Показать ещё».'
      ],
      rules: [
        'Список виден всем тарифам (D-07); тариф показан нейтральным тегом, оценок людей и числового совпадения нет (FR-PPL-12).',
        'Поиск не находит поля, закрытые от смотрящего (хобби и польза по уровню видимости D-47).',
        'Скрытие блока «Предметный кофе» не отключает подбор (D-46).',
        'Фильтры комбинируются, счётчик «Найдено» совпадает с выдачей.'
      ],
      depends: ['D-36', 'D-37', 'D-38', 'D-46', 'D-47', 'D-50', 'D-52']
    },
    html(ctx) {
      const st = ctx.state;
      st.q = st.q || '';
      const chip = (key, label) => {
        const val = st[key];
        return '<button class="chip' + (val ? ' on' : '') + '" data-act="f1-open" data-arg="' + key + '">' + esc(val ? label + ': ' + val : label) + icon('chevD') + '</button>';
      };
      return '<div class="scr">' +
        D.head({ eyebrow: esc(F.NOW.dateLong), title: 'Участники', sub: 'Люди, компании, продукты и услуги', paren: paren('подбор выполняется автоматически') }) +
        D.segbar(SEG, 'F1') + linksRail() +
        '<div class="ppl-body">' +
        (!myConsent('profile') ? '<div class="banner warn">' + icon('alert') + '<div class="cap"><b>Ваш профиль скрыт из каталога.</b> Участники вас не найдут. <button class="ppl-inline" data-go="L6">Включить в «Приватности»</button></div></div>' : '') +
        '<div class="ppl-field">' + smartBar('') + askExamples() + '</div>' +
        '<div class="ppl-sec">Предметный кофе<button class="more" data-go="F6">Все</button></div>' + f1CoffeeBlock() +
        '<div class="ppl-sec">Все участники</div>' +
        '<div class="ppl-search">' + icon('search') + '<input class="input" type="search" id="f1-q" placeholder="Поиск по списку: имя, компания, продукт" value="' + esc(st.q) + '" aria-label="Поиск по списку участников: имя, компания, продукт, услуга, хобби"></div>' +
        '<div class="chip-rail ppl-flt">' + chip('tariff', 'Тариф') + chip('industry', 'Отрасль') + chip('goal', 'Цель') + '</div>' +
        '<div class="ppl-wrap" id="f1-wrap">' + f1ListHTML(st) + '</div>' +
        '</div></div>';
    },
    mount(host) {
      bindAsk(host);
      const inp = host.querySelector('#f1-q');
      if (inp) {
        inp.addEventListener('input', () => {
          const st = D.st('F1');
          st.q = inp.value; st.limit = 8;
          const w = host.querySelector('#f1-wrap');
          if (w) { w.innerHTML = f1ListHTML(st); }
        });
      }
    }
  });
  function f1Refresh() {
    const w = document.getElementById('f1-wrap');
    if (w) { w.innerHTML = f1ListHTML(D.st('F1')); }
  }
  D.action('f1-more', () => { const st = D.st('F1'); st.limit = (st.limit || 8) + 8; f1Refresh(); });
  D.action('f1-reset', () => { const st = D.st('F1'); st.q = ''; st.tariff = ''; st.industry = ''; st.goal = ''; st.limit = 8; D.rerender(); });
  D.action('coffee-hide', () => { S.hideCoffee = true; D.rerender(); D.toast('Блок скрыт, подбор продолжает работать'); });
  D.action('coffee-show', () => { S.hideCoffee = false; D.rerender(); });
  D.action('f1-open', el => {
    const key = el.dataset.arg, st = D.st('F1');
    let opts = [], title = '';
    if (key === 'tariff') {
      title = 'Тариф';
      ['Первый класс', 'Бизнес', 'Оптимум', 'Спутник'].forEach(t => opts.push([t, t]));
    } else if (key === 'industry') {
      title = 'Отрасль';
      const cnt = {};
      F.PEOPLE.forEach(p => { const i = P.industryOf(p); if (i) { cnt[i] = (cnt[i] || 0) + 1; } });
      Object.keys(cnt).sort((a, b) => cnt[b] - cnt[a] || a.localeCompare(b, 'ru')).forEach(i => opts.push([i, i]));
    } else {
      title = 'Цель на форуме';
      goalSet().forEach(g => opts.push([g, g]));
    }
    const cur = st[key] || '';
    D.openSheet('<div class="sheet-title">' + esc(title) + '</div>' +
      (key === 'goal' ? '<div class="ppl-note" style="margin-bottom:6px">Показаны только цели, которые участники сами открыли всем. У остальных цель скрыта и в отбор не входит.</div>' : '') +
      '<div class="ppl-opts">' +
      '<button class="ppl-opt' + (!cur ? ' on' : '') + '" data-act="f1-set" data-arg="' + key + '|">Любой' + (!cur ? icon('check') : '') + '</button>' +
      opts.map(o => {
        const n = f1Count(key, o[0]);
        return '<button class="ppl-opt' + (cur === o[0] ? ' on' : '') + (n ? '' : ' zero') + '" data-act="f1-set" data-arg="' + key + '|' + esc(o[0]) + '"><span>' + esc(o[1]) + ' <span class="n">· ' + n + '</span></span>' + (cur === o[0] ? icon('check') : '') + '</button>';
      }).join('') + '</div>');
  });
  D.action('f1-set', el => {
    const a = el.dataset.arg, i = a.indexOf('|'), st = D.st('F1');
    st[a.slice(0, i)] = a.slice(i + 1); st.limit = 8;
    D.closeSheet(); D.rerender();
  });

  /* ================= F10 «Подборка по запросу» ================= */

  const howOf = r => (r && r.how && r.how.length) ? r.how.join(', ') : '';
  const whyOf = p => { const e = P.ext(p.id); return e.why ? whyText(e.why) : ''; };
  /* строка подборки: что совпало с запросом (или, для «рядом по смыслу», причина показа) одной строкой */
  const resultCard = (p, how, why) => personRow(p, { why: how || why, src: 'ask' });
  function wordsChip(phrase) {
    const w = P.norm(phrase).replace(/[^а-яa-z0-9\s-]/g, ' ').split(/\s+/).filter(x => x.length >= 3);
    return w.length ? [{ id: 'words', kind: 'слова', value: w.join(' '), label: 'слова: ' + w.join(' ') }] : [];
  }

  D.register('F10', {
    tab: 'F1',
    meta: {
      title: 'F10 · Подборка по запросу',
      role: 'Гость, участник',
      fr: ['FR-SRCH-04', 'FR-SRCH-05', 'FR-SRCH-06', 'FR-PPL-10', 'FR-PPL-12'],
      ac: ['AC-SRCH-04', 'AC-SRCH-05', 'AC-SRCH-06', 'AC-PPL-08'],
      what: [
        'Результат умной строки: запрос обычной фразой разобран в чипы фильтров (отрасль, оборот, тема, цель, слова); любой чип снимается нажатием и возвращается снова, выдача обновляется.',
        'От пяти до восьми человек с причиной показа, компанией и продуктом тегами; кнопки «+ Путь» и «Хочу встретиться».',
        'Состояния: пустая выдача (следующий шаг), запрос не разобран, «ИИ недоступен» (поиск по полям, FR-SRCH-06).'
      ],
      rules: [
        'Оборот: отбор только по людям, открывшим его всем участникам; значения оборота в чипах-результатах и причинах не показываются (FR-PROF-09, FR-SRCH-04).',
        'Числовой оценки совпадения и ранга нет; подпись «подбор выполняется автоматически» (D-46).',
        'Один человек показывается не более 20 раз в сутки (правило AI-MATCH).',
        'Примеры запросов и размер подборки 5–8 — параметры; допустимость веса скрытого оборота проверяет юрист (O-32).'
      ],
      depends: ['D-38', 'D-46', 'D-47', 'D-49', 'D-52', 'O-32']
    },
    html(ctx) {
      const st = ctx.state;
      st.off = st.off || {};
      if (!S.ask) { S.ask = { phrase: P.ASK_EXAMPLES[0], chips: P.parseAsk(P.ASK_EXAMPLES[0]).chips }; }
      const ask = S.ask;
      const chips = st.noai ? wordsChip(ask.phrase) : ask.chips;
      const active = chips.filter(c => !st.off[c.id]);
      const chipsHTML = chips.length
        ? '<div class="ppl-chips">' + chips.map(c => {
            const off = !!st.off[c.id];
            return '<button class="chip ' + (off ? 'off' : 'on') + '" data-act="ask-chip" data-arg="' + c.id + '" aria-pressed="' + (!off) + '">' + esc(c.label) + icon(off ? 'plus' : 'x') + '</button>';
          }).join('') + '</div>'
        : '';
      let body = '';
      if (!chips.length) {
        body = '<div class="card ppl-empty"><div class="e-title">Запрос не разобран</div><div class="e-text">Опишите, кого ищете: отрасль, тему или цель. Или откройте каталог и ищите по имени и компании.</div>' +
          '<button class="btn btn-secondary btn-sm" data-go="F1">Открыть каталог</button></div>';
      } else if (!active.length) {
        body = '<div class="card ppl-empty"><div class="e-title">Все чипы сняты</div><div class="e-text">Верните нужный чип или откройте каталог участников.</div>' +
          '<button class="btn btn-secondary btn-sm" data-go="F1">Открыть каталог</button></div>';
      } else {
        const res = P.runAsk(active);
        const total = res.exact.length + res.more.length;
        if (!total) {
          body = '<div class="card ppl-empty"><div class="e-title">Ничего не нашлось</div><div class="e-text">По этим фильтрам людей нет. Снимите один из чипов выше или откройте каталог.</div>' +
            '<button class="btn btn-secondary btn-sm" data-go="F1">Открыть каталог</button></div>';
        } else {
          body = (res.notes.length ? '<div class="banner info">' + icon('lock') + '<div class="cap">' + esc(res.notes[0]) + '</div></div>' : '');
          if (res.exact.length) {
            body += '<div class="ppl-group">Нашлось: ' + res.exact.length + ' ' + plural(res.exact.length, PEOPLE_FORMS) + '</div>' +
              '<div class="ppl-box"><div class="ppl-list">' + res.exact.map(r => resultCard(r.p, howOf(r), whyOf(r.p))).join('') + '</div></div>';
          }
          if (res.more.length) {
            body += (res.exact.length ? '' : '<div class="ppl-group">Точных совпадений нет</div>') + '<div class="ppl-group">Рядом по смыслу</div><div class="ppl-note">Не все признаки совпали, но по профилю и запросу эти люди могут быть полезны.</div>' +
              '<div class="ppl-box"><div class="ppl-list">' + res.more.map(r => resultCard(r.p, '', whyOf(r.p))).join('') + '</div></div>';
          }
        }
      }
      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: 'Умная строка', title: 'Подборка по запросу', sub: 'Распознано из вашей фразы', paren: paren('подбор выполняется автоматически') }, backOf('F1'))) +
        '<div class="ppl-body">' +
        smartBar(ask.phrase) +
        (st.noai ? '<div class="banner warn">' + icon('alert') + '<div class="cap"><b>ИИ сейчас недоступен.</b> Показан поиск по полям профиля: слова из запроса должны совпасть с именем, компанией, продуктом или отраслью.</div></div>' : '') +
        (chipsHTML ? '<div class="ppl-field"><div class="ppl-note" style="margin-bottom:8px">Фильтры из запроса: нажмите, чтобы снять или вернуть</div>' + chipsHTML + '</div>' : '') +
        body +
        '<div class="ppl-note">Числовых оценок совпадения нет. Оборот и цель учитываются только у тех, кто сам открыл их всем участникам.</div>' +
        '<div class="ppl-acts" style="padding-left:0"><button class="btn btn-ghost btn-sm" data-act="ask-noai">' + (st.noai ? 'Вернуть умный разбор' : 'Показать без ИИ') + '</button>' +
        '<button class="btn btn-ghost btn-sm" data-go="F1">К каталогу</button></div>' +
        '</div></div>';
    },
    mount(host) { bindAsk(host); }
  });
  D.action('ask-chip', el => { const st = D.st('F10'); st.off = st.off || {}; st.off[el.dataset.arg] = !st.off[el.dataset.arg]; D.rerender(); });
  D.action('ask-noai', () => { const st = D.st('F10'); st.noai = !st.noai; st.off = {}; D.rerender(); });

  window.PPLUI = { inferSrc, routeParam, backOf, autosize, dayId, pathBtn, pathBtnPerson, meetOf, meetWho, newMeetId, range, confirmSheet, sumRow, linksRail, SEG,
    meetBtn, meetGo, personRow, MST, MST_CLS, mstOf, SRC, VIS, PEOPLE_FORMS, sees, when, dateOf, myVis, myVal, myConsent };

  /* ================= F2 «Карточка человека» ================= */

  const FIELDS = [
    { id: 'site', label: 'Сайт', get: (p, c) => c ? c.site : '' },
    { id: 'industry', label: 'Отрасль', get: (p, c) => c ? c.industry : '' },
    { id: 'communities', label: 'Бизнес-сообщества', get: (p, c, e) => (e.communities || []).join(', ') },
    { id: 'hobby', label: 'Хобби', get: (p, c, e) => e.hobby },
    { id: 'sport', label: 'Спорт', get: (p, c, e) => e.sport },
    { id: 'usefulness', label: 'Польза для других', get: (p, c, e) => e.usefulness },
    { id: 'goals', label: 'Цель на форуме', get: p => p.goal },
    { id: 'revenue', label: 'Оборот компании', get: (p, c) => c ? c.revenue : '' },
    { id: 'request', label: 'Запрос на фестиваль', get: (p, c, e) => e.request },
    { id: 'instagram', label: 'Instagram', get: (p, c, e) => e.instagram },
    { id: 'telegram', label: 'Telegram', get: (p, c, e) => e.telegram }
  ];
  const LEVEL_ORDER = ['all', 'meeting', 'partners', 'only_me'];
  const LEVEL_ICON = { all: 'eye', meeting: 'user', partners: 'briefcase', only_me: 'lock' };
  const HIDDEN_WHY = { meeting: 'откроется после встречи', partners: 'доступно экспонентам и спикерам по согласию', only_me: 'скрыто владельцем' };

  function f2Fields(p) {
    const c = P.company(p.id), e = P.ext(p.id);
    const g = {};
    LEVEL_ORDER.forEach(l => { g[l] = { vis: [], hid: [] }; });
    FIELDS.forEach(f => {
      const a = P.fieldAccess(p.id, f.id);
      const v = f.get(p, c, e);
      if (a.visible) { if (v) { g[a.level].vis.push({ f: f, v: v, a: a }); } }
      else { g[a.level].hid.push({ f: f, a: a }); }
    });
    let h = '';
    LEVEL_ORDER.forEach(l => {
      const gr = g[l];
      if (gr.vis.length) {
        h += '<div class="ppl-grp"><span class="ppl-lvl">' + icon(LEVEL_ICON[l]) + esc(VIS[l]) + '</span>' +
          '<div class="ppl-because">' + icon('eye') + '<span>Видно вам, потому что ' + esc(gr.vis[0].a.because) + '</span></div>' +
          gr.vis.map(x => '<div class="ppl-f"><div class="k">' + esc(x.f.label) + '</div><div class="v">' + esc(x.v) +
            (x.f.id === 'revenue' ? ' <span class="ppl-note">открыт владельцем для всех участников</span>' : '') + '</div></div>').join('') + '</div>';
      }
      if (gr.hid.length) {
        h += '<div class="ppl-grp"><div class="ppl-lock">' + icon('lock') + '<div><b>' + esc(gr.hid.map(x => x.f.label).join(', ')) + '</b>: ' + esc(HIDDEN_WHY[l]) +
          (gr.hid.some(x => x.f.id === 'revenue') ? '. Оборот используется только подбором' : '') + '</div></div></div>';
      }
    });
    h += '<div class="ppl-grp"><div class="ppl-lock">' + icon('lock') + '<div><b>Семейное положение, дети</b>: скрыто владельцем, в каталоге не показывается</div></div></div>';
    return h;
  }
  const FSTATE = {
    pending: ['info', 'clock', 'Заявка на знакомство отправлена', 'Ждём ответа. Заявка живёт 12 часов.'],
    accepted: ['ok', 'check', 'Заявка принята', 'Можно договориться о встрече: нажмите «Хочу встретиться».'],
    declined: ['warn', 'alert', 'Заявка отклонена', 'Новую заявку этому человеку отправить нельзя.'],
    expired: ['info', 'clock', 'Заявка не получила ответа', 'Срок заявки истёк. Можно предложить встречу.']
  };

  D.register('F2', {
    tab: 'F1',
    meta: {
      title: 'F2 · Карточка человека',
      role: 'Гость, участник',
      fr: ['FR-PPL-02', 'FR-PPL-10', 'FR-PROF-04', 'FR-PROF-08', 'FR-PROF-09', 'FR-PROF-10', 'FR-SRCH-01'],
      ac: ['AC-PPL-02', 'AC-PPL-06', 'AC-SRCH-01'],
      what: [
        'Поля профиля по четырём уровням видимости (D-47): «Все участники», «Те, с кем у меня встреча», «Экспоненты и спикеры по согласию», «Только вы»; у каждого открытого поля пометка «видно вам, потому что…».',
        'Закрытые от смотрящего поля не показываются, вместо значения причина: «откроется после встречи», «скрыто владельцем». Оборот по умолчанию скрыт.',
        'Причина показа в подборе, компания и продукты (F12, H10), ближайшее окно и стол от системы.',
        'Действия: «Хочу встретиться» (F11), «Познакомиться» (F3), «+ Путь», «Заметка», сохранить в «Мои контакты», своя QR-визитка.'
      ],
      rules: [
        'Тариф виден всем и не редактируется (D-07, FR-PROF-04); показан нейтральным тегом.',
        'Уровень видимости не отключает поле от подбора (D-46); числовых оценок людей нет.',
        'Поле уровня «Те, с кем у меня встреча» открывается по факту: после подтверждённой или состоявшейся встречи (G4, G5) и после принятой заявки на знакомство (F4, F5) с этим человеком (FR-PROF-08); исходно открыты Марина Крылова и Денис Воронов.',
        'Цель человека показывается только если он сам открыл её всем участникам (D-45, D-47); иначе она скрыта и в тегах, и в фильтрах.',
        'Повторная заявка на знакомство невозможна: кнопка недоступна, пока заявка ждёт ответа или принята.'
      ],
      depends: ['D-07', 'D-45', 'D-46', 'D-47', 'D-50']
    },
    html(ctx) {
      const id = (ctx.param && person(ctx.param)) ? ctx.param : 'p05';
      const p = person(id), e = P.ext(id), c = P.company(id), pr = P.products(id);
      const isSaved = !!S.saved[id];
      const sg = P.suggest(id), fw = P.suggestions(id, 4), mt = meetOf(id), rs = P.reqStatus(id);
      const fs = rs ? FSTATE[rs] : null;
      const goal = P.goalOf(id), src = inferSrc() || 'card';
      const todayNote = P.todayNote(id);

      let whenHTML;
      if (mt) {
        whenHTML = '<div class="banner ok">' + icon('check') + '<div class="grow"><div class="b-title">Встреча назначена: ' + esc(when(mt.day, range(mt.start, mt.dur))) + '</div>' +
          '<div class="cap">' + esc(mt.place) + ' · ' + esc(MST[mt.status]) + '</div></div>' +
          '<button class="btn btn-ghost btn-sm" data-go="G4/' + mt.id + '">Открыть</button></div>';
      } else if (sg) {
        const others = fw.filter(x => x.day !== sg.day || x.label !== sg.label).map(x => (x.day === sg.day ? '' : P.dayWord(x.day) + ' ') + x.label);
        whenHTML = '<div class="ppl-box pad"><div class="ppl-note">Система предлагает окно и стол</div>' +
          '<div class="ppl-big">' + esc(sg.label) + ', стол ' + sg.table + '</div>' +
          '<div class="ppl-note">' + esc(P.dayWord(sg.day).replace(/^./, ch => ch.toUpperCase())) + ', ' + esc(dateOf(sg.day)) + ' · Нетворкинг-зона B2B · 30\u00A0минут' + (others.length ? ' · другие окна: ' + esc(others.join(', ')) : '') + '</div>' +
          (todayNote ? '<div class="ppl-note">' + esc(todayNote) + '</div>' : '') +
          '<div class="ppl-acts" style="padding-left:0">' + pathBtnPerson(p, { cls: 'ppl-quiet btn-sm' }) + '<button class="btn ppl-quiet btn-sm" data-go="G2/' + id + '">Другое окно или стол</button></div></div>';
      } else {
        whenHTML = '<div class="banner">' + icon('clock') + '<div class="cap">Ближайшие дни нет общих свободных окон. <button class="ppl-inline" data-go="G11/' + id + '">Что можно сделать</button></div></div>';
      }

      const freeLine = p.hb ? 'Обязательство покупателя: ' + F.freeText(p) + ' встреч' : 'Окна человека на сегодня: ' + F.freeText(p);

      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: 'Участники', title: esc(p.name), sub: esc(p.role) + ' · ' + esc(p.company),
          actions: '<button class="icon-btn' + (isSaved ? ' on' : '') + '" data-act="f2-save" data-arg="' + id + '" aria-label="' + (isSaved ? 'Убрать из сохранённых' : 'Сохранить') + '">' + icon('bookmark') + '</button>' +
            '<button class="icon-btn" data-go="F7" aria-label="Моя QR-визитка">' + icon('qr') + '</button>' }, backOf('F1'))) +
        '<div class="ppl-body">' +
        '<div class="card ppl-hero">' + avatar(p.name, 'xl accent') +
        '<div class="ppl-meta">' + tariffTag(p.tariff) + (p.hb ? '<span class="ppl-hb">Hosted Buyer</span>' : '') + (goal ? tag('цель: ' + goal) : '') + '</div></div>' +
        (e.why ? '<div class="ppl-box pad edge"><div class="ppl-note">Почему вам показан этот человек</div>' + paren(whyText(e.why)) +
          '<div class="ppl-note">Подбор выполняется автоматически, оценок людей нет.</div></div>' : '') +
        (fs ? '<div class="banner ' + fs[0] + '">' + icon(fs[1]) + '<div><div class="b-title">' + fs[2] + '</div><div class="cap">' + fs[3] + '</div></div></div>' : '') +
        '<div class="ppl-sec">Когда встретиться</div>' + whenHTML +
        '<div class="cap">' + esc(freeLine) + '</div>' +
        (p.hb ? '<div class="banner info">' + icon('star') + '<div class="cap">Приглашённый покупатель. Записаться может участник со своим продуктом. <button class="ppl-inline" data-go="G10">Как это работает</button></div></div>' : '') +
        '<div class="ppl-sec">Профиль</div>' +
        '<div class="ppl-box">' + f2Fields(p) + '</div>' +
        '<div class="banner info">' + icon('eye') + '<div class="cap">Уровень видимости каждого поля задаёт сам участник. <button class="ppl-inline" data-go="L6">Ваши настройки в «Приватности»</button></div></div>' +
        '<div class="ppl-sec">Компания и продукты</div>' +
        '<div class="ppl-box">' +
        (c ? '<button class="ppl-rowlink" data-go="F12/' + c.id + '"><span class="ppl-sq">' + icon('building') + '</span><span class="grow"><span class="r-title">' + esc(c.name) + '</span><span class="r-sub">' + esc(c.industry) + '</span></span>' + icon('chevR') + '</button>' : '') +
        pr.map(x => '<button class="ppl-rowlink" data-go="H10/' + x.id + '"><span class="ppl-sq">' + icon('briefcase') + '</span><span class="grow"><span class="r-title">' + esc(x.name) + '</span><span class="r-sub">' + esc(x.kind) + ' · ' + esc(x.short) + '</span></span>' + icon('chevR') + '</button>').join('') +
        '</div>' +
        '<div class="ppl-acts" style="padding-left:0"><button class="btn btn-ghost btn-sm" data-go="M1">Заметка о человеке</button></div>' +
        '</div>' +
        '<div class="ppl-dock">' +
        (mt ? '<button class="btn btn-primary" data-go="G4/' + mt.id + '">Встреча: ' + esc(MST[mt.status]) + '</button>'
            : '<button class="btn btn-primary" data-go="' + meetGo(id, src) + '">Хочу встретиться</button>') +
        '<button class="btn btn-secondary" data-go="F3/' + id + '"' + (rs === 'pending' || rs === 'accepted' || rs === 'declined' ? ' disabled' : '') + '>Познакомиться</button>' +
        '</div></div>';
    }
  });
  D.action('f2-save', el => {
    const id = el.dataset.arg;
    const was = !!S.saved[id];
    if (was) { delete S.saved[id]; } else { S.saved[id] = true; }
    D.rerender();
    D.toast(was ? 'Убрано из сохранённых' : 'Сохранено в «Мои контакты»');
  });
  D.action('ext-site', el => D.toast('Сайт ' + el.dataset.arg + ' откроется во внешнем браузере (в демо переход не выполняется)'));

  /* ================= F12 «Компания участника» ================= */

  D.register('F12', {
    tab: 'F1',
    meta: {
      title: 'F12 · Компания участника',
      role: 'Гость, участник',
      fr: ['FR-PROF-10', 'FR-PROF-09', 'FR-SRCH-01', 'FR-PPL-10'],
      ac: ['AC-SRCH-01'],
      what: [
        'Карточка компании участника: название, отрасль, описание, оборот (только если владелец открыл его всем), сайт.',
        'Продукты и услуги компании (переход в H10) и люди компании (F2) с «+ Путь» и «Хочу встретиться».',
        'Компания ME (co00) показана как ваша: ссылка на редактирование профиля.'
      ],
      rules: [
        'Страниц компании без владельца-человека нет: поиск идёт по цепочке «человек, компания, продукт» (FR-SRCH-01).',
        'Оборот скрыт по умолчанию и используется только подбором; значение показывается лишь у компаний, где владелец открыл его (FR-PROF-09).',
        'Проверки компании по ИНН для участников нет (в отличие от экспонентов).',
        'Продукты без цен, заказов и отзывов (D-37).'
      ],
      depends: ['D-37', 'D-38', 'D-47']
    },
    html(ctx) {
      let c = F.company(ctx.param) || F.company('co01');
      const me = c.ownerId === 'me';
      if (me && F.PS && F.PS.val) {
        c = Object.assign({}, c, { name: F.PS.val.company || c.name, industry: F.PS.val.industry || c.industry, site: F.PS.val.site || c.site,
          revenue: F.PS.val.revenue || c.revenue, revenueOpen: myVis('revenue') === 'all' });
      }
      const owner = me ? null : person(c.ownerId);
      const pr = F.productsOf(c.id);
      /* видимость отрасли и сайта: у своей компании по настройкам «Приватности» (S7), у чужой по настройкам владельца */
      const lvlOf = fid => me ? myVis(fid) : (owner ? P.fieldAccess(owner.id, fid).level : 'all');
      const shown = fid => me ? myVis(fid) !== 'only_me' : (owner ? P.fieldAccess(owner.id, fid).visible : true);
      const showInd = shown('industry'), showSite = shown('site');
      const hideWhy = fid => esc(me ? 'скрыто вашими настройками «Только вы»; участники этого поля не видят' : HIDDEN_WHY[lvlOf(fid)] || 'скрыто владельцем');
      const revBlock = c.revenueOpen
        ? '<div class="k">Оборот компании</div><div class="v">' + esc(c.revenue) + ' <span class="ppl-note">открыт владельцем для всех участников</span></div>'
        : '<div class="ppl-lock">' + icon('lock') + '<div><b>Оборот компании</b>: скрыт владельцем' + (me ? '. Откройте его в «Приватности», если хотите показывать участникам' : '') + '. Используется только подбором</div></div>';
      const indRow = showInd
        ? '<div class="ppl-f"><div class="k">Отрасль</div><div class="v">' + esc(c.industry) + '</div></div>'
        : '<div class="ppl-f"><div class="ppl-lock">' + icon('lock') + '<div><b>Отрасль</b>: ' + hideWhy('industry') + '</div></div></div>';
      const siteRow = showSite
        ? '<div class="ppl-f"><div class="k">Сайт</div><div class="v"><button class="ppl-inline" data-act="ext-site" data-arg="' + esc(c.site) + '">' + icon('link') + esc(c.site) + '</button></div></div>'
        : '<div class="ppl-f"><div class="ppl-lock">' + icon('lock') + '<div><b>Сайт</b>: ' + hideWhy('site') + '</div></div></div>';
      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: 'Компания участника', title: esc(c.name), sub: showInd ? esc(c.industry) : '', paren: paren(me ? 'это ваша компания' : 'владелец: ' + (owner ? owner.name : '')) }, backOf('F1'))) +
        '<div class="ppl-body">' +
        (me ? '<div class="banner info">' + icon('user') + '<div class="cap">Так вашу компанию видят участники. <button class="ppl-inline" data-go="L7">Править в профиле</button><button class="ppl-inline" data-go="L6">Настроить видимость в «Приватности»</button></div></div>' : '') +
        (me && !myConsent('profile') ? '<div class="banner warn">' + icon('alert') + '<div class="cap"><b>Ваш профиль скрыт из каталога.</b> Участники не найдут вас и вашу компанию в поиске. <button class="ppl-inline" data-go="L6">Включить в «Приватности»</button></div></div>' : '') +
        '<div class="ppl-box pad"><div class="ppl-text">' + esc(c.desc) + '</div></div>' +
        '<div class="ppl-box">' +
        '<div class="ppl-grp">' + indRow + siteRow +
        '<div class="ppl-f">' + revBlock + '</div></div></div>' +
        '<div class="ppl-sec">Продукты и услуги</div>' +
        (pr.length ? '<div class="ppl-box">' + pr.map(x => '<button class="ppl-rowlink" data-go="H10/' + x.id + '"><span class="ppl-sq">' + icon('briefcase') + '</span><span class="grow"><span class="r-title">' + esc(x.name) + '</span><span class="r-sub">' + esc(x.kind) + ' · ' + esc(x.short) + '</span></span>' + icon('chevR') + '</button>').join('') + '</div>'
          : '<div class="card ppl-empty"><div class="e-title">Продуктов пока нет</div><div class="e-text">Владелец ещё не добавил продукты и услуги.</div></div>') +
        '<div class="ppl-sec">Люди компании</div>' +
        '<div class="ppl-box">' +
        (me ? '<button class="ppl-rowlink" data-go="L7">' + avatar(F.ME.name, 'sm') + '<span class="grow"><span class="r-title">' + esc(F.ME.name) + ' (вы)</span><span class="r-sub">' + esc(F.ME.company) + '</span></span>' + icon('chevR') + '</button>'
          : (owner ? '<div class="ppl-list">' + personRow(owner, { src: 'card' }) + '</div>' : '')) +
        '</div>' +
        '</div></div>';
    }
  });

  /* ================= F11 «Хочу встретиться» ================= */

  /* предложения окна и стола: от системы (до трёх) и окно, выбранное вами в G2 (оно ставится первым) */
  const NETSP = 'Нетворкинг-зона B2B';
  const propKey = x => x.day + ' ' + x.label + ' ' + x.table;
  const chipText = x => (x.day === '27.02' ? '' : P.dayWord(x.day) + ' ') + x.label + (x.table ? ' · стол ' + x.table : '');
  function proposalFor(pid) {
    S.draft = S.draft || {};
    const list = P.suggestions(pid, 3).map(x => ({ day: x.day, label: x.label, table: x.table, space: NETSP }));
    const d = S.draft[pid];
    if (d && d.label && !list.some(x => propKey(x) === propKey(Object.assign({ day: '27.02' }, d)))) {
      list.unshift({ day: d.day || '27.02', label: d.label, table: d.table, space: d.space || NETSP, spaceId: d.spaceId, custom: true });
    }
    const st = D.st('F11');
    st.pick = st.pick || {};
    const sel = Math.min(st.pick[pid] || 0, Math.max(0, list.length - 1));
    return { list: list, sel: sel, pr: list[sel] || null };
  }
  function sendBlockers(pid, text) {
    if (meetOf(pid)) { return 'У вас уже есть встреча с этим человеком.'; }
    if (P.pendingOut() >= P.LIMITS.outPending) { return 'Лимит ожидающих заявок исчерпан: ' + P.LIMITS.outPending + ' из ' + P.LIMITS.outPending + '. Дождитесь ответа или отзовите одну.'; }
    if (!text || text.trim().length < P.LIMITS.reasonMin) { return 'Напишите сообщение, не короче ' + P.LIMITS.reasonMin + ' знаков.'; }
    return '';
  }

  D.register('F11', {
    tab: 'F1',
    meta: {
      title: 'F11 · Хочу встретиться',
      role: 'Гость, участник',
      fr: ['FR-PPL-10', 'FR-MEET-03', 'FR-MEET-15', 'FR-MEET-16'],
      ac: ['AC-PPL-06', 'AC-MEET-11', 'AC-MEET-12'],
      what: [
        'Сообщение до 280 знаков с подсказкой-примером; 281-й знак не принимается, счётчик живой.',
        'Система предлагает окно и стол в Нетворкинг-зоне B2B из окон, свободных у вас и у человека и не пересекающихся с принятыми и записанными пунктами «Мой путь»; если все сегодняшние окна заняты, предлагаются ближайшие завтра. Можно выбрать другой вариант или открыть выбор окна G2.',
        'Отправка через лист подтверждения: создаётся заявка на встречу, источник записан (карточка человека, интро и лента, подборка по запросу, Предметный кофе, скан на стенде, Hosted Buyer); дальше экран заявки G3.',
        'Состояния: нет общих окон (ведёт в G11), встреча уже назначена, лимит ожидающих заявок.'
      ],
      rules: [
        'Сообщение обязательно (не короче 10 знаков) и не длиннее 280; заявка создаётся только после нажатия подтверждения в листе.',
        'Предлагаются только окна без пересечений с вашими встречами и принятыми или записанными пунктами «Мой путь» и со свободным столом; в пиковое окно сегодня 14:30 свободных столов нет.',
        'Лимит ожидающих исходящих заявок — 5 (FR-MEET-09); заявка живёт 12 часов (AC-MEET-03). Одна встреча на человека.',
        'Действие дополняет «Познакомиться» (F3), не заменяет его; переписка в приложении только в Ленте.'
      ],
      depends: ['D-50', 'D-55', 'FR-PPL-10', 'O-24']
    },
    html(ctx) {
      const parts = String(ctx.param || 'p05').split('_');
      const pid = person(parts[0]) ? parts[0] : 'p05';
      S.srcMap = S.srcMap || {};
      S.srcMap[pid] = (parts[1] && SRC[parts[1]]) ? parts[1] : (inferSrc() || S.srcMap[pid] || 'card');
      const p = person(pid);
      const text = S.greeting[pid] || '';
      const prop = proposalFor(pid);
      const mt = meetOf(pid);
      const block = sendBlockers(pid, text);
      const len = text.length;
      const todayNote = P.todayNote(pid);

      let propHTML;
      if (!prop.pr) {
        propHTML = '<div class="card ppl-empty"><div class="e-title">Общих окон нет</div><div class="e-text">В ближайшие дни нет окна, свободного у вас и у собеседника, или все столы заняты.</div>' +
          '<button class="btn btn-secondary btn-sm" data-go="G11/' + pid + '">Что можно сделать</button></div>';
      } else {
        const x = prop.pr;
        propHTML = '<div class="ppl-prop"><div class="lbl">Система предлагает окно и стол</div>' +
          '<div class="big">' + esc(x.label) + ', стол ' + x.table + '</div>' +
          '<div class="sub">' + esc(x.space) + ' · ' + esc(P.dayWord(x.day)) + ', ' + esc(x.day) + ', ' + esc(range(x.label)) + ' · 30\u00A0минут' + (x.custom ? ' · выбрано вами' : '') + '</div>' +
          (todayNote && !x.custom ? '<div class="sub">' + esc(todayNote) + '</div>' : '') +
          (prop.list.length > 1 ? '<div class="ppl-chips">' + prop.list.map((y, i) =>
            '<button class="chip' + (i === prop.sel ? ' on' : '') + '" data-act="f11-pick" data-arg="' + pid + '|' + i + '">' + esc(chipText(y)) + '</button>').join('') + '</div>' : '') +
          '<div class="acts"><button class="btn ppl-quiet btn-sm" data-go="G2/' + pid + '">Другое окно или стол</button></div></div>';
      }
      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: 'Предложить встречу', title: 'Хочу встретиться', sub: esc(p.name) + ' · ' + esc(p.company), paren: paren('система предлагает окно и стол, вы подтверждаете') }, backOf('F2/' + pid))) +
        '<div class="ppl-body">' +
        '<button class="ppl-who" data-go="F2/' + pid + '">' + avatar(p.name, 'sm') + '<span class="grow"><span class="r-title">' + esc(p.name) + '</span><span class="r-sub">' + esc(p.role) + ' · ' + esc(p.company) + '</span></span>' + tariffTag(p.tariff) + icon('chevR') + '</button>' +
        (mt ? '<div class="banner ok">' + icon('check') + '<div class="cap"><b>У вас уже есть встреча:</b> ' + esc(when(mt.day, range(mt.start, mt.dur))) + ', ' + esc(mt.place) + '. <button class="ppl-inline" data-go="G4/' + mt.id + '">Открыть встречу</button></div></div>' : '') +
        '<div class="field ppl-textarea-wrap"><label for="f11-text">Сообщение <span class="cap">· до 280 знаков, увидит ' + esc(p.name.split(' ')[0]) + '</span></label>' +
        '<textarea class="textarea" id="f11-text" maxlength="280" placeholder="Например: Добрый день! Мы строим региональные склады, давайте за кофе обсудим доставку для ваших магазинов">' + esc(text) + '</textarea>' +
        '<div class="counter"><span id="f11-cnt">' + len + ' / 280</span></div></div>' +
        propHTML +
        '<div class="ppl-note">Человек увидит сообщение и ответит или предложит другое время. Переписка в приложении ведётся только в Ленте.</div>' +
        '<div class="banner warn" id="f11-block" style="' + (block && len ? '' : 'display:none') + '">' + icon('alert') + '<div class="cap" id="f11-block-t">' + esc(block) + '</div></div>' +
        '<button class="btn btn-primary btn-block" id="f11-send" data-act="f11-ask" data-arg="' + pid + '"' + (block || !prop.pr ? ' disabled' : '') + '>Отправить заявку на встречу</button>' +
        '<div class="cap" style="text-align:center" id="f11-hint">' + (block && !len ? 'напишите сообщение, чтобы отправить' : '') + '</div>' +
        '<button class="btn btn-ghost btn-block" data-go="F3/' + pid + '">Только познакомиться, без встречи</button>' +
        '</div></div>';
    },
    mount(host) {
      const ta = host.querySelector('#f11-text');
      if (!ta) { return; }
      const pp = String(routeParam() || 'p05').split('_')[0];
      const pid = person(pp) ? pp : 'p05';
      autosize(ta, 220);
      ta.addEventListener('input', () => {
        const t = ta.value.slice(0, 280);
        S.greeting[pid] = t;
        autosize(ta, 220);
        const cnt = host.querySelector('#f11-cnt'); if (cnt) { cnt.textContent = t.length + ' / 280'; }
        const b = sendBlockers(pid, t), prop = proposalFor(pid);
        const bx = host.querySelector('#f11-block'), bt = host.querySelector('#f11-block-t'), sb = host.querySelector('#f11-send');
        if (bx) { bx.style.display = b && t.length ? '' : 'none'; }
        if (bt) { bt.textContent = b; }
        if (sb) { sb.disabled = !!b || !prop.pr; }
        const hn = host.querySelector('#f11-hint'); if (hn) { hn.textContent = b && !t.length ? 'напишите сообщение, чтобы отправить' : ''; }
      });
    }
  });
  D.action('f11-pick', el => { const a = el.dataset.arg.split('|'); const st = D.st('F11'); st.pick = st.pick || {}; st.pick[a[0]] = parseInt(a[1], 10); D.rerender(); });
  D.action('f11-ask', el => {
    const pid = el.dataset.arg, p = person(pid), text = S.greeting[pid] || '', prop = proposalFor(pid);
    const b = sendBlockers(pid, text);
    if (b || !prop.pr) { D.toast(b || 'Нет предложенного окна'); return; }
    const src = (S.srcMap || {})[pid] || 'card', x = prop.pr;
    confirmSheet({
      title: 'Отправить заявку?',
      body: '<div class="ppl-sheet-sum"><div class="ppl-dl">' + sumRow('С кем', p.name + ' · ' + p.company) + sumRow('Когда', P.dayWord(x.day) + ', ' + x.day + ', ' + range(x.label)) +
        sumRow('Где', x.space + ', стол ' + x.table) + sumRow('Откуда заявка', SRC[src]) + '</div></div>' +
        '<div class="ppl-note">«' + esc(text.length > 120 ? text.slice(0, 120) + '…' : text) + '»</div>' +
        '<div class="ppl-note" style="margin-top:8px">Окно и стол будут удержаны за вами до ответа. Заявка живёт ' + P.REQ_TTL_H + ' часов.</div>',
      ok: 'Отправить заявку', act: 'f11-confirm', arg: pid
    });
  });
  D.action('f11-confirm', el => {
    const pid = el.dataset.arg, p = person(pid), text = S.greeting[pid] || '', prop = proposalFor(pid);
    if (sendBlockers(pid, text) || !prop.pr) { D.closeSheet(); return; }
    const src = (S.srcMap || {})[pid] || 'card', x = prop.pr;
    const m = { id: newMeetId(), kind: 'meet', who: { type: 'person', id: pid }, day: x.day, start: x.label, dur: 30,
      space: NETSP, place: NETSP + ' · стол ' + x.table, table: x.table, status: 'pending', source: SRC[src], greeting: text };
    S.meets.push(m);
    delete S.draft[pid];
    D.closeSheet();
    location.hash = '#/G3/' + m.id;
    D.toast('Заявка на встречу отправлена: ' + p.name);
  });

  /* ================= F3 «Заявка на знакомство» ================= */

  const SEG_REQ = [['F4', 'Входящие'], ['F5', 'Исходящие']];

  function f3Cur(pid) {
    const st = D.st('F3');
    st.by = st.by || {};
    return st.by[pid] || (st.by[pid] = { reason: '' });
  }
  /* те же проверки, что у публичного P.sendIntro (дубль, отказ, лимит 5); короткий текст блокирует кнопку, но не пугает сообщением */
  function f3Blockers(pid, text) { return P.introBlock(pid); }

  D.register('F3', {
    tab: 'F1',
    meta: {
      title: 'F3 · Заявка на знакомство',
      role: 'Гость, участник',
      fr: ['FR-PPL-03', 'FR-PPL-04', 'FR-MEET-09'],
      ac: ['AC-PPL-01', 'AC-PPL-02'],
      what: [
        'Форма заявки на знакомство: причина до 280 знаков с живым счётчиком, обязательна (не короче 10 знаков).',
        'Отправка через лист подтверждения; после отправки экран «Ждём ответа» с ссылкой на встречу.',
        'Состояния: заявка уже отправлена или принята (повтор запрещён), отклонена, лимит ожидающих заявок исчерпан.'
      ],
      rules: [
        'Причина обязательна и ограничена 280 знаками; адресат видит её вместе с теми вашими полями (цель, польза), которые настройки видимости открывают всем участникам; закрытое поле «Только вы» адресату не показывается и не обещается.',
        'Заявка живёт 12 часов; ответы адресата: принять, отклонить, позже (FR-PPL-03).',
        'Ожидающих исходящих заявок не более 5; принятая заявка раскрывает выбранные контакты обеим сторонам.',
        'Заявка на знакомство не чат: внутри приложения чаты есть только в Ленте и в «Мой чат».'
      ],
      depends: ['D-33', 'D-47', 'FR-PPL-03']
    },
    html(ctx) {
      const pid = (ctx.param && person(ctx.param)) ? ctx.param : 'p05';
      const p = person(pid), cur = f3Cur(pid);
      const sentOut = S.out.filter(r => r.to === pid && r.status === 'pending')[0];
      const text = cur.reason || '';
      const len = text.length;
      const block = f3Blockers(pid, text);
      const ok = !block && len >= P.LIMITS.reasonMin && len <= P.LIMITS.reasonMax;

      if (sentOut) {
        return '<div class="scr">' +
          D.head(Object.assign({ eyebrow: 'Заявка отправлена', title: 'Ждём ответа', sub: esc(p.name) + ' · ' + esc(p.company), paren: paren('ответ придёт уведомлением и в раздел «Заявки»') }, backOf('F2/' + pid))) +
          '<div class="ppl-body">' +
          '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Заявка отправлена: ' + esc(p.name) + '</div><div class="cap">«' + esc(sentOut.reason.slice(0, 120)) + (sentOut.reason.length > 120 ? '…' : '') + '»</div></div></div>' +
          '<div class="banner">' + icon('clock') + '<div class="cap">Заявка живёт ' + P.REQ_TTL_H + ' часов. Если ответа не будет, она закроется, и место в лимите вернётся.</div></div>' +
          '<button class="btn btn-primary btn-block" data-go="' + meetGo(pid, 'card') + '">' + icon('route') + 'Хочу встретиться</button>' +
          '<button class="btn btn-secondary btn-block" data-go="F5">Мои исходящие</button>' +
          '<button class="btn btn-ghost btn-block" data-go="F1">К участникам</button></div></div>';
      }
      const sv = sees();
      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: 'Заявка на знакомство', title: 'Почему вы?', sub: esc(p.name) + ' · ' + esc(p.company), paren: paren(sv.paren) }, backOf('F2/' + pid))) +
        '<div class="ppl-body">' +
        '<button class="ppl-who" data-go="F2/' + pid + '">' + avatar(p.name, 'sm') + '<span class="grow"><span class="r-title">' + esc(p.name) + '</span><span class="r-sub">' + esc(p.role) + ' · окна на сегодня: ' + esc(F.freeText(p)) + '</span></span>' + tariffTag(p.tariff) + icon('chevR') + '</button>' +
        '<div class="banner warn" id="f3-block" style="' + (block ? '' : 'display:none') + '">' + icon('alert') + '<div class="cap" id="f3-block-t">' + esc(block) + '</div></div>' +
        '<div class="field ppl-textarea-wrap"><label for="f3-reason">Причина знакомства <span class="cap">· обязательно, до 280 знаков</span></label>' +
        '<textarea class="textarea" id="f3-reason" maxlength="280" placeholder="Что объединяет, что хотите обсудить, какую пользу можете принести">' + esc(text) + '</textarea>' +
        '<div class="counter"><span id="f3-cnt">' + len + ' / 280</span><span class="cap" id="f3-min">' + (len > 0 && len < P.LIMITS.reasonMin ? ' · минимум ' + P.LIMITS.reasonMin + ' знаков' : '') + '</span></div></div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Адресат увидит ' + esc(sv.text) + '.' + (sv.note ? ' ' + esc(sv.note) + ' <button class="ppl-inline" data-go="L6">Изменить в «Приватности»</button>' : '') + '</div></div>' +
        '<div class="ppl-note">После принятия откроются контакты, которые вы выберете. Чаты в приложении есть только в Ленте, поэтому дальше вы договариваетесь о встрече или пишете в Telegram.</div>' +
        '<button class="btn btn-primary btn-block" id="f3-send" data-act="f3-ask" data-arg="' + pid + '"' + (ok ? '' : ' disabled') + '>Отправить заявку</button>' +
        '<div class="cap" style="text-align:center" id="f3-hint">' + (ok || block ? '' : 'напишите причину, чтобы отправить') + '</div>' +
        '</div></div>';
    },
    mount(host) {
      const ta = host.querySelector('#f3-reason');
      if (!ta) { return; }
      const rp = routeParam();
      const pid = (rp && person(rp)) ? rp : 'p05';
      autosize(ta, 220);
      ta.addEventListener('input', () => {
        const t = ta.value.slice(0, 280), len = t.length;
        autosize(ta, 220);
        f3Cur(pid).reason = t;
        const block = f3Blockers(pid, t);
        const ok = !block && len >= P.LIMITS.reasonMin;
        const g = id => host.querySelector(id);
        if (g('#f3-cnt')) { g('#f3-cnt').textContent = len + ' / 280'; }
        if (g('#f3-min')) { g('#f3-min').textContent = len > 0 && len < P.LIMITS.reasonMin ? ' · минимум ' + P.LIMITS.reasonMin + ' знаков' : ''; }
        if (g('#f3-send')) { g('#f3-send').disabled = !ok; }
        if (g('#f3-hint')) { g('#f3-hint').textContent = ok || block ? '' : 'напишите причину, чтобы отправить'; }
      });
    }
  });
  D.action('f3-ask', el => {
    const pid = el.dataset.arg, p = person(pid), text = f3Cur(pid).reason || '';
    if (f3Blockers(pid, text) || text.trim().length < P.LIMITS.reasonMin) { return; }
    confirmSheet({
      title: 'Отправить заявку?',
      body: '<div class="ppl-sheet-sum"><div class="ppl-dl">' + sumRow('Кому', p.name + ' · ' + p.company) + sumRow('Срок заявки', P.REQ_TTL_H + ' часов') + '</div></div>' +
        '<div class="ppl-note">«' + esc(text.length > 140 ? text.slice(0, 140) + '…' : text) + '»</div>' +
        '<div class="ppl-note" style="margin-top:8px">' + esc(p.name.split(' ')[0]) + ' увидит ' + esc(sees().text) + '. Контакты откроются только после принятия.</div>',
      ok: 'Отправить заявку', act: 'f3-confirm', arg: pid
    });
  });
  D.action('f3-confirm', el => {
    const pid = el.dataset.arg, text = f3Cur(pid).reason || '';
    const r = P.sendIntro(pid, text, SRC.card);
    D.closeSheet();
    if (!r.ok) { D.rerender(); D.toast(r.reason); return; }
    D.rerender();
    D.toast('Заявка на знакомство отправлена');
  });

  /* ================= F4 «Входящие заявки» ================= */

  const IN_LBL = { accepted: 'принята', declined: 'отклонена', later: 'отложена', done: 'принята ранее' };
  function inStatus(r) { return S.inDec[r.id] || r.status; }
  const goalOf = pid => P.goalOf(pid);
  function inCard(r) {
    const p = person(r.from), st = inStatus(r), e = P.ext(r.from);
    let acts = '', note = '';
    if (st === 'new' || st === 'later') {
      acts = '<div class="ppl-acts" style="padding-left:0"><button class="btn btn-secondary btn-sm" data-act="f4-acc" data-arg="' + r.id + '">Принять</button>' +
        (st === 'new' ? '<button class="btn ppl-quiet btn-sm" data-act="f4-later" data-arg="' + r.id + '">Позже</button>' : '') +
        '<button class="btn ppl-quiet btn-sm" data-act="f4-dec" data-arg="' + r.id + '">Отклонить</button></div>';
      note = '<span class="ppl-st wait">' + esc(st === 'later' ? 'отложена' : (P.INCOMING_TTL[r.id] || 'ждёт ответа')) + '</span>';
    } else {
      note = '<span class="ppl-st ' + (st === 'declined' ? 'off' : 'ok') + '">' + esc(IN_LBL[st] || st) + '</span>';
      if (st === 'accepted' || st === 'done') {
        const sh = S.inShared[r.id];
        acts = (sh ? '<div class="ppl-note">Открыты контакты: ' + esc(sh.length ? sh.join(', ') : 'без контактов') + '</div>' : '') +
          '<div class="ppl-acts" style="padding-left:0"><button class="btn btn-secondary btn-sm" data-go="' + meetGo(r.from, 'card') + '">Выбрать время встречи</button></div>';
      }
    }
    return '<div class="ppl-res"><div class="ppl-main-row">' +
      '<button class="ppl-main" data-go="F2/' + r.from + '">' + avatar(p.name, 'sm') +
      '<span class="ppl-t"><span class="ppl-name">' + esc(p.name) + tariffTag(p.tariff) + '</span><span class="ppl-role">' + esc(p.role) + ' · ' + esc(p.company) + '</span></span>' +
      '<span class="ppl-chev">' + icon('chevR') + '</span></button></div>' +
      '<div class="ppl-quote">«' + esc(r.reason) + '»</div>' +
      (goalOf(r.from) || e.why ? '<div class="ppl-note">' + esc([goalOf(r.from) ? 'Цель: ' + goalOf(r.from) : '', e.why ? whyText(e.why) : ''].filter(Boolean).join(' · ')) + '</div>' : '') + note + acts + '</div>';
  }

  D.register('F4', {
    tab: 'F1',
    meta: {
      title: 'F4 · Входящие заявки',
      role: 'Гость, участник',
      fr: ['FR-PPL-03', 'FR-PPL-04', 'FR-MEET-09'],
      ac: ['AC-PPL-01', 'AC-PPL-02'],
      what: [
        'Очередь входящих заявок на знакомство с причиной каждого, сроком до закрытия и целью отправителя.',
        'Счётчик «сегодня принято N из 4» совпадает со строками «принята» в списке; ответы «Принять» (лист: какие контакты открыть), «Позже», «Отклонить» (лист подтверждения).',
        'После принятия: какие контакты открыты и кнопка «Выбрать время встречи» (F11).'
      ],
      rules: [
        'Входящих заявок принимается не более 4 в день; принятая заявка расходует лимит, при исчерпании «Принять» недоступна.',
        'Принятая заявка раскрывает только выбранные контакты, и обеим сторонам (FR-PPL-04, AC-PPL-02).',
        'Отклонённая заявка видна отправителю как «отклонено» без деталей; заявка живёт 12 часов.',
        'Принять и отклонить можно только через лист подтверждения (Q-27).'
      ],
      depends: ['D-47', 'FR-PPL-03', 'FR-PPL-04']
    },
    html() {
      const reqs = F.INCOMING_REQS;
      const pending = reqs.filter(r => { const s = inStatus(r); return s === 'new' || s === 'later'; });
      const rest = reqs.filter(r => { const s = inStatus(r); return s !== 'new' && s !== 'later'; });
      const used = P.inAccepted(), lim = F.REQ_LIMIT.day;
      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: 'Заявки', title: 'Входящие', sub: 'Знакомства с участниками', paren: paren('сегодня принято ' + used + ' из ' + lim) }, backOf('F1'))) +
        D.segbar(SEG_REQ, 'F4') +
        '<div class="ppl-body">' +
        (used >= lim ? '<div class="banner warn">' + icon('alert') + '<div class="cap"><b>Лимит на сегодня исчерпан.</b> Новые заявки можно будет принять завтра, отложенные остаются в очереди.</div></div>' : '') +
        (pending.length ? pending.map(inCard).join('') : '<div class="banner ok">' + icon('check') + '<div><div class="b-title">Очередь пуста</div><div class="cap">Новых заявок нет, ответим уведомлением, когда появятся.</div></div></div>') +
        (rest.length ? '<div class="ppl-sec">Ранее</div>' + rest.map(inCard).join('') : '') +
        '<div class="ppl-note">Заявка на знакомство не чат: после принятия откроются выбранные контакты и можно назначить встречу.</div>' +
        '</div></div>';
    }
  });
  D.action('f4-later', el => { S.inDec[el.dataset.arg] = 'later'; D.rerender(); D.toast('Отложено, заявка остаётся в очереди'); });
  D.action('f4-dec', el => {
    const r = F.INCOMING_REQS.filter(x => x.id === el.dataset.arg)[0], p = person(r.from);
    confirmSheet({
      title: 'Отклонить заявку?',
      body: '<div class="ppl-note">' + esc(p.name) + ' увидит только «отклонено», без деталей. Новую заявку ' + esc(p.name.split(' ')[0]) + ' отправить не сможет.</div>',
      ok: 'Отклонить заявку', act: 'f4-dec-do', arg: r.id, danger: true
    });
  });
  D.action('f4-dec-do', el => { S.inDec[el.dataset.arg] = 'declined'; D.closeSheet(); D.rerender(); D.toast('Заявка отклонена'); });
  D.action('f4-acc', el => {
    const r = F.INCOMING_REQS.filter(x => x.id === el.dataset.arg)[0], p = person(r.from);
    const lim = P.inAccepted() >= F.REQ_LIMIT.day;
    const row = (k, label, val, on) => '<label class="toggle-row" style="cursor:pointer"><div><div class="tr-title" style="font-weight:600;font-size:14px">' + esc(label) + '</div><div class="tr-sub">' + esc(val || 'не заполнено') + '</div></div>' +
      '<span class="toggle"><input type="checkbox" data-share="' + k + '"' + (on && val ? ' checked' : '') + (val ? '' : ' disabled') + '><span class="tr"></span></span></label>';
    confirmSheet({
      title: 'Принять заявку?',
      body: '<div class="ppl-note">' + esc(p.name) + ' увидит выбранные вами контакты, а вы увидите контакты отправителя по его настройкам видимости.</div>' +
        '<div class="ppl-sheet-sum" style="padding:2px 14px">' + row('Telegram', 'Telegram', myVal('telegram'), true) + row('Instagram', 'Instagram', myVal('instagram'), false) + row('Телефон', 'Телефон', F.ME.phone, false) + '</div>' +
        (lim ? '<div class="banner warn">' + icon('alert') + '<div class="cap">Лимит входящих на сегодня исчерпан.</div></div>' : ''),
      ok: 'Принять и открыть контакты', act: 'f4-acc-do', arg: r.id, disabled: lim
    });
  });
  D.action('f4-acc-do', el => {
    const id = el.dataset.arg;
    if (P.inAccepted() >= F.REQ_LIMIT.day) { D.closeSheet(); return; }
    const names = Array.prototype.map.call(document.querySelectorAll('.sheet [data-share]:checked'), x => x.dataset.share);
    S.inDec[id] = 'accepted'; S.inShared[id] = names;
    D.closeSheet(); D.rerender(); D.toast('Заявка принята, контакты открыты');
  });

  /* ================= F5 «Исходящие заявки» ================= */

  const OUT_LBL = { pending: 'ждёт ответа', accepted: 'принята', declined: 'отклонена', expired: 'истекла', withdrawn: 'отозвана' };
  const OUT_CLS = { pending: 'wait', accepted: 'ok', declined: 'off', expired: '', withdrawn: '' };

  function outList() {
    const l = F.OUTGOING_REQS.map(r => ({ id: r.id, to: r.to, reason: r.reason, status: S.withdrawn[r.id] ? 'withdrawn' : r.status, base: true }));
    l.push({ id: 'o-exp', to: 'p15', reason: 'Хочу показать идею совместного кейса по рекламе', status: 'expired', base: true });
    S.out.forEach(r => l.push({ id: r.id, to: r.to, reason: r.reason, status: r.status, base: false, at: r.at, source: r.source }));
    return l;
  }
  D.register('F5', {
    tab: 'F1',
    meta: {
      title: 'F5 · Исходящие заявки',
      role: 'Гость, участник',
      fr: ['FR-PPL-03', 'FR-MEET-09'],
      ac: ['AC-PPL-01'],
      what: [
        'Мои отправленные заявки на знакомство с состояниями: ждёт ответа, принята, отклонена, истекла, отозвана.',
        'Для ожидающей — «Отозвать» (лист подтверждения), для принятой — «Хочу встретиться», для истёкшей — «Предложить встречу».',
        'Счётчик ожидающих заявок «N из 5» вместе с заявками на встречу.'
      ],
      rules: [
        'Заявка живёт 12 часов; без ответа становится «истекла», место в лимите возвращается.',
        'Одна активная заявка на пару людей; причина видна адресату, ваши заметки нет.',
        'Лимит ожидающих исходящих заявок — 5 (знакомства и встречи вместе).'
      ],
      depends: ['FR-PPL-03', 'FR-MEET-09']
    },
    html() {
      const l = outList();
      const rows = l.map(r => {
        const p = person(r.to);
        let act = '';
        if (r.status === 'pending') { act = '<button class="btn ppl-quiet btn-sm" data-act="f5-wd" data-arg="' + r.id + '">Отозвать</button>'; }
        else if (r.status === 'accepted') { act = '<button class="btn btn-secondary btn-sm" data-go="' + meetGo(r.to, 'card') + '">Хочу встретиться</button>'; }
        else if (r.status === 'expired') { act = '<button class="btn btn-secondary btn-sm" data-go="' + meetGo(r.to, 'card') + '">Предложить встречу</button>'; }
        return '<div class="ppl-res"><div class="ppl-main-row"><button class="ppl-main" data-go="F2/' + r.to + '">' + avatar(p.name, 'sm') +
          '<span class="ppl-t"><span class="ppl-name">' + esc(p.name) + '</span><span class="ppl-role">' + esc(p.company) + '</span></span><span class="ppl-chev">' + icon('chevR') + '</span></button></div>' +
          '<div class="ppl-quote">«' + esc(r.reason) + '»</div>' +
          (r.source && r.source !== SRC.card ? '<div class="ppl-note">Откуда заявка: ' + esc(r.source) + '</div>' : '') +
          '<div class="ppl-between"><span class="ppl-st ' + OUT_CLS[r.status] + '">' + esc(OUT_LBL[r.status]) + '</span>' + act + '</div></div>';
      }).join('');
      const n = P.pendingOut();
      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: 'Заявки', title: 'Исходящие', sub: 'Отправленные заявки на знакомство', paren: paren('заявка живёт ' + P.REQ_TTL_H + ' часов') }, backOf('F1'))) +
        D.segbar(SEG_REQ, 'F5') +
        '<div class="ppl-body">' +
        '<div class="ppl-box pad"><div class="ppl-prog"><span class="ppl-note" style="flex:none">Ожидают ответа</span><span class="progress"><i style="width:' + Math.min(100, n / P.LIMITS.outPending * 100) + '%"></i></span><b>' + n + ' из ' + P.LIMITS.outPending + '</b></div>' +
        '<div class="ppl-note">В счёт входят заявки на знакомство и на встречу. Заявки на встречи — в разделе «Встречи».</div></div>' +
        rows +
        '<button class="btn btn-secondary btn-block" data-go="F1">Найти ещё людей</button>' +
        '</div></div>';
    }
  });
  D.action('f5-wd', el => {
    const id = el.dataset.arg, r = outList().filter(x => x.id === id)[0], p = person(r.to);
    confirmSheet({
      title: 'Отозвать заявку?',
      body: '<div class="ppl-sheet-sum"><div class="ppl-dl">' + sumRow('Кому', p.name + ' · ' + p.company) + '</div></div><div class="ppl-note">Заявка закроется, место в лимите ожидающих вернётся. Позже можно отправить новую.</div>',
      ok: 'Отозвать заявку', act: 'f5-wd-do', arg: id, danger: true
    });
  });
  D.action('f5-wd-do', el => {
    const id = el.dataset.arg, own = S.out.filter(x => x.id === id)[0];
    if (own) { own.status = 'withdrawn'; } else { S.withdrawn[id] = true; }
    D.closeSheet(); D.rerender(); D.toast('Заявка отозвана');
  });

  /* ================= F6 «Предметный кофе» ================= */

  function coffeePoint(pid) {
    const me = F.ME.tariff, t = person(pid).tariff;
    const lounge = P.COFFEE_POINTS[0], cafe = P.COFFEE_POINTS[1];
    return lounge.tariffs.indexOf(me) >= 0 && lounge.tariffs.indexOf(t) >= 0 ? lounge : cafe;
  }
  /* с человеком уже есть заявка или встреча (одна встреча на человека): «Пригласить» неактивна */
  function coffeeSent(pid) {
    const m = meetOf(pid);
    if (m) { return m.status === 'confirmed' ? 'Встреча уже назначена' : 'Заявка уже отправлена'; }
    return S.invited[pid] ? 'Заявка уже отправлена' : '';
  }
  function coffeeActs(pid) {
    const p = person(pid), w = P.slots(pid)[0], sent = coffeeSent(pid);
    let inv;
    if (sent) { inv = '<button class="btn btn-secondary btn-sm" disabled>' + sent + '</button>'; }
    else if (!w) { inv = '<button class="btn btn-secondary btn-sm" disabled>Нет общих окон</button>'; }
    else { inv = '<button class="btn btn-secondary btn-sm" data-act="cof-ask" data-arg="' + pid + '">Пригласить</button>'; }
    return inv + pathBtnPerson(p, { cls: 'ppl-quiet btn-sm' });
  }

  D.register('F6', {
    tab: 'F1',
    meta: {
      title: 'F6 · Предметный кофе',
      role: 'Гость, участник',
      fr: ['FR-PPL-09', 'FR-PPL-12', 'FR-MEET-03', 'FR-MEET-16'],
      ac: ['AC-PPL-05', 'AC-MEET-12'],
      what: [
        'Подборка дня «Предметный кофе»: девять человек для короткого знакомства, у каждого причина показа одной строкой, аватар, должность и компания.',
        '«Пригласить» через лист подтверждения: время (первое общее свободное окно, не пересекающееся с «Мой путь») и точка по тарифу (Бизнес-лаунж или кофе-точка); создаётся заявка на встречу с источником «Предметный кофе». Если с человеком уже есть заявка или встреча, кнопка неактивна: «Заявка уже отправлена».',
        'Счётчик «приглашено» и лимит ожидающих заявок «N из 5»; подпись «подбор выполняется автоматически».'
      ],
      rules: [
        'Свайпа нет: свайп-подбор отложен (D-50); человек сам решает, кого пригласить.',
        'В подборку не попадают люди со скрытым профилем, заблокированные и дети; приглашённый ранее повторно не предлагается (AC-PPL-05).',
        'Размер подборки — параметр (в демо 8–10); на «Участники» показаны первые три и ссылка «Все».',
        'Одна встреча на человека: повторное приглашение невозможно, пока заявка или встреча не отозваны или не отменены.',
        'Скрытие блока на «Участники» не отключает подбор (D-46, трактовка, согласовать с юристом).'
      ],
      depends: ['D-46', 'D-50', 'FR-PPL-09']
    },
    html() {
      const picks = P.COFFEE_PICKS;
      const inv = Object.keys(S.invited).length;
      const pts = P.COFFEE_POINTS.filter(x => x.tariffs.indexOf(F.ME.tariff) >= 0);
      const rows = picks.map(id => personRow(person(id), { acts: coffeeActs(id) })).join('');
      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: esc(F.NOW.dateLong), title: 'Предметный кофе', sub: 'Подборка дня для знакомства', paren: paren('подбор выполняется автоматически') }, backOf('F1'))) +
        '<div class="ppl-body">' +
        '<div class="ppl-kpis"><div class="kpi-cell"><div class="k">В подборке</div><div class="v">' + picks.length + '</div></div>' +
        '<div class="kpi-cell"><div class="k">Приглашено</div><div class="v">' + inv + '</div></div>' +
        '<div class="kpi-cell"><div class="k">Ожидают ответа</div><div class="v">' + P.pendingOut() + '<span class="k"> из ' + P.LIMITS.outPending + '</span></div></div></div>' +
        '<div class="banner info">' + icon('pin') + '<div class="cap"><b>Точки для кофе по вашему тарифу:</b> ' + esc(pts.map(x => x.name + ' (' + x.note + ')').join('; ')) + '</div></div>' +
        '<div class="ppl-box"><div class="ppl-list">' + rows + '</div></div>' +
        '<div class="ppl-note">Подборка пересчитывается каждый день. Каждый человек показан с причиной; числовых оценок совпадения нет.</div>' +
        '<button class="btn btn-ghost btn-block" data-go="F5">Мои заявки</button>' +
        '</div></div>';
    }
  });
  D.action('cof-ask', el => {
    const pid = el.dataset.arg, p = person(pid), w = P.slots(pid)[0], pt = coffeePoint(pid);
    if (!w || coffeeSent(pid)) { return; }
    const full = P.pendingOut() >= P.LIMITS.outPending;
    confirmSheet({
      title: 'Пригласить на кофе?',
      body: '<div class="ppl-sheet-sum"><div class="ppl-dl">' + sumRow('Кого', p.name + ' · ' + p.company) + sumRow('Когда', P.dayWord(w.day) + ', ' + w.day + ', ' + range(w.label)) + sumRow('Где', pt.name) + sumRow('Откуда заявка', 'Предметный кофе') + '</div></div>' +
        (full ? '<div class="banner warn">' + icon('alert') + '<div class="cap">Лимит ожидающих заявок исчерпан: ' + P.LIMITS.outPending + ' из ' + P.LIMITS.outPending + '.</div></div>'
              : '<div class="ppl-note">Приглашение уйдёт сразу, ответ придёт уведомлением. Заявка живёт ' + P.REQ_TTL_H + ' часов.</div>'),
      ok: 'Пригласить', act: 'cof-do', arg: pid, disabled: full
    });
  });
  D.action('cof-do', el => {
    const pid = el.dataset.arg, p = person(pid), w = P.slots(pid)[0], pt = coffeePoint(pid);
    if (!w || coffeeSent(pid) || P.pendingOut() >= P.LIMITS.outPending) { D.closeSheet(); return; }
    S.meets.push({ id: newMeetId(), kind: 'coffee', who: { type: 'person', id: pid }, day: w.day, start: w.label, dur: 30, space: 'Предметный кофе',
      place: pt.name, table: null, status: 'pending', source: 'Предметный кофе', greeting: 'Приглашаю на короткий предметный кофе.' });
    S.invited[pid] = true;
    D.closeSheet(); D.rerender(); D.toast('Приглашение отправлено: ' + p.name);
  });

  /* ================= F7 «QR-визитка» ================= */

  D.register('F7', {
    tab: 'F1',
    meta: {
      title: 'F7 · QR-визитка',
      role: 'Гость, участник',
      fr: ['FR-PPL-07', 'FR-PROF-08'],
      ac: ['AC-PPL-02'],
      what: [
        'Показ моей визитки как QR и переход к сканированию чужой.',
        'Переключатели «что передавать при сканировании»: имя, компания, Telegram, Instagram, телефон; у каждого поля значение из профиля и уровень видимости из «Приватности» (S7), незаполненное поле недоступно.',
        'Ссылки на «Мои контакты» и на настройки видимости в «Приватности».'
      ],
      rules: [
        'Передаются только включённые поля; скрытые в скан не попадают.',
        'QR живёт 60 секунд и обновляется; скриншот не принимается.',
        'Сканирование создаёт контакт только при согласии второй стороны; экспонент при сканировании видит профиль по вашим настройкам видимости (D-47); если согласие на передачу контактов выключено, показано предупреждение.'
      ],
      depends: ['D-09', 'D-47', 'токены QR']
    },
    html(ctx) {
      const st = ctx.state;
      st.fields = st.fields || { name: true, company: true, tg: true, ig: false, phone: false };
      const f = st.fields;
      const items = [['name', 'Имя и фамилия', 'name', myVal('name')], ['company', 'Компания и должность', 'company', myVal('company')],
        ['tg', 'Telegram', 'telegram', myVal('telegram')], ['ig', 'Instagram', 'instagram', myVal('instagram')], ['phone', 'Телефон', 'telegram', F.ME.phone]];
      const rows = items.map(r => {
        const has = !!r[3], lvl = r[0] === 'phone' ? 'meeting' : myVis(r[2]);
        return '<label class="toggle-row" style="cursor:pointer"><div><div class="tr-title" style="font-weight:600;font-size:14px">' + r[1] + '</div>' +
          '<div class="tr-sub">' + (has ? esc(r[3]) + ' · ' : 'не заполнено · ') + esc(VIS[lvl]) + '</div></div>' +
          '<span class="toggle"><input type="checkbox" data-f7f="' + r[0] + '"' + (has && f[r[0]] ? ' checked' : '') + (has ? '' : ' disabled') + '><span class="tr"></span></span></label>';
      }).join('');
      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: 'Контакты', title: 'Моя визитка', sub: 'Обмен без поиска в каталоге', paren: paren('покажите код или сканируйте чужой') }, backOf('F1'))) +
        '<div class="ppl-body">' +
        '<div class="qr-box"><div class="qr" data-qr="f7" style="width:150px;height:150px"></div>' +
        '<div class="qr-caption">' + esc(F.ME.name) + ' · ' + esc(F.ME.company) + '</div>' +
        '<div class="cap">код обновляется каждые 60 секунд</div></div>' +
        (!myConsent('scan') ? '<div class="banner warn">' + icon('alert') + '<div class="cap"><b>Передача контактов экспонентам выключена.</b> Экспонент при сканировании не получит ваш профиль. <button class="ppl-inline" data-go="L6">Включить в «Приватности»</button></div></div>' : '') +
        (!myConsent('profile') ? '<div class="banner warn">' + icon('alert') + '<div class="cap"><b>Профиль скрыт от участников.</b> Вас нет в каталоге, поэтому при обмене визитками человек увидит только выбранные ниже поля. <button class="ppl-inline" data-go="L6">Изменить в «Приватности»</button></div></div>' : '') +
        '<div class="card"><div class="cap" style="margin-bottom:4px">Что передавать при сканировании</div>' + rows + '</div>' +
        '<div class="banner info">' + icon('eye') + '<div class="cap">Остальные поля видны по уровням видимости, которые вы задали. <button class="ppl-inline" data-go="L6">Настроить в «Приватности»</button></div></div>' +
        '<button class="btn btn-primary btn-block" data-go="J1">Сканировать визитку</button>' +
        '<button class="btn btn-ghost btn-block" data-go="F8">Мои контакты · ' + P.CONTACTS.length + '</button>' +
        '</div></div>';
    },
    mount(host) {
      const el = host.querySelector('[data-qr="f7"]');
      if (el) { el.innerHTML = qrPat('visit-' + F.ME.patronymic, 150); }
      host.querySelectorAll('[data-f7f]').forEach(inp => inp.addEventListener('change', () => {
        D.st('F7').fields[inp.dataset.f7f] = inp.checked;
        D.toast('Передача поля ' + (inp.checked ? 'включена' : 'выключена'));
      }));
    }
  });
  /* код-нативный узор QR (как в L1): декоративный */
  function qrPat(seed, px) {
    const N = 21, cell = px / N;
    let h = 2166136261;
    for (let i = 0; i < seed.length; i++) { h ^= seed.charCodeAt(i); h = Math.imul(h, 16777619); }
    let out = '<rect width="' + px + '" height="' + px + '" fill="#fff"/>';
    const bit = (x, y) => { h = (h * 1103515245 + 12345 + x * 97 + y * 31) >>> 0; return (h >>> 8) % 5 < 2; };
    const finder = (fx, fy) => {
      for (let y = 0; y < 7; y++) {
        for (let x = 0; x < 7; x++) {
          const edge = x === 0 || x === 6 || y === 0 || y === 6, core = x >= 2 && x <= 4 && y >= 2 && y <= 4;
          if (edge || core) { out += '<rect x="' + ((fx + x) * cell).toFixed(1) + '" y="' + ((fy + y) * cell).toFixed(1) + '" width="' + cell.toFixed(1) + '" height="' + cell.toFixed(1) + '"/>'; }
        }
      }
    };
    for (let y = 0; y < N; y++) {
      for (let x = 0; x < N; x++) {
        const inF = (x < 8 && y < 8) || (x > N - 9 && y < 8) || (x < 8 && y > N - 9);
        if (!inF && bit(x, y)) { out += '<rect x="' + (x * cell).toFixed(1) + '" y="' + (y * cell).toFixed(1) + '" width="' + cell.toFixed(1) + '" height="' + cell.toFixed(1) + '"/>'; }
      }
    }
    finder(0, 0); finder(N - 7, 0); finder(0, N - 7);
    return '<svg viewBox="0 0 ' + px + ' ' + px + '" width="' + px + '" height="' + px + '" shape-rendering="crispEdges" aria-label="Демонстрационный QR-узор">' + out + '</svg>';
  }

  /* ================= F8 «Мои контакты» ================= */

  function tagLabel(id) { const t = P.CONTACT_TAGS.filter(x => x.id === id)[0]; return t ? t.label : ''; }
  D.register('F8', {
    tab: 'F1',
    meta: {
      title: 'F8 · Мои контакты',
      role: 'Гость, участник',
      fr: ['FR-PPL-07', 'FR-MEET-11'],
      ac: ['AC-PPL-02'],
      what: [
        'Контакты, собранные за фестиваль: имя, компания, метка следующего шага, заметка, где познакомились, дата напоминания.',
        'Фильтр по меткам «Написать», «Договориться о встрече», «Отправить материалы», «Просто знакомство»; метку можно сменить.',
        'Сохранённые из карточек люди и выгрузка контактов по кнопке.'
      ],
      rules: [
        'Контакт появляется только при взаимном согласии на обмен или после встречи.',
        'Метки и заметки видны только вам и не передаются третьим лицам; метки обозначают следующий шаг, а не оценку человека.',
        'Выгрузка в vCard и CSV выполняется по вашему действию, без фоновой отправки.'
      ],
      depends: ['D-47', 'FR-MEET-11']
    },
    html(ctx) {
      const st = ctx.state;
      st.f = st.f || 'all';
      const chip = (id, label, n) => '<button class="chip' + (st.f === id ? ' on' : '') + '" data-act="f8-filter" data-arg="' + id + '">' + esc(label) + (n != null ? ' · ' + n : '') + '</button>';
      const chips = chip('all', 'Все', P.CONTACTS.length) + P.CONTACT_TAGS.map(t => chip(t.id, t.label, P.CONTACTS.filter(c => c.tag === t.id).length)).join('');
      const list = P.CONTACTS.filter(c => st.f === 'all' || c.tag === st.f);
      const rows = list.map(c => {
        const p = person(c.pid);
        return '<div class="ppl-row"><button class="ppl-main" data-go="F2/' + c.pid + '">' + avatar(p.name, 'sm') +
          '<span class="ppl-t"><span class="ppl-name">' + esc(p.name) + '</span><span class="ppl-role">' + esc(p.role) + ' · ' + esc(p.company) + '</span>' +
          '<span class="ppl-role">' + esc(c.note) + '</span><span class="ppl-role">' + esc(c.when) + '</span></span><span class="ppl-chev">' + icon('chevR') + '</span></button>' +
          '<div class="ppl-tags"><button class="ppl-link" data-act="f8-tag" data-arg="' + c.id + '" aria-label="Метка: ' + esc(tagLabel(c.tag)) + ', сменить">' + icon('list') + 'Метка: ' + esc(tagLabel(c.tag)) + '</button>' +
          (c.remind ? '<span class="tag">' + icon('clock') + esc(c.remind) + '</span>' : '') + '</div></div>';
      }).join('');
      const contactIds = P.CONTACTS.map(c => c.pid);
      const savedIds = Object.keys(S.saved).filter(id => contactIds.indexOf(id) < 0 && person(id));
      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: 'Контакты', title: 'Мои контакты', sub: P.CONTACTS.length + ' ' + plural(P.CONTACTS.length, PEOPLE_FORMS) + ' · по согласию', paren: paren('заметки и метки видны только вам') }, backOf('F1'))) +
        '<div class="chip-rail ppl-links">' + chips + '</div>' +
        '<div class="ppl-body">' +
        (rows ? '<div class="ppl-box"><div class="ppl-list">' + rows + '</div></div>' :
          '<div class="card ppl-empty"><div class="e-title">С такой меткой контактов нет</div><div class="e-text">Выберите другую метку или покажите все контакты.</div><button class="btn btn-secondary btn-sm" data-act="f8-filter" data-arg="all">Показать все</button></div>') +
        (savedIds.length ? '<div class="ppl-sec">Сохранённые</div><div class="ppl-box"><div class="ppl-list">' + savedIds.map(id => personRow(person(id), { why: 'сохранён вами из карточки' })).join('') + '</div></div>' : '') +
        '<button class="btn btn-secondary btn-block" data-act="f8-export">' + icon('download') + 'Выгрузить контакты</button>' +
        '<button class="btn btn-ghost btn-block" data-go="M6">Контакты после события</button>' +
        '</div></div>';
    }
  });
  D.action('f8-filter', el => { D.st('F8').f = el.dataset.arg; D.rerender(); });
  D.action('f8-export', () => D.toast('Файл контактов сформирован (в демо загрузка не выполняется)'));
  D.action('f8-tag', el => {
    const c = P.CONTACTS.filter(x => x.id === el.dataset.arg)[0], p = person(c.pid);
    D.openSheet('<div class="sheet-title">Метка</div><div class="ppl-note" style="margin-bottom:6px">' + esc(p.name) + ': что дальше. Метка видна только вам.</div><div class="ppl-opts">' +
      P.CONTACT_TAGS.map(t => '<button class="ppl-opt' + (c.tag === t.id ? ' on' : '') + '" data-act="f8-tag-set" data-arg="' + c.id + '|' + t.id + '"><span>' + esc(t.label) + '</span>' + (c.tag === t.id ? icon('check') : '') + '</button>').join('') + '</div>');
  });
  D.action('f8-tag-set', el => {
    const a = el.dataset.arg.split('|'), c = P.CONTACTS.filter(x => x.id === a[0])[0];
    c.tag = a[1]; D.closeSheet(); D.rerender(); D.toast('Метка: ' + tagLabel(c.tag));
  });

  /* ================= F9 «Спикеры» ================= */

  function f9ListHTML(f) {
    const q = P.norm(f.q || '');
    let keys = Object.keys(F.SPEAKERS);
    if (f.lever !== 'all') { keys = keys.filter(k => F.SPEAKERS[k].lever === f.lever); }
    if (q) { keys = keys.filter(k => { const p = F.SPEAKERS[k]; return P.norm(p.name + ' ' + p.company + ' ' + p.role).indexOf(q) >= 0; }); }
    keys.sort((a, b) => F.SPEAKERS[a].name.localeCompare(F.SPEAKERS[b].name, 'ru'));
    if (!keys.length) {
      return '<div class="card ppl-empty"><div class="e-title">Никого не нашли</div><div class="e-text">Измените запрос или снимите фильтр рычага.</div></div>';
    }
    return '<div class="ppl-count"><span>' + keys.length + ' ' + plural(keys.length, PEOPLE_FORMS) + '</span></div><div class="ppl-box"><div class="list">' + keys.map(k => {
      const p = F.SPEAKERS[k], ns = F.speakerSessions(k).length, mw = F.mentorWindows(k).length;
      return '<button class="row clickable" data-go="C5/' + k + '">' + avatar(p.name, 'sm') + '<div class="grow">' +
        '<div class="r-title">' + esc(p.name) + (mw ? ' <span class="tag">ментор</span>' : '') + '</div>' +
        '<div class="r-sub">' + esc(p.role) + ' · ' + esc(p.company) + '</div>' +
        '<div class="sess-meta" style="margin-top:4px"><span class="tag accent">' + esc(p.lever || '') + '</span>' +
        '<span class="cap">' + ns + ' ' + plural(ns, ['сессия', 'сессии', 'сессий']) + ' · ' + (mw ? mw + ' ' + plural(mw, ['окно', 'окна', 'окон']) + ' менторства' : 'без менторства') + '</span></div></div>' + icon('chevR') + '</button>';
    }).join('') + '</div></div>';
  }
  D.register('F9', {
    tab: 'F1',
    meta: {
      title: 'F9 · Спикеры',
      role: 'Гость, участник',
      fr: ['FR-PROG-07', 'FR-PPL-01', 'FR-PPL-11'],
      ac: ['AC-PPL-07'],
      what: [
        'Сегмент «Спикеры» вкладки «Участники»: имя, роль, компания, рычаг, число сессий и менторских окон.',
        'Менторы отмечены тегом; запись к ментору — в карточке спикера (C5) и в виде «Менторские» (D1). В подзаголовке: сколько менторов и сколько менторских окон (по данным окон, а не по числу менторов).',
        'Поиск по имени, компании и роли; фильтр по рычагам; тот же ряд ссылок, что на F1.'
      ],
      rules: [
        'Спикер без сессий не показывается: каталог строится по связям с программой.',
        'Оптимум в деловой программе не выступает (D-41): спикеров этого тарифа в демо нет.',
        'Все люди и компании вымышленные.'
      ],
      depends: ['D-36', 'D-41']
    },
    html(ctx) {
      const st = ctx.state;
      const f = st.f || (st.f = { lever: 'all', q: '' });
      const chips = ['all'].concat(F.LEVERS).map(l =>
        '<button class="chip' + (f.lever === l ? ' on' : '') + '" data-act="f9-lever" data-arg="' + esc(l) + '">' + (l === 'all' ? 'Все рычаги' : esc(l)) + '</button>').join('');
      const keys = Object.keys(F.SPEAKERS), n = keys.length;
      const mentors = keys.filter(k => F.mentorWindows(k).length).length, wins = keys.reduce((a, k) => a + F.mentorWindows(k).length, 0);
      return '<div class="scr">' +
        D.head({ eyebrow: 'Участники', title: 'Спикеры', sub: n + ' ' + plural(n, PEOPLE_FORMS) + ' · ' + mentors + ' ' + plural(mentors, ['ментор', 'ментора', 'менторов']) + ', ' + wins + ' ' + plural(wins, ['окно', 'окна', 'окон']), paren: paren('запись к ментору: в карточке спикера') }) +
        D.segbar(SEG, 'F9') + linksRail() +
        '<div class="ppl-body">' +
        '<div class="ppl-search">' + icon('search') + '<input class="input" type="search" id="f9-q" placeholder="Имя, компания, роль" value="' + esc(f.q || '') + '" aria-label="Поиск спикера"></div>' +
        '<div class="chip-rail ppl-flt">' + chips + '</div>' +
        '<div class="ppl-wrap" id="f9-wrap">' + f9ListHTML(f) + '</div>' +
        '</div></div>';
    },
    mount(host) {
      const inp = host.querySelector('#f9-q');
      if (inp) {
        inp.addEventListener('input', () => {
          const f = D.st('F9').f; f.q = inp.value;
          const w = host.querySelector('#f9-wrap'); if (w) { w.innerHTML = f9ListHTML(f); }
        });
      }
    }
  });
  D.action('f9-lever', el => { D.st('F9').f.lever = el.dataset.arg; D.rerender(); });
})();
