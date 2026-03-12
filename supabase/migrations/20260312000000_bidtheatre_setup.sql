-- Add branch_radius_settings JSONB to dental_campaigns for per-branch geo radius
-- Add bt_geo_target_id to branches for reusable BidTheatre geo-targets

ALTER TABLE dental_campaigns
ADD COLUMN IF NOT EXISTS branch_radius_settings JSONB DEFAULT NULL;

COMMENT ON COLUMN dental_campaigns.branch_radius_settings IS 'Per-branch radius settings: { branchId: { radius: number (km), enabled: boolean } }';

ALTER TABLE branches
ADD COLUMN IF NOT EXISTS bt_geo_target_id INTEGER DEFAULT NULL;

COMMENT ON COLUMN branches.bt_geo_target_id IS 'Reusable BidTheatre geo-target ID for this branch';

-- Seed default bid strategy templates for Suun Terveystalo
-- DISPLAY: 1P + 2P for Desktop sizes and Mobile sizes (always both active)
-- PDOOH: Per-publisher media lists

INSERT INTO bidtheatre_bid_strategies (name, channel, rtb_sitelist, adgroup_name, max_cpm, target_share, filter_target, paused)
VALUES
  -- DISPLAY 1P & 2P Desktop sizes (300x600, 620x891, 980x400)
  ('1P All Display Desktop Large', 'DISPLAY', 156788, 'Desktop sizes', 6.00, 100, NULL, false),
  ('2P All Display Desktop Large', 'DISPLAY', 158516, 'Desktop sizes', 6.00, 100, NULL, false),
  -- DISPLAY 1P & 2P Mobile sizes (300x300, 300x431, 300x600)
  ('1P All Display Mobile', 'DISPLAY', 156790, 'Mobile sizes', 6.00, 100, NULL, false),
  ('2P All Display Mobile', 'DISPLAY', 158518, 'Mobile sizes', 6.00, 100, NULL, false),
  -- PDOOH publishers — Outshine uses 2160x3840 ad group
  ('Outshine (2 x SSP)', 'PDOOH', 161075, '2160x3840', 3.00, 100, NULL, false),
  -- PDOOH publishers — Default 1080x1920 ad group
  ('JCDecaux 1080x1920', 'PDOOH', 161078, 'Default campaign', 5.00, 100, NULL, false),
  ('Mediateko All screens', 'PDOOH', 161076, 'Default campaign', 2.00, 100, NULL, false),
  ('Ocean Outdoor', 'PDOOH', 206737, 'Default campaign', 5.00, 100, NULL, false),
  ('Bauer Media Outdoor 2026', 'PDOOH', 222725, 'Default campaign', 3.00, 100, NULL, false),
  ('Suun TT - vertical screens', 'PDOOH', 222636, 'Default campaign', 3.00, 100, NULL, false)
ON CONFLICT DO NOTHING;
