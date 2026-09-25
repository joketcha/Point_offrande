import { useMemo, useState } from 'react';
import { adaptiveDifficulty } from '../engine/progression';
import { correctFit, generateWeibullDataset, treatedObservations, type RowTreatment } from '../engine/datasets';
import { hashSeed } from '../engine/rng';
import { REGIME_LABEL, gammaFn, optimalAgeReplacement, regimeOf, weibull, weibullMRR, type FailureRegime } from '../engine/stats';
import { useGameState } from '../store/game';
import { LineChart } from '../ui/Charts';
import { Briefing, Choice, Debrief, Decision, NumberInput, Stepper, near, useSteps } from '../ui/Pedagogy';
import { WeibullPlot } from '../ui/WeibullPlot';
import { type MissionProps, fmt, fmtM, num, useFinish } from './common';

const TREAT_LABEL: Record<RowTreatment, string> = {
  failure: 'Défaillance',
  suspension: 'Suspension (censure)',
  exclude: 'Exclure',
  convert: 'Convertir en h de marche → défaillance',
};

const CP = 1.2e6 + 8 * 12000 * 0.8 + 3 * 1.8e6 * 0.1; // préventif : pièce + MO + arrêt planifié
const CF = 1.2e6 * 1.3 + 8 * 12000 * 1.4 + 5 * 1.8e6; // panne : pièce + dégâts + MO + arrêt brassage

