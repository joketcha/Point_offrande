import React from "react";
import { useCurrentFrame } from "remotion";
import { bruit } from "../lib/util";

type FlameProps = {
  readonly x: number;
  readonly y: number;
  readonly size?: number;
  /** 0 = éteinte, 1 = pleine flamme */
  readonly intensity?: number;
  readonly seed: string;
  /** 0..1 progression de la fumée après extinction */
  readonly smoke?: number;
  readonly halo?: boolean;
  readonly torch?: boolean;
};

export const Flame: React.FC<FlameProps> = ({
  x,
  y,
  size = 10,
  intensity = 1,
  seed,
  smoke = 0,
  halo = true,
  torch = false,
}) => {
  const frame = useCurrentFrame();
  const n1 = bruit(seed, frame, 0.18);
  const n2 = bruit(seed + "-b", frame, 0.31, 1);
  const vacille = Math.max(0, intensity) * (0.88 + 0.12 * n1);
  const h = size * (torch ? 3.4 : 2.6) * (0.85 + 0.15 * n1) * (0.3 + 0.7 * intensity);
  const w = size * (0.9 + 0.1 * n2) * (0.45 + 0.55 * intensity);
  const sway = n2 * size * 0.4;
  const flamme = (k: number) =>
    `M ${sway * k} ${-h * k} C ${w * 0.7 * k} ${-h * 0.5 * k}, ${w * k} ${-h * 0.12 * k}, 0 0 C ${-w * k} ${-h * 0.12 * k}, ${-w * 0.7 * k} ${-h * 0.5 * k}, ${sway * k} ${-h * k} Z`;

  return (
    <g transform={`translate(${x} ${y})`}>
      {halo && intensity > 0.01 ? (
        <circle
          r={size * (torch ? 14 : 9) * (0.4 + 0.6 * intensity)}
          cy={-h * 0.4}
          fill={torch ? "url(#halo-torche)" : "url(#halo-flamme)"}
          opacity={0.6 * vacille + 0.1}
        />
      ) : null}
      {halo && intensity > 0.05 ? (
        // Reflet anamorphique horizontal (objectif cinéma)
        <g opacity={(0.35 + 0.25 * n1) * intensity}>
          <ellipse cx={0} cy={-h * 0.35} rx={size * (torch ? 22 : 16)} ry={size * 0.22} fill="#ffcf8f" filter="url(#flou-2)" />
          <ellipse cx={0} cy={-h * 0.35} rx={size * (torch ? 9 : 7)} ry={size * 0.08} fill="#fff4dc" />
        </g>
      ) : null}
      {intensity > 0.02 ? (
        <g opacity={Math.min(1, intensity * 1.8)}>
          <path d={flamme(1)} fill="#ff7a1f" opacity={0.85} filter="url(#flou-2)" />
          <path d={flamme(0.78)} fill="#ffb640" />
          <path d={flamme(0.5)} fill="#ffe7a6" />
          <ellipse cx={0} cy={-w * 0.25} rx={w * 0.35} ry={w * 0.25} fill="#fff8e4" />
          <ellipse cx={0} cy={-w * 0.05} rx={w * 0.3} ry={w * 0.16} fill="#5b7bff" opacity={0.35} />
        </g>
      ) : (
        <circle r={size * 0.18} fill="#ff6a1a" opacity={smoke > 0 ? Math.max(0, 0.8 - smoke * 2) : 0} />
      )}
      {smoke > 0 && smoke < 1
        ? [0, 1, 2, 3].map((i) => {
            const t = Math.min(1, Math.max(0, smoke * 1.3 - i * 0.1));
            return (
              <circle
                key={i}
                cx={bruit(seed + "-f" + i, frame, 0.05) * size * 2 + i * size * 0.3}
                cy={-t * size * 14 - i * size * 1.5}
                r={size * (0.5 + t * 2.2)}
                fill="#9aa1ad"
                opacity={(1 - t) * 0.28}
                filter="url(#flou-6)"
              />
            );
          })
        : null}
    </g>
  );
};
