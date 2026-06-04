# Spec: Reestruturação do Sistema de Agências e Comissões

**Data:** 2026-05-05  
**Status:** Em planejamento  
**Branch sugerida:** `feature/agency-commission`

---

## Contexto

O sistema atual possui "Admins de Afiliados" com sellers vinculados e um sistema de comissão fixo. A reestruturação visa:

1. Renomear o conceito para **Agências**
2. Tornar a comissão **configurável por agência** (valor fixo em USD por venda de `selection_process`)
3. Consolidar o entendimento de que **sellers não têm comissão** — só a agência
4. Manter o mecanismo de **direct-sales** já existente (seller virtual sem user_id)
5. **Não quebrar** dados nem fluxos das agências existentes (BRANT, TFOE)

---

## O que já foi feito

- [x] Migration 1: `commission_per_sale` adicionado em `affiliate_admins`
- [x] Migration 2: `commission_amount` adicionado em `affiliate_referrals`
- [x] Migration 3: RPC `register_payment_billing` atualizada com lógica de comissão por agência
- [x] Bug fix: onboarding não volta mais para selfie após foto enviada (`identity_photo_path`)
- [x] Notificações de `ds160_package` e `i539_cos_package` renomeadas para `Control Fee`
- [x] Notificações Stripe adicionadas para `verify-stripe-session-package-fee`

---

## O que falta implementar

---

### P0 — Crítico (sem isso o sistema de comissão não funciona)

#### [P0-1] Campo de configuração de comissão por agência
**Onde:** `src/pages/AdminDashboard/AffiliateManagement.tsx`  
**O que fazer:**
- Adicionar campo `commission_per_sale` (input numérico USD) na linha/card de cada agência
- Botão salvar que faz `UPDATE affiliate_admins SET commission_per_sale = X WHERE id = Y`
- Mostrar valor atual se já configurado, placeholder "Não configurado" se NULL
- Apenas super admin pode editar

**Comportamento:**
- NULL = agência sem comissão (comportamento anterior mantido)
- Qualquer valor > 0 = comissão ativa para próximas vendas de selection_process
- Não retroativo (não altera `affiliate_referrals` existentes)

---

### P1 — Alta prioridade (visibilidade do sistema)

#### [P1-1] Dashboard de saldo de comissão por agência
**Onde:** `src/pages/AdminDashboard/AffiliateManagement.tsx` (novo bloco por agência)  
**O que mostrar:**

| Campo | Cálculo |
|---|---|
| Comissão por venda | `affiliate_admins.commission_per_sale` |
| Total vendas comissionadas | `COUNT(affiliate_referrals)` onde `commission_amount IS NOT NULL` |
| Total comissão acumulada | `SUM(affiliate_referrals.commission_amount)` |
| Total já pago | `SUM(affiliate_payment_requests.amount_usd)` onde `status = 'paid'` |
| **Saldo a receber** | acumulada − já pago |

**Query base:**
```sql
SELECT
  aa.name,
  aa.commission_per_sale,
  COUNT(ar.id) FILTER (WHERE ar.commission_amount IS NOT NULL)    AS vendas_comissionadas,
  COALESCE(SUM(ar.commission_amount), 0)                         AS total_acumulado,
  COALESCE(SUM(apr.amount_usd) FILTER (WHERE apr.status = 'paid'), 0) AS total_pago,
  COALESCE(SUM(ar.commission_amount), 0)
    - COALESCE(SUM(apr.amount_usd) FILTER (WHERE apr.status = 'paid'), 0) AS saldo
FROM affiliate_admins aa
LEFT JOIN sellers s ON s.affiliate_admin_id = aa.id
LEFT JOIN affiliate_referrals ar ON ar.affiliate_code = s.referral_code
LEFT JOIN affiliate_payment_requests apr ON apr.referrer_user_id = aa.user_id
WHERE aa.id = :agency_id
GROUP BY aa.id;
```

#### [P1-2] Visão da agência — seu próprio saldo
**Onde:** Dashboard do affiliate admin (página que a agência vê ao logar)  
**O que mostrar:**
- Saldo atual a receber
- Histórico de comissões (data, aluno, seller, valor)
- Botão "Solicitar pagamento" → cria `affiliate_payment_requests`
- Histórico de pagamentos recebidos

---

### P2 — Média prioridade (qualidade e consistência)

#### [P2-1] Renomear "Admin de Afiliados" → "Agência" na UI
**Escopo:** Apenas labels, títulos, textos de UI — zero alteração no banco  
**Arquivos afetados:**
- `src/pages/AdminDashboard/AffiliateManagement.tsx`
- `src/pages/AdminDashboard/AffiliatePaymentRequests.tsx`
- `src/components/AffiliateAdminNotifications.tsx`
- `src/components/AdminDashboard/StudentDetails/ReferralInfoCard.tsx`
- Qualquer outro texto "affiliate admin" / "admin de afiliados" visível na UI
- Arquivos de tradução (i18n) se existirem

