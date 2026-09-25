import { dormantStock } from '../engine/simulation';
import { activeSite, useGameState } from '../store/game';
import { StatusPill } from '../ui/Charts';

const fmt = (x: number, d = 0) => x.toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: d });

export function Store() {
  const { game, dispatch } = useGameState();
  const { def, plant } = activeSite(game);
  const partMode = (id: string) => def.equipment.flatMap((e) => e.modes.map((m) => ({ e, m }))).filter((x) => x.m.partId === id);
  // Consommation 12 mois (quantités) à partir de l'historique d'interventions
  const cons = Object.fromEntries(
    def.parts.map((p) => {
      const users = partMode(p.id);
      const q = plant.events.filter((ev) => ev.month > plant.month - 12 && users.some((u) => u.e.tag === ev.tag && u.m.id === ev.modeId)).reduce((a, ev) => a + (users.find((u) => u.e.tag === ev.tag)?.m.partQty ?? 1), 0);
      return [p.id, q];
    }),
  );
  // Classification ABC sur la valeur consommée
  const valued = def.parts.map((p) => ({ p, v: cons[p.id] * p.unitCost })).sort((a, b) => b.v - a.v);
  const total = valued.reduce((a, x) => a + x.v, 0) || 1;
  let cum = 0;
  const abc: Record<string, string> = {};
  for (const x of valued) {
    cum += x.v;
    abc[x.p.id] = x.v === 0 ? '—' : cum / total <= 0.8 ? 'A' : cum / total <= 0.95 ? 'B' : 'C';
  }
  const dormant = dormantStock(def, plant);
  const stockValue = def.parts.reduce((a, p) => a + (plant.stock[p.id] ?? 0) * p.unitCost, 0);
  const dormantValue = dormant.reduce((a, d) => a + d.value, 0);

  return (
    <div className="fade-in">
      <h1>Magasin pièces de rechange</h1>
      <div className="kpis">
        <div className="kpi">
          <div className="label">Valeur du stock</div>
          <div className="value num">{fmt(stockValue / 1e6)} M</div>
        </div>
        <div className="kpi">
          <div className="label">Stock dormant (&gt; 12 mois)</div>
          <div className="value num">{fmt(dormantValue / 1e6)} M</div>
          <div className="small muted">{fmt((dormantValue / (stockValue || 1)) * 100)} % du stock</div>
        </div>
        <div className="kpi">
          <div className="label">Coût de possession</div>
          <div className="value num">{fmt((stockValue * def.holdingRate) / 1e6 / 12, 1)} M/mois</div>
        </div>
        <div className="kpi">
          <div className="label">Commandes en cours</div>
          <div className="value num">{plant.orders.length}</div>
        </div>
      </div>
      <div className="callout info small">
        Min = point de commande (on commande quand stock + en-cours ≤ min) ; Max = niveau de recomplètement. Les délais sont en jours ; en cas de rupture, la pièce est commandée en express (surcoût) et la machine attend.
      </div>
      <div className="card">
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Article</th>
                <th>Usage</th>
                <th className="num">Stock</th>
                <th className="num">En cde</th>
                <th className="num">P.U.</th>
                <th className="num">Conso 12 m</th>
                <th>ABC</th>
                <th className="num">Délai</th>
                <th>Min</th>
                <th>Max</th>
                <th>État</th>
              </tr>
            </thead>
            <tbody>
              {def.parts.map((p) => {
                const pol = plant.sparePolicy[p.id] ?? { min: 0, max: 0 };
                const onOrder = plant.orders.filter((o) => o.partId === p.id).reduce((a, o) => a + o.qty, 0);
                const isDormant = dormant.some((d) => d.part.id === p.id);
                const users = partMode(p.id);
                return (
                  <tr key={p.id}>
                    <td>
                      <b>{p.ref}</b>
                      <div className="small muted">{p.name}</div>
                    </td>
                    <td className="small">{users.map((u) => u.e.tag).filter((v, i, a) => a.indexOf(v) === i).join(', ') || '—'}</td>
                    <td className="num">{plant.stock[p.id] ?? 0}</td>
                    <td className="num">{onOrder || ''}</td>
                    <td className="num">{fmt(p.unitCost / 1e6, 2)} M</td>
                    <td className="num">{cons[p.id]}</td>
                    <td>{abc[p.id]}</td>
                    <td className="num">
                      {p.leadDays} j<div className="small muted">exp. {p.expressDays} j</div>
                    </td>
                    <td>
                      <input type="number" min={0} style={{ width: 64 }} value={pol.min} onChange={(e) => dispatch({ type: 'spare', partId: p.id, policy: { ...pol, min: Math.max(0, +e.target.value) } })} aria-label={`Min ${p.ref}`} />
                    </td>
                    <td>
                      <input type="number" min={0} style={{ width: 64 }} value={pol.max} onChange={(e) => dispatch({ type: 'spare', partId: p.id, policy: { ...pol, max: Math.max(0, +e.target.value) } })} aria-label={`Max ${p.ref}`} />
                    </td>
                    <td className="small">
                      {p.critical && <StatusPill level="warn">critique</StatusPill>} {p.duplicateOf && <StatusPill level="crit">doublon ?</StatusPill>} {p.obsolete && <StatusPill level="crit">obsolète ?</StatusPill>}{' '}
                      {isDormant && <StatusPill level="neutral">dormant</StatusPill>} {p.critical && !(plant.stock[p.id] ?? 0) && <StatusPill level="crit">rupture</StatusPill>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
      <p className="small muted">La purge des doublons et obsolètes se fait via la mission « Le magasin : 50 millions à libérer ? » (ou un projet de liquidation sur le site de reprise).</p>
    </div>
  );
}
