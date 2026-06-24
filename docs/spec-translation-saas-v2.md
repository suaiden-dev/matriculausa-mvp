# Translation SaaS v2 — Spec Completa
**Matricula USA** · Discussão: 2026-06-17

---

## Visão Geral

O módulo de traduções evolui de um fluxo automático (IA detecta idioma → dispara modal) para um **SaaS de tradução de documentos** integrado à plataforma. O aluno contrata a tradução quando precisar — seja porque o admin rejeitou um documento pedindo tradução, seja por conta própria. A Alpha Translations executa a tradução. O sistema faz o resubmit automático quando o documento traduzido está pronto, se houver vínculo com um request.

---

## Princípios

- **Tradução não garante aprovação.** O documento pode ser rejeitado por outros motivos (conteúdo inválido, valor insuficiente, documento errado). A cobrança é independente do resultado.
- **SaaS puro.** Qualquer aluno pode contratar tradução de qualquer documento — independente do seu processo na plataforma.
- **Vínculo é opcional.** O aluno pode vincular a tradução a um Global Document ou Document Request para que o resubmit seja automático. Mas não é obrigatório.
- **Sem exposição de fornecedor.** A Alpha Translations não é mencionada para o aluno. A tradução é um serviço do Matrícula USA.

---

## Atores

| Ator | Papel |
|---|---|
| Aluno | Contrata tradução, acompanha status, recebe documento |
| Admin / Escola | Rejeita documento com motivo "Precisa de Tradução" |
| Sistema (Alpha) | Executa a tradução e retorna o arquivo |
| Sistema (Matrícula USA) | Faz o resubmit automático quando vinculado |

---

## Fluxo 1 — Rejeição Admin com "Precisa de Tradução"

### 1.1 Admin rejeita o documento

No painel do admin/escola, ao revisar um upload em **Global Documents** ou **Document Requests**, o admin tem a opção de rejeitar com motivo específico:

- ❌ Rejeitar (motivo livre)
- ❌ Rejeitar — **Precisa de Tradução** ← novo botão/opção

Ao selecionar "Precisa de Tradução":
- O upload recebe `status = 'rejected'` e `rejection_reason = 'needs_translation'`
- Flag `needs_translation = true` salva em `document_request_uploads`
- Notificação enviada ao aluno

O documento **permanece visível** na fila do admin como rejeitado — não some.

### 1.2 Aluno recebe a notificação

O aluno é notificado e ao acessar o dashboard vê o documento rejeitado com o motivo "Precisa de Tradução" e um CTA claro:

> *"Este documento foi recusado pois precisa de tradução para o inglês."*
> **[Contratar Tradução →]**

O CTA redireciona para a página `/student/dashboard/translations`.

### 1.3 Página de Translations — estado com documento pendente

Quando o aluno chega na página de Translations vindo de uma rejeição, aparece um **banner/card destacado no topo**:

```
┌─────────────────────────────────────────────────────┐
│ 📄 Documento aguardando tradução                    │
│ passport_tayane.pdf · rejeitado em 17/06/2026       │
│ Vinculado a: Global Documents > Passaporte          │
│                                                     │
│ [Contratar Tradução]                                │
└─────────────────────────────────────────────────────┘
```

- O arquivo já está **pré-carregado** do storage — o aluno **não faz upload novamente**
- O vínculo ao request de origem já vem **pré-preenchido** (pode ser removido)
- O aluno escolhe tipo de documento e método de pagamento normalmente

---

## Fluxo 2 — Tradução Avulsa (SaaS Puro)

O aluno acessa `/student/dashboard/translations` por conta própria e clica em **"Nova Tradução"**.

- Faz upload do arquivo
- Escolhe tipo de documento (Certificada / Juramentada / Extrato Bancário)
- Escolhe idioma de origem
- Vê preço calculado (páginas × preço/página)
- Escolhe método de pagamento
- **Não há vínculo** a nenhum request — tradução avulsa

Após a tradução ser entregue, ele recebe o arquivo para download.

---

## Disclaimer

Aparece **antes de confirmar o pagamento**, em ambos os fluxos.

> *"Contratar a tradução não garante a aprovação do documento. Ele pode ser recusado por outros motivos além do idioma — como conteúdo inválido, valores insuficientes ou documentação incompleta. O valor pago pela tradução não é reembolsável."*
>
> ☐ *Não mostrar novamente*

- O checkbox "Não mostrar novamente" salva a preferência do usuário
- Preferência salva em `user_profiles` (campo `translation_disclaimer_accepted`) ou `localStorage` como fallback
- Mesmo com o checkbox marcado, o disclaimer **sempre aparece** na primeira vez

---

## Vínculo a Document Request

### Como funciona

No momento de contratar a tradução, o aluno pode vincular o pedido a:
- Um **Global Document Request** específico
- Um **Document Request** individual (de uma scholarship application)
- **Nenhum** (tradução avulsa)

A UI apresenta isso de forma minimalista:

```
Deseja vincular esta tradução a um documento pendente?
  ○ Passaporte (Global Documents) ← pré-selecionado se vier de rejeição
  ○ Extrato Bancário (Document Request — Caroline University)
  ○ Não vincular
```

