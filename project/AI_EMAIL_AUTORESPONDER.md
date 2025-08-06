# 🤖 AI Email Auto-Responder System

## 📋 Visão Geral

Este sistema implementa um fluxo completo de auto-resposta de emails usando **n8n** e **IA (OpenAI/GPT-4)**. Quando um email chega via webhook, o sistema automaticamente:

1. **Analisa** o conteúdo do email
2. **Identifica** o tipo de email (application, document_request, payment, etc.)
3. **Gera** uma resposta apropriada usando IA ou templates
4. **Envia** a resposta automaticamente
5. **Registra** a interação no banco de dados
6. **Notifica** administradores para casos urgentes

## 🏗️ Arquitetura do Sistema

### **Componentes Principais:**

1. **Webhook Trigger** - Recebe emails do sistema Gmail
2. **Email Parser** - Extrai e analisa informações do email
3. **Database Queries** - Busca informações do usuário e universidade
4. **AI Response Generator** - Gera respostas usando GPT-4
5. **Email Sender** - Envia respostas automaticamente
6. **Logging System** - Registra todas as interações
7. **Alert System** - Notifica para casos especiais

### **Fluxo de Processamento:**

```
Email Chega → Webhook → Parser → Database Lookup → AI Analysis → Response Generation → Send Email → Log → Alerts
```

## 🚀 Instalação e Configuração

### **1. Pré-requisitos**

- n8n instalado e rodando
- Supabase configurado
- OpenAI API key
- Email service configurado (SMTP)

### **2. Configurar Variáveis de Ambiente**

```bash
# n8n
N8N_BASE_URL=http://localhost:5678
N8N_API_KEY=your-n8n-api-key

# Supabase
SUPABASE_HOST=db.supabase.co
SUPABASE_DB=postgres
SUPABASE_USER=postgres
SUPABASE_PASSWORD=your-password

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# Email Service
EMAIL_HOST=smtp.gmail.com
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-password
```

### **3. Executar Migrações do Banco**

```bash
# Aplicar migrações do Supabase
supabase db push
```

### **4. Importar Workflow no n8n**

```bash
# Executar script de importação
node scripts/import-n8n-workflow.js
```

## 📊 Estrutura do Banco de Dados

### **Tabela: email_response_templates**

Armazena templates de resposta para diferentes tipos de email:

```sql
CREATE TABLE email_response_templates (
  id UUID PRIMARY KEY,
  email_type VARCHAR(50), -- 'application', 'document_request', 'payment', etc.
  response_template TEXT,  -- Template de resposta
  ai_prompt TEXT,         -- Prompt para IA
  auto_reply_enabled BOOLEAN DEFAULT true,
  requires_human_review BOOLEAN DEFAULT false
);
```

### **Tabela: email_interactions**

Registra todas as interações de email:

```sql
CREATE TABLE email_interactions (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  sender_email VARCHAR(255),
  subject VARCHAR(500),
  original_content TEXT,
  response_content TEXT,
  response_type VARCHAR(50), -- 'ai', 'template', 'human'
  is_urgent BOOLEAN DEFAULT false,
  email_type VARCHAR(50),
  processed_at TIMESTAMP,
  status VARCHAR(50) -- 'processed', 'pending_review', 'failed'
);
```

## 🔧 Configuração do Workflow

### **1. Webhook Trigger**

- **URL**: `/webhook/ai-email-webhook`
- **Método**: POST
- **Payload Esperado**:
```json
{
  "userId": "user-uuid",
  "content": "email content",
  "from": "sender@email.com",
  "subject": "email subject",
  "timestamp": "2025-01-20T10:00:00Z"
}
```

### **2. Email Parser**

Analisa o email e extrai informações importantes:

- **Tipo de Email**: application, document_request, payment, scholarship, admission, general
- **Urgência**: Detecta palavras como "urgent", "asap"
- **Domínio do Remetente**: Para identificar universidades
- **Conteúdo**: Texto completo do email

### **3. AI Response Generator**

Usa GPT-4 para gerar respostas personalizadas:

- **Contexto**: Tipo de email, urgência, usuário, universidade
- **Prompt**: Instruções específicas para cada tipo de email
- **Temperatura**: 0.7 (balanceia criatividade e consistência)
- **Max Tokens**: 500 (respostas concisas)

### **4. Email Sender**

Envia respostas automaticamente:

- **From**: support@matriculausa.com
- **To**: Remetente original
- **Subject**: Re: [assunto original]
- **Content**: Resposta gerada pela IA

## 🎯 Tipos de Email Suportados

### **1. Application (Aplicação)**
- **Detecção**: Palavras "application", "apply"
- **Resposta**: Confirma recebimento, orienta sobre documentos
- **IA Prompt**: "Respond to application inquiry professionally"

