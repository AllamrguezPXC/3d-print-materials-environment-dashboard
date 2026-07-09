import type { AlertOut } from "../types/api";

function severityBadgeClass(severity: AlertOut["severity"]): string {
  if (severity === "critical") return "badge badge-critical";
  if (severity === "warning") return "badge badge-warning";
  return "badge badge-ok";
}

export function AlertPanel({ alerts }: { alerts: AlertOut[] }) {
  if (alerts.length === 0) {
    return (
      <div className="card">
        <div className="card-label">Alerts</div>
        <p className="empty-state">No active alerts.</p>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card-label">Alerts</div>
      <table>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Metric</th>
            <th>Message</th>
            <th>Recommended action</th>
          </tr>
        </thead>
        <tbody>
          {alerts.map((alert, idx) => (
            <tr key={alert.id ?? idx}>
              <td>
                <span className={severityBadgeClass(alert.severity)}>{alert.severity}</span>
              </td>
              <td>{alert.metric}</td>
              <td>{alert.message}</td>
              <td>{alert.recommended_action ?? "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
