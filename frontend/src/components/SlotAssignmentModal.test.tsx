import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SlotAssignmentModal } from "./SlotAssignmentModal";
import { spoolsApi } from "@/api/config";
import type { FilamentSpool, Location, MaterialProfile } from "@/types/api";

vi.mock("@/api/config", async () => {
  const actual = await vi.importActual<typeof import("@/api/config")>("@/api/config");
  return { ...actual, spoolsApi: { ...actual.spoolsApi, create: vi.fn() } };
});

const mockedCreate = vi.mocked(spoolsApi.create);

const LOCATION: Location = {
  id: 10,
  name: "AMS Slot 1 - P1S #1",
  location_type: "printer_ams",
  printer_id: 5,
  description: null,
  max_temp_c: null,
  notes: null,
  slot_index: 0,
  deleted_at: null,
};

const MATERIAL: MaterialProfile = {
  id: 1,
  name: "PLA",
  family: "PLA-derived",
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
  deleted_at: null,
};

const SPOOL: FilamentSpool = { id: 1, material_profile_id: 1, brand: "Generic", color: "Black", diameter_mm: 1.75, status: "ready", deleted_at: null };

function renderModal(overrides: Partial<React.ComponentProps<typeof SlotAssignmentModal>> = {}) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const onSelectedSpoolIdChange = vi.fn();
  render(
    <QueryClientProvider client={queryClient}>
      <SlotAssignmentModal
        location={LOCATION}
        open
        onOpenChange={vi.fn()}
        currentAssignment={null}
        currentSpool={null}
        currentMaterial={null}
        availableSpools={[]}
        materials={[MATERIAL]}
        selectedSpoolId=""
        onSelectedSpoolIdChange={onSelectedSpoolIdChange}
        onAssign={vi.fn()}
        onClear={vi.fn()}
        {...overrides}
      />
    </QueryClientProvider>,
  );
  return { onSelectedSpoolIdChange };
}

describe("SlotAssignmentModal", () => {
  it("shows the empty state and a create-spool button when no spools are available", () => {
    renderModal();

    expect(screen.getByText("No unassigned spools available.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /create new spool/i })).toBeInTheDocument();
  });

  it("reveals the inline SpoolForm when the create-spool button is clicked", async () => {
    const user = userEvent.setup();
    renderModal();

    await user.click(screen.getByRole("button", { name: /create new spool/i }));

    expect(screen.getByText("New spool")).toBeInTheDocument();
    expect(screen.getByLabelText("Brand")).toBeInTheDocument();
  });

  it("creates a spool and auto-selects it on success", async () => {
    const user = userEvent.setup();
    const created: FilamentSpool = { id: 99, material_profile_id: 1, brand: "NewBrand", color: null, diameter_mm: 1.75, status: "ready", deleted_at: null };
    mockedCreate.mockResolvedValue(created);
    const { onSelectedSpoolIdChange } = renderModal();

    await user.click(screen.getByRole("button", { name: /create new spool/i }));
    await user.click(screen.getAllByRole("combobox")[1]);
    await user.click(screen.getByRole("option", { name: "PLA" }));
    await user.type(screen.getByLabelText("Brand"), "NewBrand");
    await user.click(screen.getByRole("button", { name: /create & select/i }));

    await waitFor(() => expect(onSelectedSpoolIdChange).toHaveBeenCalledWith("99"));
  });

  it("shows spool status alongside material/brand/color in the selector", async () => {
    const user = userEvent.setup();
    renderModal({ availableSpools: [SPOOL] });

    await user.click(screen.getByRole("combobox"));

    expect(screen.getByText(/PLA — Generic \(Black\)/)).toBeInTheDocument();
    expect(screen.getByRole("option", { name: /PLA — Generic \(Black\)/ })).toBeInTheDocument();
  });
});
