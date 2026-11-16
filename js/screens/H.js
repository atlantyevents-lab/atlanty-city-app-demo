/* Блок H — Экспо. Фаза A: H2 «Карточка решения». */
(function () {
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag, avatar } = D;

  D.register('H2', {
    tab: 'H1',
    meta: {
      title: 'H2 · Карточка решения',
      role: 'Гость / экспонент',
      fr: ['FR-EXPO-02', 'FR-EXPO-03', 'FR-EXPO-07'],
      ac: ['AC-EXPO-01', 'AC-EXPO-02'],
      what: [
        'Карточка экспонента: компания, решение, кластер задачи, стенд на плане, формат.',
        'Предложение участникам, кейсы, описание — текст из фикстур.',
        'Действия: «Изучить», «Предложить встречу», «Записаться на воркшоп», заметка.',
        'Метка воркшопа и привязка стенда к зоне.'
      ],
      rules: [
        'Карточка публикуется после модерации менеджером; материалы — по правам экспонента.',
        '«Изучить» добавляет стенд в личный список и маршрут по Экспо.',
        'Отметка посещения стенда — сканированием QR-метки стенда (метка не даёт прав).',
        'Все компании и продукты в демо вымышленные.'
      ],
      depends: ['пакет экспонента', 'модерация EXH']
    },
    html(ctx) {
      const st = ctx.state;
      const id = (ctx.param && F.exhibitor(ctx.param)) ? ctx.param : 'ex01';
      const e = F.exhibitor(id);
      const studied = st.studied || (st.studied = {});
      const isStudied = !!studied[e.id];

      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="H1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div class="actions">' +
        '<button class="icon-btn' + (isStudied ? ' on' : '') + '" data-act="h2-study" data-arg="' + e.id + '" aria-label="Изучить">' + icon('bookmark') + '</button>' +
        '<button class="icon-btn" data-go="H7/' + e.id + '" aria-label="Отметка стенда">' + icon('scan') + '</button></div></div>' +
        '</div>' +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +

        '<div class="card"><div class="card-row">' +
        '<span class="avatar l accent" style="border-radius:16px">' + icon('building') + '</span>' +
        '<div class="grow"><div class="card-title" style="font-size:18px">' + esc(e.name) + '</div>' +
        '<div class="ex-what">' + esc(e.what) + '</div>' +
        '<div class="sess-meta" style="margin-top:6px">' + tag(e.cluster, 'accent') + tag(e.format) + (e.workshop ? tag('воркшоп', 'ok') : '') + '</div></div></div>' +
        '<div class="card-foot"><span class="ex-stand">' + icon('pin') + ' ' + esc(e.stand) + '</span>' +
        '<span class="cap">' + esc(F.hall('congress').name) + ', Экспо</span></div></div>' +

        '<div class="card"><div class="cap" style="margin-bottom:4px">Предложение участникам</div>' +
        '<div class="ex-offer">' + esc(e.offer) + '</div></div>' +

        '<div class="card"><div class="cap" style="margin-bottom:4px">Кейсы</div>' +
        '<div style="font-size:14px">' + esc(e.cases) + '</div></div>' +

        '<div class="card"><div class="cap" style="margin-bottom:4px">О компании</div>' +
        '<div style="font-size:14px;line-height:1.55">' + esc(e.desc) + '</div></div>' +

        '<div class="map-plate" style="min-height:140px">план Экспо · зона ' + esc(e.stand.split('·')[0].trim().replace('Зона ', '')) +
        '<br><span style="font-family:var(--font-text);font-size:12.5px">карточка стенда на плане — в блоке «Карта»</span></div>' +

        '<div style="display:flex;flex-direction:column;gap:10px">' +
        (e.workshop ? '<button class="btn btn-primary btn-block" data-go="I6/' + e.id + '">' + icon('play') + 'Записаться на воркшоп</button>' : '') +
        '<button class="btn btn-secondary btn-block" data-go="G2">' + icon('route') + 'Встреча на стенде</button>' +
        '<div style="display:flex;gap:8px">' +
        '<button class="btn btn-ghost btn-block" data-act="h2-study" data-arg="' + e.id + '">' + (isStudied ? 'В изученном' : 'Изучить') + '</button>' +
        '<button class="btn btn-ghost btn-block" data-go="M1">Заметка</button></div></div>' +
        paren('все экспоненты в демо вымышленные') +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('h2-study', el => {
    const st = D.st('H2');
    st.studied = st.studied || {};
    const id = el.dataset.arg;
    if (st.studied[id]) { delete st.studied[id]; D.toast('Убрано из «Изучить»'); }
    else { st.studied[id] = true; D.toast('Добавлено в «Изучить» — попадёт в маршрут по Экспо'); }
    D.rerender();
  });

  /* ---------- H1 Маркетплейс Экспо ---------- */
  D.register('H1', {
    tab: 'H1',
    meta: {
      title: 'H1 · Экспо и встречи',
      role: 'Гость / участник',
      fr: ['FR-EXPO-01', 'FR-EXPO-02', 'FR-EXPO-04'],
      ac: ['AC-EXPO-01'],
      what: [
        'Маркетплейс решений: поиск, фильтры по девяти кластерам задач, счётчик результатов.',
        'Карточки экспонентов: компания, решение, кластер, стенд, пометки «воркшоп» и «принимает встречи».',
        'CTA «Встреча» ведёт к выбору окна на стенде.'
      ],
      rules: [
        'Кластеры соответствуют девяти задачам предпринимателя — тот же справочник, что в программе.',
        '«Принимает встречи» — у экспонента есть свободные окна на стенде.',
        'Все компании вымышленные.'
      ],
      depends: ['пакет экспонента', 'модерация EXH']
    },
    html(ctx) {
      const st = ctx.state;
      st.f = st.f || 'all';
      st.q = st.q || '';
      const q = st.q.trim().toLowerCase();
      let list = F.EXHIBITORS;
      if (st.f !== 'all') list = list.filter(e => e.cluster === st.f);
      if (q) list = list.filter(e => (e.name + ' ' + e.what + ' ' + e.cluster + ' ' + e.offer).toLowerCase().includes(q));

      const chips = F.EXPO_FILTERS.map(c =>
        '<button class="chip' + (st.f === c.id ? ' on' : '') + '" data-act="h1-filter" data-arg="' + c.id + '">' + esc(c.label) + '</button>').join('');

      const cards = list.map(e =>
        '<div class="card ex-card"><div class="ex-what">' + esc(e.name) + ' — ' + esc(e.what) + '</div>' +
        '<div class="r-sub" style="margin-top:2px">' + esc(e.offer) + '</div>' +
        '<div class="sess-meta" style="margin-top:8px">' + tag(e.cluster, 'accent') + tag(e.stand) +
        (e.workshop ? tag('воркшоп', 'ok') : '') + tag('принимает встречи', 'tariff') + '</div>' +
        '<div class="card-foot" style="margin-top:10px"><span class="ex-stand">' + icon('pin') + ' ' + esc(e.stand) + '</span>' +
        '<button class="btn btn-secondary btn-sm" data-go="H2/' + e.id + '">Карточка</button>' +
        '<button class="btn btn-primary btn-sm" data-go="G2">Встреча</button></div></div>').join('');

      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="B1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">' + esc(F.NOW.dateLong) + '</div><h1>Экспо</h1>' +
        '<div class="sub">Решения по задачам бизнеса · ' + list.length + ' из ' + F.EXHIBITORS.length + '</div></div>' +
        '<button class="icon-btn" data-go="H3" aria-label="Изучить">' + icon('bookmark') + '</button></div>' +
        '<input class="input" type="search" id="h1-q" placeholder="Решение, задача, компания" value="' + esc(st.q) + '" aria-label="Поиск по экспонентам" style="margin-top:10px">' +
        '</div>' +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="chips" style="padding-top:0">' + chips + '</div>' +
        '<div class="cap">Найдено решений: ' + list.length + '</div>' +
        cards +
        (list.length ? '' : '<div class="empty"><div class="e-title">Ничего не нашлось</div><div class="e-text">Снимите фильтр или измените запрос.</div></div>') +
        '<div style="height:16px"></div></div></div>';
    },
    mount(host) {
      const inp = host.querySelector('#h1-q');
      if (inp) inp.addEventListener('input', () => {
        D.st('H1').q = inp.value;
        clearTimeout(window.__h1t);
        window.__h1t = setTimeout(() => D.rerender(), 350);
      });
    }
  });
  D.action('h1-filter', el => { D.st('H1').f = el.dataset.arg; D.rerender(); });

  /* ---------- H3 Изучить ---------- */
  const STUDY_STATUSES = ['хочу посетить', 'посетил', 'связаться'];
  function studyList() {
    /* демо-список: изученные стенды в порядке добавления */
    return F.STAND_ROUTE.map(s => {
      const e = F.exhibitor(s.ex);
      return { id: s.ex, n: s.n, ex: e, zone: s.zone };
    });
  }

  D.register('H3', {
    tab: 'H1',
    meta: {
      title: 'H3 · Изучить',
      role: 'Гость / участник',
      fr: ['FR-EXPO-05', 'FR-EXPO-06'],
      ac: ['AC-EXPO-03'],
      what: [
        'Упорядоченный список изученных решений со статусами.',
        'Статусы: хочу посетить, посетил, связаться — переключаются.',
        'Заметка к каждому пункту и кнопка «Убрать»; пустое состояние.'
      ],
      rules: [
        '«Изучить» добавляет стенд в список и в маршрут по Экспо (H4).',
        'Отметка посещения — сканированием QR-метки стенда.',
        'Список синхронизируется между устройствами.'
      ],
      depends: ['модерация EXH']
    },
    html(ctx) {
      const st = ctx.state;
      st.tab = st.tab || 'study';
      st.st = st.st || {};      // id -> статус
      st.notes = st.notes || {}; // id -> заметка
      st.removed = st.removed || {};
      st.saved = st.saved || {}; // id -> true (вкладка «Сохранено»)
      const list = studyList().filter(s => !st.removed[s.id]);

      const statusTag = s => {
        const cur = st.st[s.id] || 'хочу посетить';
        const i = STUDY_STATUSES.indexOf(cur);
        return '<button class="chip ex-chip' + (i === 0 ? '' : ' on') + '" data-act="h3-status" data-arg="' + s.id + '">' + esc(cur) + '</button>';
      };

      const items = list.map(s =>
        '<div class="card" style="padding:12px 14px"><div style="display:flex;gap:10px;align-items:flex-start">' +
        '<span class="pill-count">' + s.n + '</span>' +
        '<div class="grow" style="min-width:0"><div class="r-title" style="font-size:14.5px">' + esc(s.ex.name) + ' — ' + esc(s.ex.what) + '</div>' +
        '<div class="r-sub">' + esc(s.zone) + ' · ' + esc(s.ex.cluster) + '</div>' +
        '<div style="margin-top:8px">' + statusTag(s) + '</div>' +
        (st.notes[s.id] ? '<div class="cap" style="margin-top:6px">заметка: ' + esc(st.notes[s.id]) + '</div>' : '') + '</div>' +
        '<div style="display:flex;flex-direction:column;gap:6px;flex:none">' +
        '<button class="btn btn-ghost btn-sm" data-act="h3-note" data-arg="' + s.id + '">Заметка</button>' +
        '<button class="btn btn-ghost btn-sm" data-act="h3-del" data-arg="' + s.id + '">Убрать</button></div></div></div>').join('');

      const savedCount = list.filter(s => st.saved[s.id]).length;
      const savedItems = list.filter(s => st.saved[s.id]).map(s =>
        '<div class="row"><div class="grow"><div class="r-title" style="font-size:14px">' + esc(s.ex.name) + '</div><div class="r-sub">' + esc(s.zone) + '</div></div>' +
        '<button class="btn btn-ghost btn-sm" data-act="h3-unsave" data-arg="' + s.id + '">Убрать</button></div>').join('');

      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="H1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Экспо</div><h1>Изучить</h1>' +
        '<div class="sub">Ваш список решений и статусы</div></div></div>' +
        '</div>' +
        paren('список попадает в маршрут по Экспо') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="chips"><button class="chip' + (st.tab === 'study' ? ' on' : '') + '" data-act="h3-tab" data-arg="study">Изучить · ' + list.length + '</button>' +
        '<button class="chip' + (st.tab === 'saved' ? ' on' : '') + '" data-act="h3-tab" data-arg="saved">Сохранено · ' + savedCount + '</button></div>' +
        (st.tab === 'study'
          ? (items || '<div class="empty topo-host">' + D.topo() + '<div class="e-title">Список пуст</div><div class="e-text">Нажмите «Изучить» в карточке решения — оно появится здесь.</div></div>')
          : (savedItems ? '<div class="card" style="padding:2px 16px"><div class="list">' + savedItems + '</div></div>' :
            '<div class="empty topo-host">' + D.topo() + '<div class="e-title">Ничего не сохранено</div><div class="e-text">Сохранённые решения появятся здесь.</div></div>')) +
        (st.tab === 'study' && list.length ? '<button class="btn btn-primary btn-block" data-go="H4">' + icon('route') + 'Построить маршрут по Экспо</button>' : '') +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('h3-tab', el => { D.st('H3').tab = el.dataset.arg; D.rerender(); });
  D.action('h3-status', el => {
    const st = D.st('H3');
    const id = el.dataset.arg;
    const cur = st.st[id] || 'хочу посетить';
    const i = (STUDY_STATUSES.indexOf(cur) + 1) % STUDY_STATUSES.length;
    st.st[id] = STUDY_STATUSES[i];
    D.toast('Статус: ' + STUDY_STATUSES[i]);
    D.rerender();
  });
  D.action('h3-note', el => {
    const st = D.st('H3');
    const id = el.dataset.arg;
    D.openSheet('<div class="sheet-title">Заметка</div>' +
      '<div class="field"><textarea class="textarea" id="h3-note-ta" maxlength="280" placeholder="Что важно запомнить по этому решению">' + esc(st.notes[id] || '') + '</textarea></div>' +
      '<button class="btn btn-primary btn-block" data-act="h3-note-save" data-arg="' + id + '">Сохранить</button>');
  });
  D.action('h3-note-save', el => {
    const st = D.st('H3');
    const ta = document.querySelector('#h3-note-ta');
    st.notes = st.notes || {};
    st.notes[el.dataset.arg] = ta ? ta.value.slice(0, 280) : '';
    D.closeSheet();
    D.rerender();
  });
  D.action('h3-del', el => {
    const st = D.st('H3');
    st.removed = st.removed || {};
    st.removed[el.dataset.arg] = true;
    D.toast('Убрано из списка');
    D.rerender();
  });
  D.action('h3-unsave', el => {
    const st = D.st('H3');
    st.saved = st.saved || {};
    delete st.saved[el.dataset.arg];
    D.toast('Убрано из сохранённых');
    D.rerender();
  });

  /* ---------- H4 Маршрут по Экспо ---------- */
  D.register('H4', {
    tab: 'H1',
    meta: {
      title: 'H4 · Маршрут по Экспо',
      role: 'Гость / участник',
      fr: ['FR-EXPO-05', 'FR-MAP-04'],
      ac: ['AC-EXPO-04'],
      what: [
        'Упорядоченный маршрут по изученным стендам: шесть точек в порядке обхода.',
        'Время перехода между стендами и общее время обхода.',
        'Старт и финиш маршрута, точки на схеме Экспо.'
      ],
      rules: [
        'Порядок обхода оптимизируется по зонам и дорожкам выставки.',
        'Время перехода — из матрицы переездов внутри Экспо (3–5 минут между стендами).',
        'Маршрут перестраивается при изменении списка «Изучить».'
      ],
      depends: ['план Экспо', 'матрица переездов']
    },
    html(ctx) {
      const R = F.STAND_ROUTE;
      const total = F.EXPO_WALK_MIN;
      const steps = R.map(s => {
        const e = F.exhibitor(s.ex);
        return '<div class="prog-item"><div class="pi-time">' + s.n + '</div>' +
          '<div class="pi-body"><div class="pi-title">' + esc(e.name) + ' — ' + esc(e.what) + '</div>' +
          '<div class="pi-sub">' + esc(s.zone) + (s.n < R.length ? ' · переход ' + (3 + (s.n % 3)) + ' мин' : '') + '</div></div>' +
          '<button class="btn btn-ghost btn-sm" data-go="H2/' + s.ex + '">Карточка</button></div>';
      }).join('');
      /* схема: упрощённый вид экспо-зон */
      const svg = '<svg viewBox="0 0 340 190" role="img" aria-label="Схема обхода стендов">' +
        '<rect width="340" height="190" rx="14" fill="var(--card)" stroke="var(--line)"/>' +
        '<rect x="20" y="30" width="90" height="60" rx="8" fill="var(--surface-2)" stroke="var(--line)"/>' +
        '<rect x="125" y="30" width="90" height="60" rx="8" fill="var(--surface-2)" stroke="var(--line)"/>' +
        '<rect x="230" y="30" width="90" height="60" rx="8" fill="var(--surface-2)" stroke="var(--line)"/>' +
        '<rect x="20" y="110" width="90" height="50" rx="8" fill="var(--surface-2)" stroke="var(--line)"/>' +
        '<rect x="125" y="110" width="195" height="50" rx="8" fill="var(--surface-2)" stroke="var(--line)"/>' +
        '<path class="route-line" d="M40 60 H60 M65 60 L115 60 M130 60 H160 M165 60 L215 60 M230 60 H260 M265 60 L300 60 M300 60 V135 H180" opacity=".9"/>' +
        R.map((s, i) => {
          const pos = [[65, 55], [170, 55], [275, 55], [65, 135], [170, 135], [275, 135]][i];
          return '<circle class="route-dot" cx="' + pos[0] + '" cy="' + pos[1] + '" r="9"/>' +
            '<text x="' + (pos[0] + 13) + '" y="' + (pos[1] + 4) + '" font-size="11" font-weight="700" fill="var(--accent-text)">' + s.n + '</text>';
        }).join('') +
        '<text x="30" y="22" font-size="11" fill="var(--ink-dim)">Зона 1</text>' +
        '<text x="135" y="22" font-size="11" fill="var(--ink-dim)">Зона 2</text>' +
        '<text x="240" y="22" font-size="11" fill="var(--ink-dim)">Зона 3</text>' +
        '</svg>';
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="H3" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">' + esc(F.NOW.dateLong) + '</div><h1>Маршрут по Экспо</h1>' +
        '<div class="sub">' + R.length + ' стендов · около ' + total + ' минут</div></div>' +
        '<span class="sess-time">' + total + ' мин</span></div>' +
        '</div>' +
        paren('время обхода с переходами между зонами') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="map-wrap">' + svg + '</div>' +
        '<div class="card" style="padding:4px 16px"><div class="sec-title" style="margin:10px 0 4px">Порядок обхода</div>' + steps + '</div>' +
        '<div class="banner">' + icon('clock') + '<div class="cap">Старт: главный вход Экспо · финиш: Зона 3 · переходы по дорожкам выставки.</div></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });

  /* ---------- H5 Экспо-расписание ---------- */
  D.register('H5', {
    tab: 'H1',
    meta: {
      title: 'H5 · Экспо-расписание',
      role: 'Гость, выставка',
      fr: ['FR-EXPO-06'],
      ac: ['AC-EXPO-06'],
      what: [
        'Воркшопы экспонентов на сегодня: время, зал, остаток мест, ваша запись.',
        'Запись на воркшоп — кнопкой, отмена из списка.',
        'Переход в карточку экспонента из строки.'
      ],
      rules: [
        'Место резервируется при записи; за 10 минут до начала бронь сгорает при неявке.',
        'Воркшопы идут в залах 2 этажа и Конгресс-центре — переход по матрице.',
        'Один человек — одна запись на воркшоп одновременно.'
      ],
      depends: ['программа экспо', 'места']
    },
    html(ctx) {
      const st = ctx.state;
      st.booked = st.booked || {};
      const rows = F.WORKSHOPS.map(w => {
        const ex = F.exhibitor(w.ex);
        const booked = st.booked[w.ex] !== undefined ? st.booked[w.ex] : w.booked;
        return '<div class="row"><div class="grow"><div class="r-title">' + esc(w.title) + '</div>' +
          '<div class="r-sub">' + esc(ex ? ex.name : '') + ' · ' + esc(w.time) + ' · ' + esc(F.hall(w.hall).name) + '</div>' +
          '<div class="cap" style="margin-top:2px">осталось мест: ' + w.left + (booked ? ' · вы записаны' : '') + '</div></div>' +
          '<div style="display:flex;flex-direction:column;gap:6px;align-items:flex-end">' +
          (ex ? '<button class="btn btn-ghost btn-sm" data-go="H2/' + w.ex + '">Экспонент</button>' : '') +
          '<button class="btn btn-' + (booked ? 'ghost' : 'primary') + ' btn-sm" data-act="h5-book" data-arg="' + w.ex + '">' + (booked ? 'Отменить' : 'Записаться') + '</button></div></div>';
      }).join('');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="H1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Экспо</div><h1>Расписание</h1>' +
        '<div class="sub">воркшопы сегодня · ' + F.WORKSHOPS.length + ' событий</div></div></div>' +
        '</div>' +
        paren('запись держит место за вами') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="card" style="padding:2px 16px"><div class="list">' + rows + '</div></div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">Время перехода до зала посчитано по матрице — успевайте к началу.</div></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('h5-book', el => {
    const st = D.st('H5');
    st.booked = st.booked || {};
    const ex = el.dataset.arg;
    const w = F.WORKSHOPS.find(x => x.ex === ex);
    const now = st.booked[ex] === undefined ? w.booked : st.booked[ex];
    st.booked[ex] = !now;
    D.toast(now ? 'Запись отменена' : 'Вы записаны — место удерживается');
    D.rerender();
  });

  /* ---------- H6 Предложения ---------- */
  D.register('H6', {
    tab: 'H1',
    meta: {
      title: 'H6 · Предложения',
      role: 'Гость, лента предложений',
      fr: ['FR-PART-03'],
      ac: ['AC-PART-03'],
      what: [
        'Лента адресных предложений: от партнёров, экспонентов, участников и организатора.',
        'У каждого — источник, суть и срок действия.',
        'Кнопка действия: записаться, открыть стенд, сохранить.'
      ],
      rules: [
        'Предложения от экспонентов проходят модерацию перед публикацией.',
        'Срок действия показан; просроченные скрываются из ленты.',
        'Частота — не больше одной рассылки в час на человека (кроме срочных).'
      ],
      depends: ['модерация предложений', 'каналы уведомлений']
    },
    html(ctx) {
      const kindTag = { 'партнёр': 'accent', 'экспонент': '', 'участник': '', 'организатор': 'urgent' };
      const rows = F.OFFERS.map(o =>
        '<div class="feed-item"><span class="feed-kind"></span><div style="flex:1;min-width:0">' +
        '<div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap"><span class="feed-text" style="font-weight:600">' + esc(o.from) + '</span>' +
        tag(o.kind, kindTag[o.kind] || '') + '<span class="feed-time" style="margin-left:auto">' + esc(o.until) + '</span></div>' +
        '<div class="feed-text" style="margin-top:2px">' + esc(o.text) + '</div>' +
        '<div style="display:flex;gap:14px;margin-top:6px">' +
        '<button class="feed-link" data-go="H1">К экспонентам ' + icon('chevR') + '</button>' +
        '<button class="feed-link" data-act="h6-save" data-arg="' + o.id + '">Сохранить</button></div></div></div>').join('');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="H1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Экспо</div><h1>Предложения</h1>' +
        '<div class="sub">адресные офферы на сегодня</div></div></div>' +
        '</div>' +
        paren('только проверенные предложения') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="card" style="padding:4px 16px"><div class="list">' + rows + '</div></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('h6-save', () => D.toast('Предложение сохранено'));

  /* ---------- H7 Отметка стенда ---------- */
  D.register('H7', {
    tab: 'H1',
    meta: {
      title: 'H7 · Отметка стенда',
      role: 'Гость, экспо',
      fr: ['FR-EXPO-07'],
      ac: ['AC-EXPO-07'],
      what: [
        'Сканирование метки стенда: честная заглушка камеры.',
        'Карточка результата: стенд, экспонент, история визитов.',
        'Действия после визита: заметка, заявка на встречу, «Изучить».'
      ],
      rules: [
        'Метка привязана к стенду; повторный скан обновляет время визита.',
        'Визит попадает в «Мои итоги» и учитывается в аналитике экспонента.',
        'Камера в демо — заглушка; в продукте сканирует метку стенда.'
      ],
      depends: ['метки стендов', 'согласие на обмен']
    },
    html(ctx) {
      const sc = F.STAND_CHECK;
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="H1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Экспо · Зона 1</div><h1>Стенд ' + esc(sc.stand) + '</h1>' +
        '<div class="sub">' + esc(sc.name) + '</div></div></div>' +
        '</div>' +
        paren('метка привязана к стенду') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="scan-stage" style="min-height:180px">' +
        '<div class="scan-frame"><i class="c"></i></div>' +
        '<div class="scan-hint">Наведите камеру на метку стенда ' + esc(sc.stand) + '</div></div>' +
        '<div class="scan-result scan-ok"><div class="card-row">' + icon('check') +
        '<div><div class="r-title">' + esc(sc.name) + ' · стенд ' + esc(sc.stand) + '</div>' +
        '<div class="r-sub">' + esc(sc.visited) + ' · ' + esc(sc.note) + '</div></div></div></div>' +
        '<div class="grid-2">' +
        '<button class="btn btn-primary" data-go="G2">Встреча</button>' +
        '<button class="btn btn-secondary" data-go="M2">Заметка</button></div>' +
        '<button class="btn btn-ghost btn-block" data-act="h7-study">В «Изучить»</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('h7-study', () => D.toast('Добавлено в «Изучить»'));
})();
