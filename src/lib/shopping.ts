import { DzienDiety, Skladnik } from "../types";

export type ZakupItem = {
  key: string;
  nazwa: string;
  ilosc: number;
  jednostka: string;
};

export function buildShoppingList(days: DzienDiety[]): ZakupItem[] {
  const map = new Map<string, ZakupItem>();

  days.forEach((day) => {
    day.listaZakupow.forEach((item: Skladnik) => {
      const key = `${item.nazwa}__${item.jednostka}`;
      const prev = map.get(key);
      map.set(key, {
        key,
        nazwa: item.nazwa,
        jednostka: item.jednostka,
        ilosc: (prev?.ilosc ?? 0) + item.ilosc
      });
    });
  });

  return [...map.values()].sort((a, b) => a.nazwa.localeCompare(b.nazwa, "pl"));
}
