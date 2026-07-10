import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Printer } from "@/types/api";

export interface LocationFormValues {
  name: string;
  location_type: string;
  printer_id: string;
}

const LOCATION_TYPES = ["printer_ams", "printer_external_spool", "storage_box", "dry_box", "dryer", "room"];
const NO_PRINTER = "none";

interface LocationFormProps {
  value: LocationFormValues;
  onChange: (value: LocationFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  printers: Printer[];
  submitting?: boolean;
}

export function LocationForm({ value, onChange, onSubmit, printers, submitting }: LocationFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="location-name">Name</Label>
        <Input
          id="location-name"
          placeholder="e.g. AMS Slot 2"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Type</Label>
        <Select
          value={value.location_type}
          onValueChange={(location_type) => onChange({ ...value, location_type })}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {LOCATION_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Printer</Label>
        <Select
          value={value.printer_id || NO_PRINTER}
          onValueChange={(printer_id) => onChange({ ...value, printer_id: printer_id === NO_PRINTER ? "" : printer_id })}
        >
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NO_PRINTER}>No printer</SelectItem>
            {printers.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={submitting}>
        Add location
      </Button>
    </form>
  );
}
