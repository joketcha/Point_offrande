import { useState } from 'react';
import type { AnalyseRevision } from '../domain/analyse';
import { addDays, diffDays, fmt, fmtCourt } from '../domain/dates';
import { actionsPreparationAGenerer, appliquerReport } from '../domain/planning';
import { RACI_PAR_EVENEMENT, ROLES, STATUTS } from '../domain/referentiel';
import { creerRex } from '../domain/rex';
import { transitionDepuis } from '../domain/workflow';
import type { Donnees, Revision } from '../domain/types';
import { useStore } from '../store/store';
import { Champ, Modal, RoleBadge } from './kit';

/** Décision de report (§6) : jamais de suppression de l'ancienne date. */
export function ModalReport({ rev, onClose }: { rev: Revision; onClose: () => void }) {
  const { modifier, user, today, toast } = useStore();
  const [date, setDate] = useState(addDays(rev.datePrevue, 14));
  const [motif, setMotif] = useState('');
  const decal = diffDays(rev.datePrevue, date);
  const raci = RACI_PAR_EVENEMENT.DECISION_REPORT;
  const valider = () => {
    try {
      const n = appliquerReport(rev, date, motif, user.nom, today);
      modifier(
        { entite: 'Révision', entiteId: rev.id, revisionId: rev.id, action: 'REPORT', detail: `Report v${n.reports.length} : ${motif}`, avant: rev.datePrevue, apres: date },
        (d) => {
          d.revisions[d.revisions.findIndex((r) => r.id === rev.id)] = n;
        },
      );
      toast(`${rev.code} reportée au ${fmt(date)}`);
      onClose();
    } catch (e) {
      toast((e as Error).message, 'erreur');
    }
  };
  return (
    <Modal
      titre={`Décision de report — ${rev.code}`}
      onClose={onClose}
      pied={
        <>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn primary" disabled={!motif.trim() || date === rev.datePrevue} onClick={valider}>
            Enregistrer le report
          </button>
        </>
      }
    >
      <div className="stack">
        <dl className="kv">
          <dt>Date initiale</dt>
          <dd>{fmt(rev.dateInitiale)} (conservée)</dd>
          <dt>Date prévue actuelle</dt>
          <dd>{fmt(rev.datePrevue)}</dd>
          <dt>Reports précédents</dt>
          <dd>{rev.reports.length}</dd>
        </dl>
        <div className="form">
          <Champ label="Nouvelle date de début" req>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Champ>
          <Champ label="Motif du report" req full>
            <textarea value={motif} onChange={(e) => setMotif(e.target.value)} placeholder="Ex. : PDR critique en retard, pic de production, indisponibilité prestataire…" />
          </Champ>
        </div>
        <div className="alert INFO small">
          <div>
            Décalage de <b>{decal > 0 ? '+' : ''}{decal} j</b> ; dérive totale vs initial : <b>{diffDays(rev.dateInitiale, date)} j</b>. Les actions de préparation non faites sont décalées d'autant.
            <br />
            Responsable : <RoleBadge r={raci.responsable} /> · Informés : {raci.informes.map((r) => ROLES[r].court).join(', ')} · Escalade : {raci.escalade}.
          </div>
        </div>
      </div>
    </Modal>
  );
}

/** Applique les effets de bord d'une transition de statut. */
function effetsTransition(d: Donnees, rev: Revision, vers: Revision['statut'], today: string, a: AnalyseRevision) {
  const r = d.revisions.find((x) => x.id === rev.id)!;
  r.statut = vers;
  if (vers === 'PREPARATION' && r.actionsPreparation.length === 0) {
    r.actionsPreparation = actionsPreparationAGenerer({ ...r, actionsPreparation: [] }, d.parametres, today, true);
  }
  if (vers === 'EN_COURS' && !r.dateReelleDebut) r.dateReelleDebut = today;
  if (vers === 'TRAVAUX_TERMINES' && !r.dateReelleFin) {
    r.dateReelleFin = today;
    r.jalons.FIN_TRAVAUX = { ...r.jalons.FIN_TRAVAUX, reel: r.jalons.FIN_TRAVAUX?.reel ?? `${today}T18:00` };
  }
  if (vers === 'TERMINEE' && !d.rex.some((x) => x.revisionId === rev.id)) {
    // REX créé automatiquement à la clôture (§33).
    d.rex.push(creerRex({ ...a, revision: r }, today));
  }
  if (vers === 'REX') {
    const x = d.rex.find((y) => y.revisionId === rev.id);
    if (x) x.statut = 'VALIDE';
  }
}

