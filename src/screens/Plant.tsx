import { useState } from 'react';
import { PROJECTS } from '../data/projects';
import { projectAvailability } from '../engine/effects';
import { allModes, effectiveEta, expectedModeCost, isRedundant, monthlyCapacity, observedWeibull, plannedLoad, BACKGROUND_SHARE } from '../engine/simulation';
import { STRATEGY_LABEL, type ModePolicy, type Strategy } from '../engine/types';
import { activeSite, useGameState } from '../store/game';
import { StatusPill } from '../ui/Charts';
import { ConfirmButton } from '../ui/Pedagogy';

const fmt = (x: number, d = 0) => x.toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: d });

export function Plant() {
  const { game, dispatch } = useGameState();
  const { def, plant, isTakeover } = activeSite(game);
  const [line, setLine] = useState(def.lines[0].id);
  const [compare, setCompare] = useState<string | null>(null);
  const weibullView = plant.unlocks.includes('WEIBULL-VIEW') || isTakeover;
  const cap = monthlyCapacity(def, plant);
  const load = plannedLoad(def, plant);
  const decisionSupport = game.player.level >= 3 || isTakeover;
  const failures12 = plant.events.filter((e) => (e.kind === 'panne' || e.kind === 'induite') && e.month > plant.month - 12);
  const projects = PROJECTS.filter((p) => p.plantId === def.id);

  return (
    <div className="fade-in">
      <h1>Usine — {def.name}</h1>
      <p className="text-2 small">
        Définissez la stratégie de maintenance de chaque mode de défaillance. Les conséquences apparaîtront au prochain mois simulé. {def.site}.
      </p>

      <div className="grid-2">
        <div className="card">
          <h3>Équipe maintenance</h3>
          <div className="small">
            {plant.technicians} techniciens · capacité {fmt(cap)} h/mois, dont {fmt(cap * BACKGROUND_SHARE)} h absorbées par les demandes courantes · charge planifiée (préventif + inspections) : <b>{fmt(load)} h</b> sur {fmt(cap * (1 - BACKGROUND_SHARE))} h
            disponibles · backlog {fmt(plant.backlogHours)} h.
          </div>
          {load > cap * (1 - BACKGROUND_SHARE) * 0.8 && (
            <div className="callout bad small">Plan de maintenance trop lourd pour l’équipe : la conformité préventive va chuter et le backlog augmenter.</div>
          )}
        </div>
        <div className="card">
          <h3>Causes latentes (pannes répétitives)</h3>
          {def.latentDefects.map((d) => {
            const known = !isTakeover ? plant.resolvedDefects.includes(d.id) || game.player.missions[d.resolvedBy] : plant.unlocks.includes('DIAGNOSTIC');
            return (
              <div key={d.id} className="small" style={{ marginBottom: 4 }}>
                {plant.resolvedDefects.includes(d.id) ? <StatusPill level="good">éliminée</StatusPill> : <StatusPill level="warn">active</StatusPill>}{' '}
                {known ? d.label : 'Cause non identifiée — ' + (isTakeover ? 'lancez le diagnostic de reprise' : 'une mission d’analyse est nécessaire')}
              </div>
            );
          })}
        </div>
      </div>

      <div className="card section">
        <h3>Projets d’amélioration</h3>
        <div className="grid-2">
          {projects.map((p) => {
            const av = projectAvailability(p, plant, game.player.missions);
            return (
              <div key={p.id} className="option" style={{ cursor: 'default' }}>
                <span style={{ flex: 1 }}>
                  <b>{p.title}</b> <span className="pill">{fmt(p.cost / 1e6)} M FCFA</span>
                  <div className="sub">{p.description}</div>
                  {av.ok ? (
                    <div style={{ marginTop: 6 }}>
                      <ConfirmButton className="btn small" label="Lancer" confirmLabel={`Engager ${fmt(p.cost / 1e6)} M FCFA`} onConfirm={() => dispatch({ type: 'project', id: p.id })} />
                    </div>
                  ) : (
                    <div className="sub">
                      <i>{av.reason}</i>
                    </div>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      <div className="tabs section">
        {def.lines.map((l) => (
          <button key={l.id} className={line === l.id ? 'active' : ''} onClick={() => setLine(l.id)}>
            {l.name}
          </button>
        ))}
      </div>

      {def.equipment
        .filter((e) => e.lineId === line)
        .map((eq) => (
          <div key={eq.tag} className="card">
            <div className="card-title">
              <div>
                <h3>
                  {eq.tag} — {eq.name}
                </h3>
                <div className="small muted">
                  {eq.type} · {eq.ageYears} ans · {eq.runHours} h/mois · perte {fmt(eq.lossRate / 1e6, 1)} M FCFA/h{isRedundant(eq, plant) ? ' · redondé' : ''}
                </div>
              </div>
              <span className={`pill ${eq.criticality === 'A' ? 'crit' : eq.criticality === 'B' ? 'warn' : ''}`}>Criticité {eq.criticality}</span>
            </div>
            {eq.modes.map((mode) => {
              const key = `${eq.tag}:${mode.id}`;
              const st = plant.modes[key];
              const obs = observedWeibull(def, plant, key, mode);
              const n = failures12.filter((f) => f.tag === eq.tag && f.modeId === mode.id).length;
              const pol = st.policy;
              const set = (p: Partial<ModePolicy>) => dispatch({ type: 'policy', key, policy: p });
              return (
                <div key={mode.id} className="eq-row">
                  <div>
                    <b>{mode.name}</b>
                    <div className="small muted">
                      {mode.hse && <span className="pill crit">HSE</span>} {mode.hidden && <span className="pill warn">cachée</span>} Pannes 12 mois : {n} · âge {fmt(st.age)} h
                    </div>
                  </div>
                  <div className="small">
                    {weibullView ? (
                      <>
                        β ≈ {fmt(obs.beta, 2)} · η ≈ {fmt(obs.eta)} h
                        <div className="muted">confiance {obs.confidence} (données {fmt(plant.dataQuality)}/100)</div>
                      </>
                    ) : (
                      <span className="muted">Loi de vie inconnue (mission Weibull)</span>
                    )}
                    <div className="muted">{mode.pf ? `Détectable : ${mode.detection?.join(', ')} · P-F ≈ ${mode.pf} h` : 'Pas de signe précurseur exploitable'}</div>
                  </div>
                  <label className="field">
                    Stratégie
                    <select value={pol.strategy} onChange={(e) => set({ strategy: e.target.value as Strategy })}>
                      {(Object.keys(STRATEGY_LABEL) as Strategy[]).map((s) => (
                        <option key={s} value={s} disabled={s === 'PDM' && !plant.unlocks.includes('PDM')}>
                          {STRATEGY_LABEL[s]}
                          {s === 'PDM' && !plant.unlocks.includes('PDM') ? ' (plateforme requise)' : ''}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="row" style={{ flexWrap: 'nowrap' }}>
                    {pol.strategy === 'PM' && (
                      <label className="field">
                        Remplacer tous les (h)
                        <input type="number" min={50} step={50} value={pol.pmInterval} onChange={(e) => set({ pmInterval: Math.max(50, +e.target.value || 50) })} />
                      </label>
                    )}
                    {pol.strategy === 'CBM' && (
                      <label className="field">
                        Inspecter tous les (h)
                        <input type="number" min={12} step={10} value={pol.inspInterval} onChange={(e) => set({ inspInterval: Math.max(12, +e.target.value || 12) })} />
                      </label>
                    )}
                    {decisionSupport && (
                      <button className="btn small ghost" style={{ alignSelf: 'flex-end' }} onClick={() => setCompare(compare === key ? null : key)}>
                        Comparer
                      </button>
                    )}
                  </div>
                  {compare === key && (
                    <div style={{ gridColumn: '1 / -1' }}>
                      <CompareTable modeKey={key} current={pol} etaEff={effectiveEta(def, plant, key, mode)} />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      {!decisionSupport && <p className="small muted">L’outil de comparaison économique des stratégies se débloque au niveau 3 (Ingénieur Méthodes).</p>}
      <p className="small muted">Nombre total de modes suivis sur le site : {allModes(def).length}.</p>
    </div>
  );
}

function CompareTable({ modeKey, current, etaEff }: { modeKey: string; current: ModePolicy; etaEff: number }) {
  const { game } = useGameState();
  const { def, plant } = activeSite(game);
  const strategies: ModePolicy[] = [
    { ...current, strategy: 'RTF' },
    { ...current, strategy: 'PM' },
    { ...current, strategy: 'CBM' },
    ...(plant.unlocks.includes('PDM') ? [{ ...current, strategy: 'PDM' as Strategy }] : []),
  ];
  return (
    <div className="card" style={{ margin: '6px 0' }}>
      <div className="small muted">Simulation Monte-Carlo (300 × 24 mois) avec vos intervalles actuels — estimation basée sur la loi réelle (η effectif ≈ {fmt(etaEff)} h). En vrai, vous ne la connaîtriez qu’avec de bonnes données.</div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Stratégie</th>
              <th className="num">Coût maint./mois</th>
              <th className="num">Pertes/mois</th>
              <th className="num">Pannes/an</th>
              <th className="num">Charge h/mois</th>
              <th className="num">Total/mois</th>
            </tr>
          </thead>
          <tbody>
            {strategies.map((p) => {
              const r = expectedModeCost(def, plant, modeKey, p);
              return (
                <tr key={p.strategy} className={p.strategy === current.strategy ? 'selected' : ''}>
                  <td>{STRATEGY_LABEL[p.strategy]}</td>
                  <td className="num">{fmt(r.cost / 1e6, 2)} M</td>
                  <td className="num">{fmt(r.loss / 1e6, 2)} M</td>
                  <td className="num">{fmt(r.failures * 12, 1)}</td>
                  <td className="num">{fmt(r.laborHours, 1)}</td>
                  <td className="num">
                    <b>{fmt((r.cost + r.loss) / 1e6, 2)} M</b>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
