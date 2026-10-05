/**
 * Modèle de données du pilotage des révisions annuelles.
 *
 * Principes :
 *  - une révision = une source unique de vérité (tout est rattaché à `revisionId`) ;
 *  - prévu ≠ réel : chaque date prévue a son pendant réel, jamais écrasé ;
 *  - une action = un responsable (un seul `Role` par étape / risque / notification).
 *
 * Les identifiants sont des chaînes ; les dates sont au format ISO `YYYY-MM-DD`
 * (les heures, quand elles comptent, sont stockées à part).
 */

export type ID = string;
export type ISODate = string;

/* ------------------------------------------------------------------ */
/* Rôles, utilisateurs, périmètres                                     */
/* ------------------------------------------------------------------ */

export type Role =
  | 'ADMIN'
  | 'BMC'
  | 'MAINTENANCE'
  | 'PRODUCTION'
  | 'ACHATS'
  | 'MAGASIN'
  | 'TRANSIT'
  | 'TECHNICIEN'
  | 'PRESTATAIRE'
  | 'DIRECTION';

export interface Perimetre {
  /** Vide = tout le périmètre au niveau supérieur. */
  siteIds: ID[];
  atelierIds: ID[];
  ligneIds: ID[];
}

export interface Utilisateur {
  id: ID;
  nom: string;
  role: Role;
  email?: string;
  perimetre: Perimetre;
  actif: boolean;
  /** Empreinte SHA-256 du mot de passe (contrôle d'accès local, pas une sécurité serveur). */
  motDePasseHash?: string;
}

/* ------------------------------------------------------------------ */
/* Arborescence industrielle : SITE → ATELIER → LIGNE → MACHINE →      */
/* SOUS-ENSEMBLE → ORGANE → PDR                                        */
/* ------------------------------------------------------------------ */

export interface Site { id: ID; code: string; nom: string }
export interface Atelier { id: ID; siteId: ID; code: string; nom: string }
export interface Ligne { id: ID; atelierId: ID; code: string; nom: string }
export interface Machine { id: ID; ligneId: ID; code: string; nom: string }
export interface SousEnsemble { id: ID; machineId: ID; code: string; nom: string }
export interface Organe { id: ID; sousEnsembleId: ID; code: string; nom: string }

/** A = critique (bloque le redémarrage), B = importante, C = standard. */
export type Criticite = 'A' | 'B' | 'C';

/** Article du catalogue PDR (référentiel, futur lien DIMOMAINT). */
export interface ArticlePDR {
  ref: string;
  designation: string;
  fournisseur?: string;
  delaiJours?: number;
  criticite: Criticite;
}

/* ------------------------------------------------------------------ */
/* Révision                                                            */
/* ------------------------------------------------------------------ */

export type StatutRevision =
  | 'PLANIFIEE'
  | 'PREPARATION'
  | 'APPROVISIONNEMENT'
  | 'PDR_TRANSIT'
  | 'PDR_RECEPTIONNEES'
  | 'PRETE'
  | 'EN_COURS'
  | 'TRAVAUX_TERMINES'
  | 'PRETE_REDEMARRAGE'
  | 'REDEMARRAGE'
  | 'STABILISATION'
  | 'TERMINEE'
  | 'REX'
  | 'ANNULEE';

export interface Report {
  version: number;
  ancienneDate: ISODate;
  nouvelleDate: ISODate;
  motif: string;
  auteur: string;
  date: ISODate;
}

export interface ActionPreparation {
  id: ID;
  code: string;
  libelle: string;
  responsable: Role;
  echeance: ISODate;
  faite: boolean;
  dateFaite?: ISODate;
}

/** Jalons du redémarrage (§19) — chacun prévu ET réel. */
export type JalonRedemarrage =
  | 'FIN_TRAVAUX'
  | 'AUTORISATION'
  | 'DEMARRAGE'
  | 'PREMIERE_PRODUCTION'
  | 'PREMIERE_CONFORME'
  | 'FIN_STABILISATION';

export interface Jalon {
  prevu?: string; // ISO date-heure 'YYYY-MM-DDTHH:mm'
  reel?: string;
}

export interface Revision {
  id: ID;
  code: string;
  annee: number;
  ligneId: ID;
  responsableId: ID;
  dateInitiale: ISODate;
  datePrevue: ISODate;
  dureePrevueJours: number;
  dateReelleDebut?: ISODate;
  dateReelleFin?: ISODate;
  statut: StatutRevision;
  reports: Report[];
  commentaire: string;
  actionsPreparation: ActionPreparation[];
  jalons: Partial<Record<JalonRedemarrage, Jalon>>;
  /** Durée prévue de redémarrage (heures) et de stabilisation (jours). */
  dureeRedemarragePrevueH: number;
  dureeStabilisationPrevueJ: number;
  /** Cibles de stabilisation. */
  cibleVitessePct: number;
  cibleQualitePct: number;
  gammeVersionId?: ID;
}

/* ------------------------------------------------------------------ */
/* Gammes de révision (listes PDR) — versionnées                       */
/* ------------------------------------------------------------------ */

