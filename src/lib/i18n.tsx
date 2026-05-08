import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { invoke } from "@tauri-apps/api/core";
import { STRINGS, type Lang, type StringKey } from "./strings";

interface AppSettings {
  language: string;
}

interface I18nCtxValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: StringKey, vars?: Record<string, string | number>) => string;
}

const I18nCtx = createContext<I18nCtxValue>({
  lang: "fr",
  setLang: () => {},
  t: (key) => STRINGS.fr[key] ?? key,
});

export const useI18n = () => useContext(I18nCtx);

function isLang(value: string): value is Lang {
  return value === "fr" || value === "en";
}

function format(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (_, name) => {
    const value = vars[name];
    return value === undefined ? `{${name}}` : String(value);
  });
}

interface ProviderProps {
  children: ReactNode;
}

export function I18nProvider({ children }: ProviderProps) {
  const [lang, setLangState] = useState<Lang>("fr");

  // Hydrate la langue depuis le store backend au mount.
  useEffect(() => {
    invoke<AppSettings>("get_app_settings")
      .then((settings) => {
        if (isLang(settings.language)) setLangState(settings.language);
      })
      .catch(() => {
        // store indisponible → fallback fr déjà actif.
      });
  }, []);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    invoke("set_app_settings", { settings: { language: next } }).catch((error) => {
      console.error("[set_app_settings] failed:", error);
    });
  }, []);

  const t = useCallback(
    (key: StringKey, vars?: Record<string, string | number>) => {
      const dict = STRINGS[lang];
      const fallback = STRINGS.fr;
      const template = (dict as Record<string, string>)[key] ?? fallback[key] ?? key;
      return format(template, vars);
    },
    [lang],
  );

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);

  return <I18nCtx.Provider value={value}>{children}</I18nCtx.Provider>;
}
