import React from "react";
import { AbsoluteFill } from "remotion";
import { H, W } from "../lib/util";

// Définitions partagées : halos de flamme, flous.
export const SharedDefs: React.FC = () => (
  <defs>
    <radialGradient id="halo-flamme">
      <stop offset="0" stopColor="#ffd08a" stopOpacity={0.9} />
      <stop offset="0.25" stopColor="#ff9a3d" stopOpacity={0.35} />
      <stop offset="0.6" stopColor="#b8541c" stopOpacity={0.08} />
      <stop offset="1" stopColor="#000" stopOpacity={0} />
    </radialGradient>
    <radialGradient id="halo-torche">
      <stop offset="0" stopColor="#ffd48f" stopOpacity={0.85} />
      <stop offset="0.3" stopColor="#ff8f2e" stopOpacity={0.3} />
      <stop offset="1" stopColor="#000" stopOpacity={0} />
    </radialGradient>
    {/* Volume : face arrière des corps dans l'ombre */}
    <linearGradient id="volume" gradientUnits="userSpaceOnUse" x1={-40} y1={0} x2={24} y2={0}>
      <stop offset="0" stopColor="#000" stopOpacity={0.55} />
      <stop offset="0.55" stopColor="#000" stopOpacity={0.12} />
      <stop offset="1" stopColor="#000" stopOpacity={0} />
    </linearGradient>
    {/* Texture de tissu : fibres et plis fins */}
    <filter id="tissu" x="-10%" y="-10%" width="120%" height="120%">
      <feTurbulence type="fractalNoise" baseFrequency="0.35 0.03" numOctaves={2} seed={7} result="n" />
      <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -0.9 0.42" result="a" />
      <feComposite in="a" in2="SourceAlpha" operator="in" result="t" />
      <feMerge>
        <feMergeNode in="SourceGraphic" />
        <feMergeNode in="t" />
      </feMerge>
    </filter>
    <filter id="flou-2" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation={2} />
    </filter>
    <filter id="flou-6" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation={6} />
    </filter>
    <filter id="flou-14" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation={14} />
    </filter>
    <filter id="flou-30" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation={30} />
    </filter>
  </defs>
);

// Une couche plein cadre en coordonnées 1920×1080.
export const Stage: React.FC<{
  readonly children: React.ReactNode;
  readonly style?: React.CSSProperties;
}> = ({ children, style }) => (
  <AbsoluteFill style={style}>
    <svg
      viewBox={`0 0 ${W} ${H}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid slice"
      style={{ overflow: "visible" }}
    >
      <SharedDefs />
      {children}
    </svg>
  </AbsoluteFill>
);
