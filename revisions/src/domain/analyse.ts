import { cheminLigne, codeLigne, codeMachine } from './arbo';
import { addDays, diffDays, fmtCourt, maxDate } from './dates';
import {
  actionPdr,
  avancementPdr,
  dateDispoEstimee,
  dateLimiteCommande,
  dateRequise,
  estDisponible,
  joursDansEtape,
  positionPdr,
  responsablePdr,
} from './pdr';
import { derive, finInitiale, finPrevue, lancementPreparation, type Derive } from './planning';
import { analyserRedemarrage, analyserStabilisation, JOURS_STABLES_REQUIS, type AnalyseRedemarrage, type AnalyseStabilisation } from './redemarrage';
import { ETAPE, indexEtape, NIVEAUX, RACI_PAR_EVENEMENT, STATUTS, estAvant, type Evenement } from './referentiel';
import { controleTechnicienPdr, MESSAGE_TECHNICIEN_AVANT_PDR, noteGlobale, type ControleTechnicienPdr } from './techniciens';
import { analyserTravaux, type AnalyseTravaux } from './travaux';
import type { Chemin } from './arbo';
import type { Donnees, ID, ISODate, Intervention, Niveau, Pdr, Revision, Role } from './types';

/* ------------------------------------------------------------------ */
/* Risques : QUOI / OÙ / POURQUOI / QUI / POUR QUAND / IMPACT / QUE FAIRE */
/* ------------------------------------------------------------------ */

export interface Risque {
  cle: string;
  evenement: Evenement;
  niveau: Niveau;
  /** RISQUE = action attendue ; EVENEMENT = information (pas d'action). */
  nature: 'RISQUE' | 'EVENEMENT';
  revisionId: ID;
  ligneId: ID;
  machineId?: ID;
  pdrId?: ID;
  interventionId?: ID;
  travailId?: ID;
  quoi: string;
  ou: string;
  pourquoi: string;
  responsable: Role;
  pilote: Role | null;
  informes: Role[];
  echeance?: ISODate;
  impact: string;
  action: string;
  ecartJours?: number;
  /** 1 = responsable, 2 = BMC, 3 = Direction. */
  escalade: 1 | 2 | 3;
  date: ISODate;
}

export interface PdrAnalyse {
  pdr: Pdr;
  dispo: ISODate;
  requise: ISODate;
  /** dispo − requise (jours) : positif = en retard sur le besoin. */
  ecart: number;
  responsable: Role | null;
  action: string;
  position: string;
  avancement: number;
  disponible: boolean;
  limiteCommande: ISODate;
}

export interface InterventionAnalyse {
  intervention: Intervention;
  controle: ControleTechnicienPdr;
  note?: number;
}

export interface Preparation {
  lancement: ISODate;
  lancee: boolean;
  actionsFaites: number;
  actionsTotal: number;
  actionsEnRetard: number;
  /** Taux de préparation 0..100 (§7). */
  taux: number;
  detail: { libelle: string; valeur: number; poids: number }[];
}

export interface LigneComparatif {
  indicateur: string;
  prevu: string;
  reel: string;
  ecart: string;
  ecartNum?: number;
  unite: 'j' | 'h';
}

export interface AnalyseRevision {
  revision: Revision;
  chemin: Chemin;
  libelle: string;
  derive: Derive;
  finInitiale: ISODate;
  finPrevue: ISODate;
  finPrevisionnelle: ISODate;
  /** Fin prévisionnelle − fin prévue actuelle (jours). */
  ecartFin: number;
  /** Fin prévisionnelle − fin initiale (jours). */
  ecartFinInitiale: number;
  pdrs: PdrAnalyse[];
  pdrStats: {
    total: number;
    critiques: number;
    identifiees: number;
    commandees: number;
    enTransit: number;
    arrivees: number;
    receptionnees: number;
    disponibles: number;
    aRisque: number;
    critiquesManquantes: number;
    dispoMaxCritiques?: ISODate;
  };
  interventions: InterventionAnalyse[];
  techStats: { prevus: number; confirmes: number; nonConfirmes: number; enRisquePdr: number; evalues: number; aEvaluer: number };
  travaux: AnalyseTravaux;
  redemarrage: AnalyseRedemarrage;
  stabilisation: AnalyseStabilisation;
  preparation: Preparation;
  risques: Risque[];
  niveauRisque: Niveau | 'OK';
  comparatif: LigneComparatif[];
  /** Redémarrage tenable à la date prévue ? */
  redemarrageTenable: boolean;
  /** Date prévisionnelle de redémarrage (première production conforme). */
  redemarragePrevisionnel: ISODate;
  rexPrecedent?: { revisionId: ID; code: string; nbLecons: number };
}

const ORDRE_NIVEAU: Record<Niveau, number> = { CRITIQUE: 4, ACTION: 3, VIGILANCE: 2, INFO: 1 };

export function niveauMax(a: Niveau, b: Niveau): Niveau {
  return ORDRE_NIVEAU[a] >= ORDRE_NIVEAU[b] ? a : b;
}

export function trierRisques<T extends { niveau: Niveau; echeance?: ISODate }>(r: T[]): T[] {
  return [...r].sort((a, b) => ORDRE_NIVEAU[b.niveau] - ORDRE_NIVEAU[a.niveau] || (a.echeance ?? '9999').localeCompare(b.echeance ?? '9999'));
}

