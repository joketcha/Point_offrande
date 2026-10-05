import type { CritereEvaluation, Criticite, EtapePDR, JalonRedemarrage, Niveau, Role, StatutIntervention, StatutRevision, StatutTravail } from './types';

/* ------------------------------------------------------------------ */
/* Rôles (§24)                                                         */
/* ------------------------------------------------------------------ */

export const ROLES: Record<Role, { libelle: string; court: string; mission: string }> = {
  ADMIN: { libelle: 'Administrateur Système', court: 'Admin', mission: 'Administration' },
  BMC: { libelle: 'BMC / Méthodes', court: 'BMC', mission: 'Pilote global des révisions' },
  MAINTENANCE: { libelle: 'Responsable Maintenance', court: 'Maintenance', mission: 'Responsable opérationnel technique' },
  PRODUCTION: { libelle: 'Responsable Production', court: 'Production', mission: 'Responsable de la reprise de production' },
  ACHATS: { libelle: 'Achats / Approvisionnement', court: 'Achats', mission: 'Responsable des commandes et du fournisseur' },
  MAGASIN: { libelle: 'Magasin / Stocks', court: 'Magasin', mission: 'Responsable des réceptions et de la disponibilité physique' },
  TRANSIT: { libelle: 'Transit', court: 'Transit', mission: 'Responsable du transport et du suivi des expéditions' },
  TECHNICIEN: { libelle: 'Technicien / Équipe Maintenance', court: 'Technicien', mission: 'Exécution des travaux' },
  PRESTATAIRE: { libelle: 'Prestataire / Technicien Extérieur', court: 'Prestataire', mission: 'Intervenant externe' },
  DIRECTION: { libelle: 'Direction / Management', court: 'Direction', mission: 'Supervision et arbitrage' },
};

export const ORDRE_ROLES: Role[] = ['BMC', 'MAINTENANCE', 'PRODUCTION', 'ACHATS', 'TRANSIT', 'MAGASIN', 'TECHNICIEN', 'PRESTATAIRE', 'DIRECTION', 'ADMIN'];

/* ------------------------------------------------------------------ */
/* Statuts de révision (§4 + §22)                                      */
/* ------------------------------------------------------------------ */

export const STATUTS: Record<StatutRevision, { libelle: string; ordre: number; phase: 'amont' | 'execution' | 'aval' | 'clos' }> = {
  PLANIFIEE: { libelle: 'Planifiée', ordre: 0, phase: 'amont' },
  PREPARATION: { libelle: 'Préparation', ordre: 1, phase: 'amont' },
  APPROVISIONNEMENT: { libelle: 'Approvisionnement', ordre: 2, phase: 'amont' },
  PDR_TRANSIT: { libelle: 'PDR en transit', ordre: 3, phase: 'amont' },
  PDR_RECEPTIONNEES: { libelle: 'PDR réceptionnées', ordre: 4, phase: 'amont' },
  PRETE: { libelle: 'Prête', ordre: 5, phase: 'amont' },
  EN_COURS: { libelle: 'En cours', ordre: 6, phase: 'execution' },
  TRAVAUX_TERMINES: { libelle: 'Travaux terminés', ordre: 7, phase: 'execution' },
  PRETE_REDEMARRAGE: { libelle: 'Prête pour redémarrage', ordre: 8, phase: 'aval' },
  REDEMARRAGE: { libelle: 'Redémarrage', ordre: 9, phase: 'aval' },
  STABILISATION: { libelle: 'Stabilisation', ordre: 10, phase: 'aval' },
  TERMINEE: { libelle: 'Terminée', ordre: 11, phase: 'clos' },
  REX: { libelle: 'REX clôturé', ordre: 12, phase: 'clos' },
  ANNULEE: { libelle: 'Annulée', ordre: 99, phase: 'clos' },
};

