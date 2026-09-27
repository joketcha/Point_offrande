import { useMemo, useState } from 'react';
import { Rng } from '../engine/rng';
import { kOutOfN, parallelR, seriesR } from '../engine/stats';
import { Briefing, Choice, Debrief, Decision, NumberInput, Stepper, near, useSteps } from '../ui/Pedagogy';
import { type MissionProps, fmt, num, useFinish } from './common';

const COMP = { pompe: 0.9, moteur: 0.95, accouplement: 0.98 };
const RS = seriesR(Object.values(COMP));
const RP = parallelR([RS, RS]);
const R23 = kOutOfN(2, 3, 0.9);

const ARCHI = [
  { id: 'a', label: 'Aucune redondance (situation actuelle)', capex: 0, loss: 86, maint: 0 },
  { id: 'b', label: 'Pompe de secours P-101B (2 × 100 %)', capex: 28, loss: 14, maint: 2 },
  { id: 'c', label: '3 pompes × 50 % (2 sur 3)', capex: 45, loss: 10, maint: 3 },
  { id: 'd', label: 'Pas de redondance, fiabilisation RCM seule', capex: 5, loss: 34, maint: 0 },
];
const total5 = (a: (typeof ARCHI)[number]) => a.capex + 5 * (a.loss + a.maint);

/** Simulation Monte-Carlo d'une année de fonctionnement (λ, μ) pour 1 ou 2 pompes. */
function monteCarlo(redundant: boolean, years = 200) {
  const rng = new Rng(42);
  const lambda = 6 / 7200;
  const repair = 8;
  let down = 0;
  for (let y = 0; y < years; y++) {
    let t = 0;
    while (t < 7200) {
      const tf = -Math.log(1 - rng.next()) / lambda;
      t += tf;
      if (t > 7200) break;
      if (!redundant) down += repair;
      else {
        // la pompe de secours doit démarrer (98 %) et ne pas défaillir pendant la réparation
        const failStart = rng.chance(0.02);
        const failDuring = rng.chance(1 - Math.exp(-lambda * repair));
        down += 0.5 + (failStart || failDuring ? repair : 0);
      }
      t += repair;
    }
  }
  return 1 - down / (years * 7200);
}

