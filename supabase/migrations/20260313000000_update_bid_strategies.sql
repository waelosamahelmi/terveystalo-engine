-- Update bid strategies to match actual BidTheatre specifications
-- DISPLAY: 6 strategies (was 4) with correct names, RTB sitelists, and CPMs
-- PDOOH: 6 strategies with correct publisher names, CPMs; add MEKS, remove "Suun TT - vertical screens"

BEGIN;

-- Clear existing strategies
DELETE FROM bidtheatre_bid_strategies;

-- DISPLAY strategies (6 total: 1P/2P × Mobile/Desktop Large/Desktop Small)
INSERT INTO bidtheatre_bid_strategies (name, channel, rtb_sitelist, adgroup_name, max_cpm, target_share, paused) VALUES
  ('1P Mobile sizes',        'DISPLAY', 156790, 'Mobile sizes',  7.80, 100, false),
  ('1P Desktop Large sizes', 'DISPLAY', 156788, 'Desktop sizes', 8.70, 100, false),
  ('1P Desktop Small sizes', 'DISPLAY', 156789, 'Desktop sizes', 7.40, 100, false),
  ('2P Mobile sizes',        'DISPLAY', 158518, 'Mobile sizes',  8.05, 100, false),
  ('2P Desktop Large sizes', 'DISPLAY', 158516, 'Desktop sizes', 11.30, 100, false),
  ('2P Desktop Small sizes', 'DISPLAY', 158517, 'Desktop sizes', 8.70, 100, false);

-- PDOOH strategies (6 total: one per publisher)
INSERT INTO bidtheatre_bid_strategies (name, channel, rtb_sitelist, adgroup_name, max_cpm, target_share, paused) VALUES
  ('Bauer Media Outdoor', 'PDOOH', 222725, 'Default campaign', 4.50, 100, false),
  ('JCDecaux',            'PDOOH', 161078, 'Default campaign', 2.60, 100, false),
  ('Mediateko',           'PDOOH', 161076, 'Default campaign', 2.60, 100, false),
  ('MEKS',                'PDOOH', NULL,   'Default campaign', 2.00, 100, false),
  ('Outshine',            'PDOOH', 161075, '2160x3840',        1.50, 100, false),
  ('Ocean Outdoor',       'PDOOH', 206737, 'Default campaign', 2.00, 100, false);

COMMIT;
