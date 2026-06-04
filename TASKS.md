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
