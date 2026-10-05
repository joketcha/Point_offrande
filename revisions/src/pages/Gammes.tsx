import { useState } from 'react';
import { codeLigne, codeMachine } from '../domain/arbo';
import { fmt } from '../domain/dates';
import { comparerGammes } from '../domain/importGamme';
import { useStore } from '../store/store';
import { Card, Lien, Tabs, Vide, csv, telecharger } from '../ui/kit';
import { CritBadge } from '../ui/Pdr';

export default function Gammes() {
  const { d, visible } = useStore();
  const lignes = d.lignes.filter((l) => visible(l.id));
  const [ligneId, setLigneId] = useState(lignes[0]?.id ?? '');
  const [vue, setVue] = useState<'versions' | 'historique'>('versions');
  const versions = d.gammes.filter((g) => g.ligneId === ligneId).sort((a, b) => b.version - a.version);
  const [vid, setVid] = useState<string>('');
  const sel = versions.find((g) => g.id === vid) ?? versions[0];
  const prec = sel && versions.find((g) => g.version === sel.version - 1);
  const diff = sel && prec ? comparerGammes(prec.lignes, sel.lignes) : undefined;
  const exporter = () =>
    sel &&
    telecharger(
      `gamme_${codeLigne(d, ligneId)}_v${sel.version}.csv`,
      csv([
        ['Ligne', 'Machine', 'Sous-ensemble', 'Organe', 'Référence PDR', 'Désignation', 'Quantité', 'Criticité', 'Fournisseur', "Délai d'approvisionnement", 'Commentaire'],
        ...sel.lignes.map((l) => [codeLigne(d, ligneId), codeMachine(d, l.machineId), l.sousEnsemble, l.organe, l.ref, l.designation, l.quantite, l.criticite, l.fournisseur, l.delaiJours, l.commentaire]),
      ]),
    );
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Gammes de révision</h1>
          <div className="sub">Listes de PDR par machine et sous-ensemble, versionnées par ligne. Les versions remplacées restent consultables.</div>
        </div>
        <div className="grow" />
        <Lien to="import" className="btn primary">
          Importer une gamme
        </Lien>
      </div>
      <div className="chip-row">
        {lignes.map((l) => {
          const act = d.gammes.find((g) => g.ligneId === l.id && g.statut === 'ACTIVE');
          return (
            <button key={l.id} className={`chip ${ligneId === l.id ? 'on' : ''}`} onClick={() => (setLigneId(l.id), setVid(''))}>
              {l.code} {act ? `· v${act.version}` : '· aucune'}
            </button>
          );
        })}
      </div>
      <Tabs
        value={vue}
        onChange={setVue}
        items={[
          { id: 'versions', label: 'Versions' },
          { id: 'historique', label: 'Historique des imports' },
        ]}
      />
      {vue === 'versions' &&
        (versions.length ? (
          <div className="grid" style={{ gridTemplateColumns: 'minmax(220px, 280px) 1fr' }}>
            <Card titre="Versions" tight>
              {versions.map((g) => (
                <div key={g.id} className={`risk ${g.id === sel?.id ? 'lvl-INFO' : ''}`} style={{ cursor: 'pointer', gridTemplateColumns: '1fr auto' }} onClick={() => setVid(g.id)}>
                  <div>
                    <b>v{g.version}</b> <span className={`badge ${g.statut === 'ACTIVE' ? 'ok' : ''}`}>{g.statut === 'ACTIVE' ? 'Active' : 'Remplacée'}</span>
                    <div className="tiny muted">
                      {fmt(g.dateImport)} · {g.auteur}
                    </div>
                    <div className="tiny muted">{g.source}</div>
                  </div>
                  <span className="small">{g.lignes.length} lignes</span>
                </div>
              ))}
            </Card>
            {sel && (
              <Card titre={`Version ${sel.version} — ${codeLigne(d, ligneId)}`} sub={diff ? `vs v${prec!.version} : +${diff.ajoutees.length} ajoutée(s), −${diff.retirees.length} retirée(s), ${diff.modifiees.length} modifiée(s)` : 'Première version'} actions={<button className="btn sm" onClick={exporter}>Export CSV</button>} tight>
                <div className="tbl-wrap">
                  <table className="tbl">
                    <thead>
                      <tr>
                        <th>Machine</th>
                        <th>Sous-ensemble › organe</th>
                        <th>Réf.</th>
                        <th>Désignation</th>
                        <th className="num">Qté</th>
                        <th>Crit.</th>
                        <th>Fournisseur</th>
                        <th className="num">Délai</th>
                        <th>Évolution</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sel.lignes.map((l, k) => {
                        const ajout = diff?.ajoutees.includes(l);
                        const modif = diff?.modifiees.find((m) => m.apres === l);
                        return (
                          <tr key={k}>
                            <td className="nowrap">{codeMachine(d, l.machineId)}</td>
                            <td className="small">
                              {l.sousEnsemble} › {l.organe}
                            </td>
                            <td className="mono nowrap">{l.ref}</td>
                            <td>
                              {l.designation}
                              {l.commentaire && <div className="tiny muted">{l.commentaire}</div>}
                            </td>
                            <td className="num">{l.quantite}</td>
                            <td>
                              <CritBadge c={l.criticite} />
                            </td>
                            <td className="small">{l.fournisseur}</td>
                            <td className="num">{l.delaiJours} j</td>
                            <td>{ajout ? <span className="badge ok">Ajoutée</span> : modif ? <span className="badge act" title={modif.champs.map((c) => `${c} : ${String(modif.avant[c])} → ${String(modif.apres[c])}`).join('\n')}>Modifiée ({modif.champs.join(', ')})</span> : null}</td>
                          </tr>
                        );
                      })}
                      {diff?.retirees.map((l, k) => (
                        <tr key={`r${k}`} style={{ opacity: 0.6 }}>
                          <td>{codeMachine(d, l.machineId)}</td>
                          <td className="small">
                            {l.sousEnsemble} › {l.organe}
                          </td>
                          <td className="mono">{l.ref}</td>
                          <td>
                            <s>{l.designation}</s>
                          </td>
                          <td className="num">{l.quantite}</td>
                          <td>
                            <CritBadge c={l.criticite} />
                          </td>
                          <td className="small">{l.fournisseur}</td>
                          <td className="num">{l.delaiJours} j</td>
                          <td>
                            <span className="badge crit">Retirée</span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}
          </div>
        ) : (
          <Card>
            <Vide>
              Aucune gamme pour cette ligne. <Lien to="import">Importer une gamme</Lien>
            </Vide>
          </Card>
        ))}
      {vue === 'historique' && (
        <Card tight>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Fichier</th>
                  <th>Ligne</th>
                  <th>Auteur</th>
                  <th className="num">Lignes</th>
                  <th className="num">Erreurs</th>
                  <th className="num">Avert.</th>
                  <th>Résultat</th>
                  <th>Résumé</th>
                </tr>
              </thead>
              <tbody>
                {[...d.imports]
                  .filter((i) => !i.ligneId || visible(i.ligneId))
                  .sort((a, b) => b.date.localeCompare(a.date))
                  .map((i) => (
                    <tr key={i.id}>
                      <td className="nowrap">{fmt(i.date)}</td>
                      <td className="mono small">{i.fichier}</td>
                      <td>{i.ligneId ? codeLigne(d, i.ligneId) : '—'}</td>
                      <td>{i.auteur}</td>
                      <td className="num">{i.nbLignes}</td>
                      <td className="num">{i.nbErreurs}</td>
                      <td className="num">{i.nbAvertissements}</td>
                      <td>
                        <span className={`badge ${i.resultat === 'IMPORTE' ? 'ok' : 'crit'}`}>{i.resultat === 'IMPORTE' ? 'Importé' : 'Rejeté'}</span>
                      </td>
                      <td className="small">{i.resume}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
