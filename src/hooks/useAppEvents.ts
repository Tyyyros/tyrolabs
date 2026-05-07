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
}: {
  onOpenSettings: () => void;
  onCaptureDone: () => void;
}) {
  useEffect(() => {
    const unlisten = listen("open-settings", onOpenSettings);
    return () => { unlisten.then((fn) => fn()); };
  }, [onOpenSettings]);

  useEffect(() => {
    const unlisten = listen("capture://done", onCaptureDone);
    return () => { unlisten.then((fn) => fn()); };
  }, [onCaptureDone]);
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
