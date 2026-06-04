# Relatório de Sessão — 2026-05-14

> Branches trabalhadas: `fix-kanbans` e `tasks-admin`  
> Data: 14/05/2026

---

## BRANCH: `fix-kanbans`

---

### 1. Referral Information — Student Details (Admin)

**Objetivo:** Mostrar no Student Details do admin de onde o aluno veio, incluindo o programa de afiliados B2C.

**Arquivos alterados:**
- `src/components/AdminDashboard/StudentDetails/types.ts`
  - Adicionado `'affiliate_program'` ao union type de `ReferralInfo.type`
  - Adicionado campo `affiliateId?: string`

- `src/components/AdminDashboard/StudentDetails/ReferralInfoCard.tsx`
  - Adicionado handling para tipo `affiliate_program`
  - Botão "View Affiliate Profile" com link para `/admin/dashboard/referral-affiliates/:affiliateId`
  - Cor padrão azul (`bg-blue-50`, `text-[#05294E]`) — não laranja (corrigido após feedback)

- `src/pages/AdminDashboard/AdminStudentDetails.refactored.tsx`
  - Adicionado state `affiliateProgramReferral`
  - `useEffect` que consulta tabela `affiliate_referrals` pelo `referred_id` do aluno
  - Resolve `user_profiles` e `affiliate_codes.id` do referenciador
  - Passa `type: 'affiliate_program'` com `affiliateId` para o card

---

### 2. Post-Sales — Payment Management

**Objetivo:** Re-adicionar aba "Student Payments" para post_sales e esconder cards de revenue e botão Export CSV.

**Arquivos alterados:**
- `src/pages/AdminDashboard/PaymentManagement/components/Tabs.tsx`
  - Removido wrapper `{!isPostSales && ...}` do botão "Student Payments" — agora sempre visível

- `src/pages/AdminDashboard/PaymentManagement.tsx`
  - Default tab mudou de `isPostSales ? 'zelle-payments' : 'payments'` para sempre `'payments'`
  - Removido guard `!isPostSales` do render da PaymentsTab
  - Adicionado `isPostSales={isPostSales}` como prop da PaymentsTab

- `src/pages/AdminDashboard/PaymentManagement/components/PaymentsTab.tsx`
  - Adicionada prop `isPostSales?: boolean`
  - `{!props.isPostSales && <StatsHeader />}` — esconde cards de revenue para post_sales
  - Repassa `isPostSales` para FiltersBar

- `src/pages/AdminDashboard/PaymentManagement/components/FiltersBar.tsx`
  - Adicionada prop `isPostSales?: boolean`
  - Botão "Export CSV" wrapped em `{!isPostSales && ...}`

---

### 3. Agency Refactor — Fases 1 a 4

**Objetivo:** Renomear "affiliate admin" (agências B2B) → "Agency" em todo o frontend, sem tocar no banco de dados.

**Regra mantida:** Tabela `affiliate_admins`, coluna `affiliate_admin_id`, role `'affiliate_admin'` — intocados.

#### Fase 1 — Admin Sidebar + Rota

- `src/pages/AdminDashboard/AdminDashboardLayout.tsx`
  - Item "Affiliate Management" → `"Agencies"`, path `/admin/dashboard/agencies`
  - `getActiveTab()` → `path.includes('/agencies') → 'agencies'`
  - Header: `"Agency Management"` / subtitle: `"Manage B2B agency partners"`

- `src/pages/AdminDashboard/index.tsx`
  - Lazy import `AgencyManagement` (antes `AffiliateManagement`)
  - Rota `agencies` + redirect de `affiliate-management` → `agencies`

- `src/pages/AdminDashboard/AffiliateManagement.tsx` → `AgencyManagement.tsx`
  - Labels: "Agency Management", "Total Agencies", search placeholder, empty state

#### Fase 2 — Agency Dashboard (pasta e arquivos)

- `src/pages/AffiliateAdminDashboard/` → `src/pages/AgencyDashboard/`
- `AffiliateAdminDashboardLayout.tsx` → `AgencyDashboardLayout.tsx`
- Rotas internas: `/affiliate-admin/dashboard/*` → `/agency/dashboard/*`
- `src/pages/AffiliateAdminOnboarding/` → `src/pages/AgencyOnboarding/`
- `src/pages/AffiliateAdminPendingApproval.tsx` → `src/pages/AgencyPendingApproval.tsx`

