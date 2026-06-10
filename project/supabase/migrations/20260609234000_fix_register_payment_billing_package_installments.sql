do $$
declare
  v_sql text;
  v_original_sql text;
begin
  select pg_get_functiondef(p.oid)
    into v_sql
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname = 'register_payment_billing'
    and pg_get_function_identity_arguments(p.oid) = 'user_id_param uuid, fee_type_param text, amount_param numeric, payment_session_id_param text, payment_method_param text';

  if v_sql is null then
    raise exception 'register_payment_billing function not found';
  end if;

  v_original_sql := v_sql;

  v_sql := replace(
    v_sql,
    $old$
  ELSIF fee_type_param = 'ds160_package' THEN
    UPDATE user_profiles
    SET has_paid_ds160_package = true
    WHERE user_id = user_id_param;
$old$,
    $new$
  ELSIF fee_type_param = 'ds160_package' THEN
    UPDATE user_profiles
    SET has_paid_ds160_package = true
    WHERE user_id = user_id_param
      AND NOT EXISTS (
        SELECT 1
        FROM fee_installment_plans
        WHERE user_id = user_id_param
          AND fee_type = 'ds160_package'
          AND status = 'active'
          AND installments_paid < total_installments
      );
$new$
  );

  v_sql := replace(
    v_sql,
    $old$
  ELSIF fee_type_param = 'i539_cos_package' THEN
    UPDATE user_profiles
    SET has_paid_i539_cos_package = true
    WHERE user_id = user_id_param;
$old$,
    $new$
  ELSIF fee_type_param = 'i539_cos_package' THEN
    UPDATE user_profiles
    SET has_paid_i539_cos_package = true
    WHERE user_id = user_id_param
      AND NOT EXISTS (
        SELECT 1
        FROM fee_installment_plans
        WHERE user_id = user_id_param
          AND fee_type = 'i539_cos_package'
          AND status = 'active'
          AND installments_paid < total_installments
      );
$new$
  );

  if v_sql = v_original_sql then
    raise exception 'register_payment_billing package payment blocks were not updated';
  end if;

  execute v_sql;
end $$;
