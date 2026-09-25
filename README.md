# RELIABILITY MASTER — AFRICA TO WORLD

**« Deviens celui qui transforme les pannes en performance. »**

Simulateur immersif (« flight simulator ») de l'ingénieur fiabiliste. Le joueur prend son poste à la **Brasserie AIG de Douala** (Africa Industrial Group) — une usine en difficulté — et progresse de *Technicien analyste* à *Global Reliability & Asset Management Expert* en prenant de vraies décisions de fiabilité dont il subit les conséquences.

## Jouer

```bash
npm install
npm run dev            # http://localhost:5173
npm run build:single   # dist-single/index.html : un seul fichier, jouable hors ligne
```

## Ce que contient le prototype

- **Usine simulée mois par mois** : 16 équipements, 29 modes de défaillance (lois de Weibull, intervalles P-F), 4 causes latentes de pannes répétitives, magasin de 24 articles (doublons, obsolètes, pièces d'assurance), équipe, backlog, budget, confiance de la Direction, sécurité, moral, qualité des données.
- **Décisions** : stratégie par mode (correctif, préventif systématique, conditionnel, prédictif), intervalles, politique min/max des pièces, projets d'amélioration, événements sous pression (budget −20 %, départ d'un technicien clé, délestages, fournisseur en retard, audit surprise…).
- **13 missions** : GMAO « data dirty », KPI de base, crise Ligne 1, Weibull, AMDEC, magasin, RCM, RCA, P-F, comité de direction, architecture système, TCO, et l'épreuve finale *Take over the factory* (cimenterie, 12 mois).
- **Règle pédagogique** : jamais de réponse immédiate — conséquence, question, raisonnement écrit, indices progressifs, méthode, bonne pratique, puis refaire.
- **Carrière** : 16 compétences, Reliability Score, Industrial Impact Score (mesuré sur l'usine), 10 niveaux, 6 certifications pratiques, badges, parcours adaptatif selon les erreurs.
- **Laboratoires libres** : lois (exponentielle, Weibull, lognormale, gamma), Weibull sur vos données (MRR + MLE avec censures), remplacement à âge optimal, P-F, systèmes & Markov.
- **REX** (Pareto, récurrences, efficacité avant/après), **audit de maturité** (14 dimensions, 6 niveaux), **bibliothèque** structurée selon l'architecture du manuel.

## Architecture

Voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) (architecture fonctionnelle et technique, modèle de données, moteur de simulation, XP, modèles équipements/pannes/économie, missions) et [`docs/schema.sql`](docs/schema.sql).

```
src/engine   moteur pur (stats, simulation, progression, effets)  ← testé (npm test)
src/data     contenu (usines, missions, événements, mentors, bibliothèque)
src/store    état + persistance abstraite (localStorage aujourd'hui, API demain)
src/missions scénarios jouables
src/screens  cockpit, usine, magasin, REX, audit, profil, laboratoires, bibliothèque
```

## Qualité

```bash
npm run typecheck
npm test
```

> Note : l'ouvrage « Méthodes de maintenance industrielle et fiabilité — Manuel avancé » n'a pas été fourni sous forme de fichier ; la bibliothèque et les scénarios suivent son architecture (Fondements → FMD → Méthodes de décision → Ingénierie → Pilotage → REX) et sont conçus pour être enrichis avec son contenu (`src/data/library.ts`).
