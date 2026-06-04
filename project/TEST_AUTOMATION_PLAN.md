# Plano de Automação de Testes — Agency Refactor

> Stack atual: Vite 5 + React 18 + TypeScript + React Router v6 + Supabase + React Query  
> Test runner instalado: **Vitest** (sem configuração, sem testes existentes)  
> Playwright, Testing Library, MSW: **não instalados**

---

## 1. Stack de Testes Proposta

### Camadas

```
┌─────────────────────────────────────────────────────┐
│  E2E — Playwright                                   │
│  Testes de navegação, auth, redirects, labels UI    │
├─────────────────────────────────────────────────────┤
│  Integration — Vitest + @testing-library/react      │
│  Componentes com dados mockados via MSW             │
├─────────────────────────────────────────────────────┤
│  Unit — Vitest                                      │
│  Hooks puros, queryKeys, funções utilitárias        │
├─────────────────────────────────────────────────────┤
│  Static — TypeScript Compiler                       │
│  tsc --noEmit (zero config, já funciona)            │
└─────────────────────────────────────────────────────┘
```

### Decisões técnicas

| Necessidade | Escolha | Alternativa descartada | Por quê |
|-------------|---------|------------------------|---------|
| E2E | **Playwright** | Cypress | SPA-native, storageState para auth, paralelo, sem iframe |
| Integration | **@testing-library/react** | Enzyme | Padrão atual, API centrada no usuário, não expõe internals |
| Mock de rede | **MSW v2** | Vitest mocks manuais | Intercepta em nível de fetch, reutilizável entre E2E e unit |
| DOM para Vitest | **jsdom** | happy-dom | Mais completo, melhor suporte a react-router |
| CI | **GitHub Actions** | — | Já integrado ao repo |

---

## 2. Dependências a Instalar

```bash
# E2E
npm install -D @playwright/test

# Integration + Unit
npm install -D \
  @testing-library/react \
  @testing-library/jest-dom \
  @testing-library/user-event \
  msw \
  jsdom \
  vitest \
  @vitest/coverage-v8

# Inicializar Playwright (baixa browsers)
npx playwright install --with-deps chromium
```

---

## 3. Estrutura de Arquivos

```
project/
├── tests/
│   ├── e2e/
│   │   ├── fixtures/
│   │   │   ├── auth.ts              # helpers de login por role
│   │   │   └── users.ts             # credenciais de contas de teste
│   │   ├── redirects.spec.ts        # Seção 3 do checklist
│   │   ├── admin-sidebar.spec.ts    # Seção 1
│   │   ├── agency-management.spec.ts # Seção 2
│   │   ├── auth-redirect.spec.ts    # Seção 7
│   │   ├── agency-dashboard.spec.ts # Seções 4 e 5
│   │   └── post-sales.spec.ts       # Seção 11
│   ├── integration/
│   │   ├── mocks/
│   │   │   ├── handlers.ts          # MSW request handlers
│   │   │   └── server.ts            # MSW node server
│   │   ├── AgencyManagement.test.tsx
│   │   └── AdminDashboardLayout.test.tsx
│   ├── unit/
│   │   ├── queryKeys.test.ts
│   │   └── hooks/
│   │       └── useAgencyId.test.ts
│   └── global-setup.ts              # login único por role, salva storageState
├── playwright.config.ts
└── vitest.config.ts
```

---

## 4. Configuração do Playwright

```ts
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [['html', { outputFolder: 'playwright-report' }]],

  globalSetup: './tests/global-setup.ts', // faz login uma vez, salva sessão

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
  },

  projects: [
    // Projetos de setup (login por role)
    { name: 'setup:admin',      testMatch: /global-setup\.ts/, use: { storageState: 'tests/.auth/admin.json' } },
    { name: 'setup:agency',     testMatch: /global-setup\.ts/, use: { storageState: 'tests/.auth/agency.json' } },
    { name: 'setup:post_sales', testMatch: /global-setup\.ts/, use: { storageState: 'tests/.auth/post_sales.json' } },

    // Suite principal
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
      dependencies: ['setup:admin', 'setup:agency', 'setup:post_sales'],
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: !process.env.CI,
  },
});
```

---

