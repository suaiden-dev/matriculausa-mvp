-- Fix create_zelle_payment RPC to include missing parameters and match Edge Function calls
-- Data: 2026-05-15

-- Limpar versões anteriores para evitar erro de "function is not unique" (overloading)
DO $$ 
DECLARE 
    r RECORD;
BEGIN
    FOR r IN (SELECT oid::regprocedure as proto FROM pg_proc WHERE proname = 'create_zelle_payment') LOOP
        EXECUTE 'DROP FUNCTION ' || r.proto;
    END LOOP;
END $$;

CREATE OR REPLACE FUNCTION create_zelle_payment(
  p_user_id uuid,
  p_fee_type text,
  p_amount numeric,
  p_currency text DEFAULT 'USD',
  p_recipient_email text DEFAULT NULL,
  p_recipient_name text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL,
  p_confirmation_code text DEFAULT NULL,
  p_payment_date timestamptz DEFAULT NULL,
  p_screenshot_url text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id uuid;
BEGIN
  -- Validar parâmetros
  IF p_amount < 0 THEN
    RAISE EXCEPTION 'Amount must be greater than or equal to 0';
  END IF;
  
  -- Inserir pagamento com todos os campos necessários
  INSERT INTO zelle_payments (
    user_id,
    fee_type,
    amount,
    currency,
    recipient_email,
    recipient_name,
    confirmation_code,
    payment_date,
    screenshot_url,
    status,
    metadata
  ) VALUES (
    p_user_id,
    p_fee_type,
    p_amount,
    p_currency,
    p_recipient_email,
    p_recipient_name,
    p_confirmation_code,
    COALESCE(p_payment_date, now()),
    p_screenshot_url,
    CASE WHEN p_amount = 0 THEN 'approved' ELSE 'pending_verification' END,
    p_metadata
  ) RETURNING id INTO v_payment_id;

  -- Se for valor zero (cupom 100%), marcar como pago no perfil do usuário imediatamente
  IF p_amount = 0 AND p_fee_type = 'selection_process' THEN
    UPDATE user_profiles 
    SET 
      has_paid_selection_process_fee = true,
      selection_process_fee_payment_method = 'zelle',
      updated_at = now()
    WHERE user_id = p_user_id;
  END IF;
  
  RETURN v_payment_id;
END;
$$;

COMMENT ON FUNCTION create_zelle_payment IS 'Cria um novo pagamento Zelle para o usuário com suporte a todos os parâmetros e auto-aprovação para valor zero';
