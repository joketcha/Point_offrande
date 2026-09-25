/**
 * Moteur statistique de fiabilité.
 * Lois : exponentielle, Weibull 2 paramètres, lognormale, gamma.
 * Estimation : rangs médians (Bernard), rangs ajustés de Johnson (censures),
 * régression de rang (MRR) et maximum de vraisemblance (MLE) avec censures à droite.
 */

// ---------------------------------------------------------------- utilitaires

/** Fonction Gamma (approximation de Lanczos, précision ~1e-13). */
export function gammaFn(z: number): number {
  if (z < 0.5) return Math.PI / (Math.sin(Math.PI * z) * gammaFn(1 - z));
  const g = 7;
  const c = [
    0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6,
    1.5056327351493116e-7,
  ];
  z -= 1;
  let x = c[0];
  for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
  const t = z + g + 0.5;
  return Math.sqrt(2 * Math.PI) * Math.pow(t, z + 0.5) * Math.exp(-t) * x;
}

export function lnGamma(z: number): number {
  return Math.log(gammaFn(z));
}

/** Fonction d'erreur (Abramowitz & Stegun 7.1.26). */
export function erf(x: number): number {
  const s = Math.sign(x);
  x = Math.abs(x);
  const t = 1 / (1 + 0.3275911 * x);
  const y =
    1 -
    ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) *
      t *
      Math.exp(-x * x);
  return s * y;
}

export function normCdf(x: number): number {
  return 0.5 * (1 + erf(x / Math.SQRT2));
}

/** Quantile de la loi normale centrée réduite (Acklam). */
export function normInv(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.357751867269, -30.66479806614716, 2.506628277459239];
  const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
  const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
  const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
  const pl = 0.02425;
  let q: number, r: number;
  if (p < pl) {
    q = Math.sqrt(-2 * Math.log(p));
    return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
  }
  if (p <= 1 - pl) {
    q = p - 0.5;
    r = q * q;
    return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
}

/** Gamma incomplète régularisée inférieure P(a, x) (Numerical Recipes). */
export function gammaP(a: number, x: number): number {
  if (x <= 0) return 0;
  const gln = lnGamma(a);
  if (x < a + 1) {
    let ap = a;
    let sum = 1 / a;
    let del = sum;
    for (let n = 0; n < 200; n++) {
      ap += 1;
      del *= x / ap;
      sum += del;
      if (Math.abs(del) < Math.abs(sum) * 1e-12) break;
    }
    return sum * Math.exp(-x + a * Math.log(x) - gln);
  }
  let b = x + 1 - a;
  let c = 1 / 1e-300;
  let d = 1 / b;
  let h = d;
  for (let i = 1; i < 200; i++) {
    const an = -i * (i - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < 1e-300) d = 1e-300;
    c = b + an / c;
    if (Math.abs(c) < 1e-300) c = 1e-300;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 1e-12) break;
  }
  return 1 - Math.exp(-x + a * Math.log(x) - gln) * h;
}

// ---------------------------------------------------------------- lois

export interface Distribution {
  name: string;
  R(t: number): number;
  F(t: number): number;
  f(t: number): number;
  /** Taux de défaillance instantané λ(t) = f/R */
  h(t: number): number;
  /** Taux cumulé H(t) = -ln R(t) */
  H(t: number): number;
  mean(): number;
}

export function exponential(lambda: number): Distribution {
  return {
    name: 'Exponentielle',
    R: (t) => Math.exp(-lambda * t),
    F: (t) => 1 - Math.exp(-lambda * t),
    f: (t) => lambda * Math.exp(-lambda * t),
    h: () => lambda,
    H: (t) => lambda * t,
    mean: () => 1 / lambda,
  };
}

export function weibull(beta: number, eta: number): Distribution {
  const R = (t: number) => (t <= 0 ? 1 : Math.exp(-Math.pow(t / eta, beta)));
  const h = (t: number) => (t <= 0 ? (beta < 1 ? Infinity : beta === 1 ? 1 / eta : 0) : (beta / eta) * Math.pow(t / eta, beta - 1));
  return {
    name: 'Weibull',
    R,
    F: (t) => 1 - R(t),
    f: (t) => (t <= 0 ? 0 : h(t) * R(t)),
    h,
    H: (t) => (t <= 0 ? 0 : Math.pow(t / eta, beta)),
    mean: () => eta * gammaFn(1 + 1 / beta),
  };
}

export function lognormal(mu: number, sigma: number): Distribution {
  const F = (t: number) => (t <= 0 ? 0 : normCdf((Math.log(t) - mu) / sigma));
  const f = (t: number) =>
    t <= 0 ? 0 : Math.exp(-Math.pow(Math.log(t) - mu, 2) / (2 * sigma * sigma)) / (t * sigma * Math.sqrt(2 * Math.PI));
  return {
    name: 'Lognormale',
    R: (t) => 1 - F(t),
    F,
    f,
    h: (t) => f(t) / Math.max(1 - F(t), 1e-15),
    H: (t) => -Math.log(Math.max(1 - F(t), 1e-15)),
    mean: () => Math.exp(mu + (sigma * sigma) / 2),
  };
}