export interface GammeLigne {
  machineId: ID;
  sousEnsemble: string;
  organe: string;
  ref: string;
  designation: string;
  quantite: number;
  criticite: Criticite;
  fournisseur: string;
  delaiJours: number;
  commentaire: string;
}

export interface GammeVersion {
  id: ID;
  ligneId: ID;
  version: number;
  dateImport: ISODate;
  auteur: string;
  source: string;
  statut: 'ACTIVE' | 'REMPLACEE';
  lignes: GammeLigne[];
}

export interface ImportHistorique {
  id: ID;
  date: ISODate;
  auteur: string;
  fichier: string;
  ligneId: ID;
  gammeVersionId?: ID;
  nbLignes: number;
  nbErreurs: number;
  nbAvertissements: number;
  resultat: 'IMPORTE' | 'REJETE';
  resume: string;
}

/* ------------------------------------------------------------------ */
/* Cycle de vie des PDR                                                */
/* ------------------------------------------------------------------ */

export type ModeTransport = 'MARITIME' | 'AERIEN' | 'LOCAL';

export type EtapePDR =
  | 'IDENTIFIEE'
  | 'BESOIN_VALIDE'
  | 'COMMANDE_A_CREER'
  | 'COMMANDE_CREEE'
  | 'COMMANDE_ENVOYEE'
  | 'COMMANDE_CONFIRMEE'
  | 'DISPO_FOURNISSEUR'
  | 'PRETE_EXPEDITION'
  | 'CONTENEUR'
  | 'BATEAU'
  | 'TRANSIT'
  | 'ARRIVEE_ABIDJAN'
  | 'ARRIVEE_USINE'
  | 'RECEPTION_PHYSIQUE'
  | 'RECEPTION_SYSTEME'
  | 'DISPONIBLE';

export interface Pdr {
  id: ID;
  revisionId: ID;
  machineId: ID;
  sousEnsemble: string;
  organe: string;
  ref: string;
  designation: string;
  quantite: number;
  criticite: Criticite;
  fournisseur: string;
  delaiJours: number;
  /** Hors gamme : PDR retirée de la gamme active (jamais supprimée). */
  horsGamme?: boolean;
  /** PDR présente en stock : ne passe pas par achats/transit. */
  enStock?: boolean;
  /** Mode d'acheminement (défaut maritime ; LOCAL = fournisseur ivoirien, sans fret). */
  modeTransport?: ModeTransport;
  etape: EtapePDR;
  /** Date réelle de passage à chaque étape (historique, jamais écrasé). */
  dates: Partial<Record<EtapePDR, ISODate>>;
  numeroCommande?: string;
  dateLivraisonPromise?: ISODate;
  conteneur?: string;
  bateau?: string;
  etaInitiale?: ISODate;
  eta?: ISODate;
  etaHistorique: { date: ISODate; ancienne?: ISODate; nouvelle: ISODate; motif: string; auteur: string }[];
  qteRecue?: number;
  nonConforme?: boolean;
  ecartReception?: string;
  expertiseRequise?: boolean;
  nouvelleCommandeRequise?: boolean;
  commentaire?: string;
  /** Cycles d'approvisionnement abandonnés (non-conformité) : historique conservé. */
  cyclesPrecedents?: { date: ISODate; motif: string; numeroCommande?: string; dates: Partial<Record<EtapePDR, ISODate>> }[];
}

/* ------------------------------------------------------------------ */
/* Techniciens extérieurs                                              */
/* ------------------------------------------------------------------ */

export type StatutIntervention = 'A_PLANIFIER' | 'PRESSENTI' | 'CONFIRME' | 'SUR_SITE' | 'TERMINEE' | 'ANNULEE';

export type CritereEvaluation =
  | 'competence'
  | 'qualite'
  | 'respectPlanning'
  | 'diagnostic'
  | 'efficacite'
  | 'comportement'
  | 'respectConsignes'
  | 'compteRendu'
  | 'redemarrage';

export interface Evaluation {
  notes: Record<CritereEvaluation, number>; // 1..5
  commentaire: string;
  auteur: string;
  date: ISODate;
}

export interface Intervention {
  id: ID;
  revisionId: ID;
  entreprise: string;
  technicien: string;
  specialite: string;
  machineId?: ID;
  intervention: string;
  datePrevue: ISODate;
  dateReelle?: ISODate;
  dureeJours: number;
  cout: number;
  devise: string;
  statut: StatutIntervention;
  evaluation?: Evaluation;
}

/* ------------------------------------------------------------------ */
/* Travaux                                                             */
/* ------------------------------------------------------------------ */

export type StatutTravail = 'A_FAIRE' | 'EN_COURS' | 'TERMINE' | 'BLOQUE';
export type Priorite = 'P1' | 'P2' | 'P3';

