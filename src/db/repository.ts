import { SEED_DIETA } from "../data/seedDiet";
import { BASE_INVENTORY_CATALOG } from "../data/baseInventoryProducts";
import { toISODate } from "../lib/date";
import { buildItemKey, normalizeProductName, normalizeShoppingGroup, normalizeUnit, resolveShoppingGroup, splitIngredientNameToProducts } from "../lib/shoppingNormalize";
import {
  DzienDiety,
  DzienRealizacjiRecord,
  ExportAplikacji,
  InventoryCatalogItemRecord,
  InventoryItemRecord,
  LokalizacjaMagazynu,
  LogOdstepstwa,
  MetaRecord,
  NotatkaRecord,
  OperacjaMagazynuRecord,
  Posilek,
  RealizacjaPosilkuRecord,
  ShoppingGroup,
  Skladnik,
  ShoppingManualItemRecord,
  SpizarniaItemRecord,
  StanZakupuRecord,
  TypOdstepstwa,
  UstawieniaAplikacji
} from "../types";
import { dbBulkPut, dbClear, dbDelete, dbGet, dbGetAll, dbPut } from "./indexedDb";
import { SETTINGS_KEY, STORE } from "./schema";

function shoppingStateId(listKey: string, productKey: string): string {
  return `${listKey}::${productKey}`;
}

function mealLogId(data: string, posilekId: string): string {
  return `${data}::${posilekId}`;
}

const DEFAULT_SETTINGS: UstawieniaAplikacji = {
  key: "appSettings",
  startDate: toISODate(),
  jezyk: "pl",
  trybDnia: "automatyczny",
  recznyNumerDnia: 1
};

const DEFAULT_PANTRY: Array<{ productKey: string; label: string }> = [
  { productKey: "sol", label: "Sól" },
  { productKey: "pieprz", label: "Pieprz" },
  { productKey: "czosnek", label: "Czosnek" },
  { productKey: "papryka slodka", label: "Papryka słodka" },
  { productKey: "oliwa z oliwek", label: "Oliwa z oliwek" }
];

type LegacyMealStatus = {
  id: string;
  data: string;
  posilekId: string;
  zrealizowany: boolean;
  updatedAt?: string;
};

export type OstrzezenieMagazynu = {
  typ: "brak_produktu" | "brak_ilosci" | "nieobslugiwana_jednostka";
  skladnikNazwa: string;
  jednostka: string;
  wymaganaIlosc: number;
  dostepnaIlosc: number;
};

export type WynikPrzygotowaniaPosilku = {
  status: "zapisano" | "wymaga_potwierdzenia";
  ostrzezenia: OstrzezenieMagazynu[];
  inventoryDeducted: boolean;
  inventoryDeductionInfo?: string;
};

type LegacyDayStatus = {
  id: string;
  data: string;
  dzienDietyId: string;
  status: string;
};

type LegacyShoppingState = {
  id: string;
  scope?: string;
  listKey?: string;
  itemKey?: string;
  productKey?: string;
  kupione: boolean;
  mamWDomu: boolean;
};

function isMissingStoreError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "NotFoundError";
}

function normalizeSettings(settings: UstawieniaAplikacji | undefined): UstawieniaAplikacji {
  return {
    ...DEFAULT_SETTINGS,
    ...(settings ?? {})
  };
}

function normalizeMealLog(log: Partial<RealizacjaPosilkuRecord> & { data: string; posilekId: string }): RealizacjaPosilkuRecord {
  return {
    id: log.id ?? mealLogId(log.data, log.posilekId),
    data: log.data,
    dzienDietyId: log.dzienDietyId ?? "",
    posilekId: log.posilekId,
    przygotowany: !!log.przygotowany,
    zjedzony: !!log.zjedzony,
    notatka: log.notatka ?? "",
    inventoryDeducted: !!log.inventoryDeducted,
    inventoryDeductedAt: log.inventoryDeductedAt,
    inventoryDeductionKey: log.inventoryDeductionKey,
    inventoryDeductionInfo: log.inventoryDeductionInfo ?? "",
    inventoryOperationIds: log.inventoryOperationIds ?? [],
    updatedAt: log.updatedAt ?? new Date().toISOString()
  };
}

function buildMealDeductionKey(day: DzienDiety, meal: Posilek): string {
  return meal.partia?.id ? `${day.id}::${meal.partia.id}` : `${day.id}::${meal.id}`;
}

function isSupportedInventoryUnit(unit: string): boolean {
  const normalized = normalizeUnit(unit);
  return normalized === "g" || normalized === "ml" || normalized === "szt.";
}

function resolveIngredientsForDeduction(meal: Posilek): Skladnik[] {
  const multiplier = meal.partia && meal.partia.indeksPorcji === 1 ? meal.partia.liczbaPorcji : 1;
  const result: Skladnik[] = [];
  meal.skladniki
    .filter((item) => {
      const normalizedName = normalizeProductName(item.nazwa);
      return normalizedName.productKey !== "przyprawy" && normalizeUnit(item.jednostka) !== "porcja";
    })
    .forEach((item) => {
      const expanded = splitIngredientNameToProducts(item.nazwa);
      const baseAmount = item.ilosc * multiplier;
      const perItemAmount = expanded.length > 1 ? baseAmount / expanded.length : baseAmount;
      expanded.forEach((entry) => {
        const normalizedEntry = normalizeProductName(entry);
        result.push({
          nazwa: normalizedEntry.canonicalName,
          ilosc: perItemAmount,
          jednostka: item.jednostka,
          notatka: item.notatka
        });
      });
    });

  return result;
}

