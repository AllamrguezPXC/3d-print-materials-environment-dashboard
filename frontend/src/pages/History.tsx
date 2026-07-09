import { useEffect, useState } from "react";
import { HistoryChart } from "../components/HistoryChart";
import { captureReading, getReadingsHistory } from "../api/readings";
import { locationsApi, sensorsApi } from "../api/config";
import type { HourlyAggregate, Location, Sensor } from "../types/api";

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
  const [sensorId, setSensorId] = useState("");
  const [locationId, setLocationId] = useState("");
  const [sensors, setSensors] = useState<Sensor[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [hourly, setHourly] = useState<HourlyAggregate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [capturing, setCapturing] = useState(false);

  useEffect(() => {
    sensorsApi.list().then(setSensors).catch(() => {});
    locationsApi.list().then(setLocations).catch(() => {});
  }, []);

  async function loadHistory() {
    setLoading(true);
    setError(null);
    try {
      const result = await getReadingsHistory({
        from: new Date(from).toISOString(),
        to: new Date(to).toISOString(),
        aggregate: "hour",
        sensorId: sensorId ? Number(sensorId) : undefined,
        locationId: locationId ? Number(locationId) : undefined,
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
        <label>
          Sensor
          <br />
          <select value={sensorId} onChange={(e) => setSensorId(e.target.value)}>
            <option value="">All sensors</option>
            {sensors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          Location
          <br />
          <select value={locationId} onChange={(e) => setLocationId(e.target.value)}>
            <option value="">All locations</option>
            {locations.map((l) => (
              <option key={l.id} value={l.id}>
                {l.name}
              </option>
            ))}
          </select>
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
