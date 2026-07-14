import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { describeSensorLocation } from "@/lib/sensorLocation";
import type { Location, Printer, Sensor } from "@/types/api";

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
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign sensor — {printer.name}</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
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
            <div className="flex flex-col gap-2">
              <span className="text-sm font-medium">
                {currentSensor ? "Reassign to a different sensor" : "Assign an existing sensor"}
              </span>
              <div className="flex items-center gap-2">
                <Select value={selectedSensorId} onValueChange={onSelectedSensorIdChange}>
                  <SelectTrigger className="flex-1">
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
