import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { disable, enable, isEnabled } from "@tauri-apps/plugin-autostart";

export interface UseAutostartResult {
  available: boolean;
  availabilityMessage: string | null;
  enabled: boolean;
  loading: boolean;
  saving: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  setEnabled: (next: boolean) => Promise<void>;
}

function formatAutostartError(error: unknown, action: "read" | "write"): string {
  const raw = error instanceof Error ? error.message : String(error);
  const lower = raw.toLowerCase();
  const prefix =
    action === "read"
      ? "Impossible de lire l'etat du lancement au demarrage."
      : "Impossible de modifier le lancement au demarrage.";

  if (
    lower.includes("access") ||
    lower.includes("denied") ||
    lower.includes("permission") ||
    lower.includes("registry") ||
    lower.includes("registre")
  ) {
    return `${prefix} Windows bloque l'acces au registre. Lance l'application avec les droits necessaires ou verifie la politique de securite.`;
  }

  return `${prefix} Detail: ${raw}`;
}

function getUnavailableMessage(): string {
  return "Disponible uniquement depuis la build release installee. En mode dev ou debug, Windows enregistrerait un mauvais executable au demarrage.";
}

export function useAutostart(): UseAutostartResult {
  const [available, setAvailable] = useState(false);
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null);
  const [enabled, setLocalEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const productionBuild = await invoke<boolean>("is_production_build");
      if (!productionBuild) {
        setAvailable(false);
        setAvailabilityMessage(getUnavailableMessage());
        setLocalEnabled(false);
        return;
      }

      setAvailable(true);
      setAvailabilityMessage(null);
      setLocalEnabled(await isEnabled());
    } catch (err) {
      setAvailable(false);
      setAvailabilityMessage(getUnavailableMessage());
      setError(formatAutostartError(err, "read"));
    } finally {
      setLoading(false);
    }
  }, []);

  const setEnabled = useCallback(async (next: boolean) => {
    if (!available) {
      setError(getUnavailableMessage());
      return;
    }

    setSaving(true);
    setError(null);

    try {
      const current = await isEnabled();
      if (current !== next) {
        if (next) {
          await enable();
        } else {
          await disable();
        }
      }

      setLocalEnabled(await isEnabled());
    } catch (err) {
      setError(formatAutostartError(err, "write"));
    } finally {
      setSaving(false);
    }
  }, [available]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    available,
    availabilityMessage,
    enabled,
    loading,
    saving,
    error,
    refresh,
    setEnabled,
  };
}
