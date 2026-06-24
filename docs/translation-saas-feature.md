# Translation SaaS — Feature Spec (Matricula USA)

## Visão Geral

Ao fazer upload de um documento em qualquer `document_request` (individual ou global), o sistema dispara um webhook para o n8n. O fluxo n8n analisa se o documento já está em inglês. Se não estiver, o aluno é direcionado para um fluxo de tradução certificada — baseado na arquitetura já existente no projeto **Lush New** e na **Alpha Translations API**.

---

## Referência: Lush New

O projeto Lush New (`/c/Users/victurib/lushNEW/Lush-New/`) já é um sistema de tradução certificada completo. A integração no Matricula USA vai **reutilizar a mesma lógica**, adaptada para o contexto do aluno dentro da plataforma.

---

## n8n — Webhook de Verificação de Idioma

### Endpoint
```
POST https://nwh.suaiden.com/webhook/verify-english
Content-Type: application/json
```

### Payload (o que nosso código envia)
```json
{
  "url": "https://...supabase.co/storage/v1/object/public/student-documents/..."
}
```

Apenas o campo `url` é necessário. O n8n aceita tanto URLs públicas quanto URLs assinadas do Supabase (`/object/sign/` + `?token=`) — o fluxo converte automaticamente para URL pública antes de baixar.

### Resposta
Retorna um **booleano puro**:
```
true   → documento está em inglês → nenhuma ação
false  → documento está em outro idioma → iniciar fluxo de tradução
```

### Como o fluxo funciona internamente (n8n)
1. **Webhook** recebe `body.url`
2. **Download File** — baixa o arquivo (converte signed URL para public URL se necessário)
3. **Extract from File** — converte binário para base64
4. **Detect Language** — envia base64 para OpenAI `gpt-4o-mini` com `temperature: 0`
   - Prompt: detecta idioma principal do documento
   - Resposta forçada via `json_schema`: `{ "is_english": boolean }`
5. **Parse Result** — normaliza para booleano seguro (erro de parse → `false`)
6. **Respond to Webhook** — retorna o booleano

### Como nosso código consome
```typescript
const response = await fetch('https://nwh.suaiden.com/webhook/verify-english', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ url: fileUrl })
});
const isEnglish = await response.json(); // true | false

if (!isEnglish) {
  // iniciar fluxo de cotação de tradução
}
```

---

## Alpha Translations API

### Autenticação
- Header obrigatório em toda requisição: `x-api-key: ak_SUA_CHAVE`
- API Key identifica a empresa (Matricula USA) — uma única chave para todos os alunos
- `externalClientId` identifica cada aluno dentro do sistema da Alpha (email do aluno)

### Endpoint de Envio (POST)
```
POST https://createprojectexternal-n3gdftgt2a-uc.a.run.app
Content-Type: multipart/form-data
x-api-key: ak_SUA_CHAVE
```

**Parâmetros:**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `projectName` | string | Sim | Nome descritivo do projeto (ex: "Certidão de Nascimento") — não é o nome do arquivo |
| `sourceLanguage` | string | Sim | `"Português (Brasil)"` \| `"Inglês"` \| `"Espanhol (América Latina)"` \| `"Francês"` |
| `targetLanguage` | string | Sim | Se origem ≠ inglês → sempre `"Inglês"`. Se origem = inglês → `"Português (Brasil)"` ou `"Espanhol (América Latina)"` |
| `files` | file(s) | Sim | `.pdf`, `.docx`, `.doc`, `.jpg`, `.jpeg`, `.png` — máx 25MB por arquivo |
| `externalClientId` | string | Não | Email/ID do aluno — vincula o projeto ao aluno para filtro no GET de status |
| `projectObs` | string | Não | Observações para a equipe de tradução |
| `isPriority` | string | Não | `"true"` \| `"false"` (padrão: `"false"`) |
| `isCertified` | string | Não | `"true"` = tradução juramentada \| `"false"` = simples (padrão: `"false"`) |

