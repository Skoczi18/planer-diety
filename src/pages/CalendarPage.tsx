import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { DayButton as RdpDayButton, DayPicker, type DayButtonProps } from "react-day-picker";
import { addDays, addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format, getISODay, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { pl } from "date-fns/locale";
import "react-day-picker/style.css";
import { useApp } from "../context/AppContext";
import { getAllDayLogs, getAllMealLogs } from "../db/repository";
import { toISODate } from "../lib/date";
import { getDayForDate } from "../lib/execution";
import { buildDaySnapshot, buildGlobalStats, buildWeekSummary, statusCalendarLabel } from "../lib/historyStats";
import { DzienRealizacjiRecord, RealizacjaPosilkuRecord } from "../types";

function toIsoLocal(date: Date): string {
  return format(date, "yyyy-MM-dd");
}

function fromIsoLocal(iso: string): Date {
  return parseISO(iso);
}

function getWeekCycleDayLabel(date: Date): string {
  return `Dzień ${getISODay(date)}`;
}

export function CalendarPage() {
  const { settings, dieta } = useApp();
  const [loading, setLoading] = useState(true);
  const [dayLogs, setDayLogs] = useState<DzienRealizacjiRecord[]>([]);
  const [mealLogs, setMealLogs] = useState<RealizacjaPosilkuRecord[]>([]);
  const [anchorMonth, setAnchorMonth] = useState<Date>(startOfMonth(new Date()));
  const [selectedDate, setSelectedDate] = useState(toISODate());
  const [weekAnchorDate, setWeekAnchorDate] = useState(toISODate());
  const [viewMode, setViewMode] = useState<"miesiac" | "historia">("miesiac");

  useEffect(() => {
    setLoading(true);
    Promise.all([getAllDayLogs(), getAllMealLogs()])
      .then(([dLogs, mLogs]) => {
        setDayLogs(dLogs);
        setMealLogs(mLogs);
      })
      .finally(() => setLoading(false));
  }, []);

  const monthDates = useMemo(() => {
    const monthStart = startOfMonth(anchorMonth);
    const monthEnd = endOfMonth(anchorMonth);
    const from = startOfWeek(monthStart, { weekStartsOn: 1 });
    const to = endOfWeek(monthEnd, { weekStartsOn: 1 });
    return eachDayOfInterval({ start: from, end: to }).map(toIsoLocal);
  }, [anchorMonth]);

  const visibleSnapshots = useMemo(() => {
    if (!settings) return [];
    return monthDates.map((date) => {
      const day = getDayForDate(dieta, settings, date);
      const dayLog = dayLogs.find((log) => log.data === date);
      const dateMeals = mealLogs.filter((entry) => entry.data === date && (day ? entry.dzienDietyId === day.id || !entry.dzienDietyId : true));
      return buildDaySnapshot(date, day, dayLog, dateMeals);
    });
  }, [monthDates, dieta, settings, dayLogs, mealLogs]);

  const snapshotMap = useMemo(() => {
    return new Map(visibleSnapshots.map((snap) => [snap.date, snap]));
  }, [visibleSnapshots]);

  const allSnapshots = useMemo(() => {
    if (!settings) return [];
    const dates = new Set<string>();
    dayLogs.forEach((log) => dates.add(log.data));
    mealLogs.forEach((log) => dates.add(log.data));

    return [...dates]
      .sort((a, b) => (a < b ? 1 : -1))
      .map((date) => {
        const day = getDayForDate(dieta, settings, date);
        const dayLog = dayLogs.find((log) => log.data === date);
        const dateMeals = mealLogs.filter((entry) => entry.data === date && (day ? entry.dzienDietyId === day.id || !entry.dzienDietyId : true));
        return buildDaySnapshot(date, day, dayLog, dateMeals);
      });
  }, [dieta, settings, dayLogs, mealLogs]);

  const selectedDay = useMemo(() => {
    if (!settings) return undefined;
    return getDayForDate(dieta, settings, selectedDate);
  }, [dieta, settings, selectedDate]);

  const selectedDayLog = useMemo(() => dayLogs.find((log) => log.data === selectedDate), [dayLogs, selectedDate]);
  const selectedMealLogs = useMemo(
    () => mealLogs.filter((entry) => entry.data === selectedDate && (selectedDay ? entry.dzienDietyId === selectedDay.id || !entry.dzienDietyId : true)),
    [mealLogs, selectedDate, selectedDay]
  );

  const selectedSnapshot = useMemo(
    () => buildDaySnapshot(selectedDate, selectedDay, selectedDayLog, selectedMealLogs),
    [selectedDate, selectedDay, selectedDayLog, selectedMealLogs]
  );

  const weekRangeSnapshots = useMemo(() => {
    const date = fromIsoLocal(weekAnchorDate);
    const monday = startOfWeek(date, { weekStartsOn: 1 });
    return Array.from({ length: 7 }, (_, idx) => toIsoLocal(addDays(monday, idx))).map((iso) => {
      const cached = snapshotMap.get(iso);
      if (cached) return cached;
      const day = settings ? getDayForDate(dieta, settings, iso) : undefined;
      const dayLog = dayLogs.find((log) => log.data === iso);
      const dateMeals = mealLogs.filter((entry) => entry.data === iso && (day ? entry.dzienDietyId === day.id || !entry.dzienDietyId : true));
      return buildDaySnapshot(iso, day, dayLog, dateMeals);
    });
  }, [weekAnchorDate, snapshotMap, settings, dieta, dayLogs, mealLogs]);

  const weekSummary = useMemo(() => buildWeekSummary(weekAnchorDate, weekRangeSnapshots), [weekAnchorDate, weekRangeSnapshots]);
  const globalStats = useMemo(() => buildGlobalStats(allSnapshots), [allSnapshots]);

  if (!settings || loading) return <p className="empty">Ładowanie kalendarza...</p>;

  return (
    <div className="stack">
      <section className="card calendar-sticky-card">
        <div className="grid grid-2">
          <button className={viewMode === "miesiac" ? "btn btn-primary" : "btn"} onClick={() => setViewMode("miesiac")}>Widok miesiąca</button>
          <button className={viewMode === "historia" ? "btn btn-primary" : "btn"} onClick={() => setViewMode("historia")}>Lista historii</button>
        </div>
      </section>

      {viewMode === "miesiac" && (
        <section className="card calendar-month-card">
          <div className="calendar-month-header">
            <button className="btn btn-small calendar-nav-btn" onClick={() => setAnchorMonth((m) => startOfMonth(addMonths(m, -1)))}>
              Poprzedni
            </button>
            <h3>{format(anchorMonth, "LLLL yyyy", { locale: pl })}</h3>
            <button className="btn btn-small calendar-nav-btn" onClick={() => setAnchorMonth((m) => startOfMonth(addMonths(m, 1)))}>
              Następny
            </button>
          </div>
          <button className="btn btn-small calendar-today-btn" onClick={() => setAnchorMonth(startOfMonth(new Date()))}>
            Wróć do bieżącego miesiąca
          </button>

          <DayPicker
            locale={pl}
            ISOWeek
            showOutsideDays
            hideNavigation
            mode="single"
            selected={fromIsoLocal(selectedDate)}
            onSelect={(date) => {
              if (!date) return;
              const iso = toIsoLocal(date);
              setSelectedDate(iso);
              setWeekAnchorDate(iso);
              setAnchorMonth(startOfMonth(date));
            }}
            month={anchorMonth}
            modifiers={{
              zrealizowany: (date) => snapshotMap.get(toIsoLocal(date))?.status === "zrealizowany",
              w_trakcie: (date) => snapshotMap.get(toIsoLocal(date))?.status === "w_trakcie",
              odstepstwo: (date) => snapshotMap.get(toIsoLocal(date))?.status === "odstepstwo",
              brak_danych: (date) => snapshotMap.get(toIsoLocal(date))?.status === "brak_danych",
              z_historia: (date) => {
                const snap = snapshotMap.get(toIsoLocal(date));
                return !!snap && (!!snap.dayLog || snap.mealLogs.length > 0);
              }
            }}
            modifiersClassNames={{
              zrealizowany: "status-zrealizowany",
              w_trakcie: "status-w_trakcie",
              odstepstwo: "status-odstepstwo",
              brak_danych: "status-brak_danych",
              z_historia: "status-z-historia"
            }}
            className="calendar-picker"
            formatters={{
              formatCaption: (month) => format(month, "LLLL yyyy", { locale: pl }),
              formatWeekdayName: (weekday) => format(weekday, "EEEEE", { locale: pl })
            }}
            components={{
              DayButton: (props: DayButtonProps) => {
                const iso = toIsoLocal(props.day.date);
                const snap = snapshotMap.get(iso);
                return (
                  <RdpDayButton {...props}>
                    <div className="calendar-day-content">
                      <div className="cell-top">
                        <strong>{format(props.day.date, "d")}</strong>
                        {snap?.day ? <span className="mini-tag">D{snap.day.numerDnia}</span> : null}
                      </div>
                      <span className="day-cycle-label">{getWeekCycleDayLabel(props.day.date)}</span>
                      <span className="mini-status">{snap?.progress ?? 0}%</span>
                      <div className="cell-marks">
                        {snap?.dayLog?.notatka ? <span className="mark">N</span> : null}
                        {snap?.dayLog?.logiOdstepstw?.length ? <span className="mark">O</span> : null}
                        {typeof snap?.dayLog?.wagaKg === "number" ? <span className="mark">W</span> : null}
                      </div>
                    </div>
                  </RdpDayButton>
                );
              }
            }}
          />
        </section>
      )}

      {viewMode === "historia" && (
        <section className="card">
          <h3>Ostatnie wpisy</h3>
          {allSnapshots.length ? (
            <ul className="list">
              {allSnapshots.slice(0, 30).map((snap) => (
                <li key={snap.date} className={`list-item status-${snap.status}`}>
                  <strong>{snap.date}</strong>
                  <p>{snap.day ? `${snap.day.nazwa} (${snap.day.numerDnia}/7)` : "Brak dnia diety"}</p>
                  <p>Status: {statusCalendarLabel(snap.status)} | Postęp: {snap.progress}%</p>
                  <p>Waga: {typeof snap.dayLog?.wagaKg === "number" ? `${snap.dayLog.wagaKg} kg` : "brak"}</p>
                  {snap.day ? <Link className="btn btn-small" to={`/dieta/${snap.day.id}?data=${snap.date}`}>Otwórz dzień</Link> : null}
                </li>
              ))}
            </ul>
          ) : (
            <div className="empty-state">Brak historii realizacji.</div>
          )}
        </section>
      )}

      <section className="card">
        <h3>Szczegóły dnia: {selectedDate}</h3>
        {selectedSnapshot ? (
          <>
            <p>Status: {statusCalendarLabel(selectedSnapshot.status)}</p>
            <p>Postęp: {selectedSnapshot.progress}%</p>
            <p>{selectedSnapshot.day ? `Dzień diety: ${selectedSnapshot.day.numerDnia} (${selectedSnapshot.day.nazwa})` : "Brak przypisanego dnia diety"}</p>
            <p>Notatka: {selectedSnapshot.dayLog?.notatka ? "tak" : "brak"}</p>
            <p>Odstępstwa: {selectedSnapshot.dayLog?.logiOdstepstw?.length ?? 0}</p>
            <p>Waga: {typeof selectedSnapshot.dayLog?.wagaKg === "number" ? `${selectedSnapshot.dayLog.wagaKg} kg` : "brak"}</p>
            {selectedSnapshot.day ? <Link className="btn" to={`/dieta/${selectedSnapshot.day.id}?data=${selectedSnapshot.date}`}>Przejdź do szczegółów dnia</Link> : null}
          </>
        ) : (
          <div className="empty-state">Brak danych dla wybranej daty.</div>
        )}
      </section>

      <section className="card">
        <h3>Podsumowanie tygodnia</h3>
        <div className="quick-day-actions">
          <button className="btn btn-small" onClick={() => setWeekAnchorDate((prev) => toIsoLocal(addDays(fromIsoLocal(prev), -7)))}>
            Poprzedni tydzień
          </button>
          <button className="btn btn-small" onClick={() => setWeekAnchorDate((prev) => toIsoLocal(addDays(fromIsoLocal(prev), 7)))}>
            Następny tydzień
          </button>
          <button className="btn btn-small" onClick={() => setWeekAnchorDate(toISODate())}>
            Bieżący tydzień
          </button>
          <button className="btn btn-small" onClick={() => setWeekAnchorDate(selectedDate)}>
            Tydzień wybranej daty
          </button>
        </div>
        <label className="field">
          Data w tygodniu (zakres liczy się automatycznie pon-niedz)
          <input type="date" value={weekAnchorDate} onChange={(e) => setWeekAnchorDate(e.target.value)} />
        </label>
        <p>Zakres: {weekSummary.from} - {weekSummary.to}</p>
        <p>Zrealizowane dni: {weekSummary.zrealizowane}</p>
        <p>Odstępstwa: {weekSummary.odstepstwa}</p>
        <p>W trakcie: {weekSummary.wTrakcie}</p>
        <p>Brak danych: {weekSummary.brakDanych}</p>
        <p>Średni postęp dnia: {weekSummary.sredniPostep}%</p>
        <p>Średnia kaloryczność planu: {weekSummary.sredniaKalorycznoscPlanu} kcal</p>
        <p>Zrealizowane posiłki: {weekSummary.posilkiZjedzone}/{weekSummary.posilkiPlan}</p>
        <div className="week-strip">
          {Array.from({ length: 7 }, (_, idx) => {
            const iso = toIsoLocal(addDays(fromIsoLocal(weekSummary.from), idx));
            const snap = weekRangeSnapshots.find((s) => s.date === iso);
            return <span key={iso} className={`week-dot status-${snap?.status ?? "brak_danych"}`} />;
          })}
        </div>
      </section>

      <section className="card">
        <h3>Statystyki realizacji</h3>
        <p>Dni zapisane: {globalStats.dniZapisane}</p>
        <p>Dni zgodne z planem: {globalStats.dniZgodneZPlanem}</p>
        <p>Dni odstępstw: {globalStats.dniOdstepstw}</p>
        <p>Procent realizacji: {globalStats.procentRealizacji}%</p>
      </section>
    </div>
  );
}
