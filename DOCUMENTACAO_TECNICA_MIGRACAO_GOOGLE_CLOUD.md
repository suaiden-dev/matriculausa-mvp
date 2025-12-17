# 📋 Documentação Técnica - MatriculaUSA Platform
## Preparação para Migração Google Cloud Platform

**Data:** Janeiro 2025  
**Versão:** 1.0  
**Propósito:** Documentação técnica completa do sistema atual para planejamento de migração para Google Cloud Platform

---

## 📑 Índice

1. [Visão Geral do Projeto](#visão-geral-do-projeto)
2. [Arquitetura Atual](#arquitetura-atual)
3. [Stack Tecnológico](#stack-tecnológico)
4. [Serviços e Infraestrutura](#serviços-e-infraestrutura)
5. [Banco de Dados](#banco-de-dados)
6. [Integrações Externas](#integrações-externas)
7. [Funcionalidades Principais](#funcionalidades-principais)
8. [Edge Functions e Serverless](#edge-functions-e-serverless)
9. [Automações e Workflows](#automações-e-workflows)
10. [Requisitos para Migração](#requisitos-para-migração)

---

## 1. Visão Geral do Projeto

### 1.1 Descrição
**MatriculaUSA** é uma plataforma SaaS completa para gestão de processos de matrícula de estudantes internacionais em universidades dos Estados Unidos. O sistema conecta estudantes, universidades, vendedores (sellers) e administradores de afiliados em um ecossistema integrado.

### 1.2 Principais Funcionalidades
- **Gestão de Aplicações de Estudantes**: Processo completo de candidatura e matrícula
- **Sistema de Pagamentos**: Integração com Stripe (cartão de crédito) e Zelle (transferências)
- **Gestão de Documentos**: Upload, validação e processamento de documentos acadêmicos
- **Sistema de Email Inteligente**: Processamento automático de emails com IA (Gemini)
- **Chat e Comunicação**: Integração com Chatwoot e WhatsApp para atendimento
- **Sistema de Afiliados**: Gestão de vendedores, códigos de referência e comissões
- **Dashboard Multi-tenant**: Dashboards específicos para estudantes, universidades, sellers e admins

### 1.3 Usuários do Sistema
- **Estudantes**: Candidatos internacionais
- **Universidades**: Instituições de ensino superior
- **Sellers**: Vendedores/afiliados que recrutam estudantes
- **Affiliate Admins**: Administradores de grupos de sellers
- **System Admins**: Administradores da plataforma

---

## 2. Arquitetura Atual

### 2.1 Arquitetura Geral

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React + Vite)                   │
│  Deploy: Netlify (matriculausa.com)                         │
│  - React 18.3.1                                             │
│  - TypeScript                                               │
│  - Vite 5.3.5                                               │
│  - TailwindCSS                                              │
└─────────────────────────────────────────────────────────────┘
                            │
                            │ HTTPS
                            ▼
┌─────────────────────────────────────────────────────────────┐
│              SUPABASE (Backend as a Service)                │
│  - PostgreSQL Database                                      │
│  - Authentication (Supabase Auth)                           │
│  - Edge Functions (Deno Runtime)                            │
│  - Storage (Documentos, imagens)                            │
│  - Real-time Subscriptions                                  │
│  - Row Level Security (RLS)                                 │
└─────────────────────────────────────────────────────────────┘
                            │
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   STRIPE     │  │   N8N         │  │  MICROSOFT   │
│  (Payments)  │  │  (Workflows)  │  │  GRAPH API   │
└──────────────┘  └──────────────┘  └──────────────┘
        │                   │                   │
        ▼                   ▼                   ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   GMAIL      │  │  CHATWOOT    │  │   GEMINI AI  │
│   API        │  │  (Chat)      │  │  (Email AI)  │
└──────────────┘  └──────────────┘  └──────────────┘
```

### 2.2 Fluxo de Dados Principal

1. **Frontend (Netlify)** → Requisições HTTPS → **Supabase API**
2. **Supabase Edge Functions** → Processam lógica de negócio
3. **Supabase Database** → Armazena dados principais
4. **Webhooks Externos** → Stripe, n8n, Microsoft Graph
5. **Polling Services** → Verificação periódica de emails (Microsoft/Gmail)

---

## 3. Stack Tecnológico

### 3.1 Frontend

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| React | 18.3.1 | Framework principal |
| TypeScript | 5.5.4 | Tipagem estática |
| Vite | 5.3.5 | Build tool e dev server |
| React Router | 6.26.0 | Roteamento |
| TanStack Query | 5.90.8 | Gerenciamento de estado servidor |
| Zustand | 5.0.7 | Gerenciamento de estado cliente |
| TailwindCSS | 3.4.6 | Estilização |
| Material-UI | 7.3.2 | Componentes UI |
| Framer Motion | 12.23.24 | Animações |
| Chart.js / Recharts | - | Gráficos e visualizações |

### 3.2 Backend / Edge Functions

| Tecnologia | Versão | Uso |
|------------|--------|-----|
| Deno | Runtime | Edge Functions (Supabase) |
| TypeScript | - | Edge Functions |
| Supabase JS | 2.39.0+ | Cliente Supabase |
| Stripe SDK | 17.7.0 | Processamento de pagamentos |
| Microsoft Graph SDK | 3.0.7 | Integração com Microsoft 365 |

### 3.3 Banco de Dados

| Tecnologia | Detalhes |
|------------|----------|
| PostgreSQL | Gerenciado pelo Supabase |
| Supabase Auth | Sistema de autenticação |
| Row Level Security | Políticas de segurança por linha |
| PostgreSQL Functions | Funções SQL customizadas (RPC) |
| Triggers | Triggers para automações |

### 3.4 Infraestrutura Atual

| Serviço | Provedor | Uso |
|---------|----------|-----|
| Frontend Hosting | Netlify | Deploy do frontend |
| Backend/Database | Supabase | Backend completo |
| Edge Functions | Supabase | Funções serverless |
| Storage | Supabase Storage | Arquivos e documentos |
| CDN | Netlify CDN | Distribuição de assets |
| Email Processing | n8n + Microsoft Graph | Processamento de emails |
| Workflows | n8n | Automações e integrações |

---

## 4. Serviços e Infraestrutura

### 4.1 Supabase (Backend Principal)

**URL:** `https://fitpynguasqqutuhzifx.supabase.co`

#### Componentes Utilizados:

1. **PostgreSQL Database**
   - Banco de dados relacional principal
   - 191+ migrations SQL
   - Triggers e stored procedures
   - Row Level Security (RLS) habilitado

2. **Supabase Auth**
   - Autenticação de usuários
   - OAuth (Google, Microsoft)
   - JWT tokens
   - Gerenciamento de sessões

3. **Edge Functions (Deno)**
   - 80+ Edge Functions
   - Runtime: Deno
   - Deploy via Supabase CLI
   - Variáveis de ambiente configuradas no dashboard

4. **Storage**
   - Armazenamento de documentos
   - Upload de imagens de perfil
   - Buckets configurados:
     - `university-profile-pictures`
     - `student-documents`
     - `knowledge-documents`

5. **Real-time**
   - Subscriptions para chat
   - Notificações em tempo real
   - WebSocket connections

### 4.2 Netlify (Frontend Hosting)

**URL Produção:** `https://matriculausa.com`  
**URL Staging:** `staging-matriculausa.netlify.app`

#### Configurações:

- **Build Command:** `cd project && npm run build:netlify`
- **Publish Directory:** `project/dist`
- **Node Version:** 18
- **Memory:** 4096MB (max_old_space_size)
- **Functions:** Netlify Functions (serverless)
  - `project/netlify/functions/api.js` - API de polling de emails

#### Netlify Functions:

```javascript
// project/netlify/functions/api.js
- GET /api/polling-user - Status do polling
- POST /api/polling-user - Iniciar polling
- PUT /api/polling-user - Processar emails
```

### 4.3 n8n (Automação e Workflows)

**URL:** `https://nwh.suaiden.com`

#### Webhooks Configurados:

1. **Email Processing:**
   - `/webhook/47d6d50c-46d1-4b34-9405-de321686dcbc` - Processamento de emails Gmail
   - `/webhook/ai-email-webhook` - Processamento de emails com IA

2. **Chatwoot Integration:**
   - `/webhook/wootchat` - Criação de contas Chatwoot

3. **WhatsApp Integration:**
   - `/webhook/gerar_qr_code_whastapp_matriculausa` - Geração de QR Code WhatsApp

4. **Zelle Payments:**
   - `/webhook/zelle-global` - Validação de pagamentos Zelle

5. **Notifications:**
   - Múltiplos webhooks para notificações de universidades
   - Notificações de pagamentos
   - Notificações de documentos

#### Funcionalidades n8n:

- Processamento automático de emails recebidos
- Geração de respostas automáticas com IA
- Integração com Chatwoot para chat
- Validação de pagamentos Zelle
- Notificações para universidades e administradores

### 4.4 Stripe (Pagamentos)

#### Configuração:

- **Stripe Connect:** Habilitado para universidades
- **Ambientes:** Test (staging) e Live (produção)
- **Webhooks:** Configurados no Supabase Edge Functions

#### Tipos de Pagamento:

1. **Application Fee** - Taxa de aplicação
2. **Scholarship Fee** - Taxa de bolsa
3. **Selection Process Fee** - Taxa de processo seletivo
4. **I20 Control Fee** - Taxa de controle I-20
5. **EB3 Fee** - Taxa EB-3

#### Edge Functions Stripe:

- `stripe-checkout-*` - Criação de sessões de checkout
- `stripe-webhook` - Processamento de webhooks
- `verify-stripe-session-*` - Verificação de pagamentos
- `initiate-stripe-connect` - Setup Stripe Connect
- `process-stripe-connect-*` - Gestão Stripe Connect

### 4.5 Microsoft Graph API (Email)

#### Integrações:

1. **Microsoft 365 Email**
   - Leitura de emails
   - Envio de emails
   - Anexos e documentos
   - Polling automático de inbox

2. **Microsoft Authentication**
   - OAuth 2.0
   - MSAL (Microsoft Authentication Library)
   - Refresh tokens automático

3. **Edge Functions Microsoft:**

   - `microsoft-email-polling` - Polling periódico de emails
   - `microsoft-token-refresh` - Renovação de tokens (cron)
   - `microsoft-auth-callback` - Callback OAuth
   - `process-inbox-email` - Processamento de emails recebidos

#### Configuração:

- **Client ID:** Configurado no Supabase Secrets
- **Client Secret:** Configurado no Supabase Secrets
- **Tenant ID:** Configurado (ou 'common')
- **Scopes:** `Mail.Read`, `Mail.ReadWrite`, `Mail.Send`, `User.Read`

### 4.6 Gmail API (Email Alternativo)

#### Integrações:

1. **Gmail Watch API**
   - Push notifications via Pub/Sub
   - Google Cloud Functions para processamento

2. **Google Cloud Functions:**
   - `gmail-webhook` - Processa notificações Gmail
   - Localização: `project/cloud-functions/gmail-webhook/`

3. **Edge Functions Gmail:**
   - `setup-gmail-watch` - Configurar watch
   - `setup-all-gmail-watches` - Setup em massa
   - `get-gmail-inbox` - Buscar inbox
   - `get-gmail-attachment` - Buscar anexos
   - `send-gmail-message` - Enviar emails

### 4.7 Google Gemini AI (Processamento de Emails)

#### Uso:

- **Análise de emails recebidos**
- **Geração de respostas automáticas**
- **Classificação de emails**
- **Extração de informações**

#### Configuração:

- **API Key:** Configurado no Supabase Secrets (`GEMINI_API_KEY`)
- **Edge Functions:**
  - `ai-email-processor` - Processamento com IA
  - `process-inbox-email` - Usa Gemini para análise

### 4.8 Chatwoot (Chat e Atendimento)

#### Integração:

- **Criação automática de contas** via webhook n8n
- **Integração com WhatsApp** para atendimento
- **QR Code generation** para conexão WhatsApp
- **Edge Function:** `integrate-chatwoot-qr`

#### Webhook n8n:
- `/webhook/wootchat` - Criação de contas

### 4.9 Zelle (Pagamentos Alternativos)

#### Integração:

- **Validação de pagamentos** via n8n
- **Aprovação automática** de pagamentos
- **Edge Functions:**
  - `create-zelle-payment` - Criar pagamento
  - `validate-zelle-payment-result` - Validar resultado
  - `approve-zelle-payment-automatic` - Aprovação automática
  - `zelle-payment-manager` - Gestão geral

#### Webhook n8n:
- `/webhook/zelle-global` - Validação de pagamentos

---

## 5. Banco de Dados

### 5.1 Estrutura Principal

#### Tabelas Principais (191+ migrations):

**Autenticação e Usuários:**
- `auth.users` - Usuários do Supabase Auth
- `user_profiles` - Perfis de usuários
- `user_cart` - Carrinho de compras
- `comprehensive_term_acceptance` - Aceitação de termos

**Universidades:**
- `universities` - Dados das universidades
- `university_fee_configurations` - Configurações de taxas
- `university_knowledge_documents` - Base de conhecimento
- `university_messages` - Mensagens universidade-estudante

**Estudantes e Aplicações:**
- `student_applications` - Aplicações de estudantes
- `scholarship_applications` - Aplicações para bolsas
- `scholarships` - Bolsas disponíveis
- `student_documents` - Documentos dos estudantes

**Pagamentos:**
- `individual_fee_payments` - Pagamentos individuais
- `stripe_connect_accounts` - Contas Stripe Connect
- `zelle_payments` - Pagamentos Zelle
- `payment_logs` - Logs de pagamentos

**Afiliados:**
- `sellers` - Vendedores/afiliados
- `affiliate_admins` - Administradores de afiliados
- `affiliate_referrals` - Referências de afiliados
- `used_referral_codes` - Códigos de referência usados
- `affiliate_referrals` - Sistema de referências

**Email e Comunicação:**
- `email_connections` - Conexões de email (Gmail/Microsoft)
- `email_messages` - Mensagens de email processadas
- `ai_email_agents` - Agentes de IA para email
- `email_rate_limits` - Limites de taxa de email
- `processed_microsoft_emails` - Emails Microsoft processados

**Chat e Notificações:**
- `chatwoot_accounts` - Contas Chatwoot
- `application_messages` - Mensagens de aplicação
- `student_notifications` - Notificações de estudantes
- `unread_messages` - Mensagens não lidas

**Documentos e Conhecimento:**
- `knowledge_documents` - Base de conhecimento
- `document_requests` - Solicitações de documentos
- `university_knowledge_documents` - Conhecimento por universidade

**Sistema:**
- `student_action_logs` - Logs de ações
- `worker_locks` - Locks para workers
- `utm_attributions` - Rastreamento UTM
- `promotional_coupons` - Cupons promocionais

### 5.2 Funções SQL (RPC)

Principais funções customizadas:

- `get_user_fee_overrides` - Overrides de taxas
- `insert_individual_fee_payment` - Inserir pagamento
- `log_student_action` - Log de ações
- `add_coins_to_user_matricula` - Sistema de moedas
- `get_admin_student_full_details` - Detalhes completos
- `get_admin_student_secondary_data` - Dados secundários

### 5.3 Triggers e Automações

- **Triggers de criação de perfil** ao criar usuário
- **Triggers de atualização** para logs
- **Cron Jobs** (via Supabase):
  - `microsoft-token-refresh` - Renovação de tokens
  - `microsoft-email-polling` - Polling de emails

### 5.4 Row Level Security (RLS)

- Políticas RLS configuradas em todas as tabelas
- Acesso baseado em roles (student, university, seller, admin)
- Segurança por tenant (universidade)

---

## 6. Integrações Externas

### 6.1 APIs de Terceiros

| Serviço | Tipo | Uso |
|---------|------|-----|
| **Stripe API** | Pagamentos | Processamento de cartões e Stripe Connect |
| **Microsoft Graph API** | Email/Office | Leitura e envio de emails, autenticação |
| **Gmail API** | Email | Leitura e envio de emails Gmail |
| **Google Gemini AI** | IA | Processamento e resposta automática de emails |
| **Chatwoot API** | Chat | Sistema de chat e atendimento |
| **WhatsApp Business API** | Mensagens | Atendimento via WhatsApp (via Chatwoot) |
| **n8n Webhooks** | Automação | Workflows e processamento |

### 6.2 OAuth Providers

1. **Google OAuth**
   - Login com Google
   - Acesso ao Gmail
   - Edge Function: `google-oauth-callback`

2. **Microsoft OAuth**
   - Login com Microsoft
   - Acesso ao Microsoft 365
   - Edge Function: `microsoft-auth-callback`

### 6.3 Webhooks Recebidos

1. **Stripe Webhooks:**
   - `checkout.session.completed`
   - `payment_intent.succeeded`
   - `account.updated` (Stripe Connect)

2. **n8n Webhooks:**
   - Validação de pagamentos Zelle
   - Processamento de emails
   - Notificações

3. **Google Pub/Sub:**
   - Notificações Gmail (via Cloud Function)

---

## 7. Funcionalidades Principais

### 7.1 Gestão de Estudantes

- **Perfil de Estudante:**
  - Cadastro completo
  - Upload de documentos
  - Histórico de aplicações
  - Status de pagamentos

- **Aplicações:**
  - Criação de aplicações
  - Seleção de bolsas
  - Upload de documentos
  - Acompanhamento de status

- **Pagamentos:**
  - Application Fee
  - Scholarship Fee
  - Selection Process Fee
  - I20 Control Fee
  - Múltiplos métodos (Stripe, Zelle, PIX)

### 7.2 Gestão de Universidades

- **Dashboard Universitário:**
  - Visão geral de estudantes
  - Gestão de aplicações
  - Configuração de taxas (Stripe Connect)
  - Base de conhecimento

- **Email Inteligente:**
  - Conexão com Microsoft 365 ou Gmail
  - Processamento automático com IA
  - Respostas automáticas
  - Gestão de inbox

- **Documentos:**
  - Solicitação de documentos
  - Validação automática
  - Base de conhecimento por universidade

### 7.3 Sistema de Afiliados

- **Sellers (Vendedores):**
  - Cadastro e gestão
  - Códigos de referência
  - Dashboard de performance
  - Gestão de estudantes

- **Affiliate Admins:**
  - Gestão de grupos de sellers
  - Analytics e relatórios
  - Configuração de comissões
  - Rastreamento UTM

- **Sistema de Referências:**
  - Códigos de referência únicos
  - Rastreamento de conversões
  - Sistema de recompensas (moedas)

### 7.4 Sistema de Pagamentos

- **Stripe:**
  - Checkout hospedado
  - Stripe Connect para universidades
  - Múltiplos tipos de taxas
  - Webhooks para confirmação

- **Zelle:**
  - Criação de pagamentos
  - Validação via n8n
  - Aprovação automática
  - Integração com dashboard

- **PIX:**
  - Suporte para pagamentos PIX
  - Rastreamento de status

### 7.5 Sistema de Email Inteligente

- **Processamento Automático:**
  - Polling de emails (Microsoft/Gmail)
  - Análise com Gemini AI
  - Classificação automática
  - Geração de respostas

- **Base de Conhecimento:**
  - Upload de documentos
  - Contexto para IA
  - Respostas contextualizadas

- **Rate Limiting:**
  - Controle de taxa de envio
  - Prevenção de spam
  - Gestão de filas

### 7.6 Chat e Comunicação

- **Chatwoot:**
  - Integração completa
  - Criação automática de contas
  - Chat integrado na plataforma

- **WhatsApp:**
  - Conexão via Chatwoot
  - QR Code para conexão
  - Atendimento automatizado

- **Mensagens Internas:**
  - Chat estudante-universidade
  - Notificações em tempo real
  - Histórico de conversas

---

## 8. Edge Functions e Serverless

### 8.1 Supabase Edge Functions (80+)

#### Categorias de Functions:

**Pagamentos:**
- `stripe-checkout-*` (5 functions)
- `stripe-webhook`
- `verify-stripe-session-*` (5 functions)
- `initiate-stripe-connect`
- `process-stripe-connect-*`
- `create-zelle-payment`
- `validate-zelle-payment-result`
- `approve-zelle-payment-automatic`
- `zelle-payment-manager`

**Email:**
- `microsoft-email-polling`
- `microsoft-token-refresh`
- `process-inbox-email`
- `process-new-emails`
- `check-unread-emails`
- `send-email`
- `send-smtp-email`
- `email-queue-worker`
- `ai-email-processor`

**Gmail:**
- `setup-gmail-watch`
- `setup-all-gmail-watches`
- `get-gmail-inbox`
- `get-gmail-attachment`
- `send-gmail-message`
- `get-gmail-token`

**Microsoft:**
- `microsoft-auth-callback`
- `microsoft-document-upload`
- `microsoft-email-polling`
- `microsoft-token-refresh`

**Documentos:**
- `create-document-request`
- `process-inbox-document`
- `transcribe-email-document`
- `transcribe-university-document`
- `upload-inbox-knowledge`
- `upload-university-knowledge`
- `remove-document-from-knowledge`

**Notificações:**
- `notify-university-*` (7 functions)
- `forward-notification-to-n8n`
- `notify-n8n-new-email`
- `create-student-notification`
- `send-email-notifications`

**Chat e Comunicação:**
- `integrate-chatwoot-qr`
- `save-chatwoot-account`
- `send-application-message`
- `list-application-messages`
- `list-admin-student-messages`
- `delete-application-message`
- `edit-application-message`

**Sistema:**
- `validate-referral-code`
- `validate-promotional-coupon`
- `process-registration-coupon`
- `sync-affiliate-codes`
- `export-payments-csv`
- `batch-payment-data`
- `auto-confirm-student-email`

**Google OAuth:**
- `google-oauth-callback`
- `exchange-oauth-code`

**Utilitários:**
- `proxy-image`
- `test-ok`
- `test-auth`
- `get-payment-intent-info`

### 8.2 Netlify Functions

- `api.js` - API de polling de emails
  - Endpoints: `/api/polling-user`

### 8.3 Google Cloud Functions

- `gmail-webhook` - Processa notificações Gmail via Pub/Sub
  - Localização: `project/cloud-functions/gmail-webhook/`
  - Runtime: Node.js 18
  - Trigger: Pub/Sub topic `gmail-notifications`

---

## 9. Automações e Workflows

### 9.1 Cron Jobs (Supabase)

1. **microsoft-token-refresh**
   - Frequência: Diária
   - Função: Renovar tokens Microsoft OAuth
   - Edge Function: `microsoft-token-refresh`

2. **microsoft-email-polling**
   - Frequência: Periódica (configurável)
   - Função: Verificar novos emails
   - Edge Function: `microsoft-email-polling`

### 9.2 Workflows n8n

1. **Email Processing Workflow:**
   - Recebe emails via webhook
   - Processa com IA (Gemini)
   - Gera respostas automáticas
   - Envia notificações

2. **Zelle Payment Validation:**
   - Recebe dados de pagamento
   - Valida com banco
   - Aprova/rejeita automaticamente
   - Notifica sistema

3. **Chatwoot Account Creation:**
   - Cria contas Chatwoot
   - Configura WhatsApp
   - Gera QR Code

4. **University Notifications:**
   - Notifica universidades sobre eventos
   - Pagamentos recebidos
   - Documentos enviados
   - Status de aplicações

### 9.3 Triggers de Banco de Dados

- **Auto-criação de perfil** ao criar usuário
- **Logs automáticos** de ações
- **Atualizações de status** em cascata

---

## 10. Requisitos para Migração

### 10.1 Infraestrutura Necessária

#### Google Cloud Platform - Serviços Recomendados:

1. **Compute:**
   - **Cloud Run** - Para Edge Functions (substituir Supabase Edge Functions)
   - **Cloud Functions (2nd gen)** - Para funções serverless
   - **App Engine** - Opcional para aplicações long-running

2. **Banco de Dados:**
   - **Cloud SQL (PostgreSQL)** - Migrar banco Supabase
   - **Cloud Spanner** - Opcional para escala global
   - **Firestore** - Opcional para dados NoSQL

3. **Storage:**
   - **Cloud Storage** - Substituir Supabase Storage
   - **Cloud CDN** - Para distribuição de assets

4. **Networking:**
   - **Cloud Load Balancing** - Balanceamento de carga
   - **Cloud CDN** - CDN global
   - **VPC** - Rede privada virtual

5. **Autenticação:**
   - **Firebase Auth** ou **Identity Platform** - Substituir Supabase Auth
   - **Cloud IAM** - Gerenciamento de acesso

6. **Serverless e Eventos:**
   - **Pub/Sub** - Para webhooks e eventos (já usado para Gmail)
   - **Eventarc** - Eventos de Cloud Storage, etc.
   - **Cloud Scheduler** - Para cron jobs

7. **Monitoramento:**
   - **Cloud Monitoring** - Métricas e alertas
   - **Cloud Logging** - Logs centralizados
   - **Error Reporting** - Detecção de erros
   - **Trace** - Rastreamento de requisições

8. **Segurança:**
   - **Cloud Armor** - Proteção DDoS
   - **Secret Manager** - Gerenciamento de secrets
   - **Cloud KMS** - Criptografia de dados

9. **CI/CD:**
   - **Cloud Build** - Build e deploy
   - **Artifact Registry** - Repositório de imagens
   - **Cloud Deploy** - Deploy automatizado

10. **AI/ML:**
    - **Vertex AI** - Para processamento de emails (substituir Gemini API direto)
    - **Document AI** - Processamento de documentos
    - **Translation API** - Tradução (se necessário)

### 10.2 Migração de Componentes

#### 1. Frontend (Netlify → GCP)

**Opções:**
- **Firebase Hosting** - Hosting estático
- **Cloud Storage + Cloud CDN** - Hosting customizado
- **App Engine** - Se precisar de SSR

**Ações:**
- Migrar build para Cloud Build
- Configurar Cloud CDN
- Migrar domínio para GCP

#### 2. Backend (Supabase → GCP)

**PostgreSQL:**
- Exportar schema e dados do Supabase
- Criar instância Cloud SQL PostgreSQL
- Importar dados
- Configurar backups automáticos

**Edge Functions:**
- Converter Deno Edge Functions para Cloud Run
- Ou usar Cloud Functions (2nd gen)
- Configurar variáveis de ambiente no Secret Manager
- Configurar triggers (HTTP, Pub/Sub, etc.)

**Auth:**
- Migrar usuários para Firebase Auth ou Identity Platform
- Configurar OAuth providers (Google, Microsoft)
- Migrar tokens e sessões

**Storage:**
- Migrar arquivos para Cloud Storage
- Configurar buckets públicos/privados
- Migrar URLs de acesso

**Real-time:**
- Implementar com Pub/Sub + WebSockets
- Ou usar Firebase Realtime Database
- Migrar subscriptions

#### 3. Integrações Externas

**Stripe:**
- Manter integração (não muda)
- Atualizar webhook URLs para GCP
- Configurar Cloud Functions para webhooks

**Microsoft Graph:**
- Manter integração (não muda)
- Migrar Edge Functions para Cloud Run
- Configurar cron jobs no Cloud Scheduler

**Gmail API:**
- Já usa Google Cloud Functions
- Manter Pub/Sub topic
- Atualizar Cloud Function se necessário

**n8n:**
- Manter integração (não muda)
- Atualizar webhook URLs para GCP
- Configurar endpoints no Cloud Run

**Chatwoot:**
- Manter integração (não muda)
- Atualizar webhook URLs

**Gemini AI:**
- Considerar migrar para Vertex AI
- Ou manter API direta do Gemini
- Configurar no Secret Manager

#### 4. Automações

**Cron Jobs:**
- Migrar para Cloud Scheduler
- Configurar triggers HTTP ou Pub/Sub

**Workflows n8n:**
- Manter n8n (pode hospedar no GCP)
- Ou migrar para Cloud Workflows
- Atualizar endpoints

### 10.3 Variáveis de Ambiente e Secrets

**Migrar para Secret Manager:**
- `SUPABASE_URL` → Não necessário (será GCP)
- `SUPABASE_SERVICE_ROLE_KEY` → Substituir por Service Account
- `STRIPE_SECRET_KEY_*` → Secret Manager
- `STRIPE_WEBHOOK_SECRET_*` → Secret Manager
- `MICROSOFT_CLIENT_ID` → Secret Manager
- `MICROSOFT_CLIENT_SECRET` → Secret Manager
- `GEMINI_API_KEY` → Secret Manager
- `N8N_WEBHOOK_URLS` → Secret Manager
- Outras chaves de API

### 10.4 Monitoramento e Logs

**Configurar:**
- Cloud Monitoring para métricas
- Cloud Logging para logs centralizados
- Alertas para erros críticos
- Dashboards customizados
- Uptime checks

### 10.5 Segurança

**Implementar:**
- Cloud Armor para proteção DDoS
- WAF (Web Application Firewall)
- SSL/TLS certificates (via GCP)
- IAM roles e permissions
- VPC para isolamento
- Encryption at rest e in transit

### 10.6 Backup e Disaster Recovery

**Configurar:**
- Backups automáticos do Cloud SQL
- Backup de Cloud Storage
- Point-in-time recovery
- Disaster recovery plan
- Multi-region deployment (opcional)

### 10.7 Custos Estimados

**Considerações:**
- Cloud SQL: Baseado em instância e storage
- Cloud Run: Baseado em invocações e CPU/memória
- Cloud Storage: Baseado em storage e egress
- Cloud CDN: Baseado em egress
- Pub/Sub: Baseado em mensagens
- Cloud Functions: Baseado em invocações
- Vertex AI: Baseado em uso de API

**Otimizações:**
- Usar commitments para descontos
- Configurar autoscaling adequado
- Usar Cloud CDN para reduzir egress
- Otimizar queries do banco

---

## 11. Checklist de Migração

### Fase 1: Preparação
- [ ] Mapear todas as dependências
- [ ] Documentar todos os endpoints
- [ ] Listar todas as variáveis de ambiente
- [ ] Criar plano de rollback
- [ ] Configurar ambiente de staging no GCP

### Fase 2: Infraestrutura Base
- [ ] Criar projeto GCP
- [ ] Configurar VPC e networking
- [ ] Criar Cloud SQL PostgreSQL
- [ ] Configurar Cloud Storage buckets
- [ ] Configurar Cloud CDN
- [ ] Configurar Secret Manager

### Fase 3: Migração de Dados
- [ ] Exportar dados do Supabase
- [ ] Importar para Cloud SQL
- [ ] Migrar arquivos para Cloud Storage
- [ ] Validar integridade dos dados

### Fase 4: Migração de Código
- [ ] Converter Edge Functions para Cloud Run
- [ ] Migrar frontend para Firebase Hosting/Cloud Storage
- [ ] Atualizar variáveis de ambiente
- [ ] Configurar CI/CD

### Fase 5: Integrações
- [ ] Atualizar webhook URLs
- [ ] Configurar OAuth providers
- [ ] Migrar cron jobs para Cloud Scheduler
- [ ] Testar todas as integrações

### Fase 6: Testes
- [ ] Testes de funcionalidade
- [ ] Testes de performance
- [ ] Testes de segurança
- [ ] Testes de carga

### Fase 7: Deploy
- [ ] Deploy em staging
- [ ] Validação completa
- [ ] Deploy em produção
- [ ] Monitoramento pós-deploy

### Fase 8: Otimização
- [ ] Otimizar custos
- [ ] Ajustar autoscaling
- [ ] Otimizar queries
- [ ] Configurar alertas

---

## 12. Contatos e Recursos

### URLs Importantes:

- **Produção:** https://matriculausa.com
- **Staging:** staging-matriculausa.netlify.app
- **Supabase:** https://fitpynguasqqutuhzifx.supabase.co
- **n8n:** https://nwh.suaiden.com

### Documentação Técnica:

- Supabase Docs: https://supabase.com/docs
- Google Cloud Docs: https://cloud.google.com/docs
- Stripe Docs: https://stripe.com/docs
- Microsoft Graph Docs: https://docs.microsoft.com/graph

---

## 13. Observações Importantes

### 13.1 Dependências Críticas

1. **Supabase Auth** - Sistema de autenticação completo, precisa migrar usuários
2. **Row Level Security** - Políticas RLS precisam ser recriadas no PostgreSQL
3. **Real-time Subscriptions** - Precisa implementar alternativa (Pub/Sub + WebSockets)
4. **Edge Functions Deno** - Precisa converter para Node.js ou manter Deno no Cloud Run

### 13.2 Pontos de Atenção

- **Downtime durante migração** - Planejar janela de manutenção
- **Migração de usuários** - Não perder sessões ativas
- **Webhooks externos** - Atualizar URLs em todos os serviços
- **Cron jobs** - Não perder agendamentos
- **Storage URLs** - Atualizar todas as referências

### 13.3 Recomendações

1. **Fazer migração gradual** - Por componente
2. **Manter Supabase paralelo** - Durante período de transição
3. **Testar extensivamente** - Em ambiente staging
4. **Monitorar de perto** - Após migração
5. **Ter plano de rollback** - Caso necessário

---

**Documento criado em:** Janeiro 2025  
**Última atualização:** Janeiro 2025  
**Versão:** 1.0

---

*Este documento serve como base técnica para o planejamento da migração do MatriculaUSA para Google Cloud Platform. Recomenda-se revisão e atualização conforme o projeto avança.*