**Regra de idiomas:**
- Origem `PT/ES/FR` → destino obrigatoriamente `"Inglês"`
- Origem `"Inglês"` → destino `"Português (Brasil)"` ou `"Espanhol (América Latina)"`
- Valores devem ser exatos (acentos, maiúsculas, parênteses)

**Resposta de sucesso (201):**
```json
{
  "success": true,
  "projectNumber": 157,
  "filesUploaded": 2
}
```

**Comportamento pós-envio:**
- Se conta habilitada para aprovação Alpha → projeto entra direto em análise/produção (sem pagamento no portal Alpha)
- Se não habilitada → projeto criado como Rascunho, aprovação manual no portal Alpha
- Arquivos DOCX/DOC sempre entram como Rascunho (exigem orçamento manual)

---

### Endpoint de Status (GET)
```
GET https://getprojectstatusexternal-n3gdftgt2a-uc.a.run.app
GET https://getprojectstatusexternal-n3gdftgt2a-uc.a.run.app?externalClientId=aluno@email.com
x-api-key: ak_SUA_CHAVE
```

**Resposta (200):**
```json
{
  "success": true,
  "total": 2,
  "projects": [
    {
      "projectNumber": 157,
      "projectName": "Contrato de Locação",
      "project_status": "Em Andamento",
      "payment_status": "Pago",
      "translation_status": "Em Tradução",
      "createdAt": "2026-03-26T17:30:00.000Z",
      "certifiedFiles": []
    },
    {
      "projectNumber": 142,
      "projectName": "Certidão de Nascimento",
      "project_status": "Finalizado",
      "payment_status": "Pago",
      "translation_status": "Finalizado",
      "createdAt": "2026-03-20T10:15:00.000Z",
      "certifiedFiles": [
        {
          "name": "Certidao_certificado.pdf",
          "url": "https://firebasestorage.googleapis.com/.../arquivo.pdf?alt=media&token=..."
        }
      ]
    }
  ]
}
```

**Campos de status:**

| Campo | Valores possíveis | Notas |
|-------|-------------------|-------|
| `project_status` | `"Rascunho"` \| `"Ag. Orçamento"` \| `"Ag. Aprovação"` \| `"Em Análise"` \| `"Em Andamento"` \| `"Em Divergência"` \| `"Finalizado"` \| `"Cancelado"` | Status geral do projeto |
| `payment_status` | `"Pendente"` \| `"Pago"` \| `"Cancelado"` | Status do pagamento na Alpha |
| `translation_status` | **Texto livre** — não há lista fixa. Exemplos: `"N/A"` \| `"Em Tradução"` \| `"Em Revisão"` \| `"Em Certificação"` \| `"Finalizado"` \| `"Cancelado"` | Atualizado dinamicamente conforme equipe trabalha |
| `certifiedFiles` | Array `[{ name, url }]` | Vazio `[]` até entrega liberada. URLs são download direto autenticado por token (sem `x-api-key`) |

**Recebendo arquivos finalizados:**
- Fazer polling do GET, filtrar por `translation_status === "Finalizado"`
- Baixar cada `certifiedFiles[].url` — link direto, sem header de auth
- **Importante:** não depender de valores específicos de `translation_status` — é texto livre e a Alpha pode configurar etapas adicionais

---

### Erros da API

| Código | Situação | Resposta |
|--------|----------|----------|
| 401 | API Key ausente ou inválida | `{"error": "API Key inválida"}` |
| 400 | Campos obrigatórios faltando | `{"error": "Campos obrigatórios: projectName, sourceLanguage, targetLanguage"}` |
| 400 | Nenhum arquivo enviado | `{"error": "Pelo menos um arquivo é necessário"}` |
| 405 | Método diferente de POST | `{"error": "Método não permitido"}` |
| 500 | Erro interno | `{"error": "Erro interno ao criar projeto"}` |

