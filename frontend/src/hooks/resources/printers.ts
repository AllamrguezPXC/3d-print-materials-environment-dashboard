import { printersApi } from "@/api/config";
import { createResourceHooks } from "@/hooks/useResource";
import type { Printer } from "@/types/api";

// A printer update can change filament_system_type, which triggers the
// backend's non-destructive Location-row sync (creates any missing AMS/
// external-spool locations for the new type) -- invalidate "locations" too
// so the Dashboard picks up newly-created slots without a manual refetch.
const hooks = createResourceHooks<Printer>("printers", printersApi, { invalidates: ["locations"] });

export const usePrinters = hooks.useList;
export const useCreatePrinter = hooks.useCreate;
export const useUpdatePrinter = hooks.useUpdate;
export const useRemovePrinter = hooks.useRemove;
