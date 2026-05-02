import { createContext, useContext, useEffect, type ReactNode } from "react";
import type { Theme } from "../types";
import { hexToRgba, DARK_TOKENS } from "./colors";
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

    // Dynamic color tokens — theme overrides or dark defaults
    root.style.setProperty("--t1", theme.t1 || DARK_TOKENS.t1);
    root.style.setProperty("--t2", theme.t2 || DARK_TOKENS.t2);
    root.style.setProperty("--t3", theme.t3 || DARK_TOKENS.t3);
    root.style.setProperty("--border", theme.border || DARK_TOKENS.border);
    root.style.setProperty("--border-dim", theme.borderDim || DARK_TOKENS.borderDim);
    root.style.setProperty("--row-hov", theme.rowHov || DARK_TOKENS.rowHov);

    document.body.style.fontFamily = theme.fontUI;
  }, [theme]);

  return <ThemeCtx.Provider value={theme}>{children}</ThemeCtx.Provider>;
}
