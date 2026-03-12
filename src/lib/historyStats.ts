import { addDays as addDaysDateFns, format, parseISO, startOfWeek } from "date-fns";
import { toISODate } from "./date";
import { calculatePostepDnia, getAutoStatusDnia } from "./execution";
import { DzienDiety, DzienRealizacjiRecord, RealizacjaPosilkuRecord, StatusDnia } from "../types";

export type DaySnapshot = {
  date: string;
  day?: DzienDiety;
  dayLog?: DzienRealizacjiRecord;
  mealLogs: RealizacjaPosilkuRecord[];
  status: StatusDnia | "brak_danych";
  progress: number;
};

export type WeekSummary = {
  from: string;
  to: string;
  zrealizowane: number;
  odstepstwa: number;
  wTrakcie: number;
  brakDanych: number;
  sredniPostep: number;
  sredniaKalorycznoscPlanu: number;
  posilkiZjedzone: number;
  posilkiPlan: number;
};

export type GlobalStats = {
  dniZapisane: number;
  dniZgodneZPlanem: number;
  dniOdstepstw: number;
  procentRealizacji: number;
};

export function buildDaySnapshot(date: string, day: DzienDiety | undefined, dayLog: DzienRealizacjiRecord | undefined, mealLogs: RealizacjaPosilkuRecord[]): DaySnapshot {
  if (!day) {
    return { date, day, dayLog, mealLogs, status: "brak_danych", progress: 0 };
  }

  const progress = calculatePostepDnia(day, mealLogs).procent;
  const hasAnyData = !!dayLog?.notatka || !!dayLog?.wagaKg || !!dayLog?.logiOdstepstw?.length || mealLogs.length > 0;
  if (!hasAnyData) {
    return { date, day, dayLog, mealLogs, status: "brak_danych", progress: 0 };
  }

  const status = getAutoStatusDnia(day, mealLogs, dayLog);
  return { date, day, dayLog, mealLogs, status, progress };
}

export function buildWeekSummary(anchorDate: string, snapshots: DaySnapshot[]): WeekSummary {
  const anchor = parseISO(anchorDate);
  const monday = startOfWeek(anchor, { weekStartsOn: 1 });
  const weekDates = Array.from({ length: 7 }, (_, idx) => format(addDaysDateFns(monday, idx), "yyyy-MM-dd"));
  const from = weekDates[0];
  const to = weekDates[6];
  const week = weekDates.map((date) => snapshots.find((s) => s.date === date)).filter(Boolean) as DaySnapshot[];

  const zrealizowane = week.filter((s) => s.status === "zrealizowany").length;
  const odstepstwa = week.filter((s) => s.status === "odstepstwo").length;
  const wTrakcie = week.filter((s) => s.status === "w_trakcie").length;
  const brakDanych = week.filter((s) => s.status === "brak_danych").length;

  const sredniPostep = week.length ? Math.round(week.reduce((sum, s) => sum + s.progress, 0) / week.length) : 0;

  const plannedCalories = week.filter((s) => s.day).map((s) => s.day!.kalorie);
  const sredniaKalorycznoscPlanu = plannedCalories.length
    ? Math.round(plannedCalories.reduce((sum, c) => sum + c, 0) / plannedCalories.length)
    : 0;

  const posilki = week
    .filter((s) => s.day)
    .flatMap((s) => s.day!.posilki.map((m) => ({ eaten: !!s.mealLogs.find((log) => log.posilekId === m.id)?.zjedzony })));

  const posilkiZjedzone = posilki.filter((p) => p.eaten).length;
  const posilkiPlan = posilki.length;

  return {
    from,
    to,
    zrealizowane,
    odstepstwa,
    wTrakcie,
    brakDanych,
    sredniPostep,
    sredniaKalorycznoscPlanu,
    posilkiZjedzone,
    posilkiPlan
  };
}

export function buildGlobalStats(snapshots: DaySnapshot[]): GlobalStats {
  const filled = snapshots.filter((s) => s.status !== "brak_danych");
  const dniZapisane = filled.length;
  const dniZgodneZPlanem = filled.filter((s) => s.status === "zrealizowany").length;
  const dniOdstepstw = filled.filter((s) => s.status === "odstepstwo").length;
  const procentRealizacji = dniZapisane ? Math.round((dniZgodneZPlanem / dniZapisane) * 100) : 0;

  return {
    dniZapisane,
    dniZgodneZPlanem,
    dniOdstepstw,
    procentRealizacji
  };
}

export function statusCalendarLabel(status: DaySnapshot["status"]): string {
  if (status === "brak_danych") return "Brak danych";
  if (status === "zrealizowany") return "Zrealizowany";
  if (status === "w_trakcie") return "W trakcie";
  if (status === "odstepstwo") return "Odstępstwo";
  return "Nie rozpoczęty";
}

export function getMonthLabel(dateISO: string): string {
  const date = new Date(`${dateISO}T00:00:00`);
  return new Intl.DateTimeFormat("pl-PL", { month: "long", year: "numeric" }).format(date);
}

export function firstDayOfMonth(dateISO: string): string {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setDate(1);
  return toISODate(date);
}

export function shiftMonth(dateISO: string, delta: number): string {
  const date = new Date(`${dateISO}T00:00:00`);
  date.setMonth(date.getMonth() + delta);
  date.setDate(1);
  return toISODate(date);
}

export function buildMonthGrid(anchorMonthISO: string): string[] {
  const monthStart = new Date(`${anchorMonthISO}T00:00:00`);
  const day = (monthStart.getDay() + 6) % 7;
  const gridStart = new Date(monthStart);
  gridStart.setDate(gridStart.getDate() - day);

  return Array.from({ length: 42 }, (_, idx) => {
    const current = new Date(gridStart);
    current.setDate(current.getDate() + idx);
    return toISODate(current);
  });
}
