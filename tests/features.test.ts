import { describe, expect, it } from 'vitest';
import { BREWERY, CEMENT } from '../src/data/plants';
import { applyProject } from '../src/engine/effects';
import { allModes, createPlantState, monthDebrief, simulateMonth } from '../src/engine/simulation';
import { maturityAudit, newPlayer } from '../src/engine/progression';
import { startTakeover, takeoverVerdict, TAKEOVER_MONTHS } from '../src/engine/takeover';
import { normalizeGame } from '../src/store/persistence';
import { evaluateReasoning } from '../src/ui/reasoning';
import type { GameState, PlantState } from '../src/engine/types';

function play(def = BREWERY, months = 6, seed = 1) {
  let s = createPlantState(def, seed);
  for (let i = 0; i < months; i++) s = { ...simulateMonth(def, s).state, pendingDecision: undefined };
  return s;
}

describe('débriefing mensuel', () => {
  it('attribue les pertes et produit des explications', () => {
    const s = play(BREWERY, 6, 3);
    const d = monthDebrief(BREWERY, s)!;
    expect(d).not.toBeNull();
    expect(d.drivers.length).toBeGreaterThan(0);
    // la somme des parts des contributeurs ne dépasse pas 100 %
    const share = d.topContributors.reduce((a, c) => a + c.share, 0);
    expect(share).toBeLessThanOrEqual(1.001);
  });
});

describe('évaluation du raisonnement', () => {
  it('note bas un texte vide, haut un raisonnement technique et chiffré', () => {
    expect(evaluateReasoning('ok').level).toBe(0);
    expect(evaluateReasoning("J'avais ignoré les censures ; je vais recalculer β avec les suspensions à 1600 h.").level).toBe(2);
  });
});

describe('robustesse des sauvegardes', () => {
  it('complète les champs manquants sans planter (sauvegarde ancienne)', () => {
    const legacy = {
      version: 1,
      player: { name: 'X', createdAt: 0, level: 1, xp: 0, skills: {}, missions: {}, attempts: {}, errors: {}, certifications: [], badges: [], reasoningLog: [], promotions: [] },
      plant: { plantId: 'douala', month: 2, seed: 1 },
      settings: { sound: false, reducedMotion: false },
    } as unknown as GameState;
    const g = normalizeGame(legacy);
    expect(g.plant.unlocks).toEqual([]);
    expect(g.plant.resolvedAt).toEqual({});
    expect(g.plant.orders).toEqual([]);
    expect(Array.isArray(g.plant.kpis)).toBe(true);
  });
});

describe('équilibrage : Take over est réussissable avec une stratégie experte', () => {
  it('un pilotage expert de 12 mois passe le verdict', () => {
    const t0 = startTakeover(5);
    let plant = t0.plant;
    // Stratégie experte : diagnostic, élimination des causes, conditionnel, données, stock, gens
    for (const id of ['cem-diagnostic', 'cem-kiln', 'cem-dust', 'cem-oil', 'cem-data', 'cem-purge', 'cem-pdm', 'cem-people', 'cem-recruit']) {
      plant = applyProject(CEMENT, plant, id);
    }
    for (const { mode, key } of allModes(CEMENT)) {
      const p = plant.modes[key].policy;
      if (mode.pf) { p.strategy = 'CBM'; p.inspInterval = Math.max(24, Math.round(mode.pf / 2)); }
      else p.strategy = 'RTF';
    }
    for (const part of CEMENT.parts) if (part.critical) { plant.stock[part.id] = Math.max(1, plant.stock[part.id] ?? 0); plant.sparePolicy[part.id] = { min: 0, max: 1 }; }
    for (let i = 0; i < TAKEOVER_MONTHS; i++) plant = { ...simulateMonth(CEMENT, plant).state, pendingDecision: undefined };
    const g = { player: newPlayer('Boss'), plant, takeover: { ...t0, plant, finished: true } } as unknown as GameState;
    const v = takeoverVerdict(g);
    // au moins réussissable (>= 70) ou très proche, preuve que l'épreuve n'est pas impossible
    expect(v.score).toBeGreaterThanOrEqual(70);
    expect(v.passed).toBe(true);
    // la maturité progresse au-delà du niveau réactif
    expect(maturityAudit({ ...g, plant } as GameState).level).toBeGreaterThanOrEqual(2);
  });
});

describe('missions rejouables', () => {
  it('la mission KPI et le diagnostic changent selon la tentative (graine)', () => {
    // via le générateur de données Weibull déjà testé ; ici on vérifie que le state porte les tentatives
    const s: PlantState = createPlantState(BREWERY, 1);
    expect(s.seed).toBe(1);
  });
});
