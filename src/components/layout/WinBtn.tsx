import { useState, type ReactNode } from "react";
import { C } from "../../lib/colors";

interface Props {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  danger?: boolean;
  title?: string;
}

export function WinBtn({ children, onClick, active, danger, title }: Props) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 52,
        height: 52,
        border: "none",
        cursor: "pointer",
        borderRadius: 6,
        background: hov ? (danger ? C.dangerDim : "rgba(255,255,255,0.06)") : "transparent",
        color: active ? C.accent : danger && hov ? C.danger : "#A1A1AA",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "all 0.12s",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}
