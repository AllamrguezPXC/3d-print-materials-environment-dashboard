import { useCallback } from "react";
import { AffectedSpoolsPanel } from "../components/AffectedSpoolsPanel";
import { AlertPanel } from "../components/AlertPanel";
import { DryingRecommendationCard } from "../components/DryingRecommendationCard";
import { ReadingCard } from "../components/ReadingCard";
import { usePolling } from "../hooks/usePolling";
import { getCurrentReading } from "../api/readings";
import { dryingApi } from "../api/config";

const POLL_INTERVAL_MS = 3000;
const DRYING_POLL_INTERVAL_MS = 15000;

export function Dashboard() {
  const fetchCurrent = useCallback(() => getCurrentReading(), []);
  const fetchDrying = useCallback(() => dryingApi.recommendations(), []);

  const { data, error, loading } = usePolling(fetchCurrent, POLL_INTERVAL_MS);
  const drying = usePolling(fetchDrying, DRYING_POLL_INTERVAL_MS);

  if (loading && !data) {
    return <p>Loading current reading…</p>;
  }

  if (error && !data) {
    return <p className="error-state">Could not reach the backend: {error.message}</p>;
  }

  if (!data) return null;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 16 }}>
        <h2 style={{ margin: 0 }}>Live Environment</h2>
        <div style={{ color: "var(--text-muted)", fontSize: 13 }}>
          {new Date(data.timestamp).toLocaleString()} · source: <strong>{data.source}</strong> · sensor{" "}
          {data.sensor.serial_number}
          {data.location ? (
            <>
              {" "}
              · <strong>{data.location.name}</strong>
            </>
          ) : null}
        </div>
      </div>

      <div className="card-grid">
        <ReadingCard label="Temperature" value={`${data.temperature_c.toFixed(1)} °C`} />
        <ReadingCard label="Relative Humidity" value={`${data.relative_humidity_percent.toFixed(1)} %`} />
        <ReadingCard label="Pressure" value={`${data.pressure_kpa.toFixed(1)} kPa`} />
        <ReadingCard label="Dew Point" value={`${data.dew_point_c.toFixed(1)} °C`} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <AlertPanel alerts={data.alerts} />
      </div>

      <div style={{ marginBottom: 20 }}>
        <AffectedSpoolsPanel spools={data.affected_spools} />
      </div>

      <h3>Drying Recommendations</h3>
      {drying.data && drying.data.length > 0 ? (
        drying.data.map((rec) => <DryingRecommendationCard key={rec.spool_id} rec={rec} />)
      ) : (
        <p className="empty-state">No spools currently need drying.</p>
      )}
    </div>
  );
}
