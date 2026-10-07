import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import { staticFile } from "remotion";
import { loadFont } from "@remotion/fonts";
import { clamp } from "../lib/util";

// Polices embarquées dans public/fonts (aucun accès réseau requis au rendu).
const cormorant = "Cormorant Garamond";
const cinzel = "Cinzel";
loadFont({ family: cormorant, url: staticFile("fonts/CormorantGaramond-MediumItalic.woff2"), style: "italic", weight: "500" });
loadFont({ family: cinzel, url: staticFile("fonts/Cinzel-Regular.woff2"), weight: "400" });

// Sous-titre au bas de l'image, au-dessus des bandes cinéma.
export const Subtitle: React.FC<{
  readonly children: string;
  readonly from: number;
  readonly to: number;
  /** marge basse en pixels (plus haute en vertical, au-dessus de l'interface du reel) */
  readonly bas?: number;
  readonly taille?: number;
}> = ({ children, from, to, bas = 175, taille = 58 }) => {
  const frame = useCurrentFrame();
  const opacity = Math.min(
    interpolate(frame, [from, from + 8], [0, 1], clamp),
    interpolate(frame, [to - 8, to], [1, 0], clamp),
  );
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center", paddingBottom: bas, paddingLeft: 60, paddingRight: 60, opacity }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: taille * 0.25 }}>
        <div style={{ width: interpolate(frame, [from, from + 20], [0, taille * 2.2], clamp), height: 1.5, background: "linear-gradient(90deg, rgba(212,175,95,0), #d4af5f, rgba(212,175,95,0))" }} />
        <div
          style={{
            fontFamily: cormorant,
            fontStyle: "italic",
            fontSize: taille,
            letterSpacing: 0.5,
            textAlign: "center",
            maxWidth: 1500,
            ...OR,
            filter: "drop-shadow(0 2px 14px rgba(0,0,0,0.95))",
          }}
        >
          {children}
        </div>
      </div>
    </AbsoluteFill>
  );
};

// Dégradé or brossé appliqué au texte.
export const OR: React.CSSProperties = {
  backgroundImage: "linear-gradient(180deg, #fff3d0 0%, #e9cf8f 38%, #b88a3a 62%, #f1dca2 100%)",
  WebkitBackgroundClip: "text",
  backgroundClip: "text",
  color: "transparent",
};

export const POLICES = { cormorant, cinzel };

export const TitreFinal: React.FC<{ readonly children: string; readonly opacity: number; readonly taille?: number }> = ({ children, opacity, taille = 110 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity }}>
      <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: taille * 0.3 }}>
        <div style={{ fontFamily: cinzel, fontSize: taille, letterSpacing: taille * 0.16, paddingLeft: taille * 0.16, ...OR, filter: "drop-shadow(0 0 30px rgba(255,180,90,0.35))" }}>
          {children}
        </div>
        <Filet largeur={taille * 4} frame={frame} />
        <div style={{ fontFamily: cormorant, fontStyle: "italic", fontSize: taille * 0.36, letterSpacing: 2, ...OR }}>Matthieu 25 : 13</div>
      </div>
    </AbsoluteFill>
  );
};

// Filet doré avec losange central.
export const Filet: React.FC<{ readonly largeur: number; readonly frame: number }> = ({ largeur }) => (
  <div style={{ display: "flex", alignItems: "center", gap: 14, width: largeur }}>
    <div style={{ flex: 1, height: 1.5, background: "linear-gradient(90deg, rgba(212,175,95,0), #d4af5f)" }} />
    <div style={{ width: 9, height: 9, rotate: "45deg", background: "#e9cf8f", boxShadow: "0 0 12px rgba(255,200,120,0.8)" }} />
    <div style={{ flex: 1, height: 1.5, background: "linear-gradient(90deg, #d4af5f, rgba(212,175,95,0))" }} />
  </div>
);
