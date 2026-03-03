-- ============================================================================
-- SUUN TERVEYSTALO - Update Branches with New Terveystalo Locations
-- Version: 2.0.0
-- Date: 2026-03-03
-- Description: Replaces existing branches with updated Terveystalo branch list
-- ============================================================================

-- ============================================================================
-- 1. CLEAR EXISTING BRANCHES
-- ============================================================================

-- Delete all existing branches (cascade will handle related records)
-- Note: This will delete existing campaigns. If you need to preserve data,
-- comment this out and use UPDATE instead.
DELETE FROM branches;

-- ============================================================================
-- 2. INSERT NEW TERVEYSTALO BRANCHES
-- ============================================================================

INSERT INTO branches (name, short_name, address, postal_code, city, region, latitude, longitude, phone, services, features, opening_hours) VALUES
-- LAHTI
('Terveystalo Lahti', 'Lahti', 'Torikatu 1', '15110', 'Lahti', 'Päijät-Häme', 60.9827, 25.6612, '+358 10 400 3130',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- KOTKA
('Terveystalo Kotka', 'Kotka', 'Keskuskatu 10', '48100', 'Kotka', 'Kymenlaakso', 60.4660, 26.9458, '+358 10 400 3140',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- LOVIISA
('Terveystalo Loviisa', 'Loviisa', 'Brandensteininkatu 19', '07900', 'Loviisa', 'Uusimaa', 60.4580, 26.2350, '+358 10 400 3100',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- IISALMI
('Terveystalo Iisalmi', 'Iisalmi', 'Luuniemenkatu 3 A', '74100', 'Iisalmi', 'Pohjois-Savo', 63.5590, 27.1900, '+358 10 400 3150',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- KUOPIO
('Terveystalo Kuopio', 'Kuopio', 'Asemakatu 22–24', '70100', 'Kuopio', 'Pohjois-Savo', 62.8924, 27.6782, '+358 10 400 3070',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- JYVÄSKYLÄ
('Terveystalo Jyväskylä', 'Jyväskylä', 'Väinönkatu 9', '40100', 'Jyväskylä', 'Keski-Suomi', 62.2426, 25.7473, '+358 10 400 3080',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- JÄMSÄ (ei suuhygienistiä)
('Terveystalo Jämsä', 'Jämsä', 'Talvialantie 4', '42100', 'Jämsä', 'Keski-Suomi', 61.8667, 25.2000, '+358 10 400 3180',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "no_hygienist": true, "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- MIKKELI
('Terveystalo Mikkeli', 'Mikkeli', 'Mikonkatu 3', '50100', 'Mikkeli', 'Etelä-Savo', 61.6886, 27.2723, '+358 10 400 3230',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- SAVONLINNA
('Terveystalo Savonlinna', 'Savonlinna', 'Olavinkatu 53', '57100', 'Savonlinna', 'Etelä-Savo', 61.8687, 28.8789, '+358 10 400 3270',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- OULU
('Terveystalo Oulu', 'Oulu', 'Albertinkatu 16', '90100', 'Oulu', 'Pohjois-Pohjanmaa', 65.0121, 25.4651, '+358 10 400 3050',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- SODANKYLÄ (VAIN BRÄNDI)
('Terveystalo Sodankylä', 'Sodankylä', 'Kasarmintie 10', '99600', 'Sodankylä', 'Lappi', 67.4167, 26.5833, '+358 10 400 3160',
 ARRAY['VAIN BRÄNDI']::text[],
 '{"creative_types": ["brand_male", "brand_female"], "brand_only": true, "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- ROVANIEMI (muutto Revontulikeskukseen)
('Terveystalo Rovaniemi', 'Rovaniemi', 'Revontulikeskus 1.krs', '96200', 'Rovaniemi', 'Lappi', 66.5039, 25.7294, '+358 10 400 3160',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "moving_week_9": true, "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- PIETARSAARI (vain suomenkieli)
('Terveystalo Pietarsaari', 'Pietarsaari', 'Kauppatori 2', '68600', 'Pietarsaari', 'Pohjanmaa', 63.7167, 22.6833, '+358 10 400 3190',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "finnish_only": true, "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- SEINÄJOKI
('Terveystalo Seinäjoki', 'Seinäjoki', 'Kauppakatu 23', '60100', 'Seinäjoki', 'Etelä-Pohjanmaa', 62.7876, 22.8402, '+358 10 400 3150',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- PORI
('Terveystalo Pori', 'Pori', 'Eteläranta 2', '28100', 'Pori', 'Satakunta', 61.4851, 21.7974, '+358 10 400 3090',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- TAMPERE
('Terveystalo Tampere', 'Tampere', 'Pellavatehtaankatu 8', '33100', 'Tampere', 'Pirkanmaa', 61.4978, 23.7610, '+358 10 400 3030',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- HÄMEENLINNA
('Terveystalo Hämeenlinna', 'Hämeenlinna', 'Kaivokatu 7', '13200', 'Hämeenlinna', 'Kanta-Häme', 60.9945, 24.4614, '+358 10 400 3130',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- FORSSA
('Terveystalo Forssa', 'Forssa', 'Kutomonkuja 2 B 3', '30100', 'Forssa', 'Kanta-Häme', 60.8167, 23.6167, '+358 10 400 3140',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- LOIMAA
('Terveystalo Loimaa', 'Loimaa', 'Vesikoskenkatu 17', '32200', 'Loimaa', 'Varsinais-Suomi', 60.8833, 22.9667, '+358 10 400 3200',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- TURKU
('Terveystalo Turku', 'Turku', 'Humalistonkatu 9-11', '20500', 'Turku', 'Varsinais-Suomi', 60.4518, 22.2666, '+358 10 400 3040',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- TIKKURILA
('Terveystalo Tikkurila', 'Tikkurila', 'Ratatie 11 A', '01300', 'Vantaa', 'Uusimaa', 60.2928, 25.0418, '+358 10 400 3020',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- MYYRMÄKI
('Terveystalo Myyrmäki', 'Myyrmäki', 'Liesikuja 7', '01600', 'Vantaa', 'Uusimaa', 60.2611, 24.8547, '+358 10 400 3021',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- LEPPÄVAARA
('Terveystalo Leppävaara', 'Leppävaara', 'Hevosenkenkä 3', '02600', 'Espoo', 'Uusimaa', 60.2195, 24.8132, '+358 10 400 3011',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- ISO OMENA
('Terveystalo Iso Omena', 'Iso Omena', 'Piispansilta 11', '02230', 'Espoo', 'Uusimaa', 60.1600, 24.7400, '+358 10 400 3012',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- LIPPULAIVA
('Terveystalo Lippulaiva', 'Lippulaiva', 'Espoonlahdenkatu 4', '02320', 'Espoo', 'Uusimaa', 60.1750, 24.6500, '+358 10 400 3013',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- OULUNKYLÄ (Ogeli)
('Terveystalo Oulunkylä', 'Ogeli', 'Kylänvanhimmantie 29', '00640', 'Helsinki', 'Uusimaa', 60.2200, 25.0200, '+358 10 400 3000',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- ITÄKESKUS
('Terveystalo Itäkeskus', 'Itäkeskus', 'Tallinnanaukio 2', '00930', 'Helsinki', 'Uusimaa', 60.2108, 25.0828, '+358 10 400 3002',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- REDI
('Terveystalo Redi', 'Redi', 'Hermannin rantatie 5', '00580', 'Helsinki', 'Uusimaa', 60.1850, 25.0000, '+358 10 400 3003',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- KAMPPI
('Terveystalo Kamppi', 'Kamppi', 'Jaakonkatu 3', '00100', 'Helsinki', 'Uusimaa', 60.1688, 24.9327, '+358 10 400 3001',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- MASALA (Kirkkonummi)
('Terveystalo Masala', 'Masala', 'Pyssysepänkaari 1A', '02430', 'Kirkkonummi', 'Uusimaa', 60.0167, 24.4167, '+358 10 400 3022',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- VEIKKOLA (Kirkkonummi)
('Terveystalo Veikkola', 'Veikkola', 'Eerikinkartanontie 2', '02880', 'Kirkkonummi', 'Uusimaa', 60.3667, 24.4333, '+358 10 400 3023',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb),

-- LOHJA
('Terveystalo Lohja', 'Lohja', 'Laurinkatu 37', '08100', 'Lohja', 'Uusimaa', 60.2500, 24.0833, '+358 10 400 3024',
 ARRAY['BRÄNDI x2 (mies & nainen)', 'TAKTINEN Hammastarkastus 49 €']::text[],
 '{"creative_types": ["brand_male", "brand_female", "tactical_checkup"], "parking": true, "wheelchair_accessible": true}'::jsonb,
 '{"monday": {"open": "08:00", "close": "18:00"}, "tuesday": {"open": "08:00", "close": "18:00"}, "wednesday": {"open": "08:00", "close": "18:00"}, "thursday": {"open": "08:00", "close": "18:00"}, "friday": {"open": "08:00", "close": "16:00"}, "saturday": {"open": null, "close": null}, "sunday": {"open": null, "close": null}}'::jsonb)

ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- 3. INSERT BUDGET ALLOCATIONS FOR EACH BRANCH
-- ============================================================================

-- Monthly budget allocations based on user's budget table
INSERT INTO branch_budgets (branch_id, allocated_budget, used_budget, period_start, period_end, notes)
SELECT
    id,
    CASE
        WHEN name = 'Terveystalo Turku' THEN 2695
        WHEN name IN (
            'Terveystalo Lahti', 'Terveystalo Kotka', 'Terveystalo Oulu',
            'Terveystalo Tampere', 'Terveystalo Pori', 'Terveystalo Leppävaara',
            'Terveystalo Iso Omena', 'Terveystalo Lippulaiva', 'Terveystalo Oulunkylä',
            'Terveystalo Itäkeskus', 'Terveystalo Redi', 'Terveystalo Kamppi',
            'Terveystalo Masala', 'Terveystalo Veikkola', 'Terveystalo Lohja'
        ) THEN 1797
        WHEN name = 'Terveystalo Rovaniemi' THEN 1348
        WHEN name IN (
            'Terveystalo Loviisa', 'Terveystalo Kuopio', 'Terveystalo Jyväskylä',
            'Terveystalo Jämsä', 'Terveystalo Mikkeli', 'Terveystalo Savonlinna',
            'Terveystalo Seinäjoki', 'Terveystalo Hämeenlinna', 'Terveystalo Forssa',
            'Terveystalo Loimaa', 'Terveystalo Tikkurila', 'Terveystalo Myyrmäki',
            'Terveystalo Pietarsaari'
        ) THEN 898
        WHEN name = 'Terveystalo Sodankylä' THEN 0
        ELSE 898
    END,
    0, -- used_budget starts at 0
    DATE_TRUNC('month', CURRENT_DATE),
    (DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day'),
    'Initial monthly budget allocation from March 2026'
FROM branches
ON CONFLICT (branch_id, period_start) DO UPDATE SET
    allocated_budget = EXCLUDED.allocated_budget,
    updated_at = NOW();

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE 'Branch update migration completed at %', NOW();
END $$;
