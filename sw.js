const CACHE = 'chezjalel-v59';
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('chezjalel-') && k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  if (req.mode === 'navigate' || url.pathname.endsWith('/app-version.json') || url.pathname.endsWith('/index.html')) {
    event.respondWith(fetch(new Request(req, {cache:'no-store'})).catch(()=>caches.match(req).then(r=>r||caches.match('/index.html'))));
  }
});
