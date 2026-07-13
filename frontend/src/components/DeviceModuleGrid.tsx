import { useState } from "react";
import { DeviceModuleCard } from "@/components/DeviceModuleCard";
import { NoticeBanner } from "@/components/NoticeBanner";
import { ReadingCard } from "@/components/ReadingCard";
import { SlotAssignmentModal } from "@/components/SlotAssignmentModal";
import { StandaloneLocationCard } from "@/components/StandaloneLocationCard";
import { AlertPanel } from "@/components/AlertPanel";
import { AffectedSpoolsPanel } from "@/components/AffectedSpoolsPanel";
import { useNotice } from "@/hooks/useNotice";
import { useCreateAssignment, useUpdateAssignment } from "@/hooks/resources/assignments";
import { buildDeviceModules } from "@/lib/deviceModules";
import { CloudFog, Droplets, Gauge, Thermometer } from "lucide-react";
import type { FilamentSpool, Location, MaterialProfile, Printer, SensorReadingEntry, SpoolAssignment } from "@/types/api";

interface DeviceModuleGridProps {
  printers: Printer[];
  locations: Location[];
  spools: FilamentSpool[];
  materials: MaterialProfile[];
  assignments: SpoolAssignment[];
  sensorEntries: SensorReadingEntry[];
  emptyMessage?: string | null;
}

/** Owns the single shared slot-assignment modal for the whole Dashboard
 * (assign/clear logic mirrors PrinterDetail.tsx's, centralized here rather
 * than duplicated per device module), and renders the printer/standalone
 * device-module grids plus a flat fallback for orphan sensor entries. */
export function DeviceModuleGrid({
  printers,
  locations,
  spools,
  materials,
  assignments,
  sensorEntries,
  emptyMessage,
}: DeviceModuleGridProps) {
  const { notice, notifySuccess, notifyError } = useNotice();
  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedSpoolId, setSelectedSpoolId] = useState("");

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

  const { printerModules, standaloneModules, unassignedEntries } = buildDeviceModules(
    printers,
    locations,
    sensorEntries,
  );

  const nothingToShow =
    printerModules.length === 0 && standaloneModules.length === 0 && unassignedEntries.length === 0;

  return (
    <div className="flex flex-col gap-6">
      <NoticeBanner notice={notice} />

      {nothingToShow && emptyMessage && <p className="text-sm text-muted-foreground">{emptyMessage}</p>}

      {printerModules.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {printerModules.map((module) => (
            <DeviceModuleCard
              key={module.printer.id}
              printer={module.printer}
              amsLocations={module.amsLocations}
              externalSpoolLocations={module.externalSpoolLocations}
              sensorEntries={module.sensorEntries}
              assignments={assignments}
              spools={spools}
              materials={materials}
              selectedLocationId={selectedLocation?.id}
              onSelectSlot={handleSelectSlot}
            />
          ))}
        </div>
      )}

      {standaloneModules.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-medium">Storage &amp; Environment</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {standaloneModules.map((module) => (
              <StandaloneLocationCard key={module.location.id} location={module.location} entries={module.entries} />
            ))}
          </div>
        </div>
      )}

      {unassignedEntries.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-medium">Other Sensors</h2>
          {unassignedEntries.map((entry) => (
            <div key={entry.sensor.id} className="flex flex-col gap-3 rounded-lg border border-border p-4">
              <h3 className="font-heading text-sm font-medium">{entry.sensor.serial_number}</h3>
              {entry.error ? (
                <p className="text-sm text-destructive">Sensor unavailable: {entry.error}</p>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
                  <ReadingCard label="Temperature" value={`${entry.temperature_c!.toFixed(1)} °C`} icon={Thermometer} />
                  <ReadingCard
                    label="Relative Humidity"
                    value={`${entry.relative_humidity_percent!.toFixed(1)} %`}
                    icon={Droplets}
                  />
                  <ReadingCard label="Pressure" value={`${entry.pressure_kpa!.toFixed(1)} kPa`} icon={Gauge} />
                  <ReadingCard label="Dew Point" value={`${entry.dew_point_c!.toFixed(1)} °C`} icon={CloudFog} />
                </div>
              )}
              <AlertPanel alerts={entry.alerts} />
              <AffectedSpoolsPanel spools={entry.affected_spools} />
            </div>
          ))}
        </div>
      )}

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
    </div>
  );
}
