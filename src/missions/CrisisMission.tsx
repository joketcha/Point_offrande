import { useEffect, useMemo, useState } from 'react';
import { Rng, hashSeed } from '../engine/rng';
import { useGameState } from '../store/game';
import { Briefing, Choice, Debrief, Decision, NumberInput, Stepper, near, useSteps } from '../ui/Pedagogy';
import { type MissionProps, fmt, fmtM, num, useFinish } from './common';

const LOSS_H = 5.2e6;

interface Opt {
  id: 'A' | 'B' | 'C' | 'D';
  label: string;
  base: number; // h
  p: number; // probabilité de succès
  extra: number; // h supplémentaires en cas d'échec
  cost: number;
  hse: 'faible' | 'modéré' | 'élevé';
  detail: string;
}

const OPTIONS: Opt[] = [
  { id: 'A', label: 'Réparation provisoire par soudure de la came', base: 8, p: 0.55, extra: 60, cost: 0.6e6, hse: 'élevé', detail: 'Soudure sur acier traité : risque de fissuration et de rupture brutale en charge (bris de bouteilles, projections).' },
  { id: 'B', label: 'Cannibaliser la came de la ligne pilote (arrêtée)', base: 12, p: 0.9, extra: 20, cost: 0.8e6, hse: 'faible', detail: 'Démontage 6 h + montage 6 h. La ligne pilote restera indisponible jusqu’à réception OEM (impact faible).' },
  { id: 'C', label: 'Fabrication locale (atelier d’usinage de Bassa)', base: 60, p: 0.7, extra: 60, cost: 2.5e6, hse: 'modéré', detail: 'Reverse engineering, traitement thermique sous-traité. Conformité incertaine.' },
  { id: 'D', label: 'Attendre la came OEM (express)', base: 240, p: 1, extra: 0, cost: 4e6, hse: 'faible', detail: '10 jours avion + dédouanement.' },
];

const expected = (o: Opt) => o.base + (1 - o.p) * o.extra;

