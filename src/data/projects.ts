/**
 * Projets d'amélioration finançables depuis l'écran Usine.
 * Règle pédagogique : on ne corrige pas une cause qu'on n'a pas identifiée.
 * Les projets « cause latente » exigent un diagnostic ou une mission préalable.
 */
export interface ProjectDef {
  id: string;
  plantId: string;
  title: string;
  description: string;
  cost: number;
  requires?: string[]; // ids de missions (préfixe m:) ou projets / unlocks (préfixe u:)
  effect: {
    dataQuality?: number;
    morale?: number;
    technicians?: number;
    resolveDefect?: string;
    unlock?: string;
    trust?: number;
    purgeObsolete?: boolean;
  };
}

const M = 1_000_000;

export const PROJECTS: ProjectDef[] = [
  // ---------------------------------------------------------------- Douala
  { id: 'dla-data-gov', plantId: 'douala', title: 'Gouvernance des données GMAO', description: 'Codification des pannes (mode/cause/action), saisie mobile des OT, revue hebdomadaire de la qualité des données.', cost: 6 * M, requires: ['m:gmao-onboarding'], effect: { dataQuality: 15, trust: 2 } },
  { id: 'dla-training', plantId: 'douala', title: 'Académie technique (montage roulements, alignement, graissage)', description: 'Formation certifiante de 14 techniciens avec un centre de formation local.', cost: 8 * M, effect: { morale: 12, dataQuality: 3 } },
  { id: 'dla-recruit', plantId: 'douala', title: 'Recruter 2 techniciens (dont 1 analyste vibratoire)', description: 'Augmente la capacité, mais la masse salariale aussi.', cost: 4 * M, effect: { technicians: 2 } },
  { id: 'dla-pdm-platform', plantId: 'douala', title: 'Plateforme de surveillance en ligne (35 M FCFA)', description: 'Capteurs vibratoires/thermiques sans fil sur 6 équipements critiques, plateforme d’analyse.', cost: 35 * M, requires: ['m:comite-pdm'], effect: { unlock: 'PDM' } },
  { id: 'dla-p101b', plantId: 'douala', title: 'Installer une pompe de secours P-101B', description: 'Redondance 2×100 % sur l’eau de brassage.', cost: 28 * M, requires: ['m:systemes-froid'], effect: { unlock: 'REDUNDANCY:P-101' } },
  // ---------------------------------------------------------------- Cimenterie (Take over)
  { id: 'cem-diagnostic', plantId: 'cement', title: 'Diagnostic de reprise (30 jours)', description: 'Pareto des pertes, audit terrain, entretiens : révèle les causes latentes de l’usine.', cost: 5 * M, effect: { unlock: 'DIAGNOSTIC', trust: 3 } },
  { id: 'cem-kiln', plantId: 'cement', title: 'Contrôle et réglage de l’axe du four', description: 'Mesure d’ovalité, alignement des galets, suivi thermographique de virole.', cost: 25 * M, requires: ['u:DIAGNOSTIC'], effect: { resolveDefect: 'KILN-ALIGN' } },
  { id: 'cem-dust', plantId: 'cement', title: 'Programme étanchéité poussière', description: 'Capotages, joints de paliers, dépoussiéreurs remis en état.', cost: 18 * M, requires: ['u:DIAGNOSTIC'], effect: { resolveDefect: 'DUST-SEAL', morale: 3 } },
  { id: 'cem-oil', plantId: 'cement', title: 'Programme d’analyse d’huile', description: 'Prélèvements mensuels sur réducteurs, filtration, laboratoire partenaire.', cost: 6 * M, requires: ['u:DIAGNOSTIC'], effect: { resolveDefect: 'OIL-CTRL', dataQuality: 3 } },
  { id: 'cem-data', plantId: 'cement', title: 'Reconstruction de la GMAO', description: 'Arborescence, codification, historique repris, saisie mobile, revue qualité hebdomadaire.', cost: 12 * M, effect: { dataQuality: 40 } },
  { id: 'cem-purge', plantId: 'cement', title: 'Liquidation du stock obsolète', description: 'Vente/ferraillage des pièces obsolètes après revue technique.', cost: 1 * M, effect: { purgeObsolete: true, trust: 4 } },
  { id: 'cem-pdm', plantId: 'cement', title: 'Surveillance en ligne équipements critiques', description: 'Four, ventilateur, broyeurs.', cost: 60 * M, requires: ['u:DIAGNOSTIC'], effect: { unlock: 'PDM' } },
  { id: 'cem-people', plantId: 'cement', title: 'Plan managérial (rituels, reconnaissance, polyvalence)', description: 'Réunions courtes quotidiennes, matrice de compétences, primes collectives liées aux KPI.', cost: 8 * M, effect: { morale: 20, trust: 2 } },
  { id: 'cem-recruit', plantId: 'cement', title: 'Recruter 3 techniciens', description: '', cost: 6 * M, effect: { technicians: 3 } },
];
