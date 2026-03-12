import { useEffect, useMemo, useState } from "react";
import {
  addInventoryAmount,
  getInventoryItems,
  removeInventoryItem,
  upsertInventoryItem
} from "../db/repository";
import { normalizeProductName, normalizeUnit } from "../lib/shoppingNormalize";
import { InventoryItemRecord, LokalizacjaMagazynu, ShoppingGroup } from "../types";
import { CATEGORY_LABELS, CATEGORY_OPTIONS } from "../lib/productCategories";

const LOKALIZACJE: Array<{ value: LokalizacjaMagazynu; label: string }> = [
  { value: "spizarnia", label: "Spiżarnia" },
  { value: "lodowka", label: "Lodówka" },
  { value: "zamrazarka", label: "Zamrażarka" },
  { value: "inne", label: "Inne" }
];

export function InventoryPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [items, setItems] = useState<InventoryItemRecord[]>([]);
  const [search, setSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [groupByCategory, setGroupByCategory] = useState(true);
  const [expandedGroups, setExpandedGroups] = useState<Record<ShoppingGroup, boolean>>({
    nabial_i_jaja: true,
    mieso_i_ryby: true,
    pieczywo_i_zboza: true,
    warzywa_i_owoce: true,
    tluszcze_i_dodatki: true,
    przyprawy_i_dodatki_kuchenne: true,
    napoje_i_plyny: true,
    inne: true
  });

  const [name, setName] = useState("");
  const [qty, setQty] = useState<number>(1);
  const [unit, setUnit] = useState("g");
  const [category, setCategory] = useState<ShoppingGroup>("inne");
  const [location, setLocation] = useState<LokalizacjaMagazynu>("spizarnia");
  const [note, setNote] = useState("");
  const [expiry, setExpiry] = useState("");
  const [adjustAmounts, setAdjustAmounts] = useState<Record<string, number>>({});

  const load = async (options?: { silent?: boolean }) => {
    const silent = !!options?.silent;
    if (!silent) {
      setLoading(true);
      setError("");
    }
    try {
      const rows = await getInventoryItems();
      setItems(rows);
    } catch (err) {
      console.error(err);
      setError("Nie udało się wczytać magazynu.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    load().catch(console.error);
  }, []);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (!query) return true;
      const normalizedName = normalizeProductName(item.nazwa);
      return item.nazwa.toLowerCase().includes(query) || normalizedName.productKey.includes(query);
    });
  }, [items, search]);

  const grouped = useMemo(() => {
    const byCategory: Record<ShoppingGroup, InventoryItemRecord[]> = {
      nabial_i_jaja: [],
      mieso_i_ryby: [],
      pieczywo_i_zboza: [],
      warzywa_i_owoce: [],
      tluszcze_i_dodatki: [],
      przyprawy_i_dodatki_kuchenne: [],
      napoje_i_plyny: [],
      inne: []
    };

    for (const item of filtered) {
      byCategory[item.grupa]?.push(item);
    }

    return byCategory;
  }, [filtered]);

  const addItem = async () => {
    if (!name.trim()) return;
    const normalized = normalizeProductName(name);
    await upsertInventoryItem({
      nazwa: normalized.canonicalName,
      ilosc: qty,
      jednostka: normalizeUnit(unit),
      grupa: category,
      lokalizacja: location,
      notatka: note,
      dataWaznosci: expiry || undefined
    });
    setName("");
    setQty(1);
    setUnit("g");
    setCategory("inne");
    setLocation("spizarnia");
    setNote("");
    setExpiry("");
    await load({ silent: true });
  };

  const quickAdjust = async (item: InventoryItemRecord, delta: number) => {
    await addInventoryAmount(item.productKey, item.jednostka, delta, item.nazwa);
    await load({ silent: true });
  };

  const getAdjustAmount = (itemId: string): number => {
    const value = adjustAmounts[itemId];
    if (!Number.isFinite(value) || value <= 0) return 1;
    return value;
  };

  const setAdjustAmount = (itemId: string, value: number) => {
    setAdjustAmounts((prev) => ({
      ...prev,
      [itemId]: Number.isFinite(value) && value > 0 ? value : 1
    }));
  };

  const clearItem = async (id: string) => {
    await removeInventoryItem(id);
    await load({ silent: true });
  };

  const toggleGroup = (groupId: ShoppingGroup) => {
    setExpandedGroups((prev) => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  if (loading) return <p className="empty">Ładowanie magazynu...</p>;
  if (error) return <p className="empty">{error}</p>;

  return (
    <div className="stack">
      <section className="card">
        <div className="inventory-topbar">
          <h3>Magazyn</h3>
          <div className="inventory-topbar-actions">
            <button
              className={searchOpen ? "icon-btn icon-btn-active" : "icon-btn"}
              onClick={() => setSearchOpen((prev) => !prev)}
              aria-label="Szukaj w magazynie"
            >
              🔍
            </button>
            <button
              className={addOpen ? "icon-btn icon-btn-active" : "icon-btn"}
              onClick={() => setAddOpen((prev) => !prev)}
              aria-label="Dodaj produkt"
            >
              ➕
            </button>
          </div>
        </div>
        <p>To globalne źródło prawdy o tym, co masz w domu.</p>

        {searchOpen ? (
          <label className="search-field" aria-label="Wyszukaj w magazynie">
            <span className="search-icon" aria-hidden="true">⌕</span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Wyszukaj w magazynie..."
            />
          </label>
        ) : null}
      </section>

      {addOpen ? (
        <section className="card">
          <h3>Dodaj produkt do magazynu</h3>
          <label className="field">
            Nazwa
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Np. Ryż basmati" />
          </label>
          <div className="grid grid-2">
            <label className="field">
              Ilość
              <input type="number" value={qty} onChange={(e) => setQty(Number(e.target.value))} />
            </label>
            <label className="field">
              Jednostka
              <select value={unit} onChange={(e) => setUnit(e.target.value)}>
                <option value="g">g</option>
                <option value="ml">ml</option>
                <option value="szt.">szt.</option>
              </select>
            </label>
          </div>
          <div className="grid grid-2">
            <label className="field">
              Kategoria
              <select value={category} onChange={(e) => setCategory(e.target.value as ShoppingGroup)}>
                {CATEGORY_OPTIONS.map((entry) => (
                  <option key={entry.id} value={entry.id}>{entry.label}</option>
                ))}
              </select>
            </label>
            <label className="field">
              Lokalizacja
              <select value={location} onChange={(e) => setLocation(e.target.value as LokalizacjaMagazynu)}>
                {LOKALIZACJE.map((loc) => (
                  <option key={loc.value} value={loc.value}>{loc.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div className="grid grid-2">
            <label className="field">
              Data ważności
              <input type="date" value={expiry} onChange={(e) => setExpiry(e.target.value)} />
            </label>
          </div>
          <label className="field">
            Notatka
            <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Opcjonalnie" />
          </label>
          <button className="btn btn-primary" onClick={addItem}>Dodaj do magazynu</button>
        </section>
      ) : null}

      <section className="card">
        <div className="summary-grid">
          <div className="summary-pill">
            <span>Produkty</span>
            <strong>{items.length}</strong>
          </div>
          <div className="summary-pill">
            <span>Widoczne</span>
            <strong>{filtered.length}</strong>
          </div>
        </div>
        <label className="inventory-group-toggle">
          <input
            type="checkbox"
            checked={groupByCategory}
            onChange={(e) => setGroupByCategory(e.target.checked)}
          />
          <span>Grupuj wg kategorii</span>
        </label>
      </section>

      <section className="card">
        <h3>Produkty w magazynie</h3>
        {filtered.length ? (
          groupByCategory ? (
            <div className="inventory-group-list">
              {CATEGORY_OPTIONS.map((categoryOption) => {
                const categoryItems = grouped[categoryOption.id];
                if (!categoryItems?.length) return null;
                const expanded = expandedGroups[categoryOption.id] ?? true;
                return (
                  <section key={categoryOption.id} className="inventory-group-section">
                    <button
                      className="group-header inventory-group-header"
                      onClick={() => toggleGroup(categoryOption.id)}
                      type="button"
                    >
                      <span>{categoryOption.label} ({categoryItems.length})</span>
                      <span aria-hidden="true">{expanded ? "▾" : "▸"}</span>
                    </button>
                    {expanded ? (
                      <ul className="list">
                        {categoryItems.map((item) => (
                          <li key={item.id} className="list-item">
                            <div className="item-head">
                              <strong>{item.nazwa}</strong>
                              <span>{item.ilosc} {item.jednostka}</span>
                            </div>
                            <p className="muted-line">{item.lokalizacja} | {CATEGORY_LABELS[item.grupa] ?? "Inne"}</p>
                            <p className="muted-line">{item.bazowyZPlanu ? "Produkt bazowy diety" : "Produkt ręczny"}</p>
                            {item.dataWaznosci ? <p className="muted-line">Ważność: {item.dataWaznosci}</p> : null}
                            {item.notatka ? <p>{item.notatka}</p> : null}
                            <div className="inventory-adjust-row">
                              <button className="btn btn-small" onClick={() => quickAdjust(item, -getAdjustAmount(item.id))}>-</button>
                              <div>
                                <input
                                  type="number"
                                  min={0.01}
                                  step="0.01"
                                  value={getAdjustAmount(item.id)}
                                  onChange={(e) => setAdjustAmount(item.id, Number(e.target.value))}
                                />
                              </div>
                              <button className="btn btn-small" onClick={() => quickAdjust(item, getAdjustAmount(item.id))}>+</button>
                              <button className="btn btn-small" onClick={() => clearItem(item.id)}>Usuń</button>
                            </div>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </section>
                );
              })}
            </div>
          ) : (
            <ul className="list">
              {filtered.map((item) => (
                <li key={item.id} className="list-item">
                  <div className="item-head">
                    <strong>{item.nazwa}</strong>
                    <span>{item.ilosc} {item.jednostka}</span>
                  </div>
                  <p className="muted-line">{item.lokalizacja} | {CATEGORY_LABELS[item.grupa] ?? "Inne"}</p>
                  <p className="muted-line">{item.bazowyZPlanu ? "Produkt bazowy diety" : "Produkt ręczny"}</p>
                  {item.dataWaznosci ? <p className="muted-line">Ważność: {item.dataWaznosci}</p> : null}
                  {item.notatka ? <p>{item.notatka}</p> : null}
                  <div className="inventory-adjust-row">
                    <button className="btn btn-small" onClick={() => quickAdjust(item, -getAdjustAmount(item.id))}>-</button>
                    <div>
                      <input
                        type="number"
                        min={0.01}
                        step="0.01"
                        value={getAdjustAmount(item.id)}
                        onChange={(e) => setAdjustAmount(item.id, Number(e.target.value))}
                      />
                    </div>
                    <button className="btn btn-small" onClick={() => quickAdjust(item, getAdjustAmount(item.id))}>+</button>
                    <button className="btn btn-small" onClick={() => clearItem(item.id)}>Usuń</button>
                  </div>
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="empty-state">Brak produktów pasujących do wyszukiwania.</div>
        )}
      </section>
    </div>
  );
}
