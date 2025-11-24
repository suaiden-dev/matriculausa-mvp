-- Migration: Add duplicate check to insert_individual_fee_payment function
-- Description: Adiciona verificação de duplicação baseada em payment_intent_id para evitar race conditions
-- Também remove registros duplicados existentes e adiciona constraint única parcial para garantir atomicidade

-- ✅ PASSO 1: Remover registros duplicados, mantendo apenas o mais recente (baseado em created_at)
-- Isso é necessário antes de criar a constraint única
DELETE FROM individual_fee_payments
WHERE id IN (
  SELECT id
  FROM (
    SELECT 
      id,
      ROW_NUMBER() OVER (
        PARTITION BY payment_intent_id, fee_type, user_id 
        ORDER BY created_at DESC
      ) as row_num
    FROM individual_fee_payments
    WHERE payment_intent_id IS NOT NULL
  ) ranked
  WHERE row_num > 1
);

-- ✅ PASSO 2: Criar constraint única parcial para payment_intent_id (quando não é NULL)
-- Isso garante que não haverá duplicação mesmo em race conditions
CREATE UNIQUE INDEX IF NOT EXISTS idx_individual_fee_payments_unique_payment_intent
ON individual_fee_payments (payment_intent_id, fee_type, user_id)
WHERE payment_intent_id IS NOT NULL;

-- Atualizar função RPC insert_individual_fee_payment para verificar duplicação antes de inserir
CREATE OR REPLACE FUNCTION insert_individual_fee_payment(
  p_user_id uuid,
  p_fee_type text,
  p_amount numeric,
  p_payment_date timestamptz,
  p_payment_method text,
  p_payment_intent_id text DEFAULT NULL,
  p_stripe_charge_id text DEFAULT NULL,
  p_zelle_payment_id uuid DEFAULT NULL,
  p_gross_amount_usd numeric DEFAULT NULL,
  p_fee_amount_usd numeric DEFAULT NULL
)
RETURNS TABLE(id uuid, payment_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id uuid;
  v_record_id uuid;
  v_existing_id uuid;
BEGIN
  -- ✅ Verificar se já existe registro com este payment_intent_id (se fornecido)
  -- Isso previne duplicação mesmo em condições de corrida
  IF p_payment_intent_id IS NOT NULL AND p_payment_intent_id != '' THEN
    SELECT individual_fee_payments.id INTO v_existing_id
    FROM individual_fee_payments
    WHERE individual_fee_payments.payment_intent_id = p_payment_intent_id
      AND individual_fee_payments.fee_type = p_fee_type
      AND individual_fee_payments.user_id = p_user_id
    LIMIT 1;
    
    -- Se já existe, retornar o registro existente
    IF v_existing_id IS NOT NULL THEN
      -- Gerar payment_id único mesmo para registro existente (para compatibilidade)
      v_payment_id := gen_random_uuid();
      RETURN QUERY SELECT v_existing_id AS id, v_payment_id AS payment_id;
      RETURN;
    END IF;
  END IF;
  
  -- Gerar payment_id único
  v_payment_id := gen_random_uuid();
  
  -- Inserir registro na tabela individual_fee_payments
  INSERT INTO individual_fee_payments (
    user_id,
    fee_type,
    amount,
    payment_date,
    payment_method,
    payment_intent_id,
    stripe_charge_id,
    zelle_payment_id,
    gross_amount_usd,
    fee_amount_usd
  ) VALUES (
    p_user_id,
    p_fee_type,
    p_amount,
    p_payment_date,
    p_payment_method,
    p_payment_intent_id,
    p_stripe_charge_id,
    p_zelle_payment_id,
    p_gross_amount_usd,
    p_fee_amount_usd
  )
  RETURNING individual_fee_payments.id INTO v_record_id;
  
  -- Retornar id do registro e payment_id gerado com aliases explícitos
  RETURN QUERY SELECT v_record_id AS id, v_payment_id AS payment_id;
EXCEPTION
  -- Se houver erro de constraint única (race condition detectada)
  -- A constraint única garante que apenas uma inserção será bem-sucedida
  WHEN unique_violation THEN
    -- Buscar o registro que foi criado pela outra chamada (ou pela primeira tentativa)
    IF p_payment_intent_id IS NOT NULL AND p_payment_intent_id != '' THEN
      SELECT individual_fee_payments.id INTO v_existing_id
      FROM individual_fee_payments
      WHERE individual_fee_payments.payment_intent_id = p_payment_intent_id
        AND individual_fee_payments.fee_type = p_fee_type
        AND individual_fee_payments.user_id = p_user_id
      LIMIT 1;
      
      IF v_existing_id IS NOT NULL THEN
        -- ✅ Retornar o registro existente (sem erro - comportamento idempotente)
        -- Isso significa que a função sempre retorna sucesso, mesmo se o registro já existir
        v_payment_id := gen_random_uuid();
        RETURN QUERY SELECT v_existing_id AS id, v_payment_id AS payment_id;
        RETURN;
      END IF;
    END IF;
    -- Se não encontrou (caso muito raro), re-lançar o erro
    RAISE;
END;
$$;

