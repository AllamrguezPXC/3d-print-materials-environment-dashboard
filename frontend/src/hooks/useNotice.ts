import { useCallback, useRef, useState } from "react";

export interface Notice {
  kind: "success" | "error";
  message: string;
}

const AUTO_DISMISS_MS = 3000;

export function useNotice() {
  const [notice, setNotice] = useState<Notice | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((kind: Notice["kind"], message: string) => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    setNotice({ kind, message });
    timeoutRef.current = setTimeout(() => setNotice(null), AUTO_DISMISS_MS);
  }, []);

  const notifySuccess = useCallback((message: string) => show("success", message), [show]);
  const notifyError = useCallback((message: string) => show("error", message), [show]);

  return { notice, notifySuccess, notifyError };
}
