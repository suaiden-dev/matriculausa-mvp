-- Função RPC para consolidar todas as queries de useFeeConfig em uma única chamada
-- Isso reduz de 4 queries para 1 request
CREATE OR REPLACE FUNCTION get_user_fee_config_consolidated(target_user_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  result jsonb;
  package_fees jsonb;
  fee_overrides jsonb;
  real_payment jsonb;
  system_type_val text;
BEGIN
  -- 1. Buscar package fees
  SELECT COALESCE(
    (
      SELECT jsonb_agg(row_to_json(pf))
      FROM (
        SELECT * FROM get_user_package_fees(target_user_id)
      ) pf
    ),
    '[]'::jsonb
  ) INTO package_fees;

  -- 2. Buscar fee overrides
  SELECT COALESCE(
    (
      SELECT row_to_json(ufo)::jsonb
      FROM (
        SELECT * FROM get_user_fee_overrides(target_user_id)
      ) ufo
    ),
    'null'::jsonb
  ) INTO fee_overrides;

  -- 3. Buscar real payment amount
  SELECT COALESCE(
    (
      SELECT jsonb_agg(row_to_json(rp))
      FROM (
        SELECT * FROM get_real_payment_amount(target_user_id)
      ) rp
    ),
    '[]'::jsonb
  ) INTO real_payment;

  -- 4. Buscar system_type
  SELECT up.system_type INTO system_type_val
  FROM user_profiles up
  WHERE up.user_id = target_user_id;

  -- Construir resultado consolidado
  SELECT jsonb_build_object(
    'user_package_fees', COALESCE(package_fees->0, 'null'::jsonb),
    'user_fee_overrides', COALESCE(fee_overrides, 'null'::jsonb),
    'real_payment_amounts', COALESCE(real_payment, '[]'::jsonb),
    'system_type', COALESCE(system_type_val, 'legacy')
  ) INTO result;
  
  RETURN result;
END;
$$;

-- Comentário explicativo
COMMENT ON FUNCTION get_user_fee_config_consolidated(uuid) IS 
'Consolida todas as queries de useFeeConfig (package fees, fee overrides, real payment amounts, system_type) em uma única chamada RPC, reduzindo de 4 queries para 1 request.';

