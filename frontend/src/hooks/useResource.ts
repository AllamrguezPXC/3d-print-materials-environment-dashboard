import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

interface ResourceApi<T, TCreate, TUpdate> {
  list: (params?: { deletedOnly?: boolean }) => Promise<T[]>;
  create?: (body: TCreate) => Promise<T>;
  update?: (id: number, body: TUpdate) => Promise<T>;
  remove?: (id: number) => Promise<unknown>;
  archive?: (id: number) => Promise<T>;
  restore?: (id: number) => Promise<T>;
  duplicate?: (id: number) => Promise<T>;
}

interface ResourceHooksOptions {
  /** Extra query keys to invalidate when this resource is created/updated/
   * removed (e.g. creating a SpoolAssignment should also refresh "spools"). */
  invalidates?: string[];
}

/**
 * Wires a resource's list/create/update/remove API functions to TanStack
 * Query, replacing the hand-rolled `useEffect(refresh)` + try/catch/notify
 * pattern that used to be duplicated across Printers/Materials/Spools.
 *
 * Notification (success/error messages) stays the caller's responsibility —
 * pass `{ onSuccess, onError }` to the returned mutation's `.mutate()` call,
 * since the message text is page-specific, not resource-specific.
 */
export function createResourceHooks<T, TCreate = Partial<T>, TUpdate = Partial<T>>(
  queryKey: string,
  api: ResourceApi<T, TCreate, TUpdate>,
  options?: ResourceHooksOptions,
) {
  const invalidateKeys = [queryKey, ...(options?.invalidates ?? [])];

  function useList(params?: { deletedOnly?: boolean }) {
    return useQuery({ queryKey: [queryKey, params], queryFn: () => api.list(params) });
  }

  function useInvalidateAll() {
    const queryClient = useQueryClient();
    return () => invalidateKeys.forEach((key) => queryClient.invalidateQueries({ queryKey: [key] }));
  }

  function useCreate() {
    const invalidateAll = useInvalidateAll();
    return useMutation({
      mutationFn: (body: TCreate) => api.create!(body),
      onSuccess: invalidateAll,
    });
  }

  function useUpdate() {
    const invalidateAll = useInvalidateAll();
    return useMutation({
      mutationFn: ({ id, body }: { id: number; body: TUpdate }) => api.update!(id, body),
      onSuccess: invalidateAll,
    });
  }

  function useRemove() {
    const invalidateAll = useInvalidateAll();
    return useMutation({
      mutationFn: (id: number) => api.remove!(id),
      onSuccess: invalidateAll,
    });
  }

  function useArchive() {
    const invalidateAll = useInvalidateAll();
    return useMutation({
      mutationFn: (id: number) => api.archive!(id),
      onSuccess: invalidateAll,
    });
  }

  function useRestore() {
    const invalidateAll = useInvalidateAll();
    return useMutation({
      mutationFn: (id: number) => api.restore!(id),
      onSuccess: invalidateAll,
    });
  }

  function useDuplicate() {
    const invalidateAll = useInvalidateAll();
    return useMutation({
      mutationFn: (id: number) => api.duplicate!(id),
      onSuccess: invalidateAll,
    });
  }

  return { useList, useCreate, useUpdate, useRemove, useArchive, useRestore, useDuplicate };
}