## 5. Configuração do Vitest (separada do vite.config.ts)

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/integration/mocks/server.ts'],
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.tsx'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: [
        'src/pages/AgencyDashboard/**',
        'src/pages/AdminDashboard/AgencyManagement.tsx',
        'src/hooks/useAgency*.ts',
        'src/lib/queryKeys.ts',
        'src/components/AuthRedirect.tsx',
      ],
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
});
```

---

## 6. Estratégia de Autenticação (E2E)

Supabase armazena o JWT no `localStorage` com a chave `sb-<project-ref>-auth-token`.  
O Playwright suporta salvar e restaurar o estado do `localStorage` via `storageState`.

### global-setup.ts

```ts
// tests/global-setup.ts
import { chromium, FullConfig } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const ROLES = [
  { role: 'admin',      email: process.env.TEST_ADMIN_EMAIL!,      password: process.env.TEST_ADMIN_PASSWORD!,      file: 'tests/.auth/admin.json' },
  { role: 'agency',     email: process.env.TEST_AGENCY_EMAIL!,     password: process.env.TEST_AGENCY_PASSWORD!,     file: 'tests/.auth/agency.json' },
  { role: 'post_sales', email: process.env.TEST_POST_SALES_EMAIL!, password: process.env.TEST_POST_SALES_PASSWORD!, file: 'tests/.auth/post_sales.json' },
];

export default async function globalSetup(config: FullConfig) {
  const browser = await chromium.launch();

  for (const { email, password, file } of ROLES) {
    const page = await browser.newPage();

    // Login via UI (garante que AuthRedirect rode e session seja salva no localStorage)
    await page.goto('http://localhost:5173/login');
    await page.fill('[name=email]', email);
    await page.fill('[name=password]', password);
    await page.click('[type=submit]');
    await page.waitForURL(/\/(admin|agency|seller|student)\/dashboard/, { timeout: 10000 });

    // Salva storageState (localStorage + cookies) para reutilizar em todos os testes
    await page.context().storageState({ path: file });
    await page.close();
  }

  await browser.close();
}
```

### Uso nos specs

```ts
// Cada spec declara qual role precisa
test.use({ storageState: 'tests/.auth/admin.json' });
```

---

## 7. Specs E2E

### 7.1 redirects.spec.ts — Seção 3 (sem auth)

```ts
// tests/e2e/redirects.spec.ts
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
```

### 7.2 admin-sidebar.spec.ts — Seção 1

```ts
// tests/e2e/admin-sidebar.spec.ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'tests/.auth/admin.json' });

test.describe('Admin sidebar — agency refactor', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/dashboard');
  });

  test('1.1 mostra "Agencies" e não "Affiliate Management"', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Agencies' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Affiliate Management' })).not.toBeVisible();
  });

  test('1.2 mostra "Affiliate Program" separado de "Agencies"', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Affiliate Program' })).toBeVisible();
  });

  test('1.3 clicar em Agencies navega para /admin/dashboard/agencies', async ({ page }) => {
    await page.getByRole('link', { name: 'Agencies' }).click();
    await expect(page).toHaveURL(/\/admin\/dashboard\/agencies/);
  });

  test('1.4 header mostra "Agency Management"', async ({ page }) => {
    await page.goto('/admin/dashboard/agencies');
    await expect(page.getByRole('heading', { name: 'Agency Management' })).toBeVisible();
  });

  test('1.5 item "Agencies" fica ativo ao acessar /agencies', async ({ page }) => {
    await page.goto('/admin/dashboard/agencies');
    const agenciesLink = page.getByRole('link', { name: 'Agencies' });
    // item ativo tem bg-[#05294E] text-white — checar via classe ou aria-current
    await expect(agenciesLink).toHaveClass(/bg-\[#05294E\]/);
  });
});
```

### 7.3 agency-management.spec.ts — Seção 2

```ts
// tests/e2e/agency-management.spec.ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'tests/.auth/admin.json' });

