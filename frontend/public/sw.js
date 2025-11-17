const CACHE_NAME = 'learnsynth-v1';
const STATIC_CACHE = 'learnsynth-static-v1';
const DYNAMIC_CACHE = 'learnsynth-dynamic-v1';
const API_CACHE = 'learnsynth-api-v1';

// Assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/signin',
  '/signup',
  '/pricing',
  '/offline.html',
];

// API endpoints to cache
const API_ENDPOINTS = [
  '/api/documents',
  '/api/knowledge-base',
  '/api/analytics',
];

self.addEventListener('install', (event) => {
  console.log('Service Worker: Installing...');
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => {
      console.log('Service Worker: Caching static assets');
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  console.log('Service Worker: Activating...');
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cache) => {
          if (![STATIC_CACHE, DYNAMIC_CACHE, API_CACHE].includes(cache)) {
            console.log('Service Worker: Deleting old cache', cache);
            return caches.delete(cache);
          }
        })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Handle API requests
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(handleApiRequest(request));
    return;
  }

  // Handle navigation requests
  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  // Handle static assets
  event.respondWith(handleStaticRequest(request));
});

async function handleApiRequest(request) {
  const url = new URL(request.url);
  const cacheKey = `${API_CACHE}-${url.pathname}`;

  try {
    // Try network first for API requests
    const networkResponse = await fetch(request);

    // Cache successful responses
    if (networkResponse.ok) {
      const cache = await caches.open(cacheKey);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Network failed, trying cache', error);

    // Fall back to cache
    const cachedResponse = await caches.match(request);

    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response for API
    return new Response(
      JSON.stringify({ error: 'Offline', data: null }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

async function handleNavigationRequest(request) {
  try {
    // Try network first
    const networkResponse = await fetch(request);
    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Navigation failed, serving offline page');
    const cachedResponse = await caches.match('/offline.html');
    return cachedResponse || new Response('Offline', { status: 503 });
  }
}

async function handleStaticRequest(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);

    // Cache successful responses for static assets
    if (networkResponse.ok && isCacheable(request)) {
      const cache = await caches.open(DYNAMIC_CACHE);
      cache.put(request, networkResponse.clone());
    }

    return networkResponse;
  } catch (error) {
    console.log('Service Worker: Static request failed', error);
    return new Response('', { status: 504 });
  }
}

function isCacheable(request) {
  const url = new URL(request.url);

  // Cache static assets
  return (
    url.pathname.match(/\.(js|css|png|jpg|jpeg|svg|woff|woff2)$/) ||
    url.pathname.startsWith('/assets/')
  );
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-documents') {
    event.waitUntil(syncDocuments());
  }
});

async function syncDocuments() {
  console.log('Service Worker: Syncing documents...');
  // Implement document sync logic
}

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data?.json() || {};
  const options = {
    body: data.body || 'New notification',
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    data: data,
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'LearnSynth', options)
  );
});
