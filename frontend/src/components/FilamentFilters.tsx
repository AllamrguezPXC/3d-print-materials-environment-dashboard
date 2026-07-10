import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { FilamentSpool, MaterialProfile } from "@/types/api";

export type FilamentScope = "all" | "ams" | "storage";
export type FilamentGroupBy = "none" | "location" | "printer" | "material";

const ALL = "all";
const NONE = "none";

export interface FilamentFiltersValue {
  search: string;
  scope: FilamentScope;
  brand: string;
  materialFamily: string;
  materialProfileId: string;
  status: string;
  groupBy: FilamentGroupBy;
}

export const EMPTY_FILAMENT_FILTERS: FilamentFiltersValue = {
  search: "",
  scope: "all",
  brand: ALL,
  materialFamily: ALL,
  materialProfileId: ALL,
  status: ALL,
  groupBy: "none",
};

const STATUS_OPTIONS: FilamentSpool["status"][] = ["ready", "watch", "needs_drying", "quarantine", "unknown"];

interface FilamentFiltersProps {
  value: FilamentFiltersValue;
  onChange: (value: FilamentFiltersValue) => void;
  brands: string[];
  materials: MaterialProfile[];
}

export function FilamentFilters({ value, onChange, brands, materials }: FilamentFiltersProps) {
  const families = Array.from(new Set(materials.map((m) => m.family))).sort();

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <Tabs value={value.scope} onValueChange={(scope) => onChange({ ...value, scope: scope as FilamentScope })}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="ams">AMS</TabsTrigger>
            <TabsTrigger value="storage">Storage</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="relative">
          <Search className="absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search filaments…"
            value={value.search}
            onChange={(e) => onChange({ ...value, search: e.target.value })}
            className="w-56 pl-8"
          />
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <Select value={value.brand} onValueChange={(brand) => onChange({ ...value, brand })}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Brand" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All brands</SelectItem>
            {brands.map((b) => (
              <SelectItem key={b} value={b}>
                {b}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={value.materialFamily} onValueChange={(materialFamily) => onChange({ ...value, materialFamily })}>
          <SelectTrigger className="w-40">
            <SelectValue placeholder="Material type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All material types</SelectItem>
            {families.map((f) => (
              <SelectItem key={f} value={f}>
                {f}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={value.materialProfileId}
          onValueChange={(materialProfileId) => onChange({ ...value, materialProfileId })}
        >
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Filament type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All filament types</SelectItem>
            {materials.map((m) => (
              <SelectItem key={m.id} value={String(m.id)}>
                {m.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select value={value.status} onValueChange={(status) => onChange({ ...value, status })}>
          <SelectTrigger className="w-36">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL}>All statuses</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>
                {s.replaceAll("_", " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <Select
          value={value.groupBy}
          onValueChange={(groupBy) => onChange({ ...value, groupBy: groupBy as FilamentGroupBy })}
        >
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No grouping</SelectItem>
            <SelectItem value="location">Group by location</SelectItem>
            <SelectItem value="printer">Group by printer</SelectItem>
            <SelectItem value="material">Group by material</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
