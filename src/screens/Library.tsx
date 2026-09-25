import { useState } from 'react';
import type { Nav } from '../App';
import { LIBRARY, PARTS } from '../data/library';
import { MENTORS } from '../data/mentors';

export function Library({ nav }: { nav: Nav }) {
  const [part, setPart] = useState(PARTS[0]);
  const [q, setQ] = useState('');
  const cards = LIBRARY.filter((c) => (q ? (c.title + c.essentials + c.pitfall).toLowerCase().includes(q.toLowerCase()) : c.part === part));
  return (
    <div className="fade-in">
      <h1>Bibliothèque technique</h1>
      <p className="text-2 small">Parcours : Fondements → Fiabilité / Maintenabilité / Disponibilité → Méthodes de décision → Ingénierie de maintenance → Pilotage → Retour d’expérience. Chaque notion renvoie à un exercice.</p>
      <input type="text" placeholder="Rechercher une notion (Weibull, P-F, TRS…)" value={q} onChange={(e) => setQ(e.target.value)} />
      {!q && (
        <div className="tabs" style={{ marginTop: 12 }}>
          {PARTS.map((p) => (
            <button key={p} className={part === p ? 'active' : ''} onClick={() => setPart(p)}>
              {p}
            </button>
          ))}
        </div>
      )}
      <div className="grid-2" style={{ marginTop: 12 }}>
        {cards.map((c) => (
          <div key={c.id} className="card" style={{ margin: 0 }}>
            <h3>{c.title}</h3>
            <p className="small">{c.essentials}</p>
            {c.formula && (
              <div className="callout info small num">
                <b>Formule :</b> {c.formula}
              </div>
            )}
            <div className="callout bad small">
              <b>Piège :</b> {c.pitfall}
            </div>
            <button className="btn small" onClick={() => (c.practice.kind === 'mission' ? nav.openMission(c.practice.id) : nav.go('labs'))}>
              Pratiquer : {c.practice.label} →
            </button>
          </div>
        ))}
      </div>
      <div className="card section">
        <h3>Vos 8 mentors</h3>
        <div className="grid-2">
          {Object.values(MENTORS).map((m) => (
            <div key={m.id} className="mentor">
              <div className="avatar" style={{ background: m.color }}>
                {m.initials}
              </div>
              <div className="small">
                <b>{m.name}</b> — {m.role}
                <div className="muted">{m.bias}</div>
                <i>{m.motto}</i>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
