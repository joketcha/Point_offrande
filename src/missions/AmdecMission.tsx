import { useState } from 'react';
import { Briefing, Debrief, Decision, Stepper, useSteps, type Verdict } from '../ui/Pedagogy';
import { Choice } from '../ui/Pedagogy';
import { type MissionProps, useFinish } from './common';

type Cat = 'fonction' | 'df' | 'mode' | 'cause' | 'effet';
const CAT_LABEL: Record<Cat, string> = { fonction: 'Fonction', df: 'Défaillance fonctionnelle', mode: 'Mode de défaillance', cause: 'Cause', effet: 'Effet' };

const STATEMENTS: { id: string; text: string; cat: Cat }[] = [
  { id: 's1', text: 'Porter la bière entre 15 et 25 UP (unités de pasteurisation) à la cadence de 40 000 bouteilles/h', cat: 'fonction' },
  { id: 's2', text: 'Nombre d’UP inférieur à 15 en sortie de zone de chambrage', cat: 'df' },
  { id: 's3', text: 'Encrassement des plaques de l’échangeur de la zone 5', cat: 'mode' },
  { id: 's4', text: 'Eau d’appoint non adoucie (dureté 35 °f)', cat: 'cause' },
  { id: 's5', text: 'Bière sous-pasteurisée : refermentation, risque de rappel produit national', cat: 'effet' },
  { id: 's6', text: 'Blocage de la vanne de régulation vapeur TV-503', cat: 'mode' },
  { id: 's7', text: 'Air instrument humide (purgeurs automatiques hors service)', cat: 'cause' },
  { id: 's8', text: 'Dérive de la sonde de température PT-501 de la zone de chambrage', cat: 'mode' },
];

interface ModeCard {
  id: string;
  name: string;
  context: string;
  ranges: { S: [number, number]; O: [number, number]; D: [number, number] };
}

const MODES: ModeCard[] = [
  { id: 'M1', name: 'Encrassement échangeur zone 5', context: 'Effet : sous-pasteurisation possible. Fréquence : ~2 fois/an (eau dure). Détection : UP calculées en continu par l’automate, alarme et blocage automatique de la sortie si UP < 15.', ranges: { S: [8, 10], O: [5, 8], D: [1, 4] } },
  { id: 'M2', name: 'Blocage vanne vapeur TV-503', context: 'Effet : chute de température zone 5 → sous-pasteurisation. Fréquence : 1 fois tous les 2-3 ans. Détection : écart consigne/mesure alarmé en salle de contrôle.', ranges: { S: [8, 10], O: [2, 4], D: [1, 4] } },
  { id: 'M3', name: 'Fuite garniture pompe de circulation zone 3', context: 'Effet : arrêt de la zone pour intervention (1 h), pas d’impact produit (sécurité température). Fréquence : ~1 fois/mois. Détection : fuite visible, flaque au sol.', ranges: { S: [3, 6], O: [6, 9], D: [1, 3] } },
  { id: 'M4', name: 'Dérive sonde PT-501 (zone de chambrage)', context: 'Effet : la sonde affiche 62 °C alors que la bière est à 58 °C : sous-pasteurisation NON vue par l’automate. Fréquence : rare (1 fois/3 ans). Détection : aucune redondance, pas d’étalonnage planifié.', ranges: { S: [9, 10], O: [2, 4], D: [7, 10] } },
];

const ACTIONS = [
  { id: 'a1', label: 'Adoucisseur sur l’eau d’appoint + suivi du ΔT échangeur (tâche conditionnelle)' },
  { id: 'a2', label: 'Test fonctionnel de la vanne à chaque démarrage + surveillance du positionneur' },
  { id: 'a3', label: 'Ronde visuelle + garniture de référence conforme' },
  { id: 'a4', label: 'Seconde sonde redondante + étalonnage trimestriel raccordé + comparaison croisée alarmée' },
  { id: 'a5', label: 'Remplacer l’échangeur complet tous les ans' },
  { id: 'a6', label: 'Ajouter une alarme supplémentaire sans procédure de réponse' },
];
const GOOD_ACTION: Record<string, string> = { M1: 'a1', M2: 'a2', M3: 'a3', M4: 'a4' };

