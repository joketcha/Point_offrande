import { useMemo, useState } from 'react';
import { pfAnnualCost } from '../missions/PfMission';
import { Rng } from '../engine/rng';
import {
  REGIME_LABEL,
  exponential,
  gammaDist,
  kOutOfN,
  lognormal,
  markovAvailability,
  optimalAgeReplacement,
  parallelR,
  regimeOf,
  seriesR,
  weibull,
  weibullMLE,
  weibullMRR,
  type Distribution,
  type LifeObs,
} from '../engine/stats';
import { LineChart } from '../ui/Charts';
import { WeibullPlot } from '../ui/WeibullPlot';

const fmt = (x: number, d = 0) => (isFinite(x) ? x.toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: d }) : '—');

type Tab = 'lois' | 'weibull' | 'age' | 'pf' | 'systemes';

export function Labs() {
  const [tab, setTab] = useState<Tab>('lois');
  return (
    <div className="fade-in">
      <h1>Laboratoires</h1>
      <p className="text-2 small">Simulateurs libres pour expérimenter. Les missions vous évalueront ; ici, vous avez le droit de tout essayer.</p>
      <div className="tabs">
        {(
          [
            ['lois', 'Lois de fiabilité'],
            ['weibull', 'Weibull (vos données)'],
            ['age', 'Remplacement à âge'],
            ['pf', 'Intervalle P-F'],
            ['systemes', 'Systèmes & Markov'],
          ] as [Tab, string][]
        ).map(([id, l]) => (
          <button key={id} className={tab === id ? 'active' : ''} onClick={() => setTab(id)}>
            {l}
          </button>
        ))}
      </div>
      {tab === 'lois' && <LawsLab />}
      {tab === 'weibull' && <WeibullLab />}
      {tab === 'age' && <AgeLab />}
      {tab === 'pf' && <PfLab />}
      {tab === 'systemes' && <SystemsLab />}
    </div>
  );
}

function Slider({ label, value, min, max, step, onChange, suffix = '' }: { label: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; suffix?: string }) {
  return (
    <label className="field">
      <span className="row between">
        <span>{label}</span>
        <b className="num">
          {value}
          {suffix}
        </b>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} />
    </label>
  );
}

function LawsLab() {
  const [law, setLaw] = useState<'weibull' | 'expo' | 'lognormal' | 'gamma'>('weibull');
  const [beta, setBeta] = useState(2);
  const [eta, setEta] = useState(1000);
  const [mtbf, setMtbf] = useState(1000);
  const [sigma, setSigma] = useState(0.6);
  const [k, setK] = useState(3);
  const d: Distribution = useMemo(() => {
    if (law === 'expo') return exponential(1 / mtbf);
    if (law === 'lognormal') return lognormal(Math.log(eta), sigma);
    if (law === 'gamma') return gammaDist(k, eta / k);
    return weibull(beta, eta);
  }, [law, beta, eta, mtbf, sigma, k]);
  const tMax = Math.max(eta, mtbf) * 2.5;
  const ts = Array.from({ length: 41 }, (_, i) => (i * tMax) / 40);
  const labels = ts.map((t) => fmt(t));
  return (
    <div className="grid-2">
      <div className="card">
        <label className="field">
          Loi
          <select value={law} onChange={(e) => setLaw(e.target.value as typeof law)}>
            <option value="weibull">Weibull</option>
            <option value="expo">Exponentielle</option>
            <option value="lognormal">Lognormale</option>
            <option value="gamma">Gamma</option>
          </select>
        </label>
        {law === 'weibull' && (
          <>
            <Slider label="β (forme)" value={beta} min={0.3} max={5} step={0.1} onChange={setBeta} />
            <Slider label="η (échelle)" value={eta} min={100} max={5000} step={50} onChange={setEta} suffix=" h" />
            <div className="callout small">{REGIME_LABEL[regimeOf(beta)]}</div>
          </>
        )}
        {law === 'expo' && <Slider label="MTBF = 1/λ" value={mtbf} min={100} max={5000} step={50} onChange={setMtbf} suffix=" h" />}
        {law === 'lognormal' && (
          <>
            <Slider label="Médiane e^μ" value={eta} min={100} max={5000} step={50} onChange={setEta} suffix=" h" />
            <Slider label="σ" value={sigma} min={0.1} max={2} step={0.05} onChange={setSigma} />
          </>
        )}
        {law === 'gamma' && (
          <>
            <Slider label="Forme k" value={k} min={0.5} max={10} step={0.5} onChange={setK} />
            <Slider label="Moyenne k·θ" value={eta} min={100} max={5000} step={50} onChange={setEta} suffix=" h" />
          </>
        )}
        <div className="small">
          Moyenne (MTTF) : <b>{fmt(d.mean())} h</b> · R({fmt(tMax / 5)} h) = <b>{fmt(d.R(tMax / 5) * 100, 1)} %</b>
        </div>
        <p className="small muted">Observez λ(t) : croissant = usure (préventif possible), constant = hasard (préventif inutile), décroissant = jeunesse (le préventif crée des pannes).</p>
      </div>
      <div className="card">
        <h3>R(t) et F(t)</h3>
        <LineChart labels={labels} series={[{ name: 'R(t)', values: ts.map((t) => d.R(t)) }, { name: 'F(t)', values: ts.map((t) => d.F(t)) }]} yFormat={(v) => v.toFixed(2)} yMin={0} yMax={1} height={170} />
        <h3>Taux de défaillance λ(t)</h3>
        <LineChart labels={labels} series={[{ name: 'λ(t)', values: ts.map((t) => (t === 0 ? null : d.h(t) * 1000)) }]} yFormat={(v) => v.toFixed(2)} height={150} />
        <p className="small muted">λ en défaillances pour 1 000 h.</p>
      </div>
    </div>
  );
}

