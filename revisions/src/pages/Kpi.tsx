import { etatKpi } from '../domain/kpi';
import { useStore } from '../store/store';
import { Card, csv, telecharger } from '../ui/kit';

export default function KpiPage() {
  const { kpis, today } = useStore();
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>KPI</h1>
          <div className="sub">Calculés en continu à partir des révisions (toutes lignes). Vert : cible tenue · rouge : hors cible.</div>
        </div>
        <div className="grow" />
        <button
          className="btn"
          onClick={() =>
            telecharger(
              `kpi-${today}.csv`,
              csv([['Famille', 'Indicateur', 'Valeur', 'Unité', 'Cible', 'Base'], ...kpis.flatMap((f) => f.kpis.map((k) => [f.famille, k.libelle, k.valeur ?? '', k.unite, k.cible ?? '', k.base]))]),
            )
          }
        >
          Export (CSV)
        </button>
      </div>
      <div className="grid g3">
        {kpis.map((f) => (
          <Card key={f.famille} titre={f.famille}>
            <div className="col" style={{ gap: 12 }}>
              {f.kpis.map((k) => {
                const e = etatKpi(k);
                return (
                  <div key={k.cle}>
                    <div className="row" style={{ flexWrap: 'nowrap', alignItems: 'baseline' }}>
                      <span className="small grow">{k.libelle}</span>
                      <b style={{ fontSize: 20 }} className={e === 'ko' ? 'crit-txt' : e === 'ok' ? 'ok-txt' : ''}>
                        {k.valeur ?? '—'}
                        {k.valeur !== undefined && <span className="small"> {k.unite}</span>}
                      </b>
                    </div>
                    <div className="tiny muted">
                      {k.base}
                      {k.cible !== undefined && ` · cible ${k.sens === 'haut' ? '≥' : '≤'} ${k.cible}${k.unite}`}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}
