-- ============================================================================
-- Suun Terveystalo: Fix campaign_analytics table
-- Adds missing geo_region column that analyticsService expects
-- Also adds aggregated columns to dental_campaigns
-- ============================================================================

-- Add geo_region column if missing
ALTER TABLE public.campaign_analytics 
    ADD COLUMN IF NOT EXISTS geo_region TEXT;

-- Add aggregated metrics columns to dental_campaigns if missing
ALTER TABLE public.dental_campaigns
    ADD COLUMN IF NOT EXISTS total_impressions BIGINT DEFAULT 0;
ALTER TABLE public.dental_campaigns
    ADD COLUMN IF NOT EXISTS total_clicks BIGINT DEFAULT 0;

-- Also create the table if it doesn't exist (with all needed columns)
CREATE TABLE IF NOT EXISTS public.campaign_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    campaign_id UUID REFERENCES public.dental_campaigns(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    channel TEXT,
    impressions BIGINT DEFAULT 0,
    clicks BIGINT DEFAULT 0,
    conversions INTEGER DEFAULT 0,
    spend DECIMAL(10,2) DEFAULT 0,
    geo_region TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.campaign_analytics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Analytics viewable by authenticated" ON public.campaign_analytics;
CREATE POLICY "Analytics viewable by authenticated" ON public.campaign_analytics 
    FOR SELECT USING (auth.uid() IS NOT NULL);

-- Create index for geo_region queries
CREATE INDEX IF NOT EXISTS idx_campaign_analytics_geo_region 
    ON public.campaign_analytics(geo_region);

-- Grant permissions
GRANT ALL ON public.campaign_analytics TO authenticated;
GRANT ALL ON public.campaign_analytics TO service_role;

SELECT 'campaign_analytics fixed!' AS status;
