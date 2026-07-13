import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface EnvMetricTileProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "default" | "ok" | "warning" | "critical";
}

const TONE_CLASSES: Record<NonNullable<EnvMetricTileProps["tone"]>, string> = {
  default: "bg-primary/10 text-primary",
  ok: "bg-ok/15 text-ok",
  warning: "bg-warning/15 text-warning",
  critical: "bg-destructive/15 text-destructive",
};

/** Denser sibling of ReadingCard for the Dashboard's compact device-module
 * tiles -- same tone semantics, smaller footprint (no Card wrapper), so
 * several fit in one row inside a device panel. */
export function EnvMetricTile({ label, value, icon: Icon, tone = "default" }: EnvMetricTileProps) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border bg-card/60 p-2">
      <div className={cn("flex size-6 shrink-0 items-center justify-center rounded-full", TONE_CLASSES[tone])}>
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0">
        <div className="truncate text-[10px] font-medium tracking-wide text-muted-foreground uppercase">
          {label}
        </div>
        <div className="truncate text-sm font-semibold tabular-nums">{value}</div>
      </div>
    </div>
  );
}
