-- Migration: Create EB-3 payments table
-- Description: Tabela para armazenar pagamentos de pré-candidatura EB-3

CREATE TABLE IF NOT EXISTS public.eb3_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id TEXT NOT NULL UNIQUE,
  payment_intent_id TEXT,
  amount INTEGER NOT NULL,
  currency TEXT DEFAULT 'usd',
  status TEXT NOT NULL DEFAULT 'pending',
  customer_email TEXT,
  customer_name TEXT,
  customer_phone TEXT,
  user_id UUID REFERENCES auth.users(id),
  user_profile_id UUID REFERENCES public.user_profiles(id),
  stripe_customer_id TEXT,
  payment_method TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_eb3_payments_session_id ON public.eb3_payments(session_id);
CREATE INDEX IF NOT EXISTS idx_eb3_payments_payment_intent_id ON public.eb3_payments(payment_intent_id);
CREATE INDEX IF NOT EXISTS idx_eb3_payments_user_id ON public.eb3_payments(user_id);
CREATE INDEX IF NOT EXISTS idx_eb3_payments_status ON public.eb3_payments(status);
CREATE INDEX IF NOT EXISTS idx_eb3_payments_created_at ON public.eb3_payments(created_at);

-- RLS (Row Level Security)
ALTER TABLE public.eb3_payments ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "Users can view their own EB-3 payments"
  ON public.eb3_payments
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own EB-3 payments"
  ON public.eb3_payments
  FOR INSERT
  WITH CHECK (auth.uid() = user_id OR user_id IS NULL);

CREATE POLICY "Admins can view all EB-3 payments"
  ON public.eb3_payments
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

CREATE POLICY "Admins can manage all EB-3 payments"
  ON public.eb3_payments
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.user_profiles 
      WHERE user_id = auth.uid() 
      AND role IN ('admin', 'super_admin')
    )
  );

-- Trigger para updated_at
CREATE OR REPLACE FUNCTION update_eb3_payments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_eb3_payments_updated_at
  BEFORE UPDATE ON public.eb3_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_eb3_payments_updated_at();

-- Comentários
COMMENT ON TABLE public.eb3_payments IS 'Pagamentos de pré-candidatura EB-3 via Stripe';
COMMENT ON COLUMN public.eb3_payments.session_id IS 'ID da sessão de checkout do Stripe';
COMMENT ON COLUMN public.eb3_payments.payment_intent_id IS 'ID do payment intent do Stripe';
COMMENT ON COLUMN public.eb3_payments.amount IS 'Valor em centavos (ex: 47700 = $477.00)';
COMMENT ON COLUMN public.eb3_payments.status IS 'Status do pagamento: pending, paid, failed, cancelled';
COMMENT ON COLUMN public.eb3_payments.metadata IS 'Metadados adicionais do Stripe';
