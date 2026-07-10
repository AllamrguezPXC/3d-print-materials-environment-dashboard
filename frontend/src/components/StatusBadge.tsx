import { Badge } from "@/components/ui/badge";
import { statusVariant } from "@/lib/status";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  label?: string;
  className?: string;
}

/** Renders any status/severity string in the app with a consistent color.
 * See `lib/status.ts` for the full status -> variant mapping. */
export function StatusBadge({ status, label, className }: StatusBadgeProps) {
  return (
    <Badge variant={statusVariant(status)} className={cn("capitalize", className)}>
      {(label ?? status).replaceAll("_", " ")}
    </Badge>
  );
}
