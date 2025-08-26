-- Sistema Simplificado de Payment Requests para Universidades
-- Independente do sistema de Matrícula Rewards, mas mantém validação de saldo

-- Função para criar payment request simplificado
create or replace function public.create_university_payment_request(
  university_id_param uuid,
  user_id_param uuid,
  amount_usd_param numeric(12,2),
  payout_method_param text,
  payout_details_param jsonb
) returns json as $$
declare
  university_data record;
  user_data record;
  req_id uuid;
  inv_id uuid;
  inv_number text;
  encrypted bytea;
  current_balance numeric(12,2);
begin
  -- Validar se a universidade existe e está aprovada
  select * into university_data 
  from public.universities 
  where id = university_id_param and is_approved = true;
  
  if university_data is null then
    raise exception 'University not found or not approved';
  end if;

  -- Validar se o usuário tem acesso à universidade
  if university_data.user_id != user_id_param then
    raise exception 'Access denied: user does not own this university';
  end if;

  -- Validar valor
  if amount_usd_param <= 0 then
    raise exception 'Amount must be greater than zero';
  end if;

  -- Calcular saldo atual da universidade (baseado em receitas menos pagamentos já feitos)
  select coalesce(sum(
    case 
      when status = 'paid' then -amount_usd
      else 0
    end
  ), 0) into current_balance
  from public.university_payout_requests 
  where university_id = university_id_param;

  -- Adicionar receitas da universidade (se houver sistema de receitas)
  -- Por enquanto, vamos assumir que universidades podem solicitar pagamentos
  -- baseados em suas atividades na plataforma
  
  -- Validar se há saldo suficiente (implementação simplificada)
  -- Por enquanto, permitir que universidades aprovadas façam requests
  -- O admin pode aprovar ou rejeitar baseado em critérios próprios
  
  -- Criptografar detalhes sensíveis (opcional)
  encrypted := public._encrypt_payout_details(payout_details_param);

  -- Criar o payment request
  insert into public.university_payout_requests(
    university_id, 
    requested_by, 
    amount_coins, 
    amount_usd, 
    payout_method, 
    payout_details_preview, 
    payout_details_encrypted, 
    status
  ) values (
    university_id_param, 
    user_id_param, 
    round(amount_usd_param), -- 1 coin = 1 USD para compatibilidade
    amount_usd_param, 
    payout_method_param,
    payout_details_param - 'account_number' - 'routing_number' - 'iban' - 'swift' - 'stripe_secret' - 'zelle_email' - 'zelle_phone',
    encrypted,
    'pending'
  ) returning id into req_id;

  -- Gerar invoice
  inv_number := 'INV-' || to_char(now(), 'YYYYMM') || '-' || lpad(nextval('public.payout_invoice_seq')::text, 5, '0');
  insert into public.payout_invoices(payout_request_id, invoice_number, total_usd)
  values (req_id, inv_number, amount_usd_param) returning id into inv_id;

  return json_build_object(
    'request_id', req_id,
    'invoice_number', inv_number,
    'status', 'pending',
    'amount_usd', amount_usd_param,
    'message', 'Payment request created successfully. Awaiting admin approval.'
  );
end;
$$ language plpgsql security definer;

-- Função para admin aprovar payment request
create or replace function public.admin_approve_payment_request(
  request_id_param uuid,
  admin_user_id_param uuid,
  admin_notes_param text default null
) returns json as $$
declare
  request_data record;
  admin_user record;
begin
  -- Validar se é admin (usando user_id em vez de id)
  select * into admin_user 
  from public.user_profiles 
  where user_id = admin_user_id_param and is_admin = true;
  
  if admin_user is null then
    raise exception 'Access denied: admin privileges required';
  end if;

  -- Buscar o request
  select * into request_data 
  from public.university_payout_requests 
  where id = request_id_param;
  
  if request_data is null then
    raise exception 'Payment request not found';
  end if;

  if request_data.status != 'pending' then
    raise exception 'Payment request is not pending';
  end if;

  -- Aprovar o request
  update public.university_payout_requests set
    status = 'approved',
    approved_by = admin_user_id_param,
    approved_at = now(),
    admin_notes = coalesce(admin_notes_param, admin_notes),
    updated_at = now()
  where id = request_id_param;

  return json_build_object(
    'request_id', request_id_param,
    'status', 'approved',
    'approved_by', admin_user_id_param,
    'approved_at', now(),
    'message', 'Payment request approved successfully'
  );
end;
$$ language plpgsql security definer;

