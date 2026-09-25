import type { EquipmentDef, PlantDef, SparePartDef } from '../engine/types';

/**
 * AFRICA INDUSTRIAL GROUP — Brasserie de Douala (Cameroun).
 * Usine de taille moyenne « en difficulté » : causes latentes non traitées,
 * préventif mal calibré, stock dormant, GMAO pauvre.
 * Les paramètres β/η représentent la loi de vie intrinsèque des modes ;
 * les causes latentes (latentDefects) les dégradent tant qu'elles ne sont pas éliminées.
 */

const M = 1_000_000;

const breweryEquipment: EquipmentDef[] = [
  {
    tag: 'SOU-L1',
    name: 'Soutireuse bouteilles',
    type: 'Remplisseuse rotative 72 becs',
    lineId: 'L1',
    criticality: 'A',
    lossRate: 5.2 * M,
    redundant: false,
    runHours: 560,
    ageYears: 14,
    manufacturer: 'OEM européen',
    modes: [
      { id: 'vannes', name: 'Usure des vannes de remplissage', mechanism: 'Usure joints / ressorts (abrasion, CIP agressif)', beta: 2.4, eta: 3600, pf: 350, detection: ['process', 'visuel'], mttr: 6, laborHours: 12, partId: 'VAN-SOU', partQty: 1, secondaryDamage: 0.3 },
      { id: 'came', name: 'Défaut came de levage', mechanism: 'Chocs bouteilles / fatigue', beta: 1.0, eta: 9500, mttr: 5, laborHours: 8, secondaryDamage: 0.2 },
      { id: 'sondes', name: 'Dérive sondes de niveau', mechanism: 'Encrassement, humidité (dérive instrumentale)', beta: 0.9, eta: 700, mttr: 1, laborHours: 1.5, secondaryDamage: 0 },
    ],
  },
  {
    tag: 'CONV-L1',
    name: 'Convoyeur bouteilles M-305',
    type: 'Convoyeur à chaîne + motoréducteur 7,5 kW',
    lineId: 'L1',
    criticality: 'A',
    lossRate: 5.2 * M,
    redundant: false,
    runHours: 560,
    ageYears: 11,
    manufacturer: 'Intégrateur local',
    modes: [
      { id: 'roulement', name: 'Casse roulement moteur/réducteur', mechanism: 'Lubrification défaillante (fatigue de surface)', beta: 1.7, eta: 14000, pf: 900, detection: ['vibration', 'thermographie', 'ultrasons'], mttr: 5, laborHours: 8, partId: 'ROUL-6310', partQty: 2, secondaryDamage: 1.5 },
      { id: 'chaine', name: 'Allongement / casse chaîne', mechanism: 'Usure articulations, poussière', beta: 3.0, eta: 8000, pf: 700, detection: ['visuel'], mttr: 4, laborHours: 8, partId: 'CHAINE-CONV', partQty: 1, secondaryDamage: 0.2 },
      { id: 'guides', name: 'Bourrages (guides déréglés)', mechanism: 'Réglages non standardisés aux changements de format', beta: 1.0, eta: 450, mttr: 0.6, laborHours: 1, secondaryDamage: 0 },
    ],
  },
  {
    tag: 'PAST-L1',
    name: 'Pasteurisateur tunnel',
    type: 'Tunnel 9 zones, échangeurs à plaques',
    lineId: 'L1',
    criticality: 'A',
    lossRate: 5.2 * M,
    redundant: false,
    runHours: 560,
    ageYears: 14,
    manufacturer: 'OEM européen',
    modes: [
      { id: 'echangeur', name: 'Encrassement / entartrage échangeur', mechanism: 'Eau dure non traitée, dépôts calcaires', beta: 2.6, eta: 6500, pf: 1200, detection: ['process', 'thermographie'], mttr: 10, laborHours: 20, partId: 'PLAQ-ECH', partQty: 1, secondaryDamage: 0.2 },
      { id: 'pompe', name: 'Fuite garniture pompe de circulation', mechanism: 'Marche à sec / mauvaise référence', beta: 1.3, eta: 7500, pf: 250, detection: ['visuel'], mttr: 4, laborHours: 6, partId: 'GAR-P101', partQty: 1, secondaryDamage: 0.4 },
    ],
  },
  {
    tag: 'LAV-L1',
    name: 'Laveuse bouteilles',
    type: 'Laveuse 4 bains soude',
    lineId: 'L1',
    criticality: 'A',
    lossRate: 5.2 * M,
    redundant: false,
    runHours: 560,
    ageYears: 17,
    manufacturer: 'OEM européen',
    modes: [
      { id: 'paniers', name: 'Casse chaîne de paniers', mechanism: 'Corrosion soude + fatigue', beta: 2.5, eta: 3200, pf: 450, detection: ['visuel', 'courant'], mttr: 8, laborHours: 16, partId: 'CHAINE-LAV', partQty: 1, secondaryDamage: 0.6 },
      { id: 'pompe', name: 'Panne pompe de soude', mechanism: 'Cavitation, garniture', beta: 1.3, eta: 5000, pf: 350, detection: ['vibration', 'visuel'], mttr: 3, laborHours: 5, secondaryDamage: 0.2 },
      { id: 'buses', name: 'Bouchage buses de rinçage', mechanism: 'Débris étiquettes, calcaire', beta: 1.6, eta: 900, pf: 200, detection: ['visuel', 'process'], mttr: 1.2, laborHours: 2, secondaryDamage: 0 },
    ],
  },
  {
    tag: 'CONV-L2',
    name: 'Convoyeur canettes',
    type: 'Convoyeur à tapis modulaire',
    lineId: 'L2',
    criticality: 'B',
    lossRate: 2.0 * M,
    redundant: false,
    runHours: 520,
    ageYears: 6,
    manufacturer: 'Intégrateur local',
    modes: [
      { id: 'bourrages', name: 'Bourrages / chutes canettes', mechanism: 'Transferts mal réglés, lubrification tapis', beta: 1.0, eta: 380, mttr: 0.5, laborHours: 0.8, secondaryDamage: 0 },
    ],
  },
  {
    tag: 'ETQ-L1',
    name: 'Étiqueteuse',
    type: 'Étiqueteuse colle froide',
    lineId: 'L1',
    criticality: 'B',
    lossRate: 2.6 * M,
    redundant: false,
    runHours: 560,
    ageYears: 9,
    manufacturer: 'OEM européen',
    modes: [
      { id: 'tampons', name: 'Usure tampons / palettes colle', mechanism: 'Usure abrasive, réglages', beta: 1.1, eta: 650, mttr: 1.2, laborHours: 2, partId: 'TAMP-ETQ', partQty: 1, secondaryDamage: 0 },
    ],
  },
  {
    tag: 'SER-L2',
    name: 'Sertisseuse canettes',
    type: 'Sertisseuse 12 têtes',
    lineId: 'L2',
    criticality: 'A',
    lossRate: 2.0 * M,
    redundant: false,
    runHours: 520,
    ageYears: 6,
    manufacturer: 'OEM américain',
    modes: [
      { id: 'molettes', name: 'Usure molettes de sertissage', mechanism: 'Usure progressive (profil)', beta: 2.9, eta: 5200, pf: 600, detection: ['process', 'vibration'], mttr: 6, laborHours: 10, partId: 'MOL-SER', partQty: 1, secondaryDamage: 0.5 },
    ],
  },
  {
    tag: 'PAL-L2',
    name: 'Palettiseur',
    type: 'Palettiseur robotisé',
    lineId: 'L2',
    criticality: 'C',
    lossRate: 0.7 * M,
    redundant: false,
    runHours: 520,
    ageYears: 6,
    manufacturer: 'OEM européen',
    modes: [
      { id: 'capteur', name: 'Défaut capteur de présence', mechanism: 'Poussière / humidité (infantile après remplacement)', beta: 0.8, eta: 1400, mttr: 1, laborHours: 1, partId: 'CAPT-PAL', partQty: 1, secondaryDamage: 0 },
    ],
  },
  {
    tag: 'P-101',
    name: 'Pompe eau de brassage P-101',
    type: 'Pompe centrifuge 45 kW',
    lineId: 'BRA',
    criticality: 'A',
    lossRate: 1.8 * M,
    redundant: false,
    runHours: 600,
    ageYears: 12,
    manufacturer: 'OEM européen',
    modes: [
      { id: 'garniture', name: 'Fuite garniture mécanique', mechanism: 'Désalignement, marche à sec', beta: 1.5, eta: 7000, pf: 300, detection: ['visuel', 'ultrasons'], mttr: 5, laborHours: 8, partId: 'GAR-P101', partQty: 1, secondaryDamage: 0.3 },
      { id: 'roulement', name: 'Dégradation roulement palier DE', mechanism: 'Désalignement + lubrification', beta: 1.9, eta: 18000, pf: 1500, detection: ['vibration', 'thermographie', 'huile'], mttr: 6, laborHours: 10, partId: 'ROUL-6310', partQty: 2, secondaryDamage: 1.2 },
    ],
  },
  {
    tag: 'AGI-BRA',
    name: 'Agitateur cuve-matière',
    type: 'Motoréducteur 22 kW',
    lineId: 'BRA',
    criticality: 'B',
    lossRate: 1.2 * M,
    redundant: false,
    runHours: 400,
    ageYears: 18,
    manufacturer: 'OEM européen',
    modes: [
      { id: 'roulement', name: 'Roulement réducteur', mechanism: 'Lubrification / charge', beta: 1.8, eta: 20000, pf: 2000, detection: ['vibration', 'huile'], mttr: 8, laborHours: 12, partId: 'ROUL-6310', partQty: 2, secondaryDamage: 1 },
    ],
  },
  {
    tag: 'C-201',
    name: 'Compresseur frigorifique NH3 C-201',
    type: 'Compresseur à pistons 250 kW',
    lineId: 'UTI',
    criticality: 'A',
    lossRate: 6.0 * M,
    redundant: true,
    runHours: 650,
    ageYears: 16,
    manufacturer: 'OEM européen',
    modes: [
      { id: 'clapets', name: 'Casse clapets', mechanism: 'Fatigue, coups de liquide', beta: 2.4, eta: 9000, pf: 1400, detection: ['vibration', 'process'], mttr: 12, laborHours: 16, partId: 'CLAP-C201', partQty: 1, secondaryDamage: 0.8 },
      { id: 'fuite', name: 'Fuite NH3 garniture d’arbre', mechanism: 'Usure garniture, huile dégradée', beta: 1.2, eta: 22000, pf: 700, detection: ['ultrasons', 'process'], mttr: 10, laborHours: 12, partId: 'GAR-C201', partQty: 1, secondaryDamage: 0.5, hse: true },
      { id: 'roulements', name: 'Roulements vilebrequin', mechanism: 'Fatigue, contamination huile', beta: 1.8, eta: 26000, pf: 2200, detection: ['vibration', 'huile'], mttr: 24, laborHours: 40, partId: 'ROUL-C201', partQty: 1, secondaryDamage: 1.5 },
    ],
  },
  {
    tag: 'CH-301',
    name: 'Chaudière vapeur CH-301',
    type: 'Chaudière à tubes de fumée 8 t/h',
    lineId: 'UTI',
    criticality: 'A',
    lossRate: 4.5 * M,
    redundant: false,
    runHours: 650,
    ageYears: 20,
    manufacturer: 'OEM européen',
    modes: [
      { id: 'bruleur', name: 'Défaut brûleur / encrassement', mechanism: 'Fioul lourd de qualité variable', beta: 2.0, eta: 2200, pf: 500, detection: ['process', 'visuel'], mttr: 5, laborHours: 8, partId: 'BRUL-CH', partQty: 1, secondaryDamage: 0.1 },
      { id: 'tubes', name: 'Percement tubes de fumée', mechanism: 'Entartrage + corrosion (eau non traitée)', beta: 3.5, eta: 32000, pf: 4000, detection: ['process', 'visuel'], mttr: 72, laborHours: 120, partId: 'TUBE-CH', partQty: 1, secondaryDamage: 0.5, hse: true },
      { id: 'alim', name: 'Panne pompe alimentaire', mechanism: 'Cavitation, garniture', beta: 1.3, eta: 11000, pf: 400, detection: ['vibration', 'process'], mttr: 8, laborHours: 10, partId: 'POMP-ALIM', partQty: 1, secondaryDamage: 0.1 },
    ],
  },
  {
    tag: 'AC-401',
    name: "Compresseur d'air AC-401",
    type: 'Compresseur à vis 110 kW',
    lineId: 'UTI',
    criticality: 'A',
    lossRate: 5.2 * M,
    redundant: true,
    runHours: 680,
    ageYears: 10,
    manufacturer: 'OEM européen',
    modes: [
      { id: 'filtres', name: 'Colmatage filtres / séparateur', mechanism: 'Poussière, chaleur tropicale', beta: 3.0, eta: 4000, pf: 500, detection: ['process'], mttr: 2, laborHours: 3, partId: 'FILT-AC', partQty: 1, secondaryDamage: 0.1 },
      { id: 'bloc', name: 'Grippage bloc vis', mechanism: 'Dégradation huile / roulements', beta: 2.1, eta: 36000, pf: 3000, detection: ['vibration', 'huile', 'thermographie'], mttr: 48, laborHours: 30, partId: 'BLOC-VIS', partQty: 1, secondaryDamage: 0.3 },
    ],
  },
  {
    tag: 'GE-501',
    name: 'Groupe électrogène GE-501',
    type: 'Diesel 1 250 kVA (secours réseau)',
    lineId: 'UTI',
    criticality: 'A',
    lossRate: 5.2 * M,
    redundant: false,
    runHours: 720, // exposition en veille : la défaillance cachée évolue même à l'arrêt
    ageYears: 8,
    manufacturer: 'OEM européen',
    modes: [
      { id: 'demarrage', name: 'Refus de démarrage (défaillance cachée)', mechanism: 'Batteries, démarreur, gasoil contaminé', beta: 1.0, eta: 3000, pf: 150, detection: ['process'], mttr: 6, laborHours: 6, partId: 'BATT-GE', partQty: 1, secondaryDamage: 0, hidden: true },
    ],
  },
  {
    tag: 'TGBT-601',
    name: 'Poste de livraison / TGBT',
    type: 'Transformateur 2,5 MVA + TGBT',
    lineId: 'UTI',
    criticality: 'A',
    lossRate: 9 * M,
    redundant: false,
    runHours: 720,
    ageYears: 15,
    manufacturer: 'OEM européen',
    modes: [
      { id: 'connexions', name: 'Échauffement connexions', mechanism: 'Desserrage, humidité, corrosion', beta: 2.0, eta: 45000, pf: 2500, detection: ['thermographie'], mttr: 8, laborHours: 10, secondaryDamage: 2, hse: true },
    ],
  },
  {
    tag: 'STEP-701',
    name: 'Surpresseur station d’épuration',
    type: 'Surpresseur à lobes 30 kW',
    lineId: 'ENV',
    criticality: 'B',
    lossRate: 0.4 * M,
    redundant: false,
    runHours: 700,
    ageYears: 7,
    manufacturer: 'OEM asiatique',
    modes: [
      { id: 'courroies', name: 'Rupture courroies', mechanism: 'Tension / alignement poulies', beta: 2.2, eta: 1800, pf: 400, detection: ['visuel', 'vibration'], mttr: 1.5, laborHours: 2, partId: 'COUR-STEP', partQty: 1, secondaryDamage: 0, hse: true },
    ],
  },
];

