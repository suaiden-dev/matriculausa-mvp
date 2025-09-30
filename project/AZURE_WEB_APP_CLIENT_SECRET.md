# Configuração de Client Secret para Aplicações Web Azure AD

## 🔑 **Problema Identificado:**

O erro `AADSTS90023` ocorre porque:
- ✅ **Azure AD configurado como "Web"** (correto)
- ❌ **Falta o client_secret** para renovação de tokens
- ❌ **Variável de ambiente incorreta** no código

## 🛠️ **Solução:**

### 1. **Configurar Client Secret no Azure AD:**

1. **No Portal do Azure:**
   - Vá para sua aplicação
   - Clique em **"Certificados e segredos"**
   - Clique em **"Novo segredo do cliente"**
   - Adicione uma descrição (ex: "Matricula USA Web App")
   - Escolha validade (recomendo 24 meses)
   - Clique em **"Adicionar"**
   - **COPIE O VALOR** (você só verá uma vez!)

### 2. **Adicionar ao arquivo .env:**

```env
# Microsoft Azure App Registration
VITE_AZURE_CLIENT_ID=your_client_id_here
VITE_AZURE_CLIENT_SECRET=your_client_secret_here
VITE_AZURE_REDIRECT_URI=https://staging-matriculausa.netlify.app/microsoft-email

# Para desenvolvimento local
# VITE_AZURE_REDIRECT_URI=http://localhost:5173/microsoft-email
```

### 3. **Verificar Configuração Azure AD:**

No Portal do Azure, certifique-se de que:

#### **Tipo de Aplicação:**
- ✅ **Web** (correto)

#### **URIs de Redirecionamento:**
```
https://staging-matriculausa.netlify.app/microsoft-email
http://localhost:5173/microsoft-email
```

#### **Concessão Implícita:**
- ✅ **Tokens de acesso**
- ✅ **Tokens de ID**

#### **Permissões:**
- ✅ **User.Read**
- ✅ **Mail.Read**
- ✅ **Mail.Send**
- ✅ **Mail.ReadWrite**
- ✅ **offline_access**

## 🔄 **Como Funciona Agora:**

### **Fluxo de Autenticação Web:**
1. **Usuário clica "Conectar Microsoft"**
2. **Redirecionamento para Azure AD**
3. **Usuário autoriza a aplicação**
4. **Azure AD retorna código de autorização**
5. **Aplicação troca código por tokens** (access + refresh)
6. **Tokens são armazenados no Supabase**

### **Renovação de Tokens:**
1. **Token expira** (normal após algumas horas)
2. **Sistema detecta expiração**
3. **Usa refresh_token + client_secret**
4. **Obtém novos tokens automaticamente**
5. **Atualiza tokens no Supabase**

## ✅ **Resultado Esperado:**

- ✅ **Login funciona** sem erros
- ✅ **Tokens são renovados** automaticamente
- ✅ **Seletor de contas** funciona corretamente
- ✅ **Sidebar sincroniza** com conta selecionada
- ✅ **Sem necessidade de reconectar** constantemente

## 🚨 **Importante:**

- **Client Secret é sensível** - não commite no Git
- **Renove o secret** antes de expirar
- **Use diferentes secrets** para dev/prod
- **Monitore logs** para detectar problemas

## 🔍 **Debug:**

Se ainda houver problemas, verifique:
1. **Client Secret está correto** no .env
2. **Permissões foram concedidas** no Azure AD
3. **URIs de redirecionamento** estão corretos
4. **Console do navegador** para erros específicos
