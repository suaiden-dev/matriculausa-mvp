# Daily Report — 2026-06-16

## Resumo Geral

Sessão focada no **módulo de Traduções do Matrícula USA MVP**. Foram implementadas três funcionalidades: (1) seletor de tipo de documento com precificação dinâmica no modal de tradução, (2) correção de bug de referência a variável removida, e (3) página de status de traduções para o aluno (`/student/dashboard/translations`).

---

## 1. Pricing de Tradução — 3 Tiers de Preço por Tipo de Documento

**Arquivo:** `project/src/components/TranslationQuoteModal.tsx`

**Contexto:** O modal usava um preço fixo único (`PRICE_PER_PAGE = 25`). A demanda era adotar uma estrutura de 3 tiers análoga ao mercado (ex.: The Future of English), sem mencionar essa referência em código ou UI.

### Tiers implementados

| Tipo | Chave interna | Preço/pág |
|---|---|---|
| Tradução Certificada | `certified` | $15 |
| Tradução Juramentada | `notarized` | $20 |
| Extrato Bancário | `bank_statement` | $25 |

### Mudanças técnicas

- Removido `PRICE_PER_PAGE = 25` (constante fixa)
- Adicionado `DOC_TYPES` array `as const` com `{ id, pricePerPage }` fora do componente
- Criado tipo `DocType = typeof DOC_TYPES[number]['id']`
- Estado `const [docType, setDocType] = useState<DocType>('certified')` (default: Certificada)
- Preço dinâmico: `const pricePerPage = DOC_TYPES.find(d => d.id === docType)!.pricePerPage`
- Adicionado seletor de 3 cards side-by-side entre o info do arquivo e o seletor de idioma
  - Card ativo: borda azul + bg azul claro
  - Card inativo: borda cinza + hover branco
  - Cada card mostra: label i18n + preço por página
- `handleConfirm` agora insere `document_type: docType` e `price_per_page: pricePerPage` no `translation_orders`

---

## 2. Bug Fix — `ReferenceError: PRICE_PER_PAGE is not defined`

**Arquivo:** `project/src/components/TranslationQuoteModal.tsx` (linha 239 no momento do erro)

**Causa:** Ao remover a constante `PRICE_PER_PAGE`, uma referência sobreviveu no bloco de breakdown de preço dentro do card de info do arquivo.

**Fix:** Substituído `${PRICE_PER_PAGE}` por `${pricePerPage}` (valor dinâmico baseado no `docType` selecionado).

---

## 3. Fix — Parcelow Exibindo Valor Errado ($2.08)

**Arquivo:** `project/src/components/TranslationQuoteModal.tsx`

**Causa:** O valor do Parcelow estava sendo calculado como `total / 12` (valor por parcela), exibindo $2.08 para um pedido de $25.

**Fix:** Parcelow agora mostra o `total` completo com prefixo `12×` acima do valor — mesmo padrão do onboarding, que indica "12 parcelas de X" sem dividir o total.

---

## 4. i18n — Tipo de Documento (PT/EN/ES)

**Arquivos:**
- `project/src/i18n/locales/pt/dashboard.json`
- `project/src/i18n/locales/en/dashboard.json`
- `project/src/i18n/locales/es/dashboard.json`

Adicionadas chaves dentro de `translationQuoteModal`:

| Chave | PT | EN | ES |
|---|---|---|---|
| `documentType` | Tipo de Documento | Document Type | Tipo de Documento |
| `docType_certified` | Tradução Certificada | Certified Translation | Traducción Certificada |
| `docType_notarized` | Tradução Juramentada | Notarized Translation | Traducción Jurada |
| `docType_bank_statement` | Extrato Bancário | Bank Statement | Extracto Bancario |

---

## 5. Página de Status de Traduções do Aluno

**Rota:** `/student/dashboard/translations`

**Contexto:** Após criar um pedido de tradução no modal, o aluno não tinha onde acompanhar o status. A demanda era criar uma página análoga à página de traduções da Lush America.

### Arquivos criados/modificados

#### `project/src/pages/StudentDashboard/Translations.tsx` — CRIADO

