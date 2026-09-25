/**
 * Modèle de domaine de RELIABILITY MASTER.
 * Ces types constituent le « schéma » persistant du jeu (voir docs/ARCHITECTURE.md §3).
 */

// ============================================================ Équipements & pannes

export type Criticality = 'A' | 'B' | 'C';

export type DetectionTechnique =
  | 'vibration'
  | 'thermographie'
  | 'huile'
  | 'ultrasons'
  | 'courant'
  | 'process'
  | 'visuel';

export interface FailureModeDef {
  id: string;
  /** Mode de défaillance (ex. « Usure garniture mécanique ») */
  name: string;
  /** Mécanisme / cause physique dominante */
  mechanism: string;
  /** Loi de vie intrinsèque (heures de fonctionnement) quand la cause latente est maîtrisée */
  beta: number;
  eta: number;
  /** Intervalle P-F (h) si le mode est détectable avant la défaillance fonctionnelle */
  pf?: number;
  detection?: DetectionTechnique[];
  /** Durée technique de réparation (h), hors attente de pièce */
  mttr: number;
  /** Heures-homme par intervention */
  laborHours: number;
  partId?: string;
  partQty?: number;
  /** Surcoût de dommages secondaires en cas de panne (× coût pièce) */
  secondaryDamage: number;
  /** Mode ayant un impact sécurité / environnement */
  hse?: boolean;
  /** Mode caché (ne se révèle que sur sollicitation, ex. pompe de secours) */
  hidden?: boolean;
}

export interface EquipmentDef {
  tag: string;
  name: string;
  type: string;
  lineId: string;
  criticality: Criticality;
  /** Perte de marge (FCFA) par heure d'arrêt non planifié */
  lossRate: number;
  /** Présence d'une redondance active/stand-by */
  redundant: boolean;
  /** Heures de marche par mois */
  runHours: number;
  /** Âge (années) — influence la dérive */
  ageYears: number;
  manufacturer: string;
  modes: FailureModeDef[];
}

export interface LineDef {
  id: string;
  name: string;
  /** Production nominale (unités/heure) */
  rate: number;
  unit: string;
  /** Marge par unité (FCFA) */
  marginPerUnit: number;
}

export interface SparePartDef {
  id: string;
  ref: string;
  name: string;
  unitCost: number;
  leadDays: number;
  /** Délai express (avion, fournisseur local…) */
  expressDays: number;
  expressPremium: number; // multiplicateur du coût
  critical: boolean;
  /** Articles doublons/obsolètes (pièges de données) */
  duplicateOf?: string;
  obsolete?: boolean;
  local?: boolean;
}

/** Cause latente présente dans l'usine (source de pannes répétitives). */
export interface LatentDefect {
  id: string;
  label: string;
  /** Multiplicateur appliqué à η des modes affectés (< 1 = dégrade) */
  etaFactor: number;
  modes: string[]; // ids de mode (equipTag:modeId)
  resolvedBy: string; // id de mission ou d'action
}

export interface PlantDef {
  id: string;
  name: string;
  site: string;
  country: string;
  region: Region;
  sector: string;
  currency: string;
  lines: LineDef[];
  equipment: EquipmentDef[];
  parts: SparePartDef[];
  latentDefects: LatentDefect[];
  laborRate: number; // FCFA / h
  technicians: number;
  hoursPerTech: number; // heures productives / mois
  monthlyBudget: number;
  holdingRate: number; // taux de possession annuel du stock
  initialDataQuality: number;
  /** Stock initial (dont dormant) */
  initialStock: Record<string, number>;
  /** Politiques de maintenance héritées (souvent mal calibrées) — clé tag:modeId */
  initialPolicies?: Record<string, Partial<ModePolicy>>;
}

export type Region = 'Afrique' | 'Europe' | 'Moyen-Orient' | 'Asie' | 'Amérique du Nord' | 'Amérique du Sud';

// ============================================================ Politiques

export type Strategy = 'RTF' | 'PM' | 'CBM' | 'PDM';

export const STRATEGY_LABEL: Record<Strategy, string> = {
  RTF: 'Correctif (run-to-failure)',
  PM: 'Préventif systématique',
  CBM: 'Conditionnel (inspections)',
  PDM: 'Prédictif (surveillance en ligne)',
};

export interface ModePolicy {
  strategy: Strategy;
  /** Intervalle de remplacement préventif (h de marche) */
  pmInterval: number;
  /** Intervalle d'inspection conditionnelle (h de marche) */
  inspInterval: number;
}

export interface SparePolicy {
  min: number; // point de commande
  max: number; // niveau de recomplètement
}

// ============================================================ État dynamique

export interface ModeState {
  age: number;
  policy: ModePolicy;
}

export interface PendingOrder {
  partId: string;
  qty: number;
  arrivalMonth: number;
  express: boolean;
}

export interface FailureEvent {
  month: number;
  tag: string;
  modeId: string;
  kind: 'panne' | 'intervention-planifiee' | 'preventif' | 'induite';
  downtime: number;
  waitParts: number;
  cost: number;
  loss: number;
  /** Cause codée dans la GMAO (peut être vide si la donnée est pauvre) */
  codedCause?: string;
  repeat?: boolean;
}

