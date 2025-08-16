/*
  # Sistema de Resgate de Tuition - Matricula Rewards
  
  1. Novas Tabelas
    - `tuition_discounts` - Descontos de tuition disponíveis
    - `tuition_redemptions` - Histórico de resgates de tuition
    - `university_rewards_account` - Conta de recompensas da universidade
    
  2. Funções
    - Função para resgatar desconto de tuition
    - Função para confirmar resgate
    - Função para gerenciar conta da universidade
    
  3. Políticas
    - Políticas específicas para usuários autenticados
    - Controle de acesso aos dados de tuition
*/

-- Criar tabela de descontos de tuition disponíveis
CREATE TABLE IF NOT EXISTS tuition_discounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  cost_coins integer NOT NULL CHECK (cost_coins > 0),
  discount_amount numeric(10,2) NOT NULL CHECK (discount_amount > 0),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de histórico de resgates de tuition
CREATE TABLE IF NOT EXISTS tuition_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  university_id uuid REFERENCES universities(id) ON DELETE CASCADE,
  discount_id uuid REFERENCES tuition_discounts(id) ON DELETE CASCADE,
  cost_coins_paid integer NOT NULL,
  discount_amount numeric(10,2) NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'expired')),
  redeemed_at timestamptz DEFAULT now(),
  confirmed_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  metadata jsonb -- dados adicionais específicos do resgate
);

-- Criar tabela de conta de recompensas da universidade
CREATE TABLE IF NOT EXISTS university_rewards_account (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  university_id uuid REFERENCES universities(id) ON DELETE CASCADE UNIQUE,
  total_received_coins integer DEFAULT 0,
  total_discounts_sent integer DEFAULT 0,
  total_discount_amount numeric(10,2) DEFAULT 0,
  balance_coins integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE tuition_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE tuition_redemptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE university_rewards_account ENABLE ROW LEVEL SECURITY;

-- Políticas para tuition_discounts
CREATE POLICY "Anyone can view active tuition discounts"
  ON tuition_discounts
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "Only admins can manage tuition discounts"
  ON tuition_discounts
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM user_profiles WHERE is_admin = true
  ));

-- Políticas para tuition_redemptions
CREATE POLICY "Users can view their own tuition redemptions"
  ON tuition_redemptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tuition redemptions"
  ON tuition_redemptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tuition redemptions"
  ON tuition_redemptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas para university_rewards_account
CREATE POLICY "Universities can view their own rewards account"
  ON university_rewards_account
  FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM universities 
    WHERE universities.id = university_rewards_account.university_id 
    AND universities.user_id = auth.uid()
  ));

CREATE POLICY "Only system can manage university rewards accounts"
  ON university_rewards_account
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM user_profiles WHERE is_admin = true
  ));

-- Função para resgatar desconto de tuition
CREATE OR REPLACE FUNCTION redeem_tuition_discount(
  user_id_param uuid,
  university_id_param uuid,
  discount_id_param uuid
)
RETURNS json AS $$
DECLARE
  current_balance numeric;
  discount_exists boolean;
  discount_data record;
  redemption_id uuid;
  university_data record;
  result json;
