# Cálculo de Valores PIX - Matricula USA

## 📋 Resumo Executivo

Este documento explica **especificamente** como o sistema Matricula USA calcula os valores para pagamento via **PIX**, incluindo:
- API de cotação do dólar
- Spread/margem comercial aplicada
- Taxas do Stripe para PIX
- Cálculo do valor final para o aluno
- Exemplo prático para Selection Process Fee

---

## 🌐 API de Cotação do Dólar

### API Utilizada
**ExchangeRates-API** (gratuita, sem autenticação)
- **URL**: `https://api.exchangerate-api.com/v4/latest/USD`
- **Método**: GET
- **Resposta**: JSON com taxas de câmbio atualizadas

### Exemplo de Resposta
```json
{
  "base": "USD",
  "date": "2025-01-30",
  "rates": {
    "BRL": 5.3
  }
}
```

### Onde é Usada
- **Frontend**: `project/src/utils/stripeFeeCalculator.ts` - função `getExchangeRate()`
- **Backend**: Edge Functions (ex: `stripe-checkout-selection-process-fee/index.ts`)

---

## 💱 Spread/Margem Comercial

### Margem Aplicada
**+4% sobre a taxa base** da API

### Cálculo
```typescript
// 1. Buscar taxa base da API
const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
const data = await response.json();
const baseRate = parseFloat(data.rates.BRL); // Ex: 5.3

// 2. Aplicar margem comercial de 4%
const exchangeRate = baseRate * 1.04; // Ex: 5.3 * 1.04 = 5.512

// 3. Arredondar para 3 casas decimais
return Math.round(exchangeRate * 1000) / 1000; // Ex: 5.512
```

### Fallback
Se a API falhar, o sistema usa uma taxa fixa de **5.6** como fallback.

### Prioridade
1. **Taxa do Frontend** (prioridade máxima) - garante consistência entre o valor exibido e o cobrado
2. **Taxa do Backend** (fallback) - busca nova taxa se o frontend não enviar

---

## 💳 Taxas do Stripe para PIX

### Taxas Aplicadas
O Stripe cobra **duas taxas** para pagamentos PIX:

1. **Taxa de Processamento**: **1.19%**
2. **Taxa de Conversão de Moedas**: **~0.6%** (conservador)

**Total**: **~1.8%** (soma das duas taxas)

### Código das Constantes
```typescript
const STRIPE_PIX_PROCESSING_PERCENTAGE = 0.0119;      // 1.19%
const STRIPE_CURRENCY_CONVERSION_PERCENTAGE = 0.006;   // 0.6%
const STRIPE_PIX_TOTAL_PERCENTAGE = 0.0179;            // ~1.8%
```

### ⚠️ IMPORTANTE: IOF
O **IOF de 3.5%** é adicionado **automaticamente pelo Stripe** ao valor final que o aluno paga. **NÃO** é incluído no cálculo do valor bruto.

---

## 🧮 Fórmula de Cálculo PIX

### Passo a Passo

#### 1. Converter USD para BRL
```typescript
netAmountBRL = netAmountUSD × exchangeRate
```

**Exemplo:**
- Valor líquido desejado: $400 USD
- Taxa de câmbio: 5.512
- `netAmountBRL = 400 × 5.512 = R$ 2,204.80`

#### 2. Calcular Valor Bruto (com markup do Stripe)
```typescript
grossAmountBRL = netAmountBRL / (1 - STRIPE_PIX_TOTAL_PERCENTAGE)
```

**Exemplo:**
- `netAmountBRL = R$ 2,204.80`
- `STRIPE_PIX_TOTAL_PERCENTAGE = 0.0179` (1.8%)
- `grossAmountBRL = 2,204.80 / (1 - 0.0179)`
- `grossAmountBRL = 2,204.80 / 0.9821`
- `grossAmountBRL = R$ 2,245.00` (arredondado)

#### 3. IOF (adicionado pelo Stripe)
```typescript
iofAmount = grossAmountBRL × 0.035  // 3.5%
totalWithIOF = grossAmountBRL + iofAmount
```

**Exemplo:**
- `grossAmountBRL = R$ 2,245.00`
- `iofAmount = 2,245.00 × 0.035 = R$ 78.58`
- `totalWithIOF = 2,245.00 + 78.58 = R$ 3,323.58`

