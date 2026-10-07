export type Pose = {
  readonly x: number;
  readonly y: number;
  readonly scale: number;
  readonly facing: 1 | -1;
};

// Indices 0-4 : sages (à gauche), 5-9 : folles (à droite). Toujours 10 places.
export const LOINTAIN: readonly Pose[] = [
  { x: 838, y: 812, scale: 0.27, facing: 1 },
  { x: 872, y: 798, scale: 0.25, facing: 1 },
  { x: 902, y: 818, scale: 0.28, facing: 1 },
  { x: 935, y: 802, scale: 0.26, facing: 1 },
  { x: 962, y: 822, scale: 0.29, facing: 1 },
  { x: 1052, y: 820, scale: 0.29, facing: -1 },
  { x: 1082, y: 800, scale: 0.26, facing: -1 },
  { x: 1112, y: 816, scale: 0.28, facing: -1 },
  { x: 1144, y: 798, scale: 0.25, facing: -1 },
  { x: 1176, y: 812, scale: 0.27, facing: -1 },
];

export const MOYEN: readonly Pose[] = [
  { x: 230, y: 925, scale: 1.05, facing: 1 },
  { x: 420, y: 865, scale: 0.88, facing: 1 },
  { x: 600, y: 905, scale: 1.0, facing: 1 },
  { x: 760, y: 855, scale: 0.84, facing: 1 },
  { x: 880, y: 935, scale: 1.1, facing: 1 },
  { x: 1060, y: 940, scale: 1.1, facing: -1 },
  { x: 1180, y: 855, scale: 0.84, facing: -1 },
  { x: 1330, y: 905, scale: 1.0, facing: -1 },
  { x: 1510, y: 865, scale: 0.88, facing: -1 },
  { x: 1700, y: 925, scale: 1.05, facing: -1 },
];