export const WORKFLOW: StatutRevision[] = [
  'PLANIFIEE',
  'PREPARATION',
  'APPROVISIONNEMENT',
  'PDR_TRANSIT',
  'PDR_RECEPTIONNEES',
  'PRETE',
  'EN_COURS',
  'TRAVAUX_TERMINES',
  'PRETE_REDEMARRAGE',
  'REDEMARRAGE',
  'STABILISATION',
  'TERMINEE',
  'REX',
];

export function estAvant(s: StatutRevision, ref: StatutRevision): boolean {
  return STATUTS[s].ordre < STATUTS[ref].ordre;
}

/* ------------------------------------------------------------------ */
/* Cycle PDR (§10) — chaque étape a UN responsable de l'action suivante */
/* ------------------------------------------------------------------ */

export interface DefEtape {
  libelle: string;
  /** Responsable de faire passer la PDR à l'étape suivante. */
  responsable: Role | null;
  /** Libellé de l'action attendue pour sortir de l'étape. */
  action: string;
  groupe: 'Identification' | 'Achats' | 'Transit' | 'Réception' | 'Disponible';
}

export const ETAPES_PDR: EtapePDR[] = [
  'IDENTIFIEE',
  'BESOIN_VALIDE',
  'COMMANDE_A_CREER',
  'COMMANDE_CREEE',
  'COMMANDE_ENVOYEE',
  'COMMANDE_CONFIRMEE',
  'DISPO_FOURNISSEUR',
  'PRETE_EXPEDITION',
  'CONTENEUR',
  'BATEAU',
  'TRANSIT',
  'ARRIVEE_ABIDJAN',
  'ARRIVEE_USINE',
  'RECEPTION_PHYSIQUE',
  'RECEPTION_SYSTEME',
  'DISPONIBLE',
];

export const ETAPE: Record<EtapePDR, DefEtape> = {
  IDENTIFIEE: { libelle: 'PDR identifiée', responsable: 'BMC', action: 'Valider le besoin', groupe: 'Identification' },
  BESOIN_VALIDE: { libelle: 'Besoin validé', responsable: 'ACHATS', action: 'Lancer la demande de commande', groupe: 'Achats' },
  COMMANDE_A_CREER: { libelle: 'Commande à créer', responsable: 'ACHATS', action: 'Créer la commande', groupe: 'Achats' },
  COMMANDE_CREEE: { libelle: 'Commande créée', responsable: 'ACHATS', action: 'Envoyer la commande au fournisseur', groupe: 'Achats' },
  COMMANDE_ENVOYEE: { libelle: 'Commande envoyée', responsable: 'ACHATS', action: 'Obtenir la confirmation fournisseur', groupe: 'Achats' },
  COMMANDE_CONFIRMEE: { libelle: 'Commande confirmée', responsable: 'ACHATS', action: 'Suivre / relancer le fournisseur', groupe: 'Achats' },
  DISPO_FOURNISSEUR: { libelle: 'PDR disponible fournisseur', responsable: 'TRANSIT', action: "Préparer l'expédition", groupe: 'Transit' },
  PRETE_EXPEDITION: { libelle: 'PDR prête expédition', responsable: 'TRANSIT', action: 'Mettre en conteneur', groupe: 'Transit' },
  CONTENEUR: { libelle: 'Conteneur', responsable: 'TRANSIT', action: 'Embarquer sur un bateau', groupe: 'Transit' },
  BATEAU: { libelle: 'Bateau', responsable: 'TRANSIT', action: 'Confirmer le départ', groupe: 'Transit' },
  TRANSIT: { libelle: 'Transit maritime', responsable: 'TRANSIT', action: "Suivre l'ETA jusqu'à Abidjan", groupe: 'Transit' },
  ARRIVEE_ABIDJAN: { libelle: 'Arrivée Abidjan', responsable: 'TRANSIT', action: "Dédouaner et acheminer jusqu'à l'usine", groupe: 'Transit' },
  ARRIVEE_USINE: { libelle: 'Arrivée usine', responsable: 'MAGASIN', action: 'Réceptionner physiquement (quantité, référence)', groupe: 'Réception' },
  RECEPTION_PHYSIQUE: { libelle: 'Réception physique', responsable: 'MAGASIN', action: 'Réceptionner dans le système', groupe: 'Réception' },
  RECEPTION_SYSTEME: { libelle: 'Réception système', responsable: 'MAGASIN', action: 'Mettre à disposition pour la révision', groupe: 'Réception' },
  DISPONIBLE: { libelle: 'Disponible pour révision', responsable: null, action: '—', groupe: 'Disponible' },
};

