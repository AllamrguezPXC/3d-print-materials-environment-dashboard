import { useState } from "react";
import { Boxes, Copy } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NoticeBanner } from "@/components/NoticeBanner";
import { MaterialProfileForm, type MaterialProfileFormValues } from "@/components/MaterialProfileForm";
import { useNotice } from "@/hooks/useNotice";
import {
  useArchiveMaterial,
  useCreateMaterial,
  useDuplicateMaterial,
  useMaterials,
  useUpdateMaterial,
} from "@/hooks/resources/materials";
import type { MaterialProfile } from "@/types/api";

const EMPTY_DRAFT: MaterialProfileFormValues = {
  name: "",
  family: "",
  manufacturer: null,
  variant: null,
  ideal_temp_min_c: 18,
  ideal_temp_max_c: 30,
  warning_temp_min_c: 13,
  warning_temp_max_c: 35,
  critical_temp_min_c: 8,
  critical_temp_max_c: 40,
  ideal_rh_max_percent: 40,
  warning_rh_max_percent: 50,
  critical_rh_max_percent: 60,
  drying_temp_c: 45,
  drying_time_hours_min: 4,
  drying_time_hours_max: 6,
  storage_notes: null,
  drying_notes: null,
  source_notes: null,
  deleted_at: null,
};

export function Materials() {
  const { data: profiles = [] } = useMaterials();
  const { notice, notifySuccess, notifyError } = useNotice();
  const createMaterial = useCreateMaterial();
  const updateMaterial = useUpdateMaterial();
  const archiveMaterial = useArchiveMaterial();
  const duplicateMaterial = useDuplicateMaterial();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<MaterialProfileFormValues>(EMPTY_DRAFT);

  function startEdit(profile: MaterialProfile) {
    setEditingId(profile.id);
    const { id: _id, ...rest } = profile;
    setDraft(rest);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim() || !draft.family.trim()) {
      notifyError("Name and family are required.");
      return;
    }

    if (editingId !== null) {
      updateMaterial.mutate(
        { id: editingId, body: draft },
        {
          onSuccess: () => {
            notifySuccess(`Profile "${draft.name}" updated.`);
            cancelEdit();
          },
          onError: (err) => notifyError(err.message),
        },
      );
    } else {
      createMaterial.mutate(draft, {
        onSuccess: () => {
          notifySuccess(`Profile "${draft.name}" created.`);
          cancelEdit();
        },
        onError: (err) => notifyError(err.message),
      });
    }
  }

  function handleDelete(id: number) {
    archiveMaterial.mutate(id, {
      onSuccess: () => {
        notifySuccess("Profile deleted.");
        if (editingId === id) cancelEdit();
      },
      onError: (err) => notifyError(err.message),
    });
  }

  function handleDuplicate(id: number) {
    duplicateMaterial.mutate(id, {
      onSuccess: () => notifySuccess("Profile duplicated."),
      onError: (err) => notifyError(err.message),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-heading font-semibold">Material Profiles</h1>
        <p className="text-sm text-muted-foreground">
          Thresholds and drying recommendations are editable — manufacturer-specific profiles should
          override generic family defaults.
        </p>
      </div>
      <NoticeBanner notice={notice} />

      <Card>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Family</TableHead>
                <TableHead>Manufacturer</TableHead>
                <TableHead>Ideal RH max</TableHead>
                <TableHead>Warning RH max</TableHead>
                <TableHead>Critical RH max</TableHead>
                <TableHead>Drying temp</TableHead>
                <TableHead>Drying time</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {profiles.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.family}</TableCell>
                  <TableCell>
                    {p.manufacturer ?? <span className="text-muted-foreground">Generic</span>}
                  </TableCell>
                  <TableCell>{p.ideal_rh_max_percent}%</TableCell>
                  <TableCell>{p.warning_rh_max_percent}%</TableCell>
                  <TableCell>{p.critical_rh_max_percent}%</TableCell>
                  <TableCell>{p.drying_temp_c}°C</TableCell>
                  <TableCell>
                    {p.drying_time_hours_min}-{p.drying_time_hours_max}h
                  </TableCell>
                  <TableCell className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => startEdit(p)}>
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleDuplicate(p.id)}>
                      <Copy className="size-3.5" />
                      Duplicate
                    </Button>
                    <Button variant="destructive" size="sm" onClick={() => handleDelete(p.id)}>
                      Delete
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Boxes className="size-4 text-muted-foreground" />
            {editingId !== null ? "Edit profile" : "New profile"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <MaterialProfileForm
            value={draft}
            onChange={setDraft}
            onSubmit={handleSave}
            onCancel={cancelEdit}
            isEditing={editingId !== null}
            submitting={createMaterial.isPending || updateMaterial.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
