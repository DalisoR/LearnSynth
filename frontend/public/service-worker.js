// LearnSynth Service Worker
// Provides offline functionality and caching

const CACHE_NAME = 'learnsynth-v1.0.0';
const OFFLINE_URL = '/offline.html';

// Assets to cache immediately on install
const PRECACHE_ASSETS = [
  '/',
  '/manifest.json',
  '/offline.html',
  // Add other critical assets here
];

// API endpoints to cache
const API_CACHE_PATTERNS = [
  /\/api\/lessons\//,
  /\/api\/subjects\//,
  /\/api\/documents\//,
];

// Assets to cache on first request (runtime caching)
const RUNTIME_CACHE_PATTERNS = [
  /\.(?:png|jpg|jpeg|svg|gif|webp)$/,
  /\.(?:css|js)$/,
  /\/fonts\//,
];

/**
 * Install event - Precache critical assets
 */
self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Install');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[ServiceWorker] Precaching offline page');
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => {
        // Skip waiting to activate immediately
        return self.skipWaiting();
      })
  );
});

/**
 * Activate event - Clean up old caches
 */
self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activate');

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Removing old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => {
      // Take control of all clients
      return self.clients.claim();
    })
  );
});

/**
 * Fetch event - Handle requests with caching strategy
 */
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip Chrome extension requests
  if (url.protocol === 'chrome-extension:') {
    return;
  }

  // Handle different types of requests
  if (isAPIRequest(request)) {
    // API requests - Network first with cache fallback
    event.respondWith(networkFirstStrategy(request));
  } else if (isNavigationRequest(request)) {
    // Navigation requests - Network first, fallback to cache, then offline page
    event.respondWith(navigationStrategy(request));
  } else if (isAssetRequest(request)) {
    // Static assets - Cache first
    event.respondWith(cacheFirstStrategy(request));
  } else {
    // Other requests - Network first
    event.respondWith(networkFirstStrategy(request));
  }
});

/**
 * Check if request is for API
 */
function isAPIRequest(request) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(request.url));
}

/**
 * Check if request is for navigation
 */
function isNavigationRequest(request) {
  return request.mode === 'navigate';
}

/**
 * Check if request is for static assets
 */
function isAssetRequest(request) {
  return RUNTIME_CACHE_PATTERNS.some(pattern => pattern.test(request.url));
}

/**
 * Network first strategy - Try network, fallback to cache
 */
async function networkFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[ServiceWorker] Network failed, trying cache', error);

    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Return offline response for API errors
    return new Response(
      JSON.stringify({
        error: 'Offline',
        message: 'You are offline. Please check your connection.',
        offline: true,
      }),
      {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Navigation strategy - Network first, fallback to cache, then offline page
 */
async function navigationStrategy(request) {
  const cache = await caches.open(CACHE_NAME);

  try {
    const response = await fetch(request);

    // Cache the page
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[ServiceWorker] Navigation network failed, trying cache', error);

    // Try to get from cache
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }

    // Fallback to offline page
    const offlineResponse = await cache.match(OFFLINE_URL);
    return offlineResponse || new Response('Offline', { status: 503 });
  }
}

/**
 * Cache first strategy - Try cache, fallback to network
 */
async function cacheFirstStrategy(request) {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);

  if (cachedResponse) {
    return cachedResponse;
  }

  try {
    const response = await fetch(request);

    // Cache successful responses
    if (response && response.status === 200) {
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    console.log('[ServiceWorker] Cache first failed', error);
    throw error;
  }
}

/**
 * Background sync for offline actions
 */
self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync', event.tag);

  if (event.tag === 'sync-offline-data') {
    event.waitUntil(syncOfflineData());
  }
});

/**
 * Sync offline data when back online
 */
async function syncOfflineData() {
  try {
    const cache = await caches.open(CACHE_NAME);
    const requests = await getStoredOfflineRequests();

    for (const requestData of requests) {
      try {
        await fetch(requestData.url, requestData.options);
        await removeOfflineRequest(requestData.id);
        console.log('[ServiceWorker] Synced offline request', requestData.id);
      } catch (error) {
        console.error('[ServiceWorker] Failed to sync request', error);
      }
    }
  } catch (error) {
    console.error('[ServiceWorker] Background sync error', error);
  }
}

/**
 * Store offline request for later sync
 */
async function storeOfflineRequest(url, options) {
  const id = `offline-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  const requestData = {
    id,
    url,
    options,
    timestamp: Date.now(),
  };

  const cache = await caches.open(CACHE_NAME);
  const storedData = await cache.match('offline-requests') || { requests: [] };

  storedData.requests.push(requestData);

  await cache.put('offline-requests', new Response(JSON.stringify(storedData)));

  // Register background sync
  if ('sync' in self.registration) {
    await self.registration.sync.register('sync-offline-data');
  }

  return id;
}

/**
 * Get stored offline requests
 */
async function getStoredOfflineRequests() {
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match('offline-requests');

  if (!response) return [];

  const data = await response.json();
  return data.requests || [];
}

/**
 * Remove offline request after successful sync
 */
async function removeOfflineRequest(id) {
  const cache = await caches.open(CACHE_NAME);
  const response = await cache.match('offline-requests');

  if (!response) return;

  const data = await response.json();
  data.requests = data.requests.filter(req => req.id !== id);

  await cache.put('offline-requests', new Response(JSON.stringify(data)));
}

/**
 * Push notification handler
 */
self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push received', event);

  const options = {
    body: event.data ? event.data.text() : 'New notification',
    icon: '/android-chrome-192x192.png',
    badge: '/badge-72x72.png',
    vibrate: [100, 50, 100],
    data: {
      dateOfArrival: Date.now(),
      primaryKey: 1,
    },
    actions: [
      {
        action: 'view',
        title: 'View',
        icon: '/icon-view.png',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
        icon: '/icon-dismiss.png',
      },
    ],
  };

  event.waitUntil(
    self.registration.showNotification('LearnSynth', options)
  );
});

/**
 * Notification click handler
 */
self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification click', event);

  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

/**
 * Message handler for communication with main thread
 */
self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }

  if (event.data && event.data.type === 'CACHE_LESSON') {
    const { lessonId, url } = event.data;
    cacheLesson(lessonId, url);
  }

  if (event.data && event.data.type === 'REMOVE_LESSON_CACHE') {
    const { lessonId } = event.data;
    removeLessonCache(lessonId);
  }
});

/**
 * Cache a lesson for offline access
 */
async function cacheLesson(lessonId, url) {
  try {
    const response = await fetch(url);

    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(`lesson-${lessonId}`, response.clone());
      console.log('[ServiceWorker] Cached lesson', lessonId);
    }
  } catch (error) {
    console.error('[ServiceWorker] Failed to cache lesson', error);
  }
}

/**
 * Remove lesson from cache
 */
async function removeLessonCache(lessonId) {
  try {
    const cache = await caches.open(CACHE_NAME);
    await cache.delete(`lesson-${lessonId}`);
    console.log('[ServiceWorker] Removed lesson from cache', lessonId);
  } catch (error) {
    console.error('[ServiceWorker] Failed to remove lesson cache', error);
  }
}

console.log('[ServiceWorker] Service worker loaded');
