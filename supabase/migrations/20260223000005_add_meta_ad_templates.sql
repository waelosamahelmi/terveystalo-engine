-- ============================================================================
-- SUUN TERVEYSTALO - Meta Ad Templates Migration
-- Adds 1080x1080 (Square) and 1080x1920 (Stories/Reels) Meta ad templates
-- These match the reference HTML exactly with text-based logo and proper variables
-- ============================================================================

-- Square Meta Ad (1080x1080)
INSERT INTO creative_templates (
  name,
  type,
  category,
  size,
  width,
  height,
  html_template,
  default_values,
  tags,
  active,
  sort_order
) VALUES (
  'Suun Terveystalo 1080x1080 Meta (Square)',
  'meta',
  'social',
  '1080x1080',
  1080,
  1080,
  $template_square$<!DOCTYPE html>
<html lang="fi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Suun Terveystalo - {{offer_title}} {{price}}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700;800;900&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  .ad-container {
    width: 1080px;
    height: 1080px;
    position: relative;
    overflow: hidden;
    background: #0a1e5c;
    font-family: 'Inter', sans-serif;
  }

  /* ===== SCENE 1: Dark dental close-up (0s - ~7s) ===== */
  .scene-1 {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 10;
    animation: scene1Life 15s linear forwards;
  }
  @keyframes scene1Life {
    0%   { opacity: 1; }
    44%  { opacity: 1; }
    48%  { opacity: 0; }
    100% { opacity: 0; }
  }
  .scene-1-bg {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    animation: slowZoom 8s ease-out forwards;
    overflow: hidden;
  }
  .scene-1-bg img { width: 100%; height: 100%; object-fit: cover; }
  @keyframes slowZoom {
    0%   { transform: scale(1); }
    100% { transform: scale(1.08); }
  }

  /* ===== SCENE 2: Bright dental (~6.5s-8.5s) ===== */
  .scene-2 {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 5; opacity: 0;
    animation: scene2Life 15s linear forwards;
  }
  @keyframes scene2Life {
    0%   { opacity: 0; }
    42%  { opacity: 0; }
    47%  { opacity: 1; }
    100% { opacity: 1; }
  }
  .scene-2-bg {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%; overflow: hidden;
  }
  .scene-2-bg img { width: 100%; height: 100%; object-fit: cover; }

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
  .logo-bottom .logo-suun { font-size: 46px; font-weight: 300; color: #fff; letter-spacing: -0.5px; }
  .logo-bottom .logo-terveystalo { font-size: 46px; font-weight: 700; color: #fff; letter-spacing: -0.5px; }

  /* ===== PRICE BADGE: SVG organic blob ===== */
  .price-badge-wrap {
    position: absolute; top: 20px; left: 15px;
    z-index: 25; width: 290px; height: 290px;
    opacity: 0; transform: scale(0.3);
    animation: badgePop 15s linear forwards;
  }
  @keyframes badgePop {
    0%    { opacity: 0; transform: scale(0.3); }
    27%   { opacity: 0; transform: scale(0.3); }
    30%   { opacity: 1; transform: scale(1.05); }
    32%   { opacity: 1; transform: scale(1); }
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
    padding-bottom: 5px; padding-right: 10px;
  }
  .badge-content .badge-label {
    font-size: 26px; font-weight: 700;
    color: #0a3d91; line-height: 1.1; text-align: center;
  }
  .badge-content .badge-price {
    font-size: 82px; font-weight: 900;
    color: #0a3d91; line-height: 0.85;
    display: flex; align-items: flex-start;
  }
  .badge-content .badge-price .euro {
    font-size: 52px; font-weight: 700;
    margin-top: 6px; margin-left: 2px;
  }

  /* ===== "{{headline}}" ===== */
  .text-hymyile {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    z-index: 25; font-size: 70px; font-weight: 800;
    color: #fff;
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
    color: #fff;
    text-shadow: 0 2px 30px rgba(0,0,0,0.5);
    text-align: center; line-height: 1.15; white-space: nowrap;
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

  /* ===== CIRCLE WIPE TRANSITION =====
     Circles appear bottom-left ~7.25s then SCALE UP to fill screen */
  .circle-wipe {
    position: absolute; bottom: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 30; pointer-events: none;
  }
  .circle-wipe .cw {
    position: absolute; border-radius: 50%;
    background: #0a3d91; opacity: 0;
  }
  .circle-wipe .cw-1 {
    width: 140px; height: 140px; bottom: -20px; left: -30px;
    animation: cw1 15s linear forwards;
  }
  @keyframes cw1 {
    0%    { opacity: 0; transform: scale(0); }
    48%   { opacity: 0; transform: scale(0); }
    50%   { opacity: 1; transform: scale(1); }
    54%   { opacity: 1; transform: scale(1); }
    57%   { opacity: 1; transform: scale(15); }
    100%  { opacity: 1; transform: scale(15); }
  }
  .circle-wipe .cw-2 {
    width: 100px; height: 100px; bottom: 90px; left: 60px;
    animation: cw2 15s linear forwards;
  }
  @keyframes cw2 {
    0%    { opacity: 0; transform: scale(0); }
    49%   { opacity: 0; transform: scale(0); }
    51%   { opacity: 1; transform: scale(1); }
    54%   { opacity: 1; transform: scale(1); }
    57%   { opacity: 1; transform: scale(15); }
    100%  { opacity: 1; transform: scale(15); }
  }
  .circle-wipe .cw-3 {
    width: 70px; height: 70px; bottom: 50px; left: 150px;
    animation: cw3 15s linear forwards;
  }
  @keyframes cw3 {
    0%    { opacity: 0; transform: scale(0); }
    49%   { opacity: 0; transform: scale(0); }
    51.5% { opacity: 1; transform: scale(1); }
    54%   { opacity: 1; transform: scale(1); }
    57%   { opacity: 1; transform: scale(18); }
    100%  { opacity: 1; transform: scale(18); }
  }
  .circle-wipe .cw-4 {
    width: 55px; height: 55px; bottom: 160px; left: 20px;
    animation: cw4 15s linear forwards;
  }
  @keyframes cw4 {
    0%    { opacity: 0; transform: scale(0); }
    49.5% { opacity: 0; transform: scale(0); }
    52%   { opacity: 1; transform: scale(1); }
    54%   { opacity: 1; transform: scale(1); }
    57%   { opacity: 1; transform: scale(22); }
    100%  { opacity: 1; transform: scale(22); }
  }
  .circle-wipe .cw-5 {
    width: 90px; height: 90px; bottom: 130px; left: 130px;
    animation: cw5 15s linear forwards;
  }
  @keyframes cw5 {
    0%    { opacity: 0; transform: scale(0); }
    50%   { opacity: 0; transform: scale(0); }
    52%   { opacity: 1; transform: scale(1); }
    54%   { opacity: 1; transform: scale(1); }
    57%   { opacity: 1; transform: scale(15); }
    100%  { opacity: 1; transform: scale(15); }
  }
  .circle-wipe .cw-6 {
    width: 120px; height: 120px; bottom: 30px; left: 200px;
    animation: cw6 15s linear forwards;
  }
  @keyframes cw6 {
    0%    { opacity: 0; transform: scale(0); }
    50%   { opacity: 0; transform: scale(0); }
    52.5% { opacity: 1; transform: scale(1); }
    54%   { opacity: 1; transform: scale(1); }
    57%   { opacity: 1; transform: scale(12); }
    100%  { opacity: 1; transform: scale(12); }
  }
  .circle-wipe .cw-7 {
    width: 45px; height: 45px; bottom: 190px; left: 100px;
    animation: cw7 15s linear forwards;
  }
  @keyframes cw7 {
    0%    { opacity: 0; transform: scale(0); }
    50.5% { opacity: 0; transform: scale(0); }
    53%   { opacity: 1; transform: scale(1); }
    54%   { opacity: 1; transform: scale(1); }
    57%   { opacity: 1; transform: scale(28); }
    100%  { opacity: 1; transform: scale(28); }
  }
  /* Big final wipe circle */
  .circle-wipe .cw-big {
    width: 400px; height: 400px;
    bottom: -200px; left: -200px;
    background: #0a1e5c;
    animation: cwBig 15s linear forwards;
  }
  @keyframes cwBig {
    0%    { opacity: 0; transform: scale(0); }
    55%   { opacity: 0; transform: scale(0); }
    56%   { opacity: 1; transform: scale(1); }
    59%   { opacity: 1; transform: scale(8); }
    100%  { opacity: 1; transform: scale(8); }
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
    font-style: italic;
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
    display: inline-block; color: #6b82b8;
    transform-origin: center bottom;
    animation: suunArc 15s linear forwards;
  }
  @keyframes suunArc {
    0%   { color: #6b82b8; transform: rotate(0deg) scale(1); }
    60%  { color: #6b82b8; transform: rotate(0deg) scale(1); }
    67%  { color: #ffffff; transform: rotate(0deg) scale(1); }
    72%  { color: #ffffff; transform: rotate(-18deg) scale(0.82); }
    100% { color: #ffffff; transform: rotate(-18deg) scale(0.82); }
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
  .scene-3-logo .logo-suun { font-size: 46px; font-weight: 300; color: #fff; }
  .scene-3-logo .logo-terveystalo { font-size: 46px; font-weight: 700; color: #fff; }

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
  .scene-4-logo .logo-suun { font-size: 54px; font-weight: 300; color: #fff; }
  .scene-4-logo .logo-terveystalo { font-size: 54px; font-weight: 700; color: #fff; }
  .scene-4-address {
    margin-top: 18px; font-size: 40px; font-weight: 300;
    color: rgba(255,255,255,0.6); letter-spacing: 0.5px;
    opacity: 0;
    animation: addrIn 15s linear forwards;
  }
  @keyframes addrIn {
    0%   { opacity: 0; transform: translateY(8px); }
    89%  { opacity: 0; transform: translateY(8px); }
    94%  { opacity: 1; transform: translateY(0); }
    100% { opacity: 1; transform: translateY(0); }
  }

  /* Replay */
  .replay-btn {
    position: absolute; bottom: 20px; right: 20px;
    z-index: 100;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.25);
    color: #fff; padding: 8px 18px; border-radius: 6px;
    cursor: pointer; font-family: 'Inter', sans-serif;
    font-size: 13px; font-weight: 500;
    transition: background 0.2s;
    backdrop-filter: blur(4px);
  }
  .replay-btn:hover { background: rgba(255,255,255,0.22); }
</style>
</head>
<body>

<div class="ad-container" id="adContainer">

  <!-- SCENE 1 -->
  <div class="scene-1">
    <div class="scene-1-bg">
      <img src="{{scene1_image}}" alt="Scene 1">
    </div>
  </div>

  <!-- SCENE 2 -->
  <div class="scene-2">
    <div class="scene-2-bg">
      <img src="{{scene2_image}}" alt="Scene 2">
    </div>
  </div>

  <!-- LOGO bottom -->
  <div class="logo-bottom">
    <span class="logo-suun">Suun</span><span class="logo-terveystalo">&thinsp;Terveystalo</span>
  </div>

  <!-- PRICE BADGE - SVG blob traced from video -->
  <div class="price-badge-wrap">
    <svg viewBox="0 0 290 290" xmlns="http://www.w3.org/2000/svg">
      <path d="
        M 145,10
        C 175,8   205,15  230,35
        Q 258,55  270,90
        C 280,120  282,155  272,185
        Q 260,220  235,248
        C 210,272  175,285  140,284
        C 105,283  70,270   45,245
        Q 20,218   10,180
        C 2,148    5,112   18,82
        Q 32,48    65,28
        C 90,14   118,10  145,10
        Z
      " fill="white"/>
    </svg>
    <div class="badge-content">
      <div class="badge-label">{{offer_title}}</div>
      <div class="badge-price">{{price}}<span class="euro">€</span></div>
    </div>
  </div>

  <!-- TEXT overlays -->
  <div class="text-hymyile">{{headline}}</div>
  <div class="text-subline">{{subheadline}}</div>

  <!-- CIRCLE WIPE TRANSITION -->
  <div class="circle-wipe">
    <div class="cw cw-1"></div>
    <div class="cw cw-2"></div>
    <div class="cw cw-3"></div>
    <div class="cw cw-4"></div>
    <div class="cw cw-5"></div>
    <div class="cw cw-6"></div>
    <div class="cw cw-7"></div>
    <div class="cw cw-big"></div>
  </div>

  <!-- SCENE 3: Blue text -->
  <div class="scene-3">
    <div class="scene-3-text">
      <span class="w">{{scene3_line1}}</span><br>
      <span class="w w-suun">{{scene3_line2a}}</span><span class="w">{{scene3_line2b}}</span><br>
      <span class="w">{{scene3_line3}}</span><br>
      <span class="w">{{scene3_line4}}</span>
    </div>
    <div class="scene-3-logo">
      <span class="logo-suun">Suun</span><span class="logo-terveystalo">&thinsp;Terveystalo</span>
    </div>
  </div>

  <!-- SCENE 4: End card -->
  <div class="scene-4">
    <div class="scene-4-inner">
      <div class="scene-4-logo">
        <span class="logo-suun">Suun</span><span class="logo-terveystalo">&thinsp;Terveystalo</span>
      </div>
      <div class="scene-4-address">{{branch_address}}</div>
    </div>
  </div>

  <button class="replay-btn" onclick="replayAd()">↻ Replay</button>
</div>

<script>
function replayAd() {
  const c = document.getElementById('adContainer');
  const clone = c.cloneNode(true);
  clone.querySelector('.replay-btn').onclick = replayAd;
  c.parentNode.replaceChild(clone, c);
}
</script>
</body>
</html>$template_square$,
  '{"headline": "Hymyile.", "subheadline": "Olet hyvissä käsissä.", "offer_title": "Hammas-tarkastus", "price": "49", "scene1_image": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1080&h=1080&fit=crop&crop=faces", "scene2_image": "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=1080&h=1080&fit=crop&crop=faces", "scene3_line1": "Sujuvampaa", "scene3_line2a": "suun", "scene3_line2b": "terveyttä", "scene3_line3": "{{city_name}}", "scene3_line4": "Suun Terveystalossa.", "branch_address": "{{branch_address}}"}',
  ARRAY['meta', 'social', 'square', '1080x1080'],
  true,
  1
);

-- Portrait Meta Ad (1080x1920) - Stories/Reels format
INSERT INTO creative_templates (
  name,
  type,
  category,
  size,
  width,
  height,
  html_template,
  default_values,
  tags,
  active,
  sort_order
) VALUES (
  'Suun Terveystalo 1080x1920 Meta (Stories/Reels Portrait)',
  'meta',
  'social',
  '1080x1920',
  1080,
  1920,
  $template_portrait$<!DOCTYPE html>
<html lang="fi">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Suun Terveystalo - {{offer_title}} {{price}}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700;800;900&display=swap');

  * { margin: 0; padding: 0; box-sizing: border-box; }

  .ad-container {
    width: 1080px;
    height: 1920px;
    position: relative;
    overflow: hidden;
    background: #0a1e5c;
    font-family: 'Inter', sans-serif;
  }

  /* ===== SCENE 1: Dark dental close-up ===== */
  .scene-1 {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 10;
    animation: scene1Life 15s linear forwards;
  }
  @keyframes scene1Life {
    0%   { opacity: 1; }
    44%  { opacity: 1; }
    48%  { opacity: 0; }
    100% { opacity: 0; }
  }
  .scene-1-bg {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    animation: slowZoom 8s ease-out forwards;
    overflow: hidden;
  }
  .scene-1-bg img { width: 100%; height: 100%; object-fit: cover; }
  @keyframes slowZoom {
    0%   { transform: scale(1); }
    100% { transform: scale(1.08); }
  }

  /* ===== SCENE 2: Bright dental ===== */
  .scene-2 {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 5; opacity: 0;
    animation: scene2Life 15s linear forwards;
  }
  @keyframes scene2Life {
    0%   { opacity: 0; }
    42%  { opacity: 0; }
    47%  { opacity: 1; }
    100% { opacity: 1; }
  }
  .scene-2-bg {
    position: absolute; top: 0; left: 0;
    width: 100%; height: 100%; overflow: hidden;
  }
  .scene-2-bg img { width: 100%; height: 100%; object-fit: cover; }

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
  .logo-bottom .logo-suun { font-size: 82px; font-weight: 300; color: #fff; letter-spacing: -0.5px; }
  .logo-bottom .logo-terveystalo { font-size: 82px; font-weight: 700; color: #fff; letter-spacing: -0.5px; }

  /* ===== PRICE BADGE: SVG organic blob ===== */
  .price-badge-wrap {
    position: absolute; top: 40px; left: 30px;
    z-index: 25; width: 520px; height: 520px;
    opacity: 0; transform: scale(0.3);
    animation: badgePop 15s linear forwards;
  }
  @keyframes badgePop {
    0%    { opacity: 0; transform: scale(0.3); }
    27%   { opacity: 0; transform: scale(0.3); }
    30%   { opacity: 1; transform: scale(1.05); }
    32%   { opacity: 1; transform: scale(1); }
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
    padding-bottom: 10px; padding-right: 20px;
  }
  .badge-content .badge-label {
    font-size: 46px; font-weight: 700;
    color: #0a3d91; line-height: 1.1; text-align: center;
  }
  .badge-content .badge-price {
    font-size: 146px; font-weight: 900;
    color: #0a3d91; line-height: 0.85;
    display: flex; align-items: flex-start;
  }
  .badge-content .badge-price .euro {
    font-size: 92px; font-weight: 700;
    margin-top: 10px; margin-left: 4px;
  }

  /* ===== "{{headline}}" ===== */
  .text-hymyile {
    position: absolute; top: 50%; left: 50%;
    transform: translate(-50%, -50%);
    z-index: 25; font-size: 125px; font-weight: 800;
    color: #fff;
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
    color: #fff;
    text-shadow: 0 2px 30px rgba(0,0,0,0.5);
    text-align: center; line-height: 1.15; white-space: nowrap;
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

  /* ===== CIRCLE WIPE TRANSITION ===== */
  .circle-wipe {
    position: absolute; bottom: 0; left: 0;
    width: 100%; height: 100%;
    z-index: 30; pointer-events: none;
  }
  .circle-wipe .cw {
    position: absolute; border-radius: 50%;
    background: #0a3d91; opacity: 0;
  }
  .circle-wipe .cw-1 {
    width: 250px; height: 250px; bottom: -40px; left: -60px;
    animation: cw1 15s linear forwards;
  }
  @keyframes cw1 {
    0%    { opacity: 0; transform: scale(0); }
    48%   { opacity: 0; transform: scale(0); }
    50%   { opacity: 1; transform: scale(1); }
    54%   { opacity: 1; transform: scale(1); }
    57%   { opacity: 1; transform: scale(15); }
    100%  { opacity: 1; transform: scale(15); }
  }
  .circle-wipe .cw-2 {
    width: 180px; height: 180px; bottom: 160px; left: 110px;
    animation: cw2 15s linear forwards;
  }
  @keyframes cw2 {
    0%    { opacity: 0; transform: scale(0); }
    49%   { opacity: 0; transform: scale(0); }
    51%   { opacity: 1; transform: scale(1); }
    54%   { opacity: 1; transform: scale(1); }
    57%   { opacity: 1; transform: scale(15); }
    100%  { opacity: 1; transform( scale(15)); }
  }
  .circle-wipe .cw-3 {
    width: 125px; height: 125px; bottom: 90px; left: 270px;
    animation: cw3 15s linear forwards;
  }
  @keyframes cw3 {
    0%    { opacity: 0; transform: scale(0); }
    49%   { opacity: 0; transform: scale(0); }
    51.5% { opacity: 1; transform: scale(1); }
    54%   { opacity: 1; transform: scale(1); }
    57%   { opacity: 1; transform: scale(18); }
    100%  { opacity: 1; transform: scale(18); }
  }
  .circle-wipe .cw-4 {
    width: 98px; height: 98px; bottom: 285px; left: 36px;
    animation: cw4 15s linear forwards;
  }
  @keyframes cw4 {
    0%    { opacity: 0; transform: scale(0); }
    49.5% { opacity: 0; transform: scale(0); }
    52%   { opacity: 1; transform: scale(1); }
    54%   { opacity: 1; transform: scale(1); }
    57%   { opacity: 1; transform: scale(22); }
    100%  { opacity: 1; transform: scale(22); }
  }
  .circle-wipe .cw-5 {
    width: 160px; height: 160px; bottom: 230px; left: 230px;
    animation: cw5 15s linear forwards;
  }
  @keyframes cw5 {
    0%    { opacity: 0; transform: scale(0); }
    50%   { opacity: 0; transform: scale(0); }
    52%   { opacity: 1; transform: scale(1); }
    54%   { opacity: 1; transform: scale(1); }
    57%   { opacity: 1; transform: scale(15); }
    100%  { opacity: 1; transform( scale(15)); }
  }
  .circle-wipe .cw-6 {
    width: 215px; height: 215px; bottom: 54px; left: 360px;
    animation: cw6 15s linear forwards;
  }
  @keyframes cw6 {
    0%    { opacity: 0; transform: scale(0); }
    50%   { opacity: 0; transform: scale(0); }
    52.5% { opacity: 1; transform: scale(1); }
    54%   { opacity: 1; transform: scale(1); }
    57%   { opacity: 1; transform: scale(12); }
    100%  { opacity: 1; transform: scale(12); }
  }
  .circle-wipe .cw-7 {
    width: 80px; height: 80px; bottom: 340px; left: 180px;
    animation: cw7 15s linear forwards;
  }
  @keyframes cw7 {
    0%    { opacity: 0; transform: scale(0); }
    50.5% { opacity: 0; transform: scale(0); }
    53%   { opacity: 1; transform: scale(1); }
    54%   { opacity: 1; transform: scale(1); }
    57%   { opacity: 1; transform( scale(28)); }
    100%  { opacity: 1; transform: scale(28); }
  }
  /* Big final wipe circle */
  .circle-wipe .cw-big {
    width: 710px; height: 710px;
    bottom: -355px; left: -355px;
    background: #0a1e5c;
    animation: cwBig 15s linear forwards;
  }
  @keyframes cwBig {
    0%    { opacity: 0; transform: scale(0); }
    55%   { opacity: 0; transform: scale(0); }
    56%   { opacity: 1; transform: scale(1); }
    59%   { opacity: 1; transform: scale(8); }
    100%  { opacity: 1; transform: scale(8); }
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
    font-size: 140px; font-weight: 800;
    line-height: 1.15; padding: 0 110px;
    font-style: italic;
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
    display: inline-block; color: #6b82b8;
    transform-origin: center bottom;
    animation: suunArc 15s linear forwards;
  }
  @keyframes suunArc {
    0%   { color: #6b82b8; transform: rotate(0deg) scale(1); }
    60%  { color: #6b82b8; transform: rotate(0deg) scale(1); }
    67%  { color: #ffffff; transform: rotate(0deg) scale(1); }
    72%  { color: #ffffff; transform: rotate(-18deg) scale(0.82); }
    100% { color: #ffffff; transform: rotate(-18deg) scale(0.82); }
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
  .scene-3-logo .logo-suun { font-size: 82px; font-weight: 300; color: #fff; }
  .scene-3-logo .logo-terveystalo { font-size: 82px; font-weight: 700; color: #fff; }

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
  .scene-4-logo .logo-suun { font-size: 96px; font-weight: 300; color: #fff; }
  .scene-4-logo .logo-terveystalo { font-size: 96px; font-weight: 700; color: #fff; }
  .scene-4-address {
    margin-top: 32px; font-size: 71px; font-weight: 300;
    color: rgba(255,255,255,0.6); letter-spacing: 0.5px;
    opacity: 0;
    animation: addrIn 15s linear forwards;
  }
  @keyframes addrIn {
    0%   { opacity: 0; transform: translateY(8px); }
    89%  { opacity: 0; transform: translateY(8px); }
    94%  { opacity: 1; transform: translateY(0); }
    100% { opacity: 1; transform: translateY(0); }
  }

  /* Replay */
  .replay-btn {
    position: absolute; bottom: 35px; right: 35px;
    z-index: 100;
    background: rgba(255,255,255,0.12);
    border: 1px solid rgba(255,255,255,0.25);
    color: #fff; padding: 14px 32px; border-radius: 6px;
    cursor: pointer; font-family: 'Inter', sans-serif;
    font-size: 23px; font-weight: 500;
    transition: background 0.2s;
    backdrop-filter: blur(4px);
  }
  .replay-btn:hover { background: rgba(255,255,255,0.22); }
</style>
</head>
<body>

<div class="ad-container" id="adContainer">

  <!-- SCENE 1 -->
  <div class="scene-1">
    <div class="scene-1-bg">
      <img src="{{scene1_image}}" alt="Scene 1">
    </div>
  </div>

  <!-- SCENE 2 -->
  <div class="scene-2">
    <div class="scene-2-bg">
      <img src="{{scene2_image}}" alt="Scene 2">
    </div>
  </div>

  <!-- LOGO bottom -->
  <div class="logo-bottom">
    <span class="logo-suun">Suun</span><span class="logo-terveystalo">&thinsp;Terveystalo</span>
  </div>

  <!-- PRICE BADGE -->
  <div class="price-badge-wrap">
    <svg viewBox="0 0 290 290" xmlns="http://www.w3.org/2000/svg">
      <path d="
        M 145,10
        C 175,8   205,15  230,35
        Q 258,55  270,90
        C 280,120  282,155  272,185
        Q 260,220  235,248
        C 210,272  175,285  140,284
        C 105,283  70,270   45,245
        Q 20,218   10,180
        C 2,148    5,112   18,82
        Q 32,48    65,28
        C 90,14   118,10  145,10
        Z
      " fill="white"/>
    </svg>
    <div class="badge-content">
      <div class="badge-label">{{offer_title}}</div>
      <div class="badge-price">{{price}}<span class="euro">€</span></div>
    </div>
  </div>

  <!-- TEXT overlays -->
  <div class="text-hymyile">{{headline}}</div>
  <div class="text-subline">{{subheadline}}</div>

  <!-- CIRCLE WIPE TRANSITION -->
  <div class="circle-wipe">
    <div class="cw cw-1"></div>
    <div class="cw cw-2"></div>
    <div class="cw cw-3"></div>
    <div class="cw cw-4"></div>
    <div class="cw cw-5"></div>
    <div class="cw cw-6"></div>
    <div class="cw cw-7"></div>
    <div class="cw cw-big"></div>
  </div>

  <!-- SCENE 3: Blue text -->
  <div class="scene-3">
    <div class="scene-3-text">
      <span class="w">{{scene3_line1}}</span><br>
      <span class="w w-suun">{{scene3_line2a}}</span><span class="w">{{scene3_line2b}}</span><br>
      <span class="w">{{scene3_line3}}</span><br>
      <span class="w">{{scene3_line4}}</span>
    </div>
    <div class="scene-3-logo">
      <span class="logo-suun">Suun</span><span class="logo-terveystalo">&thinsp;Terveystalo</span>
    </div>
  </div>

  <!-- SCENE 4: End card -->
  <div class="scene-4">
    <div class="scene-4-inner">
      <div class="scene-4-logo">
        <span class="logo-suun">Suun</span><span class="logo-terveystalo">&thinsp;Terveystalo</span>
      </div>
      <div class="scene-4-address">{{branch_address}}</div>
    </div>
  </div>

  <button class="replay-btn" onclick="replayAd()">↻ Replay</button>
</div>

<script>
function replayAd() {
  const c = document.getElementById('adContainer');
  const clone = c.cloneNode(true);
  clone.querySelector('.replay-btn').onclick = replayAd;
  c.parentNode.replaceChild(clone, c);
}
</script>
</body>
</html>$template_portrait$,
  '{"headline": "Hymyile.", "subheadline": "Olet hyvissä käsissä.", "offer_title": "Hammas-tarkastus", "price": "49", "scene1_image": "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=1080&h=1920&fit=crop&crop=faces", "scene2_image": "https://images.unsplash.com/photo-1606811971618-4486d14f3f99?w=1080&h=1920&fit=crop&crop=faces", "scene3_line1": "Sujuvampaa", "scene3_line2a": "suun", "scene3_line2b": "terveyttä", "scene3_line3": "{{city_name}}", "scene3_line4": "Suun Terveystalossa.", "branch_address": "{{branch_address}}"}',
  ARRAY['meta', 'social', 'portrait', 'stories', 'reels', '1080x1920'],
  true,
  2
);

COMMENT ON TABLE creative_templates IS 'Creative templates for ad generation - includes display, PDOOH, and Meta ad formats';
COMMENT ON COLUMN creative_templates.html_template IS 'HTML template with {{variable}} placeholders for dynamic content';
COMMENT ON COLUMN creative_templates.default_values IS 'JSON object with default variable values - some values may reference other variables like {{city_name}}';
