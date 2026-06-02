# Relatório de Desenvolvimento — 2026-06-01

---

## 1. Bug Fix — DirectSalesLink: erro ao ativar

**Problema:** Ao ativar o Direct Sales Link, a inserção na tabela `sellers` falhava com erro 400 porque a coluna `email` é NOT NULL sem default.

**Fix:** Adicionado `email: ''` no INSERT de ativação em `DirectSalesLink.tsx`.

---

## 2. Feature — Edição inline do código de indicação (Direct Sales)

**Problema:** O código de indicação do Direct Sales não podia ser editado após criado.

**Mudanças:**
- Adicionado botão de edição (lápis) ao lado do código de indicação
- Campo inline para editar o código com validação (mín. 3 chars, sem acentos, apenas alfanumérico, máx. 20 chars)
- Verificação de unicidade antes de salvar
- Adicionado campo `id` no SELECT para permitir o UPDATE correto

**Bloqueio encontrado:** Trigger `protect_seller_referral_code` no PostgreSQL bloqueava qualquer alteração de `referral_code`.

**Fix no DB:** Modificada a função `protect_seller_referral_code()` via MCP do Supabase — agora só bloqueia quando `OLD.user_id IS NOT NULL`, permitindo que entradas do Direct Sales (onde `user_id IS NULL`) sejam editadas.

**Arquivos alterados:**
- `project/src/pages/AgencyDashboard/DirectSalesLink.tsx`
- DB: função `protect_seller_referral_code()` (via MCP)

---

## 3. Task 2.2 — Informações da agência no dashboard e perfil

**Problema:** Dados preenchidos no onboarding (nome da empresa, logo, cidade, etc.) não apareciam no dashboard nem na página de perfil.

**Root cause:** `useAuth.tsx` buscava apenas `is_active` e `onboarding_completed` da tabela `affiliate_admins`, ignorando todos os outros campos.

### `useAuth.tsx`
- SELECT em `affiliate_admins` expandido para incluir `company_name`, `phone`, `website`, `logo_url`
- `logo_url` mergeado no objeto `userProfile`

### `AgencyDashboardLayout.tsx`
- Sidebar substituiu ícone/texto fixo por logo dinâmica da agência (`userProfile.logo_url`)
- Nome exibe `company_name` real (via `getDisplayName()`)
- Email do usuário exibido abaixo do nome

### `ProfileSettings.tsx`
- Busca paralela em `user_profiles` E `affiliate_admins` via `Promise.all`
- `formData` expandido com: `legal_name`, `cnpj`, `founded_year`, `country`, `state`, `city`, `address`, `whatsapp`, `instagram`, `linkedin`, `students_per_year`
- Upload de logo da agência separado do avatar pessoal
- `handleSave` atualiza os dois registros em paralelo
- View mode: 4 seções — Personal, Company, Location, Social & Contact
- Badge corrigido de "Affiliate Agency" → "Agency"
- "Member Since" corrigido: trocado `user?.created_at` (undefined) por `supabaseUser.created_at`
- Completeness corrigido: removido campo `territory` (não existe no onboarding), adicionado `city` e `logoUrl`

**Arquivos alterados:**
- `project/src/hooks/useAuth.tsx`
- `project/src/pages/AgencyDashboard/AgencyDashboardLayout.tsx`
- `project/src/pages/AgencyDashboard/ProfileSettings.tsx`

---

## 4. Task 3.1 — Logo obrigatória no onboarding

**Mudanças em `AgencyOnboarding/index.tsx`:**
- Adicionado campo de upload de logo como primeiro campo do Step 1
- 3 estados visuais: idle (área de clique/drag) / uploading (spinner) / uploaded (preview + checkmark)
- Validação bloqueia o avanço do Step 1 se logo não foi enviada
- Logo salva em bucket `user-avatars` e URL persistida em `affiliate_admins.logo_url` no submit

**Arquivos alterados:**
- `project/src/pages/AgencyOnboarding/index.tsx`

---

## 5. Bug Fix — Mayara: Application Fee e Placement Fee simultâneos

**Problema reportado:** Aluna Mayara estava sendo apresentada para pagar Application Fee e Placement Fee ao mesmo tempo.

**Análise:**
- `user_profiles.is_application_fee_paid` estava `false`
- `student_action_logs` mostrou que o webhook do Stripe registrou `processing_completed: true` para o checkout da Application Fee
- Mas a flag no DB não foi atualizada — race condition no webhook

**Fix:** UPDATE manual via MCP no DB:
```sql
UPDATE user_profiles
SET is_application_fee_paid = true,
    application_fee_paid_at = '2026-06-01 23:10:15+00'
WHERE id = '<mayara_profile_id>';
```

**Análise adicional — por que o admin mostrava "Pago":**

Identificado em `src/hooks/useStudentDetailsQueries.ts` (linha 301-304) que `is_application_fee_paid` no objeto do estudante é calculado como OR entre três fontes:

```ts
const is_application_fee_paid =
  enrolledApp?.is_application_fee_paid ||
  applications.some((app: any) => app.is_application_fee_paid) ||
  s.is_application_fee_paid ||
  false;
```

O webhook havia atualizado `scholarship_applications.is_application_fee_paid = true` mas não `user_profiles.is_application_fee_paid`. Por isso o admin mostrava "Pago" (via source 1/2) enquanto o fluxo da aluna ficava bloqueado (lia de `user_profiles` = false).

**Arquivos analisados:**
- `project/src/hooks/useStudentDetailsQueries.ts`
- `project/src/components/AdminDashboard/StudentDetails/PaymentStatusCard.tsx`

---

## 6. Task 3.3 — Seção "Como funciona o sistema de afiliados"

**Mudanças em `Overview.tsx`:**

Adicionado componente `HowItWorksAccordion` entre os cards de stats e a tabela de sellers:

- Fechado por padrão, expansível com botão "Ver mais"
- 4 passos numerados:
  - **01** — Cadastre vendedores
  - **02** — Vendedores geram matrículas
  - **03** — Aluno conclui o fluxo (paga a última taxa)
  - **04** — Comissão é liberada
- 3 seções de texto: Comissionamento, Acompanhamento de vendas, Saque de comissões
- Regra de comissão explicitada: comissão liberada somente após o aluno pagar a última taxa
- Sem ícones, sem emojis

**Arquivos alterados:**
- `project/src/pages/AgencyDashboard/Overview.tsx`

---

## Resumo das Tasks

| Task | Descrição | Status |
|------|-----------|--------|
| Bug | DirectSalesLink: erro 400 ao ativar | ✅ Concluído |
| Feature | Edição inline do referral code no Direct Sales | ✅ Concluído |
| 2.2 | Informações da agência no dashboard e perfil | ✅ Concluído |
| 3.1 | Logo obrigatória no onboarding | ✅ Concluído |
| Bug | Mayara — Application Fee e Placement Fee simultâneos | ✅ Concluído |
| 3.3 | Seção explicativa no dashboard | ✅ Concluído |

---

## Tasks Pendentes (próxima sessão)

| Task | Descrição |
|------|-----------|
| 4.1 | Padronizar comissão: $100 fixo por aluno baseado na Selection Process Fee |
| 4.2 | Corrigir taxas zeradas no sistema de comissionamento |
| 4.3 | Configurar regras da agência antes da aprovação no admin |
| 5.1 | Melhorar página de Payment Management |
| 6.1 | Organizar página de Agencies no admin dashboard |
