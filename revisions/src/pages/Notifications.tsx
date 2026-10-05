import { useState } from 'react';
import { fmtCourt } from '../domain/dates';
import { formaterMessage, LIBELLES_STATUT_NOTIF, nouvelEtat, type Notification } from '../domain/notifications';
import { NIVEAUX, ROLES } from '../domain/referentiel';
import type { Niveau, StatutNotification } from '../domain/types';
import { useStore } from '../store/store';
import { Modal, NiveauBadge, RoleBadge, Tabs, Vide, aller } from '../ui/kit';

const RELATIONS = { RESPONSABLE: 'À moi d\'agir', PILOTE: 'Pilote', INFORME: 'Informé', ESCALADE: 'Escalade' } as const;

export default function Notifications() {
  const { mesNotifications, modifier, user, today, peut, toast } = useStore();
  const [vue, setVue] = useState<'ouvertes' | 'moi' | 'closes'>('ouvertes');
  const [niveau, setNiveau] = useState<'' | Niveau>('');
  const [voir, setVoir] = useState<Notification | null>(null);
  const liste = mesNotifications
    .filter((n) => (vue === 'closes' ? n.statut === 'CLOTUREE' : n.statut !== 'CLOTUREE'))
    .filter((n) => vue !== 'moi' || n.relation === 'RESPONSABLE' || n.relation === 'ESCALADE')
    .filter((n) => !niveau || n.niveau === niveau);
  const changer = (n: Notification, statut: StatutNotification) => {
    if (!peut('NOTIFICATIONS')) return;
    modifier({ entite: 'Notification', entiteId: n.cle, revisionId: n.revisionId, action: statut, detail: `${n.quoi} → ${LIBELLES_STATUT_NOTIF[statut]}`, avant: LIBELLES_STATUT_NOTIF[n.statut], apres: LIBELLES_STATUT_NOTIF[statut] }, (d) => {
      d.notifications = [...d.notifications.filter((e) => e.cle !== n.cle), nouvelEtat(n.cle, statut, user.nom, today)];
    });
    toast(`Notification ${LIBELLES_STATUT_NOTIF[statut].toLowerCase()}`);
  };
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Mes notifications</h1>
          <div className="sub">
            {ROLES[user.role].libelle} — {user.role === 'DIRECTION' ? 'uniquement les escalades de niveau 3 (seuil critique).' : user.role === 'BMC' ? 'vision transverse (pilote).' : 'actions dont vous êtes responsable et informations de votre périmètre.'}
          </div>
        </div>
        <div className="grow" />
        <div className="chip-row">
          {(['', 'CRITIQUE', 'ACTION', 'VIGILANCE', 'INFO'] as const).map((x) => (
            <button key={x} className={`chip ${niveau === x ? 'on' : ''}`} onClick={() => setNiveau(x)}>
              {x ? `${NIVEAUX[x].icone} ${NIVEAUX[x].libelle}` : 'Tous'}
            </button>
          ))}
        </div>
      </div>
      <Tabs
        value={vue}
        onChange={setVue}
        items={[
          { id: 'ouvertes', label: 'Ouvertes', badge: <span className="badge">{mesNotifications.filter((n) => n.statut !== 'CLOTUREE').length}</span> },
          { id: 'moi', label: 'À moi d\'agir', badge: <span className="badge act">{mesNotifications.filter((n) => n.statut !== 'CLOTUREE' && (n.relation === 'RESPONSABLE' || n.relation === 'ESCALADE')).length}</span> },
          { id: 'closes', label: 'Clôturées' },
        ]}
      />
      <div className="card">
        {liste.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Ligne</th>
                  <th>Machine</th>
                  <th>Événement</th>
                  <th>Criticité</th>
                  <th>Responsable</th>
                  <th>Échéance</th>
                  <th>Statut</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {liste.map((n) => (
                  <tr key={n.cle} className={`lvl-${n.niveau}`}>
                    <td className="nowrap small">{fmtCourt(n.date)}</td>
                    <td className="nowrap">{n.ligneCode}</td>
                    <td className="nowrap">{n.machineCode ?? '—'}</td>
                    <td>
                      <b>{n.quoi}</b>
                      <div className="tiny muted">
                        {n.revisionCode} · {RELATIONS[n.relation]}
                        {n.escalade > 1 ? ` · escalade N${n.escalade}` : ''}
                      </div>
                      <div className="small">→ {n.action}</div>
                    </td>
                    <td>
                      <NiveauBadge n={n.niveau} />
                    </td>
                    <td>
                      <RoleBadge r={n.responsable} />
                    </td>
                    <td className={`nowrap ${n.echeance && n.echeance < today ? 'crit-txt b' : ''}`}>{fmtCourt(n.echeance)}</td>
                    <td>
                      <span className={`badge ${n.statut === 'NOUVELLE' ? 'info' : n.statut === 'CLOTUREE' ? 'ok' : ''}`}>{LIBELLES_STATUT_NOTIF[n.statut]}</span>
                    </td>
                    <td className="nowrap">
                      <button className="btn sm" onClick={() => setVoir(n)}>
                        Voir
                      </button>{' '}
                      {n.statut === 'NOUVELLE' && (
                        <button className="btn sm" onClick={() => changer(n, 'ACQUITTEE')}>
                          Acquitter
                        </button>
                      )}{' '}
                      {n.relation === 'RESPONSABLE' && n.statut !== 'EN_TRAITEMENT' && n.statut !== 'CLOTUREE' && (
                        <button className="btn sm primary" onClick={() => (changer(n, 'EN_TRAITEMENT'), aller(`revision/${n.revisionId}/${n.pdrId ? 'pdr' : n.travailId ? 'travaux' : n.interventionId ? 'techniciens' : 'risques'}`))}>
                          Traiter
                        </button>
                      )}{' '}
                      {n.statut !== 'CLOTUREE' && (n.relation === 'RESPONSABLE' || n.relation === 'PILOTE' || n.nature === 'EVENEMENT') && (
                        <button className="btn sm" onClick={() => changer(n, 'CLOTUREE')}>
                          Clôturer
                        </button>
                      )}
                      {n.statut === 'CLOTUREE' && (
                        <button className="btn sm" onClick={() => changer(n, 'NOUVELLE')}>
                          Rouvrir
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Vide>Aucune notification.</Vide>
        )}
      </div>
      <p className="small muted">
        Niveaux : 🔵 information · 🟡 vigilance · 🟠 action requise · 🔴 critique (action immédiate). Escalade : N1 responsable d'action → N2 BMC (critique ou échéance dépassée) → N3 Direction (seuil critique de la matrice). Une notification clôturée dont le risque persiste reste visible dans « Clôturées » ; le risque reste au registre tant que sa cause existe.
      </p>
      {voir && (
        <Modal
          titre="Notification"
          onClose={() => setVoir(null)}
          pied={
            <>
              <button className="btn" onClick={() => navigator.clipboard?.writeText(formaterMessage(voir)).then(() => toast('Message copié'))}>
                Copier le message
              </button>
              <button className="btn primary" onClick={() => (setVoir(null), aller(`revision/${voir.revisionId}`))}>
                Ouvrir la révision
              </button>
            </>
          }
        >
          <div className="pre">{formaterMessage(voir)}</div>
        </Modal>
      )}
    </div>
  );
}
