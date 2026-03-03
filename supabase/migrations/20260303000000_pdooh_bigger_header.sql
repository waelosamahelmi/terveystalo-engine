-- ============================================================================
-- SUUN TERVEYSTALO - Make PDOOH header title bigger
-- Increase .Hymyile (main headline) and .OletHyvissKS (headline line 2) font sizes
-- ============================================================================

-- 1. Increase .Hymyile font-size from 80px to 100px, widen and re-center
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.Hymyile { width: 400px; min-height: 80px; max-height: 120px; left: 340px; top: 125px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 80px; font-weight: 700; line-height: 1.1; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }',
'.Hymyile { width: 600px; min-height: 100px; max-height: 140px; left: 240px; top: 100px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 100px; font-weight: 700; line-height: 1.1; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }'
)
WHERE name = 'Suun Terveystalo 1080x1920 PDOOH';

-- 2. Increase .OletHyvissKS font-size from 72px to 88px, adjust top position
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.OletHyvissKS { width: 840px; min-height: 90px; max-height: 130px; left: 120px; top: 230px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 72px; font-weight: 700; line-height: 1.1; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }',
'.OletHyvissKS { width: 900px; min-height: 100px; max-height: 140px; left: 90px; top: 220px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 88px; font-weight: 700; line-height: 1.1; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }'
)
WHERE name = 'Suun Terveystalo 1080x1920 PDOOH';
