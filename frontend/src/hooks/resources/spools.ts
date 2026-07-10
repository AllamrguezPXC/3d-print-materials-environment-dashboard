import { spoolsApi } from "@/api/config";
import { createResourceHooks } from "@/hooks/useResource";
import type { FilamentSpool } from "@/types/api";

const hooks = createResourceHooks<FilamentSpool>("spools", spoolsApi);

export const useSpools = hooks.useList;
export const useCreateSpool = hooks.useCreate;
export const useUpdateSpool = hooks.useUpdate;
export const useRemoveSpool = hooks.useRemove;
