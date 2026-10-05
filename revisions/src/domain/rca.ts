import { addDays, fmt } from './dates';
import type { ID, ISODate, Role } from './types';

/**
 * Analyse de causes racines (RCA) guidée en 12 étapes, jusqu'à la fiche A3.
 * Chaque étape porte sa raison d'être, l'erreur classique à éviter et des
 * contrôles de qualité calculés (une RCA se juge sur ses preuves, pas sur ses opinions).
 */

export type CritereDeclenchement = 'REPETITIVE' | 'CRITIQUE' | 'SECURITE' | 'COUT' | 'ARRET_LONG';
export type NiveauRca = 'N1' | 'N2' | 'N3';
export type Famille6M = 'MATIERE' | 'MATERIEL' | 'METHODE' | 'MAIN_OEUVRE' | 'MILIEU' | 'MESURE';
export type StatutHypothese = 'A_VERIFIER' | 'CONFIRMEE' | 'ECARTEE';
export type TypeCause = 'PHYSIQUE' | 'HUMAINE' | 'LATENTE';
export type Mecanisme = 'FATIGUE' | 'USURE' | 'CORROSION' | 'SURCHARGE' | 'DEREGLAGE' | 'AUTRE';
export type Hierarchie = 'ELIMINATION' | 'CONCEPTION' | 'PROCEDURE' | 'SURVEILLANCE' | 'FORMATION';

export interface Hypothese {
  id: ID;
  famille: Famille6M;
  texte: string;
  statut: StatutHypothese;
  preuve: string;
}

export interface NiveauPourquoi {
  texte: string;
  preuve: string;
  statut: StatutHypothese;
}

export interface BranchePourquoi {
  id: ID;
  /** Hypothèse Ishikawa d'origine (si confirmée). */
  hypotheseId?: ID;
  niveaux: NiveauPourquoi[];
  /** Nature de la cause au bout de la branche. */
  typeCause: TypeCause;
  racine: boolean;
}

export interface ActionRca {
  id: ID;
  texte: string;
  brancheId?: ID;
  hierarchie: Hierarchie;
  responsable: Role;
  porteur: string;
  echeance: ISODate;
  indicateur: string;
  faite: boolean;
}

export interface Rca {
  id: ID;
  code: string;
  titre: string;
  revisionId?: ID;
  ligneId?: ID;
  machineId?: ID;
  source: { type: 'INCIDENT' | 'TRAVAIL' | 'LIBRE'; id?: ID };
  animateur: string;
  dateCreation: ISODate;
  statut: 'EN_COURS' | 'CLOTUREE';
  etape: number;
  declenchement: { criteres: CritereDeclenchement[]; niveau: NiveauRca; justification: string };
  probleme: { quoi: string; ou: string; quand: string; qui: string; comment: string; combien: string; pourquoi: string; attendu: string; observe: string };
  confinement: { id: ID; texte: string; date: ISODate; faite: boolean }[];
  equipe: { id: ID; role: string; nom: string }[];
  preuves: { parts: string; position: string; people: string; paper: string; piecesPreservees: boolean };
  chronologie: { id: ID; date: ISODate; heure: string; evenement: string }[];
  mecanisme: { type: Mecanisme; description: string; preuve: string };
  ishikawa: Hypothese[];
  branches: BranchePourquoi[];
  actions: ActionRca[];
  verification: { indicateur: string; critere: string; mtbfJours: number; dateControle: ISODate; resultat?: 'EFFICACE' | 'NON_EFFICACE'; commentaire: string };
  capitalisation: { planMaintenance: string; amdec: string; codesDimomaint: string; rex: boolean };
}

export const CRITERES_DECLENCHEMENT: Record<CritereDeclenchement, string> = {
  REPETITIVE: 'Panne répétitive',
  CRITIQUE: 'Équipement critique',
  SECURITE: 'Sécurité / environnement',
  COUT: 'Coût important',
  ARRET_LONG: 'Arrêt long',
};