/** Loi gamma de forme k et d'échelle θ. */
export function gammaDist(k: number, theta: number): Distribution {
  const F = (t: number) => (t <= 0 ? 0 : gammaP(k, t / theta));
  const f = (t: number) =>
    t <= 0 ? 0 : Math.exp((k - 1) * Math.log(t) - t / theta - lnGamma(k) - k * Math.log(theta));
  return {
    name: 'Gamma',
    R: (t) => 1 - F(t),
    F,
    f,
    h: (t) => f(t) / Math.max(1 - F(t), 1e-15),
    H: (t) => -Math.log(Math.max(1 - F(t), 1e-15)),
    mean: () => k * theta,
  };
}

// ---------------------------------------------------------------- indicateurs de base

export function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN;
}

export function stdev(xs: number[]): number {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(xs.reduce((a, b) => a + (b - m) ** 2, 0) / (xs.length - 1));
}

export function median(xs: number[]): number {
  if (!xs.length) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

/** Disponibilité intrinsèque (inhérente) : MTBF / (MTBF + MTTR). */
export function inherentAvailability(mtbf: number, mttr: number): number {
  return mtbf / (mtbf + mttr);
}

// ---------------------------------------------------------------- Weibull : estimation

export interface LifeObs {
  /** Temps de fonctionnement (heures, cycles…) */
  t: number;
  /** true = défaillance observée ; false = censure à droite (suspension). */
  failed: boolean;
}

export interface RankPoint {
  t: number;
  rank: number; // rang (ajusté si censures)
  F: number; // rang médian (Bernard)
  x: number; // ln t
  y: number; // ln(-ln(1-F))
}

/**
 * Rangs médians de Bernard avec rangs ajustés de Johnson pour les censures.
 * Seules les défaillances sont retournées (les suspensions influencent les rangs).
 */
export function medianRanks(obs: LifeObs[]): RankPoint[] {
  const s = [...obs].sort((a, b) => a.t - b.t || (a.failed === b.failed ? 0 : a.failed ? -1 : 1));
  const n = s.length;
  const pts: RankPoint[] = [];
  let prevRank = 0;
  s.forEach((o, i) => {
    if (!o.failed) return;
    const reverseRank = n - i;
    const inc = (n + 1 - prevRank) / (1 + reverseRank);
    const rank = prevRank + inc;
    prevRank = rank;
    const F = (rank - 0.3) / (n + 0.4);
    pts.push({ t: o.t, rank, F, x: Math.log(o.t), y: Math.log(-Math.log(1 - F)) });
  });
  return pts;
}

export interface LinFit {
  slope: number;
  intercept: number;
  r2: number;
}

export function linearRegression(xs: number[], ys: number[]): LinFit {
  const n = xs.length;
  const mx = mean(xs);
  const my = mean(ys);
  let sxy = 0,
    sxx = 0,
    syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (xs[i] - mx) * (ys[i] - my);
    sxx += (xs[i] - mx) ** 2;
    syy += (ys[i] - my) ** 2;
  }
  const slope = sxy / sxx;
  return { slope, intercept: my - slope * mx, r2: syy === 0 ? 1 : (sxy * sxy) / (sxx * syy) };
}

export interface WeibullFit {
  beta: number;
  eta: number;
  r2: number;
  n: number;
  failures: number;
  suspensions: number;
  points: RankPoint[];
  method: 'MRR' | 'MLE';
}

/** Régression de rang sur X (méthode usuelle des logiciels de fiabilité). */
export function weibullMRR(obs: LifeObs[]): WeibullFit | null {
  const pts = medianRanks(obs);
  if (pts.length < 2) return null;
  // Régression X sur Y : x = a + b·y  →  β = 1/b, η = exp(a)
  const fit = linearRegression(
    pts.map((p) => p.y),
    pts.map((p) => p.x),
  );
  const beta = 1 / fit.slope;
  const eta = Math.exp(fit.intercept);
  return {
    beta,
    eta,
    r2: fit.r2,
    n: obs.length,
    failures: pts.length,
    suspensions: obs.length - pts.length,
    points: pts,
    method: 'MRR',
  };
}

