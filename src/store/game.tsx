import { createContext, useContext, useEffect, useMemo, useReducer, type ReactNode } from 'react';
import { getMission } from '../data/missions';
import { getPlant } from '../data/plants';
import { applyMissionToPlant, applyProject, type MissionPayload } from '../engine/effects';
import { CERTS, applyMissionResult, certStatus, promotionStatus } from '../engine/progression';
import { applyPressureOption, createPlantState, simulateMonth } from '../engine/simulation';
import { TAKEOVER_MONTHS, startTakeover, takeoverVerdict } from '../engine/takeover';
import type { CertId, GameState, ModePolicy, PlantDef, PlantState, PressureOption, SparePolicy, StepResult } from '../engine/types';
import { LocalStorageRepository, SAVE_VERSION } from './persistence';
import { newPlayer } from '../engine/progression';

export type Action =
  | { type: 'new'; name: string; seed?: number }
  | { type: 'load'; state: GameState }
  | { type: 'reset' }
  | { type: 'advance' }
  | { type: 'decide'; option: PressureOption }
  | { type: 'policy'; key: string; policy: Partial<ModePolicy> }
  | { type: 'spare'; partId: string; policy: SparePolicy }
  | { type: 'project'; id: string }
  | { type: 'mission'; missionId: string; steps: StepResult[]; payload?: MissionPayload }
  | { type: 'certify'; cert: CertId }
  | { type: 'promote' }
  | { type: 'takeover-start' }
  | { type: 'takeover-abandon' }
  | { type: 'toast-clear' };

export interface UiState {
  game: GameState | null;
  toasts: { id: number; text: string; kind: 'info' | 'success' | 'warn' }[];
}

const repo = new LocalStorageRepository();

/** Site actif : l'usine principale, ou la cimenterie pendant l'épreuve finale. */
export function activeSite(g: GameState): { def: PlantDef; plant: PlantState; isTakeover: boolean } {
  if (g.takeover && !g.takeover.finished) return { def: getPlant(g.takeover.plantId), plant: g.takeover.plant, isTakeover: true };
  return { def: getPlant(g.plant.plantId), plant: g.plant, isTakeover: false };
}

function withActivePlant(g: GameState, plant: PlantState): GameState {
  if (g.takeover && !g.takeover.finished) return { ...g, takeover: { ...g.takeover, plant } };
  return { ...g, plant };
}

let toastId = 1;
const toast = (s: UiState, text: string, kind: 'info' | 'success' | 'warn' = 'info'): UiState['toasts'] => [...s.toasts, { id: toastId++, text, kind }].slice(-4);

