import { useState } from "react";

const REFRESH_STORAGE_KEY = "dashboard-refresh-interval-ms";

export function Settings() {
  const [refreshMs, setRefreshMs] = useState(
    Number(localStorage.getItem(REFRESH_STORAGE_KEY)) || 3000,
  );

  function handleChange(value: number) {
    setRefreshMs(value);
    localStorage.setItem(REFRESH_STORAGE_KEY, String(value));
  }

  return (
    <div>
      <h2>Settings</h2>

      <div className="card" style={{ marginBottom: 16 }}>
        <div className="card-label">Sensor mode</div>
        <p>
          Sensor mode is configured server-side via the <code>SENSOR_MODE</code> environment
          variable (default <code>mock</code>). See <code>backend/.env.example</code>.
        </p>
      </div>

      <div className="card">
        <div className="card-label">Dashboard refresh interval</div>
        <label>
          Poll every{" "}
          <select value={refreshMs} onChange={(e) => handleChange(Number(e.target.value))}>
            <option value={2000}>2 seconds</option>
            <option value={3000}>3 seconds</option>
            <option value={5000}>5 seconds</option>
          </select>
        </label>
        <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 8 }}>
          Applies on next Dashboard page load.
        </p>
      </div>
    </div>
  );
}
