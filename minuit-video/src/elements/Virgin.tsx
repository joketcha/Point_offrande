import React from "react";
import type { Vierge } from "../lib/vierges";
import { Figure } from "./Figure";

export { Lampe } from "./Lampe";

export type VirginState = {
  /** 0 debout → 1 assise */
  readonly sit?: number;
  /** 0 éveillée → 1 endormie */
  readonly sleep?: number;
  readonly run?: boolean;
  readonly walk?: boolean;
  /** intensité de la lampe, 0 = éteinte */
  readonly lamp?: number;
  /** fumée après extinction 0..1 */
  readonly smoke?: number;
  /** 0 lampe à la poitrine → 1 lampe levée */
  readonly raise?: number;
  /** bras libre tendu vers l'avant 0..1 */
  readonly reach?: number;
  /** rotation de la tête (degrés), négatif = levée */
  readonly head?: number;
  readonly wind?: number;
  /** lumière chaude extérieure (procession, salle) */
  readonly chaud?: number;
};

type VirginProps = VirginState & {
  readonly v: Vierge;
  readonly x: number;
  readonly y: number;
  readonly scale?: number;
  readonly facing?: 1 | -1;
  readonly seed: string;
};

// Une des dix vierges : les sages portent une fiole d'huile à la ceinture.
export const Virgin: React.FC<VirginProps> = ({ v, ...rest }) => (
  <Figure robe={v.robe} manteau={v.voile} peau={v.peau} fiole={v.sage} {...rest} />
);
