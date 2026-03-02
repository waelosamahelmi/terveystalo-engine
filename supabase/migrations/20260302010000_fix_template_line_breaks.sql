-- ============================================================================
-- SUUN TERVEYSTALO - Fix Template Default Values Line Breaks
-- Version: 1.0.0
-- Date: 2026-03-02
-- Description: Replace | with <br> in default_values for proper line breaks
-- ============================================================================

-- Fix 300x300 template
UPDATE creative_templates
SET default_values = jsonb_set(
    default_values,
    '{headline}',
    '"Hymyile.<br>Olet hyvissä käsissä."'
)
WHERE name = 'Suun Terveystalo 300x300';

UPDATE creative_templates
SET default_values = default_values || '{"subheadline": "Sujuvampaa suunterveyttä<br>Lahden Suun Terveystalossa"}'::jsonb
WHERE name = 'Suun Terveystalo 300x300';

UPDATE creative_templates
SET default_values = default_values || '{"offer_title": "Hammas-<br>tarkastus"}'::jsonb
WHERE name = 'Suun Terveystalo 300x300';

UPDATE creative_templates
SET default_values = default_values || '{"offer_date": "Varaa viimeistään<br>28.10."}'::jsonb
WHERE name = 'Suun Terveystalo 300x300';

-- Fix 300x431 template
UPDATE creative_templates
SET default_values = default_values || '{"subheadline": "Sujuvampaa suunterveyttä<br>Lahden Suun Terveystalossa."}'::jsonb
WHERE name = 'Suun Terveystalo 300x431';

UPDATE creative_templates
SET default_values = default_values || '{"offer_title": "Hammas-<br>tarkastus"}'::jsonb
WHERE name = 'Suun Terveystalo 300x431';

UPDATE creative_templates
SET default_values = default_values || '{"offer_date": "Varon viimeistään<br>28.10."}'::jsonb
WHERE name = 'Suun Terveystalo 300x431';

-- Fix 300x600 template
UPDATE creative_templates
SET default_values = default_values || '{"subheadline": "Sujuvampaa suunterveyttä<br>Lahden Suun Terveystalossa."}'::jsonb
WHERE name = 'Suun Terveystalo 300x600';

UPDATE creative_templates
SET default_values = default_values || '{"offer_title": "Hammas-<br>tarkastus"}'::jsonb
WHERE name = 'Suun Terveystalo 300x600';

UPDATE creative_templates
SET default_values = default_values || '{"offer_date": "Varaa viimeistään<br>28.10."}'::jsonb
WHERE name = 'Suun Terveystalo 300x600';

-- Fix 620x891 template
UPDATE creative_templates
SET default_values = jsonb_set(
    default_values,
    '{headline}',
    '"Hymyile.<br>Olet hyvissä käsissä."'
)
WHERE name = 'Suun Terveystalo 620x891';

UPDATE creative_templates
SET default_values = default_values || '{"subheadline": "Sujuvampaa suunterveyttä<br>Lahden Suun Terveystalossa."}'::jsonb
WHERE name = 'Suun Terveystalo 620x891';

UPDATE creative_templates
SET default_values = default_values || '{"offer_title": "Hammas-<br>tarkastus"}'::jsonb
WHERE name = 'Suun Terveystalo 620x891';

UPDATE creative_templates
SET default_values = default_values || '{"offer_date": "Varaa viimeistään<br>28.10."}'::jsonb
WHERE name = 'Suun Terveystalo 620x891';

-- Fix 980x400 template
UPDATE creative_templates
SET default_values = jsonb_set(
    default_values,
    '{headline}',
    '"Hymyile.<br>Olet hyvissä käsissä."'
)
WHERE name = 'Suun Terveystalo 980x400';

UPDATE creative_templates
SET default_values = default_values || '{"subheadline": "Sujuvampaa suunterveyttä<br>Lahden Suun Terveystalossa"}'::jsonb
WHERE name = 'Suun Terveystalo 980x400';

UPDATE creative_templates
SET default_values = default_values || '{"offer_title": "Hammas-<br>tarkastus"}'::jsonb
WHERE name = 'Suun Terveystalo 980x400';

UPDATE creative_templates
SET default_values = default_values || '{"offer_date": "Varaa viimeistään<br>28.10."}'::jsonb
WHERE name = 'Suun Terveystalo 980x400';

-- Fix 1080x1920 PDOOH template
UPDATE creative_templates
SET default_values = default_values || '{"subheadline": "Sujuvampaa suunterveyttä<br>Lahden Suun Terveystalossa."}'::jsonb
WHERE name = 'Suun Terveystalo 1080x1920 PDOOH';

UPDATE creative_templates
SET default_values = default_values || '{"offer_title": "Hammas-<br>tarkastus"}'::jsonb
WHERE name = 'Suun Terveystalo 1080x1920 PDOOH';

UPDATE creative_templates
SET default_values = default_values || '{"offer_date": "Varaa viimeistään<br>28.10."}'::jsonb
WHERE name = 'Suun Terveystalo 1080x1920 PDOOH';
