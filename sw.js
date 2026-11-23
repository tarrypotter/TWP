/* TWP hub — offline cache (root app only)
   주의: /TWP/cafe/, /TWP/novel/ 등 하위 앱은 각자의 서비스워커(scope)를 가진다.
   이 SW는 루트 허브의 자산에만 개입하고, 나머지 요청은 절대 가로채지 않는다. */
const CACHE = 'twp-hub-v1';
const CORE = [
  './', './index.html', './manifest.json',
  './apple-touch-icon.png', './icon-192.png', './icon-512.png',
  './icon-maskable-512.png', './favicon-32.png'
];
// 루트 앱의 자산만 이 SW가 처리한다 (하위 앱 경로 제외)
const OWN = /^\/TWP\/(index\.html)?(\?.*)?(#.*)?$/;

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE)
      .then((c) => Promise.all(CORE.map((u) => c.add(new Request(u, { cache: 'reload' })).catch(() => null))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);

  // 같은 오리진의 루트 허브 자산이 아니면 개입하지 않는다
  // (하위 앱 경로·다른 오리진 CDN은 브라우저/각 앱의 SW가 처리)
  if (url.origin !== self.location.origin) return;
  if (!OWN.test(url.pathname) && !/\.(png|json)$/.test(url.pathname)) return;
  if (/\/TWP\/(cafe|novel|albalog|cardduel|draftxi|abyssblade|moneylog|medical|medical-archive|portfolio)\//.test(url.pathname)) return;

  // 문서: 네트워크 우선, 실패 시 캐시
  if (req.mode === 'navigate' || req.destination === 'document') {
    e.respondWith(
      fetch(req)
        .then((r) => { const copy = r.clone(); caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {}); return r; })
        .catch(() => caches.match(req).then((m) => m || caches.match('./index.html')))
    );
    return;
  }

  // 정적 자산(아이콘·manifest): 캐시 우선
  e.respondWith(
    caches.match(req).then((hit) => {
      if (hit) return hit;
      return fetch(req).then((r) => {
        if (r && r.ok) {
          const copy = r.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return r;
      }).catch(() => hit);
    })
  );
});