---

## Fluxo Completo (Matricula USA)

### 1. Upload do documento (existente)
- Aluno faz upload via `DocumentRequestsCard.tsx`
- Arquivo salvo no Supabase Storage (`student-documents` bucket)
- Registro criado em `document_request_uploads`
- **NOVO:** Payload enviado para webhook n8n

### 2. Webhook → n8n
- n8n recebe o payload com dados do documento
- Analisa se o documento já está em inglês:
  - **Já em inglês** → nenhuma ação adicional
  - **Em outro idioma** → n8n notifica o Matricula USA para iniciar fluxo de cotação

### 3. Cotação de Tradução
- Sistema conta páginas do PDF (reuso de `pdf-pages.ts` do Lush New)
- Calcula valor: páginas × preço por página (a definir)
- Aluno vê modal/página com o valor e escolhe método de pagamento
- Métodos: **Stripe**, **Zelle**, **Parcelow** — os mesmos já existentes no Matricula USA

### 4. Pagamento
- Reutilizar componentes e lógica de pagamento já implementados no projeto (`PaymentMethodSelector`, `StripeCheckout`, `ZelleCheckout`, Parcelow)
- Após pagamento confirmado: documento enviado para Alpha

### 5. Envio para Alpha (`send-to-alpha`)
```
POST Alpha API
  projectName: título do document_request
  sourceLanguage: idioma detectado pelo n8n
  targetLanguage: "Inglês"
  externalClientId: email do aluno
  isCertified: "true"
  files: arquivo do upload
```
- Recebe `projectNumber` → salva em `translation_orders.alpha_project_number`

### 6. Polling de Status (`sync-alpha-status`)
```
GET Alpha API?externalClientId=aluno@email.com
```
- Cron a cada 10 minutos
- Atualiza `translation_status` e `project_status` no banco
- Quando `translation_status === "Finalizado"`:
  - Salva `certified_files` (array de `{ name, url }`)
  - Salva `certified_at` (início do countdown de 60 dias)
  - Envia email/notificação ao aluno

### 7. Entrega do documento
- Aluno acessa página de Translations no dashboard
- Visualiza/baixa arquivo via URL do `certifiedFiles` (Firebase, token autenticado)
- Countdown de 60 dias exibido a partir de `certified_at`
- Admin monitora todas as traduções no dashboard admin

---

## Payload do Webhook para n8n

```json
{
  "upload_id": "uuid",
  "document_request_id": "uuid",
  "student_id": "uuid",
  "student_name": "string",
  "student_email": "string",
  "file_url": "string",
  "file_name": "string",
  "uploaded_at": "timestamp",
  "request_title": "string",
  "is_global": true
}
```

> Payload exato a confirmar com o dev n8n.

---

## Schema Proposto: `translation_orders`

```sql
CREATE TABLE public.translation_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID REFERENCES auth.users(id),
  upload_id UUID REFERENCES document_request_uploads(id),
  document_request_id UUID REFERENCES document_requests(id),

  -- Documento
  file_url TEXT,
  file_name TEXT,
  pages INT,
  price DECIMAL,

  -- Pagamento (interno Matricula USA)
  payment_status TEXT DEFAULT 'unpaid',        -- unpaid | paid | refunded
  payment_method TEXT DEFAULT 'pending',       -- pending | stripe | zelle | parcelow | manual
  payment_metadata JSONB,                      -- { paypal_order_id, gross_amount_usd, ... }

  -- Zelle
  zelle_receipt_url TEXT,
  zelle_status TEXT,                           -- pending_verification | approved | rejected
  zelle_confirmation_code TEXT,

  -- Alpha Translations
  alpha_project_number INT,                    -- projectNumber retornado pela Alpha API
  alpha_project_status TEXT,                   -- project_status da Alpha (Rascunho, Em Andamento, etc.)
  translation_status TEXT,                     -- translation_status da Alpha (texto livre)
  alpha_synced_at TIMESTAMPTZ,

  -- Entrega
  certified_files JSONB,                       -- [{ name: string, url: string }]
  certified_at TIMESTAMPTZ,                    -- início do countdown de 60 dias

  created_at TIMESTAMPTZ DEFAULT now()
);
```

