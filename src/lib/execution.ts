import { DzienDiety, DzienRealizacjiRecord, RealizacjaPosilkuRecord, StatusDnia, UstawieniaAplikacji } from "../types";
import { getDietDayNumber } from "./date";

export type PostepDnia = {
  liczbaPosilkow: number;
  zjedzone: number;
  przygotowane: number;
  procent: number;
  kcalZjedzone: number;
  kcalPlan: number;
};

export function getDayForDate(dieta: DzienDiety[], settings: UstawieniaAplikacji, date: string): DzienDiety | undefined {
  if (!dieta.length) return undefined;

  const numer =
    settings.trybDnia === "automatyczny"
      ? getDietDayNumber(settings.startDate, date)
      : clampDayNumber(settings.recznyNumerDnia);

  return dieta.find((d) => d.numerDnia === numer);
}

export function clampDayNumber(value: number): number {
  if (!Number.isFinite(value)) return 1;
  const v = Math.floor(value);
  if (v < 1) return 1;
  if (v > 7) return 7;
  return v;
}

export function calculatePostepDnia(day: DzienDiety, mealLogs: RealizacjaPosilkuRecord[]): PostepDnia {
  const liczbaPosilkow = day.posilki.length;
  const zjedzone = day.posilki.filter((m) => mealLogs.find((log) => log.posilekId === m.id)?.zjedzony).length;
  const przygotowane = day.posilki.filter((m) => mealLogs.find((log) => log.posilekId === m.id)?.przygotowany).length;
  const procent = liczbaPosilkow ? Math.round((zjedzone / liczbaPosilkow) * 100) : 0;
  const kcalZjedzone = day.posilki
    .filter((m) => mealLogs.find((log) => log.posilekId === m.id)?.zjedzony)
    .reduce((sum, m) => sum + m.makro.kcal, 0);

  return {
    liczbaPosilkow,
    zjedzone,
    przygotowane,
    procent,
    kcalZjedzone,
    kcalPlan: day.kalorie
  };
}

export function getAutoStatusDnia(day: DzienDiety, mealLogs: RealizacjaPosilkuRecord[], dayLog?: DzienRealizacjiRecord): StatusDnia {
  if (dayLog?.statusManualny === "odstepstwo") return "odstepstwo";

  const allEaten = day.posilki.every((m) => mealLogs.find((log) => log.posilekId === m.id)?.zjedzony);
  if (allEaten) return "zrealizowany";

  const touched = day.posilki.some((m) => {
    const log = mealLogs.find((entry) => entry.posilekId === m.id);
    return !!log?.przygotowany || !!log?.zjedzony;
  });

  if (touched) return "w_trakcie";
  return "nie_rozpoczety";
}

export function getKomentarzPostepu(procent: number): string {
  if (procent >= 100) return "Plan dnia zrealizowany";
  if (procent >= 70) return "Dzień prawie gotowy";
  if (procent >= 40) return "Jesteś w połowie";
  return "Dzień dopiero zaczęty";
}

export function statusDniaLabel(status: StatusDnia): string {
  switch (status) {
    case "nie_rozpoczety":
      return "Nie rozpoczęty";
    case "w_trakcie":
      return "W trakcie";
    case "zrealizowany":
      return "Zrealizowany";
    case "odstepstwo":
      return "Odstępstwo";
    default:
      return "Nieznany";
  }
}
