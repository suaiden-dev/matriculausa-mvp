-- Adicionar campo request_type para separar University Payment Requests do Matrícula Rewards
-- e atualizar as funções RPC para usar o campo correto

-- Adicionar o campo request_type
ALTER TABLE public.university_payout_requests 
ADD COLUMN IF NOT EXISTS request_type text DEFAULT 'matricula_rewards' 
CHECK (request_type IN ('matricula_rewards', 'university_payment'));

-- Atualizar registros existentes para ter o tipo correto
-- Por padrão, todos os registros existentes são do tipo 'matricula_rewards'
UPDATE public.university_payout_requests 
SET request_type = 'matricula_rewards' 
WHERE request_type IS NULL;

-- Criar índice para melhorar performance das consultas por tipo
CREATE INDEX IF NOT EXISTS idx_university_payout_requests_type 
ON public.university_payout_requests(request_type);

-- Atualizar a função create_university_payment_request para usar o novo tipo
CREATE OR REPLACE FUNCTION public.create_university_payment_request(
  university_id_param uuid,
  user_id_param uuid,
  amount_usd_param numeric(12,2),
  payout_method_param text,
  payout_details_param jsonb
) RETURNS json AS $$
DECLARE
  university_data record;
  user_data record;
  req_id uuid;
  inv_id uuid;
  inv_number text;
  encrypted bytea;
  current_balance numeric(12,2);