function normalizeDayLog(log: Partial<DzienRealizacjiRecord> & { data: string; dzienDietyId: string; numerDniaDiety: number }): DzienRealizacjiRecord {
  return {
    id: log.id ?? log.data,
    data: log.data,
    dzienDietyId: log.dzienDietyId,
    numerDniaDiety: log.numerDniaDiety,
    statusManualny: log.statusManualny,
    wagaKg: typeof log.wagaKg === "number" ? log.wagaKg : undefined,
    notatka: log.notatka ?? "",
    logiOdstepstw: log.logiOdstepstw ?? [],
    updatedAt: log.updatedAt ?? new Date().toISOString()
  };
}

function normalizeShoppingState(row: LegacyShoppingState): StanZakupuRecord {
  const listKey = row.listKey ?? row.scope ?? "week:all";
  const productKey = row.productKey ?? row.itemKey ?? "unknown";
  return {
    id: shoppingStateId(listKey, productKey),
    listKey,
    productKey,
    kupione: !!row.kupione,
    mamWDomu: !!row.mamWDomu
  };
}

function manualItemId(listKey: string, itemKey: string): string {
  return `${listKey}::${itemKey}`;
}

function inventoryId(productKey: string, unit: string): string {
  return buildItemKey(productKey, unit);
}

function normalizeInventoryItem(item: Partial<InventoryItemRecord> & { nazwa: string; ilosc: number; jednostka: string }): InventoryItemRecord {
  const normalized = normalizeProductName(item.nazwa);
  const unit = normalizeUnit(item.jednostka);
  const productKey = item.productKey ?? normalized.productKey;
  const id = item.id ?? inventoryId(productKey, unit);

  return {
    id,
    productKey,
    nazwa: item.nazwa?.trim() ? item.nazwa : normalized.canonicalName,
    ilosc: Number.isFinite(item.ilosc) ? Math.max(0, item.ilosc) : 0,
    jednostka: unit,
    grupa: normalizeShoppingGroup(item.grupa, item.nazwa ?? normalized.canonicalName),
    lokalizacja: (item.lokalizacja as LokalizacjaMagazynu) ?? "spizarnia",
    bazowyZPlanu: !!item.bazowyZPlanu,
    source: item.source === "diet_base" ? "diet_base" : "manual",
    notatka: item.notatka ?? "",
    dataWaznosci: item.dataWaznosci,
    updatedAt: item.updatedAt ?? new Date().toISOString()
  };
}

function normalizeInventoryCatalogItem(item: InventoryCatalogItemRecord): InventoryCatalogItemRecord {
  const normalized = normalizeProductName(item.nazwa);
  const unit = normalizeUnit(item.jednostka);
  return {
    id: item.id ?? buildItemKey(normalized.productKey, unit),
    productKey: item.productKey ?? normalized.productKey,
    nazwa: item.nazwa || normalized.canonicalName,
    jednostka: unit,
    grupa: normalizeShoppingGroup(item.grupa, item.nazwa || normalized.canonicalName),
    bazowyZPlanu: !!item.bazowyZPlanu,
    source: item.source === "diet_base" ? "diet_base" : "manual",
    aktywny: item.aktywny !== false,
    updatedAt: item.updatedAt ?? new Date().toISOString()
  };
}

async function seedBaseInventoryCatalog(): Promise<void> {
  let existingCatalog: InventoryCatalogItemRecord[] = [];
  try {
    existingCatalog = await dbGetAll<InventoryCatalogItemRecord>(STORE.INVENTORY_CATALOG);
  } catch (error) {
    if (isMissingStoreError(error)) {
      console.warn("[DB] inventoryCatalog store not available during seed - skipping catalog writes in this run");
    } else {
      throw error;
    }
  }
  const existingCatalogMap = new Map(existingCatalog.map((row) => [row.id, row]));
  const existingInventory = await dbGetAll<InventoryItemRecord>(STORE.INVENTORY_ITEMS);
  const existingInventoryMap = new Map(existingInventory.map((row) => [row.id, row]));

  const catalogToPut: InventoryCatalogItemRecord[] = [];
  const inventoryToPut: InventoryItemRecord[] = [];

  BASE_INVENTORY_CATALOG.forEach((base) => {
    if (!existingCatalogMap.has(base.id)) {
      catalogToPut.push(normalizeInventoryCatalogItem(base));
    }
    const currentInventory = existingInventoryMap.get(base.id);
    if (!currentInventory) {
      inventoryToPut.push(
        normalizeInventoryItem({
          id: base.id,
          productKey: base.productKey,
          nazwa: base.nazwa,
          ilosc: 0,
          jednostka: base.jednostka,
          grupa: base.grupa,
          lokalizacja: "spizarnia",
          bazowyZPlanu: true,
          source: "diet_base",
          updatedAt: new Date().toISOString()
        })
      );
      return;
    }

    if (!currentInventory.bazowyZPlanu || currentInventory.source !== "diet_base") {
      inventoryToPut.push(
        normalizeInventoryItem({
          ...currentInventory,
          bazowyZPlanu: true,
          source: "diet_base",
          nazwa: currentInventory.nazwa || base.nazwa,
          updatedAt: new Date().toISOString()
        })
      );
    }
  });

  if (catalogToPut.length) {
    try {
      await dbBulkPut(STORE.INVENTORY_CATALOG, catalogToPut);
    } catch (error) {
      if (!isMissingStoreError(error)) throw error;
      console.warn("[DB] inventoryCatalog store missing during bulk put - skipped");
    }
  }
  if (inventoryToPut.length) await dbBulkPut(STORE.INVENTORY_ITEMS, inventoryToPut);
}

