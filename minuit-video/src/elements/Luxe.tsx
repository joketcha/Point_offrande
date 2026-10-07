import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { clamp, sortie } from "../lib/util";
import { Filet, OR, POLICES } from "./Text";

// Générique d'ouverture doré, posé sur le plan très large.
export const TitreOuverture: React.FC<{ readonly echelle?: number; readonly haut?: number }> = ({ echelle = 1, haut = 175 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const [a, b, c, d] = [0.8 * fps, 2 * fps, 4.5 * fps, 5.7 * fps];
  const opacity = Math.min(interpolate(frame, [a, b], [0, 1], clamp), interpolate(frame, [c, d], [1, 0], clamp));
  if (frame > d) return null;
  const k = echelle;
  return (
    <AbsoluteFill style={{ justifyContent: "flex-start", alignItems: "center", paddingTop: haut, opacity }}>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 30%, rgba(0,0,0,0.5), rgba(0,0,0,0) 55%)" }} />
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 22 * k }}>
        <div style={{ fontFamily: POLICES.cinzel, fontSize: 22 * k, letterSpacing: 12 * k, paddingLeft: 12 * k, ...OR, opacity: 0.85 }}>
          UN COURT-MÉTRAGE BIBLIQUE
        </div>
        <div
          style={{
            fontFamily: POLICES.cinzel,
            fontSize: 92 * k,
            textAlign: "center",
            lineHeight: 1.1,
            letterSpacing: interpolate(frame, [a, d], [10 * k, 22 * k], { ...clamp, easing: sortie }),
            ...OR,
            filter: `blur(${interpolate(frame, [a, b], [8, 0], clamp)}px) drop-shadow(0 0 30px rgba(255,180,90,0.35))`,
          }}
        >
          AU MILIEU
          <br />
          DE LA NUIT
        </div>
        <Filet largeur={420 * k} frame={frame} />
        <div style={{ fontFamily: POLICES.cormorant, fontStyle: "italic", fontSize: 46 * k, letterSpacing: 3, ...OR }}>à minuit</div>
      </div>
    </AbsoluteFill>
  );
};

const PARTICULES = new Array(46).fill(0).map((_, i) => ({
  x: random(`p-x-${i}`),
  y: random(`p-y-${i}`),
  r: 1.2 + random(`p-r-${i}`) * 3.2,
  v: 0.15 + random(`p-v-${i}`) * 0.5,
  p: random(`p-p-${i}`) * Math.PI * 2,
  flou: random(`p-f-${i}`) > 0.6,
}));

// Poussières dorées en suspension dans la lumière.
export const Poussieres: React.FC = () => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      <svg width={width} height={height}>
        <defs>
          <filter id="poussiere-flou">
            <feGaussianBlur stdDeviation={2.5} />
          </filter>
        </defs>
        {PARTICULES.map((p, i) => {
          const y = (((p.y * height - frame * p.v) % height) + height) % height;
          const x = p.x * width + Math.sin(frame * 0.02 + p.p) * 30;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r={p.flou ? p.r * 2.4 : p.r}
              fill="#ffd9a0"
              opacity={(0.18 + 0.22 * (0.5 + 0.5 * Math.sin(frame * 0.05 + p.p))) * (p.flou ? 0.6 : 1)}
              filter={p.flou ? "url(#poussiere-flou)" : undefined}
            />
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

// Fuite de lumière chaude aux grands moments (secondes).
const FUITES = [55, 130, 141, 150];

export const FuitesDeLumiere: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <>
      {FUITES.map((s) => {
        const t = (frame - s * fps) / (1.6 * fps);
        if (t < -0.1 || t > 1.1) return null;
        const o = interpolate(t, [0, 0.35, 1], [0, 0.55, 0], clamp);
        return (
          <AbsoluteFill
            key={s}
            style={{
              mixBlendMode: "screen",
              opacity: o,
              background: `radial-gradient(ellipse 60% 80% at ${interpolate(t, [0, 1], [-10, 110])}% 40%, rgba(255,170,80,0.9), rgba(255,120,40,0.3) 40%, rgba(0,0,0,0) 70%)`,
            }}
          />
        );
      })}
    </>
  );
};

// Étalonnage cinéma : contraste, densité des noirs, ombres froides et hautes lumières chaudes.
export const Etalonnage: React.FC<{ readonly children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill>
    <AbsoluteFill style={{ filter: "contrast(1.12) saturate(1.12) brightness(1.03)" }}>{children}</AbsoluteFill>
    <AbsoluteFill style={{ backgroundColor: "#ffb15a", mixBlendMode: "soft-light", opacity: 0.08 }} />
    <AbsoluteFill style={{ background: "linear-gradient(180deg, rgba(6,14,34,0.25), rgba(0,0,0,0) 40%, rgba(0,0,0,0) 70%, rgba(6,10,24,0.3))" }} />
  </AbsoluteFill>
);
