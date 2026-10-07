# Au milieu de la nuit, à minuit

Court-métrage biblique (Matthieu 25:1-13) réalisé avec [Remotion](https://remotion.dev).
Durée : **2 min 59 s** — 1920×1080, 30 i/s, format cinéma 2.39:1 (bandes noires, grain, vignettage).

## Lancer

```bash
npm install
npm run dev                                   # Remotion Studio (aperçu interactif)
npx remotion render AuMilieuDeLaNuit out/minuit.mp4
```

## Structure

| Minutage | Scène | Fichier |
|---|---|---|
| 00:00 – 00:15 | L'attente | `src/scenes/S01Attente.tsx` |
| 00:15 – 00:35 | Le sommeil | `src/scenes/S02Sommeil.tsx` |
| 00:35 – 00:55 | Le cri | `src/scenes/S03Cri.tsx` |
| 00:55 – 01:20 | Réveillez-vous ! | `src/scenes/S04Reveil.tsx` |
| 01:20 – 01:45 | L'huile manque | `src/scenes/S05HuileManque.tsx` |
| 01:45 – 02:10 | Les cinq lampes s'éteignent | `src/scenes/S06Extinction.tsx` |
| 02:10 – 02:30 | L'époux arrive | `src/scenes/S07Epoux.tsx` |
| 02:30 – 02:45 | La porte | `src/scenes/S08Porte.tsx` |
| 02:45 – 02:55 | Trop tard | `src/scenes/S09TropTard.tsx` |
| 02:55 – 02:59 | Le dernier plan + « Soyez prêts. » | `src/scenes/S10DernierPlan.tsx` |

La composition principale est `AuMilieuDeLaNuit` (`src/Minuit.tsx`). Chaque scène est aussi
enregistrée seule dans le dossier **Scenes** du Studio.

Règles du scénario garanties par le code (`src/lib/vierges.ts`, `src/elements/Groupe.tsx`) :
exactement **dix** vierges (5 sages, 5 folles), aucune maison pendant l'attente, l'époux
n'apparaît qu'avec sa procession.

## Rendu réaliste en 20 images (recommandé)

Générez **20 images fixes** avec une IA (prompts dans [IMAGES.md](IMAGES.md)) et déposez-les dans
`public/images/01.jpg` … `20.jpg`. Le montage ajoute mouvements lents, fondus enchaînés en
surimpression, sous-titres et grain.

- Vertical 9:16 (Reels, TikTok) : `npx remotion render AuMilieuDeLaNuit-Reel out/reel.mp4`
- Horizontal 16:9 : `npx remotion render AuMilieuDeLaNuit out/minuit.mp4`

## Plans IA détaillés (46 plans, optionnel)

Le film est découpé en **46 plans** (`src/lib/decoupage.ts`). Pour chaque plan, déposez une
vidéo ou une image générée par IA dans `public/plans/` sous le nom de son identifiant
(`01-01.mp4`, `03-04.jpg`…) : elle remplace automatiquement la version dessinée, au bon
moment et à la bonne durée. Les sous-titres, le grain, les bandes cinéma et le message final
restent ajoutés par le montage.

👉 **Les prompts de chaque plan, les fiches personnages et la méthode sont dans [PROMPTS.md](PROMPTS.md).**

## Musique

Déposez un fichier dans `public/` et indiquez son nom dans la prop `musique` de
`AuMilieuDeLaNuit` (ex. `"musique.mp3"`) : fondu d'entrée et de sortie automatique.