BEGIN
  -- Verificar se o desconto existe e está ativo
  SELECT EXISTS(
    SELECT 1 FROM tuition_discounts 
    WHERE id = discount_id_param AND is_active = true
  ) INTO discount_exists;
  
  IF NOT discount_exists THEN
    RAISE EXCEPTION 'Tuition discount not found or inactive';
  END IF;
  
  -- Buscar dados do desconto
  SELECT * INTO discount_data
  FROM tuition_discounts
  WHERE id = discount_id_param;
  
  -- Verificar se a universidade existe e está aprovada
  SELECT * INTO university_data
  FROM universities
  WHERE id = university_id_param AND is_approved = true;
  
  IF university_data IS NULL THEN
    RAISE EXCEPTION 'University not found or not approved';
  END IF;
  
  -- Verificar saldo do usuário
  SELECT COALESCE(balance, 0) INTO current_balance
  FROM matriculacoin_credits
  WHERE user_id = user_id_param;
  
  IF current_balance < discount_data.cost_coins THEN
    RAISE EXCEPTION 'Insufficient Matricula Coins';
  END IF;
  
  -- Verificar se já existe resgate pendente para este usuário e universidade
  IF EXISTS(
    SELECT 1 FROM tuition_redemptions 
    WHERE user_id = user_id_param 
    AND university_id = university_id_param 
    AND status = 'pending'
  ) THEN
    RAISE EXCEPTION 'You already have a pending redemption for this university';
  END IF;
  
  -- Deduzir créditos
  PERFORM deduct_credits_from_user(
    user_id_param,
    discount_data.cost_coins,
    discount_id_param,
    'tuition_redemption',
    'Tuition discount redemption'
  );
  
  -- Criar registro de resgate
  INSERT INTO tuition_redemptions (
    user_id,
    university_id,
    discount_id,
    cost_coins_paid,
    discount_amount,
    status,
    metadata
  ) VALUES (
    user_id_param,
    university_id_param,
    discount_id_param,
    discount_data.cost_coins,
    discount_data.discount_amount,
    'pending',
    jsonb_build_object(
      'university_name', university_data.name,
      'university_location', university_data.location,
      'discount_name', discount_data.name
    )
  ) RETURNING id INTO redemption_id;
  
  -- Criar ou atualizar conta da universidade
  INSERT INTO university_rewards_account (
    university_id,
    total_received_coins,
    total_discounts_sent,
    total_discount_amount,
    balance_coins
  ) VALUES (
    university_id_param,
    discount_data.cost_coins,
    1,
    discount_data.discount_amount,
    discount_data.cost_coins
  ) ON CONFLICT (university_id) DO UPDATE SET
    total_received_coins = university_rewards_account.total_received_coins + discount_data.cost_coins,
    total_discounts_sent = university_rewards_account.total_discounts_sent + 1,
    total_discount_amount = university_rewards_account.total_discount_amount + discount_data.discount_amount,
    balance_coins = university_rewards_account.balance_coins + discount_data.cost_coins,
    updated_at = now();
  
  -- Retornar dados do resgate
  SELECT json_build_object(
    'redemption_id', redemption_id,
    'university_name', university_data.name,
    'university_location', university_data.location,
    'discount_amount', discount_data.discount_amount,
    'cost_coins', discount_data.cost_coins,
    'status', 'pending'
  ) INTO result;
  
  -- NOTA: A notificação para a universidade será enviada pela Edge Function
  -- 'notify-university-discount-redemption' que deve ser chamada pelo frontend
  -- após o sucesso desta função. Os dados necessários estão no resultado retornado.
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Função para confirmar resgate de tuition
CREATE OR REPLACE FUNCTION confirm_tuition_redemption(
  redemption_id_param uuid,
  user_id_param uuid
)
RETURNS boolean AS $$
DECLARE
  redemption_data record;
BEGIN
  -- Verificar se o resgate existe e pertence ao usuário
  SELECT * INTO redemption_data
  FROM tuition_redemptions
  WHERE id = redemption_id_param AND user_id = user_id_param;
  
  IF redemption_data IS NULL THEN
    RAISE EXCEPTION 'Redemption not found or access denied';
  END IF;
  
  IF redemption_data.status != 'pending' THEN
    RAISE EXCEPTION 'Redemption already confirmed or cancelled';
  END IF;
  
  -- Marcar como confirmado
  UPDATE tuition_redemptions SET
    status = 'confirmed',
    confirmed_at = now()
  WHERE id = redemption_id_param;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Função para cancelar resgate de tuition
CREATE OR REPLACE FUNCTION cancel_tuition_redemption(
  redemption_id_param uuid,
  user_id_param uuid
)
RETURNS boolean AS $$
DECLARE
  redemption_data record;
  current_balance numeric;
