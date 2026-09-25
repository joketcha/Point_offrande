import type { MissionMeta } from '../data/missions';
import type { MissionPayload } from '../engine/effects';
import type { StepResult } from '../engine/types';
import { useGameState } from '../store/game';

export interface MissionProps {
  meta: MissionMeta;
  onExit: () => void;
}

export function useFinish(meta: MissionMeta, onExit: () => void) {
  const { dispatch } = useGameState();
  return (steps: StepResult[], payload?: MissionPayload) => {
    dispatch({ type: 'mission', missionId: meta.id, steps, payload });
    onExit();
  };
}

export const fmt = (x: number, d = 0) => x.toLocaleString('fr-FR', { maximumFractionDigits: d, minimumFractionDigits: d });
export const fmtM = (x: number, d = 1) => `${fmt(x / 1e6, d)} M FCFA`;
export const num = (s: string) => parseFloat(s.replace(',', '.'));
