import { expect, test, type Page } from '@playwright/test';

/** Parcours de fumée : chaque module s'affiche sans erreur JavaScript. */

const PAGES = ['', 'guide', 'notifications', 'risques', 'kpi', 'planning', 'gantt', 'arborescence', 'gammes', 'import', 'achats', 'transit', 'reception', 'techniciens', 'travaux', 'redemarrage', 'rex', 'audit', 'admin'];
const ONGLETS = ['synthese', 'planning', 'preparation', 'pdr', 'techniciens', 'travaux', 'redemarrage', 'stabilisation', 'risques', 'rex', 'historique'];

async function enAdmin(page: Page) {
  await page.goto('/');
  await page.getByLabel('Utilisateur').selectOption({ label: 'Administrateur — Admin' });
}

function surveiller(page: Page) {
  const erreurs: string[] = [];
  page.on('pageerror', (e) => erreurs.push(e.message));
  page.on('console', (m) => m.type() === 'error' && erreurs.push(m.text()));
  return erreurs;
}

test('tous les modules s\'affichent', async ({ page }) => {
  const erreurs = surveiller(page);
  await page.goto('/');
  await expect(page.getByRole('heading', { name: 'Pilotage des révisions annuelles' })).toBeVisible();
  for (const p of PAGES) {
    await page.goto(`/#/${p}`);
    await expect(page.locator('h1').first()).toBeVisible();
  }
  expect(erreurs).toEqual([]);
});

test('fiche révision : 10 questions et tous les onglets', async ({ page }) => {
  const erreurs = surveiller(page);
  await page.goto('/#/revision/R26-L02');
  await expect(page.getByText('La ligne pourra-t-elle redémarrer à la date prévue ?')).toBeVisible();
  await expect(page.getByText('Qui doit agir maintenant ?')).toBeVisible();
  for (const o of ONGLETS) {
    await page.goto(`/#/revision/R26-L03/${o}`);
    await expect(page.locator('h1').first()).toBeVisible();
  }
  expect(erreurs).toEqual([]);
});

test('règle technicien avant PDR signalée', async ({ page }) => {
  await page.goto('/#/revision/R26-L03/techniciens');
  await expect(page.getByText('🔴 RISQUE — Le technicien est prévu avant la disponibilité des PDR.').first()).toBeVisible();
});

