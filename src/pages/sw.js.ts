/**
 * 서비스 워커. 빌드할 때마다 VERSION이 바뀌어서, 새로 배포하면 휴대폰에 설치한 앱도 새 버전을 받는다.
 * - /_astro/ 아래 파일(이름에 내용의 지문이 붙어 바뀌지 않는다)과 아이콘: 한 번 받으면 기기에 두고 쓴다.
 * - 페이지: 인터넷이 되면 늘 새로 받고, 받은 페이지는 기기에 남긴다. 끊기면 남겨 둔 페이지를 보여 준다.
 * - 글꼴(Google Fonts): 기기에 둔 것을 먼저 쓰고, 뒤에서 새로 받아 둔다.
 * - 배경 음악과 그 밖의 다른 사이트: 건드리지 않는다(파일이 커서 저장하지 않는다).
 */
import type { APIRoute } from 'astro';

const BASE = import.meta.env.BASE_URL.replace(/\/?$/, '/');
const VERSION = new Date().toISOString();

const OFFLINE_HTML = `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>연결 없음 · 137</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d0c0a;color:#ece6d9;font-family:system-ui,sans-serif;padding:24px;box-sizing:border-box}
main{max-width:28em;display:grid;gap:14px}h1{font-family:Georgia,serif;color:#e7913a;font-size:2.4rem;margin:0}p{line-height:1.7;color:#bdb5a5;margin:0}a{color:#f2b46b}</style></head>
<body><main><h1>137</h1><p>지금은 인터넷이 연결되어 있지 않아요. 한 번 열어 본 강은 연결이 없어도 다시 볼 수 있어요.</p><p><a href="${BASE}">처음 화면으로</a></p></main></body></html>`;

const code = `
const VERSION = ${JSON.stringify(VERSION)};
const BASE = ${JSON.stringify(BASE)};
const PAGES = 'qm-pages-' + VERSION;
const ASSETS = 'qm-assets';
const FONTS = 'qm-fonts';
const SHELL = [BASE, BASE + 'course/', BASE + 'manifest.webmanifest', BASE + 'favicon.svg', BASE + 'icons/icon-192.png'];
const OFFLINE_HTML = ${JSON.stringify(OFFLINE_HTML)};

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(PAGES).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('qm-pages-') && k !== PAGES).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function cacheFirst(req, name) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) (await caches.open(name)).put(req, res.clone());
  return res;
}

async function staleWhileRevalidate(req, name) {
  const cache = await caches.open(name);
  const hit = await cache.match(req);
  const fresh = fetch(req).then((res) => {
    if (res.status === 200 || res.type === 'opaque') cache.put(req, res.clone());
    return res;
  }).catch(() => hit);
  return hit || fresh;
}

async function networkFirst(req) {
  const cache = await caches.open(PAGES);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    const hit = (await cache.match(req, { ignoreSearch: true })) || (await caches.match(req, { ignoreSearch: true }));
    if (hit) return hit;
    return new Response(OFFLINE_HTML, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // 소리와 영상처럼 나눠 받는 요청(Range)은 건드리지 않는다.
  if (req.method !== 'GET' || req.headers.has('range') || req.destination === 'audio' || req.destination === 'video') return;
  const url = new URL(req.url);
  if (url.origin === self.location.origin) {
    if (url.pathname === BASE + 'sw.js') return;
    if (url.pathname.startsWith(BASE + '_astro/') || url.pathname.startsWith(BASE + 'icons/')) {
      event.respondWith(cacheFirst(req, ASSETS));
      return;
    }
    const isPage = req.mode === 'navigate' || url.pathname.endsWith('/') || (req.headers.get('accept') || '').includes('text/html');
    event.respondWith(isPage ? networkFirst(req) : staleWhileRevalidate(req, ASSETS));
    return;
  }
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') {
    event.respondWith(staleWhileRevalidate(req, FONTS));
  }
});
`;

export const GET: APIRoute = () =>
  new Response(code, { headers: { 'Content-Type': 'application/javascript; charset=utf-8' } });
