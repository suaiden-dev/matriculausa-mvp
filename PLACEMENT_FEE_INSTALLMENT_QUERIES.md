# Placement Fee Installment — Supabase Queries

Queries necessárias para suportar o fluxo de parcelamento de 50% da placement fee.

---

## 1. Verificar colunas existentes em `user_profiles`

```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'user_profiles'
  AND column_name IN (
    'is_placement_fee_paid',
    'placement_fee_payment_method',
    'placement_fee_installment_enabled',
    'placement_fee_pending_balance',
    'placement_fee_amount'
  )
ORDER BY column_name;
```

---

## 2. Adicionar `placement_fee_pending_balance` caso não exista

```sql
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS placement_fee_pending_balance NUMERIC(10, 2) DEFAULT 0;
```

---

## 3. Adicionar `placement_fee_installment_enabled` caso não exista

```sql
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS placement_fee_installment_enabled BOOLEAN DEFAULT FALSE;
```

---

## 4. Verificar estado atual de um aluno específico

Substituir `<user_id>` pelo UUID do aluno.

```sql
SELECT
  id,
  user_id,
  is_placement_fee_paid,
  placement_fee_payment_method,
  placement_fee_installment_enabled,
  placement_fee_pending_balance,
  placement_fee_amount,
  placement_fee_flow
FROM user_profiles
WHERE user_id = '<user_id>';
```

---

## 5. Simular o que o admin faz ao confirmar 1ª parcela (para debug)

Substitua `<user_id>` e `<valor_parcela>` (ex: 600 para uma fee de $1200).

```sql
UPDATE user_profiles
SET
  is_placement_fee_paid = TRUE,
  placement_fee_payment_method = 'manual',
  placement_fee_pending_balance = <valor_parcela>
WHERE user_id = '<user_id>';
```

---

## 6. Simular confirmação da 2ª parcela (zerando saldo)

```sql
UPDATE user_profiles
SET
  placement_fee_pending_balance = 0
WHERE user_id = '<user_id>';
```

---

## 7. Verificar registros na tabela `individual_fee_payments`

```sql
SELECT
  id,
  user_id,
  fee_type,
  amount,
  payment_method,
  payment_date,
  created_at
FROM individual_fee_payments
WHERE user_id = '<user_id>'
  AND fee_type = 'placement'
ORDER BY created_at DESC;
```

---

## 8. Resetar estado para testar fluxo do zero

```sql
UPDATE user_profiles
SET
  is_placement_fee_paid = FALSE,
  placement_fee_payment_method = NULL,
  placement_fee_pending_balance = 0,
  placement_fee_installment_enabled = FALSE
WHERE user_id = '<user_id>';
```

---

## Fluxo esperado após as correções

| Passo | Ação do admin | `is_placement_fee_paid` | `placement_fee_pending_balance` |
|-------|--------------|------------------------|--------------------------------|
| 0 | Estado inicial | FALSE | 0 |
| 1 | Habilita toggle Installment | FALSE | 0 |
| 2 | Clica "Mark as Paid" → modal abre com 50% do valor total | — | — |
| 3 | Confirma 1ª parcela | TRUE | valor da 1ª parcela (ex: $600) |
| 4 | Admin vê "1ª Parcela Paga — 2ª parcela pendente: $600" | — | — |
| 5 | Clica "Mark as Paid" novamente → modal abre com $600 (saldo restante) | — | — |
| 6 | Confirma 2ª parcela | TRUE | 0 |
| 7 | Admin vê "Paid" (badge verde completo) | — | — |