async function migrateInventoryCategoryValues(): Promise<void> {
  const [inventoryRows, catalogRows, manualRows] = await Promise.all([
    dbGetAll<InventoryItemRecord>(STORE.INVENTORY_ITEMS),
    dbGetAll<InventoryCatalogItemRecord>(STORE.INVENTORY_CATALOG).catch((error) => {
      if (isMissingStoreError(error)) return [];
      throw error;
    }),
    dbGetAll<ShoppingManualItemRecord>(STORE.SHOPPING_MANUAL_ITEMS)
  ]);

  const inventoryUpdates = inventoryRows
    .map((row) => normalizeInventoryItem(row))
    .filter((row, idx) => row.grupa !== inventoryRows[idx].grupa);

  const catalogUpdates = catalogRows
    .map((row) => normalizeInventoryCatalogItem(row))
    .filter((row, idx) => row.grupa !== catalogRows[idx].grupa);

  const manualUpdates = manualRows
    .map((row) => ({
      ...row,
      grupa: normalizeShoppingGroup(row.grupa, row.nazwa)
    }))
    .filter((row, idx) => row.grupa !== manualRows[idx].grupa);

  if (inventoryUpdates.length) await dbBulkPut(STORE.INVENTORY_ITEMS, inventoryUpdates);
  if (catalogUpdates.length) {
    try {
      await dbBulkPut(STORE.INVENTORY_CATALOG, catalogUpdates);
    } catch (error) {
      if (!isMissingStoreError(error)) throw error;
    }
  }
  if (manualUpdates.length) await dbBulkPut(STORE.SHOPPING_MANUAL_ITEMS, manualUpdates);
}

export async function initDatabaseWithSeed(): Promise<void> {
  const seeded = await dbGet<MetaRecord>(STORE.META, "seeded");

  if (!seeded?.value) {
    await dbBulkPut<DzienDiety>(STORE.DIET_DAYS, SEED_DIETA);
    await dbPut<UstawieniaAplikacji>(STORE.SETTINGS, DEFAULT_SETTINGS);
    await dbPut<MetaRecord>(STORE.META, { key: "seeded", value: "1" });
  }

  const settings = await dbGet<UstawieniaAplikacji>(STORE.SETTINGS, SETTINGS_KEY);
  if (!settings || !settings.trybDnia) {
    await dbPut<UstawieniaAplikacji>(STORE.SETTINGS, normalizeSettings(settings));
  }

  const pantrySeeded = await dbGet<MetaRecord>(STORE.META, "pantrySeeded");
  if (!pantrySeeded?.value) {
    const rows: SpizarniaItemRecord[] = DEFAULT_PANTRY.map((item) => ({
      id: item.productKey,
      productKey: item.productKey,
      label: item.label,
      aktywny: true,
      updatedAt: new Date().toISOString()
    }));
    await dbBulkPut(STORE.PANTRY_ITEMS, rows);
    await dbPut(STORE.META, { key: "pantrySeeded", value: "1" });
  }

  const inventoryCatalogSeeded = await dbGet<MetaRecord>(STORE.META, "inventoryCatalogSeeded");
  if (!inventoryCatalogSeeded?.value) {
    await seedBaseInventoryCatalog();
    await dbPut(STORE.META, { key: "inventoryCatalogSeeded", value: "1" });
  } else {
    // utrzymanie kompatybilności po zmianach katalogu bazowego
    await seedBaseInventoryCatalog();
  }

  await migrateInventoryCategoryValues();
}

export async function getDietDays(): Promise<DzienDiety[]> {
  const days = await dbGetAll<DzienDiety>(STORE.DIET_DAYS);
  return [...days].sort((a, b) => a.numerDnia - b.numerDnia);
}

export async function getDietDayById(dayId: string): Promise<DzienDiety | undefined> {
  return dbGet<DzienDiety>(STORE.DIET_DAYS, dayId);
}

export async function getSettings(): Promise<UstawieniaAplikacji> {
  const raw = await dbGet<UstawieniaAplikacji>(STORE.SETTINGS, SETTINGS_KEY);
  return normalizeSettings(raw);
}

export async function saveSettings(next: UstawieniaAplikacji): Promise<void> {
  await dbPut<UstawieniaAplikacji>(STORE.SETTINGS, normalizeSettings(next));
}

export async function getDayLog(data: string): Promise<DzienRealizacjiRecord | undefined> {
  const log = await dbGet<DzienRealizacjiRecord>(STORE.DAY_LOGS, data);
  if (!log) return undefined;
  return normalizeDayLog(log);
}

export async function getAllDayLogs(): Promise<DzienRealizacjiRecord[]> {
  const logs = await dbGetAll<DzienRealizacjiRecord>(STORE.DAY_LOGS);
  return logs.map((log) => normalizeDayLog(log)).sort((a, b) => a.data.localeCompare(b.data));
}

export async function upsertDayLog(data: string, dzienDietyId: string, numerDniaDiety: number): Promise<DzienRealizacjiRecord> {
  const existing = await getDayLog(data);
  const next = normalizeDayLog({ ...existing, data, dzienDietyId, numerDniaDiety, updatedAt: new Date().toISOString() });
  await dbPut(STORE.DAY_LOGS, next);
  return next;
}

export async function setDayDeviationFlag(data: string, dzienDietyId: string, numerDniaDiety: number, enabled: boolean): Promise<void> {
  const existing = await upsertDayLog(data, dzienDietyId, numerDniaDiety);
  const next = normalizeDayLog({
    ...existing,
    statusManualny: enabled ? "odstepstwo" : undefined,
    updatedAt: new Date().toISOString()
  });
  await dbPut(STORE.DAY_LOGS, next);
}

export async function saveDayNote(data: string, dzienDietyId: string, numerDniaDiety: number, notatka: string): Promise<void> {
  const existing = await upsertDayLog(data, dzienDietyId, numerDniaDiety);
  const next = normalizeDayLog({
    ...existing,
    notatka,
    updatedAt: new Date().toISOString()
  });
  await dbPut(STORE.DAY_LOGS, next);
}

export async function saveDayWeight(data: string, dzienDietyId: string, numerDniaDiety: number, wagaKg?: number): Promise<void> {
  const existing = await upsertDayLog(data, dzienDietyId, numerDniaDiety);
  const parsed = typeof wagaKg === "number" && Number.isFinite(wagaKg) ? wagaKg : undefined;
  const next = normalizeDayLog({
    ...existing,
    wagaKg: parsed,
    updatedAt: new Date().toISOString()
  });
  await dbPut(STORE.DAY_LOGS, next);
}

