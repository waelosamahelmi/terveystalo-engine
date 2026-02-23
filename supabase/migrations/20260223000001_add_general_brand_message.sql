-- ============================================================================
-- ADD GENERAL BRAND MESSAGE FIELD TO DENTAL_CAMPAIGNS
-- Version: 1.0.0
-- Date: 2026-02-23
-- Description: Add general_brand_message field for storing the general brand message
-- ============================================================================

-- Add general_brand_message column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'dental_campaigns' AND column_name = 'general_brand_message'
    ) THEN
        ALTER TABLE dental_campaigns ADD COLUMN general_brand_message TEXT;
    END IF;
END $$;

-- Add comment
COMMENT ON COLUMN dental_campaigns.general_brand_message IS 'General brand message shown in ads alongside service selection';
