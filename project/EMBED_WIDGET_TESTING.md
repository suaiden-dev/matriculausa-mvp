# 🧪 Testando o Widget de Chat Amatricula USA

## 📋 Pré-requisitos

1. **Instalar dependências**:
   ```bash
   npm install
   ```

2. **Configurar variáveis de ambiente**:
   Certifique-se de que o arquivo `.env` contém:
   ```
   VITE_SUPABASE_URL=sua_url_do_supabase
   VITE_SUPABASE_ANON_KEY=sua_chave_anonima_do_supabase
   VITE_OPENAI_API_KEY=sua_chave_da_openai
   ```

## 🚀 Como Executar

### Opção 1: Executar apenas o frontend (Recomendado)
```bash
npm run dev
```

Isso iniciará apenas o Vite dev server em `http://localhost:5173`

### Opção 2: Executar com servidor local (para desenvolvimento)
```bash
npm run dev:full
```

Isso iniciará:
- Vite dev server em `http://localhost:5173`
- API server em `http://localhost:3001`

## 🧪 Como Testar

### 1. Teste Básico
1. Abra `http://localhost:5173/test-widget.html` no navegador
2. Você deve ver um botão de chat flutuante no canto inferior direito
3. Clique no botão para abrir o chat
4. Teste enviando mensagens

### 2. Teste do Modal de Configuração
1. Acesse a aplicação principal: `http://localhost:5173`
2. Vá para "WhatsApp Connections" → "AI Agents"
3. Clique no botão "Embed" de qualquer agente
4. Configure as opções no modal
5. Teste o código gerado

### 3. Teste em Site Externo
1. Copie o código gerado pelo modal
2. Crie um arquivo HTML simples:
   ```html
   <!DOCTYPE html>
   <html>
   <head>
       <title>Teste Widget</title>
   </head>
   <body>
       <h1>Teste do Widget</h1>
       <p>O widget deve aparecer no canto inferior direito.</p>
       
       <!-- Cole o código gerado aqui -->
   </body>
   </html>
   ```
3. Abra o arquivo no navegador

## 🔧 Configurações Disponíveis

### Cores Padrão (Matrícula USA)
- **Cor Primária**: `#dc2626` (Vermelho)
- **Cor Secundária**: `#2563eb` (Azul)

### Posições Disponíveis
- `bottom-right` (padrão)
- `bottom-left`
- `top-right`
- `top-left`

### Opções de Configuração
- ✅ Enable/Disable widget
- 🎨 Primary Color (hex)
- 🎨 Secondary Color (hex)
- 📍 Position
- 📋 Show Header (toggle)
- 📝 Header Text
- 💬 Welcome Message

## 🐛 Troubleshooting

### Widget não aparece
1. Verifique se o Vite dev server está rodando: `http://localhost:5173`
2. Verifique o console do navegador para erros
3. Certifique-se de que o `embed.js` está acessível em `http://localhost:5173/embed.js`

### Erro de Webhook
1. Verifique se o webhook `https://nwh.suaiden.com/webhook/chatbot_embed` está acessível
2. Verifique o console do navegador para erros de CORS
3. Certifique-se de que o webhook está configurado para aceitar requisições POST

### Erro de API (se usando servidor local)
1. Verifique se as chaves do Supabase e OpenAI estão corretas
2. Verifique os logs do servidor para detalhes do erro

## 📁 Arquivos Importantes

- `public/embed.js` - Script principal do widget (envia para webhook)
- `public/test-widget.html` - Página de teste
- `src/api/chat.ts` - API endpoint para chat (backup local)
- `server.js` - Servidor Express para API (backup local)
- `src/pages/SchoolDashboard/WhatsAppConnection.tsx` - Modal de configuração

## 🔗 Webhook Integration

O widget agora envia mensagens para o webhook `https://nwh.suaiden.com/webhook/chatbot_embed` com os seguintes dados (compatível com Skilabot):

```json
{
  "message": "Mensagem do usuário",
  "agent_id": "ID do agente",
  "agent_name": "Nome do agente",
  "company_name": "Nome do agente",
  "conversation_id": "widget_1754347969999",
  "user_id": "ID do usuário",
  "final_prompt": null
}
```

### Resposta Esperada do Webhook
O webhook deve retornar uma resposta JSON com:
```json
{
  "response": "Resposta da IA",
  "message": "Mensagem alternativa"
}
```

## 🎯 Próximos Passos

1. **Produção**: Configurar domínio real em vez de localhost
2. **Segurança**: Adicionar autenticação para o webhook
3. **Analytics**: Adicionar tracking de conversas
4. **Customização**: Adicionar mais opções de personalização
5. **Mobile**: Otimizar para dispositivos móveis 