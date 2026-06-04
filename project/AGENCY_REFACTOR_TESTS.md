# Testes — Refactor Affiliate Admin → Agency

> Marque cada item com ✅ (passou), ❌ (falhou) ou ⚠️ (parcial).  
> Testar com usuário **admin** E com usuário **the future of english** (affiliate_admin ativo).

---

## 1. Admin Dashboard — Sidebar e Navegação

| # | Teste | Resultado |
|---|-------|-----------|
| 1.1 | Logar como admin → sidebar mostra item **"Agencies"** (não "Affiliate Management") | |
| 1.2 | Sidebar mostra item **"Affiliate Program"** separado de "Agencies" | |
| 1.3 | Clicar em "Agencies" → navega para `/admin/dashboard/agencies` | |
| 1.4 | Header da página mostra **"Agency Management"** e subtítulo "Manage B2B agency partners" | |
| 1.5 | Item "Agencies" fica **destacado/ativo** enquanto na página | |
| 1.6 | Clicar em "Affiliate Program" → navega para `/admin/dashboard/referral-affiliates` | |
| 1.7 | Item "Affiliate Program" fica destacado ao acessar `/referral-affiliates` | |

---

## 2. Admin Dashboard — Página Agency Management

| # | Teste | Resultado |
|---|-------|-----------|
| 2.1 | Página carrega sem erro | |
| 2.2 | Título da página: **"Agency Management"** | |
| 2.3 | Card de stats mostra **"Total Agencies"** (não "Total Affiliates") | |
| 2.4 | Campo de busca: placeholder "Search agencies by name..." | |
| 2.5 | The Future of English aparece na lista | |
| 2.6 | Contador "Showing X of Y agencies" aparece corretamente | |
| 2.7 | Empty state mostra "No agencies found" ao buscar algo inexistente | |

---

## 3. Redirects de URL antigas → novas

| # | Teste | Resultado |
|---|-------|-----------|
| 3.1 | Acessar `/admin/dashboard/affiliate-management` → redireciona para `/admin/dashboard/agencies` | |
| 3.2 | Acessar `/affiliate-admin/dashboard` → redireciona para `/agency/dashboard` | |
| 3.3 | Acessar `/affiliate-admin/onboarding` → redireciona para `/agency/onboarding` | |
| 3.4 | Acessar `/affiliate-admin/pending-approval` → redireciona para `/agency/pending-approval` | |

---

## 4. Agency Dashboard (the future of english)

> Logar com a conta da agência ativa.

| # | Teste | Resultado |
|---|-------|-----------|
| 4.1 | Login redireciona para `/agency/dashboard` (não `/affiliate-admin/dashboard`) | |
| 4.2 | Dashboard carrega sem erro em `/agency/dashboard` | |
| 4.3 | Sidebar da agência mostra todos os itens: Overview, Seller Management, Payment Management, Seller Tracking, My Students, Analytics, UTM Tracking, Profile Settings | |
| 4.4 | Links do sidebar apontam para `/agency/dashboard/*` | |
| 4.5 | Dados da agência carregam (sellers visíveis) | |
| 4.6 | Alunos dos sellers aparecem normalmente | |
| 4.7 | Notificações da agência funcionam (sino no header) | |

---

## 5. Agency Dashboard — Sub-páginas

| # | Teste | Resultado |
|---|-------|-----------|
| 5.1 | `/agency/dashboard/users` (Seller Management) — carrega, sellers listados | |
| 5.2 | `/agency/dashboard/payments` (Payment Management) — carrega | |
| 5.3 | `/agency/dashboard/students` (Seller Tracking) — carrega, alunos listados | |
| 5.4 | `/agency/dashboard/my-students` — carrega | |
| 5.5 | `/agency/dashboard/analytics` — carrega | |
| 5.6 | `/agency/dashboard/utm-tracking` — carrega | |
| 5.7 | `/agency/dashboard/profile` — carrega, dados da agência visíveis | |

