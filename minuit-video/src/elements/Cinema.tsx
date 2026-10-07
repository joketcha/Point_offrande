import React from "react";
import { AbsoluteFill, useCurrentFrame } from "remotion";

// Bandes cinéma 2.39:1, vignettage et grain de pellicule.
export const Cinema: React.FC = () => {
  const frame = useCurrentFrame();
  const barre = Math.round((1080 - 1920 / 2.39) / 2);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <AbsoluteFill
        style={{
          background:
            "radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%)",
        }}
      />
      <AbsoluteFill style={{ mixBlendMode: "overlay", opacity: 0.22 }}>
        <svg width="100%" height="100%">
          <filter id="grain">
            <feTurbulence type="fractalNoise" baseFrequency={0.85} numOctaves={2} seed={frame % 24} />
            <feColorMatrix type="saturate" values="0" />
          </filter>
          <rect width="100%" height="100%" filter="url(#grain)" />
        </svg>
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "#0b1a3a", mixBlendMode: "soft-light", opacity: 0.35 }} />
      <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: barre, background: "#000" }} />
      <div style={{ position: "absolute", bottom: 0, left: 0, right: 0, height: barre, background: "#000" }} />
    </AbsoluteFill>
  );
};
