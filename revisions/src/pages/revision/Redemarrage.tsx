import { useState } from 'react';
import type { AnalyseRevision } from '../../domain/analyse';
import { codeMachine } from '../../domain/arbo';
import { diffHours, fmt, fmtDateHeure } from '../../domain/dates';
import { JOURS_STABLES_REQUIS } from '../../domain/redemarrage';
import { JALONS, ROLES } from '../../domain/referentiel';
import type { IncidentRedemarrage, JalonRedemarrage, StabilisationJour } from '../../domain/types';
import { nouvelId, useStore } from '../../store/store';
import { Card, Champ, EcartBadge, Modal, RoleBadge, Vide } from '../../ui/kit';
import { BoutonRca, rcaDepuisIncident } from '../Rca';

export function OngletRedemarrage({ a }: { a: AnalyseRevision }) {
  const { peut, modifier, toast, today } = useStore();
  const r = a.revision;
  const [inc, setInc] = useState<IncidentRedemarrage | null>(null);
  const { d } = useStore();
  const incidents = d.incidents.filter((i) => i.revisionId === r.id);
  const majJalon = (cle: JalonRedemarrage, champ: 'prevu' | 'reel', v: string) => {
    modifier({ entite: 'Redémarrage', entiteId: r.id, revisionId: r.id, action: 'JALON', detail: `${JALONS.find((j) => j.cle === cle)!.libelle} — ${champ}`, avant: r.jalons[cle]?.[champ], apres: v || '(vide)' }, (dr) => {
      const x = dr.revisions.find((y) => y.id === r.id)!;
      x.jalons[cle] = { ...x.jalons[cle], [champ]: v || undefined };
    });
  };
  const rd = a.redemarrage;
  return (
    <div className="stack">
      <div className="grid g4">
        <div className="card tile">
          <span className="lbl">Temps prévu (démarrage → 1re conforme)</span>
          <span className="val">{rd.dureePrevueH} h</span>
        </div>
        <div className="card tile">
          <span className="lbl">Temps réel</span>
          <span className="val">{rd.dureeReelleH ?? '—'}{rd.dureeReelleH !== undefined && <small>h</small>}</span>
        </div>
        <div className={`card tile ${(rd.depassementH ?? 0) > 0 ? 'crit' : 'ok'}`}>
          <span className="lbl">Dépassement</span>
          <span className="val">{rd.depassementH !== undefined ? `${rd.depassementH > 0 ? '+' : ''}${rd.depassementH}` : '—'}{rd.depassementH !== undefined && <small>h</small>}</span>
        </div>
        <div className={`card tile ${rd.nbIncidents ? 'act' : 'ok'}`}>
          <span className="lbl">Incidents de redémarrage</span>
          <span className="val">{rd.nbIncidents}</span>
          <span className="det">{rd.heuresIncidents} h supplémentaires · {rd.difficile ? 'redémarrage difficile' : 'redémarrage nominal'}</span>
        </div>
      </div>
      <Card titre="Jalons du redémarrage — prévu / réel" tight>
        <div className="tbl-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Jalon</th>
                <th>Responsable</th>
                <th>Prévu</th>
                <th>Réel</th>
                <th>Écart</th>
              </tr>
            </thead>
            <tbody>
              {JALONS.map((j) => {
                const v = r.jalons[j.cle];
                const domaine = j.responsable === 'PRODUCTION' ? 'PRODUCTION' : 'REDEMARRAGE';
                const ed = peut(domaine, r.ligneId);
                const ecart = v?.prevu && v?.reel ? diffHours(v.prevu, v.reel) : undefined;
                return (
                  <tr key={j.cle}>
                    <td className="b">{j.libelle}</td>
                    <td>
                      <RoleBadge r={j.responsable} />
                    </td>
                    <td>{ed ? <input type="datetime-local" value={v?.prevu ?? ''} onChange={(e) => majJalon(j.cle, 'prevu', e.target.value)} aria-label={`${j.libelle} prévu`} /> : fmtDateHeure(v?.prevu)}</td>
                    <td>
                      {ed ? (
                        <div className="row" style={{ flexWrap: 'nowrap' }}>
                          <input type="datetime-local" value={v?.reel ?? ''} onChange={(e) => majJalon(j.cle, 'reel', e.target.value)} aria-label={`${j.libelle} réel`} />
                          {!v?.reel && (
                            <button className="btn sm" onClick={() => majJalon(j.cle, 'reel', `${today}T${new Date().toTimeString().slice(0, 5)}`)}>
                              Maintenant
                            </button>
                          )}
                        </div>
                      ) : (
                        fmtDateHeure(v?.reel)
                      )}
                    </td>
                    <td>{ecart !== undefined ? <EcartBadge j={Math.round(ecart * 10) / 10} unite="h" /> : <span className="muted">—</span>}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="tiny muted" style={{ padding: '8px 14px' }}>
          Chaque jalon a un seul responsable : Maintenance pour la fin des travaux, l'autorisation et la fin de stabilisation ; Production pour le démarrage et la première production (conforme).
        </p>
      </Card>
      <Card
        titre="Incidents de redémarrage"
        actions={
          peut('REDEMARRAGE', r.ligneId) ? (
            <button
              className="btn primary sm"
              onClick={() =>
                setInc({ id: '', revisionId: r.id, date: today, heure: new Date().toTimeString().slice(0, 5), probleme: '', symptome: '', cause: '', actionCorrective: '', dureeSupH: 1, responsable: d.utilisateurs.find((u) => u.id === r.responsableId)?.nom ?? '', impact: 'MOYEN', commentaire: '' })
              }
            >
              + Déclarer un incident
            </button>
          ) : null
        }
        tight
      >
        {incidents.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Machine</th>
                  <th>Problème</th>
                  <th>Symptôme</th>
                  <th>Cause</th>
                  <th>Action corrective</th>
                  <th className="num">+ Durée</th>
                  <th>Responsable</th>
                  <th>Impact</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {incidents.map((i) => (
                  <tr key={i.id}>
                    <td className="nowrap">
                      {fmt(i.date)} {i.heure}
                    </td>
                    <td>{codeMachine(d, i.machineId)}</td>
                    <td className="b">{i.probleme}</td>
                    <td>{i.symptome}</td>
                    <td>{i.cause}</td>
                    <td>{i.actionCorrective}</td>
                    <td className="num">{i.dureeSupH} h</td>
                    <td>{i.responsable}</td>
                    <td>
                      <span className={`badge ${i.impact === 'FORT' ? 'crit' : i.impact === 'MOYEN' ? 'act' : 'vig'}`}>{i.impact}</span>
                    </td>
                    <td className="nowrap">
                      {(() => {
                        const rca = (d.rca ?? []).find((x) => x.source.id === i.id);
                        return rca ? (
                          <a className="btn sm" href={`#/rca/${rca.id}`}>
                            🔍 {rca.code}
                          </a>
                        ) : (
                          <BoutonRca creer={(dd, an, t) => rcaDepuisIncident(dd, i, an, t)} />
                        );
                      })()}{' '}
                      {peut('REDEMARRAGE', r.ligneId) && (
                        <button className="btn sm ghost" onClick={() => setInc(i)}>
                          ✎
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Vide>Aucun incident de redémarrage.</Vide>
        )}
      </Card>
      {inc && (
        <ModalIncident
          initial={inc}
          onClose={() => setInc(null)}
          onSave={(x) => {
            const id = x.id || nouvelId('INC');
            modifier({ entite: 'Incident redémarrage', entiteId: id, revisionId: r.id, action: x.id ? 'MODIFICATION' : 'DECLARATION', detail: `${x.probleme} (+${x.dureeSupH} h, impact ${x.impact})` }, (dr) => {
              const k = dr.incidents.findIndex((y) => y.id === id);
              if (k >= 0) dr.incidents[k] = { ...x, id };
              else dr.incidents.push({ ...x, id });
            });
            toast('Incident enregistré — Maintenance responsable, Production informée');
            setInc(null);
          }}
        />
      )}
    </div>
  );
}

function ModalIncident({ initial, onClose, onSave }: { initial: IncidentRedemarrage; onClose: () => void; onSave: (x: IncidentRedemarrage) => void }) {
  const { d } = useStore();
  const [x, setX] = useState(initial);
  const rev = d.revisions.find((r) => r.id === x.revisionId)!;
  const t = (k: keyof IncidentRedemarrage) => (e: { target: { value: string } }) => setX({ ...x, [k]: e.target.value });
  return (
    <Modal
      large
      titre="Incident de redémarrage"
      onClose={onClose}
      pied={
        <>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn primary" disabled={!x.probleme.trim()} onClick={() => onSave(x)}>
            Enregistrer
          </button>
        </>
      }
    >
      <div className="form">
        <Champ label="Ligne">
          <input type="text" value={d.lignes.find((l) => l.id === rev.ligneId)?.nom ?? ''} disabled />
        </Champ>
        <Champ label="Machine">
          <select value={x.machineId ?? ''} onChange={(e) => setX({ ...x, machineId: e.target.value || undefined })}>
            <option value="">—</option>
            {d.machines
              .filter((m) => m.ligneId === rev.ligneId)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} — {m.nom}
                </option>
              ))}
          </select>
        </Champ>
        <Champ label="Date" req>
          <input type="date" value={x.date} onChange={t('date')} />
        </Champ>
        <Champ label="Heure">
          <input type="time" value={x.heure} onChange={t('heure')} />
        </Champ>
        <Champ label="Problème" req full>
          <input type="text" value={x.probleme} onChange={t('probleme')} />
        </Champ>
        <Champ label="Symptôme" full>
          <input type="text" value={x.symptome} onChange={t('symptome')} />
        </Champ>
        <Champ label="Cause" full>
          <input type="text" value={x.cause} onChange={t('cause')} />
        </Champ>
        <Champ label="Action corrective" full>
          <input type="text" value={x.actionCorrective} onChange={t('actionCorrective')} />
        </Champ>
        <Champ label="Durée supplémentaire (h)">
          <input type="number" min={0} step={0.5} value={x.dureeSupH} onChange={(e) => setX({ ...x, dureeSupH: Number(e.target.value) })} />
        </Champ>
        <Champ label="Responsable">
          <input type="text" value={x.responsable} onChange={t('responsable')} />
        </Champ>
        <Champ label="Impact">
          <select value={x.impact} onChange={t('impact')}>
            <option value="FAIBLE">Faible</option>
            <option value="MOYEN">Moyen</option>
            <option value="FORT">Fort</option>
          </select>
        </Champ>
        <Champ label="Commentaire" full>
          <textarea value={x.commentaire} onChange={t('commentaire')} />
        </Champ>
      </div>
    </Modal>
  );
}

export function OngletStabilisation({ a }: { a: AnalyseRevision }) {
  const { d, peut, modifier, toast, today } = useStore();
  const r = a.revision;
  const s = a.stabilisation;
  const jours = d.stabilisation.filter((x) => x.revisionId === r.id).sort((p, q) => p.date.localeCompare(q.date));
  const vide: StabilisationJour = { id: '', revisionId: r.id, date: today, arrets: 0, microArrets: 0, defauts: 0, vitessePct: r.cibleVitessePct, qualitePct: r.cibleQualitePct, interventions: 0, trsPct: 80 };
  const [x, setX] = useState<StabilisationJour | null>(null);
  const ed = peut('STABILISATION', r.ligneId);
  return (
    <div className="stack">
      <div className="grid g4">
        <div className="card tile">
          <span className="lbl">Stabilisation prévue / réelle</span>
          <span className="val">
            {s.dureePrevueJ} / {s.dureeReelleJ ?? '—'}
            <small>j</small>
          </span>
          {s.depassementJ !== undefined && <span className="det">Écart <EcartBadge j={s.depassementJ} /></span>}
        </div>
        <div className={`card tile ${s.stabilisee ? 'ok' : 'act'}`}>
          <span className="lbl">État</span>
          <span className="val" style={{ fontSize: 18 }}>
            {s.stabilisee ? 'Stabilisée' : jours.length ? 'En stabilisation' : '—'}
          </span>
          <span className="det">
            {s.joursConformesConsecutifs}/{JOURS_STABLES_REQUIS} jours consécutifs aux cibles (vitesse ≥ {r.cibleVitessePct} %, qualité ≥ {r.cibleQualitePct} %)
          </span>
        </div>
        <div className="card tile">
          <span className="lbl">TRS moyen</span>
          <span className="val">
            {s.moyTrs ?? '—'}
            {s.moyTrs !== undefined && <small>%</small>}
          </span>
        </div>
        <div className="card tile">
          <span className="lbl">Arrêts / micro-arrêts / défauts</span>
          <span className="val" style={{ fontSize: 18 }}>
            {s.totalArrets} / {s.totalMicroArrets} / {s.totalDefauts}
          </span>
        </div>
      </div>
      <Card
        titre="Suivi après redémarrage"
        sub={`Responsable : ${ROLES.MAINTENANCE.court} (stabilisation technique) · Production informée`}
        actions={
          ed ? (
            <button className="btn primary sm" onClick={() => setX(vide)}>
              + Relevé du jour
            </button>
          ) : null
        }
        tight
      >
        {jours.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th className="num">Arrêts</th>
                  <th className="num">Micro-arrêts</th>
                  <th className="num">Défauts</th>
                  <th className="num">Vitesse</th>
                  <th className="num">Qualité</th>
                  <th className="num">Interventions</th>
                  <th className="num">Performance (TRS)</th>
                  <th>Cibles</th>
                </tr>
              </thead>
              <tbody>
                {jours.map((j) => {
                  const okJ = j.vitessePct >= r.cibleVitessePct && j.qualitePct >= r.cibleQualitePct;
                  return (
                    <tr key={j.id} className={ed ? 'click' : ''} onClick={() => ed && setX(j)}>
                      <td className="nowrap">{fmt(j.date)}</td>
                      <td className="num">{j.arrets}</td>
                      <td className="num">{j.microArrets}</td>
                      <td className="num">{j.defauts}</td>
                      <td className={`num ${j.vitessePct < r.cibleVitessePct ? 'act-txt' : ''}`}>{j.vitessePct} %</td>
                      <td className={`num ${j.qualitePct < r.cibleQualitePct ? 'act-txt' : ''}`}>{j.qualitePct} %</td>
                      <td className="num">{j.interventions}</td>
                      <td className="num">{j.trsPct} %</td>
                      <td>{okJ ? <span className="badge ok">Atteintes</span> : <span className="badge act">Non</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Vide>Aucun relevé : la stabilisation démarre à la première production conforme.</Vide>
        )}
      </Card>
      {x && (
        <Modal
          titre={`Relevé de stabilisation — ${fmt(x.date)}`}
          onClose={() => setX(null)}
          pied={
            <>
              <button className="btn" onClick={() => setX(null)}>
                Annuler
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  const id = x.id || nouvelId('STB');
                  modifier({ entite: 'Stabilisation', entiteId: id, revisionId: r.id, action: x.id ? 'MODIFICATION' : 'RELEVE', detail: `${x.date} : vitesse ${x.vitessePct} %, qualité ${x.qualitePct} %, ${x.arrets} arrêts` }, (dr) => {
                    const k = dr.stabilisation.findIndex((y) => y.id === id);
                    if (k >= 0) dr.stabilisation[k] = { ...x, id };
                    else dr.stabilisation.push({ ...x, id });
                  });
                  toast('Relevé enregistré');
                  setX(null);
                }}
              >
                Enregistrer
              </button>
            </>
          }
        >
          <div className="form">
            <Champ label="Date">
              <input type="date" value={x.date} onChange={(e) => setX({ ...x, date: e.target.value })} />
            </Champ>
            {(
              [
                ['arrets', 'Arrêts'],
                ['microArrets', 'Micro-arrêts'],
                ['defauts', 'Défauts'],
                ['vitessePct', 'Vitesse (%)'],
                ['qualitePct', 'Qualité (%)'],
                ['interventions', 'Interventions'],
                ['trsPct', 'Performance / TRS (%)'],
              ] as const
            ).map(([k, l]) => (
              <Champ key={k} label={l}>
                <input type="number" value={x[k]} onChange={(e) => setX({ ...x, [k]: Number(e.target.value) })} />
              </Champ>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
