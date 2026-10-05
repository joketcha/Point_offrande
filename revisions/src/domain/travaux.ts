import { calculerCpm, type Cpm } from './cpm';
import { addDays, diffDays } from './dates';
import { debutEffectif } from './planning';
import type { ISODate, Revision, Travail } from './types';

export interface TravailAnalyse {
  travail: Travail;
  /** Dates planifiées (réseau de référence, ancré sur le début effectif). */
  debutPrevu: ISODate;
  finPrevue: ISODate;
  /** Dates prévisionnelles (avec le réel et l'avancement). */
  debutPrev: ISODate;
  finPrev: ISODate;
  marge: number;
  critique: boolean;
  enRetard: boolean;
  retardJours: number;
  dureeReelle?: number;
}

export interface AnalyseTravaux {
  taches: TravailAnalyse[];
  /** Fin planifiée des travaux (réseau de référence). */
  finPlanifiee: ISODate;
  /** Fin prévisionnelle (réel + reste à faire). */
  finPrevisionnelle: ISODate;
  /** Fin prévisionnelle − fin prévue de la révision. */
  ecartFin: number;
  chemin: string[];
  cycle: string[];
  nbTermines: number;
  nbEnCours: number;
  nbRetard: number;
  nbBloques: number;
}

/**
 * Deux réseaux CPM :
 *  - référence : durées prévues, ancré sur le début effectif de la révision ;
 *  - prévisionnel : tâches terminées/en cours figées sur leur réel, reste à faire
 *    poussé à aujourd'hui si la révision a démarré. Le chemin critique affiché est
 *    celui du prévisionnel (ce qui peut encore décaler la fin).
 */
export function analyserTravaux(rev: Revision, travaux: Travail[], today: ISODate, dispoPdr?: (t: Travail) => ISODate | undefined): AnalyseTravaux {
  const origine = debutEffectif(rev);
  const demarree = !!rev.dateReelleDebut && today >= rev.dateReelleDebut;
  const tOff = diffDays(origine, today);

  const reference: Cpm = calculerCpm(
    travaux.map((t) => ({ id: t.id, duree: t.dureePrevueJours, deps: t.dependances, debutMin: t.decalageMinJours })),
    rev.dureePrevueJours,
  );

  const prevision: Cpm = calculerCpm(
    travaux.map((t) => {
      if (t.statut === 'TERMINE' && t.dateReelleDebut && t.dateReelleFin) {
        return { id: t.id, duree: Math.max(0, diffDays(t.dateReelleDebut, t.dateReelleFin)), deps: t.dependances, debutMin: diffDays(origine, t.dateReelleDebut), fixe: true };
      }
      if (t.dateReelleDebut && (t.statut === 'EN_COURS' || t.statut === 'BLOQUE' || t.statut === 'TERMINE')) {
        const es = diffDays(origine, t.dateReelleDebut);
        const ecoule = tOff - es + (t.statut === 'BLOQUE' ? 1 : 0);
        return { id: t.id, duree: Math.max(t.dureePrevueJours, ecoule + (t.statut === 'BLOQUE' ? 1 : 0)), deps: t.dependances, debutMin: es, fixe: true };
      }
      let min = demarree ? Math.max(t.decalageMinJours, tOff + (t.statut === 'BLOQUE' ? 1 : 0)) : t.decalageMinJours;
      // Une tâche ne peut pas démarrer avant la disponibilité de ses PDR.
      const dispo = dispoPdr?.(t);
      if (dispo) min = Math.max(min, diffDays(origine, dispo));
      return { id: t.id, duree: t.dureePrevueJours, deps: t.dependances, debutMin: min };
    }),
    rev.dureePrevueJours,
  );

  const taches: TravailAnalyse[] = travaux.map((t) => {
    const r = reference.taches[t.id];
    const p = prevision.taches[t.id];
    const debutPrevu = addDays(origine, Math.floor(r.es));
    const finPrevue = addDays(origine, Math.ceil(r.ef));
    const finPrev = addDays(origine, Math.ceil(p.ef));
    const termine = t.statut === 'TERMINE';
    const finConstatee = termine ? t.dateReelleFin ?? finPrev : finPrev;
    const retardJours = Math.max(0, diffDays(finPrevue, finConstatee));
    const enRetard =
      (!termine && (today > finPrevue || (today > debutPrevu && !t.dateReelleDebut) || retardJours > 0)) || (termine && retardJours > 0);
    return {
      travail: t,
      debutPrevu,
      finPrevue,
      debutPrev: addDays(origine, Math.floor(p.es)),
      finPrev,
      marge: Math.round(p.marge * 10) / 10,
      critique: !termine && p.critique,
      enRetard: enRetard && (demarree || termine),
      retardJours,
      dureeReelle: t.dateReelleDebut && t.dateReelleFin ? diffDays(t.dateReelleDebut, t.dateReelleFin) : undefined,
    };
  });

  const finPlanifiee = addDays(origine, Math.ceil(Math.max(reference.fin, rev.dureePrevueJours)));
  const finRef = addDays(origine, rev.dureePrevueJours);
  const finPrevisionnelle = rev.dateReelleFin ?? (travaux.length ? addDays(origine, Math.ceil(prevision.fin)) : finRef);
  return {
    taches,
    finPlanifiee,
    finPrevisionnelle,
    ecartFin: diffDays(finRef, finPrevisionnelle),
    chemin: prevision.chemin.filter((id) => travaux.find((t) => t.id === id)?.statut !== 'TERMINE'),
    cycle: prevision.cycle,
    nbTermines: travaux.filter((t) => t.statut === 'TERMINE').length,
    nbEnCours: travaux.filter((t) => t.statut === 'EN_COURS').length,
    nbRetard: taches.filter((t) => t.enRetard && t.travail.statut !== 'TERMINE').length,
    nbBloques: travaux.filter((t) => t.statut === 'BLOQUE').length,
  };
}
