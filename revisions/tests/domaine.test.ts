import { describe, expect, it } from 'vitest';
import { creerDonneesDemo } from '../src/data/seed';
import { ACTIONS_PDR, actionsPour } from '../src/domain/actionsPdr';
import { analyserRevision } from '../src/domain/analyse';
import { calculerCpm } from '../src/domain/cpm';
import { addDays, addMonths, diffDays } from '../src/domain/dates';
import { analyserTableau, comparerGammes, nouvelleVersion, synchroniserPdr } from '../src/domain/importGamme';
import { construireNotifications, concerne } from '../src/domain/notifications';
import { avancerPdr, dateDispoEstimee, responsablePdr } from '../src/domain/pdr';
import { ligneVisible, peutModifier } from '../src/domain/permissions';
import { appliquerReferentiel } from '../src/domain/importReferentiel';
import { creerBaseVide } from '../src/data/seed';
import { actionsPreparationAGenerer, appliquerReport, derive } from '../src/domain/planning';
import { RACI } from '../src/domain/referentiel';
import { controleTechnicienPdr, noteGlobale } from '../src/domain/techniciens';
import { TRANSITIONS } from '../src/domain/workflow';
import type { Pdr } from '../src/domain/types';

const T = '2026-10-05';
const d = creerDonneesDemo(T);
const P = d.parametres;

describe('dates', () => {
  it('additionne jours et mois', () => {
    expect(addDays('2026-01-30', 3)).toBe('2026-02-02');
    expect(addMonths('2026-08-31', -7)).toBe('2026-01-31');
    expect(addMonths('2026-03-31', -1)).toBe('2026-02-28');
    expect(diffDays('2026-01-01', '2026-03-01')).toBe(59);
  });
});

describe('reports (§6)', () => {
  const r = d.revisions.find((x) => x.id === 'R27-L01')!;
  it('conserve la date initiale et historise chaque version', () => {
    const r1 = appliquerReport(r, addDays(r.datePrevue, 10), 'Pic de production', 'BMC', T);
    const r2 = appliquerReport(r1, addDays(r1.datePrevue, 5), 'Prestataire indisponible', 'BMC', T);
    expect(r2.dateInitiale).toBe(r.dateInitiale);
    expect(r2.reports.map((x) => x.version)).toEqual([1, 2]);
    expect(r2.reports[1].ancienneDate).toBe(r1.datePrevue);
    const dv = derive(r2);
    expect(dv.nbReports).toBe(2);
    expect(dv.derivePlanning).toBe(15);
    expect(dv.decalageCumule).toBe(15);
  });
  it('exige un motif', () => {
    expect(() => appliquerReport(r, addDays(r.datePrevue, 1), ' ', 'BMC', T)).toThrow();
  });
});

describe('préparation J-7 mois (§7)', () => {
  it('ne génère rien avant J-7 mois, génère les 9 actions ensuite', () => {
    const r = { ...d.revisions.find((x) => x.id === 'R27-L01')!, actionsPreparation: [] };
    expect(actionsPreparationAGenerer(r, P, T)).toHaveLength(0);
    const apres = addMonths(r.datePrevue, -6);
    const a = actionsPreparationAGenerer(r, P, apres);
    expect(a).toHaveLength(9);
    expect(new Set(a.map((x) => x.responsable)).size).toBeGreaterThan(2);
  });
});

