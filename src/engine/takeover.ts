/**
 * Épreuve finale « TAKE OVER THE FACTORY » : 12 mois pour redresser la cimenterie.
 * Le verdict compare les 3 derniers mois aux 3 premiers (référence de reprise).
 */
import { CEMENT } from '../data/plants';
import { maturityAudit } from './progression';
import { createPlantState } from './simulation';
import type { GameState, MonthKpi, TakeoverState, TakeoverVerdict } from './types';

export const TAKEOVER_MONTHS = 12;

export function startTakeover(seed: number): TakeoverState {
  const plant = createPlantState(CEMENT, seed);
  return { plantId: CEMENT.id, startMonth: 0, plant, finished: false };
}

const avg = (ks: MonthKpi[], key: keyof MonthKpi) => ks.reduce((a, k) => a + (k[key] as number), 0) / Math.max(1, ks.length);

export function takeoverVerdict(g: GameState): TakeoverVerdict {
  const t = g.takeover!;
  const k = t.plant.kpis;
  const first = k.slice(0, 3);
  const last = k.slice(-3);
  const pct = (x: number) => `${(x * 100).toFixed(1)} %`;
  const m = (x: number) => `${(x / 1e6).toFixed(0)} M`;
  const initialDormant = CEMENT.parts.filter((p) => p.obsolete).reduce((a, p) => a + (CEMENT.initialStock[p.id] ?? 0) * p.unitCost, 0);
  const dormantNow = CEMENT.parts.filter((p) => p.obsolete).reduce((a, p) => a + (t.plant.stock[p.id] ?? 0) * p.unitCost, 0);
  const maturity = maturityAudit({ ...g, plant: t.plant }).level;
  const criteria = [
    { label: 'Disponibilité', target: '+3 pts', actual: `${pct(avg(first, 'availability'))} → ${pct(avg(last, 'availability'))}`, ok: avg(last, 'availability') - avg(first, 'availability') >= 0.03 || avg(last, 'availability') >= 0.95 },
    { label: 'MTBF', target: '+20 %', actual: `${avg(first, 'mtbf').toFixed(0)} h → ${avg(last, 'mtbf').toFixed(0)} h`, ok: avg(last, 'mtbf') >= avg(first, 'mtbf') * 1.2 },
    { label: 'Pertes de production', target: '−30 %', actual: `${m(avg(first, 'productionLoss'))} → ${m(avg(last, 'productionLoss'))}`, ok: avg(last, 'productionLoss') <= avg(first, 'productionLoss') * 0.7 },
    { label: 'Coût maintenance vs budget', target: '≤ budget', actual: `${m(avg(last, 'maintCost'))} / ${m(avg(last, 'budget'))}`, ok: avg(last, 'maintCost') <= avg(last, 'budget') * 1.03 },
    { label: 'Pannes répétitives', target: 'en baisse', actual: `${avg(first, 'repeatFailures').toFixed(1)} → ${avg(last, 'repeatFailures').toFixed(1)}`, ok: avg(last, 'repeatFailures') <= avg(first, 'repeatFailures') },
    { label: 'Stock obsolète / dormant', target: '−50 %', actual: `${m(initialDormant)} → ${m(dormantNow)}`, ok: dormantNow <= initialDormant * 0.5 },
    { label: 'Qualité des données', target: '≥ 60', actual: `${t.plant.dataQuality.toFixed(0)}`, ok: t.plant.dataQuality >= 60 },
    { label: 'Conformité préventive', target: '≥ 85 %', actual: pct(avg(last, 'pmCompliance')), ok: avg(last, 'pmCompliance') >= 0.85 },
    { label: 'Maturité maintenance', target: '≥ 3', actual: `${maturity}`, ok: maturity >= 3 },
    { label: 'Sécurité', target: '≥ 60', actual: `${t.plant.safetyIndex.toFixed(0)}`, ok: t.plant.safetyIndex >= 60 },
  ];
  const score = Math.round((criteria.filter((c) => c.ok).length / criteria.length) * 100);
  return { score, passed: score >= 70, criteria };
}
