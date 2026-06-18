-- Migration: Add paid_at and certified_file_url to translation_orders table
ALTER TABLE public.translation_orders
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS certified_file_url TEXT DEFAULT NULL;
