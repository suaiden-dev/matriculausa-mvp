# 🚀 Deploy da API para Netlify

## ✅ O que foi configurado:

1. **Netlify Function**: `project/netlify/functions/api.js` - Converte sua API Express em função serverless
2. **Configuração**: `netlify.toml` - Configura o build e redirects
3. **Variáveis de ambiente**: Lista das variáveis necessárias

## 🔧 Como configurar no Netlify:

### 1. **Configurar Variáveis de Ambiente**

No painel do Netlify:
- Vá em **Site Settings** → **Environment Variables**
- Adicione as seguintes variáveis:

```bash
VITE_SUPABASE_URL=https://fitpynguasqqutuhzifx.supabase.co
VITE_SUPABASE_ANON_KEY=sua_chave_anonima_aqui
GEMINI_API_KEY=sua_chave_gemini_aqui
MICROSOFT_CLIENT_ID=seu_client_id_aqui
MICROSOFT_CLIENT_SECRET=seu_client_secret_aqui
```

### 2. **Deploy Automático**

Com a configuração atual, quando você fizer merge na `main`:
- O Netlify vai fazer build do frontend
- As funções serverless serão deployadas automaticamente
- Sua API estará disponível em: `https://seu-dominio.netlify.app/api/polling-user`

## 🔄 Como usar:

### **Antes (localhost):**
```javascript
// Seu código atual
const response = await fetch('http://localhost:3001/api/polling-user', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

### **Depois (Netlify):**
```javascript
// Código atualizado
const apiUrl = window.location.hostname === 'localhost' 
  ? 'http://localhost:3001/api/polling-user'  // Desenvolvimento
  : '/api/polling-user';  // Produção (Netlify)

const response = await fetch(apiUrl, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
});
```

## 🎯 Endpoints disponíveis:

- `GET /api/polling-user` - Verificar status do polling
- `POST /api/polling-user` - Iniciar polling
- `PUT /api/polling-user` - Processar emails manualmente

## ⚠️ Limitações das Netlify Functions:

1. **Timeout**: 10 segundos (free tier) / 15 minutos (paid)
2. **Memory**: 128MB (free tier) / 3GB (paid)
3. **Cold starts**: Primeira execução pode ser mais lenta
4. **Stateless**: Variáveis globais são perdidas entre execuções

## 🔧 Alternativas se precisar de mais recursos:

### **Opção 2: Railway/Render/Vercel**
- Suporte completo a servidores Node.js
- Sem limitações de timeout
- Mais similar ao ambiente atual

### **Opção 3: AWS Lambda + API Gateway**
- Mais complexo mas muito escalável
- Pay-per-use

## 🚀 Próximos passos:

1. Configure as variáveis de ambiente no Netlify
2. Faça merge na main para testar o deploy
3. Teste os endpoints em produção
4. Ajuste o código frontend para usar a nova URL da API
