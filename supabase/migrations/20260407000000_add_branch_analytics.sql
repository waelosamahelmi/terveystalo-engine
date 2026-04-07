-- ============================================================================
-- Add branch_id to campaign_analytics for per-branch filtering
-- ============================================================================

-- Add branch_id column
ALTER TABLE public.campaign_analytics 
    ADD COLUMN IF NOT EXISTS branch_id UUID;

-- Index for branch queries
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_branch 
    ON public.campaign_analytics(branch_id);

-- Drop old unique constraint and recreate with branch_id
-- Old: (campaign_id, date, channel)
-- New: (campaign_id, branch_id, date, channel) to allow per-branch rows
ALTER TABLE public.campaign_analytics 
    DROP CONSTRAINT IF EXISTS campaign_analytics_campaign_id_date_channel_key;

-- Create new unique constraint (branch_id can be NULL for aggregated rows)
CREATE UNIQUE INDEX IF NOT EXISTS campaign_analytics_campaign_branch_date_channel_key 
    ON public.campaign_analytics(campaign_id, COALESCE(branch_id, '00000000-0000-0000-0000-000000000000'::uuid), date, channel);
