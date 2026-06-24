# Translation SaaS — Integração com Alpha Translations

> **Última atualização:** 2026-06-19  
> **Status:** Em produção

---

## 1. Visão Geral

O Translation SaaS é o módulo de tradução do Matricula USA. O estudante solicita a tradução de documentos diretamente pelo portal; os documentos são enviados automaticamente para a **Alpha Translations** via API, e o retorno (arquivo traduzido/certificado) é capturado, espelhado no Supabase Storage e disponibilizado ao aluno e ao admin.

**Arquitetura adotada: Plano A — 1 projeto Alpha por arquivo**

Cada `translation_order` corresponde a exatamente 1 projeto na Alpha. Se um `document_request` exige 5 documentos traduzidos, são criados 5 `translation_orders` independentes. Cada um tem seu próprio `alpha_project_number` e lifecycle. Isso garante:

- Falha isolada: se um arquivo travar, os outros continuam
- Granularidade: admin aprova/rejeita cada arquivo individualmente
- Sync simples: cada `translation_order` mapeia 1:1 com `alpha_project_number`

---

## 2. Fluxo Completo

```
ESTUDANTE
  │
  ▼
[TranslationQuoteModal]
  │  Seleciona documento, tipo, idiomas, método de pagamento
  │  Cria translation_order (payment_status = 'unpaid')
  │
  ├── [Stripe] → stripe-checkout-translation → redirect → webhook → payment_status = 'paid'
  ├── [Zelle]  → upload comprovante → approve-zelle-payment → payment_status = 'paid'
  └── [Parcelow] → parcelow-checkout-translation → redirect → webhook → payment_status = 'paid'
                                                                         │
                                                                         ▼
                                                        DB trigger: handle_translation_order_paid()
                                                                         │
                                                                         ▼
                                                              [send-to-alpha] (edge function)
                                                                Cria projeto na Alpha API
                                                                Salva alpha_project_number
                                                                         │
                                                                         ▼
                                                       ┌─────────────────────────────────────┐
                                                       │  pg_cron: sync-alpha-status          │
                                                       │  Roda a cada 10 minutos              │
                                                       │  Busca status de TODOS os projetos   │
                                                       │  Detecta certifiedFiles              │
                                                       └─────────────────────────────────────┘
                                                                         │
                                                          project.certifiedFiles presente?
                                                                         │
                                                         ┌───────────────┴───────────────┐
                                                        NÃO                             SIM
                                                         │                               │
                                                    Atualiza só                    Mirror para
                                                    translation_status             Supabase Storage
                                                    alpha_project_status           (translations/certified/{orderId}/)
                                                                                         │
                                                                                   translation_order
                                                                                   .certified_at = now
                                                                                   .certified_file_url = signed URL
                                                                                         │
                                                                             document_request_id vinculado?
                                                                                         │
                                                                         ┌───────────────┴───────────────┐
                                                                        NÃO                             SIM
                                                                         │                               │
                                                                   Fim (arquivo              Cenário A ou B?
                                                                disponível no               (ver seção 5)
                                                                  dashboard)
```

---

## 3. Componentes

### 3.1 Tabela `translation_orders`

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | uuid | PK |
| `user_id` | uuid | FK → auth.users |
| `original_filename` | text | Nome original do arquivo |
| `document_type` | text | `diploma`, `transcript`, `birth_certificate`, etc. |
| `is_bank_statement` | bool | Extrato bancário (pricing especial) |
| `source_language` | text | Idioma de origem (conforme valores Alpha) |
| `target_language` | text | Idioma de destino (conforme valores Alpha) |
| `page_count` | int | Número de páginas |
| `price_per_page` | numeric | Preço por página |
| `total_price` | numeric | Total calculado |
| `amount_paid` | numeric | Valor efetivamente pago |
| `payment_method` | text | `stripe`, `zelle`, `parcelow` |
| `payment_status` | text | `unpaid`, `paid` |
| `payment_reference` | text | Referência do pagamento (Zelle/Parcelow) |
| `payment_date` | timestamptz | Data do pagamento |
| `alpha_project_number` | int | ID do projeto na Alpha (null até envio) |
| `translation_status` | text | Status da tradução retornado pela Alpha |
| `alpha_project_status` | text | Status geral do projeto retornado pela Alpha |
| `alpha_synced_at` | timestamptz | Último sync com Alpha |
| `certified_at` | timestamptz | Quando os arquivos certificados foram capturados |
| `certified_file_url` | text | Signed URL do primeiro arquivo certificado |
| `certified_files` | jsonb | Array `[{name, url}]` — todos os arquivos certificados |
| `certified_files_storage` | jsonb | Array `[{name, path}]` — paths no Storage |
| `document_request_id` | uuid | FK → document_requests (vínculo voluntário ou automático) |
| `document_request_upload_id` | uuid | Upload rejeitado que originou esta tradução (Cenário A) |
| `resubmit_upload_id` | uuid | Upload criado pelo sync após tradução (T17/T17B) |
| `resubmitted_at` | timestamptz | Quando o resubmit automático foi feito |
| `original_file_url` | text | Path do arquivo original no Storage |
| `created_at` | timestamptz | Criação do pedido |