const breweryParts: SparePartDef[] = [
  { id: 'VAN-SOU', ref: 'KIT-VRF-72', name: 'Kit vannes de remplissage (72)', unitCost: 6.5 * M, leadDays: 90, expressDays: 10, expressPremium: 1.8, critical: true },
  { id: 'ROUL-6310', ref: 'SKF 6310 C3', name: 'Roulement 6310 C3', unitCost: 0.085 * M, leadDays: 30, expressDays: 2, expressPremium: 1.3, critical: false, local: true },
  { id: 'ROUL-6310-2RS', ref: '6310-2RS', name: 'Roulement 6310-2RS (étanche) — doublon mal codé', unitCost: 0.07 * M, leadDays: 30, expressDays: 2, expressPremium: 1.3, critical: false, duplicateOf: 'ROUL-6310', local: true },
  { id: 'CHAINE-CONV', ref: 'CH-1873-10M', name: 'Chaîne convoyeur (10 m)', unitCost: 2.8 * M, leadDays: 60, expressDays: 9, expressPremium: 1.9, critical: true },
  { id: 'MOTRED-305', ref: 'MR-7.5-i40', name: 'Motoréducteur complet 7,5 kW (pièce d’assurance)', unitCost: 9 * M, leadDays: 84, expressDays: 12, expressPremium: 1.6, critical: true },
  { id: 'PLAQ-ECH', ref: 'PHE-M15', name: 'Jeu de plaques échangeur pasteurisateur', unitCost: 7 * M, leadDays: 90, expressDays: 14, expressPremium: 1.7, critical: true },
  { id: 'GAR-P101', ref: 'MS-45-EPDM', name: 'Garniture mécanique 45 mm', unitCost: 1.2 * M, leadDays: 75, expressDays: 8, expressPremium: 2.2, critical: true },
  { id: 'GAR-P101-OLD', ref: 'MS-45-NBR', name: 'Garniture 45 mm NBR (ancienne réf., incompatible CIP)', unitCost: 1.0 * M, leadDays: 75, expressDays: 8, expressPremium: 2.2, critical: false, duplicateOf: 'GAR-P101', obsolete: true },
  { id: 'CHAINE-LAV', ref: 'CH-LAV-P', name: 'Tronçon chaîne paniers laveuse', unitCost: 3.6 * M, leadDays: 90, expressDays: 10, expressPremium: 1.9, critical: true },
  { id: 'TAMP-ETQ', ref: 'PAD-ETQ-6', name: 'Jeu de tampons étiqueteuse', unitCost: 0.25 * M, leadDays: 45, expressDays: 6, expressPremium: 1.8, critical: false },
  { id: 'MOL-SER', ref: 'SEAM-R12', name: 'Jeu de molettes de sertissage', unitCost: 4.5 * M, leadDays: 70, expressDays: 9, expressPremium: 2.0, critical: true },
  { id: 'CAPT-PAL', ref: 'PX-18', name: 'Capteur de présence M18', unitCost: 0.12 * M, leadDays: 20, expressDays: 2, expressPremium: 1.2, critical: false, local: true },
  { id: 'CLAP-C201', ref: 'VK-250', name: 'Kit clapets compresseur NH3', unitCost: 3.2 * M, leadDays: 90, expressDays: 10, expressPremium: 2.0, critical: true },
  { id: 'GAR-C201', ref: 'SS-C250', name: 'Garniture d’arbre compresseur NH3', unitCost: 5.5 * M, leadDays: 90, expressDays: 10, expressPremium: 2.0, critical: true },
  { id: 'ROUL-C201', ref: 'BRG-KIT-C250', name: 'Jeu de roulements compresseur NH3', unitCost: 2.4 * M, leadDays: 90, expressDays: 10, expressPremium: 2.0, critical: true },
  { id: 'BRUL-CH', ref: 'BRN-KIT-8T', name: 'Kit maintenance brûleur', unitCost: 1.8 * M, leadDays: 45, expressDays: 7, expressPremium: 1.7, critical: true },
  { id: 'TUBE-CH', ref: 'TUB-CH-LOT', name: 'Lot de tubes de fumée + mandrinage', unitCost: 22 * M, leadDays: 120, expressDays: 25, expressPremium: 1.5, critical: true },
  { id: 'POMP-ALIM', ref: 'PA-8T', name: 'Pompe alimentaire complète (assurance)', unitCost: 14 * M, leadDays: 120, expressDays: 21, expressPremium: 1.5, critical: true },
  { id: 'FILT-AC', ref: 'FK-110', name: 'Kit filtres + séparateur compresseur', unitCost: 0.45 * M, leadDays: 30, expressDays: 4, expressPremium: 1.4, critical: false, local: true },
  { id: 'BLOC-VIS', ref: 'AE-110', name: 'Bloc vis compresseur (échange standard)', unitCost: 38 * M, leadDays: 150, expressDays: 30, expressPremium: 1.4, critical: true },
  { id: 'BATT-GE', ref: 'BAT-24V', name: 'Batteries de démarrage 24 V', unitCost: 0.6 * M, leadDays: 15, expressDays: 1, expressPremium: 1.2, critical: false, local: true },
  { id: 'COUR-STEP', ref: 'SPB-2000', name: 'Jeu de courroies SPB', unitCost: 0.09 * M, leadDays: 20, expressDays: 1, expressPremium: 1.2, critical: false, local: true },
  { id: 'MOT-90-L0', ref: 'MOT-90KW-1998', name: 'Moteur 90 kW ancienne ligne L0 (démantelée)', unitCost: 18 * M, leadDays: 90, expressDays: 30, expressPremium: 1.3, critical: false, obsolete: true },
  { id: 'KIT-KHS-98', ref: 'SOU-1998-KIT', name: 'Pièces ancienne soutireuse 1998', unitCost: 26 * M, leadDays: 180, expressDays: 60, expressPremium: 1.3, critical: false, obsolete: true },
];

