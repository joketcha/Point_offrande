import React from "react";
import { random, useCurrentFrame } from "remotion";
import { noise2D } from "@remotion/noise";
import { bruit } from "../lib/util";

// Ligne de crête générée par bruit, fermée vers le bas.
const crete = (seed: string, baseY: number, amp: number, freq: number) => {
  let d = "";
  for (let x = -600; x <= 2520; x += 30) {
    const y =
      baseY +
      noise2D(seed, x * freq, 0) * amp +
      noise2D(seed + "-fin", x * freq * 4, 0) * amp * 0.18;
    d += `${x === -600 ? "M" : "L"} ${x} ${y.toFixed(1)} `;
  }
  return d + "L 2520 2200 L -600 2200 Z";
};

export const OliveTree: React.FC<{
  readonly x: number;
  readonly y: number;
  readonly s?: number;
  readonly seed: string;
  readonly color?: string;
}> = ({ x, y, s = 1, seed, color = "#04080f" }) => {
  const frame = useCurrentFrame();
  const vent = bruit(seed, frame, 0.03) * 1.6;
  const touffes = new Array(9).fill(0).map((_, i) => ({
    cx: (random(`${seed}-tx-${i}`) - 0.5) * 150,
    cy: -95 - random(`${seed}-ty-${i}`) * 70,
    rx: 32 + random(`${seed}-tr-${i}`) * 34,
    ry: 18 + random(`${seed}-tq-${i}`) * 16,
  }));
  return (
    <g transform={`translate(${x} ${y}) scale(${s})`}>
      <path
        d="M -9 0 C -16 -30 6 -48 -8 -70 C -14 -82 -4 -96 -2 -104 L 6 -104 C 6 -90 14 -80 8 -66 C 0 -46 18 -26 12 0 Z"
        fill={color}
      />
      <g transform={`rotate(${vent} 0 -60)`}>
        {touffes.map((t, i) => (
          <ellipse key={`l${i}`} cx={t.cx - 4} cy={t.cy - 5} rx={t.rx} ry={t.ry} fill="#4b5f86" opacity={0.28} />
        ))}
        {touffes.map((t, i) => (
          <ellipse key={`d${i}`} cx={t.cx} cy={t.cy} rx={t.rx} ry={t.ry} fill={color} />
        ))}
      </g>
    </g>
  );
};

const CHEMIN = [
  [975, 1400],
  [1000, 1080],
  [1040, 880],
  [985, 760],
  [960, 680],
  [1030, 610],
  [1060, 575],
] as const;

const pointChemin = (t: number) => {
  const seg = Math.min(CHEMIN.length - 2, Math.floor(t * (CHEMIN.length - 1)));
  const k = t * (CHEMIN.length - 1) - seg;
  const [x1, y1] = CHEMIN[seg];
  const [x2, y2] = CHEMIN[seg + 1];
  return [x1 + (x2 - x1) * k, y1 + (y2 - y1) * k] as const;
};

const PIERRES = new Array(140).fill(0).map((_, i) => {
  const t = random(`pierre-t-${i}`);
  const [cx, cy] = pointChemin(t);
  const largeur = Math.max(8, (cy - 560) * 0.32);
  return {
    x: cx + (random(`pierre-x-${i}`) - 0.5) * largeur * 1.6,
    y: cy + (random(`pierre-y-${i}`) - 0.5) * 6,
    r: Math.max(1.5, largeur * 0.06 * (0.6 + random(`pierre-r-${i}`))),
  };
});

type LandscapeProps = {
  /** Décalage vertical de tout le paysage (panoramique) */
  readonly offsetY?: number;
  readonly path?: boolean;
  readonly trees?: boolean;
  /** Lueur lointaine derrière les collines (0..1) */
  readonly lueur?: number;
  readonly lueurX?: number;
};

// Collines d'Israël, oliviers, ancien chemin de pierre. Aucune maison.
export const Landscape: React.FC<LandscapeProps> = ({
  offsetY = 0,
  path = true,
  trees = true,
  lueur = 0,
  lueurX = 1500,
}) => {
  return (
    <g transform={`translate(0 ${offsetY})`}>
      {lueur > 0 ? (
        <ellipse cx={lueurX} cy={575} rx={260 * lueur + 40} ry={70 * lueur + 10} fill="#ffb15a" opacity={0.35 * lueur} filter="url(#flou-30)" />
      ) : null}
      <path d={crete("lointain", 585, 60, 0.0016)} fill="#0e1b35" />
      <path d={crete("moyen", 650, 70, 0.0021)} fill="#0a1428" />
      {trees ? (
        <>
          <OliveTree x={220} y={668} s={0.35} seed="o1" color="#0a1428" />
          <OliveTree x={420} y={660} s={0.3} seed="o2" color="#0a1428" />
          <OliveTree x={1540} y={655} s={0.32} seed="o3" color="#0a1428" />
          <OliveTree x={1720} y={664} s={0.36} seed="o4" color="#0a1428" />
        </>
      ) : null}
      <path d={crete("proche", 760, 40, 0.0013)} fill="#060c19" />
      {path ? (
        <g>
          <path
            d="M 720 1400 C 860 1100 1080 930 990 770 C 930 690 940 640 1050 572 L 1066 578 C 990 640 990 690 1030 770 C 1140 960 1060 1120 1240 1400 Z"
            fill="#1a2335"
            opacity={0.9}
          />
          {PIERRES.map((p, i) => (
            <ellipse key={i} cx={p.x} cy={p.y} rx={p.r * 1.6} ry={p.r} fill="#33405a" opacity={0.7} />
          ))}
        </g>
      ) : null}
      {trees ? (
        <>
          <OliveTree x={150} y={900} s={1.5} seed="o5" />
          <OliveTree x={430} y={800} s={0.9} seed="o6" />
          <OliveTree x={1480} y={820} s={1.0} seed="o7" />
          <OliveTree x={1790} y={930} s={1.7} seed="o8" />
        </>
      ) : null}
    </g>
  );
};
