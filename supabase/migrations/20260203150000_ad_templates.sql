-- ============================================================================
-- SUUN TERVEYSTALO - AD TEMPLATES MIGRATION
-- Version: 1.0.0
-- Date: 2026-02-03
-- Description: Populate creative_templates with all ad template/previews
-- ============================================================================

-- First, clear existing templates to avoid duplicates
DELETE FROM creative_templates WHERE name LIKE 'Suun Terveystalo%';

-- ============================================================================
-- INSERT ALL AD TEMPLATES
-- ============================================================================

-- 1. 300x300 Display Banner (Small Square)
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
    sort_order
) VALUES (
    'Suun Terveystalo 300x300',
    'Small square display banner - Perfect for sidebar placements and small ad units',
    'display',
    '300x300',
    300,
    300,
    '<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="ad.size" content="width=300,height=300">
    <title>300x300 Ad Banner - Suun Terveystalo</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #333; font-family: ''Montserrat'', sans-serif; }
        .ad-container { width: 300px; height: 300px; background-color: #08091A; position: relative; overflow: hidden; color: #ffffff; text-align: center; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInFromTop { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-30px) rotate(-3deg); } to { opacity: 1; transform: translateX(0) rotate(-3deg); } }
        @keyframes slideInFromRight { from { opacity: 0; transform: translateX(30px) rotate(-30deg); } to { opacity: 1; transform: translateX(0) rotate(-30deg); } }
        @keyframes slideInFromBottom { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: translateX(-50%) scale(0.8); } to { opacity: 1; transform: translateX(-50%) scale(1); } }
        @keyframes pulse { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.05); } }
        .main-image { position: absolute; top: 50px; left: 0; width: 100%; height: 200px; z-index: 1; object-fit: cover; object-position: center top; -webkit-mask-image: radial-gradient(ellipse 85% 80% at 50% 45%, black 40%, transparent 80%); mask-image: radial-gradient(ellipse 85% 80% at 50% 45%, black 40%, transparent 80%); opacity: 0; animation: fadeIn 0.8s ease-out 0.2s forwards; }
        .artwork { position: absolute; bottom: -45px; right: -55px; width: 180px; height: 180px; z-index: 2; object-fit: contain; transform: rotate(-30deg); opacity: 0; animation: slideInFromRight 0.7s ease-out 0.5s forwards; }
        .logo { position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%); width: 120px; height: auto; max-height: 22px; z-index: 10; object-fit: contain; opacity: 0; animation: fadeIn 0.6s ease-out 1.2s forwards; }
        .text-area { position: relative; z-index: 10; padding-top: 20px; width: 100%; opacity: 0; animation: slideInFromTop 0.6s ease-out 0.1s forwards; }
        .headline { font-size: 14px; font-weight: 900; line-height: 1.1; margin-bottom: 8px; }
        .subheadline { font-size: 9px; line-height: 1.35; max-width: 90%; margin: 0 auto; }
        .price-bubble { position: absolute; z-index: 15; top: 125px; left: 12px; background-color: #ffffff; color: #004E9A; width: 85px; height: 85px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 4px 12px rgba(0,0,0,0.3); transform: rotate(-3deg); opacity: 0; animation: slideInFromLeft 0.6s ease-out 0.4s forwards; }
        .pb-title { font-size: 8px; font-weight: 700; line-height: 1.1; text-align: center; }
        .pb-price { font-size: 32px; font-weight: 900; line-height: 0.9; margin: 2px 0; letter-spacing: -1px; display: flex; align-items: flex-start; }
        .pb-currency { font-size: 16px; margin-top: 2px; margin-left: 1px; }
        .pb-date { font-size: 6px; font-weight: 600; text-align: center; line-height: 1.2; }
        .cta-button { position: absolute; z-index: 15; bottom: 55px; left: 50%; transform: translateX(-50%); background-color: #ffffff; color: #004E9A; text-decoration: none; font-weight: 700; font-size: 10px; padding: 8px 20px; border-radius: 20px; white-space: nowrap; box-shadow: 0 3px 8px rgba(0,0,0,0.2); opacity: 0; animation: scaleIn 0.5s ease-out 0.8s forwards, pulse 2s ease-in-out 2s infinite; }
        .address { position: absolute; bottom: 12px; width: 100%; text-align: center; font-size: 9px; font-weight: 400; z-index: 11; color: #fff; opacity: 0; animation: slideInFromBottom 0.5s ease-out 1s forwards; }
    </style>
</head>
<body>
    <div class="ad-container">
        <img src="{{image_url}}" alt="Dentist" class="main-image">
        <img src="{{artwork_url}}" alt="" class="artwork">
        <div class="text-area">
            <h1 class="headline">{{headline}}</h1>
            <p class="subheadline">{{subheadline}}</p>
        </div>
        <div class="price-bubble">
            <span class="pb-title">{{offer_title}}</span>
            <div class="pb-price">{{price}}<span class="pb-currency">€</span></div>
            <span class="pb-date">{{offer_date}}</span>
        </div>
        <a href="{{click_url}}" class="cta-button">{{cta_text}}</a>
        <img src="{{logo_url}}" alt="Suun Terveystalo" class="logo">
        <div class="address">{{branch_address}}</div>
    </div>
</body>
</html>',
    '[
        {"key": "headline", "label": "Otsikko", "type": "text", "required": true, "maxLength": 40},
        {"key": "subheadline", "label": "Alaotsikko", "type": "text", "required": false, "maxLength": 80},
        {"key": "offer_title", "label": "Tarjouksen otsikko", "type": "text", "required": true, "maxLength": 20},
        {"key": "price", "label": "Hinta", "type": "text", "required": true, "maxLength": 5},
        {"key": "offer_date", "label": "Tarjouspäivä", "type": "text", "required": false, "maxLength": 30},
        {"key": "cta_text", "label": "CTA teksti", "type": "text", "required": true, "maxLength": 20},
        {"key": "branch_address", "label": "Toimipisteen osoite", "type": "text", "required": false, "maxLength": 50},
        {"key": "image_url", "label": "Pääkuva URL", "type": "image", "required": true},
        {"key": "artwork_url", "label": "Artwork URL", "type": "image", "required": false},
        {"key": "logo_url", "label": "Logo URL", "type": "image", "required": true},
        {"key": "click_url", "label": "Klikkaus URL", "type": "url", "required": true}
    ]'::jsonb,
    '{
        "headline": "Hymyile.<br>Olet hyvissä käsissä.",
        "subheadline": "Sujuvampaa suunterveyttä.",
        "offer_title": "Hammas-<br>tarkastus",
        "price": "49",
        "offer_date": "Varaa viimeistään<br>28.10.",
        "cta_text": "Varaa aika",
        "branch_address": "Torikatu 1, Lahti",
        "image_url": "https://supabase-storage-url/suun-terveystalo/nainen.jpg",
        "artwork_url": "https://supabase-storage-url/suun-terveystalo/terveystalo-artwork.png",
        "logo_url": "https://supabase-storage-url/suun-terveystalo/SuunTerveystalo_logo.png",
        "click_url": "#"
    }'::jsonb,
    ARRAY['display', 'square', 'small', 'sidebar'],
    true,
    1
);

