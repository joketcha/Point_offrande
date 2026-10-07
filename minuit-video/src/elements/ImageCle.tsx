import React from "react";
import { AbsoluteFill, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { getStaticFiles } from "@remotion/studio";
import type { ImageCle } from "../lib/imagesCles";
import { clamp, lent } from "../lib/util";

export const trouverImage = (id: string) => {
  const fichiers = getStaticFiles();
  for (const ext of ["jpg", "jpeg", "png", "webp"]) {
    const f = fichiers.find((s) => s.name === `images/${id}.${ext}`);
    if (f) return f.name;
  }
  return null;
};

const MOUVEMENTS = {
  avant: { s: [1.04, 1.16], x: [0, 0], y: [0, 0] },
  arriere: { s: [1.16, 1.04], x: [0, 0], y: [0, 0] },
  gauche: { s: [1.12, 1.12], x: [3, -3], y: [0, 0] },
  droite: { s: [1.12, 1.12], x: [-3, 3], y: [0, 0] },
  haut: { s: [1.12, 1.12], x: [0, 0], y: [3, -3] },
} as const;

/** durée du fondu enchaîné en secondes */
export const FONDU = 1.4;

// Une image clé : lent mouvement de caméra, fondu enchaîné avec surimpression
// (l'image entrante apparaît d'abord en double exposition, agrandie et lumineuse).
export const ImageCleVue: React.FC<{
  readonly image: ImageCle;
  readonly fichier: string;
  /** "cover" remplit le cadre ; "contain" garde l'image entière sur fond flou */
  readonly ajustement?: "cover" | "contain";
  readonly premiere?: boolean;
}> = ({ image, fichier, ajustement = "cover", premiere = false }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const dureeTotale = (image.fin - image.debut + FONDU) * fps;
  const m = MOUVEMENTS[image.mouvement];
  const t = (a: readonly [number, number]) => interpolate(frame, [0, dureeTotale], [a[0], a[1]], { ...clamp, easing: lent });
  const entree = premiere ? 1 : interpolate(frame, [0, FONDU * fps], [0, 1], clamp);
  const fantome = premiere ? 0 : interpolate(frame, [0, FONDU * fps * 0.5, FONDU * fps], [0, 0.45, 0], clamp);
  const src = staticFile(fichier);
  const style: React.CSSProperties = {
    position: "absolute",
    width: "100%",
    height: "100%",
    objectFit: ajustement,
    scale: t(m.s),
    translate: `${t(m.x)}% ${t(m.y)}%`,
  };
  return (
    <AbsoluteFill style={{ opacity: entree }}>
      {ajustement === "contain" ? (
        <Img src={src} style={{ ...style, objectFit: "cover", filter: "blur(40px) brightness(0.45)", scale: 1.2 }} />
      ) : null}
      <Img src={src} style={style} />
      {fantome > 0 ? (
        <Img src={src} style={{ ...style, scale: t(m.s) * 1.35, opacity: fantome, mixBlendMode: "screen", filter: "blur(2px)" }} />
      ) : null}
    </AbsoluteFill>
  );
};
