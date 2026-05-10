import { useState, type CSSProperties } from "react";
import { useTheme } from "../../lib/theme";
import { C, hexToRgba } from "../../lib/colors";
import { TyroLogo } from "../icons";
import type { Theme } from "../../types";

type Variant =
  | "thunder"
  | "lava"
  | "snow"
  | "sun"
  | "sakura"
  | "glitch"
  | "lockon"
  | "caramel"
  | "sprout"
  | "aurora";

const THEME_TO_VARIANT: Record<string, Variant> = {
  carbon: "thunder",
  obsidian: "lava",
  arctic: "snow",
  daylight: "sun",
  sakura: "sakura",
  neon: "glitch",
  command: "lockon",
  cream: "caramel",
  mint: "sprout",
  cloud: "aurora",
};

export function AnimatedLogo() {
  const theme = useTheme();
  const [hover, setHover] = useState(false);
  const variant: Variant = THEME_TO_VARIANT[theme.id] ?? "lockon";

  return (
    <div
      data-tauri-drag-region
      data-logo-anim={variant}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: "default",
        position: "relative",
        pointerEvents: "auto",
      }}
    >
      <span
        data-tauri-drag-region
        style={{
          display: "inline-flex",
          position: "relative",
          width: 24,
          height: 24,
          alignItems: "center",
          justifyContent: "center",
          ...starStyle(variant, hover),
        }}
      >
        <TyroLogo size={24} color={theme.accent} />
        {hover && variant === "sun" && <SunRays accent={theme.accent} />}
        {hover && variant === "sprout" && <MintLeaves accent={theme.accent} />}
        {hover && variant === "thunder" && <ThunderArcs accent={theme.accent} />}
      </span>

      <span
        data-tauri-drag-region
        style={{
          fontFamily: theme.fontMono,
          fontSize: 14,
          fontWeight: 500,
          opacity: 0.9,
          display: "flex",
          alignItems: "center",
          gap: 0,
          position: "relative",
          padding: "2px 4px",
        }}
      >
        <span data-tauri-drag-region style={{ color: theme.accent, opacity: 0.8 }}>{theme.logoPrefix}</span>

        <TextCore variant={variant} hover={hover} theme={theme} />

        <span data-tauri-drag-region style={{ color: theme.accent, opacity: 0.8 }}>{theme.logoSuffix}</span>

        {hover && variant === "lockon" && <LockonBrackets accent={theme.accent} />}
        {hover && variant === "lockon" && <ScanLine accent={theme.accent} duration="1.4s" />}
        {hover && variant === "glitch" && <ScanLine accent={theme.accent} duration="1.8s" thickness={1.5} />}
        {hover && variant === "sun" && <SunFlare />}
      </span>

      {hover && variant === "snow" && <SnowParticles />}
      {hover && variant === "sakura" && <SakuraPetals accent={theme.accent} />}
    </div>
  );
}

/* ─── Text core: handles per-variant text styling ─────────────────── */

