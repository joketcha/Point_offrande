import { useMemo, useState } from 'react';
import type { PdrAnalyse } from '../domain/analyse';
import { diffDays, fmtCourt } from '../domain/dates';
import { ETAPE, indexEtape, ROLES, STATUTS } from '../domain/referentiel';
import type { EtapePDR, Role } from '../domain/types';
import { useStore } from '../store/store';
import { Card, Tabs, Tile, csv, telecharger } from '../ui/kit';
import { TablePdr } from '../ui/Pdr';

type Module = 'achats' | 'transit' | 'reception';

const DEF: Record<Module, { titre: string; role: Role; sub: string; etapes: EtapePDR[]; dansPerimetre: (x: PdrAnalyse) => boolean }> = {
  achats: {
    titre: 'Approvisionnement / Achats',
    role: 'ACHATS',
    sub: 'Création des commandes, envoi, confirmation, relances, retards fournisseur.',
    etapes: ['BESOIN_VALIDE', 'COMMANDE_A_CREER', 'COMMANDE_CREEE', 'COMMANDE_ENVOYEE', 'COMMANDE_CONFIRMEE'],
    dansPerimetre: (x) => x.responsable === 'ACHATS',
  },
  transit: {
    titre: 'Transit',
    role: 'TRANSIT',
    sub: "Responsable dès que la PDR entre dans le périmètre de transport : expédition, conteneur, navire, ETA, arrivée Abidjan, acheminement usine.",
    etapes: ['DISPO_FOURNISSEUR', 'PRETE_EXPEDITION', 'CONTENEUR', 'BATEAU', 'TRANSIT', 'ARRIVEE_ABIDJAN'],
    dansPerimetre: (x) => x.responsable === 'TRANSIT',
  },
  reception: {
    titre: 'Réception / Magasin',
    role: 'MAGASIN',
    sub: 'Réception physique (quantité, référence), écarts, réception système, mise à disposition.',
    etapes: ['ARRIVEE_USINE', 'RECEPTION_PHYSIQUE', 'RECEPTION_SYSTEME'],
    dansPerimetre: (x) => x.responsable === 'MAGASIN',
  },
};

