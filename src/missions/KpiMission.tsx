import { useMemo, useState } from 'react';
import { Rng, hashSeed } from '../engine/rng';
import { useGameState } from '../store/game';
import { Briefing, Choice, Debrief, Decision, NumberInput, Stepper, near, useSteps } from '../ui/Pedagogy';
import { type MissionProps, fmt, num, useFinish } from './common';

const RUN = 560 * 6;
const SMALL = ['Bourrage sortie laveuse', 'Bourrage courbe 90°', 'Guide déréglé', 'Capteur accumulation', 'Chaîne sortie de guide', 'Micro-arrêt transfert'];

/** Génère un historique différent à chaque tentative : bourrages courts fréquents + 2-3 casses roulement avec attente pièce. */
function buildEvents(seed: number) {
  const rng = new Rng(seed);
  const nSmall = rng.int(9, 12);
  const nBig = rng.int(2, 3);
  const evs: { d: string; desc: string; rep: number; wait: number }[] = [];
  const day = () => `${String(rng.int(1, 28)).padStart(2, '0')}/${String(rng.int(1, 6)).padStart(2, '0')}`;
  for (let i = 0; i < nSmall; i++) evs.push({ d: day(), desc: rng.pick(SMALL), rep: +rng.uniform(0.4, 1.2).toFixed(1), wait: 0 });
  for (let i = 0; i < nBig; i++) evs.push({ d: day(), desc: 'Casse roulement motoréducteur', rep: +rng.uniform(3, 4.5).toFixed(1), wait: rng.int(18, 40) });
  return evs.sort((a, b) => (a.d.slice(3) + a.d.slice(0, 2)).localeCompare(b.d.slice(3) + b.d.slice(0, 2)));
}

