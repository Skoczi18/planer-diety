import { ChangeEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useApp } from "../context/AppContext";
import { addNote, exportAllData, getNotes, importAllData, removeNote } from "../db/repository";
import { clampDayNumber } from "../lib/execution";
import { NotatkaRecord, TrybDnia } from "../types";

function validateImportPayload(payload: unknown): payload is { data: { dietDays: unknown[] } } {
  if (!payload || typeof payload !== "object") return false;
  const maybe = payload as { data?: { dietDays?: unknown[] } };
  return !!maybe.data && Array.isArray(maybe.data.dietDays);
}

export function SettingsPage() {
  const { settings, updateSettings, refresh } = useApp();
  const [note, setNote] = useState("");
  const [notes, setNotes] = useState<NotatkaRecord[]>([]);
  const [message, setMessage] = useState("");
  const [dataSizeKb, setDataSizeKb] = useState<number>(0);

  const loadNotes = async () => {
    setNotes(await getNotes());
  };

  const refreshDataSize = async () => {
    const exported = await exportAllData();
    const bytes = new Blob([JSON.stringify(exported)]).size;
    setDataSizeKb(Math.round(bytes / 102.4) / 10);
  };

  useEffect(() => {
    loadNotes().catch(console.error);
    refreshDataSize().catch(console.error);
  }, []);

  if (!settings) return <p className="empty">Ładowanie ustawień...</p>;

  const onExport = async () => {
    const data = await exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href;
    link.download = `planer-diety-export-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(href);
    setMessage("Eksport danych zakończony.");
    await refreshDataSize();
  };

  const onImport = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const confirmed = window.confirm("Import nadpisze obecne dane aplikacji. Kontynuować?");
      if (!confirmed) {
        event.target.value = "";
        return;
      }

      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;

      if (!validateImportPayload(parsed)) {
        throw new Error("Niepoprawny format pliku.");
      }

      await importAllData(parsed as any);
      await refresh();
      await loadNotes();
      await refreshDataSize();
      setMessage("Import danych zakończony pomyślnie.");
    } catch (error) {
      console.error(error);
      setMessage("Import nieudany. Sprawdź czy plik jest poprawnym eksportem aplikacji.");
    } finally {
      event.target.value = "";
    }
  };

  const onAddNote = async () => {
    await addNote(note);
    setNote("");
    await loadNotes();
  };

  const onRemoveNote = async (id: string) => {
    await removeNote(id);
    await loadNotes();
  };

  const updateMode = (mode: TrybDnia) => {
    updateSettings({ trybDnia: mode }).catch(console.error);
  };

  return (
    <div className="stack">
      {!!message && <section className="success-state">{message}</section>}

      <section className="card">
        <h3>Logika aktualnego dnia</h3>
        <label className="field">
          Data startu diety
          <input type="date" value={settings.startDate} onChange={(e) => updateSettings({ startDate: e.target.value })} />
        </label>

        <label className="field">
          Tryb liczenia dni
          <select value={settings.trybDnia} onChange={(e) => updateMode(e.target.value as TrybDnia)}>
            <option value="automatyczny">Automatyczny (kalendarz od daty startu)</option>
            <option value="reczny">Ręczny (wskazuję aktualny dzień)</option>
          </select>
        </label>

        {settings.trybDnia === "reczny" && (
          <label className="field">
            Aktualny dzień diety (1-7)
            <input
              type="number"
              min={1}
              max={7}
              value={settings.recznyNumerDnia}
              onChange={(e) => updateSettings({ recznyNumerDnia: clampDayNumber(Number(e.target.value)) })}
            />
          </label>
        )}
      </section>

      <section className="card">
        <h3>Dane aplikacji</h3>
        <p>Zapis lokalny: IndexedDB</p>
        <p>Szacowany rozmiar danych: {dataSizeKb} KB</p>
        <p>
          Zarządzanie spiżarnią znajdziesz w sekcji <Link to="/zakupy">Zakupy</Link>.
        </p>
      </section>

      <section className="card">
        <h3>Eksport / Import JSON</h3>
        <p>Eksport obejmuje historię realizacji, zakupy, notatki, wagę i odstępstwa.</p>
        <div className="grid grid-2">
          <button className="btn btn-primary" onClick={onExport}>Eksportuj JSON</button>
          <label className="btn file-btn">
            Importuj JSON
            <input type="file" accept="application/json" onChange={onImport} />
          </label>
        </div>
      </section>

      <section className="card">
        <h3>Notatki ogólne</h3>
        <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Dodaj notatkę..." rows={3} />
        <button className="btn btn-primary" onClick={onAddNote}>Zapisz notatkę</button>

        {notes.length ? (
          <ul className="list">
            {notes.map((item) => (
              <li key={item.id} className="list-item list-row">
                <div>
                  <strong>{new Date(item.data).toLocaleString("pl-PL")}</strong>
                  <p>{item.tekst}</p>
                </div>
                <button className="btn btn-small" onClick={() => onRemoveNote(item.id)}>Usuń</button>
              </li>
            ))}
          </ul>
        ) : (
          <div className="empty-state">Brak notatek ogólnych.</div>
        )}
      </section>

      <section className="card">
        <h3>O aplikacji</h3>
        <p>Planer Diety PWA - tryb prywatny, offline-first.</p>
        <p>Po dodaniu do ekranu głównego działa jak aplikacja pełnoekranowa.</p>
      </section>
    </div>
  );
}
