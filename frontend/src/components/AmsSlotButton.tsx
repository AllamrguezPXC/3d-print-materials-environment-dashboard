import { cn } from "@/lib/utils";
import { ColorSwatch } from "@/components/ColorSwatch";
import { StatusBadge } from "@/components/StatusBadge";
import type { FilamentSpool, Location, MaterialProfile } from "@/types/api";

interface AmsSlotButtonProps {
  location: Location;
  slotLabel: string;
  spool: FilamentSpool | null;
  material: MaterialProfile | null;
  selected?: boolean;
  onClick: () => void;
}

/** One clickable AMS slot. Renders a real empty state when no spool is
 * assigned -- never fabricates material/status data. */
export function AmsSlotButton({ location, slotLabel, spool, material, selected, onClick }: AmsSlotButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={location.name}
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-md border p-3 text-left transition-colors hover:border-primary/60",
        selected ? "border-primary bg-primary/5" : "border-border bg-card",
      )}
    >
      <span className="text-xs font-medium text-muted-foreground">{slotLabel}</span>
      {spool ? (
        <>
          <span className="text-sm font-semibold">{material?.name ?? "Unknown material"}</span>
          {spool.color && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <ColorSwatch color={spool.color} />
              {spool.color}
            </span>
          )}
          <StatusBadge status={spool.status} />
        </>
      ) : (
        <span className="py-1 text-xs text-muted-foreground">Empty</span>
      )}
    </button>
  );
}
