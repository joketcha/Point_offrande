# RELIABILITY MASTER — AFRICA TO WORLD

> Ce dépôt contient aussi l'application **[Pilotage des révisions annuelles](revisions/README.md)** (dossier `revisions/`).

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

## Améliorations récentes (itération 2)

- **Débriefing mensuel** au cockpit : attribution des pertes (Pareto du mois), part des attentes de pièces, pannes répétitives, variations expliquées.
- **Mission « Centre de diagnostic »** (§10) : lecture de spectre vibratoire (balourd, désalignement, roulement, lubrification, desserrage), recoupement huile/thermographie/ultrasons, estimation de la **RUL** (durée de vie résiduelle) et décision intervenir/planifier/surveiller. Cas différent à chaque tentative.
- **Coach de raisonnement** : le texte écrit après une erreur est évalué (longueur, vocabulaire technique, élément chiffré, action corrective) et reçoit un retour immédiat.
- **Options mélangées** : l'ordre d'affichage des choix est randomisé pour empêcher de repérer la bonne réponse par sa position.
- **Missions rejouables** : Weibull, KPI et Diagnostic génèrent des données différentes à chaque tentative (graine par tentative).
- **Comité en texte libre** : une étape d'accroche rédigée, évaluée sur la présence d'une demande, d'un chiffre et d'un risque.
- **Take over rééquilibré** : le verdict compare l'état atteint à une **référence figée** captée au démarrage (usine héritée), et non aux premiers mois du joueur — un pilotage expert réussit désormais (score 80-90, vérifié par test).
- **Sauvegardes robustes** : normalisation au chargement (une mise à jour n'efface plus une partie en cours).
- **Tables plus lisibles sur mobile** et **tests de bout en bout** versionnés (`npm run test:e2e`, Playwright).

### Reste à faire (hors périmètre de cette itération)

- Intégrer le contenu de l'ouvrage (PDF non fourni).
- Backend serveur multi-joueurs (le schéma `docs/schema.sql` est prêt).
- Écran de planification/backlog interactif, construction d'arborescence GMAO, actions TPM, examens « plan de redressement 30 jours », sites internationaux supplémentaires, 3-5 scénarios par module.
