-- ============================================================================
-- SUUN TERVEYSTALO - Fix PDOOH 1080x1920 headline_line2
-- Ensure headline_line2 is removed from default_values so the full headline with | is used
-- ============================================================================

-- Remove headline_line2 from PDOOH template default values
UPDATE creative_templates
SET default_values = default_values - 'headline_line2'
WHERE name = 'Suun Terveystalo 1080x1920 PDOOH';

-- Or if it exists as a key, remove it:
UPDATE creative_templates
SET default_values = jsonb_set(
    default_values,
    '{headline_line2}',
    'false'
) WHERE default_values ? 'headline_line2' IS NOT NULL
AND name = 'Suun Terveystalo 1080x1920 PDOOH';