export function AmdecMission({ meta, onExit }: MissionProps) {
  const flow = useSteps(4);
  const finish = useFinish(meta, onExit);
  const [cats, setCats] = useState<Record<string, Cat | ''>>(() => Object.fromEntries(STATEMENTS.map((s) => [s.id, ''])));
  const [sod, setSod] = useState<Record<string, { S: number; O: number; D: number }>>(() => Object.fromEntries(MODES.map((m) => [m.id, { S: 5, O: 5, D: 5 }])));
  const [prio, setPrio] = useState<string[]>([]);
  const [acts, setActs] = useState<Record<string, string>>(() => Object.fromEntries(MODES.map((m) => [m.id, ''])));

  if (flow.index === -1) return <Briefing meta={meta} onStart={flow.start} />;
  if (flow.finished) return <Debrief meta={meta} results={flow.results} onValidate={() => finish(flow.results)} />;

  const rpn = (id: string) => sod[id].S * sod[id].O * sod[id].D;

  const checkSod = (): Verdict => {
    for (const m of MODES) {
      const v = sod[m.id];
      if (v.D > m.ranges.D[1] && m.ranges.D[1] <= 4)
        return {
          ok: false,
          errorTag: 'detection-incoherent',
          consequence: `Avec D = ${v.D}, « ${m.name} » paraît très critique à cause de la détection, et mobilisera des ressources inutiles.`,
          question: `Pourquoi avez-vous attribué une détectabilité faible (D = ${v.D}) alors que ${m.id === 'M3' ? 'la fuite est visible de tous' : 'l’automate détecte et alarme automatiquement'} ?`,
          hints: ['D note la capacité à détecter le mode AVANT que l’effet n’atteigne le client : 1 = détection quasi certaine, 10 = indétectable.'],
          method: 'Coter D à partir des moyens de détection existants, pas de l’impression de gravité.',
        };
      if (v.D < m.ranges.D[0])
        return {
          ok: false,
          errorTag: 'detection-incoherent',
          consequence: `Vous considérez « ${m.name} » comme facilement détectable. En réalité, rien ne le détecte : des bouteilles sous-pasteurisées partent chez le client.`,
          question: 'Quel moyen de détection, aujourd’hui, révélerait une sonde qui ment ?',
          hints: ['Une sonde unique qui dérive fait croire à l’automate que tout va bien.', 'Pas de redondance, pas d’étalonnage : c’est une défaillance… cachée.'],
          method: 'Une mesure unique sans vérification croisée ne détecte pas sa propre dérive.',
        };
      if (v.S < m.ranges.S[0] || v.S > m.ranges.S[1])
        return {
          ok: false,
          errorTag: 'rpn-only',
          consequence: v.S < m.ranges.S[0] ? `Gravité sous-estimée pour « ${m.name} » : un risque de rappel produit est traité comme un incident mineur.` : `Gravité surestimée pour « ${m.name} » : un incident sans effet client mobilise des ressources critiques.`,
          question: 'Quel est l’effet final le plus grave de ce mode, pour le client ou la sécurité ?',
          hints: ['S se cote sur l’effet final (client, sécurité, environnement), pas sur la difficulté de réparation.'],
          method: 'S = gravité de l’effet final ; O = fréquence d’occurrence ; D = probabilité de non-détection avant l’effet.',
        };
      if (v.O < m.ranges.O[0] - 1 || v.O > m.ranges.O[1] + 1)
        return {
          ok: false,
          errorTag: 'rpn-only',
          consequence: `La fréquence de « ${m.name} » est incohérente avec l’historique.`,
          question: 'Que dit le contexte sur la fréquence observée ?',
          hints: ['Échelle indicative : 1 = < 1 fois/10 ans … 5 = ~1 fois/an … 8 = ~1 fois/mois … 10 = quotidien.'],
          method: 'Coter O à partir des données REX, pas d’intuition.',
        };
    }
    return { ok: true, why: 'Cotations cohérentes avec le contexte et les moyens de détection.' };
  };

  return (
    <div>
      <Stepper total={4} index={flow.index} />
      {flow.index === 0 && (
        <Decision
          id="Structurer l’analyse"
          title="1. Fonction, défaillance, mode, cause, effet"
          skills={['AMDEC', 'RELIABILITY']}
          prompt={<p>Le groupe de travail a noté ces phrases pêle-mêle. Classez-les : une AMDEC confuse produit des actions inefficaces.</p>}
          check={() => {
            const wrong = STATEMENTS.filter((s) => cats[s.id] !== s.cat);
            if (!wrong.length) return { ok: true, why: 'Structure claire : une fonction (avec performance), sa défaillance fonctionnelle, des modes, leurs causes, leurs effets.' };
            return {
              ok: false,
              errorTag: 'mode-cause-confusion',
              consequence: `${wrong.length} élément(s) mal classé(s). Confondre cause et mode conduit à traiter le symptôme (nettoyer l’échangeur) au lieu de la cause (traiter l’eau).`,
              question: 'Le mode est « comment » l’équipement défaille ; la cause est « pourquoi ». Lequel de ces éléments répond à « pourquoi » ?',
              hints: ['Une fonction contient un verbe + un standard de performance.', 'La défaillance fonctionnelle est l’incapacité à tenir ce standard.', 'Le mode est un événement physique sur un composant ; la cause est ce qui le provoque.'],
              method: 'Fonction → Défaillance fonctionnelle → Mode (composant + phénomène) → Cause (mécanisme, origine) → Effet (local, système, client).',
            };
          }}
          onDone={flow.done}
        >
          <div className="stack">
            {STATEMENTS.map((s) => (
              <div key={s.id} className="row between" style={{ flexWrap: 'wrap', gap: 6 }}>
                <span style={{ flex: '1 1 300px' }}>{s.text}</span>
                <select value={cats[s.id]} onChange={(e) => setCats({ ...cats, [s.id]: e.target.value as Cat })} style={{ flex: '0 0 220px' }}>
                  <option value="">— classer —</option>
                  {(Object.keys(CAT_LABEL) as Cat[]).map((c) => (
                    <option key={c} value={c}>
                      {CAT_LABEL[c]}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </Decision>
      )}
      {flow.index === 1 && (
        <Decision id="Cotation S/O/D" title="2. Coter gravité, occurrence, détectabilité" skills={['AMDEC']} check={checkSod} onDone={flow.done} mentor={{ id: 'maths', text: 'D = 1 signifie « je détecte à coup sûr ». D = 10 signifie « je ne verrai rien avant le client ».' }}>
          <div className="grid-2">
            {MODES.map((m) => (
              <div key={m.id} className="card" style={{ margin: 0 }}>
                <h4>
                  {m.id} — {m.name}
                </h4>
                <p className="small text-2">{m.context}</p>
                {(['S', 'O', 'D'] as const).map((k) => (
                  <label key={k} className="field" style={{ marginBottom: 4 }}>
                    <span className="row between">
                      <span>{k === 'S' ? 'Gravité S' : k === 'O' ? 'Occurrence O' : 'Non-détection D'}</span>
                      <b className="num">{sod[m.id][k]}</b>
                    </span>
                    <input type="range" min={1} max={10} value={sod[m.id][k]} onChange={(e) => setSod({ ...sod, [m.id]: { ...sod[m.id], [k]: +e.target.value } })} />
                  </label>
                ))}
                <div className="small">
                  RPN = S×O×D = <b className="num">{rpn(m.id)}</b>
                </div>
              </div>
            ))}
          </div>
        </Decision>
      )}
      {flow.index === 2 && (
        <Decision
          id="Priorisation"
          title="3. Quels modes traitez-vous en priorité ?"
          skills={['AMDEC', 'RELIABILITY']}
          prompt={
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Mode</th>
                    <th className="num">S</th>
                    <th className="num">O</th>
                    <th className="num">D</th>
                    <th className="num">RPN</th>
                  </tr>
                </thead>
                <tbody>
                  {[...MODES].sort((a, b) => rpn(b.id) - rpn(a.id)).map((m) => (
                    <tr key={m.id}>
                      <td>
                        {m.id} — {m.name}
                      </td>
                      <td className="num">{sod[m.id].S}</td>
                      <td className="num">{sod[m.id].O}</td>
                      <td className="num">{sod[m.id].D}</td>
                      <td className="num">{rpn(m.id)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          }
          mentor={{ id: 'prod', text: 'Seuil RPN > 100, et on arrête là.' }}
          check={() => {
            const need = ['M1', 'M2', 'M4'];
            const miss = need.filter((x) => !prio.includes(x));
            if (!miss.length) return { ok: true, why: `Tous les modes de gravité ≥ 9 sont traités, quel que soit leur RPN (M2 a un RPN de ${rpn('M2')}). ${prio.includes('M3') ? 'M3 peut aussi être amélioré, mais n’est pas prioritaire.' : 'M3 (fréquent mais bénin) relève de l’amélioration continue.'}` };
            return {
              ok: false,
              errorTag: 'rpn-only',
              consequence: `${miss.join(', ')} non traité(s). Un blocage de vanne vapeur non maîtrisé peut provoquer un rappel produit national — même avec un RPN « faible ».`,
              question: '10 × 2 × 2 = 40 et 4 × 5 × 2 = 40 représentent-ils le même risque ?',
              hints: ['Le RPN écrase la gravité : un mode catastrophique rare obtient un petit produit.', 'Règle : S ≥ 9 → action obligatoire, indépendamment de O et D.'],
              method: 'Prioriser par gravité d’abord (matrice S × O), puis utiliser D pour choisir le type d’action (prévention vs détection).',
              bestPractice: 'Utiliser une matrice de criticité avec zones (inacceptable / ALARP / acceptable) plutôt qu’un seuil de RPN.',
            };
          }}
          onDone={flow.done}
        >
          <Choice multi value={prio} onChange={setPrio} options={MODES.map((m) => ({ id: m.id, label: `${m.id} — ${m.name}`, sub: `RPN ${rpn(m.id)}` }))} />
        </Decision>
      )}
      {flow.index === 3 && (
        <Decision
          id="Actions"
          title="4. Associer une action à chaque mode"
          skills={['AMDEC', 'MAINTENANCE']}
          check={() => {
            const wrong = MODES.filter((m) => acts[m.id] !== GOOD_ACTION[m.id]);
            if (!wrong.length) return { ok: true, why: 'Chaque action agit sur la cause (M1), sur la détection d’une défaillance cachée (M4), ou sur la fiabilité fonctionnelle (M2). L’eau adoucie éliminera aussi l’entartrage de la chaudière.' };
            return {
              ok: false,
              errorTag: 'mode-cause-confusion',
              consequence: `Action inadaptée pour ${wrong.map((w) => w.id).join(', ')} : le risque reste entier ou le coût explose.`,
              question: 'Pour chaque mode : l’action réduit-elle O (supprimer la cause), ou D (mieux détecter) ? Et à quel coût ?',
              hints: ['M4 est une défaillance cachée : il faut la rendre visible.', 'M1 : traiter la cause (l’eau), pas remplacer le matériel.'],
              method: 'Action de prévention (réduit O) > action de détection (réduit D) > action de protection (réduit S).',
            };
          }}
          onDone={flow.done}
        >
          <div className="stack">
            {MODES.map((m) => (
              <label key={m.id} className="field">
                {m.id} — {m.name}
                <select value={acts[m.id]} onChange={(e) => setActs({ ...acts, [m.id]: e.target.value })}>
                  <option value="">— choisir une action —</option>
                  {ACTIONS.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </Decision>
      )}
    </div>
  );
}
