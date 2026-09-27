import { useState } from 'react';
import { Briefing, Choice, Debrief, Decision, NumberInput, Stepper, near, useSteps } from '../ui/Pedagogy';
import { type MissionProps, fmt, num, useFinish } from './common';

type Flag = 'ok' | 'doublon' | 'cause' | 'pm' | 'duree' | 'dates' | 'equipement' | 'compteur' | 'vide';

const FLAG_LABEL: Record<Flag, string> = {
  ok: '✓ Valide',
  doublon: 'Doublon',
  cause: 'Cause non codée',
  pm: 'Préventif codé en panne',
  duree: 'Durée aberrante',
  dates: 'Dates incohérentes',
  equipement: 'Mauvais équipement',
  compteur: 'Compteur incohérent',
  vide: 'OT vide / non vérifiable',
};

interface Row {
  ot: string;
  eq: string;
  type: 'CM' | 'PM';
  start: string;
  end: string;
  desc: string;
  cause: string;
  dur: number | null;
  counter: number | null;
  truth: Flag;
  /** compte comme panne réelle de SOU-L1 après nettoyage */
  failure: boolean;
  /** durée corrigée (h) */
  fixedDur?: number;
}

const ROWS: Row[] = [
  { ot: 'OT-2301', eq: 'SOU-L1', type: 'CM', start: '12/01 08:10', end: '12/01 11:40', desc: 'Fuite vanne de remplissage n°14', cause: 'Usure joint', dur: 3.5, counter: 41820, truth: 'ok', failure: true },
  { ot: 'OT-2302', eq: 'SOU-L1', type: 'CM', start: '02/02 14:00', end: '02/02 15:00', desc: 'Sonde de niveau HS', cause: 'Encrassement', dur: 1.0, counter: 42310, truth: 'ok', failure: true },
  { ot: 'OT-2303', eq: 'SOU-L1', type: 'CM', start: '02/02 14:00', end: '02/02 15:00', desc: 'Sonde de niveau HS', cause: 'Encrassement', dur: 1.0, counter: 42310, truth: 'doublon', failure: false },
  { ot: 'OT-2304', eq: 'SOU-L1', type: 'CM', start: '19/02 22:30', end: '20/02 02:30', desc: 'Came de levage bruyante', cause: '« Réparé »', dur: 4.0, counter: 42560, truth: 'cause', failure: true },
  { ot: 'OT-2305', eq: 'SOU-L1', type: 'CM', start: '10/03 06:00', end: '10/03 12:00', desc: 'Remplacement kit vannes (arrêt programmé)', cause: '—', dur: 6.0, counter: 42990, truth: 'pm', failure: false },
  { ot: 'OT-2306', eq: 'SOU-L1', type: 'CM', start: '28/03 09:15', end: '28/03 11:15', desc: 'Casse bouteilles répétées — réglage étoile', cause: 'Déréglage', dur: 2.0, counter: 43420, truth: 'ok', failure: true },
  { ot: 'OT-2307', eq: 'SOU-L1', type: 'CM', start: '15/04 10:00', end: '15/04 11:35', desc: 'Remplacement sonde de niveau', cause: 'Encrassement', dur: 95, counter: 43900, truth: 'duree', failure: true, fixedDur: 95 / 60 },
  { ot: 'OT-2308', eq: 'SOU-L1', type: 'CM', start: '30/04 07:00', end: '29/04 10:00', desc: 'Fuite vanne de remplissage n°3', cause: 'Usure joint', dur: 3.0, counter: 44180, truth: 'dates', failure: true },
  { ot: 'OT-2309', eq: 'CONV-L1', type: 'CM', start: '22/05 13:00', end: '22/05 17:00', desc: 'Défaut moteur convoyeur de sortie', cause: 'Roulement', dur: 4.0, counter: 44600, truth: 'equipement', failure: false },
  { ot: 'OT-2310', eq: 'SOU-L1', type: 'CM', start: '07/06 03:20', end: '07/06 04:50', desc: 'Dérive sonde de niveau', cause: 'Encrassement', dur: 1.5, counter: 44950, truth: 'ok', failure: true },
  { ot: 'OT-2311', eq: 'SOU-L1', type: 'CM', start: '25/06 16:00', end: '25/06 19:00', desc: 'Fuite vanne de remplissage n°22', cause: 'Usure joint', dur: 3.0, counter: 43280, truth: 'compteur', failure: true },
  { ot: 'OT-2312', eq: 'SOU-L1', type: 'CM', start: '18/07 11:00', end: '18/07 16:00', desc: 'Came de levage : roulement de galet', cause: 'Fatigue', dur: 5.0, counter: 45720, truth: 'ok', failure: true },
  { ot: 'OT-2313', eq: 'SOU-L1', type: 'CM', start: '09/08 20:00', end: '09/08 21:00', desc: 'Sonde de niveau HS', cause: 'Humidité', dur: 1.0, counter: 46050, truth: 'ok', failure: true },
  { ot: 'OT-2314', eq: 'SOU-L1', type: 'CM', start: '31/08 23:59', end: '', desc: 'Divers', cause: '', dur: null, counter: null, truth: 'vide', failure: false },
  { ot: 'OT-2315', eq: 'SOU-L1', type: 'CM', start: '20/09 05:00', end: '20/09 11:00', desc: 'Fuites vannes multiples', cause: 'Usure joints', dur: 6.0, counter: 46700, truth: 'ok', failure: true },
  { ot: 'OT-2316', eq: 'SOU-L1', type: 'PM', start: '11/10 06:00', end: '11/10 07:00', desc: 'Graissage came et galets', cause: '—', dur: 1.0, counter: 47050, truth: 'ok', failure: false },
  { ot: 'OT-2317', eq: 'SOU-L1', type: 'CM', start: '02/11 12:10', end: '02/11 13:22', desc: 'Sonde de niveau HS', cause: 'Encrassement', dur: 1.2, counter: 47390, truth: 'ok', failure: true },
  { ot: 'OT-2318', eq: 'SOU-L1', type: 'CM', start: '05/12 08:00', end: '05/12 10:30', desc: 'Fuite vanne de remplissage n°9', cause: 'Usure joint', dur: 2.5, counter: 47760, truth: 'ok', failure: true },
];

