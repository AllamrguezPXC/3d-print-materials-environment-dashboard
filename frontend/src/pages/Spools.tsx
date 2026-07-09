import { useEffect, useState } from "react";
import { assignmentsApi, locationsApi, materialsApi, spoolsApi } from "../api/config";
import type { FilamentSpool, Location, MaterialProfile, SpoolAssignment } from "../types/api";

const STATUS_OPTIONS: FilamentSpool["status"][] = ["ready", "watch", "needs_drying", "quarantine", "unknown"];

export function Spools() {
  const [spools, setSpools] = useState<FilamentSpool[]>([]);
  const [materials, setMaterials] = useState<MaterialProfile[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [assignments, setAssignments] = useState<SpoolAssignment[]>([]);
  const [error, setError] = useState<string | null>(null);

  const [newSpool, setNewSpool] = useState({
    material_profile_id: "",
    brand: "",
    color: "",
    status: "ready" as FilamentSpool["status"],
  });
  const [assignmentDraft, setAssignmentDraft] = useState<Record<number, string>>({});

  async function refresh() {
    try {
      const [s, m, l, a] = await Promise.all([
        spoolsApi.list(),
        materialsApi.list(),
        locationsApi.list(),
        assignmentsApi.list(),
      ]);
      setSpools(s);
      setMaterials(m);
      setLocations(l);
      setAssignments(a);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function handleAddSpool(e: React.FormEvent) {
    e.preventDefault();
    if (!newSpool.material_profile_id || !newSpool.brand.trim()) return;
    await spoolsApi.create({
      material_profile_id: Number(newSpool.material_profile_id),
      brand: newSpool.brand,
      color: newSpool.color || null,
      status: newSpool.status,
    });
    setNewSpool({ material_profile_id: "", brand: "", color: "", status: "ready" });
    refresh();
  }

  async function handleAssign(spoolId: number) {
    const locationId = assignmentDraft[spoolId];
    if (!locationId) return;
    await assignmentsApi.create({ spool_id: spoolId, location_id: Number(locationId), is_active: true });
    refresh();
  }

  function activeLocationFor(spoolId: number): Location | undefined {
    const assignment = assignments.find((a) => a.spool_id === spoolId && a.is_active);
    return assignment ? locations.find((l) => l.id === assignment.location_id) : undefined;
  }

  return (
    <div>
      <h2>Filament Spools</h2>
      {error && <p className="error-state">{error}</p>}

      <div className="card" style={{ marginBottom: 20 }}>
        <table>
          <thead>
            <tr>
              <th>Material</th>
              <th>Brand</th>
              <th>Color</th>
              <th>Status</th>
              <th>Assigned location</th>
              <th>Assign to…</th>
            </tr>
          </thead>
          <tbody>
            {spools.map((s) => {
              const material = materials.find((m) => m.id === s.material_profile_id);
              const currentLocation = activeLocationFor(s.id);
              return (
                <tr key={s.id}>
                  <td>{material?.name ?? s.material_profile_id}</td>
                  <td>{s.brand}</td>
                  <td>{s.color ?? "—"}</td>
                  <td>
                    <span
                      className={
                        s.status === "ready"
                          ? "badge badge-ok"
                          : s.status === "watch"
                            ? "badge badge-warning"
                            : "badge badge-critical"
                      }
                    >
                      {s.status}
                    </span>
                  </td>
                  <td>{currentLocation?.name ?? "Unassigned"}</td>
                  <td>
                    <select
                      value={assignmentDraft[s.id] ?? ""}
                      onChange={(e) => setAssignmentDraft({ ...assignmentDraft, [s.id]: e.target.value })}
                    >
                      <option value="">Select location…</option>
                      {locations.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>{" "}
                    <button onClick={() => handleAssign(s.id)}>Assign</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-label">New spool</div>
        <form onSubmit={handleAddSpool} style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <select
            value={newSpool.material_profile_id}
            onChange={(e) => setNewSpool({ ...newSpool, material_profile_id: e.target.value })}
          >
            <option value="">Material…</option>
            {materials.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </select>
          <input
            placeholder="Brand"
            value={newSpool.brand}
            onChange={(e) => setNewSpool({ ...newSpool, brand: e.target.value })}
          />
          <input
            placeholder="Color"
            value={newSpool.color}
            onChange={(e) => setNewSpool({ ...newSpool, color: e.target.value })}
          />
          <select
            value={newSpool.status}
            onChange={(e) => setNewSpool({ ...newSpool, status: e.target.value as FilamentSpool["status"] })}
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
          <button className="primary" type="submit">
            Add spool
          </button>
        </form>
      </div>
    </div>
  );
}
