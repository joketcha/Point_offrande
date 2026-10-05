import type { Donnees, ID, Role, Utilisateur } from './types';

/**
 * Permissions (§35) : rôle × périmètre (site / atelier / ligne).
 * Le BMC a une vision transverse ; chaque métier ne modifie que son domaine.
 */

export type Domaine =
  | 'PLANNING'
  | 'GAMME'
  | 'ACHATS'
  | 'TRANSIT'
  | 'RECEPTION'
  | 'TECHNICIENS'
  | 'EVALUATION'
  | 'TRAVAUX'
  | 'REDEMARRAGE'
  | 'PRODUCTION'
  | 'STABILISATION'
  | 'REX'
  | 'RCA'
  | 'NOTIFICATIONS'
  | 'ADMIN';

export const DOMAINES: Record<Domaine, { libelle: string; editeurs: Role[] }> = {
  PLANNING: { libelle: 'Planification, reports, workflow amont', editeurs: ['BMC'] },
  GAMME: { libelle: 'Gammes, import Excel, besoins PDR', editeurs: ['BMC'] },
  ACHATS: { libelle: 'Commandes et fournisseurs', editeurs: ['ACHATS'] },
  TRANSIT: { libelle: 'Expédition, conteneur, bateau, ETA, acheminement', editeurs: ['TRANSIT'] },
  RECEPTION: { libelle: 'Réception physique et système, écarts', editeurs: ['MAGASIN'] },
  TECHNICIENS: { libelle: 'Planification des prestataires', editeurs: ['MAINTENANCE'] },
  EVALUATION: { libelle: 'Évaluation des techniciens', editeurs: ['MAINTENANCE'] },
  TRAVAUX: { libelle: 'Travaux et avancement', editeurs: ['MAINTENANCE', 'TECHNICIEN'] },
  REDEMARRAGE: { libelle: 'Jalons techniques de redémarrage, incidents', editeurs: ['MAINTENANCE'] },
  PRODUCTION: { libelle: 'Démarrage, première production (conforme)', editeurs: ['PRODUCTION'] },
  STABILISATION: { libelle: 'Relevés de stabilisation', editeurs: ['MAINTENANCE', 'PRODUCTION'] },
  REX: { libelle: 'Retour d\'expérience', editeurs: ['MAINTENANCE', 'BMC'] },
  RCA: { libelle: 'Analyses de causes racines (RCA)', editeurs: ['MAINTENANCE', 'BMC'] },
  NOTIFICATIONS: { libelle: 'Traitement de ses notifications', editeurs: ['BMC', 'MAINTENANCE', 'PRODUCTION', 'ACHATS', 'MAGASIN', 'TRANSIT', 'TECHNICIEN', 'DIRECTION'] },
  ADMIN: { libelle: 'Administration, référentiels, utilisateurs', editeurs: [] },
};

/** Une ligne est-elle dans le périmètre de l'utilisateur ? */
export function ligneVisible(d: Donnees, u: Utilisateur, ligneId: ID): boolean {
  if (u.role === 'ADMIN' || u.role === 'BMC' || u.role === 'DIRECTION') {
    // Transverse, sauf périmètre explicitement restreint.
    if (!u.perimetre.siteIds.length && !u.perimetre.atelierIds.length && !u.perimetre.ligneIds.length) return true;
  }
  const { siteIds, atelierIds, ligneIds } = u.perimetre;
  if (!siteIds.length && !atelierIds.length && !ligneIds.length) return true;
  const ligne = d.lignes.find((l) => l.id === ligneId);
  if (!ligne) return false;
  const atelier = d.ateliers.find((a) => a.id === ligne.atelierId);
  if (ligneIds.includes(ligneId)) return true;
  if (atelier && atelierIds.includes(atelier.id)) return true;
  if (atelier && siteIds.includes(atelier.siteId)) return true;
  return false;
}

/** Mode de saisie courant (par défaut : administrateurs seuls). */
export function modeSaisie(d: Donnees): 'ADMIN' | 'ROLES' {
  return d.parametres.modeSaisie ?? 'ADMIN';
}

/** Rôles autorisés à modifier un domaine (matrice définie par l'administrateur, sinon défaut). */
export function editeurs(d: Donnees, domaine: Domaine): Role[] {
  if (domaine === 'ADMIN') return [];
  return d.parametres.droits?.[domaine] ?? DOMAINES[domaine].editeurs;
}

export function peutModifier(d: Donnees, u: Utilisateur, domaine: Domaine, ligneId?: ID): boolean {
  if (!u.actif) return false;
  if (u.role === 'ADMIN') return true;
  // Mise en route : seuls les administrateurs saisissent, les autres sont en lecture.
  if (modeSaisie(d) === 'ADMIN') return false;
  if (!editeurs(d, domaine).includes(u.role)) return false;
  return ligneId ? ligneVisible(d, u, ligneId) : true;
}

export function domainesEditables(d: Donnees, u: Utilisateur): Domaine[] {
  return (Object.keys(DOMAINES) as Domaine[]).filter((k) => peutModifier(d, u, k));
}

/** Empreinte SHA-256 (hex) d'un mot de passe. */
export async function empreinte(motDePasse: string): Promise<string> {
  const texte = `pilotage-revisions:${motDePasse}`;
  if (globalThis.crypto?.subtle) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(texte));
    return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  // Repli (contexte non sécurisé) : FNV-1a 64 bits.
  let h = 0xcbf29ce484222325n;
  for (const c of new TextEncoder().encode(texte)) h = BigInt.asUintN(64, (h ^ BigInt(c)) * 0x100000001b3n);
  return `fnv-${h.toString(16)}`;
}
