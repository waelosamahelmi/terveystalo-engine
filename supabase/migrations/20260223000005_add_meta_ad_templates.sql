-- ============================================================================
-- ADD META AD TEMPLATES (1080x1080 and 1080x1920)
-- Version: 1.0.0
-- Date: 2026-02-23
-- Description: Add Meta ad templates for Facebook/Instagram advertising
-- ============================================================================

-- 1080x1080 Meta template (Square)
INSERT INTO creative_templates (
  name,
  description,
  type,
  size,
  width,
  height,
  category,
  html_template,
  default_values,
  placeholders,
  active,
  sort_order
) VALUES (
  'Suun Terveystalo 1080x1080 Meta',
  'Meta (Facebook/Instagram) square ad template for brand awareness',
  'meta',
  '1080x1080',
  1080,
  1080,
  'Meta',
  $html$
<!DOCTYPE html>
<html lang="fi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1080, initial-scale=1.0">
<title>Suun Terveystalo - Meta Ad</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  .ad-container {
    width: 1080px; height: 1080px;
    position: relative; overflow: hidden;
    background: linear-gradient(135deg, #0a1e5c 0%, #1a3a6e 100%);
    font-family: 'Inter', sans-serif;
  }
  .bg-image {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    object-fit: cover; opacity: 0.3;
  }
  .content {
    position: relative; z-index: 10;
    height: 100%; display: flex;
    flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center; padding: 60px;
  }
  .headline {
    font-size: 72px; font-weight: 900;
    color: #fff; line-height: 1.1;
    margin-bottom: 20px;
    text-shadow: 0 4px 20px rgba(0,0,0,0.4);
  }
  .subline {
    font-size: 48px; font-weight: 700;
    color: #fff; line-height: 1.2;
    margin-bottom: 40px;
    text-shadow: 0 2px 15px rgba(0,0,0,0.3);
  }
  .price-badge {
    background: #fff;
    border-radius: 50px;
    padding: 20px 50px;
    margin-bottom: 30px;
  }
  .price-badge .label {
    font-size: 28px; font-weight: 700;
    color: #0a3d91;
  }
  .price-badge .price {
    font-size: 68px; font-weight: 900;
    color: #0a3d91;
  }
  .cta {
    background: linear-gradient(135deg, #00A5B5, #1B365D);
    color: #fff; padding: 20px 60px;
    border-radius: 50px;
    font-size: 32px; font-weight: 700;
    box-shadow: 0 8px 30px rgba(0,165,181,0.4);
  }
  .logo {
    position: absolute; bottom: 60px;
    left: 50%; transform: translateX(-50%);
    font-size: 42px; font-weight: 700;
    color: #fff;
  }
  .disclaimer {
    position: absolute; bottom: 20px;
    font-size: 16px; color: rgba(255,255,255,0.6);
  }
</style>
</head>
<body>
<div class="ad-container">
  <img class="bg-image" src="{{image_url}}">
  <div class="content">
    <div class="headline">{{headline}}</div>
    <div class="subline">{{subheadline}}</div>
    <div class="price-badge" data-if="price">
      <div class="label">{{offer_title}}</div>
      <div class="price">{{price}}€</div>
    </div>
    <div class="cta">{{cta_text}}</div>
  </div>
  <div class="logo">Suun&nbsp;Terveystalo</div>
  <div class="disclaimer">{{disclaimer_text}}</div>
</div>
</body>
</html>
$html$,
  '{"headline": "Hymyile.<br>Olet hyvissä käsissä.", "subheadline": "Sujuvampaa suunterveyttä.", "offer_title": "Hammas-tarkastus", "price": "49", "cta_text": "Varaa aika", "image_url": "https://suunterveystalo.netlify.app/refs/assets/nainen.jpg", "disclaimer_text": ""}',
  '["headline", "subheadline", "offer_title", "price", "cta_text", "image_url", "disclaimer_text"]'::jsonb,
  true,
  1
);

-- 1080x1920 Meta template (Stories/Reels Portrait)
INSERT INTO creative_templates (
  name,
  description,
  type,
  size,
  width,
  height,
  category,
  html_template,
  default_values,
  placeholders,
  active,
  sort_order
) VALUES (
  'Suun Terveystalo 1080x1920 Meta',
  'Meta (Instagram Stories/Reels) portrait ad template for vertical viewing',
  'meta',
  '1080x1920',
  1080,
  1920,
  'Meta',
  $html$
<!DOCTYPE html>
<html lang="fi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=1080, initial-scale=1.0">
<title>Suun Terveystalo - Meta Story</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700;800;900&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  .ad-container {
    width: 1080px; height: 1920px;
    position: relative; overflow: hidden;
    background: linear-gradient(180deg, #0a1e5c 0%, #1a3a6e 100%);
    font-family: 'Inter', sans-serif;
  }
  .bg-image {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    object-fit: cover; opacity: 0.4;
  }
  .content {
    position: relative; z-index: 10;
    height: 100%; display: flex;
    flex-direction: column;
    align-items: center; justify-content: center;
    text-align: center; padding: 80px 60px;
  }
  .headline {
    font-size: 96px; font-weight: 900;
    color: #fff; line-height: 1.1;
    margin-bottom: 30px;
    text-shadow: 0 6px 30px rgba(0,0,0,0.5);
  }
  .subline {
    font-size: 64px; font-weight: 700;
    color: #fff; line-height: 1.2;
    margin-bottom: 50px;
    text-shadow: 0 4px 20px rgba(0,0,0,0.4);
  }
  .price-section {
    background: rgba(255,255,255,0.15);
    backdrop-filter: blur(10px);
    border-radius: 60px;
    padding: 40px 60px;
    margin-bottom: 50px;
    border: 2px solid rgba(255,255,255,0.3);
  }
  .price-section .label {
    font-size: 36px; font-weight: 700;
    color: #fff; margin-bottom: 10px;
  }
  .price-section .price {
    font-size: 120px; font-weight: 900;
    color: #fff;
  }
  .cta {
    background: #fff;
    color: #0a1e5c; padding: 30px 80px;
    border-radius: 60px;
    font-size: 42px; font-weight: 900;
    box-shadow: 0 10px 40px rgba(0,0,0,0.3);
    margin-bottom: auto;
  }
  .logo-area {
    margin-top: auto;
  }
  .logo {
    font-size: 56px; font-weight: 700;
    color: #fff; margin-bottom: 20px;
  }
  .address {
    font-size: 32px; font-weight: 400;
    color: rgba(255,255,255,0.8);
    margin-bottom: 40px;
  }
  .disclaimer {
    font-size: 20px; color: rgba(255,255,255,0.5);
    line-height: 1.3;
    padding: 0 40px;
  }
</style>
</head>
<body>
<div class="ad-container">
  <img class="bg-image" src="{{image_url}}">
  <div class="content">
    <div class="headline">{{headline}}</div>
    <div class="subline">{{subheadline}}</div>
    <div class="price-section" data-if="price">
      <div class="label">{{offer_title}}</div>
      <div class="price">{{price}}€</div>
    </div>
    <div class="cta">{{cta_text}}</div>
    <div class="logo-area">
      <div class="logo">Suun&nbsp;Terveystalo</div>
      <div class="address">{{branch_address}}</div>
    </div>
    <div class="disclaimer">{{disclaimer_text}}</div>
  </div>
</div>
</body>
</html>
$html$,
  '{"headline": "Hymyile.<br>Olet hyvissä käsissä.", "subheadline": "Sujuvampaa suunterveyttä.", "offer_title": "Hammas-tarkastus", "price": "49", "cta_text": "Varaa aika", "image_url": "https://suunterveystalo.netlify.app/refs/assets/nainen.jpg", "branch_address": "", "disclaimer_text": ""}',
  '["headline", "subheadline", "offer_title", "price", "cta_text", "image_url", "branch_address", "disclaimer_text"]'::jsonb,
  true,
  2
);

-- Add helpful comments
COMMENT ON TABLE creative_templates IS 'Stores creative templates for different channels and sizes';
COMMENT ON COLUMN creative_templates.type IS 'Channel type: display, pdooh, meta, audio';
