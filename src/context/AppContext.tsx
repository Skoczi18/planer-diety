import { createContext, PropsWithChildren, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getDietDays, getSettings, initDatabaseWithSeed, saveSettings } from "../db/repository";
import { DzienDiety, UstawieniaAplikacji } from "../types";

type AppContextValue = {
  ready: boolean;
  dieta: DzienDiety[];
  settings: UstawieniaAplikacji | null;
  refresh: () => Promise<void>;
  updateSettings: (patch: Partial<Omit<UstawieniaAplikacji, "key">>) => Promise<void>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: PropsWithChildren) {
  const [ready, setReady] = useState(false);
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
    const bootstrap = async () => {
      await initDatabaseWithSeed();
      await refresh();
      setReady(true);
    };

    bootstrap().catch((err) => {
      console.error(err);
      setReady(true);
    });
  }, [refresh]);

  const value = useMemo<AppContextValue>(
    () => ({ ready, dieta, settings, refresh, updateSettings }),
    [ready, dieta, settings, refresh, updateSettings]
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
