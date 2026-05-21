const CACHE_NAME = 'freimanautos-pwa-v10';

const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/styles.css',
  '/js/api.js',
  '/js/utils.js',
  '/js/state.js',
  '/js/auth.js',
  '/js/dashboard.js',
  '/js/ordenes.js',
  '/js/mecanico.js',
  '/js/cliente.js',
  '/js/cotizaciones.js',
  '/js/taller.js',
  '/js/repuestos.js',
  '/js/reportes.js',
  '/js/metas.js',
  '/js/app.js',
  '/manifest.webmanifest'
];

// Hosts externos que siempre van por red
const EXTERNAL_HOSTS = [
  'supabase.co',
  'supabase.in',
  'googleapis.com',
  'cdnjs.cloudflare.com',
  'telegram.org',
  'api.telegram.org'
];

function isExternal(url) {
  try {
    const { hostname } = new URL(url);
    return EXTERNAL_HOSTS.some(h => hostname.includes(h));
  } catch {
    return false;
  }
}

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const { request } = event;
  const method = request.method.toUpperCase();

  // Red exclusiva: métodos mutantes o requests externos
  if (method !== 'GET' || isExternal(request.url)) {
    event.respondWith(fetch(request));
    return;
  }

  // Cache-first con fallback a red para assets locales GET
  event.respondWith(
    caches.match(request).then(cached => {
      if (cached) return cached;
      return fetch(request).then(response => {
        if (!response || response.status !== 200 || response.type === 'opaque') {
          return response;
        }
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, clone));
        return response;
      });
    })
  );
});
