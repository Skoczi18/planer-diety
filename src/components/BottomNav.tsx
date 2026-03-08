import { NavLink } from "react-router-dom";

const items = [
  { to: "/", label: "Dzisiaj", icon: "◉" },
  { to: "/dieta", label: "Dieta", icon: "▦" },
  { to: "/zakupy", label: "Zakupy", icon: "✓" },
  { to: "/kalendarz", label: "Kalendarz", icon: "◷" },
  { to: "/ustawienia", label: "Ustawienia", icon: "☰" }
];

export function BottomNav() {
  return (
    <nav className="bottom-nav" aria-label="Nawigacja dolna">
      {items.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) => (isActive ? "bottom-nav-link active" : "bottom-nav-link")}
        >
          <span className="icon">{item.icon}</span>
          <span>{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