export interface Travail {
  id: ID;
  revisionId: ID;
  code: string;
  machineId?: ID;
  sousEnsemble: string;
  description: string;
  responsable: string;
  priorite: Priorite;
  criticite: Criticite;
  /** Décalage au plus tôt imposé (jours depuis le début de révision). */
  decalageMinJours: number;
  dureePrevueJours: number;
  dateReelleDebut?: ISODate;
  dateReelleFin?: ISODate;
  statut: StatutTravail;
  dependances: ID[];
  pdrIds: ID[];
  interventionId?: ID;
  motifBlocage?: string;
}

/* ------------------------------------------------------------------ */
/* Redémarrage et stabilisation                                        */
/* ------------------------------------------------------------------ */

export interface IncidentRedemarrage {
  id: ID;
  revisionId: ID;
  machineId?: ID;
  date: ISODate;
  heure: string;
  probleme: string;
  symptome: string;
  cause: string;
  actionCorrective: string;
  dureeSupH: number;
  responsable: string;
  impact: 'FAIBLE' | 'MOYEN' | 'FORT';
  commentaire: string;
}

export interface StabilisationJour {
  id: ID;
  revisionId: ID;
  date: ISODate;
  arrets: number;
  microArrets: number;
  defauts: number;
  vitessePct: number;
  qualitePct: number;
  interventions: number;
  trsPct: number;
}

/* ------------------------------------------------------------------ */
/* REX                                                                 */
/* ------------------------------------------------------------------ */

export type DomaineRex =
  | 'PDR'
  | 'FOURNISSEURS'
  | 'ACHATS'
  | 'TRANSIT'
  | 'RECEPTION'
  | 'TECHNICIENS'
  | 'TRAVAUX'
  | 'RETARDS'
  | 'REDEMARRAGE'
  | 'STABILISATION';

export interface RexConstat {
  domaine: DomaineRex;
  constat: string;
  /** Généré automatiquement à partir des données de la révision. */
  auto: boolean;
}

export interface RexLecon {
  id: ID;
  domaine: DomaineRex;
  lecon: string;
  actionProchaineRevision: string;
  responsable: Role;
  integree: boolean;
}

export interface Rex {
  id: ID;
  revisionId: ID;
  ligneId: ID;
  dateCreation: ISODate;
  statut: 'BROUILLON' | 'VALIDE';
  constats: RexConstat[];
  lecons: RexLecon[];
  pointsPositifs: string;
  pointsNegatifs: string;
}

/* ------------------------------------------------------------------ */
/* Notifications, audit                                                */
/* ------------------------------------------------------------------ */

export type Niveau = 'INFO' | 'VIGILANCE' | 'ACTION' | 'CRITIQUE';
export type StatutNotification = 'NOUVELLE' | 'ACQUITTEE' | 'EN_TRAITEMENT' | 'CLOTUREE';

export interface EtatNotification {
  cle: string;
  statut: StatutNotification;
  date: ISODate;
  auteur: string;
  commentaire?: string;
}

export interface AuditEntry {
  id: ID;
  horodatage: string;
  auteur: string;
  role: Role;
  entite: string;
  entiteId: ID;
  revisionId?: ID;
  action: string;
  detail: string;
  avant?: string;
  apres?: string;
}

/* ------------------------------------------------------------------ */
/* Paramètres                                                          */
/* ------------------------------------------------------------------ */

export interface Parametres {
  /** Date de référence (pilotage / démonstration). Vide = date du jour. */
  dateReference?: ISODate;
  /** Marge exigée entre disponibilité PDR et début de révision (jours). */
  margePdrJours: number;
  /** Délai type Fournisseur → Abidjan (fret maritime, jours). */
  delaiFretJours: number;
  /** Délai type Fournisseur → Abidjan (fret aérien, jours). */
  delaiFretAerienJours: number;
  /** Délai type Abidjan → usine (dédouanement + acheminement, jours). */
  delaiAbidjanUsineJours: number;
  /** Délai type de réception (physique + système, jours). */
  delaiReceptionJours: number;
  /** Délai de confirmation de commande au-delà duquel on relance (jours). */
  delaiConfirmationJours: number;
  /** Préparation : nombre de mois avant révision. */
  moisPreparation: number;
  devise: string;
  /**
   * Mode de saisie : ADMIN = seuls les administrateurs saisissent, tous les autres
   * profils sont en lecture (mise en route) ; ROLES = chaque métier saisit son domaine.
   */
  modeSaisie?: 'ADMIN' | 'ROLES';
  /** Droits de modification par domaine, définis par l'administrateur (mode ROLES). */
  droits?: Partial<Record<string, Role[]>>;
}

export interface Donnees {
  version: number;
  sites: Site[];
  ateliers: Atelier[];
  lignes: Ligne[];
  machines: Machine[];
  sousEnsembles: SousEnsemble[];
  organes: Organe[];
  catalogue: ArticlePDR[];
  utilisateurs: Utilisateur[];
  revisions: Revision[];
  gammes: GammeVersion[];
  imports: ImportHistorique[];
  pdrs: Pdr[];
  interventions: Intervention[];
  travaux: Travail[];
  incidents: IncidentRedemarrage[];
  stabilisation: StabilisationJour[];
  rex: Rex[];
  notifications: EtatNotification[];
  audit: AuditEntry[];
  parametres: Parametres;
}
