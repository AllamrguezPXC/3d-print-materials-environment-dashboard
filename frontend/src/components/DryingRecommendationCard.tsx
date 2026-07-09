import type { DryingRecommendation } from "../types/api";

function statusBadgeClass(status: DryingRecommendation["current_status"]): string {
  if (status === "critical") return "badge badge-critical";
  if (status === "warning") return "badge badge-warning";
  return "badge badge-ok";
}

export function DryingRecommendationCard({ rec }: { rec: DryingRecommendation }) {
  return (
    <div className="card" style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <strong>{rec.material_profile_name} — spool #{rec.spool_id}</strong>
        <span className={statusBadgeClass(rec.current_status)}>{rec.current_status}</span>
      </div>
      <p style={{ marginTop: 8 }}>{rec.message}</p>
    </div>
  );
}
