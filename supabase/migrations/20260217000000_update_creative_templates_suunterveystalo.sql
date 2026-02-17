-- ============================================================================
-- SUUN TERVEYSTALO - UPDATE CREATIVE TEMPLATES
-- Version: 1.2.0
-- Date: 2026-02-17
-- Description:
--   1. Remove rotation from price bubbles (keep artwork rotation)
--   2. Add disclaimer text to PDOOH templates only (980x400, 1080x1920)
--   3. Update templates with proper TerveystaloSans font references
--   4. Add category field for grouping (Display, PDOOH, Meta)
-- ============================================================================

-- ============================================================================
-- FIRST: Add category column if it doesn't exist
-- ============================================================================
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'creative_templates' AND column_name = 'category'
    ) THEN
        ALTER TABLE creative_templates ADD COLUMN category VARCHAR(50);
    END IF;
END $$;

-- ============================================================================
-- UPDATE ALL TEMPLATES: Remove rotation from price bubble ONLY
-- The slideInFromLeft animation should NOT rotate the price bubble
-- The artwork can keep its -30deg rotation
-- ============================================================================

-- 1. UPDATE 300x300 Template - Remove price bubble rotation
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.price-bubble { position: absolute; z-index: 15; top: 125px; left: 12px; background-color: #ffffff; color: #004E9A; width: 85px; height: 85px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 4px 12px rgba(0,0,0,0.3); transform: rotate(-3deg);',
'.price-bubble { position: absolute; z-index: 15; top: 125px; left: 12px; background-color: #ffffff; color: #004E9A; width: 85px; height: 85px; border-radius: 50%; display: flex; column; justify-content: center; align-items: center; box-shadow: 0px 4px 12px rgba(0,0,0,0.3);')
WHERE name = 'Suun Terveystalo 300x300';

UPDATE creative_templates
SET html_template = REPLACE(html_template,
'@keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-30px) rotate(-3deg); } to { opacity: 1; transform: translateX(0) rotate(-3deg); }',
'@keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); }')
WHERE name = 'Suun Terveystalo 300x300';

UPDATE creative_templates
SET category = 'Display'
WHERE name = 'Suun Terveystalo 300x300';

-- 2. UPDATE 300x431 Template - Remove price bubble rotation
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.price-bubble { position: absolute; z-index: 15; top: 185px; left: 12px; background-color: #ffffff; color: #004E9A; width: 100px; height: 100px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 4px 12px rgba(0,0,0,0.3); transform: rotate(-3deg);',
'.price-bubble { position: absolute; z-index: 15; top: 185px; left: 12px; background-color: #ffffff; color: #004E9A; width: 100px; height: 100px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 4px 12px rgba(0,0,0,0.3);')
WHERE name = 'Suun Terveystalo 300x431';

UPDATE creative_templates
SET html_template = REPLACE(html_template,
'@keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-40px) rotate(-3deg); } to { opacity: 1; transform: translateX(0) rotate(-3deg); }',
'@keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); }')
WHERE name = 'Suun Terveystalo 300x431';

UPDATE creative_templates
SET category = 'Display'
WHERE name = 'Suun Terveystalo 300x431';

-- 3. UPDATE 300x600 Template - Remove price bubble rotation
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.price-bubble { position: absolute; z-index: 15; top: 260px; left: 15px; background-color: #ffffff; color: #004E9A; width: 135px; height: 135px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 5px 15px rgba(0,0,0,0.3); transform: rotate(-3deg);',
'.price-bubble { position: absolute; z-index: 15; top: 260px; left: 15px; background-color: #ffffff; color: #004E9A; width: 135px; height: 135px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 5px 15px rgba(0,0,0,0.3);')
WHERE name = 'Suun Terveystalo 300x600';

UPDATE creative_templates
SET html_template = REPLACE(html_template,
'@keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-50px) rotate(-3deg); } to { opacity: 1; transform: translateX(0) rotate(-3deg); }',
'@keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-50px); } to { opacity: 1; transform: translateX(0); }')
WHERE name = 'Suun Terveystalo 300x600';

UPDATE creative_templates
SET category = 'Display'
WHERE name = 'Suun Terveystalo 300x600';

-- 4. UPDATE 620x891 Template - Remove price bubble rotation
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.price-bubble { position: absolute; z-index: 15; top: 385px; left: 25px; background-color: #ffffff; color: #004E9A; width: 200px; height: 200px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 8px 20px rgba(0,0,0,0.3); transform: rotate(-3deg);',
'.price-bubble { position: absolute; z-index: 15; top: 385px; left: 25px; background-color: #ffffff; color: #004E9A; width: 200px; height: 200px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 8px 20px rgba(0,0,0,0.3);')
WHERE name = 'Suun Terveystalo 620x891';

UPDATE creative_templates
SET html_template = REPLACE(html_template,
'@keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-60px) rotate(-3deg); } to { opacity: 1; transform: translateX(0) rotate(-3deg); }',
'@keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-60px); } to { opacity: 1; transform: translateX(0); }')
WHERE name = 'Suun Terveystalo 620x891';

