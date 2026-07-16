import { Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NoticeBanner } from "@/components/NoticeBanner";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNotice } from "@/hooks/useNotice";
import {
  useLocations,
  useRemoveLocation,
  useRestoreLocation,
} from "@/hooks/resources/locations";
import { useMaterials, useRemoveMaterial, useRestoreMaterial } from "@/hooks/resources/materials";
import {
  usePrinters,
  useRemovePrinter,
  useRestorePrinter,
} from "@/hooks/resources/printers";
import { useRemoveSensor, useRestoreSensor, useSensors } from "@/hooks/resources/sensors";
import { useRemoveSpool, useRestoreSpool, useSpools } from "@/hooks/resources/spools";

type TrashItemType = "printer" | "sensor" | "location" | "material" | "spool";

interface TrashItem {
  type: TrashItemType;
  id: number;
  label: string;
  deletedAt: string;
}

export function Trash() {
  const { notice, notifySuccess, notifyError } = useNotice();

  const { data: deletedPrinters = [] } = usePrinters({ deletedOnly: true });
  const { data: deletedSensors = [] } = useSensors({ deletedOnly: true });
  const { data: deletedLocations = [] } = useLocations({ deletedOnly: true });
  const { data: deletedMaterials = [] } = useMaterials({ deletedOnly: true });
  const { data: deletedSpools = [] } = useSpools({ deletedOnly: true });
  const { data: materials = [] } = useMaterials();

  const restorePrinter = useRestorePrinter();
  const restoreSensor = useRestoreSensor();
  const restoreLocation = useRestoreLocation();
  const restoreMaterial = useRestoreMaterial();
  const restoreSpool = useRestoreSpool();

  const removePrinter = useRemovePrinter();
  const removeSensor = useRemoveSensor();
  const removeLocation = useRemoveLocation();
  const removeMaterial = useRemoveMaterial();
  const removeSpool = useRemoveSpool();

  const items: TrashItem[] = [
    ...deletedPrinters
      .filter((p) => p.deleted_at)
      .map((p) => ({ type: "printer" as const, id: p.id, label: p.name, deletedAt: p.deleted_at! })),
    ...deletedSensors
      .filter((s) => s.deleted_at)
      .map((s) => ({ type: "sensor" as const, id: s.id, label: s.name, deletedAt: s.deleted_at! })),
    ...deletedLocations
      .filter((l) => l.deleted_at)
      .map((l) => ({ type: "location" as const, id: l.id, label: l.name, deletedAt: l.deleted_at! })),
    ...deletedMaterials
      .filter((m) => m.deleted_at)
      .map((m) => ({ type: "material" as const, id: m.id, label: m.name, deletedAt: m.deleted_at! })),
    ...deletedSpools
      .filter((s) => s.deleted_at)
      .map((s) => {
        const material = materials.find((m) => m.id === s.material_profile_id);
        const label = `${s.brand} — ${material?.name ?? "Unknown material"}${s.color ? ` (${s.color})` : ""}`;
        return { type: "spool" as const, id: s.id, label, deletedAt: s.deleted_at! };
      }),
  ].sort((a, b) => new Date(b.deletedAt).getTime() - new Date(a.deletedAt).getTime());

  function handleRestore(item: TrashItem) {
    const onSuccess = () => notifySuccess(`${labelForType(item.type)} restored.`);
    const onError = (err: Error) => notifyError(err.message);
    switch (item.type) {
      case "printer":
        restorePrinter.mutate(item.id, { onSuccess, onError });
        break;
      case "sensor":
        restoreSensor.mutate(item.id, { onSuccess, onError });
        break;
      case "location":
        restoreLocation.mutate(item.id, { onSuccess, onError });
        break;
      case "material":
        restoreMaterial.mutate(item.id, { onSuccess, onError });
        break;
      case "spool":
        restoreSpool.mutate(item.id, { onSuccess, onError });
        break;
    }
  }

  function handleDeletePermanently(item: TrashItem) {
    if (!window.confirm(`Permanently delete this ${labelForType(item.type).toLowerCase()}? This cannot be undone.`)) {
      return;
    }
    const onSuccess = () => notifySuccess(`${labelForType(item.type)} permanently deleted.`);
    const onError = (err: Error) => notifyError(err.message);
    switch (item.type) {
      case "printer":
        removePrinter.mutate(item.id, { onSuccess, onError });
        break;
      case "sensor":
        removeSensor.mutate(item.id, { onSuccess, onError });
        break;
      case "location":
        removeLocation.mutate(item.id, { onSuccess, onError });
        break;
      case "material":
        removeMaterial.mutate(item.id, { onSuccess, onError });
        break;
      case "spool":
        removeSpool.mutate(item.id, { onSuccess, onError });
        break;
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-heading font-semibold">Trash</h1>
        <p className="text-sm text-muted-foreground">
          Archived printers, sensors, locations, materials, and spools. Restore them or delete them
          permanently.
        </p>
      </div>
      <NoticeBanner notice={notice} />

      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">Trash is empty.</p>
      ) : (
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Deleted at</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((item) => (
                  <TableRow key={`${item.type}-${item.id}`}>
                    <TableCell className="capitalize">{item.type}</TableCell>
                    <TableCell className="font-medium">{item.label}</TableCell>
                    <TableCell>{new Date(item.deletedAt).toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="outline" size="sm" onClick={() => handleRestore(item)}>
                          Restore
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeletePermanently(item)}
                        >
                          <Trash2 className="size-3.5" />
                          Delete permanently
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function labelForType(type: TrashItemType): string {
  switch (type) {
    case "printer":
      return "Printer";
    case "sensor":
      return "Sensor";
    case "location":
      return "Location";
    case "material":
      return "Material profile";
    case "spool":
      return "Spool";
  }
}
