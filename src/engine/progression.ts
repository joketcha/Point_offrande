/**
 * SYSTÈME DE CARRIÈRE : XP, niveaux, compétences, certifications, scores,
 * difficulté adaptative et recommandations de missions.
 *
 * Principe : une promotion exige de l'XP ET des résultats réels
 * (certification pratique, impact industriel mesuré dans l'usine simulée).
 */
import { MISSIONS, type MissionMeta } from '../data/missions';
import type { CertId, GameState, MissionResult, MonthKpi, PlayerState, SkillId, StepResult } from './types';

export const SKILLS: { id: SkillId; label: string }[] = [
  { id: 'RELIABILITY', label: 'Fiabilité' },
  { id: 'MAINTENANCE', label: 'Maintenance' },
  { id: 'DATA', label: 'Data Analytics' },
  { id: 'RCM', label: 'RCM / MBF' },
  { id: 'AMDEC', label: 'AMDEC' },
  { id: 'WEIBULL', label: 'Weibull' },
  { id: 'RCA', label: 'RCA' },
  { id: 'PREDICTIVE', label: 'Prédictif' },
  { id: 'GMAO', label: 'GMAO' },
  { id: 'SPARES', label: 'Pièces de rechange' },
  { id: 'TPM', label: 'TPM' },
  { id: 'LEAN', label: 'Lean' },
  { id: 'ECONOMICS', label: 'Économie' },
  { id: 'LEADERSHIP', label: 'Leadership' },
  { id: 'PROJECT', label: 'Gestion de projet' },
  { id: 'COMMUNICATION', label: 'Communication' },
];

export const SKILL_LABEL = Object.fromEntries(SKILLS.map((s) => [s.id, s.label])) as Record<SkillId, string>;

export interface LevelDef {
  level: number;
  title: string;
  xp: number;
  cert?: CertId;
  minImpact?: number;
}

export const LEVELS: LevelDef[] = [
  { level: 1, title: 'Technicien / Analyste maintenance', xp: 0 },
  { level: 2, title: 'Ingénieur Maintenance', xp: 250, cert: 'bronze' },
  { level: 3, title: 'Ingénieur Méthodes', xp: 700, minImpact: 10 },
  { level: 4, title: 'Ingénieur Fiabiliste', xp: 1300, cert: 'silver' },
  { level: 5, title: 'Senior Reliability Engineer', xp: 2000, cert: 'gold' },
  { level: 6, title: 'Reliability Manager', xp: 2900, cert: 'platinum', minImpact: 35 },
  { level: 7, title: 'Asset Performance Manager', xp: 3900, minImpact: 45 },
  { level: 8, title: 'Directeur Maintenance & Fiabilité', xp: 5000, cert: 'diamond' },
  { level: 9, title: 'Directeur Performance Industrielle', xp: 6300, minImpact: 60 },
  { level: 10, title: 'GLOBAL RELIABILITY & ASSET MANAGEMENT EXPERT', xp: 7800, cert: 'master' },
];

export interface CertDef {
  id: CertId;
  name: string;
  title: string;
  color: string;
  description: string;
  missions: string[];
  minScore: number;
  plant?: { availability?: number; maturity?: number; months?: number; budget?: boolean };
  requires?: CertId;
}

export const CERTS: CertDef[] = [
  { id: 'bronze', name: 'Bronze', title: 'Maintenance Analyst', color: '#cd7f32', description: 'Épreuve pratique : fiabiliser une extraction GMAO et calculer MTBF/MTTR/disponibilité sur données réelles.', missions: ['gmao-onboarding', 'kpi-basics'], minScore: 65 },
  { id: 'silver', name: 'Silver', title: 'Maintenance Engineer', color: '#c0c0c0', description: 'Épreuve pratique : analyse Weibull sur données sales + AMDEC d’un équipement critique.', missions: ['weibull-p101', 'amdec-pasteurisateur'], minScore: 70, requires: 'bronze' },
  { id: 'gold', name: 'Gold', title: 'Reliability Engineer', color: '#f5c542', description: 'Épreuve pratique : RCM complet, RCA avec causes racines vérifiées, intervalle P-F.', missions: ['rcm-p101', 'rca-convoyeur', 'pf-sertisseuse'], minScore: 70, requires: 'silver' },
  { id: 'platinum', name: 'Platinum', title: 'Senior Reliability Engineer', color: '#8fd3f4', description: 'Épreuve pratique : stratégie pièces, gestion de crise, défense devant le comité de direction.', missions: ['spares-magasin', 'crise-soutireuse', 'comite-pdm'], minScore: 70, requires: 'gold', plant: { availability: 0.88, months: 3 } },
  { id: 'diamond', name: 'Diamond', title: 'Reliability Manager', color: '#b9f2ff', description: 'Épreuve terrain : 6 mois de pilotage avec disponibilité ≥ 92 %, maturité ≥ 3 et budget tenu.', missions: ['systemes-froid', 'tco-compresseur'], minScore: 70, requires: 'platinum', plant: { availability: 0.92, maturity: 3, months: 6, budget: true } },
  { id: 'master', name: 'Master', title: 'Global Reliability Expert', color: '#e879f9', description: 'Épreuve finale « TAKE OVER THE FACTORY » : redresser une usine du groupe en 12 mois.', missions: ['takeover'], minScore: 75, requires: 'diamond' },
];

