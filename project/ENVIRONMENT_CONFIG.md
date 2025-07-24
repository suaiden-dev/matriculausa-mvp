# Configuração de Ambiente Dinâmica

## 🎯 Visão Geral

O sistema agora detecta automaticamente se está rodando em **desenvolvimento** ou **produção** e configura as URLs corretas.

## 🔧 Como Funciona

### Detecção Automática de Ambiente

- **Desenvolvimento**: `localhost`, `127.0.0.1`, ou qualquer URL com `localhost`
- **Produção**: `matriculausa.com` ou qualquer URL com `matriculausa.com`

### URLs Configuradas

| Ambiente | Frontend URL | Supabase URL | OAuth Redirect |
|----------|--------------|--------------|----------------|
| **Dev** | `http://localhost:5173` | `VITE_SUPABASE_URL` | `${SUPABASE_URL}/functions/v1/google-oauth-callback` |
| **Prod** | `https://matriculausa.com` | `VITE_SUPABASE_URL` | `${SUPABASE_URL}/functions/v1/google-oauth-callback` |

## 📋 Configuração no Supabase

### 1. Acessar Supabase Dashboard
- Vá para [supabase.com](https://supabase.com)
- Acesse seu projeto
- Vá para **Settings** → **API**

### 2. Configurar Secrets (Edge Functions)

No Supabase Dashboard, vá para **Settings** → **Edge Functions** e configure:

```bash
# Para Desenvolvimento
VITE_SUPABASE_URL=https://fitpynguasqqutuhzifx.supabase.co
VITE_GOOGLE_CLIENT_ID=seu_google_client_id_dev
VITE_GOOGLE_CLIENT_SECRET=seu_google_client_secret_dev

# Para Produção (quando necessário)
VITE_SUPABASE_URL=https://fitpynguasqqutuhzifx.supabase.co
VITE_GOOGLE_CLIENT_ID=seu_google_client_id_prod
VITE_GOOGLE_CLIENT_SECRET=seu_google_client_secret_prod
```

### 3. Configurar Google OAuth

No Google Cloud Console, configure as URLs de redirecionamento:

#### Desenvolvimento:
```
https://fitpynguasqqutuhzifx.supabase.co/functions/v1/google-oauth-callback
```

#### Produção:
```
https://fitpynguasqqutuhzifx.supabase.co/functions/v1/google-oauth-callback
```

## 🚀 Como Usar

### No Código

```typescript
import { config } from '../lib/config';

// Detectar ambiente
if (config.isDevelopment()) {
  console.log('🟢 Rodando em desenvolvimento');
} else if (config.isProduction()) {
  console.log('🔴 Rodando em produção');
}

// Obter URLs
const frontendUrl = config.getFrontendUrl();
const supabaseUrl = config.getSupabaseUrl();
const oauthRedirectUrl = config.getOAuthRedirectUrl();

// Log da configuração atual
config.logCurrentConfig();
```

### Logs no Console

Quando o OAuth for iniciado, você verá logs como:

```
🔧 Configuração atual: {
  hostname: "localhost",
  isDevelopment: true,
  isProduction: false,
  frontendUrl: "http://localhost:5173",
  supabaseUrl: "https://fitpynguasqqutuhzifx.supabase.co",
  oauthRedirectUrl: "https://fitpynguasqqutuhzifx.supabase.co/functions/v1/google-oauth-callback"
}

🔍 Debug OAuth: {
  clientId: "✅ Configurado",
  redirectUri: "https://fitpynguasqqutuhzifx.supabase.co/functions/v1/google-oauth-callback",
  state: "google_123456",
  sessionUserId: "123456",
  environment: "🟢 Development"
}
```

## ✅ Benefícios

1. **Zero configuração manual** - Detecta ambiente automaticamente
2. **URLs corretas sempre** - Não precisa mudar código entre dev/prod
3. **Logs informativos** - Fácil debug e monitoramento
4. **Flexível** - Fácil adicionar novos ambientes

## 🔄 Deploy

### Desenvolvimento
```bash
npm run dev
# Acesse: http://localhost:5173
```

### Produção
```bash
npm run build
npm run preview
# Acesse: https://matriculausa.com
```

## 🐛 Troubleshooting

### Problema: OAuth não funciona
**Solução**: Verifique se as URLs de redirecionamento estão configuradas no Google Cloud Console

### Problema: URLs incorretas
**Solução**: Verifique os logs no console para confirmar a configuração atual

### Problema: Ambiente não detectado
**Solução**: Adicione o hostname na função `isDevelopment()` ou `isProduction()` no arquivo `config.ts` 