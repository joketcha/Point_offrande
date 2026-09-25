# RELIABILITY MASTER — AFRICA TO WORLD · Architecture

> « Un excellent fiabiliste n'est pas celui qui connaît le plus de formules. C'est celui qui sait transformer des données imparfaites en décisions industrielles rentables, sûres, robustes et exécutables. »

Ce document couvre les livrables 1 à 10 du cahier des charges. Les livrables 11 à 17 (scénarios jouables) sont décrits en §11.

---

## 1. Architecture fonctionnelle

```
                       ┌──────────────────────────── JOUEUR ────────────────────────────┐
                       │  décide · calcule · justifie · défend · pilote                 │
                       └───────┬───────────────┬───────────────┬───────────────┬────────┘
                               │               │               │               │
                        ┌──────▼─────┐  ┌──────▼──────┐ ┌──────▼──────┐ ┌──────▼──────┐
                        │  MISSIONS  │  │   USINE     │ │ LABORATOIRES│ │ BIBLIOTHÈQUE│
                        │ (scénarios │  │ (stratégies,│ │ (lois, Weib.│ │ (mini-cours │
                        │  guidés)   │  │  projets,   │ │  P-F, âge,  │ │  → exercice)│
                        └──────┬─────┘  │  magasin)   │ │  systèmes)  │ └─────────────┘
                               │        └──────┬──────┘ └─────────────┘
          effets (cause latente éliminée,      │ politiques
          données fiabilisées, déblocages)     │
                               │        ┌──────▼──────────────────────────┐
                               └───────►│   MOTEUR DE SIMULATION (mois)   │◄── événements sous pression
                                        │  Weibull · P-F · pièces · coûts │
                                        └──────┬──────────────────────────┘
                                               │ KPI, pannes, journal
                     ┌─────────────────────────┼───────────────────────────┐
               ┌─────▼─────┐             ┌─────▼─────┐               ┌─────▼──────┐
               │  COCKPIT  │             │ REX/Pareto│               │ AUDIT      │
               │  KPI      │             │ efficacité│               │ MATURITÉ   │
               └─────┬─────┘             └───────────┘               └─────┬──────┘
                     └──────────────► PROGRESSION (XP, compétences, scores, certifications, promotions) ◄─┘
```

