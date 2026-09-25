import { useMemo, useState } from 'react';
import { Rng } from '../engine/rng';
import { detectionProbability } from '../engine/simulation';
import { LineChart } from '../ui/Charts';
import { Briefing, Debrief, Decision, NumberInput, Stepper, near, useSteps } from '../ui/Pedagogy';
import { type MissionProps, fmt, fmtM, num, useFinish } from './common';

export const PF = 600;
const K = Math.log((7.1 - 1.8) / 1.2) / PF;
export const vib = (t: number) => 1.8 + 1.2 * Math.exp(K * (t - 4600));

export const PF_ECON = { runYear: 6240, lambda: 1.2, ci: 0.36e6, cp: 4.8e6, cf: 60e6, eff: 0.9 };

export function pfAnnualCost(I: number, pf = PF, e = PF_ECON) {
  const p = detectionProbability(pf, I, e.eff);
  const insp = (e.runYear / I) * e.ci;
  const fail = e.lambda * (p * e.cp + (1 - p) * e.cf);
  return { total: insp + fail, insp, fail, p };
}

export function PfMission({ meta, onExit }: MissionProps) {
  const flow = useSteps(3);
  const finish = useFinish(meta, onExit);
  const [pT, setPT] = useState('');
  const [fT, setFT] = useState('');
  const [I, setI] = useState(400);
  const [net, setNet] = useState('');

  const curve = useMemo(() => {
    const r = new Rng(7);
    return Array.from({ length: 49 }, (_, i) => {
      const t = 3000 + i * 50;
      return { t, v: Math.max(1.5, vib(t) + r.normal(0, 0.08)) };
    });
  }, []);
  const grid = useMemo(() => Array.from({ length: 46 }, (_, i) => 50 + i * 25).map((x) => ({ I: x, ...pfAnnualCost(x) })), []);
  const best = grid.reduce((a, b) => (b.total < a.total ? b : a));
  const cur = pfAnnualCost(I);

  if (flow.index === -1) return <Briefing meta={meta} onStart={flow.start} />;
  if (flow.finished) return <Debrief meta={meta} results={flow.results} onValidate={() => finish(flow.results, { policies: { 'SER-L2:molettes': { strategy: 'CBM', inspInterval: I } } })} />;

  return (
    <div>
      <Stepper total={3} index={flow.index} />
      {flow.index === 0 && (
        <Decision
          id="Points P et F"
          title="1. Identifier P, F et l’intervalle P-F"
          skills={['PREDICTIVE', 'RCM']}
          prompt={
            <>
              <p>
                Vibration de la tête de sertissage (mm/s RMS) en fonction des heures de marche depuis le dernier jeu de molettes. La dégradation devient <b>détectable</b> quand elle dépasse nettement le bruit de fond, à <b>3,0 mm/s</b>. La <b>défaillance fonctionnelle</b> (sertis non conformes) survient à <b>7,1 mm/s</b>.
              </p>
              <LineChart
                labels={curve.map((c) => `${c.t}`)}
                series={[{ name: 'Vibration tête (mm/s)', values: curve.map((c) => c.v) }]}
                yFormat={(v) => v.toFixed(1)}
                refLine={{ value: 3.0, label: 'P détectable 3,0' }}
                yMin={0}
                height={220}
              />
              <p className="small muted">Survolez la courbe pour lire les valeurs. Seuil F : 7,1 mm/s.</p>
            </>
          }
          check={() => {
            const p = num(pT),
              f = num(fT);
            if (near(p, 4600, 0.02) && near(f, 5200, 0.02)) return { ok: true, why: `P ≈ 4 600 h, F ≈ 5 200 h : intervalle P-F ≈ ${PF} h de marche (≈ 5 semaines). C’est la fenêtre dont vous disposez pour détecter ET agir.` };
            return {
              ok: false,
              consequence: 'Un P-F mal estimé conduit à un intervalle d’inspection trop long (pannes) ou trop court (coût).',
              question: 'À partir de quand la dégradation se distingue-t-elle du bruit ? Quand la fonction est-elle perdue ?',
              hints: ['Lisez l’abscisse où la courbe franchit 3,0 mm/s.', 'Puis celle où elle atteint 7,1 mm/s.'],
              method: 'Point P : défaillance potentielle détectable. Point F : défaillance fonctionnelle. Intervalle P-F = F − P.',
            };
          }}
          onDone={flow.done}
        >
          <div className="grid-2">
            <NumberInput label="Point P (heures de marche)" suffix="h" value={pT} onChange={setPT} />
            <NumberInput label="Point F (heures de marche)" suffix="h" value={fT} onChange={setFT} />
          </div>
        </Decision>
      )}
      {flow.index === 1 && (
        <Decision
          id="Intervalle d’inspection"
          title="2. Choisir l’intervalle d’inspection"
          skills={['PREDICTIVE', 'ECONOMICS']}
          prompt={
            <p>
              Inspection = 10 min de ligne arrêtée + contrôleur ({fmtM(PF_ECON.ci, 2)}). Remplacement planifié : {fmtM(PF_ECON.cp, 1)}. Défaillance fonctionnelle non détectée (sertis fuyards, rappel possible) : {fmtM(PF_ECON.cf, 0)}. Environ {PF_ECON.lambda} dégradation/an. Efficacité d’une inspection : {PF_ECON.eff * 100} %.
            </p>
          }
          mentor={{ id: 'prod', text: 'Chaque inspection, c’est 10 minutes de ligne arrêtée.' }}
          check={() => {
            if (I > PF)
              return {
                ok: false,
                errorTag: 'pf-too-long',
                consequence: `Intervalle ${I} h > P-F : P(détection) = ${fmt(cur.p * 100)} %. Des canettes fuyardes partent chez le client.`,
                question: 'Combien d’inspections tombent en moyenne dans une fenêtre P-F de 600 h ?',
                hints: ['Si I > P-F, certaines dégradations naissent et aboutissent entre deux inspections.'],
                method: 'Contrainte : I < P-F (idéalement P-F/2 à P-F/3, selon l’efficacité de la technique).',
              };
            if (cur.total > best.total * 1.12)
              return {
                ok: false,
                errorTag: I < best.I ? 'pf-too-short' : 'pf-too-long',
                consequence: `Coût annuel ${fmtM(cur.total, 1)} contre ${fmtM(best.total, 1)} au meilleur compromis. ${I < best.I ? 'Vous payez des inspections inutiles.' : 'Trop de dégradations échappent aux inspections.'}`,
                question: 'Où se situe le minimum de la courbe de coût total ?',
                hints: ['Faites varier le curseur et observez les deux composantes (inspection vs défaillances).'],
                method: 'Coût total = coût des inspections (décroît avec I) + coût des défaillances non détectées (croît avec I). Chercher le minimum sous la contrainte I < P-F.',
              };
            return { ok: true, why: `I = ${I} h : P(détection) ${fmt(cur.p * 100)} %, coût ${fmtM(cur.total, 1)}/an (optimum ≈ ${best.I} h). Le préventif systématique à 3 500 h coûtait plus cher et n’empêchait pas les pannes (β ≈ 2,9 mais η variable selon les formats).` };
          }}
          onDone={flow.done}
        >
          <label className="field">
            <span className="row between">
              <span>Intervalle d’inspection</span>
              <b className="num">{I} h</b>
            </span>
            <input type="range" min={50} max={1200} step={25} value={I} onChange={(e) => setI(+e.target.value)} />
          </label>
          <div className="kpis" style={{ marginTop: 8 }}>
            <div className="kpi">
              <div className="label">P(détection)</div>
              <div className="value num">{fmt(cur.p * 100)} %</div>
            </div>
            <div className="kpi">
              <div className="label">Coût inspections</div>
              <div className="value num">{fmt(cur.insp / 1e6, 1)} M</div>
            </div>
            <div className="kpi">
              <div className="label">Coût défaillances</div>
              <div className="value num">{fmt(cur.fail / 1e6, 1)} M</div>
            </div>
            <div className="kpi">
              <div className="label">Total / an</div>
              <div className="value num">{fmt(cur.total / 1e6, 1)} M</div>
            </div>
          </div>
          <LineChart
            labels={grid.map((g) => `${g.I}`)}
            series={[
              { name: 'Total', values: grid.map((g) => g.total / 1e6) },
              { name: 'Inspections', values: grid.map((g) => g.insp / 1e6) },
              { name: 'Défaillances', values: grid.map((g) => g.fail / 1e6) },
            ]}
            yFormat={(v) => `${v.toFixed(0)} M`}
            height={200}
          />
        </Decision>
      )}
      {flow.index === 2 && (
        <Decision
          id="P-F net"
          title="3. Intervalle P-F net"
          skills={['PREDICTIVE', 'SPARES']}
          prompt={<p>Sans jeu de molettes en stock, la commande express prend 9 jours calendaires, soit ≈ 156 h de marche. Quel est l’intervalle P-F <b>net</b> (temps réellement disponible pour détecter) ?</p>}
          check={() => {
            const v = num(net);
            if (near(v, PF - 156, 0.03)) return { ok: true, why: `P-F net = 600 − 156 = 444 h. Sans stock, l’intervalle d’inspection devrait passer à ≈ ${fmt((PF - 156) / 2)} h. Stock et surveillance sont liés : c’est un seul arbitrage.` };
            return {
              ok: false,
              consequence: 'Vous détectez à temps… mais la pièce arrive après la défaillance.',
              question: 'Détecter ne suffit pas : de combien de temps avez-vous besoin pour agir ?',
              hints: ['P-F net = P-F − délai de réaction (pièce, planification, arrêt).'],
              method: 'Intervalle P-F net = P-F − temps de réaction ; l’inspection doit être calée sur le P-F net.',
            };
          }}
          onDone={flow.done}
        >
          <NumberInput label="P-F net" suffix="h de marche" value={net} onChange={setNet} />
        </Decision>
      )}
    </div>
  );
}
