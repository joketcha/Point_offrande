import { useState } from 'react';
import { NIVEAUX, ORDRE_ROLES, RACI, ROLES } from '../domain/referentiel';
import type { Niveau, Role } from '../domain/types';
import { useStore } from '../store/store';
import { Card, RisqueItem, Tabs, Tile, Vide } from '../ui/kit';

export default function Risques() {
  const { analyses, visible } = useStore();
  const [vue, setVue] = useState<'risques' | 'matrice'>('risques');
  const [niveau, setNiveau] = useState<'' | Niveau>('');
  const [resp, setResp] = useState<'' | Role>('');
  const [rev, setRev] = useState('');
  const tous = analyses.filter((a) => visible(a.revision.ligneId)).flatMap((a) => a.risques.filter((r) => r.nature === 'RISQUE'));
  const liste = tous.filter((r) => (!niveau || r.niveau === niveau) && (!resp || r.responsable === resp) && (!rev || r.revisionId === rev));
  const n = (x: Niveau) => tous.filter((r) => r.niveau === x).length;
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Risques</h1>
          <div className="sub">Détectés automatiquement ; le responsable est déterminé par l'étape bloquante (une action = un responsable).</div>
        </div>
      </div>
      <div className="grid g4">
        {(['CRITIQUE', 'ACTION', 'VIGILANCE'] as Niveau[]).map((x) => (
          <Tile key={x} lbl={`${NIVEAUX[x].icone} ${NIVEAUX[x].libelle}`} val={n(x)} cls={x === 'CRITIQUE' ? 'crit' : x === 'ACTION' ? 'act' : 'vig'} onClick={() => setNiveau(niveau === x ? '' : x)} />
        ))}
        <Tile lbl="Escalades Direction (N3)" val={tous.filter((r) => r.escalade === 3).length} cls="crit" />
      </div>
      <Tabs
        value={vue}
        onChange={setVue}
        items={[
          { id: 'risques', label: 'Registre des risques' },
          { id: 'matrice', label: 'Matrice de responsabilité' },
        ]}
      />
      {vue === 'risques' && (
        <>
          <div className="filters">
            <select value={niveau} onChange={(e) => setNiveau(e.target.value as Niveau)} aria-label="Niveau">
              <option value="">Tous niveaux</option>
              {(['CRITIQUE', 'ACTION', 'VIGILANCE'] as Niveau[]).map((x) => (
                <option key={x} value={x}>
                  {NIVEAUX[x].libelle}
                </option>
              ))}
            </select>
            <select value={resp} onChange={(e) => setResp(e.target.value as Role)} aria-label="Responsable">
              <option value="">Tous responsables</option>
              {ORDRE_ROLES.map((x) => (
                <option key={x} value={x}>
                  {ROLES[x].court}
                </option>
              ))}
            </select>
            <select value={rev} onChange={(e) => setRev(e.target.value)} aria-label="Révision">
              <option value="">Toutes révisions</option>
              {analyses
                .filter((a) => visible(a.revision.ligneId) && a.risques.length)
                .map((a) => (
                  <option key={a.revision.id} value={a.revision.id}>
                    {a.revision.code}
                  </option>
                ))}
            </select>
          </div>
          <Card tight>{liste.length ? liste.map((r) => <RisqueItem key={r.cle} r={r} lien={`revision/${r.revisionId}/risques`} extra={<span className="tiny muted">{analyses.find((a) => a.revision.id === r.revisionId)?.revision.code}</span>} />) : <Vide>Aucun risque.</Vide>}</Card>
        </>
      )}
      {vue === 'matrice' && (
        <Card titre="Matrice de responsabilité (§26)" sub="Un seul responsable par événement. Pilote, informés et escalade sont distincts." tight>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Événement</th>
                  <th>Responsable</th>
                  <th>Pilote</th>
                  <th>Informés</th>
                  <th>Escalade</th>
                </tr>
              </thead>
              <tbody>
                {RACI.map((r) => (
                  <tr key={r.evenement}>
                    <td className="b">{r.libelle}</td>
                    <td>
                      <span className="badge role">{ROLES[r.responsable].court}</span>
                    </td>
                    <td>{r.pilote ? ROLES[r.pilote].court : '—'}</td>
                    <td className="small">{r.informes.map((x) => ROLES[x].court).join(', ') || '—'}</td>
                    <td className="small">{r.escalade ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
