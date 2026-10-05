import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { creerDonneesDemo } from '../data/seed';
import { analyserRevision, type AnalyseRevision } from '../domain/analyse';
import { codeLigne, codeMachine } from '../domain/arbo';
import { aujourdhuiReel } from '../domain/dates';
import { calculerKpis, type FamilleKpi } from '../domain/kpi';
import { concerne, construireNotifications, type Notification } from '../domain/notifications';
import { actionsPreparationAGenerer } from '../domain/planning';
import { ligneVisible, peutModifier, type Domaine } from '../domain/permissions';
import type { AuditEntry, Donnees, ID, ISODate, Utilisateur } from '../domain/types';
import { LocalStorageRepository, type Repository } from './repository';

/**
 * État applicatif : une seule source de vérité (`Donnees`), des vues dérivées
 * (analyses, notifications, KPI) recalculées, et un journal d'audit alimenté par
 * CHAQUE modification (qui, quand, quoi, avant/après).
 */

export interface Modification {
  entite: string;
  entiteId: ID;
  revisionId?: ID;
  action: string;
  detail: string;
  avant?: string;
  apres?: string;
}

interface Ctx {
  d: Donnees;
  today: ISODate;
  user: Utilisateur;
  setUser: (id: ID) => void;
  analyses: AnalyseRevision[];
  analyse: (revisionId: ID) => AnalyseRevision | undefined;
  notifications: Notification[];
  mesNotifications: (Notification & { relation: NonNullable<ReturnType<typeof concerne>> })[];
  kpis: FamilleKpi[];
  /** Applique une modification sur une copie, l'audite et la persiste. */
  modifier: (m: Modification | Modification[], fn: (draft: Donnees) => void) => void;
  peut: (domaine: Domaine, ligneId?: ID) => boolean;
  visible: (ligneId: ID) => boolean;
  remplacer: (d: Donnees, motif: string) => void;
  reinitialiser: () => void;
  toast: (msg: string, type?: 'ok' | 'erreur') => void;
  toasts: { id: number; msg: string; type: 'ok' | 'erreur' }[];
}

const Contexte = createContext<Ctx | null>(null);

const repo: Repository = new LocalStorageRepository();
const CLE_USER = 'pilotage-revisions:utilisateur';

function horodatage(today: ISODate): string {
  const n = new Date();
  return `${today}T${String(n.getHours()).padStart(2, '0')}:${String(n.getMinutes()).padStart(2, '0')}:${String(n.getSeconds()).padStart(2, '0')}`;
}

let seqAudit = 0;
function idAudit(): string {
  seqAudit = (seqAudit + 1) % 1e6;
  return `AUD-${Date.now().toString(36)}-${seqAudit}`;
}

/** Génère automatiquement les actions J-7 mois arrivées à échéance (auditées « Système »). */
function preparerAuto(d: Donnees, today: ISODate): Donnees {
  let out = d;
  for (const r of d.revisions) {
    const gen = actionsPreparationAGenerer(r, d.parametres, today);
    if (!gen.length) continue;
    if (out === d) out = structuredClone(d);
    const rr = out.revisions.find((x) => x.id === r.id)!;
    rr.actionsPreparation = gen;
    out.audit.push({
      id: idAudit(),
      horodatage: horodatage(today),
      auteur: 'Système',
      role: 'ADMIN',
      entite: 'Révision',
      entiteId: r.id,
      revisionId: r.id,
      action: 'PREPARATION_J7',
      detail: `Génération automatique de ${gen.length} actions de préparation (J-${d.parametres.moisPreparation} mois).`,
    });
  }
  return out;
}

