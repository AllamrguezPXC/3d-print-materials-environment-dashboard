import { Button } from "@/components/ui/button";
import { ColorSwatchPicker } from "@/components/ColorSwatchPicker";
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

/** Manufacturer-specific profiles override generic family defaults
 * (Requirements.md section 7 rule 1; CLAUDE.md Domain Rules). A spool
 * points at exactly one MaterialProfile row, so "override" means
 * suggesting the more specific row when the typed brand matches one --
 * never switching it automatically without the user's confirmation. */
function findManufacturerOverride(
  materials: MaterialProfile[],
  selected: MaterialProfile | undefined,
  brand: string,
): MaterialProfile | undefined {
  const trimmedBrand = brand.trim().toLowerCase();
  if (!selected || selected.manufacturer || !trimmedBrand) return undefined;
  return materials.find(
    (m) => m.family === selected.family && m.manufacturer?.toLowerCase() === trimmedBrand,
  );
}

export function SpoolForm({ value, onChange, onSubmit, materials, submitting, submitLabel = "Add spool" }: SpoolFormProps) {
  const selectedMaterial = materials.find((m) => String(m.id) === value.material_profile_id);
  const override = findManufacturerOverride(materials, selectedMaterial, value.brand);

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
        {override && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>{override.name} profile available.</span>
            <button
              type="button"
              className="text-primary underline underline-offset-2"
              onClick={() => onChange({ ...value, material_profile_id: String(override.id) })}
            >
              Use it
            </button>
          </div>
        )}
      </div>
      <ColorSwatchPicker
        id="spool-color"
        value={value.color}
        onChange={(color) => onChange({ ...value, color })}
      />
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
