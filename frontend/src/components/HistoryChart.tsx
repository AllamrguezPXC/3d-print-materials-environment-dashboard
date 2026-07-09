import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { HourlyAggregate } from "../types/api";

interface HistoryChartProps {
  title: string;
  data: HourlyAggregate[];
  yKey: "temperature_c" | "relative_humidity_percent" | "pressure_pa";
  color: string;
  unit: string;
}

export function HistoryChart({ title, data, yKey, color, unit }: HistoryChartProps) {
  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <div className="card-label">{title}</div>
      <ResponsiveContainer width="100%" height={220}>
        <LineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          <XAxis
            dataKey="hour"
            tickFormatter={(v: string) =>
              new Date(v).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
            }
            stroke="var(--text-muted)"
            fontSize={12}
          />
          <YAxis stroke="var(--text-muted)" fontSize={12} unit={unit} />
          <Tooltip
            labelFormatter={(v) => new Date(v as string).toLocaleString()}
            contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)" }}
          />
          <Line
            type="monotone"
            dataKey={yKey}
            stroke={color}
            strokeWidth={2}
            dot={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
