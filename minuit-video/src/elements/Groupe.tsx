import React from "react";
import type { Pose } from "../lib/layouts";
import { VIERGES } from "../lib/vierges";
import { Virgin, type VirginState } from "./Virgin";

type Etat = VirginState & { readonly dx?: number; readonly dy?: number; readonly visible?: boolean; readonly facing?: 1 | -1 };

// Les dix vierges (ou un sous-ensemble), dessinées de l'arrière vers l'avant.
export const Groupe: React.FC<{
  readonly layout: readonly Pose[];
  readonly state: (i: number) => Etat;
  readonly only?: "sages" | "folles";
}> = ({ layout, state, only }) => {
  if (layout.length !== 10) {
    throw new Error("Une disposition doit avoir exactement dix places.");
  }
  const ordre = VIERGES.map((v, i) => ({ v, i, p: layout[i] }))
    .filter(({ v }) => (only === "sages" ? v.sage : only === "folles" ? !v.sage : true))
    .sort((a, b) => a.p.y - b.p.y);
  return (
    <g>
      {ordre.map(({ v, i, p }) => {
        const { dx = 0, dy = 0, visible = true, facing, ...etat } = state(i);
        if (!visible) return null;
        return (
          <Virgin
            key={v.nom}
            v={v}
            seed={`v${i}`}
            x={p.x + dx}
            y={p.y + dy}
            scale={p.scale}
            facing={facing ?? p.facing}
            {...etat}
          />
        );
      })}
    </g>
  );
};
