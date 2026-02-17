-- Migration: Add target_url and audio_url to dental_campaigns, fix creative_templates categories
-- Run this in Supabase SQL Editor if not already applied

-- 1. Add target_url column (uses existing landing_url column if available, otherwise add new)
-- Note: landing_url already exists in the table, so we use that instead.
-- This migration adds audio_url for future audio creative support.

ALTER TABLE dental_campaigns ADD COLUMN IF NOT EXISTS audio_url text;

-- 2. Update 980x400 template category from PDOOH to Display
UPDATE creative_templates SET category = 'Display' WHERE width = 980 AND height = 400 AND category = 'PDOOH';

-- 3. Insert total_monthly_budget setting (if not exists)
INSERT INTO app_settings (key, value, description, category)
VALUES ('total_monthly_budget', '50000', 'Total monthly budget across all branches (€)', 'campaigns')
ON CONFLICT (key) DO NOTHING;
