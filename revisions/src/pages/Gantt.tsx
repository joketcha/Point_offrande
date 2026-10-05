import { useEffect, useMemo, useRef, useState } from 'react';
import type { AnalyseRevision } from '../domain/analyse';
import { codeMachine } from '../domain/arbo';
import { addDays, diffDays, fmtCourt, maxDate, minDate, moisCourt, parseISO, semaineISO } from '../domain/dates';
import { STATUTS, STATUTS_INTERVENTION, STATUTS_TRAVAIL, WORKFLOW } from '../domain/referentiel';
import type { ISODate, StatutRevision } from '../domain/types';
import { useStore } from '../store/store';
import { NiveauBadge, Vide, aller } from '../ui/kit';
import { useFiltresArbo } from './Planning';

type Zoom = 'annee' | 'trimestre' | 'mois' | 'semaine' | 'jour';
const PX: Record<Zoom, number> = { annee: 2.4, trimestre: 7, mois: 20, semaine: 48, jour: 110 };
const LIB: Record<Zoom, string> = { annee: 'Année', trimestre: 'Trimestre', mois: 'Mois', semaine: 'Semaine', jour: 'Jour' };
const LABEL_W = 270;

interface Tick {
  x: number;
  w: number;
  label: string;
  major: boolean;
}

function graduations(debut: ISODate, fin: ISODate, z: Zoom, px: number): { haut: Tick[]; bas: Tick[] } {
  const haut: Tick[] = [];
  const bas: Tick[] = [];
  const x = (d: ISODate) => diffDays(debut, d) * px;
  // Ligne haute : années (zoom large) ou mois.
  let d = debut.slice(0, 8) + '01';
  if (z === 'annee' || z === 'trimestre') {
    let y = Number(debut.slice(0, 4));
    while (`${y}-01-01` <= fin) {
      const a = maxDate(`${y}-01-01`, debut)!;
      const b = minDate(`${y + 1}-01-01`, fin)!;
      haut.push({ x: x(a), w: x(b) - x(a), label: String(y), major: true });
      y++;
    }
  } else {
    while (d <= fin) {
      const dt = parseISO(d);
      const next = `${dt.getUTCMonth() === 11 ? dt.getUTCFullYear() + 1 : dt.getUTCFullYear()}-${String(((dt.getUTCMonth() + 1) % 12) + 1).padStart(2, '0')}-01`;
      const a = maxDate(d, debut)!;
      const b = minDate(next, fin)!;
      haut.push({ x: x(a), w: x(b) - x(a), label: `${moisCourt(dt.getUTCMonth())} ${dt.getUTCFullYear()}`, major: true });
      d = next;
    }
  }
  // Ligne basse.
  if (z === 'annee' || z === 'trimestre') {
    d = debut.slice(0, 8) + '01';
    while (d <= fin) {
      const dt = parseISO(d);
      const next = `${dt.getUTCMonth() === 11 ? dt.getUTCFullYear() + 1 : dt.getUTCFullYear()}-${String(((dt.getUTCMonth() + 1) % 12) + 1).padStart(2, '0')}-01`;
      if (z === 'annee' && dt.getUTCMonth() % 3 !== 0) {
        d = next;
        continue;
      }
      const lbl = z === 'annee' ? `T${Math.floor(dt.getUTCMonth() / 3) + 1}` : moisCourt(dt.getUTCMonth());
      bas.push({ x: x(maxDate(d, debut)!), w: 0, label: lbl, major: false });
      d = next;
    }
  } else if (z === 'mois' || z === 'semaine') {
    // lundis
    let l = addDays(debut, (8 - parseISO(debut).getUTCDay()) % 7);
    while (l <= fin) {
      bas.push({ x: x(l), w: 7 * px, label: z === 'mois' ? `S${semaineISO(l)}` : `S${semaineISO(l)} · ${fmtCourt(l)}`, major: false });
      l = addDays(l, 7);
    }
  } else {
    let j = debut;
    while (j <= fin) {
      const dt = parseISO(j);
      bas.push({ x: x(j), w: px, label: `${['di', 'lu', 'ma', 'me', 'je', 've', 'sa'][dt.getUTCDay()]} ${dt.getUTCDate()}`, major: dt.getUTCDay() === 1 });
      j = addDays(j, 1);
    }
  }
  return { haut, bas };
}

