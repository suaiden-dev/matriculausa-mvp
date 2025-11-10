-- Função para admin criar payment request para universidade sem validação de ownership
CREATE OR REPLACE FUNCTION public.admin_create_university_payment_request(
  university_id_param uuid,
  admin_user_id_param uuid,
  amount_usd_param numeric(12,2),
  payout_method_param text,
  payout_details_param jsonb
) RETURNS json AS $$
DECLARE
  university_data record;
  admin_user record;
  req_id uuid;
  inv_id uuid;
  inv_number text;
  encrypted bytea;
BEGIN
  -- Validar se é admin (usando role em vez de is_admin)
  SELECT * INTO admin_user
  FROM public.user_profiles
  WHERE user_id = admin_user_id_param AND role = 'admin';

  IF admin_user IS NULL THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  -- Validar se a universidade existe e está aprovada
  SELECT * INTO university_data 
  FROM public.universities 
  WHERE id = university_id_param AND is_approved = true;
  
  IF university_data IS NULL THEN
    RAISE EXCEPTION 'University not found or not approved';
  END IF;

  -- Validar valor
  IF amount_usd_param <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;
  
  -- Criptografar detalhes sensíveis (opcional)
  encrypted := public._encrypt_payout_details(payout_details_param);

  -- Criar o registro de pagamento já marcado como pago (admin está registrando pagamento já realizado)
  -- requested_by será o admin que criou, mas não há validação de ownership
  INSERT INTO public.university_payout_requests(
    university_id, 
    requested_by, 
    amount_coins, 
    amount_usd, 
    payout_method, 
    payout_details_preview, 
    payout_details_encrypted, 
    status,
    request_type,
    approved_by,
    approved_at,
    paid_by,
    paid_at
  ) VALUES (
    university_id_param, 
    admin_user_id_param, -- Admin que criou o registro
    ROUND(amount_usd_param), -- 1 coin = 1 USD para compatibilidade
    amount_usd_param, 
    payout_method_param,
    payout_details_param - 'account_number' - 'routing_number' - 'iban' - 'swift' - 'stripe_secret' - 'zelle_email' - 'zelle_phone',
    encrypted,
    'paid', -- Já marcado como pago pois a administração está registrando um pagamento já realizado
    'university_payment',
    admin_user_id_param, -- Admin que aprovou (o mesmo que criou)
    now(), -- Data de aprovação
    admin_user_id_param, -- Admin que registrou como pago (o mesmo que criou)
    now() -- Data de pagamento
  ) RETURNING id INTO req_id;

  -- Gerar invoice
  inv_number := 'INV-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('public.payout_invoice_seq')::text, 5, '0');
  INSERT INTO public.payout_invoices(payout_request_id, invoice_number, total_usd)
  VALUES (req_id, inv_number, amount_usd_param) RETURNING id INTO inv_id;

  RETURN json_build_object(
    'request_id', req_id,
    'invoice_number', inv_number,
    'status', 'paid',
    'amount_usd', amount_usd_param,
    'message', 'Payment record created successfully by admin. Payment already marked as paid.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

