import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { toISODate } from "./date";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export function useSelectedDate(defaultDate?: string): string {
  const [searchParams] = useSearchParams();

  return useMemo(() => {
    const date = searchParams.get("data");
    if (date && DATE_RE.test(date)) return date;
    return defaultDate ?? toISODate();
  }, [searchParams, defaultDate]);
}
