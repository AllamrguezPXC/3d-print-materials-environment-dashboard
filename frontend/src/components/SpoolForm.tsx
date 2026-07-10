import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { FilamentSpool, MaterialProfile } from "@/types/api";

export interface SpoolFormValues {
  material_profile_id: string;
  brand: string;
  color: string;
  status: FilamentSpool["status"];
}

const STATUS_OPTIONS: FilamentSpool["status"][] = ["ready", "watch", "needs_drying", "quarantine", "unknown"];

interface SpoolFormProps {
  value: SpoolFormValues;
  onChange: (value: SpoolFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  materials: MaterialProfile[];
  submitting?: boolean;
  submitLabel?: string;
}

export function SpoolForm({ value, onChange, onSubmit, materials, submitting, submitLabel = "Add spool" }: SpoolFormProps) {
  return (
    <form onSubmit={onSubmit} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col gap-1.5">
        <Label>Material</Label>
        <Select
          value={value.material_profile_id}
          onValueChange={(material_profile_id) => onChange({ ...value, material_profile_id })}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Material…" />
          </SelectTrigger>
          <SelectContent>
            {materials.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="spool-brand">Brand</Label>
        <Input
          id="spool-brand"
          value={value.brand}
          onChange={(e) => onChange({ ...value, brand: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="spool-color">Color</Label>
        <Input
          id="spool-color"
          value={value.color}
          onChange={(e) => onChange({ ...value, color: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label>Status</Label>
        <Select value={value.status} onValueChange={(status) => onChange({ ...value, status: status as FilamentSpool["status"] })}>
          <SelectTrigger className="w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <Button type="submit" disabled={submitting}>
        {submitLabel}
      </Button>
    </form>
  );
}