export const FAMILLES_6M: Record<Famille6M, { libelle: string; aide: string }> = {
  MATIERE: { libelle: 'Matière', aide: 'PDR, consommables, produit, lubrifiant, qualité fournisseur' },
  MATERIEL: { libelle: 'Matériel', aide: 'Machine, outillage, conception, usure, réglages' },
  METHODE: { libelle: 'Méthode', aide: 'Procédure, gamme, mode opératoire, check-list, séquencement' },
  MAIN_OEUVRE: { libelle: "Main-d'œuvre", aide: 'Compétence, formation, charge, communication, prestataire' },
  MILIEU: { libelle: 'Milieu', aide: 'Température, humidité, poussière, vibrations, éclairage' },
  MESURE: { libelle: 'Mesure', aide: 'Instrumentation, étalonnage, seuils, contrôle, données' },
};

export const MECANISMES: Record<Mecanisme, string> = {
  FATIGUE: 'Fatigue',
  USURE: 'Usure',
  CORROSION: 'Corrosion',
  SURCHARGE: 'Surcharge',
  DEREGLAGE: 'Déréglage / mauvais montage',
  AUTRE: 'Autre',
};

export const TYPES_CAUSE: Record<TypeCause, { libelle: string; aide: string }> = {
  PHYSIQUE: { libelle: 'Physique', aide: 'Ce qui a cassé matériellement' },
  HUMAINE: { libelle: 'Humaine', aide: 'Le geste ou la décision qui l\'a permis' },
  LATENTE: { libelle: 'Latente', aide: 'Organisation, procédure, formation ou conception qui a rendu l\'erreur possible' },
};

/** Hiérarchie des actions : l'élimination et la conception priment sur la formation. */
export const HIERARCHIE: Record<Hierarchie, { libelle: string; force: number }> = {
  ELIMINATION: { libelle: 'Élimination de la cause', force: 5 },
  CONCEPTION: { libelle: 'Modification de conception', force: 4 },
  PROCEDURE: { libelle: 'Procédure / standard', force: 3 },
  SURVEILLANCE: { libelle: 'Surveillance / contrôle', force: 2 },
  FORMATION: { libelle: 'Formation / sensibilisation', force: 1 },
};

export interface DefEtapeRca {
  n: number;
  titre: string;
  pourquoi: string;
  erreur: string;
}