---

## 6. Onboarding de nova agência

| # | Teste | Resultado |
|---|-------|-----------|
| 6.1 | `/agency/onboarding` carrega o formulário de 4 etapas | |
| 6.2 | Formulário completo → submete → redireciona para `/agency/pending-approval` | |
| 6.3 | `/agency/pending-approval` carrega a tela de espera | |

---

## 7. AuthRedirect — Comportamento de login por role

| # | Teste | Resultado |
|---|-------|-----------|
| 7.1 | Logar como `affiliate_admin` → redireciona para `/agency/dashboard` | |
| 7.2 | Logar como `admin` → redireciona para `/admin/dashboard` | |
| 7.3 | Logar como `seller` → redireciona para `/seller/dashboard` | |
| 7.4 | `affiliate_admin` tentando acessar `/admin/dashboard` → redirecionado para `/agency/dashboard` | |
| 7.5 | `admin` tentando acessar `/agency/dashboard` → redirecionado para `/admin/dashboard` | |
| 7.6 | `affiliate_admin` sem onboarding completo → redireciona para `/agency/onboarding` | |
| 7.7 | `affiliate_admin` com onboarding completo mas inativo → redireciona para `/agency/pending-approval` | |

---

## 8. Header — Link "Meu Dashboard"

| # | Teste | Resultado |
|---|-------|-----------|
| 8.1 | Logado como `affiliate_admin` → Header aponta para `/agency/dashboard` | |

---

## 9. Dados — Integridade (crítico)

| # | Teste | Resultado |
|---|-------|-----------|
| 9.1 | Admin vê the future of english na lista de agencies com dados corretos (sellers, alunos, revenue) | |
| 9.2 | Dentro do agency dashboard, os sellers da the future of english aparecem | |
| 9.3 | Alunos dos sellers aparecem com pagamentos corretos | |
| 9.4 | Financials / revenue calculado igual ao antes do refactor | |
| 9.5 | Nenhum dado foi alterado no banco (affiliate_admins, sellers, user_profiles) | |

---

## 10. Affiliate Program (B2C) — Não afetado

> Confirmar que o programa de afiliados B2C (MatriculaCoins) continua funcionando.

| # | Teste | Resultado |
|---|-------|-----------|
| 10.1 | `/admin/dashboard/referral-affiliates` carrega normalmente | |
| 10.2 | Detalhes de afiliado (`/referral-affiliates/:id`) carregam | |
| 10.3 | Dashboard B2C do afiliado `/affiliate/dashboard` funciona | |
| 10.4 | Saldo de coins, histórico e solicitações de saque visíveis | |

---

## 11. Post-Sales — Não afetado

| # | Teste | Resultado |
|---|-------|-----------|
| 11.1 | Logar como post_sales → vê aba "Student Payments" no Payment Management | |
| 11.2 | Post-sales NÃO vê "Agencies" no sidebar | |
| 11.3 | Post-sales NÃO vê cards de revenue (Total Revenue, Stripe, Zelle...) | |
| 11.4 | Post-sales NÃO vê botão "Export CSV" | |

---

## 12. Console — Sem erros críticos

| # | Teste | Resultado |
|---|-------|-----------|
| 12.1 | Abrir DevTools → Console sem erros de módulo não encontrado (`Failed to fetch dynamically imported module`) | |
| 12.2 | Sem erros TypeScript no terminal (`npm run build` ou `tsc --noEmit`) | |
| 12.3 | Sem 404 em imports de hooks (`useAgencyId`, `useAgencyQueries`, etc.) | |
| 12.4 | Sem loops de redirect (verificar network tab ao acessar `/agency/dashboard`) | |

---

## Bugs encontrados

| # | Descrição | Arquivo/Rota | Status |
|---|-----------|--------------|--------|
| | | | |
| | | | |

---

> **Última atualização:** 2026-05-14  
> **Branch:** fix-kanbans