export function SystemsMission({ meta, onExit }: MissionProps) {
  const flow = useSteps(4);
  const finish = useFinish(meta, onExit);
  const [rs, setRs] = useState('');
  const [rp, setRp] = useState('');
  const [r23, setR23] = useState('');
  const [arch, setArch] = useState<string[]>([]);
  const [mc, setMc] = useState<{ single: number; red: number } | null>(null);
  const best = useMemo(() => ARCHI.reduce((a, b) => (total5(b) < total5(a) ? b : a)), []);

  if (flow.index === -1) return <Briefing meta={meta} onStart={flow.start} />;
  if (flow.finished) return <Debrief meta={meta} results={flow.results} onValidate={() => finish(flow.results)} />;

  return (
    <div>
      <Stepper total={4} index={flow.index} />
      <div className="card small text-2">
        Fiabilités sur 1 mois : pompe {COMP.pompe}, moteur {COMP.moteur}, accouplement {COMP.accouplement}. Le groupe motopompe fonctionne si ses 3 composants fonctionnent.
      </div>
      {flow.index === 0 && (
        <Decision
          id="Série"
          title="1. Fiabilité du groupe motopompe (série)"
          skills={['RELIABILITY']}
          check={() =>
            near(num(rs), RS, 0.005)
              ? { ok: true, why: `R = 0,90 × 0,95 × 0,98 = ${fmt(RS, 3)} : plus faible que le plus faible des composants.` }
              : {
                  ok: false,
                  errorTag: 'series-parallel',
                  consequence: 'Surestimer la fiabilité d’un système série conduit à sous-dimensionner le stock et la surveillance.',
                  question: 'Si un seul composant suffit à arrêter le système, comment combiner leurs probabilités de survie ?',
                  hints: ['Série : R = produit des Ri.'],
                  method: 'Série : Rs = Π Ri. Parallèle : Rp = 1 − Π (1 − Ri).',
                }
          }
          onDone={flow.done}
        >
          <NumberInput label="R système série (0-1)" value={rs} onChange={setRs} />
        </Decision>
      )}
      {flow.index === 1 && (
        <Decision
          id="Parallèle"
          title="2. Deux groupes motopompes en parallèle (2 × 100 %)"
          skills={['RELIABILITY']}
          check={() =>
            near(num(rp), RP, 0.003)
              ? { ok: true, why: `R = 1 − (1 − ${fmt(RS, 3)})² = ${fmt(RP, 4)}. Attention : ce calcul suppose des défaillances indépendantes et une commutation parfaite (causes communes : même eau, même alimentation électrique…).` }
              : {
                  ok: false,
                  errorTag: 'series-parallel',
                  consequence: 'Mauvais calcul : l’intérêt de la redondance est mal évalué.',
                  question: 'Le système est perdu seulement si… ?',
                  hints: ['Parallèle : le système défaille si TOUS les groupes défaillent.', 'R = 1 − (1 − Rs)².'],
                  method: 'Rp = 1 − Π (1 − Ri).',
                }
          }
          onDone={flow.done}
        >
          <NumberInput label="R deux groupes en parallèle" value={rp} onChange={setRp} />
        </Decision>
      )}
      {flow.index === 2 && (
        <Decision
          id="k/n"
          title="3. Groupe froid : 3 compresseurs à 50 %, il en faut 2"
          skills={['RELIABILITY']}
          prompt={<p>Chaque compresseur : R = 0,9 sur le mois. Le froid est assuré si au moins 2 compresseurs sur 3 fonctionnent.</p>}
          check={() =>
            near(num(r23), R23, 0.003)
              ? { ok: true, why: `R(2/3) = 3r²(1−r) + r³ = ${fmt(R23, 3)}.` }
              : {
                  ok: false,
                  errorTag: 'series-parallel',
                  consequence: 'Calcul k/n erroné.',
                  question: 'Quelles combinaisons d’états permettent de garder 2 compresseurs en marche ?',
                  hints: ['Cas « 3 en marche » : r³. Cas « exactement 2 » : 3 × r² × (1 − r).'],
                  method: 'R(k/n) = Σ(i = k..n) C(n,i) rⁱ (1 − r)ⁿ⁻ⁱ.',
                }
          }
          onDone={flow.done}
        >
          <NumberInput label="R système 2 sur 3" value={r23} onChange={setR23} />
        </Decision>
      )}
      {flow.index === 3 && (
        <Decision
          id="Choix d’architecture"
          title="4. Quelle architecture pour P-101 ? (horizon 5 ans)"
          skills={['ECONOMICS', 'PROJECT']}
          prompt={
            <>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Architecture</th>
                      <th className="num">CAPEX (M)</th>
                      <th className="num">Pertes /an (M)</th>
                      <th className="num">Maintenance /an (M)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ARCHI.map((a) => (
                      <tr key={a.id}>
                        <td>{a.label}</td>
                        <td className="num">{a.capex}</td>
                        <td className="num">{a.loss}</td>
                        <td className="num">{a.maint}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <button className="btn small" style={{ marginTop: 8 }} onClick={() => setMc({ single: monteCarlo(false), red: monteCarlo(true) })}>
                Lancer une simulation Monte-Carlo (200 années)
              </button>
              {mc && (
                <p className="small">
                  Disponibilité simulée : 1 pompe <b>{fmt(mc.single * 100, 2)} %</b> · 2 × 100 % <b>{fmt(mc.red * 100, 2)} %</b> (démarrage du secours à 98 %, commutation 30 min).
                </p>
              )}
            </>
          }
          check={() => {
            const c = ARCHI.find((a) => a.id === arch[0]);
            if (c?.id === best.id) return { ok: true, why: `Coût 5 ans : ${ARCHI.map((a) => `${a.id} ${total5(a)} M`).join(' · ')}. La pompe de secours se rembourse en quelques mois ; le 3 × 50 % apporte peu de plus pour 17 M de CAPEX et plus de composants à maintenir. Et la fiabilisation RCM reste utile dans tous les cas.` };
            return {
              ok: false,
              consequence: c ? `Coût sur 5 ans de votre choix : ${total5(c)} M FCFA, contre ${total5(best)} M pour la meilleure option.` : 'Aucun choix.',
              question: 'Quel est le coût total sur 5 ans (CAPEX + 5 × (pertes + maintenance)) de chaque architecture ?',
              hints: ['Calculez les 4 totaux.', 'La redondance n’a de sens que si elle se rembourse par les pertes évitées.'],
              method: 'Comparer les architectures sur le coût global (investissement + pertes + maintenance) à horizon donné.',
            };
          }}
          onDone={flow.done}
        >
          <Choice shuffleSeed={857} value={arch} onChange={setArch} options={ARCHI.map((a) => ({ id: a.id, label: a.label }))} />
        </Decision>
      )}
    </div>
  );
}
