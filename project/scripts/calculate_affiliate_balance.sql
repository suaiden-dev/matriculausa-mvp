-- Script para calcular valores do Payment Management de um Affiliate Admin
-- Este script executa a mesma lógica do código TypeScript
-- Substitua 'contato@brantimmigration.com' pelo email do affiliate admin que você quer verificar

-- 1. Buscar affiliate_admin_id do Matheus Brant
WITH affiliate_admin_info AS (
  SELECT aa.id as affiliate_admin_id, aa.user_id, u.email
  FROM affiliate_admins aa
  JOIN auth.users u ON aa.user_id = u.id
  WHERE u.email = 'contato@brantimmigration.com'
  LIMIT 1
),
-- 2. Buscar perfis usando a mesma RPC do código
profiles_with_fees AS (
  SELECT 
    p.user_id,
    p.profile_id,
    p.has_paid_selection_process_fee,
    p.has_paid_i20_control_fee,
    p.is_scholarship_fee_paid,
    p.dependents,
    p.system_type
  FROM affiliate_admin_info aai
  CROSS JOIN LATERAL get_affiliate_admin_profiles_with_fees(aai.user_id) p
),
-- 3. Buscar overrides (simulando a lógica do código)
profiles_with_overrides AS (
  SELECT 
    p.*,
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
  FROM profiles_with_fees p
),
-- 4. Calcular receita total (mesma lógica do código)
revenue_calculations AS (
  SELECT 
    p.*,
    -- Selection Process Fee
    CASE 
      WHEN p.has_paid_selection_process_fee THEN
        CASE 
          WHEN (p.overrides->>'selection_process_fee') IS NOT NULL THEN
            (p.overrides->>'selection_process_fee')::numeric
          ELSE
            CASE 
              WHEN p.system_type = 'simplified' THEN 350
              ELSE 400
            END + (COALESCE(p.dependents, 0) * 150)
        END
      ELSE 0
    END as selection_process_revenue,
    
    -- Scholarship Fee
    CASE 
      WHEN p.is_scholarship_fee_paid THEN
        CASE 
          WHEN (p.overrides->>'scholarship_fee') IS NOT NULL THEN
            (p.overrides->>'scholarship_fee')::numeric
          ELSE
            CASE 
              WHEN p.system_type = 'simplified' THEN 550
              ELSE 900
            END
        END
      ELSE 0
    END as scholarship_revenue,
    
    -- I-20 Control Fee
    CASE 
      WHEN p.is_scholarship_fee_paid AND p.has_paid_i20_control_fee THEN
        CASE 
          WHEN (p.overrides->>'i20_control_fee') IS NOT NULL THEN
            (p.overrides->>'i20_control_fee')::numeric
          ELSE 900
        END
      ELSE 0
    END as i20_control_revenue
  FROM profiles_with_overrides p
),
-- 5. Agregar valores
totals AS (
  SELECT 
    COUNT(*) as total_students,
    COUNT(*) FILTER (WHERE has_paid_selection_process_fee) as students_with_selection_fee,
    COUNT(*) FILTER (WHERE is_scholarship_fee_paid) as students_with_scholarship_fee,
    COUNT(*) FILTER (WHERE has_paid_i20_control_fee) as students_with_i20_fee,
    SUM(selection_process_revenue + scholarship_revenue + i20_control_revenue) as total_revenue,
    SUM(selection_process_revenue) as total_selection_revenue,
    SUM(scholarship_revenue) as total_scholarship_revenue,
    SUM(i20_control_revenue) as total_i20_revenue
  FROM revenue_calculations
),
-- 6. Buscar payment requests
payment_requests AS (
  SELECT 
    aai.user_id,
    COUNT(*) FILTER (WHERE status = 'paid') as paid_requests_count,
    COUNT(*) FILTER (WHERE status = 'approved') as approved_requests_count,
    COUNT(*) FILTER (WHERE status = 'pending') as pending_requests_count,
    COALESCE(SUM(amount_usd) FILTER (WHERE status = 'paid'), 0) as total_paid_out,
    COALESCE(SUM(amount_usd) FILTER (WHERE status = 'approved'), 0) as total_approved,
    COALESCE(SUM(amount_usd) FILTER (WHERE status = 'pending'), 0) as total_pending
  FROM affiliate_admin_info aai
  LEFT JOIN affiliate_payment_requests apr ON apr.referrer_user_id = aai.user_id
  GROUP BY aai.user_id
)
-- 7. Resultado final
SELECT 
  aai.email as affiliate_email,
  t.total_students,
  t.students_with_selection_fee,
  t.students_with_scholarship_fee,
  t.students_with_i20_fee,
  ROUND(t.total_revenue::numeric, 2) as total_revenue,
  ROUND(t.total_selection_revenue::numeric, 2) as total_selection_revenue,
  ROUND(t.total_scholarship_revenue::numeric, 2) as total_scholarship_revenue,
  ROUND(t.total_i20_revenue::numeric, 2) as total_i20_revenue,
  -- Manual revenue (assumindo que toda receita pode ser manual, como no código)
  ROUND(t.total_revenue::numeric, 2) as manual_revenue,
  -- Payment requests
  COALESCE(pr.paid_requests_count, 0) as paid_requests_count,
  COALESCE(pr.approved_requests_count, 0) as approved_requests_count,
  COALESCE(pr.pending_requests_count, 0) as pending_requests_count,
  ROUND(COALESCE(pr.total_paid_out, 0)::numeric, 2) as total_paid_out,
  ROUND(COALESCE(pr.total_approved, 0)::numeric, 2) as total_approved,
  ROUND(COALESCE(pr.total_pending, 0)::numeric, 2) as total_pending,
  -- Available Balance (mesma fórmula do código)
  -- Nota: No código atual, manualRevenue = totalRevenue, então:
  -- availableBalance = max(0, (totalRevenue - totalRevenue) - totalPaidOut - totalApproved - totalPending)
  -- Isso resulta em: max(0, -totalPaidOut - totalApproved - totalPending)
  -- O que significa que se houver qualquer payment request, o balance será 0
  GREATEST(0, 
    ROUND((t.total_revenue::numeric - t.total_revenue::numeric - COALESCE(pr.total_paid_out, 0) - COALESCE(pr.total_approved, 0) - COALESCE(pr.total_pending, 0)), 2)
  ) as available_balance
FROM affiliate_admin_info aai
CROSS JOIN totals t
LEFT JOIN payment_requests pr ON pr.user_id = aai.user_id;