#### Fase 3 — Rotas App.tsx

- `src/App.tsx`
  - Lazy imports renomeados: `AgencyDashboard`, `AgencyOnboarding`, `AgencyPendingApproval`
  - Rotas: `/agency/dashboard/*`, `/agency/onboarding`, `/agency/pending-approval`
  - Redirects backward-compat:
    - `/affiliate-admin/onboarding` → `/agency/onboarding`
    - `/affiliate-admin/pending-approval` → `/agency/pending-approval`
    - `/affiliate-admin/dashboard/*` → `/agency/dashboard`

#### Fase 4 — Componentes e Hooks (arquivos)

- `src/components/AffiliateAdminNotifications.tsx` → `AgencyNotifications.tsx`
- `src/hooks/useAffiliateAdminId.ts` → `useAgencyId.ts`
- `src/hooks/useAffiliateAdminCheck.ts` → `useAgencyCheck.ts`
- `src/hooks/useAffiliateAdminNotifications.ts` → `useAgencyNotifications.ts`
- `src/hooks/useAffiliateAdminQueries.ts` → `useAgencyQueries.ts`
- `src/lib/queryKeys.ts` — namespace `affiliateAdmin` → `agency`, cache keys `['affiliate-admin'...]` → `['agency'...]`
- Todos os imports nos callers corrigidos (AgencyDashboard subpages, AuthRedirect, Header, Layout, Home, SellerRegistration, hooks internos)

#### Testes criados

- `project/AGENCY_REFACTOR_TESTS.md` — Checklist manual com 12 seções e 60+ testes (✅/❌/⚠️)
- `project/TEST_AUTOMATION_PLAN.md` — Plano técnico de automação:
  - Playwright (E2E) + Vitest + @testing-library/react + MSW v2
  - `playwright.config.ts`, `vitest.config.ts`, `global-setup.ts`
  - Specs: redirects, admin-sidebar, agency-management, auth-redirect, agency-dashboard, post-sales
  - MSW handlers, integration tests, unit tests
  - GitHub Actions CI workflow
  - Timeline de 8 dias

---

### 4. Agency Refactor — Fase 5 (hooks: renomear funções exportadas)

**Objetivo:** Completar o refactor renomeando as funções exportadas dentro dos arquivos de hooks (Fase 4 havia renomeado apenas os arquivos).

| Hook | Função antes | Função depois |
|------|-------------|---------------|
| `useAgencyId.ts` | `useAffiliateAdminId` | `useAgencyId` |
| `useAgencyCheck.ts` | `useAffiliateAdminCheck` | `useAgencyCheck` |
| `useAgencyNotifications.ts` | `useAffiliateAdminNotifications` | `useAgencyNotifications` |
| `useAgencyQueries.ts` | `useAffiliateAdminDataQuery` | `useAgencyDataQuery` |
| `useAgencyQueries.ts` | `useAffiliateSellersQuery` | `useAgencySellersQuery` |
| `useAgencyQueries.ts` | `useAffiliateStudentProfilesQuery` | `useAgencyStudentProfilesQuery` |
| `useAgencyQueries.ts` | `useAffiliateRevenueCalculationQuery` | `useAgencyRevenueCalculationQuery` |
| `useAgencyQueries.ts` | `useAffiliatePaymentRequestsQuery` | `useAgencyPaymentRequestsQuery` |

Callers atualizados: `AgencyNotifications.tsx`, `SellerRegistrationLinkGenerator.tsx`, `SellerRegistrationsManager.tsx`, `SellerRegistrationsManagerSimple.tsx`, `DirectSalesLink.tsx`, `UtmTracking.tsx`, `EnhancedStudentTrackingRefactored.tsx`, `Overview.tsx`, `HowItWorks.tsx`, `useDynamicFees.ts`, `useI20DeadlineMonitor.ts`

---

### 5. Formulário do Aluno — Etapa 2 (SelectionSurveyStep): Remoção do Q4 antigo