export const BREWERY: PlantDef = {
  id: 'douala',
  name: 'Brasserie AIG de Douala',
  site: 'Douala — zone industrielle de Bassa',
  country: 'Cameroun',
  region: 'Afrique',
  sector: 'Brasserie',
  currency: 'FCFA',
  lines: [
    { id: 'BRA', name: 'Salle de brassage', rate: 90, unit: 'hL', marginPerUnit: 20000 },
    { id: 'L1', name: 'Ligne 1 — Embouteillage verre', rate: 260, unit: 'hL', marginPerUnit: 20000 },
    { id: 'L2', name: 'Ligne 2 — Canettes', rate: 100, unit: 'hL', marginPerUnit: 20000 },
    { id: 'UTI', name: 'Utilités (froid, vapeur, air, énergie)', rate: 0, unit: '', marginPerUnit: 0 },
    { id: 'ENV', name: 'Environnement (STEP)', rate: 0, unit: '', marginPerUnit: 0 },
  ],
  equipment: breweryEquipment,
  parts: breweryParts,
  latentDefects: [
    {
      id: 'LUBRIF',
      label: 'Absence de standard de graissage + graisse incompatible (doublon article)',
      etaFactor: 0.33,
      modes: ['CONV-L1:roulement', 'P-101:roulement', 'AGI-BRA:roulement'],
      resolvedBy: 'rca-convoyeur',
    },
    {
      id: 'ALIGN',
      label: 'Pas d’alignement laser après intervention sur P-101',
      etaFactor: 0.45,
      modes: ['P-101:garniture', 'P-101:roulement'],
      resolvedBy: 'rcm-p101',
    },
    {
      id: 'SCALING',
      label: 'Eau d’appoint non adoucie (entartrage échangeurs & chaudière)',
      etaFactor: 0.5,
      modes: ['PAST-L1:echangeur', 'CH-301:tubes'],
      resolvedBy: 'amdec-pasteurisateur',
    },
    {
      id: 'SEAL-REF',
      label: 'Garnitures NBR montées au lieu d’EPDM (données articles erronées)',
      etaFactor: 0.5,
      modes: ['PAST-L1:pompe', 'P-101:garniture'],
      resolvedBy: 'spares-magasin',
    },
  ],
  laborRate: 12000,
  technicians: 14,
  hoursPerTech: 150,
  monthlyBudget: 62 * M,
  holdingRate: 0.25,
  initialDataQuality: 32,
  initialPolicies: {
    'P-101:roulement': { strategy: 'PM', pmInterval: 4000 }, // plan constructeur recopié
    'C-201:roulements': { strategy: 'PM', pmInterval: 8000 },
    'C-201:clapets': { strategy: 'PM', pmInterval: 5000 },
    'CH-301:bruleur': { strategy: 'PM', pmInterval: 1500 },
    'AC-401:filtres': { strategy: 'PM', pmInterval: 6000 }, // intervalle OEM Europe, inadapté à la poussière
    'ETQ-L1:tampons': { strategy: 'PM', pmInterval: 400 }, // β≈1 : préventif inutile
    'PAL-L2:capteur': { strategy: 'PM', pmInterval: 1500 }, // β<1 : le préventif crée des pannes
    'SER-L2:molettes': { strategy: 'PM', pmInterval: 3500 },
  },
  initialStock: {
    'VAN-SOU': 0,
    'ROUL-6310': 6,
    'ROUL-6310-2RS': 14,
    'CHAINE-CONV': 1,
    'MOTRED-305': 0,
    'PLAQ-ECH': 0,
    'GAR-P101': 1,
    'GAR-P101-OLD': 6,
    'TAMP-ETQ': 8,
    'CHAINE-LAV': 0,
    'MOL-SER': 1,
    'CAPT-PAL': 3,
    'CLAP-C201': 1,
    'GAR-C201': 0,
    'ROUL-C201': 1,
    'BRUL-CH': 2,
    'TUBE-CH': 0,
    'POMP-ALIM': 1,
    'FILT-AC': 2,
    'BLOC-VIS': 1,
    'BATT-GE': 0,
    'COUR-STEP': 2,
    'MOT-90-L0': 2,
    'KIT-KHS-98': 1,
  },
};

