import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  addInventoryAmount,
  addDeviationLog,
  getDayLog,
  getInventoryItems,
  getMealLogsByDate,
  getShoppingManualItems,
  getShoppingStates,
  removeDeviationLog,
  setMealPreparedWithInventory,
  setInventoryAmount,
  saveDayNote,
  saveDayWeight,
  setDayDeviationFlag,
  setMealStatus,
  setShoppingState
} from "../db/repository";
import { useApp } from "../context/AppContext";
import { formatDatePL, toISODate } from "../lib/date";
import { useSelectedDate } from "../lib/dateRoute";
import { aggregateShoppingItems, buildShoppingListKey } from "../lib/shoppingAggregator";
import { calculatePostepDnia, getAutoStatusDnia, getDayForDate, statusDniaLabel } from "../lib/execution";
import { runPrepareMealFlow } from "../lib/mealPreparationFlow";
import { DzienRealizacjiRecord, RealizacjaPosilkuRecord, TypOdstepstwa } from "../types";

const ODSTEPSTWA: { typ: TypOdstepstwa; label: string }[] = [
  { typ: "zjadlem_cos_dodatkowo", label: "Zjadłem coś dodatkowo" },
  { typ: "nie_zjadlem_jednego_posilku", label: "Nie zjadłem jednego posiłku" },
  { typ: "zamienilem_posilek", label: "Zamieniłem posiłek" },
  { typ: "dzien_poza_planem", label: "Dzień poza planem" }
];

