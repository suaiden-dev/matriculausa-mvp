/*
  # Sistema de Afiliados - Matricula Rewards

  1. Novas Tabelas
    - `affiliate_codes` - Códigos de indicação únicos por usuário
    - `affiliate_referrals` - Registro de indicações realizadas
    - `matriculacoin_credits` - Saldo de créditos por usuário
    - `matriculacoin_transactions` - Histórico de transações de créditos
    
  2. Funções
    - Função para gerar códigos únicos
    - Função para processar indicações
    - Função para gerenciar créditos
    
  3. Políticas
    - Políticas específicas para usuários autenticados
    - Controle de acesso aos dados de afiliados
    
  4. Triggers
    - Triggers para atualização automática de timestamps
*/

-- Criar tabela de códigos de indicação únicos por usuário
CREATE TABLE IF NOT EXISTS affiliate_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  code text UNIQUE NOT NULL,
  is_active boolean DEFAULT true,
  total_referrals integer DEFAULT 0,
  total_earnings numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de registro de indicações realizadas
CREATE TABLE IF NOT EXISTS affiliate_referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  referred_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_code text NOT NULL,
  payment_amount numeric(10,2),
  credits_earned numeric(10,2),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'cancelled')),
  payment_session_id text,
  created_at timestamptz DEFAULT now(),
  completed_at timestamptz,
  UNIQUE(referred_id)
);

-- Criar tabela de saldo de créditos por usuário
CREATE TABLE IF NOT EXISTS matriculacoin_credits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  balance numeric(10,2) DEFAULT 0,
  total_earned numeric(10,2) DEFAULT 0,
  total_spent numeric(10,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Criar tabela de histórico de transações de créditos
CREATE TABLE IF NOT EXISTS matriculacoin_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('earned', 'spent', 'expired', 'refunded')),
  amount numeric(10,2) NOT NULL,
  description text,
  reference_id uuid,
  reference_type text,
  balance_after numeric(10,2),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE affiliate_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE matriculacoin_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE matriculacoin_transactions ENABLE ROW LEVEL SECURITY;

-- Políticas para affiliate_codes
CREATE POLICY "Users can view their own affiliate code"
  ON affiliate_codes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own affiliate code"
  ON affiliate_codes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own affiliate code"
  ON affiliate_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Políticas para affiliate_referrals
CREATE POLICY "Users can view their own referrals"
  ON affiliate_referrals
  FOR SELECT
  TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id);

CREATE POLICY "Users can insert referrals"
  ON affiliate_referrals
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Users can update their own referrals"
  ON affiliate_referrals
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = referrer_id OR auth.uid() = referred_id)
  WITH CHECK (auth.uid() = referrer_id OR auth.uid() = referred_id);

-- Políticas para matriculacoin_credits
CREATE POLICY "Users can view their own credits"
  ON matriculacoin_credits
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own credits"
  ON matriculacoin_credits
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credits"
  ON matriculacoin_credits
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Políticas para matriculacoin_transactions
CREATE POLICY "Users can view their own transactions"
  ON matriculacoin_transactions
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert transactions"
  ON matriculacoin_transactions
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Função para gerar código único de afiliado
CREATE OR REPLACE FUNCTION generate_affiliate_code()
RETURNS text AS $$
DECLARE
  new_code text;
  code_exists boolean;
BEGIN
  LOOP
    -- Gera código de 8 caracteres (4 letras + 4 números)
    new_code := 'MATR' || LPAD(FLOOR(RANDOM() * 10000)::text, 4, '0');
    
    -- Verifica se o código já existe
    SELECT EXISTS(SELECT 1 FROM affiliate_codes WHERE code = new_code) INTO code_exists;
    
    -- Se não existe, retorna o código
    IF NOT code_exists THEN
      RETURN new_code;
    END IF;
  END LOOP;
END;
$$ LANGUAGE plpgsql;

-- Função para criar código de afiliado para usuário
CREATE OR REPLACE FUNCTION create_affiliate_code_for_user(user_id_param uuid)
RETURNS text AS $$
DECLARE
  new_code text;
BEGIN
  -- Gera código único
  new_code := generate_affiliate_code();
  
  -- Insere o código para o usuário
  INSERT INTO affiliate_codes (user_id, code)
  VALUES (user_id_param, new_code)
  ON CONFLICT (user_id) DO NOTHING;
  
  RETURN new_code;
END;
$$ LANGUAGE plpgsql;

-- Função para processar indicação
CREATE OR REPLACE FUNCTION process_affiliate_referral(
  affiliate_code_param text,
  referred_user_id_param uuid,
  payment_amount_param numeric DEFAULT 0,
  payment_session_id_param text DEFAULT NULL
)
RETURNS boolean AS $$
DECLARE
  referrer_user_id uuid;
  referral_id uuid;
  credits_earned numeric := 50; -- $50 Matricula Rewards por indicação