/** Maximum de vraisemblance avec censures à droite (Newton-Raphson sur β). */
export function weibullMLE(obs: LifeObs[]): WeibullFit | null {
  const fails = obs.filter((o) => o.failed);
  const r = fails.length;
  if (r < 2) return null;
  const sumLnFail = fails.reduce((a, o) => a + Math.log(o.t), 0) / r;
  const g = (b: number) => {
    let s0 = 0,
      s1 = 0;
    for (const o of obs) {
      const tb = Math.pow(o.t, b);
      s0 += tb;
      s1 += tb * Math.log(o.t);
    }
    return s1 / s0 - 1 / b - sumLnFail;
  };
  let b = weibullMRR(obs)?.beta ?? 1.5;
  if (!isFinite(b) || b <= 0) b = 1.5;
  for (let i = 0; i < 100; i++) {
    const e = 1e-5 * b;
    const d = (g(b + e) - g(b - e)) / (2 * e);
    const nb = b - g(b) / d;
    if (!isFinite(nb) || nb <= 0) break;
    if (Math.abs(nb - b) < 1e-9) {
      b = nb;
      break;
    }
    b = nb;
  }
  const eta = Math.pow(obs.reduce((a, o) => a + Math.pow(o.t, b), 0) / r, 1 / b);
  const mrr = weibullMRR(obs);
  return {
    beta: b,
    eta,
    r2: mrr?.r2 ?? NaN,
    n: obs.length,
    failures: r,
    suspensions: obs.length - r,
    points: mrr?.points ?? [],
    method: 'MLE',
  };
}

export type FailureRegime = 'infant' | 'random' | 'wearout';

export function regimeOf(beta: number): FailureRegime {
  if (beta < 0.9) return 'infant';
  if (beta <= 1.2) return 'random';
  return 'wearout';
}

export const REGIME_LABEL: Record<FailureRegime, string> = {
  infant: 'Mortalité infantile (β < 1)',
  random: 'Défaillances aléatoires (β ≈ 1)',
  wearout: 'Usure / vieillissement (β > 1)',
};

// ---------------------------------------------------------------- optimisation

/** Intégrale numérique (Simpson). */
export function integrate(fn: (x: number) => number, a: number, b: number, n = 200): number {
  if (b <= a) return 0;
  if (n % 2) n++;
  const h = (b - a) / n;
  let s = fn(a) + fn(b);
  for (let i = 1; i < n; i++) s += fn(a + i * h) * (i % 2 ? 4 : 2);
  return (s * h) / 3;
}

/**
 * Coût par heure d'une politique de remplacement à âge T :
 * C(T) = [Cp·R(T) + Cf·F(T)] / ∫0..T R(t) dt
 */
export function ageReplacementCostRate(d: Distribution, T: number, cp: number, cf: number): number {
  return (cp * d.R(T) + cf * d.F(T)) / integrate(d.R, 0, T);
}

export interface AgeReplacementOptimum {
  T: number;
  costRate: number;
  runToFailureRate: number;
  saving: number; // fraction économisée vs correctif pur
  curve: { T: number; c: number }[];
}

export function optimalAgeReplacement(
  d: Distribution,
  cp: number,
  cf: number,
  tMax: number,
  steps = 120,
): AgeReplacementOptimum {
  const curve: { T: number; c: number }[] = [];
  let best = { T: tMax, c: Infinity };
  for (let i = 1; i <= steps; i++) {
    const T = (tMax * i) / steps;
    const c = ageReplacementCostRate(d, T, cp, cf);
    curve.push({ T, c });
    if (c < best.c) best = { T, c };
  }
  const rtf = cf / d.mean();
  return { T: best.T, costRate: best.c, runToFailureRate: rtf, saving: 1 - best.c / rtf, curve };
}

// ---------------------------------------------------------------- systèmes

export function seriesR(rs: number[]): number {
  return rs.reduce((a, r) => a * r, 1);
}

export function parallelR(rs: number[]): number {
  return 1 - rs.reduce((a, r) => a * (1 - r), 1);
}

function binom(n: number, k: number): number {
  let r = 1;
  for (let i = 1; i <= k; i++) r = (r * (n - k + i)) / i;
  return r;
}

/** Système k-parmi-n à composants identiques de fiabilité r. */
export function kOutOfN(k: number, n: number, r: number): number {
  let s = 0;
  for (let i = k; i <= n; i++) s += binom(n, i) * Math.pow(r, i) * Math.pow(1 - r, n - i);
  return s;
}

/** Disponibilité asymptotique d'un composant réparable (chaîne de Markov à 2 états). */
export function markovAvailability(lambda: number, mu: number): number {
  return mu / (lambda + mu);
}

// ---------------------------------------------------------------- pièces de rechange

/** Stock de sécurité et point de commande (demande normale, délai fixe). */
export function reorderPoint(
  demandPerDay: number,
  sigmaPerDay: number,
  leadDays: number,
  serviceLevel: number,
): { safetyStock: number; rop: number; z: number } {
  const z = normInv(serviceLevel);
  const safetyStock = z * sigmaPerDay * Math.sqrt(leadDays);
  return { safetyStock, rop: demandPerDay * leadDays + safetyStock, z };
}

/** Probabilité d'au moins une demande (Poisson) pendant le délai d'appro. */
export function poissonAtLeastOne(ratePerYear: number, days: number): number {
  return 1 - Math.exp((-ratePerYear * days) / 365);
}

/** Quantité économique de Wilson. */
export function eoq(annualDemand: number, orderCost: number, unitCost: number, holdingRate: number): number {
  return Math.sqrt((2 * annualDemand * orderCost) / (unitCost * holdingRate));
}
