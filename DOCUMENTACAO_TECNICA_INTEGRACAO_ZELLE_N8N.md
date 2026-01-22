# Documentação Técnica: Integração Zelle com n8n - Guia de Replicação

## Índice
1. [Visão Geral da Integração](#visão-geral-da-integração)
2. [Fluxo de Chamadas](#fluxo-de-chamadas)
3. [Payloads Detalhados](#payloads-detalhados)
4. [Implementação Frontend](#implementação-frontend)
5. [Implementação Backend](#implementação-backend)
6. [Processamento de Resposta](#processamento-de-resposta)
7. [Exemplos de Código Completos](#exemplos-de-código-completos)

---

## Visão Geral da Integração

### Arquitetura de Chamadas

```
┌─────────────┐
│  Frontend   │
│  (React)    │
└──────┬──────┘
       │
       │ 1. POST /webhook/zelle-global
       │    Payload: { user_id, image_url, value, ... }
       ▼
┌─────────────┐
│     n8n     │
│   Webhook   │
└──────┬──────┘
       │
       │ 2. Processa imagem com IA
       │ 3. Retorna JSON
       │    { response, status, ... }
       ▼
┌─────────────┐
│  Frontend   │
│  (React)    │
└──────┬──────┘
       │
       │ 4. Atualiza banco de dados
       │ 5. Processa resultado
       ▼
┌─────────────┐
│  Database   │
│ (Supabase)  │
└─────────────┘
```

### Endpoints Principais

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `https://nwh.suaiden.com/webhook/zelle-global` | POST | Webhook do n8n para validação |
| `POST /functions/v1/validate-zelle-payment-result` | POST | Callback opcional do n8n |

---

## Fluxo de Chamadas

### 1. Upload do Comprovante

**Localização:** Frontend - `ZelleCheckoutPage.tsx`

**Passo 1.1: Upload para Storage**

```typescript
// 1. Preparar arquivo
const fileName = `zelle-payment-${Date.now()}.${selectedFile.name.split('.').pop()}`;
const filePath = `zelle-payments/${user?.id}/${fileName}`;

// 2. Upload para Supabase Storage
const { data: uploadData, error: uploadError } = await supabase.storage
  .from('zelle_comprovantes')
  .upload(filePath, selectedFile);

if (uploadError) {
  throw new Error('Falha no upload do arquivo');
}

// 3. Gerar URL pública
const imageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/zelle_comprovantes/${uploadData.path}`;
```

**Parâmetros:**
- `selectedFile`: File object do input
- `user?.id`: UUID do usuário autenticado
- `zelle_comprovantes`: Nome do bucket no Supabase Storage

**Retorno:**
- `uploadData.path`: Caminho do arquivo no storage
- `imageUrl`: URL pública acessível pelo n8n

---

### 2. Preparação do Payload

**Localização:** Frontend - `ZelleCheckoutPage.tsx` (linhas 563-635)

**Passo 2.1: Criar Payload Base**

```typescript
// Gerar ID único para o pagamento
const realPaymentId = crypto.randomUUID();

// Payload base
const webhookPayload: WebhookPayload = {
  user_id: user?.id,
  image_url: imageUrl,
  value: currentFee.amount.toString(), // Sem símbolos, apenas número
  currency: 'USD',
  fee_type: normalizedFeeType, // 'selection_process', 'application_fee', etc.
  timestamp: new Date().toISOString(),
  payment_id: realPaymentId
};
```

**Passo 2.2: Adicionar Campos Condicionais**

```typescript
// Se for taxa de bolsa, adicionar IDs
if ((normalizedFeeType === 'application_fee' || normalizedFeeType === 'scholarship_fee') && scholarshipsIds) {
  const idsFromUrl = scholarshipsIds.split(',').map((s) => s.trim()).filter(Boolean);
  if (idsFromUrl.length > 0) {
    webhookPayload.scholarships_ids = idsFromUrl;
  }
}

// Se houver cupom promocional
if (normalizedFeeType === 'scholarship_fee' && scholarshipFeePromotionalCoupon) {
  (webhookPayload as any).promotional_coupon = scholarshipFeePromotionalCoupon.code;
  (webhookPayload as any).promotional_discount_amount = scholarshipFeePromotionalCoupon.discountAmount;
  (webhookPayload as any).original_amount = scholarshipFee ? parseFloat(scholarshipFee.replace('$', '')) : currentFee.amount;
  (webhookPayload as any).final_amount = currentFee.amount;
}

// Buscar scholarship_application_id se aplicável
if (normalizedFeeType === 'application_fee' || normalizedFeeType === 'scholarship_fee') {
  if (scholarshipsIds) {
    const { data: applicationData } = await supabase
      .from('scholarship_applications')
      .select('id, scholarship_id')
      .eq('student_id', user?.id)
      .in('scholarship_id', scholarshipsIds.split(','))
      .limit(1);
    
    if (applicationData && applicationData[0]) {
      webhookPayload.scholarship_application_id = applicationData[0].id;
    }
  }
}
```

---

### 3. Envio para n8n

**Localização:** Frontend - `ZelleCheckoutPage.tsx` (linhas 733-788)

**Passo 3.1: Configurar Requisição**

```typescript
const sendWebhooks = async () => {
  const webhooks = [
    {
      url: 'https://nwh.suaiden.com/webhook/zelle-global',
      payload: webhookPayload,
      name: 'Zelle Validator'
    }
  ];
  
  // Enviar webhooks em paralelo
  const results = await Promise.allSettled(
    webhooks.map(async (webhook) => {
      try {
        console.log(`📤 Enviando ${webhook.name}...`);
        
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhook.payload),
        });
        
        if (!response.ok) {
          throw new Error(`${webhook.name} failed: ${response.status} ${response.statusText}`);
        }
        
        console.log(`✅ ${webhook.name} enviado com sucesso!`);
        return { success: true, webhook: webhook.name, response };
      } catch (error) {
        console.error(`❌ ${webhook.name} falhou:`, error);
        return { success: false, webhook: webhook.name, error };
      }
    })
  );
  
  return results;
};

// Executar
const webhookResults = await sendWebhooks();
```

**Headers Obrigatórios:**
```typescript
{
  'Content-Type': 'application/json'
}
```

**Método:** `POST`

**URL:** `https://nwh.suaiden.com/webhook/zelle-global`

---

## Payloads Detalhados

### Payload de Envio (Frontend → n8n)

#### Estrutura Completa

```typescript
interface WebhookPayload {
  // Campos obrigatórios
  user_id: string;              // UUID do usuário
  image_url: string;            // URL pública do comprovante
  value: string;                // Valor do pagamento (string numérica)
  currency: string;             // Moeda (geralmente 'USD')
  fee_type: string;             // Tipo de taxa
  timestamp: string;             // ISO 8601 timestamp
  payment_id: string;           // UUID único do pagamento
  
  // Campos opcionais
  scholarships_ids?: string[];   // IDs de bolsas (para application_fee/scholarship_fee)
  scholarship_application_id?: string; // ID da candidatura existente
  
  // Campos de cupom promocional (opcional)
  promotional_coupon?: string;
  promotional_discount_amount?: number;
  original_amount?: number;
  final_amount?: number;
}
```

#### Exemplo 1: Selection Process Fee

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "image_url": "https://xxxxx.supabase.co/storage/v1/object/public/zelle_comprovantes/zelle-payments/550e8400-e29b-41d4-a716-446655440000/zelle-payment-1705320000000.jpg",
  "value": "150.00",
  "currency": "USD",
  "fee_type": "selection_process",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "payment_id": "660e8400-e29b-41d4-a716-446655440001"
}
```

#### Exemplo 2: Application Fee com Scholarship

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "image_url": "https://xxxxx.supabase.co/storage/v1/object/public/zelle_comprovantes/zelle-payments/550e8400-e29b-41d4-a716-446655440000/zelle-payment-1705320000000.jpg",
  "value": "200.00",
  "currency": "USD",
  "fee_type": "application_fee",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "payment_id": "660e8400-e29b-41d4-a716-446655440001",
  "scholarships_ids": ["770e8400-e29b-41d4-a716-446655440002"],
  "scholarship_application_id": "880e8400-e29b-41d4-a716-446655440003"
}
```

#### Exemplo 3: Scholarship Fee com Cupom Promocional

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "image_url": "https://xxxxx.supabase.co/storage/v1/object/public/zelle_comprovantes/zelle-payments/550e8400-e29b-41d4-a716-446655440000/zelle-payment-1705320000000.jpg",
  "value": "150.00",
  "currency": "USD",
  "fee_type": "scholarship_fee",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "payment_id": "660e8400-e29b-41d4-a716-446655440001",
  "scholarships_ids": ["770e8400-e29b-41d4-a716-446655440002"],
  "promotional_coupon": "BLACK",
  "promotional_discount_amount": 50.00,
  "original_amount": 200.00,
  "final_amount": 150.00
}
```

#### Exemplo 4: I-20 Control Fee com Cupom

```json
{
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "image_url": "https://xxxxx.supabase.co/storage/v1/object/public/zelle_comprovantes/zelle-payments/550e8400-e29b-41d4-a716-446655440000/zelle-payment-1705320000000.jpg",
  "value": "100.00",
  "currency": "USD",
  "fee_type": "i20_control",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "payment_id": "660e8400-e29b-41d4-a716-446655440001",
  "promotional_coupon": "BLACK",
  "promotional_discount_amount": 25.00,
  "original_amount": 125.00,
  "final_amount": 100.00
}
```

---

### Payload de Resposta (n8n → Frontend)

#### Estrutura da Resposta

```typescript
interface N8nResponse {
  // Campo principal de validação
  response: string;  // Mensagem de validação
  
  // Campos opcionais
  status?: string;        // 'valid', 'invalid', 'pending'
  confidence?: number;    // 0.0 a 1.0
  details?: {
    amount?: string;
    date?: string;
    recipient?: string;
    confirmation_code?: string;
    reason?: string;
    expected?: string;
    found?: string;
    suggestions?: string[];
  };
}
```

#### Exemplo 1: Validação Bem-Sucedida

```json
{
  "response": "The proof of payment is valid.",
  "status": "valid",
  "confidence": 0.95,
  "details": {
    "amount": "150.00",
    "date": "2025-01-15",
    "recipient": "pay@matriculausa.com",
    "confirmation_code": "ABC123XYZ"
  }
}
```

**Interpretação:**
- `response === "The proof of payment is valid."` → Pagamento aprovado
- Status deve ser atualizado para `approved`
- Processar aprovação automática

#### Exemplo 2: Validação Falhou

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

**Interpretação:**
- `response !== "The proof of payment is valid."` → Requer revisão manual
- Status deve permanecer `pending_verification`
- Notificar admin para revisão

#### Exemplo 3: Requer Revisão Manual

```json
{
  "response": "Unable to determine validity. Manual review required.",
  "status": "pending",
  "confidence": 0.40,
  "details": {
    "reason": "Low image quality",
    "suggestions": [
      "Please provide a clearer image",
      "Ensure all text is visible"
    ]
  }
}
```

**Interpretação:**
- Confiança baixa (< 0.7) → Revisão manual necessária
- Status: `pending_verification`
- Notificar admin

#### Exemplo 4: Resposta Mínima

```json
{
  "response": "The proof of payment is valid."
}
```

**Interpretação:**
- Apenas o campo `response` é obrigatório
- Se contém "valid", considerar aprovado

---

## Implementação Frontend

### Código Completo de Envio

```typescript
// ============================================
// FUNÇÃO COMPLETA DE ENVIO PARA N8N
// ============================================

interface WebhookPayload {
  user_id: string;
  image_url: string;
  value: string;
  currency: string;
  fee_type: string;
  timestamp: string;
  payment_id: string;
  scholarships_ids?: string[];
  scholarship_application_id?: string;
  promotional_coupon?: string;
  promotional_discount_amount?: number;
  original_amount?: number;
  final_amount?: number;
}

async function sendZellePaymentToN8n(
  user: { id: string },
  imageFile: File,
  feeType: string,
  amount: number,
  options?: {
    scholarshipsIds?: string;
    promotionalCoupon?: {
      code: string;
      discountAmount: number;
      originalAmount: number;
      finalAmount: number;
    };
  }
): Promise<{ paymentId: string; n8nResponse: any }> {
  
  // 1. Upload do arquivo para Storage
  const fileName = `zelle-payment-${Date.now()}.${imageFile.name.split('.').pop()}`;
  const filePath = `zelle-payments/${user.id}/${fileName}`;
  
  const { data: uploadData, error: uploadError } = await supabase.storage
    .from('zelle_comprovantes')
    .upload(filePath, imageFile);
  
  if (uploadError) {
    throw new Error(`Falha no upload: ${uploadError.message}`);
  }
  
  // 2. Gerar URL pública
  const imageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/zelle_comprovantes/${uploadData.path}`;
  
  // 3. Gerar ID único do pagamento
  const paymentId = crypto.randomUUID();
  
  // 4. Construir payload base
  const payload: WebhookPayload = {
    user_id: user.id,
    image_url: imageUrl,
    value: amount.toString(),
    currency: 'USD',
    fee_type: feeType,
    timestamp: new Date().toISOString(),
    payment_id: paymentId
  };
  
  // 5. Adicionar campos condicionais
  if (options?.scholarshipsIds) {
    const ids = options.scholarshipsIds.split(',').map(s => s.trim()).filter(Boolean);
    if (ids.length > 0) {
      payload.scholarships_ids = ids;
    }
  }
  
  if (options?.promotionalCoupon) {
    payload.promotional_coupon = options.promotionalCoupon.code;
    payload.promotional_discount_amount = options.promotionalCoupon.discountAmount;
    payload.original_amount = options.promotionalCoupon.originalAmount;
    payload.final_amount = options.promotionalCoupon.finalAmount;
  }
  
  // 6. Buscar scholarship_application_id se aplicável
  if ((feeType === 'application_fee' || feeType === 'scholarship_fee') && options?.scholarshipsIds) {
    const { data: applicationData } = await supabase
      .from('scholarship_applications')
      .select('id, scholarship_id')
      .eq('student_id', user.id)
      .in('scholarship_id', options.scholarshipsIds.split(','))
      .limit(1);
    
    if (applicationData && applicationData[0]) {
      payload.scholarship_application_id = applicationData[0].id;
    }
  }
  
  // 7. Enviar para n8n
  console.log('📤 Enviando payload para n8n:', payload);
  
  const response = await fetch('https://nwh.suaiden.com/webhook/zelle-global', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  
  if (!response.ok) {
    throw new Error(`n8n webhook failed: ${response.status} ${response.statusText}`);
  }
  
  // 8. Processar resposta
  const responseText = await response.text();
  let n8nResponse;
  
  try {
    n8nResponse = JSON.parse(responseText);
  } catch (e) {
    // Se não for JSON, tratar como texto simples
    n8nResponse = { response: responseText };
  }
  
  console.log('📥 Resposta do n8n:', n8nResponse);
  
  return {
    paymentId,
    n8nResponse
  };
}
```

### Processamento da Resposta

```typescript
// ============================================
// PROCESSAMENTO DA RESPOSTA DO N8N
// ============================================

interface ProcessN8nResponseResult {
  isValid: boolean;
  requiresManualReview: boolean;
  status: 'approved' | 'pending_verification' | 'rejected';
  message: string;
}

function processN8nResponse(n8nResponse: any): ProcessN8nResponseResult {
  // Verificar se a resposta é válida
  if (!n8nResponse || !n8nResponse.response) {
    return {
      isValid: false,
      requiresManualReview: true,
      status: 'pending_verification',
      message: 'Resposta inválida do n8n'
    };
  }
  
  // Normalizar resposta para comparação
  const response = n8nResponse.response.toLowerCase().trim();
  const isValidResponse = response === 'the proof of payment is valid.';
  
  // Verificar confiança se disponível
  const confidence = n8nResponse.confidence || 1.0;
  const hasLowConfidence = confidence < 0.7;
  
  // Determinar status
  if (isValidResponse && !hasLowConfidence) {
    return {
      isValid: true,
      requiresManualReview: false,
      status: 'approved',
      message: 'Pagamento aprovado automaticamente'
    };
  } else if (isValidResponse && hasLowConfidence) {
    return {
      isValid: true,
      requiresManualReview: true,
      status: 'pending_verification',
      message: 'Pagamento válido mas requer confirmação manual'
    };
  } else {
    return {
      isValid: false,
      requiresManualReview: true,
      status: 'pending_verification',
      message: n8nResponse.response || 'Requer revisão manual'
    };
  }
}

// Uso:
const { paymentId, n8nResponse } = await sendZellePaymentToN8n(...);
const result = processN8nResponse(n8nResponse);

if (result.status === 'approved') {
  // Atualizar pagamento como aprovado
  await updatePaymentStatus(paymentId, 'approved');
  // Processar aprovação automática
  await processAutomaticApproval(paymentId);
} else {
  // Manter como pending_verification
  await updatePaymentStatus(paymentId, 'pending_verification');
  // Notificar admin
  await notifyAdminForReview(paymentId);
}
```

### Atualização do Banco de Dados

```typescript
// ============================================
// ATUALIZAÇÃO DO BANCO APÓS RESPOSTA N8N
// ============================================

async function updatePaymentWithN8nResult(
  paymentId: string,
  imageUrl: string,
  n8nResponse: any,
  result: ProcessN8nResponseResult
) {
  // Buscar pagamento (com retry)
  let payment = null;
  let attempts = 0;
  const maxAttempts = 5;
  
  while (attempts < maxAttempts && !payment) {
    attempts++;
    
    const { data, error } = await supabase
      .from('zelle_payments')
      .select('id')
      .eq('id', paymentId)
      .single();
    
    if (error && error.code === 'PGRST116') {
      // Não encontrado, aguardar e tentar novamente
      await new Promise(resolve => setTimeout(resolve, 1000));
      continue;
    }
    
    if (error) {
      throw new Error(`Erro ao buscar pagamento: ${error.message}`);
    }
    
    payment = data;
  }
  
  if (!payment) {
    throw new Error('Pagamento não encontrado após múltiplas tentativas');
  }
  
  // Preparar dados de atualização
  const updateData: any = {
    screenshot_url: imageUrl,
    admin_notes: `n8n response: ${n8nResponse.response || JSON.stringify(n8nResponse)}`,
    updated_at: new Date().toISOString()
  };
  
  // Se aprovado, atualizar status
  if (result.status === 'approved') {
    updateData.status = 'approved';
    updateData.admin_approved_at = new Date().toISOString();
  }
  
  // Atualizar no banco
  const { error: updateError } = await supabase
    .from('zelle_payments')
    .update(updateData)
    .eq('id', paymentId);
  
  if (updateError) {
    throw new Error(`Erro ao atualizar pagamento: ${updateError.message}`);
  }
  
  return { success: true, paymentId, status: result.status };
}
```

---

## Implementação Backend

### Edge Function: Receber Callback do n8n (Opcional)

```typescript
// ============================================
// EDGE FUNCTION: validate-zelle-payment-result
// ============================================

import { createClient } from 'npm:@supabase/supabase-js@2.49.1';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
);

function corsResponse(body: string | object | null, status = 200) {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (status === 204) {
    return new Response(null, { status, headers });
  }

  return new Response(JSON.stringify(body), { status, headers });
}

Deno.serve(async (req) => {
  try {
    // CORS preflight
    if (req.method === 'OPTIONS') {
      return corsResponse(null, 204);
    }

    if (req.method !== 'POST') {
      return corsResponse({ error: 'Method not allowed' }, 405);
    }

    // Parse do payload do n8n
    const {
      payment_id,
      valid,
      reason,
      validation_details,
      metadata = {}
    } = await req.json();

    // Validação
    if (!payment_id || typeof valid !== 'boolean') {
      return corsResponse({ 
        error: 'Missing required fields: payment_id, valid' 
      }, 400);
    }

    console.log('[validate-zelle-payment-result] Processando validação:', {
      payment_id,
      valid
    });

    // Buscar pagamento
    const { data: payment, error: fetchError } = await supabase
      .from('zelle_payments')
      .select('*')
      .eq('id', payment_id)
      .single();

    if (fetchError || !payment) {
      return corsResponse({ error: 'Payment not found' }, 404);
    }

    // Atualizar status
    const newStatus = valid ? 'verified' : 'rejected';
    
    const { error: updateError } = await supabase
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
            validated_at: new Date().toISOString(),
            ...metadata
          }
        }
      })
      .eq('id', payment_id);

    if (updateError) {
      return corsResponse({ error: 'Failed to update payment status' }, 500);
    }

    // Se válido, processar aprovação automática
    if (valid) {
      // Chamar função de aprovação automática
      // (implementação específica do seu sistema)
    }

    return corsResponse({ 
      success: true,
      payment_id: payment_id,
      status: newStatus,
      message: `Payment ${newStatus} automatically by n8n`
    }, 200);

  } catch (error) {
    console.error('[validate-zelle-payment-result] Unexpected error:', error);
    return corsResponse({ error: 'Internal server error' }, 500);
  }
});
```

### Payload do Callback (n8n → Backend)

Se você configurar o n8n para fazer callback automático:

```typescript
// Payload que o n8n enviaria para o callback
{
  "payment_id": "660e8400-e29b-41d4-a716-446655440001",
  "valid": true,
  "reason": "Payment validated successfully",
  "validation_details": {
    "amount": "150.00",
    "date": "2025-01-15",
    "recipient": "pay@matriculausa.com",
    "confidence": 0.95
  },
  "metadata": {
    "processed_at": "2025-01-15T10:35:00.000Z",
    "n8n_execution_id": "exec_123456"
  }
}
```

---

## Processamento de Resposta

### Lógica de Decisão

```typescript
// ============================================
// LÓGICA DE DECISÃO BASEADA NA RESPOSTA
// ============================================

function determinePaymentStatus(n8nResponse: any): {
  status: string;
  shouldApprove: boolean;
  shouldNotifyAdmin: boolean;
  message: string;
} {
  // Caso 1: Resposta vazia ou inválida
  if (!n8nResponse || !n8nResponse.response) {
    return {
      status: 'pending_verification',
      shouldApprove: false,
      shouldNotifyAdmin: true,
      message: 'Resposta inválida do n8n - requer revisão manual'
    };
  }
  
  // Caso 2: Resposta positiva explícita
  const response = n8nResponse.response.toLowerCase().trim();
  const isPositiveResponse = response === 'the proof of payment is valid.';
  
  if (isPositiveResponse) {
    // Verificar confiança
    const confidence = n8nResponse.confidence || 1.0;
    
    if (confidence >= 0.7) {
      return {
        status: 'approved',
        shouldApprove: true,
        shouldNotifyAdmin: false,
        message: 'Pagamento aprovado automaticamente'
      };
    } else {
      return {
        status: 'pending_verification',
        shouldApprove: false,
        shouldNotifyAdmin: true,
        message: `Pagamento válido mas com baixa confiança (${confidence}) - requer confirmação`
      };
    }
  }
  
  // Caso 3: Resposta negativa ou ambígua
  return {
    status: 'pending_verification',
    shouldApprove: false,
    shouldNotifyAdmin: true,
    message: n8nResponse.response || 'Requer revisão manual'
  };
}
```

### Fluxo Completo de Processamento

```typescript
// ============================================
// FLUXO COMPLETO DE PROCESSAMENTO
// ============================================

async function processZellePaymentComplete(
  user: { id: string },
  imageFile: File,
  feeType: string,
  amount: number,
  options?: {
    scholarshipsIds?: string;
    promotionalCoupon?: any;
  }
) {
  try {
    // 1. Enviar para n8n
    const { paymentId, n8nResponse } = await sendZellePaymentToN8n(
      user,
      imageFile,
      feeType,
      amount,
      options
    );
    
    // 2. Processar resposta
    const result = processN8nResponse(n8nResponse);
    const decision = determinePaymentStatus(n8nResponse);
    
    // 3. Gerar URL da imagem
    const imageUrl = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/public/zelle_comprovantes/zelle-payments/${user.id}/...`;
    
    // 4. Aguardar criação do registro (se criado pelo n8n)
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // 5. Atualizar banco de dados
    await updatePaymentWithN8nResult(
      paymentId,
      imageUrl,
      n8nResponse,
      result
    );
    
    // 6. Processar aprovação se necessário
    if (decision.shouldApprove) {
      await processAutomaticApproval(paymentId, feeType, options);
    }
    
    // 7. Notificar admin se necessário
    if (decision.shouldNotifyAdmin) {
      await notifyAdminForReview(paymentId, n8nResponse);
    }
    
    // 8. Retornar resultado
    return {
      success: true,
      paymentId,
      status: decision.status,
      message: decision.message,
      n8nResponse
    };
    
  } catch (error) {
    console.error('Erro no processamento:', error);
    throw error;
  }
}
```

---

## Exemplos de Código Completos

### Exemplo 1: Componente React Completo

```typescript
import React, { useState } from 'react';
import { supabase } from './lib/supabase';
import { useAuth } from './hooks/useAuth';

export const ZellePaymentForm: React.FC = () => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || !user) return;
    
    setLoading(true);
    try {
      const result = await processZellePaymentComplete(
        user,
        file,
        'selection_process',
        150.00
      );
      
      setResult(result);
    } catch (error) {
      console.error('Erro:', error);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <form onSubmit={handleSubmit}>
      <input
        type="file"
        accept="image/*"
        onChange={(e) => setFile(e.target.files?.[0] || null)}
      />
      <button type="submit" disabled={loading || !file}>
        {loading ? 'Processando...' : 'Enviar Pagamento'}
      </button>
      {result && (
        <div>
          <p>Status: {result.status}</p>
          <p>Mensagem: {result.message}</p>
        </div>
      )}
    </form>
  );
};
```

### Exemplo 2: Função Utilitária Reutilizável

```typescript
// utils/zelleN8nIntegration.ts