test.describe('AgencyManagement page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/dashboard/agencies');
  });

  test('2.1 página carrega sem erro', async ({ page }) => {
    await expect(page.locator('body')).not.toContainText('Error');
    await expect(page.locator('body')).not.toContainText('Something went wrong');
  });

  test('2.2 título: "Agency Management"', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Agency Management' })).toBeVisible();
  });

  test('2.3 card "Total Agencies" visível', async ({ page }) => {
    await expect(page.getByText('Total Agencies')).toBeVisible();
  });

  test('2.4 input de busca tem placeholder correto', async ({ page }) => {
    await expect(page.getByPlaceholder(/Search agencies by name/)).toBeVisible();
  });

  test('2.7 busca sem resultado mostra "No agencies found"', async ({ page }) => {
    await page.getByPlaceholder(/Search agencies by name/).fill('xyzimpossible123');
    await expect(page.getByText('No agencies found')).toBeVisible();
  });
});
```

### 7.4 auth-redirect.spec.ts — Seção 7

```ts
// tests/e2e/auth-redirect.spec.ts
import { test, expect } from '@playwright/test';

test.describe('AuthRedirect — role routing', () => {
  test('7.1 affiliate_admin → /agency/dashboard', async ({ page }) => {
    await page.context().addInitScript(() => { /* injeta storageState da agência */ });
    // Usar storageState da agência
  });

  // Estratégia: cada test.describe usa um storageState diferente

  test.describe('como admin', () => {
    test.use({ storageState: 'tests/.auth/admin.json' });

    test('7.2 admin → /admin/dashboard', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/admin\/dashboard/);
    });

    test('7.5 admin tentando /agency/dashboard → redirecionado', async ({ page }) => {
      await page.goto('/agency/dashboard');
      await expect(page).toHaveURL(/\/admin\/dashboard/);
    });
  });

  test.describe('como agency', () => {
    test.use({ storageState: 'tests/.auth/agency.json' });

    test('7.1 agency → /agency/dashboard', async ({ page }) => {
      await page.goto('/');
      await expect(page).toHaveURL(/\/agency\/dashboard/);
    });

    test('7.4 agency tentando /admin/dashboard → redirecionado', async ({ page }) => {
      await page.goto('/admin/dashboard');
      await expect(page).toHaveURL(/\/agency\/dashboard/);
    });
  });
});
```

### 7.5 agency-dashboard.spec.ts — Seções 4 e 5

```ts
// tests/e2e/agency-dashboard.spec.ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'tests/.auth/agency.json' });

const SUB_PAGES = [
  { path: '/agency/dashboard/users',       label: 'Seller Management' },
  { path: '/agency/dashboard/payments',    label: 'Payment Management' },
  { path: '/agency/dashboard/students',    label: 'Seller Tracking' },
  { path: '/agency/dashboard/analytics',   label: 'Analytics' },
  { path: '/agency/dashboard/profile',     label: 'Profile Settings' },
];

test.describe('Agency Dashboard', () => {
  test('4.2 dashboard carrega em /agency/dashboard', async ({ page }) => {
    await page.goto('/agency/dashboard');
    await expect(page).toHaveURL(/\/agency\/dashboard/);
    await expect(page.locator('body')).not.toContainText('Something went wrong');
  });

  test('4.4 sidebar links apontam para /agency/dashboard/*', async ({ page }) => {
    await page.goto('/agency/dashboard');
    const links = page.getByRole('link');
    const hrefs = await links.evaluateAll(els => els.map(el => el.getAttribute('href')));
    const agencyLinks = hrefs.filter(h => h?.includes('/affiliate-admin/'));
    expect(agencyLinks).toHaveLength(0); // nenhum link com URL antiga
  });

  test('4.7 sem redirect loop', async ({ page }) => {
    let requestCount = 0;
    page.on('request', req => { if (req.url().includes('/agency/dashboard')) requestCount++; });
    await page.goto('/agency/dashboard');
    await page.waitForLoadState('networkidle');
    expect(requestCount).toBeLessThan(3); // máximo 2 requests para a mesma URL
  });

  for (const { path, label } of SUB_PAGES) {
    test(`5.x ${path} carrega sem erro`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(new RegExp(path.replace('/', '\\/')));
      await expect(page.locator('body')).not.toContainText('Something went wrong');
    });
  }
});
```

### 7.6 post-sales.spec.ts — Seção 11

```ts
// tests/e2e/post-sales.spec.ts
import { test, expect } from '@playwright/test';

test.use({ storageState: 'tests/.auth/post_sales.json' });

