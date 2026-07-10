import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export interface PrinterFormValues {
  name: string;
  brand: string;
  model: string;
  filament_system_type: string;
}

const BAMBU_MODELS = ["A1 mini", "P1S", "P1P", "X1 Carbon", "Other"];
const FILAMENT_SYSTEM_TYPES = ["ams", "external_spool", "storage_only", "manual"];

interface PrinterFormProps {
  value: PrinterFormValues;
  onChange: (value: PrinterFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting?: boolean;
}

export function PrinterForm({ value, onChange, onSubmit, submitting }: PrinterFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="printer-name">Name</Label>
        <Input
          id="printer-name"
          placeholder="e.g. A1 mini #5"
          value={value.name}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="printer-brand">Brand</Label>
        <Input
          id="printer-brand"
          placeholder="Brand"
          value={value.brand}
          onChange={(e) => onChange({ ...value, brand: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Model</Label>
        <Select value={value.model} onValueChange={(model) => onChange({ ...value, model })}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {BAMBU_MODELS.map((m) => (
              <SelectItem key={m} value={m}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Filament system</Label>
        <Select
          value={value.filament_system_type}
          onValueChange={(filament_system_type) => onChange({ ...value, filament_system_type })}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILAMENT_SYSTEM_TYPES.map((t) => (
              <SelectItem key={t} value={t}>
                {t.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={submitting}>
        Add printer
      </Button>
    </form>
  );
}
