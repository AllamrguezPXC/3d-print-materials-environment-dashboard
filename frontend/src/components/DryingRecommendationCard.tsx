import { Droplets } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { StatusBadge } from "@/components/StatusBadge";
import type { DryingRecommendation } from "@/types/api";

interface DryingRecommendationCardProps {
  rec: DryingRecommendation;
  onStartSession?: (rec: DryingRecommendation) => void;
}

export function DryingRecommendationCard({ rec, onStartSession }: DryingRecommendationCardProps) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 font-medium">
            <Droplets className="size-4 text-muted-foreground" />
            {rec.material_profile_name} — spool #{rec.spool_id}
          </div>
          <StatusBadge status={rec.current_status} />
        </div>
        <p className="text-sm text-muted-foreground">{rec.message}</p>
        {onStartSession && (
          <div>
            <Button size="sm" variant="outline" onClick={() => onStartSession(rec)}>
              Start drying session
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
