-- Migração para adicionar logs de rejeição na tabela affiliate_payment_requests e atualizar as funções administrativas
-- Data: 2026-02-02

-- 1. Adicionar colunas de rejeição se não existirem
ALTER TABLE affiliate_payment_requests 
ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;

-- 2. Atualizar função de rejeição para usar os novos campos
-- Agora registramos especificamente rejected_by e rejected_at, em vez de reutilizar approved_by
CREATE OR REPLACE FUNCTION public.admin_reject_affiliate_payment_request(
  p_id UUID, 
  p_admin UUID, 
  p_reason TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.affiliate_payment_requests
  SET 
    status = 'rejected',
    rejected_by = p_admin,
    rejected_at = NOW(),
    admin_notes = COALESCE(p_reason, '')
  WHERE id = p_id 
  AND status IN ('pending', 'approved');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Função de Aprovação (mantida/re-aplicada para consistência)
CREATE OR REPLACE FUNCTION public.admin_approve_affiliate_payment_request(
  p_id UUID, 
  p_admin UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.affiliate_payment_requests
  SET 
    status = 'approved', 
    approved_by = p_admin, 
    approved_at = NOW()
  WHERE id = p_id 
  AND status = 'pending';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Função de Pagamento (mantida/re-aplicada para consistência)
CREATE OR REPLACE FUNCTION public.admin_mark_paid_affiliate_payment_request(
  p_id UUID, 
  p_admin UUID, 
  p_reference TEXT
)
RETURNS VOID AS $$
BEGIN
  UPDATE public.affiliate_payment_requests
  SET 
    status = 'paid', 
    paid_by = p_admin, 
    paid_at = NOW(), 
    payment_reference = p_reference
  WHERE id = p_id 
  AND status = 'approved';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