export function levelDef(level: number): LevelDef {
  return LEVELS[Math.min(Math.max(level, 1), 10) - 1];
}

export function newPlayer(name: string): PlayerState {
  const skills = Object.fromEntries(SKILLS.map((s) => [s.id, 10])) as Record<SkillId, number>;
  return {
    name,
    createdAt: Date.now(),
    level: 1,
    xp: 0,
    skills,
    missions: {},
    attempts: {},
    errors: {},
    certifications: [],
    badges: [],
    reasoningLog: [],
    promotions: [{ level: 1, month: 0, at: Date.now() }],
  };
}

// ------------------------------------------------------------------ scoring d'étape & mission

/** Score d'une décision : les erreurs et indices coûtent, mais on apprend en refaisant. */
export function stepScore(attempts: number, hints: number): number {
  return Math.max(15, 100 - 25 * Math.max(0, attempts - 1) - 8 * hints);
}

export function missionScore(steps: StepResult[]): number {
  if (!steps.length) return 0;
  return Math.round(steps.reduce((a, s) => a + s.score, 0) / steps.length);
}

/** Met à jour le profil après une mission. Retourne le nouvel état joueur et l'XP gagnée. */
export function applyMissionResult(p: PlayerState, meta: MissionMeta, steps: StepResult[], month: number): { player: PlayerState; result: MissionResult; xpGain: number; newBadges: string[] } {
  const score = missionScore(steps);
  const previous = p.missions[meta.id];
  const attempt = (p.attempts[meta.id] ?? 0) + 1;
  // XP pleine au premier passage, réduite en rejouant (sauf amélioration du meilleur score).
  const base = meta.xp * (score / 100);
  const xpGain = Math.round(previous ? Math.max(0, base - meta.xp * (previous.score / 100)) + base * 0.1 : base);
  const player: PlayerState = structuredClone(p);
  player.xp += xpGain;
  player.attempts[meta.id] = attempt;

  // Compétences : moyenne mobile vers la performance observée (apprentissage progressif).
  const perSkill = new Map<SkillId, number[]>();
  for (const s of steps) for (const sk of s.skills) perSkill.set(sk, [...(perSkill.get(sk) ?? []), s.score]);
  for (const sk of meta.skills) if (!perSkill.has(sk)) perSkill.set(sk, [score]);
  for (const [sk, scores] of perSkill) {
    const obs = scores.reduce((a, b) => a + b, 0) / scores.length;
    const cur = player.skills[sk];
    const ceiling = Math.min(100, 40 + meta.tier * 12); // une mission de tier 1 ne peut pas faire de vous un expert
    const target = (obs / 100) * ceiling;
    player.skills[sk] = Math.round(Math.max(cur, cur + (target - cur) * 0.6) * 10) / 10;
  }
  for (const s of steps) for (const tag of s.errorTags) player.errors[tag] = (player.errors[tag] ?? 0) + 1;
  for (const s of steps)
    for (const text of s.reasoning) player.reasoningLog.push({ at: Date.now(), missionId: meta.id, stepId: s.stepId, text });
  player.reasoningLog = player.reasoningLog.slice(-300);

  const result: MissionResult = { missionId: meta.id, score, xp: xpGain, completedAt: Date.now(), month, steps };
  if (!previous || previous.score <= score) player.missions[meta.id] = result;

  const newBadges: string[] = [];
  const addBadge = (b: string) => {
    if (!player.badges.includes(b)) {
      player.badges.push(b);
      newBadges.push(b);
    }
  };
  if (score >= 95) addBadge(`Sans faute : ${meta.title}`);
  if (steps.every((s) => s.hints === 0) && score >= 80) addBadge(`Autonome : ${meta.title}`);
  if (Object.keys(player.missions).length >= 5) addBadge('Polyvalent — 5 missions');
  if (Object.keys(player.missions).length >= 10) addBadge('Couteau suisse — 10 missions');
  return { player, result, xpGain, newBadges };
}

