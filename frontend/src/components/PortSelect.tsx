import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSensorPorts } from "@/hooks/resources/ports";

interface PortSelectProps {
  value: string;
  onChange: (value: string) => void;
}

/** Detected-port dropdown with a manual "Scan" trigger -- auto-detection is
 * a convenience, never a requirement: the underlying Input this pairs with
 * still accepts a manually-typed port when detection isn't possible. */
export function PortSelect({ value, onChange }: PortSelectProps) {
  const { data: ports = [], refetch, isFetching, isFetched } = useSensorPorts();

  return (
    <div className="flex items-center gap-2">
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="w-52">
          <SelectValue placeholder="Detected ports…" />
        </SelectTrigger>
        <SelectContent>
          {ports.map((p) => (
            <SelectItem key={p.device} value={p.device}>
              {p.device}
              {p.description ? ` — ${p.description}` : ""}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button type="button" variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
        <RefreshCw className="size-3.5" />
        Scan
      </Button>
      {isFetched && ports.length === 0 && (
        <span className="text-xs text-muted-foreground">No ports detected.</span>
      )}
    </div>
  );
}