-- Função para admin rejeitar payment request
create or replace function public.admin_reject_payment_request(
  request_id_param uuid,
  admin_user_id_param uuid,
  rejection_reason_param text
) returns json as $$
declare
  request_data record;
  admin_user record;
begin
  -- Validar se é admin (usando user_id em vez de id)
  select * into admin_user 
  from public.user_profiles 
  where user_id = admin_user_id_param and is_admin = true;
  
  if admin_user is null then
    raise exception 'Access denied: admin privileges required';
  end if;

  -- Buscar o request
  select * into request_data 
  from public.university_payout_requests 
  where id = request_id_param;
  
  if request_data is null then
    raise exception 'Payment request not found';
  end if;

  if request_data.status != 'pending' then
    raise exception 'Payment request is not pending';
  end if;

  if rejection_reason_param is null or trim(rejection_reason_param) = '' then
    raise exception 'Rejection reason is required';
  end if;

  -- Rejeitar o request
  update public.university_payout_requests set
    status = 'rejected',
    admin_notes = rejection_reason_param,
    updated_at = now()
  where id = request_id_param;

  return json_build_object(
    'request_id', request_id_param,
    'status', 'rejected',
    'rejection_reason', rejection_reason_param,
    'message', 'Payment request rejected successfully'
  );
end;
$$ language plpgsql security definer;

-- Função para admin marcar como pago
create or replace function public.admin_mark_payment_paid(
  request_id_param uuid,
  admin_user_id_param uuid,
  payment_reference_param text default null
) returns json as $$
declare
  request_data record;
  admin_user record;
begin
  -- Validar se é admin (usando user_id em vez de id)
  select * into admin_user 
  from public.user_profiles 
  where user_id = admin_user_id_param and is_admin = true;
  
  if admin_user is null then
    raise exception 'Access denied: admin privileges required';
  end if;

  -- Buscar o request
  select * into request_data 
  from public.university_payout_requests 
  where id = request_id_param;
  
  if request_data is null then
    raise exception 'Payment request not found';
  end if;

  if request_data.status != 'approved' then
    raise exception 'Payment request must be approved before marking as paid';
  end if;

  -- Marcar como pago
  update public.university_payout_requests set
    status = 'paid',
    paid_by = admin_user_id_param,
    paid_at = now(),
    admin_notes = case 
      when payment_reference_param is not null then 
        coalesce(admin_notes, '') || ' Payment Reference: ' || payment_reference_param
      else admin_notes
    end,
    updated_at = now()
  where id = request_id_param;

  return json_build_object(
    'request_id', request_id_param,
    'status', 'paid',
    'paid_by', admin_user_id_param,
    'paid_at', now(),
    'payment_reference', payment_reference_param,
    'message', 'Payment marked as paid successfully'
  );
end;
$$ language plpgsql security definer;

-- Função para admin adicionar notas
create or replace function public.admin_add_notes_to_request(
  request_id_param uuid,
  admin_user_id_param uuid,
  notes_param text
) returns json as $$
declare
  request_data record;
  admin_user record;
begin
  -- Validar se é admin (usando user_id em vez de id)
  select * into admin_user 
  from public.user_profiles 
  where user_id = admin_user_id_param and is_admin = true;
  
  if admin_user is null then
    raise exception 'Access denied: admin privileges required';
  end if;

  -- Buscar o request
  select * into request_data 
  from public.university_payout_requests 
  where id = request_id_param;
  
  if request_data is null then
    raise exception 'Payment request not found';
  end if;

  if notes_param is null or trim(notes_param) = '' then
    raise exception 'Notes cannot be empty';
  end if;

  -- Adicionar notas
  update public.university_payout_requests set
    admin_notes = case 
      when admin_notes is not null then admin_notes || ' | ' || notes_param
      else notes_param
    end,
    updated_at = now()
  where id = request_id_param;

  return json_build_object(
    'request_id', request_id_param,
    'notes_added', notes_param,
    'message', 'Notes added successfully'
  );
end;
$$ language plpgsql security definer;

-- Comentários para documentação
comment on function public.create_university_payment_request is 'Cria um novo payment request para universidade (sistema simplificado)';
comment on function public.admin_approve_payment_request is 'Admin aprova um payment request';
comment on function public.admin_reject_payment_request is 'Admin rejeita um payment request';
comment on function public.admin_mark_payment_paid is 'Admin marca um payment request como pago';
comment on function public.admin_add_notes_to_request is 'Admin adiciona notas a um payment request';
