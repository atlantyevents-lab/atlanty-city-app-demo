/* Блок Z — «Оболочка» v3: Z1 меню (то же, что оверлей по кнопке меню), Z2 поиск по всему.
   Владелец: F0a. Данные поиска — window.FIX (PEOPLE, SPEAKERS, SESSIONS, EXHIBITORS;
   COMPANIES и PRODUCTS подключаются защитно, когда появятся в fx_shared/fx_market). */
(function () {
  const D = window.Demo;
  const { esc, icon, paren } = D;

  /* ---------- общие действия «+ Путь» (контракт FIX.pathAdd / FIX.pathRemove, data/fx_path.js) ----------
     Разметка кнопки: data-act="path-add" data-type="session|practice|leisure|networking|mentor|kipatalk|stand|person|buyer"
     data-ref="<id сущности>" и при необходимости data-day, data-time (обязательны для mentor). Одно нажатие — добавление
     (само нажатие и есть подтверждение), в тосте есть «Отменить» через path-remove. */
  /* Свободное окно 27.02 после 11:10 с шагом 15 минут без пересечения с принятыми/записанными пунктами пути */
  const PATH_FIRM_ST = { accepted: 1, booked: 1, done: 1 };
  const tMin = t => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
  const tFmt = m => String(Math.floor(m / 60)).padStart(2, '0') + ':' + String(m % 60).padStart(2, '0');
  function firmItems(F, day) {
    return (F.PATH_ITEMS || []).filter(x => PATH_FIRM_ST[x.status] && (!day || x.day === day));
  }
  function timeClash(s, e, x) {
    const xs = tMin(x.time); return xs != null && xs < e && s < xs + (x.dur || 30);
  }
  function overlaps(F, it) {
    const s = tMin(it.time); if (s == null) { return false; }
    return firmItems(F, it.day).some(x => x !== it && timeClash(s, s + (it.dur || 30), x));
  }
  function freePathTime(F, dur, type) {
    const durM = dur || 15;
    /* стенд — только внутри часов работы Экспо; «сейчас» 11:10, первое окно не раньше 11:25 (15 мин на дорогу);
       сетка 5 минут: свободное окно может начинаться не по 15-минутной сетке (напр. 18:00–18:15) */
    let start = 11 * 60 + 10, end = 23 * 60;
    const em = t => { const m = /^(\d{1,2}):(\d{2})/.exec(t || ''); return m ? (+m[1]) * 60 + (+m[2]) : null; };
    const eh = type === 'stand' && F.EXPO_HOURS && F.EXPO_HOURS['27.02'];
    if (eh) { start = Math.max(start + 15, em(eh[0])); end = em(eh[1]); }
    start = Math.ceil(start / 5) * 5;
    const step = type === 'stand' ? 5 : 15;
    const firm = firmItems(F, '27.02');
    for (let t = start; t + durM <= end; t += step) {
      if (!firm.some(x => timeClash(t, t + durM, x))) { return tFmt(t); }
    }
    return null;
  }
  /* «мягкое» окно для стенда: свободных нет — берём ближайшее, которое НЕ пересекает
     записанные (booked/done) и уже добавленные через pathAdd пункты; пересечение
     с accepted/suggested допустимо — конфликт покажет B7 (там он считается по времени) */
  function softPathTime(F, dur) {
    const durM = dur || 15;
    const eh = F.EXPO_HOURS && F.EXPO_HOURS['27.02'];
    if (!eh) { return null; }
    const start = Math.ceil(Math.max(11 * 60 + 10 + 15, tMin(eh[0])) / 5) * 5;
    const end = tMin(eh[1]);
    const added = {};
    (F.PATH_ADDED || []).forEach(id => { added[id] = 1; });
    const hard = (F.PATH_ITEMS || []).filter(x => x.day === '27.02' &&
      (x.status === 'booked' || x.status === 'done' || added[x.id]));
    for (let t = start; t + durM <= end; t += 5) {
      if (!hard.some(x => timeClash(t, t + durM, x))) { return tFmt(t); }
    }
    return null;
  }
  function overlapItem(F, it) {
    const s = tMin(it.time); if (s == null) { return null; }
    const e = s + (it.dur || 30);
    return (F.PATH_ITEMS || []).filter(x => x !== it && x.day === it.day && timeClash(s, e, x))
      .sort((a, b) => tMin(a.time) - tMin(b.time))[0] || null;
  }

  D.action('path-add', el => {
    const F = window.FIX, ds = el.dataset;
    const isSoft = ds.type === 'stand' || ds.type === 'person' || ds.type === 'buyer';
    /* предложенный пункт с тем же ref — принять его (день и время сохраняются), а не создавать новый pu */
    const sug = isSoft && F.pathFindAny ? F.pathFindAny(ds.type, ds.ref) : null;
    const hasSug = !!(sug && sug.status === 'suggested');
    let tm = ds.time || null, softWin = false;
    if (!tm && isSoft && !hasSug) { tm = freePathTime(F, 15, ds.type); }
    /* у стенда свободных окон может не быть — берём «мягкое» окно с конфликтом на B7 */
    if (!tm && !ds.time && !hasSug && ds.type === 'stand') { tm = softPathTime(F, 15); softWin = !!tm; }
    if (isSoft && !hasSug && !tm && !ds.time && ds.type === 'stand') {
      D.toast('Сегодня окон на стенде не осталось, выберите другой день', 3400); return;
    }
    const it = F.pathAdd && F.pathAdd(ds.type, ds.ref, { day: ds.day || null, time: hasSug ? null : tm });
    if (!it) { D.toast('Не удалось добавить в «Мой путь»: нужно выбрать время'); return; }
    const clash = overlaps(F, it);
    if (softWin && clash) {
      const ov = overlapItem(F, it);
      D.toast('Добавлено в «Мой путь». Пересекается с «' + (ov ? ov.title : 'другим пунктом') + '». Разрешить можно в конфликтах', 4000, { label: 'Конфликты', go: 'B7' });
    } else {
      D.toast(clash ? 'Время пересекается с другим пунктом пути — проверьте «Мой путь»' : 'Добавлено в «Мой путь»: ' + it.day + ', ' + it.time, clash ? 3400 : 2200);
    }
    D.rerender();
  });
  D.action('path-remove', el => {
    const F = window.FIX, id = el.dataset.id;
    if (id && F.pathRemove && F.pathRemove(id)) { D.toast('Убрано из «Мой путь»'); D.rerender(); }
  });

  /* ---------- Z1 Меню ---------- */
  D.register('Z1', {
    tab: null,
    meta: {
      title: 'Z1 · Меню',
      role: 'Оболочка приложения',
      fr: ['FR-UI-01'],
      ac: [],
      what: [
        'Полноэкранное меню со всеми разделами: карточка участника, поиск, группы разделов.',
        'Тот же компонент, что оверлей по кнопке меню в шапке корневых экранов.',
        'Внизу — логотип и переключатель темы.'
      ],
      rules: [
        'Пункты меню ведут на корневые и вторые экраны разделов по инвентарю v3.',
        'Меню не дублирует нижнюю панель: там только пять основных разделов.'
      ],
      depends: ['04_REBUILD_V3.md, часть 3.3']
    },
    html() {
      return '<div class="scr">' +
        D.head({ eyebrow: 'Оболочка', title: 'Меню', sub: 'Все разделы приложения', paren: paren('открывается и кнопкой в шапке') }) +
        '<div class="z1-body">' + D.menuHTML() + '</div></div>';
    }
  });

  /* ---------- Z2 Поиск по всему ---------- */
  /* индекс строится один раз из FIX; поля компаний и продуктов — когда файлы fx_* наполнятся */
  let Z2_INDEX = null;
  function z2Index() {
    if (Z2_INDEX) return Z2_INDEX;
    const F = window.FIX || {};
    const out = [];
    const push = (g, t, s, go, hay, own) => { if (t) out.push({ g, t, s: s || '', go, hay, own: own || null }); };

    const ME = F.ME || {};
    const isOwnCo = c => !!c && (c.id === 'co00' || c.ownerId === 'me');
    const isOwnP = p => !!p && (p.id === 'me' || p.ownerId === 'me' || p.name === ME.name);
    const isOwnPr = p => !!p && (p.companyId === 'co00' || (COMP || []).some(c => c.id === p.companyId && isOwnCo(c)));

    (F.PEOPLE || []).forEach(p => push('Люди', p.name,
      (p.company || '') + (p.role ? ' · ' + p.role : ''), 'F2/' + p.id,
      (p.name + ' ' + (p.company || '') + ' ' + (p.role || '') + ' ' + (p.use || '') + ' ' + (p.industry || '') + ' ' + (p.goal || '')).toLowerCase(),
      isOwnP(p) ? 'person' : null));

    const sp = F.SPEAKERS || {};
    Object.keys(sp).forEach(k => {
      const s = sp[k];
      push('Спикеры', s.name,
        (s.company || '') + (s.role ? ' · ' + s.role : ''), 'C5/' + k,
        (s.name + ' ' + (s.company || '') + ' ' + (s.role || '') + ' ' + (s.lever || '')).toLowerCase(),
        isOwnP(s) ? 'person' : null);
    });

    const COMP = F.COMPANIES || [];
    COMP.forEach((c, i) => push('Компании', c.name || c.title,
      c.industry || c.company || '', 'F12/' + (c.id || ('co' + String(i + 1).padStart(2, '0'))),
      JSON.stringify(c).toLowerCase(), isOwnCo(c) ? 'company' : null));

    const PROD = F.PRODUCTS || [];
    PROD.forEach((p, i) => push('Продукты', p.name || p.title,
      (p.company || '') + (p.kind ? ' · ' + p.kind : ''), 'H10/' + (p.id || ('pr' + String(i + 1).padStart(2, '0'))),
      JSON.stringify(p).toLowerCase(), isOwnPr(p) ? 'product' : null));

    const sess = Array.isArray(F.SESSIONS) ? F.SESSIONS : Object.keys(F.SESSIONS || {}).map(k => F.SESSIONS[k]);
    sess.forEach(s => {
      const h = F.hall && s.hall ? F.hall(s.hall) : null;
      push('Сессии', s.title,
        (s.day || '') + ' ' + (s.time || '') + (h ? ' · ' + h.name : ''), 'C3/' + s.id,
        (s.title + ' ' + (s.format || '') + ' ' + (s.lever || '') + ' ' + (s.desc || '') + ' ' +
          (s.speakers || []).map(k => (sp[k] && sp[k].name) || k).join(' ')).toLowerCase());
    });

    (F.EXHIBITORS || []).forEach(e => push('Стенды', e.name,
      (e.what || '') + (e.stand ? ' · ' + e.stand : ''), 'H2/' + e.id,
      (e.name + ' ' + (e.what || '') + ' ' + (e.desc || '') + ' ' + (e.cluster || '') + ' ' + (e.offer || '')).toLowerCase()));

    Z2_INDEX = out;
    return out;
  }

  const Z2_ORDER = ['Люди', 'Спикеры', 'Компании', 'Продукты', 'Сессии', 'Стенды'];

  function z2Results(q) {
    const s = (q || '').trim().toLowerCase();
    if (s.length < 2) {
      return '<div class="z2-hint cap" style="padding:14px 4px">Введите хотя бы два символа — найдём людей, компании, продукты, сессии и стенды.</div>';
    }
    /* приватность (L6): отозванное согласие на показ профиля или поле «Только вы»
       убирают собственные компанию, продукты и профиль из общей выдачи */
    const F2 = window.FIX || {}, PS = F2.PS, MEv = (F2.ME && F2.ME.visibility) || {};
    const noProf = !!(PS && PS.consents && PS.consents.profile === false);
    const visL = id => (PS && PS.vis) ? PS.vis(id) : (MEv[id] || 'only_me');
    const hideOwn = {
      person: noProf || visL('name') === 'only_me',
      company: noProf || visL('company') === 'only_me',
      product: noProf || visL('company') === 'only_me'
    };
    const hits = z2Index().filter(it => it.hay.includes(s) && !(it.own && hideOwn[it.own]));
    if (!hits.length) {
      return '<div class="empty"><div class="e-title">Ничего не нашлось</div>' +
        '<div class="e-text">По запросу «' + esc(q.trim()) + '» совпадений нет. Попробуйте название компании, имя или тему сессии.</div></div>';
    }
    let html = '', shown = 0;
    Z2_ORDER.forEach(g => {
      const items = hits.filter(h => h.g === g);
      if (!items.length) return;
      shown += items.length;
      const first = items.slice(0, 6);
      html += '<div class="z2-group">' + esc(g) + ' · ' + items.length + '</div>' +
        '<div class="card" style="padding:2px 16px"><div class="list">' +
        first.map(it =>
          '<button class="row clickable" data-go="' + it.go + '">' +
          '<div class="grow"><div class="r-title">' + esc(it.t) + '</div>' +
          '<div class="r-sub">' + esc(it.s) + '</div></div>' + icon('chevR') + '</button>').join('') +
        '</div></div>' +
        (items.length > first.length ? '<div class="z2-more">Показаны первые ' + first.length + ' из ' + items.length + '</div>' : '');
    });
    return html;
  }

  D.register('Z2', {
    tab: null,
    meta: {
      title: 'Z2 · Поиск по всему',
      role: 'Оболочка приложения',
      fr: ['FR-SRCH-01'],
      ac: [],
      what: [
        'Строка поиска по подстроке: люди, спикеры, компании, продукты, сессии, стенды.',
        'Результаты группами с переходом в карточку сущности.',
        'Компании и продукты подключаются, когда появятся их данные.'
      ],
      rules: [
        'Поиск регистронезависимый, по подстроке; минимум два символа.',
        'Переходы: человек F2, спикер C5, сессия C3, стенд H2, компания F12, продукт H10.'
      ],
      depends: ['04_REBUILD_V3.md, часть 3.3', 'FIX.PEOPLE', 'FIX.SESSIONS', 'FIX.EXHIBITORS']
    },
    html(ctx) {
      const st = ctx.state;
      st.q = st.q || '';
      return '<div class="scr">' +
        D.head({ back: 'Z1', eyebrow: 'Оболочка', title: 'Поиск', sub: 'Люди, компании, продукты, сессии, стенды', paren: paren('поиск по подстроке') }) +
        '<div class="z2-body">' +
        '<div class="z2-field">' + icon('search') +
        '<input id="z2-q" class="z2-input" type="search" placeholder="Имя, компания, сессия, стенд" autocomplete="off" value="' + esc(st.q) + '">' +
        '</div>' +
        '<div id="z2-results"></div>' +
        '<div style="height:16px"></div>' +
        '</div></div>';
    },
    mount(root) {
      const inp = root.querySelector('#z2-q');
      const box = root.querySelector('#z2-results');
      if (!inp || !box) return;
      const render = () => {
        D.st('Z2').q = inp.value;
        box.innerHTML = z2Results(inp.value);
      };
      inp.addEventListener('input', render);
      render();
      inp.focus();
    }
  });
})();