UPDATE creative_templates
SET category = 'Display'
WHERE name = 'Suun Terveystalo 620x891';

-- 5. UPDATE 980x400 Template (PDOOH Horizontal) - Remove price bubble rotation + ADD DISCLAIMER
UPDATE creative_templates
SET html_template = REPLACE(REPLACE(html_template,
'.price-bubble { position: absolute; z-index: 15; top: 50%; left: 380px; transform: translateY(-50%) rotate(-3deg); background-color: #ffffff;',
'.price-bubble { position: absolute; z-index: 15; top: 50%; left: 380px; transform: translateY(-50%); background-color: #ffffff;'),
'.address { position: absolute; bottom: 10px; width: 100%; text-align: center; font-size: 12px; font-weight: 400; z-index: 11; color: #fff;',
'.address { position: absolute; bottom: 12px; width: 100%; text-align: center; font-size: 12px; font-weight: 400; z-index: 11; color: #fff;')
WHERE name = 'Suun Terveystalo 980x400';

-- Add disclaimer CSS and HTML to 980x400
UPDATE creative_templates
SET html_template = REPLACE(REPLACE(html_template,
'.address { position: absolute; bottom: 12px;',
'.address { position: absolute; bottom: 12px;'),
'</body>',
'        <div class="disclaimer">{{disclaimer_text}}</div>
    </div>
</body>
')
WHERE name = 'Suun Terveystalo 980x400';

-- Add disclaimer CSS
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.address { position: absolute; bottom: 12px; width: 100%; text-align: center; font-size: 12px; font-weight: 400; z-index: 11; color: #fff;',
'.address { position: absolute; bottom: 12px; width: 100%; text-align: center; font-size: 12px; font-weight: 400; z-index: 11; color: #fff; opacity: 0; animation: slideInFromBottom 0.5s ease-out 1s forwards; }
        .disclaimer { position: absolute; bottom: 5px; left: 0; right: 0; padding: 0 20px; text-align: center; font-size: 7px; font-weight: 400; line-height: 1.3; z-index: 11; color: rgba(255,255,255,0.7); opacity: 0; animation: fadeIn 0.5s ease-out 1.2s forwards;')
WHERE name = 'Suun Terveystalo 980x400';

-- Update placeholders to include disclaimer_text
UPDATE creative_templates
SET placeholders = COALESCE(placeholders, '[]'::jsonb) || '{"key": "disclaimer_text", "label": "Vastuuvapauslauseke", "type": "textarea", "required": false, "maxLength": 500}'::jsonb,
    default_values = jsonb_set(
        COALESCE(default_values, '{}'::jsonb),
        '{disclaimer_text}',
        '"Tarjous voimassa uusille asiakkaille tai jos edellisestä käynnistäsi on kulunut 3 vuotta. Tarjous koskee arkiaikoja, aika on varattava 22.2.2026 mennessä ja vastaanotolla on käytävä 31.3.2026 mennessä. Hinta sisältää Kela-korvauksen, käyntimaksun ja kanta-maksun. Kampanjan tarkat ehdot ja ohjeet kampanjasivulla terveystalo.com/suunterveystalo."'::jsonb
    )
WHERE name = 'Suun Terveystalo 980x400';

UPDATE creative_templates
SET category = 'PDOOH'
WHERE name = 'Suun Terveystalo 980x400';

-- 6. UPDATE 1080x1920 PDOOH Template - Remove price bubble rotation + ADD DISCLAIMER
UPDATE creative_templates
SET html_template = REPLACE(REPLACE(html_template,
'.price-bubble { position: absolute; z-index: 15; top: 820px; left: 50px; background-color: #ffffff; color: #004E9A; width: 340px; height: 340px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 12px 30px rgba(0,0,0,0.3); transform: rotate(-3deg);',
'.price-bubble { position: absolute; z-index: 15; top: 820px; left: 50px; background-color: #ffffff; color: #004E9A; width: 340px; height: 340px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 12px 30px rgba(0,0,0,0.3);'),
'.address { position: absolute; bottom: 70px;',
'.address { position: absolute; bottom: 100px;')
WHERE name = 'Suun Terveystalo 1080x1920 PDOOH';

-- Add disclaimer CSS and HTML to 1080x1920
UPDATE creative_templates
SET html_template = REPLACE(REPLACE(html_template,
'.address { position: absolute; bottom: 100px; width: 100%; text-align: center; font-size: 32px; font-weight: 400; z-index: 11; color: #fff;',
'.address { position: absolute; bottom: 100px; width: 100%; text-align: center; font-size: 32px; font-weight: 400; z-index: 11; color: #fff; opacity: 0; animation: slideInFromBottom 0.5s ease-out 1s forwards; }
        .disclaimer { position: absolute; bottom: 20px; left: 0; right: 0; padding: 0 40px; text-align: center; font-size: 16px; font-weight: 400; line-height: 1.3; z-index: 11; color: rgba(255,255,255,0.7); opacity: 0; animation: fadeIn 0.5s ease-out 1.2s forwards;'),
'</body>',
'        <div class="disclaimer">{{disclaimer_text}}</div>
    </div>
</body>
')
WHERE name = 'Suun Terveystalo 1080x1920 PDOOH';

-- Fix animation keyframe for 1080x1920
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'@keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-80px) rotate(-3deg); } to { opacity: 1; transform: translateX(0) rotate(-3deg); }',
'@keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-80px); } to { opacity: 1; transform: translateX(0); }')
WHERE name = 'Suun Terveystalo 1080x1920 PDOOH';

-- Update placeholders to include disclaimer_text
UPDATE creative_templates
SET placeholders = COALESCE(placeholders, '[]'::jsonb) || '{"key": "disclaimer_text", "label": "Vastuuvapauslauseke", "type": "textarea", "required": false, "maxLength": 500}'::jsonb,
    default_values = jsonb_set(
        COALESCE(default_values, '{}'::jsonb),
        '{disclaimer_text}',
        '"Tarjous voimassa uusille asiakkaille tai jos edellisestä käynnistäsi on kulunut 3 vuotta. Tarjous koskee arkiaikoja, aika on varattava 22.2.2026 mennessä ja vastaanotolla on käytävä 31.3.2026 mennessä. Hinta sisältää Kela-korvauksen, käyntimaksun ja kanta-maksun. Kampanjan tarkat ehdot ja ohjeet kampanjasivulla terveystalo.com/suunterveystalo."'::jsonb
    )
WHERE name = 'Suun Terveystalo 1080x1920 PDOOH';

UPDATE creative_templates
SET category = 'PDOOH'
WHERE name = 'Suun Terveystalo 1080x1920 PDOOH';

-- ============================================================================
-- INSERT META TEMPLATES (under development)
-- ============================================================================

-- Meta 1080x1080 (Instagram Feed) - Under Development
INSERT INTO creative_templates (
    name,
    description,
    type,
    size,
    width,
    height,
    html_template,
    placeholders,
    default_values,
    tags,
    active,
    sort_order,
    category
) VALUES (
    'Suun Terveystalo 1080x1080 Meta',
    'Instagram Feed - Under Development',
    'meta',
    '1080x1080',
    1080,
    1080,
    '<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1080,height=1080">
    <title>1080x1080 Meta - Suun Terveystalo</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #333; font-family: "TerveystaloSans", sans-serif; }
        .ad-container { width: 1080px; height: 1080px; background: linear-gradient(135deg, #00A5B5 0%, #1B365D 100%); position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #ffffff; text-align: center; }
        .under-development { font-size: 48px; font-weight: 700; color: #ffffff; padding: 40px; }
        .logo { position: absolute; bottom: 40px; opacity: 0.5; }
    </style>
</head>
<body>
    <div class="ad-container">
        <div class="under-development">Kehityksessä<br>Coming Soon</div>
    </div>
</body>
</html>',
    '[]'::jsonb,
    '{}'::jsonb,
    ARRAY['meta', 'instagram', 'under-development'],
    false,
    100,
    'Meta'
);

-- Meta 1080x1920 (Instagram Stories/Reels) - Under Development
INSERT INTO creative_templates (
    name,
    description,
    type,
    size,
    width,
    height,
    html_template,
    placeholders,
    default_values,
    tags,
    active,
    sort_order,
    category
) VALUES (
    'Suun Terveystalo 1080x1920 Meta',
    'Instagram Stories/Reels - Under Development',
    'meta',
    '1080x1920',
    1080,
    1920,
    '<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1080,height=1920">
    <title>1080x1920 Meta - Suun Terveystalo</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #333; font-family: "TerveystaloSans", sans-serif; }
        .ad-container { width: 1080px; height: 1920px; background: linear-gradient(135deg, #00A5B5 0%, #1B365D 100%); position: relative; overflow: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; color: #ffffff; text-align: center; }
        .under-development { font-size: 64px; font-weight: 700; color: #ffffff; padding: 60px; }
        .logo { position: absolute; bottom: 60px; opacity: 0.5; }
    </style>
</head>
<body>
    <div class="ad-container">
        <div class="under-development">Kehityksessä<br>Coming Soon</div>
    </div>
</body>
</html>',
    '[]'::jsonb,
    '{}'::jsonb,
    ARRAY['meta', 'instagram-stories', 'reels', 'under-development'],
    false,
    101,
    'Meta'
);

-- ============================================================================
-- UPDATE VIEW FOR TEMPLATE SUMMARY TO INCLUDE CATEGORY
-- ============================================================================
DROP VIEW IF EXISTS creative_templates_summary;
CREATE VIEW creative_templates_summary AS
SELECT
    id,
    name,
    type,
    size,
    width,
    height,
    description,
    tags,
    active,
    sort_order,
    category,
    created_at,
    updated_at
FROM creative_templates
ORDER BY sort_order;

GRANT SELECT ON creative_templates_summary TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
