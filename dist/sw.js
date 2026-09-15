const CACHE_NAME = 'mirage-app-shell-v1';
const MAP_TILE_CACHE = 'mirage-map-tiles-v1';

// Assets to cache immediately on service worker install
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/src/main.tsx',
  '/src/App.tsx',
  '/src/index.css',
  '/manifest.json',
  '/favicon.ico',
];

self.addEventListener('install', (event: any) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  (self as any).skipWaiting();
});

self.addEventListener('activate', (event: any) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== MAP_TILE_CACHE) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  (self as any).clients.claim();
});

self.addEventListener('fetch', (event: any) => {
  const url = new URL(event.request.url);

  // Special caching strategy for Map Tiles (CartoDB, OpenStreetMap)
  if (url.hostname.includes('basemaps.cartocdn.com') || url.hostname.includes('tile.openstreetmap.org')) {
    event.respondWith(
      caches.open(MAP_TILE_CACHE).then((cache) => {
        return cache.match(event.request).then((cachedResponse) => {
          if (cachedResponse) {
            // Return cached tile, but fetch new one in background to update cache (Stale-While-Revalidate)
            fetch(event.request).then((networkResponse) => {
              if (networkResponse.status === 200) {
                cache.put(event.request, networkResponse);
              }
            }).catch(() => {/* ignore background fetch errors offline */});
            return cachedResponse;
          }
          
          return fetch(event.request)
            .then((networkResponse) => {
              if (networkResponse.status === 200) {
                cache.put(event.request, networkResponse.clone());
              }
              return networkResponse;
            })
            .catch(() => {
              // Return a fallback tile or transparent PNG offline if tile not cached
              return new Response(
                '<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" style="background:#0f172a"></svg>',
                { headers: { 'Content-Type': 'image/svg+xml' } }
              );
            });
        });
      })
    );
    return;
  }

  // Fallback for standard app assets (Cache First, network fallback)
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      if (cachedResponse) {
        return cachedResponse;
      }
      return fetch(event.request).then((networkResponse) => {
        // Don't cache API routes or websockets
        if (
          !networkResponse ||
          networkResponse.status !== 200 ||
          networkResponse.type !== 'basic' ||
          url.pathname.startsWith('/api') ||
          url.pathname.startsWith('/socket.io')
        ) {
          return networkResponse;
        }

        const responseToCache = networkResponse.clone();
        caches.open(CACHE_NAME).then((cache) => {
          cache.put(event.request, responseToCache);
        });

        return networkResponse;
      }).catch(() => {
        // If offline and request is index.html / navigation, return cached shell
        if (event.request.mode === 'navigate') {
          return caches.match('/index.html') as Promise<Response>;
        }
        return new Response('Network error occurred.', { status: 408 });
      });
    })
  );
});
