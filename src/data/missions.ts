import type { MentorId, SkillId } from '../engine/types';

export type ModuleId =
  | 'gmao'
  | 'quanti'
  | 'weibull'
  | 'amdec'
  | 'rcm'
  | 'pf'
  | 'diagnostic'
  | 'rca'
  | 'spares'
  | 'crise'
  | 'comite'
  | 'systemes'
  | 'investissement'
  | 'takeover';

export interface MissionMeta {
  id: string;
  module: ModuleId;
  title: string;
  subtitle: string;
  tier: 1 | 2 | 3 | 4 | 5;
  minLevel: number;
  xp: number;
  skills: SkillId[];
  errorTags?: string[];
  equipment?: string;
  briefing: {
    context: string;
    data: string[];
    constraints: string[];
    objectives: string[];
    pressure: string;
  };
  debate: { mentor: MentorId; text: string }[];
  /** Effet sur l'usine simulée si la mission est réussie (score ≥ 60) */
  plantEffect: string;
}

export const MODULE_LABEL: Record<ModuleId, string> = {
  gmao: 'GMAO & Data Dirty',
  quanti: 'Fiabilité quantitative',
  weibull: 'Laboratoire Weibull',
  amdec: 'AMDEC / FMECA',
  rcm: 'RCM / MBF',
  pf: 'Intervalle P-F',
  diagnostic: 'Diagnostic conditionnel',
  rca: 'RCA — Analyse des causes racines',
  spares: 'Pièces de rechange',
  crise: 'Mode Crise',
  comite: 'Comité de Direction',
  systemes: 'Systèmes & redondance',
  investissement: 'Investissement / LCC',
  takeover: 'Take over the factory',
};

