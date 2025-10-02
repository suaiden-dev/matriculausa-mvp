# 🔍 Análise do Banco de Dados - Erro AADSTS90023

## 📊 **Resultado da Análise via MCP Supabase**

### ✅ **Status dos Tokens Microsoft:**

**Conexão Microsoft encontrada:**
- **ID:** `baf8896e-5801-4dca-b494-b57093df5578`
- **Email:** `victurib@outlook.com`
- **Provider:** `microsoft`
- **Status:** `is_active: true` ✅
- **Access Token:** `PRESENTE` ✅ (JWT válido)
- **Refresh Token:** `PRESENTE` ✅ (Token válido)
- **Expiração:** `2025-10-01 23:30:00.96+00` ✅ (Válido até 23:30)
- **Última Atualização:** `2025-10-01 22:55:03.53021+00`

### 🎯 **Diagnóstico:**

#### ✅ **O que está FUNCIONANDO:**
1. **Refresh Token existe** - Não está vazio
2. **Access Token válido** - JWT bem formado
3. **Tokens não expiraram** - Válidos até 23:30
4. **Conta ativa** - `is_active: true`
5. **Configuração correta** - Provider Microsoft

#### ❌ **Possíveis Causas do Erro AADSTS90023:**

### 1. **🚨 Scope Incorreto na Renovação**
**Problema mais provável:**
```typescript
// ❌ ERRADO (pode causar AADSTS90023)
scope: 'User.Read Mail.Read Mail.ReadWrite Mail.Send offline_access'

// ✅ CORRETO para Web App
scope: 'https://graph.microsoft.com/.default'
```

### 2. **🔧 Headers Origin Problemáticos**
**Interceptador pode não estar funcionando:**
- Headers `Origin` ainda sendo enviados
- Interceptador não ativo
- Conflito com outras bibliotecas

### 3. **🏢 Configuração de Tenant**
**Problema com tenant específico:**
```typescript
// ❌ Pode causar problemas
authority: 'https://login.microsoftonline.com/your-tenant-id'

// ✅ Melhor para multilocatário
authority: 'https://login.microsoftonline.com/common'
```

### 4. **⚠️ Client Secret Incorreto**
**Verificar se está usando o valor correto:**
- Client Secret vs Client ID
- Valor expirado
- Configuração incorreta

## 🛠️ **Soluções Específicas:**

### **Solução 1: Verificar Scope na Renovação**
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

### **Solução 2: Verificar Interceptador**
```typescript
// Verificar se interceptador está ativo
import { activateFetchInterceptor, isInterceptorActive } from '../lib/utils/fetchInterceptor';

// Ativar se não estiver
if (!isInterceptorActive()) {
  activateFetchInterceptor();
  console.log('✅ Interceptador ativado');
}
```

### **Solução 3: Verificar Client Secret**
```bash
# Verificar se está usando o valor correto
echo $VITE_AZURE_CLIENT_SECRET
```

### **Solução 4: Verificar Configuração de Tenant**
```typescript
// Usar 'common' para multilocatário
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || 'common';
const authority = `https://login.microsoftonline.com/${tenantId}`;
```

## 🔍 **Próximos Passos:**

### **1. Testar Scope Correto:**
```typescript
// Testar com scope correto
const testScope = 'https://graph.microsoft.com/.default';
console.log('Testing with scope:', testScope);
```

### **2. Verificar Interceptador:**
```typescript
// Verificar se interceptador está funcionando
console.log('Interceptador ativo:', isInterceptorActive());
```

### **3. Testar em Modo Incógnito:**
- Abrir navegador em modo incógnito
- Testar conexão Microsoft
- Verificar se erro persiste

### **4. Verificar Logs do Console:**
```javascript
// Procurar por:
// - "AADSTS90023"
// - "Cross-origin token redemption"
// - "Origin header"
```

## 📋 **Checklist de Verificação:**

### **✅ Banco de Dados:**
- [x] Refresh token não está vazio
- [x] Access token não está expirado
- [x] Conta está marcada como ativa
- [x] Configuração Microsoft correta

### **❓ Código:**
- [ ] Scope correto: `https://graph.microsoft.com/.default`
- [ ] Interceptador ativo
- [ ] Headers Origin removidos
- [ ] Client secret correto

### **❓ Azure AD Portal:**
- [ ] Apenas URLs em "Web" (não SPA)
- [ ] Client secret válido
- [ ] Permissões corretas

## 🎯 **Conclusão:**

**O problema NÃO está no banco de dados!** 

Os tokens estão corretos e válidos. O erro AADSTS90023 está sendo causado por:

1. **Scope incorreto** na renovação (mais provável)
2. **Headers Origin** problemáticos
3. **Configuração de tenant** incorreta
4. **Client Secret** incorreto

**Próximo passo:** Verificar o código de renovação de tokens e garantir que está usando o scope correto: `https://graph.microsoft.com/.default`

## 🚨 **Ação Imediata:**

1. **Verificar scope na renovação**
2. **Ativar interceptador se não estiver**
3. **Testar em modo incógnito**
4. **Verificar logs do console**

O problema está na **configuração do código**, não nos dados do banco! 🎯
