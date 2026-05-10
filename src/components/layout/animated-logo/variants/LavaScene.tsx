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

const EMBERS = [
  { x: 14, delay: 0, dx: 6, dur: 1.8 },
  { x: 32, delay: 0.4, dx: -4, dur: 2.0 },
  { x: 50, delay: 0.9, dx: 8, dur: 1.6 },
  { x: 68, delay: 0.2, dx: -6, dur: 2.2 },
  { x: 84, delay: 1.1, dx: 4, dur: 1.8 },
  { x: 104, delay: 0.6, dx: -8, dur: 2.0 },
  { x: 124, delay: 1.4, dx: 6, dur: 1.6 },
  { x: 142, delay: 0.3, dx: -4, dur: 2.2 },
  { x: 160, delay: 0.8, dx: 8, dur: 1.8 },
  { x: 22, delay: 1.6, dx: -2, dur: 2.4 },
  { x: 92, delay: 1.0, dx: 2, dur: 2.2 },
  { x: 150, delay: 1.8, dx: -6, dur: 2.0 },
];

export function LavaScene({ theme, hover }: SceneProps) {
  return (
    <div style={sceneBox}>
      {hover && <LavaBackdrop />}

      <span
        style={{
          ...starWrap,
          animation: hover
            ? "logo-v2-lava-star 1.6s ease-in-out infinite"
            : undefined,
          filter: hover
            ? "drop-shadow(0 0 6px rgba(245, 158, 11, 0.8)) drop-shadow(0 0 12px rgba(239, 68, 68, 0.6))"
            : undefined,
        }}
      >
        <TyroLogo size={24} color={hover ? "#FBBF24" : theme.accent} />
      </span>

      <span style={textWrap}>
        <Ornament shape="flame" hover={hover} />
        <span
          style={{
            ...textBase,
            fontFamily: theme.fontMono,
            letterSpacing: theme.logoLetterSpacing,
            ...lavaTextStyle(hover),
          }}
        >
          TYROLABS
        </span>
        <Ornament shape="flame" hover={hover} />
      </span>

      {hover && <LavaEmbers />}
    </div>
  );
}

function lavaTextStyle(hover: boolean): CSSProperties {
  if (!hover) {
    return { color: "var(--t1)" };
  }
  return {
    backgroundImage:
      "linear-gradient(180deg, #FDE68A 0%, #FBBF24 25%, #F97316 55%, #DC2626 85%, #7C2D12 100%)",
    WebkitBackgroundClip: "text",
    backgroundClip: "text",
    WebkitTextFillColor: "transparent",
    color: "transparent",
    textShadow: "0 0 10px rgba(251, 146, 60, 0.7), 0 0 22px rgba(220, 38, 38, 0.45)",
    animation: "logo-v2-lava-text-flicker 0.6s ease-in-out infinite",
    filter: "drop-shadow(0 0 4px rgba(251, 191, 36, 0.5))",
  };
}

function LavaBackdrop() {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${BOX_WIDTH} ${BOX_HEIGHT}`}
      preserveAspectRatio="none"
      style={{ ...absLayer, zIndex: 1, mixBlendMode: "screen" }}
    >
      <defs>
        <linearGradient id="lava-grad" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#7C2D12" />
          <stop offset="0.25" stopColor="#DC2626" />
          <stop offset="0.55" stopColor="#F97316" />
          <stop offset="0.85" stopColor="#FBBF24" />
          <stop offset="1" stopColor="#FEF3C7" />
        </linearGradient>
        <linearGradient id="lava-grad-back" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#7C2D12" stopOpacity="0.85" />
          <stop offset="0.6" stopColor="#DC2626" stopOpacity="0.7" />
          <stop offset="1" stopColor="#F97316" stopOpacity="0.5" />
        </linearGradient>
        <filter id="lava-blur" x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur stdDeviation="0.8" />
        </filter>
      </defs>

      {/* back wave (slower, dimmer, deeper) */}
      <g style={{ animation: "logo-v2-lava-rise-back 3.6s ease-in-out infinite" }}>
        <path
          d={`M0,${BOX_HEIGHT} Q26,12 56,16 T112,14 T${BOX_WIDTH},16 L${BOX_WIDTH},${BOX_HEIGHT} Z`}
          fill="url(#lava-grad-back)"
          filter="url(#lava-blur)"
        />
      </g>

      {/* front wave (faster, bright, crashes higher) */}
      <g style={{ animation: "logo-v2-lava-rise-front 2.6s ease-in-out infinite" }}>
        <path
          d={`M0,${BOX_HEIGHT} Q22,6 48,12 T96,8 T146,14 T${BOX_WIDTH},10 L${BOX_WIDTH},${BOX_HEIGHT} Z`}
          fill="url(#lava-grad)"
        />
        {/* glowing crest line */}
        <path
          d={`M0,${BOX_HEIGHT - 22} Q22,6 48,12 T96,8 T146,14 T${BOX_WIDTH},10`}
          stroke="#FEF3C7"
          strokeWidth="0.8"
          fill="none"
          opacity="0.85"
          filter="url(#lava-blur)"
        />
      </g>
    </svg>
  );
}

function LavaEmbers() {
  return (
    <svg
      aria-hidden="true"
      viewBox={`0 0 ${BOX_WIDTH} ${BOX_HEIGHT}`}
      preserveAspectRatio="none"
      style={{ ...absLayer, zIndex: 3, overflow: "visible" }}
    >
      {EMBERS.map((e, i) => (
        <circle
          key={i}
          cx={e.x}
          cy={BOX_HEIGHT - 4}
          r={i % 3 === 0 ? 1.6 : 1.1}
          fill={i % 2 === 0 ? "#FBBF24" : "#F97316"}
          style={{
            animation: `logo-v2-lava-ember ${e.dur}s ease-out ${e.delay}s infinite`,
            ["--ember-dx" as string]: `${e.dx}px`,
          } as CSSProperties}
        />
      ))}
    </svg>
  );
}
