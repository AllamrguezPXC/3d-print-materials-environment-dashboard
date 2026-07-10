import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { DryingSessionCreate, FilamentSpool, Location, MaterialProfile, Sensor } from "@/types/api";

const NO_SENSOR = "none";

export interface DryingSessionFormInitial {
  spool_id?: number;
  dryer_location_id?: number;
  target_temp_c?: number;
  target_duration_hours?: number;
}

interface DryingSessionFormProps {
  spools: FilamentSpool[];
  materials: MaterialProfile[];
  dryerLocations: Location[];
  sensors: Sensor[];
  initial?: DryingSessionFormInitial;
  onSubmit: (body: DryingSessionCreate) => void;
  submitting?: boolean;
}

export function DryingSessionForm({
  spools,
  materials,
  dryerLocations,
  sensors,
  initial,
  onSubmit,
  submitting,
}: DryingSessionFormProps) {
  const [spoolId, setSpoolId] = useState(initial?.spool_id ? String(initial.spool_id) : "");
  const [dryerLocationId, setDryerLocationId] = useState(
    initial?.dryer_location_id ? String(initial.dryer_location_id) : "",
  );
  const [sensorId, setSensorId] = useState(NO_SENSOR);
  const [targetTemp, setTargetTemp] = useState(initial?.target_temp_c ?? 50);
  const [targetDuration, setTargetDuration] = useState(initial?.target_duration_hours ?? 6);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!spoolId || !dryerLocationId) return;
    onSubmit({
      spool_id: Number(spoolId),
      dryer_location_id: Number(dryerLocationId),
      sensor_id: sensorId !== NO_SENSOR ? Number(sensorId) : null,
      target_temp_c: targetTemp,
      target_duration_hours: targetDuration,
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Spool</Label>
        <Select value={spoolId} onValueChange={setSpoolId}>
          <SelectTrigger>
            <SelectValue placeholder="Select a spool…" />
          </SelectTrigger>
          <SelectContent>
            {spools.map((s) => {
              const material = materials.find((m) => m.id === s.material_profile_id);
              return (
                <SelectItem key={s.id} value={String(s.id)}>
                  {material?.name ?? "Unknown"} — {s.brand} {s.color} (#{s.id})
                </SelectItem>
              );
            })}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Dryer location</Label>
        <Select value={dryerLocationId} onValueChange={setDryerLocationId} disabled={dryerLocations.length === 0}>
          <SelectTrigger>
            <SelectValue placeholder="Select a dryer…" />
          </SelectTrigger>
          <SelectContent>
            {dryerLocations.map((l) => (
              <SelectItem key={l.id} value={String(l.id)}>
                {l.name}
                {l.max_temp_c != null ? ` (max ${l.max_temp_c}°C)` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {dryerLocations.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No dryer location configured yet — add one under Printers &amp; Locations (type "dryer").
          </p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label>Monitoring sensor (optional)</Label>
        <Select value={sensorId} onValueChange={setSensorId}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_SENSOR}>No sensor</SelectItem>
            {sensors.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                {s.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ds-temp">Target temperature °C</Label>
          <Input
            id="ds-temp"
            type="number"
            value={targetTemp}
            onChange={(e) => setTargetTemp(Number(e.target.value))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ds-duration">Target duration (hours)</Label>
          <Input
            id="ds-duration"
            type="number"
            value={targetDuration}
            onChange={(e) => setTargetDuration(Number(e.target.value))}
          />
        </div>
      </div>

      <Button type="submit" disabled={submitting || !spoolId || !dryerLocationId}>
        Start session
      </Button>
    </form>
  );
}
