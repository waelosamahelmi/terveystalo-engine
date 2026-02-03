-- ============================================================================
-- Fix missing columns in existing tables
-- Run this in Supabase SQL Editor
-- ============================================================================

-- Check existing ai_insights columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'ai_insights' AND table_schema = 'public';

-- Add dismissed column to ai_insights if missing
ALTER TABLE public.ai_insights ADD COLUMN IF NOT EXISTS dismissed BOOLEAN DEFAULT false;

-- Check existing dental_campaigns columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'dental_campaigns' AND table_schema = 'public';

-- Add missing columns to dental_campaigns
ALTER TABLE public.dental_campaigns ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.dental_campaigns ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE public.dental_campaigns ADD COLUMN IF NOT EXISTS total_budget DECIMAL(10, 2);
ALTER TABLE public.dental_campaigns ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.dental_campaigns ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.dental_campaigns ADD COLUMN IF NOT EXISTS service_id UUID;
ALTER TABLE public.dental_campaigns ADD COLUMN IF NOT EXISTS branch_id UUID;

-- Check services columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'services' AND table_schema = 'public';

-- Add missing columns to services
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.services ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Check branches columns
SELECT column_name FROM information_schema.columns 
WHERE table_name = 'branches' AND table_schema = 'public';

-- Add missing columns to branches
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE public.branches ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

-- Done
SELECT 'Columns added!' AS status;
