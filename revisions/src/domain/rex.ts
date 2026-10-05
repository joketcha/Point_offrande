import type { AnalyseRevision } from './analyse';
import { diffDays } from './dates';
import type { DomaineRex, ISODate, Rex, RexConstat, RexLecon, Role } from './types';

/**
 * REX (§33) créé automatiquement à la clôture : constats chiffrés par domaine,
 * plus des propositions de leçons. Les leçons sont reprises dans la préparation
 * de la révision suivante de la même ligne.
 */

export const DOMAINES_REX: Record<DomaineRex, { libelle: string; responsable: Role }> = {
  PDR: { libelle: 'PDR', responsable: 'BMC' },
  FOURNISSEURS: { libelle: 'Fournisseurs', responsable: 'ACHATS' },
  ACHATS: { libelle: 'Achats', responsable: 'ACHATS' },
  TRANSIT: { libelle: 'Transit', responsable: 'TRANSIT' },
  RECEPTION: { libelle: 'Réception', responsable: 'MAGASIN' },
  TECHNICIENS: { libelle: 'Techniciens', responsable: 'MAINTENANCE' },
  TRAVAUX: { libelle: 'Travaux', responsable: 'MAINTENANCE' },
  RETARDS: { libelle: 'Retards / planning', responsable: 'BMC' },
  REDEMARRAGE: { libelle: 'Redémarrage', responsable: 'MAINTENANCE' },
  STABILISATION: { libelle: 'Stabilisation', responsable: 'MAINTENANCE' },
};

export function constatsAutomatiques(a: AnalyseRevision): RexConstat[] {
  const c: RexConstat[] = [];
  const add = (domaine: DomaineRex, constat: string) => c.push({ domaine, constat, auto: true });
  const pdrs = a.pdrs.filter((x) => !x.pdr.horsGamme);
  const tard = pdrs.filter((x) => x.pdr.dates.DISPONIBLE && x.pdr.dates.DISPONIBLE > x.requise);
  const jamais = pdrs.filter((x) => !x.disponible);
  add('PDR', `${pdrs.length} PDR (${a.pdrStats.critiques} critiques). ${tard.length} disponible(s) après la date requise, ${jamais.length} jamais disponible(s).${tard.length ? ` En retard : ${tard.slice(0, 5).map((x) => `${x.pdr.ref} (+${diffDays(x.requise, x.pdr.dates.DISPONIBLE!)} j)`).join(', ')}.` : ''}`);

  const parFournisseur = new Map<string, { n: number; retard: number }>();
  for (const x of pdrs.filter((p) => p.pdr.dateLivraisonPromise && p.pdr.dates.DISPO_FOURNISSEUR)) {
    const f = parFournisseur.get(x.pdr.fournisseur) ?? { n: 0, retard: 0 };
    f.n++;
    if (x.pdr.dates.DISPO_FOURNISSEUR! > x.pdr.dateLivraisonPromise!) f.retard++;
    parFournisseur.set(x.pdr.fournisseur, f);
  }
  const fr = [...parFournisseur.entries()].filter(([, v]) => v.retard > 0);
  add('FOURNISSEURS', fr.length ? `Fournisseurs en retard sur promesse : ${fr.map(([k, v]) => `${k} (${v.retard}/${v.n})`).join(', ')}.` : 'Aucun retard fournisseur sur date promise.');

  const confirm = pdrs.filter((x) => x.pdr.dates.COMMANDE_ENVOYEE && x.pdr.dates.COMMANDE_CONFIRMEE).map((x) => diffDays(x.pdr.dates.COMMANDE_ENVOYEE!, x.pdr.dates.COMMANDE_CONFIRMEE!));
  const tardCde = pdrs.filter((x) => x.pdr.dates.COMMANDE_CREEE && x.pdr.dates.COMMANDE_CREEE > x.limiteCommande);
  add('ACHATS', `Délai moyen de confirmation : ${confirm.length ? Math.round(confirm.reduce((s, x) => s + x, 0) / confirm.length) : '—'} j. ${tardCde.length} commande(s) passée(s) après la date limite.`);

  const eta = pdrs.filter((x) => x.pdr.etaInitiale && x.pdr.dates.ARRIVEE_ABIDJAN).map((x) => diffDays(x.pdr.etaInitiale!, x.pdr.dates.ARRIVEE_ABIDJAN!));
  const modifs = pdrs.reduce((s, x) => s + x.pdr.etaHistorique.length, 0);
  add('TRANSIT', `${eta.length} arrivée(s) à Abidjan, écart moyen ETA ${eta.length ? Math.round(eta.reduce((s, x) => s + x, 0) / eta.length) : '—'} j, ${modifs} modification(s) d'ETA.`);

  const recep = pdrs.filter((x) => x.pdr.dates.ARRIVEE_USINE && x.pdr.dates.RECEPTION_SYSTEME).map((x) => diffDays(x.pdr.dates.ARRIVEE_USINE!, x.pdr.dates.RECEPTION_SYSTEME!));
  const nc = pdrs.filter((x) => x.pdr.nonConforme || x.pdr.ecartReception);
  add('RECEPTION', `Délai moyen arrivée usine → réception système : ${recep.length ? Math.round((recep.reduce((s, x) => s + x, 0) / recep.length) * 10) / 10 : '—'} j. ${nc.length} écart(s) / non-conformité(s).`);

  const notes = a.interventions.filter((i) => i.note !== undefined);
  add('TECHNICIENS', `${a.interventions.length} intervention(s) extérieure(s), ${notes.length} évaluée(s)${notes.length ? `, note moyenne ${Math.round((notes.reduce((s, i) => s + i.note!, 0) / notes.length) * 10) / 10}/5` : ''}. ${a.techStats.enRisquePdr} technicien(s) arrivé(s) avant les PDR.`);

  const t = a.travaux;
  const retards = t.taches.filter((x) => x.retardJours > 0);
  add('TRAVAUX', `${t.taches.length} travaux, ${t.nbTermines} terminés, ${retards.length} en retard${retards.length ? ` (${retards.slice(0, 4).map((x) => `${x.travail.code} +${x.retardJours} j`).join(', ')})` : ''}.`);

  add('RETARDS', `${a.derive.nbReports} report(s), dérive planning ${a.derive.derivePlanning} j, écart de fin ${a.ecartFin} j vs prévu actuel (${a.ecartFinInitiale} j vs initial).`);
  add('REDEMARRAGE', `Redémarrage ${a.redemarrage.dureeReelleH ?? '—'} h pour ${a.redemarrage.dureePrevueH} h prévues, ${a.redemarrage.nbIncidents} incident(s) (${a.redemarrage.heuresIncidents} h).`);
  add('STABILISATION', `Stabilisation ${a.stabilisation.dureeReelleJ ?? '—'} j pour ${a.stabilisation.dureePrevueJ} j prévus ; ${a.stabilisation.totalArrets} arrêts, ${a.stabilisation.totalMicroArrets} micro-arrêts, ${a.stabilisation.totalDefauts} défauts, TRS moyen ${a.stabilisation.moyTrs ?? '—'} %.`);
  return c;
}