**Q4 original removida:** "Você está atualmente nos EUA?" + sub-campos "Qual status atual?" e "Data de expiração do status/I-94".

**Motivo:** Redundante com Q5 (perfil) e seus sub-itens. Dados só iam para blob JSON na tabela `submissions`, sem uso em lógica de negócio.

- `src/data/formQuestions.ts` — Q4 removida
- `src/components/form/QuestionField.tsx` — Bloco de render dos extras do Q4 removido
- `src/pages/StudentOnboarding/components/SelectionSurveyStep.tsx` — Validação de `answers[-4]` e `answers[-41]` removida

---

### 6. Formulário do Aluno — Q5.4: Data I-94 apenas para COS

**Objetivo:** Mover a pergunta do I-94 para ser sub-pergunta exclusiva de COS (3 sub-perguntas no total).

- `src/data/formQuestions.ts` — Adicionada `Q5.4` (`type: 'date'`, `conditionalOn: { questionId: 5, value: 'cos' }`)
- i18n PT/EN/ES — `"5_4"` adicionado em `registration.json`

**Resultado para COS:** Q5 → Q5.2 (prazo) → Q5.3 (extensão) → Q5.4 (data I-94)

---

### 7. Formulário do Aluno — Q4 nova: Dependentes (migrado do QuickRegistration)

**Objetivo:** Mover a pergunta "Quantos dependentes?" do formulário de pagamento (QuickRegistration) para o questionário do aluno (etapa 2), coletando a info antes do pagamento.

- `src/data/formQuestions.ts` — Q4 como `radio` com opções `'0'` a `'5'`
- i18n PT/EN/ES — Q4 atualizada para pergunta de dependentes com 6 opções
- `src/pages/StudentOnboarding/components/SelectionSurveyStep.tsx` — `dependents: parseInt(currentAnswers[4])` salvo em `user_profiles` no submit
- `src/pages/QuickRegistration.tsx` — Campo de dependentes removido (select + validação + payload)

---

## BRANCH: `tasks-admin`

---

### 8. ReferralAffiliatesManagement — Melhorias (Admin)

**Commit:** `dea10bd1` — 14/05 16:31

- `src/pages/AdminDashboard/ReferralAffiliatesManagement.tsx`
  - Refactor completo da página de gestão de afiliados B2C
  - Melhoria de layout, estatísticas e filtros

---

### 9. AffiliateDetails — Nova página de detalhes do afiliado B2C

**Commit:** `06f5d6bc` — 14/05 16:58

- `src/pages/AdminDashboard/AffiliateDetails.tsx` — **Nova página** (702 linhas)
  - Detalhes completos do afiliado: performance, saldo, histórico de saques, referrals
- `src/pages/AdminDashboard/ReferralAffiliatesManagement.tsx` — Refactor para usar AffiliateDetails
- `src/pages/AdminDashboard/AdminDashboardLayout.tsx` — Ajuste de sidebar
- `src/pages/AdminDashboard/index.tsx` — Rota para AffiliateDetails adicionada

---

### 10. RejectDocumentModal + Script de Recuperação

**Commit:** `85aa5371` — 14/05 17:36

- `src/components/AdminDashboard/StudentDetails/RejectDocumentModal.tsx`
  - Modal de rejeição de documento com campos de motivo e feedback
  - Melhorias no layout e usabilidade
- `project/scripts/recover-retry.cjs` — **Novo script** (105 linhas)
  - Script para reprocessar tasks de geração de PDF legal que falharam

---

### 11. ReferralInfoCard — Cor corrigida + AdminStudentDetails referral query

**Commit:** `9f174afd` — 14/05 18:02

- `src/components/AdminDashboard/StudentDetails/ReferralInfoCard.tsx`
  - Cor alterada de laranja para azul padrão da página (`bg-blue-50`, `text-[#05294E]`)
- `src/components/AdminDashboard/StudentDetails/types.ts`
  - `affiliateId?: string` adicionado
- `src/pages/AdminDashboard/AdminStudentDetails.refactored.tsx`
  - Query na tabela `affiliate_referrals` para buscar afiliado B2C que referenciou o aluno
