import { useQuery } from "@tanstack/react-query";
import { DeviceModuleGrid } from "@/components/DeviceModuleGrid";
import { DryingRecommendationCard } from "@/components/DryingRecommendationCard";
import { useAssignments } from "@/hooks/resources/assignments";
import { useDryingRecommendations } from "@/hooks/resources/drying";
import { useLocations } from "@/hooks/resources/locations";
import { useMaterials } from "@/hooks/resources/materials";
import { usePrinters } from "@/hooks/resources/printers";
import { useSpools } from "@/hooks/resources/spools";
import { useRefreshInterval } from "@/hooks/useRefreshInterval";
import { getCurrentReading } from "@/api/readings";

export function Dashboard() {
  const refreshInterval = useRefreshInterval();
  const { data, error, isPending } = useQuery({
    queryKey: ["current-reading"],
    queryFn: getCurrentReading,
    refetchInterval: refreshInterval,
  });
  const { data: recommendations = [] } = useDryingRecommendations(refreshInterval);
  const { data: printers = [] } = usePrinters();
  const { data: locations = [] } = useLocations();
  const { data: spools = [] } = useSpools();
  const { data: materials = [] } = useMaterials();
  const { data: assignments = [] } = useAssignments();

  if (isPending) {
    return <p className="text-sm text-muted-foreground">Loading current reading…</p>;
  }

  if (error || !data) {
    return (
      <p className="text-sm text-destructive">
        Could not reach the backend: {(error as Error)?.message ?? "unknown error"}
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-xl font-heading font-semibold">Live Environment</h1>

      <DeviceModuleGrid
        printers={printers}
        locations={locations}
        spools={spools}
        materials={materials}
        assignments={assignments}
        sensorEntries={data.sensors}
        emptyMessage={data.message}
      />

      <div className="flex flex-col gap-3">
        <h2 className="font-heading text-lg font-medium">Drying Recommendations</h2>
        {recommendations.length === 0 ? (
          <p className="text-sm text-muted-foreground">No spools currently need drying.</p>
        ) : (
          <div className="flex flex-col gap-3">
            {recommendations.map((rec) => (
              <DryingRecommendationCard key={rec.spool_id} rec={rec} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
