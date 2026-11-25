/* Интерактивная карта Завидово: векторный SVG из assets/map/zavidovo.geojson.
   Равнопромежуточная проекция с поправкой cos(широты); 1 единица мира = 1 px. */
window.MAP = (function () {
  const cache = {};
  function load() {
    if (!cache.p) {
      cache.p = Promise.all([
        fetch('assets/map/zavidovo.geojson').then(r => r.json()),
        fetch('assets/map/labels_winter.json').then(r => r.json()).catch(() => null),
        fetch('assets/map/labels_summer.json').then(r => r.json()).catch(() => null)
      ]).then(([g, lw, ls]) => { cache.g = g; cache.lw = lw; cache.ls = ls; return { g, lw, ls }; });
    }
    return cache.p;
  }
  const WORLD_W = 1000;
  /* окно -> проекция в мир WORLD_W x H (H по соотношению окна) */
  function proj(win) {
    const cos = Math.cos((win.s + win.n) / 2 * Math.PI / 180);
    const vw = (win.e - win.w) * cos, vh = win.n - win.s;
    const k = WORLD_W / vw;
    const H = Math.max(120, Math.round(WORLD_W * vh / vw));
    const P = (lon, lat) => [(lon - win.w) * cos * k, (win.n - lat) * k];
    const mPerUnit = (win.e - win.w) * 111320 * cos / WORLD_W;
    return { P, W: WORLD_W, H, mPerUnit };
  }
  const r1 = n => Math.round(n * 10) / 10;
  function ringPath(coords, P) {
    return coords.map((c, i) => (i ? 'L' : 'M') + r1(P(c[0], c[1])[0]) + ' ' + r1(P(c[0], c[1])[1])).join('') + 'Z';
  }
  function linePath(coords, P) {
    return coords.map((c, i) => (i ? 'L' : 'M') + r1(P(c[0], c[1])[0]) + ' ' + r1(P(c[0], c[1])[1])).join('');
  }
  function geomD(geom, P) {
    if (geom.type === 'LineString') return linePath(geom.coordinates, P);
    if (geom.type === 'Polygon') return geom.coordinates.map(r => ringPath(r, P)).join('');
    if (geom.type === 'MultiPolygon') return geom.coordinates.map(p => p.map(r => ringPath(r, P)).join('')).join('');
    if (geom.type === 'MultiLineString') return geom.coordinates.map(l => linePath(l, P)).join('');
    return '';
  }
  const LAYER_ORDER = ['water', 'building', 'parking', 'trail'];
  const LAYER_LABEL = { water: 'Вода', building: 'Здания', parking: 'Парковки', trail: 'Тропы' };

  /* SVG-строка мира по geojson в окне win (lon/lat). opts.route — [[lon,lat]...] */
  function worldSVG(g, win, opts) {
    opts = opts || {};
    const { P, W, H, mPerUnit } = proj(win);
    const groups = {};
    LAYER_ORDER.forEach(k => groups[k] = []);
    g.features.forEach(f => {
      const kind = f.properties && f.properties.kind;
      if (!groups[kind]) return;
      const d = geomD(f.geometry, P);
      if (d) groups[kind].push(d);
    });
    const paths = k => groups[k].map(d => '<path d="' + d + '"/>').join('');
    let svg = '<svg class="mv-svg" aria-hidden="true">';
    svg += '<rect class="mv-bg" width="100%" height="100%"/>';
    svg += '<g class="mv-world">';
    svg += '<g class="mv-l mv-water" data-layer="water">' + paths('water') + '</g>';
    svg += '<g class="mv-l mv-building" data-layer="building">' + paths('building') + '</g>';
    svg += '<g class="mv-l mv-parking" data-layer="parking">' + paths('parking') + '</g>';
    svg += '<g class="mv-l mv-trail" data-layer="trail"><path d="' + groups.trail.join('') + '"/></g>';
    if (opts.route && opts.route.length > 1) {
      const d = 'M' + opts.route.map(c => { const q = P(c[0], c[1]); return r1(q[0]) + ' ' + r1(q[1]); }).join(' L');
      svg += '<path class="mv-route-under" d="' + d + '"/><path class="mv-route" d="' + d + '"/>';
    }
    svg += '</g></svg>';
    return { svg, P, W, H, mPerUnit };
  }

  const CLAMP_K = [0.15, 8];
  const NICE_M = [50, 100, 200, 500, 1000, 2000, 5000, 10000, 20000, 50000];

  /* Монтирование. opts: {onPin(id), pins:[{id,num,label,x,y,cls}], youAre:{x,y},
     pad, fit:{points:[[x,y]..],pad,kMax,minDist}, ctl:'<button…>', avoidPin:'id', onView(v)}
     Возвращает api {fit, view, project, zoomBy, destroy, _place}. */
  function mount(el, opts) {
    opts = opts || {};
    let st = { tx: 0, ty: 0, k: 1 };
    let world = null;
    const ptrs = new Map();
    let pinch = null, moved = 0, downAt = 0, pendingPin = null;

    function size() {
      const r = el.getBoundingClientRect();
      return { w: r.width, h: r.height };
    }
    function apply() {
      const w = el.querySelector('.mv-world');
      if (w) {
        w.setAttribute('transform', 'translate(' + st.tx + ' ' + st.ty + ') scale(' + st.k + ')');
        const tr = w.querySelector('.mv-trail'), bd = w.querySelector('.mv-building');
        if (tr) tr.style.strokeWidth = Math.max(0.9, 1.6 / st.k);
        if (bd) bd.style.strokeWidth = 0.8 / st.k;
      }
      el.classList.toggle('mv-far', st.k < 0.9);
      el.classList.toggle('mv-labeled', st.k >= 1.4);
      el.classList.toggle('mv-ya-on', st.k >= 1.2);
      placePins();
      if (opts.decluster) declusterPins();
      updateScale();
      if (opts.avoidPin) avoidOverlap();
      if (opts.onView) opts.onView({ k: st.k, tx: st.tx, ty: st.ty });
    }
    /* «Вы здесь» не должна пересекать указанную метку — сдвиг по экранным px */
    function yaRect(ya) {
      const parts = [...ya.children].map(c => c.getBoundingClientRect()).filter(r => r.width || r.height);
      if (!parts.length) return ya.getBoundingClientRect();
      return {
        left: Math.min(...parts.map(r => r.left)), top: Math.min(...parts.map(r => r.top)),
        right: Math.max(...parts.map(r => r.right)), bottom: Math.max(...parts.map(r => r.bottom))
      };
    }
    function avoidOverlap() {
      const ya = el.querySelector('.mv-youare');
      const pin = el.querySelector('.mv-pin[data-pin="' + opts.avoidPin + '"]');
      if (!ya || !pin) return;
      ya.dataset.oy = '0';
      placePins();
      for (let i = 0; i < 10; i++) {
        const a = yaRect(ya), b = pin.getBoundingClientRect();
        const hit = !(a.right < b.left || a.left > b.right || a.bottom < b.top || a.top > b.bottom);
        if (!hit) return;
        ya.dataset.oy = String((parseFloat(ya.dataset.oy) || 0) + 16);
        placePins();
      }
    }
    /* Разводит пересекающиеся метки сдвигом по экранным px (координаты не трогаем).
       Сдвиг зависит только от k — кэшируем по масштабу, pan не пересчитывает. */
    let declK = -1;
    function declusterPins() {
      const pins = [...el.querySelectorAll('.mv-pin')];
      if (pins.length < 2) return;
      if (Math.abs(st.k - declK) < 0.004) return;
      declK = st.k;
      pins.forEach(p => { p.dataset.ox = '0'; p.dataset.oy = '0'; });
      placePins();
      for (let it = 0; it < 14; it++) {
        const rects = pins.map(p => p.getBoundingClientRect());
        let moved = false;
        for (let i = 0; i < pins.length; i++) for (let j = i + 1; j < pins.length; j++) {
          const a = rects[i], b = rects[j];
          const ox = Math.min(a.right, b.right) - Math.max(a.left, b.left);
          const oy = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
          if (ox <= 0 || oy <= 0) continue;
          const pj = pins[j];
          const cdx = (b.left + b.width / 2) - (a.left + a.width / 2);
          const cdy = (b.top + b.height / 2) - (a.top + a.height / 2);
          if (ox <= oy) {
            const s = cdx >= 0 ? 1 : -1;
            pj.dataset.ox = String((parseFloat(pj.dataset.ox) || 0) + s * (ox + 1));
          } else {
            const s = cdy >= 0 ? 1 : -1;
            pj.dataset.oy = String((parseFloat(pj.dataset.oy) || 0) + s * (oy + 1));
          }
          placePins();
          rects[j] = pj.getBoundingClientRect();
          moved = true;
        }
        if (!moved) break;
      }
    }
    function placePins() {
      el.querySelectorAll('.mv-pin').forEach(p => {
        const x = +p.dataset.x, y = +p.dataset.y;
        const ox = parseFloat(p.dataset.ox) || 0, oy = parseFloat(p.dataset.oy) || 0;
        p.style.left = (x * st.k + st.tx + ox) + 'px';
        p.style.top = (y * st.k + st.ty + oy) + 'px';
      });
      const ya = el.querySelector('.mv-youare');
      if (ya) {
        const ox = parseFloat(ya.dataset.ox) || 0, oy = parseFloat(ya.dataset.oy) || 0;
        ya.style.left = (+ya.dataset.x * st.k + st.tx + ox) + 'px';
        ya.style.top = (+ya.dataset.y * st.k + st.ty + oy) + 'px';
      }
    }
    function toWorld(cx, cy) {
      const r = el.getBoundingClientRect();
      return { x: (cx - r.left - st.tx) / st.k, y: (cy - r.top - st.ty) / st.k };
    }
    function clamp() {
      const s = size(), M = 24;
      if (!world) return;
      const loX = s.w - world.W * st.k - M, hiX = M;
      const loY = s.h - world.H * st.k - M, hiY = M;
      if (loX <= hiX) st.tx = Math.min(hiX, Math.max(loX, st.tx)); else st.tx = (s.w - world.W * st.k) / 2;
      if (loY <= hiY) st.ty = Math.min(hiY, Math.max(loY, st.ty)); else st.ty = (s.h - world.H * st.k) / 2;
    }
    function zoomAt(cx, cy, factor) {
      const r = el.getBoundingClientRect();
      const px = cx - r.left, py = cy - r.top;
      const k2 = Math.min(CLAMP_K[1], Math.max(CLAMP_K[0], st.k * factor));
      const f = k2 / st.k;
      st.tx = px - (px - st.tx) * f;
      st.ty = py - (py - st.ty) * f;
      st.k = k2; clamp(); apply();
    }
    function viewForPoints(pts, pad, kMax, minDist) {
      const s = size();
      let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;
      pts.forEach(p => { x0 = Math.min(x0, p[0]); y0 = Math.min(y0, p[1]); x1 = Math.max(x1, p[0]); y1 = Math.max(y1, p[1]); });
      const bw = Math.max(1, x1 - x0), bh = Math.max(1, y1 - y0);
      const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2;
      let k = Math.min((s.w - 2 * pad) / bw, (s.h - 2 * pad) / bh);
      if (kMax) k = Math.min(k, kMax);
      const scr = p => [p[0] * k + s.w / 2 - cx * k, p[1] * k + s.h / 2 - cy * k];
      if (minDist && pts.length > 1) {
        for (let it = 0; it < 10; it++) {
          let ok = true;
          for (let i = 0; i < pts.length && ok; i++) for (let j = i + 1; j < pts.length; j++) {
            const a = scr(pts[i]), b = scr(pts[j]);
            if (Math.hypot(a[0] - b[0], a[1] - b[1]) < minDist) { ok = false; break; }
          }
          if (ok || (kMax && k >= kMax - 1e-6)) break;
          k = Math.min(k * 1.22, kMax || k * 1.22);
        }
      }
      st.k = Math.min(CLAMP_K[1], Math.max(CLAMP_K[0], k));
      st.tx = s.w / 2 - cx * st.k;
      st.ty = s.h / 2 - cy * st.k;
      clamp();
    }
    function fit() {
      if (!world) return;
      const s = size(), pad = opts.pad != null ? opts.pad : 12;
      if (opts.fit && opts.fit.points && opts.fit.points.length) {
        viewForPoints(opts.fit.points, opts.fit.pad != null ? opts.fit.pad : 40, opts.fit.kMax, opts.fit.minDist);
      } else {
        st.k = Math.min((s.w - 2 * pad) / world.W, (s.h - 2 * pad) / world.H);
        st.tx = (s.w - world.W * st.k) / 2;
        st.ty = (s.h - world.H * st.k) / 2;
      }
      clamp(); apply();
    }
    function updateScale() {
      const bar = el.querySelector('.mv-scale');
      if (!bar || !world || !world.mPerUnit) return;
      const mPerPx = world.mPerUnit / st.k;
      const target = mPerPx * 90;
      let nice = NICE_M[0];
      for (const m of NICE_M) { if (m <= target * 1.15) nice = m; else break; }
      let px = nice / mPerPx;
      const maxPx = size().w - 44;
      if (px > maxPx) { px = maxPx; nice = Math.max(10, Math.round(mPerPx * px / 10) * 10); }
      const line = bar.querySelector('i');
      const lab = bar.querySelector('span');
      if (line) line.style.width = Math.max(12, Math.round(px)) + 'px';
      if (lab) lab.textContent = nice >= 1000 ? (nice / 1000) + ' км' : nice + ' м';
    }

    el.addEventListener('pointerdown', ev => {
      /* кнопки и ссылки внутри карты обрабатывают свой клик — не перехватываем pointer */
      if (ev.target.closest && ev.target.closest('[data-act], [data-go]')) return;
      el.setPointerCapture(ev.pointerId);
      ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      moved = 0; downAt = Date.now();
      if (ptrs.size === 2) {
        const a = [...ptrs.values()];
        pinch = { d: Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y), k: st.k };
      }
    });
    el.addEventListener('pointermove', ev => {
      if (!ptrs.has(ev.pointerId)) return;
      const prev = ptrs.get(ev.pointerId);
      const dx = ev.clientX - prev.x, dy = ev.clientY - prev.y;
      moved += Math.abs(dx) + Math.abs(dy);
      ptrs.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (ptrs.size === 1 && pinch === null) {
        st.tx += dx; st.ty += dy; clamp(); apply();
      } else if (ptrs.size === 2 && pinch) {
        const a = [...ptrs.values()];
        const d = Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
        const mx = (a[0].x + a[1].x) / 2, my = (a[0].y + a[1].y) / 2;
        const r = el.getBoundingClientRect();
        const k2 = Math.min(CLAMP_K[1], Math.max(CLAMP_K[0], pinch.k * d / pinch.d));
        const f = k2 / st.k;
        st.tx = (mx - r.left) - ((mx - r.left) - st.tx) * f;
        st.ty = (my - r.top) - ((my - r.top) - st.ty) * f;
        st.k = k2; clamp(); apply();
      }
    });
    function up(ev) {
      if (!ptrs.has(ev.pointerId)) return;
      ptrs.delete(ev.pointerId);
      if (ptrs.size < 2) pinch = null;
      pendingPin = null;
      if (ev.type === 'pointerup' && ptrs.size === 0 && moved < 6 && Date.now() - downAt < 400) {
        const el2 = document.elementFromPoint(ev.clientX, ev.clientY);
        const pin = el2 && el2.closest ? el2.closest('.mv-pin') : null;
        if (pin) pendingPin = pin.dataset.pin;
      }
    }
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('click', () => {
      const id = pendingPin; pendingPin = null;
      if (id && opts.onPin) opts.onPin(id);
    });
    el.addEventListener('wheel', ev => {
      ev.preventDefault();
      zoomAt(ev.clientX, ev.clientY, ev.deltaY < 0 ? 1.18 : 1 / 1.18);
    }, { passive: false });

    function build(w) {
      world = w;
      const id = el.id || 'map';
      el.innerHTML = w.svg +
        '<div class="mv-hud">' +
        '<div class="mv-compass" aria-hidden="true"><svg viewBox="0 0 24 24" width="15" height="15"><path d="M12 2.6l4.4 10.2-4.4-2.2-4.4 2.2z" fill="currentColor"/><path d="M12 2.6V21.4" stroke="currentColor" stroke-width="1.3"/></svg><span>С</span></div>' +
        '<div class="mv-ctl">' +
        '<button class="mv-btn" data-act="map-zoom" data-arg="1.35" data-map="' + id + '" aria-label="Приблизить">+</button>' +
        '<button class="mv-btn" data-act="map-zoom" data-arg="0.74" data-map="' + id + '" aria-label="Отдалить">−</button>' +
        '<button class="mv-btn" data-act="map-reset" data-map="' + id + '" aria-label="Сбросить вид"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><path d="M4.5 9.5A8 8 0 1 1 4 14"/><path d="M4.5 4.5v5h5"/></svg></button>' +
        (opts.ctl || '') +
        '</div>' +
        '<div class="mv-scale"><i></i><span></span></div>' +
        '<div class="mv-attr">© OpenStreetMap contributors</div>' +
        '</div>' +
        (opts.pins || []).map(p =>
          '<button class="mv-pin' + (p.cls ? ' ' + p.cls : '') + '" data-pin="' + p.id + '" data-x="' + p.x + '" data-y="' + p.y + '" style="left:0;top:0" aria-label="' + (p.label || '') + '">' +
          '<span class="mv-pin-n">' + p.num + '</span><span class="mv-pin-t' + (p.always ? ' always' : '') + '">' + (p.label || '') + '</span></button>').join('') +
        (opts.youAre ? '<div class="mv-youare" data-x="' + opts.youAre.x + '" data-y="' + opts.youAre.y + '" data-ox="0" data-oy="0"><i class="mv-ya-dot"></i><span class="mv-ya-t">Вы здесь</span></div>' : '');
      fit();
      return api;
    }
    const api = {
      build, fit,
      view: () => ({ tx: st.tx, ty: st.ty, k: st.k }),
      project: (lon, lat) => { const q = world ? world.P(lon, lat) : [0, 0]; return q; },
      zoomBy: f => { const s = size(); const r = el.getBoundingClientRect(); zoomAt(s.w / 2 + r.left, s.h / 2 + r.top, f); },
      _place: () => { placePins(); updateScale(); if (opts.onView) opts.onView({ k: st.k, tx: st.tx, ty: st.ty }); },
      destroy: () => { }
    };
    let worldP = () => [0, 0];
    api._setP = p => { worldP = p; };
    return api;
  }

  /* Расстояние по прямой, км (haversine) */
  function distKm(a, b) {
    const R = 6371, dLa = (b[1] - a[1]) * Math.PI / 180, dLo = (b[0] - a[0]) * Math.PI / 180;
    const h = Math.sin(dLa / 2) ** 2 + Math.cos(a[1] * Math.PI / 180) * Math.cos(b[1] * Math.PI / 180) * Math.sin(dLo / 2) ** 2;
    return 2 * R * Math.asin(Math.sqrt(h));
  }
  const walkMin = km => Math.round(km / 4.5 * 60);

  return { load, mount, worldSVG, proj, distKm, walkMin, WORLD_W, LAYER_LABEL };
})();
