INSERT INTO "public"."creative_templates" ("id", "name", "description", "type", "size", "width", "height", "html_template", "css_styles", "js_scripts", "placeholders", "default_values", "preview_url", "thumbnail_url", "tags", "active", "sort_order", "created_at", "updated_at", "category", "editor_state", "is_visual_editor", "canvas_width", "canvas_height") VALUES ('1ed50dd6-f306-4d2b-ad46-cb3bd6d02ffc', 'Suun Terveystalo 620x891', 'Large portrait display banner - High impact for large format placements', 'display', '620x891', '620', '891', '<!DOCTYPE html>
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
        .VaraaAika { width: 136px; height: 30px; left: 42px; top: 23px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 27px; font-weight: 600; }
        .Torikatu1Laht { width: 95%; height: 30px; left: 2.5%; top: 800px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 24px; font-weight: 400; }
        .Logo { width: 332px; height: 45px; left: 146px; top: 756px; position: absolute; }
        .Pricetag { width: 203px; height: 205px; left: 29px; top: 410px; position: absolute; overflow: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; }
        .Pricetag svg { position: absolute; left: 0; top: 0; z-index: 0; }
        .Pricetag-content { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding-top: 12px; }
        .HammasTarkast { width: 130px; text-align: center; color: #0046AD; font-size: 18px; font-family: "Terveystalo Sans", sans-serif; font-weight: 700; line-height: 18px; word-wrap: break-word; }
        .Price { width: 117px; height: 64px; text-align: center; justify-content: center; display: flex; flex-direction: row; align-items: baseline; color: #0046AD; font-size: 56px; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; font-weight: 700; word-wrap: break-word; }
        .Price-currency { font-size: 21px; margin-left: 2px; }
        .VaraaViimeist { width: 121px; text-align: center; color: #0046AD; font-size: 13px; font-family: "Terveystalo Sans", sans-serif; font-weight: 700; line-height: 15px; word-wrap: break-word; }
        .SujuvampaaSuunt { width: 95%; height: 75px; left: 2.5%; top: 150px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 32px; font-weight: 400; line-height: 38px; }
        .Gradient-overlay { position: absolute; left: 0; top: 0; width: 620px; height: 891px; z-index: 0; background: linear-gradient(to bottom, #07051B 0%, transparent 30%, transparent 70%, #07051B 100%); }
        .HymyileOletHy { width: 95%; height: 130px; left: 2.5%; top: 24px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 52px; font-weight: 700; line-height: 62px; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
    </style>
</head>
<body>
    <div class="ad-container">
        <img src="{{image_url}}" alt="Background" class="Image" />
        <div class="Gradient-overlay"></div>
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
                <div class="Pricetag-content">
                    <div class="HammasTarkast">{{offer_title}}</div>
                    <div class="Price">{{price}}<span class="Price-currency">€</span></div>
                    <div class="VaraaViimeist">{{offer_date}}</div>
                </div>
            </div>
            <div class="SujuvampaaSuunt">{{subheadline}}</div>
            <div class="HymyileOletHy">{{headline}}</div>
        </div>
    </div>
</body>
</html>', null, null, '[{"key":"headline","type":"text","label":"Otsikko","required":true,"maxLength":80},{"key":"subheadline","type":"text","label":"Alaotsikko","required":false,"maxLength":100},{"key":"offer_title","type":"text","label":"Tarjouksen otsikko","required":true,"maxLength":30},{"key":"price","type":"text","label":"Hinta","required":true,"maxLength":5},{"key":"offer_date","type":"text","label":"Tarjouspäivä","required":false,"maxLength":50},{"key":"cta_text","type":"text","label":"CTA teksti","required":true,"maxLength":20},{"key":"branch_address","type":"text","label":"Toimipisteen osoite","required":false,"maxLength":50},{"key":"image_url","type":"image","label":"Taustakuva URL","required":true},{"key":"artwork_url","type":"image","label":"Artwork URL","required":false},{"key":"logo_url","type":"image","label":"Logo URL","required":true}]', '{"price":"49","cta_text":"Varaa aika","headline":"Hymyile.|Olet hyvissä käsissä.","logo_url":"https://placehold.co/332x45","image_url":"https://placehold.co/620x891","offer_date":"Varaa viimeistään| 28.10.","artwork_url":"https://placehold.co/688x304","offer_title":"Hammas-| tarkastus","subheadline":"Sujuvampaa suunterveyttä|Lahden Suun Terveystalossa.","branch_address":"Torikatu 1, Lahti"}', null, null, ARRAY['display','portrait','large'], 'true', '4', '2026-03-12 16:53:16.995269+00', '2026-03-12 16:53:16.995269+00', null, null, 'false', null, null), ('495b21df-15b4-4a12-8e9c-0dec2f9f55df', 'Suun Terveystalo 300x300', 'Small square display banner - Perfect for sidebar placements and small ad units', 'display', '300x300', '300', '300', '<!DOCTYPE html>
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
        .VaraaAika { width: 60px; height: 15px; left: 18px; top: 11px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 11px; font-weight: 600; }
        .Torikatu1Laht { width: 96px; height: 17px; left: 16px; top: 267px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 12px; font-weight: 600; }
        .Logo { width: 122px; height: 16px; left: 17px; top: 249px; position: absolute; }
        .SujuvampaaSuunt { width: 173px; height: 34px; left: 14px; top: 180px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 12px; font-weight: 600; line-height: 14.81px; }
        .HymyileOletHy { width: 200px; height: 60px; left: 15px; top: 120px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 24px; font-weight: 700; line-height: 28px; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .Pricetag { width: 104px; height: 105px; left: 9px; top: 15px; position: absolute; overflow: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; }
        .Pricetag svg { position: absolute; left: 0; top: 0; z-index: 0; }
        .Pricetag-content { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding-top: 8px; }
        .HammasTarkastu { width: 70px; text-align: center; color: #0046AD; font-size: 10px; font-family: "Terveystalo Sans", sans-serif; font-weight: 700; line-height: 10.34px; word-wrap: break-word; }
        .Price { width: 65px; height: 34px; text-align: center; justify-content: center; display: flex; flex-direction: row; align-items: baseline; color: #0046AD; font-size: 32px; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; font-weight: 700; word-wrap: break-word; }
        .Price-currency { font-size: 12px; margin-left: 1px; }
        .VarssViimeistN { width: 63px; text-align: center; color: #0046AD; font-size: 8px; font-family: "Terveystalo Sans", sans-serif; font-weight: 700; line-height: 9.38px; word-wrap: break-word; }
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
            <div class="Pricetag-content">
                <div class="HammasTarkastu">{{offer_title}}</div>
                <div class="Price">{{price}}<span class="Price-currency">€</span></div>
                <div class="VarssViimeistN">{{offer_date}}</div>
            </div>
        </div>
    </div>
</body>
</html>', null, null, '[{"key":"headline","type":"text","label":"Otsikko","required":true,"maxLength":50},{"key":"subheadline","type":"text","label":"Alaotsikko","required":false,"maxLength":80},{"key":"offer_title","type":"text","label":"Tarjouksen otsikko","required":true,"maxLength":30},{"key":"price","type":"text","label":"Hinta","required":true,"maxLength":5},{"key":"offer_date","type":"text","label":"Tarjouspäivä","required":false,"maxLength":50},{"key":"cta_text","type":"text","label":"CTA teksti","required":true,"maxLength":20},{"key":"branch_address","type":"text","label":"Toimipisteen osoite","required":false,"maxLength":50},{"key":"image_url","type":"image","label":"Taustakuva URL","required":true},{"key":"artwork_url","type":"image","label":"Artwork URL","required":false},{"key":"logo_url","type":"image","label":"Logo URL","required":true}]', '{"price":"49","cta_text":"Varaa aika","headline":"Hymyile.|Olet hyvissä käsissä.","logo_url":"https://placehold.co/122x16","image_url":"https://placehold.co/300x300","offer_date":"Varaa viimeistään|28.10.","artwork_url":"https://placehold.co/315x139","offer_title":"Hammas-|tarkastus","subheadline":"Sujuvampaa suunterveyttä|Lahden Suun Terveystalossa","branch_address":"Torikatu 1, Lahti"}', null, null, ARRAY['display','square','small','sidebar'], 'true', '1', '2026-03-12 16:53:16.995269+00', '2026-03-12 16:53:16.995269+00', null, null, 'false', null, null), ('56c7b471-2012-48a1-84ae-06c59e69d4cd', 'Suun Terveystalo 980x400', 'Large horizontal leaderboard banner - Premium placement for high visibility', 'display', '980x400', '980', '400', '<!DOCTYPE html>
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
        .Torikatu1Laht { width: 400px; height: 24px; left: 37px; top: 351px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 19px; font-weight: 600; }
        .Logo { width: 285px; height: 38px; left: 39px; top: 312px; position: absolute; }
        .SujuvampaaSuunt { width: 321px; height: 61px; left: 39px; top: 141px; position: absolute; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 23px; font-weight: 600; line-height: 29.19px; }
        .Pricetag { width: 197px; height: 199px; left: 761px; top: 32px; position: absolute; overflow: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; }
        .Pricetag svg { position: absolute; left: 0; top: 0; z-index: 0; }
        .Pricetag-content { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding-top: 12px; }
        .HammasTarkastu { width: 130px; text-align: center; color: #0046AD; font-size: 18px; font-family: "Terveystalo Sans", sans-serif; font-weight: 700; line-height: 18px; word-wrap: break-word; }
        .Price { width: 115px; height: 63px; text-align: center; justify-content: center; display: flex; flex-direction: row; align-items: baseline; color: #0046AD; font-size: 57px; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; font-weight: 700; word-wrap: break-word; }
        .Price-currency { font-size: 22px; margin-left: 2px; }
        .VaraaViimeist { width: 119px; text-align: center; color: #0046AD; font-size: 13px; font-family: "Terveystalo Sans", sans-serif; font-weight: 700; line-height: 15px; word-wrap: break-word; }
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
            <div class="Pricetag-content">
                <div class="HammasTarkastu">{{offer_title}}</div>
                <div class="Price">{{price}}<span class="Price-currency">€</span></div>
                <div class="VaraaViimeist">{{offer_date}}</div>
            </div>
        </div>
        <div class="HymyileOletHy">{{headline}}</div>
    </div>
</body>
</html>', null, null, '[{"key":"headline","type":"text","label":"Otsikko","required":true,"maxLength":80},{"key":"subheadline","type":"text","label":"Alaotsikko","required":false,"maxLength":100},{"key":"offer_title","type":"text","label":"Tarjouksen otsikko","required":true,"maxLength":30},{"key":"price","type":"text","label":"Hinta","required":true,"maxLength":5},{"key":"offer_date","type":"text","label":"Tarjouspäivä","required":false,"maxLength":50},{"key":"cta_text","type":"text","label":"CTA teksti","required":true,"maxLength":20},{"key":"branch_address","type":"text","label":"Toimipisteen osoite","required":false,"maxLength":50},{"key":"image_url","type":"image","label":"Taustakuva URL","required":true},{"key":"artwork_url","type":"image","label":"Artwork URL","required":false},{"key":"logo_url","type":"image","label":"Logo URL","required":true}]', '{"price":"49","cta_text":"Varaa aika","headline":"Hymyile.|Olet hyvissä käsissä.","logo_url":"https://placehold.co/285x38","image_url":"https://placehold.co/980x400","offer_date":"Varaa viimeistään|28.10.","artwork_url":"https://placehold.co/666x294","offer_title":"Hammas-|tarkastus","subheadline":"Sujuvampaa suunterveyttä|Lahden Suun Terveystalossa","branch_address":"Torikatu 1, Lahti"}', null, null, ARRAY['display','leaderboard','horizontal'], 'true', '5', '2026-03-12 16:53:16.995269+00', '2026-03-12 16:53:16.995269+00', null, null, 'false', null, null), ('6e5cdd11-28f4-43e3-b49c-cfe541835160', 'Suun Terveystalo 300x600', 'Half page skyscraper - High impact vertical display ad', 'display', '300x600', '300', '600', '<!DOCTYPE html>
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
        .VaraaAika { width: 78px; left: 27px; top: 13px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 15px; font-weight: 600; }
        .Torikatu1Lahti { width: 95%; left: 2.5%; top: 547px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 15px; font-weight: 400; }
        .Logo { width: 182px; height: 25px; left: 58px; top: 522px; position: absolute; }
        .Pricetag { width: 123px; height: 124px; left: 9px; top: 301px; position: absolute; overflow: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; }
        .Pricetag svg { position: absolute; left: 0; top: 0; z-index: 0; }
        .Pricetag-content { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding-top: 8px; }
        .HammasTarkast { width: 80px; text-align: center; color: #0046AD; font-size: 11px; font-family: "Terveystalo Sans", sans-serif; font-weight: 700; line-height: 10.34px; word-wrap: break-word; }
        .Price { width: 74px; height: 42px; text-align: center; justify-content: center; display: flex; flex-direction: row; align-items: baseline; color: #0046AD; font-size: 37px; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; font-weight: 700; word-wrap: break-word; }
        .Price-currency { font-size: 14px; margin-left: 1px; }
        .VaraaViimeist { width: 74px; text-align: center; color: #0046AD; font-size: 8px; font-family: "Terveystalo Sans", sans-serif; font-weight: 700; line-height: 9.38px; word-wrap: break-word; }
        .SujuvampaaSuunt { width: 85%; height: 50px; left: 8%; top: 96px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 19px; font-weight: 400; line-height: 23px; }
        .Gradient-overlay { position: absolute; left: 0; top: 0; width: 300px; height: 600px; z-index: 0; background: linear-gradient(to bottom, #07051B 0%, transparent 30%, transparent 70%, #07051B 100%); }
        .OletHyvissKS { width: 95%; height: 32px; left: 2.5%; top: 60px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 28px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .Hymyile { width: 95%; height: 32px; left: 2.5%; top: 30px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 28px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
    </style>
</head>
<body>
    <div class="ad-container">
        <img src="{{image_url}}" alt="Background" class="Image" />
        <div class="Gradient-overlay"></div>
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
                <div class="Pricetag-content">
                    <div class="HammasTarkast">{{offer_title}}</div>
                    <div class="Price">{{price}}<span class="Price-currency">€</span></div>
                    <div class="VaraaViimeist">{{offer_date}}</div>
                </div>
            </div>
            <div class="SujuvampaaSuunt">{{subheadline}}</div>
            <div class="OletHyvissKS">{{headline_line2}}</div>
            <div class="Hymyile">{{headline}}</div>
        </div>
    </div>
</body>
</html>', null, null, '[{"key":"headline","type":"text","label":"Otsikko (yläosa)","required":true,"maxLength":30},{"key":"headline_line2","type":"text","label":"Otsikko (alaosa)","required":true,"maxLength":50},{"key":"subheadline","type":"text","label":"Alaotsikko","required":false,"maxLength":80},{"key":"offer_title","type":"text","label":"Tarjouksen otsikko","required":true,"maxLength":30},{"key":"price","type":"text","label":"Hinta","required":true,"maxLength":5},{"key":"offer_date","type":"text","label":"Tarjouspäivä","required":false,"maxLength":50},{"key":"cta_text","type":"text","label":"CTA teksti","required":true,"maxLength":20},{"key":"branch_address","type":"text","label":"Toimipisteen osoite","required":false,"maxLength":50},{"key":"image_url","type":"image","label":"Taustakuva URL","required":true},{"key":"artwork_url","type":"image","label":"Artwork URL","required":false},{"key":"logo_url","type":"image","label":"Logo URL","required":true}]', '{"price":"49","cta_text":"Varaa aika","headline":"Hymyile.","logo_url":"https://placehold.co/182x25","image_url":"https://placehold.co/300x600","offer_date":"Varaa viimeistään| 28.10.","artwork_url":"https://placehold.co/331x146","offer_title":"Hammas-| tarkastus","subheadline":"Sujuvampaa suunterveyttä|Lahden Suun Terveystalossa.","branch_address":"Torikatu 1,Lahti","headline_line2":"Olet hyvissä käsissä."}', null, null, ARRAY['display','skyscraper','half-page'], 'true', '3', '2026-03-12 16:53:16.995269+00', '2026-03-12 16:53:16.995269+00', null, null, 'false', null, null), ('9f3f4122-cd2a-4910-8da7-c84e1103ea9c', 'Suun Terveystalo 1080x1920 Meta (Stories/Reels Portrait)', null, 'meta', '1080x1920', '1080', '1920', '<!DOCTYPE html>
<html lang="fi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Suun Terveystalo - {{offer_title}} {{price}}</title>
<style>
  /* Terveystalo Display Font */
  @font-face {
    font-family: ''TerveystaloSansDisplay'';
    src: url(''/font/TerveystaloSansDisplay-Super.woff2'') format(''woff2''),
         url(''/font/TerveystaloSansDisplay-Super.woff'') format(''woff'');
    font-weight: 900;
    font-style: normal;
  }
  @font-face {
    font-family: ''TerveystaloSans'';
    src: url(''/font/TerveystaloSans-Regular.woff2'') format(''woff2''),
         url(''/font/TerveystaloSans-Regular.woff'') format(''woff'');
    font-weight: 400;
    font-style: normal;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  .ad-container {
    width: 1080px;
    height: 1920px;
    position: relative;
    overflow: hidden;
    background: #0a1e5c;
    font-family: ''TerveystaloSansDisplay'', sans-serif;
  }

  /* ===== BACKGROUND VIDEO (plays throughout) ===== */
  .bg-video-wrap {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 5; overflow: hidden;
  }
  .bg-video-wrap video {
    width: 100%; height: 100%;
    object-fit: cover;
  }

  /* ===== LOGO bottom center ===== */
  .logo-bottom {
    position: absolute; bottom: 120px; left: 50%;
    transform: translateX(-50%);
    z-index: 20;
    display: flex; align-items: baseline; gap: 1px;
    white-space: nowrap;
    animation: logoBotLife 15s linear forwards;
  }
  @keyframes logoBotLife {
    0%   { opacity: 1; }
    54%  { opacity: 1; }
    57%  { opacity: 0; }
    100% { opacity: 0; }
  }

  /* ===== PRICE BADGE: SVG organic blob ===== */
  .price-badge-wrap {
    position: absolute; top: 40px; left: 30px;
    z-index: 25; width: 520px; height: 520px;
    opacity: 0; transform: scale(0.3);
    animation: badgePop 15s linear forwards;
  }
  @keyframes badgePop {
    0%    { opacity: 0; transform: scale(0.3); }
    2%    { opacity: 1; transform: scale(1.05); }
    4%    { opacity: 1; transform: scale(1); }
    55%   { opacity: 1; transform: scale(1); }
    57%   { opacity: 0; transform: scale(1); }
    100%  { opacity: 0; }
  }
  .price-badge-wrap svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
  .badge-content {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding-bottom: 10px;
  }
  .badge-content .badge-label {
    font-family: ''TerveystaloSans'', sans-serif;
    font-size: 40px; font-weight: 400;
    color: #0a3d91; line-height: 1.2; text-align: center;
  }
  .badge-content .badge-price {
    font-size: 146px; font-weight: 900;
    color: #0a3d91; line-height: 0.85;
    display: flex; align-items: flex-end;
  }
  .badge-content .badge-price .euro {
    font-size: 55px; font-weight: 700;
    margin-left: 4px;
    align-self: flex-end;
  }

  /* ===== "{{headline}}" ===== */
  .text-hymyile {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    z-index: 25; font-size: 125px; font-weight: 800;
    color: #fff; width: 100%; text-align: center;
    text-shadow: 0 2px 30px rgba(0,0,0,0.5);
    opacity: 0;
    animation: hymyileAnim 15s linear forwards;
  }
  @keyframes hymyileAnim {
    0%    { opacity: 0; transform: translate(-50%, -30%); }
    27%   { opacity: 0; transform: translate(-50%, -30%); }
    30%   { opacity: 1; transform: translate(-50%, -50%); }
    35%   { opacity: 1; transform: translate(-50%, -50%); }
    38%   { opacity: 1; transform: translate(-50%, -90%); }
    55%   { opacity: 1; transform: translate(-50%, -90%); }
    57%   { opacity: 0; transform: translate(-50%, -90%); }
    100%  { opacity: 0; }
  }

  /* ===== "{{subheadline}}" ===== */
  .text-subline {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -10%);
    z-index: 25; font-size: 110px; font-weight: 800;
    color: #fff; width: 100%; text-align: center;
    text-shadow: 0 2px 30px rgba(0,0,0,0.5);
    line-height: 1.15;
    opacity: 0;
    animation: sublineAnim 15s linear forwards;
  }
  @keyframes sublineAnim {
    0%    { opacity: 0; transform: translate(-50%, 10%); }
    36%   { opacity: 0; transform: translate(-50%, 10%); }
    40%   { opacity: 1; transform: translate(-50%, -10%); }
    55%   { opacity: 1; transform: translate(-50%, -10%); }
    57%   { opacity: 0; }
    100%  { opacity: 0; }
  }

  /* ===== POLKU TRANSITION VIDEO ===== */
  .polku-transition {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 30; pointer-events: none;
    opacity: 0;
    animation: polkuShow 15s linear forwards;
  }
  .polku-transition video {
    width: 100%; height: 100%;
    object-fit: cover;
  }
  @keyframes polkuShow {
    0%    { opacity: 0; }
    48%   { opacity: 0; }
    48.1% { opacity: 1; }
    100%  { opacity: 1; }
  }

  /* ===== SCENE 3: Blue text screen ===== */
  .scene-3 {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 35; background: #0a1e5c;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    opacity: 0;
    animation: scene3Life 15s linear forwards;
  }
  @keyframes scene3Life {
    0%   { opacity: 0; }
    58%  { opacity: 0; }
    60%  { opacity: 1; }
    82%  { opacity: 1; }
    85%  { opacity: 0; }
    100% { opacity: 0; }
  }
  .scene-3-text {
    text-align: center;
    font-size: 96px; font-weight: 800;
    line-height: 1.15; padding: 0 110px;
  }
  .scene-3-text .w {
    display: inline-block; color: #6b82b8;
    animation: wBright 15s linear forwards;
  }
  @keyframes wBright {
    0%   { color: #6b82b8; }
    60%  { color: #6b82b8; }
    67%  { color: #ffffff; }
    100% { color: #ffffff; }
  }
  .scene-3-text .w-suun {
    display: inline-block;
    position: relative;
    width: 210px; height: 85px;
    vertical-align: middle;
    overflow: hidden;
    margin-right: -10px;
    opacity: 0;
    animation: suunFade 15s linear forwards;
  }
  @keyframes suunFade {
    0%   { opacity: 0; }
    59%  { opacity: 0; }
    60%  { opacity: 0.45; }
    67%  { opacity: 1; }
    100% { opacity: 1; }
  }
  .scene-3-text .w-suun video {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    height: 100%;
    object-fit: contain;
  }
  .scene-3-logo {
    position: absolute; bottom: 170px;
    display: flex; align-items: baseline; gap: 1px;
    opacity: 0;
    animation: s3Logo 15s linear forwards;
  }
  @keyframes s3Logo {
    0%   { opacity: 0; }
    61%  { opacity: 0; }
    64%  { opacity: 1; }
    82%  { opacity: 1; }
    85%  { opacity: 0; }
    100% { opacity: 0; }
  }

  /* ===== SCENE 4: End card ===== */
  .scene-4 {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 40; background: #0a1e5c;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    opacity: 0;
    animation: scene4Life 15s linear forwards;
  }
  @keyframes scene4Life {
    0%   { opacity: 0; }
    83%  { opacity: 0; }
    86%  { opacity: 1; }
    100% { opacity: 1; }
  }
  .scene-4-inner {
    display: flex; flex-direction: column;
    align-items: center; margin-top: -110px;
  }
  .scene-4-logo {
    display: flex; align-items: baseline; gap: 2px;
    opacity: 0;
    animation: endLogo 15s linear forwards;
  }
  @keyframes endLogo {
    0%   { opacity: 0; }
    84%  { opacity: 0; }
    87%  { opacity: 1; }
    100% { opacity: 1; }
  }
  .scene-4-address {
    font-family: ''TerveystaloSans'', sans-serif;
    margin-top: 38px; font-size: 84px; font-weight: 400;
    color: #ffffff; letter-spacing: 0.5px;
    opacity: 0;
    animation: addrIn 15s linear forwards;
  }
  @keyframes addrIn {
    0%   { opacity: 0; transform: translateY(8px); }
    89%  { opacity: 0; transform: translateY(8px); }
    94%  { opacity: 1; transform: translateY(0); }
    100% { opacity: 1; transform: translateY(0); }
  }

</style>
</head>
<body>

<div class="ad-container" id="adContainer">

  <!-- BACKGROUND VIDEO -->
  <div class="bg-video-wrap">
    <video id="bgVideo" src="{{background_video}}" muted autoplay playsinline></video>
  </div>

  <!-- AUDIO TRACK -->
  <audio id="audioTrack" src="{{audio_track}}" autoplay></audio>

  <!-- LOGO bottom -->
  <div class="logo-bottom">
    <img src="{{logo_url}}" alt="Suun Terveystalo" style="height: 100px; width: auto;">
  </div>

  <!-- PRICE BADGE -->
  <div class="price-badge-wrap">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 328.99 331.38" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
      <path fill="#ffffff" d="M327.95,185.48l-15.4-87.12c-3.59-20.32-16.27-37.91-34.45-47.78L200.17,8.26c-18.18-9.87-39.88-10.95-58.96-2.94L59.42,39.68c-19.08,8.01-33.46,24.25-39.07,44.12l-15.3,54.18c-11.14,39.44-3.65,81.78,20.34,115.05l16.16,22.41c22.7,31.48,58.54,50.94,97.39,52.88l59.89,2.99c20.68,1.03,40.7-7.38,54.4-22.85l58.73-66.32c13.7-15.47,19.59-36.32,16-56.64"/>
    </svg>
    <div class="badge-content">
      <div class="badge-label">{{offer_title}}<br>{{offer_subtitle}}</div>
      <div class="badge-price">{{price}}<span class="euro">€</span></div>
    </div>
  </div>

  <!-- TEXT overlays -->
  <div class="text-hymyile">{{headline}}</div>
  <div class="text-subline">{{subheadline}}</div>

  <!-- POLKU TRANSITION -->
  <div class="polku-transition">
    <video id="polkuVideo" src="/meta/elements/polku9-16.webm" muted playsinline preload="auto"></video>
  </div>

  <!-- SCENE 3: Blue text -->
  <div class="scene-3">
    <div class="scene-3-text">
      <span class="w">{{scene3_line1}}</span><br>
      <span class="w w-suun"><video id="suunVideo" src="/meta/elements/suun.webm" muted playsinline preload="auto"></video></span><span class="w">{{scene3_line2}}</span><br>
      <span class="w">{{scene3_line3}}</span><br>
      <span class="w">{{scene3_line4}}</span>
    </div>
    <div class="scene-3-logo">
      <img src="{{logo_url}}" alt="Suun Terveystalo" style="height: 100px; width: auto;">
    </div>
  </div>

  <!-- SCENE 4: End card -->
  <div class="scene-4">
    <div class="scene-4-inner">
      <div class="scene-4-logo">
        <img src="{{logo_url}}" alt="Suun Terveystalo" style="height: 116px; width: auto;">
      </div>
      <div class="scene-4-address">{{branch_address}}</div>
    </div>
  </div>

</div>

<script>
// Play suun video when scene 3 appears (60% of 15s = 9s)
var suunTimer;
function startSuunTimer() {
  var sv = document.getElementById(''suunVideo'');
  if (sv) { sv.pause(); sv.currentTime = 0; }
  suunTimer = setTimeout(function() {
    var sv = document.getElementById(''suunVideo'');
    if (sv) { sv.currentTime = 0; sv.play(); }
  }, 9000);
}
startSuunTimer();

// Play polku transition at 48% of 15s = 7.2s
setTimeout(function() {
  var pv = document.getElementById(''polkuVideo'');
  if (pv) { pv.currentTime = 0; pv.play(); }
}, 7200);

// Hide price badge when no offer (brand message)
(function() {
  var bp = document.querySelector(''.badge-price'');
  if (bp && (!bp.textContent.trim() || bp.textContent.trim() === ''€'')) {
    var wrap = document.querySelector(''.price-badge-wrap'');
    if (wrap) wrap.style.display = ''none'';
  }
})();
</script>
</body>
</html>', null, null, '[{"key":"headline","type":"text","label":"Headline","required":true},{"key":"subheadline","type":"text","label":"Subheadline","required":false},{"key":"offer_text","type":"text","label":"Offer Text","required":true},{"key":"cta_text","type":"text","label":"CTA Text","required":true},{"key":"background_image","type":"image","label":"Background Image","required":false},{"key":"branch_address","type":"text","label":"Branch Address","required":false}]', '{"price":"49","headline":"Hymyile.","logo_url":"https://qhvzpxkfboqkrnxxrzuj.supabase.co/storage/v1/object/public/media/brand-assets/1770090175519-ecxz8g.png","audio_track":"/meta/audio/Terveystalo Suun TT TVC Brändillinen 15s 2025 09 23 Net Master -14LUFS.wav","offer_title":"Hammastarkastus","subheadline":"Olet hyvissä käsissä.","scene3_line1":"Sujuvampaa","scene3_line2":"terveyttä","scene3_line3":"{{city_name}}","scene3_line4":"Suun Terveystalossa.","branch_address":"{{branch_address}}","offer_subtitle":"uusille asiakkaille","background_video":"/meta/vids/nainen.mp4"}', null, null, ARRAY['meta','social','portrait','stories','reels','1080x1920'], 'true', '2', '2026-03-03 11:35:50.994438+00', '2026-03-03 11:35:50.994438+00', 'social', null, 'false', null, null), ('d71f1c92-5596-43aa-b0e2-496fa594f219', 'Suun Terveystalo 1080x1080 Meta (Square)', null, 'meta', '1080x1080', '1080', '1080', '<!DOCTYPE html>
<html lang="fi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Suun Terveystalo - {{offer_title}} {{price}}</title>
<style>
  /* Terveystalo Display Font */
  @font-face {
    font-family: ''TerveystaloSansDisplay'';
    src: url(''/font/TerveystaloSansDisplay-Super.woff2'') format(''woff2''),
         url(''/font/TerveystaloSansDisplay-Super.woff'') format(''woff'');
    font-weight: 900;
    font-style: normal;
  }
  @font-face {
    font-family: ''TerveystaloSans'';
    src: url(''/font/TerveystaloSans-Regular.woff2'') format(''woff2''),
         url(''/font/TerveystaloSans-Regular.woff'') format(''woff'');
    font-weight: 400;
    font-style: normal;
  }

  * { margin: 0; padding: 0; box-sizing: border-box; }

  .ad-container {
    width: 1080px;
    height: 1080px;
    position: relative;
    overflow: hidden;
    background: #0a1e5c;
    font-family: ''TerveystaloSansDisplay'', sans-serif;
  }

  /* ===== BACKGROUND VIDEO (plays throughout) ===== */
  .bg-video-wrap {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 5; overflow: hidden;
  }
  .bg-video-wrap video {
    width: 100%; height: 100%;
    object-fit: cover;
  }

  /* ===== LOGO bottom center ===== */
  .logo-bottom {
    position: absolute; bottom: 65px; left: 50%;
    transform: translateX(-50%);
    z-index: 20;
    display: flex; align-items: baseline; gap: 1px;
    white-space: nowrap;
    animation: logoBotLife 15s linear forwards;
  }
  @keyframes logoBotLife {
    0%   { opacity: 1; }
    54%  { opacity: 1; }
    57%  { opacity: 0; }
    100% { opacity: 0; }
  }

  /* ===== PRICE BADGE: SVG organic blob ===== */
  .price-badge-wrap {
    position: absolute; top: 20px; left: 15px;
    z-index: 25; width: 290px; height: 290px;
    opacity: 0; transform: scale(0.3);
    animation: badgePop 15s linear forwards;
  }
  @keyframes badgePop {
    0%    { opacity: 0; transform: scale(0.3); }
    2%    { opacity: 1; transform: scale(1.05); }
    4%    { opacity: 1; transform: scale(1); }
    55%   { opacity: 1; transform: scale(1); }
    57%   { opacity: 0; transform: scale(1); }
    100%  { opacity: 0; }
  }
  .price-badge-wrap svg { position: absolute; top: 0; left: 0; width: 100%; height: 100%; }
  .badge-content {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    padding-bottom: 5px;
  }
  .badge-content .badge-label {
    font-family: ''TerveystaloSans'', sans-serif;
    font-size: 22px; font-weight: 400;
    color: #0a3d91; line-height: 1.2; text-align: center;
  }
  .badge-content .badge-price {
    font-size: 82px; font-weight: 900;
    color: #0a3d91; line-height: 0.85;
    display: flex; align-items: flex-end;
  }
  .badge-content .badge-price .euro {
    font-size: 32px; font-weight: 700;
    margin-left: 2px;
    align-self: flex-end;
  }

  /* ===== "{{headline}}" ===== */
  .text-hymyile {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    z-index: 25; font-size: 70px; font-weight: 800;
    color: #fff; width: 100%; text-align: center;
    text-shadow: 0 2px 30px rgba(0,0,0,0.5);
    opacity: 0;
    animation: hymyileAnim 15s linear forwards;
  }
  @keyframes hymyileAnim {
    0%    { opacity: 0; transform: translate(-50%, -30%); }
    27%   { opacity: 0; transform: translate(-50%, -30%); }
    30%   { opacity: 1; transform: translate(-50%, -50%); }
    35%   { opacity: 1; transform: translate(-50%, -50%); }
    38%   { opacity: 1; transform: translate(-50%, -90%); }
    55%   { opacity: 1; transform: translate(-50%, -90%); }
    57%   { opacity: 0; transform: translate(-50%, -90%); }
    100%  { opacity: 0; }
  }

  /* ===== "{{subheadline}}" ===== */
  .text-subline {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -10%);
    z-index: 25; font-size: 62px; font-weight: 800;
    color: #fff; width: 100%; text-align: center;
    text-shadow: 0 2px 30px rgba(0,0,0,0.5);
    line-height: 1.15;
    opacity: 0;
    animation: sublineAnim 15s linear forwards;
  }
  @keyframes sublineAnim {
    0%    { opacity: 0; transform: translate(-50%, 10%); }
    36%   { opacity: 0; transform: translate(-50%, 10%); }
    40%   { opacity: 1; transform: translate(-50%, -10%); }
    55%   { opacity: 1; transform: translate(-50%, -10%); }
    57%   { opacity: 0; }
    100%  { opacity: 0; }
  }

  /* ===== POLKU TRANSITION VIDEO ===== */
  .polku-transition {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 30; pointer-events: none;
    opacity: 0;
    animation: polkuShow 15s linear forwards;
  }
  .polku-transition video {
    width: 100%; height: 100%;
    object-fit: cover;
  }
  @keyframes polkuShow {
    0%    { opacity: 0; }
    48%   { opacity: 0; }
    48.1% { opacity: 1; }
    100%  { opacity: 1; }
  }

  /* ===== SCENE 3: Blue text screen ===== */
  .scene-3 {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 35; background: #0a1e5c;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    opacity: 0;
    animation: scene3Life 15s linear forwards;
  }
  @keyframes scene3Life {
    0%   { opacity: 0; }
    58%  { opacity: 0; }
    60%  { opacity: 1; }
    82%  { opacity: 1; }
    85%  { opacity: 0; }
    100% { opacity: 0; }
  }
  .scene-3-text {
    text-align: center;
    font-size: 78px; font-weight: 800;
    line-height: 1.15; padding: 0 60px;
  }
  .scene-3-text .w {
    display: inline-block; color: #6b82b8;
    animation: wBright 15s linear forwards;
  }
  @keyframes wBright {
    0%   { color: #6b82b8; }
    60%  { color: #6b82b8; }
    67%  { color: #ffffff; }
    100% { color: #ffffff; }
  }
  .scene-3-text .w-suun {
    display: inline-block;
    position: relative;
    width: 170px; height: 70px;
    vertical-align: middle;
    overflow: hidden;
    margin-right: -8px;
    opacity: 0;
    animation: suunFade 15s linear forwards;
  }
  @keyframes suunFade {
    0%   { opacity: 0; }
    59%  { opacity: 0; }
    60%  { opacity: 0.45; }
    67%  { opacity: 1; }
    100% { opacity: 1; }
  }
  .scene-3-text .w-suun video {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    height: 100%;
    object-fit: contain;
  }
  .scene-3-logo {
    position: absolute; bottom: 95px;
    display: flex; align-items: baseline; gap: 1px;
    opacity: 0;
    animation: s3Logo 15s linear forwards;
  }
  @keyframes s3Logo {
    0%   { opacity: 0; }
    61%  { opacity: 0; }
    64%  { opacity: 1; }
    82%  { opacity: 1; }
    85%  { opacity: 0; }
    100% { opacity: 0; }
  }

  /* ===== SCENE 4: End card ===== */
  .scene-4 {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 40; background: #0a1e5c;
    display: flex; flex-direction: column;
    align-items: center; justify-content: center;
    opacity: 0;
    animation: scene4Life 15s linear forwards;
  }
  @keyframes scene4Life {
    0%   { opacity: 0; }
    83%  { opacity: 0; }
    86%  { opacity: 1; }
    100% { opacity: 1; }
  }
  .scene-4-inner {
    display: flex; flex-direction: column;
    align-items: center; margin-top: -60px;
  }
  .scene-4-logo {
    display: flex; align-items: baseline; gap: 2px;
    opacity: 0;
    animation: endLogo 15s linear forwards;
  }
  @keyframes endLogo {
    0%   { opacity: 0; }
    84%  { opacity: 0; }
    87%  { opacity: 1; }
    100% { opacity: 1; }
  }
  .scene-4-address {
    font-family: ''TerveystaloSans'', sans-serif;
    margin-top: 22px; font-size: 48px; font-weight: 400;
    color: #ffffff; letter-spacing: 0.5px;
    opacity: 0;
    animation: addrIn 15s linear forwards;
  }
  @keyframes addrIn {
    0%   { opacity: 0; transform: translateY(8px); }
    89%  { opacity: 0; transform: translateY(8px); }
    94%  { opacity: 1; transform: translateY(0); }
    100% { opacity: 1; transform: translateY(0); }
  }

</style>
</head>
<body>

<div class="ad-container" id="adContainer">

  <!-- BACKGROUND VIDEO -->
  <div class="bg-video-wrap">
    <video id="bgVideo" src="{{background_video}}" muted autoplay playsinline></video>
  </div>

  <!-- AUDIO TRACK -->
  <audio id="audioTrack" src="{{audio_track}}" autoplay></audio>

  <!-- LOGO bottom -->
  <div class="logo-bottom">
    <img src="{{logo_url}}" alt="Suun Terveystalo" style="height: 58px; width: auto;">
  </div>

  <!-- PRICE BADGE -->
  <div class="price-badge-wrap">
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 328.99 331.38" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;">
      <path fill="#ffffff" d="M327.95,185.48l-15.4-87.12c-3.59-20.32-16.27-37.91-34.45-47.78L200.17,8.26c-18.18-9.87-39.88-10.95-58.96-2.94L59.42,39.68c-19.08,8.01-33.46,24.25-39.07,44.12l-15.3,54.18c-11.14,39.44-3.65,81.78,20.34,115.05l16.16,22.41c22.7,31.48,58.54,50.94,97.39,52.88l59.89,2.99c20.68,1.03,40.7-7.38,54.4-22.85l58.73-66.32c13.7-15.47,19.59-36.32,16-56.64"/>
    </svg>
    <div class="badge-content">
      <div class="badge-label">{{offer_title}}<br>{{offer_subtitle}}</div>
      <div class="badge-price">{{price}}<span class="euro">€</span></div>
    </div>
  </div>

  <!-- TEXT overlays -->
  <div class="text-hymyile">{{headline}}</div>
  <div class="text-subline">{{subheadline}}</div>

  <!-- POLKU TRANSITION -->
  <div class="polku-transition">
    <video id="polkuVideo" src="/meta/elements/polku1-1.webm" muted playsinline preload="auto"></video>
  </div>

  <!-- SCENE 3: Blue text -->
  <div class="scene-3">
    <div class="scene-3-text">
      <span class="w">{{scene3_line1}}</span><br>
      <span class="w w-suun"><video id="suunVideo" src="/meta/elements/suun.webm" muted playsinline preload="auto"></video></span><span class="w">{{scene3_line2}}</span><br>
      <span class="w">{{scene3_line3}}</span><br>
      <span class="w">{{scene3_line4}}</span>
    </div>
    <div class="scene-3-logo">
      <img src="{{logo_url}}" alt="Suun Terveystalo" style="height: 58px; width: auto;">
    </div>
  </div>

  <!-- SCENE 4: End card -->
  <div class="scene-4">
    <div class="scene-4-inner">
      <div class="scene-4-logo">
        <img src="{{logo_url}}" alt="Suun Terveystalo" style="height: 68px; width: auto;">
      </div>
      <div class="scene-4-address">{{branch_address}}</div>
    </div>
  </div>

</div>

<script>
// Play suun video when scene 3 appears (60% of 15s = 9s)
var suunTimer;
function startSuunTimer() {
  var sv = document.getElementById(''suunVideo'');
  if (sv) { sv.pause(); sv.currentTime = 0; }
  suunTimer = setTimeout(function() {
    var sv = document.getElementById(''suunVideo'');
    if (sv) { sv.currentTime = 0; sv.play(); }
  }, 9000);
}
startSuunTimer();

// Play polku transition at 48% of 15s = 7.2s
setTimeout(function() {
  var pv = document.getElementById(''polkuVideo'');
  if (pv) { pv.currentTime = 0; pv.play(); }
}, 7200);

// Hide price badge when no offer (brand message)
(function() {
  var bp = document.querySelector(''.badge-price'');
  if (bp && (!bp.textContent.trim() || bp.textContent.trim() === ''€'')) {
    var wrap = document.querySelector(''.price-badge-wrap'');
    if (wrap) wrap.style.display = ''none'';
  }
})();
</script>
</body>
</html>', null, null, '[{"key":"headline","type":"text","label":"Headline","required":true},{"key":"subheadline","type":"text","label":"Subheadline","required":false},{"key":"offer_text","type":"text","label":"Offer Text","required":true},{"key":"cta_text","type":"text","label":"CTA Text","required":true},{"key":"background_image","type":"image","label":"Background Image","required":false},{"key":"branch_address","type":"text","label":"Branch Address","required":false}]', '{"price":"49","headline":"Hymyile.","logo_url":"https://qhvzpxkfboqkrnxxrzuj.supabase.co/storage/v1/object/public/media/brand-assets/1770090175519-ecxz8g.png","audio_track":"/meta/audio/Terveystalo Suun TT TVC Brändillinen 15s 2025 09 23 Net Master -14LUFS.wav","offer_title":"Hammastarkastus","subheadline":"Olet hyvissä käsissä.","scene3_line1":"Sujuvampaa","scene3_line2":"terveyttä","scene3_line3":"{{city_name}}","scene3_line4":"Suun Terveystalossa.","branch_address":"{{branch_address}}","offer_subtitle":"uusille asiakkaille","background_video":"/meta/vids/nainen.mp4"}', null, null, ARRAY['meta','social','square','1080x1080'], 'true', '1', '2026-03-03 11:35:50.994438+00', '2026-03-03 11:35:50.994438+00', 'social', null, 'false', null, null), ('d7f6fb8d-b0ea-4027-9edd-30af07ddf669', 'Suun Terveystalo 1080x1920 PDOOH', 'Digital Out of Home - Full vertical screen format for DOOH displays', 'pdooh', '1080x1920', '1080', '1920', '<!DOCTYPE html>
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
        .Image { width: 1080px; height: 1920px; left: 0px; top: 0px; position: absolute; object-fit: cover; }
        .Artwork { width: 1188.95px; height: 524.83px; left: 334.29px; top: 1515.01px; position: absolute; transform: rotate(-20deg); transform-origin: top left; }
        .Groups { width: 1078.36px; height: 2056.08px; left: 0px; top: 13.38px; position: absolute; }
        .Button { width: 474.48px; height: 154.57px; left: 301.94px; top: 1347.08px; position: absolute; }
        .Background { width: 449.32px; height: 125.81px; left: 14.38px; top: 17.97px; position: absolute; background: #FEFEFE; border-radius: 53.92px; }
        .VaraaAika { width: 280.37px; left: 97.05px; top: 46.73px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 53.92px; font-weight: 700; }
        .Torikatu1Lahti { width: 95%; left: 2.5%; top: 1656.21px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 53.92px; font-weight: 400; }
        .LegalTeksti { width: 904px; left: 91px; top: 1739.62px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 21px; font-weight: 600; }
        .Logo { width: 660.56px; height: 89.01px; left: 208.48px; top: 1566.35px; position: absolute; }
        .Pricetag { width: 442.13px; height: 445.72px; left: 32.35px; top: 720.62px; position: absolute; overflow: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; }
        .Pricetag svg { position: absolute; left: -0.01px; top: 0px; z-index: 0; }
        .Pricetag-content { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; padding-top: 20px; }
        .HammasTarkast { width: 280px; text-align: center; color: #0046AD; font-size: 39.54px; font-family: "Terveystalo Sans", sans-serif; font-weight: 700; line-height: 40px; word-wrap: break-word; }
        .Price { width: 266px; height: 150.97px; text-align: center; justify-content: center; display: flex; flex-direction: row; align-items: baseline; color: #0046AD; font-size: 133px; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; font-weight: 700; word-wrap: break-word; }
        .Price-currency { font-size: 50px; margin-left: 4px; }
        .VaraaViimeist { width: 266px; text-align: center; color: #0046AD; font-size: 28.76px; font-family: "Terveystalo Sans", sans-serif; font-weight: 700; line-height: 32px; word-wrap: break-word; }
        .SujuvampaaSuunt { width: 95%; height: 180px; left: 2.5%; top: 345.08px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 64px; font-weight: 400; line-height: 76px; }
        .Gradient-overlay { position: absolute; left: 0; top: 0; width: 1080px; height: 1920px; z-index: 0; background: linear-gradient(to bottom, #07051B 0%, transparent 30%, transparent 70%, #07051B 100%); }
        .OletHyvissKS { width: 95%; height: 120px; left: 2.5%; top: 245px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 105px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .Hymyile { width: 95%; height: 120px; left: 2.5%; top: 129.40px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 110px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
    </style>
</head>
<body>
    <div class="ad-container">
        <div class="Root">
            <img src="{{image_url}}" alt="Background" class="Image" />
            <div class="Gradient-overlay"></div>
            <img src="{{artwork_url}}" alt="Artwork" class="Artwork" />
            <div class="Groups">
                <div class="Torikatu1Lahti">{{branch_address}}</div>
                <div class="LegalTeksti">{{legal_text}}</div>
                <img src="{{logo_url}}" alt="Logo" class="Logo" />
                <div class="Pricetag">
                    <svg width="443" height="446" viewBox="0 0 443 446" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M440.731 249.479L420.035 132.299C415.211 104.967 398.17 81.3078 373.738 68.0322L269.008 11.1097C244.576 -2.16596 215.414 -3.61861 189.772 7.15523L79.855 53.3711C54.2135 64.145 34.8883 85.9886 27.349 112.715L6.78745 185.59C-8.18354 238.638 1.88223 295.588 34.1223 340.337L55.8396 370.48C86.346 412.822 134.511 438.997 186.722 441.606L267.207 445.628C294.999 447.013 321.904 435.702 340.315 414.894L419.242 325.69C437.654 304.882 445.569 276.838 440.745 249.506" fill="white"/>
                    </svg>
                    <div class="Pricetag-content">
                        <div class="HammasTarkast">{{offer_title}}</div>
                        <div class="Price">{{price}}<span class="Price-currency">€</span></div>
                        <div class="VaraaViimeist">{{offer_date}}</div>
                    </div>
                </div>
                <div class="SujuvampaaSuunt">{{subheadline}}</div>
                <div class="OletHyvissKS">{{headline_line2}}</div>
                <div class="Hymyile">{{headline}}</div>
            </div>
        </div>
    </div>
</body>
</html>', null, null, '[{"key":"headline","type":"text","label":"Otsikko (yläosa)","required":true,"maxLength":50},{"key":"headline_line2","type":"text","label":"Otsikko (alaosa)","required":true,"maxLength":80},{"key":"subheadline","type":"text","label":"Alaotsikko","required":false,"maxLength":150},{"key":"offer_title","type":"text","label":"Tarjouksen otsikko","required":true,"maxLength":50},{"key":"price","type":"text","label":"Hinta","required":true,"maxLength":5},{"key":"offer_date","type":"text","label":"Tarjouspäivä","required":false,"maxLength":50},{"key":"cta_text","type":"text","label":"CTA teksti","required":true,"maxLength":30},{"key":"branch_address","type":"text","label":"Toimipisteen osoite","required":false,"maxLength":100},{"key":"legal_text","type":"text","label":"Legal teksti","required":false,"maxLength":500},{"key":"image_url","type":"image","label":"Taustakuva URL","required":true},{"key":"artwork_url","type":"image","label":"Artwork URL","required":false},{"key":"logo_url","type":"image","label":"Logo URL","required":true}]', '{"price":"49","cta_text":"Varaa aika","headline":"Hymyile.","logo_url":"https://placehold.co/661x89","image_url":"https://placehold.co/1078x2157","legal_text":"Tarjous voimassa uusille asiakkaille tai jos edellisestä käynnistäsi on kulunut 3 vuotta. Tarjous koskee arkiaikoja, aika on varattava 22.2.2026 mennessä ja vastaanotolla on käytävä 31.3.2026 mennessä. Hinta sisältää Kela-korvauksen, käyntimaksun ja kanta-maksun. Kampanjan tarkat ehdot ja ohjeet kampanjasivulla terveystalo.com/suunterveystalo.","offer_date":"Varaa viimeistään| 28.10.","artwork_url":"https://placehold.co/1189x525","offer_title":"Hammas-| tarkastus","subheadline":"Sujuvampaa suunterveyttä|Lahden Suun Terveystalossa.","branch_address":"Torikatu 1,Lahti","headline_line2":"Olet hyvissä käsissä."}', null, null, ARRAY['pdooh','dooh','digital-signage'], 'true', '6', '2026-03-12 16:53:16.995269+00', '2026-03-12 16:53:16.995269+00', null, null, 'false', null, null), ('fe1fff31-9fc3-458e-b60a-65abffdb9d92', 'Suun Terveystalo 300x431', 'Portrait medium display banner - Popular for interstitial and sidebar placements', 'display', '300x431', '300', '431', '<!DOCTYPE html>
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
        .Gradient-overlay { position: absolute; left: 0; top: 0; width: 300px; height: 431px; z-index: 0; background: linear-gradient(to bottom, #07051B 0%, transparent 40%, transparent 60%, #07051B 100%); }
        .Artwork { width: 325.77px; height: 143.80px; left: 126px; top: 332.17px; position: absolute; transform: rotate(-16deg); transform-origin: top left; }
        .Groups { width: 300px; height: 414px; left: 0px; top: 1px; position: absolute; }
        .Button { width: 102px; height: 40px; left: 98px; top: 302px; position: absolute; }
        .Background { width: 96px; height: 33px; left: 4px; top: 4px; position: absolute; background: #FEFDFE; border-radius: 15px; border: 1px #A8B1BE solid; }
        .VaraaAika { width: 67px; height: 17px; left: 18px; top: 12px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 13px; font-weight: 600; }
        .Torikatu1Laht { width: 95%; height: 19px; left: 2.5%; top: 384px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 14px; font-weight: 400; }
        .Logo { width: 164px; height: 22px; left: 67px; top: 361px; position: absolute; }
        .Pricetag { width: 111px; height: 112px; left: 8px; top: 181px; position: absolute; overflow: hidden; display: flex; flex-direction: column; justify-content: center; align-items: center; }
        .Pricetag svg { position: absolute; left: 0; top: 0; z-index: 0; }
        .Pricetag-content { position: relative; z-index: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 2px; padding-top: 8px; }
        .HammasTarkast { width: 75px; text-align: center; color: #0046AD; font-size: 10px; font-family: "Terveystalo Sans", sans-serif; font-weight: 700; line-height: 10.34px; word-wrap: break-word; }
        .Price { width: 66px; height: 37px; text-align: center; justify-content: center; display: flex; flex-direction: row; align-items: flex-end; color: #0046AD; font-size: 32px; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; font-weight: 700; word-wrap: break-word; }
        .Price-currency { font-size: 12px; align-self: flex-end; margin-left: 1px; }
        .VaronViimcist { width: 67px; text-align: center; color: #0046AD; font-size: 8px; font-family: "Terveystalo Sans", sans-serif; font-weight: 700; line-height: 9.38px; word-wrap: break-word; }
        .SujuvampaaSuunt { width: 95%; height: 45px; left: 2.5%; top: 90px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 17px; font-weight: 400; line-height: 20px; }
        .OletHyvissKS { width: 95%; height: 32px; left: 2.5%; top: 55px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 28px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
        .Hymyile { width: 95%; height: 32px; left: 2.5%; top: 23px; position: absolute; text-align: center; justify-content: center; display: flex; flex-direction: column; color: white; font-size: 28px; font-weight: 700; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; }
    </style>
</head>
<body>
    <div class="ad-container">
        <img src="{{image_url}}" alt="Background" class="Image" />
        <div class="Gradient-overlay"></div>
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
                <div class="Pricetag-content">
                    <div class="HammasTarkast">{{offer_title}}</div>
                    <div class="Price">{{price}}<span class="Price-currency">€</span></div>
                    <div class="VaronViimcist">{{offer_date}}</div>
                </div>
            </div>
            <div class="SujuvampaaSuunt">{{subheadline}}</div>
            <div class="OletHyvissKS">{{headline_line2}}</div>
            <div class="Hymyile">{{headline}}</div>
        </div>
    </div>
</body>
</html>', null, null, '[{"key":"headline","type":"text","label":"Otsikko (yläosa)","required":true,"maxLength":30},{"key":"headline_line2","type":"text","label":"Otsikko (alaosa)","required":true,"maxLength":50},{"key":"subheadline","type":"text","label":"Alaotsikko","required":false,"maxLength":80},{"key":"offer_title","type":"text","label":"Tarjouksen otsikko","required":true,"maxLength":30},{"key":"price","type":"text","label":"Hinta","required":true,"maxLength":5},{"key":"offer_date","type":"text","label":"Tarjouspäivä","required":false,"maxLength":50},{"key":"cta_text","type":"text","label":"CTA teksti","required":true,"maxLength":20},{"key":"branch_address","type":"text","label":"Toimipisteen osoite","required":false,"maxLength":50},{"key":"image_url","type":"image","label":"Taustakuva URL","required":true},{"key":"artwork_url","type":"image","label":"Artwork URL","required":false},{"key":"logo_url","type":"image","label":"Logo URL","required":true}]', '{"price":"49","cta_text":"Varaa aika","headline":"Hymyile.","logo_url":"https://placehold.co/164x22","image_url":"https://placehold.co/300x431","offer_date":"Varon viimeistään| 28.10.","artwork_url":"https://placehold.co/326x144","offer_title":"Hammas-| tarkastus","subheadline":"Sujuvampaa suunterveyttä|Lahden Suun Terveystalossa.","branch_address":"Torikatu 1, Lahti","headline_line2":"Olet hyvissä käsissä."}', null, null, ARRAY['display','portrait','medium'], 'true', '2', '2026-03-12 16:53:16.995269+00', '2026-03-12 16:53:16.995269+00', null, null, 'false', null, null)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  type = EXCLUDED.type,
  size = EXCLUDED.size,
  width = EXCLUDED.width,
  height = EXCLUDED.height,
  html_template = EXCLUDED.html_template,
  css_styles = EXCLUDED.css_styles,
  js_scripts = EXCLUDED.js_scripts,
  placeholders = EXCLUDED.placeholders,
  default_values = EXCLUDED.default_values,
  preview_url = EXCLUDED.preview_url,
  thumbnail_url = EXCLUDED.thumbnail_url,
  tags = EXCLUDED.tags,
  active = EXCLUDED.active,
  sort_order = EXCLUDED.sort_order,
  updated_at = NOW(),
  category = EXCLUDED.category,
  editor_state = EXCLUDED.editor_state,
  is_visual_editor = EXCLUDED.is_visual_editor,
  canvas_width = EXCLUDED.canvas_width,
  canvas_height = EXCLUDED.canvas_height;