export async function addDeviationLog(
  data: string,
  dzienDietyId: string,
  numerDniaDiety: number,
  typ: TypOdstepstwa,
  tekst: string
): Promise<void> {
  const existing = await upsertDayLog(data, dzienDietyId, numerDniaDiety);
  const clean = tekst.trim();
  if (!clean) return;

  const log: LogOdstepstwa = {
    id: crypto.randomUUID(),
    typ,
    tekst: clean,
    createdAt: new Date().toISOString()
  };

  const next = normalizeDayLog({
    ...existing,
    statusManualny: existing.statusManualny ?? "odstepstwo",
    logiOdstepstw: [log, ...(existing.logiOdstepstw ?? [])],
    updatedAt: new Date().toISOString()
  });
  await dbPut(STORE.DAY_LOGS, next);
}

export async function removeDeviationLog(data: string, logId: string): Promise<void> {
  const existing = await getDayLog(data);
  if (!existing) return;

  const next = normalizeDayLog({
    ...existing,
    logiOdstepstw: (existing.logiOdstepstw ?? []).filter((log) => log.id !== logId),
    updatedAt: new Date().toISOString()
  });
  await dbPut(STORE.DAY_LOGS, next);
}

export async function getMealLogsByDate(data: string): Promise<RealizacjaPosilkuRecord[]> {
  const logs = await dbGetAll<RealizacjaPosilkuRecord>(STORE.MEAL_LOGS);
  return logs.filter((it) => it.data === data).map((it) => normalizeMealLog(it));
}

export async function getAllMealLogs(): Promise<RealizacjaPosilkuRecord[]> {
  const logs = await dbGetAll<RealizacjaPosilkuRecord>(STORE.MEAL_LOGS);
  return logs.map((it) => normalizeMealLog(it));
}

export async function setMealStatus(
  data: string,
  dzienDietyId: string,
  numerDniaDiety: number,
  posilekId: string,
  patch: Partial<Pick<RealizacjaPosilkuRecord, "przygotowany" | "zjedzony" | "notatka">>
): Promise<void> {
  await upsertDayLog(data, dzienDietyId, numerDniaDiety);
  const id = mealLogId(data, posilekId);
  const rawCurrent = await dbGet<RealizacjaPosilkuRecord>(STORE.MEAL_LOGS, id);
  const current = rawCurrent ? normalizeMealLog(rawCurrent) : undefined;

  const nextPrepared = patch.przygotowany ?? current?.przygotowany ?? false;
  const nextEaten = patch.zjedzony ?? current?.zjedzony ?? false;

  if (nextEaten && !nextPrepared) {
    throw new Error("Nie można oznaczyć posiłku jako zjedzony przed przygotowaniem.");
  }

  await dbPut<RealizacjaPosilkuRecord>(STORE.MEAL_LOGS, {
    id,
    data,
    dzienDietyId,
    posilekId,
    przygotowany: nextPrepared,
    zjedzony: nextEaten,
    notatka: patch.notatka ?? current?.notatka ?? "",
    inventoryDeducted: current?.inventoryDeducted ?? false,
    inventoryDeductedAt: current?.inventoryDeductedAt,
    inventoryDeductionKey: current?.inventoryDeductionKey,
    inventoryDeductionInfo: current?.inventoryDeductionInfo ?? "",
    inventoryOperationIds: current?.inventoryOperationIds ?? [],
    updatedAt: new Date().toISOString()
  });
}

