import React from "react";
import { AbsoluteFill, staticFile, useVideoConfig } from "remotion";
import { Video } from "@remotion/media";

// Si un plan filmé / généré (fichier dans public/) est fourni, il remplace
// la version procédurale de la scène. Sinon on affiche la scène dessinée.
export const Plan: React.FC<{
  readonly footage?: string;
  readonly children: React.ReactNode;
}> = ({ footage, children }) => {
  const { fps } = useVideoConfig();
  if (!footage) {
    return <AbsoluteFill style={{ backgroundColor: "#000" }}>{children}</AbsoluteFill>;
  }
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <Video src={staticFile(footage)} muted objectFit="cover" premountFor={fps} style={{ width: "100%", height: "100%" }} />
    </AbsoluteFill>
  );
};

// Fondu d'entrée / de sortie (en images) pour un plan.
export const Fondu: React.FC<{
  readonly children: React.ReactNode;
  readonly frame: number;
  readonly dur: number;
  readonly fadeIn?: number;
  readonly fadeOut?: number;
}> = ({ children, frame, dur, fadeIn = 0, fadeOut = 0 }) => {
  const a = fadeIn > 0 ? Math.min(1, Math.max(0, frame / fadeIn)) : 1;
  const b = fadeOut > 0 ? Math.min(1, Math.max(0, (dur - frame) / fadeOut)) : 1;
  return <AbsoluteFill style={{ opacity: Math.min(a, b) }}>{children}</AbsoluteFill>;
};
