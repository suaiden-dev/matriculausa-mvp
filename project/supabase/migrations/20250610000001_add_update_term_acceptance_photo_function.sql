-- Função RPC para atualizar foto de identidade no registro de aceitação de termos
-- Esta função permite atualizar a foto mesmo se o update direto falhar por RLS

CREATE OR REPLACE FUNCTION update_term_acceptance_photo(
  p_acceptance_id uuid,
  p_photo_path text,
  p_photo_name text
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Verificar se o registro existe
  IF NOT EXISTS (
    SELECT 1 FROM comprehensive_term_acceptance 
    WHERE id = p_acceptance_id
  ) THEN
    RETURN false;
  END IF;
  
  -- Atualizar com a foto e resetar status para 'pending' quando nova foto é enviada
  UPDATE comprehensive_term_acceptance
  SET 
    identity_photo_path = p_photo_path,
    identity_photo_name = p_photo_name,
    identity_photo_status = 'pending', -- ✅ Resetar status para 'pending' quando nova foto é enviada
    identity_photo_rejection_reason = NULL, -- ✅ Limpar motivo de rejeição anterior
    identity_photo_reviewed_at = NULL, -- ✅ Limpar data de revisão anterior
    identity_photo_reviewed_by = NULL -- ✅ Limpar quem revisou anteriormente
  WHERE id = p_acceptance_id;
  
  RETURN true;
END;
$$;

-- Comentário na função
COMMENT ON FUNCTION update_term_acceptance_photo IS 'Atualiza a foto de identidade em um registro de aceitação de termos. Usa SECURITY DEFINER para permitir atualização mesmo com RLS ativo.';