### 3.2 Edge Functions

| Função | Trigger | Responsabilidade |
|--------|---------|-----------------|
| `send-to-alpha` | DB trigger após `payment_status = 'paid'` | Envia o arquivo para a Alpha API; salva `alpha_project_number` |
| `sync-alpha-status` | pg_cron (10 min) ou botão admin (JWT) | Consulta Alpha, espelha arquivos certificados, dispara T17/T17B |
| `stripe-checkout-translation` | Chamada manual do frontend | Cria checkout Stripe para tradução |
| `parcelow-checkout-translation` | Chamada manual do frontend | Cria checkout Parcelow para tradução |
| `parcelow-webhook` | POST da Parcelow | Marca `payment_status = 'paid'` quando pagamento confirmado |
| `approve-zelle-payment` | Admin aprova comprovante | Marca `payment_status = 'paid'` |

### 3.3 DB Trigger

```sql
-- Dispara automaticamente após payment_status mudar para 'paid'
handle_translation_order_paid()
  → chama send-to-alpha via HTTP
```

---

## 4. Status Lifecycle

### 4.1 `translation_status` (campo da Alpha: `project.translation_status`)

Texto livre, sem enum fixo. Valores comuns observados:

| Valor | Significado |
|-------|-------------|
| `N/A` | Projeto recém-criado ou ainda não iniciou tradução |
| `Em Tradução` | Tradutores trabalhando |
| `Em Revisão` | Revisão em andamento |
| `Em Certificação` | Certificação juramentada |
| `Finalizado` | Tradução concluída e arquivo disponível |
| `Cancelado` | Projeto cancelado |

> O campo é texto livre. A Alpha pode adicionar etapas customizadas. **Não dependa de valores específicos** para lógica crítica — exceto `Finalizado` e `Cancelado` para controle de sync.

### 4.2 `alpha_project_status` (campo da Alpha: `project.project_status`)

| Valor | Significado |
|-------|-------------|
| `Rascunho` | Arquivo DOCX/DOC (exige orçamento manual) |
| `Ag. Orçamento` | Aguardando precificação |
| `Ag. Aprovação` | Aguardando aprovação do cliente |
| `Em Análise` | Aprovado, em análise |
| `Em Andamento` | Em produção |
| `Em Divergência` | Problema identificado |
| `Finalizado` | Concluído |
| `Cancelado` | Cancelado |

### 4.3 Regra de sincronização

```
sync-alpha-status inclui na query:
  payment_status = 'paid'
  AND alpha_project_number IS NOT NULL
  AND (
    translation_status NOT IN ('Finalizado', 'Cancelado')
    OR certified_at IS NULL   ← garante retry se ficou preso como 'Finalizado' sem arquivos
  )
```

---

## 5. Cenários de Auto-Submit ao Document Request

Quando `translation_order.document_request_id` está preenchido e o sync detecta `certifiedFiles`, o documento traduzido é submetido automaticamente ao `document_request` correspondente.

### Cenário A — Upload Rejeitado com `needs_translation = true`

O estudante tinha um documento rejeitado que precisava ser traduzido. Ao criar a `translation_order`, o `document_request_upload_id` (upload rejeitado) fica registrado.

```
document_request_upload (rejected, needs_translation=true)
  └── translation_order.document_request_upload_id = upload.id
        └── [sync detecta certifiedFiles]
              └── cria novo document_request_upload
                    source = 'translation_resubmit'
                    status = 'under_review'
                    file_url = storagePath do arquivo certificado
                    translation_order_id = order.id
```

### Cenário B — Vínculo Voluntário

O estudante vinculou a tradução a um `document_request` por conta própria (sem upload rejeitado anterior). O `document_request_upload_id` é null mas `document_request_id` está preenchido.

```
translation_order.document_request_id = request.id
translation_order.document_request_upload_id = null
  └── [sync detecta certifiedFiles]
        └── cria primeiro document_request_upload
              source = 'translation_first_submit'
              status = 'under_review'
              file_url = storagePath do arquivo certificado
              translation_order_id = order.id
```

### Idempotência

O campo `resubmit_upload_id` garante que o submit automático acontece apenas **uma vez**:

```sql
-- sync só submete se resubmit_upload_id IS NULL
WHERE document_request_id IS NOT NULL AND resubmit_upload_id IS NULL
```

---

## 6. Mirror de Arquivos (Firebase → Supabase Storage)

Os arquivos certificados da Alpha ficam no Firebase Storage com URLs temporárias. O sync faz o mirror para o Supabase Storage para garantir:
- URLs permanentes (signed URL com validade de 10 anos)
- Independência de disponibilidade do Firebase
- Acesso via signed URL autenticado pelo Supabase

**Path no Storage:**
```
bucket: document-attachments
path:   translations/certified/{translation_order_id}/{índice}_{nome_original}

Exemplo:
translations/certified/2041983e-9ab0-4499-bc03-925b553f976b/0_contrato_certificado.pdf
```

