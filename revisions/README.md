# Pilotage des révisions annuelles

Application web de **planification, préparation, exécution, suivi et analyse des révisions annuelles** des lignes de production.
Ce n'est pas un calendrier : c'est un centre de pilotage qui relie

**Planification → Gammes PDR → Achats → Transit → Réception → Techniciens → Travaux → Redémarrage → Stabilisation → REX**

et répond, pour chaque révision, aux 10 questions du critère de réussite (où en est-on, délais, PDR à risque, où sont les PDR, travaux en retard, chemin critique, techniciens, redémarrage tenable, risques, qui doit agir).

## Lancer

```bash
cd revisions
npm install
npm run dev            # http://localhost:5173
npm run build:single   # dist-single/index.html : un seul fichier, utilisable hors ligne
```

Un jeu de démonstration réaliste (usine d'Abidjan, 5 lignes, 7 révisions) est chargé au premier lancement ; ses dates sont **relatives au jour courant**, les scénarios restent donc toujours « vivants ». Le sélecteur « Connecté » en haut à droite simule l'authentification : chaque rôle ne voit et ne modifie que son domaine. La date de pilotage peut être simulée dans *Administration › Paramètres*.

| Révision | Scénario |
|---|---|
| REV-2025-L03 | Terminée, REX validé — ses leçons sont reprises dans la préparation de REV-2026-L03 |
| REV-2026-L01 | Terminée — REX à finaliser, un prestataire à évaluer |
| REV-2026-L02 | **En cours** — moules ART-458 (SOU-004) encore en mer, ETA décalée deux fois, T03 bloquée sur le chemin critique, fin +10 j, escalade Direction |
| REV-2026-L03 | PDR en transit — reportée une fois, technicien prévu avant les PDR (🔴), non-conformité en expertise, PDR bloquée au port |
| REV-2027-L04 | Approvisionnement — commande critique jamais passée après sa date limite, actions J-7 mois en retard |
| REV-2027-UT1 / L01 | Planifiées |

## Mise en route : saisie par les administrateurs

Par défaut, l'application est en mode **« Administrateurs seuls »** : seuls les comptes au profil *Administrateur* saisissent ; tous les autres profils sont en **lecture seule** (badge « 👁 Lecture seule »). L'administrateur gère lui-même :

- les **utilisateurs** (création, profil, périmètre site/atelier/ligne, mot de passe, désactivation ; le dernier administrateur ne peut pas être retiré) ;
- les **profils** : matrice « qui peut modifier quoi », préparée pour le passage ultérieur en mode **« Saisie par profil »** ;
- le **référentiel** (formulaire ou import Excel Site / Atelier / Ligne / Machine / Sous-ensemble / Organe), les gammes, les révisions et tout le suivi.

Le menu **Mise en route** déroule les étapes avec leur avancement : sécuriser l'accès admin → base vide → référentiel → utilisateurs → gammes → révisions → besoins PDR → techniciens / travaux → sauvegarde. Les lecteurs reçoivent les données à jour par l'export JSON de l'administrateur (« Charger les données à jour »).

> Les mots de passe sont un contrôle d'accès **local** (empreinte SHA-256 dans le navigateur) : ils empêchent une saisie par erreur, pas une personne techniquement déterminée. Une vraie authentification viendra avec le serveur.

## Modules

Accueil (Critique → Action → Risque, prochaines révisions, PDR critiques, transit, travaux, redémarrages, KPI) · Mes notifications · Risques & matrice de responsabilité · KPI · Planification annuelle · **Gantt intelligent** · Arborescence Site › Atelier › Ligne › Machine › Sous-ensemble › Organe › PDR · Gammes versionnées · Import Excel · Achats · Transit · Réception · Techniciens (+ évaluation) · Travaux (chemin critique) · Redémarrage & stabilisation · REX · Historique / audit · Administration.

## Règles métier implémentées

- **Prévu ≠ réel** : date initiale, date prévue actuelle et dates réelles coexistent ; un report ajoute une version (ancienne date, nouvelle date, motif, auteur, date) et ne supprime rien. Nombre de reports, dérive et décalage cumulé calculés.
- **Gantt** : prévu initial (hachuré) → prévu actuel → réel + prévision, fenêtre de préparation J-7 mois, travaux avec chemin critique, PDR critiques (◆ vert/orange/rouge), techniciens, redémarrage prévisionnel ; zoom année → jour ; filtres site, atelier, ligne, machine, statut, criticité, responsable.
- **J-7 mois** : 9 actions générées automatiquement et affectées (un responsable chacune) ; taux de préparation pondéré (actions, avancement PDR pondéré par criticité, techniciens confirmés, planning).
- **Cycle PDR en 16 étapes** avec un responsable unique par étape bloquante (BMC → Achats → Transit → Magasin ; non-conformité → Maintenance pour l'expertise, Achats pour la nouvelle commande). Date de disponibilité estimée (date promise, ETA, délais types maritime / aérien / local) comparée à la date requise.
- **Technicien avant PDR** : « 🔴 RISQUE — Le technicien est prévu avant la disponibilité des PDR », contrôlé en direct à la saisie.
- **Chemin critique (CPM)** sur deux réseaux : référence et prévisionnel (réel figé, reste à faire poussé à aujourd'hui, tâches attendant une PDR décalées à sa disponibilité).
- **Workflow global** (Planifiée → … → REX) : chaque transition a un responsable unique, des conditions d'entrée/sortie contrôlées, une notification et une escalade ; dérogation BMC tracée.
- **Notifications** au format QUOI / OÙ / POURQUOI / QUI / POUR QUAND / IMPACT / QUE FAIRE ; niveaux 🔵 🟡 🟠 🔴 ; escalade N1 responsable → N2 BMC → N3 Direction (uniquement au seuil critique de la matrice).
- **Import Excel** (.xlsx / CSV) : colonnes tolérantes, formats, doublons, références inconnues, lignes/machines inconnues, champs obligatoires, aperçu, rapport d'anomalies, comparaison avec la version active, **nouvelle version** (jamais d'écrasement), synchronisation des besoins (PDR retirées marquées « hors gamme », jamais supprimées), historique des imports.
- **REX** créé automatiquement à la clôture (constats chiffrés par domaine + leçons proposées), réutilisé dans la préparation suivante.
- **Audit** : chaque modification est journalisée (qui, quand, quoi, avant/après).
- **Permissions** : rôle × périmètre site / atelier / ligne ; BMC transverse ; la Direction ne reçoit que les escalades.

## Architecture

Voir [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

```
src/domain   moteur métier pur (planning, PDR, CPM, risques, workflow, notifications, KPI, REX, import)  ← testé
src/data     jeu de démonstration
src/store    état unique + audit + persistance abstraite (Repository : localStorage aujourd'hui, API demain)
src/ui       composants partagés (badges, PDR, workflow, reports)
src/pages    modules ; src/pages/revision = onglets de la fiche révision
```

## Qualité

```bash
npm run typecheck
npm test                                   # moteur métier (vitest)
npm run build && npm run test:e2e          # parcours navigateur (Playwright)
```
