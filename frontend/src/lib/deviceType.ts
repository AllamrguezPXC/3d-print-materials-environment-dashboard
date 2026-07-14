import { Archive, Box, Disc3, Fan, Grid2x2, HelpCircle, Home, Layers, PackageCheck, PenLine } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface DeviceTypeVisual {
  icon: LucideIcon;
  label: string;
  chipClassName: string;
}

const NEUTRAL = "bg-muted text-muted-foreground";
const PRIMARY = "bg-primary/10 text-primary";

/** Sibling to lib/status.ts, deliberately not an extension of it:
 * filament_system_type/location_type are categorical/descriptive, not a
 * health severity -- mixing them into statusVariant()'s ok/warning/critical
 * palette would make a device-type badge read as an alert. */
const FILAMENT_SYSTEM_VISUALS: Record<string, DeviceTypeVisual> = {
  ams: { icon: Grid2x2, label: "AMS", chipClassName: PRIMARY },
  external_spool: { icon: Disc3, label: "External Spool", chipClassName: NEUTRAL },
  ams_external_spool: { icon: Layers, label: "AMS + External Spool", chipClassName: PRIMARY },
  storage_only: { icon: Archive, label: "Storage Only", chipClassName: NEUTRAL },
  manual: { icon: PenLine, label: "Manual", chipClassName: NEUTRAL },
};

const LOCATION_TYPE_VISUALS: Record<string, DeviceTypeVisual> = {
  room: { icon: Home, label: "Room", chipClassName: NEUTRAL },
  storage_box: { icon: Box, label: "Storage Box", chipClassName: NEUTRAL },
  dry_box: { icon: PackageCheck, label: "Dry Box", chipClassName: NEUTRAL },
  dryer: { icon: Fan, label: "Dryer", chipClassName: NEUTRAL },
};

const FALLBACK: DeviceTypeVisual = { icon: HelpCircle, label: "Unknown", chipClassName: NEUTRAL };

export function filamentSystemVisual(type: string): DeviceTypeVisual {
  return FILAMENT_SYSTEM_VISUALS[type] ?? FALLBACK;
}

export function locationTypeVisual(type: string): DeviceTypeVisual {
  return LOCATION_TYPE_VISUALS[type] ?? FALLBACK;
}
