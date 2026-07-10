import { locationsApi } from "@/api/config";
import { createResourceHooks } from "@/hooks/useResource";
import type { Location } from "@/types/api";

const hooks = createResourceHooks<Location>("locations", locationsApi);

export const useLocations = hooks.useList;
export const useCreateLocation = hooks.useCreate;
export const useUpdateLocation = hooks.useUpdate;
export const useRemoveLocation = hooks.useRemove;
