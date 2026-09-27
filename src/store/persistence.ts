import type { GameState, PlantState } from '../engine/types';

/**
 * Remplit les champs absents d'une partie chargée (sauvegarde d'une version antérieure
 * du jeu, ou fichier partiel) avec des valeurs par défaut, pour qu'une mise à jour
 * n'efface jamais une partie en cours et ne provoque pas de plantage.
 */
function normalizePlant(p: Partial<PlantState> | undefined): PlantState | undefined {
  if (!p) return undefined;
  return {
    ...(p as PlantState),
    modes: p.modes ?? {},
    stock: p.stock ?? {},
    sparePolicy: p.sparePolicy ?? {},
    lastMovement: p.lastMovement ?? {},
    orders: p.orders ?? [],
    events: p.events ?? [],
    kpis: p.kpis ?? [],
    modifiers: p.modifiers ?? [],
    journal: p.journal ?? [],
    resolvedDefects: p.resolvedDefects ?? [],
    resolvedAt: p.resolvedAt ?? {},
    unlocks: p.unlocks ?? [],
    projects: p.projects ?? [],
    pendingSpend: p.pendingSpend ?? 0,
    rcaOpened: p.rcaOpened ?? 0,
    rcaClosed: p.rcaClosed ?? 0,
    directionTrust: p.directionTrust ?? 45,
    safetyIndex: p.safetyIndex ?? 60,
    teamMorale: p.teamMorale ?? 45,
    dataQuality: p.dataQuality ?? 30,
  };
}

export function normalizeGame(g: GameState): GameState {
  const player = g.player;
  return {
    ...g,
    player: {
      ...player,
      skills: player.skills ?? ({} as GameState['player']['skills']),
      missions: player.missions ?? {},
      attempts: player.attempts ?? {},
      errors: player.errors ?? {},
      certifications: player.certifications ?? [],
      badges: player.badges ?? [],
      reasoningLog: player.reasoningLog ?? [],
      promotions: player.promotions ?? [],
    },
    plant: normalizePlant(g.plant)!,
    takeover: g.takeover ? { ...g.takeover, plant: normalizePlant(g.takeover.plant)! } : undefined,
    settings: g.settings ?? { sound: false, reducedMotion: false },
  };
}

/**
 * Couche de persistance abstraite. Le prototype utilise le stockage local du
 * navigateur ; un backend (API REST, Supabase, PostgreSQL…) peut être branché en
 * implémentant la même interface — voir docs/ARCHITECTURE.md §2 et docs/schema.sql.
 */
export interface GameRepository {
  load(): GameState | null;
  save(g: GameState): void;
  clear(): void;
}

export const SAVE_VERSION = 1;
const KEY = 'reliability-master/save/v1';

export class LocalStorageRepository implements GameRepository {
  load(): GameState | null {
    try {
      const raw = localStorage.getItem(KEY);
      if (!raw) return null;
      const g = JSON.parse(raw) as GameState;
      if (g.version !== SAVE_VERSION || !g.player || !g.plant) return null;
      return normalizeGame(g);
    } catch {
      return null;
    }
  }

  save(g: GameState): void {
    try {
      localStorage.setItem(KEY, JSON.stringify(g));
    } catch {
      /* stockage indisponible (navigation privée) : le jeu continue sans sauvegarde */
    }
  }

  clear(): void {
    try {
      localStorage.removeItem(KEY);
    } catch {
      /* ignore */
    }
  }
}

export function exportSave(g: GameState): string {
  return JSON.stringify(g, null, 1);
}

export function importSave(json: string): GameState {
  const g = JSON.parse(json) as GameState;
  if (!g || g.version !== SAVE_VERSION || !g.player || !g.plant) throw new Error('Fichier de sauvegarde invalide ou incompatible.');
  return normalizeGame(g);
}
