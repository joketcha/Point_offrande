import { useRef, useState } from 'react';
import { MENTORS } from '../data/mentors';
import { importSave } from '../store/persistence';
import { useGame } from '../store/game';

export function Welcome() {
  const { dispatch } = useGame();
  const [name, setName] = useState('');
  const [err, setErr] = useState('');
  const file = useRef<HTMLInputElement>(null);

  const onImport = async (f: File) => {
    try {
      dispatch({ type: 'load', state: importSave(await f.text()) });
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  return (
    <div className="app" style={{ background: 'var(--bg)' }}>
      <div className="hero fade-in">
        <div className="pill accent">AFRICA INDUSTRIAL GROUP · Simulateur de carrière</div>
        <h1 style={{ marginTop: 14 }}>
          RELIABILITY <span>MASTER</span>
          <br />
          <small style={{ fontSize: '1rem', letterSpacing: '0.2em' }}>AFRICA TO WORLD</small>
        </h1>
        <p className="slogan">Deviens celui qui transforme les pannes en performance.</p>
        <div className="card" style={{ textAlign: 'left', marginTop: 20 }}>
          <p>
            Vous prenez votre poste à la <b>Brasserie AIG de Douala</b> : pannes répétitives, préventif mal calibré, GMAO peu fiable, stock dormant, backlog, conflits avec la Production et une Direction sous
            pression.
          </p>
          <p className="text-2">
            Chaque mois simulé, vos décisions (stratégies de maintenance, pièces, projets, arbitrages sous pression) modifient réellement la fiabilité, les coûts et la production de l’usine. Chaque mission
            vous oblige à raisonner : le jeu ne donne jamais la réponse d’emblée.
          </p>
          <p className="text-2 small">
            Votre objectif : passer de <b>Technicien analyste</b> à <b>Global Reliability & Asset Management Expert</b> — promotion après promotion, sur résultats réels.
          </p>
          <label className="field">
            Votre nom d’ingénieur
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="ex. Awa Mbarga" maxLength={40} />
          </label>
          <div className="row" style={{ marginTop: 12 }}>
            <button className="btn primary" disabled={!name.trim()} onClick={() => dispatch({ type: 'new', name: name.trim() })}>
              Prendre mon poste →
            </button>
            <button className="btn ghost" onClick={() => file.current?.click()}>
              Importer une sauvegarde
            </button>
            <input ref={file} type="file" accept="application/json" hidden onChange={(e) => e.target.files?.[0] && onImport(e.target.files[0])} />
          </div>
          {err && <div className="callout bad small">{err}</div>}
        </div>
        <div className="row" style={{ justifyContent: 'center', marginTop: 16, gap: 6 }}>
          {Object.values(MENTORS).map((m) => (
            <div key={m.id} className="avatar" style={{ background: m.color }} title={`${m.name} — ${m.role}`}>
              {m.initials}
            </div>
          ))}
        </div>
        <p className="small muted" style={{ marginTop: 8 }}>
          8 mentors. Ils ne seront pas toujours d’accord.
        </p>
      </div>
    </div>
  );
}
