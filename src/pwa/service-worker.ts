/**
 * PWA Service Worker for A-Cube E-Receipt SDK
 * Advanced caching strategies and offline-first functionality
 *
 * Features:
 * - Network-first, cache-first, and cache-then-network strategies
 * - API response caching with smart invalidation
 * - Offline queue integration
 * - Background sync capabilities
 * - Performance monitoring
 */

/// <reference lib="webworker" />

// Service worker context with proper typing
const sw = self as any as ServiceWorkerGlobalScope & {
  registration: ServiceWorkerRegistration;
  clients: Clients;
  skipWaiting(): Promise<void>;
};

// Custom event types for better type safety
interface SyncEvent extends ExtendableEvent {
  readonly tag: string;
}

interface PeriodicSyncEvent extends ExtendableEvent {
  readonly tag: string;
}

// Service Worker configuration
const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE_NAME = `acube-static-${CACHE_VERSION}`;
const API_CACHE_NAME = `acube-api-${CACHE_VERSION}`;
const RUNTIME_CACHE_NAME = `acube-runtime-${CACHE_VERSION}`;

// Cache configuration
const CACHE_CONFIG = {
  // Static assets cache configuration
  static: {
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    maxEntries: 100,
    resources: [
      // Add your static assets here
      '/manifest.json',
      '/favicon.ico',
    ],
  },

  // API cache configuration
  api: {
    maxAge: 5 * 60 * 1000, // 5 minutes
    maxEntries: 200,
    staleWhileRevalidate: true,
    endpoints: [
      '/api/mf1/',
      '/api/mf2/',
      '/api/auth/',
    ],
  },

  // Runtime cache configuration
  runtime: {
    maxAge: 60 * 60 * 1000, // 1 hour
    maxEntries: 50,
  },
};

// Offline queue configuration
const OFFLINE_QUEUE_CONFIG = {
  queueName: 'acube-offline-queue',
  maxRetentionTime: 7 * 24 * 60 * 60 * 1000, // 7 days
  maxQueueSize: 1000,
};

/**
 * Cache strategy implementations
 */
class CacheStrategy {
  /**
   * Network-first strategy with cache fallback
   */
  static async networkFirst(request: Request, cacheName: string, maxAge: number): Promise<Response> {
    try {
      // Try network first
      const networkResponse = await fetch(request);

      if (networkResponse.ok) {
        // Cache successful response
        const cache = await caches.open(cacheName);
        const responseClone = networkResponse.clone();

        // Add timestamp for cache invalidation
        const headers = new Headers(responseClone.headers);
        headers.set('sw-cached-at', Date.now().toString());

        const cachedResponse = new Response(responseClone.body, {
          status: responseClone.status,
          statusText: responseClone.statusText,
          headers,
        });

        await cache.put(request, cachedResponse);
      }

      return networkResponse;
    } catch (error) {
      // Network failed, try cache
      console.warn('Network request failed, falling back to cache:', error);
      return this.cacheFirst(request, cacheName, maxAge);
    }
  }

  /**
   * Cache-first strategy with network fallback
   */
  static async cacheFirst(request: Request, cacheName: string, maxAge: number): Promise<Response> {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    if (cachedResponse && this.isCacheValid(cachedResponse, maxAge)) {
      return cachedResponse;
    }

    // Cache miss or expired, try network
    try {
      const networkResponse = await fetch(request);

      if (networkResponse.ok) {
        // Update cache
        const responseClone = networkResponse.clone();
        const headers = new Headers(responseClone.headers);
        headers.set('sw-cached-at', Date.now().toString());

        const cachedResponse = new Response(responseClone.body, {
          status: responseClone.status,
          statusText: responseClone.statusText,
          headers,
        });

        await cache.put(request, cachedResponse);
      }

      return networkResponse;
    } catch (error) {
      // Network failed, return stale cache if available
      if (cachedResponse) {
        console.warn('Network failed, returning stale cache');
        return cachedResponse;
      }

      throw error;
    }
  }

  /**
   * Stale-while-revalidate strategy
   */
  static async staleWhileRevalidate(request: Request, cacheName: string, maxAge: number): Promise<Response> {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);

    // Always try to update cache in background
    const networkUpdate = this.updateCacheInBackground(request, cache);

    if (cachedResponse && this.isCacheValid(cachedResponse, maxAge)) {
      // Return cached response immediately
      networkUpdate.catch(() => {}); // Ignore network errors
      return cachedResponse;
    }

