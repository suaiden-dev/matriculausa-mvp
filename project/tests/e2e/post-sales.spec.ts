import { test, expect } from '@playwright/test';

test.use({ storageState: 'tests/.auth/post_sales.json' });

test.describe('Post-Sales — UI Restrictions', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/dashboard/payments');
    await expect(page.locator('body')).not.toContainText('Carregando', { timeout: 15000 });
  });

  test('11.1 vê aba "Student Payments"', async ({ page }) => {
    // Post-sales handles student payments
    await expect(page.getByRole('button', { name: /Student Payments/i })).toBeVisible();
  });

  test('11.2 NÃO vê "Agencies" no sidebar', async ({ page }) => {
    // Post-sales shouldn't manage agencies
    await expect(page.getByRole('link', { name: 'Agencies' })).not.toBeVisible();
  });

  test('11.3 NÃO vê card "Total Revenue" no Overview', async ({ page }) => {
    await page.goto('/admin/dashboard');
    await expect(page.getByText('Total Revenue')).not.toBeVisible();
  });

  test('11.4 NÃO vê botão "Export CSV" em pagamentos', async ({ page }) => {
    await page.goto('/admin/dashboard/payments');
    await expect(page.getByRole('button', { name: /Export CSV/i })).not.toBeVisible();
  });
});
