/*
  # Função para Verificar Pagamentos Zelle Pendentes
  
  Esta migração cria uma função RPC para verificar se um usuário tem
  pagamentos Zelle pendentes de aprovação, evitando duplicação de pagamentos.
  
  A função retorna:
  - has_pending_payment: boolean indicando se há pagamento pendente
  - pending_payment: dados do pagamento pendente (se houver)
  - total_pending: número total de pagamentos pendentes
*/

-- Função para verificar pagamentos Zelle pendentes de um usuário
CREATE OR REPLACE FUNCTION check_pending_zelle_payments(p_user_id uuid)
RETURNS TABLE (
  has_pending_payment boolean,
  pending_payment_id uuid,
  pending_payment_fee_type text,
  pending_payment_amount numeric,
  pending_payment_status text,
  pending_payment_created_at timestamptz,
  total_pending integer
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  pending_count integer;
  latest_payment record;
BEGIN
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
  INTO latest_payment
  FROM zelle_payments
  WHERE user_id = p_user_id
    AND status IN ('pending', 'pending_verification')
  ORDER BY created_at DESC
  LIMIT 1;
  
  -- Retornar resultado
  RETURN QUERY SELECT
    (pending_count > 0) as has_pending_payment,
    COALESCE(latest_payment.id, uuid_nil()) as pending_payment_id,
    COALESCE(latest_payment.fee_type, '') as pending_payment_fee_type,
    COALESCE(latest_payment.amount, 0) as pending_payment_amount,
    COALESCE(latest_payment.status, '') as pending_payment_status,
    COALESCE(latest_payment.created_at, '1970-01-01'::timestamptz) as pending_payment_created_at,
    pending_count as total_pending;
END;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION check_pending_zelle_payments IS 'Verifica se um usuário tem pagamentos Zelle pendentes de aprovação';

-- Política de segurança para a função
-- A função já é SECURITY DEFINER, então executa com privilégios do criador
-- Usuários autenticados podem chamar a função para verificar seus próprios pagamentos
