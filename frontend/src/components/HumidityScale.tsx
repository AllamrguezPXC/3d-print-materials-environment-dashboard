import { cn } from "@/lib/utils";
import type { MaterialProfile } from "@/types/api";

export type HumidityGrade = "A" | "B" | "C" | "D" | "E";

const GRADES: HumidityGrade[] = ["A", "B", "C", "D", "E"];

const GENERIC_BANDS = { ideal: 40, warning: 60, critical: 80 };

const GRADE_MESSAGES: Record<HumidityGrade, string> = {
  A: "Ideal humidity for this material.",
  B: "Within a safe humidity range.",
  C: "Monitor: humidity is approaching the recommended limit.",
  D: "Humid: dry the filament soon or refresh the desiccant.",
  E: "Very humid: dry before use and validate with the assigned sensor.",
};

/** A-E humidity grade from a relative-humidity reading, against a material's
 * own RH bands when known, or generic bands (40/60/80%) for a bare
 * environmental reading with no material context. Pure function, no
 * fetching -- callers already have both values from existing data. */
export function computeHumidityGrade(
  relativeHumidityPercent: number,
  material?: MaterialProfile | null,
): HumidityGrade {
  const bands = material
    ? {
        ideal: material.ideal_rh_max_percent,
        warning: material.warning_rh_max_percent,
        critical: material.critical_rh_max_percent,
      }
    : GENERIC_BANDS;

  if (relativeHumidityPercent <= bands.ideal * 0.6) return "A";
  if (relativeHumidityPercent <= bands.ideal) return "B";
  if (relativeHumidityPercent <= bands.warning) return "C";
  if (relativeHumidityPercent <= bands.critical) return "D";
  return "E";
}

const GRADE_TONE: Record<HumidityGrade, string> = {
  A: "bg-ok/15 text-ok border-ok/40",
  B: "bg-ok/10 text-ok border-ok/30",
  C: "bg-warning/15 text-warning border-warning/40",
  D: "bg-warning/20 text-warning border-warning/50",
  E: "bg-destructive/15 text-destructive border-destructive/40",
};

interface HumidityScaleProps {
  relativeHumidityPercent: number;
  material?: MaterialProfile | null;
}

/** DRY -> WET humidity scale (A-E), computed client-side from an existing
 * reading + material RH bands -- no backend change. */
export function HumidityScale({ relativeHumidityPercent, material }: HumidityScaleProps) {
  const grade = computeHumidityGrade(relativeHumidityPercent, material);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3">
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-full border text-lg font-semibold",
            GRADE_TONE[grade],
          )}
        >
          {grade}
        </span>
        <div className="flex flex-col">
          <span className="text-sm font-medium">{relativeHumidityPercent.toFixed(1)}% RH</span>
          <span className="text-xs text-muted-foreground">{GRADE_MESSAGES[grade]}</span>
        </div>
      </div>
      <div className="flex items-center gap-1 text-xs">
        <span className="text-muted-foreground">DRY</span>
        {GRADES.map((g) => (
          <span
            key={g}
            className={cn(
              "flex size-5 items-center justify-center rounded-full border text-[10px] font-medium",
              g === grade ? GRADE_TONE[g] : "border-border text-muted-foreground",
            )}
          >
            {g}
          </span>
        ))}
        <span className="text-muted-foreground">WET</span>
      </div>
    </div>
  );
}
