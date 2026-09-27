/**
 * MOTEUR DE SIMULATION INDUSTRIELLE
 *
 * Pas de temps : 1 mois (720 h calendaires). Pour chaque mode de défaillance de
 * chaque équipement, on tire les défaillances selon la loi de Weibull conditionnelle
 * à l'âge du mode, et on applique la politique choisie par le joueur :
 *
 *  - RTF  : on attend la panne.
 *  - PM   : remplacement à âge T (si la capacité de l'équipe le permet et que la pièce
 *           est en stock). Risque de défaillance induite (mortalité infantile post-intervention).
 *  - CBM  : inspections d'intervalle I ; détection si une inspection tombe dans la fenêtre P-F.
 *  - PDM  : surveillance en ligne ; efficacité dépendant de la qualité des données.
 *
 * Les conséquences (arrêt, attente pièce, dommages secondaires, perte de marge)
 * sont chiffrées par le modèle économique. Les causes latentes non résolues dégradent η.
 */
import { PRESSURE_EVENTS } from '../data/events';
import { Rng, hashSeed } from './rng';
import type {
  EquipmentDef,
  FailureEvent,
  FailureModeDef,
  JournalEntry,
  ModePolicy,
  MonthKpi,
  PlantDef,
  PlantModifier,
  PlantState,
  PressureOption,
  SparePolicy,
} from './types';

export const HOURS_PER_MONTH = 720;
const INSPECTION_LABOR = 0.5; // h par inspection conditionnelle
const PDM_MONTHLY_COST = 180_000; // FCFA / mode surveillé en ligne (capteurs, plateforme, analyste)
const INDUCED_FAILURE_P = 0.04; // probabilité de défaillance induite après intervention intrusive
/** Part de la capacité absorbée par le travail non modélisé (demandes d'intervention, petits travaux, 5S…) */
export const BACKGROUND_SHARE = 0.72;
/** Frais fixes (consommables, sous-traitance courante, outillage) en part du budget */
const OVERHEAD_SHARE = 0.2;
/** Part de l'attente pièce réellement subie (réparations provisoires, cannibalisation, contournements) */
const WAIT_EXPOSURE = 0.5;

/** Heures d'ouverture des lignes de production par mois */
export const OPEN_HOURS = 560;

export function potentialMarginPerHour(def: PlantDef): number {
  return def.lines.reduce((a, l) => a + l.rate * l.marginPerUnit, 0);
}

export const modeKey = (tag: string, modeId: string) => `${tag}:${modeId}`;

export function allModes(def: PlantDef): { eq: EquipmentDef; mode: FailureModeDef; key: string }[] {
  return def.equipment.flatMap((eq) => eq.modes.map((mode) => ({ eq, mode, key: modeKey(eq.tag, mode.id) })));
}

// ------------------------------------------------------------------ création

export function defaultPolicy(mode: FailureModeDef): ModePolicy {
  return {
    strategy: 'RTF',
    pmInterval: Math.round((mode.eta * 0.6) / 100) * 100 || 500,
    inspInterval: mode.pf ? Math.max(50, Math.round(mode.pf / 2 / 10) * 10) : 500,
  };
}

export function createPlantState(def: PlantDef, seed: number): PlantState {
  const rng = new Rng(seed);
  const modes: PlantState['modes'] = {};
  for (const { mode, key } of allModes(def)) {
    const base = defaultPolicy(mode);
    const override = def.initialPolicies?.[key] ?? {};
    // Âge initial aléatoire : l'usine n'est pas neuve.
    modes[key] = { age: Math.round(rng.uniform(0.1, 0.9) * mode.eta * 0.7), policy: { ...base, ...override } };
  }
  const sparePolicy: Record<string, SparePolicy> = {};
  const lastMovement: Record<string, number> = {};
  for (const p of def.parts) {
    sparePolicy[p.id] = p.obsolete || p.duplicateOf ? { min: 0, max: 0 } : { min: 0, max: def.initialStock[p.id] ?? 0 };
    lastMovement[p.id] = p.obsolete || p.duplicateOf ? -30 : -rng.int(1, 8);
  }
  return {
    plantId: def.id,
    month: 0,
    seed,
    modes,
    stock: { ...def.initialStock },
    sparePolicy,
    lastMovement,
    orders: [],
    backlogHours: def.technicians * def.hoursPerTech * 0.9, // ~4 semaines de backlog hérité
    technicians: def.technicians,
    dataQuality: def.initialDataQuality,
    resolvedDefects: [],
    resolvedAt: {},
    rcaOpened: 6,
    rcaClosed: 1,
    events: [],
    kpis: [],
    directionTrust: 45,
    safetyIndex: 60,
    teamMorale: 45,
    modifiers: [],
    unlocks: [],
    projects: [],
    pendingSpend: 0,
    journal: [
      {
        month: 0,
        kind: 'info',
        text: `Prise de poste à ${def.name}. Disponibilité en baisse, backlog élevé, GMAO peu fiable. La Direction attend un plan.`,
      },
    ],
  };
}

