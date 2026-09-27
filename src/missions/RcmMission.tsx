import { useState } from 'react';
import type { Strategy } from '../engine/types';
import { Briefing, Choice, Debrief, Decision, NumberInput, Stepper, useSteps } from '../ui/Pedagogy';
import { type MissionProps, num, useFinish } from './common';

type Conseq = 'cachee' | 'securite' | 'operationnelle' | 'non-op';
const CONSEQ_LABEL: Record<Conseq, string> = { cachee: 'Cachée', securite: 'Sécurité / environnement', operationnelle: 'Opérationnelle', 'non-op': 'Non opérationnelle' };

const MODES = [
  { id: 'garniture', name: 'Fuite garniture mécanique (eau à 78 °C)', data: 'β ≈ 1,5 · η ≈ 1 600 h (contexte actuel) · P-F ≈ 300 h (suintement → fuite)', conseq: 'securite' as Conseq },
  { id: 'roulement', name: 'Dégradation roulement palier DE', data: 'β ≈ 1,9 · η ≈ 8 000 h · P-F vibratoire ≈ 1 500 h', conseq: 'operationnelle' as Conseq },
  { id: 'pressostat', name: 'Pressostat de protection manque d’eau HS', data: 'Se révèle seulement si la pompe tourne à sec · MTBF pressostat ≈ 20 000 h', conseq: 'cachee' as Conseq },
  { id: 'roue', name: 'Usure de la roue (perte de débit lente)', data: 'Perte de 5 % de débit en 3 ans · pas d’arrêt', conseq: 'non-op' as Conseq },
];

type Task = Strategy | 'FFT' | 'REDESIGN';
const TASK_LABEL: Record<Task, string> = {
  RTF: 'Aucune tâche (fonctionnement jusqu’à défaillance)',
  PM: 'Remplacement systématique',
  CBM: 'Tâche conditionnelle (inspection / mesure)',
  PDM: 'Surveillance en ligne',
  FFT: 'Recherche de défaillance (test fonctionnel)',
  REDESIGN: 'Modification de conception',
};

