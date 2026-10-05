import { addDays, fmtCourt } from './dates';
import { avancerPdr } from './pdr';
import { ETAPE } from './referentiel';
import type { EtapePDR, ISODate, ModeTransport, Pdr, Role } from './types';

/**
 * Actions possibles sur une PDR, par rôle responsable (§11-13, §25).
 * Chaque action produit une nouvelle PDR + un libellé d'audit.
 */

export interface ChampAction {
  cle: string;
  label: string;
  type: 'date' | 'text' | 'number' | 'select' | 'bool' | 'textarea';
  req?: boolean;
  options?: { v: string; l: string }[];
  defaut?: (p: Pdr, today: ISODate) => string;
}

export interface ActionPdr {
  id: string;
  libelle: string;
  role: Role;
  principale?: boolean;
  champs: ChampAction[];
  applicable: (p: Pdr) => boolean;
  appliquer: (p: Pdr, v: Record<string, string>, today: ISODate, auteur: string) => { pdr: Pdr; detail: string };
}

const dateDuJour: ChampAction = { cle: 'date', label: 'Date', type: 'date', req: true, defaut: (_p, t) => t };
const etape = (...e: EtapePDR[]) => (p: Pdr) => !p.nonConforme && !p.enStock && e.includes(p.etape);
const av = (p: Pdr, v: Record<string, string>, cible?: EtapePDR) => avancerPdr(p, v.date, cible);
const MODES: { v: ModeTransport; l: string }[] = [
  { v: 'MARITIME', l: 'Maritime' },
  { v: 'AERIEN', l: 'Aérien' },
  { v: 'LOCAL', l: 'Local (sans fret)' },
];

