# Daily Report — 2026-06-12

## Resumo Geral

Sessão dupla cobrindo dois projetos: **plataforma de traduções certificadas** (seção 1–11) e **Matrícula USA MVP** (seção 12–17). Foco principal do dia: fluxo de pagamento gratuito via cupom 100% no onboarding do aluno, e múltiplos ajustes de UX/admin no sistema de traduções.

---

## [Projeto: Traduções Certificadas]

### 1. Modal de Documentos Certificados — Dashboard do Cliente

**Arquivo:** `src/routes/dashboard/orders.tsx`

- Criado tipo `CertFile = { name: string; url: string }`
- Funções `fileType()` (detecta pdf/image/other pela extensão) e `triggerDownload()` (fetch → blob → objectURL, sem expor URL no DOM)
- Componente `CertModal` com `createPortal(..., document.body)` — resolve o bug recorrente da sidebar aparecendo atrás do modal
- Modal exibe PDF em `<iframe>` ou imagem em `<img>` dependendo do tipo detectado
- Coluna dedicada **"Certified Document"** na tabela de pedidos
- Botão "View document" + ícone de download lado a lado (desktop e mobile)
- Nota "Available for 60 days" abaixo dos botões
- i18n adicionado: `certDoc`, `certDocExpiry`, `certDocView` em EN/PT/ES

---

### 2. Bug Fix — Sidebar Visível em Todos os Modais

**Arquivos:** `src/routes/dashboard/orders.tsx`, `src/routes/admin/orders.tsx`

- Causa raiz: modais renderizados dentro do DOM da sidebar herdavam seu stacking context
- Fix aplicado em todos os modais com `createPortal(jsx, document.body)` + `z-[9999]` / `z-[99999]`
- Modais afetados: `CertModal`, `AdminCertModal`, `OrderModal` (admin)

---

### 3. Seção Certified Documents — Modal do Admin

**Arquivo:** `src/routes/admin/orders.tsx`

- Componente `AdminCertModal` com `createPortal` e `z-[99999]`
- Seção "Certified Documents" dentro do `OrderModal` com card verde por arquivo
- Botões **View** e **Download** por documento
- Badge **"Certified"** na coluna Translation da tabela (desktop + mobile) com `items-start` para não esticar a linha inteira

---

### 4. Paginação — Admin Orders

**Arquivo:** `src/routes/admin/orders.tsx`

- `PAGE_SIZE = 20`, estado `[page, setPage]`
- `useEffect` para resetar página ao mudar filtros
- `paginated = filtered.slice((page-1)*PAGE_SIZE, page*PAGE_SIZE)`
- Controles de paginação com ellipsis (`«`, `‹`, números, `›`, `»`)
- Exibe: "Page X of Y · Z orders"

---

### 5. Admin Dashboard — Status Breakdown Reformulado

**Arquivo:** `src/routes/admin/index.tsx`

**Problema:** `orders.status` nunca é atualizado automaticamente — todos os pedidos ficavam como "pending".

**Fix:** Lógica baseada em `translation_status` (Alpha) + `payment_status`:

| Card | Lógica |
|------|--------|
| Awaiting Payment | `payment_status !== 'paid'` AND `status !== 'cancelled'` |
| In Translation | `payment_status === 'paid'` AND `translation_status !== 'Finalizado'` AND não cancelado |
| Completed | `translation_status === 'Finalizado'` OR `status === 'completed'` |
| Cancelled | `status === 'cancelled'` |

- Grid alterado para `sm:grid-cols-2 lg:grid-cols-4`
- `totalRevenue` filtrado apenas por pedidos pagos
- Aba Financial também atualizada com a mesma lógica

---

### 6. Bug Crítico — Zelle Auto-Aprovação Indevida

#### Causa Raiz Identificada

O n8n recebia `receiptUrl` (camelCase) mas o nó "HTTP Request" do workflow esperava `receipt_url` (snake_case). Com `receiptUrl` undefined, o download da imagem falhava, mas o workflow n8n tinha um caminho de fallback que retornava `"The proof of payment is valid."` incorretamente.

**Bug secundário no n8n (imutável):** o Switch do workflow conecta o caminho "inválido" a um nó "Update a row" que seta `zelle_status = 'approved'` diretamente no banco — bypassando a edge function.

