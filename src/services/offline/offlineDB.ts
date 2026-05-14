const DB_NAME = 'nirman-offline-db';
const DB_VERSION = 1;

export type OfflinePayload = {
  id: string;
  action: string;
  table: string;
  payload: Record<string, unknown>;
  createdAt: string;
  retryCount: number;
  lastError?: string;
};

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('image_queue')) {
        db.createObjectStore('image_queue', { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains('conflicts')) {
        db.createObjectStore('conflicts', { keyPath: 'id' });
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function getObjectStore(storeName: string, mode: IDBTransactionMode): Promise<IDBObjectStore> {
  const db = await openDatabase();
  const tx = db.transaction(storeName, mode);
  return tx.objectStore(storeName);
}

export async function addToSyncQueue(payload: OfflinePayload): Promise<void> {
  const store = await getObjectStore('sync_queue', 'readwrite');
  store.put(payload);
}

export async function getPendingSyncItems(): Promise<OfflinePayload[]> {
  const store = await getObjectStore('sync_queue', 'readonly');
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as OfflinePayload[]);
    request.onerror = () => reject(request.error);
  });
}

export async function deleteSyncItem(id: string): Promise<void> {
  const store = await getObjectStore('sync_queue', 'readwrite');
  store.delete(id);
}

export async function addImageToQueue(image: Blob, metadata: Record<string, unknown>): Promise<void> {
  const store = await getObjectStore('image_queue', 'readwrite');
  store.put({ id: `${Date.now()}-${Math.random().toString(16).slice(2)}`, image, metadata, createdAt: new Date().toISOString() });
}

export async function getPendingImages(): Promise<Array<{ id: string; image: Blob; metadata: Record<string, unknown>; createdAt: string }>> {
  const store = await getObjectStore('image_queue', 'readonly');
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as Array<{ id: string; image: Blob; metadata: Record<string, unknown>; createdAt: string }>);
    request.onerror = () => reject(request.error);
  });
}

export async function deletePendingImage(id: string): Promise<void> {
  const store = await getObjectStore('image_queue', 'readwrite');
  store.delete(id);
}

export async function writeConflict(id: string, conflict: Record<string, unknown>): Promise<void> {
  const store = await getObjectStore('conflicts', 'readwrite');
  store.put({ id, conflict, createdAt: new Date().toISOString() });
}

export async function getConflicts(): Promise<Array<{ id: string; conflict: Record<string, unknown>; createdAt: string }>> {
  const store = await getObjectStore('conflicts', 'readonly');
  return new Promise((resolve, reject) => {
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result as Array<{ id: string; conflict: Record<string, unknown>; createdAt: string }>);
    request.onerror = () => reject(request.error);
  });
}
