import { useEffect, useState, type ReactNode } from 'react';
import type { Risque } from '../domain/analyse';
import { fmtCourt } from '../domain/dates';
import { ETAPES_PDR, NIVEAUX, ROLES, STATUTS, WORKFLOW, indexEtape } from '../domain/referentiel';
import type { EtapePDR, Niveau, Role, StatutRevision } from '../domain/types';

/* ------------------------------------------------------------------ */
/* Routage par hash (#/page/param)                                     */
/* ------------------------------------------------------------------ */

export function useRoute(): string[] {
  const lire = () => window.location.hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean).map(decodeURIComponent);
  const [r, setR] = useState(lire);
  useEffect(() => {
    const f = () => setR(lire());
    window.addEventListener('hashchange', f);
    return () => window.removeEventListener('hashchange', f);
  }, []);
  return r;
}

export function aller(chemin: string) {
  window.location.hash = '#/' + chemin.replace(/^\//, '');
}

export function Lien({ to, children, className }: { to: string; children: ReactNode; className?: string }) {
  return (
    <a href={'#/' + to.replace(/^\//, '')} className={className}>
      {children}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Badges                                                              */
/* ------------------------------------------------------------------ */

export function NiveauBadge({ n, court }: { n: Niveau | 'OK'; court?: boolean }) {
  if (n === 'OK') return <span className="badge OK">🟢 {court ? '' : 'Sous contrôle'}</span>;
  return (
    <span className={`badge ${n}`}>
      {NIVEAUX[n].icone} {court ? '' : NIVEAUX[n].libelle}
    </span>
  );
}

export function StatutBadge({ s, reports }: { s: StatutRevision; reports?: number }) {
  const cls = s === 'ANNULEE' ? 'outline' : STATUTS[s].phase === 'clos' ? 'ok' : STATUTS[s].phase === 'execution' || STATUTS[s].phase === 'aval' ? 'info' : '';
  return (
    <span className="row" style={{ gap: 4, display: 'inline-flex' }}>
      <span className={`badge ${cls}`}>{STATUTS[s].libelle}</span>
      {reports ? <span className="badge vig" title={`${reports} report(s)`}>Reportée ×{reports}</span> : null}
    </span>
  );
}

export function RoleBadge({ r, titre }: { r: Role | null | undefined; titre?: string }) {
  if (!r) return <span className="muted">—</span>;
  return (
    <span className="badge role" title={titre ?? ROLES[r].libelle}>
      {ROLES[r].court}
    </span>
  );
}

export function EcartBadge({ j, unite = 'j' }: { j?: number; unite?: string }) {
  if (j === undefined) return <span className="muted">—</span>;
  const cls = j > 0 ? 'crit' : j < 0 ? 'ok' : '';
  return <span className={`badge ${cls}`}>{j > 0 ? '+' : j < 0 ? '−' : ''}{Math.abs(j)} {unite}</span>;
}

/* ------------------------------------------------------------------ */
/* Blocs                                                               */
/* ------------------------------------------------------------------ */

export function Card({ titre, actions, children, tight, className, sub }: { titre?: ReactNode; sub?: ReactNode; actions?: ReactNode; children: ReactNode; tight?: boolean; className?: string }) {
  return (
    <section className={`card ${className ?? ''}`}>
      {(titre || actions) && (
        <div className="card-h">
          <div>
            {typeof titre === 'string' ? <h2>{titre}</h2> : titre}
            {sub && <div className="small muted">{sub}</div>}
          </div>
          <div className="grow" />
          {actions}
        </div>
      )}
      <div className={`card-b ${tight ? 'tight' : ''}`}>{children}</div>
    </section>
  );
}

export function Tile({ lbl, val, unite, det, cls, onClick }: { lbl: string; val: ReactNode; unite?: string; det?: ReactNode; cls?: string; onClick?: () => void }) {
  return (
    <div className={`card tile ${cls ?? ''}`} onClick={onClick} style={onClick ? { cursor: 'pointer' } : undefined}>
      <span className="lbl">{lbl}</span>
      <span className="val">
        {val}
        {unite && <small>{unite}</small>}
      </span>
      {det && <span className="det">{det}</span>}
    </div>
  );
}

export function Prog({ v, cls }: { v: number; cls?: string }) {
  const c = cls ?? (v >= 80 ? 'ok' : v >= 50 ? '' : v >= 25 ? 'act' : 'crit');
  return (
    <div className={`prog ${c}`} title={`${Math.round(v)} %`}>
      <i style={{ width: `${Math.max(0, Math.min(100, v))}%` }} />
    </div>
  );
}

export function Tabs<T extends string>({ value, onChange, items }: { value: T; onChange: (v: T) => void; items: { id: T; label: ReactNode; badge?: ReactNode }[] }) {
  return (
    <div className="tabs" role="tablist">
      {items.map((i) => (
        <button key={i.id} role="tab" aria-selected={value === i.id} className={value === i.id ? 'on' : ''} onClick={() => onChange(i.id)}>
          {i.label}
          {i.badge}
        </button>
      ))}
    </div>
  );
}

export function Modal({ titre, onClose, children, pied, large }: { titre: ReactNode; onClose: () => void; children: ReactNode; pied?: ReactNode; large?: boolean }) {
  useEffect(() => {
    const f = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', f);
    return () => window.removeEventListener('keydown', f);
  }, [onClose]);
  return (
    <div className="modal-bg" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${large ? 'wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-h">
          <h2 style={{ flex: 1 }}>{titre}</h2>
          <button className="btn ghost icon" onClick={onClose} aria-label="Fermer">
            ✕
          </button>
        </div>
        <div className="modal-b">{children}</div>
        {pied && <div className="modal-f">{pied}</div>}
      </div>
    </div>
  );
}

export function Vide({ children }: { children: ReactNode }) {
  return <div className="empty">{children}</div>;
}

export function Champ({ label, req, children, full }: { label: string; req?: boolean; children: ReactNode; full?: boolean }) {
  return (
    <label className={`f ${full ? 'full' : ''}`}>
      <span className={req ? 'req' : ''}>{label}</span>
      {children}
    </label>
  );
}

/* ------------------------------------------------------------------ */
/* Workflow / PDR                                                      */
/* ------------------------------------------------------------------ */

export function FluxStatut({ s }: { s: StatutRevision }) {
  const i = WORKFLOW.indexOf(s);
  return (
    <div className="status-flow">
      {WORKFLOW.map((w, k) => (
        <span key={w} className="row" style={{ gap: 3 }}>
          <span className={`sf ${k < i ? 'done' : k === i ? 'cur' : ''}`}>{STATUTS[w].libelle}</span>
          {k < WORKFLOW.length - 1 && <span className="arrow">›</span>}
        </span>
      ))}
    </div>
  );
}

export function PipePdr({ etape, bad }: { etape: EtapePDR; bad?: boolean }) {
  const i = indexEtape(etape);
  return (
    <div className="pipe" title={`${i + 1}/${ETAPES_PDR.length}`}>
      {ETAPES_PDR.map((e, k) => (
        <i key={e} className={k < i ? 'done' : k === i ? (bad ? 'bad' : e === 'DISPONIBLE' ? 'done' : 'cur') : ''} />
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Risque : QUOI / OÙ / POURQUOI / QUI / POUR QUAND / IMPACT / QUE FAIRE */
/* ------------------------------------------------------------------ */

export function RisqueItem({ r, compact, extra, lien }: { r: Risque; compact?: boolean; extra?: ReactNode; lien?: string }) {
  return (
    <div className={`risk lvl-${r.niveau}`}>
      <span className={`dot ${r.niveau}`} style={{ marginTop: 5 }} />
      <div style={{ minWidth: 0 }}>
        <div className="quoi">{lien ? <Lien to={lien}>{r.quoi}</Lien> : r.quoi}</div>
        <div className="small muted">{r.ou}</div>
        {!compact && (
          <dl className="w5">
            <dt>Pourquoi ?</dt>
            <dd>{r.pourquoi}</dd>
            <dt>Qui agit ?</dt>
            <dd className="row" style={{ gap: 4 }}>
              <RoleBadge r={r.responsable} />
              {r.pilote && <span className="tiny muted">pilote {ROLES[r.pilote].court}</span>}
              {r.escalade > 1 && <span className={`badge ${r.escalade === 3 ? 'crit' : 'act'}`}>Escalade N{r.escalade} · {r.escalade === 3 ? 'Direction' : 'BMC'}</span>}
            </dd>
            <dt>Pour quand ?</dt>
            <dd>{r.echeance ? fmtCourt(r.echeance) : '—'}</dd>
            <dt>Impact</dt>
            <dd>{r.impact}</dd>
            <dt>Que faire ?</dt>
            <dd className="b">{r.action}</dd>
          </dl>
        )}
        {compact && (
          <div className="row small" style={{ marginTop: 3 }}>
            <RoleBadge r={r.responsable} />
            <span className="muted">→ {r.action}</span>
            {r.echeance && <span className="muted">· {fmtCourt(r.echeance)}</span>}
          </div>
        )}
      </div>
      <div className="col" style={{ alignItems: 'flex-end', gap: 4 }}>
        <NiveauBadge n={r.niveau} court />
        {extra}
      </div>
    </div>
  );
}

export function fmtMontant(n: number, devise: string): string {
  return `${n.toLocaleString('fr-FR')} ${devise}`;
}

/** Télécharge un contenu texte (CSV, JSON). */
export function telecharger(nom: string, contenu: string | Blob, type = 'text/plain;charset=utf-8') {
  const blob = contenu instanceof Blob ? contenu : new Blob([contenu], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = nom;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function csv(lignes: (string | number | undefined | null)[][]): string {
  const esc = (v: string | number | undefined | null) => {
    const s = v === undefined || v === null ? '' : String(v);
    return /[;"\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '﻿' + lignes.map((l) => l.map(esc).join(';')).join('\r\n');
}
