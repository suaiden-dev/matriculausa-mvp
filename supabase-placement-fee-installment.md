# Supabase: Parcelamento de Placement Fee — Migration

> Executar no projeto **matriculausa** (não migma-inc).

---

## 1. Adicionar colunas de parcelamento em `user_profiles`

```sql
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS placement_fee_pending_balance NUMERIC(10,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS placement_fee_due_date TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS placement_fee_installment_number SMALLINT DEFAULT 0;
```

**Significado dos campos:**
- `placement_fee_pending_balance` — valor ainda devido (0 = totalmente quitado)
- `placement_fee_due_date` — vencimento da 2ª parcela (null = sem parcela pendente)
- `placement_fee_installment_number` — qual parcela foi paga por último (0 = nenhuma, 1 = 1ª paga, 2 = 2ª paga / quitado)

---

## 2. Verificar políticas RLS existentes

As policies de UPDATE para admins já existem e cobrem `user_profiles`. Confirmar que as novas colunas estão incluídas executando:

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'user_profiles' AND cmd = 'UPDATE';
```

Se a policy existente for permissiva (sem `WITH CHECK` restrito por coluna), nenhuma ação adicional é necessária.

---

## 3. (Opcional) Índice para consultas de saldo devedor

```sql
CREATE INDEX IF NOT EXISTS idx_user_profiles_placement_fee_pending_balance
  ON user_profiles (placement_fee_pending_balance)
  WHERE placement_fee_pending_balance > 0;
```

Útil se quiser futuramente listar todos os alunos com dívida pendente.

---

## Checklist de execução

- [ ] ALTER TABLE executado com sucesso
- [ ] Confirmar que as 3 colunas aparecem em `user_profiles`
- [ ] Verificar que RLS de UPDATE cobre as novas colunas
- [ ] (Opcional) Índice criado