// ------------------------------------------------------------------ scores globaux

/** Reliability Score (0-1000) : maîtrise des compétences techniques pondérées. */
export function reliabilityScore(p: PlayerState): number {
  const w: Partial<Record<SkillId, number>> = { RELIABILITY: 2, WEIBULL: 1.5, RCM: 1.5, AMDEC: 1.2, RCA: 1.5, PREDICTIVE: 1.2, DATA: 1.2, MAINTENANCE: 1, GMAO: 1, SPARES: 1, ECONOMICS: 1 };
  let s = 0,
    t = 0;
  for (const [k, v] of Object.entries(p.skills)) {
    const wk = w[k as SkillId] ?? 0.6;
    s += v * wk;
    t += 100 * wk;
  }
  return Math.round((s / t) * 1000);
}

/** Moyenne des N derniers mois d'un KPI. */
export function avgKpi(kpis: MonthKpi[], key: keyof MonthKpi, n = 3, from?: number): number {
  const slice = from !== undefined ? kpis.slice(from, from + n) : kpis.slice(-n);
  if (!slice.length) return NaN;
  return slice.reduce((a, k) => a + (k[key] as number), 0) / slice.length;
}

/**
 * Industrial Impact Score (0-100) : amélioration mesurée de l'usine
 * (3 derniers mois vs 3 premiers mois de prise de poste).
 */
export function industrialImpact(g: GameState): number {
  const k = g.plant.kpis;
  if (k.length < 6) return 0;
  const base = (key: keyof MonthKpi) => avgKpi(k, key, 3, 0);
  const now = (key: keyof MonthKpi) => avgKpi(k, key, 3);
  const dA = (now('availability') - base('availability')) * 100; // points
  const dLoss = base('productionLoss') > 0 ? (base('productionLoss') - now('productionLoss')) / base('productionLoss') : 0;
  const dCost = base('maintCost') > 0 ? (base('maintCost') - now('maintCost')) / base('maintCost') : 0;
  const dStock = base('stockValue') > 0 ? (base('stockValue') - now('stockValue')) / base('stockValue') : 0;
  const dData = (g.plant.dataQuality - k[0].dataQuality) / 100;
  const dRepeat = base('repeatFailures') - now('repeatFailures');
  const raw = dA * 3 + dLoss * 40 + dCost * 25 + dStock * 15 + dData * 30 + dRepeat * 2 + (g.plant.resolvedDefects.length * 4);
  return Math.round(Math.max(0, Math.min(100, raw)));
}

// ------------------------------------------------------------------ maturité

export const MATURITY_DIMENSIONS = [
  'Stratégie',
  'Organisation',
  'Compétences',
  'Données',
  'GMAO',
  'Préventif',
  'Conditionnel',
  'Fiabilité',
  'Stock',
  'Planification',
  'RCA',
  'KPI',
  'Amélioration continue',
  'Leadership',
] as const;

export const MATURITY_LEVELS = ['Réactif', 'Stabilisé', 'Préventif', 'Prédictif', 'Fiabilité intégrée', 'Asset Performance Excellence'];

