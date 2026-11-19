/* 세종월드교회 카페 — 서비스 워커
   원칙: 화면(HTML)·스크립트는 항상 네트워크 우선 → 새 배포가 바로 반영되고,
   네트워크가 끊겼을 때만 캐시로 대신 열어 줍니다. (정적 셸 캐시 충돌 없음) */
const CACHE = 'sejong-cafe-v1';
const SHELL = ['./', './index.html', './style.css', './core.js', './manifest.json',
  './icon-192.png', './icon-512.png', './icon-180.png'];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // 하나라도 실패해도 설치가 깨지지 않게 개별로 담습니다
    await Promise.all(SHELL.map(u => cache.add(new Request(u, { cache: 'reload' })).catch(() => { })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

async function put(req, res) {
  if (!res || !res.ok || res.type === 'opaque') return;
  try { const cache = await caches.open(CACHE); await cache.put(req, res); } catch (e) { }
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try { url = new URL(req.url); } catch (e) { return; }
  // 다른 출처(Firebase·폰트 CDN)는 손대지 않고 그대로 네트워크로
  if (url.origin !== self.location.origin) return;

  // 화면 이동: 네트워크 우선 → 실패하면 캐시 → 그것도 없으면 index.html
  if (req.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const res = await fetch(req);
        put(req, res.clone());
        return res;
      } catch (e) {
        const cache = await caches.open(CACHE);
        return (await cache.match(req)) || (await cache.match('./index.html')) || Response.error();
      }
    })());
    return;
  }

  // 정적 자원: 네트워크 우선, 실패 시 캐시
  event.respondWith((async () => {
    try {
      const res = await fetch(req);
      put(req, res.clone());
      return res;
    } catch (e) {
      const hit = await caches.match(req);
      if (hit) return hit;
      return Response.error();
    }
  })());
});

/* 알림 클릭 → 앱 열기/포커스 */
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const all = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const c of all) { if ('focus' in c) return c.focus(); }
    if (self.clients.openWindow) return self.clients.openWindow('./');
  })());
});