- `src/pages/AdminDashboard/PaymentManagement.tsx` + `FiltersBar.tsx` + `PaymentsTab.tsx` + `Tabs.tsx`
  - Post-sales: Student Payments sempre visível, revenue cards e Export CSV ocultos para post_sales

---

### 12. Agency Refactor (Fases 1-4) — Commit principal

**Commit:** `2497fa8c` — 14/05 19:06

- Todos os arquivos da Fase 4 do refactor (hooks renomeados, imports atualizados, AgencyDashboard, AgencyOnboarding, AgencyPendingApproval, App.tsx, AuthRedirect, Header, Layout, queryKeys, etc.)
- 43 arquivos alterados

---

### 13. Formulário + QuickRegistration — Commit

**Commit:** `440b477c` — 14/05 20:06

- Q4 form, Q5.4 I-94, dependentes migrados, QuickRegistration limpo
- 9 arquivos alterados

---

### 14. Infraestrutura de Testes — Scaffolding (não commitado)

**Arquivos criados (untracked):**

- `project/playwright.config.ts` — Configuração do Playwright
- `project/vitest.config.ts` — Configuração do Vitest
- `project/tests/global-setup.ts` — Auth por storageState (login uma vez por role)
- `project/tests/setup.ts`
- `project/tests/e2e/`
  - `redirects.spec.ts`
  - `admin-sidebar.spec.ts`
  - `agency-management.spec.ts`
  - `auth-redirect.spec.ts`
  - `agency-dashboard.spec.ts`
  - `agency-data-consistency.spec.ts`
  - `post-sales.spec.ts`
  - `fixtures/`
- `project/tests/integration/`
  - `AgencyManagement.test.tsx`
  - `AdminDashboardLayout.test.tsx`
  - `mocks/`
- `project/tests/unit/`
  - `hooks/`
  - `routes.test.ts`

---

### 15. Edge Function — invite-agency-user (não commitado)

- `project/supabase/functions/invite-agency-user/index.ts`
  - Edge Function Deno para convidar usuários de agência
  - Recebe `email`, `full_name`, `company_name`, `agency_request_id`
  - Cria usuário via Supabase Auth Admin API

---

### 16. AuthRedirect — Legacy Redirects (não commitado)

- `src/components/AuthRedirect.tsx`
  - Bloco de redirects de legado adicionado antes da verificação de auth:
    ```
    /affiliate-admin/onboarding       → /agency/onboarding
    /affiliate-admin/pending-approval → /agency/pending-approval
    /affiliate-admin/dashboard        → /agency/dashboard
    /admin/dashboard/affiliate-management → /admin/dashboard/agencies
    ```

- `src/App.tsx`
  - Rota: `/admin/dashboard/affiliate-management` → redirect para `/admin/dashboard/agencies`

---

## Resumo geral por categoria

| Categoria | Arquivos | Status |
|-----------|----------|--------|
| Agency Refactor (Fases 1-4) | ~50 arquivos | ✅ Commitado |
| Agency Refactor (Fase 5 — hook exports) | 16 arquivos | ✅ Commitado |
| Post-Sales Payment Management | 4 arquivos | ✅ Commitado |
| Referral Info Card (Student Details) | 3 arquivos | ✅ Commitado |
| AffiliateDetails (nova página B2C) | 4 arquivos | ✅ Commitado |
| RejectDocumentModal + script recover | 2 arquivos | ✅ Commitado |
| Formulário Q4/Q5.4/dependentes | 9 arquivos | ✅ Commitado |
| Infraestrutura de testes (E2E + unit) | ~15 arquivos | ⚠️ Não commitado |
| Edge Function invite-agency-user | 1 arquivo | ⚠️ Não commitado |
| AuthRedirect legacy redirects | 2 arquivos | ⚠️ Não commitado |
| AGENCY_REFACTOR_TESTS.md | 1 arquivo | ✅ Commitado |
| TEST_AUTOMATION_PLAN.md | 1 arquivo | ✅ Commitado |

---

> **Gerado em:** 2026-05-14 20:53  
> **Branches:** `fix-kanbans` + `tasks-admin`