#### Fixes Aplicados

**`src/routes/api/zelle-notify.ts`:**
- Guard: se `receiptUrl` for undefined/inválida → retorna `{ approved: false }` sem chamar o n8n
- Envia ambos `receiptUrl` E `receipt_url` para o n8n
- Match exato: `n8nResponse.toLowerCase().trim() === "the proof of payment is valid."`
- Eventos `zelle_approved` / `zelle_rejected` não são mais encaminhados para o webhook `lush-new`

**`supabase/functions/approve-zelle-payment-automatic/index.ts` (v6 deployada):**
- Parse do body feito uma única vez
- Safety guard: se `approved = true` mas não há `zelle_receipt_url` no banco → força `approved = false`
- Quando `approved = false` → força `zelle_status = 'pending_verification'` no banco

---

### 7. Conta Admin — Luana Eberhardt

- Email: `luanaeberhardt@gmail.com`
- Criada via Supabase Dashboard UI
- Role `admin` atribuída via MCP Supabase
- Senha temporária `123456` definida via Supabase Auth dashboard

---

### 8. Inglês como Idioma de Origem

**DB:** Migration `add_lang_to_orders` — coluna `lang_to text` adicionada a `orders`

**`src/lib/order-config.ts`:**
- `LANGUAGES` inclui `"English"`
- `TARGET_LANGUAGES_FOR_ENGLISH = ["Portuguese", "Spanish"]`

**`supabase/functions/shared/send-to-alpha.ts` (v4 deployada):**
- `LANG_TO_ALPHA_SOURCE`: inclui `"English" → "Inglês"`
- `targetLanguage` agora dinâmico: se `lang_from = "English"` usa `lang_to`; caso contrário `"Inglês"`

**UI (3 formulários):** landing quote, página de pedido, dashboard do cliente

**i18n:** `langToSelectLabel` adicionado em EN/PT/ES

---

### 9. Remoção do Campo "Status" do Modal do Admin

`orders.status` nunca é atualizado automaticamente. Campo removido da seção "File Information" do modal — contexto coberto por Payment Status + Translation Status.

---

### 10. Badges de Largura Correta na Tabela Admin

Badges de Payment Method e Payment Status estavam cobrindo a célula inteira. Fix: `w-fit` adicionado nos dois `<span>` da linha desktop.

---

### 11. Status de Tradução na Seção Certified Documents (Admin Modal)

Quando não há documentos certificados ainda:
- "No certified documents yet."
- "Translation status: **[status atual]**"
- `N/A` ou `N\A` → exibe **"Sent"**; qualquer outro valor → exibe o valor real da Alpha

---

### Commits (Traduções)

| Hash | Descrição |
|------|-----------|
| `924e4f0` | feat: certified docs modal, admin orders overhaul, Zelle auto-approve fix |
| `7a568e7` | feat: add English as source language with dynamic target selection |
| `05d9b61` | fix: hide target language field when source is not English |
| `74e3b6d` | fix: remove stale Status field from admin order modal |
| `fb2d98c` | fix: payment method/status badges no longer stretch full column width |
| `b0cf7ce` | feat: show translation status in certified docs section when empty |
| `16cab54` | fix: show "Sent" instead of N/A in certified docs translation status |

### Edge Functions Deployadas (Traduções)

| Função | Versão | O que mudou |
|--------|--------|-------------|
| `approve-zelle-payment-automatic` | v6 | Safety guard, zelle_status corrigido no reject path |
| `send-to-alpha` | v4 | Suporte a inglês como source, targetLanguage dinâmico |

---

## [Projeto: Matrícula USA MVP] — Branch `tasks-admin`

### 12. i18n — Chaves `freePayment` (3 idiomas)

**Arquivos:** `project/src/i18n/locales/{pt,en,es}/payment.json`

Adicionadas as chaves:
```json
"freePayment": {
  "title": "...",
  "subtitle": "...",
  "button": "...",
  "processing": "..."
}
```
em PT, EN e ES. Usadas pelos componentes de fee step para o banner de pagamento gratuito via cupom 100%.

---

### 13. Bug Fix — Cupom 100% não aparecia no Payment Management

**Root causes:**

