/*
  # Correção do Sistema de Créditos de Afiliação
  
  PROBLEMA IDENTIFICADO:
  - Ao aplicar código de referência: +50 coins (correto)
  - Ao efetuar pagamento: NÃO credita 180 coins (problema)
  - Total atual: 50 coins ao invés de 180 coins
  
  SOLUÇÃO:
  1. Remover a chamada process_affiliate_referral() da aplicação do código
  2. Manter apenas o crédito de 180 coins no pagamento
  3. Garantir que register_payment_billing() execute add_credits_to_user()
*/

-- 1. Atualizar função validate_and_apply_referral_code para NÃO creditar coins na aplicação
CREATE OR REPLACE FUNCTION validate_and_apply_referral_code(
  user_id_param uuid,
  affiliate_code_param text
)
RETURNS json AS $$
DECLARE
  referrer_user_id uuid;
  discount_amount numeric := 50.00;
  stripe_coupon_id text;
  result json;
BEGIN
  -- Verifica se o código existe e está ativo
  SELECT user_id INTO referrer_user_id
  FROM affiliate_codes
  WHERE code = affiliate_code_param AND is_active = true;
  
  IF referrer_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Código de referência inválido'
    );
  END IF;
  
  -- Verifica se não é auto-referência
  IF referrer_user_id = user_id_param THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Não é possível usar seu próprio código de referência'
    );
  END IF;
  
  -- Verifica se o usuário já usou algum código
  IF EXISTS(SELECT 1 FROM used_referral_codes WHERE user_id = user_id_param) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Você já utilizou um código de referência'
    );
  END IF;
  
  -- Verifica se o código já foi usado por este usuário
  IF EXISTS(SELECT 1 FROM used_referral_codes WHERE user_id = user_id_param AND affiliate_code = affiliate_code_param) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Este código já foi utilizado'
    );
  END IF;
  
  -- Cria cupom no Stripe (será implementado na edge function)
  stripe_coupon_id := 'MATRICULA_' || affiliate_code_param || '_' || user_id_param::text;
  
  -- Registra o uso do código SEM creditar coins
  INSERT INTO used_referral_codes (
    user_id,
    affiliate_code,
    referrer_id,
    discount_amount,
    stripe_coupon_id,
    status,
    applied_at
  ) VALUES (
    user_id_param,
    affiliate_code_param,
    referrer_user_id,
    discount_amount,
    stripe_coupon_id,
    'applied',
    now()
  );
  
  -- NÃO executa process_affiliate_referral aqui
  -- Os créditos serão adicionados apenas quando o pagamento for efetivado
  
  RETURN json_build_object(
    'success', true,
    'discount_amount', discount_amount,
    'stripe_coupon_id', stripe_coupon_id,
    'referrer_id', referrer_user_id,
    'message', 'Código de referência aplicado com sucesso! Você ganhou $50 de desconto.'
  );
END;
$$ LANGUAGE plpgsql;

-- 2. Atualizar função register_payment_billing para creditar 180 coins automaticamente
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
  referrer_id_found uuid;
  affiliate_code_found text;
  credits_to_earn numeric;
  existing_referral record;
BEGIN
  -- Buscar se o usuário usou algum código de referência
  SELECT referrer_id, affiliate_code 
  INTO used_code_record
  FROM used_referral_codes 
  WHERE user_id = user_id_param 
  LIMIT 1;

  -- Se encontrou código de referência, registrar no faturamento
  IF FOUND AND used_code_record.referrer_id IS NOT NULL THEN
    referrer_id_found := used_code_record.referrer_id;
    affiliate_code_found := used_code_record.affiliate_code;
    
    -- Calcular créditos a ganhar
    credits_to_earn := CASE 
      WHEN fee_type_param = 'selection_process' THEN 180
      ELSE 0
    END;
    
    -- Verificar se já existe referral para este usuário
    SELECT * INTO existing_referral
    FROM affiliate_referrals 
    WHERE referred_id = user_id_param;
    
    IF existing_referral.id IS NULL THEN
      -- Criar novo registro e creditar coins
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
        credits_to_earn,
        'completed',
        payment_session_id_param,
        NOW()
      );
      
      -- Creditar coins se não for zero
      IF credits_to_earn > 0 THEN
        PERFORM add_credits_to_user(
          referrer_id_found,
          credits_to_earn,
          NULL,
          'selection_process_payment',
          'Créditos ganhos por indicação - pagamento de selection process fee'
        );
        
        RAISE NOTICE 'Créditos creditados: user_id=%, referrer_id=%, credits=%', 
          user_id_param, referrer_id_found, credits_to_earn;
      END IF;
    ELSE
      -- Apenas atualizar registro existente sem creditar novamente
      UPDATE affiliate_referrals SET
        payment_amount = payment_amount + amount_param,
        updated_at = NOW()
      WHERE referred_id = user_id_param;
      
      RAISE NOTICE 'Faturamento atualizado (sem créditos extras): user_id=%, amount=%', 
        user_id_param, amount_param;
    END IF;
    
    RAISE NOTICE 'Faturamento registrado: user_id=%, fee_type=%, amount=%, referrer_id=%', 
      user_id_param, fee_type_param, amount_param, referrer_id_found;
  ELSE
    RAISE NOTICE 'Usuário % não usou código de referência, não há faturamento para registrar', user_id_param;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentário da função atualizada
COMMENT ON FUNCTION register_payment_billing(uuid, text, numeric, text, text) IS 
'Registra automaticamente pagamentos na tabela affiliate_referrals e credita 180 coins para selection_process quando uma taxa é marcada como paga';
