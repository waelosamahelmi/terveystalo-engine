// ============================================================================
// SUUN TERVEYSTALO - Netlify Background Function: Generate ONE Meta Video Ad
// Server-side HTML-to-MP4 rendering using Puppeteer + FFmpeg
// Handles a single branch × service × size combination.
// Dispatched in parallel by the client for each video.
// ============================================================================

import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';
import ffmpeg from 'fluent-ffmpeg';
import ffmpegInstaller from '@ffmpeg-installer/ffmpeg';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import axios from 'axios';

// FFmpeg path
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

// ============================================================================
// ENV & SUPABASE
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// Google Sheets
const SHEETS_API_ENDPOINT = 'https://sheets.googleapis.com/v4/spreadsheets';
const SHEET_ID = process.env.VITE_GOOGLE_SHEET_ID || process.env.GOOGLE_SHEET_ID || '';
const SHEET_NAME = 'FEED';
const GOOGLE_CLIENT_ID = process.env.VITE_GOOGLE_CLIENT_ID || process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.VITE_GOOGLE_CLIENT_SECRET || process.env.GOOGLE_CLIENT_SECRET || '';
const GOOGLE_REFRESH_TOKEN = process.env.VITE_GOOGLE_REFRESH_TOKEN || process.env.GOOGLE_REFRESH_TOKEN || '';

// ============================================================================
// TYPES
// ============================================================================

interface VideoRequest {
  campaignId: string;
  campaignName: string;
  creativeId: string;
  branchId: string;
  serviceId: string;
  width: number;
  height: number;
  sizeLabel: 'feed' | 'story';
  formData: {
    headline?: string;
    subheadline?: string;
    offer_text?: string;
    cta_text?: string;
    general_brand_message?: string;
    creative_type: string;
    campaign_address?: string;
    meta_video_url?: string;
    meta_audio_url?: string;
  };
}

interface CreativeTemplate {
  id: string;
  name: string;
  type: string;
  size: string;
  width: number;
  height: number;
  html_template: string;
  default_values: Record<string, unknown>;
  active: boolean;
}

interface Branch {
  id: string;
  name: string;
  short_name?: string;
  address: string;
  city: string;
}

interface Service {
  id: string;
  name: string;
  name_fi: string;
  code?: string;
  default_price?: string;
  default_offer_fi?: string;
}

// ============================================================================
// TEMPLATE RENDERING (mirrors client-side renderTemplateHtml)
// ============================================================================

