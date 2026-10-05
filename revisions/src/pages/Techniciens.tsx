import { useState } from 'react';
import { CRITERES } from '../domain/referentiel';
import { STATUTS } from '../domain/referentiel';
import type { CritereEvaluation } from '../domain/types';
import { useStore } from '../store/store';
import { Card, Tabs, Tile } from '../ui/kit';
import { TableInterventions } from './revision/Techniciens';

export default function Techniciens() {
  const { analyses, visible } = useStore();
  const [vue, setVue] = useState<'ouvertes' | 'toutes' | 'prestataires'>('ouvertes');
  const vis = analyses.filter((a) => visible(a.revision.ligneId));
  const items = vis.flatMap((a) => a.interventions.map((i) => ({ ...i, revisionCode: a.revision.code, revisionId: a.revision.id, clos: STATUTS[a.revision.statut].phase === 'clos' })));
  const ouvertes = items.filter((i) => !i.clos || (i.intervention.statut === 'TERMINEE' && !i.intervention.evaluation));
  // Synthèse par entreprise (§16) : notes moyennes par critère.
  const parEntreprise = new Map<string, typeof items>();
  for (const i of items) parEntreprise.set(i.intervention.entreprise, [...(parEntreprise.get(i.intervention.entreprise) ?? []), i]);
  const cles = Object.keys(CRITERES) as CritereEvaluation[];
  const moy = (xs: number[]) => (xs.length ? Math.round((xs.reduce((s, x) => s + x, 0) / xs.length) * 10) / 10 : undefined);
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Techniciens extérieurs</h1>
          <div className="sub">Planification contrôlée par la disponibilité des PDR, confirmation, évaluation après intervention (Responsable Maintenance).</div>
        </div>
      </div>
      <div className="grid g4">
        <Tile lbl="Interventions prévues (ouvertes)" val={ouvertes.filter((i) => i.intervention.statut !== 'ANNULEE').length} />
        <Tile lbl="Non confirmées" val={ouvertes.filter((i) => ['A_PLANIFIER', 'PRESSENTI'].includes(i.intervention.statut)).length} cls="act" />
        <Tile lbl="🔴 Prévues avant les PDR" val={ouvertes.filter((i) => i.controle.enRisque).length} cls={ouvertes.some((i) => i.controle.enRisque) ? 'crit' : 'ok'} />
        <Tile lbl="À évaluer" val={items.filter((i) => i.intervention.statut === 'TERMINEE' && !i.intervention.evaluation).length} cls="act" />
      </div>
      <Tabs
        value={vue}
        onChange={setVue}
        items={[
          { id: 'ouvertes', label: 'À piloter' },
          { id: 'toutes', label: 'Toutes les interventions' },
          { id: 'prestataires', label: 'Performance prestataires' },
        ]}
      />
      {vue !== 'prestataires' && (
        <Card tight>
          <TableInterventions items={vue === 'ouvertes' ? ouvertes : items} avecRevision />
        </Card>
      )}
      {vue === 'prestataires' && (
        <Card tight>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Entreprise</th>
                  <th className="num">Interv.</th>
                  <th className="num">Évaluées</th>
                  <th className="num">Note globale</th>
                  {cles.map((c) => (
                    <th key={c} className="num" title={CRITERES[c].libelle}>
                      {CRITERES[c].libelle.split(' ')[0]}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...parEntreprise.entries()].map(([e, xs]) => {
                  const ev = xs.filter((x) => x.intervention.evaluation);
                  const g = moy(ev.map((x) => x.note!).filter((x) => x !== undefined));
                  return (
                    <tr key={e}>
                      <td className="b">{e}</td>
                      <td className="num">{xs.length}</td>
                      <td className="num">{ev.length}</td>
                      <td className="num">{g !== undefined ? <span className={`badge ${g >= 4 ? 'ok' : g >= 3 ? 'vig' : 'crit'}`}>{g}/5</span> : '—'}</td>
                      {cles.map((c) => (
                        <td key={c} className="num">
                          {moy(ev.map((x) => x.intervention.evaluation!.notes[c])) ?? '—'}
                        </td>
                      ))}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
