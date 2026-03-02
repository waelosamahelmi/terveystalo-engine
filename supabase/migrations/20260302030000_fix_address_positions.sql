-- ============================================================================
-- SUUN TERVEYSTALO - Fix All Templates Headline to Two Lines with |
-- Version: 1.0.1
-- Date: 2026-03-02
-- Description: Set ALL templates to use "Hymyile.|Olet hyvissä käsissä." with | separator
-- ============================================================================

-- IMPORTANT: Use | instead of <br> so runtime conversion handles spacing consistently
-- The creativeService.renderTemplateHtml converts | to <br> with proper spacing

-- ============================================================================
-- CLEANUP: Remove problematic defaults from older migration
-- ============================================================================

-- Remove offer_title default so service name is used instead
-- Remove headline_line2 defaults that cause "double lines" in split templates
UPDATE creative_templates
SET default_values = default_values - 'offer_title' - 'headline_line2'
WHERE name LIKE 'Suun Terveystalo%';

-- 300x300: Set headline with | (combined structure)
UPDATE creative_templates
SET default_values = jsonb_set(
    default_values,
    '{headline}',
    '"Hymyile.|Olet hyvissä käsissä."'
)
WHERE name = 'Suun Terveystalo 300x300';

-- 300x431: Set headline with | (split structure)
-- For split structure, we put full text in headline and let runtime split it
-- DO NOT set headline_line2 separately - that causes "double lines"
UPDATE creative_templates
SET default_values = default_values || '{"headline": "Hymyile.|Olet hyvissä käsissä."}'::jsonb
WHERE name = 'Suun Terveystalo 300x431';

-- 300x600: Set headline with | (split structure)
-- DO NOT set headline_line2 separately - that causes "double lines"
UPDATE creative_templates
SET default_values = default_values || '{"headline": "Hymyile.|Olet hyvissä käsissä."}'::jsonb
WHERE name = 'Suun Terveystalo 300x600';

-- 620x891: Set headline with | (combined structure)
UPDATE creative_templates
SET default_values = jsonb_set(
    default_values,
    '{headline}',
    '"Hymyile.|Olet hyvissä käsissä."'
)
WHERE name = 'Suun Terveystalo 620x891';

-- 980x400: Set headline with | (combined structure)
UPDATE creative_templates
SET default_values = jsonb_set(
    default_values,
    '{headline}',
    '"Hymyile.|Olet hyvissä käsissä."'
)
WHERE name = 'Suun Terveystalo 980x400';

-- 1080x1920 PDOOH: Set headline with | (split structure)
-- DO NOT set headline_line2 separately - that causes "double lines"
UPDATE creative_templates
SET default_values = default_values || '{"headline": "Hymyile.|Olet hyvissä käsissä."}'::jsonb
WHERE name = 'Suun Terveystalo 1080x1920 PDOOH';

-- ============================================================================
-- FIX ADDRESS POSITIONS
-- ============================================================================

-- 1. Fix 300x300 - left align address, +5px top margin
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.Torikatu1Laht { width: 96px; height: 17px; left: 16px; top: 267px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 12px; font-weight: 600; }',
'.Torikatu1Laht { width: 270px; height: 17px; left: 15px; top: 277px; position: absolute; justify-content: flex-start; display: flex; flex-direction: column; color: white; font-size: 12px; font-weight: 600; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }'
)
WHERE name = 'Suun Terveystalo 300x300';

-- 2. Fix 300x431 - center align address, +5px top margin
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.Torikatu1Laht { width: 110px; height: 19px; left: 96px; top: 384px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 14px; font-weight: 600; }',
'.Torikatu1Laht { width: 270px; height: 19px; left: 15px; top: 389px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 14px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }'
)
WHERE name = 'Suun Terveystalo 300x431';

-- 3. Fix 300x600 - center align address, +5px top margin, wider width
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.Torikatu1Lahti { width: 110px; left: 96px; top: 547px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 15px; font-weight: 600; }',
'.Torikatu1Lahti { width: 280px; min-height: 19px; left: 10px; top: 552px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 15px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }'
)
WHERE name = 'Suun Terveystalo 300x600';

-- 4. Fix 620x891 - center align address, +5px top margin, wider width
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.Torikatu1Laht { width: 181px; height: 30px; left: 220px; top: 800px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 24px; font-weight: 600; }',
'.Torikatu1Laht { width: 500px; min-height: 30px; left: 60px; top: 805px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 24px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }'
)
WHERE name = 'Suun Terveystalo 620x891';