export function maturityAudit(g: GameState): { scores: Record<string, number>; level: number } {
  const p = g.plant;
  const k = p.kpis.at(-1);
  const pl = g.player;
  const done = (id: string) => (pl.missions[id]?.score ?? 0) / 100;
  const modes = Object.values(p.modes);
  const cbmShare = modes.filter((m) => m.policy.strategy === 'CBM' || m.policy.strategy === 'PDM').length / modes.length;
  const rtfShare = modes.filter((m) => m.policy.strategy === 'RTF').length / modes.length;
  const sc = (x: number) => Math.max(1, Math.min(6, 1 + x * 5));
  const scores: Record<string, number> = {
    Stratégie: sc(0.5 * done('rcm-p101') + 0.3 * done('comite-pdm') + 0.2 * (1 - rtfShare)),
    Organisation: sc(0.5 * (p.teamMorale / 100) + 0.5 * (k ? Math.min(1, 1 - k.backlogWeeks / 8) : 0)),
    Compétences: sc(Object.values(pl.skills).reduce((a, b) => a + b, 0) / (16 * 100)),
    Données: sc(p.dataQuality / 100),
    GMAO: sc(0.6 * done('gmao-onboarding') + 0.4 * (p.dataQuality / 100)),
    Préventif: sc(k ? k.pmCompliance * 0.7 + 0.3 * done('rcm-p101') : 0),
    Conditionnel: sc(cbmShare * 1.3 + 0.2 * done('pf-sertisseuse')),
    Fiabilité: sc(0.4 * done('weibull-p101') + 0.3 * done('amdec-pasteurisateur') + 0.3 * done('systemes-froid')),
    Stock: sc(0.5 * done('spares-magasin') + 0.5 * (k?.criticalSpareAvailability ?? 0)),
    Planification: sc(k ? Math.max(0, k.plannedPct) * 0.8 + 0.2 * Math.max(0, 1 - k.backlogWeeks / 8) : 0),
    RCA: sc(0.6 * done('rca-convoyeur') + 0.4 * (p.rcaOpened ? p.rcaClosed / p.rcaOpened : 0)),
    KPI: sc(0.5 * done('kpi-basics') + 0.5 * Math.min(1, p.kpis.length / 12)),
    'Amélioration continue': sc(p.resolvedDefects.length / Math.max(1, 4) * 0.8 + 0.2 * done('tco-compresseur')),
    Leadership: sc(0.5 * (p.directionTrust / 100) + 0.3 * (pl.skills.LEADERSHIP / 100) + 0.2 * done('crise-soutireuse')),
  };
  const avg = Object.values(scores).reduce((a, b) => a + b, 0) / MATURITY_DIMENSIONS.length;
  // Le maillon faible plafonne la maturité (on ne peut pas être « prédictif » avec des données médiocres).
  const min = Math.min(...Object.values(scores));
  return { scores, level: Math.max(1, Math.min(6, Math.floor(Math.min(avg, min + 1.5)))) };
}

// ------------------------------------------------------------------ certifications & promotions

export function certStatus(g: GameState, c: CertDef): { eligible: boolean; missing: string[] } {
  const missing: string[] = [];
  const p = g.player;
  if (c.requires && !p.certifications.includes(c.requires)) missing.push(`Certification ${c.requires} requise`);
  for (const m of c.missions) {
    const r = p.missions[m];
    const meta = MISSIONS.find((x) => x.id === m);
    if (!r || r.score < c.minScore) missing.push(`${meta?.title ?? m} ≥ ${c.minScore} (actuel : ${r ? r.score : '—'})`);
  }
  if (c.plant) {
    const n = c.plant.months ?? 3;
    const k = g.plant.kpis;
    if (k.length < n) missing.push(`Piloter l’usine au moins ${n} mois (actuel : ${k.length})`);
    else {
      if (c.plant.availability !== undefined) {
        const a = avgKpi(k, 'availability', n);
        if (a < c.plant.availability) missing.push(`Disponibilité moyenne ${n} mois ≥ ${(c.plant.availability * 100).toFixed(0)} % (actuel : ${(a * 100).toFixed(1)} %)`);
      }
      if (c.plant.budget) {
        const over = k.slice(-n).filter((x) => x.maintCost > x.budget * 1.05).length;
        if (over > 1) missing.push(`Budget tenu (≤ +5 %) sur ${n} mois (${over} dépassements)`);
      }
    }
    if (c.plant.maturity !== undefined) {
      const m = maturityAudit(g).level;
      if (m < c.plant.maturity) missing.push(`Maturité ≥ ${c.plant.maturity} (actuel : ${m})`);
    }
  }
  if (c.id === 'master' && !g.takeover?.verdict?.passed) {
    if (!missing.some((x) => x.includes('TAKE OVER'))) missing.push('Réussir « TAKE OVER THE FACTORY »');
  }
  return { eligible: missing.length === 0, missing };
}

export function promotionStatus(g: GameState): { next?: LevelDef; eligible: boolean; missing: string[] } {
  const next = LEVELS[g.player.level];
  if (!next) return { eligible: false, missing: [] };
  const missing: string[] = [];
  if (g.player.xp < next.xp) missing.push(`XP ${g.player.xp} / ${next.xp}`);
  if (next.cert && !g.player.certifications.includes(next.cert)) missing.push(`Certification ${CERTS.find((c) => c.id === next.cert)!.name}`);
  if (next.minImpact) {
    const imp = industrialImpact(g);
    if (imp < next.minImpact) missing.push(`Industrial Impact Score ≥ ${next.minImpact} (actuel : ${imp})`);
  }
  return { next, eligible: missing.length === 0, missing };
}

// ------------------------------------------------------------------ difficulté adaptative

