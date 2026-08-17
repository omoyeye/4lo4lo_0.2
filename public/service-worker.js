/*
 * Cache names are VERSIONED. Bumping them is what evicts a poisoned entry from
 * every user's browser, because activate deletes any cache not on the
 * whitelist. Bump these whenever a caching rule changes or a stale asset needs
 * to be forced out.
 *
 * v4: the previous version served EVERY non-API same-origin request cache
 * first, with no revalidation and no expiry. That included page HTML, so once
 * a page or an image was cached it was served forever and no deploy could ever
 * reach that browser again. It is why shipped UI changes appeared not to
 * arrive, and why a stale image could outlive the file it came from.
 */
const CACHE_NAME = '4lo4lo-v4';
const RUNTIME_CACHE = '4lo4lo-runtime-v4';

const urlsToCache = [
  '/',
  '/tasks',
  '/dashboard',
  '/referral',
  '/settings',
  '/rewards',
  '/promote-me',
  '/icon-192.png',
  '/favicon-32x32.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) =>
        // cache.addAll() rejects the whole batch if a single URL fails, which
        // aborts the install and leaves the app with no service worker at all.
        // This list previously contained /logo.png and /favicon.ico, neither of
        // which existed, so installation failed every time and offline support
        // never worked. Cache entries individually so one bad URL cannot take
        // the rest down with it.
        Promise.all(
          urlsToCache.map((url) =>
            cache.add(url).catch((err) => {
              console.warn('[sw] skipped precache for', url, err);
            })
          )
        )
      )
      .then(() => self.skipWaiting()) // Activate immediately
  );
});

// Clean up old caches. This is what actually purges v3's poisoned entries.
self.addEventListener('activate', (event) => {
  const cacheWhitelist = [CACHE_NAME, RUNTIME_CACHE];
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (!cacheWhitelist.includes(cacheName)) {
            console.log('[sw] deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim()) // Take control immediately
  );
});

/** Content-hashed build output. The filename changes when the bytes change. */
function isImmutable(url) {
  return url.pathname.startsWith('/_next/static/');
}

/** Network first, falling back to cache. For things that must be fresh. */
async function networkFirst(request, fallbackToRoot) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200 && response.type === 'basic') {
      const copy = response.clone();
      caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
    }
    return response;
  } catch (err) {
    const cached = await caches.match(request);
    if (cached) return cached;
    if (fallbackToRoot) {
      const root = await caches.match('/');
      if (root) return root;
    }
    throw err;
  }
}

/**
 * Serve from cache immediately, then refresh the entry in the background.
 *
 * The important half is the refresh: the previous worker had only the first
 * half, so an asset could never change once cached. Here a stale asset is
 * shown at most once, then replaced.
 */
async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const network = fetch(request)
    .then((response) => {
      if (response && response.status === 200 && response.type === 'basic') {
        const copy = response.clone();
        caches.open(RUNTIME_CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    })
    .catch(() => null);

  if (cached) return cached;

  const fresh = await network;
  if (fresh) return fresh;
  throw new Error('offline and not cached: ' + request.url);
}

self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Only GET is cacheable. POST/PATCH/DELETE must always hit the network,
  // and cache.put() throws on them anyway.
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== location.origin) return;

  // API: network first. Fresh data matters more than speed, and a stale
  // balance or task list is worse than a slow one.
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(
      networkFirst(request, false).catch(
        () =>
          new Response(
            JSON.stringify({
              error: 'offline',
              message: 'You are currently offline'
            }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
          )
      )
    );
    return;
  }

  /*
   * Page navigations: network first.
   *
   * This is the fix that matters. Serving HTML from cache first meant a
   * browser that had once loaded a page kept that exact HTML forever, so
   * deploys were invisible. Now the network wins whenever it is reachable and
   * the cache is only a fallback for being offline.
   */
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request, true));
    return;
  }

  // Build output is content hashed, so a cached copy can never be wrong.
  if (isImmutable(url)) {
    event.respondWith(
      caches.match(request).then((cached) => cached || staleWhileRevalidate(request))
    );
    return;
  }

  // Everything else, mainly images and other files in /public: fast from
  // cache, but refreshed in the background so a replaced file propagates.
  event.respondWith(staleWhileRevalidate(request));
});

// Handle messages from clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background Sync - Queue failed requests
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-tasks') {
    event.waitUntil(syncPendingTasks());
  }
});

async function syncPendingTasks() {
  try {
    const cache = await caches.open(RUNTIME_CACHE);
    const requests = await cache.keys();

    // Find all pending POST/PATCH/DELETE requests
    const pendingRequests = requests.filter(req =>
      req.method !== 'GET' && req.url.includes('/api/')
    );

    // Retry each pending request
    for (const request of pendingRequests) {
      try {
        const response = await fetch(request.clone());
        if (response.ok) {
          // Remove from cache if successful
          await cache.delete(request);
        }
      } catch (error) {
        console.error('Failed to sync request:', error);
      }
    }
  } catch (error) {
    console.error('Background sync failed:', error);
  }
}

// Push notifications
self.addEventListener('push', (event) => {
  const data = event.data ? event.data.json() : {};
  const title = data.title || '4lo4lo Notification';
  const options = {
    body: data.body || 'You have a new notification',
    // /logo.png does not exist and never did. A missing icon makes the
    // notification fall back to the browser's generic bell, unbranded.
    icon: '/icon-192.png',
    badge: '/favicon-32x32.png',
    vibrate: [200, 100, 200],
    data: data.data || {},
    actions: data.actions || [],
    tag: data.tag || 'default',
    requireInteraction: data.requireInteraction || false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Notification clicks
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const urlToOpen = event.notification.data.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // If a window is already open, focus it
        for (const client of clientList) {
          if (client.url === urlToOpen && 'focus' in client) {
            return client.focus();
          }
        }
        // Otherwise open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});

// Periodic background sync (if supported)
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'update-content') {
    event.waitUntil(updateContent());
  }
});

async function updateContent() {
  try {
    // Refresh critical data
    const endpoints = ['/api/user', '/api/tasks', '/api/dashboard'];

    for (const endpoint of endpoints) {
      await fetch(endpoint).catch(() => {
        console.log('Failed to update:', endpoint);
      });
    }
  } catch (error) {
    console.error('Periodic sync failed:', error);
  }
}
