/*
  # Funções Administrativas - Matricula Rewards

  1. Funções de Estatísticas
    - get_matricula_rewards_admin_stats - Estatísticas gerais do sistema
    - get_top_referrers - Top referenciadores
    - get_recent_matricula_activity - Atividade recente
    - get_platform_share_stats - Estatísticas por plataforma
    
  2. Funções de Moderação
    - moderate_matricula_user - Moderar usuários
    - block_affiliate_code - Bloquear códigos de afiliados
    
  3. Funções de Exportação
    - export_matricula_rewards_data - Exportar dados para CSV
*/

-- Função para obter estatísticas gerais do sistema
CREATE OR REPLACE FUNCTION get_matricula_rewards_admin_stats(date_range text DEFAULT '30d')
RETURNS TABLE (
  total_users bigint,
  total_referrals bigint,
  total_coins_earned numeric,
  total_coins_spent numeric,
  conversion_rate numeric,
  average_coins_per_user numeric
) AS $$
DECLARE
  start_date timestamptz;
BEGIN
  -- Calcular data de início baseada no range
  CASE date_range
    WHEN '7d' THEN start_date := now() - interval '7 days';
    WHEN '30d' THEN start_date := now() - interval '30 days';
    WHEN '90d' THEN start_date := now() - interval '90 days';
    WHEN '1y' THEN start_date := now() - interval '1 year';
    ELSE start_date := now() - interval '30 days';
  END CASE;

  RETURN QUERY
  SELECT 
    COUNT(DISTINCT u.id)::bigint as total_users,
    COUNT(DISTINCT ar.id)::bigint as total_referrals,
    COALESCE(SUM(mc.total_earned), 0) as total_coins_earned,
    COALESCE(SUM(mc.total_spent), 0) as total_coins_spent,
    CASE 
      WHEN COUNT(DISTINCT u.id) > 0 THEN 
        ROUND((COUNT(DISTINCT ar.id)::numeric / COUNT(DISTINCT u.id)::numeric) * 100, 2)
      ELSE 0 
    END as conversion_rate,
    CASE 
      WHEN COUNT(DISTINCT u.id) > 0 THEN 
        ROUND(COALESCE(SUM(mc.total_earned), 0) / COUNT(DISTINCT u.id)::numeric, 2)
      ELSE 0 
    END as average_coins_per_user
  FROM auth.users u
  LEFT JOIN affiliate_codes ac ON u.id = ac.user_id
  LEFT JOIN affiliate_referrals ar ON ac.user_id = ar.referrer_id 
    AND ar.created_at >= start_date
  LEFT JOIN matriculacoin_credits mc ON u.id = mc.user_id
  WHERE u.created_at >= start_date;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter top referenciadores
CREATE OR REPLACE FUNCTION get_top_referrers(limit_count integer DEFAULT 10)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  total_referrals bigint,
  total_earnings numeric,
  conversion_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    COALESCE(up.full_name, u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) as full_name,
    u.email::text,
    COUNT(ar.id)::bigint as total_referrals,
    COALESCE(mc.total_earned, 0) as total_earnings,
    CASE 
      WHEN COUNT(ar.id) > 0 THEN 
        ROUND((COUNT(ar.id)::numeric / COUNT(ar.id)::numeric) * 100, 2)
      ELSE 0 
    END as conversion_rate
  FROM auth.users u
  LEFT JOIN user_profiles up ON u.id = up.user_id
  LEFT JOIN affiliate_codes ac ON u.id = ac.user_id
  LEFT JOIN affiliate_referrals ar ON ac.user_id = ar.referrer_id
  LEFT JOIN matriculacoin_credits mc ON u.id = mc.user_id
  WHERE ac.id IS NOT NULL
  GROUP BY u.id, up.full_name, u.raw_user_meta_data, u.email, mc.total_earned
  ORDER BY total_referrals DESC, total_earnings DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter atividade recente
