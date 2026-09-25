/**
 * Générateurs de jeux de données « réalistes et sales » pour les laboratoires.
 * Le vrai jeu (après nettoyage) est connu du moteur ; le joueur ne voit que la version brute.
 */
import { Rng } from './rng';
import { weibullMRR, type LifeObs } from './stats';

export type WeibullRowKind = 'failure' | 'suspension' | 'duplicate' | 'calendar' | 'other-asset' | 'date-error';
export type RowTreatment = 'failure' | 'suspension' | 'exclude' | 'convert';

export interface WeibullRow {
  id: string;
  asset: string;
  installed: string;
  removed: string;
  value: number;
  unit: 'h' | 'j';
  finding: string;
  kind: WeibullRowKind;
  /** Temps en heures de marche après traitement correct */
  trueHours: number | null;
  expected: RowTreatment;
}

const FAIL_FINDINGS = [
  'Fuite franche, faces de friction rayées',
  'Fuite continue, grain carbone ébréché',
  'Fuite + traces de marche à sec (faces bleuies)',
  'Fuite au démarrage, joint secondaire durci',
  'Fuite importante, ressort cassé',
];
const SUSP_FINDINGS = [
  'Déposée lors du remplacement roulement — faces en bon état',
  'Déposée pour révision de la roue — pas de fuite',
  'Retirée lors du changement de moteur — état correct',
  'Déposée pour contrôle préventif — usure faible',
];

const RUN_PER_CAL = 600 / 720; // P-101 : 600 h de marche / 720 h calendaires

function dateStr(dayIndex: number): string {
  const d = new Date(Date.UTC(2023, 0, 1) + dayIndex * 86400000);
  return d.toISOString().slice(0, 10).split('-').reverse().join('/');
}

/**
 * Petits échantillons = estimations très dispersées. Pour que la mission reste pédagogiquement
 * cohérente (l'histoire suppose une usure modérée), on retient le premier tirage dont
 * l'ajustement correct reste proche de la loi vraie.
 */
export function generateWeibullDataset(seed: number, difficulty: 1 | 2 | 3, beta = 1.5, eta = 1600) {
  let best = generateRaw(seed, difficulty, beta, eta);
  for (let i = 1; i < 40; i++) {
    const fit = correctFit(best.rows);
    if (fit && Math.abs(fit.beta - beta) < 0.25 && Math.abs(fit.eta / eta - 1) < 0.25) break;
    best = generateRaw(seed + i * 7919, difficulty, beta, eta);
  }
  return best;
}

function generateRaw(seed: number, difficulty: 1 | 2 | 3, beta: number, eta: number) {
  const rng = new Rng(seed);
  const n = 10 + difficulty * 2;
  const rows: WeibullRow[] = [];
  let day = rng.int(0, 30);
  let k = 1;
  const nextId = () => `D-${String(100 + k++).padStart(3, '0')}`;
  for (let i = 0; i < n; i++) {
    const life = Math.max(60, Math.round(rng.weibull(beta, eta)));
    const suspended = rng.chance(0.28);
    const t = suspended ? Math.max(40, Math.round(life * rng.uniform(0.25, 0.9))) : life;
    const calDays = Math.round(t / RUN_PER_CAL / 24);
    const row: WeibullRow = {
      id: nextId(),
      asset: 'P-101',
      installed: dateStr(day),
      removed: dateStr(day + calDays),
      value: t,
      unit: 'h',
      finding: suspended ? rng.pick(SUSP_FINDINGS) : rng.pick(FAIL_FINDINGS),
      kind: suspended ? 'suspension' : 'failure',
      trueHours: t,
      expected: suspended ? 'suspension' : 'failure',
    };
    // Carnet d'atelier : durée notée en jours calendaires
    if (!suspended && i % 5 === 3) {
      row.kind = 'calendar';
      row.value = calDays;
      row.unit = 'j';
      row.finding += ' (carnet atelier : durée en jours calendaires)';
      row.expected = 'convert';
    }
    rows.push(row);
    day += calDays + rng.int(1, 4);
  }
  // Doublon d'un enregistrement de défaillance
  const src = rows.find((r) => r.kind === 'failure')!;
  rows.splice(rows.indexOf(src) + 1, 0, { ...src, id: nextId(), kind: 'duplicate', expected: 'exclude', trueHours: null, finding: src.finding + ' (saisie GMAO)' });
  // Pompe voisine mal codée
  rows.push({ id: nextId(), asset: 'P-102', installed: dateStr(40), removed: dateStr(160), value: 2410, unit: 'h', finding: 'Fuite garniture pompe eau glacée', kind: 'other-asset', trueHours: null, expected: 'exclude' });
  if (difficulty >= 2) {
    rows.push({ id: nextId(), asset: 'P-101', installed: dateStr(300), removed: dateStr(290), value: -240, unit: 'h', finding: 'Fuite (date de pose saisie après la dépose)', kind: 'date-error', trueHours: null, expected: 'exclude' });
  }
  const shuffled = rng.shuffle(rows);
  return { rows: shuffled, trueBeta: beta, trueEta: eta };
}

export function treatedObservations(rows: WeibullRow[], treatment: Record<string, RowTreatment>): LifeObs[] {
  const obs: LifeObs[] = [];
  for (const r of rows) {
    const t = treatment[r.id];
    if (t === 'exclude') continue;
    let hours = r.unit === 'j' ? (t === 'convert' ? r.value * 24 * RUN_PER_CAL : r.value) : r.value;
    if (t === 'convert' && r.unit === 'h') hours = r.value;
    if (hours <= 0) continue;
    obs.push({ t: hours, failed: t === 'failure' || t === 'convert' });
  }
  return obs;
}

export function correctFit(rows: WeibullRow[]) {
  const truth = Object.fromEntries(rows.map((r) => [r.id, r.expected])) as Record<string, RowTreatment>;
  return weibullMRR(treatedObservations(rows, truth));
}
