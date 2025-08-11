/* Idempotência e case-insensitive para validate_and_apply_referral_code */
create or replace function validate_and_apply_referral_code(
  user_id_param uuid,
  affiliate_code_param text
)
returns json as $$
declare
  referrer_user_id uuid;
  discount_amount numeric := 50.00;
  stripe_coupon_id text;
  normalized_code text;
  existing_used record;
begin
  normalized_code := upper(trim(affiliate_code_param));

  -- Se já usou este mesmo código, retorna sucesso idempotente
  select * into existing_used
  from used_referral_codes
  where user_id = user_id_param and upper(affiliate_code) = normalized_code
  limit 1;

  if found then
    return json_build_object(
      'success', true,
      'referrer_id', existing_used.referrer_id,
      'discount_amount', existing_used.discount_amount,
      'stripe_coupon_id', existing_used.stripe_coupon_id,
      'affiliate_code', existing_used.affiliate_code
    );
  end if;

  -- Verifica se o código existe e está ativo (case-insensitive)
  select user_id into referrer_user_id
  from affiliate_codes
  where upper(code) = normalized_code and is_active = true;

  if referrer_user_id is null then
    return json_build_object('success', false, 'error', 'Código de referência inválido');
  end if;

  -- Bloqueia auto-referência
  if referrer_user_id = user_id_param then
    return json_build_object('success', false, 'error', 'Não é possível usar seu próprio código de referência');
  end if;

  -- Se já usou algum código diferente, bloqueia
  if exists(select 1 from used_referral_codes where user_id = user_id_param) then
    return json_build_object('success', false, 'error', 'Você já utilizou um código de referência');
  end if;

  -- Cupom genérico por affiliate_code
  stripe_coupon_id := 'MATR_' || normalized_code;

  insert into used_referral_codes (
    user_id, affiliate_code, referrer_id, discount_amount, stripe_coupon_id, status, applied_at
  ) values (
    user_id_param, normalized_code, referrer_user_id, discount_amount, stripe_coupon_id, 'applied', now()
  );

  return json_build_object(
    'success', true,
    'referrer_id', referrer_user_id,
    'discount_amount', discount_amount,
    'stripe_coupon_id', stripe_coupon_id,
    'affiliate_code', normalized_code
  );
end;
$$ language plpgsql security definer;
