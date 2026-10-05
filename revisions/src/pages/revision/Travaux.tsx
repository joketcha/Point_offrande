import { useState } from 'react';
import type { AnalyseRevision } from '../../domain/analyse';
import type { TravailAnalyse } from '../../domain/travaux';
import { codeMachine } from '../../domain/arbo';
import { diffDays, fmtCourt } from '../../domain/dates';
import { STATUTS_TRAVAIL } from '../../domain/referentiel';
import type { Criticite, Priorite, StatutTravail, Travail } from '../../domain/types';
import { nouvelId, useStore } from '../../store/store';
import { Card, Champ, EcartBadge, Lien, Modal, Vide } from '../../ui/kit';
import { BoutonRca, rcaDepuisTravail } from '../Rca';

export function OngletTravaux({ a }: { a: AnalyseRevision }) {
  const { peut, today } = useStore();
  const r = a.revision;
  const [edit, setEdit] = useState<Travail | null>(null);
  const editable = peut('TRAVAUX', r.ligneId);
  const origine = r.dateReelleDebut ?? r.datePrevue;
  const total = Math.max(r.dureePrevueJours, diffDays(origine, a.travaux.finPrevisionnelle), 1);
  const nouveau = (): Travail => ({
    id: '',
    revisionId: r.id,
    code: `T${String(a.travaux.taches.length + 1).padStart(2, '0')}`,
    sousEnsemble: '',
    description: '',
    responsable: '',
    priorite: 'P2',
    criticite: 'B',
    decalageMinJours: 0,
    dureePrevueJours: 1,
    statut: 'A_FAIRE',
    dependances: [],
    pdrIds: [],
  });
  return (
    <div className="stack">
      <div className="grid g4">
        <div className="card tile">
          <span className="lbl">Fin planifiée des travaux</span>
          <span className="val" style={{ fontSize: 18 }}>
            {fmtCourt(a.travaux.finPlanifiee)}
          </span>
        </div>
        <div className={`card tile ${a.ecartFin > 0 ? 'crit' : 'ok'}`}>
          <span className="lbl">Fin prévisionnelle</span>
          <span className="val" style={{ fontSize: 18 }}>
            {fmtCourt(a.finPrevisionnelle)} <EcartBadge j={a.ecartFin} />
          </span>
        </div>
        <div className="card tile">
          <span className="lbl">Avancement</span>
          <span className="val" style={{ fontSize: 18 }}>
            {a.travaux.nbTermines}/{a.travaux.taches.length} terminés
          </span>
          <span className="det">
            {a.travaux.nbEnCours} en cours · {a.travaux.nbRetard} en retard · {a.travaux.nbBloques} bloqués
          </span>
        </div>
        <div className="card tile">
          <span className="lbl">Chemin critique</span>
          <span className="val" style={{ fontSize: 15 }}>
            {a.travaux.chemin.map((id) => a.travaux.taches.find((t) => t.travail.id === id)?.travail.code).join(' › ') || '—'}
          </span>
          <span className="det">Tâches qui décalent la fin, le redémarrage et la remise en production</span>
        </div>
      </div>
      {a.travaux.cycle.length > 0 && <div className="alert CRITIQUE small">Dépendances circulaires : {a.travaux.cycle.join(', ')}</div>}
      <Card
        titre="Travaux — chemin critique (CPM)"
        sub="Barre grise : planifié · couleur : réel / prévision (rouge = critique). Les tâches attendant des PDR sont décalées à leur disponibilité."
        actions={
          <>
            <Lien to="gantt">Gantt</Lien>
            {editable && peut('TECHNICIENS', r.ligneId) && (
              <button className="btn primary sm" onClick={() => setEdit(nouveau())}>
                + Travail
              </button>
            )}
          </>
        }
        tight
      >
        {a.travaux.taches.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Travail</th>
                  <th>Machine</th>
                  <th>Resp.</th>
                  <th>Prio / crit.</th>
                  <th>Prévu</th>
                  <th>Réel / prévision</th>
                  <th className="num">Durée p/r</th>
                  <th>Marge</th>
                  <th style={{ minWidth: 180 }}>Planning</th>
                  <th>Statut</th>
                  <th>Dépend de</th>
                  <th>PDR</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {a.travaux.taches.map((t) => (
                  <LigneTravail key={t.travail.id} t={t} a={a} total={total} origine={origine} editable={editable} onEdit={() => setEdit(t.travail)} today={today} />
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Vide>Aucun travail planifié.</Vide>
        )}
      </Card>
      {edit && <ModalTravail a={a} initial={edit} onClose={() => setEdit(null)} />}
    </div>
  );
}

function LigneTravail({ t, a, total, origine, editable, onEdit, today }: { t: TravailAnalyse; a: AnalyseRevision; total: number; origine: string; editable: boolean; onEdit: () => void; today: string }) {
  const { d, modifier, toast, user, peut } = useStore();
  const w = t.travail;
  const pct = (dt: string) => `${Math.max(0, Math.min(100, (diffDays(origine, dt) / total) * 100))}%`;
  const larg = (x: string, y: string) => `${Math.max(1.5, (diffDays(x, y) / total) * 100)}%`;
  const pdrs = w.pdrIds.map((id) => a.pdrs.find((p) => p.pdr.id === id)).filter((x) => !!x);
  const manquantes = pdrs.filter((p) => !p.disponible);
  const changer = (statut: StatutTravail, extra: Partial<Travail>, detail: string) => {
    modifier({ entite: 'Travail', entiteId: w.id, revisionId: w.revisionId, action: 'STATUT', detail: `${w.code} — ${detail}`, avant: STATUTS_TRAVAIL[w.statut], apres: STATUTS_TRAVAIL[statut] }, (dr) => {
      Object.assign(dr.travaux.find((x) => x.id === w.id)!, { statut, ...extra });
    });
    toast(`${w.code} : ${STATUTS_TRAVAIL[statut]}`);
  };
  const exec = editable && (user.role !== 'TECHNICIEN' || peut('TRAVAUX', a.revision.ligneId));
  const [blocage, setBlocage] = useState<string | null>(null);
  return (
    <tr className={t.critique ? 'sel' : ''}>
      <td className={`b nowrap ${t.critique ? 'crit-txt' : ''}`}>{w.code}</td>
      <td>
        {w.description}
        {w.motifBlocage && w.statut === 'BLOQUE' && <div className="tiny crit-txt">⛔ {w.motifBlocage}</div>}
      </td>
      <td className="nowrap">{codeMachine(d, w.machineId)}</td>
      <td className="small">{w.responsable || '—'}</td>
      <td className="nowrap">
        <span className="badge outline">{w.priorite}</span> <span className={`badge ${w.criticite === 'A' ? 'crit' : w.criticite === 'B' ? 'act' : ''}`}>{w.criticite}</span>
      </td>
      <td className="nowrap small">
        {fmtCourt(t.debutPrevu)} → {fmtCourt(t.finPrevue)}
      </td>
      <td className="nowrap small">
        {w.dateReelleDebut ? fmtCourt(w.dateReelleDebut) : <span className="muted">{fmtCourt(t.debutPrev)}</span>} → {w.dateReelleFin ? fmtCourt(w.dateReelleFin) : <span className="muted">{fmtCourt(t.finPrev)}</span>}
        {t.retardJours > 0 && <div><EcartBadge j={t.retardJours} /></div>}
      </td>
      <td className="num nowrap">
        {w.dureePrevueJours} / {t.dureeReelle ?? (w.dateReelleDebut ? `${diffDays(w.dateReelleDebut, today)}…` : '—')}
      </td>
      <td className="nowrap">{w.statut === 'TERMINE' ? <span className="muted">—</span> : t.critique ? <span className="badge crit">0 · critique</span> : <span className="badge">{t.marge} j</span>}</td>
      <td>
        <div style={{ position: 'relative', height: 18, background: 'var(--surface-2)', borderRadius: 3 }}>
          <div style={{ position: 'absolute', top: 2, height: 6, left: pct(t.debutPrevu), width: larg(t.debutPrevu, t.finPrevue), background: 'var(--bar-init)', borderRadius: 2 }} />
          <div
            style={{
              position: 'absolute',
              top: 10,
              height: 6,
              left: pct(w.dateReelleDebut ?? t.debutPrev),
              width: larg(w.dateReelleDebut ?? t.debutPrev, w.dateReelleFin ?? t.finPrev),
              background: w.statut === 'TERMINE' ? 'var(--bar-reel)' : t.critique ? 'var(--crit)' : 'var(--bar-plan)',
              borderRadius: 2,
              opacity: w.statut === 'A_FAIRE' ? 0.6 : 1,
            }}
          />
          {today >= origine && <div style={{ position: 'absolute', top: 0, bottom: 0, width: 1, left: pct(today), background: 'var(--crit)' }} />}
        </div>
      </td>
      <td>
        <span className={`badge ${w.statut === 'TERMINE' ? 'ok' : w.statut === 'BLOQUE' ? 'crit' : w.statut === 'EN_COURS' ? 'info' : t.enRetard ? 'act' : ''}`}>{STATUTS_TRAVAIL[w.statut]}</span>
      </td>
      <td className="small">{w.dependances.map((id) => a.travaux.taches.find((x) => x.travail.id === id)?.travail.code).join(', ') || '—'}</td>
      <td className="small nowrap">
        {pdrs.length ? (
          manquantes.length ? (
            <span className="crit-txt" title={manquantes.map((p) => `${p.pdr.ref} dispo ${fmtCourt(p.dispo)}`).join('\n')}>
              {manquantes.length}/{pdrs.length} manquante(s)
            </span>
          ) : (
            <span className="ok-txt">{pdrs.length} ✓</span>
          )
        ) : (
          <span className="muted">—</span>
        )}
      </td>
      <td className="nowrap">
        {exec && w.statut === 'A_FAIRE' && (
          <button className="btn sm" onClick={() => changer('EN_COURS', { dateReelleDebut: today }, 'démarré')}>
            Démarrer
          </button>
        )}
        {exec && w.statut === 'EN_COURS' && (
          <button className="btn sm primary" onClick={() => changer('TERMINE', { dateReelleFin: today }, 'terminé')}>
            Terminer
          </button>
        )}
        {exec && (w.statut === 'A_FAIRE' || w.statut === 'EN_COURS') && (
          <button className="btn sm" onClick={() => setBlocage(manquantes.length ? `PDR ${manquantes.map((p) => p.pdr.ref).join(', ')} non disponibles` : '')}>
            Bloquer
          </button>
        )}
        {exec && w.statut === 'BLOQUE' && (
          <button className="btn sm" onClick={() => changer(w.dateReelleDebut ? 'EN_COURS' : 'A_FAIRE', { motifBlocage: undefined, dateReelleDebut: w.dateReelleDebut ?? today }, 'débloqué')}>
            Débloquer
          </button>
        )}{' '}
        {(w.statut === 'BLOQUE' || (t.enRetard && t.critique)) && !(d.rca ?? []).some((x) => x.source.id === w.id) && <BoutonRca creer={(dd, an, td) => rcaDepuisTravail(dd, w, an, td)} />}
        {editable && peut('TECHNICIENS', a.revision.ligneId) && (
          <button className="btn sm ghost" onClick={onEdit} aria-label="Modifier">
            ✎
          </button>
        )}
        {blocage !== null && (
          <Modal
            titre={`Bloquer ${w.code}`}
            onClose={() => setBlocage(null)}
            pied={
              <>
                <button className="btn" onClick={() => setBlocage(null)}>
                  Annuler
                </button>
                <button
                  className="btn danger"
                  disabled={!blocage.trim()}
                  onClick={() => {
                    changer('BLOQUE', { motifBlocage: blocage }, `bloqué : ${blocage}`);
                    setBlocage(null);
                  }}
                >
                  Déclarer bloqué
                </button>
              </>
            }
          >
            <Champ label="Motif du blocage" req>
              <input type="text" value={blocage} onChange={(e) => setBlocage(e.target.value)} />
            </Champ>
          </Modal>
        )}
      </td>
    </tr>
  );
}

function ModalTravail({ a, initial, onClose }: { a: AnalyseRevision; initial: Travail; onClose: () => void }) {
  const { d, modifier, toast } = useStore();
  const [x, setX] = useState<Travail>(initial);
  const r = a.revision;
  const autres = a.travaux.taches.map((t) => t.travail).filter((t) => t.id !== x.id);
  const pdrsMachine = a.pdrs.filter((p) => !x.machineId || p.pdr.machineId === x.machineId);
  const ok = x.code.trim() && x.description.trim() && x.dureePrevueJours > 0;
  const valider = () => {
    const id = x.id || nouvelId(`${r.id}-T`);
    modifier({ entite: 'Travail', entiteId: id, revisionId: r.id, action: x.id ? 'MODIFICATION' : 'CREATION', detail: `${x.code} ${x.description} (${x.dureePrevueJours} j, dépend de ${x.dependances.length})` }, (dr) => {
      const i = dr.travaux.findIndex((y) => y.id === id);
      if (i >= 0) dr.travaux[i] = { ...x, id };
      else dr.travaux.push({ ...x, id });
    });
    toast('Travail enregistré — chemin critique recalculé');
    onClose();
  };
  const toggleIn = (liste: string[], v: string) => (liste.includes(v) ? liste.filter((y) => y !== v) : [...liste, v]);
  return (
    <Modal
      large
      titre={x.id ? `Travail ${x.code}` : 'Nouveau travail'}
      onClose={onClose}
      pied={
        <>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn primary" disabled={!ok} onClick={valider}>
            Enregistrer
          </button>
        </>
      }
    >
      <div className="form">
        <Champ label="Code" req>
          <input type="text" value={x.code} onChange={(e) => setX({ ...x, code: e.target.value })} />
        </Champ>
        <Champ label="Machine">
          <select value={x.machineId ?? ''} onChange={(e) => setX({ ...x, machineId: e.target.value || undefined })}>
            <option value="">— Ligne —</option>
            {d.machines
              .filter((m) => m.ligneId === r.ligneId)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} — {m.nom}
                </option>
              ))}
          </select>
        </Champ>
        <Champ label="Sous-ensemble">
          <input type="text" value={x.sousEnsemble} onChange={(e) => setX({ ...x, sousEnsemble: e.target.value })} />
        </Champ>
        <Champ label="Responsable">
          <input type="text" value={x.responsable} onChange={(e) => setX({ ...x, responsable: e.target.value })} />
        </Champ>
        <Champ label="Description" req full>
          <input type="text" value={x.description} onChange={(e) => setX({ ...x, description: e.target.value })} />
        </Champ>
        <Champ label="Priorité">
          <select value={x.priorite} onChange={(e) => setX({ ...x, priorite: e.target.value as Priorite })}>
            <option>P1</option>
            <option>P2</option>
            <option>P3</option>
          </select>
        </Champ>
        <Champ label="Criticité">
          <select value={x.criticite} onChange={(e) => setX({ ...x, criticite: e.target.value as Criticite })}>
            <option value="A">A — critique</option>
            <option value="B">B — importante</option>
            <option value="C">C — standard</option>
          </select>
        </Champ>
        <Champ label="Durée prévue (j)" req>
          <input type="number" min={0.5} step={0.5} value={x.dureePrevueJours} onChange={(e) => setX({ ...x, dureePrevueJours: Number(e.target.value) })} />
        </Champ>
        <Champ label="Début au plus tôt (J+)">
          <input type="number" min={0} value={x.decalageMinJours} onChange={(e) => setX({ ...x, decalageMinJours: Number(e.target.value) })} />
        </Champ>
        <Champ label="Statut">
          <select value={x.statut} onChange={(e) => setX({ ...x, statut: e.target.value as StatutTravail })}>
            {(Object.keys(STATUTS_TRAVAIL) as StatutTravail[]).map((s) => (
              <option key={s} value={s}>
                {STATUTS_TRAVAIL[s]}
              </option>
            ))}
          </select>
        </Champ>
        <Champ label="Date réelle début">
          <input type="date" value={x.dateReelleDebut ?? ''} onChange={(e) => setX({ ...x, dateReelleDebut: e.target.value || undefined })} />
        </Champ>
        <Champ label="Date réelle fin">
          <input type="date" value={x.dateReelleFin ?? ''} onChange={(e) => setX({ ...x, dateReelleFin: e.target.value || undefined })} />
        </Champ>
      </div>
      <div className="grid g2" style={{ marginTop: 12 }}>
        <div>
          <h3 style={{ marginBottom: 6 }}>Dépendances (prédécesseurs)</h3>
          <div className="col small" style={{ maxHeight: 200, overflowY: 'auto' }}>
            {autres.map((t) => (
              <label key={t.id} className="row" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={x.dependances.includes(t.id)} onChange={() => setX({ ...x, dependances: toggleIn(x.dependances, t.id) })} />
                <b>{t.code}</b> {t.description}
              </label>
            ))}
          </div>
        </div>
        <div>
          <h3 style={{ marginBottom: 6 }}>PDR nécessaires</h3>
          <div className="col small" style={{ maxHeight: 200, overflowY: 'auto' }}>
            {pdrsMachine.map((p) => (
              <label key={p.pdr.id} className="row" style={{ cursor: 'pointer' }}>
                <input type="checkbox" checked={x.pdrIds.includes(p.pdr.id)} onChange={() => setX({ ...x, pdrIds: toggleIn(x.pdrIds, p.pdr.id) })} />
                <span className="mono">{p.pdr.ref}</span> {p.pdr.designation} {p.disponible ? <span className="ok-txt">✓</span> : <span className="muted">dispo {fmtCourt(p.dispo)}</span>}
              </label>
            ))}
            {!pdrsMachine.length && <span className="muted">Aucune PDR pour cette machine.</span>}
          </div>
        </div>
      </div>
    </Modal>
  );
}
