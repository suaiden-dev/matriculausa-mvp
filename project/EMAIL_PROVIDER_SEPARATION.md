# Separação de Provedores de Email

## 🔍 **Problema Identificado:**

O erro `AADSTS90023` estava acontecendo porque:
- ❌ **Conta Gmail** (`crashroiali0@gmail.com`) estava sendo processada pelo **Microsoft Graph**
- ❌ **Microsoft Graph** não funciona com contas Gmail
- ❌ **Sistema tentando renovar tokens Microsoft** para conta Gmail

## 📧 **Tipos de Contas de Email:**

### **Gmail (Google):**
- ✅ **Domínios**: `@gmail.com`, `@googlemail.com`
- ✅ **API**: Gmail API (Google)
- ✅ **Componente**: `GmailInbox.tsx`
- ✅ **Hook**: `useGmailConnection`

### **Microsoft:**
- ✅ **Domínios**: `@outlook.com`, `@hotmail.com`, `@live.com`, `@microsoft.com`
- ✅ **API**: Microsoft Graph API
- ✅ **Componente**: `MicrosoftInbox.tsx`
- ✅ **Hook**: `useMicrosoftConnection`

## 🛠️ **Solução Implementada:**

### **Verificação de Domínio:**
```typescript
// Verificar se é uma conta Microsoft (não Gmail)
if (!activeConnection.email_address.includes('@outlook.com') && 
    !activeConnection.email_address.includes('@hotmail.com') && 
    !activeConnection.email_address.includes('@live.com') &&
    !activeConnection.email_address.includes('@microsoft.com')) {
  throw new Error('Esta não é uma conta Microsoft. Use contas @outlook.com, @hotmail.com, @live.com ou @microsoft.com');
}
```

### **Separação de Componentes:**
- **Gmail**: Use `/school/dashboard/inbox` (GmailInbox)
- **Microsoft**: Use `/school/dashboard/microsoft-email` (MicrosoftInbox)

## 🎯 **Como Usar Corretamente:**

### **Para Contas Gmail:**
1. Vá para `/school/dashboard/email/management`
2. Clique em **"Gmail"**
3. Conecte sua conta `@gmail.com`
4. Use `/school/dashboard/inbox` para acessar

### **Para Contas Microsoft:**
1. Vá para `/school/dashboard/email/management`
2. Clique em **"Microsoft"**
3. Conecte sua conta `@outlook.com` ou `@hotmail.com`
4. Use `/school/dashboard/microsoft-email` para acessar

## ✅ **Resultado Esperado:**

- ✅ **Gmail funciona** com Gmail API
- ✅ **Microsoft funciona** com Microsoft Graph
- ✅ **Sem conflitos** entre provedores
- ✅ **Erros claros** quando usar conta errada
- ✅ **Seletor de contas** funciona corretamente

## 🚨 **Importante:**

- **Não misture** contas Gmail com Microsoft
- **Use o componente correto** para cada provedor
- **Verifique o domínio** antes de conectar
- **Erros são esperados** se usar conta errada

## 🔧 **Debug:**

Se ainda houver problemas:
1. **Verifique o domínio** da conta
2. **Use o componente correto** para o provedor
3. **Reconecte a conta** se necessário
4. **Verifique os logs** no console
