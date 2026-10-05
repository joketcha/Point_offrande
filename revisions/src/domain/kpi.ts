import type { AnalyseRevision } from './analyse';
import { diffDays } from './dates';
import type { Donnees, ISODate } from './types';

/** Indicateurs (§32). Les valeurs absentes (pas de donnée) sont `undefined`. */

export interface Kpi {
  cle: string;
  libelle: string;
  valeur?: number;
  unite: string;
  /** Sens souhaitable : 'haut' = plus c'est haut mieux c'est. */
  sens: 'haut' | 'bas';
  cible?: number;
  base: string;
}

export interface FamilleKpi {
  famille: string;
  kpis: Kpi[];
}

const moy = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : undefined);
const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : undefined);

export function calculerKpis(d: Donnees, analyses: AnalyseRevision[], today: ISODate): FamilleKpi[] {
  const actives = analyses.filter((a) => a.revision.statut !== 'ANNULEE');
  const demarrees = actives.filter((a) => a.revision.dateReelleDebut);
  const finies = actives.filter((a) => a.revision.dateReelleFin);

  // Planning
  const respectDebut = demarrees.filter((a) => (a.derive.ecartDebutInitial ?? 0) <= 0).length;
  const reportees = actives.filter((a) => a.derive.nbReports > 0).length;

  // PDR (réceptionnées) : disponibles à temps = date DISPONIBLE ≤ date requise.
  const pdrs = analyses.flatMap((a) => a.pdrs.filter((x) => !x.pdr.horsGamme && !x.pdr.enStock));
  const pdrDispo = pdrs.filter((x) => x.pdr.dates.DISPONIBLE);
  const aTemps = pdrDispo.filter((x) => x.pdr.dates.DISPONIBLE! <= x.requise).length;
  const crit = analyses.filter((a) => a.revision.dateReelleDebut || a.revision.statut === 'PRETE').flatMap((a) => a.pdrs.filter((x) => x.pdr.criticite === 'A' && !x.pdr.horsGamme));
  // Commandes échues : date promise passée ou PDR déjà disponible chez le fournisseur.
  const avecPromesse = pdrs.filter((x) => x.pdr.dateLivraisonPromise && (x.pdr.dates.DISPO_FOURNISSEUR || x.pdr.dateLivraisonPromise < today));
  const fournRetard = avecPromesse.filter((x) => (x.pdr.dates.DISPO_FOURNISSEUR ?? today) > x.pdr.dateLivraisonPromise!);
  const delaiAppro = pdrDispo.filter((x) => x.pdr.dates.COMMANDE_CREEE).map((x) => diffDays(x.pdr.dates.COMMANDE_CREEE!, x.pdr.dates.DISPONIBLE!));

  // Transit
  const fournAbj = pdrs.filter((x) => x.pdr.dates.DISPO_FOURNISSEUR && x.pdr.dates.ARRIVEE_ABIDJAN).map((x) => diffDays(x.pdr.dates.DISPO_FOURNISSEUR!, x.pdr.dates.ARRIVEE_ABIDJAN!));
  const abjUsine = pdrs.filter((x) => x.pdr.dates.ARRIVEE_ABIDJAN && x.pdr.dates.ARRIVEE_USINE).map((x) => diffDays(x.pdr.dates.ARRIVEE_ABIDJAN!, x.pdr.dates.ARRIVEE_USINE!));
  const ecartsEta = pdrs.filter((x) => x.pdr.etaInitiale && x.pdr.dates.ARRIVEE_ABIDJAN).map((x) => diffDays(x.pdr.etaInitiale!, x.pdr.dates.ARRIVEE_ABIDJAN!));
  const retardsTransit = pdrs.filter((x) => x.pdr.etaInitiale && ((x.pdr.dates.ARRIVEE_ABIDJAN ?? x.pdr.eta ?? '') > x.pdr.etaInitiale)).length;

  // Travaux
  const travaux = analyses.flatMap((a) => a.travaux.taches);
  const termines = travaux.filter((t) => t.travail.statut === 'TERMINE');
  const aTempsT = termines.filter((t) => t.retardJours <= 0).length;
  const dureesT = termines.filter((t) => t.dureeReelle !== undefined).map((t) => t.dureeReelle!);

  // Redémarrage
  const redem = analyses.filter((a) => a.redemarrage.dureeReelleH !== undefined);
  const stab = analyses.filter((a) => a.revision.jalons.FIN_STABILISATION?.reel && a.stabilisation.dureeReelleJ !== undefined);

  // Prestataires
  const evals = d.interventions.filter((i) => i.evaluation);
  const noteMoy = (k: keyof NonNullable<(typeof evals)[number]['evaluation']>['notes']) => moy(evals.map((i) => i.evaluation!.notes[k]));
  const notes = analyses.flatMap((a) => a.interventions.filter((i) => i.note !== undefined).map((i) => i.note!));

  return [
    {
      famille: 'Planning',
      kpis: [
        { cle: 'respect', libelle: 'Taux de respect du planning initial (début)', valeur: pct(respectDebut, demarrees.length), unite: '%', sens: 'haut', cible: 90, base: `${demarrees.length} révision(s) démarrée(s)` },
        { cle: 'report', libelle: 'Taux de report', valeur: pct(reportees, actives.length), unite: '%', sens: 'bas', cible: 10, base: `${actives.length} révision(s)` },
        { cle: 'nbReports', libelle: 'Nombre moyen de reports', valeur: moy(actives.map((a) => a.derive.nbReports)), unite: '', sens: 'bas', base: 'par révision' },
        { cle: 'derive', libelle: 'Dérive moyenne (prévu actuel − initial)', valeur: moy(actives.map((a) => a.derive.derivePlanning)), unite: 'j', sens: 'bas', cible: 0, base: 'par révision' },
      ],
    },
    {
      famille: 'PDR',
      kpis: [
        { cle: 'pdrTemps', libelle: 'Disponibilité PDR à temps', valeur: pct(aTemps, pdrDispo.length), unite: '%', sens: 'haut', cible: 95, base: `${pdrDispo.length} PDR disponibles` },
        { cle: 'pdrCrit', libelle: 'PDR critiques disponibles (révisions prêtes / démarrées)', valeur: pct(crit.filter((x) => x.disponible).length, crit.length), unite: '%', sens: 'haut', cible: 100, base: `${crit.length} PDR A` },
        { cle: 'fournRetard', libelle: 'Retard fournisseur', valeur: pct(fournRetard.length, avecPromesse.length), unite: '%', sens: 'bas', cible: 10, base: `${avecPromesse.length} commandes échues` },
        { cle: 'delaiAppro', libelle: "Délai moyen d'approvisionnement (commande → disponible)", valeur: moy(delaiAppro), unite: 'j', sens: 'bas', base: `${delaiAppro.length} PDR` },
      ],
    },
    {
      famille: 'Transit',
      kpis: [
        { cle: 'fournAbj', libelle: 'Délai fournisseur → Abidjan', valeur: moy(fournAbj), unite: 'j', sens: 'bas', base: `${fournAbj.length} PDR` },
        { cle: 'abjUsine', libelle: 'Délai Abidjan → usine', valeur: moy(abjUsine), unite: 'j', sens: 'bas', cible: d.parametres.delaiAbidjanUsineJours, base: `${abjUsine.length} PDR` },
        { cle: 'retardsTransit', libelle: 'Nombre de retards transit (ETA dépassée)', valeur: retardsTransit, unite: '', sens: 'bas', cible: 0, base: 'PDR' },
        { cle: 'ecartEta', libelle: 'Écart moyen ETA initiale / arrivée réelle', valeur: moy(ecartsEta), unite: 'j', sens: 'bas', cible: 0, base: `${ecartsEta.length} arrivées` },
      ],
    },
    {
      famille: 'Travaux',
      kpis: [
        { cle: 'tTemps', libelle: 'Taux de travaux terminés à temps', valeur: pct(aTempsT, termines.length), unite: '%', sens: 'haut', cible: 90, base: `${termines.length} travaux terminés` },
        { cle: 'tDuree', libelle: 'Durée moyenne réelle d\'un travail', valeur: moy(dureesT), unite: 'j', sens: 'bas', base: `${dureesT.length} travaux` },
        { cle: 'tRetard', libelle: 'Travaux en retard (en cours)', valeur: analyses.reduce((s, a) => s + a.travaux.nbRetard, 0), unite: '', sens: 'bas', cible: 0, base: 'toutes révisions' },
        { cle: 'finRev', libelle: 'Écart moyen de fin de révision', valeur: moy(finies.map((a) => a.ecartFin)), unite: 'j', sens: 'bas', cible: 0, base: `${finies.length} révision(s) finie(s)` },
      ],
    },
    {
      famille: 'Redémarrage',
      kpis: [
        { cle: 'rTemps', libelle: 'Temps moyen de redémarrage (démarrage → 1re conforme)', valeur: moy(redem.map((a) => a.redemarrage.dureeReelleH!)), unite: 'h', sens: 'bas', base: `${redem.length} redémarrage(s)` },
        { cle: 'rDep', libelle: 'Dépassement moyen', valeur: moy(redem.map((a) => a.redemarrage.depassementH ?? 0)), unite: 'h', sens: 'bas', cible: 0, base: `${redem.length} redémarrage(s)` },
        { cle: 'rDiff', libelle: 'Taux de redémarrage difficile', valeur: pct(redem.filter((a) => a.redemarrage.difficile).length, redem.length), unite: '%', sens: 'bas', cible: 20, base: `${redem.length} redémarrage(s)` },
        { cle: 'sTemps', libelle: 'Temps moyen de stabilisation', valeur: moy(stab.map((a) => a.stabilisation.dureeReelleJ!)), unite: 'j', sens: 'bas', base: `${stab.length} stabilisation(s)` },
      ],
    },
    {
      famille: 'Prestataires',
      kpis: [
        { cle: 'pNote', libelle: 'Note moyenne', valeur: moy(notes), unite: '/5', sens: 'haut', cible: 4, base: `${notes.length} évaluation(s)` },
        { cle: 'pQual', libelle: 'Qualité', valeur: noteMoy('qualite'), unite: '/5', sens: 'haut', cible: 4, base: `${evals.length} évaluation(s)` },
        { cle: 'pPlan', libelle: 'Respect planning', valeur: noteMoy('respectPlanning'), unite: '/5', sens: 'haut', cible: 4, base: `${evals.length} évaluation(s)` },
        { cle: 'pEff', libelle: 'Efficacité', valeur: noteMoy('efficacite'), unite: '/5', sens: 'haut', cible: 4, base: `${evals.length} évaluation(s)` },
      ],
    },
  ];
}

/** Statut d'un KPI vis-à-vis de sa cible. */
export function etatKpi(k: Kpi): 'ok' | 'ko' | 'neutre' {
  if (k.valeur === undefined || k.cible === undefined) return 'neutre';
  return k.sens === 'haut' ? (k.valeur >= k.cible ? 'ok' : 'ko') : k.valeur <= k.cible ? 'ok' : 'ko';
}
