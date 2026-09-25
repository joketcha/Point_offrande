import { useEffect, useState } from 'react';
import { getMission } from './data/missions';
import { LEVELS, levelDef } from './engine/progression';
import { MissionHost } from './missions';
import { Audit } from './screens/Audit';
import { Cockpit } from './screens/Cockpit';
import { Labs } from './screens/Labs';
import { Library } from './screens/Library';
import { Missions } from './screens/Missions';
import { Plant } from './screens/Plant';
import { Profile } from './screens/Profile';
import { Rex } from './screens/Rex';
import { Store } from './screens/Store';
import { Welcome } from './screens/Welcome';
import { activeSite, useGame } from './store/game';

export type Screen = 'cockpit' | 'usine' | 'missions' | 'labs' | 'magasin' | 'rex' | 'audit' | 'profil' | 'biblio';

const NAV: { id: Screen; label: string; icon: string; mobile?: boolean }[] = [
  { id: 'cockpit', label: 'Cockpit', icon: '◎', mobile: true },
  { id: 'usine', label: 'Usine', icon: '⚙', mobile: true },
  { id: 'missions', label: 'Missions', icon: '◆', mobile: true },
  { id: 'labs', label: 'Laboratoires', icon: '∿', mobile: true },
  { id: 'magasin', label: 'Magasin', icon: '▦' },
  { id: 'rex', label: 'REX & Pareto', icon: '▤' },
  { id: 'audit', label: 'Audit maturité', icon: '◈' },
  { id: 'biblio', label: 'Bibliothèque', icon: '❏' },
  { id: 'profil', label: 'Mon profil', icon: '☺', mobile: true },
];

export interface Nav {
  go: (s: Screen) => void;
  openMission: (id: string) => void;
}

export function App() {
  const { state, dispatch } = useGame();
  const [screen, setScreen] = useState<Screen>('cockpit');
  const [mission, setMission] = useState<string | null>(null);
  const [more, setMore] = useState(false);

  useEffect(() => {
    if (!state.toasts.length) return;
    const t = setTimeout(() => dispatch({ type: 'toast-clear' }), 4500);
    return () => clearTimeout(t);
  }, [state.toasts, dispatch]);

  if (!state.game) return <Welcome />;
  const g = state.game;
  const lvl = levelDef(g.player.level);
  const next = LEVELS[g.player.level];
  const progress = next ? Math.min(1, (g.player.xp - lvl.xp) / (next.xp - lvl.xp)) : 1;
  const site = activeSite(g);

  const nav: Nav = {
    go: (s) => {
      setMission(null);
      setScreen(s);
      setMore(false);
      window.scrollTo({ top: 0 });
    },
    openMission: (id) => {
      setMission(id);
      window.scrollTo({ top: 0 });
    },
  };

  const meta = mission ? getMission(mission) : undefined;

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          RELIABILITY <span>MASTER</span>
        </div>
        <span className="chip-level" title={lvl.title}>
          Niv. {g.player.level}
        </span>
        <div className="spacer" />
        <div className="small muted num" style={{ whiteSpace: 'nowrap' }}>
          {site.isTakeover ? 'TAKE OVER · ' : ''}Mois {site.plant.month}
        </div>
        <div className="xp-wrap" title={`${g.player.xp} XP`}>
          <div className="small num muted" style={{ fontSize: '0.7rem', textAlign: 'right' }}>
            {g.player.xp} XP
          </div>
          <div className="xpbar">
            <div style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      </header>
      <div className="layout">
        <nav className="sidenav" aria-label="Navigation principale">
          {NAV.map((n) => (
            <button key={n.id} className={!mission && screen === n.id ? 'active' : ''} onClick={() => nav.go(n.id)}>
              <span className="nav-ico" aria-hidden>
                {n.icon}
              </span>
              {n.label}
            </button>
          ))}
        </nav>
        <main className="main">
          {meta ? (
            <>
              <div className="row between no-print" style={{ marginBottom: 12 }}>
                <button className="btn ghost small" onClick={() => setMission(null)}>
                  ← Quitter la mission
                </button>
                <span className="pill accent">{meta.module.toUpperCase()}</span>
              </div>
              <MissionHost meta={meta} onExit={() => setMission(null)} />
            </>
          ) : (
            <>
              {screen === 'cockpit' && <Cockpit nav={nav} />}
              {screen === 'usine' && <Plant />}
              {screen === 'missions' && <Missions nav={nav} />}
              {screen === 'labs' && <Labs />}
              {screen === 'magasin' && <Store />}
              {screen === 'rex' && <Rex />}
              {screen === 'audit' && <Audit />}
              {screen === 'profil' && <Profile nav={nav} />}
              {screen === 'biblio' && <Library nav={nav} />}
            </>
          )}
        </main>
      </div>
      <nav className="bottomnav" aria-label="Navigation mobile">
        {NAV.filter((n) => n.mobile && n.id !== 'profil').map((n) => (
          <button key={n.id} className={!mission && screen === n.id ? 'active' : ''} onClick={() => nav.go(n.id)}>
            <span className="nav-ico" aria-hidden>
              {n.icon}
            </span>
            {n.label}
          </button>
        ))}
        <button className={more ? 'active' : ''} onClick={() => setMore(!more)}>
          <span className="nav-ico" aria-hidden>
            ☰
          </span>
          Plus
        </button>
      </nav>
      {more && (
        <div className="modal-back" onClick={() => setMore(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="stack">
              {NAV.filter((n) => !n.mobile || n.id === 'profil').map((n) => (
                <button key={n.id} className="btn block" style={{ justifyContent: 'flex-start' }} onClick={() => nav.go(n.id)}>
                  <span aria-hidden>{n.icon}</span> {n.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
      <div className="toasts" aria-live="polite">
        {state.toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
