import { test, expect } from '@playwright/test';

test.describe('AuthRedirect — Role-based Routing', () => {
  
  test.describe('como Admin', () => {
    test.use({ storageState: 'tests/.auth/admin.json' });

    test('7.2 admin → /admin/dashboard', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/admin\/dashboard/);
    });

    test('7.5 admin tentando /agency/dashboard → redirecionado para /admin/dashboard', async ({ page }) => {
      await page.goto('/agency/dashboard');
      await expect(page).toHaveURL(/\/admin\/dashboard/);
    });
  });

  test.describe('como Agency', () => {
    test.use({ storageState: 'tests/.auth/agency.json' });

    test('7.1 agency → /agency/dashboard', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/agency\/dashboard/);
    });

    test('7.4 agency tentando /admin/dashboard → redirecionado para /agency/dashboard', async ({ page }) => {
      await page.goto('/admin/dashboard');
      await expect(page).toHaveURL(/\/agency\/dashboard/);
    });
  });

  test.describe('como Post-Sales', () => {
    test.use({ storageState: 'tests/.auth/post_sales.json' });

    test('admin → /admin/dashboard (post_sales uses admin dash with limited view)', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/admin\/dashboard/);
    });
  });
});
