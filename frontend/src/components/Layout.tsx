import { useState } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Boxes,
  Droplets,
  Gauge,
  LayoutDashboard,
  Menu,
  Package,
  Printer,
  Settings as SettingsIcon,
  Thermometer,
  WifiOff,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCurrentReading } from "@/api/readings";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { to: "/", label: "Dashboard", end: true, icon: LayoutDashboard },
  { to: "/history", label: "History", end: false, icon: Gauge },
  { to: "/printers", label: "Printers & Locations", end: false, icon: Printer },
  { to: "/materials", label: "Materials", end: false, icon: Boxes },
  { to: "/spools", label: "Spools", end: false, icon: Package },
  { to: "/drying", label: "Drying", end: false, icon: Droplets },
  { to: "/settings", label: "Settings", end: false, icon: SettingsIcon },
] as const;

function SystemStatusBadge() {
  const { data, isError } = useQuery({
    queryKey: ["current-reading"],
    queryFn: getCurrentReading,
    refetchInterval: 5000,
  });

  if (isError) {
    return (
      <Badge variant="critical" className="gap-1.5">
        <WifiOff className="size-3" />
        Backend unreachable
      </Badge>
    );
  }

  if (!data) return null;

  return (
    <Badge variant={data.source === "mock" ? "secondary" : "ok"} className="gap-1.5">
      <Thermometer className="size-3" />
      {data.source === "mock" ? "Mock sensor" : "Live sensor"}
    </Badge>
  );
}

export function Layout() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen bg-background text-foreground">
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden
        />
      )}

      <nav
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col gap-1 border-r border-sidebar-border bg-sidebar p-3 text-sidebar-foreground transition-transform duration-200 md:static md:z-auto md:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between px-2 pt-1 pb-4">
          <span className="text-sm font-semibold">Filament Environment Monitor</span>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(false)}
          >
            <X className="size-4" />
          </Button>
        </div>
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={() => setMobileOpen(false)}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                  isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                )
              }
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3 md:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-4" />
          </Button>
          <div className="flex-1">
            <SystemStatusBadge />
          </div>
          <ThemeToggle />
        </header>
        <main className="flex-1 overflow-x-auto p-4 md:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
