import React from "react";
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Sky } from "../elements/Sky";
import { Stage } from "../elements/Stage";
import { Landscape } from "../elements/Landscape";
import { Mist } from "../elements/Mist";
import { Groupe } from "../elements/Groupe";
import { Fondu, Plan } from "../elements/Plan";
import { MOYEN } from "../lib/layouts";
import { clamp, lent, tween } from "../lib/util";

// Ordre dans lequel elles s'assoient : une première, puis une deuxième, puis les autres.
const ORDRE = [6, 2, 8, 0, 4, 9, 3, 5, 1, 7];

export const S02Sommeil: React.FC<{ readonly footage?: string }> = ({ footage }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const montee = tween(frame, [11 * fps, 20 * fps], [0, 1]);
  return (
    <Plan footage={footage}>
      <Fondu frame={frame} dur={20 * fps} fadeIn={10}>
        <AbsoluteFill
          style={{
            scale: interpolate(frame, [0, 11 * fps], [1.04, 1.12], { ...clamp, easing: lent }),
          }}
        >
          <Sky moonX={960} moonY={-380} moonR={58} offsetY={montee * 720} cloudSpeed={0.9} cloudOpacity={0.85} />
          <Stage>
            <g transform={`translate(0 ${montee * 1150})`}>
              <Landscape path={false} />
              <Groupe
                layout={MOYEN}
                state={(i) => {
                  const rang = ORDRE.indexOf(i);
                  const t0 = (1 + rang * 0.8) * fps;
                  return {
                    lamp: 1,
                    wind: 0.6 + montee,
                    sit: tween(frame, [t0, t0 + 24], [0, 1]),
                    sleep: tween(frame, [t0 + 2.5 * fps, t0 + 4.5 * fps], [0, 1]),
                    head: -6,
                  };
                }}
              />
            </g>
          </Stage>
          <Mist y={700 + montee * 1150} opacity={0.14} speed={0.6} />
        </AbsoluteFill>
      </Fondu>
    </Plan>
  );
};
