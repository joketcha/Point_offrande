import { useState } from 'react';
import { Briefing, Choice, Debrief, Decision, NumberInput, Stepper, near, useSteps } from '../ui/Pedagogy';
import { type MissionProps, fmt, num, useFinish } from './common';

const HOURS = 7000;
const PRICE = 95; // FCFA/kWh
const LOAD = 0.8;
const LOSS_H = 0.78; // M FCFA/h (secours partiel)
const ANNUITY = (1 - Math.pow(1.1, -10)) / 0.1;

const OFFERS = [
  { id: 'A', name: 'Offre A — compresseur économique importé', capex: 45, kw: 110, saving: 0, maint: 6, mtbf: 3000, mttr: 18 },
  { id: 'B', name: 'Offre B — européen standard', capex: 70, kw: 110, saving: 0.05, maint: 4, mtbf: 6000, mttr: 12 },
  { id: 'C', name: 'Offre C — haut de gamme à vitesse variable', capex: 95, kw: 110, saving: 0.22, maint: 4.5, mtbf: 7000, mttr: 12 },
];

const energy = (o: (typeof OFFERS)[number]) => (o.kw * LOAD * HOURS * PRICE * (1 - o.saving)) / 1e6;
const unavail = (o: (typeof OFFERS)[number]) => (HOURS / o.mtbf) * o.mttr * LOSS_H;
const opex = (o: (typeof OFFERS)[number]) => energy(o) + o.maint + unavail(o);
const tco = (o: (typeof OFFERS)[number]) => o.capex + opex(o) * ANNUITY;

