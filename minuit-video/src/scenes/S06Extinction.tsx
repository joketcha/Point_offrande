import React from "react";
import { AbsoluteFill, Series, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Sky } from "../elements/Sky";
import { Stage } from "../elements/Stage";
import { Landscape, OliveTree } from "../elements/Landscape";
import { Mist } from "../elements/Mist";
import { Groupe } from "../elements/Groupe";
import { Profile } from "../elements/Profile";
import { Plan } from "../elements/Plan";
import type { Pose } from "../lib/layouts";
import { VIERGES } from "../lib/vierges";
import { clamp, tween } from "../lib/util";
import { faiblit } from "./S04Reveil";

// Les cinq folles courent (de droite à gauche, vers le village).
const COURSE: readonly Pose[] = [
  ...new Array(5).fill(0).map((_, i) => ({ x: -500 - i * 50, y: 0, scale: 0.1, facing: 1 as const })),
  { x: 700, y: 905, scale: 1.0, facing: -1 },
  { x: 900, y: 860, scale: 0.85, facing: -1 },
  { x: 1080, y: 925, scale: 1.08, facing: -1 },
  { x: 1260, y: 875, scale: 0.9, facing: -1 },
  { x: 1430, y: 915, scale: 1.02, facing: -1 },
];
// Moments où chaque lampe s'éteint (en secondes) : une, puis deux… puis la cinquième.
const EXTINCTIONS = [2, 4.5, 7, 9.5, 12];

const SEPARATION: readonly Pose[] = [
  { x: 1000, y: 820, scale: 0.34, facing: 1 },
  { x: 1030, y: 800, scale: 0.3, facing: 1 },
  { x: 1060, y: 826, scale: 0.35, facing: 1 },
  { x: 1090, y: 806, scale: 0.31, facing: 1 },
  { x: 1120, y: 822, scale: 0.34, facing: 1 },
  { x: 900, y: 822, scale: 0.34, facing: -1 },
  { x: 870, y: 804, scale: 0.31, facing: -1 },
  { x: 840, y: 826, scale: 0.35, facing: -1 },
  { x: 810, y: 806, scale: 0.3, facing: -1 },
  { x: 780, y: 820, scale: 0.33, facing: -1 },
];

const Travelling: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const eteintes = EXTINCTIONS.filter((t) => frame > t * fps).length;
  return (
    <AbsoluteFill>
      <Sky moonX={1500} moonY={170} cloudSpeed={0.6} />
      <Stage>
        <g transform={`translate(${frame * 0.8} 0)`}>
          <Landscape path={false} trees={false} />
        </g>
        {[0, 1, 2, 3].map((k) => (
          <OliveTree key={k} x={((k * 620 + frame * 5) % 2600) - 300} y={790} s={1.1} seed={`tr${k}`} />
        ))}
        <rect x={-100} y={880} width={2200} height={300} fill="#03060c" />
        <Groupe
          layout={COURSE}
          only="folles"
          state={(i) => {
            const t = EXTINCTIONS[i - 5] * fps;
            return {
              run: true,
              lamp: frame < t ? faiblit(frame, `r${i}`, interpolate(frame, [t - 1.5 * fps, t], [0.3, 0.05], clamp)) : 0,
              smoke: tween(frame, [t, t + 2.5 * fps], [0, 1]),
              dx: Math.sin(frame * 0.05 + i) * 30,
              wind: 2,
            };
          }}
        />
        {[0, 1, 2, 3].map((k) => (
          <OliveTree key={`p${k}`} x={((k * 900 + frame * 14) % 3600) - 600} y={1300} s={2.2} seed={`tp${k}`} color="#010204" />
        ))}
      </Stage>
      <AbsoluteFill style={{ backgroundColor: "#00010a", opacity: eteintes * 0.09 }} />
    </AbsoluteFill>
  );
};

export const S06Extinction: React.FC<{ readonly footage?: string }> = ({ footage }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Plan footage={footage}>
      <Series>
        <Series.Sequence name="Les cinq lampes s'éteignent" durationInFrames={13 * fps} premountFor={fps}>
          <Travelling />
        </Series.Sequence>
        <Series.Sequence name="Peur et regret" durationInFrames={4 * fps} premountFor={fps}>
          <Profile
            seed="peur"
            voile={VIERGES[6].voile}
            facing={-1}
            lightColor="#7f98d0"
            light={0.4}
            eyeOpen={1.2}
            brow={1}
            gaze={-0.2}
            bokeh={0}
            tilt={Math.sin(frame * 0.5) * 1.5}
            x={interpolate(frame, [13 * fps, 17 * fps], [1000, 900], clamp)}
          />
        </Series.Sequence>
        <Series.Sequence name="Lumière contre obscurité" durationInFrames={8 * fps} premountFor={fps}>
          <AbsoluteFill>
            <Sky moonX={960} moonY={170} cloudSpeed={0.3} />
            <Mist y={640} opacity={0.18} />
            <Stage>
              <Landscape path lueur={0.8} lueurX={1650} />
              <Groupe
                layout={SEPARATION}
                state={(i) => {
                  const t = frame - 17 * fps;
                  return VIERGES[i].sage
                    ? { lamp: 1, raise: 1, dx: t * 1.6, dy: -t * 0.08 }
                    : { lamp: 0, run: true, dx: -t * 2.6, dy: t * 0.1 };
                }}
              />
            </Stage>
            <AbsoluteFill style={{ background: "linear-gradient(90deg, rgba(0,1,8,0.75) 0%, rgba(0,1,8,0) 55%)" }} />
          </AbsoluteFill>
        </Series.Sequence>
      </Series>
    </Plan>
  );
};
