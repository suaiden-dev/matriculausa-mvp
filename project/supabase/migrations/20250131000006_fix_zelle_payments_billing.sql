/*
  # Correção de Faturamento para Pagamentos Zelle Passados
  
  Esta migração corrige os pagamentos Zelle aprovados que não foram contabilizados
  no faturamento, registrando-os na tabela affiliate_referrals.
*/

-- Função para corrigir faturamento de pagamentos Zelle passados
CREATE OR REPLACE FUNCTION fix_zelle_payments_billing()
RETURNS TABLE (
  processed_count bigint,
  total_amount_added numeric,
  errors jsonb
) AS $$
DECLARE
  payment_record record;
  processed_count_var bigint := 0;
  total_amount_var numeric := 0;
  errors_array jsonb := '[]';
  error_message text;
  billing_error text;
BEGIN
  -- Processar cada pagamento Zelle aprovado que não foi contabilizado
  FOR payment_record IN
    SELECT 
      zp.id,
      zp.user_id,
      zp.fee_type,
      zp.amount,
      urc.referrer_id,
      urc.affiliate_code
    FROM zelle_payments zp
    JOIN used_referral_codes urc ON urc.user_id = zp.user_id
    WHERE zp.status = 'approved'
      AND zp.fee_type IN ('scholarship_fee', 'i20_control')
      AND NOT EXISTS (
        SELECT 1 FROM affiliate_referrals ar 
        WHERE ar.referred_id = zp.user_id 
          AND ar.payment_amount = zp.amount
      )
  LOOP
    BEGIN
      -- Registrar na tabela affiliate_referrals para faturamento
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
        payment_record.referrer_id,
        payment_record.user_id,
        payment_record.affiliate_code,
        payment_record.amount,
        0, -- Zelle payments não geram créditos (exceto selection_process que já foi processado)
        'completed',
        'zelle_migration_' || payment_record.id,
        NOW()
      ) ON CONFLICT (referred_id) DO UPDATE SET
        payment_amount = affiliate_referrals.payment_amount + payment_record.amount,
        updated_at = NOW();

      -- Incrementar contadores
      processed_count_var := processed_count_var + 1;
      total_amount_var := total_amount_var + payment_record.amount;

      -- Log de sucesso
      RAISE NOTICE 'Processado pagamento Zelle: user_id=%, fee_type=%, amount=%, referrer_id=%', 
        payment_record.user_id, payment_record.fee_type, payment_record.amount, payment_record.referrer_id;

    EXCEPTION WHEN OTHERS THEN
      -- Capturar erro e adicionar ao array de erros
      error_message := 'Erro ao processar pagamento ' || payment_record.id || ': ' || SQLERRM;
      errors_array := errors_array || jsonb_build_object(
        'payment_id', payment_record.id,
        'user_id', payment_record.user_id,
        'error', error_message
      );
      
      RAISE WARNING 'Erro ao processar pagamento Zelle %: %', payment_record.id, error_message;
    END;
  END LOOP;

  -- Retornar resultados
  RETURN QUERY SELECT
    processed_count_var,
    total_amount_var,
    errors_array;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para verificar se a correção foi aplicada corretamente
CREATE OR REPLACE FUNCTION verify_zelle_billing_fix()
RETURNS TABLE (
  total_zelle_payments bigint,
  total_affiliate_referrals bigint,
  missing_payments bigint,
  total_amount_verified numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    (SELECT COUNT(*) FROM zelle_payments WHERE status = 'approved' AND fee_type IN ('scholarship_fee', 'i20_control')) as total_zelle_payments,
    (SELECT COUNT(*) FROM affiliate_referrals WHERE payment_session_id LIKE 'zelle_migration_%') as total_affiliate_referrals,
    (SELECT COUNT(*) FROM zelle_payments zp
     JOIN used_referral_codes urc ON urc.user_id = zp.user_id
     WHERE zp.status = 'approved'
       AND zp.fee_type IN ('scholarship_fee', 'i20_control')
       AND NOT EXISTS (
         SELECT 1 FROM affiliate_referrals ar 
         WHERE ar.referred_id = zp.user_id 
           AND ar.payment_amount = zp.amount
       )) as missing_payments,
    (SELECT COALESCE(SUM(ar.payment_amount), 0) FROM affiliate_referrals ar 
     WHERE ar.payment_session_id LIKE 'zelle_migration_%') as total_amount_verified;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários
COMMENT ON FUNCTION fix_zelle_payments_billing() IS 
'Corrige o faturamento de pagamentos Zelle aprovados que não foram contabilizados';

COMMENT ON FUNCTION verify_zelle_billing_fix() IS 
'Verifica se a correção do faturamento Zelle foi aplicada corretamente';

-- Grant de permissões
GRANT EXECUTE ON FUNCTION fix_zelle_payments_billing() TO authenticated;
GRANT EXECUTE ON FUNCTION verify_zelle_billing_fix() TO authenticated;
