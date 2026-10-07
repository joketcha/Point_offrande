import React from "react";
import { AbsoluteFill, Sequence, getRemotionEnvironment, useCurrentFrame, useVideoConfig } from "remotion";
import { Cinema } from "./elements/Cinema";
import { Etalonnage, FuitesDeLumiere, Poussieres, TitreOuverture } from "./elements/Luxe";
import { CoucheImagesCles, Dialogues, FilmDessine, Final, Musique, imagesClesManquantes } from "./Minuit";
import { IMAGES_CLES } from "./lib/imagesCles";

export type ReelProps = {
  readonly musique: string;
};

// Version verticale 9:16 (Reels, TikTok, Shorts) : images clés réalistes en plein cadre,
// mouvements lents et fondus enchaînés en surimpression.
export const Reel: React.FC<ReelProps> = ({ musique }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const seconde = frame / fps;
  const manque = imagesClesManquantes(seconde);
  const actuelle = IMAGES_CLES.find((i) => seconde >= i.debut && seconde < i.fin);
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {manque ? (
        // Tant qu'une image manque : le film dessiné, centré.
        <AbsoluteFill style={{ justifyContent: "center", alignItems: "center" }}>
          <div style={{ width: 1920, height: 1080, flexShrink: 0, position: "relative", overflow: "hidden", scale: 1080 / 1920 }}>
            <Sequence width={1920} height={1080} name="Film dessiné (secours)">
              <FilmDessine />
            </Sequence>
          </div>
        </AbsoluteFill>
      ) : null}
      {manque && actuelle && getRemotionEnvironment().isStudio ? (
        <AbsoluteFill style={{ alignItems: "center", paddingTop: 260 }}>
          <div style={{ color: "#f1dcae", fontFamily: "sans-serif", fontSize: 34, textAlign: "center", opacity: 0.8 }}>
            Image {actuelle.id} à générer
            <br />
            <span style={{ fontSize: 28, opacity: 0.8 }}>{actuelle.titre}</span>
          </div>
        </AbsoluteFill>
      ) : null}
      <Etalonnage>
        <CoucheImagesCles ajustement="cover" />
      </Etalonnage>
      <FuitesDeLumiere />
      <Poussieres />
      <TitreOuverture echelle={0.8} haut={420} />
      <Dialogues bas={520} taille={60} />
      <Final taille={84} />
      <Cinema bandes={false} />
      <Musique musique={musique} />
    </AbsoluteFill>
  );
};
