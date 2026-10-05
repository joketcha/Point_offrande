import { useState } from 'react';
import type { AnalyseRevision, InterventionAnalyse } from '../../domain/analyse';
import { codeMachine } from '../../domain/arbo';
import { addDays, diffDays, fmt, fmtCourt } from '../../domain/dates';
import { CRITERES, STATUTS_INTERVENTION } from '../../domain/referentiel';
import { MESSAGE_TECHNICIEN_AVANT_PDR, noteGlobale } from '../../domain/techniciens';
import type { CritereEvaluation, Evaluation, Intervention, StatutIntervention } from '../../domain/types';
import { nouvelId, useStore } from '../../store/store';
import { Card, Champ, Modal, Vide, fmtMontant } from '../../ui/kit';

export function TableInterventions({ items, avecRevision }: { items: (InterventionAnalyse & { revisionCode?: string; revisionId?: string })[]; avecRevision?: boolean }) {
  const { d, peut } = useStore();
  const [edit, setEdit] = useState<Intervention | null>(null);
  const [evalIt, setEvalIt] = useState<Intervention | null>(null);
  if (!items.length) return <Vide>Aucun technicien extérieur planifié.</Vide>;
  return (
    <>
      <div className="tbl-wrap">
        <table className="tbl">
          <thead>
            <tr>
              {avecRevision && <th>Révision</th>}
              <th>Entreprise / technicien</th>
              <th>Spécialité</th>
              <th>Machine</th>
              <th>Intervention</th>
              <th>Arrivée prévue</th>
              <th>Réelle</th>
              <th className="num">Durée</th>
              <th className="num">Coût</th>
              <th>Statut</th>
              <th>Contrôle PDR</th>
              <th>Évaluation</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {items.map(({ intervention: i, controle, note, revisionCode }) => {
              const rev = d.revisions.find((r) => r.id === i.revisionId)!;
              const edite = peut('TECHNICIENS', rev.ligneId);
              return (
                <tr key={i.id}>
                  {avecRevision && (
                    <td className="b nowrap">
                      <a href={`#/revision/${i.revisionId}/techniciens`}>{revisionCode}</a>
                    </td>
                  )}
                  <td>
                    <b>{i.entreprise}</b>
                    <div className="tiny muted">{i.technicien}</div>
                  </td>
                  <td>{i.specialite}</td>
                  <td className="nowrap">{codeMachine(d, i.machineId)}</td>
                  <td>{i.intervention}</td>
                  <td className="nowrap">{fmtCourt(i.datePrevue)}</td>
                  <td className="nowrap">
                    {fmtCourt(i.dateReelle)}
                    {i.dateReelle && i.dateReelle !== i.datePrevue && <div className="tiny act-txt">{diffDays(i.datePrevue, i.dateReelle) > 0 ? '+' : ''}{diffDays(i.datePrevue, i.dateReelle)} j</div>}
                  </td>
                  <td className="num">{i.dureeJours} j</td>
                  <td className="num nowrap">{fmtMontant(i.cout, i.devise)}</td>
                  <td>
                    <span className={`badge ${i.statut === 'CONFIRME' || i.statut === 'SUR_SITE' ? 'ok' : i.statut === 'TERMINEE' ? 'info' : i.statut === 'ANNULEE' ? 'outline' : 'act'}`}>{STATUTS_INTERVENTION[i.statut]}</span>
                  </td>
                  <td className="small">
                    {controle.enRisque ? (
                      <span className="crit-txt" title={controle.bloquantes.map((b) => `${b.pdr.ref} dispo ${fmtCourt(b.dispo)} (+${b.ecart} j)`).join('\n')}>
                        {MESSAGE_TECHNICIEN_AVANT_PDR}
                        <div className="tiny">
                          PDR prêtes le {fmtCourt(controle.dateDispoMax)} ({controle.bloquantes.map((b) => b.pdr.ref).join(', ')})
                        </div>
                      </span>
                    ) : i.statut === 'TERMINEE' || i.statut === 'ANNULEE' ? (
                      <span className="muted">—</span>
                    ) : (
                      <span className="ok-txt">✓ PDR prêtes {controle.dateDispoMax ? `(${fmtCourt(controle.dateDispoMax)})` : ''}</span>
                    )}
                  </td>
                  <td className="nowrap">
                    {note !== undefined ? (
                      <span className={`badge ${note >= 4 ? 'ok' : note >= 3 ? 'vig' : 'crit'}`}>{note}/5</span>
                    ) : i.statut === 'TERMINEE' ? (
                      <span className="badge act">À évaluer</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td className="nowrap">
                    {edite && (
                      <>
                        <button className="btn sm" onClick={() => setEdit(i)}>
                          Modifier
                        </button>{' '}
                        {i.statut === 'TERMINEE' && (
                          <button className="btn sm primary" onClick={() => setEvalIt(i)}>
                            {i.evaluation ? 'Évaluation' : 'Évaluer'}
                          </button>
                        )}
                      </>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {edit && <ModalIntervention initial={edit} onClose={() => setEdit(null)} />}
      {evalIt && <ModalEvaluation it={evalIt} onClose={() => setEvalIt(null)} />}
    </>
  );
}

export function OngletTechniciens({ a }: { a: AnalyseRevision }) {
  const { peut, d } = useStore();
  const [nouveau, setNouveau] = useState(false);
  const r = a.revision;
  return (
    <div className="stack">
      <div className="alert INFO small">
        <span>
          Règle : un technicien extérieur ne doit pas être planifié avant la disponibilité des PDR nécessaires (même machine ; à défaut, PDR critiques de la révision). PDR critiques disponibles au plus tard le{' '}
          <b>{fmt(a.pdrStats.dispoMaxCritiques)}</b>.
        </span>
      </div>
      <Card
        titre="Techniciens extérieurs"
        sub={`${a.techStats.confirmes}/${a.techStats.prevus} confirmés · ${a.techStats.evalues} évalués`}
        actions={
          peut('TECHNICIENS', r.ligneId) ? (
            <button className="btn primary sm" onClick={() => setNouveau(true)}>
              + Planifier un technicien
            </button>
          ) : null
        }
        tight
      >
        <TableInterventions items={a.interventions} />
      </Card>
      {nouveau && (
        <ModalIntervention
          initial={{
            id: '',
            revisionId: r.id,
            entreprise: '',
            technicien: '',
            specialite: '',
            machineId: d.machines.find((m) => m.ligneId === r.ligneId)?.id,
            intervention: '',
            datePrevue: r.datePrevue,
            dureeJours: 3,
            cout: 0,
            devise: d.parametres.devise,
            statut: 'A_PLANIFIER',
          }}
          onClose={() => setNouveau(false)}
        />
      )}
    </div>
  );
}

function ModalIntervention({ initial, onClose }: { initial: Intervention; onClose: () => void }) {
  const { d, modifier, toast, analyse } = useStore();
  const [x, setX] = useState<Intervention>(initial);
  const rev = d.revisions.find((r) => r.id === x.revisionId)!;
  const a = analyse(rev.id)!;
  // Contrôle en direct de la règle techniciens / PDR.
  const concernees = a.pdrs.filter((p) => !p.pdr.horsGamme && (x.machineId ? p.pdr.machineId === x.machineId : p.pdr.criticite === 'A'));
  const arrivee = x.dateReelle ?? x.datePrevue;
  const bloquantes = concernees.filter((p) => p.dispo > arrivee);
  const dispoMax = concernees.map((p) => p.dispo).sort().at(-1);
  const ok = x.entreprise.trim() && x.intervention.trim() && x.datePrevue;
  const valider = () => {
    const id = x.id || nouvelId('INT');
    modifier(
      {
        entite: 'Technicien',
        entiteId: id,
        revisionId: x.revisionId,
        action: x.id ? 'MODIFICATION' : 'PLANIFICATION',
        detail: `${x.entreprise} (${x.technicien || '—'}) — ${x.intervention} — ${STATUTS_INTERVENTION[x.statut]}, arrivée ${fmt(x.datePrevue)}${bloquantes.length ? ' — RISQUE : avant PDR' : ''}`,
        avant: x.id ? `${STATUTS_INTERVENTION[initial.statut]} ${initial.datePrevue}` : undefined,
        apres: `${STATUTS_INTERVENTION[x.statut]} ${x.datePrevue}`,
      },
      (dr) => {
        const i = dr.interventions.findIndex((y) => y.id === id);
        if (i >= 0) dr.interventions[i] = { ...x, id };
        else dr.interventions.push({ ...x, id });
      },
    );
    toast(bloquantes.length ? MESSAGE_TECHNICIEN_AVANT_PDR : 'Technicien enregistré', bloquantes.length ? 'erreur' : 'ok');
    onClose();
  };
  return (
    <Modal
      titre={x.id ? `Technicien — ${x.entreprise}` : 'Planifier un technicien extérieur'}
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
        <Champ label="Entreprise" req>
          <input type="text" value={x.entreprise} onChange={(e) => setX({ ...x, entreprise: e.target.value })} />
        </Champ>
        <Champ label="Technicien">
          <input type="text" value={x.technicien} onChange={(e) => setX({ ...x, technicien: e.target.value })} />
        </Champ>
        <Champ label="Spécialité">
          <input type="text" value={x.specialite} onChange={(e) => setX({ ...x, specialite: e.target.value })} />
        </Champ>
        <Champ label="Machine">
          <select value={x.machineId ?? ''} onChange={(e) => setX({ ...x, machineId: e.target.value || undefined })}>
            <option value="">— Toute la ligne —</option>
            {d.machines
              .filter((m) => m.ligneId === rev.ligneId)
              .map((m) => (
                <option key={m.id} value={m.id}>
                  {m.code} — {m.nom}
                </option>
              ))}
          </select>
        </Champ>
        <Champ label="Intervention" req full>
          <input type="text" value={x.intervention} onChange={(e) => setX({ ...x, intervention: e.target.value })} />
        </Champ>
        <Champ label="Date d'arrivée prévue" req>
          <input type="date" value={x.datePrevue} onChange={(e) => setX({ ...x, datePrevue: e.target.value })} />
        </Champ>
        <Champ label="Date d'arrivée réelle">
          <input type="date" value={x.dateReelle ?? ''} onChange={(e) => setX({ ...x, dateReelle: e.target.value || undefined })} />
        </Champ>
        <Champ label="Durée (j)">
          <input type="number" min={1} value={x.dureeJours} onChange={(e) => setX({ ...x, dureeJours: Number(e.target.value) })} />
        </Champ>
        <Champ label={`Coût (${x.devise})`}>
          <input type="number" min={0} value={x.cout} onChange={(e) => setX({ ...x, cout: Number(e.target.value) })} />
        </Champ>
        <Champ label="Statut">
          <select value={x.statut} onChange={(e) => setX({ ...x, statut: e.target.value as StatutIntervention })}>
            {(Object.keys(STATUTS_INTERVENTION) as StatutIntervention[]).map((s) => (
              <option key={s} value={s}>
                {STATUTS_INTERVENTION[s]}
              </option>
            ))}
          </select>
        </Champ>
      </div>
      <div className={`alert ${bloquantes.length ? 'CRITIQUE' : 'OK'} small`} style={{ marginTop: 12 }}>
        {bloquantes.length ? (
          <div>
            <b>{MESSAGE_TECHNICIEN_AVANT_PDR}</b>
            <div>
              {bloquantes.map((p) => `${p.pdr.ref} (dispo ${fmtCourt(p.dispo)})`).join(', ')} — arrivée conseillée à partir du <b>{fmtCourt(addDays(dispoMax!, 1))}</b>.
            </div>
          </div>
        ) : (
          <span>✓ Les PDR nécessaires ({concernees.length}) seront disponibles avant l'arrivée{dispoMax ? ` (au plus tard ${fmtCourt(dispoMax)})` : ''}.</span>
        )}
      </div>
    </Modal>
  );
}

function ModalEvaluation({ it, onClose }: { it: Intervention; onClose: () => void }) {
  const { user, today, modifier, toast } = useStore();
  const cles = Object.keys(CRITERES) as CritereEvaluation[];
  const [ev, setEv] = useState<Evaluation>(it.evaluation ?? { notes: Object.fromEntries(cles.map((c) => [c, 0])) as Record<CritereEvaluation, number>, commentaire: '', auteur: user.nom, date: today });
  const complet = cles.every((c) => ev.notes[c] > 0);
  const note = noteGlobale(ev);
  return (
    <Modal
      titre={`Évaluation — ${it.entreprise} (${it.technicien})`}
      onClose={onClose}
      pied={
        <>
          <span className="small muted grow">Note globale pondérée : {note ?? '—'}/5</span>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button
            className="btn primary"
            disabled={!complet}
            onClick={() => {
              modifier({ entite: 'Technicien', entiteId: it.id, revisionId: it.revisionId, action: 'EVALUATION', detail: `Évaluation ${it.entreprise} : ${note}/5`, apres: String(note) }, (dr) => {
                dr.interventions.find((x) => x.id === it.id)!.evaluation = { ...ev, auteur: user.nom, date: today };
              });
              toast(`Évaluation enregistrée : ${note}/5`);
              onClose();
            }}
          >
            Enregistrer
          </button>
        </>
      }
    >
      <table className="tbl">
        <tbody>
          {cles.map((c) => (
            <tr key={c}>
              <td>
                {CRITERES[c].libelle} <span className="tiny muted">×{CRITERES[c].poids}</span>
              </td>
              <td className="right">
                <span className="stars" role="radiogroup" aria-label={CRITERES[c].libelle}>
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button key={n} className={ev.notes[c] >= n ? 'on' : ''} onClick={() => setEv({ ...ev, notes: { ...ev.notes, [c]: n } })} aria-label={`${n}/5`}>
                      ★
                    </button>
                  ))}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <Champ label="Commentaire" full>
        <textarea value={ev.commentaire} onChange={(e) => setEv({ ...ev, commentaire: e.target.value })} />
      </Champ>
    </Modal>
  );
}
