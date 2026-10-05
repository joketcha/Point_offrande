import { addDays, diffDays, fmtCourt, maxDate } from './dates';
import { ETAPE, ETAPES_PDR, etapeSuivante, indexEtape } from './referentiel';
import type { EtapePDR, ISODate, ModeTransport, Parametres, Pdr, Revision, Role } from './types';

/**
 * Cycle de vie des PDR : responsable de l'étape bloquante, position physique,
 * date de disponibilité estimée et écart par rapport au besoin.
 */

/** Délai type entre « disponible fournisseur » et l'embarquement (jours). */
export const DELAI_EMBARQUEMENT = 7;

/**
 * Responsable unique de l'action en cours sur la PDR (§25).
 * Une non-conformité prend le pas sur l'étape : expertise → Maintenance,
 * nouvelle commande → Achats, sinon Magasin (traitement de l'écart).
 */
export function responsablePdr(p: Pdr): Role | null {
  if (p.nonConforme) {
    if (p.expertiseRequise) return 'MAINTENANCE';
    if (p.nouvelleCommandeRequise) return 'ACHATS';
    return 'MAGASIN';
  }
  if (p.horsGamme) return 'BMC';
  return ETAPE[p.etape].responsable;
}

export function actionPdr(p: Pdr): string {
  if (p.nonConforme) {
    if (p.expertiseRequise) return 'Expertiser la PDR non conforme et statuer (utilisable / à remplacer)';
    if (p.nouvelleCommandeRequise) return 'Passer une nouvelle commande (PDR non conforme)';
    return "Traiter l'écart de réception avec le fournisseur";
  }
  if (p.horsGamme) return 'Statuer : PDR retirée de la gamme active';
  return ETAPE[p.etape].action;
}

/** Où se trouve la PDR, en une phrase. */
export function positionPdr(p: Pdr): string {
  const i = indexEtape(p.etape);
  if (p.enStock && i < indexEtape('DISPONIBLE')) return 'En stock usine — à réserver';
  if (p.etape === 'DISPONIBLE') return 'Magasin usine — disponible';
  if (i >= indexEtape('ARRIVEE_USINE')) return p.nonConforme ? 'Usine — non conforme' : 'Usine — en réception';
  if (p.etape === 'ARRIVEE_ABIDJAN') return p.modeTransport === 'AERIEN' ? "Aéroport d'Abidjan — en dédouanement" : "Port d'Abidjan — en dédouanement";
  if (i >= indexEtape('CONTENEUR')) {
    const parts = [p.modeTransport === 'AERIEN' && 'Fret aérien', p.modeTransport === 'LOCAL' && 'Livraison locale', p.conteneur && `Conteneur ${p.conteneur}`, p.bateau && `${p.modeTransport === 'AERIEN' ? 'vol' : 'navire'} ${p.bateau}`, p.eta && `ETA ${fmtCourt(p.eta)}`].filter(Boolean);
    return parts.length ? parts.join(' · ') : 'En transit';
  }
  if (i >= indexEtape('COMMANDE_CREEE')) return `Chez le fournisseur ${p.fournisseur || '—'}`;
  return 'Pas encore commandée';
}

/** Dernière date connue de l'historique d'étapes. */
export function dateEtape(p: Pdr): ISODate | undefined {
  return p.dates[p.etape];
}

/** Délai restant de bout en bout à partir d'une étape (jours), hors date ancre. */
function aval(p: Parametres, depuis: 'AVANT_COMMANDE' | 'FOURNISSEUR' | 'EMBARQUEMENT' | 'MER' | 'ABIDJAN' | 'USINE', mode: ModeTransport = 'MARITIME'): number {
  const rec = p.delaiReceptionJours;
  const local = mode === 'LOCAL';
  const ab = local ? 0 : p.delaiAbidjanUsineJours;
  const fret = local ? 1 : mode === 'AERIEN' ? p.delaiFretAerienJours : p.delaiFretJours;
  const emb = local ? 1 : mode === 'AERIEN' ? 3 : DELAI_EMBARQUEMENT;
  switch (depuis) {
    case 'USINE':
      return rec;
    case 'ABIDJAN':
      return ab + rec;
    case 'MER':
      return fret + ab + rec;
    case 'EMBARQUEMENT':
    case 'FOURNISSEUR':
      return emb + fret + ab + rec;
    case 'AVANT_COMMANDE':
      return p.delaiConfirmationJours + emb + fret + ab + rec;
  }
}

/** Délai total d'approvisionnement d'une PDR à partir de la commande (jours). */
export function delaiTotalAppro(pdr: Pdr, p: Parametres): number {
  return pdr.delaiJours + aval(p, 'AVANT_COMMANDE', pdr.modeTransport);
}

