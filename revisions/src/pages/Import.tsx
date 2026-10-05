import { useMemo, useState } from 'react';
import { codeLigne } from '../domain/arbo';
import { fmt } from '../domain/dates';
import { analyserTableau, comparerGammes, COLONNES, nouvelleVersion, synchroniserPdr, type ResultatImport } from '../domain/importGamme';
import { STATUTS } from '../domain/referentiel';
import { assurerNoeud } from '../domain/importReferentiel';
import type { GammeLigne } from '../domain/types';
import { nouvelId, useStore } from '../store/store';
import { Card, Lien, Vide, csv, telecharger } from '../ui/kit';

/** Lecture CSV (séparateur ; ou ,) avec guillemets. */
function lireCsv(texte: string): string[][] {
  const t = texte.replace(/^﻿/, '');
  const sep = (t.split('\n')[0].match(/;/g)?.length ?? 0) >= (t.split('\n')[0].match(/,/g)?.length ?? 0) ? ';' : ',';
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let q = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (q) {
      if (c === '"' && t[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (c === '"') q = false;
      else cur += c;
    } else if (c === '"') q = true;
    else if (c === sep) {
      row.push(cur);
      cur = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      row.push(cur);
      rows.push(row);
      row = [];
      cur = '';
    } else cur += c;
  }
  if (cur || row.length) {
    row.push(cur);
    rows.push(row);
  }
  return rows;
}

export async function lireFichier(f: File): Promise<unknown[][]> {
  if (/\.(csv|txt)$/i.test(f.name)) return lireCsv(await f.text());
  const { readSheet } = await import('read-excel-file/browser');
  return (await readSheet(f)) as unknown[][];
}

export async function telechargerModele(lignes: { ligne: string; machine: string }[]) {
  const writeXlsxFile = (await import('write-excel-file/browser')).default;
  const entete = COLONNES.map((c) => ({ value: c.titre, fontWeight: 'bold' as const }));
  const exemples = lignes.slice(0, 2).map((l, k) => [
    'ABJ',
    '',
    l.ligne,
    l.machine,
    'Roue de soufflage',
    'Moules',
    k ? 'ART-999' : 'ART-458',
    k ? 'Nouvelle pièce (exemple)' : 'Moule de soufflage 1,5 L (jeu)',
    k ? 2 : 12,
    k ? 'B' : 'A',
    'Sidel (FR)',
    k ? 45 : 120,
    '',
  ]);
  const blob = await writeXlsxFile([entete, ...exemples.map((r) => r.map((v) => ({ value: v as string | number })))], { columns: COLONNES.map(() => ({ width: 18 })) }).toBlob();
  telecharger('modele_gamme_revision.xlsx', blob);
}

export default function ImportGamme() {
  const { d, user, today, modifier, peut, toast } = useStore();
  const [fichier, setFichier] = useState<string>('');
  const [res, setRes] = useState<ResultatImport | null>(null);
  const [erreurLecture, setErreurLecture] = useState('');
  const [over, setOver] = useState(false);
  const [filtre, setFiltre] = useState<'tout' | 'erreurs' | 'avert'>('tout');
  const [synchro, setSynchro] = useState<Set<string>>(new Set());
  const [termine, setTermine] = useState<string | null>(null);
  const autorise = peut('GAMME');

  const charger = async (f: File) => {
    setErreurLecture('');
    setTermine(null);
    setFichier(f.name);
    try {
      const rows = await lireFichier(f);
      const r = analyserTableau(rows, d, d.catalogue);
      setRes(r);
      // Révisions ouvertes (amont) des lignes concernées : synchronisation proposée.
      setSynchro(new Set(d.revisions.filter((x) => r.ligneIds.includes(x.ligneId) && STATUTS[x.statut].phase === 'amont').map((x) => x.id)));
    } catch (e) {
      setRes(null);
      setErreurLecture(`Lecture impossible : ${(e as Error).message}`);
    }
  };

  const parLigne = useMemo(() => {
    if (!res) return [];
    return res.ligneIds.map((lid) => {
      const lignes: GammeLigne[] = res.lignes.filter((l) => l.valeur?.ligneId === lid).map((l) => {
        const { ligneId: _l, ...g } = l.valeur!;
        void _l;
        return g;
      });
      const active = d.gammes.find((g) => g.ligneId === lid && g.statut === 'ACTIVE');
      return { lid, lignes, active, diff: comparerGammes(active?.lignes ?? [], lignes) };
    });
  }, [res, d.gammes]);

  const rapport = () =>
    res &&
    telecharger(
      `rapport_anomalies_${fichier}.csv`,
      csv([['Ligne Excel', 'Colonne', 'Gravité', 'Message'], ...res.anomalies.map((a) => [a.ligne, a.colonne, a.gravite, a.message])]),
    );

  const rejeter = () => {
    if (!res) return;
    modifier({ entite: 'Import gamme', entiteId: fichier, action: 'IMPORT_REJETE', detail: `${fichier} : ${res.nbErreurs} erreur(s), ${res.nbAvertissements} avertissement(s)` }, (dr) => {
      dr.imports.push({ id: nouvelId('IMP'), date: today, auteur: user.nom, fichier, ligneId: res.ligneIds[0] ?? '', nbLignes: res.lignes.length, nbErreurs: res.nbErreurs, nbAvertissements: res.nbAvertissements, resultat: 'REJETE', resume: res.anomalies.filter((a) => a.gravite === 'ERREUR').slice(0, 3).map((a) => `L${a.ligne} ${a.message}`).join(' | ') });
    });
    toast('Import rejeté et tracé dans l\'historique');
    setRes(null);
  };

  const importer = () => {
    if (!res || !res.valide) return;
    const resume: string[] = [];
    modifier(
      parLigne.map((p) => ({ entite: 'Gamme', entiteId: p.lid, action: 'IMPORT', detail: `${fichier} → ${codeLigne(d, p.lid)} : +${p.diff.ajoutees.length} / −${p.diff.retirees.length} / ~${p.diff.modifiees.length}` })),
      (dr) => {
        for (const p of parLigne) {
          const id = nouvelId(`G-${p.lid}`);
          const { gammes, version } = nouvelleVersion(dr.gammes, p.lid, p.lignes, user.nom, fichier, today, id);
          dr.gammes = gammes;
          dr.imports.push({ id: nouvelId('IMP'), date: today, auteur: user.nom, fichier, ligneId: p.lid, gammeVersionId: id, nbLignes: p.lignes.length, nbErreurs: 0, nbAvertissements: res.nbAvertissements, resultat: 'IMPORTE', resume: `Version ${version.version} : +${p.diff.ajoutees.length} ajoutée(s), −${p.diff.retirees.length} retirée(s), ${p.diff.modifiees.length} modifiée(s)` });
          resume.push(`${codeLigne(dr, p.lid)} v${version.version}`);
          // Catalogue : références inconnues ajoutées (jamais écrasées).
          // Arborescence : sous-ensembles et organes créés s'ils n'existent pas.
          for (const l of p.lignes) assurerNoeud(dr, l.machineId, l.sousEnsemble, l.organe, (x) => nouvelId(x));
          for (const l of p.lignes) if (!dr.catalogue.some((a) => a.ref === l.ref)) dr.catalogue.push({ ref: l.ref, designation: l.designation, fournisseur: l.fournisseur, delaiJours: l.delaiJours, criticite: l.criticite });
          for (const rid of synchro) {
            const rev = dr.revisions.find((x) => x.id === rid);
            if (!rev || rev.ligneId !== p.lid) continue;
            const s = synchroniserPdr(dr.pdrs, version, rid, today, () => nouvelId('PDR'));
            dr.pdrs = s.pdrs;
            rev.gammeVersionId = version.id;
            dr.audit.push({ id: nouvelId('AUD'), horodatage: `${today}T00:00`, auteur: user.nom, role: user.role, entite: 'Révision', entiteId: rid, revisionId: rid, action: 'SYNCHRO_GAMME', detail: `Gamme v${version.version} : +${s.ajoutees} PDR, ${s.majs} MAJ, ${s.horsGamme} hors gamme` });
          }
        }
      },
    );
    setTermine(`Import terminé : ${parLigne.map((p) => codeLigne(d, p.lid)).join(', ')} — nouvelles versions créées, anciennes conservées.`);
    toast('Gamme importée (nouvelle version)');
    setRes(null);
  };

  const lignesAff = res ? res.lignes.filter((l) => filtre === 'tout' || (filtre === 'erreurs' ? l.anomalies.some((a) => a.gravite === 'ERREUR') : l.anomalies.length > 0)) : [];

  return (
    <div className="stack">
      <div className="page-head">
        <div>
          <h1>Importer une gamme</h1>
          <div className="sub">Liste des PDR de révision par machine (Excel .xlsx ou CSV). Chaque import validé crée une nouvelle version : rien n'est écrasé.</div>
        </div>
        <div className="grow" />
        <button className="btn" onClick={() => telechargerModele(d.machines.slice(0, 2).map((m) => ({ ligne: codeLigne(d, m.ligneId), machine: m.code })))}>
          Télécharger le modèle Excel
        </button>
        <Lien to="gammes">Versions & historique →</Lien>
      </div>
      {!autorise && <div className="alert VIGILANCE small">Import réservé au BMC / Méthodes (responsable des gammes). Vous pouvez contrôler un fichier, sans l'importer.</div>}
      <Card titre="1. Sélection du fichier">
        <div
          className={`dropzone ${over ? 'over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setOver(true);
          }}
          onDragLeave={() => setOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setOver(false);
            const f = e.dataTransfer.files[0];
            if (f) charger(f);
          }}
        >
          <p style={{ marginBottom: 10 }}>Déposez un fichier ici ou</p>
          <label className="btn primary" style={{ cursor: 'pointer' }}>
            Choisir un fichier…
            <input type="file" accept=".xlsx,.csv,.txt" style={{ display: 'none' }} onChange={(e) => e.target.files?.[0] && charger(e.target.files[0])} />
          </label>
          <p className="tiny" style={{ marginTop: 10 }}>
            Colonnes reconnues : {COLONNES.map((c) => `${c.titre}${c.obligatoire ? '*' : ''}`).join(', ')}. En-têtes tolérants (accents, casse, synonymes).
          </p>
        </div>
        {erreurLecture && <div className="alert CRITIQUE small" style={{ marginTop: 10 }}>{erreurLecture}</div>}
        {termine && <div className="alert OK small" style={{ marginTop: 10 }}>{termine}</div>}
      </Card>

      {res && (
        <>
          <Card titre={`2. Contrôles — ${fichier}`} actions={<button className="btn sm" onClick={rapport}>Rapport d'anomalies (CSV)</button>}>
            <div className="minis card" style={{ boxShadow: 'none', marginBottom: 12 }}>
              <div>
                <b>{res.lignes.length}</b>
                <span>lignes lues</span>
              </div>
              <div className="ok">
                <b>{res.lignes.filter((l) => l.valeur).length}</b>
                <span>lignes valides</span>
              </div>
              <div className={res.nbErreurs ? 'crit' : 'ok'}>
                <b>{res.nbErreurs}</b>
                <span>erreurs</span>
              </div>
              <div className={res.nbAvertissements ? 'act' : 'ok'}>
                <b>{res.nbAvertissements}</b>
                <span>avertissements</span>
              </div>
              <div>
                <b>{res.ligneIds.length}</b>
                <span>ligne(s) de prod.</span>
              </div>
            </div>
            <div className="col small">
              <div>
                <b>Colonnes :</b>{' '}
                {COLONNES.map((c) => (
                  <span key={c.cle} className={`badge ${res.mapping[c.cle] !== undefined ? 'ok' : c.obligatoire ? 'crit' : ''}`} style={{ marginRight: 4 }}>
                    {c.titre}
                  </span>
                ))}
              </div>
              {res.colonnesIgnorees.length > 0 && <div className="act-txt">Colonnes ignorées : {res.colonnesIgnorees.join(', ')}</div>}
              <div className="muted">Contrôles réalisés : colonnes, formats (quantité, délai, criticité), doublons (machine + sous-ensemble + organe + référence), références inconnues du catalogue, lignes / machines inconnues, champs obligatoires.</div>
            </div>
          </Card>

          {parLigne.length > 0 && (
            <Card titre="3. Comparaison avec la version active" tight>
              <table className="tbl">
                <thead>
                  <tr>
                    <th>Ligne</th>
                    <th>Version active</th>
                    <th className="num">Ajoutées</th>
                    <th className="num">Retirées</th>
                    <th className="num">Modifiées</th>
                    <th className="num">Inchangées</th>
                    <th>Nouvelle version</th>
                  </tr>
                </thead>
                <tbody>
                  {parLigne.map((p) => (
                    <tr key={p.lid}>
                      <td className="b">{codeLigne(d, p.lid)}</td>
                      <td>{p.active ? `v${p.active.version} — ${fmt(p.active.dateImport)} (${p.active.lignes.length} lignes)` : 'Aucune'}</td>
                      <td className="num ok-txt">+{p.diff.ajoutees.length}</td>
                      <td className="num crit-txt" title={p.diff.retirees.map((x) => x.ref).join(', ')}>
                        −{p.diff.retirees.length}
                      </td>
                      <td className="num act-txt" title={p.diff.modifiees.map((x) => `${x.apres.ref} : ${x.champs.join(', ')}`).join('\n')}>
                        ~{p.diff.modifiees.length}
                      </td>
                      <td className="num">{p.diff.inchangees}</td>
                      <td>v{(p.active?.version ?? 0) + 1} (l'ancienne passe « remplacée »)</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </Card>
          )}

          <Card
            titre="4. Aperçu avant import"
            actions={
              <div className="chip-row">
                {(
                  [
                    ['tout', 'Tout'],
                    ['erreurs', 'Erreurs'],
                    ['avert', 'Anomalies'],
                  ] as const
                ).map(([k, l]) => (
                  <button key={k} className={`chip ${filtre === k ? 'on' : ''}`} onClick={() => setFiltre(k)}>
                    {l}
                  </button>
                ))}
              </div>
            }
            tight
          >
            {res.anomalies.filter((a) => a.ligne === 1).length > 0 && (
              <div className="card-b">
                {res.anomalies
                  .filter((a) => a.ligne === 1)
                  .map((a, k) => (
                    <div key={k} className={`small ${a.gravite === 'ERREUR' ? 'crit-txt' : 'act-txt'}`}>
                      En-tête : {a.message}
                    </div>
                  ))}
              </div>
            )}
            {lignesAff.length ? (
              <div className="tbl-wrap" style={{ maxHeight: 460 }}>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>État</th>
                      {COLONNES.filter((c) => res.mapping[c.cle] !== undefined).map((c) => (
                        <th key={c.cle}>{c.titre}</th>
                      ))}
                      <th>Anomalies</th>
                    </tr>
                  </thead>
                  <tbody>
                    {lignesAff.slice(0, 300).map((l) => {
                      const err = l.anomalies.some((a) => a.gravite === 'ERREUR');
                      return (
                        <tr key={l.numero}>
                          <td className="muted">{l.numero}</td>
                          <td>{err ? <span className="badge crit">Erreur</span> : l.anomalies.length ? <span className="badge act">À vérifier</span> : <span className="badge ok">OK</span>}</td>
                          {COLONNES.filter((c) => res.mapping[c.cle] !== undefined).map((c) => (
                            <td key={c.cle} className={l.anomalies.some((a) => a.colonne === c.titre && a.gravite === 'ERREUR') ? 'crit-txt b' : ''}>
                              {l.brut[c.cle]}
                            </td>
                          ))}
                          <td className="small">
                            {l.anomalies.map((a, k) => (
                              <div key={k} className={a.gravite === 'ERREUR' ? 'crit-txt' : 'act-txt'}>
                                {a.message}
                              </div>
                            ))}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <Vide>Aucune ligne pour ce filtre.</Vide>
            )}
          </Card>

          <Card titre="5. Validation">
            <div className="stack">
              {res.valide ? (
                <div className="alert OK small">Aucune erreur bloquante. {res.nbAvertissements ? `${res.nbAvertissements} avertissement(s) à prendre en compte.` : ''}</div>
              ) : (
                <div className="alert CRITIQUE small">{res.nbErreurs} erreur(s) bloquante(s) : corrigez le fichier puis rechargez-le. L'import peut être rejeté et tracé.</div>
              )}
              {res.valide && (
                <div>
                  <b className="small">Synchroniser les besoins PDR des révisions ouvertes :</b>
                  <div className="col small" style={{ marginTop: 6 }}>
                    {d.revisions
                      .filter((x) => res.ligneIds.includes(x.ligneId) && STATUTS[x.statut].phase !== 'clos' && x.statut !== 'ANNULEE')
                      .map((x) => (
                        <label key={x.id} className="row" style={{ cursor: 'pointer' }}>
                          <input
                            type="checkbox"
                            checked={synchro.has(x.id)}
                            onChange={() => {
                              const n = new Set(synchro);
                              if (n.has(x.id)) n.delete(x.id);
                              else n.add(x.id);
                              setSynchro(n);
                            }}
                          />
                          {x.code} — {STATUTS[x.statut].libelle}
                        </label>
                      ))}
                  </div>
                  <p className="tiny muted" style={{ marginTop: 4 }}>
                    Nouvelles lignes → PDR « identifiée » ; lignes existantes mises à jour sans perdre leur avancement ; lignes retirées marquées « hors gamme » (jamais supprimées).
                  </p>
                </div>
              )}
              <div className="row" style={{ justifyContent: 'flex-end' }}>
                <button className="btn" onClick={() => setRes(null)}>
                  Abandonner
                </button>
                {autorise && (
                  <button className="btn danger" onClick={rejeter}>
                    Rejeter et tracer
                  </button>
                )}
                <button className="btn primary" disabled={!res.valide || !autorise} onClick={importer}>
                  Valider et importer
                </button>
              </div>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
