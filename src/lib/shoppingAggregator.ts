import { DzienDiety, InventoryItemRecord, ShoppingFilter, ShoppingGroup, ShoppingManualItemRecord, ShoppingMode, StanZakupuRecord } from "../types";
import { buildItemKey, normalizeProductName, normalizeShoppingGroup, normalizeUnit, resolveShoppingGroup, splitIngredientNameToProducts } from "./shoppingNormalize";
import { CATEGORY_LABELS } from "./productCategories";

export type ShoppingSelection = {
  mode: ShoppingMode;
  dayIds: string[];
};

export type AggregatedShoppingItem = {
  itemKey: string;
  productKey: string;
  nazwa: string;
  ilosc: number;
  jednostka: string;
  grupa: ShoppingGroup;
  sourceDayIds: string[];
  sourceDayNumbers: number[];
  notatka?: string;
  manual: boolean;
  kupione: boolean;
  mamWDomu: boolean;
  wSpizarni: boolean;
  iloscWMagazynie: number;
  brakujacaIlosc: number;
  brakuje: boolean;
};

export const GROUP_LABELS: Record<ShoppingGroup, string> = CATEGORY_LABELS;

function daySortValue(dayId: string): number {
  const match = dayId.match(/\d+/);
  return match ? Number(match[0]) : Number.MAX_SAFE_INTEGER;
}

export function normalizeSelectionDayIds(dayIds: string[]): string[] {
  return [...new Set(dayIds.filter(Boolean))].sort((a, b) => {
    const aa = daySortValue(a);
    const bb = daySortValue(b);
    if (aa !== bb) return aa - bb;
    return a.localeCompare(b, "pl");
  });
}

export function buildSelectedDaysKey(dayIds: string[]): string {
  const normalized = normalizeSelectionDayIds(dayIds);
  return normalized.length ? normalized.join(",") : "none";
}

export function buildShoppingListKey(selection: ShoppingSelection): string {
  if (selection.mode === "tydzien") return "week:all";
  if (selection.mode === "dzien") return `day:${selection.dayIds[0] ?? "d1"}`;
  return `multi:${buildSelectedDaysKey(selection.dayIds)}`;
}

export function resolveSelectedDays(dieta: DzienDiety[], selection: ShoppingSelection): DzienDiety[] {
  if (selection.mode === "tydzien") return dieta;
  const set = new Set(selection.dayIds);
  return dieta.filter((day) => set.has(day.id));
}

function roundAmount(value: number): number {
  return Math.round(value * 100) / 100;
}

