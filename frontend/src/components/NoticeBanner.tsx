import type { Notice } from "../hooks/useNotice";

export function NoticeBanner({ notice }: { notice: Notice | null }) {
  if (!notice) return null;

  return (
    <p className={notice.kind === "success" ? "notice-success" : "error-state"}>
      {notice.message}
    </p>
  );
}