**Regra:** Trocar apenas o que o usuário vê. Variáveis, nomes de função, tabelas do banco — manter como estão.

#### [P2-2] Sellers sem coluna commission_rate na UI
**O que fazer:**
- Remover qualquer exibição de `commission_rate` do seller na UI
- Deixar claro que comissão é da agência, não do seller
- Sellers continuam existindo e referenciando alunos normalmente

#### [P2-3] Histórico de comissões por venda (tabela detalhada)
**Onde:** AffiliateManagement (admin) e dashboard da agência  
**Colunas:** Data | Aluno | Seller | Valor pago pelo aluno | Comissão gerada

---

### P3 — Baixa prioridade (melhorias futuras)

#### [P3-1] Comissão por agência também em % (além de valor fixo)
- Adicionar `commission_type` (enum: `fixed` | `percentage`) em `affiliate_admins`
- Se `percentage`: `commission_amount = amount_param * commission_per_sale / 100`
- Se `fixed`: `commission_amount = commission_per_sale` (comportamento atual)
- **Não bloqueia o P0 — implementar depois que o fixo estiver funcionando**

#### [P3-2] Configurar quais fee_types geram comissão por agência
- Hoje: hardcoded para `selection_process`
- Futuro: tabela de configuração `agency_commission_rules` (fee_type, commission_amount)
- Permite agências com modelos de comissão diferentes

#### [P3-3] Notificação para agência ao receber nova comissão
- Criar notificação em `affiliate_admin_notifications` do tipo `commission_earned`
- Disparar dentro da RPC `register_payment_billing` após gravar

#### [P3-4] Relatório mensal de comissões (PDF/CSV)
- Export do histórico de comissões por período
- Para uso da agência no fechamento mensal

---

## Resumo de Prioridades

| ID | Descrição | Prioridade | Depende de |
|---|---|---|---|
| P0-1 | Campo configurar comissão por agência | 🔴 Crítico | — |
| P1-1 | Dashboard saldo admin view | 🟠 Alta | P0-1 |
| P1-2 | Dashboard saldo agency view | 🟠 Alta | P0-1 |
| P2-1 | Renomear para "Agência" na UI | 🟡 Média | — |
| P2-2 | Remover commission_rate de sellers na UI | 🟡 Média | — |
| P2-3 | Histórico detalhado de comissões | 🟡 Média | P1-1 |
| P3-1 | Comissão em % além de fixo | 🟢 Baixa | P0-1 |
| P3-2 | Configurar fee_types por agência | 🟢 Baixa | P3-1 |
| P3-3 | Notificação ao receber comissão | 🟢 Baixa | P0-1 |
| P3-4 | Relatório mensal PDF/CSV | 🟢 Baixa | P1-2 |

---

## Fluxo completo após implementação

```
Super admin configura commission_per_sale = $50 para agência XPTO
  ↓
Aluno vinculado ao seller da agência XPTO paga selection_process ($400)
  ↓
register_payment_billing('selection_process', 400) é chamado
  ↓
RPC detecta agência XPTO com commission_per_sale = $50
  ↓
affiliate_referrals inserido com commission_amount = 50.00
  ↓
Dashboard admin mostra: agência XPTO — saldo a receber $50
Dashboard agência mostra: $50 disponível para saque
  ↓
Agência solicita pagamento → affiliate_payment_requests criado (status: pending)
  ↓
Admin aprova → status: approved
Admin marca como pago → status: paid, saldo reduz $50
```

---

## Arquivos de Referência

| Arquivo | Relevância |
|---|---|
| `agency-commission-migration.md` | Migrations já aplicadas + queries úteis |
| `supabase/migrations/20260505000001_*.sql` | Migration commission_per_sale |
| `supabase/migrations/20260505000002_*.sql` | Migration commission_amount |
| `supabase/migrations/20260505000003_*.sql` | RPC atualizada |
| `supabase/migrations/20250131000005_*.sql` | RPC original (referência) |
| `src/pages/AdminDashboard/AffiliateManagement.tsx` | Página principal a modificar |
| `src/pages/AdminDashboard/AffiliatePaymentRequests.tsx` | Gestão de saques |
| `src/hooks/useAffiliateData.ts` | Hook de dados de afiliados |
| `src/services/AffiliatePaymentRequestService.ts` | Service de saques |

---

## Notas importantes

- **Sellers nunca tiveram comissão** — apenas referenciam alunos. Qualquer coluna `commission_rate` em sellers é legado não utilizado.
- **Direct-sales já funciona** — seller virtual sem user_id, usado pelas agências para vendas diretas. Não precisa de alteração.
- **BRANT e TFOE** — não são afetadas por nada aqui até o super admin configurar `commission_per_sale` para elas.
- **Retroatividade** — o sistema não é retroativo por design. Comissões passadas (antes desta migration) ficam com `commission_amount = NULL`.
