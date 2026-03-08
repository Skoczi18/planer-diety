import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
  getPantryItems,
  getShoppingManualItems,
  getShoppingStates,
  markShoppingItemRemoved,
  setPantryItem,
  setShoppingState,
  upsertShoppingManualItem
} from "../db/repository";
import {
  aggregateShoppingItems,
  buildSelectedDaysKey,
  buildShoppingListKey,
  countMissing,
  filterShoppingItems,
  groupShoppingItems,
  normalizeSelectionDayIds,
  resolveSelectedDays,
  ShoppingSelection
} from "../lib/shoppingAggregator";
import { toISODate } from "../lib/date";
import { getDayForDate } from "../lib/execution";
import { normalizeProductName } from "../lib/shoppingNormalize";
import { ShoppingFilter, ShoppingManualItemRecord, ShoppingMode, SpizarniaItemRecord, StanZakupuRecord } from "../types";

const FILTERS: Array<{ value: ShoppingFilter; label: string }> = [
  { value: "wszystko", label: "Wszystko" },
  { value: "ukryj_kupione", label: "Ukryj kupione" },
  { value: "ukryj_mam", label: "Ukryj mam" },
  { value: "tylko_brakujace", label: "Tylko braki" },
  { value: "tylko_nieodhaczone", label: "Nieodhaczone" }
];

