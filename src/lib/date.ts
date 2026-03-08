const DAY_MS = 24 * 60 * 60 * 1000;

export function toISODate(input = new Date()): string {
  return input.toISOString().slice(0, 10);
}

export function formatDatePL(isoDate: string): string {
  const date = new Date(`${isoDate}T00:00:00`);
  return new Intl.DateTimeFormat("pl-PL", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit"
  }).format(date);
}

export function daysBetween(fromISO: string, toISO: string): number {
  const from = new Date(`${fromISO}T00:00:00`).getTime();
  const to = new Date(`${toISO}T00:00:00`).getTime();
  return Math.floor((to - from) / DAY_MS);
}

export function addDays(isoDate: string, days: number): string {
  const base = new Date(`${isoDate}T00:00:00`);
  base.setDate(base.getDate() + days);
  return toISODate(base);
}

export function getDietDayNumber(startDate: string, targetDate: string): number {
  const diff = daysBetween(startDate, targetDate);
  return ((diff % 7) + 7) % 7 + 1;
}
