import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { getCurrentReading } from "@/api/readings";
import { AmsSlotGrid } from "@/components/AmsSlotGrid";
import { HumidityScale } from "@/components/HumidityScale";
import { NoticeBanner } from "@/components/NoticeBanner";
import { SensorReadingSection } from "@/components/SensorReadingSection";
import { SlotAssignmentModal } from "@/components/SlotAssignmentModal";
import { Button } from "@/components/ui/button";
import { useNotice } from "@/hooks/useNotice";
import { useAssignments, useCreateAssignment, useUpdateAssignment } from "@/hooks/resources/assignments";
import { useLocations } from "@/hooks/resources/locations";
import { useMaterials } from "@/hooks/resources/materials";
import { usePrinters } from "@/hooks/resources/printers";
import { useSpools } from "@/hooks/resources/spools";
import type { Location } from "@/types/api";

export function PrinterDetail() {
  const { id } = useParams();
  const printerId = Number(id);

  const { data: printers = [] } = usePrinters();
  const { data: locations = [] } = useLocations();
  const { data: spools = [] } = useSpools();
  const { data: materials = [] } = useMaterials();
  const { data: assignments = [] } = useAssignments();
  const { notice, notifySuccess, notifyError } = useNotice();

  const { data: current } = useQuery({
    queryKey: ["current-reading"],
    queryFn: getCurrentReading,
    refetchInterval: 5000,
  });

  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedSpoolId, setSelectedSpoolId] = useState("");

  const printer = printers.find((p) => p.id === printerId);
  const printerLocations = locations.filter((l) => l.printer_id === printerId);
  const amsLocations = printerLocations.filter((l) => l.location_type === "printer_ams");
  const printerSensorEntries = (current?.sensors ?? []).filter(
    (entry) => entry.location?.printer_id === printerId,
  );

  if (!printer) {
    return <p className="text-sm text-muted-foreground">Printer not found.</p>;
  }

  const currentAssignment = selectedLocation
    ? (assignments.find((a) => a.location_id === selectedLocation.id && a.is_active) ?? null)
    : null;
  const currentSpool = currentAssignment
    ? (spools.find((s) => s.id === currentAssignment.spool_id) ?? null)
    : null;
  const currentMaterial = currentSpool
    ? (materials.find((m) => m.id === currentSpool.material_profile_id) ?? null)
    : null;

  const activeSpoolIds = new Set(assignments.filter((a) => a.is_active).map((a) => a.spool_id));
  const availableSpools = spools.filter((s) => !activeSpoolIds.has(s.id) || s.id === currentSpool?.id);

  function handleSelectSlot(location: Location) {
    setSelectedLocation(location);
    setSelectedSpoolId("");
  }

  async function handleAssign() {
    if (!selectedLocation || !selectedSpoolId) return;
    try {
      if (currentAssignment) {
        await updateAssignment.mutateAsync({ id: currentAssignment.id, body: { is_active: false } });
      }
      await createAssignment.mutateAsync({
        spool_id: Number(selectedSpoolId),
        location_id: selectedLocation.id,
        is_active: true,
      });
      notifySuccess(`${selectedLocation.name} updated.`);
      setSelectedLocation(null);
    } catch (err) {
      notifyError((err as Error).message);
    }
  }

  async function handleClear() {
    if (!currentAssignment) return;
    try {
      await updateAssignment.mutateAsync({ id: currentAssignment.id, body: { is_active: false } });
      notifySuccess("Slot cleared.");
      setSelectedLocation(null);
    } catch (err) {
      notifyError((err as Error).message);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Link to="/printers" className="flex w-fit items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" />
        Back to Printers
      </Link>
      <NoticeBanner notice={notice} />

      <div>
        <h1 className="text-xl font-heading font-semibold">{printer.name}</h1>
        <p className="text-sm text-muted-foreground">
          {printer.brand} {printer.model}
          {printer.serial_number && ` · ${printer.serial_number}`}
          {" · "}
          <span className="capitalize">{printer.filament_system_type.replaceAll("_", " ")}</span>
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">Environment</h2>
        {printerSensorEntries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sensor assigned to this printer's locations.</p>
        ) : (
          printerSensorEntries.map((entry) => (
            <div key={entry.sensor.id} className="flex flex-col gap-3">
              <SensorReadingSection entry={entry} />
              {!entry.error && entry.relative_humidity_percent !== null && (
                <HumidityScale relativeHumidityPercent={entry.relative_humidity_percent} />
              )}
            </div>
          ))
        )}
      </div>

      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">AMS</h2>
        <AmsSlotGrid
          amsLocations={amsLocations}
          assignments={assignments}
          spools={spools}
          materials={materials}
          selectedLocationId={selectedLocation?.id}
          onSelectSlot={handleSelectSlot}
        />
      </div>

      {selectedLocation && (
        <SlotAssignmentModal
          location={selectedLocation}
          open
          onOpenChange={(open) => !open && setSelectedLocation(null)}
          currentAssignment={currentAssignment}
          currentSpool={currentSpool}
          currentMaterial={currentMaterial}
          availableSpools={availableSpools}
          materials={materials}
          selectedSpoolId={selectedSpoolId}
          onSelectedSpoolIdChange={setSelectedSpoolId}
          onAssign={handleAssign}
          onClear={handleClear}
          assigning={createAssignment.isPending || updateAssignment.isPending}
          clearing={updateAssignment.isPending}
        />
      )}

      <div>
        <Button variant="outline" size="sm" asChild>
          <Link to="/spools">Manage all filaments</Link>
        </Button>
      </div>
    </div>
  );
}
