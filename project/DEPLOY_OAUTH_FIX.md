# Deploy da Correção do OAuth

## Comandos de Deploy

### 1. Deploy da Edge Function Atualizada
```bash
supabase functions deploy google-oauth-callback
```

### 2. Verificar se o Deploy foi Bem-sucedido
```bash
supabase functions list
```

## Teste da Correção

### 1. Limpar Cache do Navegador
- Pressione `Ctrl+Shift+R` (ou `Cmd+Shift+R` no Mac)
- Ou vá em DevTools > Application > Storage > Clear storage

### 2. Testar OAuth
1. Acesse: `http://localhost:5173`
2. Vá para: `/school/dashboard/inbox`
3. Clique em "Conectar Google"
4. Deve redirecionar para: `http://localhost:5173/email-oauth-callback`

### 3. Verificar Logs
No console do navegador, você deve ver:
```
🔍 DEBUG: Environment detection: {
  hostname: "localhost",
  isDevelopment: true,
  redirectUri: "http://localhost:5173/email-oauth-callback"
}
```

## Troubleshooting

### Se ainda redireciona para produção:
1. Verifique se o Google Cloud Console tem as URLs corretas
2. Limpe o cache do navegador
3. Verifique os logs no console do navegador
4. Verifique os logs da Edge Function no Supabase Dashboard

### Logs da Edge Function:
No Supabase Dashboard > Functions > google-oauth-callback > Logs, você deve ver:
```
🔧 Forcing localhost redirect based on referer
🔧 Forced localhost redirect to: http://localhost:5173
🔄 Redirecting to: http://localhost:5173/school/dashboard/inbox?status=success&email=...
``` 