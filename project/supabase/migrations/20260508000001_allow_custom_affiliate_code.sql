/*
  Permite que o aluno personalize seu código de indicação (MatriculaRewards).
  - Adiciona colunas is_custom e code_changed_at à tabela affiliate_codes
  - Cria função update_affiliate_code() chamável via RPC
  - Atualiza trigger de sync Stripe para disparar também no UPDATE do código
*/

-- 1. Novas colunas de controle
ALTER TABLE affiliate_codes
  ADD COLUMN IF NOT EXISTS is_custom BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS code_changed_at TIMESTAMPTZ;

-- 2. Função para o aluno trocar seu código
CREATE OR REPLACE FUNCTION update_affiliate_code(
  p_user_id UUID,
  p_new_code TEXT
) RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_normalized TEXT;
  v_existing_user UUID;
BEGIN
  -- Normalizar para uppercase sem espaços
  v_normalized := upper(trim(p_new_code));

  -- Validação: comprimento
  IF length(v_normalized) < 3 OR length(v_normalized) > 20 THEN
    RETURN jsonb_build_object('success', false, 'error', 'length');
  END IF;

  -- Validação: apenas letras A-Z, números 0-9 e underscore
  IF v_normalized !~ '^[A-Z0-9_]+$' THEN
    RETURN jsonb_build_object('success', false, 'error', 'invalid_chars');
  END IF;

  -- Verificar se código já pertence a outro usuário
  SELECT user_id INTO v_existing_user
  FROM affiliate_codes
  WHERE code = v_normalized AND user_id != p_user_id;

  IF FOUND THEN
    RETURN jsonb_build_object('success', false, 'error', 'taken');
  END IF;

  -- Verificar se o código já é o código atual do próprio usuário
  IF EXISTS (
    SELECT 1 FROM affiliate_codes WHERE user_id = p_user_id AND code = v_normalized
  ) THEN
    RETURN jsonb_build_object('success', true, 'code', v_normalized);
  END IF;

  -- Atualizar código
  UPDATE affiliate_codes
  SET
    code = v_normalized,
    is_custom = true,
    code_changed_at = NOW(),
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN jsonb_build_object('success', true, 'code', v_normalized);
END;
$$;

-- Permissões: apenas usuários autenticados podem chamar a própria função
REVOKE ALL ON FUNCTION update_affiliate_code(UUID, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION update_affiliate_code(UUID, TEXT) TO authenticated;

-- 3. Atualizar trigger de sync Stripe para disparar também no UPDATE do campo code
DROP TRIGGER IF EXISTS trg_affiliate_code_auto_sync ON public.affiliate_codes;

CREATE TRIGGER trg_affiliate_code_auto_sync
  AFTER INSERT OR UPDATE OF code ON public.affiliate_codes
  FOR EACH ROW EXECUTE FUNCTION public.on_affiliate_code_insert_sync();
