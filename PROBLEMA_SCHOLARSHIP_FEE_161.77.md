# Problema: Scholarship Fee aparecendo como $161.77 em vez de $900

## 🔍 Problema Identificado

O estudante **Felipe Luis Aquino Pereira da Rocha** está mostrando:
- **Scholarship Fee**: $161.77 ❌ (deveria ser $900)
- **I-20 Control Fee**: $999 ✅ (correto, foi o que ele pagou)
- **Selection Process Fee**: $1,000 ✅ (correto)

**Total exibido**: $2,160.77
**Total esperado**: $2,800 ($1,000 + $900 + $900)

## 📊 Análise do Código

### 1. Função `getRealPaidAmounts()` em `paymentConverter.ts`

A função busca valores da tabela `individual_fee_payments` e processa assim:

```typescript
// Linha 276-279: Usa o MAIOR valor encontrado
if (!amounts[feeTypeKey] || amountUSD > amounts[feeTypeKey]) {
  amounts[feeTypeKey] = amountUSD;
}
```

**Problema**: Se houver múltiplos registros na tabela, está usando o **maior valor**, mas pode estar processando incorretamente um valor antigo ou com conversão errada.

### 2. Possíveis Causas

#### Causa 1: Registro antigo com valor incorreto na tabela

Pode haver um registro antigo na tabela `individual_fee_payments` com:
- Valor em BRL que foi salvo incorretamente como USD
- Valor parcial de um pagamento anterior
- Valor de teste ou desenvolvimento

**Exemplo**:
- Se houver um registro com `amount = 890` (em BRL) e foi interpretado como USD
- Com taxa de câmbio ~5.5: R$ 890 ÷ 5.5 = $161.77 USD

#### Causa 2: Conversão de moeda incorreta

Se o pagamento foi em BRL (PIX) e a conversão está errada:
- Valor pago: R$ 4,950 (equivalente a $900 USD com taxa ~5.5)
- Se o sistema interpretou R$ 890 como USD: $890 ÷ 5.5 = $161.77

#### Causa 3: Múltiplos registros e está usando o errado

Se há múltiplos registros para `fee_type = 'scholarship'`:
- Registro antigo: $161.77 (incorreto)
- Registro novo: $900 (correto)
- O código usa o **maior valor**, mas pode estar processando o antigo primeiro

#### Causa 4: Valor parcial de pagamento

Se houve um pagamento parcial ou tentativa anterior:
- Primeira tentativa: $161.77 (falhou ou foi cancelado)
- Segunda tentativa: $900 (sucesso)
- O sistema pode estar usando o valor da primeira tentativa

## ✅ Solução Proposta

### Solução 1: Verificar e corrigir dados na tabela

**Query SQL para investigar**:

```sql
-- Buscar todos os registros de scholarship fee para Felipe
SELECT 
  ifp.id,
  ifp.fee_type,
  ifp.amount,
  ifp.gross_amount_usd,
  ifp.payment_method,
  ifp.payment_intent_id,
  ifp.payment_date,
  ifp.created_at,
  up.full_name,
  up.email
FROM individual_fee_payments ifp
JOIN user_profiles up ON ifp.user_id = up.user_id
WHERE up.email ILIKE '%flaprocha%'
  AND ifp.fee_type = 'scholarship'
ORDER BY ifp.payment_date DESC, ifp.created_at DESC;
```

**Ações**:
1. Identificar registros incorretos (valores muito baixos)
2. Verificar se há registros duplicados
3. Deletar ou corrigir registros incorretos
4. Garantir que apenas o registro correto ($900) seja usado

### Solução 2: Melhorar lógica de seleção de valores

**Problema atual**: Usa o maior valor, mas pode processar valores antigos primeiro.

**Solução**: Ordenar por data e usar o mais recente:

```typescript
// Em paymentConverter.ts, linha 166-170
const { data: payments, error } = await supabase
  .from('individual_fee_payments')
  .select('fee_type, amount, payment_method, payment_intent_id, payment_date, gross_amount_usd')
  .eq('user_id', userId)
  .in('fee_type', feeTypes)
  .order('payment_date', { ascending: false }) // ✅ ADICIONAR: Ordenar por data mais recente primeiro
  .order('created_at', { ascending: false }); // ✅ ADICIONAR: Se payment_date for null, usar created_at
```

E na lógica de seleção (linha 276-279):

```typescript
if (feeTypeKey) {
  // ✅ CORREÇÃO: Usar o primeiro registro (mais recente) em vez do maior valor
  // Como já está ordenado por payment_date DESC, o primeiro é o mais recente
  if (!amounts[feeTypeKey]) {
    amounts[feeTypeKey] = amountUSD;
  }
}
```

### Solução 3: Adicionar validação de valores razoáveis

**Problema**: Valores muito baixos estão sendo aceitos.

**Solução**: Adicionar validação similar à que já existe em `transformPayments.ts`:

```typescript
// Em paymentConverter.ts, após linha 268
const expectedScholarship = 900; // Valor esperado para scholarship fee
const tolerance = 0.5; // 50% de tolerância

if (feeTypeKey === 'scholarship') {
  const isValueReasonable = amountUSD >= expectedScholarship * (1 - tolerance) 
    && amountUSD <= expectedScholarship * (1 + tolerance);
  
  if (!isValueReasonable && amountUSD < expectedScholarship * 0.5) {
    // Valor muito baixo, provavelmente incorreto - IGNORAR
    console.warn(`[paymentConverter] ⚠️ Valor de scholarship muito baixo (${amountUSD}), ignorando. Esperado ~${expectedScholarship}`);
    continue;
  }
}
```

### Solução 4: Usar gross_amount_usd quando disponível

**Problema**: Pode estar usando `amount` (líquido) quando deveria usar `gross_amount_usd` (bruto).

**Solução**: Priorizar `gross_amount_usd` para exibição:

```typescript
// Em paymentConverter.ts, linha 184
let amountUSD = payment.gross_amount_usd 
  ? Number(payment.gross_amount_usd)  // ✅ Usar valor bruto se disponível
  : Number(payment.amount);            // Fallback para valor líquido
```

## 🎯 Implementação Recomendada

### Passo 1: Investigar dados

Executar a query SQL acima para identificar registros problemáticos.

### Passo 2: Corrigir dados (se necessário)

- Deletar registros incorretos
- Corrigir valores incorretos
- Garantir que apenas registros corretos existam

### Passo 3: Implementar melhorias no código

1. Adicionar ordenação por data na query
2. Usar o registro mais recente em vez do maior valor
3. Adicionar validação de valores razoáveis
4. Priorizar `gross_amount_usd` para exibição

### Passo 4: Testar

- Verificar se o valor de $900 aparece corretamente
- Verificar se outros estudantes não foram afetados
- Verificar se o cálculo de comissão ainda funciona corretamente

## 📝 Notas Importantes

1. **Não deletar dados sem backup**: Sempre fazer backup antes de deletar registros
2. **Testar em ambiente de desenvolvimento primeiro**: Não aplicar mudanças direto em produção
3. **Verificar outros estudantes**: Pode haver outros casos similares
4. **Manter logs**: Adicionar logs detalhados para rastrear problemas futuros

## 🔗 Arquivos Relacionados

- `project/src/utils/paymentConverter.ts` (função `getRealPaidAmounts`)
- `project/src/pages/AdminDashboard/AffiliateManagement.tsx` (linhas 454-516)
- Tabela `individual_fee_payments` no Supabase

