import type { AnalyseRevision, Risque } from './analyse';
import { trierRisques } from './analyse';
import { fmtCourt } from './dates';
import { NIVEAUX, ROLES } from './referentiel';
import type { EtatNotification, ISODate, Role, StatutNotification, Utilisateur } from './types';

/**
 * Notifications (§27-30) dérivées des risques : une notification = un risque ou
 * un événement, avec un état persisté (acquittée, en traitement, clôturée).
 * Un risque clos qui réapparaît plus grave redevient « nouvelle ».
 */

export interface Notification extends Risque {
  statut: StatutNotification;
  ligneCode: string;
  machineCode?: string;
  pdrRef?: string;
  revisionCode: string;
}

export function construireNotifications(analyses: AnalyseRevision[], etats: EtatNotification[], codes: (r: Risque) => { ligne: string; machine?: string; pdr?: string }): Notification[] {
  const parCle = new Map(etats.map((e) => [e.cle, e]));
  const out: Notification[] = [];
  for (const a of analyses) {
    for (const r of a.risques) {
      const e = parCle.get(r.cle);
      const c = codes(r);
      out.push({
        ...r,
        statut: e?.statut ?? 'NOUVELLE',
        ligneCode: c.ligne,
        machineCode: c.machine,
        pdrRef: c.pdr,
        revisionCode: a.revision.code,
      });
    }
  }
  return trierRisques(out);
}

/**
 * Qui voit quoi (« Mes notifications ») :
 *  - le responsable d'action (niveau 1) ;
 *  - le BMC, pilote, voit tout (vision transverse, niveau 2) ;
 *  - les rôles informés voient les risques de leur périmètre ;
 *  - la Direction ne voit QUE les escalades de niveau 3.
 */
export function concerne(n: Notification, u: Utilisateur, ligneVisible: (ligneId: string) => boolean): 'RESPONSABLE' | 'PILOTE' | 'INFORME' | 'ESCALADE' | null {
  if (!ligneVisible(n.ligneId)) return null;
  if (u.role === 'ADMIN') return 'PILOTE';
  if (u.role === 'DIRECTION') return n.escalade === 3 ? 'ESCALADE' : null;
  if (n.responsable === u.role) return 'RESPONSABLE';
  if (u.role === 'BMC') return 'PILOTE';
  if (n.informes.includes(u.role)) return 'INFORME';
  if (u.role === 'TECHNICIEN' && n.responsable === 'MAINTENANCE' && n.travailId) return 'INFORME';
  return null;
}

export function estOuverte(n: { statut: StatutNotification }): boolean {
  return n.statut !== 'CLOTUREE';
}

/** Texte du message au format §27 (copiable dans un email / message mobile). */
export function formaterMessage(n: Notification): string {
  const l = [
    `${NIVEAUX[n.niveau].icone} ${n.nature === 'EVENEMENT' ? 'INFORMATION' : `RISQUE ${NIVEAUX[n.niveau].libelle.toUpperCase()}`}`,
    n.quoi,
    `${n.ou}`,
    n.pourquoi,
  ];
  if (n.echeance) l.push(`Échéance : ${fmtCourt(n.echeance)}`);
  if (n.ecartJours !== undefined && n.ecartJours > 0) l.push(`Écart : +${n.ecartJours} jours`);
  l.push('', `Responsable : ${ROLES[n.responsable].court}`);
  if (n.pilote) l.push(`Pilote : ${ROLES[n.pilote].court}`);
  if (n.informes.length) l.push(`Informés : ${n.informes.map((r) => ROLES[r].court).join(', ')}`);
  l.push(`Action attendue : ${n.action}`, `Impact : ${n.impact}`);
  if (n.escalade > 1) l.push(`Escalade : niveau ${n.escalade} (${n.escalade === 2 ? 'BMC' : 'Direction'})`);
  return l.join('\n');
}

export function nouvelEtat(cle: string, statut: StatutNotification, auteur: string, date: ISODate, commentaire?: string): EtatNotification {
  return { cle, statut, auteur, date, commentaire };
}

export const LIBELLES_STATUT_NOTIF: Record<StatutNotification, string> = {
  NOUVELLE: 'Nouvelle',
  ACQUITTEE: 'Acquittée',
  EN_TRAITEMENT: 'En traitement',
  CLOTUREE: 'Clôturée',
};

export function rolesConcernes(n: Notification): Role[] {
  const r: Role[] = [n.responsable];
  if (n.pilote) r.push(n.pilote);
  r.push(...n.informes);
  if (n.escalade === 3) r.push('DIRECTION');
  return [...new Set(r)];
}
