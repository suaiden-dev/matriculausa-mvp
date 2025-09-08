/*
  # Adicionar Campos Zelle na Tabela user_profiles
  
  Esta migração adiciona os campos necessários para suportar pagamentos Zelle
  na tabela user_profiles, mantendo consistência com o sistema de pagamentos Stripe.
  
  1. Novos Campos
    - payment_method: Método de pagamento usado (stripe, zelle, manual)
    - payment_proof_url: URL do comprovante de pagamento Zelle
    - admin_notes: Notas administrativas sobre o pagamento
    - zelle_status: Status de revisão do pagamento Zelle
    - reviewed_by: ID do admin que revisou o pagamento
    - reviewed_at: Timestamp da revisão
  
  2. Valores Padrão
    - payment_method: 'stripe' (para usuários existentes)
    - zelle_status: 'pending_review' (para novos pagamentos Zelle)
  
  3. Índices
    - Índices para melhorar performance das consultas Zelle
*/

-- Adicionar campos Zelle na tabela user_profiles
ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'stripe',
ADD COLUMN IF NOT EXISTS payment_proof_url text,
ADD COLUMN IF NOT EXISTS admin_notes text,
ADD COLUMN IF NOT EXISTS zelle_status text DEFAULT 'pending_review',
ADD COLUMN IF NOT EXISTS reviewed_by uuid REFERENCES auth.users(id),
ADD COLUMN IF NOT EXISTS reviewed_at timestamptz;

-- Adicionar constraint para payment_method
ALTER TABLE user_profiles 
ADD CONSTRAINT IF NOT EXISTS check_payment_method 
CHECK (payment_method IN ('stripe', 'zelle', 'manual'));

-- Adicionar constraint para zelle_status
ALTER TABLE user_profiles 
ADD CONSTRAINT IF NOT EXISTS check_zelle_status 
CHECK (zelle_status IN ('pending_review', 'approved', 'rejected'));

-- Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_user_profiles_payment_method 
ON user_profiles(payment_method);

CREATE INDEX IF NOT EXISTS idx_user_profiles_zelle_status 
ON user_profiles(zelle_status) WHERE zelle_status IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_reviewed_by 
ON user_profiles(reviewed_by) WHERE reviewed_by IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_user_profiles_payment_proof 
ON user_profiles(payment_proof_url) WHERE payment_proof_url IS NOT NULL;

-- Atualizar registros existentes para ter payment_method = 'stripe'
UPDATE user_profiles 
SET payment_method = 'stripe' 
WHERE payment_method IS NULL;

-- Adicionar comentários para documentação
COMMENT ON COLUMN user_profiles.payment_method IS 'Método de pagamento: stripe, zelle, manual';
COMMENT ON COLUMN user_profiles.payment_proof_url IS 'URL do comprovante de pagamento Zelle';
COMMENT ON COLUMN user_profiles.admin_notes IS 'Notas administrativas sobre o pagamento';
COMMENT ON COLUMN user_profiles.zelle_status IS 'Status de revisão do pagamento Zelle: pending_review, approved, rejected';
COMMENT ON COLUMN user_profiles.reviewed_by IS 'ID do admin que revisou o pagamento Zelle';
COMMENT ON COLUMN user_profiles.reviewed_at IS 'Timestamp da revisão do pagamento Zelle';

-- Função para atualizar status Zelle
CREATE OR REPLACE FUNCTION update_zelle_payment_status(
  p_user_id uuid,
  p_zelle_status text,
  p_admin_notes text DEFAULT NULL,
  p_reviewed_by uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validar status
  IF p_zelle_status NOT IN ('pending_review', 'approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid zelle_status: %', p_zelle_status;
  END IF;
  
  -- Atualizar perfil do usuário
  UPDATE user_profiles SET
    zelle_status = p_zelle_status,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    reviewed_by = COALESCE(p_reviewed_by, reviewed_by),
    reviewed_at = CASE WHEN p_zelle_status IN ('approved', 'rejected') THEN now() ELSE reviewed_at END,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  RETURN FOUND;
END;
$$;

-- Função para buscar usuários com pagamentos Zelle pendentes
CREATE OR REPLACE FUNCTION get_pending_zelle_payments()
RETURNS TABLE (
  user_id uuid,
  full_name text,
  email text,
  payment_method text,
  zelle_status text,
  payment_proof_url text,
  admin_notes text,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    up.user_id,
    up.full_name,
    up.email,
    up.payment_method,
    up.zelle_status,
    up.payment_proof_url,
    up.admin_notes,
    up.created_at
  FROM user_profiles up
  WHERE up.payment_method = 'zelle'
    AND up.zelle_status = 'pending_review'
  ORDER BY up.created_at DESC;
END;
$$;

-- Comentários para as funções
COMMENT ON FUNCTION update_zelle_payment_status IS 'Atualiza o status de um pagamento Zelle no perfil do usuário';
COMMENT ON FUNCTION get_pending_zelle_payments IS 'Retorna todos os usuários com pagamentos Zelle pendentes de revisão';

-- Política para admins visualizarem campos Zelle
CREATE POLICY "Admins can view Zelle payment fields"
  ON user_profiles
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Política para admins atualizarem campos Zelle
CREATE POLICY "Admins can update Zelle payment fields"
  ON user_profiles
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );
