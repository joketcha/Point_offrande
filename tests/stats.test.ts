import { describe, expect, it } from 'vitest';
import { Rng } from '../src/engine/rng';
import {
  gammaFn,
  gammaDist,
  kOutOfN,
  normInv,
  optimalAgeReplacement,
  parallelR,
  reorderPoint,
  seriesR,
  weibull,
  weibullMLE,
  weibullMRR,
  type LifeObs,
} from '../src/engine/stats';

describe('fonctions spéciales', () => {
  it('Gamma', () => {
    expect(gammaFn(5)).toBeCloseTo(24, 8);
    expect(gammaFn(0.5)).toBeCloseTo(Math.sqrt(Math.PI), 8);
    expect(gammaFn(1 + 1 / 2)).toBeCloseTo(0.886227, 5);
  });
  it('quantile normal', () => {
    expect(normInv(0.95)).toBeCloseTo(1.6449, 3);
    expect(normInv(0.5)).toBeCloseTo(0, 6);
  });
  it('loi gamma : CDF cohérente avec l’exponentielle pour k = 1', () => {
    expect(gammaDist(1, 100).F(100)).toBeCloseTo(1 - Math.exp(-1), 6);
  });
});

describe('Weibull', () => {
  it('MTTF = η Γ(1+1/β)', () => {
    expect(weibull(2, 1000).mean()).toBeCloseTo(886.227, 2);
    expect(weibull(1, 500).mean()).toBeCloseTo(500, 6);
  });
  it('MRR et MLE retrouvent les paramètres sur un grand échantillon censuré', () => {
    const r = new Rng(123);
    const obs: LifeObs[] = Array.from({ length: 800 }, () => {
      const t = r.weibull(2.2, 3000);
      const c = r.uniform(500, 9000);
      return t < c ? { t, failed: true } : { t: c, failed: false };
    });
    const mle = weibullMLE(obs)!;
    const mrr = weibullMRR(obs)!;
    expect(mle.beta).toBeGreaterThan(2.0);
    expect(mle.beta).toBeLessThan(2.4);
    expect(Math.abs(mle.eta / 3000 - 1)).toBeLessThan(0.05);
    expect(Math.abs(mrr.beta / 2.2 - 1)).toBeLessThan(0.12);
    expect(Math.abs(mrr.eta / 3000 - 1)).toBeLessThan(0.06);
  });
  it('ignorer les censures sous-estime η', () => {
    const r = new Rng(9);
    const obs: LifeObs[] = Array.from({ length: 300 }, () => {
      const t = r.weibull(1.5, 2000);
      const c = r.uniform(200, 3000);
      return t < c ? { t, failed: true } : { t: c, failed: false };
    });
    const right = weibullMRR(obs)!;
    const wrong = weibullMRR(obs.filter((o) => o.failed))!;
    expect(wrong.eta).toBeLessThan(right.eta * 0.8);
  });
});

describe('décision', () => {
  it('remplacement à âge : optimum si β > 1, aucun gain si β = 1', () => {
    const wear = optimalAgeReplacement(weibull(3, 1000), 1, 10, 3000);
    expect(wear.T).toBeLessThan(1000);
    expect(wear.saving).toBeGreaterThan(0.3);
    const rnd = optimalAgeReplacement(weibull(1, 1000), 1, 10, 3000);
    expect(rnd.saving).toBeLessThan(0.02);
  });
  it('systèmes', () => {
    expect(seriesR([0.9, 0.95, 0.98])).toBeCloseTo(0.8379, 4);
    expect(parallelR([0.9, 0.9])).toBeCloseTo(0.99, 6);
    expect(kOutOfN(2, 3, 0.9)).toBeCloseTo(0.972, 6);
  });
  it('point de commande', () => {
    const r = reorderPoint(0.12, 0.35, 30, 0.95);
    expect(r.rop).toBeCloseTo(6.75, 1);
  });
});
