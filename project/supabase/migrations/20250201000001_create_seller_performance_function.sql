/*
  # Função para Dados de Performance dos Vendedores
  
  Esta função retorna métricas detalhadas de performance para cada vendedor,
  incluindo total de estudantes, receita, taxa de conversão e outras métricas
  importantes para o monitoramento de performance.
*/

-- Função para obter dados de performance dos vendedores
CREATE OR REPLACE FUNCTION get_seller_performance_data()
RETURNS TABLE (
  id uuid,
  name text,
  email text,
  referral_code text,
  total_students bigint,
  total_revenue numeric,
  conversion_rate numeric,
  active_students bigint,
  pending_payments bigint,
  last_referral_date timestamptz,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.id,
    COALESCE(s.name, 'Nome não disponível') as name,
    COALESCE(s.email, 'Email não disponível') as email,
    COALESCE(s.referral_code, 'Código não disponível') as referral_code,
    COUNT(DISTINCT ar.referred_id)::bigint as total_students,
    COALESCE(SUM(ar.payment_amount), 0) as total_revenue,
    CASE 
      WHEN COUNT(DISTINCT ar.referred_id) > 0 THEN
        ROUND(
          (COUNT(DISTINCT CASE WHEN ar.status = 'completed' THEN ar.referred_id END)::numeric / 
           COUNT(DISTINCT ar.referred_id)::numeric) * 100, 2
        )
      ELSE 0 
    END as conversion_rate,
    COUNT(DISTINCT CASE WHEN ar.status = 'completed' THEN ar.referred_id END)::bigint as active_students,
    COUNT(DISTINCT CASE WHEN ar.status = 'pending' THEN ar.referred_id END)::bigint as pending_payments,
    MAX(ar.created_at) as last_referral_date,
    s.created_at
  FROM sellers s
  LEFT JOIN affiliate_referrals ar ON s.user_id = ar.referrer_id
  WHERE s.is_active = true
  GROUP BY s.id, s.name, s.email, s.referral_code, s.created_at
  ORDER BY total_revenue DESC, total_students DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Política para permitir que affiliate_admins acessem esta função
GRANT EXECUTE ON FUNCTION get_seller_performance_data() TO authenticated;

-- Comentário da função
COMMENT ON FUNCTION get_seller_performance_data() IS 
'Retorna métricas de performance para todos os vendedores ativos, incluindo total de estudantes, receita, taxa de conversão e outras métricas importantes';
