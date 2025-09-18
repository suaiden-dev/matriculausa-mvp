# 🤖 Configuração da Integração de IA para Resposta Automática de Emails

## 📋 **Variáveis de Ambiente Necessárias**

Adicione estas variáveis ao seu arquivo `.env`:

```env
# Microsoft Azure (já configurado)
VITE_AZURE_CLIENT_ID=seu_client_id
VITE_AZURE_TENANT_ID=seu_tenant_id
VITE_AZURE_REDIRECT_URI=http://localhost:5173/microsoft-email

# Microsoft Graph (já configurado)
VITE_GRAPH_SCOPES=User.Read,Mail.Read,Mail.Send,offline_access
VITE_MICROSOFT_GRAPH_TOKEN=seu_token_de_aplicacao

# Google Gemini para IA (NOVO)
VITE_GEMINI_API_KEY=sua_chave_gemini

# URL da aplicação
VITE_APP_URL=http://localhost:5173
```

## 🔧 **Como Obter a Chave da API do Gemini**

### 1. **Acesse o Google AI Studio**
- Vá para: https://aistudio.google.com/
- Faça login com sua conta Google

### 2. **Crie um Novo Projeto**
- Clique em "Get API Key"
- Selecione "Create API Key"
- Escolha um projeto existente ou crie um novo

### 3. **Copie a Chave da API**
- A chave será exibida no formato: `AIzaSy...`
- Copie esta chave para usar no sistema

### 4. **Configure no Projeto**
Adicione a chave ao seu arquivo `.env`:
```env
VITE_GEMINI_API_KEY=AIzaSySuaChaveAqui
```

## 🚀 **Como Usar**

### 1. **Configure o Sistema**
- Adicione todas as variáveis de ambiente
- Reinicie o servidor de desenvolvimento

### 2. **Ative a IA**
- Acesse: `http://localhost:5173/microsoft-email`
- Faça login com Microsoft
- O sistema de IA será iniciado automaticamente

### 3. **Controle a IA**
- **Verificar Status**: Mostra se o sistema está ativo
- **Testar IA**: Processa emails existentes para teste
- **Processar Agora**: Processamento manual imediato
- **Iniciar Sistema**: Inicia o polling automático

## 📊 **Funcionalidades da IA**

### **Análise Inteligente:**
- ✅ Categorização automática de emails
- ✅ Detecção de prioridade (low, medium, high)
- ✅ Identificação de spam
- ✅ Decisão de resposta automática
- ✅ Filtro de emails de sistema

### **Geração de Respostas:**
- ✅ Respostas profissionais em português
- ✅ Tom adequado ao contexto
- ✅ Informações relevantes
- ✅ Assinatura automática
- ✅ Baseada na categoria do email

### **Sistema de Polling:**
- ✅ Verificação automática a cada 5 minutos
- ✅ Controle de estado (ativo/inativo)
- ✅ Estatísticas em tempo real
- ✅ Logs detalhados para debug
- ✅ Retry logic para falhas

## 🔒 **Segurança**

### **Limitações da API do Gemini:**
- Rate limiting: 15 requisições por minuto (gratuito)
- Quota diária: 1.500 requisições (gratuito)
- Tamanho máximo: 1MB por requisição

### **Dados Sensíveis:**
- Apenas o conteúdo do email é enviado para o Gemini
- Nenhum dado pessoal é armazenado
- Respostas são geradas localmente
- Tokens são gerenciados de forma segura

## 🛠️ **Troubleshooting**

### **Erro: "API Key inválida"**
- Verifique se a chave está correta no `.env`
- Confirme se a chave está ativa no Google AI Studio

### **Erro: "Quota excedida"**
- Aguarde a renovação da quota (24h)
- Considere upgrade para plano pago

### **Erro: "Token de usuário não fornecido"**
- Verifique se o usuário está logado
- Confirme se o token está sendo passado corretamente

### **Erro: "Configuração do Azure incompleta"**
- Verifique todas as variáveis VITE_AZURE_*
- Confirme se o redirect URI está correto

## 📈 **Monitoramento**

### **Logs do Sistema:**
- Console do navegador para debug
- Logs detalhados para cada operação
- Estatísticas em tempo real na interface

### **Métricas Importantes:**
- Total de emails processados
- Taxa de resposta automática
- Erros de processamento
- Tempo de resposta da IA

## 🎯 **Próximos Passos**

1. **Configure a chave do Gemini** no `.env`
2. **Teste o sistema** com emails reais
3. **Monitore as estatísticas** de processamento
4. **Ajuste as configurações** conforme necessário

O sistema está pronto para usar o Google Gemini para análise e resposta automática de emails!

## 📝 **Notas Importantes**

- O sistema usa **Mock AI** quando não há chave do Gemini
- Emails de sistema são automaticamente filtrados
- O polling roda a cada 5 minutos por padrão
- Todas as respostas são em português brasileiro
- O sistema marca emails como lidos após responder
