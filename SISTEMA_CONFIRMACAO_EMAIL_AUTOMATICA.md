# Sistema de Confirmação Automática de Email para Alunos

## 📋 Resumo

Quando um aluno se registra no Matricula USA, o sistema **automaticamente confirma o email** e faz o **login direto**, permitindo que o aluno entre na plataforma imediatamente sem precisar clicar em nenhum link de confirmação.

---

## 🔄 Fluxo Completo

### 1. **Registro do Aluno**
```
Aluno preenche formulário → Clica em "Registrar"
```

### 2. **Criação do Usuário no Supabase Auth**
- O sistema cria o usuário em `auth.users` via `supabase.auth.signUp()`
- O usuário é criado com `role: 'student'` nos metadados
- **Neste momento, o email ainda NÃO está confirmado**

### 3. **Trigger Automático no Banco de Dados**
- Um **trigger** (`handle_new_user`) é executado automaticamente quando um novo usuário é criado
- Este trigger cria automaticamente um registro na tabela `user_profiles`
- O perfil é criado com status `'active'` e role `'student'`

### 4. **Confirmação Automática de Email**
- O sistema detecta que é um aluno (`role === 'student'`)
- Chama uma **Edge Function** chamada `auto-confirm-student-email`
- Esta função usa a **Admin API do Supabase** para confirmar o email automaticamente

### 5. **Login Automático**
- Após confirmar o email, o sistema faz **login automático** do aluno
- O aluno é redirecionado para o dashboard

---

## 🔧 Implementação Técnica

### Frontend - Hook `useAuth.tsx`

**Arquivo**: `project/src/hooks/useAuth.tsx`

```typescript
// 1. Criar usuário
const { data, error } = await supabase.auth.signUp({
  email: normalizedEmail,
  password: password,
  options: {
    data: {
      role: 'student',
      full_name: userData.full_name,
      // ... outros dados
    }
  }
});

// 2. Se for aluno, auto-confirmar email
if (data?.user && userData.role === 'student') {
  // Verificar se NÃO é registro de vendedor
  if (!isSellerRegistration) {
    // Chamar Edge Function para confirmar email
    await supabase.functions.invoke('auto-confirm-student-email', {
      body: {
        userId: data.user.id,
        role: userData.role
      }
    });
    
    // Fazer login automático após confirmação
    await supabase.auth.signInWithPassword({
      email: normalizedEmail,
      password: password
    });
  }
}
```

### Backend - Edge Function

**Arquivo**: `project/supabase/functions/auto-confirm-student-email/index.ts`

```typescript
Deno.serve(async (req) => {
  const { userId, role } = await req.json();
  
  // Verificar se é aluno
  if (role !== 'student') {
    return new Response(JSON.stringify({ 
      error: 'Auto-confirmation only for students' 
    }), { status: 400 });
  }
  
  // Criar cliente admin (com Service Role Key)
  const supabaseAdmin = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
  );
  
  // Confirmar email usando Admin API
  const { data, error } = await supabaseAdmin.auth.admin.updateUserById(userId, {
    email_confirm: true  // ✅ Confirma o email automaticamente
  });
  
  return new Response(JSON.stringify({ success: true, user: data.user }));
});
```

### Banco de Dados - Trigger

**Arquivo**: `supabase/migrations/20250122000001_add_handle_new_user_trigger.sql`

```sql
-- Função que cria perfil automaticamente quando usuário é criado
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Criar perfil na tabela user_profiles
  INSERT INTO public.user_profiles (
    user_id,
    full_name,
    phone,
    status,
    role,
    affiliate_code,
    seller_referral_code,
    -- ... outros campos
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    'active',
    COALESCE(NEW.raw_user_meta_data->>'role', 'student'),
    -- ... outros valores
    NOW(),
    NOW()
  );
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger que executa a função quando novo usuário é criado
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

---

## ⚠️ Exceções e Regras

### ❌ NÃO confirma automaticamente se:
1. **Registro de vendedor**: Se o usuário tem `seller_referral_code` E está em `seller_registrations` com status `'pending'`
2. **Role diferente de 'student'**: Apenas alunos têm confirmação automática
3. **Registro feito por staff**: Se um admin/seller registra um aluno, não faz login automático (restaura sessão do staff)

### ✅ Confirma automaticamente se:
1. **Role é 'student'**
2. **NÃO é registro de vendedor**
3. **NÃO é registro feito por staff** (ou se for, não faz login automático)

---

## 📊 Fluxo Visual

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Aluno preenche formulário e clica em "Registrar"        │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. supabase.auth.signUp()                                   │
│    - Cria usuário em auth.users                              │
│    - Email ainda NÃO confirmado                              │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. Trigger handle_new_user() (automático)                    │
│    - Cria registro em user_profiles                         │
│    - Status: 'active', Role: 'student'                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 4. Verifica se role === 'student'                           │
│    E se NÃO é registro de vendedor                           │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 5. Chama Edge Function: auto-confirm-student-email           │
│    - Usa Admin API (Service Role Key)                       │
│    - Atualiza email_confirm = true                          │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 6. Login automático                                          │
│    - supabase.auth.signInWithPassword()                     │
│    - Aluno entra direto na plataforma                      │
└────────────────────┬────────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────────┐
│ 7. Redirecionamento para Dashboard                          │
│    - Aluno já está logado e pode usar a plataforma          │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔑 Pontos Importantes

### 1. **Service Role Key**
- A Edge Function usa `SUPABASE_SERVICE_ROLE_KEY` para ter permissões de admin
- Isso permite confirmar o email sem precisar que o usuário clique em link

### 2. **Trigger Automático**
- O trigger `handle_new_user` roda **automaticamente** no banco de dados
- Não precisa chamar manualmente - é executado pelo PostgreSQL

### 3. **Segurança**
- Apenas alunos têm confirmação automática
- Vendedores precisam confirmar email manualmente (fluxo diferente)
- Universidades também precisam confirmar email manualmente

### 4. **Experiência do Usuário**
- Aluno se registra → entra direto na plataforma
- Não precisa verificar email
- Não precisa clicar em link de confirmação
- Experiência mais fluida e rápida

---

## 📚 Arquivos Relacionados

- **Frontend**: `project/src/hooks/useAuth.tsx` (função `register`)
- **Edge Function**: `project/supabase/functions/auto-confirm-student-email/index.ts`
- **Trigger**: `supabase/migrations/20250122000001_add_handle_new_user_trigger.sql`
- **Página de Registro**: `project/src/pages/Auth.tsx`

---

## ✅ Resumo Final

1. **Aluno se registra** → `supabase.auth.signUp()`
2. **Trigger cria perfil** → `handle_new_user()` (automático)
3. **Sistema detecta aluno** → `role === 'student'`
4. **Edge Function confirma email** → `auto-confirm-student-email` (usa Admin API)
5. **Login automático** → `signInWithPassword()`
6. **Aluno entra direto** → Dashboard

**Resultado**: Aluno se registra e entra na plataforma imediatamente, sem precisar confirmar email! 🎉











