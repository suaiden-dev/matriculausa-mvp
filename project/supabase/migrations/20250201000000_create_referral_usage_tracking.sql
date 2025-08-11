/*
  # Fase 5: Integração com Sistema de Pagamentos - Matricula Rewards
  
  1. Nova Tabela
    - `used_referral_codes` - Rastrear códigos utilizados por usuário
    
  2. Novas Funções
    - Função para validar e aplicar desconto automático
    - Função para criar cupons Stripe
    - Função para rastrear uso de códigos
    
  3. Melhorias
    - Sistema de desconto automático
    - Validação de uso único
    - Integração com Stripe
*/

-- Criar tabela para rastrear códigos de referência utilizados
CREATE TABLE IF NOT EXISTS used_referral_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  affiliate_code text NOT NULL,
  referrer_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  discount_amount numeric(10,2) DEFAULT 50.00,
  stripe_coupon_id text,
  payment_session_id text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'applied', 'expired', 'cancelled')),
  applied_at timestamptz,
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, affiliate_code)
);

-- Enable RLS
ALTER TABLE used_referral_codes ENABLE ROW LEVEL SECURITY;

-- Políticas para used_referral_codes
CREATE POLICY "Users can view their own used referral codes"
  ON used_referral_codes
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own used referral codes"
  ON used_referral_codes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own used referral codes"
  ON used_referral_codes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Função para validar e aplicar código de referência
CREATE OR REPLACE FUNCTION validate_and_apply_referral_code(
  user_id_param uuid,
  affiliate_code_param text
)
RETURNS json AS $$
DECLARE
  referrer_user_id uuid;
  discount_amount numeric := 50.00;
  stripe_coupon_id text;
  result json;
BEGIN
  -- Verifica se o código existe e está ativo
  SELECT user_id INTO referrer_user_id
  FROM affiliate_codes
  WHERE code = affiliate_code_param AND is_active = true;
  
  IF referrer_user_id IS NULL THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Código de referência inválido'
    );
  END IF;
  
  -- Verifica se não é auto-referência
  IF referrer_user_id = user_id_param THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Não é possível usar seu próprio código de referência'
    );
  END IF;
  
  -- Verifica se o usuário já usou algum código
  IF EXISTS(SELECT 1 FROM used_referral_codes WHERE user_id = user_id_param) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Você já utilizou um código de referência'
    );
  END IF;
  
  -- Verifica se o código já foi usado por este usuário
  IF EXISTS(SELECT 1 FROM used_referral_codes WHERE user_id = user_id_param AND affiliate_code = affiliate_code_param) THEN
    RETURN json_build_object(
      'success', false,
      'error', 'Este código já foi utilizado'
    );
  END IF;
  
  -- Cria cupom no Stripe (será implementado na edge function)
  stripe_coupon_id := 'MATRICULA_' || affiliate_code_param || '_' || user_id_param::text;
  
  -- Registra o uso do código
  INSERT INTO used_referral_codes (
    user_id,
    affiliate_code,
    referrer_id,
    discount_amount,
    stripe_coupon_id,
    status,
    applied_at
  ) VALUES (
    user_id_param,
    affiliate_code_param,
    referrer_user_id,
    discount_amount,
    stripe_coupon_id,
    'applied',
    now()
  );
  
  -- Processa a indicação (adiciona créditos ao referenciador)
  PERFORM process_affiliate_referral(
    affiliate_code_param,
    user_id_param,
    0, -- payment_amount (será atualizado quando pagar)
    NULL -- payment_session_id (será atualizado quando pagar)
  );
  
  RETURN json_build_object(
    'success', true,
    'discount_amount', discount_amount,
    'stripe_coupon_id', stripe_coupon_id,
    'referrer_id', referrer_user_id,
    'message', 'Código de referência aplicado com sucesso! Você ganhou $50 de desconto.'
  );
END;
$$ LANGUAGE plpgsql;

-- Função para obter desconto ativo do usuário
CREATE OR REPLACE FUNCTION get_user_active_discount(user_id_param uuid)
RETURNS json AS $$
DECLARE
  discount_record record;
BEGIN
  -- Log para debug
  RAISE NOTICE 'Checking discount for user: %', user_id_param;
  
  SELECT 
    urc.affiliate_code,
    urc.discount_amount,
    urc.stripe_coupon_id,
    urc.referrer_id,
    urc.applied_at,
    urc.expires_at,
    ac.code as referrer_code
  INTO discount_record
  FROM used_referral_codes urc
  LEFT JOIN affiliate_codes ac ON urc.referrer_id = ac.user_id
  WHERE urc.user_id = user_id_param 
    AND urc.status = 'applied'
    AND (urc.expires_at IS NULL OR urc.expires_at > now())
  ORDER BY urc.applied_at DESC
  LIMIT 1;
  
  -- Log para debug
  IF discount_record IS NULL THEN
    RAISE NOTICE 'No discount found for user: %', user_id_param;
    RETURN json_build_object('has_discount', false);
  ELSE
    RAISE NOTICE 'Discount found for user: % - coupon: %', user_id_param, discount_record.stripe_coupon_id;
  END IF;
  
  RETURN json_build_object(
    'has_discount', true,
    'affiliate_code', discount_record.affiliate_code,
    'discount_amount', discount_record.discount_amount,
    'stripe_coupon_id', discount_record.stripe_coupon_id,
    'referrer_id', discount_record.referrer_id,
    'referrer_code', discount_record.referrer_code,
    'applied_at', discount_record.applied_at,
    'expires_at', discount_record.expires_at
  );
END;
$$ LANGUAGE plpgsql;

-- Função para atualizar status do desconto após pagamento
CREATE OR REPLACE FUNCTION update_discount_after_payment(
  user_id_param uuid,
  payment_session_id_param text
)
RETURNS boolean AS $$
BEGIN
  UPDATE used_referral_codes SET
    status = 'applied',
    payment_session_id = payment_session_id_param,
    updated_at = now()
  WHERE user_id = user_id_param 
    AND status = 'applied';
  
  RETURN FOUND;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualização automática de timestamps
CREATE TRIGGER update_used_referral_codes_updated_at 
  BEFORE UPDATE ON used_referral_codes 
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_used_referral_codes_user_id ON used_referral_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_used_referral_codes_affiliate_code ON used_referral_codes(affiliate_code);
CREATE INDEX IF NOT EXISTS idx_used_referral_codes_status ON used_referral_codes(status);
CREATE INDEX IF NOT EXISTS idx_used_referral_codes_expires_at ON used_referral_codes(expires_at);
