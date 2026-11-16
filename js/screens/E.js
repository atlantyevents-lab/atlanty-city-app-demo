/* Блок E — карта. Фаза B: E1 «План Завидово», E4 «Маршрут». */
(function () {
  const D = window.Demo, F = window.FIX;
  const { esc, icon, paren, tag } = D;

  /* демонстрационная SVG-схема: обводы зданий, зоны, топография фоном */
  function mapSVG(opts) {
    const zones = F.MAP_ZONES;
    const layer = opts.layer || 'halls';
    let zonesHtml = zones.map(z => {
      const on = layer === 'all' || layer === 'halls' || layer === z.id || (layer === 'stands' && z.id === 'expo');
      const stroke = on ? 'var(--accent-edge)' : 'var(--line)';
      const fill = on ? 'var(--surface-2)' : 'var(--card)';
      return '<g>' +
        '<rect x="' + z.x + '" y="' + z.y + '" width="' + z.w + '" height="' + z.h + '" rx="14" fill="' + fill + '" stroke="' + stroke + '" stroke-width="1.5"/>' +
        '<text x="' + (z.x + 14) + '" y="' + (z.y + 30) + '" font-family="Bebas, sans-serif" font-size="21" letter-spacing="2" fill="var(--ink)">' + esc(z.name.toUpperCase()) + '</text>' +
        '<text x="' + (z.x + 14) + '" y="' + (z.y + 52) + '" font-family="Raleway, sans-serif" font-size="12.5" fill="var(--ink-dim)">' + esc(z.note) + '</text>' +
        '</g>';
    }).join('');

    /* дорожки графа (демо) */
    const paths = [
      'M170 210 V250', 'M290 135 H330', 'M450 230 V270', 'M570 135 H620',
      'M290 320 H330', 'M760 210 V330', 'M450 320 H620'
    ].map(d => '<path d="' + d + '" stroke="var(--line)" stroke-width="2" stroke-dasharray="5 5" fill="none"/>').join('');

    /* точки интереса по слоям */
    let dots = '';
    if (layer === 'food' || layer === 'all') {
      dots += '<circle cx="170" cy="300" r="7" fill="var(--accent-solid)"/><text x="186" y="305" font-size="12" fill="var(--ink)">кафе у Эдельвейса</text>';
      dots += '<circle cx="760" cy="120" r="7" fill="var(--accent-solid)"/><text x="776" y="125" font-size="12" fill="var(--ink)">столовая Конгресс-центра</text>';
    }
    if (layer === 'svc' || layer === 'all') {
      dots += '<circle cx="170" cy="110" r="7" fill="var(--accent-solid)"/><text x="186" y="115" font-size="12" fill="var(--ink)">стойка регистрации</text>';
      dots += '<circle cx="450" cy="120" r="7" fill="var(--accent-solid)"/><text x="466" y="125" font-size="12" fill="var(--ink)">медпункт</text>';
      dots += '<circle cx="620" cy="380" r="7" fill="var(--accent-solid)"/><text x="520" y="404" font-size="12" fill="var(--ink)">гардероб Экспо</text>';
    }
    if (layer === 'stands' || layer === 'all') {
      for (let i = 0; i < 12; i++) {
        const x = 645 + (i % 4) * 62, y = 95 + Math.floor(i / 4) * 62;
        dots += '<rect x="' + x + '" y="' + y + '" width="40" height="30" rx="4" fill="var(--surface-2)" stroke="var(--line)"/>' +
          '<text x="' + (x + 20) + '" y="' + (y + 19) + '" font-size="10" text-anchor="middle" fill="var(--ink-dim)">' + (i + 1) + '</text>';
      }
      dots += '<text x="645" y="330" font-size="12" fill="var(--ink-dim)">стенды Экспо, зоны 1–3</text>';
    }

    const route = opts.route ?
      '<path class="route-line" d="M80 420 C 200 420 260 300 330 240 S 500 160 620 140"/>' +
      '<circle class="route-dot" cx="80" cy="420" r="8"/>' +
      '<circle class="route-dot" cx="620" cy="140" r="8"/>' +
      '<text x="80" y="440" font-size="12" font-weight="700" fill="var(--accent-text)">Вы здесь</text>' +
      '<text x="560" y="128" font-size="12" font-weight="700" fill="var(--accent-text)">Цель</text>' : '';

    /* топография фоном: тот же mask-слой внутри svg через foreignObject нельзя — кладём отдельным div поверх */
    return zonesHtml + paths + dots + route;
  }

  function mapBlock(layer, route) {
    return '<div class="map-wrap topo-host">' + D.topo() +
      '<svg viewBox="0 0 900 470" role="img" aria-label="Демонстрационная схема площадки Завидово">' +
      '<rect width="900" height="470" fill="var(--card)"/>' +
      mapSVG({ layer, route }) +
      '<text x="24" y="452" font-size="11" fill="var(--ink-dim)">схема демонстрационная · не к масштабу</text>' +
      '</svg></div>';
  }

  /* ---------- E1 План Завидово ---------- */
  D.register('E1', {
    tab: 'MORE',
    meta: {
      title: 'E1 · План Завидово',
      role: 'Гость / участник',
      fr: ['FR-MAP-01', 'FR-MAP-02', 'FR-MAP-03'],
      ac: ['AC-MAP-01', 'AC-MAP-03'],
      what: [
        'Схема площадки: обводы зданий с реальными названиями (Основной отель с Эдельвейсом и Магнолией, Конгресс-центр, Рэдиссон с Баллрумом, Экспо).',
        'Слой топографии слабым фоном; чипы слоёв: залы, питание, сервисы, стенды.',
        'Подпись «схема демонстрационная» — планов в проекте нет.'
      ],
      rules: [
        'Привязка объектов к залам и стендам — по идентификаторам hall_id, stand_id, space_id.',
        'Карта и граф кэшируются для работы без сети.',
        'Схема демонстрационная: обводы условные, названия и ёмкости настоящие.'
      ],
      depends: ['O-06', 'планы корпусов от команды']
    },
    html(ctx) {
      const st = ctx.state;
      st.layer = st.layer || 'halls';
      const chips = F.MAP_LAYERS.map(l =>
        '<button class="chip map-chip' + (st.layer === l.id ? ' on' : '') + '" data-act="e1-layer" data-arg="' + l.id + '">' + esc(l.label) + '</button>').join('');
      const legend = F.HALLS.slice(0, 5).map(h => tag(h.name + ' · ' + h.place.split(',')[0])).join(' ');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="B1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">' + esc(F.NOW.dateLong) + '</div><h1>План Завидово</h1>' +
        '<div class="sub">Корпуса и зоны площадки</div></div>' +
        '<button class="icon-btn" data-act="e1-search" aria-label="Поиск на плане">' + icon('search') + '</button></div>' +
        '</div>' +
        paren('схема демонстрационная, планы даст команда') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="chips" style="padding-top:0">' + chips + '</div>' +
        mapBlock(st.layer, false) +
        '<div class="map-legend">' + legend + '</div>' +
        '<div class="card"><div class="sec-title" style="margin:0 0 4px">Быстрые переходы</div><div class="list">' +
        F.HALLS.slice(0, 4).map(h =>
          '<button class="row clickable" data-go="E4">' + icon('pin') + '<div class="grow"><div class="r-title" style="font-size:14px">' + esc(h.name) + '</div><div class="r-sub">' + esc(h.place) + ' · до ' + h.cap + '</div></div>' + icon('chevR') + '</button>').join('') +
        '</div></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('e1-layer', el => { D.st('E1').layer = el.dataset.arg; D.rerender(); });
  D.action('e1-search', () => D.toast('Поиск по плану — в следующей фазе'));

  /* ---------- E4 Маршрут ---------- */
  D.register('E4', {
    tab: 'MORE',
    meta: {
      title: 'E4 · Маршрут',
      role: 'Гость / участник',
      fr: ['FR-MAP-04', 'FR-MAP-02'],
      ac: ['AC-MAP-02'],
      what: [
        'Построенный маршрут между двумя точками: «Вы здесь» и «Цель» на схеме.',
        'Время пешком и описание пути по дорожкам и входам.',
        'Лист с деталями маршрута и альтернативой.'
      ],
      rules: [
        'Маршрут строится по графу дорожек и входов; время — из матрицы переездов.',
        'Точка «я здесь» — по геопозиции или выбору на плане (в демо — задана).',
        'Схема демонстрационная.'
      ],
      depends: ['O-06']
    },
    html(ctx) {
      const R = F.ROUTE_DEMO;
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="E1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">' + esc(F.NOW.dateLong) + '</div><h1>Маршрут</h1>' +
        '<div class="sub">' + esc(R.from) + ' › ' + esc(R.to) + '</div></div>' +
        '<span class="sess-time">' + R.min + ' мин</span></div>' +
        '</div>' +
        paren('время пешком по графу дорожек') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        mapBlock('halls', true) +
        '<div class="card"><div class="card-title" style="font-size:15px">' + esc(R.from) + ' › ' + esc(R.to) + '</div>' +
        '<div class="cap">' + esc(R.path) + ' · около ' + R.min + ' минут пешком</div>' +
        '<div class="card-foot"><span class="cap">обновлено по текущей точке</span>' +
        '<button class="btn btn-ghost btn-sm" data-act="e4-alt">Другой вход</button></div></div>' +
        '<div class="card"><div class="sec-title" style="margin:0 0 4px">Следующая точка</div>' +
        '<div class="row" data-go="E1"><div class="grow"><div class="r-title" style="font-size:14px">Эдельвейс · сессия в 11:35</div><div class="r-sub">Магнолия › Эдельвейс: 4 мин по матрице</div></div>' + icon('chevR') + '</div></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('e4-alt', () => D.toast('Альтернативный вход построен: +2 минуты'));

  /* ---------- E2 План этажа ---------- */
  D.register('E2', {
    tab: 'E1',
    meta: {
      title: 'E2 · План этажа',
      role: 'Гость, карта площадки',
      fr: ['FR-MAP-01'],
      ac: ['AC-MAP-01'],
      what: [
        'План Конгресс-центра с переключателем этажей: 1 этаж — сцена на 500 и выставка, 2 этаж — Соболь, Дойбица, Шоша.',
        'Комнаты рисуются схемой с подписями и вместимостью.',
        'Подсветка показывает, где идёт ваша следующая сессия.'
      ],
      rules: [
        'Схема демонстрационная: точные размеры и расположение уточняются по плану площадки.',
        'Этаж 2 занимает экспо-зону; переход между этажами — по лестницам и лифту фойе.',
        'Подсветка строится по программе дня и вашей записи.'
      ],
      depends: ['план площадки', 'программа']
    },
    html(ctx) {
      const st = ctx.state;
      st.fl = st.fl || 'f1';
      const fl = F.CONGRESS_FLOORS.find(f => f.id === st.fl);
      const chips = F.CONGRESS_FLOORS.map(f =>
        '<button class="chip' + (f.id === st.fl ? ' on' : '') + '" data-act="e2-floor" data-arg="' + f.id + '">' + esc(f.label) + '</button>').join('');
      const rooms = fl.rooms.map(r =>
        '<g class="floor-room' + (r.id === 'sobol' ? ' lit' : '') + '" data-go="' + (r.id === 'sobol' ? 'C3/s2707' : 'E1') + '" style="cursor:pointer">' +
        '<rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" rx="10"/>' +
        '<text x="' + (r.x + r.w / 2) + '" y="' + (r.y + r.h / 2 - 2) + '" text-anchor="middle">' + esc(r.name) + '</text>' +
        '<text class="fr-note" x="' + (r.x + r.w / 2) + '" y="' + (r.y + r.h / 2 + 12) + '" text-anchor="middle">' + esc(r.note) + '</text></g>').join('');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="E1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Карта · Конгресс-центр</div><h1>План этажа</h1>' +
        '<div class="sub">' + esc(fl.label) + ' · схема демонстрационная</div></div></div>' +
        '</div>' +
        paren('нажмите на зал, чтобы открыть сессию') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="chips">' + chips + '</div>' +
        '<div class="floor-map"><svg viewBox="0 0 460 250">' + rooms + '</svg></div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">' + esc(fl.label) + ': ' + fl.rooms.map(r => r.name).join(', ') + '. Подсвечен зал вашей записи.</div></div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
  D.action('e2-floor', el => { D.st('E2').fl = el.dataset.arg; D.rerender(); });

  /* ---------- E3 Точка ---------- */
  D.register('E3', {
    tab: 'E1',
    meta: {
      title: 'E3 · Точка',
      role: 'Гость, карта площадки',
      fr: ['FR-MAP-03'],
      ac: ['AC-MAP-03'],
      what: [
        'Карточка точки: зал Магнолия, этаж, вместимость, режим дня.',
        'Сегодняшние сессии в этом зале и «ближайшие» сверху.',
        'Кнопка «Маршрут» строит путь от текущей точки до зала.'
      ],
      rules: [
        'Ближайшие сессии считаются от текущего времени демо-дня.',
        'Менторская гостиная в Магнолии работает по окнам — запись через G2.',
        'Маршрут использует матрицу переездов и текущую точку пользователя.'
      ],
      depends: ['матрица переездов', 'программа']
    },
    html(ctx) {
      const p = F.POINT_MAGNOLIA;
      const sess = F.sessionsOf('27.02').filter(s => s.hall === 'magnolia');
      const rows = p.today.concat(sess.slice(0, 3).map(s => s.title + ' · ' + s.time)).map(t =>
        '<div class="row"><div class="grow"><div class="r-sub">' + esc(t) + '</div></div>' + icon('chevR') + '</div>').join('');
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="E1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Точка · Основной отель</div><h1>' + esc(p.name) + '</h1>' +
        '<div class="sub">' + esc(p.place) + ' · до ' + p.cap + ' мест</div></div></div>' +
        '</div>' +
        paren('сегодня в этом зале — ' + p.today.length + ' события') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card accent-edge"><div class="card-head"><div><div class="cap">Сейчас и дальше</div>' +
        '<div class="card-title" style="margin-top:2px">Ближайшее — через 25 минут</div></div>' +
        tag('9 этаж', 'accent') + '</div>' +
        '<div class="r-sub" style="margin-top:6px">' + esc(p.note) + '</div></div>' +
        '<div class="card"><div class="sec-title" style="margin:0 0 4px">Сегодня в зале</div>' +
        '<div class="list" style="padding:0">' + rows + '</div></div>' +
        '<button class="btn btn-primary btn-block" data-go="E4">' + icon('route') + 'Маршрут до зала</button>' +
        '<div style="height:16px"></div></div></div>';
    }
  });

  /* ---------- E5 Мой маршрут ---------- */
  D.register('E5', {
    tab: 'E1',
    meta: {
      title: 'E5 · Мой маршрут',
      role: 'Гость, карта площадки',
      fr: ['FR-MAP-05'],
      ac: ['AC-MAP-05'],
      what: [
        'Порядок дня подряд: стенд, сессия, встреча — с временем и местом.',
        'Запас времени на переход между точками по матрице.',
        'Список и мини-план; каждую точку можно открыть.'
      ],
      rules: [
        'Порядок строится по времени; при конфликте показывается предупреждение.',
        'Запас на переход берётся из матрицы переездов издания.',
        'Встречи учитываются с местом пространства (стенд, комната сделок).'
      ],
      depends: ['матрица переездов', 'записи', 'встречи']
    },
    html(ctx) {
      const pts = [
        { t: '12:30', kind: 'сессия', title: 'Практикум: переговоры о цене', place: 'Шоша, Экспо 2 этаж', src: 'C3/s2712' },
        { t: '14:00', kind: 'встреча', title: 'ТехноСклад · Ольга Рябова', place: 'Стенд А-12, Зона 1', src: 'G4' },
        { t: '16:30', kind: 'сессия', title: 'Практикум: продажи через партнёров', place: 'Соболь, Экспо 2 этаж', src: 'C3/s2705' }
      ];
      const rows = pts.map((p, i) =>
        '<button class="row clickable" data-go="' + p.src + '"><div class="grow">' +
        '<div class="r-title">' + esc(p.title) + '</div>' +
        '<div class="r-sub">' + esc(p.t) + ' · ' + esc(p.place) + '</div></div>' +
        '<span class="sess-time">' + (i + 1) + '</span>' + icon('chevR') + '</button>').join('');
      const legs = F.travelMin('shosha', 'sobol') ? '<div class="r-sub">Шоша › стенд А-12: ' + (F.travelMin('shosha', 'sobol') || '—') + ' мин · стенд › Соболь: 4 мин</div>' : '';
      return '<div class="scr">' +
        '<div class="scr-head"><div class="head-row"><div>' +
        '<button class="icon-btn" data-go="E1" aria-label="Назад">' + icon('back') + '</button>' +
        '</div><div><div class="eyebrow">Карта · Завидово</div><h1>Мой маршрут</h1>' +
        '<div class="sub">' + esc(F.NOW.dateLong) + ' · ' + pts.length + ' точки</div></div></div>' +
        '</div>' +
        paren('запас на переход посчитан по матрице') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="map-plate" style="min-height:150px"><div class="ic">' + icon('route') + '</div>' +
        '<div style="font-size:14px;font-weight:600">Экспо, 2 этаж › Зона 1 › Экспо, 2 этаж</div>' +
        '<div class="cap" style="margin-top:4px">пешком около 18 минут суммарно · по матрице переездов</div></div>' +
        '<div class="card" style="padding:2px 16px"><div class="list">' + rows + '</div>' + legs + '</div>' +
        '<div style="height:16px"></div></div></div>';
    }
  });
})();
