import type { GameState } from '../engine/types';

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
      return g.version === SAVE_VERSION ? g : null;
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
  return g;
}
