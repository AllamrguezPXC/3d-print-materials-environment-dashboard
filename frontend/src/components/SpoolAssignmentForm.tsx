import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Location } from "@/types/api";

interface SpoolAssignmentFormProps {
  locations: Location[];
  value: string;
  onChange: (locationId: string) => void;
  onAssign: () => void;
  submitting?: boolean;
}

/** Inline per-row control for assigning a spool to a location (Requirements.md 14.2). */
export function SpoolAssignmentForm({ locations, value, onChange, onAssign, submitting }: SpoolAssignmentFormProps) {
  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-44">
          <SelectValue placeholder="Select location…" />
        </SelectTrigger>
        <SelectContent>
          {locations.map((l) => (
            <SelectItem key={l.id} value={String(l.id)}>
              {l.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" onClick={onAssign} disabled={submitting}>
        Assign
      </Button>
    </div>
  );
}
