# 🚨 Solução para URLs Duplicadas no Azure AD Portal

## 🎯 **Problema Identificado:**

O erro **AADSTS90023** acontece quando a **mesma URL** está configurada em **múltiplos tipos de aplicação** no Azure AD Portal.

## 🔍 **Como Verificar:**

### 1. **Acesse o Portal do Azure AD:**
1. Vá para sua aplicação
2. Clique em **"Authentication"**
3. Verifique as seções:
   - **"Web"** (para aplicações com client_secret)
   - **"Single-page application"** (para aplicações sem client_secret)

### 2. **Procure por URLs Duplicadas:**
```
❌ PROBLEMA: Mesma URL em ambos os tipos
✅ SOLUÇÃO: URL apenas no tipo correto
```

## 🛠️ **Solução Passo a Passo:**

### **Passo 1: Identificar o Tipo Correto**

#### **Se você tem Client Secret configurado:**
- ✅ **Tipo:** Web
- ✅ **URLs:** Apenas em "Web"
- ❌ **NÃO:** Em "Single-page application"

#### **Se você NÃO tem Client Secret:**
- ✅ **Tipo:** Single-page application
- ✅ **URLs:** Apenas em "SPA"
- ❌ **NÃO:** Em "Web"

### **Passo 2: Remover URLs Duplicadas**

#### **Para Aplicações Web (com client_secret):**
1. **Mantenha em "Web":**
   ```
   https://staging-matriculausa.netlify.app/microsoft-email
   http://localhost:5173/microsoft-email
   https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-auth-callback
   ```

2. **Remova de "Single-page application":**
   - Delete todas as URLs da seção "Single-page application"
   - Mantenha apenas em "Web"

#### **Para Aplicações SPA (sem client_secret):**
1. **Mantenha em "Single-page application":**
   ```
   https://staging-matriculausa.netlify.app/microsoft-email
   http://localhost:5173/microsoft-email
   ```

2. **Remova de "Web":**
   - Delete todas as URLs da seção "Web"
   - Mantenha apenas em "Single-page application"

### **Passo 3: Configurações Adicionais**

#### **Para Aplicações Web:**
- ✅ **Concessão Implícita:**
  - Tokens de acesso
  - Tokens de ID
- ✅ **Client Secret:** Configurado
- ✅ **Tipos de Conta:** Multilocatário

#### **Para Aplicações SPA:**
- ✅ **Concessão Implícita:**
  - Tokens de acesso
  - Tokens de ID
- ❌ **Client Secret:** NÃO configurado
- ✅ **Tipos de Conta:** Multilocatário

## 🔧 **Verificação Final:**

### **1. No Azure AD Portal:**
- [ ] Apenas UM tipo de aplicação tem as URLs
- [ ] URLs corretas para seu ambiente
- [ ] Concessão implícita configurada
- [ ] Client Secret (se aplicável)

### **2. No Código:**
- [ ] Variáveis de ambiente corretas
- [ ] Client Secret configurado (se Web App)
- [ ] Redirect URI correto

### **3. Teste:**
- [ ] Recarregue a página
- [ ] Tente conectar novamente
- [ ] Verifique se erro AADSTS90023 desapareceu

## 📋 **URLs Recomendadas:**

### **Produção:**
```
https://staging-matriculausa.netlify.app/microsoft-email
https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-auth-callback
```

### **Desenvolvimento:**
```
http://localhost:5173/microsoft-email
http://localhost:8888/microsoft-email
```

## 🚨 **Erros Comuns:**

### **❌ Configuração Incorreta:**
- URL em ambos os tipos (Web + SPA)
- Client Secret sem URLs em "Web"
- URLs em "SPA" com Client Secret

### **✅ Configuração Correta:**
- URL apenas no tipo correto
- Client Secret com URLs em "Web"
- URLs em "SPA" sem Client Secret

## 🎯 **Resultado Esperado:**

Após corrigir as URLs duplicadas:
- ✅ Erro AADSTS90023 desaparece
- ✅ Renovação de tokens funciona
- ✅ Autenticação Microsoft funciona
- ✅ Sem conflitos de tipos de aplicação

## 🔍 **Diagnóstico Automático:**

Use o componente `AzureADConfigDiagnostic` para verificar automaticamente:
```tsx
import AzureADConfigDiagnostic from '../components/AzureADConfigDiagnostic';

<AzureADConfigDiagnostic />
```

## 📞 **Se o Problema Persistir:**

1. **Verifique novamente** as URLs no Azure AD Portal
2. **Aguarde alguns minutos** para propagação
3. **Limpe o cache** do navegador
4. **Teste em modo incógnito**
5. **Verifique os logs** do console

O problema de URLs duplicadas é a causa mais comum do erro AADSTS90023! 🎯