function TextCore({ variant, hover, theme }: { variant: Variant; hover: boolean; theme: Theme }) {
  const baseStyle: CSSProperties = {
    display: "inline-block",
    letterSpacing: theme.logoLetterSpacing,
    color: C.t1,
    position: "relative",
  };

  if (!hover) {
    return <span data-tauri-drag-region style={baseStyle}>TYROLABS</span>;
  }

  if (variant === "lava") {
    return (
      <span
        style={{
          ...baseStyle,
          backgroundImage: "linear-gradient(90deg, #F59E0B 0%, #EF4444 25%, #FCD34D 50%, #EF4444 75%, #F59E0B 100%)",
          backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          animation: "logo-lava-flow 2.4s linear infinite, logo-lava-glow 1.8s ease-in-out infinite",
        }}
      >
        TYROLABS
      </span>
    );
  }

  if (variant === "caramel") {
    return (
      <span
        style={{
          ...baseStyle,
          backgroundImage: "linear-gradient(90deg, #D97706 0%, #FCD34D 50%, #F59E0B 100%)",
          backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          animation: "logo-caramel-flow 4s linear infinite, logo-caramel-glow 2.4s ease-in-out infinite",
        }}
      >
        TYROLABS
      </span>
    );
  }

  if (variant === "aurora") {
    return (
      <span
        style={{
          ...baseStyle,
          backgroundImage: "linear-gradient(90deg, #6366F1 0%, #A855F7 35%, #06B6D4 65%, #6366F1 100%)",
          backgroundSize: "200% 100%",
          WebkitBackgroundClip: "text",
          backgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
          animation: "logo-aurora-drift 5s linear infinite, logo-aurora-pulse 3.2s ease-in-out infinite",
        }}
      >
        TYROLABS
      </span>
    );
  }

  if (variant === "glitch") {
    return (
      <span style={{ ...baseStyle, position: "relative" }}>
        <span aria-hidden="true" style={{
          position: "absolute", inset: 0, color: "#FF3366", mixBlendMode: "screen",
          animation: "logo-glitch-rgb-r 0.8s steps(2) infinite",
        }}>TYROLABS</span>
        <span aria-hidden="true" style={{
          position: "absolute", inset: 0, color: "#22D3EE", mixBlendMode: "screen",
          animation: "logo-glitch-rgb-c 0.8s steps(2) infinite",
        }}>TYROLABS</span>
        <span style={{
          position: "relative",
          color: theme.accent,
          animation: "logo-glitch-jitter 1.2s steps(5) infinite",
        }}>TYROLABS</span>
      </span>
    );
  }

  if (variant === "thunder") {
    return (
      <span
        style={{
          ...baseStyle,
          animation: "logo-thunder-shake 0.18s steps(5) infinite, logo-thunder-flash 1.6s steps(20) infinite",
          textShadow: "0 0 6px rgba(239, 68, 68, 0.5), 0 0 14px rgba(255, 255, 255, 0.25)",
        }}
      >
        TYROLABS
      </span>
    );
  }

  if (variant === "snow") {
    return (
      <span
        style={{
          ...baseStyle,
          animation: "logo-frost-glow 2.4s ease-in-out infinite",
        }}
      >
        TYROLABS
      </span>
    );
  }

  if (variant === "sun") {
    return (
      <span
        style={{
          ...baseStyle,
          animation: "logo-sun-warm 2.4s ease-in-out infinite",
        }}
      >
        TYROLABS
      </span>
    );
  }

  if (variant === "sakura") {
    return (
      <span
        style={{
          ...baseStyle,
          animation: "logo-sakura-glow 2.4s ease-in-out infinite",
        }}
      >
        TYROLABS
      </span>
    );
  }

  if (variant === "sprout") {
    return (
      <span
        style={{
          ...baseStyle,
          transformOrigin: "center bottom",
          animation: "logo-sprout-sway 2.6s ease-in-out infinite, logo-sprout-glow 2.6s ease-in-out infinite",
        }}
      >
        TYROLABS
      </span>
    );
  }

  // lockon
  return (
    <span
      style={{
        ...baseStyle,
        textShadow: `0 0 8px ${hexToRgba(theme.accent, 0.5)}`,
      }}
    >
      TYROLABS
    </span>
  );
}

/* ─── Star-specific styles per variant ────────────────────────────── */

function starStyle(variant: Variant, hover: boolean): CSSProperties {
  if (!hover) return {};
  switch (variant) {
    case "lava":
      return { animation: "logo-lava-star 1.8s ease-in-out infinite, logo-star-pulse 1.8s ease-in-out infinite" };
    case "snow":
      return { animation: "logo-frost-star 2.4s ease-in-out infinite, logo-star-spin 8s linear infinite" };
    case "sakura":
      return { animation: "logo-star-pulse 2.4s ease-in-out infinite" };
    case "thunder":
      return { animation: "logo-thunder-shake 0.18s steps(5) infinite" };
    case "sun":
      return { animation: "logo-star-pulse 1.6s ease-in-out infinite" };
    case "sprout":
      return { animation: "logo-star-wobble 2.6s ease-in-out infinite" };
    case "glitch":
      return { animation: "logo-glitch-jitter 1.2s steps(5) infinite" };
    case "aurora":
      return { animation: "logo-star-pulse 3s ease-in-out infinite" };
    case "caramel":
      return { animation: "logo-star-pulse 2.4s ease-in-out infinite" };
    case "lockon":
      return {};
    default:
      return {};
  }
}

