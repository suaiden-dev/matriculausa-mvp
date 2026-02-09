# 📚 Documentação Completa - Integração Parcelow no 323 Network

**Data de Criação**: 26 de Janeiro de 2026  
**Última Atualização**: 26 de Janeiro de 2026  
**Status**: 🟢 **Produção - Funcionando Completamente**  
**Projeto**: 323 Network - Sistema de Programas Educacionais
**Conta Parcelow**: Mesma conta utilizada no projeto MIGMA

---

## 📋 Índice

1. [Visão Geral](#visão-geral)
2. [Arquitetura da Solução](#arquitetura-da-solução)
3. [Componentes Frontend](#componentes-frontend)
4. [Edge Functions (Backend)](#edge-functions-backend)
5. [Banco de Dados](#banco-de-dados)
6. [Fluxo Completo de Pagamento](#fluxo-completo-de-pagamento)
7. [Webhooks](#webhooks)
8. [Configuração e Variáveis de Ambiente](#configuração-e-variáveis-de-ambiente)
9. [Diferenças em Relação ao MIGMA](#diferenças-em-relação-ao-migma)
10. [Troubleshooting](#troubleshooting)

---

## 🎯 Visão Geral

### O que é a Parcelow?

A Parcelow é uma plataforma de pagamento que permite brasileiros pagarem valores em dólares (USD) parceladamente em reais (BRL), usando cartão de crédito, PIX ou TED. É especialmente útil para programas educacionais que têm preços em USD.

### Objetivo da Integração

Permitir que alunos brasileiros paguem por programas educacionais em até **21 parcelas**, com conversão automática de USD para BRL e processamento de pagamento completo via Parcelow.

### Características Principais

- ✅ **Pagamento Parcelado**: Até 21x no cartão de crédito
- ✅ **Conversão Automática**: USD → BRL com taxa de câmbio atual da Parcelow
- ✅ **Múltiplos Métodos**: Cartão, PIX, TED
- ✅ **Webhook Automático**: Notificações de status de pagamento
- ✅ **Processamento Completo**: Matrícula automática, notificações e contratos
- ✅ **Ambiente Sandbox**: Testes sem custo antes da produção
- ✅ **Mesma Conta**: Utiliza as mesmas credenciais do projeto MIGMA

---

## 🏗️ Arquitetura da Solução

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Vue 3)                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ProgramDetail.vue                                               │
│  └─> Modal de Checkout                                           │
│       └─> Botão "Parcelow" (21x)                                 │
│            └─> useParcelowCheckout.ts (Composable)               │
│                 └─> ParcelowService.ts                           │
│                      │                                            │
│                      ▼                                            │
└─────────────────────────────────────────────────────────────────┘
                  │
                  │ POST /create-parcelow-checkout
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                    SUPABASE EDGE FUNCTIONS                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  create-parcelow-checkout/index.ts                               │
│   ├─> Autentica com Parcelow (OAuth 2.0)                        │
│   ├─> Busca dados do usuário (CPF obrigatório)                  │
│   ├─> Cria service_payment no banco                             │
│   ├─> Cria order na API Parcelow                                │
│   └─> Retorna checkout_url                                      │
│                                                                   │
│  parcelow-webhook/index.ts                                       │
│   ├─> Recebe notificações da Parcelow                           │
│   ├─> Atualiza status do pagamento                              │
│   ├─> Cria/Atualiza matrícula (program_enrollments)             │
│   ├─> Incrementa contador de alunos                             │
│   ├─> Gera contrato PDF (via trigger do banco)                  │
│   └─> Envia notificação in-app                                  │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                  │                        ▲
                  │                        │
                  ▼                        │ Webhook POST
┌─────────────────────────────────────────────────────────────────┐
│                       PARCELOW API                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  Staging: https://sandbox-2.parcelow.com.br                     │
│  Production: https://app.parcelow.com                           │
│                                                                   │
│  Endpoints:                                                      │
│   • POST /oauth/token (Autenticação)                            │
│   • POST /api/orders (Criar pedido em USD)                      │
│   • GET /api/order/{id} (Consultar pedido)                      │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
                  │
                  │ Redireciona cliente
                  ▼
┌─────────────────────────────────────────────────────────────────┐
│                  PÁGINA DE CHECKOUT PARCELOW                     │
│                (Hosted pela Parcelow)                            │
│                                                                   │
│  Cliente:                                                        │
│   • Escolhe número de parcelas (1x até 21x)                     │
│   • Insere dados do cartão                                      │
│   • Confirma pagamento                                          │
│                                                                   │
│  Após conclusão:                                                 │
│   • Success → Redireciona para /pagamento/sucesso               │
│   • Failure → Redireciona para /pagamento/cancelado             │
│   • Webhook → POST para parcelow-webhook                        │
│                                                                   │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📦 Componentes Frontend

### 1. Estrutura de Arquivos

```
src/
├── views/
│   └── ProgramDetail.vue                    # Página de detalhes do programa
├── composables/
│   └── useParcelowCheckout.ts               # Composable para checkout
└── lib/
    └── parcelowService.ts                   # Cliente da API
```

### 2. ProgramDetail.vue

**Localização**: `src/views/ProgramDetail.vue`

#### Principais Funcionalidades:

1. **Exibição do Botão Parcelow**
   - Visível no modal de checkout
   - Badge "21x" para destacar parcelamento
   - Validação de CPF antes de permitir pagamento

2. **Validação de CPF**
   ```vue
   const isMissingCpf = computed(() => {
     return paymentMethod.value === 'parcelow' && !userStore.profile?.document_number
   })
   ```

3. **Alerta de CPF Faltante**
   ```vue
   <div v-if="isMissingCpf" class="p-4 rounded-xl bg-amber-500/10">
     <p>{{ t('payment.parcelow.cpfValidation.description') }}</p>
     <button @click="router.push('/perfil')">
       {{ t('payment.parcelow.cpfValidation.button') }}
     </button>
   </div>
   ```

4. **Botão de Pagamento Parcelow**
   ```vue
   <button
     v-if="showParcelow"
     @click="paymentMethod = 'parcelow'"
     class="flex flex-col items-center gap-3 p-5 rounded-2xl border-2"
   >
     <div class="absolute -top-1 -right-1">
       <span class="text-[8px] font-bold bg-primary text-black px-1.5 py-0.5">21x</span>
     </div>
     <span class="material-icons text-3xl">payments</span>
     <span class="text-sm font-black uppercase">Parcelow</span>
   </button>
   ```

5. **Controle de Visibilidade**
   ```typescript
   const showParcelow = computed(() => true)
   // Sempre visível (removida limitação de localhost)
   ```

6. **Integração com Checkout**
   ```typescript
   const { 
     createCheckout: startParcelowCheckout,
     isCreatingCheckout: parcelowLoading,
     error: parcelowError
   } = useParcelowCheckout()

   async function handleCheckout() {
     if (paymentMethod.value === 'parcelow') {
       if (isMissingCpf.value) {
         toast.error(t('payment.parcelow.cpfValidation.title'))
         return
       }
       
       submitting.value = true
       try {
         // Criar payment no banco primeiro
         const { data: payment } = await supabase
           .from('service_payments')
           .insert({
             user_id: userStore.user.id,
             program_id: program.value.id,
             amount: calculateTotal(...),
             currency: 'USD',
             status: 'pending',
             payment_method: 'parcelow'
           })
           .select()
           .single()

         // Criar checkout na Parcelow
         const result = await startParcelowCheckout(payment.id)
         
         // Redirecionar para Parcelow
         window.location.href = result.checkout_url
       } catch (error) {
         toast.error('Erro ao processar pagamento')
       } finally {
         submitting.value = false
       }
     }
   }
   ```

### 3. useParcelowCheckout.ts (Composable)

**Localização**: `src/composables/useParcelowCheckout.ts`

```typescript
import { ref } from 'vue'
import ParcelowService from '@/lib/parcelowService'

export function useParcelowCheckout() {
  const isCreatingCheckout = ref(false)
  const error = ref<string | null>(null)
  const checkoutData = ref<any>(null)

  async function createCheckout(paymentId: string) {
    isCreatingCheckout.value = true
    error.value = null

    try {
      const response = await ParcelowService.createCheckout(paymentId)
      
      if (!response.success) {
        throw new Error(response.error || 'Erro ao criar checkout')
      }

      checkoutData.value = response
      return response
    } catch (err: any) {
      error.value = err.message
      throw err
    } finally {
      isCreatingCheckout.value = false
    }
  }

  return {
    isCreatingCheckout,
    error,
    checkoutData,
    createCheckout
  }
}
```

### 4. ParcelowService.ts

**Localização**: `src/lib/parcelowService.ts`

```typescript
import { supabase } from '@/lib/supabase'

class ParcelowService {
  async createCheckout(paymentId: string) {
    const { data, error } = await supabase.functions.invoke(
      'create-parcelow-checkout',
      {
        body: {
          payment_id: paymentId,
          currency: 'USD'
        }
      }
    )

    if (error) throw error
    return data
  }

  formatAmount(cents: number): string {
    return (cents / 100).toFixed(2)
  }
}

export default new ParcelowService()
```

---

## 🔧 Edge Functions (Backend)

### 1. create-parcelow-checkout

**Localização**: `supabase/functions/create-parcelow-checkout/index.ts`

**Endpoint**: `https://[PROJECT].supabase.co/functions/v1/create-parcelow-checkout`

**Método**: POST

**JWT Verification**: ❌ DISABLED (necessário para autenticação manual)

#### Request Body

```json
{
  "payment_id": "uuid-do-payment",
  "currency": "USD"
}
```

#### Response (Sucesso)

```json
{
  "success": true,
  "order_id": 5060,
  "checkout_url": "https://sandbox.splipay.com/payment/xyz/abc",
  "status": "Open",
  "total_usd": 100000,
  "order_amount": 100000
}
```

#### Fluxo Interno Detalhado

```typescript
Deno.serve(async (req) => {
  // 1. Detectar ambiente (staging vs production)
  const referer = req.headers.get('referer')
  const origin = req.headers.get('origin') || ''
  
  let siteUrl = ''
  if (referer) {
    siteUrl = new URL(referer).origin
  } else {
    siteUrl = origin || 'https://323network.com'
  }

  const isLocalhost = siteUrl.includes('localhost') || siteUrl.includes('127.0.0.1')
  const isStaging = siteUrl.includes('vercel.app')
  
  if (!isLocalhost && !isStaging) {
    siteUrl = 'https://323network.com'
  }

  const environment: 'staging' | 'production' = 
    (isLocalhost || isStaging) ? 'staging' : 'production'

  // 2. Validar autenticação manual
  const authHeader = req.headers.get('Authorization')
  const token = authHeader.replace('Bearer ', '')
  const { data: { user }, error: authError } = 
    await supabaseAdmin.auth.getUser(token)

  if (authError || !user) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401
    })
  }

  // 3. Buscar payment
  const { data: payment } = await supabaseAdmin
    .from('service_payments')
    .select('*')
    .eq('id', payment_id)
    .single()

  // 4. Verificar segurança (payment pertence ao usuário?)
  if (payment.user_id !== user.id) {
    return new Response(JSON.stringify({ error: 'Access denied' }), {
      status: 403
    })
  }

  // 5. Buscar perfil do usuário (CPF)
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('nome, document_number, email')
    .eq('id', payment.user_id)
    .single()

  // 6. Validar CPF
  const cpf = profile.document_number
  if (!cpf || cpf.length < 11) {
    throw new Error('CPF is required for Parcelow payment')
  }

  const cleanCpf = cpf.replace(/\D/g, '')
  if (cleanCpf.length !== 11) {
    throw new Error('Invalid CPF format')
  }

  // 7. Criar cliente Parcelow
  const parcelowClient = new ParcelowClient(
    environment,
    clientId,
    clientSecret
  )

  // 8. Criar order na Parcelow
  const orderData = await parcelowClient.createOrder({
    amount_usd: payment.amount, // em centavos
    client_name: profile.nome || 'Cliente',
    client_email: profile.email || user.email,
    client_cpf: cleanCpf,
    reference: payment.id,
    redirectUrls: {
      success: `${siteUrl}/pagamento/sucesso?payment_id=${payment.id}&type=${payment.program_id ? 'program' : 'service'}`,
      failed: `${siteUrl}/pagamento/cancelado?payment_id=${payment.id}&type=${payment.program_id ? 'program' : 'service'}`
    }
  })

  // 9. Salvar dados no banco
  await supabaseAdmin
    .from('service_payments')
    .update({
      parcelow_order_id: String(orderData.data.order_id),
      parcelow_checkout_url: orderData.data.url_checkout,
      parcelow_status: 'Open',
      parcelow_status_code: 0,
      metadata: {
        ...payment.metadata,
        parcelow_environment: environment,
        parcelow_created_at: new Date().toISOString()
      }
    })
    .eq('id', payment_id)

  // 10. Retornar dados do checkout
  return new Response(JSON.stringify({
    success: true,
    checkout_url: orderData.data.url_checkout,
    order_id: orderData.data.order_id,
    status: 'Open',
    total_usd: payment.amount,
    order_amount: payment.amount
  }), {
    status: 200
  })
})
```

#### Classe ParcelowClient

```typescript
class ParcelowClient {
  private baseUrl: string
  private clientId: string
  private clientSecret: string

  constructor(environment: 'staging' | 'production', clientId: string, clientSecret: string) {
    this.baseUrl = environment === 'production'
      ? 'https://app.parcelow.com'
      : 'https://sandbox-2.parcelow.com.br'
    this.clientId = clientId
    this.clientSecret = clientSecret
  }

  private async getAccessToken(): Promise<string> {
    // Converter client_id para número se necessário
    let clientIdToUse: any = this.clientId
    if (typeof this.clientId === 'string' && !isNaN(parseInt(this.clientId))) {
      clientIdToUse = parseInt(this.clientId)
    }

    const response = await fetch(`${this.baseUrl}/oauth/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        client_id: clientIdToUse,
        client_secret: this.clientSecret,
        grant_type: 'client_credentials'
      })
    })

    const data = await response.json()
    return data.access_token
  }

  async createOrder(params: {
    amount_usd: number
    client_name: string
    client_email: string
    client_cpf: string
    reference: string
    redirectUrls: { success: string; failed: string }
  }) {
    const accessToken = await this.getAccessToken()

    // Tentar criar com email original
    try {
      return await this.attemptCreateOrder(accessToken, params)
    } catch (error: any) {
      // Se erro de email duplicado, adicionar timestamp
      if (error.message.includes('Email do cliente existente')) {
        const aliasedEmail = params.client_email.replace('@', `+${Date.now()}@`)
        return await this.attemptCreateOrder(accessToken, { 
          ...params, 
          client_email: aliasedEmail 
        })
      }
      throw error
    }
  }

  private async attemptCreateOrder(accessToken: string, params: any) {
    const notifyUrl = `${Deno.env.get('SUPABASE_URL')}/functions/v1/parcelow-webhook`
    
    const response = await fetch(`${this.baseUrl}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `Bearer ${accessToken}`
      },
      body: JSON.stringify({
        reference: params.reference,
        items: [{
          reference: params.reference,
          description: 'Service Payment',
          quantity: 1,
          amount: params.amount_usd
        }],
        client: {
          name: params.client_name,
          email: params.client_email,
          cpf: params.client_cpf
        },
        redirect: params.redirectUrls,
        notify_url: notifyUrl,
        webhook_url: notifyUrl
      })
    })

    return await response.json()
  }
}
```

### 2. parcelow-webhook

**Localização**: `supabase/functions/parcelow-webhook/index.ts`

**Endpoint**: `https://[PROJECT].supabase.co/functions/v1/parcelow-webhook`

**Método**: POST

**JWT Verification**: ❌ DISABLED (necessário para webhooks externos)

#### Payload do Webhook

```json
{
  "event": "event_order_paid",
  "timestamp": "2026-01-26T10:30:00Z",
  "order": {
    "id": 5060,
    "reference": "payment-uuid",
    "status": 1,
    "status_text": "Paid",
    "status_public": "Aprovado",
    "order_amount": 100000,
    "total_usd": 100000,
    "total_brl": 542080,
    "installments": 3,
    "order_date": "2026-01-26T10:25:00Z",
    "payments": [{
      "total_brl": "5420.80",
      "installments": 3,
      "status": 1,
      "payment_method": "credit_card"
    }],
    "client": {
      "name": "João Silva",
      "email": "joao@example.com",
      "cpf": "999.999.999-99",
      "phone": "+5511999999999"
    },
    "items": [{
      "reference": "payment-uuid",
      "description": "Service Payment",
      "quantity": 1,
      "amount": 100000
    }]
  }
}
```

#### Eventos Suportados

| Evento | Descrição | Ação no Sistema |
|--------|-----------|-----------------|
| `event_order_paid` | ✅ Pagamento confirmado | Processa matrícula completa |
| `event_order_confirmed` | ℹ️ Order confirmada | Atualiza metadata |
| `event_order_declined` | ❌ Pagamento recusado | Status: `failed` |
| `event_order_canceled` | ❌ Order cancelada | Status: `failed` |
| `event_order_expired` | ⏰ Order expirada | Status: `failed` |
| `event_order_waiting` | ⏸️ Aguardando | Status: `pending` |
| `event_order_waiting_payment` | ⏸️ Aguardando pagamento | Status: `pending` |
| `event_order_waiting_docs` | ⏸️ Aguardando docs | Status: `pending` |

#### Fluxo de Processamento Completo

```typescript
async function processWebhookEvent(event: ParcelowWebhookEvent, supabase: any) {
  const parcelowOrder = event.order

  // 1. Validar payload
  if (!parcelowOrder || !parcelowOrder.id) {
    throw new Error('Invalid webhook payload: missing order.id')
  }

  // 2. Buscar payment por parcelow_order_id
  const { data: payment } = await supabase
    .from('service_payments')
    .select('*')
    .eq('parcelow_order_id', String(parcelowOrder.id))
    .single()

  if (!payment) {
    throw new Error(`Order not found for Parcelow order ${parcelowOrder.id}`)
  }

  // 3. Mapear evento para status
  let newStatus = payment.status

  switch (event.event) {
    case 'event_order_paid':
      newStatus = 'completed'
      break
    case 'event_order_declined':
    case 'event_order_canceled':
    case 'event_order_expired':
      newStatus = 'failed'
      break
    case 'event_order_waiting':
    case 'event_order_waiting_payment':
    case 'event_order_waiting_docs':
      newStatus = 'pending'
      break
    case 'event_order_confirmed':
      // Manter status atual, apenas atualizar metadata
      break
  }

  // 4. Atualizar payment
  const updateData: any = {
    status: newStatus,
    parcelow_status: parcelowOrder.status_text,
    parcelow_status_code: parcelowOrder.status,
    metadata: {
      ...payment.metadata,
      parcelow_order_id: parcelowOrder.id,
      parcelow_event: event.event,
      parcelow_updated_at: new Date().toISOString()
    },
    updated_at: new Date().toISOString()
  }

  // 5. Se pagamento completado, adicionar detalhes
  if (newStatus === 'completed' && parcelowOrder.payments?.length > 0) {
    const totalBrlCents = Math.round(
      parseFloat(parcelowOrder.payments[0].total_brl) * 100
    )

    updateData.metadata = {
      ...updateData.metadata,
      installments: parcelowOrder.payments[0].installments,
      total_usd: parcelowOrder.total_usd,
      total_brl: totalBrlCents,
      completed_at: new Date().toISOString()
    }
  }

  await supabase
    .from('service_payments')
    .update(updateData)
    .eq('id', payment.id)

  // 6. Se houver service_request_id, atualizar
  if (payment.service_request_id) {
    if (newStatus === 'completed') {
      await supabase
        .from('service_requests')
        .update({ payment_required: false })
        .eq('id', payment.service_request_id)
    }
  }

  // 7. Se houver program_id, processar matrícula
  if (payment.program_id && newStatus === 'completed') {
    // 7.1. Criar/Atualizar matrícula
    const { data: enrollment } = await supabase
      .from('program_enrollments')
      .upsert({
        program_id: payment.program_id,
        user_id: payment.user_id,
        status: 'active',
        payment_status: 'paid',
        payment_amount: payment.amount,
        payment_currency: payment.currency,
        payment_method: 'parcelow',
        payment_id: payment.id,
        paid_at: new Date().toISOString(),
        enrolled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'program_id,user_id'
      })
      .select()
      .single()

    // 7.2. Incrementar contador de alunos
    await supabase.rpc('increment_program_students', { 
      program_id: payment.program_id 
    })

    // 7.3. Notificação in-app
    await supabase.from('notifications').insert({
      user_id: payment.user_id,
      type: 'program_enrolled',
      title: 'Enrollment confirmed!',
      content: 'Your access to the program via Parcelow has been granted. Enjoy your studies!',
      metadata: {
        program_id: payment.program_id,
        enrollment_id: enrollment.id,
        payment_id: payment.id
      }
    })

    // 7.4. Contrato PDF é gerado automaticamente pelo trigger do banco
    // 'trigger_enrollment_contract_pdf' na tabela 'program_enrollments'
  }

  // 8. Registrar em admin_logs
  await supabase
    .from('admin_logs')
    .insert({
      action: 'parcelow_webhook_processed',
      user_id: payment.user_id,
      metadata: {
        event: event.event,
        parcelow_order_id: parcelowOrder.id,
        payment_id: payment.id,
        status: newStatus
      }
    })

  return { success: true, payment_id: payment.id, status: newStatus }
}
```

---

## 💾 Banco de Dados

### Tabela: service_payments

**Campos Relacionados ao Parcelow:**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `id` | UUID | ID único do pagamento |
| `user_id` | UUID | ID do usuário |
| `program_id` | UUID | ID do programa (se for matrícula) |
| `service_request_id` | UUID | ID do service request (se for serviço) |
| `amount` | INTEGER | Valor em centavos (USD) |
| `currency` | TEXT | Moeda (USD, BRL) |
| `status` | TEXT | Status (pending, completed, failed) |
| `payment_method` | TEXT | Método (parcelow, stripe, pix, etc) |
| `parcelow_order_id` | TEXT | ✨ ID da order na Parcelow |
| `parcelow_checkout_url` | TEXT | ✨ URL do checkout |
| `parcelow_status` | TEXT | ✨ Status textual (Open, Paid, Declined) |
| `parcelow_status_code` | INTEGER | ✨ Código do status (0=Open, 1=Paid) |
| `metadata` | JSONB | Metadados do pagamento |

### Metadata (JSONB)

```json
{
  "parcelow_environment": "production",
  "parcelow_created_at": "2026-01-26T10:25:00Z",
  "parcelow_order_id": 5060,
  "parcelow_event": "event_order_paid",
  "parcelow_updated_at": "2026-01-26T10:30:00Z",
  "installments": 3,
  "total_usd": 100000,
  "total_brl": 542080,
  "completed_at": "2026-01-26T10:30:00Z"
}
```

### Tabela: program_enrollments

Quando um pagamento Parcelow é completado para um programa, uma matrícula é criada/atualizada:

```sql
INSERT INTO program_enrollments (
  program_id,
  user_id,
  status,
  payment_status,
  payment_amount,
  payment_currency,
  payment_method,
  payment_id,
  paid_at,
  enrolled_at
) VALUES (
  'program-uuid',
  'user-uuid',
  'active',
  'paid',
  100000,
  'USD',
  'parcelow',
  'payment-uuid',
  NOW(),
  NOW()
)
ON CONFLICT (program_id, user_id) DO UPDATE SET
  status = 'active',
  payment_status = 'paid',
  paid_at = NOW(),
  updated_at = NOW();
```

### Trigger Automático

O banco possui um trigger que gera automaticamente o PDF do contrato de matrícula:

```sql
-- Trigger: trigger_enrollment_contract_pdf
-- Tabela: program_enrollments
-- Evento: INSERT ou UPDATE quando status = 'active'
-- Ação: Chama Edge Function 'generate-enrollment-contract-pdf'
```

---

## 🔄 Fluxo Completo de Pagamento

### Diagrama de Sequência

```
Aluno          Frontend        Edge Function       Parcelow API       Webhook
  │                │                  │                    │               │
  │  Clica Pagar   │                  │                    │               │
  │───────────────>│                  │                    │               │
  │                │ Cria payment     │                    │               │
  │                │ no banco         │                    │               │
  │                │                  │                    │               │
  │                │ POST checkout    │                    │               │
  │                │─────────────────>│                    │               │
  │                │                  │ POST /oauth/token  │               │
  │                │                  │───────────────────>│               │
  │                │                  │<───────────────────│               │
  │                │                  │  access_token      │               │
  │                │                  │                    │               │
  │                │                  │ POST /api/orders   │               │
  │                │                  │───────────────────>│               │
  │                │                  │<───────────────────│               │
  │                │<─────────────────│  order_id, url     │               │
  │                │ checkout_url     │                    │               │
  │                │                  │                    │               │
  │                │ window.location  │                    │               │
  │─────────────────────────────────────────────────────────>│             │
  │                Parcelow Checkout Page                   │             │
  │                                                          │             │
  │  Escolhe parcelas (1x-21x)                              │             │
  │  Preenche dados do cartão                               │             │
  │  Confirma pagamento                                      │             │
  │─────────────────────────────────────────────────────────>│             │
  │                                                          │ POST webhook│
  │                                                          │────────────>│
  │                                                          │             │
  │                                                          │  Processa   │
  │                                                          │  └─ Update  │
  │                                                          │  └─ Matrícula
  │                                                          │  └─ Notif   │
  │                                                          │  └─ PDF     │
  │                                                          │             │
  │<─────────────────────────────────────────────────────────│             │
  │              Redirect /pagamento/sucesso                 │             │
  │                                                                        │
```

### Etapas Detalhadas

#### **Fase 1: Criação do Checkout (Frontend)**

1. Aluno acessa página do programa
2. Clica em "Matricular" ou "Pagar"
3. Seleciona método "Parcelow"
4. Sistema valida se CPF está cadastrado
5. Se CPF faltando → Exibe alerta para completar perfil
6. Se CPF OK → Cria registro em `service_payments`
7. Chama `createCheckout(payment_id)`

#### **Fase 2: Processamento no Backend**

8. Edge Function recebe `payment_id`
9. Valida autenticação do usuário
10. Busca payment no banco
11. Verifica se payment pertence ao usuário (segurança)
12. Busca perfil do usuário (nome, email, CPF)
13. Valida CPF (11 dígitos)
14. Detecta ambiente (staging/production)
15. Autentica com Parcelow (OAuth 2.0)
16. Cria order na API Parcelow
17. Salva `parcelow_order_id` e `parcelow_checkout_url` no banco
18. Retorna `checkout_url` para o frontend

#### **Fase 3: Checkout na Parcelow**

19. Frontend redireciona para `checkout_url`
20. Aluno vê página da Parcelow
21. Aluno escolhe número de parcelas (1x até 21x)
22. Aluno insere dados do cartão
23. Parcelow processa pagamento
24. Se aprovado → Status: Paid
25. Se recusado → Status: Declined

#### **Fase 4: Webhook e Pós-Processamento**

26. Parcelow envia webhook `event_order_paid`
27. Webhook busca payment por `parcelow_order_id`
28. Webhook atualiza `status` → `completed`
29. Webhook atualiza metadata com detalhes do pagamento
30. Se `service_request_id` existe → Atualiza service_request
31. Se `program_id` existe:
    - Cria/atualiza matrícula em `program_enrollments`
    - Incrementa contador de alunos do programa
    - Cria notificação in-app
    - Trigger do banco gera PDF do contrato
32. Registra em `admin_logs` para auditoria
33. Aluno é redirecionado para `/pagamento/sucesso`

---

## ⚙️ Configuração e Variáveis de Ambiente

### Variáveis Obrigatórias

Configure no **Supabase Dashboard > Project Settings > Edge Functions > Secrets**

| Variável | Descrição | Exemplo |
|----------|-----------|---------|
| `PARCELOW_CLIENT_ID_STAGING` | Client ID para staging | `212` |
| `PARCELOW_CLIENT_SECRET_STAGING` | Client Secret para staging | `1aOr1e3M...` |
| `PARCELOW_CLIENT_ID_PRODUCTION` | Client ID para produção | `XXX` |
| `PARCELOW_CLIENT_SECRET_PRODUCTION` | Client Secret para produção | `YYY...` |

### Credenciais de Sandbox (Staging)

**Mesmas credenciais do projeto MIGMA:**

**API**:
- **Endpoint**: `https://sandbox-2.parcelow.com.br`
- **Client ID**: `212`
- **Client Secret**: `1aOr1e3MjDVACC7rvyfsfx1XAMDhKBJXiP8gpi5d`

**Painel Web**:
- **URL**: https://sandbox.parcelow.com/login
- **Email**: `victuribdev@gmail.com`
- **Senha**: `uynj4YH64zPR`

### Webhook URL

```
https://ekxftwrjvxtpnqbraszv.supabase.co/functions/v1/parcelow-webhook
```

**Importante**: Esta URL deve ser configurada no painel da Parcelow para receber notificações de pagamento.

### Deploy das Edge Functions

```bash
# Deploy create-parcelow-checkout (com JWT desabilitado)
supabase functions deploy create-parcelow-checkout --no-verify-jwt

# Deploy parcelow-webhook (com JWT desabilitado)
supabase functions deploy parcelow-webhook --no-verify-jwt
```

**Nota**: JWT verification é desabilitado porque:
- `create-parcelow-checkout`: Faz autenticação manual via `getUser(token)`
- `parcelow-webhook`: Recebe webhooks externos da Parcelow (sem JWT)

---

## 🔍 Diferenças em Relação ao MIGMA

### Semelhanças

✅ **Mesma conta Parcelow** (staging e production)  
✅ **Mesma lógica de autenticação OAuth**  
✅ **Mesmo tratamento de email duplicado**  
✅ **Mesma estrutura de webhook**  
✅ **Mesmo número máximo de parcelas (21x)**

### Diferenças Principais

| Aspecto | MIGMA | 323 Network |
|---------|-------|-------------|
| **Contexto** | Venda de vistos | Matrícula em programas |
| **Tabela Principal** | `visa_orders` | `service_payments` |
| **Entidade Criada** | Order de visto | Matrícula (`program_enrollments`) |
| **CPF Origem** | `clients.document_number` | `profiles.document_number` |
| **Pós-Processamento** | PDFs de contrato + ANNEX I + Webhooks n8n | Matrícula + Notificação + PDF de contrato |
| **Redirect URLs** | `/checkout/success` e `/checkout/cancel` | `/pagamento/sucesso` e `/pagamento/cancelado` |
| **Tracking** | `seller_funnel_events` | `admin_logs` |
| **Emails** | Cliente + Seller + Admin | Notificação in-app |
| **Webhooks Externos** | n8n (cliente + dependentes) | Não aplicável |

### Adaptações Necessárias para Replicar

Se você for implementar em outro sistema similar ao 323 Network:

1. **Estrutura de Dados**
   - Certifique-se de ter tabela `service_payments` com campos Parcelow
   - Certifique-se de ter tabela `profiles` com `document_number` (CPF)
   - Se for matrícula, tenha tabela `program_enrollments`

2. **Edge Functions**
   - Copie `create-parcelow-checkout/index.ts` e `parcelow-webhook/index.ts`
   - Ajuste referências de tabelas conforme seu schema
   - Ajuste URLs de redirect conforme suas rotas

3. **Frontend**
   - Copie lógica de `ProgramDetail.vue` (modal de checkout)
   - Copie `useParcelowCheckout.ts` (composable)
   - Copie `parcelowService.ts` (cliente da API)
   - Ajuste traduções conforme seu i18n

4. **Variáveis de Ambiente**
   - Use as mesmas credenciais (mesma conta)
   - Configure webhook URL do novo projeto

5. **Testes**
   - Teste em staging primeiro
   - Use cartão de teste: `5214254988499590`
   - Valide fluxo completo (checkout → webhook → matrícula)

---

## 🔧 Troubleshooting

### Erro: "CPF is required for Parcelow payment"

**Causa**: CPF não encontrado no perfil do usuário

**Solução**:
1. Verificar se `profiles.document_number` está preenchido
2. Verificar se CPF tem 11 dígitos
3. Garantir que usuário completou perfil

### Erro: "Email do cliente existente"

**Causa**: Parcelow já tem um cliente cadastrado com esse email

**Solução**: Automática - sistema adiciona timestamp ao email
```typescript
const aliasedEmail = `user+${Date.now()}@domain.com`
```

### Erro: "Order not found for Parcelow order"

**Causa**: Webhook recebido antes de salvar `parcelow_order_id`

**Solução**: 
- Verificar se Edge Function salvou dados no banco
- Parcelow fará retry automático (até 5 tentativas)

### Webhook Não Recebido

**Verificações**:

1. Edge Function está deployada?
   ```bash
   supabase functions list
   ```

2. JWT verification está desabilitado?
   ```bash
   supabase functions deploy parcelow-webhook --no-verify-jwt
   ```

3. URL está cadastrada na Parcelow?
   - Acessar painel: https://sandbox.parcelow.com
   - Verificar configurações de webhook

### Pagamento Aprovado mas Status Pending

**Causa**: Webhook `event_order_paid` não processado

**Debug**:
```sql
-- Verificar logs do webhook
SELECT * FROM edge_logs 
WHERE function_name = 'parcelow-webhook'
ORDER BY timestamp DESC 
LIMIT 10;
```

### Matrícula Não Criada

**Causa**: `program_id` não está no payment ou webhook falhou

**Debug**:
```sql
-- Verificar payment
SELECT 
  id,
  program_id,
  status,
  parcelow_status,
  metadata
FROM service_payments
WHERE parcelow_order_id = 'ORDER_ID';

-- Verificar matrícula
SELECT * FROM program_enrollments
WHERE payment_id = 'PAYMENT_ID';
```

### Contrato PDF Não Gerado

**Causa**: Trigger do banco não executou ou falhou

**Verificação**:
```sql
-- Verificar se trigger existe
SELECT * FROM pg_trigger 
WHERE tgname = 'trigger_enrollment_contract_pdf';

-- Verificar logs da Edge Function
SELECT * FROM edge_logs 
WHERE function_name = 'generate-enrollment-contract-pdf'
ORDER BY timestamp DESC 
LIMIT 10;
```

---

## 📝 Checklist de Implementação

Para implementar Parcelow em um novo sistema:

### Backend (Edge Functions)

- [ ] Criar `create-parcelow-checkout/index.ts`
- [ ] Criar `parcelow-webhook/index.ts`
- [ ] Configurar variáveis de ambiente (staging + production)
- [ ] Deploy das functions com `--no-verify-jwt`
- [ ] Testar autenticação OAuth com Parcelow
- [ ] Testar criação de order
- [ ] Testar recebimento de webhook

### Banco de Dados

- [ ] Adicionar campos Parcelow à tabela de payments
- [ ] Criar índice em `parcelow_order_id`
- [ ] Configurar trigger para geração de PDF (se aplicável)
- [ ] Testar upsert de matrícula/enrollment

### Frontend

- [ ] Criar composable `useParcelowCheckout.ts`
- [ ] Criar service `parcelowService.ts`
- [ ] Adicionar botão Parcelow no modal de checkout
- [ ] Adicionar validação de CPF
- [ ] Adicionar alerta de CPF faltante
- [ ] Adicionar traduções i18n
- [ ] Testar fluxo completo de checkout

### Configuração

- [ ] Cadastrar webhook URL no painel Parcelow
- [ ] Configurar URLs de redirect (success/failed)
- [ ] Testar em staging primeiro
- [ ] Validar em produção

### Testes

- [ ] Teste com cartão de teste em staging
- [ ] Teste de pagamento aprovado
- [ ] Teste de pagamento recusado
- [ ] Teste de webhook
- [ ] Teste de criação de matrícula
- [ ] Teste de geração de PDF
- [ ] Teste de notificações

---

## 📞 Suporte

Para dúvidas sobre a integração Parcelow:

- **Painel Sandbox**: https://sandbox.parcelow.com
- **Email**: victuribdev@gmail.com
- **Documentação Parcelow**: Solicitar ao suporte

---

## 📅 Histórico de Versões

| Versão | Data | Alterações |
|--------|------|------------|
| 1.0.0 | 26/01/2026 | Documentação inicial completa |

---

**Desenvolvido por**: Equipe 323 Network  
**Última Revisão**: 26 de Janeiro de 2026
