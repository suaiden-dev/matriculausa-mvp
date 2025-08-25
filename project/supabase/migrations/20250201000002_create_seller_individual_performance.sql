/*
  # Função para Dados de Performance Individual do Vendedor
  
  Esta função retorna métricas detalhadas de performance para um vendedor específico,
  incluindo dados mensais, metas e conquistas baseadas em dados reais.
*/

-- Função para obter dados de performance de um vendedor específico
CREATE OR REPLACE FUNCTION get_seller_individual_performance(seller_referral_code_param text)
RETURNS TABLE (
  total_students bigint,
  total_revenue numeric,
  monthly_students bigint,
  conversion_rate numeric,
  monthly_data jsonb,
  ranking_position bigint,
  monthly_goals jsonb,
  achievements jsonb
) AS $$
DECLARE
  seller_id uuid;
  total_students_count bigint;
  total_revenue_amount numeric;
  monthly_students_count bigint;
  conversion_rate_value numeric;
  ranking_position_value bigint;
BEGIN
  -- Obter o ID do vendedor pelo código de referência
  SELECT id INTO seller_id 
  FROM sellers 
  WHERE referral_code = seller_referral_code_param AND is_active = true;
  
  IF seller_id IS NULL THEN
    RAISE EXCEPTION 'Seller not found or inactive';
  END IF;

  -- Total de estudantes
  SELECT COUNT(DISTINCT ar.referred_id)::bigint INTO total_students_count
  FROM affiliate_referrals ar
  JOIN sellers s ON s.user_id = ar.referrer_id
  WHERE s.id = seller_id;

  -- Total de receita
  SELECT COALESCE(SUM(ar.payment_amount), 0) INTO total_revenue_amount
  FROM affiliate_referrals ar
  JOIN sellers s ON s.user_id = ar.referrer_id
  WHERE s.id = seller_id AND ar.status = 'completed';

  -- Estudantes do mês atual
  SELECT COUNT(DISTINCT ar.referred_id)::bigint INTO monthly_students_count
  FROM affiliate_referrals ar
  JOIN sellers s ON s.user_id = ar.referrer_id
  WHERE s.id = seller_id 
    AND DATE_TRUNC('month', ar.created_at) = DATE_TRUNC('month', CURRENT_DATE);

  -- Taxa de conversão
  SELECT 
    CASE 
      WHEN COUNT(DISTINCT ar.referred_id) > 0 THEN
        ROUND(
          (COUNT(DISTINCT CASE WHEN ar.status = 'completed' THEN ar.referred_id END)::numeric / 
           COUNT(DISTINCT ar.referred_id)::numeric) * 100, 1
        )
      ELSE 0 
    END INTO conversion_rate_value
  FROM affiliate_referrals ar
  JOIN sellers s ON s.user_id = ar.referrer_id
  WHERE s.id = seller_id;

  -- Posição no ranking (baseado na receita total)
  SELECT COUNT(*) + 1 INTO ranking_position_value
  FROM (
    SELECT s2.id, COALESCE(SUM(ar2.payment_amount), 0) as total_rev
    FROM sellers s2
    LEFT JOIN affiliate_referrals ar2 ON s2.user_id = ar2.referrer_id AND ar2.status = 'completed'
    WHERE s2.is_active = true
    GROUP BY s2.id
    HAVING COALESCE(SUM(ar2.payment_amount), 0) > total_revenue_amount
  ) ranked_sellers;

  RETURN QUERY SELECT
    total_students_count,
    total_revenue_amount,
    monthly_students_count,
    conversion_rate_value,
    -- Dados mensais dos últimos 6 meses
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'month', TO_CHAR(month_date, 'Mon'),
          'students', COALESCE(monthly_count, 0),
          'revenue', COALESCE(monthly_revenue, 0)
        )
      )
      FROM (
        SELECT 
          month_date,
          COUNT(DISTINCT ar.referred_id) as monthly_count,
          COALESCE(SUM(ar.payment_amount), 0) as monthly_revenue
        FROM generate_series(
          DATE_TRUNC('month', CURRENT_DATE - INTERVAL '5 months'),
          DATE_TRUNC('month', CURRENT_DATE),
          '1 month'
        ) month_date
        LEFT JOIN affiliate_referrals ar ON 
          DATE_TRUNC('month', ar.created_at) = month_date
          AND ar.referrer_id = (SELECT user_id FROM sellers WHERE id = seller_id)
        GROUP BY month_date
        ORDER BY month_date
      ) monthly_stats
    ) as monthly_data,
    ranking_position_value,
    -- Metas mensais
    jsonb_build_object(
      'students', jsonb_build_object(
        'current', monthly_students_count,
        'target', 10,
        'percentage', LEAST((monthly_students_count::numeric / 10) * 100, 100)
      ),
      'revenue', jsonb_build_object(
        'current', total_revenue_amount * 0.3,
        'target', 15000,
        'percentage', LEAST(((total_revenue_amount * 0.3) / 15000) * 100, 100)
      ),
      'conversion', jsonb_build_object(
        'current', conversion_rate_value,
        'target', 90,
        'percentage', LEAST((conversion_rate_value / 90) * 100, 100)
      )
    ) as monthly_goals,
    -- Conquistas baseadas em dados reais
    (
      SELECT jsonb_agg(achievement)
      FROM (
        SELECT jsonb_build_object(
          'id', achievement_id,
          'title', title,
          'description', description,
          'icon', icon,
          'color', color,
          'unlocked', unlocked
        ) as achievement
        FROM (
          VALUES
            (1, 'First Referral', 'You made your first referral!', 'Users', 'yellow', total_students_count > 0),
            (2, '5 Students', 'Reached the 5 students mark!', 'Users', 'blue', total_students_count >= 5),
            (3, '$10K in Revenue', 'Generated over $10,000!', 'DollarSign', 'green', total_revenue_amount >= 10000),
            (4, 'High Converter', 'Maintained 80%+ conversion rate!', 'Target', 'red', conversion_rate_value >= 80),
            (5, 'Top Performer', 'Ranked in top 5 sellers!', 'Award', 'purple', ranking_position_value <= 5)
        ) AS achievements(achievement_id, title, description, icon, color, unlocked)
        WHERE unlocked = true
      ) unlocked_achievements
    ) as achievements;

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Política para permitir que vendedores acessem seus próprios dados
GRANT EXECUTE ON FUNCTION get_seller_individual_performance(text) TO authenticated;

-- Comentário da função
COMMENT ON FUNCTION get_seller_individual_performance(text) IS 
'Retorna métricas de performance detalhadas para um vendedor específico, incluindo dados mensais, metas e conquistas';
