import type { PressureEvent } from '../engine/types';

/**
 * Événements « décision sous pression » tirés aléatoirement à chaque mois simulé.
 * Chaque option a des effets sur la sécurité, la production, les coûts, la confiance
 * de la Direction, le moral des équipes et les compétences du joueur.
 * Aucune option n'est « gratuite » : le jeu force l'arbitrage.
 */
const M = 1_000_000;

export const PRESSURE_EVENTS: PressureEvent[] = [
  {
    id: 'budget-cut',
    title: 'Budget maintenance réduit de 20 %',
    context:
      "Le Directeur Financier annonce une baisse de 20 % du budget maintenance pour les 3 prochains mois : le cours du malt importé a flambé et le FCFA est sous pression.",
    urgency: 'haute',
    options: [
      {
        id: 'accept-cut-pm',
        label: 'Accepter et couper dans le préventif',
        detail: 'Réduction immédiate des gammes préventives les moins justifiées.',
        effects: { trust: 6, morale: -4, modifier: { id: 'budget-cut', label: 'Budget -20 %', budgetFactor: 0.8, capacityFactor: 0.9, months: 3 }, skill: { ECONOMICS: 1 }, message: 'La DAF apprécie. Mais sans analyse préalable, vous risquez de couper des tâches qui protégeaient des modes critiques.' },
        mentorTake: [
          { mentor: 'daf', text: 'Enfin quelqu’un qui comprend la contrainte de trésorerie.' },
          { mentor: 'maths', text: 'Couper sans connaître β de chaque mode, c’est tirer à l’aveugle.' },
        ],
      },
      {
        id: 'negotiate',
        label: 'Négocier : -10 % avec un plan chiffré',
        detail: 'Vous présentez le coût du risque des modes critiques et proposez de supprimer les tâches à β ≤ 1.',
        effects: { trust: 3, morale: 1, modifier: { id: 'budget-cut', label: 'Budget -10 % (négocié)', budgetFactor: 0.9, months: 3 }, skill: { COMMUNICATION: 3, ECONOMICS: 2, LEADERSHIP: 2 }, message: 'Accord obtenu. La Direction note votre capacité à chiffrer le risque.' },
        mentorTake: [
          { mentor: 'dirmaint', text: 'C’est la bonne posture : parler en FCFA, pas en heures.' },
          { mentor: 'daf', text: 'Je veux voir le suivi mensuel de ce plan.' },
        ],
      },
      {
        id: 'refuse',
        label: 'Refuser catégoriquement',
        detail: '« La fiabilité n’est pas négociable. »',
        effects: { trust: -12, morale: 3, skill: { LEADERSHIP: -1 }, message: 'La Direction vous perçoit comme rigide. Un fiabiliste qui ne sait pas arbitrer perd son influence.' },
        mentorTake: [{ mentor: 'dirind', text: 'Refuser sans proposer, c’est laisser les autres décider à votre place.' }],
      },
    ],
  },
  {
    id: 'tech-leaves',
    title: 'Départ du meilleur électrotechnicien',
    context:
      "Emmanuel, 18 ans d'ancienneté, seul à maîtriser les automates de la soutireuse, rejoint une compagnie minière à Kribi. Préavis : 2 semaines.",
    urgency: 'haute',
    options: [
      {
        id: 'counter-offer',
        label: 'Contre-offre salariale (+35 %)',
        detail: 'Coût annuel ~ 6 MFCFA. Crée un précédent dans l’équipe.',
        effects: { cost: 1.5 * M, morale: -3, trust: -2, message: 'Emmanuel reste… pour l’instant. Le savoir reste concentré sur une seule personne.' },
      },
      {
        id: 'knowledge-transfer',
        label: 'Transfert de compétences + documentation',
        detail: 'Binômage intensif, procédures illustrées, sauvegardes programmes automates.',
        effects: { technicians: -1, dataQuality: 4, morale: 4, modifier: { id: 'skill-gap', label: 'Perte de compétence automates', mttrFactor: 1.15, months: 2 }, skill: { LEADERSHIP: 3, MAINTENANCE: 2 }, message: 'Le départ coûte à court terme, mais le savoir est capitalisé dans la GMAO.' },
        mentorTake: [{ mentor: 'mecano', text: 'Un savoir qui n’est pas écrit part avec l’homme.' }],
      },
      {
        id: 'let-go',
        label: 'Laisser partir, recruter plus tard',
        detail: 'Aucune action immédiate.',
        effects: { technicians: -1, morale: -5, modifier: { id: 'skill-gap', label: 'Perte de compétence automates', mttrFactor: 1.35, months: 4 }, message: 'Les pannes automates deviennent longues à diagnostiquer. MTTR en hausse.' },
      },
    ],
  },
  {
    id: 'supplier-late',
    title: 'Fournisseur OEM en retard',
    context:
      "Le transitaire annonce que les conteneurs de pièces OEM sont bloqués au port de Douala (congestion + contrôle douanier). Délai supplémentaire estimé : 3 à 6 semaines.",
    urgency: 'moyenne',
    options: [
      {
        id: 'air',
        label: 'Basculer les pièces critiques en fret aérien',
        detail: 'Surcoût ~ 8 MFCFA.',
        effects: { cost: 8 * M, trust: -1, message: 'Les pièces critiques arrivent. La DAF note le surcoût.' },
      },
      {
        id: 'local-sourcing',
        label: 'Qualifier des fournisseurs locaux pour les consommables',
        detail: 'Roulements, courroies, filtres via distributeurs agréés de Douala.',
        effects: { cost: 1 * M, modifier: { id: 'port', label: 'Congestion portuaire (pièces locales qualifiées)', leadTimeFactor: 1.3, months: 2 }, skill: { SPARES: 3 }, trust: 2, message: 'Bonne initiative : la dépendance aux importations diminue pour les pièces standard.' },
      },
      {
        id: 'wait',
        label: 'Attendre',
        detail: 'Pas de surcoût immédiat.',
        effects: { modifier: { id: 'port', label: 'Congestion portuaire', leadTimeFactor: 1.8, months: 2 }, message: 'Les délais d’approvisionnement s’allongent fortement.' },
      },
    ],
  },
  {
    id: 'prod-pressure',
    title: 'Production refuse l’arrêt préventif',
    context:
      "Le Responsable Production refuse l'arrêt de 8 h prévu sur la Ligne 1 : une commande export (Tchad, RCA) doit partir vendredi. « Vous ferez votre maintenance plus tard. »",
    urgency: 'haute',
    options: [
      {
        id: 'yield',
        label: 'Reporter l’arrêt',
        detail: 'Le préventif est décalé de 3 semaines.',
        effects: { trust: 3, ageBoost: { key: 'SOU-L1:vannes', hours: 600 }, message: 'La commande part. Les vannes de la soutireuse vieillissent au-delà de l’intervalle prévu.' },
        mentorTake: [{ mentor: 'prod', text: 'Merci, vous avez sauvé le client export.' }],
      },
      {
        id: 'split',
        label: 'Proposer 2 micro-arrêts de 3 h en changement de format',
        detail: 'Préparation SMED des tâches, kits pièces prêts.',
        effects: { cost: 0.4 * M, trust: 5, morale: 2, skill: { TPM: 3, LEAN: 3, COMMUNICATION: 2 }, message: 'Excellent compromis : la maintenance est réalisée sans pénaliser la commande.' },
        mentorTake: [{ mentor: 'dirind', text: 'Voilà un ingénieur qui cherche des solutions, pas des coupables.' }],
      },
      {
        id: 'impose',
        label: 'Imposer l’arrêt',
        detail: '« La fiabilité avant tout. »',
        effects: { trust: -6, morale: -2, loss: 12 * M, message: 'L’arrêt est fait, mais la commande est livrée en retard. Le conflit Production/Maintenance s’envenime.' },
      },
    ],
  },
  {
    id: 'power-cuts',
    title: 'Délestages électriques répétés',
    context:
      "Le réseau national annonce des délestages quotidiens pendant 3 semaines. Le groupe électrogène GE-501 va être très sollicité.",
    urgency: 'haute',
    options: [
      {
        id: 'test-ge',
        label: 'Tester immédiatement GE-501 en charge + stock gasoil',
        detail: 'Essai de démarrage, contrôle batteries, analyse gasoil.',
        effects: { cost: 1.2 * M, ageBoost: { key: 'GE-501:demarrage', hours: -3000 }, skill: { RCM: 2, RELIABILITY: 2 }, message: 'Le test révèle des batteries faibles : remplacées. La défaillance cachée est neutralisée.' },
        mentorTake: [{ mentor: 'maths', text: 'Défaillance cachée = tâche de recherche de défaillance. Pas d’autre option.' }],
      },
      {
        id: 'hope',
        label: 'Faire confiance au groupe (il a démarré il y a 6 mois)',
        detail: 'Aucun coût.',
        effects: { modifier: { id: 'blackout', label: 'Délestages (sollicitation GE)', lossFactor: 1.15, months: 1 }, ageBoost: { key: 'GE-501:demarrage', hours: 2500 }, message: 'Le risque d’une défaillance cachée augmente à chaque sollicitation.' },
      },
    ],
  },
  {
    id: 'audit',
    title: 'Audit surprise du Groupe',
    context:
      "L'auditeur Groupe arrive demain. Il demandera : taux de réalisation du préventif, qualité des codes pannes, suivi des actions RCA.",
    urgency: 'moyenne',
    options: [
      {
        id: 'transparent',
        label: 'Présenter les données réelles + plan de progrès',
        detail: 'Même si les indicateurs sont mauvais.',
        effects: { trust: 4, dataQuality: 3, skill: { COMMUNICATION: 2, LEADERSHIP: 2 }, message: 'L’auditeur valorise la lucidité et le plan structuré.' },
      },
      {
        id: 'polish',
        label: 'Réécrire les OT la nuit pour « améliorer » les chiffres',
        detail: 'Retouche des dates de réalisation.',
        effects: { trust: -15, dataQuality: -10, morale: -5, message: 'Les incohérences sont détectées. Votre crédibilité est gravement atteinte. Les données sont maintenant encore moins fiables.' },
        mentorTake: [{ mentor: 'hse', text: 'Maquiller une donnée, c’est maquiller un risque.' }],
      },
    ],
  },
  {
    id: 'parts-price',
    title: 'Hausse de 25 % du prix des pièces OEM',
    context: "L'OEM européen applique une hausse tarifaire et un minimum de commande.",
    urgency: 'moyenne',
    options: [
      {
        id: 'reverse',
        label: 'Lancer un programme de reverse engineering local',
        detail: 'Atelier d’usinage partenaire à Douala pour pièces non critiques.',
        effects: { cost: 3 * M, modifier: { id: 'price', label: 'Hausse OEM (partiellement compensée)', partsCostFactor: 1.08, months: 6 }, skill: { SPARES: 3, ECONOMICS: 2 }, trust: 3, message: 'Innovation locale : des pièces standard sont désormais fabriquées localement.' },
        mentorTake: [{ mentor: 'mecano', text: 'Nos tourneurs de Bassa savent faire. Il faut juste les plans et les tolérances.' }],
      },
      {
        id: 'mutualise',
        label: 'Mutualiser les achats avec les sites du groupe (Abidjan, Dakar)',
        detail: 'Négociation groupée.',
        effects: { modifier: { id: 'price', label: 'Hausse OEM (achats mutualisés)', partsCostFactor: 1.1, months: 6 }, skill: { SPARES: 2, PROJECT: 2 }, trust: 2, message: 'Accord-cadre groupe négocié.' },
      },
      {
        id: 'absorb',
        label: 'Absorber la hausse',
        detail: '',
        effects: { modifier: { id: 'price', label: 'Hausse OEM', partsCostFactor: 1.25, months: 6 }, message: 'Les coûts pièces augmentent de 25 %.' },
      },
    ],
  },
  {
    id: 'near-miss',
    title: 'Presqu’accident en salle des machines froid',
    context:
      "Un technicien a été incommodé par une odeur d'ammoniac lors d'une intervention sur C-201 sans consignation complète.",
    urgency: 'critique',
    options: [
      {
        id: 'stop-investigate',
        label: 'Stopper, enquêter, renforcer la consignation (LOTO)',
        detail: 'Arrêt 12 h, formation, détecteurs NH3 contrôlés.',
        effects: { safety: 10, morale: 5, loss: 3 * M, cost: 1.5 * M, trust: 2, skill: { LEADERSHIP: 3 }, message: 'La culture sécurité progresse. Personne ne vous reprochera d’avoir protégé une vie.' },
        mentorTake: [{ mentor: 'hse', text: 'Aucune disponibilité ne justifie un blessé.' }],
      },
      {
        id: 'minimize',
        label: 'Rappel oral des consignes, pas d’arrêt',
        detail: '',
        effects: { safety: -15, morale: -6, trust: -4, message: 'Le signal faible est ignoré. Le risque d’accident grave augmente.' },
      },
    ],
  },
  {
    id: 'humidity',
    title: 'Saison des pluies : humidité record',
    context:
      "Humidité > 90 %, condensation dans les armoires électriques, corrosion accélérée sur la STEP et les convoyeurs.",
    urgency: 'moyenne',
    options: [
      {
        id: 'protect',
        label: 'Plan saison des pluies (résistances armoires, graissage renforcé)',
        detail: '',
        effects: { cost: 2 * M, skill: { MAINTENANCE: 2 }, message: 'Les équipements sont protégés. Le climat tropical est un paramètre de conception, pas une excuse.' },
      },
      {
        id: 'ignore',
        label: 'Ne rien changer',
        detail: '',
        effects: { ageBoost: { key: 'TGBT-601:connexions', hours: 8000 }, message: 'La corrosion progresse sur les connexions électriques.' },
      },
    ],
  },
];
