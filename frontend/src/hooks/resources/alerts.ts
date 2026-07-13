import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { alertsApi } from "@/api/config";

export function useAlerts(params?: { isActive?: boolean; severity?: string; locationId?: number }) {
  return useQuery({
    queryKey: ["alerts", params?.isActive ?? null, params?.severity ?? null, params?.locationId ?? null],
    queryFn: () => alertsApi.list(params),
  });
}

export function useResolveAlert() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => alertsApi.resolve(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["alerts"] }),
  });
}
