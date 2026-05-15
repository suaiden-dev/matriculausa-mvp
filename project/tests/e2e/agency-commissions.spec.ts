import { test, expect } from '@playwright/test';

test.describe('Agency Dashboard - Flexible Commissions', () => {
  // Aumentar timeout por precaução para logins remotos
  test.setTimeout(45000);

  test('Agência deve ver regras de comissão flexíveis e saldo calculado', async ({ page }) => {
    // 1. Ir para a página de Login
    await page.goto('/login');
    
    // 2. Preencher credenciais da Agência de Teste
    await page.getByPlaceholder(/email/i).fill('josetxo6480@uorak.com');
    await page.getByPlaceholder(/password/i).fill('josetxo6480@uorak.com');
    await page.getByRole('button', { name: /sign in|entrar/i }).click();
    
    // 3. Aguardar redirecionamento para o dashboard
    await expect(page).toHaveURL(/.*\/dashboard/);
    
    // 4. Navegar até a tela de pagamentos (Payment Management)
    await page.goto('/dashboard/payments');
    
    // Aguardar o título da página para ter certeza que montou
    await expect(page.getByRole('heading', { name: /Payment Management/i })).toBeVisible({ timeout: 15000 });

    // 5. Clicar na aba 'Commission Balance'
    // Como o botão tem um ícone dentro, usamos getByText ou um regex mais flexível
    const commissionTab = page.locator('button[role="tab"]', { hasText: /Commission Balance/i });
    await expect(commissionTab).toBeVisible({ timeout: 15000 });
    await commissionTab.click();

    // 6. Validar o Card de Regras Flexíveis
    await expect(page.getByText('Comissões (Regras Ativas)')).toBeVisible({ timeout: 10000 });
    
    // Validar se as regras que injetamos via seed estão renderizando
    await expect(page.getByText('$100')).toBeVisible();
    await expect(page.getByText('10%')).toBeVisible();
    
    // 7. Validar o Saldo Acumulado (R$ 190 do Selection + Scholarship)
    const totalCard = page.getByText('Total Acumulado').locator('..');
    await expect(totalCard).toBeVisible();
    await expect(totalCard.locator('p.text-2xl')).toContainText('190');
  });
});
