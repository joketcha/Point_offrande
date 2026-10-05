import { useState } from 'react';
import { DOMAINES, type Domaine } from '../domain/permissions';
import { ORDRE_ROLES, ROLES } from '../domain/referentiel';
import type { Parametres, Role, Utilisateur } from '../domain/types';
import { exporterJson, importerJson } from '../store/repository';
import { nouvelId, useStore } from '../store/store';
import { Card, Champ, Modal, Tabs, telecharger } from '../ui/kit';

export default function Admin() {
  const { d, user, today, modifier, remplacer, reinitialiser, toast } = useStore();
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
          { id: 'utilisateurs', label: 'Utilisateurs & rôles' },
          { id: 'permissions', label: 'Permissions' },
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
        <Card titre="Qui modifie quoi" sub="Permissions = rôle × périmètre (site / atelier / ligne). Lecture transverse pour le BMC et la Direction ; l'Administrateur a tous les droits." tight>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Domaine</th>
                  {ORDRE_ROLES.map((r) => (
                    <th key={r} className="num">
                      {ROLES[r].court}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(Object.keys(DOMAINES) as Domaine[]).map((k) => (
                  <tr key={k}>
                    <td>{DOMAINES[k].libelle}</td>
                    {ORDRE_ROLES.map((r) => (
                      <td key={r} className="num">
                        {r === 'ADMIN' || DOMAINES[k].editeurs.includes(r) ? <span className="badge ok">✎</span> : <span className="muted">👁</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
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
              {admin && (
                <label className="btn" style={{ cursor: 'pointer' }}>
                  Restaurer une sauvegarde…
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
                <button className="btn danger" onClick={() => setConf(true)}>
                  Réinitialiser le jeu de démonstration
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
  const { d, modifier, toast } = useStore();
  const [x, setX] = useState(u);
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
          <button
            className="btn primary"
            disabled={!x.nom.trim()}
            onClick={() => {
              const id = x.id || nouvelId('u');
              modifier({ entite: 'Utilisateur', entiteId: id, action: x.id ? 'MODIFICATION' : 'CREATION', detail: `${x.nom} — ${ROLES[x.role].libelle}`, avant: u.id ? `${u.role}` : undefined, apres: x.role }, (dr) => {
                const i = dr.utilisateurs.findIndex((y) => y.id === id);
                if (i >= 0) dr.utilisateurs[i] = { ...x, id };
                else dr.utilisateurs.push({ ...x, id });
              });
              toast('Utilisateur enregistré');
              onClose();
            }}
          >
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
