import { PropsWithChildren } from "react";
import { useLocation } from "react-router-dom";
import { BottomNav } from "./BottomNav";

export function AppShell({ children }: PropsWithChildren) {
  const location = useLocation();
  const path = location.pathname;

  let title = "Planer diety";
  if (path === "/") title = "Dzisiaj";
  else if (path.startsWith("/dieta")) title = "Plan tygodnia";
  else if (path.startsWith("/zakupy")) title = "Zakupy";
  else if (path.startsWith("/magazyn")) title = "Magazyn";
  else if (path.startsWith("/kalendarz")) title = "Kalendarz realizacji";
  else if (path.startsWith("/ustawienia")) title = "Ustawienia";

  return (
    <div className="app-wrap">
      <header className="topbar">
        <h1>{title}</h1>
      </header>
      <main className="content">{children}</main>
      <BottomNav />
    </div>
  );
}