export const ETAPES_RCA: DefEtapeRca[] = [
  { n: 1, titre: 'Déclenchement', pourquoi: 'On ne fait pas une RCA sur chaque panne : on la réserve aux événements répétitifs, critiques, dangereux, coûteux ou longs. Le niveau fixe l\'effort et l\'équipe.', erreur: 'Lancer une RCA lourde sur une panne isolée sans enjeu, ou au contraire « réparer et oublier » une panne qui revient.' },
  { n: 2, titre: 'Énoncé du problème (5W2H)', pourquoi: 'Un énoncé factuel et chiffré cadre toute l\'analyse : l\'écart entre l\'attendu et l\'observé est ce qu\'on doit expliquer.', erreur: 'Mettre une cause ou un coupable dans l\'énoncé (« panne due à l\'opérateur… ») : on oriente l\'analyse avant d\'avoir les preuves.' },
  { n: 3, titre: 'Confinement', pourquoi: 'Protéger la production et la sécurité pendant l\'analyse, et tracer ce qui a déjà été fait pour ne pas le confondre avec une solution.', erreur: 'Considérer le remplacement de la pièce comme l\'action corrective : c\'est un confinement, la cause est toujours là.' },
  { n: 4, titre: 'Équipe', pourquoi: 'La cause racine se trouve souvent à la frontière entre métiers : production, maintenance, méthodes, qualité, fournisseur apportent chacun une partie des faits.', erreur: 'Analyser seul depuis le bureau, sans ceux qui ont vu la panne.' },
  { n: 5, titre: 'Preuves (4P)', pourquoi: 'Parts, Position, People, Paper : les preuves disparaissent vite. Les collecter et préserver les pièces défaillantes conditionne la qualité de toute la suite.', erreur: 'Jeter la pièce cassée ou nettoyer la zone avant l\'analyse : on perd le faciès et le contexte.' },
  { n: 6, titre: 'Chronologie', pourquoi: 'Ordonner les faits dans le temps fait apparaître les enchaînements, les signaux faibles et les écarts par rapport au normal.', erreur: 'Commencer la chronologie à la panne : les causes se trouvent souvent dans les heures, jours ou interventions qui précèdent.' },
  { n: 7, titre: 'Mécanisme de défaillance', pourquoi: 'Le faciès (fatigue, usure, corrosion, surcharge…) dit COMMENT la pièce a cédé et restreint fortement les hypothèses possibles.', erreur: 'Sauter le mécanisme pour aller directement aux causes humaines : on corrige un comportement sans expliquer la physique.' },
  { n: 8, titre: 'Ishikawa 6M', pourquoi: 'Ouvrir largement les hypothèses sur les 6 familles évite de s\'enfermer dans la première idée. Chaque hypothèse sera ensuite confirmée ou écartée.', erreur: 'Remplir le diagramme d\'opinions puis les traiter comme des causes avérées, sans preuve.' },
  { n: 9, titre: 'Arbre des causes / 5 pourquoi', pourquoi: 'Descendre de la cause physique à la cause humaine puis latente (organisation, procédure, formation, conception) : c\'est là qu\'on empêche la récidive.', erreur: 'S\'arrêter à « erreur humaine » ou à la pièce cassée, ou aligner des pourquoi non prouvés.' },
  { n: 10, titre: 'Actions correctives', pourquoi: 'Chaque cause latente doit recevoir au moins une action SMART avec un responsable et une échéance. Plus l\'action élimine la cause, plus elle est durable.', erreur: 'Se contenter de « former / sensibiliser » : c\'est l\'action la plus faible de la hiérarchie.' },
  { n: 11, titre: 'Vérification d\'efficacité', pourquoi: 'Une action n\'est efficace que si l\'indicateur le prouve dans la durée, par exemple l\'absence de récidive sur 3 × MTBF.', erreur: 'Clôturer la RCA dès que les actions sont faites, sans mesurer le résultat.' },
  { n: 12, titre: 'Capitalisation', pourquoi: 'Mettre à jour le plan de maintenance, l\'AMDEC, les codes défaillance DIMOMAINT et le REX transforme une panne en connaissance pour toute l\'usine.', erreur: 'Garder la RCA dans un tiroir : la même panne réapparaît sur la ligne voisine.' },
];

export function rcaVide(id: ID, code: string, animateur: string, today: ISODate, o: Partial<Rca> = {}): Rca {
  return {
    id,
    code,
    titre: '',
    source: { type: 'LIBRE' },
    animateur,
    dateCreation: today,
    statut: 'EN_COURS',
    etape: 1,
    declenchement: { criteres: [], niveau: 'N2', justification: '' },
    probleme: { quoi: '', ou: '', quand: '', qui: '', comment: '', combien: '', pourquoi: '', attendu: '', observe: '' },
    confinement: [],
    equipe: [],
    preuves: { parts: '', position: '', people: '', paper: '', piecesPreservees: false },
    chronologie: [],
    mecanisme: { type: 'AUTRE', description: '', preuve: '' },
    ishikawa: [],
    branches: [],
    actions: [],
    verification: { indicateur: '', critere: 'Absence de récidive sur 3 × MTBF', mtbfJours: 30, dateControle: addDays(today, 90), commentaire: '' },
    capitalisation: { planMaintenance: '', amdec: '', codesDimomaint: '', rex: false },
    ...o,
  };
}

/* ------------------------------------------------------------------ */
/* Contrôles de qualité par étape                                      */
/* ------------------------------------------------------------------ */

