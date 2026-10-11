#!/usr/bin/env python3
"""Build the standalone web app from index.html + js/.

Outputs
  docs/                   installable, offline-capable site (upload to any static host)
  Satzlehre-Uebungen.html     one self-contained file (open it directly, send it around)

Run:  python3 build_webapp.py
"""
import base64, hashlib, json, re, shutil, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent
OUT = ROOT / 'docs'
CACHE = ROOT / '.build-cache'
VEXFLOW_URL = 'https://cdn.jsdelivr.net/npm/vexflow@4.2.5/build/cjs/vexflow.js'
FONTS_CSS_URL = ('https://fonts.googleapis.com/css2?family=Wix+Madefor+Display:wght@600;700'
                 '&family=Wix+Madefor+Text:wght@400;600;700&display=swap')
UA = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
SAMPLE_URL = 'https://tonejs.github.io/audio/salamander/{}.mp3'   # Salamander Grand Piano, A. Holm, CC BY 3.0
NOTE_NAMES = ['C', 'Cs', 'D', 'Ds', 'E', 'F', 'Fs', 'G', 'Gs', 'A', 'As', 'B']
SAMPLES = [NOTE_NAMES[m % 12] + str(m // 12 - 1) for m in range(33, 97, 3)]   # A1 … C7, same list as js/audio.js
JS_FILES = ['i18n.js', 'core.js', 'backend.js', 'notation.js', 'audio.js', 'ui.js',
            'ex-intervals.js', 'ex-rhythm.js', 'ex-flight.js', 'ex-harmony.js', 'app.js']
NAME, SHORT = 'Satzlehre Übungen', 'Satzlehre Übungen'
DESC = 'Gehörbildung für den Satzlehre-Unterricht: Intervalle, Rhythmus- und Melodiediktat in 6/8, Diktat im Flug und Harmoniefolgen.'


def fetch(url, binary=False):
    CACHE.mkdir(exist_ok=True)
    f = CACHE / hashlib.sha1(url.encode()).hexdigest()
    if not f.exists():
        req = urllib.request.Request(url, headers={'User-Agent': UA})
        f.write_bytes(urllib.request.urlopen(req, timeout=60).read())
    return f.read_bytes() if binary else f.read_text('utf-8')


def make_icons(dst):
    from PIL import Image, ImageDraw
    dst.mkdir(parents=True, exist_ok=True)
    ink, paper, accent = (22, 26, 37), (236, 238, 242), (120, 145, 255)

    def draw(size, maskable):
        S = 1024
        img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        d = ImageDraw.Draw(img)
        if maskable:
            d.rectangle([0, 0, S, S], fill=ink)
        else:
            d.rounded_rectangle([0, 0, S - 1, S - 1], radius=230, fill=ink)
        k = 0.72 if maskable else 0.86          # keep content inside the maskable safe zone
        ox = oy = S * (1 - k) / 2
        u = S * k / 48
        for y in (14, 20, 26, 32, 38):            # staff lines (same drawing as the page logo)
            d.line([ox + 3 * u, oy + y * u, ox + 45 * u, oy + y * u], fill=paper + (150,), width=max(2, int(1.4 * u)))
        def head(cx, cy, filled, colour):
            layer = Image.new('RGBA', (S, S), (0, 0, 0, 0))
            box = [cx - 5.6 * u, cy - 4.1 * u, cx + 5.6 * u, cy + 4.1 * u]
            if filled:
                ImageDraw.Draw(layer).ellipse(box, fill=colour)
            else:
                ImageDraw.Draw(layer).ellipse(box, outline=colour, width=int(1.9 * u))
            img.alpha_composite(layer.rotate(22, center=(cx, cy), resample=Image.BICUBIC))
        # an interval: filled blue note low, open note high, both with stems up
        head(ox + 15 * u, oy + 32 * u, True, accent)
        d.line([ox + 20 * u, oy + 31 * u, ox + 20 * u, oy + 11 * u], fill=accent, width=int(2 * u))
        head(ox + 31 * u, oy + 20 * u, False, paper)
        d.line([ox + 36.2 * u, oy + 19 * u, ox + 36.2 * u, oy + 2 * u], fill=paper, width=int(2 * u))
        return img.resize((size, size), Image.LANCZOS)

    draw(192, False).save(dst / 'icon-192.png')
    draw(512, False).save(dst / 'icon-512.png')
    draw(512, True).save(dst / 'icon-maskable-512.png')
    draw(180, True).convert('RGB').save(dst / 'apple-touch-icon.png')
    draw(64, False).save(dst / 'favicon-64.png')


def fonts(dst=None):
    """Return @font-face CSS; with dst, save the woff2 files there, otherwise inline them."""
    css = fetch(FONTS_CSS_URL)
    def repl(m):
        url = m.group(1)
        data = fetch(url, binary=True)
        name = hashlib.sha1(url.encode()).hexdigest()[:12] + '.woff2'
        if dst is not None:
            (dst / name).write_bytes(data)
            return f'url({name})'
        return 'url(data:font/woff2;base64,' + base64.b64encode(data).decode() + ')'
    return re.sub(r'url\((https://[^)]+)\)', repl, css)


def split_page():
    src = (ROOT / 'index.html').read_text('utf-8')
    head_end = src.index('</style>') + len('</style>')
    head, body = src[:head_end], src[head_end:]
    title = re.search(r'<title>.*?</title>', head).group(0)
    style = head[head.index('<style>'):]
    body = re.sub(r'\s*<script src="[^"]+"></script>', '', body).strip()
    return title, style, body


BASE_CSS = ('<style>:root{color-scheme:light;padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}'
            'body{margin:0}img{max-width:100%}[hidden]{display:none!important}</style>')


def head_meta(extra=''):
    return ('<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            f'<meta name="description" content="{DESC}">\n'
            '<meta name="theme-color" content="#eceef2" media="(prefers-color-scheme: light)">\n'
            '<meta name="theme-color" content="#0e1117" media="(prefers-color-scheme: dark)">\n' + extra)


def build_site():
    if OUT.exists():
        shutil.rmtree(OUT)
    (OUT / 'js').mkdir(parents=True)
    (OUT / 'vendor').mkdir()
    (OUT / 'fonts').mkdir()
    (OUT / 'samples').mkdir()
    for n in SAMPLES:
        (OUT / 'samples' / f'{n}.mp3').write_bytes(fetch(SAMPLE_URL.format(n), binary=True))
    for f in JS_FILES:
        shutil.copy(ROOT / 'js' / f, OUT / 'js' / f)
    (OUT / 'vendor' / 'vexflow.js').write_text(fetch(VEXFLOW_URL), 'utf-8')
    (OUT / 'fonts' / 'fonts.css').write_text(fonts(OUT / 'fonts'), 'utf-8')
    make_icons(OUT / 'icons')
    title, style, body = split_page()
    scripts = '\n'.join(['<script src="vendor/vexflow.js"></script>'] + [f'<script src="js/{f}"></script>' for f in JS_FILES])
    # register the offline cache; when a new version is published, reload once so it takes effect
    # Register the service worker; look for a new version every time the app is opened or comes back
    # to the foreground, and reload once when one is installed – so changes reach everyone right away.
    sw_reg = ("<script>if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {"
              "const had = !!navigator.serviceWorker.controller;"
              "navigator.serviceWorker.addEventListener('controllerchange', () => { if (had) location.reload(); });"
              "navigator.serviceWorker.register('sw.js').then(reg => {"
              "document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') reg.update().catch(() => {}); });"
              "setInterval(() => reg.update().catch(() => {}), 15 * 60 * 1000); }).catch(() => {}); }</script>")
    # catch the browser's "can be installed" signal before anything else loads, so the install button never misses it
    early = ("<script>window.__installPrompt = null;"
             "addEventListener('beforeinstallprompt', e => { e.preventDefault(); window.__installPrompt = e; document.dispatchEvent(new Event('installready')); });</script>")
    extra = ('<link rel="manifest" href="manifest.webmanifest">\n'
             '<link rel="icon" href="icons/favicon-64.png" type="image/png">\n'
             '<link rel="apple-touch-icon" href="icons/apple-touch-icon.png">\n'
             '<meta name="apple-mobile-web-app-capable" content="yes">\n'
             '<meta name="mobile-web-app-capable" content="yes">\n'
             f'<meta name="apple-mobile-web-app-title" content="{SHORT}">\n'
             '<meta name="apple-mobile-web-app-status-bar-style" content="default">\n')
    html = (f'<!doctype html>\n<html lang="de">\n<head>\n{head_meta(extra)}{title}\n'
            f'<link rel="stylesheet" href="fonts/fonts.css">\n{early}\n{BASE_CSS}\n{style}\n</head>\n<body>\n{body}\n{scripts}\n{sw_reg}\n</body>\n</html>\n')
    (OUT / 'index.html').write_text(html, 'utf-8')
    manifest = {
        'id': './', 'name': NAME, 'short_name': SHORT, 'description': DESC, 'lang': 'de',
        'start_url': './', 'scope': './', 'display': 'standalone', 'orientation': 'any',
        'background_color': '#eceef2', 'theme_color': '#161a25',
        'icons': [
            {'src': 'icons/icon-192.png', 'sizes': '192x192', 'type': 'image/png', 'purpose': 'any'},
            {'src': 'icons/icon-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'any'},
            {'src': 'icons/icon-maskable-512.png', 'sizes': '512x512', 'type': 'image/png', 'purpose': 'maskable'}
        ]
    }
    (OUT / 'manifest.webmanifest').write_text(json.dumps(manifest, indent=2, ensure_ascii=False), 'utf-8')
    files = sorted(p.relative_to(OUT).as_posix() for p in OUT.rglob('*') if p.is_file())
    digest = hashlib.sha1(b''.join((OUT / f).read_bytes() for f in files)).hexdigest()[:10]
    sw = f"""// Offline cache for Satzlehre Übungen. The version changes with every build.
const CACHE = 'diktat-{digest}';
const ASSETS = {json.dumps(['./'] + files)};
self.addEventListener('install', e => {{
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)).then(() => self.skipWaiting()));
}});
self.addEventListener('activate', e => {{
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
}});
// The app itself (page, code, manifest) is fetched fresh from the network whenever online, so a new
// version shows up immediately; the saved copy is used offline. Big files that never change between
// versions (notation library, fonts, piano samples, icons) come from the cache.
const FRESH = /(\/|\.html|\.js|\.webmanifest)$/;
self.addEventListener('fetch', e => {{
  const req = e.request, url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== location.origin) return;
  const fresh = req.mode === 'navigate' || (FRESH.test(url.pathname) && !url.pathname.includes('/vendor/'));
  if (fresh) {{
    // a fresh request for the plain URL works for every kind of load (page, script, manifest)
    e.respondWith(fetch(url.href, {{ cache: 'no-cache', credentials: 'same-origin' }}).then(res => {{
      if (res.ok) {{ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }}
      return res;
    }}).catch(() => caches.match(req, {{ ignoreSearch: true }}).then(hit => hit || (req.mode === 'navigate' ? caches.match('index.html') : Response.error()))));
    return;
  }}
  e.respondWith(caches.match(req, {{ ignoreSearch: true }}).then(hit => hit || fetch(req).then(res => {{
    if (res.ok) {{ const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }}
    return res;
  }})));
}});
"""
    (OUT / 'sw.js').write_text(sw, 'utf-8')
    (OUT / '.nojekyll').write_text('', 'utf-8')
    return files


def build_single():
    title, style, body = split_page()
    def inline(code):
        return '<script>\n' + code.replace('</script', '<\\/script') + '\n</script>'
    samples = {n: base64.b64encode(fetch(SAMPLE_URL.format(n), binary=True)).decode() for n in SAMPLES}
    scripts = '\n'.join([inline(fetch(VEXFLOW_URL)), inline('window.PIANO_SAMPLES = ' + json.dumps(samples) + ';')]
                         + [inline((ROOT / 'js' / f).read_text('utf-8')) for f in JS_FILES])
    icon = base64.b64encode((OUT / 'icons' / 'favicon-64.png').read_bytes()).decode()
    html = (f'<!doctype html>\n<html lang="de">\n<head>\n{head_meta()}'
            f'<link rel="icon" href="data:image/png;base64,{icon}">\n{title}\n'
            f'<style>\n{fonts()}\n</style>\n{BASE_CSS}\n{style}\n</head>\n<body>\n{body}\n{scripts}\n</body>\n</html>\n')
    (ROOT / 'Satzlehre-Uebungen.html').write_text(html, 'utf-8')


if __name__ == '__main__':
    files = build_site()
    build_single()
    size = sum((OUT / f).stat().st_size for f in files)
    print(f'docs/: {len(files)} files, {size / 1024:.0f} KB')
    print(f"Satzlehre-Uebungen.html: {(ROOT / 'Satzlehre-Uebungen.html').stat().st_size / 1024:.0f} KB")
