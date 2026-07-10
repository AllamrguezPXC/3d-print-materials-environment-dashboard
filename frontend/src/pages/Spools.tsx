import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddFilamentModal } from "@/components/AddFilamentModal";
import { NoticeBanner } from "@/components/NoticeBanner";
import { SpoolAssignmentForm } from "@/components/SpoolAssignmentForm";
import type { AmsImportValues } from "@/components/ReadFromAmsPanel";
import { type SpoolFormValues } from "@/components/SpoolForm";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNotice } from "@/hooks/useNotice";
import { useAssignments, useCreateAssignment } from "@/hooks/resources/assignments";
import { useLocations } from "@/hooks/resources/locations";
import { useMaterials } from "@/hooks/resources/materials";
import { usePrinters } from "@/hooks/resources/printers";
import { useCreateSpool, useSpools } from "@/hooks/resources/spools";
import type { Location } from "@/types/api";

const EMPTY_SPOOL: SpoolFormValues = { material_profile_id: "", brand: "", color: "", status: "ready" };

export function Spools() {
  const { data: spools = [] } = useSpools();
  const { data: materials = [] } = useMaterials();
  const { data: locations = [] } = useLocations();
  const { data: assignments = [] } = useAssignments();
  const { data: printers = [] } = usePrinters();
  const { notice, notifySuccess, notifyError } = useNotice();

  const createSpool = useCreateSpool();
  const createAssignment = useCreateAssignment();

  const [modalOpen, setModalOpen] = useState(false);
  const [newSpool, setNewSpool] = useState<SpoolFormValues>(EMPTY_SPOOL);
  const [assignmentDraft, setAssignmentDraft] = useState<Record<number, string>>({});

  function handleAddSpool(e: React.FormEvent) {
    e.preventDefault();
    if (!newSpool.material_profile_id || !newSpool.brand.trim()) {
      notifyError("Material and brand are required.");
      return;
    }
    createSpool.mutate(
      {
        material_profile_id: Number(newSpool.material_profile_id),
        brand: newSpool.brand,
        color: newSpool.color || null,
        status: newSpool.status,
      },
      {
        onSuccess: () => {
          notifySuccess(`Spool "${newSpool.brand}" added.`);
          setNewSpool(EMPTY_SPOOL);
          setModalOpen(false);
        },
        onError: (err) => notifyError(err.message),
      },
    );
  }

  async function handleImportFromAms(slotLocationIds: number[], values: AmsImportValues) {
    try {
      for (const locationId of slotLocationIds) {
        const spool = await createSpool.mutateAsync({
          material_profile_id: values.material_profile_id,
          brand: values.brand,
          color: values.color || null,
          status: values.status,
        });
        await createAssignment.mutateAsync({ spool_id: spool.id, location_id: locationId, is_active: true });
      }
      notifySuccess(`${slotLocationIds.length} filament${slotLocationIds.length > 1 ? "s" : ""} added from AMS.`);
      setModalOpen(false);
    } catch (err) {
      notifyError((err as Error).message);
    }
  }

  function handleAssign(spoolId: number) {
    const locationId = assignmentDraft[spoolId];
    if (!locationId) {
      notifyError("Select a location before assigning.");
      return;
    }
    createAssignment.mutate(
      { spool_id: spoolId, location_id: Number(locationId), is_active: true },
      {
        onSuccess: () => notifySuccess("Spool assigned."),
        onError: (err) => notifyError(err.message),
      },
    );
  }

  function activeLocationFor(spoolId: number): Location | undefined {
    const assignment = assignments.find((a) => a.spool_id === spoolId && a.is_active);
    return assignment ? locations.find((l) => l.id === assignment.location_id) : undefined;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-heading font-semibold">Filament Spools</h1>
        <Button onClick={() => setModalOpen(true)}>Add Filament</Button>
      </div>
      <NoticeBanner notice={notice} />

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assigned location</TableHead>
                <TableHead>Assign to…</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {spools.map((s) => {
                const material = materials.find((m) => m.id === s.material_profile_id);
                const currentLocation = activeLocationFor(s.id);
                return (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{material?.name ?? s.material_profile_id}</TableCell>
                    <TableCell>{s.brand}</TableCell>
                    <TableCell>{s.color ?? "—"}</TableCell>
                    <TableCell>
                      <StatusBadge status={s.status} />
                    </TableCell>
                    <TableCell>{currentLocation?.name ?? "Unassigned"}</TableCell>
                    <TableCell>
                      <SpoolAssignmentForm
                        locations={locations}
                        value={assignmentDraft[s.id] ?? ""}
                        onChange={(locationId) => setAssignmentDraft({ ...assignmentDraft, [s.id]: locationId })}
                        onAssign={() => handleAssign(s.id)}
                        submitting={createAssignment.isPending}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <AddFilamentModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        materials={materials}
        printers={printers}
        locations={locations}
        assignments={assignments}
        manualValue={newSpool}
        onManualChange={setNewSpool}
        onManualSubmit={handleAddSpool}
        manualSubmitting={createSpool.isPending}
        onImportFromAms={handleImportFromAms}
        importSubmitting={createSpool.isPending || createAssignment.isPending}
      />
    </div>
  );
}
