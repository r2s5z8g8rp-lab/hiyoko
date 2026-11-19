// オフラインでもアプリ画面を開けるようにする（天気等のAPIはネットワーク優先）
const CACHE = 'tsuribiyori-v1';
const ASSETS = ['./', 'index.html', 'css/style.css', 'js/app.js', 'js/astro.js', 'js/weather.js', 'js/fish.js',
  'js/spots.js', 'js/planner.js', 'js/chart.js', 'manifest.webmanifest', 'icons/icon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // 自サイトのファイル：ネットワーク優先、失敗時キャッシュ
  e.respondWith(fetch(e.request).then((res) => {
    const copy = res.clone();
    caches.open(CACHE).then((c) => c.put(e.request, copy));
    return res;
  }).catch(() => caches.match(e.request)));
});
