import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import type { FilamentSpool, Location, MaterialProfile, SpoolAssignment } from "@/types/api";

interface SlotAssignmentModalProps {
  location: Location;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAssignment: SpoolAssignment | null;
  currentSpool: FilamentSpool | null;
  currentMaterial: MaterialProfile | null;
  availableSpools: FilamentSpool[];
  materials: MaterialProfile[];
  selectedSpoolId: string;
  onSelectedSpoolIdChange: (value: string) => void;
  onAssign: () => void;
  onClear: () => void;
  assigning?: boolean;
  clearing?: boolean;
}

/** Slot configuration modal -- composes the existing Dialog/Select/StatusBadge
 * primitives (the same interaction shape as SpoolAssignmentForm) rather than a
 * new modal system. */
export function SlotAssignmentModal({
  location,
  open,
  onOpenChange,
  currentAssignment,
  currentSpool,
  currentMaterial,
  availableSpools,
  materials,
  selectedSpoolId,
  onSelectedSpoolIdChange,
  onAssign,
  onClear,
  assigning,
  clearing,
}: SlotAssignmentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Configure {location.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {currentAssignment && currentSpool ? (
            <div className="flex flex-col gap-2 rounded-md border border-border p-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">{currentMaterial?.name ?? "Unknown material"}</span>
                <StatusBadge status={currentSpool.status} />
              </div>
              {currentSpool.color && (
                <span className="text-sm text-muted-foreground">Color: {currentSpool.color}</span>
              )}
              <Button variant="destructive" size="sm" onClick={onClear} disabled={clearing} className="w-fit">
                Clear slot
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">This slot is empty.</p>
          )}

          <div className="flex flex-col gap-2">
            <span className="text-sm font-medium">Assign an existing spool</span>
            <div className="flex items-center gap-2">
              <Select value={selectedSpoolId} onValueChange={onSelectedSpoolIdChange}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select spool…" />
                </SelectTrigger>
                <SelectContent>
                  {availableSpools.map((s) => {
                    const material = materials.find((m) => m.id === s.material_profile_id);
                    return (
                      <SelectItem key={s.id} value={String(s.id)}>
                        {material?.name ?? s.material_profile_id} — {s.brand}
                        {s.color ? ` (${s.color})` : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              <Button size="sm" onClick={onAssign} disabled={assigning || !selectedSpoolId}>
                Assign
              </Button>
            </div>
            {availableSpools.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No unassigned spools available. Add one from the Spools page.
              </p>
            )}
          </div>
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
