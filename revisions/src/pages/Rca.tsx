import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { codeLigne, codeMachine } from '../domain/arbo';
import { addDays, fmt, fmtCourt } from '../domain/dates';
import {
  avancementRca,
  causesRacines,
  controlerEtape,
  CRITERES_DECLENCHEMENT,
  ETAPES_RCA,
  FAMILLES_6M,
  HIERARCHIE,
  MECANISMES,
  qualiteAnalyse,
  rcaVide,
  TYPES_CAUSE,
  type ActionRca,
  type BranchePourquoi,
  type CritereDeclenchement,
  type Famille6M,
  type Hierarchie,
  type Mecanisme,
  type NiveauRca,
  type Rca,
  type StatutHypothese,
  type TypeCause,
} from '../domain/rca';
import { ORDRE_ROLES, ROLES } from '../domain/referentiel';
import type { Donnees, IncidentRedemarrage, Role, Travail } from '../domain/types';
import { nouvelId, useStore } from '../store/store';
import { Card, Champ, Lien, Prog, RoleBadge, Vide, aller } from '../ui/kit';

/* ------------------------------------------------------------------ */
/* Création depuis un incident / un travail                            */
/* ------------------------------------------------------------------ */

function prochainCode(d: Donnees, annee: string): string {
  const n = (d.rca ?? []).filter((r) => r.code.startsWith(`RCA-${annee}`)).length + 1;
  return `RCA-${annee}-${String(n).padStart(3, '0')}`;
}

export function rcaDepuisIncident(d: Donnees, i: IncidentRedemarrage, animateur: string, today: string): Rca {
  const rev = d.revisions.find((r) => r.id === i.revisionId);
  return rcaVide(nouvelId('RCA'), prochainCode(d, today.slice(0, 4)), animateur, today, {
    titre: `${i.probleme}${i.machineId ? ` — ${codeMachine(d, i.machineId)}` : ''}`,
    revisionId: i.revisionId,
    ligneId: rev?.ligneId,
    machineId: i.machineId,
    source: { type: 'INCIDENT', id: i.id },
    declenchement: { criteres: i.impact === 'FORT' ? ['CRITIQUE', 'ARRET_LONG'] : i.dureeSupH >= 4 ? ['ARRET_LONG'] : [], niveau: i.impact === 'FORT' ? 'N3' : 'N2', justification: `Incident de redémarrage : +${i.dureeSupH} h, impact ${i.impact.toLowerCase()}.` },
    probleme: {
      quoi: i.probleme,
      ou: `Ligne ${rev ? codeLigne(d, rev.ligneId) : '—'}${i.machineId ? ` — ${codeMachine(d, i.machineId)}` : ''}`,
      quand: `${i.date} à ${i.heure} (redémarrage ${rev?.code ?? ''})`,
      qui: '',
      comment: i.symptome,
      combien: `${i.dureeSupH} h de redémarrage supplémentaires`,
      pourquoi: '',
      attendu: '',
      observe: i.symptome,
    },
    confinement: i.actionCorrective ? [{ id: nouvelId('c'), texte: i.actionCorrective, date: i.date, faite: true }] : [],
    chronologie: [{ id: nouvelId('h'), date: i.date, heure: i.heure, evenement: `Détection : ${i.probleme}` }],
  });
}

export function rcaDepuisTravail(d: Donnees, t: Travail, animateur: string, today: string): Rca {
  const rev = d.revisions.find((r) => r.id === t.revisionId);
  return rcaVide(nouvelId('RCA'), prochainCode(d, today.slice(0, 4)), animateur, today, {
    titre: `${t.code} ${t.description}${t.statut === 'BLOQUE' ? ' — bloqué' : ' — en retard'}`,
    revisionId: t.revisionId,
    ligneId: rev?.ligneId,
    machineId: t.machineId,
    source: { type: 'TRAVAIL', id: t.id },
    probleme: { quoi: t.description, ou: `Ligne ${rev ? codeLigne(d, rev.ligneId) : '—'}${t.machineId ? ` — ${codeMachine(d, t.machineId)}` : ''}`, quand: today, qui: t.responsable, comment: t.motifBlocage ?? '', combien: '', pourquoi: 'Impact sur la fin de révision', attendu: `Travail réalisé en ${t.dureePrevueJours} j`, observe: '' },
  });
}

