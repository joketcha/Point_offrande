import { useState } from 'react';
import { MENTORS } from '../data/mentors';
import type { MentorId } from '../engine/types';
import { Briefing, Choice, Debrief, Decision, NumberInput, Stepper, near, useSteps } from '../ui/Pedagogy';
import { type MissionProps, fmt, num, useFinish } from './common';

const LOSSES = 120; // M FCFA/an attribuables aux modes détectables
const EFF = 0.55;
const OPEX = 2;
const CAPEX = 35;
const GAIN = LOSSES * EFF - OPEX;
const PAYBACK = (CAPEX / GAIN) * 12;

const ARGS: { id: string; label: string; weights: Partial<Record<MentorId, number>> }[] = [
  { id: 'roi', label: `ROI chiffré : ${fmt(GAIN)} M FCFA/an de pertes évitées, retour en ${fmt(PAYBACK, 1)} mois`, weights: { daf: 3, dirind: 2 } },
  { id: 'risk', label: 'Risque HSE : détection précoce sur le compresseur NH3 (fuite, casse)', weights: { hse: 3, dirind: 1 } },
  { id: 'prereq', label: 'Prérequis assumés : qualité de données GMAO, analyste désigné, rituel quotidien de revue des alarmes', weights: { dirmaint: 3, daf: 1 } },
  { id: 'kpi', label: 'KPI de suivi : dégradations détectées, pannes évitées, pertes évitées, taux d’alarmes traitées', weights: { dirind: 2, daf: 1, prod: 1 } },
  { id: 'trend', label: '« C’est la tendance Industrie 4.0, tous nos concurrents le font »', weights: { daf: -2, dirind: -1 } },
  { id: 'prod', label: 'Moins d’arrêts non planifiés : les arrêts deviennent programmables aux changements de format', weights: { prod: 3 } },
  { id: 'tech', label: 'Fiche technique détaillée des capteurs (bande passante 10 kHz, MEMS triaxial)', weights: { daf: -1, prod: -1 } },
];
const COMMITTEE: MentorId[] = ['dirind', 'daf', 'prod', 'hse', 'dirmaint'];