describe('cycle PDR et responsables (§10, §25)', () => {
  const base: Pdr = { id: 'p', revisionId: 'r', machineId: 'm', sousEnsemble: '', organe: '', ref: 'X', designation: 'X', quantite: 1, criticite: 'A', fournisseur: 'F', delaiJours: 30, etape: 'IDENTIFIEE', dates: {}, etaHistorique: [] };
  it('attribue un seul responsable par étape bloquante', () => {
    expect(responsablePdr(base)).toBe('BMC');
    expect(responsablePdr({ ...base, etape: 'COMMANDE_ENVOYEE' })).toBe('ACHATS');
    expect(responsablePdr({ ...base, etape: 'PRETE_EXPEDITION' })).toBe('TRANSIT');
    expect(responsablePdr({ ...base, etape: 'ARRIVEE_ABIDJAN' })).toBe('TRANSIT');
    expect(responsablePdr({ ...base, etape: 'ARRIVEE_USINE' })).toBe('MAGASIN');
    expect(responsablePdr({ ...base, etape: 'RECEPTION_PHYSIQUE', nonConforme: true, expertiseRequise: true })).toBe('MAINTENANCE');
    expect(responsablePdr({ ...base, etape: 'RECEPTION_PHYSIQUE', nonConforme: true, nouvelleCommandeRequise: true })).toBe('ACHATS');
    expect(responsablePdr({ ...base, etape: 'DISPONIBLE' })).toBeNull();
  });
  it('avance sans jamais revenir en arrière et horodate les étapes franchies', () => {
    const p = avancerPdr(base, T, 'COMMANDE_CREEE');
    expect(p.dates.BESOIN_VALIDE).toBe(T);
    expect(p.dates.COMMANDE_CREEE).toBe(T);
    expect(() => avancerPdr(p, T, 'IDENTIFIEE')).toThrow();
  });
  it('estime la disponibilité depuis l\'ETA', () => {
    const p = { ...base, etape: 'TRANSIT' as const, eta: addDays(T, 10), dates: { TRANSIT: T } };
    expect(dateDispoEstimee(p, P, T)).toBe(addDays(T, 10 + P.delaiAbidjanUsineJours + P.delaiReceptionJours));
    expect(dateDispoEstimee({ ...p, modeTransport: 'LOCAL' }, P, T)).toBe(addDays(T, 10 + P.delaiReceptionJours));
  });
  it('chaque action PDR appartient à un seul rôle', () => {
    for (const a of ACTIONS_PDR) expect(typeof a.role).toBe('string');
    expect(actionsPour({ ...base, etape: 'ARRIVEE_USINE' }, 'ACHATS')).toHaveLength(0);
    expect(actionsPour({ ...base, etape: 'ARRIVEE_USINE' }, 'MAGASIN').map((a) => a.id)).toContain('recPhys');
  });
});

describe('règle techniciens / PDR (§14)', () => {
  it('signale un technicien prévu avant la disponibilité des PDR', () => {
    const a = analyserRevision(d, 'R26-L03', T);
    const it = a.interventions.find((i) => i.intervention.id === 'I26-5')!;
    expect(it.controle.enRisque).toBe(true);
    expect(a.risques.some((r) => r.evenement === 'TECHNICIEN_AVANT_PDR' && r.niveau === 'CRITIQUE' && r.responsable === 'MAINTENANCE')).toBe(true);
    const ok = controleTechnicienPdr({ ...it.intervention, datePrevue: addDays(it.controle.dateDispoMax!, 1) }, d.pdrs.filter((p) => p.revisionId === 'R26-L03'), (p) => dateDispoEstimee(p, P, T));
    expect(ok.enRisque).toBe(false);
  });
  it('calcule une note globale pondérée', () => {
    const notes = { competence: 5, qualite: 5, respectPlanning: 5, diagnostic: 5, efficacite: 5, comportement: 5, respectConsignes: 5, compteRendu: 5, redemarrage: 5 };
    expect(noteGlobale({ notes, commentaire: '', auteur: '', date: T })).toBe(5);
  });
});

describe('chemin critique (§18)', () => {
  it('trouve le chemin le plus long et les marges', () => {
    const c = calculerCpm([
      { id: 'A', duree: 2, deps: [], debutMin: 0 },
      { id: 'B', duree: 5, deps: ['A'], debutMin: 0 },
      { id: 'C', duree: 1, deps: ['A'], debutMin: 0 },
      { id: 'D', duree: 1, deps: ['B', 'C'], debutMin: 0 },
    ]);
    expect(c.fin).toBe(8);
    expect(c.chemin).toEqual(['A', 'B', 'D']);
    expect(c.taches.C.marge).toBe(4);
  });
  it('détecte les cycles sans planter', () => {
    const c = calculerCpm([
      { id: 'A', duree: 1, deps: ['B'], debutMin: 0 },
      { id: 'B', duree: 1, deps: ['A'], debutMin: 0 },
    ]);
    expect(c.cycle.length).toBe(2);
  });
  it('décale la fin de révision quand une PDR bloque une tâche critique', () => {
    const a = analyserRevision(d, 'R26-L02', T);
    expect(a.ecartFin).toBeGreaterThan(0);
    expect(a.travaux.chemin[0]).toBe('R26-L02-T03');
    expect(a.redemarrageTenable).toBe(false);
  });
});