export function indexEtape(e: EtapePDR): number {
  return ETAPES_PDR.indexOf(e);
}

export function etapeSuivante(e: EtapePDR): EtapePDR | undefined {
  return ETAPES_PDR[indexEtape(e) + 1];
}

export const CRITICITES: Record<Criticite, { libelle: string; niveau: Niveau }> = {
  A: { libelle: 'Critique', niveau: 'CRITIQUE' },
  B: { libelle: 'Importante', niveau: 'ACTION' },
  C: { libelle: 'Standard', niveau: 'VIGILANCE' },
};

/* ------------------------------------------------------------------ */
/* Niveaux de notification (§28)                                       */
/* ------------------------------------------------------------------ */

export const NIVEAUX: Record<Niveau, { libelle: string; icone: string; poids: number }> = {
  CRITIQUE: { libelle: 'Critique', icone: '🔴', poids: 4 },
  ACTION: { libelle: 'Action', icone: '🟠', poids: 3 },
  VIGILANCE: { libelle: 'Vigilance', icone: '🟡', poids: 2 },
  INFO: { libelle: 'Information', icone: '🔵', poids: 1 },
};

/* ------------------------------------------------------------------ */
/* Matrice de responsabilité (§26)                                     */
/* ------------------------------------------------------------------ */

export type Evenement =
  | 'CREATION_REVISION'
  | 'PREPARATION_J7'
  | 'PDR_HORS_GAMME'
  | 'PDR_A_COMMANDER'
  | 'COMMANDE_NON_CONFIRMEE'
  | 'FOURNISSEUR_RETARD'
  | 'PDR_PRETE_EXPEDITION'
  | 'CONTENEUR'
  | 'BATEAU_PARTI'
  | 'ETA_MODIFIEE'
  | 'TRANSIT_RETARD'
  | 'ARRIVEE_ABIDJAN'
  | 'ARRIVEE_USINE'
  | 'RECEPTION_PHYSIQUE'
  | 'RECEPTION_SYSTEME'
  | 'PDR_NON_CONFORME'
  | 'EXPERTISE_TECHNIQUE'
  | 'NOUVELLE_COMMANDE'
  | 'PDR_EN_RETARD_REVISION'
  | 'TECHNICIEN_A_PLANIFIER'
  | 'TECHNICIEN_NON_CONFIRME'
  | 'TECHNICIEN_AVANT_PDR'
  | 'TRAVAIL_EN_RETARD'
  | 'TACHE_BLOQUEE'
  | 'DECISION_REPORT'
  | 'PRET_REDEMARRAGE'
  | 'REDEMARRAGE_DIFFICILE'
  | 'PREMIERE_PRODUCTION_CONFORME'
  | 'STABILISATION_TECHNIQUE'
  | 'EVALUATION_PRESTATAIRE'
  | 'REX'
  | 'RISQUE_PLANNING_MAJEUR'
  | 'ACTION_PREPARATION_EN_RETARD';

export interface LigneRaci {
  evenement: Evenement;
  libelle: string;
  responsable: Role;
  pilote: Role | null;
  informes: Role[];
  /** Condition d'escalade Direction (texte) ; null = jamais. */
  escalade: string | null;
  /** Escalade Direction si le niveau atteint ce seuil. */
  seuilDirection?: Niveau;
}

const TOUS_METIERS: Role[] = ['MAINTENANCE', 'PRODUCTION', 'ACHATS', 'MAGASIN', 'TRANSIT'];

