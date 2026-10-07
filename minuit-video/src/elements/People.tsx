import React from "react";
import { useCurrentFrame } from "remotion";
import { bruit, mix } from "../lib/util";
import { Flame } from "./Flame";

// Le veilleur sur la hauteur. cry : 0 regarde l'horizon → 1 main à la bouche, crie.
export const Watchman: React.FC<{
  readonly x: number;
  readonly y: number;
  readonly scale?: number;
  readonly cry?: number;
}> = ({ x, y, scale = 1, cry = 0 }) => {
  const frame = useCurrentFrame();
  const vent = bruit("veilleur", frame, 0.06) * 8;
  const tremble = cry > 0.6 ? bruit("cri", frame, 0.9) * 1.5 : 0;
  return (
    <g transform={`translate(${x} ${y + tremble}) scale(${scale})`}>
      <path d={`M -34 -210 C -50 -150 ${-62 - vent} -60 ${-70 - vent} 0 L 58 0 C 52 -60 44 -150 32 -210 Z`} fill="#05070c" />
      <path d={`M -30 -205 C -56 -150 ${-90 - vent * 2} -80 ${-96 - vent * 2} -20 L -50 -30 Z`} fill="#070a12" />
      <g transform={`rotate(${mix(0, -14, cry)} 0 -215)`}>
        <circle cx={6} cy={-236} r={21} fill="#05070c" />
        <path d={`M -24 -248 C -10 -275 28 -270 32 -246 L 36 -226 C 10 -224 -20 -210 ${-40 - vent} -180 Z`} fill="#0a0d16" />
      </g>
      <path
        d={`M 14 -196 Q ${mix(40, 46, cry)} ${mix(-140, -200, cry)} ${mix(36, 34, cry)} ${mix(-110, -232, cry)}`}
        stroke="#05070c"
        strokeWidth={14}
        strokeLinecap="round"
        fill="none"
      />
      <path d="M -60 -212 C -20 -222 20 -222 40 -205" stroke="#7d93c4" strokeOpacity={0.25} strokeWidth={3} fill="none" />
    </g>
  );
};

// Porteur de torche de la procession.
export const TorchBearer: React.FC<{
  readonly x: number;
  readonly y: number;
  readonly scale?: number;
  readonly seed: string;
  readonly walk?: boolean;
}> = ({ x, y, scale = 1, seed, walk = true }) => {
  const frame = useCurrentFrame();
  const pas = walk ? Math.sin(frame * 0.18 + seed.length) : 0;
  return (
    <g transform={`translate(${x} ${y + Math.abs(pas) * -3}) scale(${scale})`}>
      <path d={`M -30 -205 C -42 -150 ${-52 - pas * 8} -60 ${-56 - pas * 10} 0 L ${52 + pas * 10} 0 C 48 -60 40 -150 30 -205 Z`} fill="#140c08" />
      <path d={`M -30 -205 C -42 -150 -52 -60 -56 0 L 52 0 C 48 -60 40 -150 30 -205 Z`} fill="url(#halo-torche)" opacity={0.6} />
      <circle cx={2} cy={-228} r={20} fill="#1a100a" />
      <path d="M -22 -248 C -6 -266 22 -262 26 -240 L 30 -222 C 4 -218 -20 -205 -36 -180 Z" fill="#3b2a1c" />
      <path d="M 18 -195 L 40 -275" stroke="#140c08" strokeWidth={13} strokeLinecap="round" />
      <path d="M 42 -265 L 52 -340" stroke="#3a2414" strokeWidth={8} strokeLinecap="round" />
      <Flame x={53} y={-338} size={16} intensity={1} seed={seed} torch />
    </g>
  );
};

// L'époux : robe de lin clair, couronne, lumineux. N'apparaît qu'avec sa procession.
export const Bridegroom: React.FC<{
  readonly x: number;
  readonly y: number;
  readonly scale?: number;
  readonly glow?: number;
}> = ({ x, y, scale = 1, glow = 1 }) => {
  const frame = useCurrentFrame();
  const pas = Math.sin(frame * 0.15);
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx={0} cy={-150} rx={160} ry={230} fill="url(#halo-torche)" opacity={0.55 * glow} />
      <path d={`M -34 -222 C -48 -160 ${-60 - pas * 6} -60 ${-66 - pas * 8} 0 L ${62 + pas * 8} 0 C 56 -60 46 -160 34 -222 Z`} fill="#cbb48a" />
      <path d="M -34 -222 C -48 -160 -60 -60 -66 0 L -10 0 C -14 -80 -20 -160 -18 -222 Z" fill="#5a4630" opacity={0.6} />
      <path d="M 30 -215 C 60 -150 64 -60 70 0 L 40 0 C 30 -80 20 -160 22 -215 Z" fill="#8a2f22" opacity={0.85} />
      <circle cx={2} cy={-246} r={21} fill="#3a2516" />
      <path d="M -22 -264 C -6 -286 26 -282 30 -258 L 32 -236 C 6 -230 -20 -220 -40 -190 Z" fill="#eadcbc" />
      <path d="M -16 -266 L -10 -280 L -2 -268 L 6 -284 L 14 -268 L 22 -280 L 26 -264 Z" fill="#e8b94a" />
      <path d="M -34 -222 C -48 -160 -60 -60 -66 0 L 62 0 C 56 -60 46 -160 34 -222 Z" fill="#ffd79a" opacity={0.25 * glow} />
    </g>
  );
};

// Ville éclairée sur la colline (n'apparaît qu'à l'arrivée de l'époux).
export const City: React.FC<{
  readonly x: number;
  readonly y: number;
  readonly scale?: number;
  readonly light?: number;
}> = ({ x, y, scale = 1, light = 1 }) => {
  const frame = useCurrentFrame();
  const maisons = [
    [-420, 70, 60], [-350, 90, 80], [-250, 110, 70], [-160, 80, 110], [-60, 130, 150],
    [70, 100, 120], [170, 120, 90], [280, 90, 70], [360, 80, 60], [430, 60, 50],
  ];
  return (
    <g transform={`translate(${x} ${y}) scale(${scale})`}>
      <ellipse cx={0} cy={-120} rx={600} ry={180} fill="#ff9d4a" opacity={0.22 * light} filter="url(#flou-30)" />
      <path d="M -520 0 L -520 -60 L 520 -60 L 520 0 Z" fill="#0b0f1a" />
      {new Array(26).fill(0).map((_, i) => (
        <rect key={i} x={-520 + i * 40} y={-74} width={22} height={16} fill="#0b0f1a" />
      ))}
      {maisons.map(([mx, w, h], i) => (
        <g key={i}>
          <rect x={mx} y={-60 - h} width={w} height={h} fill="#0d1220" />
          <rect x={mx + w * 0.25} y={-60 - h * 0.6} width={7} height={11} fill="#ffc06a" opacity={light * (0.7 + 0.3 * bruit("f" + i, frame, 0.1))} />
          <rect x={mx + w * 0.62} y={-60 - h * 0.35} width={7} height={11} fill="#ffb050" opacity={light * 0.8} />
        </g>
      ))}
      <rect x={-30} y={-290} width={70} height={230} fill="#0e1322" />
      <rect x={-6} y={-250} width={9} height={16} fill="#ffc06a" opacity={light} />
    </g>
  );
};
