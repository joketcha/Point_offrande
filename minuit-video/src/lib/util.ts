import { Easing, interpolate } from "remotion";
import { noise2D } from "@remotion/noise";

export const W = 1920;
export const H = 1080;

export const clamp = {
  extrapolateLeft: "clamp",
  extrapolateRight: "clamp",
} as const;

// Courbe douce pour les mouvements de caméra lents et fluides.
export const lent = Easing.bezier(0.45, 0, 0.55, 1);
export const sortie = Easing.bezier(0.16, 1, 0.3, 1);

export const tween = (
  frame: number,
  input: [number, number],
  output: [number, number],
  easing = lent,
) => interpolate(frame, input, output, { ...clamp, easing });

// Bruit organique (vent, vacillement des flammes, respiration).
export const bruit = (seed: string, frame: number, vitesse = 0.1, y = 0) =>
  noise2D(seed, frame * vitesse, y);

export const mix = (a: number, b: number, t: number) => a + (b - a) * t;
