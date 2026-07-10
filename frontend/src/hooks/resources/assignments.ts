import { assignmentsApi } from "@/api/config";
import { createResourceHooks } from "@/hooks/useResource";
import type { SpoolAssignment } from "@/types/api";

// Assigning/reassigning a spool changes what location it shows as "current"
// on the Spools page, so also invalidate the "spools" query.
const hooks = createResourceHooks<SpoolAssignment>("assignments", assignmentsApi, {
  invalidates: ["spools"],
});

export const useAssignments = hooks.useList;
export const useCreateAssignment = hooks.useCreate;
export const useUpdateAssignment = hooks.useUpdate;
export const useRemoveAssignment = hooks.useRemove;
