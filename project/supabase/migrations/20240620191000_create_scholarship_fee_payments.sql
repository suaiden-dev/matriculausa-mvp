-- Tabela para registrar pagamentos de scholarship fee e bolsas associadas
CREATE TABLE IF NOT EXISTS scholarship_fee_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  scholarships_ids text NOT NULL, -- IDs das bolsas separados por vírgula
  payment_intent_id text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scholarship_fee_payments_user_id ON scholarship_fee_payments(user_id); 