/* ─── Particle overlays ──────────────────────────────────────────── */

function SnowParticles() {
  const flakes = [
    { x: 6, delay: 0, drift: 8, dur: 2.4 },
    { x: 22, delay: 0.4, drift: -6, dur: 2.8 },
    { x: 40, delay: 0.8, drift: 4, dur: 2.2 },
    { x: 58, delay: 1.2, drift: -8, dur: 2.6 },
    { x: 76, delay: 0.2, drift: 6, dur: 2.4 },
    { x: 94, delay: 1.6, drift: -4, dur: 2.8 },
    { x: 112, delay: 0.6, drift: 8, dur: 2.2 },
    { x: 130, delay: 1.0, drift: -6, dur: 2.6 },
  ];
  return (
    <svg
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      {flakes.map((f, i) => (
        <circle
          key={i}
          cx={f.x}
          cy={0}
          r={1.4}
          fill="#FFFFFF"
          opacity="0.9"
          style={{
            animation: `logo-snow-fall ${f.dur}s linear ${f.delay}s infinite`,
            ["--snow-drift" as string]: `${f.drift}px`,
          } as CSSProperties}
        />
      ))}
    </svg>
  );
}

function SakuraPetals({ accent }: { accent: string }) {
  const petals = [
    { x: 10, delay: 0, dx: 28, rot: 220, dur: 2.6 },
    { x: 35, delay: 0.6, dx: -22, rot: -180, dur: 2.8 },
    { x: 60, delay: 1.2, dx: 32, rot: 240, dur: 2.4 },
    { x: 90, delay: 0.3, dx: -28, rot: -200, dur: 2.6 },
    { x: 115, delay: 1.5, dx: 24, rot: 200, dur: 2.8 },
  ];
  return (
    <svg
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      {petals.map((p, i) => (
        <g
          key={i}
          style={{
            animation: `logo-sakura-drift ${p.dur}s ease-in ${p.delay}s infinite`,
            transformOrigin: `${p.x}px 0px`,
            ["--sakura-dx" as string]: `${p.dx}px`,
            ["--sakura-rot" as string]: `${p.rot}deg`,
          } as CSSProperties}
        >
          <ellipse cx={p.x} cy={0} rx={2.4} ry={3.6} fill={accent} opacity="0.85" />
          <ellipse cx={p.x} cy={0} rx={1} ry={2} fill="#FFFFFF" opacity="0.4" />
        </g>
      ))}
    </svg>
  );
}

function SunRays({ accent }: { accent: string }) {
  const rays = Array.from({ length: 8 }, (_, i) => i);
  return (
    <svg
      aria-hidden="true"
      width="60"
      height="60"
      viewBox="-30 -30 60 60"
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      <g style={{ animation: "logo-sun-ray 1.6s ease-out infinite", transformOrigin: "0 0" }}>
        {rays.map((i) => {
          const angle = (i * 360) / 8;
          return (
            <line
              key={i}
              x1={0}
              y1={-12}
              x2={0}
              y2={-22}
              stroke={accent}
              strokeWidth={1.5}
              strokeLinecap="round"
              transform={`rotate(${angle})`}
              opacity="0.85"
            />
          );
        })}
      </g>
    </svg>
  );
}

function SunFlare() {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        borderRadius: 6,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "30%",
          height: "100%",
          background: "linear-gradient(90deg, transparent 0%, rgba(255, 240, 180, 0.55) 50%, transparent 100%)",
          animation: "logo-sun-flare 2.2s ease-in-out infinite",
        }}
      />
    </span>
  );
}

function MintLeaves({ accent }: { accent: string }) {
  const leaves = [
    { angle: -30, delay: 0, dx: 6, dur: 2.2 },
    { angle: 30, delay: 0.5, dx: -6, dur: 2.4 },
    { angle: -60, delay: 1.0, dx: 4, dur: 2.0 },
    { angle: 60, delay: 1.5, dx: -4, dur: 2.4 },
  ];
  return (
    <svg
      aria-hidden="true"
      width="48"
      height="48"
      viewBox="-24 -24 48 48"
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        overflow: "visible",
      }}
    >
      {leaves.map((l, i) => (
        <g
          key={i}
          transform={`rotate(${l.angle})`}
          style={{
            animation: `logo-sprout-leaf ${l.dur}s ease-out ${l.delay}s infinite`,
            transformOrigin: "0 0",
            ["--leaf-dx" as string]: `${l.dx}px`,
          } as CSSProperties}
        >
          <ellipse cx={0} cy={-10} rx={2.2} ry={4} fill={accent} opacity="0.85" />
          <line x1={0} y1={-6} x2={0} y2={0} stroke={accent} strokeWidth={1} opacity="0.6" />
        </g>
      ))}
    </svg>
  );
}

function ThunderArcs({ accent }: { accent: string }) {
  return (
    <svg
      aria-hidden="true"
      width="48"
      height="48"
      viewBox="-24 -24 48 48"
      style={{
        position: "absolute",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        pointerEvents: "none",
        overflow: "visible",
        animation: "logo-thunder-arc 1.6s steps(20) infinite",
      }}
    >
      <path d="M -16 -8 L -10 -2 L -14 0 L -6 8" stroke="#FFFFFF" strokeWidth={1.2} fill="none" strokeLinecap="round" opacity="0.95" />
      <path d="M 16 -8 L 10 -2 L 14 0 L 6 8" stroke={accent} strokeWidth={1.2} fill="none" strokeLinecap="round" opacity="0.9" />
      <path d="M 0 -16 L 4 -10 L -2 -8 L 2 -2" stroke="#FFFFFF" strokeWidth={1} fill="none" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

function LockonBrackets({ accent }: { accent: string }) {
  const common: CSSProperties = {
    position: "absolute",
    width: 6,
    height: 6,
    pointerEvents: "none",
  };
  const stroke = `1.5px solid ${accent}`;
  return (
    <>
      <span style={{
        ...common, top: -2, left: -2, borderTop: stroke, borderLeft: stroke,
        animation: "logo-lockon-tl 0.6s ease-out forwards",
      }} />
      <span style={{
        ...common, top: -2, right: -2, borderTop: stroke, borderRight: stroke,
        animation: "logo-lockon-tr 0.6s ease-out forwards",
      }} />
      <span style={{
        ...common, bottom: -2, left: -2, borderBottom: stroke, borderLeft: stroke,
        animation: "logo-lockon-bl 0.6s ease-out forwards",
      }} />
      <span style={{
        ...common, bottom: -2, right: -2, borderBottom: stroke, borderRight: stroke,
        animation: "logo-lockon-br 0.6s ease-out forwards",
      }} />
    </>
  );
}

function ScanLine({ accent, duration, thickness = 1 }: { accent: string; duration: string; thickness?: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        position: "absolute",
        inset: 0,
        pointerEvents: "none",
        overflow: "hidden",
        borderRadius: 4,
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          width: "20%",
          height: "100%",
          background: `linear-gradient(90deg, transparent 0%, ${hexToRgba(accent, 0.5)} 50%, transparent 100%)`,
          borderRight: `${thickness}px solid ${hexToRgba(accent, 0.7)}`,
          animation: `logo-lockon-scan ${duration} ease-in-out infinite`,
        }}
      />
    </span>
  );
}

