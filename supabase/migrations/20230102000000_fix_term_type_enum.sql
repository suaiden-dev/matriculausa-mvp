-- Migration: Fix term_type enum values
-- Adds missing values to term_type enum that were not included in the initial baseline

ALTER TYPE term_type ADD VALUE IF NOT EXISTS 'terms_of_service';
ALTER TYPE term_type ADD VALUE IF NOT EXISTS 'privacy_policy';
ALTER TYPE term_type ADD VALUE IF NOT EXISTS 'checkout_terms';
ALTER TYPE term_type ADD VALUE IF NOT EXISTS 'application';
ALTER TYPE term_type ADD VALUE IF NOT EXISTS 'affiliate';
ALTER TYPE term_type ADD VALUE IF NOT EXISTS 'general';
