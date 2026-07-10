import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AlertOut } from "@/types/api";

export function AlertPanel({ alerts }: { alerts: AlertOut[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <AlertTriangle className="size-4 text-muted-foreground" />
          Alerts
        </CardTitle>
      </CardHeader>
      <CardContent>
        {alerts.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">No active alerts.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Severity</TableHead>
                <TableHead>Metric</TableHead>
                <TableHead>Message</TableHead>
                <TableHead>Recommended action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {alerts.map((alert, idx) => (
                <TableRow key={alert.id ?? idx}>
                  <TableCell>
                    <StatusBadge status={alert.severity} />
                  </TableCell>
                  <TableCell className="capitalize">{alert.metric.replaceAll("_", " ")}</TableCell>
                  <TableCell className="whitespace-normal">{alert.message}</TableCell>
                  <TableCell className="whitespace-normal">{alert.recommended_action ?? "—"}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
