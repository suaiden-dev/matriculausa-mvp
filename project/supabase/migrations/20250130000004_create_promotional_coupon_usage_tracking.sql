/*
  # Sistema de Rastreamento de Uso de Cupons Promocionais
  
  1. Nova Tabela
    - `promotional_coupon_usage` - Rastrear quando cupons promocionais foram usados em pagamentos
    
  2. Funcionalidades
    - Registrar qual aluno usou o cupom
    - Quando foi usado
    - Qual pagamento (fee_type, payment_id)
    - Valor do desconto aplicado
    - Histórico completo para analytics
*/

-- Criar tabela para rastrear uso de cupons promocionais
CREATE TABLE IF NOT EXISTS promotional_coupon_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  coupon_code text NOT NULL,
  coupon_id uuid, -- Referência ao promotional_coupons.id se existir
  fee_type text NOT NULL CHECK (fee_type IN ('selection_process', 'application_fee', 'enrollment_fee', 'scholarship_fee', 'i20_control', 'i20_control_fee')),
  payment_id text, -- ID do pagamento (session_id, zelle_payment_id, etc)
  payment_method text NOT NULL CHECK (payment_method IN ('stripe', 'zelle', 'pix')),
  original_amount numeric(10,2) NOT NULL, -- Valor original antes do desconto
  discount_amount numeric(10,2) NOT NULL, -- Valor do desconto aplicado
  final_amount numeric(10,2) NOT NULL, -- Valor final pago
  stripe_session_id text, -- ID da sessão Stripe (se aplicável)
  zelle_payment_id uuid REFERENCES zelle_payments(id) ON DELETE SET NULL, -- ID do pagamento Zelle (se aplicável)
  individual_fee_payment_id uuid, -- ID do registro em individual_fee_payments
  metadata jsonb, -- Dados adicionais (coupon_id do Stripe, etc)
  used_at timestamptz DEFAULT now() NOT NULL,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL
);

-- Índices para melhor performance em queries
CREATE INDEX IF NOT EXISTS idx_promotional_coupon_usage_user_id ON promotional_coupon_usage(user_id);
CREATE INDEX IF NOT EXISTS idx_promotional_coupon_usage_coupon_code ON promotional_coupon_usage(coupon_code);
CREATE INDEX IF NOT EXISTS idx_promotional_coupon_usage_fee_type ON promotional_coupon_usage(fee_type);
CREATE INDEX IF NOT EXISTS idx_promotional_coupon_usage_used_at ON promotional_coupon_usage(used_at);
CREATE INDEX IF NOT EXISTS idx_promotional_coupon_usage_payment_id ON promotional_coupon_usage(payment_id);
CREATE INDEX IF NOT EXISTS idx_promotional_coupon_usage_stripe_session_id ON promotional_coupon_usage(stripe_session_id);

-- Enable RLS
ALTER TABLE promotional_coupon_usage ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
-- Usuários podem ver seus próprios registros de uso
CREATE POLICY "Users can view their own promotional coupon usage"
  ON promotional_coupon_usage
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Apenas service_role pode inserir (via Edge Functions)
CREATE POLICY "Service role can insert promotional coupon usage"
  ON promotional_coupon_usage
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Apenas service_role pode atualizar
CREATE POLICY "Service role can update promotional coupon usage"
  ON promotional_coupon_usage
  FOR UPDATE
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Admins podem ver todos os registros
CREATE POLICY "Admins can view all promotional coupon usage"
  ON promotional_coupon_usage
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.user_id = auth.uid()
      AND user_profiles.role = 'admin'
    )
  );

-- Comentários para documentação
COMMENT ON TABLE promotional_coupon_usage IS 'Registra quando cupons promocionais (como BLACK) foram usados em pagamentos - usado para analytics, relatórios e controle financeiro';
COMMENT ON COLUMN promotional_coupon_usage.user_id IS 'ID do usuário que usou o cupom';
COMMENT ON COLUMN promotional_coupon_usage.coupon_code IS 'Código do cupom usado (ex: BLACK)';
COMMENT ON COLUMN promotional_coupon_usage.coupon_id IS 'ID do cupom na tabela promotional_coupons (se existir)';
COMMENT ON COLUMN promotional_coupon_usage.fee_type IS 'Tipo de taxa que foi paga com o cupom';
COMMENT ON COLUMN promotional_coupon_usage.payment_id IS 'ID do pagamento (session_id do Stripe, zelle_payment_id, etc)';
COMMENT ON COLUMN promotional_coupon_usage.payment_method IS 'Método de pagamento usado (stripe, zelle, pix)';
COMMENT ON COLUMN promotional_coupon_usage.original_amount IS 'Valor original antes do desconto';
COMMENT ON COLUMN promotional_coupon_usage.discount_amount IS 'Valor do desconto aplicado';
COMMENT ON COLUMN promotional_coupon_usage.final_amount IS 'Valor final pago após desconto';
COMMENT ON COLUMN promotional_coupon_usage.used_at IS 'Quando o cupom foi usado no pagamento';

-- Função para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_promotional_coupon_usage_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar updated_at
CREATE TRIGGER update_promotional_coupon_usage_updated_at
  BEFORE UPDATE ON promotional_coupon_usage
  FOR EACH ROW
  EXECUTE FUNCTION update_promotional_coupon_usage_updated_at();