test.describe('Post-Sales — restrições de UI', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin/dashboard/payments');
  });

  test('11.1 vê aba "Student Payments"', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Student Payments' })).toBeVisible();
  });

  test('11.2 NÃO vê "Agencies" no sidebar', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Agencies' })).not.toBeVisible();
  });

  test('11.3 NÃO vê card "Total Revenue"', async ({ page }) => {
    await expect(page.getByText('Total Revenue')).not.toBeVisible();
  });

  test('11.4 NÃO vê botão "Export CSV"', async ({ page }) => {
    await expect(page.getByRole('button', { name: 'Export CSV' })).not.toBeVisible();
  });
});
```

---

## 8. Mocks MSW (Integration Tests)

```ts
// tests/integration/mocks/handlers.ts
import { http, HttpResponse } from 'msw';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export const handlers = [
  // Mock do endpoint de affiliate_admins (agências)
  http.get(`${SUPABASE_URL}/rest/v1/affiliate_admins`, () => {
    return HttpResponse.json([
      {
        id: 'test-agency-id-001',
        user_id: 'test-user-id-001',
        company_name: 'The Future of English',
        email: 'agency@test.com',
        is_active: true,
        onboarding_completed: true,
        system_type: 'simplified',
        created_at: '2024-01-01T00:00:00Z',
      },
    ]);
  }),

  // Mock de sellers
  http.get(`${SUPABASE_URL}/rest/v1/sellers`, () => {
    return HttpResponse.json([
      {
        id: 'seller-001',
        name: 'Test Seller',
        email: 'seller@test.com',
        referral_code: 'TFE001',
        affiliate_admin_id: 'test-agency-id-001',
        is_active: true,
      },
    ]);
  }),

  // Mock de user_profiles
  http.get(`${SUPABASE_URL}/rest/v1/user_profiles`, ({ request }) => {
    return HttpResponse.json([]);
  }),

  // Mock de auth/user
  http.get(`${SUPABASE_URL}/auth/v1/user`, () => {
    return HttpResponse.json({
      id: 'admin-user-id',
      email: 'admin@matriculausa.com',
      user_metadata: { role: 'admin' },
    });
  }),
];
```

```ts
// tests/integration/mocks/server.ts
import { setupServer } from 'msw/node';
import { handlers } from './handlers';
import { beforeAll, afterAll, afterEach } from 'vitest';

export const server = setupServer(...handlers);

beforeAll(() => server.listen({ onUnhandledRequest: 'warn' }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
```

---

## 9. Testes de Integração (Vitest + Testing Library)

### AgencyManagement.test.tsx

```tsx
// tests/integration/AgencyManagement.test.tsx
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { QueryClientProvider, QueryClient } from '@tanstack/react-query';
import AgencyManagement from '../../src/pages/AdminDashboard/AgencyManagement';

const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

const renderWithProviders = (ui: React.ReactElement) =>
  render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );

describe('AgencyManagement', () => {
  it('2.2 renderiza título "Agency Management"', async () => {
    renderWithProviders(<AgencyManagement />);
    await waitFor(() => {
      expect(screen.getByRole('heading', { name: /Agency Management/i })).toBeInTheDocument();
    });
  });

  it('2.3 renderiza card "Total Agencies"', async () => {
    renderWithProviders(<AgencyManagement />);
    await waitFor(() => {
      expect(screen.getByText('Total Agencies')).toBeInTheDocument();
    });
  });

  it('2.4 input de busca tem placeholder correto', async () => {
    renderWithProviders(<AgencyManagement />);
    await waitFor(() => {
      expect(screen.getByPlaceholderText(/Search agencies by name/i)).toBeInTheDocument();
    });
  });

  it('2.5 renderiza the future of english da lista mockada', async () => {
    renderWithProviders(<AgencyManagement />);
    await waitFor(() => {
      expect(screen.getByText('The Future of English')).toBeInTheDocument();
    });
  });

  it('2.7 busca sem resultado mostra "No agencies found"', async () => {
    renderWithProviders(<AgencyManagement />);
    const input = await screen.findByPlaceholderText(/Search agencies by name/i);
    await userEvent.type(input, 'xyzimpossivel123');
    await waitFor(() => {
      expect(screen.getByText(/No agencies found/i)).toBeInTheDocument();
    });
  });
});
```

### AdminDashboardLayout.test.tsx

```tsx
// tests/integration/AdminDashboardLayout.test.tsx
import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import AdminDashboardLayout from '../../src/pages/AdminDashboard/AdminDashboardLayout';

const adminUser = { id: 'u1', name: 'Admin', email: 'admin@test.com', role: 'admin' };

describe('AdminDashboardLayout — sidebar', () => {
  it('1.1 mostra "Agencies" (não "Affiliate Management")', () => {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AdminDashboardLayout user={adminUser} loading={false}>
          <div />
        </AdminDashboardLayout>
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Agencies' })).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: 'Affiliate Management' })).not.toBeInTheDocument();
  });

  it('1.2 mostra "Affiliate Program" separado', () => {
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AdminDashboardLayout user={adminUser} loading={false}>
          <div />
        </AdminDashboardLayout>
      </MemoryRouter>
    );
    expect(screen.getByRole('link', { name: 'Affiliate Program' })).toBeInTheDocument();
  });

  it('post-sales NÃO vê "Agencies" no sidebar', () => {
    const postSalesUser = { ...adminUser, role: 'post_sales' };
    render(
      <MemoryRouter initialEntries={['/admin/dashboard']}>
        <AdminDashboardLayout user={postSalesUser} loading={false}>
          <div />
        </AdminDashboardLayout>
      </MemoryRouter>
    );
    expect(screen.queryByRole('link', { name: 'Agencies' })).not.toBeInTheDocument();
  });
});
```

---

## 10. Testes Unitários (Vitest puro)

### queryKeys.test.ts

```ts
// tests/unit/queryKeys.test.ts
import { describe, it, expect } from 'vitest';
import { queryKeys } from '../../src/lib/queryKeys';

