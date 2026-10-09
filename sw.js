const CACHE_NAME = 'talca-cache-v19';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './app.min.js',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        return cache.addAll(urlsToCache);
      })
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  // Solo interceptar peticiones GET
  if (event.request.method !== 'GET') return;

  event.respondWith(
    fetch(event.request).then(response => {
      // Verificar si recibimos una respuesta válida
      if(!response || response.status !== 200 || response.type !== 'basic') {
        return response;
      }

      // Clonar la respuesta para guardarla en el caché
      var responseToCache = response.clone();
      caches.open(CACHE_NAME).then(cache => {
        cache.put(event.request, responseToCache);
      });

      return response;
    }).catch(() => {
      // Si falla la red, intentar buscar en el caché
      return caches.match(event.request);
    })
  );
});