/** Panneau de transition du workflow global (§22). */
export function PanneauWorkflow({ a }: { a: AnalyseRevision }) {
  const { modifier, user, today, peut, toast } = useStore();
  const rev = a.revision;
  const t = transitionDepuis(rev.statut);
  const [derog, setDerog] = useState('');
  const [annul, setAnnul] = useState(false);
  const [motifAnnul, setMotifAnnul] = useState('');
  if (!t) return <p className="small muted">Aucune transition : révision {STATUTS[rev.statut].libelle.toLowerCase()}.</p>;
  const c = t.controle(a);
  const domaine = t.responsable === 'BMC' ? 'PLANNING' : t.responsable === 'PRODUCTION' ? 'PRODUCTION' : t.responsable === 'ACHATS' ? 'ACHATS' : t.responsable === 'MAGASIN' ? 'RECEPTION' : 'REDEMARRAGE';
  const autorise = user.role === t.responsable || user.role === 'ADMIN';
  const bmcDerog = (user.role === 'BMC' || user.role === 'ADMIN') && peut('PLANNING', rev.ligneId);
  const peutAgir = autorise && peut(domaine, rev.ligneId);
  const go = (forcer: boolean) => {
    modifier(
      {
        entite: 'Révision',
        entiteId: rev.id,
        revisionId: rev.id,
        action: forcer ? 'TRANSITION_DEROGATION' : 'TRANSITION',
        detail: `${STATUTS[t.de].libelle} → ${STATUTS[t.vers].libelle}${forcer ? ` — DÉROGATION BMC : ${derog} (bloquants : ${c.bloquants.join(' ; ')})` : ''}`,
        avant: t.de,
        apres: t.vers,
      },
      (d) => effetsTransition(d, rev, t.vers, today, a),
    );
    toast(`${rev.code} : ${STATUTS[t.vers].libelle}${t.vers === 'TERMINEE' ? ' — REX créé automatiquement' : ''}`);
    setDerog('');
  };
  return (
    <div className="stack">
      <div className="kv small" style={{ gridTemplateColumns: '150px 1fr' }}>
        <dt>Transition</dt>
        <dd className="b">
          {STATUTS[t.de].libelle} → {STATUTS[t.vers].libelle}
        </dd>
        <dt>Responsable unique</dt>
        <dd>
          <RoleBadge r={t.responsable} /> <span className="muted">{ROLES[t.responsable].mission}</span>
        </dd>
        <dt>Condition d'entrée</dt>
        <dd>{t.conditionEntree}</dd>
        <dt>Action</dt>
        <dd>{t.action}</dd>
        <dt>Condition de sortie</dt>
        <dd>{t.conditionSortie}</dd>
        <dt>Notification</dt>
        <dd>{t.notification}</dd>
        <dt>Escalade</dt>
        <dd>{t.escalade}</dd>
      </div>
      {c.bloquants.length > 0 && (
        <div className="alert CRITIQUE small">
          <div>
            <b>Conditions de sortie non remplies :</b>
            <ul style={{ margin: '4px 0 0', paddingLeft: 18 }}>
              {c.bloquants.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          </div>
        </div>
      )}
      {c.alertes.length > 0 && (
        <div className="alert VIGILANCE small">
          <ul style={{ margin: 0, paddingLeft: 18 }}>
            {c.alertes.map((b) => (
              <li key={b}>{b}</li>
            ))}
          </ul>
        </div>
      )}
      <div className="row">
        <button className="btn primary" disabled={!peutAgir || c.bloquants.length > 0} onClick={() => go(false)} title={!peutAgir ? `Réservé à : ${ROLES[t.responsable].libelle}` : undefined}>
          Passer à « {STATUTS[t.vers].libelle} »
        </button>
        {!peutAgir && <span className="small muted">Réservé au responsable : {ROLES[t.responsable].libelle}.</span>}
        <div className="grow" />
        {bmcDerog && STATUTS[rev.statut].phase === 'amont' && (
          <button className="btn danger sm" onClick={() => setAnnul(true)}>
            Annuler la révision
          </button>
        )}
      </div>
      {c.bloquants.length > 0 && bmcDerog && (
        <div className="row small">
          <input type="text" placeholder="Justification de la dérogation (BMC)…" value={derog} onChange={(e) => setDerog(e.target.value)} style={{ flex: 1, minWidth: 200 }} />
          <button className="btn sm" disabled={!derog.trim()} onClick={() => go(true)}>
            Forcer avec dérogation tracée
          </button>
        </div>
      )}
      {annul && (
        <Modal
          titre={`Annuler ${rev.code}`}
          onClose={() => setAnnul(false)}
          pied={
            <>
              <button className="btn" onClick={() => setAnnul(false)}>
                Retour
              </button>
              <button
                className="btn danger"
                disabled={!motifAnnul.trim()}
                onClick={() => {
                  modifier({ entite: 'Révision', entiteId: rev.id, revisionId: rev.id, action: 'ANNULATION', detail: motifAnnul, avant: rev.statut, apres: 'ANNULEE' }, (d) => {
                    d.revisions.find((x) => x.id === rev.id)!.statut = 'ANNULEE';
                  });
                  setAnnul(false);
                  toast(`${rev.code} annulée`);
                }}
              >
                Confirmer l'annulation
              </button>
            </>
          }
        >
          <Champ label="Motif d'annulation" req>
            <textarea value={motifAnnul} onChange={(e) => setMotifAnnul(e.target.value)} />
          </Champ>
          <p className="small muted" style={{ marginTop: 8 }}>
            La révision reste consultable avec tout son historique (aucune suppression).
          </p>
        </Modal>
      )}
    </div>
  );
}

export function HistoriqueReports({ rev }: { rev: Revision }) {
  if (!rev.reports.length) return <p className="small muted">Aucun report : date initiale maintenue ({fmtCourt(rev.dateInitiale)}).</p>;
  return (
    <div className="tbl-wrap">
      <table className="tbl">
        <thead>
          <tr>
            <th>Version</th>
            <th>Ancienne date</th>
            <th>Nouvelle date</th>
            <th>Décalage</th>
            <th>Motif</th>
            <th>Auteur</th>
            <th>Date</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>v0</td>
            <td>—</td>
            <td>{fmt(rev.dateInitiale)}</td>
            <td>—</td>
            <td className="muted">Planning initial</td>
            <td />
            <td />
          </tr>
          {rev.reports.map((r) => {
            const j = diffDays(r.ancienneDate, r.nouvelleDate);
            return (
              <tr key={r.version}>
                <td className="b">v{r.version}</td>
                <td>{fmt(r.ancienneDate)}</td>
                <td>{fmt(r.nouvelleDate)}</td>
                <td>
                  <span className={`badge ${j > 0 ? 'act' : 'ok'}`}>{j > 0 ? '+' : ''}{j} j</span>
                </td>
                <td>{r.motif}</td>
                <td>{r.auteur}</td>
                <td className="nowrap">{fmt(r.date)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