    // Wait for network response if cache is stale or missing
    try {
      const networkResponse = await networkUpdate;
      return networkResponse;
    } catch (error) {
      // Network failed, return stale cache if available
      if (cachedResponse) {
        console.warn('Network failed, returning stale cache');
        return cachedResponse;
      }

      throw error;
    }
  }

  /**
   * Check if cached response is still valid
   */
  private static isCacheValid(response: Response, maxAge: number): boolean {
    const cachedAt = response.headers.get('sw-cached-at');
    if (!cachedAt) {return false;}

    const age = Date.now() - parseInt(cachedAt, 10);
    return age < maxAge;
  }

  /**
   * Update cache in background
   */
  private static async updateCacheInBackground(request: Request, cache: Cache): Promise<Response> {
    const networkResponse = await fetch(request);

    if (networkResponse.ok) {
      const responseClone = networkResponse.clone();
      const headers = new Headers(responseClone.headers);
      headers.set('sw-cached-at', Date.now().toString());

      const cachedResponse = new Response(responseClone.body, {
        status: responseClone.status,
        statusText: responseClone.statusText,
        headers,
      });

      await cache.put(request, cachedResponse);
    }

    return networkResponse;
  }
}

/**
 * Offline queue manager for service worker
 */
class OfflineQueueManager {
  private queueName: string;
  private maxRetentionTime: number;
  private maxQueueSize: number;

  constructor(config: typeof OFFLINE_QUEUE_CONFIG) {
    this.queueName = config.queueName;
    this.maxRetentionTime = config.maxRetentionTime;
    this.maxQueueSize = config.maxQueueSize;
  }

  /**
   * Add request to offline queue
   */
  async addToQueue(request: Request): Promise<void> {
    try {
      const queue = await this.getQueue();
      const requestData = {
        url: request.url,
        method: request.method,
        headers: Object.fromEntries(request.headers.entries()),
        body: request.method !== 'GET' ? await request.text() : null,
        timestamp: Date.now(),
        id: crypto.randomUUID(),
      };

      queue.push(requestData);

      // Maintain queue size limit
      if (queue.length > this.maxQueueSize) {
        queue.splice(0, queue.length - this.maxQueueSize);
      }

      await this.saveQueue(queue);

      console.log('Added request to offline queue:', requestData.url);
    } catch (error) {
      console.error('Failed to add request to offline queue:', error);
    }
  }

  /**
   * Process offline queue
   */
  async processQueue(): Promise<void> {
    try {
      const queue = await this.getQueue();
      const processedItems: string[] = [];

      for (const item of queue) {
        try {
          // Skip expired items
          if (Date.now() - item.timestamp > this.maxRetentionTime) {
            processedItems.push(item.id);
            continue;
          }

          // Recreate request
          const request = new Request(item.url, {
            method: item.method,
            headers: item.headers,
            body: item.body,
          });

          // Attempt to send
          const response = await fetch(request);

          if (response.ok) {
            processedItems.push(item.id);
            console.log('Successfully processed queued request:', item.url);

            // Note: Success will be handled by the main thread through other means
            console.log('Offline sync success:', item.url, item.id);
          }
        } catch (error) {
          console.warn('Failed to process queued request:', item.url, error);
        }
      }

      // Remove processed items
      if (processedItems.length > 0) {
        const updatedQueue = queue.filter(item => !processedItems.includes(item.id));
        await this.saveQueue(updatedQueue);
      }
    } catch (error) {
      console.error('Failed to process offline queue:', error);
    }
  }

  /**
   * Get offline queue from storage
   */
  private async getQueue(): Promise<any[]> {
    try {
      const cache = await caches.open(RUNTIME_CACHE_NAME);
      const response = await cache.match(`/sw-queue/${this.queueName}`);

      if (response) {
        return await response.json();
      }
    } catch (error) {
      console.warn('Failed to retrieve offline queue:', error);
    }

    return [];
  }

  /**
   * Save offline queue to storage
   */
  private async saveQueue(queue: any[]): Promise<void> {
    try {
      const cache = await caches.open(RUNTIME_CACHE_NAME);
      const response = new Response(JSON.stringify(queue), {
        headers: { 'Content-Type': 'application/json' },
      });

      await cache.put(`/sw-queue/${this.queueName}`, response);
    } catch (error) {
      console.error('Failed to save offline queue:', error);
    }
  }
}

// Initialize offline queue manager
const offlineQueue = new OfflineQueueManager(OFFLINE_QUEUE_CONFIG);

/**
 * Service Worker event handlers
 */

// Install event
sw.addEventListener('install', (event: ExtendableEvent) => {
  console.log('Service Worker installing');

  event.waitUntil(
    (async () => {
      // Pre-cache static resources
      const staticCache = await caches.open(STATIC_CACHE_NAME);
      await staticCache.addAll(CACHE_CONFIG.static.resources);

      // Skip waiting to activate immediately
      sw.skipWaiting();
    })(),
  );
});

