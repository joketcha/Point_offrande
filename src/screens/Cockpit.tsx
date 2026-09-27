import { useState } from 'react';
import type { Nav } from '../App';
import { MENTORS } from '../data/mentors';
import { policyWarnings } from '../engine/effects';
import { industrialImpact, promotionStatus, recommendMissions } from '../engine/progression';
import { monthDebrief } from '../engine/simulation';
import { TAKEOVER_MONTHS } from '../engine/takeover';
import type { MonthKpi } from '../engine/types';
import { activeSite, useGameState } from '../store/game';
import { LineChart, Meter, Sparkline, StatusPill } from '../ui/Charts';
import { ConfirmButton, IN_FRAME, MentorLine } from '../ui/Pedagogy';

const pct = (x: number, d = 1) => `${(x * 100).toFixed(d)} %`;
const mf = (x: number) => `${(x / 1e6).toFixed(0)} M`;

interface KpiDef {
  key: keyof MonthKpi;
  label: string;
  fmt: (v: number) => string;
  better: 'up' | 'down';
  hint: string;
}

const KPI_DEFS: KpiDef[] = [
  { key: 'availability', label: 'Disponibilité usine', fmt: (v) => pct(v), better: 'up', hint: 'Heures de production équivalentes perdues / heures d’ouverture' },
  { key: 'oee', label: 'TRS / OEE', fmt: (v) => pct(v), better: 'up', hint: 'Disponibilité × Performance × Qualité' },
  { key: 'mtbf', label: 'MTBF parc', fmt: (v) => `${v.toFixed(0)} h`, better: 'up', hint: 'Heures de marche cumulées / pannes' },
  { key: 'mttr', label: 'Arrêt moyen / panne', fmt: (v) => `${v.toFixed(1)} h`, better: 'down', hint: 'Réparation + attente pièces' },
  { key: 'failures', label: 'Pannes', fmt: (v) => v.toFixed(0), better: 'down', hint: 'Défaillances fonctionnelles du mois' },
  { key: 'productionLoss', label: 'Pertes de marge', fmt: (v) => mf(v), better: 'down', hint: 'FCFA de marge perdue par les arrêts' },
  { key: 'maintCost', label: 'Coût maintenance', fmt: (v) => mf(v), better: 'down', hint: 'Main-d’œuvre, pièces, sous-traitance, projets' },
  { key: 'pmCompliance', label: 'Conformité préventif', fmt: (v) => pct(v, 0), better: 'up', hint: 'Préventifs réalisés / préventifs dus' },
  { key: 'plannedPct', label: 'Travail planifié', fmt: (v) => pct(v, 0), better: 'up', hint: 'Interventions planifiées / total' },
  { key: 'backlogWeeks', label: 'Backlog', fmt: (v) => `${v.toFixed(1)} sem.`, better: 'down', hint: 'Travail en attente / capacité hebdo' },
  { key: 'repeatFailures', label: 'Pannes répétitives', fmt: (v) => v.toFixed(0), better: 'down', hint: 'Même mode sur le même équipement en moins de 3 mois' },
  { key: 'stockValue', label: 'Valeur du stock', fmt: (v) => mf(v), better: 'down', hint: 'Valeur immobilisée en magasin' },
  { key: 'stockouts', label: 'Ruptures pièces', fmt: (v) => v.toFixed(0), better: 'down', hint: 'Interventions sans pièce disponible' },
  { key: 'criticalSpareAvailability', label: 'Pièces critiques dispo.', fmt: (v) => pct(v, 0), better: 'up', hint: 'Part des articles critiques en stock' },
  { key: 'pdmEffectiveness', label: 'Efficacité conditionnel', fmt: (v) => pct(v, 0), better: 'up', hint: 'Dégradations détectées / (détectées + manquées)' },
  { key: 'costPerUnit', label: 'Coût maint.+pertes / unité', fmt: (v) => `${v.toFixed(0)} F`, better: 'down', hint: 'Par hL (ou t) produit' },
];

