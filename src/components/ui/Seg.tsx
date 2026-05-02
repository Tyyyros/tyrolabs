import { C } from "../../lib/colors";

interface Option<V extends string> {
  v: V;
  l: string;
}

interface Props<V extends string> {
  value: V;
  onChange: (v: V) => void;
  options: Option<V>[];
}

export function Seg<V extends string>({ value, onChange, options }: Props<V>) {
  return (
    <div
      style={{
        display: "flex",
        background: "var(--sidebar)",
        border: `1px solid ${C.border}`,
        borderRadius: 5,
        padding: 2,
        gap: 2,
      }}
    >
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          style={{
            padding: "4px 12px",
            fontSize: 11,
            fontWeight: 500,
            border: "none",
            borderRadius: 3,
            cursor: "pointer",
            background: value === o.v ? C.accent : "transparent",
            color: value === o.v ? "#fff" : C.t2,
            transition: "all 0.15s",
          }}
        >
          {o.l}
        </button>
      ))}
    </div>
  );
}
