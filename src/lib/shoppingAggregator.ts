import { DzienDiety, ShoppingFilter, ShoppingGroup, ShoppingManualItemRecord, ShoppingMode, SpizarniaItemRecord, StanZakupuRecord } from "../types";
import { buildItemKey, normalizeProductName, normalizeUnit, resolveShoppingGroup } from "./shoppingNormalize";

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
  brakuje: boolean;
};

export const GROUP_LABELS: Record<ShoppingGroup, string> = {
  mieso: "Mięso",
  nabial_i_jaja: "Nabiał i jaja",
  pieczywo_i_zboza: "Pieczywo i zboża",
  warzywa_i_owoce: "Warzywa i owoce",
  tluszcze_i_dodatki: "Tłuszcze i dodatki",
  przyprawy: "Przyprawy",
  inne: "Inne"
};

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
  pantry: SpizarniaItemRecord[],
  manualRows: ShoppingManualItemRecord[]
): AggregatedShoppingItem[] {
  const stateMap = new Map(states.map((it) => [`${it.listKey}::${it.productKey}`, it]));
  const pantrySet = new Set(pantry.filter((it) => it.aktywny).map((it) => it.productKey));

  const map = new Map<string, AggregatedShoppingItem>();

  days.forEach((day) => {
    day.listaZakupow.forEach((item) => {
      const normalized = normalizeProductName(item.nazwa);
      const unit = normalizeUnit(item.jednostka);
      const itemKey = buildItemKey(normalized.productKey, unit);
      const stateKey = `${listKey}::${itemKey}`;
      const currentState = stateMap.get(stateKey);
      const wSpizarni = pantrySet.has(normalized.productKey);
      const existing = map.get(itemKey);

      map.set(itemKey, {
        itemKey,
        productKey: normalized.productKey,
        nazwa: normalized.canonicalName,
        ilosc: roundAmount((existing?.ilosc ?? 0) + item.ilosc),
        jednostka: unit,
        grupa: resolveShoppingGroup(normalized.canonicalName),
        sourceDayIds: [...new Set([...(existing?.sourceDayIds ?? []), day.id])],
        sourceDayNumbers: [...new Set([...(existing?.sourceDayNumbers ?? []), day.numerDnia])].sort((a, b) => a - b),
        notatka: existing?.notatka,
        manual: existing?.manual ?? false,
        kupione: currentState?.kupione ?? false,
        mamWDomu: currentState?.mamWDomu ?? false,
        wSpizarni,
        brakuje: !(currentState?.kupione || currentState?.mamWDomu || wSpizarni)
      });
    });
  });

  const manualForList = manualRows.filter((it) => it.listKey === listKey);
  manualForList.forEach((row) => {
    const key = row.itemKey;
    const stateKey = `${listKey}::${key}`;
    const currentState = stateMap.get(stateKey);
    const wSpizarni = pantrySet.has(row.productKey);

    if (row.usuniety) {
      map.delete(key);
      return;
    }

    const base = map.get(key);
    map.set(key, {
      itemKey: key,
      productKey: row.productKey,
      nazwa: row.nazwa,
      ilosc: roundAmount(row.ilosc),
      jednostka: normalizeUnit(row.jednostka),
      grupa: row.grupa ?? resolveShoppingGroup(row.nazwa),
      sourceDayIds: base?.sourceDayIds ?? [],
      sourceDayNumbers: base?.sourceDayNumbers ?? [],
      notatka: row.notatka,
      manual: true,
      kupione: currentState?.kupione ?? base?.kupione ?? false,
      mamWDomu: currentState?.mamWDomu ?? base?.mamWDomu ?? false,
      wSpizarni,
      brakuje: !((currentState?.kupione ?? base?.kupione) || (currentState?.mamWDomu ?? base?.mamWDomu) || wSpizarni)
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
      return items.filter((item) => !item.kupione && !item.mamWDomu);
    default:
      return items;
  }
}

export function groupShoppingItems(items: AggregatedShoppingItem[]): Array<{ group: ShoppingGroup; label: string; items: AggregatedShoppingItem[] }> {
  const order: ShoppingGroup[] = [
    "mieso",
    "nabial_i_jaja",
    "pieczywo_i_zboza",
    "warzywa_i_owoce",
    "tluszcze_i_dodatki",
    "przyprawy",
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
