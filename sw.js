/* Cache the public app shell only. Never cache orders, tokens or API responses. */
const PREFIX='mos-meat-shell-'+encodeURIComponent(new URL(self.registration.scope).pathname)+'-';
const CACHE=PREFIX+'v2';
const FILES=['./','./index.html','./styles.css','./app.js','./config.js','./mark.svg','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./icons/apple-touch-icon.png'];
const paths=new Set(FILES.map(f=>new URL(f,self.registration.scope).pathname));
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith(PREFIX)&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',event=>{
 const req=event.request,url=new URL(req.url);if(req.method!=='GET'||url.origin!==self.location.origin)return;
 if(req.mode==='navigate'){
  // Only the static entry point is available offline; admin data stays network-only.
  event.respondWith(fetch(req).catch(async()=>await caches.match(new URL('./index.html',self.registration.scope).href)||Response.error()));return;
 }
 if(!paths.has(url.pathname))return;
 event.respondWith(fetch(req).then(res=>{if(res.ok){const copy=res.clone();event.waitUntil(caches.open(CACHE).then(cache=>cache.put(new Request(url.origin+url.pathname),copy)));}return res;}).catch(async()=>await caches.match(url.origin+url.pathname)||Response.error()));
});
self.addEventListener('push',event=>{
 // Every received push immediately displays a notification, as required on iOS.
 let data={};try{data=event.data?.json()||{};}catch{}
 event.waitUntil(self.registration.showNotification(data.test?'Mo’s Meat · Test alert':'Mo’s Meat · New order',{
  body:data.test?'Background notifications are working. No order was created.':'A new customer order is ready in your order book.',
  icon:new URL('./icons/icon-192.png',self.registration.scope).href,
  tag:'mos-order-'+String(data.order_id||'new'),renotify:false,
  data:{url:new URL('./index.html#admin',self.registration.scope).href}
 }));
});
self.addEventListener('notificationclick',event=>{
 event.notification.close();const target=new URL('./index.html#admin',self.registration.scope).href;
 event.waitUntil(self.clients.matchAll({type:'window',includeUncontrolled:true}).then(async clients=>{for(const client of clients){if(client.url.startsWith(self.registration.scope)&&'focus' in client){await client.navigate(target);return client.focus();}}return self.clients.openWindow(target);}));
});
