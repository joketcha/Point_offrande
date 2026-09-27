import type { ComponentType } from 'react';
import type { MissionMeta } from '../data/missions';
import { AmdecMission } from './AmdecMission';
import { ComiteMission } from './ComiteMission';
import type { MissionProps } from './common';
import { CrisisMission } from './CrisisMission';
import { DiagnosticMission } from './DiagnosticMission';
import { GmaoMission } from './GmaoMission';
import { KpiMission } from './KpiMission';
import { PfMission } from './PfMission';
import { RcaMission } from './RcaMission';
import { RcmMission } from './RcmMission';
import { SparesMission } from './SparesMission';
import { SystemsMission } from './SystemsMission';
import { TcoMission } from './TcoMission';
import { TakeoverMission } from './TakeoverMission';
import { WeibullMission } from './WeibullMission';

const REGISTRY: Record<string, ComponentType<MissionProps>> = {
  'gmao-onboarding': GmaoMission,
  'kpi-basics': KpiMission,
  'crise-soutireuse': CrisisMission,
  'weibull-p101': WeibullMission,
  'amdec-pasteurisateur': AmdecMission,
  'spares-magasin': SparesMission,
  'rcm-p101': RcmMission,
  'rca-convoyeur': RcaMission,
  'pf-sertisseuse': PfMission,
  'diag-vibratoire': DiagnosticMission,
  'comite-pdm': ComiteMission,
  'systemes-froid': SystemsMission,
  'tco-compresseur': TcoMission,
  takeover: TakeoverMission,
};

export function MissionHost({ meta, onExit }: { meta: MissionMeta; onExit: () => void }) {
  const C = REGISTRY[meta.id];
  if (!C) return <div className="card">Mission en construction.</div>;
  return <C key={meta.id} meta={meta} onExit={onExit} />;
}
