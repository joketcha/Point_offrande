import React from "react";
import { random, useCurrentFrame } from "remotion";
import { bruit } from "../lib/util";
import { Stage } from "./Stage";

type ProfileProps = {
  readonly seed: string;
  readonly voile?: string;
  /** visage d'homme (le veilleur) : coiffe et barbe */
  readonly homme?: boolean;
  readonly facing?: 1 | -1;
  /** 0 fermé, 1 ouvert, 1.25 écarquillé */
  readonly eyeOpen?: number;
  /** direction du regard -1 (bas) .. 1 (haut) */
  readonly gaze?: number;
  /** 0..1 sourcils levés (peur, surprise) */
  readonly brow?: number;
  /** intensité de la lumière sur le visage */
  readonly light?: number;
  readonly lightColor?: string;
  /** inclinaison de la tête en degrés */
  readonly tilt?: number;
  readonly x?: number;
  readonly y?: number;
  readonly scale?: number;
  /** bokeh de flammes en arrière-plan */
  readonly bokeh?: number;
  readonly bokehColor?: string;
  /** dessiner le fond (false pour superposer deux visages) */
  readonly fond?: boolean;
};

const VISAGE =
  "M -180 -330 C -60 -400 120 -380 150 -260 C 165 -220 170 -170 168 -140 C 175 -125 172 -110 165 -100 C 185 -60 205 -20 215 5 C 220 15 210 25 190 28 C 182 30 178 35 182 45 C 190 55 192 62 186 70 C 182 74 182 76 186 80 C 190 88 186 98 178 104 C 170 110 168 120 175 135 C 178 160 165 185 130 195 C 90 205 60 210 50 240 L 40 700 L -260 700 C -240 400 -260 200 -250 0 C -250 -200 -240 -280 -180 -330 Z";
const VOILE =
  "M 168 -232 C 120 -410 -170 -440 -285 -260 C -355 -120 -345 250 -390 720 L 30 720 C 0 450 -10 300 -30 180 C -50 60 -40 -80 20 -170 C 70 -228 120 -244 168 -232 Z";
const COIFFE =
  "M 160 -240 C 120 -400 -170 -430 -285 -260 C -330 -150 -330 50 -350 300 L -150 300 C -140 150 -120 0 -60 -90 C 0 -190 80 -230 160 -240 Z";
const BARBE = "M 178 112 C 186 190 128 262 42 252 C -4 246 -24 200 -14 120 C 40 160 120 150 178 112 Z";

const BOKEH = new Array(14).fill(0).map((_, i) => ({
  x: random(`bokeh-x-${i}`) * 1920,
  y: 300 + random(`bokeh-y-${i}`) * 700,
  r: 18 + random(`bokeh-r-${i}`) * 50,
}));

// Gros plan de visage en profil, éclairé par une lampe ou une torche.
export const Profile: React.FC<ProfileProps> = ({
  seed,
  voile = "#c9b48c",
  homme = false,
  facing = 1,
  eyeOpen = 1,
  gaze = 0,
  brow = 0,
  light = 1,
  lightColor = "#f0a050",
  tilt = 0,
  x = 960,
  y = 560,
  scale = 1.15,
  bokeh = 0.6,
  bokehColor = "#ff9a40",
  fond = true,
}) => {
  const frame = useCurrentFrame();
  const respire = bruit(seed, frame, 0.03) * 6;
  const vacille = 0.9 + 0.1 * bruit(seed + "-v", frame, 0.25);
  const L = light * vacille;
  const ouv = Math.max(0.04, eyeOpen);
  const id = `profil-${seed}`;
  return (
    <Stage>
      <defs>
        <radialGradient id={`${id}-fond`} cx="0.5" cy="0.6" r="0.8">
          <stop offset="0" stopColor="#0d1424" />
          <stop offset="1" stopColor="#020308" />
        </radialGradient>
        <linearGradient id={`${id}-lum`} gradientUnits="userSpaceOnUse" x1={240} y1={40} x2={30} y2={-60}>
          <stop offset="0" stopColor={lightColor} stopOpacity={0.95} />
          <stop offset="0.45" stopColor={lightColor} stopOpacity={0.35} />
          <stop offset="1" stopColor={lightColor} stopOpacity={0} />
        </linearGradient>
        <linearGradient id={`${id}-lune`} gradientUnits="userSpaceOnUse" x1={-380} y1={-300} x2={-120} y2={0}>
          <stop offset="0" stopColor="#7f98d0" stopOpacity={0.45} />
          <stop offset="1" stopColor="#7f98d0" stopOpacity={0} />
        </linearGradient>
      </defs>
      {fond ? <rect width={1920} height={1080} fill={`url(#${id}-fond)`} /> : null}
      <g filter="url(#flou-30)" opacity={fond ? bokeh : 0}>
        {BOKEH.map((b, i) => (
          <circle
            key={i}
            cx={b.x + bruit(seed + i, frame, 0.01) * 30}
            cy={b.y}
            r={b.r}
            fill={bokehColor}
            opacity={0.25 + 0.2 * bruit(seed + "-b" + i, frame, 0.2)}
          />
        ))}
      </g>
      <g transform={`translate(${x} ${y + respire}) scale(${scale * facing} ${scale}) rotate(${tilt})`}>
        <path d={VISAGE} fill="#0f0a08" />
        <path d={VISAGE} fill={`url(#${id}-lum)`} opacity={L} />
        {homme ? <path d={BARBE} fill="#0b0705" /> : null}
        {/* Œil */}
        <g transform={`translate(122 ${-94 - gaze * 4})`}>
          <ellipse rx={20} ry={10 * ouv} fill="#e8d8c0" opacity={0.15 + 0.45 * L} />
          <circle cx={9 + gaze} cy={-gaze * 2} r={7.5 * Math.min(1, ouv)} fill="#0a0604" />
          <circle cx={12} cy={-3} r={2.4 * Math.min(1, ouv)} fill="#fff1d0" opacity={0.25 + 0.75 * L} />
          <path d={`M -22 0 Q 0 ${-14 * ouv - 3} 22 2`} stroke="#0a0604" strokeWidth={4} fill="none" />
        </g>
        <path
          d={`M 92 ${-128 - brow * 16} Q 125 ${-142 - brow * 22} 158 ${-130 - brow * 14}`}
          stroke="#0a0604"
          strokeWidth={8}
          strokeLinecap="round"
          fill="none"
        />
        <path d={homme ? COIFFE : VOILE} fill={homme ? "#4a4036" : voile} />
        <path d={homme ? COIFFE : VOILE} fill="#03050a" opacity={0.74} />
        <path d={homme ? COIFFE : VOILE} fill={`url(#${id}-lum)`} opacity={L * 0.7} />
        <path d={homme ? COIFFE : VOILE} fill={`url(#${id}-lune)`} />
      </g>
    </Stage>
  );
};
