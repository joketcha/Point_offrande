import { useMemo, useState } from 'react';
import { Rng, hashSeed } from '../engine/rng';
import { useGameState } from '../store/game';
import { Briefing, Choice, Debrief, Decision, NumberInput, Stepper, near, useSteps } from '../ui/Pedagogy';
import { type MissionProps, fmt, num, useFinish } from './common';

type FaultId = 'balourd' | 'desalignement' | 'roulement' | 'lubrification' | 'desserrage';

interface Fault {
  id: FaultId;
  name: string;
  bands: Record<string, number>; // amplitude mm/s par ordre
  hfNote: string;
  confirm: string[]; // techniques de confirmation acceptables
  oil: { fer: number; visc: string };
  thermoDelta: number; // °C au-dessus de l'ambiant palier/accouplement
  why: string;
}

const ORDERS = ['0,5×', '1×', '2×', '3×', '4×', 'HF (kHz)'];

const FAULTS: Fault[] = [
  { id: 'balourd', name: 'Balourd', bands: { '0,5×': 0.2, '1×': 5.6, '2×': 0.8, '3×': 0.3, '4×': 0.2, 'HF (kHz)': 0.4 }, hfNote: 'Pas de contenu haute fréquence notable.', confirm: ['phase'], oil: { fer: 8, visc: 'conforme' }, thermoDelta: 6, why: 'Un pic 1× radial dominant, sans harmoniques ni HF, signe un balourd. La mesure de phase (1× en phase sur les deux paliers) le confirme.' },
  { id: 'desalignement', name: 'Désalignement', bands: { '0,5×': 0.2, '1×': 3.1, '2×': 4.6, '3×': 1.5, '4×': 0.5, 'HF (kHz)': 0.6 }, hfNote: 'Pas de contenu haute fréquence notable.', confirm: ['thermo', 'phase'], oil: { fer: 12, visc: 'conforme' }, thermoDelta: 24, why: 'Un 2× supérieur ou égal au 1×, avec composante axiale, signe un désalignement. L’accouplement anormalement chaud (thermographie) le confirme.' },
  { id: 'roulement', name: 'Dégradation de roulement', bands: { '0,5×': 0.3, '1×': 1.2, '2×': 0.9, '3×': 0.6, '4×': 0.4, 'HF (kHz)': 5.0 }, hfNote: 'Pics non synchrones (BPFO) avec bandes latérales à ±1× dans la zone haute fréquence.', confirm: ['ultrasons', 'huile'], oil: { fer: 95, visc: 'conforme' }, thermoDelta: 14, why: 'Des pics haute fréquence non synchrones avec bandes latérales = défaut de roulement. Le fer élevé dans l’huile (écaillage) et les ultrasons le confirment.' },
  { id: 'lubrification', name: 'Défaut de lubrification', bands: { '0,5×': 0.2, '1×': 1.0, '2×': 0.6, '3×': 0.4, '4×': 0.3, 'HF (kHz)': 3.6 }, hfNote: 'Élévation large bande en haute fréquence, sans pic net.', confirm: ['huile', 'thermo'], oil: { fer: 22, visc: 'hors spec (chute de viscosité)' }, thermoDelta: 20, why: 'Une élévation HF large bande sans pic synchrone évoque un défaut de film d’huile. La viscosité hors spec et l’échauffement du palier le confirment.' },
  { id: 'desserrage', name: 'Desserrage mécanique', bands: { '0,5×': 1.8, '1×': 3.5, '2×': 2.8, '3×': 2.2, '4×': 1.6, 'HF (kHz)': 0.8 }, hfNote: 'Pas de contenu haute fréquence notable.', confirm: ['phase'], oil: { fer: 10, visc: 'conforme' }, thermoDelta: 8, why: 'Une série d’harmoniques 1×, 2×, 3×, 4× avec un sous-harmonique 0,5× trahit un desserrage (jeu). La phase instable le confirme.' },
];

const CONFIRM_OPTS = [
  { id: 'phase', label: 'Mesure de phase vibratoire' },
  { id: 'thermo', label: 'Thermographie (palier / accouplement)' },
  { id: 'huile', label: 'Analyse d’huile' },
  { id: 'ultrasons', label: 'Ultrasons (défaut de roulement)' },
];