describe('workflow et matrice (§22-26)', () => {
  it('chaque transition et chaque événement ont un seul responsable', () => {
    for (const t of TRANSITIONS) expect(typeof t.responsable).toBe('string');
    for (const r of RACI) expect(r.informes).not.toContain(r.responsable);
  });
  it('bloque le passage à « Prête » si des PDR critiques manquent', () => {
    const a = analyserRevision(d, 'R26-L03', T);
    const t = TRANSITIONS.find((x) => x.vers === 'PRETE')!;
    expect(t.controle(a).bloquants.length).toBeGreaterThan(0);
  });
});

describe('notifications et escalade (§27-30)', () => {
  const analyses = d.revisions.map((r) => analyserRevision(d, r.id, T));
  const notifs = construireNotifications(analyses, [], () => ({ ligne: 'L' }));
  it('ne notifie la Direction que pour les escalades de niveau 3', () => {
    const dir = d.utilisateurs.find((u) => u.role === 'DIRECTION')!;
    const vues = notifs.filter((n) => concerne(n, dir, () => true));
    expect(vues.length).toBeGreaterThan(0);
    expect(vues.every((n) => n.escalade === 3)).toBe(true);
    expect(vues.length).toBeLessThan(notifs.length / 2);
  });
  it('le Transit voit les risques dont il est responsable', () => {
    const tr = d.utilisateurs.find((u) => u.role === 'TRANSIT')!;
    expect(notifs.filter((n) => concerne(n, tr, () => true) === 'RESPONSABLE').length).toBeGreaterThan(0);
  });
});

describe('import de gamme (§9)', () => {
  const entete = ['Ligne', 'Machine', 'Sous-ensemble', 'Organe', 'Référence PDR', 'Désignation', 'Quantité', 'Criticité', 'Fournisseur', "Délai d'approvisionnement"];
  it('contrôle colonnes, formats, doublons, références et arborescence', () => {
    const r = analyserTableau(
      [
        entete,
        ['L02', 'SOU-004', 'Roue de soufflage', 'Moules', 'ART-458', 'Moule de soufflage 1,5 L (jeu)', 12, 'A', 'Sidel (FR)', 120],
        ['L02', 'SOU-004', 'Roue de soufflage', 'Moules', 'ART-458', 'Moule de soufflage 1,5 L (jeu)', 12, 'A', 'Sidel (FR)', 120],
        ['L02', 'XXX-999', '', '', 'ART-1', 'Inconnue', 'abc', 'Z', '', -3],
        ['L99', 'SOU-004', '', '', 'ART-2', 'Ligne inconnue', 1, 'B', '', 10],
      ],
      d,
      d.catalogue,
    );
    const msgs = r.anomalies.map((a) => a.message).join('\n');
    expect(msgs).toMatch(/Doublon/);
    expect(msgs).toMatch(/Machine « XXX-999 » inconnue/);
    expect(msgs).toMatch(/Quantité invalide/);
    expect(msgs).toMatch(/Criticité invalide/);
    expect(msgs).toMatch(/Délai invalide/);
    expect(msgs).toMatch(/Ligne inconnue/);
    expect(msgs).toMatch(/Référence inconnue du catalogue/);
    expect(r.valide).toBe(false);
  });
  it('refuse un fichier sans colonne obligatoire', () => {
    const r = analyserTableau([['Ligne', 'Machine'], ['L02', 'SOU-004']], d, d.catalogue);
    expect(r.colonnesManquantes).toContain('Référence PDR');
    expect(r.valide).toBe(false);
  });
  it('versionne sans écraser et synchronise sans supprimer', () => {
    const g = d.gammes.find((x) => x.ligneId === 'L02' && x.statut === 'ACTIVE')!;
    const lignes = g.lignes.slice(1).map((l, k) => (k === 0 ? { ...l, quantite: l.quantite + 1 } : l));
    const diff = comparerGammes(g.lignes, lignes);
    expect(diff.retirees).toHaveLength(1);
    expect(diff.modifiees).toHaveLength(1);
    const { gammes, version } = nouvelleVersion(d.gammes, 'L02', lignes, 'BMC', 'f.xlsx', T, 'NV');
    expect(version.version).toBe(g.version + 1);
    expect(gammes.find((x) => x.id === g.id)!.statut).toBe('REMPLACEE');
    const s = synchroniserPdr(d.pdrs, version, 'R26-L02', T, () => 'new');
    expect(s.horsGamme).toBe(1);
    expect(s.pdrs.length).toBe(d.pdrs.length);
  });
});

