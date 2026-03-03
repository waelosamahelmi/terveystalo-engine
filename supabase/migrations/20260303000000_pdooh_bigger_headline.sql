-- ============================================================================
-- SUUN TERVEYSTALO - PDOOH 1080x1920 Bigger Headline
-- Date: 2026-03-03
-- Description: Increase headline font-size from 78px to 110px for better
--              readability on large PDOOH screens.
-- ============================================================================

UPDATE creative_templates
SET html_template = REPLACE(
    html_template,
    'font-size: 78px;',
    'font-size: 110px;'
),
    updated_at = NOW()
WHERE name = 'Suun Terveystalo 1080x1920 PDOOH';
