import { useState } from 'react';
import { codeMachine } from '../domain/arbo';
import { fmtCourt } from '../domain/dates';
import { STATUTS, STATUTS_TRAVAIL } from '../domain/referentiel';
import type { StatutTravail } from '../domain/types';
import { useStore } from '../store/store';
import { Card, EcartBadge, Tile, Vide, aller } from '../ui/kit';

export default function Travaux() {
  const { d, analyses, visible } = useStore();
  const [statut, setStatut] = useState<'' | StatutTravail | 'RETARD' | 'CRITIQUE'>('');
  const [rev, setRev] = useState('');
  const vis = analyses.filter((a) => visible(a.revision.ligneId) && a.travaux.taches.length && STATUTS[a.revision.statut].phase !== 'clos');
  const toutes = vis.flatMap((a) => a.travaux.taches.map((t) => ({ t, a })));
  const lignes = toutes
    .filter(({ a }) => !rev || a.revision.id === rev)
    .filter(({ t }) => !statut || (statut === 'RETARD' ? t.enRetard && t.travail.statut !== 'TERMINE' : statut === 'CRITIQUE' ? t.critique : t.travail.statut === statut))
    .sort((x, y) => Number(y.t.critique) - Number(x.t.critique) || y.t.retardJours - x.t.retardJours);
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Travaux</h1>
          <div className="sub">Toutes révisions ouvertes : avancement, retards, blocages et chemin critique. La saisie se fait dans l'onglet Travaux de chaque révision.</div>
        </div>
      </div>
      <div className="grid g4">
        <Tile lbl="Terminés" val={toutes.filter((x) => x.t.travail.statut === 'TERMINE').length} cls="ok" />
        <Tile lbl="En cours" val={toutes.filter((x) => x.t.travail.statut === 'EN_COURS').length} />
        <Tile lbl="En retard" val={toutes.filter((x) => x.t.enRetard && x.t.travail.statut !== 'TERMINE').length} cls="crit" onClick={() => setStatut('RETARD')} />
        <Tile lbl="Bloqués" val={toutes.filter((x) => x.t.travail.statut === 'BLOQUE').length} cls="act" onClick={() => setStatut('BLOQUE')} />
      </div>
      <div className="filters">
        <select value={rev} onChange={(e) => setRev(e.target.value)} aria-label="Révision">
          <option value="">Toutes révisions</option>
          {vis.map((a) => (
            <option key={a.revision.id} value={a.revision.id}>
              {a.revision.code}
            </option>
          ))}
        </select>
        <select value={statut} onChange={(e) => setStatut(e.target.value as typeof statut)} aria-label="Statut">
          <option value="">Tous</option>
          <option value="CRITIQUE">Chemin critique</option>
          <option value="RETARD">En retard</option>
          {(Object.keys(STATUTS_TRAVAIL) as StatutTravail[]).map((s) => (
            <option key={s} value={s}>
              {STATUTS_TRAVAIL[s]}
            </option>
          ))}
        </select>
      </div>
      <Card tight>
        {lignes.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Révision</th>
                  <th>Code</th>
                  <th>Travail</th>
                  <th>Machine</th>
                  <th>Responsable</th>
                  <th>Prévu</th>
                  <th>Prévision / réel</th>
                  <th>Retard</th>
                  <th>Marge</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map(({ t, a }) => (
                  <tr key={t.travail.id} className={`click ${t.critique ? 'sel' : ''}`} onClick={() => aller(`revision/${a.revision.id}/travaux`)}>
                    <td className="b nowrap">{a.revision.code}</td>
                    <td className={`b ${t.critique ? 'crit-txt' : ''}`}>{t.travail.code}</td>
                    <td>
                      {t.travail.description}
                      {t.travail.statut === 'BLOQUE' && <div className="tiny crit-txt">⛔ {t.travail.motifBlocage}</div>}
                    </td>
                    <td>{codeMachine(d, t.travail.machineId)}</td>
                    <td className="small">{t.travail.responsable}</td>
                    <td className="nowrap small">
                      {fmtCourt(t.debutPrevu)} → {fmtCourt(t.finPrevue)}
                    </td>
                    <td className="nowrap small">
                      {fmtCourt(t.travail.dateReelleDebut ?? t.debutPrev)} → {fmtCourt(t.travail.dateReelleFin ?? t.finPrev)}
                    </td>
                    <td>{t.retardJours ? <EcartBadge j={t.retardJours} /> : <span className="muted">—</span>}</td>
                    <td>{t.travail.statut === 'TERMINE' ? '—' : t.critique ? <span className="badge crit">critique</span> : `${t.marge} j`}</td>
                    <td>
                      <span className={`badge ${t.travail.statut === 'TERMINE' ? 'ok' : t.travail.statut === 'BLOQUE' ? 'crit' : t.travail.statut === 'EN_COURS' ? 'info' : ''}`}>{STATUTS_TRAVAIL[t.travail.statut]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Vide>Aucun travail pour ces filtres.</Vide>
        )}
      </Card>
    </div>
  );
}