// ------------------------------------------------------------------ paramètres effectifs

export function isRedundant(eq: EquipmentDef, state: PlantState): boolean {
  return eq.redundant || state.unlocks.includes(`REDUNDANCY:${eq.tag}`);
}

export function effectiveEta(def: PlantDef, state: PlantState, key: string, mode: FailureModeDef): number {
  let eta = mode.eta;
  for (const d of def.latentDefects) {
    if (!state.resolvedDefects.includes(d.id) && d.modes.includes(key)) eta *= d.etaFactor;
  }
  return eta;
}

/**
 * Estimation « GMAO » des paramètres de vie d'un mode : plus la donnée est mauvaise,
 * plus l'estimation est biaisée. Garbage In → Garbage Out.
 */
export function observedWeibull(def: PlantDef, state: PlantState, key: string, mode: FailureModeDef) {
  const eta = effectiveEta(def, state, key, mode);
  const noise = (1 - state.dataQuality / 100) * 0.55;
  const r = new Rng(hashSeed(`${key}|${Math.floor(state.dataQuality / 10)}|${state.seed}`));
  const beta = Math.max(0.4, mode.beta * Math.exp(r.normal(0, noise)));
  const etaObs = eta * Math.exp(r.normal(0, noise * 0.8));
  const confidence = state.dataQuality >= 75 ? 'bonne' : state.dataQuality >= 50 ? 'moyenne' : 'faible';
  return { beta, eta: etaObs, confidence };
}

function activeModifiers(state: PlantState): PlantModifier[] {
  return state.modifiers.filter((m) => m.untilMonth >= state.month + 1);
}

function factor(mods: PlantModifier[], k: keyof PlantModifier): number {
  return mods.reduce((a, m) => a * ((m[k] as number | undefined) ?? 1), 1);
}

export function monthlyCapacity(def: PlantDef, state: PlantState): number {
  const mods = activeModifiers(state);
  const moraleF = 0.8 + 0.2 * (state.teamMorale / 100);
  return state.technicians * def.hoursPerTech * factor(mods, 'capacityFactor') * moraleF;
}

/** Charge planifiable (préventif + inspections) estimée pour un mois. */
export function plannedLoad(def: PlantDef, state: PlantState): number {
  let h = 0;
  for (const { eq, mode, key } of allModes(def)) {
    const p = state.modes[key].policy;
    if (p.strategy === 'PM') h += (eq.runHours / p.pmInterval) * mode.laborHours * 0.8;
    if (p.strategy === 'CBM') h += (eq.runHours / p.inspInterval) * INSPECTION_LABOR;
    if (p.strategy === 'PDM' && state.unlocks.includes('PDM')) h += 0.5;
  }
  return h;
}

/** Probabilité de détecter la dégradation dans la fenêtre P-F. */
export function detectionProbability(pf: number, interval: number, efficiency: number): number {
  const n = pf / interval;
  return n >= 1 ? 1 - Math.pow(1 - efficiency, n) : efficiency * n;
}

// ------------------------------------------------------------------ simulation d'un mois

export interface MonthOutcome {
  state: PlantState;
  kpi: MonthKpi;
  events: FailureEvent[];
}

