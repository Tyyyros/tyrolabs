import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { Theme } from "../types";
import { hexToRgba } from "./colors";
import { THEMES } from "../themes";

const ThemeCtx = createContext<Theme>(THEMES.command);

export const useTheme = () => useContext(ThemeCtx);

interface Props {
  theme: Theme;
  children: ReactNode;
}

/** Injecte les CSS vars (--accent, --bg, --sidebar, --font-ui, --font-mono) à chaque
 *  changement de thème, et applique la police UI au body. */
export function ThemeProvider({ theme, children }: Props) {
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty("--accent", theme.accent);
    root.style.setProperty("--accent-dim", hexToRgba(theme.accent, 0.12));
    root.style.setProperty("--accent-rgb", theme.accentRGB);
    root.style.setProperty("--bg", theme.bg);
    root.style.setProperty("--sidebar", theme.sidebar);
    root.style.setProperty("--font-ui", theme.fontUI);
    root.style.setProperty("--font-mono", theme.fontMono);
    document.body.style.fontFamily = theme.fontUI;
  }, [theme]);

  return <ThemeCtx.Provider value={theme}>{children}</ThemeCtx.Provider>;
}
