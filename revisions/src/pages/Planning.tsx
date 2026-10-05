import { useMemo, useState } from 'react';
import { addDays, diffDays, fmtCourt } from '../domain/dates';
import { ROLES, STATUTS, WORKFLOW } from '../domain/referentiel';
import type { Revision, StatutRevision } from '../domain/types';
import { nouvelId, useStore } from '../store/store';
import { Card, Champ, EcartBadge, Modal, NiveauBadge, Prog, StatutBadge, Vide, aller, csv, telecharger } from '../ui/kit';
import { ModalReport } from '../ui/RevisionActions';

export function useFiltresArbo() {
  const { d } = useStore();
  const [site, setSite] = useState('');
  const [atelier, setAtelier] = useState('');
  const [ligne, setLigne] = useState('');
  const ateliers = d.ateliers.filter((a) => !site || a.siteId === site);
  const lignes = d.lignes.filter((l) => (!atelier || l.atelierId === atelier) && ateliers.some((a) => a.id === l.atelierId));
  const garde = (ligneId: string) => lignes.some((l) => l.id === ligneId) && (!ligne || ligne === ligneId);
  const ui = (
    <>
      <select value={site} onChange={(e) => (setSite(e.target.value), setAtelier(''), setLigne(''))} aria-label="Site">
        <option value="">Tous sites</option>
        {d.sites.map((s) => (
          <option key={s.id} value={s.id}>
            {s.nom}
          </option>
        ))}
      </select>
      <select value={atelier} onChange={(e) => (setAtelier(e.target.value), setLigne(''))} aria-label="Atelier">
        <option value="">Tous ateliers</option>
        {ateliers.map((a) => (
          <option key={a.id} value={a.id}>
            {a.nom}
          </option>
        ))}
      </select>
      <select value={ligne} onChange={(e) => setLigne(e.target.value)} aria-label="Ligne">
        <option value="">Toutes lignes</option>
        {lignes.map((l) => (
          <option key={l.id} value={l.id}>
            {l.code} — {l.nom}
          </option>
        ))}
      </select>
    </>
  );
  return { ui, garde, ligne };
}