export function TcoMission({ meta, onExit }: MissionProps) {
  const flow = useSteps(3);
  const finish = useFinish(meta, onExit);
  const [eC, setEC] = useState('');
  const [tC, setTC] = useState('');
  const [pick, setPick] = useState<string[]>([]);
  const C = OFFERS[2];
  const best = OFFERS.reduce((a, b) => (tco(b) < tco(a) ? b : a));

  if (flow.index === -1) return <Briefing meta={meta} onStart={flow.start} />;
  if (flow.finished) return <Debrief meta={meta} results={flow.results} onValidate={() => finish(flow.results, { choice: pick[0] })} />;

  return (
    <div>
      <Stepper total={3} index={flow.index} />
      <div className="card">
        <h3>Offres</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Offre</th>
                <th className="num">Prix (M)</th>
                <th className="num">Puissance</th>
                <th className="num">Économie énergie</th>
                <th className="num">Maint. (M/an)</th>
                <th className="num">MTBF (h)</th>
                <th className="num">MTTR (h)</th>
              </tr>
            </thead>
            <tbody>
              {OFFERS.map((o) => (
                <tr key={o.id}>
                  <td>{o.name}</td>
                  <td className="num">{o.capex}</td>
                  <td className="num">{o.kw} kW</td>
                  <td className="num">{o.saving * 100} %</td>
                  <td className="num">{o.maint}</td>
                  <td className="num">{fmt(o.mtbf)}</td>
                  <td className="num">{o.mttr}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="small muted">
          {HOURS} h/an, charge moyenne {LOAD * 100} %, électricité {PRICE} FCFA/kWh, indisponibilité {LOSS_H} M FCFA/h (secours partiel), horizon 10 ans, actualisation 10 % (facteur d’annuité {fmt(ANNUITY, 3)}).
        </p>
      </div>
      {flow.index === 0 && (
        <Decision
          id="Coût énergie"
          title="1. Coût énergétique annuel de l’offre C"
          skills={['ECONOMICS']}
          check={() =>
            near(num(eC), energy(C), 0.03)
              ? { ok: true, why: `Énergie C = 110 × 0,8 × 7 000 × 95 × (1 − 0,22) ≈ ${fmt(energy(C), 1)} M/an (A : ${fmt(energy(OFFERS[0]), 1)} M/an). En 10 ans, l’énergie pèse ~5 fois le prix d’achat.` }
              : {
                  ok: false,
                  errorTag: 'tco-capex-only',
                  consequence: 'Sans le coût énergétique, vous comparez des icebergs par leur partie émergée.',
                  question: 'Combien de kWh le compresseur consomme-t-il par an ?',
                  hints: ['kWh/an = puissance × charge × heures.', 'Coût = kWh × prix × (1 − économie VSD).'],
                  method: 'Énergie annuelle = P × taux de charge × heures × prix unitaire.',
                }
          }
          onDone={flow.done}
        >
          <NumberInput label="Énergie C" suffix="M FCFA/an" value={eC} onChange={setEC} />
        </Decision>
      )}
      {flow.index === 1 && (
        <Decision
          id="TCO"
          title="2. Coût global de possession (10 ans, actualisé) de C"
          skills={['ECONOMICS', 'RELIABILITY']}
          prompt={
            <p className="small">
              Coûts annuels de C : énergie {fmt(energy(C), 1)} M + maintenance {C.maint} M + indisponibilité (heures d’arrêt × {LOSS_H} M) = ? Puis TCO = prix + coûts annuels × facteur d’annuité. Pour comparaison :
              TCO A = {fmt(tco(OFFERS[0]))} M, TCO B = {fmt(tco(OFFERS[1]))} M.
            </p>
          }
          check={() =>
            near(num(tC), tco(C), 0.04)
              ? { ok: true, why: `TCO C ≈ ${fmt(tco(C))} M. L’offre la moins chère à l’achat (A) est la plus chère sur 10 ans (${fmt(tco(OFFERS[0]))} M), surtout à cause de son indisponibilité et de son énergie.` }
              : {
                  ok: false,
                  errorTag: 'tco-capex-only',
                  consequence: 'TCO erroné : la recommandation sera contestée par les Achats.',
                  question: 'Avez-vous intégré l’indisponibilité : nombre de pannes par an × durée × coût horaire ?',
                  hints: [`Pannes/an = 7 000 / 7 000 = 1 ; arrêt = 12 h ; coût = 12 × ${LOSS_H} M.`, `Coûts annuels ≈ ${fmt(opex(C), 1)} M ; × ${fmt(ANNUITY, 3)} + 95.`],
                  method: 'LCC = CAPEX + Σ (énergie + maintenance + indisponibilité) actualisés − valeur résiduelle.',
                }
          }
          onDone={flow.done}
        >
          <NumberInput label="TCO offre C" suffix="M FCFA" value={tC} onChange={setTC} />
        </Decision>
      )}
      {flow.index === 2 && (
        <Decision
          id="Recommandation"
          title="3. Recommandation aux Achats"
          skills={['ECONOMICS', 'COMMUNICATION']}
          mentor={{ id: 'daf', text: 'L’offre A est 40 % moins chère.' }}
          check={() =>
            pick[0] === best.id
              ? { ok: true, why: `Offre ${best.id} : TCO le plus bas. Argument pour les Achats : l’écart de prix est remboursé en ${fmt((best.capex - OFFERS[0].capex) / (opex(OFFERS[0]) - opex(best)) * 12, 0)} mois.` }
              : {
                  ok: false,
                  errorTag: 'tco-capex-only',
                  consequence: `Sur 10 ans, votre choix coûte ${fmt(tco(OFFERS.find((o) => o.id === pick[0]) ?? OFFERS[0]) - tco(best))} M FCFA de plus.`,
                  question: 'Quelle offre minimise le coût total sur la durée de vie ?',
                  hints: ['Comparez les trois TCO.'],
                  method: 'Choisir sur le LCC, puis vérifier les risques (SAV local, pièces, compétences).',
                }
          }
          onDone={flow.done}
        >
          <Choice value={pick} onChange={setPick} options={OFFERS.map((o) => ({ id: o.id, label: o.name }))} />
        </Decision>
      )}
    </div>
  );
}
