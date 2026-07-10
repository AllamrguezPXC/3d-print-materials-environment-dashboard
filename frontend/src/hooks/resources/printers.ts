import { printersApi } from "@/api/config";
import { createResourceHooks } from "@/hooks/useResource";
import type { Printer } from "@/types/api";

const hooks = createResourceHooks<Printer>("printers", printersApi);

export const usePrinters = hooks.useList;
export const useCreatePrinter = hooks.useCreate;
export const useUpdatePrinter = hooks.useUpdate;
export const useRemovePrinter = hooks.useRemove;
