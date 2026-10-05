import { useState } from 'react';
import type { AnalyseRevision } from '../domain/analyse';
import { cheminLigne } from '../domain/arbo';
import { diffDays, fmt, fmtCourt } from '../domain/dates';
import { synchroniserPdr } from '../domain/importGamme';
import { actionsPreparationAGenerer } from '../domain/planning';
import { ETAPE, ROLES, STATUTS } from '../domain/referentiel';
import type { Revision } from '../domain/types';
import { nouvelId, useStore } from '../store/store';
import { Card, Champ, EcartBadge, FluxStatut, Lien, NiveauBadge, Prog, RisqueItem, RoleBadge, StatutBadge, Tabs, Vide, aller } from '../ui/kit';
import { TablePdr } from '../ui/Pdr';
import { HistoriqueReports, ModalReport, PanneauWorkflow } from '../ui/RevisionActions';
import { OngletTechniciens } from './revision/Techniciens';
import { OngletTravaux } from './revision/Travaux';
import { OngletRedemarrage, OngletStabilisation } from './revision/Redemarrage';
import { OngletRex } from './revision/Rex';
import { JournalAudit } from './Audit';

type Onglet = 'synthese' | 'planning' | 'preparation' | 'pdr' | 'techniciens' | 'travaux' | 'redemarrage' | 'stabilisation' | 'risques' | 'rex' | 'historique';

export default function RevisionPage({ id, onglet }: { id?: string; onglet?: string }) {
  const { analyse, visible } = useStore();
  const a = id ? analyse(id) : undefined;
  if (!a || !visible(a.revision.ligneId)) return <Vide>Révision introuvable ou hors de votre périmètre.</Vide>;
  return <Contenu a={a} onglet={(onglet as Onglet) || 'synthese'} />;
}

