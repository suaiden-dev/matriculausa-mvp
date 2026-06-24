# Translation SaaS — Kanban

## 🔴 Blocker (precisa antes de tudo)

- Confirmar API Key da Alpha Translations com o time
- Definir preço por página (R$ ou USD?)
- Confirmar com dev n8n: o webhook `verify-english` já está em produção e estável?
- Decidir: PayPal apenas, ou Zelle também desde o início?

---

## 📋 Backlog

### Banco de Dados
- Criar tabela `translation_orders` no Supabase (migration)
- Criar RLS policies para `translation_orders` (aluno vê só os próprios, admin vê todos)
- Criar índices em `student_id`, `alpha_project_number`, `translation_status`

### Backend — Integração n8n
- Implementar chamada ao webhook `verify-english` após upload em `DocumentRequestsCard.tsx`
- Tratar resposta: `false` → disparar fluxo de cotação, `true` → nenhuma ação
- Garantir que a URL enviada ao n8n é pública (não assinada) — ou usar signed URL (n8n já converte)

### Backend — Edge Functions
- Criar edge function `send-to-alpha` (adaptar do Lush New)
- Criar edge function `sync-alpha-status` com cron a cada 10min (adaptar do Lush New)
- Criar edge function `create-paypal-order` para translation (adaptar do Lush New)
- Criar edge function `capture-paypal-order` para translation (adaptar do Lush New)
- Criar edge function `approve-zelle-payment` para translation (adaptar do Lush New)
- Configurar `ALPHA_API_KEY` no Supabase Vault

### Frontend — Aluno
- Criar modal de cotação: exibe páginas detectadas + valor + seleção de método de pagamento
- Criar contagem de páginas do PDF no frontend (adaptar `pdf-pages.ts` do Lush New)
- Criar página `TranslationsPage.tsx` em `/dashboard/translations`
  - Lista de pedidos de tradução com status
  - Badge de status (`Em Tradução`, `Em Certificação`, `Finalizado`)
  - Countdown de 60 dias para documentos entregues
  - Botão de download / visualização do arquivo traduzido
- Adicionar link "Translations" na navegação do dashboard do aluno

### Frontend — Admin
- Criar página `AdminTranslationsPage.tsx` em `/admin/dashboard/translations`
  - Visão geral de todas as traduções (todos os alunos)
  - Filtros por status, data, aluno
  - Botão de sync manual de status (trigger do `sync-alpha-status`)
- Adicionar link "Translations" na navegação do admin

### Notificações
- Email para aluno quando tradução for concluída (`translation_status === "Finalizado"`)
- Notificação in-app para aluno em cada mudança de status relevante

---

## 🔄 Em andamento

*(vazio — nada iniciado)*

---

## ✅ Concluído

- Mapeamento do fluxo Lush New
- Documentação da Alpha Translations API
- Documentação do webhook n8n `verify-english`
- Feature spec completa (`docs/translation-saas-feature.md`)
