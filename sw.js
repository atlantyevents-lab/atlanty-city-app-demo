/* sw.js — сервис-воркер демо «Атланты Сити».
   Регистрируется при atl-server=1 (сервер подменяет метку) и в публичной
   сборке Pages (atl-server=pub); в публичной копии CACHE_VERSION заменяется
   скриптом публикации на atl-pub-<дата>. Стратегия: HTML и /api — сначала
   сеть (офлайн — последний кэш); статика — кэш-first с обновлением в фоне.
   /api/* и /admin не кэшируются. Предкэш — пофайлово: отсутствующие
   (например, final_* в публичной сборке) не роняют установку. */
'use strict';
const CACHE_VERSION = 'atl-pub-202611251817';
const SHELL = [
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './css/cabinet.css',
  './css/console.css',
  './css/exhibitor.css',
  './css/feed.css',
  './css/market.css',
  './css/onboarding.css',
  './css/path.css',
  './css/people.css',
  './css/program.css',
  './css/shell.css',
  './css/tokens.css',
  './js/core.js',
  './js/map.js',
  './js/sync.js',
  './js/screens/A.js',
  './js/screens/B.js',
  './js/screens/C.js',
  './js/screens/D.js',
  './js/screens/E.js',
  './js/screens/F.js',
  './js/screens/G.js',
  './js/screens/H.js',
  './js/screens/I.js',
  './js/screens/J.js',
  './js/screens/K.js',
  './js/screens/L.js',
  './js/screens/M.js',
  './js/screens/N.js',
  './js/screens/O.js',
  './js/screens/P.js',
  './js/screens/R.js',
  './js/screens/Z.js',
  './data/fixtures.js',
  './data/fx_feed.js',
  './data/fx_market.js',
  './data/fx_ops.js',
  './data/fx_path.js',
  './data/fx_people.js',
  './data/fx_profile.js',
  './data/fx_program.js',
  './data/fx_shared.js',
  './assets/fonts/BebasNeue-Bold.woff',
  './assets/fonts/BebasNeue-Regular.woff',
  './assets/fonts/NotoSerif.ttf',
  './assets/fonts/Raleway-Bold.woff',
  './assets/fonts/Raleway-Regular.woff',
  './assets/fonts/Raleway-SemiBold.woff',
  './assets/map/labels_summer.json',
  './assets/map/labels_winter.json',
  './assets/map/zavidovo.geojson',
  './assets/map/final_summer_1200.webp',
  './assets/map/final_winter_1200.webp',
  './assets/icons/apple-touch-icon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable-512.png',
  './assets/svg/gradient-city.svg',
  './assets/svg/grid-tile.svg',
  './assets/svg/grid.svg',
  './assets/svg/icon-circle-arrow-solid.svg',
  './assets/svg/icon-circle-arrow.svg',
  './assets/svg/icon-infinity-circle-solid.svg',
  './assets/svg/icon-infinity-circle.svg',
  './assets/svg/icon-star-square-solid.svg',
  './assets/svg/icon-star-square.svg',
  './assets/svg/icon-stripes-circle-solid.svg',
  './assets/svg/icon-stripes-circle.svg',
  './assets/svg/icon-triangle-cycle-solid.svg',
  './assets/svg/icon-triangle-cycle.svg',
  './assets/svg/logo-atlanty-black.svg',
  './assets/svg/logo-atlanty-orange.svg',
  './assets/svg/logo-atlanty-white.svg',
  './assets/svg/logo-full-black.svg',
  './assets/svg/logo-full-white.svg',
  './assets/svg/logo-siti-orange.svg',
  './assets/svg/map-zavidovo.svg',
  './assets/svg/pattern-city-bg.svg',
  './assets/svg/topo-lines.svg',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_VERSION).then((c) =>
      Promise.allSettled(SHELL.map((u) => c.add(new Request(u, { cache: 'reload' }))))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE_VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET') return;
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/admin')) return;
  const isHtml = e.request.mode === 'navigate' || /\.html?$/.test(url.pathname);
  const isStatic = /\.(css|js|mjs|png|jpg|jpeg|svg|webp|ico|woff2?|ttf|webmanifest|json|map|geojson)$/.test(url.pathname);

  if (isHtml) {
    e.respondWith(
      fetch(e.request).then((res) => {
        const copy = res.clone();
        caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy));
        return res;
      }).catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html')))
    );
    return;
  }
  if (isStatic || url.origin === self.location.origin) {
    e.respondWith(
      caches.match(e.request).then((hit) => {
        const net = fetch(e.request).then((res) => {
          if (res.ok) { const copy = res.clone(); caches.open(CACHE_VERSION).then((c) => c.put(e.request, copy)); }
          return res;
        }).catch(() => hit);
        return hit || net;
      }).catch(() => new Response('', { status: 504 }))
    );
  }
});
