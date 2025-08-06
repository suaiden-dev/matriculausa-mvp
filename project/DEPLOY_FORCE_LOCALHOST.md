# Deploy - Forçar Apenas Localhost

## 🎯 Objetivo
Forçar que **APENAS** o ambiente de desenvolvimento (localhost:5173) seja usado, ignorando completamente qualquer redirecionamento para produção.

## Comando de Deploy

### Deploy da Edge Function Forçada para Localhost
```bash
supabase functions deploy google-oauth-callback
```

## O que foi alterado

### 1. Edge Function Simplificada
- **ANTES**: Detecção complexa de ambiente (localhost vs produção)
- **AGORA**: Força sempre `http://localhost:5173`

### 2. Logs de Debug
Agora você verá no console:
```
🔧 FORCING DEVELOPMENT ENVIRONMENT ONLY: http://localhost:5173
🔄 Redirecting to: http://localhost:5173/school/dashboard/inbox?status=success&email=...
```

## Teste da Correção

### 1. Limpar Cache do Navegador
```bash
# No navegador, pressione:
Ctrl + Shift + R
```

### 2. Testar OAuth
1. Acesse: `http://localhost:5173`
2. Vá para: `/school/dashboard/inbox`
3. Clique em "Conectar Google"
4. **DEVE** redirecionar para: `http://localhost:5173/email-oauth-callback`

### 3. Verificar Logs
No Supabase Dashboard > Functions > google-oauth-callback > Logs:
```
🔧 FORCING DEVELOPMENT ENVIRONMENT ONLY: http://localhost:5173
🔄 Redirecting to: http://localhost:5173/school/dashboard/inbox?status=success&email=...
```

## ⚠️ IMPORTANTE

### Para Produção (quando necessário)
Quando precisar voltar para produção, você precisará:

1. **Reverter esta mudança** na Edge Function
2. **Ou criar uma variável de ambiente** para controlar o ambiente
3. **Ou criar uma branch separada** para desenvolvimento

### Configuração Temporária
Esta é uma **solução temporária** para desenvolvimento. Para produção, será necessário ajustar novamente.

## Troubleshooting

### Se ainda redireciona para produção:
1. Verifique se o deploy foi bem-sucedido: `supabase functions list`
2. Limpe o cache do navegador
3. Verifique os logs da Edge Function no Supabase Dashboard
4. Aguarde alguns minutos para o deploy propagar

### Logs esperados:
```
🔧 FORCING DEVELOPMENT ENVIRONMENT ONLY: http://localhost:5173
🔄 Frontend URL: http://localhost:5173
🔄 Redirecting to: http://localhost:5173/school/dashboard/inbox?status=success&email=...
``` 