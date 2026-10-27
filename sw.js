/* Service worker «Острова»: всё приложение кладётся в кеш при установке и дальше работает без сети.
   Выпуск новой версии: поменяй VERSION, и телефоны подтянут обновление при следующем запуске. */
const VERSION = 'ostrov-v1';
const SHELL = [
  './',
  './index.html',
  './styles.css',
  './app.js',
  './island.js',
  './manifest.webmanifest',
  './vendor/three.module.min.js',
  './fonts/fonts.css',
  './fonts/onest-cyrillic-wght-normal.woff2',
  './fonts/onest-latin-wght-normal.woff2',
  './fonts/unbounded-cyrillic-wght-normal.woff2',
  './fonts/unbounded-latin-wght-normal.woff2',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', function (event) {
  event.waitUntil(
    caches.open(VERSION)
      .then(function (cache) { return cache.addAll(SHELL.map(function (u) { return new Request(u, { cache: 'reload' }); })); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener('activate', function (event) {
  event.waitUntil(
    caches.keys()
      .then(function (keys) { return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); })); })
      .then(function () { return self.clients.claim(); })
  );
});

self.addEventListener('fetch', function (event) {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  const scope = new URL(self.registration.scope);
  const isShell = req.mode === 'navigate' && (url.pathname === scope.pathname || url.pathname === scope.pathname + 'index.html');

  // само приложение: из кеша сразу, даже без сети и с параметрами вроде ?action=capture
  if (isShell) {
    event.respondWith(caches.match('./index.html').then(function (hit) { return hit || fetch(req); }));
    return;
  }
  // другие страницы (например, concepts/): сначала сеть, без сети из кеша
  if (req.mode === 'navigate') {
    event.respondWith(fetch(req).catch(function () { return caches.match(req); }));
    return;
  }
  // файлы приложения: из кеша, а чего нет в кеше, берём из сети и запоминаем
  event.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(VERSION).then(function (cache) { cache.put(req, copy); });
        }
        return res;
      });
    })
  );
});
