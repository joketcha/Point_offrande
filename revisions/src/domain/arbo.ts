import type { Atelier, Donnees, ID, Ligne, Machine, Site } from './types';

/** Accès à l'arborescence SITE → ATELIER → LIGNE → MACHINE. */
export interface Chemin {
  site?: Site;
  atelier?: Atelier;
  ligne?: Ligne;
  machine?: Machine;
}

export function cheminLigne(d: Donnees, ligneId: ID): Chemin {
  const ligne = d.lignes.find((l) => l.id === ligneId);
  const atelier = ligne && d.ateliers.find((a) => a.id === ligne.atelierId);
  const site = atelier && d.sites.find((s) => s.id === atelier.siteId);
  return { site, atelier, ligne };
}

export function cheminMachine(d: Donnees, machineId?: ID): Chemin {
  const machine = machineId ? d.machines.find((m) => m.id === machineId) : undefined;
  if (!machine) return {};
  return { ...cheminLigne(d, machine.ligneId), machine };
}

export function libelleLigne(d: Donnees, ligneId: ID): string {
  const l = d.lignes.find((x) => x.id === ligneId);
  return l ? `${l.code} — ${l.nom}` : '—';
}

export function codeLigne(d: Donnees, ligneId: ID): string {
  return d.lignes.find((x) => x.id === ligneId)?.code ?? '—';
}

export function codeMachine(d: Donnees, machineId?: ID): string {
  if (!machineId) return '—';
  return d.machines.find((x) => x.id === machineId)?.code ?? '—';
}

export function machinesDeLigne(d: Donnees, ligneId: ID): Machine[] {
  return d.machines.filter((m) => m.ligneId === ligneId);
}

/** Normalise un libellé pour comparaison (casse, accents, espaces). */
export function norm(s: unknown): string {
  return String(s ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}