1. **DB CHECK constraint** — `individual_fee_payments.payment_method` só aceitava `['stripe','zelle','manual','parcelow']`. Migration adicionou `'coupon'` à lista.

2. **`freePaymentHandler.ts`** — função `applyFreePayment` não gravava `*_payment_method = 'coupon'` nas colunas de `user_profiles` e `scholarship_applications`.

3. **`transformPayments.ts`** — sem `else if (*_payment_method === 'coupon')` para nenhuma fee type além de `selection_process_fee` → usava valor hardcoded em vez de $0.

**Fixes:**

**`project/src/lib/freePaymentHandler.ts`:**
- Adicionado mapa `feeTypeToPaymentMethodColumn` cobrindo `placement_fee`, `reinstatement_package`, `i20_control_fee`, `ds160_package`, `i539_cos_package`
- `applyFreePayment` agora seta `*_payment_method = 'coupon'` no update de `user_profiles`
- Para `application_fee`, seta `application_fee_payment_method = 'coupon'` em `scholarship_applications`

**`project/src/pages/AdminDashboard/PaymentManagement/utils/transformPayments.ts`:**
- Adicionado `else if (*_payment_method === 'coupon') { amount = 0; }` para todas as fee types nos dois loops (applications e stripeUsers)

**DB Migration aplicada via MCP:**
```sql
ALTER TABLE individual_fee_payments
  DROP CONSTRAINT individual_fee_payments_payment_method_check,
  ADD CONSTRAINT individual_fee_payments_payment_method_check
    CHECK (payment_method = ANY (ARRAY['stripe','zelle','manual','parcelow','coupon']));
```

---

### 14. Bug Fix — PaymentStep exibia métodos de pagamento com $0

**Arquivo:** `project/src/pages/StudentOnboarding/components/PaymentStep.tsx`

**Problema:** Quando cupom 100% era aplicado na `application_fee`, o componente mostrava Stripe/PIX/Parcelow/Zelle todos com valor $0 em vez de esconder os métodos e mostrar o banner gratuito.

**Fix:**
- Adicionado `handleFreePaymentForApp()` que chama `applyFreePayment()` diretamente
- Em `processCheckout()`: early return para `finalAmount === 0` antes de chamar qualquer API
- JSX: ternário `effectiveAmount === 0` → exibe banner verde + botão de confirmação em vez dos métodos de pagamento
- Componente importa e usa as chaves i18n `freePayment.*`

---

### 15. Bug Fix — Cupom sumia ao recarregar página no PaymentStep

**Arquivo:** `project/src/pages/StudentOnboarding/components/PaymentStep.tsx`

**Problema:** `PaymentStep` usava query assíncrona na tabela `promotional_coupon_usage` para restaurar o cupom após refresh — método frágil e dependente de RLS. `PlacementFeeStep` já usava sessionStorage corretamente.

**Fix:** Padronizado com sessionStorage:

- Chave: `musa_coupon_application_fee`
- `useEffect` no mount: restaura `couponCode` + `validation` do sessionStorage sem chamar RPC
- `validateCoupon`: salva no sessionStorage após validação bem-sucedida
- `removeCoupon`: remove do sessionStorage antes de limpar o estado
- `handleFreePaymentForApp.onSuccess`: remove do sessionStorage ao confirmar pagamento

---

### 16. Merge main → tasks-admin

Merge concluído sem conflitos. Commit: `93c80e9c`.

---

### 17. Criação de Cupom — MICHAEL LUCIANO GONCALVES

Cupom criado diretamente no banco via MCP Supabase:

| Campo | Valor |
|-------|-------|
| Código | `MICHAEL100` |
| Desconto | 100% OFF |
| Fee aplicável | `placement_fee` apenas |
| Usos máximos | 1 |
| Válido até | 12/07/2026 |

Todas as demais fee types foram adicionadas a `excluded_fee_types` para garantir uso exclusivo na Placement Fee.

---

### Commits (Matrícula USA)

| Hash | Descrição |
|------|-----------|
| `87843104` | feat(i18n): add freePayment keys in pt/en/es |
| `26326b61` | fix: persist coupon in sessionStorage on PaymentStep refresh |
| `93c80e9c` | merge: main → tasks-admin |
