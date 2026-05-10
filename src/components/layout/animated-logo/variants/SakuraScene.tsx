import type { CSSProperties } from "react";
import { TyroLogo } from "../../../icons";
import { Ornament } from "../ornaments";
import {
  BOX_WIDTH,
  BOX_HEIGHT,
  absLayer,
  sceneBox,
  starWrap,
  textBase,
  textWrap,
  type SceneProps,
} from "../shared";

interface Petal {
  x: number;
  size: number;
  fill: string;
  delay: number;
  dur: number;
  dx: number;
  rot: number;
}

const PINK_PALETTE = ["#F472B6", "#FBCFE8", "#FECDD3", "#FFFFFF", "#EC4899"];

const PETALS: Petal[] = [
  { x: 8, size: 2.4, fill: PINK_PALETTE[0], delay: 0.0, dur: 2.6, dx: 22, rot: 220 },
  { x: 22, size: 1.8, fill: PINK_PALETTE[1], delay: 0.8, dur: 3.0, dx: -18, rot: -180 },
  { x: 36, size: 2.8, fill: PINK_PALETTE[4], delay: 0.3, dur: 2.4, dx: 28, rot: 260 },
  { x: 50, size: 2.0, fill: PINK_PALETTE[2], delay: 1.2, dur: 2.8, dx: -20, rot: -240 },
  { x: 64, size: 2.6, fill: PINK_PALETTE[0], delay: 0.5, dur: 2.2, dx: 24, rot: 200 },
  { x: 78, size: 1.6, fill: PINK_PALETTE[3], delay: 1.6, dur: 3.2, dx: -22, rot: -200 },
  { x: 92, size: 3.0, fill: PINK_PALETTE[0], delay: 0.7, dur: 2.6, dx: 30, rot: 280 },
  { x: 106, size: 2.2, fill: PINK_PALETTE[1], delay: 0.2, dur: 2.4, dx: -26, rot: -220 },
  { x: 120, size: 2.4, fill: PINK_PALETTE[4], delay: 1.4, dur: 2.8, dx: 20, rot: 240 },
  { x: 134, size: 1.8, fill: PINK_PALETTE[2], delay: 0.9, dur: 3.0, dx: -24, rot: -260 },
  { x: 148, size: 2.6, fill: PINK_PALETTE[0], delay: 1.8, dur: 2.6, dx: 18, rot: 200 },
  { x: 162, size: 2.0, fill: PINK_PALETTE[3], delay: 0.6, dur: 2.4, dx: -16, rot: -180 },
  { x: 176, size: 2.8, fill: PINK_PALETTE[4], delay: 1.1, dur: 2.8, dx: 22, rot: 220 },
  { x: 14, size: 1.6, fill: PINK_PALETTE[2], delay: 2.0, dur: 3.2, dx: 12, rot: 300 },
  { x: 70, size: 1.8, fill: PINK_PALETTE[3], delay: 1.3, dur: 3.0, dx: -14, rot: -280 },
  { x: 110, size: 1.6, fill: PINK_PALETTE[1], delay: 1.9, dur: 2.8, dx: 14, rot: 240 },
  { x: 150, size: 1.7, fill: PINK_PALETTE[2], delay: 0.4, dur: 3.4, dx: -12, rot: -220 },
  { x: 42, size: 1.8, fill: PINK_PALETTE[3], delay: 2.2, dur: 2.8, dx: 16, rot: 260 },
];

export function SakuraScene({ theme, hover }: SceneProps) {
  return (
    <div style={sceneBox}>
      {hover && <SakuraBackdrop />}

      <span
        style={{
          ...starWrap,
          animation: hover
            ? "logo-v2-sakura-star 4s ease-in-out infinite"
            : undefined,
          filter: hover
            ? "drop-shadow(0 0 4px rgba(244, 114, 182, 0.8)) drop-shadow(0 0 12px rgba(236, 72, 153, 0.5))"
            : undefined,
        }}
      >
        <TyroLogo size={24} color={hover ? "#F472B6" : theme.accent} />
      </span>

      <span style={textWrap}>
        <Ornament shape="blossom" hover={hover} />
        <span
          style={{
            ...textBase,
            fontFamily: theme.fontMono,
            letterSpacing: theme.logoLetterSpacing,
            ...sakuraTextStyle(hover),
          }}
        >
          TYROLABS
        </span>
        <Ornament shape="blossom" hover={hover} />
      </span>

      {hover && <SakuraPetals />}
    </div>
  );
}

function sakuraTextStyle(hover: boolean): CSSProperties {
  if (!hover) {
    return { color: "var(--t1)" };
  }
  return {
    backgroundImage: "linear-gradient(90deg, #FCE7F3 0%, #F472B6 35%, #EC4899 65%, #FCE7F3 100%)",
    backgroundSize: "220% 100%",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
    textShadow: "0 0 10px rgba(244, 114, 182, 0.55), 0 0 18px rgba(236, 72, 153, 0.3)",
    animation: "logo-v2-sakura-text 5s linear infinite, logo-v2-sakura-glow 2.6s ease-in-out infinite",
  };
}

function SakuraBackdrop() {
  return (
    <div
      style={{
        ...absLayer,
        zIndex: 0,
        background:
          "radial-gradient(ellipse at center, rgba(244, 114, 182, 0.18) 0%, rgba(244, 114, 182, 0.06) 60%, transparent 100%)",
        animation: "logo-v2-sakura-bg 3.2s ease-in-out infinite",
      }}
    />
  );
}

function SakuraPetals() {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${BOX_WIDTH} ${BOX_HEIGHT}`}
      preserveAspectRatio="none"
      style={{ ...absLayer, zIndex: 3, overflow: "visible" }}
    >
      {PETALS.map((p, i) => (
        <g
          key={i}
          style={{
            animation: `logo-v2-sakura-petal ${p.dur}s ease-in ${p.delay}s infinite`,
            transformOrigin: `${p.x}px 0px`,
            ["--sakura-dx" as string]: `${p.dx}px`,
            ["--sakura-rot" as string]: `${p.rot}deg`,
          } as CSSProperties}
        >
          <ellipse cx={p.x} cy={0} rx={p.size * 0.65} ry={p.size} fill={p.fill} opacity="0.92" />
          <ellipse cx={p.x} cy={0} rx={p.size * 0.28} ry={p.size * 0.55} fill="#FFFFFF" opacity="0.55" />
        </g>
      ))}
    </svg>
  );
}
