import { describe, expect, it } from 'vitest';
import { MISSIONS } from '../src/data/missions';
import { BREWERY, CEMENT } from '../src/data/plants';
import { correctFit, generateWeibullDataset } from '../src/engine/datasets';
import { applyMissionToPlant } from '../src/engine/effects';
import { applyMissionResult, newPlayer } from '../src/engine/progression';
import { allModes, createPlantState, simulateMonth } from '../src/engine/simulation';
import type { PlantState } from '../src/engine/types';

function run(state: PlantState, months: number, def = BREWERY) {
  let s = state;
  const k = [];
  for (let i = 0; i < months; i++) {
    const o = simulateMonth(def, s);
    s = { ...o.state, pendingDecision: undefined };
    k.push(o.kpi);
  }
  return { s, k };
}
const avg = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

describe('moteur de simulation', () => {
  it('est déterministe à graine égale', () => {
    const a = run(createPlantState(BREWERY, 7), 6).k;
    const b = run(createPlantState(BREWERY, 7), 6).k;
    expect(a).toEqual(b);
  });

  it('une bonne stratégie de fiabilité bat la situation héritée (moyenne sur 5 graines)', () => {
    const res = { base: [] as number[], opt: [] as number[], lossB: [] as number[], lossO: [] as number[] };
    for (const seed of [1, 2, 3, 4, 5]) {
      const base = run(createPlantState(BREWERY, seed), 18).k;
      const s = createPlantState(BREWERY, seed);
      s.resolvedDefects = BREWERY.latentDefects.map((d) => d.id);
      s.dataQuality = 75;
      for (const { mode, key } of allModes(BREWERY)) {
        const p = s.modes[key].policy;
        if (mode.pf) {
          p.strategy = 'CBM';
          p.inspInterval = Math.max(24, Math.round(mode.pf / 2));
        } else p.strategy = 'RTF';
      }
      for (const p of BREWERY.parts) if (p.critical) { s.stock[p.id] = Math.max(1, s.stock[p.id] ?? 0); s.sparePolicy[p.id] = { min: 0, max: 1 }; }
      const opt = run(s, 18).k;
      res.base.push(avg(base.map((x) => x.availability)));
      res.opt.push(avg(opt.map((x) => x.availability)));
      res.lossB.push(avg(base.map((x) => x.productionLoss)));
      res.lossO.push(avg(opt.map((x) => x.productionLoss)));
    }
    expect(avg(res.opt)).toBeGreaterThan(avg(res.base) + 0.05);
    expect(avg(res.lossO)).toBeLessThan(avg(res.lossB) * 0.5);
  });

  it('la cimenterie de reprise se simule sans erreur', () => {
    const { k } = run(createPlantState(CEMENT, 3), 12, CEMENT);
    expect(k).toHaveLength(12);
    for (const x of k) expect(x.availability).toBeGreaterThanOrEqual(0);
  });
});

describe('missions et progression', () => {
  it('une RCA réussie élimine la cause latente « lubrification »', () => {
    const s = createPlantState(BREWERY, 1);
    const { plant } = applyMissionToPlant(BREWERY, s, 'rca-convoyeur', 80);
    expect(plant.resolvedDefects).toContain('LUBRIF');
    const fail = applyMissionToPlant(BREWERY, s, 'rca-convoyeur', 40);
    expect(fail.plant.resolvedDefects).not.toContain('LUBRIF');
  });

  it('les compétences et l’XP progressent, les erreurs sont mémorisées', () => {
    const meta = MISSIONS.find((m) => m.id === 'weibull-p101')!;
    const r = applyMissionResult(newPlayer('T'), meta, [
      { stepId: 'a', score: 100, attempts: 1, hints: 0, skills: ['WEIBULL'], errorTags: [], reasoning: [] },
      { stepId: 'b', score: 50, attempts: 3, hints: 1, skills: ['DATA'], errorTags: ['ignore-censoring'], reasoning: ['oubli des censures'] },
    ], 0);
    expect(r.xpGain).toBeGreaterThan(0);
    expect(r.player.skills.WEIBULL).toBeGreaterThan(10);
    expect(r.player.errors['ignore-censoring']).toBe(1);
    expect(r.player.reasoningLog).toHaveLength(1);
  });

  it('le jeu Weibull généré contient des pièges et un ajustement correct', () => {
    const d = generateWeibullDataset(42, 3);
    expect(d.rows.some((r) => r.kind === 'duplicate')).toBe(true);
    expect(d.rows.some((r) => r.kind === 'other-asset')).toBe(true);
    const fit = correctFit(d.rows)!;
    expect(fit.failures).toBeGreaterThanOrEqual(5);
    expect(fit.beta).toBeGreaterThan(0.5);
  });
});
