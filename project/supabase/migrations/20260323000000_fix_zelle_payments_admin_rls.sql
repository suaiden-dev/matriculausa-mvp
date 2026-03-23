-- Alterar a política "Admins can manage all Zelle payments" para usar a função de admin unificada e adicionar WITH CHECK para inserção
DO $$ 
BEGIN
    DROP POLICY IF EXISTS "Admins can manage all Zelle payments" ON zelle_payments;
EXCEPTION
    WHEN undefined_object THEN null;
END $$;

CREATE POLICY "Admins can manage all Zelle payments"
  ON zelle_payments
  FOR ALL
  TO authenticated
  USING (
    is_admin()
  )
  WITH CHECK (
    is_admin()
  );

-- Remover o check constraint de fee_type que impedia outras taxas (como placement_fee, ds160_package, etc)
ALTER TABLE zelle_payments DROP CONSTRAINT IF EXISTS zelle_payments_fee_type_check;

-- Atualizar a função create_zelle_payment para também não bloquear as novas taxas
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
  
  -- Inserir pagamento (sem restrição extrema de fee_type)
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
