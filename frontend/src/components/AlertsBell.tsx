import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Bell } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { getCurrentReading } from "@/api/readings";
import type { AlertOut } from "@/types/api";

/** Global notification bell, replacing the sidebar's static "Alerts" nav
 * link -- fed by the exact same ["current-reading"] query the Dashboard's
 * AlertPanel already uses (GET /readings/current, live per-request), so it
 * can never disagree with what the Dashboard shows. This is deliberately
 * separate from /alerts (the persisted history + resolve workflow, backed
 * by the `alerts` DB table via POST /readings) -- a transient live alert
 * has no id to resolve, so this is a live view layered on top, not a
 * replacement for that page. Lives in Layout.tsx's persistent header, so it
 * renders on every route. */
export function AlertsBell() {
  const { data } = useQuery({
    queryKey: ["current-reading"],
    queryFn: getCurrentReading,
    refetchInterval: 5000,
  });

  const alerts: AlertOut[] = (data?.sensors ?? []).flatMap((s) => s.alerts).filter((a) => a.is_active);
  const hasCritical = alerts.some((a) => a.severity === "critical");
  const hasWarning = alerts.some((a) => a.severity === "warning");
  const tone = hasCritical ? "critical" : hasWarning ? "warning" : "secondary";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Alerts">
          <Bell className="size-4" />
          {alerts.length > 0 && (
            <Badge
              variant={tone}
              className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full p-0 text-[10px]"
            >
              {alerts.length}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent>
        <div className="flex flex-col gap-2">
          <span className="text-sm font-medium">Live alerts</span>
          {alerts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No active alerts.</p>
          ) : (
            <ul className="flex max-h-64 flex-col gap-2 overflow-y-auto">
              {alerts.map((alert, i) => (
                <li key={i} className="flex flex-col gap-1 rounded-md border border-border p-2 text-xs">
                  <Badge variant={alert.severity === "critical" ? "critical" : "warning"} className="w-fit capitalize">
                    {alert.severity}
                  </Badge>
                  <span>{alert.message}</span>
                </li>
              ))}
            </ul>
          )}
          <Link to="/alerts" className="text-xs text-primary underline underline-offset-2">
            View alert history →
          </Link>
        </div>
      </PopoverContent>
    </Popover>
  );
}
