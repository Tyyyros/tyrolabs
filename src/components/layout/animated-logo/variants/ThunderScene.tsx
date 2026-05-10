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

// All bolts emanate from the star center (~16, 16) in box coords.
// Each path: jagged polyline reaching toward a letter zone.
const BOLTS = [
  { d: "M16,16 L26,11 L22,18 L38,14 L34,19 L58,15", dur: 1.1, delay: 0 },
  { d: "M16,16 L28,20 L24,12 L46,18 L52,12 L82,16", dur: 1.5, delay: 0.4 },
  { d: "M16,16 L32,14 L28,21 L60,17 L66,11 L108,15", dur: 0.9, delay: 0.7 },
  { d: "M16,16 L30,10 L36,18 L72,12 L86,18 L142,14", dur: 1.7, delay: 0.2 },
  { d: "M16,16 L34,18 L38,12 L78,20 L84,12 L162,18", dur: 1.3, delay: 1.0 },
];

export function ThunderScene({ theme, hover }: SceneProps) {
  return (
    <div
      style={{
        ...sceneBox,
        boxShadow: hover ? "inset 0 0 20px rgba(239, 68, 68, 0.35), 0 0 8px rgba(239, 68, 68, 0.2)" : undefined,
        transition: "box-shadow 200ms ease",
      }}
    >
      {hover && <ThunderFlash />}
      {hover && <ThunderBolts />}

      <span
        style={{
          ...starWrap,
          animation: hover ? "logo-v2-thunder-star 0.18s steps(4) infinite" : undefined,
          filter: hover
            ? "drop-shadow(0 0 6px #FFFFFF) drop-shadow(0 0 14px rgba(239, 68, 68, 0.85))"
            : undefined,
        }}
      >
        <TyroLogo size={24} color={hover ? "#FFFFFF" : theme.accent} />
      </span>

      <span
        style={{
          ...textWrap,
          animation: hover ? "logo-v2-thunder-shake 0.08s steps(3) infinite" : undefined,
        }}
      >
        <Ornament shape="bolt" hover={hover} />
        <span
          style={{
            ...textBase,
            fontFamily: theme.fontMono,
            letterSpacing: theme.logoLetterSpacing,
            ...thunderTextStyle(hover),
          }}
        >
          TYROLABS
        </span>
        <Ornament shape="bolt" hover={hover} />
      </span>
    </div>
  );
}

function thunderTextStyle(hover: boolean): CSSProperties {
  if (!hover) {
    return { color: "var(--t1)" };
  }
  return {
    color: "#FFFFFF",
    textShadow:
      "0 0 4px #FFFFFF, 0 0 10px rgba(239, 68, 68, 0.9), 0 0 18px rgba(239, 68, 68, 0.6)",
    animation: "logo-v2-thunder-text 1.4s steps(20) infinite",
  };
}

function ThunderFlash() {
  return (
    <div
      style={{
        ...absLayer,
        zIndex: 0,
        background: "#FFFFFF",
        animation: "logo-v2-thunder-flash 1.6s steps(60) infinite",
      }}
    />
  );
}

function ThunderBolts() {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${BOX_WIDTH} ${BOX_HEIGHT}`}
      preserveAspectRatio="none"
      style={{ ...absLayer, zIndex: 1, overflow: "visible" }}
    >
      <defs>
        <filter id="bolt-glow" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.7" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {BOLTS.map((b, i) => (
        <g
          key={i}
          style={{
            animation: `logo-v2-thunder-bolt ${b.dur}s steps(40) ${b.delay}s infinite`,
          }}
        >
          {/* red outer glow */}
          <path d={b.d} stroke="#EF4444" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" filter="url(#bolt-glow)" opacity="0.85" />
          {/* white core */}
          <path d={b.d} stroke="#FFFFFF" strokeWidth="1.1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
    </svg>
  );
}
