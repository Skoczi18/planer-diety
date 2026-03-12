import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { useApp } from "./context/AppContext";
import { CalendarPage } from "./pages/CalendarPage";
import { DayDetailsPage } from "./pages/DayDetailsPage";
import { DietWeekPage } from "./pages/DietWeekPage";
import { MealDetailsPage } from "./pages/MealDetailsPage";
import { InventoryPage } from "./pages/InventoryPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ShoppingPage } from "./pages/ShoppingPage";
import { TodayPage } from "./pages/TodayPage";

export default function App() {
  const { ready, initError } = useApp();

  if (!ready) {
    return (
      <AppShell>
        <p className="empty">Uruchamianie aplikacji...</p>
      </AppShell>
    );
  }

  if (initError) {
    return (
      <AppShell>
        <section className="card">
          <h3>Błąd lokalnej bazy danych</h3>
          <p>{initError}</p>
          <button className="btn" onClick={() => window.location.reload()}>
            Odśwież aplikację
          </button>
        </section>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/dieta" element={<DietWeekPage />} />
        <Route path="/dieta/:dayId" element={<DayDetailsPage />} />
        <Route path="/dieta/:dayId/posilek/:mealId" element={<MealDetailsPage />} />
        <Route path="/zakupy" element={<ShoppingPage />} />
        <Route path="/magazyn" element={<InventoryPage />} />
        <Route path="/kalendarz" element={<CalendarPage />} />
        <Route path="/ustawienia" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
