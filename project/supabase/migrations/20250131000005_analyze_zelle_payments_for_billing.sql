/*
  # Análise de Pagamentos Zelle para Faturamento
  
  Esta migração analisa os pagamentos Zelle aprovados que não foram contabilizados
  no faturamento e calcula os valores que seriam adicionados.
*/

-- Função para analisar pagamentos Zelle que precisam ser contabilizados no faturamento
CREATE OR REPLACE FUNCTION analyze_zelle_payments_for_billing()
RETURNS TABLE (
  payment_id uuid,
  user_id uuid,
  user_email text,
  fee_type text,
  amount numeric,
  status text,
  has_referral_code boolean,
  referrer_id uuid,
  referrer_email text,
  affiliate_code text,
  would_be_billed boolean,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    zp.id as payment_id,
    zp.user_id,
    u.email as user_email,
    zp.fee_type,
    zp.amount,
    zp.status,
    CASE WHEN urc.id IS NOT NULL THEN true ELSE false END as has_referral_code,
    urc.referrer_id,
    referrer_user.email as referrer_email,
    urc.affiliate_code,
    CASE 
      WHEN urc.id IS NOT NULL 
        AND zp.status = 'approved' 
        AND zp.fee_type IN ('scholarship_fee', 'i20_control')
        AND NOT EXISTS (
          SELECT 1 FROM affiliate_referrals ar 
          WHERE ar.referred_id = zp.user_id 
            AND ar.payment_amount = zp.amount
        )
      THEN true 
      ELSE false 
    END as would_be_billed,
    zp.created_at
  FROM zelle_payments zp
  JOIN auth.users u ON zp.user_id = u.id
  LEFT JOIN used_referral_codes urc ON urc.user_id = zp.user_id
  LEFT JOIN auth.users referrer_user ON urc.referrer_id = referrer_user.id
  WHERE zp.status = 'approved'
    AND zp.fee_type IN ('scholarship_fee', 'i20_control')
  ORDER BY zp.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para calcular totais que seriam contabilizados
CREATE OR REPLACE FUNCTION calculate_zelle_billing_totals()
RETURNS TABLE (
  total_payments bigint,
  total_amount numeric,
  by_fee_type jsonb,
  by_referrer jsonb
) AS $$
DECLARE
  analysis_data record;
  fee_type_totals jsonb := '{}';
  referrer_totals jsonb := '{}';
  current_fee_type text;
  current_referrer_id uuid;
  current_amount numeric;
BEGIN
  -- Calcular totais gerais
  SELECT 
    COUNT(*) as total_payments,
    COALESCE(SUM(zp.amount), 0) as total_amount
  INTO analysis_data
  FROM zelle_payments zp
  JOIN used_referral_codes urc ON urc.user_id = zp.user_id
  WHERE zp.status = 'approved'
    AND zp.fee_type IN ('scholarship_fee', 'i20_control')
    AND NOT EXISTS (
      SELECT 1 FROM affiliate_referrals ar 
      WHERE ar.referred_id = zp.user_id 
        AND ar.payment_amount = zp.amount
    );

  -- Calcular totais por tipo de taxa
  FOR analysis_data IN
    SELECT 
      zp.fee_type,
      COUNT(*) as count,
      COALESCE(SUM(zp.amount), 0) as amount
    FROM zelle_payments zp
    JOIN used_referral_codes urc ON urc.user_id = zp.user_id
    WHERE zp.status = 'approved'
      AND zp.fee_type IN ('scholarship_fee', 'i20_control')
      AND NOT EXISTS (
        SELECT 1 FROM affiliate_referrals ar 
        WHERE ar.referred_id = zp.user_id 
          AND ar.payment_amount = zp.amount
      )
    GROUP BY zp.fee_type
  LOOP
    fee_type_totals := fee_type_totals || jsonb_build_object(
      analysis_data.fee_type,
      jsonb_build_object(
        'count', analysis_data.count,
        'amount', analysis_data.amount
      )
    );
  END LOOP;

  -- Calcular totais por referrer
  FOR analysis_data IN
    SELECT 
      urc.referrer_id,
      u.email as referrer_email,
      COUNT(*) as count,
      COALESCE(SUM(zp.amount), 0) as amount
    FROM zelle_payments zp
    JOIN used_referral_codes urc ON urc.user_id = zp.user_id
    JOIN auth.users u ON urc.referrer_id = u.id
    WHERE zp.status = 'approved'
      AND zp.fee_type IN ('scholarship_fee', 'i20_control')
      AND NOT EXISTS (
        SELECT 1 FROM affiliate_referrals ar 
        WHERE ar.referred_id = zp.user_id 
          AND ar.payment_amount = zp.amount
      )
    GROUP BY urc.referrer_id, u.email
  LOOP
    referrer_totals := referrer_totals || jsonb_build_object(
      analysis_data.referrer_id::text,
      jsonb_build_object(
        'email', analysis_data.referrer_email,
        'count', analysis_data.count,
        'amount', analysis_data.amount
      )
    );
  END LOOP;

  RETURN QUERY SELECT
    analysis_data.total_payments,
    analysis_data.total_amount,
    fee_type_totals,
    referrer_totals;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários
COMMENT ON FUNCTION analyze_zelle_payments_for_billing() IS 
'Analisa pagamentos Zelle aprovados que não foram contabilizados no faturamento';

COMMENT ON FUNCTION calculate_zelle_billing_totals() IS 
'Calcula totais que seriam contabilizados no faturamento para pagamentos Zelle';

-- Grant de permissões
GRANT EXECUTE ON FUNCTION analyze_zelle_payments_for_billing() TO authenticated;
GRANT EXECUTE ON FUNCTION calculate_zelle_billing_totals() TO authenticated;
