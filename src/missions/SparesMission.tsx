import { useMemo, useState } from 'react';
import { BREWERY } from '../data/plants';
import { reorderPoint } from '../engine/stats';
import { useGameState } from '../store/game';
import { Briefing, Choice, Debrief, Decision, NumberInput, Stepper, near, useSteps } from '../ui/Pedagogy';
import { type MissionProps, fmt, fmtM, num, useFinish } from './common';

const PURGE_OK = ['ROUL-6310-2RS', 'GAR-P101-OLD', 'MOT-90-L0', 'KIT-KHS-98'];
const TRAPS = ['BLOC-VIS', 'POMP-ALIM'];

// Données pièce d'assurance BLOC-VIS
const BV = { cost: 38e6, rate: 0.25, pFail: 0.04, lossNoSpare: 25e6 };
const PA = { cost: 14e6, pFail: 0.2, downNoSpare: 48, lossH: 4.5e6 };
// Roulements 6310 C3
const RP = { d: 0.12, s: 0.35, L: 30, sl: 0.95 };

export function SparesMission({ meta, onExit }: MissionProps) {
  const { game } = useGameState();
  const flow = useSteps(4);
  const finish = useFinish(meta, onExit);
  const [purge, setPurge] = useState<string[]>([]);
  const [hold, setHold] = useState('');
  const [risk, setRisk] = useState('');
  const [bvDecision, setBvDecision] = useState<string[]>([]);
  const [rop, setRop] = useState('');
  const [stockSet, setStockSet] = useState<string[]>([]);
  const parts = BREWERY.parts;
  const stock = game.plant.stock;
  const rp = reorderPoint(RP.d, RP.s, RP.L, RP.sl);

  const rows = useMemo(
    () =>
      parts.map((p) => {
        const cons = game.plant.events.filter((e) => e.month > game.plant.month - 24 && BREWERY.equipment.find((q) => q.tag === e.tag)?.modes.find((m) => m.id === e.modeId)?.partId === p.id).length;
        const lastMove = game.plant.lastMovement[p.id] ?? -24;
        return { p, qty: stock[p.id] ?? 0, value: (stock[p.id] ?? 0) * p.unitCost, cons, idle: game.plant.month - lastMove };
      }),
    [parts, stock, game.plant],
  );
  const purgeValue = purge.reduce((a, id) => a + (stock[id] ?? 0) * (parts.find((p) => p.id === id)?.unitCost ?? 0), 0);

  if (flow.index === -1) return <Briefing meta={meta} onStart={flow.start} />;
  if (flow.finished) {
    const sparePolicies = Object.fromEntries(stockSet.map((id) => [id, { min: id === 'GAR-P101' ? 1 : 0, max: id === 'GAR-P101' ? 2 : 1 }]));
    sparePolicies['ROUL-6310'] = { min: Math.round(rp.rop), max: Math.round(rp.rop) + 6 };
    const purgeList = [...purge, ...(bvDecision[0] === 'sell' ? ['BLOC-VIS'] : [])];
    return <Debrief meta={meta} results={flow.results} onValidate={() => finish(flow.results, { purge: purgeList, sparePolicies })} />;
  }

  return (
    <div>
      <Stepper total={4} index={flow.index} />
      {flow.index === 0 && (
        <Decision
          id="Doublons & obsolètes"
          title="1. Fichier articles : que purger ?"
          skills={['SPARES', 'GMAO', 'DATA']}
          prompt={<p>Cochez les articles à purger / fusionner / vendre. Valeur libérée : <b>{fmtM(purgeValue)}</b>.</p>}
          mentor={{ id: 'daf', text: 'Tout ce qui n’a pas bougé depuis 12 mois doit partir.' }}
          check={() => {
            const trap = purge.filter((x) => TRAPS.includes(x));
            const miss = PURGE_OK.filter((x) => !purge.includes(x));
            const other = purge.filter((x) => !PURGE_OK.includes(x) && !TRAPS.includes(x));
            if (!trap.length && !miss.length && !other.length)
              return { ok: true, why: `Doublons et obsolètes traités (${fmtM(purgeValue)}). Les garnitures NBR n’étaient pas seulement dormantes : elles étaient montées par erreur sur les pompes — c’est une cause de pannes, pas qu’un problème de stock.` };
            if (trap.length)
              return {
                ok: false,
                errorTag: 'stock-no-risk',
                consequence: `Vous supprimez ${trap.join(', ')} : pièce(s) d’assurance. Une panne du ${trap.includes('POMP-ALIM') ? 'la pompe alimentaire chaudière = arrêt vapeur de toute l’usine pendant 3 semaines' : 'bloc vis'} sans pièce…`,
                question: 'Une pièce qui ne bouge pas est-elle forcément inutile ? Quelle est sa fonction ?',
                hints: ['Distinguez stock dormant (pièce inutile) et pièce d’assurance (protège contre un événement rare et coûteux).', 'La décision sur une pièce d’assurance est un calcul de risque, pas de rotation (étape suivante).'],
                method: 'Classer : consommables (rotation, ABC/XYZ), pièces critiques de réparation, pièces d’assurance (risque), obsolètes/doublons (purge).',
              };
            return {
              ok: false,
              errorTag: 'overstock',
              consequence: miss.length ? `Articles oubliés : ${miss.join(', ')}. Du capital reste immobilisé, et des doublons continuent de fausser les consommations.` : `Vous purgez des articles utiles (${other.join(', ')}).`,
              question: 'Quels articles sont des doublons (même fonction, autre code), et lesquels servent des équipements qui n’existent plus ?',
              hints: ['Cherchez les mentions « doublon », « ancienne réf. », « ligne démantelée », « 1998 ».', 'Un doublon se fusionne après vérification technique de l’équivalence.'],
              method: 'Nettoyage du fichier articles : doublons (fusion), obsolètes (vente/rebut), sans mouvement (revue au cas par cas).',
            };
          }}
          onDone={flow.done}
        >
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th></th>
                  <th>Article</th>
                  <th className="num">Stock</th>
                  <th className="num">Valeur</th>
                  <th className="num">Délai</th>
                  <th className="num">Sans mouvement</th>
                  <th>Critique</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ p, qty, value, idle }) => (
                  <tr key={p.id} className={purge.includes(p.id) ? 'flagged' : ''}>
                    <td>
                      <input type="checkbox" checked={purge.includes(p.id)} onChange={() => setPurge(purge.includes(p.id) ? purge.filter((x) => x !== p.id) : [...purge, p.id])} aria-label={`Purger ${p.ref}`} />
                    </td>
                    <td>
                      <b>{p.ref}</b> — {p.name}
                    </td>
                    <td className="num">{qty}</td>
                    <td className="num">{fmt(value / 1e6, 1)} M</td>
                    <td className="num">{p.leadDays} j</td>
                    <td className="num">{idle >= 12 ? `${idle} mois` : idle > 0 ? `${idle} mois` : '—'}</td>
                    <td>{p.critical ? <span className="pill warn">oui</span> : ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Decision>
      )}
      {flow.index === 1 && (
        <Decision
          id="Pièce d’assurance"
          title="2. Le bloc vis à 38 M FCFA : garder ou vendre ?"
          skills={['SPARES', 'ECONOMICS']}
          prompt={
            <>
              <p>
                <b>BLOC-VIS</b> (compresseur d’air AC-401) : valeur {fmtM(BV.cost, 0)}, taux de possession 25 %/an. Probabilité de grippage : {BV.pFail * 100} %/an. AC-401 est <b>redondé</b> par un second compresseur ;
                un compresseur mobile se loue à Douala sous 24 h. Coût total d’un grippage sans pièce en stock (perte partielle + location + express) ≈ {fmtM(BV.lossNoSpare, 0)}. L’OEM rachète le bloc à 70 %.
              </p>
              <p className="small muted">
                Pour comparaison : pompe alimentaire chaudière POMP-ALIM ({fmtM(PA.cost, 0)}) — P(panne) {PA.pFail * 100} %/an, sans stock {PA.downNoSpare} h d’arrêt vapeur usine à {fmtM(PA.lossH, 1)}/h.
              </p>
            </>
          }
          check={() => {
            const h = num(hold);
            const r = num(risk);
            const H = BV.cost * BV.rate;
            const R = BV.pFail * BV.lossNoSpare;
            if (!near(h, H / 1e6, 0.05) || !near(r, R / 1e6, 0.08))
              return {
                ok: false,
                errorTag: 'stock-no-risk',
                consequence: 'Sans comparer coût de possession et risque évité, la décision sera idéologique (« il faut tout garder » ou « il faut tout vendre »).',
                question: 'Combien coûte chaque année le fait de garder la pièce ? Combien coûte, en espérance, le fait de ne pas l’avoir ?',
                hints: [`Possession = valeur × taux = 38 × 0,25.`, `Risque espéré = P(panne/an) × coût de la panne sans pièce = 0,04 × 25.`],
                method: 'Pièce d’assurance : garder si P × Coût(sans pièce) > coût de possession annuel (+ tenir compte de la gravité HSE).',
              };
            if (bvDecision[0] !== 'sell')
              return {
                ok: false,
                errorTag: 'overstock',
                consequence: `Vous immobilisez ${fmtM(BV.cost, 0)} pour vous protéger d’un risque espéré de ${fmtM(R, 1)}/an, en payant ${fmtM(H, 1)}/an.`,
                question: 'La redondance et la location ne jouent-elles pas déjà le rôle de la pièce d’assurance ?',
                hints: [`${fmtM(H, 1)} par an pour éviter ${fmtM(R, 1)} par an…`],
                method: 'Comparer coût annuel de possession et risque annuel évité.',
              };
            return { ok: true, why: `Possession ${fmtM(H, 1)}/an > risque évité ${fmtM(R, 1)}/an : revendre à l’OEM (${fmtM(BV.cost * 0.7, 1)} récupérés). À l’inverse, POMP-ALIM protège ${fmtM(PA.pFail * PA.downNoSpare * PA.lossH, 0)}/an de risque pour ${fmtM(PA.cost * 0.25, 1)}/an : on la garde. Même famille (« pièce qui ne bouge pas »), décisions opposées.` };
          }}
          onDone={flow.done}
        >
          <div className="grid-2">
            <NumberInput label="Coût annuel de possession" suffix="M FCFA/an" value={hold} onChange={setHold} />
            <NumberInput label="Risque annuel espéré sans stock" suffix="M FCFA/an" value={risk} onChange={setRisk} />
          </div>
          <div style={{ marginTop: 10 }}>
            <Choice shuffleSeed={166}
              value={bvDecision}
              onChange={setBvDecision}
              options={[
                { id: 'keep', label: 'Garder le bloc vis en stock' },
                { id: 'sell', label: 'Revendre le bloc à l’OEM et s’appuyer sur redondance + location' },
              ]}
            />
          </div>
        </Decision>
      )}
      {flow.index === 2 && (
        <Decision
          id="Point de commande"
          title="3. Point de commande des roulements 6310 C3"
          skills={['SPARES', 'DATA']}
          prompt={
            <p>
              Consommation moyenne {RP.d} u/jour, écart-type {RP.s} u/jour, délai distributeur {RP.L} jours, niveau de service visé {RP.sl * 100} % (z ≈ 1,645). Calculez le point de commande.
            </p>
          }
          check={() => {
            const v = num(rop);
            if (Math.abs(v - rp.rop) <= 1) return { ok: true, why: `SS = z·σ·√L = 1,645 × 0,35 × √30 ≈ ${fmt(rp.safetyStock, 1)} ; ROP = d·L + SS ≈ ${fmt(RP.d * RP.L, 1)} + ${fmt(rp.safetyStock, 1)} ≈ ${fmt(rp.rop, 1)} → ${Math.ceil(rp.rop)} roulements. Attention : une fois la cause « lubrification » éliminée, la consommation baissera — à recalculer.` };
            return {
              ok: false,
              consequence: v < rp.rop ? 'Point de commande trop bas : ruptures pendant le délai d’appro, arrêts du convoyeur.' : 'Point de commande trop haut : stock inutile.',
              question: 'Combien de roulements consommez-vous pendant le délai, et quelle marge couvre la variabilité ?',
              hints: ['Demande pendant le délai = d × L.', 'Stock de sécurité = z × σ_jour × √L.'],
              method: 'ROP = d × L + z × σ × √L (demande normale, délai fixe).',
            };
          }}
          onDone={flow.done}
        >
          <NumberInput label="Point de commande" suffix="roulements" value={rop} onChange={setRop} />
        </Decision>
      )}
      {flow.index === 3 && (
        <Decision
          id="Pièces critiques"
          title="4. Quelles pièces critiques (stock actuel 0 ou 1) faut-il stocker ?"
          skills={['SPARES', 'RELIABILITY', 'PREDICTIVE']}
          prompt={<p>Pièces critiques aujourd’hui sans stock de sécurité. Cochez celles à stocker (1 unité, 2 pour les garnitures).</p>}
          mentor={{ id: 'maths', text: 'Si je vois venir la panne plus tôt que le délai de livraison, ai-je besoin du stock ?' }}
          check={() => {
            const must = ['VAN-SOU', 'GAR-P101', 'CHAINE-LAV'];
            const miss = must.filter((x) => !stockSet.includes(x));
            const tube = stockSet.includes('TUBE-CH');
            if (!miss.length && !tube)
              return { ok: true, why: 'Vannes, garnitures et chaîne de laveuse : défaillances fréquentes, délai long, arrêt de ligne → stock justifié. Tubes de chaudière : la dégradation se voit ~4 000 h avant (≈ 6 mois) > délai 4 mois : la surveillance conditionnelle remplace le stock (22 M FCFA économisés).' };
            return {
              ok: false,
              errorTag: tube ? 'overstock' : 'stock-no-risk',
              consequence: tube ? '22 M FCFA immobilisés pour un mode dont la dégradation est visible 6 mois à l’avance.' : `Sans ${miss.join(', ')}, chaque panne = attente express (10 jours) avec la Ligne 1 à l’arrêt.`,
              question: 'Pour chaque pièce : fréquence de panne, délai d’appro, et… délai d’alerte (intervalle P-F) ?',
              hints: ['Kit vannes : η ≈ 3 600 h, délai 90 j. Chaîne laveuse : η ≈ 3 200 h, délai 90 j.', 'Tubes chaudière : P-F ≈ 4 000 h de marche ≈ 6 mois > délai 120 j.'],
              method: 'Stocker si (probabilité de besoin pendant le délai × coût d’arrêt) > coût de possession, sauf si la surveillance donne un préavis > délai d’appro.',
            };
          }}
          onDone={flow.done}
        >
          <Choice shuffleSeed={463}
            multi
            value={stockSet}
            onChange={setStockSet}
            options={[
              { id: 'VAN-SOU', label: 'Kit vannes de remplissage SOU-L1 (6,5 M, 90 j)' },
              { id: 'GAR-P101', label: 'Garnitures 45 mm EPDM P-101 / pasteurisateur (1,2 M, 75 j)' },
              { id: 'CHAINE-LAV', label: 'Chaîne de paniers laveuse (3,6 M, 90 j)' },
              { id: 'TUBE-CH', label: 'Lot de tubes de fumée chaudière (22 M, 120 j)' },
            ]}
          />
        </Decision>
      )}
    </div>
  );
}
