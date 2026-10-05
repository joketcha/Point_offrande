import type { ISODate } from './types';

/** Utilitaires de dates en UTC sur des chaînes ISO `YYYY-MM-DD` (pas de fuseau). */

const MS_JOUR = 86_400_000;

export function toISO(d: Date): ISODate {
  return d.toISOString().slice(0, 10);
}

export function parseISO(s: ISODate): Date {
  const [y, m, d] = s.slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function aujourdhuiReel(): ISODate {
  const n = new Date();
  return toISO(new Date(Date.UTC(n.getFullYear(), n.getMonth(), n.getDate())));
}

export function addDays(s: ISODate, n: number): ISODate {
  return toISO(new Date(parseISO(s).getTime() + Math.round(n) * MS_JOUR));
}

export function addMonths(s: ISODate, n: number): ISODate {
  const d = parseISO(s);
  const jour = d.getUTCDate();
  const r = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + n, 1));
  const dernier = new Date(Date.UTC(r.getUTCFullYear(), r.getUTCMonth() + 1, 0)).getUTCDate();
  r.setUTCDate(Math.min(jour, dernier));
  return toISO(r);
}

/** b − a en jours (positif si b est après a). */
export function diffDays(a: ISODate, b: ISODate): number {
  return Math.round((parseISO(b).getTime() - parseISO(a).getTime()) / MS_JOUR);
}

export function maxDate(...ds: (ISODate | undefined)[]): ISODate | undefined {
  return ds.filter((d): d is ISODate => !!d).sort().at(-1);
}

export function minDate(...ds: (ISODate | undefined)[]): ISODate | undefined {
  return ds.filter((d): d is ISODate => !!d).sort()[0];
}

/** Différence en heures entre deux horodatages `YYYY-MM-DDTHH:mm`. */
export function diffHours(a: string, b: string): number {
  const pa = new Date(a.length === 10 ? a + 'T00:00Z' : a + 'Z').getTime();
  const pb = new Date(b.length === 10 ? b + 'T00:00Z' : b + 'Z').getTime();
  return Math.round(((pb - pa) / 3_600_000) * 10) / 10;
}

const MOIS = ['janv.', 'févr.', 'mars', 'avr.', 'mai', 'juin', 'juil.', 'août', 'sept.', 'oct.', 'nov.', 'déc.'];
const MOIS_LONG = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

export function fmt(s?: string): string {
  if (!s) return '—';
  const d = parseISO(s);
  return `${d.getUTCDate()} ${MOIS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
}

export function fmtCourt(s?: string): string {
  if (!s) return '—';
  const d = parseISO(s);
  return `${d.getUTCDate()} ${MOIS_LONG[d.getUTCMonth()]}`;
}

export function fmtDateHeure(s?: string): string {
  if (!s) return '—';
  return s.length > 10 ? `${fmt(s)} ${s.slice(11, 16)}` : fmt(s);
}

export function moisLong(i: number): string {
  return MOIS_LONG[i];
}
export function moisCourt(i: number): string {
  return MOIS[i];
}

/** Écart signé lisible : « +7 j », « −3 j », « 0 j ». */
export function ecart(j: number | undefined): string {
  if (j === undefined || Number.isNaN(j)) return '—';
  if (j === 0) return '0 j';
  return `${j > 0 ? '+' : '−'}${Math.abs(j)} j`;
}

/** Numéro de semaine ISO. */
export function semaineISO(s: ISODate): number {
  const d = parseISO(s);
  const jour = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - jour + 3);
  const premierJeudi = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  return 1 + Math.round(((d.getTime() - premierJeudi.getTime()) / MS_JOUR - 3 + ((premierJeudi.getUTCDay() + 6) % 7)) / 7);
}

/** Convertit un numéro de série Excel ou une date JS / chaîne en ISO. */
export function versISO(v: unknown): ISODate | undefined {
  if (v instanceof Date && !Number.isNaN(v.getTime())) return toISO(v);
  if (typeof v === 'number' && v > 20000 && v < 80000) return addDays('1899-12-30', v);
  if (typeof v === 'string') {
    const t = v.trim();
    if (/^\d{4}-\d{2}-\d{2}/.test(t)) return t.slice(0, 10);
    const m = t.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{4})$/);
    if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  }
  return undefined;
}
