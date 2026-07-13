import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { HistoryChart } from "@/components/HistoryChart";
import { useDryingSessionTrend } from "@/hooks/resources/drying";
import type { DryingSessionRead } from "@/types/api";

interface DryingSessionTrendDialogProps {
  session: DryingSessionRead | null;
  onOpenChange: (open: boolean) => void;
}

/** Requirements.md section 11.6: lets a user "review measured trend" for a
 * drying session, over that session's own started_at..ended_at window. Only
 * humidity + temperature are charted -- humidity is the primary filament
 * readiness metric and pressure should not normally drive a drying decision
 * (Domain Rules), so it's left out of this focused view. */
export function DryingSessionTrendDialog({ session, onOpenChange }: DryingSessionTrendDialogProps) {
  const { data: history, isLoading } = useDryingSessionTrend(session);
  const hourly = history?.hourly ?? [];

  return (
    <Dialog open={session !== null} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Measured trend</DialogTitle>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : hourly.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No readings recorded in this session's time window yet.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            <HistoryChart
              title="Relative Humidity (%)"
              data={hourly}
              yKey="relative_humidity_percent"
              color="var(--chart-2)"
              unit="%"
            />
            <HistoryChart
              title="Temperature (°C)"
              data={hourly}
              yKey="temperature_c"
              color="var(--chart-1)"
              unit="°C"
            />
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
