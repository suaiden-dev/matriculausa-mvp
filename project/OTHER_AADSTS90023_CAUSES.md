# 🔍 Outras Possíveis Causas do Erro AADSTS90023

## 🎯 **Se você já apagou tudo do SPA no Azure AD Portal:**

O erro AADSTS90023 pode ter **outras causas** além de URLs duplicadas. Vamos investigar:

## 🔍 **Possíveis Causas Restantes:**

### 1. **Refresh Token Vazio no Banco de Dados** 🚨
**Problema mais comum quando URLs não estão duplicadas:**

```sql
-- Verificar se refresh token está vazio
SELECT oauth_refresh_token, oauth_access_token, oauth_token_expires_at 
FROM email_configurations 
WHERE provider_type = 'microsoft' AND is_active = true;
```

**Se `oauth_refresh_token` estiver vazio:**
- ❌ Sistema não consegue renovar tokens
- ❌ Erro AADSTS90023 pode aparecer
- ✅ **Solução:** Desconectar e reconectar a conta Microsoft

### 2. **Scope Incorreto na Renovação** ⚠️
**Scope errado pode causar o erro:**

```typescript
// ❌ ERRADO (pode causar AADSTS90023)
scope: 'User.Read Mail.Read Mail.ReadWrite Mail.Send offline_access'

// ✅ CORRETO para Web App
scope: 'https://graph.microsoft.com/.default'
```

### 3. **Headers Origin Problemáticos** 🔧
**Mesmo com interceptador, pode haver problemas:**

```typescript
// Verificar se interceptador está ativo
console.log('Interceptador ativo:', isInterceptorActive());

// Verificar se headers Origin estão sendo removidos
// Deve aparecer no console: "✅ Fetch interceptor ativado"
```

### 4. **Configuração de Tenant Incorreta** 🏢
**Problemas com configuração de tenant:**

```typescript
// ❌ Pode causar problemas
authority: 'https://login.microsoftonline.com/your-tenant-id'

// ✅ Melhor para multilocatário
authority: 'https://login.microsoftonline.com/common'
```

### 5. **Refresh Token Expirado ou Revogado** ⏰
**Refresh token pode ter expirado:**

```typescript
// Verificar se refresh token ainda é válido
if (refreshTokenExpired) {
  // Usuário precisa reconectar
  console.log('Refresh token expirado - reconexão necessária');
}
```

## 🛠️ **Soluções Específicas:**

### **Solução 1: Verificar Refresh Token no Banco**
```sql
-- Verificar se refresh token está vazio
SELECT 
  email_address,
  oauth_refresh_token,
  oauth_token_expires_at,
  is_active
FROM email_configurations 
WHERE provider_type = 'microsoft';
```

**Se estiver vazio:**
1. Desconectar conta Microsoft
2. Reconectar conta Microsoft
3. Verificar se novo refresh token foi salvo

### **Solução 2: Verificar Scope na Renovação**
```typescript
// No TokenManager.ts - verificar se está usando scope correto
const params = new URLSearchParams({
  client_id: config.clientId,
  client_secret: config.clientSecret,
  refresh_token: this.refreshToken,
  grant_type: 'refresh_token',
  scope: 'https://graph.microsoft.com/.default' // ✅ CORRETO
});
```

### **Solução 3: Verificar Interceptador**
```typescript
// Verificar se interceptador está ativo
import { activateFetchInterceptor, isInterceptorActive } from '../lib/utils/fetchInterceptor';

// Ativar se não estiver
if (!isInterceptorActive()) {
  activateFetchInterceptor();
  console.log('✅ Interceptador ativado');
}
```

### **Solução 4: Verificar Configuração de Tenant**
```typescript
// Usar 'common' para multilocatário
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || 'common';
const authority = `https://login.microsoftonline.com/${tenantId}`;
```

## 🔍 **Diagnóstico Automático:**

Use o componente `AdvancedAzureADDiagnostic` para verificar automaticamente:

```tsx
import AdvancedAzureADDiagnostic from '../components/AdvancedAzureADDiagnostic';

<AdvancedAzureADDiagnostic />
```

## 📋 **Checklist de Verificação:**

### **1. Banco de Dados:**
- [ ] Refresh token não está vazio
- [ ] Access token não está expirado
- [ ] Conta está marcada como ativa

### **2. Configuração:**
- [ ] Scope correto: `https://graph.microsoft.com/.default`
- [ ] Client secret configurado
- [ ] Interceptador ativo

### **3. Azure AD Portal:**
- [ ] Apenas URLs em "Web" (não SPA)
- [ ] Client secret válido
- [ ] Permissões corretas

### **4. Código:**
- [ ] Sem referências MSAL/SPA
- [ ] Usando Web App flow
- [ ] Headers Origin removidos

## 🚨 **Se Nada Funcionar:**

### **Última Solução:**
1. **Desconectar completamente** a conta Microsoft
2. **Limpar cache** do navegador
3. **Reconectar** a conta Microsoft
4. **Verificar** se novo refresh token foi salvo

### **Verificação Final:**
```sql
-- Após reconectar, verificar se refresh token foi salvo
SELECT oauth_refresh_token, oauth_access_token, oauth_token_expires_at 
FROM email_configurations 
WHERE provider_type = 'microsoft' AND is_active = true;
```

## 🎯 **Resultado Esperado:**

Após aplicar as soluções:
- ✅ Refresh token salvo no banco
- ✅ Scope correto na renovação
- ✅ Interceptador ativo
- ✅ Erro AADSTS90023 desaparece
- ✅ Renovação de tokens funciona

## 📞 **Se o Problema Persistir:**

1. **Verifique os logs** do console
2. **Use o diagnóstico avançado**
3. **Verifique se refresh token foi salvo**
4. **Teste em modo incógnito**
5. **Verifique se não há conflitos de cache**

O problema de **refresh token vazio** é a segunda causa mais comum do erro AADSTS90023! 🎯
