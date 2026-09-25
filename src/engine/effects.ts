/**
 * Conséquences des missions et des projets sur l'usine simulée.
 * C'est le lien entre « apprendre » et « performer » : une RCA réussie
 * élimine réellement une cause latente dans le moteur de simulation.
 */
import { PROJECTS, type ProjectDef } from '../data/projects';
import { allModes, clamp } from './simulation';
import type { ModePolicy, PlantDef, PlantState, SparePolicy } from './types';

export interface MissionPayload {
  /** Crise : impacts directs */
  loss?: number;
  cost?: number;
  trust?: number;
  safety?: number;
  /** Magasin : articles à purger et nouvelles politiques */
  purge?: string[];
  sparePolicies?: Record<string, SparePolicy>;
  /** Politiques proposées (RCM, P-F) — appliquées si le joueur l'accepte */
  policies?: Record<string, Partial<ModePolicy>>;
  /** Investissement choisi */
  choice?: string;
}

export function applyMissionToPlant(def: PlantDef, prev: PlantState, missionId: string, score: number, payload: MissionPayload = {}): { plant: PlantState; messages: string[] } {
  const p: PlantState = structuredClone(prev);
  const msgs: string[] = [];
  const success = score >= 60;
  const resolve = (defectId: string) => {
    const d = def.latentDefects.find((x) => x.id === defectId);
    if (d && !p.resolvedDefects.includes(defectId)) {
      p.resolvedDefects.push(defectId);
      p.resolvedAt[defectId] = p.month;
      p.rcaClosed += 1;
      msgs.push(`Cause latente éliminée : ${d.label}. Les modes concernés retrouvent leur durée de vie intrinsèque.`);
    }
  };

  switch (missionId) {
    case 'gmao-onboarding':
      if (success) {
        p.dataQuality = clamp(p.dataQuality + 18);
        msgs.push('Qualité des données GMAO +18 pts.');
      }
      break;
    case 'kpi-basics':
      if (success) {
        p.dataQuality = clamp(p.dataQuality + 4);
        p.directionTrust = clamp(p.directionTrust + 3);
        msgs.push('Vos indicateurs sont désormais la référence en réunion de production.');
      }
      break;
    case 'weibull-p101':
      if (success) {
        p.dataQuality = clamp(p.dataQuality + 5);
        p.unlocks.push('WEIBULL-VIEW');
        msgs.push('Les estimations β/η sont affichées pour chaque mode dans l’écran Usine.');
      }
      break;
    case 'amdec-pasteurisateur':
      if (success) resolve('SCALING');
      break;
    case 'rcm-p101':
      if (success) resolve('ALIGN');
      break;
    case 'rca-convoyeur':
      p.rcaOpened += 1;
      if (success) resolve('LUBRIF');
      break;
    case 'spares-magasin':
      if (success) resolve('SEAL-REF');
      for (const id of payload.purge ?? []) {
        const part = def.parts.find((x) => x.id === id);
        if (part && p.stock[id]) {
          msgs.push(`Article ${part.ref} liquidé (${p.stock[id]} u.).`);
          p.stock[id] = 0;
          p.sparePolicy[id] = { min: 0, max: 0 };
        }
      }
      for (const [id, pol] of Object.entries(payload.sparePolicies ?? {})) p.sparePolicy[id] = pol;
      break;
    case 'crise-soutireuse':
    case 'comite-pdm':
    case 'systemes-froid':
    case 'tco-compresseur':
      break;
  }
  if (missionId === 'comite-pdm' && success) {
    p.directionTrust = clamp(p.directionTrust + 8);
    msgs.push('Le comité approuve le budget de surveillance en ligne : le projet est disponible dans l’écran Usine.');
  }
  if (missionId === 'tco-compresseur' && payload.choice) {
    const good = payload.choice === 'C' || payload.choice === 'B';
    p.directionTrust = clamp(p.directionTrust + (good ? 4 : -3));
  }
  if (payload.trust) p.directionTrust = clamp(p.directionTrust + payload.trust);
  if (payload.safety) p.safetyIndex = clamp(p.safetyIndex + payload.safety);
  if (payload.loss || payload.cost) {
    p.pendingSpend += (payload.cost ?? 0);
    const k = p.kpis.at(-1);
    if (k && payload.loss) p.kpis = [...p.kpis.slice(0, -1), { ...k, productionLoss: k.productionLoss + payload.loss }];
    msgs.push(`Impact crise : pertes ${(((payload.loss ?? 0) / 1e6)).toFixed(0)} M FCFA, surcoûts ${(((payload.cost ?? 0) / 1e6)).toFixed(0)} M FCFA.`);
  }
  for (const [key, pol] of Object.entries(payload.policies ?? {})) {
    if (p.modes[key]) p.modes[key].policy = { ...p.modes[key].policy, ...pol };
  }
  if (msgs.length) p.journal.push({ month: p.month, kind: 'succes', text: msgs.join(' ') });
  return { plant: p, messages: msgs };
}