export function KpiMission({ meta, onExit }: MissionProps) {
  const { game } = useGameState();
  const flow = useSteps(4);
  const finish = useFinish(meta, onExit);
  const EVENTS = useMemo(() => buildEvents(hashSeed(`kpi|${game.plant.seed}|${game.player.attempts[meta.id] ?? 0}`)), [game.plant.seed, game.player.attempts, meta.id]);
  const N = EVENTS.length;
  const SUM_REP = EVENTS.reduce((a, e) => a + e.rep, 0);
  const SUM_DOWN = EVENTS.reduce((a, e) => a + e.rep + e.wait, 0);
  const MTBF = RUN / N;
  const MTTR = SUM_REP / N;
  const MDT = SUM_DOWN / N;
  const AVAIL = RUN / (RUN + SUM_DOWN);
  const [mtbf, setMtbf] = useState('');
  const [mttr, setMttr] = useState('');
  const [mdt, setMdt] = useState('');
  const [av, setAv] = useState('');
  const [concl, setConcl] = useState<string[]>([]);

  if (flow.index === -1) return <Briefing meta={meta} onStart={flow.start} />;
  if (flow.finished) return <Debrief meta={meta} results={flow.results} onValidate={() => finish(flow.results)} />;

  return (
    <div>
      <Stepper total={4} index={flow.index} />
      <div className="card">
        <h3>Historique CONV-L1 — 6 mois (2 équipes, {fmt(RUN)} h de marche, 4 380 h calendaires)</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Événement</th>
                <th className="num">Réparation (h)</th>
                <th className="num">Attente pièce (h)</th>
              </tr>
            </thead>
            <tbody>
              {EVENTS.map((e, i) => (
                <tr key={i}>
                  <td className="num">{e.d}</td>
                  <td>{e.desc}</td>
                  <td className="num">{e.rep}</td>
                  <td className="num">{e.wait || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {flow.index === 0 && (
        <Decision
          id="MTBF convoyeur"
          title="1. MTBF du convoyeur"
          skills={['RELIABILITY']}
          check={() => {
            const v = num(mtbf);
            if (near(v, MTBF, 0.03)) return { ok: true, why: `${fmt(RUN)} h / ${N} arrêts = ${fmt(MTBF)} h : un arrêt tous les ~10 jours de production.` };
            const cal = near(v, 4380 / N, 0.03);
            return {
              ok: false,
              errorTag: cal ? 'calendar-vs-run' : 'mtbf-calc',
              consequence: cal ? 'Heures calendaires : le convoyeur paraît plus fiable qu’il ne l’est, alors qu’il ne tourne que 2 équipes.' : 'Valeur incorrecte : la fréquence réelle des arrêts est mal estimée.',
              question: 'Quel est le temps pendant lequel le convoyeur a réellement fonctionné ?',
              hints: ['2 équipes, 560 h de marche par mois.', `${fmt(RUN)} h de marche pour ${N} événements.`],
              method: 'MTBF = temps de bon fonctionnement / nombre de défaillances.',
            };
          }}
          onDone={flow.done}
        >
          <NumberInput label="MTBF" suffix="h" value={mtbf} onChange={setMtbf} />
        </Decision>
      )}
      {flow.index === 1 && (
        <Decision
          id="MTTR vs MDT"
          title="2. MTTR technique et durée moyenne d’arrêt (MDT)"
          skills={['MAINTENANCE', 'DATA']}
          prompt={<p>Le MTTR mesure la réparation. Le MDT (Mean Down Time) inclut la logistique. Calculez les deux.</p>}
          check={() => {
            const a = num(mttr);
            const b = num(mdt);
            if (near(a, MTTR, 0.05) && near(b, MDT, 0.05))
              return { ok: true, why: `MTTR ≈ ${fmt(MTTR, 2)} h mais MDT ≈ ${fmt(MDT, 2)} h : ${fmt(((SUM_DOWN - SUM_REP) / SUM_DOWN) * 100)} % du temps d’arrêt est de l’attente de pièces. Le « 45 minutes » de la Production est la médiane des bourrages.` };
            return {
              ok: false,
              errorTag: 'mtbf-calc',
              consequence: 'Sans distinguer réparation et attente, vous ciblerez la mauvaise action (former les techniciens au lieu de sécuriser les pièces).',
              question: 'Quelle part de l’arrêt dépend des techniciens, et quelle part dépend du magasin ?',
              hints: [`Σ réparations = ${fmt(SUM_REP, 2)} h.`, `Σ arrêts (réparation + attente) = ${fmt(SUM_DOWN, 2)} h.`],
              method: 'MTTR = Σ réparation / n ; MDT = Σ (réparation + attentes logistiques et administratives) / n.',
            };
          }}
          onDone={flow.done}
        >
          <div className="grid-2">
            <NumberInput label="MTTR technique" suffix="h" value={mttr} onChange={setMttr} />
            <NumberInput label="MDT (arrêt moyen)" suffix="h" value={mdt} onChange={setMdt} />
          </div>
        </Decision>
      )}
      {flow.index === 2 && (
        <Decision
          id="Disponibilité"
          title="3. Disponibilité opérationnelle du convoyeur"
          skills={['RELIABILITY']}
          check={() => {
            const v = num(av) / 100;
            if (near(v, AVAIL, 0.004)) return { ok: true, why: `A = ${fmt(RUN)} / (${fmt(RUN)} + ${fmt(SUM_DOWN, 1)}) = ${fmt(AVAIL * 100, 2)} %. Un convoyeur en série sur la ligne : chaque point perdu ici est perdu pour toute la Ligne 1.` };
            return {
              ok: false,
              errorTag: 'availability-calc',
              consequence: 'Une disponibilité mal calculée fausse le calcul du TRS et des pertes de marge.',
              question: 'Disponibilité = temps disponible / temps requis : qu’est-ce qui est au dénominateur ?',
              hints: ['A = temps de fonctionnement / (temps de fonctionnement + temps d’arrêt).', 'Utilisez le MDT, pas le MTTR : la ligne est arrêtée pendant l’attente.'],
              method: 'Disponibilité opérationnelle Ao = MTBF / (MTBF + MDT).',
            };
          }}
          onDone={flow.done}
        >
          <NumberInput label="Disponibilité" suffix="%" value={av} onChange={setAv} />
        </Decision>
      )}
      {flow.index === 3 && (
        <Decision
          id="Interprétation"
          title="4. Que dites-vous en réunion ?"
          skills={['COMMUNICATION', 'RELIABILITY']}
          check={() => {
            if (concl[0] === 'c') return { ok: true, why: 'Vous reliez fréquence (MTBF), réparation (MTTR) et logistique (MDT). Deux actions distinctes, deux indicateurs de suivi.' };
            return {
              ok: false,
              errorTag: 'kpi-isolated',
              consequence: concl[0] === 'a' ? 'Le convoyeur reste hors radar. Les bourrages continuent, et les casses roulement coûteuses aussi.' : 'Vous traitez un seul aspect ; l’autre continue de coûter.',
              question: 'Un MTTR faible dit-il quelque chose sur la fréquence des arrêts ? Et sur l’attente pièces ?',
              hints: ['Regardez les deux familles d’événements : bourrages fréquents et courts, casses rares et longues.', 'Le temps d’arrêt total est dominé par… ?'],
              method: 'Ne jamais lire un KPI isolément : MTBF (fréquence) × MDT (durée) = indisponibilité. Chercher la famille de causes dominante (Pareto).',
            };
          }}
          onDone={flow.done}
        >
          <Choice shuffleSeed={422}
            value={concl}
            onChange={setConcl}
            options={[
              { id: 'a', label: '« MTTR de 45 min : le convoyeur est excellent, concentrons-nous ailleurs. »' },
              { id: 'b', label: '« Il faut former les techniciens pour réduire le MTTR. »' },
              { id: 'c', label: `« MTBF ${fmt(MTBF)} h : ${EVENTS.filter((e) => e.wait === 0).length} bourrages courts (réglages non standard) + ${EVENTS.filter((e) => e.wait > 0).length} casses roulement dont ${fmt(EVENTS.reduce((a, e) => a + e.wait, 0))} h d’attente pièce = ${fmt(((SUM_DOWN - SUM_REP) / SUM_DOWN) * 100)} % de l’arrêt. Actions : standard de réglage aux changements de format, et stock de roulements + RCA sur les casses. »` },
              { id: 'd', label: '« Remplaçons le convoyeur. »' },
            ]}
          />
        </Decision>
      )}
    </div>
  );
}
