import { useMutation } from "@tanstack/react-query";
import { sensorsApi } from "@/api/config";
import { createResourceHooks } from "@/hooks/useResource";
import type { Sensor } from "@/types/api";

// A sensor create/update/reassignment changes what GET /readings/current
// returns for the affected location (which entry a Dashboard card reads from),
// but that response is cached under a different query key ("current-reading",
// not "sensors") -- invalidate it too so the Dashboard doesn't wait for its
// next poll tick to reflect the change.
const hooks = createResourceHooks<Sensor>("sensors", sensorsApi, {
  invalidates: ["current-reading"],
});

export const useSensors = hooks.useList;
export const useCreateSensor = hooks.useCreate;
export const useUpdateSensor = hooks.useUpdate;
export const useRemoveSensor = hooks.useRemove;

export function useTestReadSensor() {
  return useMutation({ mutationFn: (id: number) => sensorsApi.testRead(id) });
}