export function projectAvailability(proj: ProjectDef, plant: PlantState, missions: Record<string, { score: number }>): { ok: boolean; reason?: string } {
  if (plant.projects.includes(proj.id)) return { ok: false, reason: 'Réalisé' };
  for (const r of proj.requires ?? []) {
    if (r.startsWith('m:')) {
      const m = missions[r.slice(2)];
      if (!m || m.score < 60) return { ok: false, reason: 'Nécessite la mission associée (score ≥ 60)' };
    }
    if (r.startsWith('u:') && !plant.unlocks.includes(r.slice(2))) return { ok: false, reason: 'Nécessite le diagnostic préalable' };
  }
  return { ok: true };
}

export function applyProject(def: PlantDef, prev: PlantState, projectId: string): PlantState {
  const proj = PROJECTS.find((x) => x.id === projectId);
  if (!proj) return prev;
  const p: PlantState = structuredClone(prev);
  const e = proj.effect;
  p.projects.push(proj.id);
  p.pendingSpend += proj.cost;
  if (e.dataQuality) p.dataQuality = clamp(p.dataQuality + e.dataQuality);
  if (e.morale) p.teamMorale = clamp(p.teamMorale + e.morale);
  if (e.technicians) p.technicians += e.technicians;
  if (e.trust) p.directionTrust = clamp(p.directionTrust + e.trust);
  if (e.unlock && !p.unlocks.includes(e.unlock)) p.unlocks.push(e.unlock);
  if (e.resolveDefect && !p.resolvedDefects.includes(e.resolveDefect)) {
    p.resolvedDefects.push(e.resolveDefect);
    p.resolvedAt[e.resolveDefect] = p.month;
  }
  if (e.purgeObsolete) for (const part of def.parts) if (part.obsolete) p.stock[part.id] = 0;
  p.journal.push({ month: p.month, kind: 'decision', text: `Projet lancé : ${proj.title} (${(proj.cost / 1e6).toFixed(0)} M FCFA).` });
  return p;
}

/** Nombre de modes dont la politique est manifestement inadaptée (aide pédagogique). */
export function policyWarnings(def: PlantDef, plant: PlantState): { key: string; text: string }[] {
  const out: { key: string; text: string }[] = [];
  for (const { eq, mode, key } of allModes(def)) {
    const pol = plant.modes[key].policy;
    if (pol.strategy === 'PM' && mode.beta <= 1.1)
      out.push({ key, text: `${eq.tag} — ${mode.name} : préventif systématique sur un mode sans usure (β≈${mode.beta <= 0.9 ? '<1' : '1'}).` });
    if ((pol.strategy === 'CBM' || pol.strategy === 'PDM') && !mode.pf)
      out.push({ key, text: `${eq.tag} — ${mode.name} : aucune dégradation détectable, la surveillance ne sert à rien.` });
    if (pol.strategy === 'CBM' && mode.pf && pol.inspInterval > mode.pf)
      out.push({ key, text: `${eq.tag} — ${mode.name} : intervalle d'inspection (${pol.inspInterval} h) > P-F (${mode.pf} h).` });
    if (pol.strategy === 'PDM' && !plant.unlocks.includes('PDM'))
      out.push({ key, text: `${eq.tag} — prédictif sélectionné sans plateforme installée.` });
  }
  return out;
}
