import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { dryingApi } from "@/api/config";
import { getReadingsHistory } from "@/api/readings";
import type { DryingSessionCreate, DryingSessionRead, DryingSessionUpdate } from "@/types/api";

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

/** A session's own measured trend (Requirements.md section 11.6: "review
 * measured trend"), reusing the existing GET /readings aggregate endpoint
 * over the session's own started_at..ended_at window -- no new backend
 * endpoint needed. */
export function useDryingSessionTrend(session: DryingSessionRead | null) {
  return useQuery({
    queryKey: ["drying-session-trend", session?.id ?? null],
    queryFn: () =>
      getReadingsHistory({
        from: session!.started_at,
        to: session!.ended_at ?? new Date().toISOString(),
        sensorId: session!.sensor_id ?? undefined,
        aggregate: "hour",
      }),
    enabled: session !== null && session.sensor_id !== null,
  });
}
