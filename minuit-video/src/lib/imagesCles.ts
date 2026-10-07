// 20 images clés pour un rendu réaliste façon « reel » (prompts dans IMAGES.md).
// Déposer chaque image dans public/images/<id>.(jpg|jpeg|png|webp), de préférence en 9:16.
export type ImageCle = {
  readonly id: string;
  /** début et fin en secondes, sur la même chronologie que le film */
  readonly debut: number;
  readonly fin: number;
  readonly titre: string;
  /** mouvement lent appliqué à l'image */
  readonly mouvement: "avant" | "arriere" | "gauche" | "droite" | "haut";
};

export const IMAGES_CLES: readonly ImageCle[] = [
  { id: "01", debut: 0, fin: 9, titre: "Les dix vierges attendent dans les collines", mouvement: "avant" },
  { id: "02", debut: 9, fin: 15, titre: "Une lampe, un visage fatigué", mouvement: "avant" },
  { id: "03", debut: 15, fin: 26, titre: "Elles s'endorment autour des lampes", mouvement: "arriere" },
  { id: "04", debut: 26, fin: 35, titre: "La lune entre les nuages", mouvement: "haut" },
  { id: "05", debut: 35, fin: 44, titre: "Le veilleur sur la hauteur, une lumière au loin", mouvement: "avant" },
  { id: "06", debut: 44, fin: 51, titre: "« Voici l'époux ! »", mouvement: "avant" },
  { id: "07", debut: 51, fin: 55, titre: "Elles se réveillent en sursaut", mouvement: "avant" },
  { id: "08", debut: 55, fin: 64, titre: "Lampes fortes, lampes faibles", mouvement: "droite" },
  { id: "09", debut: 64, fin: 74, titre: "Une flamme vacille, l'inquiétude", mouvement: "avant" },
  { id: "10", debut: 74, fin: 85, titre: "Pas assez d'huile", mouvement: "avant" },
  { id: "11", debut: 85, fin: 93, titre: "« Donnez-nous de votre huile »", mouvement: "gauche" },
  { id: "12", debut: 93, fin: 105, titre: "Elles partent en courant", mouvement: "arriere" },
  { id: "13", debut: 105, fin: 118, titre: "Les lampes s'éteignent dans la course", mouvement: "droite" },
  { id: "14", debut: 118, fin: 130, titre: "La peur et le regret", mouvement: "avant" },
  { id: "15", debut: 130, fin: 141, titre: "La procession de l'époux", mouvement: "avant" },
  { id: "16", debut: 141, fin: 150, titre: "L'époux et les cinq sages", mouvement: "avant" },
  { id: "17", debut: 150, fin: 158, titre: "Elles entrent avec lui", mouvement: "avant" },
  { id: "18", debut: 158, fin: 165, titre: "La porte se referme", mouvement: "avant" },
  { id: "19", debut: 165, fin: 175, titre: "« Seigneur, ouvre-nous ! »", mouvement: "arriere" },
  { id: "20", debut: 175, fin: 179, titre: "La lune. Soyez prêts.", mouvement: "arriere" },
];
