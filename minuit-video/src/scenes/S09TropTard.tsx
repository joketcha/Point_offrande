import React from "react";
import { AbsoluteFill, Series, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Door } from "../elements/Door";
import { Profile } from "../elements/Profile";
import { Virgin } from "../elements/Virgin";
import { Plan } from "../elements/Plan";
import { FOLLES } from "../lib/vierges";
import { clamp, tween } from "../lib/util";

// Les cinq folles devant la porte fermée, caméra derrière elles.
export const DevantLaPorte: React.FC<{ readonly arrivee?: number; readonly frappe?: number }> = ({ arrivee = 1, frappe = 0 }) => {
  const frame = useCurrentFrame();
  const places = [
    [560, 975, 1.25],
    [780, 945, 1.12],
    [960, 990, 1.35],
    [1150, 945, 1.12],
    [1370, 975, 1.25],
  ] as const;
  return (
    <>
      {FOLLES.map((v, k) => {
        const [x, y, s] = places[k];
        const dx = (1 - arrivee) * -(1400 + k * 160);
        const frapper = frappe > 0 && (k === 1 || k === 2 || k === 3);
        return (
          <Virgin
            key={v.nom}
            v={v}
            seed={`tt${k}`}
            x={x + dx}
            y={y}
            scale={s}
            facing={k < 2 ? 1 : -1}
            lamp={0}
            run={arrivee < 1}
            reach={frapper ? 0.75 + 0.25 * Math.abs(Math.sin(frame * 0.45 + k)) : 0}
            head={frapper ? -10 : -4}
          />
        );
      })}
    </>
  );
};

export const S09TropTard: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Plan>
      <Series>
        <Series.Sequence name="Elles arrivent en courant" durationInFrames={4 * fps} premountFor={fps}>
          <Door closed={1} front={<DevantLaPorte arrivee={tween(frame, [0, 3 * fps], [0, 1])} />} />
        </Series.Sequence>
        <Series.Sequence name="Elles frappent, elles appellent" durationInFrames={3 * fps} premountFor={fps}>
          <AbsoluteFill style={{ scale: interpolate(frame, [4 * fps, 7 * fps], [1.05, 1.15], clamp) }}>
            <Door closed={1} front={<DevantLaPorte frappe={1} />} />
          </AbsoluteFill>
        </Series.Sequence>
        <Series.Sequence name="Choc, peur et regret" durationInFrames={1.6 * fps} premountFor={fps}>
          <Profile seed="regret" voile={FOLLES[2].voile} lightColor="#7f98d0" light={0.45} eyeOpen={1.15} brow={1} tilt={5} bokeh={0.25} bokehColor="#ffb060" />
        </Series.Sequence>
        <Series.Sequence name="La porte ne s'ouvre pas" durationInFrames={1.4 * fps} premountFor={fps}>
          <Door closed={1} front={<DevantLaPorte />} />
        </Series.Sequence>
      </Series>
    </Plan>
  );
};
