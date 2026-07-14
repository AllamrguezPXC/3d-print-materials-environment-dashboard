import { Search, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  ALL,
  EMPTY_DEVICE_FILTERS,
  type DeviceFiltersValue,
} from "@/lib/deviceFilters";
import { PRINTER_OPERATIONAL_STATUSES, printerStatusLabel } from "@/lib/printerStatus";

const ALERT_STATUS_OPTIONS: { value: DeviceFiltersValue["alertStatus"]; label: string }[] = [
  { value: "none", label: "No alert" },
  { value: "warning", label: "Warning" },
  { value: "critical", label: "Critical" },
  { value: "offline", label: "Sensor offline" },
  { value: "no_sensor", label: "No sensor assigned" },
];

const SENSOR_STATUS_OPTIONS: { value: DeviceFiltersValue["sensorStatus"]; label: string }[] = [
  { value: "active", label: "Active sensor" },
  { value: "unassigned", label: "No sensor assigned" },
  { value: "mock", label: "Mock sensor" },
  { value: "real", label: "Physical sensor" },
];

const SLOT_STATUS_OPTIONS: { value: DeviceFiltersValue["slotStatus"]; label: string }[] = [
  { value: "configured", label: "Slots configured" },
  { value: "unconfigured", label: "No slots configured" },
  { value: "empty_slots", label: "Has empty slots" },
  { value: "occupied_slots", label: "Has occupied slots" },
];

const FILAMENT_STATUS_OPTIONS = ["ready", "watch", "needs_drying", "quarantine", "unknown"] as const;

interface DashboardFiltersProps {
  value: DeviceFiltersValue;
  onChange: (value: DeviceFiltersValue) => void;
  printerBrands: string[];
  filamentTypes: string[];
  filamentBrands: string[];
  filamentColors: string[];
  visibleCount: number;
  totalCount: number;
}

interface ActiveChip {
  key: keyof DeviceFiltersValue;
  label: string;
}

/** Dashboard's device-module filter bar -- same controlled shape as
 * FilamentFilters.tsx (Tabs/Input/Select, filtering done client-side by the
 * caller), extended with alert/sensor/slot-status criteria plus active-filter
 * chips and a result counter, since the Dashboard filters modules rather
 * than a flat spool list. */
export function DashboardFilters({
  value,
  onChange,
  printerBrands,
  filamentTypes,
  filamentBrands,
  filamentColors,
  visibleCount,
  totalCount,
}: DashboardFiltersProps) {
  const activeChips: ActiveChip[] = [
    value.search.trim() && { key: "search" as const, label: `Search: "${value.search.trim()}"` },
    value.alertStatus !== ALL && {
      key: "alertStatus" as const,
      label: ALERT_STATUS_OPTIONS.find((o) => o.value === value.alertStatus)?.label ?? value.alertStatus,
    },
    value.sensorStatus !== ALL && {
      key: "sensorStatus" as const,
      label: SENSOR_STATUS_OPTIONS.find((o) => o.value === value.sensorStatus)?.label ?? value.sensorStatus,
    },
    value.slotStatus !== ALL && {
      key: "slotStatus" as const,
      label: SLOT_STATUS_OPTIONS.find((o) => o.value === value.slotStatus)?.label ?? value.slotStatus,
    },
    value.printerBrand !== ALL && { key: "printerBrand" as const, label: value.printerBrand },
    value.printerStatus !== ALL && {
      key: "printerStatus" as const,
      label: printerStatusLabel(value.printerStatus),
    },
    value.filamentType !== ALL && { key: "filamentType" as const, label: value.filamentType },
    value.filamentBrand !== ALL && { key: "filamentBrand" as const, label: value.filamentBrand },
    value.filamentColor !== ALL && { key: "filamentColor" as const, label: value.filamentColor },
    value.filamentStatus !== ALL && { key: "filamentStatus" as const, label: value.filamentStatus.replaceAll("_", " ") },
  ].filter((chip): chip is ActiveChip => Boolean(chip));

  function clearChip(key: keyof DeviceFiltersValue) {
    onChange({ ...value, [key]: key === "search" ? "" : ALL });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search printers, sensors, filaments…"
            value={value.search}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
            className="w-64 pl-8"
          />
        </div>

        <Select
          value={value.alertStatus}
          onValueChange={(alertStatus) => onChange({ ...value, alertStatus: alertStatus as DeviceFiltersValue["alertStatus"] })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Alert status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All alert statuses</SelectItem>
            {ALERT_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={value.sensorStatus}
          onValueChange={(sensorStatus) => onChange({ ...value, sensorStatus: sensorStatus as DeviceFiltersValue["sensorStatus"] })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Sensor status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All sensor statuses</SelectItem>
            {SENSOR_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={value.slotStatus}
          onValueChange={(slotStatus) => onChange({ ...value, slotStatus: slotStatus as DeviceFiltersValue["slotStatus"] })}
        >
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Slot status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All slot statuses</SelectItem>
            {SLOT_STATUS_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={value.printerBrand} onValueChange={(printerBrand) => onChange({ ...value, printerBrand })}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Printer brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All brands</SelectItem>
            {printerBrands.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={value.printerStatus} onValueChange={(printerStatus) => onChange({ ...value, printerStatus })}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Printer status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {PRINTER_OPERATIONAL_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                {printerStatusLabel(s)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={value.filamentType} onValueChange={(filamentType) => onChange({ ...value, filamentType })}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Filament type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All filament types</SelectItem>
            {filamentTypes.map((t) => (
              <SelectItem key={t} value={t}>
                {t}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={value.filamentBrand} onValueChange={(filamentBrand) => onChange({ ...value, filamentBrand })}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Filament brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All filament brands</SelectItem>
            {filamentBrands.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={value.filamentColor} onValueChange={(filamentColor) => onChange({ ...value, filamentColor })}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Color" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All colors</SelectItem>
            {filamentColors.map((c) => (
              <SelectItem key={c} value={c}>
                {c}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={value.filamentStatus}
          onValueChange={(filamentStatus) => onChange({ ...value, filamentStatus })}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Filament status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All filament statuses</SelectItem>
            {FILAMENT_STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {activeChips.length > 0 && (
          <Button variant="ghost" size="sm" onClick={() => onChange(EMPTY_DEVICE_FILTERS)}>
            Clear filters
          </Button>
        )}
      </div>

      {(activeChips.length > 0 || totalCount > 0) && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground">
            Showing {visibleCount} of {totalCount}
          </span>
          {activeChips.map((chip) => (
            <Badge key={chip.key} variant="secondary" className="flex items-center gap-1">
              {chip.label}
              <button
                type="button"
                aria-label={`Remove filter: ${chip.label}`}
                onClick={() => clearChip(chip.key)}
                className="rounded-full hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