export function ComiteMission({ meta, onExit }: MissionProps) {
  const flow = useSteps(3);
  const finish = useFinish(meta, onExit);
  const [gain, setGain] = useState('');
  const [pb, setPb] = useState('');
  const [args, setArgs] = useState<string[]>([]);
  const [o1, setO1] = useState<string[]>([]);
  const [o2, setO2] = useState<string[]>([]);

  if (flow.index === -1) return <Briefing meta={meta} onStart={flow.start} />;
  if (flow.finished) return <Debrief meta={meta} results={flow.results} onValidate={() => finish(flow.results)} />;

  const reaction = (m: MentorId) => args.reduce((a, id) => a + (ARGS.find((x) => x.id === id)!.weights[m] ?? 0), 0);

  return (
    <div>
      <Stepper total={3} index={flow.index} />
      {flow.index === 0 && (
        <Decision
          id="Business case"
          title="1. Construire le business case"
          skills={['ECONOMICS']}
          prompt={
            <p>
              Pertes annuelles dues aux modes détectables sur les 6 équipements visés : <b>{LOSSES} M FCFA</b>. Efficacité de détection attendue (retours groupe, données actuelles) : <b>{EFF * 100} %</b>. Investissement : <b>{CAPEX} M</b>. Exploitation : <b>{OPEX} M/an</b>.
            </p>
          }
          check={() => {
            if (near(num(gain), GAIN, 0.04) && near(num(pb), PAYBACK, 0.06)) return { ok: true, why: `Gain net ${fmt(GAIN)} M/an, retour sur investissement en ${fmt(PAYBACK, 1)} mois. Même avec une efficacité divisée par deux, le projet se paie en moins de 14 mois : c’est l’argument de robustesse.` };
            return {
              ok: false,
              errorTag: 'roi-missing',
              consequence: 'Le DAF vous interrompt à la deuxième diapositive : « Combien, et quand ? »',
              question: 'Quelle part des pertes le système évitera-t-il réellement, et que coûte-t-il chaque année ?',
              hints: ['Gain net = pertes × efficacité − coût d’exploitation.', 'Temps de retour (mois) = investissement / gain net × 12.'],
              method: 'Business case : gain annuel net, temps de retour, sensibilité (et si l’efficacité était moitié moindre ?).',
            };
          }}
          onDone={flow.done}
        >
          <div className="grid-2">
            <NumberInput label="Gain net annuel" suffix="M FCFA/an" value={gain} onChange={setGain} />
            <NumberInput label="Temps de retour" suffix="mois" value={pb} onChange={setPb} />
          </div>
        </Decision>
      )}
      {flow.index === 1 && (
        <Decision
          id="Argumentaire"
          title="2. Choisir 4 arguments (10 minutes de temps de parole)"
          skills={['COMMUNICATION', 'LEADERSHIP']}
          check={() => {
            const must = ['roi', 'risk', 'prereq', 'kpi'];
            const miss = must.filter((m) => !args.includes(m));
            if (args.length > 4) return { ok: false, consequence: 'Vous dépassez votre temps de parole. Le comité décroche.', question: 'Quels 4 arguments couvrent l’économie, le risque, la crédibilité et le suivi ?', hints: ['Un argument par membre clé du comité.'], method: 'Moins d’arguments, mieux choisis.' };
            if (!miss.length) return { ok: true, why: 'Économie (DAF), risque (HSE), crédibilité d’exécution (Maintenance) et pilotage (Direction industrielle) : chaque membre du comité trouve sa réponse.' };
            return {
              ok: false,
              errorTag: 'roi-missing',
              consequence: `Réactions du comité : ${COMMITTEE.map((m) => `${MENTORS[m].name.split(' ')[0]} ${reaction(m) > 1 ? '👍' : reaction(m) < 0 ? '👎' : '😐'}`).join(' · ')}. Le projet est ajourné.`,
              question: 'Qu’est-ce qui fera dire oui au DAF, à la HSE, et qu’est-ce qui prouve que le système sera vraiment utilisé ?',
              hints: ['Les deux projets « capteurs » précédents ont échoué faute d’exploitation des données.', 'Les arguments « tendance » ou « fiche technique » ne convainquent pas un comité de direction.'],
              method: 'Argumentaire de comité : bénéfice chiffré + risque couvert + conditions de réussite + indicateurs de suivi.',
            };
          }}
          onDone={flow.done}
        >
          <Choice multi value={args} onChange={setArgs} options={ARGS.map((a) => ({ id: a.id, label: a.label }))} />
          <div className="row small" style={{ marginTop: 8 }}>
            {COMMITTEE.map((m) => (
              <span key={m} className="pill">
                {MENTORS[m].name.split(' ')[0]} {reaction(m) > 1 ? '👍' : reaction(m) < 0 ? '👎' : '😐'}
              </span>
            ))}
          </div>
        </Decision>
      )}
      {flow.index === 2 && (
        <Decision
          id="Objections"
          title="3. Répondre aux objections"
          skills={['COMMUNICATION', 'LEADERSHIP', 'PROJECT']}
          check={() => {
            if (o1[0] === 'b' && o2[0] === 'c') return { ok: true, why: 'Un pilote avec critère go/no-go réduit le risque financier ; un processus d’exploitation clair rassure la Production. Le comité approuve.' };
            return {
              ok: false,
              errorTag: 'roi-missing',
              consequence: 'Votre réponse ne réduit pas le risque perçu. Le DAF propose de « revoir ça l’an prochain ».',
              question: 'Comment rendre la décision réversible et prouver l’usage réel du système ?',
              hints: ['Un pilote limité avec critères de succès mesurables.', 'Qui regarde les alarmes, quand, et que se passe-t-il ensuite ?'],
              method: 'Traiter une objection : reformuler le risque, proposer une mesure qui le réduit, s’engager sur un critère vérifiable.',
            };
          }}
          onDone={flow.done}
        >
          <h4>DAF : « Et si ça ne marche pas ? »</h4>
          <Choice
            value={o1}
            onChange={setO1}
            options={[
              { id: 'a', label: '« Ça marchera, c’est une technologie éprouvée. »' },
              { id: 'b', label: '« Pilote de 6 mois sur C-201 et SOU-L1 (12 M FCFA) ; go/no-go sur les dégradations confirmées et les pertes évitées. »' },
              { id: 'c', label: '« Le fournisseur nous garantit les résultats. »' },
            ]}
          />
          <h4 style={{ marginTop: 12 }}>Production : « Qui va regarder les alarmes ? »</h4>
          <Choice
            value={o2}
            onChange={setO2}
            options={[
              { id: 'a', label: '« Les alarmes arrivent par e-mail à tout le monde. »' },
              { id: 'b', label: '« L’équipe maintenance, quand elle a le temps. »' },
              { id: 'c', label: '« Un analyste désigné, revue quotidienne de 10 min, OT créé automatiquement dans la GMAO, arrêt planifié au prochain changement de format. »' },
            ]}
          />
        </Decision>
      )}
    </div>
  );
}