export async function setMealPreparedWithInventory(
  data: string,
  day: DzienDiety,
  meal: Posilek,
  prepared: boolean,
  options?: { forceOnWarnings?: boolean }
): Promise<WynikPrzygotowaniaPosilku> {
  await upsertDayLog(data, day.id, day.numerDnia);
  const id = mealLogId(data, meal.id);
  const currentRaw = await dbGet<RealizacjaPosilkuRecord>(STORE.MEAL_LOGS, id);
  const current = currentRaw ? normalizeMealLog(currentRaw) : undefined;

  if (!prepared) {
    await dbPut<RealizacjaPosilkuRecord>(STORE.MEAL_LOGS, {
      id,
      data,
      dzienDietyId: day.id,
      posilekId: meal.id,
      przygotowany: false,
      // Nie utrzymujemy stanu "zjedzony" bez "przygotowany".
      zjedzony: false,
      notatka: current?.notatka ?? "",
      inventoryDeducted: current?.inventoryDeducted ?? false,
      inventoryDeductedAt: current?.inventoryDeductedAt,
      inventoryDeductionKey: current?.inventoryDeductionKey ?? buildMealDeductionKey(day, meal),
      inventoryDeductionInfo:
        current?.inventoryDeducted
          ? "Składniki zostały już wcześniej odjęte z magazynu i nie są przywracane automatycznie."
          : current?.inventoryDeductionInfo ?? "",
      inventoryOperationIds: current?.inventoryOperationIds ?? [],
      updatedAt: new Date().toISOString()
    });
    return {
      status: "zapisano",
      ostrzezenia: [],
      inventoryDeducted: current?.inventoryDeducted ?? false,
      inventoryDeductionInfo:
        current?.inventoryDeducted
          ? "Składniki zostały już wcześniej odjęte z magazynu i nie są przywracane automatycznie."
          : undefined
    };
  }

  const deductionKey = buildMealDeductionKey(day, meal);
  const allLogsForDate = (await getMealLogsByDate(data))
    .filter((it) => it.dzienDietyId === day.id || !it.dzienDietyId)
    .map((it) => normalizeMealLog(it));

  const sharedDeductedLog = allLogsForDate.find(
    (it) => it.inventoryDeductionKey === deductionKey && it.inventoryDeducted && it.posilekId !== meal.id
  );

  if (meal.partia?.indeksPorcji === 2) {
    await dbPut<RealizacjaPosilkuRecord>(STORE.MEAL_LOGS, {
      id,
      data,
      dzienDietyId: day.id,
      posilekId: meal.id,
      przygotowany: true,
      zjedzony: current?.zjedzony ?? false,
      notatka: current?.notatka ?? "",
      inventoryDeducted: false,
      inventoryDeductedAt: sharedDeductedLog?.inventoryDeductedAt,
      inventoryDeductionKey: deductionKey,
      inventoryDeductionInfo: sharedDeductedLog
        ? "Składniki zostały rozliczone przy wcześniejszym przygotowaniu pierwszej porcji."
        : "To druga porcja z wcześniej przygotowanego dania. Magazyn nie jest odejmowany ponownie.",
      inventoryOperationIds: sharedDeductedLog?.inventoryOperationIds ?? [],
      updatedAt: new Date().toISOString()
    });
    return {
      status: "zapisano",
      ostrzezenia: [],
      inventoryDeducted: false,
      inventoryDeductionInfo: sharedDeductedLog
        ? "Składniki zostały rozliczone przy wcześniejszym przygotowaniu pierwszej porcji."
        : "To druga porcja z wcześniej przygotowanego dania. Magazyn nie jest odejmowany ponownie."
    };
  }

  if (current?.inventoryDeducted) {
    await dbPut<RealizacjaPosilkuRecord>(STORE.MEAL_LOGS, {
      ...current,
      przygotowany: true,
      updatedAt: new Date().toISOString()
    });
    return {
      status: "zapisano",
      ostrzezenia: [],
      inventoryDeducted: true,
      inventoryDeductionInfo: "Składniki dla tego posiłku zostały już wcześniej odjęte z magazynu."
    };
  }

  if (sharedDeductedLog) {
    await dbPut<RealizacjaPosilkuRecord>(STORE.MEAL_LOGS, {
      id,
      data,
      dzienDietyId: day.id,
      posilekId: meal.id,
      przygotowany: true,
      zjedzony: current?.zjedzony ?? false,
      notatka: current?.notatka ?? "",
      inventoryDeducted: false,
      inventoryDeductedAt: sharedDeductedLog.inventoryDeductedAt,
      inventoryDeductionKey: deductionKey,
      inventoryDeductionInfo: "Składniki zostały już rozliczone przy wcześniejszym wspólnym przygotowaniu.",
      inventoryOperationIds: sharedDeductedLog.inventoryOperationIds ?? [],
      updatedAt: new Date().toISOString()
    });
    return {
      status: "zapisano",
      ostrzezenia: [],
      inventoryDeducted: false,
      inventoryDeductionInfo: "Składniki zostały już rozliczone przy wcześniejszym wspólnym przygotowaniu."
    };
  }

  const ingredients = resolveIngredientsForDeduction(meal);
  const inventoryRows = await getInventoryItems();
  const inventoryMap = new Map<string, InventoryItemRecord>();
  inventoryRows.forEach((row) => inventoryMap.set(buildItemKey(row.productKey, row.jednostka), row));

  const warnings: OstrzezenieMagazynu[] = [];
  const deductions: Array<{ ingredient: Skladnik; productKey: string; unit: string; deductedAmount: number }> = [];

  ingredients.forEach((ingredient) => {
    const unit = normalizeUnit(ingredient.jednostka);
    if (!isSupportedInventoryUnit(unit)) {
      warnings.push({
        typ: "nieobslugiwana_jednostka",
        skladnikNazwa: ingredient.nazwa,
        jednostka: ingredient.jednostka,
        wymaganaIlosc: ingredient.ilosc,
        dostepnaIlosc: 0
      });
      return;
    }

    const product = normalizeProductName(ingredient.nazwa);
    const itemKey = buildItemKey(product.productKey, unit);
    const currentItem = inventoryMap.get(itemKey);
    const available = currentItem?.ilosc ?? 0;
    const deductedAmount = Math.max(0, Math.min(ingredient.ilosc, available));

    if (!currentItem) {
      warnings.push({
        typ: "brak_produktu",
        skladnikNazwa: ingredient.nazwa,
        jednostka: unit,
        wymaganaIlosc: ingredient.ilosc,
        dostepnaIlosc: 0
      });
    } else if (available < ingredient.ilosc) {
      warnings.push({
        typ: "brak_ilosci",
        skladnikNazwa: ingredient.nazwa,
        jednostka: unit,
        wymaganaIlosc: ingredient.ilosc,
        dostepnaIlosc: available
      });
    }

    deductions.push({
      ingredient,
      productKey: product.productKey,
      unit,
      deductedAmount
    });
  });

  if (warnings.length > 0 && !options?.forceOnWarnings) {
    return {
      status: "wymaga_potwierdzenia",
      ostrzezenia: warnings,
      inventoryDeducted: false
    };
  }

  const operationIds: string[] = [];
  for (const deduction of deductions) {
    if (deduction.deductedAmount <= 0) continue;
    await addInventoryAmount(deduction.productKey, deduction.unit, -deduction.deductedAmount, deduction.ingredient.nazwa);
    const operationId = crypto.randomUUID();
    operationIds.push(operationId);
    await dbPut<OperacjaMagazynuRecord>(STORE.INVENTORY_OPERATIONS, {
      id: operationId,
      data,
      dzienDietyId: day.id,
      posilekId: meal.id,
      inventoryDeductionKey: deductionKey,
      skladnikNazwa: deduction.ingredient.nazwa,
      productKey: deduction.productKey,
      wymaganaIlosc: deduction.ingredient.ilosc,
      odjetaIlosc: deduction.deductedAmount,
      jednostka: deduction.unit,
      createdAt: new Date().toISOString(),
      notatka: deduction.deductedAmount < deduction.ingredient.ilosc ? "Odjęto częściowo z powodu braków." : ""
    });
  }

  await dbPut<RealizacjaPosilkuRecord>(STORE.MEAL_LOGS, {
    id,
    data,
    dzienDietyId: day.id,
    posilekId: meal.id,
    przygotowany: true,
    zjedzony: current?.zjedzony ?? false,
    notatka: current?.notatka ?? "",
    inventoryDeducted: true,
    inventoryDeductedAt: new Date().toISOString(),
    inventoryDeductionKey: deductionKey,
    inventoryDeductionInfo:
      warnings.length > 0
        ? "Składniki odjęto częściowo. Część pozycji była niedostępna lub w zbyt małej ilości."
        : "Składniki odjęto z magazynu.",
    inventoryOperationIds: operationIds,
    updatedAt: new Date().toISOString()
  });

  return {
    status: "zapisano",
    ostrzezenia: warnings,
    inventoryDeducted: true,
    inventoryDeductionInfo:
      warnings.length > 0
        ? "Składniki odjęto częściowo. Część pozycji była niedostępna lub w zbyt małej ilości."
        : "Składniki odjęto z magazynu."
  };
}

