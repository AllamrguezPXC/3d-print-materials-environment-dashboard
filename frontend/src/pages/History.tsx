import { useState } from "react";
import { HistoryChart } from "../components/HistoryChart";
import { captureReading, getReadingsHistory } from "../api/readings";
import type { HourlyAggregate } from "../types/api";

const CHART_COLORS = {
  temperature: "#e8813a",
  humidity: "#3f8ee0",
  pressure: "#8a6fd8",
};

function defaultFrom(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 16);
}

function defaultTo(): string {
  return new Date().toISOString().slice(0, 16);
}

export function History() {
  const [from, setFrom] = useState(defaultFrom());
  const [to, setTo] = useState(defaultTo());
  const [hourly, setHourly] = useState<HourlyAggregate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  async function loadHistory() {
    setLoading(true);
    setError(null);
    try {
      const result = await getReadingsHistory({
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
        aggregate: "hour",
      });
      setHourly(result.hourly);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function handleCapture() {
    setCapturing(true);
    try {
      await captureReading();
      await loadHistory();
    } finally {
      setCapturing(false);
    }
  }

  return (
    <div>
      <h2>History</h2>
      <div style={{ display: "flex", gap: 12, alignItems: "flex-end", marginBottom: 20, flexWrap: "wrap" }}>
        <label>
          From
          <br />
          <input type="datetime-local" value={from} onChange={(e) => setFrom(e.target.value)} />
        </label>
        <label>
          To
          <br />
          <input type="datetime-local" value={to} onChange={(e) => setTo(e.target.value)} />
        </label>
        <button className="primary" onClick={loadHistory} disabled={loading}>
          {loading ? "Loading…" : "Load history"}
        </button>
        <button onClick={handleCapture} disabled={capturing} className="theme-toggle">
          {capturing ? "Capturing…" : "Capture reading now"}
        </button>
      </div>

      {error && <p className="error-state">{error}</p>}

      {hourly.length === 0 ? (
        <p className="empty-state">No readings in this range yet. Try "Capture reading now" a few times, then reload.</p>
      ) : (
        <>
          <HistoryChart
            title="Temperature (°C)"
            data={hourly}
            yKey="temperature_c"
            color={CHART_COLORS.temperature}
            unit="°C"
          />
          <HistoryChart
            title="Relative Humidity (%)"
            data={hourly}
            yKey="relative_humidity_percent"
            color={CHART_COLORS.humidity}
            unit="%"
          />
          <HistoryChart
            title="Pressure (Pa)"
            data={hourly}
            yKey="pressure_pa"
            color={CHART_COLORS.pressure}
            unit="Pa"
          />
        </>
      )}
    </div>
  );
}
