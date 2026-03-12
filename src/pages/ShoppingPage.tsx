import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useApp } from "../context/AppContext";
import {
  addInventoryAmount,
  getInventoryItems,
  getShoppingManualItems,
  getShoppingStates,
  markShoppingItemRemoved,
  setInventoryAmount,
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
import { InventoryItemRecord, ShoppingFilter, ShoppingManualItemRecord, StanZakupuRecord } from "../types";

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

  const initialDays = useMemo(() => {
    const fromDaysParam = searchParams.get("days")?.split(",").filter(Boolean) || [];
    const fromDayParam = searchParams.get("dayId");
    const resolved = fromDaysParam.length ? fromDaysParam : fromDayParam ? [fromDayParam] : [];
    return normalizeSelectionDayIds(resolved);
  }, [searchParams]);
  const [multiDays, setMultiDays] = useState<string[]>(initialDays);
  const [filter, setFilter] = useState<ShoppingFilter>((searchParams.get("filter") as ShoppingFilter) || "wszystko");

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [states, setStates] = useState<StanZakupuRecord[]>([]);
  const [inventory, setInventory] = useState<InventoryItemRecord[]>([]);
  const [manualItems, setManualItems] = useState<ShoppingManualItemRecord[]>([]);
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  const [customName, setCustomName] = useState("");
  const [customQty, setCustomQty] = useState<number>(1);
  const [customUnit, setCustomUnit] = useState("szt.");
  const [customNote, setCustomNote] = useState("");
  const [buyingItem, setBuyingItem] = useState<(ReturnType<typeof aggregateShoppingItems>[number]) | null>(null);
  const [buyQty, setBuyQty] = useState<number>(0);
  const [buyError, setBuyError] = useState("");

  const selection: ShoppingSelection = useMemo(() => {
    return { mode: "wiele", dayIds: normalizeSelectionDayIds(multiDays) };
  }, [multiDays]);

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

  const load = async (options?: { silent?: boolean }) => {
    const silent = !!options?.silent;
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const [shoppingStates, inventoryResult, customRows] = await Promise.all([
        getShoppingStates(listKey),
        getInventoryItems()
          .then((rows) => ({ ok: true as const, rows }))
          .catch((err) => {
            console.error("[Shopping] inventory load failed, fallback []", err);
            return { ok: false as const, rows: [] };
          }),
        getShoppingManualItems(listKey)
      ]);
      setStates(shoppingStates);
      setInventory(inventoryResult.rows);
      setManualItems(customRows);
    } catch (err) {
      console.error(err);
      setError("Nie udało się wczytać listy zakupów.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listKey]);

  const aggregated = useMemo(
    () => aggregateShoppingItems(selectedDays, listKey, states, manualItems, inventory),
    [selectedDays, listKey, states, manualItems, inventory]
  );

  const filtered = useMemo(() => filterShoppingItems(aggregated, filter), [aggregated, filter]);
  const grouped = useMemo(() => groupShoppingItems(filtered), [filtered]);
  const missingCount = useMemo(() => countMissing(aggregated), [aggregated]);
  const boughtCount = useMemo(() => aggregated.filter((item) => !item.brakuje).length, [aggregated]);
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
    setMultiDays([mapped.id]);
  };

  const toggleBought = async (item: (typeof aggregated)[number]) => {
    if (item.kupione) {
      await setShoppingState(listKey, item.itemKey, { kupione: false });
      await load({ silent: true });
      return;
    }

    setBuyingItem(item);
    setBuyQty(item.ilosc);
    setBuyError("");
  };

  const closeBuyDialog = () => {
    setBuyingItem(null);
    setBuyQty(0);
    setBuyError("");
  };

  const submitBoughtAmount = async () => {
    if (!buyingItem) return;
    const isPieceUnit = buyingItem.jednostka === "szt.";
    const normalizedQty = isPieceUnit ? Math.trunc(buyQty) : buyQty;
    if (!Number.isFinite(normalizedQty) || normalizedQty <= 0) {
      setBuyError("Wpisz poprawną ilość większą od 0.");
      return;
    }
    if (isPieceUnit && !Number.isInteger(buyQty)) {
      setBuyError("Dla sztuk podaj liczbę całkowitą.");
      return;
    }

    await addInventoryAmount(buyingItem.productKey, buyingItem.jednostka, normalizedQty, buyingItem.nazwa);
    await setShoppingState(listKey, buyingItem.itemKey, { kupione: true });
    closeBuyDialog();
    await load({ silent: true });
  };

  const markAsHave = async (item: (typeof aggregated)[number]) => {
    if (item.mamWDomu) {
      await setShoppingState(listKey, item.itemKey, { mamWDomu: false });
      await load({ silent: true });
      return;
    }

    const targetAmount = Math.max(item.ilosc, item.iloscWMagazynie);
    await setInventoryAmount(item.productKey, item.jednostka, targetAmount, item.nazwa);
    await setShoppingState(listKey, item.itemKey, { mamWDomu: true });
    await load({ silent: true });
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
    await load({ silent: true });
  };

  const removeFromList = async (itemKey: string, name: string) => {
    await markShoppingItemRemoved(listKey, itemKey, name);
    await load({ silent: true });
  };

  const noSelectedDays = selection.dayIds.length === 0;
  const showList = !noSelectedDays;

  if (loading) return <p className="empty">Ładowanie zakupów...</p>;
  if (error) return <p className="empty">{error}</p>;

  return (
    <div className="stack shopping-page-flow">
      <section className="card shopping-header-card shopping-controls-card">
        <h3>Zakupy</h3>
        <div className="day-chip-list">
          {dieta.map((day) => {
            const active = multiDays.includes(day.id);
            return (
              <button type="button" key={day.id} className={active ? "chip active" : "chip"} onClick={() => toggleMultiDay(day.id)}>
                Dzień {day.numerDnia}
              </button>
            );
          })}
        </div>
        <div className="quick-day-actions">
          <button type="button" className="btn btn-small" onClick={selectAllDays}>Zaznacz wszystko</button>
          <button type="button" className="btn btn-small" onClick={clearMultiDays}>Wyczyść wybór</button>
          <button type="button" className="btn btn-small" onClick={selectOnlyToday}>Wybierz tylko dzisiaj</button>
          <button type="button" className="btn btn-small" onClick={selectWeek}>Wybierz cały tydzień</button>
        </div>
        <p className="muted-line">Klucz listy: <strong>multi:{multiSelectionKey}</strong></p>

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

        <Link className="btn" to="/magazyn">Otwórz magazyn</Link>

        <div className="filter-row shopping-filter-row">
          {FILTERS.map((entry) => (
            <button type="button" key={entry.value} className={filter === entry.value ? "chip active" : "chip"} onClick={() => setFilter(entry.value)}>
              {entry.label}
            </button>
          ))}
        </div>
      </section>

      {noSelectedDays && (
        <section className="card">
          <div className="empty-state">Wybierz co najmniej jeden dzień, aby zobaczyć listę zakupów.</div>
        </section>
      )}

      {showList && missingCount === 0 && totalCount > 0 && <section className="success-state">Wszystkie zakupy dla tej listy są ogarnięte.</section>}

      {showList && (filtered.length === 0 ? (
        <section className="card">
          <div className="empty-state">Ten filtr nic nie zwrócił. Zmień filtr lub zakres listy.</div>
        </section>
      ) : (
        grouped.map((group) => {
          const isCollapsed = !!collapsed[group.group];
          return (
            <section key={group.group} className="card">
              <button type="button" className="group-header" onClick={() => setCollapsed((prev) => ({ ...prev, [group.group]: !prev[group.group] }))}>
                <strong>{group.label}</strong>
                <span className="badge">{group.items.length}</span>
              </button>

              {!isCollapsed && (
                <ul className="list">
                  {group.items.map((item) => (
                    <li key={item.itemKey} className={item.brakuje ? "list-item shopping-missing" : "list-item"}>
                      <div className="item-head">
                        <strong>{item.nazwa}</strong>
                        <span>{item.brakujacaIlosc > 0 ? `Brakuje ${item.brakujacaIlosc} ${item.jednostka}` : "Komplet"}</span>
                      </div>
                      <p>Potrzeba: {item.ilosc} {item.jednostka}</p>
                      <p>W magazynie: {item.iloscWMagazynie} {item.jednostka}</p>
                      <p className="muted-line">Źródło: {item.sourceDayNumbers.map((n) => `D${n}`).join(", ") || "Ręcznie"}</p>
                      {item.notatka ? <p>{item.notatka}</p> : null}

                      <div className="toggle-row">
                        <button type="button" className={item.kupione ? "btn btn-small btn-success" : "btn btn-small"} onClick={() => toggleBought(item)}>
                          {item.kupione ? "Kupione" : "Kupione + do magazynu"}
                        </button>
                        <button type="button" className={item.mamWDomu ? "btn btn-small btn-success" : "btn btn-small"} onClick={() => markAsHave(item)}>
                          {item.mamWDomu ? "Masz w magazynie" : "Ustaw jako mam"}
                        </button>
                      </div>

                      <button type="button" className="btn btn-small" onClick={() => removeFromList(item.itemKey, item.nazwa)}>Usuń z tej listy</button>
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
        <button type="button" className="btn btn-primary" onClick={addCustomItem}>Dodaj do listy</button>
      </section>
      )}

      {buyingItem ? (
        <div className="modal-overlay" onClick={closeBuyDialog}>
          <section className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Oznacz jako kupione</h3>
            <p><strong>Produkt:</strong> {buyingItem.nazwa}</p>
            <p><strong>Potrzeba:</strong> {buyingItem.ilosc} {buyingItem.jednostka}</p>
            <p><strong>W magazynie:</strong> {buyingItem.iloscWMagazynie} {buyingItem.jednostka}</p>

            <label className="field">
              Kupiłem
              <div className="buy-input-row">
                <input
                  type="number"
                  min={buyingItem.jednostka === "szt." ? 1 : 0.01}
                  step={buyingItem.jednostka === "szt." ? 1 : 0.01}
                  value={buyQty}
                  onChange={(e) => {
                    setBuyQty(Number(e.target.value));
                    if (buyError) setBuyError("");
                  }}
                />
                <span className="badge">{buyingItem.jednostka}</span>
              </div>
            </label>

            {buyError ? <p className="error-text">{buyError}</p> : null}

            <div className="toggle-row">
              <button type="button" className="btn btn-small" onClick={closeBuyDialog}>Anuluj</button>
              <button type="button" className="btn btn-small btn-primary" onClick={submitBoughtAmount}>Dodaj do magazynu</button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
