import { useQuery } from "@tanstack/react-query";
import { sensorsApi } from "@/api/config";

/** Detected serial ports are transient host state, not a persisted resource
 * -- a plain query, not a full useResource CRUD hook. Not polled by default;
 * callers refetch on demand (e.g. a "Scan" button). */
export function useSensorPorts() {
  return useQuery({ queryKey: ["sensor-ports"], queryFn: sensorsApi.ports, enabled: false });
}
