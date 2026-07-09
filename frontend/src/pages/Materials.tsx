import { useEffect, useState } from "react";
import { NoticeBanner } from "../components/NoticeBanner";
import { useNotice } from "../hooks/useNotice";
import { materialsApi } from "../api/config";
import type { MaterialProfile } from "../types/api";

type DraftProfile = Omit<MaterialProfile, "id">;

const EMPTY_DRAFT: DraftProfile = {
  name: "",
  family: "",
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
};

export function Materials() {
  const [profiles, setProfiles] = useState<MaterialProfile[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [draft, setDraft] = useState<DraftProfile>(EMPTY_DRAFT);
  const { notice, notifySuccess, notifyError } = useNotice();

  async function refresh() {
    try {
      setProfiles(await materialsApi.list());
    } catch (err) {
      notifyError((err as Error).message);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  function startEdit(profile: MaterialProfile) {
    setEditingId(profile.id);
    const { id: _id, ...rest } = profile;
    setDraft(rest);
  }

  function cancelEdit() {
    setEditingId(null);
    setDraft(EMPTY_DRAFT);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!draft.name.trim() || !draft.family.trim()) {
      notifyError("Name and family are required.");
      return;
    }
    try {
      if (editingId !== null) {
        await materialsApi.update(editingId, draft);
        notifySuccess(`Profile "${draft.name}" updated.`);
      } else {
        await materialsApi.create(draft);
        notifySuccess(`Profile "${draft.name}" created.`);
      }
      cancelEdit();
      refresh();
    } catch (err) {
      notifyError((err as Error).message);
    }
  }

  async function handleDelete(id: number) {
    try {
      await materialsApi.remove(id);
      notifySuccess("Profile deleted.");
      if (editingId === id) cancelEdit();
      refresh();
    } catch (err) {
      notifyError((err as Error).message);
    }
  }

  return (
    <div>
      <h2>Material Profiles</h2>
      <p style={{ color: "var(--text-muted)" }}>
        Thresholds and drying recommendations are editable — manufacturer-specific profiles
        should override generic family defaults.
      </p>
      <NoticeBanner notice={notice} />

      <div className="card" style={{ marginBottom: 20, overflowX: "auto" }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Family</th>
              <th>Ideal RH max</th>
              <th>Warning RH max</th>
              <th>Critical RH max</th>
              <th>Drying temp</th>
              <th>Drying time</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {profiles.map((p) => (
              <tr key={p.id}>
                <td>{p.name}</td>
                <td>{p.family}</td>
                <td>{p.ideal_rh_max_percent}%</td>
                <td>{p.warning_rh_max_percent}%</td>
                <td>{p.critical_rh_max_percent}%</td>
                <td>{p.drying_temp_c}°C</td>
                <td>
                  {p.drying_time_hours_min}-{p.drying_time_hours_max}h
                </td>
                <td style={{ whiteSpace: "nowrap" }}>
                  <button onClick={() => startEdit(p)}>Edit</button>{" "}
                  <button onClick={() => handleDelete(p.id)}>Delete</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="card">
        <div className="card-label">{editingId !== null ? "Edit profile" : "New profile"}</div>
        <form onSubmit={handleSave} style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10 }}>
          <label>
            Name
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
          </label>
          <label>
            Family
            <input value={draft.family} onChange={(e) => setDraft({ ...draft, family: e.target.value })} />
          </label>
          <label>
            Manufacturer
            <input
              value={draft.manufacturer ?? ""}
              onChange={(e) => setDraft({ ...draft, manufacturer: e.target.value || null })}
            />
          </label>
          <label>
            Variant
            <input
              value={draft.variant ?? ""}
              onChange={(e) => setDraft({ ...draft, variant: e.target.value || null })}
            />
          </label>
          <label>
            Ideal RH max %
            <input
              type="number"
              value={draft.ideal_rh_max_percent}
              onChange={(e) => setDraft({ ...draft, ideal_rh_max_percent: Number(e.target.value) })}
            />
          </label>
          <label>
            Warning RH max %
            <input
              type="number"
              value={draft.warning_rh_max_percent}
              onChange={(e) => setDraft({ ...draft, warning_rh_max_percent: Number(e.target.value) })}
            />
          </label>
          <label>
            Critical RH max %
            <input
              type="number"
              value={draft.critical_rh_max_percent}
              onChange={(e) => setDraft({ ...draft, critical_rh_max_percent: Number(e.target.value) })}
            />
          </label>
          <label>
            Drying temp °C
            <input
              type="number"
              value={draft.drying_temp_c}
              onChange={(e) => setDraft({ ...draft, drying_temp_c: Number(e.target.value) })}
            />
          </label>
          <label>
            Drying time min (h)
            <input
              type="number"
              value={draft.drying_time_hours_min}
              onChange={(e) => setDraft({ ...draft, drying_time_hours_min: Number(e.target.value) })}
            />
          </label>
          <label>
            Drying time max (h)
            <input
              type="number"
              value={draft.drying_time_hours_max}
              onChange={(e) => setDraft({ ...draft, drying_time_hours_max: Number(e.target.value) })}
            />
          </label>
          <label style={{ gridColumn: "span 2" }}>
            Storage notes
            <input
              value={draft.storage_notes ?? ""}
              onChange={(e) => setDraft({ ...draft, storage_notes: e.target.value || null })}
            />
          </label>
          <div style={{ gridColumn: "span 4", display: "flex", gap: 8 }}>
            <button className="primary" type="submit">
              {editingId !== null ? "Save changes" : "Create profile"}
            </button>
            {editingId !== null && (
              <button type="button" onClick={cancelEdit}>
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
