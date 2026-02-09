-- Função RPC para atualizar status de verificação da foto de identidade
-- Esta função permite que admins aprovem ou rejeitem fotos mesmo com RLS ativo
-- Usa SECURITY DEFINER para bypass RLS

CREATE OR REPLACE FUNCTION update_identity_photo_status(
  p_acceptance_id uuid,
  p_status identity_photo_status,
  p_rejection_reason text DEFAULT NULL,
  p_reviewed_by uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_reviewed_at timestamp with time zone;
BEGIN
  -- Verificar se o registro existe
  IF NOT EXISTS (
    SELECT 1 FROM comprehensive_term_acceptance 
    WHERE id = p_acceptance_id
  ) THEN
    RAISE EXCEPTION 'Record not found with ID: %', p_acceptance_id;
  END IF;

  -- Definir timestamp de revisão
  v_reviewed_at := CASE 
    WHEN p_status IN ('approved', 'rejected') THEN NOW()
    ELSE NULL
  END;

  -- Atualizar status e campos relacionados
  UPDATE comprehensive_term_acceptance
  SET 
    identity_photo_status = p_status,
    identity_photo_rejection_reason = CASE 
      WHEN p_status = 'rejected' THEN p_rejection_reason
      ELSE NULL
    END,
    identity_photo_reviewed_at = v_reviewed_at,
    identity_photo_reviewed_by = CASE 
      WHEN p_status IN ('approved', 'rejected') THEN COALESCE(p_reviewed_by, auth.uid())
      ELSE NULL
    END
  WHERE id = p_acceptance_id;

  -- Verificar se a atualização foi bem-sucedida
  IF NOT FOUND THEN
    RETURN false;
  END IF;

  RETURN true;
END;
$$;

-- Comentário na função
COMMENT ON FUNCTION update_identity_photo_status IS 'Atualiza o status de verificação da foto de identidade. Usa SECURITY DEFINER para permitir atualização mesmo com RLS ativo.';

-- Garantir que admins podem executar esta função
GRANT EXECUTE ON FUNCTION update_identity_photo_status TO authenticated;

