# Documentação Técnica Específica - MatriculaUSA

## 1. Edge Functions Principais (68 funções)

### 1.1 Análise de Documentos
- **`analyze-student-documents`**: Proxy para N8N que analisa documentos via IA
- **`process-n8n-proof-validation`**: Processa validação automática de comprovantes
- **`process-inbox-document`**: Processa documentos enviados por email

### 1.2 Sistema de Pagamentos
- **`stripe-webhook`**: Webhook principal do Stripe (processa todos os tipos de pagamento)
- **`stripe-checkout-*`**: Funções específicas para cada tipo de taxa
- **`verify-stripe-session-*`**: Verificação de sessões de pagamento
- **`process-stripe-connect-transfer`**: Transferências para universidades via Stripe Connect

### 1.3 Notificações e Comunicação
- **`notify-university-document-upload`**: Notifica universidades sobre upload de documentos
- **`notify-university-*`**: Várias funções de notificação específicas
- **`forward-notification-to-n8n`**: Envia notificações para N8N
- **`send-email`**: Envio de emails via SMTP

### 1.4 Integração Gmail
- **`get-gmail-inbox`**: Busca emails do Gmail
- **`get-gmail-token`**: Obtém token de acesso
- **`process-inbox-email`**: Processa emails recebidos
- **`send-gmail-message`**: Envia emails via Gmail API

### 1.5 WhatsApp Business
- **`integrate-chatwoot-qr`**: Integração com Chatwoot para WhatsApp
- **`validate-qrcode-proxy`**: Validação de QR codes do WhatsApp

### 1.6 Zelle Payments
- **`create-zelle-payment`**: Cria pagamentos via Zelle
- **`validate-zelle-payment-result`**: Valida resultados de pagamento Zelle
- **`approve-zelle-payment-automatic`**: Aprovação automática de pagamentos Zelle

## 2. Webhooks N8N Principais

### 2.1 Análise de Documentos
```
URL: https://nwh.suaiden.com/webhook/analyze-documents
Payload: {
  user_id: string,
  student_name: string,
  passport_url: string,
  diploma_url: string,
  funds_proof_url: string
}
```

### 2.2 Notificações
```
URL: https://nwh.suaiden.com/webhook/notfmatriculausa
Payload: {
  tipo_notf: string,
  email_aluno: string,
  nome_aluno: string,
  email_universidade: string,
  o_que_enviar: string
}
```

### 2.3 Chatwoot WhatsApp
```
URL: https://nwh.suaiden.com/webhook/wootchat
Payload: {
  user_name: string,
  user_id: string,
  agent_id: string,
  instance_name: string,
  email: string,
  password: string,
  plan: string,
  agents_count: number
}
```

## 3. Fluxos Principais do Sistema

### 3.1 Fluxo de Upload de Documentos
1. **Frontend**: `DocumentsAndScholarshipChoice.tsx` - Upload de 3 documentos obrigatórios
2. **Storage**: Supabase Storage - `student-documents/{user_id}/{type}-{timestamp}-{filename}`
3. **Análise**: Edge Function `analyze-student-documents` → N8N → OpenAI GPT-4
4. **Resultado**: Aprovação automática ou revisão manual
5. **Notificação**: `notify-university-document-upload` → N8N → Email para universidade

### 3.2 Fluxo de Pagamentos
1. **Stripe Checkout**: Criação de sessão de pagamento
2. **Webhook**: `stripe-webhook` processa `checkout.session.completed`
3. **Atualização**: Status no banco de dados
4. **Transferência**: Stripe Connect para universidade (100% do valor)
5. **Notificação**: N8N envia confirmação por email

### 3.3 Fluxo de Comunicação
1. **Gmail**: `get-gmail-inbox` busca emails
2. **Processamento**: `process-inbox-email` analisa conteúdo
3. **IA**: N8N workflow com OpenAI gera resposta
4. **Envio**: `send-gmail-message` envia resposta automática

## 4. Estrutura de Dados Crítica

### 4.1 Tabelas Principais
- **`universities`**: 935 universidades com dados completos
- **`scholarships`**: 62 bolsas de estudo
- **`user_profiles`**: Perfis com roles (student, school, admin, seller)
- **`scholarship_applications`**: Aplicações de bolsas
- **`student_documents`**: Documentos dos estudantes
- **`stripe_connect_transfers`**: Transferências para universidades

