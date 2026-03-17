-- ============================================================================
-- SUUN TERVEYSTALO - Seed PDOOH 1080x1920 Template (from creative_templates_rows.sql)
-- This ensures the PDOOH template exists before the fix migration runs.
-- Uses ON CONFLICT to upsert — safe to run multiple times.
-- ============================================================================

INSERT INTO "public"."creative_templates" (
  "id", "name", "description", "type", "size", "width", "height",
  "html_template", "css_styles", "js_scripts", "placeholders", "default_values",
  "preview_url", "thumbnail_url", "tags", "active", "sort_order",
  "created_at", "updated_at", "category", "editor_state", "is_visual_editor",
  "canvas_width", "canvas_height"
) VALUES (
  'd7f6fb8d-b0ea-4027-9edd-30af07ddf669',
  'Suun Terveystalo 1080x1920 PDOOH',
  'Digital Out of Home - Full vertical screen format for DOOH displays',
  'pdooh',
  '1080x1920',
  '1080',
  '1920',
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
        .Price { width: 266px; height: 150.97px; text-align: center; justify-content: center; display: flex; flex-direction: column; color: #0046AD; font-size: 133px; font-family: "Terveystalo Sans Display", "Terveystalo Sans", sans-serif; font-weight: 700; word-wrap: break-word; }
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
                        <div class="Price">{{price}}€</div>
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
</html>',
  null,
  null,
  '[{"key":"headline","type":"text","label":"Otsikko (yläosa)","required":true,"maxLength":50},{"key":"headline_line2","type":"text","label":"Otsikko (alaosa)","required":true,"maxLength":80},{"key":"subheadline","type":"text","label":"Alaotsikko","required":false,"maxLength":150},{"key":"offer_title","type":"text","label":"Tarjouksen otsikko","required":true,"maxLength":50},{"key":"price","type":"text","label":"Hinta","required":true,"maxLength":5},{"key":"offer_date","type":"text","label":"Tarjouspäivä","required":false,"maxLength":50},{"key":"cta_text","type":"text","label":"CTA teksti","required":true,"maxLength":30},{"key":"branch_address","type":"text","label":"Toimipisteen osoite","required":false,"maxLength":100},{"key":"legal_text","type":"text","label":"Legal teksti","required":false,"maxLength":500},{"key":"image_url","type":"image","label":"Taustakuva URL","required":true},{"key":"artwork_url","type":"image","label":"Artwork URL","required":false},{"key":"logo_url","type":"image","label":"Logo URL","required":true}]',
  '{"price":"49","cta_text":"Varaa aika","headline":"Hymyile.","logo_url":"https://placehold.co/661x89","image_url":"https://placehold.co/1078x2157","legal_text":"Tarjous voimassa uusille asiakkaille tai jos edellisestä käynnistäsi on kulunut 3 vuotta. Tarjous koskee arkiaikoja, aika on varattava 22.2.2026 mennessä ja vastaanotolla on käytävä 31.3.2026 mennessä. Hinta sisältää Kela-korvauksen, käyntimaksun ja kanta-maksun. Kampanjan tarkat ehdot ja ohjeet kampanjasivulla terveystalo.com/suunterveystalo.","offer_date":"Varaa viimeistään| 28.10.","artwork_url":"https://placehold.co/1189x525","offer_title":"Hammas-| tarkastus","subheadline":"Sujuvampaa suunterveyttä|Lahden Suun Terveystalossa.","branch_address":"Torikatu 1,Lahti","headline_line2":"Olet hyvissä käsissä."}',
  null,
  null,
  ARRAY['pdooh','dooh','digital-signage'],
  'true',
  '6',
  '2026-03-12 16:53:16.995269+00',
  '2026-03-12 16:53:16.995269+00',
  null,
  null,
  'false',
  null,
  null
)
ON CONFLICT ("id") DO UPDATE SET
  html_template = EXCLUDED.html_template,
  placeholders = EXCLUDED.placeholders,
  default_values = EXCLUDED.default_values,
  updated_at = NOW();
