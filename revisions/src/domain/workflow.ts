import type { AnalyseRevision } from './analyse';
import { indexEtape } from './referentiel';
import type { Evenement } from './referentiel';
import type { Role, StatutRevision } from './types';

/**
 * Workflow global (§22) : chaque transition a UN responsable, une condition
 * d'entrée, une action, une condition de sortie, une notification et une escalade.
 * `controle` renvoie les conditions bloquantes (et des alertes non bloquantes).
 */

export interface Controle {
  bloquants: string[];
  alertes: string[];
}

export interface Transition {
  de: StatutRevision;
  vers: StatutRevision;
  responsable: Role;
  conditionEntree: string;
  action: string;
  conditionSortie: string;
  notification: string;
  escalade: string;
  evenement?: Evenement;
  controle: (a: AnalyseRevision) => Controle;
}

const ok = (): Controle => ({ bloquants: [], alertes: [] });

function pdrNonAtteintes(a: AnalyseRevision, etape: Parameters<typeof indexEtape>[0], criticites: string[]) {
  return a.pdrs.filter((x) => !x.pdr.horsGamme && !x.pdr.enStock && criticites.includes(x.pdr.criticite) && indexEtape(x.pdr.etape) < indexEtape(etape));
}

export const TRANSITIONS: Transition[] = [
  {
    de: 'PLANIFIEE',
    vers: 'PREPARATION',
    responsable: 'BMC',
    conditionEntree: 'Révision créée, J-7 mois atteint',
    action: 'Lancer la préparation (actions J-7 mois générées)',
    conditionSortie: 'Actions de préparation affectées',
    notification: 'Maintenance, Achats, Magasin, Transit informés',
    escalade: '—',
    evenement: 'PREPARATION_J7',
    controle: (a) => ({
      bloquants: [],
      alertes: a.preparation.lancee ? [] : [`Lancement anticipé : J-7 mois au ${a.preparation.lancement}.`],
    }),
  },
  {
    de: 'PREPARATION',
    vers: 'APPROVISIONNEMENT',
    responsable: 'BMC',
    conditionEntree: 'Gamme vérifiée, PDR identifiées',
    action: 'Valider les besoins PDR et les transmettre aux Achats',
    conditionSortie: 'Toutes les PDR au moins « besoin validé »',
    notification: 'Achats (A), Maintenance informée',
    escalade: '—',
    evenement: 'PDR_A_COMMANDER',
    controle: (a) => {
      const c = ok();
      if (a.pdrStats.total === 0) c.bloquants.push('Aucune PDR identifiée : importer la gamme et générer les besoins.');
      const nv = a.pdrs.filter((x) => x.pdr.etape === 'IDENTIFIEE' && !x.pdr.horsGamme);
      if (nv.length) c.bloquants.push(`${nv.length} PDR encore au statut « identifiée » (besoin non validé).`);
      return c;
    },
  },
  {
    de: 'APPROVISIONNEMENT',
    vers: 'PDR_TRANSIT',
    responsable: 'ACHATS',
    conditionEntree: 'Besoins validés',
    action: 'Créer, envoyer et faire confirmer les commandes',
    conditionSortie: 'PDR A et B commandées et confirmées',
    notification: 'Transit (A) informé des expéditions à venir, BMC pilote',
    escalade: 'Direction si PDR critique non confirmée',
    evenement: 'COMMANDE_NON_CONFIRMEE',
    controle: (a) => {
      const c = ok();
      const ab = pdrNonAtteintes(a, 'COMMANDE_CONFIRMEE', ['A', 'B']);
      if (ab.length) c.bloquants.push(`${ab.length} PDR A/B non confirmées : ${ab.slice(0, 4).map((x) => x.pdr.ref).join(', ')}${ab.length > 4 ? '…' : ''}`);
      const cc = pdrNonAtteintes(a, 'COMMANDE_CONFIRMEE', ['C']);
      if (cc.length) c.alertes.push(`${cc.length} PDR standard non encore confirmées.`);
      return c;
    },
  },
  {
    de: 'PDR_TRANSIT',
    vers: 'PDR_RECEPTIONNEES',
    responsable: 'MAGASIN',
    conditionEntree: 'PDR expédiées (Transit responsable du transport)',
    action: 'Réceptionner physiquement et dans le système',
    conditionSortie: 'PDR A et B réceptionnées dans le système',
    notification: 'Maintenance informée, BMC pilote',
    escalade: '—',
    evenement: 'RECEPTION_SYSTEME',
    controle: (a) => {
      const c = ok();
      const ab = pdrNonAtteintes(a, 'RECEPTION_SYSTEME', ['A', 'B']);
      if (ab.length) c.bloquants.push(`${ab.length} PDR A/B non réceptionnées : ${ab.slice(0, 4).map((x) => `${x.pdr.ref} (${x.position})`).join(', ')}${ab.length > 4 ? '…' : ''}`);
      const nc = a.pdrs.filter((x) => x.pdr.nonConforme);
      if (nc.length) c.bloquants.push(`${nc.length} PDR non conforme(s) à traiter.`);
      const cc = pdrNonAtteintes(a, 'RECEPTION_SYSTEME', ['C']);
      if (cc.length) c.alertes.push(`${cc.length} PDR standard non encore réceptionnées.`);
      return c;
    },
  },
  {
    de: 'PDR_RECEPTIONNEES',
    vers: 'PRETE',
    responsable: 'BMC',
    conditionEntree: 'PDR réceptionnées',
    action: 'Revue de préparation (go / no-go)',
    conditionSortie: 'PDR critiques disponibles, techniciens confirmés, planning travaux établi',
    notification: 'Maintenance, Production informées',
    escalade: 'Direction si no-go (décision de report)',
    evenement: 'RISQUE_PLANNING_MAJEUR',
    controle: (a) => {
      const c = ok();
      if (a.pdrStats.critiquesManquantes) c.bloquants.push(`${a.pdrStats.critiquesManquantes} PDR critique(s) non disponible(s).`);
      if (a.techStats.nonConfirmes) c.bloquants.push(`${a.techStats.nonConfirmes} intervention(s) prestataire non confirmée(s).`);
      if (a.techStats.enRisquePdr) c.bloquants.push(`${a.techStats.enRisquePdr} technicien(s) prévu(s) avant la disponibilité des PDR.`);
      if (a.travaux.taches.length === 0) c.bloquants.push('Aucun travail planifié.');
      if (a.travaux.cycle.length) c.bloquants.push('Dépendances circulaires dans le planning des travaux.');
      const autres = a.pdrs.filter((x) => !x.disponible && !x.pdr.horsGamme && x.pdr.criticite !== 'A');
      if (autres.length) c.alertes.push(`${autres.length} PDR B/C pas encore disponibles.`);
      return c;
    },
  },
  {
    de: 'PRETE',
    vers: 'EN_COURS',
    responsable: 'MAINTENANCE',
    conditionEntree: 'Révision prête, ligne arrêtée et consignée',
    action: 'Démarrer la révision (date réelle de début)',
    conditionSortie: 'Date réelle de début saisie',
    notification: 'Production, BMC informés',
    escalade: '—',
    controle: () => ok(),
  },
  {
    de: 'EN_COURS',
    vers: 'TRAVAUX_TERMINES',
    responsable: 'MAINTENANCE',
    conditionEntree: 'Révision en cours',
    action: 'Réaliser les travaux (chemin critique suivi)',
    conditionSortie: 'Tous les travaux terminés',
    notification: 'Production informée',
    escalade: 'Direction si travail critique en retard',
    evenement: 'TRAVAIL_EN_RETARD',
    controle: (a) => {
      const c = ok();
      const r = a.travaux.taches.filter((t) => t.travail.statut !== 'TERMINE');
      if (r.length) c.bloquants.push(`${r.length} travail(aux) non terminé(s) : ${r.slice(0, 4).map((t) => t.travail.code).join(', ')}${r.length > 4 ? '…' : ''}`);
      return c;
    },
  },
  {
    de: 'TRAVAUX_TERMINES',
    vers: 'PRETE_REDEMARRAGE',
    responsable: 'MAINTENANCE',
    conditionEntree: 'Travaux terminés',
    action: 'Check-list de remise en service, autorisation de démarrage',
    conditionSortie: 'Autorisation de démarrage signée',
    notification: 'Production (A du démarrage) informée',
    escalade: '—',
    evenement: 'PRET_REDEMARRAGE',
    controle: (a) => ({
      bloquants: a.revision.jalons.AUTORISATION?.reel ? [] : ['Jalon « Autorisation de démarrage » non renseigné (module Redémarrage).'],
      alertes: [],
    }),
  },
  {
    de: 'PRETE_REDEMARRAGE',
    vers: 'REDEMARRAGE',
    responsable: 'PRODUCTION',
    conditionEntree: 'Autorisation de démarrage',
    action: 'Démarrer la ligne',
    conditionSortie: 'Démarrage effectif saisi',
    notification: 'Maintenance, BMC informés',
    escalade: '—',
    controle: (a) => ({ bloquants: a.revision.jalons.DEMARRAGE?.reel ? [] : ['Jalon « Démarrage » non renseigné.'], alertes: [] }),
  },
  {
    de: 'REDEMARRAGE',
    vers: 'STABILISATION',
    responsable: 'PRODUCTION',
    conditionEntree: 'Ligne démarrée',
    action: 'Obtenir la première production conforme',
    conditionSortie: 'Première production conforme déclarée',
    notification: 'Maintenance, BMC informés',
    escalade: 'Direction si redémarrage difficile critique',
    evenement: 'PREMIERE_PRODUCTION_CONFORME',
    controle: (a) => ({ bloquants: a.revision.jalons.PREMIERE_CONFORME?.reel ? [] : ['Jalon « Première production conforme » non renseigné.'], alertes: [] }),
  },
  {
    de: 'STABILISATION',
    vers: 'TERMINEE',
    responsable: 'MAINTENANCE',
    conditionEntree: 'Première production conforme',
    action: 'Stabiliser la ligne (vitesse, qualité, arrêts)',
    conditionSortie: 'Cibles tenues ; fin de stabilisation déclarée — REX créé automatiquement',
    notification: 'Production, Achats, Magasin, Transit informés (REX)',
    escalade: '—',
    evenement: 'STABILISATION_TECHNIQUE',
    controle: (a) => {
      const c = ok();
      if (!a.revision.jalons.FIN_STABILISATION?.reel) c.bloquants.push('Jalon « Fin de stabilisation » non renseigné.');
      if (!a.stabilisation.stabilisee) c.alertes.push('Les cibles de stabilisation ne sont pas tenues sur les derniers relevés.');
      if (a.techStats.aEvaluer) c.alertes.push(`${a.techStats.aEvaluer} prestataire(s) à évaluer.`);
      return c;
    },
  },
  {
    de: 'TERMINEE',
    vers: 'REX',
    responsable: 'MAINTENANCE',
    conditionEntree: 'Révision terminée, REX créé',
    action: 'Compléter et valider le REX',
    conditionSortie: 'REX validé, leçons affectées à la prochaine révision',
    notification: 'Production, Achats, Magasin, Transit informés',
    escalade: '—',
    evenement: 'REX',
    controle: () => ok(),
  },
];

export function transitionDepuis(s: StatutRevision): Transition | undefined {
  return TRANSITIONS.find((t) => t.de === s);
}