function Contenu({ a, onglet }: { a: AnalyseRevision; onglet: Onglet }) {
  const { d } = useStore();
  const r = a.revision;
  const ouverts = a.risques.filter((x) => x.nature === 'RISQUE');
  const resp = d.utilisateurs.find((u) => u.id === r.responsableId);
  const set = (o: Onglet) => aller(`revision/${r.id}/${o}`);
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <div className="small muted">
            <Lien to="planning">Planification</Lien> › {a.chemin.site?.nom} › {a.chemin.atelier?.nom}
          </div>
          <h1 className="row" style={{ gap: 10 }}>
            {r.code} <span style={{ fontWeight: 500, color: 'var(--text-2)' }}>{a.chemin.ligne?.nom}</span>
          </h1>
          <div className="row" style={{ marginTop: 6 }}>
            <StatutBadge s={r.statut} reports={r.reports.length} />
            <NiveauBadge n={a.niveauRisque} />
            <span className="small muted">Responsable : {resp?.nom ?? '—'} · Pilote : BMC</span>
          </div>
        </div>
      </div>
      <FluxStatut s={r.statut} />
      <Tabs<Onglet>
        value={onglet}
        onChange={set}
        items={[
          { id: 'synthese', label: 'Synthèse' },
          { id: 'planning', label: 'Planning & reports' },
          { id: 'preparation', label: 'Préparation', badge: <span className="badge">{a.preparation.taux}%</span> },
          { id: 'pdr', label: 'PDR', badge: a.pdrStats.critiquesManquantes ? <span className="badge crit">{a.pdrStats.critiquesManquantes}</span> : <span className="badge">{a.pdrStats.total}</span> },
          { id: 'techniciens', label: 'Techniciens', badge: a.techStats.enRisquePdr ? <span className="badge crit">!</span> : undefined },
          { id: 'travaux', label: 'Travaux', badge: a.travaux.nbRetard ? <span className="badge crit">{a.travaux.nbRetard}</span> : undefined },
          { id: 'redemarrage', label: 'Redémarrage' },
          { id: 'stabilisation', label: 'Stabilisation' },
          { id: 'risques', label: 'Risques', badge: ouverts.length ? <span className={`badge ${a.niveauRisque}`}>{ouverts.length}</span> : undefined },
          { id: 'rex', label: 'REX' },
          { id: 'historique', label: 'Historique' },
        ]}
      />
      {onglet === 'synthese' && <Synthese a={a} />}
      {onglet === 'planning' && <OngletPlanning a={a} />}
      {onglet === 'preparation' && <OngletPreparation a={a} />}
      {onglet === 'pdr' && <OngletPdr a={a} />}
      {onglet === 'techniciens' && <OngletTechniciens a={a} />}
      {onglet === 'travaux' && <OngletTravaux a={a} />}
      {onglet === 'redemarrage' && <OngletRedemarrage a={a} />}
      {onglet === 'stabilisation' && <OngletStabilisation a={a} />}
      {onglet === 'risques' && (
        <Card titre="Risques et actions — QUOI / OÙ / POURQUOI / QUI / QUAND / IMPACT / QUE FAIRE" tight>
          {a.risques.length ? a.risques.map((x) => <RisqueItem key={x.cle} r={x} />) : <Vide>Aucun risque détecté.</Vide>}
        </Card>
      )}
      {onglet === 'rex' && <OngletRex a={a} />}
      {onglet === 'historique' && <JournalAudit revisionId={r.id} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Synthèse : les 10 questions du critère de réussite (§43)            */
/* ------------------------------------------------------------------ */

function Synthese({ a }: { a: AnalyseRevision }) {
  const { today } = useStore();
  const r = a.revision;
  const ouverts = a.risques.filter((x) => x.nature === 'RISQUE');
  const pdrRisque = a.pdrs.filter((x) => !x.disponible && !x.pdr.horsGamme && x.ecart > -7).sort((p, q) => q.ecart - p.ecart);
  const pdrsEnRoute = a.pdrs.filter((x) => !x.disponible && !x.pdr.horsGamme);
  const parPosition = new Map<string, number>();
  for (const x of pdrsEnRoute) {
    const k = x.pdr.nonConforme ? 'Non conformes' : ETAPE[x.pdr.etape].groupe;
    parPosition.set(k, (parPosition.get(k) ?? 0) + 1);
  }
  const retards = a.travaux.taches.filter((t) => t.enRetard && t.travail.statut !== 'TERMINE');
  const chemin = a.travaux.chemin.map((id) => a.travaux.taches.find((t) => t.travail.id === id)!).filter(Boolean);
  const qui = [...new Set(ouverts.filter((x) => x.niveau === 'CRITIQUE' || x.niveau === 'ACTION').map((x) => x.responsable))];
  const phase = STATUTS[r.statut].phase;
  const jours = r.dateReelleDebut ? `J+${diffDays(r.dateReelleDebut, today)} d'exécution` : diffDays(today, r.datePrevue) >= 0 ? `J-${diffDays(today, r.datePrevue)}` : `J+${-diffDays(today, r.datePrevue)}`;
  const Q = ({ n, t, children, niveau }: { n: number; t: string; children: React.ReactNode; niveau?: string }) => (
    <div className={`q lvl-${niveau ?? 'OK'}`}>
      <span className="n">{n}</span>
      <div style={{ minWidth: 0 }}>
        <div className="t">{t}</div>
        <div className="a">{children}</div>
      </div>
    </div>
  );
  return (
    <div className="stack">
      <div className="q10">
        <Q n={1} t="Où en est la révision ?" niveau={a.niveauRisque === 'OK' ? 'OK' : 'INFO'}>
          {STATUTS[r.statut].libelle} · {jours}
          <div className="small muted" style={{ fontWeight: 400 }}>
            {phase === 'amont' ? `Préparation ${a.preparation.taux} %` : `Travaux ${a.travaux.nbTermines}/${a.travaux.taches.length} terminés`}
          </div>
        </Q>
        <Q n={2} t="Sommes-nous dans les délais ?" niveau={a.ecartFin > 2 ? 'CRITIQUE' : a.ecartFin > 0 ? 'ACTION' : 'OK'}>
          {a.ecartFin > 0 ? `Non : fin prévisionnelle +${a.ecartFin} j` : 'Oui'}
          <div className="small muted" style={{ fontWeight: 400 }}>
            Fin prévue {fmtCourt(a.finPrevue)} → prévision {fmtCourt(a.finPrevisionnelle)} · dérive vs initial {a.derive.derivePlanning} j ({a.derive.nbReports} report{a.derive.nbReports > 1 ? 's' : ''})
          </div>
        </Q>
        <Q n={3} t="Quelles PDR sont à risque ?" niveau={pdrRisque.some((x) => x.ecart > 0 && x.pdr.criticite === 'A') ? 'CRITIQUE' : pdrRisque.length ? 'VIGILANCE' : 'OK'}>
          {pdrRisque.length ? pdrRisque.slice(0, 3).map((x) => `${x.pdr.ref} (${x.ecart > 0 ? '+' : ''}${x.ecart} j)`).join(', ') : 'Aucune'}
          {pdrRisque.length > 3 && <span className="muted"> +{pdrRisque.length - 3}</span>}
        </Q>
        <Q n={4} t="Où sont les PDR ?" niveau={pdrsEnRoute.length ? 'INFO' : 'OK'}>
          {a.pdrStats.disponibles}/{a.pdrStats.total} disponibles
          <div className="small muted" style={{ fontWeight: 400 }}>
            {[...parPosition.entries()].map(([k, v]) => `${k} : ${v}`).join(' · ') || 'Toutes au magasin'}
          </div>
        </Q>
        <Q n={5} t="Quels travaux sont en retard ?" niveau={retards.some((t) => t.critique) ? 'CRITIQUE' : retards.length ? 'ACTION' : 'OK'}>
          {retards.length ? retards.map((t) => `${t.travail.code} (+${t.retardJours} j)`).join(', ') : 'Aucun'}
          {a.travaux.nbBloques > 0 && <div className="small crit-txt">{a.travaux.nbBloques} tâche(s) bloquée(s)</div>}
        </Q>
        <Q n={6} t="Quel est le chemin critique ?" niveau={chemin.length ? 'INFO' : 'OK'}>
          {chemin.length ? chemin.map((t) => t.travail.code).join(' › ') : a.travaux.taches.length ? 'Travaux terminés' : 'Planning travaux à établir'}
          {chemin[0] && (
            <div className="small muted" style={{ fontWeight: 400 }}>
              {chemin[0].travail.description}
            </div>
          )}
        </Q>
        <Q n={7} t="Les techniciens sont-ils prêts ?" niveau={a.techStats.enRisquePdr ? 'CRITIQUE' : a.techStats.nonConfirmes ? 'ACTION' : 'OK'}>
          {a.techStats.confirmes}/{a.techStats.prevus} confirmés
          {a.techStats.enRisquePdr > 0 && <div className="small crit-txt">🔴 {a.techStats.enRisquePdr} prévu(s) avant les PDR</div>}
        </Q>
        <Q n={8} t="La ligne pourra-t-elle redémarrer à la date prévue ?" niveau={a.redemarrageTenable ? 'OK' : 'CRITIQUE'}>
          {r.jalons.PREMIERE_CONFORME?.reel ? `Redémarrée (${fmtCourt(r.jalons.PREMIERE_CONFORME.reel)})` : a.redemarrageTenable ? 'Oui' : 'Non / à risque'}
          <div className="small muted" style={{ fontWeight: 400 }}>
            Redémarrage prévisionnel {fmtCourt(a.redemarragePrevisionnel)}
          </div>
        </Q>
        <Q n={9} t="Quels risques peuvent empêcher le redémarrage ?" niveau={a.niveauRisque}>
          {ouverts.filter((x) => x.niveau === 'CRITIQUE').length ? `${ouverts.filter((x) => x.niveau === 'CRITIQUE').length} critique(s)` : 'Aucun critique'}
          <div className="small muted" style={{ fontWeight: 400 }}>
            {ouverts.filter((x) => x.niveau === 'CRITIQUE').slice(0, 2).map((x) => x.quoi).join(' · ')}
          </div>
        </Q>
        <Q n={10} t="Qui doit agir maintenant ?" niveau={qui.length ? 'ACTION' : 'OK'}>
          <span className="row" style={{ gap: 4 }}>
            {qui.length ? qui.map((x) => <RoleBadge key={x} r={x} />) : 'Personne : sous contrôle'}
          </span>
        </Q>
      </div>

      <div className="grid g2">
        <Card titre="Prévu / réel (§37)" tight>
          <table className="tbl">
            <thead>
              <tr>
                <th>Indicateur</th>
                <th>Prévu</th>
                <th>Réel</th>
                <th>Écart</th>
              </tr>
            </thead>
            <tbody>
              {a.comparatif.map((c) => (
                <tr key={c.indicateur}>
                  <td className="b">{c.indicateur}</td>
                  <td>{c.prevu}</td>
                  <td>{c.reel}</td>
                  <td>{c.ecartNum !== undefined ? <EcartBadge j={Math.round(c.ecartNum * 10) / 10} unite={c.unite} /> : <span className="muted">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
        <Card titre="Workflow — prochaine étape">
          <PanneauWorkflow a={a} />
        </Card>
      </div>

      <Card titre="Risques prioritaires" actions={<Lien to={`revision/${r.id}/risques`}>Tous ({ouverts.length})</Lien>} tight>
        {ouverts.length ? ouverts.slice(0, 4).map((x) => <RisqueItem key={x.cle} r={x} />) : <Vide>Aucun risque ouvert.</Vide>}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Planning & reports                                                  */
/* ------------------------------------------------------------------ */

function OngletPlanning({ a }: { a: AnalyseRevision }) {
  const { d, peut, modifier, toast } = useStore();
  const r = a.revision;
  const [report, setReport] = useState(false);
  const [edit, setEdit] = useState<Revision | null>(null);
  const editable = peut('PLANNING', r.ligneId);
  const c = cheminLigne(d, r.ligneId);
  const enregistrer = () => {
    if (!edit) return;
    const champs: (keyof Revision)[] = ['responsableId', 'dureePrevueJours', 'commentaire', 'dureeRedemarragePrevueH', 'dureeStabilisationPrevueJ', 'cibleVitessePct', 'cibleQualitePct'];
    const modifs = champs.filter((k) => String(edit[k]) !== String(r[k]));
    if (!modifs.length) return setEdit(null);
    modifier(
      modifs.map((k) => ({ entite: 'Révision', entiteId: r.id, revisionId: r.id, action: 'MODIFICATION', detail: `Champ ${String(k)}`, avant: String(r[k]), apres: String(edit[k]) })),
      (dr) => {
        const x = dr.revisions.find((y) => y.id === r.id)!;
        for (const k of modifs) (x as unknown as Record<string, unknown>)[k] = edit[k];
      },
    );
    toast('Fiche de révision mise à jour');
    setEdit(null);
  };
  return (
    <div className="stack">
      <div className="grid g2">
        <Card
          titre="Fiche de révision"
          actions={
            editable && !edit ? (
              <button className="btn sm" onClick={() => setEdit(structuredClone(r))}>
                Modifier
              </button>
            ) : null
          }
        >
          {!edit ? (
            <dl className="kv">
              <dt>ID révision</dt>
              <dd className="b">{r.code}</dd>
              <dt>Année</dt>
              <dd>{r.annee}</dd>
              <dt>Site / atelier / ligne</dt>
              <dd>
                {c.site?.nom} › {c.atelier?.nom} › {c.ligne?.code} {c.ligne?.nom}
              </dd>
              <dt>Responsable</dt>
              <dd>{d.utilisateurs.find((u) => u.id === r.responsableId)?.nom}</dd>
              <dt>Date initialement prévue</dt>
              <dd>{fmt(r.dateInitiale)}</dd>
              <dt>Date prévue actuelle</dt>
              <dd className="b">
                {fmt(r.datePrevue)} <EcartBadge j={a.derive.derivePlanning} />
              </dd>
              <dt>Date réelle début</dt>
              <dd>
                {fmt(r.dateReelleDebut)} {a.derive.ecartDebut !== undefined && <EcartBadge j={a.derive.ecartDebut} />}
              </dd>
              <dt>Date réelle fin</dt>
              <dd>{fmt(r.dateReelleFin)}</dd>
              <dt>Durée prévue / réelle</dt>
              <dd>
                {r.dureePrevueJours} j / {r.dateReelleDebut && r.dateReelleFin ? `${diffDays(r.dateReelleDebut, r.dateReelleFin)} j` : '—'}
              </dd>
              <dt>Nombre de reports</dt>
              <dd>{r.reports.length}</dd>
              <dt>Motif du dernier report</dt>
              <dd>{r.reports.at(-1)?.motif ?? '—'}</dd>
              <dt>Décalage cumulé</dt>
              <dd>{a.derive.decalageCumule} j</dd>
              <dt>Statut</dt>
              <dd>
                <StatutBadge s={r.statut} />
              </dd>
              <dt>Niveau de risque</dt>
              <dd>
                <NiveauBadge n={a.niveauRisque} />
              </dd>
              <dt>Redémarrage / stabilisation prévus</dt>
              <dd>
                {r.dureeRedemarragePrevueH} h / {r.dureeStabilisationPrevueJ} j (cibles vitesse {r.cibleVitessePct} %, qualité {r.cibleQualitePct} %)
              </dd>
              <dt>Gamme</dt>
              <dd>{(() => {
                const g = d.gammes.find((x) => x.id === r.gammeVersionId);
                return g ? `v${g.version} (${g.source})` : '—';
              })()}</dd>
              <dt>Commentaire</dt>
              <dd>{r.commentaire || '—'}</dd>
            </dl>
          ) : (
            <div className="stack">
              <div className="form">
                <Champ label="Responsable">
                  <select value={edit.responsableId} onChange={(e) => setEdit({ ...edit, responsableId: e.target.value })}>
                    {d.utilisateurs
                      .filter((u) => (u.actif && u.role !== 'DIRECTION' && u.role !== 'PRESTATAIRE') || u.id === edit.responsableId)
                      .map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.nom}
                        </option>
                      ))}
                  </select>
                </Champ>
                <Champ label="Durée prévue (j)">
                  <input type="number" min={1} value={edit.dureePrevueJours} onChange={(e) => setEdit({ ...edit, dureePrevueJours: Number(e.target.value) })} />
                </Champ>
                <Champ label="Redémarrage prévu (h)">
                  <input type="number" min={1} value={edit.dureeRedemarragePrevueH} onChange={(e) => setEdit({ ...edit, dureeRedemarragePrevueH: Number(e.target.value) })} />
                </Champ>
                <Champ label="Stabilisation prévue (j)">
                  <input type="number" min={0} value={edit.dureeStabilisationPrevueJ} onChange={(e) => setEdit({ ...edit, dureeStabilisationPrevueJ: Number(e.target.value) })} />
                </Champ>
                <Champ label="Cible vitesse (%)">
                  <input type="number" value={edit.cibleVitessePct} onChange={(e) => setEdit({ ...edit, cibleVitessePct: Number(e.target.value) })} />
                </Champ>
                <Champ label="Cible qualité (%)">
                  <input type="number" value={edit.cibleQualitePct} onChange={(e) => setEdit({ ...edit, cibleQualitePct: Number(e.target.value) })} />
                </Champ>
                <Champ label="Commentaire" full>
                  <textarea value={edit.commentaire} onChange={(e) => setEdit({ ...edit, commentaire: e.target.value })} />
                </Champ>
              </div>
              <p className="tiny muted">Les dates se modifient uniquement par un report (date prévue) ou par le workflow (dates réelles) : rien n'est écrasé.</p>
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => setEdit(null)}>
                  Annuler
                </button>
                <button className="btn primary" onClick={enregistrer}>
                  Enregistrer
                </button>
              </div>
            </div>
          )}
        </Card>
        <Card titre="Workflow global">
          <PanneauWorkflow a={a} />
        </Card>
      </div>
      <Card
        titre="Historique des reports"
        sub={`Dérive planning ${a.derive.derivePlanning} j · décalage cumulé ${a.derive.decalageCumule} j`}
        actions={
          editable && !r.dateReelleDebut && STATUTS[r.statut].phase === 'amont' ? (
            <button className="btn primary sm" onClick={() => setReport(true)}>
              Décider un report
            </button>
          ) : null
        }
      >
        <HistoriqueReports rev={r} />
      </Card>
      {report && <ModalReport rev={r} onClose={() => setReport(false)} />}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Préparation J-7 mois                                                */
/* ------------------------------------------------------------------ */

function OngletPreparation({ a }: { a: AnalyseRevision }) {
  const { d, user, today, modifier, peut, toast } = useStore();
  const r = a.revision;
  const rexPrec = a.rexPrecedent && d.rex.find((x) => x.revisionId === a.rexPrecedent!.revisionId);
  const basculer = (id: string) => {
    const act = r.actionsPreparation.find((x) => x.id === id)!;
    modifier({ entite: 'Action préparation', entiteId: id, revisionId: r.id, action: act.faite ? 'REOUVERTURE' : 'REALISATION', detail: act.libelle }, (dr) => {
      const x = dr.revisions.find((y) => y.id === r.id)!.actionsPreparation.find((y) => y.id === id)!;
      x.faite = !x.faite;
      x.dateFaite = x.faite ? today : undefined;
    });
  };
  const lancer = () => {
    modifier({ entite: 'Révision', entiteId: r.id, revisionId: r.id, action: 'PREPARATION_J7', detail: 'Lancement anticipé : génération des actions J-7 mois' }, (dr) => {
      const x = dr.revisions.find((y) => y.id === r.id)!;
      x.actionsPreparation = actionsPreparationAGenerer({ ...x, actionsPreparation: [] }, dr.parametres, today, true);
    });
    toast('Actions de préparation générées et affectées');
  };
  const integrer = (leconId: string) => {
    if (!rexPrec) return;
    modifier({ entite: 'REX', entiteId: rexPrec.id, revisionId: r.id, action: 'LECON_INTEGREE', detail: `Leçon intégrée dans ${r.code}` }, (dr) => {
      const l = dr.rex.find((x) => x.id === rexPrec.id)!.lecons.find((x) => x.id === leconId)!;
      l.integree = !l.integree;
    });
  };
  return (
    <div className="stack">
      <div className="grid g2">
        <Card titre={`Taux de préparation : ${a.preparation.taux} %`} sub={`Lancement J-${d.parametres.moisPreparation} mois : ${fmt(a.preparation.lancement)}`}>
          <div className="col">
            {a.preparation.detail.map((x) => (
              <div key={x.libelle} className="row" style={{ flexWrap: 'nowrap' }}>
                <span style={{ width: 230 }} className="small">
                  {x.libelle} <span className="muted">({x.poids} %)</span>
                </span>
                <div className="grow">
                  <Prog v={x.valeur * 100} />
                </div>
                <span className="small b" style={{ width: 40, textAlign: 'right' }}>
                  {Math.round(x.valeur * 100)}%
                </span>
              </div>
            ))}
          </div>
        </Card>
        <Card titre="REX de la révision précédente" sub={a.rexPrecedent ? `${a.rexPrecedent.code} — ${a.rexPrecedent.nbLecons} leçon(s)` : undefined}>
          {rexPrec ? (
            <div className="col small">
              {rexPrec.lecons.map((l) => (
                <label key={l.id} className="row" style={{ alignItems: 'flex-start', flexWrap: 'nowrap', cursor: peut('PLANNING', r.ligneId) ? 'pointer' : 'default' }}>
                  <input type="checkbox" checked={l.integree} disabled={!peut('PLANNING', r.ligneId)} onChange={() => integrer(l.id)} />
                  <span>
                    <b>{l.actionProchaineRevision}</b>
                    <div className="muted">
                      {l.lecon} · <RoleBadge r={l.responsable} />
                    </div>
                  </span>
                </label>
              ))}
            </div>
          ) : (
            <p className="small muted">Pas de REX antérieur pour cette ligne.</p>
          )}
        </Card>
      </div>
      <Card
        titre="Actions de préparation (J-7 mois)"
        actions={
          !r.actionsPreparation.length && peut('PLANNING', r.ligneId) ? (
            <button className="btn primary sm" onClick={lancer}>
              Lancer la préparation maintenant
            </button>
          ) : null
        }
        tight
      >
        {r.actionsPreparation.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th />
                  <th>Action</th>
                  <th>Responsable</th>
                  <th>Échéance</th>
                  <th>Réalisée le</th>
                  <th>État</th>
                </tr>
              </thead>
              <tbody>
                {r.actionsPreparation.map((x) => {
                  const mien = user.role === 'ADMIN' || (d.parametres.modeSaisie === 'ROLES' && user.role === x.responsable && user.actif);
                  const retard = !x.faite && x.echeance < today;
                  return (
                    <tr key={x.id}>
                      <td>
                        <input type="checkbox" checked={x.faite} disabled={!mien} onChange={() => basculer(x.id)} title={mien ? '' : `Réservé : ${ROLES[x.responsable].libelle}`} aria-label={x.libelle} />
                      </td>
                      <td className={x.faite ? 'muted' : 'b'}>{x.libelle}</td>
                      <td>
                        <RoleBadge r={x.responsable} />
                      </td>
                      <td className="nowrap">{fmt(x.echeance)}</td>
                      <td className="nowrap">{fmt(x.dateFaite)}</td>
                      <td>{x.faite ? <span className="badge ok">Fait</span> : retard ? <span className="badge act">En retard ({diffDays(x.echeance, today)} j)</span> : <span className="badge">À faire</span>}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Vide>
            La préparation démarre automatiquement le {fmt(a.preparation.lancement)} (J-{d.parametres.moisPreparation} mois) : les actions seront générées et affectées.
          </Vide>
        )}
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* PDR de la révision                                                  */
/* ------------------------------------------------------------------ */

function OngletPdr({ a }: { a: AnalyseRevision }) {
  const { d, peut, modifier, today, toast } = useStore();
  const r = a.revision;
  const [crit, setCrit] = useState('');
  const [groupe, setGroupe] = useState('');
  const [resp, setResp] = useState('');
  const [machine, setMachine] = useState('');
  const gamme = d.gammes.find((g) => g.ligneId === r.ligneId && g.statut === 'ACTIVE');
  const lignes = a.pdrs
    .filter((x) => !crit || x.pdr.criticite === crit)
    .filter((x) => !groupe || (groupe === 'NC' ? x.pdr.nonConforme : groupe === 'RISQUE' ? !x.disponible && x.ecart > -7 : ETAPE[x.pdr.etape].groupe === groupe))
    .filter((x) => !resp || x.responsable === resp)
    .filter((x) => !machine || x.pdr.machineId === machine)
    .sort((p, q) => Number(p.disponible) - Number(q.disponible) || q.ecart - p.ecart);
  const synchro = () => {
    if (!gamme) return;
    let bilan = { ajoutees: 0, majs: 0, horsGamme: 0 };
    modifier({ entite: 'Révision', entiteId: r.id, revisionId: r.id, action: 'SYNCHRO_GAMME', detail: `Besoins PDR synchronisés avec la gamme v${gamme.version}` }, (dr) => {
      const res = synchroniserPdr(dr.pdrs, gamme, r.id, today, () => nouvelId('PDR'));
      dr.pdrs = res.pdrs;
      dr.revisions.find((x) => x.id === r.id)!.gammeVersionId = gamme.id;
      bilan = res;
    });
    setTimeout(() => toast(`Gamme v${gamme.version} : ${bilan.ajoutees} PDR ajoutée(s), ${bilan.majs} mise(s) à jour, ${bilan.horsGamme} hors gamme`), 0);
  };
  return (
    <div className="stack">
      <div className="minis card">
        <div>
          <b>{a.pdrStats.total}</b>
          <span>identifiées</span>
        </div>
        <div>
          <b>{a.pdrStats.commandees}</b>
          <span>commandées</span>
        </div>
        <div>
          <b>{a.pdrStats.enTransit}</b>
          <span>en transit</span>
        </div>
        <div>
          <b>{a.pdrStats.arrivees}</b>
          <span>arrivées usine</span>
        </div>
        <div>
          <b>{a.pdrStats.receptionnees}</b>
          <span>réceptionnées</span>
        </div>
        <div className="ok">
          <b>{a.pdrStats.disponibles}</b>
          <span>disponibles</span>
        </div>
        <div className={a.pdrStats.critiquesManquantes ? 'crit' : 'ok'}>
          <b>{a.pdrStats.critiquesManquantes}</b>
          <span>critiques manquantes</span>
        </div>
      </div>
      <div className="filters">
        <select value={crit} onChange={(e) => setCrit(e.target.value)} aria-label="Criticité">
          <option value="">Toutes criticités</option>
          <option value="A">A — critique</option>
          <option value="B">B — importante</option>
          <option value="C">C — standard</option>
        </select>
        <select value={groupe} onChange={(e) => setGroupe(e.target.value)} aria-label="Étape">
          <option value="">Toutes étapes</option>
          <option value="RISQUE">À risque (marge &lt; 7 j)</option>
          <option value="Identification">Identification</option>
          <option value="Achats">Achats</option>
          <option value="Transit">Transit</option>
          <option value="Réception">Réception</option>
          <option value="Disponible">Disponibles</option>
          <option value="NC">Non conformes</option>
        </select>
        <select value={resp} onChange={(e) => setResp(e.target.value)} aria-label="Responsable">
          <option value="">Tous responsables</option>
          {(['BMC', 'ACHATS', 'TRANSIT', 'MAGASIN', 'MAINTENANCE'] as const).map((x) => (
            <option key={x} value={x}>
              {ROLES[x].court}
            </option>
          ))}
        </select>
        <select value={machine} onChange={(e) => setMachine(e.target.value)} aria-label="Machine">
          <option value="">Toutes machines</option>
          {d.machines
            .filter((m) => m.ligneId === r.ligneId)
            .map((m) => (
              <option key={m.id} value={m.id}>
                {m.code}
              </option>
            ))}
        </select>
        <span className="grow" />
        {peut('GAMME', r.ligneId) && gamme && STATUTS[r.statut].phase !== 'clos' && (
          <button className="btn sm" onClick={synchro} title="Ajoute les nouvelles lignes, met à jour les quantités, marque hors gamme les lignes retirées (jamais de suppression)">
            Générer / synchroniser depuis la gamme v{gamme.version}
          </button>
        )}
      </div>
      <Card tight>
        <TablePdr lignes={lignes} vide={a.pdrs.length ? 'Aucune PDR pour ces filtres.' : 'Aucune PDR : générez les besoins depuis la gamme active.'} />
      </Card>
    </div>
  );
}
