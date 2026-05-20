// IndexedDB wrapper with type-safe operations
const DB_NAME = 'nirman-offline';
const DB_VERSION = 1;

interface IndexedDbConfig {
  storeName: string;
  keyPath: string;
}

export class IndexedDbStore {
  private db: IDBDatabase | null = null;
  private config: IndexedDbConfig;

  constructor(config: IndexedDbConfig) {
    this.config = config;
  }

  async init(): Promise<void> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(this.config.storeName)) {
          db.createObjectStore(this.config.storeName, { keyPath: this.config.keyPath });
        }
      };
    });
  }

  async add<T>(item: T): Promise<IDBValidKey> {
    if (!this.db) throw new Error('DB not initialized');
    return new Promise((resolve, reject) => {
      const store = this.db!.transaction(this.config.storeName, 'readwrite').objectStore(this.config.storeName);
      const req = store.add(item);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
    });
  }

  async put<T>(item: T): Promise<IDBValidKey> {
    if (!this.db) throw new Error('DB not initialized');
    return new Promise((resolve, reject) => {
      const store = this.db!.transaction(this.config.storeName, 'readwrite').objectStore(this.config.storeName);
      const req = store.put(item);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
    });
  }

  async get<T>(key: IDBValidKey): Promise<T | undefined> {
    if (!this.db) throw new Error('DB not initialized');
    return new Promise((resolve, reject) => {
      const store = this.db!.transaction(this.config.storeName, 'readonly').objectStore(this.config.storeName);
      const req = store.get(key);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
    });
  }

  async getAll<T>(limit?: number): Promise<T[]> {
    if (!this.db) throw new Error('DB not initialized');
    return new Promise((resolve, reject) => {
      const store = this.db!.transaction(this.config.storeName, 'readonly').objectStore(this.config.storeName);
      const req = limit ? store.getAll(undefined, limit) : store.getAll();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve(req.result);
    });
  }

  async delete(key: IDBValidKey): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    return new Promise((resolve, reject) => {
      const store = this.db!.transaction(this.config.storeName, 'readwrite').objectStore(this.config.storeName);
      const req = store.delete(key);
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }

  async clear(): Promise<void> {
    if (!this.db) throw new Error('DB not initialized');
    return new Promise((resolve, reject) => {
      const store = this.db!.transaction(this.config.storeName, 'readwrite').objectStore(this.config.storeName);
      const req = store.clear();
      req.onerror = () => reject(req.error);
      req.onsuccess = () => resolve();
    });
  }

  close(): void {
    if (this.db) {
      this.db.close();
      this.db = null;
    }
  }
}

// Shared stores
export const syncQueueStore = new IndexedDbStore({
  storeName: 'sync-queue',
  keyPath: 'id',
});

export const optionsStore = new IndexedDbStore({
  storeName: 'offline-cache',
  keyPath: 'key',
});
