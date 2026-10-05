import { norm } from './arbo';
import type { ArticlePDR, Criticite, Donnees, GammeLigne, GammeVersion, ID, ISODate, Pdr } from './types';

/**
 * Import Excel d'une gamme de révision (§8-9) :
 * lecture → contrôle des colonnes → contrôle des formats → doublons →
 * références inconnues → champs obligatoires → aperçu → import versionné.
 * Rien n'est écrasé : chaque import validé crée une nouvelle version de gamme.
 */

export type Colonne =
  | 'site'
  | 'atelier'
  | 'ligne'
  | 'machine'
  | 'sousEnsemble'
  | 'organe'
  | 'ref'
  | 'designation'
  | 'quantite'
  | 'criticite'
  | 'fournisseur'
  | 'delai'
  | 'commentaire';

export const COLONNES: { cle: Colonne; titre: string; obligatoire: boolean; synonymes: string[] }[] = [
  { cle: 'site', titre: 'Site', obligatoire: false, synonymes: ['site', 'usine'] },
  { cle: 'atelier', titre: 'Atelier', obligatoire: false, synonymes: ['atelier', 'secteur'] },
  { cle: 'ligne', titre: 'Ligne', obligatoire: true, synonymes: ['ligne', 'line', 'code ligne'] },
  { cle: 'machine', titre: 'Machine', obligatoire: true, synonymes: ['machine', 'equipement', 'code machine'] },
  { cle: 'sousEnsemble', titre: 'Sous-ensemble', obligatoire: false, synonymes: ['sous ensemble', 'sous ensembles', 'sous-ensemble', 'ensemble'] },
  { cle: 'organe', titre: 'Organe', obligatoire: false, synonymes: ['organe', 'composant'] },
  { cle: 'ref', titre: 'Référence PDR', obligatoire: true, synonymes: ['reference pdr', 'ref pdr', 'reference', 'ref', 'code article', 'article'] },
  { cle: 'designation', titre: 'Désignation', obligatoire: true, synonymes: ['designation', 'libelle', 'description'] },
  { cle: 'quantite', titre: 'Quantité', obligatoire: true, synonymes: ['quantite', 'qte', 'qty', 'quantity'] },
  { cle: 'criticite', titre: 'Criticité', obligatoire: false, synonymes: ['criticite', 'criticality', 'classe'] },
  { cle: 'fournisseur', titre: 'Fournisseur', obligatoire: false, synonymes: ['fournisseur', 'supplier'] },
  { cle: 'delai', titre: "Délai d'approvisionnement", obligatoire: false, synonymes: ['delai d approvisionnement', 'delai approvisionnement', 'delai appro', 'delai', 'lead time', 'delai j'] },
  { cle: 'commentaire', titre: 'Commentaire', obligatoire: false, synonymes: ['commentaire', 'remarque', 'observations'] },
];

export type Gravite = 'ERREUR' | 'AVERTISSEMENT';

export interface Anomalie {
  ligne: number; // numéro de ligne Excel (1 = en-tête)
  colonne?: string;
  gravite: Gravite;
  message: string;
}

export interface LigneImport {
  numero: number;
  brut: Record<Colonne, string>;
  valeur?: GammeLigne & { ligneId: ID };
  anomalies: Anomalie[];
}

export interface ResultatImport {
  mapping: Partial<Record<Colonne, number>>;
  colonnesManquantes: string[];
  colonnesIgnorees: string[];
  lignes: LigneImport[];
  anomalies: Anomalie[];
  nbErreurs: number;
  nbAvertissements: number;
  /** Lignes de production concernées par le fichier. */
  ligneIds: ID[];
  valide: boolean;
}

function parseCriticite(v: string): Criticite | undefined {
  const n = norm(v);
  if (!n) return undefined;
  if (['a', 'critique', 'crit', '1', 'haute', 'vital'].includes(n)) return 'A';
  if (['b', 'importante', 'important', '2', 'moyenne'].includes(n)) return 'B';
  if (['c', 'standard', 'normale', '3', 'faible', 'basse'].includes(n)) return 'C';
  return undefined;
}

