import React from "react";
import { AbsoluteFill, Series, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Sky } from "../elements/Sky";
import { Stage } from "../elements/Stage";
import { Landscape } from "../elements/Landscape";
import { Mist } from "../elements/Mist";
import { Groupe } from "../elements/Groupe";
import { Profile } from "../elements/Profile";
import { Watchman } from "../elements/People";
import { Plan } from "../elements/Plan";
import { LOINTAIN, MOYEN } from "../lib/layouts";
import { VIERGES } from "../lib/vierges";
import { clamp, lent, tween } from "../lib/util";

const COLLINE = "M -100 1200 L -100 690 C 150 640 420 600 560 612 C 700 624 820 700 980 760 C 1200 840 1500 900 2100 1000 L 2100 1200 Z";

const Hauteur: React.FC<{ readonly t0: number; readonly cri: boolean }> = ({ t0, cri }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame + t0;
  const lueur = tween(f, [2 * fps, 9 * fps], [0, 0.55]);
  return (
    <AbsoluteFill
      style={{
        transformOrigin: "30% 55%",
        scale: cri
          ? interpolate(frame, [0, 4 * fps], [1.9, 2.05], clamp)
          : interpolate(frame, [0, 6 * fps], [1, 1.15], { ...clamp, easing: lent }),
      }}
    >
      <Sky moonX={300} moonY={190} moonR={40} cloudSpeed={0.15} />
      <Stage>
        <g transform="translate(0 -40)">
          <Landscape path={false} trees={false} lueur={lueur} lueurX={1560} />
        </g>
        <circle cx={1560} cy={540} r={3 + lueur * 6} fill="#ffd28a" opacity={lueur * 1.6} />
        <path d={COLLINE} fill="#03060c" />
        <Watchman x={560} y={616} scale={0.9} cry={cri ? tween(frame, [6, 20], [0, 1]) : 0} />
        {cri
          ? [0, 1, 2].map((k) => {
              const t = ((frame - 18 - k * 14) / 50) % 1;
              if (frame < 18 + k * 14) return null;
              return (
                <circle key={k} cx={600} cy={420} r={40 + t * 900} fill="none" stroke="#9fb3e6" strokeWidth={3} opacity={(1 - t) * 0.15} />
              );
            })
          : null}
      </Stage>
      <Mist y={700} opacity={0.18} />
    </AbsoluteFill>
  );
};

export const S03Cri: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Plan>
      <Series>
        <Series.Sequence name="Silence dramatique" durationInFrames={3 * fps} premountFor={fps}>
          <AbsoluteFill style={{ filter: "brightness(0.8)" }}>
            <Sky moonX={1450} moonY={200} cloudSpeed={0.05} />
            <Stage>
              <Landscape />
              <Groupe layout={LOINTAIN} state={() => ({ lamp: 0.85, sit: 1, sleep: 1, wind: 0.1 })} />
            </Stage>
          </AbsoluteFill>
        </Series.Sequence>
        <Series.Sequence name="Le veilleur sur la hauteur" durationInFrames={6 * fps} premountFor={fps}>
          <Hauteur t0={0} cri={false} />
        </Series.Sequence>
        <Series.Sequence name="Son visage change" durationInFrames={3 * fps} premountFor={fps}>
          <Profile
            seed="veilleur"
            homme
            bokeh={0}
            lightColor="#ffb066"
            light={tween(frame, [9 * fps, 11 * fps], [0.15, 0.6])}
            eyeOpen={tween(frame, [9.8 * fps, 10.6 * fps], [0.8, 1.25])}
            brow={tween(frame, [9.8 * fps, 10.6 * fps], [0, 1])}
            gaze={0.2}
            scale={interpolate(frame, [9 * fps, 12 * fps], [1.1, 1.25], clamp)}
          />
        </Series.Sequence>
        <Series.Sequence name="Le cri" durationInFrames={4 * fps} premountFor={fps}>
          <Hauteur t0={9 * fps} cri />
        </Series.Sequence>
        <Series.Sequence name="Les yeux s'ouvrent" durationInFrames={1.5 * fps} premountFor={fps}>
          <Profile
            seed="reveil"
            voile={VIERGES[3].voile}
            scale={3}
            x={960 - 122 * 3}
            y={540 + 94 * 3}
            bokeh={0.3}
            light={0.7}
            eyeOpen={tween(frame, [16 * fps + 8, 16 * fps + 14], [0.04, 1.15])}
            brow={tween(frame, [16 * fps + 8, 16 * fps + 14], [0, 0.8])}
          />
        </Series.Sequence>
        <Series.Sequence name="Elles se lèvent" durationInFrames={2.5 * fps} premountFor={fps}>
          <AbsoluteFill style={{ scale: 1.05 }}>
            <Sky moonX={1300} moonY={160} cloudSpeed={0.4} />
            <Stage>
              <Landscape path={false} />
              <Groupe
                layout={MOYEN}
                state={(i) => {
                  const t0 = 17.5 * fps + ((i * 3) % 10) * 2;
                  return {
                    lamp: 1,
                    sit: tween(frame, [t0, t0 + 12], [1, 0]),
                    sleep: tween(frame, [t0 - 6, t0 + 2], [1, 0]),
                    head: 8,
                    wind: 0.8,
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