export function Cockpit({ nav }: { nav: Nav }) {
  const { game, dispatch } = useGameState();
  const { def, plant, isTakeover } = activeSite(game);
  const k = plant.kpis;
  const last = k.at(-1);
  const prev = k.at(-2);
  // Les alertes méthodes supposent la loi de vie connue : elles apparaissent après l'analyse Weibull.
  const warnings = plant.unlocks.includes('WEIBULL-VIEW') || isTakeover ? policyWarnings(def, plant) : [];
  const promo = promotionStatus(game);
  const rec = recommendMissions(game, 2);
  const [showAll, setShowAll] = useState(false);
  const labels = k.map((x) => `M${x.month}`);

  return (
    <div className="fade-in">
      {isTakeover && (
        <div className="callout bad">
          <b>TAKE OVER THE FACTORY</b> — {def.name}. Mois {plant.month} / {TAKEOVER_MONTHS}. Pilotez l’usine (écran Usine : stratégies, projets, magasin) et avancez mois par mois.
          <ConfirmButton className="btn small ghost" label="Abandonner" confirmLabel="Confirmer l’abandon" onConfirm={() => dispatch({ type: 'takeover-abandon' })} />
        </div>
      )}
      {game.takeover?.finished && game.takeover.verdict && !isTakeover && <TakeoverVerdictCard />}
      <div className="row between" style={{ marginBottom: 12 }}>
        <div>
          <h1 style={{ marginBottom: 0 }}>Cockpit fiabilité</h1>
          <div className="small muted">
            {def.name} · {def.site} · Mois {plant.month}
          </div>
        </div>
        <div className="row">
          {!IN_FRAME && (
            <button className="btn ghost no-print" onClick={() => window.print()}>
              Rapport PDF
            </button>
          )}
          <button className="btn primary" onClick={() => dispatch({ type: 'advance' })} disabled={!!plant.pendingDecision || (isTakeover && plant.month >= TAKEOVER_MONTHS)}>
            Simuler le mois {plant.month + 1} →
          </button>
        </div>
      </div>

      {!last && (
        <div className="card">
          <h3>Bienvenue, {game.player.name}.</h3>
          <MentorLine id="dirmaint" text="L’usine va mal et la Direction le sait. Avant de toucher à quoi que ce soit, regarde tourner l’usine un mois ou deux, puis commence par la mission « Premier jour : la GMAO ment »." />
          <MentorLine id="prod" text="Et surtout, ne m’arrêtez pas les lignes pour rien." />
          <div className="row">
            <button className="btn primary" onClick={() => dispatch({ type: 'advance' })}>
              Simuler le premier mois
            </button>
            {!isTakeover && (
              <button className="btn" onClick={() => nav.openMission('gmao-onboarding')}>
                Lancer la première mission
              </button>
            )}
          </div>
        </div>
      )}

      <div className="kpis">
        {(showAll ? KPI_DEFS : KPI_DEFS.slice(0, 8)).map((d) => {
          const v = last ? (last[d.key] as number) : NaN;
          const pv = prev ? (prev[d.key] as number) : NaN;
          const delta = v - pv;
          const good = d.better === 'up' ? delta >= 0 : delta <= 0;
          return (
            <div className="kpi" key={d.key} title={d.hint}>
              <div className="label">{d.label}</div>
              <div className="value num">{last ? d.fmt(v) : '—'}</div>
              {prev && isFinite(delta) && Math.abs(delta) > 1e-9 && (
                <div className={`delta ${good ? 'up-good' : 'up-bad'}`}>
                  {delta > 0 ? '▲' : '▼'} {d.fmt(Math.abs(delta))} vs M{prev.month}
                </div>
              )}
              {k.length > 1 && <Sparkline values={k.map((x) => x[d.key] as number)} />}
            </div>
          );
        })}
      </div>
      <button className="btn ghost small" style={{ marginTop: 8 }} onClick={() => setShowAll(!showAll)}>
        {showAll ? 'Moins d’indicateurs' : `Tous les indicateurs (${KPI_DEFS.length})`}
      </button>
      <div className="callout info small">
        Ne regardez jamais un KPI isolément : un coût maintenance qui baisse avec des pertes de production qui montent n’est pas une économie.
      </div>

      {last && <DebriefPanel />}

      {k.length > 0 && (
        <div className="grid-2 section">
          <div className="card">
            <h3>Disponibilité usine</h3>
            <LineChart labels={labels} series={[{ name: 'Disponibilité', values: k.map((x) => x.availability * 100) }]} yFormat={(v) => `${v.toFixed(0)} %`} refLine={{ value: 92, label: 'Cible 92 %' }} area />
          </div>
          <div className="card">
            <h3>Coût maintenance vs budget</h3>
            <LineChart
              labels={labels}
              series={[
                { name: 'Coût maintenance', values: k.map((x) => x.maintCost / 1e6) },
                { name: 'Budget', values: k.map((x) => x.budget / 1e6), dashed: true, color: 'var(--muted)' },
              ]}
              yFormat={(v) => `${v.toFixed(0)} M`}
            />
          </div>
          <div className="card">
            <h3>Pertes de marge (arrêts)</h3>
            <LineChart labels={labels} series={[{ name: 'Pertes', values: k.map((x) => x.productionLoss / 1e6), color: 'var(--s2)' }]} yFormat={(v) => `${v.toFixed(0)} M`} />
          </div>
          <div className="card">
            <h3>TRS = D × P × Q</h3>
            <LineChart
              labels={labels}
              series={[
                { name: 'TRS', values: k.map((x) => x.oee * 100) },
                { name: 'Disponibilité', values: k.map((x) => x.oeeA * 100) },
                { name: 'Performance', values: k.map((x) => x.oeeP * 100) },
                { name: 'Qualité', values: k.map((x) => x.oeeQ * 100) },
              ]}
              yFormat={(v) => `${v.toFixed(0)} %`}
            />
          </div>
        </div>
      )}

      <div className="grid-2 section">
        <div className="card">
          <h3>Climat & crédibilité</h3>
          {[
            ['Confiance de la Direction', plant.directionTrust],
            ['Indice sécurité', plant.safetyIndex],
            ['Moral des équipes', plant.teamMorale],
            ['Qualité des données GMAO', plant.dataQuality],
          ].map(([l, v]) => (
            <div key={l as string} style={{ marginBottom: 8 }}>
              <div className="row between small">
                <span>{l}</span>
                <span className="num">{(v as number).toFixed(0)}/100</span>
              </div>
              <Meter value={v as number} color={(v as number) < 35 ? 'var(--critical)' : (v as number) < 60 ? 'var(--warn)' : 'var(--good)'} />
            </div>
          ))}
          {!isTakeover && (
            <div className="small muted">
              Industrial Impact Score : <b>{industrialImpact(game)}</b>/100 (3 derniers mois vs 3 premiers)
            </div>
          )}
        </div>
        <div className="card">
          <h3>Alertes méthodes</h3>
          {warnings.length === 0 && (plant.unlocks.includes('WEIBULL-VIEW') || isTakeover ? <StatusPill level="good">Aucune incohérence de stratégie détectée</StatusPill> : <span className="small muted">Lois de vie inconnues : réalisez l’analyse Weibull pour que le système détecte les stratégies incohérentes.</span>)}
          {warnings.slice(0, 5).map((w) => (
            <div key={w.key + w.text} className="small" style={{ marginBottom: 6 }}>
              <StatusPill level="warn">Méthode</StatusPill> {w.text}
            </div>
          ))}
          {warnings.length > 0 && <div className="small muted">Ces alertes n’apparaissent qu’une fois les modes connus : corrigez-les dans l’écran Usine.</div>}
          <div className="divider" />
          {promo.next && (
            <div className="small">
              <b>Prochaine promotion :</b> {promo.next.title}
              {promo.eligible ? (
                <button className="btn small primary" style={{ marginLeft: 8 }} onClick={() => dispatch({ type: 'promote' })}>
                  Être promu
                </button>
              ) : (
                <ul>{promo.missing.map((m) => <li key={m}>{m}</li>)}</ul>
              )}
            </div>
          )}
          {!isTakeover &&
            rec.map((r) => (
              <button key={r.meta.id} className="option" style={{ width: '100%', marginTop: 6 }} onClick={() => nav.openMission(r.meta.id)}>
                <span>
                  <b>{r.meta.title}</b>
                  <div className="sub">{r.reason}</div>
                </span>
              </button>
            ))}
        </div>
      </div>

      <div className="card section">
        <h3>Journal de l’usine</h3>
        <div className="stack small">
          {[...plant.journal].reverse().slice(0, 12).map((j, i) => (
            <div key={i}>
              <span className={`pill ${j.kind === 'crise' || j.kind === 'alerte' ? 'crit' : j.kind === 'succes' ? 'good' : j.kind === 'decision' ? 'accent' : ''}`}>M{j.month}</span> {j.text}
            </div>
          ))}
        </div>
      </div>

      {plant.pendingDecision && <PressureModal />}
    </div>
  );
}