-- 2. 300x431 Display Banner (Portrait Medium)
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
    sort_order
) VALUES (
    'Suun Terveystalo 300x431',
    'Portrait medium display banner - Popular for interstitial and sidebar placements',
    'display',
    '300x431',
    300,
    431,
    '<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="ad.size" content="width=300,height=431">
    <title>300x431 Ad Banner - Suun Terveystalo</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #333; font-family: ''Montserrat'', sans-serif; }
        .ad-container { width: 300px; height: 431px; background-color: #08091A; position: relative; overflow: hidden; color: #ffffff; text-align: center; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInFromTop { from { opacity: 0; transform: translateY(-25px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-40px) rotate(-3deg); } to { opacity: 1; transform: translateX(0) rotate(-3deg); } }
        @keyframes slideInFromRight { from { opacity: 0; transform: translateX(40px) rotate(-30deg); } to { opacity: 1; transform: translateX(0) rotate(-30deg); } }
        @keyframes slideInFromBottom { from { opacity: 0; transform: translateY(25px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: translateX(-50%) scale(0.8); } to { opacity: 1; transform: translateX(-50%) scale(1); } }
        @keyframes pulse { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.05); } }
        .main-image { position: absolute; top: 70px; left: 0; width: 100%; height: 280px; z-index: 1; object-fit: cover; object-position: center top; -webkit-mask-image: radial-gradient(ellipse 82% 77% at 50% 45%, black 42%, transparent 82%); mask-image: radial-gradient(ellipse 82% 77% at 50% 45%, black 42%, transparent 82%); opacity: 0; animation: fadeIn 0.8s ease-out 0.2s forwards; }
        .artwork { position: absolute; bottom: -50px; right: -65px; width: 220px; height: 220px; z-index: 2; object-fit: contain; transform: rotate(-30deg); opacity: 0; animation: slideInFromRight 0.7s ease-out 0.5s forwards; }
        .logo { position: absolute; bottom: 38px; left: 50%; transform: translateX(-50%); width: 140px; height: auto; max-height: 26px; z-index: 10; object-fit: contain; opacity: 0; animation: fadeIn 0.6s ease-out 1.2s forwards; }
        .text-area { position: relative; z-index: 10; padding-top: 28px; width: 100%; opacity: 0; animation: slideInFromTop 0.6s ease-out 0.1s forwards; }
        .headline { font-size: 18px; font-weight: 900; line-height: 1.1; margin-bottom: 10px; }
        .subheadline { font-size: 12px; line-height: 1.35; max-width: 90%; margin: 0 auto; }
        .price-bubble { position: absolute; z-index: 15; top: 185px; left: 12px; background-color: #ffffff; color: #004E9A; width: 100px; height: 100px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 4px 12px rgba(0,0,0,0.3); transform: rotate(-3deg); opacity: 0; animation: slideInFromLeft 0.6s ease-out 0.4s forwards; }
        .pb-title { font-size: 10px; font-weight: 700; line-height: 1.1; text-align: center; }
        .pb-price { font-size: 40px; font-weight: 900; line-height: 0.9; margin: 3px 0; letter-spacing: -1px; display: flex; align-items: flex-start; }
        .pb-currency { font-size: 20px; margin-top: 3px; margin-left: 1px; }
        .pb-date { font-size: 7px; font-weight: 600; text-align: center; line-height: 1.2; }
        .cta-button { position: absolute; z-index: 15; bottom: 70px; left: 50%; transform: translateX(-50%); background-color: #ffffff; color: #004E9A; text-decoration: none; font-weight: 700; font-size: 11px; padding: 10px 24px; border-radius: 22px; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.2); opacity: 0; animation: scaleIn 0.5s ease-out 0.8s forwards, pulse 2s ease-in-out 2s infinite; }
        .address { position: absolute; bottom: 18px; width: 100%; text-align: center; font-size: 10px; font-weight: 400; z-index: 11; color: #fff; opacity: 0; animation: slideInFromBottom 0.5s ease-out 1s forwards; }
    </style>
</head>
<body>
    <div class="ad-container">
        <img src="{{image_url}}" alt="Dentist" class="main-image">
        <img src="{{artwork_url}}" alt="" class="artwork">
        <div class="text-area">
            <h1 class="headline">{{headline}}</h1>
            <p class="subheadline">{{subheadline}}</p>
        </div>
        <div class="price-bubble">
            <span class="pb-title">{{offer_title}}</span>
            <div class="pb-price">{{price}}<span class="pb-currency">€</span></div>
            <span class="pb-date">{{offer_date}}</span>
        </div>
        <a href="{{click_url}}" class="cta-button">{{cta_text}}</a>
        <img src="{{logo_url}}" alt="Suun Terveystalo" class="logo">
        <div class="address">{{branch_address}}</div>
    </div>
</body>
</html>',
    '[
        {"key": "headline", "label": "Otsikko", "type": "text", "required": true, "maxLength": 50},
        {"key": "subheadline", "label": "Alaotsikko", "type": "text", "required": false, "maxLength": 100},
        {"key": "offer_title", "label": "Tarjouksen otsikko", "type": "text", "required": true, "maxLength": 25},
        {"key": "price", "label": "Hinta", "type": "text", "required": true, "maxLength": 5},
        {"key": "offer_date", "label": "Tarjouspäivä", "type": "text", "required": false, "maxLength": 30},
        {"key": "cta_text", "label": "CTA teksti", "type": "text", "required": true, "maxLength": 20},
        {"key": "branch_address", "label": "Toimipisteen osoite", "type": "text", "required": false, "maxLength": 50},
        {"key": "image_url", "label": "Pääkuva URL", "type": "image", "required": true},
        {"key": "artwork_url", "label": "Artwork URL", "type": "image", "required": false},
        {"key": "logo_url", "label": "Logo URL", "type": "image", "required": true},
        {"key": "click_url", "label": "Klikkaus URL", "type": "url", "required": true}
    ]'::jsonb,
    '{
        "headline": "Hymyile.<br>Olet hyvissä käsissä.",
        "subheadline": "Sujuvampaa suunterveyttä Lahden Suun Terveystalossa.",
        "offer_title": "Hammas-<br>tarkastus",
        "price": "49",
        "offer_date": "Varaa viimeistään<br>28.10.",
        "cta_text": "Varaa aika",
        "branch_address": "Torikatu 1, Lahti",
        "image_url": "https://supabase-storage-url/suun-terveystalo/nainen.jpg",
        "artwork_url": "https://supabase-storage-url/suun-terveystalo/terveystalo-artwork.png",
        "logo_url": "https://supabase-storage-url/suun-terveystalo/SuunTerveystalo_logo.png",
        "click_url": "#"
    }'::jsonb,
    ARRAY['display', 'portrait', 'medium', 'interstitial'],
    true,
    2
);

-- 3. 300x600 Display Banner (Half Page / Skyscraper)
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
    sort_order
) VALUES (
    'Suun Terveystalo 300x600',
    'Half-page display banner (skyscraper) - Premium sidebar placement for high visibility',
    'display',
    '300x600',
    300,
    600,
    '<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="ad.size" content="width=300,height=600">
    <title>300x600 Ad Banner - Suun Terveystalo</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #333; font-family: ''Montserrat'', sans-serif; }
        .ad-container { width: 300px; height: 600px; background-color: #08091A; position: relative; overflow: hidden; color: #ffffff; text-align: center; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInFromTop { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-50px) rotate(-3deg); } to { opacity: 1; transform: translateX(0) rotate(-3deg); } }
        @keyframes slideInFromRight { from { opacity: 0; transform: translateX(50px) rotate(-30deg); } to { opacity: 1; transform: translateX(0) rotate(-30deg); } }
        @keyframes slideInFromBottom { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: translateX(-50%) scale(0.8); } to { opacity: 1; transform: translateX(-50%) scale(1); } }
        @keyframes pulse { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.05); } }
        .main-image { position: absolute; top: 100px; left: 0; width: 100%; height: 400px; z-index: 1; object-fit: cover; object-position: center top; -webkit-mask-image: radial-gradient(ellipse 82% 77% at 50% 45%, black 42%, transparent 82%); mask-image: radial-gradient(ellipse 82% 77% at 50% 45%, black 42%, transparent 82%); opacity: 0; animation: fadeIn 0.8s ease-out 0.2s forwards; }
        .artwork { position: absolute; bottom: -70px; right: -90px; width: 306px; height: 306px; z-index: 2; object-fit: contain; transform: rotate(-30deg); opacity: 0; animation: slideInFromRight 0.7s ease-out 0.5s forwards; }
        .logo { position: absolute; bottom: 50px; left: 50%; transform: translateX(-50%); width: 180px; height: auto; max-height: 32px; z-index: 10; object-fit: contain; opacity: 0; animation: fadeIn 0.6s ease-out 1.2s forwards; }
        .text-area { position: relative; z-index: 10; padding-top: 40px; width: 100%; opacity: 0; animation: slideInFromTop 0.6s ease-out 0.1s forwards; }
        .headline { font-size: 24px; font-weight: 900; line-height: 1.1; margin-bottom: 15px; }
        .subheadline { font-size: 16px; line-height: 1.35; max-width: 90%; margin: 0 auto; }
        .price-bubble { position: absolute; z-index: 15; top: 260px; left: 15px; background-color: #ffffff; color: #004E9A; width: 135px; height: 135px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 5px 15px rgba(0,0,0,0.3); transform: rotate(-3deg); opacity: 0; animation: slideInFromLeft 0.6s ease-out 0.4s forwards; }
        .pb-title { font-size: 13px; font-weight: 700; line-height: 1.1; text-align: center; }
        .pb-price { font-size: 54px; font-weight: 900; line-height: 0.9; margin: 4px 0; letter-spacing: -2px; display: flex; align-items: flex-start; }
        .pb-currency { font-size: 28px; margin-top: 4px; margin-left: 2px; }
        .pb-date { font-size: 10px; font-weight: 600; text-align: center; line-height: 1.2; }
        .cta-button { position: absolute; z-index: 15; bottom: 90px; left: 50%; transform: translateX(-50%); background-color: #ffffff; color: #004E9A; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 32px; border-radius: 25px; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.2); opacity: 0; animation: scaleIn 0.5s ease-out 0.8s forwards, pulse 2s ease-in-out 2s infinite; }
        .address { position: absolute; bottom: 30px; width: 100%; text-align: center; font-size: 13px; font-weight: 400; z-index: 11; color: #fff; opacity: 0; animation: slideInFromBottom 0.5s ease-out 1s forwards; }
    </style>
</head>
<body>
    <div class="ad-container">
        <img src="{{image_url}}" alt="Dentist" class="main-image">
        <img src="{{artwork_url}}" alt="" class="artwork">
        <div class="text-area">
            <h1 class="headline">{{headline}}</h1>
            <p class="subheadline">{{subheadline}}</p>
        </div>
        <div class="price-bubble">
            <span class="pb-title">{{offer_title}}</span>
            <div class="pb-price">{{price}}<span class="pb-currency">€</span></div>
            <span class="pb-date">{{offer_date}}</span>
        </div>
        <a href="{{click_url}}" class="cta-button">{{cta_text}}</a>
        <img src="{{logo_url}}" alt="Suun Terveystalo" class="logo">
        <div class="address">{{branch_address}}</div>
    </div>
</body>
</html>',
    '[
        {"key": "headline", "label": "Otsikko", "type": "text", "required": true, "maxLength": 60},
        {"key": "subheadline", "label": "Alaotsikko", "type": "text", "required": false, "maxLength": 120},
        {"key": "offer_title", "label": "Tarjouksen otsikko", "type": "text", "required": true, "maxLength": 30},
        {"key": "price", "label": "Hinta", "type": "text", "required": true, "maxLength": 5},
        {"key": "offer_date", "label": "Tarjouspäivä", "type": "text", "required": false, "maxLength": 35},
        {"key": "cta_text", "label": "CTA teksti", "type": "text", "required": true, "maxLength": 20},
        {"key": "branch_address", "label": "Toimipisteen osoite", "type": "text", "required": false, "maxLength": 50},
        {"key": "image_url", "label": "Pääkuva URL", "type": "image", "required": true},
        {"key": "artwork_url", "label": "Artwork URL", "type": "image", "required": false},
        {"key": "logo_url", "label": "Logo URL", "type": "image", "required": true},
        {"key": "click_url", "label": "Klikkaus URL", "type": "url", "required": true}
    ]'::jsonb,
    '{
        "headline": "Hymyile.<br>Olet hyvissä käsissä.",
        "subheadline": "Sujuvampaa suunterveyttä Lahden Suun Terveystalossa.",
        "offer_title": "Hammas-<br>tarkastus",
        "price": "49",
        "offer_date": "Varaa viimeistään<br>28.10.",
        "cta_text": "Varaa aika",
        "branch_address": "Torikatu 1, Lahti",
        "image_url": "https://supabase-storage-url/suun-terveystalo/nainen.jpg",
        "artwork_url": "https://supabase-storage-url/suun-terveystalo/terveystalo-artwork.png",
        "logo_url": "https://supabase-storage-url/suun-terveystalo/SuunTerveystalo_logo.png",
        "click_url": "#"
    }'::jsonb,
    ARRAY['display', 'skyscraper', 'half-page', 'premium'],
    true,
    3
);

