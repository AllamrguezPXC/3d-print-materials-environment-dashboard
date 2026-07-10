import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getStoredRefreshInterval, REFRESH_STORAGE_KEY } from "@/hooks/useRefreshInterval";

export function Settings() {
  const [refreshMs, setRefreshMs] = useState(getStoredRefreshInterval);

  function handleChange(value: string) {
    const ms = Number(value);
    setRefreshMs(ms);
    localStorage.setItem(REFRESH_STORAGE_KEY, String(ms));
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-heading font-semibold">Settings</h1>

      <Card>
        <CardHeader>
          <CardTitle>Sensor mode</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Sensor mode is configured server-side via the <code className="rounded bg-muted px-1 py-0.5">SENSOR_MODE</code> environment
            variable (default <code className="rounded bg-muted px-1 py-0.5">mock</code>). See{" "}
            <code className="rounded bg-muted px-1 py-0.5">backend/.env.example</code>.
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
    </div>
  );
}
