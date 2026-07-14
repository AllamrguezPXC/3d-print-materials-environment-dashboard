import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStoredRefreshInterval, REFRESH_STORAGE_KEY } from "@/hooks/useRefreshInterval";
import { DEVICE_FILTERS_STORAGE_KEY } from "@/hooks/useDeviceFilters";

export function Settings() {
  const [refreshMs, setRefreshMs] = useState(getStoredRefreshInterval);
  const [filtersReset, setFiltersReset] = useState(false);

  function handleChange(value: string) {
    const ms = Number(value);
    setRefreshMs(ms);
    localStorage.setItem(REFRESH_STORAGE_KEY, String(ms));
  }

  function handleResetFilters() {
    localStorage.removeItem(DEVICE_FILTERS_STORAGE_KEY);
    setFiltersReset(true);
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-heading font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Sensors</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sensors are configured individually — each row in the sensors table specifies its own
            type (<code className="rounded bg-muted px-1 py-0.5">mock</code> or{" "}
            <code className="rounded bg-muted px-1 py-0.5">dracal_vcp</code>) and connection
            details. There is no global sensor mode. Manage sensors via the{" "}
            <code className="rounded bg-muted px-1 py-0.5">/sensors</code> API — see{" "}
            <code className="rounded bg-muted px-1 py-0.5">http://localhost:8000/docs</code>.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard refresh interval</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <Select value={String(refreshMs)} onValueChange={handleChange}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="2000">Every 2 seconds</SelectItem>
              <SelectItem value="3000">Every 3 seconds</SelectItem>
              <SelectItem value="5000">Every 5 seconds</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">Applies next time the Dashboard page loads.</p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Dashboard filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-2">
          <p className="text-sm text-muted-foreground">
            Dashboard filters (search, alert/sensor/slot status, printer brand and status, filament
            type/brand/color/status) persist across page reloads. If a forgotten filter is hiding
            devices you expect to see, reset them here.
          </p>
          <Button variant="outline" size="sm" className="w-fit" onClick={handleResetFilters}>
            Reset filters
          </Button>
          {filtersReset && (
            <p className="text-xs text-muted-foreground">Filters reset. Applies next time the Dashboard page loads.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
