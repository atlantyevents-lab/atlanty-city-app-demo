/* Блок E — карта Завидово: E1 векторная карта, E6 бухта, E7 аэрофото,
   E2 план этажа, E3 точка, E4/E5 маршруты. Данные: assets/map/*. */
(function () {
  const D = window.Demo, F = window.FIX, MAP = window.MAP;
  const { esc, icon, paren, tag } = D;
  const PUBLIC = !!window.DEMO_PUBLIC;

  const GEO = { w: 36.48777, s: 56.5775, e: 36.56723, n: 56.6125 };
  const BAY_WIN = { w: 36.511, s: 56.5835, e: 36.529, n: 56.5995 };

  /* Переключатель видов карты. Карта больше не вкладка: вход из шапки и из переходов Программы
     и Маркетплейса, «назад» в шапке E1/E6/E7 ведёт по истории (backHist). Чтобы переключение
     видов не засоряло историю, оно заменяет текущую запись (location.replace). */
  function segMap(active) {
    const segs = [['E1', 'Курорт'], ['E6', 'Бухта']];
    if (!PUBLIC) segs.push(['E7', 'Вид сверху']);
    return '<div class="segbar">' + segs.map(it =>
      '<button class="seg' + (it[0] === active ? ' on' : '') + '" data-act="map-seg" data-arg="' + it[0] + '">' + esc(it[1]) + '</button>').join('') + '</div>';
  }
  D.action('map-seg', el => {
    const id = el.dataset.arg;
    if (location.hash === '#/' + id) return;
    location.replace(location.pathname + location.search + '#/' + id);
  });

  /* метки точек для листа: id метки -> что здесь и какие залы программы рядом */
  const PIN_INFO = {
    pin_bay: { what: 'Главная бухта: набережная, яхт-клуб, Эрбелия (основной отель) и Рэдиссон. По решению заказчика: Эрбелия = залы Эдельвейс и Магнолия; Рэдиссон = Баллрум (Б) и (С); Конгресс-центр = КипяTALK, Дойбица, Соболь и Шоша.', halls: ['congress', 'doybitsa', 'sobol', 'shosha', 'ballroomB', 'ballroomS', 'edelveis', 'magnolia'] },
    pin_yacht: { what: 'Яхт-клуб и причалы. В программе фестиваля залы не привязаны — активности и сервисы курорта.', halls: [] },
    pin_family: { what: 'Семейный парк. В программе фестиваля залы не привязаны — активности и сервисы курорта.', halls: [] },
    pin_banya: { what: 'Бани и причал. В программе фестиваля залы не привязаны — активности и сервисы курорта.', halls: [] },
    pin_yamskaya: { what: 'Ямская слобода — историческая зона курорта. В программе фестиваля залы не привязаны.', halls: [] },
    pin_akvatoriya: { what: 'Мультиспорт «Акватория лета». В программе фестиваля залы не привязаны — активности и сервисы курорта.', halls: [] },
    pin_ski: { what: 'Горка — зимняя трасса. В программе фестиваля залы не привязаны — активности и сервисы курорта.', halls: [] },
    pin_river: { what: 'Речной вокзал (строится). В программе фестиваля залы не привязаны.', halls: [] },
    pin_golf: { what: 'Гольф-клуб. В программе фестиваля залы не привязаны — активности и сервисы курорта.', halls: [] },
    pin_yamles: { what: 'Ямской лес. В программе фестиваля залы не привязаны — активности и сервисы курорта.', halls: [] }
  };

  const PIN_GEO = {
    pin_bay: ['Главная бухта', [36.520199, 56.590251]], pin_yacht: ['Яхт-клуб, причалы, пляж', [36.52123, 56.59289]],
    pin_family: ['Семейный парк', [36.52534, 56.594968]], pin_banya: ['Бани и причал', [36.513973, 56.600297]],
    pin_yamskaya: ['Ямская слобода', [36.537111, 56.595516]], pin_akvatoriya: ['Мультиспорт «Акватория лета»', [36.51153, 56.59816]],
    pin_ski: ['Горка (зимняя трасса)', [36.50199, 56.59549]], pin_river: ['Речной вокзал (строится)', [36.52497, 56.60469]],
    pin_golf: ['Гольф-клуб', [36.55342, 56.58044]], pin_yamles: ['Ямской лес', [36.54742, 56.59711]]
  };
  function todayHallsHtml(hallIds) {
    if (!hallIds.length) return '';
    const rows = F.sessionsOf('27.02').filter(s => hallIds.includes(s.hall));
    if (!rows.length) return '';
    return '<div class="cap" style="margin-top:6px">Сегодня в программе:</div>' +
      rows.slice(0, 6).map(s =>
        '<button class="row clickable" data-go="C3/' + s.id + '"><div class="grow"><div class="r-sub">' + esc(s.time) + ' · ' + esc(s.title) + '</div></div>' + icon('chevR') + '</button>').join('');
  }

  function pointSheet(pin) {
    const info = PIN_INFO[pin.id] || { what: 'Точка курорта Завидово.', halls: [] };
    const you = pin.coords; // [lon,lat] метки
    const bay = [36.520199, 56.590251];
    const km = MAP.distKm(bay, you);
    const mins = MAP.walkMin(km);
    const halls = (info.halls || []).map(id => F.hall(id)).filter(Boolean);
    D.openSheet(
      '<div class="sheet-title">' + esc(pin.label || pin.id) + '</div>' +
      '<div class="cap" style="margin:4px 0 10px">' + esc(info.what) + '</div>' +
      (halls.length ? '<div class="cap" style="margin-bottom:4px">Залы программы:</div>' +
        halls.map(h => '<button class="row clickable" data-go="E3/' + h.id + '"><div class="grow"><div class="r-title" style="font-size:14px">' + esc(h.name) + '</div><div class="r-sub">' + esc(h.place) + '</div></div>' + icon('chevR') + '</button>').join('') : '') +
      todayHallsHtml(info.halls || []) +
      '<div class="cap" style="margin-top:10px">Пешком от «Вы здесь»: ~' + mins + ' ' + D.plural(mins, ['минута', 'минуты', 'минут']) + ' · демо-расчёт по расстоянию (4,5 км/ч)</div>' +
      '<div style="display:flex;gap:8px;margin-top:14px">' +
      '<button class="btn btn-primary" style="flex:1" data-act="e-route-to" data-arg="' + esc(pin.id) + '">' + icon('route') + 'Маршрут</button>' +
      (halls.length ? '<button class="btn btn-ghost" style="flex:1" data-go="C1">В программу</button>' : '') +
      '</div>');
  }
  D.action('e-route-to', el => { location.hash = '#/E4/' + el.dataset.arg; });
  D.action('e6-list', () => { const el = document.getElementById('e6-list'); if (el) el.scrollIntoView({ block: 'center', behavior: 'smooth' }); });

  /* Общий монтаж карты: html() отдаёт контейнер, mount() догружает данные */
  function mountMap(host, sel, build) {
    MAP.load().then(({ g, lw }) => {
      const el = host.querySelector(sel);
      if (!el) return;
      build(el, g, lw);
    });
  }

  function pinsFromGeo(g, win) {
    const { P } = MAP.proj(win);
    const out = [];
    g.features.forEach(f => {
      if (f.properties && f.properties.kind === 'map_pin') {
        const c = f.geometry.coordinates, p = P(c[0], c[1]);
        out.push({ id: f.properties.id, num: f.properties.pin_number, label: f.properties.label_public, x: p[0], y: p[1], coords: c });
      }
    });
    return out.sort((a, b) => a.num - b.num);
  }

  function mapFrame(id, height) {
    return '<div class="mapview" id="' + id + '" style="height:' + (height || 380) + 'px"><div class="mv-loading">Загружаю карту…</div></div>' +
      '<div class="map-tools">' +
      '<button class="icon-btn" data-act="map-zoom" data-arg="1.4" data-map="' + id + '" aria-label="Приблизить">+</button>' +
      '<button class="icon-btn" data-act="map-zoom" data-arg="0.7" data-map="' + id + '" aria-label="Отдалить">−</button>' +
      '<button class="icon-btn" data-act="map-reset" data-map="' + id + '" aria-label="Сбросить вид">' + icon('pin') + '</button>' +
      '</div>' +
      '<div class="cap" style="padding:0 20px">© OpenStreetMap contributors (ODbL)</div>';
  }
  D.action('map-zoom', el => {
    const m = document.querySelector('#' + el.dataset.map);
    if (m && m._map) m._map.zoomBy(+el.dataset.arg);
  });
  D.action('map-reset', el => {
    const m = document.querySelector('#' + el.dataset.map);
    if (m && m._map) m._map.fit();
  });

  /* ---------- E1 Курорт ---------- */
  D.register('E1', {
    tab: '-',
    meta: {
      title: 'E1 · Карта',
      role: 'Гость / участник',
      fr: ['FR-MAP-01', 'FR-MAP-02', 'FR-MAP-03'],
      ac: ['AC-MAP-01', 'AC-MAP-03'],
      what: [
        'Векторная карта курорта Завидово из OpenStreetMap: тропы, вода, здания, парковки.',
        'Десять нумерованных площадок; тап по метке открывает карточку точки.',
        'Слои «Площадки / Парковки / Тропы», масштаб, перемещение, сброс вида.'
      ],
      rules: [
        'Данные карты — OpenStreetMap (ODbL), атрибуция на экране.',
        'Положения меток — по данным проекта; расстояния «пешком» — демо-расчёт 4,5 км/ч.',
        'Планы корпусов (O-06) будут позже — это карта территории, не план зданий.',
        'Карта не вкладка (D-36): вход из значка в шапке и из переходов Программы и Маркетплейса; «назад» в шапке E1, E6, E7 ведёт по истории; панель вкладок видна без активной вкладки.'
      ],
      depends: ['O-06', 'D-36']
    },
    html(ctx) {
      return '<div class="scr">' +
        D.head({backHist:true, eyebrow:'Карта · ' + esc(F.NOW.dateLong), title:'Карта', sub:'Курорт Завидово · векторная карта', paren:paren('данные OpenStreetMap · демо-расчёт расстояний')}) +
        segMap('E1') +
        '<div class="mapview" id="mv-e1"><div class="mv-loading">Загружаю карту…</div></div>' +
        '<div class="mv-layers chip-rail">' +
        '<button class="chip on" data-layer="trail"><i class="ck"></i>Тропы</button>' +
        '<button class="chip on" data-layer="parking"><i class="ck"></i>Парковки</button>' +
        '<button class="chip on" data-layer="water"><i class="ck"></i>Вода</button>' +
        '<button class="chip on" data-layer="building"><i class="ck"></i>Здания</button></div>' +
        '<div class="card" style="margin:10px 20px 0"><div class="sec-title" style="margin:0 0 4px">Площадки</div><div id="e1-places"></div></div>' +
        '<div style="padding:10px 20px 0"><button class="btn btn-ghost btn-block" data-act="e1-list">Список площадок</button></div>' +
        '<div style="height:16px;margin:0 20px"></div></div>';
    },
    mount(host) {
      mountMap(host, '#mv-e1', (el, g) => {
        const pins = pinsFromGeo(g, GEO);
        const bay = pins.find(p => p.id === 'pin_bay');
        const world = MAP.worldSVG(g, GEO);
        el.style.height = Math.round(el.clientWidth * world.H / world.W) + 24 + 'px';
        const ctl = '<button class="mv-btn" data-act="e1-list" aria-label="Список площадок"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M8.5 6h12M8.5 12h12M8.5 18h12"/><circle cx="4.2" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.2" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.2" cy="18" r="1.2" fill="currentColor" stroke="none"/></svg></button>';
        const api = MAP.mount(el, {
          onPin: id => { const p = pins.find(x => x.id === id); if (p) pointSheet(p); },
          pins: pins.map(p => { const q = world.P(p.coords[0], p.coords[1]); return { id: p.id, num: p.num, label: p.label, x: q[0], y: q[1] }; }),
          youAre: bay ? (() => { const q = world.P(bay.coords[0], bay.coords[1]); return { x: q[0], y: q[1] }; })() : null,
          pad: 12,
          avoidPin: 'pin_bay',
          decluster: true,
          ctl: ctl
        });
        api._setP(world.P);
        api.build(world);
        el._map = api;
        const pl = host.querySelector('#e1-places');
        if (pl) pl.innerHTML = pins.map(p =>
          '<button class="row clickable" data-act="e1-pin" data-arg="' + p.id + '"><div class="grow"><div class="r-title" style="font-size:14px;display:flex;align-items:center;gap:10px"><span class="e1-pn">' + p.num + '</span>' + esc(p.label || p.id) + '</div></div>' + icon('chevR') + '</button>').join('');
        /* чипы слоёв лежат под картой — вешаем переключение здесь */
        host.querySelectorAll('.mv-layers [data-layer]').forEach(c => {
          c.addEventListener('click', () => {
            const gEl = el.querySelector('.mv-l[data-layer="' + c.dataset.layer + '"]');
            const on = gEl.getAttribute('data-off') !== '1';
            gEl.setAttribute('data-off', on ? '1' : '0');
            gEl.style.display = on ? 'none' : '';
            c.classList.toggle('on', !on);
          });
        });
      });
    }
  });
  D.action('e1-list', () => {
    MAP.load().then(({ g }) => {
      const pins = pinsFromGeo(g, GEO);
      D.openSheet('<div class="sheet-title">Площадки курорта</div>' +
        '<input class="input" type="search" id="e1-q" placeholder="Найти площадку" aria-label="Поиск площадки" style="margin:0 0 8px">' +
        '<div id="e1-pinlist">' +
        pins.map(p => '<button class="row clickable" data-act="e1-pin" data-arg="' + p.id + '"><div class="grow"><div class="r-title" style="font-size:14px">' + (p.num) + '. ' + esc(p.label || p.id) + '</div></div>' + icon('chevR') + '</button>').join('') +
        '</div>');
      const q = document.getElementById('e1-q');
      if (q) q.addEventListener('input', () => {
        const v = q.value.trim().toLowerCase();
        document.querySelectorAll('#e1-pinlist [data-act="e1-pin"]').forEach(b => {
          b.style.display = !v || b.textContent.toLowerCase().includes(v) ? '' : 'none';
        });
      });
    });
  });
  D.action('e1-pin', el => {
    MAP.load().then(({ g }) => {
      const pins = pinsFromGeo(g, GEO);
      const p = pins.find(x => x.id === el.dataset.arg);
      D.closeSheet();
      if (p) pointSheet(p);
    });
  });

  /* ---------- E6 Бухта ---------- */
  D.register('E6', {
    tab: '-',
    meta: {
      title: 'E6 · Бухта',
      role: 'Гость, карта',
      fr: [], ac: [],
      what: [
        'Крупный фрагмент главной бухты: обводы зданий и проверенные точки курорта.',
        'Метки — по подтверждённым координатам; объекты без координат — только в списке с пометкой.',
        'Схема; планы корпусов будут позже.'
      ],
      rules: [
        'Названия и привязка корпусов — по материалам проекта, курортом не подтверждены.',
        'Звёздность Бревис на сайте курорта не найдена.',
        'Слои «залы / питание / сервисы / стенды» появятся с планами площадки.'
      ],
      depends: ['O-06']
    },
    html() {
      return '<div class="scr">' +
        D.head({backHist:true, eyebrow:'Карта · ' + esc(F.NOW.dateLong), title:'Бухта', sub:'Главная бухта · здания и точки', paren:paren('схема; планы корпусов будут позже')}) +
        segMap('E6') +
        '<div class="mapview" id="mv-e6"><div class="mv-loading">Загружаю карту…</div></div>' +
        '<div class="cap" style="margin:8px 20px 0">© OpenStreetMap contributors (ODbL) · тап по метке — карточка точки</div>' +
        '<div class="card" style="margin:12px 20px 0"><div class="sec-title" style="margin:0 0 4px">Точки бухты</div><div id="e6-list"></div></div>' +
        '<div style="height:16px;margin:0 20px"></div></div>';
    },
    mount(host) {
      mountMap(host, '#mv-e6', (el, g, l) => {
        const lwLabels = (l && l.labels) || [];
        const lwById = {}; lwLabels.forEach(x => lwById[x.id] = x);
        /* окно вида — по габариту подтверждённых точек бухты + ~200 м */
        const anchorIds = ['radisson', 'residences', 'ryabina', 'erbelia', 'aquapark', 'yacht_main'];
        const anchors = [];
        g.features.forEach(f => {
          const p = f.properties || {};
          if (f.geometry.type === 'Point' && !p.kind && anchorIds.includes(p.id)) {
            const c = (p.official_coords || p.osm_coords);
            if (c) anchors.push([c[1], c[0]]);
          }
        });
        const win = bayWindowFrom(anchors);
        const world = MAP.worldSVG(g, win);
        el.style.height = Math.round(el.clientWidth * world.H / world.W) + 24 + 'px';
        /* метки: только объекты labels_winter.json с подтверждёнными координатами */
        const coordOf = {};
        g.features.forEach(f => {
          const p = f.properties || {};
          if (f.geometry.type === 'Point' && !p.kind) {
            const c = p.official_coords || p.osm_coords;
            if (c) coordOf[p.id] = [c[1], c[0]];
          }
        });
        coordOf['marina'] = coordOf['yacht_main']; /* «Набережная и яхт-клуб» -> точка яхт-клуба */
        const placed = [], noCoord = [];
        lwLabels.forEach(x => {
          const c = coordOf[x.id];
          if (c) placed.push({ id: x.id, num: x.num, label: x.legend_title || x.text, title: x.text, x: 0, y: 0, coords: c });
          else noCoord.push({ id: x.id, num: x.num, name: x.text });
        });
        placed.forEach(p => { const q = world.P(p.coords[0], p.coords[1]); p.x = q[0]; p.y = q[1]; });
        const fitPts = placed.map(p => [p.x, p.y]);
        let leaders = null, plaques = [];
        const api = MAP.mount(el, {
          onPin: id => baySheet(id),
          pins: placed.map(p => { const q = world.P(p.coords[0], p.coords[1]); return { id: p.id, num: p.num, label: p.label, x: q[0], y: q[1] }; }),
          fit: { points: fitPts, pad: 56, kMax: 5 },
          decluster: true,
          ctl: '<button class="mv-btn" data-act="e6-list" aria-label="Список точек"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M8.5 6h12M8.5 12h12M8.5 18h12"/><circle cx="4.2" cy="6" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.2" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="4.2" cy="18" r="1.2" fill="currentColor" stroke="none"/></svg></button>',
          onView: () => layoutPlaques()
        });
        api._setP(world.P);
        api.build(world);
        /* плашки с названиями поверх карты */
        plaques = placed.map(p => {
          const d = document.createElement('button');
          d.className = 'mv-plaque'; d.dataset.act = 'e6-point'; d.dataset.arg = p.id;
          d.innerHTML = '<b>' + p.num + '</b><span>' + esc(p.label) + '</span>';
          el.appendChild(d);
          return { id: p.id, wx: p.x, wy: p.y, el: d };
        });
        leaders = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        leaders.setAttribute('class', 'mv-leaders');
        el.appendChild(leaders);
        function layoutPlaques() {
          if (!leaders || !plaques.length) return;
          const M = 10; /* отступ плашек от краёв контейнера (проверка требует >=8) */
          const r = el.getBoundingClientRect();
          const view = api.view();
          const k = view.k, tx = view.tx, ty = view.ty;
          const dirs = [];
          for (let ring = 0; ring < 9; ring++) for (let a = 0; a < 8; a++) {
            const ang = a * Math.PI / 4, d = ring * 14 + (ring ? 8 : 0);
            dirs.push([Math.round(Math.cos(ang) * d), Math.round(Math.sin(ang) * d)]);
          }
          const obstacles = [];
          el.querySelectorAll('.mv-pin').forEach(pn => {
            const b = pn.getBoundingClientRect();
            if (b.width) obstacles.push({ x: b.left - r.left, y: b.top - r.top, w: b.width, h: b.height });
          });
          const placedRects = [];
          let paths = '';
          plaques.forEach(pl => {
            const ax = pl.wx * k + tx, ay = pl.wy * k + ty;
            const w = pl.el.offsetWidth, h = pl.el.offsetHeight;
            let best = null;
            outer: for (const [dx, dy] of dirs) {
              const x = Math.max(M, Math.min(r.width - w - M, ax + dx - w / 2));
              const y = Math.max(M, Math.min(r.height - h - M, ay + dy - h / 2));
              const rect = { x, y, w, h };
              for (const o of obstacles.concat(placedRects)) {
                if (!(rect.x + rect.w < o.x || rect.x > o.x + o.w || rect.y + rect.h < o.y || rect.y > o.y + o.h)) continue outer;
              }
              best = rect; break;
            }
            if (!best) best = { x: Math.max(M, Math.min(r.width - w - M, ax - w / 2)), y: Math.max(M, Math.min(r.height - h - M, ay + h + 12)) };
            pl.el.style.left = best.x + 'px'; pl.el.style.top = best.y + 'px';
            placedRects.push(best);
            const cx = best.x + w / 2, cy = best.y + h / 2;
            const vx = ax - cx, vy = ay - cy;
            const txd = vx ? (w / 2) / Math.abs(vx) : 1e9, tyd = vy ? (h / 2) / Math.abs(vy) : 1e9;
            const t = Math.min(txd, tyd, 1);
            const ex = cx + vx * t, ey = cy + vy * t;
            paths += '<path d="M' + ax.toFixed(1) + ' ' + ay.toFixed(1) + 'L' + ex.toFixed(1) + ' ' + ey.toFixed(1) + '"/>';
          });
          leaders.setAttribute('viewBox', '0 0 ' + r.width + ' ' + r.height);
          leaders.innerHTML = paths;
        }
        api.fit();
        el._map = api;
        /* список: все labels_winter.json; без координат — «положение уточняется» */
        const listEl = host.querySelector('#e6-list');
        if (listEl) {
          listEl.innerHTML =
            lwLabels.map(x => {
              const c = coordOf[x.id];
              const sub = c ? 'положение подтверждено' : 'положение уточняется';
              return '<button class="row clickable" data-act="e6-point" data-arg="' + x.id + '"><div class="grow"><div class="r-title" style="font-size:14px">' + esc(x.text) + '</div><div class="r-sub">' + (c ? '<b>' + x.num + '</b> · ' : '') + sub + '</div></div>' + icon('chevR') + '</button>';
            }).join('') +
            '<div class="cap" style="margin-top:8px">Названия корпусов и звёздность — по материалам проекта; курортом не подтверждены. Бревис 3*: звёздность на сайте курорта не найдена.</div>';
        }
      });
    }
  });

  /* окно бухты по габариту якорных точек + отступ ~200 м (в градусах) */
  function bayWindowFrom(anchors) {
    if (!anchors.length) return BAY_WIN;
    let w = 1e9, s = 1e9, e = -1e9, n = -1e9;
    anchors.forEach(c => { w = Math.min(w, c[0]); e = Math.max(e, c[0]); s = Math.min(s, c[1]); n = Math.max(n, c[1]); });
    const pad = 0.0018; /* ~200 м */
    return { w: w - pad, e: e + pad, s: s - pad, n: n + pad };
  }

  function baySheet(id) {
    MAP.load().then(({ lw: ll }) => {
      const lab = (((ll || {}).labels) || []).find(x => x.id === id);
      const label = lab ? lab.text : id;
      const noCoord = !['radisson', 'residences', 'ryabina', 'erbelia', 'aquapark', 'marina', 'yacht_main'].includes(id);
      /* карточка точки: соответствие отель ↔ залы по решению заказчика (Эрбелия = Эдельвейс + Магнолия,
         Рэдиссон = Баллрумы, Конгресс-центр = КипяTALK + Дойбица + Соболь + Шоша; Бревис и Рябина без залов) */
      const hallFor = { radisson: ['ballroomB', 'ballroomS'], congress: ['congress', 'doybitsa', 'sobol', 'shosha'], erbelia: ['edelveis', 'magnolia'], brevis: [], ryabina: [] };
      const hIds = hallFor[id] || [];
      const halls = hIds.map(x => F.hall(x)).filter(Boolean);
      const rows = F.sessionsOf('27.02').filter(s => hIds.includes(s.hall)).slice(0, 8);
      D.openSheet(
        '<div class="sheet-title">' + esc(label) + '</div>' +
        '<div class="cap" style="margin:4px 0 10px">' + (noCoord ? 'Положение уточняется. ' : '') + (halls.length ? 'На точке — залы программы фестиваля:' : 'В программе фестиваля залы не привязаны — активности и сервисы курорта.') + '</div>' +
        halls.map(h => '<button class="row clickable" data-go="E3/' + h.id + '"><div class="grow"><div class="r-title" style="font-size:14px">' + esc(h.name) + '</div><div class="r-sub">' + esc(h.place) + '</div></div>' + icon('chevR') + '</button>').join('') +
        (rows.length ? '<div class="cap" style="margin-top:8px">Сегодня:</div>' + rows.map(s => '<div class="r-sub">' + esc(s.time) + ' · ' + esc(s.title) + '</div>').join('') : '') +
        '<div style="display:flex;gap:8px;margin-top:14px"><button class="btn btn-primary" style="flex:1" data-go="E6">На карте бухты</button></div>');
    });
  }
  D.action('e6-point', el => { D.closeSheet && D.closeSheet(); baySheet(el.dataset.arg); });

  /* ---------- E7 Вид сверху (только внутренняя сборка) ---------- */
  if (!PUBLIC) D.register('E7', {
    tab: '-',
    meta: {
      title: 'E7 · Вид сверху',
      role: 'Гость, карта',
      fr: [], ac: [],
      what: [
        'Аэрофотоснимок курорта с подписями объектов (зима/лето).',
        'Подпись: «фото: Завидово, права на публикацию не подтверждены».'
      ],
      rules: ['Только внутренняя сборка; в публичной E7 отсутствует.'],
      depends: []
    },
    html(ctx) {
      const st = ctx.state;
      st.season = st.season || 'winter';
      const chips = [['winter', 'Зима'], ['summer', 'Лето']].map(s =>
        '<button class="chip' + (st.season === s[0] ? ' on' : '') + '" data-act="e7-season" data-arg="' + s[0] + '">' + s[1] + '</button>').join('');
      return '<div class="scr">' +
        D.head({backHist:true, eyebrow:'Карта · ' + esc(F.NOW.dateLong), title:'Вид сверху', sub:'Аэрофото курорта · ' + (st.season === 'winter' ? 'зима' : 'лето'), paren:paren('фото: Завидово, права на публикацию не подтверждены')}) +
        segMap('E7') +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="chips">' + chips + '</div>' +
        '<div class="e7-scroll" id="e7-scroll"><div class="e7-stage" id="e7-stage"><img src="assets/map/final_' + st.season + '_1200.webp" alt="Аэрофото Завидово, ' + st.season + '"><svg class="e7-leaders" id="e7-leaders" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true"></svg><div id="e7-dots"></div></div></div>' +
        '<div class="card" style="padding:2px 16px"><div class="list" id="e7-list"></div></div>' +
        '<div class="cap">Аэрофото: материалы курорта, права на публикацию не подтверждены. Подписи — по положению на снимке.</div>' +
        '<div style="height:16px;margin:0 20px"></div></div></div>';
    },
    mount(host) {
      MAP.load().then(({ lw, ls }) => {
        const season = D.st('E7').season || 'winter';
        const labels = (((season === 'summer' ? ls : lw) || lw || {}).labels) || [];
        const dots = host.querySelector('#e7-dots');
        const list = host.querySelector('#e7-list');
        const leaders = host.querySelector('#e7-leaders');
        const paths = [];
        labels.forEach(x => {
          const a = x.anchor || { x: x.x, y: x.y };
          const d = document.createElement('button');
          d.className = 'e7-tag e7-dot'; d.style.left = x.x + '%'; d.style.top = x.y + '%';
          d.dataset.pin = x.id;
          d.setAttribute('data-act', 'e7-tag');
          d.setAttribute('data-arg', x.id);
          d.innerHTML = '<i>' + x.num + '</i><span>' + esc(x.text) + '</span>';
          dots.appendChild(d);
          paths.push('<path d="M' + a.x + ' ' + a.y + 'L' + x.x + ' ' + x.y + '"/>');
          const row = document.createElement('button');
          row.className = 'row clickable';
          row.setAttribute('data-act', 'e7-row');
          row.setAttribute('data-arg', String(labels.indexOf(x)));
          row.innerHTML = '<div class="grow"><div class="r-title" style="font-size:14px">' + x.num + '. ' + esc(x.text) + '</div></div>' + icon('chevR');
          list.appendChild(row);
        });
        if (leaders) leaders.innerHTML = paths.join('');
        window.__e7labels = labels;
        /* старт — по центру на метке 1 */
        const sc = host.querySelector('#e7-scroll');
        const first = labels.find(z => z.num === 1) || labels[0];
        if (sc && first) {
          const px = (first.x / 100) * 760;
          sc.scrollLeft = Math.max(0, px - sc.clientWidth / 2);
        }
      });
    }
  });
  D.action('e7-season', el => { D.st('E7').season = el.dataset.arg; D.rerender(); });
  D.action('e7-row', el => { const x = (window.__e7labels || [])[+el.dataset.arg]; if (x) e7Sheet(x); });
  D.action('e7-tag', el => { const x = (window.__e7labels || []).find(z => z.id === el.dataset.arg); if (x) e7Sheet(x); });
  function e7Sheet(x) {
    const hallFor = { congress: ['congress', 'doybitsa', 'sobol', 'shosha'], radisson: ['ballroomB', 'ballroomS'], erbelia: ['edelveis', 'magnolia'], brevis: [], ryabina: [] };
    const hIds = hallFor[x.id] || [];
    const halls = hIds.map(i => F.hall(i)).filter(Boolean);
    D.openSheet(
      '<div class="sheet-title">' + esc(x.text) + '</div>' +
      '<div class="cap" style="margin:4px 0 10px">' + (halls.length ? 'Залы программы фестиваля на точке:' : 'В программе фестиваля залы не привязаны — активности и сервисы курорта.') + '</div>' +
      halls.map(h => '<button class="row clickable" data-go="E3/' + h.id + '"><div class="grow"><div class="r-title" style="font-size:14px">' + esc(h.name) + '</div><div class="r-sub">' + esc(h.place) + '</div></div>' + icon('chevR') + '</button>').join(''));
  }

  /* ---------- E2 План этажа ---------- */
  D.register('E2', {
    tab: '-',
    meta: {
      title: 'E2 · План этажа',
      role: 'Гость, карта площадки',
      fr: ['FR-MAP-01'],
      ac: ['AC-MAP-01'],
      what: [
        'Демонстрационная схема Конгресс-центра с переключателем этажей: 1-й этаж — КипяTALK и выставка, 2-й — Дойбица, Соболь, Шоша.',
        'Подпись: «схема демонстрационная, планы корпусов будут позже».'
      ],
      rules: [
        'Схема демонстрационная: точные размеры и расположение уточняются по плану площадки.',
        'Переход между этажами — по лестницам.'
      ],
      depends: ['план площадки', 'программа']
    },
    html(ctx) {
      const st = ctx.state;
      st.fl = st.fl || 'f1';
      const fl = F.CONGRESS_FLOORS.find(f => f.id === st.fl);
      const chips = F.CONGRESS_FLOORS.map(f =>
        '<button class="chip' + (f.id === st.fl ? ' on' : '') + '" data-act="e2-floor" data-arg="' + f.id + '">' + esc(f.label) + '</button>').join('');
      /* переходы из схемы и списка: залы -> E3, Выставка -> H1, КипяTALK -> H5 */
      const ROOM_LINK = { stage: 'E3/congress', expo: 'H1', kiptalk: 'H5', doybitsa: 'E3/doybitsa', sobol: 'E3/sobol', shosha: 'E3/shosha' };
      const rooms = fl.rooms.map(r => {
        const link = ROOM_LINK[r.id];
        const cx = r.x + r.w / 2, cy = r.y + r.h / 2;
        return '<g class="floor-room' + (link ? ' clickable' : '') + '"' + (link ? ' data-go="' + link + '" style="cursor:pointer"' : '') + '>' +
        '<rect x="' + r.x + '" y="' + r.y + '" width="' + r.w + '" height="' + r.h + '" rx="10"/>' +
        '<text class="fr-name" x="' + cx + '" y="' + (cy - 4) + '" text-anchor="middle">' + esc(r.name) + '</text>' +
        '<text class="fr-note" x="' + cx + '" y="' + (cy + 14) + '" text-anchor="middle">' + esc(r.note) + '</text></g>';
      }).join('');
      const marks = (fl.marks || []).map(m => {
        if (m.kind === 'entry') {
          const my = m.y + m.h / 2;
          return '<g class="fm-entry"><rect class="fm-mark" x="' + m.x + '" y="' + m.y + '" width="' + m.w + '" height="' + m.h + '" rx="10"/>' +
          '<path class="fm-door" d="M' + m.x + ' ' + (my - 8) + 'v16 M' + m.x + ' ' + (my - 8) + 'a8 8 0 0 1 8 8"/>' +
          '<text class="fm-lab" x="' + (m.x + 18) + '" y="' + (m.y + 20) + '">Вход</text>' +
          '<circle class="fm-ya" cx="' + (m.x + 24) + '" cy="' + (m.y + m.h - 15) + '" r="5"/>' +
          '<text class="fm-ya-t" x="' + (m.x + 34) + '" y="' + (m.y + m.h - 11) + '">Вы здесь</text></g>';
        }
        if (m.kind === 'stairs') {
          let steps = '';
          for (let i = 0; i < 5; i++) {
            steps += '<line class="fm-step" x1="' + (m.x + 22 + i * 15) + '" y1="' + (m.y + m.h - 12 - i * 5) + '" x2="' + (m.x + 38 + i * 15) + '" y2="' + (m.y + m.h - 12 - i * 5) + '"/>';
          }
          return '<g class="fm-stairs"><rect class="fm-mark" x="' + m.x + '" y="' + m.y + '" width="' + m.w + '" height="' + m.h + '" rx="10"/>' +
          steps +
          '<text class="fm-lab" x="' + (m.x + m.w / 2) + '" y="' + (m.y + m.h / 2 + 4) + '" text-anchor="middle">Лестница</text></g>';
        }
        return '';
      }).join('');
      const rows = fl.rooms.map(r => {
        const link = ROOM_LINK[r.id];
        const inner = '<div class="grow"><div class="r-title" style="font-size:14px">' + esc(r.name) + '</div><div class="r-sub">' + esc(r.note) + '</div></div>' + icon('chevR');
        return link ? '<button class="row clickable" data-go="' + link + '">' + inner + '</button>'
                    : '<div class="row">' + inner + '</div>';
      }).join('');
      return '<div class="scr">' +
        D.head({backHist:true, eyebrow:'Карта · Конгресс-центр', title:'План этажа', sub:esc(fl.label) + ' · схема демонстрационная', paren:paren('схема демонстрационная, планы корпусов будут позже')}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:12px">' +
        '<div class="chips">' + chips + '</div>' +
        '<div class="floor-map"><svg viewBox="0 0 330 ' + fl.h + '">' +
        '<rect class="fm-shell" x="6" y="6" width="318" height="' + (fl.h - 12) + '" rx="12"/>' +
        rooms + marks + '</svg></div>' +
        '<div class="card" style="padding:2px 16px"><div class="list" style="padding:0">' + rows + '</div></div>' +
        '<div class="banner">' + icon('info') + '<div class="cap">' + esc(fl.label) + ': ' + fl.rooms.map(r => r.name).join(', ') + '. Тап по строке — карточка зала или раздел.</div></div>' +
        '<div style="height:16px;margin:0 20px"></div></div></div>';
    }
  });
  D.action('e2-floor', el => { D.st('E2').fl = el.dataset.arg; D.rerender(); });

  /* ---------- E3 Точка ---------- */
  D.register('E3', {
    tab: '-',
    meta: {
      title: 'E3 · Точка',
      role: 'Гость, карта площадки',
      fr: ['FR-MAP-03'],
      ac: ['AC-MAP-03'],
      what: [
        'Карточка зала: название, где на карте, вместимость, расписание на сегодня.',
        'Кнопки «Маршрут» и «На карте».'
      ],
      rules: [
        'Расписание — из программы дня; пустой зал честно показывает «сессий нет».',
        'Метке зала соответствует точка на карте бухты по pinId.'
      ],
      depends: ['программа', 'карта']
    },
    html(ctx) {
      if (ctx.param && !F.hall(ctx.param)) {
        return '<div class="scr">' +
          D.head({backHist:true, eyebrow:'Точка', title:'Зал не найден', sub:'Такого зала нет в программе фестиваля.'}) +
          '<div style="padding:0 20px"><button class="btn btn-ghost btn-block" data-go="E1">К карте</button></div></div>';
      }
      const hid = ctx.param || 'magnolia';
      const h = F.hall(hid);
      const sess = F.sessionsOf('27.02').filter(s => s.hall === h.id).sort((a, b) => a.time.localeCompare(b.time));
      const rows = sess.map(s =>
        '<button class="row clickable" data-go="C3/' + s.id + '"><div class="grow"><div class="r-sub">' + esc(s.time) + ' · ' + esc(s.title) + '</div></div>' + icon('chevR') + '</button>').join('');
      const t2mE = t => { const m = /(\d+):(\d+)/.exec(String(t || '')); return m ? (+m[1]) * 60 + (+m[2]) : -1; };
      const nowM = t2mE(F.NOW && F.NOW.time);
      const cur = sess.find(s => t2mE(s.time) <= nowM && nowM < t2mE(s.time) + (s.dur || 0));
      const next = sess.find(s => t2mE(s.time) > nowM);
      const nowTxt = cur
        ? 'Сейчас — ' + esc(cur.time) + ' ' + esc(cur.title) + ' (до ' + esc(String(Math.floor((t2mE(cur.time) + cur.dur) / 60)).padStart(2, '0') + ':' + String((t2mE(cur.time) + cur.dur) % 60).padStart(2, '0')) + ')' +
          (next ? ' · далее ' + esc(next.time) + ' ' + esc(next.title) : '')
        : next ? 'Ближайшее — ' + esc(next.time) + ' ' + esc(next.title)
        : 'Сессий на сейчас нет';
      const capTxt = h.cap == null ? (h.capNote || 'по записи') : 'до ' + h.cap + ' ' + D.plural(h.cap, ['места', 'мест', 'мест']);
      return '<div class="scr">' +
        D.head({backHist:true, eyebrow:'Точка · ' + esc(h.place.split(',')[0]), title:esc(h.name), sub:esc(h.place) + ' · ' + esc(capTxt), paren:paren('сегодня в этом зале — ' + sess.length + ' ' + D.plural(sess.length, ['событие', 'события', 'событий']))}) +
        '<div style="padding:0 20px;display:flex;flex-direction:column;gap:14px">' +
        '<div class="card accent-edge"><div class="card-head"><div><div class="cap">Сейчас и дальше</div>' +
        '<div class="card-title" style="margin-top:2px">' + nowTxt + '</div></div></div>' +
        (h.note ? '<div class="r-sub" style="margin-top:6px">' + esc(h.note) + '</div>' : '') +
        '<div class="r-sub" style="margin-top:4px">На карте: метка бухты · ' + esc(h.mapNote || 'точка подтверждена') + '</div></div>' +
        '<div class="card"><div class="sec-title" style="margin:0 0 4px">Сегодня в зале</div>' +
        '<div class="list" style="padding:0">' + (rows || '<div class="cap">сессий нет — зал свободен по программе</div>') + '</div></div>' +
        '<div style="display:flex;gap:8px">' +
        '<button class="btn btn-primary" style="flex:1" data-go="E4/' + h.id + '">' + icon('route') + 'Маршрут</button>' +
        '<button class="btn btn-ghost" style="flex:1" data-go="E6">На карте</button></div>' +
        '<div style="height:16px;margin:0 20px"></div></div></div>';
    }
  });

  /* ---------- E4 Маршрут / E5 Мой маршрут ---------- */
  function routeScreen(kind, ctx) {
    const isMine = kind === 'E5';
    /* точки маршрута: [имя, [lon,lat], подпись] */
    let pts = [];
    if (isMine) {
      const seen = {};
      F.MY_BOOKINGS.forEach(b => {
        const s = F.session(b.session || b.id || b);
        if (s && s.hall && !seen[s.hall]) { seen[s.hall] = 1; pts.push({ name: F.hall(s.hall).short || F.hall(s.hall).name, coords: F.hall(s.hall).geo, sub: s.time + ' · ' + s.title }); }
      });
      pts.unshift({ name: 'Вы здесь', coords: [36.520199, 56.590251], sub: 'главная бухта' });
      if (!pts.length) pts = [{ name: 'Вы здесь', coords: [36.520199, 56.590251], sub: 'главная бухта' }];
    } else {
      const pg = ctx.param && PIN_GEO[ctx.param];
      const ph = ctx.param && F.hall(ctx.param);
      if (ctx.param && !pg && !ph) return { nf: true };
      const h = ph || F.hall('magnolia');
      pts = [
        { name: 'Вы здесь', coords: [36.520199, 56.590251], sub: 'главная бухта' },
        pg ? { name: pg[0], coords: pg[1], sub: 'точка курорта на карте' } : { name: h.short || h.name, coords: h.geo, sub: h.place, hall: h.id }
      ];
    }
    /* длина и время — демо-расчёт по прямым между точками, 4,5 км/ч */
    let km = 0;
    const legs = [];
    for (let i = 1; i < pts.length; i++) {
      const d = MAP.distKm(pts[i - 1].coords, pts[i].coords);
      km += d; legs.push(MAP.walkMin(d));
    }
    const mins = MAP.walkMin(km);
    const coords = pts.map(p => p.coords);
    return { pts, km, mins, legs, coords, isMine };
  }

  function routeHTML(R, title, sub) {
    const steps = R.pts.map((p, i) => {
      const leg = i > 0 && R.legs && R.legs[i - 1] ? ' · пешком ~' + R.legs[i - 1] + ' ' + D.plural(R.legs[i - 1], ['минута', 'минуты', 'минут']) : '';
      return '<div class="row"><div class="grow"><div class="r-title" style="font-size:14px">' + (i + 1) + '. ' + esc(p.name) + '</div>' +
      '<div class="r-sub">' + esc(p.sub || '') + esc(leg) + '</div></div></div>';
    }).join('');
    return '<div class="scr">' +
      D.head({backHist:true, eyebrow:esc(F.NOW.dateLong), title:title, sub:sub, paren:paren('время пешком — демо-расчёт по расстоянию, 4,5 км/ч')}) +
      '<div class="mapview" id="mv-route"><div class="mv-loading">Загружаю карту…</div></div>' +
      '<div class="card" style="margin:12px 20px 0"><div class="card-title" style="font-size:15px">' + esc(R.pts.map(p => p.name).join(' › ')) + '</div>' +
      '<div class="cap">пешком ~' + R.mins + ' ' + D.plural(R.mins, ['минута', 'минуты', 'минут']) + ' · ' + R.km.toFixed(1).replace('.', ',') + ' км по прямым · демо-расчёт</div>' +
      '<div style="margin-top:8px">' + steps + '</div>' +
      '<div class="cap" style="margin-top:8px">Запас на переход между точками — по матрице переездов; линия маршрута приблизительная (по прямым между точками).</div></div>' +
      '<div style="height:16px;margin:0 20px"></div></div>';
  }
  function mountRoute(host, R) {
    MAP.load().then(({ g }) => {
      const el = host.querySelector('#mv-route');
      if (!el) return;
      const world = MAP.worldSVG(g, GEO, { route: R.coords });
      el.style.height = Math.round(el.clientWidth * world.H / world.W) + 24 + 'px';
      const stopPts = R.pts.map(p => { const q = world.P(p.coords[0], p.coords[1]); return [q[0], q[1]]; });
      const api = MAP.mount(el, {
        fit: { points: stopPts, pad: 40, kMax: 4, minDist: 26 }
      });
      api._setP(world.P);
      api.build(world);
      R.pts.forEach((p, i) => {
        const q = world.P(p.coords[0], p.coords[1]);
        const b = document.createElement('button');
        b.className = 'mv-pin mv-pin-stop'; b.dataset.x = q[0]; b.dataset.y = q[1];
        b.innerHTML = '<span class="mv-pin-n">' + (i + 1) + '</span>';
        if (p.hall) b.dataset.go = 'E3/' + p.hall;
        el.appendChild(b);
      });
      api.fit();
      el._map = api;
    });
  }

  D.register('E4', {
    tab: '-',
    meta: {
      title: 'E4 · Маршрут', role: 'Гость / участник', fr: ['FR-MAP-04'], ac: ['AC-MAP-02'],
      what: ['Маршрут от текущей точки до зала по карте: линия, остановки, время пешком.', 'Лист шагов с расстоянием и демо-расчётом.'],
      rules: ['Линия приблизительная — по прямым между известными точками; точное время — после графа дорожек.'],
      depends: []
    },
    html(ctx) {
      const R = routeScreen('E4', ctx);
      if (R.nf) {
        return '<div class="scr">' +
          D.head({backHist:true, eyebrow:'Карта', title:'Точка не найдена', sub:'Такой точки или зала нет на карте.'}) +
          '<div style="padding:0 20px"><button class="btn btn-ghost btn-block" data-go="E1">К карте</button></div></div>';
      }
      ctx.state._rt = R;
      return routeHTML(R, 'Маршрут', esc(R.pts[0].name) + ' › ' + esc(R.pts[R.pts.length - 1].name));
    },
    mount(host, ctx) { if (ctx.state._rt) mountRoute(host, ctx.state._rt); }
  });

  D.register('E5', {
    tab: '-',
    meta: {
      title: 'E5 · Мой маршрут', role: 'Гость / участник', fr: ['FR-MAP-05'], ac: ['AC-MAP-05'],
      what: ['Точки вашей программы и списка на карте с порядком и временем пешком.', 'Запас на переход между залами.'],
      rules: ['Точки без координат на карте не наносятся — только залы с geo.'],
      depends: []
    },
    html(ctx) {
      const R = routeScreen('E5', ctx);
      ctx.state._rt = R;
      return routeHTML(R, 'Мой маршрут', esc(F.NOW.dateLong) + ' · ' + (R.pts.length - 1) + ' ' + D.plural(R.pts.length - 1, ['остановка', 'остановки', 'остановок']) + ' · от «Вы здесь»');
    },
    mount(host, ctx) { if (ctx.state._rt) mountRoute(host, ctx.state._rt); }
  });
})();