export function WeibullMission({ meta, onExit }: MissionProps) {
  const { game } = useGameState();
  const flow = useSteps(5);
  const finish = useFinish(meta, onExit);
  const difficulty = adaptiveDifficulty(game.player, meta);
  const data = useMemo(() => generateWeibullDataset(hashSeed(`wb|${game.plant.seed}|${game.player.attempts[meta.id] ?? 0}`), difficulty), [game.plant.seed, game.player.attempts, meta.id, difficulty]);
  const truth = useMemo(() => correctFit(data.rows)!, [data]);
  const [treat, setTreat] = useState<Record<string, RowTreatment>>(() => Object.fromEntries(data.rows.map((r) => [r.id, 'failure'])));
  const [beta, setBeta] = useState('');
  const [eta, setEta] = useState('');
  const [regime, setRegime] = useState<string[]>([]);
  const [r1000, setR1000] = useState('');
  const [mttf, setMttf] = useState('');
  const [strat, setStrat] = useState<string[]>([]);

  const fit = truth;
  const d = weibull(fit.beta, fit.eta);
  const opt = useMemo(() => optimalAgeReplacement(weibull(fit.beta, fit.eta), CP, CF, fit.eta * 3, 90), [fit]);

  if (flow.index === -1)
    return (
      <Briefing
        meta={meta}
        onStart={flow.start}
        extra={<div className="callout info small">Niveau de difficulté adapté à votre profil : {difficulty}/3 ({data.rows.length} enregistrements).</div>}
      />
    );
  if (flow.finished) return <Debrief meta={meta} results={flow.results} onValidate={() => finish(flow.results)} />;

  const playerFit = weibullMRR(treatedObservations(data.rows, treat));

  return (
    <div>
      <Stepper total={5} index={flow.index} />
      {flow.index === 0 && (
        <Decision
          id="Nettoyage & censures"
          title="1. Préparer les données de vie des garnitures"
          skills={['DATA', 'WEIBULL']}
          prompt={<p>Pour chaque dépose : défaillance, suspension (garniture retirée en bon état = donnée censurée), conversion d’unité, ou exclusion. La P-101 tourne 600 h par mois calendaire de 720 h.</p>}
          mentor={{ id: 'maths', text: 'Une garniture déposée en bon état a survécu jusque-là : c’est une information. Ne la jette pas, ne la compte pas comme panne.' }}
          check={() => {
            const errs = data.rows.filter((r) => treat[r.id] !== r.expected);
            if (!errs.length) return { ok: true, why: `Jeu propre : ${fit.failures} défaillances et ${fit.suspensions} suspensions.` };
            const susp = errs.filter((r) => r.expected === 'suspension');
            const cal = errs.filter((r) => r.kind === 'calendar');
            const tag = susp.length ? 'ignore-censoring' : cal.length ? 'calendar-vs-run' : 'data-not-cleaned';
            return {
              ok: false,
              errorTag: tag,
              consequence: playerFit
                ? `Avec votre traitement : β = ${fmt(playerFit.beta, 2)}, η = ${fmt(playerFit.eta)} h (au lieu de β ≈ ${fmt(fit.beta, 2)}, η ≈ ${fmt(fit.eta)} h). ${errs.length} enregistrement(s) mal traité(s). La stratégie qui en découlerait serait calée sur une loi fausse.`
                : 'Votre traitement ne laisse pas assez de défaillances pour estimer une loi.',
              question: susp.length
                ? 'Que sait-on d’une garniture déposée sans fuite ? A-t-elle défailli ? A-t-elle survécu ?'
                : cal.length
                  ? 'Dans quelle unité sont exprimées les durées du carnet d’atelier ? Et la loi de vie doit-elle être exprimée en temps calendaire ou en temps de marche ?'
                  : 'Chaque ligne décrit-elle une vie unique de garniture de la P-101 ?',
              hints: [
                'Lisez la colonne « Constat » : « bon état », « pas de fuite » → la pièce n’a pas défailli.',
                'Deux lignes identiques (mêmes dates, même durée) = une seule vie.',
                `Jours calendaires → heures de marche : j × 24 × (600/720).`,
                'Une durée négative ou un autre équipement ne peuvent pas entrer dans l’échantillon.',
              ],
              method: 'Échantillon de fiabilité = 1 ligne par vie de composant, même unité (temps de marche), avec son statut : défaillance ou censure à droite. Les censures entrent dans les rangs (méthode de Johnson) ou la vraisemblance (MLE).',
              bestPractice: 'Codifier dans la GMAO le motif de dépose (défaillance / opportunité / préventif) : c’est ce qui rend l’analyse de censures possible.',
            };
          }}
          onDone={flow.done}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Réf.</th>
                  <th>Pompe</th>
                  <th>Pose</th>
                  <th>Dépose</th>
                  <th className="num">Durée</th>
                  <th>Constat à la dépose</th>
                  <th>Traitement</th>
                </tr>
              </thead>
              <tbody>
                {data.rows.map((r) => (
                  <tr key={r.id} className={treat[r.id] === 'exclude' ? 'flagged' : ''}>
                    <td className="num">{r.id}</td>
                    <td>{r.asset}</td>
                    <td className="num">{r.installed}</td>
                    <td className="num">{r.removed}</td>
                    <td className="num">
                      {fmt(r.value)} {r.unit}
                    </td>
                    <td className="small">{r.finding}</td>
                    <td>
                      <select value={treat[r.id]} onChange={(e) => setTreat({ ...treat, [r.id]: e.target.value as RowTreatment })} style={{ minWidth: 190 }}>
                        {(Object.keys(TREAT_LABEL) as RowTreatment[]).map((t) => (
                          <option key={t} value={t}>
                            {TREAT_LABEL[t]}
                          </option>
                        ))}
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Decision>
      )}
      {flow.index === 1 && (
        <Decision
          id="Estimation β, η"
          title="2. Lire β et η sur le papier de Weibull"
          skills={['WEIBULL', 'RELIABILITY']}
          prompt={
            <p>
              Points : rangs médians de Bernard (ajustés de Johnson pour les {fit.suspensions} suspensions). β = pente de la droite ; η = temps pour lequel la droite coupe F = 63,2 %. Survolez les points pour lire leurs
              coordonnées.
            </p>
          }
          check={() => {
            const b = num(beta);
            const e = num(eta);
            if (near(b, fit.beta, 0.15) && near(e, fit.eta, 0.12))
              return { ok: true, why: `Ajustement par régression de rang : β = ${fmt(fit.beta, 2)}, η = ${fmt(fit.eta)} h (R² = ${fmt(fit.r2, 3)}). Avec seulement ${fit.failures} défaillances, l’incertitude sur β reste importante.` };
            const betaOk = near(b, fit.beta, 0.15);
            return {
              ok: false,
              errorTag: 'beta-misread',
              consequence: betaOk ? `η mal lu : l’âge caractéristique conditionne directement les fréquences d’intervention.` : `β mal lu : vous risquez de confondre usure et hasard, donc de choisir la mauvaise famille de tâche.`,
              question: betaOk ? 'Où la droite ajustée coupe-t-elle l’ordonnée F = 63,2 % ?' : 'Si t est multiplié par e (≈ 2,72), de combien la droite monte-t-elle en unités ln(−ln(1−F)) ?',
              hints: [
                'η : descendez verticalement du point où la droite croise la ligne pointillée 63,2 %.',
                'β = Δ[ln(−ln(1−F))] / Δ[ln t] entre deux points de la droite.',
                `Ordre de grandeur : β est compris entre ${fmt(Math.floor(fit.beta * 2) / 2, 1)} et ${fmt(Math.floor(fit.beta * 2) / 2 + 0.5, 1)}.`,
              ],
              method: 'Linéarisation : ln(−ln(1−F)) = β·ln t − β·ln η. Pente = β ; à F = 63,2 %, ln(−ln(1−F)) = 0 donc t = η.',
            };
          }}
          onDone={flow.done}
        >
          <WeibullPlot fit={fit} />
          <div className="grid-2">
            <NumberInput label="β (forme)" value={beta} onChange={setBeta} />
            <NumberInput label="η (échelle)" suffix="h" value={eta} onChange={setEta} />
          </div>
        </Decision>
      )}
      {flow.index === 2 && (
        <Decision
          id="Régime de défaillance"
          title="3. Interpréter β"
          skills={['WEIBULL', 'RELIABILITY']}
          check={() => {
            const reg = regimeOf(fit.beta);
            const ok = regime[0] === reg;
            if (ok)
              return {
                ok: true,
                why: `${REGIME_LABEL[reg]}. ${reg === 'wearout' ? 'Le taux de défaillance croît avec l’âge : une tâche liée à l’âge PEUT avoir un sens — si elle est économique et si le contexte (causes) est maîtrisé.' : 'Le taux de défaillance ne croît pas avec l’âge : remplacer à âge fixe ne réduit pas le risque.'}`,
              };
            return {
              ok: false,
              errorTag: 'beta-misread',
              consequence: 'Vous choisirez une famille de tâches incompatible avec le mécanisme de défaillance.',
              question: 'Que devient λ(t) = (β/η)(t/η)^(β−1) quand β est supérieur, égal ou inférieur à 1 ?',
              hints: ['β > 1 : λ croissant. β = 1 : λ constant. β < 1 : λ décroissant.'],
              method: 'β est la signature du mécanisme : < 1 défauts de jeunesse/montage, ≈ 1 aléatoire (chocs, erreurs), > 1 usure/fatigue.',
            };
          }}
          onDone={flow.done}
        >
          <Choice<FailureRegime>
            value={regime as FailureRegime[]}
            onChange={(v) => setRegime(v)}
            options={(['infant', 'random', 'wearout'] as FailureRegime[]).map((r) => ({ id: r, label: REGIME_LABEL[r] }))}
          />
        </Decision>
      )}
      {flow.index === 3 && (
        <Decision
          id="R(t) et MTTF"
          title="4. Fiabilité à 1 000 h et MTTF"
          skills={['WEIBULL', 'RELIABILITY']}
          prompt={
            <p>
              Avec β = {fmt(fit.beta, 2)} et η = {fmt(fit.eta)} h : calculez R(1 000 h) et le MTTF.
            </p>
          }
          check={() => {
            const r = num(r1000) / 100;
            const m = num(mttf);
            const R = d.R(1000);
            const M = d.mean();
            if (near(r, R, 0.05) && near(m, M, 0.05))
              return { ok: true, why: `R(1 000) = exp(−(1000/η)^β) = ${fmt(R * 100, 1)} % : ${fmt((1 - R) * 100)} % des garnitures fuient avant 1 000 h. MTTF = η·Γ(1+1/β) = ${fmt(M)} h — loin des 4 000 h du plan OEM.` };
            return {
              ok: false,
              errorTag: 'beta-misread',
              consequence: 'Les besoins en pièces et le risque résiduel seraient mal estimés.',
              question: 'Quelle est l’expression de R(t) pour une loi de Weibull à 2 paramètres ?',
              hints: ['R(t) = exp(−(t/η)^β).', `MTTF = η × Γ(1 + 1/β) ; ici Γ(1 + 1/${fmt(fit.beta, 2)}) ≈ ${fmt(gammaFn(1 + 1 / fit.beta), 4)}.`],
              method: 'R(t) = exp[−(t/η)^β] ; MTTF = η Γ(1+1/β) (≈ 0,9 η pour β entre 1,5 et 3).',
            };
          }}
          onDone={flow.done}
        >
          <div className="grid-2">
            <NumberInput label="R(1 000 h)" suffix="%" value={r1000} onChange={setR1000} />
            <NumberInput label="MTTF" suffix="h" value={mttf} onChange={setMttf} />
          </div>
        </Decision>
      )}
      {flow.index === 4 && (
        <Decision
          id="Stratégie"
          title="5. Quelle stratégie pour les garnitures P-101 ?"
          skills={['ECONOMICS', 'RCM', 'WEIBULL']}
          prompt={
            <>
              <p>
                Coût d’un remplacement préventif ≈ {fmtM(CP)} ; coût d’une panne (pièce, dégâts, MO de nuit, 5 h de brassage perdues) ≈ {fmtM(CF)}. R(4 000 h) = {fmt(d.R(4000) * 100, 1)} %. Remplacement à âge
                optimal : T* ≈ {fmt(opt.T)} h, gain {fmt(opt.saving * 100)} % vs correctif pur.
              </p>
              <LineChart
                labels={opt.curve.filter((_, i) => i % 3 === 0).map((c) => fmt(c.T))}
                series={[{ name: 'Coût par heure de marche (FCFA/h)', values: opt.curve.filter((_, i) => i % 3 === 0).map((c) => c.c) }]}
                yFormat={(v) => fmt(v)}
                refLine={{ value: opt.runToFailureRate, label: 'Correctif pur' }}
                height={180}
              />
              <p className="small muted">Coût par heure en fonction de l’âge de remplacement T (h).</p>
            </>
          }
          mentor={{ id: 'mecano', text: 'Depuis qu’on ne fait plus l’alignement laser et qu’on monte des garnitures NBR, elles tiennent trois mois.' }}
          check={() => {
            const has = (x: string) => strat.includes(x);
            if (has('d') && !has('a') && !has('c'))
              return { ok: true, why: `Le plan OEM à 4 000 h est inutile : ${fmt((1 - d.R(4000)) * 100)} % des garnitures fuient avant. L’η observé (${fmt(fit.eta)} h) reflète un contexte dégradé (désalignement, mauvaise référence) : le résultat statistique décrit le système actuel, pas la garniture. Éliminer les causes d’abord ; surveiller la fuite (P-F court) ; ${has('b') ? 'le remplacement à âge peut servir de mesure transitoire.' : 'le remplacement à âge optimal n’apporte qu’un gain marginal.'}` };
            return {
              ok: false,
              errorTag: has('a') ? 'oem-copy' : 'beta-misread',
              consequence: has('a')
                ? `À 4 000 h, ${fmt((1 - d.R(4000)) * 100)} % des garnitures auront déjà fui : vous payez le préventif ET les pannes.`
                : has('c')
                  ? 'Le correctif + stock ne fait que subir. Chaque panne coûte ~10 M FCFA et le brassage s’arrête.'
                  : 'Vous optimisez la fréquence d’une défaillance… dont la cause est connue et éliminable.',
              question: 'Le η mesuré est-il une propriété de la garniture, ou du contexte dans lequel elle travaille ? Que dit le mécanicien ?',
              hints: ['Un η très inférieur à la durée de vie nominale d’une garniture (≈ 15 000 h) signale une cause externe.', 'Un résultat statistique ne vaut que si les données ET le contexte sont fiables.'],
              method: 'Analyse de Weibull → choix de la famille de tâche, mais d’abord : la loi reflète-t-elle un mode « normal » ou une cause racine éliminable ?',
              bestPractice: 'Quand η est anormalement court : RCA / élimination des causes, puis refaire l’analyse Weibull 6-12 mois plus tard pour vérifier le gain.',
            };
          }}
          onDone={flow.done}
        >
          <Choice
            multi
            value={strat}
            onChange={setStrat}
            options={[
              { id: 'a', label: 'Conserver le remplacement systématique OEM à 4 000 h' },
              { id: 'b', label: `Remplacement à âge optimal ≈ ${fmt(opt.T)} h (mesure transitoire)` },
              { id: 'c', label: 'Correctif pur + 14 garnitures en stock' },
              { id: 'd', label: 'Éliminer les causes (alignement laser, référence EPDM conforme, protection marche à sec) + ronde fuite/ultrasons hebdomadaire, puis réanalyser dans 6 mois' },
            ]}
          />
        </Decision>
      )}
    </div>
  );
}
