# Google OAuth Localhost Fix

## Problema
Quando você adiciona sua conta do Google no ambiente local (localhost), o sistema redireciona para o projeto em produção (matriculausa) em vez de manter no localhost.

## Solução Implementada

### 1. Forçar Apenas Ambiente de Desenvolvimento
O sistema agora **FORÇA** apenas o ambiente de desenvolvimento (localhost:5173), ignorando completamente produção:

```typescript
// FORÇAR APENAS DESENVOLVIMENTO - IGNORAR PRODUÇÃO COMPLETAMENTE
console.log('🔧 FORCING DEVELOPMENT ENVIRONMENT ONLY: http://localhost:5173');
return 'http://localhost:5173';
```

### 2. Arquivos Modificados
- `src/components/EmailConnectionManager.tsx`: Detecção de ambiente para Google e Microsoft OAuth
- `src/pages/EmailOAuthCallback.tsx`: Detecção de ambiente no callback

## Configuração do Google Cloud Console

### Para Desenvolvimento (Localhost)
1. Acesse o [Google Cloud Console](https://console.cloud.google.com/)
2. Vá para "APIs & Services" > "Credentials"
3. Edite seu OAuth 2.0 Client ID
4. Em "Authorized redirect URIs", adicione:
   ```
   http://localhost:5173/email-oauth-callback
   http://127.0.0.1:5173/email-oauth-callback
   ```

### Para Produção
1. No mesmo OAuth 2.0 Client ID
2. Em "Authorized redirect URIs", adicione:
   ```
   https://matriculausa.com/email-oauth-callback
   https://www.matriculausa.com/email-oauth-callback
   ```

### ⚠️ IMPORTANTE: Configuração Adicional
Se ainda estiver redirecionando para produção, verifique também:

1. **Authorized JavaScript origins**:
   - Adicione: `http://localhost:5173`
   - Adicione: `https://matriculausa.com`

2. **Authorized redirect URIs** (verifique se não há espaços extras):
   ```
   http://localhost:5173/email-oauth-callback
   https://matriculausa.com/email-oauth-callback
   ```

3. **Limpe o cache do navegador** após fazer as alterações

## URLs de Redirecionamento Suportadas

### Desenvolvimento
- `http://localhost:5173/email-oauth-callback`
- `http://127.0.0.1:5173/email-oauth-callback`

### Produção
- `https://matriculausa.com/email-oauth-callback`
- `https://www.matriculausa.com/email-oauth-callback`

## Como Testar

### 1. Desenvolvimento Local
```bash
npm run dev
```
- Acesse: `http://localhost:5173`
- Adicione conta Google
- Deve redirecionar para: `http://localhost:5173/email-oauth-callback`

### 2. Produção
- Acesse: `https://matriculausa.com`
- Adicione conta Google
- Deve redirecionar para: `https://matriculausa.com/email-oauth-callback`

## Logs de Debug
O sistema agora mostra logs detalhados para debug:

```javascript
console.log('🔍 DEBUG: Environment detection:', {
  hostname: window.location.hostname,
  isDevelopment,
  redirectUri
});
```

## Troubleshooting

### Se ainda redireciona para produção:
1. Verifique se o Google Cloud Console tem a URL de localhost configurada
2. Limpe o cache do navegador
3. Verifique os logs no console do navegador

### Se dá erro de redirect_uri:
1. Verifique se a URL exata está configurada no Google Cloud Console
2. Certifique-se de que não há espaços extras
3. Verifique se a porta está correta (5173 para Vite)

## Variáveis de Ambiente
Certifique-se de que as seguintes variáveis estão configuradas:

```env
VITE_GOOGLE_CLIENT_ID=seu_client_id_aqui
VITE_MICROSOFT_CLIENT_ID=seu_microsoft_client_id_aqui
VITE_SUPABASE_URL=sua_url_supabase
VITE_SUPABASE_ANON_KEY=sua_chave_anonima
``` 