BEGIN
  -- Validar se a universidade existe e está aprovada
  SELECT * INTO university_data 
  FROM public.universities 
  WHERE id = university_id_param AND is_approved = true;
  
  IF university_data IS NULL THEN
    RAISE EXCEPTION 'University not found or not approved';
  END IF;

  -- Validar se o usuário tem acesso à universidade
  IF university_data.user_id != user_id_param THEN
    RAISE EXCEPTION 'Access denied: user does not own this university';
  END IF;

  -- Validar valor
  IF amount_usd_param <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  -- Calcular saldo atual da universidade (baseado em receitas menos pagamentos já feitos)
  -- Apenas para requests do tipo 'university_payment'
  SELECT COALESCE(SUM(
    CASE 
      WHEN status = 'paid' THEN -amount_usd
      ELSE 0
    END
  ), 0) INTO current_balance
  FROM public.university_payout_requests 
  WHERE university_id = university_id_param 
    AND request_type = 'university_payment';

  -- Adicionar receitas da universidade (se houver sistema de receitas)
  -- Por enquanto, vamos assumir que universidades podem solicitar pagamentos
  -- baseados em suas atividades na plataforma
  
  -- Validar se há saldo suficiente (implementação simplificada)
  -- Por enquanto, permitir que universidades aprovadas façam requests
  -- O admin pode aprovar ou rejeitar baseado em critérios próprios
  
  -- Criptografar detalhes sensíveis (opcional)
  encrypted := public._encrypt_payout_details(payout_details_param);

  -- Criar o payment request com o tipo correto
  INSERT INTO public.university_payout_requests(
    university_id, 
    requested_by, 
    amount_coins, 
    amount_usd, 
    payout_method, 
    payout_details_preview, 
    payout_details_encrypted, 
    status,
    request_type
  ) VALUES (
    university_id_param, 
    user_id_param, 
    ROUND(amount_usd_param), -- 1 coin = 1 USD para compatibilidade
    amount_usd_param, 
    payout_method_param,
    payout_details_param - 'account_number' - 'routing_number' - 'iban' - 'swift' - 'stripe_secret' - 'zelle_email' - 'zelle_phone',
    encrypted,
    'pending',
    'university_payment'
  ) RETURNING id INTO req_id;

  -- Gerar invoice
  inv_number := 'INV-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('public.payout_invoice_seq')::text, 5, '0');
  INSERT INTO public.payout_invoices(payout_request_id, invoice_number, total_usd)
  VALUES (req_id, inv_number, amount_usd_param) RETURNING id INTO inv_id;

  RETURN json_build_object(
    'request_id', req_id,
    'invoice_number', inv_number,
    'status', 'pending',
    'amount_usd', amount_usd_param,
    'message', 'Payment request created successfully. Awaiting admin approval.'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar a função request_university_payout para usar o tipo correto
CREATE OR REPLACE FUNCTION public.request_university_payout(
  university_id_param uuid,
  user_id_param uuid,
  amount_coins_param integer,
  payout_method_param text,
  payout_details_param jsonb
) RETURNS json AS $$
DECLARE
  acc record;
  req_id uuid;
  inv_id uuid;
  inv_number text;
  encrypted bytea;
  usd_amount numeric(12,2);
BEGIN
  -- Validar universidade aprovada e pertencer ao usuário
  IF NOT EXISTS (
    SELECT 1 FROM public.universities u 
    WHERE u.id = university_id_param AND u.is_approved = true AND u.user_id = user_id_param
  ) THEN
    RAISE EXCEPTION 'University not found or access denied';
  END IF;

  IF amount_coins_param <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than zero';
  END IF;

  usd_amount := amount_coins_param; -- 1 coin = 1 USD

  SELECT * INTO acc FROM public.university_rewards_account WHERE university_id = university_id_param;
  IF acc IS NULL THEN
    RAISE EXCEPTION 'Rewards account not found for university';
  END IF;

  IF COALESCE(acc.balance_coins,0) < amount_coins_param THEN
    RAISE EXCEPTION 'Insufficient balance_coins for payout';
  END IF;

  encrypted := public._encrypt_payout_details(payout_details_param);

  INSERT INTO public.university_payout_requests(
    university_id, requested_by, amount_coins, amount_usd, payout_method, 
    payout_details_preview, payout_details_encrypted, status, request_type
  ) VALUES (
    university_id_param, user_id_param, amount_coins_param, usd_amount, payout_method_param,
    payout_details_param - 'account_number' - 'routing_number' - 'iban' - 'swift' - 'stripe_secret' - 'zelle_email' - 'zelle_phone',
    encrypted,
    'pending',
    'matricula_rewards'
  ) RETURNING id INTO req_id;

  -- Gerar invoice
  inv_number := 'INV-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('public.payout_invoice_seq')::text, 5, '0');
  INSERT INTO public.payout_invoices(payout_request_id, invoice_number, total_usd) 
  VALUES (req_id, inv_number, usd_amount);

  -- Atualizar saldo da conta de recompensas
  UPDATE public.university_rewards_account
    SET balance_coins = balance_coins - amount_coins_param,
        total_payouts = total_payouts + 1,
        last_payout_at = now(),
        updated_at = now()
  WHERE university_id = university_id_param;

  RETURN json_build_object('request_id', req_id, 'invoice_number', inv_number, 'status', 'pending');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Atualizar as funções admin para filtrar por tipo de request
CREATE OR REPLACE FUNCTION public.admin_approve_payment_request(
  request_id_param uuid,
  admin_user_id_param uuid,
  admin_notes_param text DEFAULT null
) RETURNS json AS $$
DECLARE
  request_data record;
  admin_user record;
BEGIN
  -- Validar se é admin (usando user_id em vez de id)
  SELECT * INTO admin_user
  FROM public.user_profiles
  WHERE user_id = admin_user_id_param AND is_admin = true;

  IF admin_user IS NULL THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  -- Buscar o request (apenas university_payment)
  SELECT * INTO request_data
  FROM public.university_payout_requests
  WHERE id = request_id_param 
    AND request_type = 'university_payment';

  IF request_data IS NULL THEN
    RAISE EXCEPTION 'Payment request not found';
  END IF;

  IF request_data.status != 'pending' THEN
    RAISE EXCEPTION 'Payment request is not pending';
  END IF;

  -- Aprovar o request
  UPDATE public.university_payout_requests SET
    status = 'approved',
    approved_by = admin_user_id_param,
    approved_at = now(),
    admin_notes = COALESCE(admin_notes_param, admin_notes),
    updated_at = now()
  WHERE id = request_id_param;

  RETURN json_build_object(
    'request_id', request_id_param,
    'status', 'approved',
    'approved_by', admin_user_id_param,
    'approved_at', now(),
    'message', 'Payment request approved successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_reject_payment_request(
  request_id_param uuid,
  admin_user_id_param uuid,
  rejection_reason_param text
) RETURNS json AS $$
DECLARE
  request_data record;
  admin_user record;
BEGIN
  -- Validar se é admin
  SELECT * INTO admin_user
  FROM public.user_profiles
  WHERE user_id = admin_user_id_param AND is_admin = true;

  IF admin_user IS NULL THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  -- Buscar o request (apenas university_payment)
  SELECT * INTO request_data
  FROM public.university_payout_requests
  WHERE id = request_id_param 
    AND request_type = 'university_payment';

  IF request_data IS NULL THEN
    RAISE EXCEPTION 'Payment request not found';
  END IF;

  IF request_data.status != 'pending' THEN
    RAISE EXCEPTION 'Payment request is not pending';
  END IF;

  -- Rejeitar o request
  UPDATE public.university_payout_requests SET
    status = 'rejected',
    admin_notes = COALESCE(admin_notes, '') || ' Rejection reason: ' || rejection_reason_param,
    updated_at = now()
  WHERE id = request_id_param;

  RETURN json_build_object(
    'request_id', request_id_param,
    'status', 'rejected',
    'message', 'Payment request rejected successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_mark_payment_paid(
  request_id_param uuid,
  admin_user_id_param uuid,
  payment_reference_param text DEFAULT null
) RETURNS json AS $$
DECLARE
  request_data record;
  admin_user record;
BEGIN
  -- Validar se é admin
  SELECT * INTO admin_user
  FROM public.user_profiles
  WHERE user_id = admin_user_id_param AND is_admin = true;

  IF admin_user IS NULL THEN
    RAISE EXCEPTION 'Access denied: admin privileges required';
  END IF;

  -- Buscar o request (apenas university_payment)
  SELECT * INTO request_data
  FROM public.university_payout_requests
  WHERE id = request_id_param 
    AND request_type = 'university_payment';

  IF request_data IS NULL THEN
    RAISE EXCEPTION 'Payment request not found';
  END IF;

  IF request_data.status != 'approved' THEN
    RAISE EXCEPTION 'Payment request is not approved';
  END IF;

  -- Marcar como pago
  UPDATE public.university_payout_requests SET
    status = 'paid',
    paid_by = admin_user_id_param,
    paid_at = now(),
    admin_notes = COALESCE(admin_notes, '') || ' Payment reference: ' || COALESCE(payment_reference_param, 'N/A'),
    updated_at = now()
  WHERE id = request_id_param;

  RETURN json_build_object(
    'request_id', request_id_param,
    'status', 'paid',
    'paid_by', admin_user_id_param,
    'paid_at', now(),
    'message', 'Payment request marked as paid successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.admin_add_notes_to_request(
  request_id_param uuid,
  admin_notes_param text
) RETURNS json AS $$
DECLARE
  request_data record;
BEGIN
  -- Buscar o request (apenas university_payment)
  SELECT * INTO request_data
  FROM public.university_payout_requests
  WHERE id = request_id_param 
    AND request_type = 'university_payment';

  IF request_data IS NULL THEN
    RAISE EXCEPTION 'Payment request not found';
  END IF;

  -- Adicionar notas
  UPDATE public.university_payout_requests SET
    admin_notes = COALESCE(admin_notes, '') || ' ' || admin_notes_param,
    updated_at = now()
  WHERE id = request_id_param;

  RETURN json_build_object(
    'request_id', request_id_param,
    'message', 'Admin notes added successfully'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
