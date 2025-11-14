/*
  # Atualizar Função para Incluir Pagamentos Aprovados
  
  Esta migração atualiza a função RPC check_zelle_payments_status para também
  retornar pagamentos aprovados recentemente (últimas 24 horas), permitindo que
  o frontend detecte quando um pagamento foi aprovado e avance para a próxima step.
  
  A função agora retorna:
  - has_pending_payment: boolean indicando se há pagamento pendente
  - pending_payment: dados do pagamento pendente (se houver)
  - has_rejected_payment: boolean indicando se há pagamento rejeitado recente (últimas 24h)
  - rejected_payment: dados do pagamento rejeitado mais recente (se houver)
  - has_approved_payment: boolean indicando se há pagamento aprovado recente (últimas 24h)
  - approved_payment: dados do pagamento aprovado mais recente (se houver)
  - total_pending: número total de pagamentos pendentes
*/

-- Função para verificar status de pagamentos Zelle de um usuário (incluindo aprovados)
CREATE OR REPLACE FUNCTION check_zelle_payments_status(p_user_id uuid)
RETURNS TABLE (
  has_pending_payment boolean,
  pending_payment_id uuid,
  pending_payment_fee_type text,
  pending_payment_amount numeric,
  pending_payment_status text,
  pending_payment_created_at timestamptz,
  has_rejected_payment boolean,
  rejected_payment_id uuid,
  rejected_payment_fee_type text,
  rejected_payment_amount numeric,
  rejected_payment_status text,
  rejected_payment_admin_notes text,
  rejected_payment_created_at timestamptz,
  has_approved_payment boolean,
  approved_payment_id uuid,
  approved_payment_fee_type text,
  approved_payment_amount numeric,
  approved_payment_status text,
  approved_payment_created_at timestamptz,
  total_pending integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pending_count integer;
  latest_pending record;
  latest_rejected record;
  latest_approved record;
  twenty_four_hours_ago timestamptz;
BEGIN
  -- Calcular timestamp de 24 horas atrás
  twenty_four_hours_ago := NOW() - INTERVAL '24 hours';
  
  -- Contar pagamentos pendentes
  SELECT COUNT(*) INTO pending_count
  FROM zelle_payments
  WHERE user_id = p_user_id
    AND status IN ('pending', 'pending_verification');
  
  -- Buscar o pagamento pendente mais recente
  SELECT 
    id,
    fee_type,
    amount,
    status,
    created_at
  INTO latest_pending
  FROM zelle_payments
  WHERE user_id = p_user_id
    AND status IN ('pending', 'pending_verification')
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Buscar o pagamento rejeitado mais recente (últimas 24 horas)
  SELECT 
    id,
    fee_type,
    amount,
    status,
    admin_notes,
    created_at
  INTO latest_rejected
  FROM zelle_payments
  WHERE user_id = p_user_id
    AND status = 'rejected'
    AND created_at >= twenty_four_hours_ago
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Buscar o pagamento aprovado mais recente (últimas 24 horas)
  SELECT 
    id,
    fee_type,
    amount,
    status,
    created_at
  INTO latest_approved
  FROM zelle_payments
  WHERE user_id = p_user_id
    AND status IN ('approved', 'verified')
    AND created_at >= twenty_four_hours_ago
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Retornar resultado
  RETURN QUERY SELECT
    (pending_count > 0) as has_pending_payment,
    COALESCE(latest_pending.id, uuid_nil()) as pending_payment_id,
    COALESCE(latest_pending.fee_type, '') as pending_payment_fee_type,
    COALESCE(latest_pending.amount, 0) as pending_payment_amount,
    COALESCE(latest_pending.status, '') as pending_payment_status,
    COALESCE(latest_pending.created_at, '1970-01-01'::timestamptz) as pending_payment_created_at,
    (latest_rejected.id IS NOT NULL) as has_rejected_payment,
    COALESCE(latest_rejected.id, uuid_nil()) as rejected_payment_id,
    COALESCE(latest_rejected.fee_type, '') as rejected_payment_fee_type,
    COALESCE(latest_rejected.amount, 0) as rejected_payment_amount,
    COALESCE(latest_rejected.status, '') as rejected_payment_status,
    COALESCE(latest_rejected.admin_notes, '') as rejected_payment_admin_notes,
    COALESCE(latest_rejected.created_at, '1970-01-01'::timestamptz) as rejected_payment_created_at,
    (latest_approved.id IS NOT NULL) as has_approved_payment,
    COALESCE(latest_approved.id, uuid_nil()) as approved_payment_id,
    COALESCE(latest_approved.fee_type, '') as approved_payment_fee_type,
    COALESCE(latest_approved.amount, 0) as approved_payment_amount,
    COALESCE(latest_approved.status, '') as approved_payment_status,
    COALESCE(latest_approved.created_at, '1970-01-01'::timestamptz) as approved_payment_created_at,
    pending_count as total_pending;
END;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION check_zelle_payments_status IS 'Verifica se um usuário tem pagamentos Zelle pendentes de aprovação, rejeitados ou aprovados recentemente (últimas 24 horas)';

