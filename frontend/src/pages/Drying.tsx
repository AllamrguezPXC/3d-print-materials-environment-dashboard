import { useEffect, useState } from "react";
import { DryingRecommendationCard } from "../components/DryingRecommendationCard";
import { dryingApi } from "../api/config";
import type { DryingRecommendation } from "../types/api";

export function Drying() {
  const [recs, setRecs] = useState<DryingRecommendation[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    dryingApi
      .recommendations()
      .then(setRecs)
      .catch((err) => setError((err as Error).message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h2>Drying Recommendations</h2>
      <p style={{ color: "var(--text-muted)" }}>
        Advisory only — this dashboard does not control any dryer directly. Verify dryer
        capability and monitor humidity with a sensor before marking a spool ready.
      </p>
      {error && <p className="error-state">{error}</p>}
      {loading ? (
        <p>Loading…</p>
      ) : recs.length === 0 ? (
        <p className="empty-state">No spools currently need drying.</p>
      ) : (
        recs.map((rec) => <DryingRecommendationCard key={rec.spool_id} rec={rec} />)
      )}
    </div>
  );
}
