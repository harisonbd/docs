// Offline support: stores every app file on the phone the first time the app opens.
// To publish an update later, change VERSION (e.g. 'pocketdocs-v2') and upload the changed files.
const VERSION = 'pocketdocs-v2';
const FILES = [
  './', 'index.html', 'manifest.json', 'icon-192.png', 'icon-512.png', 'icon-maskable.png',
  'jszip.min.js', 'pdf.min.js', 'pdf.worker.min.js',
  'openjpeg.wasm', 'jbig2.wasm', 'qcms_bg.wasm',
  'FoxitDingbats.pfb', 'FoxitFixed.pfb', 'FoxitFixedBold.pfb', 'FoxitFixedBoldItalic.pfb', 'FoxitFixedItalic.pfb',
  'FoxitSerif.pfb', 'FoxitSerifBold.pfb', 'FoxitSerifBoldItalic.pfb', 'FoxitSerifItalic.pfb', 'FoxitSymbol.pfb',
  'LiberationSans-Bold.ttf', 'LiberationSans-BoldItalic.ttf', 'LiberationSans-Italic.ttf', 'LiberationSans-Regular.ttf',
];

self.addEventListener('install', (e) => {
  // cache: 'reload' skips the browser's short-term copy, so an update always gets the newest files.
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES.map((f) => new Request(f, { cache: 'reload' })))).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) =>
      hit || fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))
    )
  );
});