const RUN_HOURS = 47950 - 41230; // compteur horaire 1er janvier → 31 décembre
const CAL_HOURS = 8760;
const FAILURES = ROWS.filter((r) => r.failure);
const TRUE_MTBF = RUN_HOURS / FAILURES.length;
const TRUE_MTTR = FAILURES.reduce((a, r) => a + (r.fixedDur ?? r.dur ?? 0), 0) / FAILURES.length;

export function GmaoMission({ meta, onExit }: MissionProps) {
  const flow = useSteps(4);
  const finish = useFinish(meta, onExit);
  const [flags, setFlags] = useState<Record<string, Flag>>(() => Object.fromEntries(ROWS.map((r) => [r.ot, 'ok'])));
  const [mtbf, setMtbf] = useState('');
  const [mttr, setMttr] = useState('');
  const [msg, setMsg] = useState<string[]>([]);

  if (flow.index === -1)
    return (
      <Briefing
        meta={meta}
        onStart={flow.start}
        extra={
          <div className="callout info small">
            Compteur horaire SOU-L1 : <b>41 230 h</b> au 1er janvier, <b>47 950 h</b> au 31 décembre. Année calendaire : 8 760 h.
          </div>
        }
      />
    );

  if (flow.finished) return <Debrief meta={meta} results={flow.results} onValidate={() => finish(flow.results)} />;

  const playerIncluded = ROWS.filter((r) => r.type === 'CM' && !['doublon', 'pm', 'equipement', 'vide'].includes(flags[r.ot]));

  return (
    <div>
      <Stepper total={4} index={flow.index} />
      {flow.index === 0 && (
        <Decision
          id="Qualité des OT"
          title="1. Auditer l’extraction GMAO"
          skills={['GMAO', 'DATA']}
          prompt={<p>Qualifiez chaque ordre de travail. Un OT peut être valide, ou présenter un défaut qui le rend inexploitable (ou à corriger) pour l’analyse de fiabilité.</p>}
          mentor={{ id: 'data', text: 'Ne supprime pas ce que tu peux corriger. Ne garde pas ce que tu ne peux pas vérifier.' }}
          check={() => {
            const missed = ROWS.filter((r) => r.truth !== 'ok' && flags[r.ot] === 'ok');
            const falsePos = ROWS.filter((r) => r.truth === 'ok' && flags[r.ot] !== 'ok');
            const wrongType = ROWS.filter((r) => r.truth !== 'ok' && flags[r.ot] !== 'ok' && flags[r.ot] !== r.truth);
            const naive = playerIncluded.length;
            const est = RUN_HOURS / Math.max(1, naive);
            if (missed.length === 0 && falsePos.length <= 1 && wrongType.length <= 1)
              return { ok: true, why: `Vous retenez ${FAILURES.length} pannes réelles sur ${ROWS.length} OT. ${wrongType.length + falsePos.length ? 'Une qualification reste discutable, mais sans impact majeur.' : ''} Les OT mal saisis de fin de mois (31/08 23:59) sont typiques d’une saisie « de mémoire ».` };
            return {
              ok: false,
              errorTag: 'data-not-cleaned',
              consequence: `Avec votre qualification, ${naive} pannes seraient comptées → MTBF ≈ ${fmt(est)} h au lieu d’environ ${fmt(TRUE_MTBF)} h. ${missed.length} défaut(s) non détecté(s)${falsePos.length ? `, ${falsePos.length} OT valide(s) rejeté(s)` : ''}. La Direction déciderait sur un chiffre faux.`,
              question: 'Pour chaque ligne, qu’est-ce qui prouve qu’elle représente UNE défaillance réelle de SOU-L1, avec une durée et un instant vérifiables ?',
              hints: [
                'Comparez les lignes du 02/02 entre elles.',
                'Un compteur horaire ne peut que croître : regardez la colonne compteur dans l’ordre chronologique.',
                '95 h pour remplacer une sonde ? Regardez les heures de début et de fin.',
                'Lisez la description ET le type : un arrêt programmé de remplacement est-il une panne ?',
              ],
              method: 'Contrôles systématiques : unicité (doublons), cohérence temporelle (fin > début, compteur croissant), appartenance (bon équipement), typologie (CM vs PM), complétude (cause, durée), plausibilité (durées aberrantes vs horodatage).',
              bestPractice: 'Une règle de qualité par colonne, un tableau de bord qualité de la donnée, et une correction à la source (saisie mobile en temps réel, listes de codes pannes fermées).',
            };
          }}
          onDone={flow.done}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>OT</th>
                  <th>Équip.</th>
                  <th>Type</th>
                  <th>Début</th>
                  <th>Fin</th>
                  <th>Description</th>
                  <th>Cause</th>
                  <th className="num">Durée (h)</th>
                  <th className="num">Compteur</th>
                  <th>Qualification</th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.ot} className={flags[r.ot] !== 'ok' ? 'flagged' : ''}>
                    <td className="num">{r.ot}</td>
                    <td>{r.eq}</td>
                    <td>{r.type}</td>
                    <td className="num">{r.start}</td>
                    <td className="num">{r.end || '—'}</td>
                    <td>{r.desc}</td>
                    <td>{r.cause || '—'}</td>
                    <td className="num">{r.dur ?? '—'}</td>
                    <td className="num">{r.counter ? fmt(r.counter) : '—'}</td>
                    <td>
                      <select value={flags[r.ot]} onChange={(e) => setFlags({ ...flags, [r.ot]: e.target.value as Flag })} style={{ minWidth: 170 }}>
                        {(Object.keys(FLAG_LABEL) as Flag[]).map((f) => (
                          <option key={f} value={f}>
                            {FLAG_LABEL[f]}
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
          id="Calcul MTBF"
          title="2. Calculer le MTBF réel"
          skills={['RELIABILITY', 'DATA']}
          prompt={
            <p>
              Données nettoyées : <b>{FAILURES.length} pannes</b> vérifiées sur SOU-L1 (les OT à corriger restent des pannes ; doublons, préventifs, autre équipement et OT vide sont exclus). Compteur : 41 230 h → 47 950 h. Calculez le MTBF.
            </p>
          }
          check={() => {
            const v = num(mtbf);
            if (near(v, TRUE_MTBF, 0.03)) return { ok: true, why: `MTBF = ${fmt(RUN_HOURS)} h de marche / ${FAILURES.length} pannes = ${fmt(TRUE_MTBF)} h. Le temps de référence est le temps de fonctionnement, pas le calendrier.` };
            const cal = near(v, CAL_HOURS / FAILURES.length, 0.03);
            return {
              ok: false,
              errorTag: cal ? 'calendar-vs-run' : 'mtbf-calc',
              consequence: cal
                ? `En utilisant les heures calendaires, vous surestimez le MTBF de ${fmt((CAL_HOURS / RUN_HOURS - 1) * 100)} %. Les fréquences de maintenance calées dessus seront trop espacées.`
                : `Avec ${fmt(v)} h, les intervalles de maintenance et les besoins en pièces seraient mal dimensionnés.`,
              question: 'Pendant combien d’heures la machine a-t-elle réellement été exposée au risque de panne ?',
              hints: ['Le compteur horaire mesure le temps de marche.', `Temps de marche = 47 950 − 41 230 = ${fmt(RUN_HOURS)} h.`],
              method: 'MTBF = temps de fonctionnement cumulé / nombre de défaillances.',
            };
          }}
          onDone={flow.done}
        >
          <NumberInput label="MTBF" suffix="h" value={mtbf} onChange={setMtbf} />
        </Decision>
      )}
      {flow.index === 2 && (
        <Decision
          id="Calcul MTTR"
          title="3. Calculer le MTTR"
          skills={['MAINTENANCE', 'DATA']}
          prompt={<p>Calculez le MTTR (durée moyenne de réparation) des {FAILURES.length} pannes retenues. Attention à la durée aberrante de l’OT-2307 : corrigez-la à partir de l’horodatage.</p>}
          check={() => {
            const v = num(mttr);
            if (near(v, TRUE_MTTR, 0.05)) return { ok: true, why: `MTTR ≈ ${fmt(TRUE_MTTR, 2)} h. L’OT-2307 durait 1 h 35 (95 minutes saisies dans un champ en heures) : sans correction, le MTTR aurait été ≈ ${fmt((TRUE_MTTR * FAILURES.length - 95 / 60 + 95) / FAILURES.length, 1)} h.` };
            const raw = (TRUE_MTTR * FAILURES.length - 95 / 60 + 95) / FAILURES.length;
            return {
              ok: false,
              errorTag: near(v, raw, 0.05) ? 'data-not-cleaned' : 'mtbf-calc',
              consequence: near(v, raw, 0.05) ? 'La valeur de 95 h fait exploser le MTTR : vous lanceriez un plan de réduction du temps de réparation sur un problème qui n’existe pas.' : 'Votre MTTR ne correspond pas aux données retenues.',
              question: 'Une durée de 95 h est-elle cohérente avec un début à 10:00 et une fin à 11:35 le même jour ?',
              hints: ['95 minutes = 1,58 h.', 'Additionnez les durées des 13 pannes retenues, puis divisez par 13.'],
              method: 'MTTR = Σ durées de réparation / nombre de réparations, sur données plausibilisées.',
            };
          }}
          onDone={flow.done}
        >
          <NumberInput label="MTTR" suffix="h" value={mttr} onChange={setMttr} />
        </Decision>
      )}
      {flow.index === 3 && (
        <Decision
          id="Message Direction"
          title="4. Vendredi : que dites-vous à la Direction ?"
          skills={['COMMUNICATION', 'GMAO']}
          check={() => {
            if (msg[0] === 'b') return { ok: true, why: 'Un chiffre, son périmètre, sa fiabilité et le plan pour l’améliorer : c’est ce qui construit la crédibilité d’un fiabiliste.' };
            return {
              ok: false,
              errorTag: msg[0] === 'd' ? 'data-not-cleaned' : 'kpi-isolated',
              consequence:
                msg[0] === 'a'
                  ? 'Le chiffre est repris dans le reporting groupe sans ses limites. Dans 3 mois, un autre calcul donnera un résultat différent et votre crédibilité sera en jeu.'
                  : msg[0] === 'c'
                    ? 'La Direction décide sans vous. Refuser de donner un chiffre, c’est laisser la décision à l’intuition.'
                    : 'Vous présentez un chiffre que vous savez faux.',
              question: 'Qu’est-ce qui permettrait à la Direction d’utiliser ce chiffre en connaissance de cause, et de faire confiance au prochain ?',
              hints: ['Un indicateur sans périmètre ni niveau de confiance est une opinion chiffrée.'],
              method: 'Communiquer : valeur + périmètre + qualité de la donnée + limites + action d’amélioration.',
            };
          }}
          onDone={flow.done}
        >
          <Choice shuffleSeed={466}
            value={msg}
            onChange={setMsg}
            options={[
              { id: 'a', label: `« Le MTBF de la soutireuse est de ${fmt(TRUE_MTBF)} h. »` },
              { id: 'b', label: `« MTBF ≈ ${fmt(TRUE_MTBF)} h sur 13 pannes vérifiées (18 OT extraits : 4 inexploitables, 1 préventif, 4 à corriger). La donnée est fragile : je propose une codification des pannes et une saisie en temps réel pour fiabiliser le chiffre d’ici 3 mois. »` },
              { id: 'c', label: '« Les données sont trop mauvaises, je ne peux rien calculer avant 6 mois. »' },
              { id: 'd', label: `« MTBF = ${fmt(RUN_HOURS / 17)} h (17 OT correctifs dans l’extraction). »` },
            ]}
          />
        </Decision>
      )}
    </div>
  );
}
