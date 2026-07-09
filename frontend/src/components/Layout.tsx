import { NavLink, Outlet } from "react-router-dom";
import { ThemeToggle } from "./ThemeToggle";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true },
  { to: "/history", label: "History" },
  { to: "/printers", label: "Printers & Locations" },
  { to: "/materials", label: "Materials" },
  { to: "/spools", label: "Spools" },
  { to: "/drying", label: "Drying" },
  { to: "/settings", label: "Settings" },
];

export function Layout() {
  return (
    <div className="app-shell">
      <nav className="sidebar">
        <div className="sidebar-brand">Filament Environment Monitor</div>
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={({ isActive }) => (isActive ? "active" : undefined)}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="main-content">
        <header className="topbar">
          <div />
          <ThemeToggle />
        </header>
        <main className="page">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
