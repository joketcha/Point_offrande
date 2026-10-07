import React from "react";
import { useCurrentFrame } from "remotion";
import { bruit, mix } from "../lib/util";
import type { Vierge } from "../lib/vierges";
import { Flame } from "./Flame";

export type VirginState = {
  /** 0 debout → 1 assise */
  readonly sit?: number;
  /** 0 éveillée → 1 tête tombée de sommeil */
  readonly sleep?: number;
  /** course : lit la phase depuis l'image courante */
  readonly run?: boolean;
  /** intensité de la lampe, 0 = éteinte */
  readonly lamp?: number;
  /** fumée après extinction 0..1 */
  readonly smoke?: number;
  /** 0 lampe à la poitrine → 1 lampe levée */
  readonly raise?: number;
  /** bras libre tendu vers l'avant 0..1 */
  readonly reach?: number;
  /** rotation de la tête (degrés), négatif = baissée */
  readonly head?: number;
  /** force du vent dans le voile */
  readonly wind?: number;
};

type VirginProps = VirginState & {
  readonly v: Vierge;
  readonly x: number;
  readonly y: number;
  readonly scale?: number;
  readonly facing?: 1 | -1;
  readonly seed: string;
};

const PEAU = "#1c120d";

export const Virgin: React.FC<VirginProps> = ({
  v,
  x,
  y,
  scale = 1,
  facing = 1,
  seed,
  sit = 0,
  sleep = 0,
  run = false,
  lamp = 1,
  smoke = 0,
  raise = 0,
  reach = 0,
  head = 0,
  wind = 0.5,
}) => {
  const frame = useCurrentFrame();
  const souffle = bruit(seed + "-souffle", frame, 0.04) * 1.5;
  const voileVent = bruit(seed + "-vent", frame, 0.06) * 10 * wind;
  const foulee = run ? Math.sin(frame * 0.55 + seed.length) : 0;
  const rebond = run ? -Math.abs(Math.sin(frame * 0.55 + seed.length)) * 8 : 0;

  // Position de la lampe (debout) et lumière chaude qui en émane.
  const lx = mix(52, 66, raise) + (run ? 8 : 0);
  const ly = mix(-136, -228, raise);
  const sx = 88;
  const sy = -6;
  const chaleur = Math.max(0, lamp);
  const litId = `lit-d-${seed}`;
  const litAssis = `lit-a-${seed}`;
  const luneId = `lune-${seed}`;

  const robeDebout = `M -26 -205 C -40 -150 ${-48 - foulee * 10} -60 ${-54 - foulee * 14} 0 L ${50 + foulee * 14} 0 C 46 -60 40 -150 28 -205 Z`;
  const voileDebout = `M -22 -252 C -5 -270 22 -264 26 -242 C 30 -222 30 -206 34 -196 C 10 -190 -20 -182 ${-46 - voileVent - (run ? 30 : 0)} ${-140 + (run ? 30 : 0)} C -40 -190 -38 -232 -22 -252 Z`;
  const brasLampe = `M 16 -192 Q ${mix(30, 50, raise)} ${mix(-150, -210, raise)} ${lx - 4} ${ly + 6}`;
  const brasLibre = `M -10 -190 Q ${mix(-14, 40, reach)} ${mix(-140, -185, reach)} ${mix(-18, 92, reach)} ${mix(-120, -182, reach)}`;

  const corpsAssis =
    "M -20 -140 C -32 -100 -40 -50 -44 0 L 64 0 C 74 -10 78 -30 62 -44 L 26 -58 C 28 -95 26 -120 20 -140 Z";
  const angleSommeil = sleep * 52;

  return (
    <g transform={`translate(${x} ${y}) scale(${scale * facing} ${scale})`}>
      <defs>
        <radialGradient id={litId} gradientUnits="userSpaceOnUse" cx={lx} cy={ly} r={135}>
          <stop offset="0" stopColor="#ffcf8a" stopOpacity={0.8} />
          <stop offset="0.45" stopColor="#a8501c" stopOpacity={0.25} />
          <stop offset="1" stopColor="#000" stopOpacity={0} />
        </radialGradient>
        <radialGradient id={litAssis} gradientUnits="userSpaceOnUse" cx={sx} cy={sy} r={130}>
          <stop offset="0" stopColor="#ffcf8a" stopOpacity={0.8} />
          <stop offset="0.45" stopColor="#a8501c" stopOpacity={0.25} />
          <stop offset="1" stopColor="#000" stopOpacity={0} />
        </radialGradient>
        <linearGradient id={luneId} x1="0" y1="0" x2="1" y2="0.4">
          <stop offset="0" stopColor="#8fa6d8" stopOpacity={0.3} />
          <stop offset="0.4" stopColor="#8fa6d8" stopOpacity={0} />
        </linearGradient>
      </defs>

      {/* Lueur au sol */}
      <ellipse
        cx={sit > 0.5 ? sx : lx}
        cy={0}
        rx={110}
        ry={16}
        fill="#ff9d45"
        opacity={0.3 * chaleur}
        filter="url(#flou-6)"
      />
      <ellipse cx={10} cy={2} rx={58} ry={7} fill="#000" opacity={0.45} />

      {/* Debout */}
      {sit < 1 ? (
        <g
          opacity={1 - sit}
          transform={`translate(0 ${rebond + sit * 40 + souffle}) rotate(${run ? 12 : 0} 0 0)`}
        >
          <path d={brasLibre} stroke={v.robe} strokeWidth={11} fill="none" strokeLinecap="round" />
          <path d={robeDebout} fill={v.robe} />
          <path d={robeDebout} fill={`url(#${litId})`} opacity={chaleur} />
          <path d={robeDebout} fill={`url(#${luneId})`} />
          <g transform={`rotate(${head} 2 -210)`}>
            <circle cx={4} cy={-228} r={19} fill={PEAU} />
            <circle cx={4} cy={-228} r={19} fill={`url(#${litId})`} opacity={chaleur} />
            <path d={voileDebout} fill={v.voile} />
            <path d={voileDebout} fill="#05070d" opacity={0.55} />
            <path d={voileDebout} fill={`url(#${litId})`} opacity={chaleur * 0.8} />
            <path d={voileDebout} fill={`url(#${luneId})`} />
          </g>
          <path d={brasLampe} stroke={v.robe} strokeWidth={12} fill="none" strokeLinecap="round" />
          <path d={brasLampe} stroke={`url(#${litId})`} strokeWidth={12} fill="none" strokeLinecap="round" opacity={chaleur} />
          <circle cx={lx - 4} cy={ly + 6} r={6} fill={PEAU} />
          <Lampe x={lx} y={ly} lamp={lamp} smoke={smoke} seed={seed} />
        </g>
      ) : null}

      {/* Assise / endormie */}
      {sit > 0 ? (
        <g opacity={sit} transform={`translate(0 ${souffle * 0.6})`}>
          <path d={corpsAssis} fill={v.robe} />
          <path d={corpsAssis} fill={`url(#${litAssis})`} opacity={chaleur} />
          <path d={corpsAssis} fill={`url(#${luneId})`} />
          <g transform={`rotate(${angleSommeil + head} 14 -138)`}>
            <circle cx={4} cy={-162} r={19} fill={PEAU} />
            <circle cx={4} cy={-162} r={19} fill={`url(#${litAssis})`} opacity={chaleur} />
            <g transform="translate(0 66)">
              <path d={voileDebout} fill={v.voile} />
              <path d={voileDebout} fill="#05070d" opacity={0.55} />
              <path d={voileDebout} fill={`url(#${litAssis})`} opacity={chaleur * 0.8} />
              <path d={voileDebout} fill={`url(#${luneId})`} />
            </g>
          </g>
          <Lampe x={sx} y={sy} lamp={lamp} smoke={smoke} seed={seed + "-sol"} />
        </g>
      ) : null}
    </g>
  );
};

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
