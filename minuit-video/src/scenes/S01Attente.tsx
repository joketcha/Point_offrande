import React from "react";
import { AbsoluteFill, Series, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Sky } from "../elements/Sky";
import { Stage } from "../elements/Stage";
import { Landscape } from "../elements/Landscape";
import { Mist } from "../elements/Mist";
import { Groupe } from "../elements/Groupe";
import { LampCloseUp } from "../elements/LampCloseUp";
import { Profile } from "../elements/Profile";
import { Lampe } from "../elements/Virgin";
import { Fondu, Plan } from "../elements/Plan";
import { LOINTAIN } from "../lib/layouts";
import { VIERGES } from "../lib/vierges";
import { clamp, lent } from "../lib/util";

const PlanLarge: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Fondu frame={frame} dur={6 * fps} fadeIn={2 * fps}>
      <AbsoluteFill
        style={{
          transformOrigin: "52% 74%",
          scale: interpolate(frame, [0, 6 * fps], [1, 1.9], { ...clamp, easing: lent }),
        }}
      >
        <Sky moonX={1450} moonY={200} cloudSpeed={0.2} />
        <Mist y={620} opacity={0.16} />
        <Stage>
          <Landscape />
          <Groupe layout={LOINTAIN} state={() => ({ lamp: 1, wind: 0.4 })} />
        </Stage>
        <Mist y={790} opacity={0.1} speed={0.5} />
      </AbsoluteFill>
    </Fondu>
  );
};

const Flammes: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <Stage>
      <rect width={1920} height={1080} fill="#03050b" />
      <ellipse cx={960} cy={760} rx={900} ry={120} fill="#3a2010" opacity={0.6} filter="url(#flou-30)" />
      <g style={{ scale: interpolate(frame, [0, 60], [1, 1.05], clamp), transformOrigin: "960px 700px" }}>
        <Lampe x={480} y={720} s={5} lamp={0.95} seed="gp-a" />
        <Lampe x={900} y={760} s={6.5} lamp={1} seed="gp-b" />
        <Lampe x={1420} y={710} s={4.5} lamp={0.9} seed="gp-c" />
      </g>
    </Stage>
  );
};

export const S01Attente: React.FC = () => {
  const { fps } = useVideoConfig();
  const frame = useCurrentFrame();
  return (
    <Plan>
      <Series>
        <Series.Sequence name="Plan très large" durationInFrames={6 * fps} premountFor={fps}>
          <PlanLarge />
        </Series.Sequence>
        <Series.Sequence name="Une lampe allumée" durationInFrames={1.8 * fps} premountFor={fps}>
          <LampCloseUp seed="att-1" scale={interpolate(frame, [6 * fps, 7.8 * fps], [1, 1.08], clamp)} />
        </Series.Sequence>
        <Series.Sequence name="Une main tenant une lampe" durationInFrames={1.8 * fps} premountFor={fps}>
          <LampCloseUp seed="att-2" hand tilt={-4} x={interpolate(frame, [7.8 * fps, 9.6 * fps], [940, 880], clamp)} />
        </Series.Sequence>
        <Series.Sequence name="Visages fatigués" durationInFrames={1.8 * fps} premountFor={fps}>
          <Profile seed="att-3" voile={VIERGES[1].voile} eyeOpen={0.5} gaze={-0.6} tilt={7} light={0.75} />
        </Series.Sequence>
        <Series.Sequence name="Flammes qui vacillent" durationInFrames={1.8 * fps} premountFor={fps}>
          <Flammes />
        </Series.Sequence>
        <Series.Sequence name="Yeux qui cherchent au loin" durationInFrames={1.8 * fps} premountFor={fps}>
          <Profile
            seed="att-5"
            voile={VIERGES[7].voile}
            facing={-1}
            eyeOpen={1}
            gaze={0.4}
            light={0.8}
            x={interpolate(frame, [13.2 * fps, 15 * fps], [1000, 940], clamp)}
          />
        </Series.Sequence>
      </Series>
    </Plan>
  );
};
