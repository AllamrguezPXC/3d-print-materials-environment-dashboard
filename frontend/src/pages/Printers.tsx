import { useState } from "react";
import { Link } from "react-router-dom";
import { Copy, Pencil, Printer as PrinterIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NoticeBanner } from "@/components/NoticeBanner";
import { EditLocationModal } from "@/components/EditLocationModal";
import { EditPrinterModal } from "@/components/EditPrinterModal";
import { LocationForm, type LocationFormValues } from "@/components/LocationForm";
import { FILAMENT_SYSTEM_TYPES, PrinterForm, type PrinterFormValues } from "@/components/PrinterForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRINTER_OPERATIONAL_STATUSES, printerStatusBadgeClassName, printerStatusLabel } from "@/lib/printerStatus";
import { cn } from "@/lib/utils";
import { useNotice } from "@/hooks/useNotice";
import {
  useArchiveLocation,
  useCreateLocation,
  useDuplicateLocation,
  useLocations,
  useUpdateLocation,
} from "@/hooks/resources/locations";
import {
  useArchivePrinter,
  useCreatePrinter,
  useDuplicatePrinter,
  usePrinters,
  useUpdatePrinter,
} from "@/hooks/resources/printers";
import type { Location, Printer } from "@/types/api";

const EMPTY_PRINTER: PrinterFormValues = {
  name: "",
  brand: "Bambu Lab",
  model: "A1 mini",
  filament_system_type: "manual",
  serial_number: "",
  notes: "",
};
const EMPTY_LOCATION: LocationFormValues = {
  name: "",
  location_type: "printer_ams",
  printer_id: "",
  description: "",
  max_temp_c: "",
  notes: "",
  slot_index: "",
};