/** Niveau d'escalade (§29) : jamais la Direction pour un événement opérationnel courant. */
function escalade(ev: Evenement, niveau: Niveau, echeance: ISODate | undefined, today: ISODate): 1 | 2 | 3 {
  const raci = RACI_PAR_EVENEMENT[ev];
  const depassee = !!echeance && today > echeance;
  if (raci.seuilDirection && ORDRE_NIVEAU[niveau] >= ORDRE_NIVEAU[raci.seuilDirection] && (niveau === 'CRITIQUE' || depassee)) {
    // Direction uniquement au-delà du seuil de la matrice ET (critique ou échéance dépassée).
    if (niveau === 'CRITIQUE' && (depassee || ev === 'RISQUE_PLANNING_MAJEUR' || ev === 'PDR_EN_RETARD_REVISION')) return 3;
    if (ev === 'RISQUE_PLANNING_MAJEUR' || ev === 'DECISION_REPORT') return 3;
  }
  if (niveau === 'CRITIQUE' || depassee) return 2;
  return 1;
}

/* ------------------------------------------------------------------ */
/* Analyse complète d'une révision                                      */
/* ------------------------------------------------------------------ */

export function analyserRevision(d: Donnees, revisionId: ID, today: ISODate): AnalyseRevision {
  const rev = d.revisions.find((r) => r.id === revisionId);
  if (!rev) throw new Error(`Révision inconnue : ${revisionId}`);
  const p = d.parametres;
  const chemin = cheminLigne(d, rev.ligneId);
  const lcode = codeLigne(d, rev.ligneId);
  const clos = STATUTS[rev.statut].phase === 'clos';

  /* --- PDR : disponibilité estimée, puis travaux (contraints par les PDR), puis besoin --- */
  const pdrsRev = d.pdrs.filter((x) => x.revisionId === rev.id);
  const dispoDe = new Map(pdrsRev.map((x) => [x.id, dateDispoEstimee(x, p, today)]));
  const travauxRev = d.travaux.filter((t) => t.revisionId === rev.id);
  const travaux = analyserTravaux(rev, travauxRev, today, (t) =>
    maxDate(...t.pdrIds.map((id) => pdrsRev.find((x) => x.id === id)).filter((x): x is Pdr => !!x && !estDisponible(x) && !x.horsGamme).map((x) => dispoDe.get(x.id))),
  );
  const requiseRevision = dateRequise(rev, p);
  // En exécution, le besoin est le début planifié du premier travail qui utilise la PDR.
  const besoinTravail = new Map<ID, ISODate>();
  if (rev.dateReelleDebut) {
    for (const t of travaux.taches) for (const id of t.travail.pdrIds) {
      const cur = besoinTravail.get(id);
      if (!cur || t.debutPrevu < cur) besoinTravail.set(id, t.debutPrevu);
    }
  }
  const pdrs: PdrAnalyse[] = pdrsRev.map((pdr) => {
    const dispo = dispoDe.get(pdr.id)!;
    const requise = rev.dateReelleDebut ? besoinTravail.get(pdr.id) ?? rev.dateReelleDebut : requiseRevision;
    return {
      pdr,
      dispo,
      requise,
      ecart: diffDays(requise, dispo),
      responsable: responsablePdr(pdr),
      action: actionPdr(pdr),
      position: positionPdr(pdr),
      avancement: avancementPdr(pdr),
      disponible: estDisponible(pdr),
      limiteCommande: dateLimiteCommande(pdr, rev, p),
    };
  });

  const actives = pdrs.filter((x) => !x.pdr.horsGamme);
  const idx = (x: PdrAnalyse) => indexEtape(x.pdr.etape);
  const pdrStats = {
    total: actives.length,
    critiques: actives.filter((x) => x.pdr.criticite === 'A').length,
    identifiees: actives.length,
    commandees: actives.filter((x) => x.pdr.enStock || idx(x) >= indexEtape('COMMANDE_CREEE')).length,
    enTransit: actives.filter((x) => idx(x) >= indexEtape('PRETE_EXPEDITION') && idx(x) <= indexEtape('ARRIVEE_ABIDJAN')).length,
    arrivees: actives.filter((x) => idx(x) >= indexEtape('ARRIVEE_USINE')).length,
    receptionnees: actives.filter((x) => idx(x) >= indexEtape('RECEPTION_SYSTEME')).length,
    disponibles: actives.filter((x) => x.disponible).length,
    aRisque: actives.filter((x) => !x.disponible && x.ecart > -7).length,
    critiquesManquantes: actives.filter((x) => x.pdr.criticite === 'A' && !x.disponible).length,
    dispoMaxCritiques: maxDate(...actives.filter((x) => x.pdr.criticite === 'A').map((x) => x.dispo)),
  };

  /* --- Techniciens --- */
  const interventions: InterventionAnalyse[] = d.interventions
    .filter((i) => i.revisionId === rev.id)
    .map((intervention) => ({
      intervention,
      controle: controleTechnicienPdr(intervention, pdrsRev, (x) => dispoDe.get(x.id) ?? today),
      note: noteGlobale(intervention.evaluation),
    }));
  const itActives = interventions.filter((i) => i.intervention.statut !== 'ANNULEE');
  const techStats = {
    prevus: itActives.length,
    confirmes: itActives.filter((i) => ['CONFIRME', 'SUR_SITE', 'TERMINEE'].includes(i.intervention.statut)).length,
    nonConfirmes: itActives.filter((i) => ['A_PLANIFIER', 'PRESSENTI'].includes(i.intervention.statut)).length,
    enRisquePdr: itActives.filter((i) => i.controle.enRisque).length,
    evalues: itActives.filter((i) => i.intervention.evaluation).length,
    aEvaluer: itActives.filter((i) => i.intervention.statut === 'TERMINEE' && !i.intervention.evaluation).length,
  };

  /* --- Travaux, redémarrage, stabilisation --- */
  const redemarrage = analyserRedemarrage(rev, d.incidents.filter((i) => i.revisionId === rev.id));
  const stabilisation = analyserStabilisation(rev, d.stabilisation.filter((s) => s.revisionId === rev.id));

  /* --- Dates de fin --- */
  const fPrevue = finPrevue(rev);
  const fInit = finInitiale(rev);
  // Si les PDR critiques arrivent après le début, la révision ne peut pas finir à l'heure.
  let finPrevisionnelle = travaux.finPrevisionnelle;
  if (!rev.dateReelleDebut && pdrStats.dispoMaxCritiques && pdrStats.dispoMaxCritiques > rev.datePrevue && !clos) {
    finPrevisionnelle = maxDate(finPrevisionnelle, addDays(pdrStats.dispoMaxCritiques, rev.dureePrevueJours)) as ISODate;
  }
  const ecartFin = diffDays(fPrevue, finPrevisionnelle);
  const redemarragePrevu = addDays(fPrevue, Math.ceil(rev.dureeRedemarragePrevueH / 24));
  const redemarragePrevisionnel = rev.jalons.PREMIERE_CONFORME?.reel?.slice(0, 10) ?? addDays(finPrevisionnelle, Math.ceil(rev.dureeRedemarragePrevueH / 24));

  /* --- Préparation (§7) --- */
  const lancement = lancementPreparation(rev, p);
  const actionsFaites = rev.actionsPreparation.filter((a) => a.faite).length;
  const actionsEnRetard = rev.actionsPreparation.filter((a) => !a.faite && a.echeance < today).length;
  const ratioActions = rev.actionsPreparation.length ? actionsFaites / rev.actionsPreparation.length : 0;
  const poidsPdr = (x: PdrAnalyse) => (x.pdr.criticite === 'A' ? 3 : x.pdr.criticite === 'B' ? 2 : 1);
  const ratioPdr = actives.length ? actives.reduce((s, x) => s + x.avancement * poidsPdr(x), 0) / actives.reduce((s, x) => s + poidsPdr(x), 0) : 0;
  const ratioTech = techStats.prevus ? techStats.confirmes / techStats.prevus : 0;
  const ratioPlanning = d.travaux.some((t) => t.revisionId === rev.id) ? 1 : 0;
  const detail = [
    { libelle: 'Actions J-7 mois réalisées', valeur: ratioActions, poids: 25 },
    { libelle: 'Avancement PDR (pondéré criticité)', valeur: ratioPdr, poids: 50 },
    { libelle: 'Techniciens confirmés', valeur: ratioTech, poids: 15 },
    { libelle: 'Planning des travaux établi', valeur: ratioPlanning, poids: 10 },
  ];
  const tauxBrut = Math.round(detail.reduce((s, x) => s + x.valeur * x.poids, 0));
  const preparation: Preparation = {
    lancement,
    lancee: today >= lancement || rev.actionsPreparation.length > 0,
    actionsFaites,
    actionsTotal: rev.actionsPreparation.length,
    actionsEnRetard,
    taux: estAvant(rev.statut, 'EN_COURS') ? tauxBrut : 100,
    detail,
  };

  /* --- REX précédent réutilisable --- */
  const precedent = d.rex
    .filter((x) => x.ligneId === rev.ligneId && x.revisionId !== rev.id)
    .map((x) => ({ x, r: d.revisions.find((r) => r.id === x.revisionId) }))
    .filter((o) => o.r && o.r.datePrevue < rev.datePrevue)
    .sort((a, b) => b.r!.datePrevue.localeCompare(a.r!.datePrevue))[0];

  /* --- Risques --- */
  const risques: Risque[] = [];
  const ouDe = (machineId?: ID, ref?: string) => [`Ligne ${lcode}`, machineId && `Machine ${codeMachine(d, machineId)}`, ref && `PDR ${ref}`].filter(Boolean).join(' — ');
  const ajouter = (r: Omit<Risque, 'pilote' | 'informes' | 'escalade' | 'revisionId' | 'ligneId' | 'date' | 'nature'> & { nature?: Risque['nature'] }) => {
    const raci = RACI_PAR_EVENEMENT[r.evenement];
    risques.push({
      nature: 'RISQUE',
      ...r,
      revisionId: rev.id,
      ligneId: rev.ligneId,
      pilote: r.responsable === 'BMC' ? null : raci.pilote ?? 'BMC',
      informes: raci.informes.filter((x) => x !== r.responsable),
      escalade: r.nature === 'EVENEMENT' ? 1 : escalade(r.evenement, r.niveau, r.echeance, today),
      date: today,
    });
  };

  if (!clos) {
    const avantExecution = estAvant(rev.statut, 'EN_COURS');

    // Préparation : gamme / PDR non identifiées.
    if (preparation.lancee && avantExecution && actives.length === 0) {
      const j = diffDays(today, rev.datePrevue);
      ajouter({
        cle: `GAMME:${rev.id}`,
        evenement: 'PDR_HORS_GAMME',
        niveau: j < 120 ? 'CRITIQUE' : 'ACTION',
        quoi: 'Gamme de révision absente — aucune PDR identifiée',
        ou: ouDe(),
        pourquoi: `La préparation est lancée depuis le ${fmtCourt(lancement)} et aucune liste de PDR n'est rattachée à la révision.`,
        responsable: 'BMC',
        echeance: addDays(lancement, 21),
        impact: 'Aucune commande possible : risque de révision sans pièces.',
        action: 'Importer / valider la gamme PDR de la ligne puis générer les besoins.',
      });
    }

    // Actions J-7 mois en retard.
    for (const a of rev.actionsPreparation.filter((x) => !x.faite && x.echeance < today)) {
      ajouter({
        cle: `PREP:${rev.id}:${a.code}`,
        evenement: 'ACTION_PREPARATION_EN_RETARD',
        niveau: diffDays(today, rev.datePrevue) < 60 ? 'ACTION' : 'VIGILANCE',
        quoi: `Action de préparation en retard : ${a.libelle}`,
        ou: ouDe(),
        pourquoi: `Échéance du ${fmtCourt(a.echeance)} dépassée de ${diffDays(a.echeance, today)} j.`,
        responsable: a.responsable,
        echeance: a.echeance,
        impact: 'Préparation incomplète : dérive possible des approvisionnements.',
        action: a.libelle,
      });
    }

    // PDR : une seule ligne de risque par PDR, portée par le responsable de l'étape bloquante.
    for (const x of actives) {
      if (x.disponible) continue;
      const pdr = x.pdr;
      const resp = x.responsable;
      if (!resp) continue;
      const j = joursDansEtape(pdr, today) ?? 0;
      const niveauEcart: Niveau | undefined =
        x.ecart > 0 ? (pdr.criticite === 'A' ? 'CRITIQUE' : pdr.criticite === 'B' ? 'ACTION' : 'VIGILANCE') : x.ecart > -7 ? (pdr.criticite === 'A' ? 'ACTION' : 'VIGILANCE') : undefined;
      const ecartTxt = x.ecart > 0 ? `Disponibilité estimée ${fmtCourt(x.dispo)} pour un besoin au ${fmtCourt(x.requise)} : écart +${x.ecart} j.` : '';
      const impactPdr =
        pdr.criticite === 'A'
          ? x.ecart > 0
            ? 'Risque sur le démarrage de la révision et le redémarrage de la ligne.'
            : 'PDR critique : marge faible avant la révision.'
          : 'Risque de travail incomplet ou reporté.';
      let ev: Evenement | undefined;
      let quoi = '';
      let pourquoi = '';
      let niveau: Niveau | undefined;
      let echeance: ISODate | undefined;

      if (pdr.nonConforme) {
        ev = pdr.expertiseRequise ? 'EXPERTISE_TECHNIQUE' : pdr.nouvelleCommandeRequise ? 'NOUVELLE_COMMANDE' : 'PDR_NON_CONFORME';
        quoi = pdr.expertiseRequise ? 'Expertise technique nécessaire (PDR non conforme)' : pdr.nouvelleCommandeRequise ? 'Nouvelle commande nécessaire (PDR non conforme)' : 'PDR non conforme à la réception';
        pourquoi = pdr.ecartReception || 'Écart constaté à la réception.';
        niveau = pdr.criticite === 'A' ? 'CRITIQUE' : 'ACTION';
        echeance = addDays(today, 2);
      } else {
        switch (pdr.etape) {
          case 'IDENTIFIEE':
            if (preparation.lancee && today > addDays(lancement, 21)) {
              ev = 'PREPARATION_J7';
              quoi = 'Besoin PDR non validé';
              pourquoi = `PDR identifiée mais besoin non validé ${diffDays(addDays(lancement, 21), today)} j après l'échéance de préparation.`;
              niveau = 'VIGILANCE';
              echeance = addDays(lancement, 21);
            }
            break;
          case 'BESOIN_VALIDE':
          case 'COMMANDE_A_CREER': {
            const limite = x.limiteCommande;
            if (today > addDays(limite, -14)) {
              ev = 'PDR_A_COMMANDER';
              quoi = 'Commande inexistante';
              pourquoi = `Date limite de commande : ${fmtCourt(limite)} (délai fournisseur ${pdr.delaiJours} j + transit).${today > limite ? ` Dépassée de ${diffDays(limite, today)} j.` : ''}`;
              niveau = today > limite ? (pdr.criticite === 'C' ? 'ACTION' : 'CRITIQUE') : 'ACTION';
              echeance = limite;
            }
            break;
          }
          case 'COMMANDE_CREEE':
            if (j > 5) {
              ev = 'COMMANDE_NON_CONFIRMEE';
              quoi = 'Commande créée mais non envoyée au fournisseur';
              pourquoi = `Commande ${pdr.numeroCommande ?? ''} créée depuis ${j} j.`;
              niveau = 'ACTION';
              echeance = addDays(pdr.dates.COMMANDE_CREEE!, 5);
            }
            break;
          case 'COMMANDE_ENVOYEE':
            if (j > p.delaiConfirmationJours) {
              ev = 'COMMANDE_NON_CONFIRMEE';
              quoi = 'Commande non confirmée par le fournisseur';
              pourquoi = `Commande ${pdr.numeroCommande ?? ''} envoyée il y a ${j} j à ${pdr.fournisseur}, sans confirmation (seuil ${p.delaiConfirmationJours} j).`;
              niveau = pdr.criticite === 'A' ? 'ACTION' : 'VIGILANCE';
              echeance = addDays(pdr.dates.COMMANDE_ENVOYEE!, p.delaiConfirmationJours);
            }
            break;
          case 'COMMANDE_CONFIRMEE':
            if (pdr.dateLivraisonPromise && today > pdr.dateLivraisonPromise) {
              ev = 'FOURNISSEUR_RETARD';
              quoi = 'Fournisseur en retard';
              pourquoi = `${pdr.fournisseur} avait promis la PDR au ${fmtCourt(pdr.dateLivraisonPromise)} : retard de ${diffDays(pdr.dateLivraisonPromise, today)} j.`;
              niveau = 'ACTION';
              echeance = pdr.dateLivraisonPromise;
            }
            break;
          case 'DISPO_FOURNISSEUR':
          case 'PRETE_EXPEDITION':
            if (j > 10) {
              ev = 'PDR_PRETE_EXPEDITION';
              quoi = 'PDR prête mais non expédiée';
              pourquoi = `PDR disponible / prête chez ${pdr.fournisseur} depuis ${j} j sans mise en conteneur.`;
              niveau = 'ACTION';
              echeance = addDays(dateEtapeOu(pdr, today), 10);
            }
            break;
          case 'CONTENEUR':
          case 'BATEAU':
          case 'TRANSIT':
            if (pdr.eta && today > pdr.eta) {
              ev = 'TRANSIT_RETARD';
              quoi = 'Transit en retard — ETA dépassée';
              pourquoi = `ETA ${fmtCourt(pdr.eta)} dépassée de ${diffDays(pdr.eta, today)} j sans arrivée à Abidjan.`;
              niveau = 'ACTION';
              echeance = pdr.eta;
            } else if (pdr.eta && pdr.etaInitiale && pdr.eta > pdr.etaInitiale) {
              ev = 'ETA_MODIFIEE';
              quoi = 'ETA décalée';
              pourquoi = `ETA initiale ${fmtCourt(pdr.etaInitiale)} → ETA actuelle ${fmtCourt(pdr.eta)} (+${diffDays(pdr.etaInitiale, pdr.eta)} j). ${pdr.bateau ? `Navire ${pdr.bateau}.` : ''}`;
              niveau = 'VIGILANCE';
              echeance = pdr.eta;
            }
            break;
          case 'ARRIVEE_ABIDJAN':
            if (j > p.delaiAbidjanUsineJours) {
              ev = 'TRANSIT_RETARD';
              quoi = 'Arrivée Abidjan mais non acheminée';
              pourquoi = `PDR au port d'Abidjan depuis ${j} j (délai type ${p.delaiAbidjanUsineJours} j).`;
              niveau = 'ACTION';
              echeance = addDays(pdr.dates.ARRIVEE_ABIDJAN!, p.delaiAbidjanUsineJours);
            }
            break;
          case 'ARRIVEE_USINE':
            if (j > 2) {
              ev = 'ARRIVEE_USINE';
              quoi = 'Arrivée usine mais non réceptionnée';
              pourquoi = `PDR arrivée à l'usine depuis ${j} j sans réception physique.`;
              niveau = 'ACTION';
              echeance = addDays(pdr.dates.ARRIVEE_USINE!, 2);
            }
            break;
          case 'RECEPTION_PHYSIQUE':
            if (j > 2) {
              ev = 'RECEPTION_SYSTEME';
              quoi = 'Réception système en retard';
              pourquoi = `Réception physique faite il y a ${j} j, PDR non saisie dans le système.`;
              niveau = 'ACTION';
              echeance = addDays(pdr.dates.RECEPTION_PHYSIQUE!, 2);
            }
            break;
          case 'RECEPTION_SYSTEME':
            if (j > 1) {
              ev = 'RECEPTION_SYSTEME';
              quoi = 'PDR réceptionnée mais non mise à disposition';
              pourquoi = `Réceptionnée dans le système depuis ${j} j.`;
              niveau = 'VIGILANCE';
              echeance = addDays(pdr.dates.RECEPTION_SYSTEME!, 1);
            }
            break;
        }
      }

      // Écart de disponibilité : relève le niveau ou crée le risque s'il n'existe pas.
      if (niveauEcart) {
        if (!ev) {
          ev = x.ecart > 0 ? 'PDR_EN_RETARD_REVISION' : 'PDR_A_COMMANDER';
          // Le responsable reste celui de l'étape bloquante (§25).
          quoi = x.ecart > 0 ? `PDR non disponible à temps (${ETAPE[pdr.etape].libelle})` : `Marge faible sur PDR (${ETAPE[pdr.etape].libelle})`;
          pourquoi = x.ecart > 0 ? ecartTxt : `Disponibilité estimée ${fmtCourt(x.dispo)}, besoin au ${fmtCourt(x.requise)} : marge ${-x.ecart} j.`;
          echeance = x.requise;
          niveau = niveauEcart;
          if (ev === 'PDR_A_COMMANDER' && resp !== 'ACHATS') ev = 'PDR_EN_RETARD_REVISION';
        } else {
          niveau = niveauMax(niveau ?? 'INFO', niveauEcart);
          if (ecartTxt) pourquoi = `${pourquoi} ${ecartTxt}`;
        }
      }
      if (!ev || !niveau) continue;
      ajouter({
        cle: `PDR:${pdr.id}`,
        evenement: ev,
        niveau,
        machineId: pdr.machineId,
        pdrId: pdr.id,
        quoi: `${quoi} — ${pdr.ref}`,
        ou: ouDe(pdr.machineId, pdr.ref),
        pourquoi,
        responsable: resp,
        echeance,
        impact: impactPdr,
        action: x.action,
        ecartJours: x.ecart,
      });
    }

    // Techniciens.
    for (const it of interventions) {
      const i = it.intervention;
      if (i.statut === 'ANNULEE') continue;
      if (it.controle.enRisque && avantExecution) {
        const pire = it.controle.bloquantes[0];
        ajouter({
          cle: `TECHPDR:${i.id}`,
          evenement: 'TECHNICIEN_AVANT_PDR',
          niveau: 'CRITIQUE',
          machineId: i.machineId,
          interventionId: i.id,
          quoi: MESSAGE_TECHNICIEN_AVANT_PDR,
          ou: ouDe(i.machineId),
          pourquoi: `${i.entreprise} (${i.technicien}) arrive le ${fmtCourt(i.datePrevue)} ; ${it.controle.bloquantes.length} PDR non disponible(s), la dernière le ${fmtCourt(pire.dispo)} (${pire.pdr.ref}, +${pire.ecart} j).`,
          responsable: 'MAINTENANCE',
          echeance: addDays(i.datePrevue, -14),
          impact: 'Technicien immobilisé sans pièces : coût et dérive du planning.',
          action: `Décaler l'arrivée au ${fmtCourt(addDays(it.controle.dateDispoMax!, 1))} ou sécuriser les PDR bloquantes.`,
          ecartJours: pire.ecart,
        });
      }
      if (['A_PLANIFIER', 'PRESSENTI'].includes(i.statut)) {
        const j = diffDays(today, i.datePrevue);
        if (j < 45) {
          ajouter({
            cle: `TECH:${i.id}`,
            evenement: i.statut === 'A_PLANIFIER' ? 'TECHNICIEN_A_PLANIFIER' : 'TECHNICIEN_NON_CONFIRME',
            niveau: j < 10 ? 'CRITIQUE' : j < 21 ? 'ACTION' : 'VIGILANCE',
            machineId: i.machineId,
            interventionId: i.id,
            quoi: i.statut === 'A_PLANIFIER' ? `Technicien à planifier — ${i.specialite}` : `Technicien non confirmé — ${i.entreprise}`,
            ou: ouDe(i.machineId),
            pourquoi: `Intervention « ${i.intervention} » prévue le ${fmtCourt(i.datePrevue)} (J${j >= 0 ? '-' : '+'}${Math.abs(j)}) sans confirmation.`,
            responsable: 'MAINTENANCE',
            echeance: addDays(i.datePrevue, -21),
            impact: 'Travaux sans intervenant qualifié : risque de dérive de la révision.',
            action: 'Obtenir la confirmation écrite du prestataire (dates, équipe, ordre de mission).',
          });
        }
      }
      if (i.statut === 'TERMINEE' && !i.evaluation) {
        ajouter({
          cle: `EVAL:${i.id}`,
          evenement: 'EVALUATION_PRESTATAIRE',
          niveau: 'ACTION',
          machineId: i.machineId,
          interventionId: i.id,
          quoi: `Évaluation prestataire à réaliser — ${i.entreprise}`,
          ou: ouDe(i.machineId),
          pourquoi: `Intervention terminée (${i.technicien}) sans évaluation.`,
          responsable: 'MAINTENANCE',
          echeance: addDays(i.dateReelle ?? i.datePrevue, i.dureeJours + 7),
          impact: 'Choix du prestataire de la prochaine révision sans retour objectif.',
          action: 'Évaluer le technicien sur les 9 critères.',
        });
      }
    }

    // Travaux en retard / bloqués.
    for (const t of travaux.taches) {
      const w = t.travail;
      if (w.statut === 'BLOQUE') {
        ajouter({
          cle: `BLOQ:${w.id}`,
          evenement: 'TACHE_BLOQUEE',
          niveau: t.critique ? 'CRITIQUE' : 'ACTION',
          machineId: w.machineId,
          travailId: w.id,
          quoi: `Tâche bloquée — ${w.code} ${w.description}`,
          ou: ouDe(w.machineId),
          pourquoi: w.motifBlocage || 'Tâche signalée bloquée.',
          responsable: 'MAINTENANCE',
          echeance: today,
          impact: t.critique ? `Sur le chemin critique : décale la fin de révision (prévision ${fmtCourt(travaux.finPrevisionnelle)}).` : `Marge ${t.marge} j avant impact sur la fin.`,
          action: 'Lever le blocage (pièce, compétence, consignation) ou re-séquencer.',
        });
      } else if (t.enRetard && w.statut !== 'TERMINE') {
        ajouter({
          cle: `RET:${w.id}`,
          evenement: 'TRAVAIL_EN_RETARD',
          niveau: t.critique ? 'CRITIQUE' : 'ACTION',
          machineId: w.machineId,
          travailId: w.id,
          quoi: `Travail en retard — ${w.code} ${w.description}`,
          ou: ouDe(w.machineId),
          pourquoi: `Fin prévue ${fmtCourt(t.finPrevue)}, prévision ${fmtCourt(t.finPrev)} (+${t.retardJours} j).`,
          responsable: 'MAINTENANCE',
          echeance: t.finPrevue,
          impact: t.critique ? 'Tâche du chemin critique : la fin de révision et le redémarrage glissent.' : `Marge restante ${t.marge} j.`,
          action: 'Renforcer l\'équipe / réordonnancer pour revenir au planning.',
        });
      }
    }

    // Risque planning majeur (fin de révision / redémarrage).
    if (ecartFin > 0) {
      ajouter({
        cle: `PLAN:${rev.id}`,
        evenement: 'RISQUE_PLANNING_MAJEUR',
        niveau: ecartFin > 2 ? 'CRITIQUE' : 'ACTION',
        quoi: `Fin de révision menacée : +${ecartFin} j`,
        ou: ouDe(),
        pourquoi: `Fin prévue ${fmtCourt(fPrevue)}, fin prévisionnelle ${fmtCourt(finPrevisionnelle)}${pdrStats.dispoMaxCritiques && pdrStats.dispoMaxCritiques > rev.datePrevue && !rev.dateReelleDebut ? ` (PDR critiques disponibles au plus tôt le ${fmtCourt(pdrStats.dispoMaxCritiques)})` : ''}.`,
        responsable: 'BMC',
        echeance: avantExecution ? addDays(rev.datePrevue, -14) : today,
        impact: `Redémarrage décalé au ${fmtCourt(redemarragePrevisionnel)} au lieu du ${fmtCourt(redemarragePrevu)}.`,
        action: avantExecution ? 'Arbitrer : sécuriser les PDR critiques, renforcer les équipes ou décider d\'un report.' : 'Arbitrer les moyens sur le chemin critique.',
        ecartJours: ecartFin,
      });
    } else if (avantExecution && diffDays(today, rev.datePrevue) <= 21 && preparation.taux < 80) {
      ajouter({
        cle: `PLAN:${rev.id}`,
        evenement: 'RISQUE_PLANNING_MAJEUR',
        niveau: 'ACTION',
        quoi: `Préparation insuffisante à J-${diffDays(today, rev.datePrevue)} (${preparation.taux} %)`,
        ou: ouDe(),
        pourquoi: `Le taux de préparation est de ${preparation.taux} % pour un seuil de 80 % à J-21.`,
        responsable: 'BMC',
        echeance: addDays(rev.datePrevue, -7),
        impact: 'Démarrage de révision à risque.',
        action: 'Revue de préparation : décider maintien ou report.',
      });
    }

    // Redémarrage difficile / stabilisation longue.
    if (!estAvant(rev.statut, 'REDEMARRAGE') && redemarrage.difficile) {
      ajouter({
        cle: `REDEM:${rev.id}`,
        evenement: 'REDEMARRAGE_DIFFICILE',
        niveau: (redemarrage.depassementH ?? redemarrage.heuresIncidents) > 24 ? 'CRITIQUE' : 'ACTION',
        quoi: 'Redémarrage difficile',
        ou: ouDe(),
        pourquoi: `${redemarrage.nbIncidents} incident(s), ${redemarrage.heuresIncidents} h supplémentaires${redemarrage.depassementH !== undefined ? `, dépassement ${redemarrage.depassementH} h` : ''}.`,
        responsable: 'MAINTENANCE',
        echeance: today,
        impact: 'Perte de production et retard de remise en production.',
        action: 'Traiter les incidents ouverts et sécuriser la première production conforme.',
      });
    }
    if (rev.statut === 'STABILISATION' && (stabilisation.depassementJ ?? 0) > 0 && !stabilisation.stabilisee) {
      ajouter({
        cle: `STAB:${rev.id}`,
        evenement: 'STABILISATION_TECHNIQUE',
        niveau: 'ACTION',
        quoi: `Stabilisation plus longue que prévu (+${stabilisation.depassementJ} j)`,
        ou: ouDe(),
        pourquoi: `Cibles vitesse ${rev.cibleVitessePct} % / qualité ${rev.cibleQualitePct} % non tenues ${JOURS_STABLES_REQUIS} jours consécutifs.`,
        responsable: 'MAINTENANCE',
        echeance: today,
        impact: 'Performance ligne dégradée après révision.',
        action: 'Analyser arrêts et défauts, plan d\'action stabilisation avec la Production.',
      });
    }
    if (rev.statut === 'REDEMARRAGE' && rev.jalons.PREMIERE_PRODUCTION?.reel && !rev.jalons.PREMIERE_CONFORME?.reel) {
      ajouter({
        cle: `CONF:${rev.id}`,
        evenement: 'PREMIERE_PRODUCTION_CONFORME',
        niveau: 'ACTION',
        quoi: 'Première production conforme à valider',
        ou: ouDe(),
        pourquoi: 'La ligne produit mais la conformité n\'est pas encore déclarée.',
        responsable: 'PRODUCTION',
        echeance: today,
        impact: 'Remise en production non actée.',
        action: 'Valider la première production conforme.',
      });
    }
    if (rev.statut === 'TRAVAUX_TERMINES') {
      ajouter({
        cle: `PRET:${rev.id}`,
        evenement: 'PRET_REDEMARRAGE',
        niveau: 'ACTION',
        quoi: 'Ligne à déclarer prête pour redémarrage',
        ou: ouDe(),
        pourquoi: 'Travaux terminés : contrôles de remise en service à réaliser.',
        responsable: 'MAINTENANCE',
        echeance: today,
        impact: 'Le redémarrage ne peut pas être autorisé.',
        action: 'Réaliser la check-list de remise en service et autoriser le démarrage.',
      });
    }
  } else if (rev.statut === 'TERMINEE') {
    const rx = d.rex.find((x) => x.revisionId === rev.id);
    if (!rx || rx.statut !== 'VALIDE') {
      ajouter({
        cle: `REX:${rev.id}`,
        evenement: 'REX',
        niveau: 'ACTION',
        quoi: 'REX à finaliser',
        ou: ouDe(),
        pourquoi: 'Révision terminée : le retour d\'expérience n\'est pas validé.',
        responsable: 'MAINTENANCE',
        echeance: addDays(rev.dateReelleFin ?? today, 21),
        impact: 'Les leçons ne seront pas reprises à la prochaine révision.',
        action: 'Compléter les leçons et valider le REX.',
      });
    }
    for (const it of interventions.filter((x) => x.intervention.statut === 'TERMINEE' && !x.intervention.evaluation)) {
      const i = it.intervention;
      ajouter({
        cle: `EVAL:${i.id}`,
        evenement: 'EVALUATION_PRESTATAIRE',
        niveau: 'ACTION',
        machineId: i.machineId,
        interventionId: i.id,
        quoi: `Évaluation prestataire à réaliser — ${i.entreprise}`,
        ou: ouDe(i.machineId),
        pourquoi: `Intervention terminée (${i.technicien}) sans évaluation.`,
        responsable: 'MAINTENANCE',
        echeance: addDays(i.dateReelle ?? i.datePrevue, i.dureeJours + 7),
        impact: 'Choix du prestataire de la prochaine révision sans retour objectif.',
        action: 'Évaluer le technicien sur les 9 critères.',
      });
    }
  }

  // Événements d'information récents (pas d'action attendue).
  for (const r of rev.reports.filter((x) => diffDays(x.date, today) <= 14)) {
    ajouter({
      nature: 'EVENEMENT',
      cle: `REPORT:${rev.id}:${r.version}`,
      evenement: 'DECISION_REPORT',
      niveau: Math.abs(diffDays(r.ancienneDate, r.nouvelleDate)) > 30 ? 'VIGILANCE' : 'INFO',
      quoi: `Révision reportée (v${r.version}) : ${fmtCourt(r.ancienneDate)} → ${fmtCourt(r.nouvelleDate)}`,
      ou: ouDe(),
      pourquoi: r.motif,
      responsable: 'BMC',
      echeance: r.date,
      impact: `Décalage ${diffDays(r.ancienneDate, r.nouvelleDate)} j ; dérive cumulée ${diffDays(rev.dateInitiale, rev.datePrevue)} j.`,
      action: 'Pour information : replanifier commandes, transit et techniciens.',
    });
  }
  for (const x of actives) {
    for (const [etape, ev] of [
      ['ARRIVEE_ABIDJAN', 'ARRIVEE_ABIDJAN'],
      ['ARRIVEE_USINE', 'ARRIVEE_USINE'],
      ['BATEAU', 'BATEAU_PARTI'],
    ] as const) {
      const dt = x.pdr.dates[etape];
      if (dt && diffDays(dt, today) <= 3 && diffDays(dt, today) >= 0 && x.pdr.etape === etape && !risques.some((r) => r.cle === `PDR:${x.pdr.id}`)) {
        ajouter({
          nature: 'EVENEMENT',
          cle: `EV:${etape}:${x.pdr.id}`,
          evenement: ev,
          niveau: 'INFO',
          machineId: x.pdr.machineId,
          pdrId: x.pdr.id,
          quoi: `${ETAPE[etape].libelle} — ${x.pdr.ref}`,
          ou: ouDe(x.pdr.machineId, x.pdr.ref),
          pourquoi: `${x.pdr.designation} — ${x.position}.`,
          responsable: RACI_PAR_EVENEMENT[ev].responsable,
          echeance: dt,
          impact: 'Aucun : progression normale.',
          action: x.action,
        });
      }
    }
  }

  const triés = trierRisques(risques);
  const actifs = triés.filter((r) => r.nature === 'RISQUE');
  const niveauRisque: Niveau | 'OK' = actifs.length ? actifs[0].niveau : 'OK';

  /* --- Comparatif prévu / réel (§37) --- */
  const j = rev.jalons;
  const comparatif: LigneComparatif[] = [
    ligneComp('Début', rev.datePrevue, rev.dateReelleDebut, 'j'),
    ligneComp('Fin', fPrevue, rev.dateReelleFin ?? (rev.dateReelleDebut ? finPrevisionnelle : undefined), 'j', !rev.dateReelleFin),
    {
      indicateur: 'Durée',
      prevu: `${rev.dureePrevueJours} j`,
      reel: rev.dateReelleDebut ? `${diffDays(rev.dateReelleDebut, rev.dateReelleFin ?? finPrevisionnelle)} j${rev.dateReelleFin ? '' : ' (prév.)'}` : '—',
      ecart: rev.dateReelleDebut ? signe(diffDays(rev.dateReelleDebut, rev.dateReelleFin ?? finPrevisionnelle) - rev.dureePrevueJours, 'j') : '—',
      ecartNum: rev.dateReelleDebut ? diffDays(rev.dateReelleDebut, rev.dateReelleFin ?? finPrevisionnelle) - rev.dureePrevueJours : undefined,
      unite: 'j',
    },
    {
      indicateur: 'Redémarrage',
      prevu: `${rev.dureeRedemarragePrevueH} h`,
      reel: redemarrage.dureeReelleH !== undefined ? `${redemarrage.dureeReelleH} h` : '—',
      ecart: redemarrage.depassementH !== undefined ? signe(redemarrage.depassementH, 'h') : '—',
      ecartNum: redemarrage.depassementH,
      unite: 'h',
    },
    {
      indicateur: 'Stabilisation',
      prevu: `${rev.dureeStabilisationPrevueJ} j`,
      reel: stabilisation.dureeReelleJ !== undefined ? `${stabilisation.dureeReelleJ} j${j.FIN_STABILISATION?.reel ? '' : ' (en cours)'}` : '—',
      ecart: stabilisation.depassementJ !== undefined ? signe(stabilisation.depassementJ, 'j') : '—',
      ecartNum: stabilisation.depassementJ,
      unite: 'j',
    },
  ];

  return {
    revision: rev,
    chemin,
    libelle: `${rev.code} · ${chemin.ligne?.code ?? ''} ${chemin.ligne?.nom ?? ''}`.trim(),
    derive: derive(rev),
    finInitiale: fInit,
    finPrevue: fPrevue,
    finPrevisionnelle,
    ecartFin,
    ecartFinInitiale: diffDays(fInit, finPrevisionnelle),
    pdrs,
    pdrStats,
    interventions,
    techStats,
    travaux,
    redemarrage,
    stabilisation,
    preparation,
    risques: triés,
    niveauRisque,
    comparatif,
    redemarrageTenable: ecartFin <= 0 && !actifs.some((r) => r.niveau === 'CRITIQUE'),
    redemarragePrevisionnel,
    rexPrecedent: precedent ? { revisionId: precedent.r!.id, code: precedent.r!.code, nbLecons: precedent.x.lecons.length } : undefined,
  };
}

function dateEtapeOu(p: Pdr, today: ISODate): ISODate {
  return p.dates[p.etape] ?? today;
}

function signe(n: number, u: string): string {
  const r = Math.round(n * 10) / 10;
  if (r === 0) return `0 ${u}`;
  return `${r > 0 ? '+' : '−'}${Math.abs(r)} ${u}`;
}

function ligneComp(indicateur: string, prevu: ISODate, reel: ISODate | undefined, unite: 'j', prevision = false): LigneComparatif {
  const e = reel ? diffDays(prevu, reel) : undefined;
  return {
    indicateur,
    prevu: fmtCourt(prevu),
    reel: reel ? `${fmtCourt(reel)}${prevision ? ' (prév.)' : ''}` : '—',
    ecart: e !== undefined ? signe(e, 'j') : '—',
    ecartNum: e,
    unite,
  };
}

export function iconeNiveau(n: Niveau | 'OK'): string {
  return n === 'OK' ? '🟢' : NIVEAUX[n].icone;
}
