import type { badgeVariants } from "@/components/ui/badge";
import type { VariantProps } from "class-variance-authority";

export type BadgeVariant = NonNullable<VariantProps<typeof badgeVariants>["variant"]>;

/**
 * Every status/severity string used anywhere in the app, mapped to a single
 * badge variant. Extend this map when a new status value is introduced
 * instead of writing another local `xBadgeClass`/`xVariant` helper.
 */
const STATUS_VARIANT_MAP: Record<string, BadgeVariant> = {
  // Alert severity (AlertOut.severity) + drying recommendation current_status
  ok: "ok",
  info: "secondary",
  warning: "warning",
  critical: "critical",

  // FilamentSpool.status
  ready: "ok",
  watch: "warning",
  needs_drying: "critical",
  quarantine: "critical",
  unknown: "secondary",

  // DryingSession.status
  recommended: "secondary",
  running: "warning",
  completed: "ok",
  failed: "critical",
  cancelled: "secondary",
};

export function statusVariant(status: string): BadgeVariant {
  return STATUS_VARIANT_MAP[status] ?? "secondary";
}