**Comportamento em caso de falha:**
- Se todos os arquivos falharem no mirror → `continue` (não atualiza o registro)
- O cron retenta no próximo ciclo (10 min)
- Se apenas alguns arquivos falharem → arquivos bem-sucedidos são salvos; falhas são logadas

---

## 7. API da Alpha Translations

### Envio de Projeto

```
POST https://createprojectexternal-n3gdftgt2a-uc.a.run.app
Header: x-api-key: {ALPHA_API_KEY}
Content-Type: multipart/form-data

Campos:
  projectName      string    Nome descritivo do projeto
  sourceLanguage   string    "Português (Brasil)" | "Inglês" | "Espanhol (América Latina)" | "Francês"
  targetLanguage   string    Depende do sourceLanguage (ver regras abaixo)
  files            file(s)   Um ou mais arquivos (.pdf, .docx, .doc, .jpg, .jpeg, .png)
  isCertified      string    "true" | "false"  (tradução juramentada)
  isPriority       string    "true" | "false"
  externalClientId string    Email do estudante (vínculo do projeto ao usuário)
  projectObs       string    Observações adicionais

Regras de idioma:
  Origem PT/ES/FR → Destino "Inglês"
  Origem "Inglês" → Destino "Português (Brasil)" ou "Espanhol (América Latina)"

Resposta (201):
  { "success": true, "projectNumber": 157, "filesUploaded": 1 }
```

**Nota:** A API aceita múltiplos arquivos num mesmo projeto (`files` repetido). Porém adotamos 1 arquivo por projeto (Plano A) para lifecycle independente por documento.

### Consulta de Status

```
GET https://getprojectstatusexternal-n3gdftgt2a-uc.a.run.app
Header: x-api-key: {ALPHA_API_KEY}

// Sem filtro → retorna TODOS os projetos (abordagem atual do sync)
// Com filtro → ?externalClientId=email@usuario.com

Resposta:
{
  "success": true,
  "total": N,
  "projects": [
    {
      "projectNumber": 157,
      "projectName": "Certidão de Nascimento",
      "project_status": "Finalizado",
      "payment_status": "Pago",
      "translation_status": "Finalizado",
      "createdAt": "2026-06-19T...",
      "certifiedFiles": [
        { "name": "Certidao_certificado.pdf", "url": "https://firebasestorage..." }
      ]
    }
  ]
}
```

> **Importante:** O sync chama **sem** `externalClientId` para garantir que projetos finalizados sejam retornados. O filtro por email pode omitir projetos em status final.

---

## 8. Autenticação do `sync-alpha-status`

A função aceita dois métodos de autenticação:

| Método | Header | Usado por |
|--------|--------|-----------|
| CRON_SECRET | `x-cron-secret: {secret}` | pg_cron (automático, 10 min) |
| JWT Supabase | `Authorization: Bearer {jwt}` | Botão "Atualizar Status" no admin |

---

## 9. Múltiplos Documentos por Document Request

Quando um `document_request` exige N documentos e todos precisam de tradução:

```
document_request "Application Form"
  ├── Upload 1: passport.pdf         → translation_order A → alpha_project #201
  ├── Upload 2: diploma.pdf          → translation_order B → alpha_project #202
  ├── Upload 3: transcript.pdf       → translation_order C → alpha_project #203
  ├── Upload 4: bank_statement.pdf   → translation_order D → alpha_project #204
  └── Upload 5: birth_cert.pdf       → translation_order E → alpha_project #205
```

Cada ordem tem lifecycle independente. O sync processa cada uma separadamente. O admin vê e aprova/rejeita cada arquivo individualmente no card do `document_request`.

Não há work queue. Cada envio para a Alpha é síncrono no momento do pagamento (via DB trigger → `send-to-alpha`). O sync de retorno é assíncrono via cron.

---

## 10. Pricing

| Tipo de Documento | Preço por Página |
|------------------|-----------------|
| Padrão | $24.99 |
| Bank Statement | $14.99 |
| TFOE (Translation For Official Education) | $14.99 |

O `total_price` é calculado no frontend (`TranslationQuoteModal`) e validado no backend antes do checkout.

---

## 11. Troubleshooting

### Arquivo não aparece após Alpha marcar "Finalizado"

1. Verificar `alpha_project_number` na `translation_order` — deve estar preenchido
2. Checar logs do `sync-alpha-status` no Supabase Dashboard → Edge Functions
3. Confirmar que `certified_at` está null (precondição para mirror)
4. Usar botão "Atualizar Status" no admin para forçar sync imediato
5. Se o mirror falhou: verificar permissões do bucket `document-attachments`

### Botão "Approve/Reject" não aparece no admin

- O `document_request_upload` criado pelo sync deve ter `status = 'under_review'`
- Verificar no banco: `SELECT status, source FROM document_request_uploads WHERE translation_order_id = '{id}'`

### Arquivo mostra "Preview não disponível"

- A URL é uma signed URL com query string `?token=...`
- `getFileName()` deve strip o query string antes de detectar extensão
- Fix aplicado em `Translations.tsx:getFileName`