test('report : l\'ancienne date reste visible', async ({ page }) => {
  const erreurs = surveiller(page);
  await enAdmin(page);
  await page.goto('/#/revision/R27-L01/planning');
  await page.getByRole('button', { name: 'Décider un report' }).click();
  await page.getByPlaceholder(/PDR critique en retard/).fill('Indisponibilité du prestataire');
  await page.getByRole('button', { name: 'Enregistrer le report' }).click();
  await expect(page.getByRole('cell', { name: 'Indisponibilité du prestataire' })).toBeVisible();
  await expect(page.getByRole('cell', { name: 'Planning initial' })).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('Achats : créer une commande sur une PDR', async ({ page }) => {
  const erreurs = surveiller(page);
  await enAdmin(page);
  await page.goto('/#/achats');
  await page.locator('table.tbl tbody tr').first().click();
  await page.getByRole('button', { name: 'Créer la commande' }).click();
  await page.getByLabel('N° de commande').fill('CDE-TEST-1');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await expect(page.getByText('CDE-TEST-1').first()).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('import Excel : contrôle, aperçu puis nouvelle version de gamme', async ({ page }) => {
  const erreurs = surveiller(page);
  const writeXlsxFile = (await import('write-excel-file/node')).default;
  const rows = [
    ['Ligne', 'Machine', 'Sous-ensemble', 'Organe', 'Référence PDR', 'Désignation', 'Quantité', 'Criticité', 'Fournisseur', "Délai d'approvisionnement"],
    ['L02', 'SOU-004', 'Roue de soufflage', 'Moules', 'ART-458', 'Moule de soufflage 1,5 L (jeu)', 12, 'A', 'Sidel (FR)', 120],
    ['L02', 'REM-002', 'Carrousel', 'Vannes de remplissage', 'ART-777', 'Nouvelle vanne', 2, 'B', 'Krones AG (DE)', 60],
  ];
  const buffer = await writeXlsxFile(rows.map((r) => r.map((v) => ({ value: v }))) as never).toBuffer();
  await enAdmin(page);
  await page.goto('/#/import');
  await page.locator('input[type=file]').setInputFiles({ name: 'gamme_L02.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer });
  await expect(page.getByText('Aucune erreur bloquante.')).toBeVisible();
  await expect(page.getByText('Référence inconnue du catalogue : « ART-777 »').first()).toBeVisible();
  await page.getByRole('button', { name: 'Valider et importer' }).click();
  await expect(page.getByText(/Import terminé/)).toBeVisible();
  await page.goto('/#/gammes');
  await page.getByRole('button', { name: /L02/ }).click();
  await expect(page.getByText('Remplacée').first()).toBeVisible();
  expect(erreurs).toEqual([]);
});

test('mise en route : non-administrateurs en lecture seule', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Utilisateur').selectOption({ label: 'A. Kouassi — BMC' });
  await expect(page.getByText('👁 Lecture seule')).toBeVisible();
  await page.goto('/#/planning');
  await expect(page.getByRole('button', { name: '+ Nouvelle révision' })).toHaveCount(0);
  await page.goto('/#/revision/R26-L03/pdr');
  await page.locator('table.tbl tbody tr').first().click();
  await expect(page.getByText(/Aucune action disponible pour votre rôle/)).toBeVisible();
});

test('administrateur : mot de passe, base vide, référentiel, révision', async ({ page }) => {
  const erreurs = surveiller(page);
  await enAdmin(page);
  await expect(page.getByText('✎ Saisie')).toBeVisible();
  // Mot de passe administrateur
  await page.goto('/#/admin');
  await page.getByRole('row', { name: /Administrateur/ }).getByRole('button', { name: '✎' }).click();
  await page.getByLabel('Mot de passe (6 caractères min.)').fill('secret123');
  await page.getByLabel('Confirmation').fill('secret123');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  // Base vide
  await page.getByRole('tab', { name: 'Données & intégrations' }).click();
  await page.getByRole('button', { name: 'Démarrer une base vide (données réelles)' }).click();
  await page.getByRole('button', { name: 'Créer la base vide' }).click();
  // Référentiel par Excel
  const writeXlsxFile = (await import('write-excel-file/node')).default;
  const rows = [
    ['Site', 'Atelier', 'Ligne', 'Nom ligne', 'Machine', 'Nom machine', 'Sous-ensemble', 'Organe'],
    ['Usine Test', 'Atelier A', 'LT1', 'Ligne test', 'MAC-1', 'Machine 1', 'Bloc', 'Organe 1'],
  ];
  const buffer = await writeXlsxFile(rows.map((r) => r.map((v) => ({ value: v }))) as never).toBuffer();
  await page.getByRole('tab', { name: 'Référentiel' }).click();
  await page.locator('input[type=file]').first().setInputFiles({ name: 'ref.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer });
  await expect(page.getByText(/Créés : 1 site/)).toBeVisible();
  // Révision
  await page.goto('/#/planning');
  await page.getByRole('button', { name: '+ Nouvelle révision' }).click();
  await page.getByRole('button', { name: 'Créer', exact: true }).click();
  await expect(page.getByRole('heading', { name: /REV-\d{4}-LT1/ })).toBeVisible();
  // Changement d'utilisateur : le retour en administrateur demande le mot de passe
  await page.goto('/#/admin');
  await page.getByRole('button', { name: '+ Utilisateur' }).click();
  await page.getByLabel('Nom').fill('Lecteur Test');
  await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
  await page.getByLabel('Utilisateur').selectOption({ label: 'Lecteur Test — Technicien' });
  await expect(page.getByText('👁 Lecture seule')).toBeVisible();
  await page.getByLabel('Utilisateur').selectOption({ label: 'Administrateur — Admin 🔒' });
  await page.getByLabel('Mot de passe', { exact: true }).fill('faux');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByText('Mot de passe incorrect.')).toBeVisible();
  await page.getByLabel('Mot de passe', { exact: true }).fill('secret123');
  await page.getByRole('button', { name: 'Se connecter' }).click();
  await expect(page.getByText('✎ Saisie')).toBeVisible();
  await page.goto('/#/guide');
  await expect(page.getByRole('heading', { name: /Mise en route/ })).toBeVisible();
  expect(erreurs).toEqual([]);
});
