// ============================================================
//  KS_DATA_PRO — Service Worker  v1.0
//  Cache shell files for offline / faster load
// ============================================================

var CACHE_NAME = 'ks-dashboard-v1';
var SHELL = [
  './dashboard.html',
  './manifest.json',
  './icon.svg',
];

// ── Install: cache shell ──────────────────────────────────────
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(SHELL);
    })
  );
  self.skipWaiting();
});

// ── Activate: remove old caches ──────────────────────────────
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    })
  );
  self.clients.claim();
});

// ── Fetch: network-first for API, cache-first for shell ──────
self.addEventListener('fetch', function(e) {
  var url = e.request.url;

  // Always go network for Apps Script API calls
  if (url.indexOf('script.google.com') > -1 ||
      url.indexOf('fonts.googleapis.com') > -1 ||
      url.indexOf('cdnjs.cloudflare.com') > -1) {
    e.respondWith(fetch(e.request).catch(function() {
      return new Response('{}', { headers: { 'Content-Type': 'application/json' } });
    }));
    return;
  }

  // Cache-first for shell files
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(response) {
        // Cache new shell files
        var clone = response.clone();
        caches.open(CACHE_NAME).then(function(cache) { cache.put(e.request, clone); });
        return response;
      });
    }).catch(function() {
      // Offline fallback — return cached dashboard
      return caches.match('./dashboard.html');
    })
  );
});
