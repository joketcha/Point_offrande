import type { ReactNode } from 'react';
import { modeSaisie } from '../domain/permissions';
import { ROLES } from '../domain/referentiel';
import { useStore } from '../store/store';
import { Card, Lien } from '../ui/kit';

/** Mise en route : comment entrer les données, dans quel ordre, et où. */
export default function Guide() {
  const { d, user } = useStore();
  const admin = user.role === 'ADMIN';
  const admins = d.utilisateurs.filter((u) => u.role === 'ADMIN' && u.actif);
  const etapes: { titre: string; fait: boolean; etat: string; ou: ReactNode; contenu: ReactNode }[] = [
    {
      titre: 'Sécuriser l\'accès administrateur',
      fait: admins.length > 0 && admins.every((u) => u.motDePasseHash),
      etat: `${admins.filter((u) => u.motDePasseHash).length}/${admins.length} administrateur(s) protégé(s)`,
      ou: <Lien to="admin">Administration › Utilisateurs</Lien>,
      contenu: (
        <>
          Choisissez « Administrateur » dans le sélecteur <i>Connecté</i>, ouvrez sa fiche (✎) et définissez un <b>mot de passe</b>. Ensuite, le passage en administrateur le demandera. Vérifiez que le mode de saisie est <b>« Administrateurs seuls »</b> (<Lien to="admin">Profils & droits</Lien>) : tous les autres utilisateurs sont alors en lecture.
        </>
      ),
    },
    {
      titre: 'Partir d\'une base vide',
      fait: !d.revisions.some((r) => r.id === 'R26-L02'),
      etat: d.revisions.some((r) => r.id === 'R26-L02') ? 'Données de démonstration présentes' : 'Base réelle',
      ou: <Lien to="admin">Administration › Données & intégrations</Lien>,
      contenu: (
        <>
          Exportez si besoin la démonstration (JSON), puis cliquez <b>« Démarrer une base vide »</b>. Les administrateurs et les paramètres sont conservés, tout le reste est vidé.
        </>
      ),
    },
    {
      titre: 'Saisir le référentiel : Site › Atelier › Ligne › Machine',
      fait: d.lignes.length > 0 && d.machines.length > 0,
      etat: `${d.sites.length} site(s), ${d.ateliers.length} atelier(s), ${d.lignes.length} ligne(s), ${d.machines.length} machine(s)`,
      ou: <Lien to="admin">Administration › Référentiel</Lien>,
      contenu: (
        <>
          Le plus rapide : <b>télécharger le modèle Excel du référentiel</b>, le remplir (une ligne par organe, ou par machine) et l'importer. Les éléments manquants sont créés, rien n'est écrasé. Pour un ajout ponctuel, utilisez le formulaire « Ajouter un élément ». Résultat visible dans <Lien to="arborescence">Sites › Lignes › Machines</Lien>.
        </>
      ),
    },
    {
      titre: 'Créer les utilisateurs et leurs profils',
      fait: d.utilisateurs.some((u) => u.role !== 'ADMIN'),
      etat: `${d.utilisateurs.length} utilisateur(s)`,
      ou: <Lien to="admin">Administration › Utilisateurs</Lien>,
      contenu: (
        <>
          « + Utilisateur » : nom, <b>profil</b> ({['BMC', 'MAINTENANCE', 'PRODUCTION', 'ACHATS', 'TRANSIT', 'MAGASIN', 'DIRECTION'].map((r) => ROLES[r as keyof typeof ROLES].court).join(', ')}…), périmètre (site, atelier ou lignes visibles ; vide = toute l'usine), mot de passe facultatif. Les responsables de révision se choisissent parmi ces utilisateurs. En mode « Administrateurs seuls », ils consultent sans modifier.
        </>
      ),
    },
    {
      titre: 'Importer les gammes de révision (listes PDR)',
      fait: d.gammes.length > 0,
      etat: `${d.gammes.filter((g) => g.statut === 'ACTIVE').length} gamme(s) active(s)`,
      ou: <Lien to="import">Importer une gamme</Lien>,
      contenu: (
        <>
          <b>Télécharger le modèle Excel</b> de gamme : Ligne, Machine (codes identiques au référentiel), Sous-ensemble, Organe, Référence PDR, Désignation, Quantité, Criticité (A/B/C), Fournisseur, Délai d'approvisionnement (j). L'application contrôle le fichier et affiche les anomalies avant import ; chaque import crée une <b>nouvelle version</b>.
        </>
      ),
    },
    {
      titre: 'Créer les révisions de l\'année',
      fait: d.revisions.length > 0,
      etat: `${d.revisions.length} révision(s)`,
      ou: <Lien to="planning">Planification annuelle › + Nouvelle révision</Lien>,
      contenu: (
        <>
          Ligne, date de début prévue (elle devient la <b>date initiale</b>, jamais effacée), durée, responsable, durées de redémarrage et de stabilisation. Toute modification de date ultérieure passe par <b>« Décider un report »</b> (motif obligatoire).
        </>
      ),
    },
    {
      titre: 'Générer les besoins PDR et préparer',
      fait: d.pdrs.length > 0,
      etat: `${d.pdrs.length} PDR suivie(s)`,
      ou: <>Fiche révision › onglets <b>PDR</b> et <b>Préparation</b></>,
      contenu: (
        <>
          Onglet PDR : <b>« Générer depuis la gamme »</b>. Les actions J-7 mois sont créées automatiquement à la date de lancement (ou « Lancer la préparation maintenant »). Puis, au fil de l'eau, ouvrir chaque PDR pour enregistrer commande, confirmation, expédition, conteneur, navire, ETA, arrivées et réceptions.
        </>
      ),
    },
    {
      titre: 'Techniciens, travaux, redémarrage',
      fait: d.travaux.length > 0 || d.interventions.length > 0,
      etat: `${d.interventions.length} intervention(s), ${d.travaux.length} travail(aux)`,
      ou: <>Fiche révision › onglets <b>Techniciens</b>, <b>Travaux</b>, <b>Redémarrage</b>, <b>Stabilisation</b></>,
      contenu: (
        <>
          Planifier les prestataires (contrôle automatique « technicien avant PDR »), saisir les travaux avec durées et dépendances (le chemin critique se calcule seul), puis les jalons de redémarrage, les incidents et les relevés de stabilisation. Le REX se crée à la clôture.
        </>
      ),
    },
    {
      titre: 'Sauvegarder régulièrement',
      fait: false,
      etat: 'À faire chaque semaine',
      ou: <Lien to="admin">Administration › Données & intégrations</Lien>,
      contenu: (
        <>
          Les données sont enregistrées <b>dans ce navigateur, sur ce poste</b>. Faites un <b>export JSON</b> régulier : il sert de sauvegarde et permet de transmettre les données à jour aux lecteurs (chaque lecteur l'ouvre via « Charger les données à jour » dans Administration › Données &amp; intégrations, sur son poste).
        </>
      ),
    },
  ];
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Mise en route — comment entrer les données</h1>
          <div className="sub">
            Mode actuel : <b>{modeSaisie(d) === 'ADMIN' ? 'saisie par les administrateurs seuls, autres profils en lecture' : 'saisie par profil'}</b>. Vous êtes {admin ? 'administrateur : vous pouvez tout saisir.' : `${ROLES[user.role].libelle} : lecture seule.`}
          </div>
        </div>
      </div>
      {etapes.map((e, k) => (
        <Card
          key={e.titre}
          className={`lvl-${e.fait ? 'OK' : 'INFO'}`}
          titre={
            <span className="row">
              <span className={`badge ${e.fait ? 'ok' : 'info'}`}>{e.fait ? '✓' : k + 1}</span>
              <h2>{e.titre}</h2>
            </span>
          }
          actions={<span className="small muted">{e.etat}</span>}
        >
          <p>{e.contenu}</p>
          <p className="small" style={{ marginTop: 6 }}>
            ➜ {e.ou}
          </p>
        </Card>
      ))}
    </div>
  );
}