export default function Gantt() {
  const { d, analyses, visible, today } = useStore();
  const f = useFiltresArbo();
  const [zoom, setZoom] = useState<Zoom>('trimestre');
  const [statut, setStatut] = useState<'' | StatutRevision>('');
  const [machine, setMachine] = useState('');
  const [crit, setCrit] = useState<'' | 'A' | 'B'>('');
  const [resp, setResp] = useState('');
  const [ouverts, setOuverts] = useState<Set<string>>(() => new Set(analyses.filter((a) => a.revision.statut === 'EN_COURS').map((a) => a.revision.id)));
  const [aff, setAff] = useState({ init: true, plan: true, reel: true, prep: true, travaux: true, critique: false, pdr: true, tech: true });
  const scroller = useRef<HTMLDivElement>(null);
  const px = PX[zoom];

  const lignes = useMemo(
    () =>
      analyses
        .filter((a) => visible(a.revision.ligneId) && f.garde(a.revision.ligneId))
        .filter((a) => !statut || a.revision.statut === statut)
        .filter((a) => !resp || a.revision.responsableId === resp)
        .filter((a) => !machine || a.pdrs.some((p) => p.pdr.machineId === machine) || a.travaux.taches.some((t) => t.travail.machineId === machine))
        .sort((x, y) => (x.chemin.ligne?.code ?? '').localeCompare(y.chemin.ligne?.code ?? '') || x.revision.datePrevue.localeCompare(y.revision.datePrevue)),
    [analyses, visible, f, statut, resp, machine],
  );

  const debut = useMemo(() => {
    const m = minDate(...lignes.flatMap((a) => [a.revision.dateInitiale, a.revision.datePrevue, a.revision.dateReelleDebut, aff.prep ? a.preparation.lancement : undefined]), today) ?? today;
    return addDays(m.slice(0, 8) + '01', -15);
  }, [lignes, today, aff.prep]);
  const fin = useMemo(() => {
    const m = maxDate(...lignes.flatMap((a) => [a.finInitiale, a.finPrevue, a.finPrevisionnelle, a.redemarragePrevisionnel, a.pdrStats.dispoMaxCritiques]), today) ?? today;
    return addDays(m, 45);
  }, [lignes, today]);
  const largeur = diffDays(debut, fin) * px;
  const X = (dt: ISODate) => diffDays(debut, dt) * px;
  const W = (a: ISODate, b: ISODate) => Math.max(3, diffDays(a, b) * px);
  const { haut, bas } = useMemo(() => graduations(debut, fin, zoom, px), [debut, fin, zoom, px]);

  useEffect(() => {
    const el = scroller.current;
    if (el) el.scrollLeft = Math.max(0, X(today) - el.clientWidth * 0.35);
  }, [zoom, debut]);

  const toggle = (id: string) => setOuverts((s) => {
    const n = new Set(s);
    if (n.has(id)) n.delete(id);
    else n.add(id);
    return n;
  });
  const machinesDispo = d.machines.filter((m) => (!f.ligne || m.ligneId === f.ligne) && visible(m.ligneId));

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Gantt intelligent</h1>
          <div className="sub">Prévu initial → prévu actuel → réel. Une révision reportée reste visible à son emplacement initial.</div>
        </div>
        <div className="grow" />
        <div className="chip-row">
          {(Object.keys(PX) as Zoom[]).map((z) => (
            <button key={z} className={`chip ${zoom === z ? 'on' : ''}`} onClick={() => setZoom(z)}>
              {LIB[z]}
            </button>
          ))}
        </div>
      </div>
      <div className="filters">
        {f.ui}
        <select value={machine} onChange={(e) => setMachine(e.target.value)} aria-label="Machine">
          <option value="">Toutes machines</option>
          {machinesDispo.map((m) => (
            <option key={m.id} value={m.id}>
              {m.code} — {m.nom}
            </option>
          ))}
        </select>
        <select value={statut} onChange={(e) => setStatut(e.target.value as StatutRevision)} aria-label="Statut">
          <option value="">Tous statuts</option>
          {WORKFLOW.map((s) => (
            <option key={s} value={s}>
              {STATUTS[s].libelle}
            </option>
          ))}
        </select>
        <select value={crit} onChange={(e) => setCrit(e.target.value as '' | 'A' | 'B')} aria-label="Criticité">
          <option value="">Toutes criticités</option>
          <option value="A">Criticité A</option>
          <option value="B">Criticité A + B</option>
        </select>
        <select value={resp} onChange={(e) => setResp(e.target.value)} aria-label="Responsable">
          <option value="">Tous responsables</option>
          {d.utilisateurs
            .filter((u) => u.role === 'MAINTENANCE')
            .map((u) => (
              <option key={u.id} value={u.id}>
                {u.nom}
              </option>
            ))}
        </select>
      </div>
      <div className="row small">
        {(
          [
            ['init', 'Date initiale'],
            ['plan', 'Date actuelle'],
            ['reel', 'Réel / prévision'],
            ['prep', 'Préparation J-7 mois'],
            ['travaux', 'Travaux'],
            ['critique', 'Chemin critique seul'],
            ['pdr', 'PDR critiques'],
            ['tech', 'Techniciens'],
          ] as const
        ).map(([k, l]) => (
          <label key={k} className="row" style={{ gap: 4, cursor: 'pointer' }}>
            <input type="checkbox" checked={aff[k]} onChange={(e) => setAff({ ...aff, [k]: e.target.checked })} /> {l}
          </label>
        ))}
        <span className="grow" />
        <button className="btn sm" onClick={() => setOuverts(new Set(lignes.map((a) => a.revision.id)))}>
          Tout déplier
        </button>
        <button className="btn sm" onClick={() => setOuverts(new Set())}>
          Tout replier
        </button>
      </div>
      <div className="card">
        <div className="card-h g-legend">
          <span>
            <i style={{ background: 'repeating-linear-gradient(135deg, var(--bar-init) 0 4px, transparent 4px 7px)', border: '1px dashed var(--bar-init)' }} />
            Prévu initial
          </span>
          <span>
            <i style={{ background: 'var(--bar-plan)' }} />
            Prévu actuel
          </span>
          <span>
            <i style={{ background: 'var(--bar-reel)' }} />
            Réel
          </span>
          <span>
            <i style={{ background: 'repeating-linear-gradient(90deg, var(--bar-reel) 0 5px, transparent 5px 8px)' }} />
            Prévision
          </span>
          <span>
            <i style={{ background: 'var(--crit)' }} />
            Chemin critique
          </span>
          <span>◆ PDR critique (vert : à temps · rouge : en retard)</span>
          <span>👷 Technicien</span>
          <span>▶ Redémarrage prévisionnel</span>
          <span>
            <i style={{ background: 'var(--crit)', width: 2 }} />
            Aujourd'hui
          </span>
        </div>
        {lignes.length === 0 ? (
          <Vide>Aucune révision pour ces filtres.</Vide>
        ) : (
          <div className="gantt" ref={scroller}>
            <div className="gantt-inner" style={{ width: LABEL_W + largeur }}>
              <div className="g-head">
                <div className="g-corner" style={{ width: LABEL_W }}>
                  Révision / ligne
                </div>
                <div className="g-scale" style={{ width: largeur, height: 40 }}>
                  {haut.map((t, k) => (
                    <div key={`h${k}`} className="tick major" style={{ left: t.x, width: t.w, height: 20 }}>
                      {t.label}
                    </div>
                  ))}
                  {bas.map((t, k) => (
                    <div key={`b${k}`} className={`tick ${t.major ? 'major' : ''}`} style={{ left: t.x, top: 20, width: t.w || undefined }}>
                      {px * 7 > 30 || zoom === 'annee' || zoom === 'trimestre' ? t.label : ''}
                    </div>
                  ))}
                </div>
              </div>
              {lignes.map((a) => (
                <LigneRevision key={a.revision.id} a={a} ouvert={ouverts.has(a.revision.id)} toggle={() => toggle(a.revision.id)} X={X} W={W} largeur={largeur} today={today} aff={aff} crit={crit} machine={machine} grilles={haut} />
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="small muted">Astuce : cliquez sur ▸ pour déplier les travaux (chemin critique en rouge), les PDR critiques et les techniciens ; cliquez sur le code pour ouvrir la révision.</p>
    </div>
  );
}

function LigneRevision({
  a,
  ouvert,
  toggle,
  X,
  W,
  largeur,
  today,
  aff,
  crit,
  machine,
  grilles,
}: {
  a: AnalyseRevision;
  ouvert: boolean;
  toggle: () => void;
  X: (d: ISODate) => number;
  W: (a: ISODate, b: ISODate) => number;
  largeur: number;
  today: ISODate;
  aff: Record<'init' | 'plan' | 'reel' | 'prep' | 'travaux' | 'critique' | 'pdr' | 'tech', boolean>;
  crit: '' | 'A' | 'B';
  machine: string;
  grilles: Tick[];
}) {
  const { d } = useStore();
  const r = a.revision;
  const grid = grilles.map((t, k) => <div key={k} className="g-grid" style={{ left: t.x }} />);
  const todayLine = <div className="g-today" style={{ left: X(today) }} title={`Aujourd'hui ${fmtCourt(today)}`} />;
  const pdrsAff = a.pdrs.filter((p) => !p.pdr.horsGamme && (crit === 'B' ? p.pdr.criticite !== 'C' : p.pdr.criticite === 'A') && (!machine || p.pdr.machineId === machine));
  const taches = a.travaux.taches.filter((t) => (!aff.critique || t.critique) && (!machine || t.travail.machineId === machine) && (!crit || t.travail.criticite === 'A' || (crit === 'B' && t.travail.criticite === 'B')));
  const itAff = a.interventions.filter((i) => i.intervention.statut !== 'ANNULEE' && (!machine || i.intervention.machineId === machine));
  const reelFin = r.dateReelleFin ?? (r.dateReelleDebut ? today : undefined);

  return (
    <>
      <div className="g-row rev" style={{ minHeight: 38 }}>
        <div className="g-label" style={{ width: LABEL_W }}>
          <div className="l1">
            <button className="btn ghost sm" style={{ padding: '0 4px' }} onClick={toggle} aria-label={ouvert ? 'Replier' : 'Déplier'}>
              {ouvert ? '▾' : '▸'}
            </button>
            <a href={`#/revision/${r.id}`}>{r.code}</a>
            <NiveauBadge n={a.niveauRisque} court />
            {r.reports.length > 0 && <span className="badge vig">×{r.reports.length}</span>}
          </div>
          <div className="l2">
            {a.chemin.ligne?.nom} · {STATUTS[r.statut].libelle} · prép. {a.preparation.taux}%
          </div>
        </div>
        <div className="g-track" style={{ width: largeur, height: 38 }}>
          {grid}
          {aff.prep && STATUTS[r.statut].phase === 'amont' && <div className="g-bar prep" style={{ left: X(a.preparation.lancement), width: W(a.preparation.lancement, r.datePrevue) }} title={`Préparation à partir du ${fmtCourt(a.preparation.lancement)} (J-7 mois)`} />}
          {aff.init && (r.dateInitiale !== r.datePrevue || !aff.plan) && <div className="g-bar init" style={{ left: X(r.dateInitiale), width: W(r.dateInitiale, a.finInitiale) }} title={`Prévu initial : ${fmtCourt(r.dateInitiale)} → ${fmtCourt(a.finInitiale)}`} />}
          {aff.init && aff.plan && r.dateInitiale !== r.datePrevue && (
            <div className="g-link" style={{ left: Math.min(X(r.dateInitiale), X(r.datePrevue)), width: Math.abs(X(r.datePrevue) - X(r.dateInitiale)), top: 12 }} title={`${r.reports.length} report(s), dérive ${a.derive.derivePlanning} j`} />
          )}
          {aff.plan && <div className="g-bar plan" style={{ left: X(r.datePrevue), width: W(r.datePrevue, a.finPrevue) }} title={`Prévu actuel : ${fmtCourt(r.datePrevue)} → ${fmtCourt(a.finPrevue)} (${r.dureePrevueJours} j)`} />}
          {aff.reel && r.dateReelleDebut && reelFin && <div className="g-bar reel" style={{ left: X(r.dateReelleDebut), width: W(r.dateReelleDebut, reelFin) }} title={`Réel : ${fmtCourt(r.dateReelleDebut)} → ${r.dateReelleFin ? fmtCourt(r.dateReelleFin) : 'en cours'}`} />}
          {aff.reel && !r.dateReelleFin && STATUTS[r.statut].phase !== 'clos' && (r.dateReelleDebut || a.ecartFin > 0) && (
            <div
              className="g-bar prev"
              style={{ left: X(maxDate(r.dateReelleDebut ? today : r.datePrevue, r.dateReelleDebut ?? r.datePrevue)!), width: W(maxDate(r.dateReelleDebut ? today : r.datePrevue)!, a.finPrevisionnelle) }}
              title={`Fin prévisionnelle ${fmtCourt(a.finPrevisionnelle)} (${a.ecartFin > 0 ? '+' : ''}${a.ecartFin} j)`}
            />
          )}
          {aff.pdr &&
            pdrsAff.map((p) => (
              <div
                key={p.pdr.id}
                className={`g-diamond ${p.disponible ? 'ok' : p.ecart > 0 ? 'late' : p.ecart > -7 ? 'warn' : 'ok'}`}
                style={{ left: X(p.disponible ? p.pdr.dates.DISPONIBLE ?? p.dispo : p.dispo), top: 24, width: 8, height: 8 }}
                title={`${p.pdr.ref} ${p.pdr.designation} — ${p.disponible ? 'disponible' : `dispo estimée ${fmtCourt(p.dispo)}, besoin ${fmtCourt(p.requise)} (${p.ecart > 0 ? '+' : ''}${p.ecart} j)`} — ${p.position}`}
              />
            ))}
          {aff.tech &&
            itAff.map((i) => (
              <span key={i.intervention.id} className="g-mark" style={{ left: X(i.intervention.dateReelle ?? i.intervention.datePrevue), top: 1, fontSize: 11, filter: i.controle.enRisque ? 'drop-shadow(0 0 2px var(--crit))' : undefined }} title={`${i.intervention.entreprise} (${i.intervention.technicien}) — ${STATUTS_INTERVENTION[i.intervention.statut]}${i.controle.enRisque ? ' — 🔴 AVANT LES PDR' : ''}`}>
                👷
              </span>
            ))}
          {STATUTS[r.statut].phase !== 'clos' && r.statut !== 'ANNULEE' && (
            <span className="g-mark" style={{ left: X(a.redemarragePrevisionnel), top: 12, color: a.redemarrageTenable ? 'var(--ok)' : 'var(--crit)', fontSize: 11 }} title={`Redémarrage prévisionnel ${fmtCourt(a.redemarragePrevisionnel)}`}>
              ▶
            </span>
          )}
          {todayLine}
        </div>
      </div>
      {ouvert && (
        <>
          {aff.travaux &&
            taches.map((t) => {
              const w = t.travail;
              const fixe = w.dateReelleDebut;
              return (
                <div className="g-row sub" key={w.id}>
                  <div className="g-label" style={{ width: LABEL_W }}>
                    <div className="l1" style={{ fontWeight: 550 }}>
                      <span className={t.critique ? 'crit-txt' : ''}>{w.code}</span>
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.description}</span>
                    </div>
                    <div className="l2">
                      {codeMachine(d, w.machineId)} · {STATUTS_TRAVAIL[w.statut]} · marge {t.marge} j{t.critique ? ' · CRITIQUE' : ''}
                    </div>
                  </div>
                  <div className="g-track" style={{ width: largeur, height: 34 }}>
                    {grid}
                    <div className="g-bar task ghost" style={{ left: X(t.debutPrevu), width: W(t.debutPrevu, t.finPrevue) }} title={`Prévu ${fmtCourt(t.debutPrevu)} → ${fmtCourt(t.finPrevue)}`} />
                    <div
                      className={`g-bar task ${w.statut === 'TERMINE' ? 'done' : t.critique ? 'crit' : ''}`}
                      style={{ left: X(fixe ?? t.debutPrev), width: W(fixe ?? t.debutPrev, w.dateReelleFin ?? t.finPrev), opacity: w.statut === 'A_FAIRE' ? 0.55 : undefined }}
                      title={`${w.statut === 'TERMINE' ? 'Réel' : 'Prévision'} ${fmtCourt(fixe ?? t.debutPrev)} → ${fmtCourt(w.dateReelleFin ?? t.finPrev)}${t.retardJours ? ` (+${t.retardJours} j)` : ''}${w.motifBlocage ? ` — BLOQUÉ : ${w.motifBlocage}` : ''}`}
                    />
                    {w.statut === 'BLOQUE' && (
                      <span className="g-mark" style={{ left: X(t.debutPrev) - 8, top: 9 }} title={w.motifBlocage}>
                        ⛔
                      </span>
                    )}
                    {todayLine}
                  </div>
                </div>
              );
            })}
          {aff.tech &&
            itAff.map((i) => (
              <div className="g-row sub" key={i.intervention.id}>
                <div className="g-label" style={{ width: LABEL_W }}>
                  <div className="l1" style={{ fontWeight: 550 }}>
                    👷 {i.intervention.entreprise}
                  </div>
                  <div className="l2">
                    {codeMachine(d, i.intervention.machineId)} · {STATUTS_INTERVENTION[i.intervention.statut]}
                  </div>
                </div>
                <div className="g-track" style={{ width: largeur, height: 34 }}>
                  {grid}
                  <div
                    className="g-bar task"
                    style={{ left: X(i.intervention.dateReelle ?? i.intervention.datePrevue), width: W(i.intervention.dateReelle ?? i.intervention.datePrevue, addDays(i.intervention.dateReelle ?? i.intervention.datePrevue, i.intervention.dureeJours)), background: i.controle.enRisque ? 'var(--crit)' : 'var(--s4, #8a63d2)' }}
                    title={i.controle.enRisque ? `🔴 Technicien prévu avant les PDR (dernière PDR : ${fmtCourt(i.controle.dateDispoMax)})` : `${i.intervention.intervention}`}
                  />
                  {i.controle.enRisque && i.controle.dateDispoMax && <div className="g-diamond late" style={{ left: X(i.controle.dateDispoMax) }} title={`PDR disponibles le ${fmtCourt(i.controle.dateDispoMax)}`} />}
                  {todayLine}
                </div>
              </div>
            ))}
          {aff.pdr &&
            pdrsAff
              .filter((p) => !p.disponible)
              .map((p) => (
                <div className="g-row sub" key={p.pdr.id}>
                  <div className="g-label" style={{ width: LABEL_W }}>
                    <div className="l1" style={{ fontWeight: 550 }}>
                      ◆ <span className="mono">{p.pdr.ref}</span> {p.pdr.designation}
                    </div>
                    <div className="l2">{p.position}</div>
                  </div>
                  <div className="g-track" style={{ width: largeur, height: 34 }}>
                    {grid}
                    <div className="g-link" style={{ left: Math.min(X(today), X(p.dispo)), width: Math.abs(X(p.dispo) - X(today)), top: 16 }} />
                    <div className="g-diamond" style={{ left: X(p.requise), background: 'var(--muted)' }} title={`Besoin ${fmtCourt(p.requise)}`} />
                    <div className={`g-diamond ${p.ecart > 0 ? 'late' : p.ecart > -7 ? 'warn' : 'ok'}`} style={{ left: X(p.dispo) }} title={`Disponibilité estimée ${fmtCourt(p.dispo)} (${p.ecart > 0 ? '+' : ''}${p.ecart} j)`} />
                    {todayLine}
                  </div>
                </div>
              ))}
          {!taches.length && !itAff.length && !pdrsAff.some((p) => !p.disponible) && (
            <div className="g-row sub">
              <div className="g-label" style={{ width: LABEL_W }}>
                <span className="l2">Aucun travail / technicien / PDR critique en attente.</span>
              </div>
              <div className="g-track" style={{ width: largeur }} onClick={() => aller(`revision/${r.id}`)} />
            </div>
          )}
        </>
      )}
    </>
  );
}
