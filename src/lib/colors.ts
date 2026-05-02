/** Palette base — accent / accent-dim sont remappées dynamiquement via CSS vars.
 *  t1, t2, t3, border, borderDim, rowHov are also dynamic for light/dark support. */
export const C = {
  accent: "var(--accent)",
  accentDim: "var(--accent-dim)",
  border: "var(--border)",
  borderDim: "var(--border-dim)",
  t1: "var(--t1)",
  t2: "var(--t2)",
  t3: "var(--t3)",
  rowHov: "var(--row-hov)",
  danger: "#EF4444",
  dangerDim: "rgba(239,68,68,0.12)",
  green: "#22C55E",
  amber: "#F59E0B",
  purple: "#A78BFA",
  pink: "#F472B6",
} as const;

/** Dark defaults — used when theme doesn't override */
export const DARK_TOKENS = {
  t1: "#FAFAFA",
  t2: "#71717A",
  t3: "#3F3F46",
  border: "#27272A",
  borderDim: "rgba(39,39,42,0.6)",
  rowHov: "#111113",
} as const;

export function hexToRgba(hex: string, a: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${a})`;
}
