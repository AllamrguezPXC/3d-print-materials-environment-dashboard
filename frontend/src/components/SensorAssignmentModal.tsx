import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PortSelect } from "@/components/PortSelect";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { useCreateSensor, useUpdateSensor } from "@/hooks/resources/sensors";
import { describeSensorLocation } from "@/lib/sensorLocation";
import type { Location, Printer, Sensor } from "@/types/api";

interface NewSensorValues {
  name: string;
  model: string;
  serial_number: string;
  sensor_type: string;
  port: string;
}

const EMPTY_NEW_SENSOR: NewSensorValues = { name: "", model: "", serial_number: "", sensor_type: "mock", port: "" };
const SENSOR_TYPES = ["mock", "dracal_vcp", "dracal_cli"];
// dracal_cli identifies its device via serial number only (no COM port -- it
// talks to the sensor over native USB via the dracal-usb-get CLI tool).
const REQUIRES_PORT = new Set(["dracal_vcp"]);

interface SensorAssignmentModalProps {
  printer: Printer;
  targetLocation: Location | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSensor: Sensor | null;
  candidateSensors: Sensor[];
  locations: Location[];
  printers: Printer[];
  selectedSensorId: string;
  onSelectedSensorIdChange: (value: string) => void;
  onAssign: () => void;
  onUnassign: () => void;
  assigning?: boolean;
  unassigning?: boolean;
}

/** Assign/reassign the one sensor covering a printer's filament-system
 * module -- same composition pattern as SlotAssignmentModal (Dialog/Select
 * primitives, no new modal system). Reassigning to a different sensor is
 * two backend calls (unassign the current one, then assign the new one),
 * mirroring how the Dashboard already clears-then-creates a spool
 * assignment, so the AMS one-sensor-per-module conflict check never trips
 * on the sensor's own outgoing slot. */
