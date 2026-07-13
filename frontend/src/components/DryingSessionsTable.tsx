import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { DryingSessionTrendDialog } from "@/components/DryingSessionTrendDialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import type {
  DryingSessionRead,
  DryingSessionStatus,
  DryingSessionUpdate,
  FilamentSpool,
  Location,
  MaterialProfile,
  Sensor,
} from "@/types/api";

const NEXT_STATUSES: Record<DryingSessionStatus, DryingSessionStatus[]> = {
  recommended: ["running", "cancelled"],
  running: ["completed", "failed", "cancelled"],
  completed: [],
  failed: [],
  cancelled: [],
};

interface DryingSessionsTableProps {
  sessions: DryingSessionRead[];
  spools: FilamentSpool[];
  materials: MaterialProfile[];
  locations: Location[];
  sensors: Sensor[];
  onUpdate: (id: number, body: DryingSessionUpdate) => void;
  updating?: boolean;
}

export function DryingSessionsTable({
  sessions,
  spools,
  materials,
  locations,
  sensors,
  onUpdate,
  updating,
}: DryingSessionsTableProps) {
  const [activeSession, setActiveSession] = useState<DryingSessionRead | null>(null);
  const [nextStatus, setNextStatus] = useState<DryingSessionStatus | "">("");
  const [notes, setNotes] = useState("");
  const [trendSession, setTrendSession] = useState<DryingSessionRead | null>(null);

  function spoolLabel(spoolId: number): string {
    const spool = spools.find((s) => s.id === spoolId);
    if (!spool) return `#${spoolId}`;
    const material = materials.find((m) => m.id === spool.material_profile_id);
    return `${material?.name ?? "Unknown"} — ${spool.brand} (#${spool.id})`;
  }

  function locationLabel(locationId: number): string {
    return locations.find((l) => l.id === locationId)?.name ?? `#${locationId}`;
  }

  function sensorLabel(sensorId: number | null): string {
    if (sensorId == null) return "—";
    return sensors.find((s) => s.id === sensorId)?.name ?? `#${sensorId}`;
  }

  function openTransition(session: DryingSessionRead) {
    setActiveSession(session);
    setNextStatus("");
    setNotes(session.validation_notes ?? "");
  }

  function confirmTransition() {
    if (!activeSession || !nextStatus) return;
    onUpdate(activeSession.id, {
      status: nextStatus,
      validation_notes: notes || undefined,
      ended_at: ["completed", "failed", "cancelled"].includes(nextStatus)
        ? new Date().toISOString()
        : undefined,
    });
    setActiveSession(null);
  }

  if (sessions.length === 0) {
    return <p className="text-sm text-muted-foreground">No drying sessions recorded yet.</p>;
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Spool</TableHead>
            <TableHead>Dryer location</TableHead>
            <TableHead>Sensor</TableHead>
            <TableHead>Target</TableHead>
            <TableHead>Started</TableHead>
            <TableHead>Status</TableHead>
            <TableHead />
          </TableRow>
        </TableHeader>
        <TableBody>
          {sessions.map((session) => {
            const availableNext = NEXT_STATUSES[session.status];
            return (
              <TableRow key={session.id}>
                <TableCell>{spoolLabel(session.spool_id)}</TableCell>
                <TableCell>{locationLabel(session.dryer_location_id)}</TableCell>
                <TableCell>{sensorLabel(session.sensor_id)}</TableCell>
                <TableCell>
                  {session.target_temp_c}°C / {session.target_duration_hours}h
                </TableCell>
                <TableCell>{new Date(session.started_at).toLocaleString()}</TableCell>
                <TableCell>
                  <StatusBadge status={session.status} />
                </TableCell>
                <TableCell className="flex gap-2">
                  {session.sensor_id !== null && (
                    <Button size="sm" variant="outline" onClick={() => setTrendSession(session)}>
                      View trend
                    </Button>
                  )}
                  {availableNext.length > 0 && (
                    <Button size="sm" variant="outline" onClick={() => openTransition(session)}>
                      Update status
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      <Dialog open={activeSession !== null} onOpenChange={(open) => !open && setActiveSession(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Update session status</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label>New status</Label>
              <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as DryingSessionStatus)}>
                <SelectTrigger>
                  <SelectValue placeholder="Select next status…" />
                </SelectTrigger>
                <SelectContent>
                  {activeSession &&
                    NEXT_STATUSES[activeSession.status].map((status) => (
                      <SelectItem key={status} value={status}>
                        {status}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="ds-notes">Validation notes</Label>
              <Textarea
                id="ds-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. RH dropped to 18% after 5h, spool marked ready."
              />
            </div>
          </div>
          <DialogFooter>
            <Button onClick={confirmTransition} disabled={!nextStatus || updating}>
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DryingSessionTrendDialog
        session={trendSession}
        onOpenChange={(open) => !open && setTrendSession(null)}
      />
    </>
  );
}