| Module du cahier des charges | Où il vit dans l'application |
|---|---|
| Moteur de simulation (§4) | `src/engine/simulation.ts` |
| Fiabilité quantitative (§5) | Mission *KPI*, Labo *Lois*, `src/engine/stats.ts` |
| Laboratoire Weibull (§6) | Mission *Weibull P-101* (10 étapes regroupées en 5 décisions) + Labo *Weibull (vos données)* |
| AMDEC (§7) | Mission *AMDEC pasteurisateur* (structure, cotation challengée, priorisation par gravité, actions) |
| RCM (§8) | Mission *RCM P-101* (7 questions + gamme exécutable) |
| P-F (§9) | Mission *P-F sertisseuse* + Labo *Intervalle P-F* |
| Conditionnel/prédictif (§10) | Stratégies CBM/PDM dans l'usine, mission *Comité*, projet plateforme en ligne |
| RCA (§11) | Mission *RCA convoyeur* (preuves à budget limité, 5 Pourquoi, Ishikawa, plan + vérification) |
| Systèmes (§12) | Mission *Architecture* (série, parallèle, k/n, Monte-Carlo) + Labo *Systèmes & Markov* |
| Optimisation maintenance (§13) | Écran *Usine* (RTF/PM/CBM/PDM par mode) + comparateur Monte-Carlo (niveau 3) + Labo *Remplacement à âge* |
| Pièces de rechange (§14) | Écran *Magasin* (ABC, min/max, dormant, doublons) + mission *Magasin* |
| GMAO (§15) | Mission *GMAO* (data dirty), qualité de données comme variable d'état du moteur |
| Plans de maintenance (§16) | Étape *gamme exécutable* (RCM), alertes méthodes |
| Planification / backlog (§17) | Capacité, backlog, conformité préventive calculés par le moteur ; événements « Production refuse l'arrêt » |
| TPM / TRS (§18) | TRS = D × P × Q au cockpit |
| KPI (§19) | Cockpit (16 indicateurs, tendances, avertissement « ne jamais lire un KPI isolément ») |
| Audit de maturité (§20) | Écran *Audit* (14 dimensions, 6 niveaux, maillon faible plafonnant) |
| Décision sous pression (§21) | `src/data/events.ts` (9 événements, tirés à 50 %/mois) |
| Dimension africaine (§22) | Usine de Douala, délais d'import, devises, délestages, climat, reverse engineering local |
| Dimension internationale (§23) | Site de reprise (cimenterie) ; type `Region` prêt pour d'autres sites |
| Carrière (§24-25) | `src/engine/progression.ts` : 16 compétences, Reliability Score, Industrial Impact Score, 10 niveaux, 6 certifications |
| Mentors (§26) | `src/data/mentors.ts` — 8 mentors en désaccord (briefings, décisions, événements) |
| Comité de direction (§27) | Mission *Comité : 35 M FCFA* |
| Crise (§28) | Mission *CRISE : la Ligne 1 est à l'arrêt* (chronomètre de pertes) |
| Data dirty (§29) | Missions *GMAO* et *Weibull* ; bruit des estimations β/η lié à la qualité des données |
| Investissement (§30) | Mission *TCO compresseur* |
| REX (§31) | Écran *REX* : bibliothèque des défaillances, Pareto, récurrences, efficacité avant/après |
| Difficulté adaptative (§32) | `recommendMissions` / `adaptiveDifficulty` (erreurs mémorisées → missions ciblées, jeux de données plus sales) |
| Take over the factory (§34) | Épreuve *Master* : 12 mois simulés sur la cimenterie, verdict sur 10 critères |
| Règle pédagogique (§35) | `src/ui/Pedagogy.tsx` — composant `Decision` |

## 2. Architecture technique

- **Front-end** : React 19 + TypeScript strict, Vite. Aucune dépendance graphique : graphiques SVG maison (`src/ui/Charts.tsx`) interactifs (survol), thèmes clair/sombre.
- **Mobile-first** : navigation basse sur mobile, latérale au-delà de 900 px ; tableaux défilants.
- **Couches** :
  - `src/engine/` — domaine pur, sans React : statistiques, simulation, progression, effets, jeux de données. 100 % testable (Vitest).
  - `src/data/` — contenu : usines, événements, missions, mentors, projets, bibliothèque.
  - `src/store/` — état (reducer + contexte React) et **persistance abstraite** (`GameRepository`).
  - `src/missions/` — un composant par scénario, tous construits sur `Decision`.
  - `src/screens/` — écrans du jeu.
- **Déterminisme** : générateur `Rng` (mulberry32) à graine ; chaque mois est simulé avec `hash(graine | mois | site)` → rejouable et testable.
- **Sauvegarde** : automatique (`localStorage`), export/import JSON versionné.
- **Build autonome** : `npm run build:single` produit un seul fichier HTML jouable hors ligne.

### Points d'extension prévus

| Besoin futur | Point d'entrée |
|---|---|
| Base de données / API | implémenter `GameRepository` (`src/store/persistence.ts`) ; schéma relationnel : `docs/schema.sql` |
| Import Excel / GMAO réelle | le Labo Weibull accepte déjà un collage de colonnes (temps ; F/S) ; un connecteur produirait des `LifeObs[]` ou des `FailureEvent[]` |
| IoT / capteurs | remplacer le tirage de détection PDM dans `simulateMonth` par un flux de mesures (même interface `ModePolicy`) |
| IA (mentors conversationnels, correction des raisonnements) | le carnet de raisonnement (`player.reasoningLog`) est déjà collecté à chaque erreur |
| Power BI | exporter `plant.kpis` et `plant.events` (JSON plat, une ligne par mois / par événement) |
| Nouveaux sites internationaux | ajouter un `PlantDef` dans `src/data/plants.ts` (région, coûts, causes latentes) |

