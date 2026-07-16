import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SensorForm, type SensorFormValues } from "@/components/SensorForm";
import type { Location, Printer } from "@/types/api";

interface EditSensorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: SensorFormValues;
  onChange: (value: SensorFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  locations: Location[];
  printers: Printer[];
  submitting?: boolean;
}

/** Edit an existing sensor -- composes the same SensorForm used for Add. */
export function EditSensorModal({
  open,
  onOpenChange,
  value,
  onChange,
  onSubmit,
  locations,
  printers,
  submitting,
}: EditSensorModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Sensor</DialogTitle>
        </DialogHeader>
        <SensorForm
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          locations={locations}
          printers={printers}
          submitting={submitting}
          submitLabel="Save changes"
        />
      </DialogContent>
    </Dialog>
  );
}
