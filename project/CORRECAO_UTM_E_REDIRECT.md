# 🔧 Correções Aplicadas: UTM Tracking e Redirecionamento

## 📋 Problemas Identificados

### 1. ❌ Erro 401 ao Salvar UTM (Não Persistia no Banco)
```
fitpynguasqqutuhzifx.supabase.co/rest/v1/utm_attributions:1 Failed to load resource: 401 ()
[Auth] ⚠️ Não foi possível salvar atribuição UTM
```

**Causa**: A função `persistUtmAttribution` era chamada ANTES do login automático estar completo. Nesse momento, o usuário recém-criado ainda não tinha sessão autenticada, então a política RLS bloqueava a inserção.

**Solução**: Mover a chamada de `persistUtmAttribution` para DEPOIS do login automático estar completo.

### 2. ❌ Não Redirecionava para Dashboard Após Registro
```
[AuthRedirect] ⚠️ Código de referência detectado, não redirecionando
```

**Causa**: O componente `AuthRedirect` verificava se havia `ref=` na URL e bloqueava TODO redirecionamento, inclusive o redirecionamento pós-registro.

**Solução**: Remover a verificação que bloqueava redirecionamento quando `ref=` estava presente.

---

## ✅ Correções Aplicadas

### Correção 1: `project/src/hooks/useAuth.tsx`

**ANTES** (linha 1024-1030):
```typescript
console.log('✅ [USEAUTH] SignUp bem-sucedido');
console.log('🔍 [USEAUTH] data.user:', data?.user);

// ✅ Persistir atribuição UTM se fornecida
if (data?.user && options?.utm) {
  await persistUtmAttribution(data.user.id, normalizedEmail, options.utm);
}

// ✅ REATIVADO: Auto-confirmar email para todos os alunos
```

**DEPOIS** (agora persistência UTM acontece após login):
```typescript
console.log('✅ [USEAUTH] SignUp bem-sucedido');
console.log('🔍 [USEAUTH] data.user:', data?.user);

// ✅ REATIVADO: Auto-confirmar email para todos os alunos
// ...
// (mais código de confirmação e login)
// ...
} else {
  console.log('✅ [USEAUTH] Login automático realizado com sucesso', loginData);
  
  // ✅ Persistir atribuição UTM após login bem-sucedido (com sessão autenticada)
  if (data?.user && options?.utm) {
    await persistUtmAttribution(data.user.id, normalizedEmail, options.utm);
  }
  
  // O onAuthStateChange vai detectar a mudança e atualizar o estado
}
```

### Correção 2: `project/src/components/AuthRedirect.tsx`

**ANTES** (linhas 132-137):
```typescript
// NÃO redirecionar se há código de referência na URL (usuário veio de link de referência)
const hasReferralCode = window.location.search.includes('ref=');
if (hasReferralCode) {
  console.log('[AuthRedirect] ⚠️ Código de referência detectado, não redirecionando');
  return;
}
```

**DEPOIS** (verificação removida):
```typescript
// Verificação removida - agora redireciona normalmente após registro
```

---

## 🧪 Como Testar Novamente

### Teste Completo:

1. **Limpe o banco de dados** (opcional - deletar usuário de teste anterior):
```sql
DELETE FROM utm_attributions WHERE email = 'seu-email-teste@example.com';
DELETE FROM user_profiles WHERE email = 'seu-email-teste@example.com';
-- Deletar do auth.users via Supabase Dashboard
```

2. **Acesse a URL com UTM e ref**:
```
http://localhost:5173/register?ref=BRANT&utm_source=brant&utm_medium=cpc&utm_campaign=spring2024&utm_content=ad_variant_a
```

3. **Preencha o formulário e registre-se**

4. **Verifique os Logs do Console**:
```javascript
// Deve aparecer:
✅ [USEAUTH] Login automático realizado com sucesso
[Auth] 📊 Persistindo atribuição UTM para usuário: <uuid>
✅ [Auth] Atribuição UTM salva com sucesso
📊 [AUTH] UTM parameters limpos do localStorage
```

