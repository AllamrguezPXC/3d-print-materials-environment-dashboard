import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SpoolForm, type SpoolFormValues } from "@/components/SpoolForm";
import type { MaterialProfile } from "@/types/api";

interface EditSpoolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: SpoolFormValues;
  onChange: (value: SpoolFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  materials: MaterialProfile[];
  submitting?: boolean;
}

/** Edit an existing spool -- composes the same SpoolForm used for Manual Add. */
export function EditSpoolModal({
  open,
  onOpenChange,
  value,
  onChange,
  onSubmit,
  materials,
  submitting,
}: EditSpoolModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Filament</DialogTitle>
        </DialogHeader>
        <SpoolForm
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          materials={materials}
          submitting={submitting}
          submitLabel="Save changes"
        />
      </DialogContent>
    </Dialog>
  );
}
