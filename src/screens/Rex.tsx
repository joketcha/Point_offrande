import { useState } from 'react';
import { paretoByEquipment } from '../engine/simulation';
import { activeSite, useGameState } from '../store/game';
import { BarList, StatusPill } from '../ui/Charts';

const fmt = (x: number, d = 0) => x.toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: d });

export function Rex() {
  const { game } = useGameState();
  const { def, plant } = activeSite(game);
  const [window, setWindow] = useState(12);
  const events = plant.events.filter((e) => e.month > plant.month - window);
  const failures = events.filter((e) => e.kind === 'panne' || e.kind === 'induite');
  const byEq = paretoByEquipment(def, events);
  const modeName = (tag: string, id: string) => def.equipment.find((e) => e.tag === tag)?.modes.find((m) => m.id === id)?.name ?? id;
  const byMode = new Map<string, { label: string; count: number; repeat: number; loss: number }>();
  for (const f of failures) {
    const k = `${f.tag}:${f.modeId}`;
    const cur = byMode.get(k) ?? { label: `${f.tag} — ${modeName(f.tag, f.modeId)}`, count: 0, repeat: 0, loss: 0 };
    cur.count++;
    cur.loss += f.loss + f.cost;
    if (f.repeat) cur.repeat++;
    byMode.set(k, cur);
  }
  const modes = [...byMode.values()].sort((a, b) => b.count - a.count);
  const uncoded = failures.filter((f) => !f.codedCause).length;

  // Efficacité des actions : MTBF des modes concernés avant / après élimination d'une cause latente
  const effectiveness = def.latentDefects
    .filter((d) => plant.resolvedDefects.includes(d.id))
    .map((d) => {
      const at = plant.resolvedAt?.[d.id] ?? 0;
      const run = (key: string) => def.equipment.find((e) => e.tag === key.split(':')[0])?.runHours ?? 500;
      const count = (from: number, to: number) => plant.events.filter((e) => (e.kind === 'panne' || e.kind === 'induite') && d.modes.includes(`${e.tag}:${e.modeId}`) && e.month > from && e.month <= to).length;
      const before = count(0, at);
      const after = count(at, plant.month);
      const hours = d.modes.reduce((a, k) => a + run(k), 0);
      const mtbfBefore = at > 0 ? (hours * at) / Math.max(before, 0.5) : NaN;
      const mtbfAfter = plant.month - at > 0 ? (hours * (plant.month - at)) / Math.max(after, 0.5) : NaN;
      return { d, at, before, after, mtbfBefore, mtbfAfter, monthsAfter: plant.month - at };
    });

  return (
    <div className="fade-in">
      <h1>Retour d’expérience (REX)</h1>
      <p className="text-2 small">Chaque panne simulée alimente automatiquement la base REX. Vérifiez si vos actions fonctionnent réellement.</p>
      <div className="row" style={{ marginBottom: 12 }}>
        {[3, 6, 12, 24].map((w) => (
          <button key={w} className={`btn small ${window === w ? 'primary' : ''}`} onClick={() => setWindow(w)}>
            {w} mois
          </button>
        ))}
      </div>
      <div className="kpis">
        <div className="kpi">
          <div className="label">Pannes</div>
          <div className="value num">{failures.length}</div>
        </div>
        <div className="kpi">
          <div className="label">Pannes répétitives</div>
          <div className="value num">{failures.filter((f) => f.repeat).length}</div>
        </div>
        <div className="kpi">
          <div className="label">OT sans cause codée</div>
          <div className="value num">{failures.length ? fmt((uncoded / failures.length) * 100) : 0} %</div>
        </div>
        <div className="kpi">
          <div className="label">Coût + pertes</div>
          <div className="value num">{fmt(failures.reduce((a, f) => a + f.loss + f.cost, 0) / 1e6)} M</div>
        </div>
      </div>
      {failures.length === 0 ? (
        <div className="card section">Aucune panne sur la période. Simulez des mois depuis le Cockpit.</div>
      ) : (
        <div className="grid-2 section">
          <div className="card">
            <h3>Pareto des pertes par équipement</h3>
            <p className="small muted">Coût de réparation + marge perdue ; % = cumul. Les barres orange forment les ~80 % des pertes.</p>
            <BarList items={byEq.slice(0, 10).map((e) => ({ label: `${e.tag} — ${e.name}`, value: e.loss / 1e6, sub: `${e.count} pannes · ${fmt(e.downtime)} h d’arrêt` }))} format={(v) => `${fmt(v)} M`} showCumulative />
          </div>
          <div className="card">
            <h3>Modes de défaillance les plus fréquents</h3>
            <BarList items={modes.slice(0, 10).map((m) => ({ label: m.label, value: m.count, sub: m.repeat ? `${m.repeat} répétitive(s)` : undefined }))} format={(v) => `${v}`} />
          </div>
        </div>
      )}
      <div className="card section">
        <h3>Efficacité des actions correctives</h3>
        {effectiveness.length === 0 && <p className="small muted">Aucune cause latente éliminée pour l’instant. Les missions RCA, AMDEC, RCM et Magasin permettent d’en éliminer.</p>}
        {effectiveness.map((x) => (
          <div key={x.d.id} className="small" style={{ marginBottom: 8 }}>
            <b>{x.d.label}</b> — éliminée au mois {x.at}.{' '}
            {x.monthsAfter < 3 ? (
              <StatusPill level="neutral">Recul insuffisant ({x.monthsAfter} mois) — vérification à 3 mois minimum</StatusPill>
            ) : (
              <>
                MTBF des modes concernés : {isFinite(x.mtbfBefore) ? fmt(x.mtbfBefore) : '—'} h → {fmt(x.mtbfAfter)} h{' '}
                {x.mtbfAfter > x.mtbfBefore * 1.3 || !isFinite(x.mtbfBefore) ? <StatusPill level="good">efficace</StatusPill> : <StatusPill level="warn">à confirmer</StatusPill>}
              </>
            )}
          </div>
        ))}
      </div>
      <div className="card section">
        <h3>Bibliothèque des défaillances (dernières)</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mois</th>
                <th>Équipement</th>
                <th>Mode</th>
                <th>Type</th>
                <th className="num">Arrêt (h)</th>
                <th className="num">Attente pièce</th>
                <th className="num">Perte</th>
                <th>Cause codée GMAO</th>
              </tr>
            </thead>
            <tbody>
              {[...events].reverse().slice(0, 40).map((e, i) => (
                <tr key={i}>
                  <td className="num">{e.month}</td>
                  <td>{e.tag}</td>
                  <td>
                    {modeName(e.tag, e.modeId)} {e.repeat && <StatusPill level="crit">répétitive</StatusPill>}
                  </td>
                  <td>{e.kind}</td>
                  <td className="num">{fmt(e.downtime, 1)}</td>
                  <td className="num">{e.waitParts ? fmt(e.waitParts) : ''}</td>
                  <td className="num">{fmt(e.loss / 1e6, 1)} M</td>
                  <td className="small">{e.kind === 'panne' || e.kind === 'induite' ? e.codedCause ?? <span className="muted">« réparé »</span> : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
