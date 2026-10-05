import { addDays, addMonths } from '../domain/dates';
import { ETAPES_PDR, indexEtape } from '../domain/referentiel';
import { actionsPreparationAGenerer } from '../domain/planning';
import type {
  ArticlePDR,
  Atelier,
  Criticite,
  Donnees,
  EtapePDR,
  GammeLigne,
  GammeVersion,
  ID,
  IncidentRedemarrage,
  Intervention,
  ISODate,
  Ligne,
  Machine,
  Organe,
  Parametres,
  Pdr,
  Rex,
  Revision,
  Site,
  SousEnsemble,
  StabilisationJour,
  Travail,
  Utilisateur,
} from '../domain/types';

/**
 * Jeu de démonstration réaliste (usine de boissons à Abidjan), daté RELATIVEMENT
 * à la date de référence : les scénarios restent « vivants » quel que soit le jour.
 *
 *  - L03 2025 : terminée, REX validé (réutilisé pour L03 2026) ;
 *  - L01 2026 : terminée, REX à finaliser, un prestataire à évaluer ;
 *  - L02 2026 : EN COURS, PDR critique ART-458 encore en mer, tâche bloquée ;
 *  - L03 2026 : PDR en transit, reportée une fois, technicien prévu avant les PDR ;
 *  - L04 2027 : en préparation (J-7 mois passé), commandes en retard ;
 *  - UT1 / L01 2027 : planifiées.
 */

export const PARAMETRES_DEFAUT: Parametres = {
  margePdrJours: 14,
  delaiFretJours: 35,
  delaiFretAerienJours: 5,
  delaiAbidjanUsineJours: 7,
  delaiReceptionJours: 3,
  delaiConfirmationJours: 7,
  moisPreparation: 7,
  devise: 'FCFA',
};

/* ------------------------------------------------------------------ */
/* Référentiel                                                         */
/* ------------------------------------------------------------------ */

interface ModelePdr {
  ref: string;
  designation: string;
  se: string;
  organe: string;
  qte: number;
  crit: Criticite;
  fournisseur: string;
  delai: number;
}