export const RACI: LigneRaci[] = [
  { evenement: 'CREATION_REVISION', libelle: 'Création révision', responsable: 'BMC', pilote: null, informes: ['MAINTENANCE', 'PRODUCTION'], escalade: null },
  { evenement: 'PREPARATION_J7', libelle: 'Préparation J-7 mois', responsable: 'BMC', pilote: null, informes: ['MAINTENANCE', 'ACHATS', 'MAGASIN', 'TRANSIT'], escalade: null },
  { evenement: 'ACTION_PREPARATION_EN_RETARD', libelle: 'Action de préparation en retard', responsable: 'BMC', pilote: null, informes: ['MAINTENANCE'], escalade: null },
  { evenement: 'PDR_HORS_GAMME', libelle: 'Gamme / PDR absente de la gamme', responsable: 'BMC', pilote: null, informes: ['MAINTENANCE'], escalade: null },
  { evenement: 'PDR_A_COMMANDER', libelle: 'PDR à commander', responsable: 'ACHATS', pilote: 'BMC', informes: ['MAINTENANCE'], escalade: null },
  { evenement: 'COMMANDE_NON_CONFIRMEE', libelle: 'Commande non confirmée', responsable: 'ACHATS', pilote: 'BMC', informes: ['MAINTENANCE'], escalade: 'Direction si critique', seuilDirection: 'CRITIQUE' },
  { evenement: 'FOURNISSEUR_RETARD', libelle: 'Fournisseur en retard', responsable: 'ACHATS', pilote: 'BMC', informes: ['MAINTENANCE'], escalade: 'Direction si critique', seuilDirection: 'CRITIQUE' },
  { evenement: 'PDR_PRETE_EXPEDITION', libelle: 'PDR prête expédition', responsable: 'TRANSIT', pilote: 'BMC', informes: ['ACHATS', 'MAINTENANCE'], escalade: null },
  { evenement: 'CONTENEUR', libelle: 'Conteneur', responsable: 'TRANSIT', pilote: 'BMC', informes: ['ACHATS', 'MAINTENANCE'], escalade: null },
  { evenement: 'BATEAU_PARTI', libelle: 'Bateau parti', responsable: 'TRANSIT', pilote: 'BMC', informes: ['ACHATS', 'MAINTENANCE'], escalade: null },
  { evenement: 'ETA_MODIFIEE', libelle: 'ETA modifiée', responsable: 'TRANSIT', pilote: 'BMC', informes: ['MAINTENANCE', 'PRODUCTION'], escalade: 'Direction si impact majeur', seuilDirection: 'CRITIQUE' },
  { evenement: 'TRANSIT_RETARD', libelle: 'Transit en retard', responsable: 'TRANSIT', pilote: 'BMC', informes: ['MAINTENANCE', 'PRODUCTION'], escalade: 'Direction si critique', seuilDirection: 'CRITIQUE' },
  { evenement: 'ARRIVEE_ABIDJAN', libelle: 'Arrivée Abidjan', responsable: 'TRANSIT', pilote: 'BMC', informes: ['ACHATS', 'MAINTENANCE'], escalade: null },
  { evenement: 'ARRIVEE_USINE', libelle: 'Arrivée usine', responsable: 'MAGASIN', pilote: 'BMC', informes: ['MAINTENANCE', 'ACHATS'], escalade: null },
  { evenement: 'RECEPTION_PHYSIQUE', libelle: 'Réception physique', responsable: 'MAGASIN', pilote: 'BMC', informes: ['MAINTENANCE'], escalade: null },
  { evenement: 'RECEPTION_SYSTEME', libelle: 'Réception système', responsable: 'MAGASIN', pilote: 'BMC', informes: ['MAINTENANCE'], escalade: null },
  { evenement: 'PDR_NON_CONFORME', libelle: 'PDR non conforme', responsable: 'MAGASIN', pilote: 'BMC', informes: ['MAINTENANCE', 'ACHATS'], escalade: null },
  { evenement: 'EXPERTISE_TECHNIQUE', libelle: 'Expertise technique nécessaire', responsable: 'MAINTENANCE', pilote: 'BMC', informes: ['MAGASIN'], escalade: null },
  { evenement: 'NOUVELLE_COMMANDE', libelle: 'Nouvelle commande nécessaire', responsable: 'ACHATS', pilote: 'BMC', informes: ['MAINTENANCE', 'MAGASIN'], escalade: 'Direction si critique', seuilDirection: 'CRITIQUE' },
  { evenement: 'PDR_EN_RETARD_REVISION', libelle: 'PDR non disponible à temps', responsable: 'BMC', pilote: null, informes: ['MAINTENANCE', 'PRODUCTION'], escalade: 'Direction si critique', seuilDirection: 'CRITIQUE' },
  { evenement: 'TECHNICIEN_A_PLANIFIER', libelle: 'Technicien à planifier', responsable: 'MAINTENANCE', pilote: 'BMC', informes: ['PRODUCTION'], escalade: null },
  { evenement: 'TECHNICIEN_NON_CONFIRME', libelle: 'Technicien non confirmé', responsable: 'MAINTENANCE', pilote: 'BMC', informes: ['PRODUCTION'], escalade: 'Direction si critique', seuilDirection: 'CRITIQUE' },
  { evenement: 'TECHNICIEN_AVANT_PDR', libelle: 'Technicien prévu avant les PDR', responsable: 'MAINTENANCE', pilote: 'BMC', informes: ['PRODUCTION', 'ACHATS', 'TRANSIT'], escalade: null },
  { evenement: 'TRAVAIL_EN_RETARD', libelle: 'Travail en retard', responsable: 'MAINTENANCE', pilote: 'BMC', informes: ['PRODUCTION'], escalade: 'Direction si critique', seuilDirection: 'CRITIQUE' },
  { evenement: 'TACHE_BLOQUEE', libelle: 'Tâche bloquée', responsable: 'MAINTENANCE', pilote: 'BMC', informes: ['PRODUCTION'], escalade: 'Direction si critique', seuilDirection: 'CRITIQUE' },
  { evenement: 'DECISION_REPORT', libelle: 'Décision de report', responsable: 'BMC', pilote: null, informes: TOUS_METIERS, escalade: 'Direction selon impact', seuilDirection: 'ACTION' },
  { evenement: 'PRET_REDEMARRAGE', libelle: 'Prêt redémarrage', responsable: 'MAINTENANCE', pilote: 'BMC', informes: ['PRODUCTION'], escalade: null },
  { evenement: 'REDEMARRAGE_DIFFICILE', libelle: 'Redémarrage difficile', responsable: 'MAINTENANCE', pilote: 'BMC', informes: ['PRODUCTION'], escalade: 'Direction si critique', seuilDirection: 'CRITIQUE' },
  { evenement: 'PREMIERE_PRODUCTION_CONFORME', libelle: 'Première production conforme', responsable: 'PRODUCTION', pilote: 'BMC', informes: ['MAINTENANCE'], escalade: null },
  { evenement: 'STABILISATION_TECHNIQUE', libelle: 'Stabilisation technique', responsable: 'MAINTENANCE', pilote: 'BMC', informes: ['PRODUCTION'], escalade: null },
  { evenement: 'EVALUATION_PRESTATAIRE', libelle: 'Évaluation prestataire', responsable: 'MAINTENANCE', pilote: 'BMC', informes: [], escalade: null },
  { evenement: 'REX', libelle: 'REX', responsable: 'MAINTENANCE', pilote: 'BMC', informes: ['PRODUCTION', 'ACHATS', 'MAGASIN', 'TRANSIT'], escalade: null },
  { evenement: 'RISQUE_PLANNING_MAJEUR', libelle: 'Risque planning majeur', responsable: 'BMC', pilote: null, informes: ['MAINTENANCE', 'PRODUCTION'], escalade: 'Direction', seuilDirection: 'ACTION' },
];