---

## Componentes a Criar

### Frontend — Aluno
- **Modal de cotação:** exibe páginas + valor + seleção de pagamento (após n8n detectar não-inglês)
- **`TranslationsPage.tsx`** (`/dashboard/translations`): lista de traduções com status e countdown de 60 dias

### Frontend — Admin
- **`AdminTranslationsPage.tsx`** (`/admin/translations`): visão geral de todas as traduções em andamento

### Backend / Edge Functions (baseadas no Lush New)
- `send-to-alpha` — submete documento para Alpha API após pagamento confirmado
- `sync-alpha-status` — cron polling a cada 10min, atualiza status no banco
- `create-paypal-order` — cria order PayPal
- `capture-paypal-order` — captura pagamento + dispara `send-to-alpha`
- `approve-zelle-payment` — aprovação Zelle após validação n8n

---

## Workflow de Status

```
Upload do documento (DocumentRequestsCard.tsx)
    ↓
Webhook → n8n analisa idioma
    ↓
[Já em inglês?]
  Sim → fim (nenhuma ação)
  Não ↓
Modal de cotação (páginas × preço)
    ↓
Aluno escolhe pagamento (Stripe / Zelle / Parcelow)
    ↓
Pagamento confirmado
    ↓
send-to-alpha() → POST Alpha API → recebe projectNumber
    ↓
sync-alpha-status() polling a cada 10min
    ↓
translation_status: "Em Tradução" → "Em Certificação" → "Finalizado"
    ↓
Finalizado:
  - certified_files populado com [{ name, url }]
  - certified_at salvo
  - Email/notificação para o aluno
    ↓
Aluno baixa documento na página Translations (60 dias)
```

---

## Boas Práticas (Alpha API)

- **Nunca expor a API Key no frontend** — toda chamada via edge function (backend)
- Armazenar `ALPHA_API_KEY` em variável de ambiente (Supabase Vault)
- Validar arquivos antes de enviar (tipo e tamanho ≤ 25MB)
- Não depender de valores fixos de `translation_status` — é texto livre
- Download dos `certifiedFiles` não requer `x-api-key` — URLs autenticadas por token Firebase

---

## Checklist de Implementação

- [x] Entender arquitetura Lush New
- [x] Mapear Alpha Translations API (endpoints, params, responses)
- [x] Documentar fluxo e schema
- [ ] Confirmar payload webhook com dev n8n
- [ ] Definir preço por página no contexto Matricula USA
- [ ] Criar tabela `translation_orders` no Supabase
- [ ] Implementar disparo do webhook no upload (`DocumentRequestsCard.tsx`)
- [ ] Criar modal de cotação (frontend aluno)
- [ ] Adaptar edge functions do Lush New (`send-to-alpha`, `sync-alpha-status`, PayPal, Zelle)
- [ ] Criar página `TranslationsPage.tsx` (aluno)
- [ ] Criar página `AdminTranslationsPage.tsx` (admin)
- [ ] Configurar cron polling de status (Supabase pg_cron)

---

## Notas

- Lush New é a base de referência — reutilizar lógica, não reescrever do zero
- Fluxo n8n (detecção de idioma + validação Zelle) é responsabilidade do dev especialista
- O sistema é um SaaS interno ao Matricula USA (receita adicional por tradução)
- `externalClientId` = email do aluno (padrão adotado no Lush New)
- Arquivos traduzidos ficam no Firebase Storage da Alpha (URLs com token, 60 dias)
- Aguardando mais contexto antes de iniciar implementação
