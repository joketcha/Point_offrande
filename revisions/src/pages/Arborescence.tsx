import { useState } from 'react';
import { norm } from '../domain/arbo';
import { useStore } from '../store/store';
import { Card, Lien } from '../ui/kit';
import { CritBadge } from '../ui/Pdr';

/** SITE → ATELIER → LIGNE → MACHINE → SOUS-ENSEMBLE → ORGANE → PDR (gamme active). */
export default function Arborescence() {
  const { d, visible, analyses } = useStore();
  const [ouverts, setOuverts] = useState<Set<string>>(() => new Set(['S-ABJ', ...d.sites.map((s) => s.id), ...d.ateliers.map((a) => a.id)]));
  const [q, setQ] = useState('');
  const t = (id: string) =>
    setOuverts((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  const nq = norm(q);
  const match = (...xs: string[]) => !nq || xs.some((x) => norm(x).includes(nq));
  const Node = ({ id, niveau, children, label, extra, feuille }: { id: string; niveau: string; label: React.ReactNode; extra?: React.ReactNode; children?: React.ReactNode; feuille?: boolean }) => (
    <li>
      <span className="node" onClick={() => !feuille && t(id)}>
        <span className="muted" style={{ width: 12, display: 'inline-block' }}>
          {feuille ? '·' : ouverts.has(id) || nq ? '▾' : '▸'}
        </span>
        <span className="lvl">{niveau}</span>
        {label}
        {extra}
      </span>
      {!feuille && (ouverts.has(id) || nq) && <ul>{children}</ul>}
    </li>
  );
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Arborescence industrielle</h1>
          <div className="sub">Site → Atelier → Ligne → Machine → Sous-ensemble → Organe → PDR (gamme active). Utilisée par la planification, les gammes, les PDR et les filtres.</div>
        </div>
        <div className="grow" />
        <input type="search" placeholder="Rechercher (machine, organe, réf. PDR…)" value={q} onChange={(e) => setQ(e.target.value)} style={{ width: 280 }} />
      </div>
      <Card>
        <div className="tree">
          <ul>
            {d.sites.map((s) => (
              <Node key={s.id} id={s.id} niveau="Site" label={<b>{s.nom}</b>}>
                {d.ateliers
                  .filter((a) => a.siteId === s.id)
                  .map((a) => (
                    <Node key={a.id} id={a.id} niveau="Atelier" label={<b>{a.nom}</b>}>
                      {d.lignes
                        .filter((l) => l.atelierId === a.id && visible(l.id))
                        .map((l) => {
                          const g = d.gammes.find((x) => x.ligneId === l.id && x.statut === 'ACTIVE');
                          const revs = analyses.filter((x) => x.revision.ligneId === l.id && x.revision.statut !== 'ANNULEE');
                          const proch = revs.filter((x) => !x.revision.dateReelleFin).sort((x, y) => x.revision.datePrevue.localeCompare(y.revision.datePrevue))[0];
                          return (
                            <Node
                              key={l.id}
                              id={l.id}
                              niveau="Ligne"
                              label={
                                <b>
                                  {l.code} — {l.nom}
                                </b>
                              }
                              extra={
                                <span className="tiny muted">
                                  {g ? ` gamme v${g.version}` : ' sans gamme'}
                                  {proch && (
                                    <>
                                      {' · prochaine révision '}
                                      <Lien to={`revision/${proch.revision.id}`}>{proch.revision.code}</Lien>
                                    </>
                                  )}
                                </span>
                              }
                            >
                              {d.machines
                                .filter((m) => m.ligneId === l.id)
                                .filter((m) => match(m.code, m.nom, ...(g?.lignes.filter((x) => x.machineId === m.id).flatMap((x) => [x.ref, x.designation, x.organe, x.sousEnsemble]) ?? []), ...d.sousEnsembles.filter((x) => x.machineId === m.id).map((x) => x.nom)))
                                .map((m) => (
                                  <Node key={m.id} id={m.id} niveau="Machine" label={`${m.code} — ${m.nom}`}>
                                    {d.sousEnsembles
                                      .filter((x) => x.machineId === m.id)
                                      .map((se) => (
                                        <Node key={se.id} id={se.id} niveau="S-ensemble" label={se.nom}>
                                          {d.organes
                                            .filter((o) => o.sousEnsembleId === se.id)
                                            .map((o) => {
                                              const pdrs = g?.lignes.filter((x) => x.machineId === m.id && norm(x.sousEnsemble) === norm(se.nom) && norm(x.organe) === norm(o.nom)) ?? [];
                                              return (
                                                <Node key={o.id} id={o.id} niveau="Organe" label={o.nom} extra={<span className="tiny muted"> {pdrs.length} PDR</span>} feuille={!pdrs.length}>
                                                  {pdrs.map((p) => (
                                                    <Node key={p.ref} id={`${o.id}-${p.ref}`} niveau="PDR" feuille label={<span className="mono">{p.ref}</span>} extra={<span className="small"> {p.designation} ×{p.quantite} <CritBadge c={p.criticite} /> <span className="muted">{p.fournisseur} · {p.delaiJours} j</span></span>} />
                                                  ))}
                                                </Node>
                                              );
                                            })}
                                        </Node>
                                      ))}
                                  </Node>
                                ))}
                            </Node>
                          );
                        })}
                    </Node>
                  ))}
              </Node>
            ))}
          </ul>
        </div>
      </Card>
    </div>
  );
}
