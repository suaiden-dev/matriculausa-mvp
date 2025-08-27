/*
  # Funções de Analytics para Sistema de Afiliados
  
  Esta migração cria funções específicas para buscar dados reais de analytics
  do dashboard de affiliate admin, incluindo:
  
  1. Estatísticas gerais de vendedores e estudantes
  2. Dados de receita e conversões
  3. Performance por vendedor
  4. Métricas de crescimento mensal
*/

-- Função para obter estatísticas gerais de analytics
CREATE OR REPLACE FUNCTION get_affiliate_admin_analytics(admin_user_id uuid)
RETURNS TABLE (
  total_sellers bigint,
  active_sellers bigint,
  total_students bigint,
  total_revenue numeric,
  monthly_growth numeric,
  conversion_rate numeric,
  avg_revenue_per_student numeric
) AS $$
DECLARE
  start_date timestamptz;
  end_date timestamptz;
BEGIN
  -- Período atual (mês atual)
  start_date := date_trunc('month', now());
  end_date := date_trunc('month', now()) + interval '1 month' - interval '1 second';
  
  RETURN QUERY
  WITH seller_stats AS (
    SELECT 
      COUNT(*) as total_sellers,
      COUNT(*) FILTER (WHERE s.is_active = true) as active_sellers
    FROM sellers s
    JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
    WHERE aa.user_id = admin_user_id
  ),
  student_stats AS (
    SELECT 
      COUNT(DISTINCT ar.referred_id) as total_students,
      COALESCE(SUM(ar.payment_amount), 0) as total_revenue
    FROM affiliate_referrals ar
    JOIN sellers s ON ar.referrer_id = s.user_id
    JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
    WHERE aa.user_id = admin_user_id
      AND ar.status = 'completed'
      AND ar.created_at >= start_date
      AND ar.created_at <= end_date
  ),
  growth_stats AS (
    SELECT 
      COALESCE(
        CASE 
          WHEN prev_month.count > 0 THEN
            ((curr_month.count - prev_month.count)::numeric / prev_month.count::numeric) * 100
          ELSE 
            CASE WHEN curr_month.count > 0 THEN 100 ELSE 0 END
        END, 0
      ) as monthly_growth
    FROM (
      SELECT COUNT(DISTINCT ar.referred_id) as count
      FROM affiliate_referrals ar
      JOIN sellers s ON ar.referrer_id = s.user_id
      JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
      WHERE aa.user_id = admin_user_id
        AND ar.status = 'completed'
        AND ar.created_at >= start_date
        AND ar.created_at <= end_date
    ) curr_month,
    (
      SELECT COUNT(DISTINCT ar.referred_id) as count
      FROM affiliate_referrals ar
      JOIN sellers s ON ar.referrer_id = s.user_id
      JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
      WHERE aa.user_id = admin_user_id
        AND ar.status = 'completed'
        AND ar.created_at >= date_trunc('month', now() - interval '1 month')
        AND ar.created_at < start_date
    ) prev_month
  )
  SELECT 
    ss.total_sellers,
    ss.active_sellers,
    st.total_students,
    st.total_revenue,
    gs.monthly_growth,
    CASE 
      WHEN ss.active_sellers > 0 THEN 
        (st.total_students::numeric / ss.active_sellers::numeric) * 100
      ELSE 0 
    END as conversion_rate,
    CASE 
      WHEN st.total_students > 0 THEN 
        st.total_revenue / st.total_students::numeric
      ELSE 0 
    END as avg_revenue_per_student
  FROM seller_stats ss
  CROSS JOIN student_stats st
  CROSS JOIN growth_stats gs;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter dados detalhados de vendedores