### 4.2 Configurações de IA
- **`ai_configurations`**: Configurações por universidade
- **`university_ai_settings`**: Configurações específicas de IA
- **`ai_agent_knowledge_documents`**: Documentos de conhecimento

## 5. Integrações Externas

### 5.1 Stripe
- **Produtos**: 4 tipos de taxas (application, scholarship, control, selection)
- **Connect**: Transferências automáticas para universidades
- **Webhooks**: Processamento de pagamentos

### 5.2 OpenAI
- **Modelo**: GPT-4 para análise de documentos
- **Uso**: Análise de passport, diploma, comprovante de fundos
- **Configuração**: Via N8N workflows

### 5.3 Gmail API
- **OAuth2**: Autenticação com Google
- **Webhooks**: Processamento automático de emails
- **Respostas**: IA gera respostas automáticas

### 5.4 WhatsApp Business
- **Chatwoot**: Plataforma de chat integrada
- **QR Code**: Conexão via QR code
- **Agentes**: Configuração por universidade

## 6. Variáveis de Ambiente Críticas

```env
# Supabase
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
VITE_STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# OpenAI
OPENAI_API_KEY=

# N8N
N8N_WEBHOOK_URL=

# Google
VITE_GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# WhatsApp
WHATSAPP_API_URL=
CHATWOOT_API_URL=
```

## 7. Pontos Críticos para Replicação

### 7.1 Dependências Externas Obrigatórias
- **Supabase**: Projeto com 50+ tabelas e RLS policies
- **Stripe**: Produtos e preços configurados
- **N8N**: Workflows de automação
- **OpenAI**: API key e modelos
- **Google**: OAuth2 configurado
- **WhatsApp**: Business API ativa

### 7.2 Dados Iniciais Essenciais
- **935 universidades** com dados completos
- **62 bolsas** com configurações
- **Templates de IA** por universidade
- **Configurações de notificação**

### 7.3 Fluxos Críticos
- **Upload → Análise → Aprovação/Revisão**
- **Pagamento → Transferência → Notificação**
- **Email → IA → Resposta Automática**
- **WhatsApp → Chatwoot → Agente IA**

## 8. Arquitetura do Sistema

### 8.1 Frontend
- **Framework**: React 18 + TypeScript + Vite
- **Roteamento**: React Router DOM v6
- **Estilização**: Tailwind CSS
- **Gerenciamento de Estado**: Zustand + Context API
- **Internacionalização**: i18next

### 8.2 Backend
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Supabase Auth
- **Funções Serverless**: 68 Edge Functions
- **Storage**: Supabase Storage para documentos

### 8.3 Integrações
- **Pagamentos**: Stripe + Zelle
- **IA**: OpenAI GPT-4
- **Comunicação**: Gmail API + WhatsApp Business
- **Automação**: N8N workflows

## 9. Sistema de Autenticação e Autorização

### 9.1 Roles e Permissões
```typescript
interface User {
  role: 'student' | 'school' | 'admin' | 'affiliate_admin' | 'seller';
  university_id?: string;
  hasPaidProcess?: boolean;
}
```

### 9.2 Fluxo de Autenticação
1. **Registro**: Criação automática de perfil baseado no role
2. **Login**: Redirecionamento baseado no role do usuário
3. **Verificação**: Validação de termos e perfil completo para universidades
4. **Sessão**: Gerenciamento via Supabase Auth com tokens JWT

## 10. Sistema de Upload e Análise de Documentos

### 10.1 Tipos de Documentos Obrigatórios
```typescript
const DOCUMENT_TYPES = [
  { key: 'passport', label: 'Passport' },
  { key: 'diploma', label: 'High School Diploma' },
  { key: 'funds_proof', label: 'Proof of Funds' }
];
```

### 10.2 Fluxo de Upload
1. **Seleção de Arquivos**: Validação de tipos (PDF, imagens)
2. **Sanitização**: Remoção de caracteres especiais dos nomes
3. **Upload**: Storage no Supabase com estrutura `user_id/document_type-timestamp-filename`
4. **Análise IA**: Chamada para Edge Function `analyze-student-documents`
5. **Processamento**: Integração com N8N para análise via OpenAI
6. **Resultado**: Aprovação automática ou revisão manual

## 11. Sistema de Pagamentos

