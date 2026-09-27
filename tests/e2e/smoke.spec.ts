import { expect, test } from '@playwright/test';

// Parcours critique : création de partie, simulation, navigation, une mission complète.
test('création de partie et simulation d’un mois', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.goto('/');
  await page.getByPlaceholder(/Awa/).fill('E2E');
  await page.getByRole('button', { name: /Prendre mon poste/ }).click();
  await page.getByRole('button', { name: /Simuler le/ }).first().click();
  // une décision sous pression peut apparaître
  const opt = page.locator('.modal-back .option').first();
  if (await opt.isVisible().catch(() => false)) await opt.click();
  await expect(page.getByRole('heading', { name: /Cockpit fiabilité/ })).toBeVisible();
  expect(errors).toEqual([]);
});

test('navigation entre tous les écrans', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder(/Awa/).fill('E2E');
  await page.getByRole('button', { name: /Prendre mon poste/ }).click();
  await page.setViewportSize({ width: 1280, height: 900 });
  for (const s of ['Usine', 'Missions', 'Laboratoires', 'Magasin', 'REX & Pareto', 'Audit maturité', 'Bibliothèque', 'Mon profil']) {
    await page.locator('.sidenav button', { hasText: s }).click();
    await expect(page.locator('.main h1')).toBeVisible();
  }
});

test('mission GMAO : erreur volontaire puis correction', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder(/Awa/).fill('E2E');
  await page.getByRole('button', { name: /Prendre mon poste/ }).click();
  await page.getByRole('button', { name: /Lancer la première mission/ }).click();
  await page.getByRole('button', { name: /Prendre la mission/ }).click();
  // soumission naïve (tout "Valide") → doit afficher une conséquence
  await page.getByRole('button', { name: /Valider ma décision/ }).click();
  await expect(page.getByText(/Conséquence/)).toBeVisible();
  // le coach évalue le raisonnement écrit
  await page.locator('textarea').fill('Je vais exclure les doublons et convertir les heures calendaires en heures de marche.');
  await expect(page.getByText(/Coach/)).toBeVisible();
});
