import { describe, expect, it } from 'vitest';
import { creerDonneesDemo } from '../src/data/seed';
import { avancementRca, controlerEtape, ETAPES_RCA, qualiteAnalyse, rcaVide } from '../src/domain/rca';

const d = creerDonneesDemo('2026-10-05');
const exemple = d.rca![0];

describe('RCA guidée', () => {
  it('12 étapes, chacune avec sa raison d\'être et son erreur classique', () => {
    expect(ETAPES_RCA).toHaveLength(12);
    for (const e of ETAPES_RCA) expect(e.pourquoi.length > 40 && e.erreur.length > 30).toBe(true);
  });
  it('l\'exemple de démonstration est complet et de bonne qualité', () => {
    expect(avancementRca(exemple)).toBe(100);
    expect(qualiteAnalyse(exemple).map((q) => q.note)).toEqual(['BON', 'BON', 'BON']);
  });
  it('refuse un énoncé qui contient une cause ou un coupable', () => {
    const r = rcaVide('x', 'RCA-T', 'A', '2026-10-05');
    r.probleme = { ...exemple.probleme, quoi: 'Arrêt du convoyeur à cause de l\'opérateur' };
    expect(controlerEtape(r, 2).manques.join()).toMatch(/cause ou un jugement/);
  });
  it('exige une preuve pour chaque hypothèse tranchée et chaque pourquoi', () => {
    const r = structuredClone(exemple);
    r.ishikawa[0].preuve = '';
    r.branches[0].niveaux[1].preuve = '';
    expect(controlerEtape(r, 8).complete).toBe(false);
    expect(controlerEtape(r, 9).complete).toBe(false);
  });
  it('exige au moins une action par cause latente et signale le « tout formation »', () => {
    const r = structuredClone(exemple);
    r.actions = r.actions.filter((a) => a.brancheId !== 'b2').map((a) => ({ ...a, hierarchie: 'FORMATION' as const }));
    const c = controlerEtape(r, 10);
    expect(c.manques.join()).toMatch(/Cause latente sans action/);
    expect(c.conseils.join()).toMatch(/formation/);
  });
  it('signale une racine « erreur humaine » et l\'absence de cause latente', () => {
    const r = structuredClone(exemple);
    r.branches = [{ ...r.branches[0], typeCause: 'HUMAINE', niveaux: [...r.branches[0].niveaux.slice(0, 3), { texte: 'Erreur humaine du technicien', preuve: 'témoignage', statut: 'CONFIRMEE' }] }];
    const c = controlerEtape(r, 9);
    expect(c.manques.join()).toMatch(/cause racine latente/);
    expect(c.conseils.join()).toMatch(/erreur humaine/);
  });
  it('une RCA vide a une qualité faible', () => {
    expect(qualiteAnalyse(rcaVide('v', 'RCA-V', 'A', '2026-10-05')).every((q) => q.note === 'FAIBLE')).toBe(true);
  });
});