export function simulateMonth(def: PlantDef, prev: PlantState): MonthOutcome {
  const month = prev.month + 1;
  const rng = new Rng(hashSeed(`${prev.seed}|${month}|${prev.plantId}`));
  const state: PlantState = structuredClone(prev);
  state.month = month;
  const mods = activeModifiers(prev);
  const partsCostF = factor(mods, 'partsCostFactor');
  const leadF = factor(mods, 'leadTimeFactor');
  const mttrF = factor(mods, 'mttrFactor') * (1 + Math.min(prev.backlogHours / 4000, 0.3));
  const lossF = factor(mods, 'lossFactor');
  const partsById = Object.fromEntries(def.parts.map((p) => [p.id, p]));

  // Capacité et conformité préventive
  const capacity = monthlyCapacity(def, prev);
  const load = plannedLoad(def, prev);
  const modeledCapacity = capacity * (1 - BACKGROUND_SHARE);
  const lastCM = prev.lastCorrectiveHours ?? modeledCapacity * 0.5;
  const available = Math.max(modeledCapacity - lastCM - prev.backlogHours * 0.1, modeledCapacity * 0.1);
  const compliance = load <= 0 ? 1 : Math.max(0.2, Math.min(1, available / load));

  const events: FailureEvent[] = [];
  let laborHours = 0;
  let partsCost = 0;
  let extraCost = 0;
  let productionLoss = 0;
  let stockouts = 0;
  let detected = 0;
  let missed = 0;
  let pmDone = 0;
  let pmDue = 0;
  let correctiveHours = 0;
  const downByEq: Record<string, number> = {};

  const consumePart = (partId: string | undefined, qty: number): { ok: boolean } => {
    if (!partId) return { ok: true };
    const have = state.stock[partId] ?? 0;
    state.lastMovement[partId] = month;
    if (have >= qty) {
      state.stock[partId] = have - qty;
      return { ok: true };
    }
    state.stock[partId] = 0;
    return { ok: false };
  };

  const recentFailures = new Set(
    prev.events.filter((e) => e.kind === 'panne' && e.month >= month - 3).map((e) => `${e.tag}:${e.modeId}`),
  );

  for (const { eq, mode, key } of allModes(def)) {
    const ms = state.modes[key];
    const pol = { ...ms.policy };
    if (pol.strategy === 'PDM' && !prev.unlocks.includes('PDM')) pol.strategy = 'RTF'; // plateforme non installée
    const beta = mode.beta;
    const eta = effectiveEta(def, prev, key, mode);
    const part = mode.partId ? partsById[mode.partId] : undefined;
    const partCost = (part?.unitCost ?? 0) * (mode.partQty ?? 1) * partsCostF;
    const H = eq.runHours;
    const redF = isRedundant(eq, prev) ? 0.15 : 1;
    let t = 0;
    let age = ms.age;
    let infant = false;
    let pmBlocked = false;
    let guard = 0;

    while (t < H && guard++ < 50) {
      const rem = H - t;
      const tf = infant ? rng.weibull(0.7, 350) : rng.weibullResidual(beta, eta, age);

      if (pol.strategy === 'PM' && !pmBlocked) {
        const tp = Math.max(0, pol.pmInterval - age);
        if (tp < tf && tp <= rem) {
          pmDue++;
          const hasPart = !part || (state.stock[part.id] ?? 0) >= (mode.partQty ?? 1);
          if (rng.chance(compliance) && hasPart) {
            pmDone++;
            consumePart(part?.id, mode.partQty ?? 1);
            const down = mode.mttr * 0.6;
            laborHours += mode.laborHours * 0.8;
            partsCost += partCost;
            downByEq[eq.tag] = (downByEq[eq.tag] ?? 0) + down * 0.25; // réalisé en fenêtre planifiée
            const loss = down * eq.lossRate * 0.1 * redF;
            productionLoss += loss;
            events.push({ month, tag: eq.tag, modeId: mode.id, kind: 'preventif', downtime: down, waitParts: 0, cost: partCost + mode.laborHours * 0.8 * def.laborRate, loss });
            age = 0;
            t += tp;
            infant = rng.chance(INDUCED_FAILURE_P + (beta < 1 ? 0.12 : 0));
            continue;
          }
          pmBlocked = true; // préventif non réalisé ce mois (capacité ou pièce manquante)
          if (!hasPart) state.journal.push({ month, kind: 'alerte', text: `Préventif ${eq.tag} reporté : pièce ${part?.ref} indisponible.` });
        }
      }

      if (tf > rem) {
        age += rem;
        break;
      }

      // Une défaillance fonctionnelle surviendrait à t + tf.
      let isDetected = false;
      if ((pol.strategy === 'CBM' || pol.strategy === 'PDM') && mode.pf && !infant) {
        const interval = pol.strategy === 'PDM' ? 12 : pol.inspInterval;
        const eff =
          pol.strategy === 'PDM'
            ? 0.97 * (0.55 + 0.45 * (prev.dataQuality / 100))
            : 0.85 * compliance;
        isDetected = rng.chance(detectionProbability(mode.pf, interval, eff));
        if (isDetected) detected++;
        else missed++;
      }

      const got = consumePart(part?.id, mode.partQty ?? 1);
      const leadCal = (part?.expressDays ?? 0) * 24 * leadF * WAIT_EXPOSURE;
      if (isDetected) {
        // Intervention planifiée : la fenêtre P-F laisse le temps de commander la pièce.
        const pfCal = (mode.pf! * HOURS_PER_MONTH) / H;
        const wait = got.ok ? 0 : Math.max(0, leadCal - pfCal);
        const express = !got.ok && part ? partCost * (part.expressPremium - 1) : 0;
        if (!got.ok && part) stockouts++;
        const down = mode.mttr * 0.75 + wait;
        const loss = (mode.mttr * 0.75 * 0.3 + wait) * eq.lossRate * redF * lossF;
        laborHours += mode.laborHours;
        partsCost += partCost + express;
        downByEq[eq.tag] = (downByEq[eq.tag] ?? 0) + mode.mttr * 0.75 * 0.3 + wait;
        productionLoss += loss;
        events.push({ month, tag: eq.tag, modeId: mode.id, kind: 'intervention-planifiee', downtime: down, waitParts: wait, cost: partCost + express + mode.laborHours * def.laborRate, loss });
      } else {
        const wait = got.ok || !part ? 0 : leadCal;
        const express = !got.ok && part ? partCost * (part.expressPremium - 1) : 0;
        if (!got.ok && part) stockouts++;
        const repair = mode.mttr * mttrF;
        const down = Math.min(HOURS_PER_MONTH, repair + wait);
        const loss = down * eq.lossRate * redF * lossF;
        const cost = partCost * (1 + mode.secondaryDamage) + express + mode.laborHours * 1.4 * def.laborRate;
        laborHours += mode.laborHours * 1.4;
        correctiveHours += mode.laborHours * 1.4;
        partsCost += partCost * (1 + mode.secondaryDamage) + express;
        downByEq[eq.tag] = (downByEq[eq.tag] ?? 0) + down;
        productionLoss += loss;
        const coded = rng.chance(prev.dataQuality / 100);
        const repeat = recentFailures.has(key);
        events.push({
          month,
          tag: eq.tag,
          modeId: mode.id,
          kind: infant ? 'induite' : 'panne',
          downtime: down,
          waitParts: wait,
          cost,
          loss,
          codedCause: coded ? mode.mechanism : undefined,
          repeat,
        });
        recentFailures.add(key);
        if (mode.hse) state.safetyIndex = Math.max(0, state.safetyIndex - 4);
        if (loss > 40_000_000 || wait > 48)
          state.journal.push({
            month,
            kind: 'crise',
            text: `${eq.tag} — ${mode.name} : ${Math.round(down)} h d'arrêt${wait ? ` dont ${Math.round(wait)} h d'attente pièce` : ''}, perte ${fmtM(loss)}.`,
          });
      }
      age = 0;
      infant = rng.chance(INDUCED_FAILURE_P * 0.5);
      t += tf;
    }
    ms.age = age;

    // Coûts de surveillance
    if (pol.strategy === 'CBM') laborHours += (H / pol.inspInterval) * INSPECTION_LABOR * compliance;
    if (pol.strategy === 'PDM') extraCost += PDM_MONTHLY_COST;
  }

  // ---------------- magasin : réceptions, réapprovisionnement, possession
  const arriving = state.orders.filter((o) => o.arrivalMonth <= month);
  for (const o of arriving) state.stock[o.partId] = (state.stock[o.partId] ?? 0) + o.qty;
  state.orders = state.orders.filter((o) => o.arrivalMonth > month);
  for (const p of def.parts) {
    const pol = state.sparePolicy[p.id];
    if (!pol || pol.max <= 0) continue;
    const onOrder = state.orders.filter((o) => o.partId === p.id).reduce((a, o) => a + o.qty, 0);
    const pos = (state.stock[p.id] ?? 0) + onOrder;
    if (pos <= pol.min) {
      const qty = pol.max - pos;
      if (qty > 0) state.orders.push({ partId: p.id, qty, arrivalMonth: month + Math.max(1, Math.ceil((p.leadDays * leadF) / 30)), express: false });
    }
  }
  const stockValue = def.parts.reduce((a, p) => a + (state.stock[p.id] ?? 0) * p.unitCost, 0);
  const holdingCost = (stockValue * def.holdingRate) / 12;
  const critParts = def.parts.filter((p) => p.critical);
  const critAvail = critParts.length ? critParts.filter((p) => (state.stock[p.id] ?? 0) > 0).length / critParts.length : 1;

  // ---------------- charge, backlog, coûts
  // Le correctif est toujours traité (heures sup si besoin) ; le planifié non réalisé part en backlog.
  const spare = Math.max(0, modeledCapacity - laborHours);
  const overtime = Math.max(0, laborHours - modeledCapacity);
  const backlog = Math.max(0, prev.backlogHours + load * (1 - compliance) + overtime * 0.5 - spare);
  state.backlogHours = backlog;
  state.lastCorrectiveHours = correctiveHours;
  const payroll = state.technicians * def.hoursPerTech * def.laborRate;
  const laborCost = payroll + overtime * def.laborRate * 1.5;
  const maintCost = laborCost + partsCost + extraCost + def.monthlyBudget * OVERHEAD_SHARE + prev.pendingSpend;
  state.pendingSpend = 0;

  // ---------------- KPI
  const failures = events.filter((e) => e.kind === 'panne' || e.kind === 'induite');
  const planned = events.filter((e) => e.kind !== 'panne' && e.kind !== 'induite');
  const totalRun = def.equipment.reduce((a, e) => a + e.runHours, 0);
  // Disponibilité « usine » : heures de production équivalentes perdues / heures d'ouverture.
  const availability = Math.max(0, Math.min(1, 1 - productionLoss / (potentialMarginPerHour(def) * OPEN_HOURS)));
  const mtbf = totalRun / Math.max(failures.length, 0.5);
  const mttr = failures.length ? failures.reduce((a, e) => a + e.downtime, 0) / failures.length : 0;
  const repeatFailures = failures.filter((e) => e.repeat).length;
  const resolvedShare = def.latentDefects.length ? state.resolvedDefects.length / def.latentDefects.length : 1;
  const oeeA = Math.max(0, availability - 0.04); // arrêts courts non enregistrés, changements de format
  const oeeP = Math.min(0.97, 0.76 + 0.08 * compliance + 0.06 * (prev.dataQuality / 100) + 0.05 * resolvedShare);
  const oeeQ = Math.min(0.995, 0.962 + 0.025 * resolvedShare);
  const oee = oeeA * oeeP * oeeQ;
  const nominal = def.lines.reduce((a, l) => a + l.rate, 0) * OPEN_HOURS;
  const production = nominal * oee;
  const budget = def.monthlyBudget * factor(mods, 'budgetFactor');
  const kpi: MonthKpi = {
    month,
    availability,
    mtbf,
    mttr,
    failures: failures.length,
    plannedPct: events.length ? planned.length / events.length : 1,
    emergencyPct: events.length ? failures.filter((e) => e.loss > 5_000_000).length / events.length : 0,
    pmCompliance: pmDue ? pmDone / pmDue : compliance,
    backlogWeeks: (backlog + capacity * BACKGROUND_SHARE * 0.5) / (capacity / 4.33),
    maintCost,
    laborCost,
    partsCost,
    productionLoss,
    stockValue,
    holdingCost,
    stockouts,
    criticalSpareAvailability: critAvail,
    repeatFailures,
    oee,
    oeeA,
    oeeP,
    oeeQ,
    dataQuality: prev.dataQuality,
    pdmEffectiveness: detected + missed ? detected / (detected + missed) : 0,
    budget,
    costPerUnit: production > 0 ? (maintCost + productionLoss) / production : 0,
    rcaClosure: state.rcaOpened ? state.rcaClosed / state.rcaOpened : 1,
  };

  // ---------------- dynamique humaine & confiance
  const overBudget = maintCost / budget - 1;
  const prevA = prev.kpis.at(-1)?.availability ?? availability;
  state.directionTrust = clamp(
    state.directionTrust + (availability - prevA) * 60 - Math.max(0, overBudget) * 20 + (productionLoss < potentialMarginPerHour(def) * OPEN_HOURS * 0.1 ? 1.5 : productionLoss > potentialMarginPerHour(def) * OPEN_HOURS * 0.25 ? -3 : -0.5),
  );
  state.teamMorale = clamp(state.teamMorale + (kpi.backlogWeeks > 6 ? -2 : 1) + (failures.length > 12 ? -1.5 : 0.5));
  state.safetyIndex = clamp(state.safetyIndex + 0.5);
  state.dataQuality = clamp(state.dataQuality - 0.3); // l'entropie : sans discipline, la donnée se dégrade
  state.events = [...prev.events, ...events].slice(-1500);
  state.kpis = [...prev.kpis, kpi];
  state.modifiers = state.modifiers.filter((m) => m.untilMonth > month);

  // ---------------- événement sous pression
  if (month >= 1 && rng.chance(0.5)) {
    const seen = new Set(state.journal.filter((j) => j.kind === 'decision').map((j) => j.text.split(' — ')[0]));
    const pool = PRESSURE_EVENTS.filter((e) => !seen.has(e.title));
    if (pool.length) state.pendingDecision = rng.pick(pool);
  }
  const summary: JournalEntry = {
    month,
    kind: availability > 0.93 ? 'succes' : availability < 0.85 ? 'alerte' : 'info',
    text: `Mois ${month} : disponibilité ${(availability * 100).toFixed(1)} %, ${failures.length} pannes, coût maintenance ${fmtM(maintCost)} / budget ${fmtM(budget)}, pertes production ${fmtM(productionLoss)}.`,
  };
  state.journal = [...state.journal, summary].slice(-200);
  return { state, kpi, events };
}

