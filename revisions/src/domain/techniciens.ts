import { CRITERES } from './referentiel';
import { diffDays, maxDate } from './dates';
import type { CritereEvaluation, Evaluation, ISODate, Intervention, Pdr } from './types';

/** Note globale pondérée sur 5 (§16). */
export function noteGlobale(e?: Evaluation): number | undefined {
  if (!e) return undefined;
  let somme = 0;
  let poids = 0;
  for (const [c, def] of Object.entries(CRITERES) as [CritereEvaluation, { poids: number }][]) {
    const n = e.notes[c];
    if (typeof n === 'number' && n > 0) {
      somme += n * def.poids;
      poids += def.poids;
    }
  }
  return poids ? Math.round((somme / poids) * 10) / 10 : undefined;
}

export interface ControleTechnicienPdr {
  /** PDR nécessaires à l'intervention et non disponibles à l'arrivée du technicien. */
  bloquantes: { pdr: Pdr; dispo: ISODate; ecart: number }[];
  dateDispoMax?: ISODate;
  /** Arrivée technicien − disponibilité PDR (jours) : négatif = technicien AVANT les PDR. */
  marge?: number;
  enRisque: boolean;
}

/**
 * Règle §14 : un technicien extérieur ne doit pas arriver avant les PDR nécessaires.
 * PDR nécessaires = PDR de la même machine (ou toutes les PDR critiques A de la
 * révision si l'intervention ne cible pas de machine).
 */
export function controleTechnicienPdr(
  it: Intervention,
  pdrs: Pdr[],
  dispo: (p: Pdr) => ISODate,
): ControleTechnicienPdr {
  // La règle porte sur la planification : un technicien déjà sur site n'est plus « planifié ».
  if (it.statut === 'ANNULEE' || it.statut === 'TERMINEE' || it.statut === 'SUR_SITE') return { bloquantes: [], enRisque: false };
  const arrivee = it.dateReelle ?? it.datePrevue;
  const concernees = pdrs.filter((p) => !p.horsGamme && (it.machineId ? p.machineId === it.machineId : p.criticite === 'A'));
  const bloquantes = concernees
    .map((pdr) => ({ pdr, dispo: dispo(pdr), ecart: 0 }))
    .map((x) => ({ ...x, ecart: diffDays(arrivee, x.dispo) }))
    .filter((x) => x.ecart > 0)
    .sort((a, b) => b.ecart - a.ecart);
  const dateDispoMax = maxDate(...concernees.map(dispo));
  return {
    bloquantes,
    dateDispoMax,
    marge: dateDispoMax ? diffDays(dateDispoMax, arrivee) : undefined,
    enRisque: bloquantes.length > 0,
  };
}

export const MESSAGE_TECHNICIEN_AVANT_PDR = '🔴 RISQUE — Le technicien est prévu avant la disponibilité des PDR.';
