import { useState } from 'react';
import { Briefing, Choice, Debrief, Decision, Stepper, useSteps } from '../ui/Pedagogy';
import { type MissionProps, useFinish } from './common';

const BUDGET = 24;
const EVIDENCE = [
  { id: 'E1', label: 'Expertise du roulement déposé', cost: 4, result: 'Écaillage sur la piste extérieure, graisse noire et durcie, aspect de lubrification insuffisante. Pas de fissure de montage, pas de marque de brinelling.', key: true },
  { id: 'E2', label: 'Historique GMAO 12 mois', cost: 2, result: '4 remplacements du roulement, cause codée « roulement défectueux ». Aucun OT de graissage depuis la réorganisation des gammes en mars.', key: true },
  { id: 'E3', label: 'Spectre vibratoire (dernier relevé)', cost: 3, result: 'Fréquences de défaut de bague extérieure (BPFO) + bruit haute fréquence typique d’un défaut de lubrification. Pas de 1× ni 2× élevés : ni balourd ni désalignement significatif.', key: false },
  { id: 'E4', label: 'Registre magasin des graisses', cost: 2, result: 'Deux graisses sous le même code article : lithium (spécifiée OEM) et polyurée (achetée en 2024 comme « équivalent moins cher »). Elles sont incompatibles entre elles.', key: true },
  { id: 'E5', label: 'Entretien avec le technicien de nuit', cost: 2, result: '« On graisse quand on a le temps. Il n’y a pas de quantité définie. On prend la pompe qui est là. »', key: true },
  { id: 'E6', label: 'Contrôle d’alignement laser', cost: 4, result: 'Alignement moteur/réducteur dans les tolérances.', key: false },
  { id: 'E7', label: 'Mesure du courant moteur (charge)', cost: 2, result: 'Courant à 78 % du nominal : pas de surcharge.', key: false },
  { id: 'E8', label: 'Audit de la procédure de montage', cost: 3, result: 'Montage par chauffage à induction, conforme ; outillage disponible.', key: false },
  { id: 'E9', label: 'Contrôle de la référence du roulement monté', cost: 1, result: '6310-2RS (étanche, graissé à vie, non regraissable) monté au lieu du 6310 C3 spécifié : le magasin a sorti le doublon article.', key: true },
  { id: 'E10', label: 'Environnement du motoréducteur', cost: 2, result: 'Lavage haute pression quotidien de la zone : projections d’eau sur le palier.', key: false },
];

const WHYS = [
  {
    q: 'Pourquoi le roulement a-t-il cassé ?',
    options: [
      { id: 'a', label: 'Roulement défectueux (qualité fournisseur)', bad: 'false-root-cause' },
      { id: 'b', label: 'Fatigue de surface prématurée par lubrification inadaptée', ok: true },
      { id: 'c', label: 'Désalignement moteur/réducteur', bad: 'false-root-cause' },
      { id: 'd', label: 'Surcharge du convoyeur', bad: 'false-root-cause' },
    ],
  },
  {
    q: 'Pourquoi la lubrification était-elle inadaptée ?',
    options: [
      { id: 'a', label: 'Le technicien de nuit est négligent', bad: 'blame-person' },
      { id: 'b', label: 'Graisses incompatibles mélangées, roulement non regraissable monté, aucune quantité ni fréquence définies', ok: true },
      { id: 'c', label: 'Le climat est trop chaud', bad: 'false-root-cause' },
    ],
  },
  {
    q: 'Pourquoi une mauvaise graisse et une mauvaise référence ont-elles été utilisées ?',
    options: [
      { id: 'a', label: 'Le magasinier s’est trompé', bad: 'blame-person' },
      { id: 'b', label: 'Doublons d’articles dans la GMAO et achat « équivalent » sans validation technique', ok: true },
      { id: 'c', label: 'Le fournisseur a livré la mauvaise pièce', bad: 'false-root-cause' },
    ],
  },
  {
    q: 'Pourquoi n’existe-t-il plus de standard de graissage ?',
    options: [
      { id: 'a', label: 'Les gammes de lubrification ont été supprimées lors de la réorganisation de mars, sans analyse de risque (pas de gestion du changement)', ok: true },
      { id: 'b', label: 'Personne ne veut graisser', bad: 'blame-person' },
      { id: 'c', label: 'On manque de budget', bad: 'false-root-cause' },
    ],
  },
];

