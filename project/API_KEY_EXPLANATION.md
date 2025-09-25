# 🔑 EXPLICAÇÃO DAS API KEYS DO SUPABASE

## 📋 **TIPOS DE API KEYS:**

### 1. **ANON KEY (Chave Pública)**
- **Uso:** Autenticação do usuário no frontend
- **Permissões:** Limitadas (RLS - Row Level Security)
- **Exemplo:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Problema:** ❌ Não pode chamar Edge Functions internamente

### 2. **SERVICE ROLE KEY (Chave de Serviço)**
- **Uso:** Operações internas do servidor (cron jobs, Edge Functions)
- **Permissões:** Completas (bypassa RLS)
- **Exemplo:** `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`
- **Solução:** ✅ Pode chamar Edge Functions

## 🚨 **PROBLEMA IDENTIFICADO:**

### ❌ **O que estava errado:**
```sql
-- ERRADO: Usando Anon Key no cron job
headers := '{"Authorization": "Bearer ANON_KEY", "Content-Type": "application/json"}'
```

### ✅ **O que está correto:**
```sql
-- CORRETO: Usando Service Role Key no cron job
headers := '{"Authorization": "Bearer ' || current_setting('app.settings.service_role_key') || '", "Content-Type": "application/json"}'
```

## 🔧 **COMO OBTER A SERVICE ROLE KEY:**

### 1. **No Painel do Supabase:**
- Acesse: **Settings** → **API**
- Copie a **service_role** key (não a anon key)

### 2. **Configurar no Banco:**
```sql
-- Definir a Service Role Key no banco
ALTER DATABASE postgres SET app.settings.service_role_key = 'SUA_SERVICE_ROLE_KEY_AQUI';
```

### 3. **Ou usar diretamente:**
```sql
-- Usar a Service Role Key diretamente no cron job
headers := '{"Authorization": "Bearer SUA_SERVICE_ROLE_KEY_AQUI", "Content-Type": "application/json"}'
```

## 📊 **RESUMO:**

| **Contexto** | **API Key** | **Uso** |
|--------------|-------------|---------|
| **Frontend** | Anon Key | Autenticação do usuário |
| **Cron Job** | Service Role Key | Chamar Edge Functions |
| **Edge Function** | Service Role Key | Acessar banco de dados |

## 🚨 **IMPORTANTE:**

- **NUNCA** usar Anon Key para operações internas
- **SEMPRE** usar Service Role Key para cron jobs
- **NUNCA** fazer DB RESET (como solicitado)
- **SEMPRE** testar manualmente antes de automatizar
