const DB_NAME = "finding-astro-offline";
const DB_VERSION = 1;

type StoreName = "pending-actions" | "cached-cases" | "cached-animals" | "drafts";

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("pending-actions")) {
        const store = db.createObjectStore("pending-actions", { keyPath: "id", autoIncrement: true });
        store.createIndex("type", "type", { unique: false });
        store.createIndex("timestamp", "timestamp", { unique: false });
      }
      if (!db.objectStoreNames.contains("cached-cases")) {
        const store = db.createObjectStore("cached-cases", { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("updatedAt", "updatedAt", { unique: false });
      }
      if (!db.objectStoreNames.contains("cached-animals")) {
        const store = db.createObjectStore("cached-animals", { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
      }
      if (!db.objectStoreNames.contains("drafts")) {
        const store = db.createObjectStore("drafts", { keyPath: "id" });
        store.createIndex("type", "type", { unique: false });
      }
    };
  });
}

export async function savePendingAction(action: { type: string; payload: Record<string, unknown>; timestamp: number }): Promise<number> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending-actions", "readwrite");
    const store = tx.objectStore("pending-actions");
    const request = store.add({ ...action, timestamp: Date.now() });
    request.onsuccess = () => resolve(request.result as number);
    request.onerror = () => reject(request.error);
  });
}

export async function getPendingActions(): Promise<Array<{ id: number; type: string; payload: Record<string, unknown>; timestamp: number }>> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending-actions", "readonly");
    const store = tx.objectStore("pending-actions");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

export async function removePendingAction(id: number): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending-actions", "readwrite");
    const store = tx.objectStore("pending-actions");
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function clearPendingActions(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("pending-actions", "readwrite");
    const store = tx.objectStore("pending-actions");
    const request = store.clear();
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function cacheCases(cases: Record<string, unknown>[]): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cached-cases", "readwrite");
    const store = tx.objectStore("cached-cases");
    cases.forEach((c) => store.put({ ...c, cachedAt: Date.now() }));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function getCachedCases(): Promise<Record<string, unknown>[]> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("cached-cases", "readonly");
    const store = tx.objectStore("cached-cases");
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result ?? []);
    request.onerror = () => reject(request.error);
  });
}

export async function saveDraft(type: string, data: Record<string, unknown>): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("drafts", "readwrite");
    const store = tx.objectStore("drafts");
    const request = store.put({ id: type, ...data, updatedAt: Date.now() });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function getDraft(type: string): Promise<Record<string, unknown> | null> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction("drafts", "readonly");
    const store = tx.objectStore("drafts");
    const request = store.get(type);
    request.onsuccess = () => resolve(request.result ?? null);
    request.onerror = () => reject(request.error);
  });
}