const M6 = ['Matière', 'Méthode', 'Main-d’œuvre', 'Milieu', 'Moyens', 'Management'] as const;
const FACTS = [
  { id: 'f1', text: 'Graisse polyurée incompatible en magasin', ok: ['Matière'] },
  { id: 'f2', text: 'Aucune quantité ni fréquence de graissage définies', ok: ['Méthode'] },
  { id: 'f3', text: 'Techniciens non formés à la lubrification', ok: ['Main-d’œuvre'] },
  { id: 'f4', text: 'Projections d’eau du lavage haute pression', ok: ['Milieu'] },
  { id: 'f5', text: 'Roulement 2RS monté à la place du C3 (doublon article)', ok: ['Matière', 'Moyens'] },
  { id: 'f6', text: 'Suppression des gammes sans analyse de risque', ok: ['Management', 'Méthode'] },
];

const ACTIONS = [
  { id: 'a1', label: 'Standard de graissage (point, graisse, quantité en g, fréquence) intégré aux gammes GMAO', good: true },
  { id: 'a2', label: 'Purge de la graisse polyurée, un seul code article, graisseurs étiquetés par couleur', good: true },
  { id: 'a3', label: 'Remplacer les 6310-2RS montés par des 6310 C3 et fusionner les doublons articles', good: true },
  { id: 'a4', label: 'Capot de protection contre les projections du lavage', good: true },
  { id: 'a5', label: 'Vérification d’efficacité : suivi du MTBF roulement M-305 sur 6 mois (objectif > 5 000 h) et revue REX', good: true, verif: true },
  { id: 'a6', label: 'Procédure de gestion du changement pour toute suppression de gamme', good: true },
  { id: 'a7', label: 'Remplacer le technicien de nuit', good: false },
  { id: 'a8', label: 'Changer de fournisseur de roulements', good: false },
  { id: 'a9', label: 'Remplacement préventif du roulement tous les mois', good: false },
];

