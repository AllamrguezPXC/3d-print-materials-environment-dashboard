import { useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { HistoryChart } from "@/components/HistoryChart";
import { captureReading, getReadingsHistory } from "@/api/readings";
import { locationsApi, sensorsApi } from "@/api/config";

const CHART_COLORS = {
  temperature: "var(--chart-1)",
  humidity: "var(--chart-2)",
  pressure: "var(--chart-5)",
};

const ALL = "all";

function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 16);
}

function defaultTo(): string {
  return new Date().toISOString().slice(0, 16);
}

export function History() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [sensorId, setSensorId] = useState(ALL);
  const [locationId, setLocationId] = useState(ALL);

  const { data: sensors = [] } = useQuery({ queryKey: ["sensors"], queryFn: sensorsApi.list });
  const { data: locations = [] } = useQuery({ queryKey: ["locations"], queryFn: locationsApi.list });

  const {
    data: history,
    refetch,
    isFetching,
    isFetched,
    error,
  } = useQuery({
    queryKey: ["readings-history", from, to, sensorId, locationId],
    queryFn: () =>
      getReadingsHistory({
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
        aggregate: "hour",
        sensorId: sensorId !== ALL ? Number(sensorId) : undefined,
        locationId: locationId !== ALL ? Number(locationId) : undefined,
      }),
    enabled: false,
  });

  const captureMutation = useMutation({
    mutationFn: captureReading,
    onSuccess: () => refetch(),
  });

  const hourly = history?.hourly ?? [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-heading font-semibold">History</h1>

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="history-from">From</Label>
          <Input
            id="history-from"
            type="datetime-local"
            value={from}
            onChange={(e) => setFrom(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="history-to">To</Label>
          <Input
            id="history-to"
            type="datetime-local"
            value={to}
            onChange={(e) => setTo(e.target.value)}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Sensor</Label>
          <Select value={sensorId} onValueChange={setSensorId}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All sensors</SelectItem>
              {sensors.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  {s.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Location</Label>
          <Select value={locationId} onValueChange={setLocationId}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>All locations</SelectItem>
              {locations.map((l) => (
                <SelectItem key={l.id} value={String(l.id)}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button onClick={() => refetch()} disabled={isFetching}>
          {isFetching && <Loader2 className="size-4 animate-spin" />}
          Load history
        </Button>
        <Button
          variant="outline"
          onClick={() => captureMutation.mutate()}
          disabled={captureMutation.isPending}
        >
          {captureMutation.isPending && <Loader2 className="size-4 animate-spin" />}
          Capture reading now
        </Button>
      </div>

      {error && <p className="text-sm text-destructive">{(error as Error).message}</p>}

      {!isFetched ? (
        <p className="text-sm text-muted-foreground">
          Choose a range and click "Load history" to see readings.
        </p>
      ) : hourly.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No readings in this range yet. Try "Capture reading now" a few times, then reload.
        </p>
      ) : (
        <div className="flex flex-col gap-4">
          <HistoryChart
            title="Temperature (°C)"
            data={hourly}
            yKey="temperature_c"
            color={CHART_COLORS.temperature}
            unit="°C"
          />
          <HistoryChart
            title="Relative Humidity (%)"
            data={hourly}
            yKey="relative_humidity_percent"
            color={CHART_COLORS.humidity}
            unit="%"
          />
          <HistoryChart
            title="Pressure (Pa)"
            data={hourly}
            yKey="pressure_pa"
            color={CHART_COLORS.pressure}
            unit="Pa"
          />
        </div>
      )}
    </div>
  );
}