function WeibullLab() {
  const [text, setText] = useState('420;F\n610;F\n750;S\n980;F\n1100;F\n1300;S\n1450;F\n1720;F\n2100;F\n2400;S');
  const [trueB, setTrueB] = useState(1.8);
  const obs: LifeObs[] = useMemo(
    () =>
      text
        .split(/\n+/)
        .map((l) => l.trim().split(/[;,\t ]+/))
        .filter((p) => p[0] && isFinite(parseFloat(p[0])) && parseFloat(p[0]) > 0)
        .map((p) => ({ t: parseFloat(p[0]), failed: !(p[1] ?? 'F').toUpperCase().startsWith('S') })),
    [text],
  );
  const mrr = weibullMRR(obs);
  const mle = weibullMLE(obs);
  const generate = () => {
    const r = new Rng(Math.floor(Math.random() * 1e9));
    const rows = Array.from({ length: 15 }, () => {
      const t = Math.round(r.weibull(trueB, 1500));
      return r.chance(0.25) ? `${Math.round(t * r.uniform(0.3, 0.9))};S` : `${t};F`;
    });
    setText(rows.join('\n'));
  };
  return (
    <div className="grid-2">
      <div className="card">
        <h3>Données (temps ; F = défaillance, S = suspension)</h3>
        <textarea value={text} onChange={(e) => setText(e.target.value)} style={{ minHeight: 200, fontFamily: 'monospace' }} />
        <p className="small muted">Collez une colonne d’Excel (temps en heures de marche). Architecture prévue pour l’import Excel/CSV et la connexion GMAO.</p>
        <div className="row">
          <Slider label="β « vrai » du générateur" value={trueB} min={0.5} max={4} step={0.1} onChange={setTrueB} />
          <button className="btn small" onClick={generate}>
            Générer 15 vies (η = 1 500 h)
          </button>
        </div>
      </div>
      <div className="card">
        {mrr ? (
          <>
            <WeibullPlot fit={mrr} />
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Méthode</th>
                    <th className="num" style={{ textTransform: 'none' }}>β</th>
                    <th className="num" style={{ textTransform: 'none' }}>η (h)</th>
                    <th className="num">MTTF (h)</th>
                  </tr>
                </thead>
                <tbody>
                  {[mrr, mle].filter(Boolean).map((f) => (
                    <tr key={f!.method}>
                      <td>{f!.method === 'MRR' ? `Régression de rang (R² ${fmt(f!.r2, 3)})` : 'Maximum de vraisemblance'}</td>
                      <td className="num">{fmt(f!.beta, 2)}</td>
                      <td className="num">{fmt(f!.eta)}</td>
                      <td className="num">{fmt(weibull(f!.beta, f!.eta).mean())}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="small">
              {mrr.failures} défaillances, {mrr.suspensions} suspensions · {REGIME_LABEL[regimeOf(mrr.beta)]}
            </p>
            <p className="small muted">Avec moins de 10 défaillances, l’incertitude sur β est forte : comparez MRR et MLE, et régénérez plusieurs échantillons de la même loi pour le constater.</p>
          </>
        ) : (
          <p>Au moins 2 défaillances nécessaires.</p>
        )}
      </div>
    </div>
  );
}

function AgeLab() {
  const [beta, setBeta] = useState(2.5);
  const [eta, setEta] = useState(4000);
  const [cp, setCp] = useState(2);
  const [cf, setCf] = useState(12);
  const opt = useMemo(() => optimalAgeReplacement(weibull(beta, eta), cp, cf, eta * 2.5, 100), [beta, eta, cp, cf]);
  return (
    <div className="grid-2">
      <div className="card">
        <Slider label="β" value={beta} min={0.5} max={5} step={0.1} onChange={setBeta} />
        <Slider label="η" value={eta} min={500} max={10000} step={100} onChange={setEta} suffix=" h" />
        <Slider label="Coût préventif Cp" value={cp} min={0.5} max={20} step={0.5} onChange={setCp} suffix=" M" />
        <Slider label="Coût de panne Cf" value={cf} min={1} max={60} step={1} onChange={setCf} suffix=" M" />
        <div className="callout small">
          {beta <= 1.05 ? (
            <>β ≤ 1 : aucun âge de remplacement n’est rentable. Le coût minimal est le correctif (ou une tâche conditionnelle).</>
          ) : (
            <>
              T* ≈ <b>{fmt(opt.T)} h</b> — économie de <b>{fmt(opt.saving * 100)} %</b> par rapport au correctif pur ({fmt(opt.costRate * 1000, 2)} M / 1 000 h contre {fmt(opt.runToFailureRate * 1000, 2)}).
            </>
          )}
        </div>
      </div>
      <div className="card">
        <h3>Coût par heure selon l’âge de remplacement</h3>
        <LineChart labels={opt.curve.filter((_, i) => i % 2 === 0).map((c) => fmt(c.T))} series={[{ name: 'C(T) M/1000 h', values: opt.curve.filter((_, i) => i % 2 === 0).map((c) => c.c * 1000) }]} refLine={{ value: opt.runToFailureRate * 1000, label: 'Correctif' }} yFormat={(v) => v.toFixed(1)} />
      </div>
    </div>
  );
}

function PfLab() {
  const [pf, setPf] = useState(600);
  const [I, setI] = useState(300);
  const [eff, setEff] = useState(0.9);
  const [cf, setCf] = useState(60);
  const e = { runYear: 6240, lambda: 1.2, ci: 0.36e6, cp: 4.8e6, cf: cf * 1e6, eff };
  const grid = Array.from({ length: 40 }, (_, i) => 25 + i * 30).map((x) => ({ x, ...pfAnnualCost(x, pf, e) }));
  const cur = pfAnnualCost(I, pf, e);
  return (
    <div className="grid-2">
      <div className="card">
        <Slider label="Intervalle P-F" value={pf} min={100} max={2000} step={50} onChange={setPf} suffix=" h" />
        <Slider label="Intervalle d’inspection" value={I} min={25} max={1200} step={25} onChange={setI} suffix=" h" />
        <Slider label="Efficacité d’une inspection" value={eff} min={0.3} max={1} step={0.05} onChange={setEff} />
        <Slider label="Coût d’une défaillance fonctionnelle" value={cf} min={5} max={120} step={5} onChange={setCf} suffix=" M" />
        <div className="small">
          P(détection) : <b>{fmt(cur.p * 100)} %</b> · coût annuel <b>{fmt(cur.total / 1e6, 1)} M</b> (inspections {fmt(cur.insp / 1e6, 1)} M, défaillances {fmt(cur.fail / 1e6, 1)} M)
        </div>
      </div>
      <div className="card">
        <LineChart labels={grid.map((g) => `${g.x}`)} series={[{ name: 'Total', values: grid.map((g) => g.total / 1e6) }, { name: 'Inspections', values: grid.map((g) => g.insp / 1e6) }, { name: 'Défaillances', values: grid.map((g) => g.fail / 1e6) }]} yFormat={(v) => `${v.toFixed(0)} M`} />
        <p className="small muted">Abscisse : intervalle d’inspection (h de marche).</p>
      </div>
    </div>
  );
}

function SystemsLab() {
  const [r, setR] = useState(0.9);
  const [n, setN] = useState(3);
  const [k, setK] = useState(2);
  const [mtbf, setMtbf] = useState(1000);
  const [mttr, setMttr] = useState(10);
  return (
    <div className="grid-2">
      <div className="card">
        <h3>Blocs de fiabilité</h3>
        <Slider label="Fiabilité d’un composant r" value={r} min={0.5} max={0.999} step={0.001} onChange={setR} />
        <Slider label="Nombre de composants n" value={n} min={1} max={6} step={1} onChange={(v) => { setN(v); setK(Math.min(k, v)); }} />
        <Slider label="k requis (k/n)" value={k} min={1} max={n} step={1} onChange={setK} />
        <div className="table-wrap">
          <table>
            <tbody>
              <tr>
                <td>Série (n composants)</td>
                <td className="num">{fmt(seriesR(Array(n).fill(r)), 4)}</td>
              </tr>
              <tr>
                <td>Parallèle (1 sur n)</td>
                <td className="num">{fmt(parallelR(Array(n).fill(r)), 6)}</td>
              </tr>
              <tr>
                <td>
                  {k} sur {n}
                </td>
                <td className="num">{fmt(kOutOfN(k, n, r), 5)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      <div className="card">
        <h3>Markov : composant réparable</h3>
        <Slider label="MTBF (1/λ)" value={mtbf} min={50} max={5000} step={50} onChange={setMtbf} suffix=" h" />
        <Slider label="MTTR (1/μ)" value={mttr} min={1} max={200} step={1} onChange={setMttr} suffix=" h" />
        <p className="small">
          Disponibilité asymptotique A = μ / (λ + μ) = <b>{fmt(markovAvailability(1 / mtbf, 1 / mttr) * 100, 3)} %</b>
        </p>
        <p className="small muted">Deux états (marche / panne), transitions λ et μ. Pour des architectures complexes (secours, réparateur unique, causes communes), la simulation Monte-Carlo prend le relais : voir la mission « Architecture ».</p>
      </div>
    </div>
  );
}
