import { useMemo, useState } from 'react';
import { actionsAttendues, actionsPour, type ActionPdr } from '../domain/actionsPdr';
import type { PdrAnalyse } from '../domain/analyse';
import { codeLigne, codeMachine } from '../domain/arbo';
import { fmt, fmtCourt } from '../domain/dates';
import { CRITICITES, ETAPE, ETAPES_PDR, ROLES, indexEtape } from '../domain/referentiel';
import type { Domaine } from '../domain/permissions';
import type { Pdr, Role } from '../domain/types';
import { useStore } from '../store/store';
import { Champ, EcartBadge, Lien, Modal, PipePdr, RoleBadge, Vide } from './kit';

const DOMAINE_ROLE: Partial<Record<Role, Domaine>> = {
  BMC: 'GAMME',
  ACHATS: 'ACHATS',
  TRANSIT: 'TRANSIT',
  MAGASIN: 'RECEPTION',
  MAINTENANCE: 'TECHNICIENS',
};

export function CritBadge({ c }: { c: Pdr['criticite'] }) {
  return <span className={`badge ${c === 'A' ? 'crit' : c === 'B' ? 'act' : ''}`} title={CRITICITES[c].libelle}>{c}</span>;
}

/** Tableau des PDR d'une ou plusieurs révisions. */
export function TablePdr({ lignes, avecRevision, vide }: { lignes: (PdrAnalyse & { revisionCode?: string; ligneId?: string })[]; avecRevision?: boolean; vide?: string }) {
  const { d } = useStore();
  const [ouverte, setOuverte] = useState<string | null>(null);
  const sel = lignes.find((x) => x.pdr.id === ouverte);
  if (!lignes.length) return <Vide>{vide ?? 'Aucune PDR.'}</Vide>;
  return (
    <>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              {avecRevision && <th>Révision</th>}
              <th>Machine</th>
              <th>Réf.</th>
              <th>Désignation</th>
              <th className="num">Qté</th>
              <th>Crit.</th>
              <th style={{ minWidth: 150 }}>Étape</th>
              <th>Où est-elle ?</th>
              <th>Dispo. estimée</th>
              <th>Besoin</th>
              <th>Écart</th>
              <th>Responsable</th>
              <th>Action attendue</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((x) => {
              const late = !x.disponible && x.ecart > 0;
              return (
                <tr key={x.pdr.id} className="click" onClick={() => setOuverte(x.pdr.id)} style={x.pdr.horsGamme ? { opacity: 0.55 } : undefined}>
                  {avecRevision && (
                    <td className="nowrap">
                      <span className="b">{x.revisionCode}</span>
                      <div className="tiny muted">{x.ligneId && codeLigne(d, x.ligneId)}</div>
                    </td>
                  )}
                  <td className="nowrap">{codeMachine(d, x.pdr.machineId)}</td>
                  <td className="nowrap mono">{x.pdr.ref}</td>
                  <td>
                    {x.pdr.designation}
                    <div className="tiny muted">
                      {x.pdr.sousEnsemble}
                      {x.pdr.organe ? ` › ${x.pdr.organe}` : ''}
                      {x.pdr.horsGamme ? ' · hors gamme' : ''}
                    </div>
                  </td>
                  <td className="num">{x.pdr.quantite}</td>
                  <td>
                    <CritBadge c={x.pdr.criticite} />
                  </td>
                  <td>
                    <div className="small b" style={{ marginBottom: 3 }}>
                      {x.pdr.nonConforme ? <span className="crit-txt">Non conforme</span> : x.pdr.enStock && x.pdr.etape !== 'DISPONIBLE' ? 'En stock' : ETAPE[x.pdr.etape].libelle}
                    </div>
                    <PipePdr etape={x.pdr.etape} bad={x.pdr.nonConforme || late} />
                  </td>
                  <td className="small">{x.position}</td>
                  <td className="nowrap">{x.disponible ? <span className="ok-txt">✓ {fmtCourt(x.pdr.dates.DISPONIBLE)}</span> : fmtCourt(x.dispo)}</td>
                  <td className="nowrap">{fmtCourt(x.requise)}</td>
                  <td>{x.disponible ? <span className="muted">—</span> : <EcartBadge j={x.ecart} />}</td>
                  <td>
                    <RoleBadge r={x.responsable} />
                  </td>
                  <td className="small">{x.disponible ? <span className="muted">—</span> : x.action}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {sel && <ModalPdr a={sel} onClose={() => setOuverte(null)} />}
    </>
  );
}

/** Fiche PDR : où elle est, historique daté, ETA, et actions du rôle courant. */
export function ModalPdr({ a, onClose }: { a: PdrAnalyse; onClose: () => void }) {
  const { d, user, today, modifier, peut, toast } = useStore();
  const rev = d.revisions.find((r) => r.id === a.pdr.revisionId)!;
  const p = d.pdrs.find((x) => x.id === a.pdr.id) ?? a.pdr;
  const possibles = actionsPour(p, user.role).filter((x) => peut(DOMAINE_ROLE[x.role] ?? 'ADMIN', rev.ligneId));
  const attendues = actionsAttendues(p);
  const [action, setAction] = useState<ActionPdr | null>(null);
  const [valeurs, setValeurs] = useState<Record<string, string>>({});
  const ouvrir = (x: ActionPdr) => {
    setAction(x);
    setValeurs(Object.fromEntries(x.champs.map((c) => [c.cle, c.defaut?.(p, today) ?? ''])));
  };
  const manquants = action ? action.champs.filter((c) => c.req && !String(valeurs[c.cle] ?? '').trim()) : [];
  const valider = () => {
    if (!action || manquants.length) return;
    try {
      const { pdr, detail } = action.appliquer(p, valeurs, today, user.nom);
      modifier({ entite: 'PDR', entiteId: p.id, revisionId: p.revisionId, action: action.libelle, detail: `${p.ref} — ${detail}`, avant: ETAPE[p.etape].libelle, apres: ETAPE[pdr.etape].libelle }, (dr) => {
        const i = dr.pdrs.findIndex((x) => x.id === p.id);
        dr.pdrs[i] = pdr;
      });
      toast(`${p.ref} : ${action.libelle}`);
      setAction(null);
    } catch (e) {
      toast((e as Error).message, 'erreur');
    }
  };
  const historique = useMemo(() => d.audit.filter((x) => x.entite === 'PDR' && x.entiteId === p.id).slice(-12).reverse(), [d.audit, p.id]);

  return (
    <Modal
      large
      titre={
        <span className="row">
          <span className="mono">{p.ref}</span> {p.designation} <CritBadge c={p.criticite} />
        </span>
      }
      onClose={onClose}
    >
      <div className="grid g2">
        <div className="stack">
          <dl className="kv">
            <dt>Révision</dt>
            <dd>
              <Lien to={`revision/${rev.id}/pdr`}>{rev.code}</Lien>
            </dd>
            <dt>Arborescence</dt>
            <dd>
              {codeLigne(d, rev.ligneId)} › {codeMachine(d, p.machineId)} › {p.sousEnsemble || '—'} › {p.organe || '—'}
            </dd>
            <dt>Quantité</dt>
            <dd>
              {p.quantite}
              {p.qteRecue !== undefined && p.qteRecue !== p.quantite ? <span className="act-txt"> (reçue {p.qteRecue})</span> : null}
            </dd>
            <dt>Fournisseur</dt>
            <dd>
              {p.fournisseur || '—'} · délai {p.delaiJours} j
            </dd>
            <dt>Commande</dt>
            <dd>
              {p.numeroCommande ?? '—'}
              {p.dateLivraisonPromise && ` · promise ${fmt(p.dateLivraisonPromise)}`}
            </dd>
            <dt>Transport</dt>
            <dd>
              {p.modeTransport === 'AERIEN' ? 'Aérien' : p.modeTransport === 'LOCAL' ? 'Local' : 'Maritime'}
              {p.conteneur && ` · ${p.conteneur}`}
              {p.bateau && ` · ${p.bateau}`}
            </dd>
            <dt>ETA</dt>
            <dd>
              {p.eta ? fmt(p.eta) : '—'}
              {p.etaInitiale && p.eta !== p.etaInitiale ? <span className="act-txt"> (initiale {fmt(p.etaInitiale)})</span> : null}
            </dd>
            <dt>Où est-elle ?</dt>
            <dd className="b">{a.position}</dd>
            <dt>Disponibilité</dt>
            <dd>
              {a.disponible ? (
                <span className="ok-txt">Disponible depuis le {fmt(p.dates.DISPONIBLE)}</span>
              ) : (
                <>
                  estimée {fmt(a.dispo)} · besoin {fmt(a.requise)} <EcartBadge j={a.ecart} />
                </>
              )}
            </dd>
            {p.ecartReception && (
              <>
                <dt>Écart réception</dt>
                <dd className="crit-txt">{p.ecartReception}</dd>
              </>
            )}
            {p.commentaire && (
              <>
                <dt>Commentaire</dt>
                <dd style={{ whiteSpace: 'pre-wrap' }}>{p.commentaire}</dd>
              </>
            )}
          </dl>
          {p.etaHistorique.length > 0 && (
            <div>
              <h3 style={{ marginBottom: 6 }}>Historique ETA</h3>
              <table className="tbl">
                <tbody>
                  {p.etaHistorique.map((h, k) => (
                    <tr key={k}>
                      <td className="nowrap">{fmtCourt(h.date)}</td>
                      <td className="nowrap">
                        {fmtCourt(h.ancienne)} → <b>{fmtCourt(h.nouvelle)}</b>
                      </td>
                      <td>{h.motif}</td>
                      <td className="muted small">{h.auteur}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {p.cyclesPrecedents?.length ? (
            <div className="alert VIGILANCE small">
              {p.cyclesPrecedents.length} cycle(s) d'approvisionnement précédent(s) archivé(s) : {p.cyclesPrecedents.map((c) => `${c.numeroCommande ?? '—'} (${c.motif})`).join(', ')}
            </div>
          ) : null}
        </div>
        <div className="stack">
          <div>
            <h3 style={{ marginBottom: 6 }}>Cycle PDR</h3>
            <div className="col" style={{ gap: 2 }}>
              {ETAPES_PDR.map((e) => {
                const i = indexEtape(e);
                const cur = indexEtape(p.etape);
                return (
                  <div key={e} className="row small" style={{ gap: 8, opacity: i > cur ? 0.5 : 1 }}>
                    <span className={`dot ${i < cur || p.etape === 'DISPONIBLE' ? 'OK' : i === cur ? (p.nonConforme ? 'CRITIQUE' : 'INFO') : ''}`} style={i > cur ? { background: 'var(--surface-3)' } : undefined} />
                    <span style={{ width: 175 }} className={i === cur ? 'b' : ''}>
                      {ETAPE[e].libelle}
                    </span>
                    <span className="muted" style={{ width: 90 }}>
                      {p.dates[e] ? fmtCourt(p.dates[e]) : ''}
                    </span>
                    {i === cur && e !== 'DISPONIBLE' && <RoleBadge r={ETAPE[e].responsable} />}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <div className="sep" />
      {!a.disponible && (
        <div className="alert INFO small" style={{ marginBottom: 10 }}>
          <span>
            <b>Qui doit agir ?</b> <RoleBadge r={a.responsable} /> — {a.action}
            {attendues.length > 0 && <span className="muted"> (actions attendues : {attendues.map((x) => `${x.libelle} [${ROLES[x.role].court}]`).join(' · ')})</span>}
          </span>
        </div>
      )}
      {possibles.length > 0 ? (
        <div className="stack">
          <div className="row">
            <span className="small muted">Vos actions ({ROLES[user.role].court}) :</span>
            {possibles.map((x) => (
              <button key={x.id} className={`btn sm ${x.principale ? 'primary' : ''}`} onClick={() => ouvrir(x)}>
                {x.libelle}
              </button>
            ))}
          </div>
          {action && (
            <div className="card card-b" style={{ background: 'var(--surface-2)' }}>
              <h3 style={{ marginBottom: 8 }}>{action.libelle}</h3>
              <div className="form">
                {action.champs.map((c) => (
                  <Champ key={c.cle} label={c.label} req={c.req} full={c.type === 'textarea'}>
                    {c.type === 'select' ? (
                      <select value={valeurs[c.cle] ?? ''} onChange={(e) => setValeurs({ ...valeurs, [c.cle]: e.target.value })}>
                        <option value="">—</option>
                        {c.options!.map((o) => (
                          <option key={o.v} value={o.v}>
                            {o.l}
                          </option>
                        ))}
                      </select>
                    ) : c.type === 'textarea' ? (
                      <textarea value={valeurs[c.cle] ?? ''} onChange={(e) => setValeurs({ ...valeurs, [c.cle]: e.target.value })} />
                    ) : (
                      <input type={c.type} value={valeurs[c.cle] ?? ''} onChange={(e) => setValeurs({ ...valeurs, [c.cle]: e.target.value })} />
                    )}
                  </Champ>
                ))}
              </div>
              <div className="row" style={{ marginTop: 10, justifyContent: 'flex-end' }}>
                {manquants.length > 0 && <span className="small crit-txt">Champs obligatoires : {manquants.map((c) => c.label).join(', ')}</span>}
                <button className="btn" onClick={() => setAction(null)}>
                  Annuler
                </button>
                <button className="btn primary" disabled={manquants.length > 0} onClick={valider}>
                  Enregistrer
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="small muted">Aucune action disponible pour votre rôle ({ROLES[user.role].libelle}) sur cette PDR — une action = un responsable.</p>
      )}
      {historique.length > 0 && (
        <>
          <div className="sep" />
          <h3 style={{ marginBottom: 6 }}>Journal</h3>
          <div className="col small" style={{ gap: 3 }}>
            {historique.map((h) => (
              <div key={h.id}>
                <span className="muted mono">{h.horodatage.replace('T', ' ').slice(0, 16)}</span> · <b>{h.auteur}</b> — {h.detail}
              </div>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}
