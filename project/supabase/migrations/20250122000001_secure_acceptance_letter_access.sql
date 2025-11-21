-- Migration: Secure Acceptance Letter Access
-- Description: Cria função SQL para retornar dados de aplicação ocultando acceptance_letter_url quando I-20 não foi pago
-- Isso previne que alunos vejam a URL no Network tab do DevTools
-- IMPORTANTE: Mantém acceptance_letter_status e acceptance_letter_sent_at visíveis para que o aluno saiba que a carta foi enviada

-- Função para retornar dados de aplicação de forma segura
CREATE OR REPLACE FUNCTION get_student_application_secure(p_application_id uuid)
RETURNS TABLE (
  id uuid,
  student_id uuid,
  scholarship_id uuid,
  status text,
  student_process_type text,
  is_application_fee_paid boolean,
  is_scholarship_fee_paid boolean,
  acceptance_letter_status text,
  acceptance_letter_url text, -- Será NULL se I-20 não foi pago
  acceptance_letter_sent_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  -- Outros campos necessários
  applied_at timestamptz,
  reviewed_at timestamptz,
  reviewed_by uuid,
  notes text,
  documents jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_has_paid_i20 boolean;
  v_application_data record;
BEGIN
  -- Verificar se o usuário autenticado é o dono da aplicação
  SELECT sa.student_id INTO v_user_id
  FROM scholarship_applications sa
  JOIN user_profiles up ON sa.student_id = up.id
  WHERE sa.id = p_application_id
    AND up.user_id = auth.uid();
  
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Application not found or access denied';
  END IF;
  
  -- Verificar se o I-20 foi pago
  SELECT COALESCE(up.has_paid_i20_control_fee, false) INTO v_has_paid_i20
  FROM user_profiles up
  WHERE up.user_id = auth.uid();
  
  -- Buscar dados da aplicação
  SELECT 
    sa.id,
    sa.student_id,
    sa.scholarship_id,
    sa.status,
    sa.student_process_type,
    sa.is_application_fee_paid,
    sa.is_scholarship_fee_paid,
    sa.acceptance_letter_status, -- ✅ UX: Mantém status visível para aluno saber que carta foi enviada
    -- ✅ SEGURANÇA: Ocultar URL se I-20 não foi pago (mas mantém status e sent_at visíveis)
    CASE 
      WHEN v_has_paid_i20 THEN sa.acceptance_letter_url
      ELSE NULL
    END as acceptance_letter_url,
    sa.acceptance_letter_sent_at, -- ✅ UX: Mantém data de envio visível
    sa.created_at,
    sa.updated_at,
    sa.applied_at,
    sa.reviewed_at,
    sa.reviewed_by,
    sa.notes,
    sa.documents
  INTO v_application_data
  FROM scholarship_applications sa
  WHERE sa.id = p_application_id;
  
  -- Retornar dados
  RETURN QUERY SELECT
    v_application_data.id,
    v_application_data.student_id,
    v_application_data.scholarship_id,
    v_application_data.status,
    v_application_data.student_process_type,
    v_application_data.is_application_fee_paid,
    v_application_data.is_scholarship_fee_paid,
    v_application_data.acceptance_letter_status,
    v_application_data.acceptance_letter_url,
    v_application_data.acceptance_letter_sent_at,
    v_application_data.created_at,
    v_application_data.updated_at,
    v_application_data.applied_at,
    v_application_data.reviewed_at,
    v_application_data.reviewed_by,
    v_application_data.notes,
    v_application_data.documents;
END;
$$;

-- Comentário para documentação
COMMENT ON FUNCTION get_student_application_secure IS 'Retorna dados de aplicação de forma segura, ocultando acceptance_letter_url quando I-20 não foi pago para prevenir acesso não autorizado via Network tab. Mantém acceptance_letter_status e acceptance_letter_sent_at visíveis para UX, permitindo que o aluno saiba que a carta foi enviada e precisa pagar I-20 para acessá-la.';

