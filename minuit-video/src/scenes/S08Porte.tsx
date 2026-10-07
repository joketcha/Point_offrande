import React from "react";
import { AbsoluteFill, Series, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Door } from "../elements/Door";
import { Profile } from "../elements/Profile";
import { Bridegroom } from "../elements/People";
import { Virgin } from "../elements/Virgin";
import { Plan } from "../elements/Plan";
import { SAGES } from "../lib/vierges";
import { bruit, clamp, mix, tween } from "../lib/util";

const Entree: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const marche = (depart: number) => tween(frame, [depart, depart + 3.2 * fps], [0, 1]);
  const pe = marche(0);
  return (
    <Door closed={0}>
      <g opacity={1 - tween(frame, [2.6 * fps, 3.4 * fps], [0, 1])}>
        <Bridegroom x={mix(960, 960, pe)} y={mix(1060, 900, pe)} scale={mix(1.1, 0.75, pe)} />
      </g>
      {SAGES.map((v, k) => {
        const t = marche(0.5 * fps + k * 0.45 * fps);
        const x0 = 640 + k * 160;
        return (
          <g key={v.nom} opacity={1 - tween(t, [0.82, 1], [0, 1], (n) => n)}>
            <Virgin v={v} seed={`e${k}`} x={mix(x0, 900 + k * 30, t)} y={mix(1080, 900, t)} scale={mix(1.1, 0.7, t)} lamp={1} raise={0.6} facing={k % 2 ? -1 : 1} />
          </g>
        );
      })}
    </Door>
  );
};

export const S08Porte: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const choc = frame > 13.4 * fps && frame < 13.9 * fps ? bruit("choc", frame, 1.2) * 6 : 0;
  return (
    <Plan>
      <Series>
        <Series.Sequence name="Les sages entrent avec lui" durationInFrames={6 * fps} premountFor={fps}>
          <Entree />
        </Series.Sequence>
        <Series.Sequence name="La porte commence à se fermer" durationInFrames={2.5 * fps} premountFor={fps}>
          <AbsoluteFill style={{ scale: interpolate(frame, [6 * fps, 8.5 * fps], [1, 1.05], clamp) }}>
            <Door closed={tween(frame, [6.3 * fps, 8.5 * fps], [0, 0.3])} />
          </AbsoluteFill>
        </Series.Sequence>
        <Series.Sequence name="Visages heureux" durationInFrames={2.5 * fps} premountFor={fps}>
          <Profile seed="heureux" voile={SAGES[3].voile} facing={-1} lightColor="#ffc878" light={1.2} tilt={-4} gaze={0.3} bokeh={1} />
        </Series.Sequence>
        <Series.Sequence name="Gros plan : la porte se referme" durationInFrames={4 * fps} premountFor={fps}>
          <AbsoluteFill style={{ scale: 1.7, transformOrigin: "50% 52%", translate: `${choc}px ${choc}px` }}>
            <Door closed={tween(frame, [11 * fps, 13.4 * fps], [0.3, 1], (n) => n * n)} />
          </AbsoluteFill>
        </Series.Sequence>
      </Series>
    </Plan>
  );
};
