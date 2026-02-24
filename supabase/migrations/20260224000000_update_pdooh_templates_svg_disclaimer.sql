-- ============================================================================
-- SUUN TERVEYSTALO - UPDATE PDOOH TEMPLATES WITH SVG PRICE BUBBLE
-- Version: 1.0.0
-- Date: 2026-02-24
-- Description:
--   1. Update all PDOOH templates to use TerveystaloSansDisplay-Super font
--   2. Replace circular price bubble with organic SVG bubble (/price.svg)
--   3. Add disclaimer to all templates (not just 980x400)
--   4. Adjust layout to prevent overlapping
-- ============================================================================

-- Read the updated HTML templates from files
UPDATE creative_templates
SET html_template = $html$
<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="ad.size" content="width=300,height=300">
    <title>300x300 Ad Banner - Suun Terveystalo</title>
    <style>
        /* Terveystalo Display Font */
        @font-face {
            font-family: 'TerveystaloSansDisplay';
            src: url('/font/TerveystaloSansDisplay-Super.woff2') format('woff2'),
                 url('/font/TerveystaloSansDisplay-Super.woff') format('woff');
            font-weight: 900;
            font-style: normal;
        }

        /* Reset and Base Styles */
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #333;
            font-family: 'TerveystaloSansDisplay', sans-serif;
        }

        /* Main Ad Container */
        .ad-container {
            width: 300px;
            height: 300px;
            background-color: #08091A;
            position: relative;
            overflow: hidden;
            color: #ffffff;
            text-align: center;
        }

        /* --- ANIMATIONS --- */
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideInFromTop {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideInFromLeft {
            from { opacity: 0; transform: translateX(-30px); }
            to { opacity: 1; transform: translateX(0); }
        }

        @keyframes slideInFromRight {
            from { opacity: 0; transform: translateX(30px) rotate(-30deg); }
            to { opacity: 1; transform: translateX(0) rotate(-30deg); }
        }

        @keyframes slideInFromBottom {
            from { opacity: 0; transform: translateY(20px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes scaleIn {
            from { opacity: 0; transform: translateX(-50%) scale(0.8); }
            to { opacity: 1; transform: translateX(-50%) scale(1); }
        }

        @keyframes pulse {
            0%, 100% { transform: translateX(-50%) scale(1); }
            50% { transform: translateX(-50%) scale(1.05); }
        }

        /* --- MAIN IMAGE (Background Person) --- */
        .main-image {
            position: absolute;
            top: 50px;
            left: 0;
            width: 100%;
            height: 200px;
            z-index: 1;
            object-fit: cover;
            object-position: center top;
            -webkit-mask-image: radial-gradient(ellipse 85% 80% at 50% 45%, black 40%, transparent 80%);
            mask-image: radial-gradient(ellipse 85% 80% at 50% 45%, black 40%, transparent 80%);
            opacity: 0;
            animation: fadeIn 0.8s ease-out 0.2s forwards;
        }

        /* --- ARTWORK (Blue Bubbles) --- */
        .artwork {
            position: absolute;
            bottom: -45px;
            right: -55px;
            width: 180px;
            height: 180px;
            z-index: 2;
            object-fit: contain;
            transform: rotate(-30deg);
            opacity: 0;
            animation: slideInFromRight 0.7s ease-out 0.5s forwards;
        }

        /* --- LOGO --- */
        .logo {
            position: absolute;
            bottom: 32px;
            left: 50%;
            transform: translateX(-50%);
            width: 100px;
            height: auto;
            max-height: 18px;
            z-index: 10;
            object-fit: contain;
            opacity: 0;
            animation: fadeIn 0.6s ease-out 1.2s forwards;
        }

        /* --- TEXT CONTENT (Top) --- */
        .text-area {
            position: relative;
            z-index: 10;
            padding-top: 20px;
            width: 100%;
            opacity: 0;
            animation: slideInFromTop 0.6s ease-out 0.1s forwards;
        }

        .headline {
            font-size: 14px;
            font-weight: 900;
            line-height: 1.1;
            margin-bottom: 8px;
        }

        .subheadline {
            font-size: 9px;
            line-height: 1.35;
            max-width: 90%;
            margin: 0 auto;
        }


        /* --- PRICE BUBBLE (Left Aligned) --- */
        .price-bubble {
            position: absolute;
            z-index: 15;
            top: 125px;
            left: 8px;
            width: 90px;
            height: 90px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            opacity: 0;
            animation: slideInFromLeft 0.6s ease-out 0.4s forwards;
        }

        .price-bubble img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        .price-bubble-content {
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            color: #004E9A;
        }

        .pb-title {
            font-size: 8px;
            font-weight: 700;
            line-height: 1.1;
            text-align: center;
        }

        .pb-price {
            font-size: 32px;
            font-weight: 900;
            line-height: 0.9;
            margin: 2px 0;
            letter-spacing: -1px;
            display: flex;
            align-items: flex-start;
        }

        .pb-currency {
             font-size: 16px;
             margin-top: 2px;
             margin-left: 1px;
        }

        .pb-date {
            font-size: 6px;
            font-weight: 600;
            text-align: center;
            line-height: 1.2;
        }


        /* --- CTA BUTTON (Bottom Center) --- */
        .cta-button {
            position: absolute;
            z-index: 15;
            bottom: 55px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #ffffff;
            color: #004E9A;
            text-decoration: none;
            font-weight: 700;
            font-size: 10px;
            padding: 8px 20px;
            border-radius: 20px;
            white-space: nowrap;
            box-shadow: 0 3px 8px rgba(0,0,0,0.2);
            opacity: 0;
            animation: scaleIn 0.5s ease-out 0.8s forwards, pulse 2s ease-in-out 2s infinite;
        }


        /* --- ADDRESS FOOTER --- */
        .address {
            position: absolute;
            bottom: 16px;
            width: 100%;
            text-align: center;
            font-size: 8px;
            font-weight: 400;
            z-index: 11;
            color: #fff;
            opacity: 0;
            animation: slideInFromBottom 0.5s ease-out 1s forwards;
        }

        /* --- DISCLAIMER --- */
        .disclaimer {
            position: absolute;
            bottom: 4px;
            left: 0;
            right: 0;
            padding: 0 8px;
            text-align: center;
            font-size: 5px;
            font-weight: 400;
            line-height: 1.2;
            z-index: 11;
            color: rgba(255,255,255,0.6);
            opacity: 0;
            animation: fadeIn 0.5s ease-out 1.2s forwards;
        }

    </style>
</head>
<body>

    <div class="ad-container">

        <!-- Main background image (man or woman) -->
        <img src="{{image_url}}" alt="Dentist" class="main-image">

        <!-- Decorative artwork (blue bubbles) -->
        <img src="{{artwork_url}}" alt="" class="artwork">

        <div class="text-area">
            <h1 class="headline">{{headline}}</h1>
            <p class="subheadline">{{subheadline}}</p>
        </div>

        <div class="price-bubble">
            <img src="/price.svg" alt="">
            <div class="price-bubble-content">
                <span class="pb-title">{{offer_title}}</span>
                <div class="pb-price">{{price}}<span class="pb-currency">€</span></div>
                <span class="pb-date">{{offer_date}}</span>
            </div>
        </div>

        <a href="{{click_url}}" class="cta-button">{{cta_text}}</a>

        <!-- Suun Terveystalo Logo -->
        <img src="{{logo_url}}" alt="Suun Terveystalo" class="logo">

        <div class="address">{{branch_address}}</div>

        <div class="disclaimer">{{disclaimer_text}}</div>

    </div>

</body>
</html>
$html$
WHERE name = 'Suun Terveystalo 300x300';

UPDATE creative_templates
SET placeholders = COALESCE(placeholders, '[]'::jsonb) || '{"key": "disclaimer_text", "label": "Legal", "type": "textarea", "required": false, "maxLength": 500}'::jsonb,
    default_values = jsonb_set(
        COALESCE(default_values, '{}'::jsonb),
        '{disclaimer_text}',
        '"Tarjous voimassa uusille asiakkaille tai jos edellisestä käynnistäsi on kulunut 3 vuotta. Tarjous koskee arkiaikoja, aika on varattava 22.2.2026 mennessä ja vastaanotolla on käytävä 31.3.2026 mennessä. Hinta sisältää Kela-korvauksen, käyntimaksun ja kanta-maksun. Kampanjan tarkat ehdot ja ohjeet kampanjasivulla terveystalo.com/suunterveystalo."'::jsonb
    )
WHERE name = 'Suun Terveystalo 300x300';

UPDATE creative_templates
SET html_template = $html$
<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="ad.size" content="width=300,height=431">
    <title>300x431 Ad Banner - Suun Terveystalo</title>
    <style>
        /* Terveystalo Display Font */
        @font-face {
            font-family: 'TerveystaloSansDisplay';
            src: url('/font/TerveystaloSansDisplay-Super.woff2') format('woff2'),
                 url('/font/TerveystaloSansDisplay-Super.woff') format('woff');
            font-weight: 900;
            font-style: normal;
        }

        /* Reset and Base Styles */
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #333;
            font-family: 'TerveystaloSansDisplay', sans-serif;
        }

        /* Main Ad Container */
        .ad-container {
            width: 300px;
            height: 431px;
            background-color: #08091A;
            position: relative;
            overflow: hidden;
            color: #ffffff;
            text-align: center;
        }

        /* --- ANIMATIONS --- */
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideInFromTop {
            from { opacity: 0; transform: translateY(-25px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideInFromLeft {
            from { opacity: 0; transform: translateX(-40px); }
            to { opacity: 1; transform: translateX(0); }
        }

        @keyframes slideInFromRight {
            from { opacity: 0; transform: translateX(40px) rotate(-30deg); }
            to { opacity: 1; transform: translateX(0) rotate(-30deg); }
        }

        @keyframes slideInFromBottom {
            from { opacity: 0; transform: translateY(25px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes scaleIn {
            from { opacity: 0; transform: translateX(-50%) scale(0.8); }
            to { opacity: 1; transform: translateX(-50%) scale(1); }
        }

        @keyframes pulse {
            0%, 100% { transform: translateX(-50%) scale(1); }
            50% { transform: translateX(-50%) scale(1.05); }
        }

        /* --- MAIN IMAGE (Background Person) --- */
        .main-image {
            position: absolute;
            top: 70px;
            left: 0;
            width: 100%;
            height: 280px;
            z-index: 1;
            object-fit: cover;
            object-position: center top;
            -webkit-mask-image: radial-gradient(ellipse 82% 77% at 50% 45%, black 42%, transparent 82%);
            mask-image: radial-gradient(ellipse 82% 77% at 50% 45%, black 42%, transparent 82%);
            opacity: 0;
            animation: fadeIn 0.8s ease-out 0.2s forwards;
        }

        /* --- ARTWORK (Blue Bubbles) --- */
        .artwork {
            position: absolute;
            bottom: -50px;
            right: -65px;
            width: 220px;
            height: 220px;
            z-index: 2;
            object-fit: contain;
            transform: rotate(-30deg);
            opacity: 0;
            animation: slideInFromRight 0.7s ease-out 0.5s forwards;
        }

        /* --- LOGO --- */
        .logo {
            position: absolute;
            bottom: 42px;
            left: 50%;
            transform: translateX(-50%);
            width: 120px;
            height: auto;
            max-height: 22px;
            z-index: 10;
            object-fit: contain;
            opacity: 0;
            animation: fadeIn 0.6s ease-out 1.2s forwards;
        }

        /* --- TEXT CONTENT (Top) --- */
        .text-area {
            position: relative;
            z-index: 10;
            padding-top: 28px;
            width: 100%;
            opacity: 0;
            animation: slideInFromTop 0.6s ease-out 0.1s forwards;
        }

        .headline {
            font-size: 18px;
            font-weight: 900;
            line-height: 1.1;
            margin-bottom: 10px;
        }

        .subheadline {
            font-size: 12px;
            line-height: 1.35;
            max-width: 90%;
            margin: 0 auto;
        }


        /* --- PRICE BUBBLE (Left Aligned) --- */
        .price-bubble {
            position: absolute;
            z-index: 15;
            top: 185px;
            left: 10px;
            width: 105px;
            height: 105px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            opacity: 0;
            animation: slideInFromLeft 0.6s ease-out 0.4s forwards;
        }

        .price-bubble img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        .price-bubble-content {
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            color: #004E9A;
        }

        .pb-title {
            font-size: 10px;
            font-weight: 700;
            line-height: 1.1;
            text-align: center;
        }

        .pb-price {
            font-size: 40px;
            font-weight: 900;
            line-height: 0.9;
            margin: 3px 0;
            letter-spacing: -1px;
            display: flex;
            align-items: flex-start;
        }

        .pb-currency {
             font-size: 20px;
             margin-top: 3px;
             margin-left: 1px;
        }

        .pb-date {
            font-size: 7px;
            font-weight: 600;
            text-align: center;
            line-height: 1.2;
        }


        /* --- CTA BUTTON (Bottom Center) --- */
        .cta-button {
            position: absolute;
            z-index: 15;
            bottom: 70px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #ffffff;
            color: #004E9A;
            text-decoration: none;
            font-weight: 700;
            font-size: 11px;
            padding: 10px 24px;
            border-radius: 22px;
            white-space: nowrap;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
            opacity: 0;
            animation: scaleIn 0.5s ease-out 0.8s forwards, pulse 2s ease-in-out 2s infinite;
        }


        /* --- ADDRESS FOOTER --- */
        .address {
            position: absolute;
            bottom: 24px;
            width: 100%;
            text-align: center;
            font-size: 10px;
            font-weight: 400;
            z-index: 11;
            color: #fff;
            opacity: 0;
            animation: slideInFromBottom 0.5s ease-out 1s forwards;
        }

        /* --- DISCLAIMER --- */
        .disclaimer {
            position: absolute;
            bottom: 5px;
            left: 0;
            right: 0;
            padding: 0 10px;
            text-align: center;
            font-size: 6px;
            font-weight: 400;
            line-height: 1.2;
            z-index: 11;
            color: rgba(255,255,255,0.6);
            opacity: 0;
            animation: fadeIn 0.5s ease-out 1.2s forwards;
        }

    </style>
</head>
<body>

    <div class="ad-container">

        <!-- Main background image (man or woman) -->
        <img src="{{image_url}}" alt="Dentist" class="main-image">

        <!-- Decorative artwork (blue bubbles) -->
        <img src="{{artwork_url}}" alt="" class="artwork">

        <div class="text-area">
            <h1 class="headline">{{headline}}</h1>
            <p class="subheadline">{{subheadline}}</p>
        </div>

        <div class="price-bubble">
            <img src="/price.svg" alt="">
            <div class="price-bubble-content">
                <span class="pb-title">{{offer_title}}</span>
                <div class="pb-price">{{price}}<span class="pb-currency">€</span></div>
                <span class="pb-date">{{offer_date}}</span>
            </div>
        </div>

        <a href="{{click_url}}" class="cta-button">{{cta_text}}</a>

        <!-- Suun Terveystalo Logo -->
        <img src="{{logo_url}}" alt="Suun Terveystalo" class="logo">

        <div class="address">{{branch_address}}</div>

        <div class="disclaimer">{{disclaimer_text}}</div>

    </div>

</body>
</html>
$html$
WHERE name = 'Suun Terveystalo 300x431';

UPDATE creative_templates
SET placeholders = COALESCE(placeholders, '[]'::jsonb) || '{"key": "disclaimer_text", "label": "Legal", "type": "textarea", "required": false, "maxLength": 500}'::jsonb,
    default_values = jsonb_set(
        COALESCE(default_values, '{}'::jsonb),
        '{disclaimer_text}',
        '"Tarjous voimassa uusille asiakkaille tai jos edellisestä käynnistäsi on kulunut 3 vuotta. Tarjous koskee arkiaikoja, aika on varattava 22.2.2026 mennessä ja vastaanotolla on käytävä 31.3.2026 mennessä. Hinta sisältää Kela-korvauksen, käyntimaksun ja kanta-maksun. Kampanjan tarkat ehdot ja ohjeet kampanjasivulla terveystalo.com/suunterveystalo."'::jsonb
    )
WHERE name = 'Suun Terveystalo 300x431';

UPDATE creative_templates
SET html_template = $html$
<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="ad.size" content="width=300,height=600">
    <title>300x600 Ad Banner - Suun Terveystalo</title>
    <style>
        /* Terveystalo Display Font */
        @font-face {
            font-family: 'TerveystaloSansDisplay';
            src: url('/font/TerveystaloSansDisplay-Super.woff2') format('woff2'),
                 url('/font/TerveystaloSansDisplay-Super.woff') format('woff');
            font-weight: 900;
            font-style: normal;
        }

        /* Reset and Base Styles */
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #333;
            font-family: 'TerveystaloSansDisplay', sans-serif;
        }

        /* Main Ad Container */
        .ad-container {
            width: 300px;
            height: 600px;
            background-color: #08091A;
            position: relative;
            overflow: hidden;
            color: #ffffff;
            text-align: center;
        }

        /* --- ANIMATIONS --- */
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideInFromTop {
            from { opacity: 0; transform: translateY(-30px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideInFromLeft {
            from { opacity: 0; transform: translateX(-50px); }
            to { opacity: 1; transform: translateX(0); }
        }

        @keyframes slideInFromRight {
            from { opacity: 0; transform: translateX(50px) rotate(-30deg); }
            to { opacity: 1; transform: translateX(0) rotate(-30deg); }
        }

        @keyframes slideInFromBottom {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes scaleIn {
            from { opacity: 0; transform: translateX(-50%) scale(0.8); }
            to { opacity: 1; transform: translateX(-50%) scale(1); }
        }

        @keyframes pulse {
            0%, 100% { transform: translateX(-50%) scale(1); }
            50% { transform: translateX(-50%) scale(1.05); }
        }

        /* --- MAIN IMAGE (Background Person) --- */
        .main-image {
            position: absolute;
            top: 100px;
            left: 0;
            width: 100%;
            height: 400px;
            z-index: 1;
            object-fit: cover;
            object-position: center top;
            -webkit-mask-image: radial-gradient(ellipse 82% 77% at 50% 45%, black 42%, transparent 82%);
            mask-image: radial-gradient(ellipse 82% 77% at 50% 45%, black 42%, transparent 82%);
            opacity: 0;
            animation: fadeIn 0.8s ease-out 0.2s forwards;
        }

        /* --- ARTWORK (Blue Bubbles) --- */
        .artwork {
            position: absolute;
            bottom: -70px;
            right: -90px;
            width: 306px;
            height: 306px;
            z-index: 2;
            object-fit: contain;
            transform: rotate(-30deg);
            opacity: 0;
            animation: slideInFromRight 0.7s ease-out 0.5s forwards;
        }

        /* --- LOGO --- */
        .logo {
            position: absolute;
            bottom: 55px;
            left: 50%;
            transform: translateX(-50%);
            width: 160px;
            height: auto;
            max-height: 28px;
            z-index: 10;
            object-fit: contain;
            opacity: 0;
            animation: fadeIn 0.6s ease-out 1.2s forwards;
        }

        /* --- TEXT CONTENT (Top) --- */
        .text-area {
            position: relative;
            z-index: 10;
            padding-top: 40px;
            width: 100%;
            opacity: 0;
            animation: slideInFromTop 0.6s ease-out 0.1s forwards;
        }

        .headline {
            font-size: 24px;
            font-weight: 900;
            line-height: 1.1;
            margin-bottom: 15px;
        }

        .subheadline {
            font-size: 16px;
            line-height: 1.35;
            max-width: 90%;
            margin: 0 auto;
        }


        /* --- PRICE BUBBLE (Left Aligned) --- */
        .price-bubble {
            position: absolute;
            z-index: 15;
            top: 260px;
            left: 12px;
            width: 140px;
            height: 140px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            opacity: 0;
            animation: slideInFromLeft 0.6s ease-out 0.4s forwards;
        }

        .price-bubble img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        .price-bubble-content {
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            color: #004E9A;
        }

        .pb-title {
            font-size: 13px;
            font-weight: 700;
            line-height: 1.1;
            text-align: center;
        }

        .pb-price {
            font-size: 54px;
            font-weight: 900;
            line-height: 0.9;
            margin: 4px 0;
            letter-spacing: -2px;
            display: flex;
            align-items: flex-start;
        }

        .pb-currency {
             font-size: 28px;
             margin-top: 4px;
             margin-left: 2px;
        }

        .pb-date {
            font-size: 10px;
            font-weight: 600;
            text-align: center;
            line-height: 1.2;
        }


        /* --- CTA BUTTON (Bottom Center) --- */
        .cta-button {
            position: absolute;
            z-index: 15;
            bottom: 90px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #ffffff;
            color: #004E9A;
            text-decoration: none;
            font-weight: 700;
            font-size: 14px;
            padding: 12px 32px;
            border-radius: 25px;
            white-space: nowrap;
            box-shadow: 0 4px 10px rgba(0,0,0,0.2);
            opacity: 0;
            animation: scaleIn 0.5s ease-out 0.8s forwards, pulse 2s ease-in-out 2s infinite;
        }


        /* --- ADDRESS FOOTER --- */
        .address {
            position: absolute;
            bottom: 35px;
            width: 100%;
            text-align: center;
            font-size: 13px;
            font-weight: 400;
            z-index: 11;
            color: #fff;
            opacity: 0;
            animation: slideInFromBottom 0.5s ease-out 1s forwards;
        }

        /* --- DISCLAIMER --- */
        .disclaimer {
            position: absolute;
            bottom: 6px;
            left: 0;
            right: 0;
            padding: 0 12px;
            text-align: center;
            font-size: 7px;
            font-weight: 400;
            line-height: 1.2;
            z-index: 11;
            color: rgba(255,255,255,0.6);
            opacity: 0;
            animation: fadeIn 0.5s ease-out 1.2s forwards;
        }

    </style>
</head>
<body>

    <div class="ad-container">

        <!-- Main background image (man or woman) -->
        <img src="{{image_url}}" alt="Dentist" class="main-image">

        <!-- Decorative artwork (blue bubbles) -->
        <img src="{{artwork_url}}" alt="" class="artwork">

        <div class="text-area">
            <h1 class="headline">{{headline}}</h1>
            <p class="subheadline">{{subheadline}}</p>
        </div>

        <div class="price-bubble">
            <img src="/price.svg" alt="">
            <div class="price-bubble-content">
                <span class="pb-title">{{offer_title}}</span>
                <div class="pb-price">{{price}}<span class="pb-currency">€</span></div>
                <span class="pb-date">{{offer_date}}</span>
            </div>
        </div>

        <a href="{{click_url}}" class="cta-button">{{cta_text}}</a>

        <!-- Suun Terveystalo Logo -->
        <img src="{{logo_url}}" alt="Suun Terveystalo" class="logo">

        <div class="address">{{branch_address}}</div>

        <div class="disclaimer">{{disclaimer_text}}</div>

    </div>

</body>
</html>
$html$
WHERE name = 'Suun Terveystalo 300x600';

UPDATE creative_templates
SET placeholders = COALESCE(placeholders, '[]'::jsonb) || '{"key": "disclaimer_text", "label": "Legal", "type": "textarea", "required": false, "maxLength": 500}'::jsonb,
    default_values = jsonb_set(
        COALESCE(default_values, '{}'::jsonb),
        '{disclaimer_text}',
        '"Tarjous voimassa uusille asiakkaille tai jos edellisestä käynnistäsi on kulunut 3 vuotta. Tarjous koskee arkiaikoja, aika on varattava 22.2.2026 mennessä ja vastaanotolla on käytävä 31.3.2026 mennessä. Hinta sisältää Kela-korvauksen, käyntimaksun ja kanta-maksun. Kampanjan tarkat ehdot ja ohjeet kampanjasivulla terveystalo.com/suunterveystalo."'::jsonb
    )
WHERE name = 'Suun Terveystalo 300x600';

UPDATE creative_templates
SET html_template = $html$
<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="ad.size" content="width=620,height=891">
    <title>620x891 Ad Banner - Suun Terveystalo</title>
    <style>
        /* Terveystalo Display Font */
        @font-face {
            font-family: 'TerveystaloSansDisplay';
            src: url('/font/TerveystaloSansDisplay-Super.woff2') format('woff2'),
                 url('/font/TerveystaloSansDisplay-Super.woff') format('woff');
            font-weight: 900;
            font-style: normal;
        }

        /* Reset and Base Styles */
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #333;
            font-family: 'TerveystaloSansDisplay', sans-serif;
        }

        /* Main Ad Container */
        .ad-container {
            width: 620px;
            height: 891px;
            background-color: #08091A;
            position: relative;
            overflow: hidden;
            color: #ffffff;
            text-align: center;
        }

        /* --- ANIMATIONS --- */
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideInFromTop {
            from { opacity: 0; transform: translateY(-40px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideInFromLeft {
            from { opacity: 0; transform: translateX(-60px); }
            to { opacity: 1; transform: translateX(0); }
        }

        @keyframes slideInFromRight {
            from { opacity: 0; transform: translateX(60px) rotate(-30deg); }
            to { opacity: 1; transform: translateX(0) rotate(-30deg); }
        }

        @keyframes slideInFromBottom {
            from { opacity: 0; transform: translateY(40px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes scaleIn {
            from { opacity: 0; transform: translateX(-50%) scale(0.8); }
            to { opacity: 1; transform: translateX(-50%) scale(1); }
        }

        @keyframes pulse {
            0%, 100% { transform: translateX(-50%) scale(1); }
            50% { transform: translateX(-50%) scale(1.05); }
        }

        /* --- MAIN IMAGE (Background Person) --- */
        .main-image {
            position: absolute;
            top: 150px;
            left: 0;
            width: 100%;
            height: 580px;
            z-index: 1;
            object-fit: cover;
            object-position: center top;
            -webkit-mask-image: radial-gradient(ellipse 82% 77% at 50% 45%, black 42%, transparent 82%);
            mask-image: radial-gradient(ellipse 82% 77% at 50% 45%, black 42%, transparent 82%);
            opacity: 0;
            animation: fadeIn 0.8s ease-out 0.2s forwards;
        }

        /* --- ARTWORK (Blue Bubbles) --- */
        .artwork {
            position: absolute;
            bottom: -100px;
            right: -130px;
            width: 450px;
            height: 450px;
            z-index: 2;
            object-fit: contain;
            transform: rotate(-30deg);
            opacity: 0;
            animation: slideInFromRight 0.7s ease-out 0.5s forwards;
        }

        /* --- LOGO --- */
        .logo {
            position: absolute;
            bottom: 85px;
            left: 50%;
            transform: translateX(-50%);
            width: 240px;
            height: auto;
            max-height: 44px;
            z-index: 10;
            object-fit: contain;
            opacity: 0;
            animation: fadeIn 0.6s ease-out 1.2s forwards;
        }

        /* --- TEXT CONTENT (Top) --- */
        .text-area {
            position: relative;
            z-index: 10;
            padding-top: 60px;
            width: 100%;
            opacity: 0;
            animation: slideInFromTop 0.6s ease-out 0.1s forwards;
        }

        .headline {
            font-size: 36px;
            font-weight: 900;
            line-height: 1.1;
            margin-bottom: 20px;
        }

        .subheadline {
            font-size: 22px;
            line-height: 1.35;
            max-width: 85%;
            margin: 0 auto;
        }


        /* --- PRICE BUBBLE (Left Aligned) --- */
        .price-bubble {
            position: absolute;
            z-index: 15;
            top: 385px;
            left: 20px;
            width: 210px;
            height: 210px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            opacity: 0;
            animation: slideInFromLeft 0.6s ease-out 0.4s forwards;
        }

        .price-bubble img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        .price-bubble-content {
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            color: #004E9A;
        }

        .pb-title {
            font-size: 19px;
            font-weight: 700;
            line-height: 1.1;
            text-align: center;
        }

        .pb-price {
            font-size: 80px;
            font-weight: 900;
            line-height: 0.9;
            margin: 6px 0;
            letter-spacing: -3px;
            display: flex;
            align-items: flex-start;
        }

        .pb-currency {
             font-size: 40px;
             margin-top: 6px;
             margin-left: 2px;
        }

        .pb-date {
            font-size: 14px;
            font-weight: 600;
            text-align: center;
            line-height: 1.2;
        }


        /* --- CTA BUTTON (Bottom Center) --- */
        .cta-button {
            position: absolute;
            z-index: 15;
            bottom: 135px;
            left: 50%;
            transform: translateX(-50%);
            background-color: #ffffff;
            color: #004E9A;
            text-decoration: none;
            font-weight: 700;
            font-size: 20px;
            padding: 18px 48px;
            border-radius: 35px;
            white-space: nowrap;
            box-shadow: 0 6px 15px rgba(0,0,0,0.2);
            opacity: 0;
            animation: scaleIn 0.5s ease-out 0.8s forwards, pulse 2s ease-in-out 2s infinite;
        }


        /* --- ADDRESS FOOTER --- */
        .address {
            position: absolute;
            bottom: 50px;
            width: 100%;
            text-align: center;
            font-size: 18px;
            font-weight: 400;
            z-index: 11;
            color: #fff;
            opacity: 0;
            animation: slideInFromBottom 0.5s ease-out 1s forwards;
        }

        /* --- DISCLAIMER --- */
        .disclaimer {
            position: absolute;
            bottom: 8px;
            left: 0;
            right: 0;
            padding: 0 20px;
            text-align: center;
            font-size: 10px;
            font-weight: 400;
            line-height: 1.2;
            z-index: 11;
            color: rgba(255,255,255,0.6);
            opacity: 0;
            animation: fadeIn 0.5s ease-out 1.2s forwards;
        }

    </style>
</head>
<body>

    <div class="ad-container">

        <!-- Main background image (man or woman) -->
        <img src="{{image_url}}" alt="Dentist" class="main-image">

        <!-- Decorative artwork (blue bubbles) -->
        <img src="{{artwork_url}}" alt="" class="artwork">

        <div class="text-area">
            <h1 class="headline">{{headline}}</h1>
            <p class="subheadline">{{subheadline}}</p>
        </div>

        <div class="price-bubble">
            <img src="/price.svg" alt="">
            <div class="price-bubble-content">
                <span class="pb-title">{{offer_title}}</span>
                <div class="pb-price">{{price}}<span class="pb-currency">€</span></div>
                <span class="pb-date">{{offer_date}}</span>
            </div>
        </div>

        <a href="{{click_url}}" class="cta-button">{{cta_text}}</a>

        <!-- Suun Terveystalo Logo -->
        <img src="{{logo_url}}" alt="Suun Terveystalo" class="logo">

        <div class="address">{{branch_address}}</div>

        <div class="disclaimer">{{disclaimer_text}}</div>

    </div>

</body>
</html>
$html$
WHERE name = 'Suun Terveystalo 620x891';

UPDATE creative_templates
SET placeholders = COALESCE(placeholders, '[]'::jsonb) || '{"key": "disclaimer_text", "label": "Legal", "type": "textarea", "required": false, "maxLength": 500}'::jsonb,
    default_values = jsonb_set(
        COALESCE(default_values, '{}'::jsonb),
        '{disclaimer_text}',
        '"Tarjous voimassa uusille asiakkaille tai jos edellisestä käynnistäsi on kulunut 3 vuotta. Tarjous koskee arkiaikoja, aika on varattava 22.2.2026 mennessä ja vastaanotolla on käytävä 31.3.2026 mennessä. Hinta sisältää Kela-korvauksen, käyntimaksun ja kanta-maksun. Kampanjan tarkat ehdot ja ohjeet kampanjasivulla terveystalo.com/suunterveystalo."'::jsonb
    )
WHERE name = 'Suun Terveystalo 620x891';

UPDATE creative_templates
SET html_template = $html$
<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="ad.size" content="width=980,height=400">
    <title>980x400 Ad Banner - Suun Terveystalo</title>
    <style>
        /* Terveystalo Display Font */
        @font-face {
            font-family: 'TerveystaloSansDisplay';
            src: url('/font/TerveystaloSansDisplay-Super.woff2') format('woff2'),
                 url('/font/TerveystaloSansDisplay-Super.woff') format('woff');
            font-weight: 900;
            font-style: normal;
        }

        /* Reset and Base Styles */
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            background-color: #333;
            font-family: 'TerveystaloSansDisplay', sans-serif;
        }

        /* Main Ad Container */
        .ad-container {
            width: 980px;
            height: 400px;
            background-color: #08091A;
            position: relative;
            overflow: hidden;
            color: #ffffff;
        }

        /* --- ANIMATIONS --- */
        @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
        }

        @keyframes slideInFromTop {
            from { opacity: 0; transform: translateY(-30px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes slideInFromLeft {
            from { opacity: 0; transform: translateX(-50px); }
            to { opacity: 1; transform: translateX(0); }
        }

        @keyframes slideInFromRight {
            from { opacity: 0; transform: translateX(50px) rotate(-30deg); }
            to { opacity: 1; transform: translateX(0) rotate(-30deg); }
        }

        @keyframes slideInFromBottom {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes scaleIn {
            from { opacity: 0; scale(0.8); }
            to { opacity: 1; scale(1); }
        }

        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }

        /* --- MAIN IMAGE (Background Person) - Left Side --- */
        .main-image {
            position: absolute;
            top: 0;
            left: 0;
            width: 500px;
            height: 100%;
            z-index: 1;
            object-fit: cover;
            object-position: center top;
            -webkit-mask-image: radial-gradient(ellipse 100% 90% at 30% 50%, black 40%, transparent 85%);
            mask-image: radial-gradient(ellipse 100% 90% at 30% 50%, black 40%, transparent 85%);
            opacity: 0;
            animation: fadeIn 0.8s ease-out 0.2s forwards;
        }

        /* --- ARTWORK (Blue Bubbles) - Right Side --- */
        .artwork {
            position: absolute;
            bottom: -80px;
            right: -100px;
            width: 350px;
            height: 350px;
            z-index: 2;
            object-fit: contain;
            transform: rotate(-30deg);
            opacity: 0;
            animation: slideInFromRight 0.7s ease-out 0.5s forwards;
        }

        /* --- LOGO --- */
        .logo {
            position: absolute;
            bottom: 30px;
            left: 50%;
            transform: translateX(-50%);
            width: 170px;
            height: auto;
            max-height: 30px;
            z-index: 10;
            object-fit: contain;
            opacity: 0;
            animation: fadeIn 0.6s ease-out 1.2s forwards;
        }

        /* --- TEXT CONTENT (Right Side) --- */
        .text-area {
            position: absolute;
            z-index: 10;
            top: 50%;
            right: 60px;
            transform: translateY(-50%);
            width: 400px;
            text-align: left;
            opacity: 0;
            animation: slideInFromTop 0.6s ease-out 0.1s forwards;
        }

        .headline {
            font-size: 30px;
            font-weight: 900;
            line-height: 1.1;
            margin-bottom: 15px;
        }

        .subheadline {
            font-size: 16px;
            line-height: 1.35;
            max-width: 100%;
        }


        /* --- PRICE BUBBLE (Center) --- */
        .price-bubble {
            position: absolute;
            z-index: 15;
            top: 50%;
            left: 365px;
            transform: translateY(-50%);
            width: 150px;
            height: 150px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            opacity: 0;
            animation: slideInFromLeft 0.6s ease-out 0.4s forwards;
        }

        .price-bubble img {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            object-fit: contain;
        }

        .price-bubble-content {
            position: relative;
            z-index: 1;
            display: flex;
            flex-direction: column;
            align-items: center;
            color: #004E9A;
        }

        .pb-title {
            font-size: 13px;
            font-weight: 700;
            line-height: 1.1;
            text-align: center;
        }

        .pb-price {
            font-size: 54px;
            font-weight: 900;
            line-height: 0.9;
            margin: 4px 0;
            letter-spacing: -2px;
            display: flex;
            align-items: flex-start;
        }

        .pb-currency {
             font-size: 28px;
             margin-top: 4px;
             margin-left: 2px;
        }

        .pb-date {
            font-size: 10px;
            font-weight: 600;
            text-align: center;
            line-height: 1.2;
        }


        /* --- CTA BUTTON --- */
        .cta-button {
            position: absolute;
            z-index: 15;
            bottom: 70px;
            right: 120px;
            background-color: #ffffff;
            color: #004E9A;
            text-decoration: none;
            font-weight: 700;
            font-size: 14px;
            padding: 14px 36px;
            border-radius: 28px;
            white-space: nowrap;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
            opacity: 0;
            animation: scaleIn 0.5s ease-out 0.8s forwards, pulse 2s ease-in-out 2s infinite;
        }


        /* --- ADDRESS FOOTER --- */
        .address {
            position: absolute;
            bottom: 15px;
            width: 100%;
            text-align: center;
            font-size: 12px;
            font-weight: 400;
            z-index: 11;
            color: #fff;
            opacity: 0;
            animation: slideInFromBottom 0.5s ease-out 1s forwards;
        }

        /* --- DISCLAIMER TEXT (PDOOH Offer) --- */
        .disclaimer {
            position: absolute;
            bottom: 6px;
            left: 0;
            right: 0;
            padding: 0 20px;
            text-align: center;
            font-size: 8px;
            font-weight: 400;
            line-height: 1.3;
            z-index: 11;
            color: rgba(255,255,255,0.7);
            opacity: 0;
            animation: fadeIn 0.5s ease-out 1.2s forwards;
        }

    </style>
</head>
<body>

    <div class="ad-container">

        <!-- Main background image (man or woman) - Left side -->
        <img src="{{image_url}}" alt="Dentist" class="main-image">

        <!-- Decorative artwork (blue bubbles) -->
        <img src="{{artwork_url}}" alt="" class="artwork">

        <div class="text-area">
            <h1 class="headline">{{headline}}</h1>
            <p class="subheadline">{{subheadline}}</p>
        </div>

        <div class="price-bubble">
            <img src="/price.svg" alt="">
            <div class="price-bubble-content">
                <span class="pb-title">{{offer_title}}</span>
                <div class="pb-price">{{price}}<span class="pb-currency">€</span></div>
                <span class="pb-date">{{offer_date}}</span>
            </div>
        </div>

        <a href="{{click_url}}" class="cta-button">{{cta_text}}</a>

        <!-- Suun Terveystalo Logo -->
        <img src="{{logo_url}}" alt="Suun Terveystalo" class="logo">

        <div class="address">{{branch_address}}</div>

        <div class="disclaimer">{{disclaimer_text}}</div>

    </div>

</body>
</html>
$html$
WHERE name = 'Suun Terveystalo 980x400';

-- Update placeholder label for 980x400 from "Vastuuvapauslauseke" to "Legal"
UPDATE creative_templates
SET placeholders = jsonb_set(
        COALESCE(placeholders, '[]'::jsonb),
        '{disclaimer_text}',
        '{"key": "disclaimer_text", "label": "Legal", "type": "textarea", "required": false, "maxLength": 500}'::jsonb
    )
WHERE name = 'Suun Terveystalo 980x400';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