export const ACTIONS_PDR: ActionPdr[] = [
  /* ---------------- BMC ---------------- */
  {
    id: 'valider',
    libelle: 'Valider le besoin',
    role: 'BMC',
    principale: true,
    champs: [dateDuJour],
    applicable: etape('IDENTIFIEE'),
    appliquer: (p, v) => ({ pdr: av(p, v, 'COMMANDE_A_CREER'), detail: 'Besoin validé, transmis aux Achats (commande à créer).' }),
  },
  {
    id: 'reintegrer',
    libelle: 'Réintégrer dans la gamme',
    role: 'BMC',
    champs: [],
    applicable: (p) => !!p.horsGamme,
    appliquer: (p) => ({ pdr: { ...p, horsGamme: false }, detail: 'PDR réintégrée dans le besoin de la révision.' }),
  },
  /* ---------------- ACHATS ---------------- */
  {
    id: 'aCreer',
    libelle: 'Passer en « commande à créer »',
    role: 'ACHATS',
    principale: true,
    champs: [dateDuJour],
    applicable: etape('BESOIN_VALIDE'),
    appliquer: (p, v) => ({ pdr: av(p, v), detail: 'Commande à créer.' }),
  },
  {
    id: 'creer',
    libelle: 'Créer la commande',
    role: 'ACHATS',
    principale: true,
    champs: [
      { cle: 'numero', label: 'N° de commande', type: 'text', req: true },
      { cle: 'fournisseur', label: 'Fournisseur', type: 'text', req: true, defaut: (p) => p.fournisseur },
      dateDuJour,
    ],
    applicable: etape('BESOIN_VALIDE', 'COMMANDE_A_CREER'),
    appliquer: (p, v) => ({ pdr: { ...av(p, v, 'COMMANDE_CREEE'), numeroCommande: v.numero, fournisseur: v.fournisseur }, detail: `Commande ${v.numero} créée (${v.fournisseur}).` }),
  },
  {
    id: 'envoyer',
    libelle: 'Envoyer au fournisseur',
    role: 'ACHATS',
    principale: true,
    champs: [dateDuJour],
    applicable: etape('COMMANDE_CREEE'),
    appliquer: (p, v) => ({ pdr: av(p, v), detail: `Commande ${p.numeroCommande ?? ''} envoyée à ${p.fournisseur}.` }),
  },
  {
    id: 'confirmer',
    libelle: 'Enregistrer la confirmation fournisseur',
    role: 'ACHATS',
    principale: true,
    champs: [dateDuJour, { cle: 'promise', label: 'Date de mise à disposition promise', type: 'date', req: true, defaut: (p, t) => addDays(t, Math.max(5, p.delaiJours - 8)) }],
    applicable: etape('COMMANDE_ENVOYEE'),
    appliquer: (p, v) => ({ pdr: { ...av(p, v), dateLivraisonPromise: v.promise }, detail: `Commande confirmée, disponibilité promise le ${fmtCourt(v.promise)}.` }),
  },
  {
    id: 'promesse',
    libelle: 'Mettre à jour la date promise',
    role: 'ACHATS',
    champs: [{ cle: 'promise', label: 'Nouvelle date promise', type: 'date', req: true, defaut: (p, t) => p.dateLivraisonPromise ?? t }, { cle: 'motif', label: 'Motif', type: 'text', req: true }],
    applicable: etape('COMMANDE_CONFIRMEE'),
    appliquer: (p, v) => ({ pdr: { ...p, dateLivraisonPromise: v.promise }, detail: `Date promise ${fmtCourt(p.dateLivraisonPromise)} → ${fmtCourt(v.promise)} : ${v.motif}` }),
  },
  {
    id: 'relance',
    libelle: 'Tracer une relance fournisseur',
    role: 'ACHATS',
    champs: [{ cle: 'texte', label: 'Compte rendu de relance', type: 'textarea', req: true }],
    applicable: etape('COMMANDE_ENVOYEE', 'COMMANDE_CONFIRMEE'),
    appliquer: (p, v, today) => ({ pdr: { ...p, commentaire: `${today} relance : ${v.texte}${p.commentaire ? `\n${p.commentaire}` : ''}` }, detail: `Relance fournisseur : ${v.texte}` }),
  },
  {
    id: 'dispoFour',
    libelle: 'PDR disponible chez le fournisseur',
    role: 'ACHATS',
    principale: true,
    champs: [dateDuJour],
    applicable: etape('COMMANDE_CONFIRMEE'),
    appliquer: (p, v) => ({ pdr: av(p, v), detail: 'PDR disponible fournisseur : prise en charge par le Transit.' }),
  },
  {
    id: 'fournisseur',
    libelle: 'Mettre à jour fournisseur / délai',
    role: 'ACHATS',
    champs: [
      { cle: 'fournisseur', label: 'Fournisseur', type: 'text', req: true, defaut: (p) => p.fournisseur },
      { cle: 'delai', label: "Délai d'approvisionnement (j)", type: 'number', req: true, defaut: (p) => String(p.delaiJours) },
    ],
    applicable: (p) => !p.enStock && ['BESOIN_VALIDE', 'COMMANDE_A_CREER', 'COMMANDE_CREEE', 'COMMANDE_ENVOYEE', 'COMMANDE_CONFIRMEE'].includes(p.etape),
    appliquer: (p, v) => ({ pdr: { ...p, fournisseur: v.fournisseur, delaiJours: Number(v.delai) }, detail: `Fournisseur ${v.fournisseur}, délai ${v.delai} j.` }),
  },
  {
    id: 'recommander',
    libelle: 'Nouvelle commande (remplacement non-conformité)',
    role: 'ACHATS',
    principale: true,
    champs: [
      { cle: 'numero', label: 'N° de commande', type: 'text', req: true },
      { cle: 'promise', label: 'Date promise', type: 'date', req: true, defaut: (p, t) => addDays(t, p.delaiJours) },
      { cle: 'mode', label: 'Mode de transport', type: 'select', options: MODES, defaut: () => 'AERIEN' },
      dateDuJour,
    ],
    applicable: (p) => !!p.nonConforme && !!p.nouvelleCommandeRequise,
    appliquer: (p, v) => ({
      pdr: {
        ...p,
        nonConforme: false,
        nouvelleCommandeRequise: false,
        expertiseRequise: false,
        etape: 'COMMANDE_CONFIRMEE',
        numeroCommande: v.numero,
        dateLivraisonPromise: v.promise,
        modeTransport: v.mode as ModeTransport,
        conteneur: undefined,
        bateau: undefined,
        eta: undefined,
        etaInitiale: undefined,
        cyclesPrecedents: [...(p.cyclesPrecedents ?? []), { date: v.date, motif: p.ecartReception ?? 'Non-conformité', numeroCommande: p.numeroCommande, dates: p.dates }],
        dates: { ...p.dates, COMMANDE_CREEE: v.date, COMMANDE_ENVOYEE: v.date, COMMANDE_CONFIRMEE: v.date },
      },
      detail: `Nouvelle commande ${v.numero} (remplacement), promise ${fmtCourt(v.promise)} — cycle précédent archivé.`,
    }),
  },
  /* ---------------- TRANSIT ---------------- */
  {
    id: 'mode',
    libelle: 'Choisir le mode de transport',
    role: 'TRANSIT',
    champs: [{ cle: 'mode', label: 'Mode', type: 'select', req: true, options: MODES, defaut: (p) => p.modeTransport ?? 'MARITIME' }],
    applicable: (p) => !p.enStock && ['COMMANDE_CONFIRMEE', 'DISPO_FOURNISSEUR', 'PRETE_EXPEDITION'].includes(p.etape),
    appliquer: (p, v) => ({ pdr: { ...p, modeTransport: v.mode as ModeTransport }, detail: `Mode de transport : ${MODES.find((m) => m.v === v.mode)?.l}.` }),
  },
  {
    id: 'preparer',
    libelle: "Préparer l'expédition",
    role: 'TRANSIT',
    principale: true,
    champs: [dateDuJour],
    applicable: etape('DISPO_FOURNISSEUR'),
    appliquer: (p, v) => ({ pdr: av(p, v), detail: 'PDR prête à l\'expédition.' }),
  },
  {
    id: 'conteneur',
    libelle: 'Mise en conteneur / colisage',
    role: 'TRANSIT',
    principale: true,
    champs: [{ cle: 'conteneur', label: 'N° conteneur / LTA', type: 'text', req: true }, dateDuJour],
    applicable: etape('PRETE_EXPEDITION'),
    appliquer: (p, v) => ({ pdr: { ...av(p, v), conteneur: v.conteneur }, detail: `Mise en conteneur ${v.conteneur} le ${fmtCourt(v.date)}.` }),
  },
  {
    id: 'bateau',
    libelle: 'Embarquement (navire / vol)',
    role: 'TRANSIT',
    principale: true,
    champs: [
      { cle: 'bateau', label: 'Navire / vol', type: 'text', req: true },
      { cle: 'eta', label: 'ETA Abidjan', type: 'date', req: true, defaut: (p, t) => addDays(t, p.modeTransport === 'AERIEN' ? 5 : 33) },
      dateDuJour,
    ],
    applicable: etape('CONTENEUR'),
    appliquer: (p, v) => ({ pdr: { ...av(p, v), bateau: v.bateau, eta: v.eta, etaInitiale: p.etaInitiale ?? v.eta }, detail: `Embarquée sur ${v.bateau}, ETA ${fmtCourt(v.eta)}.` }),
  },
  {
    id: 'depart',
    libelle: 'Départ confirmé (transit)',
    role: 'TRANSIT',
    principale: true,
    champs: [dateDuJour],
    applicable: etape('BATEAU'),
    appliquer: (p, v) => ({ pdr: av(p, v), detail: `Départ confirmé (${p.bateau ?? ''}).` }),
  },
  {
    id: 'eta',
    libelle: "Modifier l'ETA",
    role: 'TRANSIT',
    champs: [{ cle: 'eta', label: 'Nouvelle ETA', type: 'date', req: true, defaut: (p, t) => p.eta ?? t }, { cle: 'motif', label: 'Motif', type: 'text', req: true }],
    applicable: etape('CONTENEUR', 'BATEAU', 'TRANSIT'),
    appliquer: (p, v, today, auteur) => ({
      pdr: { ...p, eta: v.eta, etaInitiale: p.etaInitiale ?? p.eta ?? v.eta, etaHistorique: [...p.etaHistorique, { date: today, ancienne: p.eta, nouvelle: v.eta, motif: v.motif, auteur }] },
      detail: `ETA ${fmtCourt(p.eta)} → ${fmtCourt(v.eta)} : ${v.motif}`,
    }),
  },
  {
    id: 'abidjan',
    libelle: 'Arrivée Abidjan',
    role: 'TRANSIT',
    principale: true,
    champs: [dateDuJour],
    applicable: etape('TRANSIT', 'BATEAU'),
    appliquer: (p, v) => ({ pdr: av(p, v, 'ARRIVEE_ABIDJAN'), detail: `Arrivée à Abidjan le ${fmtCourt(v.date)}${p.eta ? ` (ETA ${fmtCourt(p.eta)})` : ''}.` }),
  },
  {
    id: 'usine',
    libelle: "Livraison à l'usine",
    role: 'TRANSIT',
    principale: true,
    champs: [dateDuJour],
    applicable: etape('ARRIVEE_ABIDJAN'),
    appliquer: (p, v) => ({ pdr: av(p, v), detail: 'Arrivée usine : prise en charge par le Magasin.' }),
  },
  /* ---------------- MAGASIN ---------------- */
  {
    id: 'recPhys',
    libelle: 'Réception physique',
    role: 'MAGASIN',
    principale: true,
    champs: [
      { cle: 'qte', label: 'Quantité reçue', type: 'number', req: true, defaut: (p) => String(p.quantite) },
      { cle: 'conforme', label: 'Référence et état conformes', type: 'select', req: true, options: [{ v: 'oui', l: 'Oui' }, { v: 'non', l: 'Non — écart' }], defaut: () => 'oui' },
      { cle: 'ecart', label: "Description de l'écart", type: 'text' },
      dateDuJour,
    ],
    applicable: etape('ARRIVEE_USINE'),
    appliquer: (p, v) => {
      const qte = Number(v.qte);
      const ecartQte = qte < p.quantite ? `Quantité reçue ${qte}/${p.quantite}` : '';
      const nonConforme = v.conforme === 'non';
      const ecart = [ecartQte, v.ecart].filter(Boolean).join(' — ');
      return {
        pdr: { ...av(p, v), qteRecue: qte, nonConforme, expertiseRequise: nonConforme ? true : undefined, ecartReception: ecart || undefined },
        detail: `Réception physique : ${qte}/${p.quantite}${nonConforme ? ` — NON CONFORME (${ecart || 'écart'})` : ' — conforme'}${ecartQte && !nonConforme ? ` (${ecartQte})` : ''}.`,
      };
    },
  },
  {
    id: 'recSys',
    libelle: 'Réception système',
    role: 'MAGASIN',
    principale: true,
    champs: [dateDuJour],
    applicable: etape('RECEPTION_PHYSIQUE'),
    appliquer: (p, v) => ({ pdr: av(p, v), detail: 'Réception enregistrée dans le système.' }),
  },
  {
    id: 'dispo',
    libelle: 'Mettre à disposition pour la révision',
    role: 'MAGASIN',
    principale: true,
    champs: [dateDuJour],
    applicable: (p) => (!p.nonConforme && p.etape === 'RECEPTION_SYSTEME') || (!!p.enStock && p.etape !== 'DISPONIBLE'),
    appliquer: (p, v) => ({ pdr: av(p, v, 'DISPONIBLE'), detail: p.enStock ? 'PDR réservée sur stock et mise à disposition.' : 'PDR disponible pour la révision.' }),
  },
  {
    id: 'stock',
    libelle: 'Déclarer disponible en stock',
    role: 'MAGASIN',
    champs: [{ cle: 'qte', label: 'Quantité en stock', type: 'number', req: true, defaut: (p) => String(p.quantite) }],
    applicable: (p) => !p.enStock && ['IDENTIFIEE', 'BESOIN_VALIDE', 'COMMANDE_A_CREER'].includes(p.etape),
    appliquer: (p, v) => ({ pdr: { ...p, enStock: true, qteRecue: Number(v.qte) }, detail: `Couvert par le stock (${v.qte}) : pas de commande.` }),
  },
  {
    id: 'nonConforme',
    libelle: 'Déclarer une non-conformité',
    role: 'MAGASIN',
    champs: [{ cle: 'ecart', label: "Description de l'écart", type: 'text', req: true }],
    applicable: (p) => !p.nonConforme && ['RECEPTION_PHYSIQUE', 'RECEPTION_SYSTEME', 'DISPONIBLE'].includes(p.etape),
    appliquer: (p, v) => ({ pdr: { ...p, nonConforme: true, expertiseRequise: true, ecartReception: v.ecart }, detail: `Non-conformité déclarée : ${v.ecart}. Expertise Maintenance demandée.` }),
  },
  {
    id: 'litige',
    libelle: 'Écart résolu avec le fournisseur',
    role: 'MAGASIN',
    principale: true,
    champs: [{ cle: 'commentaire', label: 'Solution', type: 'text', req: true }],
    applicable: (p) => !!p.nonConforme && !p.expertiseRequise && !p.nouvelleCommandeRequise,
    appliquer: (p, v) => ({ pdr: { ...p, nonConforme: false, commentaire: v.commentaire }, detail: `Écart résolu : ${v.commentaire}.` }),
  },
  /* ---------------- MAINTENANCE ---------------- */
  {
    id: 'expertise',
    libelle: "Résultat d'expertise technique",
    role: 'MAINTENANCE',
    principale: true,
    champs: [
      { cle: 'decision', label: 'Décision', type: 'select', req: true, options: [{ v: 'ok', l: 'Utilisable en l\'état (dérogation)' }, { v: 'remplacer', l: 'À remplacer — nouvelle commande' }, { v: 'litige', l: 'Litige fournisseur — Magasin' }] },
      { cle: 'commentaire', label: 'Commentaire', type: 'text', req: true },
    ],
    applicable: (p) => !!p.nonConforme && !!p.expertiseRequise,
    appliquer: (p, v) => {
      if (v.decision === 'ok') return { pdr: { ...p, nonConforme: false, expertiseRequise: false, commentaire: v.commentaire }, detail: `Expertise : utilisable (${v.commentaire}).` };
      if (v.decision === 'remplacer') return { pdr: { ...p, expertiseRequise: false, nouvelleCommandeRequise: true, commentaire: v.commentaire }, detail: `Expertise : à remplacer, nouvelle commande demandée aux Achats (${v.commentaire}).` };
      return { pdr: { ...p, expertiseRequise: false, commentaire: v.commentaire }, detail: `Expertise : litige fournisseur, traitement Magasin (${v.commentaire}).` };
    },
  },
];

/** Actions applicables pour un rôle donné (ADMIN : toutes). */
export function actionsPour(p: Pdr, role: Role): ActionPdr[] {
  return ACTIONS_PDR.filter((a) => a.applicable(p) && (role === 'ADMIN' || a.role === role));
}

export function actionsAttendues(p: Pdr): ActionPdr[] {
  return ACTIONS_PDR.filter((a) => a.applicable(p) && a.principale);
}

export function libelleEtape(e: EtapePDR): string {
  return ETAPE[e].libelle;
}
