-- ============================================================================
-- Fix campaign_analytics for proper per-branch tracking
-- Old rows were aggregated across branches with NULL branch_id.
-- Now we write per-branch rows with actual branch_id from bidtheatre_campaigns.
-- ============================================================================

-- Delete old aggregated rows (sync will repopulate with per-branch data)
DELETE FROM public.campaign_analytics WHERE branch_id IS NULL;

-- Make branch_id NOT NULL going forward
ALTER TABLE public.campaign_analytics ALTER COLUMN branch_id SET NOT NULL;

-- Drop the COALESCE-based expression index (can't be used by standard ON CONFLICT)
DROP INDEX IF EXISTS campaign_analytics_campaign_branch_date_channel_key;

-- Drop any leftover old constraint
ALTER TABLE public.campaign_analytics 
    DROP CONSTRAINT IF EXISTS campaign_analytics_campaign_id_date_channel_key;

-- Create proper unique constraint for upsert
ALTER TABLE public.campaign_analytics 
    ADD CONSTRAINT campaign_analytics_campaign_branch_date_channel_key 
    UNIQUE (campaign_id, branch_id, date, channel);
