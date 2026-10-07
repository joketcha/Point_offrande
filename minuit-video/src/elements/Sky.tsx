import React from "react";
import { random, useCurrentFrame } from "remotion";
import { Stage } from "./Stage";

const ETOILES = new Array(320).fill(0).map((_, i) => ({
  x: random(`etoile-x-${i}`) * 1920,
  y: -1400 + random(`etoile-y-${i}`) * 2200,
  r: 0.4 + random(`etoile-r-${i}`) ** 3 * 1.8,
  p: random(`etoile-p-${i}`) * Math.PI * 2,
}));

const NUAGES = new Array(11).fill(0).map((_, i) => ({
  x: random(`nuage-x-${i}`) * 2800 - 400,
  y: -500 + random(`nuage-y-${i}`) * 950,
  w: 380 + random(`nuage-w-${i}`) * 700,
  h: 36 + random(`nuage-h-${i}`) * 80,
  o: 0.35 + random(`nuage-o-${i}`) * 0.5,
}));

type SkyProps = {
  readonly moonX?: number;
  readonly moonY?: number;
  readonly moonR?: number;
  /** pixels par image */
  readonly cloudSpeed?: number;
  readonly cloudOpacity?: number;
  /** décalage vertical (panoramique vers le ciel) */
  readonly offsetY?: number;
  readonly horizon?: string;
};

export const Sky: React.FC<SkyProps> = ({
  moonX = 1450,
  moonY = 210,
  moonR = 46,
  cloudSpeed = 0.25,
  cloudOpacity = 0.7,
  offsetY = 0,
  horizon = "#1b2c4d",
}) => {
  const frame = useCurrentFrame();
  return (
    <Stage>
      <defs>
        <linearGradient id="ciel" gradientUnits="userSpaceOnUse" x1={0} y1={-1500} x2={0} y2={1080}>
          <stop offset="0" stopColor="#010208" />
          <stop offset="0.55" stopColor="#040a1a" />
          <stop offset="0.82" stopColor="#0b1833" />
          <stop offset="1" stopColor={horizon} />
        </linearGradient>
        <radialGradient id="lune-halo">
          <stop offset="0" stopColor="#c9d6ff" stopOpacity={0.45} />
          <stop offset="0.2" stopColor="#9fb3e6" stopOpacity={0.18} />
          <stop offset="1" stopColor="#000" stopOpacity={0} />
        </radialGradient>
        <radialGradient id="lune-face" cx="0.42" cy="0.38" r="0.7">
          <stop offset="0" stopColor="#fbf8ec" />
          <stop offset="0.7" stopColor="#dcdcd2" />
          <stop offset="1" stopColor="#aeb4bd" />
        </radialGradient>
      </defs>
      <g transform={`translate(0 ${offsetY})`}>
        <rect x={-200} y={-1600} width={2320} height={2900} fill="url(#ciel)" />
        {ETOILES.map((e, i) => (
          <circle
            key={i}
            cx={e.x}
            cy={e.y}
            r={e.r}
            fill="#dfe7ff"
            opacity={0.35 + 0.45 * (0.5 + 0.5 * Math.sin(frame * 0.07 + e.p))}
          />
        ))}
        <circle cx={moonX} cy={moonY} r={moonR * 9} fill="url(#lune-halo)" />
        <circle cx={moonX} cy={moonY} r={moonR} fill="url(#lune-face)" />
        <g opacity={0.13} fill="#6f7680">
          <circle cx={moonX - moonR * 0.3} cy={moonY - moonR * 0.2} r={moonR * 0.22} />
          <circle cx={moonX + moonR * 0.25} cy={moonY + moonR * 0.3} r={moonR * 0.16} />
          <circle cx={moonX + moonR * 0.35} cy={moonY - moonR * 0.35} r={moonR * 0.1} />
          <circle cx={moonX - moonR * 0.1} cy={moonY + moonR * 0.45} r={moonR * 0.12} />
        </g>
        {NUAGES.map((n, i) => {
          const x = ((n.x + frame * cloudSpeed * (0.6 + n.o) + 400) % 2800) - 400;
          return (
            <g key={i} opacity={cloudOpacity * n.o} filter="url(#flou-30)">
              <ellipse cx={x} cy={n.y} rx={n.w / 2} ry={n.h} fill="#18233b" />
              <ellipse cx={x - n.w * 0.08} cy={n.y - n.h * 0.45} rx={n.w * 0.4} ry={n.h * 0.45} fill="#5a6c92" opacity={0.55} />
            </g>
          );
        })}
      </g>
    </Stage>
  );
};