export interface ControleEtape {
  complete: boolean;
  /** Points bloquants (à corriger avant de considérer l'étape faite). */
  manques: string[];
  /** Conseils / alertes de méthode. */
  conseils: string[];
}

// Frontières de mots Unicode : \b ne reconnaît pas les lettres accentuées.
const MOTS_CAUSE = /(?:^|[^\p{L}])(car|parce que|à cause|a cause|du fait|suite à|suite a|dû à|due à|du a|faute|erreur de|négligence|oubli de)(?=$|[^\p{L}])/iu;

export function controlerEtape(r: Rca, n: number): ControleEtape {
  const c: ControleEtape = { complete: false, manques: [], conseils: [] };
  const p = r.probleme;
  switch (n) {
    case 1:
      if (!r.declenchement.criteres.length) c.manques.push('Cocher au moins un critère de déclenchement.');
      if (!r.declenchement.justification.trim()) c.manques.push('Justifier le niveau d\'analyse.');
      if (r.declenchement.criteres.length >= 3 && r.declenchement.niveau === 'N1') c.conseils.push('Trois critères ou plus : un niveau N2 ou N3 serait plus adapté.');
      break;
    case 2: {
      const champs: [keyof Rca['probleme'], string][] = [
        ['quoi', 'Quoi'],
        ['ou', 'Où'],
        ['quand', 'Quand'],
        ['comment', 'Comment'],
        ['combien', 'Combien'],
        ['attendu', 'Attendu'],
        ['observe', 'Observé'],
      ];
      for (const [k, l] of champs) if (!p[k].trim()) c.manques.push(`Renseigner « ${l} ».`);
      const texte = [p.quoi, p.comment, p.observe].join(' ');
      if (MOTS_CAUSE.test(texte)) c.manques.push('L\'énoncé contient une cause ou un jugement (« car », « à cause de », « erreur de »…) : décrire seulement les faits.');
      if (p.combien && !/\d/.test(p.combien)) c.conseils.push('« Combien » devrait être chiffré (heures d\'arrêt, pièces, coût, occurrences).');
      break;
    }
    case 3:
      if (!r.confinement.length) c.manques.push('Tracer au moins une action de confinement (même « aucune » doit être justifié).');
      break;
    case 4: {
      if (r.equipe.length < 3) c.manques.push('Constituer une équipe d\'au moins 3 personnes.');
      const roles = r.equipe.map((e) => e.role.toLowerCase());
      for (const req of ['production', 'maintenance']) if (!roles.some((x) => x.includes(req))) c.conseils.push(`Pas de représentant ${req} dans l'équipe.`);
      break;
    }
    case 5: {
      const pp = r.preuves;
      const n4 = [pp.parts, pp.position, pp.people, pp.paper].filter((x) => x.trim()).length;
      if (n4 < 4) c.manques.push(`Compléter les 4P (${n4}/4 renseignés).`);
      if (!pp.piecesPreservees) c.conseils.push('Pièces défaillantes non déclarées préservées : le faciès risque d\'être perdu.');
      if (pp.paper && !/dimomaint|historique|ot\b|gmao/i.test(pp.paper)) c.conseils.push('Paper : consulter l\'historique DIMOMAINT (OT, pannes antérieures, paramètres).');
      break;
    }
    case 6:
      if (r.chronologie.length < 3) c.manques.push('Au moins 3 événements datés dans la chronologie.');
      break;
    case 7:
      if (r.mecanisme.type === 'AUTRE' && !r.mecanisme.description.trim()) c.manques.push('Identifier le mécanisme de défaillance.');
      if (!r.mecanisme.preuve.trim()) c.manques.push('Indiquer la preuve du mécanisme (faciès, mesure, expertise).');
      break;
    case 8: {
      const familles = new Set(r.ishikawa.map((h) => h.famille));
      if (r.ishikawa.length < 4) c.manques.push('Formuler au moins 4 hypothèses.');
      if (familles.size < 3) c.conseils.push(`Hypothèses sur ${familles.size} famille(s) seulement : ouvrir davantage les 6M.`);
      const sansPreuve = r.ishikawa.filter((h) => h.statut !== 'A_VERIFIER' && !h.preuve.trim());
      if (sansPreuve.length) c.manques.push(`${sansPreuve.length} hypothèse(s) confirmée(s) ou écartée(s) sans preuve.`);
      const ouvertes = r.ishikawa.filter((h) => h.statut === 'A_VERIFIER').length;
      if (ouvertes) c.manques.push(`${ouvertes} hypothèse(s) encore à vérifier.`);
      if (r.ishikawa.length && !r.ishikawa.some((h) => h.statut === 'CONFIRMEE')) c.manques.push('Aucune hypothèse confirmée.');
      break;
    }
    case 9: {
      if (!r.branches.length) c.manques.push('Construire au moins une branche « 5 pourquoi » à partir d\'une hypothèse confirmée.');
      for (const b of r.branches) {
        const nom = b.niveaux[0]?.texte?.slice(0, 40) || 'branche';
        if (b.niveaux.some((x) => !x.preuve.trim())) c.manques.push(`« ${nom} » : chaque pourquoi doit être appuyé par une preuve.`);
        if (b.niveaux.some((x) => x.statut === 'A_VERIFIER')) c.manques.push(`« ${nom} » : des pourquoi restent à vérifier.`);
        if (b.niveaux.filter((x) => x.statut === 'CONFIRMEE').length < 3) c.conseils.push(`« ${nom} » : moins de 3 niveaux confirmés, la racine est-elle atteinte ?`);
      }
      if (r.branches.length && !r.branches.some((b) => b.racine && b.typeCause === 'LATENTE')) c.manques.push('Aucune cause racine latente (organisation, procédure, formation, conception) identifiée.');
      if (r.branches.some((b) => b.racine && /erreur humaine|faute de l.op|inattention/i.test(b.niveaux.at(-1)?.texte ?? ''))) c.conseils.push('Une racine « erreur humaine » n\'est pas une racine : demander pourquoi l\'erreur était possible.');
      break;
    }
    case 10: {
      const latentes = r.branches.filter((b) => b.racine && b.typeCause === 'LATENTE');
      for (const b of latentes) if (!r.actions.some((a) => a.brancheId === b.id)) c.manques.push(`Cause latente sans action : « ${b.niveaux.at(-1)?.texte ?? ''} ».`);
      const incompletes = r.actions.filter((a) => !a.texte.trim() || !a.porteur.trim() || !a.echeance || !a.indicateur.trim());
      if (incompletes.length) c.manques.push(`${incompletes.length} action(s) non SMART (texte, porteur, échéance et indicateur requis).`);
      if (!r.actions.length) c.manques.push('Définir les actions correctives.');
      const formation = r.actions.filter((a) => a.hierarchie === 'FORMATION').length;
      if (r.actions.length && formation === r.actions.length) c.conseils.push('Uniquement des actions de formation : chercher une action d\'élimination ou de conception.');
      break;
    }
    case 11:
      if (!r.verification.indicateur.trim()) c.manques.push('Définir l\'indicateur d\'efficacité.');
      if (!r.verification.dateControle) c.manques.push('Fixer la date de contrôle.');
      if (r.verification.mtbfJours && r.verification.dateControle < addDays(r.dateCreation, r.verification.mtbfJours * 3)) c.conseils.push('Date de contrôle antérieure à 3 × MTBF : la preuve d\'efficacité sera fragile.');
      break;
    case 12: {
      const cap = r.capitalisation;
      const n3 = [cap.planMaintenance, cap.amdec, cap.codesDimomaint].filter((x) => x.trim()).length;
      if (n3 < 3) c.manques.push(`Capitalisation incomplète (${n3}/3 : plan de maintenance, AMDEC, codes DIMOMAINT).`);
      if (!cap.rex) c.conseils.push('Pousser les leçons dans le REX de la révision.');
      break;
    }
  }
  c.complete = c.manques.length === 0;
  return c;
}