---

## 📝 Exemplo Completo: Selection Process Fee

### Cenário
- **Valor base**: $400 USD (Selection Process Fee)
- **Taxa de câmbio base (API)**: 5.3
- **Taxa com margem (+4%)**: 5.512

### Cálculo Detalhado

#### Passo 1: Conversão USD → BRL
```
netAmountBRL = $400 × 5.512 = R$ 2,204.80
```

#### Passo 2: Aplicar Markup do Stripe (1.8%)
```
grossAmountBRL = R$ 2,204.80 / (1 - 0.0179)
grossAmountBRL = R$ 2,204.80 / 0.9821
grossAmountBRL = R$ 2,245.00
```

#### Passo 3: IOF (3.5% - adicionado pelo Stripe)
```
iofAmount = R$ 2,245.00 × 0.035 = R$ 78.58
totalWithIOF = R$ 2,245.00 + R$ 78.58 = R$ 3,323.58
```

### Resumo Final
| Item | Valor |
|------|-------|
| Valor líquido desejado (USD) | $400.00 |
| Taxa de câmbio (com margem 4%) | 5.512 |
| Valor líquido (BRL) | R$ 2,204.80 |
| **Valor bruto cobrado (BRL)** | **R$ 2,245.00** |
| Taxa do Stripe (1.8%) | R$ 40.20 |
| IOF (3.5%) | R$ 78.58 |
| **Valor total pago pelo aluno** | **R$ 3,323.58** |
| Valor líquido recebido (USD) | $400.00 ✅ |

---

## 🔧 Implementação no Código

### Frontend
**Arquivo**: `project/src/utils/stripeFeeCalculator.ts`

```typescript
// Buscar taxa de câmbio
export async function getExchangeRate(): Promise<number> {
  const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
  const data = await response.json();
  const baseRate = parseFloat(data.rates.BRL);
  const exchangeRate = baseRate * 1.04; // +4% margem
  return Math.round(exchangeRate * 1000) / 1000;
}

// Calcular valor PIX
export function calculatePIXAmountWithFees(netAmountUSD: number, exchangeRate: number): number {
  const STRIPE_PIX_PROCESSING_PERCENTAGE = 0.0119;      // 1.19%
  const STRIPE_CURRENCY_CONVERSION_PERCENTAGE = 0.006;   // 0.6%
  const STRIPE_PIX_TOTAL_PERCENTAGE = 0.0179;            // ~1.8%
  
  // 1. Converter USD para BRL
  const netAmountBRL = netAmountUSD * exchangeRate;
  
  // 2. Calcular valor bruto
  const grossAmountBRL = netAmountBRL / (1 - STRIPE_PIX_TOTAL_PERCENTAGE);
  
  return Math.round(grossAmountBRL * 100) / 100;
}
```

### Backend
**Arquivo**: `project/supabase/functions/utils/stripe-fee-calculator.ts`

```typescript
export function calculatePIXAmountWithFees(netAmountUSD: number, exchangeRate: number): number {
  const STRIPE_PIX_PROCESSING_PERCENTAGE = 0.0119;      // 1.19%
  const STRIPE_CURRENCY_CONVERSION_PERCENTAGE = 0.006;   // 0.6%
  const STRIPE_PIX_TOTAL_PERCENTAGE = 0.0179;            // ~1.8%
  
  // 1. Converter USD para BRL
  const netAmountBRL = netAmountUSD * exchangeRate;
  
  // 2. Calcular valor bruto
  const grossAmountBRL = netAmountBRL / (1 - STRIPE_PIX_TOTAL_PERCENTAGE);
  
  // 3. Converter para centavos (formato Stripe)
  const grossAmountRounded = Math.round(grossAmountBRL * 100) / 100;
  const grossAmountInCents = Math.round(grossAmountRounded * 100);
  
  return grossAmountInCents;
}
```

### Edge Function (Selection Process Fee)
**Arquivo**: `project/supabase/functions/stripe-checkout-selection-process-fee/index.ts`

