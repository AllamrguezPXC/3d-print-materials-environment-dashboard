import { materialsApi } from "@/api/config";
import { createResourceHooks } from "@/hooks/useResource";
import type { MaterialProfile } from "@/types/api";

const hooks = createResourceHooks<MaterialProfile>("materials", materialsApi);

export const useMaterials = hooks.useList;
export const useCreateMaterial = hooks.useCreate;
export const useUpdateMaterial = hooks.useUpdate;
export const useRemoveMaterial = hooks.useRemove;
