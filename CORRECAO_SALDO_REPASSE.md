# Correção: Saldo p/ Repasse - Exclusão de Pagamentos Outside

## Problema Identificado

O controle do Matheus mostra:
- **Valor recebido pela The Future no ano**: $16,249
- **Valor repassado pela The Future p/ Brant**: $2,099
- **Saldo p/ repasse**: **$14,150** ⚠️ **INCORRETO**

## Por que está Incorreto?

O "Saldo p/ repasse" **NÃO deve incluir** pagamentos feitos "outside" (manual), pois esses pagamentos já foram feitos diretamente ao affiliate, não passaram pela plataforma.

### Cálculo Atual (INCORRETO)

```
Saldo p/ repasse = Total Revenue - Payment Requests Paid
Saldo p/ repasse = $20,748 - $2,099 = $18,649
```

Mas o controle mostra $14,150, o que sugere que está usando:
```
Saldo p/ repasse = ($20,748 - $4,499) - $2,099 = $14,150
```

Onde $4,499 é o **Manual Revenue PARCIAL** (não inclui todos os outside).

### Cálculo Correto

O "Saldo p/ repasse" deve ser:
```
Saldo p/ repasse = (Total Revenue - Manual Revenue COMPLETO) - Payment Requests Paid
Saldo p/ repasse = ($20,748 - $6,798) - $2,099 = $11,851
```

## Pagamentos Outside que DEVEM ser Excluídos

### Lista Completa de Pagamentos Outside (Manual Revenue)

| Estudante | Selection | Scholarship | I-20 | Total Outside |
|-----------|-----------|-------------|------|---------------|
| **Daniel Costa e Silva** | $999 | **$400** ❌ | **$999** ❌ | **$2,398** |
| Jonatas Fonseca Pinheiro | $1,000 | $0 | $0 | $1,000 |
| Maria Yorleny Palacio Lopera | $900 | $0 | $0 | $900 |
| **Thamara de Souza** | $0 | $0 | **$900** ❌ | **$900** |
| Alondra Ciprián Quezada | $400 | $0 | $0 | $400 |
| Sara Bianey Stith Campo | $400 | $0 | $0 | $400 |
| SHEYLA ROCIO HILARIO OCEJO | $400 | $0 | $0 | $400 |
| Vanessa Henrique Fogaça | $400 | $0 | $0 | $400 |
| **TOTAL CORRETO** | **$4,499** | **$400** | **$1,899** | **$6,798** |

### Pagamentos Outside que NÃO estão sendo Excluídos

**Daniel Costa e Silva:**
- Scholarship Fee: $400 (manual) ❌ **NÃO está sendo excluído**
- I-20 Control Fee: $999 (manual) ❌ **NÃO está sendo excluído**

**Thamara de Souza:**
- I-20 Control Fee: $900 (manual) ❌ **NÃO está sendo excluído** (payment_method = null no banco)

**Total não excluído: $2,299**

## Comparação de Valores

| Métrica | Valor Atual (Controle) | Valor Correto | Diferença |
|---------|----------------------|---------------|-----------|
| **Total Revenue** | $20,748 | $20,748 | $0 |
| **Manual Revenue** | $4,499 ❌ | **$6,798** ✅ | **-$2,299** |
| **Total Paid Out** | $2,099 | $2,099 | $0 |
| **Saldo p/ repasse** | **$14,150** ❌ | **$11,851** ✅ | **-$2,299** |

## Fórmula Correta

```
Saldo p/ repasse = (Total Revenue - Manual Revenue COMPLETO) - Payment Requests Paid

Onde:
- Total Revenue = $20,748 (todos os fees pagos)
- Manual Revenue COMPLETO = $6,798 (todos os pagamentos outside)
- Payment Requests Paid = $2,099 (já repassados)

Saldo p/ repasse = ($20,748 - $6,798) - $2,099
Saldo p/ repasse = $13,950 - $2,099
Saldo p/ repasse = $11,851 ✅
```

## Por que o Controle Mostra $14,150?

O controle está usando **Manual Revenue PARCIAL** ($4,499) ao invés do **Manual Revenue COMPLETO** ($6,798).

Isso acontece porque:
1. **Bug na RPC**: Não identifica Scholarship Fee pago para estudantes `legacy` (Daniel)
2. **Problema de dados**: `i20_control_fee_payment_method` do Thamara está como `null`

## Correções Necessárias

### 1. Corrigir RPC
A RPC `get_affiliate_admin_profiles_with_fees` deve verificar `scholarship_applications` também para estudantes `legacy`, não apenas o campo `up.is_scholarship_fee_paid`.

### 2. Corrigir Dados
Atualizar `i20_control_fee_payment_method` do Thamara de `null` para `'manual'` no banco de dados.

### 3. Recalcular Manual Revenue
Após as correções, recalcular Manual Revenue para incluir:
- Daniel: Scholarship $400 + I-20 $999 = $1,399 adicional
- Thamara: I-20 $900 adicional
- **Total adicional: $2,299**

### 4. Recalcular Saldo p/ Repasse
```
Saldo p/ repasse CORRETO = ($20,748 - $6,798) - $2,099 = $11,851
```

## Impacto

- **Saldo atual (incorreto)**: $14,150
- **Saldo correto**: $11,851
- **Diferença**: **-$2,299**

Isso significa que o controle está mostrando **$2,299 a mais** do que deveria, porque não está excluindo corretamente os pagamentos outside do Daniel (Scholarship + I-20) e do Thamara (I-20).

## Validação

Após as correções, o "Saldo p/ repasse" deve ser **$11,851**, não $14,150.

Este valor representa o que realmente pode ser repassado ao affiliate, excluindo:
1. Pagamentos já feitos "outside" (manual) - $6,798
2. Pagamentos já repassados - $2,099

