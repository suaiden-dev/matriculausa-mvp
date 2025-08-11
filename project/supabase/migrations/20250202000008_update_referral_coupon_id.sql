/*
  Atualiza validate_and_apply_referral_code para usar um cupom genérico por affiliate_code
  para permitir uso direto do código no Checkout do Stripe (promotion code).
*/

create or replace function validate_and_apply_referral_code(
  user_id_param uuid,
  affiliate_code_param text
)
returns json as $$
declare
  referrer_user_id uuid;
  discount_amount numeric := 50.00;
  stripe_coupon_id text;
  result json;
begin
  -- Verifica se o código existe e está ativo
  select user_id into referrer_user_id
  from affiliate_codes
  where code = affiliate_code_param and is_active = true;
  
  if referrer_user_id is null then
    return json_build_object('success', false, 'error', 'Código de referência inválido');
  end if;
  
  -- Bloqueia auto-referência
  if referrer_user_id = user_id_param then
    return json_build_object('success', false, 'error', 'Não é possível usar seu próprio código de referência');
  end if;
  
  -- Verifica se usuário já usou algum código
  if exists(select 1 from used_referral_codes where user_id = user_id_param) then
    return json_build_object('success', false, 'error', 'Você já utilizou um código de referência');
  end if;
  
  -- Verifica se já usou este código
  if exists(select 1 from used_referral_codes where user_id = user_id_param and affiliate_code = affiliate_code_param) then
    return json_build_object('success', false, 'error', 'Este código já foi utilizado');
  end if;
  
  -- Cupom genérico por affiliate_code (permite Promotion Code no Stripe)
  stripe_coupon_id := 'MATR_' || affiliate_code_param;
  
  -- Registra o uso do código
  insert into used_referral_codes (
    user_id,
    affiliate_code,
    referrer_id,
    discount_amount,
    stripe_coupon_id,
    status,
    applied_at
  ) values (
    user_id_param,
    affiliate_code_param,
    referrer_user_id,
    discount_amount,
    stripe_coupon_id,
    'applied',
    now()
  );
  
  return json_build_object(
    'success', true,
    'referrer_id', referrer_user_id,
    'discount_amount', discount_amount,
    'stripe_coupon_id', stripe_coupon_id,
    'affiliate_code', affiliate_code_param
  );
end;
$$ language plpgsql security definer;
