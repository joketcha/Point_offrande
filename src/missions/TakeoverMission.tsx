import { CEMENT } from '../data/plants';
import { TAKEOVER_MONTHS } from '../engine/takeover';
import { useGameState } from '../store/game';
import { Briefing } from '../ui/Pedagogy';
import type { MissionProps } from './common';

export function TakeoverMission({ meta, onExit }: MissionProps) {
  const { game, dispatch } = useGameState();
  const eligible = game.player.certifications.includes('diamond') || game.player.level >= 8;
  const running = game.takeover && !game.takeover.finished;

  if (running)
    return (
      <div className="card">
        <h2>Épreuve en cours</h2>
        <p>
          Mois {game.takeover!.plant.month} / {TAKEOVER_MONTHS}. Le Cockpit, l’Usine et le Magasin affichent désormais la cimenterie.
        </p>
        <button className="btn primary" onClick={onExit}>
          Retour
        </button>
      </div>
    );

  return (
    <Briefing
      meta={meta}
      onStart={() => {
        if (!eligible) return;
        dispatch({ type: 'takeover-start' });
        onExit();
      }}
      extra={
        <>
          <div className="callout small">
            Site : <b>{CEMENT.name}</b> — {CEMENT.equipment.length} équipements critiques, stock obsolète massif, qualité de données {CEMENT.initialDataQuality}/100. Vous disposez des projets d’amélioration (écran Usine), des politiques de maintenance et du magasin. Verdict automatique à la fin du mois {TAKEOVER_MONTHS}.
          </div>
          {!eligible && <div className="callout bad small">Accès réservé : certification Diamond ou niveau 8 requis.</div>}
        </>
      }
    />
  );
}