// Activate event
sw.addEventListener('activate', (event: ExtendableEvent) => {
  console.log('Service Worker activating');

  event.waitUntil(
    (async () => {
      // Clean up old caches
      const cacheNames = await caches.keys();
      const oldCaches = cacheNames.filter(name =>
        name.startsWith('acube-') &&
        !name.includes(CACHE_VERSION),
      );

      await Promise.all(
        oldCaches.map(name => caches.delete(name)),
      );

      // Take control of all pages
      sw.clients.claim();
    })(),
  );
});

// Fetch event
sw.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event;
  const url = new URL(request.url);

  // Only handle GET requests and specific origins
  if (request.method !== 'GET' && !request.url.includes('/api/')) {
    return;
  }

  event.respondWith(
    (async () => {
      try {
        // Handle API requests
        if (CACHE_CONFIG.api.endpoints.some(endpoint => url.pathname.startsWith(endpoint))) {
          if (CACHE_CONFIG.api.staleWhileRevalidate) {
            return await CacheStrategy.staleWhileRevalidate(
              request,
              API_CACHE_NAME,
              CACHE_CONFIG.api.maxAge,
            );
          } else {
            return await CacheStrategy.networkFirst(
              request,
              API_CACHE_NAME,
              CACHE_CONFIG.api.maxAge,
            );
          }
        }

        // Handle static resources
        if (CACHE_CONFIG.static.resources.includes(url.pathname)) {
          return await CacheStrategy.cacheFirst(
            request,
            STATIC_CACHE_NAME,
            CACHE_CONFIG.static.maxAge,
          );
        }

        // Handle other requests with runtime cache
        return await CacheStrategy.networkFirst(
          request,
          RUNTIME_CACHE_NAME,
          CACHE_CONFIG.runtime.maxAge,
        );
      } catch (error) {
        console.error('Fetch handler error:', error);

        // For POST/PUT/DELETE requests that fail, add to offline queue
        if (request.method !== 'GET') {
          await offlineQueue.addToQueue(request.clone());
        }

        // Return network error or fallback response
        throw error;
      }
    })(),
  );
});

// Background sync event
sw.addEventListener('sync', (event: any) => {
  console.log('Background sync triggered:', event.tag);

  if (event.tag === 'offline-queue-sync') {
    event.waitUntil(offlineQueue.processQueue());
  }
});

// Push notification event
sw.addEventListener('push', (event: PushEvent) => {
  console.log('Push notification received');

  const options = {
    body: 'A-Cube E-Receipt notification',
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    tag: 'acube-notification',
    requireInteraction: false,
    actions: [
      {
        action: 'view',
        title: 'View',
      },
      {
        action: 'dismiss',
        title: 'Dismiss',
      },
    ],
  };

  if (event.data) {
    try {
      const data = event.data.json();
      options.body = data.message || options.body;

      // Customize notification based on data
      if (data.type === 'receipt') {
        options.body = `New receipt: ${data.amount || 'Unknown amount'}`;
      } else if (data.type === 'sync') {
        options.body = `Sync completed: ${data.count || 0} items processed`;
      }
    } catch (error) {
      console.warn('Failed to parse push data:', error);
    }
  }

  event.waitUntil(
    sw.registration.showNotification('A-Cube E-Receipt', options),
  );
});

// Notification click event
sw.addEventListener('notificationclick', (event: NotificationEvent) => {
  console.log('Notification clicked:', event.action);

  event.notification.close();

  if (event.action === 'view') {
    event.waitUntil(
      sw.clients.openWindow('/'),
    );
  }
});

// Message event for communication with main thread
sw.addEventListener('message', (event: ExtendableMessageEvent) => {
  console.log('Service Worker received message:', event.data);

  if (event.data?.type) {
    switch (event.data.type) {
      case 'SKIP_WAITING':
        event.waitUntil(sw.skipWaiting());
        break;

      case 'GET_CACHE_SIZE':
        event.waitUntil(
          (async () => {
            const cacheNames = await caches.keys();
            const sizes = await Promise.all(
              cacheNames.map(async (name) => {
                const cache = await caches.open(name);
                const keys = await cache.keys();
                return { name, size: keys.length };
              }),
            );

            event.ports[0]?.postMessage({ type: 'CACHE_SIZE', data: sizes });
          })(),
        );
        break;

      case 'CLEAR_CACHE':
        event.waitUntil(
          (async () => {
            const cacheNames = await caches.keys();
            await Promise.all(cacheNames.map(name => caches.delete(name)));
            event.ports[0]?.postMessage({ type: 'CACHE_CLEARED' });
          })(),
        );
        break;

      case 'PROCESS_OFFLINE_QUEUE':
        event.waitUntil(offlineQueue.processQueue());
        break;
    }
  }
});

// Periodic background sync (if supported)
if ('periodicSync' in sw.registration) {
  sw.addEventListener('periodicsync', (event: any) => {
    if (event.tag === 'offline-queue-periodic') {
      event.waitUntil(offlineQueue.processQueue());
    }
  });
}

console.log('A-Cube Service Worker loaded successfully');
