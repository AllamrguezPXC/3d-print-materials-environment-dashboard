import { useState } from "react";
import { Link } from "react-router-dom";
import { Printer as PrinterIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { NoticeBanner } from "@/components/NoticeBanner";
import { LocationForm, type LocationFormValues } from "@/components/LocationForm";
import { FILAMENT_SYSTEM_TYPES, PrinterForm, type PrinterFormValues } from "@/components/PrinterForm";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PRINTER_OPERATIONAL_STATUSES, printerStatusBadgeClassName, printerStatusLabel } from "@/lib/printerStatus";
import { cn } from "@/lib/utils";
import { useNotice } from "@/hooks/useNotice";
import {
  useCreateLocation,
  useLocations,
  useRemoveLocation,
} from "@/hooks/resources/locations";
import { useCreatePrinter, usePrinters, useRemovePrinter, useUpdatePrinter } from "@/hooks/resources/printers";

const EMPTY_PRINTER: PrinterFormValues = {
  name: "",
  brand: "Bambu Lab",
  model: "A1 mini",
  filament_system_type: "manual",
};
const EMPTY_LOCATION: LocationFormValues = { name: "", location_type: "printer_ams", printer_id: "" };

export function Printers() {
  const { data: printers = [] } = usePrinters();
  const { data: locations = [] } = useLocations();
  const { notice, notifySuccess, notifyError } = useNotice();

  const createPrinter = useCreatePrinter();
  const removePrinter = useRemovePrinter();
  const updatePrinter = useUpdatePrinter();
  const createLocation = useCreateLocation();
  const removeLocation = useRemoveLocation();

  const [newPrinter, setNewPrinter] = useState(EMPTY_PRINTER);
  const [newLocation, setNewLocation] = useState(EMPTY_LOCATION);

  function handleAddPrinter(e: React.FormEvent) {
    e.preventDefault();
    if (!newPrinter.name.trim()) {
      notifyError("Printer name is required.");
      return;
    }
    createPrinter.mutate(newPrinter, {
      onSuccess: () => {
        notifySuccess(`Printer "${newPrinter.name}" added.`);
        setNewPrinter(EMPTY_PRINTER);
      },
      onError: (err) => notifyError(err.message),
    });
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
    removePrinter.mutate(id, {
      onSuccess: () => notifySuccess("Printer deleted."),
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

  function handleDeleteLocation(id: number) {
    removeLocation.mutate(id, {
      onSuccess: () => notifySuccess("Location deleted."),
      onError: (err) => notifyError(err.message),
    });
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
                    <Button variant="destructive" size="sm" onClick={() => handleDeletePrinter(p.id)}>
                      Delete
                    </Button>
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
                    <Button variant="destructive" size="sm" onClick={() => handleDeleteLocation(l.id)}>
                      Delete
                    </Button>
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
    </div>
  );
}
