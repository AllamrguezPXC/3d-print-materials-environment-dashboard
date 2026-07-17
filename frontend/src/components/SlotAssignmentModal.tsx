import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { SpoolForm, type SpoolFormValues } from "@/components/SpoolForm";
import { useCreateSpool } from "@/hooks/resources/spools";
import type { FilamentSpool, Location, MaterialProfile, SpoolAssignment } from "@/types/api";

const EMPTY_NEW_SPOOL: SpoolFormValues = { material_profile_id: "", brand: "", color: "", status: "ready" };

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
  const [creatingSpool, setCreatingSpool] = useState(false);
  const [newSpool, setNewSpool] = useState<SpoolFormValues>(EMPTY_NEW_SPOOL);
  const createSpool = useCreateSpool();

  function handleCreateSpool(e: React.FormEvent) {
    e.preventDefault();
    if (!newSpool.material_profile_id || !newSpool.brand.trim()) return;
    createSpool.mutate(
      {
        material_profile_id: Number(newSpool.material_profile_id),
        brand: newSpool.brand,
        color: newSpool.color || null,
        status: newSpool.status,
      },
      {
        onSuccess: (created) => {
          onSelectedSpoolIdChange(String(created.id));
          setNewSpool(EMPTY_NEW_SPOOL);
          setCreatingSpool(false);
        },
      },
    );
  }

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
                <SelectTrigger className="min-w-0 flex-1">
                  <SelectValue placeholder="Select spool…" />
                </SelectTrigger>
                <SelectContent>
                  {availableSpools.map((s) => {
                    const material = materials.find((m) => m.id === s.material_profile_id);
                    return (
                      <SelectItem key={s.id} value={String(s.id)}>
                        <span className="flex items-center gap-2">
                          <span>
                            {material?.name ?? s.material_profile_id} — {s.brand}
                            {s.color ? ` (${s.color})` : ""}
                          </span>
                          <StatusBadge status={s.status} />
                        </span>
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
              <p className="text-xs text-muted-foreground">No unassigned spools available.</p>
            )}
          </div>

          {creatingSpool ? (
            <div className="flex flex-col gap-2 rounded-md border border-border p-3">
              <span className="text-sm font-medium">New spool</span>
              <SpoolForm
                value={newSpool}
                onChange={setNewSpool}
                onSubmit={handleCreateSpool}
                materials={materials}
                submitting={createSpool.isPending}
                submitLabel="Create & select"
              />
            </div>
          ) : (
            <Button variant="outline" size="sm" className="w-fit" onClick={() => setCreatingSpool(true)}>
              + Create new spool
            </Button>
          )}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
