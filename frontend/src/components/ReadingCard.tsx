import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ReadingCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  tone?: "default" | "ok" | "warning" | "critical";
}

const TONE_CLASSES: Record<NonNullable<ReadingCardProps["tone"]>, string> = {
  default: "bg-primary/10 text-primary",
  ok: "bg-ok/15 text-ok",
  warning: "bg-warning/15 text-warning",
  critical: "bg-destructive/15 text-destructive",
};

export function ReadingCard({ label, value, icon: Icon, tone = "default" }: ReadingCardProps) {
  return (
    <Card>
      <CardContent className="flex items-center gap-4">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-full ${TONE_CLASSES[tone]}`}>
          <Icon className="size-5" />
        </div>
        <div>
          <div className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</div>
          <div className="text-2xl font-semibold">{value}</div>
        </div>
      </CardContent>
    </Card>
  );
}
