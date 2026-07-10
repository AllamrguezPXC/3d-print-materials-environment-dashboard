import { AmsSlotButton } from "@/components/AmsSlotButton";
import type { FilamentSpool, Location, MaterialProfile, SpoolAssignment } from "@/types/api";

interface AmsSlotGridProps {
  /** This printer's printer_ams locations only, any order. */
  amsLocations: Location[];
  assignments: SpoolAssignment[];
  spools: FilamentSpool[];
  materials: MaterialProfile[];
  selectedLocationId?: number;
  onSelectSlot: (location: Location) => void;
}

/** Visual grid of a printer's AMS slots, ordered by slot_index. Renders an
 * explicit "no AMS configured" state -- never fabricates slots for a
 * printer that has none seeded. */
export function AmsSlotGrid({
  amsLocations,
  assignments,
  spools,
  materials,
  selectedLocationId,
  onSelectSlot,
}: AmsSlotGridProps) {
  if (amsLocations.length === 0) {
    return <p className="text-sm text-muted-foreground">No AMS configured on this printer.</p>;
  }

  const ordered = [...amsLocations].sort(
    (a, b) => (a.slot_index ?? Number.MAX_SAFE_INTEGER) - (b.slot_index ?? Number.MAX_SAFE_INTEGER),
  );

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
      {ordered.map((location, index) => {
        const assignment = assignments.find((a) => a.location_id === location.id && a.is_active);
        const spool = assignment ? (spools.find((s) => s.id === assignment.spool_id) ?? null) : null;
        const material = spool ? (materials.find((m) => m.id === spool.material_profile_id) ?? null) : null;

        return (
          <AmsSlotButton
            key={location.id}
            location={location}
            slotLabel={`A${(location.slot_index ?? index) + 1}`}
            spool={spool}
            material={material}
            selected={location.id === selectedLocationId}
            onClick={() => onSelectSlot(location)}
          />
        );
      })}
    </div>
  );
}