export function Printers() {
  const { data: printers = [] } = usePrinters();
  const { data: locations = [] } = useLocations();
  const { notice, notifySuccess, notifyError } = useNotice();

  const createPrinter = useCreatePrinter();
  const archivePrinter = useArchivePrinter();
  const duplicatePrinter = useDuplicatePrinter();
  const updatePrinter = useUpdatePrinter();
  const createLocation = useCreateLocation();
  const archiveLocation = useArchiveLocation();
  const duplicateLocation = useDuplicateLocation();
  const updateLocation = useUpdateLocation();

  const [newPrinter, setNewPrinter] = useState(EMPTY_PRINTER);
  const [newLocation, setNewLocation] = useState(EMPTY_LOCATION);

  const [editingPrinter, setEditingPrinter] = useState<Printer | null>(null);
  const [printerDraft, setPrinterDraft] = useState<PrinterFormValues>(EMPTY_PRINTER);

  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [locationDraft, setLocationDraft] = useState<LocationFormValues>(EMPTY_LOCATION);

  function handleAddPrinter(e: React.FormEvent) {
    e.preventDefault();
    if (!newPrinter.name.trim()) {
      notifyError("Printer name is required.");
      return;
    }
    createPrinter.mutate(
      {
        name: newPrinter.name,
        brand: newPrinter.brand,
        model: newPrinter.model,
        filament_system_type: newPrinter.filament_system_type,
        serial_number: newPrinter.serial_number || null,
        notes: newPrinter.notes || null,
      },
      {
        onSuccess: () => {
          notifySuccess(`Printer "${newPrinter.name}" added.`);
          setNewPrinter(EMPTY_PRINTER);
        },
        onError: (err) => notifyError(err.message),
      },
    );
  }

  function handleAddLocation(e: React.FormEvent) {
    e.preventDefault();
    if (!newLocation.name.trim()) {
      notifyError("Location name is required.");
      return;
    }
    createLocation.mutate(
      {
        name: newLocation.name,
        location_type: newLocation.location_type,
        printer_id: newLocation.printer_id ? Number(newLocation.printer_id) : null,
        description: newLocation.description || null,
        max_temp_c: newLocation.max_temp_c ? Number(newLocation.max_temp_c) : null,
        notes: newLocation.notes || null,
        slot_index: newLocation.slot_index ? Number(newLocation.slot_index) : null,
      },
      {
        onSuccess: () => {
          notifySuccess(`Location "${newLocation.name}" added.`);
          setNewLocation(EMPTY_LOCATION);
        },
        onError: (err) => notifyError(err.message),
      },
    );
  }

  function handleDeletePrinter(id: number) {
    archivePrinter.mutate(id, {
      onSuccess: () => notifySuccess("Printer deleted."),
      onError: (err) => notifyError(err.message),
    });
  }

  function handleDuplicatePrinter(id: number) {
    duplicatePrinter.mutate(id, {
      onSuccess: () => notifySuccess("Printer duplicated."),
      onError: (err) => notifyError(err.message),
    });
  }

  function handlePrinterFilamentSystemTypeChange(id: number, filament_system_type: string) {
    updatePrinter.mutate(
      { id, body: { filament_system_type } },
      { onError: (err) => notifyError(err.message) },
    );
  }

  function handlePrinterOperationalStatusChange(id: number, operational_status: string) {
    updatePrinter.mutate(
      { id, body: { operational_status } },
      { onError: (err) => notifyError(err.message) },
    );
  }

  function openEditPrinter(printer: Printer) {
    setEditingPrinter(printer);
    setPrinterDraft({
      name: printer.name,
      brand: printer.brand,
      model: printer.model,
      filament_system_type: printer.filament_system_type,
      serial_number: printer.serial_number ?? "",
      notes: printer.notes ?? "",
    });
  }

  function handleEditPrinterSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingPrinter || !printerDraft.name.trim()) {
      notifyError("Printer name is required.");
      return;
    }
    updatePrinter.mutate(
      {
        id: editingPrinter.id,
        body: {
          name: printerDraft.name,
          brand: printerDraft.brand,
          model: printerDraft.model,
          filament_system_type: printerDraft.filament_system_type,
          serial_number: printerDraft.serial_number || null,
          notes: printerDraft.notes || null,
        },
      },
      {
        onSuccess: () => {
          notifySuccess(`Printer "${printerDraft.name}" updated.`);
          setEditingPrinter(null);
        },
        onError: (err) => notifyError(err.message),
      },
    );
  }

  function handleDeleteLocation(id: number) {
    archiveLocation.mutate(id, {
      onSuccess: () => notifySuccess("Location deleted."),
      onError: (err) => notifyError(err.message),
    });
  }

  function handleDuplicateLocation(id: number) {
    duplicateLocation.mutate(id, {
      onSuccess: () => notifySuccess("Location duplicated."),
      onError: (err) => notifyError(err.message),
    });
  }

  function openEditLocation(location: Location) {
    setEditingLocation(location);
    setLocationDraft({
      name: location.name,
      location_type: location.location_type,
      printer_id: location.printer_id ? String(location.printer_id) : "",
      description: location.description ?? "",
      max_temp_c: location.max_temp_c !== null ? String(location.max_temp_c) : "",
      notes: location.notes ?? "",
      slot_index: location.slot_index !== null ? String(location.slot_index) : "",
    });
  }

  function handleEditLocationSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!editingLocation || !locationDraft.name.trim()) {
      notifyError("Location name is required.");
      return;
    }
    updateLocation.mutate(
      {
        id: editingLocation.id,
        body: {
          name: locationDraft.name,
          location_type: locationDraft.location_type,
          printer_id: locationDraft.printer_id ? Number(locationDraft.printer_id) : null,
          description: locationDraft.description || null,
          max_temp_c: locationDraft.max_temp_c ? Number(locationDraft.max_temp_c) : null,
          notes: locationDraft.notes || null,
          slot_index: locationDraft.slot_index ? Number(locationDraft.slot_index) : null,
        },
      },
      {
        onSuccess: () => {
          notifySuccess(`Location "${locationDraft.name}" updated.`);
          setEditingLocation(null);
        },
        onError: (err) => notifyError(err.message),
      },
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-heading font-semibold">Printers & Locations</h1>
      <NoticeBanner notice={notice} />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PrinterIcon className="size-4 text-muted-foreground" />
            Printers
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Model</TableHead>
                <TableHead>Filament System</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {printers.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    <Link to={`/printers/${p.id}`} className="hover:underline">
                      {p.name}
                    </Link>
                  </TableCell>
                  <TableCell>{p.brand}</TableCell>
                  <TableCell>{p.model}</TableCell>
                  <TableCell>
                    <Select
                      value={p.filament_system_type}
                      onValueChange={(value) => handlePrinterFilamentSystemTypeChange(p.id, value)}
                    >
                      <SelectTrigger size="sm" className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {FILAMENT_SYSTEM_TYPES.map((t) => (
                          <SelectItem key={t} value={t} className="capitalize">
                            {t.replaceAll("_", " ")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      value={p.operational_status}
                      onValueChange={(value) => handlePrinterOperationalStatusChange(p.id, value)}
                    >
                      <SelectTrigger
                        size="sm"
                        className={cn("w-36", printerStatusBadgeClassName(p.operational_status))}
                      >
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {PRINTER_OPERATIONAL_STATUSES.map((s) => (
                          <SelectItem key={s} value={s}>
                            {printerStatusLabel(s)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => openEditPrinter(p)}>
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDuplicatePrinter(p.id)}>
                        <Copy className="size-3.5" />
                        Duplicate
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeletePrinter(p.id)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <PrinterForm
            value={newPrinter}
            onChange={setNewPrinter}
            onSubmit={handleAddPrinter}
            submitting={createPrinter.isPending}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Locations</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Printer</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {locations.map((l) => (
                <TableRow key={l.id}>
                  <TableCell className="font-medium">{l.name}</TableCell>
                  <TableCell className="capitalize">{l.location_type.replaceAll("_", " ")}</TableCell>
                  <TableCell>{printers.find((p) => p.id === l.printer_id)?.name ?? "—"}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="outline" size="sm" onClick={() => openEditLocation(l)}>
                        <Pencil className="size-3.5" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => handleDuplicateLocation(l.id)}>
                        <Copy className="size-3.5" />
                        Duplicate
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => handleDeleteLocation(l.id)}>
                        Delete
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <LocationForm
            value={newLocation}
            onChange={setNewLocation}
            onSubmit={handleAddLocation}
            printers={printers}
            submitting={createLocation.isPending}
          />
        </CardContent>
      </Card>

      {editingPrinter && (
        <EditPrinterModal
          open
          onOpenChange={(open) => !open && setEditingPrinter(null)}
          value={printerDraft}
          onChange={setPrinterDraft}
          onSubmit={handleEditPrinterSubmit}
          submitting={updatePrinter.isPending}
        />
      )}

      {editingLocation && (
        <EditLocationModal
          open
          onOpenChange={(open) => !open && setEditingLocation(null)}
          value={locationDraft}
          onChange={setLocationDraft}
          onSubmit={handleEditLocationSubmit}
          printers={printers}
          submitting={updateLocation.isPending}
        />
      )}
    </div>
  );
}