export function SensorAssignmentModal({
  printer,
  targetLocation,
  open,
  onOpenChange,
  currentSensor,
  candidateSensors,
  locations,
  printers,
  selectedSensorId,
  onSelectedSensorIdChange,
  onAssign,
  onUnassign,
  assigning,
  unassigning,
}: SensorAssignmentModalProps) {
  const [creatingSensor, setCreatingSensor] = useState(false);
  const [newSensor, setNewSensor] = useState<NewSensorValues>(EMPTY_NEW_SENSOR);
  const [createError, setCreateError] = useState<string | null>(null);
  const createSensor = useCreateSensor();
  const updateSensor = useUpdateSensor();

  // Mirrors the "reassign to an existing sensor" swap (unassign the current
  // sensor, then point the new one at this module) so creating a brand new
  // sensor is just as available as picking one from the dropdown -- neither
  // path should require the user to manually Unassign and reopen the dialog
  // first.
  async function handleCreateSensor(e: React.FormEvent) {
    e.preventDefault();
    if (!targetLocation || !newSensor.name.trim() || !newSensor.serial_number.trim()) return;
    setCreateError(null);
    try {
      if (currentSensor) {
        await updateSensor.mutateAsync({ id: currentSensor.id, body: { location_id: null } });
      }
      await createSensor.mutateAsync({
        name: newSensor.name,
        model: newSensor.model,
        serial_number: newSensor.serial_number,
        sensor_type: newSensor.sensor_type,
        port: REQUIRES_PORT.has(newSensor.sensor_type) ? newSensor.port || null : null,
        location_id: targetLocation.id,
        is_active: true,
      });
      setNewSensor(EMPTY_NEW_SENSOR);
      setCreatingSensor(false);
    } catch (err) {
      setCreateError((err as Error).message);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign sensor — {printer.name}</DialogTitle>
        </DialogHeader>

        <div className="flex min-w-0 flex-col gap-4">
          {currentSensor ? (
            <div className="flex flex-col gap-2 rounded-md border border-border p-3">
              <div className="flex items-center gap-2">
                <span className="font-medium">{currentSensor.serial_number}</span>
                <StatusBadge status={currentSensor.sensor_type} />
              </div>
              <Button variant="destructive" size="sm" onClick={onUnassign} disabled={unassigning} className="w-fit">
                Unassign
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No sensor is currently assigned to this printer's module.
            </p>
          )}

          {targetLocation ? (
            <div className="flex min-w-0 flex-col gap-2">
              <span className="text-sm font-medium">
                {currentSensor ? "Reassign to a different sensor" : "Assign an existing sensor"}
              </span>
              <div className="flex min-w-0 items-center gap-2">
                <Select value={selectedSensorId} onValueChange={onSelectedSensorIdChange}>
                  <SelectTrigger className="min-w-0 flex-1">
                    <SelectValue placeholder="Select sensor…" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidateSensors.map((s) => {
                      const currentLocation = locations.find((l) => l.id === s.location_id);
                      return (
                        <SelectItem key={s.id} value={String(s.id)}>
                          {s.serial_number}
                          {currentLocation
                            ? ` (currently at ${describeSensorLocation(currentLocation, printers)})`
                            : ""}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Button size="sm" onClick={onAssign} disabled={assigning || !selectedSensorId}>
                  Assign
                </Button>
              </div>
              {candidateSensors.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  No other sensors available. Add one from the Sensors page.
                </p>
              )}

              {creatingSensor ? (
                <form onSubmit={handleCreateSensor} className="flex flex-col gap-2 rounded-md border border-border p-3">
                  <span className="text-sm font-medium">New sensor</span>
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="new-sensor-name">Name</Label>
                      <Input
                        id="new-sensor-name"
                        className="w-36"
                        value={newSensor.name}
                        onChange={(e) => setNewSensor({ ...newSensor, name: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="new-sensor-model">Model</Label>
                      <Input
                        id="new-sensor-model"
                        className="w-28"
                        value={newSensor.model}
                        onChange={(e) => setNewSensor({ ...newSensor, model: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label htmlFor="new-sensor-serial">Serial number</Label>
                      <Input
                        id="new-sensor-serial"
                        className="w-32"
                        placeholder={newSensor.sensor_type === "mock" ? "MOCK-…" : "e.g. E27297"}
                        value={newSensor.serial_number}
                        onChange={(e) => setNewSensor({ ...newSensor, serial_number: e.target.value })}
                      />
                    </div>
                    <div className="flex flex-col gap-1.5">
                      <Label>Type</Label>
                      <Select
                        value={newSensor.sensor_type}
                        onValueChange={(sensor_type) => setNewSensor({ ...newSensor, sensor_type })}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {SENSOR_TYPES.map((t) => (
                            <SelectItem key={t} value={t}>
                              {t}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {REQUIRES_PORT.has(newSensor.sensor_type) && (
                      <div className="flex flex-col gap-1.5">
                        <Label htmlFor="new-sensor-port">Port</Label>
                        <div className="flex flex-col gap-1.5">
                          <Input
                            id="new-sensor-port"
                            className="w-32"
                            placeholder="COM3"
                            value={newSensor.port}
                            onChange={(e) => setNewSensor({ ...newSensor, port: e.target.value })}
                          />
                          <PortSelect
                            value={newSensor.port}
                            onChange={(port) => setNewSensor({ ...newSensor, port })}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                  {createError && <p className="text-xs text-destructive">{createError}</p>}
                  <div className="flex gap-2">
                    <Button type="submit" size="sm" disabled={createSensor.isPending || updateSensor.isPending}>
                      Create &amp; assign
                    </Button>
                    <Button type="button" variant="outline" size="sm" onClick={() => setCreatingSensor(false)}>
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <Button variant="outline" size="sm" className="w-fit" onClick={() => setCreatingSensor(true)}>
                  + Create new sensor
                </Button>
              )}
              {currentSensor && !creatingSensor && (
                <p className="text-xs text-muted-foreground">
                  Creating a new sensor here will unassign {currentSensor.serial_number} from this module.
                </p>
              )}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              This printer has no AMS or external-spool location configured yet — switch its filament
              system type first to enable sensor assignment.
            </p>
          )}
        </div>

        <DialogFooter showCloseButton />
      </DialogContent>
    </Dialog>
  );
}
