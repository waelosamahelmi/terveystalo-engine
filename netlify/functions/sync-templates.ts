// Netlify function to sync creative templates to the database
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// HTML templates embedded directly
const templates = {
  '300x300': `<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>300x300 Ad Banner</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #333; font-family: sans-serif; }
        .ad-container { width: 300px; height: 300px; background-color: #08091A; position: relative; overflow: hidden; color: #ffffff; text-align: center; }
        .main-image { position: absolute; top: 0; left: 0; width: 100%; height: 180px; object-fit: cover; object-position: center top; -webkit-mask-image: radial-gradient(ellipse 85% 85% at 50% 40%, black 40%, transparent 85%); mask-image: radial-gradient(ellipse 85% 85% at 50% 40%, black 40%, transparent 85%); }
        .artwork { position: absolute; bottom: -35px; right: -45px; width: 160px; height: 160px; object-fit: contain; transform: rotate(-30deg); }
        .logo { position: absolute; bottom: 25px; left: 50%; transform: translateX(-50%); width: 100px; max-height: 18px; object-fit: contain; }
        .text-area { position: relative; z-index: 10; padding-top: 20px; }
        .headline { font-size: 18px; font-weight: 900; line-height: 1.1; margin-bottom: 8px; }
        .subheadline { font-size: 11px; line-height: 1.35; }
        .price-bubble { position: absolute; z-index: 15; top: 130px; left: 8px; background-color: #ffffff; color: #004E9A; width: 70px; height: 70px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 3px 8px rgba(0,0,0,0.3); }
        .pb-title { font-size: 8px; font-weight: 700; text-align: center; line-height: 1.1; }
        .pb-price { font-size: 28px; font-weight: 900; line-height: 0.9; margin: 2px 0; letter-spacing: -1px; }
        .pb-currency { font-size: 14px; margin-top: 2px; margin-left: 1px; }
        .pb-date { font-size: 7px; font-weight: 600; text-align: center; line-height: 1.2; }
        .cta-button { position: absolute; z-index: 15; bottom: 50px; left: 50%; transform: translateX(-50%); background-color: #ffffff; color: #004E9A; text-decoration: none; font-weight: 700; font-size: 11px; padding: 8px 20px; border-radius: 20px; white-space: nowrap; box-shadow: 0 3px 8px rgba(0,0,0,0.2); }
        .address { position: absolute; bottom: 15px; width: 100%; text-align: center; font-size: 9px; font-weight: 400; z-index: 11; color: #fff; }
    </style>
</head>
<body>
    <div class="ad-container">
        <img src="{{image_url}}" class="main-image">
        <img src="{{artwork_url}}" class="artwork">
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
        <img src="{{logo_url}}" class="logo">
        <div class="address">{{branch_address}}</div>
    </div>
</body>
</html>`,

  '300x431': `<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>300x431 Ad Banner</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #333; font-family: sans-serif; }
        .ad-container { width: 300px; height: 431px; background-color: #08091A; position: relative; overflow: hidden; color: #ffffff; text-align: center; }
        .main-image { position: absolute; top: 0; left: 0; width: 100%; height: 260px; object-fit: cover; object-position: center top; -webkit-mask-image: radial-gradient(ellipse 82% 77% at 50% 45%, black 42%, transparent 82%); mask-image: radial-gradient(ellipse 82% 77% at 50% 45%, black 42%, transparent 82%); }
        .artwork { position: absolute; bottom: -50px; right: -60px; width: 220px; height: 220px; object-fit: contain; transform: rotate(-30deg); }
        .logo { position: absolute; bottom: 35px; left: 50%; transform: translateX(-50%); width: 140px; max-height: 25px; object-fit: contain; }
        .text-area { position: relative; z-index: 10; padding-top: 30px; }
        .headline { font-size: 22px; font-weight: 900; line-height: 1.1; margin-bottom: 10px; }
        .subheadline { font-size: 13px; line-height: 1.35; }
        .price-bubble { position: absolute; z-index: 15; top: 185px; left: 10px; background-color: #ffffff; color: #004E9A; width: 100px; height: 100px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 4px 12px rgba(0,0,0,0.3); }
        .pb-title { font-size: 10px; font-weight: 700; text-align: center; line-height: 1.1; }
        .pb-price { font-size: 40px; font-weight: 900; line-height: 0.9; margin: 3px 0; letter-spacing: -2px; }
        .pb-currency { font-size: 20px; margin-top: 3px; margin-left: 1px; }
        .pb-date { font-size: 8px; font-weight: 600; text-align: center; line-height: 1.2; }
        .cta-button { position: absolute; z-index: 15; bottom: 70px; left: 50%; transform: translateX(-50%); background-color: #ffffff; color: #004E9A; text-decoration: none; font-weight: 700; font-size: 13px; padding: 10px 26px; border-radius: 25px; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
        .address { position: absolute; bottom: 20px; width: 100%; text-align: center; font-size: 11px; font-weight: 400; z-index: 11; color: #fff; }
    </style>
</head>
<body>
    <div class="ad-container">
        <img src="{{image_url}}" class="main-image">
        <img src="{{artwork_url}}" class="artwork">
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
        <img src="{{logo_url}}" class="logo">
        <div class="address">{{branch_address}}</div>
    </div>
</body>
</html>`,

  '300x600': `<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>300x600 Ad Banner</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #333; font-family: sans-serif; }
        .ad-container { width: 300px; height: 600px; background-color: #08091A; position: relative; overflow: hidden; color: #ffffff; text-align: center; }
        .main-image { position: absolute; top: 100px; left: 0; width: 100%; height: 400px; object-fit: cover; object-position: center top; -webkit-mask-image: radial-gradient(ellipse 82% 77% at 50% 45%, black 42%, transparent 82%); mask-image: radial-gradient(ellipse 82% 77% at 50% 45%, black 42%, transparent 82%); }
        .artwork { position: absolute; bottom: -70px; right: -90px; width: 306px; height: 306px; object-fit: contain; transform: rotate(-30deg); }
        .logo { position: absolute; bottom: 50px; left: 50%; transform: translateX(-50%); width: 180px; max-height: 32px; object-fit: contain; }
        .text-area { position: relative; z-index: 10; padding-top: 40px; }
        .headline { font-size: 24px; font-weight: 900; line-height: 1.1; margin-bottom: 15px; }
        .subheadline { font-size: 16px; line-height: 1.35; }
        .price-bubble { position: absolute; z-index: 15; top: 260px; left: 15px; background-color: #ffffff; color: #004E9A; width: 135px; height: 135px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 5px 15px rgba(0,0,0,0.3); }
        .pb-title { font-size: 13px; font-weight: 700; text-align: center; line-height: 1.1; }
        .pb-price { font-size: 54px; font-weight: 900; line-height: 0.9; margin: 4px 0; letter-spacing: -2px; }
        .pb-currency { font-size: 28px; margin-top: 4px; margin-left: 2px; }
        .pb-date { font-size: 10px; font-weight: 600; text-align: center; line-height: 1.2; }
        .cta-button { position: absolute; z-index: 15; bottom: 90px; left: 50%; transform: translateX(-50%); background-color: #ffffff; color: #004E9A; text-decoration: none; font-weight: 700; font-size: 14px; padding: 12px 32px; border-radius: 25px; white-space: nowrap; box-shadow: 0 4px 10px rgba(0,0,0,0.2); }
        .address { position: absolute; bottom: 30px; width: 100%; text-align: center; font-size: 13px; font-weight: 400; z-index: 11; color: #fff; }
    </style>
</head>
<body>
    <div class="ad-container">
        <img src="{{image_url}}" class="main-image">
        <img src="{{artwork_url}}" class="artwork">
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
        <img src="{{logo_url}}" class="logo">
        <div class="address">{{branch_address}}</div>
    </div>
</body>
</html>`,

  '620x891': `<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>620x891 Ad Banner</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #333; font-family: sans-serif; }
        .ad-container { width: 620px; height: 891px; background-color: #08091A; position: relative; overflow: hidden; color: #ffffff; text-align: center; }
        .main-image { position: absolute; top: 200px; left: 0; width: 100%; height: 520px; object-fit: cover; object-position: center top; -webkit-mask-image: radial-gradient(ellipse 78% 70% at 50% 45%, black 42%, transparent 82%); mask-image: radial-gradient(ellipse 78% 70% at 50% 45%, black 42%, transparent 82%); }
        .artwork { position: absolute; bottom: -130px; right: -150px; width: 530px; height: 530px; object-fit: contain; transform: rotate(-30deg); }
        .logo { position: absolute; bottom: 70px; left: 50%; transform: translateX(-50%); width: 360px; max-height: 65px; object-fit: contain; }
        .text-area { position: relative; z-index: 10; padding-top: 90px; }
        .headline { font-size: 48px; font-weight: 900; line-height: 1.1; margin-bottom: 25px; }
        .subheadline { font-size: 30px; line-height: 1.35; }
        .price-bubble { position: absolute; z-index: 15; top: 570px; left: 35px; background-color: #ffffff; color: #004E9A; width: 260px; height: 260px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 8px 25px rgba(0,0,0,0.3); }
        .pb-title { font-size: 24px; font-weight: 700; text-align: center; line-height: 1.1; }
        .pb-price { font-size: 105px; font-weight: 900; line-height: 0.9; margin: 8px 0; letter-spacing: -4px; }
        .pb-currency { font-size: 52px; margin-top: 8px; margin-left: 3px; }
        .pb-date { font-size: 18px; font-weight: 600; text-align: center; line-height: 1.2; }
        .cta-button { position: absolute; z-index: 15; bottom: 140px; left: 50%; transform: translateX(-50%); background-color: #ffffff; color: #004E9A; text-decoration: none; font-weight: 700; font-size: 28px; padding: 20px 60px; border-radius: 45px; white-space: nowrap; box-shadow: 0 6px 20px rgba(0,0,0,0.2); }
        .address { position: absolute; bottom: 40px; width: 100%; text-align: center; font-size: 26px; font-weight: 400; z-index: 11; color: #fff; }
    </style>
</head>
<body>
    <div class="ad-container">
        <img src="{{image_url}}" class="main-image">
        <img src="{{artwork_url}}" class="artwork">
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
        <img src="{{logo_url}}" class="logo">
        <div class="address">{{branch_address}}</div>
    </div>
</body>
</html>`,

  '980x400': `<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>980x400 Ad Banner</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #333; font-family: sans-serif; }
        .ad-container { width: 980px; height: 400px; background-color: #08091A; position: relative; overflow: hidden; color: #ffffff; }
        .main-image { position: absolute; top: 0; left: 0; width: 500px; height: 100%; object-fit: cover; object-position: center top; -webkit-mask-image: radial-gradient(ellipse 100% 90% at 30% 50%, black 40%, transparent 85%); mask-image: radial-gradient(ellipse 100% 90% at 30% 50%, black 40%, transparent 85%); }
        .artwork { position: absolute; bottom: -80px; right: -100px; width: 350px; height: 350px; object-fit: contain; transform: rotate(-30deg); }
        .logo { position: absolute; bottom: 25px; left: 50%; transform: translateX(-50%); width: 180px; max-height: 32px; object-fit: contain; }
        .text-area { position: absolute; z-index: 10; top: 50%; right: 60px; transform: translateY(-50%); width: 400px; text-align: left; }
        .headline { font-size: 30px; font-weight: 900; line-height: 1.1; margin-bottom: 15px; }
        .subheadline { font-size: 16px; line-height: 1.35; }
        .price-bubble { position: absolute; z-index: 15; top: 50%; left: 380px; transform: translateY(-50%); background-color: #ffffff; color: #004E9A; width: 140px; height: 140px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 6px 18px rgba(0,0,0,0.3); }
        .pb-title { font-size: 13px; font-weight: 700; text-align: center; line-height: 1.1; }
        .pb-price { font-size: 54px; font-weight: 900; line-height: 0.9; margin: 4px 0; letter-spacing: -2px; }
        .pb-currency { font-size: 28px; margin-top: 4px; margin-left: 2px; }
        .pb-date { font-size: 10px; font-weight: 600; text-align: center; line-height: 1.2; }
        .cta-button { position: absolute; z-index: 15; bottom: 70px; right: 120px; background-color: #ffffff; color: #004E9A; text-decoration: none; font-weight: 700; font-size: 14px; padding: 14px 36px; border-radius: 28px; white-space: nowrap; box-shadow: 0 4px 12px rgba(0,0,0,0.2); }
        .address { position: absolute; bottom: 10px; width: 100%; text-align: center; font-size: 12px; font-weight: 400; z-index: 11; color: #fff; }
    </style>
</head>
<body>
    <div class="ad-container">
        <img src="{{image_url}}" class="main-image">
        <img src="{{artwork_url}}" class="artwork">
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
        <img src="{{logo_url}}" class="logo">
        <div class="address">{{branch_address}}</div>
    </div>
</body>
</html>`,

  '1080x1920': `<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta name="ad.size" content="width=1080,height=1920">
    <title>1080x1920 PDOOH Ad Banner</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #333; font-family: sans-serif; }
        .ad-container { width: 1080px; height: 1920px; background-color: #08091A; position: relative; overflow: hidden; color: #ffffff; text-align: center; }
        .main-image { position: absolute; top: 300px; left: 0; width: 100%; height: 1100px; object-fit: cover; object-position: center top; -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 45%, black 45%, transparent 85%); mask-image: radial-gradient(ellipse 80% 70% at 50% 45%, black 45%, transparent 85%); }
        .artwork { position: absolute; bottom: -200px; right: -220px; width: 800px; height: 800px; object-fit: contain; transform: rotate(-30deg); }
        .logo { position: absolute; bottom: 150px; left: 50%; transform: translateX(-50%); width: 420px; max-height: 75px; object-fit: contain; }
        .text-area { position: relative; z-index: 10; padding-top: 120px; width: 100%; }
        .headline { font-size: 64px; font-weight: 900; line-height: 1.1; margin-bottom: 35px; }
        .subheadline { font-size: 38px; line-height: 1.35; max-width: 85%; margin: 0 auto; }
        .price-bubble { position: absolute; z-index: 15; top: 820px; left: 50px; background-color: #ffffff; color: #004E9A; width: 340px; height: 340px; border-radius: 50%; display: flex; flex-direction: column; justify-content: center; align-items: center; box-shadow: 0px 12px 30px rgba(0,0,0,0.3); }
        .pb-title { font-size: 32px; font-weight: 700; line-height: 1.1; text-align: center; }
        .pb-price { font-size: 130px; font-weight: 900; line-height: 0.9; margin: 10px 0; letter-spacing: -5px; }
        .pb-currency { font-size: 65px; margin-top: 10px; margin-left: 3px; }
        .pb-date { font-size: 24px; font-weight: 600; text-align: center; line-height: 1.2; }
        .cta-button { position: absolute; z-index: 15; bottom: 250px; left: 50%; transform: translateX(-50%); background-color: #ffffff; color: #004E9A; text-decoration: none; font-weight: 700; font-size: 36px; padding: 30px 80px; border-radius: 50px; white-space: nowrap; box-shadow: 0 8px 25px rgba(0,0,0,0.2); }
        .address { position: absolute; bottom: 70px; width: 100%; text-align: center; font-size: 32px; font-weight: 400; z-index: 11; color: #fff; }
        .disclaimer { position: absolute; bottom: 20px; left: 0; right: 0; padding: 0 40px; text-align: center; font-size: 18px; font-weight: 400; line-height: 1.3; z-index: 11; color: rgba(255,255,255,0.7); }
    </style>
</head>
<body>
    <div class="ad-container">
        <img src="{{image_url}}" class="main-image">
        <img src="{{artwork_url}}" class="artwork">
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
        <img src="{{logo_url}}" class="logo">
        <div class="address">{{branch_address}}</div>
        <div class="disclaimer">{{disclaimer_text}}</div>
    </div>
</body>
</html>`,

  '1080x1080': `<!DOCTYPE html>
<html lang="fi">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>1080x1080 Meta Ad</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background-color: #333; font-family: sans-serif; }
        .ad-container { width: 1080px; height: 1080px; background-color: #08091A; position: relative; overflow: hidden; color: #ffffff; text-align: center; }
        .main-image { position: absolute; top: 0; left: 0; width: 100%; height: 100%; object-fit: cover; object-position: center top; opacity: 0.85; }
        .overlay { position: absolute; inset: 0; background: linear-gradient(180deg, rgba(8,9,26,0.3) 0%, rgba(8,9,26,0.7) 100%); }
        .logo { position: absolute; top: 40px; left: 50%; transform: translateX(-50%); width: 200px; max-height: 40px; object-fit: contain; }
        .text-area { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); z-index: 10; width: 80%; }
        .headline { font-size: 56px; font-weight: 900; line-height: 1.1; margin-bottom: 20px; text-shadow: 0 2px 10px rgba(0,0,0,0.5); }
        .subheadline { font-size: 32px; line-height: 1.35; text-shadow: 0 2px 10px rgba(0,0,0,0.5); }
        .cta-button { position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%); background-color: #ffffff; color: #004E9A; text-decoration: none; font-weight: 700; font-size: 28px; padding: 20px 60px; border-radius: 45px; white-space: nowrap; box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
    </style>
</head>
<body>
    <div class="ad-container">
        <img src="{{image_url}}" class="main-image">
        <div class="overlay"></div>
        <img src="{{logo_url}}" class="logo">
        <div class="text-area">
            <h1 class="headline">{{headline}}</h1>
            <p class="subheadline">{{subheadline}}</p>
        </div>
        <a href="{{click_url}}" class="cta-button">{{cta_text}}</a>
    </div>
</body>
</html>`,
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('VITE_SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('VITE_SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const url = new URL(req.url)
    const action = url.searchParams.get('action') || 'sync'

    if (action === 'list') {
      // List existing templates
      const { data, error } = await supabase
        .from('creative_templates')
        .select('*')
        .order('sort_order')

      if (error) {
        return new Response(JSON.stringify({ error: error.message }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        })
      }

      return new Response(JSON.stringify({ templates: data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    if (action === 'sync') {
      // Sync all templates
      const results = []

      // Define template configs
      const templateConfigs = [
        { name: '300x300 Display', size: '300x300', type: 'display', width: 300, height: 300, sort_order: 1 },
        { name: '300x431 Display', size: '300x431', type: 'display', width: 300, height: 431, sort_order: 2 },
        { name: '300x600 Display', size: '300x600', type: 'display', width: 300, height: 600, sort_order: 3 },
        { name: '620x891 Display', size: '620x891', type: 'display', width: 620, height: 891, sort_order: 4 },
        { name: '980x400 Display', size: '980x400', type: 'display', width: 980, height: 400, sort_order: 5 },
        { name: '1080x1920 PDOOH', size: '1080x1920', type: 'pdooh', width: 1080, height: 1920, sort_order: 6 },
        { name: '1080x1080 Meta Feed', size: '1080x1080', type: 'meta', width: 1080, height: 1080, sort_order: 7 },
        { name: '1080x1920 Meta Stories', size: '1080x1920', type: 'meta', width: 1080, height: 1920, sort_order: 8 },
      ]

      // Get existing templates
      const { data: existing } = await supabase
        .from('creative_templates')
        .select('*')

      for (const config of templateConfigs) {
        const html = templates[config.size] || templates['1080x1080']

        const existingTemplate = existing?.find(t => t.size === config.size && t.type === config.type)

        if (existingTemplate) {
          // Update existing
          const { error } = await supabase
            .from('creative_templates')
            .update({
              name: config.name,
              html_template: html,
              width: config.width,
              height: config.height,
              active: true,
              updated_at: new Date().toISOString()
            })
            .eq('id', existingTemplate.id)

          results.push({ action: 'updated', size: config.size, type: config.type, error })
        } else {
          // Insert new
          const { error } = await supabase
            .from('creative_templates')
            .insert({
              name: config.name,
              size: config.size,
              type: config.type,
              width: config.width,
              height: config.height,
              html_template: html,
              default_values: getDefaultValues(config.type),
              active: true,
              sort_order: config.sort_order,
              tags: [config.type]
            })

          results.push({ action: 'inserted', size: config.size, type: config.type, error })
        }
      }

      return new Response(JSON.stringify({
        success: true,
        results
      }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      })
    }

    return new Response(JSON.stringify({ error: 'Unknown action' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function getDefaultValues(type: string) {
  const base = {
    headline: 'Hymyile.',
    subheadline: 'Olet hyvissä käsissä.',
    offer_title: 'Hammas-tarkastus',
    price: '49',
    currency: '€',
    offer_date: 'Varaa viimeistään 28.10.',
    cta_text: 'Varaa aika',
    logo_url: '/refs/assets/SuunTerveystalo_logo.png',
    image_url: '/refs/assets/nainen.jpg',
    artwork_url: '/refs/assets/terveystalo-artwork.png',
    click_url: 'https://terveystalo.com/suunterveystalo',
    branch_address: 'Torikatu 1, Lahti',
  }

  if (type === 'pdooh') {
    return { ...base, disclaimer_text: 'Tarjous voimassa uusille asiakkaille.' }
  }

  return base
}
