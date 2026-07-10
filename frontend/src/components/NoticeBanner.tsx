import { AlertCircle, CheckCircle2 } from "lucide-react";
import type { Notice } from "@/hooks/useNotice";
import { cn } from "@/lib/utils";

export function NoticeBanner({ notice }: { notice: Notice | null }) {
  if (!notice) return null;

  const isSuccess = notice.kind === "success";

  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-md border px-3 py-2 text-sm",
        isSuccess
          ? "border-ok/30 bg-ok/10 text-ok"
          : "border-destructive/30 bg-destructive/10 text-destructive",
      )}
    >
      {isSuccess ? <CheckCircle2 className="size-4 shrink-0" /> : <AlertCircle className="size-4 shrink-0" />}
      {notice.message}
    </div>
  );
}
