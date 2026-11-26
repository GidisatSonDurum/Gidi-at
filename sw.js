/* Gidişat: telefona bildirim.
   Bu dosya index_2.html ile AYNI klasörde durmalı ve adı sw.js olmalı.
   Tek görevi: ntfy.sh'tan gelen haberi bu uygulamanın adı ve simgesiyle göstermek.
   Hiçbir veri saklamaz, hiçbir yere göndermez, sayfa isteklerine karışmaz (fetch dinlemez). */
'use strict';

var CACHE = 'gk-app';

self.addEventListener('install', function(){ self.skipWaiting(); });
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()); });

function clean(s, n){ return String(s == null ? '' : s).replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]+/g, ' ').slice(0, n); }

/* Sayfanın önbelleğe yazdığı iki küçük not: uygulamanın adresi ve simgesi (mağaza kodu içermez). */
function saved(name){
  try {
    return caches.open(CACHE).then(function(c){ return c.match(self.registration.scope + name); })
      .then(function(r){ return r ? r.text() : ''; })
      .catch(function(){ return ''; });
  } catch(e){ return Promise.resolve(''); }
}

function show(title, body, tag){
  return saved('app-icon').then(function(ic){
    var o = { body: body, lang: 'tr', vibrate: [70, 60, 70] };           /* titreşimi yalnızca Android uygular */
    if (tag) o.tag = tag;
    if (ic && ic.indexOf(self.registration.scope) === 0) o.icon = ic;    /* yalnızca bu uygulamanın kendi simgesi */
    return self.registration.showNotification(title, o);
  });
}

function notice(data){
  var m = data && data.message;
  if (data && data.event === 'message' && m && (m.event === 'message' || m.event == null))
    return show(clean(m.title, 80) || 'Gidişat', clean(m.message, 400), m.id ? 'gk-' + clean(m.id, 40) : '');
  if (data && data.event === 'subscription_expiring')
    return show('Bildirim süresi doluyor', 'Uygulamayı bir kez açman yeter.', 'gk-sure');
  return show('Yeni bildirim', 'Uygulamayı açıp bak.', 'gk-yeni');
}

/* Her push için MUTLAKA bir bildirim gösterilir (iPhone, göstermeyen abonelikleri iptal eder);
   bir şey ters giderse bile en sade bildirim yine çıkar. */
self.addEventListener('push', function(e){
  var data = null, t;
  try { data = e.data ? e.data.json() : null; }
  catch(x){
    try { t = e.data ? e.data.text() : ''; } catch(y){ t = ''; }
    data = t ? { event: 'message', message: { event: 'message', message: t } } : null;
  }
  e.waitUntil(
    Promise.resolve().then(function(){ return notice(data); })
      .catch(function(){ return self.registration.showNotification('Gidişat', { body: 'Yeni bildirim' }); })
      .catch(function(){})
  );
});

/* Bildirime dokununca uygulama açılır: açık pencere varsa öne gelir, yoksa uygulamanın adresi açılır. */
function openApp(){
  var scope = self.registration.scope;
  return self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function(list){
    var i;
    for (i = 0; i < list.length; i++)
      if (String(list[i].url).indexOf(scope) === 0 && list[i].focus) return list[i].focus();
    return saved('app-url').then(function(u){
      if (self.clients.openWindow) return self.clients.openWindow(u && u.indexOf(scope) === 0 ? u : scope);
    });
  });
}
self.addEventListener('notificationclick', function(e){
  e.notification.close();
  e.waitUntil(openApp().catch(function(){}));
});
