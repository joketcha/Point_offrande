# Prompts IA — « Au milieu de la nuit, à minuit »

Ce document sert à fabriquer les **46 plans réalistes** du film avec un générateur d'images
et de vidéos (Midjourney, Flux, Veo, Kling, Runway, Sora…), puis à les monter automatiquement
dans le projet Remotion.

Les prompts sont **en anglais** : les générateurs les comprennent mieux. Les explications sont
en français.

---

## 1. Méthode (à suivre dans cet ordre)

1. **Créer les fiches personnages** (section 3) : générer une planche de référence pour chacune
   des 10 vierges, l'époux et le veilleur. Garder la meilleure image de chacun.
2. **Générer l'image clé de chaque plan** (section 5) en donnant les fiches personnages comme
   référence (*Character reference* / `--cref` dans Midjourney, *References* dans Runway,
   *Ingredients* dans Veo, *Elements* dans Kling). Ajouter à chaque fois le **style global** et
   le **prompt négatif** (section 2).
3. **Animer l'image** (image-to-video) avec la ligne *Mouvement* du plan. Générer une vidéo
   **au moins aussi longue** que la durée indiquée : le montage coupe automatiquement le surplus.
4. **Exporter** en 16:9, 1920×1080 de préférence, MP4 (H.264). Garder l'action importante au
   centre : des bandes noires cinéma couvrent 138 px en haut et en bas.
5. **Nommer le fichier avec l'identifiant du plan** et le déposer dans `public/plans/`,
   par exemple `public/plans/03-04.mp4`. Une image fixe (`.jpg`, `.png`, `.webp`) fonctionne aussi :
   elle reçoit un lent travelling avant.
6. Lancer `npm run dev` pour voir le résultat, puis
   `npx remotion render AuMilieuDeLaNuit out/minuit.mp4`.

Tant qu'un plan n'a pas de fichier, la version dessinée actuelle s'affiche à sa place : on
peut donc avancer plan par plan. Les sous-titres, le grain, les bandes cinéma, le fondu final
et « Soyez prêts. » sont ajoutés par le montage : **ne pas mettre de texte dans les images**.

### Règles du film à vérifier sur chaque génération

- **Exactement 10 vierges** quand le groupe est entier : 5 sages, 5 folles. Les IA se trompent
  souvent dans les comptes : **compter**, et régénérer ou retoucher (inpainting) si besoin.
- Les **sages** portent à la ceinture une **petite fiole d'huile en terre cuite** ; les folles n'en
  ont pas. C'est le détail qui raconte l'histoire.
- **Aucune maison** autour des vierges pendant l'attente et le sommeil (plans 01 à 03).
- **L'époux n'est pas visible clairement avant le plan 07-01.**
- Les flammes des folles faiblissent à partir de 04-01 et sont **toutes éteintes** à partir de 06-03.

---

## 2. Style global et prompt négatif

