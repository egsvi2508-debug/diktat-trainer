// Offline cache for Satzlehre Übungen. The version changes with every build.
const CACHE = 'diktat-5029aeb17c';
const ASSETS = ["./", "fonts/0cde73c41e1f.woff2", "fonts/0fc4145cef7c.woff2", "fonts/10acfd9305c5.woff2", "fonts/263f22c1dd5b.woff2", "fonts/348e1f1bbbbc.woff2", "fonts/53e90c823481.woff2", "fonts/62b7645c78e0.woff2", "fonts/8d81339b38d0.woff2", "fonts/a2b244c4c109.woff2", "fonts/ad9be8ead68e.woff2", "fonts/b74bcf5197dc.woff2", "fonts/bc53bd3d45d6.woff2", "fonts/cc6b0f988562.woff2", "fonts/d0a4c66301b4.woff2", "fonts/de6129d56346.woff2", "fonts/df8d14109c88.woff2", "fonts/e0a5d1ccc547.woff2", "fonts/e777ca58d840.woff2", "fonts/ed7aa40cd190.woff2", "fonts/f5edc35910c2.woff2", "fonts/fonts.css", "icons/apple-touch-icon.png", "icons/favicon-64.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "index.html", "js/app.js", "js/audio.js", "js/backend.js", "js/core.js", "js/ex-context.js", "js/ex-ctxsing.js", "js/ex-flight.js", "js/ex-harmony.js", "js/ex-intervals.js", "js/ex-modes.js", "js/ex-rhythm.js", "js/ex-sing.js", "js/ex-two.js", "js/gen.js", "js/i18n.js", "js/mic.js", "js/notation.js", "js/ui.js", "manifest.webmanifest", "samples/A1.mp3", "samples/A2.mp3", "samples/A3.mp3", "samples/A4.mp3", "samples/A5.mp3", "samples/A6.mp3", "samples/C2.mp3", "samples/C3.mp3", "samples/C4.mp3", "samples/C5.mp3", "samples/C6.mp3", "samples/C7.mp3", "samples/Ds2.mp3", "samples/Ds3.mp3", "samples/Ds4.mp3", "samples/Ds5.mp3", "samples/Ds6.mp3", "samples/Fs2.mp3", "samples/Fs3.mp3", "samples/Fs4.mp3", "samples/Fs5.mp3", "samples/Fs6.mp3", "vendor/vexflow.js"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
// The app itself (page, code, manifest) is fetched fresh from the network whenever online, so a new
// version shows up immediately; the saved copy is used offline. Big files that never change between
// versions (notation library, fonts, piano samples, icons) come from the cache.
const FRESH = /(\/|\.html|\.js|\.webmanifest)$/;
self.addEventListener('fetch', e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const fresh = req.mode === 'navigate' || (FRESH.test(url.pathname) && !url.pathname.includes('/vendor/'));
  if (fresh) {
    // a fresh request for the plain URL works for every kind of load (page, script, manifest)
    e.respondWith(fetch(url.href, { cache: 'no-cache', credentials: 'same-origin' }).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
    return;
  }
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  })));
});