function parseNombre(v: unknown): number | undefined {
  if (typeof v === 'number') return v;
  const s = String(v ?? '').trim().replace(/\s/g, '').replace(',', '.');
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

/** Analyse un tableau brut (première ligne = en-têtes) issu d'Excel ou CSV. */
export function analyserTableau(rows: unknown[][], d: Donnees, catalogue: ArticlePDR[]): ResultatImport {
  const anomalies: Anomalie[] = [];
  const entetes = (rows[0] ?? []).map((x) => norm(x));
  const mapping: Partial<Record<Colonne, number>> = {};
  for (const col of COLONNES) {
    const i = entetes.findIndex((h) => col.synonymes.some((s) => norm(s) === h));
    if (i >= 0) mapping[col.cle] = i;
  }
  const colonnesManquantes = COLONNES.filter((c) => c.obligatoire && mapping[c.cle] === undefined).map((c) => c.titre);
  const utilisees = new Set(Object.values(mapping));
  const colonnesIgnorees = (rows[0] ?? []).map((x, i) => (utilisees.has(i) || !String(x ?? '').trim() ? '' : String(x))).filter(Boolean);
  for (const c of colonnesManquantes) anomalies.push({ ligne: 1, colonne: c, gravite: 'ERREUR', message: `Colonne obligatoire absente : « ${c} ».` });
  for (const c of colonnesIgnorees) anomalies.push({ ligne: 1, colonne: c, gravite: 'AVERTISSEMENT', message: `Colonne non reconnue, ignorée : « ${c} ».` });

  const refsCatalogue = new Map(catalogue.map((a) => [norm(a.ref), a]));
  const vus = new Map<string, number>();
  const lignes: LigneImport[] = [];

  rows.slice(1).forEach((row, k) => {
    const numero = k + 2;
    const get = (c: Colonne) => {
      const i = mapping[c];
      const v = i === undefined ? '' : row[i];
      return v === null || v === undefined ? '' : String(v).trim();
    };
    const brut = Object.fromEntries(COLONNES.map((c) => [c.cle, get(c.cle)])) as Record<Colonne, string>;
    if (Object.values(brut).every((v) => !v)) return; // ligne vide
    const an: Anomalie[] = [];
    const err = (colonne: string, message: string) => an.push({ ligne: numero, colonne, gravite: 'ERREUR', message });
    const warn = (colonne: string, message: string) => an.push({ ligne: numero, colonne, gravite: 'AVERTISSEMENT', message });

    for (const c of COLONNES.filter((x) => x.obligatoire && mapping[x.cle] !== undefined)) if (!brut[c.cle]) err(c.titre, `${c.titre} manquant(e).`);

    // Arborescence : ligne et machine doivent exister dans le référentiel.
    const ligne = brut.ligne ? d.lignes.find((l) => norm(l.code) === norm(brut.ligne) || norm(l.nom) === norm(brut.ligne)) : undefined;
    if (brut.ligne && !ligne) err('Ligne', `Ligne inconnue : « ${brut.ligne} ».`);
    if (ligne && brut.atelier) {
      const at = d.ateliers.find((a) => a.id === ligne.atelierId);
      if (at && norm(at.code) !== norm(brut.atelier) && norm(at.nom) !== norm(brut.atelier)) warn('Atelier', `Atelier « ${brut.atelier} » incohérent avec la ligne ${ligne.code} (${at.nom}).`);
    }
    const machine = ligne && brut.machine ? d.machines.find((m) => m.ligneId === ligne.id && (norm(m.code) === norm(brut.machine) || norm(m.nom) === norm(brut.machine))) : undefined;
    if (ligne && brut.machine && !machine) err('Machine', `Machine « ${brut.machine} » inconnue sur la ligne ${ligne.code}.`);

    const quantite = parseNombre(brut.quantite);
    if (brut.quantite && (quantite === undefined || quantite <= 0)) err('Quantité', `Quantité invalide : « ${brut.quantite} » (nombre > 0 attendu).`);
    else if (quantite !== undefined && !Number.isInteger(quantite)) warn('Quantité', `Quantité non entière (${quantite}).`);

    const art = refsCatalogue.get(norm(brut.ref));
    if (brut.ref && !art) warn('Référence PDR', `Référence inconnue du catalogue : « ${brut.ref} » (sera créée).`);
    if (art && brut.designation && norm(art.designation) !== norm(brut.designation)) warn('Désignation', `Désignation différente du catalogue (« ${art.designation} »).`);

    let criticite = parseCriticite(brut.criticite);
    if (brut.criticite && !criticite) err('Criticité', `Criticité invalide : « ${brut.criticite} » (A/B/C ou Critique/Importante/Standard).`);
    if (!brut.criticite) {
      criticite = art?.criticite ?? 'C';
      warn('Criticité', `Criticité absente : ${criticite} retenue${art ? ' (catalogue)' : ' par défaut'}.`);
    }

    const delai = parseNombre(brut.delai);
    if (brut.delai && (delai === undefined || delai < 0)) err("Délai d'approvisionnement", `Délai invalide : « ${brut.delai} » (jours ≥ 0).`);
    if (!brut.delai && !art?.delaiJours) warn("Délai d'approvisionnement", 'Délai absent : 60 j retenus par défaut.');
    if (!brut.fournisseur && !art?.fournisseur) warn('Fournisseur', 'Fournisseur non renseigné.');

    // Doublons : même machine + sous-ensemble + organe + référence.
    const cle = [ligne?.id, machine?.id ?? norm(brut.machine), norm(brut.sousEnsemble), norm(brut.organe), norm(brut.ref)].join('|');
    if (brut.ref) {
      if (vus.has(cle)) err('Référence PDR', `Doublon de la ligne ${vus.get(cle)} (même machine, sous-ensemble, organe et référence).`);
      else vus.set(cle, numero);
    }

    const valide = !an.some((a) => a.gravite === 'ERREUR');
    lignes.push({
      numero,
      brut,
      anomalies: an,
      valeur:
        valide && ligne && machine
          ? {
              ligneId: ligne.id,
              machineId: machine.id,
              sousEnsemble: brut.sousEnsemble,
              organe: brut.organe,
              ref: brut.ref,
              designation: brut.designation,
              quantite: quantite ?? 1,
              criticite: criticite ?? 'C',
              fournisseur: brut.fournisseur || art?.fournisseur || '',
              delaiJours: delai ?? art?.delaiJours ?? 60,
              commentaire: brut.commentaire,
            }
          : undefined,
    });
    anomalies.push(...an);
  });

  if (rows.length <= 1) anomalies.push({ ligne: 1, gravite: 'ERREUR', message: 'Le fichier ne contient aucune ligne de données.' });
  const ligneIds = [...new Set(lignes.map((l) => l.valeur?.ligneId).filter((x): x is ID => !!x))];
  const nbErreurs = anomalies.filter((a) => a.gravite === 'ERREUR').length;
  return {
    mapping,
    colonnesManquantes,
    colonnesIgnorees,
    lignes,
    anomalies,
    nbErreurs,
    nbAvertissements: anomalies.length - nbErreurs,
    ligneIds,
    valide: nbErreurs === 0 && lignes.length > 0,
  };
}

/* ------------------------------------------------------------------ */
/* Versions et comparaison                                              */
/* ------------------------------------------------------------------ */

export function cleGamme(l: Pick<GammeLigne, 'machineId' | 'sousEnsemble' | 'organe' | 'ref'>): string {
  return [l.machineId, norm(l.sousEnsemble), norm(l.organe), norm(l.ref)].join('|');
}

export type ChampGamme = 'designation' | 'quantite' | 'criticite' | 'fournisseur' | 'delaiJours';

export interface Diff {
  ajoutees: GammeLigne[];
  retirees: GammeLigne[];
  modifiees: { avant: GammeLigne; apres: GammeLigne; champs: ChampGamme[] }[];
  inchangees: number;
}

export function comparerGammes(avant: GammeLigne[], apres: GammeLigne[]): Diff {
  const a = new Map(avant.map((l) => [cleGamme(l), l]));
  const b = new Map(apres.map((l) => [cleGamme(l), l]));
  const diff: Diff = { ajoutees: [], retirees: [], modifiees: [], inchangees: 0 };
  for (const [k, l] of b) {
    const o = a.get(k);
    if (!o) diff.ajoutees.push(l);
    else {
      const champs = (['designation', 'quantite', 'criticite', 'fournisseur', 'delaiJours'] as ChampGamme[]).filter((c) => String(o[c]) !== String(l[c]));
      if (champs.length) diff.modifiees.push({ avant: o, apres: l, champs });
      else diff.inchangees++;
    }
  }
  for (const [k, l] of a) if (!b.has(k)) diff.retirees.push(l);
  return diff;
}

/** Crée la nouvelle version (l'ancienne passe « remplacée », jamais supprimée). */
export function nouvelleVersion(gammes: GammeVersion[], ligneId: ID, lignes: GammeLigne[], auteur: string, source: string, date: ISODate, id: ID): { gammes: GammeVersion[]; version: GammeVersion } {
  const existantes = gammes.filter((g) => g.ligneId === ligneId);
  const version: GammeVersion = {
    id,
    ligneId,
    version: Math.max(0, ...existantes.map((g) => g.version)) + 1,
    dateImport: date,
    auteur,
    source,
    statut: 'ACTIVE',
    lignes,
  };
  return {
    gammes: [...gammes.map((g) => (g.ligneId === ligneId && g.statut === 'ACTIVE' ? { ...g, statut: 'REMPLACEE' as const } : g)), version],
    version,
  };
}

/**
 * Synchronise les besoins PDR d'une révision avec une version de gamme :
 *  - nouvelles lignes → PDR « identifiée » ;
 *  - lignes existantes → quantités/criticité mises à jour, avancement conservé ;
 *  - lignes retirées → PDR marquée « hors gamme » (jamais supprimée).
 */
export function synchroniserPdr(existantes: Pdr[], gamme: GammeVersion, revisionId: ID, today: ISODate, nouvelId: () => ID): { pdrs: Pdr[]; ajoutees: number; majs: number; horsGamme: number } {
  const parCle = new Map(existantes.filter((p) => p.revisionId === revisionId).map((p) => [cleGamme(p), p]));
  const cles = new Set(gamme.lignes.map(cleGamme));
  let ajoutees = 0;
  let majs = 0;
  let horsGamme = 0;
  const res: Pdr[] = existantes.map((p) => {
    if (p.revisionId !== revisionId) return p;
    if (!cles.has(cleGamme(p)) && !p.horsGamme) {
      horsGamme++;
      return { ...p, horsGamme: true };
    }
    return p;
  });
  for (const l of gamme.lignes) {
    const e = parCle.get(cleGamme(l));
    if (e) {
      const i = res.indexOf(res.find((x) => x.id === e.id)!);
      const changed = e.quantite !== l.quantite || e.criticite !== l.criticite || e.horsGamme;
      if (changed) majs++;
      res[i] = { ...res[i], quantite: l.quantite, criticite: l.criticite, designation: l.designation, horsGamme: false, fournisseur: res[i].fournisseur || l.fournisseur, delaiJours: l.delaiJours };
    } else {
      ajoutees++;
      res.push({
        id: nouvelId(),
        revisionId,
        machineId: l.machineId,
        sousEnsemble: l.sousEnsemble,
        organe: l.organe,
        ref: l.ref,
        designation: l.designation,
        quantite: l.quantite,
        criticite: l.criticite,
        fournisseur: l.fournisseur,
        delaiJours: l.delaiJours,
        etape: 'IDENTIFIEE',
        modeTransport: /\(CI\)|local/i.test(l.fournisseur) ? 'LOCAL' : 'MARITIME',
        dates: { IDENTIFIEE: today },
        etaHistorique: [],
        commentaire: l.commentaire || undefined,
      });
    }
  }
  return { pdrs: res, ajoutees, majs, horsGamme };
}
