import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getDietDays, getSettings, initDatabaseWithSeed, saveSettings } from "../db/repository";
import { DzienDiety, UstawieniaAplikacji } from "../types";

type AppContextValue = {
  ready: boolean;
  initError: string | null;
  dieta: DzienDiety[];
  settings: UstawieniaAplikacji | null;
  refresh: () => Promise<void>;
  updateSettings: (patch: Partial<Omit<UstawieniaAplikacji, "key">>) => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);
let sharedInitPromise: Promise<void> | null = null;

function ensureDbInitialized(): Promise<void> {
  if (sharedInitPromise) return sharedInitPromise;

  sharedInitPromise = (async () => {
    const maxAttempts = 2;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        console.info("[App] bootstrap start", { attempt, maxAttempts });
        await initDatabaseWithSeed();
        console.info("[App] db init ok");
        return;
      } catch (err) {
        console.error("[App] bootstrap failed", { attempt, err });
        if (attempt < maxAttempts) {
          await new Promise((resolve) => window.setTimeout(resolve, 250));
          continue;
        }
        throw err;
      }
    }
  })().catch((err) => {
    sharedInitPromise = null;
    throw err;
  });

  return sharedInitPromise;
}

export function AppProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [dieta, setDieta] = useState<DzienDiety[]>([]);
  const [settings, setSettings] = useState<UstawieniaAplikacji | null>(null);

  const refresh = useCallback(async () => {
    const [days, appSettings] = await Promise.all([getDietDays(), getSettings()]);
    setDieta(days);
    setSettings(appSettings);
  }, []);

  const updateSettings = useCallback(
    async (patch: Partial<Omit<UstawieniaAplikacji, "key">>) => {
      if (!settings) return;
      const next: UstawieniaAplikacji = { ...settings, ...patch, key: "appSettings" };
      await saveSettings(next);
      setSettings(next);
    },
    [settings]
  );

  useEffect(() => {
    let cancelled = false;

    const bootstrap = async () => {
      try {
        await ensureDbInitialized();
        if (!cancelled) setInitError(null);
        await refresh();
        console.info("[App] refresh ok");
        if (!cancelled) {
          setReady(true);
          console.info("[App] ready=true");
        }
      } catch (err) {
        console.error("[App] bootstrap fatal", err);
        if (!cancelled) {
          const message = err instanceof Error ? err.message : "Nieznany błąd lokalnej bazy danych.";
          setInitError(`Nie udało się uruchomić lokalnej bazy danych. ${message}`);
          setReady(true);
          console.info("[App] ready=true (fallback after error)");
        }
      }
    };

    bootstrap().catch(console.error);

    return () => {
      cancelled = true;
    };
  }, [refresh]);

  const value = useMemo<AppContextValue>(
    () => ({ ready, initError, dieta, settings, refresh, updateSettings }),
    [ready, initError, dieta, settings, refresh, updateSettings]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error("useApp musi być używany wewnątrz AppProvider");
  }
  return context;
}
