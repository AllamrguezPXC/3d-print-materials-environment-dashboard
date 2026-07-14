import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Layout } from "./Layout";
import { getCurrentReading } from "@/api/readings";

vi.mock("@/api/readings");

const mockedGetCurrentReading = vi.mocked(getCurrentReading);

function renderLayout() {
  mockedGetCurrentReading.mockResolvedValue({ sensors: [], message: "No active sensors configured." });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/"]}>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<p>Dashboard content</p>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("Layout", () => {
  it("does not render a sidebar nav link for Alerts (replaced by the notification bell)", () => {
    renderLayout();

    expect(screen.queryByRole("link", { name: /alerts/i })).not.toBeInTheDocument();
  });

  it("renders the AlertsBell button in the persistent header", () => {
    renderLayout();

    expect(screen.getByRole("button", { name: /alerts/i })).toBeInTheDocument();
  });

  it("still renders the other sidebar nav links", () => {
    renderLayout();

    expect(screen.getByRole("link", { name: /dashboard/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /sensors/i })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /printers/i })).toBeInTheDocument();
  });
});
