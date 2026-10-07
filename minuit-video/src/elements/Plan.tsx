import React from "react";
import { AbsoluteFill } from "remotion";

// Fond noir commun à chaque scène dessinée.
export const Plan: React.FC<{ readonly children: React.ReactNode }> = ({ children }) => (
  <AbsoluteFill style={{ backgroundColor: "#000" }}>{children}</AbsoluteFill>
);

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
