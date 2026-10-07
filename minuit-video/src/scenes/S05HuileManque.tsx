import React from "react";
import { AbsoluteFill, Series, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Sky } from "../elements/Sky";
import { Stage } from "../elements/Stage";
import { Landscape } from "../elements/Landscape";
import { Mist } from "../elements/Mist";
import { Groupe } from "../elements/Groupe";
import { LampCloseUp } from "../elements/LampCloseUp";
import { Plan } from "../elements/Plan";
import { MOYEN, type Pose } from "../lib/layouts";
import { VIERGES } from "../lib/vierges";
import { clamp, lent, tween } from "../lib/util";
import { faiblit } from "./S04Reveil";

// Les folles au premier plan, vues de dos/profil, regardant l'horizon.
const AU_BORD: readonly Pose[] = [
  ...MOYEN.slice(0, 5),
  { x: 300, y: 1030, scale: 1.35, facing: 1 },
  { x: 560, y: 990, scale: 1.2, facing: 1 },
  { x: 800, y: 1050, scale: 1.4, facing: 1 },
  { x: 1500, y: 1000, scale: 1.25, facing: 1 },
  { x: 1720, y: 1040, scale: 1.4, facing: 1 },
];

export const S05HuileManque: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Plan>
      <Series>
        <Series.Sequence name="Pas assez d'huile" durationInFrames={5 * fps} premountFor={fps}>
          <LampCloseUp
            seed="vide"
            hand
            bokeh={0.2}
            intensity={faiblit(frame, "vide", 0.28)}
            tilt={tween(frame, [0.5 * fps, 4 * fps], [0, 16])}
            scale={1.15}
          />
        </Series.Sequence>
        <Series.Sequence name="Donnez-nous de votre huile" durationInFrames={8 * fps} premountFor={fps}>
          <AbsoluteFill style={{ scale: interpolate(frame, [5 * fps, 13 * fps], [1.08, 1.18], clamp) }}>
            <Sky moonX={1300} moonY={160} cloudSpeed={0.4} />
            <Stage>
              <Landscape path={false} />
              <Groupe
                layout={MOYEN}
                state={(i) => {
                  const local = frame - 5 * fps;
                  if (VIERGES[i].sage) {
                    return {
                      lamp: 1,
                      raise: 0.2,
                      head: local > 4 * fps ? Math.sin(local * 0.2) * 7 * tween(local, [4 * fps, 5 * fps], [0, 1]) - 8 : -4,
                    };
                  }
                  return {
                    lamp: faiblit(frame, `h${i}`, 0.28),
                    raise: 0.4,
                    reach: i === 5 || i === 6 ? tween(local, [0.6 * fps, 1.6 * fps], [0, 1]) : 0,
                    head: -4,
                  };
                }}
              />
            </Stage>
          </AbsoluteFill>
        </Series.Sequence>
        <Series.Sequence name="La lumière de l'époux au loin" durationInFrames={6 * fps} premountFor={fps}>
          <AbsoluteFill style={{ scale: interpolate(frame, [13 * fps, 19 * fps], [1, 1.1], { ...clamp, easing: lent }) }}>
            <Sky moonX={500} moonY={180} cloudSpeed={0.3} />
            <Mist y={630} opacity={0.2} />
            <Stage>
              <Landscape path={false} trees={false} lueur={tween(frame, [13 * fps, 19 * fps], [0.25, 0.8])} lueurX={1180} />
              <Groupe
                layout={AU_BORD}
                only="folles"
                state={(i) => ({ lamp: faiblit(frame, `b${i}`, 0.22), head: -4, raise: 0.2 })}
              />
            </Stage>
          </AbsoluteFill>
        </Series.Sequence>
        <Series.Sequence name="Elles courent vers le village" durationInFrames={6 * fps} premountFor={fps}>
          <AbsoluteFill style={{ scale: 1.1 }}>
            <Sky moonX={1300} moonY={160} cloudSpeed={0.4} />
            <Stage>
              <Landscape path={false} lueur={0.6} lueurX={1300} />
              <Groupe
                layout={MOYEN}
                state={(i) => {
                  if (VIERGES[i].sage) return { lamp: 1, raise: 0.5 };
                  const depart = 19 * fps + 0.6 * fps + (i - 5) * 8;
                  const course = frame > depart;
                  return {
                    lamp: faiblit(frame, `c${i}`, 0.25),
                    run: course,
                    facing: course ? -1 : 1,
                    dx: -(Math.max(0, frame - depart) ** 1.15) * 7,
                    head: course ? 0 : -6,
                  };
                }}
              />
            </Stage>
          </AbsoluteFill>
        </Series.Sequence>
      </Series>
    </Plan>
  );
};
