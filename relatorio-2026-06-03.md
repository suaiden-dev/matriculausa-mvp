# Relatório de Desenvolvimento — 03/06/2026

**Branch:** `tasks-admin`  
**Commits desta sessão:** `89781d0a`, `7ef0ff83`, `dced7f41`, `3d66d3f7`  
**Data:** 03/06/2026

---

## Sumário Executivo

Sessão focada em melhorias no painel de administração de agências e na página de vendas do painel da agência. Foram adicionadas colunas de comissão e receita com tooltips explicativos, reestruturada a coluna de taxas por aluno no detalhe da agência, integrado o merge da branch do Henrique (tasks-admin2) com preservação das nossas mudanças, reformulado o pipeline de progresso do aluno na tela de vendas da agência, e renomeado "Affiliate Payment Requests" para "Agency Payment Requests".

---

## 1. AgencyManagement — Coluna Agency Earnings + Platform Revenue

**Arquivo:** `src/pages/AdminDashboard/AgencyManagement.tsx`  
**Hook:** `src/hooks/useAffiliateData.ts`

### O que foi feito

**Hook (`useAffiliateData.ts`):**
- Adicionado campo `total_commission: number | null` na interface `Affiliate`
- Busca comissões da tabela `affiliate_referrals` WHERE `affiliate_code IN (códigos dos sellers da agência)`
- Agências protegidas (`PROTECTED_AGENCY_IDS`) retornam `null` para não expor dados sensíveis
- Receita calculada com `individual_fee_payments.amount` (valor líquido para a plataforma), com fallback para valor hardcoded caso não haja pagamentos registrados

```typescript
const PROTECTED_AGENCY_IDS = new Set([
  '525e4fba-5743-49c0-8ab8-f0dba284bc7a', // Brant Immigration
  'fa01ff90-b78f-4362-990a-f9d9c24e2445', // The Future of English
]);
```

**AgencyManagement.tsx:**
- Removida coluna **Status** (redundante)
- Coluna `Revenue` renomeada para **Platform Revenue** com ícone `Info` e tooltip: *"Total paid by students to the platform via this agency."*
- Coluna `Commission` renomeada para **Agency Earnings** com tooltip: *"Total commission earned by this agency based on their commission rules."*
- Adicionadas opções de sort: `total_commission-desc` e `total_commission-asc`

---

## 2. AgencyDetail — Colunas de Taxas por Aluno

**Arquivo:** `src/pages/AdminDashboard/AgencyDetail.tsx`

### Antes
Colunas: Sel. | App. | **Schol.** | **I-20**

### Depois
Colunas: Sel. | App. | **Place.** | **Reinst.** | **Control**

### Mudanças técnicas
- Interface `Student` atualizada: removido `is_scholarship_fee_paid`, adicionados `is_placement_fee_paid` e `has_paid_reinstatement_package`
- Query atualizada para buscar os novos campos do Supabase
- Receita por aluno agora usa dados reais da tabela `individual_fee_payments`:
  ```typescript
  const { data: feePayments } = await supabase
    .from('individual_fee_payments')
    .select('user_id, amount')
    .in('user_id', studentUserIds);
  // realPaymentsMap[p.user_id] = soma dos amounts
  ```

---

## 3. Merge da Branch tasks-admin2 (Henrique)

### O que Henrique havia feito
- `useAgencyQueries.ts`: renomeou `commission_rules` para camelCase (`commissionRules`), limpeza de `useCachedStudentDetails`, prefixou params não usados com `_`
- `Overview.tsx`: adicionou interface `OverviewProps` com tipagem `React.FC<OverviewProps>`, corrigiu rota `/students` → `/sales`

### Conflitos e resolução
O merge automático do Git aceitou as versões do Henrique para esses dois arquivos, **sobrescrevendo** nossas mudanças (bug fix de `staleTime`, `refetchOnMount`, `CommissionPlanCard`, `commissionRules` prop, etc.).

**Fix aplicado:** Restauramos os arquivos com `git show ae6f1570:path` e aplicamos manualmente as mudanças do Henrique em cima das nossas.

**Resultado final (ambos os arquivos):**
- Nossas features preservadas: `CommissionPlanCard`, `commissionRules`, `staleTime: 30 * 1000`, `refetchOnMount: true`
- Mudanças do Henrique aplicadas: interface TypeScript, camelCase, limpeza de código, rota corrigida

---

## 4. SellersList — Pipeline de Progresso do Aluno

**Arquivo:** `src/components/EnhancedStudentTracking/SellersList.tsx`

### Contexto
A coluna "Progress" exibia apenas checkboxes de taxas pagas. A agência não conseguia ver onde o aluno estava travado no processo.

### Mudanças de limpeza
- Removido referral code da coluna Seller (mostrava texto técnico desnecessário)
- Removida coluna Actions / botão Details

### Novo pipeline de 4 estágios

```
Cadastro → Seleção → Documentos → Candidatura
```

