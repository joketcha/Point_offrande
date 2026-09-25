import type { Nav } from '../App';
import { MISSIONS, MODULE_LABEL } from '../data/missions';
import { SKILL_LABEL, adaptiveDifficulty, levelDef, recommendMissions } from '../engine/progression';
import { useGameState } from '../store/game';
import { StatusPill } from '../ui/Charts';

export function Missions({ nav }: { nav: Nav }) {
  const { game } = useGameState();
  const p = game.player;
  const rec = recommendMissions(game, 3);
  const tiers = [1, 2, 3, 4, 5] as const;
  const tierLabel = ['', 'Fondements', 'Fiabilité & méthodes de décision', 'Ingénierie de maintenance', 'Pilotage & management', 'Épreuve finale'];

  return (
    <div className="fade-in">
      <h1>Missions</h1>
      <p className="text-2">
        Chaque mission est une situation d’usine réelle : données imparfaites, contraintes, objectifs contradictoires, pression. Les missions réussies (score ≥ 60) améliorent réellement l’usine simulée.
      </p>
      <div className="card">
        <h3>Recommandées pour vous (parcours adaptatif)</h3>
        <div className="grid-3">
          {rec.map((r) => (
            <button key={r.meta.id} className="option" onClick={() => nav.openMission(r.meta.id)}>
              <span>
                <b>{r.meta.title}</b>
                <div className="sub">{r.reason}</div>
              </span>
            </button>
          ))}
        </div>
      </div>
      {tiers.map((t) => (
        <div key={t} className="section">
          <h2>{tierLabel[t]}</h2>
          <div className="grid-3">
            {MISSIONS.filter((m) => m.tier === t).map((m) => {
              const locked = m.minLevel > p.level;
              const best = p.missions[m.id];
              const takeoverRunning = m.id === 'takeover' && game.takeover && !game.takeover.finished;
              return (
                <div
                  key={m.id}
                  className={`card mission-card ${locked ? 'locked' : ''}`}
                  onClick={() => !locked && nav.openMission(m.id)}
                  role="button"
                  tabIndex={locked ? -1 : 0}
                  onKeyDown={(e) => e.key === 'Enter' && !locked && nav.openMission(m.id)}
                >
                  <div className="row between">
                    <span className="pill accent">{MODULE_LABEL[m.module]}</span>
                    {best ? (
                      <StatusPill level={best.score >= 70 ? 'good' : best.score >= 60 ? 'warn' : 'crit'}>{best.score}/100</StatusPill>
                    ) : locked ? (
                      <span className="pill">🔒 Niv. {m.minLevel}</span>
                    ) : (
                      <span className="pill">Nouveau</span>
                    )}
                  </div>
                  <h3 style={{ marginTop: 8 }}>{m.title}</h3>
                  <p className="small text-2">{m.subtitle}</p>
                  <div className="row small muted">
                    <span>+{m.xp} XP</span>·<span>{m.skills.map((s) => SKILL_LABEL[s]).join(', ')}</span>
                  </div>
                  {!locked && m.id !== 'takeover' && <div className="small muted">Difficulté adaptée : {adaptiveDifficulty(p, m)}/3</div>}
                  {locked && <div className="small muted">Débloquée au niveau {m.minLevel} — {levelDef(m.minLevel).title}</div>}
                  {takeoverRunning && <div className="small">En cours : pilotez depuis le Cockpit.</div>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
