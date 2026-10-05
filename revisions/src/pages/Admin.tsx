import { useState } from 'react';
import { DOMAINES, editeurs, empreinte, modeSaisie, type Domaine } from '../domain/permissions';
import { appliquerReferentiel, COLONNES_REFERENTIEL, type BilanReferentiel } from '../domain/importReferentiel';
import { creerBaseVide } from '../data/seed';
import { lireFichier } from './Import';
import { ORDRE_ROLES, ROLES } from '../domain/referentiel';
import type { Parametres, Role, Utilisateur } from '../domain/types';
import { exporterJson, importerJson } from '../store/repository';
import { nouvelId, useStore } from '../store/store';
import { Card, Champ, Modal, Tabs, telecharger } from '../ui/kit';

export default function Admin() {
  const { d, user, today, modifier, remplacer, reinitialiser, toast } = useStore();
  const [vide, setVide] = useState(false);
  const [bilan, setBilan] = useState<BilanReferentiel | null>(null);
  const mode = modeSaisie(d);
  const majDroits = (domaine: Domaine, role: Role) => {
    const actuels = editeurs(d, domaine);
    const nouveaux = actuels.includes(role) ? actuels.filter((r) => r !== role) : [...actuels, role];
    modifier({ entite: 'Profils', entiteId: domaine, action: 'DROITS', detail: `${DOMAINES[domaine].libelle} : ${nouveaux.map((r) => ROLES[r].court).join(', ') || 'administrateurs seuls'}`, avant: actuels.join(','), apres: nouveaux.join(',') }, (dr) => {
      dr.parametres.droits = { ...(dr.parametres.droits ?? {}), [domaine]: nouveaux };
    });
  };
  const changerMode = (m: 'ADMIN' | 'ROLES') => {
    modifier({ entite: 'Profils', entiteId: 'mode', action: 'MODE_SAISIE', detail: m === 'ADMIN' ? 'Saisie réservée aux administrateurs, autres profils en lecture' : 'Saisie par profil selon la matrice des droits', avant: mode, apres: m }, (dr) => {
      dr.parametres.modeSaisie = m;
    });
    toast(m === 'ADMIN' ? 'Mode « administrateurs seuls » activé' : 'Mode « saisie par profil » activé');
  };
  const importerReferentiel = async (f: File) => {
    try {
      const rows = await lireFichier(f);
      let b: BilanReferentiel | null = null;
      modifier({ entite: 'Référentiel', entiteId: f.name, action: 'IMPORT', detail: `Import du référentiel ${f.name}` }, (dr) => {
        b = appliquerReferentiel(rows, dr, (x) => nouvelId(x));
      });
      setTimeout(() => setBilan(b), 0);
    } catch (e) {
      toast(`Lecture impossible : ${(e as Error).message}`, 'erreur');
    }
  };
  const modeleReferentiel = async () => {
    const writeXlsxFile = (await import('write-excel-file/browser')).default;
    const ex = [
      ['Usine Abidjan', 'Conditionnement', 'L01', 'Ligne PET 1', 'SOU-001', 'Souffleuse', 'Roue de soufflage', 'Moules'],
      ['Usine Abidjan', 'Conditionnement', 'L01', 'Ligne PET 1', 'SOU-001', 'Souffleuse', 'Four de chauffe', 'Lampes IR'],
      ['Usine Abidjan', 'Conditionnement', 'L01', 'Ligne PET 1', 'REM-001', 'Remplisseuse', 'Carrousel', 'Vannes de remplissage'],
    ];
    const blob = await writeXlsxFile([COLONNES_REFERENTIEL.map((c) => ({ value: c, fontWeight: 'bold' as const })), ...ex.map((r) => r.map((v) => ({ value: v })))], { columns: COLONNES_REFERENTIEL.map(() => ({ width: 20 })) }).toBlob();
    telecharger('modele_referentiel.xlsx', blob);
  };
  const [vue, setVue] = useState<'utilisateurs' | 'permissions' | 'parametres' | 'referentiel' | 'donnees'>('utilisateurs');
  const admin = user.role === 'ADMIN';
  const [edit, setEdit] = useState<Utilisateur | null>(null);
  const [p, setP] = useState<Parametres>(d.parametres);
  const [conf, setConf] = useState(false);
  const [nouv, setNouv] = useState({ type: 'machine', parent: d.lignes[0]?.id ?? '', code: '', nom: '' });

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Administration</h1>
          <div className="sub">Utilisateurs, rôles et périmètres, paramètres de calcul, référentiel, sauvegardes.</div>
        </div>
      </div>
      {!admin && <div className="alert VIGILANCE small">Lecture seule : les modifications sont réservées à l'Administrateur Système (connectez-vous en « Administrateur » pour la démonstration).</div>}
      <Tabs
        value={vue}
        onChange={setVue}
        items={[
          { id: 'utilisateurs', label: 'Utilisateurs' },
          { id: 'permissions', label: 'Profils & droits' },
          { id: 'parametres', label: 'Paramètres' },
          { id: 'referentiel', label: 'Référentiel' },
          { id: 'donnees', label: 'Données & intégrations' },
        ]}
      />
      {vue === 'utilisateurs' && (
        <Card
          tight
          actions={
            admin ? (
              <button className="btn primary sm" onClick={() => setEdit({ id: '', nom: '', role: 'TECHNICIEN', perimetre: { siteIds: [], atelierIds: [], ligneIds: [] }, actif: true })}>
                + Utilisateur
              </button>
            ) : null
          }
          titre="Utilisateurs"
        >
          <table className="tbl">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Rôle</th>
                <th>Mission</th>
                <th>Périmètre</th>
                <th>Mot de passe</th>
                <th>Actif</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {d.utilisateurs.map((u) => (
                <tr key={u.id}>
                  <td className="b">{u.nom}</td>
                  <td>
                    <span className="badge role">{ROLES[u.role].libelle}</span>
                  </td>
                  <td className="small">{ROLES[u.role].mission}</td>
                  <td className="small">
                    {[...u.perimetre.siteIds.map((x) => d.sites.find((s) => s.id === x)?.nom), ...u.perimetre.atelierIds.map((x) => d.ateliers.find((s) => s.id === x)?.nom), ...u.perimetre.ligneIds.map((x) => d.lignes.find((s) => s.id === x)?.code)].filter(Boolean).join(', ') || 'Transverse'}
                  </td>
                  <td>{u.motDePasseHash ? '🔒' : <span className={u.role === 'ADMIN' ? 'act-txt small' : 'muted'}>{u.role === 'ADMIN' ? 'à définir' : '—'}</span>}</td>
                  <td>{u.actif ? '✓' : '—'}</td>
                  <td>
                    {admin && (
                      <button className="btn sm ghost" onClick={() => setEdit(structuredClone(u))}>
                        ✎
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      {vue === 'permissions' && (
        <div className="stack">
          <Card titre="Mode de saisie">
            <div className="col">
              <label className="row" style={{ alignItems: 'flex-start', cursor: admin ? 'pointer' : 'default' }}>
                <input type="radio" name="mode" checked={mode === 'ADMIN'} disabled={!admin} onChange={() => changerMode('ADMIN')} />
                <span>
                  <b>Administrateurs seuls (mise en route)</b>
                  <div className="small muted">Seuls les utilisateurs au profil Administrateur saisissent et modifient les données. Tous les autres profils consultent en lecture seule.</div>
                </span>
              </label>
              <label className="row" style={{ alignItems: 'flex-start', cursor: admin ? 'pointer' : 'default' }}>
                <input type="radio" name="mode" checked={mode === 'ROLES'} disabled={!admin} onChange={() => changerMode('ROLES')} />
                <span>
                  <b>Saisie par profil</b>
                  <div className="small muted">Chaque profil modifie les domaines cochés ci-dessous, dans son périmètre (site / atelier / ligne). À activer quand les équipes sont formées.</div>
                </span>
              </label>
            </div>
          </Card>
          <Card
            titre="Profils : qui peut modifier quoi"
            sub={mode === 'ADMIN' ? 'Matrice préparée pour plus tard : elle ne s\'applique qu\'en mode « Saisie par profil ». Aujourd\'hui, tout le monde est en lecture sauf les administrateurs.' : 'Cochez les profils autorisés à modifier chaque domaine. Les administrateurs ont toujours tous les droits ; tous les profils ont la lecture.'}
            actions={
              admin && d.parametres.droits ? (
                <button
                  className="btn sm"
                  onClick={() =>
                    modifier({ entite: 'Profils', entiteId: 'droits', action: 'DROITS_DEFAUT', detail: 'Retour à la matrice par défaut' }, (dr) => {
                      dr.parametres.droits = undefined;
                    })
                  }
                >
                  Matrice par défaut
                </button>
              ) : null
            }
            tight
          >
            <div className="tbl-wrap">
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Domaine</th>
                    {ORDRE_ROLES.filter((r) => r !== 'ADMIN').map((r) => (
                      <th key={r} className="num">
                        {ROLES[r].court}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(Object.keys(DOMAINES) as Domaine[])
                    .filter((k) => k !== 'ADMIN')
                    .map((k) => (
                      <tr key={k}>
                        <td>{DOMAINES[k].libelle}</td>
                        {ORDRE_ROLES.filter((r) => r !== 'ADMIN').map((r) => (
                          <td key={r} className="num">
                            <input type="checkbox" checked={editeurs(d, k).includes(r)} disabled={!admin} onChange={() => majDroits(k, r)} aria-label={`${DOMAINES[k].libelle} — ${ROLES[r].court}`} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  <tr>
                    <td>{DOMAINES.ADMIN.libelle}</td>
                    <td colSpan={ORDRE_ROLES.length - 1} className="small muted">
                      Réservé aux administrateurs
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}
      {vue === 'parametres' && (
        <Card titre="Paramètres de calcul">
          <div className="form">
            <Champ label="Date de pilotage simulée (vide = aujourd'hui)">
              <input type="date" value={p.dateReference ?? ''} onChange={(e) => setP({ ...p, dateReference: e.target.value || undefined })} disabled={!admin} />
            </Champ>
            <Champ label="Préparation : mois avant révision">
              <input type="number" value={p.moisPreparation} onChange={(e) => setP({ ...p, moisPreparation: Number(e.target.value) })} disabled={!admin} />
            </Champ>
            <Champ label="Marge PDR avant révision (j)">
              <input type="number" value={p.margePdrJours} onChange={(e) => setP({ ...p, margePdrJours: Number(e.target.value) })} disabled={!admin} />
            </Champ>
            <Champ label="Fret maritime fournisseur → Abidjan (j)">
              <input type="number" value={p.delaiFretJours} onChange={(e) => setP({ ...p, delaiFretJours: Number(e.target.value) })} disabled={!admin} />
            </Champ>
            <Champ label="Fret aérien (j)">
              <input type="number" value={p.delaiFretAerienJours} onChange={(e) => setP({ ...p, delaiFretAerienJours: Number(e.target.value) })} disabled={!admin} />
            </Champ>
            <Champ label="Abidjan → usine (j)">
              <input type="number" value={p.delaiAbidjanUsineJours} onChange={(e) => setP({ ...p, delaiAbidjanUsineJours: Number(e.target.value) })} disabled={!admin} />
            </Champ>
            <Champ label="Réception (j)">
              <input type="number" value={p.delaiReceptionJours} onChange={(e) => setP({ ...p, delaiReceptionJours: Number(e.target.value) })} disabled={!admin} />
            </Champ>
            <Champ label="Seuil de relance confirmation (j)">
              <input type="number" value={p.delaiConfirmationJours} onChange={(e) => setP({ ...p, delaiConfirmationJours: Number(e.target.value) })} disabled={!admin} />
            </Champ>
            <Champ label="Devise">
              <input type="text" value={p.devise} onChange={(e) => setP({ ...p, devise: e.target.value })} disabled={!admin} />
            </Champ>
          </div>
          {admin && (
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
              <button
                className="btn primary"
                onClick={() => {
                  modifier({ entite: 'Paramètres', entiteId: '-', action: 'MODIFICATION', detail: 'Paramètres de calcul', avant: JSON.stringify(d.parametres), apres: JSON.stringify(p) }, (dr) => {
                    dr.parametres = p;
                  });
                  toast('Paramètres enregistrés — analyses recalculées');
                }}
              >
                Enregistrer
              </button>
            </div>
          )}
        </Card>
      )}
      {vue === 'referentiel' && admin && (
        <Card titre="Importer le référentiel (Excel)" sub="Colonnes : Site, Atelier, Ligne*, Nom ligne, Machine, Nom machine, Sous-ensemble, Organe. Les éléments manquants sont créés, rien n'est modifié ni supprimé.">
          <div className="row">
            <button className="btn" onClick={modeleReferentiel}>
              Télécharger le modèle
            </button>
            <label className="btn primary" style={{ cursor: 'pointer' }}>
              Importer un fichier (.xlsx / .csv)…
              <input type="file" accept=".xlsx,.csv,.txt" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && importerReferentiel(e.target.files[0])} />
            </label>
          </div>
          {bilan && (
            <div className={`alert ${bilan.colonnesManquantes.length ? 'CRITIQUE' : 'OK'} small`} style={{ marginTop: 10 }}>
              {bilan.colonnesManquantes.length ? (
                <span>Colonnes obligatoires absentes : {bilan.colonnesManquantes.join(', ')}. Rien n'a été importé.</span>
              ) : (
                <div>
                  Créés : {bilan.sites} site(s), {bilan.ateliers} atelier(s), {bilan.lignes} ligne(s), {bilan.machines} machine(s), {bilan.sousEnsembles} sous-ensemble(s), {bilan.organes} organe(s).
                  {bilan.anomalies.map((x, k) => (
                    <div key={k} className="act-txt">
                      Ligne {x.ligne} : {x.message}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </Card>
      )}
      {vue === 'referentiel' && (
        <Card titre="Ajouter un élément au référentiel" sub="Les éléments existants ne sont jamais supprimés (historique et révisions passées).">
          <div className="form">
            <Champ label="Type">
              <select value={nouv.type} onChange={(e) => setNouv({ ...nouv, type: e.target.value, parent: e.target.value === 'atelier' ? d.sites[0]?.id : e.target.value === 'ligne' ? d.ateliers[0]?.id : e.target.value === 'site' ? '' : d.lignes[0]?.id })} disabled={!admin}>
                <option value="site">Site</option>
                <option value="atelier">Atelier</option>
                <option value="ligne">Ligne</option>
                <option value="machine">Machine</option>
              </select>
            </Champ>
            {nouv.type !== 'site' && (
              <Champ label="Parent">
                <select value={nouv.parent} onChange={(e) => setNouv({ ...nouv, parent: e.target.value })} disabled={!admin}>
                  {(nouv.type === 'atelier' ? d.sites : nouv.type === 'ligne' ? d.ateliers : d.lignes).map((x) => (
                    <option key={x.id} value={x.id}>
                      {'code' in x ? `${x.code} — ` : ''}
                      {x.nom}
                    </option>
                  ))}
                </select>
              </Champ>
            )}
            <Champ label="Code" req>
              <input type="text" value={nouv.code} onChange={(e) => setNouv({ ...nouv, code: e.target.value })} disabled={!admin} />
            </Champ>
            <Champ label="Nom" req>
              <input type="text" value={nouv.nom} onChange={(e) => setNouv({ ...nouv, nom: e.target.value })} disabled={!admin} />
            </Champ>
          </div>
          {admin && (
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 12 }}>
              <button
                className="btn primary"
                disabled={!nouv.code.trim() || !nouv.nom.trim()}
                onClick={() => {
                  const id = nouvelId(nouv.type.slice(0, 1).toUpperCase());
                  modifier({ entite: 'Référentiel', entiteId: id, action: 'CREATION', detail: `${nouv.type} ${nouv.code} — ${nouv.nom}` }, (dr) => {
                    if (nouv.type === 'site') dr.sites.push({ id, code: nouv.code, nom: nouv.nom });
                    if (nouv.type === 'atelier') dr.ateliers.push({ id, siteId: nouv.parent, code: nouv.code, nom: nouv.nom });
                    if (nouv.type === 'ligne') dr.lignes.push({ id, atelierId: nouv.parent, code: nouv.code, nom: nouv.nom });
                    if (nouv.type === 'machine') dr.machines.push({ id, ligneId: nouv.parent, code: nouv.code, nom: nouv.nom });
                  });
                  toast(`${nouv.code} ajouté`);
                  setNouv({ ...nouv, code: '', nom: '' });
                }}
              >
                Ajouter
              </button>
            </div>
          )}
          <p className="small muted" style={{ marginTop: 10 }}>
            Sous-ensembles, organes et PDR sont alimentés par l'import des gammes. Référentiel actuel : {d.sites.length} site(s), {d.ateliers.length} ateliers, {d.lignes.length} lignes, {d.machines.length} machines, {d.sousEnsembles.length} sous-ensembles, {d.organes.length} organes, {d.catalogue.length} articles PDR.
          </p>
        </Card>
      )}
      {vue === 'donnees' && (
        <div className="grid g2">
          <Card titre="Sauvegarde">
            <div className="col">
              <button className="btn" onClick={() => telecharger(`pilotage-revisions-${today}.json`, exporterJson(d), 'application/json')}>
                Exporter toutes les données (JSON)
              </button>
              {(
                <label className="btn" style={{ cursor: 'pointer' }} title={admin ? '' : 'Charge dans ce navigateur les données transmises par l\'administrateur'}>
                  {admin ? 'Restaurer une sauvegarde…' : 'Charger les données à jour (JSON de l\'administrateur)…'}
                  <input
                    type="file"
                    accept=".json"
                    style={{ display: 'none' }}
                    onChange={async (e) => {
                      const f = e.target.files?.[0];
                      if (!f) return;
                      try {
                        remplacer(importerJson(await f.text()), `Restauration de ${f.name}`);
                        toast('Sauvegarde restaurée');
                      } catch (err) {
                        toast((err as Error).message, 'erreur');
                      }
                    }}
                  />
                </label>
              )}
              {admin && (
                <button className="btn primary" onClick={() => setVide(true)}>
                  Démarrer une base vide (données réelles)
                </button>
              )}
              {admin && (
                <button className="btn danger" onClick={() => setConf(true)}>
                  Recharger le jeu de démonstration
                </button>
              )}
            </div>
          </Card>
          <Card titre="Architecture & intégrations prévues">
            <ul className="small" style={{ margin: 0, paddingLeft: 18 }}>
              <li>Persistance abstraite (<code>Repository</code>) : navigateur aujourd'hui, API REST demain (multisite, authentification).</li>
              <li>Moteur métier pur (<code>src/domain</code>) : réutilisable côté serveur, testé.</li>
              <li>Connexion GMAO DIMOMAINT : catalogue PDR, stock, réceptions système, ordres de travail (correspondance par référence article).</li>
              <li>Import / export Excel (gammes, planning, PDR, KPI, audit).</li>
              <li>Notifications : messages déjà formatés (§27) prêts pour l'email et le mobile.</li>
              <li>Intégration documentaire : gammes, comptes rendus prestataires, REX.</li>
            </ul>
          </Card>
        </div>
      )}
      {edit && <ModalUtilisateur u={edit} onClose={() => setEdit(null)} />}
      {vide && (
        <Modal
          titre="Démarrer une base vide ?"
          onClose={() => setVide(false)}
          pied={
            <>
              <button className="btn" onClick={() => setVide(false)}>
                Annuler
              </button>
              <button
                className="btn primary"
                onClick={() => {
                  const admins = d.utilisateurs.filter((u) => u.role === 'ADMIN');
                  remplacer(creerBaseVide(today, admins, d.parametres), 'Démarrage d\'une base vide (administrateurs conservés)');
                  setVide(false);
                  toast('Base vide créée : commencez par le référentiel (étape 2 du guide)');
                }}
              >
                Créer la base vide
              </button>
            </>
          }
        >
          <p>Toutes les données de démonstration (sites, lignes, révisions, PDR, utilisateurs de démonstration…) seront supprimées de ce navigateur. Seuls les <b>administrateurs</b> ({d.utilisateurs.filter((u) => u.role === 'ADMIN').map((u) => u.nom).join(', ')}) et les paramètres de calcul sont conservés.</p>
          <p className="small muted" style={{ marginTop: 8 }}>Exportez une sauvegarde JSON avant si vous voulez garder la démonstration.</p>
        </Modal>
      )}
      {conf && (
        <Modal
          titre="Réinitialiser les données ?"
          onClose={() => setConf(false)}
          pied={
            <>
              <button className="btn" onClick={() => setConf(false)}>
                Annuler
              </button>
              <button
                className="btn danger"
                onClick={() => {
                  reinitialiser();
                  setConf(false);
                  toast('Jeu de démonstration rechargé');
                }}
              >
                Réinitialiser
              </button>
            </>
          }
        >
          <p>Toutes les données saisies dans ce navigateur seront remplacées par le jeu de démonstration. Exportez une sauvegarde avant si nécessaire.</p>
        </Modal>
      )}
    </div>
  );
}

function ModalUtilisateur({ u, onClose }: { u: Utilisateur; onClose: () => void }) {
  const { d, modifier, toast, user } = useStore();
  const [x, setX] = useState(u);
  const [mdp, setMdp] = useState('');
  const [mdp2, setMdp2] = useState('');
  const [retirerMdp, setRetirerMdp] = useState(false);
  const autresAdmins = d.utilisateurs.filter((y) => y.id !== u.id && y.role === 'ADMIN' && y.actif).length;
  const dernierAdmin = u.id !== '' && u.role === 'ADMIN' && autresAdmins === 0 && (x.role !== 'ADMIN' || !x.actif);
  const mdpInvalide = mdp !== mdp2 || (mdp.length > 0 && mdp.length < 6);
  const enregistrer = async () => {
    const id = x.id || nouvelId('u');
    const hash = retirerMdp ? undefined : mdp ? await empreinte(mdp) : x.motDePasseHash;
    const detailMdp = retirerMdp ? ' — mot de passe retiré' : mdp ? ' — mot de passe défini' : '';
    modifier({ entite: 'Utilisateur', entiteId: id, action: x.id ? 'MODIFICATION' : 'CREATION', detail: `${x.nom} — ${ROLES[x.role].libelle}${x.actif ? '' : ' (désactivé)'}${detailMdp}`, avant: u.id ? `${u.role}${u.actif ? '' : ' inactif'}` : undefined, apres: `${x.role}${x.actif ? '' : ' inactif'}` }, (dr) => {
      const i = dr.utilisateurs.findIndex((y) => y.id === id);
      const val = { ...x, id, motDePasseHash: hash };
      if (i >= 0) dr.utilisateurs[i] = val;
      else dr.utilisateurs.push(val);
    });
    toast(`Utilisateur ${x.nom} enregistré`);
    onClose();
  };
  const toggle = (k: keyof Utilisateur['perimetre'], id: string) => {
    const l = x.perimetre[k];
    setX({ ...x, perimetre: { ...x.perimetre, [k]: l.includes(id) ? l.filter((y) => y !== id) : [...l, id] } });
  };
  return (
    <Modal
      titre={u.id ? `Utilisateur — ${u.nom}` : 'Nouvel utilisateur'}
      onClose={onClose}
      pied={
        <>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn primary" disabled={!x.nom.trim() || dernierAdmin || mdpInvalide} onClick={enregistrer}>
            Enregistrer
          </button>
        </>
      }
    >
      <div className="form">
        <Champ label="Nom" req>
          <input type="text" value={x.nom} onChange={(e) => setX({ ...x, nom: e.target.value })} />
        </Champ>
        <Champ label="Rôle">
          <select value={x.role} onChange={(e) => setX({ ...x, role: e.target.value as Role })}>
            {ORDRE_ROLES.map((r) => (
              <option key={r} value={r}>
                {ROLES[r].libelle}
              </option>
            ))}
          </select>
        </Champ>
        <Champ label="Actif">
          <select value={x.actif ? 'o' : 'n'} onChange={(e) => setX({ ...x, actif: e.target.value === 'o' })}>
            <option value="o">Oui</option>
            <option value="n">Non</option>
          </select>
        </Champ>
      </div>
      <h3 style={{ margin: '12px 0 6px' }}>Mot de passe {x.motDePasseHash && !retirerMdp ? <span className="badge ok">défini 🔒</span> : <span className="badge">aucun</span>}</h3>
      <div className="form">
        <Champ label={x.motDePasseHash ? 'Nouveau mot de passe' : 'Mot de passe (6 caractères min.)'}>
          <input type="password" value={mdp} onChange={(e) => (setMdp(e.target.value), setRetirerMdp(false))} autoComplete="new-password" />
        </Champ>
        <Champ label="Confirmation">
          <input type="password" value={mdp2} onChange={(e) => setMdp2(e.target.value)} autoComplete="new-password" />
        </Champ>
        {x.motDePasseHash && x.id !== user.id && (
          <label className="row small" style={{ alignSelf: 'end' }}>
            <input type="checkbox" checked={retirerMdp} onChange={(e) => setRetirerMdp(e.target.checked)} /> Retirer le mot de passe
          </label>
        )}
      </div>
      {mdpInvalide && <p className="small crit-txt">{mdp !== mdp2 ? 'Les deux mots de passe diffèrent.' : '6 caractères minimum.'}</p>}
      {x.role === 'ADMIN' && !x.motDePasseHash && !mdp && <p className="small act-txt">Conseil : protégez chaque compte administrateur par un mot de passe, sinon n'importe qui peut le sélectionner.</p>}
      {dernierAdmin && <p className="small crit-txt">Impossible : c'est le dernier administrateur actif (il en faut toujours au moins un).</p>}
      <h3 style={{ margin: '12px 0 6px' }}>Périmètre (vide = transverse)</h3>
      <div className="grid g3 small">
        <div className="col">
          <b>Sites</b>
          {d.sites.map((s) => (
            <label key={s.id} className="row">
              <input type="checkbox" checked={x.perimetre.siteIds.includes(s.id)} onChange={() => toggle('siteIds', s.id)} /> {s.nom}
            </label>
          ))}
        </div>
        <div className="col">
          <b>Ateliers</b>
          {d.ateliers.map((s) => (
            <label key={s.id} className="row">
              <input type="checkbox" checked={x.perimetre.atelierIds.includes(s.id)} onChange={() => toggle('atelierIds', s.id)} /> {s.nom}
            </label>
          ))}
        </div>
        <div className="col">
          <b>Lignes</b>
          {d.lignes.map((s) => (
            <label key={s.id} className="row">
              <input type="checkbox" checked={x.perimetre.ligneIds.includes(s.id)} onChange={() => toggle('ligneIds', s.id)} /> {s.code} — {s.nom}
            </label>
          ))}
        </div>
      </div>
    </Modal>
  );
}
