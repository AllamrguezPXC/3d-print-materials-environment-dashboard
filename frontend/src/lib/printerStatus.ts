export type PrinterOperationalStatus = "activo" | "inactivo" | "mantenimiento";

export const PRINTER_OPERATIONAL_STATUSES: PrinterOperationalStatus[] = [
  "activo",
  "inactivo",
  "mantenimiento",
];

const STATUS_LABELS: Record<PrinterOperationalStatus, string> = {
  activo: "Activo",
  inactivo: "Inactivo",
  mantenimiento: "Mantenimiento",
};

/** Sibling to lib/deviceType.ts and lib/status.ts, deliberately not an
 * extension of either: a printer's administrative operational status is a
 * third semantic axis, distinct from its device-type category and from
 * live alert severity -- "mantenimiento" isn't inherently ok/warning/
 * critical, so it doesn't belong in statusVariant()'s palette. */
const STATUS_BADGE_CLASSNAME: Record<PrinterOperationalStatus, string> = {
  activo: "bg-ok/15 text-ok",
  inactivo: "bg-destructive/15 text-destructive",
  mantenimiento: "bg-warning/15 text-warning",
};

export function printerStatusLabel(status: string): string {
  return STATUS_LABELS[status as PrinterOperationalStatus] ?? status;
}

export function printerStatusBadgeClassName(status: string): string {
  return STATUS_BADGE_CLASSNAME[status as PrinterOperationalStatus] ?? "bg-muted text-muted-foreground";
}

/** A printer that isn't "activo" is dimmed on the Dashboard -- purely
 * visual, never hides or suppresses its real alerts (Requirements.md
 * domain rules: administrative status must never mask environmental
 * risk). */
export function isPrinterDimmed(status: string): boolean {
  return status !== "activo";
}
