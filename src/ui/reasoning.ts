/**
 * Évaluation heuristique du raisonnement écrit (pas d'IA au runtime dans une page statique).
 * On mesure la longueur, la présence de vocabulaire technique et d'éléments chiffrés,
 * pour coacher sans bloquer : le but est de faire écrire un raisonnement, pas de le noter.
 */
const REASONING_LEXICON = [
  'cause', 'donnée', 'donnee', 'censure', 'suspension', 'β', 'beta', 'êta', 'eta', 'coût', 'cout', 'risque',
  'p-f', 'pf', 'rul', 'délai', 'delai', 'stock', 'gravité', 'gravite', 'détection', 'detection', 'marche',
  'calendaire', 'espérance', 'esperance', 'sécurité', 'securite', 'weibull', 'usure', 'aléatoire', 'aleatoire',
  'préventif', 'preventif', 'conditionnel', 'intervalle', 'racine', 'vérifi', 'verifi', 'doublon', 'alignement',
  'lubrifi', 'redondance', 'disponibilité', 'disponibilite', 'budget', 'mtbf', 'mttr', 'roi', 'phase', 'harmonique',
];

export function evaluateReasoning(text: string): { level: 0 | 1 | 2; feedback: string } {
  const t = text.trim().toLowerCase();
  if (t.length < 25) return { level: 0, feedback: 'Développez : dites ce que vous aviez supposé, et ce que vous allez changer concrètement.' };
  const terms = new Set(REASONING_LEXICON.filter((w) => t.includes(w))).size;
  const hasNumber = /\d/.test(t);
  const hasChange = /(je vais|je change|je corrige|il faut|plutôt|au lieu|désormais|recalcul|revoir)/.test(t);
  const score = terms + (hasNumber ? 1 : 0) + (hasChange ? 1 : 0);
  if (score >= 3) return { level: 2, feedback: 'Raisonnement structuré : vous nommez la cause et l’action corrective. C’est la bonne démarche.' };
  if (score >= 1)
    return {
      level: 1,
      feedback: hasChange
        ? 'Bien : ajoutez le critère chiffré ou le concept technique qui justifie votre choix.'
        : 'Bien : précisez maintenant ce que vous allez changer, et pourquoi (chiffre, critère, mécanisme).',
    };
  return { level: 1, feedback: 'Appuyez votre raisonnement sur un élément concret : une donnée, un seuil, une cause ou un coût.' };
}