export function aggregateShoppingItems(
  days: DzienDiety[],
  listKey: string,
  states: StanZakupuRecord[],
  manualRows: ShoppingManualItemRecord[],
  inventory: InventoryItemRecord[]
): AggregatedShoppingItem[] {
  const stateMap = new Map(states.map((it) => [`${it.listKey}::${it.productKey}`, it]));
  const inventoryMap = new Map(inventory.map((it) => [it.id, it]));

  const map = new Map<string, AggregatedShoppingItem>();

  days.forEach((day) => {
    day.listaZakupow.forEach((item) => {
      const expandedNames = splitIngredientNameToProducts(item.nazwa);
      const amountPerEntry = expandedNames.length > 1 ? item.ilosc / expandedNames.length : item.ilosc;
      expandedNames.forEach((nameEntry) => {
        const normalized = normalizeProductName(nameEntry);
        const unit = normalizeUnit(item.jednostka);
        const itemKey = buildItemKey(normalized.productKey, unit);
        const stateKey = `${listKey}::${itemKey}`;
        const currentState = stateMap.get(stateKey);
        const inventoryAmount = inventoryMap.get(itemKey)?.ilosc ?? 0;
        const existing = map.get(itemKey);
        const requiredAmount = roundAmount((existing?.ilosc ?? 0) + amountPerEntry);
        const effectiveInventory = inventoryAmount;
        const missingAmount = roundAmount(Math.max(0, requiredAmount - effectiveInventory));
        const hasEnough = missingAmount <= 0;

        map.set(itemKey, {
          itemKey,
          productKey: normalized.productKey,
          nazwa: normalized.canonicalName,
          ilosc: requiredAmount,
          jednostka: unit,
          grupa: resolveShoppingGroup(normalized.canonicalName),
          sourceDayIds: [...new Set([...(existing?.sourceDayIds ?? []), day.id])],
          sourceDayNumbers: [...new Set([...(existing?.sourceDayNumbers ?? []), day.numerDnia])].sort((a, b) => a - b),
          notatka: existing?.notatka,
          manual: existing?.manual ?? false,
          kupione: currentState?.kupione ?? false,
          mamWDomu: currentState ? currentState.mamWDomu : hasEnough,
          wSpizarni: false,
          iloscWMagazynie: effectiveInventory,
          brakujacaIlosc: missingAmount,
          brakuje: !hasEnough
        });
      });
    });
  });

  const manualForList = manualRows.filter((it) => it.listKey === listKey);
  manualForList.forEach((row) => {
    const key = row.itemKey;
    const stateKey = `${listKey}::${key}`;
    const currentState = stateMap.get(stateKey);
    const inventoryAmount = inventoryMap.get(key)?.ilosc ?? 0;

    if (row.usuniety) {
      map.delete(key);
      return;
    }

    const base = map.get(key);
    const requiredAmount = roundAmount(row.ilosc);
    const effectiveInventory = inventoryAmount;
    const missingAmount = roundAmount(Math.max(0, requiredAmount - effectiveInventory));
    const hasEnough = missingAmount <= 0;
    map.set(key, {
      itemKey: key,
      productKey: row.productKey,
      nazwa: row.nazwa,
      ilosc: requiredAmount,
      jednostka: normalizeUnit(row.jednostka),
      grupa: normalizeShoppingGroup(row.grupa, row.nazwa),
      sourceDayIds: base?.sourceDayIds ?? [],
      sourceDayNumbers: base?.sourceDayNumbers ?? [],
      notatka: row.notatka,
      manual: true,
      kupione: currentState?.kupione ?? base?.kupione ?? false,
      mamWDomu: currentState ? currentState.mamWDomu : hasEnough,
      wSpizarni: false,
      iloscWMagazynie: effectiveInventory,
      brakujacaIlosc: missingAmount,
      brakuje: !hasEnough
    });
  });

  return [...map.values()].sort((a, b) => a.nazwa.localeCompare(b.nazwa, "pl"));
}

export function filterShoppingItems(items: AggregatedShoppingItem[], filter: ShoppingFilter): AggregatedShoppingItem[] {
  switch (filter) {
    case "ukryj_kupione":
      return items.filter((item) => !item.kupione);
    case "ukryj_mam":
      return items.filter((item) => !item.mamWDomu);
    case "tylko_brakujace":
      return items.filter((item) => item.brakuje);
    case "tylko_nieodhaczone":
      return items.filter((item) => !item.kupione && item.brakuje);
    default:
      return items;
  }
}

export function groupShoppingItems(items: AggregatedShoppingItem[]): Array<{ group: ShoppingGroup; label: string; items: AggregatedShoppingItem[] }> {
  const order: ShoppingGroup[] = [
    "nabial_i_jaja",
    "mieso_i_ryby",
    "pieczywo_i_zboza",
    "warzywa_i_owoce",
    "tluszcze_i_dodatki",
    "przyprawy_i_dodatki_kuchenne",
    "napoje_i_plyny",
    "inne"
  ];

  return order
    .map((group) => ({
      group,
      label: GROUP_LABELS[group],
      items: items.filter((item) => item.grupa === group)
    }))
    .filter((entry) => entry.items.length > 0);
}

export function countMissing(items: AggregatedShoppingItem[]): number {
  return items.filter((it) => it.brakuje).length;
}
