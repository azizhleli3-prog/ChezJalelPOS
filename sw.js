const CACHE = 'chezjalel-v63';
self.addEventListener('install', event => { self.skipWaiting(); });
self.addEventListener('activate', event => {
  event.waitUntil((async()=>{
    const keys = await caches.keys();
    await Promise.all(keys.filter(k=>k.startsWith('chezjalel-') && k!==CACHE).map(k=>caches.delete(k)));
    await self.clients.claim();
  })());
});
self.addEventListener('push', event => {
  let data={}; try{ data=event.data?event.data.json():{}; }catch(e){ data={}; }
  const title=data.title||'ChezJalelPOS';
  const options={
    body:data.body||'تحديث جديد متوفر لـ ChezJalelPOS.',
    icon:data.icon||'./favicon.png',
    badge:data.badge||'./favicon.png',
    tag:data.tag||'chezjalel-update',
    renotify:true,
    data:data.data||{type:'app-update'}
  };
  event.waitUntil(self.registration.showNotification(title,options));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async()=>{
    const target=new URL('./?pushUpdate=1',self.location.origin).href;
    const clients=await self.clients.matchAll({type:'window',includeUncontrolled:true});
    for(const c of clients){ if('focus' in c){ await c.focus(); if(c.navigate) await c.navigate(target); return; } }
    if(self.clients.openWindow) await self.clients.openWindow(target);
  })());
});
self.addEventListener('fetch', event => {
  const req=event.request;
  if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(url.origin!==location.origin) return;
  if(req.mode==='navigate'||url.pathname.endsWith('/app-version.json')||url.pathname.endsWith('/index.html')){
    event.respondWith(fetch(new Request(req,{cache:'no-store'})).catch(()=>caches.match(req).then(r=>r||caches.match('/index.html'))));
  }
});
