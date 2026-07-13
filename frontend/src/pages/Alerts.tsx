import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { NoticeBanner } from "@/components/NoticeBanner";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useNotice } from "@/hooks/useNotice";
import { useAlerts, useResolveAlert } from "@/hooks/resources/alerts";
import { useLocations } from "@/hooks/resources/locations";
import type { AlertOut } from "@/types/api";

const ALL = "all";
const STATUS_OPTIONS = ["active", "resolved"] as const;
const SEVERITY_OPTIONS: AlertOut["severity"][] = ["info", "warning", "critical"];

export function Alerts() {
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [severityFilter, setSeverityFilter] = useState<string>(ALL);
  const { notice, notifySuccess, notifyError } = useNotice();

  const { data: alerts = [] } = useAlerts({
    isActive: statusFilter === ALL ? undefined : statusFilter === "active",
    severity: severityFilter === ALL ? undefined : severityFilter,
  });
  const { data: locations = [] } = useLocations();
  const resolveAlert = useResolveAlert();

  function handleResolve(id: number) {
    resolveAlert.mutate(id, {
      onSuccess: () => notifySuccess("Alert resolved."),
      onError: (err) => notifyError(err.message),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-heading font-semibold">Alerts</h1>
        <p className="text-sm text-muted-foreground">
          Full alert history — resolve an alert once its underlying condition has been addressed.
        </p>
      </div>
      <NoticeBanner notice={notice} />

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
          <CardTitle className="flex items-center gap-2">
            <Bell className="size-4 text-muted-foreground" />
            History
          </CardTitle>
          <div className="flex gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="sr-only">Status filter</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All statuses</SelectItem>
                  {STATUS_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="sr-only">Severity filter</Label>
              <Select value={severityFilter} onValueChange={setSeverityFilter}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL}>All severities</SelectItem>
                  {SEVERITY_OPTIONS.map((s) => (
                    <SelectItem key={s} value={s} className="capitalize">
                      {s}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {alerts.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No alerts match the current filters.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Severity</TableHead>
                  <TableHead>Metric</TableHead>
                  <TableHead>Message</TableHead>
                  <TableHead>Recommended action</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {alerts.map((alert) => (
                  <TableRow key={alert.id}>
                    <TableCell>
                      <StatusBadge status={alert.severity} />
                    </TableCell>
                    <TableCell className="capitalize">{alert.metric.replaceAll("_", " ")}</TableCell>
                    <TableCell className="whitespace-normal">{alert.message}</TableCell>
                    <TableCell className="whitespace-normal">{alert.recommended_action ?? "—"}</TableCell>
                    <TableCell>
                      {locations.find((l) => l.id === alert.location_id)?.name ?? "—"}
                    </TableCell>
                    <TableCell>
                      {alert.created_at ? new Date(alert.created_at).toLocaleString() : "—"}
                    </TableCell>
                    <TableCell>
                      {alert.is_active ? (
                        <StatusBadge status="warning" label="Active" />
                      ) : (
                        <StatusBadge status="ok" label="Resolved" />
                      )}
                    </TableCell>
                    <TableCell>
                      {alert.is_active && alert.id !== null && (
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={resolveAlert.isPending}
                          onClick={() => handleResolve(alert.id!)}
                        >
                          Resolve
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
