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
  
  -- Atualizar com a foto
  UPDATE comprehensive_term_acceptance
  SET 
    identity_photo_path = p_photo_path,
    identity_photo_name = p_photo_name
  WHERE id = p_acceptance_id;
  
  RETURN true;
END;
$$;

-- Comentário na função
COMMENT ON FUNCTION update_term_acceptance_photo IS 'Atualiza a foto de identidade em um registro de aceitação de termos. Usa SECURITY DEFINER para permitir atualização mesmo com RLS ativo.';

