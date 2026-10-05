import { ACTIONS_J7 } from './referentiel';
import { addDays, addMonths, diffDays } from './dates';
import type { ActionPreparation, ISODate, Parametres, Revision } from './types';

/**
 * Planification, reports et préparation.
 * Règle : une ancienne date n'est jamais supprimée — un report ajoute une version.
 */

/** Début de référence pour le pilotage : réel s'il existe, sinon prévu actuel. */
export function debutEffectif(r: Revision): ISODate {
  return r.dateReelleDebut ?? r.datePrevue;
}

/** Fin prévue actuelle (date de remise à disposition de la ligne). */
export function finPrevue(r: Revision): ISODate {
  return addDays(r.datePrevue, r.dureePrevueJours);
}

export function finInitiale(r: Revision): ISODate {
  return addDays(r.dateInitiale, r.dureePrevueJours);
}

export function dureeReelle(r: Revision, today?: ISODate): number | undefined {
  if (!r.dateReelleDebut) return undefined;
  if (r.dateReelleFin) return diffDays(r.dateReelleDebut, r.dateReelleFin);
  return today ? diffDays(r.dateReelleDebut, today) : undefined;
}

export interface Derive {
  nbReports: number;
  /** Prévu actuel − prévu initial (jours). */
  derivePlanning: number;
  /** Somme des décalages successifs, en valeur absolue (jours). */
  decalageCumule: number;
  /** Début réel − prévu actuel (jours), si démarrée. */
  ecartDebut?: number;
  /** Début réel − prévu initial (jours), si démarrée. */
  ecartDebutInitial?: number;
}

export function derive(r: Revision): Derive {
  return {
    nbReports: r.reports.length,
    derivePlanning: diffDays(r.dateInitiale, r.datePrevue),
    decalageCumule: r.reports.reduce((s, x) => s + Math.abs(diffDays(x.ancienneDate, x.nouvelleDate)), 0),
    ecartDebut: r.dateReelleDebut ? diffDays(r.datePrevue, r.dateReelleDebut) : undefined,
    ecartDebutInitial: r.dateReelleDebut ? diffDays(r.dateInitiale, r.dateReelleDebut) : undefined,
  };
}

/** Applique un report : ajoute une version, met à jour la date prévue, conserve l'initiale. */
export function appliquerReport(r: Revision, nouvelleDate: ISODate, motif: string, auteur: string, today: ISODate): Revision {
  if (!motif.trim()) throw new Error('Le motif du report est obligatoire.');
  if (nouvelleDate === r.datePrevue) throw new Error('La nouvelle date est identique à la date prévue actuelle.');
  if (r.dateReelleDebut) throw new Error('Révision déjà démarrée : un report n\'est plus possible.');
  const report = {
    version: r.reports.length + 1,
    ancienneDate: r.datePrevue,
    nouvelleDate,
    motif: motif.trim(),
    auteur,
    date: today,
  };
  // Les actions de préparation non faites suivent la nouvelle date.
  const decal = diffDays(r.datePrevue, nouvelleDate);
  const actionsPreparation = r.actionsPreparation.map((a) => (a.faite ? a : { ...a, echeance: addDays(a.echeance, decal) }));
  return { ...r, datePrevue: nouvelleDate, reports: [...r.reports, report], actionsPreparation };
}

/** Date de lancement de la préparation (J-7 mois par défaut). */
export function lancementPreparation(r: Revision, p: Parametres): ISODate {
  return addMonths(r.datePrevue, -p.moisPreparation);
}

/** Génère les actions J-7 mois si la date est atteinte et qu'elles n'existent pas encore. */
export function actionsPreparationAGenerer(r: Revision, p: Parametres, today: ISODate, anticipe = false): ActionPreparation[] {
  if (r.actionsPreparation.length > 0) return [];
  if (r.statut === 'ANNULEE') return [];
  const lancement = lancementPreparation(r, p);
  if (today < lancement && !anticipe) return [];
  // Lancement anticipé : les échéances partent d'aujourd'hui.
  const base = today < lancement ? today : lancement;
  return ACTIONS_J7.map((a) => ({
    id: `${r.id}-prep-${a.code}`,
    code: a.code,
    libelle: a.libelle,
    responsable: a.responsable,
    // Échéance jamais postérieure à la veille de la révision.
    echeance: [addDays(base, a.offsetJours), addDays(r.datePrevue, -30)].sort()[0],
    faite: false,
  }));
}
