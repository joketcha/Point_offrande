import React from "react";
import { useCurrentFrame } from "remotion";
import { bruit, mix } from "../lib/util";
import { Figure } from "./Figure";

// Le veilleur sur la hauteur. cry : 0 regarde l'horizon → 1 main à la bouche, crie.
export const Watchman: React.FC<{
  readonly x: number;
  readonly y: number;
  readonly scale?: number;
  readonly cry?: number;
}> = ({ x, y, scale = 1, cry = 0 }) => {
  const frame = useCurrentFrame();
  const tremble = cry > 0.6 ? bruit("cri", frame, 0.9) * 1.5 : 0;
  return (
    <Figure
      x={x}
      y={y + tremble}
      scale={scale * 1.05}
      seed="veilleur"
      robe="#2a2018"
      manteau="#4a3a2a"
      peau="#5a3a28"
      coiffe="turban"
      barbe
      objet="aucun"
      head={mix(0, -12, cry)}
      cry={cry}
      wind={1.2}
    />
  );
};

// Porteur de torche de la procession.
export const TorchBearer: React.FC<{
  readonly x: number;
  readonly y: number;
  readonly scale?: number;
  readonly seed: string;
  readonly walk?: boolean;
  readonly facing?: 1 | -1;
}> = ({ x, y, scale = 1, seed, walk = true, facing = 1 }) => (
  <Figure
    x={x}
    y={y}
    scale={scale}
    facing={facing}
    seed={seed}
    robe="#3a2c1e"
    manteau="#6a5a44"
    peau="#5e3c2a"
    coiffe="turban"
    barbe={seed.length % 2 === 0}
    objet="torche"
    walk={walk}
  />
);

// L'époux : robe de lin clair, manteau pourpre, couronne de feuillage doré.
export const Bridegroom: React.FC<{
  readonly x: number;
  readonly y: number;
  readonly scale?: number;
  readonly glow?: number;
  readonly walk?: boolean;
  readonly facing?: 1 | -1;
}> = ({ x, y, scale = 1, glow = 1, walk = true, facing = 1 }) => (
  <g>
    <ellipse cx={x} cy={y - 160 * scale} rx={170 * scale} ry={240 * scale} fill="url(#halo-torche)" opacity={0.55 * glow} />
    <Figure
      x={x}
      y={y}
      scale={scale * 1.08}
      facing={facing}
      seed="epoux"
      robe="#d8c6a0"
      manteau="#8a2a22"
      peau="#5e3c2a"
      coiffe="turban"
      barbe
      couronne
      objet="aucun"
      walk={walk}
      chaud={0.8 * glow}
      eclat={glow}
    />
  </g>
);

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