BEGIN
  -- Verificar se o resgate existe e pertence ao usuário
  SELECT * INTO redemption_data
  FROM tuition_redemptions
  WHERE id = redemption_id_param AND user_id = user_id_param;
  
  IF redemption_data IS NULL THEN
    RAISE EXCEPTION 'Redemption not found or access denied';
  END IF;
  
  IF redemption_data.status != 'pending' THEN
    RAISE EXCEPTION 'Redemption cannot be cancelled';
  END IF;
  
  -- Devolver créditos ao usuário
  SELECT COALESCE(balance, 0) INTO current_balance
  FROM matriculacoin_credits
  WHERE user_id = user_id_param;
  
  -- Atualizar saldo do usuário
  UPDATE matriculacoin_credits SET
    balance = current_balance + redemption_data.cost_coins_paid,
    total_spent = total_spent - redemption_data.cost_coins_paid,
    updated_at = now()
  WHERE user_id = user_id_param;
  
  -- Registrar transação de devolução
  INSERT INTO matriculacoin_transactions (
    user_id,
    type,
    amount,
    description,
    reference_id,
    reference_type,
    balance_after
  ) VALUES (
    user_id_param,
    'refund',
    redemption_data.cost_coins_paid,
    'Tuition discount redemption cancelled',
    redemption_id_param,
    'tuition_redemption_cancellation',
    current_balance + redemption_data.cost_coins_paid
  );
  
  -- Atualizar conta da universidade
  UPDATE university_rewards_account SET
    total_received_coins = total_received_coins - redemption_data.cost_coins_paid,
    total_discounts_sent = total_discounts_sent - 1,
    total_discount_amount = total_discount_amount - redemption_data.discount_amount,
    balance_coins = balance_coins - redemption_data.cost_coins_paid,
    updated_at = now()
  WHERE university_id = redemption_data.university_id;
  
  -- Marcar como cancelado
  UPDATE tuition_redemptions SET
    status = 'cancelled'
  WHERE id = redemption_id_param;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Função para obter dados da universidade para confirmação
CREATE OR REPLACE FUNCTION get_university_confirmation_data(
  university_id_param uuid
)
RETURNS json AS $$
DECLARE
  university_data record;
  result json;
BEGIN
  -- Buscar dados da universidade
  SELECT 
    id,
    name,
    location,
    website,
    established_year,
    student_count,
    type,
    campus_size
  INTO university_data
  FROM universities
  WHERE id = university_id_param AND is_approved = true;
  
  IF university_data IS NULL THEN
    RAISE EXCEPTION 'University not found or not approved';
  END IF;
  
  -- Retornar dados formatados
  SELECT json_build_object(
    'id', university_data.id,
    'name', university_data.name,
    'location', university_data.location,
    'website', university_data.website,
    'established_year', university_data.established_year,
    'student_count', university_data.student_count,
    'type', university_data.type,
    'campus_size', university_data.campus_size
  ) INTO result;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualização automática de timestamps
CREATE TRIGGER update_tuition_discounts_updated_at 
  BEFORE UPDATE ON tuition_discounts 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_university_rewards_account_updated_at 
  BEFORE UPDATE ON university_rewards_account 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_tuition_discounts_active ON tuition_discounts(is_active);
CREATE INDEX IF NOT EXISTS idx_tuition_redemptions_user_id ON tuition_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_tuition_redemptions_university_id ON tuition_redemptions(university_id);
CREATE INDEX IF NOT EXISTS idx_tuition_redemptions_status ON tuition_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_tuition_redemptions_expires_at ON tuition_redemptions(expires_at);
CREATE INDEX IF NOT EXISTS idx_university_rewards_account_university_id ON university_rewards_account(university_id);

-- Inserir descontos de tuition de exemplo
INSERT INTO tuition_discounts (name, description, cost_coins, discount_amount, is_active) VALUES
('$50 Tuition Discount', 'Get $50 off your university tuition', 50, 50.00, true),
('$100 Tuition Discount', 'Get $100 off your university tuition', 100, 100.00, true),
('$200 Tuition Discount', 'Get $200 off your university tuition', 200, 200.00, true);
