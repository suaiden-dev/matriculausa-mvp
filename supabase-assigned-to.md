# Supabase: Feature "Assigned To" — Instruções para execução

> Executar **na ordem** abaixo no projeto **matriculausa** (não migma-inc).

---

## 1. Migration: adicionar coluna `assigned_to_admin_id` em `user_profiles`

```sql
-- Adiciona o campo de responsável (admin interno) ao perfil do aluno.
-- Nullable, sem breaking changes. ON DELETE SET NULL garante que
-- ao remover um admin o campo volta para NULL em vez de quebrar.

ALTER TABLE user_profiles
  ADD COLUMN IF NOT EXISTS assigned_to_admin_id UUID
    REFERENCES user_profiles(id)
    ON DELETE SET NULL;

-- Índice para acelerar filtros por responsável
CREATE INDEX IF NOT EXISTS idx_user_profiles_assigned_to_admin_id
  ON user_profiles (assigned_to_admin_id);
```

---

## 2. RLS Policy: permitir que admins internos atualizem o campo

> Se a tabela `user_profiles` já tem RLS habilitado, adicione esta policy para
> permitir que usuários com `role = 'admin'` possam atualizar o campo
> `assigned_to_admin_id` de qualquer estudante.

```sql
-- Policy de UPDATE para admins internos
CREATE POLICY "Admins can assign responsible admin to students"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles AS me
      WHERE me.user_id = auth.uid()
        AND me.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles AS me
      WHERE me.user_id = auth.uid()
        AND me.role = 'admin'
    )
  );
```

> **Nota:** Se já existe uma policy de UPDATE para admins que cobre todos os campos,
> não é necessário criar uma nova — apenas confirme que o campo `assigned_to_admin_id`
> não está excluído da policy existente.

---

## 3. Verificar que os admins internos têm `role = 'admin'`

Execute o SELECT abaixo para confirmar que Raíssa, Romeu e Luiz aparecem com
`role = 'admin'` na tabela `user_profiles`. O filtro do front-end depende disso.

```sql
SELECT id, user_id, full_name, email, role
FROM user_profiles
WHERE role = 'admin'
ORDER BY full_name;
```

Se eles aparecerem com outro role (ex: `internal_admin`, `staff`, etc.), informe
o time de front-end para ajustar a query no hook `useFilterDataQuery`.

---

## 4. (Opcional) Popular assignments iniciais

Se já souberem quais alunos pertencem a cada admin, podem rodar:

```sql
-- Exemplo: atribuir todos os alunos de um seller específico a um admin
UPDATE user_profiles AS student
SET assigned_to_admin_id = '<UUID do admin>'
WHERE student.role = 'student'
  AND student.seller_referral_code = '<referral_code>';

-- Para atribuir manualmente por email do aluno:
UPDATE user_profiles
SET assigned_to_admin_id = (
  SELECT id FROM user_profiles WHERE email = '<email_do_admin>' LIMIT 1
)
WHERE email = '<email_do_aluno>';
```

---

## Checklist de execução

- [ ] Step 1: ALTER TABLE executado com sucesso
- [ ] Step 2: RLS policy criada (ou confirmado que já existe cobertura)
- [ ] Step 3: Confirmado que Raíssa, Romeu e Luiz têm `role = 'admin'`
- [ ] Step 4: (opcional) Assignments iniciais populados
