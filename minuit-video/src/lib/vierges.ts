// Toujours EXACTEMENT DIX vierges : indices 0-4 = sages, 5-9 = folles.
// Vêtements bibliques différents mais cohérents (tons terre, lin, laine teinte).
export type Vierge = {
  readonly nom: string;
  readonly sage: boolean;
  readonly voile: string;
  readonly robe: string;
  readonly peau: string;
};

export const VIERGES: readonly Vierge[] = [
  { nom: "Sage 1", sage: true, voile: "#d9ccb0", robe: "#3a2d22", peau: "#6b4530" },
  { nom: "Sage 2", sage: true, voile: "#b89b6a", robe: "#2e2a26", peau: "#5e3c2a" },
  { nom: "Sage 3", sage: true, voile: "#9fb0c2", robe: "#2b2f38", peau: "#73503a" },
  { nom: "Sage 4", sage: true, voile: "#e6dcc6", robe: "#4a3726", peau: "#664230" },
  { nom: "Sage 5", sage: true, voile: "#c7b28a", robe: "#33291f", peau: "#5a3a28" },
  { nom: "Folle 1", sage: false, voile: "#8a4a32", robe: "#2a1e18", peau: "#6a4632" },
  { nom: "Folle 2", sage: false, voile: "#6e2f2c", robe: "#2c2420", peau: "#60402c" },
  { nom: "Folle 3", sage: false, voile: "#6b6a44", robe: "#26241c", peau: "#72503a" },
  { nom: "Folle 4", sage: false, voile: "#4f5468", robe: "#22232a", peau: "#5c3c2a" },
  { nom: "Folle 5", sage: false, voile: "#7a5a3c", robe: "#2d2219", peau: "#684834" },
];

if (VIERGES.length !== 10) {
  throw new Error("Le film exige exactement dix vierges.");
}

export const SAGES = VIERGES.filter((v) => v.sage);
export const FOLLES = VIERGES.filter((v) => !v.sage);
