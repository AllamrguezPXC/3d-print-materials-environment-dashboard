import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SpoolForm, type SpoolFormValues } from "./SpoolForm";
import type { MaterialProfile } from "@/types/api";

function makeProfile(overrides: Partial<MaterialProfile>): MaterialProfile {
  return {
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
    ...overrides,
  };
}

const GENERIC_PLA = makeProfile({ id: 1, name: "PLA", family: "PLA-derived", manufacturer: null });
const PRUSAMENT_PLA = makeProfile({
  id: 2,
  name: "Prusament PLA",
  family: "PLA-derived",
  manufacturer: "Prusament",
  ideal_rh_max_percent: 35,
});
const GENERIC_PETG = makeProfile({ id: 3, name: "PETG", family: "PET-derived", manufacturer: null });

const MATERIALS = [GENERIC_PLA, PRUSAMENT_PLA, GENERIC_PETG];

function ControlledSpoolForm({ initial }: { initial: SpoolFormValues }) {
  const [value, setValue] = useState(initial);
  return <SpoolForm value={value} onChange={setValue} onSubmit={vi.fn()} materials={MATERIALS} />;
}

describe("SpoolForm manufacturer override suggestion", () => {
  it("shows no hint when the brand doesn't match any manufacturer-specific profile", () => {
    render(
      <ControlledSpoolForm
        initial={{ material_profile_id: "1", brand: "Generic", color: "", status: "ready" }}
      />,
    );

    expect(screen.queryByText(/profile available/i)).not.toBeInTheDocument();
  });

  it("suggests the manufacturer-specific profile when the brand matches", async () => {
    const user = userEvent.setup();
    render(
      <ControlledSpoolForm
        initial={{ material_profile_id: "1", brand: "", color: "", status: "ready" }}
      />,
    );

    await user.type(screen.getByLabelText(/brand/i), "Prusament");

    expect(screen.getByText(/prusament pla profile available/i)).toBeInTheDocument();
  });

  it("switches to the suggested profile when \"Use it\" is clicked, then hides the hint", async () => {
    const user = userEvent.setup();
    render(
      <ControlledSpoolForm
        initial={{ material_profile_id: "1", brand: "Prusament", color: "", status: "ready" }}
      />,
    );

    expect(screen.getByText(/prusament pla profile available/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /use it/i }));

    expect(screen.queryByText(/profile available/i)).not.toBeInTheDocument();
    expect(screen.getAllByRole("combobox")[0]).toHaveTextContent("Prusament PLA");
  });

  it("does not suggest an override for a different family's generic profile", async () => {
    const user = userEvent.setup();
    render(
      <ControlledSpoolForm
        initial={{ material_profile_id: "3", brand: "", color: "", status: "ready" }}
      />,
    );

    await user.type(screen.getByLabelText(/brand/i), "Prusament");

    expect(screen.queryByText(/profile available/i)).not.toBeInTheDocument();
  });
});