const SE: Record<string, { nom: string; ses: { nom: string; organes: string[] }[]; pdr: ModelePdr[] }> = {
  SOU: {
    nom: 'Souffleuse',
    ses: [
      { nom: 'Roue de soufflage', organes: ['Moules', "Tiges d'étirage", 'Bloc vannes'] },
      { nom: 'Four de chauffe', organes: ['Lampes IR', 'Ventilation'] },
      { nom: 'Transfert préformes', organes: ['Pinces', 'Étoiles'] },
    ],
    pdr: [
      { ref: 'ART-458', designation: 'Moule de soufflage 1,5 L (jeu)', se: 'Roue de soufflage', organe: 'Moules', qte: 12, crit: 'A', fournisseur: 'Sidel (FR)', delai: 120 },
      { ref: 'ART-461', designation: "Tige d'étirage Ø12", se: 'Roue de soufflage', organe: "Tiges d'étirage", qte: 24, crit: 'B', fournisseur: 'Sidel (FR)', delai: 60 },
      { ref: 'ART-472', designation: 'Vanne haute pression 40 bar', se: 'Roue de soufflage', organe: 'Bloc vannes', qte: 6, crit: 'A', fournisseur: 'Eugen Seitz (CH)', delai: 90 },
      { ref: 'ART-480', designation: 'Lampe infrarouge 2 500 W', se: 'Four de chauffe', organe: 'Lampes IR', qte: 40, crit: 'C', fournisseur: 'Heraeus (DE)', delai: 30 },
    ],
  },
  REM: {
    nom: 'Remplisseuse',
    ses: [
      { nom: 'Carrousel', organes: ['Vannes de remplissage', 'Joint tournant'] },
      { nom: 'Pompe produit', organes: ['Garniture mécanique', 'Moteur'] },
    ],
    pdr: [
      { ref: 'ART-512', designation: 'Vanne de remplissage complète', se: 'Carrousel', organe: 'Vannes de remplissage', qte: 4, crit: 'A', fournisseur: 'Krones AG (DE)', delai: 100 },
      { ref: 'ART-515', designation: 'Kit joints carrousel', se: 'Carrousel', organe: 'Joint tournant', qte: 2, crit: 'B', fournisseur: 'Krones AG (DE)', delai: 45 },
      { ref: 'ART-530', designation: 'Garniture mécanique pompe produit', se: 'Pompe produit', organe: 'Garniture mécanique', qte: 2, crit: 'A', fournisseur: 'Grundfos (DK)', delai: 60 },
    ],
  },
  BOU: {
    nom: 'Boucheuse',
    ses: [{ nom: 'Tourelle de bouchage', organes: ['Têtes de bouchage', 'Came'] }],
    pdr: [
      { ref: 'ART-601', designation: 'Tête de bouchage magnétique', se: 'Tourelle de bouchage', organe: 'Têtes de bouchage', qte: 6, crit: 'B', fournisseur: 'Arol (IT)', delai: 75 },
      { ref: 'ART-604', designation: 'Galet de came', se: 'Tourelle de bouchage', organe: 'Came', qte: 12, crit: 'C', fournisseur: 'SKF France', delai: 20 },
    ],
  },
  ETQ: {
    nom: 'Étiqueteuse',
    ses: [{ nom: 'Groupe encolleur', organes: ['Rouleau encolleur', 'Transmission'] }],
    pdr: [
      { ref: 'ART-702', designation: 'Rouleau encolleur', se: 'Groupe encolleur', organe: 'Rouleau encolleur', qte: 2, crit: 'C', fournisseur: 'Krones AG (DE)', delai: 40 },
      { ref: 'ART-705', designation: 'Courroie crantée HTD 8M', se: 'Groupe encolleur', organe: 'Transmission', qte: 4, crit: 'C', fournisseur: 'SKF France', delai: 20 },
    ],
  },
  FAR: {
    nom: 'Fardeleuse',
    ses: [{ nom: 'Tunnel de rétraction', organes: ['Barre de soudure', 'Convoyeur'] }],
    pdr: [
      { ref: 'ART-801', designation: 'Barre de soudure film', se: 'Tunnel de rétraction', organe: 'Barre de soudure', qte: 2, crit: 'B', fournisseur: 'Kisters (DE)', delai: 50 },
      { ref: 'ART-806', designation: 'Roulement 6205-2RS', se: 'Tunnel de rétraction', organe: 'Convoyeur', qte: 10, crit: 'C', fournisseur: 'SKF France', delai: 15 },
    ],
  },
  PAL: {
    nom: 'Palettiseur',
    ses: [{ nom: 'Élévateur', organes: ['Chaîne de levage', 'Variateur'] }],
    pdr: [
      { ref: 'ART-902', designation: 'Chaîne de levage duplex', se: 'Élévateur', organe: 'Chaîne de levage', qte: 1, crit: 'B', fournisseur: 'Krones AG (DE)', delai: 60 },
      { ref: 'ART-910', designation: 'Variateur ATV930 15 kW', se: 'Élévateur', organe: 'Variateur', qte: 1, crit: 'A', fournisseur: 'Schneider Electric (FR)', delai: 45 },
    ],
  },
  LAV: {
    nom: 'Laveuse bouteilles',
    ses: [{ nom: 'Bain de soude', organes: ['Pompe de lavage', 'Rampes'] }],
    pdr: [
      { ref: 'ART-301', designation: 'Pompe de lavage inox', se: 'Bain de soude', organe: 'Pompe de lavage', qte: 1, crit: 'A', fournisseur: 'Grundfos (DK)', delai: 80 },
      { ref: 'ART-305', designation: 'Buse de rinçage', se: 'Bain de soude', organe: 'Rampes', qte: 50, crit: 'C', fournisseur: 'Ivoire Industrie (CI)', delai: 20 },
    ],
  },
  PAS: {
    nom: 'Pasteurisateur',
    ses: [{ nom: 'Échangeur', organes: ['Plaques', 'Instrumentation'] }],
    pdr: [
      { ref: 'ART-351', designation: "Kit joints d'échangeur à plaques", se: 'Échangeur', organe: 'Plaques', qte: 1, crit: 'A', fournisseur: 'Alfa Laval (SE)', delai: 110 },
      { ref: 'ART-356', designation: 'Sonde PT100', se: 'Échangeur', organe: 'Instrumentation', qte: 6, crit: 'C', fournisseur: 'Endress+Hauser (CH)', delai: 25 },
    ],
  },
  SER: {
    nom: 'Sertisseuse',
    ses: [{ nom: 'Têtes de sertissage', organes: ['Molettes', 'Mandrins'] }],
    pdr: [
      { ref: 'ART-401', designation: 'Molette de sertissage 1re op.', se: 'Têtes de sertissage', organe: 'Molettes', qte: 12, crit: 'A', fournisseur: 'Ferrum (CH)', delai: 90 },
      { ref: 'ART-403', designation: 'Mandrin de sertissage', se: 'Têtes de sertissage', organe: 'Mandrins', qte: 12, crit: 'B', fournisseur: 'Ferrum (CH)', delai: 90 },
    ],
  },
  DEP: {
    nom: 'Dépalettiseur',
    ses: [{ nom: 'Tête de prise', organes: ['Ventouses'] }],
    pdr: [{ ref: 'ART-421', designation: 'Ventouse Ø60', se: 'Tête de prise', organe: 'Ventouses', qte: 12, crit: 'C', fournisseur: 'Festo (DE)', delai: 20 }],
  },
  CMP: {
    nom: 'Compresseur',
    ses: [{ nom: 'Bloc vis', organes: ['Kit révision', 'Séparateur'] }],
    pdr: [
      { ref: 'ART-151', designation: 'Kit révision 8 000 h', se: 'Bloc vis', organe: 'Kit révision', qte: 1, crit: 'A', fournisseur: 'Atlas Copco (BE)', delai: 70 },
      { ref: 'ART-155', designation: 'Filtre séparateur', se: 'Bloc vis', organe: 'Séparateur', qte: 2, crit: 'B', fournisseur: 'Atlas Copco (BE)', delai: 30 },
    ],
  },
  GFR: {
    nom: 'Groupe froid',
    ses: [{ nom: 'Circuit frigorifique', organes: ['Compresseur', 'Détendeur'] }],
    pdr: [{ ref: 'ART-171', designation: 'Kit révision compresseur Bitzer', se: 'Circuit frigorifique', organe: 'Compresseur', qte: 1, crit: 'A', fournisseur: 'Bitzer (DE)', delai: 90 }],
  },
};

const LIGNES: { id: ID; atelier: ID; code: string; nom: string; machines: [string, string][] }[] = [
  { id: 'L01', atelier: 'A-SR', code: 'L01', nom: 'Ligne PET 1', machines: [['SOU', 'SOU-001'], ['REM', 'REM-001'], ['BOU', 'BOU-001'], ['ETQ', 'ETQ-001'], ['FAR', 'FAR-001'], ['PAL', 'PAL-001']] },
  { id: 'L02', atelier: 'A-SR', code: 'L02', nom: 'Ligne PET 2', machines: [['SOU', 'SOU-004'], ['REM', 'REM-002'], ['BOU', 'BOU-002'], ['ETQ', 'ETQ-002'], ['FAR', 'FAR-002'], ['PAL', 'PAL-002']] },
  { id: 'L03', atelier: 'A-CD', code: 'L03', nom: 'Ligne Verre 3', machines: [['LAV', 'LAV-003'], ['REM', 'REM-003'], ['BOU', 'CAP-003'], ['PAS', 'PAS-003'], ['ETQ', 'ETQ-003'], ['PAL', 'PAL-003']] },
  { id: 'L04', atelier: 'A-CD', code: 'L04', nom: 'Ligne Canettes 4', machines: [['DEP', 'DEP-004'], ['REM', 'REM-004'], ['SER', 'SER-004'], ['PAS', 'PAS-004'], ['FAR', 'FAR-004']] },
  { id: 'UT1', atelier: 'A-UT', code: 'UT1', nom: 'Air comprimé & froid', machines: [['CMP', 'CMP-001'], ['CMP', 'CMP-002'], ['GFR', 'GFR-001']] },
];

