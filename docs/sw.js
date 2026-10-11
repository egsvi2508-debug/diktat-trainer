// Offline cache for the Diktat-Trainer. The version changes with every build.
const CACHE = 'diktat-52406f8ae8';
const ASSETS = ["./", "fonts/076f8fd31e21.woff2", "fonts/084d7ee93e7d.woff2", "fonts/135b61110b9a.woff2", "fonts/18535fbd7db5.woff2", "fonts/2cb978b7740e.woff2", "fonts/386222c87c85.woff2", "fonts/a0b5f6f0af89.woff2", "fonts/a29459611b5d.woff2", "fonts/fonts.css", "icons/apple-touch-icon.png", "icons/favicon-64.png", "icons/icon-192.png", "icons/icon-512.png", "icons/icon-maskable-512.png", "index.html", "js/app.js", "js/audio.js", "js/core.js", "js/ex-flight.js", "js/ex-harmony.js", "js/ex-intervals.js", "js/ex-rhythm.js", "js/i18n.js", "js/notation.js", "js/ui.js", "manifest.webmanifest", "samples/A1.mp3", "samples/A2.mp3", "samples/A3.mp3", "samples/A4.mp3", "samples/A5.mp3", "samples/A6.mp3", "samples/C2.mp3", "samples/C3.mp3", "samples/C4.mp3", "samples/C5.mp3", "samples/C6.mp3", "samples/C7.mp3", "samples/Ds2.mp3", "samples/Ds3.mp3", "samples/Ds4.mp3", "samples/Ds5.mp3", "samples/Ds6.mp3", "samples/Fs2.mp3", "samples/Fs3.mp3", "samples/Fs4.mp3", "samples/Fs5.mp3", "samples/Fs6.mp3", "vendor/vexflow.js"];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
    return res;
  }).catch(() => req.mode === 'navigate' ? caches.match('index.html') : Response.error())));
});
