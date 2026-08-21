const { test, expect } = require('@playwright/test');

test('a visitor can register, verify their email and open knitting projects', async ({ page }) => {
  const email = `e2e-${Date.now()}@example.test`;

  await page.goto('/register');
  await page.getByLabel('Navn').fill('E2E Bruger');
  await page.getByLabel('Email').fill(email);
  await page.locator('input[name="password"]').fill('TestPassword123!');
  await page.getByLabel('Gentag adgangskode').fill('TestPassword123!');
  await page.getByRole('button', { name: 'Opret konto' }).click();

  await expect(page).toHaveURL('/verify-email-sent');
  await expect(page.getByRole('heading', { name: 'Tjek din indbakke' })).toBeVisible();

  await page.getByRole('link', { name: 'Åbn udviklingslink' }).click();
  await expect(page).toHaveURL('/taellere');
  await expect(page.getByRole('heading', { name: 'Omgangstællere' })).toBeVisible();
});
