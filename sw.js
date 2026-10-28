// Сервис-воркер: приложение открывается и работает без интернета.
// При изменении файлов приложения увеличьте VERSION — телефон подхватит обновление.

const VERSION = 'v3';
const CACHE = `tracker-${VERSION}`;

const SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/base.css',
  './css/themes.css',
  './css/views/journal.css',
  './css/views/plan.css',
  './css/views/settings.css',
  './css/views/summary.css',
  './css/views/today.css',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
  './icons/icon.svg',
  './js/app.js',
  './js/dates.js',
  './js/decor.js',
  './js/defaults.js',
  './js/firebase-config.js',
  './js/icons.js',
  './js/store.js',
  './js/streak.js',
  './js/sync-core.js',
  './js/sync.js',
  './js/themes.js',
  './js/ui.js',
  './js/views/journal.js',
  './js/views/onboarding.js',
  './js/views/plan.js',
  './js/views/settings-backup.js',
  './js/views/settings-metrics.js',
  './js/views/settings-skills.js',
  './js/views/settings-skins.js',
  './js/views/settings.js',
  './js/views/summary.js',
  './js/views/today.js',
  './learn/content/eng-art.js',
  './learn/content/eng-dialogs.js',
  './learn/content/eng-words.js',
  './learn/content/eng.js',
  './learn/content/glossary-eng.js',
  './learn/content/glossary-knit.js',
  './learn/content/glossary-left.js',
  './learn/content/guide.js',
  './learn/content/knit-art.js',
  './learn/content/knit-extra.js',
  './learn/content/knit.js',
  './learn/content/left-art.js',
  './learn/content/left-worksheets.js',
  './learn/content/left.js',
  './learn/css/learn.css',
  './learn/index.html',
  './learn/js/app.js',
  './learn/js/art.js',
  './learn/js/content.js',
  './learn/js/lic.js',
  './learn/js/markup.js',
  './learn/js/progress.js',
  './learn/js/speech.js',
  './learn/js/task-map.js',
  './learn/js/timer.js',
  './learn/js/views/common.js',
  './learn/js/views/dialogs.js',
  './learn/js/views/glossary.js',
  './learn/js/views/guide.js',
  './learn/js/views/lesson.js',
  './learn/js/views/more.js',
  './learn/js/views/path.js',
  './learn/js/views/session.js',
  './learn/js/views/sheets.js',
  './learn/js/views/shop.js',
  './learn/js/views/skill.js',
  './learn/js/views/words.js',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('tracker-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// Страница приложения: «Уроки» (learn/) или сам трекер.
function pageKey(url) {
  return url.pathname.includes('/learn/') ? './learn/index.html' : './index.html';
}

// Кэшируем: свои файлы, шрифты Google и модули Firebase SDK. Запросы к базе данных — никогда.
function cacheable(url) {
  if (url.origin === self.location.origin) return true;
  if (url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com') return true;
  if (url.hostname === 'www.gstatic.com' && url.pathname.startsWith('/firebasejs/')) return true;
  return false;
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (!cacheable(url)) return;

  // Страница: сначала сеть (чтобы получить свежую версию), без сети — из кэша.
  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(pageKey(url), copy));
          return res;
        })
        .catch(() => caches.match(pageKey(url), { ignoreSearch: true })),
    );
    return;
  }

  // Остальное: из кэша сразу, параллельно обновляем кэш из сети.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res.ok || res.type === 'opaque') {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