export default function FluxPdr({ module }: { module: Module }) {
  const { analyses, visible, today, d } = useStore();
  const def = DEF[module];
  const [vue, setVue] = useState<'afaire' | 'tout' | 'groupes'>('afaire');
  const [rev, setRev] = useState('');
  const [four, setFour] = useState('');
  const ouvertes = analyses.filter((a) => visible(a.revision.ligneId) && STATUTS[a.revision.statut].phase !== 'clos');
  const toutes = useMemo(
    () => ouvertes.flatMap((a) => a.pdrs.filter((x) => !x.pdr.horsGamme).map((x) => ({ ...x, revisionCode: a.revision.code, ligneId: a.revision.ligneId }))),
    [ouvertes],
  );
  const filtre = (x: (typeof toutes)[number]) => (!rev || x.pdr.revisionId === rev) && (!four || x.pdr.fournisseur === four);
  const aFaire = toutes.filter((x) => !x.disponible && def.dansPerimetre(x) && filtre(x)).sort((p, q) => q.ecart - p.ecart);
  const suivi = toutes.filter((x) => (def.etapes.includes(x.pdr.etape) || def.etapes.some((e) => x.pdr.dates[e])) && filtre(x));
  const fournisseurs = [...new Set(toutes.map((x) => x.pdr.fournisseur).filter(Boolean))].sort();

  const tuiles = (() => {
    const at = (e: EtapePDR) => aFaire.filter((x) => x.pdr.etape === e).length;
    if (module === 'achats')
      return [
        { lbl: 'Commandes à créer', val: at('BESOIN_VALIDE') + at('COMMANDE_A_CREER'), cls: '' },
        { lbl: 'À envoyer / à confirmer', val: at('COMMANDE_CREEE') + at('COMMANDE_ENVOYEE'), cls: '' },
        { lbl: 'Fournisseurs en retard', val: aFaire.filter((x) => x.pdr.dateLivraisonPromise && x.pdr.dateLivraisonPromise < today && x.pdr.etape === 'COMMANDE_CONFIRMEE').length, cls: 'crit' },
        { lbl: 'Nouvelles commandes (non-conformité)', val: aFaire.filter((x) => x.pdr.nonConforme).length, cls: 'act' },
      ];
    if (module === 'transit')
      return [
        { lbl: 'À expédier (dispo fournisseur)', val: at('DISPO_FOURNISSEUR') + at('PRETE_EXPEDITION'), cls: '' },
        { lbl: 'En mer / en vol', val: at('CONTENEUR') + at('BATEAU') + at('TRANSIT'), cls: '' },
        { lbl: 'ETA décalées ou dépassées', val: aFaire.filter((x) => x.pdr.eta && ((x.pdr.etaInitiale && x.pdr.eta > x.pdr.etaInitiale) || x.pdr.eta < today)).length, cls: 'crit' },
        { lbl: 'À Abidjan, à acheminer', val: at('ARRIVEE_ABIDJAN'), cls: 'act' },
      ];
    return [
      { lbl: 'Arrivées à réceptionner', val: at('ARRIVEE_USINE'), cls: '' },
      { lbl: 'Réceptions système en attente', val: at('RECEPTION_PHYSIQUE'), cls: '' },
      { lbl: 'À mettre à disposition', val: at('RECEPTION_SYSTEME') + aFaire.filter((x) => x.pdr.enStock).length, cls: '' },
      { lbl: 'Non-conformités / écarts', val: aFaire.filter((x) => x.pdr.nonConforme).length, cls: 'crit' },
    ];
  })();

  // Regroupement : par fournisseur (Achats), par conteneur / navire (Transit), par révision (Réception).
  const groupes = useMemo(() => {
    const m = new Map<string, typeof toutes>();
    const base = vue === 'groupes' ? suivi.filter((x) => !x.disponible) : [];
    for (const x of base) {
      const k = module === 'achats' ? x.pdr.fournisseur || '—' : module === 'transit' ? [x.pdr.bateau && `🚢 ${x.pdr.bateau}`, x.pdr.conteneur && `📦 ${x.pdr.conteneur}`].filter(Boolean).join(' · ') || `En attente d'expédition — ${x.pdr.fournisseur}` : `${x.revisionCode}`;
      m.set(k, [...(m.get(k) ?? []), x]);
    }
    return [...m.entries()].sort((a, b) => Math.max(...b[1].map((x) => x.ecart)) - Math.max(...a[1].map((x) => x.ecart)));
  }, [suivi, vue, module]);

  const exporter = () =>
    telecharger(
      `${module}-${today}.csv`,
      csv([
        ['Révision', 'Ligne', 'Machine', 'Réf', 'Désignation', 'Qté', 'Criticité', 'Fournisseur', 'Étape', 'N° commande', 'Date promise', 'Conteneur', 'Navire', 'ETA initiale', 'ETA', 'Dispo estimée', 'Besoin', 'Écart (j)', 'Responsable', 'Action'],
        ...suivi.map((x) => [
          x.revisionCode,
          d.lignes.find((l) => l.id === x.ligneId)?.code,
          d.machines.find((m) => m.id === x.pdr.machineId)?.code,
          x.pdr.ref,
          x.pdr.designation,
          x.pdr.quantite,
          x.pdr.criticite,
          x.pdr.fournisseur,
          ETAPE[x.pdr.etape].libelle,
          x.pdr.numeroCommande,
          x.pdr.dateLivraisonPromise,
          x.pdr.conteneur,
          x.pdr.bateau,
          x.pdr.etaInitiale,
          x.pdr.eta,
          x.dispo,
          x.requise,
          x.disponible ? '' : x.ecart,
          x.responsable ? ROLES[x.responsable].court : '',
          x.disponible ? '' : x.action,
        ]),
      ]),
    );

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>{def.titre}</h1>
          <div className="sub">{def.sub}</div>
        </div>
        <div className="grow" />
        <button className="btn" onClick={exporter}>
          Export (CSV)
        </button>
      </div>
      <div className="grid g4">
        {tuiles.map((t) => (
          <Tile key={t.lbl} lbl={t.lbl} val={t.val} cls={t.val ? t.cls : 'ok'} />
        ))}
      </div>
      <div className="filters">
        <select value={rev} onChange={(e) => setRev(e.target.value)} aria-label="Révision">
          <option value="">Toutes révisions ouvertes</option>
          {ouvertes.map((a) => (
            <option key={a.revision.id} value={a.revision.id}>
              {a.revision.code}
            </option>
          ))}
        </select>
        <select value={four} onChange={(e) => setFour(e.target.value)} aria-label="Fournisseur">
          <option value="">Tous fournisseurs</option>
          {fournisseurs.map((f) => (
            <option key={f}>{f}</option>
          ))}
        </select>
      </div>
      <Tabs
        value={vue}
        onChange={setVue}
        items={[
          { id: 'afaire', label: `À traiter par ${ROLES[def.role].court}`, badge: <span className={`badge ${aFaire.some((x) => x.ecart > 0 && x.pdr.criticite === 'A') ? 'crit' : ''}`}>{aFaire.length}</span> },
          { id: 'groupes', label: module === 'achats' ? 'Par fournisseur' : module === 'transit' ? 'Par conteneur / navire' : 'Par révision' },
          { id: 'tout', label: 'Tout le suivi', badge: <span className="badge">{suivi.length}</span> },
        ]}
      />
      {vue === 'afaire' && (
        <Card tight>
          <TablePdr lignes={aFaire} avecRevision vide={`Rien à traiter pour ${ROLES[def.role].court}.`} />
        </Card>
      )}
      {vue === 'tout' && (
        <Card tight>
          <TablePdr lignes={suivi} avecRevision />
        </Card>
      )}
      {vue === 'groupes' &&
        groupes.map(([k, xs]) => (
          <Card
            key={k}
            titre={k}
            sub={
              module === 'transit' && xs[0].pdr.eta
                ? `ETA ${fmtCourt(xs[0].pdr.eta)}${xs[0].pdr.etaInitiale && xs[0].pdr.eta !== xs[0].pdr.etaInitiale ? ` (initiale ${fmtCourt(xs[0].pdr.etaInitiale)}, +${diffDays(xs[0].pdr.etaInitiale, xs[0].pdr.eta)} j)` : ''} · ${xs.length} PDR`
                : `${xs.length} PDR · ${xs.filter((x) => x.pdr.criticite === 'A').length} critiques`
            }
            tight
          >
            <TablePdr lignes={xs} avecRevision />
          </Card>
        ))}
      {vue === 'groupes' && !groupes.length && <Card>Aucune PDR en cours.</Card>}
      <p className="small muted">
        Étapes du périmètre : {def.etapes.map((e) => ETAPE[e].libelle).join(' → ')}. Une ligne s'ouvre pour voir l'historique daté et saisir l'action ({indexEtape(def.etapes[0]) + 1}–{indexEtape(def.etapes.at(-1)!) + 2}/16 du cycle PDR).
      </p>
    </div>
  );
}