export class ZelleN8nIntegration {
  private n8nWebhookUrl = 'https://nwh.suaiden.com/webhook/zelle-global';
  private supabaseUrl: string;
  
  constructor(supabaseUrl: string) {
    this.supabaseUrl = supabaseUrl;
  }
  
  async validatePayment(
    userId: string,
    imageUrl: string,
    amount: number,
    feeType: string,
    options?: {
      paymentId?: string;
      scholarshipsIds?: string[];
      promotionalCoupon?: any;
    }
  ): Promise<{
    paymentId: string;
    response: any;
    isValid: boolean;
  }> {
    const paymentId = options?.paymentId || crypto.randomUUID();
    
    const payload = {
      user_id: userId,
      image_url: imageUrl,
      value: amount.toString(),
      currency: 'USD',
      fee_type: feeType,
      timestamp: new Date().toISOString(),
      payment_id: paymentId,
      ...(options?.scholarshipsIds && { scholarships_ids: options.scholarshipsIds }),
      ...(options?.promotionalCoupon && {
        promotional_coupon: options.promotionalCoupon.code,
        promotional_discount_amount: options.promotionalCoupon.discountAmount,
        original_amount: options.promotionalCoupon.originalAmount,
        final_amount: options.promotionalCoupon.finalAmount
      })
    };
    
    const response = await fetch(this.n8nWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    
    if (!response.ok) {
      throw new Error(`n8n validation failed: ${response.status}`);
    }
    
    const responseData = await response.json();
    const isValid = responseData.response?.toLowerCase() === 'the proof of payment is valid.';
    
    return {
      paymentId,
      response: responseData,
      isValid
    };
  }
}

// Uso:
const integration = new ZelleN8nIntegration(import.meta.env.VITE_SUPABASE_URL);
const result = await integration.validatePayment(
  user.id,
  imageUrl,
  150.00,
  'selection_process'
);
```

---

## Checklist de Replicação

### Pré-requisitos

- [ ] Supabase Storage configurado com bucket `zelle_comprovantes`
- [ ] Tabela `zelle_payments` criada no banco de dados
- [ ] n8n workflow configurado com webhook `zelle-global`
- [ ] Variáveis de ambiente configuradas:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `SUPABASE_SERVICE_ROLE_KEY` (para edge functions)

### Implementação Frontend

- [ ] Função de upload para Supabase Storage
- [ ] Geração de URL pública do comprovante
- [ ] Construção do payload conforme especificação
- [ ] Envio POST para `https://nwh.suaiden.com/webhook/zelle-global`
- [ ] Processamento da resposta do n8n
- [ ] Atualização do banco de dados com resultado

### Implementação Backend (Opcional)

- [ ] Edge function `validate-zelle-payment-result` (se usar callback)
- [ ] Edge function `approve-zelle-payment-automatic` (para processar aprovações)
- [ ] Lógica de atualização de `user_profiles` e `scholarship_applications`

### Testes

- [ ] Teste com comprovante válido
- [ ] Teste com comprovante inválido
- [ ] Teste com resposta ambígua do n8n
- [ ] Teste de erro de rede
- [ ] Teste de timeout

---

## Troubleshooting

### Erro: "n8n webhook failed: 404"

**Causa:** URL do webhook incorreta ou workflow não publicado no n8n

**Solução:**
1. Verificar URL: `https://nwh.suaiden.com/webhook/zelle-global`
2. Verificar se o workflow está ativo no n8n
3. Testar webhook manualmente com Postman/curl

### Erro: "Payment not found"

**Causa:** Pagamento ainda não foi criado no banco quando tentamos atualizar

**Solução:**
- Implementar retry logic com delay
- Aguardar 2-3 segundos após envio para n8n
- Verificar se o n8n está criando o registro automaticamente

### Erro: "Resposta inválida do n8n"

**Causa:** n8n retornou formato inesperado

**Solução:**
- Adicionar tratamento para diferentes formatos de resposta
- Logar resposta bruta para debug
- Implementar fallback para resposta em texto simples

### Timeout na Resposta

**Causa:** n8n demorando muito para processar

**Solução:**
- Implementar timeout na requisição (ex: 30 segundos)
- Processar resposta de forma assíncrona
- Usar callback do n8n ao invés de aguardar resposta síncrona

---

**Última Atualização:** Janeiro 2025  
**Versão:** 2.0 - Foco Técnico para Replicação  
**Autor:** Sistema MatriculaUSA

