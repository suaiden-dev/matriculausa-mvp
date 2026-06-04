import { test, expect } from '@playwright/test';

test.use({ storageState: 'tests/.auth/admin.json' });

test.describe('Admin sidebar — agency refactor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/dashboard');
    // Wait for the page to be ready and not loading
    await expect(page.locator('nav')).toBeVisible({ timeout: 15000 });
  });

  test('1.1 mostra "Agencies" e não "Affiliate Management"', async ({ page }) => {
    // Check for "Agencies" link
    const agenciesLink = page.getByRole('link', { name: 'Agencies' });
    await expect(agenciesLink).toBeVisible();
    
    // Check that "Affiliate Management" is NOT present
    const affiliateManagementLink = page.getByRole('link', { name: 'Affiliate Management' });
    await expect(affiliateManagementLink).not.toBeVisible();
  });

  test('1.2 mostra "Affiliate Program" separado de "Agencies"', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Affiliate Program' })).toBeVisible();
  });

  test('1.3 clicar em Agencies navega para /admin/dashboard/agencies', async ({ page }) => {
    const agenciesLink = page.locator('nav').getByRole('link', { name: 'Agencies' }).first();
    await agenciesLink.click();
    await expect(page).toHaveURL(/\/admin\/dashboard\/agencies/);
  });

  test('1.4 header mostra "Agency Management"', async ({ page }) => {
    await page.goto('/admin/dashboard/agencies');
    await expect(page.getByRole('heading', { name: 'Agency Management' })).toBeVisible();
  });

  test('1.5 item "Agencies" fica ativo ao acessar /agencies', async ({ page }) => {
    await page.goto('/admin/dashboard/agencies');
    const agenciesLink = page.getByRole('link', { name: 'Agencies' });
    // item ativo tem bg-[#05294E]
    await expect(agenciesLink).toHaveClass(/bg-\[#05294E\]/);
  });
});
