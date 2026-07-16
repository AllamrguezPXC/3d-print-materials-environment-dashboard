import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Trash } from "./Trash";
import {
  locationsApi,
  materialsApi,
  printersApi,
  sensorsApi,
  spoolsApi,
} from "@/api/config";
import type {
  FilamentSpool,
  Location,
  MaterialProfile,
  Printer,
  Sensor,
} from "@/types/api";

vi.mock("@/api/config");

const DELETED_PRINTER: Printer = {
  id: 1,
  name: "A1 mini #1",
  brand: "Bambu Lab",
  model: "A1 mini",
  serial_number: null,
  notes: null,
  filament_system_type: "ams",
  operational_status: "activo",
  deleted_at: "2026-07-10T12:00:00Z",
};

const DELETED_SENSOR: Sensor = {
  id: 2,
  name: "Mock Sensor 2",
  model: "mock",
  serial_number: "MOCK-0002",
  sensor_type: "mock",
  port: null,
  is_active: true,
  location_id: null,
  deleted_at: "2026-07-11T12:00:00Z",
};

const DELETED_LOCATION: Location = {
  id: 3,
  name: "Storage Box B",
  location_type: "storage_box",
  printer_id: null,
  description: null,
  max_temp_c: null,
  notes: null,
  slot_index: null,
  deleted_at: "2026-07-12T12:00:00Z",
};

const DELETED_MATERIAL: MaterialProfile = {
  id: 4,
  name: "Old PETG",
  family: "PETG-derived",
  manufacturer: null,
  variant: null,
  ideal_temp_min_c: 18,
  ideal_temp_max_c: 30,
  warning_temp_min_c: 13,
  warning_temp_max_c: 35,
  critical_temp_min_c: 8,
  critical_temp_max_c: 40,
  ideal_rh_max_percent: 40,
  warning_rh_max_percent: 50,
  critical_rh_max_percent: 60,
  drying_temp_c: 45,
  drying_time_hours_min: 4,
  drying_time_hours_max: 6,
  storage_notes: null,
  drying_notes: null,
  source_notes: null,
  deleted_at: "2026-07-13T12:00:00Z",
};

const ACTIVE_MATERIAL: MaterialProfile = { ...DELETED_MATERIAL, id: 5, name: "PLA", deleted_at: null };

const DELETED_SPOOL: FilamentSpool = {
  id: 6,
  material_profile_id: 5,
  brand: "Generic",
  color: "Black",
  diameter_mm: 1.75,
  status: "ready",
  deleted_at: "2026-07-14T12:00:00Z",
};

function mockLists(overrides?: {
  printers?: Printer[];
  sensors?: Sensor[];
  locations?: Location[];
  deletedMaterials?: MaterialProfile[];
  activeMaterials?: MaterialProfile[];
  spools?: FilamentSpool[];
}) {
  const printers = overrides?.printers ?? [DELETED_PRINTER];
  const sensors = overrides?.sensors ?? [DELETED_SENSOR];
  const locations = overrides?.locations ?? [DELETED_LOCATION];
  const deletedMaterials = overrides?.deletedMaterials ?? [DELETED_MATERIAL];
  const activeMaterials = overrides?.activeMaterials ?? [ACTIVE_MATERIAL];
  const spools = overrides?.spools ?? [DELETED_SPOOL];

  vi.mocked(printersApi.list).mockImplementation((params) =>
    Promise.resolve(params?.deletedOnly ? printers : []),
  );
  vi.mocked(sensorsApi.list).mockImplementation((params) =>
    Promise.resolve(params?.deletedOnly ? sensors : []),
  );
  vi.mocked(locationsApi.list).mockImplementation((params) =>
    Promise.resolve(params?.deletedOnly ? locations : []),
  );
  vi.mocked(materialsApi.list).mockImplementation((params) =>
    Promise.resolve(params?.deletedOnly ? deletedMaterials : activeMaterials),
  );
  vi.mocked(spoolsApi.list).mockImplementation((params) =>
    Promise.resolve(params?.deletedOnly ? spools : []),
  );

  vi.mocked(printersApi.restore).mockResolvedValue({ ...DELETED_PRINTER, deleted_at: null });
  vi.mocked(sensorsApi.restore).mockResolvedValue({ ...DELETED_SENSOR, deleted_at: null });
  vi.mocked(locationsApi.restore).mockResolvedValue({ ...DELETED_LOCATION, deleted_at: null });
  vi.mocked(materialsApi.restore).mockResolvedValue({ ...DELETED_MATERIAL, deleted_at: null });
  vi.mocked(spoolsApi.restore).mockResolvedValue({ ...DELETED_SPOOL, deleted_at: null });
}

function renderTrash() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <Trash />
    </QueryClientProvider>,
  );
}

describe("Trash", () => {
  it("combines all 5 resource types into one table", async () => {
    mockLists();
    renderTrash();

    expect(await screen.findByText("A1 mini #1")).toBeInTheDocument();
    expect(screen.getByText("Mock Sensor 2")).toBeInTheDocument();
    expect(screen.getByText("Storage Box B")).toBeInTheDocument();
    expect(screen.getByText("Old PETG")).toBeInTheDocument();
    expect(screen.getByText("Generic — PLA (Black)")).toBeInTheDocument();
  });

  it("shows the empty state when all 5 resources return empty arrays", async () => {
    mockLists({
      printers: [],
      sensors: [],
      locations: [],
      deletedMaterials: [],
      activeMaterials: [],
      spools: [],
    });
    renderTrash();

    expect(await screen.findByText("Trash is empty.")).toBeInTheDocument();
  });

  it("calls the restore mutation for the matching resource type", async () => {
    const user = userEvent.setup();
    mockLists();
    renderTrash();

    await screen.findByText("A1 mini #1");
    const restoreButtons = screen.getAllByRole("button", { name: /^restore$/i });
    await user.click(restoreButtons[0]);

    await waitFor(() => {
      const restoreCalls = [
        vi.mocked(printersApi.restore).mock.calls,
        vi.mocked(sensorsApi.restore).mock.calls,
        vi.mocked(locationsApi.restore).mock.calls,
        vi.mocked(materialsApi.restore).mock.calls,
        vi.mocked(spoolsApi.restore).mock.calls,
      ];
      const totalCalls = restoreCalls.reduce((sum, calls) => sum + calls.length, 0);
      expect(totalCalls).toBe(1);
    });
  });
});
