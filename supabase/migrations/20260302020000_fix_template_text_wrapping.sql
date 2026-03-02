-- ============================================================================
-- SUUN TERVEYSTALO - Fix Template Text Wrapping and Spacing
-- Version: 1.0.0
-- Date: 2026-03-02
-- Description: Fix CSS to allow text to wrap properly and reduce line spacing
-- ============================================================================

-- 1. Fix 300x300 template - make text elements flexible
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.HymyileOletHy { width: 174px; height: 46px; left: 15px; top: 130px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 17px; font-weight: 700; line-height: 21.06px; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }',
'.HymyileOletHy { width: 174px; min-height: 46px; max-height: 60px; left: 15px; top: 125px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 16px; font-weight: 700; line-height: 1.2; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }'
)
WHERE name = 'Suun Terveystalo 300x300';

UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.SujuvampaaSuunt { width: 173px; height: 34px; left: 14px; top: 180px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 12px; font-weight: 600; line-height: 14.81px; }',
'.SujuvampaaSuunt { width: 173px; min-height: 20px; max-height: 40px; left: 14px; top: 180px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 11px; font-weight: 600; line-height: 1.2; }'
)
WHERE name = 'Suun Terveystalo 300x300';

UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.Torikatu1Laht { width: 96px; height: 17px; left: 16px; top: 267px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 12px; font-weight: 600; }',
'.Torikatu1Laht { width: 270px; min-height: 17px; max-height: 35px; left: 15px; top: 262px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 11px; font-weight: 600; line-height: 1.2; text-align: center; }'
)
WHERE name = 'Suun Terveystalo 300x300';

-- 2. Fix 300x431 template
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.Hymyile { width: 107px; height: 29px; left: 99px; top: 23px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #E0E0E2; font-size: 25px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }',
'.Hymyile { width: 120px; min-height: 25px; max-height: 35px; left: 90px; top: 20px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #E0E0E2; font-size: 22px; font-weight: 700; line-height: 1.1; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }'
)
WHERE name = 'Suun Terveystalo 300x431';

UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.OletHyvissKS { width: 231px; height: 29px; left: 36px; top: 53px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #E0E0E3; font-size: 22px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }',
'.OletHyvissKS { width: 230px; min-height: 25px; max-height: 35px; left: 35px; top: 52px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #E0E0E3; font-size: 20px; font-weight: 700; line-height: 1.1; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }'
)
WHERE name = 'Suun Terveystalo 300x431';

UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.SujuvampaaSuunt { width: 199px; height: 37px; left: 54px; top: 85px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 14px; font-weight: 400; line-height: 16.81px; }',
'.SujuvampaaSuunt { width: 200px; min-height: 20px; max-height: 45px; left: 50px; top: 85px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 12px; font-weight: 500; line-height: 1.2; }'
)
WHERE name = 'Suun Terveystalo 300x431';

UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.Torikatu1Laht { width: 110px; height: 19px; left: 96px; top: 384px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 14px; font-weight: 600; }',
'.Torikatu1Laht { width: 270px; min-height: 18px; max-height: 40px; left: 15px; top: 380px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 12px; font-weight: 600; line-height: 1.2; }'
)
WHERE name = 'Suun Terveystalo 300x431';

-- 3. Fix 300x600 template
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.Hymyile { width: 108px; height: 28px; left: 100px; top: 36px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 25px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }',
'.Hymyile { width: 120px; min-height: 25px; max-height: 40px; left: 90px; top: 30px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 23px; font-weight: 700; line-height: 1.1; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }'
)
WHERE name = 'Suun Terveystalo 300x600';

UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.OletHyvissKS { width: 231px; height: 29px; left: 38px; top: 65px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 22px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }',
'.OletHyvissKS { width: 230px; min-height: 25px; max-height: 40px; left: 35px; top: 65px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 20px; font-weight: 700; line-height: 1.1; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }'
)
WHERE name = 'Suun Terveystalo 300x600';

UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.SujuvampaaSuunt { width: 224px; height: 46px; left: 42px; top: 96px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 16px; font-weight: 600; line-height: 19.23px; }',
'.SujuvampaaSuunt { width: 225px; min-height: 25px; max-height: 60px; left: 37px; top: 100px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 13px; font-weight: 600; line-height: 1.2; }'
)
WHERE name = 'Suun Terveystalo 300x600';

-- 4. Fix 620x891 template
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.HymyileOletHy { width: 431px; height: 111px; left: 101px; top: 24px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 42px; font-weight: 700; line-height: 53.86px; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }',
'.HymyileOletHy { width: 420px; min-height: 80px; max-height: 120px; left: 100px; top: 24px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 38px; font-weight: 700; line-height: 1.1; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }'
)
WHERE name = 'Suun Terveystalo 620x891';

UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.SujuvampaaSuunt { width: 372px; height: 71px; left: 129px; top: 145px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 26px; font-weight: 600; line-height: 32.09px; }',
'.SujuvampaaSuunt { width: 380px; min-height: 50px; max-height: 90px; left: 120px; top: 145px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 22px; font-weight: 600; line-height: 1.2; }'
)
WHERE name = 'Suun Terveystalo 620x891';

-- 5. Fix 980x400 template
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.HymyileOletHy { width: 365px; height: 96px; left: 38px; top: 42px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 35px; font-weight: 700; line-height: 45.50px; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }',
'.HymyileOletHy { width: 360px; min-height: 70px; max-height: 100px; left: 38px; top: 40px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 32px; font-weight: 700; line-height: 1.1; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }'
)
WHERE name = 'Suun Terveystalo 980x400';

-- 6. Fix 1080x1920 PDOOH template
UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.Hymyile { width: 388.21px; height: 100.65px; left: 359.45px; top: 129.40px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 89.86px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }',
'.Hymyile { width: 400px; min-height: 80px; max-height: 120px; left: 340px; top: 125px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 80px; font-weight: 700; line-height: 1.1; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }'
)
WHERE name = 'Suun Terveystalo 1080x1920 PDOOH';

UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.OletHyvissKS { width: 830.34px; height: 104.24px; left: 136.59px; top: 233.64px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 79.08px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }',
'.OletHyvissKS { width: 840px; min-height: 90px; max-height: 130px; left: 120px; top: 230px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 72px; font-weight: 700; line-height: 1.1; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }'
)
WHERE name = 'Suun Terveystalo 1080x1920 PDOOH';

UPDATE creative_templates
SET html_template = REPLACE(html_template,
'.SujuvampaaSuunt { width: 805.18px; height: 165.35px; left: 150.97px; top: 345.08px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 57.51px; font-weight: 600; line-height: 69.14px; }',
'.SujuvampaaSuunt { width: 820px; min-height: 120px; max-height: 180px; left: 130px; top: 340px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 52px; font-weight: 600; line-height: 1.15; }'
)
WHERE name = 'Suun Terveystalo 1080x1920 PDOOH';
