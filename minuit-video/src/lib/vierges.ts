// Toujours EXACTEMENT DIX vierges : indices 0-4 = sages, 5-9 = folles.
// Vêtements bibliques différents mais cohérents (tons terre, lin, laine teinte).
export type Vierge = {
  readonly nom: string;
  readonly sage: boolean;
  readonly voile: string;
  readonly robe: string;
};

export const VIERGES: readonly Vierge[] = [
  { nom: "Sage 1", sage: true, voile: "#d9ccb0", robe: "#3a2d22" },
  { nom: "Sage 2", sage: true, voile: "#b89b6a", robe: "#2e2a26" },
  { nom: "Sage 3", sage: true, voile: "#9fb0c2", robe: "#2b2f38" },
  { nom: "Sage 4", sage: true, voile: "#e6dcc6", robe: "#4a3726" },
  { nom: "Sage 5", sage: true, voile: "#c7b28a", robe: "#33291f" },
  { nom: "Folle 1", sage: false, voile: "#8a4a32", robe: "#2a1e18" },
  { nom: "Folle 2", sage: false, voile: "#6e2f2c", robe: "#2c2420" },
  { nom: "Folle 3", sage: false, voile: "#6b6a44", robe: "#26241c" },
  { nom: "Folle 4", sage: false, voile: "#4f5468", robe: "#22232a" },
  { nom: "Folle 5", sage: false, voile: "#7a5a3c", robe: "#2d2219" },
];

if (VIERGES.length !== 10) {
  throw new Error("Le film exige exactement dix vierges.");
}

export const SAGES = VIERGES.filter((v) => v.sage);
export const FOLLES = VIERGES.filter((v) => !v.sage);
