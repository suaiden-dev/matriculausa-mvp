# 📚 Sistema de Base de Conhecimento para Emails Microsoft

## 🎯 **VISÃO GERAL**

Este sistema permite que universidades adicionem uma base de conhecimento personalizada para a IA de emails Microsoft, similar ao sistema já existente para WhatsApp. Quando uma universidade faz upload de documentos, eles são automaticamente transcritos e integrados ao prompt da IA para responder emails de forma mais precisa e contextualizada.

## 🏗️ **ARQUITETURA DO SISTEMA**

### **Fluxo de Dados:**
```
Upload de Documento → Transcrição (n8n) → Banco de Dados → Edge Function → IA de Emails
```

### **Componentes Principais:**

#### **Frontend:**
- **EmailKnowledgeUpload.tsx**: Componente de upload de documentos
- **EmailKnowledgeManagement.tsx**: Interface de gerenciamento
- **Integração com IA**: Base de conhecimento integrada automaticamente

#### **Backend:**
- **email_knowledge_documents**: Tabela para armazenar documentos
- **transcribe-email-document**: Edge function para transcrição
- **update-email-prompt-with-knowledge**: Edge function para atualização de prompts
- **microsoft-email-polling**: Integração com IA de emails

## 📋 **FUNCIONALIDADES IMPLEMENTADAS**

### **1. Upload e Transcrição de Documentos**
- ✅ Upload de documentos via `EmailKnowledgeUpload.tsx`
- ✅ Processamento automático via webhook → n8n → transcrição
- ✅ Armazenamento na tabela `email_knowledge_documents`
- ✅ Status de transcrição: `pending`, `processing`, `completed`, `error`

### **2. Integração com IA de Emails**
- ✅ Função `getEmailKnowledgeBase()` que busca documentos transcritos
- ✅ Integração automática no prompt da IA
- ✅ Estrutura XML com tags `<knowledge-base>`
- ✅ Instruções específicas para uso da base de conhecimento

### **3. Interface de Gerenciamento**
- ✅ Interface completa de gerenciamento de documentos
- ✅ Visualização de status de transcrição em tempo real
- ✅ Controles para atualização manual de prompts
- ✅ Exclusão de documentos
- ✅ Prévia de transcrições

### **4. Atualização Automática**
- ✅ Edge function para atualização automática de prompts
- ✅ Integração com sistema de IA existente
- ✅ Logs detalhados para monitoramento

## 🗄️ **ESTRUTURA DE DADOS**

### **Tabela `email_knowledge_documents`**
```sql
CREATE TABLE email_knowledge_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id UUID NOT NULL REFERENCES universities(id),
  document_name TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  mime_type TEXT NOT NULL,
  uploaded_by_user_id UUID REFERENCES auth.users(id),
  transcription TEXT,
  transcription_status TEXT DEFAULT 'pending',
  transcription_processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

### **Índices e Triggers:**
- ✅ Índices para performance
- ✅ Trigger para atualização automática de timestamps
- ✅ RLS (Row Level Security) configurado

## 🔧 **EDGE FUNCTIONS**

### **1. transcribe-email-document**
- **Função:** Enviar documentos para transcrição via n8n
- **Endpoint:** `/transcribe-email-document`
- **Payload:** `{ document_id, document_name, file_url, mime_type }`

### **2. update-email-prompt-with-knowledge**
- **Função:** Atualizar prompt da IA com base de conhecimento
- **Endpoint:** `/update-email-prompt-with-knowledge`
- **Payload:** `{ university_id }`

## 🤖 **INTEGRAÇÃO COM IA DE EMAILS**

### **Método `getEmailKnowledgeBase()`**
```typescript
async getEmailKnowledgeBase(userId: string): Promise<string | null> {
  // Busca documentos transcritos da universidade
  // Gera conteúdo da base de conhecimento
  // Retorna texto formatado para integração
}
```

### **Integração no Prompt:**
```typescript
const knowledgeBase = await this.getEmailKnowledgeBase(firstUserId);
if (knowledgeBase) {
  universityPrompt = `${universityPrompt}\n\n<knowledge-base>\n${knowledgeBase}\n</knowledge-base>\n\nIMPORTANTE: Use as informações da base de conhecimento acima para responder às perguntas dos estudantes.`;
}
```

## 📱 **INTERFACE DO USUÁRIO**

### **EmailKnowledgeManagement.tsx**
- **Upload de Documentos:** Drag & drop com validação
- **Lista de Documentos:** Status em tempo real
- **Gerenciamento:** Exclusão e atualização
- **Instruções:** Guia de uso para universidades

### **EmailKnowledgeUpload.tsx**
- **Validação:** Tipos de arquivo e tamanho
- **Upload:** Integração com Supabase Storage
- **Webhook:** Envio automático para transcrição
- **Status:** Feedback visual do progresso

## 🚀 **COMO USAR**

### **1. Para Universidades:**
1. Acesse a seção "Base de Conhecimento para Emails"
2. Faça upload de documentos (PDF, DOC, DOCX, TXT)
3. Aguarde a transcrição automática
4. A IA usará automaticamente as informações

### **2. Para Desenvolvedores:**
1. A base de conhecimento é integrada automaticamente
2. Não é necessário código adicional
3. Sistema funciona de forma transparente

## 📊 **MONITORAMENTO**

### **Logs Importantes:**
- `📚 Base de conhecimento encontrada: X documentos`
- `✅ Email prompt updated with knowledge base`
- `🔄 Enviando webhook para transcrição`

### **Métricas:**
- Número de documentos por universidade
- Status de transcrição
- Uso da base de conhecimento pela IA

## 🔒 **SEGURANÇA**

### **RLS (Row Level Security):**
- Usuários só podem ver documentos da sua universidade
- Políticas de acesso baseadas em `university_id`
- Validação de permissões em todas as operações

### **Validações:**
- Tipos de arquivo permitidos
- Tamanho máximo de arquivo (10MB)
- Validação de universidade do usuário

## 🎯 **BENEFÍCIOS**

### **Para Universidades:**
- ✅ Respostas mais precisas e contextualizadas
- ✅ Informações específicas da universidade
- ✅ Redução de consultas manuais
- ✅ Melhoria na experiência do estudante

### **Para Estudantes:**
- ✅ Respostas mais relevantes
- ✅ Informações específicas da universidade
- ✅ Menos necessidade de contato humano
- ✅ Respostas mais rápidas

### **Para a Plataforma:**
- ✅ Diferenciação competitiva
- ✅ Maior valor agregado
- ✅ Redução de suporte manual
- ✅ Escalabilidade do sistema

## 🔄 **FLUXO COMPLETO**

1. **Upload:** Universidade faz upload de documentos
2. **Armazenamento:** Documentos salvos no Supabase Storage
3. **Webhook:** Enviado para n8n para transcrição
4. **Transcrição:** n8n processa e retorna texto
5. **Atualização:** Prompt da IA atualizado automaticamente
6. **Uso:** IA usa base de conhecimento em respostas
7. **Monitoramento:** Logs e métricas disponíveis

## 🎉 **SISTEMA COMPLETO E FUNCIONAL**

O sistema de base de conhecimento para emails Microsoft está **100% implementado** e integrado com o sistema existente. Universidades podem agora adicionar documentos que serão automaticamente usados pela IA para responder emails de forma mais precisa e contextualizada.

**Sistema pronto para produção!** 🚀
