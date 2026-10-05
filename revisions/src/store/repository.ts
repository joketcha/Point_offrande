import type { Donnees } from '../domain/types';

/**
 * Persistance abstraite : aujourd'hui le navigateur (localStorage), demain une API
 * (multisite, authentification, connexion DIMOMAINT) sans toucher aux écrans.
 */
export interface Repository {
  charger(): Donnees | null;
  enregistrer(d: Donnees): void;
  reinitialiser(): void;
}

export const VERSION_DONNEES = 1;
const CLE = 'pilotage-revisions:v1';

export class LocalStorageRepository implements Repository {
  constructor(private cle = CLE) {}

  charger(): Donnees | null {
    try {
      const brut = localStorage.getItem(this.cle);
      if (!brut) return null;
      const d = JSON.parse(brut) as Donnees;
      return d.version === VERSION_DONNEES ? d : null;
    } catch {
      return null;
    }
  }

  enregistrer(d: Donnees): void {
    try {
      localStorage.setItem(this.cle, JSON.stringify(d));
    } catch {
      /* stockage indisponible (navigation privée) : l'application reste utilisable en mémoire */
    }
  }

  reinitialiser(): void {
    try {
      localStorage.removeItem(this.cle);
    } catch {
      /* idem */
    }
  }
}

/** Export / import de sauvegarde complète (JSON). */
export function exporterJson(d: Donnees): string {
  return JSON.stringify(d, null, 2);
}

export function importerJson(s: string): Donnees {
  const d = JSON.parse(s) as Donnees;
  if (!d || d.version !== VERSION_DONNEES || !Array.isArray(d.revisions)) throw new Error('Fichier de sauvegarde invalide ou d\'une version incompatible.');
  return d;
}
