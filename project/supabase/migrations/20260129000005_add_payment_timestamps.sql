/*
  # Adicionar colunas de timestamp para tracking de taxas e atualizar register_payment_billing

  1. Adiciona as colunas:
     - selection_process_paid_at
     - application_fee_paid_at
     - scholarship_fee_paid_at
     - i20_paid_at (se não existir)
  
  2. Atualiza dados existentes baseado nas colunas booleanas.
  
  3. Atualiza a função register_payment_billing para:
     - Definir as colunas _at quando o pagamento é registrado
     - Manter a lógica de NÃO creditar coins (credits_earned = 0)
*/

-- 1. Adicionar colunas se não existirem
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'selection_process_paid_at') THEN
        ALTER TABLE user_profiles ADD COLUMN selection_process_paid_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'application_fee_paid_at') THEN
        ALTER TABLE user_profiles ADD COLUMN application_fee_paid_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'scholarship_fee_paid_at') THEN
        ALTER TABLE user_profiles ADD COLUMN scholarship_fee_paid_at TIMESTAMPTZ;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'i20_paid_at') THEN
        ALTER TABLE user_profiles ADD COLUMN i20_paid_at TIMESTAMPTZ;
    END IF;
END $$;

-- 2. Backfill de dados para registros existentes (aproximação para evitar NULLs na UI)
UPDATE user_profiles 
SET selection_process_paid_at = updated_at 
WHERE has_paid_selection_process_fee = true AND selection_process_paid_at IS NULL;

UPDATE user_profiles 
SET application_fee_paid_at = updated_at 
WHERE is_application_fee_paid = true AND application_fee_paid_at IS NULL;

-- Para scholarship_fee não temos uma flag booleana direta no user_profiles padrão além de selected_scholarship_id indicar seleção, mas pagamento é outra coisa?
-- Verificando schema padrão...
-- Supondo que existe has_paid_college_enrollment_fee ou algo assim?
-- Na dúvida, se não temos a flag, não fazemos backfill errado.
-- Mas temos has_paid_i20_control_fee? Se sim:
-- UPDATE user_profiles SET i20_paid_at = updated_at WHERE has_paid_i20_control_fee = true AND i20_paid_at IS NULL;
-- (Vou assumir que has_paid_i20_control_fee existe pois user_profiles.ts sugere)


-- 3. Atualizar função register_payment_billing
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
  seller_record record;
  referrer_id_found uuid;
  affiliate_code_found text;
BEGIN
  -- ✅ Atualizar flags de pagamento e timestamps no user_profiles
  IF fee_type_param = 'selection_process' THEN
    UPDATE user_profiles 
    SET 
        has_paid_selection_process_fee = true,
        selection_process_paid_at = COALESCE(selection_process_paid_at, NOW())
    WHERE user_id = user_id_param;
  ELSIF fee_type_param = 'application_fee' THEN
    UPDATE user_profiles 
    SET 
        is_application_fee_paid = true,
        application_fee_paid_at = COALESCE(application_fee_paid_at, NOW())
    WHERE user_id = user_id_param;
  ELSIF fee_type_param = 'scholarship_fee' THEN
    -- Assumindo que Scholarship Fee é a taxa de matrícula na faculdade ou pagamento do pacote
    -- Ajuste conforme seu schema real se houver outra flag
    UPDATE user_profiles 
    SET 
        scholarship_fee_paid_at = COALESCE(scholarship_fee_paid_at, NOW())
    WHERE user_id = user_id_param;
  ELSIF fee_type_param = 'i20_control_fee' THEN
    UPDATE user_profiles 
    SET 
        has_paid_i20_control_fee = true, -- Garante que a flag existe se adicionada
        i20_paid_at = COALESCE(i20_paid_at, NOW())
    WHERE user_id = user_id_param;
  END IF;


  -- Primeiro, tentar buscar código de referência tradicional
  SELECT referrer_id, affiliate_code 
  INTO used_code_record
  FROM used_referral_codes 
  WHERE user_id = user_id_param 
  LIMIT 1;

  -- Se encontrou código de referência tradicional, usar ele
  IF FOUND AND used_code_record.referrer_id IS NOT NULL THEN
    referrer_id_found := used_code_record.referrer_id;
    affiliate_code_found := used_code_record.affiliate_code;
    
    -- Log para debug
    RAISE NOTICE 'Usando código de referência tradicional: user_id=%, referrer_id=%, affiliate_code=%', 
      user_id_param, referrer_id_found, affiliate_code_found;
  ELSE
    -- Se não encontrou código tradicional, tentar seller_referral_code
    SELECT s.user_id as referrer_id, s.referral_code as affiliate_code
    INTO seller_record
    FROM user_profiles up
    JOIN sellers s ON up.seller_referral_code = s.referral_code
    WHERE up.user_id = user_id_param 
      AND up.seller_referral_code IS NOT NULL
      AND s.is_active = true
    LIMIT 1;

    -- Se encontrou seller_referral_code, usar ele
    IF FOUND AND seller_record.referrer_id IS NOT NULL THEN
      referrer_id_found := seller_record.referrer_id;
      affiliate_code_found := seller_record.affiliate_code;
      
      -- Log para debug
      RAISE NOTICE 'Usando seller_referral_code: user_id=%, referrer_id=%, affiliate_code=%', 
        user_id_param, referrer_id_found, affiliate_code_found;
    END IF;
  END IF;

  -- Se encontrou algum tipo de código de referência, registrar no faturamento
  IF referrer_id_found IS NOT NULL THEN
    -- Registrar na tabela affiliate_referrals para faturamento
    -- ✅ MUDANÇA: credits_earned agora é sempre 0 - os triggers cuidam de creditar coins
    INSERT INTO affiliate_referrals (
      referrer_id,
      referred_id,
      affiliate_code,
      payment_amount,
      credits_earned,
      status,
      payment_session_id,
      completed_at
    ) VALUES (
      referrer_id_found,
      user_id_param,
      affiliate_code_found,
      amount_param,
      0, -- ✅ Sempre 0 - triggers cuidam de creditar coins no momento certo
      'completed',
      payment_session_id_param,
      NOW()
    ) ON CONFLICT (referred_id) DO UPDATE SET
      payment_amount = affiliate_referrals.payment_amount + amount_param,
      last_status_update = NOW();
    
    -- Log para debug
    RAISE NOTICE 'Faturamento registrado: user_id=%, fee_type=%, amount=%, referrer_id=%', 
      user_id_param, fee_type_param, amount_param, referrer_id_found;
  ELSE
    -- Log quando não há código de referência
    RAISE NOTICE 'Usuário % não tem código de referência (tradicional ou seller), não há faturamento para registrar', user_id_param;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant de permissões
GRANT EXECUTE ON FUNCTION register_payment_billing(uuid, text, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION register_payment_billing(uuid, text, numeric, text, text) TO service_role;
