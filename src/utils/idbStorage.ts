const DB_NAME = 'SkyGameDB';
const STORE_NAME = 'BossModels';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      reject(new Error('IndexedDB not available'));
      return;
    }
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Saves binary asset or string to IndexedDB with a safe localStorage fallback
 */
export async function saveBossModelToCache(key: string, data: ArrayBuffer | string): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.put(data, key);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (idbErr) {
    console.warn('IndexedDB save failed, attempting safe fallback:', idbErr);
    // Safe localStorage fallback with try/catch to avoid QuotaExceededError crashing the app
    try {
      if (typeof data === 'string') {
        localStorage.setItem(key, data);
      }
    } catch (lsErr) {
      console.warn('localStorage quota exceeded for model cache:', lsErr);
    }
  }
}

/**
 * Retrieves cached binary asset or string from IndexedDB or localStorage
 */
export async function getBossModelFromCache(key: string): Promise<ArrayBuffer | string | null> {
  // 1. Try IndexedDB
  try {
    const db = await openDB();
    const data = await new Promise<ArrayBuffer | string | null>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const req = store.get(key);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
    if (data) return data;
  } catch (idbErr) {
    console.warn('IndexedDB read failed:', idbErr);
  }

  // 2. Fallback to localStorage
  try {
    const lsData = localStorage.getItem(key);
    if (lsData) return lsData;
  } catch (lsErr) {
    console.warn('localStorage read failed:', lsErr);
  }

  return null;
}

/**
 * Removes cached asset from IndexedDB and localStorage
 */
export async function removeBossModelFromCache(key: string): Promise<void> {
  // 1. Clear IndexedDB
  try {
    const db = await openDB();
    await new Promise<void>((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const req = store.delete(key);
      req.onsuccess = () => resolve();
      req.onerror = () => resolve();
    });
  } catch {
    // Ignore
  }

  // 2. Clear localStorage
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}