export function DayDetailsPage() {
  const { dayId } = useParams();
  const { dieta, settings } = useApp();
  const selectedDate = useSelectedDate(toISODate());

  const [mealLogs, setMealLogs] = useState<RealizacjaPosilkuRecord[]>([]);
  const [dayLog, setDayLog] = useState<DzienRealizacjiRecord | undefined>();
  const [noteDraft, setNoteDraft] = useState("");
  const [weightDraft, setWeightDraft] = useState<string>("");
  const [deviationText, setDeviationText] = useState("");
  const [deviationType, setDeviationType] = useState<TypOdstepstwa>("zamienilem_posilek");
  const [shoppingItems, setShoppingItems] = useState<Array<ReturnType<typeof aggregateShoppingItems>[number]>>([]);
  const [actionInfo, setActionInfo] = useState("");

  const day = dieta.find((d) => d.id === dayId);
  const resolvedDay = settings && !day ? getDayForDate(dieta, settings, selectedDate) : day;

  const listKey = useMemo(() => (resolvedDay ? buildShoppingListKey({ mode: "dzien", dayIds: [resolvedDay.id] }) : ""), [resolvedDay]);

  const load = async () => {
    if (!resolvedDay) return;

    const [logs, currentDayLog, shoppingStates, inventoryItems, manualRows] = await Promise.all([
      getMealLogsByDate(selectedDate),
      getDayLog(selectedDate),
      getShoppingStates(listKey),
      getInventoryItems(),
      getShoppingManualItems(listKey)
    ]);

    setMealLogs(logs.filter((entry) => entry.dzienDietyId === resolvedDay.id || !entry.dzienDietyId));
    setDayLog(currentDayLog);
    setNoteDraft(currentDayLog?.notatka ?? "");
    setWeightDraft(typeof currentDayLog?.wagaKg === "number" ? String(currentDayLog.wagaKg) : "");
    setShoppingItems(aggregateShoppingItems([resolvedDay], listKey, shoppingStates, manualRows, inventoryItems));
  };

  useEffect(() => {
    load().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resolvedDay?.id, selectedDate, listKey]);

  if (!resolvedDay) return <p className="empty">Nie znaleziono dnia diety.</p>;

  const status = getAutoStatusDnia(resolvedDay, mealLogs, dayLog);
  const postep = calculatePostepDnia(resolvedDay, mealLogs);

  const togglePrepared = async (mealId: string, current: boolean) => {
    const meal = resolvedDay.posilki.find((it) => it.id === mealId);
    if (!meal) return;
    if (!current) {
      const result = await runPrepareMealFlow(selectedDate, resolvedDay, meal);
      if (result.inventoryDeductionInfo) setActionInfo(result.inventoryDeductionInfo);
    } else {
      const log = mealLogs.find((entry) => entry.posilekId === mealId);
      await setMealPreparedWithInventory(selectedDate, resolvedDay, meal, false);
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
      await setMealStatus(selectedDate, resolvedDay.id, resolvedDay.numerDnia, mealId, { zjedzony: !current });
      await load();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Nie udało się zaktualizować statusu posiłku.";
      setActionInfo(message);
    }
  };

  const saveNote = async () => {
    await saveDayNote(selectedDate, resolvedDay.id, resolvedDay.numerDnia, noteDraft);
    await load();
  };

  const toggleDeviation = async () => {
    await setDayDeviationFlag(selectedDate, resolvedDay.id, resolvedDay.numerDnia, status !== "odstepstwo");
    await load();
  };

  const addDeviation = async () => {
    await addDeviationLog(selectedDate, resolvedDay.id, resolvedDay.numerDnia, deviationType, deviationText);
    setDeviationText("");
    await load();
  };

  const saveWeight = async () => {
    const parsed = weightDraft.trim() ? Number(weightDraft) : undefined;
    await saveDayWeight(selectedDate, resolvedDay.id, resolvedDay.numerDnia, Number.isFinite(parsed as number) ? parsed : undefined);
    await load();
  };

  const toggleShoppingBought = async (item: (typeof shoppingItems)[number]) => {
    if (!item.kupione) {
      await addInventoryAmount(item.productKey, item.jednostka, item.ilosc, item.nazwa);
      await setShoppingState(listKey, item.itemKey, { kupione: true });
    } else {
      await setShoppingState(listKey, item.itemKey, { kupione: false });
    }
    await load();
  };

  const markShoppingHave = async (item: (typeof shoppingItems)[number]) => {
    await setInventoryAmount(item.productKey, item.jednostka, Math.max(item.ilosc, item.iloscWMagazynie), item.nazwa);
    await load();
  };

  return (
    <div className="stack">
      <section className="card">
        <p className="tag">Data: {formatDatePL(selectedDate)}</p>
        <h2>
          {resolvedDay.nazwa} ({resolvedDay.numerDnia}/7)
        </h2>
        <p>
          Plan: {resolvedDay.kalorie} kcal | B: {resolvedDay.makro.bialko} g | T: {resolvedDay.makro.tluszcz} g | W: {resolvedDay.makro.weglowodany} g
        </p>
        <p>Status dnia: {statusDniaLabel(status)}</p>
        <p>Waga: {typeof dayLog?.wagaKg === "number" ? `${dayLog.wagaKg} kg` : "brak wpisu"}</p>
        <p>
          Postęp: {postep.procent}% ({postep.zjedzone}/{postep.liczbaPosilkow} posiłków)
        </p>
        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${postep.procent}%` }} />
        </div>
        <button className={status === "odstepstwo" ? "btn btn-success" : "btn"} onClick={toggleDeviation}>
          {status === "odstepstwo" ? "Cofnij odstępstwo" : "Oznacz dzień jako odstępstwo"}
        </button>
      </section>

      {actionInfo ? (
        <section className="card">
          <p>{actionInfo}</p>
        </section>
      ) : null}

      <section className="card">
        <h3>Posiłki</h3>
        <ul className="list">
          {resolvedDay.posilki.map((meal) => {
            const log = mealLogs.find((it) => it.posilekId === meal.id);
            const prepared = !!log?.przygotowany;
            const eaten = !!log?.zjedzony;

            return (
              <li key={meal.id} className="list-item">
                <Link to={`/dieta/${resolvedDay.id}/posilek/${meal.id}?data=${selectedDate}`} className="item-main-link">
                  <strong>{meal.nazwa}</strong>
                  <span>{meal.makro.kcal} kcal</span>
                </Link>
                {meal.partia && meal.partia.indeksPorcji === 1 && <p className="badge">Przygotuj 2 porcje</p>}
                {meal.partia && meal.partia.indeksPorcji === 2 && <p className="badge">To porcja z wcześniejszego przygotowania</p>}
                {meal.partia?.indeksPorcji === 2 && mealLogs.find((it) => it.posilekId === `${resolvedDay.id}-m2`)?.przygotowany && (
                  <p className="badge">Posiłek II jest przygotowany - ta porcja jest gotowa</p>
                )}
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
                    {eaten ? "Zjedzony" : "Zjedzono"}
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
        <h3>Zakupy dla dnia</h3>
        <p>Brakujące: {shoppingItems.filter((item) => item.brakuje).length}</p>
        <ul className="list">
          {shoppingItems.map((item) => (
            <li key={item.itemKey} className={item.brakuje ? "list-item shopping-missing" : "list-item"}>
              <div className="item-head">
                <strong>{item.nazwa}</strong>
                <span>
                  Brakuje: {item.brakujacaIlosc} {item.jednostka}
                </span>
              </div>
              <p>Potrzeba: {item.ilosc} {item.jednostka}</p>
              <p>W magazynie: {item.iloscWMagazynie} {item.jednostka}</p>
              <div className="toggle-row">
                <button className={item.kupione ? "btn btn-small btn-success" : "btn btn-small"} onClick={() => toggleShoppingBought(item)}>
                  {item.kupione ? "Kupione" : "Kupione + do magazynu"}
                </button>
                <button className={item.mamWDomu ? "btn btn-small btn-success" : "btn btn-small"} onClick={() => markShoppingHave(item)}>
                  {item.mamWDomu ? "Masz w magazynie" : "Ustaw jako mam"}
                </button>
              </div>
            </li>
          ))}
        </ul>
        <Link className="btn" to={`/zakupy?scope=dzien&dayId=${resolvedDay.id}&filter=tylko_brakujace`}>Pełna sekcja zakupów</Link>
      </section>

      <section className="card">
        <h3>Waga dnia</h3>
        <div className="grid grid-2">
          <label className="field">
            Waga (kg)
            <input type="number" step="0.1" value={weightDraft} onChange={(e) => setWeightDraft(e.target.value)} placeholder="np. 81.4" />
          </label>
          <button className="btn btn-primary" onClick={saveWeight}>
            Zapisz wagę
          </button>
        </div>
      </section>

      <section className="card">
        <h3>Notatka do dnia</h3>
        <textarea value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} rows={3} placeholder="Np. zamiana godzin posiłków" />
        <button className="btn btn-primary" onClick={saveNote}>Zapisz notatkę</button>
      </section>

      <section className="card">
        <h3>Log odstępstw</h3>
        <label className="field">
          Typ
          <select value={deviationType} onChange={(e) => setDeviationType(e.target.value as TypOdstepstwa)}>
            {ODSTEPSTWA.map((item) => (
              <option key={item.typ} value={item.typ}>{item.label}</option>
            ))}
            <option value="inne">Inne</option>
          </select>
        </label>
        <textarea value={deviationText} onChange={(e) => setDeviationText(e.target.value)} placeholder="Krótki opis odstępstwa" rows={2} />
        <button className="btn" onClick={addDeviation}>Dodaj wpis</button>

        <ul className="list">
          {(dayLog?.logiOdstepstw ?? []).map((log) => (
            <li key={log.id} className="list-item list-row">
              <div>
                <strong>{new Date(log.createdAt).toLocaleString("pl-PL")}</strong>
                <p>{log.tekst}</p>
              </div>
              <button className="btn btn-small" onClick={() => removeDeviationLog(selectedDate, log.id).then(load)}>Usuń</button>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