export function CrisisMission({ meta, onExit }: MissionProps) {
  const { game } = useGameState();
  const flow = useSteps(4);
  const finish = useFinish(meta, onExit);
  const [elapsed, setElapsed] = useState(0); // secondes réelles
  const [eB, setEB] = useState('');
  const [choice, setChoice] = useState<string[]>([]);
  const [compl, setCompl] = useState<string[]>([]);
  const [msg, setMsg] = useState<string[]>([]);
  const decisionHours = Math.min(4, elapsed / 30); // 30 s réelles = 1 h de ligne arrêtée

  useEffect(() => {
    if (flow.index < 0 || flow.index > 1) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [flow.index]);

  const outcome = useMemo(() => {
    const o = OPTIONS.find((x) => x.id === choice[0]) ?? OPTIONS[1];
    const rng = new Rng(hashSeed(`crise|${game.plant.seed}|${game.player.attempts[meta.id] ?? 0}`));
    const success = rng.chance(o.p);
    const hours = o.base + (success ? 0 : o.extra) + decisionHours;
    const l2 = compl.includes('l2');
    const loss = hours * LOSS_H * (l2 ? 0.75 : 1);
    const cost = o.cost + (compl.includes('oem') ? 4e6 : 0) + (compl.includes('stock') ? 3.2e6 : 0);
    const injury = o.id === 'A' && !success && rng.chance(0.35);
    return { o, success, hours, loss, cost, injury };
  }, [choice, compl, decisionHours, game.plant.seed, game.player.attempts, meta.id]);

  if (flow.index === -1) return <Briefing meta={meta} onStart={flow.start} />;
  if (flow.finished) {
    const { o, success, hours, loss, cost, injury } = outcome;
    return (
      <Debrief
        meta={meta}
        results={flow.results}
        onValidate={() =>
          finish(flow.results, {
            loss,
            cost,
            trust: (hours < 30 ? 6 : hours < 80 ? 0 : -10) + (msg[0] === 'b' ? 3 : -2),
            safety: injury ? -25 : o.id === 'A' ? -5 : 3,
          })
        }
      >
        <div className={`callout ${success && !injury ? 'good' : 'bad'}`}>
          <b>Ce qui s’est réellement passé :</b> option {o.id} — {success ? 'la solution a tenu.' : 'la solution a échoué, arrêt prolongé.'}{' '}
          {injury && 'Un opérateur a été blessé par des éclats de verre lors de la rupture de la came soudée. Enquête HSE ouverte.'} Arrêt total : <b>{fmt(hours, 1)} h</b> (dont {fmt(decisionHours, 1)} h de délai de décision). Perte :{' '}
          <b>{fmtM(loss, 0)}</b>, surcoûts : <b>{fmtM(cost, 1)}</b>.
        </div>
        <p className="small muted">Même une bonne décision peut mal tourner (et inversement) : on juge une décision sur son espérance et son risque, pas sur son résultat.</p>
      </Debrief>
    );
  }

  return (
    <div>
      <Stepper total={4} index={flow.index} />
      {flow.index <= 1 && (
        <div className="card" style={{ borderColor: 'var(--critical)' }}>
          <div className="row between">
            <b style={{ color: 'var(--critical)' }}>⏱ LIGNE 1 ARRÊTÉE</b>
            <span className="num">
              Délai de décision : {fmt(decisionHours, 1)} h · perte {fmtM(decisionHours * LOSS_H, 1)}
            </span>
          </div>
          <div className="small muted">30 secondes de réflexion = 1 heure de ligne arrêtée (plafonné à 4 h).</div>
        </div>
      )}
      <div className="card">
        <h3>Options sur la table</h3>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Option</th>
                <th className="num">Durée si succès</th>
                <th className="num">P(succès)</th>
                <th className="num">Durée en plus si échec</th>
                <th className="num">Coût direct</th>
                <th>Risque HSE</th>
              </tr>
            </thead>
            <tbody>
              {OPTIONS.map((o) => (
                <tr key={o.id}>
                  <td>
                    <b>{o.id}.</b> {o.label}
                    <div className="small muted">{o.detail}</div>
                  </td>
                  <td className="num">{o.base} h</td>
                  <td className="num">{fmt(o.p * 100)} %</td>
                  <td className="num">{o.extra ? `+${o.extra} h` : '—'}</td>
                  <td className="num">{fmtM(o.cost, 1)}</td>
                  <td>
                    <span className={`pill ${o.hse === 'élevé' ? 'crit' : o.hse === 'modéré' ? 'warn' : 'good'}`}>{o.hse}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      {flow.index === 0 && (
        <Decision
          id="Espérance d’arrêt"
          title="1. Calculer la durée d’arrêt espérée de l’option B"
          skills={['ECONOMICS', 'RELIABILITY']}
          check={() => {
            const v = num(eB);
            if (near(v, expected(OPTIONS[1]), 0.05))
              return { ok: true, why: `E[arrêt B] = 12 + 0,1 × 20 = 14 h → ${fmtM(14 * LOSS_H, 0)} espérés. Pour comparaison : A = ${fmt(expected(OPTIONS[0]))} h, C = ${fmt(expected(OPTIONS[2]))} h, D = 240 h.` };
            return {
              ok: false,
              errorTag: 'crisis-expected-value',
              consequence: 'Sans espérance chiffrée, la décision se fera au bruit : celui qui crie le plus fort (Production) l’emportera.',
              question: 'Quelle est la durée si tout va bien, et combien ajoute-t-on, pondéré par la probabilité que ça se passe mal ?',
              hints: ['E = durée de base + P(échec) × durée supplémentaire.', 'P(échec) = 1 − 0,9 = 0,1.'],
              method: 'Espérance = Σ (probabilité × conséquence) sur chaque scénario.',
            };
          }}
          onDone={flow.done}
        >
          <NumberInput label="Durée d’arrêt espérée (option B)" suffix="h" value={eB} onChange={setEB} />
        </Decision>
      )}
      {flow.index === 1 && (
        <Decision
          id="Décision immédiate"
          title="2. Décidez maintenant"
          skills={['LEADERSHIP', 'MAINTENANCE']}
          mentor={{ id: 'prod', text: 'La soudure, c’est 8 heures. Faites la soudure !' }}
          check={() => {
            const c = choice[0];
            if (c === 'B') return { ok: true, why: 'Plus faible espérance de perte ET risque HSE faible. La cannibalisation est légitime ici car la ligne pilote est arrêtée et la pièce OEM est commandée pour la restituer.' };
            if (c === 'A')
              return {
                ok: false,
                errorTag: 'crisis-no-hse',
                consequence: 'La came soudée casse au bout de 3 jours, en charge. Éclats de verre sur le poste de contrôle. Arrêt prolongé ET accident.',
                question: 'Que vaut un gain de quelques heures face à un risque de blessure ? Et l’espérance de A est-elle vraiment la meilleure ?',
                hints: ['Comparez E[A] = 8 + 0,45 × 60 et E[B].', 'Un risque HSE élevé n’est pas compensable par des FCFA.'],
                method: 'Filtrer d’abord les options inacceptables (HSE, qualité), puis minimiser l’espérance de perte parmi les options restantes.',
              };
            return {
              ok: false,
              errorTag: 'crisis-expected-value',
              consequence: c === 'D' ? `240 h d’arrêt : ${fmtM(240 * LOSS_H, 0)} de marge perdue.` : `Espérance de ${fmt(expected(OPTIONS[2]))} h d’arrêt, et risque de pièce non conforme.`,
              question: 'Existe-t-il une option sûre avec une espérance de perte plus faible ?',
              hints: ['Relisez le détail de l’option B : la ligne pilote est à l’arrêt.'],
              method: 'Filtrer HSE/qualité, puis minimiser l’espérance.',
            };
          }}
          onDone={flow.done}
        >
          <Choice shuffleSeed={62} value={choice} onChange={setChoice} options={OPTIONS.map((o) => ({ id: o.id, label: `${o.id}. ${o.label}`, sub: `E[arrêt] à calculer · HSE ${o.hse}` }))} />
        </Decision>
      )}
      {flow.index === 2 && (
        <Decision
          id="Actions complémentaires"
          title="3. Actions complémentaires (plusieurs choix)"
          skills={['SPARES', 'RCA', 'LEADERSHIP']}
          check={() => {
            const must = ['oem', 'rca', 'stock'];
            const bad = ['nopm', 'blame'];
            const miss = must.filter((m) => !compl.includes(m));
            const wrong = bad.filter((b) => compl.includes(b));
            if (!miss.length && !wrong.length) return { ok: true, why: 'Vous sortez de la crise ET vous empêchez la suivante : pièce restituée, pièce critique en stock, cause racine recherchée.' };
            return {
              ok: false,
              errorTag: wrong.includes('blame') ? 'blame-person' : 'stock-no-risk',
              consequence: wrong.length
                ? 'Les actions choisies dégradent la situation (préventif supprimé = prochaines pannes ; sanction = plus personne ne signalera les anomalies).'
                : 'La crise est réglée… jusqu’à la prochaine casse. Rien n’a changé dans le système.',
              question: 'Qu’est-ce qui garantirait que cette crise ne se reproduise pas dans 6 mois ?',
              hints: ['Pensez : restitution de la pièce cannibalisée, stock de pièce critique, analyse de la casse.', 'Une crise non analysée est une crise programmée.'],
              method: 'Sortie de crise = rétablir + sécuriser (pièces) + comprendre (RCA) + capitaliser (REX).',
            };
          }}
          onDone={flow.done}
        >
          <Choice shuffleSeed={678}
            multi
            value={compl}
            onChange={setCompl}
            options={[
              { id: 'oem', label: 'Commander la came OEM en express (restituer la ligne pilote)' },
              { id: 'l2', label: 'Transférer une partie des volumes sur la Ligne 2 (canettes) pendant l’arrêt' },
              { id: 'rca', label: 'Lancer une RCA sur la casse de la came (expertise de la pièce)' },
              { id: 'stock', label: 'Créer un article « came de levage » en pièce critique avec stock de sécurité' },
              { id: 'nopm', label: 'Supprimer le préventif soutireuse du mois pour rattraper la production' },
              { id: 'blame', label: 'Sanctionner l’équipe de nuit' },
            ]}
          />
        </Decision>
      )}
      {flow.index === 3 && (
        <Decision
          id="Message au DG"
          title="4. Le Directeur Général appelle"
          skills={['COMMUNICATION', 'LEADERSHIP']}
          check={() =>
            msg[0] === 'b'
              ? { ok: true, why: 'Faits, heure de redémarrage, risque résiduel, mesures pour éviter la récidive : le DG sait ce qu’il peut annoncer.' }
              : {
                  ok: false,
                  consequence: msg[0] === 'a' ? 'Le DG annonce un redémarrage « dans la nuit » au client. Vous ne tenez pas la promesse.' : 'Le DG n’a aucune information exploitable et vous perçoit comme débordé.',
                  question: 'De quoi le DG a-t-il besoin pour gérer ses clients et sa hiérarchie ?',
                  hints: ['Un message de crise : situation, décision, heure de reprise probable, risques, prochaines étapes.'],
                  method: 'Communication de crise : factuelle, chiffrée, avec incertitude assumée et prochain point horaire.',
                }
          }
          onDone={flow.done}
        >
          <Choice shuffleSeed={640}
            value={msg}
            onChange={setMsg}
            options={[
              { id: 'a', label: '« Pas d’inquiétude, on redémarre dans la nuit. »' },
              { id: 'b', label: '« Came cassée, pas de stock. Nous montons la came de la ligne pilote : redémarrage estimé dans 12 à 14 h (90 % de confiance). Came OEM commandée en express, RCA lancée, et la came devient pièce critique stockée. Prochain point à 6 h. »' },
              { id: 'c', label: '« Nous étudions plusieurs options, je vous rappelle. »' },
              { id: 'd', label: '« C’est la faute des Achats qui ont refusé le stock l’an dernier. »' },
            ]}
          />
        </Decision>
      )}
    </div>
  );
}