export default function Planning() {
  const { d, analyses, visible, peut, today } = useStore();
  const f = useFiltresArbo();
  const [statut, setStatut] = useState<'' | StatutRevision | 'REPORTEE'>('');
  const [annee, setAnnee] = useState<string>('');
  const [creer, setCreer] = useState(false);
  const [report, setReport] = useState<Revision | null>(null);
  const annees = [...new Set(d.revisions.map((r) => r.annee))].sort();
  const lignes = useMemo(
    () =>
      analyses
        .filter((a) => visible(a.revision.ligneId) && f.garde(a.revision.ligneId))
        .filter((a) => !annee || String(a.revision.annee) === annee)
        .filter((a) => !statut || (statut === 'REPORTEE' ? a.derive.nbReports > 0 : a.revision.statut === statut))
        .sort((x, y) => x.revision.datePrevue.localeCompare(y.revision.datePrevue)),
    [analyses, visible, f, annee, statut],
  );

  const exporter = () =>
    telecharger(
      `planning-revisions-${today}.csv`,
      csv([
        ['ID', 'Année', 'Site', 'Atelier', 'Ligne', 'Responsable', 'Date initiale', 'Date prévue', 'Début réel', 'Fin réelle', 'Durée prévue (j)', 'Durée réelle (j)', 'Nb reports', 'Dernier motif', 'Dérive (j)', 'Statut', 'Risque', 'Préparation %', 'Commentaire'],
        ...lignes.map((a) => [
          a.revision.code,
          a.revision.annee,
          a.chemin.site?.nom,
          a.chemin.atelier?.nom,
          a.chemin.ligne?.code,
          d.utilisateurs.find((u) => u.id === a.revision.responsableId)?.nom,
          a.revision.dateInitiale,
          a.revision.datePrevue,
          a.revision.dateReelleDebut,
          a.revision.dateReelleFin,
          a.revision.dureePrevueJours,
          a.revision.dateReelleDebut && a.revision.dateReelleFin ? diffDays(a.revision.dateReelleDebut, a.revision.dateReelleFin) : '',
          a.derive.nbReports,
          a.revision.reports.at(-1)?.motif,
          a.derive.derivePlanning,
          STATUTS[a.revision.statut].libelle,
          a.niveauRisque,
          a.preparation.taux,
          a.revision.commentaire,
        ]),
      ]),
    );

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Planification annuelle</h1>
          <div className="sub">Fiches de révision : prévu initial, prévu actuel et réel — jamais écrasés.</div>
        </div>
        <div className="grow" />
        <button className="btn" onClick={exporter}>
          Export Excel (CSV)
        </button>
        {peut('PLANNING') && (
          <button className="btn primary" onClick={() => setCreer(true)}>
            + Nouvelle révision
          </button>
        )}
      </div>
      <div className="filters">
        {f.ui}
        <select value={annee} onChange={(e) => setAnnee(e.target.value)} aria-label="Année">
          <option value="">Toutes années</option>
          {annees.map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
        <select value={statut} onChange={(e) => setStatut(e.target.value as typeof statut)} aria-label="Statut">
          <option value="">Tous statuts</option>
          {[...WORKFLOW, 'ANNULEE' as const].map((s) => (
            <option key={s} value={s}>
              {STATUTS[s].libelle}
            </option>
          ))}
          <option value="REPORTEE">Reportées (≥ 1 report)</option>
        </select>
      </div>
      <Card tight>
        {lignes.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Ligne</th>
                  <th>Responsable</th>
                  <th>Initiale</th>
                  <th>Prévue</th>
                  <th>Réel début → fin</th>
                  <th className="num">Durée prév./réelle</th>
                  <th>Reports</th>
                  <th>Dérive</th>
                  <th>Statut</th>
                  <th style={{ minWidth: 110 }}>Préparation</th>
                  <th>Risque</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {lignes.map((a) => {
                  const r = a.revision;
                  return (
                    <tr key={r.id} className="click" onClick={() => aller(`revision/${r.id}`)}>
                      <td className="b nowrap">
                        {r.code}
                        <div className="tiny muted">{r.annee}</div>
                      </td>
                      <td>
                        {a.chemin.ligne?.code} — {a.chemin.ligne?.nom}
                        <div className="tiny muted">
                          {a.chemin.site?.code} › {a.chemin.atelier?.nom}
                        </div>
                      </td>
                      <td className="nowrap">{d.utilisateurs.find((u) => u.id === r.responsableId)?.nom ?? '—'}</td>
                      <td className="nowrap muted">{fmtCourt(r.dateInitiale)}</td>
                      <td className="nowrap b">{fmtCourt(r.datePrevue)}</td>
                      <td className="nowrap">
                        {r.dateReelleDebut ? `${fmtCourt(r.dateReelleDebut)} → ${r.dateReelleFin ? fmtCourt(r.dateReelleFin) : '…'}` : '—'}
                      </td>
                      <td className="num nowrap">
                        {r.dureePrevueJours} j / {r.dateReelleDebut && r.dateReelleFin ? `${diffDays(r.dateReelleDebut, r.dateReelleFin)} j` : '—'}
                      </td>
                      <td className="nowrap" title={r.reports.map((x) => `v${x.version} : ${x.motif}`).join('\n')}>
                        {r.reports.length ? <span className="badge vig">×{r.reports.length}</span> : <span className="muted">0</span>}
                        {r.reports.length > 0 && <div className="tiny muted" style={{ maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.reports.at(-1)!.motif}</div>}
                      </td>
                      <td>
                        <EcartBadge j={a.derive.derivePlanning} />
                      </td>
                      <td>
                        <StatutBadge s={r.statut} />
                      </td>
                      <td>
                        <div className="row" style={{ flexWrap: 'nowrap' }}>
                          <Prog v={a.preparation.taux} />
                          <span className="small">{a.preparation.taux}%</span>
                        </div>
                      </td>
                      <td>
                        <NiveauBadge n={a.niveauRisque} court />
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        {peut('PLANNING', r.ligneId) && !r.dateReelleDebut && STATUTS[r.statut].phase === 'amont' && (
                          <button className="btn sm" onClick={() => setReport(r)}>
                            Reporter
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Vide>Aucune révision pour ces filtres.</Vide>
        )}
      </Card>
      {creer && <ModalCreation onClose={() => setCreer(false)} />}
      {report && <ModalReport rev={report} onClose={() => setReport(null)} />}
    </div>
  );
}

function ModalCreation({ onClose }: { onClose: () => void }) {
  const { d, modifier, today, toast, visible } = useStore();
  const [ligneId, setLigneId] = useState(d.lignes.find((l) => visible(l.id))?.id ?? '');
  const [date, setDate] = useState(addDays(today, 240));
  const [duree, setDuree] = useState(8);
  const [resp, setResp] = useState((d.utilisateurs.find((u) => u.role === 'MAINTENANCE' && u.actif) ?? d.utilisateurs.find((u) => u.actif))?.id ?? '');
  const [redem, setRedem] = useState(24);
  const [stab, setStab] = useState(4);
  const [comment, setComment] = useState('');
  const ligne = d.lignes.find((l) => l.id === ligneId);
  const annee = Number(date.slice(0, 4));
  const code = `REV-${annee}-${ligne?.code ?? ''}`;
  const doublon = d.revisions.some((r) => r.code === code && r.statut !== 'ANNULEE');
  const gamme = d.gammes.find((g) => g.ligneId === ligneId && g.statut === 'ACTIVE');
  const valider = () => {
    const id = nouvelId('REV');
    const rev: Revision = {
      id,
      code: doublon ? `${code}-${d.revisions.filter((r) => r.code.startsWith(code)).length + 1}` : code,
      annee,
      ligneId,
      responsableId: resp,
      dateInitiale: date,
      datePrevue: date,
      dureePrevueJours: duree,
      statut: 'PLANIFIEE',
      reports: [],
      commentaire: comment,
      actionsPreparation: [],
      jalons: {},
      dureeRedemarragePrevueH: redem,
      dureeStabilisationPrevueJ: stab,
      cibleVitessePct: 90,
      cibleQualitePct: 98,
      gammeVersionId: gamme?.id,
    };
    modifier({ entite: 'Révision', entiteId: id, revisionId: id, action: 'CREATION', detail: `Création ${rev.code} prévue le ${date} (${duree} j)` }, (dr) => {
      dr.revisions.push(rev);
    });
    toast(`${rev.code} créée — Maintenance et Production informées`);
    onClose();
    aller(`revision/${id}`);
  };
  return (
    <Modal
      titre="Nouvelle révision annuelle"
      onClose={onClose}
      pied={
        <>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn primary" disabled={!ligneId || !resp || duree <= 0} onClick={valider}>
            Créer
          </button>
        </>
      }
    >
      <div className="form">
        <Champ label="Ligne" req>
          <select value={ligneId} onChange={(e) => setLigneId(e.target.value)}>
            {d.lignes
              .filter((l) => visible(l.id))
              .map((l) => (
                <option key={l.id} value={l.id}>
                  {l.code} — {l.nom}
                </option>
              ))}
          </select>
        </Champ>
        <Champ label="Date de début prévue (initiale)" req>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Champ>
        <Champ label="Durée prévue (jours)" req>
          <input type="number" min={1} value={duree} onChange={(e) => setDuree(Number(e.target.value))} />
        </Champ>
        <Champ label="Responsable" req>
          <select value={resp} onChange={(e) => setResp(e.target.value)}>
            {d.utilisateurs
              .filter((u) => u.actif && u.role !== 'DIRECTION' && u.role !== 'PRESTATAIRE')
              .sort((a, b) => Number(b.role === 'MAINTENANCE') - Number(a.role === 'MAINTENANCE'))
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.nom} — {ROLES[u.role].court}
                </option>
              ))}
          </select>
        </Champ>
        <Champ label="Redémarrage prévu (h)">
          <input type="number" min={1} value={redem} onChange={(e) => setRedem(Number(e.target.value))} />
        </Champ>
        <Champ label="Stabilisation prévue (j)">
          <input type="number" min={0} value={stab} onChange={(e) => setStab(Number(e.target.value))} />
        </Champ>
        <Champ label="Commentaire" full>
          <textarea value={comment} onChange={(e) => setComment(e.target.value)} />
        </Champ>
      </div>
      <div className="alert INFO small" style={{ marginTop: 10 }}>
        <div>
          Identifiant : <b>{code}</b>
          {doublon && <span className="act-txt"> (une révision existe déjà pour cette ligne et cette année)</span>}. Préparation (J-{d.parametres.moisPreparation} mois) : à partir du{' '}
          <b>{fmtCourt(addDays(date, -Math.round(d.parametres.moisPreparation * 30.4)))}</b>. Gamme : {gamme ? `v${gamme.version} (${gamme.lignes.length} PDR)` : <span className="crit-txt">aucune gamme active — à importer</span>}.
        </div>
      </div>
    </Modal>
  );
}
