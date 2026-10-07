import React from "react";
import { AbsoluteFill, Sequence, Series, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { Cinema } from "./elements/Cinema";
import { Etalonnage, FuitesDeLumiere, Poussieres, TitreOuverture } from "./elements/Luxe";
import { PlanIA } from "./elements/PlanIA";
import { Subtitle, TitreFinal } from "./elements/Text";
import { ImageCleVue, FONDU, trouverImage } from "./elements/ImageCle";
import { DECOUPAGE } from "./lib/decoupage";
import { IMAGES_CLES } from "./lib/imagesCles";
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

// Le film dessiné (version de secours tant que les images réalistes manquent).
export const FilmDessine: React.FC = () => {
  const { fps } = useVideoConfig();
  return (
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
  );
};

// Les 20 images clés réalistes (public/images/<id>.*), en fondu enchaîné avec surimpression.
export const CoucheImagesCles: React.FC<{ readonly ajustement: "cover" | "contain" }> = ({ ajustement }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      {IMAGES_CLES.map((img, i) => {
        const fichier = trouverImage(img.id);
        if (!fichier) return null;
        const debut = i === 0 ? 0 : img.debut - FONDU;
        return (
          <Sequence
            key={img.id}
            name={`Image clé ${img.id}`}
            from={Math.round(debut * fps)}
            durationInFrames={Math.round((img.fin - debut) * fps)}
            premountFor={fps}
          >
            <ImageCleVue image={img} fichier={fichier} ajustement={ajustement} premiere={i === 0} />
          </Sequence>
        );
      })}
    </>
  );
};

export const imagesClesManquantes = (seconde: number) =>
  IMAGES_CLES.some((img, i) => {
    const debut = i === 0 ? 0 : img.debut - FONDU;
    return seconde >= debut && seconde < img.fin && !trouverImage(img.id);
  });

// Répliques sous-titrées, message final et musique, communs aux deux formats.
export const Dialogues: React.FC<{ readonly bas: number; readonly taille: number }> = ({ bas, taille }) => {
  const { fps } = useVideoConfig();
  return (
    <>
      <Subtitle bas={bas} taille={taille} from={47 * fps + 10} to={51 * fps}>« Voici l'époux ! Allez à sa rencontre ! »</Subtitle>
      <Subtitle bas={bas} taille={taille} from={85.5 * fps} to={88.8 * fps}>« Donnez-nous de votre huile, car nos lampes s'éteignent. »</Subtitle>
      <Subtitle bas={bas} taille={taille} from={89.3 * fps} to={92.8 * fps}>« Il n'y en aurait pas assez pour nous et pour vous. »</Subtitle>
      <Subtitle bas={bas} taille={taille} from={169 * fps + 8} to={172 * fps}>« Seigneur, Seigneur, ouvre-nous ! »</Subtitle>
    </>
  );
};

export const Final: React.FC<{ readonly taille: number }> = ({ taille }) => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  return (
    <>
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: interpolate(frame, [177.5 * fps, 178.1 * fps], [0, 1], clamp) }} />
      <TitreFinal taille={taille} opacity={interpolate(frame, [178 * fps, 178.6 * fps], [0, 1], clamp)}>Soyez prêts.</TitreFinal>
    </>
  );
};

// La musique (2:58,7) couvre tout le film ; léger fondu de sortie sur la carte finale.
export const Musique: React.FC<{ readonly musique: string }> = ({ musique }) => {
  const { fps } = useVideoConfig();
  if (!musique) return null;
  return (
    <Audio
      src={staticFile(musique)}
      volume={(f) => interpolate(f, [0, 0.5 * fps, 177.4 * fps, 178.7 * fps], [0, 1, 1, 0], clamp)}
    />
  );
};

// AU MILIEU DE LA NUIT, À MINUIT — 2 min 59 s (Matthieu 25:1-13), format 16:9
export const Minuit: React.FC<MinuitProps> = ({ musique }) => {
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Etalonnage>
        <FilmDessine />
        <CoucheImagesCles ajustement="contain" />

        {/* Plans IA détaillés (46 plans) : public/plans/<id>.* */}
        {DECOUPAGE.map((p) => (
          <Sequence key={p.id} name={`Plan IA ${p.id}`} from={Math.round(p.debut * fps)} durationInFrames={Math.round(p.duree * fps)} premountFor={fps}>
            <PlanIA id={p.id} duree={p.duree} />
          </Sequence>
        ))}
      </Etalonnage>
      <FuitesDeLumiere />
      <Poussieres />
      <TitreOuverture />

      <Dialogues bas={175} taille={58} />
      <Final taille={110} />
      <Cinema />
      <Musique musique={musique} />
    </AbsoluteFill>
  );
};
