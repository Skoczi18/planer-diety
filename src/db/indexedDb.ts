import { DB_NAME, DB_VERSION, STORE } from "./schema";

type GlobalDbState = {
  db: IDBDatabase | null;
  openPromise: Promise<IDBDatabase> | null;
  openAttemptSeq: number;
};

declare global {
  interface Window {
    __planerDietyDbState__?: GlobalDbState;
  }
}

const globalState: GlobalDbState =
  window.__planerDietyDbState__ ??
  (window.__planerDietyDbState__ = {
    db: null,
    openPromise: null,
    openAttemptSeq: 0
  });

const REQUIRED_STORES = Object.values(STORE);

function resetOpenPromise() {
  globalState.openPromise = null;
}

function hasRequiredStores(db: IDBDatabase): boolean {
  return REQUIRED_STORES.every((storeName) => db.objectStoreNames.contains(storeName));
}

function attachDbLifecycle(db: IDBDatabase) {
  db.onversionchange = () => {
    console.warn("[DB] versionchange received, closing stale connection");
    try {
      db.close();
    } catch {
      // no-op
    }
    if (globalState.db === db) {
      globalState.db = null;
      resetOpenPromise();
    }
  };

  db.onclose = () => {
    console.info("[DB] connection closed");
    if (globalState.db === db) {
      globalState.db = null;
      resetOpenPromise();
    }
  };
}

function openDbInternal(): Promise<IDBDatabase> {
  return new Promise<IDBDatabase>((resolve, reject) => {
    const attemptId = ++globalState.openAttemptSeq;
    const WARN_TIMEOUT_MS = 8000;
    const HARD_TIMEOUT_MS = 30000;
    let blockedSeen = false;
    console.info(`[DB][open#${attemptId}] start`, { name: DB_NAME, version: DB_VERSION });
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    let settled = false;
    const done = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(warnTimeout);
      window.clearTimeout(hardTimeout);
      console.info(`[DB][open#${attemptId}] timeout clear`);
      fn();
    };
    console.info(`[DB][open#${attemptId}] warn timeout start`, { ms: WARN_TIMEOUT_MS });
    const warnTimeout = window.setTimeout(() => {
      if (settled) return;
      console.warn(`[DB][open#${attemptId}] open takes longer than usual`);
    }, WARN_TIMEOUT_MS);
    const hardTimeout = window.setTimeout(() => {
      if (settled) return;
      const message = blockedSeen
        ? "Otwarcie lokalnej bazy danych zostało zablokowane przez stare połączenie (timeout)."
        : "Nie udało się otworzyć lokalnej bazy danych (timeout).";
      done(() => reject(new Error(message)));
    }, HARD_TIMEOUT_MS);

    request.onerror = () => {
      console.error(`[DB][open#${attemptId}] error`, request.error);
      done(() => reject(request.error));
    };

    request.onblocked = () => {
      blockedSeen = true;
      console.error(`[DB][open#${attemptId}] blocked`);
      if (globalState.db) {
        console.warn(`[DB][open#${attemptId}] closing stale in-app connection`);
        try {
          globalState.db.close();
        } catch {
          // no-op
        }
      }
      // Nie przerywamy natychmiast. Czekamy, czy po zamknięciu starego połączenia
      // request dokończy się sukcesem.
    };

    request.onsuccess = () => {
      const db = request.result;
      console.info(`[DB][open#${attemptId}] success`);
      attachDbLifecycle(db);
      globalState.db = db;
      done(() => resolve(db));
    };

    request.onupgradeneeded = (event: IDBVersionChangeEvent) => {
      const db = request.result;
      const tx = request.transaction;
      const oldVersion = event.oldVersion;
      console.info(`[DB][open#${attemptId}] upgrade start`, { oldVersion, newVersion: DB_VERSION });

      if (tx) {
        tx.oncomplete = () => console.info(`[DB][open#${attemptId}] upgrade tx complete`);
        tx.onabort = () => console.error(`[DB][open#${attemptId}] upgrade tx abort`, tx.error);
        tx.onerror = () => console.error(`[DB][open#${attemptId}] upgrade tx error`, tx.error);
      }

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
      if (!db.objectStoreNames.contains(STORE.INVENTORY_CATALOG)) {
        const store = db.createObjectStore(STORE.INVENTORY_CATALOG, { keyPath: "id" });
        store.createIndex("by_product", "productKey", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE.INVENTORY_ITEMS)) {
        const store = db.createObjectStore(STORE.INVENTORY_ITEMS, { keyPath: "id" });
        store.createIndex("by_product", "productKey", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE.INVENTORY_OPERATIONS)) {
        const store = db.createObjectStore(STORE.INVENTORY_OPERATIONS, { keyPath: "id" });
        store.createIndex("by_date", "data", { unique: false });
        store.createIndex("by_meal", "posilekId", { unique: false });
      }
      if (!db.objectStoreNames.contains(STORE.SETTINGS)) {
        db.createObjectStore(STORE.SETTINGS, { keyPath: "key" });
      }
      if (!db.objectStoreNames.contains(STORE.NOTES)) {
        const store = db.createObjectStore(STORE.NOTES, { keyPath: "id" });
        store.createIndex("by_date", "data", { unique: false });
      }

      if (oldVersion < 3) {
        console.info(`[DB][open#${attemptId}] legacy migration skipped in upgrade tx`);
      }

      console.info(`[DB][open#${attemptId}] upgrade done`);
    };
  }).catch((error) => {
    resetOpenPromise();
    throw error;
  });
}

function openDb(): Promise<IDBDatabase> {
  if (globalState.db) {
    if (!hasRequiredStores(globalState.db) || globalState.db.version !== DB_VERSION) {
      console.warn("[DB] stale connection detected, forcing reopen", {
        currentVersion: globalState.db.version,
        expectedVersion: DB_VERSION
      });
      try {
        globalState.db.close();
      } catch {
        // no-op
      }
      globalState.db = null;
      resetOpenPromise();
    }
  }

  if (globalState.db) {
    console.info("[DB] reuse existing connection");
    return Promise.resolve(globalState.db);
  }

  if (globalState.openPromise) {
    console.info("[DB] await existing open promise");
    return globalState.openPromise;
  }

  globalState.openPromise = openDbInternal();

  return globalState.openPromise.catch((error) => {
    resetOpenPromise();
    throw error;
  });
}

export async function runTransaction<T>(
  storeName: string,
  mode: IDBTransactionMode,
  action: (store: IDBObjectStore) => Promise<T>
): Promise<T> {
  let db = await openDb();

  const run = (database: IDBDatabase) =>
    new Promise<T>((resolve, reject) => {
      const tx = database.transaction(storeName, mode);
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

  try {
    return await run(db);
  } catch (err) {
    if (err instanceof DOMException && err.name === "NotFoundError") {
      console.warn("[DB] store not found in current connection, retry after reopen", { storeName });
      try {
        db.close();
      } catch {
        // no-op
      }
      globalState.db = null;
      resetOpenPromise();
      db = await openDb();
      return run(db);
    }
    throw err;
  }
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
