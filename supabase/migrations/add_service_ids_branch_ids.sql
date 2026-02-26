-- Add array columns for multi-select services and branches
ALTER TABLE dental_campaigns ADD COLUMN IF NOT EXISTS service_ids jsonb DEFAULT '[]'::jsonb;
ALTER TABLE dental_campaigns ADD COLUMN IF NOT EXISTS branch_ids jsonb DEFAULT '[]'::jsonb;

-- Backfill from existing single-value columns
UPDATE dental_campaigns SET service_ids = jsonb_build_array(service_id) WHERE service_id IS NOT NULL AND (service_ids IS NULL OR service_ids = '[]'::jsonb);
UPDATE dental_campaigns SET branch_ids = jsonb_build_array(branch_id) WHERE branch_id IS NOT NULL AND (branch_ids IS NULL OR branch_ids = '[]'::jsonb);

-- Index for array queries
CREATE INDEX IF NOT EXISTS idx_dental_campaigns_service_ids ON dental_campaigns USING gin(service_ids);
CREATE INDEX IF NOT EXISTS idx_dental_campaigns_branch_ids ON dental_campaigns USING gin(branch_ids);