export function ShoppingPage() {
  const { dieta, settings } = useApp();
  const [searchParams] = useSearchParams();

  const [mode, setMode] = useState<ShoppingMode>((searchParams.get("scope") as ShoppingMode) || "dzien");
  const [selectedDay, setSelectedDay] = useState<string>(searchParams.get("dayId") || "d1");
  const [multiDays, setMultiDays] = useState<string[]>(normalizeSelectionDayIds(searchParams.get("days")?.split(",").filter(Boolean) || []));
  const [filter, setFilter] = useState<ShoppingFilter>((searchParams.get("filter") as ShoppingFilter) || "wszystko");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [states, setStates] = useState<StanZakupuRecord[]>([]);
  const [pantry, setPantry] = useState<SpizarniaItemRecord[]>([]);
  const [manualItems, setManualItems] = useState<ShoppingManualItemRecord[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const [customName, setCustomName] = useState("");
  const [customQty, setCustomQty] = useState<number>(1);
  const [customUnit, setCustomUnit] = useState("szt.");
  const [customNote, setCustomNote] = useState("");

  const [editKey, setEditKey] = useState<string>("");
  const [editName, setEditName] = useState("");
  const [editQty, setEditQty] = useState<number>(0);
  const [editUnit, setEditUnit] = useState("g");
  const [editNote, setEditNote] = useState("");

  useEffect(() => {
    if (!dieta.length) return;
    if (dieta.find((d) => d.id === selectedDay)) return;
    setSelectedDay(dieta[0].id);
  }, [dieta, selectedDay]);

  const selection: ShoppingSelection = useMemo(() => {
    if (mode === "tydzien") return { mode, dayIds: dieta.map((d) => d.id) };
    if (mode === "dzien") return { mode, dayIds: [selectedDay] };
    return { mode, dayIds: normalizeSelectionDayIds(multiDays) };
  }, [mode, dieta, selectedDay, multiDays]);

  const selectedDays = useMemo(() => resolveSelectedDays(dieta, selection), [dieta, selection]);
  const listKey = useMemo(() => buildShoppingListKey(selection), [selection]);
  const selectedDayNumbers = useMemo(
    () => selectedDays.map((day) => day.numerDnia).sort((a, b) => a - b),
    [selectedDays]
  );
  const selectedDaysLabel = useMemo(() => {
    if (!selectedDayNumbers.length) return "Brak";
    return selectedDayNumbers.map((num) => `Dzień ${num}`).join(", ");
  }, [selectedDayNumbers]);
  const multiSelectionKey = useMemo(() => buildSelectedDaysKey(multiDays), [multiDays]);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const [shoppingStates, pantryItems, customRows] = await Promise.all([
        getShoppingStates(listKey),
        getPantryItems(),
        getShoppingManualItems(listKey)
      ]);
      setStates(shoppingStates);
      setPantry(pantryItems);
      setManualItems(customRows);
    } catch (err) {
      console.error(err);
      setError("Nie udało się wczytać listy zakupów.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey]);

  const aggregated = useMemo(
    () => aggregateShoppingItems(selectedDays, listKey, states, pantry, manualItems),
    [selectedDays, listKey, states, pantry, manualItems]
  );

  const filtered = useMemo(() => filterShoppingItems(aggregated, filter), [aggregated, filter]);
  const grouped = useMemo(() => groupShoppingItems(filtered), [filtered]);
  const missingCount = useMemo(() => countMissing(aggregated), [aggregated]);
  const boughtCount = useMemo(() => aggregated.filter((item) => item.kupione || item.mamWDomu || item.wSpizarni).length, [aggregated]);
  const totalCount = aggregated.length;
  const progress = totalCount ? Math.round((boughtCount / totalCount) * 100) : 0;

  const toggleMultiDay = (dayId: string) => {
    setMultiDays((prev) => normalizeSelectionDayIds(prev.includes(dayId) ? prev.filter((id) => id !== dayId) : [...prev, dayId]));
  };

  const selectAllDays = () => setMultiDays(normalizeSelectionDayIds(dieta.map((day) => day.id)));
  const clearMultiDays = () => setMultiDays([]);
  const selectWeek = selectAllDays;
  const selectOnlyToday = () => {
    const today = toISODate();
    const mapped = settings ? getDayForDate(dieta, settings, today) : undefined;
    if (!mapped) return;
    if (mode === "dzien") {
      setSelectedDay(mapped.id);
      return;
    }
    if (mode !== "wiele") setMode("wiele");
    setMultiDays([mapped.id]);
  };

  const toggleState = async (productKey: string, field: "kupione" | "mamWDomu", current: boolean) => {
    await setShoppingState(listKey, productKey, { [field]: !current });
    await load();
  };

  const togglePantryForItem = async (productKey: string, label: string, current: boolean) => {
    await setPantryItem(productKey, label, !current);
    await load();
  };

  const addCustomItem = async () => {
    if (!customName.trim()) return;
    await upsertShoppingManualItem(listKey, {
      nazwa: customName,
      ilosc: customQty,
      jednostka: customUnit,
      notatka: customNote,
      typ: "custom"
    });
    setCustomName("");
    setCustomQty(1);
    setCustomUnit("szt.");
    setCustomNote("");
    await load();
  };

  const startEdit = (item: (typeof aggregated)[number]) => {
    setEditKey(item.itemKey);
    setEditName(item.nazwa);
    setEditQty(item.ilosc);
    setEditUnit(item.jednostka);
    setEditNote(item.notatka ?? "");
  };

  const saveEdit = async () => {
    if (!editKey || !editName.trim()) return;
    await upsertShoppingManualItem(listKey, {
      itemKey: editKey,
      nazwa: editName,
      ilosc: editQty,
      jednostka: editUnit,
      notatka: editNote,
      typ: "override"
    });
    setEditKey("");
    await load();
  };

  const removeFromList = async (itemKey: string, name: string) => {
    await markShoppingItemRemoved(listKey, itemKey, name);
    await load();
  };

  const pantryActive = pantry.filter((it) => it.aktywny);
  const noSelectedDaysInMultiMode = mode === "wiele" && selection.dayIds.length === 0;
  const showList = !noSelectedDaysInMultiMode;

  if (loading) return <p className="empty">Ładowanie zakupów...</p>;
  if (error) return <p className="empty">{error}</p>;

  return (
    <div className="stack shopping-page-flow">
      <section className="card shopping-header-card shopping-controls-card">
        <h3>Zakupy</h3>
        <div className="grid grid-3">
          <button className={mode === "dzien" ? "btn btn-primary" : "btn"} onClick={() => setMode("dzien")}>1 dzień</button>
          <button className={mode === "wiele" ? "btn btn-primary" : "btn"} onClick={() => setMode("wiele")}>Wiele dni</button>
          <button className={mode === "tydzien" ? "btn btn-primary" : "btn"} onClick={() => setMode("tydzien")}>Tydzień</button>
        </div>

        {mode === "dzien" && (
          <label className="field">
            Wybierz dzień
            <select value={selectedDay} onChange={(e) => setSelectedDay(e.target.value)}>
              {dieta.map((day) => (
                <option key={day.id} value={day.id}>{day.nazwa}</option>
              ))}
            </select>
          </label>
        )}

        {mode === "wiele" && (
          <>
            <div className="day-chip-list">
              {dieta.map((day) => {
                const active = multiDays.includes(day.id);
                return (
                  <button key={day.id} className={active ? "chip active" : "chip"} onClick={() => toggleMultiDay(day.id)}>
                    Dzień {day.numerDnia}
                  </button>
                );
              })}
            </div>
            <div className="quick-day-actions">
              <button className="btn btn-small" onClick={selectAllDays}>Zaznacz wszystko</button>
              <button className="btn btn-small" onClick={clearMultiDays}>Wyczyść wybór</button>
              <button className="btn btn-small" onClick={selectOnlyToday}>Wybierz tylko dzisiaj</button>
              <button className="btn btn-small" onClick={selectWeek}>Wybierz cały tydzień</button>
            </div>
            <p className="muted-line">Klucz listy: <strong>multi:{multiSelectionKey}</strong></p>
          </>
        )}

        {mode !== "wiele" && (
          <div className="quick-day-actions">
            <button className="btn btn-small" onClick={() => setMode("wiele")}>Przełącz na wiele dni</button>
            <button className="btn btn-small" onClick={selectOnlyToday}>Wybierz tylko dzisiaj</button>
          </div>
        )}

        <div className="selection-summary">
          <strong>Wybrano {selectedDays.length} {selectedDays.length === 1 ? "dzień" : "dni"}:</strong> {selectedDaysLabel}
        </div>

        <div className="summary-grid">
          <div className="summary-pill">
            <span>Pozycje</span>
            <strong>{totalCount}</strong>
          </div>
          <div className="summary-pill">
            <span>Braki</span>
            <strong>{missingCount}</strong>
          </div>
          <div className="summary-pill">
            <span>Załatwione</span>
            <strong>{boughtCount}</strong>
          </div>
          <div className="summary-pill">
            <span>Postęp</span>
            <strong>{progress}%</strong>
          </div>
        </div>

        <div className="progress-track">
          <div className="progress-fill" style={{ width: `${progress}%` }} />
        </div>

        <div className="filter-row shopping-filter-row">
          {FILTERS.map((entry) => (
            <button key={entry.value} className={filter === entry.value ? "chip active" : "chip"} onClick={() => setFilter(entry.value)}>
              {entry.label}
            </button>
          ))}
        </div>
      </section>

      {noSelectedDaysInMultiMode && (
        <section className="card">
          <div className="empty-state">Wybierz co najmniej jeden dzień, aby zobaczyć listę zakupów.</div>
        </section>
      )}

      {showList && missingCount === 0 && totalCount > 0 && <section className="success-state">Wszystkie zakupy dla tej listy są ogarnięte.</section>}

      {showList && (
      <section className="card">
        <h3>Brakuje teraz</h3>
        {missingCount > 0 ? (
          <ul className="list">
            {aggregated
              .filter((item) => item.brakuje)
              .slice(0, 8)
              .map((item) => (
                <li key={item.itemKey} className="list-item">
                  <strong>{item.nazwa}</strong>
                  <p>{item.ilosc} {item.jednostka}</p>
                  <p className="muted-line">Źródło: {item.sourceDayNumbers.map((n) => `D${n}`).join(", ") || "Ręcznie"}</p>
                </li>
              ))}
          </ul>
        ) : (
          <div className="empty-state">Brak brakujących pozycji.</div>
        )}
      </section>
      )}

      {showList && (filtered.length === 0 ? (
        <section className="card">
          <div className="empty-state">Ten filtr nic nie zwrócił. Zmień filtr lub zakres listy.</div>
        </section>
      ) : (
        grouped.map((group) => {
          const isCollapsed = !!collapsed[group.group];
          return (
            <section key={group.group} className="card">
              <button className="group-header" onClick={() => setCollapsed((prev) => ({ ...prev, [group.group]: !prev[group.group] }))}>
                <strong>{group.label}</strong>
                <span className="badge">{group.items.length}</span>
              </button>

              {!isCollapsed && (
                <ul className="list">
                  {group.items.map((item) => (
                    <li key={item.itemKey} className={item.brakuje ? "list-item shopping-missing" : "list-item"}>
                      <div className="item-head">
                        <strong>{item.nazwa}</strong>
                        <span>{item.ilosc} {item.jednostka}</span>
                      </div>
                      <p className="muted-line">Źródło: {item.sourceDayNumbers.map((n) => `D${n}`).join(", ") || "Ręcznie"}</p>
                      {item.notatka ? <p>{item.notatka}</p> : null}

                      <div className="toggle-row">
                        <button className={item.kupione ? "btn btn-small btn-success" : "btn btn-small"} onClick={() => toggleState(item.itemKey, "kupione", item.kupione)}>
                          Kupione
                        </button>
                        <button className={item.mamWDomu ? "btn btn-small btn-success" : "btn btn-small"} onClick={() => toggleState(item.itemKey, "mamWDomu", item.mamWDomu)}>
                          Mam
                        </button>
                      </div>

                      <div className="toggle-row">
                        <button className={item.wSpizarni ? "btn btn-small btn-success" : "btn btn-small"} onClick={() => togglePantryForItem(item.productKey, item.nazwa, item.wSpizarni)}>
                          {item.wSpizarni ? "W spiżarni" : "Do spiżarni"}
                        </button>
                        <button className="btn btn-small" onClick={() => startEdit(item)}>Edytuj</button>
                      </div>

                      <button className="btn btn-small" onClick={() => removeFromList(item.itemKey, item.nazwa)}>Usuń z tej listy</button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          );
        })
      ))}

      {showList && (
      <section className="card">
        <h3>Dodaj produkt ręcznie</h3>
        <label className="field">
          Nazwa
          <input value={customName} onChange={(e) => setCustomName(e.target.value)} placeholder="Np. Woda" />
        </label>
        <div className="grid grid-2">
          <label className="field">
            Ilość
            <input type="number" value={customQty} onChange={(e) => setCustomQty(Number(e.target.value))} />
          </label>
          <label className="field">
            Jednostka
            <select value={customUnit} onChange={(e) => setCustomUnit(e.target.value)}>
              <option value="g">g</option>
              <option value="ml">ml</option>
              <option value="szt.">szt.</option>
            </select>
          </label>
        </div>
        <label className="field">
          Notatka
          <input value={customNote} onChange={(e) => setCustomNote(e.target.value)} placeholder="Opcjonalnie" />
        </label>
        <button className="btn btn-primary" onClick={addCustomItem}>Dodaj do listy</button>
      </section>
      )}

      {showList && editKey && (
        <section className="card">
          <h3>Edycja pozycji</h3>
          <label className="field">
            Nazwa
            <input value={editName} onChange={(e) => setEditName(e.target.value)} />
          </label>
          <div className="grid grid-2">
            <label className="field">
              Ilość
              <input type="number" value={editQty} onChange={(e) => setEditQty(Number(e.target.value))} />
            </label>
            <label className="field">
              Jednostka
              <select value={editUnit} onChange={(e) => setEditUnit(e.target.value)}>
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="szt.">szt.</option>
              </select>
            </label>
          </div>
          <label className="field">
            Notatka
            <input value={editNote} onChange={(e) => setEditNote(e.target.value)} />
          </label>
          <div className="grid grid-2">
            <button className="btn btn-primary" onClick={saveEdit}>Zapisz</button>
            <button className="btn" onClick={() => setEditKey("")}>Anuluj</button>
          </div>
        </section>
      )}

      <section className="card">
        <h3>Spiżarnia</h3>
        <p>Produkty aktywne w spiżarni automatycznie nie są traktowane jako braki.</p>
        {pantryActive.length ? (
          <ul className="list">
            {pantryActive.map((item) => (
              <li key={item.id} className="list-item list-row">
                <strong>{item.label}</strong>
                <button className="btn btn-small" onClick={() => setPantryItem(item.productKey, item.label, false).then(load)}>
                  Usuń
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">Lista spiżarni jest pusta.</div>
        )}

        <label className="field">
          Dodaj do spiżarni
          <input
            placeholder="Np. Ocet"
            onKeyDown={(e) => {
              if (e.key !== "Enter") return;
              const value = (e.currentTarget.value || "").trim();
              if (!value) return;
              const normalized = normalizeProductName(value);
              setPantryItem(normalized.productKey, normalized.canonicalName, true)
                .then(load)
                .finally(() => {
                  e.currentTarget.value = "";
                });
            }}
          />
        </label>
      </section>
    </div>
  );
}
