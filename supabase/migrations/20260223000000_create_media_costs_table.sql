-- Create media_costs table to store campaign performance statistics
CREATE TABLE IF NOT EXISTS public.media_costs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.dental_campaigns(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL,
  is_monthly_snapshot BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Budget information
  budget_meta NUMERIC DEFAULT 0,
  budget_display NUMERIC DEFAULT 0,
  budget_pdooh NUMERIC DEFAULT 0,

  -- Display channel stats
  impressions_display INTEGER DEFAULT 0,
  clicks_display INTEGER DEFAULT 0,
  cost_display NUMERIC DEFAULT 0,
  revenue_display NUMERIC DEFAULT 0,
  ctr_display NUMERIC,
  active_impressions_display INTEGER DEFAULT 0,
  viewable_impressions_display INTEGER DEFAULT 0,
  viewable_rate_display NUMERIC DEFAULT 0,
  engagement_rate_display NUMERIC,

  -- PDOOH channel stats
  impressions_pdooh INTEGER DEFAULT 0,
  clicks_pdooh INTEGER DEFAULT 0,
  cost_pdooh NUMERIC DEFAULT 0,
  revenue_pdooh NUMERIC DEFAULT 0,
  ctr_pdooh NUMERIC,
  active_impressions_pdooh INTEGER DEFAULT 0,
  viewable_impressions_pdooh INTEGER DEFAULT 0,
  viewable_rate_pdooh NUMERIC DEFAULT 0,
  engagement_rate_pdooh NUMERIC,

  -- JSONB columns for detailed stats
  device_stats_display JSONB DEFAULT '[]'::jsonb,
  audience_stats_display JSONB DEFAULT '[]'::jsonb,
  geo_stats_display JSONB DEFAULT '[]'::jsonb,
  geo_city_stats_display JSONB DEFAULT '[]'::jsonb,
  site_stats_display JSONB DEFAULT '[]'::jsonb,
  hotspot_stats_display JSONB DEFAULT '[]'::jsonb,
  daily_stats_display JSONB DEFAULT '[]'::jsonb,

  device_stats_pdooh JSONB DEFAULT '[]'::jsonb,
  audience_stats_pdooh JSONB DEFAULT '[]'::jsonb,
  geo_stats_pdooh JSONB DEFAULT '[]'::jsonb,
  geo_city_stats_pdooh JSONB DEFAULT '[]'::jsonb,
  site_stats_pdooh JSONB DEFAULT '[]'::jsonb,
  hotspot_stats_pdooh JSONB DEFAULT '[]'::jsonb,
  daily_stats_pdooh JSONB DEFAULT '[]'::jsonb,

  -- Unique constraint to prevent duplicates
  CONSTRAINT media_costs_unique UNIQUE (campaign_id, year, month, is_monthly_snapshot)
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_media_costs_campaign_id ON public.media_costs(campaign_id);
CREATE INDEX IF NOT EXISTS idx_media_costs_year_month ON public.media_costs(year, month);
CREATE INDEX IF NOT EXISTS idx_media_costs_created_at ON public.media_costs(created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.media_costs ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Allow authenticated users to read media costs for campaigns they have access to
DROP POLICY IF EXISTS "Allow authenticated read access" ON public.media_costs;
CREATE POLICY "Allow authenticated read access"
  ON public.media_costs
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1
      FROM public.dental_campaigns
      WHERE dental_campaigns.id = media_costs.campaign_id
      AND (
        dental_campaigns.created_by = auth.uid()
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role IN ('admin', 'manager'))
        OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND branch_id = dental_campaigns.branch_id)
      )
    )
  );

-- Allow service role to insert/update media costs (for background functions)
DROP POLICY IF EXISTS "Allow service role full access" ON public.media_costs;
CREATE POLICY "Allow service role full access"
  ON public.media_costs
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Add helpful comment
COMMENT ON TABLE public.media_costs IS 'Stores monthly campaign performance statistics from BidTheatre API';
COMMENT ON COLUMN public.media_costs.is_monthly_snapshot IS 'Indicates if this is a monthly snapshot (true) or real-time data (false)';
