import { useState } from 'react';
import type { AnalyseRevision } from '../../domain/analyse';
import { fmt } from '../../domain/dates';
import { ORDRE_ROLES, ROLES } from '../../domain/referentiel';
import { constatsAutomatiques, creerRex, DOMAINES_REX } from '../../domain/rex';
import type { DomaineRex, Rex, Role } from '../../domain/types';
import { nouvelId, useStore } from '../../store/store';
import { Card, Champ, RoleBadge, Vide } from '../../ui/kit';

export function OngletRex({ a }: { a: AnalyseRevision }) {
  const { d, peut, modifier, today, toast } = useStore();
  const r = a.revision;
  const rex = d.rex.find((x) => x.revisionId === r.id);
  const ed = peut('REX', r.ligneId) && rex?.statut !== 'VALIDE';
  const [lecon, setLecon] = useState({ domaine: 'PDR' as DomaineRex, lecon: '', action: '', responsable: 'BMC' as Role });
  const maj = (detail: string, fn: (x: Rex) => void) =>
    modifier({ entite: 'REX', entiteId: rex!.id, revisionId: r.id, action: 'MODIFICATION', detail }, (dr) => {
      fn(dr.rex.find((y) => y.id === rex!.id)!);
    });
  if (!rex) {
    return (
      <Card titre="REX">
        <Vide>
          Le REX est créé automatiquement à la clôture de la révision (passage à « Terminée »).
          {peut('REX', r.ligneId) && a.revision.dateReelleDebut && (
            <div style={{ marginTop: 10 }}>
              <button
                className="btn"
                onClick={() => {
                  modifier({ entite: 'REX', entiteId: `rex-${r.id}`, revisionId: r.id, action: 'CREATION', detail: 'REX créé par anticipation' }, (dr) => {
                    dr.rex.push(creerRex(a, today));
                  });
                  toast('REX créé');
                }}
              >
                Créer le REX maintenant
              </button>
            </div>
          )}
        </Vide>
      </Card>
    );
  }
  const constats = rex.constats.length ? rex.constats : constatsAutomatiques(a);
  return (
    <div className="stack">
      <div className="row">
        <span className={`badge ${rex.statut === 'VALIDE' ? 'ok' : 'act'}`}>{rex.statut === 'VALIDE' ? 'REX validé' : 'Brouillon'}</span>
        <span className="small muted">Créé le {fmt(rex.dateCreation)} · Responsable : Maintenance · Pilote : BMC · Informés : Production, Achats, Magasin, Transit</span>
        <span className="grow" />
        {ed && (
          <button
            className="btn sm"
            onClick={() => {
              maj('Actualisation des constats automatiques', (x) => {
                x.constats = constatsAutomatiques(a);
              });
              toast('Constats recalculés à partir des données');
            }}
          >
            Recalculer les constats
          </button>
        )}
        {ed && (
          <button
            className="btn primary sm"
            disabled={!rex.lecons.length}
            onClick={() => {
              maj('REX validé', (x) => {
                x.statut = 'VALIDE';
              });
              toast('REX validé : leçons disponibles pour la prochaine révision');
            }}
          >
            Valider le REX
          </button>
        )}
      </div>
      <Card titre="Constats par domaine (calculés depuis la révision)" tight>
        <table className="tbl">
          <tbody>
            {constats.map((c, k) => (
              <tr key={k}>
                <td className="b nowrap" style={{ width: 140 }}>
                  {DOMAINES_REX[c.domaine].libelle}
                </td>
                <td>{c.constat}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
      <div className="grid g2">
        <Card titre="Points positifs">
          {ed ? (
            <textarea defaultValue={rex.pointsPositifs} onBlur={(e) => e.target.value !== rex.pointsPositifs && maj('Points positifs', (x) => (x.pointsPositifs = e.target.value))} />
          ) : (
            <p>{rex.pointsPositifs || <span className="muted">—</span>}</p>
          )}
        </Card>
        <Card titre="Points négatifs">
          {ed ? (
            <textarea defaultValue={rex.pointsNegatifs} onBlur={(e) => e.target.value !== rex.pointsNegatifs && maj('Points négatifs', (x) => (x.pointsNegatifs = e.target.value))} />
          ) : (
            <p>{rex.pointsNegatifs || <span className="muted">—</span>}</p>
          )}
        </Card>
      </div>
      <Card titre="Leçons à intégrer à la prochaine révision" sub="Reprises automatiquement dans l'onglet Préparation de la révision suivante de la même ligne." tight>
        {rex.lecons.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Domaine</th>
                  <th>Leçon</th>
                  <th>Action pour la prochaine révision</th>
                  <th>Responsable</th>
                  <th>Intégrée</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {rex.lecons.map((l) => (
                  <tr key={l.id}>
                    <td className="nowrap">{DOMAINES_REX[l.domaine].libelle}</td>
                    <td>{l.lecon}</td>
                    <td className="b">{l.actionProchaineRevision}</td>
                    <td>
                      <RoleBadge r={l.responsable} />
                    </td>
                    <td>{l.integree ? <span className="badge ok">Oui</span> : <span className="badge">Non</span>}</td>
                    <td>
                      {ed && (
                        <button className="btn sm ghost" onClick={() => maj(`Suppression leçon : ${l.lecon}`, (x) => (x.lecons = x.lecons.filter((y) => y.id !== l.id)))} aria-label="Retirer">
                          ✕
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Vide>Aucune leçon.</Vide>
        )}
        {ed && (
          <div className="card-b" style={{ borderTop: '1px solid var(--border)' }}>
            <div className="form">
              <Champ label="Domaine">
                <select value={lecon.domaine} onChange={(e) => setLecon({ ...lecon, domaine: e.target.value as DomaineRex, responsable: DOMAINES_REX[e.target.value as DomaineRex].responsable })}>
                  {(Object.keys(DOMAINES_REX) as DomaineRex[]).map((k) => (
                    <option key={k} value={k}>
                      {DOMAINES_REX[k].libelle}
                    </option>
                  ))}
                </select>
              </Champ>
              <Champ label="Responsable de l'action">
                <select value={lecon.responsable} onChange={(e) => setLecon({ ...lecon, responsable: e.target.value as Role })}>
                  {ORDRE_ROLES.filter((x) => x !== 'ADMIN' && x !== 'PRESTATAIRE').map((x) => (
                    <option key={x} value={x}>
                      {ROLES[x].court}
                    </option>
                  ))}
                </select>
              </Champ>
              <Champ label="Leçon (constat)" req full>
                <input type="text" value={lecon.lecon} onChange={(e) => setLecon({ ...lecon, lecon: e.target.value })} />
              </Champ>
              <Champ label="Action pour la prochaine révision" req full>
                <input type="text" value={lecon.action} onChange={(e) => setLecon({ ...lecon, action: e.target.value })} />
              </Champ>
            </div>
            <div className="row" style={{ justifyContent: 'flex-end', marginTop: 8 }}>
              <button
                className="btn primary sm"
                disabled={!lecon.lecon.trim() || !lecon.action.trim()}
                onClick={() => {
                  maj(`Ajout leçon : ${lecon.lecon}`, (x) => {
                    x.lecons.push({ id: nouvelId('LEC'), domaine: lecon.domaine, lecon: lecon.lecon, actionProchaineRevision: lecon.action, responsable: lecon.responsable, integree: false });
                  });
                  setLecon({ ...lecon, lecon: '', action: '' });
                }}
              >
                Ajouter la leçon
              </button>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