// ------------------------------------------------------------------ décisions du joueur

export function applyPressureOption(def: PlantDef, prev: PlantState, eventTitle: string, opt: PressureOption): PlantState {
  const s: PlantState = structuredClone(prev);
  const e = opt.effects;
  s.directionTrust = clamp(s.directionTrust + (e.trust ?? 0));
  s.safetyIndex = clamp(s.safetyIndex + (e.safety ?? 0));
  s.teamMorale = clamp(s.teamMorale + (e.morale ?? 0));
  s.dataQuality = clamp(s.dataQuality + (e.dataQuality ?? 0));
  s.technicians = Math.max(4, s.technicians + (e.technicians ?? 0));
  if (e.modifier) {
    const { months, ...m } = e.modifier;
    s.modifiers = [...s.modifiers.filter((x) => x.id !== m.id), { ...m, untilMonth: s.month + months }];
  }
  if (e.ageBoost && s.modes[e.ageBoost.key]) {
    s.modes[e.ageBoost.key].age = Math.max(0, s.modes[e.ageBoost.key].age + e.ageBoost.hours);
  }
  const k = s.kpis.at(-1);
  if (k && (e.cost || e.loss)) {
    s.kpis = [...s.kpis.slice(0, -1), { ...k, maintCost: k.maintCost + (e.cost ?? 0), productionLoss: k.productionLoss + (e.loss ?? 0) }];
  }
  s.pendingDecision = undefined;
  s.journal = [...s.journal, { month: s.month, kind: 'decision' as const, text: `${eventTitle} — ${opt.label} : ${e.message}` }];
  void def;
  return s;
}

