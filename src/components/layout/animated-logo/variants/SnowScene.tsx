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

interface Flake {
  x: number;
  r: number;
  delay: number;
  dur: number;
  drift: number;
}

const FLAKES: Flake[] = [
  { x: 6, r: 1.1, delay: 0.0, dur: 2.4, drift: 8 },
  { x: 16, r: 0.8, delay: 1.2, dur: 3.0, drift: -6 },
  { x: 26, r: 1.4, delay: 0.6, dur: 2.6, drift: 4 },
  { x: 36, r: 0.9, delay: 1.8, dur: 2.2, drift: -8 },
  { x: 46, r: 1.2, delay: 0.3, dur: 3.2, drift: 6 },
  { x: 56, r: 0.7, delay: 1.5, dur: 2.8, drift: -4 },
  { x: 66, r: 1.5, delay: 0.9, dur: 2.4, drift: 10 },
  { x: 76, r: 1.0, delay: 2.1, dur: 3.0, drift: -6 },
  { x: 86, r: 0.8, delay: 0.4, dur: 2.6, drift: 4 },
  { x: 96, r: 1.3, delay: 1.7, dur: 2.2, drift: -8 },
  { x: 106, r: 1.1, delay: 1.0, dur: 3.2, drift: 6 },
  { x: 116, r: 0.9, delay: 0.2, dur: 2.4, drift: -4 },
  { x: 126, r: 1.6, delay: 1.4, dur: 2.8, drift: 8 },
  { x: 136, r: 0.7, delay: 0.7, dur: 3.0, drift: -10 },
  { x: 146, r: 1.2, delay: 2.0, dur: 2.6, drift: 6 },
  { x: 156, r: 0.8, delay: 0.5, dur: 2.2, drift: -6 },
  { x: 166, r: 1.0, delay: 1.6, dur: 3.2, drift: 4 },
  { x: 176, r: 1.3, delay: 1.1, dur: 2.8, drift: -8 },
  { x: 11, r: 0.6, delay: 2.3, dur: 2.6, drift: 5 },
  { x: 31, r: 0.7, delay: 0.8, dur: 3.4, drift: -3 },
  { x: 51, r: 0.6, delay: 1.9, dur: 2.8, drift: 7 },
  { x: 71, r: 0.7, delay: 0.6, dur: 3.2, drift: -5 },
  { x: 91, r: 0.6, delay: 1.3, dur: 2.6, drift: 3 },
  { x: 111, r: 0.8, delay: 2.2, dur: 3.0, drift: -7 },
  { x: 131, r: 0.6, delay: 0.1, dur: 3.4, drift: 5 },
  { x: 151, r: 0.7, delay: 1.4, dur: 2.8, drift: -3 },
  { x: 171, r: 0.6, delay: 2.4, dur: 3.0, drift: 7 },
  { x: 41, r: 1.4, delay: 1.1, dur: 2.0, drift: -5 },
  { x: 101, r: 1.5, delay: 0.0, dur: 2.2, drift: 9 },
  { x: 161, r: 1.4, delay: 1.8, dur: 2.0, drift: -7 },
];

export function SnowScene({ theme, hover }: SceneProps) {
  return (
    <div style={sceneBox}>
      {hover && <SnowBackdrop />}
      {hover && <SnowParticles />}
      {hover && <Snowdrift />}

      <span
        style={{
          ...starWrap,
          animation: hover ? "logo-v2-snow-star 8s linear infinite" : undefined,
          filter: hover
            ? "drop-shadow(0 0 4px #FFFFFF) drop-shadow(0 0 10px rgba(34, 211, 238, 0.85))"
            : undefined,
        }}
      >
        <TyroLogo size={24} color={hover ? "#E0F2FE" : theme.accent} />
      </span>

      <span style={textWrap}>
        <Ornament shape="snowflake" hover={hover} />
        <span
          style={{
            ...textBase,
            fontFamily: theme.fontMono,
            letterSpacing: theme.logoLetterSpacing,
            ...snowTextStyle(hover),
          }}
        >
          TYROLABS
        </span>
        <Ornament shape="snowflake" hover={hover} />
      </span>
    </div>
  );
}

function snowTextStyle(hover: boolean): CSSProperties {
  if (!hover) {
    return { color: "var(--t1)" };
  }
  return {
    backgroundImage: "linear-gradient(90deg, #FFFFFF 0%, #BAE6FD 35%, #FFFFFF 70%, #67E8F9 100%)",
    backgroundSize: "220% 100%",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
    textShadow:
      "0 0 8px rgba(255, 255, 255, 0.85), 0 0 16px rgba(34, 211, 238, 0.55)",
    animation: "logo-v2-snow-text 4s linear infinite, logo-v2-snow-glow 2.4s ease-in-out infinite",
  };
}

function SnowBackdrop() {
  return (
    <div
      style={{
        ...absLayer,
        zIndex: 0,
        background:
          "radial-gradient(ellipse at center, rgba(34, 211, 238, 0.12) 0%, rgba(34, 211, 238, 0.04) 70%, transparent 100%)",
        animation: "logo-v2-snow-bg 3s ease-in-out infinite",
      }}
    />
  );
}

function SnowParticles() {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${BOX_WIDTH} ${BOX_HEIGHT}`}
      preserveAspectRatio="none"
      style={{ ...absLayer, zIndex: 3, overflow: "visible" }}
    >
      {FLAKES.map((f, i) => (
        <circle
          key={i}
          cx={f.x}
          cy={0}
          r={f.r}
          fill="#FFFFFF"
          opacity={f.r > 1 ? 0.95 : 0.7}
          style={{
            animation: `logo-v2-snow-fall ${f.dur}s linear ${f.delay}s infinite`,
            ["--snow-drift" as string]: `${f.drift}px`,
          } as CSSProperties}
        />
      ))}
    </svg>
  );
}

function Snowdrift() {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${BOX_WIDTH} ${BOX_HEIGHT}`}
      preserveAspectRatio="none"
      style={{ ...absLayer, zIndex: 2 }}
    >
      <path
        d={`M0,${BOX_HEIGHT - 1.5} Q14,${BOX_HEIGHT - 3.5} 30,${BOX_HEIGHT - 2.5} T62,${BOX_HEIGHT - 3.2} T98,${BOX_HEIGHT - 2.2} T134,${BOX_HEIGHT - 3.4} T170,${BOX_HEIGHT - 2.4} T${BOX_WIDTH},${BOX_HEIGHT - 2.8} L${BOX_WIDTH},${BOX_HEIGHT} L0,${BOX_HEIGHT} Z`}
        fill="rgba(255, 255, 255, 0.85)"
        style={{ animation: "logo-v2-snow-drift 4s ease-in-out infinite" }}
      />
      <path
        d={`M0,${BOX_HEIGHT - 1.5} Q14,${BOX_HEIGHT - 3.5} 30,${BOX_HEIGHT - 2.5} T62,${BOX_HEIGHT - 3.2} T98,${BOX_HEIGHT - 2.2} T134,${BOX_HEIGHT - 3.4} T170,${BOX_HEIGHT - 2.4} T${BOX_WIDTH},${BOX_HEIGHT - 2.8}`}
        fill="none"
        stroke="rgba(186, 230, 253, 0.7)"
        strokeWidth="0.6"
      />
    </svg>
  );
}
