import type { Nav } from '../App';
import { getMission } from '../data/missions';
import {
  CERTS,
  ERROR_LABEL,
  LEVELS,
  SKILLS,
  certStatus,
  industrialImpact,
  levelDef,
  promotionStatus,
  recommendMissions,
  reliabilityScore,
} from '../engine/progression';
import { exportSave } from '../store/persistence';
import { useGame, useGameState } from '../store/game';
import { Meter, Radar } from '../ui/Charts';

export function Profile({ nav }: { nav: Nav }) {
  const { game, dispatch } = useGameState();
  const { dispatch: rawDispatch } = useGame();
  const p = game.player;
  const lvl = levelDef(p.level);
  const promo = promotionStatus(game);
  const rs = reliabilityScore(p);
  const impact = industrialImpact(game);
  const sorted = [...SKILLS].sort((a, b) => p.skills[b.id] - p.skills[a.id]);
  const errors = Object.entries(p.errors).sort((a, b) => b[1] - a[1]);
  const rec = recommendMissions(game, 3);
  const composite = {
    'Rigueur analytique': (p.skills.WEIBULL + p.skills.DATA + p.skills.RELIABILITY) / 3,
    'Maîtrise terrain': (p.skills.MAINTENANCE + p.skills.RCA + p.skills.PREDICTIVE) / 3,
    'Maîtrise économique': (p.skills.ECONOMICS + p.skills.SPARES) / 2,
  };

  const download = () => {
    const blob = new Blob([exportSave(game)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `reliability-master-${p.name.replace(/\W+/g, '_')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div className="fade-in">
      <h1>Mon profil fiabiliste</h1>
      <div className="grid-2">
        <div className="card">
          <h2 style={{ marginBottom: 2 }}>{p.name}</h2>
          <div className="text-2">
            Niveau {p.level} — <b>{lvl.title}</b>
          </div>
          <div className="small muted">
            {p.xp} XP · Africa Industrial Group · {game.plant.month} mois de prise de poste
          </div>
          <div className="kpis" style={{ marginTop: 12, gridTemplateColumns: 'repeat(2, minmax(0,1fr))' }}>
            <div className="kpi">
              <div className="label">Reliability Score</div>
              <div className="value num">{rs}</div>
              <div className="small muted">/ 1000 — maîtrise technique</div>
            </div>
            <div className="kpi">
              <div className="label">Industrial Impact</div>
              <div className="value num">{impact}</div>
              <div className="small muted">/ 100 — résultats usine</div>
            </div>
          </div>
          {Object.entries(composite).map(([k, v]) => (
            <div key={k} className="skill-row" style={{ marginTop: 6 }}>
              <span>{k}</span>
              <Meter value={v} />
              <span className="num small">{v.toFixed(0)}</span>
            </div>
          ))}
          <div className="divider" />
          {promo.next ? (
            <>
              <b>Prochaine promotion : {promo.next.title}</b>
              {promo.eligible ? (
                <div>
                  <button className="btn primary" style={{ marginTop: 8 }} onClick={() => dispatch({ type: 'promote' })}>
                    Accepter la promotion
                  </button>
                </div>
              ) : (
                <ul className="small">{promo.missing.map((m) => <li key={m}>{m}</li>)}</ul>
              )}
            </>
          ) : (
            <b>Sommet de carrière atteint.</b>
          )}
        </div>
        <div className="card">
          <h3>Compétences</h3>
          <Radar axes={SKILLS.map((s) => s.label)} values={SKILLS.map((s) => p.skills[s.id])} />
          <div className="small">
            <b>Forces :</b> {sorted.slice(0, 3).map((s) => s.label).join(', ')}
            <br />
            <b>À développer :</b> {sorted.slice(-3).map((s) => s.label).join(', ')}
          </div>
        </div>
      </div>

      <div className="card section">
        <h3>CV virtuel — compétences (0-100)</h3>
        <div className="grid-2">
          {SKILLS.map((s) => (
            <div key={s.id} className="skill-row">
              <span>{s.label}</span>
              <Meter value={p.skills[s.id]} />
              <span className="num small">{p.skills[s.id].toFixed(0)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid-2 section">
        <div className="card">
          <h3>Certifications</h3>
          {CERTS.map((c) => {
            const has = p.certifications.includes(c.id);
            const st = certStatus(game, c);
            return (
              <div key={c.id} style={{ marginBottom: 10 }}>
                <div className="row between">
                  <span>
                    <span className="avatar" style={{ background: c.color, width: 24, height: 24, display: 'inline-grid', fontSize: '0.6rem', verticalAlign: 'middle' }}>
                      {c.name[0]}
                    </span>{' '}
                    <b>{c.name}</b> — {c.title}
                  </span>
                  {has ? (
                    <span className="pill good">✓ obtenue</span>
                  ) : st.eligible ? (
                    <button className="btn small primary" onClick={() => dispatch({ type: 'certify', cert: c.id })}>
                      Obtenir
                    </button>
                  ) : (
                    <span className="pill">à passer</span>
                  )}
                </div>
                <div className="small muted">{c.description}</div>
                {!has && !st.eligible && <ul className="small">{st.missing.map((m) => <li key={m}>{m}</li>)}</ul>}
              </div>
            );
          })}
        </div>
        <div className="card">
          <h3>Erreurs de raisonnement fréquentes</h3>
          {errors.length === 0 && <p className="small muted">Aucune pour l’instant.</p>}
          {errors.slice(0, 8).map(([tag, n]) => (
            <div key={tag} className="small row between">
              <span>{ERROR_LABEL[tag] ?? tag}</span>
              <span className="pill crit">×{n}</span>
            </div>
          ))}
          <h3 style={{ marginTop: 14 }}>Prochaines missions recommandées</h3>
          {rec.map((r) => (
            <button key={r.meta.id} className="option" style={{ width: '100%', marginBottom: 6 }} onClick={() => nav.openMission(r.meta.id)}>
              <span>
                <b>{r.meta.title}</b>
                <div className="sub">{r.reason}</div>
              </span>
            </button>
          ))}
          <h3 style={{ marginTop: 14 }}>Badges</h3>
          <div className="row">{p.badges.length ? p.badges.map((b) => <span key={b} className="pill accent">{b}</span>) : <span className="small muted">Aucun badge.</span>}</div>
        </div>
      </div>

      <div className="grid-2 section">
        <div className="card">
          <h3>Parcours de carrière</h3>
          <ol className="small">
            {LEVELS.map((l) => (
              <li key={l.level} style={{ opacity: l.level <= p.level ? 1 : 0.55, fontWeight: l.level === p.level ? 700 : 400 }}>
                {l.title} <span className="muted">— {l.xp} XP{l.cert ? ` + ${l.cert}` : ''}{l.minImpact ? ` + impact ≥ ${l.minImpact}` : ''}</span>
              </li>
            ))}
          </ol>
          <h3>Missions réalisées</h3>
          <div className="small">
            {Object.values(p.missions).length === 0 && <span className="muted">Aucune.</span>}
            {Object.values(p.missions).map((m) => (
              <div key={m.missionId} className="row between">
                <span>{getMission(m.missionId)?.title}</span>
                <span className="num">{m.score}/100</span>
              </div>
            ))}
          </div>
        </div>
        <div className="card">
          <h3>Carnet de raisonnement</h3>
          <p className="small muted">Vos explications après chaque erreur. Relisez-les : c’est là que se construit le jugement.</p>
          <div className="stack small" style={{ maxHeight: 260, overflowY: 'auto' }}>
            {[...p.reasoningLog].reverse().slice(0, 30).map((r, i) => (
              <div key={i}>
                <b>{getMission(r.missionId)?.title} · {r.stepId} :</b> {r.text}
              </div>
            ))}
            {p.reasoningLog.length === 0 && <span className="muted">Vide.</span>}
          </div>
        </div>
      </div>

      <div className="card section">
        <h3>Sauvegarde</h3>
        <p className="small muted">Sauvegarde automatique dans ce navigateur. Exportez un fichier pour changer d’appareil ou archiver.</p>
        <div className="row">
          <button className="btn" onClick={download}>
            Exporter (JSON)
          </button>
          <button className="btn danger" onClick={() => confirm('Effacer définitivement la partie ?') && rawDispatch({ type: 'reset' })}>
            Nouvelle partie
          </button>
        </div>
      </div>
    </div>
  );
}
