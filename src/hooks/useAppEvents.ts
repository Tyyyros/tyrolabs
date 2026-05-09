import { useEffect, useState } from "react";
import { listen } from "@tauri-apps/api/event";
import { register, unregister } from "@tauri-apps/plugin-global-shortcut";

interface DismissArgs {
  onDismiss: () => void;
  onEscape: () => void;
}

export function useAppShellEvents({ onDismiss, onEscape }: DismissArgs) {
  useEffect(() => {
    const onDocClick = (event: MouseEvent) => {
      const target = event.target as Element | null;
      if (!target || !target.closest("[data-keep-selection]")) {
        onDismiss();
      }
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onEscape();
    };

    document.addEventListener("click", onDocClick);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("click", onDocClick);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onDismiss, onEscape]);
}

export function useTauriAppEvents({
  onOpenSettings,
  onCaptureDone,
  onOcrDone,
  onOcrError,
  onTrayCaptureNormal,
  onTrayCaptureDelayed,
  onTrayCaptureOcr,
}: {
  onOpenSettings: () => void;
  onCaptureDone: () => void;
  onOcrDone: (count: number) => void;
  onOcrError: (kind: "empty" | "failed", message?: string) => void;
  onTrayCaptureNormal: () => void;
  onTrayCaptureDelayed: () => void;
  onTrayCaptureOcr: () => void;
}) {
  useEffect(() => {
    const unlisten = listen("open-settings", onOpenSettings);
    return () => { unlisten.then((fn) => fn()); };
  }, [onOpenSettings]);

  useEffect(() => {
    const unlisten = listen("capture://done", onCaptureDone);
    return () => { unlisten.then((fn) => fn()); };
  }, [onCaptureDone]);

  useEffect(() => {
    const unlisten = listen<{ count: number }>("capture://ocr-done", (e) => {
      onOcrDone(e.payload.count);
    });
    return () => { unlisten.then((fn) => fn()); };
  }, [onOcrDone]);

  useEffect(() => {
    const unlisten = listen<{ kind: "empty" | "failed"; message?: string }>(
      "capture://ocr-error",
      (e) => {
        onOcrError(e.payload.kind, e.payload.message);
      },
    );
    return () => { unlisten.then((fn) => fn()); };
  }, [onOcrError]);

  useEffect(() => {
    const unlisten = listen("tray://capture-normal", onTrayCaptureNormal);
    return () => { unlisten.then((fn) => fn()); };
  }, [onTrayCaptureNormal]);

  useEffect(() => {
    const unlisten = listen("tray://capture-delayed", onTrayCaptureDelayed);
    return () => { unlisten.then((fn) => fn()); };
  }, [onTrayCaptureDelayed]);

  useEffect(() => {
    const unlisten = listen("tray://capture-ocr", onTrayCaptureOcr);
    return () => { unlisten.then((fn) => fn()); };
  }, [onTrayCaptureOcr]);
}

export function useCaptureShortcut(onCapture: () => void) {
  const [capturePulse, setCapturePulse] = useState(0);

  useEffect(() => {
    const shortcut = "Alt+C";
    let registered = false;

    register(shortcut, (event) => {
      if (event.state === "Pressed") {
        onCapture();
        setCapturePulse((n) => n + 1);
      }
    })
      .then(() => { registered = true; })
      .catch((error) => console.error("[global-shortcut] register failed:", error));

    return () => {
      if (registered) {
        unregister(shortcut).catch((error) =>
          console.error("[global-shortcut] unregister failed:", error),
        );
      }
    };
  }, [onCapture]);

  return capturePulse;
}