export function avancementRca(r: Rca): number {
  return Math.round((ETAPES_RCA.filter((e) => controlerEtape(r, e.n).complete).length / ETAPES_RCA.length) * 100);
}

export function causesRacines(r: Rca): BranchePourquoi[] {
  return r.branches.filter((b) => b.racine);
}

/** Retour d'expérience en 3 points sur la qualité de l'analyse. */
export function qualiteAnalyse(r: Rca): { titre: string; note: 'BON' | 'MOYEN' | 'FAIBLE'; texte: string }[] {
  const pp = r.preuves;
  const n4 = [pp.parts, pp.position, pp.people, pp.paper].filter((x) => x.trim()).length + (pp.piecesPreservees ? 1 : 0);
  const niveaux = r.branches.flatMap((b) => b.niveaux);
  const prouves = niveaux.filter((x) => x.preuve.trim() && x.statut !== 'A_VERIFIER').length;
  const hyp = r.ishikawa.length;
  const tranchees = r.ishikawa.filter((h) => h.statut !== 'A_VERIFIER' && h.preuve.trim()).length;
  const scorePreuves = (n4 / 5) * 0.4 + (niveaux.length ? prouves / niveaux.length : 0) * 0.4 + (hyp ? tranchees / hyp : 0) * 0.2;
  const latentes = r.branches.filter((b) => b.racine && b.typeCause === 'LATENTE');
  const couvertes = latentes.filter((b) => r.actions.some((a) => a.brancheId === b.id)).length;
  const force = r.actions.length ? r.actions.reduce((s, a) => s + HIERARCHIE[a.hierarchie].force, 0) / r.actions.length : 0;
  const verif = !!r.verification.indicateur.trim() && !!r.verification.dateControle;
  const cap = [r.capitalisation.planMaintenance, r.capitalisation.amdec, r.capitalisation.codesDimomaint].filter((x) => x.trim()).length + (r.capitalisation.rex ? 1 : 0);
  const note = (x: number): 'BON' | 'MOYEN' | 'FAIBLE' => (x >= 0.8 ? 'BON' : x >= 0.5 ? 'MOYEN' : 'FAIBLE');
  return [
    {
      titre: 'Solidité des preuves',
      note: note(scorePreuves),
      texte: `4P et préservation : ${n4}/5 ; pourquoi prouvés : ${prouves}/${niveaux.length} ; hypothèses tranchées avec preuve : ${tranchees}/${hyp}. ${scorePreuves < 0.8 ? 'Renforcer les preuves avant de conclure.' : 'L\'arbre repose sur des faits.'}`,
    },
    {
      titre: 'Profondeur et pertinence des actions',
      note: note((latentes.length ? couvertes / latentes.length : 0) * 0.6 + (force / 5) * 0.4),
      texte: `${latentes.length} cause(s) latente(s), ${couvertes} couverte(s) par une action ; force moyenne des actions ${force ? force.toFixed(1) : '—'}/5 (5 = élimination, 1 = formation).${latentes.length === 0 ? ' L\'analyse s\'est arrêtée avant les causes latentes.' : ''}`,
    },
    {
      titre: 'Boucle fermée (vérification et capitalisation)',
      note: note(((verif ? 1 : 0) + cap / 4) / 2),
      texte: `${verif ? `Efficacité contrôlée le ${fmt(r.verification.dateControle)} (${r.verification.critere || r.verification.indicateur})` : 'Aucune vérification d\'efficacité planifiée'} ; capitalisation ${cap}/4 (plan de maintenance, AMDEC, DIMOMAINT, REX).${r.verification.resultat ? ` Résultat : ${r.verification.resultat === 'EFFICACE' ? 'efficace' : 'non efficace — relancer l\'analyse'}.` : ''}`,
    },
  ];
}
