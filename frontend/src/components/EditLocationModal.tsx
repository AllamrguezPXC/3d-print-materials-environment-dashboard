import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { LocationForm, type LocationFormValues } from "@/components/LocationForm";
import type { Printer } from "@/types/api";

interface EditLocationModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: LocationFormValues;
  onChange: (value: LocationFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  printers: Printer[];
  submitting?: boolean;
}

/** Edit an existing location -- composes the same LocationForm used for Add. */
export function EditLocationModal({
  open,
  onOpenChange,
  value,
  onChange,
  onSubmit,
  printers,
  submitting,
}: EditLocationModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Location</DialogTitle>
        </DialogHeader>
        <LocationForm
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          printers={printers}
          submitting={submitting}
          submitLabel="Save changes"
        />
      </DialogContent>
    </Dialog>
  );
}