/* ------------------------------------------------------------------ */
/* Historique PDR                                                      */
/* ------------------------------------------------------------------ */

/** Écart type (jours) pour arriver à chaque étape depuis la précédente. */
function ecartVers(e: EtapePDR, delai: number): number {
  const t: Partial<Record<EtapePDR, number>> = {
    BESOIN_VALIDE: 7,
    COMMANDE_A_CREER: 0,
    COMMANDE_CREEE: 5,
    COMMANDE_ENVOYEE: 2,
    COMMANDE_CONFIRMEE: 6,
    DISPO_FOURNISSEUR: Math.max(5, delai - 8),
    PRETE_EXPEDITION: 3,
    CONTENEUR: 4,
    BATEAU: 3,
    TRANSIT: 1,
    ARRIVEE_ABIDJAN: 33,
    ARRIVEE_USINE: 6,
    RECEPTION_PHYSIQUE: 1,
    RECEPTION_SYSTEME: 1,
    DISPONIBLE: 1,
  };
  return t[e] ?? 0;
}

let seqCde = 4500120;

/** Place la PDR à l'étape `etape` atteinte le `date`, en reconstituant l'historique. */
function placer(p: Pdr, etape: EtapePDR, date: ISODate, opts: Partial<Pdr> = {}): Pdr {
  const dates: Partial<Record<EtapePDR, ISODate>> = {};
  let d = date;
  for (let i = indexEtape(etape); i >= 0; i--) {
    const e = ETAPES_PDR[i];
    dates[e] = d;
    d = addDays(d, -ecartVers(e, p.delaiJours));
  }
  const r: Pdr = { ...p, etape, dates };
  if (indexEtape(etape) >= indexEtape('COMMANDE_CREEE')) r.numeroCommande = `CDE-${seqCde++}`;
  if (indexEtape(etape) >= indexEtape('COMMANDE_CONFIRMEE')) r.dateLivraisonPromise = addDays(dates.COMMANDE_CONFIRMEE!, Math.max(5, p.delaiJours - 8));
  if (indexEtape(etape) >= indexEtape('CONTENEUR')) r.conteneur = `MSKU${(7712300 + (seqCde % 997)).toString()}`;
  if (indexEtape(etape) >= indexEtape('BATEAU')) {
    r.bateau = ['MSC Abidjan', 'CMA CGM Kribi', 'Maersk Lomé', 'Grande Africa'][seqCde % 4];
    const eta = addDays(dates.TRANSIT ?? dates.BATEAU!, 33);
    r.etaInitiale = eta;
    r.eta = eta;
  }
  if (indexEtape(etape) >= indexEtape('RECEPTION_PHYSIQUE')) r.qteRecue = p.quantite;
  return { ...r, ...opts };
}

/* ------------------------------------------------------------------ */
/* Construction                                                        */
/* ------------------------------------------------------------------ */