### **2. Document Request (Solicitação de Documentos)**
- **Detecção**: Palavras "document", "upload"
- **Resposta**: Instruções para upload de documentos
- **IA Prompt**: "Guide student to upload documents"

### **3. Payment (Pagamento)**
- **Detecção**: Palavras "payment", "pay"
- **Resposta**: Confirma pagamento, orienta sobre problemas
- **IA Prompt**: "Help with payment-related issues"

### **4. Scholarship (Bolsa de Estudos)**
- **Detecção**: Palavras "scholarship", "grant"
- **Resposta**: Informações sobre processo de bolsa
- **IA Prompt**: "Provide scholarship guidance"

### **5. Admission (Admissão)**
- **Detecção**: Palavras "admission", "admit"
- **Resposta**: Status do processo de admissão
- **IA Prompt**: "Provide admission process guidance"

### **6. General (Geral)**
- **Detecção**: Padrão para outros tipos
- **Resposta**: Resposta genérica profissional
- **IA Prompt**: "Respond professionally to general inquiry"

## 🔔 Sistema de Alertas

### **1. Emails Urgentes**
- **Condição**: Email marcado como urgente
- **Ação**: Envia alerta para admin@matriculausa.com
- **Conteúdo**: Detalhes do email processado

### **2. Revisão Humana**
- **Condição**: Template configurado para revisão humana
- **Ação**: Envia solicitação para support@matriculausa.com
- **Conteúdo**: Email que precisa de revisão manual

## 📈 Monitoramento e Logs

### **1. Logs de Interação**
Todas as interações são registradas na tabela `email_interactions`:

```sql
SELECT 
  email_type,
  response_type,
  is_urgent,
  COUNT(*) as total_emails,
  AVG(EXTRACT(EPOCH FROM (processed_at - created_at))) as avg_processing_time
FROM email_interactions 
WHERE processed_at >= NOW() - INTERVAL '7 days'
GROUP BY email_type, response_type, is_urgent;
```

### **2. Métricas Importantes**
- **Taxa de Sucesso**: Emails processados com sucesso
- **Tempo de Resposta**: Tempo médio de processamento
- **Tipos de Email**: Distribuição por tipo
- **Uso de IA vs Template**: Eficiência do sistema

## 🛠️ Manutenção e Customização

### **1. Adicionar Novos Tipos de Email**

1. **Adicionar na função `detectEmailType`**:
```javascript
if (subjectLower.includes('novo-tipo') || contentLower.includes('novo-tipo')) {
  return 'novo_tipo';
}
```

2. **Criar template no banco**:
```sql
INSERT INTO email_response_templates (email_type, response_template, ai_prompt) 
VALUES ('novo_tipo', 'Template de resposta...', 'Prompt para IA...');
```

### **2. Ajustar Prompts da IA**

Editar o nó "AI Response Generator" no n8n:

```javascript
// Prompt do sistema
"You are an AI assistant for Matrícula USA. Respond professionally and helpfully."

// Prompt específico por tipo
"{{ $json.template }}"
```

### **3. Configurar Alertas**

Editar nós de alerta no workflow:

- **Urgent Alert**: admin@matriculausa.com
- **Review Request**: support@matriculausa.com
- **Custom Alerts**: Adicionar novos nós de email

## 🔒 Segurança e Privacidade

### **1. Validação de Dados**
- Todos os emails são validados antes do processamento
- Dados sensíveis são mascarados nos logs
- Acesso ao banco é restrito por usuário

### **2. Rate Limiting**
- Limite de 100 emails por hora por usuário
- Cooldown de 5 minutos entre respostas para o mesmo remetente
- Monitoramento de spam/abuso

### **3. Backup e Recuperação**
- Logs completos de todas as interações
- Backup automático das configurações
- Sistema de rollback para mudanças

## 🚨 Troubleshooting

### **1. Email não processado**
- Verificar se o webhook está ativo
- Checar logs do n8n
- Validar credenciais do banco

### **2. IA não responde**
- Verificar OpenAI API key
- Checar limite de tokens
- Validar prompt do sistema

### **3. Email não enviado**
- Verificar configurações SMTP
- Checar credenciais de email
- Validar formato do email

### **4. Performance lenta**
- Otimizar queries do banco
- Ajustar timeouts do n8n
- Monitorar uso de recursos

## 📞 Suporte

Para suporte técnico ou dúvidas sobre o sistema:

- **Email**: support@matriculausa.com
- **Documentação**: Este arquivo
- **Logs**: n8n interface
- **Monitoramento**: Supabase dashboard

---

**Versão**: 1.0.0  
**Última Atualização**: 2025-01-20  
**Mantido por**: Matrícula USA Team 