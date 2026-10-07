import React from "react";
import { Flame } from "./Flame";

// Petite lampe à huile en terre cuite.
export const Lampe: React.FC<{
  readonly x: number;
  readonly y: number;
  readonly lamp: number;
  readonly smoke?: number;
  readonly seed: string;
  readonly s?: number;
}> = ({ x, y, lamp, smoke = 0, seed, s = 1 }) => (
  <g transform={`translate(${x} ${y}) scale(${s})`}>
    <path d="M -16 0 C -16 -8 8 -10 18 -6 L 26 -5 C 28 -3 26 0 22 0 Z" fill="#4a2c18" />
    <path d="M -16 0 C -16 -8 8 -10 18 -6 L 26 -5 C 28 -3 26 0 22 0 Z" fill="#ffb060" opacity={0.55 * lamp} />
    <path d="M -16 -3 C -24 -6 -24 2 -16 1" stroke="#3a2212" strokeWidth={2.5} fill="none" />
    <Flame x={25} y={-6} size={5.5} intensity={lamp} smoke={smoke} seed={seed + "-flamme"} />
  </g>
);