/** Bouton « Lancer une RCA » réutilisable (incident, travail). */
export function BoutonRca({ creer, libelle = 'RCA' }: { creer: (d: Donnees, animateur: string, today: string) => Rca; libelle?: string }) {
  const { d, user, today, modifier, peut, toast } = useStore();
  if (!peut('RCA')) return null;
  return (
    <button
      className="btn sm"
      title="Lancer une analyse de causes racines"
      onClick={() => {
        const r = creer(d, user.nom, today);
        modifier({ entite: 'RCA', entiteId: r.id, revisionId: r.revisionId, action: 'CREATION', detail: `${r.code} — ${r.titre}` }, (dr) => {
          dr.rca = [...(dr.rca ?? []), r];
        });
        toast(`${r.code} créée`);
        aller(`rca/${r.id}`);
      }}
    >
      🔍 {libelle}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Liste                                                               */
/* ------------------------------------------------------------------ */

export default function RcaPage({ id, vue }: { id?: string; vue?: string }) {
  const { d } = useStore();
  if (id) {
    const r = (d.rca ?? []).find((x) => x.id === id);
    if (!r) return <Vide>RCA introuvable.</Vide>;
    return vue === 'a3' ? <FicheA3 r={r} /> : <Editeur r={r} />;
  }
  return <Liste />;
}

function Liste() {
  const { d, visible, peut, user, today, modifier } = useStore();
  const liste = (d.rca ?? []).filter((r) => !r.ligneId || visible(r.ligneId)).sort((a, b) => b.dateCreation.localeCompare(a.dateCreation));
  const incidentsSansRca = d.incidents.filter((i) => !(d.rca ?? []).some((r) => r.source.id === i.id) && visible(d.revisions.find((r) => r.id === i.revisionId)?.ligneId ?? ''));
  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Analyses de causes racines (RCA)</h1>
          <div className="sub">Méthode guidée en 12 étapes, du déclenchement à la capitalisation, avec fiche A3 imprimable.</div>
        </div>
        <div className="grow" />
        {peut('RCA') && (
          <button
            className="btn primary"
            onClick={() => {
              const r = rcaVide(nouvelId('RCA'), prochainCode(d, today.slice(0, 4)), user.nom, today, { titre: 'Nouvelle analyse' });
              modifier({ entite: 'RCA', entiteId: r.id, action: 'CREATION', detail: `${r.code} — analyse libre` }, (dr) => {
                dr.rca = [...(dr.rca ?? []), r];
              });
              aller(`rca/${r.id}`);
            }}
          >
            + Nouvelle RCA
          </button>
        )}
      </div>
      <Card tight>
        {liste.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Code</th>
                  <th>Sujet</th>
                  <th>Ligne / machine</th>
                  <th>Origine</th>
                  <th>Animateur</th>
                  <th>Créée le</th>
                  <th style={{ minWidth: 120 }}>Avancement</th>
                  <th>Causes racines</th>
                  <th>Actions</th>
                  <th>Statut</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {liste.map((r) => {
                  const av = avancementRca(r);
                  return (
                    <tr key={r.id} className="click" onClick={() => aller(`rca/${r.id}`)}>
                      <td className="b nowrap">{r.code}</td>
                      <td>{r.titre || <span className="muted">—</span>}</td>
                      <td className="nowrap">
                        {r.ligneId ? codeLigne(d, r.ligneId) : '—'} {r.machineId ? `· ${codeMachine(d, r.machineId)}` : ''}
                      </td>
                      <td className="small">{r.source.type === 'INCIDENT' ? 'Incident de redémarrage' : r.source.type === 'TRAVAIL' ? 'Travail' : 'Libre'}</td>
                      <td>{r.animateur}</td>
                      <td className="nowrap">{fmt(r.dateCreation)}</td>
                      <td>
                        <div className="row" style={{ flexWrap: 'nowrap' }}>
                          <Prog v={av} />
                          <span className="small">{av}%</span>
                        </div>
                      </td>
                      <td className="num">{causesRacines(r).length}</td>
                      <td className="num">
                        {r.actions.filter((a) => a.faite).length}/{r.actions.length}
                      </td>
                      <td>
                        <span className={`badge ${r.statut === 'CLOTUREE' ? 'ok' : 'info'}`}>{r.statut === 'CLOTUREE' ? 'Clôturée' : `Étape ${r.etape}/12`}</span>
                      </td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <Lien to={`rca/${r.id}/a3`}>Fiche A3</Lien>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <Vide>Aucune RCA. Lancez-en une depuis un incident de redémarrage, un travail bloqué, ou avec « + Nouvelle RCA ».</Vide>
        )}
      </Card>
      {incidentsSansRca.length > 0 && (
        <Card titre="Incidents de redémarrage sans RCA" tight>
          <table className="tbl">
            <tbody>
              {incidentsSansRca.map((i) => (
                <tr key={i.id}>
                  <td className="nowrap">{fmt(i.date)}</td>
                  <td>{d.revisions.find((r) => r.id === i.revisionId)?.code}</td>
                  <td className="b">{i.probleme}</td>
                  <td className="small">+{i.dureeSupH} h · impact {i.impact.toLowerCase()}</td>
                  <td className="right">
                    <BoutonRca creer={(dd, an, t) => rcaDepuisIncident(dd, i, an, t)} libelle="Lancer une RCA" />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Éditeur guidé                                                       */
/* ------------------------------------------------------------------ */

function Editeur({ r: initial }: { r: Rca }) {
  const { d, peut, modifier, toast, today } = useStore();
  const [r, setR] = useState<Rca>(initial);
  const [sale, setSale] = useState(false);
  const [etape, setEtape] = useState(initial.etape);
  useEffect(() => {
    setR(initial);
    setSale(false);
  }, [initial]);
  const ed = peut('RCA', r.ligneId) && r.statut !== 'CLOTUREE';
  const maj = (fn: (x: Rca) => void) => {
    if (!ed) return;
    const c = structuredClone(r);
    fn(c);
    setR(c);
    setSale(true);
  };
  const enregistrer = (versEtape?: number) => {
    const cible = versEtape ?? etape;
    if (sale || cible !== initial.etape) {
      if (ed) {
        modifier({ entite: 'RCA', entiteId: r.id, revisionId: r.revisionId, action: 'MODIFICATION', detail: `${r.code} — étape ${etape} « ${ETAPES_RCA[etape - 1].titre} »` }, (dr) => {
          dr.rca = (dr.rca ?? []).map((x) => (x.id === r.id ? { ...r, etape: cible } : x));
        });
      }
      setSale(false);
    }
    setEtape(cible);
  };
  const def = ETAPES_RCA[etape - 1];
  const ctrl = controlerEtape(r, etape);
  const controles = useMemo(() => ETAPES_RCA.map((e) => controlerEtape(r, e.n)), [r]);
  const av = Math.round((controles.filter((c) => c.complete).length / 12) * 100);
  const toutComplet = controles.every((c) => c.complete);
  const rex = r.revisionId ? d.rex.find((x) => x.revisionId === r.revisionId) : undefined;

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <div className="small muted">
            <Lien to="rca">RCA</Lien> › {r.code}
            {r.revisionId && (
              <>
                {' '}
                · <Lien to={`revision/${r.revisionId}`}>{d.revisions.find((x) => x.id === r.revisionId)?.code}</Lien>
              </>
            )}
          </div>
          {ed ? (
            <input className="titre-edit" type="text" value={r.titre} onChange={(e) => maj((x) => (x.titre = e.target.value))} aria-label="Titre de la RCA" placeholder="Sujet de l'analyse" />
          ) : (
            <h1>{r.titre}</h1>
          )}
          <div className="row small muted" style={{ marginTop: 4 }}>
            <span className={`badge ${r.statut === 'CLOTUREE' ? 'ok' : 'info'}`}>{r.statut === 'CLOTUREE' ? 'Clôturée' : 'En cours'}</span>
            Animateur : {r.animateur} · créée le {fmt(r.dateCreation)}
            {!ed && r.statut !== 'CLOTUREE' && <span className="badge">👁 Lecture seule</span>}
          </div>
        </div>
        <div className="grow" />
        {sale && <span className="small act-txt">Modifications non enregistrées</span>}
        {ed && (
          <button className="btn" disabled={!sale} onClick={() => (enregistrer(), toast('RCA enregistrée'))}>
            Enregistrer
          </button>
        )}
        <button className="btn primary" onClick={() => (sale && enregistrer(), aller(`rca/${r.id}/a3`))}>
          Fiche A3
        </button>
      </div>

      <div className="rca-layout">
        <nav className="card rca-steps" aria-label="Étapes de la RCA">
          <div className="card-b" style={{ paddingBottom: 6 }}>
            <div className="row small" style={{ flexWrap: 'nowrap' }}>
              <span className="muted">Avancement</span>
              <div className="grow">
                <Prog v={av} />
              </div>
              <b>{av}%</b>
            </div>
          </div>
          {ETAPES_RCA.map((e, k) => (
            <button key={e.n} className={`rca-step ${e.n === etape ? 'on' : ''}`} onClick={() => enregistrer(e.n)}>
              <span className={`rca-num ${controles[k].complete ? 'ok' : ''}`}>{controles[k].complete ? '✓' : e.n}</span>
              <span>{e.titre}</span>
            </button>
          ))}
        </nav>

        <div className="stack" style={{ minWidth: 0 }}>
          <Card
            titre={
              <span className="row">
                <span className="rca-num big">{etape}</span>
                <h2>{def.titre}</h2>
              </span>
            }
          >
            <div className="grid g2" style={{ marginBottom: 14 }}>
              <div className="alert INFO small">
                <div>
                  <b>Pourquoi cette étape compte</b>
                  <div>{def.pourquoi}</div>
                </div>
              </div>
              <div className="alert VIGILANCE small">
                <div>
                  <b>Erreur classique à éviter</b>
                  <div>{def.erreur}</div>
                </div>
              </div>
            </div>
            <fieldset disabled={!ed} className="rca-fs">
              <FormEtape n={etape} r={r} maj={maj} today={today} />
            </fieldset>
            {(ctrl.manques.length > 0 || ctrl.conseils.length > 0) && (
              <div className="col" style={{ marginTop: 14 }}>
                {ctrl.manques.map((m) => (
                  <div key={m} className="small crit-txt">
                    ✗ {m}
                  </div>
                ))}
                {ctrl.conseils.map((m) => (
                  <div key={m} className="small act-txt">
                    ⚠ {m}
                  </div>
                ))}
              </div>
            )}
            {ctrl.complete && <div className="small ok-txt" style={{ marginTop: 14 }}>✓ Étape complète.</div>}
            <div className="row" style={{ marginTop: 16, justifyContent: 'space-between' }}>
              <button className="btn" disabled={etape === 1} onClick={() => enregistrer(etape - 1)}>
                ← Étape précédente
              </button>
              {etape < 12 ? (
                <button className="btn primary" onClick={() => enregistrer(etape + 1)}>
                  Étape suivante →
                </button>
              ) : (
                ed && (
                  <div className="row">
                    {r.revisionId && (
                      <button
                        className="btn"
                        disabled={!rex || r.capitalisation.rex}
                        title={!rex ? 'Pas encore de REX pour cette révision' : ''}
                        onClick={() => {
                          const racines = causesRacines(r);
                          maj((x) => (x.capitalisation.rex = true));
                          modifier({ entite: 'REX', entiteId: rex!.id, revisionId: r.revisionId, action: 'LECONS_RCA', detail: `${racines.length} leçon(s) issues de ${r.code}` }, (dr) => {
                            const x = dr.rex.find((y) => y.id === rex!.id)!;
                            for (const b of racines) {
                              const act = r.actions.filter((a) => a.brancheId === b.id).map((a) => a.texte).join(' ; ');
                              x.lecons.push({ id: nouvelId('LEC'), domaine: 'REDEMARRAGE', lecon: `${r.code} : ${b.niveaux.at(-1)?.texte ?? ''}`, actionProchaineRevision: act || 'Voir fiche RCA', responsable: 'MAINTENANCE', integree: false });
                            }
                            dr.rca = (dr.rca ?? []).map((y) => (y.id === r.id ? { ...r, capitalisation: { ...r.capitalisation, rex: true } } : y));
                          });
                          setSale(false);
                          toast('Leçons ajoutées au REX de la révision');
                        }}
                      >
                        {r.capitalisation.rex ? '✓ Leçons dans le REX' : 'Pousser les leçons dans le REX'}
                      </button>
                    )}
                    <button
                      className="btn primary"
                      disabled={!toutComplet}
                      title={toutComplet ? '' : 'Toutes les étapes doivent être complètes'}
                      onClick={() => {
                        modifier({ entite: 'RCA', entiteId: r.id, revisionId: r.revisionId, action: 'CLOTURE', detail: `${r.code} clôturée` }, (dr) => {
                          dr.rca = (dr.rca ?? []).map((x) => (x.id === r.id ? { ...r, statut: 'CLOTUREE', etape: 12 } : x));
                        });
                        toast(`${r.code} clôturée`);
                      }}
                    >
                      Clôturer la RCA
                    </button>
                  </div>
                )
              )}
            </div>
          </Card>
          <Qualite r={r} />
        </div>
      </div>
    </div>
  );
}

function Qualite({ r }: { r: Rca }) {
  const q = qualiteAnalyse(r);
  return (
    <Card titre="Retour d'expérience sur la qualité de l'analyse" sub="Calculé en continu à partir de ce qui est saisi.">
      <div className="grid g3">
        {q.map((x) => (
          <div key={x.titre} className={`alert ${x.note === 'BON' ? 'OK' : x.note === 'MOYEN' ? 'VIGILANCE' : 'CRITIQUE'} small`}>
            <div>
              <b>
                {x.titre} — {x.note === 'BON' ? 'solide' : x.note === 'MOYEN' ? 'à renforcer' : 'insuffisant'}
              </b>
              <div>{x.texte}</div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/* Formulaires par étape                                               */
/* ------------------------------------------------------------------ */

function Liste2<T extends { id: string }>({ items, rendu, ajouter, retirer, libelleAjout }: { items: T[]; rendu: (x: T, k: number) => ReactNode; ajouter: () => void; retirer: (id: string) => void; libelleAjout: string }) {
  return (
    <div className="col">
      {items.map((x, k) => (
        <div key={x.id} className="rca-ligne">
          <div className="grow" style={{ minWidth: 0 }}>
            {rendu(x, k)}
          </div>
          <button className="btn ghost sm" onClick={() => retirer(x.id)} aria-label="Retirer">
            ✕
          </button>
        </div>
      ))}
      <div>
        <button className="btn sm" onClick={ajouter}>
          + {libelleAjout}
        </button>
      </div>
    </div>
  );
}

const ROLES_EQUIPE = ['Production', 'Maintenance', 'Méthodes (BMC)', 'Qualité', 'Fournisseur', 'HSE', 'Magasin', 'Achats'];

function FormEtape({ n, r, maj, today }: { n: number; r: Rca; maj: (fn: (x: Rca) => void) => void; today: string }) {
  const { d } = useStore();
  switch (n) {
    case 1:
      return (
        <div className="stack">
          <div>
            <div className="small b" style={{ marginBottom: 6 }}>
              La panne justifie-t-elle une RCA ?
            </div>
            <div className="chip-row">
              {(Object.keys(CRITERES_DECLENCHEMENT) as CritereDeclenchement[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  className={`chip ${r.declenchement.criteres.includes(c) ? 'on' : ''}`}
                  onClick={() => maj((x) => (x.declenchement.criteres = x.declenchement.criteres.includes(c) ? x.declenchement.criteres.filter((y) => y !== c) : [...x.declenchement.criteres, c]))}
                >
                  {CRITERES_DECLENCHEMENT[c]}
                </button>
              ))}
            </div>
          </div>
          <div className="form">
            <Champ label="Niveau d'analyse" req>
              <select value={r.declenchement.niveau} onChange={(e) => maj((x) => (x.declenchement.niveau = e.target.value as NiveauRca))}>
                <option value="N1">N1 — 5 pourquoi rapide (équipe de terrain, 1 h)</option>
                <option value="N2">N2 — RCA complète en équipe pluridisciplinaire</option>
                <option value="N3">N3 — RCA + expertise externe (laboratoire, fournisseur)</option>
              </select>
            </Champ>
            <Champ label="Justification" req full>
              <textarea value={r.declenchement.justification} onChange={(e) => maj((x) => (x.declenchement.justification = e.target.value))} placeholder="Ex. : 3e occurrence en 6 mois, 6 h d'arrêt, équipement critique qualité" />
            </Champ>
          </div>
        </div>
      );
    case 2: {
      const ch = (k: keyof Rca['probleme'], label: string, ph: string, full = false, req = true) => (
        <Champ label={label} req={req} full={full}>
          <textarea rows={2} value={r.probleme[k]} onChange={(e) => maj((x) => (x.probleme[k] = e.target.value))} placeholder={ph} />
        </Champ>
      );
      return (
        <div className="form">
          {ch('quoi', 'Quoi ? (le phénomène)', 'Ex. : UP < 15 sur la zone 3', true)}
          {ch('ou', 'Où ?', 'Ligne, machine, organe, position')}
          {ch('quand', 'Quand ?', 'Date, heure, phase (démarrage, régime…)')}
          {ch('qui', 'Qui l\'a détecté ?', 'Fonction, pas un coupable', false, false)}
          {ch('comment', 'Comment s\'est-il manifesté ?', 'Symptômes observables, mesures')}
          {ch('combien', 'Combien ?', 'Heures d\'arrêt, pièces, coût, occurrences')}
          {ch('pourquoi', 'Pourquoi est-ce un problème ?', 'Enjeu : sécurité, qualité, production, coût', false, false)}
          {ch('attendu', 'Attendu (standard)', 'Valeur ou état normal attendu')}
          {ch('observe', 'Observé (écart)', 'Valeur ou état réellement constaté')}
          {(r.probleme.attendu || r.probleme.observe) && (
            <div className="alert INFO small full">
              <span>
                <b>Énoncé :</b> {r.probleme.quoi || '…'} — {r.probleme.ou || '…'}, {r.probleme.quand || '…'}. Attendu : {r.probleme.attendu || '…'} ; observé : {r.probleme.observe || '…'} ({r.probleme.combien || '…'}).
              </span>
            </div>
          )}
        </div>
      );
    }
    case 3:
      return (
        <Liste2
          items={r.confinement}
          libelleAjout="Action de confinement"
          ajouter={() => maj((x) => x.confinement.push({ id: nouvelId('c'), texte: '', date: today, faite: false }))}
          retirer={(id) => maj((x) => (x.confinement = x.confinement.filter((y) => y.id !== id)))}
          rendu={(c, k) => (
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input type="text" value={c.texte} placeholder="Ex. : isoler les produits, contrôle renforcé, pièce de secours montée" onChange={(e) => maj((x) => (x.confinement[k].texte = e.target.value))} />
              <input type="date" value={c.date} style={{ width: 150 }} onChange={(e) => maj((x) => (x.confinement[k].date = e.target.value))} />
              <label className="row small nowrap">
                <input type="checkbox" checked={c.faite} onChange={(e) => maj((x) => (x.confinement[k].faite = e.target.checked))} /> Fait
              </label>
            </div>
          )}
        />
      );
    case 4: {
      const presents = r.equipe.map((e) => e.role);
      return (
        <div className="stack">
          <Liste2
            items={r.equipe}
            libelleAjout="Membre"
            ajouter={() => maj((x) => x.equipe.push({ id: nouvelId('e'), role: '', nom: '' }))}
            retirer={(id) => maj((x) => (x.equipe = x.equipe.filter((y) => y.id !== id)))}
            rendu={(m, k) => (
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <input type="text" list="roles-equipe" value={m.role} placeholder="Rôle" style={{ maxWidth: 200 }} onChange={(e) => maj((x) => (x.equipe[k].role = e.target.value))} />
                <input type="text" list="noms-equipe" value={m.nom} placeholder="Nom" onChange={(e) => maj((x) => (x.equipe[k].nom = e.target.value))} />
              </div>
            )}
          />
          <datalist id="roles-equipe">
            {ROLES_EQUIPE.map((x) => (
              <option key={x} value={x} />
            ))}
          </datalist>
          <datalist id="noms-equipe">
            {d.utilisateurs.map((u) => (
              <option key={u.id} value={u.nom} />
            ))}
          </datalist>
          <div className="row small">
            <span className="muted">Ajout rapide :</span>
            {ROLES_EQUIPE.slice(0, 5)
              .filter((x) => !presents.includes(x))
              .map((x) => (
                <button key={x} type="button" className="chip" onClick={() => maj((y) => y.equipe.push({ id: nouvelId('e'), role: x, nom: '' }))}>
                  + {x}
                </button>
              ))}
          </div>
        </div>
      );
    }
    case 5: {
      const p = (k: 'parts' | 'position' | 'people' | 'paper', label: string, ph: string) => (
        <Champ label={label} req>
          <textarea rows={3} value={r.preuves[k]} placeholder={ph} onChange={(e) => maj((x) => (x.preuves[k] = e.target.value))} />
        </Champ>
      );
      return (
        <div className="form">
          {p('parts', 'Parts — pièces', 'Pièces défaillantes, faciès, débris, lubrifiant, état des organes voisins')}
          {p('position', 'Position', 'Où et comment étaient les pièces, réglages, positions, photos avant démontage')}
          {p('people', 'People — témoignages', 'Opérateurs, techniciens, prestataire : ce qu\'ils ont vu, entendu, fait')}
          {p('paper', 'Paper — documents et données', 'Historique DIMOMAINT (OT, pannes antérieures), paramètres process, procédures, certificats')}
          <label className="row full small">
            <input type="checkbox" checked={r.preuves.piecesPreservees} onChange={(e) => maj((x) => (x.preuves.piecesPreservees = e.target.checked))} />
            <b>Pièces défaillantes préservées</b> (étiquetées, non nettoyées, stockées pour expertise)
          </label>
        </div>
      );
    }
    case 6: {
      const tri = [...r.chronologie].sort((a, b) => `${a.date}${a.heure}`.localeCompare(`${b.date}${b.heure}`));
      return (
        <Liste2
          items={tri}
          libelleAjout="Événement"
          ajouter={() => maj((x) => x.chronologie.push({ id: nouvelId('h'), date: today, heure: '', evenement: '' }))}
          retirer={(id) => maj((x) => (x.chronologie = x.chronologie.filter((y) => y.id !== id)))}
          rendu={(h) => {
            const k = r.chronologie.findIndex((y) => y.id === h.id);
            return (
              <div className="row" style={{ flexWrap: 'nowrap' }}>
                <input type="date" value={h.date} style={{ width: 150 }} onChange={(e) => maj((x) => (x.chronologie[k].date = e.target.value))} />
                <input type="time" value={h.heure} style={{ width: 110 }} onChange={(e) => maj((x) => (x.chronologie[k].heure = e.target.value))} />
                <input type="text" value={h.evenement} placeholder="Ce qui s'est passé (fait observable)" onChange={(e) => maj((x) => (x.chronologie[k].evenement = e.target.value))} />
              </div>
            );
          }}
        />
      );
    }
    case 7:
      return (
        <div className="form">
          <Champ label="Mécanisme" req>
            <select value={r.mecanisme.type} onChange={(e) => maj((x) => (x.mecanisme.type = e.target.value as Mecanisme))}>
              {(Object.keys(MECANISMES) as Mecanisme[]).map((m) => (
                <option key={m} value={m}>
                  {MECANISMES[m]}
                </option>
              ))}
            </select>
          </Champ>
          <Champ label="Description du mécanisme" full>
            <textarea value={r.mecanisme.description} onChange={(e) => maj((x) => (x.mecanisme.description = e.target.value))} placeholder="Ex. : fatigue en flexion rotative, amorce en fond de gorge, propagation sur 70 % de la section" />
          </Champ>
          <Champ label="Preuve (faciès, mesure, expertise)" req full>
            <textarea value={r.mecanisme.preuve} onChange={(e) => maj((x) => (x.mecanisme.preuve = e.target.value))} placeholder="Ex. : lignes de plage visibles, rupture finale ductile, rapport de laboratoire n°…" />
          </Champ>
        </div>
      );
    case 8:
      return <Ishikawa r={r} maj={maj} />;
    case 9:
      return <Pourquoi r={r} maj={maj} />;
    case 10:
      return <Actions r={r} maj={maj} today={today} />;
    case 11:
      return (
        <div className="form">
          <Champ label="Indicateur d'efficacité" req full>
            <input type="text" value={r.verification.indicateur} onChange={(e) => maj((x) => (x.verification.indicateur = e.target.value))} placeholder="Ex. : nombre de récidives, MTBF de l'organe, écart de mesure au redémarrage" />
          </Champ>
          <Champ label="Critère de réussite">
            <input type="text" value={r.verification.critere} onChange={(e) => maj((x) => (x.verification.critere = e.target.value))} />
          </Champ>
          <Champ label="MTBF de référence (j)">
            <input type="number" min={1} value={r.verification.mtbfJours} onChange={(e) => maj((x) => (x.verification.mtbfJours = Number(e.target.value)))} />
          </Champ>
          <Champ label="Date de contrôle" req>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <input type="date" value={r.verification.dateControle} onChange={(e) => maj((x) => (x.verification.dateControle = e.target.value))} />
              <button type="button" className="btn sm nowrap" onClick={() => maj((x) => (x.verification.dateControle = addDays(x.dateCreation, x.verification.mtbfJours * 3)))}>
                = 3 × MTBF
              </button>
            </div>
          </Champ>
          <Champ label="Résultat">
            <select value={r.verification.resultat ?? ''} onChange={(e) => maj((x) => (x.verification.resultat = (e.target.value || undefined) as Rca['verification']['resultat']))}>
              <option value="">À contrôler</option>
              <option value="EFFICACE">Efficace</option>
              <option value="NON_EFFICACE">Non efficace — relancer</option>
            </select>
          </Champ>
          <Champ label="Commentaire" full>
            <textarea value={r.verification.commentaire} onChange={(e) => maj((x) => (x.verification.commentaire = e.target.value))} />
          </Champ>
        </div>
      );
    case 12:
      return (
        <div className="form">
          <Champ label="Mise à jour du plan de maintenance" req full>
            <textarea value={r.capitalisation.planMaintenance} onChange={(e) => maj((x) => (x.capitalisation.planMaintenance = e.target.value))} placeholder="Gamme, périodicité, contrôle ajouté ou modifié" />
          </Champ>
          <Champ label="Mise à jour de l'AMDEC" req full>
            <textarea value={r.capitalisation.amdec} onChange={(e) => maj((x) => (x.capitalisation.amdec = e.target.value))} placeholder="Mode de défaillance, G / O / D révisés" />
          </Champ>
          <Champ label="Codes défaillance DIMOMAINT" req full>
            <textarea value={r.capitalisation.codesDimomaint} onChange={(e) => maj((x) => (x.capitalisation.codesDimomaint = e.target.value))} placeholder="Code créé ou corrigé (symptôme / cause / remède)" />
          </Champ>
        </div>
      );
  }
  return null;
}

const STATUTS_H: Record<StatutHypothese, string> = { A_VERIFIER: 'À vérifier', CONFIRMEE: 'Confirmée', ECARTEE: 'Écartée' };

function Ishikawa({ r, maj }: { r: Rca; maj: (fn: (x: Rca) => void) => void }) {
  return (
    <div className="stack">
      <div className="fishbone">
        {(Object.keys(FAMILLES_6M) as Famille6M[]).map((f) => {
          const hs = r.ishikawa.filter((h) => h.famille === f);
          return (
            <div key={f} className="fish-fam">
              <div className="row" style={{ justifyContent: 'space-between' }}>
                <b>{FAMILLES_6M[f].libelle}</b>
                <button type="button" className="btn sm ghost" onClick={() => maj((x) => x.ishikawa.push({ id: nouvelId('i'), famille: f, texte: '', statut: 'A_VERIFIER', preuve: '' }))}>
                  + hypothèse
                </button>
              </div>
              <div className="tiny muted" style={{ marginBottom: 6 }}>
                {FAMILLES_6M[f].aide}
              </div>
              {hs.map((h) => {
                const k = r.ishikawa.findIndex((y) => y.id === h.id);
                return (
                  <div key={h.id} className={`hyp ${h.statut}`}>
                    <div className="row" style={{ flexWrap: 'nowrap' }}>
                      <input type="text" value={h.texte} placeholder="Hypothèse" onChange={(e) => maj((x) => (x.ishikawa[k].texte = e.target.value))} />
                      <button type="button" className="btn ghost sm" onClick={() => maj((x) => (x.ishikawa = x.ishikawa.filter((y) => y.id !== h.id)))} aria-label="Retirer">
                        ✕
                      </button>
                    </div>
                    <div className="hyp-ligne2">
                      <select value={h.statut} onChange={(e) => maj((x) => (x.ishikawa[k].statut = e.target.value as StatutHypothese))}>
                        {(Object.keys(STATUTS_H) as StatutHypothese[]).map((s) => (
                          <option key={s} value={s}>
                            {STATUTS_H[s]}
                          </option>
                        ))}
                      </select>
                      <input type="text" value={h.preuve} placeholder="Preuve qui confirme ou écarte" onChange={(e) => maj((x) => (x.ishikawa[k].preuve = e.target.value))} />
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })}
        <div className="fish-head">
          <span className="tiny muted">Effet</span>
          <b>{r.probleme.quoi || r.titre || 'Problème'}</b>
        </div>
      </div>
    </div>
  );
}

function Pourquoi({ r, maj }: { r: Rca; maj: (fn: (x: Rca) => void) => void }) {
  const confirmees = r.ishikawa.filter((h) => h.statut === 'CONFIRMEE');
  const libres = confirmees.filter((h) => !r.branches.some((b) => b.hypotheseId === h.id));
  const nouvelle = (texte: string, hypotheseId?: string): BranchePourquoi => ({ id: nouvelId('b'), hypotheseId, typeCause: 'PHYSIQUE', racine: false, niveaux: [{ texte, preuve: '', statut: 'A_VERIFIER' }] });
  return (
    <div className="stack">
      <div className="row small">
        <span className="muted">Nouvelle branche depuis une hypothèse confirmée :</span>
        {libres.map((h) => (
          <button key={h.id} type="button" className="chip" onClick={() => maj((x) => x.branches.push({ ...nouvelle(h.texte, h.id), niveaux: [{ texte: h.texte, preuve: h.preuve, statut: 'CONFIRMEE' }] }))}>
            + {h.texte || FAMILLES_6M[h.famille].libelle}
          </button>
        ))}
        {!libres.length && <span className="muted">{confirmees.length ? 'toutes utilisées' : 'aucune (confirmer des hypothèses à l\'étape 8)'}</span>}
        <button type="button" className="chip" onClick={() => maj((x) => x.branches.push(nouvelle('')))}>
          + branche libre
        </button>
      </div>
      {r.branches.map((b, bi) => (
        <div key={b.id} className={`branche ${b.racine ? 'racine' : ''}`}>
          <div className="row" style={{ marginBottom: 8 }}>
            <b>Branche {bi + 1}</b>
            <span className="grow" />
            <label className="row small">
              Nature de la cause finale :
              <select value={b.typeCause} style={{ width: 'auto' }} onChange={(e) => maj((x) => (x.branches[bi].typeCause = e.target.value as TypeCause))}>
                {(Object.keys(TYPES_CAUSE) as TypeCause[]).map((t) => (
                  <option key={t} value={t}>
                    {TYPES_CAUSE[t].libelle} — {TYPES_CAUSE[t].aide}
                  </option>
                ))}
              </select>
            </label>
            <label className="row small">
              <input type="checkbox" checked={b.racine} onChange={(e) => maj((x) => (x.branches[bi].racine = e.target.checked))} /> <b>Cause racine</b>
            </label>
            <button type="button" className="btn ghost sm" onClick={() => maj((x) => (x.branches = x.branches.filter((y) => y.id !== b.id)))} aria-label="Retirer la branche">
              ✕
            </button>
          </div>
          <div className="col" style={{ gap: 4 }}>
            {b.niveaux.map((nv, ni) => (
              <div key={ni}>
                {ni > 0 && <div className="pq-fleche">↓ pourquoi ?</div>}
                <div className={`hyp ${nv.statut}`}>
                  <div className="row" style={{ flexWrap: 'nowrap' }}>
                    <span className="tiny b nowrap" style={{ width: 70 }}>
                      {ni === 0 ? 'Constat' : `Pourquoi ${ni}`}
                    </span>
                    <input type="text" value={nv.texte} placeholder={ni === 0 ? 'Cause physique constatée' : 'Parce que…'} onChange={(e) => maj((x) => (x.branches[bi].niveaux[ni].texte = e.target.value))} />
                    {ni > 0 && (
                      <button type="button" className="btn ghost sm" onClick={() => maj((x) => x.branches[bi].niveaux.splice(ni, 1))} aria-label="Retirer">
                        ✕
                      </button>
                    )}
                  </div>
                  <div className="row" style={{ flexWrap: 'nowrap', marginTop: 4 }}>
                    <span style={{ width: 70 }} />
                    <select value={nv.statut} style={{ width: 140 }} onChange={(e) => maj((x) => (x.branches[bi].niveaux[ni].statut = e.target.value as StatutHypothese))}>
                      {(Object.keys(STATUTS_H) as StatutHypothese[]).map((s) => (
                        <option key={s} value={s}>
                          {STATUTS_H[s]}
                        </option>
                      ))}
                    </select>
                    <input type="text" value={nv.preuve} placeholder="Preuve" onChange={(e) => maj((x) => (x.branches[bi].niveaux[ni].preuve = e.target.value))} />
                  </div>
                </div>
              </div>
            ))}
            <div>
              <button type="button" className="btn sm" onClick={() => maj((x) => x.branches[bi].niveaux.push({ texte: '', preuve: '', statut: 'A_VERIFIER' }))}>
                + Pourquoi ?
              </button>
            </div>
          </div>
        </div>
      ))}
      <p className="tiny muted">Descendre jusqu'à la cause latente : physique (ce qui a cassé) → humaine (le geste ou la décision) → latente (pourquoi l'organisation, la procédure, la formation ou la conception l'ont permis).</p>
    </div>
  );
}

function Actions({ r, maj, today }: { r: Rca; maj: (fn: (x: Rca) => void) => void; today: string }) {
  const racines = causesRacines(r);
  const nouvelle = (brancheId?: string): ActionRca => ({ id: nouvelId('a'), texte: '', brancheId, hierarchie: 'PROCEDURE', responsable: 'MAINTENANCE', porteur: '', echeance: addDays(today, 30), indicateur: '', faite: false });
  return (
    <div className="stack">
      {racines.length > 0 && (
        <div className="col small">
          {racines.map((b) => {
            const n = r.actions.filter((a) => a.brancheId === b.id).length;
            return (
              <div key={b.id} className="row">
                <span className={`badge ${b.typeCause === 'LATENTE' ? 'act' : ''}`}>{TYPES_CAUSE[b.typeCause].libelle}</span>
                <span className="grow">{b.niveaux.at(-1)?.texte}</span>
                <span className={n ? 'ok-txt' : 'crit-txt'}>{n} action(s)</span>
                <button type="button" className="btn sm" onClick={() => maj((x) => x.actions.push(nouvelle(b.id)))}>
                  + action
                </button>
              </div>
            );
          })}
        </div>
      )}
      {r.actions.map((a, k) => (
        <div key={a.id} className="action-rca">
          <div className="form">
            <Champ label="Action (verbe + objet + résultat attendu)" req full>
              <input type="text" value={a.texte} onChange={(e) => maj((x) => (x.actions[k].texte = e.target.value))} />
            </Champ>
            <Champ label="Cause traitée">
              <select value={a.brancheId ?? ''} onChange={(e) => maj((x) => (x.actions[k].brancheId = e.target.value || undefined))}>
                <option value="">—</option>
                {r.branches.map((b, bi) => (
                  <option key={b.id} value={b.id}>
                    Branche {bi + 1} : {b.niveaux.at(-1)?.texte?.slice(0, 50)}
                  </option>
                ))}
              </select>
            </Champ>
            <Champ label="Type d'action">
              <select value={a.hierarchie} onChange={(e) => maj((x) => (x.actions[k].hierarchie = e.target.value as Hierarchie))}>
                {(Object.keys(HIERARCHIE) as Hierarchie[]).map((h) => (
                  <option key={h} value={h}>
                    {'★'.repeat(HIERARCHIE[h].force)} {HIERARCHIE[h].libelle}
                  </option>
                ))}
              </select>
            </Champ>
            <Champ label="Responsable (fonction)" req>
              <select value={a.responsable} onChange={(e) => maj((x) => (x.actions[k].responsable = e.target.value as Role))}>
                {ORDRE_ROLES.filter((x) => x !== 'ADMIN').map((x) => (
                  <option key={x} value={x}>
                    {ROLES[x].court}
                  </option>
                ))}
              </select>
            </Champ>
            <Champ label="Porteur (nom)" req>
              <input type="text" list="noms-equipe" value={a.porteur} onChange={(e) => maj((x) => (x.actions[k].porteur = e.target.value))} />
            </Champ>
            <Champ label="Échéance" req>
              <input type="date" value={a.echeance} onChange={(e) => maj((x) => (x.actions[k].echeance = e.target.value))} />
            </Champ>
            <Champ label="Indicateur de réalisation" req>
              <input type="text" value={a.indicateur} onChange={(e) => maj((x) => (x.actions[k].indicateur = e.target.value))} placeholder="Mesurable" />
            </Champ>
            <label className="row small" style={{ alignSelf: 'end' }}>
              <input type="checkbox" checked={a.faite} onChange={(e) => maj((x) => (x.actions[k].faite = e.target.checked))} /> Réalisée
            </label>
            <div className="right" style={{ alignSelf: 'end' }}>
              <button type="button" className="btn ghost sm" onClick={() => maj((x) => (x.actions = x.actions.filter((y) => y.id !== a.id)))}>
                Retirer
              </button>
            </div>
          </div>
        </div>
      ))}
      <div>
        <button type="button" className="btn sm" onClick={() => maj((x) => x.actions.push(nouvelle()))}>
          + Action
        </button>
      </div>
      <p className="tiny muted">Hiérarchie : ★★★★★ élimination › conception › procédure › surveillance › ★ formation. Au moins une action par cause latente.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Fiche A3                                                            */
/* ------------------------------------------------------------------ */

function FicheA3({ r }: { r: Rca }) {
  const { d } = useStore();
  const rev = r.revisionId ? d.revisions.find((x) => x.id === r.revisionId) : undefined;
  const q = qualiteAnalyse(r);
  const racines = causesRacines(r);
  const p = r.probleme;
  const Bloc = ({ n, titre, children, className }: { n: number; titre: string; children: ReactNode; className?: string }) => (
    <section className={`a3-bloc ${className ?? ''}`}>
      <h3>
        <span className="rca-num">{n}</span> {titre}
      </h3>
      {children}
    </section>
  );
  return (
    <div className="stack">
      <div className="page-head no-print">
        <div>
          <div className="small muted">
            <Lien to="rca">RCA</Lien> › <Lien to={`rca/${r.id}`}>{r.code}</Lien> › Fiche A3
          </div>
          <h1>Fiche A3</h1>
        </div>
        <div className="grow" />
        <button className="btn" onClick={() => aller(`rca/${r.id}`)}>
          ← Retour à l'analyse
        </button>
        <button className="btn primary" onClick={() => window.print()}>
          Imprimer / PDF
        </button>
      </div>
      <article className="a3">
        <header className="a3-head">
          <div>
            <div className="tiny muted">FICHE RCA — {r.code}</div>
            <h2>{r.titre}</h2>
          </div>
          <dl className="kv small">
            <dt>Ligne / machine</dt>
            <dd>
              {r.ligneId ? codeLigne(d, r.ligneId) : '—'} {r.machineId ? `· ${codeMachine(d, r.machineId)}` : ''}
            </dd>
            <dt>Révision</dt>
            <dd>{rev?.code ?? '—'}</dd>
            <dt>Animateur · date</dt>
            <dd>
              {r.animateur} · {fmt(r.dateCreation)}
            </dd>
            <dt>Niveau · statut</dt>
            <dd>
              {r.declenchement.niveau} · {r.statut === 'CLOTUREE' ? 'Clôturée' : 'En cours'}
            </dd>
          </dl>
        </header>
        <div className="a3-grid">
          <div className="a3-col">
            <Bloc n={1} titre="Problème (5W2H)">
              <dl className="kv small">
                <dt>Quoi</dt>
                <dd>{p.quoi}</dd>
                <dt>Où</dt>
                <dd>{p.ou}</dd>
                <dt>Quand</dt>
                <dd>{p.quand}</dd>
                <dt>Détecté par</dt>
                <dd>{p.qui || '—'}</dd>
                <dt>Comment</dt>
                <dd>{p.comment}</dd>
                <dt>Combien</dt>
                <dd>{p.combien}</dd>
              </dl>
              <div className="a3-ecart small">
                <div>
                  <span className="muted">Attendu</span>
                  <b>{p.attendu || '—'}</b>
                </div>
                <div>
                  <span className="muted">Observé</span>
                  <b className="crit-txt">{p.observe || '—'}</b>
                </div>
              </div>
            </Bloc>
            <Bloc n={2} titre="Confinement & équipe">
              <ul className="small a3-ul">
                {r.confinement.map((c) => (
                  <li key={c.id}>
                    {c.faite ? '✓' : '○'} {c.texte} <span className="muted">({fmtCourt(c.date)})</span>
                  </li>
                ))}
              </ul>
              <div className="small" style={{ marginTop: 6 }}>
                <span className="muted">Équipe : </span>
                {r.equipe.map((e) => `${e.nom || '—'} (${e.role})`).join(', ') || '—'}
              </div>
            </Bloc>
            <Bloc n={3} titre="Chronologie">
              <ul className="small a3-ul">
                {[...r.chronologie]
                  .sort((a, b) => `${a.date}${a.heure}`.localeCompare(`${b.date}${b.heure}`))
                  .map((h) => (
                    <li key={h.id}>
                      <b className="nowrap">
                        {fmtCourt(h.date)} {h.heure}
                      </b>{' '}
                      — {h.evenement}
                    </li>
                  ))}
              </ul>
            </Bloc>
            <Bloc n={4} titre="Preuves (4P) & mécanisme">
              <dl className="kv small">
                <dt>Parts</dt>
                <dd>{r.preuves.parts || '—'}</dd>
                <dt>Position</dt>
                <dd>{r.preuves.position || '—'}</dd>
                <dt>People</dt>
                <dd>{r.preuves.people || '—'}</dd>
                <dt>Paper</dt>
                <dd>{r.preuves.paper || '—'}</dd>
                <dt>Mécanisme</dt>
                <dd>
                  <b>{MECANISMES[r.mecanisme.type]}</b> — {r.mecanisme.description} <span className="muted">(preuve : {r.mecanisme.preuve || '—'})</span>
                </dd>
              </dl>
            </Bloc>
          </div>
          <div className="a3-col">
            <Bloc n={5} titre="Ishikawa 6M">
              <div className="a3-6m">
                {(Object.keys(FAMILLES_6M) as Famille6M[]).map((f) => (
                  <div key={f}>
                    <b className="small">{FAMILLES_6M[f].libelle}</b>
                    <ul className="tiny a3-ul">
                      {r.ishikawa
                        .filter((h) => h.famille === f)
                        .map((h) => (
                          <li key={h.id} className={h.statut === 'ECARTEE' ? 'ecartee' : h.statut === 'CONFIRMEE' ? 'confirmee' : ''}>
                            {h.texte}
                          </li>
                        ))}
                    </ul>
                  </div>
                ))}
              </div>
              <div className="tiny muted">Gras : confirmée · barré : écartée par une preuve</div>
            </Bloc>
            <Bloc n={6} titre="Arbre des causes (5 pourquoi)" className="grow-bloc">
              {r.branches.map((b, bi) => (
                <div key={b.id} className="a3-branche">
                  {b.niveaux.map((nv, ni) => (
                    <div key={ni} className={`a3-nv ${ni === b.niveaux.length - 1 && b.racine ? 'racine' : ''}`}>
                      <span className="tiny muted">{ni === 0 ? `B${bi + 1}` : `P${ni}`}</span> {nv.texte}
                    </div>
                  ))}
                </div>
              ))}
            </Bloc>
            <Bloc n={7} titre="Causes racines">
              <ul className="small a3-ul">
                {racines.map((b) => (
                  <li key={b.id}>
                    <span className={`badge ${b.typeCause === 'LATENTE' ? 'act' : ''}`}>{TYPES_CAUSE[b.typeCause].libelle}</span> <b>{b.niveaux.at(-1)?.texte}</b>
                  </li>
                ))}
              </ul>
            </Bloc>
          </div>
          <div className="a3-col">
            <Bloc n={8} titre="Plan d'actions">
              <table className="tbl a3-tbl">
                <colgroup>
                  <col />
                  <col style={{ width: '30%' }} />
                  <col style={{ width: 62 }} />
                  <col style={{ width: 22 }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>Action</th>
                    <th>Qui</th>
                    <th>Quand</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {r.actions.map((a) => (
                    <tr key={a.id}>
                      <td>
                        {a.texte}
                        <div className="tiny muted">
                          {HIERARCHIE[a.hierarchie].libelle} · {a.indicateur}
                        </div>
                      </td>
                      <td className="tiny">
                        <RoleBadge r={a.responsable} /> {a.porteur}
                      </td>
                      <td className="tiny nowrap">{fmtCourt(a.echeance)}</td>
                      <td>{a.faite ? '✓' : '○'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Bloc>
            <Bloc n={9} titre="Vérification d'efficacité">
              <dl className="kv small">
                <dt>Indicateur</dt>
                <dd>{r.verification.indicateur || '—'}</dd>
                <dt>Critère</dt>
                <dd>{r.verification.critere}</dd>
                <dt>Contrôle le</dt>
                <dd>{fmt(r.verification.dateControle)}</dd>
                <dt>Résultat</dt>
                <dd>{r.verification.resultat === 'EFFICACE' ? <span className="badge ok">Efficace</span> : r.verification.resultat === 'NON_EFFICACE' ? <span className="badge crit">Non efficace</span> : <span className="badge">À contrôler</span>}</dd>
              </dl>
            </Bloc>
            <Bloc n={10} titre="Capitalisation">
              <dl className="kv small">
                <dt>Plan de maint.</dt>
                <dd>{r.capitalisation.planMaintenance || '—'}</dd>
                <dt>AMDEC</dt>
                <dd>{r.capitalisation.amdec || '—'}</dd>
                <dt>DIMOMAINT</dt>
                <dd>{r.capitalisation.codesDimomaint || '—'}</dd>
                <dt>REX</dt>
                <dd>{r.capitalisation.rex ? 'Leçons intégrées' : '—'}</dd>
              </dl>
            </Bloc>
            <Bloc n={11} titre="Retour d'expérience sur l'analyse">
              <ol className="small a3-ul" style={{ paddingLeft: 18 }}>
                {q.map((x) => (
                  <li key={x.titre}>
                    <b className={x.note === 'BON' ? 'ok-txt' : x.note === 'MOYEN' ? 'act-txt' : 'crit-txt'}>{x.titre}</b> — {x.texte}
                  </li>
                ))}
              </ol>
            </Bloc>
          </div>
        </div>
      </article>
    </div>
  );
}
