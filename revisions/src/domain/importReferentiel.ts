import { norm } from './arbo';
import type { Donnees, ID } from './types';

/**
 * Import Excel du référentiel industriel (mise en route) :
 * Site → Atelier → Ligne → Machine → Sous-ensemble → Organe.
 * Crée ce qui manque, ne modifie ni ne supprime jamais l'existant.
 */

export const COLONNES_REFERENTIEL = ['Site', 'Atelier', 'Ligne', 'Nom ligne', 'Machine', 'Nom machine', 'Sous-ensemble', 'Organe'] as const;

const SYN: Record<(typeof COLONNES_REFERENTIEL)[number], string[]> = {
  Site: ['site', 'usine'],
  Atelier: ['atelier', 'secteur'],
  Ligne: ['ligne', 'code ligne'],
  'Nom ligne': ['nom ligne', 'libelle ligne', 'designation ligne'],
  Machine: ['machine', 'code machine', 'equipement'],
  'Nom machine': ['nom machine', 'libelle machine', 'designation machine'],
  'Sous-ensemble': ['sous ensemble', 'sous-ensemble'],
  Organe: ['organe', 'composant'],
};

export interface BilanReferentiel {
  sites: number;
  ateliers: number;
  lignes: number;
  machines: number;
  sousEnsembles: number;
  organes: number;
  anomalies: { ligne: number; message: string }[];
  colonnesManquantes: string[];
}

/** Applique l'import sur `d` (modifié en place) et renvoie le bilan. */
export function appliquerReferentiel(rows: unknown[][], d: Donnees, nouvelId: (p: string) => ID): BilanReferentiel {
  const b: BilanReferentiel = { sites: 0, ateliers: 0, lignes: 0, machines: 0, sousEnsembles: 0, organes: 0, anomalies: [], colonnesManquantes: [] };
  const entetes = (rows[0] ?? []).map(norm);
  const idx = Object.fromEntries(COLONNES_REFERENTIEL.map((c) => [c, entetes.findIndex((h) => SYN[c].some((s) => norm(s) === h))])) as Record<(typeof COLONNES_REFERENTIEL)[number], number>;
  for (const c of ['Site', 'Atelier', 'Ligne'] as const) if (idx[c] < 0) b.colonnesManquantes.push(c);
  if (b.colonnesManquantes.length) return b;
  rows.slice(1).forEach((row, k) => {
    const n = k + 2;
    const v = (c: (typeof COLONNES_REFERENTIEL)[number]) => (idx[c] >= 0 && row[idx[c]] != null ? String(row[idx[c]]).trim() : '');
    if (COLONNES_REFERENTIEL.every((c) => !v(c))) return;
    if (!v('Site') || !v('Atelier') || !v('Ligne')) return void b.anomalies.push({ ligne: n, message: 'Site, Atelier et Ligne sont obligatoires.' });
    let site = d.sites.find((s) => norm(s.code) === norm(v('Site')) || norm(s.nom) === norm(v('Site')));
    if (!site) {
      site = { id: nouvelId('S'), code: v('Site').slice(0, 12).toUpperCase(), nom: v('Site') };
      d.sites.push(site);
      b.sites++;
    }
    let at = d.ateliers.find((a) => a.siteId === site!.id && (norm(a.code) === norm(v('Atelier')) || norm(a.nom) === norm(v('Atelier'))));
    if (!at) {
      at = { id: nouvelId('A'), siteId: site.id, code: v('Atelier').slice(0, 12).toUpperCase(), nom: v('Atelier') };
      d.ateliers.push(at);
      b.ateliers++;
    }
    let li = d.lignes.find((l) => norm(l.code) === norm(v('Ligne')));
    if (li && li.atelierId !== at.id) b.anomalies.push({ ligne: n, message: `Ligne ${li.code} déjà rattachée à un autre atelier : rattachement conservé.` });
    if (!li) {
      li = { id: nouvelId('L'), atelierId: at.id, code: v('Ligne'), nom: v('Nom ligne') || v('Ligne') };
      d.lignes.push(li);
      b.lignes++;
    }
    if (!v('Machine')) return;
    let m = d.machines.find((x) => x.ligneId === li!.id && norm(x.code) === norm(v('Machine')));
    if (!m) {
      m = { id: nouvelId('M'), ligneId: li.id, code: v('Machine'), nom: v('Nom machine') || v('Machine') };
      d.machines.push(m);
      b.machines++;
    }
    if (v('Sous-ensemble')) b.sousEnsembles += assurerNoeud(d, m.id, v('Sous-ensemble'), v('Organe'), nouvelId, (x) => (b.organes += x));
  });
  return b;
}

/** Crée le sous-ensemble et l'organe s'ils n'existent pas. Renvoie 1 si le sous-ensemble a été créé. */
export function assurerNoeud(d: Donnees, machineId: ID, se: string, organe: string, nouvelId: (p: string) => ID, organeCree: (n: number) => void = () => undefined): number {
  if (!se.trim()) return 0;
  let cree = 0;
  let s = d.sousEnsembles.find((x) => x.machineId === machineId && norm(x.nom) === norm(se));
  if (!s) {
    const rang = d.sousEnsembles.filter((x) => x.machineId === machineId).length + 1;
    s = { id: nouvelId('SE'), machineId, code: `SE${rang}`, nom: se.trim() };
    d.sousEnsembles.push(s);
    cree = 1;
  }
  if (organe.trim() && !d.organes.some((o) => o.sousEnsembleId === s!.id && norm(o.nom) === norm(organe))) {
    const rang = d.organes.filter((o) => o.sousEnsembleId === s!.id).length + 1;
    d.organes.push({ id: nouvelId('O'), sousEnsembleId: s.id, code: `O${rang}`, nom: organe.trim() });
    organeCree(1);
  }
  return cree;
}
