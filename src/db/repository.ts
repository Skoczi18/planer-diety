import { SEED_DIETA } from "../data/seedDiet";
import { toISODate } from "../lib/date";
import { buildItemKey, normalizeProductName, normalizeUnit, resolveShoppingGroup } from "../lib/shoppingNormalize";
import {
  DzienDiety,
  DzienRealizacjiRecord,
  ExportAplikacji,
  LogOdstepstwa,
  MetaRecord,
  NotatkaRecord,
  RealizacjaPosilkuRecord,
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
    updatedAt: log.updatedAt ?? new Date().toISOString()
  };
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
  const current = await dbGet<RealizacjaPosilkuRecord>(STORE.MEAL_LOGS, id);

  await dbPut<RealizacjaPosilkuRecord>(STORE.MEAL_LOGS, {
    id,
    data,
    dzienDietyId,
    posilekId,
    przygotowany: patch.przygotowany ?? current?.przygotowany ?? false,
    zjedzony: patch.zjedzony ?? current?.zjedzony ?? false,
    notatka: patch.notatka ?? current?.notatka ?? "",
    updatedAt: new Date().toISOString()
  });
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
  const [dietDays, dayLogs, mealLogs, shoppingStatesRaw, pantryItems, shoppingManualItems, settings, notes, meta] = await Promise.all([
    dbGetAll<DzienDiety>(STORE.DIET_DAYS),
    dbGetAll<DzienRealizacjiRecord>(STORE.DAY_LOGS),
    dbGetAll<RealizacjaPosilkuRecord>(STORE.MEAL_LOGS),
    dbGetAll<LegacyShoppingState>(STORE.SHOPPING_STATES),
    dbGetAll<SpizarniaItemRecord>(STORE.PANTRY_ITEMS),
    dbGetAll<ShoppingManualItemRecord>(STORE.SHOPPING_MANUAL_ITEMS),
    dbGetAll<UstawieniaAplikacji>(STORE.SETTINGS),
    dbGetAll<NotatkaRecord>(STORE.NOTES),
    dbGetAll<MetaRecord>(STORE.META)
  ]);

  const shoppingStates = shoppingStatesRaw.map(normalizeShoppingState);

  return {
    version: 3,
    exportedAt: new Date().toISOString(),
    data: { dietDays, dayLogs, mealLogs, shoppingStates, pantryItems, shoppingManualItems, settings, notes, meta }
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
    dbBulkPut(STORE.SETTINGS, payload.data.settings?.length ? payload.data.settings.map(normalizeSettings) : [DEFAULT_SETTINGS]),
    dbBulkPut(STORE.NOTES, payload.data.notes ?? []),
    dbBulkPut(STORE.META, [{ key: "seeded", value: "1" }, { key: "pantrySeeded", value: "1" }])
  ]);
}
