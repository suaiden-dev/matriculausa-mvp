# Documentação do Sistema de Cupons - Matricula USA

Este documento detalha completamente a implementação do sistema de cupons do projeto Matricula USA. O sistema é híbrido, composto por dois subsistemas principais:
1.  **Cupons Promocionais (Promotional Coupons)**: Cupons de desconto administrados pela equipe (ex: BLACK, SUMMER20), aplicáveis a diversas taxas.
2.  **Cupons de Referência (Affiliate/Referral System)**: Sistema de indicação onde usuários possuem códigos únicos para convidar outros alunos.

---

## 1. Arquitetura Geral

O sistema utiliza uma arquitetura baseada em **Supabase** (PostgreSQL + Edge Functions) e **Stripe** para processamento de pagamentos e descontos.

-   **Frontend (React/Vite)**: Gerencia a interface de admin e o checkout do usuário.
-   **Backend (Supabase Edge Functions)**: Processa validações sensíveis e integrações com Stripe.
-   **Database (PostgreSQL)**: Armazena regras, logs de uso e relações entre usuários.

---

## 2. Banco de Dados

### 2.1. Tabelas Principais

#### `promotional_coupons`
Armazena as definições dos cupons promocionais criados pelos administradores.

| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | uuid | Chave primária. |
| `code` | text | Código do cupom (ex: "DESCONTO10"). Único. |
| `name` | text | Nome interno para identificação. |
| `description` | text | Descrição do cupom. |
| `discount_type` | text | Tipo de desconto: 'percentage' ou 'fixed'. |
| `discount_value` | numeric | Valor do desconto (ex: 10 para 10% ou $10). |
| `max_uses` | int | Limite global de usos (opcional). |
| `current_uses` | int | Contador atual de usos. |
| `valid_from` | timestamptz | Data de início da validade. |
| `valid_until` | timestamptz | Data de expiração. |
| `is_active` | boolean | Se o cupom está ativo. |
| `excluded_fee_types` | jsonb | Lista de taxas onde o cupom **não** se aplica (ex: `['i20_control']`). |

#### `promotional_coupon_usage`
Tabela de log (audit) que registra cada vez que um cupom promocional é utilizado com sucesso em um pagamento.

| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | uuid | Chave primária. |
| `user_id` | uuid | ID do usuário que usou o cupom. |
| `coupon_code` | text | Código utilizado. |
| `fee_type` | text | Tipo da taxa paga (ex: 'application_fee'). |
| `original_amount` | numeric | Valor original da taxa. |
| `discount_amount` | numeric | Valor descontado. |
| `final_amount` | numeric | Valor final pago. |
| `payment_id` | text | ID do pagamento (Stripe Session ou Zelle ID). |
| `individual_fee_payment_id` | uuid | Link com a tabela de pagamentos de taxas avulsas. |

#### `affiliate_codes`
Gerencia os códigos de afiliados/parceiros para o sistema de indicação.

| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | uuid | Chave primária. |
| `code` | text | Código de afiliado único. |
| `user_id` | uuid | ID do usuário dono do código (o afiliado). |
| `total_referrals` | int | Contador de quantas vezes o código foi usado. |
| `commission_rate` | numeric | Taxa de comissão (se aplicável). |

#### `used_referral_codes`
Tabela que impede o uso duplicado de códigos de referência e rastreia quem indicou quem.

| Coluna | Tipo | Descrição |
| :--- | :--- | :--- |
| `id` | uuid | Chave primária. |
| `user_id` | uuid | O novo aluno que usou o código. |
| `referrer_id` | uuid | O ID do afiliado que indicou. |
| `affiliate_code` | text | O código usado. |
| `status` | text | Status do uso (ex: 'applied'). |
| `stripe_coupon_id` | text | ID do cupom gerado dinamicamente no Stripe. |

---

## 3. Edge Functions (API)

As Edge Functions são o coração da lógica de negócios, garantindo segurança e validação server-side.

### 3.1. `validate-promotional-coupon`
Valida se um cupom promocional pode ser aplicado a uma compra específica antes do pagamento.

-   **Endpoint**: `/validate-promotional-coupon`
-   **Método**: `POST`
-   **Parâmetros**:
    -   `coupon_code`: Código digitado pelo usuário.
    -   `fee_type`: Tipo da taxa sendo paga (ex: 'application_fee').
    -   `purchase_amount`: Valor da transação.