export function setModePolicy(state: PlantState, key: string, policy: Partial<ModePolicy>): PlantState {
  const s = structuredClone(state);
  s.modes[key].policy = { ...s.modes[key].policy, ...policy };
  return s;
}

// ------------------------------------------------------------------ analyses

/** Coût mensuel attendu d'une politique pour un mode — utilisé par l'aide à la décision. */
export function expectedModeCost(
  def: PlantDef,
  state: PlantState,
  key: string,
  policy: ModePolicy,
  runs = 300,
): { cost: number; loss: number; failures: number; laborHours: number } {
  const [tag, modeId] = key.split(':');
  const eq = def.equipment.find((e) => e.tag === tag)!;
  const mode = eq.modes.find((m) => m.id === modeId)!;
  const eta = effectiveEta(def, state, key, mode);
  const part = def.parts.find((p) => p.id === mode.partId);
  const partCost = (part?.unitCost ?? 0) * (mode.partQty ?? 1);
  const rng = new Rng(hashSeed(key + policy.strategy + policy.pmInterval + policy.inspInterval));
  const redF = isRedundant(eq, state) ? 0.15 : 1;
  const horizon = eq.runHours * 24; // 2 ans
  let cost = 0,
    loss = 0,
    fails = 0,
    labor = 0;
  for (let r = 0; r < runs; r++) {
    let t = 0;
    let age = 0;
    while (t < horizon) {
      const tf = rng.weibullResidual(mode.beta, eta, age);
      if (policy.strategy === 'PM') {
        const tp = policy.pmInterval - age;
        if (tp < tf) {
          if (t + tp > horizon) break;
          cost += partCost + mode.laborHours * 0.8 * def.laborRate;
          labor += mode.laborHours * 0.8;
          loss += mode.mttr * 0.6 * eq.lossRate * 0.1 * redF;
          t += tp;
          age = 0;
          continue;
        }
      }
      if (t + tf > horizon) break;
      let det = false;
      if ((policy.strategy === 'CBM' || policy.strategy === 'PDM') && mode.pf) {
        const interval = policy.strategy === 'PDM' ? 12 : policy.inspInterval;
        const eff = policy.strategy === 'PDM' ? 0.97 * (0.55 + 0.45 * state.dataQuality / 100) : 0.85;
        det = rng.chance(detectionProbability(mode.pf, interval, eff));
      }
      if (det) {
        cost += partCost + mode.laborHours * def.laborRate;
        labor += mode.laborHours;
        loss += mode.mttr * 0.75 * 0.3 * eq.lossRate * redF;
      } else {
        fails++;
        cost += partCost * (1 + mode.secondaryDamage) + mode.laborHours * 1.4 * def.laborRate;
        labor += mode.laborHours * 1.4;
        loss += mode.mttr * eq.lossRate * redF;
      }
      t += tf;
      age = 0;
    }
  }
  const months = 24 * runs;
  let fixed = 0;
  if (policy.strategy === 'CBM') {
    const h = (eq.runHours / policy.inspInterval) * INSPECTION_LABOR;
    fixed = h * def.laborRate;
    labor += h * months;
  }
  if (policy.strategy === 'PDM') fixed = PDM_MONTHLY_COST;
  return { cost: cost / months + fixed, loss: loss / months, failures: fails / months, laborHours: labor / months };
}

