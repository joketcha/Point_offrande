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
      <div
        style={{
          fontFamily: cormorant,
          fontStyle: "italic",
          fontSize: taille,
          color: "#f4e7c9",
          textAlign: "center",
          maxWidth: 1500,
          textShadow: "0 2px 18px rgba(0,0,0,0.9)",
        }}
      >
        {children}
      </div>
    </AbsoluteFill>
  );
};

export const TitreFinal: React.FC<{ readonly children: string; readonly opacity: number; readonly taille?: number }> = ({ children, opacity, taille = 110 }) => (
  <AbsoluteFill style={{ justifyContent: "center", alignItems: "center", opacity }}>
    <div style={{ fontFamily: cinzel, fontSize: taille, letterSpacing: taille * 0.16, color: "#f1dcae", textShadow: "0 0 40px rgba(255,170,80,0.35)" }}>
      {children}
    </div>
  </AbsoluteFill>
);
