import type { FilamentSpool, SpoolAssignment } from "@/types/api";

/** A spool is "available" to assign to a slot when no active SpoolAssignment
 * references it anywhere in the system (a spool is physically in exactly one
 * place at a time), except the spool already sitting in the slot currently
 * being edited -- that one must stay selectable so the modal can show/keep
 * the current selection. Extracted from DeviceModuleGrid.tsx/PrinterDetail.tsx,
 * which previously duplicated this exact filter. */
export function getAvailableSpools(
  spools: FilamentSpool[],
  assignments: SpoolAssignment[],
  currentSpoolId: number | null | undefined,
): FilamentSpool[] {
  const activeSpoolIds = new Set(assignments.filter((a) => a.is_active).map((a) => a.spool_id));
  return spools.filter((s) => !activeSpoolIds.has(s.id) || s.id === currentSpoolId);
}
