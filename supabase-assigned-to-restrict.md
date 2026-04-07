# Supabase: Restrição de Atribuição por Admin — Atualização de RLS

> Executar no projeto **matriculausa** após a migration anterior (`supabase-assigned-to.md`).

## Objetivo

Cada admin interno (Raíssa, Romeu, Luiz) só pode:
- Atribuir um aluno **a si mesmo** (não pode atribuir a outro admin)
- Remover a atribuição apenas se **o aluno estiver atribuído a ele mesmo**

Não pode:
- Alterar/remover atribuição de outro admin
- Atribuir a um terceiro admin

---

## 1. Substituir a policy existente por uma mais restrita

```sql
-- Remove a policy anterior (permissiva)
DROP POLICY IF EXISTS "Admins can assign responsible admin to students" ON user_profiles;

-- Cria policy restrita:
-- USING  → só permite o UPDATE se o aluno estiver sem responsável
--           OU se o responsável atual for o próprio admin logado
-- WITH CHECK → só permite salvar NULL (remover)
--              OU o próprio id do admin logado (nunca outro admin)
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
    AND (
      -- Aluno ainda sem responsável (qualquer admin pode pegar)
      assigned_to_admin_id IS NULL
      OR
      -- Aluno já atribuído ao próprio admin logado (pode editar/remover)
      assigned_to_admin_id = (
        SELECT id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1
      )
    )
  )
  WITH CHECK (
    -- Só pode salvar: NULL (remover atribuição) ou seu próprio id
    (
      assigned_to_admin_id IS NULL
      OR assigned_to_admin_id = (
        SELECT id FROM user_profiles WHERE user_id = auth.uid() LIMIT 1
      )
    )
  );
```

---

## ⚠️ Atenção: impacto em outras policies de UPDATE

Se existir outra policy de UPDATE em `user_profiles` que cobre operações como
arquivar alunos (`is_archived`), ela continuará funcionando normalmente — as
policies permissivas são combinadas com OR. Esta policy só bloqueia tentativas
de alterar `assigned_to_admin_id` para valores não permitidos.

Se quiser isolar a restrição apenas ao campo `assigned_to_admin_id`, verifique
se há outras policies de UPDATE ativas:

```sql
SELECT policyname, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'user_profiles' AND cmd = 'UPDATE';
```

---

## Checklist

- [ ] Policy antiga dropada com sucesso
- [ ] Nova policy criada com sucesso
- [ ] Testado: admin tenta atribuir aluno de outro admin → bloqueado
- [ ] Testado: admin atribui aluno sem responsável → funciona
- [ ] Testado: admin remove própria atribuição → funciona
