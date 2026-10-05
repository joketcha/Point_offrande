import { useMemo } from 'react';
import { codeLigne, codeMachine } from '../domain/arbo';
import { diffDays, fmtCourt } from '../domain/dates';
import { etatKpi } from '../domain/kpi';
import { indexEtape, ROLES, STATUTS } from '../domain/referentiel';
import { useStore } from '../store/store';
import { Card, EcartBadge, Lien, NiveauBadge, Prog, RisqueItem, RoleBadge, StatutBadge, Tile, Vide, aller } from '../ui/kit';
import { CritBadge } from '../ui/Pdr';

export default function Accueil() {
  const { d, analyses, visible, user, today, mesNotifications, kpis } = useStore();
  const vis = useMemo(() => analyses.filter((a) => visible(a.revision.ligneId)), [analyses, visible]);
  const ouvertes = mesNotifications.filter((n) => n.statut !== 'CLOTUREE' && n.nature === 'RISQUE');
  const crit = ouvertes.filter((n) => n.niveau === 'CRITIQUE');
  const act = ouvertes.filter((n) => n.niveau === 'ACTION');
  const vig = ouvertes.filter((n) => n.niveau === 'VIGILANCE');
  const miennes = ouvertes.filter((n) => n.relation === 'RESPONSABLE' || n.relation === 'ESCALADE');

  const actives = vis.filter((a) => a.revision.statut !== 'ANNULEE');
  const s = (f: (x: (typeof actives)[number]) => boolean) => actives.filter(f).length;
  const phase = (a: (typeof actives)[number]) => STATUTS[a.revision.statut].phase;
  const prochaines = actives
    .filter((a) => phase(a) === 'amont')
    .sort((x, y) => x.revision.datePrevue.localeCompare(y.revision.datePrevue))
    .slice(0, 6);
  const enCours = actives.filter((a) => phase(a) === 'execution' || phase(a) === 'aval');

  const pdrs = actives.flatMap((a) => a.pdrs.filter((x) => !x.pdr.horsGamme).map((x) => ({ ...x, a })));
  const idx = (x: (typeof pdrs)[number]) => indexEtape(x.pdr.etape);
  const pdrCrit = pdrs
    .filter((x) => x.pdr.criticite === 'A' && !x.disponible && phase(x.a) !== 'clos')
    .sort((p, q) => q.ecart - p.ecart)
    .slice(0, 8);
  const transit = pdrs.filter((x) => idx(x) >= indexEtape('CONTENEUR') && idx(x) <= indexEtape('ARRIVEE_ABIDJAN') && !x.pdr.nonConforme);
  const conteneurs = new Set(transit.map((x) => x.pdr.conteneur).filter(Boolean));
  const bateaux = new Set(transit.map((x) => x.pdr.bateau).filter(Boolean));
  const retardsTransit = transit.filter((x) => (x.pdr.eta && x.pdr.etaInitiale && x.pdr.eta > x.pdr.etaInitiale) || (x.pdr.eta && x.pdr.eta < today));
  const its = actives.flatMap((a) => a.interventions.filter((i) => i.intervention.statut !== 'ANNULEE'));
  const trav = actives.flatMap((a) => a.travaux.taches);
  const redem = actives.filter((a) => a.redemarrage.dureeReelleH !== undefined);
  const lignesRisqueRedem = actives.filter((a) => phase(a) !== 'clos' && !a.redemarrageTenable && a.revision.statut !== 'PLANIFIEE');
  const moy = (xs: number[]) => (xs.length ? Math.round((xs.reduce((p, q) => p + q, 0) / xs.length) * 10) / 10 : undefined);

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Pilotage des révisions annuelles</h1>
          <div className="sub">
            {d.sites.map((x) => x.nom).join(' · ')} — vue {ROLES[user.role].libelle} ({user.nom})
          </div>
        </div>
      </div>

      {/* Critique → Action → Risque */}
      <div className="grid g4">
        <Tile lbl="🔴 Critiques" val={crit.length} cls={crit.length ? 'crit' : 'ok'} det="Action immédiate, risque industriel" onClick={() => aller('notifications')} />
        <Tile lbl="🟠 Actions" val={act.length} cls={act.length ? 'act' : 'ok'} det="Action requise" onClick={() => aller('notifications')} />
        <Tile lbl="🟡 Risques à surveiller" val={vig.length} cls={vig.length ? 'vig' : 'ok'} det="Vigilance" onClick={() => aller('risques')} />
        <Tile lbl={`À moi d'agir (${ROLES[user.role].court})`} val={miennes.length} cls={miennes.length ? 'act' : 'ok'} det="Notifications dont je suis responsable" onClick={() => aller('notifications')} />
      </div>

      <div className="grid g2">
        <Card titre="🔴 Critiques — qui doit agir maintenant ?" actions={<Lien to="notifications">Toutes</Lien>} tight>
          {crit.length ? crit.slice(0, 5).map((r) => <RisqueItem key={r.cle} r={r} compact lien={`revision/${r.revisionId}/risques`} />) : <Vide>Aucun risque critique dans votre périmètre.</Vide>}
        </Card>
        <Card titre="🟠 Actions" actions={<Lien to="notifications">Toutes</Lien>} tight>
          {act.length ? act.slice(0, 5).map((r) => <RisqueItem key={r.cle} r={r} compact lien={`revision/${r.revisionId}/risques`} />) : <Vide>Aucune action en attente.</Vide>}
        </Card>
      </div>

      <Card titre="📅 Prochaines révisions" actions={<Lien to="gantt">Gantt</Lien>} tight>
        {prochaines.length ? (
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Révision</th>
                  <th>Ligne</th>
                  <th>Prévue</th>
                  <th>Initiale</th>
                  <th>Dérive</th>
                  <th>J-</th>
                  <th>Statut</th>
                  <th style={{ minWidth: 120 }}>Préparation</th>
                  <th>PDR critiques</th>
                  <th>Fin prévisionnelle</th>
                  <th>Risque</th>
                </tr>
              </thead>
              <tbody>
                {prochaines.map((a) => (
                  <tr key={a.revision.id} className="click" onClick={() => aller(`revision/${a.revision.id}`)}>
                    <td className="b nowrap">{a.revision.code}</td>
                    <td className="nowrap">{a.chemin.ligne?.code} — {a.chemin.ligne?.nom}</td>
                    <td className="nowrap">{fmtCourt(a.revision.datePrevue)}</td>
                    <td className="nowrap muted">{fmtCourt(a.revision.dateInitiale)}</td>
                    <td>
                      <EcartBadge j={a.derive.derivePlanning} />
                    </td>
                    <td className="nowrap">J-{diffDays(today, a.revision.datePrevue)}</td>
                    <td>
                      <StatutBadge s={a.revision.statut} reports={a.derive.nbReports} />
                    </td>
                    <td>
                      <div className="row" style={{ flexWrap: 'nowrap' }}>
                        <Prog v={a.preparation.taux} />
                        <span className="small">{a.preparation.taux}%</span>
                      </div>
                    </td>
                    <td className="nowrap">
                      {a.pdrStats.critiques - a.pdrStats.critiquesManquantes}/{a.pdrStats.critiques}
                    </td>
                    <td className="nowrap">
                      {fmtCourt(a.finPrevisionnelle)} <EcartBadge j={a.ecartFin} />
                    </td>
                    <td>
                      <NiveauBadge n={a.niveauRisque} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <Vide>Aucune révision à venir.</Vide>
        )}
      </Card>

      {enCours.length > 0 && (
        <Card titre="▶️ Révisions en cours / redémarrages" tight>
          <div className="tbl-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>Révision</th>
                  <th>Statut</th>
                  <th>Début réel</th>
                  <th>Fin prévue</th>
                  <th>Fin prévisionnelle</th>
                  <th>Travaux</th>
                  <th>Chemin critique</th>
                  <th>Redémarrage</th>
                  <th>Risque</th>
                </tr>
              </thead>
              <tbody>
                {enCours.map((a) => (
                  <tr key={a.revision.id} className="click" onClick={() => aller(`revision/${a.revision.id}`)}>
                    <td className="b nowrap">
                      {a.revision.code}
                      <div className="tiny muted">{a.chemin.ligne?.nom}</div>
                    </td>
                    <td>
                      <StatutBadge s={a.revision.statut} />
                    </td>
                    <td className="nowrap">{fmtCourt(a.revision.dateReelleDebut)}</td>
                    <td className="nowrap">{fmtCourt(a.finPrevue)}</td>
                    <td className="nowrap">
                      {fmtCourt(a.finPrevisionnelle)} <EcartBadge j={a.ecartFin} />
                    </td>
                    <td className="nowrap">
                      {a.travaux.nbTermines}/{a.travaux.taches.length} · <span className="crit-txt">{a.travaux.nbRetard} retard</span> · {a.travaux.nbBloques} bloqué
                    </td>
                    <td className="small">{a.travaux.chemin.map((id) => a.travaux.taches.find((t) => t.travail.id === id)?.travail.code).join(' › ') || '—'}</td>
                    <td className="nowrap">{a.redemarrageTenable ? <span className="badge ok">Tenable</span> : <span className="badge crit">À risque · {fmtCourt(a.redemarragePrevisionnel)}</span>}</td>
                    <td>
                      <NiveauBadge n={a.niveauRisque} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      <div className="grid g2">
        <Card titre="📦 PDR critiques non disponibles" actions={<Lien to="achats">Flux PDR</Lien>} tight>
          {pdrCrit.length ? (
            <div className="tbl-wrap">
              <table className="tbl">
                <tbody>
                  {pdrCrit.map((x) => (
                    <tr key={x.pdr.id} className="click" onClick={() => aller(`revision/${x.a.revision.id}/pdr`)}>
                      <td className="nowrap">
                        <CritBadge c="A" /> <span className="mono">{x.pdr.ref}</span>
                        <div className="tiny muted">
                          {codeLigne(d, x.a.revision.ligneId)} · {codeMachine(d, x.pdr.machineId)}
                        </div>
                      </td>
                      <td className="small">{x.position}</td>
                      <td className="nowrap small">
                        dispo {fmtCourt(x.dispo)}
                        <div className="tiny muted">besoin {fmtCourt(x.requise)}</div>
                      </td>
                      <td>
                        <EcartBadge j={x.ecart} />
                      </td>
                      <td>
                        <RoleBadge r={x.responsable} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Vide>Toutes les PDR critiques sont disponibles.</Vide>
          )}
        </Card>
        <Card titre="🚢 Transit" actions={<Lien to="transit">Module Transit</Lien>}>
          <div className="minis card" style={{ boxShadow: 'none', marginBottom: 10 }}>
            <div>
              <b>{transit.length}</b>
              <span>PDR en transit</span>
            </div>
            <div>
              <b>{conteneurs.size}</b>
              <span>conteneurs</span>
            </div>
            <div>
              <b>{bateaux.size}</b>
              <span>navires / vols</span>
            </div>
            <div className={retardsTransit.length ? 'crit' : 'ok'}>
              <b>{retardsTransit.length}</b>
              <span>ETA décalées</span>
            </div>
          </div>
          <div className="col small">
            {transit
              .filter((x) => x.pdr.eta)
              .sort((p, q) => (p.pdr.eta ?? '').localeCompare(q.pdr.eta ?? ''))
              .slice(0, 5)
              .map((x) => (
                <div key={x.pdr.id} className="row">
                  <span className="mono">{x.pdr.ref}</span>
                  <span className="muted">{x.pdr.bateau ?? '—'}</span>
                  <span className="grow" />
                  ETA {fmtCourt(x.pdr.eta)}
                  {x.pdr.etaInitiale && x.pdr.eta !== x.pdr.etaInitiale && <span className="badge act">+{diffDays(x.pdr.etaInitiale, x.pdr.eta!)} j</span>}
                </div>
              ))}
          </div>
        </Card>
      </div>

      <div className="grid g3">
        <Card titre="📋 Révisions">
          <div className="minis">
            <div>
              <b>{s((a) => a.revision.statut === 'PLANIFIEE')}</b>
              <span>prévues</span>
            </div>
            <div>
              <b>{s((a) => phase(a) === 'amont' && a.revision.statut !== 'PLANIFIEE')}</b>
              <span>en préparation</span>
            </div>
            <div>
              <b>{s((a) => phase(a) === 'execution' || phase(a) === 'aval')}</b>
              <span>en cours</span>
            </div>
            <div className="ok">
              <b>{s((a) => phase(a) === 'clos')}</b>
              <span>terminées</span>
            </div>
            <div className="act">
              <b>{s((a) => a.derive.nbReports > 0)}</b>
              <span>reportées</span>
            </div>
          </div>
        </Card>
        <Card titre="📦 PDR (révisions ouvertes)">
          {(() => {
            const o = pdrs.filter((x) => phase(x.a) !== 'clos');
            const i = (e: Parameters<typeof indexEtape>[0]) => o.filter((x) => x.pdr.enStock || idx(x) >= indexEtape(e)).length;
            return (
              <div className="minis">
                <div>
                  <b>{o.length}</b>
                  <span>identifiées</span>
                </div>
                <div>
                  <b>{i('COMMANDE_CREEE')}</b>
                  <span>commandées</span>
                </div>
                <div>
                  <b>{o.filter((x) => idx(x) >= indexEtape('PRETE_EXPEDITION') && idx(x) <= indexEtape('ARRIVEE_ABIDJAN')).length}</b>
                  <span>en transit</span>
                </div>
                <div>
                  <b>{o.filter((x) => idx(x) >= indexEtape('ARRIVEE_USINE')).length}</b>
                  <span>arrivées</span>
                </div>
                <div className="ok">
                  <b>{o.filter((x) => x.disponible).length}</b>
                  <span>disponibles</span>
                </div>
                <div className={pdrCrit.length ? 'crit' : 'ok'}>
                  <b>{o.filter((x) => x.pdr.criticite === 'A' && !x.disponible).length}</b>
                  <span>critiques manquantes</span>
                </div>
              </div>
            );
          })()}
        </Card>
        <Card titre="👷 Techniciens">
          <div className="minis">
            <div>
              <b>{its.length}</b>
              <span>prévus</span>
            </div>
            <div className="ok">
              <b>{its.filter((i) => ['CONFIRME', 'SUR_SITE', 'TERMINEE'].includes(i.intervention.statut)).length}</b>
              <span>confirmés</span>
            </div>
            <div>
              <b>{its.filter((i) => i.intervention.statut === 'SUR_SITE').length}</b>
              <span>sur site</span>
            </div>
            <div className={its.some((i) => i.controle.enRisque) ? 'crit' : 'ok'}>
              <b>{its.filter((i) => i.controle.enRisque).length}</b>
              <span>avant PDR</span>
            </div>
            <div>
              <b>{its.filter((i) => i.intervention.evaluation).length}</b>
              <span>évalués</span>
            </div>
          </div>
        </Card>
        <Card titre="🔧 Travaux">
          <div className="minis">
            <div className="ok">
              <b>{trav.filter((t) => t.travail.statut === 'TERMINE').length}</b>
              <span>terminés</span>
            </div>
            <div>
              <b>{trav.filter((t) => t.travail.statut === 'EN_COURS').length}</b>
              <span>en cours</span>
            </div>
            <div className="crit">
              <b>{trav.filter((t) => t.enRetard && t.travail.statut !== 'TERMINE').length}</b>
              <span>en retard</span>
            </div>
            <div className="act">
              <b>{trav.filter((t) => t.travail.statut === 'BLOQUE').length}</b>
              <span>bloqués</span>
            </div>
          </div>
        </Card>
        <Card titre="▶️ Redémarrage">
          <div className="minis">
            <div>
              <b>{moy(redem.map((a) => a.redemarrage.dureeReelleH!)) ?? '—'}</b>
              <span>h temps moyen</span>
            </div>
            <div className={lignesRisqueRedem.length ? 'crit' : 'ok'}>
              <b>{lignesRisqueRedem.length}</b>
              <span>lignes à risque</span>
            </div>
            <div>
              <b>{redem.filter((a) => (a.redemarrage.depassementH ?? 0) > 0).length}</b>
              <span>dépassements</span>
            </div>
            <div>
              <b>{moy(actives.filter((a) => a.revision.jalons.FIN_STABILISATION?.reel).map((a) => a.stabilisation.dureeReelleJ ?? 0)) ?? '—'}</b>
              <span>j stabilisation</span>
            </div>
          </div>
        </Card>
        <Card titre="📊 KPI clés" actions={<Lien to="kpi">Tous</Lien>}>
          <div className="col small">
            {kpis
              .flatMap((f) => f.kpis.slice(0, 1).map((k) => ({ f: f.famille, k })))
              .map(({ f, k }) => (
                <div key={k.cle} className="row">
                  <span className="muted" style={{ width: 90 }}>
                    {f}
                  </span>
                  <span className="grow">{k.libelle}</span>
                  <b className={etatKpi(k) === 'ko' ? 'crit-txt' : etatKpi(k) === 'ok' ? 'ok-txt' : ''}>
                    {k.valeur ?? '—'}
                    {k.valeur !== undefined ? k.unite : ''}
                  </b>
                </div>
              ))}
          </div>
        </Card>
      </div>
    </div>
  );
}
