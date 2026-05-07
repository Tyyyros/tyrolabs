import { useCallback, useEffect, useRef, useState } from "react";

const TOAST_MS = 2400;

export function useToast() {
  const [toast, setToast] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      window.clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const fire = useCallback((msg: string) => {
    clearTimer();
    setToast(msg);
    timerRef.current = window.setTimeout(() => {
      setToast(null);
      timerRef.current = null;
    }, TOAST_MS);
  }, [clearTimer]);

  useEffect(() => clearTimer, [clearTimer]);

  return { toast, fire };
}
