import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PrinterForm, type PrinterFormValues } from "@/components/PrinterForm";

interface EditPrinterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  value: PrinterFormValues;
  onChange: (value: PrinterFormValues) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitting?: boolean;
}

/** Edit an existing printer -- composes the same PrinterForm used for Add. */
export function EditPrinterModal({
  open,
  onOpenChange,
  value,
  onChange,
  onSubmit,
  submitting,
}: EditPrinterModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Printer</DialogTitle>
        </DialogHeader>
        <PrinterForm
          value={value}
          onChange={onChange}
          onSubmit={onSubmit}
          submitting={submitting}
          submitLabel="Save changes"
        />
      </DialogContent>
    </Dialog>
  );
}