export function creerDonneesDemo(T: ISODate): Donnees {
  seqCde = 4500120;
  const j = (n: number) => addDays(T, n);
  const sites: Site[] = [{ id: 'S-ABJ', code: 'ABJ', nom: "Usine d'Abidjan — Yopougon" }];
  const ateliers: Atelier[] = [
    { id: 'A-SR', siteId: 'S-ABJ', code: 'SR', nom: 'Soufflage & Remplissage PET' },
    { id: 'A-CD', siteId: 'S-ABJ', code: 'CD', nom: 'Conditionnement Verre & Canettes' },
    { id: 'A-UT', siteId: 'S-ABJ', code: 'UT', nom: 'Utilités' },
  ];
  const lignes: Ligne[] = LIGNES.map((l) => ({ id: l.id, atelierId: l.atelier, code: l.code, nom: l.nom }));
  const machines: Machine[] = [];
  const sousEnsembles: SousEnsemble[] = [];
  const organes: Organe[] = [];
  const catalogue = new Map<string, ArticlePDR>();
  const gammes: GammeVersion[] = [];

  for (const l of LIGNES) {
    const lignesGamme: GammeLigne[] = [];
    for (const [type, code] of l.machines) {
      const def = SE[type];
      const mId = `M-${code}`;
      machines.push({ id: mId, ligneId: l.id, code, nom: def.nom });
      def.ses.forEach((s, k) => {
        const seId = `${mId}-SE${k + 1}`;
        sousEnsembles.push({ id: seId, machineId: mId, code: `SE${k + 1}`, nom: s.nom });
        s.organes.forEach((o, n) => organes.push({ id: `${seId}-O${n + 1}`, sousEnsembleId: seId, code: `O${n + 1}`, nom: o }));
      });
      for (const p of def.pdr) {
        catalogue.set(p.ref, { ref: p.ref, designation: p.designation, fournisseur: p.fournisseur, delaiJours: p.delai, criticite: p.crit });
        lignesGamme.push({ machineId: mId, sousEnsemble: p.se, organe: p.organe, ref: p.ref, designation: p.designation, quantite: p.qte, criticite: p.crit, fournisseur: p.fournisseur, delaiJours: p.delai, commentaire: '' });
      }
    }
    gammes.push({ id: `G-${l.id}-1`, ligneId: l.id, version: 1, dateImport: j(-400), auteur: 'A. Kouassi', source: `Gamme_${l.code}_2025.xlsx`, statut: 'ACTIVE', lignes: lignesGamme });
  }
  // L03 : une v2 (ajout sonde, quantité modifiée) — la v1 reste consultable.
  const g3 = gammes.find((g) => g.ligneId === 'L03')!;
  g3.statut = 'REMPLACEE';
  gammes.push({
    id: 'G-L03-2',
    ligneId: 'L03',
    version: 2,
    dateImport: j(-150),
    auteur: 'A. Kouassi',
    source: 'Gamme_L03_2026_REX.xlsx',
    statut: 'ACTIVE',
    lignes: g3.lignes.map((x) => (x.ref === 'ART-305' ? { ...x, quantite: 80, commentaire: 'REX 2025 : quantité insuffisante' } : x)),
  });

  const utilisateurs: Utilisateur[] = [
    { id: 'u-bmc', nom: 'A. Kouassi', role: 'BMC', perimetre: { siteIds: [], atelierIds: [], ligneIds: [] }, actif: true },
    { id: 'u-maint', nom: 'S. Traoré', role: 'MAINTENANCE', perimetre: { siteIds: ['S-ABJ'], atelierIds: [], ligneIds: [] }, actif: true },
    { id: 'u-maint2', nom: 'R. Bamba', role: 'MAINTENANCE', perimetre: { siteIds: [], atelierIds: ['A-CD'], ligneIds: [] }, actif: true },
    { id: 'u-prod', nom: 'M. Koné', role: 'PRODUCTION', perimetre: { siteIds: ['S-ABJ'], atelierIds: [], ligneIds: [] }, actif: true },
    { id: 'u-achats', nom: 'F. Diallo', role: 'ACHATS', perimetre: { siteIds: ['S-ABJ'], atelierIds: [], ligneIds: [] }, actif: true },
    { id: 'u-transit', nom: "K. N'Guessan", role: 'TRANSIT', perimetre: { siteIds: ['S-ABJ'], atelierIds: [], ligneIds: [] }, actif: true },
    { id: 'u-magasin', nom: 'J. Yao', role: 'MAGASIN', perimetre: { siteIds: ['S-ABJ'], atelierIds: [], ligneIds: [] }, actif: true },
    { id: 'u-tech', nom: 'B. Ouattara', role: 'TECHNICIEN', perimetre: { siteIds: [], atelierIds: ['A-SR'], ligneIds: [] }, actif: true },
    { id: 'u-presta', nom: 'Équipe Sidel', role: 'PRESTATAIRE', perimetre: { siteIds: [], atelierIds: [], ligneIds: ['L02'] }, actif: true },
    { id: 'u-dir', nom: 'Direction usine', role: 'DIRECTION', perimetre: { siteIds: [], atelierIds: [], ligneIds: [] }, actif: true },
    { id: 'u-admin', nom: 'Administrateur', role: 'ADMIN', perimetre: { siteIds: [], atelierIds: [], ligneIds: [] }, actif: true },
  ];

  const parametres: Parametres = { ...PARAMETRES_DEFAUT };
  const revisions: Revision[] = [];
  const pdrs: Pdr[] = [];
  const interventions: Intervention[] = [];
  const travaux: Travail[] = [];
  const incidents: IncidentRedemarrage[] = [];
  const stabilisation: StabilisationJour[] = [];
  const rex: Rex[] = [];

  const gammeActive = (ligneId: ID) => gammes.find((g) => g.ligneId === ligneId && g.statut === 'ACTIVE')!;
  const pdrDe = (rev: Revision, gamme = gammeActive(rev.ligneId)): Pdr[] =>
    gamme.lignes.map((l, k) => ({
      id: `${rev.id}-P${String(k + 1).padStart(2, '0')}`,
      revisionId: rev.id,
      machineId: l.machineId,
      sousEnsemble: l.sousEnsemble,
      organe: l.organe,
      ref: l.ref,
      designation: l.designation,
      quantite: l.quantite,
      criticite: l.criticite,
      fournisseur: l.fournisseur,
      delaiJours: l.delaiJours,
      etape: 'IDENTIFIEE' as EtapePDR,
      modeTransport: /\(CI\)/.test(l.fournisseur) ? ('LOCAL' as const) : ('MARITIME' as const),
      dates: {},
      etaHistorique: [],
    }));

  const nouvelleRevision = (o: Partial<Revision> & Pick<Revision, 'id' | 'code' | 'ligneId' | 'responsableId' | 'dateInitiale' | 'datePrevue' | 'dureePrevueJours' | 'statut'>): Revision => ({
    annee: Number(o.datePrevue.slice(0, 4)),
    reports: [],
    commentaire: '',
    actionsPreparation: [],
    jalons: {},
    dureeRedemarragePrevueH: 24,
    dureeStabilisationPrevueJ: 4,
    cibleVitessePct: 90,
    cibleQualitePct: 98,
    gammeVersionId: gammeActive(o.ligneId).id,
    ...o,
  });

  const actionsFaites = (rev: Revision, faites: string[] | 'toutes', date?: ISODate) => {
    const gen = actionsPreparationAGenerer({ ...rev, actionsPreparation: [] }, parametres, addMonths(rev.datePrevue, -parametres.moisPreparation));
    rev.actionsPreparation = gen.map((a) => {
      const f = faites === 'toutes' || faites.includes(a.code);
      return f ? { ...a, faite: true, dateFaite: date ?? addDays(a.echeance, -2) } : a;
    });
  };

  /** Travaux types : consignation → chaîne principale (critique) + machines en parallèle → essais. */
  const planTravaux = (rev: Revision): Travail[] => {
    const ms = machines.filter((m) => m.ligneId === rev.ligneId);
    const id = (k: string) => `${rev.id}-T${k}`;
    const out: Travail[] = [];
    const base = { revisionId: rev.id, responsable: 'S. Traoré', statut: 'A_FAIRE' as const, pdrIds: [] as ID[], decalageMinJours: 0 };
    out.push({ ...base, id: id('01'), code: 'T01', description: 'Arrêt, vidange, consignation et nettoyage de la ligne', sousEnsemble: '', priorite: 'P1', criticite: 'A', dureePrevueJours: 1, dependances: [] });
    const [m0, ...autres] = ms;
    const main = SE[LIGNES.find((l) => l.id === rev.ligneId)!.machines[0][0]];
    out.push({ ...base, id: id('02'), code: 'T02', machineId: m0.id, sousEnsemble: main.ses[0].nom, description: `Démontage ${main.ses[0].nom.toLowerCase()} — ${m0.code}`, priorite: 'P1', criticite: 'A', dureePrevueJours: 2, dependances: [id('01')] });
    out.push({ ...base, id: id('03'), code: 'T03', machineId: m0.id, sousEnsemble: main.ses[0].nom, description: `Remplacement ${main.pdr[0].designation.toLowerCase()} — ${m0.code}`, priorite: 'P1', criticite: 'A', dureePrevueJours: 2, dependances: [id('02')] });
    out.push({ ...base, id: id('04'), code: 'T04', machineId: m0.id, sousEnsemble: main.ses.at(-1)!.nom, description: `Révision ${main.ses.at(-1)!.nom.toLowerCase()} — ${m0.code}`, priorite: 'P2', criticite: 'B', dureePrevueJours: 2, dependances: [id('01')] });
    out.push({ ...base, id: id('05'), code: 'T05', machineId: m0.id, sousEnsemble: main.ses[0].nom, description: `Remontage et réglages — ${m0.code}`, priorite: 'P1', criticite: 'A', dureePrevueJours: 2, dependances: [id('03'), id('04')] });
    const finales: ID[] = [id('05')];
    autres.forEach((m, k) => {
      const type = LIGNES.find((l) => l.id === rev.ligneId)!.machines[k + 1][0];
      const tid = id(String(6 + k).padStart(2, '0'));
      out.push({ ...base, id: tid, code: `T${String(6 + k).padStart(2, '0')}`, machineId: m.id, sousEnsemble: SE[type].ses[0].nom, description: `Révision ${SE[type].nom.toLowerCase()} — ${m.code}`, priorite: SE[type].pdr.some((p) => p.crit === 'A') ? 'P1' : 'P2', criticite: SE[type].pdr.some((p) => p.crit === 'A') ? 'A' : 'B', dureePrevueJours: type === 'REM' || type === 'PAS' ? 4 : 2, dependances: [id('01')] });
      finales.push(tid);
    });
    const n = String(6 + autres.length).padStart(2, '0');
    out.push({ ...base, id: id(n), code: `T${n}`, sousEnsemble: '', description: 'Essais à vide, déconsignation et remise à la Production', priorite: 'P1', criticite: 'A', dureePrevueJours: 1, dependances: finales });
    return out;
  };

  const lierPdr = (ts: Travail[], ps: Pdr[]) => {
    for (const t of ts) {
      if (!t.machineId) continue;
      const se = t.sousEnsemble;
      t.pdrIds = ps.filter((p) => p.machineId === t.machineId && (t.code === 'T02' || t.code === 'T05' ? false : t.code === 'T03' ? p.sousEnsemble === se : t.code === 'T04' ? p.sousEnsemble === se : true)).map((p) => p.id);
    }
  };

  /** Clôture complète d'une révision passée (pour historique / KPI). */
  const cloturer = (rev: Revision, debut: ISODate, retardFin: number, ps: Pdr[], ts: Travail[], opts: { redemH: number; stabJ: number; incidents?: Omit<IncidentRedemarrage, 'id' | 'revisionId'>[] }) => {
    const requise = addDays(rev.datePrevue, -parametres.margePdrJours);
    ps.forEach((p, k) => {
      const tard = k % 7 === 3 ? 4 : -((k * 5) % 23) - 1;
      const pl = placer(p, 'DISPONIBLE', addDays(requise, tard));
      if (pl.etaInitiale && k % 4 === 1) pl.etaInitiale = addDays(pl.etaInitiale, -5);
      if (k % 9 === 4) pl.ecartReception = 'Quantité livrée incomplète, complément reçu sous 48 h';
      Object.assign(p, pl);
    });
    let cur = debut;
    const fin = new Map<ID, ISODate>();
    for (const t of ts) {
      const dep = t.dependances.map((x) => fin.get(x)!).sort().at(-1);
      const d0 = dep ?? debut;
      const duree = t.dureePrevueJours + (t.code === 'T03' ? retardFin : 0);
      t.dateReelleDebut = d0;
      t.dateReelleFin = addDays(d0, duree);
      t.statut = 'TERMINE';
      fin.set(t.id, t.dateReelleFin);
      cur = [cur, t.dateReelleFin].sort().at(-1)!;
    }
    rev.dateReelleDebut = debut;
    rev.dateReelleFin = cur;
    const demarrage = `${cur}T06:00`;
    const conforme = addHeures(demarrage, opts.redemH);
    rev.jalons = {
      FIN_TRAVAUX: { prevu: `${addDays(rev.datePrevue, rev.dureePrevueJours)}T18:00`, reel: `${addDays(cur, -1)}T18:00` },
      AUTORISATION: { prevu: `${addDays(rev.datePrevue, rev.dureePrevueJours)}T05:00`, reel: `${cur}T05:00` },
      DEMARRAGE: { prevu: `${addDays(rev.datePrevue, rev.dureePrevueJours)}T06:00`, reel: demarrage },
      PREMIERE_PRODUCTION: { prevu: `${addDays(rev.datePrevue, rev.dureePrevueJours)}T12:00`, reel: addHeures(demarrage, Math.round(opts.redemH / 2)) },
      PREMIERE_CONFORME: { prevu: addHeures(`${addDays(rev.datePrevue, rev.dureePrevueJours)}T06:00`, rev.dureeRedemarragePrevueH), reel: conforme },
      FIN_STABILISATION: { prevu: `${addDays(conforme.slice(0, 10), rev.dureeStabilisationPrevueJ)}T18:00`, reel: `${addDays(conforme.slice(0, 10), opts.stabJ)}T18:00` },
    };
    for (let k = 0; k <= opts.stabJ; k++) {
      const v = Math.min(97, 78 + k * (16 / Math.max(1, opts.stabJ)));
      stabilisation.push({
        id: `${rev.id}-S${k}`,
        revisionId: rev.id,
        date: addDays(conforme.slice(0, 10), k),
        arrets: Math.max(0, 6 - k * 2),
        microArrets: Math.max(2, 30 - k * 6),
        defauts: Math.max(0, 9 - k * 2),
        vitessePct: Math.round(v),
        qualitePct: Math.round(Math.min(99.5, 95 + k * 1.2) * 10) / 10,
        interventions: Math.max(0, 4 - k),
        trsPct: Math.round(v * 0.92),
      });
    }
    (opts.incidents ?? []).forEach((i, k) => incidents.push({ ...i, id: `${rev.id}-I${k + 1}`, revisionId: rev.id }));
  };

  /* ---------------- L03 2025 : terminée, REX validé ---------------- */
  {
    const rev = nouvelleRevision({ id: 'R25-L03', code: 'REV-2025-L03', ligneId: 'L03', responsableId: 'u-maint2', dateInitiale: j(-330), datePrevue: j(-323), dureePrevueJours: 10, statut: 'REX', gammeVersionId: 'G-L03-1' });
    rev.reports.push({ version: 1, ancienneDate: j(-330), nouvelleDate: j(-323), motif: 'Pic de commandes clients (fin d\'année)', auteur: 'A. Kouassi', date: j(-380) });
    actionsFaites(rev, 'toutes');
    const ps = pdrDe(rev, gammes.find((g) => g.id === 'G-L03-1'));
    const ts = planTravaux(rev);
    lierPdr(ts, ps);
    cloturer(rev, j(-322), 2, ps, ts, {
      redemH: 30,
      stabJ: 6,
      incidents: [
        { machineId: 'M-PAS-003', date: j(-309), heure: '09:40', probleme: 'Température de pasteurisation instable', symptome: 'UP < 15 sur zone 3', cause: 'Sonde PT100 mal positionnée après remontage', actionCorrective: 'Repositionnement et étalonnage de la sonde', dureeSupH: 6, responsable: 'R. Bamba', impact: 'MOYEN', commentaire: '' },
      ],
    });
    pdrs.push(...ps);
    travaux.push(...ts);
    interventions.push(
      { id: 'I25-1', revisionId: rev.id, entreprise: 'Alfa Laval Services', technicien: 'P. Martin', specialite: 'Échangeurs à plaques', machineId: 'M-PAS-003', intervention: 'Rejointage échangeur pasteurisateur', datePrevue: j(-321), dateReelle: j(-321), dureeJours: 4, cout: 6_800_000, devise: 'FCFA', statut: 'TERMINEE', evaluation: evaluation([4, 4, 3, 4, 4, 5, 5, 3, 3], 'Bon travail, compte rendu tardif.', j(-305)) },
      { id: 'I25-2', revisionId: rev.id, entreprise: 'Krones Service Afrique', technicien: 'T. Becker', specialite: 'Remplissage verre', machineId: 'M-REM-003', intervention: 'Révision carrousel remplisseuse', datePrevue: j(-322), dateReelle: j(-321), dureeJours: 5, cout: 9_500_000, devise: 'FCFA', statut: 'TERMINEE', evaluation: evaluation([5, 5, 4, 5, 4, 4, 5, 4, 5], 'Très bon niveau, présent au redémarrage.', j(-305)) },
    );
    revisions.push(rev);
    rex.push({
      id: 'rex-R25-L03',
      revisionId: rev.id,
      ligneId: 'L03',
      dateCreation: j(-300),
      statut: 'VALIDE',
      constats: [],
      lecons: [
        { id: 'rex-R25-L03-1', domaine: 'PDR', lecon: 'Kit joints échangeur (ART-351) reçu 4 j après la date requise.', actionProchaineRevision: 'Commander ART-351 dès J-7 mois (délai réel 110 j).', responsable: 'ACHATS', integree: true },
        { id: 'rex-R25-L03-2', domaine: 'RECEPTION', lecon: 'Quantité de buses de rinçage insuffisante.', actionProchaineRevision: 'Passer la quantité gamme ART-305 de 50 à 80.', responsable: 'BMC', integree: true },
        { id: 'rex-R25-L03-3', domaine: 'REDEMARRAGE', lecon: 'Sonde PT100 mal positionnée : 6 h perdues au redémarrage.', actionProchaineRevision: 'Ajouter un contrôle des sondes à la check-list de remise en service.', responsable: 'MAINTENANCE', integree: false },
        { id: 'rex-R25-L03-4', domaine: 'TECHNICIENS', lecon: 'Le prestataire échangeur est reparti avant le redémarrage.', actionProchaineRevision: 'Prévoir le prestataire jusqu\'à la première production conforme.', responsable: 'MAINTENANCE', integree: false },
      ],
      pointsPositifs: 'Bonne coordination Transit / Magasin ; aucune PDR critique manquante au démarrage.',
      pointsNegatifs: 'Report tardif de 7 j ; redémarrage plus long que prévu (30 h pour 24 h).',
    });
  }

  /* ---------------- L01 2026 : terminée, REX à finaliser ---------------- */
  {
    const rev = nouvelleRevision({ id: 'R26-L01', code: 'REV-2026-L01', ligneId: 'L01', responsableId: 'u-maint', dateInitiale: j(-75), datePrevue: j(-75), dureePrevueJours: 9, statut: 'TERMINEE' });
    actionsFaites(rev, 'toutes');
    const ps = pdrDe(rev);
    const ts = planTravaux(rev);
    lierPdr(ts, ps);
    cloturer(rev, j(-75), 1, ps, ts, {
      redemH: 22,
      stabJ: 3,
    });
    pdrs.push(...ps);
    travaux.push(...ts);
    interventions.push(
      { id: 'I26-1', revisionId: rev.id, entreprise: 'Sidel Services', technicien: 'L. Dupont', specialite: 'Soufflage', machineId: 'M-SOU-001', intervention: 'Changement moules et révision roue', datePrevue: j(-74), dateReelle: j(-74), dureeJours: 6, cout: 12_400_000, devise: 'FCFA', statut: 'TERMINEE', evaluation: evaluation([5, 4, 4, 4, 5, 4, 5, 4, 4], 'Intervention maîtrisée.', j(-60)) },
      { id: 'I26-2', revisionId: rev.id, entreprise: 'Arol Afrique', technicien: 'G. Rossi', specialite: 'Bouchage', machineId: 'M-BOU-001', intervention: 'Révision tourelle de bouchage', datePrevue: j(-73), dateReelle: j(-72), dureeJours: 3, cout: 4_100_000, devise: 'FCFA', statut: 'TERMINEE' },
    );
    revisions.push(rev);
  }

  /* ---------------- L02 2026 : EN COURS ---------------- */
  {
    const rev = nouvelleRevision({ id: 'R26-L02', code: 'REV-2026-L02', ligneId: 'L02', responsableId: 'u-maint', dateInitiale: j(-20), datePrevue: j(-4), dureePrevueJours: 12, statut: 'EN_COURS', commentaire: 'Révision majeure souffleuse (12 000 h).' });
    rev.reports.push({ version: 1, ancienneDate: j(-20), nouvelleDate: j(-4), motif: 'Pic de production — demande commerciale', auteur: 'A. Kouassi', date: j(-60) });
    actionsFaites(rev, 'toutes');
    rev.dateReelleDebut = j(-4);
    const ps = pdrDe(rev);
    const requise = addDays(rev.datePrevue, -parametres.margePdrJours);
    ps.forEach((p, k) => Object.assign(p, placer(p, 'DISPONIBLE', addDays(requise, -((k * 3) % 11)))));
    // ART-458 (moules SOU-004) : encore en mer — cas du §27.
    const moule = ps.find((p) => p.ref === 'ART-458')!;
    Object.assign(moule, placer(moule, 'TRANSIT', j(-30)));
    moule.etaInitiale = j(-6);
    moule.eta = j(3);
    moule.etaHistorique = [
      { date: j(-12), ancienne: j(-6), nouvelle: j(-1), motif: 'Escale supplémentaire à Tema', auteur: "K. N'Guessan" },
      { date: j(-3), ancienne: j(-1), nouvelle: j(3), motif: 'Congestion portuaire Abidjan', auteur: "K. N'Guessan" },
    ];
    // Garniture pompe : arrivée usine, non réceptionnée depuis 3 j.
    const garn = ps.find((p) => p.ref === 'ART-530')!;
    Object.assign(garn, placer(garn, 'ARRIVEE_USINE', j(-3)));
    const ts = planTravaux(rev);
    lierPdr(ts, ps);
    const t = (c: string) => ts.find((x) => x.code === c)!;
    Object.assign(t('T01'), { statut: 'TERMINE', dateReelleDebut: j(-4), dateReelleFin: j(-3) });
    Object.assign(t('T02'), { statut: 'TERMINE', dateReelleDebut: j(-3), dateReelleFin: j(-1) });
    Object.assign(t('T03'), { statut: 'BLOQUE', motifBlocage: 'Moules ART-458 non disponibles (en mer, ETA décalée).' });
    Object.assign(t('T04'), { statut: 'TERMINE', dateReelleDebut: j(-3), dateReelleFin: j(-1) });
    Object.assign(t('T06'), { statut: 'EN_COURS', dateReelleDebut: j(-3), responsable: 'B. Ouattara' });
    Object.assign(t('T07'), { statut: 'TERMINE', dateReelleDebut: j(-3), dateReelleFin: j(-1) });
    Object.assign(t('T08'), { statut: 'TERMINE', dateReelleDebut: j(-3), dateReelleFin: j(-1) });
    Object.assign(t('T09'), { statut: 'EN_COURS', dateReelleDebut: j(-3) });
    Object.assign(t('T10'), { statut: 'TERMINE', dateReelleDebut: j(-3), dateReelleFin: j(-1) });
    pdrs.push(...ps);
    travaux.push(...ts);
    interventions.push(
      { id: 'I26-3', revisionId: rev.id, entreprise: 'Sidel Services', technicien: 'L. Dupont', specialite: 'Soufflage', machineId: 'M-SOU-004', intervention: 'Changement moules, révision roue de soufflage', datePrevue: j(-3), dateReelle: j(-3), dureeJours: 7, cout: 13_200_000, devise: 'FCFA', statut: 'SUR_SITE' },
      { id: 'I26-4', revisionId: rev.id, entreprise: 'Krones Service Afrique', technicien: 'T. Becker', specialite: 'Remplissage PET', machineId: 'M-REM-002', intervention: 'Révision carrousel et vannes', datePrevue: j(-3), dateReelle: j(-3), dureeJours: 5, cout: 9_800_000, devise: 'FCFA', statut: 'SUR_SITE' },
    );
    revisions.push(rev);
  }

  /* ---------------- L03 2026 : PDR en transit ---------------- */
  {
    const rev = nouvelleRevision({ id: 'R26-L03', code: 'REV-2026-L03', ligneId: 'L03', responsableId: 'u-maint2', dateInitiale: j(28), datePrevue: j(42), dureePrevueJours: 10, statut: 'PDR_TRANSIT', commentaire: 'Intègre le REX 2025 (sondes, buses).' });
    rev.reports.push({ version: 1, ancienneDate: j(28), nouvelleDate: j(42), motif: 'Retard fournisseur Alfa Laval sur kit joints échangeur', auteur: 'A. Kouassi', date: j(-10) });
    actionsFaites(rev, 'toutes');
    const ps = pdrDe(rev);
    const d = (ref: string) => ps.find((p) => p.ref === ref)!;
    ps.forEach((p, k) => Object.assign(p, placer(p, 'DISPONIBLE', j(-5 - k))));
    Object.assign(d('ART-351'), placer(d('ART-351'), 'TRANSIT', j(-12)));
    d('ART-351').etaInitiale = j(14);
    d('ART-351').eta = j(22);
    d('ART-351').etaHistorique = [{ date: j(-2), ancienne: j(14), nouvelle: j(22), motif: 'Transbordement à Algésiras', auteur: "K. N'Guessan" }];
    Object.assign(d('ART-301'), placer(d('ART-301'), 'ARRIVEE_ABIDJAN', j(-9)));
    Object.assign(d('ART-512'), placer(d('ART-512'), 'COMMANDE_CONFIRMEE', j(-95), { modeTransport: 'AERIEN' }));
    d('ART-512').dateLivraisonPromise = j(-3);
    Object.assign(d('ART-305'), placer(d('ART-305'), 'COMMANDE_ENVOYEE', j(-12)));
    d('ART-305').dateLivraisonPromise = undefined;
    Object.assign(d('ART-356'), placer(d('ART-356'), 'ARRIVEE_USINE', j(-4)));
    Object.assign(d('ART-601'), placer(d('ART-601'), 'RECEPTION_PHYSIQUE', j(-2), { nonConforme: true, expertiseRequise: true, ecartReception: 'Têtes livrées en version Ø28 au lieu de Ø26' }));
    Object.assign(d('ART-902'), placer(d('ART-902'), 'DISPO_FOURNISSEUR', j(-14)));
    Object.assign(d('ART-910'), placer(d('ART-910'), 'BATEAU', j(-20)));
    pdrs.push(...ps);
    const ts = planTravaux(rev);
    lierPdr(ts, ps);
    travaux.push(...ts);
    interventions.push(
      { id: 'I26-5', revisionId: rev.id, entreprise: 'Alfa Laval Services', technicien: 'P. Martin', specialite: 'Échangeurs à plaques', machineId: 'M-PAS-003', intervention: 'Rejointage échangeur pasteurisateur', datePrevue: j(30), dureeJours: 4, cout: 7_100_000, devise: 'FCFA', statut: 'CONFIRME' },
      { id: 'I26-6', revisionId: rev.id, entreprise: 'Krones Service Afrique', technicien: 'À désigner', specialite: 'Remplissage verre', machineId: 'M-REM-003', intervention: 'Révision carrousel remplisseuse', datePrevue: j(42), dureeJours: 5, cout: 9_900_000, devise: 'FCFA', statut: 'PRESSENTI' },
      { id: 'I26-7', revisionId: rev.id, entreprise: 'KHS Afrique', technicien: 'M. Weber', specialite: 'Laveuses', machineId: 'M-LAV-003', intervention: 'Révision pompe et rampes de lavage', datePrevue: j(43), dureeJours: 3, cout: 5_200_000, devise: 'FCFA', statut: 'CONFIRME' },
    );
    revisions.push(rev);
  }

  /* ---------------- L04 2027 : préparation ---------------- */
  {
    const rev = nouvelleRevision({ id: 'R27-L04', code: 'REV-2027-L04', ligneId: 'L04', responsableId: 'u-maint2', dateInitiale: j(150), datePrevue: j(150), dureePrevueJours: 8, statut: 'APPROVISIONNEMENT' });
    actionsFaites(rev, ['GAMME', 'REX', 'PDR', 'QTE', 'FOUR'], undefined);
    const ps = pdrDe(rev);
    const lanc = addMonths(rev.datePrevue, -7);
    ps.forEach((p) => Object.assign(p, placer(p, 'BESOIN_VALIDE', addDays(lanc, 18))));
    const d = (ref: string) => ps.find((p) => p.ref === ref)!;
    Object.assign(d('ART-401'), placer(d('ART-401'), 'COMMANDE_A_CREER', addDays(lanc, 20), { delaiJours: 140 }));
    Object.assign(d('ART-403'), placer(d('ART-403'), 'COMMANDE_CONFIRMEE', j(-10)));
    Object.assign(d('ART-512'), placer(d('ART-512'), 'COMMANDE_CONFIRMEE', j(-20)));
    Object.assign(d('ART-351'), placer(d('ART-351'), 'COMMANDE_CONFIRMEE', j(-30)));
    Object.assign(d('ART-421'), { enStock: true });
    Object.assign(d('ART-801'), placer(d('ART-801'), 'COMMANDE_CREEE', j(-2)));
    pdrs.push(...ps);
    interventions.push({ id: 'I27-1', revisionId: rev.id, entreprise: 'Ferrum Service', technicien: 'À désigner', specialite: 'Sertissage', machineId: 'M-SER-004', intervention: 'Réglage et changement molettes', datePrevue: j(151), dureeJours: 4, cout: 8_000_000, devise: 'FCFA', statut: 'A_PLANIFIER' });
    revisions.push(rev);
  }

  /* ---------------- Planifiées ---------------- */
  revisions.push(nouvelleRevision({ id: 'R27-UT1', code: 'REV-2027-UT1', ligneId: 'UT1', responsableId: 'u-maint', dateInitiale: j(250), datePrevue: j(260), dureePrevueJours: 5, statut: 'PLANIFIEE', dureeRedemarragePrevueH: 6, dureeStabilisationPrevueJ: 1 }));
  revisions.at(-1)!.reports.push({ version: 1, ancienneDate: j(250), nouvelleDate: j(260), motif: 'Alignement sur l\'arrêt général électrique', auteur: 'A. Kouassi', date: j(-3) });
  revisions.push(nouvelleRevision({ id: 'R27-L01', code: 'REV-2027-L01', ligneId: 'L01', responsableId: 'u-maint', dateInitiale: j(290), datePrevue: j(290), dureePrevueJours: 9, statut: 'PLANIFIEE' }));

  return {
    version: 1,
    sites,
    ateliers,
    lignes,
    machines,
    sousEnsembles,
    organes,
    catalogue: [...catalogue.values()],
    utilisateurs,
    revisions,
    gammes,
    imports: gammes.map((g) => ({ id: `IMP-${g.id}`, date: g.dateImport, auteur: g.auteur, fichier: g.source, ligneId: g.ligneId, gammeVersionId: g.id, nbLignes: g.lignes.length, nbErreurs: 0, nbAvertissements: 0, resultat: 'IMPORTE' as const, resume: `Version ${g.version} — ${g.lignes.length} lignes` })),
    pdrs,
    interventions,
    travaux,
    incidents,
    stabilisation,
    rex,
    notifications: [],
    audit: [
      { id: 'AUD-0', horodatage: `${T}T07:00`, auteur: 'Système', role: 'ADMIN', entite: 'Données', entiteId: '-', action: 'INITIALISATION', detail: 'Chargement du jeu de démonstration' },
    ],
    parametres,
  };
}

function addHeures(dt: string, h: number): string {
  const d = new Date(dt + 'Z');
  d.setUTCMinutes(d.getUTCMinutes() + Math.round(h * 60));
  return d.toISOString().slice(0, 16);
}

function evaluation(n: number[], commentaire: string, date: ISODate) {
  const k = ['competence', 'qualite', 'respectPlanning', 'diagnostic', 'efficacite', 'comportement', 'respectConsignes', 'compteRendu', 'redemarrage'] as const;
  return { notes: Object.fromEntries(k.map((c, i) => [c, n[i]])) as Record<(typeof k)[number], number>, commentaire, auteur: 'S. Traoré', date };
}

