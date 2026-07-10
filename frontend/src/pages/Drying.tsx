import { useState } from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DryingRecommendationCard } from "@/components/DryingRecommendationCard";
import { DryingSessionForm, type DryingSessionFormInitial } from "@/components/DryingSessionForm";
import { DryingSessionsTable } from "@/components/DryingSessionsTable";
import { useNotice } from "@/hooks/useNotice";
import { NoticeBanner } from "@/components/NoticeBanner";
import {
  useCreateDryingSession,
  useDryingRecommendations,
  useDryingSessions,
  useUpdateDryingSession,
} from "@/hooks/resources/drying";
import { useLocations } from "@/hooks/resources/locations";
import { useMaterials } from "@/hooks/resources/materials";
import { useSpools } from "@/hooks/resources/spools";
import { sensorsApi } from "@/api/config";
import { useQuery } from "@tanstack/react-query";
import type { DryingRecommendation, DryingSessionStatus } from "@/types/api";

const ALL_STATUSES = "all";
const STATUS_OPTIONS: DryingSessionStatus[] = ["recommended", "running", "completed", "failed", "cancelled"];

export function Drying() {
  const { data: recommendations = [] } = useDryingRecommendations();
  const { data: spools = [] } = useSpools();
  const { data: materials = [] } = useMaterials();
  const { data: locations = [] } = useLocations();
  const { data: sensors = [] } = useQuery({ queryKey: ["sensors"], queryFn: sensorsApi.list });
  const { notice, notifySuccess, notifyError } = useNotice();

  const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);
  const { data: sessions = [] } = useDryingSessions(
    statusFilter !== ALL_STATUSES ? { status: statusFilter } : undefined,
  );

  const [formInitial, setFormInitial] = useState<DryingSessionFormInitial | null>(null);

  const createSession = useCreateDryingSession();
  const updateSession = useUpdateDryingSession();

  const dryerLocations = locations.filter((l) => l.location_type === "dryer");

  function handleStartFromRecommendation(rec: DryingRecommendation) {
    setFormInitial({
      spool_id: rec.spool_id,
      dryer_location_id: rec.dryer_location_id ?? undefined,
      target_temp_c: rec.drying_temp_c,
      target_duration_hours: rec.drying_time_hours_max,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-heading font-semibold">Drying</h1>
          <p className="text-sm text-muted-foreground">
            Advisory only — this dashboard does not control any dryer directly. Verify dryer
            capability and monitor humidity with a sensor before marking a spool ready.
          </p>
        </div>
        <Button onClick={() => setFormInitial({})} className="gap-2">
          <Plus className="size-4" />
          New session
        </Button>
      </div>

      <NoticeBanner notice={notice} />

      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">Recommendations</h2>
        {recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No spools currently need drying.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recommendations.map((rec) => (
              <DryingRecommendationCard
                key={rec.spool_id}
                rec={rec}
                onStartSession={handleStartFromRecommendation}
              />
            ))}
          </div>
        )}
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Sessions</CardTitle>
          <div className="flex flex-col gap-1.5">
            <Label className="sr-only">Status filter</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_STATUSES}>All statuses</SelectItem>
                {STATUS_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <DryingSessionsTable
            sessions={sessions}
            spools={spools}
            materials={materials}
            locations={locations}
            sensors={sensors}
            updating={updateSession.isPending}
            onUpdate={(id, body) =>
              updateSession.mutate(
                { id, body },
                {
                  onSuccess: () => notifySuccess("Session updated."),
                  onError: (err) => notifyError(err.message),
                },
              )
            }
          />
        </CardContent>
      </Card>

      <Dialog open={formInitial !== null} onOpenChange={(open) => !open && setFormInitial(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Start a drying session</DialogTitle>
          </DialogHeader>
          <DryingSessionForm
            spools={spools}
            materials={materials}
            dryerLocations={dryerLocations}
            sensors={sensors}
            initial={formInitial ?? undefined}
            submitting={createSession.isPending}
            onSubmit={(body) =>
              createSession.mutate(body, {
                onSuccess: () => {
                  notifySuccess("Drying session started.");
                  setFormInitial(null);
                },
                onError: (err) => notifyError(err.message),
              })
            }
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
