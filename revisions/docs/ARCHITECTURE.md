# Architecture — Pilotage des révisions annuelles

## Principes

1. **Une révision = une source unique de vérité.** Toutes les données (PDR, techniciens, travaux, incidents, stabilisation, REX, audit) sont rattachées à `revisionId`. Les vues (risques, notifications, KPI, Gantt) sont **dérivées** et recalculées, jamais saisies.
2. **Une action = un responsable.** Chaque étape PDR, transition de workflow, action J-7, jalon de redémarrage et événement de la matrice porte un seul `Role` responsable ; pilote, informés et escalade sont des champs distincts.
3. **Prévu ≠ réel.** Les dates prévues ne sont jamais écrasées : un report ajoute une version, les dates réelles sont des champs séparés, l'historique des étapes PDR et des ETA est conservé.
4. **Moteur pur, interface fine.** `src/domain` ne dépend ni de React ni du navigateur : il peut tourner côté serveur.

## Couches

| Module | Contenu |
|---|---|
| `domain/types.ts` | Modèle de données (référentiel, révision, gamme versionnée, PDR, interventions, travaux, incidents, stabilisation, REX, notifications, audit, paramètres) |
| `domain/referentiel.ts` | Rôles, statuts, cycle PDR (16 étapes + responsable), matrice de responsabilité (§26), actions J-7, critères d'évaluation, jalons |
| `domain/planning.ts` | Reports, dérive, préparation J-7 mois |
| `domain/pdr.ts`, `actionsPdr.ts` | Responsable de l'étape bloquante, position, disponibilité estimée, actions par rôle |
| `domain/cpm.ts`, `travaux.ts` | Chemin critique (passes avant/arrière, marges, cycles), réseaux de référence et prévisionnel |
| `domain/techniciens.ts` | Règle technicien / PDR, note pondérée |
| `domain/redemarrage.ts` | Prévu / réel / dépassement, stabilisation (cibles, jours consécutifs) |
| `domain/analyse.ts` | Analyse complète d'une révision : PDR, techniciens, travaux, fin prévisionnelle, préparation, **risques** (5W + responsable + escalade), comparatif prévu/réel |
| `domain/workflow.ts` | Transitions du workflow global avec contrôles de sortie |
| `domain/notifications.ts` | Notifications dérivées des risques, « qui voit quoi », format de message |
| `domain/kpi.ts`, `rex.ts`, `importGamme.ts`, `permissions.ts` | KPI, REX automatique, import Excel versionné, permissions rôle × périmètre |
| `store/` | État React ; `modifier()` = copie + mutation + **entrée d'audit** ; `Repository` (localStorage) |

## Calculs clés

- **Disponibilité PDR estimée** : à partir de l'étape courante et de sa date réelle — date promise fournisseur, ETA, sinon délais types paramétrables (confirmation, embarquement, fret maritime/aérien/local, Abidjan → usine, réception).
- **Date requise** : début de révision − marge (14 j) en préparation ; début planifié du premier travail utilisant la PDR en exécution.
- **Fin prévisionnelle** : CPM prévisionnel (tâches terminées figées, en cours prolongées si dépassées, à faire ≥ aujourd'hui et ≥ disponibilité de leurs PDR) ; avant démarrage, repoussée si les PDR critiques arrivent après la date prévue.
- **Niveau de risque PDR** : écart > 0 → A critique / B action / C vigilance ; marge < 7 j → A action / autres vigilance ; combiné au retard de processus de l'étape (commande non confirmée, fournisseur en retard, ETA dépassée, PDR au port, réception en attente…).
- **Escalade** : N2 (BMC) si critique ou échéance dépassée ; N3 (Direction) seulement si la matrice prévoit une escalade et que le seuil est atteint.

## Évolutions prévues sans refonte

- Remplacer `LocalStorageRepository` par un repository HTTP (même interface) ; le moteur `domain` peut être exécuté côté serveur pour les notifications email / mobile (le message §27 est déjà produit par `formaterMessage`).
- DIMOMAINT : correspondance par référence article (`ArticlePDR.ref`) pour le catalogue, le stock (`Pdr.enStock`) et la réception système (étape `RECEPTION_SYSTEME`).
- Multisite : le périmètre utilisateur (site / atelier / ligne) filtre déjà toutes les vues.
