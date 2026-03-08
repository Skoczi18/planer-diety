import { DB_NAME, DB_VERSION, STORE } from "./schema";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    const timeout = window.setTimeout(() => {
      reject(new Error("Przekroczono czas oczekiwania na otwarcie lokalnej bazy danych."));
    }, 8000);

    request.onerror = () => {
      window.clearTimeout(timeout);
      reject(request.error);
    };

    request.onblocked = () => {
      window.clearTimeout(timeout);
      reject(new Error("Otwarcie bazy zostało zablokowane. Zamknij inne karty aplikacji i odśwież."));
    };

    request.onsuccess = () => {
      window.clearTimeout(timeout);
      resolve(request.result);
    };

    request.onupgradeneeded = () => {
      const db = request.result;
      const tx = request.transaction;
      const oldVersion = request.oldVersion;

      if (!db.objectStoreNames.contains(STORE.META)) {
        db.createObjectStore(STORE.META, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE.DIET_DAYS)) {
        db.createObjectStore(STORE.DIET_DAYS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE.DAY_STATUSES)) {
        const store = db.createObjectStore(STORE.DAY_STATUSES, { keyPath: "id" });
        store.createIndex("by_date", "data", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE.MEAL_STATUSES)) {
        const store = db.createObjectStore(STORE.MEAL_STATUSES, { keyPath: "id" });
        store.createIndex("by_date", "data", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE.DAY_LOGS)) {
        const store = db.createObjectStore(STORE.DAY_LOGS, { keyPath: "id" });
        store.createIndex("by_diet_day", "dzienDietyId", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE.MEAL_LOGS)) {
        const store = db.createObjectStore(STORE.MEAL_LOGS, { keyPath: "id" });
        store.createIndex("by_date", "data", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE.SHOPPING_STATES)) {
        const store = db.createObjectStore(STORE.SHOPPING_STATES, { keyPath: "id" });
        store.createIndex("by_scope", "scope", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE.SHOPPING_MANUAL_ITEMS)) {
        const store = db.createObjectStore(STORE.SHOPPING_MANUAL_ITEMS, { keyPath: "id" });
        store.createIndex("by_list", "listKey", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE.PANTRY_ITEMS)) {
        db.createObjectStore(STORE.PANTRY_ITEMS, { keyPath: "id" });
      }
      if (!db.objectStoreNames.contains(STORE.SETTINGS)) {
        db.createObjectStore(STORE.SETTINGS, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE.NOTES)) {
        const store = db.createObjectStore(STORE.NOTES, { keyPath: "id" });
        store.createIndex("by_date", "data", { unique: false });
      }

      if (oldVersion < 2 && tx && db.objectStoreNames.contains(STORE.DAY_STATUSES) && db.objectStoreNames.contains(STORE.DAY_LOGS)) {
        const oldStore = tx.objectStore(STORE.DAY_STATUSES);
        const newStore = tx.objectStore(STORE.DAY_LOGS);
        const oldRequest = oldStore.getAll();

        oldRequest.onsuccess = () => {
          const rows = (oldRequest.result as Array<{ data: string; dzienDietyId: string; status: string }>) ?? [];
          rows.forEach((row) => {
            newStore.put({
              id: row.data,
              data: row.data,
              dzienDietyId: row.dzienDietyId,
              numerDniaDiety: 0,
              statusManualny: row.status === "odstepstwo" ? "odstepstwo" : undefined,
              logiOdstepstw: [],
              updatedAt: new Date().toISOString()
            });
          });
        };
      }

      if (oldVersion < 2 && tx && db.objectStoreNames.contains(STORE.MEAL_STATUSES) && db.objectStoreNames.contains(STORE.MEAL_LOGS)) {
        const oldStore = tx.objectStore(STORE.MEAL_STATUSES);
        const newStore = tx.objectStore(STORE.MEAL_LOGS);
        const oldRequest = oldStore.getAll();

        oldRequest.onsuccess = () => {
          const rows = (oldRequest.result as Array<{ data: string; posilekId: string; zrealizowany: boolean }>) ?? [];
          rows.forEach((row) => {
            newStore.put({
              id: `${row.data}::${row.posilekId}`,
              data: row.data,
              dzienDietyId: "",
              posilekId: row.posilekId,
              przygotowany: row.zrealizowany,
              zjedzony: row.zrealizowany,
              updatedAt: new Date().toISOString()
            });
          });
        };
      }

      if (oldVersion < 3 && tx && db.objectStoreNames.contains(STORE.SHOPPING_STATES)) {
        const store = tx.objectStore(STORE.SHOPPING_STATES);
        const getAll = store.getAll();
        getAll.onsuccess = () => {
          const rows =
            (getAll.result as Array<{ id: string; scope?: string; listKey?: string; itemKey?: string; productKey?: string; kupione: boolean; mamWDomu: boolean }>) ?? [];
          rows.forEach((row) => {
            const listKey = row.listKey ?? row.scope ?? "week:all";
            const productKey = row.productKey ?? row.itemKey ?? "unknown";
            store.put({
              id: `${listKey}::${productKey}`,
              listKey,
              productKey,
              kupione: !!row.kupione,
              mamWDomu: !!row.mamWDomu
            });
          });
        };
      }
    };
  });

  return dbPromise.catch((error) => {
    dbPromise = null;
    throw error;
  });
}

export async function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => Promise<T>
): Promise<T> {
  const db = await openDb();

  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const store = tx.objectStore(storeName);
    let result: T;

    tx.oncomplete = () => resolve(result);
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);

    action(store)
      .then((value) => {
        result = value;
      })
      .catch((err) => {
        reject(err);
        try {
          tx.abort();
        } catch {
          // no-op
        }
      });
  });
}

export function reqToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function dbGet<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
  return runTransaction(storeName, "readonly", async (store) => reqToPromise(store.get(key)));
}

export async function dbGetAll<T>(storeName: string): Promise<T[]> {
  return runTransaction(storeName, "readonly", async (store) => reqToPromise(store.getAll()));
}

export async function dbPut<T>(storeName: string, value: T): Promise<void> {
  await runTransaction(storeName, "readwrite", async (store) => {
    await reqToPromise(store.put(value));
  });
}

export async function dbBulkPut<T>(storeName: string, values: T[]): Promise<void> {
  await runTransaction(storeName, "readwrite", async (store) => {
    await Promise.all(values.map((value) => reqToPromise(store.put(value))));
  });
}

export async function dbDelete(storeName: string, key: IDBValidKey): Promise<void> {
  await runTransaction(storeName, "readwrite", async (store) => {
    await reqToPromise(store.delete(key));
  });
}

export async function dbClear(storeName: string): Promise<void> {
  await runTransaction(storeName, "readwrite", async (store) => {
    await reqToPromise(store.clear());
  });
}
