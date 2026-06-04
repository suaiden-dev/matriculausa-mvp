import { test, expect } from '@playwright/test';

test.use({ storageState: 'tests/.auth/admin.json' });

test.describe('Agency Management Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/dashboard/agencies');
    await expect(page.getByRole('heading', { name: 'Agency Management' })).toBeVisible({ timeout: 15000 });
  });

  test('2.1 página carrega sem erro visível', async ({ page }) => {
    const body = page.locator('body');
    await expect(body).not.toContainText('Something went wrong');
    await expect(body).not.toContainText('Error loading');
  });

  test('2.3 card "Total Agencies" visível e com número', async ({ page }) => {
    const card = page.getByText('Total Agencies').locator('..');
    await expect(card).toBeVisible();
    // Check if it has some number
    await expect(card.locator('p.text-2xl')).toContainText(/\d+/);
  });

  test('2.4 input de busca tem placeholder correto', async ({ page }) => {
    await expect(page.getByPlaceholder(/Search agencies by name/i)).toBeVisible();
  });

  test('2.7 busca sem resultado mostra "No agencies found"', async ({ page }) => {
    await page.getByPlaceholder(/Search agencies by name/i).fill('NonExistentAgencyXYZ123');
    await expect(page.getByText('No agencies found')).toBeVisible();
  });
});
