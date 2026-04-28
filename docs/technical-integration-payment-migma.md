# Especificação Técnica: Integração de Pagamentos Application Fee (Migma → MatriculaUSA)

Este documento detalha a infraestrutura de banco de dados e a lógica de sincronização necessária para integrar o fluxo de pagamento da **Taxa de Matrícula (Application Fee)** iniciado no ecossistema Migma para o projeto **MatriculaUSA**.

## 1. Arquitetura de Dados (MatriculaUSA)

Abaixo estão as estruturas das tabelas envolvidas no processo de confirmação e auditoria de pagamentos.

### 1.1. Tabela: `public.user_profiles`
Esta tabela é o núcleo da identidade do estudante no sistema.

| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `uuid` | **Primary Key**. Usado como `student_id` em outras tabelas. |
| `user_id` | `uuid` | Referência ao `auth.users.id`. Chave de sync principal. |
| `email` | `text` | Email do estudante. |
| `is_application_fee_paid` | `boolean` | Status global de pagamento da taxa (Default: `false`). |
| `application_fee_paid_at` | `timestamptz` | Timestamp do último pagamento da taxa de aplicação. |
| `total_paid` | `numeric` | Acumulado financeiro total do estudante no sistema. |

### 1.2. Tabela: `public.scholarship_applications`
Registra as aplicações específicas para bolsas de estudo. É o alvo principal do Cross-DB Sync.

| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `uuid` | **Primary Key**. Identificador único da aplicação. |
| `student_id` | `uuid` | FK para `user_profiles.id`. |
| `is_application_fee_paid` | `boolean` | Flag de controle da aplicação específica. |
| `application_fee_payment_method` | `text` | Método utilizado (`stripe`, `parcelow`, etc). |
| `paid_at` | `timestamptz` | Data/hora da confirmação do pagamento. |
| `source` | `text` | Origem da aplicação (`matriculausa` ou `migma`). |
| `status` | `text` | Status da aplicação (`pending`, `approved`, etc). |

### 1.3. Tabela: `public.payments` (Auditoria Financeira)
Tabela centralizadora de transações. Essencial para conciliação bancária e relatórios de receita.

| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | `uuid` | **Primary Key**. |
| `student_id` | `uuid` | FK para `user_profiles.id`. |
| `payment_type` | `text` | Deve ser setado como `'application_fee'`. |
| `amount_charged` | `numeric` | Valor bruto cobrado. |
| `status` | `text` | Status da transação (`succeeded`, `failed`, `pending`). |
| `stripe_payment_intent_id` | `text` | ID da transação no gateway (Stripe/Parcelow). |
| `created_at` | `timestamptz` | Data do registro da transação. |

---

## 2. Fluxo de Sincronização e Lógica de Negócio

O fluxo de confirmação de pagamento deve seguir a ordem lógica abaixo para garantir que as triggers do banco de dados sejam disparadas corretamente.

### 2.1. Sequência de Operações (SQL)
Após a confirmação pelo Webhook (Migma), as seguintes operações devem ser replicadas no banco MatriculaUSA via `service_role`:

1.  **Registro Financeiro:**
    ```sql
    INSERT INTO public.payments (student_id, payment_type, amount_charged, status, stripe_payment_intent_id)
    VALUES ('[profile_id]', 'application_fee', [valor], 'succeeded', '[intent_id]');
    ```

2.  **Atualização da Aplicação:**
    ```sql
    UPDATE public.scholarship_applications
    SET 
      is_application_fee_paid = true,
      application_fee_payment_method = '[metodo]',
      paid_at = NOW(),
      source = 'migma'
    WHERE id = '[application_id]';
    ```

3.  **Atualização do Perfil:**
    ```sql
    UPDATE public.user_profiles
    SET 
      is_application_fee_paid = true,
      application_fee_paid_at = NOW()
    WHERE id = '[profile_id]';
    ```

---

## 3. Automações de Banco de Dados (Triggers)

Ao atualizar a tabela `scholarship_applications`, o MatriculaUSA dispara automaticamente os seguintes processos internos:

### 3.1. Sincronização de Afiliados (`Matricula Rewards`)
A função `sync_scholarship_payment_status_to_referral()` é acionada. Ela:
*   Localiza se o aluno foi indicado por um afiliador na tabela `affiliate_referrals`.
*   Atualiza a coluna `application_fee_paid_at` no registro do afiliado.
*   Marca a indicação como pronta para gerar créditos/comissões.

### 3.2. Conciliação com a Universidade
A função `update_university_balance_on_application_payment()` é acionada. Ela:
*   Identifica a universidade vinculada à bolsa (`scholarship_id`).
*   Recalcula o saldo da conta da universidade (`university_balance_accounts`), considerando a taxa de plataforma configurada.

---

## 4. Considerações de Segurança e Integridade

*   **Isolação de Secrets:** O projeto Migma deve utilizar exclusivamente as `SECRET_KEYS` de produção do MatriculaUSA para transações de Application Fee, garantindo que o montante seja creditado na conta bancária correta.
*   **Idempotência:** Recomenda-se que o sync verifique se `is_application_fee_paid` já é `true` antes de processar o crédito, evitando duplicidade em webhooks repetidos.
*   **Ponte de Webhooks:** A Migma atua como "Proxy" de webhook. Em caso de falha no sync Cross-DB, o evento deve ser persistido em uma tabela de log de erros no Migma para reprocessamento manual ou automático.

---
*Documento preparado para alinhamento técnico entre Migma Inc e MatriculaUSA.*
