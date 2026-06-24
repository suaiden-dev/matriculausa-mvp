ALTER TABLE translation_orders
  ADD COLUMN IF NOT EXISTS certified_files_storage JSONB;