function reducer(s: UiState, a: Action): UiState {
  if (a.type === 'new') {
    const seed = a.seed ?? Math.floor(Math.random() * 1e9);
    const game: GameState = {
      version: SAVE_VERSION,
      player: newPlayer(a.name),
      plant: createPlantState(getPlant('douala'), seed),
      settings: { sound: false, reducedMotion: false },
    };
    return { game, toasts: [] };
  }
  if (a.type === 'load') return { ...s, game: a.state };
  if (a.type === 'reset') {
    repo.clear();
    return { game: null, toasts: [] };
  }
  if (a.type === 'toast-clear') return { ...s, toasts: s.toasts.slice(1) };
  const g = s.game;
  if (!g) return s;
  const { def, plant, isTakeover } = activeSite(g);

  switch (a.type) {
    case 'advance': {
      if (plant.pendingDecision) return { ...s, toasts: toast(s, 'Une décision urgente vous attend.', 'warn') };
      const out = simulateMonth(def, plant);
      let next = withActivePlant(g, out.state);
      let toasts = s.toasts;
      if (isTakeover && out.state.month >= TAKEOVER_MONTHS && next.takeover) {
        const verdict = takeoverVerdict(next);
        next = { ...next, takeover: { ...next.takeover!, finished: true, verdict } };
        const meta = getMission('takeover')!;
        const step: StepResult = { stepId: 'verdict', score: verdict.score, attempts: 1, hints: 0, skills: meta.skills, errorTags: [], reasoning: [] };
        const r = applyMissionResult(next.player, meta, [step], next.plant.month);
        next = { ...next, player: r.player };
        toasts = toast(s, verdict.passed ? 'TAKE OVER réussi ! Le Comité Exécutif valide votre redressement.' : 'TAKE OVER échoué. Analysez le verdict et retentez.', verdict.passed ? 'success' : 'warn');
      }
      return { game: next, toasts };
    }
    case 'decide': {
      const ev = plant.pendingDecision;
      if (!ev) return s;
      let next = withActivePlant(g, applyPressureOption(def, plant, ev.title, a.option));
      if (a.option.effects.skill) {
        const player = structuredClone(next.player);
        for (const [k, v] of Object.entries(a.option.effects.skill)) {
          const key = k as keyof typeof player.skills;
          player.skills[key] = Math.max(0, Math.min(100, player.skills[key] + (v ?? 0)));
        }
        next = { ...next, player };
      }
      return { ...s, game: next, toasts: toast(s, a.option.effects.message, 'info') };
    }
    case 'policy': {
      const p = structuredClone(plant);
      p.modes[a.key].policy = { ...p.modes[a.key].policy, ...a.policy };
      return { ...s, game: withActivePlant(g, p) };
    }
    case 'spare': {
      const p = structuredClone(plant);
      p.sparePolicy[a.partId] = a.policy;
      return { ...s, game: withActivePlant(g, p) };
    }
    case 'project': {
      return { ...s, game: withActivePlant(g, applyProject(def, plant, a.id)), toasts: toast(s, 'Projet lancé. Coût imputé au mois prochain.', 'success') };
    }
    case 'mission': {
      const meta = getMission(a.missionId);
      if (!meta) return s;
      const r = applyMissionResult(g.player, meta, a.steps, g.plant.month);
      const mainDef = getPlant(g.plant.plantId);
      const eff = applyMissionToPlant(mainDef, g.plant, a.missionId, r.result.score, a.payload);
      let toasts = toast(s, `Mission terminée : score ${r.result.score}/100, +${r.xpGain} XP`, 'success');
      for (const b of r.newBadges) toasts = [...toasts, { id: toastId++, text: `Badge : ${b}`, kind: 'success' as const }];
      return { game: { ...g, player: r.player, plant: eff.plant }, toasts: toasts.slice(-4) };
    }
    case 'certify': {
      const c = CERTS.find((x) => x.id === a.cert)!;
      if (!certStatus(g, c).eligible || g.player.certifications.includes(c.id)) return s;
      const player = { ...g.player, certifications: [...g.player.certifications, c.id], xp: g.player.xp + 100 };
      return { game: { ...g, player }, toasts: toast(s, `Certification ${c.name} — ${c.title} obtenue ! +100 XP`, 'success') };
    }
    case 'promote': {
      const st = promotionStatus(g);
      if (!st.eligible || !st.next) return s;
      const player = { ...g.player, level: st.next.level, promotions: [...g.player.promotions, { level: st.next.level, month: g.plant.month, at: Date.now() }] };
      return { game: { ...g, player }, toasts: toast(s, `Promotion : ${st.next.title}`, 'success') };
    }
    case 'takeover-start': {
      if (!g.player.certifications.includes('diamond') && g.player.level < 8) return s;
      return { game: { ...g, takeover: startTakeover(g.plant.seed + 777 + (g.player.attempts.takeover ?? 0)) }, toasts: toast(s, 'Vous prenez la direction de la cimenterie. 12 mois.', 'info') };
    }
    case 'takeover-abandon':
      return { ...s, game: { ...g, takeover: undefined } };
  }
  return s;
}

interface Ctx {
  state: UiState;
  dispatch: (a: Action) => void;
}

const GameCtx = createContext<Ctx | null>(null);

export function GameProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, () => ({ game: repo.load(), toasts: [] }));
  useEffect(() => {
    if (state.game) repo.save(state.game);
  }, [state.game]);
  const value = useMemo(() => ({ state, dispatch }), [state]);
  return <GameCtx.Provider value={value}>{children}</GameCtx.Provider>;
}

export function useGame() {
  const c = useContext(GameCtx);
  if (!c) throw new Error('GameProvider manquant');
  return c;
}

/** Accès au jeu (garanti non nul dans les écrans de jeu). */
export function useGameState(): { game: GameState; dispatch: (a: Action) => void } {
  const { state, dispatch } = useGame();
  return { game: state.game!, dispatch };
}
