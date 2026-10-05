import { describe, expect, it } from 'vitest';
import { creerDonneesDemo } from '../src/data/seed';
import { analyserRevision } from '../src/domain/analyse';

const T = '2026-10-05';

describe('jeu de démonstration', () => {
  const d = creerDonneesDemo(T);
  it('analyse toutes les révisions sans erreur', () => {
    for (const r of d.revisions) {
      const a = analyserRevision(d, r.id, T);
      if ((globalThis as { process?: { env: Record<string, string> } }).process?.env.DUMP) {
        console.log(`\n=== ${r.code} ${r.statut} prep=${a.preparation.taux}% fin=${a.finPrevue}→${a.finPrevisionnelle} (${a.ecartFin}) risque=${a.niveauRisque}`);
        for (const x of a.risques) console.log(`  ${x.niveau.padEnd(9)} L${x.escalade} ${x.responsable.padEnd(11)} ${x.quoi} | ${x.pourquoi}`);
        console.log('  chemin:', a.travaux.chemin.join(' > '), ' comparatif:', a.comparatif.map((c) => `${c.indicateur}:${c.ecart}`).join(' '));
      }
      expect(a.revision.id).toBe(r.id);
    }
  });
});
