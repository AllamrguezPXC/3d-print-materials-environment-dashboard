import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PortSelect } from "@/components/PortSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { buildLocationOptions } from "@/lib/sensorLocation";
import type { Location, Printer } from "@/types/api";

export interface SensorFormValues {
  name: string;
  model: string;
  serial_number: string;
  sensor_type: string;
  port: string;
  location_id: string;
  is_active: boolean;
}

const SENSOR_TYPES = ["mock", "dracal_vcp", "dracal_cli"];
const NO_LOCATION = "none";

interface SensorFormProps {
  value: SensorFormValues;
  onChange: (value: SensorFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  locations: Location[];
  printers: Printer[];
  submitting?: boolean;
  submitLabel?: string;
}

// dracal_cli identifies its device via serial number only (no COM port --
// it talks to the sensor over native USB via the dracal-usb-get CLI tool).
const REQUIRES_PORT = new Set(["dracal_vcp"]);

export function SensorForm({
  value,
  onChange,
  onSubmit,
  locations,
  printers,
  submitting,
  submitLabel = "Add sensor",
}: SensorFormProps) {
  const locationOptions = buildLocationOptions(locations, printers);
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sensor-name">Name</Label>
        <Input
          id="sensor-name"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sensor-model">Model</Label>
        <Input
          id="sensor-model"
          value={value.model}
          onChange={(e) => onChange({ ...value, model: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sensor-serial">Serial number</Label>
        <Input
          id="sensor-serial"
          placeholder={value.sensor_type === "mock" ? "MOCK-…" : "e.g. E25877"}
          value={value.serial_number}
          onChange={(e) => onChange({ ...value, serial_number: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Type</Label>
        <Select
          value={value.sensor_type}
          onValueChange={(sensor_type) => onChange({ ...value, sensor_type })}
        >
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SENSOR_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {REQUIRES_PORT.has(value.sensor_type) && (
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="sensor-port">Port</Label>
          <div className="flex flex-col gap-1.5">
            <Input
              id="sensor-port"
              placeholder="COM3"
              value={value.port}
              onChange={(e) => onChange({ ...value, port: e.target.value })}
              className="w-52"
            />
            <PortSelect value={value.port} onChange={(port) => onChange({ ...value, port })} />
          </div>
        </div>
      )}
      <div className="flex flex-col gap-1.5">
        <Label>Location</Label>
        <Select
          value={value.location_id || NO_LOCATION}
          onValueChange={(location_id) =>
            onChange({ ...value, location_id: location_id === NO_LOCATION ? "" : location_id })
          }
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_LOCATION}>No location</SelectItem>
            {locationOptions.map((option) => (
              <SelectItem key={option.id} value={String(option.id)}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="sensor-is-active">Active</Label>
        <input
          id="sensor-is-active"
          type="checkbox"
          className="size-4"
          checked={value.is_active}
          onChange={(e) => onChange({ ...value, is_active: e.target.checked })}
        />
      </div>
      <Button type="submit" disabled={submitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
