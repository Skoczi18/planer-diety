import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  getDayLog,
  getInventoryItems,
  getMealLogsByDate,
  getShoppingManualItems,
  getShoppingStates,
  saveDayNote,
  saveDayWeight,
  setDayDeviationFlag,
  setMealStatus
} from "../db/repository";
import { useApp } from "../context/AppContext";
import { toISODate } from "../lib/date";
import { aggregateShoppingItems, buildShoppingListKey, ShoppingSelection } from "../lib/shoppingAggregator";
import { calculatePostepDnia, getAutoStatusDnia, getDayForDate, getKomentarzPostepu, statusDniaLabel } from "../lib/execution";
import { runPrepareMealFlow } from "../lib/mealPreparationFlow";
import { DzienRealizacjiRecord, RealizacjaPosilkuRecord } from "../types";

export function TodayPage() {
  const { dieta, settings, ready } = useApp();
  const today = toISODate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mealLogs, setMealLogs] = useState<RealizacjaPosilkuRecord[]>([]);
  const [dayLog, setDayLog] = useState<DzienRealizacjiRecord | undefined>();
  const [missingItems, setMissingItems] = useState<string[]>([]);
  const [missingCount, setMissingCount] = useState(0);
  const [noteDraft, setNoteDraft] = useState("");
  const [weightDraft, setWeightDraft] = useState("");
  const [actionInfo, setActionInfo] = useState("");

  const day = useMemo(() => {
    if (!settings) return undefined;
    return getDayForDate(dieta, settings, today);
  }, [dieta, settings, today]);

  const shoppingSelection: ShoppingSelection | undefined = useMemo(() => {
    if (!day) return undefined;
    return { mode: "dzien", dayIds: [day.id] };
  }, [day]);

  const listKey = useMemo(() => {
    if (!shoppingSelection) return "";
    return buildShoppingListKey(shoppingSelection);
  }, [shoppingSelection]);

  const load = async () => {
    if (!day || !shoppingSelection) {
      console.info("[Today] skip load - brak day/selection");
      setLoading(false);
      return;
    }

    setLoading(true);
    setError("");
    console.info("[Today] load start", { date: today, dayId: day.id, listKey });
    try {
      const [logs, currentDayLog, shoppingStates, inventoryResult, manualRows] = await Promise.all([
        getMealLogsByDate(today),
        getDayLog(today),
        getShoppingStates(listKey),
        getInventoryItems()
          .then((rows) => ({ ok: true as const, rows }))
          .catch((err) => {
            console.error("[Today] inventory load failed, fallback []", err);
            return { ok: false as const, rows: [] };
          }),
        getShoppingManualItems(listKey)
      ]);
      console.info("[Today] load core success", {
        mealLogs: logs.length,
        hasDayLog: !!currentDayLog,
        shoppingStates: shoppingStates.length,
        inventory: inventoryResult.rows.length,
        inventoryOk: inventoryResult.ok
      });

      setMealLogs(logs.filter((it) => it.dzienDietyId === day.id || !it.dzienDietyId));
      setDayLog(currentDayLog);
      setNoteDraft(currentDayLog?.notatka ?? "");
      setWeightDraft(typeof currentDayLog?.wagaKg === "number" ? String(currentDayLog.wagaKg) : "");

      const aggregated = aggregateShoppingItems([day], listKey, shoppingStates, manualRows, inventoryResult.rows);
      const missing = aggregated.filter((item) => item.brakuje);

      setMissingCount(missing.length);
      setMissingItems(missing.slice(0, 5).map((item) => `${item.nazwa} (brakuje ${item.brakujacaIlosc} ${item.jednostka})`));
      console.info("[Today] load done", { missing: missing.length });
    } catch (err) {
      console.error(err);
      setError("Nie udało się wczytać danych dnia. Odśwież aplikację.");
    } finally {
      setLoading(false);
      console.info("[Today] loading=false");
    }
  };

  useEffect(() => {
    load().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day?.id, today, listKey]);

  if (!ready || loading) return <p className="empty">Ładowanie dnia...</p>;
  if (error) return <p className="empty">{error}</p>;
  if (!settings || !day) return <p className="empty">Brak danych dla dnia.</p>;

  const postep = calculatePostepDnia(day, mealLogs);
  const status = getAutoStatusDnia(day, mealLogs, dayLog);
  const komentarz = getKomentarzPostepu(postep.procent);
  const completedDay = postep.procent >= 100;

  const togglePrepared = async (mealId: string, current: boolean) => {
    const meal = day.posilki.find((it) => it.id === mealId);
    if (!meal) return;

    if (!current) {
      const result = await runPrepareMealFlow(today, day, meal);
      if (result.inventoryDeductionInfo) setActionInfo(result.inventoryDeductionInfo);
    } else {
      const log = mealLogs.find((entry) => entry.posilekId === mealId);
      await setMealStatus(today, day.id, day.numerDnia, mealId, { przygotowany: false });
      if (log?.inventoryDeducted) {
        setActionInfo("Składniki zostały już odjęte wcześniej i nie są automatycznie przywracane.");
      }
    }
    await load();
  };

  const toggleEaten = async (mealId: string, current: boolean) => {
    const log = mealLogs.find((entry) => entry.posilekId === mealId);
    if (!current && !log?.przygotowany) {
      setActionInfo("Najpierw oznacz posiłek jako przygotowany. Bez przygotowania nie można oznaczyć go jako zjedzony.");
      return;
    }
    try {
      await setMealStatus(today, day.id, day.numerDnia, mealId, { zjedzony: !current });
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nie udało się zaktualizować statusu posiłku.";
      setActionInfo(message);
    }
  };

  const saveNote = async () => {
    await saveDayNote(today, day.id, day.numerDnia, noteDraft);
    await load();
  };

  const toggleDeviation = async () => {
    await setDayDeviationFlag(today, day.id, day.numerDnia, status !== "odstepstwo");
    await load();
  };

  const saveWeight = async () => {
    const parsed = weightDraft.trim() ? Number(weightDraft) : undefined;
    await saveDayWeight(today, day.id, day.numerDnia, Number.isFinite(parsed as number) ? parsed : undefined);
    await load();
  };

  return (
    <div className="stack">
      <section className="card hero-card">
        <p className="tag">Dziś: {day.nazwa} ({day.numerDnia}/7)</p>
        <h2>{komentarz}</h2>
        <p>
          Plan dnia: {day.kalorie} kcal | B {day.makro.bialko} g | T {day.makro.tluszcz} g | W {day.makro.weglowodany} g
        </p>

        <div className="summary-grid">
          <div className="summary-pill">
            <span>Status</span>
            <strong>{statusDniaLabel(status)}</strong>
          </div>
          <div className="summary-pill">
            <span>Postęp</span>
            <strong>{postep.procent}%</strong>
          </div>
          <div className="summary-pill">
            <span>Braki zakupów</span>
            <strong>{missingCount}</strong>
          </div>
          <div className="summary-pill">
            <span>Waga</span>
            <strong>{typeof dayLog?.wagaKg === "number" ? `${dayLog.wagaKg} kg` : "brak"}</strong>
          </div>
        </div>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${postep.procent}%` }} />
        </div>

        <div className="grid grid-2">
          <Link className="btn" to={`/dieta/${day.id}?data=${today}`}>Szczegóły dnia</Link>
          <Link className="btn" to={`/zakupy?scope=dzien&dayId=${day.id}&filter=tylko_brakujace`}>Zakupy na dziś</Link>
        </div>
      </section>

      {actionInfo ? <section className="card"><p>{actionInfo}</p></section> : null}

      {completedDay && <section className="success-state">Plan dnia zrealizowany. Świetna robota.</section>}

      <section className="card">
        <h3>Posiłki na dziś</h3>
        <ul className="list">
          {day.posilki.map((meal) => {
            const log = mealLogs.find((entry) => entry.posilekId === meal.id);
            const prepared = !!log?.przygotowany;
            const eaten = !!log?.zjedzony;

            return (
              <li key={meal.id} className="list-item">
                <Link to={`/dieta/${day.id}/posilek/${meal.id}?data=${today}`} className="item-main-link">
                  <strong>{meal.nazwa}</strong>
                  <span>{meal.makro.kcal} kcal</span>
                </Link>
                <div className="toggle-row">
                  <button className={prepared ? "btn btn-small btn-success" : "btn btn-small"} onClick={() => togglePrepared(meal.id, prepared)}>
                    {prepared ? "Przygotowany" : "Przygotuj"}
                  </button>
                  <button
                    className={eaten ? "btn btn-small btn-success" : "btn btn-small"}
                    onClick={() => toggleEaten(meal.id, eaten)}
                    disabled={!prepared && !eaten}
                    title={!prepared && !eaten ? "Najpierw oznacz posiłek jako przygotowany." : undefined}
                  >
                    {eaten ? "Zjedzony" : "Oznacz zjedzony"}
                  </button>
                </div>
                {log?.inventoryDeducted ? <p className="muted-line">Składniki odjęte z magazynu.</p> : null}
                {log?.inventoryDeductionInfo ? <p className="muted-line">{log.inventoryDeductionInfo}</p> : null}
              </li>
            );
          })}
        </ul>
      </section>

      <section className="card">
        <h3>Do przygotowania</h3>
        <ul className="list">
          {day.posilki
            .filter((meal) => !meal.partia || meal.partia.indeksPorcji === 1)
            .map((meal) => (
              <li key={meal.id} className="list-item">
                <strong>{meal.nazwa}</strong>
                <p>{meal.przygotowanie[0]}</p>
              </li>
            ))}
        </ul>
      </section>

      <section className="card">
        <h3>Czego brakuje w zakupach na dziś</h3>
        {missingCount > 0 ? (
          <ul className="list">
            {missingItems.map((item) => (
              <li key={item} className="list-item">{item}</li>
            ))}
          </ul>
        ) : (
          <div className="success-state">Zakupy na dziś są kompletne.</div>
        )}
      </section>

      <section className="card">
        <h3>Notatka dnia</h3>
        <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Krótki komentarz o dniu" rows={3} />
        <button className="btn btn-primary" onClick={saveNote}>Zapisz notatkę</button>
      </section>
    </div>
  );
}
