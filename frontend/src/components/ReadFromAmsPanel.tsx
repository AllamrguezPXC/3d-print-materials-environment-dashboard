import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import type { FilamentSpool, Location, MaterialProfile, Printer, SpoolAssignment } from "@/types/api";

export interface AmsImportValues {
  material_profile_id: number;
  brand: string;
  color: string;
  status: FilamentSpool["status"];
}

interface ReadFromAmsPanelProps {
  printers: Printer[];
  locations: Location[];
  assignments: SpoolAssignment[];
  materials: MaterialProfile[];
  onImport: (slotLocationIds: number[], values: AmsImportValues) => void;
  submitting?: boolean;
}

const STATUS_OPTIONS: FilamentSpool["status"][] = ["ready", "watch", "needs_drying", "quarantine", "unknown"];

/** "Read from AMS" mode of Add Filament -- reads the AMS slots this project
 * already tracks explicitly (Location rows with location_type="printer_ams",
 * ordered by slot_index) rather than any real hardware auto-detection.
 * Batch-creates a spool + assignment per selected EMPTY slot. Occupied slots
 * are shown but not selectable -- they already render correctly on the
 * printer's own AMS grid; re-importing them would just create a duplicate
 * assignment. */
export function ReadFromAmsPanel({
  printers,
  locations,
  assignments,
  materials,
  onImport,
  submitting,
}: ReadFromAmsPanelProps) {
  const printersWithAms = printers.filter((p) =>
    locations.some((l) => l.printer_id === p.id && l.location_type === "printer_ams"),
  );

  const [printerId, setPrinterId] = useState(printersWithAms[0] ? String(printersWithAms[0].id) : "");
  const [selectedSlotIds, setSelectedSlotIds] = useState<number[]>([]);
  const [materialProfileId, setMaterialProfileId] = useState("");
  const [brand, setBrand] = useState("");
  const [color, setColor] = useState("");
  const [status, setStatus] = useState<FilamentSpool["status"]>("ready");

  const amsSlots = printerId
    ? locations
        .filter((l) => l.printer_id === Number(printerId) && l.location_type === "printer_ams")
        .sort((a, b) => (a.slot_index ?? 0) - (b.slot_index ?? 0))
    : [];

  function isOccupied(locationId: number) {
    return assignments.some((a) => a.location_id === locationId && a.is_active);
  }

  function toggleSlot(id: number) {
    setSelectedSlotIds((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (selectedSlotIds.length === 0 || !materialProfileId || !brand.trim()) return;
    onImport(selectedSlotIds, { material_profile_id: Number(materialProfileId), brand, color, status });
  }

  if (printersWithAms.length === 0) {
    return <p className="text-sm text-muted-foreground">No AMS detected on this device.</p>;
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label>Printer</Label>
        <Select
          value={printerId}
          onValueChange={(value) => {
            setPrinterId(value);
            setSelectedSlotIds([]);
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {printersWithAms.map((p) => (
              <SelectItem key={p.id} value={String(p.id)}>
                {p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {amsSlots.length === 0 ? (
        <p className="text-sm text-muted-foreground">No AMS detected on this device.</p>
      ) : (
        <>
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Tap slots to select; pick multiple to batch-add.</span>
            <div className="flex gap-3">
              <button
                type="button"
                className="hover:underline"
                onClick={() => setSelectedSlotIds(amsSlots.filter((s) => !isOccupied(s.id)).map((s) => s.id))}
              >
                Select all detected
              </button>
              <button type="button" className="hover:underline" onClick={() => setSelectedSlotIds([])}>
                Clear selection
              </button>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {amsSlots.map((slot, index) => {
              const occupied = isOccupied(slot.id);
              const selected = selectedSlotIds.includes(slot.id);
              return (
                <button
                  key={slot.id}
                  type="button"
                  disabled={occupied}
                  onClick={() => toggleSlot(slot.id)}
                  className={cn(
                    "flex flex-col items-center gap-1 rounded-md border p-3 text-xs transition-colors",
                    occupied
                      ? "cursor-not-allowed border-border bg-muted text-muted-foreground"
                      : selected
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/60",
                  )}
                >
                  <span className="font-medium">A{(slot.slot_index ?? index) + 1}</span>
                  <span>{occupied ? "Assigned" : "Empty"}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      <div className="flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label>Material</Label>
          <Select value={materialProfileId} onValueChange={setMaterialProfileId}>
            <SelectTrigger className="w-36">
              <SelectValue placeholder="Material…" />
            </SelectTrigger>
            <SelectContent>
              {materials.map((m) => (
                <SelectItem key={m.id} value={String(m.id)}>
                  {m.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ams-brand">Brand</Label>
          <Input id="ams-brand" value={brand} onChange={(e) => setBrand(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="ams-color">Color</Label>
          <Input id="ams-color" value={color} onChange={(e) => setColor(e.target.value)} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label>Status</Label>
          <Select value={status} onValueChange={(value) => setStatus(value as FilamentSpool["status"])}>
            <SelectTrigger className="w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((s) => (
                <SelectItem key={s} value={s}>
                  {s.replaceAll("_", " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          type="submit"
          disabled={submitting || selectedSlotIds.length === 0 || !materialProfileId || !brand.trim()}
        >
          Add {selectedSlotIds.length > 1 ? `${selectedSlotIds.length} filaments` : "filament"}
        </Button>
      </div>
    </form>
  );
}
