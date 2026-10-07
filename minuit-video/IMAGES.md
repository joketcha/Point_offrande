# 20 images clés — rendu réaliste façon « reel »

Version simplifiée de [PROMPTS.md](PROMPTS.md) : **20 images fixes** suffisent pour tout le film.
Le montage leur ajoute un lent mouvement de caméra, des fondus enchaînés en surimpression,
les sous-titres, le grain et le message final.

## Méthode

1. Générer chaque image avec un outil d'images IA (ChatGPT, Gemini, Bing Image Creator,
   Ideogram, Leonardo, Midjourney, Flux…), au format **vertical 9:16**.
2. Pour garder les **mêmes visages d'une image à l'autre**, générer d'abord les fiches
   personnages de la section 3 de [PROMPTS.md](PROMPTS.md), puis les joindre en référence.
   Dans ChatGPT ou Gemini, on peut aussi rester dans la même conversation et écrire
   « mêmes personnages que l'image précédente ».
3. Nommer l'image avec son numéro (`01.jpg`, `02.png`…) et la déposer dans `public/images/`,
   ou l'envoyer à Claude pour qu'il l'intègre.
4. Exporter :
   - vertical (Reels, TikTok, Shorts) : `npx remotion render AuMilieuDeLaNuit-Reel out/reel.mp4`
   - horizontal 16:9 : `npx remotion render AuMilieuDeLaNuit out/minuit.mp4`
     (les images verticales y sont affichées en entier sur un fond flou).

Tant qu'une image manque, la version dessinée s'affiche à sa place.
**Pas de texte dans les images** : les sous-titres sont ajoutés au montage.

**À vérifier** : exactement **10** vierges quand le groupe est entier (5 sages, 5 folles) ;
les sages ont une petite fiole d'huile à la ceinture ; aucune maison pendant l'attente ;
l'époux n'apparaît pas avant l'image 15.

## Style à ajouter à la fin de chaque prompt

```
ultra-realistic cinematic photograph, biblical epic film, first-century Judea, deep blue night,
warm golden oil-lamp light on the faces, natural expressive faces, real skin texture,
historically accurate Near Eastern costumes, shallow depth of field, rich cinematic color grading,
dramatic composition, vertical 9:16, no text
```

