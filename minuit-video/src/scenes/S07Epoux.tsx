import React from "react";
import { AbsoluteFill, Series, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Sky } from "../elements/Sky";
import { Stage } from "../elements/Stage";
import { Landscape } from "../elements/Landscape";
import { Mist } from "../elements/Mist";
import { Groupe } from "../elements/Groupe";
import { Profile } from "../elements/Profile";
import { Bridegroom, City, TorchBearer } from "../elements/People";
import { Plan } from "../elements/Plan";
import type { Pose } from "../lib/layouts";
import { VIERGES } from "../lib/vierges";
import { clamp, lent, mix, tween } from "../lib/util";

const HORS_CHAMP = new Array(5).fill(0).map((_, i) => ({ x: -900 - i * 40, y: 0, scale: 0.1, facing: 1 as const }));

const ATTENTE_SAGES: readonly Pose[] = [
  { x: 520, y: 950, scale: 1.0, facing: 1 },
  { x: 700, y: 900, scale: 0.85, facing: 1 },
  { x: 860, y: 965, scale: 1.08, facing: 1 },
  { x: 1020, y: 905, scale: 0.86, facing: 1 },
  { x: 1180, y: 960, scale: 1.04, facing: 1 },
  ...HORS_CHAMP,
];

const DEVANT_EPOUX: readonly Pose[] = [
  { x: 330, y: 1050, scale: 1.3, facing: 1 },
  { x: 560, y: 1000, scale: 1.12, facing: 1 },
  { x: 760, y: 1070, scale: 1.35, facing: 1 },
  { x: 1300, y: 1010, scale: 1.15, facing: -1 },
  { x: 1560, y: 1055, scale: 1.32, facing: -1 },
  ...HORS_CHAMP,
];

// Torches de la procession : [x, y, échelle] dans le plan majestueux.
const TORCHES = [
  [600, 840, 0.62], [1320, 840, 0.62], [700, 790, 0.5], [1220, 790, 0.5],
  [790, 750, 0.42], [1130, 750, 0.42], [870, 720, 0.36], [1050, 720, 0.36],
] as const;

const Approche: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const p = tween(frame, [0, 7 * fps], [0, 1]);
  return (
    <AbsoluteFill style={{ scale: interpolate(frame, [0, 7 * fps], [1, 1.12], { ...clamp, easing: lent }) }}>
      <Sky moonX={420} moonY={170} cloudSpeed={0.3} horizon="#2a2a3a" />
      <Stage>
        <Landscape path lueur={0.6 + p * 0.4} lueurX={1060} />
        <City x={1060} y={600} scale={0.42} light={0.5 + p * 0.5} />
        {new Array(9).fill(0).map((_, k) => {
          const t = Math.max(0, Math.min(1, p * 1.25 - k * 0.04));
          const x = mix(1060, 1000 + (k % 2 ? 1 : -1) * (12 + k * 6), t);
          const y = mix(600, 700 + k * 4, t);
          return k === 4 ? (
            <Bridegroom key={k} x={x} y={y} scale={mix(0.05, 0.16, t)} glow={t} />
          ) : (
            <TorchBearer key={k} x={x} y={y} scale={mix(0.05, 0.15, t)} seed={`pa${k}`} />
          );
        })}
        <Groupe layout={ATTENTE_SAGES} only="sages" state={() => ({ lamp: 1, raise: 0.6, head: -6 })} />
      </Stage>
      <Mist y={760} opacity={0.12} color="#c9a37a" />
    </AbsoluteFill>
  );
};

const Majestueux: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <AbsoluteFill
      style={{
        transformOrigin: "50% 55%",
        scale: interpolate(frame, [0, 9 * fps], [1, 1.14], { ...clamp, easing: lent }),
      }}
    >
      <Sky moonX={1560} moonY={150} cloudSpeed={0.2} horizon="#3a2a2a" />
      <Stage>
        <Landscape path={false} trees={false} lueur={1} lueurX={960} />
        <City x={960} y={640} scale={1} light={1} />
        <rect x={-100} y={640} width={2200} height={600} fill="#0a0d16" />
        <ellipse cx={960} cy={860} rx={900} ry={260} fill="#ff9d4a" opacity={0.18} filter="url(#flou-30)" />
        {TORCHES.slice()
          .sort((a, b) => a[1] - b[1])
          .map(([x, y, s], k) => (
            <TorchBearer key={k} x={x} y={y + Math.sin(frame * 0.05 + k) * 2} scale={s} seed={`t${k}`} />
          ))}
        <Bridegroom x={960} y={900} scale={1.2} glow={1} />
        <Groupe layout={DEVANT_EPOUX} only="sages" state={() => ({ lamp: 1, raise: 1, head: -10 })} />
      </Stage>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 70%, rgba(255,170,90,0.18), rgba(0,0,0,0) 60%)" }} />
    </AbsoluteFill>
  );
};

export const S07Epoux: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Plan>
      <Series>
        <Series.Sequence name="Une magnifique procession au loin" durationInFrames={7 * fps} premountFor={fps}>
          <Approche />
        </Series.Sequence>
        <Series.Sequence name="Les sages lèvent leurs lampes" durationInFrames={2 * fps} premountFor={fps}>
          <AbsoluteFill style={{ scale: 1.45, transformOrigin: "45% 75%" }}>
            <Sky moonX={420} moonY={170} horizon="#3a2a2a" />
            <Stage>
              <Landscape path={false} lueur={1} lueurX={1300} />
              <Groupe
                layout={ATTENTE_SAGES}
                only="sages"
                state={(i) => ({ lamp: 1, raise: tween(frame, [7 * fps + i * 4, 8.2 * fps + i * 4], [0.4, 1]), head: -10 })}
              />
            </Stage>
            <AbsoluteFill style={{ background: "linear-gradient(270deg, rgba(255,160,80,0.25), rgba(0,0,0,0) 60%)" }} />
          </AbsoluteFill>
        </Series.Sequence>
        <Series.Sequence name="Visages illuminés de joie" durationInFrames={2 * fps} premountFor={fps}>
          <Profile
            seed="joie"
            voile={VIERGES[0].voile}
            lightColor="#ffc070"
            light={tween(frame, [9 * fps, 11 * fps], [0.7, 1.25])}
            tilt={-7}
            gaze={0.6}
            bokeh={1}
            scale={interpolate(frame, [9 * fps, 11 * fps], [1.1, 1.18], clamp)}
          />
        </Series.Sequence>
        <Series.Sequence name="Plan majestueux : l'époux" durationInFrames={9 * fps} premountFor={fps}>
          <Majestueux />
        </Series.Sequence>
      </Series>
    </Plan>
  );
};