export const ERROR_LABEL: Record<string, string> = {
  'data-not-cleaned': 'Analyse lancée sur des données non nettoyées',
  'ignore-censoring': 'Censures (suspensions) ignorées',
  'beta-misread': 'Mauvaise interprétation de β',
  'calendar-vs-run': 'Confusion heures calendaires / heures de marche',
  'rpn-only': 'Décision fondée uniquement sur le produit S×O×D',
  'detection-incoherent': 'Cotation de détectabilité incohérente avec les moyens de détection',
  'mode-cause-confusion': 'Confusion mode / cause / effet',
  'oem-copy': 'Plan constructeur recopié sans analyse du contexte',
  'hidden-failure': 'Défaillance cachée non traitée',
  'pm-on-random': 'Préventif systématique sur un mode aléatoire (β ≈ 1)',
  'false-root-cause': 'Fausse cause racine (symptôme ou personne)',
  'blame-person': 'Cause attribuée à une personne plutôt qu’au système',
  'no-verification': 'Action corrective sans vérification d’efficacité',
  'stock-no-risk': 'Suppression de stock sans évaluer le risque',
  'overstock': 'Surstockage non justifié économiquement',
  'crisis-no-hse': 'Décision de crise ignorant la sécurité',
  'crisis-expected-value': 'Décision de crise non fondée sur le coût espéré',
  'pf-too-long': 'Intervalle d’inspection supérieur à l’intervalle P-F',
  'pf-too-short': 'Intervalle d’inspection inutilement court',
  'kpi-isolated': 'KPI interprété isolément',
  'roi-missing': 'Argumentaire sans ROI / sans risque chiffré',
  'mtbf-calc': 'Erreur de calcul MTBF / MTTR',
  'availability-calc': 'Erreur de calcul de disponibilité',
  'series-parallel': 'Confusion série / parallèle',
  'tco-capex-only': 'Choix d’investissement sur le seul prix d’achat',
  'vague-task': 'Gamme de maintenance vague (non exécutable)',
  'signature-misread': 'Signature vibratoire mal interprétée',
  'single-technique': 'Diagnostic posé sur une seule technique',
  'rul-misread': 'Durée de vie résiduelle (RUL) mal estimée',
  'intervene-too-early': 'Intervention trop précoce (potentiel de vie gaspillé)',
  'intervene-too-late': 'Intervention trop tardive (risque de défaillance fonctionnelle)',
};

/** Recommande les prochaines missions en ciblant les compétences les plus faibles. */
export function recommendMissions(g: GameState, n = 3): { meta: MissionMeta; reason: string }[] {
  const p = g.player;
  const weakest = [...SKILLS].sort((a, b) => p.skills[a.id] - p.skills[b.id]).map((s) => s.id);
  const errorSkills = new Map<SkillId, number>();
  for (const m of MISSIONS)
    for (const tag of m.errorTags ?? [])
      if (p.errors[tag]) for (const sk of m.skills) errorSkills.set(sk, (errorSkills.get(sk) ?? 0) + p.errors[tag]);
  const scored = MISSIONS.filter((m) => m.minLevel <= p.level && m.id !== 'takeover')
    .map((m) => {
      const best = p.missions[m.id]?.score;
      let s = 0;
      m.skills.forEach((sk) => {
        s += (100 - p.skills[sk]) / 10 + (errorSkills.get(sk) ?? 0) * 2;
        if (weakest.slice(0, 4).includes(sk)) s += 5;
      });
      if (best === undefined) s += 12;
      else if (best < 70) s += 8;
      else s -= 15;
      const weakSkill = m.skills.slice().sort((a, b) => p.skills[a] - p.skills[b])[0];
      const reason =
        best === undefined
          ? `Nouvelle mission — développe ${SKILL_LABEL[weakSkill]} (${Math.round(p.skills[weakSkill])}/100)`
          : best < 70
            ? `À refaire : score ${best} — consolider ${SKILL_LABEL[weakSkill]}`
            : `Entraînement ciblé ${SKILL_LABEL[weakSkill]}`;
      return { meta: m, s, reason };
    })
    .sort((a, b) => b.s - a.s);
  return scored.slice(0, n).map(({ meta, reason }) => ({ meta, reason }));
}

/** Niveau de difficulté d'une mission (1-3) adapté au profil. */
export function adaptiveDifficulty(p: PlayerState, meta: MissionMeta): 1 | 2 | 3 {
  const sk = meta.skills.reduce((a, s) => a + p.skills[s], 0) / meta.skills.length;
  const best = p.missions[meta.id]?.score ?? 0;
  if (sk > 55 || best >= 85) return 3;
  if (sk > 30 || best >= 70) return 2;
  return 1;
}
