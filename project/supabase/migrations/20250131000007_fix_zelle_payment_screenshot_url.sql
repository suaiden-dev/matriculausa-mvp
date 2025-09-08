-- Fix: Mapear image_url para screenshot_url na função create_zelle_payment
-- Data: 2025-01-31
-- Descrição: Corrige o mapeamento de image_url para screenshot_url na função RPC

-- Atualizar função create_zelle_payment para incluir screenshot_url
CREATE OR REPLACE FUNCTION create_zelle_payment(
  p_user_id uuid,
  p_fee_type text,
  p_amount numeric,
  p_currency text DEFAULT 'USD',
  p_recipient_email text DEFAULT NULL,
  p_recipient_name text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL,
  p_screenshot_url text DEFAULT NULL  -- ✅ Adicionar parâmetro para screenshot_url
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id uuid;
BEGIN
  -- Validar parâmetros
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;
  
  IF p_fee_type NOT IN ('selection_process', 'application_fee', 'enrollment_fee', 'scholarship_fee', 'i20_control') THEN
    RAISE EXCEPTION 'Invalid fee type';
  END IF;
  
  -- Inserir pagamento com screenshot_url
  INSERT INTO zelle_payments (
    user_id,
    fee_type,
    amount,
    currency,
    recipient_email,
    recipient_name,
    screenshot_url,  -- ✅ Incluir screenshot_url no INSERT
    metadata
  ) VALUES (
    p_user_id,
    p_fee_type,
    p_amount,
    p_currency,
    p_recipient_email,
    p_recipient_name,
    p_screenshot_url,  -- ✅ Usar o parâmetro screenshot_url
    p_metadata
  ) RETURNING id INTO v_payment_id;
  
  RETURN v_payment_id;
END;
$$;

-- Comentário da função atualizada
COMMENT ON FUNCTION create_zelle_payment IS 'Cria um novo pagamento Zelle para o usuário com screenshot_url mapeado corretamente';
