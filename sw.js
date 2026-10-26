/* Increment this version whenever the cached app shell changes. */
'use strict';
const BASE = new URL('./', self.location.href);
const CACHE_PREFIX = 'futari-shell-' + encodeURIComponent(BASE.pathname) + '-';
const CACHE_NAME = CACHE_PREFIX + 'v20';
const SHELL = [
  'food.js', 'journal.css', 'creatures.js', 'creatures.css', 'index.html', 'app.js', 'preservation.js', 'rescue.html', 'rescue.js', 'data.js','activity.js','sync-engine.js','interior.js','village.js','calendar.js','content.js','home.js', 'farm.js', 'today.js', 'dodge.js', 'board-games.js', 'game.css', 'config.js', 'pwa.js',
  'manifest.webmanifest', 'vendor/react.js', 'vendor/react-dom.js', 'vendor/supabase.js',
  'icons/icon-192.png', 'icons/icon-512.png', 'icons/icon-maskable-512.png', 'icons/apple-touch-icon.png'
].map(path => new URL(path, BASE).href);

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(SHELL.map(url => new Request(url, { cache: 'reload' })))));
  // Updates wait for old tabs to close; never force a reload during editing.
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(
    keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME)
      .map(key => caches.delete(key))
  )).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  const url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== BASE.origin) return;
  const navigation = request.mode === 'navigate' &&
    (url.pathname === BASE.pathname || url.pathname === new URL('index.html', BASE).pathname);
  // Room links share the shell; never cache their query strings or Supabase data.
  const key = navigation ? new URL('index.html', BASE).href : url.href;
  if (!navigation && !SHELL.includes(key)) return;
  event.respondWith(caches.open(CACHE_NAME).then(async cache => {
    // Online visits revalidate files, even when a cache version was not bumped.
    // Offline or failed deployments fall back to the last working response.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 4000);
    try {
      const response = await fetch(request, { cache: 'no-cache', signal: controller.signal });
      if (response.ok) {
        try { await cache.put(key, response.clone()); } catch (error) { /* storage full: still show online response */ }
        return response;
      }
      return (await cache.match(key)) || response;
    } catch (error) {
      const cached = await cache.match(key);
      if (cached) return cached;
      throw error;
    } finally { clearTimeout(timer); }
  }));
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'ACTIVATE_UPDATE') event.waitUntil(self.skipWaiting());
});