### 11.1 Integração Stripe
```typescript
export const STRIPE_PRODUCTS = {
  controlFee: { productId: 'prod_SZ3ma6T2b0o702', priceId: 'price_xxx' },
  applicationFee: { productId: 'prod_SZ3nS58QT5NrFL', priceId: 'price_xxx' },
  scholarshipFee: { productId: 'prod_SZ3nMU2XGBe7KD', priceId: 'price_xxx' },
  selectionProcess: { productId: 'prod_SW6LcrOKKbAmbi', priceId: 'price_xxx' }
};
```

### 11.2 Tipos de Taxas
- **Application Fee**: Taxa de processamento da aplicação
- **Scholarship Fee**: Taxa para aplicar a bolsas
- **Control Fee**: Taxa de controle do I-20
- **Selection Process**: Taxa do processo de seleção

## 12. Sistema de Comunicação

### 12.1 WhatsApp Business Integration
- **Conexão**: QR Code para conectar conta WhatsApp
- **Agentes**: Configuração de agentes por universidade
- **Chatwoot**: Integração para gerenciamento de conversas
- **Webhooks**: Processamento automático de mensagens

### 12.2 Gmail Integration
- **OAuth2**: Autenticação com Google
- **Webhooks**: Processamento automático de emails
- **IA**: Respostas automáticas via OpenAI
- **Histórico**: Manutenção de conversas por email

## 13. Sistema de IA e Automação

### 13.1 Configuração de IA por Universidade
```typescript
interface AIConfiguration {
  university_id: string;
  custom_instructions: string;
  response_tone: 'formal' | 'friendly' | 'neutral';
  ai_model: string;
  forward_to_human_triggers: string[];
}
```

### 13.2 Processamento de Emails
- **Análise**: Detecção de triggers para intervenção manual
- **Resposta**: Geração automática via OpenAI
- **Histórico**: Contexto de conversas anteriores
- **Métricas**: Tracking de performance e custos

## 14. Estrutura de Dados e Relacionamentos

### 14.1 Entidades Principais
- **User**: Usuário base com autenticação
- **UserProfile**: Perfil estendido com dados específicos
- **University**: Dados da universidade e configurações
- **Scholarship**: Bolsas de estudo disponíveis
- **Application**: Aplicações de bolsas com status
- **Document**: Documentos e anexos

### 14.2 Relacionamentos Críticos
- User → UserProfile (1:1)
- University → User (1:1) via user_id
- Scholarship → University (N:1)
- Application → UserProfile (N:1)
- Application → Scholarship (N:1)
- Document → User (N:1)

## 15. APIs e Integrações Externas

### 15.1 Supabase Edge Functions
- `analyze-student-documents`: Análise de documentos
- `ai-email-processor`: Processamento de emails
- `notify-university-document-upload`: Notificações
- `process-inbox-document`: Processamento de documentos

### 15.2 Webhooks Externos
- **N8N**: Workflows de automação
- **Stripe**: Confirmação de pagamentos
- **WhatsApp**: Mensagens e status
- **Gmail**: Processamento de emails

## 16. Configuração de Ambiente

### 16.1 Variáveis de Ambiente Críticas
```env
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
VITE_STRIPE_PUBLISHABLE_KEY=
VITE_STRIPE_SECRET_KEY=
VITE_OPENAI_API_KEY=
VITE_GOOGLE_CLIENT_ID=
VITE_WHATSAPP_API_URL=
```

### 16.2 Configurações de Produção
- **Stripe**: Chaves de produção configuradas
- **Supabase**: Projeto em produção
- **Domínios**: URLs de webhook configuradas
- **SSL**: Certificados para produção

## 17. Pontos Críticos para Replicação

### 17.1 Dependências Externas
- **Supabase**: Projeto e configurações
- **Stripe**: Produtos e preços configurados
- **OpenAI**: API key e modelos
- **Google**: OAuth2 configurado
- **WhatsApp**: Business API ativa

### 17.2 Dados Iniciais
- **Universidades**: 935 registros com dados completos
- **Bolsas**: 62 registros com configurações
- **Configurações**: Templates de IA e notificações
- **Permissões**: RLS policies configuradas

### 17.3 Fluxos Críticos
- **Registro de Usuário**: Criação automática de perfil
- **Upload de Documentos**: Validação e análise
- **Processo de Pagamento**: Integração completa
- **Comunicação**: WhatsApp e email funcionais

---

**Data de Criação**: 2025-01-20  
**Versão**: 1.0  
**Autor**: Análise Técnica do Sistema MatriculaUSA