### O que o vínculo faz

Quando a Alpha entrega o documento traduzido:
1. O sistema detecta que há um vínculo
2. Faz o **resubmit automático** do arquivo traduzido no slot correto
3. O documento aparece para o admin como um novo upload do aluno
4. O aluno **não precisa fazer nada**

Se não houver vínculo:
- O aluno recebe o documento para download
- Pode submeter manualmente quando quiser

### Campos de vínculo em `translation_orders`

```sql
document_request_upload_id UUID REFERENCES document_request_uploads(id) -- upload original rejeitado
document_request_id        UUID REFERENCES document_requests(id)         -- request de destino
```

---

## Resubmit Automático

Quando `sync-alpha-status` detecta `translation_status = 'Finalizado'` e a ordem tem vínculo:

1. Baixa o arquivo de `certifiedFiles[0].url` (Firebase Storage, token autenticado)
2. Faz upload do arquivo traduzido no Supabase Storage (`student-documents` bucket)
3. Cria novo registro em `document_request_uploads`:
   - `uploaded_by` = user_id do aluno
   - `is_admin_upload = false`
   - `status = 'pending'` (admin precisa revisar normalmente)
   - `source = 'translation_resubmit'` ← flag para rastreabilidade
   - `translation_order_id` = FK para a order
4. Notifica o aluno: *"Seu documento traduzido foi enviado automaticamente para revisão."*
5. Notifica o admin: novo documento disponível para revisão

**Importante:** O resubmit cria um novo upload — o admin revisa normalmente. A tradução não garante aprovação.

---

## Schema de Banco de Dados

### Alterações em `document_request_uploads`

```sql
ALTER TABLE document_request_uploads
  ADD COLUMN IF NOT EXISTS rejection_reason TEXT DEFAULT NULL,
  -- 'needs_translation' | 'wrong_document' | 'expired' | 'other'
  ADD COLUMN IF NOT EXISTS needs_translation BOOLEAN DEFAULT NULL,
  -- já existe — confirmar
  ADD COLUMN IF NOT EXISTS translation_order_id UUID REFERENCES translation_orders(id),
  -- FK para rastrear qual order gerou este resubmit
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT NULL;
  -- 'student_upload' | 'admin_upload' | 'translation_resubmit'
```

### Alterações em `translation_orders`

```sql
ALTER TABLE translation_orders
  ADD COLUMN IF NOT EXISTS document_request_upload_id UUID REFERENCES document_request_uploads(id),
  -- upload original rejeitado (origem da order)
  ADD COLUMN IF NOT EXISTS document_request_id UUID REFERENCES document_requests(id),
  -- request de destino para resubmit
  ADD COLUMN IF NOT EXISTS rejection_origin BOOLEAN DEFAULT FALSE,
  -- true = veio de uma rejeição admin, false = avulsa
  ADD COLUMN IF NOT EXISTS resubmit_upload_id UUID REFERENCES document_request_uploads(id),
  -- FK para o novo upload criado pelo resubmit automático
  ADD COLUMN IF NOT EXISTS resubmitted_at TIMESTAMPTZ DEFAULT NULL;
  -- quando o resubmit foi feito
```

### Novo campo em `user_profiles`

```sql
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS translation_disclaimer_accepted BOOLEAN DEFAULT FALSE;
```

---

## Página de Translations — Estados

### Estado vazio
```
[ícone Languages]
Nenhuma tradução ainda.
Quando você contratar uma tradução, ela aparecerá aqui.
[+ Nova Tradução]
```

### Estado com documento pendente de rejeição (banner topo)
```
┌─ ATENÇÃO ──────────────────────────────────────────┐
│ Você tem 1 documento aguardando tradução            │
│ passport.pdf — rejeitado em 17/06/2026             │
│ [Contratar Tradução]                               │
└─────────────────────────────────────────────────────┘
```

### Card de ordem (stepper — igual ao que já existe)
```
📄 passport.pdf · Tradução Certificada · PT → EN
$30.00 (2 × $15)
●────●────○────○
Pedido  Pago  Tradução  Pronto
[Action Zone contextual]
```

---

## Componentes a Criar / Modificar

### Frontend — Admin

**`GlobalDocumentRequestsSection.tsx`** e **`DocumentsView.tsx`**
- Adicionar botão "Rejeitar — Precisa de Tradução" na ação de rejeição
- Salvar `rejection_reason = 'needs_translation'` e `needs_translation = true`

### Frontend — Aluno

**`Translations.tsx`** (já existe — modificar)
- Detectar uploads rejeitados com `rejection_reason = 'needs_translation'` para o usuário atual
- Exibir banner de documento pendente no topo
- Pré-carregar arquivo do storage na ordem
- Adicionar seletor de vínculo (minimalista, opcional)
- Exibir disclaimer antes do pagamento com checkbox "Não mostrar novamente"
- Adicionar botão "+ Nova Tradução" para fluxo avulso

