import { useState } from "react";
import { DashboardFilters } from "@/components/DashboardFilters";
import { DeviceModuleCard } from "@/components/DeviceModuleCard";
import { NoticeBanner } from "@/components/NoticeBanner";
import { ReadingCard } from "@/components/ReadingCard";
import { SensorAssignmentModal } from "@/components/SensorAssignmentModal";
import { SlotAssignmentModal } from "@/components/SlotAssignmentModal";
import { StandaloneLocationCard } from "@/components/StandaloneLocationCard";
import { AlertPanel } from "@/components/AlertPanel";
import { AffectedSpoolsPanel } from "@/components/AffectedSpoolsPanel";
import { useNotice } from "@/hooks/useNotice";
import { useCreateAssignment, useUpdateAssignment } from "@/hooks/resources/assignments";
import { useUpdateSensor } from "@/hooks/resources/sensors";
import { useDeviceFilters } from "@/hooks/useDeviceFilters";
import { buildDeviceModules } from "@/lib/deviceModules";
import { filterDeviceModules } from "@/lib/deviceFilters";
import { formatDewPoint, formatHumidity, formatPressure, formatTemperature } from "@/lib/format";
import { getAvailableSpools } from "@/lib/spoolAvailability";
import { currentSensorForPrinter, representativeLocationForPrinter } from "@/lib/sensorLocation";
import { CloudFog, Droplets, Gauge, Thermometer } from "lucide-react";
import type {
  FilamentSpool,
  Location,
  MaterialProfile,
  Printer,
  Sensor,
  SensorReadingEntry,
  SpoolAssignment,
} from "@/types/api";

function uniqueSorted(values: (string | null | undefined)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => Boolean(v)))).sort();
}

interface DeviceModuleGridProps {
  printers: Printer[];
  locations: Location[];
  spools: FilamentSpool[];
  materials: MaterialProfile[];
  assignments: SpoolAssignment[];
  sensors: Sensor[];
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
  sensors,
  sensorEntries,
  emptyMessage,
}: DeviceModuleGridProps) {
  const { notice, notifySuccess, notifyError } = useNotice();
  const createAssignment = useCreateAssignment();
  const updateAssignment = useUpdateAssignment();
  const updateSensor = useUpdateSensor();

  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [selectedSpoolId, setSelectedSpoolId] = useState("");
  const [filters, setFilters] = useDeviceFilters();
  const [sensorAssignmentPrinter, setSensorAssignmentPrinter] = useState<Printer | null>(null);
  const [selectedSensorId, setSelectedSensorId] = useState("");

  const currentAssignment = selectedLocation
    ? (assignments.find((a) => a.location_id === selectedLocation.id && a.is_active) ?? null)
    : null;
  const currentSpool = currentAssignment
    ? (spools.find((s) => s.id === currentAssignment.spool_id) ?? null)
    : null;
  const currentMaterial = currentSpool
    ? (materials.find((m) => m.id === currentSpool.material_profile_id) ?? null)
    : null;

  const availableSpools = getAvailableSpools(spools, assignments, currentSpool?.id ?? null);

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

  const sensorTargetLocation = sensorAssignmentPrinter
    ? representativeLocationForPrinter(sensorAssignmentPrinter.id, locations)
    : null;
  const currentSensor = sensorAssignmentPrinter
    ? currentSensorForPrinter(sensorAssignmentPrinter.id, locations, sensors)
    : null;
  const candidateSensors = sensors.filter((s) => s.id !== currentSensor?.id);

  function handleOpenSensorAssignment(printer: Printer) {
    setSensorAssignmentPrinter(printer);
    setSelectedSensorId("");
  }

  async function handleAssignSensor() {
    if (!sensorTargetLocation || !selectedSensorId) return;
    try {
      if (currentSensor) {
        await updateSensor.mutateAsync({ id: currentSensor.id, body: { location_id: null } });
      }
      await updateSensor.mutateAsync({ id: Number(selectedSensorId), body: { location_id: sensorTargetLocation.id } });
      notifySuccess(`${sensorAssignmentPrinter?.name} sensor updated.`);
      setSensorAssignmentPrinter(null);
    } catch (err) {
      notifyError((err as Error).message);
    }
  }

  async function handleUnassignSensor() {
    if (!currentSensor) return;
    try {
      await updateSensor.mutateAsync({ id: currentSensor.id, body: { location_id: null } });
      notifySuccess("Sensor unassigned.");
      setSensorAssignmentPrinter(null);
    } catch (err) {
      notifyError((err as Error).message);
    }
  }

  const { printerModules, standaloneModules, unassignedEntries } = buildDeviceModules(
    printers,
    locations,
    sensorEntries,
  );

  const filterCtx = { spools, materials, assignments };
  const filtered = filterDeviceModules(printerModules, standaloneModules, filters, filterCtx);

  const nothingToShow =
    printerModules.length === 0 && standaloneModules.length === 0 && unassignedEntries.length === 0;
  const hiddenByFilters = !nothingToShow && filtered.visibleCount === 0;

  return (
    <div className="flex flex-col gap-6">
      <NoticeBanner notice={notice} />

      {nothingToShow && emptyMessage && <p className="text-sm text-muted-foreground">{emptyMessage}</p>}

      {!nothingToShow && (
        <DashboardFilters
          value={filters}
          onChange={setFilters}
          printerBrands={uniqueSorted(printers.map((p) => p.brand))}
          filamentTypes={uniqueSorted(materials.map((m) => m.family))}
          filamentBrands={uniqueSorted(spools.map((s) => s.brand))}
          filamentColors={uniqueSorted(spools.map((s) => s.color))}
          visibleCount={filtered.visibleCount}
          totalCount={filtered.totalCount}
        />
      )}

      {hiddenByFilters && (
        <p className="text-sm text-muted-foreground">No devices match the current filters.</p>
      )}

      {filtered.printerModules.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {filtered.printerModules.map((module) => (
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
              onAssignSensor={handleOpenSensorAssignment}
            />
          ))}
        </div>
      )}

      {filtered.standaloneModules.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-heading text-lg font-medium">Storage &amp; Environment</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.standaloneModules.map((module) => (
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
                  <ReadingCard label="Temperature" value={formatTemperature(entry.temperature_c)} icon={Thermometer} />
                  <ReadingCard
                    label="Relative Humidity"
                    value={formatHumidity(entry.relative_humidity_percent)}
                    icon={Droplets}
                  />
                  <ReadingCard label="Pressure" value={formatPressure(entry.pressure_kpa)} icon={Gauge} />
                  <ReadingCard label="Dew Point" value={formatDewPoint(entry.dew_point_c)} icon={CloudFog} />
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

      {sensorAssignmentPrinter && (
        <SensorAssignmentModal
          printer={sensorAssignmentPrinter}
          targetLocation={sensorTargetLocation}
          open
          onOpenChange={(open) => !open && setSensorAssignmentPrinter(null)}
          currentSensor={currentSensor}
          candidateSensors={candidateSensors}
          locations={locations}
          printers={printers}
          selectedSensorId={selectedSensorId}
          onSelectedSensorIdChange={setSelectedSensorId}
          onAssign={handleAssignSensor}
          onUnassign={handleUnassignSensor}
          assigning={updateSensor.isPending}
          unassigning={updateSensor.isPending}
        />
      )}
    </div>
  );
}
