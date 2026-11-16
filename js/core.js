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
    heart: '<path d="M12 20s-7.5-4.6-7.5-10A4.3 4.3 0 0 1 12 7.3 4.3 4.3 0 0 1 19.5 10c0 5.4-7.5 10-7.5 10z"/>'
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

  const ACTS = {};            // ACTS[name] = fn(el, ev)
  function act(name, arg, extra) {
    return ' data-act="' + name + '"' + (arg != null ? ' data-arg="' + esc(arg) + '"' : '') + (extra || '');
  }

  /* ---------- лист (bottom sheet) и тост ---------- */
  function frameEl() { return document.querySelector('.frame'); }
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
  }
  function closeSheet() {
    const w = document.querySelector('.sheet-wrap'); if (w) w.remove();
    document.body.classList.remove('sheet-open');
  }
  function toast(msg, ms) {
    const fr = frameEl(); if (!fr) return;
    let t = fr.querySelector('.toast');
    if (!t) { t = document.createElement('div'); t.className = 'toast'; fr.appendChild(t); }
    t.innerHTML = icon('check') + '<span>' + esc(msg) + '</span>';
    t.classList.add('show');
    clearTimeout(t._h);
    t._h = setTimeout(() => t.classList.remove('show'), ms || 2200);
  }

  function rerender() { route(true); }

  /* ---------- каталог экранов (все 101 из брифа) ---------- */
  /* level: 1/2; phaseA: true для десяти экранов фазы A */
  const BLOCKS = [
    { id: 'A', name: 'Вход и онбординг', items: [
      ['A1', 'Приветствие', 1, 1], ['A2', 'Контакт', 2, 0], ['A3', 'Код', 2, 0],
      ['A4', 'Согласия', 1, 1], ['A5', 'Установка на экран', 2, 0], ['A6', 'Цели и польза', 1, 1], ['A7', 'Telegram', 2, 0]] },
    { id: 'B', name: 'Сегодня', items: [
      ['B1', 'Сегодня', 1, 1], ['B2', 'Лента', 2, 0], ['B3', 'Настройки уведомлений', 1, 1]] },
    { id: 'C', name: 'Программа', items: [
      ['C1', 'Вся программа', 1, 1], ['C2', 'Фильтры', 2, 0], ['C3', 'Карточка сессии', 1, 1],
      ['C4', 'Моя программа', 1, 1], ['C5', 'Спикер', 2, 0], ['C6', 'Изменение расписания', 2, 0]] },
    { id: 'D', name: 'Записи', items: [
      ['D1', 'Менторская гостиная', 1, 1], ['D2', 'Подтверждение записи', 1, 1], ['D3', 'Лист ожидания', 2, 0],
      ['D4', 'Недоступно по тарифу', 1, 1], ['D5', 'Мои записи', 2, 0], ['D6', 'Освободилось место', 2, 0]] },
    { id: 'E', name: 'Карта', items: [
      ['E1', 'План Завидово', 1, 1], ['E2', 'План этажа', 2, 0], ['E3', 'Точка', 2, 0],
      ['E4', 'Маршрут', 1, 1], ['E5', 'Мой маршрут', 2, 0]] },
    { id: 'F', name: 'Люди и знакомства', items: [
      ['F1', 'Каталог', 1, 1], ['F2', 'Карточка человека', 1, 1], ['F3', 'Заявка на знакомство', 1, 1],
      ['F4', 'Входящие заявки', 1, 1], ['F5', 'Исходящие', 2, 0], ['F6', 'НеРэндом кофе', 2, 0],
      ['F7', 'QR-визитка', 2, 0], ['F8', 'Мои контакты', 2, 0]] },
    { id: 'G', name: 'Встречи', items: [
      ['G1', 'Хаб', 1, 1], ['G2', 'Выбор окна', 1, 1], ['G3', 'Заявка на встречу', 1, 1],
      ['G4', 'Встреча подтверждена', 1, 1], ['G5', 'Другое время', 2, 0], ['G6', 'Напоминание', 2, 0],
      ['G7', 'Отметка прихода', 2, 0], ['G8', 'Исход встречи', 1, 1], ['G9', 'Договорённость', 1, 1],
      ['G10', 'Hosted Buyer', 1, 1], ['G11', 'Нет окон', 2, 0]] },
    { id: 'H', name: 'Экспо', items: [
      ['H1', 'Маркетплейс', 1, 1], ['H2', 'Карточка решения', 1, 1], ['H3', 'Мой список «Изучить»', 1, 1],
      ['H4', 'Маршрут по Экспо', 1, 1], ['H5', 'Экспо-расписание', 2, 0], ['H6', 'Предложения', 2, 0], ['H7', 'Отметка стенда', 2, 0]] },
    { id: 'I', name: 'Кабинет экспонента', items: [
      ['I1', 'Главная', 1, 1], ['I2', 'Контакты', 1, 1], ['I3', 'Карточка контакта', 2, 0],
      ['I4', 'Команда и квота', 2, 0], ['I5', 'Доступность', 2, 0], ['I6', 'Воркшоп', 2, 0],
      ['I7', 'Заявки', 2, 0], ['I8', 'Аналитика', 1, 1], ['I9', 'Карточка решения', 2, 0]] },
    { id: 'J', name: 'Сканер контактов', items: [
      ['J1', 'Сканер', 1, 1], ['J2', 'Результат с согласием', 1, 1], ['J3', 'Результат без согласия', 1, 1],
      ['J4', 'Метки и заметка', 2, 0], ['J5', 'Офлайн-очередь', 2, 0], ['J6', 'Кто меня сканировал', 2, 0]] },
    { id: 'K', name: 'Партнёры', items: [
      ['K1', 'Партнёры по статусам', 2, 0], ['K2', 'Карточка партнёра', 2, 0],
      ['K3', 'Предложение', 2, 0], ['K4', 'Мои предложения', 2, 0]] },
    { id: 'L', name: 'Билет и кабинет', items: [
      ['L1', 'Билет', 1, 1], ['L2', 'PDF-приглашение', 2, 0], ['L3', 'Оплата', 2, 0],
      ['L4', 'Проживание', 2, 0], ['L5', 'Семья и команда', 2, 0], ['L6', 'Приватность', 2, 0], ['L7', 'Профиль', 2, 0]] },
    { id: 'M', name: 'Заметки и оценка', items: [
      ['M1', 'Заметки', 2, 0], ['M2', 'Заметка в сессии', 2, 0], ['M3', 'Оцените день', 1, 1], ['M4', 'Мои итоги', 2, 0]] },
    { id: 'N', name: 'ИИ', items: [
      ['N1', 'Ассистент', 1, 1], ['N2', 'Штурман: запрос', 2, 0], ['N3', 'Штурман: маршруты', 1, 1],
      ['N4', 'Секретарь', 1, 1], ['N5', 'Подборщик', 2, 0], ['N6', 'Люди для знакомства', 1, 1], ['N7', 'Хроникёр', 2, 0]] },
    { id: 'O', name: 'Допуск (команда)', items: [
      ['O1', 'Сканер допуска', 1, 1], ['O2', 'Поиск гостя', 2, 0], ['O3', 'Закрытая сессия', 2, 0], ['O4', 'Статистика допуска', 2, 0]] },
    { id: 'P', name: 'Консоль (рабочий стол)', items: [
      ['P1', 'Табло встреч', 1, 1], ['P2', 'Очередь аккредитации', 1, 1], ['P3', 'Консоль уведомлений', 1, 1],
      ['P4', 'Дашборд', 1, 1], ['P5', 'Параметры', 2, 0], ['P6', 'Синхронизация программы', 2, 0], ['P7', 'Оценки спикеров', 2, 0]] }
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
      const b = document.querySelector('.theme-btn');
      if (b) b.setAttribute('aria-pressed', t === 'winter' ? 'true' : 'false');
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
  const TAB_ITEMS = [
    ['B1', 'Сегодня', 'today'], ['C1', 'Программа', 'program'], ['F1', 'Люди', 'people'],
    ['H1', 'Экспо', 'expo'], ['MORE', 'Ещё', 'more']
  ];
  const MORE_ITEMS = [
    ['L7', 'Профиль', 'user'], ['L1', 'Билет', 'ticket'], ['M1', 'Заметки', 'file'],
    ['M4', 'Мои итоги', 'star'], ['B3', 'Уведомления', 'bell'], ['L6', 'Приватность', 'lock'],
    ['L4', 'Проживание', 'building'], ['E1', 'Карта', 'map']
  ];

  /* раздел нижней панели для экрана-заглушки (по блоку) */
  const SECTION_OF_BLOCK = { B: 'B1', C: 'C1', D: 'C1', E: 'H1', F: 'F1', G: 'H1', H: 'H1', I: 'H1', J: 'H1', K: 'H1', L: 'MORE', M: 'MORE', N: 'MORE', O: 'MORE' };

  function tabbar(activeId) {
    const items = TAB_ITEMS.map(([id, label, ic]) => {
      if (id === 'MORE') {
        return '<button class="tab' + (activeId === 'MORE' ? ' on' : '') + '" data-act="more-menu" aria-label="Ещё">' +
          icon(ic) + '<span>' + label + '</span></button>';
      }
      const aria = id === 'H1' ? 'Экспо и встречи' : label;
      return '<button class="tab' + (activeId === id ? ' on' : '') + '" data-go="' + id + '" aria-label="' + aria + '">' +
        icon(ic) + '<span>' + label + '</span></button>';
    }).join('');
    return '<nav class="tabbar" aria-label="Основная навигация">' + items + '</nav>';
  }

  function statusBar() {
    return '<div class="statusbar" aria-hidden="true"><span class="sb-time">11:10</span>' +
      '<span class="sb-icons">' + icon('signal') + icon('wifi') + icon('battery') + '</span></div>';
  }

  function sidebarHTML(currentId) {
    const info = screenInfo(currentId);
    let html = '';
    BLOCKS.forEach(b => {
      html += '<div class="sb-block"><div class="sb-block-name">' + esc(b.name) + '</div>';
      b.items.forEach(([id, title, level, phaseA]) => {
        const on = id === currentId;
        const soon = !RENDERERS[id];
        const impl = !!RENDERERS[id];
        html += '<div class="sb-item' + (on ? ' on' : '') + (soon ? ' soon' : '') + '">' +
          '<span class="sb-id">' + id + '</span>' +
          (impl
            ? '<button class="sb-link" data-go="' + id + '">' + esc(title) + '</button>'
            : '<span class="sb-title">' + esc(title) + '</span>') +
          (soon ? '<span class="sb-soon">скоро</span>' : '') +
          '</div>';
      });
      html += '</div>';
    });
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
    return {
      html: '<div class="scr stub">' +
        '<div class="stub-body">' +
        '<div class="stub-id">' + esc(id) + '</div>' +
        '<h2 class="stub-title">' + esc(info ? info.title : id) + '</h2>' +
        '<p class="stub-text">Экран будет в следующей фазе демо.</p>' +
        (info ? '<p class="stub-sub">Блок «' + esc(info.blockName) + '» · уровень ' + info.level + '</p>' : '') +
        '</div></div>',
      meta: { title: (info ? info.title : id) + ' — скоро', role: info ? info.blockName : '',
        what: [info ? 'Экран «' + info.title + '» блока «' + info.blockName + '», уровень ' + info.level + '.' : 'Экран не найден.'],
        rules: [], depends: [] }
    };
  }

  function route() {
    const hash = location.hash || '#/A1';
    const m = hash.match(/^#\/([A-Z]\d+)(?:\/([A-Za-z0-9_-]+))?/);
    let id = m ? m[1] : 'A1';
    const param = m && m[2] ? m[2] : null;
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
    const tab = R && R.tab !== undefined ? R.tab : SECTION_OF_BLOCK[id[0]];
    const th = currentTheme();

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
    if (R && R.mount) R.mount(document.querySelector('.scr-host'), { F: window.FIX, state: st(id) });
  }

  /* ---------- события ---------- */
  document.addEventListener('click', ev => {
    const t = ev.target.closest('[data-go],[data-act]');
    if (!t) return;
    if (t.hasAttribute('data-go')) {
      const id = t.getAttribute('data-go');
      const sid = id.split('/')[0];
      if (screenInfo(sid)) { location.hash = '#/' + id; }
      else { toast('Экран не найден: ' + id); }
      return;
    }
    const actName = t.getAttribute('data-act');
    const fn = ACTSREG[actName] || ACTS[actName];
    if (fn) { fn(t, ev); }
  });
  document.addEventListener('keydown', ev => { if (ev.key === 'Escape') closeSheet(); });
  window.addEventListener('hashchange', () => route());
  window.addEventListener('resize', () => { const f = document.querySelector('.frame.desk'); if (f && window.fitDesk) window.fitDesk(); });

  /* глобальные действия оболочки */
  ACTSREG['theme-toggle'] = () => setTheme(currentTheme() === 'summer' ? 'winter' : 'summer', true);
  ACTSREG['sheet-close'] = () => closeSheet();
  ACTSREG['more-menu'] = () => {
    openSheet('<div class="sheet-title">Ещё</div><div class="menu-list">' +
      MORE_ITEMS.map(([id, label, ic]) =>
        '<button class="menu-item" data-go="' + id + '" data-act="sheet-close">' + icon(ic) + '<span>' + esc(label) + '</span>' + icon('chevR') + '</button>'
      ).join('') + '</div>');
  };

  /* публичное API для экранов */
  window.Demo = {
    icon, esc, avatar, paren, tag, tariffTag, goBtn, act, st, openSheet, closeSheet, toast,
    rerender, route, setTheme, currentTheme, screenInfo, statusBar, tabbar,
    topo, pict, logoImg,
    register(id, def) { RENDERERS[id] = def; },
    action(name, fn) { ACTSREG[name] = fn; },
    sheetHTML: openSheet
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
