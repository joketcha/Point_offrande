import { Composition, Folder } from "remotion";
import { Minuit } from "./Minuit";
import { Reel } from "./Reel";
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

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="AuMilieuDeLaNuit"
        component={Minuit}
        durationInFrames={179 * 30}
        fps={30}
        width={1920}
        height={1080}
        defaultProps={{
          musique: "",
        }}
      />
      <Composition
        id="AuMilieuDeLaNuit-Reel"
        component={Reel}
        durationInFrames={179 * 30}
        fps={30}
        width={1080}
        height={1920}
        defaultProps={{
          musique: "",
        }}
      />
      <Folder name="Scenes">
        <Composition id="S01-Attente" component={S01Attente} durationInFrames={15 * 30} fps={30} width={1920} height={1080} />
        <Composition id="S02-Sommeil" component={S02Sommeil} durationInFrames={20 * 30} fps={30} width={1920} height={1080} />
        <Composition id="S03-Cri" component={S03Cri} durationInFrames={20 * 30} fps={30} width={1920} height={1080} />
        <Composition id="S04-Reveil" component={S04Reveil} durationInFrames={25 * 30} fps={30} width={1920} height={1080} />
        <Composition id="S05-HuileManque" component={S05HuileManque} durationInFrames={25 * 30} fps={30} width={1920} height={1080} />
        <Composition id="S06-Extinction" component={S06Extinction} durationInFrames={25 * 30} fps={30} width={1920} height={1080} />
        <Composition id="S07-Epoux" component={S07Epoux} durationInFrames={20 * 30} fps={30} width={1920} height={1080} />
        <Composition id="S08-Porte" component={S08Porte} durationInFrames={15 * 30} fps={30} width={1920} height={1080} />
        <Composition id="S09-TropTard" component={S09TropTard} durationInFrames={10 * 30} fps={30} width={1920} height={1080} />
        <Composition id="S10-DernierPlan" component={S10DernierPlan} durationInFrames={4 * 30} fps={30} width={1920} height={1080} />
      </Folder>
    </>
  );
};
