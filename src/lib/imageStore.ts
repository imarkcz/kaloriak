// IndexedDB-backed store for meal photos.
//
// Why not localStorage? iOS Safari caps localStorage at ~5–10 MB per origin.
// A single base64 photo is ~200–500 kB. After 10–20 photos the entire
// localStorage write throws QuotaExceededError, the silent catch in
// AppState.saveLocal swallows it, and new meals stop persisting.
//
// IndexedDB has 1 GB+ quota on iOS, no synchronous-string limit, and
// survives PWA reinstalls the same way localStorage does.

const DB_NAME = 'kaloriak';
const DB_VERSION = 1;
const STORE = 'meal-images';

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

export async function saveMealImage(mealId: string, dataUrl: string): Promise<void> {
  if (!dataUrl) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite');
    tx.objectStore(STORE).put(dataUrl, mealId);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function loadAllMealImages(): Promise<Map<string, string>> {
  try {
    const db = await openDb();
    return await new Promise<Map<string, string>>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const store = tx.objectStore(STORE);
      const result = new Map<string, string>();
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          result.set(cursor.key as string, cursor.value as string);
          cursor.continue();
        } else {
          resolve(result);
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch {
    return new Map();
  }
}

export async function deleteMealImage(mealId: string): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(mealId);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch { /* ignore */ }
}

// Drop any image whose meal no longer exists in state. Called periodically
// to keep IDB from growing forever after meal deletions.
export async function pruneMealImages(keepIds: Set<string>): Promise<void> {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      const store = tx.objectStore(STORE);
      const req = store.openCursor();
      req.onsuccess = () => {
        const cursor = req.result;
        if (cursor) {
          if (!keepIds.has(cursor.key as string)) cursor.delete();
          cursor.continue();
        } else {
          resolve();
        }
      };
      req.onerror = () => reject(req.error);
    });
  } catch { /* ignore */ }
}