## 3. Structure de la base de données

Le prototype persiste un document `GameState` (JSON, `src/engine/types.ts`). Sa projection relationnelle pour un backend multi-joueurs est donnée dans `docs/schema.sql` :

```
players ──< mission_results ──< step_results
   │  └──< skills, errors, badges, certifications, reasoning_log
   └──< plant_states ──< mode_states (politique + âge)
             ├──< monthly_kpis
             ├──< failure_events   (base REX)
             ├──< stock_levels / spare_policies / purchase_orders
             └──< journal_entries
référentiel : plants ──< lines, equipment ──< failure_modes, spare_parts, latent_defects
```

## 4. Moteur de simulation

Pas de temps : **1 mois** (720 h calendaires). Pour chaque mode de défaillance de chaque équipement :

1. **Loi de vie effective** : Weibull(β, η·Π facteurs des causes latentes non résolues). Les causes latentes (lubrification, désalignement, entartrage, mauvaise référence de garniture) expliquent les pannes répétitives ; seules les missions/projets les éliminent.
2. **Tirage conditionnel** : durée résiduelle `η·[(a/η)^β − ln U]^(1/β) − a` à partir de l'âge `a` du mode.
3. **Politique** :
   - *RTF* : on subit la panne.
   - *PM* : remplacement à âge T si la capacité le permet (conformité préventive) et si la pièce est en stock ; 4 % de défaillances induites (16 % si β < 1).
   - *CBM* : P(détection) = `1 − (1 − e)^(PF/I)` si I ≤ P-F, `e·PF/I` sinon ; e = 0,85 × conformité.
   - *PDM* : inspection quasi continue, efficacité = 0,97 × (0,55 + 0,45 × qualité données) ; nécessite la plateforme (projet).
