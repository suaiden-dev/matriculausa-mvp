/*
  # Sistema de Recompensas - Matricula Coin Store

  1. Novas Tabelas
    - `rewards` - Recompensas disponíveis na loja
    - `reward_redemptions` - Histórico de resgates de recompensas
    
  2. Funções
    - Função para resgatar recompensas
    - Função para validar resgates
    
  3. Políticas
    - Políticas específicas para usuários autenticados
    - Controle de acesso aos dados de recompensas
*/

-- Criar tabela de recompensas disponíveis
CREATE TABLE IF NOT EXISTS rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  cost integer NOT NULL CHECK (cost > 0),
  type text NOT NULL CHECK (type IN ('discount_fixed', 'discount_percentage', 'premium_access')),
  value numeric(10,2) NOT NULL,
  duration integer, -- em meses para descontos recorrentes
  is_active boolean DEFAULT true,
  image_url text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de histórico de resgates
CREATE TABLE IF NOT EXISTS reward_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  reward_id uuid REFERENCES rewards(id) ON DELETE CASCADE,
  cost_paid integer NOT NULL,
  status text DEFAULT 'active' CHECK (status IN ('active', 'used', 'expired', 'cancelled')),
  redeemed_at timestamptz DEFAULT now(),
  used_at timestamptz,
  expires_at timestamptz,
  metadata jsonb -- dados adicionais específicos da recompensa
);

-- Enable RLS
ALTER TABLE rewards ENABLE ROW LEVEL SECURITY;
ALTER TABLE reward_redemptions ENABLE ROW LEVEL SECURITY;

-- Políticas para rewards
CREATE POLICY "Anyone can view active rewards"
  ON rewards
  FOR SELECT
  TO authenticated, anon
  USING (is_active = true);

CREATE POLICY "Only admins can manage rewards"
  ON rewards
  FOR ALL
  TO authenticated
  USING (auth.uid() IN (
    SELECT user_id FROM user_profiles WHERE is_admin = true
  ));

-- Políticas para reward_redemptions
CREATE POLICY "Users can view their own redemptions"
  ON reward_redemptions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own redemptions"
  ON reward_redemptions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own redemptions"
  ON reward_redemptions
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Função para resgatar recompensa
CREATE OR REPLACE FUNCTION redeem_reward(
  user_id_param uuid,
  reward_id_param uuid,
  cost_param integer
)
RETURNS boolean AS $$
DECLARE
  current_balance numeric;
  reward_exists boolean;
  redemption_id uuid;
BEGIN
  -- Verificar se a recompensa existe e está ativa
  SELECT EXISTS(
    SELECT 1 FROM rewards 
    WHERE id = reward_id_param AND is_active = true
  ) INTO reward_exists;
  
  IF NOT reward_exists THEN
    RAISE EXCEPTION 'Reward not found or inactive';
  END IF;
  
  -- Verificar saldo do usuário
  SELECT COALESCE(balance, 0) INTO current_balance
  FROM matriculacoin_credits
  WHERE user_id = user_id_param;
  
  IF current_balance < cost_param THEN
    RAISE EXCEPTION 'Insufficient Matricula Coins';
  END IF;
  
  -- Deduzir créditos
  PERFORM deduct_credits_from_user(
    user_id_param,
    cost_param,
    reward_id_param,
    'reward_redemption',
    'Reward redemption'
  );
  
  -- Criar registro de resgate
  INSERT INTO reward_redemptions (
    user_id,
    reward_id,
    cost_paid,
    status,
    expires_at
  ) VALUES (
    user_id_param,
    reward_id_param,
    cost_param,
    'active',
    CASE 
      WHEN (SELECT duration FROM rewards WHERE id = reward_id_param) > 0 
      THEN now() + interval '1 month' * (SELECT duration FROM rewards WHERE id = reward_id_param)
      ELSE NULL
    END
  ) RETURNING id INTO redemption_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Função para usar recompensa
CREATE OR REPLACE FUNCTION use_reward(
  redemption_id_param uuid,
  user_id_param uuid
)
RETURNS boolean AS $$
DECLARE
  redemption_status text;
  reward_type text;
  reward_value numeric;
BEGIN
  -- Verificar se o resgate existe e pertence ao usuário
  SELECT status, r.type, r.value INTO redemption_status, reward_type, reward_value
  FROM reward_redemptions rr
  JOIN rewards r ON rr.reward_id = r.id
  WHERE rr.id = redemption_id_param AND rr.user_id = user_id_param;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Redemption not found or access denied';
  END IF;
  
  IF redemption_status != 'active' THEN
    RAISE EXCEPTION 'Reward already used or expired';
  END IF;
  
  -- Marcar como usado
  UPDATE reward_redemptions SET
    status = 'used',
    used_at = now()
  WHERE id = redemption_id_param;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualização automática de timestamps
CREATE TRIGGER update_rewards_updated_at 
  BEFORE UPDATE ON rewards 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_rewards_active ON rewards(is_active);
CREATE INDEX IF NOT EXISTS idx_rewards_type ON rewards(type);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_user_id ON reward_redemptions(user_id);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_status ON reward_redemptions(status);
CREATE INDEX IF NOT EXISTS idx_reward_redemptions_expires_at ON reward_redemptions(expires_at);

-- Inserir recompensas de exemplo
INSERT INTO rewards (name, description, cost, type, value, duration, is_active) VALUES
('10% Discount on Selection Process Fee', 'Get 10% off your selection process fee payment', 1000, 'discount_percentage', 10, NULL, true),
('50 Fixed Discount on Application Fee', 'Get 50 off your application fee', 500, 'discount_fixed', 50, NULL, true),
('Premium Support Access', 'Get priority support for 3 months', 800, 'premium_access', 0, 3, true),
('25% Discount on Monthly Fees', 'Get 25% off monthly fees for 6 months', 2000, 'discount_percentage', 25, 6, true); 