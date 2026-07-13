import { cn } from "@/lib/utils";
import { filamentSystemVisual, locationTypeVisual } from "@/lib/deviceType";

interface DeviceTypeIconProps {
  type: string;
  kind: "filament_system" | "location";
  className?: string;
}

/** Small icon+label chip identifying a device module's category (AMS,
 * external spool, room, dry box, ...) -- deliberately neutral-colored, never
 * the ok/warning/critical palette, so it's never mistaken for a health
 * status badge (see StatusBadge for that). */
export function DeviceTypeIcon({ type, kind, className }: DeviceTypeIconProps) {
  const visual = kind === "filament_system" ? filamentSystemVisual(type) : locationTypeVisual(type);
  const Icon = visual.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs font-medium",
        visual.chipClassName,
        className,
      )}
    >
      <Icon className="size-3.5" />
      {visual.label}
    </span>
  );
}
