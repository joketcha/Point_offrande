import { diffDays, diffHours } from './dates';
import type { IncidentRedemarrage, Revision, StabilisationJour } from './types';

export interface AnalyseRedemarrage {
  /** Démarrage → première production conforme (heures). */
  dureePrevueH: number;
  dureeReelleH?: number;
  depassementH?: number;
  heuresIncidents: number;
  nbIncidents: number;
  difficile: boolean;
}

export function analyserRedemarrage(rev: Revision, incidents: IncidentRedemarrage[]): AnalyseRedemarrage {
  const j = rev.jalons;
  const debut = j.DEMARRAGE?.reel;
  const fin = j.PREMIERE_CONFORME?.reel;
  const dureeReelleH = debut && fin ? diffHours(debut, fin) : undefined;
  const heuresIncidents = incidents.reduce((s, i) => s + (i.dureeSupH || 0), 0);
  const depassementH = dureeReelleH !== undefined ? Math.round((dureeReelleH - rev.dureeRedemarragePrevueH) * 10) / 10 : undefined;
  return {
    dureePrevueH: rev.dureeRedemarragePrevueH,
    dureeReelleH,
    depassementH,
    heuresIncidents,
    nbIncidents: incidents.length,
    difficile: incidents.length > 0 || (depassementH ?? 0) > 0,
  };
}

export interface AnalyseStabilisation {
  dureePrevueJ: number;
  /** Jours entre première production conforme et fin de stabilisation (ou dernier relevé). */
  dureeReelleJ?: number;
  depassementJ?: number;
  stabilisee: boolean;
  /** Nombre de jours consécutifs (en fin de série) au-dessus des cibles. */
  joursConformesConsecutifs: number;
  moyTrs?: number;
  totalArrets: number;
  totalMicroArrets: number;
  totalDefauts: number;
}

/** Nombre de jours consécutifs conformes requis pour déclarer la ligne stabilisée. */
export const JOURS_STABLES_REQUIS = 3;

export function analyserStabilisation(rev: Revision, jours: StabilisationJour[]): AnalyseStabilisation {
  const tri = [...jours].sort((a, b) => a.date.localeCompare(b.date));
  let consecutifs = 0;
  for (let i = tri.length - 1; i >= 0; i--) {
    const x = tri[i];
    if (x.vitessePct >= rev.cibleVitessePct && x.qualitePct >= rev.cibleQualitePct) consecutifs++;
    else break;
  }
  const debut = rev.jalons.PREMIERE_CONFORME?.reel?.slice(0, 10);
  const finReelle = rev.jalons.FIN_STABILISATION?.reel?.slice(0, 10);
  const fin = finReelle ?? tri.at(-1)?.date;
  const dureeReelleJ = debut && fin ? Math.max(0, diffDays(debut, fin)) : undefined;
  return {
    dureePrevueJ: rev.dureeStabilisationPrevueJ,
    dureeReelleJ,
    depassementJ: dureeReelleJ !== undefined ? dureeReelleJ - rev.dureeStabilisationPrevueJ : undefined,
    stabilisee: !!finReelle || consecutifs >= JOURS_STABLES_REQUIS,
    joursConformesConsecutifs: consecutifs,
    moyTrs: tri.length ? Math.round(tri.reduce((s, x) => s + x.trsPct, 0) / tri.length) : undefined,
    totalArrets: tri.reduce((s, x) => s + x.arrets, 0),
    totalMicroArrets: tri.reduce((s, x) => s + x.microArrets, 0),
    totalDefauts: tri.reduce((s, x) => s + x.defauts, 0),
  };
}
