import { useState, type ReactNode } from "react";
import { C } from "../../lib/colors";

interface Props {
  children: ReactNode;
  onClick?: () => void;
  active?: boolean;
  danger?: boolean;
  title?: string;
  isWinCtrl?: boolean;
}

export function WinBtn({ children, onClick, active, danger, title, isWinCtrl }: Props) {
  const [hov, setHov] = useState(false);
  return (
    <button
      title={title}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: isWinCtrl ? 46 : 40,
        height: isWinCtrl ? "100%" : 40,
        border: "none",
        cursor: "pointer",
        borderRadius: isWinCtrl ? 0 : 6,
        background: hov ? (danger ? "#E81123" : "rgba(128,128,128,0.2)") : "transparent",
        color: active ? C.accent : danger && hov ? "#fff" : "var(--t1)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        transition: "background 0.1s, color 0.1s",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}
