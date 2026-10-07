import React from "react";
import { AbsoluteFill, Series, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Sky } from "../elements/Sky";
import { Stage } from "../elements/Stage";
import { Landscape } from "../elements/Landscape";
import { Groupe } from "../elements/Groupe";
import { Profile } from "../elements/Profile";
import { LampCloseUp } from "../elements/LampCloseUp";
import { Lampe } from "../elements/Virgin";
import { Plan } from "../elements/Plan";
import { MOYEN } from "../lib/layouts";
import { VIERGES } from "../lib/vierges";
import { bruit, clamp, lent, tween } from "../lib/util";

// Flamme d'une folle qui faiblit (vacillements irréguliers).
export const faiblit = (frame: number, seed: string, base: number) =>
  Math.max(0, base * (0.75 + 0.35 * bruit(seed, frame, 0.35)));

export const S04Reveil: React.FC<{ readonly footage?: string }> = ({ footage }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Plan footage={footage}>
      <Series>
        <Series.Sequence name="Elles prennent leurs lampes" durationInFrames={6 * fps} premountFor={fps}>
          <AbsoluteFill style={{ scale: interpolate(frame, [0, 6 * fps], [1.05, 1.12], { ...clamp, easing: lent }) }}>
            <Sky moonX={1300} moonY={160} cloudSpeed={0.4} />
            <Stage>
              <Landscape path={false} />
              <Groupe
                layout={MOYEN}
                state={(i) =>
                  VIERGES[i].sage
                    ? { lamp: 1, raise: tween(frame, [0.5 * fps + i * 6, 2 * fps + i * 6], [0, 1]), head: -4 }
                    : {
                        lamp: faiblit(frame, `f${i}`, tween(frame, [2 * fps, 6 * fps], [1, 0.5])),
                        raise: tween(frame, [0.5 * fps, 2 * fps], [0, 0.6]),
                        head: tween(frame, [3 * fps, 4 * fps], [0, 14]),
                      }
                }
              />
            </Stage>
          </AbsoluteFill>
        </Series.Sequence>
        <Series.Sequence name="Gros plan : une flamme vacille" durationInFrames={3 * fps} premountFor={fps}>
          <LampCloseUp
            seed="vacille"
            hand
            bokeh={0.3}
            intensity={interpolate(
              frame - 6 * fps,
              [0, 20, 28, 40, 55, 68, 90],
              [0.65, 0.6, 0.15, 0.5, 0.18, 0.4, 0.32],
              clamp,
            )}
            scale={interpolate(frame, [6 * fps, 9 * fps], [1.1, 1.2], clamp)}
          />
        </Series.Sequence>
        <Series.Sequence name="Une autre flamme diminue, puis une autre" durationInFrames={4 * fps} premountFor={fps}>
          <Stage>
            <rect width={1920} height={1080} fill="#03050b" />
            {[0, 1, 2].map((k) => (
              <Lampe
                key={k}
                x={420 + k * 520}
                y={720 - (k % 2) * 30}
                s={4.5}
                seed={`dim-${k}`}
                lamp={faiblit(frame, `dim-${k}`, tween(frame, [9 * fps + 10 + k * 30, 9 * fps + 45 + k * 30], [0.8, 0.2]))}
              />
            ))}
          </Stage>
        </Series.Sequence>
        <Series.Sequence name="Les cinq se regardent avec inquiétude" durationInFrames={6 * fps} premountFor={fps}>
          <AbsoluteFill style={{ scale: interpolate(frame, [13 * fps, 19 * fps], [1, 1.08], clamp) }}>
            <Profile seed="inq-a" voile={VIERGES[5].voile} x={520} scale={0.95} light={faiblit(frame, "inq-a", 0.4)} brow={0.7} gaze={tween(frame, [14 * fps, 16 * fps], [0, -0.5])} bokeh={0.15} />
            <Profile seed="inq-b" voile={VIERGES[8].voile} x={1420} scale={0.95} facing={-1} fond={false} light={faiblit(frame, "inq-b", 0.35)} brow={0.8} eyeOpen={1.1} />
          </AbsoluteFill>
        </Series.Sequence>
        <Series.Sequence name="Le spectateur comprend" durationInFrames={6 * fps} premountFor={fps}>
          <AbsoluteFill
            style={{
              transformOrigin: "75% 70%",
              scale: interpolate(frame, [19 * fps, 25 * fps], [1, 1.35], { ...clamp, easing: lent }),
            }}
          >
            <Sky moonX={1300} moonY={160} cloudSpeed={0.4} />
            <Stage>
              <Landscape path={false} />
              <Groupe
                layout={MOYEN}
                state={(i) =>
                  VIERGES[i].sage
                    ? { lamp: 1, raise: 1 }
                    : { lamp: faiblit(frame, `g${i}`, 0.32), raise: 0.3, head: 18 }
                }
              />
            </Stage>
          </AbsoluteFill>
        </Series.Sequence>
      </Series>
    </Plan>
  );
};
