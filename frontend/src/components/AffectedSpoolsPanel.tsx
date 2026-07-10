import { Package } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AffectedSpoolInfo } from "@/types/api";

export function AffectedSpoolsPanel({ spools }: { spools: AffectedSpoolInfo[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Package className="size-4 text-muted-foreground" />
          Affected Spools & Materials
        </CardTitle>
      </CardHeader>
      <CardContent>
        {spools.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No spools assigned to this location.
          </p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Material</TableHead>
                <TableHead>Brand</TableHead>
                <TableHead>Color</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {spools.map((s) => (
                <TableRow key={s.spool_id}>
                  <TableCell>{s.material_profile_name}</TableCell>
                  <TableCell>{s.brand}</TableCell>
                  <TableCell>{s.color ?? "—"}</TableCell>
                  <TableCell>
                    <StatusBadge status={s.status} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