export function StoreProvider({ children, initial }: { children: ReactNode; initial?: Donnees }) {
  const [d, setD] = useState<Donnees>(() => {
    if (initial) return initial;
    const charge = repo.charger();
    return charge ?? creerDonneesDemo(aujourdhuiReel());
  });
  const today = d.parametres.dateReference || aujourdhuiReel();
  const [userId, setUserId] = useState<ID>(() => {
    try {
      return localStorage.getItem(CLE_USER) || 'u-bmc';
    } catch {
      return 'u-bmc';
    }
  });
  const user = d.utilisateurs.find((u) => u.id === userId) ?? d.utilisateurs[0];
  const [toasts, setToasts] = useState<Ctx['toasts']>([]);

  // Préparation automatique J-7 mois au chargement et quand la date de référence change.
  useEffect(() => {
    setD((cur) => preparerAuto(cur, today));
  }, [today]);

  useEffect(() => {
    repo.enregistrer(d);
  }, [d]);

  const toast = useCallback((msg: string, type: 'ok' | 'erreur' = 'ok') => {
    const id = Date.now() + Math.random();
    setToasts((t) => [...t, { id, msg, type }]);
    setTimeout(() => setToasts((t) => t.filter((x) => x.id !== id)), 4200);
  }, []);

  const modifier = useCallback(
    (m: Modification | Modification[], fn: (draft: Donnees) => void) => {
      setD((cur) => {
        const draft = structuredClone(cur);
        fn(draft);
        const liste = Array.isArray(m) ? m : [m];
        const h = horodatage(today);
        for (const x of liste) {
          const e: AuditEntry = { id: idAudit(), horodatage: h, auteur: user.nom, role: user.role, ...x };
          draft.audit.push(e);
        }
        return draft;
      });
    },
    [today, user],
  );

  const visible = useCallback((ligneId: ID) => ligneVisible(d, user, ligneId), [d, user]);
  const peut = useCallback((domaine: Domaine, ligneId?: ID) => peutModifier(d, user, domaine, ligneId), [d, user]);

  const analyses = useMemo(() => d.revisions.map((r) => analyserRevision(d, r.id, today)), [d, today]);
  const parId = useMemo(() => new Map(analyses.map((a) => [a.revision.id, a])), [analyses]);
  const notifications = useMemo(
    () =>
      construireNotifications(analyses, d.notifications, (r) => ({
        ligne: codeLigne(d, r.ligneId),
        machine: r.machineId ? codeMachine(d, r.machineId) : undefined,
        pdr: r.pdrId ? d.pdrs.find((p) => p.id === r.pdrId)?.ref : undefined,
      })),
    [analyses, d],
  );
  const mesNotifications = useMemo(
    () =>
      notifications
        .map((n) => ({ ...n, relation: concerne(n, user, (l) => ligneVisible(d, user, l)) }))
        .filter((n): n is Notification & { relation: NonNullable<ReturnType<typeof concerne>> } => n.relation !== null),
    [notifications, user, d],
  );
  const kpis = useMemo(() => calculerKpis(d, analyses, today), [d, analyses, today]);

  const value: Ctx = {
    d,
    today,
    user,
    setUser: (id) => {
      setUserId(id);
      try {
        localStorage.setItem(CLE_USER, id);
      } catch {
        /* ignore */
      }
    },
    analyses,
    analyse: (id) => parId.get(id),
    notifications,
    mesNotifications,
    kpis,
    modifier,
    peut,
    visible,
    remplacer: (nd, motif) =>
      setD(() => {
        const c = structuredClone(nd);
        c.audit.push({ id: idAudit(), horodatage: horodatage(today), auteur: user.nom, role: user.role, entite: 'Données', entiteId: '-', action: 'RESTAURATION', detail: motif });
        return c;
      }),
    reinitialiser: () => {
      repo.reinitialiser();
      setD(preparerAuto(creerDonneesDemo(aujourdhuiReel()), aujourdhuiReel()));
    },
    toast,
    toasts,
  };
  return <Contexte.Provider value={value}>{children}</Contexte.Provider>;
}

export function useStore(): Ctx {
  const c = useContext(Contexte);
  if (!c) throw new Error('StoreProvider manquant');
  return c;
}

/** Générateur d'identifiants lisibles. */
export function nouvelId(prefixe: string): ID {
  return `${prefixe}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}
