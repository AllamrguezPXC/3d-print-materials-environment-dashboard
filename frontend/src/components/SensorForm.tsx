import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PortSelect } from "@/components/PortSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Location, Printer } from "@/types/api";

export interface SensorFormValues {
  name: string;
  model: string;
  serial_number: string;
  sensor_type: string;
  port: string;
  location_id: string;
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
}

// dracal_cli identifies its device via serial number only (no COM port --
// it talks to the sensor over native USB via the dracal-usb-get CLI tool).
const REQUIRES_PORT = new Set(["dracal_vcp"]);

interface LocationOption {
  id: number;
  label: string;
}

/** Physically, one sensor covers an entire AMS module's shared microclimate
 * -- collapse that printer's AMS slots to a single option (the lowest
 * slot_index as the representative location_id), so the picker can't imply
 * "slot 3" is a different choice from "slot 0". Non-AMS locations are
 * listed individually, unchanged. */
function buildLocationOptions(locations: Location[], printers: Printer[]): LocationOption[] {
  const amsByPrinter = new Map<number, Location>();
  const otherOptions: LocationOption[] = [];

  for (const location of locations) {
    if (location.location_type === "printer_ams" && location.printer_id !== null) {
      const current = amsByPrinter.get(location.printer_id);
      if (!current || (location.slot_index ?? 0) < (current.slot_index ?? 0)) {
        amsByPrinter.set(location.printer_id, location);
      }
    } else {
      otherOptions.push({ id: location.id, label: location.name });
    }
  }

  const amsOptions: LocationOption[] = [...amsByPrinter.entries()].map(([printerId, location]) => ({
    id: location.id,
    label: `${printers.find((p) => p.id === printerId)?.name ?? location.name} — AMS`,
  }));

  return [...amsOptions, ...otherOptions];
}

export function SensorForm({ value, onChange, onSubmit, locations, printers, submitting }: SensorFormProps) {
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
      <Button type="submit" disabled={submitting}>
        Add sensor
      </Button>
    </form>
  );
}