/**
 * Date de disponibilité estimée pour la révision.
 * Basée sur la date réelle de l'étape courante, l'ETA, la date promise fournisseur
 * et les délais types (paramètres). Jamais antérieure à aujourd'hui si non disponible.
 */
export function dateDispoEstimee(pdr: Pdr, p: Parametres, today: ISODate): ISODate {
  if (pdr.etape === 'DISPONIBLE' && !pdr.nonConforme) return pdr.dates.DISPONIBLE ?? today;
  if (pdr.enStock) return addDays(today, 1);
  if (pdr.nonConforme) {
    if (pdr.nouvelleCommandeRequise) return addDays(today, delaiTotalAppro(pdr, p));
    return addDays(today, pdr.expertiseRequise ? 7 : 14);
  }
  const d = dateEtape(pdr);
  const m = pdr.modeTransport;
  const depuis = (x?: ISODate) => maxDate(today, x) as ISODate;
  switch (pdr.etape) {
    case 'RECEPTION_SYSTEME':
      return depuis(addDays(d ?? today, 1));
    case 'RECEPTION_PHYSIQUE':
      return depuis(addDays(d ?? today, Math.ceil(p.delaiReceptionJours / 2)));
    case 'ARRIVEE_USINE':
      return depuis(addDays(d ?? today, aval(p, 'USINE', m)));
    case 'ARRIVEE_ABIDJAN':
      return addDays(depuis(addDays(d ?? today, m === 'LOCAL' ? 0 : p.delaiAbidjanUsineJours)), p.delaiReceptionJours);
    case 'TRANSIT':
    case 'BATEAU':
    case 'CONTENEUR':
    case 'PRETE_EXPEDITION':
      if (pdr.eta) return addDays(depuis(pdr.eta), aval(p, 'ABIDJAN', m));
      return addDays(depuis(d), pdr.etape === 'TRANSIT' || pdr.etape === 'BATEAU' ? aval(p, 'MER', m) : aval(p, 'EMBARQUEMENT', m));
    case 'DISPO_FOURNISSEUR':
      return addDays(depuis(d), aval(p, 'FOURNISSEUR', m));
    case 'COMMANDE_CONFIRMEE':
    case 'COMMANDE_ENVOYEE': {
      const promise = pdr.dateLivraisonPromise ?? addDays(pdr.dates.COMMANDE_ENVOYEE ?? d ?? today, pdr.delaiJours);
      return addDays(depuis(promise), aval(p, 'FOURNISSEUR', m));
    }
    default:
      return addDays(today, delaiTotalAppro(pdr, p));
  }
}

/** Date à laquelle la PDR doit être disponible (début de révision − marge). */
export function dateRequise(rev: Revision, p: Parametres): ISODate {
  return addDays(rev.dateReelleDebut ?? rev.datePrevue, -p.margePdrJours);
}

/** Date limite de commande pour tenir la date requise. */
export function dateLimiteCommande(pdr: Pdr, rev: Revision, p: Parametres): ISODate {
  return addDays(dateRequise(rev, p), -delaiTotalAppro(pdr, p));
}

/** Avance la PDR d'une étape et horodate le passage (historique conservé). */
export function avancerPdr(pdr: Pdr, date: ISODate, cible?: EtapePDR): Pdr {
  const next = cible ?? etapeSuivante(pdr.etape);
  if (!next) return pdr;
  if (indexEtape(next) <= indexEtape(pdr.etape)) throw new Error('Une PDR ne peut pas revenir en arrière dans son cycle.');
  const dates = { ...pdr.dates };
  // Les étapes franchies d'un coup reçoivent la même date (traçabilité).
  for (let i = indexEtape(pdr.etape) + 1; i <= indexEtape(next); i++) {
    const e = ETAPES_PDR[i];
    if (!dates[e]) dates[e] = date;
  }
  return { ...pdr, etape: next, dates };
}

/** Avancement pondéré 0..1 de la PDR dans son cycle. */
export function avancementPdr(p: Pdr): number {
  if (p.enStock) return p.etape === 'DISPONIBLE' ? 1 : 0.9;
  return indexEtape(p.etape) / (ETAPES_PDR.length - 1);
}

export function estDisponible(p: Pdr): boolean {
  return p.etape === 'DISPONIBLE' && !p.nonConforme;
}

export function joursDansEtape(p: Pdr, today: ISODate): number | undefined {
  const d = dateEtape(p);
  return d ? diffDays(d, today) : undefined;
}