**Style global** (à ajouter à la fin de chaque prompt d'image) :

```
cinematic film still from a realistic biblical epic, first-century Judea, deep night,
dark blue moonlight, warm orange oil-lamp and torch light, light mist in the valleys,
historically accurate Near Eastern costumes, natural expressive faces, real skin texture,
anamorphic widescreen composition, shot on ARRI Alexa 65, shallow depth of field,
subtle film grain, slow majestic mood, 16:9
```

**Prompt négatif** (champ *negative prompt*, ou `--no` dans Midjourney) :

```
cartoon, animation, anime, illustration, painting, 3d render, CGI look, plastic skin,
doll faces, extra people, extra fingers, deformed hands, text, letters, watermark, logo,
modern clothing, electric light, sunglasses, makeup, oversaturated colors
```

**Réglages conseillés** : format 16:9 ; vidéo 24 ou 30 images/s ; mouvements de caméra lents ;
pas de coupe à l'intérieur d'un clip.

---

## 3. Fiches personnages (à générer en premier)

Prompt de planche de référence, à répéter pour chaque personnage en remplaçant `[DESCRIPTION]` :

```
character reference sheet, the same person shown three times: front view, side profile,
three-quarter view, full body and close-up face, neutral dark background, soft warm lamp
light from one side, [DESCRIPTION], realistic, photographic, highly detailed face and hands
```

### Les cinq vierges sages (fiole d'huile en terre cuite à la ceinture)

| Repère | Description (à coller dans `[DESCRIPTION]`) |
|---|---|
| **Sage 1 — Myriam** | young Jewish woman around 20, calm oval face, dark brown eyes, long dark braid under an undyed cream linen veil, dark brown wool tunic, leather belt with a small terracotta oil flask, holding a clay oil lamp |
| **Sage 2 — Tamar** | young Jewish woman around 19, round face, thick curly black hair, saffron-ochre veil, charcoal grey wool tunic, leather belt with a small terracotta oil flask, holding a clay oil lamp |
| **Sage 3 — Léa** | young Jewish woman around 22, slender face, high cheekbones, pale blue-grey linen veil, deep slate-blue tunic, leather belt with a small terracotta oil flask, holding a clay oil lamp |
| **Sage 4 — Ruth** | young Jewish woman around 18, olive skin, wide gentle eyes, white linen veil with thin blue woven stripes, warm brown tunic, leather belt with a small terracotta oil flask, holding a clay oil lamp |
| **Sage 5 — Shoshana** | young Jewish woman around 21, serene face, sand-beige veil, dark umber tunic, leather belt with a small terracotta oil flask, holding a clay oil lamp |

### Les cinq vierges folles (pas de fiole d'huile)

| Repère | Description |
|---|---|
| **Folle 1 — Dina** | young Jewish woman around 20, expressive face, rust terracotta veil, dark brown tunic, no flask at the belt, holding a clay oil lamp |
| **Folle 2 — Noa** | young Jewish woman around 19, long wavy black hair, deep madder-red veil, dark taupe tunic, no flask at the belt, holding a clay oil lamp |
| **Folle 3 — Hanna** | young Jewish woman around 21, freckled olive skin, olive-green veil, dark khaki tunic, no flask at the belt, holding a clay oil lamp |
| **Folle 4 — Abigaïl** | young Jewish woman around 22, sharp features, indigo-grey veil, charcoal tunic, no flask at the belt, holding a clay oil lamp |
| **Folle 5 — Yaël** | young Jewish woman around 18, soft round face, walnut-brown veil with an embroidered hem, brown tunic, no flask at the belt, holding a clay oil lamp |

### Autres personnages

| Repère | Description |
|---|---|
| **L'époux** | Jewish bridegroom around 30, noble kind face, short dark beard, radiant expression, white linen robe with gold embroidered border, crimson mantle over one shoulder, golden olive-leaf wreath on his head |
| **Le veilleur** | Jewish man around 55, weathered face, grey beard, brown woven head cloth, coarse brown wool mantle, standing on rocky ground |
| **Porteurs de torches** | young men in simple undyed wool tunics and head cloths, holding tall wooden torches with real fire |

**Lampe** : petite lampe à huile hérodienne en terre cuite, ronde, avec un bec et une flamme
nue. **Décor** : collines de Judée, oliviers noueux, ancien chemin de pierres, ville fortifiée
en pierre claire sur une colline (visible seulement à partir de 07-01).

---

## 4. Comment lire chaque plan

- **ID / temps / durée** : nom du fichier à créer et place dans le film.
- **Image** : prompt de l'image clé. Les personnages entre crochets (`[Sage 1]`, `[les 5 sages]`…)
  désignent les fiches de la section 3, à joindre en référence.
- **Mouvement** : prompt pour animer l'image en vidéo.

---

## 5. Les 46 plans

### 00:00 – 00:15 · L'attente

**01-01** · 00:00 · 6 s · *plan très large, travelling avant*
- Image : `extreme wide shot of the Judean hills at midnight, full moon, silver light on old olive trees, an ancient stone path winding through the valley, in the middle distance exactly ten young women in veils standing in a loose group beside the path, each holding a small glowing oil lamp, ten tiny warm lights in a vast blue night, light mist in the valley, no houses, no buildings`
- Mouvement : `very slow cinematic push-in toward the group of women, mist drifting, lamp flames flickering gently`

**01-02** · 00:06 · 1,8 s · *gros plan*
- Image : `extreme close-up of a small terracotta Herodian oil lamp burning on a stone, single warm flame, dark night background with soft bokeh of other lamps`
- Mouvement : `the flame flickers softly, very slow push-in`

**01-03** · 00:07,8 · 1,8 s · *gros plan*
- Image : `close-up of a young woman's hand [Sage 4] holding a terracotta oil lamp, warm light on her fingers and on the folds of her sleeve, night background`
- Mouvement : `slight hand movement, flame flickers, slow lateral drift`

**01-04** · 00:09,6 · 1,8 s · *gros plan visage*
- Image : `close-up of a tired young woman [Sage 2] sitting at night, eyelids heavy, face lit from below by an oil lamp, veil framing her face, blue moonlight on her shoulder`
- Mouvement : `she blinks slowly, fighting sleep, lamp light flickers on her face`

**01-05** · 00:11,4 · 1,8 s · *très gros plan*
- Image : `macro shot of three small oil-lamp flames side by side in the darkness, slightly trembling in a light night breeze, deep black background`
- Mouvement : `flames sway and flicker gently in the breeze`

**01-06** · 00:13,2 · 1,8 s · *gros plan visage*
- Image : `close-up profile of a young woman [Folle 3] looking far into the distance, searching the dark horizon, moonlit eyes, warm lamp light on her cheek`
- Mouvement : `her eyes move slowly across the horizon, slow push-in`

### 00:15 – 00:35 · Le sommeil

**02-01** · 00:15 · 6 s · *plan moyen*
- Image : `medium wide shot at night of exactly ten young women [les 10 vierges] waiting on a hillside among olive trees, one woman is sitting down on the ground beside her lamp while the others still stand, all lamps glowing, moonlight, no houses`
- Mouvement : `one by one, the women slowly sit down on the ground next to their lamps, tired, static camera`

**02-02** · 00:21 · 5 s · *plan moyen*
- Image : `exactly ten young women asleep on the ground around their glowing oil lamps on a moonlit hillside, heads resting on their knees or on each other's shoulders, veils covering them, small warm circles of light, olive trees, no houses`
- Mouvement : `gentle breathing, veils move slightly in the wind, flames keep burning, very slow push-in`

**02-03** · 00:26 · 5 s · *mouvement de grue vers le ciel*
- Image : `high angle shot over ten sleeping women around small oil lamps on a dark hillside, wind moving their veils, the night sky above with drifting clouds`
- Mouvement : `the camera slowly cranes up and tilts toward the sky, the sleeping women and their lamps shrink below, wind in the veils`

**02-04** · 00:31 · 4 s · *ciel*
- Image : `full moon partly covered by thin moving clouds in a deep blue night sky, stars, cinematic`
- Mouvement : `clouds slowly pass in front of the moon, moonlight dims and returns`

### 00:35 – 00:55 · Le cri

**03-01** · 00:35 · 3 s · *plan large immobile*
- Image : `wide shot of ten women sleeping around small dim oil lamps on a dark hillside under the moon, total stillness, deep silence, mist`
- Mouvement : `almost no movement, only tiny flickering flames, static camera`

**03-02** · 00:38 · 6 s · *plan large*
- Image : `silhouette of an old man [le veilleur] standing alone on a rocky hilltop at night against the moonlit sky, looking toward the far horizon, where a tiny warm light appears in the darkness`
- Mouvement : `the distant light slowly grows, wind moves his mantle, slow push-in`

**03-03** · 00:44 · 3 s · *gros plan visage*
- Image : `close-up of the weathered face of an old Jewish man [le veilleur] at night, faint warm light from the distant horizon on his face, his eyes widen as he understands`
- Mouvement : `his expression changes from attention to sudden realisation, eyes widen`

**03-04** · 00:47 · 4 s · *plan moyen, contre-plongée*
- Image : `the old man [le veilleur] on the hilltop raising his hand to his mouth and shouting with all his strength toward the valley, moonlit sky behind him, dramatic low angle`
- Mouvement : `he cups his hand to his mouth and cries out loudly, mantle blown by the wind, slight camera shake`

**03-05** · 00:51 · 1,5 s · *très gros plan*
- Image : `extreme close-up of a young woman's closed eye [Sage 4], veil edge, warm lamp light`
- Mouvement : `her eye suddenly snaps open, startled`

**03-06** · 00:52,5 · 2,5 s · *plan moyen*
- Image : `exactly ten young women waking abruptly on a moonlit hillside, scrambling to their feet in haste beside their oil lamps, veils falling, urgency`
- Mouvement : `the women rise quickly in a hurry, grabbing their veils and lamps, handheld camera`

### 00:55 – 01:20 · Réveillez-vous !

**04-01** · 00:55 · 6 s · *plan moyen*
- Image : `exactly ten young women standing at night, five on the left [les 5 sages] lifting bright, strong oil lamps with confidence, clay oil flasks at their belts, five on the right [les 5 folles] holding lamps whose flames are visibly weaker`
- Mouvement : `the five on the left raise their lamps steadily, the flames on the right begin to weaken and flicker`

**04-02** · 01:01 · 3 s · *très gros plan*
- Image : `extreme close-up of a weak flame on a terracotta oil lamp, the flame is small and unstable, dark background`
- Mouvement : `the flame trembles, shrinks almost to nothing, then struggles back weakly`

**04-03** · 01:04 · 4 s · *gros plan*
- Image : `three oil lamps held by different hands in a row in the dark, their flames small and fading`
- Mouvement : `one flame diminishes, then the next, then the next`

**04-04** · 01:08 · 6 s · *plan rapproché*
- Image : `two young women [Folle 1, Folle 4] face to face at night, worried expressions, lit only by weak lamp flames, the other foolish virgins behind them in shadow`
- Mouvement : `they exchange anxious looks, glance down at their lamps, slow push-in`

**04-05** · 01:14 · 6 s · *plan large*
- Image : `the ten women at night clearly divided: on the left five bright lamps and calm faces, on the right five dying flames and worried faces, contrast of light and darkness`
- Mouvement : `slow push-in toward the five worried women on the right, their flames flicker`

### 01:20 – 01:45 · L'huile manque

**05-01** · 01:20 · 5 s · *gros plan*
- Image : `close-up of a young woman's hands [Folle 2] tilting a clay oil lamp to look inside, the reservoir almost empty, tiny weak flame`
- Mouvement : `she tilts the lamp, looks inside, her hands tremble slightly`

**05-02** · 01:25 · 4 s · *plan moyen*
- Image : `the five foolish virgins turning toward the five wise virgins at night, one of them [Folle 1] reaching out her hand pleading, weak lamps, the wise ones with bright lamps and oil flasks at their belts`
- Mouvement : `the foolish woman steps forward, hand extended, pleading`

**05-03** · 01:29 · 4 s · *plan rapproché*
- Image : `a wise virgin [Sage 1] with a bright lamp and a clay oil flask at her belt, gently shaking her head with sadness and compassion, night`
- Mouvement : `she slowly shakes her head, eyes full of sorrow, holding her flask close`

**05-04** · 01:33 · 6 s · *plan large, de dos*
- Image : `from behind, the five foolish virgins standing on a hillside with dying lamps, looking at a faint warm glow growing on the far horizon in the night`
- Mouvement : `the distant glow grows slowly brighter, the women stay still, then turn their heads toward each other`

**05-05** · 01:39 · 6 s · *plan large*
- Image : `the five foolish virgins running away into the night down a stone path toward a distant village, holding their weak lamps, veils flying, the wise virgins standing still behind them with bright lamps`
- Mouvement : `the five women run away from camera into the darkness, veils and robes flying`

### 01:45 – 02:10 · Les cinq lampes s'éteignent

**06-01** · 01:45 · 5 s · *travelling latéral*
- Image : `side tracking shot of five young women [les 5 folles] running through a dark olive grove at night, holding small weak oil lamps, moonlight, motion`
- Mouvement : `camera tracks alongside the running women, one of the lamps goes out leaving a thin wisp of smoke`

**06-02** · 01:50 · 4 s · *travelling latéral*
- Image : `five women running in the night, only three small flames left among their lamps, darkness closing in`
- Mouvement : `a second lamp goes out, then a third, thin smoke trails behind them`

**06-03** · 01:54 · 4 s · *travelling*
- Image : `five women running in near total darkness, the last tiny flame on a single lamp`
- Mouvement : `the fourth lamp goes out, then the fifth, now only moonlight on their running silhouettes`

**06-04** · 01:58 · 4 s · *gros plan visage*
- Image : `close-up of a young woman [Folle 2] running at night, face lit only by cold blue moonlight, fear and regret in her eyes, out-of-breath, extinguished lamp in her hand`
- Mouvement : `handheld, she runs breathing hard, tears in her eyes`

**06-05** · 02:02 · 8 s · *plan très large*
- Image : `extreme wide shot of a valley at night split in two: on the right, five women walking calmly with bright warm lamps toward a growing golden glow on the horizon; on the left, five dark silhouettes running away into total darkness; light versus darkness`
- Mouvement : `the two groups slowly separate, the bright group moves right, the dark group disappears left`

### 02:10 – 02:30 · L'époux arrive

**07-01** · 02:10 · 7 s · *plan large*
- Image : `a magnificent night procession descending from a lit stone city on a hill, a long line of people carrying burning torches, in its centre a bridegroom in white and gold, the warm torchlight crossing the dark blue night, five women with bright lamps waiting in the foreground`
- Mouvement : `the procession slowly approaches the camera, torches swaying, warm light spreading through the night`

**07-02** · 02:17 · 2 s · *plan moyen*
- Image : `the five wise virgins [les 5 sages] raising their bright oil lamps high toward the approaching torchlight, faces turned toward the light`
- Mouvement : `they lift their lamps together, light growing on their faces`

**07-03** · 02:19 · 2 s · *gros plan visage*
- Image : `close-up of a young woman [Sage 1] face illuminated by golden torchlight, joy and wonder, eyes shining, gentle smile`
- Mouvement : `her face lights up with joy, warm light intensifies`

**07-04** · 02:21 · 9 s · *plan majestueux*
- Image : `majestic symmetrical wide shot: the bridegroom [l'époux] in the centre in white and gold, behind him a procession of torchbearers, in the foreground five young women [les 5 sages] with raised bright lamps facing him, a lit fortified stone city in the background on the hill, golden light against the blue night`
- Mouvement : `slow majestic push-in toward the bridegroom, torches flickering, gentle movement of the crowd`

### 02:30 – 02:45 · La porte

**08-01** · 02:30 · 6 s · *plan large*
- Image : `the bridegroom [l'époux] and five women [les 5 sages] with lamps entering through a great open wooden double door into a wedding hall full of warm golden light, seen from outside in the night, stone walls`
- Mouvement : `they walk away from camera into the light and disappear inside, camera stays outside`

**08-02** · 02:36 · 2,5 s · *plan large*
- Image : `the great wooden double door of the wedding hall at night, warm light pouring out, the door beginning to close`
- Mouvement : `the heavy door slowly starts to close, the light narrows`

**08-03** · 02:38,5 · 2,5 s · *gros plan visage*
- Image : `close-up of a joyful young woman [Sage 3] inside the warm golden wedding hall, glowing face, smiling, festive light`
- Mouvement : `she smiles and looks around in wonder, soft festive light`

**08-04** · 02:41 · 4 s · *gros plan*
- Image : `close-up on the heavy wooden door with iron studs, a thin strip of golden light between the two leaves`
- Mouvement : `the door closes completely with a heavy impact, the light disappears, dust trembles`

### 02:45 – 02:55 · Trop tard

**09-01** · 02:45 · 4 s · *plan large, de dos*
- Image : `from behind, five women [les 5 folles] with extinguished lamps arriving running in front of a closed great wooden door at night, a thin line of warm light under the door`
- Mouvement : `they arrive breathless and stop in front of the closed door, camera stays behind them`

**09-02** · 02:49 · 3 s · *plan moyen, de dos*
- Image : `from behind, the five women desperately knocking on the closed wooden door with their fists, calling out, night`
- Mouvement : `they knock frantically and call out, the door does not move, camera stays behind them`

**09-03** · 02:52 · 1,6 s · *gros plan visage*
- Image : `close-up of a young woman [Folle 3] in front of the closed door, face in cold moonlight, shock, fear and regret, tears`
- Mouvement : `her face breaks with regret, a tear falls`

**09-04** · 02:53,6 · 1,4 s · *plan moyen*
- Image : `the great closed wooden door at night, completely still, five women in front of it`
- Mouvement : `nothing moves, the door stays shut`

### 02:55 – 02:59 · Le dernier plan

**10-01** · 02:55 · 2 s · *plan large, travelling arrière*
- Image : `wide shot at night: five women standing motionless in front of a great closed door, their lamps extinguished, behind the door and through high windows a warm light keeps shining, total silence`
- Mouvement : `the camera slowly pulls back, the women become small in front of the door`

**10-02** · 02:57 · 2 s · *ciel*
- Image : `the full moon alone in a dark blue night sky, thin clouds`
- Mouvement : `clouds drift slowly over the moon` (le montage ajoute ensuite le fondu au noir et « Soyez prêts. »)