export async function getShoppingStates(listKey: string): Promise<StanZakupuRecord[]> {
  const all = await dbGetAll<LegacyShoppingState>(STORE.SHOPPING_STATES);
  return all.map(normalizeShoppingState).filter((it) => it.listKey === listKey);
}

export async function setShoppingState(
  listKey: string,
  productKey: string,
  patch: Partial<Pick<StanZakupuRecord, "kupione" | "mamWDomu">>
): Promise<void> {
  const id = shoppingStateId(listKey, productKey);
  const current = await dbGet<LegacyShoppingState>(STORE.SHOPPING_STATES, id);
  const normalizedCurrent = current ? normalizeShoppingState(current) : undefined;

  await dbPut<StanZakupuRecord>(STORE.SHOPPING_STATES, {
    id,
    listKey,
    productKey,
    kupione: patch.kupione ?? normalizedCurrent?.kupione ?? false,
    mamWDomu: patch.mamWDomu ?? normalizedCurrent?.mamWDomu ?? false
  });
}

export async function getPantryItems(): Promise<SpizarniaItemRecord[]> {
  const rows = await dbGetAll<SpizarniaItemRecord>(STORE.PANTRY_ITEMS);
  return rows.sort((a, b) => a.label.localeCompare(b.label, "pl"));
}

export async function setPantryItem(productKey: string, label: string, aktywny: boolean): Promise<void> {
  await dbPut<SpizarniaItemRecord>(STORE.PANTRY_ITEMS, {
    id: productKey,
    productKey,
    label,
    aktywny,
    updatedAt: new Date().toISOString()
  });
}

export async function removePantryItem(productKey: string): Promise<void> {
  await dbDelete(STORE.PANTRY_ITEMS, productKey);
}

export async function getInventoryCatalog(): Promise<InventoryCatalogItemRecord[]> {
  try {
    const rows = await dbGetAll<InventoryCatalogItemRecord>(STORE.INVENTORY_CATALOG);
    return rows.map(normalizeInventoryCatalogItem).filter((it) => it.aktywny).sort((a, b) => a.nazwa.localeCompare(b.nazwa, "pl"));
  } catch (error) {
    if (!isMissingStoreError(error)) throw error;
    return BASE_INVENTORY_CATALOG.map((it) => normalizeInventoryCatalogItem(it));
  }
}

export async function getInventoryItems(): Promise<InventoryItemRecord[]> {
  const rows = await dbGetAll<InventoryItemRecord>(STORE.INVENTORY_ITEMS);
  return rows
    .map((row) => normalizeInventoryItem(row))
    .sort((a, b) => a.nazwa.localeCompare(b.nazwa, "pl"));
}

export async function upsertInventoryItem(input: {
  nazwa: string;
  ilosc: number;
  jednostka: string;
  grupa?: ShoppingGroup;
  lokalizacja?: LokalizacjaMagazynu;
  notatka?: string;
  dataWaznosci?: string;
}): Promise<void> {
  const next = normalizeInventoryItem(input);
  const catalogRow: InventoryCatalogItemRecord = normalizeInventoryCatalogItem({
    id: next.id,
    productKey: next.productKey,
    nazwa: next.nazwa,
    jednostka: next.jednostka,
    grupa: next.grupa,
    bazowyZPlanu: false,
    source: "manual",
    aktywny: true,
    updatedAt: new Date().toISOString()
  });
  const current = await dbGet<InventoryItemRecord>(STORE.INVENTORY_ITEMS, next.id);
  try {
    const currentCatalog = await dbGet<InventoryCatalogItemRecord>(STORE.INVENTORY_CATALOG, next.id);
    if (!currentCatalog) {
      await dbPut<InventoryCatalogItemRecord>(STORE.INVENTORY_CATALOG, catalogRow);
    }
  } catch (error) {
    if (!isMissingStoreError(error)) throw error;
  }
  await dbPut<InventoryItemRecord>(STORE.INVENTORY_ITEMS, {
    ...next,
    ilosc: Number.isFinite(next.ilosc) ? next.ilosc : current?.ilosc ?? 0,
    bazowyZPlanu: current?.bazowyZPlanu ?? false,
    source: current?.source ?? "manual",
    updatedAt: new Date().toISOString()
  });
}

export async function setInventoryAmount(productKey: string, jednostka: string, ilosc: number, nazwaHint?: string): Promise<void> {
  const unit = normalizeUnit(jednostka);
  const id = inventoryId(productKey, unit);
  const current = await dbGet<InventoryItemRecord>(STORE.INVENTORY_ITEMS, id);
  const next = normalizeInventoryItem({
    ...(current ?? {}),
    id,
    productKey,
    nazwa: current?.nazwa ?? nazwaHint ?? productKey,
    ilosc,
    jednostka: unit,
    grupa: current?.grupa
  });
  try {
    const currentCatalog = await dbGet<InventoryCatalogItemRecord>(STORE.INVENTORY_CATALOG, id);
    if (!currentCatalog) {
      await dbPut<InventoryCatalogItemRecord>(STORE.INVENTORY_CATALOG, normalizeInventoryCatalogItem({
        id,
        productKey,
        nazwa: next.nazwa,
        jednostka: unit,
        grupa: next.grupa,
        bazowyZPlanu: false,
        source: "manual",
        aktywny: true,
        updatedAt: new Date().toISOString()
      }));
    }
  } catch (error) {
    if (!isMissingStoreError(error)) throw error;
  }
  await dbPut<InventoryItemRecord>(STORE.INVENTORY_ITEMS, { ...next, updatedAt: new Date().toISOString() });
}

