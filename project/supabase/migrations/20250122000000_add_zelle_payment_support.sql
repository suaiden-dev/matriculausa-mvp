/*
  # Sistema de Pagamento Zelle
  
  1. Novas Tabelas
    - `zelle_payments` - Registro de pagamentos via Zelle
    - `payment_methods` - Métodos de pagamento disponíveis
    
  2. Novas Funções
    - Função para processar pagamentos Zelle
    - Função para validar comprovantes
    
  3. Melhorias
    - Suporte a múltiplos métodos de pagamento
    - Rastreamento de pagamentos Zelle
    - Sistema de comprovantes
*/

-- Criar tabela para métodos de pagamento
CREATE TABLE IF NOT EXISTS payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  display_name text NOT NULL,
  description text,
  is_active boolean DEFAULT true,
  requires_verification boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Inserir métodos de pagamento padrão
INSERT INTO payment_methods (name, display_name, description, is_active, requires_verification) VALUES
  ('stripe', 'Credit Card', 'Pay with credit or debit card via Stripe', true, false),
  ('zelle', 'Zelle', 'Pay via Zelle transfer', true, true)
ON CONFLICT (name) DO NOTHING;

-- Criar tabela para pagamentos Zelle
CREATE TABLE IF NOT EXISTS zelle_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  fee_type text NOT NULL CHECK (fee_type IN ('selection_process', 'application_fee', 'enrollment_fee', 'scholarship_fee', 'i20_control')),
  amount numeric(10,2) NOT NULL,
  currency text DEFAULT 'USD',
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'pending_verification', 'verified', 'rejected', 'expired')),
  confirmation_code text,
  payment_date timestamptz,
  recipient_email text,
  recipient_name text,
  comprovante_url text,
  comprovante_uploaded_at timestamptz,
  admin_notes text,
  verified_by uuid REFERENCES auth.users(id),
  verified_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_zelle_payments_user_id ON zelle_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_zelle_payments_status ON zelle_payments(status);
CREATE INDEX IF NOT EXISTS idx_zelle_payments_fee_type ON zelle_payments(fee_type);
CREATE INDEX IF NOT EXISTS idx_zelle_payments_confirmation_code ON zelle_payments(confirmation_code);

-- Habilitar RLS
ALTER TABLE payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE zelle_payments ENABLE ROW LEVEL SECURITY;

-- Políticas para payment_methods (qualquer usuário pode ver métodos ativos)
CREATE POLICY "Anyone can view active payment methods"
  ON payment_methods
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

-- Políticas para zelle_payments
CREATE POLICY "Users can view their own Zelle payments"
  ON zelle_payments
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own Zelle payments"
  ON zelle_payments
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own Zelle payments"
  ON zelle_payments
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Admins podem ver e gerenciar todos os pagamentos Zelle
CREATE POLICY "Admins can manage all Zelle payments"
  ON zelle_payments
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE user_id = auth.uid() AND is_admin = true
    )
  );

-- Função para criar pagamento Zelle
CREATE OR REPLACE FUNCTION create_zelle_payment(
  p_user_id uuid,
  p_fee_type text,
  p_amount numeric,
  p_currency text DEFAULT 'USD',
  p_recipient_email text DEFAULT NULL,
  p_recipient_name text DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_id uuid;
BEGIN
  -- Validar parâmetros
  IF p_amount <= 0 THEN
    RAISE EXCEPTION 'Amount must be greater than 0';
  END IF;
  
  IF p_fee_type NOT IN ('selection_process', 'application_fee', 'enrollment_fee', 'scholarship_fee', 'i20_control') THEN
    RAISE EXCEPTION 'Invalid fee type';
  END IF;
  
  -- Inserir pagamento
  INSERT INTO zelle_payments (
    user_id,
    fee_type,
    amount,
    currency,
    recipient_email,
    recipient_name,
    metadata
  ) VALUES (
    p_user_id,
    p_fee_type,
    p_amount,
    p_currency,
    p_recipient_email,
    p_recipient_name,
    p_metadata
  ) RETURNING id INTO v_payment_id;
  
  RETURN v_payment_id;
END;
$$;

-- Função para atualizar status do pagamento Zelle
CREATE OR REPLACE FUNCTION update_zelle_payment_status(
  p_payment_id uuid,
  p_status text,
  p_admin_notes text DEFAULT NULL,
  p_verified_by uuid DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Validar status
  IF p_status NOT IN ('pending', 'pending_verification', 'verified', 'rejected', 'expired') THEN
    RAISE EXCEPTION 'Invalid status';
  END IF;
  
  -- Atualizar pagamento
  UPDATE zelle_payments SET
    status = p_status,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    verified_by = COALESCE(p_verified_by, verified_by),
    verified_at = CASE WHEN p_status = 'verified' THEN now() ELSE verified_at END,
    updated_at = now()
  WHERE id = p_payment_id;
  
  RETURN FOUND;
END;
$$;

-- Função para buscar pagamentos Zelle do usuário
CREATE OR REPLACE FUNCTION get_user_zelle_payments(p_user_id uuid)
RETURNS TABLE (
  id uuid,
  fee_type text,
  amount numeric,
  currency text,
  status text,
  confirmation_code text,
  payment_date timestamptz,
  recipient_email text,
  recipient_name text,
  comprovante_url text,
  created_at timestamptz,
  expires_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    zp.id,
    zp.fee_type,
    zp.amount,
    zp.currency,
    zp.status,
    zp.confirmation_code,
    zp.payment_date,
    zp.recipient_email,
    zp.recipient_name,
    zp.comprovante_url,
    zp.created_at,
    zp.expires_at
  FROM zelle_payments zp
  WHERE zp.user_id = p_user_id
  ORDER BY zp.created_at DESC;
END;
$$;

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_zelle_payments_updated_at
  BEFORE UPDATE ON zelle_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Comentários para documentação
COMMENT ON TABLE payment_methods IS 'Métodos de pagamento disponíveis no sistema';
COMMENT ON TABLE zelle_payments IS 'Pagamentos realizados via Zelle';
COMMENT ON FUNCTION create_zelle_payment IS 'Cria um novo pagamento Zelle para o usuário';
COMMENT ON FUNCTION update_zelle_payment_status IS 'Atualiza o status de um pagamento Zelle';
COMMENT ON FUNCTION get_user_zelle_payments IS 'Retorna todos os pagamentos Zelle de um usuário';
