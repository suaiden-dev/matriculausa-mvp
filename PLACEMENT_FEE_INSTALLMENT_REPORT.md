# Relatório de Implementação: Parcelamento de Placement Fee

**Data:** 06 de Abril de 2026
**Projeto:** Matricula USA (MVP)
**Status:** Implementação do fluxo Zelle Concluída / Suporte Stripe em progresso.

## 📋 Objetivo
Permitir que alunos selecionados paguem o "Placement Fee" em duas parcelas de 50%. O objetivo é facilitar a entrada do aluno no sistema (desbloqueio do dashboard pós-1ª parcela) enquanto se mantém a segurança do processo (retenção de documentos finais até a quitação total).

---

## 🛠️ Alterações Realizadas

### 1. Camada de Dados (Supabase)
Adicionamos colunas estratégicas à tabela `user_profiles` para gerenciar o estado financeiro do aluno:
- `placement_fee_installment_enabled`: Habilita o modo de parcelamento para o aluno.
- `placement_fee_pending_balance`: Armazena o valor que o aluno ainda deve (ex: US$ 850.00).
- `placement_fee_due_date`: Data de vencimento da segunda parcela (30 dias após a primeira).
- `placement_fee_installment_number`: Rastreia se o aluno pagou 0, 1 ou as 2 parcelas.

### 2. Admin Dashboard (Gestão de Pagamentos)
A interface de revisão de pagamentos Zelle foi atualizada para ser inteligente:
- **ZellePayments.tsx**: Exibe badges informativas como `Part 1/2` na lista de pagamentos pendentes.
- **ZellePaymentReviewModal.tsx**: 
    - Introdução do botão **"Approve as 1st Installment (50%)"**.
    - Lógica de aprovação parcial via orquestrador.
    - Exclusão de botões redundantes (Aprovação Total vs Parcial) baseada no metadata do pagamento enviada pelo aluno.

### 3. Backend e Orquestração (`zelleOrchestrator.ts`)
Implementamos a lógica de transição de estados:
- **`approvePartialZelleFlow`**:
    - Define `is_placement_fee_paid = true` (libera o dashboard).
    - Define `placement_fee_pending_balance = (valor_total / 2)`.
    - Define `placement_fee_installment_number = 1`.
    - Agenda o vencimento para `NOW() + 30 days`.
- **`approveSecondInstallmentFlow`**:
    - Zera o `placement_fee_pending_balance`.
    - Define `placement_fee_installment_number = 2`.
    - Libera formalmente o download de documentos finais.

### 4. Interface do Estudante (Onboarding)
O componente `PlacementFeeStep.tsx` agora reage à configuração do aluno:
- Se `installment_enabled` for **true**:
    - Exibe o valor de **50%** em destaque.
    - Mostra um breakdown: "US$ 850.00 de US$ 1.700,00 total".
    - Exibe um **Banner de Alerta** explicando que os documentos finais só serão liberados após o pagamento da 2ª parcela.

---

## 🚀 Próximos Passos (To-Do)

1.  **Stripe/Parcelow Checkout:** Ajustar `PlacementFeeStep.tsx` para passar o valor de 50% para as APIs do Stripe e Parcelow (atualmente elas ainda cobram o valor cheio).
2.  **Stripe Webhook:** Atualizar a função Edge `stripe-webhook` para processar o metadata `is_installment` e atualizar o saldo pendente automaticamente após a confirmação do cartão/PIX.
3.  **Dashboard Alert:** Criar o componente `PendingBalanceCard.tsx` no dashboard do aluno para que ele veja o saldo devedor e tenha um botão fácil para pagar a 2ª parcela.
4.  **Bloqueio de Downloads:** Validar no componente de documentos se o botão de download está verificando o `placement_fee_pending_balance > 0`.

---
*Relatório gerado automaticamente pelo assistente Antigravity.*
