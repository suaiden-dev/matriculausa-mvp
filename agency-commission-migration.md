# Migração: Sistema de Comissão por Agência

**Data:** 2026-05-05  
**Objetivo:** Adicionar comissão configurável por agência, acionada exclusivamente no pagamento do `selection_process` fee.  
**Estratégia:** Totalmente aditiva — nenhuma tabela, coluna ou dado existente é removido ou alterado. Agências existentes (BRANT, TFOE) não são afetadas até que o super admin configure manualmente.

---

## Visão Geral das Mudanças

| O que muda | Onde | Impacto em dados existentes |
|---|---|---|
| Nova coluna `commission_per_sale` | `affiliate_admins` | `NULL` para todos os registros existentes |
| Nova coluna `commission_amount` | `affiliate_referrals` | `NULL` para todos os registros históricos |
| RPC `register_payment_billing` | função Postgres | Comportamento idêntico se `commission_per_sale = NULL` |

---

## Migration 1 — Comissão configurável por agência

**Arquivo:** `supabase/migrations/20260505000001_add_commission_per_sale_to_affiliate_admins.sql`

```sql
/*
  # Adicionar comissão configurável por agência

  Adiciona o campo commission_per_sale na tabela affiliate_admins.
  
  - Valor em USD (ex: 50.00 = $50 por venda de selection_process)
  - NULL significa que a agência ainda não tem comissão configurada
  - Não afeta nenhum registro existente
  - Configurado manualmente pelo super admin por agência
*/

ALTER TABLE affiliate_admins
ADD COLUMN IF NOT EXISTS commission_per_sale NUMERIC(10,2) DEFAULT NULL;

COMMENT ON COLUMN affiliate_admins.commission_per_sale IS
'Valor fixo em USD pago à agência por cada venda de selection_process confirmada. NULL = sem comissão configurada.';
```

**O que faz:**
- Adiciona a coluna `commission_per_sale` como `NUMERIC(10,2)` (ex: `50.00`, `100.00`)
- Default `NULL` — agências existentes ficam com `NULL` automaticamente
- Sem risco de quebrar dados existentes

---

## Migration 2 — Registro do valor de comissão por transação

**Arquivo:** `supabase/migrations/20260505000002_add_commission_amount_to_affiliate_referrals.sql`

```sql
/*
  # Adicionar commission_amount em affiliate_referrals

  Registra o valor exato da comissão no momento em que a venda acontece.
  Isso garante rastreabilidade histórica mesmo que a comissão da agência
  seja alterada no futuro.

  - NULL em registros históricos (antes desta feature)
  - Preenchido apenas para vendas de selection_process com agência configurada
  - Não retroativo — não altera nenhum registro existente
*/

ALTER TABLE affiliate_referrals
ADD COLUMN IF NOT EXISTS commission_amount NUMERIC(10,2) DEFAULT NULL;

COMMENT ON COLUMN affiliate_referrals.commission_amount IS
'Valor em USD da comissão devida à agência por esta transação. Preenchido apenas quando fee_type = selection_process e a agência tem commission_per_sale configurado. NULL = sem comissão aplicável.';
```

**O que faz:**
- Adiciona `commission_amount` em `affiliate_referrals`
- Registra o valor **no momento da venda** (snapshot) — se a comissão da agência mudar depois, o histórico permanece correto
- Todos os registros históricos de BRANT e TFOE ficam com `NULL`

---

## Migration 3 — RPC `register_payment_billing` atualizada

**Arquivo:** `supabase/migrations/20260505000003_update_register_payment_billing_with_agency_commission.sql`