function fixFontUrls(html: string): string {
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://suunterveystalo.netlify.app';
  return html
    .replace(/url\((['"]?)\/font\//g, `url($1${siteUrl}/font/`)
    .replace(/src=["']\/font\//g, `src="${siteUrl}/font/`)
    .replace(/src=["']\/meta\//g, `src="${siteUrl}/meta/`)
    .replace(/src=["']\/refs\//g, `src="${siteUrl}/refs/`);
}

function renderTemplateHtml(
  template: CreativeTemplate,
  variables: Record<string, string>
): string {
  let html = template.html_template;

  const sizeAttr = `data-template-size="${template.size || 'unknown'}"`;
  html = html.replace('<html', `<html ${sizeAttr}`).replace('<body', `<body ${sizeAttr}`);

  const isSplitStructure = html.includes('{{headline_line2}}');
  const hasHeadlinePlaceholder = html.includes('{{headline}}');

  const mergedVars: Record<string, string> = {};
  if (template.default_values) {
    for (const [k, v] of Object.entries(template.default_values)) {
      mergedVars[k] = String(v ?? '');
    }
  }
  for (const [k, v] of Object.entries(variables)) {
    mergedVars[k] = v;
  }

  if (isSplitStructure && hasHeadlinePlaceholder) {
    const headline = mergedVars['headline'] || '';
    if (headline.includes('|') || headline.includes('\n')) {
      const parts = headline.split(/[|\n]/);
      mergedVars['headline'] = parts[0]?.trim() || '';
      mergedVars['headline_line2'] = parts.slice(1).join(' ').trim();
    } else {
      mergedVars['headline_line2'] = '';
    }
  }

  html = html.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    const value = mergedVars[key];
    if (value === undefined) return match;
    return String(value).replace(/\n/g, '<br>').replace(/\|/g, '<br>');
  });

  html = fixFontUrls(html);

  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://suunterveystalo.netlify.app';
  html = html.replace(/src=["'](?!http|data:)([^"']+)["']/g, (match, src) => {
    if (src.startsWith('/')) {
      return `src="${siteUrl}${src}"`;
    }
    return match;
  });
  html = html.replace(/url\((['"]?)(?!http|data:)([^)'"]+)\1\)/g, (match, quote, url) => {
    if (url.startsWith('/')) {
      return `url(${quote}${siteUrl}${url}${quote})`;
    }
    return match;
  });

  return html;
}

// ============================================================================
// BUILD TEMPLATE VARIABLES (mirrors client-side)
// ============================================================================

function buildTemplateVariables(
  branch: Branch,
  service: Service,
  size: { width: number; height: number },
  formData: VideoRequest['formData'],
  isGeneralBrandMessage: boolean,
  showAddress: boolean,
  siteUrl: string
): Record<string, string> {
  const branchAddress = showAddress ? `${branch.address}, ${branch.city}` : '';
  const headlineParts = (formData.headline || 'Hymyile.|Olet hyvissä käsissä.').split('|');
  const headlineValue = headlineParts[0]?.trim() || 'Hymyile.';

  let subheadlineValue = formData.subheadline || '';
  if (!subheadlineValue) {
    if (headlineParts.length > 1) {
      subheadlineValue = headlineParts.slice(1).join(' ').trim();
    } else {
      subheadlineValue = 'Olet hyvissä käsissä.';
    }
  }

  const cityName = branch.city || '';
  let messageText = subheadlineValue;
  if (!formData.subheadline) {
    messageText = cityName
      ? `Sujuvampaa suunterveyttä ${cityName}n Suun Terveystalossa.`
      : 'Sujuvampaa suunterveyttä Suun Terveystaloissa.';
  }

  const serviceName = service.name_fi || service.name;

  return {
    title: 'Suun Terveystalo',
    headline: headlineValue,
    subheadline: messageText,
    offer_title: isGeneralBrandMessage ? '' : (service.default_offer_fi || serviceName),
    offer_subtitle: isGeneralBrandMessage ? '' : 'uusille asiakkaille',
    price: isGeneralBrandMessage ? '' : (service.default_price || formData.offer_text || '49'),
    currency: '€',
    cta_text: formData.cta_text || 'Varaa aika',
    branch_address: branchAddress,
    scene3_line1: 'Sujuvampaa',
    scene3_line2: 'terveyttä',
    scene3_line3: cityName,
    scene3_line4: 'Suun Terveystalossa.',
    city_name: cityName,
    logo_url: `${siteUrl}/refs/assets/SuunTerveystalo_logo.png`,
    artwork_url: `${siteUrl}/refs/assets/terveystalo-artwork.png`,
    image_url: `${siteUrl}/refs/assets/nainen.jpg`,
    font_url: 'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;700;800;900&display=swap',
    font_family: 'Inter',
    bg_color: '#0a1e5c',
    text_color: '#fff',
    click_url: 'https://terveystalo.com/suunterveystalo',
    offer_date: isGeneralBrandMessage ? '' : '',
  };
}

// ============================================================================
// PUPPETEER: Render HTML to PNG frames
// ============================================================================

async function getChromiumExecPath(): Promise<string> {
  // In Lambda/production, use @sparticuz/chromium
  try {
    const execPath = await chromium.executablePath();
    if (execPath) return execPath;
  } catch {
    // Not in Lambda — fall through to local detection
  }

  // Local development: find a locally installed Chrome/Chromium
  const candidates = [
    // Windows
    process.env.CHROME_PATH,
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe`,
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
  ].filter(Boolean) as string[];

  for (const p of candidates) {
    if (fs.existsSync(p)) {
      console.log(`Using local Chrome: ${p}`);
      return p;
    }
  }

  throw new Error('No Chrome/Chromium executable found. Set CHROME_PATH env var or install Chrome.');
}

async function renderHtmlToFrames(
  html: string,
  width: number,
  height: number,
  durationMs: number,
  fps: number,
  outputDir: string
): Promise<string[]> {
  const executablePath = await getChromiumExecPath();
  const isLambda = !!process.env.AWS_LAMBDA_FUNCTION_NAME;

  const browser = await puppeteer.launch({
    args: isLambda ? chromium.args : ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width, height },
    executablePath,
    headless: true,
  });

  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'domcontentloaded', timeout: 60000 });
  // Wait for fonts, videos, and other resources to finish loading
  await page.evaluate(() => document.fonts.ready);
  await new Promise(r => setTimeout(r, 3000));

  const totalFrames = Math.ceil((durationMs / 1000) * fps);
  const frameDurationMs = 1000 / fps;
  const framePaths: string[] = [];

  console.log(`Capturing ${totalFrames} frames at ${fps}fps for ${durationMs}ms...`);

  // Pause all CSS animations
  await page.evaluate(() => {
    document.querySelectorAll('*').forEach(el => {
      const htmlEl = el as HTMLElement;
      const computed = getComputedStyle(htmlEl);
      if (computed.animationName && computed.animationName !== 'none') {
        htmlEl.style.animationPlayState = 'paused';
      }
    });
    document.querySelectorAll('video').forEach(v => v.pause());
  });

  for (let frame = 0; frame < totalFrames; frame++) {
    const timeMs = frame * frameDurationMs;

    await page.evaluate((t) => {
      document.querySelectorAll('*').forEach(el => {
        const htmlEl = el as HTMLElement;
        const computed = getComputedStyle(htmlEl);
        if (computed.animationName && computed.animationName !== 'none') {
          htmlEl.style.animationDelay = `-${t}ms`;
          htmlEl.style.animationPlayState = 'paused';
        }
      });
      document.querySelectorAll('video').forEach(v => {
        v.currentTime = t / 1000;
      });
    }, timeMs);

    await page.evaluate(() => {
      void document.body.offsetHeight;
    });

    await new Promise(r => setTimeout(r, 50));

    const framePath = path.join(outputDir, `frame-${String(frame).padStart(5, '0')}.png`);
    await page.screenshot({ path: framePath, type: 'png' });
    framePaths.push(framePath);

    if (frame % 30 === 0) {
      console.log(`  Frame ${frame}/${totalFrames} (${(timeMs / 1000).toFixed(1)}s)`);
    }
  }

  await browser.close();
  console.log(`Captured ${framePaths.length} frames`);
  return framePaths;
}

// ============================================================================
// FFMPEG: Stitch frames + audio → MP4
// ============================================================================

function stitchFramesToMp4(
  framesDir: string,
  audioUrl: string | null,
  outputPath: string,
  fps: number,
  width: number,
  height: number,
  durationSec: number
): Promise<void> {
  return new Promise((resolve, reject) => {
    const command = ffmpeg()
      .input(path.join(framesDir, 'frame-%05d.png'))
      .inputFPS(fps)
      .videoCodec('libx264')
      .outputOptions([
        '-pix_fmt yuv420p',
        '-preset fast',
        '-crf 23',
        `-s ${width}x${height}`,
        `-t ${durationSec}`,
      ]);

    if (audioUrl) {
      command
        .input(audioUrl)
        .audioCodec('aac')
        .audioBitrate('128k')
        .outputOptions(['-shortest']);
    }

    command
      .output(outputPath)
      .on('start', (cmd: string) => console.log('FFmpeg command:', cmd))
      .on('end', () => {
        console.log(`MP4 created: ${outputPath}`);
        resolve();
      })
      .on('error', (err: Error) => {
        console.error('FFmpeg error:', err);
        reject(err);
      })
      .run();
  });
}

// ============================================================================
// UPLOAD TO SUPABASE STORAGE
// ============================================================================

async function uploadToSupabase(
  filePath: string,
  storagePath: string
): Promise<string | null> {
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.mp4`;
  const fullPath = `${storagePath}/${fileName}`;

  const { error } = await supabase.storage
    .from('media')
    .upload(fullPath, fileBuffer, {
      contentType: 'video/mp4',
      upsert: false,
    });

  if (error) {
    console.error('Supabase upload error:', error);
    return null;
  }

  const { data: urlData } = supabase.storage
    .from('media')
    .getPublicUrl(fullPath);

  return urlData.publicUrl;
}

// ============================================================================
// GOOGLE SHEETS: Update video URLs (for the first feed/story video only)
// ============================================================================

async function getGoogleAccessToken(): Promise<string | null> {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REFRESH_TOKEN) {
    console.log('Google Sheets credentials not configured');
    return null;
  }
  try {
    const resp = await axios.post('https://oauth2.googleapis.com/token', {
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      refresh_token: GOOGLE_REFRESH_TOKEN,
      grant_type: 'refresh_token',
    });
    return resp.data.access_token;
  } catch (err) {
    console.error('Failed to get Google access token:', err);
    return null;
  }
}

async function findCampaignSheetRows(campaignId: string, accessToken: string): Promise<number[]> {
  try {
    const resp = await axios.get(
      `${SHEETS_API_ENDPOINT}/${SHEET_ID}/values/${SHEET_NAME}!A:A`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const rows = resp.data.values || [];
    const indices: number[] = [];
    for (let i = 0; i < rows.length; i++) {
      if (rows[i]?.[0] === campaignId) {
        indices.push(i + 1); // 1-based
      }
    }
    return indices;
  } catch {
    return [];
  }
}

async function updateSheetVideoUrl(
  campaignId: string,
  sizeLabel: 'feed' | 'story',
  videoUrl: string
): Promise<void> {
  const accessToken = await getGoogleAccessToken();
  if (!accessToken || !SHEET_ID) return;

  const rowIndices = await findCampaignSheetRows(campaignId, accessToken);
  // BM = column 65 (feed), BN = column 66 (story)
  const col = sizeLabel === 'feed' ? 'BM' : 'BN';

  for (const rowIndex of rowIndices) {
    try {
      await axios.put(
        `${SHEETS_API_ENDPOINT}/${SHEET_ID}/values/${SHEET_NAME}!${col}${rowIndex}`,
        { values: [[videoUrl]] },
        {
          params: { valueInputOption: 'RAW' },
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );
    } catch (err) {
      console.error(`Failed to update sheet row ${rowIndex} col ${col}:`, err);
    }
  }
  console.log(`Updated sheet column ${col} for campaign ${campaignId}`);
}

// ============================================================================
// HANDLER: Generate ONE video
// ============================================================================

const handler: Handler = async (event) => {
  console.log('=== generateMetaVideo-background START ===');

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let request: VideoRequest;
  try {
    request = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON body' };
  }

  if (!request.campaignId || !request.creativeId || !request.branchId || !request.serviceId) {
    return { statusCode: 400, body: 'Missing required fields' };
  }

  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || 'https://suunterveystalo.netlify.app';
  const FPS = 30;
  const DURATION_MS = 15000;
  const DURATION_SEC = 15;

  try {
    // 1. Fetch branch, service, and template from DB
    const [branchRes, serviceRes, templateRes] = await Promise.all([
      supabase.from('branches').select('id, name, short_name, address, city').eq('id', request.branchId).single(),
      supabase.from('services').select('id, name, name_fi, code, default_price, default_offer_fi').eq('id', request.serviceId).single(),
      supabase.from('creative_templates').select('*').eq('type', 'meta').eq('active', true)
        .eq('width', request.width).eq('height', request.height).limit(1).single(),
    ]);

    const branch: Branch = branchRes.data || { id: request.branchId, name: 'Branch', address: '', city: '' };
    const service: Service = serviceRes.data || { id: request.serviceId, name: request.campaignName, name_fi: request.campaignName };
    const template: CreativeTemplate | null = templateRes.data;

    if (!template) {
      console.error(`No active meta template found for ${request.width}x${request.height}`);
      await supabase.from('creatives').update({ status: 'rejected' }).eq('id', request.creativeId);
      return { statusCode: 404, body: `No template for ${request.width}x${request.height}` };
    }

    const sizeStr = `${request.width}x${request.height}`;
    const serviceName = service.name_fi || service.name;
    const adName = `${serviceName}${branch.city ? `-${branch.city}` : ''}`
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9-]/g, '_')
      .replace(/_+/g, '_')
      .replace(/^_|_$/g, '');

    const storagePath = `meta-creatives/${request.campaignId}/${adName}`;

    // Mark creative as generating
    await supabase.from('creatives').update({ status: 'generating' }).eq('id', request.creativeId);

    const isGeneralBrandMessage = service.code === 'yleinen-brandiviesti' ||
      !!(request.formData.general_brand_message && request.formData.general_brand_message.length > 0);
    const showAddress = request.formData.creative_type === 'local' || request.formData.creative_type === 'both';

    // 2. Build variables and render HTML
    const variables = buildTemplateVariables(
      branch, service, { width: request.width, height: request.height },
      request.formData, isGeneralBrandMessage, showAddress, siteUrl
    );
    let templateHtml = renderTemplateHtml(template, variables);

    if (isGeneralBrandMessage) {
      templateHtml = templateHtml.replace('</head>',
        '<style>.Pricetag, .Price, .HammasTarkast, .HammasTarkastu, .VaronViimcist, .pricetag, .price-bubble, .price-badge-wrap { display: none !important; }</style></head>');
    }
    if (!showAddress) {
      templateHtml = templateHtml.replace('</head>',
        '<style>.address, .Torikatu1Laht, .branch_address, .scene-4-address { display: none !important; }</style></head>');
    }

    // Determine audio URL
    const audioFile = request.formData.meta_audio_url ||
      '/meta/audio/Terveystalo Suun TT TVC Brändillinen 15s 2025 09 23 Net Master -14LUFS.wav';
    const audioUrl = audioFile.startsWith('http') ? audioFile : `${siteUrl}${audioFile}`;

    console.log(`Generating ${sizeStr} video for ${adName}...`);

    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `meta-${sizeStr}-`));

    try {
      // Download audio file to local temp path (FFmpeg can't handle URLs with spaces)
      let localAudioPath: string | null = null;
      if (audioUrl) {
        const audioTmpPath = path.join(tmpDir, 'audio.wav');
        try {
          const audioResp = await axios.get(audioUrl, { responseType: 'arraybuffer' });
          fs.writeFileSync(audioTmpPath, Buffer.from(audioResp.data));
          localAudioPath = audioTmpPath;
          console.log(`Downloaded audio to ${audioTmpPath}`);
        } catch (audioErr) {
          console.warn('Failed to download audio, will generate video without audio:', audioErr);
        }
      }

      // 3. Render frames with Puppeteer
      const framePaths = await renderHtmlToFrames(
        templateHtml, request.width, request.height,
        DURATION_MS, FPS, tmpDir
      );

      if (framePaths.length === 0) {
        console.error(`No frames captured for ${sizeStr} ${adName}`);
        await supabase.from('creatives').update({ status: 'rejected' }).eq('id', request.creativeId);
        return { statusCode: 500, body: 'No frames captured' };
      }

      // 4. Stitch frames + audio → MP4
      const mp4Path = path.join(tmpDir, 'output.mp4');
      await stitchFramesToMp4(tmpDir, localAudioPath, mp4Path, FPS, request.width, request.height, DURATION_SEC);

      // 5. Upload to Supabase Storage
      const publicUrl = await uploadToSupabase(mp4Path, storagePath);
      if (!publicUrl) {
        await supabase.from('creatives').update({ status: 'rejected' }).eq('id', request.creativeId);
        return { statusCode: 500, body: 'Upload failed' };
      }

      console.log(`Uploaded: ${publicUrl}`);

      // 6. Update creative record to 'ready' with video URL
      const { error: creativeErr } = await supabase
        .from('creatives')
        .update({
          image_url: publicUrl,
          preview_url: publicUrl,
          status: 'ready',
        })
        .eq('id', request.creativeId);

      if (creativeErr) {
        console.error('Creative record update error:', creativeErr);
      }

      // 7. Update campaign-level video URL (set if not already set)
      const urlField = request.sizeLabel === 'feed' ? 'meta_video_url' : 'meta_story_url';
      const { data: campaign } = await supabase
        .from('dental_campaigns')
        .select(urlField)
        .eq('id', request.campaignId)
        .single();

      if (campaign && !campaign[urlField]) {
        await supabase
          .from('dental_campaigns')
          .update({ [urlField]: publicUrl })
          .eq('id', request.campaignId);
        console.log(`Set campaign ${urlField} = ${publicUrl}`);

        // Update Google Sheet with this first video URL
        await updateSheetVideoUrl(request.campaignId, request.sizeLabel, publicUrl);
      }

      console.log('=== generateMetaVideo-background DONE ===');
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true, videoUrl: publicUrl }),
      };
    } finally {
      try {
        fs.rmSync(tmpDir, { recursive: true, force: true });
      } catch {
        // ignore cleanup errors
      }
    }
  } catch (error) {
    console.error('generateMetaVideo-background FAILED:', error);
    // Mark creative as failed
    try {
      await supabase.from('creatives').update({ status: 'rejected' }).eq('id', request.creativeId);
    } catch { /* ignore */ }
    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

export { handler };