CREATE OR REPLACE FUNCTION get_affiliate_sellers_analytics(admin_user_id uuid)
RETURNS TABLE (
  seller_id uuid,
  seller_name text,
  seller_email text,
  referral_code text,
  students_count bigint,
  total_revenue numeric,
  avg_revenue_per_student numeric,
  last_referral_date timestamptz,
  is_active boolean
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as seller_id,
    s.name as seller_name,
    s.email as seller_email,
    s.referral_code,
    COUNT(DISTINCT ar.referred_id) as students_count,
    COALESCE(SUM(ar.payment_amount), 0) as total_revenue,
    CASE 
      WHEN COUNT(DISTINCT ar.referred_id) > 0 THEN 
        COALESCE(SUM(ar.payment_amount), 0) / COUNT(DISTINCT ar.referred_id)::numeric
      ELSE 0 
    END as avg_revenue_per_student,
    MAX(ar.created_at) as last_referral_date,
    s.is_active
  FROM sellers s
  LEFT JOIN affiliate_referrals ar ON s.user_id = ar.referrer_id AND ar.status = 'completed'
  JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
  WHERE aa.user_id = admin_user_id
  GROUP BY s.id, s.name, s.email, s.referral_code, s.is_active
  ORDER BY students_count DESC, total_revenue DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter dados de estudantes referenciados
CREATE OR REPLACE FUNCTION get_affiliate_students_analytics(admin_user_id uuid)
RETURNS TABLE (
  student_id uuid,
  student_name text,
  student_email text,
  country text,
  referred_by_seller_id uuid,
  seller_name text,
  seller_referral_code text,
  referral_code_used text,
  total_paid numeric,
  created_at timestamptz,
  status text
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ar.referred_id as student_id,
    COALESCE(up.full_name, 'Nome não disponível') as student_name,
    u.email as student_email,
    COALESCE(up.country, 'País não disponível') as country,
    s.id as referred_by_seller_id,
    s.name as seller_name,
    s.referral_code as seller_referral_code,
    ar.affiliate_code as referral_code_used,
    COALESCE(ar.payment_amount, 0) as total_paid,
    ar.created_at,
    ar.status
  FROM affiliate_referrals ar
  JOIN sellers s ON ar.referrer_id = s.user_id
  JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
  LEFT JOIN auth.users u ON ar.referred_id = u.id
  LEFT JOIN user_profiles up ON u.id = up.user_id
  WHERE aa.user_id = admin_user_id
    AND ar.status = 'completed'
  ORDER BY ar.created_at DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter dados de performance mensal
CREATE OR REPLACE FUNCTION get_affiliate_monthly_performance(admin_user_id uuid, months_back integer DEFAULT 12)
RETURNS TABLE (
  month_year text,
  students_count bigint,
  total_revenue numeric,
  active_sellers bigint
) AS $$
DECLARE
  month_date date;
BEGIN
  FOR month_date IN 
    SELECT generate_series(
      date_trunc('month', now() - (months_back || ' months')::interval),
      date_trunc('month', now()),
      '1 month'::interval
    )::date
  LOOP
    RETURN QUERY
    SELECT 
      to_char(month_date, 'Mon YYYY') as month_year,
      COUNT(DISTINCT ar.referred_id) as students_count,
      COALESCE(SUM(ar.payment_amount), 0) as total_revenue,
      COUNT(DISTINCT s.id) FILTER (WHERE ar.referred_id IS NOT NULL) as active_sellers
    FROM generate_series(
      month_date,
      month_date + interval '1 month' - interval '1 second',
      '1 day'::interval
    ) d
    LEFT JOIN affiliate_referrals ar ON date_trunc('day', ar.created_at) = date_trunc('day', d)
      AND ar.status = 'completed'
    LEFT JOIN sellers s ON ar.referrer_id = s.user_id
    LEFT JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
    WHERE aa.user_id = admin_user_id OR aa.user_id IS NULL
    GROUP BY month_date;
  END LOOP;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter top vendedores por performance
CREATE OR REPLACE FUNCTION get_affiliate_top_sellers(admin_user_id uuid, limit_count integer DEFAULT 10)
RETURNS TABLE (
  seller_id uuid,
  seller_name text,
  seller_email text,
  referral_code text,
  students_count bigint,
  total_revenue numeric,
  conversion_rate numeric,
  avg_revenue_per_student numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id as seller_id,
    s.name as seller_name,
    s.email as seller_email,
    s.referral_code,
    COUNT(DISTINCT ar.referred_id) as students_count,
    COALESCE(SUM(ar.payment_amount), 0) as total_revenue,
    CASE 
      WHEN COUNT(DISTINCT ar.referred_id) > 0 THEN 
        (COUNT(DISTINCT ar.referred_id)::numeric / COUNT(DISTINCT ar.referred_id)::numeric) * 100
      ELSE 0 
    END as conversion_rate,
    CASE 
      WHEN COUNT(DISTINCT ar.referred_id) > 0 THEN 
        COALESCE(SUM(ar.payment_amount), 0) / COUNT(DISTINCT ar.referred_id)::numeric
      ELSE 0 
    END as avg_revenue_per_student
  FROM sellers s
  LEFT JOIN affiliate_referrals ar ON s.user_id = ar.referrer_id AND ar.status = 'completed'
  JOIN affiliate_admins aa ON s.affiliate_admin_id = aa.id
  WHERE aa.user_id = admin_user_id
  GROUP BY s.id, s.name, s.email, s.referral_code
  ORDER BY students_count DESC, total_revenue DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Comentários das funções
COMMENT ON FUNCTION get_affiliate_admin_analytics(uuid) IS 'Retorna estatísticas gerais de analytics para um affiliate admin';
COMMENT ON FUNCTION get_affiliate_sellers_analytics(uuid) IS 'Retorna dados detalhados de vendedores para um affiliate admin';
COMMENT ON FUNCTION get_affiliate_students_analytics(uuid) IS 'Retorna dados de estudantes referenciados para um affiliate admin';
COMMENT ON FUNCTION get_affiliate_monthly_performance(uuid, integer) IS 'Retorna performance mensal para um affiliate admin';
COMMENT ON FUNCTION get_affiliate_top_sellers(uuid, integer) IS 'Retorna top vendedores por performance para um affiliate admin';
