-- ============================================================================
-- SUUN TERVEYSTALO - UPDATE CREATIVE TEMPLATES
-- Version: 1.1.0
-- Date: 2026-02-16
-- Description: Update templates with Terveystalo fonts, remove rotation from
--              price bubble, add disclaimer text to PDOOH offer templates
-- ============================================================================

-- ============================================================================
-- UPDATE ALL TEMPLATES: Replace Montserrat with TerveystaloSans font
-- Remove rotation from price bubble and slideInFromLeft animation
-- ============================================================================

-- Define common font-face CSS to inject
-- Font declaration string for @font-face
-- Note: Using single quotes escaped as '' in PostgreSQL

-- 1. UPDATE 300x300 Template
UPDATE creative_templates 
SET html_template = '<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="ad.size" content="width=300,height=300">
    <title>300x300 Ad Banner - Suun Terveystalo</title>
    <style>
        @font-face { font-family: ''TerveystaloSans''; src: url(''/font/TerveystaloSans-Regular.woff2'') format(''woff2''), url(''/font/TerveystaloSans-Regular.woff'') format(''woff''); font-weight: 400; font-style: normal; }
        @font-face { font-family: ''TerveystaloSans''; src: url(''/font/TerveystaloSans-SemiBold.woff2'') format(''woff2''), url(''/font/TerveystaloSans-SemiBold.woff'') format(''woff''); font-weight: 600; font-style: normal; }
        @font-face { font-family: ''TerveystaloSans''; src: url(''/font/TerveystaloSans-Bold.woff2'') format(''woff2''), url(''/font/TerveystaloSans-Bold.woff'') format(''woff''); font-weight: 700; font-style: normal; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #333; font-family: ''TerveystaloSans'', sans-serif; }
        .ad-container { width: 300px; height: 300px; background-color: #08091A; position: relative; overflow: hidden; color: #ffffff; text-align: center; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInFromTop { from { opacity: 0; transform: translateY(-20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-30px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInFromRight { from { opacity: 0; transform: translateX(30px) rotate(-30deg); } to { opacity: 1; transform: translateX(0) rotate(-30deg); } }
        @keyframes slideInFromBottom { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: translateX(-50%) scale(0.8); } to { opacity: 1; transform: translateX(-50%) scale(1); } }
        @keyframes pulse { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.05); } }
        .main-image { position: absolute; top: 50px; left: 0; width: 100%; height: 200px; z-index: 1; object-fit: cover; object-position: center top; -webkit-mask-image: radial-gradient(ellipse 85% 80% at 50% 45%, black 40%, transparent 80%); mask-image: radial-gradient(ellipse 85% 80% at 50% 45%, black 40%, transparent 80%); opacity: 0; animation: fadeIn 0.8s ease-out 0.2s forwards; }
        .artwork { position: absolute; bottom: -45px; right: -55px; width: 180px; height: 180px; z-index: 2; object-fit: contain; transform: rotate(-30deg); opacity: 0; animation: slideInFromRight 0.7s ease-out 0.5s forwards; }
        .logo { position: absolute; bottom: 28px; left: 50%; transform: translateX(-50%); width: 120px; height: auto; max-height: 22px; z-index: 10; object-fit: contain; opacity: 0; animation: fadeIn 0.6s ease-out 1.2s forwards; }
        .text-area { position: relative; z-index: 10; padding-top: 20px; width: 100%; opacity: 0; animation: slideInFromTop 0.6s ease-out 0.1s forwards; }
        .headline { font-size: 14px; font-weight: 700; line-height: 1.1; margin-bottom: 8px; }
        .subheadline { font-size: 9px; line-height: 1.35; max-width: 90%; margin: 0 auto; }
        .price-bubble { position: absolute; z-index: 15; top: 125px; left: 12px; background-color: #ffffff; color: #004E9A; width: 85px; height: 85px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 4px 12px rgba(0,0,0,0.3); opacity: 0; animation: slideInFromLeft 0.6s ease-out 0.4s forwards; }
        .pb-title { font-size: 8px; font-weight: 700; line-height: 1.1; text-align: center; }
        .pb-price { font-size: 32px; font-weight: 700; line-height: 0.9; margin: 2px 0; letter-spacing: -1px; display: flex; align-items: flex-start; }
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
updated_at = NOW()
WHERE name = 'Suun Terveystalo 300x300';

-- 2. UPDATE 300x431 Template
UPDATE creative_templates 
SET html_template = '<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="ad.size" content="width=300,height=431">
    <title>300x431 Ad Banner - Suun Terveystalo</title>
    <style>
        @font-face { font-family: ''TerveystaloSans''; src: url(''/font/TerveystaloSans-Regular.woff2'') format(''woff2''), url(''/font/TerveystaloSans-Regular.woff'') format(''woff''); font-weight: 400; font-style: normal; }
        @font-face { font-family: ''TerveystaloSans''; src: url(''/font/TerveystaloSans-SemiBold.woff2'') format(''woff2''), url(''/font/TerveystaloSans-SemiBold.woff'') format(''woff''); font-weight: 600; font-style: normal; }
        @font-face { font-family: ''TerveystaloSans''; src: url(''/font/TerveystaloSans-Bold.woff2'') format(''woff2''), url(''/font/TerveystaloSans-Bold.woff'') format(''woff''); font-weight: 700; font-style: normal; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #333; font-family: ''TerveystaloSans'', sans-serif; }
        .ad-container { width: 300px; height: 431px; background-color: #08091A; position: relative; overflow: hidden; color: #ffffff; text-align: center; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInFromTop { from { opacity: 0; transform: translateY(-25px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-40px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInFromRight { from { opacity: 0; transform: translateX(40px) rotate(-30deg); } to { opacity: 1; transform: translateX(0) rotate(-30deg); } }
        @keyframes slideInFromBottom { from { opacity: 0; transform: translateY(25px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: translateX(-50%) scale(0.8); } to { opacity: 1; transform: translateX(-50%) scale(1); } }
        @keyframes pulse { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.05); } }
        .main-image { position: absolute; top: 70px; left: 0; width: 100%; height: 280px; z-index: 1; object-fit: cover; object-position: center top; -webkit-mask-image: radial-gradient(ellipse 82% 77% at 50% 45%, black 42%, transparent 82%); mask-image: radial-gradient(ellipse 82% 77% at 50% 45%, black 42%, transparent 82%); opacity: 0; animation: fadeIn 0.8s ease-out 0.2s forwards; }
        .artwork { position: absolute; bottom: -50px; right: -65px; width: 220px; height: 220px; z-index: 2; object-fit: contain; transform: rotate(-30deg); opacity: 0; animation: slideInFromRight 0.7s ease-out 0.5s forwards; }
        .logo { position: absolute; bottom: 38px; left: 50%; transform: translateX(-50%); width: 140px; height: auto; max-height: 26px; z-index: 10; object-fit: contain; opacity: 0; animation: fadeIn 0.6s ease-out 1.2s forwards; }
        .text-area { position: relative; z-index: 10; padding-top: 28px; width: 100%; opacity: 0; animation: slideInFromTop 0.6s ease-out 0.1s forwards; }
        .headline { font-size: 18px; font-weight: 700; line-height: 1.1; margin-bottom: 10px; }
        .subheadline { font-size: 12px; line-height: 1.35; max-width: 90%; margin: 0 auto; }
        .price-bubble { position: absolute; z-index: 15; top: 185px; left: 12px; background-color: #ffffff; color: #004E9A; width: 100px; height: 100px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 4px 12px rgba(0,0,0,0.3); opacity: 0; animation: slideInFromLeft 0.6s ease-out 0.4s forwards; }
        .pb-title { font-size: 10px; font-weight: 700; line-height: 1.1; text-align: center; }
        .pb-price { font-size: 40px; font-weight: 700; line-height: 0.9; margin: 3px 0; letter-spacing: -1px; display: flex; align-items: flex-start; }
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
updated_at = NOW()
WHERE name = 'Suun Terveystalo 300x431';

-- 3. UPDATE 300x600 Template
UPDATE creative_templates 
SET html_template = '<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="ad.size" content="width=300,height=600">
    <title>300x600 Ad Banner - Suun Terveystalo</title>
    <style>
        @font-face { font-family: ''TerveystaloSans''; src: url(''/font/TerveystaloSans-Regular.woff2'') format(''woff2''), url(''/font/TerveystaloSans-Regular.woff'') format(''woff''); font-weight: 400; font-style: normal; }
        @font-face { font-family: ''TerveystaloSans''; src: url(''/font/TerveystaloSans-SemiBold.woff2'') format(''woff2''), url(''/font/TerveystaloSans-SemiBold.woff'') format(''woff''); font-weight: 600; font-style: normal; }
        @font-face { font-family: ''TerveystaloSans''; src: url(''/font/TerveystaloSans-Bold.woff2'') format(''woff2''), url(''/font/TerveystaloSans-Bold.woff'') format(''woff''); font-weight: 700; font-style: normal; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #333; font-family: ''TerveystaloSans'', sans-serif; }
        .ad-container { width: 300px; height: 600px; background-color: #08091A; position: relative; overflow: hidden; color: #ffffff; text-align: center; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInFromTop { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-50px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInFromRight { from { opacity: 0; transform: translateX(50px) rotate(-30deg); } to { opacity: 1; transform: translateX(0) rotate(-30deg); } }
        @keyframes slideInFromBottom { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: translateX(-50%) scale(0.8); } to { opacity: 1; transform: translateX(-50%) scale(1); } }
        @keyframes pulse { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.05); } }
        .main-image { position: absolute; top: 100px; left: 0; width: 100%; height: 400px; z-index: 1; object-fit: cover; object-position: center top; -webkit-mask-image: radial-gradient(ellipse 82% 77% at 50% 45%, black 42%, transparent 82%); mask-image: radial-gradient(ellipse 82% 77% at 50% 45%, black 42%, transparent 82%); opacity: 0; animation: fadeIn 0.8s ease-out 0.2s forwards; }
        .artwork { position: absolute; bottom: -70px; right: -90px; width: 306px; height: 306px; z-index: 2; object-fit: contain; transform: rotate(-30deg); opacity: 0; animation: slideInFromRight 0.7s ease-out 0.5s forwards; }
        .logo { position: absolute; bottom: 50px; left: 50%; transform: translateX(-50%); width: 180px; height: auto; max-height: 32px; z-index: 10; object-fit: contain; opacity: 0; animation: fadeIn 0.6s ease-out 1.2s forwards; }
        .text-area { position: relative; z-index: 10; padding-top: 40px; width: 100%; opacity: 0; animation: slideInFromTop 0.6s ease-out 0.1s forwards; }
        .headline { font-size: 24px; font-weight: 700; line-height: 1.1; margin-bottom: 15px; }
        .subheadline { font-size: 16px; line-height: 1.35; max-width: 90%; margin: 0 auto; }
        .price-bubble { position: absolute; z-index: 15; top: 260px; left: 15px; background-color: #ffffff; color: #004E9A; width: 135px; height: 135px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 5px 15px rgba(0,0,0,0.3); opacity: 0; animation: slideInFromLeft 0.6s ease-out 0.4s forwards; }
        .pb-title { font-size: 13px; font-weight: 700; line-height: 1.1; text-align: center; }
        .pb-price { font-size: 54px; font-weight: 700; line-height: 0.9; margin: 4px 0; letter-spacing: -2px; display: flex; align-items: flex-start; }
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
updated_at = NOW()
WHERE name = 'Suun Terveystalo 300x600';

-- 4. UPDATE 620x891 Template
UPDATE creative_templates 
SET html_template = '<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="ad.size" content="width=620,height=891">
    <title>620x891 Ad Banner - Suun Terveystalo</title>
    <style>
        @font-face { font-family: ''TerveystaloSans''; src: url(''/font/TerveystaloSans-Regular.woff2'') format(''woff2''), url(''/font/TerveystaloSans-Regular.woff'') format(''woff''); font-weight: 400; font-style: normal; }
        @font-face { font-family: ''TerveystaloSans''; src: url(''/font/TerveystaloSans-SemiBold.woff2'') format(''woff2''), url(''/font/TerveystaloSans-SemiBold.woff'') format(''woff''); font-weight: 600; font-style: normal; }
        @font-face { font-family: ''TerveystaloSans''; src: url(''/font/TerveystaloSans-Bold.woff2'') format(''woff2''), url(''/font/TerveystaloSans-Bold.woff'') format(''woff''); font-weight: 700; font-style: normal; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #333; font-family: ''TerveystaloSans'', sans-serif; }
        .ad-container { width: 620px; height: 891px; background-color: #08091A; position: relative; overflow: hidden; color: #ffffff; text-align: center; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInFromTop { from { opacity: 0; transform: translateY(-40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-60px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInFromRight { from { opacity: 0; transform: translateX(60px) rotate(-30deg); } to { opacity: 1; transform: translateX(0) rotate(-30deg); } }
        @keyframes slideInFromBottom { from { opacity: 0; transform: translateY(40px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: translateX(-50%) scale(0.8); } to { opacity: 1; transform: translateX(-50%) scale(1); } }
        @keyframes pulse { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.05); } }
        .main-image { position: absolute; top: 150px; left: 0; width: 100%; height: 580px; z-index: 1; object-fit: cover; object-position: center top; -webkit-mask-image: radial-gradient(ellipse 82% 77% at 50% 45%, black 42%, transparent 82%); mask-image: radial-gradient(ellipse 82% 77% at 50% 45%, black 42%, transparent 82%); opacity: 0; animation: fadeIn 0.8s ease-out 0.2s forwards; }
        .artwork { position: absolute; bottom: -100px; right: -130px; width: 450px; height: 450px; z-index: 2; object-fit: contain; transform: rotate(-30deg); opacity: 0; animation: slideInFromRight 0.7s ease-out 0.5s forwards; }
        .logo { position: absolute; bottom: 75px; left: 50%; transform: translateX(-50%); width: 260px; height: auto; max-height: 48px; z-index: 10; object-fit: contain; opacity: 0; animation: fadeIn 0.6s ease-out 1.2s forwards; }
        .text-area { position: relative; z-index: 10; padding-top: 60px; width: 100%; opacity: 0; animation: slideInFromTop 0.6s ease-out 0.1s forwards; }
        .headline { font-size: 36px; font-weight: 700; line-height: 1.1; margin-bottom: 20px; }
        .subheadline { font-size: 22px; line-height: 1.35; max-width: 85%; margin: 0 auto; }
        .price-bubble { position: absolute; z-index: 15; top: 385px; left: 25px; background-color: #ffffff; color: #004E9A; width: 200px; height: 200px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 8px 20px rgba(0,0,0,0.3); opacity: 0; animation: slideInFromLeft 0.6s ease-out 0.4s forwards; }
        .pb-title { font-size: 19px; font-weight: 700; line-height: 1.1; text-align: center; }
        .pb-price { font-size: 80px; font-weight: 700; line-height: 0.9; margin: 6px 0; letter-spacing: -3px; display: flex; align-items: flex-start; }
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
updated_at = NOW()
WHERE name = 'Suun Terveystalo 620x891';

-- 5. UPDATE 980x400 Template (PDOOH Horizontal - with disclaimer)
UPDATE creative_templates 
SET html_template = '<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="ad.size" content="width=980,height=400">
    <title>980x400 PDOOH Ad Banner - Suun Terveystalo</title>
    <style>
        @font-face { font-family: ''TerveystaloSans''; src: url(''/font/TerveystaloSans-Regular.woff2'') format(''woff2''), url(''/font/TerveystaloSans-Regular.woff'') format(''woff''); font-weight: 400; font-style: normal; }
        @font-face { font-family: ''TerveystaloSans''; src: url(''/font/TerveystaloSans-SemiBold.woff2'') format(''woff2''), url(''/font/TerveystaloSans-SemiBold.woff'') format(''woff''); font-weight: 600; font-style: normal; }
        @font-face { font-family: ''TerveystaloSans''; src: url(''/font/TerveystaloSans-Bold.woff2'') format(''woff2''), url(''/font/TerveystaloSans-Bold.woff'') format(''woff''); font-weight: 700; font-style: normal; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #333; font-family: ''TerveystaloSans'', sans-serif; }
        .ad-container { width: 980px; height: 400px; background-color: #08091A; position: relative; overflow: hidden; color: #ffffff; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInFromTop { from { opacity: 0; transform: translateY(-30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-50px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInFromRight { from { opacity: 0; transform: translateX(50px) rotate(-30deg); } to { opacity: 1; transform: translateX(0) rotate(-30deg); } }
        @keyframes slideInFromBottom { from { opacity: 0; transform: translateY(30px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; scale(0.8); } to { opacity: 1; scale(1); } }
        @keyframes pulse { 0%, 100% { transform: scale(1); } 50% { transform: scale(1.05); } }
        .main-image { position: absolute; top: 0; left: 0; width: 500px; height: 100%; z-index: 1; object-fit: cover; object-position: center top; -webkit-mask-image: radial-gradient(ellipse 100% 90% at 30% 50%, black 40%, transparent 85%); mask-image: radial-gradient(ellipse 100% 90% at 30% 50%, black 40%, transparent 85%); opacity: 0; animation: fadeIn 0.8s ease-out 0.2s forwards; }
        .artwork { position: absolute; bottom: -80px; right: -100px; width: 350px; height: 350px; z-index: 2; object-fit: contain; transform: rotate(-30deg); opacity: 0; animation: slideInFromRight 0.7s ease-out 0.5s forwards; }
        .logo { position: absolute; bottom: 25px; left: 50%; transform: translateX(-50%); width: 180px; height: auto; max-height: 32px; z-index: 10; object-fit: contain; opacity: 0; animation: fadeIn 0.6s ease-out 1.2s forwards; }
        .text-area { position: absolute; z-index: 10; top: 50%; right: 60px; transform: translateY(-50%); width: 400px; text-align: left; opacity: 0; animation: slideInFromTop 0.6s ease-out 0.1s forwards; }
        .headline { font-size: 30px; font-weight: 700; line-height: 1.1; margin-bottom: 15px; }
        .subheadline { font-size: 16px; line-height: 1.35; max-width: 100%; }
        .price-bubble { position: absolute; z-index: 15; top: 50%; left: 380px; transform: translateY(-50%); background-color: #ffffff; color: #004E9A; width: 140px; height: 140px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 6px 18px rgba(0,0,0,0.3); opacity: 0; animation: slideInFromLeft 0.6s ease-out 0.4s forwards; }
        .pb-title { font-size: 13px; font-weight: 700; line-height: 1.1; text-align: center; }
        .pb-price { font-size: 54px; font-weight: 700; line-height: 0.9; margin: 4px 0; letter-spacing: -2px; display: flex; align-items: flex-start; }
        .pb-currency { font-size: 28px; margin-top: 4px; margin-left: 2px; }
        .pb-date { font-size: 10px; font-weight: 600; text-align: center; line-height: 1.2; }
        .cta-button { position: absolute; z-index: 15; bottom: 70px; right: 120px; background-color: #ffffff; color: #004E9A; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 36px; border-radius: 28px; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.2); opacity: 0; animation: scaleIn 0.5s ease-out 0.8s forwards, pulse 2s ease-in-out 2s infinite; }
        .address { position: absolute; bottom: 25px; width: 100%; text-align: center; font-size: 12px; font-weight: 400; z-index: 11; color: #fff; opacity: 0; animation: slideInFromBottom 0.5s ease-out 1s forwards; }
        .disclaimer { position: absolute; bottom: 5px; left: 0; right: 0; padding: 0 20px; text-align: center; font-size: 7px; font-weight: 400; line-height: 1.3; z-index: 11; color: rgba(255,255,255,0.7); opacity: 0; animation: fadeIn 0.5s ease-out 1.2s forwards; }
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
        <div class="disclaimer">{{disclaimer_text}}</div>
    </div>
</body>
</html>',
placeholders = '[
    {"key": "headline", "label": "Otsikko", "type": "text", "required": true, "maxLength": 60},
    {"key": "subheadline", "label": "Alaotsikko", "type": "text", "required": false, "maxLength": 120},
    {"key": "offer_title", "label": "Tarjouksen otsikko", "type": "text", "required": true, "maxLength": 30},
    {"key": "price", "label": "Hinta", "type": "text", "required": true, "maxLength": 5},
    {"key": "offer_date", "label": "Tarjouspäivä", "type": "text", "required": false, "maxLength": 35},
    {"key": "cta_text", "label": "CTA teksti", "type": "text", "required": true, "maxLength": 20},
    {"key": "branch_address", "label": "Toimipisteen osoite", "type": "text", "required": false, "maxLength": 50},
    {"key": "disclaimer_text", "label": "Vastuuvapauslauseke", "type": "textarea", "required": false, "maxLength": 500},
    {"key": "image_url", "label": "Pääkuva URL", "type": "image", "required": true},
    {"key": "artwork_url", "label": "Artwork URL", "type": "image", "required": false},
    {"key": "logo_url", "label": "Logo URL", "type": "image", "required": true},
    {"key": "click_url", "label": "Klikkaus URL", "type": "url", "required": true}
]'::jsonb,
default_values = '{
    "headline": "Hymyile.<br>Olet hyvissä käsissä.",
    "subheadline": "Sujuvampaa suunterveyttä Lahden Suun Terveystalossa.",
    "offer_title": "Hammas-<br>tarkastus",
    "price": "49",
    "offer_date": "Varaa viimeistään<br>28.10.",
    "cta_text": "Varaa aika",
    "branch_address": "Torikatu 1, Lahti",
    "disclaimer_text": "Tarjous voimassa uusille asiakkaille tai jos edellisestä käynnistäsi on kulunut 3 vuotta. Tarjous koskee arkiaikoja, aika on varattava 22.2.2026 mennessä ja vastaanotolla on käytävä 31.3.2026 mennessä. Hinta sisältää Kela-korvauksen, käyntimaksun ja kanta-maksun. Kampanjan tarkat ehdot ja ohjeet kampanjasivulla terveystalo.com/suunterveystalo.",
    "image_url": "https://supabase-storage-url/suun-terveystalo/nainen.jpg",
    "artwork_url": "https://supabase-storage-url/suun-terveystalo/terveystalo-artwork.png",
    "logo_url": "https://supabase-storage-url/suun-terveystalo/SuunTerveystalo_logo.png",
    "click_url": "#"
}'::jsonb,
updated_at = NOW()
WHERE name = 'Suun Terveystalo 980x400';

-- 6. UPDATE 1080x1920 PDOOH Template (with disclaimer)
UPDATE creative_templates 
SET html_template = '<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="ad.size" content="width=1080,height=1920">
    <title>1080x1920 PDOOH Ad Banner - Suun Terveystalo</title>
    <style>
        @font-face { font-family: ''TerveystaloSans''; src: url(''/font/TerveystaloSans-Regular.woff2'') format(''woff2''), url(''/font/TerveystaloSans-Regular.woff'') format(''woff''); font-weight: 400; font-style: normal; }
        @font-face { font-family: ''TerveystaloSans''; src: url(''/font/TerveystaloSans-SemiBold.woff2'') format(''woff2''), url(''/font/TerveystaloSans-SemiBold.woff'') format(''woff''); font-weight: 600; font-style: normal; }
        @font-face { font-family: ''TerveystaloSans''; src: url(''/font/TerveystaloSans-Bold.woff2'') format(''woff2''), url(''/font/TerveystaloSans-Bold.woff'') format(''woff''); font-weight: 700; font-style: normal; }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #333; font-family: ''TerveystaloSans'', sans-serif; }
        .ad-container { width: 1080px; height: 1920px; background-color: #08091A; position: relative; overflow: hidden; color: #ffffff; text-align: center; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes slideInFromTop { from { opacity: 0; transform: translateY(-60px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes slideInFromLeft { from { opacity: 0; transform: translateX(-80px); } to { opacity: 1; transform: translateX(0); } }
        @keyframes slideInFromRight { from { opacity: 0; transform: translateX(80px) rotate(-30deg); } to { opacity: 1; transform: translateX(0) rotate(-30deg); } }
        @keyframes slideInFromBottom { from { opacity: 0; transform: translateY(60px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes scaleIn { from { opacity: 0; transform: translateX(-50%) scale(0.8); } to { opacity: 1; transform: translateX(-50%) scale(1); } }
        @keyframes pulse { 0%, 100% { transform: translateX(-50%) scale(1); } 50% { transform: translateX(-50%) scale(1.05); } }
        .main-image { position: absolute; top: 300px; left: 0; width: 100%; height: 1100px; z-index: 1; object-fit: cover; object-position: center top; -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 45%, black 45%, transparent 85%); mask-image: radial-gradient(ellipse 80% 70% at 50% 45%, black 45%, transparent 85%); opacity: 0; animation: fadeIn 0.8s ease-out 0.2s forwards; }
        .artwork { position: absolute; bottom: -200px; right: -220px; width: 800px; height: 800px; z-index: 2; object-fit: contain; transform: rotate(-30deg); opacity: 0; animation: slideInFromRight 0.7s ease-out 0.5s forwards; }
        .logo { position: absolute; bottom: 150px; left: 50%; transform: translateX(-50%); width: 420px; height: auto; max-height: 75px; z-index: 10; object-fit: contain; opacity: 0; animation: fadeIn 0.6s ease-out 1.2s forwards; }
        .text-area { position: relative; z-index: 10; padding-top: 120px; width: 100%; opacity: 0; animation: slideInFromTop 0.6s ease-out 0.1s forwards; }
        .headline { font-size: 64px; font-weight: 700; line-height: 1.1; margin-bottom: 35px; }
        .subheadline { font-size: 38px; line-height: 1.35; max-width: 85%; margin: 0 auto; }
        .price-bubble { position: absolute; z-index: 15; top: 820px; left: 50px; background-color: #ffffff; color: #004E9A; width: 340px; height: 340px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 12px 30px rgba(0,0,0,0.3); opacity: 0; animation: slideInFromLeft 0.6s ease-out 0.4s forwards; }
        .pb-title { font-size: 32px; font-weight: 700; line-height: 1.1; text-align: center; }
        .pb-price { font-size: 130px; font-weight: 700; line-height: 0.9; margin: 10px 0; letter-spacing: -5px; display: flex; align-items: flex-start; }
        .pb-currency { font-size: 65px; margin-top: 10px; margin-left: 3px; }
        .pb-date { font-size: 24px; font-weight: 600; text-align: center; line-height: 1.2; }
        .cta-button { position: absolute; z-index: 15; bottom: 250px; left: 50%; transform: translateX(-50%); background-color: #ffffff; color: #004E9A; text-decoration: none; font-weight: 700; font-size: 36px; padding: 30px 80px; border-radius: 50px; white-space: nowrap; box-shadow: 0 8px 25px rgba(0,0,0,0.2); opacity: 0; animation: scaleIn 0.5s ease-out 0.8s forwards, pulse 2s ease-in-out 2s infinite; }
        .address { position: absolute; bottom: 100px; width: 100%; text-align: center; font-size: 32px; font-weight: 400; z-index: 11; color: #fff; opacity: 0; animation: slideInFromBottom 0.5s ease-out 1s forwards; }
        .disclaimer { position: absolute; bottom: 20px; left: 0; right: 0; padding: 0 40px; text-align: center; font-size: 16px; font-weight: 400; line-height: 1.3; z-index: 11; color: rgba(255,255,255,0.7); opacity: 0; animation: fadeIn 0.5s ease-out 1.2s forwards; }
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
        <div class="disclaimer">{{disclaimer_text}}</div>
    </div>
</body>
</html>',
placeholders = '[
    {"key": "headline", "label": "Otsikko", "type": "text", "required": true, "maxLength": 80},
    {"key": "subheadline", "label": "Alaotsikko", "type": "text", "required": false, "maxLength": 160},
    {"key": "offer_title", "label": "Tarjouksen otsikko", "type": "text", "required": true, "maxLength": 40},
    {"key": "price", "label": "Hinta", "type": "text", "required": true, "maxLength": 5},
    {"key": "offer_date", "label": "Tarjouspäivä", "type": "text", "required": false, "maxLength": 45},
    {"key": "cta_text", "label": "CTA teksti", "type": "text", "required": true, "maxLength": 25},
    {"key": "branch_address", "label": "Toimipisteen osoite", "type": "text", "required": false, "maxLength": 70},
    {"key": "disclaimer_text", "label": "Vastuuvapauslauseke", "type": "textarea", "required": false, "maxLength": 500},
    {"key": "image_url", "label": "Pääkuva URL", "type": "image", "required": true},
    {"key": "artwork_url", "label": "Artwork URL", "type": "image", "required": false},
    {"key": "logo_url", "label": "Logo URL", "type": "image", "required": true},
    {"key": "click_url", "label": "Klikkaus URL", "type": "url", "required": false}
]'::jsonb,
default_values = '{
    "headline": "Hymyile.<br>Olet hyvissä käsissä.",
    "subheadline": "Sujuvampaa suunterveyttä Lahden Suun Terveystalossa.",
    "offer_title": "Hammas-<br>tarkastus",
    "price": "49",
    "offer_date": "Varaa viimeistään<br>28.10.",
    "cta_text": "Varaa aika",
    "branch_address": "Torikatu 1, Lahti",
    "disclaimer_text": "Tarjous voimassa uusille asiakkaille tai jos edellisestä käynnistäsi on kulunut 3 vuotta. Tarjous koskee arkiaikoja, aika on varattava 22.2.2026 mennessä ja vastaanotolla on käytävä 31.3.2026 mennessä. Hinta sisältää Kela-korvauksen, käyntimaksun ja kanta-maksun. Kampanjan tarkat ehdot ja ohjeet kampanjasivulla terveystalo.com/suunterveystalo.",
    "image_url": "https://supabase-storage-url/suun-terveystalo/nainen.jpg",
    "artwork_url": "https://supabase-storage-url/suun-terveystalo/terveystalo-artwork.png",
    "logo_url": "https://supabase-storage-url/suun-terveystalo/SuunTerveystalo_logo.png",
    "click_url": "#"
}'::jsonb,
updated_at = NOW()
WHERE name = 'Suun Terveystalo 1080x1920 PDOOH';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
