# Supabase: Habilitar Parcelamento de Placement Fee — Migration

> Executar no projeto **matriculausa** (não migma-inc).
> Esta migration complementa o arquivo `supabase-placement-fee-installment.md`.
> Execute **depois** das 3 colunas anteriores já estarem criadas.

---

## 1. Adicionar coluna de habilitação de parcelamento em `user_profiles`

```sql
ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS placement_fee_installment_enabled BOOLEAN DEFAULT FALSE;
```

**Significado:**
- `placement_fee_installment_enabled = false` (padrão) — aluno paga o valor cheio normalmente
- `placement_fee_installment_enabled = true` — admin habilitou parcelamento; aluno vê 50% do valor no checkout

---

## 2. Verificar políticas RLS existentes

As policies de UPDATE para admins já cobrem `user_profiles`. Confirmar:

```sql
SELECT policyname, cmd, qual
FROM pg_policies
WHERE tablename = 'user_profiles' AND cmd = 'UPDATE';
```

Se a policy existente for permissiva (sem `WITH CHECK` restrito por coluna), nenhuma ação adicional é necessária.

---

## Checklist de execução

- [ ] ALTER TABLE executado com sucesso
- [ ] Confirmar que a coluna `placement_fee_installment_enabled` aparece em `user_profiles`
- [ ] Verificar que RLS de UPDATE cobre a nova coluna
