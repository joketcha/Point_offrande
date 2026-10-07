// Découpage technique : un plan = un fichier IA possible dans public/plans/<id>.<ext>
// (mp4, webm, mov, png, jpg, jpeg, webp). Sans fichier, la version dessinée s'affiche.
// Les prompts de chaque plan sont dans PROMPTS.md.
export type PlanIA = {
  readonly id: string;
  /** début en secondes dans le film */
  readonly debut: number;
  /** durée en secondes */
  readonly duree: number;
  readonly titre: string;
};

export const DECOUPAGE: readonly PlanIA[] = [
  { id: "01-01", debut: 0, duree: 6, titre: "Plan très large, la caméra avance vers les dix vierges" },
  { id: "01-02", debut: 6, duree: 1.8, titre: "Une lampe allumée" },
  { id: "01-03", debut: 7.8, duree: 1.8, titre: "Une main tenant une lampe" },
  { id: "01-04", debut: 9.6, duree: 1.8, titre: "Visages fatigués" },
  { id: "01-05", debut: 11.4, duree: 1.8, titre: "Flammes qui vacillent" },
  { id: "01-06", debut: 13.2, duree: 1.8, titre: "Yeux qui cherchent au loin" },

  { id: "02-01", debut: 15, duree: 6, titre: "Une première s'assoit, puis une deuxième, puis les autres" },
  { id: "02-02", debut: 21, duree: 5, titre: "Les dix endormies autour de leurs lampes" },
  { id: "02-03", debut: 26, duree: 5, titre: "La caméra monte vers le ciel, le vent dans les voiles" },
  { id: "02-04", debut: 31, duree: 4, titre: "La lune traverse les nuages" },

  { id: "03-01", debut: 35, duree: 3, titre: "Silence dramatique" },
  { id: "03-02", debut: 38, duree: 6, titre: "Le veilleur sur la hauteur, une lumière au loin" },
  { id: "03-03", debut: 44, duree: 3, titre: "Son visage change, il comprend" },
  { id: "03-04", debut: 47, duree: 4, titre: "Le cri : « Voici l'époux ! »" },
  { id: "03-05", debut: 51, duree: 1.5, titre: "Des yeux s'ouvrent brusquement" },
  { id: "03-06", debut: 52.5, duree: 2.5, titre: "Elles se lèvent dans la précipitation" },

  { id: "04-01", debut: 55, duree: 6, titre: "Elles prennent leurs lampes : les sages sont prêtes" },
  { id: "04-02", debut: 61, duree: 3, titre: "Gros plan : une flamme vacille" },
  { id: "04-03", debut: 64, duree: 4, titre: "Une autre flamme diminue, puis une autre" },
  { id: "04-04", debut: 68, duree: 6, titre: "Les cinq folles se regardent avec inquiétude" },
  { id: "04-05", debut: 74, duree: 6, titre: "Lampes fortes contre lampes faibles" },

  { id: "05-01", debut: 80, duree: 5, titre: "Pas assez d'huile" },
  { id: "05-02", debut: 85, duree: 4, titre: "Elles demandent de l'huile aux sages" },
  { id: "05-03", debut: 89, duree: 4, titre: "Les sages refusent avec tristesse" },
  { id: "05-04", debut: 93, duree: 6, titre: "La lumière de l'époux devient visible au loin" },
  { id: "05-05", debut: 99, duree: 6, titre: "Elles courent vers le village" },

  { id: "06-01", debut: 105, duree: 5, titre: "Course dans la nuit, une lampe s'éteint" },
  { id: "06-02", debut: 110, duree: 4, titre: "Une deuxième, puis une troisième" },
  { id: "06-03", debut: 114, duree: 4, titre: "La quatrième, puis la cinquième" },
  { id: "06-04", debut: 118, duree: 4, titre: "Peur et regret dans l'obscurité" },
  { id: "06-05", debut: 122, duree: 8, titre: "Lumière contre obscurité : les deux groupes se séparent" },

  { id: "07-01", debut: 130, duree: 7, titre: "Une magnifique procession apparaît au loin" },
  { id: "07-02", debut: 137, duree: 2, titre: "Les sages lèvent leurs lampes" },
  { id: "07-03", debut: 139, duree: 2, titre: "Visages illuminés de joie" },
  { id: "07-04", debut: 141, duree: 9, titre: "Plan majestueux : l'époux, la procession, les sages, la ville" },

  { id: "08-01", debut: 150, duree: 6, titre: "Les sages entrent avec l'époux" },
  { id: "08-02", debut: 156, duree: 2.5, titre: "La grande porte commence à se fermer" },
  { id: "08-03", debut: 158.5, duree: 2.5, titre: "Visages heureux des sages" },
  { id: "08-04", debut: 161, duree: 4, titre: "Gros plan : la porte se referme" },

  { id: "09-01", debut: 165, duree: 4, titre: "Les folles arrivent en courant" },
  { id: "09-02", debut: 169, duree: 3, titre: "Elles frappent, elles appellent" },
  { id: "09-03", debut: 172, duree: 1.6, titre: "Choc, peur et regret" },
  { id: "09-04", debut: 173.6, duree: 1.4, titre: "La porte ne s'ouvre pas" },

  { id: "10-01", debut: 175, duree: 2, titre: "La caméra s'éloigne des cinq devant la porte" },
  { id: "10-02", debut: 177, duree: 2, titre: "Plan sur la lune" },
];

const total = DECOUPAGE.reduce((s, p) => s + p.duree, 0);
if (Math.abs(total - 179) > 0.001) {
  throw new Error(`Le découpage doit durer 179 s (actuellement ${total} s).`);
}
