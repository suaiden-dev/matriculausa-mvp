# Tarefas para Trello - 17 de Fevereiro de 2026

Este documento contém os títulos e descrições das tarefas realizadas ontem para facilitar a criação de cards no Trello.

---

### [BUG] Correção do Visualizador de Documentos (Admin)
**Descrição:**
Implementado o algoritmo de "Sequential Bucket Fallback" no componente `DocumentViewerModal.tsx`.
- O sistema agora tenta localizar o arquivo em múltiplos buckets (`student-documents`, `document-attachments`, `term-acceptances`, `legal-documents`, `public`) antes de retornar erro.
- Utiliza requisições `HEAD` para verificar a existência do arquivo sem custo de download.
- Resolve erros 400 (Bad Request) e 403 (Forbidden).

---

### [FIX] Restauração Estrutural de `AdminStudentDetails.tsx`
**Descrição:**
Correção de corrupção de código JSX em arquivo crítico de larga escala (+3.500 linhas).
- Fechamento de tags `<div>` órfãs no sub-componente `TabLoadingSkeleton`.
- Restauração da renderização das abas de documentos e histórico financeiro.

---

### [FEAT] Atualização de Taxas do Sistema Simplificado
**Descrição:**
Ajuste da estratégia comercial de preços nas taxas base.
- Valor da Bolsa (`Scholarship Fee`) alterado de $550 para $900.
- Valor de Controle do I-20 (`I-20 Control Fee`) padronizado em $900.
- Atualização da lógica de cálculo no `paymentConverter.ts`.
- Limpeza global de referências hardcoded ao valor antigo de $550.

---

### [FIX] Filtros Financeiros do Dashboard do Vendedor
**Descrição:**
Correção na recuperação de dados financeiros no Seller Dashboard.
- Ajuste na função `getFinancialProcesses` para filtrar corretamente por `seller_id`.
- Agora considera clientes vinculados tanto via `service_requests` quanto via `visa_orders`.
- Garante que o vendedor veja apenas seus próprios rendimentos e processos.

---

### [FIX] Analytics: Mapeamento de Taxas Stripe
**Descrição:**
Ajuste na integração de dados reais do Stripe para o dashboard administrativo.
- Correção no mapeamento de `fee_amount` e `gross_amount` em `financialDataLoader.ts`.
- Priorização de dados de transação real sobre valores estimados.

---

### [UI/UX] Refinamento dos Filtros de Bolsas
**Descrição:**
Melhoria na busca e filtragem de bolsas de estudo.
- Remoção da opção "F1" do filtro de "Work Authorization" (conceitualmente incorreto).
- Otimização do estado "Zero Results": removido título redundante e preservado o estado dos filtros aplicados durante a busca.

---

### [LEGAL] Atualização do Contrato e Termos de Uso
**Descrição:**
Refatoração do componente `StudentTermsAcceptance.tsx` para adequação jurídica.
- Atualização da cláusula 5.2 (Propriedade e Processamento de Dados).
- Implementação de trava de segurança: obriga o scroll completo dos Termos e da Política de Privacidade antes de habilitar o aceite.

---

### [I18N] Internacionalização e SEO
**Descrição:**
Garantia de consistência multilíngue no sistema.
- Substituída string estática "Universities" por chave de tradução `t('nav.universities')` no `Header.tsx`.
- Sincronização e correção de termos nos arquivos `pt.json`, `en.json` e `es.json`.
