# Documentação: Construção de Taxas no Stripe (Card e PIX)

## 📋 Índice
1. [Visão Geral](#visão-geral)
2. [Arquitetura do Sistema](#arquitetura-do-sistema)
3. [Taxas do Stripe](#taxas-do-stripe)
4. [Cálculo de Taxas para Cartão (USD)](#cálculo-de-taxas-para-cartão-usd)
5. [Cálculo de Taxas para PIX (BRL)](#cálculo-de-taxas-para-pix-brl)
6. [Taxa de Câmbio](#taxa-de-câmbio)
7. [Fluxo Completo de Processamento](#fluxo-completo-de-processamento)
8. [Exemplos Práticos](#exemplos-práticos)
9. [Metadata e Rastreamento](#metadata-e-rastreamento)
10. [Arquivos e Funções Principais](#arquivos-e-funções-principais)

---

## Visão Geral

O sistema MatriculaUSA implementa um sistema de **markup de taxas** que garante que o valor líquido desejado seja sempre recebido, mesmo após as taxas do Stripe. O cálculo é feito de forma diferente para pagamentos com **cartão (USD)** e **PIX (BRL)**.

### Conceitos Importantes

- **Valor Base (Base Amount)**: Valor líquido que desejamos receber (sem taxas)
- **Valor Bruto (Gross Amount)**: Valor total cobrado do aluno (incluindo markup de taxas)
- **Taxa do Stripe (Fee Amount)**: Diferença entre valor bruto e valor base
- **Markup**: Margem adicional aplicada para cobrir as taxas do Stripe

---

## Arquitetura do Sistema

```
┌─────────────────┐
│   Frontend      │
│  (React/TS)     │
│                 │
│  - Calcula      │
│    exchangeRate │
│  - Envia amount │
│    + metadata   │
└────────┬────────┘
         │
         │ HTTP POST
         │
         ▼
┌─────────────────┐
│  Edge Function   │
│  (Supabase)     │
│                 │
│  - Recebe amount│
│  - Obtém/usa    │
│    exchangeRate │
│  - Calcula       │
│    grossAmount   │
│  - Cria sessão   │
│    Stripe        │
└────────┬────────┘
         │
         │ API Call
         │
         ▼
┌─────────────────┐
│     Stripe      │
│                 │
│  - Processa     │
│    pagamento    │
│  - Deduz taxas  │
│  - Transfere    │
│    valor líquido│
└─────────────────┘
```

---

## Taxas do Stripe

### Cartão (USD)
- **Taxa Percentual**: 3.9% (taxa conservadora para cartões internacionais)
  - Base: 2.9% (cartões domésticos EUA)
  - Adicional: 1.0% (cartões internacionais)
- **Taxa Fixa**: $0.30 por transação
- **Total**: `(Valor × 3.9%) + $0.30`

### PIX (BRL)
- **Taxa de Processamento**: 1.19%
- **Taxa de Conversão de Moedas**: ~0.6%
- **Total Aproximado**: ~1.8%
- **IOF**: 3.5% (adicionado automaticamente pelo Stripe ao aluno, **não incluído no cálculo**)

---

## Cálculo de Taxas para Cartão (USD)

### Fórmula

```typescript
// Constantes
const STRIPE_PERCENTAGE = 0.039;  // 3.9%
const STRIPE_FIXED_FEE = 0.30;     // $0.30

// Cálculo
grossAmount = (netAmount + STRIPE_FIXED_FEE) / (1 - STRIPE_PERCENTAGE)
```

### Explicação

1. **Entrada**: Valor líquido desejado (ex: $1,000.00)
2. **Cálculo**: 
   - Adiciona taxa fixa: $1,000.00 + $0.30 = $1,000.30
   - Divide por (1 - 0.039) = 0.961
   - Resultado: $1,000.30 / 0.961 = $1,040.27
3. **Saída**: Valor bruto em centavos (104,027 centavos = $1,040.27)

### Código

**Arquivo**: `project/supabase/functions/utils/stripe-fee-calculator.ts`

```typescript
export function calculateCardAmountWithFees(netAmount: number): number {
  const STRIPE_PERCENTAGE = 0.039; // 3.9%
  const STRIPE_FIXED_FEE = 0.30;   // $0.30
  
  // Fórmula: (Valor líquido + Taxa fixa) / (1 - Taxa percentual)
  const grossAmount = (netAmount + STRIPE_FIXED_FEE) / (1 - STRIPE_PERCENTAGE);
  
  // Arredondar para 2 casas decimais e converter para centavos
  const grossAmountRounded = Math.round(grossAmount * 100) / 100;
  const grossAmountInCents = Math.round(grossAmountRounded * 100);
  
  return grossAmountInCents;
}
```

### Exemplo Prático

```
Valor líquido desejado: $1,000.00
Cálculo:
  = ($1,000.00 + $0.30) / (1 - 0.039)
  = $1,000.30 / 0.961
  = $1,040.27

Valor bruto cobrado: $1,040.27
Taxa do Stripe: $40.27
Valor líquido recebido: $1,000.00 ✅
```

---

## Cálculo de Taxas para PIX (BRL)

### Fórmula

```typescript
// Constantes
const STRIPE_PIX_PROCESSING_PERCENTAGE = 0.0119;      // 1.19%
const STRIPE_CURRENCY_CONVERSION_PERCENTAGE = 0.006;  // 0.6%
const STRIPE_PIX_TOTAL_PERCENTAGE = 0.0179;           // ~1.8%

// Passo 1: Converter USD para BRL
netAmountBRL = netAmountUSD × exchangeRate

// Passo 2: Calcular valor bruto em BRL
grossAmountBRL = netAmountBRL / (1 - STRIPE_PIX_TOTAL_PERCENTAGE)
```

### Explicação

1. **Entrada**: 
   - Valor líquido desejado em USD (ex: $1,000.00)
   - Taxa de câmbio (ex: 5.6)
2. **Passo 1 - Conversão**: 
   - $1,000.00 × 5.6 = R$ 5,600.00
3. **Passo 2 - Markup**: 
   - R$ 5,600.00 / (1 - 0.0179) = R$ 5,600.00 / 0.9821 = R$ 5,702.27
4. **Saída**: Valor bruto em centavos de BRL (570,227 centavos = R$ 5,702.27)

**⚠️ IMPORTANTE**: O IOF de 3.5% é adicionado automaticamente pelo Stripe ao aluno, então o valor final pago será maior que R$ 5,702.27.

### Código

**Arquivo**: `project/supabase/functions/utils/stripe-fee-calculator.ts`

```typescript
export function calculatePIXAmountWithFees(netAmountUSD: number, exchangeRate: number): number {
  // Taxas do Stripe para PIX
  const STRIPE_PIX_PROCESSING_PERCENTAGE = 0.0119; // 1.19%
  const STRIPE_CURRENCY_CONVERSION_PERCENTAGE = 0.006; // 0.6%
  const STRIPE_PIX_TOTAL_PERCENTAGE = STRIPE_PIX_PROCESSING_PERCENTAGE + STRIPE_CURRENCY_CONVERSION_PERCENTAGE; // ~1.8%
  
  // 1. Converter USD para BRL
  const netAmountBRL = netAmountUSD * exchangeRate;
  
  // 2. Calcular valor antes das taxas do Stripe
  const grossAmountBRL = netAmountBRL / (1 - STRIPE_PIX_TOTAL_PERCENTAGE);
  
  // Arredondar para 2 casas decimais e converter para centavos
  const grossAmountRounded = Math.round(grossAmountBRL * 100) / 100;
  const grossAmountInCents = Math.round(grossAmountRounded * 100);
  
  return grossAmountInCents;
}
```

### Exemplo Prático

```
Valor líquido desejado: $1,000.00 USD
Taxa de câmbio: 5.6

Passo 1 - Conversão:
  $1,000.00 × 5.6 = R$ 5,600.00

Passo 2 - Markup (1.8%):
  R$ 5,600.00 / (1 - 0.0179)
  = R$ 5,600.00 / 0.9821
  = R$ 5,702.27

Valor bruto cobrado (antes do IOF): R$ 5,702.27
IOF (3.5% adicionado pelo Stripe): R$ 199.58
Valor total pago pelo aluno: R$ 5,901.85
Taxa do Stripe: R$ 102.27
Valor líquido recebido: R$ 5,600.00 = $1,000.00 USD ✅
```

---

## Taxa de Câmbio

### Obtenção da Taxa

A taxa de câmbio é obtida de duas formas, com prioridade para a taxa enviada pelo frontend:

#### 1. Frontend (Prioridade)
- O frontend calcula a taxa usando `getExchangeRate()`
- A taxa é enviada no `metadata.exchange_rate` para o backend
- **Vantagem**: Garante consistência entre o valor exibido no frontend e o valor cobrado no Stripe

#### 2. Backend (Fallback)
- Se o frontend não enviar a taxa, o backend busca uma nova
- API utilizada: `https://api.exchangerate-api.com/v4/latest/USD`
- Margem comercial: +4% sobre a taxa base
- Fallback: 5.6 (se a API falhar)

### Cálculo no Backend

```typescript
// Priorizar taxa do frontend
const frontendExchangeRate = metadata?.exchange_rate 
  ? parseFloat(metadata.exchange_rate) 
  : null;

if (frontendExchangeRate && frontendExchangeRate > 0) {
  exchangeRate = frontendExchangeRate;
  console.log('💱 Usando taxa de câmbio do frontend:', exchangeRate);
} else {
  // Buscar nova taxa
  const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
  const data = await response.json();
  const baseRate = parseFloat(data.rates.BRL);
  
  // Aplicar margem comercial (4%)
  exchangeRate = baseRate * 1.04;
  console.log('💱 Taxa base:', baseRate);
  console.log('💱 Taxa com margem (+4%):', exchangeRate);
}
```

### Por que Priorizar Taxa do Frontend?

1. **Consistência**: O valor exibido no modal é o mesmo valor cobrado no Stripe
2. **Transparência**: O aluno vê exatamente o que vai pagar
3. **Prevenção de Discrepâncias**: Evita diferenças entre frontend e backend

---

## Fluxo Completo de Processamento

### 1. Frontend - Seleção de Método de Pagamento

```typescript
// Componente: PaymentMethodSelector
const handleMethodSelect = (method: string, exchangeRate?: number) => {
  // Armazena taxa de câmbio se PIX
  if (method === 'pix' && exchangeRate) {
    setCurrentExchangeRate(exchangeRate);
  }
  
  // Chama callback com método e taxa
  onMethodSelect(method, exchangeRate);
};
```

### 2. Frontend - Criação da Sessão

```typescript
// Componente: StripeCheckout
const handleCheckout = async (paymentMethod?: string, exchangeRateParam?: number) => {
  // Priorizar taxa recebida, depois estado, depois prop
  let finalExchangeRate = exchangeRateParam || currentExchangeRate || exchangeRate;
  
  // Se PIX e não tiver taxa, buscar
  if (paymentMethod === 'pix' && !finalExchangeRate) {
    finalExchangeRate = await getExchangeRate();
  }
  
  // Incluir taxa no metadata se PIX
  const metadata: any = {
    ...otherMetadata,
    ...(paymentMethod === 'pix' && finalExchangeRate 
      ? { exchange_rate: finalExchangeRate.toString() } 
      : {})
  };
  
  // Chamar edge function
  const response = await fetch(apiUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({
      amount: baseAmount,
      payment_method: paymentMethod,
      metadata: metadata
    })
  });
};
```

### 3. Backend - Edge Function

```typescript
// Edge Function: stripe-checkout-*-fee
Deno.serve(async (req) => {
  const { amount, payment_method, metadata } = await req.json();
  
  // 1. Obter taxa de câmbio (se PIX)
  let exchangeRate = 1;
  if (payment_method === 'pix') {
    // Priorizar taxa do frontend
    const frontendExchangeRate = metadata?.exchange_rate 
      ? parseFloat(metadata.exchange_rate) 
      : null;
    
    if (frontendExchangeRate && frontendExchangeRate > 0) {
      exchangeRate = frontendExchangeRate;
    } else {
      // Buscar nova taxa
      exchangeRate = await fetchExchangeRate();
    }
  }
  
  // 2. Calcular valor bruto
  let grossAmountInCents: number;
  if (payment_method === 'pix') {
    grossAmountInCents = calculatePIXAmountWithFees(amount, exchangeRate);
  } else {
    grossAmountInCents = calculateCardAmountWithFees(amount);
  }
  
  // 3. Criar sessão Stripe
  const session = await stripe.checkout.sessions.create({
    payment_method_types: payment_method === 'pix' ? ['pix'] : ['card'],
    line_items: [{
      price_data: {
        currency: payment_method === 'pix' ? 'brl' : 'usd',
        unit_amount: grossAmountInCents,
        product_data: {
          name: 'Fee Name',
          description: 'Fee Description'
        }
      },
      quantity: 1
    }],
    metadata: {
      base_amount: amount.toString(),
      gross_amount: (grossAmountInCents / 100).toString(),
      fee_amount: ((grossAmountInCents / 100) - amount).toString(),
      exchange_rate: exchangeRate.toString(),
      markup_enabled: 'true'
    }
  });
  
  return { session_url: session.url };
});
```

### 4. Stripe - Processamento

1. Aluno completa o pagamento
2. Stripe deduz suas taxas
3. Valor líquido é transferido para a conta
4. Webhook é disparado para atualizar o banco de dados

---

## Exemplos Práticos

### Exemplo 1: Application Fee - Cartão

```
Valor base: $350.00
Método: Cartão (USD)

Cálculo:
  grossAmount = ($350.00 + $0.30) / (1 - 0.039)
  grossAmount = $350.30 / 0.961
  grossAmount = $364.52

Valor cobrado: $364.52
Taxa do Stripe: $14.52
Valor líquido recebido: $350.00 ✅
```

### Exemplo 2: Application Fee - PIX

```
Valor base: $350.00
Método: PIX (BRL)
Taxa de câmbio: 5.6

Passo 1 - Conversão:
  $350.00 × 5.6 = R$ 1,960.00

Passo 2 - Markup:
  R$ 1,960.00 / (1 - 0.0179)
  = R$ 1,960.00 / 0.9821
  = R$ 1,995.72

Valor bruto (antes IOF): R$ 1,995.72
IOF (3.5%): R$ 69.85
Valor total pago: R$ 2,065.57
Taxa do Stripe: R$ 35.72
Valor líquido recebido: R$ 1,960.00 = $350.00 USD ✅
```

### Exemplo 3: Selection Process Fee - Cartão com Desconto

```
Valor original: $900.00
Desconto (cupom BLACK): 30%
Valor base (com desconto): $630.00
Método: Cartão (USD)

Cálculo:
  grossAmount = ($630.00 + $0.30) / (1 - 0.039)
  grossAmount = $630.30 / 0.961
  grossAmount = $655.67

Valor cobrado: $655.67
Taxa do Stripe: $25.67
Valor líquido recebido: $630.00 ✅
```

### Exemplo 4: Selection Process Fee - PIX com Desconto

```
Valor original: $900.00
Desconto (cupom BLACK): 30%
Valor base (com desconto): $630.00
Método: PIX (BRL)
Taxa de câmbio: 5.5432

Passo 1 - Conversão:
  $630.00 × 5.5432 = R$ 3,492.22

Passo 2 - Markup:
  R$ 3,492.22 / (1 - 0.0179)
  = R$ 3,492.22 / 0.9821
  = R$ 3,555.87

Valor bruto (antes IOF): R$ 3,555.87
IOF (3.5%): R$ 124.46
Valor total pago: R$ 3,680.33
Taxa do Stripe: R$ 63.65
Valor líquido recebido: R$ 3,492.22 = $630.00 USD ✅
```

---

## Metadata e Rastreamento

### Campos no Metadata da Sessão Stripe

```typescript
{
  // Identificação
  student_id: "uuid",
  fee_type: "application_fee" | "selection_process" | "scholarship_fee" | "i20_control_fee",
  payment_method: "stripe" | "pix",
  
  // Valores
  base_amount: "350.00",           // Valor líquido desejado
  gross_amount: "364.52",          // Valor bruto cobrado
  fee_amount: "14.52",             // Taxa do Stripe
  markup_enabled: "true",          // Indica que markup foi aplicado
  
  // Taxa de câmbio (apenas PIX)
  exchange_rate: "5.6",
  
  // Informações adicionais
  application_id: "uuid",
  scholarship_id: "uuid",
  university_id: "uuid",
  
  // Cupons e descontos
  promotional_coupon: "BLACK",
  promotional_discount: "true",
  promotional_discount_amount: "270.00",
  original_amount: "900.00",
  final_amount: "630.00"
}
```

### Uso do Metadata

1. **Webhook**: Usado para processar pagamentos e atualizar banco de dados
2. **Comissões**: `base_amount` é usado para calcular comissões
3. **Auditoria**: Rastreamento completo de valores e taxas
4. **Suporte**: Facilita identificação de problemas

---

## Arquivos e Funções Principais

### Backend (Edge Functions)

#### 1. Calculadora de Taxas
**Arquivo**: `project/supabase/functions/utils/stripe-fee-calculator.ts`

Funções:
- `calculateCardAmountWithFees(netAmount: number): number`
- `calculatePIXAmountWithFees(netAmountUSD: number, exchangeRate: number): number`
- `calculateCardFee(grossAmount: number): number`
- `calculatePIXFee(grossAmountBRL: number): number`

#### 2. Edge Functions de Checkout
- `project/supabase/functions/stripe-checkout-application-fee/index.ts`
- `project/supabase/functions/stripe-checkout-selection-process-fee/index.ts`
- `project/supabase/functions/stripe-checkout-scholarship-fee/index.ts`
- `project/supabase/functions/stripe-checkout-i20-control-fee/index.ts`

### Frontend

#### 1. Componentes
- `project/src/components/StripeCheckout.tsx` - Componente principal de checkout
- `project/src/components/PaymentMethodSelector.tsx` - Seletor de método de pagamento
- `project/src/components/PaymentMethodSelectorDrawer.tsx` - Drawer do seletor

#### 2. Utilitários
- `project/src/utils/stripeFeeCalculator.ts` - Calculadora de taxas (frontend)
- `project/src/utils/paymentConverter.ts` - Conversor de moedas

#### 3. Páginas
- `project/src/pages/StudentDashboard/ApplicationChatPage.tsx` - Página de aplicação
- `project/src/pages/StudentDashboard/MyApplications.tsx` - Lista de aplicações

---

## Resumo das Fórmulas

### Cartão (USD)
```
grossAmount = (netAmount + 0.30) / (1 - 0.039)
```

### PIX (BRL)
```
netAmountBRL = netAmountUSD × exchangeRate
grossAmountBRL = netAmountBRL / (1 - 0.0179)
```

### Taxa do Stripe
```
feeAmount = grossAmount - baseAmount
```

---

## Considerações Importantes

### 1. Taxa Conservadora para Cartões
- Usamos 3.9% (ao invés de 2.9%) para garantir que sempre recebemos o valor desejado
- Cartões domésticos dos EUA: recebemos um pouco mais (ok)
- Cartões internacionais: garantimos o valor mínimo

### 2. IOF no PIX
- O IOF de 3.5% é adicionado automaticamente pelo Stripe
- **NÃO** é incluído no nosso cálculo
- O aluno paga mais que o valor bruto calculado

### 3. Consistência de Taxa de Câmbio
- Sempre priorizar taxa do frontend
- Garante que o valor exibido = valor cobrado
- Evita discrepâncias e reclamações

### 4. Arredondamento
- Valores são arredondados para 2 casas decimais
- Convertidos para centavos antes de enviar ao Stripe
- Stripe trabalha com valores inteiros (centavos)

---

## Troubleshooting

### Problema: Valor diferente entre frontend e Stripe

**Causa**: Taxa de câmbio diferente entre frontend e backend

**Solução**: 
1. Verificar se `exchange_rate` está sendo enviado no metadata
2. Verificar logs do backend para confirmar uso da taxa do frontend
3. Garantir que frontend está calculando taxa antes de enviar

### Problema: Valor líquido recebido menor que esperado

**Causa**: Taxa do Stripe maior que calculada

**Solução**:
1. Verificar se está usando taxa conservadora (3.9% para cartões)
2. Verificar se markup está sendo aplicado corretamente
3. Verificar logs do Stripe para ver taxas reais cobradas

### Problema: IOF não aparece no cálculo

**Causa**: IOF é adicionado automaticamente pelo Stripe

**Solução**: 
- IOF não deve ser incluído no cálculo
- É adicionado automaticamente ao valor final pago pelo aluno
- Verificar `balanceTransaction` do Stripe para ver valor real

---

## Referências

- [Stripe Payment Processing Fees](https://stripe.com/pricing)
- [Stripe PIX Documentation](https://stripe.com/docs/payments/pix)
- [Stripe Currency Conversion](https://stripe.com/docs/currencies/conversions)

---

**Última atualização**: 19/11/2025  
**Versão**: 1.0.0