export const RACI_PAR_EVENEMENT: Record<Evenement, LigneRaci> = Object.fromEntries(RACI.map((r) => [r.evenement, r])) as Record<Evenement, LigneRaci>;

/* ------------------------------------------------------------------ */
/* Préparation J-7 mois (§7)                                           */
/* ------------------------------------------------------------------ */

/** Actions générées à J-7 mois ; `offsetJours` = échéance après le lancement. */
export const ACTIONS_J7: { code: string; libelle: string; responsable: Role; offsetJours: number }[] = [
  { code: 'GAMME', libelle: 'Vérifier la gamme de révision', responsable: 'BMC', offsetJours: 14 },
  { code: 'REX', libelle: 'Intégrer les leçons du REX précédent', responsable: 'BMC', offsetJours: 14 },
  { code: 'PDR', libelle: 'Identifier les PDR', responsable: 'BMC', offsetJours: 21 },
  { code: 'QTE', libelle: 'Vérifier les quantités (stock / besoin)', responsable: 'MAGASIN', offsetJours: 28 },
  { code: 'FOUR', libelle: 'Identifier les fournisseurs', responsable: 'ACHATS', offsetJours: 35 },
  { code: 'CDE', libelle: 'Préparer les commandes', responsable: 'ACHATS', offsetJours: 45 },
  { code: 'TECH', libelle: 'Identifier les techniciens', responsable: 'MAINTENANCE', offsetJours: 45 },
  { code: 'PLAN', libelle: 'Préparer le planning des travaux', responsable: 'MAINTENANCE', offsetJours: 60 },
  { code: 'RISK', libelle: 'Identifier les risques', responsable: 'BMC', offsetJours: 60 },
];

