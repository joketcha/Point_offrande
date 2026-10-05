import { useState } from 'react';
import { fmtCourt } from '../domain/dates';
import { STATUTS } from '../domain/referentiel';
import { useStore } from '../store/store';
import { Card, EcartBadge, StatutBadge, Tabs, Vide, aller } from '../ui/kit';
import { OngletRedemarrage, OngletStabilisation } from './revision/Redemarrage';

export default function Redemarrage() {
  const { analyses, visible } = useStore();
  const vis = analyses.filter((a) => visible(a.revision.ligneId) && a.revision.statut !== 'ANNULEE');
  const actives = vis.filter((a) => ['EN_COURS', 'TRAVAUX_TERMINES', 'PRETE_REDEMARRAGE', 'REDEMARRAGE', 'STABILISATION'].includes(a.revision.statut));
  const [sel, setSel] = useState(actives[0]?.revision.id ?? '');
  const [vue, setVue] = useState<'redem' | 'stab'>('redem');
  const a = vis.find((x) => x.revision.id === sel);
  const historiques = vis.filter((x) => x.redemarrage.dureeReelleH !== undefined);
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Redémarrage & stabilisation</h1>
          <div className="sub">Fin travaux → autorisation → démarrage → première production → première production conforme → stabilisation.</div>
        </div>
      </div>
      <Card titre="Lignes en exécution ou en redémarrage" tight>
        {actives.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Révision</th>
                  <th>Statut</th>
                  <th>Fin prévue</th>
                  <th>Fin prévisionnelle</th>
                  <th>Redémarrage prévisionnel</th>
                  <th>Tenable ?</th>
                  <th>Incidents</th>
                </tr>
              </thead>
              <tbody>
                {actives.map((x) => (
                  <tr key={x.revision.id} className={`click ${x.revision.id === sel ? 'sel' : ''}`} onClick={() => setSel(x.revision.id)}>
                    <td className="b">{x.revision.code}</td>
                    <td>
                      <StatutBadge s={x.revision.statut} />
                    </td>
                    <td>{fmtCourt(x.finPrevue)}</td>
                    <td>
                      {fmtCourt(x.finPrevisionnelle)} <EcartBadge j={x.ecartFin} />
                    </td>
                    <td>{fmtCourt(x.redemarragePrevisionnel)}</td>
                    <td>{x.redemarrageTenable ? <span className="badge ok">Oui</span> : <span className="badge crit">À risque</span>}</td>
                    <td>{x.redemarrage.nbIncidents}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Vide>Aucune ligne en redémarrage actuellement.</Vide>
        )}
      </Card>
      <div className="filters">
        <span className="small muted">Révision :</span>
        <select value={sel} onChange={(e) => setSel(e.target.value)} aria-label="Révision">
          <option value="">—</option>
          {vis
            .filter((x) => !['PLANIFIEE', 'PREPARATION'].includes(x.revision.statut) && STATUTS[x.revision.statut].ordre >= 5)
            .map((x) => (
              <option key={x.revision.id} value={x.revision.id}>
                {x.revision.code} — {STATUTS[x.revision.statut].libelle}
              </option>
            ))}
        </select>
        {a && (
          <button className="btn sm" onClick={() => aller(`revision/${a.revision.id}`)}>
            Ouvrir la révision
          </button>
        )}
      </div>
      {a && (
        <>
          <Tabs
            value={vue}
            onChange={setVue}
            items={[
              { id: 'redem', label: 'Redémarrage' },
              { id: 'stab', label: 'Stabilisation' },
            ]}
          />
          {vue === 'redem' ? <OngletRedemarrage a={a} /> : <OngletStabilisation a={a} />}
        </>
      )}
      <Card titre="Historique des redémarrages — prévu / réel / dépassement" tight>
        {historiques.length ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>Révision</th>
                <th className="num">Prévu</th>
                <th className="num">Réel</th>
                <th>Dépassement</th>
                <th className="num">Incidents</th>
                <th className="num">Stabilisation prévue / réelle</th>
              </tr>
            </thead>
            <tbody>
              {historiques.map((x) => (
                <tr key={x.revision.id} className="click" onClick={() => aller(`revision/${x.revision.id}/redemarrage`)}>
                  <td className="b">{x.revision.code}</td>
                  <td className="num">{x.redemarrage.dureePrevueH} h</td>
                  <td className="num">{x.redemarrage.dureeReelleH} h</td>
                  <td>
                    <EcartBadge j={x.redemarrage.depassementH} unite="h" />
                  </td>
                  <td className="num">
                    {x.redemarrage.nbIncidents} ({x.redemarrage.heuresIncidents} h)
                  </td>
                  <td className="num">
                    {x.stabilisation.dureePrevueJ} / {x.stabilisation.dureeReelleJ ?? '—'} j
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Vide>Aucun redémarrage historisé.</Vide>
        )}
      </Card>
    </div>
  );
}
