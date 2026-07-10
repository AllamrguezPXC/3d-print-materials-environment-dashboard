import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dryingApi } from "@/api/config";
import type { DryingSessionCreate, DryingSessionUpdate } from "@/types/api";

export function useDryingRecommendations(refetchInterval = 15_000) {
  return useQuery({
    queryKey: ["drying-recommendations"],
    queryFn: dryingApi.recommendations,
    refetchInterval,
  });
}

export function useDryingSessions(params?: { spoolId?: number; status?: string }) {
  return useQuery({
    queryKey: ["drying-sessions", params?.spoolId ?? null, params?.status ?? null],
    queryFn: () => dryingApi.sessions.list(params),
  });
}

export function useCreateDryingSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: DryingSessionCreate) => dryingApi.sessions.create(body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drying-sessions"] }),
  });
}

export function useUpdateDryingSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: number; body: DryingSessionUpdate }) =>
      dryingApi.sessions.update(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["drying-sessions"] }),
  });
}
