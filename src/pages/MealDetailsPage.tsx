import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { getMealLogsByDate, setMealStatus } from "../db/repository";
import { useApp } from "../context/AppContext";
import { toISODate } from "../lib/date";
import { useSelectedDate } from "../lib/dateRoute";
import { RealizacjaPosilkuRecord } from "../types";

export function MealDetailsPage() {
  const { dayId, mealId } = useParams();
  const { dieta } = useApp();
  const selectedDate = useSelectedDate(toISODate());
  const [log, setLog] = useState<RealizacjaPosilkuRecord | undefined>();
  const [noteDraft, setNoteDraft] = useState("");

  const day = useMemo(() => dieta.find((d) => d.id === dayId), [dieta, dayId]);
  const meal = useMemo(() => day?.posilki.find((m) => m.id === mealId), [day, mealId]);

  const load = async () => {
    if (!day || !meal) return;
    const logs = await getMealLogsByDate(selectedDate);
    const current = logs.find((entry) => entry.posilekId === meal.id && (entry.dzienDietyId === day.id || !entry.dzienDietyId));
    setLog(current);
    setNoteDraft(current?.notatka ?? "");
  };

  useEffect(() => {
    load().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [day?.id, meal?.id, selectedDate]);

  if (!day || !meal) return <p className="empty">Nie znaleziono posiłku.</p>;

  const prepared = !!log?.przygotowany;
  const eaten = !!log?.zjedzony;

  const togglePrepared = async () => {
    await setMealStatus(selectedDate, day.id, day.numerDnia, meal.id, { przygotowany: !prepared });
    await load();
  };

  const toggleEaten = async () => {
    await setMealStatus(selectedDate, day.id, day.numerDnia, meal.id, { zjedzony: !eaten, przygotowany: !eaten ? true : undefined });
    await load();
  };

  const saveNote = async () => {
    await setMealStatus(selectedDate, day.id, day.numerDnia, meal.id, { notatka: noteDraft });
    await load();
  };

  return (
    <div className="stack">
      <section className="card">
        <p className="tag">Data realizacji: {selectedDate}</p>
        <h2>{meal.nazwa}</h2>
        <p>
          {meal.makro.kcal} kcal | B: {meal.makro.bialko} g | T: {meal.makro.tluszcz} g | W: {meal.makro.weglowodany} g
        </p>
        {meal.etykietaPorcji && <p className="badge">{meal.etykietaPorcji}</p>}
        {meal.partia && <p className="badge">{meal.partia.opis}</p>}

        <div className="toggle-row">
          <button className={prepared ? "btn btn-success" : "btn"} onClick={togglePrepared}>
            {prepared ? "Przygotowany" : "Oznacz przygotowany"}
          </button>
          <button className={eaten ? "btn btn-success" : "btn"} onClick={toggleEaten}>
            {eaten ? "Zjedzony" : "Oznacz zjedzony"}
          </button>
        </div>
      </section>

      <section className="card">
        <h3>Składniki</h3>
        <ul className="list">
          {meal.skladniki.map((item, idx) => (
            <li key={`${item.nazwa}-${idx}`} className="list-item">
              {item.nazwa} - {item.ilosc} {item.jednostka}
              {item.notatka ? ` (${item.notatka})` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="card">
        <h3>Przygotowanie</h3>
        <ol className="list ordered">
          {meal.przygotowanie.map((step, idx) => (
            <li key={step + idx} className="list-item">{step}</li>
          ))}
        </ol>
      </section>

      <section className="card">
        <h3>Notatka do posiłku</h3>
        <textarea rows={3} value={noteDraft} onChange={(e) => setNoteDraft(e.target.value)} placeholder="Np. dodać więcej przypraw" />
        <button className="btn btn-primary" onClick={saveNote}>Zapisz notatkę</button>
      </section>
    </div>
  );
}
