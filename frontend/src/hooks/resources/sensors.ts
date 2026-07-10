import { useMutation } from "@tanstack/react-query";
import { sensorsApi } from "@/api/config";
import { createResourceHooks } from "@/hooks/useResource";
import type { Sensor } from "@/types/api";

const hooks = createResourceHooks<Sensor>("sensors", sensorsApi);

export const useSensors = hooks.useList;
export const useCreateSensor = hooks.useCreate;
export const useUpdateSensor = hooks.useUpdate;
export const useRemoveSensor = hooks.useRemove;

export function useTestReadSensor() {
  return useMutation({ mutationFn: (id: number) => sensorsApi.testRead(id) });
}