describe('permissions (§35)', () => {
  const u = (id: string) => d.utilisateurs.find((x) => x.id === id)!;
  it('mise en route : seuls les administrateurs saisissent, les autres lisent', () => {
    expect(d.parametres.modeSaisie).toBe('ADMIN');
    expect(peutModifier(d, u('u-admin'), 'ACHATS', 'L02')).toBe(true);
    for (const id of ['u-bmc', 'u-achats', 'u-maint', 'u-dir']) expect(peutModifier(d, u(id), 'NOTIFICATIONS')).toBe(false);
    expect(ligneVisible(d, u('u-achats'), 'L02')).toBe(true);
  });
  it('mode par profil : la matrice de l\'administrateur s\'applique', () => {
    const r = { ...d, parametres: { ...d.parametres, modeSaisie: 'ROLES' as const, droits: { ACHATS: ['ACHATS' as const, 'BMC' as const] } } };
    expect(peutModifier(r, u('u-bmc'), 'ACHATS', 'L02')).toBe(true);
    expect(peutModifier(r, u('u-achats'), 'TRANSIT', 'L02')).toBe(false);
  });
  it('chaque métier ne modifie que son domaine et son périmètre', () => {
    const d2 = { ...d, parametres: { ...d.parametres, modeSaisie: 'ROLES' as const } };
    const peut = (id: string, dom: Parameters<typeof peutModifier>[2], l: string) => peutModifier(d2, u(id), dom, l);
    expect(peut('u-achats', 'ACHATS', 'L02')).toBe(true);
    expect(peut('u-achats', 'TRANSIT', 'L02')).toBe(false);
    expect(peut('u-maint2', 'TRAVAUX', 'L02')).toBe(false);
    expect(peut('u-maint2', 'TRAVAUX', 'L03')).toBe(true);
    expect(ligneVisible(d, u('u-bmc'), 'L04')).toBe(true);
    expect(ligneVisible(d, u('u-presta'), 'L03')).toBe(false);
  });
});

describe('import du référentiel (mise en route)', () => {
  it('crée la hiérarchie manquante sans rien écraser', () => {
    const vide = creerBaseVide('2026-10-05');
    let n = 0;
    const id = (p: string) => `${p}-${++n}`;
    const b = appliquerReferentiel(
      [
        ['Site', 'Atelier', 'Ligne', 'Nom ligne', 'Machine', 'Nom machine', 'Sous-ensemble', 'Organe'],
        ['Usine', 'Cond.', 'L01', 'Ligne 1', 'SOU-1', 'Souffleuse', 'Roue', 'Moules'],
        ['Usine', 'Cond.', 'L01', 'Ligne 1', 'SOU-1', 'Souffleuse', 'Roue', 'Tiges'],
        ['Usine', 'Cond.', 'L01', 'Ligne 1', 'REM-1', 'Remplisseuse', '', ''],
      ],
      vide,
      id,
    );
    expect([b.sites, b.ateliers, b.lignes, b.machines, b.sousEnsembles, b.organes]).toEqual([1, 1, 1, 2, 1, 2]);
    const b2 = appliquerReferentiel([['Site', 'Atelier', 'Ligne'], ['Usine', 'Cond.', 'L01']], vide, id);
    expect(b2.lignes).toBe(0);
    expect(vide.utilisateurs.map((x) => x.role)).toEqual(['ADMIN']);
  });
});
