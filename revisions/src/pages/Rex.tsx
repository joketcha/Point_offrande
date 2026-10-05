import { fmt } from '../domain/dates';
import { DOMAINES_REX } from '../domain/rex';
import { useStore } from '../store/store';
import { Card, RoleBadge, Vide, aller } from '../ui/kit';

export default function RexPage() {
  const { d, visible } = useStore();
  const rex = d.rex.filter((x) => visible(x.ligneId)).sort((a, b) => b.dateCreation.localeCompare(a.dateCreation));
  const lecons = rex.flatMap((x) => x.lecons.map((l) => ({ l, x })));
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>REX — retours d'expérience</h1>
          <div className="sub">Créés automatiquement à la clôture ; les leçons sont reprises dans la préparation de la révision suivante de la ligne.</div>
        </div>
      </div>
      <Card titre="REX par révision" tight>
        {rex.length ? (
          <table className="tbl">
            <thead>
              <tr>
                <th>Révision</th>
                <th>Ligne</th>
                <th>Créé le</th>
                <th>Statut</th>
                <th className="num">Leçons</th>
                <th className="num">Intégrées</th>
              </tr>
            </thead>
            <tbody>
              {rex.map((x) => {
                const r = d.revisions.find((y) => y.id === x.revisionId);
                return (
                  <tr key={x.id} className="click" onClick={() => aller(`revision/${x.revisionId}/rex`)}>
                    <td className="b">{r?.code}</td>
                    <td>{d.lignes.find((l) => l.id === x.ligneId)?.nom}</td>
                    <td>{fmt(x.dateCreation)}</td>
                    <td>
                      <span className={`badge ${x.statut === 'VALIDE' ? 'ok' : 'act'}`}>{x.statut === 'VALIDE' ? 'Validé' : 'Brouillon'}</span>
                    </td>
                    <td className="num">{x.lecons.length}</td>
                    <td className="num">{x.lecons.filter((l) => l.integree).length}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        ) : (
          <Vide>Aucun REX.</Vide>
        )}
      </Card>
      <Card titre="Base de leçons (toutes lignes)" tight>
        {lecons.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Révision</th>
                  <th>Domaine</th>
                  <th>Leçon</th>
                  <th>Action pour la prochaine révision</th>
                  <th>Responsable</th>
                  <th>Intégrée</th>
                </tr>
              </thead>
              <tbody>
                {lecons.map(({ l, x }) => (
                  <tr key={l.id}>
                    <td className="nowrap">{d.revisions.find((y) => y.id === x.revisionId)?.code}</td>
                    <td>{DOMAINES_REX[l.domaine].libelle}</td>
                    <td>{l.lecon}</td>
                    <td className="b">{l.actionProchaineRevision}</td>
                    <td>
                      <RoleBadge r={l.responsable} />
                    </td>
                    <td>{l.integree ? <span className="badge ok">Oui</span> : <span className="badge">Non</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Vide>Aucune leçon.</Vide>
        )}
      </Card>
    </div>
  );
}
