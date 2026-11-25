/* Ядро демо: иконки, помощники, реестр экранов, маршрутизация, тема, оболочка. */
(function () {
  'use strict';

  /* ---------- линейные иконки 1.75 px ---------- */
  const ICONS = {
    today: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/>',
    program: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/><path d="M7.5 14h5M7.5 17h3.5"/>',
    people: '<circle cx="9" cy="8.2" r="3.1"/><path d="M3.4 19.2c.6-3 2.7-4.6 5.6-4.6s5 1.6 5.6 4.6"/><circle cx="16.7" cy="9" r="2.3"/><path d="M15.9 14.8c2.4.2 4.1 1.6 4.7 4.2"/>',
    expo: '<path d="M4.5 9.5 6 4.5h12l1.5 5"/><path d="M4.5 9.5V19a1 1 0 0 0 1 1h13a1 1 0 0 0 1-1V9.5"/><path d="M4.5 9.5h15"/><path d="M9.5 20v-5h5v5"/>',
    more: '<circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
    ticket: '<path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5V9a2.5 2.5 0 0 0 0 5v1.5a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 15.5V14a2.5 2.5 0 0 0 0-5z"/><path d="M14 5v14" stroke-dasharray="2 3.5"/>',
    route: '<circle cx="5.5" cy="18.5" r="2.2"/><circle cx="18.5" cy="5.5" r="2.2"/><path d="M7.5 18.5h5.2a3.6 3.6 0 0 0 0-7.2H9.8a3.6 3.6 0 0 1 0-7.2h5.2"/>',
    pin: '<path d="M12 21s-6.3-5.2-6.3-10.4a6.3 6.3 0 0 1 12.6 0C18.3 15.8 12 21 12 21z"/><circle cx="12" cy="10.6" r="2.1"/>',
    bell: '<path d="M6 9.5a6 6 0 0 1 12 0c0 4.8 1.8 5.8 1.8 5.8H4.2S6 14.3 6 9.5"/><path d="M10 19a2.1 2.1 0 0 0 4 0"/>',
    search: '<circle cx="11" cy="11" r="6.5"/><path d="M20 20l-4.2-4.2"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    star: '<path d="M12 4l2.5 5.1 5.6.8-4 3.9 1 5.6-5.1-2.7-5.1 2.7 1-5.6-4-3.9 5.6-.8z"/>',
    bookmark: '<path d="M7.5 4.5h9a1 1 0 0 1 1 1v14.5l-5.5-3.4-5.5 3.4V5.5a1 1 0 0 1 1-1z"/>',
    qr: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.2"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.2"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.2"/><path d="M13.5 13.5h3v3h-3zM20 13.5v.01M13.5 20h.01M17 17h3v3h-3z"/>',
    scan: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><path d="M4 12h16" opacity=".45"/>',
    check: '<path d="M4.5 12.5l5 5L19.5 7"/>',
    x: '<path d="M6 6l12 12M18 6L6 18"/>',
    chevR: '<path d="M9 5l7 7-7 7"/>',
    chevL: '<path d="M15 5l-7 7 7 7"/>',
    back: '<path d="M19 12H5M11 6l-6 6 6 6"/>',
    calendar: '<rect x="3.5" y="5" width="17" height="15.5" rx="2"/><path d="M3.5 10h17M8 3v4M16 3v4"/>',
    download: '<path d="M12 4v10.5M8 10.5l4 4 4-4M4.5 19.5h15"/>',
    share: '<circle cx="6" cy="12" r="2.5"/><circle cx="17.5" cy="5.5" r="2.5"/><circle cx="17.5" cy="18.5" r="2.5"/><path d="M8.2 10.8l6.8-3.8M8.2 13.2l6.8 3.8"/>',
    cog: '<circle cx="12" cy="12" r="3"/><path d="M12 2.8v2.3M12 18.9v2.3M2.8 12h2.3M18.9 12h2.3M5.5 5.5l1.6 1.6M16.9 16.9l1.6 1.6M18.5 5.5l-1.6 1.6M7.1 16.9l-1.6 1.6"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.9.7c0 1.7-2.5 2-2.5 3.7"/><path d="M12 17.3h.01"/>',
    msg: '<path d="M21 12a8 8 0 0 1-8 8H4.5L6 16.6A8 8 0 1 1 21 12z"/>',
    spark: '<path d="M12 3.5l1.7 5 5 1.7-5 1.7L12 17.4l-1.7-5.5-5-1.7 5-1.7z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>',
    building: '<rect x="5" y="3.5" width="14" height="17.5" rx="1"/><path d="M9 7.5h2M13 7.5h2M9 11.5h2M13 11.5h2M9 15.5h2M13 15.5h2M10.5 21v-3h3v3"/>',
    briefcase: '<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3.5 12.5h17"/>',
    layers: '<path d="M12 3.5l8.5 4.7-8.5 4.7-8.5-4.7z"/><path d="M4 12.8l8 4.4 8-4.4M4 16.8l8 4.4 8-4.4"/>',
    list: '<path d="M8.5 6h12M8.5 12h12M8.5 18h12"/><circle cx="4.2" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.2" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.2" cy="18" r="1.2" fill="currentColor" stroke="none"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    theme: '<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor" stroke="none"/>',
    lock: '<rect x="5.5" y="10.5" width="13" height="9.5" rx="2"/><path d="M8.5 10.5V8a3.5 3.5 0 0 1 7 0v2.5"/>',
    eye: '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>',
    phone: '<path d="M6.5 3.5h3l1.5 4.5-2 1.5a12.5 12.5 0 0 0 5.5 5.5l1.5-2 4.5 1.5v3a2 2 0 0 1-2.2 2A16.5 16.5 0 0 1 4.5 5.7 2 2 0 0 1 6.5 3.5z"/>',
    mail: '<rect x="3" y="5.5" width="18" height="13" rx="2"/><path d="M3.5 7.5l8.5 6 8.5-6"/>',
    send: '<path d="M21 3L10.5 13.5M21 3l-6.5 18-4-7.5-7.5-4z"/>',
    refresh: '<path d="M4 10a8 8 0 0 1 13.8-4.6L20 8M20 4v4h-4M20 14a8 8 0 0 1-13.8 4.6L4 16M4 20v-4h4"/>',
    file: '<path d="M6 3h8l4 4v14H6z"/><path d="M14 3v4h4M9 12h6M9 16h6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    minus: '<path d="M5 12h14"/>',
    filter: '<path d="M4 5.5h16l-6.2 7.2v5.3l-3.6-1.9v-3.4z"/>',
    logout: '<path d="M14 4H6a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h8M10.5 12h10M17.5 8.5L21 12l-3.5 3.5"/>',
    alert: '<path d="M12 4L2.8 19.5h18.4z"/><path d="M12 10v4.5M12 17.5h.01"/>',
    info: '<circle cx="12" cy="12" r="8.5"/><path d="M12 11v5M12 7.8h.01"/>',
    arrowUR: '<path d="M7 17L17 7M9.5 7H17v7.5"/>',
    inbox: '<path d="M4 13.5 6.5 6.5h11L20 13.5V18a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 18z"/><path d="M4 13.5h4.5l1.5 2h4l1.5-2H20"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M2.5 12h2M19.5 12h2M5 5l1.4 1.4M17.6 17.6L19 19M19 5l-1.4 1.4M6.4 17.6L5 19"/>',
    moon: '<path d="M20 13.8A8.2 8.2 0 1 1 10.2 4a6.6 6.6 0 0 0 9.8 9.8z"/>',
    map: '<path d="M9 4.5 3.5 6.3v13.4L9 17.9l6 2.3 5.5-1.8V5.2L15 7 9 4.5z"/><path d="M9 4.5v13.4M15 7v13.4"/>',
    userPlus: '<circle cx="10" cy="8" r="3.4"/><path d="M4 19.5c.6-3.2 3-4.9 6-4.9s5.4 1.7 6 4.9"/><path d="M18.5 8v5.5M21 10.7h-5"/>',
    scanFace: '<path d="M4 8V5.5A1.5 1.5 0 0 1 5.5 4H8M16 4h2.5A1.5 1.5 0 0 1 20 5.5V8M20 16v2.5a1.5 1.5 0 0 1-1.5 1.5H16M8 20H5.5A1.5 1.5 0 0 1 4 18.5V16"/><circle cx="12" cy="11" r="2.4"/><path d="M8.5 16.5c.8-1.8 2-2.6 3.5-2.6s2.7.8 3.5 2.6"/>',
    user: '<circle cx="12" cy="8" r="3.6"/><path d="M5 20c.7-3.4 3.4-5.2 7-5.2s6.3 1.8 7 5.2"/>',
    play: '<path d="M8 5.5v13l11-6.5z"/>',
    pause: '<path d="M8.5 5.5v13M15.5 5.5v13"/>',
    chat: '<path d="M21 12a8 8 0 0 1-8 8H4.5L6 16.6A8 8 0 1 1 21 12z"/><path d="M8.5 11h7M8.5 14h4.5"/>',
    card: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M3.5 10h17M7 15h4"/>',
    wifi: '<path d="M4.5 10.5a11 11 0 0 1 15 0M7.5 13.5a7 7 0 0 1 9 0M10.5 16.4a3.4 3.4 0 0 1 3 0"/><circle cx="12" cy="19" r="1" fill="currentColor" stroke="none"/>',
    battery: '<rect x="2.5" y="8" width="17" height="8.5" rx="2"/><path d="M21.5 11v2.5"/><rect x="5" y="10.5" width="9" height="3.5" rx="1" fill="currentColor" stroke="none"/>',
    signal: '<path d="M4 17v-3M8.5 17v-6M13 17V8M17.5 17V5"/>',
    chevD: '<path d="M6 9.5l6 6 6-6"/>',
    minusCircle: '<circle cx="12" cy="12" r="8.5"/><path d="M8.5 12h7"/>',
    dot: '<circle cx="12" cy="12" r="4" fill="currentColor" stroke="none"/>',
    heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>',
    menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
    market: '<path d="M4.5 10.5 6 4.5h12l1.5 6"/><path d="M4.5 10.5 5.7 19a1.2 1.2 0 0 0 1.2 1h10.2a1.2 1.2 0 0 0 1.2-1l1.2-8.5"/><path d="M4.5 10.5h15"/><path d="M9.5 20v-4.5h5V20"/>',
    feed: '<path d="M3 12h4.2l1.8-5.5 3.6 11 2-7.5 1.4 2H21"/>',
    mic: '<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3M9 21h6"/>',
    chart: '<path d="M4.5 4v15.5H20"/><path d="M8.5 15.5v-4M12.5 15.5V8M16.5 15.5v-6.5"/>',
    link: '<path d="M10.5 13.5a3.8 3.8 0 0 0 5.4.4l2.6-2.6a3.8 3.8 0 0 0-5.4-5.4l-1.1 1.1"/><path d="M13.5 10.5a3.8 3.8 0 0 0-5.4-.4l-2.6 2.6a3.8 3.8 0 0 0 5.4 5.4l1.1-1.1"/>',
    sparkle: '<path d="M12 3.5l1.7 5 5 1.7-5 1.7L12 17.4l-1.7-5.5-5-1.7 5-1.7z"/><path d="M18.5 15.5l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z"/>'
  };

  function icon(name, cls) {
    const inner = ICONS[name] || ICONS.dot;
    return '<svg class="ic' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + inner + '</svg>';
  }

  /* ---------- помощники ---------- */
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function initials(name) {
    const parts = String(name).trim().split(/\s+/);
    return ((parts[0] || '')[0] || '') + ((parts[1] || '')[0] || '');
  }
  const avatar = (name, cls) => '<span class="avatar' + (cls ? ' ' + cls : '') + '" aria-hidden="true">' + esc(initials(name)) + '</span>';

  const paren = t => '<span class="paren">( ' + esc(t) + ' )</span>';
  function plural(n, forms) {
    const a = Math.abs(n) % 100, b = a % 10;
    if (a > 10 && a < 20) return forms[2];
    if (b > 1 && b < 5) return forms[1];
    if (b === 1) return forms[0];
    return forms[2];
  }

  /* ---------- общая шапка экрана (решение 16.11, оболочка v3) ----------
     Строка приложения 56 px: на корневых экранах слева кнопка меню, на вложенных —
     «назад» (data-go, backAct или backHist для карты); справа карта (только корневые),
     уведомления и аватар кабинета. Далее блок заголовка в полях 20 px:
     надпись-ориентир → заголовок Bebas → поясняющая строка → paren. */
  function head(o) {
    o = o || {};
    const isRoot = o.root || ROOT_SCREENS[CURRENT] || false;
    const backBtn = attr =>
      '<button class="icon-btn" ' + attr + ' aria-label="Назад">' + icon('back') + '</button>';
    const left = o.back ? backBtn('data-go="' + esc(o.back) + '"')
      : o.backAct ? backBtn('data-act="' + esc(o.backAct) + '"')
      : o.backHist ? backBtn('data-act="nav-back"')
      : isRoot
        ? '<button class="icon-btn" data-act="menu-open" aria-label="Меню">' + icon('menu') + '</button>'
        : '<span class="appbar-gap"></span>';
    const rightIcons = (o.right || '') +
      (isRoot ? '<button class="icon-btn" data-go="E1" aria-label="Карта">' + icon('map') + '</button>' : '') +
      (o.noBell ? '' : '<button class="icon-btn" data-go="B3" aria-label="Уведомления">' + icon('bell') + '</button>') +
      '<button class="icon-btn" data-go="L0" aria-label="Кабинет">' + icon('user') + '</button>';
    let h = '<div class="appbar"><div class="appbar-l">' + left + '</div>' +
      '<div class="appbar-r">' + rightIcons + '</div></div>';
    h += '<div class="head-txt">' +
      (o.eyebrow ? '<div class="eyebrow">' + o.eyebrow + '</div>' : '') +
      '<h1>' + (o.title || '') + '</h1>' +
      (o.sub ? '<div class="sub">' + o.sub + '</div>' : '') +
      '</div>';
    if (o.paren) h += '<div class="head-paren">' + o.paren + '</div>';
    if (o.actions) h += '<div class="head-actions">' + o.actions + '</div>';
    if (o.topo) return '<div class="head-topo topo-host">' + h + topo() + '</div>';
    return h;
  }
  /* переключатель сегментов/видов на всю ширину внутри полей 20 px */
  function segbar(items, active, attr) {
    return '<div class="segbar">' + items.map(it =>
      '<button class="seg' + (it[0] === active ? ' on' : '') + '" ' + (attr || 'data-go') + '="' + esc(it[0]) + '">' + esc(it[1]) + '</button>'
    ).join('') + '</div>';
  }
  /* чип-лента: начинается на поле 20 px и прокручивается вправо */
  function chipRail(inner) { return '<div class="chip-rail">' + inner + '</div>'; }

  /* топографические линии фоном (цвет и прозрачность — из токенов --topo/--topo-alpha) */
  const topo = () => '<div class="topo-bg" aria-hidden="true"></div>';
  /* дорожная пиктограмма как декоративный знак (не больше одной на экран) */
  const pict = (name, style) =>
    '<img class="pict-deco" src="assets/svg/' + esc(name) + '.svg" alt="" aria-hidden="true" style="' + (style || '') + '">';
  const logoImg = (cls) =>
    '<span class="logo-img' + (cls ? ' ' + cls : '') + '" role="img" aria-label="Атланты Сити"></span>';

  const tag = (t, cls) => '<span class="tag' + (cls ? ' ' + cls : '') + '">' + esc(t) + '</span>';

  const tariffTag = t => tag(t, 'tariff');

  const goBtn = (id, label, cls, ic) =>
    '<button class="btn ' + (cls || 'btn-ghost') + '" data-go="' + esc(id) + '">' + (ic ? icon(ic) : '') + esc(label) + '</button>';

  /* ---------- состояние и действия ---------- */
  const STATE = {};           // STATE[screenId] — эфемерное состояние экрана
  const st = id => STATE[id] || (STATE[id] = {});
  const IHIST = [];           // внутренний стек hash-маршрутов внутри приложения (для nav-back)
  const SCR_POS = {};         // hash -> {y, rails:[scrollLeft,...]} — память прокрутки по маршрутам
  /* Направление перехода по Navigation API: location.hash= и history.back() оба
     стреляют popstate+hashchange, различить их можно только по индексу записи
     истории — при возврате назад индекс меньше предыдущего. */
  const NAV_API = (typeof window !== 'undefined' && window.navigation) ? window.navigation : null;
  let LAST_NAV_IDX = (NAV_API && NAV_API.currentEntry) ? NAV_API.currentEntry.index : null;
  let LAST_ACT_EL = null;     // последний кликнутый элемент с data-act/data-go (возврат фокуса из листа)
  let LAST_ROUTE = null;      // {id, param} — для сохранения прокрутки .scr при перерисовке того же экрана
  let APPLIED_SCR_Y = 0;      // scrollTop .scr, применённый route() до R.mount — для restoreScroll() экранов

  const ACTS = {};            // ACTS[name] = fn(el, ev)
  function act(name, arg, extra) {
    return ' data-act="' + name + '"' + (arg != null ? ' data-arg="' + esc(arg) + '"' : '') + (extra || '');
  }

  /* ---------- лист (bottom sheet) и тост ---------- */
  function frameEl() { return document.querySelector('.frame'); }
  let SHEET_RETURN = null;    // элемент, вернувший фокус после закрытия листа
  function openSheet(html, opts) {
    const fr = frameEl(); if (!fr) return;
    closeSheet();
    const wrap = document.createElement('div');
    wrap.className = 'sheet-wrap';
    wrap.innerHTML = '<div class="sheet-scrim" data-act="sheet-close"></div><div class="sheet" role="dialog" aria-modal="true">' +
      '<div class="sheet-grip"></div>' + html + '</div>';
    fr.appendChild(wrap);
    document.body.classList.add('sheet-open');
    if (opts && opts.mount) opts.mount(wrap);
    a11yify(wrap);
    const sheet = wrap.querySelector('.sheet');
    if (sheet && !sheet.hasAttribute('tabindex')) { sheet.setAttribute('tabindex', '-1'); }
    SHEET_RETURN = (LAST_ACT_EL && LAST_ACT_EL.isConnected) ? LAST_ACT_EL : document.activeElement;
    /* ловушка фокуса: Tab/Shift+Tab циклится внутри листа */
    wrap.addEventListener('keydown', ev => {
      if (ev.key !== 'Tab' || !sheet) { return; }
      const f = [...wrap.querySelectorAll('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])')]
        .filter(e => !e.disabled && e.getClientRects().length);
      if (!f.length) { ev.preventDefault(); sheet.focus(); return; }
      const first = f[0], last = f[f.length - 1];
      if (ev.shiftKey ? document.activeElement === first || !wrap.contains(document.activeElement)
                      : document.activeElement === last || !wrap.contains(document.activeElement)) {
        ev.preventDefault();
        (ev.shiftKey ? last : first).focus();
      }
    });
    setTimeout(() => {
      if (!wrap.isConnected || !sheet) { return; }
      if (sheet.contains(document.activeElement)) { return; }  // mount уже поставил фокус
      const f = wrap.querySelector('button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])');
      (f || sheet).focus();
    }, 0);
  }
  function closeSheet() {
    const w = document.querySelector('.sheet-wrap'); if (w) { w.remove(); }
    document.body.classList.remove('sheet-open');
    const r = SHEET_RETURN; SHEET_RETURN = null;
    if (r && r.isConnected && r !== document.body && r.focus) {
      try { r.focus({ preventScroll: true }); } catch (e) { try { r.focus(); } catch (e2) { /* noop */ } }
    }
  }
  /* Хелпер для экранов, которые сами возвращают прокрутку в mount (напр. R7):
     ставит .scr в позицию, которую route() применил для этого рендера. */
  function restoreScroll(root) {
    const sc = root && root.querySelector ? root.querySelector('.scr')
      : (root && root.classList && root.classList.contains('scr') ? root : document.querySelector('.scr'));
    if (sc) { sc.scrollTop = APPLIED_SCR_Y; }
  }
  window.restoreScroll = restoreScroll;

  /* Последний тост живёт в TOAST и переживает перерисовку #app: route() вызывает paintToast
     с оставшимся временем. Элемент .toast создаётся заново внутри новой рамки. */
  let TOAST = null; /* {msg, ms, at} — момент показа, срок и текст */
  function paintToast(fr) {
    if (!TOAST || !fr) return;
    const left = TOAST.ms - (Date.now() - TOAST.at);
    if (left <= 0) { TOAST = null; return; }
    let t = fr.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.setAttribute('aria-live', 'polite'); fr.appendChild(t); }
    t.innerHTML = icon('check') + '<span>' + esc(TOAST.msg) + '</span>' +
      (TOAST.act ? (TOAST.act.go
        ? '<a class="toast-act" href="#/' + esc(TOAST.act.go) + '">' + esc(TOAST.act.label) + '</a>'
        : '<button type="button" class="toast-act" data-act="' + esc(TOAST.act.act) + '"' +
          (TOAST.act.arg != null ? ' data-arg="' + esc(TOAST.act.arg) + '"' : '') +
          (TOAST.act.id != null ? ' data-id="' + esc(TOAST.act.id) + '"' : '') + '>' + esc(TOAST.act.label) + '</button>') : '');
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), left);
  }
  function toast(msg, ms, act) {
    const fr = frameEl(); if (!fr) return;
    TOAST = { msg: msg, ms: ms || (act ? 6000 : 4000), at: Date.now(), act: act || null };
    paintToast(fr);
  }

  function rerender() { route(true); }

  /* ---------- каталог экранов (144 экрана, инвентарь 04_REBUILD_V3.md, часть 4) ----------
     level: 1 — основной, 2 — вложенный. Порядок блоков — как в инвентаре (K перед I и J). */
  const BLOCKS = [
    { id: 'A', name: 'Вход и онбординг', items: [
      ['A1', 'Приветствие', 1, 0], ['A2', 'Контакт', 2, 0], ['A3', 'Код', 2, 0],
      ['A4', 'Согласия', 1, 0], ['A5', 'Установка на экран', 2, 0], ['A6', 'Как работает приложение', 1, 0],
      ['A7', 'Telegram', 2, 0], ['A8', 'Шаг 1 из 3: кто вы', 1, 0], ['A9', 'Шаг 2 из 3: цель', 1, 0],
      ['A10', 'Шаг 3 из 3: запрос', 1, 0], ['A11', 'Ваш первый путь', 1, 0], ['A12', 'Усилить путь', 2, 0],
      ['A13', 'Ваш питч для интро', 2, 0], ['A14', 'Уточняющие вопросы', 2, 0]] },
    { id: 'Z', name: 'Оболочка', items: [
      ['Z1', 'Меню', 1, 0], ['Z2', 'Поиск по всему', 2, 0]] },
    { id: 'B', name: 'Мой путь', items: [
      ['B1', 'Мой путь', 1, 0], ['B3', 'Настройки уведомлений', 1, 0], ['B4', 'Таймлайн дня', 1, 0],
      ['B5', 'Версии пути', 1, 0], ['B6', 'Заменить пункт', 2, 0], ['B7', 'Конфликты и переходы', 2, 0],
      ['B8', 'Дайджест дня', 2, 0]] },
    { id: 'N', name: 'ИИ-помощники', items: [
      ['N1', 'Ассистент', 1, 0], ['N2', 'Штурман: запрос', 2, 0], ['N3', 'Штурман: маршруты', 1, 0],
      ['N4', 'Секретарь', 1, 0], ['N5', 'Подборщик', 2, 0], ['N6', 'Люди для знакомства', 1, 0],
      ['N7', 'Хроникёр', 2, 0], ['N8', 'Почему это в вашем пути', 2, 0]] },
    { id: 'C', name: 'Программа', items: [
      ['C1', 'Вся программа', 1, 0], ['C2', 'Фильтры', 2, 0], ['C3', 'Карточка сессии', 1, 0],
      ['C4', 'Избранное', 1, 0], ['C5', 'Спикер', 2, 0], ['C6', 'Изменение расписания', 2, 0],
      ['C7', 'Сетка программы', 1, 0]] },
    { id: 'D', name: 'Записи', items: [
      ['D1', 'Менторские', 1, 0], ['D2', 'Подтверждение записи', 1, 0], ['D3', 'Лист ожидания', 2, 0],
      ['D4', 'Недоступно по тарифу', 1, 0], ['D5', 'Мои записи', 2, 0], ['D6', 'Освободилось место', 2, 0]] },
    { id: 'E', name: 'Карта', items: [
      ['E1', 'План Завидово', 1, 0], ['E2', 'План этажа', 2, 0], ['E3', 'Точка', 2, 0],
      ['E4', 'Маршрут', 1, 0], ['E5', 'Мой маршрут', 2, 0], ['E6', 'Бухта', 2, 0], ['E7', 'Вид сверху', 2, 0]] },
    { id: 'F', name: 'Участники', items: [
      ['F1', 'Участники', 1, 0], ['F2', 'Карточка человека', 1, 0], ['F3', 'Заявка на знакомство', 1, 0],
      ['F4', 'Входящие заявки', 1, 0], ['F5', 'Исходящие', 2, 0], ['F6', 'Предметный кофе', 1, 0],
      ['F7', 'QR-визитка', 2, 0], ['F8', 'Мои контакты', 2, 0], ['F9', 'Спикеры', 1, 0],
      ['F10', 'Подборка по запросу', 1, 0], ['F11', 'Хочу встретиться', 2, 0], ['F12', 'Компания участника', 2, 0]] },
    { id: 'G', name: 'Встречи', items: [
      ['G1', 'Встречи: хаб', 1, 0], ['G2', 'Выбор окна', 1, 0], ['G3', 'Заявка на встречу', 1, 0],
      ['G4', 'Встреча подтверждена', 1, 0], ['G5', 'Другое время', 2, 0], ['G6', 'Напоминание', 2, 0],
      ['G7', 'Отметка прихода', 2, 0], ['G8', 'Исход встречи', 1, 0], ['G9', 'Договорённость', 1, 0],
      ['G10', 'Hosted Buyer', 1, 0], ['G11', 'Нет окон', 2, 0]] },
    { id: 'H', name: 'Маркетплейс', items: [
      ['H1', 'Решения', 1, 0], ['H2', 'Карточка решения', 1, 0], ['H3', 'Мой список «Изучить»', 1, 0],
      ['H4', 'Маршрут по Экспо', 1, 0], ['H5', 'КипяTALK', 1, 0], ['H6', 'Предложения', 2, 0],
      ['H7', 'Отметка стенда', 2, 0], ['H8', 'Экспо: стенды и зоны', 1, 0], ['H9', 'Продукты участников', 2, 0],
      ['H10', 'Продукт участника', 2, 0]] },
    { id: 'K', name: 'Партнёры', items: [
      ['K1', 'Партнёры по статусам', 2, 0], ['K2', 'Карточка партнёра', 2, 0],
      ['K3', 'Предложение', 2, 0], ['K4', 'Мои предложения', 2, 0]] },
    { id: 'I', name: 'Кабинет экспонента', items: [
      ['I1', 'Кабинет экспонента: главная', 1, 0], ['I2', 'Контакты', 1, 0], ['I3', 'Карточка контакта', 2, 0],
      ['I4', 'Команда и квота', 2, 0], ['I5', 'Доступность', 2, 0], ['I6', 'Воркшоп', 2, 0],
      ['I7', 'Заявки', 2, 0], ['I8', 'Аналитика', 1, 0], ['I9', 'Карточка решения (редактор)', 2, 0],
      ['I10', 'Мои посты и предложения', 1, 0]] },
    { id: 'J', name: 'Сканер контактов', items: [
      ['J1', 'Сканер', 1, 0], ['J2', 'Результат с согласием', 1, 0], ['J3', 'Результат без согласия', 1, 0],
      ['J4', 'Метки и заметка', 2, 0], ['J5', 'Офлайн-очередь', 2, 0], ['J6', 'Кто меня сканировал', 2, 0]] },
    { id: 'R', name: 'Лента и чаты', items: [
      ['R1', 'Лента', 1, 0], ['R2', 'Настройка ленты', 2, 0], ['R3', 'Новая запись', 1, 0],
      ['R4', 'Карточка записи', 1, 0], ['R5', 'Мой чат', 1, 0], ['R6', 'Чат встречи', 1, 0],
      ['R7', 'Создать чат встречи', 2, 0]] },
    { id: 'L', name: 'Билет и кабинет', items: [
      ['L0', 'Кабинет', 1, 0], ['L1', 'Билет', 1, 0], ['L2', 'PDF-приглашение', 2, 0],
      ['L3', 'Оплата', 2, 0], ['L4', 'Проживание', 2, 0], ['L5', 'Семья и команда', 2, 0],
      ['L6', 'Приватность', 1, 0], ['L7', 'Профиль', 1, 0], ['L8', 'Цели и запросы', 1, 0],
      ['L9', 'Как пользоваться', 2, 0], ['L10', 'Кодекс участника', 2, 0], ['L11', 'Вопросы и ответы', 2, 0]] },
    { id: 'M', name: 'Заметки и итоги', items: [
      ['M1', 'Заметки', 2, 0], ['M2', 'Заметка в сессии', 2, 0], ['M3', 'Оцените день', 1, 0],
      ['M4', 'Мои итоги', 1, 0], ['M5', 'Дорожная карта на полгода', 2, 0], ['M6', 'Контакты после события', 2, 0]] },
    { id: 'O', name: 'Допуск (команда)', items: [
      ['O1', 'Сканер допуска', 1, 0], ['O2', 'Поиск гостя', 2, 0], ['O3', 'Закрытая сессия', 2, 0],
      ['O4', 'Статистика допуска', 2, 0], ['O5', 'Сканер зала: вход и выход', 1, 0]] },
    { id: 'P', name: 'Консоль (рабочий стол)', items: [
      ['P1', 'Табло встреч', 1, 0], ['P2', 'Очередь аккредитации', 1, 0], ['P3', 'Консоль уведомлений', 1, 0],
      ['P4', 'Дашборд', 1, 0], ['P5', 'Параметры', 2, 0], ['P6', 'Синхронизация программы', 2, 0],
      ['P7', 'Оценки спикеров', 2, 0], ['P8', 'План-факт путей', 2, 0], ['P9', 'Модерация: лента, интро, чаты', 1, 0],
      ['P10', 'ИИ: режимы, лимиты, бюджет', 2, 0]] }
  ];

  const ALL_SCREENS = [];
  BLOCKS.forEach(b => b.items.forEach(([id, title, level, phaseA]) =>
    ALL_SCREENS.push({ id, title, block: b.id, blockName: b.name, level, phaseA: !!phaseA })));
  const screenInfo = id => ALL_SCREENS.find(s => s.id === id);
  const phaseACount = ALL_SCREENS.filter(s => s.phaseA).length;

  /* ---------- реестр реализаций ---------- */
  const RENDERERS = {};   // id -> {html(ctx), meta, tab, mount?}
  const ACTSREG = {};     // name -> fn(el)

  /* ---------- тема ---------- */
  const THEME_KEY = 'atlanty-demo-theme';
  function currentTheme() { return document.documentElement.getAttribute('data-theme') || 'summer'; }
  function setTheme(t, animate) {
    const root = document.documentElement;
    const apply = () => {
      root.setAttribute('data-theme', t);
      try { localStorage.setItem(THEME_KEY, t); } catch (e) {}
      document.querySelectorAll('.theme-btn').forEach(b => b.setAttribute('aria-pressed', t === 'winter' ? 'true' : 'false'));
      document.querySelectorAll('.theme-ic-sun, .theme-ic-moon').forEach(el => el.style.display = 'none');
      const show = t === 'winter' ? '.theme-ic-moon' : '.theme-ic-sun';
      document.querySelectorAll(show).forEach(el => el.style.display = '');
    };
    if (!animate || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { apply(); return; }
    const from = currentTheme();
    if (from === t) { apply(); return; }
    const wipe = document.createElement('div');
    wipe.className = 'theme-wipe ' + t;
    document.body.appendChild(wipe);
    wipe.animate([{ clipPath: 'circle(0% at 92% 24px)' }, { clipPath: 'circle(142% at 92% 24px)' }],
      { duration: 600, easing: 'cubic-bezier(.22,.8,.2,1)', fill: 'forwards' })
      .onfinish = () => { apply(); wipe.remove(); };
    setTimeout(() => { apply(); wipe.remove(); }, 700); /* страховка */
  }

  /* ---------- оболочка ---------- */
  /* Пять вкладок нижней панели v3 (часть 3.1): Мой путь · Программа · Маркетплейс · Участники · Лента */
  const TAB_ITEMS = [
    ['B1', 'Мой путь', 'route'], ['C1', 'Программа', 'program'], ['H1', 'Маркетплейс', 'market'],
    ['F1', 'Участники', 'people'], ['R1', 'Лента', 'feed']
  ];

  /* Подсветка вкладки по блоку экрана (часть 3.1): схема ядра побеждает старые значения
     tab в регистрациях, кроме явных null (панель скрыта) и '-' (панель без активной).
     L, M, O, P в схеме нет — для них панель по настройке экрана, как в v2. */
  const TAB_OF_BLOCK = {
    A: null, Z: null, B: 'B1', N: 'B1', C: 'C1', D: 'C1', E: '-',
    F: 'F1', G: 'F1', K: 'F1', H: 'H1', I: 'H1', J: 'H1', R: 'R1'
  };
  const PANEL_BY_SCREEN = new Set(['L', 'M', 'O', 'P']);

  /* экран возврата для заглушек «скоро» по блоку */
  const SECTION_OF_BLOCK = {
    A: 'A1', Z: 'Z1', B: 'B1', N: 'N1', C: 'C1', D: 'D1', E: 'E1', F: 'F1',
    G: 'G1', H: 'H1', I: 'I1', J: 'J1', K: 'K1', R: 'R1', L: 'L0', M: 'M1',
    O: 'O1', P: 'P1'
  };
  /* корневые экраны v3 (часть 3.2): слева меню, справа карта, уведомления и аватар */
  const ROOT_SCREENS = { B1: 1, C1: 1, C4: 1, C7: 1, D1: 1,
    H1: 1, H3: 1, H5: 1, H8: 1, H9: 1, F1: 1, F9: 1, G1: 1, K1: 1,
    R1: 1, R5: 1, L0: 1, Z1: 1 };
  /* раздел приложения для сайдбара */
  const SECTION_OF_SCREEN = {};
  [['A', 'Вход и онбординг'], ['Z', 'Оболочка'], ['B', 'Мой путь'], ['N', 'Мой путь'],
   ['C', 'Программа'], ['D', 'Программа'], ['E', 'Карта'], ['F', 'Участники'],
   ['G', 'Участники'], ['H', 'Маркетплейс'], ['K', 'Маркетплейс'], ['I', 'Маркетплейс'],
   ['J', 'Маркетплейс'], ['R', 'Лента'], ['L', 'Кабинет'], ['M', 'Кабинет'],
   ['O', 'Консоль и допуск'], ['P', 'Консоль и допуск']].forEach(p => {
    BLOCKS.forEach(b => { if (b.id === p[0]) b.section = p[1]; });
  });

  /* активная вкладка экрана: явные null/'-' регистрации важнее схемы, дальше — схема по блоку */
  function tabFor(id, R) {
    const blk = id[0];
    if (PANEL_BY_SCREEN.has(blk)) return R && R.tab !== undefined ? R.tab : null;
    if (R && (R.tab === null || R.tab === '-')) return R.tab;
    return TAB_OF_BLOCK[blk] !== undefined ? TAB_OF_BLOCK[blk] : null;
  }

  function tabbar(activeId) {
    const items = TAB_ITEMS.map(([id, label, ic]) =>
      '<button class="tab' + (activeId === id ? ' on' : '') + '" data-go="' + id + '" aria-label="' + esc(label) + '">' +
      icon(ic) + '<span>' + label + '</span></button>'
    ).join('');
    return '<nav class="tabbar" aria-label="Основная навигация">' + items + '</nav>';
  }

  function statusBar() {
    return '<div class="statusbar" aria-hidden="true"><span class="sb-time">11:10</span>' +
      '<span class="sb-icons">' + icon('signal') + icon('wifi') + icon('battery') + '</span></div>';
  }

  /* Боковой список — по разделам приложения, внутри раздела по блокам брифа. */
  function sidebarHTML(currentId) {
    const order = ['Вход и онбординг', 'Мой путь', 'Программа', 'Маркетплейс', 'Участники', 'Лента', 'Карта', 'Кабинет', 'Оболочка', 'Консоль и допуск'];
    let html = '';
    order.forEach(sec => {
      const blocks = BLOCKS.filter(b => b.section === sec);
      if (!blocks.length) return;
      html += '<div class="sb-sec"><div class="sb-sec-name">' + esc(sec) + '</div>';
      blocks.forEach(b => {
        html += '<div class="sb-sub">' + esc(b.name) + '</div>';
        b.items.forEach(([id, title, level, phaseA]) => {
          const on = id === currentId;
          const soon = !RENDERERS[id];
          html += '<div class="sb-item' + (on ? ' on' : '') + (soon ? ' soon' : '') + '">' +
            '<span class="sb-id">' + id + '</span>' +
            (RENDERERS[id]
              ? '<button class="sb-link" data-go="' + id + '">' + esc(title) + '</button>'
              : '<span class="sb-title">' + esc(title) + '</span>') +
            (soon ? '<span class="sb-soon">скоро</span>' : '') +
            '</div>';
        });
      });
      html += '</div>';
    });
    const impl = ALL_SCREENS.filter(s => RENDERERS[s.id]).length;
    html += '<div class="sb-count">экранов: ' + impl + ' / ' + ALL_SCREENS.length + '</div>';
    return html;
  }

  function metaHTML(meta) {
    if (!meta) return '<p class="meta-empty">Метаданные появятся вместе с экраном.</p>';
    const row = (label, items, ids) => items && items.length
      ? '<div class="meta-sec"><div class="meta-label">' + label + '</div><ul>' +
        items.map(i => '<li>' + (ids ? '<code>' + esc(i) + '</code>' : esc(i)) + '</li>').join('') + '</ul></div>' : '';
    return '' +
      '<div class="meta-sec"><div class="meta-label">Роль</div><div>' + esc(meta.role || '—') + '</div></div>' +
      row('Требования', meta.fr, true) +
      row('Критерии приёмки', meta.ac, true) +
      row('Что показано', meta.what) +
      row('Правила и параметры', meta.rules) +
      row('Зависит от решения', meta.depends);
  }

  /* ---------- маршрутизация ---------- */
  let CURRENT = null;

  function stubOut(id) {
    const info = screenInfo(id);
    const backTo = SECTION_OF_BLOCK[id[0]] || 'B1';
    return {
      html: '<div class="scr stub">' +
        head({ back: ROOT_SCREENS[id] ? null : backTo, title: info ? info.title : id,
          eyebrow: 'скоро', sub: info ? 'Блок «' + info.blockName + '» · уровень ' + info.level : '',
          paren: paren('экран будет в следующей фазе демо') }) +
        '<div class="stub-body"><div class="stub-id">' + esc(id) + '</div>' +
        '<p class="stub-text">Экран будет в следующей фазе демо.</p></div></div>',
      meta: { title: (info ? info.title : id) + ' — скоро', role: info ? info.blockName : '',
        what: [info ? 'Экран «' + info.title + '» блока «' + info.blockName + '», уровень ' + info.level + '.' : 'Экран не найден.'],
        rules: [], depends: [] }
    };
  }

  /* Карточки и блоки с data-go/data-act, не являющиеся нативно интерактивными,
     получают tabindex/role и пометку data-a11y (по ней работает Enter/Space в keydown). */
  function a11yify(root) {
    if (!root) { return; }
    root.querySelectorAll('[data-go],[data-act]').forEach(el => {
      if (el.hasAttribute('data-a11y')) { return; }
      /* подложки-ловушки клика не фокусируются: им не место в Tab-порядке и в фокусе листа */
      if ([...el.classList].some(c => c.indexOf('scrim') !== -1)) { return; }
      const tag = el.tagName;
      /* нативно интерактивные не помечаем: у них Enter/Space уже работают, двойной вызов недопустим */
      if (/^(A|BUTTON|INPUT|SELECT|TEXTAREA|SUMMARY|LABEL)$/.test(tag)) { return; }
      el.setAttribute('data-a11y', '1');
      if (!el.hasAttribute('tabindex')) { el.setAttribute('tabindex', '0'); }
      if (!el.hasAttribute('role')) { el.setAttribute('role', el.hasAttribute('data-go') ? 'link' : 'button'); }
    });
  }

  function route() {
    const hash = location.hash || '#/A1';
    const m = hash.match(/^#\/([A-Z]\d+)(?:\/([A-Za-z0-9_-]+))?/);
    let id = m ? m[1] : 'A1';
    const param = m && m[2] ? m[2] : null;
    if (id === 'B2') { location.hash = '#/R1' + (param ? '/' + param : ''); return; }
    if (!screenInfo(id)) { location.hash = '#/A1'; return; }
    CURRENT = id;
    const R = RENDERERS[id];
    let htmlStr, meta;
    if (R) {
      htmlStr = R.html({ F: window.FIX, state: st(id), param });
      meta = R.meta;
    } else {
      const s = stubOut(id);
      htmlStr = s.html; meta = s.meta;
    }
    const isDesktop = id[0] === 'P';
    const tab = tabFor(id, R);
    const th = currentTheme();

    /* Прокрутка .scr и .chip-rail:
       - перерисовка того же маршрута — текущая позиция;
       - возврат назад по стеку (nav-back/history.back/кнопка «назад» на уже пройденный маршрут) — сохранённая в SCR_POS;
       - переход вперёд — верх, как раньше.
       Позиция применяется ДО R.mount: явная прокрутка в mount (scrollIntoView) побеждает. */
    const prevScr = document.querySelector('.scr');
    const prevHash = LAST_ROUTE ? ('#/' + LAST_ROUTE.id + (LAST_ROUTE.param ? '/' + LAST_ROUTE.param : '')) : null;
    const curHash = '#/' + id + (param ? '/' + param : '');
    /* возврат назад = переход к записи истории с меньшим индексом;
       переход вперёд на уже виденный маршрут позицию не восстанавливает */
    let traversal = false;
    if (NAV_API && NAV_API.currentEntry && LAST_NAV_IDX != null) {
      traversal = NAV_API.currentEntry.index < LAST_NAV_IDX;
    }
    if (NAV_API && NAV_API.currentEntry) { LAST_NAV_IDX = NAV_API.currentEntry.index; }
    const sameRoute = !!(LAST_ROUTE && LAST_ROUTE.id === id && LAST_ROUTE.param === param);
    const hi = IHIST.indexOf(curHash);
    if (prevScr && prevHash) {
      SCR_POS[prevHash] = { y: prevScr.scrollTop, rails: [...prevScr.querySelectorAll('.chip-rail')].map(r => r.scrollLeft) };
    }
    let restoreY = null, restoreRails = null;
    if (sameRoute && prevScr) {
      restoreY = prevScr.scrollTop;
      restoreRails = [...prevScr.querySelectorAll('.chip-rail')].map(r => r.scrollLeft);
    } else if (traversal && SCR_POS[curHash]) {
      restoreY = SCR_POS[curHash].y; restoreRails = SCR_POS[curHash].rails;
    }
    LAST_ROUTE = { id: id, param: param };
    if (hi >= 0) { IHIST.length = hi + 1; } else { IHIST.push(curHash); }
    /* лист не переживает перерисовку рамки: чистим класс и фокус даже при rerender того же маршрута */
    if (document.querySelector('.sheet-wrap')) { document.body.classList.remove('sheet-open'); SHEET_RETURN = null; }
    const app = document.getElementById('app');
    app.innerHTML =
      '<header class="topbar">' +
      '<div class="tb-left"><span class="tb-logo" aria-hidden="true"></span><span class="tb-title">Демо экранов · Атланты Сити. Зима 2027</span></div>' +
      '<div class="tb-right">' +
      '<span class="tb-count">экранов: ' + ALL_SCREENS.filter(s => RENDERERS[s.id]).length + ' / ' + ALL_SCREENS.length + '</span>' +
      '<button class="btn btn-ghost tb-demo" disabled title="Все данные в демо вымышленные">Демонстрационные данные</button>' +
      '<button class="theme-btn" data-act="theme-toggle" aria-label="Переключить тему" aria-pressed="' + (th === 'winter') + '">' +
      '<span class="theme-ic-sun"' + (th === 'winter' ? ' style="display:none"' : '') + '>' + icon('sun') + '</span>' +
      '<span class="theme-ic-moon"' + (th === 'winter' ? '' : ' style="display:none"') + '>' + icon('moon') + '</span></button>' +
      '</div></header>' +
      '<div class="layout">' +
      '<aside class="sidebar" aria-label="Экраны демо">' + sidebarHTML(id) + '</aside>' +
      '<main class="stage">' +
      '<div class="frame ' + (isDesktop ? 'desk' : 'phone') + '">' +
      (isDesktop ? '' : statusBar()) +
      '<div class="scr-host">' + htmlStr + '</div>' +
      (tab && !isDesktop ? tabbar(tab) : '') +
      '</div>' +
      '<div class="stage-note">демонстрационные данные · вымышленные люди и компании</div>' +
      '</main>' +
      '<aside class="panel" aria-label="Что показано">' +
      '<div class="panel-title">Что показано</div>' +
      '<div class="panel-body">' + metaHTML(meta) + '</div>' +
      '</aside>' +
      '</div>';

    document.title = (meta && meta.title ? meta.title : (screenInfo(id) || {}).title || id) + ' · демо Атланты Сити';
    window.scrollTo(0, 0);
    const ns = document.querySelector('.scr');
    if (ns) {
      if (restoreY != null) { ns.scrollTop = restoreY; }
      if (restoreRails) {
        const nr = ns.querySelectorAll('.chip-rail');
        restoreRails.forEach((v, i) => { if (nr[i] && v) { nr[i].scrollLeft = v; } });
      }
      APPLIED_SCR_Y = ns.scrollTop;
    }
    if (R && R.mount) R.mount(document.querySelector('.scr-host'), { F: window.FIX, state: st(id), param });
    /* активный чип в рельсе — дотянуть в видимую область, если он за краем */
    document.querySelectorAll('.chip-rail').forEach(rail => {
      const chip = rail.querySelector('.on, .active, [aria-pressed="true"]');
      if (!chip) { return; }
      const cr = chip.getBoundingClientRect(), rr = rail.getBoundingClientRect();
      if (cr.left < rr.left - 1 || cr.right > rr.right + 1) {
        rail.scrollLeft += cr.left - rr.left - (rr.width - cr.width) / 2;
      }
    });
    a11yify(document.getElementById('app'));
    paintToast(document.querySelector('.frame'));
  }

  /* ---------- события ---------- */
  document.addEventListener('click', ev => {
    const t = ev.target.closest('[data-go],[data-act]');
    if (!t) return;
    LAST_ACT_EL = t;
    if (t.hasAttribute('data-go')) {
      /* пункт меню, ведущий на текущий маршрут, не вызывает hashchange — закрываем оверлей явно */
      if (t.closest('.menu-ov')) { closeMenu(); }
      let id = t.getAttribute('data-go');
      if (id === 'B2' || id.indexOf('B2/') === 0) id = 'R1' + id.slice(2);
      const sid = id.split('/')[0];
      if (screenInfo(sid)) { location.hash = '#/' + id; }
      else { toast('Экран не найден: ' + id); }
      return;
    }
    const actName = t.getAttribute('data-act');
    const fn = ACTSREG[actName] || ACTS[actName];
    if (fn) { fn(t, ev); }
  });
  document.addEventListener('keydown', ev => {
    if (ev.key === 'Escape') {
      if (document.querySelector('.menu-ov')) { closeMenu(); return; }
      closeSheet(); return;
    }
    /* Enter/Space на помеченных data-a11y элементах — то же действие, что клик;
       defaultPrevented — значит, обработчик экрана уже отработал (например, SVG-стенды H8) */
    if (ev.defaultPrevented) { return; }
    const t = ev.target && ev.target.closest ? ev.target.closest('[data-a11y]') : null;
    if (t && (ev.key === 'Enter' || ev.key === ' ')) {
      if (ev.key === ' ') { ev.preventDefault(); }
      t.click();
    }
  });
  window.addEventListener('hashchange', () => route());
  window.addEventListener('resize', () => { const f = document.querySelector('.frame.desk'); if (f && window.fitDesk) window.fitDesk(); });

  /* глобальные действия оболочки */
  ACTSREG['theme-toggle'] = () => setTheme(currentTheme() === 'summer' ? 'winter' : 'summer', true);
  ACTSREG['sheet-close'] = () => closeSheet();
  ACTSREG['nav-back'] = () => {
    /* history.back() в свежем контексте уводит из приложения: считаем только переходы внутри демо */
    if (IHIST.length > 1) { IHIST.pop(); history.back(); }
    else location.hash = '#/B1';
  };

  /* ---------- меню (часть 3.3): экран Z1 и оверлей в рамке телефона ---------- */
  const MENU_GROUPS = [
    ['Начало', [['B1', 'Мой путь'], ['R1', 'Лента'], ['L8', 'Цели и запросы'], ['L9', 'Как пользоваться']]],
    ['Программа', [['C1', 'Вся программа'], ['C7', 'Сетка'], ['D1', 'Менторские'], ['C4', 'Избранное'], ['D5', 'Мои записи']]],
    ['Маркетплейс', [['H1', 'Решения'], ['H8', 'Экспо: стенды и зоны'], ['H5', 'КипяTALK'], ['H9', 'Продукты участников'], ['H3', 'Мой список'], ['H4', 'Маршрут по Экспо']]],
    ['Участники', [['F1', 'Участники'], ['F6', 'Предметный кофе'], ['G1', 'Встречи'], ['F9', 'Спикеры'], ['K1', 'Партнёры'], ['F8', 'Мои контакты'], ['F7', 'Моя визитка']]],
    ['Площадка', [['E1', 'Карта'], ['E4', 'Маршрут'], ['R5', 'Мой чат']]],
    ['Итоги', [['M1', 'Заметки'], ['M3', 'Оцените день'], ['M4', 'Мои итоги'], ['M5', 'Дорожная карта']]],
    ['Помощь', [['L11', 'Вопросы и ответы'], ['L10', 'Кодекс участника'], ['L6', 'Приватность'], ['B3', 'Уведомления']]],
    ['По роли', [['I1', 'Кабинет экспонента'], ['J1', 'Сканер контактов'], ['O1', 'Допуск'], ['P1', 'Консоль']]]
  ];

  function menuHTML() {
    const ME = (window.FIX && window.FIX.ME) || {};
    const th = currentTheme();
    const groups = MENU_GROUPS.map(g =>
      '<div class="menu-group"><div class="menu-gname">' + esc(g[0]) + '</div>' +
      g[1].map(it => '<button class="menu-item" data-go="' + it[0] + '"><span class="mi-t">' + esc(it[1]) + '</span>' + icon('chevR') + '</button>').join('') +
      '</div>').join('');
    return '<div class="menu">' +
      '<button class="menu-card" data-go="L7">' +
      avatar(ME.name || 'Участник', 'l') +
      '<span class="mc-grow"><span class="mc-name">' + esc(ME.name || 'Участник') + '</span>' +
      '<span class="mc-sub">' + esc(ME.company || '') + (ME.tariff ? ' · ' : '') + '</span></span>' +
      (ME.tariff ? tariffTag(ME.tariff) : '') + icon('chevR') + '</button>' +
      '<button class="menu-search" data-go="Z2">' + icon('search') +
      '<span class="ms-ph">Люди, компании, сессии, стенды</span>' + icon('chevR') + '</button>' +
      groups +
      (window.__ATL_SERVER ?
        '<div class="menu-group"><div class="menu-gname">Тест</div>' +
        '<button class="menu-item" data-act="atl-feedback"><span class="mi-t">Сообщить о проблеме или идее</span>' + icon('chevR') + '</button>' +
        '<button class="menu-item" data-act="atl-reset"><span class="mi-t">Сбросить мои данные теста</span>' + icon('chevR') + '</button>' +
        '</div>' : '') +
      '<div class="menu-foot">' +
      logoImg('sm') +
      '<button class="menu-theme theme-btn" data-act="theme-toggle" aria-label="Переключить тему" aria-pressed="' + (th === 'winter') + '">' +
      '<span class="theme-ic-sun"' + (th === 'winter' ? ' style="display:none"' : '') + '>' + icon('sun') + '</span>' +
      '<span class="theme-ic-moon"' + (th === 'winter' ? '' : ' style="display:none"') + '>' + icon('moon') + '</span>' +
      '<span class="mt-label">Тема</span></button>' +
      '</div></div>';
  }

  function openMenu() {
    const fr = frameEl(); if (!fr) return;
    if (fr.querySelector('.menu-ov')) return;
    const w = document.createElement('div');
    w.className = 'menu-ov';
    w.innerHTML = '<div class="menu-scrim" data-act="menu-close"></div>' +
      '<div class="menu-panel" role="dialog" aria-modal="true" aria-label="Меню">' + menuHTML() + '</div>';
    fr.appendChild(w);
  }
  function closeMenu() {
    const m = document.querySelector('.menu-ov');
    if (m) m.remove();
  }
  ACTSREG['menu-open'] = openMenu;
  ACTSREG['menu-close'] = closeMenu;

  /* публичное API для экранов */
  window.Demo = {
    icon, esc, avatar, paren, tag, tariffTag, goBtn, act, st, openSheet, closeSheet, toast,
    rerender, route, setTheme, currentTheme, screenInfo, statusBar, tabbar, restoreScroll,
    topo, pict, logoImg, head, segbar, chipRail, plural, menuHTML, openMenu, closeMenu,
    register(id, def) { RENDERERS[id] = def; },
    action(name, fn) { ACTSREG[name] = fn; },
    sheetHTML: openSheet, states: STATE
  };

  /* инициализация */
  document.addEventListener('DOMContentLoaded', () => {
    let t = 'summer';
    try { t = localStorage.getItem(THEME_KEY) || 'summer'; } catch (e) {}
    document.documentElement.setAttribute('data-theme', t);
    if (!location.hash) location.hash = '#/A1';
    route();
  });
})();
