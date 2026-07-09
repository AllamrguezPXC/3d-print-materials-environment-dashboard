import type { AffectedSpoolInfo } from "../types/api";

function statusBadgeClass(status: string): string {
  if (status === "ready") return "badge badge-ok";
  if (status === "watch") return "badge badge-warning";
  return "badge badge-critical";
}

export function AffectedSpoolsPanel({ spools }: { spools: AffectedSpoolInfo[] }) {
  if (spools.length === 0) {
    return (
      <div className="card">
        <div className="card-label">Affected Spools & Materials</div>
        <p className="empty-state">No spools assigned to this location.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-label">Affected Spools & Materials</div>
      <table>
        <thead>
          <tr>
            <th>Material</th>
            <th>Brand</th>
            <th>Color</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {spools.map((s) => (
            <tr key={s.spool_id}>
              <td>{s.material_profile_name}</td>
              <td>{s.brand}</td>
              <td>{s.color ?? "—"}</td>
              <td>
                <span className={statusBadgeClass(s.status)}>{s.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
