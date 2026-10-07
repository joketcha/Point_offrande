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
        <clipPath id={`${id}-clip`}>
          <path d={VISAGE} />
        </clipPath>
        <clipPath id={`${id}-clipv`}>
          <path d={homme ? COIFFE : VOILE} />
        </clipPath>
        <filter id={`${id}-peau`} x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency={0.9} numOctaves={2} seed={4} result="n" />
          <feColorMatrix in="n" type="saturate" values="0" result="g" />
          <feComposite in="g" in2="SourceAlpha" operator="in" result="t" />
          <feBlend in="SourceGraphic" in2="t" mode="soft-light" />
        </filter>
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
        <path d={VISAGE} fill={`url(#${id}-lum)`} opacity={L} filter={`url(#${id}-peau)`} />
        <g clipPath={`url(#${id}-clip)`}>
          {/* Modelé : orbite, pommette, arête du nez, ombre sous la mâchoire */}
          <ellipse cx={105} cy={-92} rx={50} ry={32} fill="#000" opacity={0.4} filter="url(#flou-14)" />
          <ellipse cx={150} cy={-25} rx={42} ry={30} fill={lightColor} opacity={0.32 * L} filter="url(#flou-14)" />
          <ellipse cx={198} cy={-12} rx={10} ry={26} fill="#fff0d8" opacity={0.28 * L} filter="url(#flou-6)" />
          <ellipse cx={120} cy={-150} rx={45} ry={18} fill="#fff0d8" opacity={0.12 * L} filter="url(#flou-14)" />
          <ellipse cx={80} cy={250} rx={140} ry={60} fill="#000" opacity={0.55} filter="url(#flou-14)" />
          <ellipse cx={-40} cy={0} rx={160} ry={320} fill="#000" opacity={0.45} filter="url(#flou-30)" />
          <ellipse cx={180} cy={36} rx={9} ry={5} fill="#000" opacity={0.6} filter="url(#flou-2)" />
          <path d="M 186 70 C 180 62 176 64 170 72" stroke="#3a120c" strokeWidth={5} fill="none" opacity={0.7} />
          <path d="M 184 58 C 190 64 190 72 184 78 C 186 88 184 96 178 102" stroke="#7a3428" strokeWidth={6} fill="none" opacity={0.55} />
        </g>
        {homme ? (
          <g>
            <path d={BARBE} fill="#2a1c14" filter="url(#flou-2)" />
            <path d={BARBE} fill={`url(#${id}-lum)`} opacity={L * 0.45} />
            <path d="M 184 46 C 178 56 166 60 150 58 C 160 50 172 44 184 46 Z" fill="#2a1c14" />
            <g stroke="#0d0806" strokeWidth={2.5} opacity={0.6} fill="none">
              {[0, 1, 2, 3, 4, 5].map((k) => (
                <path key={k} d={`M ${160 - k * 28} ${130 + k * 6} q ${-6} 40 ${-14} ${70 - k * 4}`} />
              ))}
            </g>
          </g>
        ) : null}
        {/* Œil */}
        <g transform={`translate(122 ${-94 - gaze * 4})`}>
          <ellipse rx={20} ry={10 * ouv} fill="#e8d8c0" opacity={0.15 + 0.45 * L} />
          <circle cx={9 + gaze} cy={-gaze * 2} r={7.5 * Math.min(1, ouv)} fill="#0a0604" />
          <circle cx={12} cy={-3} r={2.4 * Math.min(1, ouv)} fill="#fff1d0" opacity={0.25 + 0.75 * L} />
          <path d={`M -22 0 Q 0 ${-14 * ouv - 3} 22 2`} stroke="#0a0604" strokeWidth={5.5} fill="none" />
        </g>
        <path
          d={`M 92 ${-128 - brow * 16} Q 125 ${-142 - brow * 22} 158 ${-130 - brow * 14}`}
          stroke="#0a0604"
          strokeWidth={8}
          strokeLinecap="round"
          fill="none"
        />
        {!homme ? (
          <g stroke="#0d0806" fill="none" strokeLinecap="round">
            <path d="M 150 -250 C 110 -230 80 -200 40 -150" strokeWidth={22} />
            <path d="M 140 -255 C 100 -240 60 -215 20 -180" strokeWidth={14} opacity={0.8} />
          </g>
        ) : null}
        <path d={homme ? COIFFE : VOILE} fill={homme ? "#4a4036" : voile} />
        <path d={homme ? COIFFE : VOILE} fill="#03050a" opacity={0.74} />
        <path d={homme ? COIFFE : VOILE} fill={`url(#${id}-lum)`} opacity={L * 0.7} />
        <path d={homme ? COIFFE : VOILE} fill={`url(#${id}-lune)`} />
        <g clipPath={`url(#${id}-clipv)`} fill="none">
          {/* Plis du voile */}
          {[0, 1, 2, 3].map((k) => (
            <path
              key={k}
              d={`M ${120 - k * 70} -330 C ${40 - k * 80} -150 ${10 - k * 60} 150 ${-40 - k * 70} 720`}
              stroke="#000"
              strokeWidth={26}
              opacity={0.3}
              filter="url(#flou-14)"
            />
          ))}
          {[0, 1].map((k) => (
            <path
              key={`h${k}`}
              d={`M ${90 - k * 90} -340 C ${10 - k * 90} -160 ${-20 - k * 70} 160 ${-70 - k * 80} 720`}
              stroke="#fff"
              strokeWidth={10}
              opacity={0.07 + 0.06 * L}
              filter="url(#flou-6)"
            />
          ))}
        </g>
      </g>
    </Stage>
  );
};
