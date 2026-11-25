/* Блок K — «Партнёры» (S4a): K1 Партнёры по статусам, K2 Карточка партнёра, K3 Предложение, K4 Мои предложения.
   Вход: боковое меню (группа «Участники») и ряд чипов на F1 «Участники» (FR-PART-08); вкладки «Партнёры» в нижней панели нет (D-36).
   Данные: FIX.PARTNERS, MY_OFFERS (fixtures.js), FIX.PARTNER_EXT (fx_market.js). Логотипы — текстовые заглушки без реальных брендов.
   Состояние: «Мои предложения» (добавленные откликом и сохранением) — D.st('K4').mine.
   Маршрут K3: единственный параметр кодирует партнёра и номер предложения через дефис: K3/k3-0, K3/k3-1 (ядро разбирает один параметр;
   допустимые символы — латиница, цифры, «_», «-»); K3/k3 без номера — первое предложение (обратная совместимость). */
(function () {
  'use strict';
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag } = D;

  const GROUPS = [['генеральный', 'Генеральные'], ['отраслевой', 'Отраслевые'], ['сервисный', 'Сервисные']];
  const STATUS_LABEL = { 'генеральный': 'генеральный', 'отраслевой': 'отраслевой', 'сервисный': 'сервисный' };
  const pext = id => (F.PARTNER_EXT || {})[id] || {};
  const partner = id => F.PARTNERS.find(p => p.id === id) || null;
  const byName = name => F.PARTNERS.find(p => p.name === name);
  const mine = () => { const s = D.st('K4'); return s.mine || (s.mine = []); };

  /* Прокрутку и рейки при перерисовке сохраняет ядро (core.js route): своих обходов нет. */
  const reg = (id, def) => D.register(id, def);

  /* «Назад»: если внутри демо уже были переходы — возврат по истории (data-act="nav-back", ядро), иначе жёсткая ссылка на родителя.
     «С нуля» = ни одного перехода и хэш равен хэшу загрузки (порядок слушателей hashchange не важен). */
  const HASH0 = location.hash;                                    /* хэш при загрузке страницы */
  let NAVS = 0;
  window.addEventListener('hashchange', () => { NAVS++; });
  const backOpt = fallback => ((NAVS > 0 || location.hash !== HASH0) ? { backHist: true } : { back: fallback });
  const secTitle = t => '<div class="sec-title" role="heading" aria-level="2">' + t + '</div>';
  /* неизвестный идентификатор: честное состояние вместо подстановки первой записи */
  function notFound(title, text, parent, btn) {
    return '<div class="scr">' +
      D.head(Object.assign({ eyebrow: 'Партнёры', title: esc(title), sub: esc(text) }, backOpt(parent))) +
      '<div class="mkt-body"><div class="empty topo-host">' + D.topo() + '<div class="e-title">' + esc(title) + '</div><div class="e-text">' + esc(text) + '</div>' +
      '<button class="btn btn-primary mkt-empty-btn" data-go="' + esc(parent) + '">' + esc(btn) + '</button></div></div></div>';
  }

  /* Условия предложения по типу (FR-PART-03): тип, срок, лимит, призыв к действию */
  const TERMS_TEXT = {
    'бонус': 'Бонус для участников фестиваля: забрать его можно у партнёра на Экспо.',
    'скидка': 'Скидка для участников фестиваля при оформлении у партнёра.',
    'демо': 'Показ решения у партнёра. Место в группе закрепляется записью.',
    'материал': 'Материал от партнёра. Его пришлют после отклика.',
    'приглашение на встречу': 'Партнёр приглашает на встречу. Время и место согласуются в заявке.'
  };
  const offerOf = (p, i) => { const x = pext(p.id); return (x.offers || [])[i] || null; };
  const refOf = (p, i) => p.id + '-' + i;                       /* ключ записи в «Мои предложения» совпадает с параметром K3 */
  /* K3/<партнёр>-<номер>: 'k3-1' → второе предложение; 'k3' → первое (обратная совместимость); без параметра — первое у k1 */
  function parseOffer(param) {
    const m = /^(k\d+)(?:-(\d+))?$/.exec(param || 'k1');
    const p = m && partner(m[1]);
    if (!p) return null;
    const idx = m[2] == null ? 0 : parseInt(m[2], 10);
    return idx < (p.offers || []).length ? { p: p, idx: idx } : null;
  }
  const k3Go = (p, i) => 'K3/' + p.id + '-' + i;
  const cap = t => { t = String(t || ''); return t.charAt(0).toUpperCase() + t.slice(1); };

  /* ================= K1 Партнёры по статусам ================= */
  reg('K1', {
    tab: 'F1',
    meta: {
      title: 'K1 · Партнёры по статусам',
      role: 'Гость, участник',
      fr: ['FR-PART-01', 'FR-PART-08'],
      ac: ['AC-PART-04'],
      what: [
        'Партнёры по статусам: генеральные, отраслевые, сервисные; у генеральных значок-звезда.',
        'Логотипы — текстовые заглушки с названием (реальных логотипов нет).',
        'Две ссылки: «Мои предложения» (K4) и «Предложения» участникам (H6); карточка партнёра открывается по нажатию (K2).'
      ],
      rules: [
        'Раздел «Партнёры» — пункт бокового меню (группа «Участники») и ссылка на вкладке «Участники»; в нижней панели отдельной вкладки нет (D-36, AC-PART-04).',
        'Подсвечена вкладка «Участники»; шапка как у корневого экрана.',
        'Логотипы в демо — заглушки; в продукте утверждённые файлы бренда.'
      ],
      depends: ['D-36', 'D-37', 'партнёрские пакеты']
    },
    html() {
      const sections = GROUPS.map(g => {
        const list = F.PARTNERS.filter(p => p.status === g[0]);
        if (!list.length) return '';
        return '<div class="mkt-sec">' + secTitle(g[1] + ' · ' + list.length) + '</div>' +
          list.map(p =>
            '<button class="card interactive mkt-pt" data-go="K2/' + p.id + '">' +
            '<span class="logo-ph">' + esc(p.name) + '</span>' +
            '<span class="grow"><span class="mkt-pt-n">' + esc(p.name) + (p.status === 'генеральный' ? '<span class="mkt-gen">' + icon('star') + '</span>' : '') + '</span>' +
            '<span class="mkt-pt-d">' + esc(p.desc) + '</span></span>' + icon('chevR') + '</button>').join('');
      }).join('');
      const n = F.MY_OFFERS.length + mine().length;
      return '<div class="scr">' +
        D.head({ eyebrow: 'Участники', title: 'Партнёры', sub: 'Компании, поддерживающие фестиваль', paren: paren('логотипы в демо — заглушки') }) +
        '<div class="mkt-links"><button class="chip" data-go="K4">Мои предложения · ' + n + '</button>' +
        '<button class="chip" data-go="H6">Предложения</button></div>' +
        '<div class="mkt-body">' + sections + '</div></div>';
    }
  });

  /* ================= K2 Карточка партнёра ================= */
  reg('K2', {
    tab: 'F1',
    meta: {
      title: 'K2 · Карточка партнёра',
      role: 'Гость, участник',
      fr: ['FR-PART-01', 'FR-PART-03'],
      ac: ['AC-PART-01'],
      what: [
        'Партнёр: статус (у генерального значок-звезда), описание, логотип-заглушка.',
        'Контактное лицо, место партнёра на Экспо со ссылкой на схему или карту, связь с карточкой экспонента или компании, КипяTALK партнёра (если он ведёт).',
        'Список предложений с типом и сроком; переход к условиям (K3).'
      ],
      rules: [
        'Описание и предложения утверждаются партнёром и модератором.',
        'Контакты партнёра открываются через предложение с согласием участника (AC-PART-01).',
        'Партнёр может быть одновременно экспонентом: карточки связаны ссылкой.'
      ],
      depends: ['партнёрские пакеты', 'модерация']
    },
    html(ctx) {
      const p = partner(ctx.param || 'k1');
      if (!p) return notFound('Партнёр не найден', 'Такого партнёра нет в списке: откройте его из раздела «Партнёры».', 'K1', 'К партнёрам');
      const x = pext(p.id);
      const gen = p.status === 'генеральный';
      const person = x.person
        ? (x.person.id
          ? '<button class="mkt-row" data-go="F2/' + x.person.id + '"><div class="grow"><div class="r-title">' + esc(x.person.name) + '</div><div class="r-sub">' + esc(x.person.role) + '</div></div>' + icon('chevR') + '</button>'
          : '<div class="mkt-row"><div class="grow"><div class="r-title">' + esc(x.person.name) + '</div><div class="r-sub">' + esc(x.person.role) + '</div></div></div>')
        : '';
      const place = x.place
        ? '<button class="mkt-row" data-go="' + esc(x.placeGo || 'E1') + '"><div class="grow"><div class="r-title">' + esc(x.place) + '</div><div class="r-sub">где найти партнёра</div></div>' + icon('chevR') + '</button>'
        : '';
      /* связанный экспонент или компания: в заголовке строки имя, а не общая подпись */
      const lk = x.link && x.link.go.split('/'), lkEx = lk && lk[0] === 'H2' && F.exhibitor(lk[1]), lkCo = lk && lk[0] === 'F12' && F.company(lk[1]);
      const link = x.link
        ? '<button class="mkt-row" data-go="' + esc(x.link.go) + '"><div class="grow"><div class="r-title">' + esc(lkEx ? lkEx.name : (lkCo ? lkCo.name : x.link.label)) + '</div>' +
          '<div class="r-sub">' + esc(lkEx ? 'стенд в Экспо, связан с партнёром' : (lkCo ? 'компания участника, связана с партнёром' : 'связано с партнёром')) + '</div></div>' + icon('chevR') + '</button>'
        : '';
      const kts = x.ksessions ? F.KIPATALK.filter(k => k.ex === x.ksessions).sort((a, b) => (a.day + a.time).localeCompare(b.day + b.time)) : [];
      const ktRows = kts.map(k =>
        '<button class="mkt-row" data-go="H5"><div class="grow"><div class="r-title">' + esc(k.title) + '</div><div class="r-sub">' + esc(k.day + ' · ' + k.time) + ' · КипяTALK</div></div>' + icon('chevR') + '</button>').join('');
      const offers = (x.offers || []).map((o, i) =>
        '<button class="mkt-offer-row" data-go="' + k3Go(p, i) + '"><div class="grow"><div class="r-title">' + esc(cap(p.offers[i] || '')) + '</div>' +
        '<div class="r-sub">' + esc(o.type) + ' · ' + esc(o.until) + '</div></div>' + icon('chevR') + '</button>').join('');
      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: 'Партнёр · ' + esc(STATUS_LABEL[p.status]), title: esc(p.name), sub: esc(p.desc), paren: paren('предложения публикуются после модерации') }, backOpt('K1'))) +
        '<div class="mkt-body">' +
        '<div class="logo-ph lg">' + esc(p.name) + '</div>' +
        '<div class="card"><div class="mkt-card-h">Что предлагает участникам</div><div class="mkt-rows">' + offers + '</div></div>' +
        ((person || place || link) ? '<div class="card"><div class="mkt-card-h">Контакт и место</div><div class="mkt-rows">' + person + place + link + '</div></div>' : '') +
        (ktRows ? '<div class="card"><div class="mkt-card-h">Сессии партнёра</div><div class="mkt-rows">' + ktRows + '</div></div>' : '') +
        (gen ? '<div class="mkt-note mkt-gen-note">' + icon('star') + 'Генеральный партнёр фестиваля</div>' : '') +
        '</div></div>';
    }
  });

  /* ================= K3 Предложение ================= */
  reg('K3', {
    tab: 'F1',
    meta: {
      title: 'K3 · Предложение',
      role: 'Гость, участник',
      fr: ['FR-PART-03', 'FR-PART-04'],
      ac: ['AC-PART-01'],
      what: [
        'Условия предложения: тип (бонус, скидка, демо, материал, приглашение на встречу), срок, лимит; кнопка действия называется по смыслу (получить, записаться, запросить встречу).',
        'Маршрут K3 с параметром «k3-1»: идентификатор партнёра и номер предложения через дефис (второе предложение партнёра k3); параметр «k3» открывает первое.',
        'Кнопка действия открывает лист с согласием на передачу контактов (по умолчанию выключено): без согласия партнёр данных не получает.',
        '«Сохранить на потом» добавляет предложение в «Мои предложения» (K4) без обязательств.'
      ],
      rules: [
        'Предложение действительно до указанного срока; просроченное скрывается.',
        'Отклик создаёт запись и передаёт контакты только при согласии участника (AC-PART-01); подтверждение — кнопкой в листе.',
        'Отказ от одного предложения не влияет на другие.'
      ],
      depends: ['партнёрские пакеты', 'D-47']
    },
    html(ctx) {
      const po = parseOffer(ctx.param);
      if (!po) return notFound('Предложение не найдено', 'Такого предложения нет: откройте его из карточки партнёра.', 'K1', 'К партнёрам');
      const p = po.p, idx = po.idx;
      const o = offerOf(p, idx) || { type: 'бонус', until: 'до конца фестиваля', limit: 'без ограничения', cta: 'Получить' };
      const ref = refOf(p, idx);
      const rec = mine().find(m => m.ref === ref);
      const cta = rec && rec.status !== 'сохранено'
        ? '<div class="mkt-prod-sent">' + icon('check') + 'Отклик отправлен · ' + esc(rec.status) + '</div>'
        : '<button class="btn btn-primary btn-block" data-act="k3-ask" data-arg="' + esc(ref) + '">' + icon('ticket') + esc(o.cta) + '</button>';
      const save = rec
        ? ''
        : '<button class="btn btn-ghost btn-block" data-act="k3-save" data-arg="' + esc(ref) + '">Сохранить на потом</button>';
      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: 'Предложение · ' + esc(p.name), title: esc(cap(p.offers[idx] || '')), sub: esc(STATUS_LABEL[p.status]) + ' партнёр', paren: paren('предложения публикуются после модерации') }, backOpt('K2/' + p.id))) +
        '<div class="mkt-body">' +
        '<div class="card"><div class="mkt-card-h">Условия</div><div class="mkt-terms">' +
        '<div><div class="k">Тип</div><div class="v">' + esc(o.type) + '</div></div>' +
        '<div><div class="k">Когда</div><div class="v">' + esc(o.until) + '</div></div>' +
        '<div><div class="k">Лимит</div><div class="v">' + esc(o.limit) + '</div></div></div>' +
        '<div class="mkt-text">' + esc(TERMS_TEXT[o.type] || 'Предложение для участников фестиваля.') + '</div></div>' +
        '<div class="banner">' + icon('clock') + '<div class="cap">Действует: ' + esc(o.until) + '. Просроченные предложения скрываются из списка.</div></div>' +
        cta + save +
        '<button class="btn btn-secondary btn-block" data-go="K2/' + p.id + '">К партнёру</button>' +
        '</div></div>';
    }
  });
  /* Отклик создаёт запись и, по согласию, передаёт контакты: подтверждение кнопкой в листе (D-47, AC-PART-01) */
  D.action('k3-ask', el => {
    const po = parseOffer(el.dataset.arg); if (!po) return;
    const p = po.p, idx = po.idx, o = offerOf(p, idx);
    if (!o) return;
    D.openSheet('<div class="mkt-sheet"><div class="sheet-title">' + esc(o.cta) + '</div>' +
      '<div class="mkt-sh-t">' + esc(cap(p.offers[idx])) + '</div>' +
      '<div class="mkt-sh-s">' + esc(p.name) + ' · ' + esc(o.type) + ' · ' + esc(o.until) + '</div>' +
      '<div class="mkt-toggle-row"><div><div class="tr-title">Передать партнёру мои контакты</div>' +
      '<div class="tr-sub">Имя, компания, телефон и почта. Без согласия партнёр не получит ваши данные.</div></div>' +
      '<label class="toggle"><input type="checkbox" id="k3-consent"><span class="tr"></span></label></div>' +
      '<button class="btn btn-primary btn-block" data-act="k3-send" data-arg="' + esc(el.dataset.arg) + '">Отправить отклик</button>' +
      '<button class="btn btn-ghost btn-block" data-act="sheet-close">Не сейчас</button></div>');
  });
  D.action('k3-send', el => {
    const po = parseOffer(el.dataset.arg); if (!po) return;
    const p = po.p, idx = po.idx;
    const c = document.querySelector('#k3-consent'), consent = !!(c && c.checked);
    const status = consent ? 'на рассмотрении' : 'получено';
    const prev = mine().find(m => m.ref === el.dataset.arg);
    if (prev) { prev.status = status; prev.consent = consent; }
    else mine().push({ ref: el.dataset.arg, partner: p.name, text: p.offers[idx], status, consent });
    D.closeSheet();
    D.rerender();
    D.toast(consent ? 'Отклик отправлен, контакты переданы' : 'Отклик отправлен без контактов');
  });
  D.action('k3-save', el => {
    const po = parseOffer(el.dataset.arg); if (!po) return;
    const p = po.p, idx = po.idx;
    if (!mine().find(m => m.ref === el.dataset.arg)) mine().push({ ref: el.dataset.arg, partner: p.name, text: p.offers[idx], status: 'сохранено', consent: false });
    D.rerender();
    D.toast('Сохранено в «Мои предложения»');
  });
  D.action('k4-del', el => {
    const m = mine(), i = m.findIndex(x => x.ref === el.dataset.arg);
    if (i >= 0) { m.splice(i, 1); D.rerender(); D.toast('Убрано из списка'); }
  });

  /* ================= K4 Мои предложения ================= */
  reg('K4', {
    tab: 'F1',
    meta: {
      title: 'K4 · Мои предложения',
      role: 'Гость, участник',
      fr: ['FR-PART-04', 'FR-PART-08'],
      ac: ['AC-PART-01'],
      what: [
        'Сохранённые и полученные предложения в одном списке; статусы: сохранено, на рассмотрении, получено, принято, отклонено.',
        'У каждого предложения партнёр (ссылка на K2) и отметка о передаче контактов; добавленные из K3 можно убрать.',
        'Переход в «Партнёры» (K1).'
      ],
      rules: [
        '«Сохранить» добавляет предложение без обязательств; отклик передаёт контакты только по согласию (AC-PART-01).',
        'Статус меняет партнёр или организатор, участник видит актуальный.',
        'История предложений хранится 180 дней после события.'
      ],
      depends: ['партнёрские пакеты', 'D-47']
    },
    html() {
      const cls = { 'на рассмотрении': 'wait', 'принято': 'ok', 'получено': 'ok', 'отклонено': '', 'сохранено': '' };
      const rowOf = (text, name, status, ref, note, removable) => {
        const pt = byName(name);
        return '<div class="mkt-row"><div class="grow"><div class="r-title">' + esc(cap(text)) + '</div>' +
          '<div class="r-sub">' + esc(name) + '</div>' +
          (note ? '<div class="r-sub">' + esc(note) + '</div>' : '') + '</div>' +
          '<div class="mkt-li-side"><span class="mkt-st ' + (cls[status] || '') + '">' + esc(status) + '</span>' +
          (pt ? '<button class="btn btn-ghost btn-sm" data-go="K2/' + pt.id + '">К партнёру</button>' : '') +
          (removable ? '<button class="btn btn-ghost btn-sm" data-act="k4-del" data-arg="' + esc(ref) + '">Убрать</button>' : '') + '</div></div>';
      };
      const rows = F.MY_OFFERS.map(o => rowOf(o.text, o.partner, o.status, '', '', false)).join('') +
        mine().map(m => rowOf(m.text, m.partner, m.status, m.ref, m.status === 'сохранено' ? '' : (m.consent ? 'контакты переданы' : 'контакты не передавались'), true)).join('');
      const n = F.MY_OFFERS.length + mine().length;
      return '<div class="scr">' +
        D.head(Object.assign({ eyebrow: 'Партнёры', title: 'Мои предложения', sub: n + ' ' + D.plural(n, ['предложение', 'предложения', 'предложений']), paren: paren('статус обновляется партнёром') }, backOpt('K1'))) +
        '<div class="mkt-body"><div class="card mkt-prod-card"><div class="mkt-rows">' + rows + '</div></div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Сохранённые предложения не обязывают. Контакты уходят партнёру только если вы отметили согласие при отклике.</div></div>' +
        '<button class="btn btn-secondary btn-block" data-go="K1">К партнёрам</button></div></div>';
    }
  });
})();
