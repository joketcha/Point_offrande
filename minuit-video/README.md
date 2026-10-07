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

## Musique et plans réalistes

Les images sont dessinées procéduralement (SVG). Pour un rendu photo-réaliste, placez vos
plans filmés ou générés (Veo, Runway, Sora…) dans `public/` et indiquez leur nom dans les
props de `AuMilieuDeLaNuit` (Studio → panneau Props, ou `src/Root.tsx`) :

- `musique` : ex. `"musique.mp3"` (fondu d'entrée et de sortie automatique) ;
- `plans.attente`, `plans.sommeil`, … : un fichier vidéo par scène, qui remplace la version
  dessinée tout en gardant le minutage, les bandes cinéma et le grain.