-- 4. 620x891 Display Banner (Large Portrait)
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
    sort_order
) VALUES (
    'Suun Terveystalo 620x891',
    'Large portrait display banner - Perfect for high-impact native placements',
    'display',
    '620x891',
    620,
    891,
    '<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="ad.size" content="width=620,height=891">
    <title>620x891 Ad Banner - Suun Terveystalo</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #333; font-family: ''Montserrat'', sans-serif; }
        .ad-container { width: 620px; height: 891px; background-color: #08091A; position: relative; overflow: hidden; color: #ffffff; text-align: center; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInFromTop { from { opacity: 0; transform: translateY(-40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-60px) rotate(-3deg); } to { opacity: 1; transform: translateX(0) rotate(-3deg); } }
        @keyframes slideInFromRight { from { opacity: 0; transform: translateX(60px) rotate(-30deg); } to { opacity: 1; transform: translateX(0) rotate(-30deg); } }
        @keyframes slideInFromBottom { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: translateX(-50%) scale(0.8); } to { opacity: 1; transform: translateX(-50%) scale(1); } }
        @keyframes pulse { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.05); } }
        .main-image { position: absolute; top: 150px; left: 0; width: 100%; height: 580px; z-index: 1; object-fit: cover; object-position: center top; -webkit-mask-image: radial-gradient(ellipse 82% 77% at 50% 45%, black 42%, transparent 82%); mask-image: radial-gradient(ellipse 82% 77% at 50% 45%, black 42%, transparent 82%); opacity: 0; animation: fadeIn 0.8s ease-out 0.2s forwards; }
        .artwork { position: absolute; bottom: -100px; right: -130px; width: 450px; height: 450px; z-index: 2; object-fit: contain; transform: rotate(-30deg); opacity: 0; animation: slideInFromRight 0.7s ease-out 0.5s forwards; }
        .logo { position: absolute; bottom: 75px; left: 50%; transform: translateX(-50%); width: 260px; height: auto; max-height: 48px; z-index: 10; object-fit: contain; opacity: 0; animation: fadeIn 0.6s ease-out 1.2s forwards; }
        .text-area { position: relative; z-index: 10; padding-top: 60px; width: 100%; opacity: 0; animation: slideInFromTop 0.6s ease-out 0.1s forwards; }
        .headline { font-size: 36px; font-weight: 900; line-height: 1.1; margin-bottom: 20px; }
        .subheadline { font-size: 22px; line-height: 1.35; max-width: 85%; margin: 0 auto; }
        .price-bubble { position: absolute; z-index: 15; top: 385px; left: 25px; background-color: #ffffff; color: #004E9A; width: 200px; height: 200px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 8px 20px rgba(0,0,0,0.3); transform: rotate(-3deg); opacity: 0; animation: slideInFromLeft 0.6s ease-out 0.4s forwards; }
        .pb-title { font-size: 19px; font-weight: 700; line-height: 1.1; text-align: center; }
        .pb-price { font-size: 80px; font-weight: 900; line-height: 0.9; margin: 6px 0; letter-spacing: -3px; display: flex; align-items: flex-start; }
        .pb-currency { font-size: 40px; margin-top: 6px; margin-left: 2px; }
        .pb-date { font-size: 14px; font-weight: 600; text-align: center; line-height: 1.2; }
        .cta-button { position: absolute; z-index: 15; bottom: 135px; left: 50%; transform: translateX(-50%); background-color: #ffffff; color: #004E9A; text-decoration: none; font-weight: 700; font-size: 20px; padding: 18px 48px; border-radius: 35px; white-space: nowrap; box-shadow: 0 6px 15px rgba(0,0,0,0.2); opacity: 0; animation: scaleIn 0.5s ease-out 0.8s forwards, pulse 2s ease-in-out 2s infinite; }
        .address { position: absolute; bottom: 40px; width: 100%; text-align: center; font-size: 18px; font-weight: 400; z-index: 11; color: #fff; opacity: 0; animation: slideInFromBottom 0.5s ease-out 1s forwards; }
    </style>
</head>
<body>
    <div class="ad-container">
        <img src="{{image_url}}" alt="Dentist" class="main-image">
        <img src="{{artwork_url}}" alt="" class="artwork">
        <div class="text-area">
            <h1 class="headline">{{headline}}</h1>
            <p class="subheadline">{{subheadline}}</p>
        </div>
        <div class="price-bubble">
            <span class="pb-title">{{offer_title}}</span>
            <div class="pb-price">{{price}}<span class="pb-currency">€</span></div>
            <span class="pb-date">{{offer_date}}</span>
        </div>
        <a href="{{click_url}}" class="cta-button">{{cta_text}}</a>
        <img src="{{logo_url}}" alt="Suun Terveystalo" class="logo">
        <div class="address">{{branch_address}}</div>
    </div>
</body>
</html>',
    '[
        {"key": "headline", "label": "Otsikko", "type": "text", "required": true, "maxLength": 70},
        {"key": "subheadline", "label": "Alaotsikko", "type": "text", "required": false, "maxLength": 150},
        {"key": "offer_title", "label": "Tarjouksen otsikko", "type": "text", "required": true, "maxLength": 35},
        {"key": "price", "label": "Hinta", "type": "text", "required": true, "maxLength": 5},
        {"key": "offer_date", "label": "Tarjouspäivä", "type": "text", "required": false, "maxLength": 40},
        {"key": "cta_text", "label": "CTA teksti", "type": "text", "required": true, "maxLength": 25},
        {"key": "branch_address", "label": "Toimipisteen osoite", "type": "text", "required": false, "maxLength": 60},
        {"key": "image_url", "label": "Pääkuva URL", "type": "image", "required": true},
        {"key": "artwork_url", "label": "Artwork URL", "type": "image", "required": false},
        {"key": "logo_url", "label": "Logo URL", "type": "image", "required": true},
        {"key": "click_url", "label": "Klikkaus URL", "type": "url", "required": true}
    ]'::jsonb,
    '{
        "headline": "Hymyile.<br>Olet hyvissä käsissä.",
        "subheadline": "Sujuvampaa suunterveyttä Lahden Suun Terveystalossa.",
        "offer_title": "Hammas-<br>tarkastus",
        "price": "49",
        "offer_date": "Varaa viimeistään<br>28.10.",
        "cta_text": "Varaa aika",
        "branch_address": "Torikatu 1, Lahti",
        "image_url": "https://supabase-storage-url/suun-terveystalo/nainen.jpg",
        "artwork_url": "https://supabase-storage-url/suun-terveystalo/terveystalo-artwork.png",
        "logo_url": "https://supabase-storage-url/suun-terveystalo/SuunTerveystalo_logo.png",
        "click_url": "#"
    }'::jsonb,
    ARRAY['display', 'portrait', 'large', 'native', 'high-impact'],
    true,
    4
);