const F_THRESHOLD = 7.1; // mm/s RMS — limite fonctionnelle (zone D, ISO 10816-3 gr.2)
const EQUIPS = [
  { tag: 'C-201', name: 'Compresseur frigorifique NH3', part: 'roulements/clapets', leadDays: 90 },
  { tag: 'P-101', name: 'Pompe eau de brassage', part: 'roulement/garniture', leadDays: 30 },
  { tag: 'AC-401', name: 'Compresseur d’air à vis', part: 'bloc vis', leadDays: 60 },
];

export function DiagnosticMission({ meta, onExit }: MissionProps) {
  const { game } = useGameState();
  const flow = useSteps(4);
  const finish = useFinish(meta, onExit);
  const attempt = game.player.attempts[meta.id] ?? 0;

  const scenario = useMemo(() => {
    const rng = new Rng(hashSeed(`diag|${game.plant.seed}|${attempt}`));
    const fault = rng.pick(FAULTS);
    const eq = rng.pick(EQUIPS);
    const noise = (v: number) => Math.max(0.1, +(v * rng.uniform(0.9, 1.12)).toFixed(2));
    const bands = Object.fromEntries(ORDERS.map((o) => [o, noise(fault.bands[o])]));
    // RMS global cohérent avec l'énergie du spectre
    const v2 = +Math.sqrt(Object.values(bands).reduce((a, b) => a + b * b, 0)).toFixed(2);
    const k = rng.uniform(0.0006, 0.0016); // taux de croissance /h de marche
    const dt = rng.int(500, 750); // heures entre les deux relevés
    const v1 = +(v2 / Math.exp(k * dt)).toFixed(2);
    const leadHours = eq.leadDays * 24;
    const rulTrue = Math.log(F_THRESHOLD / v2) / k; // heures de marche jusqu'à F
    return { fault, eq, bands, v1, v2, k, dt, leadHours, rulTrue };
  }, [game.plant.seed, attempt, meta.id]);

  const [diag, setDiag] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<string[]>([]);
  const [rul, setRul] = useState('');
  const [decision, setDecision] = useState<string[]>([]);

  if (flow.index === -1)
    return (
      <Briefing
        meta={meta}
        onStart={flow.start}
        extra={
          <div className="callout info small">
            Équipement analysé : <b>{scenario.eq.tag} — {scenario.eq.name}</b>. Limite fonctionnelle F = {F_THRESHOLD} mm/s RMS. Chaque tentative génère un cas différent.
          </div>
        }
      />
    );
  if (flow.finished) return <Debrief meta={meta} results={flow.results} onValidate={() => finish(flow.results)} />;

  const maxBand = Math.max(...Object.values(scenario.bands));
  const rulDays = scenario.rulTrue / 24;
  const leadDaysNet = scenario.eq.leadDays;

  return (
    <div>
      <Stepper total={4} index={flow.index} />
      <div className="card">
        <h3>Spectre vibratoire — {scenario.eq.tag} (palier DE, radial, mm/s RMS)</h3>
        <div className="stack" style={{ gap: 6 }}>
          {ORDERS.map((o) => (
            <div key={o}>
              <div className="row between small">
                <span>{o}</span>
                <span className="num text-2">{fmt(scenario.bands[o], 2)} mm/s</span>
              </div>
              <div className="meter" style={{ height: 12 }}>
                <div style={{ width: `${(scenario.bands[o] / maxBand) * 100}%`, background: o === 'HF (kHz)' ? 'var(--s2)' : 'var(--s1)' }} />
              </div>
            </div>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>{scenario.fault.hfNote}</p>
        <div className="grid-2">
          <div className="callout small">
            <b>Analyse d’huile :</b> fer {scenario.fault.oil.fer} ppm (seuil 60), viscosité {scenario.fault.oil.visc}.
          </div>
          <div className="callout small">
            <b>Thermographie :</b> palier / accouplement à +{scenario.fault.thermoDelta} °C au-dessus de l’ambiant (alerte &gt; +15 °C).
          </div>
        </div>
      </div>

      {flow.index === 0 && (
        <Decision
          id="Identifier le défaut"
          title="1. Quel est le défaut dominant ?"
          skills={['PREDICTIVE', 'DATA']}
          mentor={{ id: 'mecano', text: 'Regarde où est l’énergie : sur le 1×, sur le 2×, ou tout en haut du spectre ?' }}
          check={() => {
            if (diag[0] === scenario.fault.id) return { ok: true, why: scenario.fault.why };
            return {
              ok: false,
              errorTag: 'signature-misread',
              consequence: `Un diagnostic erroné (${FAULTS.find((f) => f.id === diag[0])?.name ?? '—'}) conduit à la mauvaise intervention : équilibrer une machine dont le roulement est mort ne change rien.`,
              question: 'Où se concentre l’énergie du spectre : un pic 1× seul, un 2× marqué, une forêt d’harmoniques, ou de la haute fréquence ?',
              hints: [
                '1× seul dominant → balourd. 2× ≥ 1× → désalignement.',
                'Harmoniques 1×,2×,3×,4× (+0,5×) → desserrage. HF avec pics non synchrones → roulement. HF large bande sans pic → lubrification.',
                `Ici, la bande la plus forte est ${ORDERS.reduce((a, o) => (scenario.bands[o] > scenario.bands[a] ? o : a), ORDERS[0])}.`,
              ],
              method: 'Signature vibratoire : localiser l’énergie dominante (ordre synchrone vs haute fréquence) puis recouper avec la forme (pic net vs large bande, harmoniques, bandes latérales).',
            };
          }}
          onDone={flow.done}
        >
          <Choice value={diag} onChange={setDiag} shuffleSeed={scenario.v2} options={FAULTS.map((f) => ({ id: f.id, label: f.name }))} />
        </Decision>
      )}
      {flow.index === 1 && (
        <Decision
          id="Confirmer"
          title="2. Confirmer par une seconde technique"
          skills={['PREDICTIVE', 'RELIABILITY']}
          prompt={<p>Le diagnostic vibratoire seul reste une hypothèse. Quelle technique la confirme le mieux ici ?</p>}
          mentor={{ id: 'data', text: 'Un seul capteur ment parfois. La confirmation croisée, c’est la règle.' }}
          check={() => {
            if (scenario.fault.confirm.includes(confirm[0])) return { ok: true, why: `Confirmation cohérente : ${scenario.fault.why}` };
            return {
              ok: false,
              errorTag: 'single-technique',
              consequence: 'La technique choisie n’apporte pas de preuve indépendante pour ce défaut : vous risquez d’agir sur une fausse piste.',
              question: 'Quel signe physique, mesurable par une autre technique, accompagne ce défaut précis ?',
              hints: [
                'Roulement → particules de fer (huile) et émission acoustique (ultrasons).',
                'Désalignement → échauffement de l’accouplement (thermo). Lubrification → viscosité (huile) + température. Balourd/desserrage → phase.',
              ],
              method: 'Recoupement multi-techniques : chaque défaut a une signature secondaire (huile, thermographie, ultrasons, phase). Confirmer avant de décider.',
            };
          }}
          onDone={flow.done}
        >
          <Choice value={confirm} onChange={setConfirm} shuffleSeed={scenario.dt} options={CONFIRM_OPTS} />
        </Decision>
      )}
      {flow.index === 2 && (
        <Decision
          id="Estimer la RUL"
          title="3. Estimer la durée de vie résiduelle (RUL)"
          skills={['PREDICTIVE', 'RELIABILITY', 'DATA']}
          prompt={
            <p>
              Deux relevés du niveau global : il y a {scenario.dt} h de marche, <b>{fmt(scenario.v1, 2)} mm/s</b> ; aujourd’hui <b>{fmt(scenario.v2, 2)} mm/s</b>. La dégradation est exponentielle, V(t) = V₀·e^(k·t). Limite
              fonctionnelle F = {F_THRESHOLD} mm/s. Estimez la RUL en heures de marche.
            </p>
          }
          check={() => {
            const v = num(rul);
            if (near(v, scenario.rulTrue, 0.12)) return { ok: true, why: `k = ln(${fmt(scenario.v2, 2)}/${fmt(scenario.v1, 2)}) / ${scenario.dt} ≈ ${scenario.k.toFixed(4)} /h. RUL = ln(${F_THRESHOLD}/${fmt(scenario.v2, 2)}) / k ≈ ${fmt(scenario.rulTrue)} h (~${fmt(rulDays)} jours de marche).` };
            return {
              ok: false,
              errorTag: 'rul-misread',
              consequence: 'Une RUL fausse fausse toute la décision : trop optimiste, vous subissez la panne ; trop pessimiste, vous arrêtez pour rien.',
              question: 'Quel est le taux de croissance k entre les deux relevés, et combien de temps pour passer du niveau actuel à F ?',
              hints: [
                `k = ln(V₂/V₁) / Δt = ln(${fmt(scenario.v2, 2)}/${fmt(scenario.v1, 2)}) / ${scenario.dt}.`,
                'RUL = ln(F / V₂) / k.',
              ],
              method: 'Pronostic exponentiel : k = ln(V₂/V₁)/Δt ; RUL = ln(F/V_actuel)/k. La RUL se compte en heures de marche, pas en calendaire.',
            };
          }}
          onDone={flow.done}
        >
          <NumberInput label="RUL" suffix="h de marche" value={rul} onChange={setRul} />
        </Decision>
      )}
      {flow.index === 3 && (
        <Decision
          id="Décider"
          title="4. Intervenir maintenant, planifier, ou continuer à surveiller ?"
          skills={['PREDICTIVE', 'MAINTENANCE', 'ECONOMICS']}
          prompt={
            <p>
              RUL estimée ≈ <b>{fmt(scenario.rulTrue)} h de marche</b> (~{fmt(rulDays)} jours). La pièce n’est pas en stock : délai d’appro <b>{leadDaysNet} jours</b> (~{fmt(scenario.leadHours)} h). L’équipement tourne en continu.
            </p>
          }
          mentor={{ id: 'prod', text: 'Je m’arrête ou pas ? Réponds-moi clairement.' }}
          check={() => {
            const rulH = scenario.rulTrue;
            const lead = scenario.leadHours;
            // marge de sécurité : il faut la pièce AVANT F, avec ~30 % de marge
            const safe = rulH > lead * 1.3;
            const urgent = rulH < lead;
            const correct = urgent ? 'now' : safe ? 'watch' : 'plan';
            if (decision[0] === correct) {
              const why =
                correct === 'now'
                  ? `RUL (${fmt(rulH)} h) < délai d’appro (${fmt(lead)} h) : la pièce n’arrivera pas à temps. Commande express + intervention rapprochée, sinon défaillance fonctionnelle.`
                  : correct === 'watch'
                    ? `RUL (${fmt(rulH)} h) très supérieure au délai (${fmt(lead)} h) : commandez la pièce dès maintenant et continuez à surveiller (resserrez l’intervalle). Intervenir tout de suite gaspillerait de la durée de vie utile.`
                    : `RUL (${fmt(rulH)} h) proche du délai (${fmt(lead)} h) : commandez immédiatement et planifiez l’intervention au premier arrêt possible avant F.`;
              return { ok: true, why };
            }
            const tag = correct === 'now' ? 'intervene-too-late' : decision[0] === 'now' ? 'intervene-too-early' : 'rul-misread';
            return {
              ok: false,
              errorTag: tag,
              consequence:
                decision[0] === 'watch' && correct !== 'watch'
                  ? 'Continuer à surveiller alors que la pièce ne peut pas arriver à temps : vous foncez vers la panne fonctionnelle.'
                  : decision[0] === 'now' && correct !== 'now'
                    ? 'Arrêter tout de suite une machine qui a encore une large marge de vie gaspille du potentiel et de la production — c’est du sur-préventif.'
                    : 'Le calendrier de décision ne correspond pas à la RUL et au délai d’appro.',
              question: 'Comparez la RUL au délai d’approvisionnement de la pièce : la pièce arrivera-t-elle avant que le niveau n’atteigne F ?',
              hints: [
                'Si RUL < délai d’appro → la surveillance ne suffit pas : agir/expédier maintenant.',
                'Si RUL ≫ délai (marge > 30 %) → commander et surveiller. Sinon → commander et planifier au prochain arrêt.',
              ],
              method: 'La décision conditionnelle dépend de la RUL ET du délai de réaction (P-F net) : détecter ne sert à rien si la pièce arrive après la panne.',
            };
          }}
          onDone={flow.done}
        >
          <Choice
            value={decision}
            onChange={setDecision}
            options={[
              { id: 'now', label: 'Intervenir maintenant (commande express, arrêt rapproché)' },
              { id: 'plan', label: 'Commander la pièce et planifier l’intervention au prochain arrêt' },
              { id: 'watch', label: 'Commander la pièce et continuer à surveiller (intervalle resserré)' },
            ]}
          />
        </Decision>
      )}
    </div>
  );
}