export function paretoByEquipment(def: PlantDef, events: FailureEvent[]) {
  const map = new Map<string, { tag: string; name: string; loss: number; count: number; downtime: number }>();
  for (const e of events) {
    if (e.kind !== 'panne' && e.kind !== 'induite') continue;
    const eq = def.equipment.find((x) => x.tag === e.tag);
    const cur = map.get(e.tag) ?? { tag: e.tag, name: eq?.name ?? e.tag, loss: 0, count: 0, downtime: 0 };
    cur.loss += e.loss + e.cost;
    cur.count++;
    cur.downtime += e.downtime;
    map.set(e.tag, cur);
  }
  return [...map.values()].sort((a, b) => b.loss - a.loss);
}

export interface MonthDebrief {
  month: number;
  totalLoss: number;
  waitLoss: number;
  waitShare: number;
  stockoutEvents: number;
  topContributors: { tag: string; name: string; loss: number; count: number; share: number }[];
  drivers: string[];
}

/**
 * Explique un mois : d'où viennent les pertes, ce qui a changé vs le mois précédent.
 * Répond à « pourquoi mes résultats bougent ? » sans que le joueur ait à fouiller le REX.
 */
export function monthDebrief(def: PlantDef, state: PlantState, month?: number): MonthDebrief | null {
  const m = month ?? state.month;
  const kpi = state.kpis.find((k) => k.month === m);
  if (!kpi) return null;
  const prev = state.kpis.find((k) => k.month === m - 1);
  const events = state.events.filter((e) => e.month === m);
  const failures = events.filter((e) => e.kind === 'panne' || e.kind === 'induite');
  const totalLoss = kpi.productionLoss;
  const waitLoss = failures.reduce((a, e) => a + (e.waitParts > 0 ? (e.waitParts / Math.max(e.downtime, 1)) * e.loss : 0), 0);
  const stockoutEvents = failures.filter((e) => e.waitParts > 0).length;
  const pareto = paretoByEquipment(def, events);
  const lossSum = pareto.reduce((a, e) => a + e.loss, 0) || 1;
  const topContributors = pareto.slice(0, 3).map((e) => ({ tag: e.tag, name: e.name, loss: e.loss, count: e.count, share: e.loss / lossSum }));

  const drivers: string[] = [];
  if (topContributors[0] && topContributors[0].share > 0.3)
    drivers.push(`${topContributors[0].tag} concentre ${Math.round(topContributors[0].share * 100)} % des pertes (${topContributors[0].count} panne(s)).`);
  if (waitLoss > totalLoss * 0.25 && totalLoss > 0)
    drivers.push(`${Math.round((waitLoss / totalLoss) * 100)} % des pertes viennent d'attentes de pièces (${stockoutEvents} rupture(s)) : revoyez les stocks critiques.`);
  const repeats = failures.filter((e) => e.repeat).length;
  if (repeats > 0) drivers.push(`${repeats} panne(s) répétitive(s) : une cause latente n'est pas traitée (voir RCA/AMDEC).`);
  if (prev) {
    const dA = (kpi.availability - prev.availability) * 100;
    if (Math.abs(dA) >= 1.5) drivers.push(`Disponibilité ${dA > 0 ? '+' : ''}${dA.toFixed(1)} pt vs mois précédent.`);
    const dPm = kpi.pmCompliance - prev.pmCompliance;
    if (dPm < -0.15) drivers.push(`Conformité préventive en baisse (${Math.round(kpi.pmCompliance * 100)} %) : équipe surchargée ou pièces manquantes.`);
  }
  if (kpi.backlogWeeks > 6) drivers.push(`Backlog élevé (${kpi.backlogWeeks.toFixed(1)} sem.) : le correctif mange la capacité, le préventif décroche.`);
  if (state.resolvedDefects.length > 0 && failures.length <= 4) drivers.push(`Peu de pannes ce mois : les causes latentes éliminées portent leurs fruits.`);
  if (drivers.length === 0) drivers.push('Mois calme : aucun facteur dominant. Continuez à fiabiliser les modes critiques.');
  return { month: m, totalLoss, waitLoss, waitShare: totalLoss > 0 ? waitLoss / totalLoss : 0, stockoutEvents, topContributors, drivers };
}

export function dormantStock(def: PlantDef, state: PlantState) {
  return def.parts
    .filter((p) => (state.stock[p.id] ?? 0) > 0 && state.month - (state.lastMovement[p.id] ?? 0) >= 12)
    .map((p) => ({ part: p, qty: state.stock[p.id], value: state.stock[p.id] * p.unitCost }));
}

// ------------------------------------------------------------------ utilitaires

export function clamp(x: number, a = 0, b = 100): number {
  return Math.max(a, Math.min(b, x));
}

export function fmtM(x: number): string {
  if (Math.abs(x) >= 1e9) return `${(x / 1e9).toFixed(2)} Md FCFA`;
  return `${(x / 1e6).toFixed(1)} M FCFA`;
}
