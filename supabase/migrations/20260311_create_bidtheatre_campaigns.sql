-- BidTheatre campaigns table: tracks one BT campaign per branch per channel
CREATE TABLE IF NOT EXISTS bidtheatre_campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES dental_campaigns(id) ON DELETE CASCADE,
  branch_id UUID NOT NULL REFERENCES branches(id) ON DELETE CASCADE,
  channel TEXT NOT NULL CHECK (channel IN ('DISPLAY', 'PDOOH')),
  
  -- BidTheatre IDs
  bt_campaign_id INTEGER NOT NULL,
  bt_advertiser_id INTEGER,
  
  -- Geo targeting
  geo_target_id INTEGER,
  geo_target_coordinates_id INTEGER,
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  radius INTEGER, -- in meters
  
  -- Ad structure (JSON maps of group/ad IDs)
  ad_group_ids JSONB DEFAULT '{}'::jsonb,
  ad_ids JSONB DEFAULT '{}'::jsonb,
  bid_strategy_ids JSONB DEFAULT '[]'::jsonb,
  
  -- Cycle/budget
  cycle_id INTEGER,
  budget NUMERIC(10,2),
  is_ongoing BOOLEAN DEFAULT FALSE,
  
  -- Status tracking
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paused', 'completed', 'failed')),
  paused_at TIMESTAMPTZ,
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  
  -- One BT campaign per branch per channel per campaign
  UNIQUE (campaign_id, branch_id, channel)
);

-- Index for fast lookups
CREATE INDEX IF NOT EXISTS idx_bt_campaigns_campaign_id ON bidtheatre_campaigns(campaign_id);
CREATE INDEX IF NOT EXISTS idx_bt_campaigns_branch_id ON bidtheatre_campaigns(branch_id);
CREATE INDEX IF NOT EXISTS idx_bt_campaigns_bt_campaign_id ON bidtheatre_campaigns(bt_campaign_id);
CREATE INDEX IF NOT EXISTS idx_bt_campaigns_status ON bidtheatre_campaigns(status);

-- Enable RLS
ALTER TABLE bidtheatre_campaigns ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read
CREATE POLICY "Allow authenticated read" ON bidtheatre_campaigns
  FOR SELECT TO authenticated USING (true);

-- Allow service role full access
CREATE POLICY "Allow service role all" ON bidtheatre_campaigns
  FOR ALL TO service_role USING (true) WITH CHECK (true);
