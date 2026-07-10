import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { MaterialProfile } from "@/types/api";

export type MaterialProfileFormValues = Omit<MaterialProfile, "id">;

interface MaterialProfileFormProps {
  value: MaterialProfileFormValues;
  onChange: (value: MaterialProfileFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  onCancel?: () => void;
  isEditing: boolean;
  submitting?: boolean;
}

export function MaterialProfileForm({
  value,
  onChange,
  onSubmit,
  onCancel,
  isEditing,
  submitting,
}: MaterialProfileFormProps) {
  return (
    <form onSubmit={onSubmit} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mp-name">Name</Label>
        <Input id="mp-name" value={value.name} onChange={(e) => onChange({ ...value, name: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mp-family">Family</Label>
        <Input
          id="mp-family"
          value={value.family}
          onChange={(e) => onChange({ ...value, family: e.target.value })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mp-manufacturer">Manufacturer</Label>
        <Input
          id="mp-manufacturer"
          value={value.manufacturer ?? ""}
          onChange={(e) => onChange({ ...value, manufacturer: e.target.value || null })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mp-variant">Variant</Label>
        <Input
          id="mp-variant"
          value={value.variant ?? ""}
          onChange={(e) => onChange({ ...value, variant: e.target.value || null })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mp-ideal-rh">Ideal RH max %</Label>
        <Input
          id="mp-ideal-rh"
          type="number"
          value={value.ideal_rh_max_percent}
          onChange={(e) => onChange({ ...value, ideal_rh_max_percent: Number(e.target.value) })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mp-warning-rh">Warning RH max %</Label>
        <Input
          id="mp-warning-rh"
          type="number"
          value={value.warning_rh_max_percent}
          onChange={(e) => onChange({ ...value, warning_rh_max_percent: Number(e.target.value) })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mp-critical-rh">Critical RH max %</Label>
        <Input
          id="mp-critical-rh"
          type="number"
          value={value.critical_rh_max_percent}
          onChange={(e) => onChange({ ...value, critical_rh_max_percent: Number(e.target.value) })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mp-drying-temp">Drying temp °C</Label>
        <Input
          id="mp-drying-temp"
          type="number"
          value={value.drying_temp_c}
          onChange={(e) => onChange({ ...value, drying_temp_c: Number(e.target.value) })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mp-drying-min">Drying time min (h)</Label>
        <Input
          id="mp-drying-min"
          type="number"
          value={value.drying_time_hours_min}
          onChange={(e) => onChange({ ...value, drying_time_hours_min: Number(e.target.value) })}
        />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="mp-drying-max">Drying time max (h)</Label>
        <Input
          id="mp-drying-max"
          type="number"
          value={value.drying_time_hours_max}
          onChange={(e) => onChange({ ...value, drying_time_hours_max: Number(e.target.value) })}
        />
      </div>
      <div className="col-span-2 flex flex-col gap-1.5">
        <Label htmlFor="mp-storage-notes">Storage notes</Label>
        <Input
          id="mp-storage-notes"
          value={value.storage_notes ?? ""}
          onChange={(e) => onChange({ ...value, storage_notes: e.target.value || null })}
        />
      </div>
      <div className="col-span-2 flex items-end gap-2 sm:col-span-4">
        <Button type="submit" disabled={submitting}>
          {isEditing ? "Save changes" : "Create profile"}
        </Button>
        {isEditing && onCancel && (
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  );
}