```sql
/*
  # Atualizar register_payment_billing com suporte a comissão por agência

  Mudanças em relação à versão anterior:
  1. Quando fee_type = 'selection_process', busca a agência vinculada ao seller
  2. Se a agência tem commission_per_sale configurado, grava em commission_amount
  3. Comportamento 100% idêntico ao anterior para todos os outros fee_types
  4. Comportamento 100% idêntico para agências sem commission_per_sale (NULL)
*/

CREATE OR REPLACE FUNCTION register_payment_billing(
  user_id_param uuid,
  fee_type_param text,
  amount_param numeric,
  payment_session_id_param text DEFAULT NULL,
  payment_method_param text DEFAULT 'manual'
)
RETURNS void AS $$
DECLARE
  used_code_record record;
  seller_record     record;
  agency_record     record;
  referrer_id_found uuid;
  affiliate_code_found text;
  commission_value  numeric(10,2) := NULL;
BEGIN

  -- ----------------------------------------------------------------
  -- PASSO 1: Encontrar o referrer (código tradicional ou seller)
  -- Idêntico à versão anterior
  -- ----------------------------------------------------------------

  -- Tentar código de referência tradicional primeiro
  SELECT referrer_id, affiliate_code
  INTO used_code_record
  FROM used_referral_codes
  WHERE user_id = user_id_param
  LIMIT 1;

  IF FOUND AND used_code_record.referrer_id IS NOT NULL THEN
    referrer_id_found  := used_code_record.referrer_id;
    affiliate_code_found := used_code_record.affiliate_code;

    RAISE NOTICE '[billing] Código tradicional: user=%, referrer=%, code=%',
      user_id_param, referrer_id_found, affiliate_code_found;

  ELSE
    -- Tentar seller_referral_code
    SELECT s.user_id   AS referrer_id,
           s.referral_code AS affiliate_code,
           s.id        AS seller_id,
           s.affiliate_admin_id
    INTO seller_record
    FROM user_profiles up
    JOIN sellers s ON up.seller_referral_code = s.referral_code
    WHERE up.user_id = user_id_param
      AND up.seller_referral_code IS NOT NULL
      AND s.is_active = true
    LIMIT 1;

    IF FOUND AND seller_record.referrer_id IS NOT NULL THEN
      referrer_id_found  := seller_record.referrer_id;
      affiliate_code_found := seller_record.affiliate_code;

      RAISE NOTICE '[billing] Seller code: user=%, referrer=%, code=%',
        user_id_param, referrer_id_found, affiliate_code_found;
    END IF;
  END IF;

  -- ----------------------------------------------------------------
  -- PASSO 2: Calcular comissão da agência (NOVO)
  -- Apenas quando fee_type = 'selection_process' e agência configurada
  -- ----------------------------------------------------------------

  IF fee_type_param = 'selection_process' AND seller_record.affiliate_admin_id IS NOT NULL THEN

    SELECT commission_per_sale
    INTO agency_record
    FROM affiliate_admins
    WHERE id = seller_record.affiliate_admin_id
      AND is_active = true
      AND commission_per_sale IS NOT NULL
    LIMIT 1;

    IF FOUND THEN
      commission_value := agency_record.commission_per_sale;
      RAISE NOTICE '[billing] Comissão da agência: affiliate_admin_id=%, commission=$%',
        seller_record.affiliate_admin_id, commission_value;
    END IF;

  END IF;

  -- ----------------------------------------------------------------
  -- PASSO 3: Registrar em affiliate_referrals
  -- commission_amount incluído (NULL se não aplicável — idêntico ao anterior)
  -- ----------------------------------------------------------------

  IF referrer_id_found IS NOT NULL THEN

    INSERT INTO affiliate_referrals (
      referrer_id,
      referred_id,
      affiliate_code,
      payment_amount,
      credits_earned,
      commission_amount,
      status,
      payment_session_id,
      completed_at
    ) VALUES (
      referrer_id_found,
      user_id_param,
      affiliate_code_found,
      amount_param,
      CASE
        WHEN fee_type_param = 'selection_process' THEN 180
        WHEN fee_type_param = 'scholarship_fee'   THEN 200
        WHEN fee_type_param = 'i20_control_fee'   THEN 150
        ELSE 0
      END,
      commission_value,   -- NULL se agência não configurada ou fee_type != selection_process
      'completed',
      payment_session_id_param,
      NOW()
    )
    ON CONFLICT (referred_id) DO UPDATE SET
      payment_amount    = affiliate_referrals.payment_amount + amount_param,
      commission_amount = COALESCE(affiliate_referrals.commission_amount, 0) + COALESCE(commission_value, 0),
      updated_at        = NOW();

    RAISE NOTICE '[billing] Registrado: user=%, fee=%, amount=%, commission=%, referrer=%',
      user_id_param, fee_type_param, amount_param, commission_value, referrer_id_found;

  ELSE
    RAISE NOTICE '[billing] Usuário % sem código de referência — sem faturamento',
      user_id_param;
  END IF;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION register_payment_billing(uuid, text, numeric, text, text) IS
'Registra pagamentos em affiliate_referrals. Quando fee_type = selection_process, verifica se a agência do seller tem commission_per_sale configurado e grava em commission_amount. Comportamento idêntico ao anterior para agências sem comissão configurada.';

GRANT EXECUTE ON FUNCTION register_payment_billing(uuid, text, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION register_payment_billing(uuid, text, numeric, text, text) TO service_role;
```

