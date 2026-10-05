import { useState } from 'react';
import { norm } from '../domain/arbo';
import { ROLES } from '../domain/referentiel';
import { useStore } from '../store/store';
import { Card, Vide, csv, telecharger } from '../ui/kit';

export function JournalAudit({ revisionId }: { revisionId?: string }) {
  const { d, today } = useStore();
  const [q, setQ] = useState('');
  const [entite, setEntite] = useState('');
  const base = d.audit.filter((a) => !revisionId || a.revisionId === revisionId || a.entiteId === revisionId);
  const entites = [...new Set(base.map((a) => a.entite))].sort();
  const liste = base
    .filter((a) => !entite || a.entite === entite)
    .filter((a) => !q || norm(`${a.detail} ${a.auteur} ${a.action} ${a.entiteId}`).includes(norm(q)))
    .slice()
    .reverse();
  return (
    <Card
      titre={revisionId ? 'Historique de la révision' : undefined}
      actions={
        <div className="filters">
          <input type="search" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
          <select value={entite} onChange={(e) => setEntite(e.target.value)} aria-label="Entité">
            <option value="">Toutes entités</option>
            {entites.map((x) => (
              <option key={x}>{x}</option>
            ))}
          </select>
          <button
            className="btn sm"
            onClick={() =>
              telecharger(
                `journal-audit-${today}.csv`,
                csv([['Horodatage', 'Auteur', 'Rôle', 'Entité', 'ID', 'Révision', 'Action', 'Détail', 'Avant', 'Après'], ...liste.map((a) => [a.horodatage, a.auteur, ROLES[a.role]?.court, a.entite, a.entiteId, d.revisions.find((r) => r.id === a.revisionId)?.code, a.action, a.detail, a.avant, a.apres])]),
              )
            }
          >
            Export
          </button>
        </div>
      }
      tight
    >
      {liste.length ? (
        <div className="tbl-wrap" style={{ maxHeight: 640 }}>
          <table className="tbl">
            <thead>
              <tr>
                <th>Horodatage</th>
                <th>Auteur</th>
                <th>Entité</th>
                {!revisionId && <th>Révision</th>}
                <th>Action</th>
                <th>Détail</th>
                <th>Avant → après</th>
              </tr>
            </thead>
            <tbody>
              {liste.slice(0, 500).map((a) => (
                <tr key={a.id}>
                  <td className="nowrap mono">{a.horodatage.replace('T', ' ').slice(0, 16)}</td>
                  <td className="nowrap">
                    {a.auteur}
                    <div className="tiny muted">{ROLES[a.role]?.court}</div>
                  </td>
                  <td className="nowrap">{a.entite}</td>
                  {!revisionId && <td className="nowrap">{d.revisions.find((r) => r.id === a.revisionId)?.code ?? '—'}</td>}
                  <td className="nowrap small b">{a.action}</td>
                  <td className="small">{a.detail}</td>
                  <td className="small">{a.avant || a.apres ? `${a.avant ?? '—'} → ${a.apres ?? '—'}` : ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Vide>Aucune entrée.</Vide>
      )}
    </Card>
  );
}

export default function Audit() {
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Historique / audit</h1>
          <div className="sub">Journal immuable : planning, dates, reports, PDR, commandes, transit, réception, techniciens, travaux, incidents, redémarrage, REX.</div>
        </div>
      </div>
      <JournalAudit />
    </div>
  );
}