export async function addInventoryAmount(productKey: string, jednostka: string, delta: number, nazwaHint?: string): Promise<void> {
  const unit = normalizeUnit(jednostka);
  const id = inventoryId(productKey, unit);
  const current = await dbGet<InventoryItemRecord>(STORE.INVENTORY_ITEMS, id);
  const currentAmount = current?.ilosc ?? 0;
  const nextAmount = Math.max(0, currentAmount + delta);
  const next = normalizeInventoryItem({
    ...(current ?? {}),
    id,
    productKey,
    nazwa: current?.nazwa ?? nazwaHint ?? productKey,
    ilosc: nextAmount,
    jednostka: unit,
    grupa: current?.grupa
  });
  try {
    const currentCatalog = await dbGet<InventoryCatalogItemRecord>(STORE.INVENTORY_CATALOG, id);
    if (!currentCatalog) {
      await dbPut<InventoryCatalogItemRecord>(STORE.INVENTORY_CATALOG, normalizeInventoryCatalogItem({
        id,
        productKey,
        nazwa: next.nazwa,
        jednostka: unit,
        grupa: next.grupa,
        bazowyZPlanu: false,
        source: "manual",
        aktywny: true,
        updatedAt: new Date().toISOString()
      }));
    }
  } catch (error) {
    if (!isMissingStoreError(error)) throw error;
  }
  await dbPut<InventoryItemRecord>(STORE.INVENTORY_ITEMS, { ...next, updatedAt: new Date().toISOString() });
}

export async function removeInventoryItem(id: string): Promise<void> {
  const current = await dbGet<InventoryItemRecord>(STORE.INVENTORY_ITEMS, id);
  if (!current) return;
  if (current.bazowyZPlanu) {
    await dbPut<InventoryItemRecord>(STORE.INVENTORY_ITEMS, {
      ...current,
      ilosc: 0,
      updatedAt: new Date().toISOString()
    });
    return;
  }
  await dbDelete(STORE.INVENTORY_ITEMS, id);
  try {
    await dbDelete(STORE.INVENTORY_CATALOG, id);
  } catch (error) {
    if (!isMissingStoreError(error)) throw error;
  }
}