export interface MonthKpi {
  month: number;
  availability: number; // 0..1 (pondérée par criticité)
  mtbf: number;
  mttr: number;
  failures: number;
  plannedPct: number;
  emergencyPct: number;
  pmCompliance: number;
  backlogWeeks: number;
  maintCost: number;
  laborCost: number;
  partsCost: number;
  productionLoss: number;
  stockValue: number;
  holdingCost: number;
  stockouts: number;
  criticalSpareAvailability: number;
  repeatFailures: number;
  oee: number;
  oeeA: number;
  oeeP: number;
  oeeQ: number;
  dataQuality: number;
  pdmEffectiveness: number;
  budget: number;
  costPerUnit: number;
  rcaClosure: number;
}

export interface PlantState {
  plantId: string;
  month: number;
  seed: number;
  modes: Record<string, ModeState>; // key = tag:modeId
  stock: Record<string, number>;
  sparePolicy: Record<string, SparePolicy>;
  lastMovement: Record<string, number>;
  orders: PendingOrder[];
  backlogHours: number;
  lastCorrectiveHours?: number;
  technicians: number;
  dataQuality: number;
  resolvedDefects: string[];
  /** Mois de résolution de chaque cause latente (pour mesurer l'efficacité des actions) */
  resolvedAt: Record<string, number>;
  /** Taux de maîtrise des RCA (actions clôturées / pannes répétitives analysées) */
  rcaOpened: number;
  rcaClosed: number;
  events: FailureEvent[];
  kpis: MonthKpi[];
  directionTrust: number; // 0..100
  safetyIndex: number; // 0..100
  teamMorale: number; // 0..100
  modifiers: PlantModifier[];
  /** Capacités débloquées : 'PDM', 'REDUNDANCY:P-101', 'DIAGNOSTIC', etc. */
  unlocks: string[];
  /** Projets d'amélioration réalisés */
  projects: string[];
  /** Dépenses de projets à imputer au mois suivant */
  pendingSpend: number;
  pendingDecision?: PressureEvent;
  journal: JournalEntry[];
}

export interface PlantModifier {
  id: string;
  label: string;
  untilMonth: number;
  lossFactor?: number;
  budgetFactor?: number;
  leadTimeFactor?: number;
  partsCostFactor?: number;
  capacityFactor?: number;
  mttrFactor?: number;
}

export interface JournalEntry {
  month: number;
  kind: 'info' | 'alerte' | 'decision' | 'succes' | 'crise';
  text: string;
}

// ============================================================ Événements sous pression

export interface PressureOption {
  id: string;
  label: string;
  detail: string;
  effects: PressureEffect;
  /** Avis des mentors sur l'option */
  mentorTake?: { mentor: MentorId; text: string }[];
}

export interface PressureEffect {
  trust?: number;
  safety?: number;
  morale?: number;
  cost?: number;
  loss?: number;
  dataQuality?: number;
  technicians?: number;
  modifier?: Omit<PlantModifier, 'untilMonth'> & { months: number };
  ageBoost?: { key: string; hours: number };
  skill?: Partial<Record<SkillId, number>>;
  message: string;
}

export interface PressureEvent {
  id: string;
  title: string;
  context: string;
  urgency: 'haute' | 'critique' | 'moyenne';
  options: PressureOption[];
}

// ============================================================ Joueur & progression

export type SkillId =
  | 'RELIABILITY'
  | 'MAINTENANCE'
  | 'DATA'
  | 'RCM'
  | 'AMDEC'
  | 'WEIBULL'
  | 'RCA'
  | 'PREDICTIVE'
  | 'GMAO'
  | 'SPARES'
  | 'TPM'
  | 'LEAN'
  | 'ECONOMICS'
  | 'LEADERSHIP'
  | 'PROJECT'
  | 'COMMUNICATION';

export type MentorId = 'mecano' | 'maths' | 'dirmaint' | 'dirind' | 'daf' | 'prod' | 'data' | 'hse';

export type CertId = 'bronze' | 'silver' | 'gold' | 'platinum' | 'diamond' | 'master';

export interface StepResult {
  stepId: string;
  score: number; // 0..100
  attempts: number;
  hints: number;
  skills: SkillId[];
  errorTags: string[];
  reasoning: string[];
}

export interface MissionResult {
  missionId: string;
  score: number;
  xp: number;
  completedAt: number; // timestamp
  month: number;
  steps: StepResult[];
}

export interface PlayerState {
  name: string;
  createdAt: number;
  level: number;
  xp: number;
  skills: Record<SkillId, number>;
  missions: Record<string, MissionResult>; // meilleur résultat par mission
  attempts: Record<string, number>;
  errors: Record<string, number>; // tag → occurrences
  certifications: CertId[];
  badges: string[];
  reasoningLog: { at: number; missionId: string; stepId: string; text: string }[];
  promotions: { level: number; month: number; at: number }[];
}

export interface GameState {
  version: number;
  player: PlayerState;
  plant: PlantState;
  /** Mode « Take over the factory » (épreuve Master) */
  takeover?: TakeoverState;
  settings: { sound: boolean; reducedMotion: boolean };
}

export interface TakeoverState {
  plantId: string;
  startMonth: number;
  baseline?: MonthKpi;
  plant: PlantState;
  finished: boolean;
  verdict?: TakeoverVerdict;
}

export interface TakeoverVerdict {
  score: number;
  passed: boolean;
  criteria: { label: string; target: string; actual: string; ok: boolean }[];
}