4. **Conséquences** : arrêt = MTTR × (facteur backlog, compétences) + attente pièce (délai express × exposition 50 %) ; perte = arrêt × perte horaire × (0,15 si redondé) ; coût = MO (×1,4 en urgence) + pièce × (1 + dommages secondaires) + surcoût express.
5. **Magasin** : consommation, réapprovisionnement min/max avec délais (× facteurs d'événements), coût de possession, stock dormant.
6. **Charge & backlog** : capacité = techniciens × heures × moral ; 72 % absorbés par les demandes courantes ; le planifié non réalisé part en backlog.
7. **KPI** (16) et dynamique humaine : confiance Direction, sécurité, moral, dégradation naturelle de la qualité des données.
8. **Événement sous pression** (probabilité 50 %) bloquant jusqu'à décision.

Calibrage (tests `tests/simulation.test.ts`) : situation héritée ≈ 75-85 % de disponibilité, pertes > 600 M FCFA/mois ; une stratégie fiabiliste complète dépasse 95 % et divise les pertes par plus de 2.

## 5. Système XP / niveaux

- XP de mission = XP de base × score/100 ; rejouer ne rapporte que l'amélioration (+10 %).
- Score d'une décision = 100 − 25 × (tentatives − 1) − 8 × indices (min 15).
- Compétences (16, 0-100) : moyenne mobile vers la performance observée, **plafonnée par le tier de la mission** (une mission de base ne fait pas un expert).
- **Promotions** : XP **et** certification pratique **et/ou** Industrial Impact Score mesuré dans l'usine (niveaux 3, 6, 7, 9).
- **Certifications** : Bronze → Master ; chacune exige des missions réussies (≥ 65-75) et, à partir de Platinum, des résultats d'usine (disponibilité, maturité, budget) ; Master = réussite du *Take over*.
- **Reliability Score** (0-1000) : compétences techniques pondérées. **Industrial Impact Score** (0-100) : progrès mesurés (3 derniers mois vs 3 premiers) sur disponibilité, pertes, coûts, stock, données, pannes répétitives, causes éliminées.

## 6. Modèle des équipements

`EquipmentDef` : tag, type, ligne, criticité A/B/C, perte horaire (FCFA), redondance, heures de marche/mois, âge, constructeur, modes. Brasserie de Douala : 16 équipements, 29 modes (soutireuse, laveuse, convoyeurs, pasteurisateur, sertisseuse, palettiseur, pompe P-101, agitateur, compresseur NH3, chaudière, compresseur d'air, groupe électrogène, TGBT, STEP). Cimenterie : 8 équipements (concasseur, bande, broyeurs, four, ventilateur, ensacheuse, compresseur).

## 7. Modèle des pannes

`FailureModeDef` : mécanisme, β, η, intervalle P-F et techniques de détection (vibration, thermographie, huile, ultrasons, courant, process, visuel), MTTR, heures-homme, pièce, dommages secondaires, drapeaux HSE et *caché*. Chaque défaillance produit un `FailureEvent` (base REX) avec cause codée… ou non, selon la qualité des données.

## 8. Modèle économique

- Perte de marge par heure d'arrêt (Ligne 1 : 5,2 M FCFA/h) ; arrêts planifiés à 10-30 % de la perte (fenêtres de production).
- Coût maintenance = masse salariale + heures sup × 1,5 + pièces + surcoûts express + surveillance en ligne + frais fixes (20 % du budget) + projets.
- Stock : taux de possession 25 %/an ; décisions de pièces d'assurance par comparaison risque annuel / coût de possession.
- Outils : remplacement à âge optimal, LCC/TCO actualisé, espérance de perte en crise, ROI/temps de retour.

## 9. Système de missions

`MissionMeta` (`src/data/missions.ts`) : module, tier, niveau requis, XP, compétences, étiquettes d'erreurs, **briefing** (contexte, données, contraintes, objectifs, pression), **débat des mentors**, effet sur l'usine. Chaque mission enchaîne des `Decision` :

> soumission → si erreur : **conséquence** → **question** → **raisonnement écrit obligatoire** → **indices progressifs** → **méthode** (2e erreur) → **bonne pratique** (3e) → **refaire la décision**.

## 10. Tableau de bord

Cockpit : 16 KPI avec variation et tendance, disponibilité (cible 92 %), coût vs budget, pertes, TRS décomposé, climat (confiance, sécurité, moral, données), alertes méthodes (après analyse Weibull), promotion, missions recommandées, journal. Rapport imprimable (PDF navigateur).

## 11. Scénarios jouables du prototype

| # | Scénario | Ce qu'il entraîne |
|---|---|---|
| 11 | Premier jour : la GMAO ment | 18 OT à auditer (8 défauts), MTBF/MTTR réels, communication |
| — | MTBF, MTTR, disponibilité | MTTR vs MDT, disponibilité opérationnelle, KPI non isolés |
| 12 | Laboratoire Weibull P-101 | jeu de données généré (doublons, censures, jours calendaires, autre pompe), papier de Weibull, β/η, R(t), MTTF, stratégie |
| 13 | AMDEC pasteurisateur | structure F/DF/mode/cause/effet, cotations challengées, gravité > RPN, actions |
| 14 | RCM P-101 | 7 questions, défaillance cachée (FFI), refus du plan OEM, gamme exécutable avec seuils ISO |
| 15 | RCA convoyeur | preuves sous budget, 5 Pourquoi sans fausse cause racine, Ishikawa, vérification d'efficacité |
| 16 | Magasin : 50 M à libérer ? | doublons/obsolètes, pièce d'assurance chiffrée, point de commande, stock vs P-F |
| 17 | CRISE Ligne 1 | espérance de perte, filtre HSE, actions de sortie de crise, message au DG, issue aléatoire |
| + | P-F, Comité 35 M, Architecture, TCO, Take over | voir `src/data/missions.ts` |
