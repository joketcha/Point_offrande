import React from "react";
import { AbsoluteFill, Series, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { Door } from "../elements/Door";
import { Sky } from "../elements/Sky";
import { TitreFinal } from "../elements/Text";
import { Plan } from "../elements/Plan";
import { clamp, lent } from "../lib/util";
import { DevantLaPorte } from "./S09TropTard";

export const S10DernierPlan: React.FC<{ readonly footage?: string }> = ({ footage }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <Plan footage={footage}>
      <Series>
        <Series.Sequence name="La caméra s'éloigne" durationInFrames={2 * fps} premountFor={fps}>
          <AbsoluteFill style={{ scale: interpolate(frame, [0, 2 * fps], [1.25, 0.95], { ...clamp, easing: lent }) }}>
            <Door closed={1} front={<DevantLaPorte />} />
          </AbsoluteFill>
        </Series.Sequence>
        <Series.Sequence name="Plan sur la lune" durationInFrames={2 * fps} premountFor={fps}>
          <Sky moonX={960} moonY={540} moonR={170} cloudSpeed={1.2} cloudOpacity={0.6} />
        </Series.Sequence>
      </Series>
      <AbsoluteFill
        style={{
          backgroundColor: "#000",
          opacity: interpolate(frame, [2.5 * fps, 3.1 * fps], [0, 1], clamp),
        }}
      />
      <TitreFinal opacity={interpolate(frame, [3 * fps, 3.6 * fps], [0, 1], clamp)}>Soyez prêts.</TitreFinal>
    </Plan>
  );
};