**`TranslationQuoteModal.tsx`** (já existe — modificar)
- Receber prop `preloadedFile` (arquivo já no storage, sem novo upload)
- Receber prop `suggestedLink` (request sugerido para vínculo)
- Adicionar step de disclaimer antes da confirmação
- Salvar `document_request_upload_id` e `document_request_id` na order

### Backend — Edge Functions

**`sync-alpha-status`** (já existe — modificar)
- Após detectar `Finalizado` + `certifiedFiles`, verificar se há vínculo
- Se vinculado → executar resubmit automático
- Salvar `resubmit_upload_id` e `resubmitted_at` na order
- Notificar aluno e admin

---

## Notificações

| Evento | Quem recebe | Mensagem |
|---|---|---|
| Admin rejeita com "Precisa de Tradução" | Aluno | "Seu documento [nome] foi recusado. Contrate a tradução para reenviar." |
| Aluno contrata tradução | — | Toast de confirmação + redirect para Translations |
| Alpha entrega documento | Aluno | "Sua tradução de [nome] está pronta!" |
| Resubmit automático concluído | Aluno + Admin | "Documento traduzido enviado automaticamente para revisão." |

---

## Dashboard Admin — Visualização

No painel do admin, ao ver os uploads de um aluno, o documento rejeitado com `needs_translation` exibe:
- Badge âmbar "Precisa de Tradução" (já implementado)
- Badge azul "Em Tradução" quando há order paga em andamento
- Badge verde "Traduzido" quando resubmit concluído
- Novo upload aparece normalmente na fila de revisão após resubmit

---

## Fluxo Completo — Diagrama

```
Admin rejeita documento com "Precisa de Tradução"
  ↓
document_request_uploads: status=rejected, rejection_reason=needs_translation
  ↓
Aluno recebe notificação → acessa /student/dashboard/translations
  ↓
Banner: "Documento aguardando tradução" — arquivo pré-carregado
  ↓
Aluno vê disclaimer → aceita → escolhe tipo + pagamento
  ↓
(Opcional) Aluno vincula a um request
  ↓
Pagamento confirmado → translation_orders criada → send-to-alpha()
  ↓
sync-alpha-status polling a cada 10min
  ↓
Alpha: Finalizado + certifiedFiles disponíveis
  ↓
[Tem vínculo?]
  Sim → resubmit automático → novo upload criado → admin notificado
  Não → aluno recebe download do arquivo traduzido
  ↓
Admin revisa o documento normalmente
(Aprovação não garantida pela tradução)
```

---

## O Que NÃO Muda

- O fluxo de pagamento (Stripe / Zelle / Parcelow) permanece igual
- A Alpha API permanece como fornecedor oculto
- O `sync-alpha-status` cron continua rodando a cada 10min
- A página de Translations do aluno já existe — será expandida, não recriada
- O preço por página e tiers de documento (Certificada / Juramentada / Extrato) permanecem

---

## Checklist de Implementação

### Banco de Dados
- [ ] Adicionar `rejection_reason` em `document_request_uploads`
- [ ] Adicionar `source` em `document_request_uploads`
- [ ] Adicionar `translation_order_id` em `document_request_uploads`
- [ ] Adicionar `document_request_upload_id` em `translation_orders`
- [ ] Adicionar `document_request_id` em `translation_orders`
- [ ] Adicionar `rejection_origin` em `translation_orders`
- [ ] Adicionar `resubmit_upload_id` e `resubmitted_at` em `translation_orders`
- [ ] Adicionar `translation_disclaimer_accepted` em `user_profiles`

### Admin
- [ ] Botão "Rejeitar — Precisa de Tradução" em GlobalDocumentRequestsSection
- [ ] Botão "Rejeitar — Precisa de Tradução" em DocumentsView (EnhancedStudentTracking)
- [ ] Salvar `rejection_reason` + `needs_translation = true` ao rejeitar

### Aluno — Translations Page
- [ ] Detectar uploads rejeitados com `needs_translation` e exibir banner
- [ ] Pré-carregar arquivo do storage (sem novo upload)
- [ ] Seletor de vínculo (minimalista, opcional, pré-preenchido quando vem de rejeição)
- [ ] Disclaimer com checkbox "Não mostrar novamente"
- [ ] Salvar preferência de disclaimer
- [ ] Botão "+ Nova Tradução" para fluxo avulso
- [ ] Atualizar campos enviados ao criar `translation_orders`

### Backend
- [ ] `sync-alpha-status`: detectar vínculo e executar resubmit automático
- [ ] Resubmit: download do Firebase → upload Supabase → criar novo `document_request_uploads`
- [ ] Notificações ao aluno e admin após resubmit

### Testes
- [ ] Admin rejeita → aluno vê banner na página Translations
- [ ] Aluno contrata com vínculo → resubmit automático após Alpha entregar
- [ ] Aluno contrata sem vínculo → arquivo disponível para download
- [ ] Disclaimer aparece na primeira vez, respeita "Não mostrar novamente"
- [ ] Documento resubmetido aparece na fila do admin para revisão
- [ ] Badge correto no painel admin em cada estado
