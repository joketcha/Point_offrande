import { MATURITY_DIMENSIONS, MATURITY_LEVELS, maturityAudit } from '../engine/progression';
import { activeSite, useGameState } from '../store/game';
import { Radar, Meter } from '../ui/Charts';

const ADVICE: Record<string, string> = {
  Stratégie: 'Réaliser une analyse RCM des équipements critiques et formaliser une politique de maintenance.',
  Organisation: 'Réduire le backlog et stabiliser la charge (planification hebdomadaire, rôles clairs).',
  Compétences: 'Réaliser des missions pour développer les compétences les plus faibles.',
  Données: 'Fiabiliser la GMAO : codification, saisie en temps réel, revue qualité.',
  GMAO: 'Mission « Premier jour : la GMAO ment » et projet de gouvernance des données.',
  Préventif: 'Remonter la conformité préventive : alléger les gammes inutiles, sécuriser la capacité.',
  Conditionnel: 'Basculer les modes à P-F exploitable en conditionnel (intervalle ≤ P-F/2).',
  Fiabilité: 'Analyses Weibull, AMDEC, architecture système.',
  Stock: 'Pièces critiques disponibles, dormant liquidé, politiques min/max calculées.',
  Planification: 'Augmenter la part de travail planifié (moins d’urgences).',
  RCA: 'Traiter les pannes répétitives par des RCA clôturées et vérifiées.',
  KPI: 'Suivre les indicateurs mois après mois, jamais isolément.',
  'Amélioration continue': 'Éliminer les causes latentes, mesurer l’efficacité (REX).',
  Leadership: 'Gagner la confiance de la Direction : décisions chiffrées, crises maîtrisées.',
};

export function Audit() {
  const { game } = useGameState();
  const { plant } = activeSite(game);
  const audit = maturityAudit({ ...game, plant });
  const values = MATURITY_DIMENSIONS.map((d) => audit.scores[d]);
  const weakest = [...MATURITY_DIMENSIONS].sort((a, b) => audit.scores[a] - audit.scores[b]).slice(0, 4);
  return (
    <div className="fade-in">
      <h1>Audit de maturité maintenance</h1>
      <div className="grid-2">
        <div className="card">
          <h3>
            Niveau {audit.level} — {MATURITY_LEVELS[audit.level - 1]}
          </h3>
          <Radar axes={[...MATURITY_DIMENSIONS]} values={values} max={6} />
          <p className="small muted">Le niveau global est plafonné par le maillon faible : on ne peut pas être « prédictif » avec des données médiocres.</p>
        </div>
        <div className="card">
          <h3>Échelle</h3>
          <ol className="small">
            {MATURITY_LEVELS.map((l, i) => (
              <li key={l} style={{ fontWeight: i + 1 === audit.level ? 700 : 400 }}>
                {l}
              </li>
            ))}
          </ol>
          <h3>Priorités de progrès</h3>
          {weakest.map((w) => (
            <div key={w} className="small" style={{ marginBottom: 6 }}>
              <b>
                {w} ({audit.scores[w].toFixed(1)}/6)
              </b>{' '}
              — {ADVICE[w]}
            </div>
          ))}
        </div>
      </div>
      <div className="card section">
        <h3>Détail des 14 dimensions</h3>
        {MATURITY_DIMENSIONS.map((d) => (
          <div key={d} className="skill-row" style={{ marginBottom: 6 }}>
            <span>{d}</span>
            <Meter value={audit.scores[d]} max={6} color={audit.scores[d] < 2 ? 'var(--critical)' : audit.scores[d] < 3.5 ? 'var(--warn)' : 'var(--good)'} />
            <span className="num small">{audit.scores[d].toFixed(1)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
