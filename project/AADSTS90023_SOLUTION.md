# 🔧 Solução para Erro AADSTS90023 - Cross-origin token redemption

## 🚨 **Problema Identificado:**

O erro `AADSTS90023: Cross-origin token redemption is permitted only for the Single-Page Application client-type` ocorre quando:

1. **Aplicação registrada como "Web" no Azure AD** mas tentando usar fluxos de SPA
2. **URLs duplicadas** entre configurações "Web" e "Single-page application"
3. **Headers Origin problemáticos** sendo enviados nas requisições
4. **Falta de client_secret** para aplicações Web

## ✅ **Soluções Implementadas:**

### 1. **Interceptador de Fetch Automático**
- ✅ Remove headers `Origin` problemáticos automaticamente
- ✅ Aplica headers corretos para Web App flow
- ✅ Ativado automaticamente no `GraphService`

### 2. **Scope Correto para Web App**
- ✅ Mudança de `User.Read Mail.Read...` para `https://graph.microsoft.com/.default`
- ✅ Compatível com aplicações Web registradas no Azure AD

### 3. **Diagnóstico Automático**
- ✅ Componente `MicrosoftAuthDiagnostic` para identificar problemas
- ✅ Verificação de variáveis de ambiente
- ✅ Limpeza automática de cache MSAL

### 4. **Tratamento de Erros Específico**
- ✅ Detecção automática do erro AADSTS90023
- ✅ Mensagens de erro explicativas
- ✅ Sugestões de correção

## 🛠️ **Configuração Necessária:**

### 1. **No Portal do Azure AD:**

#### **Tipo de Aplicação:**
- ✅ **Web** (correto para aplicações com client_secret)

#### **URIs de Redirecionamento:**
```
https://staging-matriculausa.netlify.app/microsoft-email
http://localhost:5173/microsoft-email
```

#### **Concessão Implícita:**
- ✅ **Tokens de acesso**
- ✅ **Tokens de ID**

#### **Client Secret:**
- ✅ Criar um "Segredo do cliente" em "Certificados e segredos"
- ✅ Copiar o valor (só aparece uma vez!)

### 2. **Variáveis de Ambiente (.env):**

```env
# Microsoft Azure App Registration
VITE_AZURE_CLIENT_ID=your_client_id_here
VITE_AZURE_CLIENT_SECRET=your_client_secret_here
VITE_AZURE_REDIRECT_URI=https://staging-matriculausa.netlify.app/microsoft-email

# Para desenvolvimento local
# VITE_AZURE_REDIRECT_URI=http://localhost:5173/microsoft-email
```

## 🔄 **Como Usar:**

### 1. **Ativação Automática:**
O interceptador é ativado automaticamente quando o `GraphService` é inicializado.

### 2. **Diagnóstico Manual:**
```tsx
import MicrosoftAuthDiagnostic from '../components/MicrosoftAuthDiagnostic';

// No seu componente
<MicrosoftAuthDiagnostic />
```

### 3. **Limpeza de Cache:**
```typescript
import { clearMsalCache } from '../lib/utils/fetchInterceptor';

// Limpar cache MSAL
clearMsalCache();
```

## 🚀 **Fluxo de Renovação Corrigido:**

### **Antes (Problemático):**
1. Token expira
2. Tentativa de renovação com headers Origin
3. Erro AADSTS90023
4. Falha na renovação

### **Depois (Corrigido):**
1. Token expira
2. Interceptador remove headers Origin
3. Renovação com scope correto
4. ✅ Sucesso na renovação

## 📊 **Monitoramento:**

### **Logs de Sucesso:**
```
✅ Token renewed successfully via refresh token
✅ Fetch interceptor ativado
✅ Cache MSAL limpo
```

### **Logs de Erro (com diagnóstico):**
```
🚨 Erro AADSTS90023 detectado!
💡 Solução: Verificar configuração Azure AD
🔧 Verifique se não há URLs duplicadas entre Web e SPA
```

## 🔍 **Verificação de Configuração:**

### **1. Portal do Azure AD:**
- [ ] Aplicação configurada como "Web"
- [ ] Client Secret criado
- [ ] URLs de redirecionamento corretas
- [ ] Sem URLs duplicadas entre Web e SPA

### **2. Variáveis de Ambiente:**
- [ ] `VITE_AZURE_CLIENT_ID` configurado
- [ ] `VITE_AZURE_CLIENT_SECRET` configurado
- [ ] `VITE_AZURE_REDIRECT_URI` configurado

### **3. Aplicação:**
- [ ] Interceptador ativado
- [ ] Cache MSAL limpo
- [ ] Sem instâncias MSAL duplicadas

## 🆘 **Resolução de Problemas:**

### **Se o erro persistir:**

1. **Limpe o cache completamente:**
   ```typescript
   clearMsalCache();
   localStorage.clear();
   sessionStorage.clear();
   ```

2. **Recarregue a página:**
   ```javascript
   window.location.reload();
   ```

3. **Verifique a configuração Azure AD:**
   - Remova URLs duplicadas
   - Certifique-se de que é "Web" (não SPA)
   - Verifique se o Client Secret está correto

4. **Use o componente de diagnóstico:**
   ```tsx
   <MicrosoftAuthDiagnostic />
   ```

## 📈 **Melhorias Implementadas:**

- ✅ **Interceptador automático** - Remove headers problemáticos
- ✅ **Scope correto** - Compatível com Web App flow
- ✅ **Diagnóstico integrado** - Identifica problemas automaticamente
- ✅ **Limpeza de cache** - Remove conflitos MSAL
- ✅ **Tratamento de erros** - Mensagens explicativas
- ✅ **Configuração centralizada** - Fácil manutenção

## 🎯 **Resultado Esperado:**

Após implementar essas correções, o sistema deve:
- ✅ Renovar tokens automaticamente
- ✅ Não apresentar erro AADSTS90023
- ✅ Funcionar corretamente com Web App flow
- ✅ Manter sessões ativas por mais tempo
- ✅ Fornecer diagnóstico claro de problemas
