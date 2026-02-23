-- ============================================================================
-- ADD CAMPAIGN OBJECTIVE FIELD TO DENTAL_CAMPAIGNS
-- Version: 1.0.0
-- Date: 2026-02-23
-- Description: Add campaign_objective field for storing campaign objective (traffic/reach)
-- ============================================================================

-- Add campaign_objective column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'dental_campaigns' AND column_name = 'campaign_objective'
    ) THEN
        ALTER TABLE dental_campaigns ADD COLUMN campaign_objective TEXT CHECK (campaign_objective IN ('traffic', 'reach'));
    END IF;
END $$;

-- Set default value to 'traffic' for existing campaigns
UPDATE dental_campaigns
SET campaign_objective = 'traffic'
WHERE campaign_objective IS NULL;

-- Add comment
COMMENT ON COLUMN dental_campaigns.campaign_objective IS 'Campaign objective: traffic (Liikenne) or reach (tavoittavuus)';
