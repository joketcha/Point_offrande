import React from "react";
import { AbsoluteFill, Series, interpolate, staticFile, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { Cinema } from "./elements/Cinema";
import { S01Attente } from "./scenes/S01Attente";
import { S02Sommeil } from "./scenes/S02Sommeil";
import { S03Cri } from "./scenes/S03Cri";
import { S04Reveil } from "./scenes/S04Reveil";
import { S05HuileManque } from "./scenes/S05HuileManque";
import { S06Extinction } from "./scenes/S06Extinction";
import { S07Epoux } from "./scenes/S07Epoux";
import { S08Porte } from "./scenes/S08Porte";
import { S09TropTard } from "./scenes/S09TropTard";
import { S10DernierPlan } from "./scenes/S10DernierPlan";

export type Plans = {
  readonly attente: string;
  readonly sommeil: string;
  readonly cri: string;
  readonly reveil: string;
  readonly huile: string;
  readonly extinction: string;
  readonly epoux: string;
  readonly porte: string;
  readonly tropTard: string;
  readonly dernierPlan: string;
};

export type MinuitProps = {
  /** Fichier de musique dans public/ (laisser vide pour aucune musique) */
  readonly musique: string;
  /** Plans filmés/générés optionnels (fichiers dans public/) remplaçant chaque scène */
  readonly plans: Plans;
};

// AU MILIEU DE LA NUIT, À MINUIT — 2 min 59 s (Matthieu 25:1-13)
export const Minuit: React.FC<MinuitProps> = ({ musique, plans }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Series>
        <Series.Sequence name="00:00 L'attente" durationInFrames={15 * fps} premountFor={fps}>
          <S01Attente footage={plans.attente} />
        </Series.Sequence>
        <Series.Sequence name="00:15 Le sommeil" durationInFrames={20 * fps} premountFor={fps}>
          <S02Sommeil footage={plans.sommeil} />
        </Series.Sequence>
        <Series.Sequence name="00:35 Le cri" durationInFrames={20 * fps} premountFor={fps}>
          <S03Cri footage={plans.cri} />
        </Series.Sequence>
        <Series.Sequence name="00:55 Réveillez-vous !" durationInFrames={25 * fps} premountFor={fps}>
          <S04Reveil footage={plans.reveil} />
        </Series.Sequence>
        <Series.Sequence name="01:20 L'huile manque" durationInFrames={25 * fps} premountFor={fps}>
          <S05HuileManque footage={plans.huile} />
        </Series.Sequence>
        <Series.Sequence name="01:45 Les cinq lampes s'éteignent" durationInFrames={25 * fps} premountFor={fps}>
          <S06Extinction footage={plans.extinction} />
        </Series.Sequence>
        <Series.Sequence name="02:10 L'époux arrive" durationInFrames={20 * fps} premountFor={fps}>
          <S07Epoux footage={plans.epoux} />
        </Series.Sequence>
        <Series.Sequence name="02:30 La porte" durationInFrames={15 * fps} premountFor={fps}>
          <S08Porte footage={plans.porte} />
        </Series.Sequence>
        <Series.Sequence name="02:45 Trop tard" durationInFrames={10 * fps} premountFor={fps}>
          <S09TropTard footage={plans.tropTard} />
        </Series.Sequence>
        <Series.Sequence name="02:55 Le dernier plan" durationInFrames={4 * fps} premountFor={fps}>
          <S10DernierPlan footage={plans.dernierPlan} />
        </Series.Sequence>
      </Series>
      <Cinema />
      {musique ? (
        <Audio
          src={staticFile(musique)}
          volume={(f) =>
            interpolate(f, [0, 2 * fps, 175 * fps, 179 * fps], [0, 1, 1, 0], {
              extrapolateLeft: "clamp",
              extrapolateRight: "clamp",
            })
          }
        />
      ) : null}
    </AbsoluteFill>
  );
};
