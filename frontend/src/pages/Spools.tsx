import { useState } from "react";
import { Copy, Pencil, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AddFilamentModal } from "@/components/AddFilamentModal";
import { ColorSwatch } from "@/components/ColorSwatch";
import { EditSpoolModal } from "@/components/EditSpoolModal";
import { EMPTY_FILAMENT_FILTERS, FilamentFilters, type FilamentFiltersValue } from "@/components/FilamentFilters";
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
import {
  useArchiveSpool,
  useCreateSpool,
  useDuplicateSpool,
  useSpools,
  useUpdateSpool,
} from "@/hooks/resources/spools";
import type { FilamentSpool, Location } from "@/types/api";

const EMPTY_SPOOL: SpoolFormValues = { material_profile_id: "", brand: "", color: "", status: "ready" };

const AMS_LOCATION_TYPES = new Set(["printer_ams", "printer_external_spool"]);
const STORAGE_LOCATION_TYPES = new Set(["storage_box", "dry_box", "room", "dryer"]);

export function Spools() {
  const { data: spools = [] } = useSpools();
  const { data: materials = [] } = useMaterials();
  const { data: locations = [] } = useLocations();
  const { data: assignments = [] } = useAssignments();
  const { data: printers = [] } = usePrinters();
  const { notice, notifySuccess, notifyError } = useNotice();

  const createSpool = useCreateSpool();
  const updateSpool = useUpdateSpool();
  const archiveSpool = useArchiveSpool();
  const duplicateSpool = useDuplicateSpool();
  const createAssignment = useCreateAssignment();

  const [modalOpen, setModalOpen] = useState(false);
  const [newSpool, setNewSpool] = useState<SpoolFormValues>(EMPTY_SPOOL);
  const [assignmentDraft, setAssignmentDraft] = useState<Record<number, string>>({});
  const [filters, setFilters] = useState<FilamentFiltersValue>(EMPTY_FILAMENT_FILTERS);
  const [editingSpool, setEditingSpool] = useState<FilamentSpool | null>(null);
  const [editDraft, setEditDraft] = useState<SpoolFormValues>(EMPTY_SPOOL);

  function activeLocationFor(spoolId: number): Location | undefined {
    const assignment = assignments.find((a) => a.spool_id === spoolId && a.is_active);
    return assignment ? locations.find((l) => l.id === assignment.location_id) : undefined;
  }

  function printerNameFor(location: Location | undefined): string {
    if (!location?.printer_id) return "No printer";
    return printers.find((p) => p.id === location.printer_id)?.name ?? "No printer";
  }

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

  function openEdit(spool: FilamentSpool) {
    setEditingSpool(spool);
    setEditDraft({
      material_profile_id: String(spool.material_profile_id),
      brand: spool.brand,
      color: spool.color ?? "",
      status: spool.status,
    });
  }

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingSpool || !editDraft.material_profile_id || !editDraft.brand.trim()) {
      notifyError("Material and brand are required.");
      return;
    }
    updateSpool.mutate(
      {
        id: editingSpool.id,
        body: {
          material_profile_id: Number(editDraft.material_profile_id),
          brand: editDraft.brand,
          color: editDraft.color || null,
          status: editDraft.status,
        },
      },
      {
        onSuccess: () => {
          notifySuccess(`Spool "${editDraft.brand}" updated.`);
          setEditingSpool(null);
        },
        onError: (err) => notifyError(err.message),
      },
    );
  }

  function handleDelete(spool: FilamentSpool) {
    archiveSpool.mutate(spool.id, {
      onSuccess: () => notifySuccess("Spool deleted."),
      onError: (err) => notifyError(err.message),
    });
  }

  function handleDuplicate(spool: FilamentSpool) {
    duplicateSpool.mutate(spool.id, {
      onSuccess: () => notifySuccess("Spool duplicated."),
      onError: (err) => notifyError(err.message),
    });
  }

  const brands = Array.from(new Set(spools.map((s) => s.brand))).sort();

  const filteredSpools = spools.filter((s) => {
    const material = materials.find((m) => m.id === s.material_profile_id);
    const location = activeLocationFor(s.id);

    if (filters.scope === "ams" && !(location && AMS_LOCATION_TYPES.has(location.location_type))) return false;
    if (filters.scope === "storage" && !(location && STORAGE_LOCATION_TYPES.has(location.location_type))) return false;
    if (filters.brand !== "all" && s.brand !== filters.brand) return false;
    if (filters.materialFamily !== "all" && material?.family !== filters.materialFamily) return false;
    if (filters.materialProfileId !== "all" && String(s.material_profile_id) !== filters.materialProfileId) return false;
    if (filters.status !== "all" && s.status !== filters.status) return false;

    if (filters.search.trim()) {
      const haystack = `${s.brand} ${s.color ?? ""} ${material?.name ?? ""}`.toLowerCase();
      if (!haystack.includes(filters.search.trim().toLowerCase())) return false;
    }

    return true;
  });

  function groupLabelFor(spool: FilamentSpool): string {
    const location = activeLocationFor(spool.id);
    if (filters.groupBy === "location") return location?.name ?? "Unassigned";
    if (filters.groupBy === "printer") return printerNameFor(location);
    if (filters.groupBy === "material") {
      return materials.find((m) => m.id === spool.material_profile_id)?.name ?? "Unknown material";
    }
    return "";
  }

  const groups =
    filters.groupBy === "none"
      ? [{ label: null as string | null, spools: filteredSpools }]
      : Array.from(new Set(filteredSpools.map((s) => groupLabelFor(s))))
          .sort()
          .map((label) => ({ label, spools: filteredSpools.filter((s) => groupLabelFor(s) === label) }));

  function renderSpoolRow(s: FilamentSpool) {
    const material = materials.find((m) => m.id === s.material_profile_id);
    const currentLocation = activeLocationFor(s.id);
    return (
      <TableRow key={s.id}>
        <TableCell className="font-medium">{material?.name ?? s.material_profile_id}</TableCell>
        <TableCell>{s.brand}</TableCell>
        <TableCell>
          {s.color ? (
            <span className="flex items-center gap-1.5">
              <ColorSwatch color={s.color} />
              {s.color}
            </span>
          ) : (
            "—"
          )}
        </TableCell>
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
        <TableCell>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => openEdit(s)} title="Edit">
              <Pencil className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => handleDuplicate(s)} title="Duplicate">
              <Copy className="size-3.5" />
            </Button>
            <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(s)} title="Delete">
              <Trash2 className="size-3.5" />
            </Button>
          </div>
        </TableCell>
      </TableRow>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-heading font-semibold">Filament Spools</h1>
        <Button onClick={() => setModalOpen(true)}>Add Filament</Button>
      </div>
      <NoticeBanner notice={notice} />

      <FilamentFilters value={filters} onChange={setFilters} brands={brands} materials={materials} />

      {spools.length === 0 ? (
        <p className="text-sm text-muted-foreground">No filaments registered yet. Add one to get started.</p>
      ) : filteredSpools.length === 0 ? (
        <p className="text-sm text-muted-foreground">No filaments match your filters.</p>
      ) : (
        <div className="flex flex-col gap-4">
          {groups.map((group) => (
            <Card key={group.label ?? "all"}>
              {group.label !== null && (
                <div className="border-b border-border px-4 py-2 text-sm font-medium text-muted-foreground">
                  {group.label}
                </div>
              )}
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
                      <TableHead />
                    </TableRow>
                  </TableHeader>
                  <TableBody>{group.spools.map(renderSpoolRow)}</TableBody>
                </Table>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

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

      {editingSpool && (
        <EditSpoolModal
          open
          onOpenChange={(open) => !open && setEditingSpool(null)}
          value={editDraft}
          onChange={setEditDraft}
          onSubmit={handleEditSubmit}
          materials={materials}
          submitting={updateSpool.isPending}
        />
      )}
    </div>
  );
}
