import type { ReactNode } from "react";
import { ornamentBoxStyle } from "./shared";

type Shape = "flame" | "bolt" | "snowflake" | "blossom";

export function Ornament({ shape, hover }: { shape: Shape; hover: boolean }) {
  return (
    <span style={ornamentBoxStyle(hover)} aria-hidden="true">
      {SHAPES[shape]}
    </span>
  );
}

const SHAPES: Record<Shape, ReactNode> = {
  flame: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <defs>
        <linearGradient id="orn-flame" x1="0" y1="1" x2="0" y2="0">
          <stop offset="0" stopColor="#7C2D12" />
          <stop offset="0.35" stopColor="#EF4444" />
          <stop offset="0.7" stopColor="#F59E0B" />
          <stop offset="1" stopColor="#FCD34D" />
        </linearGradient>
      </defs>
      <path
        d="M7 0.5 Q8.5 3 8.2 5.5 Q10 6 9.6 8.5 Q9.2 11.5 7 13.5 Q4.8 11.5 4.4 8.5 Q4 6 5.8 5.5 Q5.5 3 7 0.5 Z"
        fill="url(#orn-flame)"
      />
      <path d="M7 4 Q7.6 6 7 8 Q6.4 6 7 4 Z" fill="#FEF3C7" opacity="0.85" />
    </svg>
  ),

  bolt: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <defs>
        <linearGradient id="orn-bolt" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FCA5A5" />
          <stop offset="0.5" stopColor="#EF4444" />
          <stop offset="1" stopColor="#7F1D1D" />
        </linearGradient>
      </defs>
      <path
        d="M8.5 0.5 L3.5 7.2 L6.4 7.2 L4.8 13.5 L11 5.8 L7.8 5.8 L9.6 0.5 Z"
        fill="url(#orn-bolt)"
        stroke="#FFFFFF"
        strokeWidth="0.4"
        strokeLinejoin="round"
      />
    </svg>
  ),

  snowflake: (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      stroke="#E0F2FE"
      strokeWidth="0.9"
      fill="none"
      strokeLinecap="round"
    >
      <line x1="7" y1="1" x2="7" y2="13" />
      <line x1="1.7" y1="4" x2="12.3" y2="10" />
      <line x1="1.7" y1="10" x2="12.3" y2="4" />
      <path d="M7 2.6 L5.8 3.6 M7 2.6 L8.2 3.6 M7 11.4 L5.8 10.4 M7 11.4 L8.2 10.4" />
      <path d="M3.2 4.9 L3.6 6.3 M3.2 4.9 L4.4 4.6 M10.8 9.1 L10.4 7.7 M10.8 9.1 L9.6 9.4" />
      <path d="M3.2 9.1 L3.6 7.7 M3.2 9.1 L4.4 9.4 M10.8 4.9 L10.4 6.3 M10.8 4.9 L9.6 4.6" />
      <circle cx="7" cy="7" r="0.6" fill="#E0F2FE" stroke="none" />
    </svg>
  ),

  blossom: (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
      <defs>
        <radialGradient id="orn-petal" cx="0.5" cy="0.5" r="0.6">
          <stop offset="0" stopColor="#FECDD3" />
          <stop offset="0.7" stopColor="#F472B6" />
          <stop offset="1" stopColor="#DB2777" />
        </radialGradient>
      </defs>
      <g transform="translate(7 7)">
        <ellipse cx="0" cy="-3.6" rx="1.9" ry="2.8" fill="url(#orn-petal)" transform="rotate(0)" />
        <ellipse cx="0" cy="-3.6" rx="1.9" ry="2.8" fill="url(#orn-petal)" transform="rotate(72)" />
        <ellipse cx="0" cy="-3.6" rx="1.9" ry="2.8" fill="url(#orn-petal)" transform="rotate(144)" />
        <ellipse cx="0" cy="-3.6" rx="1.9" ry="2.8" fill="url(#orn-petal)" transform="rotate(216)" />
        <ellipse cx="0" cy="-3.6" rx="1.9" ry="2.8" fill="url(#orn-petal)" transform="rotate(288)" />
        <circle r="1.5" fill="#FCD34D" />
        <circle r="0.6" fill="#FFFFFF" opacity="0.7" />
      </g>
    </svg>
  ),
};