export const MISSIONS: MissionMeta[] = [
  {
    id: 'gmao-onboarding',
    module: 'gmao',
    title: 'Premier jour : la GMAO ment',
    subtitle: 'Nettoyer une extraction d’OT avant toute analyse',
    tier: 1,
    minLevel: 1,
    xp: 150,
    skills: ['GMAO', 'DATA', 'MAINTENANCE'],
    errorTags: ['data-not-cleaned', 'calendar-vs-run'],
    equipment: 'SOU-L1',
    briefing: {
      context:
        "Lundi 7 h 30, Brasserie AIG de Douala. Le Directeur Maintenance vous remet l'extraction GMAO des 12 derniers mois de la soutireuse SOU-L1 : « La Direction veut le MTBF pour vendredi. » Le technicien de nuit vous glisse : « Attention, la moitié des OT sont saisis en fin de mois, de mémoire. »",
      data: ['Extraction GMAO : 18 ordres de travail', 'Compteur horaire machine', 'Planning production (2 équipes, 6 j/7)'],
      constraints: ['Aucune analyse n’est valable sur des données non vérifiées', 'Vous n’avez que l’extraction : pas de retour terrain possible avant vendredi'],
      objectives: ['Identifier chaque enregistrement défectueux et le type de défaut', 'Produire un jeu de données exploitable', 'Calculer le MTBF réel'],
      pressure: 'La Direction veut un chiffre. Un chiffre faux sera pire que pas de chiffre.',
    },
    debate: [
      { mentor: 'dirmaint', text: 'Donne-leur un chiffre vendredi. On affinera plus tard.' },
      { mentor: 'data', text: 'Un MTBF calculé sur des doublons et des heures calendaires, c’est un chiffre faux avec deux décimales.' },
      { mentor: 'mecano', text: 'Les gars de nuit ne saisissent rien. Regarde les dates des OT du 31.' },
    ],
    plantEffect: 'Qualité des données GMAO +18 pts (meilleures estimations, prédictif plus efficace).',
  },
  {
    id: 'kpi-basics',
    module: 'quanti',
    title: 'MTBF, MTTR, disponibilité : les vrais chiffres',
    subtitle: 'Calculer et surtout interpréter les indicateurs de base',
    tier: 1,
    minLevel: 1,
    xp: 120,
    skills: ['RELIABILITY', 'MAINTENANCE', 'DATA'],
    errorTags: ['mtbf-calc', 'availability-calc', 'kpi-isolated', 'calendar-vs-run'],
    equipment: 'CONV-L1',
    briefing: {
      context:
        "Le Responsable Production affirme que « le convoyeur M-305 est la meilleure machine de l'usine : MTTR de 45 minutes ! ». Le Directeur Industriel vous demande de trancher avec des chiffres.",
      data: ['Historique pannes convoyeur (6 mois)', 'Heures de marche', 'Temps d’attente pièces'],
      constraints: ['Distinguer temps de réparation et temps d’attente logistique', 'Heures de marche ≠ heures calendaires'],
      objectives: ['Calculer MTBF, MTTR, disponibilité', 'Relier les indicateurs entre eux', 'Formuler une conclusion défendable'],
      pressure: 'Réunion de production dans 1 heure.',
    },
    debate: [
      { mentor: 'prod', text: 'MTTR faible = bonne machine. Point.' },
      { mentor: 'maths', text: 'Un MTTR faible avec un MTBF catastrophique, c’est une machine qui s’arrête tout le temps… vite.' },
      { mentor: 'dirind', text: 'Je veux un seul message clair : on agit où ?' },
    ],
    plantEffect: 'Culture KPI : qualité des données +4 pts.',
  },
  {
    id: 'crise-soutireuse',
    module: 'crise',
    title: 'CRISE : la Ligne 1 est à l’arrêt',
    subtitle: '5 M FCFA/heure, pièce indisponible, fournisseur à 10 jours',
    tier: 2,
    minLevel: 1,
    xp: 200,
    skills: ['LEADERSHIP', 'ECONOMICS', 'MAINTENANCE', 'SPARES'],
    errorTags: ['crisis-no-hse', 'crisis-expected-value'],
    equipment: 'SOU-L1',
    briefing: {
      context:
        "Vendredi 22 h 40. La came de levage principale de la soutireuse SOU-L1 vient de casser. Ligne 1 arrêtée. Aucune pièce en stock. L'OEM annonce 10 jours (avion compris). La Ligne 1 génère 5,2 M FCFA de marge par heure. Le week-end précède la fête nationale : pic de demande.",
      data: ['Perte : 5,2 M FCFA/h', 'Ligne 2 (canettes) : capacité disponible 30 %', 'Atelier d’usinage partenaire à Bassa', 'Soutireuse identique sur la ligne pilote (arrêtée)'],
      constraints: ['Sécurité des intervenants', 'Qualité produit (remplissage, hygiène)', 'Trésorerie limitée pour les frais express'],
      objectives: ['Minimiser la perte totale espérée', 'Ne pas créer de risque HSE ou qualité', 'Préparer la sortie de crise durable'],
      pressure: 'Le Directeur Général appelle toutes les heures.',
    },
    debate: [
      { mentor: 'prod', text: 'Redémarre n’importe comment, on perd 5 millions par heure !' },
      { mentor: 'hse', text: 'Une réparation provisoire sur une came de levage, c’est une bouteille qui explose au visage d’un opérateur.' },
      { mentor: 'mecano', text: 'La ligne pilote a la même came. On peut la démonter en 6 heures.' },
      { mentor: 'daf', text: 'Chaque option a un coût. Montrez-moi le coût espéré, pas le meilleur cas.' },
    ],
    plantEffect: 'Selon vos décisions : pertes, confiance de la Direction, sécurité.',
  },
  {
    id: 'weibull-p101',
    module: 'weibull',
    title: 'Laboratoire Weibull : garnitures P-101',
    subtitle: 'Des données sales à la stratégie de maintenance',
    tier: 2,
    minLevel: 2,
    xp: 260,
    skills: ['WEIBULL', 'RELIABILITY', 'DATA', 'ECONOMICS'],
    errorTags: ['data-not-cleaned', 'ignore-censoring', 'beta-misread', 'calendar-vs-run'],
    equipment: 'P-101',
    briefing: {
      context:
        "La pompe d'eau de brassage P-101 « mange » des garnitures mécaniques. Le constructeur préconise un remplacement systématique toutes les 4 000 h. Le magasin réclame un budget annuel de 14 garnitures. Vous devez déterminer si ce préventif a un sens.",
      data: ['Historique des déposes de garnitures (GMAO + carnet atelier)', 'Coût préventif vs coût de panne', 'Compteur horaire pompe'],
      constraints: ['Données incomplètes, doublons, censures', 'Échantillon faible'],
      objectives: ['Nettoyer et identifier les censures', 'Estimer β et η', 'Interpréter le régime', 'Calculer R(t) et MTTF', 'Proposer une stratégie chiffrée'],
      pressure: 'Le magasin doit passer la commande annuelle OEM la semaine prochaine.',
    },
    debate: [
      { mentor: 'maths', text: 'Sans les suspensions, ton η sera sous-estimé. Les pièces déposées en bon état comptent.' },
      { mentor: 'mecano', text: 'Ces garnitures lâchent quand la pompe tourne à sec. Ce n’est pas une question d’âge.' },
      { mentor: 'daf', text: '14 garnitures à 1,2 M, c’est 17 M FCFA. Justifiez chaque unité.' },
    ],
    plantEffect: 'Données +5 pts ; estimation β/η disponible pour toute l’usine.',
  },
  {
    id: 'amdec-pasteurisateur',
    module: 'amdec',
    title: 'AMDEC : pasteurisateur tunnel',
    subtitle: 'Criticité réelle vs produit S×O×D',
    tier: 2,
    minLevel: 2,
    xp: 260,
    skills: ['AMDEC', 'RELIABILITY', 'MAINTENANCE'],
    errorTags: ['rpn-only', 'detection-incoherent', 'mode-cause-confusion'],
    equipment: 'PAST-L1',
    briefing: {
      context:
        "Le pasteurisateur PAST-L1 est le goulot de la Ligne 1. Une sous-pasteurisation peut provoquer un rappel produit national. Le Directeur Qualité exige une AMDEC avant l'audit client.",
      data: ['Plan P&ID simplifié', 'Historique pannes 2 ans', 'Instrumentation existante (sondes PU, alarmes)', 'Analyse d’eau d’appoint'],
      constraints: ['Groupe de travail pluridisciplinaire (production, qualité, maintenance)', 'Pas de budget pour de nouveaux capteurs cette année… sauf justification'],
      objectives: ['Structurer fonctions / modes / causes / effets', 'Coter S, O, D de façon cohérente', 'Prioriser par criticité réelle', 'Proposer des actions'],
      pressure: 'Audit client dans 3 semaines.',
    },
    debate: [
      { mentor: 'maths', text: 'Le RPN n’est pas une grandeur physique : 10×2×2 = 40 ne vaut pas 4×5×2 = 40.' },
      { mentor: 'hse', text: 'Tout mode de gravité 9-10 se traite, quel que soit le RPN.' },
      { mentor: 'prod', text: 'Faites court, on a une ligne à faire tourner.' },
    ],
    plantEffect: 'Traitement de l’eau d’appoint : cause latente « entartrage » éliminée.',
  },
  {
    id: 'spares-magasin',
    module: 'spares',
    title: 'Le magasin : 50 millions à libérer ?',
    subtitle: 'Stock dormant, pièces critiques, doublons',
    tier: 2,
    minLevel: 2,
    xp: 240,
    skills: ['SPARES', 'ECONOMICS', 'GMAO', 'DATA'],
    errorTags: ['stock-no-risk', 'overstock'],
    briefing: {
      context:
        "Le Directeur Financier veut réduire le stock de pièces de rechange de 50 M FCFA avant la clôture. Le magasinier craint les ruptures. Vous découvrez des doublons d'articles et des garnitures de mauvaise référence montées sur les pompes.",
      data: ['Fichier articles (24 réf.)', 'Consommations 24 mois', 'Délais fournisseurs', 'Coûts d’arrêt par équipement'],
      constraints: ['Délais d’importation 2 à 5 mois', 'Taux de possession 25 %/an', 'Devises limitées'],
      objectives: ['Classer ABC / criticité', 'Traiter doublons et obsolètes', 'Décider des pièces d’assurance', 'Calculer un point de commande'],
      pressure: 'Clôture comptable dans 10 jours.',
    },
    debate: [
      { mentor: 'daf', text: 'Un stock qui ne tourne pas est du cash qui dort.' },
      { mentor: 'dirmaint', text: 'Une pièce d’assurance, par définition, ne tourne pas. Elle protège.' },
      { mentor: 'data', text: 'Vos doublons faussent les consommations : la moitié des ruptures sont des articles… présents sous une autre référence.' },
    ],
    plantEffect: 'Doublons purgés (garnitures conformes montées), stock dormant liquidé, politiques min/max des pièces critiques.',
  },
  {
    id: 'rcm-p101',
    module: 'rcm',
    title: 'RCM : pompe P-101',
    subtitle: 'Les 7 questions — sans recopier le plan constructeur',
    tier: 3,
    minLevel: 3,
    xp: 320,
    skills: ['RCM', 'RELIABILITY', 'PREDICTIVE', 'ECONOMICS'],
    errorTags: ['oem-copy', 'hidden-failure', 'pm-on-random', 'vague-task'],
    equipment: 'P-101',
    briefing: {
      context:
        "La P-101 alimente la salle de brassage en eau à 78 °C. Son arrêt bloque le brassage (brassins perdus). Elle n'a pas de pompe de secours. Le plan de maintenance actuel est la copie du manuel OEM (conçu pour l'Europe, eau douce, 1 équipe).",
      data: ['Contexte opérationnel', 'Historique de pannes', 'Analyse Weibull (si réalisée)', 'Capteurs disponibles'],
      constraints: ['Climat tropical, eau dure', 'Techniciens vibration : 1 seul formé', 'Budget limité'],
      objectives: ['Répondre aux 7 questions RCM', 'Choisir une tâche pertinente ET rentable par mode', 'Rédiger une tâche exécutable'],
      pressure: 'Le plan doit être intégré dans la GMAO avant la fin du mois.',
    },
    debate: [
      { mentor: 'dirmaint', text: 'Le constructeur connaît sa pompe mieux que nous.' },
      { mentor: 'maths', text: 'Le constructeur ne connaît ni ton eau, ni ton climat, ni ton mode d’exploitation.' },
      { mentor: 'mecano', text: 'Depuis qu’on ne fait plus l’alignement au laser, les garnitures tiennent trois mois.' },
    ],
    plantEffect: 'Alignement laser post-intervention standardisé : cause latente « désalignement » éliminée.',
  },
  {
    id: 'diag-vibratoire',
    module: 'diagnostic',
    title: 'Centre de diagnostic : lire le signal',
    subtitle: 'Spectre, huile, thermographie → défaut, RUL et décision',
    tier: 3,
    minLevel: 3,
    xp: 300,
    skills: ['PREDICTIVE', 'RELIABILITY', 'DATA', 'MAINTENANCE'],
    errorTags: ['signature-misread', 'single-technique', 'rul-misread', 'intervene-too-early', 'intervene-too-late'],
    briefing: {
      context:
        "Le centre de diagnostic vous transmet une alerte sur un équipement tournant critique. Vous disposez du spectre vibratoire, d'une analyse d'huile et d'une mesure thermographique. Il faut identifier le défaut, le confirmer par recoupement, estimer la durée de vie résiduelle (RUL) et décider : intervenir maintenant, planifier, ou continuer à surveiller.",
      data: ['Spectre vibratoire (ordres de rotation 1×, 2×, 3×…, hautes fréquences)', 'Analyse d’huile (fer, viscosité)', 'Thermographie palier/accouplement', 'Deux relevés successifs (tendance)', 'Délai d’appro de la pièce'],
      constraints: ['Une seule technique ne suffit pas à conclure', 'La décision dépend de la RUL ET du délai de réaction', 'Arrêt de production coûteux'],
      objectives: ['Identifier le défaut dominant', 'Le confirmer par une seconde technique', 'Estimer la RUL', 'Choisir la bonne action au bon moment'],
      pressure: 'La Production veut savoir tout de suite si elle doit s’arrêter ou non.',
    },
    debate: [
      { mentor: 'data', text: 'Un seul pic ne fait pas un diagnostic. Recoupe tes sources.' },
      { mentor: 'mecano', text: 'Un roulement qui chante en haute fréquence, je l’entends avant de le voir sur ton écran.' },
      { mentor: 'prod', text: 'Dis-moi juste : je m’arrête ou pas ?' },
    ],
    plantEffect: 'Compétences de diagnostic conditionnel renforcées (spectre, huile, thermographie, RUL).',
  },
  {
    id: 'rca-convoyeur',
    module: 'rca',
    title: 'RCA : le roulement qui casse toujours',
    subtitle: '5 Pourquoi, Ishikawa, preuves — pas de fausse cause racine',
    tier: 3,
    minLevel: 3,
    xp: 320,
    skills: ['RCA', 'MAINTENANCE', 'DATA', 'LEADERSHIP'],
    errorTags: ['false-root-cause', 'blame-person', 'no-verification'],
    equipment: 'CONV-L1',
    briefing: {
      context:
        "Quatrième casse du roulement du motoréducteur M-305 en 5 mois. À chaque fois : « roulement défectueux, remplacé ». Le Directeur Industriel veut que ça s'arrête.",
      data: ['Roulement déposé (expertise possible)', 'Historique GMAO', 'Spectres vibratoires', 'Registre magasin', 'Témoignages'],
      constraints: ['24 h-homme d’investigation disponibles', 'Chaque preuve coûte du temps'],
      objectives: ['Collecter les preuves pertinentes', 'Construire la chaîne causale', 'Identifier les causes racines systémiques', 'Définir des actions vérifiables'],
      pressure: 'Production menace de faire intervenir un sous-traitant.',
    },
    debate: [
      { mentor: 'prod', text: 'C’est le technicien de nuit qui monte mal. Changez-le.' },
      { mentor: 'hse', text: 'Chercher un coupable, c’est garantir que les vraies causes seront cachées la prochaine fois.' },
      { mentor: 'mecano', text: 'Regarde la graisse. Regarde la couleur.' },
    ],
    plantEffect: 'Standard de graissage + purge des graisses incompatibles : cause latente « lubrification » éliminée.',
  },
  {
    id: 'pf-sertisseuse',
    module: 'pf',
    title: 'Intervalle P-F : molettes de sertissage',
    subtitle: 'Trouver la bonne fréquence d’inspection',
    tier: 3,
    minLevel: 3,
    xp: 240,
    skills: ['PREDICTIVE', 'RCM', 'ECONOMICS'],
    errorTags: ['pf-too-long', 'pf-too-short'],
    equipment: 'SER-L2',
    briefing: {
      context:
        "Une molette usée produit des sertis non conformes (fuites canettes, rappel possible). La dégradation se voit sur la mesure de serti et la vibration de tête. Aujourd'hui : remplacement systématique à 3 500 h, et des pannes quand même.",
      data: ['Courbes de dégradation (serti, vibration)', 'Coût d’inspection', 'Coût de panne fonctionnelle'],
      constraints: ['Un seul contrôleur qualité par équipe', 'Arrêts courts uniquement aux changements de format'],
      objectives: ['Identifier P, F et l’intervalle P-F', 'Choisir l’intervalle d’inspection', 'Vérifier par simulation'],
      pressure: 'Réclamation client sur des canettes fuyardes au Tchad.',
    },
    debate: [
      { mentor: 'maths', text: 'Règle de base : inspecter à P-F/2 au plus, et regarder le coût.' },
      { mentor: 'prod', text: 'Chaque inspection, c’est 10 minutes de ligne arrêtée.' },
    ],
    plantEffect: 'Politique conditionnelle proposée pour SER-L2.',
  },
  {
    id: 'comite-pdm',
    module: 'comite',
    title: 'Comité : 35 M FCFA pour le prédictif',
    subtitle: 'Défendre un investissement devant la Direction',
    tier: 4,
    minLevel: 4,
    xp: 320,
    skills: ['COMMUNICATION', 'ECONOMICS', 'LEADERSHIP', 'PREDICTIVE'],
    errorTags: ['roi-missing', 'kpi-isolated'],
    briefing: {
      context:
        "Vous proposez d'installer une surveillance vibratoire et thermique en ligne sur les 6 équipements les plus critiques (35 M FCFA + 2 M/an). Le comité : Directeur Industriel, DAF, Production, HSE, Achats, Directeur Maintenance.",
      data: ['Historique des pertes par équipement', 'Coûts d’installation', 'Taux de détection attendu', 'Retours d’expérience groupe'],
      constraints: ['Le DAF a déjà refusé deux projets « capteurs » inutilisés', 'Devises rares pour l’import de matériel'],
      objectives: ['Construire un argumentaire technique, économique, risque', 'Chiffrer ROI et temps de retour', 'Répondre aux objections'],
      pressure: 'Vous avez 10 minutes.',
    },
    debate: [
      { mentor: 'daf', text: 'Je ne finance pas des capteurs. Je finance des FCFA évités.' },
      { mentor: 'data', text: 'Sans données propres et sans analyste, un système en ligne devient un tableau de bord que personne ne regarde.' },
      { mentor: 'hse', text: 'Le compresseur NH3 : ce n’est pas qu’une question d’argent.' },
    ],
    plantEffect: 'Déblocage de la stratégie « Prédictif (surveillance en ligne) ».',
  },
  {
    id: 'systemes-froid',
    module: 'systemes',
    title: 'Architecture : eau de brassage et froid',
    subtitle: 'Série, parallèle, k/n, Monte-Carlo',
    tier: 4,
    minLevel: 4,
    xp: 260,
    skills: ['RELIABILITY', 'ECONOMICS', 'PROJECT'],
    errorTags: ['series-parallel'],
    equipment: 'P-101',
    briefing: {
      context:
        "Le Directeur Industriel envisage une redondance sur la P-101 et s'interroge sur l'architecture du froid (2 compresseurs). Faut-il un 2×100 %, 3×50 %, ou rien ?",
      data: ['Fiabilité des composants', 'Coûts d’investissement', 'Pertes d’arrêt'],
      constraints: ['Espace limité en salle des pompes', 'CAPEX limité'],
      objectives: ['Calculer la fiabilité système', 'Comparer les architectures', 'Choisir sur critère économique'],
      pressure: 'Budget CAPEX à arbitrer ce trimestre.',
    },
    debate: [
      { mentor: 'maths', text: 'Deux composants à 90 % en série ne font pas 90 %.' },
      { mentor: 'daf', text: 'La redondance double le CAPEX. Prouvez qu’elle se paie.' },
    ],
    plantEffect: 'Option : pompe de secours P-101B installée (redondance).',
  },
  {
    id: 'tco-compresseur',
    module: 'investissement',
    title: 'Investissement : nouveau compresseur d’air',
    subtitle: 'TCO / LCC — ne pas choisir sur le prix',
    tier: 4,
    minLevel: 4,
    xp: 240,
    skills: ['ECONOMICS', 'RELIABILITY', 'PROJECT'],
    errorTags: ['tco-capex-only'],
    equipment: 'AC-401',
    briefing: {
      context:
        "Le compresseur AC-401 arrive en fin de vie. Trois offres : A (asiatique, bon marché), B (européen standard), C (haut de gamme à vitesse variable). L'électricité coûte cher et les délestages sont fréquents.",
      data: ['Offres techniques et commerciales', 'Coût énergie 95 FCFA/kWh', 'Historique pannes', 'Coût d’indisponibilité'],
      constraints: ['Horizon 10 ans, taux d’actualisation 10 %', 'SAV local'],
      objectives: ['Calculer le coût global de possession', 'Intégrer risque et indisponibilité', 'Recommander une offre'],
      pressure: 'Les Achats veulent signer l’offre la moins chère.',
    },
    debate: [
      { mentor: 'daf', text: 'L’offre A est 40 % moins chère.' },
      { mentor: 'maths', text: 'Sur 10 ans, l’énergie coûte 8 fois le prix d’achat d’un compresseur.' },
    ],
    plantEffect: 'Coût énergie et fiabilité du réseau d’air selon votre choix.',
  },
  {
    id: 'takeover',
    module: 'takeover',
    title: 'TAKE OVER THE FACTORY',
    subtitle: '12 mois pour redresser une usine du groupe',
    tier: 5,
    minLevel: 8,
    xp: 1200,
    skills: ['LEADERSHIP', 'RELIABILITY', 'ECONOMICS', 'PROJECT', 'SPARES', 'RCM'],
    briefing: {
      context:
        "Vous êtes nommé Directeur Fiabilité d'une cimenterie du groupe : disponibilité faible, coûts élevés, GMAO inutilisable, stock pléthorique, équipes démotivées. Le Comité Exécutif vous donne 12 mois.",
      data: ['Usine complète simulée', 'Budget', 'Équipes', 'Stock'],
      constraints: ['12 mois simulés', 'Budget contraint', 'Pas de seconde chance'],
      objectives: ['+ disponibilité, + MTBF, − MTTR, − coûts', '− stock dormant, − pannes répétitives', '+ qualité des données, + maturité'],
      pressure: 'Le Comité Exécutif évalue chaque trimestre.',
    },
    debate: [
      { mentor: 'dirind', text: 'Ici, personne ne vous attendra. Choisissez vos batailles.' },
      { mentor: 'dirmaint', text: 'Commencez par les données. Sans elles, vous piloterez à l’aveugle.' },
    ],
    plantEffect: 'Titre GLOBAL RELIABILITY ENGINEER si réussi.',
  },
];

export function getMission(id: string): MissionMeta | undefined {
  return MISSIONS.find((m) => m.id === id);
}