function DebriefPanel() {
  const { game } = useGameState();
  const { def, plant } = activeSite(game);
  const [open, setOpen] = useState(true);
  const d = monthDebrief(def, plant);
  if (!d) return null;
  return (
    <div className="card section">
      <div className="card-title">
        <h3>Débriefing du mois {d.month} — d’où viennent les résultats</h3>
        <button className="btn small ghost" onClick={() => setOpen(!open)}>
          {open ? 'Réduire' : 'Détailler'}
        </button>
      </div>
      <ul className="small" style={{ marginTop: 0 }}>
        {d.drivers.map((x, i) => (
          <li key={i}>{x}</li>
        ))}
      </ul>
      {open && d.topContributors.length > 0 && (
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Équipement</th>
                <th className="num">Pannes</th>
                <th className="num">Coût + pertes</th>
                <th className="num">Part</th>
              </tr>
            </thead>
            <tbody>
              {d.topContributors.map((c) => (
                <tr key={c.tag}>
                  <td>
                    {c.tag} — {c.name}
                  </td>
                  <td className="num">{c.count}</td>
                  <td className="num">{mf(c.loss)}</td>
                  <td className="num">{Math.round(c.share * 100)} %</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function PressureModal() {
  const { game, dispatch } = useGameState();
  const { plant } = activeSite(game);
  const ev = plant.pendingDecision!;
  return (
    <div className="modal-back">
      <div className="modal fade-in" role="dialog" aria-modal="true">
        <span className={`pill ${ev.urgency === 'critique' ? 'crit' : 'warn'}`}>Décision sous pression · urgence {ev.urgency}</span>
        <h2 style={{ marginTop: 8 }}>{ev.title}</h2>
        <p className="text-2">{ev.context}</p>
        <div className="options">
          {ev.options.map((o) => (
            <button key={o.id} className="option" onClick={() => dispatch({ type: 'decide', option: o })}>
              <span>
                <b>{o.label}</b>
                {o.detail && <div className="sub">{o.detail}</div>}
                {o.mentorTake?.map((t) => (
                  <div key={t.mentor} className="sub">
                    <i>
                      {MENTORS[t.mentor].name} : « {t.text} »
                    </i>
                  </div>
                ))}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function TakeoverVerdictCard() {
  const { game } = useGameState();
  const v = game.takeover!.verdict!;
  return (
    <div className={`card`} style={{ borderColor: v.passed ? 'var(--good)' : 'var(--critical)' }}>
      <h2>Verdict du Comité Exécutif : {v.passed ? 'GLOBAL RELIABILITY ENGINEER' : 'objectifs non atteints'} ({v.score}/100)</h2>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Critère</th>
              <th>Cible</th>
              <th>Réalisé</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {v.criteria.map((c) => (
              <tr key={c.label}>
                <td>{c.label}</td>
                <td>{c.target}</td>
                <td className="num">{c.actual}</td>
                <td>{c.ok ? <StatusPill level="good">atteint</StatusPill> : <StatusPill level="crit">non atteint</StatusPill>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="small muted">{v.passed ? 'Réclamez la certification Master dans votre profil.' : 'Relancez l’épreuve depuis l’écran Missions quand vous serez prêt.'}</p>
    </div>
  );
}