export function RcaMission({ meta, onExit }: MissionProps) {
  const flow = useSteps(4);
  const finish = useFinish(meta, onExit);
  const [collected, setCollected] = useState<string[]>([]);
  const [whys, setWhys] = useState<string[][]>(WHYS.map(() => []));
  const [bones, setBones] = useState<Record<string, string>>({});
  const [acts, setActs] = useState<string[]>([]);
  const spent = collected.reduce((a, id) => a + EVIDENCE.find((e) => e.id === id)!.cost, 0);

  if (flow.index === -1) return <Briefing meta={meta} onStart={flow.start} />;
  if (flow.finished) return <Debrief meta={meta} results={flow.results} onValidate={() => finish(flow.results)} />;

  const evidencePanel = collected.length > 0 && flow.index > 0 && (
    <div className="card">
      <h3>Dossier de preuves</h3>
      {EVIDENCE.filter((e) => collected.includes(e.id)).map((e) => (
        <div key={e.id} className="small" style={{ marginBottom: 6 }}>
          <b>{e.label} :</b> {e.result}
        </div>
      ))}
    </div>
  );

  return (
    <div>
      <Stepper total={4} index={flow.index} />
      {flow.index === 0 && (
        <Decision
          id="Collecte de preuves"
          title="1. Enquête : quelles preuves collecter ?"
          skills={['RCA', 'DATA']}
          prompt={
            <p>
              Budget d’investigation : <b>{BUDGET} h-homme</b>. Utilisé : <b className="num">{spent} h</b>. Cliquez sur une preuve pour la collecter (le résultat s’affiche).
            </p>
          }
          mentor={{ id: 'mecano', text: 'Regarde la graisse. Regarde la couleur.' }}
          check={() => {
            const need = ['E1', 'E4', 'E9'];
            const miss = need.filter((x) => !collected.includes(x));
            const context = collected.includes('E2') || collected.includes('E5');
            if (spent > BUDGET)
              return { ok: false, consequence: 'Budget dépassé : Production fait intervenir un sous-traitant qui change le roulement… et l’enquête s’arrête.', question: 'Quelles preuves sont physiques et discriminantes, lesquelles ne font que confirmer ce qu’on sait ?', hints: ['Commencez par la pièce elle-même (expertise).'], method: 'Prioriser les preuves qui discriminent entre hypothèses.' };
            if (!miss.length && context) return { ok: true, why: `Dossier solide en ${spent} h : la pièce (E1), la matière (E4, E9) et le contexte (historique/témoignage). ${collected.includes('E6') || collected.includes('E7') ? 'Les contrôles alignement/charge écartent des hypothèses : utile, mais coûteux.' : ''}` };
            return {
              ok: false,
              errorTag: 'false-root-cause',
              consequence: 'Sans ces preuves, l’équipe conclura encore « roulement défectueux » et la 5e casse arrivera dans 5 semaines.',
              question: 'Qu’est-ce que la pièce cassée elle-même peut vous dire ? Et le magasin ?',
              hints: ['La pièce déposée est la première preuve.', 'Que contient réellement le magasin sous les codes « graisse » et « roulement 6310 » ?'],
              method: 'Préserver et expertiser la pièce, reconstituer la chronologie (GMAO), vérifier la conformité matière (références, lubrifiants), écouter le terrain.',
            };
          }}
          onDone={flow.done}
        >
          <div className="grid-2">
            {EVIDENCE.map((e) => {
              const on = collected.includes(e.id);
              return (
                <button key={e.id} type="button" className={`option ${on ? 'chosen' : ''}`} onClick={() => setCollected(on ? collected.filter((x) => x !== e.id) : [...collected, e.id])}>
                  <span>
                    <b>{e.label}</b> <span className="pill">{e.cost} h</span>
                    {on && <div className="sub">{e.result}</div>}
                  </span>
                </button>
              );
            })}
          </div>
        </Decision>
      )}
      {evidencePanel}
      {flow.index === 1 && (
        <Decision
          id="5 Pourquoi"
          title="2. Chaîne des 5 Pourquoi"
          skills={['RCA', 'LEADERSHIP']}
          prompt={<p>Chaque niveau doit être prouvé par le dossier. Arrêtez-vous sur une cause systémique sur laquelle l’organisation peut agir.</p>}
          mentor={{ id: 'prod', text: 'C’est le technicien de nuit qui monte mal. Changez-le.' }}
          check={() => {
            for (let i = 0; i < WHYS.length; i++) {
              const sel = WHYS[i].options.find((o) => o.id === whys[i][0]);
              if (!sel || !sel.ok) {
                const tag = (sel as { bad?: string } | undefined)?.bad ?? 'false-root-cause';
                return {
                  ok: false,
                  errorTag: tag,
                  consequence:
                    tag === 'blame-person'
                      ? 'Une personne est sanctionnée. La prochaine anomalie ne sera plus signalée. Le système reste intact : la casse revient.'
                      : `Niveau ${i + 1} : cette réponse est contredite par le dossier de preuves (ou n’explique rien). L’action qui en découle ne changera rien.`,
                  question: `« ${WHYS[i].q} » — Quelle preuve du dossier soutient votre réponse ?`,
                  hints: ['Le spectre ne montre ni 1× ni 2× : ni balourd ni désalignement.', 'Si une personne s’est trompée, demandez pourquoi le système l’a permis.'],
                  method: '5 Pourquoi : chaque « parce que » doit être un fait vérifié ; on remonte jusqu’à une cause de système (méthode, organisation, gestion du changement), jamais jusqu’à une personne.',
                  bestPractice: 'Une cause racine valide passe le test : « si on la supprime, le problème ne peut plus se reproduire ».',
                };
              }
            }
            return { ok: true, why: 'Casse roulement = symptôme. Causes racines : absence de gestion du changement (gammes supprimées) et gouvernance des données articles (doublons, achats « équivalents »).' };
          }}
          onDone={flow.done}
        >
          <div className="stack">
            <div className="small muted">Problème : la ligne 1 s’arrête → le roulement du motoréducteur M-305 casse (4e fois en 5 mois).</div>
            {WHYS.map((w, i) => (
              <div key={i}>
                <h4>
                  Pourquoi n°{i + 1} : {w.q}
                </h4>
                <Choice shuffleSeed={546} value={whys[i]} onChange={(v) => setWhys(whys.map((x, j) => (j === i ? v : x)))} options={w.options.map((o) => ({ id: o.id, label: o.label }))} />
              </div>
            ))}
          </div>
        </Decision>
      )}
      {flow.index === 2 && (
        <Decision
          id="Ishikawa"
          title="3. Diagramme d’Ishikawa (6M)"
          skills={['RCA']}
          check={() => {
            const wrong = FACTS.filter((f) => !f.ok.includes(bones[f.id] ?? ''));
            if (!wrong.length) return { ok: true, why: 'Les causes contributives touchent 5 familles : une seule action ne suffira pas.' };
            return {
              ok: false,
              consequence: 'Un Ishikawa mal classé fait oublier des familles de causes entières.',
              question: `« ${wrong[0].text} » : s’agit-il d’un produit, d’une façon de faire, d’une compétence, d’un environnement, d’un équipement ou d’une décision d’organisation ?`,
              hints: ['Matière = produits et pièces ; Méthode = modes opératoires ; Milieu = environnement ; Management = organisation, décisions.'],
              method: '6M : Matière, Méthode, Main-d’œuvre, Milieu, Moyens (machines/outils), Management (ou Mesure).',
            };
          }}
          onDone={flow.done}
        >
          <div className="stack">
            {FACTS.map((f) => (
              <label key={f.id} className="field">
                {f.text}
                <select value={bones[f.id] ?? ''} onChange={(e) => setBones({ ...bones, [f.id]: e.target.value })}>
                  <option value="">— famille —</option>
                  {M6.map((m) => (
                    <option key={m}>{m}</option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="ishikawa" style={{ marginTop: 12 }}>
            {M6.map((m) => (
              <div key={m} className="bone">
                <b>{m}</b>
                {FACTS.filter((f) => bones[f.id] === m).map((f) => (
                  <div key={f.id}>• {f.text}</div>
                ))}
              </div>
            ))}
          </div>
        </Decision>
      )}
      {flow.index === 3 && (
        <Decision
          id="Plan d’actions"
          title="4. Plan d’actions et vérification d’efficacité"
          skills={['RCA', 'PROJECT', 'MAINTENANCE']}
          check={() => {
            const bad = acts.filter((a) => !ACTIONS.find((x) => x.id === a)!.good);
            const coreMissing = ['a1', 'a2', 'a3'].filter((a) => !acts.includes(a));
            const verif = acts.includes('a5');
            if (!bad.length && !coreMissing.length && verif) return { ok: true, why: 'Actions sur les causes racines + vérification mesurable. La RCA sera close quand le MTBF aura réellement progressé (visible dans l’écran REX).' };
            return {
              ok: false,
              errorTag: !verif ? 'no-verification' : bad.includes('a7') ? 'blame-person' : 'false-root-cause',
              consequence: bad.length ? 'Ces actions traitent le symptôme ou une personne : la casse reviendra.' : !verif ? 'Sans vérification, personne ne saura si les actions ont fonctionné : la RCA est « close » sur le papier seulement.' : 'Une cause racine reste sans action.',
              question: 'Chaque cause racine a-t-elle son action ? Et comment prouverez-vous dans 6 mois que c’est réglé ?',
              hints: ['Graissage, graisse, référence roulement : trois actions distinctes.', 'Une action sans indicateur de vérification n’est pas une action RCA.'],
              method: 'Plan d’actions RCA : une action par cause racine, un responsable, une échéance, un critère de vérification d’efficacité.',
            };
          }}
          onDone={flow.done}
        >
          <Choice shuffleSeed={201} multi value={acts} onChange={setActs} options={ACTIONS.map((a) => ({ id: a.id, label: a.label }))} />
        </Decision>
      )}
    </div>
  );
}