-   **Lógica**:
    1.  Verifica autenticação do usuário.
    2.  Chama a RPC (Remote Procedure Call) `validate_promotional_coupon` no banco de dados.
    3.  Verifica validade, data, limite de usos e restrições de taxa.
    4.  Calcula o valor final.
-   **Retorno**: Detalhes do desconto e valores calculados.

### 3.2. `process-registration-coupon`
Processa cupons de afiliado durante o registro ou checkout inicial. Diferente dos promocionais, este cria um cupom dinâmico no Stripe.

-   **Endpoint**: `/process-registration-coupon`
-   **Método**: `POST`
-   **Parâmetros**:
    -   `user_id`: ID do usuário.
    -   `affiliate_code`: Código do parceiro.
-   **Lógica**:
    1.  Verifica se o código de afiliado existe e é ativo.
    2.  Verifica se o usuário já usou algum código de referência antes (tabela `used_referral_codes`).
    3.  **Integração Stripe**: Cria um cupom *one-time* (uso único) diretamente na API do Stripe com metadata rastreando o afiliado.
    4.  Registra o uso na tabela `used_referral_codes` para evitar duplicidade.
    5.  Incrementa o contador de referências do afiliado.
-   **Retorno**: `coupon_id` do Stripe para ser usado no checkout.

### 3.3. `record-promotional-coupon-validation`
(Função auxiliar/inferida) Responsável por efetivar o uso do cupom promocional após a confirmação do pagamento, inserindo o registro em `promotional_coupon_usage` e atualizando `current_uses` do cupom.

---

## 4. Funções de Banco de Dados (RPCs)

### `validate_promotional_coupon`
Função PL/pgSQL encapsulada que executa as regras de validação diretamente no banco para performance e segurança.

-   Verifica existência do cupom.
-   Verifica `is_active = true`.
-   Verifica `valid_from` e `valid_until`.
-   Verifica se `current_uses < max_uses`.
-   Verifica se o `fee_type` não está na lista `excluded_fee_types`.
-   Calcula o desconto (Fixo ou Porcentagem).

### `get_coupon_usage_stats`
Função para analytics no dashboard.
-   Recebe um período (ex: '30d').
-   Retorna o total de cupons usados e o total no período.

---

## 5. Frontend & Admin Dashboard

### `CouponManagement.tsx`
Localizado em `project/src/pages/AdminDashboard/CouponManagement.tsx`, é a interface completa de gestão.

#### Funcionalidades:
1.  **Listagem de Cupons**: Mostra todos os cupons criados, com status (Ativo/Inativo), tipo de desconto e validade.
2.  **Criação/Edição**: Modal para criar novos cupons definindo:
    -   Código (automático upper-case).
    -   Tipo de Desconto (Fixo/%) e Valor.
    -   Taxas Excluídas (checkbox para selecionar onde o cupom NÃO funciona).
    -   Limites de uso e Datas.
3.  **Histórico de Uso (Aba 'Usage History')**:
    -   Tabela detalhada de cada aplicação de cupom.
    -   Filtros avançados por data, código e tipo de taxa.
    -   Mostra o valor original, desconto dado e valor final pago.
    -   Cruza dados com `individual_fee_payments` para mostrar valores reais processados.

---

## 6. Fluxos de Uso

### Fluxo 1: Aplicando um Cupom Promocional (Checkout)
1.  Usuário digita o código (ex: "BLACKAFRICA").
2.  Frontend chama `validate-promotional-coupon`.
3.  Se válido, sistema retorna o novo valor.
4.  Frontend exibe o desconto visualmente.
5.  Ao finalizar pagamento (Stripe/Zelle), o sistema registra o uso via webhook ou função de callback, inserindo em `promotional_coupon_usage`.

### Fluxo 2: Usando Código de Afiliado (Registro)
1.  Novo usuário insere código de indicação no cadastro.
2.  Frontend chama `process-registration-coupon`.
3.  Backend valida código e unicidade.
4.  Cria cupom de uso único no Stripe.
5.  Vincula o novo usuário ao afiliado (`referrer_id`).
6.  O desconto é aplicado automaticamente na sessão de checkout do Stripe.

---

## 7. Notas Técnicas Importantes

-   **Normalização de Tipos**: O sistema trata variações de nomes de taxas, normalizando `i20_control_fee` para `i20_control` para manter consistência no banco.
-   **Segurança (RLS)**: Todas as tabelas possuem Row Level Security. Usuários veem apenas seus próprios usos; Admins veem tudo.
-   **Idempotência**: O sistema de afiliados previne que um usuário use múltiplos códigos de indicação (tabela `used_referral_codes`).
