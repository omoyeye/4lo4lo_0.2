/**
 * Background Sync Queue
 * Queues failed API requests for retry when connection is restored
 */

// Type declarations for Background Sync API
declare global {
  interface ServiceWorkerRegistration {
    sync: SyncManager;
  }
  interface SyncManager {
    register(tag: string): Promise<void>;
    getTags(): Promise<string[]>;
  }
}

interface QueuedRequest {
  id: string;
  url: string;
  method: string;
  body?: any;
  headers?: Record<string, string>;
  timestamp: number;
}

const QUEUE_KEY = 'pwa_sync_queue';

/**
 * Add a request to the background sync queue
 */
export async function queueRequest(
  url: string,
  method: string,
  body?: any,
  headers?: Record<string, string>
): Promise<void> {
  const request: QueuedRequest = {
    id: `${Date.now()}-${Math.random().toString(36)}`,
    url,
    method,
    body,
    headers,
    timestamp: Date.now()
  };

  const queue = getQueue();
  queue.push(request);
  saveQueue(queue);

  console.log('Request queued for background sync:', request);

  // Register for background sync if supported
  if ('serviceWorker' in navigator && 'sync' in ServiceWorkerRegistration.prototype) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register('sync-tasks');
      console.log('Background sync registered');
    } catch (error) {
      console.error('Failed to register background sync:', error);
      // Fallback: try to sync immediately
      await processSyncQueue();
    }
  } else {
    // Fallback for browsers without background sync
    await processSyncQueue();
  }
}

/**
 * Get the current sync queue
 */
function getQueue(): QueuedRequest[] {
  try {
    const queueData = (typeof window !== 'undefined' ? localStorage.getItem(QUEUE_KEY) : null);
    return queueData ? JSON.parse(queueData) : [];
  } catch {
    return [];
  }
}

/**
 * Save the sync queue
 */
function saveQueue(queue: QueuedRequest[]): void {
  try {
    (typeof window !== 'undefined' ? localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)) : undefined);
  } catch (error) {
    console.error('Failed to save sync queue:', error);
  }
}

/**
 * Process all queued requests
 */
export async function processSyncQueue(): Promise<void> {
  if (!navigator.onLine) {
    console.log('Offline, skipping sync queue processing');
    return;
  }

  const queue = getQueue();
  if (queue.length === 0) {
    return;
  }

  console.log(`Processing ${queue.length} queued requests`);

  const successfulIds: string[] = [];

  for (const request of queue) {
    try {
      const response = await fetch(request.url, {
        method: request.method,
        headers: {
          'Content-Type': 'application/json',
          ...request.headers
        },
        body: request.body ? JSON.stringify(request.body) : undefined,
        credentials: 'include'
      });

      if (response.ok) {
        console.log('Successfully synced request:', request.id);
        successfulIds.push(request.id);
      } else {
        console.error('Failed to sync request:', request.id, response.status);
      }
    } catch (error) {
      console.error('Error syncing request:', request.id, error);
    }
  }

  // Remove successful requests from queue
  if (successfulIds.length > 0) {
    const newQueue = queue.filter(req => !successfulIds.includes(req.id));
    saveQueue(newQueue);
    console.log(`Removed ${successfulIds.length} successful requests from queue`);
  }
}

/**
 * Clear the sync queue
 */
export function clearSyncQueue(): void {
  (typeof window !== 'undefined' ? localStorage.removeItem(QUEUE_KEY) : undefined);
}

/**
 * Get queue status
 */
export function getQueueStatus(): { count: number; oldestTimestamp: number | null } {
  const queue = getQueue();
  return {
    count: queue.length,
    oldestTimestamp: queue.length > 0 ? Math.min(...queue.map(r => r.timestamp)) : null
  };
}

/**
 * Initialize background sync listener
 */
export function initBackgroundSync(): void {
  // Process queue when coming back online
  window.addEventListener('online', () => {
    console.log('Connection restored, processing sync queue');
    processSyncQueue();
  });

  // Process queue on page load if online
  if (navigator.onLine) {
    processSyncQueue();
  }
}
