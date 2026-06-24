-- Corrige constraint de payment_method para usar os métodos de pagamento
-- já existentes no Matricula USA (Stripe, Zelle, Parcelow) no lugar de PayPal.

ALTER TABLE public.translation_orders
  DROP CONSTRAINT IF EXISTS translation_orders_payment_method_check;

ALTER TABLE public.translation_orders
  ADD CONSTRAINT translation_orders_payment_method_check
    CHECK (payment_method IN ('pending', 'stripe', 'zelle', 'parcelow', 'manual'));