5. **Deve redirecionar automaticamente** para `/student/dashboard`

6. **Verifique no Banco de Dados**:
```sql
SELECT * FROM utm_attributions 
WHERE utm_source = 'brant' 
ORDER BY created_at DESC 
LIMIT 1;
```

Deve retornar:
```
id: <uuid>
user_id: <uuid do usuário>
email: seu-email-teste@example.com
utm_source: brant
utm_medium: cpc
utm_campaign: spring2024
utm_content: ad_variant_a
landing_page: /register
last_touch_page: /register
captured_at: <timestamp>
created_at: <timestamp>
```

---

## 📊 Fluxo Corrigido

```
1. Usuário clica no link: 
   /register?ref=BRANT&utm_source=brant&utm_medium=cpc&...

2. Frontend captura:
   ✅ ref=BRANT → localStorage (sistema de comissão)
   ✅ utm_* → localStorage (analytics)

3. Usuário preenche formulário

4. Clica em "Registrar"

5. Backend (useAuth):
   ✅ SignUp → cria usuário
   ✅ Auto-confirmação de email
   ✅ Login automático → SESSÃO AUTENTICADA ✨
   ✅ Persistir UTM → agora funciona! (tem sessão)
   ✅ Criar perfil com ref=BRANT

6. Frontend (AuthRedirect):
   ✅ Detecta usuário autenticado em /register
   ✅ Redireciona para /student/dashboard (IMEDIATO)

7. Limpeza:
   ✅ Remove UTM do localStorage
   ✅ Remove ref do localStorage
```

---

## 🎯 Resultado Esperado

### ✅ O Que Deve Acontecer Agora:

1. **UTM salvo no banco** → Tabela `utm_attributions` com todos os dados
2. **Redirecionamento imediato** → Vai para dashboard sem delay
3. **Sem erros no console** → Nenhum erro 401 ou 404
4. **Sistema de comissão intacto** → `ref=BRANT` continua funcionando
5. **Dados completos** → Tanto UTM quanto referral code salvos

### 📈 Analytics Disponíveis:

Agora você pode fazer queries como:

```sql
-- Conversões por campanha
SELECT 
  utm_campaign,
  COUNT(*) as total_registros,
  COUNT(DISTINCT utm_content) as variantes_testadas
FROM utm_attributions
WHERE utm_source = 'brant'
GROUP BY utm_campaign
ORDER BY total_registros DESC;

-- Performance por meio
SELECT 
  utm_medium,
  COUNT(*) as conversoes,
  DATE_TRUNC('day', created_at) as dia
FROM utm_attributions
WHERE utm_source = 'brant'
GROUP BY utm_medium, dia
ORDER BY dia DESC;

-- ROI de anúncios específicos
SELECT 
  utm_content,
  COUNT(*) as conversoes
FROM utm_attributions
WHERE 
  utm_source = 'brant' 
  AND utm_campaign = 'spring2024'
GROUP BY utm_content
ORDER BY conversoes DESC;
```

---

## ⚠️ Importante

- **NÃO remover `ref=BRANT`** dos links → sistema de comissões depende disso
- **Sempre incluir `utm_source=brant`** → para o sistema detectar e salvar
- **Os dois sistemas são independentes** → não se interferem
- **Falha de UTM é silenciosa** → se der erro, não quebra o registro do usuário
- **Políticas RLS OK** → permite inserção quando há sessão autenticada

---

## 🔍 Debugging

Se ainda houver problemas:

1. **Verifique os logs do console** - procure por erros 401 ou 404
2. **Verifique localStorage** antes do registro:
   ```javascript
   localStorage.getItem('matriculausa:utm-attribution')
   localStorage.getItem('pending_referral_code')
   ```
3. **Verifique a sessão** após login:
   ```javascript
   (await supabase.auth.getSession()).data.session
   ```
4. **Verifique as políticas RLS** da tabela `utm_attributions`:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'utm_attributions';
   ```

---

**Data da Correção**: 25/11/2025  
**Arquivos Modificados**:
- `project/src/hooks/useAuth.tsx`
- `project/src/components/AuthRedirect.tsx`