/**
 * Site international pour l'épreuve finale « TAKE OVER THE FACTORY » :
 * cimenterie du groupe, maturité faible, stock pléthorique, pression financière.
 */
const cementEquipment: EquipmentDef[] = [
  {
    tag: 'CR-100', name: 'Concasseur primaire', type: 'Concasseur à marteaux 600 t/h', lineId: 'CRU', criticality: 'B', lossRate: 1.5 * M, redundant: false, runHours: 500, ageYears: 22, manufacturer: 'OEM européen',
    modes: [
      { id: 'marteaux', name: 'Usure marteaux', mechanism: 'Abrasion calcaire', beta: 3.2, eta: 1800, pf: 250, detection: ['visuel', 'courant'], mttr: 10, laborHours: 30, partId: 'MART', partQty: 1, secondaryDamage: 0.3 },
      { id: 'rotor', name: 'Roulements rotor', mechanism: 'Poussière, lubrification', beta: 1.6, eta: 15000, pf: 1500, detection: ['vibration', 'thermographie'], mttr: 36, laborHours: 60, partId: 'ROUL-ROT', partQty: 1, secondaryDamage: 1.5 },
    ],
  },
  {
    tag: 'BC-210', name: 'Bande transporteuse calcaire', type: 'Convoyeur 1 200 mm, 800 m', lineId: 'CRU', criticality: 'B', lossRate: 1.5 * M, redundant: false, runHours: 500, ageYears: 15, manufacturer: 'Intégrateur local',
    modes: [
      { id: 'bande', name: 'Déchirure / usure bande', mechanism: 'Chutes de blocs, désalignement', beta: 1.4, eta: 9000, pf: 800, detection: ['visuel'], mttr: 16, laborHours: 40, partId: 'BANDE', partQty: 1, secondaryDamage: 0.2 },
      { id: 'rouleaux', name: 'Grippage rouleaux', mechanism: 'Poussière, étanchéité', beta: 1.1, eta: 3000, pf: 500, detection: ['ultrasons', 'thermographie'], mttr: 2, laborHours: 3, partId: 'ROULEAU', partQty: 4, secondaryDamage: 0.5 },
    ],
  },
  {
    tag: 'BK-300', name: 'Broyeur cru vertical', type: 'Broyeur à galets 3,2 MW', lineId: 'CRU', criticality: 'A', lossRate: 3 * M, redundant: false, runHours: 620, ageYears: 12, manufacturer: 'OEM européen',
    modes: [
      { id: 'galets', name: 'Usure galets / piste', mechanism: 'Abrasion', beta: 3.5, eta: 7000, pf: 1500, detection: ['process', 'vibration'], mttr: 72, laborHours: 200, partId: 'GALETS', partQty: 1, secondaryDamage: 0.2 },
      { id: 'reducteur', name: 'Défaut réducteur principal', mechanism: 'Huile contaminée, fatigue dentures', beta: 2.0, eta: 60000, pf: 5000, detection: ['vibration', 'huile'], mttr: 400, laborHours: 400, partId: 'RED-BK', partQty: 1, secondaryDamage: 1 },
    ],
  },
  {
    tag: 'FOUR-400', name: 'Four rotatif', type: 'Four Ø4,2 × 64 m', lineId: 'CUI', criticality: 'A', lossRate: 7 * M, redundant: false, runHours: 680, ageYears: 25, manufacturer: 'OEM européen',
    modes: [
      { id: 'refractaire', name: 'Point chaud / chute réfractaire', mechanism: 'Croûtage instable, arrêts thermiques', beta: 2.2, eta: 6000, pf: 700, detection: ['thermographie'], mttr: 96, laborHours: 500, partId: 'REFRA', partQty: 1, secondaryDamage: 0.5, hse: true },
      { id: 'galets', name: 'Galets de roulement', mechanism: 'Désalignement axe four', beta: 2.5, eta: 30000, pf: 3000, detection: ['thermographie', 'vibration'], mttr: 48, laborHours: 120, partId: 'GAL-FOUR', partQty: 1, secondaryDamage: 1 },
    ],
  },
  {
    tag: 'VT-450', name: 'Ventilateur de tirage', type: 'Ventilateur 2,5 MW', lineId: 'CUI', criticality: 'A', lossRate: 7 * M, redundant: false, runHours: 680, ageYears: 25, manufacturer: 'OEM européen',
    modes: [
      { id: 'balourd', name: 'Balourd (colmatage pales)', mechanism: 'Dépôts de poussière', beta: 2.8, eta: 2500, pf: 400, detection: ['vibration'], mttr: 8, laborHours: 16, secondaryDamage: 0.5 },
      { id: 'paliers', name: 'Paliers lisses', mechanism: 'Huile / refroidissement', beta: 1.7, eta: 22000, pf: 1800, detection: ['vibration', 'thermographie', 'huile'], mttr: 48, laborHours: 60, partId: 'COUS-VT', partQty: 1, secondaryDamage: 1.5 },
    ],
  },
  {
    tag: 'BC-500', name: 'Broyeur ciment à boulets', type: 'Broyeur 2 compartiments 4 MW', lineId: 'CIM', criticality: 'A', lossRate: 3.5 * M, redundant: false, runHours: 600, ageYears: 18, manufacturer: 'OEM européen',
    modes: [
      { id: 'blindage', name: 'Usure blindages', mechanism: 'Abrasion', beta: 4, eta: 14000, pf: 3000, detection: ['visuel', 'courant'], mttr: 120, laborHours: 400, partId: 'BLIND', partQty: 1, secondaryDamage: 0.1 },
      { id: 'couronne', name: 'Couronne / pignon', mechanism: 'Lubrification, alignement', beta: 2.3, eta: 45000, pf: 4000, detection: ['vibration', 'thermographie'], mttr: 240, laborHours: 300, partId: 'PIGNON', partQty: 1, secondaryDamage: 1 },
    ],
  },
  {
    tag: 'ENS-600', name: 'Ensacheuse rotative', type: 'Ensacheuse 8 becs', lineId: 'EXP', criticality: 'B', lossRate: 1.5 * M, redundant: true, runHours: 450, ageYears: 10, manufacturer: 'OEM européen',
    modes: [
      { id: 'becs', name: 'Usure becs / turbines', mechanism: 'Abrasion ciment', beta: 2.2, eta: 1500, pf: 200, detection: ['process'], mttr: 3, laborHours: 4, partId: 'BECS', partQty: 1, secondaryDamage: 0 },
    ],
  },
  {
    tag: 'CP-700', name: 'Compresseur air instrument', type: 'Vis 75 kW', lineId: 'UTI', criticality: 'A', lossRate: 7 * M, redundant: true, runHours: 700, ageYears: 9, manufacturer: 'OEM européen',
    modes: [
      { id: 'filtres', name: 'Colmatage filtres', mechanism: 'Poussière ciment', beta: 3, eta: 2500, pf: 300, detection: ['process'], mttr: 2, laborHours: 3, partId: 'FILT-CP', partQty: 1, secondaryDamage: 0.1 },
    ],
  },
];

