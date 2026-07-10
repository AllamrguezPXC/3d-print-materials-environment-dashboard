import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type AmsImportValues, ReadFromAmsPanel } from "@/components/ReadFromAmsPanel";
import { SpoolForm, type SpoolFormValues } from "@/components/SpoolForm";
import type { Location, MaterialProfile, Printer, SpoolAssignment } from "@/types/api";

interface AddFilamentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  materials: MaterialProfile[];
  printers: Printer[];
  locations: Location[];
  assignments: SpoolAssignment[];
  manualValue: SpoolFormValues;
  onManualChange: (value: SpoolFormValues) => void;
  onManualSubmit: (e: React.FormEvent) => void;
  manualSubmitting?: boolean;
  onImportFromAms: (slotLocationIds: number[], values: AmsImportValues) => void;
  importSubmitting?: boolean;
}

/** Add Filament modal with Manual Add / Read from AMS modes, per the
 * Bambu-Studio-inspired redesign prompt. Composes the existing SpoolForm
 * (Manual Add) and the new ReadFromAmsPanel -- not a new form system. */
export function AddFilamentModal({
  open,
  onOpenChange,
  materials,
  printers,
  locations,
  assignments,
  manualValue,
  onManualChange,
  onManualSubmit,
  manualSubmitting,
  onImportFromAms,
  importSubmitting,
}: AddFilamentModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add Filament</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="manual">
          <TabsList>
            <TabsTrigger value="manual">Manual Add</TabsTrigger>
            <TabsTrigger value="ams">Read from AMS</TabsTrigger>
          </TabsList>
          <TabsContent value="manual" className="pt-2">
            <SpoolForm
              value={manualValue}
              onChange={onManualChange}
              onSubmit={onManualSubmit}
              materials={materials}
              submitting={manualSubmitting}
            />
          </TabsContent>
          <TabsContent value="ams" className="pt-2">
            <ReadFromAmsPanel
              printers={printers}
              locations={locations}
              assignments={assignments}
              materials={materials}
              onImport={onImportFromAms}
              submitting={importSubmitting}
            />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
