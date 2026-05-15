import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Global Error Scanner', () => {
  // 2 minutos de timeout para dar tempo de navegar em todas as rotas com calma
  test.setTimeout(120000); 

  test('Escanear todas as rotas da agência buscando erros de console e rede', async ({ page }) => {
    const errorLogs: Array<{ type: string; url: string; msg: string; location?: string }> = [];

    // 🎧 Interceptar Erros de Console (React, Referências Indefinidas, etc)
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const location = msg.location();
        const text = msg.text();
        
        // Ignorar lixo comum (aviso de React DevTools, extensões bloqueadas)
        if (text.includes('React DevTools') || text.includes('ERR_BLOCKED_BY_CLIENT')) return;
        
        errorLogs.push({
          type: 'CONSOLE_ERROR',
          url: page.url(),
          msg: text,
          location: `${location.url}:${location.lineNumber}:${location.columnNumber}`
        });
      }
    });

    // 🎧 Interceptar Erros de Rede (APIs falhando: 400, 401, 403, 500)
    page.on('response', response => {
      const status = response.status();
      if (status >= 400 && status < 600) {
        const respUrl = response.url();
        // Ignorar ruído de Analytics e fontes
        if (respUrl.includes('google-analytics.com') || respUrl.includes('fonts.googleapis.com')) return;
        
        errorLogs.push({
          type: `NETWORK_ERROR (${status})`,
          url: page.url(),
          msg: `Failed to fetch: ${respUrl}`,
        });
      }
    });

    // 1. Ir para a página de Login
    await page.goto('/login');
    await page.getByPlaceholder(/email/i).fill('josetxo6480@uorak.com');
    await page.getByPlaceholder(/password/i).fill('josetxo6480@uorak.com');
    await page.getByRole('button', { name: /sign in|entrar/i }).click();
    
    // Aguardar o dashboard renderizar
    await expect(page).toHaveURL(/.*\/dashboard/);
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // 2. Rotas do Dashboard da Agência para varrer
    const routesToScan = [
      '/dashboard',
      '/dashboard/users',
      '/dashboard/payments',
      '/dashboard/students',
      '/dashboard/my-students',
      '/dashboard/analytics',
      '/dashboard/utm-tracking',
      '/dashboard/profile'
    ];

    // 3. Crawler: Navegar pelas páginas
    for (const route of routesToScan) {
      console.log(`🔍 Scanner visitando: ${route}...`);
      await page.goto(route);
      // Aguardar requisições finalizarem (até 10 segs, sem quebrar se demorar)
      await page.waitForLoadState('networkidle', { timeout: 10000 }).catch(() => {});
      // Tempo extra para garantir que hooks useEffect demorados consigam disparar o fetch
      await page.waitForTimeout(2000); 
    }

    // 4. Gerar o Relatório Markdown
    let reportMarkdown = '# 🐛 Relatório do Scanner de Erros Global\n\n';
    reportMarkdown += `*Verificado em: ${new Date().toISOString()}*\n\n`;
    
    if (errorLogs.length === 0) {
      reportMarkdown += '✅ **Nenhum erro de rede ou de console foi detectado nestas rotas!** O sistema está limpo.\n';
    } else {
      const groupedByRoute = errorLogs.reduce((acc, log) => {
        const routePath = new URL(log.url).pathname;
        if (!acc[routePath]) acc[routePath] = [];
        acc[routePath].push(log);
        return acc;
      }, {} as Record<string, typeof errorLogs>);

      for (const [route, logs] of Object.entries(groupedByRoute)) {
        reportMarkdown += `## 📍 Rota: \`${route}\`\n\n`;
        logs.forEach(l => {
          reportMarkdown += `- **[${l.type}]** ${l.msg}\n`;
          if (l.location && !l.location.includes('undefined:') && !l.location.startsWith(':')) {
            reportMarkdown += `  - *Fonte: ${l.location}*\n`;
          }
        });
        reportMarkdown += '\n';
      }
    }

    const reportPath = path.resolve('test-results', 'crawler_errors_report.md');
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, reportMarkdown, 'utf-8');
    
    console.log(`✅ Scan completo! Arquivo gerado.`);
  });
});
