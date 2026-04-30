-- Add filled transfer form fields to migma_packages
ALTER TABLE public.migma_packages
  ADD COLUMN IF NOT EXISTS transfer_form_filled_url TEXT,
  ADD COLUMN IF NOT EXISTS transfer_form_status TEXT DEFAULT 'pending';
-- transfer_form_status: 'pending' | 'submitted'
