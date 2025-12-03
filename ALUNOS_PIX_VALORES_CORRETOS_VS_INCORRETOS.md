# Alunos Legacy que Pagaram via PIX/Stripe - Valores Corretos vs Incorretos

## Resumo
Total de alunos afetados: **5 alunos legacy** que pagaram via PIX/Stripe

---

## Alunos com Valores SUPERESTIMADOS (mostrando mais do que deveria)

### 1. Felipe Luis Aquino Pereira da Rocha
- **Email:** flaprocha@gmail.com
- **System Type:** legacy | **Dependentes:** 4
- **Selection Process:**
  - ❌ Incorreto: $1,036.10
  - ✅ Correto: $1,000.00
- **Scholarship:**
  - ❌ Incorreto: $933.67
  - ✅ Correto: $900.00
- **I-20 Control:**
  - ❌ Incorreto: $1,057.64
  - ✅ Correto: $999.00 (override)
- **Total:**
  - ❌ Incorreto: $3,027.41
  - ✅ Correto: $2,899.00
  - **Diferença:** +$128.41

### 2. Victor Vieira Pacheco
- **Email:** vieirapachecovictor@gmail.com
- **System Type:** legacy | **Dependentes:** 0
- **Selection Process:**
  - ❌ Incorreto: $413.73
  - ✅ Correto: $400.00
- **Scholarship:**
  - ❌ Incorreto: $933.67
  - ✅ Correto: $900.00
- **I-20 Control:**
  - ❌ Incorreto: $1,057.64
  - ✅ Correto: $999.00 (override)
- **Total:**
  - ❌ Incorreto: $2,405.04
  - ✅ Correto: $2,299.00
  - **Diferença:** +$106.04

### 3. Stephanie Cristine Santos Ferreira
- **Email:** stephaniecriistine25@gmail.com
- **System Type:** legacy | **Dependentes:** 1
- **Selection Process:**
  - ✅ Correto: $550.00
- **Scholarship:**
  - ✅ Correto: $900.00
- **I-20 Control:**
  - ❌ Incorreto: $937.49
  - ✅ Correto: $900.00
- **Total:**
  - ❌ Incorreto: $2,387.49
  - ✅ Correto: $2,350.00
  - **Diferença:** +$37.49

---

## Alunos com Valores CORRETOS (sem diferença)

### 4. Gerson Aparecido Chesque Pereira
- **Email:** gerson_sk@hotmail.com
- **System Type:** legacy | **Dependentes:** 2
- **Selection Process:**
  - ✅ Correto: $700.00
- **Scholarship:**
  - ✅ Correto: $900.00
- **I-20 Control:**
  - ✅ Correto: $900.00
- **Total:** $2,500.00 ✅ (correto)

### 5. Mariana Moura Fontenele de Brito
- **Email:** mmfontenelebrito@gmail.com
- **System Type:** legacy | **Dependentes:** 1
- **Selection Process:**
  - ✅ Correto: $550.00
- **Scholarship:**
  - ✅ Correto: $900.00
- **I-20 Control:**
  - ✅ Correto: $900.00
- **Total:** $2,350.00 ✅ (correto)

---

## Observações Importantes

1. **Felipe e Victor:** Têm override de $999 para I-20 Control Fee (caso específico de anomalia)
2. **Todos os outros:** Usam valores padrão baseados no `system_type` legacy
3. **Problema:** O sistema estava usando `gross_amount_usd` (com taxas Stripe) em vez dos valores esperados "Zelle" (sem taxas)
4. **Solução:** A função `getDisplayAmounts()` agora usa apenas overrides explícitos e valores padrão baseados no `system_type`
5. **Todos os dashboards** (Seller e Admin de Afiliados) foram atualizados para usar `getDisplayAmounts()`