export async function getInventoryOperations(): Promise<OperacjaMagazynuRecord[]> {
  const rows = await dbGetAll<OperacjaMagazynuRecord>(STORE.INVENTORY_OPERATIONS);
  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export async function getShoppingManualItems(listKey: string): Promise<ShoppingManualItemRecord[]> {
  const rows = await dbGetAll<ShoppingManualItemRecord>(STORE.SHOPPING_MANUAL_ITEMS);
  return rows.filter((it) => it.listKey === listKey);
}

export async function upsertShoppingManualItem(
  listKey: string,
  input: {
    itemKey?: string;
    nazwa: string;
    ilosc: number;
    jednostka: string;
    notatka?: string;
    typ?: "custom" | "override";
    usuniety?: boolean;
  }
): Promise<void> {
  const normalized = normalizeProductName(input.nazwa);
  const unit = normalizeUnit(input.jednostka);
  const itemKey = input.itemKey ?? buildItemKey(normalized.productKey, unit);
  const id = manualItemId(listKey, itemKey);

  await dbPut<ShoppingManualItemRecord>(STORE.SHOPPING_MANUAL_ITEMS, {
    id,
    listKey,
    itemKey,
    productKey: normalized.productKey,
    nazwa: normalized.canonicalName,
    ilosc: Number.isFinite(input.ilosc) ? input.ilosc : 0,
    jednostka: unit,
    notatka: input.notatka ?? "",
    grupa: resolveShoppingGroup(normalized.canonicalName),
    typ: input.typ ?? "custom",
    usuniety: !!input.usuniety,
    updatedAt: new Date().toISOString()
  });
}

export async function markShoppingItemRemoved(listKey: string, itemKey: string, currentName: string): Promise<void> {
  const normalized = normalizeProductName(currentName);
  const id = manualItemId(listKey, itemKey);
  await dbPut<ShoppingManualItemRecord>(STORE.SHOPPING_MANUAL_ITEMS, {
    id,
    listKey,
    itemKey,
    productKey: normalized.productKey,
    nazwa: normalized.canonicalName,
    ilosc: 0,
    jednostka: "szt.",
    typ: "override",
    usuniety: true,
    updatedAt: new Date().toISOString()
  });
}

export async function getNotes(): Promise<NotatkaRecord[]> {
  const notes = await dbGetAll<NotatkaRecord>(STORE.NOTES);
  return notes.sort((a, b) => (a.data < b.data ? 1 : -1));
}

export async function addNote(tekst: string): Promise<void> {
  const clean = tekst.trim();
  if (!clean) return;

  const note: NotatkaRecord = {
    id: crypto.randomUUID(),
    data: new Date().toISOString(),
    tekst: clean
  };

  await dbPut<NotatkaRecord>(STORE.NOTES, note);
}

export async function removeNote(id: string): Promise<void> {
  await dbDelete(STORE.NOTES, id);
}

export async function exportAllData(): Promise<ExportAplikacji> {
  const [dietDays, dayLogs, mealLogs, shoppingStatesRaw, pantryItems, inventoryCatalog, inventoryItems, inventoryOperations, shoppingManualItems, settings, notes, meta] = await Promise.all([
    dbGetAll<DzienDiety>(STORE.DIET_DAYS),
    dbGetAll<DzienRealizacjiRecord>(STORE.DAY_LOGS),
    dbGetAll<RealizacjaPosilkuRecord>(STORE.MEAL_LOGS),
    dbGetAll<LegacyShoppingState>(STORE.SHOPPING_STATES),
    dbGetAll<SpizarniaItemRecord>(STORE.PANTRY_ITEMS),
    dbGetAll<InventoryCatalogItemRecord>(STORE.INVENTORY_CATALOG).catch((error) => {
      if (isMissingStoreError(error)) return [];
      throw error;
    }),
    dbGetAll<InventoryItemRecord>(STORE.INVENTORY_ITEMS),
    dbGetAll<OperacjaMagazynuRecord>(STORE.INVENTORY_OPERATIONS),
    dbGetAll<ShoppingManualItemRecord>(STORE.SHOPPING_MANUAL_ITEMS),
    dbGetAll<UstawieniaAplikacji>(STORE.SETTINGS),
    dbGetAll<NotatkaRecord>(STORE.NOTES),
    dbGetAll<MetaRecord>(STORE.META)
  ]);

  const shoppingStates = shoppingStatesRaw.map(normalizeShoppingState);

  return {
    version: 6,
    exportedAt: new Date().toISOString(),
    data: { dietDays, dayLogs, mealLogs, shoppingStates, pantryItems, inventoryCatalog, inventoryItems, inventoryOperations, shoppingManualItems, settings, notes, meta }
  };
}

function mapLegacyMealStatuses(rows: unknown[]): RealizacjaPosilkuRecord[] {
  return (rows as LegacyMealStatus[]).map((row) => ({
    id: row.id || mealLogId(row.data, row.posilekId),
    data: row.data,
    dzienDietyId: "",
    posilekId: row.posilekId,
    przygotowany: !!row.zrealizowany,
    zjedzony: !!row.zrealizowany,
    notatka: "",
    updatedAt: row.updatedAt ?? new Date().toISOString()
  }));
}

function mapLegacyDayStatuses(rows: unknown[]): DzienRealizacjiRecord[] {
  return (rows as LegacyDayStatus[]).map((row) => ({
    id: row.id || row.data,
    data: row.data,
    dzienDietyId: row.dzienDietyId,
    numerDniaDiety: 0,
    statusManualny: row.status === "odstepstwo" ? "odstepstwo" : undefined,
    notatka: "",
    logiOdstepstw: [],
    updatedAt: new Date().toISOString()
  }));
}

export async function importAllData(payload: ExportAplikacji): Promise<void> {
  if (!payload?.data || !Array.isArray(payload.data.dietDays)) {
    throw new Error("Nieprawidłowy plik importu.");
  }

  const dayLogs = Array.isArray(payload.data.dayLogs)
    ? payload.data.dayLogs.map((it) => normalizeDayLog(it))
    : mapLegacyDayStatuses(payload.data.dayStatuses ?? []);

  const mealLogs = Array.isArray(payload.data.mealLogs)
    ? payload.data.mealLogs.map((it) => normalizeMealLog(it))
    : mapLegacyMealStatuses(payload.data.mealStatuses ?? []);

  const shoppingStates = (payload.data.shoppingStates ?? []).map((row) => normalizeShoppingState(row as LegacyShoppingState));

  await Promise.all([
    dbClear(STORE.DIET_DAYS),
    dbClear(STORE.DAY_LOGS),
    dbClear(STORE.MEAL_LOGS),
    dbClear(STORE.SHOPPING_STATES),
    dbClear(STORE.SHOPPING_MANUAL_ITEMS),
    dbClear(STORE.PANTRY_ITEMS),
    dbClear(STORE.INVENTORY_CATALOG).catch((error) => {
      if (!isMissingStoreError(error)) throw error;
    }),
    dbClear(STORE.INVENTORY_ITEMS),
    dbClear(STORE.INVENTORY_OPERATIONS),
    dbClear(STORE.SETTINGS),
    dbClear(STORE.NOTES),
    dbClear(STORE.META)
  ]);

  await Promise.all([
    dbBulkPut(STORE.DIET_DAYS, payload.data.dietDays),
    dbBulkPut(STORE.DAY_LOGS, dayLogs),
    dbBulkPut(STORE.MEAL_LOGS, mealLogs),
    dbBulkPut(STORE.SHOPPING_STATES, shoppingStates),
    dbBulkPut(STORE.SHOPPING_MANUAL_ITEMS, payload.data.shoppingManualItems ?? []),
    dbBulkPut(STORE.PANTRY_ITEMS, payload.data.pantryItems?.length ? payload.data.pantryItems : DEFAULT_PANTRY.map((item) => ({
      id: item.productKey,
      productKey: item.productKey,
      label: item.label,
      aktywny: true,
      updatedAt: new Date().toISOString()
    }))),
    dbBulkPut(
      STORE.INVENTORY_CATALOG,
      (payload.data.inventoryCatalog ?? BASE_INVENTORY_CATALOG).map((item) => normalizeInventoryCatalogItem(item))
    ),
    dbBulkPut(STORE.INVENTORY_ITEMS, (payload.data.inventoryItems ?? []).map((item) => normalizeInventoryItem(item))),
    dbBulkPut(STORE.INVENTORY_OPERATIONS, payload.data.inventoryOperations ?? []),
    dbBulkPut(STORE.SETTINGS, payload.data.settings?.length ? payload.data.settings.map(normalizeSettings) : [DEFAULT_SETTINGS]),
    dbBulkPut(STORE.NOTES, payload.data.notes ?? []),
    dbBulkPut(STORE.META, [{ key: "seeded", value: "1" }, { key: "pantrySeeded", value: "1" }, { key: "inventoryCatalogSeeded", value: "1" }])
  ]);

  await seedBaseInventoryCatalog();
}
