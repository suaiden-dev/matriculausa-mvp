# Tasks — Matricula USA MVP

## Task 1 — Placement Fee: Parcelas com Vencimento + Emails de Cobrança

### Lógica de vencimento
- Cada parcela vence **30 dias após o pagamento da parcela anterior**
- Exemplo:
  - 1ª parcela: paga em D
  - 2ª parcela: vence em D + 30
  - 3ª parcela: vence em D + 60 (30 dias após pagamento da 2ª)
  - E assim por diante

### Exibição da data de vencimento
- Mostrar data de vencimento na **tela de payment status** do aluno
- Mostrar data de vencimento nos **cards do kanban**

### Emails de cobrança automática
- No dia do vencimento de cada parcela, às **00:00**, enviar email ao aluno caso ele ainda não tenha pago
- Email deve informar que a parcela venceu / está vencendo naquele dia
- Recorrência: continuar enviando (diariamente? a definir frequência) enquanto a parcela não for paga

---

## Task 2 — Tags de Agência nos Cards do Kanban

- Adicionar tag visível com o nome da agência nos cards do kanban
- Ex: "Brant", e outras agências cadastradas
- Facilitar identificação visual de qual agência é responsável pelo aluno

---

## Task 3 — Alunos a Atualizar (Pendente de Confirmação)

> Aguardando confirmação: esses alunos são da agência Brant? Qual ação deve ser feita — vincular à agência, mudar status ou outra coisa?

| Aluno | Observação |
|---|---|
| Maria Clara Marcial | Awaiting SEVIS Transfer |
| Gerson | — |
| Christianen Marques Meirelles | — |
| Alondra Ciprián Quezada | — |
| Camila Peres Vilacian | — |
| Juliana Vasconcelos Carmo | — |
| Leonardo Sandoval da Rosa | — |
| Camila Maria Luísa Santos de Almeida | — |

---

## Task 4 — Botão "Pular Etapa" no Kanban

- Adicionar botão para avançar o aluno para a próxima etapa manualmente
- Funciona independente de o aluno ter enviado o transfer form
- Útil para casos onde o admin precisa mover o aluno sem aguardar o documento

---

## Task 5 — Agency Dashboard: Ajustes no "How It Works" + Commission Plan

**Arquivo:** `project/src/pages/AgencyDashboard/Overview.tsx` — componente `HowItWorks`

### Mudanças de texto
- Título: `"How the affiliate system works"` → `"How the seller system works"`
- Step 03 título: `"Student completes the flow"` → `"Students complete the admissions process"`
- Step 03 descrição: remover lista de taxas (`"selection process, application, placement, and I-20 control"`) — simplificar para algo como `"The student completes the enrollment process."`
- Step 04 descrição: `"Commissions are credited in your MUSA account."` ✅ feito

### Remover bloco "Commission"
- Remover o card `<div>` com `<h4>Commission</h4>` e o parágrafo explicativo abaixo do grid de steps
- Manter apenas "Sales tracking" e "Withdrawals"

### CommissionPlanCard: ocultar nomes dos estudantes
- No card de comissões (`CommissionPlanCard`), exibir apenas os valores de comissão
- Remover referência a nomes de estudantes individuais (se aparecer)

---

## Task 6 — Payment Management: Taxa de $25 + Solicitar Valor Cheio

**Arquivo:** `project/src/pages/AgencyDashboard/PaymentManagement.tsx`

### Taxa de processamento de $25
- Toda vez que a agência solicitar um payment request, há uma taxa de **$25**
- Exibir aviso claro no modal de payment request informando sobre a taxa
- Inserir link de cobrança (valor = $25) — link a ser fornecido pelo time

### Solicitar valor cheio automaticamente
- Alterar o campo de valor: em vez de o usuário digitar um valor, **preencher automaticamente com o saldo disponível** (valor cheio da comissão)
- Usuário pode ajustar se quiser, mas o padrão é o valor cheio

### Campo "Business Address" no Bank Transfer
- Adicionar campo `Business Address` no formulário de Bank Transfer
- Após campos existentes de banco (bank name, account holder, routing, account number)

---

## Task 7 — Textos: 154 → 150 bolsas

Atualizar número de bolsas de **154** para **150** nos seguintes arquivos:

| Arquivo | Texto atual |
|---|---|
| `src/i18n/locales/pt/registration.json` | `"Tenha acesso a mais de 154 bolsas exclusivas nos EUA."` |
| `src/pages/PreQualificationLanding.tsx` | `'Analisando +154 bolsas no sistema'` |
| `src/pages/SelectionProcessLanding.tsx` | `+154 Bolsas Exclusivas` e `"+154 bolsa exclusivas esperando por você"` |

---

## Task 8 — Oferta Exclusiva: Branding da Agência na Jornada do Aluno

### Conceito
Quando um aluno se registra através do link de uma agência, exibir **logo + nome da agência** como "oferta exclusiva" em pontos-chave da jornada (ex: página de registro, seleção de bolsas, confirmation screen).

### Implementação sugerida
- Ler `affiliate_code` da URL / localStorage no momento do registro
- Buscar logo e nome da agência com base no código
- Exibir branding da agência (logo + nome) no fluxo do aluno como parceria exclusiva

---

## Task 9 — Remover Email de Estudante Específico

- Remover ou anonimizar o email `yen9837@uorak.com` do banco de dados (provavelmente conta de teste)
- Verificar se o aluno tem dados associados (pagamentos, documentos) antes de deletar
- Executar via admin dashboard ou diretamente no Supabase