export function RcmMission({ meta, onExit }: MissionProps) {
  const flow = useSteps(7);
  const finish = useFinish(meta, onExit);
  const [fn, setFn] = useState<string[]>([]);
  const [ff, setFf] = useState<string[]>([]);
  const [modes, setModes] = useState<string[]>([]);
  const [cq, setCq] = useState<Record<string, Conseq | ''>>({ garniture: '', roulement: '', pressostat: '', roue: '' });
  const [task, setTask] = useState<Record<string, Task | ''>>({ garniture: '', roulement: '', pressostat: '', roue: '' });
  const [intRoul, setIntRoul] = useState('');
  const [ffi, setFfi] = useState('');
  const [q7, setQ7] = useState<string[]>([]);
  const [gamme, setGamme] = useState({ point: '', normal: '', alert: '', crit: '', cond: '', lock: '' });

  if (flow.index === -1) return <Briefing meta={meta} onStart={flow.start} />;
  if (flow.finished) {
    const inspRoul = Math.round(num(intRoul)) || 700;
    return (
      <Debrief meta={meta} results={flow.results} onValidate={() => finish(flow.results, { policies: { 'P-101:roulement': { strategy: 'CBM', inspInterval: inspRoul }, 'P-101:garniture': { strategy: 'CBM', inspInterval: 150 } } })}>
        <div className="callout small">Le plan RCM sera appliqué à P-101 dans l’usine simulée : roulement en conditionnel (vibration), garniture en ronde de fuite, et alignement laser standardisé.</div>
      </Debrief>
    );
  }

  return (
    <div>
      <Stepper total={7} index={flow.index} />
      <div className="card small text-2">
        <b>Contexte opérationnel P-101 :</b> eau de brassage 45 m³/h à 78 °C, 4 bar ; 600 h de marche/mois ; aucune pompe de secours ; arrêt = brassage arrêté (1,8 M FCFA/h) ; eau dure ; techniciens formés à l’analyse vibratoire : 1. Plan OEM :
        « remplacer roulements toutes les 4 000 h, garniture toutes les 4 000 h ».
      </div>
      {flow.index === 0 && (
        <Decision
          id="Q1 Fonction"
          title="Q1. Quelle est la fonction (et sa performance requise) ?"
          skills={['RCM']}
          check={() =>
            fn[0] === 'c'
              ? { ok: true, why: 'Une fonction RCM = verbe + objet + standard de performance, dans CE contexte d’exploitation. C’est le standard qui définit ensuite ce qu’est une défaillance.' }
              : {
                  ok: false,
                  consequence: 'Sans standard de performance, impossible de dire quand la pompe « a défailli » : à 40 m³/h ? à 30 ? Les tâches ne pourront pas avoir de critère d’acceptation.',
                  question: 'Qu’est-ce que la salle de brassage attend exactement de cette pompe ?',
                  hints: ['Cherchez l’énoncé qui contient des valeurs mesurables.', 'La capacité nominale de la pompe (catalogue) n’est pas le besoin de l’exploitation.'],
                  method: 'Fonction = verbe + objet + standard de performance attendu par l’utilisateur (pas la capacité constructeur).',
                }
          }
          onDone={flow.done}
        >
          <Choice shuffleSeed={678}
            value={fn}
            onChange={setFn}
            options={[
              { id: 'a', label: 'Pomper de l’eau.' },
              { id: 'b', label: 'Débiter 60 m³/h à 6 bar (capacité catalogue).' },
              { id: 'c', label: 'Fournir au moins 40 m³/h d’eau à 78 °C sous 4 bar à la salle de brassage, sans fuite d’eau chaude.' },
              { id: 'd', label: 'Tourner sans vibrations.' },
            ]}
          />
        </Decision>
      )}
      {flow.index === 1 && (
        <Decision
          id="Q2-Q3 Défaillances & modes"
          title="Q2-Q3. Défaillances fonctionnelles et modes de défaillance"
          skills={['RCM', 'RELIABILITY']}
          prompt={<p>Sélectionnez d’abord les défaillances fonctionnelles, puis les modes de défaillance.</p>}
          check={() => {
            const ffOk = ['ff1', 'ff2', 'ff3'].every((x) => ff.includes(x)) && !ff.includes('ff4');
            const mOk = ['m1', 'm2', 'm3', 'm4'].every((x) => modes.includes(x)) && !modes.includes('m5') && !modes.includes('m6');
            if (ffOk && mOk) return { ok: true, why: 'Défaillances fonctionnelles = états (écart au standard). Modes = événements physiques plausibles qui les causent. « Pompe HS » n’est pas un mode (trop vague).' };
            return {
              ok: false,
              errorTag: 'mode-cause-confusion',
              consequence: 'Liste incomplète ou confuse : des modes réels ne seront couverts par aucune tâche, ou des tâches viseront des « modes » vagues.',
              question: '« Roulement usé » est-il un état de la fonction ou un événement sur un composant ? Et « Pompe HS » décrit-il un mécanisme ?',
              hints: ['Défaillance fonctionnelle : ne débite plus, débite trop peu, fuit.', 'Mode : composant + phénomène (ex. « garniture : usure des faces »). Le pressostat de protection compte aussi.'],
              method: 'Q2 = écarts au standard de performance (totaux et partiels) ; Q3 = causes raisonnablement probables de chaque écart, au niveau où l’on peut agir.',
            };
          }}
          onDone={flow.done}
        >
          <h4>Défaillances fonctionnelles</h4>
          <Choice shuffleSeed={477}
            multi
            value={ff}
            onChange={setFf}
            options={[
              { id: 'ff1', label: 'Ne débite plus du tout' },
              { id: 'ff2', label: 'Débite moins de 40 m³/h' },
              { id: 'ff3', label: 'Fuite d’eau chaude à l’extérieur' },
              { id: 'ff4', label: 'Roulement usé' },
            ]}
          />
          <h4 style={{ marginTop: 12 }}>Modes de défaillance</h4>
          <Choice shuffleSeed={335}
            multi
            value={modes}
            onChange={setModes}
            options={[
              { id: 'm1', label: 'Garniture mécanique : usure / marche à sec' },
              { id: 'm2', label: 'Roulement palier DE : écaillage (fatigue)' },
              { id: 'm3', label: 'Pressostat de manque d’eau : bloqué (ne protège plus)' },
              { id: 'm4', label: 'Roue : usure abrasive / érosion' },
              { id: 'm5', label: 'Pompe HS' },
              { id: 'm6', label: 'Erreur humaine' },
            ]}
          />
        </Decision>
      )}
      {flow.index === 2 && (
        <Decision
          id="Q4-Q5 Conséquences"
          title="Q4-Q5. Effets et catégorie de conséquence"
          skills={['RCM']}
          check={() => {
            const wrong = MODES.filter((m) => cq[m.id] !== m.conseq);
            if (!wrong.length) return { ok: true, why: 'La catégorie de conséquence dicte le critère de choix de la tâche : sécurité → risque tolérable ; opérationnelle/non opérationnelle → rentabilité ; cachée → disponibilité de la protection.' };
            const hiddenMiss = wrong.some((w) => w.id === 'pressostat');
            return {
              ok: false,
              errorTag: hiddenMiss ? 'hidden-failure' : 'rpn-only',
              consequence: hiddenMiss ? 'Le pressostat HS n’a aucun effet… jusqu’au jour où l’eau manque : la pompe tourne à sec, la garniture éclate, projection d’eau à 78 °C.' : 'Mauvaise catégorie : le critère de décision (sécurité vs économie) sera faux.',
              question: 'En fonctionnement normal, l’exploitant s’aperçoit-il que ce composant a défailli ? L’effet peut-il blesser quelqu’un ?',
              hints: ['Une protection qui ne sert que sur sollicitation = défaillance cachée.', 'Une fuite d’eau à 78 °C sous 4 bar peut brûler un opérateur.'],
              method: 'Arbre RCM : évident ? (non → caché) ; sécurité/environnement ? ; impact opérationnel ? (sinon non opérationnel).',
            };
          }}
          onDone={flow.done}
        >
          <div className="stack">
            {MODES.map((m) => (
              <label key={m.id} className="field">
                <span>
                  <b>{m.name}</b> — <span className="muted">{m.data}</span>
                </span>
                <select value={cq[m.id]} onChange={(e) => setCq({ ...cq, [m.id]: e.target.value as Conseq })}>
                  <option value="">— catégorie —</option>
                  {(Object.keys(CONSEQ_LABEL) as Conseq[]).map((c) => (
                    <option key={c} value={c}>
                      {CONSEQ_LABEL[c]}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
        </Decision>
      )}
      {flow.index === 3 && (
        <Decision
          id="Q6 Tâches"
          title="Q6. Quelle tâche proactive, à quelle fréquence ?"
          skills={['RCM', 'PREDICTIVE', 'ECONOMICS']}
          mentor={{ id: 'dirmaint', text: 'Le plan OEM dit 4 000 h pour tout. Pourquoi réinventer la roue ?' }}
          check={() => {
            const i = num(intRoul);
            const f = num(ffi);
            if (task.roulement === 'PM')
              return {
                ok: false,
                errorTag: 'oem-copy',
                consequence: 'Remplacer à 4 000 h un roulement dont η ≈ 8 000 h et dont la dégradation se voit 1 500 h à l’avance : vous jetez des roulements sains et créez des défaillances de montage.',
                question: 'La dégradation du roulement est-elle détectable ? Avec quel préavis ?',
                hints: ['P-F vibratoire ≈ 1 500 h.', 'Une tâche conditionnelle est préférable quand le P-F est exploitable et stable.'],
                method: 'Ordre de préférence RCM : conditionnel (si P-F exploitable) > restauration/remplacement systématique (si usure nette et âge prévisible) > recherche de défaillance (si caché) > aucune tâche/modification.',
              };
            if (task.roulement !== 'CBM' || !(i >= 300 && i <= 750))
              return {
                ok: false,
                errorTag: 'pf-too-long',
                consequence: task.roulement === 'CBM' ? `Intervalle ${i} h : ${i > 750 ? 'risque de rater la fenêtre P-F' : 'charge inutile pour le seul analyste vibratoire'}.` : 'Tâche inadaptée au roulement.',
                question: 'Combien d’inspections doivent tomber dans la fenêtre P-F pour détecter la dégradation avec une bonne probabilité ?',
                hints: ['Règle usuelle : intervalle ≤ P-F / 2.', 'P-F = 1 500 h → inspection toutes les 500 à 750 h (≈ mensuelle).'],
                method: 'Intervalle d’inspection = fraction du P-F (1/2 à 1/3), ajustée par la fiabilité de la technique et le coût.',
              };
            if (task.pressostat !== 'FFT' || !(f >= 250 && f <= 600))
              return {
                ok: false,
                errorTag: 'hidden-failure',
                consequence: task.pressostat !== 'FFT' ? 'Aucune tâche ne révèle la défaillance du pressostat : la pompe n’est plus protégée contre la marche à sec.' : `Intervalle de test ${f} h incohérent avec la disponibilité visée de la protection.`,
                question: 'Pour une disponibilité de la protection de 99 %, à quelle fréquence faut-il la tester ?',
                hints: ['Formule usuelle : FFI ≈ 2 × (1 − A_visée) × MTBF du dispositif.', 'FFI ≈ 2 × 0,01 × 20 000 h.'],
                method: 'Défaillance cachée → tâche de recherche de défaillance (test fonctionnel) à l’intervalle FFI = 2·U·MTBF (U = indisponibilité tolérée).',
              };
            if (task.garniture !== 'CBM')
              return {
                ok: false,
                errorTag: task.garniture === 'PM' ? 'oem-copy' : 'pm-on-random',
                consequence: task.garniture === 'PM' ? 'Remplacement à 4 000 h : 90 % des garnitures ont déjà fui avant (η ≈ 1 600 h dans le contexte actuel).' : 'Conséquence sécurité : on ne peut pas « laisser casser ».',
                question: 'Le suintement précède-t-il la fuite franche ? Avec quel préavis ?',
                hints: ['P-F ≈ 300 h : une ronde hebdomadaire (≈ 150 h) détecte le suintement.', 'Et la cause (désalignement) ? → Q7.'],
                method: 'Conséquence sécurité : la tâche doit ramener le risque à un niveau tolérable, sinon modification obligatoire.',
              };
            if (task.roue !== 'RTF' && task.roue !== 'CBM')
              return {
                ok: false,
                consequence: 'Tâche coûteuse sur une dégradation lente sans arrêt.',
                question: 'Une perte de débit de 5 % en 3 ans justifie-t-elle un remplacement périodique ?',
                hints: ['Conséquence non opérationnelle : la tâche doit coûter moins que la défaillance.'],
                method: 'Non opérationnel → tâche seulement si rentable.',
              };
            return { ok: true, why: 'Roulement : vibration mensuelle. Garniture : ronde de fuite hebdomadaire. Pressostat : test fonctionnel ~400 h. Roue : suivi de performance (ou aucune tâche). Aucune ligne du plan OEM n’a survécu telle quelle — parce que le contexte est différent.' };
          }}
          onDone={flow.done}
        >
          <div className="stack">
            {MODES.map((m) => (
              <label key={m.id} className="field">
                <span>
                  <b>{m.name}</b> — <span className="muted">{m.data}</span>
                </span>
                <select value={task[m.id]} onChange={(e) => setTask({ ...task, [m.id]: e.target.value as Task })}>
                  <option value="">— tâche —</option>
                  {(Object.keys(TASK_LABEL) as Task[]).filter((t) => t !== 'PDM').map((t) => (
                    <option key={t} value={t}>
                      {TASK_LABEL[t]}
                    </option>
                  ))}
                </select>
              </label>
            ))}
            <div className="grid-2">
              <NumberInput label="Intervalle d’inspection vibratoire roulement" suffix="h de marche" value={intRoul} onChange={setIntRoul} />
              <NumberInput label="Intervalle de test du pressostat (FFI)" suffix="h" value={ffi} onChange={setFfi} />
            </div>
          </div>
        </Decision>
      )}
      {flow.index === 4 && (
        <Decision
          id="Q7 Sans tâche adaptée"
          title="Q7. Garniture : et si l’inspection ne suffit pas ?"
          skills={['RCM', 'RELIABILITY']}
          prompt={<p>Avec le désalignement actuel, certaines garnitures passent du suintement à la projection en moins de 24 h. L’inspection hebdomadaire ne garantit pas un risque tolérable pour les opérateurs.</p>}
          mentor={{ id: 'mecano', text: 'Depuis qu’on ne fait plus l’alignement au laser, les garnitures tiennent trois mois.' }}
          check={() => {
            const ok = q7.includes('r1') && q7.includes('r2') && !q7.includes('r4');
            if (ok) return { ok: true, why: 'Conséquence sécurité sans tâche suffisante → modification obligatoire (protection anti-projection) ET élimination de la cause (alignement laser standardisé après chaque intervention).' };
            return {
              ok: false,
              errorTag: 'hidden-failure',
              consequence: q7.includes('r4') ? 'Accepter le risque de brûlure n’est pas une option RCM quand la conséquence est la sécurité.' : 'Le risque résiduel reste intolérable ou la cause reste active.',
              question: 'Quand aucune tâche proactive ne ramène le risque sécurité à un niveau tolérable, que dit la logique RCM ?',
              hints: ['Sécurité + pas de tâche efficace → redesign obligatoire.', 'Le mécanicien vous donne la cause…'],
              method: 'Q7 : conséquence sécurité/environnement → modification obligatoire ; opérationnelle → modification si rentable ; cachée → modification si le risque de défaillance multiple est intolérable.',
            };
          }}
          onDone={flow.done}
        >
          <Choice shuffleSeed={183}
            multi
            value={q7}
            onChange={setQ7}
            options={[
              { id: 'r1', label: 'Installer un capot anti-projection sur la garniture (modification)' },
              { id: 'r2', label: 'Standardiser l’alignement laser après chaque intervention (éliminer la cause)' },
              { id: 'r3', label: 'Passer l’inspection à toutes les heures' },
              { id: 'r4', label: 'Accepter le risque : les opérateurs connaissent le danger' },
            ]}
          />
        </Decision>
      )}
      {flow.index === 5 && (
        <Decision
          id="Gamme exécutable"
          title="Rédiger la tâche vibratoire exécutable"
          skills={['MAINTENANCE', 'PREDICTIVE', 'GMAO']}
          prompt={<p>« Vérifier la pompe » n’est pas une tâche. Complétez la gamme (pompe 45 kW, ISO 10816-3, groupe 2, massif rigide).</p>}
          check={() => {
            const n = num(gamme.normal),
              a = num(gamme.alert),
              c = num(gamme.crit);
            const filled = gamme.point.trim().length > 3 && gamme.cond && gamme.lock;
            if (!filled || !isFinite(n) || !isFinite(a) || !isFinite(c))
              return {
                ok: false,
                errorTag: 'vague-task',
                consequence: 'Le technicien ne sait ni où mesurer, ni dans quel état doit être la machine, ni quand alerter. Deux techniciens produiront deux mesures non comparables.',
                question: 'Qu’est-ce qu’un technicien qui n’a jamais vu cette pompe doit savoir pour réaliser la tâche et décider seul ?',
                hints: ['Point de mesure précis (palier, direction), condition machine, consignation, valeurs de référence.'],
                method: 'Tâche exécutable : quoi, où, comment, dans quel état, avec quoi, critère d’acceptation (normal / alerte / critique), action attendue.',
              };
            if (!(n < a && a < c) || a < 2.3 || a > 7.1 || c < 4.5 || c > 11.2)
              return {
                ok: false,
                errorTag: 'vague-task',
                consequence: 'Seuils incohérents : soit tout déclenche une alerte, soit la dégradation passe inaperçue.',
                question: 'Pour une machine de groupe 2 sur massif rigide, où se situent les limites de zones de la norme ?',
                hints: ['ISO 10816-3 groupe 2 rigide : A/B 1,4 mm/s ; B/C 2,8 mm/s ; C/D 4,5 mm/s.', 'Valeur normale < alerte < critique ; ajustez avec la référence propre à la machine.'],
                method: 'Seuils = norme + référence machine (mesure à neuf) ; alerte au changement significatif, critique à la limite de zone D.',
              };
            return { ok: true, why: 'Gamme mesurable, reproductible et décisionnelle. Chaque mesure alimentera la GMAO et la tendance vibratoire.' };
          }}
          onDone={flow.done}
        >
          <div className="grid-2">
            <label className="field">
              Point et direction de mesure
              <input type="text" value={gamme.point} onChange={(e) => setGamme({ ...gamme, point: e.target.value })} placeholder="ex. palier DE, radial horizontal" />
            </label>
            <label className="field">
              Condition machine
              <select value={gamme.cond} onChange={(e) => setGamme({ ...gamme, cond: e.target.value })}>
                <option value="">—</option>
                <option value="marche">En marche, régime nominal, 78 °C stabilisé</option>
                <option value="arret">À l’arrêt</option>
              </select>
            </label>
            <label className="field">
              Consignation
              <select value={gamme.lock} onChange={(e) => setGamme({ ...gamme, lock: e.target.value })}>
                <option value="">—</option>
                <option value="none">Aucune (mesure en marche, protections en place, zone chaude balisée)</option>
                <option value="loto">Consignation électrique complète</option>
              </select>
            </label>
            <NumberInput label="Valeur normale (référence)" suffix="mm/s RMS" value={gamme.normal} onChange={(v) => setGamme({ ...gamme, normal: v })} />
            <NumberInput label="Seuil d’alerte" suffix="mm/s" value={gamme.alert} onChange={(v) => setGamme({ ...gamme, alert: v })} />
            <NumberInput label="Seuil critique" suffix="mm/s" value={gamme.crit} onChange={(v) => setGamme({ ...gamme, crit: v })} />
          </div>
        </Decision>
      )}
      {flow.index === 6 && (
        <Decision
          id="Synthèse"
          title="Validation par la Direction Maintenance"
          skills={['COMMUNICATION', 'RCM']}
          prompt={<p>Le Directeur Maintenance vous demande : « Au final, qu’est-ce qu’on gagne par rapport au plan OEM ? » Choisissez la réponse la plus solide.</p>}
          check={() => ({ ok: true, why: 'Chaque tâche est justifiée par un mode, une conséquence et un critère de rentabilité ou de risque.' })}
          onDone={flow.done}
        >
          <ul className="small">
            <li>Roulement : 1 mesure vibratoire / mois au lieu d’un remplacement tous les 7 mois (roulements sains jetés, défauts de montage évités).</li>
            <li>Garniture : ronde hebdomadaire + alignement laser : suppression de la cause au lieu d’un remplacement inutile à 4 000 h.</li>
            <li>Pressostat : défaillance cachée enfin couverte (test ~ toutes les 400 h).</li>
            <li>Roue : pas de tâche coûteuse, suivi de performance.</li>
          </ul>
        </Decision>
      )}
    </div>
  );
}
