-- ============================================================================
-- ADD YLEINEN BRÄNDIVIESTI SERVICE OPTION
-- Version: 1.0.0
-- Date: 2026-02-23
-- Description: Add "Yleinen brändiviesti" (General Brand Message) as a service option
-- ============================================================================

-- Insert the new service option
INSERT INTO services (code, name_fi, name_en, description_fi, default_offer_fi, default_price, icon, color, sort_order, active)
VALUES (
  'yleinen-brandiviesti',
  'Yleinen brändiviesti',
  'General Brand Message',
  'Yleinen brändiviesti ilman eritystä tarjoushintaa. Keskittyy brändin tunnettuuteen ja viestillevämmiseen.',
  NULL,
  NULL,
  'megaphone',
  '#6B7280',
  0,
  true
)
ON CONFLICT (code) DO UPDATE SET
  name_fi = EXCLUDED.name_fi,
  name_en = EXCLUDED.name_en,
  description_fi = EXCLUDED.description_fi,
  default_offer_fi = EXCLUDED.default_offer_fi,
  default_price = EXCLUDED.default_price,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  sort_order = EXCLUDED.sort_order,
  active = EXCLUDED.active,
  updated_at = NOW();
