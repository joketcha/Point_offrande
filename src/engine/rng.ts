/**
 * Générateur pseudo-aléatoire déterministe (mulberry32).
 * Toute la simulation est reproductible à partir d'une graine : indispensable
 * pour rejouer un scénario, déboguer, et comparer deux stratégies à hasard égal.
 */
export class Rng {
  private s: number;

  constructor(seed: number) {
    this.s = seed >>> 0 || 0x9e3779b9;
  }

  get state(): number {
    return this.s;
  }

  next(): number {
    let t = (this.s = (this.s + 0x6d2b79f5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  uniform(a = 0, b = 1): number {
    return a + (b - a) * this.next();
  }

  int(a: number, b: number): number {
    return Math.floor(this.uniform(a, b + 1));
  }

  chance(p: number): boolean {
    return this.next() < p;
  }

  normal(mu = 0, sigma = 1): number {
    const u = Math.max(this.next(), 1e-12);
    const v = this.next();
    return mu + sigma * Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  }

  /** Temps jusqu'à défaillance Weibull(β, η). */
  weibull(beta: number, eta: number): number {
    return eta * Math.pow(-Math.log(1 - this.next()), 1 / beta);
  }

  /** Durée de vie résiduelle d'un composant Weibull ayant déjà l'âge `age`. */
  weibullResidual(beta: number, eta: number, age: number): number {
    const u = Math.max(1 - this.next(), 1e-12);
    return eta * Math.pow(Math.pow(age / eta, beta) - Math.log(u), 1 / beta) - age;
  }

  lognormal(mu: number, sigma: number): number {
    return Math.exp(this.normal(mu, sigma));
  }

  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }

  shuffle<T>(arr: readonly T[]): T[] {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(this.next() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }
}

export function hashSeed(text: string): number {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}