```typescript
// 1. Obter taxa de câmbio (priorizar frontend)
let exchangeRate = 1;
if (payment_method === 'pix') {
  const frontendExchangeRate = metadata?.exchange_rate 
    ? parseFloat(metadata.exchange_rate) 
    : null;
  
  if (frontendExchangeRate && frontendExchangeRate > 0) {
    exchangeRate = frontendExchangeRate; // Usar taxa do frontend
  } else {
    // Buscar nova taxa
    const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
    const data = await response.json();
    const baseRate = parseFloat(data.rates.BRL);
    exchangeRate = baseRate * 1.04; // +4% margem
  }
}

// 2. Calcular valor bruto
const baseAmount = 400; // Valor em USD
const grossAmountInCents = calculatePIXAmountWithFees(baseAmount, exchangeRate);

// 3. Criar sessão Stripe
sessionConfig.line_items = [{
  price_data: {
    currency: 'brl', // BRL para PIX
    product_data: {
      name: 'Selection Process Fee',
    },
    unit_amount: grossAmountInCents, // Em centavos
  },
  quantity: 1,
}];
```

---

## 📊 Fluxo Completo

### 1. Frontend - Exibição do Valor
```
1. Usuário seleciona PIX como método de pagamento
2. Sistema busca taxa de câmbio: getExchangeRate()
3. Calcula valor bruto: calculatePIXAmountWithFees(400, 5.512)
4. Exibe valor para o aluno: R$ 2,245.00 (+ IOF será adicionado pelo Stripe)
```

### 2. Frontend - Criação da Sessão
```
1. Envia para backend:
   - amount: 400 (USD)
   - payment_method: 'pix'
   - metadata: { exchange_rate: '5.512' }
```

### 3. Backend - Processamento
```
1. Recebe dados do frontend
2. Usa taxa do frontend (ou busca nova se não houver)
3. Calcula valor bruto: calculatePIXAmountWithFees(400, 5.512) = 224,500 centavos
4. Cria sessão Stripe com currency: 'brl' e unit_amount: 224500
```

### 4. Stripe - Cobrança
```
1. Stripe adiciona IOF de 3.5% automaticamente
2. Valor final cobrado do aluno: R$ 2,245.00 + R$ 78.58 = R$ 3,323.58
3. Stripe processa pagamento PIX
4. Valor líquido recebido: R$ 2,204.80 = $400.00 USD ✅
```

---

## ⚠️ Observações Importantes

### 1. IOF não é incluído no cálculo
O IOF de 3.5% é adicionado **automaticamente pelo Stripe** ao valor final. O sistema **não** inclui no cálculo do `grossAmountBRL`.

### 2. Taxa do Frontend tem prioridade
O sistema prioriza a taxa de câmbio enviada pelo frontend para garantir que o valor exibido seja o mesmo valor cobrado.

### 3. Margem comercial de 4%
A margem de 4% sobre a taxa base da API garante que o sistema tenha uma margem de segurança para variações de câmbio.

### 4. Taxas conservadoras
As taxas do Stripe são calculadas de forma conservadora (1.8% total) para garantir que sempre recebamos pelo menos o valor líquido desejado.

### 5. Formato Stripe
O Stripe trabalha com valores em **centavos** (inteiros). O valor final é convertido para centavos antes de ser enviado ao Stripe.

---

## 📚 Arquivos Relacionados

- **Frontend**: `project/src/utils/stripeFeeCalculator.ts`
- **Backend**: `project/supabase/functions/utils/stripe-fee-calculator.ts`
- **Edge Functions**:
  - `project/supabase/functions/stripe-checkout-selection-process-fee/index.ts`
  - `project/supabase/functions/stripe-checkout-scholarship-fee/index.ts`
  - `project/supabase/functions/stripe-checkout-application-fee/index.ts`
  - `project/supabase/functions/stripe-checkout-i20-control-fee/index.ts`
- **Documentação**: `DOCUMENTACAO_TAXAS_STRIPE.md`

---

## ✅ Resumo Final

1. **API**: ExchangeRates-API (`https://api.exchangerate-api.com/v4/latest/USD`)
2. **Spread**: +4% sobre a taxa base
3. **Taxas Stripe PIX**: 1.19% (processamento) + 0.6% (conversão) = **1.8% total**
4. **IOF**: 3.5% (adicionado automaticamente pelo Stripe)
5. **Fórmula**: `grossAmountBRL = (netAmountUSD × exchangeRate) / (1 - 0.0179)`
6. **Prioridade**: Taxa do frontend > Taxa do backend > Fallback (5.6)