/* ------------------------------------------------------------------ */
/* Techniciens, travaux, redémarrage                                   */
/* ------------------------------------------------------------------ */

export const STATUTS_INTERVENTION: Record<StatutIntervention, string> = {
  A_PLANIFIER: 'À planifier',
  PRESSENTI: 'Pressenti (non confirmé)',
  CONFIRME: 'Confirmé',
  SUR_SITE: 'Sur site',
  TERMINEE: 'Terminée',
  ANNULEE: 'Annulée',
};

export const CRITERES: Record<CritereEvaluation, { libelle: string; poids: number }> = {
  competence: { libelle: 'Compétence', poids: 2 },
  qualite: { libelle: 'Qualité', poids: 2 },
  respectPlanning: { libelle: 'Respect planning', poids: 1.5 },
  diagnostic: { libelle: 'Diagnostic', poids: 1.5 },
  efficacite: { libelle: 'Efficacité', poids: 1.5 },
  comportement: { libelle: 'Comportement', poids: 1 },
  respectConsignes: { libelle: 'Respect consignes (HSE)', poids: 1 },
  compteRendu: { libelle: 'Qualité du compte rendu', poids: 1 },
  redemarrage: { libelle: 'Efficacité au redémarrage', poids: 1.5 },
};

export const STATUTS_TRAVAIL: Record<StatutTravail, string> = {
  A_FAIRE: 'À faire',
  EN_COURS: 'En cours',
  TERMINE: 'Terminé',
  BLOQUE: 'Bloqué',
};

export const JALONS: { cle: JalonRedemarrage; libelle: string; responsable: Role }[] = [
  { cle: 'FIN_TRAVAUX', libelle: 'Fin des travaux', responsable: 'MAINTENANCE' },
  { cle: 'AUTORISATION', libelle: 'Autorisation de démarrage', responsable: 'MAINTENANCE' },
  { cle: 'DEMARRAGE', libelle: 'Démarrage', responsable: 'PRODUCTION' },
  { cle: 'PREMIERE_PRODUCTION', libelle: 'Première production', responsable: 'PRODUCTION' },
  { cle: 'PREMIERE_CONFORME', libelle: 'Première production conforme', responsable: 'PRODUCTION' },
  { cle: 'FIN_STABILISATION', libelle: 'Fin de stabilisation', responsable: 'MAINTENANCE' },
];