-- 5. Fix 980x400 - left align address, +5px top margin, wider width
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.Torikatu1Laht { width: 144px; height: 24px; left: 37px; top: 351px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 19px; font-weight: 600; }',
'.Torikatu1Laht { width: 943px; min-height: 24px; left: 37px; top: 356px; position: absolute; justify-content: flex-start; display: flex; flex-direction: column; color: white; font-size: 19px; font-weight: 600; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }'
)
WHERE name = 'Suun Terveystalo 980x400';

-- 6. Fix 1080x1920 PDOOH - center align address, +5px top margin, wider width
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.Torikatu1Lahti { width: 395.40px; left: 345.08px; top: 1656.21px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 53.92px; font-weight: 600; }',
'.Torikatu1Lahti { width: 800px; min-height: 60px; left: 140px; top: 1661px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 54px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }'
)
WHERE name = 'Suun Terveystalo 1080x1920 PDOOH';

-- ============================================================================
-- FIX HEADLINE CSS FOR TWO-LINE DISPLAY (combined structure templates)
-- ============================================================================

-- 300x300: Allow headline to show two lines with proper spacing
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.HymyileOletHy { width: 174px; height: 46px; left: 15px; top: 130px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 17px; font-weight: 700; line-height: 21.06px; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }',
'.HymyileOletHy { width: 174px; min-height: 46px; max-height: 60px; left: 15px; top: 130px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 16px; font-weight: 700; line-height: 1.2; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }'
)
WHERE name = 'Suun Terveystalo 300x300';

-- 620x891: Allow headline to show two lines with proper spacing
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.HymyileOletHy { width: 431px; height: 111px; left: 101px; top: 24px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 42px; font-weight: 700; line-height: 53.86px; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }',
'.HymyileOletHy { width: 420px; min-height: 100px; max-height: 120px; left: 100px; top: 24px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 38px; font-weight: 700; line-height: 1.1; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }'
)
WHERE name = 'Suun Terveystalo 620x891';

-- 980x400: Allow headline to show two lines with proper spacing
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.HymyileOletHy { width: 365px; height: 96px; left: 38px; top: 42px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 35px; font-weight: 700; line-height: 45.50px; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }',
'.HymyileOletHy { width: 360px; min-height: 80px; max-height: 100px; left: 38px; top: 40px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 32px; font-weight: 700; line-height: 1.1; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }'
)
WHERE name = 'Suun Terveystalo 980x400';

-- ============================================================================
-- FIX OFFER TITLE TEXT ALIGNMENT - center align hyphenated text
-- ============================================================================

-- Add text-align: center to all offer title elements
-- This ensures hyphenated words like "Suuhygieni-<br>stikäynti" are centered

-- 300x300: Fix .HammasTarkastu
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.HammasTarkastu { width: 46px; left: 41px; top: 32px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 10px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }',
'.HammasTarkastu { width: 46px; left: 41px; top: 32px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 10px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }'
)
WHERE name = 'Suun Terveystalo 300x300';

-- 300x431: Fix .HammasTarkast
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.HammasTarkast { width: 47px; left: 41px; top: 201px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 10px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }',
'.HammasTarkast { width: 47px; left: 41px; top: 201px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 10px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }'
)
WHERE name = 'Suun Terveystalo 300x431';

-- 300x600: Fix .HammasTarkast
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.HammasTarkast { width: 53px; left: 48px; top: 321px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 11px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }',
'.HammasTarkast { width: 53px; left: 48px; top: 321px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 11px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }'
)
WHERE name = 'Suun Terveystalo 300x600';

-- 620x891: Fix .HammasTarkast
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.HammasTarkast { width: 87px; height: 43px; left: 92px; top: 445px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 18px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }',
'.HammasTarkast { width: 87px; min-height: 43px; left: 92px; top: 445px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 18px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }'
)
WHERE name = 'Suun Terveystalo 620x891';

-- 980x400: Fix .HammasTarkastu
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.HammasTarkastu { width: 85px; height: 42px; left: 823px; top: 65px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 18px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }',
'.HammasTarkastu { width: 85px; min-height: 42px; left: 823px; top: 65px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 18px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }'
)
WHERE name = 'Suun Terveystalo 980x400';

-- 1080x1920 PDOOH: Fix .HammasTarkast
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.HammasTarkast { width: 190.51px; left: 172.54px; top: 792.51px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 39.54px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }',
'.HammasTarkast { width: 191px; min-height: 40px; left: 173px; top: 793px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 40px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }'
)
WHERE name = 'Suun Terveystalo 1080x1920 PDOOH';
