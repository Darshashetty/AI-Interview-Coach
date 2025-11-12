// Minimal IndexedDB helper for storing/fetching Blobs (audio recordings)
export async function saveBlob(key: string, blob: Blob): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open('ai-interview-coach-db', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('audio')) db.createObjectStore('audio');
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('audio', 'readwrite');
        const store = tx.objectStore('audio');
        const put = store.put(blob, key);
        put.onsuccess = () => {
          resolve();
          db.close();
        };
        put.onerror = () => {
          reject(put.error);
          db.close();
        };
      };
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

export async function getBlob(key: string): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open('ai-interview-coach-db', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('audio')) db.createObjectStore('audio');
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('audio', 'readonly');
        const store = tx.objectStore('audio');
        const get = store.get(key);
        get.onsuccess = () => {
          resolve(get.result || null);
          db.close();
        };
        get.onerror = () => {
          reject(get.error);
          db.close();
        };
      };
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}

export async function deleteBlob(key: string): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      const req = indexedDB.open('ai-interview-coach-db', 1);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('audio')) db.createObjectStore('audio');
      };
      req.onsuccess = () => {
        const db = req.result;
        const tx = db.transaction('audio', 'readwrite');
        const store = tx.objectStore('audio');
        const del = store.delete(key);
        del.onsuccess = () => {
          resolve();
          db.close();
        };
        del.onerror = () => {
          reject(del.error);
          db.close();
        };
      };
      req.onerror = () => reject(req.error);
    } catch (e) {
      reject(e);
    }
  });
}
