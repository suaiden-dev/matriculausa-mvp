# Documentação Técnica: Sistema de Validação Zelle com n8n

## Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Fluxo Completo de Validação](#fluxo-completo-de-validação)
4. [Componentes do Sistema](#componentes-do-sistema)
5. [Edge Functions](#edge-functions)
6. [Integração com n8n](#integração-com-n8n)
7. [Estados e Transições](#estados-e-transições)
8. [Notificações](#notificações)
9. [Tratamento de Erros](#tratamento-de-erros)
10. [Diagramas de Fluxo](#diagramas-de-fluxo)

---

## Visão Geral

O sistema de validação Zelle com n8n é uma solução automatizada que processa pagamentos via Zelle através de validação por IA. O sistema utiliza o n8n como orquestrador de workflows para análise automática de comprovantes de pagamento, reduzindo significativamente a necessidade de intervenção manual.

### Características Principais
- ✅ Validação automática de comprovantes via IA
- ✅ Processamento assíncrono de pagamentos
- ✅ Notificações em tempo real para usuários e administradores
- ✅ Integração completa com o sistema de taxas
- ✅ Suporte a múltiplos tipos de taxas (selection_process, application_fee, scholarship_fee, i20_control)
- ✅ Rastreamento completo do ciclo de vida do pagamento

---

## Arquitetura do Sistema

```
┌─────────────────┐
│   Frontend      │
│  (React/TS)     │
└────────┬────────┘
         │
         │ 1. Upload comprovante
         │ 2. Envia webhook
         ▼
┌─────────────────┐
│   Supabase      │
│   Storage       │
│ (zelle_comprovantes)│
└────────┬────────┘
         │
         │ 3. URL pública
         ▼
┌─────────────────┐
│   n8n Webhook   │
│  (zelle-global) │
└────────┬────────┘
         │
         │ 4. Análise IA
         │ 5. Resposta
         ▼
┌─────────────────┐
│ Edge Functions  │
│ (Supabase)      │
└────────┬────────┘
         │
         │ 6. Atualização BD
         │ 7. Notificações
         ▼
┌─────────────────┐
│   Database      │
│ (zelle_payments)│
└─────────────────┘
```

---

## Fluxo Completo de Validação

### 1. Início do Processo (Frontend)

**Localização:** `project/src/components/ZelleCheckoutPage.tsx`

O usuário acessa a página de checkout Zelle e realiza as seguintes ações:

1. **Seleção do Arquivo**
   - Upload do comprovante de pagamento (imagem)
   - Validação de formato (JPG, PNG)
   - Validação de tamanho (máximo 5MB)

2. **Upload para Storage**
   ```typescript
   const fileName = `zelle-payment-${Date.now()}.${selectedFile.name.split('.').pop()}`;
   const filePath = `zelle-payments/${user?.id}/${fileName}`;
   
   const { data: uploadData, error: uploadError } = await supabase.storage
     .from('zelle_comprovantes')
     .upload(filePath, selectedFile);
   ```

3. **Geração da URL Pública**
   ```typescript
   const imageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/zelle_comprovantes/${uploadData.path}`;
   ```

### 2. Envio para n8n

**Webhook URL:** `https://nwh.suaiden.com/webhook/zelle-global`

**Payload Enviado:**
```typescript
{
  user_id: string,              // ID do usuário autenticado
  image_url: string,            // URL pública do comprovante
  value: string,                // Valor do pagamento (sem símbolos)
  currency: 'USD',              // Moeda
  fee_type: string,             // Tipo de taxa (selection_process, application_fee, etc.)
  timestamp: string,             // ISO timestamp
  payment_id: string,           // ID único gerado para o pagamento
  scholarships_ids?: string[],  // IDs de bolsas (se aplicável)
  promotional_coupon?: string,  // Código do cupom promocional (se aplicável)
  promotional_discount_amount?: number, // Valor do desconto
  original_amount?: number,     // Valor original antes do desconto
  final_amount?: number          // Valor final após desconto
}
```

**Código de Envio:**
```typescript
const webhookPayload: WebhookPayload = {
  user_id: user?.id,
  image_url: imageUrl,
  value: currentFee.amount.toString(),
  currency: 'USD',
  fee_type: normalizedFeeType,
  timestamp: new Date().toISOString(),
  payment_id: realPaymentId
};

const response = await fetch('https://nwh.suaiden.com/webhook/zelle-global', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify(webhookPayload),
});
```

### 3. Processamento no n8n

O n8n recebe o webhook e executa o workflow de validação:

1. **Download da Imagem**
   - Baixa o comprovante da URL fornecida
   - Valida formato e qualidade da imagem

2. **Análise por IA**
   - Processa a imagem através de modelo de IA
   - Extrai informações relevantes:
     - Valor do pagamento
     - Data do pagamento
     - Código de confirmação
     - Destinatário
     - Validade do comprovante

3. **Validação**
   - Compara valor extraído com valor esperado
   - Verifica data do pagamento
   - Valida formato e autenticidade do comprovante
   - Gera resposta de validação

4. **Resposta do n8n**
   ```json
   {
     "response": "The proof of payment is valid.",
     "status": "valid",
     "confidence": 0.95,
     "details": {
       "amount": "150.00",
       "date": "2025-01-15",
       "recipient": "pay@matriculausa.com"
     }
   }
   ```

### 4. Criação do Registro no Banco de Dados

**Edge Function:** `create-zelle-payment`

**Localização:** `project/supabase/functions/create-zelle-payment/index.ts`

Após o envio para n8n, o sistema cria um registro na tabela `zelle_payments`:

```typescript
const { data: paymentId, error: createError } = await supabase.rpc('create_zelle_payment', {
  p_user_id: user.id,
  p_fee_type: fee_type,
  p_amount: amount,
  p_currency: currency,
  p_recipient_email: recipient_email,
  p_recipient_name: recipient_name,
  p_screenshot_url: comprovante_url,
  p_metadata: {
    ...metadata,
    scholarships_ids: scholarships_ids,
    confirmation_code: confirmation_code,
    payment_date: payment_date,
    comprovante_url: comprovante_url
  }
});
```

**Status Inicial:** `pending_verification`

### 5. Processamento da Resposta do n8n

**Localização:** `project/src/components/ZelleCheckoutPage.tsx` (linhas 800-1042)

O frontend processa a resposta do n8n:

```typescript
// Capturar resposta do n8n
const responseText = await zelleWebhookResult.value.response.text();
const responseJson = JSON.parse(responseText);

// Verificar se a resposta é positiva
const response = responseJson.response.toLowerCase();
const isPositiveResponse = response === 'the proof of payment is valid.';
```

**Atualização do Registro:**

```typescript
const updateData: any = {
  screenshot_url: imageUrl,
  admin_notes: `n8n response: ${responseJson.response || responseText}`,
  updated_at: new Date().toISOString()
};

// Se aprovado automaticamente
if (isPositiveResponse) {
  updateData.status = 'approved';
  updateData.admin_approved_at = new Date().toISOString();
}

// Atualizar no banco
await supabase
  .from('zelle_payments')
  .update(updateData)
  .eq('id', recentPayment.id);
```

### 6. Validação Final (Edge Function)

**Edge Function:** `validate-zelle-payment-result`

**Localização:** `project/supabase/functions/validate-zelle-payment-result/index.ts`

Esta função é chamada quando o n8n retorna o resultado final da validação:

**Endpoint:** `POST /functions/v1/validate-zelle-payment-result`

**Payload:**
```typescript
{
  payment_id: string,
  valid: boolean,              // true se válido, false se inválido
  reason?: string,             // Motivo da validação/rejeição
  validation_details?: object, // Detalhes adicionais
  metadata?: object            // Metadados extras
}
```

**Processamento:**

1. **Buscar Pagamento**
   ```typescript
   const { data: payment, error: fetchError } = await supabase
     .from('zelle_payments')
     .select('*')
     .eq('id', payment_id)
     .single();
   ```

2. **Atualizar Status**
   ```typescript
   const newStatus = valid ? 'verified' : 'rejected';
   await supabase
     .from('zelle_payments')
     .update({
       status: newStatus,
       admin_notes: reason || (valid ? 'Automatically verified by n8n' : 'Automatically rejected by n8n'),
       verified_at: valid ? new Date().toISOString() : null,
       updated_at: new Date().toISOString(),
       metadata: {
         ...payment.metadata,
         validation_result: {
           valid,
           reason,
           validation_details,
           validated_at: new Date().toISOString()
         }
       }
     })
     .eq('id', payment_id);
   ```

3. **Atualizar Sistema (se válido)**
   - Atualiza `user_profiles` baseado no `fee_type`
   - Cria/atualiza `scholarship_applications` (se aplicável)
   - Registra em `individual_fee_payments`
   - Chama `approve-zelle-payment-automatic` para notificações

### 7. Aprovação Automática

**Edge Function:** `approve-zelle-payment-automatic`

**Localização:** `project/supabase/functions/approve-zelle-payment-automatic/index.ts`

Esta função é chamada automaticamente após validação bem-sucedida:

**Processamento:**

1. **Buscar ou Criar Pagamento**
   ```typescript
   const { data: existingPayment } = await supabaseClient
     .from('zelle_payments')
     .select('id, status, amount, fee_type_global')
     .eq('user_id', user_id)
     .in('fee_type_global', searchValues)
     .eq('status', 'pending')
     .order('created_at', { ascending: false })
     .limit(1)
     .maybeSingle();
   ```

2. **Atualizar Status para Approved**
   ```typescript
   await supabaseClient
     .from('zelle_payments')
     .update({
       status: 'approved',
       fee_type_global: normalizedFeeTypeGlobal,
       admin_approved_at: new Date().toISOString(),
       admin_notes: 'Automatically approved by n8n system'
     })
     .eq('id', paymentId);
   ```

3. **Marcar como Pago nas Tabelas Corretas**

   **Para `selection_process`:**
   ```typescript
   await supabaseClient
     .from('user_profiles')
     .update({ 
       has_paid_selection_process_fee: true,
       selection_process_fee_payment_method: 'zelle',
       updated_at: new Date().toISOString()
     })
     .eq('user_id', user_id);
   ```

   **Para `application_fee` ou `scholarship_fee`:**
   ```typescript
   await supabaseClient
     .from('scholarship_applications')
     .update({ 
       is_application_fee_paid: true, // ou is_scholarship_fee_paid
       application_fee_payment_method: 'zelle',
       updated_at: new Date().toISOString()
     })
     .eq('id', existingApp.id);
   ```

4. **Registrar em `individual_fee_payments`**
   ```typescript
   await supabaseClient.rpc('insert_individual_fee_payment', {
     p_user_id: user_id,
     p_fee_type: normalizedFeeType,
     p_amount: paymentAmount,
     p_payment_date: new Date().toISOString(),
     p_payment_method: 'zelle',
     p_payment_intent_id: null,
     p_stripe_charge_id: null,
     p_zelle_payment_id: paymentId
   });
   ```

5. **Enviar Notificações**
   - Notificação para o aluno
   - Notificação para admin
   - Notificação para seller (se aplicável)
   - Notificação para affiliate admin (se aplicável)
   - Notificação para universidade (se application_fee)

---

## Componentes do Sistema

### Frontend

#### 1. ZelleCheckoutPage
**Arquivo:** `project/src/components/ZelleCheckoutPage.tsx`

**Responsabilidades:**
- Interface de upload de comprovante
- Envio de webhook para n8n
- Processamento da resposta do n8n
- Atualização do registro no banco
- Redirecionamento para página de aguardo

**Principais Funções:**
- `handleSubmit()`: Processa o formulário e envia para n8n
- `sendWebhooks()`: Envia webhooks em paralelo
- Processamento da resposta do n8n e atualização do banco

#### 2. ZelleCheckout
**Arquivo:** `project/src/components/ZelleCheckout.tsx`

**Responsabilidades:**
- Componente alternativo de checkout
- Upload de comprovante
- Envio para n8n via webhook

### Backend (Edge Functions)

#### 1. create-zelle-payment
**Arquivo:** `project/supabase/functions/create-zelle-payment/index.ts`

**Endpoint:** `POST /functions/v1/create-zelle-payment`

**Responsabilidades:**
- Criar registro de pagamento Zelle
- Enviar webhook para n8n para validação
- Atualizar status baseado em resultado do n8n

**Parâmetros de Entrada:**
```typescript
{
  fee_type: string,
  amount: number,
  currency?: string,
  recipient_email: string,
  recipient_name: string,
  comprovante_url: string,
  confirmation_code: string,
  payment_date: string,
  scholarships_ids?: string[],
  metadata?: object
}
```

**Resposta:**
```typescript
{
  success: boolean,
  payment_id: string,
  message: string
}
```

#### 2. validate-zelle-payment-result
**Arquivo:** `project/supabase/functions/validate-zelle-payment-result/index.ts`

**Endpoint:** `POST /functions/v1/validate-zelle-payment-result`

**Responsabilidades:**
- Receber resultado da validação do n8n
- Atualizar status do pagamento
- Atualizar sistema (user_profiles, scholarship_applications)
- Chamar approve-zelle-payment-automatic

**Parâmetros de Entrada:**
```typescript
{
  payment_id: string,
  valid: boolean,
  reason?: string,
  validation_details?: object,
  metadata?: object
}
```

#### 3. approve-zelle-payment-automatic
**Arquivo:** `project/supabase/functions/approve-zelle-payment-automatic/index.ts`

**Endpoint:** `POST /functions/v1/approve-zelle-payment-automatic`

**Responsabilidades:**
- Aprovar pagamento automaticamente
- Marcar como pago nas tabelas corretas
- Registrar em individual_fee_payments
- Enviar notificações para todas as partes envolvidas

**Parâmetros de Entrada:**
```typescript
{
  user_id: string,
  fee_type_global: string,
  temp_payment_id: string,
  scholarship_ids?: string[]
}
```

---

## Integração com n8n

### Webhook de Entrada

**URL:** `https://nwh.suaiden.com/webhook/zelle-global`

**Método:** `POST`

**Content-Type:** `application/json`

### Payload Enviado

```json
{
  "user_id": "uuid-do-usuario",
  "image_url": "https://supabase.co/storage/v1/object/public/zelle_comprovantes/path/to/image.jpg",
  "value": "150.00",
  "currency": "USD",
  "fee_type": "selection_process",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "payment_id": "uuid-do-pagamento",
  "scholarships_ids": ["uuid-bolsa-1", "uuid-bolsa-2"],
  "promotional_coupon": "BLACK",
  "promotional_discount_amount": 50.00,
  "original_amount": 200.00,
  "final_amount": 150.00
}
```

### Resposta Esperada do n8n

**Formato 1: Validação Bem-Sucedida**
```json
{
  "response": "The proof of payment is valid.",
  "status": "valid",
  "confidence": 0.95,
  "details": {
    "amount": "150.00",
    "date": "2025-01-15",
    "recipient": "pay@matriculausa.com",
    "confirmation_code": "ABC123"
  }
}
```

**Formato 2: Validação Falhou**
```json
{
  "response": "The proof of payment could not be validated.",
  "status": "invalid",
  "confidence": 0.60,
  "details": {
    "reason": "Amount mismatch",
    "expected": "150.00",
    "found": "100.00"
  }
}
```

**Formato 3: Requer Revisão Manual**
```json
{
  "response": "Unable to determine validity. Manual review required.",
  "status": "pending",
  "confidence": 0.40,
  "details": {
    "reason": "Low image quality",
    "suggestions": ["Please provide a clearer image"]
  }
}
```

### Callback URL (Opcional)

O sistema pode configurar uma URL de callback para o n8n notificar quando a validação estiver completa:

```typescript
callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/validate-zelle-payment-result`
```

---

## Estados e Transições

### Estados do Pagamento

| Estado | Descrição | Próximo Estado Possível |
|--------|-----------|------------------------|
| `pending_verification` | Aguardando validação do n8n | `approved`, `rejected`, `pending_verification` |
| `approved` | Aprovado automaticamente pelo n8n | - |
| `verified` | Verificado e processado | - |
| `rejected` | Rejeitado pelo n8n | - |
| `pending` | Pendente (criado mas não enviado) | `pending_verification` |

### Fluxo de Estados

```
pending
  ↓
[Upload comprovante]
  ↓
pending_verification
  ↓
[Validação n8n]
  ↓
    ├─→ approved (se válido)
    │     ↓
    │   [Processamento automático]
    │     ↓
    │   verified
    │
    └─→ rejected (se inválido)
          ↓
        [Revisão manual necessária]
```

### Transições de Estado

**1. pending → pending_verification**
- **Trigger:** Upload do comprovante e envio para n8n
- **Ação:** Criação do registro em `zelle_payments`

**2. pending_verification → approved**
- **Trigger:** Resposta positiva do n8n ("The proof of payment is valid.")
- **Ação:** Atualização do status e chamada de `approve-zelle-payment-automatic`

**3. pending_verification → rejected**
- **Trigger:** Resposta negativa do n8n
- **Ação:** Atualização do status e notificação para admin

**4. approved → verified**
- **Trigger:** Processamento completo em `approve-zelle-payment-automatic`
- **Ação:** Atualização final do sistema

---

## Notificações

### Tipos de Notificação

#### 1. Notificação para Aluno

**Quando:** Após upload do comprovante e durante processamento

**Payload:**
```typescript
{
  tipo_notf: "Pagamento Zelle em Processamento",
  email_aluno: string,
  nome_aluno: string,
  o_que_enviar: string,
  temp_payment_id: string,
  fee_type: string,
  amount: number,
  uploaded_at: string,
  status: "processing"
}
```

**Webhook:** `https://nwh.suaiden.com/webhook/notfmatriculausa`

#### 2. Notificação para Admin

**Quando:** Pagamento fica pendente de aprovação manual

**Payload:**
```typescript
{
  tipo_notf: "Pagamento Zelle pendente para avaliação",
  email_admin: string,
  nome_admin: string,
  phone_admin: string,
  email_aluno: string,
  nome_aluno: string,
  phone_aluno: string,
  o_que_enviar: string,
  temp_payment_id: string,
  fee_type: string,
  amount: number,
  uploaded_at: string
}
```

#### 3. Notificação de Aprovação Automática

**Quando:** Pagamento aprovado automaticamente pelo n8n

**Payload:**
```typescript
{
  tipo_notf: "Payment automatically approved",
  email_aluno: string,
  nome_aluno: string,
  o_que_enviar: string,
  payment_id: string,
  fee_type: string,
  approved_by: "Automatic System"
}
```

#### 4. Notificação para Seller

**Quando:** Pagamento do aluno do seller é aprovado

**Payload:**
```typescript
{
  tipo_notf: "Pagamento do seu aluno aprovado automaticamente",
  email_seller: string,
  nome_seller: string,
  phone_seller: string,
  email_aluno: string,
  nome_aluno: string,
  phone_aluno: string,
  o_que_enviar: string,
  payment_id: string,
  fee_type: string,
  amount: number,
  estimated_commission: number
}
```

#### 5. Notificação para Universidade

**Quando:** Application fee ou scholarship fee é pago

**Payload:**
```typescript
{
  tipo_notf: "Novo pagamento de application fee",
  email_aluno: string,
  nome_aluno: string,
  nome_bolsa: string,
  nome_universidade: string,
  email_universidade: string,
  o_que_enviar: string
}
```

---

## Tratamento de Erros

### Erros no Upload

**Erro:** Falha no upload para Supabase Storage
- **Ação:** Exibir mensagem de erro ao usuário
- **Retry:** Permitir novo upload
- **Log:** Registrar erro no console

### Erros no Webhook n8n

**Erro:** Falha ao enviar webhook para n8n
- **Ação:** Marcar pagamento como `pending_verification`
- **Retry:** Não há retry automático (requer ação manual)
- **Log:** Registrar warning no console

**Código:**
```typescript
if (!n8nResponse.ok) {
  console.warn('[create-zelle-payment] Webhook failed:', n8nResponse.status);
  await supabase
    .from('zelle_payments')
    .update({ status: 'pending_verification' })
    .eq('id', paymentId);
}
```

### Erros na Validação

**Erro:** Resposta inválida do n8n
- **Ação:** Manter status como `pending_verification`
- **Notificação:** Enviar notificação para admin
- **Log:** Registrar resposta do n8n em `admin_notes`

### Erros no Processamento Automático

**Erro:** Falha em `approve-zelle-payment-automatic`
- **Ação:** Não falhar o processo de validação
- **Log:** Registrar erro mas continuar
- **Fallback:** Pagamento permanece `approved` mas pode requerer processamento manual

**Código:**
```typescript
try {
  await approveZellePaymentAutomatic(payment);
} catch (error) {
  console.error('Erro ao aprovar automaticamente:', error);
  // Não falhar o processo
}
```

### Prevenção de Duplicação

**Proteção:** Verificação de pagamentos duplicados nos últimos 30 segundos

**Código:**
```typescript
const thirtySecondsAgo = new Date(Date.now() - 30000).toISOString();

const { data: existingPayment } = await supabase
  .from('zelle_payments')
  .select('id, fee_type, created_at')
  .eq('user_id', user?.id)
  .eq('amount', currentFee.amount)
  .eq('fee_type', normalizedFeeType)
  .gte('created_at', thirtySecondsAgo)
  .order('created_at', { ascending: false })
  .limit(1);

if (existingPayment && existingPayment.length > 0) {
  throw new Error('Duplicate payment detected. Please wait a moment before trying again.');
}
```

---

## Diagramas de Fluxo

### Fluxo Principal de Validação

```
[Usuário faz upload]
        ↓
[Upload para Storage]
        ↓
[Gera URL pública]
        ↓
[Envia webhook para n8n]
        ↓
[Cria registro: pending_verification]
        ↓
[n8n processa imagem]
        ↓
    ┌───┴───┐
    │       │
[Válido] [Inválido]
    │       │
    ↓       ↓
[approved] [rejected]
    │       │
    ↓       ↓
[Processa] [Notifica Admin]
    │
    ↓
[verified]
```

### Fluxo de Aprovação Automática

```
[Pagamento aprovado]
        ↓
[approve-zelle-payment-automatic]
        ↓
[Atualiza zelle_payments: approved]
        ↓
[Atualiza user_profiles/scholarship_applications]
        ↓
[Registra em individual_fee_payments]
        ↓
[Envia notificações]
    ├─→ Aluno
    ├─→ Admin
    ├─→ Seller (se aplicável)
    ├─→ Affiliate Admin (se aplicável)
    └─→ Universidade (se application_fee)
```

### Fluxo de Notificações

```
[Evento de Pagamento]
        ↓
    ┌───┴───┐
    │       │
[Upload] [Aprovação]
    │       │
    ↓       ↓
[Notifica] [Notifica]
Aluno      Todas as partes
    │       │
    └───┬───┘
        ↓
[Webhook n8n: notfmatriculausa]
```

---

## Considerações Técnicas

### Performance

- **Upload Assíncrono:** Upload e envio para n8n são processados de forma assíncrona
- **Retry Logic:** Sistema tenta buscar pagamento criado pelo n8n até 5 vezes com delay de 1 segundo
- **Paralelismo:** Webhooks são enviados em paralelo quando necessário

### Segurança

- **Autenticação:** Todas as edge functions requerem autenticação via JWT
- **Validação:** Validação de parâmetros obrigatórios em todas as funções
- **Sanitização:** Dados são sanitizados antes de inserção no banco

### Escalabilidade

- **Stateless:** Edge functions são stateless, permitindo escalabilidade horizontal
- **Queue System:** n8n atua como sistema de fila para processamento de validações
- **Database Indexes:** Índices apropriados em `zelle_payments` para consultas rápidas

### Monitoramento

- **Logs Detalhados:** Todas as operações são logadas com prefixos identificadores
- **Error Tracking:** Erros são capturados e logados sem quebrar o fluxo
- **Status Tracking:** Status do pagamento é rastreado em cada etapa

---

## Conclusão

O sistema de validação Zelle com n8n oferece uma solução robusta e automatizada para processamento de pagamentos, reduzindo significativamente a necessidade de intervenção manual enquanto mantém alta confiabilidade e rastreabilidade.

### Pontos Fortes
- ✅ Processamento automático eficiente
- ✅ Integração completa com sistema de taxas
- ✅ Notificações em tempo real
- ✅ Tratamento robusto de erros
- ✅ Rastreabilidade completa

### Melhorias Futuras
- 🔄 Sistema de retry automático para webhooks falhos
- 📊 Dashboard de monitoramento de validações
- 🤖 Melhoria contínua do modelo de IA no n8n
- 📈 Métricas e analytics de validações

---

**Última Atualização:** Janeiro 2025  
**Versão:** 1.0  
**Autor:** Sistema MatriculaUSA





