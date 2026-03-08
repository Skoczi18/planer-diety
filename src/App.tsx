import { Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { CalendarPage } from "./pages/CalendarPage";
import { DayDetailsPage } from "./pages/DayDetailsPage";
import { DietWeekPage } from "./pages/DietWeekPage";
import { MealDetailsPage } from "./pages/MealDetailsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { ShoppingPage } from "./pages/ShoppingPage";
import { TodayPage } from "./pages/TodayPage";

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/" element={<TodayPage />} />
        <Route path="/dieta" element={<DietWeekPage />} />
        <Route path="/dieta/:dayId" element={<DayDetailsPage />} />
        <Route path="/dieta/:dayId/posilek/:mealId" element={<MealDetailsPage />} />
        <Route path="/zakupy" element={<ShoppingPage />} />
        <Route path="/kalendarz" element={<CalendarPage />} />
        <Route path="/ustawienia" element={<SettingsPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppShell>
  );
}
