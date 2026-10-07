import React from "react";
import { random, useCurrentFrame } from "remotion";
import { bruit } from "../lib/util";
import { Stage } from "./Stage";

const PIERRES = new Array(120).fill(0).map((_, i) => ({
  x: (i % 12) * 170 - 40 + (Math.floor(i / 12) % 2) * 85,
  y: Math.floor(i / 12) * 95,
  t: random(`mur-${i}`),
}));

// La porte de la salle des noces. closed : 0 grande ouverte → 1 fermée.
export const Door: React.FC<{
  readonly closed?: number;
  readonly interior?: number;
  readonly children?: React.ReactNode;
  readonly front?: React.ReactNode;
}> = ({ closed = 0, interior = 1, children, front }) => {
  const frame = useCurrentFrame();
  const vac = 0.92 + 0.08 * bruit("salle", frame, 0.12);
  const ax = 700;
  const aw = 520;
  const top = 250;
  const bas = 900;
  const demi = aw / 2;
  const feuille = demi * (0.12 + 0.88 * closed);
  const ouverture = 1 - closed;
  return (
    <Stage>
      <defs>
        <radialGradient id="salle-lum" cx="0.5" cy="0.6" r="0.7">
          <stop offset="0" stopColor="#ffe3a8" />
          <stop offset="0.6" stopColor="#f0a24a" />
          <stop offset="1" stopColor="#8a3d14" />
        </radialGradient>
        <linearGradient id="bois" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#2a180c" />
          <stop offset="0.5" stopColor="#3b2414" />
          <stop offset="1" stopColor="#24140a" />
        </linearGradient>
      </defs>
      <rect width={1920} height={1080} fill="#070b14" />
      {PIERRES.map((p, i) => (
        <rect key={i} x={p.x} y={p.y} width={164} height={89} rx={6} fill="#141b2a" opacity={0.6 + p.t * 0.4} />
      ))}
      <rect width={1920} height={1080} fill="#ff9d4a" opacity={0.12 * ouverture * interior} />
      {/* Fenêtres hautes de la salle : la lumière continue de briller */}
      {[260, 1560].map((fx) => (
        <g key={fx}>
          <path d={`M ${fx} 380 L ${fx} 300 Q ${fx + 50} 240 ${fx + 100} 300 L ${fx + 100} 380 Z`} fill="url(#salle-lum)" opacity={interior * vac} />
          <ellipse cx={fx + 50} cy={330} rx={160} ry={120} fill="#ffb060" opacity={0.18 * interior} filter="url(#flou-30)" />
        </g>
      ))}
      {/* Encadrement en pierre */}
      <path d={`M ${ax - 60} ${bas} L ${ax - 60} ${top + 60} Q ${ax + demi} ${top - 160} ${ax + aw + 60} ${top + 60} L ${ax + aw + 60} ${bas} Z`} fill="#1c2436" />
      <path d={`M ${ax} ${bas} L ${ax} ${top + 80} Q ${ax + demi} ${top - 90} ${ax + aw} ${top + 80} L ${ax + aw} ${bas} Z`} fill="url(#salle-lum)" opacity={interior * vac} />
      {children}
      {/* Battants */}
      <rect x={ax} y={top} width={feuille} height={bas - top} fill="url(#bois)" />
      <rect x={ax + aw - feuille} y={top} width={feuille} height={bas - top} fill="url(#bois)" />
      {[0.25, 0.5, 0.75].map((k) => (
        <g key={k} opacity={0.6}>
          <line x1={ax} x2={ax + feuille} y1={top + (bas - top) * k} y2={top + (bas - top) * k} stroke="#120a05" strokeWidth={10} />
          <line x1={ax + aw - feuille} x2={ax + aw} y1={top + (bas - top) * k} y2={top + (bas - top) * k} stroke="#120a05" strokeWidth={10} />
        </g>
      ))}
      <path d={`M ${ax - 60} ${top + 60} Q ${ax + demi} ${top - 160} ${ax + aw + 60} ${top + 60} L ${ax + aw + 60} 0 L ${ax - 60} 0 Z`} fill="#1c2436" />
      {/* Fente de lumière sous la porte une fois fermée */}
      <rect x={ax} y={bas - 4} width={aw} height={6} fill="#ffc070" opacity={closed * interior * vac} />
      <ellipse cx={ax + demi} cy={bas + 6} rx={demi} ry={16} fill="#ffa050" opacity={closed * interior * 0.35} filter="url(#flou-6)" />
      {/* Lumière qui se répand au sol */}
      <path d={`M ${ax + demi - feuille * 0 - (aw - 2 * feuille) / 2} ${bas} L ${ax + demi + (aw - 2 * feuille) / 2} ${bas} L ${ax + demi + (aw - 2 * feuille) * 1.6} 1080 L ${ax + demi - (aw - 2 * feuille) * 1.6} 1080 Z`} fill="#ffb060" opacity={0.35 * interior} filter="url(#flou-14)" />
      <rect y={bas} width={1920} height={1080 - bas} fill="#0a0e18" opacity={0.85} />
      {front}
    </Stage>
  );
};
