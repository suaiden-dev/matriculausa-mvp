-- Função para estatísticas de uso de cupons de desconto
-- Retorna total de cupons usados na base e quantos foram usados no período selecionado

CREATE OR REPLACE FUNCTION get_coupon_usage_stats(date_range text DEFAULT '30d')
RETURNS TABLE (
  total_used bigint,
  used_in_range bigint
) AS $$
DECLARE
  start_date timestamptz;
BEGIN
  -- Determina a data inicial conforme o range
  CASE date_range
    WHEN '7d' THEN start_date := now() - interval '7 days';
    WHEN '30d' THEN start_date := now() - interval '30 days';
    WHEN '90d' THEN start_date := now() - interval '90 days';
    WHEN '1y' THEN start_date := now() - interval '1 year';
    ELSE start_date := now() - interval '30 days';
  END CASE;

  RETURN QUERY
  SELECT
    -- total de cupons com status aplicado
    (SELECT COUNT(*)::bigint FROM used_referral_codes WHERE status = 'applied') AS total_used,
    -- usados dentro do período solicitado
    (SELECT COUNT(*)::bigint FROM used_referral_codes WHERE status = 'applied' AND applied_at >= start_date) AS used_in_range;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Permissões para execução via PostgREST
GRANT EXECUTE ON FUNCTION get_coupon_usage_stats(text) TO anon, authenticated, service_role;


