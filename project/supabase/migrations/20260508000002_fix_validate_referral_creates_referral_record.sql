/*
  Fix: validate_and_apply_referral_code agora cria registro em affiliate_referrals
  ao aplicar o código (status 'registered', credits_earned = 0).
  Isso garante que o dashboard de indicações mostre o referred imediatamente,
  e que os triggers de status (selection_process_paid, i20_paid) funcionem.

  Também corrige handle_i20_payment_rewards: 180 -> 100 coins.
*/

-- ============================================================
-- 1. validate_and_apply_referral_code (3-param, usada pelo frontend e edge function)
-- ============================================================
CREATE OR REPLACE FUNCTION validate_and_apply_referral_code(
  user_id_param uuid,
  affiliate_code_param text,
  email_param text DEFAULT NULL
)
RETURNS json AS $func$
DECLARE
  referrer_user_id uuid;
  discount_amount numeric := 50.00;
  stripe_coupon_id text;
  normalized_code text;
  existing_used record;
BEGIN
  normalized_code := upper(trim(affiliate_code_param));

  -- Idempotente: código já usado por este usuário
  SELECT * INTO existing_used
  FROM used_referral_codes
  WHERE user_id = user_id_param AND upper(affiliate_code) = normalized_code
  LIMIT 1;

  IF found THEN
    IF existing_used.email IS NULL AND email_param IS NOT NULL THEN
      UPDATE used_referral_codes
      SET email = email_param, updated_at = now()
      WHERE id = existing_used.id;
    END IF;
    RETURN json_build_object(
      'success', true,
      'referrer_id', existing_used.referrer_id,
      'discount_amount', existing_used.discount_amount,
      'stripe_coupon_id', existing_used.stripe_coupon_id,
      'affiliate_code', existing_used.affiliate_code
    );
  END IF;

  -- Verificar se código existe e está ativo
  SELECT user_id INTO referrer_user_id
  FROM affiliate_codes
  WHERE upper(code) = normalized_code AND is_active = true;

  IF referrer_user_id IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Código de referência inválido');
  END IF;

  -- Bloquear auto-referência
  IF referrer_user_id = user_id_param THEN
    RETURN json_build_object('success', false, 'error', 'Não é possível usar seu próprio código de referência');
  END IF;

  -- Bloquear uso de múltiplos códigos
  IF EXISTS(SELECT 1 FROM used_referral_codes WHERE user_id = user_id_param) THEN
    RETURN json_build_object('success', false, 'error', 'Você já utilizou um código de referência');
  END IF;

  stripe_coupon_id := 'MATR_' || normalized_code;

  -- Registrar uso do código
  INSERT INTO used_referral_codes (
    user_id, affiliate_code, referrer_id, discount_amount,
    stripe_coupon_id, status, applied_at, email
  ) VALUES (
    user_id_param, normalized_code, referrer_user_id, discount_amount,
    stripe_coupon_id, 'applied', now(), email_param
  );

  -- Criar registro em affiliate_referrals com status 'registered' e sem coins.
  -- Triggers atualizam o status conforme pagamentos acontecem.
  INSERT INTO affiliate_referrals (
    referrer_id, referred_id, affiliate_code,
    payment_amount, credits_earned, status, referred_student_status
  ) VALUES (
    referrer_user_id, user_id_param, normalized_code,
    0, 0, 'completed', 'registered'
  ) ON CONFLICT (referred_id) DO NOTHING;

  RETURN json_build_object(
    'success', true,
    'discount_amount', discount_amount,
    'stripe_coupon_id', stripe_coupon_id,
    'referrer_id', referrer_user_id,
    'affiliate_code', normalized_code
  );
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION validate_and_apply_referral_code(uuid, text, text) TO authenticated, service_role;

-- ============================================================
-- 2. validate_and_apply_referral_code (2-param, delega para 3-param)
-- ============================================================
CREATE OR REPLACE FUNCTION validate_and_apply_referral_code(
  user_id_param uuid,
  affiliate_code_param text
)
RETURNS json AS $func$
BEGIN
  RETURN validate_and_apply_referral_code(user_id_param, affiliate_code_param, NULL);
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION validate_and_apply_referral_code(uuid, text) TO authenticated, service_role;

-- ============================================================
-- 3. handle_i20_payment_rewards: 180 -> 100 coins
-- ============================================================
CREATE OR REPLACE FUNCTION handle_i20_payment_rewards()
RETURNS TRIGGER AS $func$
DECLARE
  v_used_code RECORD;
  v_referred_name TEXT;
BEGIN
  IF (OLD.has_paid_i20_control_fee = false OR OLD.has_paid_i20_control_fee IS NULL)
     AND NEW.has_paid_i20_control_fee = true THEN

    SELECT referrer_id, affiliate_code
    INTO v_used_code
    FROM used_referral_codes
    WHERE user_id = NEW.user_id
    LIMIT 1;

    IF FOUND AND v_used_code.referrer_id IS NOT NULL THEN
      v_referred_name := COALESCE(NEW.full_name, NEW.email, NEW.user_id::text);

      BEGIN
        PERFORM add_coins_to_user_matricula(
          v_used_code.referrer_id,
          100,
          'Referral reward: I20 Control Fee paid by ' || v_referred_name
        );
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[I20 Rewards Trigger] Failed to credit coins: %', SQLERRM;
      END;

      BEGIN
        PERFORM update_referral_status(NEW.user_id, 'i20_paid', NOW());
      EXCEPTION WHEN OTHERS THEN
        RAISE WARNING '[I20 Rewards Trigger] Failed to update referral status: %', SQLERRM;
      END;

    END IF;
  END IF;

  RETURN NEW;
END;
$func$ LANGUAGE plpgsql SECURITY DEFINER;
