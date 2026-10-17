// Offline support. The version is set in version.js; bump it there
// whenever any file changes so phones download the new copy.
importScripts("version.js");
var VERSION = "autotools-" + APP_VERSION;
var FILES = ["./", "index.html", "version.js", "manifest.json", "icon-192.png", "icon-512.png"];
// Extras are stored too, but one going missing mustn't stop the offline copy from installing
var EXTRAS = ["changelog.js"];

// GitHub Pages lets browsers reuse files for 10 minutes. Always ask the
// server for the current copy instead, so updates show up straight away.
function fresh(req) {
  return fetch(req.url, { cache: "no-cache", credentials: "same-origin" });
}

self.addEventListener("install", function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) {
    return c.addAll(FILES.map(function (f) { return new Request(f, { cache: "reload" }); })).then(function () {
      return Promise.all(EXTRAS.map(function (f) { return c.add(new Request(f, { cache: "reload" })).catch(function () {}); }));
    });
  }));
  self.skipWaiting();
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.filter(function (k) { return k !== VERSION; })
        .map(function (k) { return caches.delete(k); }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Network first (so updates show up), cached copy when offline.
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;
  if (new URL(e.request.url).origin !== self.location.origin) return;
  e.respondWith(
    fresh(e.request).then(function (r) {
      // Keep one copy per file: "version.js?nc=123" (the update check) is stored as "version.js"
      // instead of a new entry every time. Errors aren't stored.
      if (r.ok) {
        var copy = r.clone();
        caches.open(VERSION).then(function (c) { c.put(e.request.url.split("?")[0], copy); });
      }
      return r;
    }).catch(function () {
      return caches.match(e.request, { ignoreSearch: true }).then(function (r) {
        return r || caches.match("index.html");
      });
    })
  );
});
