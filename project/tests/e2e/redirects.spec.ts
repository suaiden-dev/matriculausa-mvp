import { test, expect } from '@playwright/test';

// Esses testes NÃO precisam de login
// As rotas de redirect são públicas (Navigate component renderiza antes do AuthGuard)

test.describe('URL redirects — affiliate-admin → agency', () => {
  test('3.1 /admin/dashboard/affiliate-management → /admin/dashboard/agencies', async ({ page }) => {
    await page.goto('/admin/dashboard/affiliate-management');
    await expect(page).toHaveURL(/\/admin\/dashboard\/agencies/);
  });

  test('3.2 /affiliate-admin/dashboard → /agency/dashboard', async ({ page }) => {
    await page.goto('/affiliate-admin/dashboard');
    await expect(page).toHaveURL(/\/agency\/dashboard/);
  });

  test('3.3 /affiliate-admin/onboarding → /agency/onboarding', async ({ page }) => {
    await page.goto('/affiliate-admin/onboarding');
    await expect(page).toHaveURL(/\/agency\/onboarding/);
  });

  test('3.4 /affiliate-admin/pending-approval → /agency/pending-approval', async ({ page }) => {
    await page.goto('/affiliate-admin/pending-approval');
    await expect(page).toHaveURL(/\/agency\/pending-approval/);
  });
});