| Estágio | Condição |
|---------|----------|
| **Candidatura (3)** | `has_paid_selection_process_fee === true` |
| **Documentos (2)** | `onboarding_current_step` IN `[identity_verification, documents_upload]` OU `documents_status` IN `[under_review, approved]` |
| **Seleção (1)** | `onboarding_current_step` não nulo |
| **Cadastro (0)** | Fallback — só se cadastrou |

**Visual:**
- Círculos numerados (1–4), completados mostram `✓`
- Completado = verde (`bg-emerald-500`)
- Atual = azul com ring (`bg-blue-500 ring-2 ring-blue-200`)
- Pendente = cinza (`border-slate-200 text-slate-400`)
- Sem emojis (solicitado pelo usuário)

**Mensagens por estágio (português):**
- Cadastro: `"{Nome} se cadastrou. Incentive-o a iniciar o processo de seleção."`
- Seleção: `"Na etapa de seleção. Ajude-o a pagar a taxa para avançar."`
- Documentos: `"Documentos em análise. Aguardando aprovação da equipe."` / `"Documentos aprovados. Avancando para candidatura."`
- Candidatura (com pendente): `"Aguardando {Application/Placement/Control Fee} para liberar {valor}."`
- Candidatura (tudo pago): `"Todas as etapas concluidas."`

> **Decisão de design:** Commission foi removida do pipeline. A comissão pode ser liberada em diferentes momentos dependendo das regras configuradas (ex: na taxa de seleção), então não faz sentido como último estágio fixo. Os valores ficam nas colunas "Pending Amount" e "Available Amount".

---

## 5. Migração Supabase — RPC com novos campos

**Arquivo:** `project/supabase/migrations/20260604000001_add_onboarding_step_to_rpc.sql`

Recriou a função `get_affiliate_admin_profiles_with_fees` adicionando dois campos:

```sql
-- RETURNS TABLE
onboarding_current_step text,
documents_status text,

-- SELECT
up.onboarding_current_step,
COALESCE(up.documents_status, 'pending') as documents_status,
```

Migração aplicada via `mcp__supabase__apply_migration` com sucesso.

---

## 6. Rename — "Agency Payment Requests"

**4 arquivos alterados:**

| Arquivo | O que mudou |
|---------|-------------|
| `PaymentManagement/components/Tabs.tsx` | Tab button: `Affiliate Payment Requests` → `Agency Payment Requests` |
| `PaymentManagement/components/AffiliateRequests.tsx` | h2 + descrição: `affiliates` → `agencies` |
| `components/AdminDashboard/PendingPaymentsSummary.tsx` | Title no card de resumo |
| `pages/AdminDashboard/components/AffiliateRequestsSection.tsx` | h2 + descrição |

---

## 7. Arquivos Modificados

| Arquivo | Área | O que mudou |
|---------|------|-------------|
| `src/hooks/useAffiliateData.ts` | Hook | `total_commission`, `individual_fee_payments`, protected agencies |
| `src/pages/AdminDashboard/AgencyManagement.tsx` | Admin | Remove Status, Platform Revenue, Agency Earnings, tooltips, sort |
| `src/pages/AdminDashboard/AgencyDetail.tsx` | Admin | Place./Reinst./Control, receita real via `individual_fee_payments` |
| `src/hooks/useAgencyQueries.ts` | Hook | Merge Henrique + nossas features preservadas |
| `src/pages/AgencyDashboard/Overview.tsx` | Agency | Merge Henrique + nossas features preservadas |
| `src/components/EnhancedStudentTracking/SellersList.tsx` | Agency Sales | Pipeline 4 estágios, sem emojis, sem Details button |
| `supabase/migrations/20260604000001_add_onboarding_step_to_rpc.sql` | DB | RPC com `onboarding_current_step` + `documents_status` |
| `PaymentManagement/components/Tabs.tsx` | Admin | Rename label |
| `PaymentManagement/components/AffiliateRequests.tsx` | Admin | Rename label + descrição |
| `components/AdminDashboard/PendingPaymentsSummary.tsx` | Admin | Rename title |
| `pages/AdminDashboard/components/AffiliateRequestsSection.tsx` | Admin | Rename label + descrição |

---

## 8. Status Final

| Item | Status |
|------|--------|
| Agency Earnings column no AgencyManagement | ✅ Feito |
| Platform Revenue com tooltip | ✅ Feito |
| Remove coluna Status | ✅ Feito |
| AgencyDetail — Place./Reinst./Control columns | ✅ Feito |
| AgencyDetail — receita real via `individual_fee_payments` | ✅ Feito |
| Merge tasks-admin2 com preservação das nossas mudanças | ✅ Feito |
| SellersList — pipeline 4 estágios sem emojis | ✅ Feito |
| SellersList — remove referral code e Details button | ✅ Feito |
| Migração RPC com `onboarding_current_step` + `documents_status` | ✅ Aplicado no Supabase |
| "Affiliate Payment Requests" → "Agency Payment Requests" | ✅ Feito (4 arquivos) |
