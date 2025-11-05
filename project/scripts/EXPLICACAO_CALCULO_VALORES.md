# Explicação do Cálculo de Valores - Payment Management

## Como os valores são calculados

Baseado no código em `PaymentManagement.tsx`, aqui está como cada valor é calculado:

### 1. **Total Revenue (Total Ganho)**

A receita total é a soma de todas as taxas pagas pelos estudantes vinculados ao affiliate admin:

```typescript
totalRevenue = Σ (selection_process_revenue + scholarship_revenue + i20_control_revenue)
```

Onde cada tipo de receita é calculado assim:

#### **Selection Process Fee**
- **Sistema Legacy**: $400 + ($150 × dependentes)
- **Sistema Simplified**: $350 + ($150 × dependentes)
- **Com Override**: Usa o valor customizado do override (sem adicionar dependentes se houver override)

#### **Scholarship Fee**
- **Sistema Legacy**: $900
- **Sistema Simplified**: $550
- **Com Override**: Usa o valor customizado do override

#### **I-20 Control Fee**
- **Ambos os sistemas**: $900 (sempre)
- **Só conta se**: Scholarship Fee foi pago E I-20 Control Fee foi pago
- **Com Override**: Usa o valor customizado do override

### 2. **Manual Revenue (Receita Manual)**

**⚠️ IMPORTANTE**: No código atual (linha 166), o `manualRevenue` está sendo definido como igual ao `totalRevenue`:

```typescript
const manualRevenue = totalRevenue;
```

Isso significa que **toda receita é considerada manual** (pagamentos por fora). Isso pode ser um bug ou uma simplificação temporária.

### 3. **Available Balance (Saldo Disponível)**

O saldo disponível é calculado assim:

```typescript
availableBalance = max(0, (totalRevenue - manualRevenue) - totalPaidOut - totalApproved - totalPending)
```

Como `manualRevenue = totalRevenue`, isso se reduz a:

```typescript
availableBalance = max(0, -totalPaidOut - totalApproved - totalPending)
```

**Resultado prático**: 
- Se não houver payment requests: `availableBalance = $0.00`
- Se houver payment requests: `availableBalance = $0.00` (sempre zero ou negativo, então o max() garante zero)

### 4. **Payment Requests**

Os valores são somados por status:
- **Total Paid Out**: Soma de todos os requests com status `'paid'`
- **Total Approved**: Soma de todos os requests com status `'approved'`
- **Total Pending**: Soma de todos os requests com status `'pending'`

## Exemplo de Cálculo

Vamos supor que o Matheus Brant tem:

- **3 estudantes** vinculados:
  1. Estudante A (Legacy, 0 dependentes):
     - ✅ Selection Process Fee pago: $400
     - ✅ Scholarship Fee pago: $900
     - ✅ I-20 Control Fee pago: $900
     - **Total por estudante**: $2,200
  
  2. Estudante B (Legacy, 2 dependentes):
     - ✅ Selection Process Fee pago: $400 + ($150 × 2) = $700
     - ✅ Scholarship Fee pago: $900
     - **Total por estudante**: $1,600
  
  3. Estudante C (Simplified, 1 dependente):
     - ✅ Selection Process Fee pago: $350 + ($150 × 1) = $500
     - ✅ Scholarship Fee pago: $550
     - **Total por estudante**: $1,050

**Total Revenue**: $2,200 + $1,600 + $1,050 = **$4,850**

**Manual Revenue**: $4,850 (igual ao total)

**Payment Requests**:
- 1 request pago: $500
- 1 request aprovado: $1,000
- 1 request pendente: $800

**Available Balance**:
```
max(0, ($4,850 - $4,850) - $500 - $1,000 - $800)
= max(0, -$2,300)
= $0.00
```

## Como Executar o Script SQL

Para ver os valores reais do Matheus Brant, execute o script:

```bash
# No Supabase SQL Editor ou via psql
psql -h [seu-host] -U [seu-usuario] -d [seu-db] -f project/scripts/calculate_affiliate_balance.sql
```

Ou no Supabase Dashboard:
1. Vá para SQL Editor
2. Cole o conteúdo de `calculate_affiliate_balance.sql`
3. Substitua `'contato@brantimmigration.com'` pelo email correto se necessário
4. Execute a query

## Observações Importantes

1. **Manual Revenue**: A lógica atual assume que toda receita é manual. Isso pode precisar ser ajustado no futuro para distinguir pagamentos automáticos vs manuais.

2. **Available Balance**: Com a lógica atual, o available balance sempre será $0.00 se houver payment requests, pois `totalRevenue - manualRevenue = 0`.

3. **Overrides**: Se um estudante tiver overrides customizados de taxas, esses valores serão usados ao invés dos valores padrão.

4. **System Type**: O cálculo muda baseado no `system_type` do estudante (legacy vs simplified), que é herdado do seller.