const cementParts: SparePartDef[] = [
  { id: 'MART', ref: 'HAM-SET', name: 'Jeu de marteaux concasseur', unitCost: 12 * M, leadDays: 60, expressDays: 10, expressPremium: 1.5, critical: true, local: true },
  { id: 'ROUL-ROT', ref: '23260 CC', name: 'Roulement rotor concasseur', unitCost: 8 * M, leadDays: 90, expressDays: 14, expressPremium: 1.8, critical: true },
  { id: 'BANDE', ref: 'EP800-1200', name: 'Bande EP800 (100 m)', unitCost: 15 * M, leadDays: 60, expressDays: 20, expressPremium: 1.5, critical: true },
  { id: 'ROULEAU', ref: 'RL-133', name: 'Rouleau porteur Ø133', unitCost: 0.08 * M, leadDays: 20, expressDays: 3, expressPremium: 1.3, critical: false, local: true },
  { id: 'GALETS', ref: 'VRM-ROLL', name: 'Rechargement galets (sous-traitance locale)', unitCost: 45 * M, leadDays: 45, expressDays: 20, expressPremium: 1.4, critical: true, local: true },
  { id: 'RED-BK', ref: 'GB-3200', name: 'Réducteur principal (pièce d’assurance mutualisée groupe)', unitCost: 420 * M, leadDays: 270, expressDays: 120, expressPremium: 1.2, critical: true },
  { id: 'REFRA', ref: 'REF-MAG', name: 'Briques réfractaires (lot 20 m)', unitCost: 60 * M, leadDays: 60, expressDays: 20, expressPremium: 1.4, critical: true },
  { id: 'GAL-FOUR', ref: 'TR-KILN', name: 'Galet de roulement four', unitCost: 85 * M, leadDays: 200, expressDays: 90, expressPremium: 1.3, critical: true },
  { id: 'COUS-VT', ref: 'SLB-VT', name: 'Coussinets paliers ventilateur', unitCost: 6 * M, leadDays: 90, expressDays: 12, expressPremium: 1.8, critical: true },
  { id: 'BLIND', ref: 'LIN-BM', name: 'Blindages broyeur (jeu)', unitCost: 110 * M, leadDays: 150, expressDays: 60, expressPremium: 1.3, critical: true },
  { id: 'PIGNON', ref: 'PIN-BM', name: 'Pignon d’attaque', unitCost: 70 * M, leadDays: 180, expressDays: 70, expressPremium: 1.3, critical: true },
  { id: 'BECS', ref: 'SPT-8', name: 'Jeu de becs ensacheuse', unitCost: 1.5 * M, leadDays: 45, expressDays: 7, expressPremium: 1.6, critical: false },
  { id: 'FILT-CP', ref: 'FK-75', name: 'Kit filtres compresseur', unitCost: 0.35 * M, leadDays: 30, expressDays: 3, expressPremium: 1.3, critical: false, local: true },
  { id: 'OLD-KILN', ref: 'KILN-1999', name: 'Pièces ancien refroidisseur (obsolètes)', unitCost: 140 * M, leadDays: 999, expressDays: 999, expressPremium: 1, critical: false, obsolete: true },
];