**O que muda em relação à versão anterior:**

| Situação | Antes | Depois |
|---|---|---|
| Agência sem `commission_per_sale` (NULL) | `commission_amount` = não existe | `commission_amount = NULL` |
| Agência com `commission_per_sale = 50` + `selection_process` | `commission_amount` = não existe | `commission_amount = 50.00` |
| Qualquer outro `fee_type` | igual | `commission_amount = NULL` (não comissiona) |
| BRANT, TFOE hoje | igual | igual (ambas ficam com NULL) |

---

## Consultas Úteis Após Implementar

### Ver comissão configurada por agência
```sql
SELECT
  aa.name,
  aa.email,
  aa.commission_per_sale,
  aa.is_active
FROM affiliate_admins aa
ORDER BY aa.name;
```

### Configurar comissão de uma agência específica
```sql
-- Exemplo: setar $50 por venda para a agência TFOE
UPDATE affiliate_admins
SET commission_per_sale = 50.00
WHERE email = 'direct-sales-tfoe@matriculausa.com';
```

### Ver total de comissão acumulada por agência
```sql
SELECT
  aa.name                                  AS agencia,
  aa.commission_per_sale                   AS comissao_por_venda,
  COUNT(ar.id)                             AS total_vendas_selection,
  SUM(ar.commission_amount)                AS total_comissao_devida,
  COALESCE(SUM(ar.commission_amount), 0)
    - COALESCE(SUM(apr.amount_usd) 
        FILTER (WHERE apr.status = 'paid'), 0) AS saldo_a_pagar
FROM affiliate_admins aa
LEFT JOIN sellers s
       ON s.affiliate_admin_id = aa.id
LEFT JOIN affiliate_referrals ar
       ON ar.affiliate_code = s.referral_code
      AND ar.commission_amount IS NOT NULL
LEFT JOIN affiliate_payment_requests apr
       ON apr.referrer_user_id = aa.user_id
GROUP BY aa.id, aa.name, aa.commission_per_sale
ORDER BY total_comissao_devida DESC NULLS LAST;
```

### Ver histórico de comissões de uma agência
```sql
SELECT
  ar.completed_at,
  up.full_name        AS aluno,
  up.email            AS email_aluno,
  s.name              AS seller,
  s.referral_code,
  ar.payment_amount   AS valor_pago_pelo_aluno,
  ar.commission_amount AS comissao_da_agencia
FROM affiliate_referrals ar
JOIN user_profiles up ON up.user_id = ar.referred_id
JOIN sellers s        ON s.referral_code = ar.affiliate_code
JOIN affiliate_admins aa ON aa.id = s.affiliate_admin_id
WHERE aa.email = 'direct-sales-tfoe@matriculausa.com'
  AND ar.commission_amount IS NOT NULL
ORDER BY ar.completed_at DESC;
```

---

## Ordem de Execução

```
1. Rodar Migration 1  →  coluna commission_per_sale em affiliate_admins
2. Rodar Migration 2  →  coluna commission_amount em affiliate_referrals
3. Rodar Migration 3  →  RPC atualizada
4. Testar com agência de homologação (setar commission_per_sale e pagar selection_process)
5. Confirmar que BRANT e TFOE não foram alteradas
6. Implementar UI para configurar commission_per_sale por agência
7. Implementar dashboard de saldo de comissão
```

---

## Rollback (se necessário)

Se algo der errado, as colunas podem ser removidas sem perda de dados críticos:

```sql
-- Rollback Migration 1
ALTER TABLE affiliate_admins DROP COLUMN IF EXISTS commission_per_sale;

-- Rollback Migration 2
ALTER TABLE affiliate_referrals DROP COLUMN IF EXISTS commission_amount;

-- Rollback Migration 3: re-executar o arquivo original
-- supabase/migrations/20250131000005_fix_register_payment_billing_for_sellers.sql
```

Os dados existentes de BRANT e TFOE em `affiliate_referrals` não são afetados pelo rollback.
