-- When any translation order in a Zelle batch is approved (payment_status → 'paid'),
-- automatically mark all other orders sharing the same payment_reference as paid.
-- This means the admin only needs to approve one Zelle proof to unblock the full batch.

CREATE OR REPLACE FUNCTION mark_batch_zelle_translation_orders_paid()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.payment_status = 'paid'
     AND (OLD.payment_status IS DISTINCT FROM 'paid')
     AND NEW.payment_reference IS NOT NULL
     AND NEW.payment_method = 'zelle' THEN

    UPDATE translation_orders
    SET
      payment_status = 'paid',
      paid_at        = NOW()
    WHERE payment_reference = NEW.payment_reference
      AND id            != NEW.id
      AND payment_status != 'paid';

  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_translation_zelle_batch_paid ON translation_orders;

CREATE TRIGGER on_translation_zelle_batch_paid
  AFTER UPDATE ON translation_orders
  FOR EACH ROW
  EXECUTE FUNCTION mark_batch_zelle_translation_orders_paid();