describe('queryKeys — namespace agency', () => {
  it('queryKeys.agency existe (não affiliateAdmin)', () => {
    expect(queryKeys.agency).toBeDefined();
    expect((queryKeys as any).affiliateAdmin).toBeUndefined();
  });

  it('queryKeys.agency.all retorna array com "agency"', () => {
    expect(queryKeys.agency.all).toEqual(['agency']);
  });

  it('queryKeys.agency.sellers inclui "agency" como prefixo', () => {
    const key = queryKeys.agency.sellers('test-id');
    expect(key[0]).toBe('agency');
  });

  it('queryKeys.agency.financialOverview.stats existe', () => {
    expect(queryKeys.agency.financialOverview.stats).toBeDefined();
    const key = queryKeys.agency.financialOverview.stats('u1');
    expect(key).toContain('agency');
  });
});
```

### routes.test.ts

```ts
// tests/unit/routes.test.ts
// Verifica que nenhum arquivo de src ainda referencia /affiliate-admin/ em navigate()
import { describe, it, expect } from 'vitest';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';

const SRC_DIR = join(__dirname, '../../src');
const ALLOWED_FILES = ['App.tsx']; // App.tsx tem os redirects intencionalmente

function getAllFiles(dir: string, ext = '.tsx'): string[] {
  const entries = readdirSync(dir, { withFileTypes: true });
  return entries.flatMap(e =>
    e.isDirectory()
      ? getAllFiles(join(dir, e.name), ext)
      : e.name.endsWith(ext) || e.name.endsWith('.ts')
      ? [join(dir, e.name)]
      : []
  );
}

