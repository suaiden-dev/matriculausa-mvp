-- Migration: Add flexible commission rules to affiliate_admins
ALTER TABLE affiliate_admins 
ADD COLUMN commission_rules JSONB DEFAULT '{
  "selection_process": { "type": "percentage", "value": 10 },
  "scholarship": { "type": "percentage", "value": 10 },
  "i20_control": { "type": "percentage", "value": 10 },
  "application": { "type": "percentage", "value": 10 }
}'::jsonb;

-- Migrate existing commission_per_sale to the new JSONB structure if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'affiliate_admins' AND column_name = 'commission_per_sale') THEN
    UPDATE affiliate_admins
    SET commission_rules = jsonb_build_object(
      'selection_process', jsonb_build_object('type', 'fixed', 'value', COALESCE(commission_per_sale, 0)),
      'scholarship', jsonb_build_object('type', 'fixed', 'value', COALESCE(commission_per_sale, 0)),
      'i20_control', jsonb_build_object('type', 'fixed', 'value', COALESCE(commission_per_sale, 0)),
      'application', jsonb_build_object('type', 'fixed', 'value', COALESCE(commission_per_sale, 0))
    )
    WHERE commission_per_sale IS NOT NULL;
  END IF;
END $$;

COMMENT ON COLUMN affiliate_admins.commission_rules IS 'Flexible commission configuration per fee type. Format: { "fee_type": { "type": "fixed"|"percentage", "value": number } }';
