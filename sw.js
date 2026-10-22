// Offline support: stores every app file on the phone the first time the app opens.
// To publish an update later, change VERSION (e.g. 'pocketdocs-v2') and upload the changed files.
const VERSION = 'pocketdocs-v10';
const MAX_FILE = 100 * 1024 * 1024; // shared files over 100 MB are skipped
const FILES = [
  './', 'index.html', 'manifest.json', 'logo-192.png', 'logo-512.png', 'logo-maskable.png',
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
      // Only our own old caches. Other apps on this origin (label-check, Sun Launcher) keep theirs.
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('pocketdocs-') && k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// "Share to Pocket Docs": Android sends shared files here. Park them, then open the app,
// which asks "Add <name>?" before importing them (see receiveShared in index.html), because
// any website can send a file to this address. Nothing leaves the phone.
async function receiveShare(req) {
  try {
    const form = await req.formData();
    const inbox = await caches.open('share-inbox');
    const files = form.getAll('file').filter((f) => f && typeof f !== 'string' && f.size > 0 && f.size <= MAX_FILE);
    let i = 0;
    for (const f of files) {
      await inbox.put(new Request(`./__shared/${Date.now()}-${i++}`), new Response(f, {
        headers: { 'Content-Type': f.type || 'application/octet-stream', 'X-Name': encodeURIComponent(f.name || 'shared') },
      }));
    }
    const text = { title: form.get('title') || '', text: form.get('text') || '', url: form.get('url') || '' };
    if (!files.length && (text.text || text.url)) {
      await inbox.put(new Request('./__shared/text'), new Response(JSON.stringify(text), { headers: { 'Content-Type': 'application/json' } }));
    }
  } catch (err) { /* open the app anyway */ }
  return Response.redirect('./?shared=1', 303);
}

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method === 'POST' && url.origin === location.origin && url.pathname.endsWith('/share-target')) {
    e.respondWith(receiveShare(req));
    return;
  }
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then((hit) =>
      hit || fetch(req).catch(() => (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))
    )
  );
});