**À éviter** (prompt négatif si l'outil le permet) :
`cartoon, illustration, 3d render, anime, painting, plastic skin, extra people, deformed hands, text, watermark, modern clothing`

## Les 20 images

| N° | Temps | Ce qu'on voit |
|---|---|---|
| 01 | 00:00 – 00:09 | Les dix vierges attendent dans les collines |
| 02 | 00:09 – 00:15 | Une lampe, un visage fatigué |
| 03 | 00:15 – 00:26 | Elles s'endorment autour des lampes |
| 04 | 00:26 – 00:35 | La lune entre les nuages |
| 05 | 00:35 – 00:44 | Le veilleur sur la hauteur, une lumière au loin |
| 06 | 00:44 – 00:51 | « Voici l'époux ! » |
| 07 | 00:51 – 00:55 | Elles se réveillent en sursaut |
| 08 | 00:55 – 01:04 | Lampes fortes, lampes faibles |
| 09 | 01:04 – 01:14 | Une flamme vacille, l'inquiétude |
| 10 | 01:14 – 01:25 | Pas assez d'huile |
| 11 | 01:25 – 01:33 | « Donnez-nous de votre huile » |
| 12 | 01:33 – 01:45 | Elles partent en courant |
| 13 | 01:45 – 01:58 | Les lampes s'éteignent dans la course |
| 14 | 01:58 – 02:10 | La peur et le regret |
| 15 | 02:10 – 02:21 | La procession de l'époux |
| 16 | 02:21 – 02:30 | L'époux et les cinq sages |
| 17 | 02:30 – 02:38 | Elles entrent avec lui |
| 18 | 02:38 – 02:45 | La porte se referme |
| 19 | 02:45 – 02:55 | « Seigneur, ouvre-nous ! » |
| 20 | 02:55 – 02:59 | La lune. Soyez prêts. |

### 01 — Les dix vierges attendent dans les collines
```
exactly ten young Jewish women in long veils and simple wool tunics standing in a loose group on a hillside of the Judean hills at midnight, each holding a small glowing clay oil lamp, ten warm lights in the darkness, old olive trees, an ancient stone path, full moon above, light mist in the valley, no houses, seen from slightly above
```

### 02 — Une lampe, un visage fatigué
```
close-up of a young Jewish woman in a cream linen veil, tired eyelids half closed, her face lit from below by the warm flame of a small terracotta oil lamp she holds near her chin, blurred lamps of other women in the background bokeh
```

### 03 — Elles s'endorment autour des lampes
```
exactly ten young women in veils asleep on the ground of a moonlit hillside, sitting with their heads resting on their knees or on each other's shoulders, small oil lamps still burning at their feet, circles of warm light in the blue night, olive trees, peaceful, no houses
```

### 04 — La lune entre les nuages
```
a huge full moon partly hidden by thin drifting clouds over dark Judean hills, silhouettes of olive trees, tiny warm lamp lights far below on a hillside, deep blue night, majestic
```

### 05 — Le veilleur sur la hauteur
```
an old Jewish man with a grey beard, brown head cloth and wool mantle standing on a rocky hilltop at night, seen from behind and slightly to the side, looking toward the far horizon where a small warm golden light appears in the darkness, moonlit valley below
```

### 06 — « Voici l'époux ! »
```
dramatic low-angle portrait of the same old bearded man on the hilltop at night, hand raised to his mouth, shouting with all his strength, eyes wide, mantle blown by the wind, moon behind him, intense emotion
```

### 07 — Elles se réveillent en sursaut
```
close-up of a young Jewish woman suddenly waking up at night, eyes wide open in surprise, veil slipping from her hair, warm oil-lamp light on her face, other women rising in the blurred background
```

### 08 — Lampes fortes, lampes faibles
```
exactly ten young women standing at night: on the left five women calmly lifting bright, strong oil lamps, small clay oil flasks at their belts; on the right five women looking anxiously at lamps with tiny weak flames; strong contrast of warm light on the left and darkness on the right
```

### 09 — Une flamme vacille
```
close-up of a worried young woman in a deep red veil staring at the tiny dying flame of the clay oil lamp in her hands, fear in her eyes, almost no light on her face, another anxious woman behind her
```

### 10 — Pas assez d'huile
```
close-up of a young woman's hands tilting an almost empty terracotta oil lamp to look inside, the flame reduced to a tiny spark, her worried face out of focus above, night
```

### 11 — « Donnez-nous de votre huile »
```
a young woman with a dim lamp reaching out her hand pleading toward another young woman in a cream veil who holds a bright lamp and a small clay oil flask against her chest, the second woman shaking her head with sadness and compassion, night, warm and cold light
```

### 12 — Elles partent en courant
```
five young women in veils running away down a stone path into the dark night toward a distant village, holding weak lamps, veils and robes flying, seen from behind, a faint golden glow on the horizon
```

### 13 — Les lampes s'éteignent
```
five young women running through a dark olive grove at night, their clay lamps extinguished, thin trails of smoke rising from the wicks, only cold blue moonlight on their silhouettes, motion, desperation
```

### 14 — La peur et le regret
```
close-up of a young Jewish woman in an olive-green veil at night, face lit only by cold blue moonlight, tears in her eyes, fear and regret, extinguished lamp held against her chest, out of breath
```

### 15 — La procession de l'époux
```
a magnificent night procession descending from a lit stone city on a hill, many men carrying tall burning torches, golden light crossing the dark blue night, in the foreground five young women raising bright oil lamps toward it, seen from behind
```

### 16 — L'époux et les cinq sages
```
majestic shot of a Jewish bridegroom around 30, short dark beard, kind radiant face, white linen robe with gold embroidery, crimson mantle, golden olive-leaf wreath, standing in torchlight with torchbearers behind him, five young women with raised bright lamps before him, faces filled with joy and wonder, lit city in the background
```

### 17 — Elles entrent avec lui
```
the bridegroom in white and gold and five young women with lamps walking through a huge open wooden double door into a wedding hall glowing with warm golden light, seen from outside in the night, stone walls, joyful atmosphere
```

### 18 — La porte se referme
```
a massive ancient wooden double door with iron studs closing in a stone wall at night, only a thin strip of warm golden light remaining between the two leaves, dramatic, silent
```

### 19 — « Seigneur, ouvre-nous ! »
```
five young women with extinguished lamps desperately knocking on a huge closed wooden door at night, seen from behind, one with her forehead against the door, a thin line of warm light under the door, cold moonlight on them, despair
```

### 20 — La lune
```
the full moon alone in a deep blue night sky above the dark outline of a stone city, a faint warm glow from one window, thin clouds, silence, contemplative
```
