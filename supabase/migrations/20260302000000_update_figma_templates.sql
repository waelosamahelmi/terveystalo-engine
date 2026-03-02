-- ============================================================================
-- SUUN TERVEYSTALO - FIGMA TEMPLATES UPDATE
-- Version: 1.0.1
-- Date: 2026-03-02
-- Description: Insert/Update creative_templates with Figma designs for Display and PDOOH
-- Uses local Terveystalo Sans fonts from /font/
-- ============================================================================

-- First, delete existing templates that will be replaced
DELETE FROM creative_templates WHERE name IN (
    'Suun Terveystalo 300x300',
    'Suun Terveystalo 300x431',
    'Suun Terveystalo 300x600',
    'Suun Terveystalo 620x891',
    'Suun Terveystalo 980x400',
    'Suun Terveystalo 1080x1920 PDOOH'
);

-- Font face declarations (will be included in each template)
-- Note: In production, these would ideally be loaded from a shared CSS file

-- ============================================================================
-- INSERT DISPLAY TEMPLATES WITH FIGMA DESIGNS
-- ============================================================================

-- 1. 300x300 Display Banner
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
    <meta name="viewport" content="width=300, height=300">
    <meta name="ad.size" content="width=300,height=300">
    <title>300x300 - Suun Terveystalo</title>
    <style>
        @font-face {
            font-family: "Terveystalo Sans";
            src: url("/font/TerveystaloSans-Regular.woff2") format("woff2"),
                 url("/font/TerveystaloSans-Regular.woff") format("woff");
            font-weight: 400;
            font-style: normal;
        }
        @font-face {
            font-family: "Terveystalo Sans";
            src: url("/font/TerveystaloSans-SemiBold.woff2") format("woff2"),
                 url("/font/TerveystaloSans-SemiBold.woff") format("woff");
            font-weight: 600;
            font-style: normal;
        }
        @font-face {
            font-family: "Terveystalo Sans";
            src: url("/font/TerveystaloSans-Bold.woff2") format("woff2"),
                 url("/font/TerveystaloSans-Bold.woff") format("woff");
            font-weight: 700;
            font-style: normal;
        }
        @font-face {
            font-family: "Terveystalo Sans Display";
            src: url("/font/TerveystaloSansDisplay-Super.woff2") format("woff2"),
                 url("/font/TerveystaloSansDisplay-Super.woff") format("woff");
            font-weight: 900;
            font-style: normal;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #1a1a1a; }
        .ad-container { width: 300px; height: 300px; position: relative; background: rgba(0, 0, 0, 0); overflow: hidden; font-family: "Terveystalo Sans", sans-serif; }
        .Image { width: 300px; height: 300px; left: 0px; top: 0px; position: absolute; object-fit: cover; }
        .Artwork { width: 315.26px; height: 139.16px; left: 134px; top: 201.58px; position: absolute; transform: rotate(-16deg); transform-origin: top left; }
        .Button { width: 94px; height: 36px; left: 197px; top: 245px; position: absolute; }
        .Background { width: 87px; height: 29px; left: 4px; top: 4px; position: absolute; background: #FEFEFE; border-radius: 13px; }
        .VaraaAika { width: 60px; height: 15px; left: 18px; top: 11px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 11px; font-weight: 700; }
        .Torikatu1Laht { width: 96px; height: 17px; left: 16px; top: 267px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 12px; font-weight: 600; }
        .Logo { width: 122px; height: 16px; left: 17px; top: 249px; position: absolute; }
        .SujuvampaaSuunt { width: 173px; height: 34px; left: 14px; top: 180px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 12px; font-weight: 600; line-height: 14.81px; }
        .HymyileOletHy { width: 174px; height: 46px; left: 15px; top: 130px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 17px; font-weight: 700; line-height: 21.06px; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .Pricetag { width: 104px; height: 105px; left: 9px; top: 15px; position: absolute; overflow: hidden; }
        .Pricetag svg { position: absolute; left: 0; top: 0; }
        .VarssViimeistN { width: 63px; left: 31px; top: 90px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 8px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .Price { width: 65px; height: 34px; left: 34px; top: 56px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 32px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .HammasTarkastu { width: 46px; left: 41px; top: 32px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 10px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
    </style>
</head>
<body>
    <div class="ad-container">
        <img src="{{image_url}}" alt="Background" class="Image" />
        <img src="{{artwork_url}}" alt="Artwork" class="Artwork" />
        <div class="Button">
            <div class="Background"></div>
            <div class="VaraaAika">{{cta_text}}</div>
        </div>
        <div class="Torikatu1Laht">{{branch_address}}</div>
        <img src="{{logo_url}}" alt="Logo" class="Logo" />
        <div class="SujuvampaaSuunt">{{subheadline}}</div>
        <div class="HymyileOletHy">{{headline}}</div>
        <div class="Pricetag">
            <svg width="104" height="105" viewBox="0 0 104 105" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M103.671 58.7705L98.803 31.1659C97.6682 24.7274 93.6598 19.1539 87.9127 16.0265L63.2776 2.61714C57.5305 -0.51024 50.6707 -0.852445 44.6392 1.68558L18.7838 12.5728C12.7523 15.1108 8.20647 20.2566 6.43304 26.5525L1.59642 43.7198C-1.92515 56.2166 0.442582 69.6323 8.02628 80.1742L13.1348 87.2749C20.3107 97.2496 31.6404 103.416 43.9216 104.03L62.854 104.978C69.3913 105.304 75.72 102.639 80.0508 97.7375L98.6165 76.7236C102.947 71.8218 104.809 65.2154 103.674 58.7768" fill="white"/>
            </svg>
        </div>
        <div class="VarssViimeistN">{{offer_date}}</div>
        <div class="Price">{{price}}€</div>
        <div class="HammasTarkastu">{{offer_title}}</div>
    </div>
</body>
</html>',
    '[
        {"key": "headline", "label": "Otsikko", "type": "text", "required": true, "maxLength": 50},
        {"key": "subheadline", "label": "Alaotsikko", "type": "text", "required": false, "maxLength": 80},
        {"key": "offer_title", "label": "Tarjouksen otsikko", "type": "text", "required": true, "maxLength": 30},
        {"key": "price", "label": "Hinta", "type": "text", "required": true, "maxLength": 5},
        {"key": "offer_date", "label": "Tarjouspäivä", "type": "text", "required": false, "maxLength": 50},
        {"key": "cta_text", "label": "CTA teksti", "type": "text", "required": true, "maxLength": 20},
        {"key": "branch_address", "label": "Toimipisteen osoite", "type": "text", "required": false, "maxLength": 50},
        {"key": "image_url", "label": "Taustakuva URL", "type": "image", "required": true},
        {"key": "artwork_url", "label": "Artwork URL", "type": "image", "required": false},
        {"key": "logo_url", "label": "Logo URL", "type": "image", "required": true}
    ]'::jsonb,
    '{
        "headline": "Hymyile.|Olet hyvissä käsissä.",
        "subheadline": "Sujuvampaa suunterveyttä|Lahden Suun Terveystalossa",
        "offer_title": "Hammas-|tarkastus",
        "price": "49",
        "offer_date": "Varaa viimeistään|28.10.",
        "cta_text": "Varaa aika",
        "branch_address": "Torikatu 1, Lahti",
        "image_url": "https://placehold.co/300x300",
        "artwork_url": "https://placehold.co/315x139",
        "logo_url": "https://placehold.co/122x16"
    }'::jsonb,
    ARRAY['display', 'square', 'small', 'sidebar'],
    true,
    1
);

-- 2. 300x431 Display Banner
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
    <meta name="viewport" content="width=300, height=431">
    <meta name="ad.size" content="width=300,height=431">
    <title>300x431 - Suun Terveystalo</title>
    <style>
        @font-face {
            font-family: "Terveystalo Sans";
            src: url("/font/TerveystaloSans-Regular.woff2") format("woff2"),
                 url("/font/TerveystaloSans-Regular.woff") format("woff");
            font-weight: 400;
            font-style: normal;
        }
        @font-face {
            font-family: "Terveystalo Sans";
            src: url("/font/TerveystaloSans-SemiBold.woff2") format("woff2"),
                 url("/font/TerveystaloSans-SemiBold.woff") format("woff");
            font-weight: 600;
            font-style: normal;
        }
        @font-face {
            font-family: "Terveystalo Sans";
            src: url("/font/TerveystaloSans-Bold.woff2") format("woff2"),
                 url("/font/TerveystaloSans-Bold.woff") format("woff");
            font-weight: 700;
            font-style: normal;
        }
        @font-face {
            font-family: "Terveystalo Sans Display";
            src: url("/font/TerveystaloSansDisplay-Super.woff2") format("woff2"),
                 url("/font/TerveystaloSansDisplay-Super.woff") format("woff");
            font-weight: 900;
            font-style: normal;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #1a1a1a; }
        .ad-container { width: 300px; height: 431px; position: relative; background: rgba(0, 0, 0, 0); overflow: hidden; font-family: "Terveystalo Sans", sans-serif; }
        .Image { width: 300px; height: 431px; left: 0px; top: 0px; position: absolute; object-fit: cover; }
        .Artwork { width: 325.77px; height: 143.80px; left: 126px; top: 332.17px; position: absolute; transform: rotate(-16deg); transform-origin: top left; }
        .Groups { width: 300px; height: 414px; left: 0px; top: 1px; position: absolute; }
        .Button { width: 102px; height: 40px; left: 98px; top: 302px; position: absolute; }
        .Background { width: 96px; height: 33px; left: 4px; top: 4px; position: absolute; background: #FEFDFE; border-radius: 15px; border: 1px #A8B1BE solid; }
        .VaraaAika { width: 67px; height: 17px; left: 18px; top: 12px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 13px; font-weight: 700; }
        .Torikatu1Laht { width: 110px; height: 19px; left: 96px; top: 384px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 14px; font-weight: 600; }
        .Logo { width: 164px; height: 22px; left: 67px; top: 361px; position: absolute; }
        .Pricetag { width: 111px; height: 112px; left: 8px; top: 181px; position: absolute; overflow: hidden; }
        .Pricetag svg { position: absolute; left: 0; top: 0; }
        .VaronViimcist { width: 67px; left: 30px; top: 262px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 8px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .Price { width: 66px; height: 37px; left: 34px; top: 224px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 32px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .HammasTarkast { width: 47px; left: 41px; top: 201px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 10px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .SujuvampaaSuunt { width: 199px; height: 37px; left: 54px; top: 85px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 14px; font-weight: 400; line-height: 16.81px; }
        .OletHyvissKS { width: 231px; height: 29px; left: 36px; top: 53px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #E0E0E3; font-size: 22px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .Hymyile { width: 107px; height: 29px; left: 99px; top: 23px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #E0E0E2; font-size: 25px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
    </style>
</head>
<body>
    <div class="ad-container">
        <img src="{{image_url}}" alt="Background" class="Image" />
        <img src="{{artwork_url}}" alt="Artwork" class="Artwork" />
        <div class="Groups">
            <div class="Button">
                <div class="Background"></div>
                <div class="VaraaAika">{{cta_text}}</div>
            </div>
            <div class="Torikatu1Laht">{{branch_address}}</div>
            <img src="{{logo_url}}" alt="Logo" class="Logo" />
            <div class="Pricetag">
                <svg width="111" height="112" viewBox="0 0 111 112" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M110.649 62.6885L105.453 33.2437C104.242 26.3759 99.9639 20.4308 93.8301 17.0949L67.5368 2.79161C61.4029 -0.544257 54.0814 -0.909276 47.6439 1.79795L20.0482 13.411C13.6107 16.1182 8.75895 21.607 6.86615 28.3227L1.70399 46.6344C-2.0546 59.9644 0.472495 74.2745 8.56663 85.5191L14.019 93.0933C21.6779 103.733 33.7701 110.31 46.878 110.966L67.0846 111.976C74.062 112.324 80.8167 109.482 85.439 104.253L105.254 81.8385C109.877 76.6099 111.864 69.563 110.653 62.6953" fill="white"/>
                </svg>
            </div>
            <div class="VaronViimcist">{{offer_date}}</div>
            <div class="Price">{{price}}€</div>
            <div class="HammasTarkast">{{offer_title}}</div>
            <div class="SujuvampaaSuunt">{{subheadline}}</div>
            <div class="OletHyvissKS">{{headline_line2}}</div>
            <div class="Hymyile">{{headline}}</div>
        </div>
    </div>
</body>
</html>',
    '[
        {"key": "headline", "label": "Otsikko (yläosa)", "type": "text", "required": true, "maxLength": 30},
        {"key": "headline_line2", "label": "Otsikko (alaosa)", "type": "text", "required": true, "maxLength": 50},
        {"key": "subheadline", "label": "Alaotsikko", "type": "text", "required": false, "maxLength": 80},
        {"key": "offer_title", "label": "Tarjouksen otsikko", "type": "text", "required": true, "maxLength": 30},
        {"key": "price", "label": "Hinta", "type": "text", "required": true, "maxLength": 5},
        {"key": "offer_date", "label": "Tarjouspäivä", "type": "text", "required": false, "maxLength": 50},
        {"key": "cta_text", "label": "CTA teksti", "type": "text", "required": true, "maxLength": 20},
        {"key": "branch_address", "label": "Toimipisteen osoite", "type": "text", "required": false, "maxLength": 50},
        {"key": "image_url", "label": "Taustakuva URL", "type": "image", "required": true},
        {"key": "artwork_url", "label": "Artwork URL", "type": "image", "required": false},
        {"key": "logo_url", "label": "Logo URL", "type": "image", "required": true}
    ]'::jsonb,
    '{
        "headline": "Hymyile.",
        "headline_line2": "Olet hyvissä käsissä.",
        "subheadline": "Sujuvampaa suunterveyttä|Lahden Suun Terveystalossa.",
        "offer_title": "Hammas-| tarkastus",
        "price": "49",
        "offer_date": "Varon viimeistään| 28.10.",
        "cta_text": "Varaa aika",
        "branch_address": "Torikatu 1, Lahti",
        "image_url": "https://placehold.co/300x431",
        "artwork_url": "https://placehold.co/326x144",
        "logo_url": "https://placehold.co/164x22"
    }'::jsonb,
    ARRAY['display', 'portrait', 'medium'],
    true,
    2
);

-- 3. 300x600 Display Banner
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
    'Half page skyscraper - High impact vertical display ad',
    'display',
    '300x600',
    300,
    600,
    '<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=300, height=600">
    <meta name="ad.size" content="width=300,height=600">
    <title>300x600 - Suun Terveystalo</title>
    <style>
        @font-face {
            font-family: "Terveystalo Sans";
            src: url("/font/TerveystaloSans-Regular.woff2") format("woff2"),
                 url("/font/TerveystaloSans-Regular.woff") format("woff");
            font-weight: 400;
            font-style: normal;
        }
        @font-face {
            font-family: "Terveystalo Sans";
            src: url("/font/TerveystaloSans-SemiBold.woff2") format("woff2"),
                 url("/font/TerveystaloSans-SemiBold.woff") format("woff");
            font-weight: 600;
            font-style: normal;
        }
        @font-face {
            font-family: "Terveystalo Sans";
            src: url("/font/TerveystaloSans-Bold.woff2") format("woff2"),
                 url("/font/TerveystaloSans-Bold.woff") format("woff");
            font-weight: 700;
            font-style: normal;
        }
        @font-face {
            font-family: "Terveystalo Sans Display";
            src: url("/font/TerveystaloSansDisplay-Super.woff2") format("woff2"),
                 url("/font/TerveystaloSansDisplay-Super.woff") format("woff");
            font-weight: 900;
            font-style: normal;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #1a1a1a; }
        .ad-container { width: 300px; height: 600px; position: relative; background: rgba(0, 0, 0, 0); overflow: hidden; font-family: "Terveystalo Sans", sans-serif; }
        .Image { width: 300px; height: 600px; left: 0px; top: 0px; position: absolute; object-fit: cover; }
        .Artwork { width: 330.76px; height: 146.01px; left: 97.12px; top: 506.17px; position: absolute; transform: rotate(-20deg); transform-origin: top left; }
        .Groups { width: 300px; height: 572px; left: 0px; top: 4px; position: absolute; }
        .Button { width: 132px; height: 43px; left: 84px; top: 461px; position: absolute; }
        .Background { width: 125px; height: 35px; left: 4px; top: 5px; position: absolute; background: #FEFEFE; border-radius: 15px; }
        .VaraaAika { width: 78px; left: 27px; top: 13px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 15px; font-weight: 700; }
        .Torikatu1Lahti { width: 110px; left: 96px; top: 547px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 15px; font-weight: 600; }
        .Logo { width: 182px; height: 25px; left: 58px; top: 522px; position: absolute; }
        .Pricetag { width: 123px; height: 124px; left: 9px; top: 301px; position: absolute; overflow: hidden; }
        .Pricetag svg { position: absolute; left: 0; top: 0; }
        .VaraaViimeist { width: 74px; left: 36px; top: 389px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 8px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .Price { width: 74px; height: 42px; left: 40px; top: 347px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 37px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .HammasTarkast { width: 53px; left: 48px; top: 321px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 11px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .SujuvampaaSuunt { width: 224px; height: 46px; left: 42px; top: 96px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 16px; font-weight: 600; line-height: 19.23px; }
        .OletHyvissKS { width: 231px; height: 29px; left: 38px; top: 65px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 22px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .Hymyile { width: 108px; height: 28px; left: 100px; top: 36px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 25px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
    </style>
</head>
<body>
    <div class="ad-container">
        <img src="{{image_url}}" alt="Background" class="Image" />
        <img src="{{artwork_url}}" alt="Artwork" class="Artwork" />
        <div class="Groups">
            <div class="Button">
                <div class="Background"></div>
                <div class="VaraaAika">{{cta_text}}</div>
            </div>
            <div class="Torikatu1Lahti">{{branch_address}}</div>
            <img src="{{logo_url}}" alt="Logo" class="Logo" />
            <div class="Pricetag">
                <svg width="123" height="124" viewBox="0 0 123 124" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M122.611 69.4051L116.854 36.8055C115.512 29.2019 110.771 22.6198 103.974 18.9265L74.8382 3.09071C68.0412 -0.60257 59.9282 -1.0067 52.7947 1.99059L22.2157 14.8478C15.0823 17.8451 9.70601 23.922 7.60859 31.3572L1.88835 51.631C-2.27658 66.3892 0.52372 82.2325 9.4929 94.6819L15.5347 103.068C24.0215 114.847 37.4211 122.129 51.946 122.855L74.3372 123.974C82.0688 124.359 89.5538 121.212 94.6758 115.423L116.633 90.6069C121.755 84.8181 123.957 77.0162 122.615 69.4126" fill="white"/>
                </svg>
            </div>
            <div class="VaraaViimeist">{{offer_date}}</div>
            <div class="Price">{{price}}€</div>
            <div class="HammasTarkast">{{offer_title}}</div>
            <div class="SujuvampaaSuunt">{{subheadline}}</div>
            <div class="OletHyvissKS">{{headline_line2}}</div>
            <div class="Hymyile">{{headline}}</div>
        </div>
    </div>
</body>
</html>',
    '[
        {"key": "headline", "label": "Otsikko (yläosa)", "type": "text", "required": true, "maxLength": 30},
        {"key": "headline_line2", "label": "Otsikko (alaosa)", "type": "text", "required": true, "maxLength": 50},
        {"key": "subheadline", "label": "Alaotsikko", "type": "text", "required": false, "maxLength": 80},
        {"key": "offer_title", "label": "Tarjouksen otsikko", "type": "text", "required": true, "maxLength": 30},
        {"key": "price", "label": "Hinta", "type": "text", "required": true, "maxLength": 5},
        {"key": "offer_date", "label": "Tarjouspäivä", "type": "text", "required": false, "maxLength": 50},
        {"key": "cta_text", "label": "CTA teksti", "type": "text", "required": true, "maxLength": 20},
        {"key": "branch_address", "label": "Toimipisteen osoite", "type": "text", "required": false, "maxLength": 50},
        {"key": "image_url", "label": "Taustakuva URL", "type": "image", "required": true},
        {"key": "artwork_url", "label": "Artwork URL", "type": "image", "required": false},
        {"key": "logo_url", "label": "Logo URL", "type": "image", "required": true}
    ]'::jsonb,
    '{
        "headline": "Hymyile.",
        "headline_line2": "Olet hyvissä käsissä.",
        "subheadline": "Sujuvampaa suunterveyttä|Lahden Suun Terveystalossa.",
        "offer_title": "Hammas-| tarkastus",
        "price": "49",
        "offer_date": "Varaa viimeistään| 28.10.",
        "cta_text": "Varaa aika",
        "branch_address": "Torikatu 1,Lahti",
        "image_url": "https://placehold.co/300x600",
        "artwork_url": "https://placehold.co/331x146",
        "logo_url": "https://placehold.co/182x25"
    }'::jsonb,
    ARRAY['display', 'skyscraper', 'half-page'],
    true,
    3
);

-- 4. 620x891 Display Banner
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
    'Large portrait display banner - High impact for large format placements',
    'display',
    '620x891',
    620,
    891,
    '<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=620, height=891">
    <meta name="ad.size" content="width=620,height=891">
    <title>620x891 - Suun Terveystalo</title>
    <style>
        @font-face {
            font-family: "Terveystalo Sans";
            src: url("/font/TerveystaloSans-Regular.woff2") format("woff2"),
                 url("/font/TerveystaloSans-Regular.woff") format("woff");
            font-weight: 400;
            font-style: normal;
        }
        @font-face {
            font-family: "Terveystalo Sans";
            src: url("/font/TerveystaloSans-SemiBold.woff2") format("woff2"),
                 url("/font/TerveystaloSans-SemiBold.woff") format("woff");
            font-weight: 600;
            font-style: normal;
        }
        @font-face {
            font-family: "Terveystalo Sans";
            src: url("/font/TerveystaloSans-Bold.woff2") format("woff2"),
                 url("/font/TerveystaloSans-Bold.woff") format("woff");
            font-weight: 700;
            font-style: normal;
        }
        @font-face {
            font-family: "Terveystalo Sans Display";
            src: url("/font/TerveystaloSansDisplay-Super.woff2") format("woff2"),
                 url("/font/TerveystaloSansDisplay-Super.woff") format("woff");
            font-weight: 900;
            font-style: normal;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #1a1a1a; }
        .ad-container { width: 620px; height: 891px; position: relative; background: rgba(0, 0, 0, 0); overflow: hidden; font-family: "Terveystalo Sans", sans-serif; }
        .Image { width: 620px; height: 891px; left: 0px; top: 0px; position: absolute; object-fit: cover; }
        .Artwork { width: 688.09px; height: 303.74px; left: 246.57px; top: 670.08px; position: absolute; transform: rotate(-17deg); transform-origin: top left; }
        .Groups { width: 620px; height: 844px; left: 0px; top: 9px; position: absolute; }
        .Button { width: 218px; height: 76px; left: 201px; top: 643px; position: absolute; }
        .Background { width: 214px; height: 68px; left: 4px; top: 5px; position: absolute; background: #FEFEFE; border-radius: 35px; }
        .VaraaAika { width: 136px; height: 30px; left: 42px; top: 23px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 27px; font-weight: 700; }
        .Torikatu1Laht { width: 181px; height: 30px; left: 220px; top: 800px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 24px; font-weight: 600; }
        .Logo { width: 332px; height: 45px; left: 146px; top: 756px; position: absolute; }
        .Pricetag { width: 203px; height: 205px; left: 29px; top: 410px; position: absolute; overflow: hidden; }
        .Pricetag svg { position: absolute; left: 0; top: 0; }
        .VaraaViimeist { width: 121px; height: 37px; left: 72px; top: 556px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 13px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .Price { width: 117px; height: 64px; left: 79px; top: 488px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 56px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .HammasTarkast { width: 87px; height: 43px; left: 92px; top: 445px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 18px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .SujuvampaaSuunt { width: 372px; height: 71px; left: 129px; top: 145px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 26px; font-weight: 600; line-height: 32.09px; }
        .HymyileOletHy { width: 431px; height: 111px; left: 101px; top: 24px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 42px; font-weight: 700; line-height: 53.86px; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
    </style>
</head>
<body>
    <div class="ad-container">
        <img src="{{image_url}}" alt="Background" class="Image" />
        <img src="{{artwork_url}}" alt="Artwork" class="Artwork" />
        <div class="Groups">
            <div class="Button">
                <div class="Background"></div>
                <div class="VaraaAika">{{cta_text}}</div>
            </div>
            <div class="Torikatu1Laht">{{branch_address}}</div>
            <img src="{{logo_url}}" alt="Logo" class="Logo" />
            <div class="Pricetag">
                <svg width="203" height="205" viewBox="0 0 203 205" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M202.358 114.742L192.856 60.8478C190.641 48.2773 182.817 37.3957 171.599 31.2899L123.513 5.10965C112.295 -0.996184 98.9054 -1.6643 87.1323 3.29089L36.6645 24.5468C24.8914 29.502 16.0184 39.5485 12.5568 51.8406L3.11608 85.3577C-3.75775 109.756 0.863882 135.949 15.6667 156.531L25.638 170.394C39.6448 189.868 61.7596 201.907 85.7316 203.107L122.686 204.956C135.446 205.594 147.8 200.391 156.253 190.821L192.492 149.794C200.945 140.224 204.58 127.325 202.364 114.755" fill="white"/>
                </svg>
            </div>
            <div class="VaraaViimeist">{{offer_date}}</div>
            <div class="Price">{{price}}€</div>
            <div class="HammasTarkast">{{offer_title}}</div>
            <div class="SujuvampaaSuunt">{{subheadline}}</div>
            <div class="HymyileOletHy">{{headline}}</div>
        </div>
    </div>
</body>
</html>',
    '[
        {"key": "headline", "label": "Otsikko", "type": "text", "required": true, "maxLength": 80},
        {"key": "subheadline", "label": "Alaotsikko", "type": "text", "required": false, "maxLength": 100},
        {"key": "offer_title", "label": "Tarjouksen otsikko", "type": "text", "required": true, "maxLength": 30},
        {"key": "price", "label": "Hinta", "type": "text", "required": true, "maxLength": 5},
        {"key": "offer_date", "label": "Tarjouspäivä", "type": "text", "required": false, "maxLength": 50},
        {"key": "cta_text", "label": "CTA teksti", "type": "text", "required": true, "maxLength": 20},
        {"key": "branch_address", "label": "Toimipisteen osoite", "type": "text", "required": false, "maxLength": 50},
        {"key": "image_url", "label": "Taustakuva URL", "type": "image", "required": true},
        {"key": "artwork_url", "label": "Artwork URL", "type": "image", "required": false},
        {"key": "logo_url", "label": "Logo URL", "type": "image", "required": true}
    ]'::jsonb,
    '{
        "headline": "Hymyile.|Olet hyvissä käsissä.",
        "subheadline": "Sujuvampaa suunterveyttä|Lahden Suun Terveystalossa.",
        "offer_title": "Hammas-| tarkastus",
        "price": "49",
        "offer_date": "Varaa viimeistään| 28.10.",
        "cta_text": "Varaa aika",
        "branch_address": "Torikatu 1, Lahti",
        "image_url": "https://placehold.co/620x891",
        "artwork_url": "https://placehold.co/688x304",
        "logo_url": "https://placehold.co/332x45"
    }'::jsonb,
    ARRAY['display', 'portrait', 'large'],
    true,
    4
);

-- 5. 980x400 Display Banner
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
    'Large horizontal leaderboard banner - Premium placement for high visibility',
    'display',
    '980x400',
    980,
    400,
    '<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=980, height=400">
    <meta name="ad.size" content="width=980,height=400">
    <title>980x400 - Suun Terveystalo</title>
    <style>
        @font-face {
            font-family: "Terveystalo Sans";
            src: url("/font/TerveystaloSans-Regular.woff2") format("woff2"),
                 url("/font/TerveystaloSans-Regular.woff") format("woff");
            font-weight: 400;
            font-style: normal;
        }
        @font-face {
            font-family: "Terveystalo Sans";
            src: url("/font/TerveystaloSans-SemiBold.woff2") format("woff2"),
                 url("/font/TerveystaloSans-SemiBold.woff") format("woff");
            font-weight: 600;
            font-style: normal;
        }
        @font-face {
            font-family: "Terveystalo Sans";
            src: url("/font/TerveystaloSans-Bold.woff2") format("woff2"),
                 url("/font/TerveystaloSans-Bold.woff") format("woff");
            font-weight: 700;
            font-style: normal;
        }
        @font-face {
            font-family: "Terveystalo Sans Display";
            src: url("/font/TerveystaloSansDisplay-Super.woff2") format("woff2"),
                 url("/font/TerveystaloSansDisplay-Super.woff") format("woff");
            font-weight: 900;
            font-style: normal;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #1a1a1a; }
        .ad-container { width: 980px; height: 400px; position: relative; background: rgba(0, 0, 0, 0); overflow: hidden; font-family: "Terveystalo Sans", sans-serif; }
        .Image { width: 980px; height: 400px; left: 0px; top: 0px; position: absolute; object-fit: cover; }
        .Artwork { width: 666.41px; height: 294.17px; left: 632.34px; top: 174.75px; position: absolute; transform: rotate(-12deg); transform-origin: top left; }
        .Button { width: 168px; height: 52px; left: 27px; top: 216px; position: absolute; }
        .Background { width: 161px; height: 44px; left: 4px; top: 5px; position: absolute; background: #FEFEFE; border-radius: 21px; }
        .VaraaAika { width: 103px; height: 23px; left: 33px; top: 15px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 20px; font-weight: 700; }
        .Torikatu1Laht { width: 144px; height: 24px; left: 37px; top: 351px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 19px; font-weight: 600; }
        .Logo { width: 285px; height: 38px; left: 39px; top: 312px; position: absolute; }
        .SujuvampaaSuunt { width: 321px; height: 61px; left: 39px; top: 141px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 23px; font-weight: 600; line-height: 29.19px; }
        .Pricetag { width: 197px; height: 199px; left: 761px; top: 32px; position: absolute; overflow: hidden; }
        .Pricetag svg { position: absolute; left: 0; top: 0; }
        .VaraaViimeist { width: 119px; height: 38px; left: 803px; top: 173px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 13px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .Price { width: 115px; height: 63px; left: 810px; top: 108px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 57px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .HammasTarkastu { width: 85px; height: 42px; left: 823px; top: 65px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 18px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .HymyileOletHy { width: 365px; height: 96px; left: 38px; top: 42px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 35px; font-weight: 700; line-height: 45.50px; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
    </style>
</head>
<body>
    <div class="ad-container">
        <img src="{{image_url}}" alt="Background" class="Image" />
        <img src="{{artwork_url}}" alt="Artwork" class="Artwork" />
        <div class="Button">
            <div class="Background"></div>
            <div class="VaraaAika">{{cta_text}}</div>
        </div>
        <div class="Torikatu1Laht">{{branch_address}}</div>
        <img src="{{logo_url}}" alt="Logo" class="Logo" />
        <div class="SujuvampaaSuunt">{{subheadline}}</div>
        <div class="Pricetag">
            <svg width="197" height="199" viewBox="0 0 197 199" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M196.377 111.384L187.156 59.0669C185.006 46.8643 177.413 36.3012 166.527 30.3741L119.862 4.9601C108.976 -0.967027 95.9822 -1.61559 84.5571 3.19457L35.581 23.8284C24.1559 28.6386 15.5451 38.391 12.1858 50.3233L3.02414 82.8594C-3.64652 106.544 0.838513 131.97 15.2038 151.949L24.8804 165.407C38.4732 184.311 59.9343 195.997 83.1978 197.162L119.06 198.958C131.443 199.576 143.431 194.526 151.635 185.236L186.803 145.409C195.006 136.119 198.533 123.599 196.383 111.396" fill="white"/>
            </svg>
        </div>
        <div class="VaraaViimeist">{{offer_date}}</div>
        <div class="Price">{{price}}€</div>
        <div class="HammasTarkastu">{{offer_title}}</div>
        <div class="HymyileOletHy">{{headline}}</div>
    </div>
</body>
</html>',
    '[
        {"key": "headline", "label": "Otsikko", "type": "text", "required": true, "maxLength": 80},
        {"key": "subheadline", "label": "Alaotsikko", "type": "text", "required": false, "maxLength": 100},
        {"key": "offer_title", "label": "Tarjouksen otsikko", "type": "text", "required": true, "maxLength": 30},
        {"key": "price", "label": "Hinta", "type": "text", "required": true, "maxLength": 5},
        {"key": "offer_date", "label": "Tarjouspäivä", "type": "text", "required": false, "maxLength": 50},
        {"key": "cta_text", "label": "CTA teksti", "type": "text", "required": true, "maxLength": 20},
        {"key": "branch_address", "label": "Toimipisteen osoite", "type": "text", "required": false, "maxLength": 50},
        {"key": "image_url", "label": "Taustakuva URL", "type": "image", "required": true},
        {"key": "artwork_url", "label": "Artwork URL", "type": "image", "required": false},
        {"key": "logo_url", "label": "Logo URL", "type": "image", "required": true}
    ]'::jsonb,
    '{
        "headline": "Hymyile.|Olet hyvissä käsissä.",
        "subheadline": "Sujuvampaa suunterveyttä|Lahden Suun Terveystalossa",
        "offer_title": "Hammas-|tarkastus",
        "price": "49",
        "offer_date": "Varaa viimeistään|28.10.",
        "cta_text": "Varaa aika",
        "branch_address": "Torikatu 1, Lahti",
        "image_url": "https://placehold.co/980x400",
        "artwork_url": "https://placehold.co/666x294",
        "logo_url": "https://placehold.co/285x38"
    }'::jsonb,
    ARRAY['display', 'leaderboard', 'horizontal'],
    true,
    5
);

-- ============================================================================
-- INSERT PDOOH TEMPLATE WITH FIGMA DESIGN
-- ============================================================================

-- 6. 1080x1920 PDOOH (Digital Out of Home)
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
    'Digital Out of Home - Full vertical screen format for DOOH displays',
    'pdooh',
    '1080x1920',
    1080,
    1920,
    '<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=1080, height=1920">
    <meta name="ad.size" content="width=1080,height=1920">
    <title>1080x1920 PDOOH - Suun Terveystalo</title>
    <style>
        @font-face {
            font-family: "Terveystalo Sans";
            src: url("/font/TerveystaloSans-Regular.woff2") format("woff2"),
                 url("/font/TerveystaloSans-Regular.woff") format("woff");
            font-weight: 400;
            font-style: normal;
        }
        @font-face {
            font-family: "Terveystalo Sans";
            src: url("/font/TerveystaloSans-SemiBold.woff2") format("woff2"),
                 url("/font/TerveystaloSans-SemiBold.woff") format("woff");
            font-weight: 600;
            font-style: normal;
        }
        @font-face {
            font-family: "Terveystalo Sans";
            src: url("/font/TerveystaloSans-Bold.woff2") format("woff2"),
                 url("/font/TerveystaloSans-Bold.woff") format("woff");
            font-weight: 700;
            font-style: normal;
        }
        @font-face {
            font-family: "Terveystalo Sans Display";
            src: url("/font/TerveystaloSansDisplay-Super.woff2") format("woff2"),
                 url("/font/TerveystaloSansDisplay-Super.woff") format("woff");
            font-weight: 900;
            font-style: normal;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #1a1a1a; }
        .ad-container { width: 1080px; height: 1920px; position: relative; background: rgba(0, 0, 0, 0); overflow: hidden; font-family: "Terveystalo Sans", sans-serif; }
        .Root { width: 1080px; height: 600px; left: 0px; top: 0px; position: absolute; }
        .Image { width: 1078.36px; height: 2156.72px; left: 0px; top: -191px; position: absolute; object-fit: cover; }
        .Artwork { width: 1188.95px; height: 524.83px; left: 334.29px; top: 1515.01px; position: absolute; transform: rotate(-20deg); transform-origin: top left; }
        .Groups { width: 1078.36px; height: 2056.08px; left: 0px; top: 13.38px; position: absolute; }
        .Button { width: 474.48px; height: 154.57px; left: 301.94px; top: 1347.08px; position: absolute; }
        .Background { width: 449.32px; height: 125.81px; left: 14.38px; top: 17.97px; position: absolute; background: #FEFEFE; border-radius: 53.92px; }
        .VaraaAika { width: 280.37px; left: 97.05px; top: 46.73px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 53.92px; font-weight: 700; }
        .Torikatu1Lahti { width: 395.40px; left: 345.08px; top: 1656.21px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 53.92px; font-weight: 600; }
        .LegalTeksti { width: 904px; left: 91px; top: 1739.62px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 21px; font-weight: 600; }
        .Logo { width: 660.56px; height: 89.01px; left: 208.48px; top: 1566.35px; position: absolute; }
        .Pricetag { width: 442.13px; height: 445.72px; left: 32.35px; top: 720.62px; position: absolute; overflow: hidden; }
        .Pricetag svg { position: absolute; left: -0.01px; top: 0px; }
        .VaraaViimeist { width: 266px; left: 129.40px; top: 1036.94px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 28.76px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .Price { width: 266px; height: 150.97px; left: 143.78px; top: 885.97px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 133px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .HammasTarkast { width: 190.51px; left: 172.54px; top: 792.51px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 39.54px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .SujuvampaaSuunt { width: 805.18px; height: 165.35px; left: 150.97px; top: 345.08px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 57.51px; font-weight: 600; line-height: 69.14px; }
        .OletHyvissKS { width: 830.34px; height: 104.24px; left: 136.59px; top: 233.64px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 79.08px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .Hymyile { width: 388.21px; height: 100.65px; left: 359.45px; top: 129.40px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 89.86px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
    </style>
</head>
<body>
    <div class="ad-container">
        <div class="Root">
            <img src="{{image_url}}" alt="Background" class="Image" />
            <img src="{{artwork_url}}" alt="Artwork" class="Artwork" />
            <div class="Groups">
                <div class="Button">
                    <div class="Background"></div>
                    <div class="VaraaAika">{{cta_text}}</div>
                </div>
                <div class="Torikatu1Lahti">{{branch_address}}</div>
                <div class="LegalTeksti">{{legal_text}}</div>
                <img src="{{logo_url}}" alt="Logo" class="Logo" />
                <div class="Pricetag">
                    <svg width="443" height="446" viewBox="0 0 443 446" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M440.731 249.479L420.035 132.299C415.211 104.967 398.17 81.3078 373.738 68.0322L269.008 11.1097C244.576 -2.16596 215.414 -3.61861 189.772 7.15523L79.855 53.3711C54.2135 64.145 34.8883 85.9886 27.349 112.715L6.78745 185.59C-8.18354 238.638 1.88223 295.588 34.1223 340.337L55.8396 370.48C86.346 412.822 134.511 438.997 186.722 441.606L267.207 445.628C294.999 447.013 321.904 435.702 340.315 414.894L419.242 325.69C437.654 304.882 445.569 276.838 440.745 249.506" fill="white"/>
                    </svg>
                </div>
                <div class="VaraaViimeist">{{offer_date}}</div>
                <div class="Price">{{price}}€</div>
                <div class="HammasTarkast">{{offer_title}}</div>
                <div class="SujuvampaaSuunt">{{subheadline}}</div>
                <div class="OletHyvissKS">{{headline_line2}}</div>
                <div class="Hymyile">{{headline}}</div>
            </div>
        </div>
    </div>
</body>
</html>',
    '[
        {"key": "headline", "label": "Otsikko (yläosa)", "type": "text", "required": true, "maxLength": 50},
        {"key": "headline_line2", "label": "Otsikko (alaosa)", "type": "text", "required": true, "maxLength": 80},
        {"key": "subheadline", "label": "Alaotsikko", "type": "text", "required": false, "maxLength": 150},
        {"key": "offer_title", "label": "Tarjouksen otsikko", "type": "text", "required": true, "maxLength": 50},
        {"key": "price", "label": "Hinta", "type": "text", "required": true, "maxLength": 5},
        {"key": "offer_date", "label": "Tarjouspäivä", "type": "text", "required": false, "maxLength": 50},
        {"key": "cta_text", "label": "CTA teksti", "type": "text", "required": true, "maxLength": 30},
        {"key": "branch_address", "label": "Toimipisteen osoite", "type": "text", "required": false, "maxLength": 100},
        {"key": "legal_text", "label": "Legal teksti", "type": "text", "required": false, "maxLength": 500},
        {"key": "image_url", "label": "Taustakuva URL", "type": "image", "required": true},
        {"key": "artwork_url", "label": "Artwork URL", "type": "image", "required": false},
        {"key": "logo_url", "label": "Logo URL", "type": "image", "required": true}
    ]'::jsonb,
    '{
        "headline": "Hymyile.",
        "headline_line2": "Olet hyvissä käsissä.",
        "subheadline": "Sujuvampaa suunterveyttä|Lahden Suun Terveystalossa.",
        "offer_title": "Hammas-| tarkastus",
        "price": "49",
        "offer_date": "Varaa viimeistään| 28.10.",
        "cta_text": "Varaa aika",
        "branch_address": "Torikatu 1,Lahti",
        "legal_text": "Tarjous voimassa uusille asiakkaille tai jos edellisestä käynnistäsi on kulunut 3 vuotta. Tarjous koskee arkiaikoja, aika on varattava 22.2.2026 mennessä ja vastaanotolla on käytävä 31.3.2026 mennessä. Hinta sisältää Kela-korvauksen, käyntimaksun ja kanta-maksun. Kampanjan tarkat ehdot ja ohjeet kampanjasivulla terveystalo.com/suunterveystalo.",
        "image_url": "https://placehold.co/1078x2157",
        "artwork_url": "https://placehold.co/1189x525",
        "logo_url": "https://placehold.co/661x89"
    }'::jsonb,
    ARRAY['pdooh', 'dooh', 'digital-signage'],
    true,
    6
);

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Display update results
SELECT name, type, size, active, sort_order
FROM creative_templates
WHERE name IN (
    'Suun Terveystalo 300x300',
    'Suun Terveystalo 300x431',
    'Suun Terveystalo 300x600',
    'Suun Terveystalo 620x891',
    'Suun Terveystalo 980x400',
    'Suun Terveystalo 1080x1920 PDOOH'
)
ORDER BY sort_order;
