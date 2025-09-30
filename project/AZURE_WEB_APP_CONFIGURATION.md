# Configuração Azure AD para Aplicações Web

## Configuração Correta no Portal do Azure

### 1. **Tipo de Aplicação: Web** ✅
- No Portal do Azure, certifique-se de que sua aplicação está configurada como **Web** (não SPA)
- Isso é correto para aplicações web tradicionais que usam fluxo de código de autorização

### 2. **URIs de Redirecionamento Configurados**
```
https://staging-matriculausa.netlify.app/microsoft-email
http://localhost:8888/microsoft-email
http://localhost:5173/microsoft-email
https://fitpynguasqqutuhzifx.supabase.co/functions/v1/microsoft-auth-callback
```

### 3. **Concessão Implícita e Fluxos Híbridos**
Para aplicações **Web**, você deve selecionar:
- ✅ **Tokens de acesso** (usados para fluxos implícitos)
- ✅ **Tokens de ID** (usados para fluxos implícitos e híbridos)

### 4. **Tipos de Conta com Suporte**
- ✅ **Contas em qualquer diretório organizacional** (qualquer locatário do Microsoft Entra ID - multilocatário) 
- ✅ **Contas pessoais da Microsoft** (por exemplo, Skype, Xbox)

### 5. **Configurações Avançadas**
- ✅ **Suporte ao Live SDK**: Sim
- ✅ **Permitir fluxos de cliente público**: Sim

## Variáveis de Ambiente Necessárias

Adicione ao seu arquivo `.env`:

```env
# Microsoft Azure App Registration
VITE_AZURE_CLIENT_ID=your_client_id_here
VITE_AZURE_REDIRECT_URI=https://staging-matriculausa.netlify.app/microsoft-email

# Para desenvolvimento local
# VITE_AZURE_REDIRECT_URI=http://localhost:5173/microsoft-email
```

## Como Funciona Agora

### 1. **Fluxo de Autenticação Web**
- Usuário clica em "Conectar Microsoft"
- Redirecionamento para `login.microsoftonline.com`
- Usuário faz login e autoriza a aplicação
- Microsoft redireciona de volta para `/microsoft-email`
- Aplicação processa o código de autorização
- Tokens são obtidos e armazenados

### 2. **Renovação de Tokens**
- O sistema usa refresh tokens para renovar access tokens automaticamente
- Quando o refresh token expira, o usuário precisa reconectar

### 3. **Tratamento de Erros**
- Tokens expirados são detectados automaticamente
- Contas são marcadas como desconectadas
- Usuário recebe notificação clara para reconectar

## Solução de Problemas

### Erro AADSTS90023
- **Causa**: Aplicação configurada como SPA mas usando fluxos Web
- **Solução**: ✅ Já corrigido - usando configuração Web

### Múltiplas Instâncias do Supabase
- **Causa**: Criação de múltiplas instâncias do cliente Supabase
- **Solução**: ✅ Já corrigido - usando instância única

### Tokens Expirados
- **Causa**: Refresh tokens expirados ou inválidos
- **Solução**: ✅ Sistema detecta automaticamente e solicita reconexão

## Próximos Passos

1. **Teste a reconexão**: Vá para `/school/dashboard/email/management` e reconecte suas contas Microsoft
2. **Verifique os logs**: O console deve mostrar mensagens mais claras sobre o status da autenticação
3. **Teste o seletor de contas**: Agora deve funcionar corretamente sem inversão

## Configuração de Produção

Para produção, certifique-se de que:
- O URI de redirecionamento de produção está configurado no Azure AD
- As variáveis de ambiente estão configuradas corretamente
- O domínio de produção está na lista de URIs de redirecionamento