BEGIN
  -- Busca o referenciador pelo código
  SELECT user_id INTO referrer_user_id
  FROM affiliate_codes
  WHERE code = affiliate_code_param AND is_active = true;
  
  -- Se não encontrou o código, retorna false
  IF referrer_user_id IS NULL THEN
    RETURN false;
  END IF;
  
  -- Verifica se não é auto-indicação
  IF referrer_user_id = referred_user_id_param THEN
    RETURN false;
  END IF;
  
  -- Verifica se já existe indicação para este usuário
  IF EXISTS(SELECT 1 FROM affiliate_referrals WHERE referred_id = referred_user_id_param) THEN
    RETURN false;
  END IF;
  
  -- Cria registro da indicação
  INSERT INTO affiliate_referrals (
    referrer_id,
    referred_id,
    affiliate_code,
    payment_amount,
    credits_earned,
    status,
    payment_session_id,
    completed_at
  ) VALUES (
    referrer_user_id,
    referred_user_id_param,
    affiliate_code_param,
    payment_amount_param,
    credits_earned,
    'completed',
    payment_session_id_param,
    now()
  ) RETURNING id INTO referral_id;
  
  -- Adiciona créditos ao referenciador
  INSERT INTO matriculacoin_credits (user_id, balance, total_earned)
  VALUES (referrer_user_id, credits_earned, credits_earned)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = matriculacoin_credits.balance + credits_earned,
    total_earned = matriculacoin_credits.total_earned + credits_earned,
    updated_at = now();
  
  -- Registra transação
  INSERT INTO matriculacoin_transactions (
    user_id,
    type,
    amount,
    description,
    reference_id,
    reference_type,
    balance_after
  ) VALUES (
    referrer_user_id,
    'earned',
    credits_earned,
    'Créditos ganhos por indicação',
    referral_id,
    'referral',
    (SELECT balance FROM matriculacoin_credits WHERE user_id = referrer_user_id)
  );
  
  -- Atualiza estatísticas do código
  UPDATE affiliate_codes SET
    total_referrals = total_referrals + 1,
    total_earnings = total_earnings + credits_earned,
    updated_at = now()
  WHERE user_id = referrer_user_id;
  
  RETURN true;
END;
$$ LANGUAGE plpgsql;

-- Função para adicionar créditos a um usuário
CREATE OR REPLACE FUNCTION add_credits_to_user(
  user_id_param uuid,
  amount_param numeric,
  reference_id_param uuid DEFAULT NULL,
  reference_type_param text DEFAULT NULL,
  description_param text DEFAULT NULL
)
RETURNS numeric AS $$
DECLARE
  current_balance numeric;
  new_balance numeric;
BEGIN
  -- Busca saldo atual
  SELECT COALESCE(balance, 0) INTO current_balance
  FROM matriculacoin_credits
  WHERE user_id = user_id_param;
  
  new_balance := current_balance + amount_param;
  
  -- Atualiza ou cria registro de créditos
  INSERT INTO matriculacoin_credits (user_id, balance, total_earned)
  VALUES (user_id_param, new_balance, amount_param)
  ON CONFLICT (user_id) DO UPDATE SET
    balance = new_balance,
    total_earned = matriculacoin_credits.total_earned + amount_param,
    updated_at = now();
  
  -- Registra transação
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
    'earned',
    amount_param,
    COALESCE(description_param, 'Créditos adicionados'),
    reference_id_param,
    reference_type_param,
    new_balance
  );
  
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

-- Função para deduzir créditos de um usuário
CREATE OR REPLACE FUNCTION deduct_credits_from_user(
  user_id_param uuid,
  amount_param numeric,
  reference_id_param uuid DEFAULT NULL,
  reference_type_param text DEFAULT NULL,
  description_param text DEFAULT NULL
)
RETURNS numeric AS $$
DECLARE
  current_balance numeric;
  new_balance numeric;
BEGIN
  -- Busca saldo atual
  SELECT COALESCE(balance, 0) INTO current_balance
  FROM matriculacoin_credits
  WHERE user_id = user_id_param;
  
  -- Verifica se tem saldo suficiente
  IF current_balance < amount_param THEN
    RAISE EXCEPTION 'Saldo insuficiente: % disponível, % solicitado', current_balance, amount_param;
  END IF;
  
  new_balance := current_balance - amount_param;
  
  -- Atualiza saldo
  UPDATE matriculacoin_credits SET
    balance = new_balance,
    total_spent = total_spent + amount_param,
    updated_at = now()
  WHERE user_id = user_id_param;
  
  -- Registra transação
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
    'spent',
    amount_param,
    COALESCE(description_param, 'Créditos utilizados'),
    reference_id_param,
    reference_type_param,
    new_balance
  );
  
  RETURN new_balance;
END;
$$ LANGUAGE plpgsql;

-- Triggers para atualização automática de timestamps
CREATE TRIGGER update_affiliate_codes_updated_at 
  BEFORE UPDATE ON affiliate_codes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matriculacoin_credits_updated_at 
  BEFORE UPDATE ON matriculacoin_credits 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_affiliate_codes_user_id ON affiliate_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_codes_code ON affiliate_codes(code);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referrer_id ON affiliate_referrals(referrer_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_referred_id ON affiliate_referrals(referred_id);
CREATE INDEX IF NOT EXISTS idx_affiliate_referrals_affiliate_code ON affiliate_referrals(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_matriculacoin_credits_user_id ON matriculacoin_credits(user_id);
CREATE INDEX IF NOT EXISTS idx_matriculacoin_transactions_user_id ON matriculacoin_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_matriculacoin_transactions_created_at ON matriculacoin_transactions(created_at); 