export const CEMENT: PlantDef = {
  id: 'cement',
  name: 'Cimenterie AIG — site de reprise',
  site: 'Site international du groupe (contexte à haute pression financière)',
  country: 'International',
  region: 'Moyen-Orient',
  sector: 'Cimenterie',
  currency: 'FCFA',
  lines: [
    { id: 'CRU', name: 'Préparation cru', rate: 0, unit: '', marginPerUnit: 0 },
    { id: 'CUI', name: 'Cuisson (four)', rate: 120, unit: 't clinker', marginPerUnit: 60000 },
    { id: 'CIM', name: 'Broyage ciment', rate: 150, unit: 't', marginPerUnit: 25000 },
    { id: 'EXP', name: 'Expédition', rate: 0, unit: '', marginPerUnit: 0 },
    { id: 'UTI', name: 'Utilités', rate: 0, unit: '', marginPerUnit: 0 },
  ],
  equipment: cementEquipment,
  parts: cementParts,
  latentDefects: [
    { id: 'KILN-ALIGN', label: 'Axe four jamais contrôlé (ovalité, galets)', etaFactor: 0.5, modes: ['FOUR-400:galets', 'FOUR-400:refractaire'], resolvedBy: 'takeover-kiln' },
    { id: 'DUST-SEAL', label: 'Étanchéités poussière dégradées', etaFactor: 0.4, modes: ['BC-210:rouleaux', 'CR-100:rotor', 'VT-450:balourd'], resolvedBy: 'takeover-dust' },
    { id: 'OIL-CTRL', label: 'Aucune analyse d’huile sur réducteurs', etaFactor: 0.5, modes: ['BK-300:reducteur', 'BC-500:couronne', 'VT-450:paliers'], resolvedBy: 'takeover-oil' },
  ],
  laborRate: 15000,
  technicians: 22,
  hoursPerTech: 150,
  monthlyBudget: 180 * M,
  holdingRate: 0.22,
  initialDataQuality: 25,
  initialPolicies: {
    'CR-100:marteaux': { strategy: 'PM', pmInterval: 2500 },
    'BK-300:galets': { strategy: 'PM', pmInterval: 5000 },
    'VT-450:balourd': { strategy: 'PM', pmInterval: 800 },
    'BC-500:blindage': { strategy: 'PM', pmInterval: 8000 },
    'CP-700:filtres': { strategy: 'PM', pmInterval: 4000 },
  },
  initialStock: {
    MART: 1, 'ROUL-ROT': 0, BANDE: 0, ROULEAU: 40, GALETS: 0, 'RED-BK': 0, REFRA: 1, 'GAL-FOUR': 0, 'COUS-VT': 0, BLIND: 1, PIGNON: 1, BECS: 6, 'FILT-CP': 2, 'OLD-KILN': 3,
  },
};

export const PLANTS: Record<string, PlantDef> = { douala: BREWERY, cement: CEMENT };

export function getPlant(id: string): PlantDef {
  return PLANTS[id] ?? BREWERY;
}