/** Leçons proposées automatiquement à partir des écarts constatés. */
export function leconsProposees(a: AnalyseRevision, prefixeId: string): RexLecon[] {
  const l: RexLecon[] = [];
  const add = (domaine: DomaineRex, lecon: string, action: string) =>
    l.push({ id: `${prefixeId}-${l.length + 1}`, domaine, lecon, actionProchaineRevision: action, responsable: DOMAINES_REX[domaine].responsable, integree: false });
  const tard = a.pdrs.filter((x) => x.pdr.dates.DISPONIBLE && x.pdr.dates.DISPONIBLE > x.requise);
  if (tard.length) add('PDR', `${tard.length} PDR disponibles trop tard (${tard.map((x) => x.pdr.ref).slice(0, 3).join(', ')}).`, 'Commander ces références dès J-7 mois et vérifier leur délai réel dans la gamme.');
  if (a.techStats.enRisquePdr) add('TECHNICIENS', 'Des techniciens ont été planifiés avant la disponibilité des PDR.', 'Caler l\'arrivée des prestataires sur la disponibilité PDR + 1 j.');
  if ((a.redemarrage.depassementH ?? 0) > 0) add('REDEMARRAGE', `Redémarrage dépassé de ${a.redemarrage.depassementH} h.`, 'Préparer une check-list de redémarrage spécifique à la ligne et prévoir le prestataire au redémarrage.');
  if ((a.stabilisation.depassementJ ?? 0) > 0) add('STABILISATION', `Stabilisation plus longue de ${a.stabilisation.depassementJ} j.`, 'Planifier des réglages fins avec la Production avant la première production.');
  if (a.travaux.taches.some((x) => x.retardJours > 0)) add('TRAVAUX', 'Des travaux du chemin critique ont dérivé.', 'Revoir les durées standard des travaux en retard dans le planning type.');
  if (a.derive.nbReports) add('RETARDS', `${a.derive.nbReports} report(s) de la révision.`, 'Valider la date de révision avec la Production avant J-7 mois.');
  return l;
}

export function creerRex(a: AnalyseRevision, today: ISODate): Rex {
  return {
    id: `rex-${a.revision.id}`,
    revisionId: a.revision.id,
    ligneId: a.revision.ligneId,
    dateCreation: today,
    statut: 'BROUILLON',
    constats: constatsAutomatiques(a),
    lecons: leconsProposees(a, `rex-${a.revision.id}`),
    pointsPositifs: '',
    pointsNegatifs: '',
  };
}
