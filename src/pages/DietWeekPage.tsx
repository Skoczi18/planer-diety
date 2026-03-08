import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { getAllDayLogs, getAllMealLogs } from "../db/repository";
import { toISODate } from "../lib/date";
import { calculatePostepDnia, getAutoStatusDnia, getDayForDate, statusDniaLabel } from "../lib/execution";
import { DzienRealizacjiRecord, RealizacjaPosilkuRecord } from "../types";

export function DietWeekPage() {
  const { dieta, settings } = useApp();
  const [dayLogs, setDayLogs] = useState<DzienRealizacjiRecord[]>([]);
  const [mealLogs, setMealLogs] = useState<RealizacjaPosilkuRecord[]>([]);

  useEffect(() => {
    Promise.all([getAllDayLogs(), getAllMealLogs()]).then(([dLogs, mLogs]) => {
      setDayLogs(dLogs);
      setMealLogs(mLogs);
    });
  }, []);

  const today = toISODate();
  const currentDay = useMemo(() => {
    if (!settings) return undefined;
    return getDayForDate(dieta, settings, today);
  }, [dieta, settings, today]);

  return (
    <div className="stack">
      {dieta.map((day) => {
        const latestLog = [...dayLogs].reverse().find((log) => log.dzienDietyId === day.id);
        const logsForDate = latestLog
          ? mealLogs.filter((entry) => entry.data === latestLog.data && (entry.dzienDietyId === day.id || !entry.dzienDietyId))
          : [];
        const status = getAutoStatusDnia(day, logsForDate, latestLog);
        const postep = calculatePostepDnia(day, logsForDate);

        return (
          <Link
            key={day.id}
            to={`/dieta/${day.id}${latestLog?.data ? `?data=${latestLog.data}` : ""}`}
            className={`card card-link ${currentDay?.id === day.id ? "card-today" : ""}`}
          >
            <h3>
              {day.nazwa} {currentDay?.id === day.id ? "• Dzisiaj" : ""}
            </h3>
            <p>{day.kalorie} kcal (ok.)</p>
            <p>
              B: {day.makro.bialko} g | T: {day.makro.tluszcz} g | W: {day.makro.weglowodany} g
            </p>
            <p>Status: {statusDniaLabel(status)}</p>
            <p>Postęp: {postep.procent}%</p>
            <p>{latestLog?.notatka ? "Notatka: tak" : "Notatka: brak"}</p>
          </Link>
        );
      })}
    </div>
  );
}