- Busca `translation_orders` via Supabase onde `user_id = auth.uid()`, ordenado por `created_at desc`
- **Estado vazio:** ícone `Languages` + texto explicativo
- **Cards por pedido** mostrando:
  - Nome do arquivo (`original_filename`)
  - Tipo de documento (label i18n) + idioma origem → destino
  - Total (`page_count × price_per_page`) com breakdown abaixo
  - Badge `payment_status`: amber "Não pago" / verde "Pago"
  - Badge `translation_status`: cinza "Pendente" / azul "Em Tradução" / verde "Finalizado"
  - Método de pagamento (Stripe / Zelle / Parcelow)
  - Data do pedido
  - Botão "Baixar Tradução" (visível apenas quando `translation_status = completed` **e** `certified_file_url` disponível — preparado para integração Alpha futura)

#### `project/src/pages/StudentDashboard/index.tsx` — MODIFICADO

- Adicionado import de `Translations`
- Adicionada rota: `<Route path="translations" element={<Translations />} />`

#### `project/src/pages/StudentDashboard/StudentDashboardLayout.tsx` — MODIFICADO

- Adicionado `Languages` ao import de `lucide-react`
- `getActiveTab()`: adicionado `if (path.includes('/translations')) return 'translations'`
- `allSidebarItems`: adicionado item entre Chat e Rewards:
  ```ts
  { id: 'translations', label: t('studentDashboard.sidebar.translations'), icon: Languages, path: '/student/dashboard/translations' }
  ```
- `allowedIds` (modo restrito): adicionado `'translations'` para manter visível em modo restrito

---

## 6. i18n — Página de Traduções (PT/EN/ES)

**Arquivos:**
- `project/src/i18n/locales/pt/dashboard.json`
- `project/src/i18n/locales/en/dashboard.json`
- `project/src/i18n/locales/es/dashboard.json`

Adicionado `sidebar.translations` e nova seção top-level `translationsPage`:

| Chave | PT | EN | ES |
|---|---|---|---|
| `sidebar.translations` | Minhas Traduções | My Translations | Mis Traducciones |
| `translationsPage.title` | Minhas Traduções | My Translations | Mis Traducciones |
| `translationsPage.subtitle` | Acompanhe o status... | Track the status... | Sigue el estado... |
| `translationsPage.noOrders` | Nenhum pedido... | No translation orders yet | Ningún pedido... |
| `translationsPage.unpaid` | Não pago | Unpaid | No pagado |
| `translationsPage.paid` | Pago | Paid | Pagado |
| `translationsPage.pending` | Pendente | Pending | Pendiente |
| `translationsPage.inProgress` | Em Tradução | In Progress | En Traducción |
| `translationsPage.completed` | Finalizado | Completed | Finalizado |
| `translationsPage.download` | Baixar Tradução | Download Translation | Descargar Traducción |
| `translationsPage.orderConfirmed` | Pedido criado! Acompanhe em... | Order created! Track at... | ¡Pedido creado! Sigue en... |

---

## 7. Toast Pós-Confirmação no Modal

**Arquivo:** `project/src/components/TranslationQuoteModal.tsx`

- Adicionado import de `toast` (`react-hot-toast`) e `useNavigate` (`react-router-dom`)
- Após `onOrderCreated(data.id)` + `onClose()`, dispara toast com duração de 6s
- Toast contém mensagem i18n (`translationsPage.orderConfirmed`) + botão `→` que navega para `/student/dashboard/translations` e fecha o toast

---

## Estado Atual do Módulo de Traduções

### Implementado ✅
- Upload de documento + contagem de páginas (PDF)
- Modal de orçamento com 3 tipos de documento e preços dinâmicos
- Seleção de método de pagamento (Stripe / Zelle / Parcelow) com valores corretos
- Inserção em `translation_orders` com todos os campos
- Toast pós-confirmação com link para página de status
- Página de status do aluno (`/student/dashboard/translations`)
- i18n completo em PT/EN/ES

### Pendente 🔲
- Integração de pagamento real (Stripe checkout / Zelle manual / Parcelow API) → atualizar `payment_status = 'paid'`
- Chamar Edge Function `send-to-alpha` após pagamento confirmado → passar `isCertified` baseado no `document_type`
- Campo `certified_file_url` na tabela (quando Alpha devolver o documento traduzido)
- Página admin `/admin/translations`: listagem de todos os pedidos, filtros, sync manual com Alpha
- Notificações: email ao aluno quando `translation_status = 'finalizado'`
- Setar secret `ALPHA_API_KEY` no Supabase: `supabase secrets set ALPHA_API_KEY=<key> --project-ref fitpynguasqqutuhzifx`

---

## Branch

`tasks-admin` — mudanças não commitadas ainda.