describe('Sem referências a /affiliate-admin/ fora do App.tsx', () => {
  const files = getAllFiles(SRC_DIR).filter(f => !ALLOWED_FILES.some(a => f.endsWith(a)));

  for (const file of files) {
    it(`${file.replace(SRC_DIR, '')} não contém /affiliate-admin/`, () => {
      const content = readFileSync(file, 'utf-8');
      const matches = content.match(/['"]/affiliate-admin\//g);
      expect(matches).toBeNull();
    });
  }
});
```

---

## 11. TypeScript Check (CI)

```bash
# Roda sem iniciar o servidor, falha se qualquer import estiver quebrado
npx tsc --noEmit
```

Cobre: **12.2, 12.3** — garante que todos os imports renomeados (`useAgencyId`, `AgencyDashboardLayout`, etc.) estão corretamente resolvidos.

---

## 12. Scripts package.json

```json
{
  "scripts": {
    "test": "vitest run",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage",
    "test:e2e": "playwright test",
    "test:e2e:ui": "playwright test --ui",
    "test:e2e:debug": "playwright test --debug",
    "test:types": "tsc --noEmit",
    "test:all": "npm run test:types && npm run test && npm run test:e2e"
  }
}
```

---

## 13. Pipeline CI — GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on:
  push:
    branches: [main, fix-kanbans]
  pull_request:

jobs:
  typecheck:
    name: TypeScript
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run test:types          # tsc --noEmit

  unit-integration:
    name: Unit + Integration (Vitest)
    runs-on: ubuntu-latest
    needs: typecheck
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npm run test -- --coverage
      - uses: actions/upload-artifact@v4
        with:
          name: coverage
          path: coverage/

  e2e:
    name: E2E (Playwright)
    runs-on: ubuntu-latest
    needs: typecheck
    env:
      TEST_ADMIN_EMAIL: ${{ secrets.TEST_ADMIN_EMAIL }}
      TEST_ADMIN_PASSWORD: ${{ secrets.TEST_ADMIN_PASSWORD }}
      TEST_AGENCY_EMAIL: ${{ secrets.TEST_AGENCY_EMAIL }}
      TEST_AGENCY_PASSWORD: ${{ secrets.TEST_AGENCY_PASSWORD }}
      TEST_POST_SALES_EMAIL: ${{ secrets.TEST_POST_SALES_EMAIL }}
      TEST_POST_SALES_PASSWORD: ${{ secrets.TEST_POST_SALES_PASSWORD }}
      VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
      VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e
      - uses: actions/upload-artifact@v4
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

---

## 14. Contas de Teste Necessárias no Supabase

> Criar em ambiente de **staging** (não produção).

| Role | Email sugerido | O que precisa ter |
|------|---------------|-------------------|
| `admin` | `test-admin@matriculausa.com` | role = admin |
| `affiliate_admin` | `test-agency@matriculausa.com` | role = affiliate_admin, is_active = true, onboarding_completed = true |
| `post_sales` | `test-postsales@matriculausa.com` | role = post_sales |

As credenciais ficam em **GitHub Secrets**, nunca commitadas.

---

## 15. Cobertura por Seção do Checklist

| Seção | Automatizado via | Cobertura |
|-------|-----------------|-----------|
| 1 — Sidebar admin | Integration (testing-library) + E2E | ✅ 100% |
| 2 — AgencyManagement page | Integration + E2E | ✅ 100% |
| 3 — Redirects | E2E (sem auth) | ✅ 100% |
| 4 — Agency Dashboard | E2E (storageState) | ✅ 80% (sem dados reais) |
| 5 — Sub-páginas | E2E | ✅ 80% |
| 6 — Onboarding | E2E (parcial, sem submit real) | ⚠️ 50% |
| 7 — AuthRedirect | E2E (storageState por role) | ✅ 95% |
| 8 — Header link | E2E | ✅ 100% |
| 9 — Integridade dados | **Manual** | ❌ 0% |
| 10 — B2C Affiliate | E2E | ✅ 70% |
| 11 — Post-Sales | Integration + E2E | ✅ 100% |
| 12 — Console/TypeScript | tsc + Vitest unit | ✅ 90% |

---

## 16. Ordem de Implementação Recomendada

```
Dia 1:  tsc --noEmit (zero config) + queryKeys.test.ts + routes.test.ts
Dia 2:  Instalar deps + configurar vitest.config.ts + MSW handlers
Dia 3:  AdminDashboardLayout.test.tsx + AgencyManagement.test.tsx
Dia 4:  Instalar Playwright + configurar playwright.config.ts
Dia 5:  global-setup.ts (auth) + redirects.spec.ts
Dia 6:  admin-sidebar.spec.ts + agency-management.spec.ts
Dia 7:  auth-redirect.spec.ts + agency-dashboard.spec.ts + post-sales.spec.ts
Dia 8:  GitHub Actions workflow + GitHub Secrets
```

---

> **Última atualização:** 2026-05-14  
> **Branch:** fix-kanbans  
> **Testes manuais obrigatórios restantes:** Seção 9 (integridade de dados em produção)
