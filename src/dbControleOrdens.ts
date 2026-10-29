const DB_NAME = 'DGControleOrdensCache';
const STORE_NAME = 'controle_ordens';

let instance: IDBDatabase | null = null;
let pending: Promise<IDBDatabase> | null = null;

export function openControleOrdensDB(): Promise<IDBDatabase> {
  if (instance) return Promise.resolve(instance);
  if (pending) return pending;

  pending = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      instance = request.result;
      pending = null;
      instance.onversionchange = () => {
        instance?.close();
        instance = null;
      };
      resolve(instance);
    };
    request.onerror = () => {
      pending = null;
      reject(request.error);
    };
  });
  return pending;
}
