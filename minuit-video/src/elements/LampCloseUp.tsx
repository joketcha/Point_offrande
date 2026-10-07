import React from "react";
import { random, useCurrentFrame } from "remotion";
import { bruit } from "../lib/util";
import { Flame } from "./Flame";
import { Stage } from "./Stage";

const BOKEH = new Array(10).fill(0).map((_, i) => ({
  x: random(`lb-x-${i}`) * 1920,
  y: 250 + random(`lb-y-${i}`) * 500,
  r: 20 + random(`lb-r-${i}`) * 60,
}));

// Gros plan : une lampe à huile, éventuellement tenue par une main.
export const LampCloseUp: React.FC<{
  readonly seed: string;
  readonly intensity?: number;
  readonly smoke?: number;
  readonly hand?: boolean;
  readonly tilt?: number;
  readonly x?: number;
  readonly y?: number;
  readonly scale?: number;
  readonly bokeh?: number;
}> = ({ seed, intensity = 1, smoke = 0, hand = false, tilt = 0, x = 900, y = 700, scale = 1, bokeh = 0.7 }) => {
  const frame = useCurrentFrame();
  const vac = 0.9 + 0.1 * bruit(seed, frame, 0.25);
  const I = intensity * vac;
  const id = `gplampe-${seed}`;
  return (
    <Stage>
      <defs>
        <radialGradient id={`${id}-fond`} cx="0.55" cy="0.45" r="0.75">
          <stop offset="0" stopColor="#1a1410" stopOpacity={0.4 + 0.6 * intensity} />
          <stop offset="0.6" stopColor="#070a14" />
          <stop offset="1" stopColor="#010205" />
        </radialGradient>
        <radialGradient id={`${id}-lum`} gradientUnits="userSpaceOnUse" cx={230} cy={-130} r={420}>
          <stop offset="0" stopColor="#ffc47a" stopOpacity={0.95} />
          <stop offset="0.5" stopColor="#c0602a" stopOpacity={0.35} />
          <stop offset="1" stopColor="#000" stopOpacity={0} />
        </radialGradient>
      </defs>
      <rect width={1920} height={1080} fill={`url(#${id}-fond)`} />
      <g filter="url(#flou-30)" opacity={bokeh}>
        {BOKEH.map((b, i) => (
          <circle key={i} cx={b.x} cy={b.y} r={b.r} fill="#ff9a40" opacity={0.18 + 0.15 * bruit(seed + i, frame, 0.15)} />
        ))}
      </g>
      <g transform={`translate(${x} ${y}) scale(${scale}) rotate(${tilt})`}>
        {hand ? (
          <g>
            <path
              d="M -260 160 C -200 60 -150 40 -60 50 C 40 58 120 60 170 40 C 200 30 215 55 190 72 C 150 100 80 110 40 112 C 120 120 160 140 140 160 C 100 190 -40 190 -120 230 L -300 320 Z"
              fill="#2a1a10"
            />
            <path
              d="M -260 160 C -200 60 -150 40 -60 50 C 40 58 120 60 170 40 C 200 30 215 55 190 72 C 150 100 80 110 40 112 C 120 120 160 140 140 160 C 100 190 -40 190 -120 230 L -300 320 Z"
              fill={`url(#${id}-lum)`}
              opacity={I * 0.8}
            />
          </g>
        ) : null}
        {/* Corps de la lampe */}
        <path d="M -170 40 C -180 -40 -60 -70 80 -60 C 150 -55 200 -50 240 -40 C 262 -34 262 -12 240 -6 C 180 10 120 50 40 58 C -60 66 -160 70 -170 40 Z" fill="#5a3520" />
        <path d="M -170 40 C -180 -40 -60 -70 80 -60 C 150 -55 200 -50 240 -40 C 262 -34 262 -12 240 -6 C 180 10 120 50 40 58 C -60 66 -160 70 -170 40 Z" fill={`url(#${id}-lum)`} opacity={I} />
        <ellipse cx={-20} cy={-48} rx={110} ry={20} fill="#2b170c" />
        <ellipse cx={-30} cy={-50} rx={26} ry={7} fill="#0a0503" />
        <path d="M -175 10 C -235 -10 -240 50 -175 40" stroke="#3a2212" strokeWidth={14} fill="none" />
        <path d="M -60 -5 C -20 5 30 5 70 -4" stroke="#2b170c" strokeWidth={3} fill="none" opacity={0.6} />
        <Flame x={244} y={-40} size={34} intensity={intensity} smoke={smoke} seed={seed + "-f"} />
      </g>
    </Stage>
  );
};