-- 5. 980x400 Display Banner (Leaderboard Wide)
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
    sort_order
) VALUES (
    'Suun Terveystalo 980x400',
    'Wide leaderboard display banner - Ideal for header/footer placements and billboard ads',
    'display',
    '980x400',
    980,
    400,
    '<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="ad.size" content="width=980,height=400">
    <title>980x400 Ad Banner - Suun Terveystalo</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #333; font-family: ''Montserrat'', sans-serif; }
        .ad-container { width: 980px; height: 400px; background-color: #08091A; position: relative; overflow: hidden; color: #ffffff; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInFromTop { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-50px) rotate(-3deg); } to { opacity: 1; transform: translateX(0) rotate(-3deg); } }
        @keyframes slideInFromRight { from { opacity: 0; transform: translateX(50px) rotate(-30deg); } to { opacity: 1; transform: translateX(0) rotate(-30deg); } }
        @keyframes slideInFromBottom { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; scale(0.8); } to { opacity: 1; scale(1); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .main-image { position: absolute; top: 0; left: 0; width: 500px; height: 100%; z-index: 1; object-fit: cover; object-position: center top; -webkit-mask-image: radial-gradient(ellipse 100% 90% at 30% 50%, black 40%, transparent 85%); mask-image: radial-gradient(ellipse 100% 90% at 30% 50%, black 40%, transparent 85%); opacity: 0; animation: fadeIn 0.8s ease-out 0.2s forwards; }
        .artwork { position: absolute; bottom: -80px; right: -100px; width: 350px; height: 350px; z-index: 2; object-fit: contain; transform: rotate(-30deg); opacity: 0; animation: slideInFromRight 0.7s ease-out 0.5s forwards; }
        .logo { position: absolute; bottom: 25px; left: 50%; transform: translateX(-50%); width: 180px; height: auto; max-height: 32px; z-index: 10; object-fit: contain; opacity: 0; animation: fadeIn 0.6s ease-out 1.2s forwards; }
        .text-area { position: absolute; z-index: 10; top: 50%; right: 60px; transform: translateY(-50%); width: 400px; text-align: left; opacity: 0; animation: slideInFromTop 0.6s ease-out 0.1s forwards; }
        .headline { font-size: 30px; font-weight: 900; line-height: 1.1; margin-bottom: 15px; }
        .subheadline { font-size: 16px; line-height: 1.35; max-width: 100%; }
        .price-bubble { position: absolute; z-index: 15; top: 50%; left: 380px; transform: translateY(-50%) rotate(-3deg); background-color: #ffffff; color: #004E9A; width: 140px; height: 140px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 6px 18px rgba(0,0,0,0.3); opacity: 0; animation: slideInFromLeft 0.6s ease-out 0.4s forwards; }
        .pb-title { font-size: 13px; font-weight: 700; line-height: 1.1; text-align: center; }
        .pb-price { font-size: 54px; font-weight: 900; line-height: 0.9; margin: 4px 0; letter-spacing: -2px; display: flex; align-items: flex-start; }
        .pb-currency { font-size: 28px; margin-top: 4px; margin-left: 2px; }
        .pb-date { font-size: 10px; font-weight: 600; text-align: center; line-height: 1.2; }
        .cta-button { position: absolute; z-index: 15; bottom: 70px; right: 120px; background-color: #ffffff; color: #004E9A; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 36px; border-radius: 28px; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.2); opacity: 0; animation: scaleIn 0.5s ease-out 0.8s forwards, pulse 2s ease-in-out 2s infinite; }
        .address { position: absolute; bottom: 10px; width: 100%; text-align: center; font-size: 12px; font-weight: 400; z-index: 11; color: #fff; opacity: 0; animation: slideInFromBottom 0.5s ease-out 1s forwards; }
    </style>
</head>
<body>
    <div class="ad-container">
        <img src="{{image_url}}" alt="Dentist" class="main-image">
        <img src="{{artwork_url}}" alt="" class="artwork">
        <div class="text-area">
            <h1 class="headline">{{headline}}</h1>
            <p class="subheadline">{{subheadline}}</p>
        </div>
        <div class="price-bubble">
            <span class="pb-title">{{offer_title}}</span>
            <div class="pb-price">{{price}}<span class="pb-currency">€</span></div>
            <span class="pb-date">{{offer_date}}</span>
        </div>
        <a href="{{click_url}}" class="cta-button">{{cta_text}}</a>
        <img src="{{logo_url}}" alt="Suun Terveystalo" class="logo">
        <div class="address">{{branch_address}}</div>
    </div>
</body>
</html>',
    '[
        {"key": "headline", "label": "Otsikko", "type": "text", "required": true, "maxLength": 60},
        {"key": "subheadline", "label": "Alaotsikko", "type": "text", "required": false, "maxLength": 120},
        {"key": "offer_title", "label": "Tarjouksen otsikko", "type": "text", "required": true, "maxLength": 30},
        {"key": "price", "label": "Hinta", "type": "text", "required": true, "maxLength": 5},
        {"key": "offer_date", "label": "Tarjouspäivä", "type": "text", "required": false, "maxLength": 35},
        {"key": "cta_text", "label": "CTA teksti", "type": "text", "required": true, "maxLength": 20},
        {"key": "branch_address", "label": "Toimipisteen osoite", "type": "text", "required": false, "maxLength": 50},
        {"key": "image_url", "label": "Pääkuva URL", "type": "image", "required": true},
        {"key": "artwork_url", "label": "Artwork URL", "type": "image", "required": false},
        {"key": "logo_url", "label": "Logo URL", "type": "image", "required": true},
        {"key": "click_url", "label": "Klikkaus URL", "type": "url", "required": true}
    ]'::jsonb,
    '{
        "headline": "Hymyile.<br>Olet hyvissä käsissä.",
        "subheadline": "Sujuvampaa suunterveyttä Lahden Suun Terveystalossa.",
        "offer_title": "Hammas-<br>tarkastus",
        "price": "49",
        "offer_date": "Varaa viimeistään<br>28.10.",
        "cta_text": "Varaa aika",
        "branch_address": "Torikatu 1, Lahti",
        "image_url": "https://supabase-storage-url/suun-terveystalo/nainen.jpg",
        "artwork_url": "https://supabase-storage-url/suun-terveystalo/terveystalo-artwork.png",
        "logo_url": "https://supabase-storage-url/suun-terveystalo/SuunTerveystalo_logo.png",
        "click_url": "#"
    }'::jsonb,
    ARRAY['display', 'leaderboard', 'wide', 'billboard', 'header'],
    true,
    5
);

-- 6. 1080x1920 PDOOH Banner (Full HD Portrait - Digital Out of Home)
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
    sort_order
) VALUES (
    'Suun Terveystalo 1080x1920 PDOOH',
    'Full HD portrait PDOOH banner - For digital out-of-home screens, shopping malls, transit displays',
    'pdooh',
    '1080x1920',
    1080,
    1920,
    '<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="ad.size" content="width=1080,height=1920">
    <title>1080x1920 PDOOH Ad Banner - Suun Terveystalo</title>
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;600;700;900&display=swap" rel="stylesheet">
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #333; font-family: ''Montserrat'', sans-serif; }
        .ad-container { width: 1080px; height: 1920px; background-color: #08091A; position: relative; overflow: hidden; color: #ffffff; text-align: center; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInFromTop { from { opacity: 0; transform: translateY(-60px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-80px) rotate(-3deg); } to { opacity: 1; transform: translateX(0) rotate(-3deg); } }
        @keyframes slideInFromRight { from { opacity: 0; transform: translateX(80px) rotate(-30deg); } to { opacity: 1; transform: translateX(0) rotate(-30deg); } }
        @keyframes slideInFromBottom { from { opacity: 0; transform: translateY(60px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: translateX(-50%) scale(0.8); } to { opacity: 1; transform: translateX(-50%) scale(1); } }
        @keyframes pulse { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.05); } }
        .main-image { position: absolute; top: 300px; left: 0; width: 100%; height: 1100px; z-index: 1; object-fit: cover; object-position: center top; -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 45%, black 45%, transparent 85%); mask-image: radial-gradient(ellipse 80% 70% at 50% 45%, black 45%, transparent 85%); opacity: 0; animation: fadeIn 0.8s ease-out 0.2s forwards; }
        .artwork { position: absolute; bottom: -200px; right: -220px; width: 800px; height: 800px; z-index: 2; object-fit: contain; transform: rotate(-30deg); opacity: 0; animation: slideInFromRight 0.7s ease-out 0.5s forwards; }
        .logo { position: absolute; bottom: 150px; left: 50%; transform: translateX(-50%); width: 420px; height: auto; max-height: 75px; z-index: 10; object-fit: contain; opacity: 0; animation: fadeIn 0.6s ease-out 1.2s forwards; }
        .text-area { position: relative; z-index: 10; padding-top: 120px; width: 100%; opacity: 0; animation: slideInFromTop 0.6s ease-out 0.1s forwards; }
        .headline { font-size: 64px; font-weight: 900; line-height: 1.1; margin-bottom: 35px; }
        .subheadline { font-size: 38px; line-height: 1.35; max-width: 85%; margin: 0 auto; }
        .price-bubble { position: absolute; z-index: 15; top: 820px; left: 50px; background-color: #ffffff; color: #004E9A; width: 340px; height: 340px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 12px 30px rgba(0,0,0,0.3); transform: rotate(-3deg); opacity: 0; animation: slideInFromLeft 0.6s ease-out 0.4s forwards; }
        .pb-title { font-size: 32px; font-weight: 700; line-height: 1.1; text-align: center; }
        .pb-price { font-size: 130px; font-weight: 900; line-height: 0.9; margin: 10px 0; letter-spacing: -5px; display: flex; align-items: flex-start; }
        .pb-currency { font-size: 65px; margin-top: 10px; margin-left: 3px; }
        .pb-date { font-size: 24px; font-weight: 600; text-align: center; line-height: 1.2; }
        .cta-button { position: absolute; z-index: 15; bottom: 250px; left: 50%; transform: translateX(-50%); background-color: #ffffff; color: #004E9A; text-decoration: none; font-weight: 700; font-size: 36px; padding: 30px 80px; border-radius: 50px; white-space: nowrap; box-shadow: 0 8px 25px rgba(0,0,0,0.2); opacity: 0; animation: scaleIn 0.5s ease-out 0.8s forwards, pulse 2s ease-in-out 2s infinite; }
        .address { position: absolute; bottom: 70px; width: 100%; text-align: center; font-size: 32px; font-weight: 400; z-index: 11; color: #fff; opacity: 0; animation: slideInFromBottom 0.5s ease-out 1s forwards; }
    </style>
</head>
<body>
    <div class="ad-container">
        <img src="{{image_url}}" alt="Dentist" class="main-image">
        <img src="{{artwork_url}}" alt="" class="artwork">
        <div class="text-area">
            <h1 class="headline">{{headline}}</h1>
            <p class="subheadline">{{subheadline}}</p>
        </div>
        <div class="price-bubble">
            <span class="pb-title">{{offer_title}}</span>
            <div class="pb-price">{{price}}<span class="pb-currency">€</span></div>
            <span class="pb-date">{{offer_date}}</span>
        </div>
        <a href="{{click_url}}" class="cta-button">{{cta_text}}</a>
        <img src="{{logo_url}}" alt="Suun Terveystalo" class="logo">
        <div class="address">{{branch_address}}</div>
    </div>
</body>
</html>',
    '[
        {"key": "headline", "label": "Otsikko", "type": "text", "required": true, "maxLength": 80},
        {"key": "subheadline", "label": "Alaotsikko", "type": "text", "required": false, "maxLength": 160},
        {"key": "offer_title", "label": "Tarjouksen otsikko", "type": "text", "required": true, "maxLength": 40},
        {"key": "price", "label": "Hinta", "type": "text", "required": true, "maxLength": 5},
        {"key": "offer_date", "label": "Tarjouspäivä", "type": "text", "required": false, "maxLength": 45},
        {"key": "cta_text", "label": "CTA teksti", "type": "text", "required": true, "maxLength": 25},
        {"key": "branch_address", "label": "Toimipisteen osoite", "type": "text", "required": false, "maxLength": 70},
        {"key": "image_url", "label": "Pääkuva URL", "type": "image", "required": true},
        {"key": "artwork_url", "label": "Artwork URL", "type": "image", "required": false},
        {"key": "logo_url", "label": "Logo URL", "type": "image", "required": true},
        {"key": "click_url", "label": "Klikkaus URL", "type": "url", "required": false}
    ]'::jsonb,
    '{
        "headline": "Hymyile.<br>Olet hyvissä käsissä.",
        "subheadline": "Sujuvampaa suunterveyttä Lahden Suun Terveystalossa.",
        "offer_title": "Hammas-<br>tarkastus",
        "price": "49",
        "offer_date": "Varaa viimeistään<br>28.10.",
        "cta_text": "Varaa aika",
        "branch_address": "Torikatu 1, Lahti",
        "image_url": "https://supabase-storage-url/suun-terveystalo/nainen.jpg",
        "artwork_url": "https://supabase-storage-url/suun-terveystalo/terveystalo-artwork.png",
        "logo_url": "https://supabase-storage-url/suun-terveystalo/SuunTerveystalo_logo.png",
        "click_url": "#"
    }'::jsonb,
    ARRAY['pdooh', 'digital-out-of-home', 'full-hd', 'portrait', 'mall', 'transit'],
    true,
    6
);

-- ============================================================================
-- CREATE VIEW FOR TEMPLATE SUMMARY
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
    created_at,
    updated_at
FROM creative_templates
ORDER BY sort_order;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT SELECT ON creative_templates_summary TO authenticated;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
