/**
 * Méthode du chemin critique (CPM) sur un réseau de tâches en jours.
 *
 * - passe avant : début au plus tôt (ES) / fin au plus tôt (EF) ;
 * - passe arrière : début au plus tard (LS) / fin au plus tard (LF) ;
 * - marge totale = LS − ES ; critique si marge ≤ 0.
 *
 * Une tâche `fixe` (déjà démarrée ou terminée) garde son début réel quel que soit
 * l'état de ses prédécesseurs : le réel ne se recalcule pas.
 */

export interface NoeudCpm {
  id: string;
  duree: number;
  deps: string[];
  /** Début au plus tôt imposé (jours depuis l'origine). */
  debutMin: number;
  fixe?: boolean;
}

export interface ResultatCpm {
  es: number;
  ef: number;
  ls: number;
  lf: number;
  marge: number;
  critique: boolean;
}

export interface Cpm {
  taches: Record<string, ResultatCpm>;
  fin: number;
  /** Tâches impliquées dans une dépendance circulaire (ignorées pour l'ordre). */
  cycle: string[];
  /** Chemin critique ordonné (ids). */
  chemin: string[];
}

const EPS = 1e-6;

export function calculerCpm(noeuds: NoeudCpm[], finImposee?: number): Cpm {
  const parId = new Map(noeuds.map((n) => [n.id, n]));
  const deps = new Map(noeuds.map((n) => [n.id, n.deps.filter((d) => parId.has(d) && d !== n.id)]));
  const succ = new Map<string, string[]>(noeuds.map((n) => [n.id, []]));
  for (const [id, ds] of deps) for (const d of ds) succ.get(d)!.push(id);

  // Tri topologique (Kahn).
  const degre = new Map(noeuds.map((n) => [n.id, deps.get(n.id)!.length]));
  const file = noeuds.filter((n) => degre.get(n.id) === 0).map((n) => n.id);
  const ordre: string[] = [];
  while (file.length) {
    const id = file.shift()!;
    ordre.push(id);
    for (const s of succ.get(id)!) {
      degre.set(s, degre.get(s)! - 1);
      if (degre.get(s) === 0) file.push(s);
    }
  }
  const cycle = noeuds.map((n) => n.id).filter((id) => !ordre.includes(id));
  // Les nœuds en cycle sont traités en fin, sans leurs dépendances circulaires.
  for (const id of cycle) {
    deps.set(id, deps.get(id)!.filter((d) => ordre.includes(d)));
    ordre.push(id);
  }
  const succEff = new Map<string, string[]>(noeuds.map((n) => [n.id, []]));
  for (const [id, ds] of deps) for (const d of ds) succEff.get(d)!.push(id);

  const es = new Map<string, number>();
  const ef = new Map<string, number>();
  for (const id of ordre) {
    const n = parId.get(id)!;
    const debut = n.fixe ? n.debutMin : Math.max(n.debutMin, ...deps.get(id)!.map((d) => ef.get(d)!), 0);
    es.set(id, debut);
    ef.set(id, debut + Math.max(0, n.duree));
  }
  const finCalc = Math.max(0, ...ordre.map((id) => ef.get(id)!));
  const fin = finImposee !== undefined ? Math.max(finImposee, finCalc) : finCalc;

  const lf = new Map<string, number>();
  const ls = new Map<string, number>();
  for (const id of [...ordre].reverse()) {
    const n = parId.get(id)!;
    const s = succEff.get(id)!;
    const finTard = s.length ? Math.min(...s.map((x) => ls.get(x)!)) : fin;
    lf.set(id, finTard);
    ls.set(id, finTard - Math.max(0, n.duree));
  }

  const taches: Record<string, ResultatCpm> = {};
  for (const id of ordre) {
    const marge = ls.get(id)! - es.get(id)!;
    taches[id] = { es: es.get(id)!, ef: ef.get(id)!, ls: ls.get(id)!, lf: lf.get(id)!, marge, critique: marge <= EPS };
  }

  // Chemin critique : on remonte depuis la tâche critique qui finit le plus tard.
  const chemin: string[] = [];
  let courant = ordre.filter((id) => taches[id].critique && Math.abs(taches[id].ef - finCalc) < EPS).sort((a, b) => taches[b].es - taches[a].es)[0];
  const vus = new Set<string>();
  while (courant && !vus.has(courant)) {
    vus.add(courant);
    chemin.unshift(courant);
    const t = taches[courant];
    courant = deps
      .get(courant)!
      .filter((d) => taches[d].critique && Math.abs(taches[d].ef - t.es) < EPS)
      .sort((a, b) => taches[b].ef - taches[a].ef)[0];
  }

  return { taches, fin: finCalc, cycle, chemin };
}