CREATE OR REPLACE FUNCTION get_recent_matricula_activity(limit_count integer DEFAULT 20)
RETURNS TABLE (
  id uuid,
  type text,
  user_id uuid,
  full_name text,
  description text,
  amount numeric,
  created_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mt.id,
    mt.type,
    mt.user_id,
    COALESCE(up.full_name, u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) as full_name,
    mt.description,
    mt.amount,
    mt.created_at
  FROM matriculacoin_transactions mt
  JOIN auth.users u ON mt.user_id = u.id
  LEFT JOIN user_profiles up ON u.id = up.user_id
  ORDER BY mt.created_at DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter estatísticas por plataforma
CREATE OR REPLACE FUNCTION get_platform_share_stats()
RETURNS TABLE (
  platform text,
  total_shares bigint,
  total_clicks bigint,
  conversion_rate numeric
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    s.platform,
    COUNT(DISTINCT s.id)::bigint as total_shares,
    COUNT(DISTINCT c.id)::bigint as total_clicks,
    CASE 
      WHEN COUNT(DISTINCT s.id) > 0 THEN 
        ROUND((COUNT(DISTINCT c.id)::numeric / COUNT(DISTINCT s.id)::numeric) * 100, 2)
      ELSE 0 
    END as conversion_rate
  FROM affiliate_shares s
  LEFT JOIN affiliate_clicks c ON s.affiliate_code_id = c.affiliate_code_id
  GROUP BY s.platform
  ORDER BY total_shares DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para moderar usuários
CREATE OR REPLACE FUNCTION moderate_matricula_user(
  user_id_param uuid,
  action text,
  admin_user_id uuid
)
RETURNS void AS $$
BEGIN
  -- Verificar se o usuário é admin
  IF NOT EXISTS (
    SELECT 1 FROM auth.users 
    WHERE id = admin_user_id 
    AND raw_user_meta_data->>'role' = 'admin'
  ) THEN
    RAISE EXCEPTION 'Access denied: Admin privileges required';
  END IF;

  -- Executar ação de moderação
  CASE action
    WHEN 'block' THEN
      -- Bloquear código de afiliado
      UPDATE affiliate_codes 
      SET is_active = false 
      WHERE user_id = user_id_param;
      
      -- Registrar log
      INSERT INTO admin_logs (admin_user_id, action, target_type, target_id, details)
      VALUES (
        admin_user_id,
        'block_affiliate_code',
        'user',
        user_id_param,
        jsonb_build_object('reason', 'Admin moderation', 'blocked_at', now())
      );
      
    WHEN 'unblock' THEN
      -- Desbloquear código de afiliado
      UPDATE affiliate_codes 
      SET is_active = true 
      WHERE user_id = user_id_param;
      
      -- Registrar log
      INSERT INTO admin_logs (admin_user_id, action, target_type, target_id, details)
      VALUES (
        admin_user_id,
        'unblock_affiliate_code',
        'user',
        user_id_param,
        jsonb_build_object('reason', 'Admin moderation', 'unblocked_at', now())
      );
      
    ELSE
      RAISE EXCEPTION 'Invalid action: %', action;
  END CASE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para exportar dados
CREATE OR REPLACE FUNCTION export_matricula_rewards_data(date_range text DEFAULT '30d')
RETURNS TABLE (
  user_email text,
  full_name text,
  affiliate_code text,
  total_referrals bigint,
  total_earnings numeric,
  total_spent numeric,
  current_balance numeric,
  last_activity timestamptz
) AS $$
DECLARE
  start_date timestamptz;
BEGIN
  -- Calcular data de início baseada no range
  CASE date_range
    WHEN '7d' THEN start_date := now() - interval '7 days';
    WHEN '30d' THEN start_date := now() - interval '30 days';
    WHEN '90d' THEN start_date := now() - interval '90 days';
    WHEN '1y' THEN start_date := now() - interval '1 year';
    ELSE start_date := now() - interval '30 days';
  END CASE;

  RETURN QUERY
  SELECT 
    u.email::text as user_email,
    COALESCE(up.full_name, u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) as full_name,
    ac.code as affiliate_code,
    COUNT(ar.id)::bigint as total_referrals,
    COALESCE(mc.total_earned, 0) as total_earnings,
    COALESCE(mc.total_spent, 0) as total_spent,
    COALESCE(mc.balance, 0) as current_balance,
    COALESCE(up.last_active, u.last_sign_in_at, u.created_at) as last_activity
  FROM auth.users u
  LEFT JOIN user_profiles up ON u.id = up.user_id
  LEFT JOIN affiliate_codes ac ON u.id = ac.user_id
  LEFT JOIN affiliate_referrals ar ON ac.user_id = ar.referrer_id 
    AND ar.created_at >= start_date
  LEFT JOIN matriculacoin_credits mc ON u.id = mc.user_id
  WHERE u.created_at >= start_date
  GROUP BY u.id, u.email, up.full_name, u.raw_user_meta_data, ac.code, mc.total_earned, mc.total_spent, mc.balance, up.last_active, u.last_sign_in_at, u.created_at
  ORDER BY total_referrals DESC, total_earnings DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para obter estatísticas detalhadas de um usuário específico
CREATE OR REPLACE FUNCTION get_user_matricula_stats(user_id_param uuid)
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  affiliate_code text,
  total_referrals bigint,
  total_earnings numeric,
  total_spent numeric,
  current_balance numeric,
  conversion_rate numeric,
  recent_referrals jsonb,
  recent_transactions jsonb
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    u.id as user_id,
    COALESCE(up.full_name, u.raw_user_meta_data->>'name', split_part(u.email, '@', 1)) as full_name,
    u.email::text,
    ac.code as affiliate_code,
    COUNT(ar.id)::bigint as total_referrals,
    COALESCE(mc.total_earned, 0) as total_earnings,
    COALESCE(mc.total_spent, 0) as total_spent,
    COALESCE(mc.balance, 0) as current_balance,
    CASE 
      WHEN COUNT(ar.id) > 0 THEN 
        ROUND((COUNT(ar.id)::numeric / COUNT(ar.id)::numeric) * 100, 2)
      ELSE 0 
    END as conversion_rate,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', ar2.id,
          'referred_email', u2.email,
          'created_at', ar2.created_at,
          'status', ar2.status
        )
      ) FROM affiliate_referrals ar2
       JOIN auth.users u2 ON ar2.referred_id = u2.id
       WHERE ar2.referrer_id = user_id_param
       ORDER BY ar2.created_at DESC
       LIMIT 5), '[]'::jsonb
    ) as recent_referrals,
    COALESCE(
      (SELECT jsonb_agg(
        jsonb_build_object(
          'id', mt.id,
          'type', mt.type,
          'amount', mt.amount,
          'description', mt.description,
          'created_at', mt.created_at
        )
      ) FROM matriculacoin_transactions mt
       WHERE mt.user_id = user_id_param
       ORDER BY mt.created_at DESC
       LIMIT 10), '[]'::jsonb
    ) as recent_transactions
  FROM auth.users u
  LEFT JOIN user_profiles up ON u.id = up.user_id
  LEFT JOIN affiliate_codes ac ON u.id = ac.user_id
  LEFT JOIN affiliate_referrals ar ON ac.user_id = ar.referrer_id
  LEFT JOIN matriculacoin_credits mc ON u.id = mc.user_id
  WHERE u.id = user_id_param
  GROUP BY u.id, up.full_name, u.raw_user_meta_data, u.email, ac.code, mc.total_earned, mc.total_spent, mc.balance;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER; 