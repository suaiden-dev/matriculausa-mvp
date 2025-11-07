-- Query de DEBUG: Calcular Available Balance com todas as correções
-- Substitua '6a3c5c04-fc94-4938-bdc2-c14c9ff8459c' pelo user_id do affiliate admin

WITH affiliate_admin_info AS (
  SELECT aa.id as affiliate_admin_id, aa.user_id
  FROM affiliate_admins aa
  WHERE aa.user_id = '6a3c5c04-fc94-4938-bdc2-c14c9ff8459c'  -- ⚠️ ALTERAR AQUI
),
profiles AS (
  SELECT 
    p.profile_id,
    p.user_id,
    up.full_name,
    up.email,
    p.has_paid_selection_process_fee,
    p.has_paid_i20_control_fee,
    p.dependents,
    p.system_type,
    up.selection_process_fee_payment_method,
    up.i20_control_fee_payment_method,
    -- CORRIGIDO: Verificar scholarship diretamente da tabela (ignora bug da RPC para legacy)
    EXISTS (
      SELECT 1 FROM scholarship_applications sa
      WHERE sa.student_id = p.profile_id
      AND sa.is_scholarship_fee_paid = true
    ) as is_scholarship_fee_paid_corrected
  FROM affiliate_admin_info aai
  CROSS JOIN LATERAL get_affiliate_admin_profiles_with_fees(aai.user_id) p
  JOIN user_profiles up ON up.id = p.profile_id
),
scholarship_manual_check AS (
  SELECT 
    sa.student_id,
    BOOL_OR(sa.is_scholarship_fee_paid = true AND sa.scholarship_fee_payment_method = 'manual') as has_scholarship_manual
  FROM profiles p
  JOIN scholarship_applications sa ON sa.student_id = p.profile_id
  WHERE sa.is_scholarship_fee_paid = true
  GROUP BY sa.student_id
),
profiles_with_overrides AS (
  SELECT 
    p.*,
    COALESCE(smc.has_scholarship_manual, false) as has_scholarship_manual,
    COALESCE(
      (SELECT jsonb_build_object(
        'selection_process_fee', fo.selection_process_fee,
        'scholarship_fee', fo.scholarship_fee,
        'i20_control_fee', fo.i20_control_fee
      )
      FROM user_fee_overrides fo
      WHERE fo.user_id = p.user_id
      LIMIT 1),
      '{}'::jsonb
    ) as overrides
  FROM profiles p
  LEFT JOIN scholarship_manual_check smc ON smc.student_id = p.profile_id
),
-- Calcular Total Revenue
total_revenue_calc AS (
  SELECT 
    SUM(
      CASE WHEN p.has_paid_selection_process_fee THEN
        COALESCE(
          (p.overrides->>'selection_process_fee')::numeric,
          CASE WHEN p.system_type = 'simplified' THEN 350 ELSE 400 END + (COALESCE(p.dependents, 0) * 150)
        )
      ELSE 0 END +
      CASE WHEN p.is_scholarship_fee_paid_corrected THEN
        COALESCE(
          (p.overrides->>'scholarship_fee')::numeric,
          CASE WHEN p.system_type = 'simplified' THEN 550 ELSE 900 END
        )
      ELSE 0 END +
      CASE WHEN p.is_scholarship_fee_paid_corrected AND p.has_paid_i20_control_fee THEN
        COALESCE(
          (p.overrides->>'i20_control_fee')::numeric,
          900
        )
      ELSE 0 END
    ) as total
  FROM profiles_with_overrides p
),
-- Calcular Manual Revenue CORRETO
manual_revenue_calc AS (
  SELECT 
    SUM(
      CASE 
        WHEN p.has_paid_selection_process_fee AND p.selection_process_fee_payment_method = 'manual' THEN
          COALESCE(
            (p.overrides->>'selection_process_fee')::numeric,
            CASE WHEN p.system_type = 'simplified' THEN 350 ELSE 400 END + (COALESCE(p.dependents, 0) * 150)
          )
        ELSE 0
      END +
      CASE 
        WHEN p.is_scholarship_fee_paid_corrected AND p.has_scholarship_manual THEN
          COALESCE(
            (p.overrides->>'scholarship_fee')::numeric,
            CASE WHEN p.system_type = 'simplified' THEN 550 ELSE 900 END
          )
        ELSE 0
      END +
      CASE 
        WHEN p.is_scholarship_fee_paid_corrected AND p.has_paid_i20_control_fee AND p.i20_control_fee_payment_method = 'manual' THEN
          COALESCE(
            (p.overrides->>'i20_control_fee')::numeric,
            900
          )
        ELSE 0
      END
    ) as total
  FROM profiles_with_overrides p
),
-- Payment Requests
payment_requests AS (
  SELECT 
    COALESCE(SUM(amount_usd) FILTER (WHERE status = 'paid'), 0) as total_paid_out,
    COALESCE(SUM(amount_usd) FILTER (WHERE status = 'approved'), 0) as total_approved,
    COALESCE(SUM(amount_usd) FILTER (WHERE status = 'pending'), 0) as total_pending
  FROM affiliate_payment_requests
  WHERE referrer_user_id = '6a3c5c04-fc94-4938-bdc2-c14c9ff8459c'  -- ⚠️ ALTERAR AQUI
)
-- Resultado final
SELECT 
  ROUND(tr.total::numeric, 2) as total_revenue,
  ROUND(mr.total::numeric, 2) as manual_revenue,
  ROUND((tr.total - mr.total)::numeric, 2) as net_revenue,
  ROUND(pr.total_paid_out::numeric, 2) as total_paid_out,
  ROUND(pr.total_approved::numeric, 2) as total_approved,
  ROUND(pr.total_pending::numeric, 2) as total_pending,
  ROUND(
    GREATEST(0, (tr.total - mr.total) - pr.total_paid_out - pr.total_approved - pr.total_pending)::numeric,
    2
  ) as available_balance,
  '✅ Cálculo corrigido: verifica scholarship_applications diretamente para legacy' as observacao
FROM total_revenue_calc tr
CROSS JOIN manual_revenue_calc mr
CROSS JOIN payment_requests pr;

