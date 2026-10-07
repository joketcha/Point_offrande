import React from "react";
import { AbsoluteFill, Sequence, Series, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { Cinema } from "./elements/Cinema";
import { PlanIA } from "./elements/PlanIA";
import { Subtitle, TitreFinal } from "./elements/Text";
import { DECOUPAGE } from "./lib/decoupage";
import { clamp } from "./lib/util";
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

export type MinuitProps = {
  /** Fichier de musique dans public/ (laisser vide pour aucune musique) */
  readonly musique: string;
};

// AU MILIEU DE LA NUIT, À MINUIT — 2 min 59 s (Matthieu 25:1-13)
export const Minuit: React.FC<MinuitProps> = ({ musique }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Series>
        <Series.Sequence name="00:00 L'attente" durationInFrames={15 * fps} premountFor={fps}>
          <S01Attente />
        </Series.Sequence>
        <Series.Sequence name="00:15 Le sommeil" durationInFrames={20 * fps} premountFor={fps}>
          <S02Sommeil />
        </Series.Sequence>
        <Series.Sequence name="00:35 Le cri" durationInFrames={20 * fps} premountFor={fps}>
          <S03Cri />
        </Series.Sequence>
        <Series.Sequence name="00:55 Réveillez-vous !" durationInFrames={25 * fps} premountFor={fps}>
          <S04Reveil />
        </Series.Sequence>
        <Series.Sequence name="01:20 L'huile manque" durationInFrames={25 * fps} premountFor={fps}>
          <S05HuileManque />
        </Series.Sequence>
        <Series.Sequence name="01:45 Les cinq lampes s'éteignent" durationInFrames={25 * fps} premountFor={fps}>
          <S06Extinction />
        </Series.Sequence>
        <Series.Sequence name="02:10 L'époux arrive" durationInFrames={20 * fps} premountFor={fps}>
          <S07Epoux />
        </Series.Sequence>
        <Series.Sequence name="02:30 La porte" durationInFrames={15 * fps} premountFor={fps}>
          <S08Porte />
        </Series.Sequence>
        <Series.Sequence name="02:45 Trop tard" durationInFrames={10 * fps} premountFor={fps}>
          <S09TropTard />
        </Series.Sequence>
        <Series.Sequence name="02:55 Le dernier plan" durationInFrames={4 * fps} premountFor={fps}>
          <S10DernierPlan />
        </Series.Sequence>
      </Series>

      {/* Plans IA réalistes : chaque fichier public/plans/<id>.* recouvre la version dessinée. */}
      {DECOUPAGE.map((p) => (
        <Sequence key={p.id} name={`Plan IA ${p.id}`} from={Math.round(p.debut * fps)} durationInFrames={Math.round(p.duree * fps)} premountFor={fps}>
          <PlanIA id={p.id} duree={p.duree} />
        </Sequence>
      ))}

      <Subtitle from={47 * fps + 10} to={51 * fps}>« Voici l'époux ! Allez à sa rencontre ! »</Subtitle>
      <Subtitle from={85.5 * fps} to={88.8 * fps}>« Donnez-nous de votre huile, car nos lampes s'éteignent. »</Subtitle>
      <Subtitle from={89.3 * fps} to={92.8 * fps}>« Il n'y en aurait pas assez pour nous et pour vous. »</Subtitle>
      <Subtitle from={169 * fps + 8} to={172 * fps}>« Seigneur, Seigneur, ouvre-nous ! »</Subtitle>

      {/* Fondu au noir puis message final */}
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: interpolate(frame, [177.5 * fps, 178.1 * fps], [0, 1], clamp) }} />
      <TitreFinal opacity={interpolate(frame, [178 * fps, 178.6 * fps], [0, 1], clamp)}>Soyez prêts.</TitreFinal>

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
