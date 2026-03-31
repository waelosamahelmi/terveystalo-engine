/**
 * One-time migration script: Generate JPG images for existing PDOOH creatives
 * and trigger BidTheatre campaign updates to re-push as image ads.
 *
 * Usage: node scripts/migrate-pdooh-jpg.mjs
 */

import puppeteer from 'puppeteer';
import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Load env vars from .env file
const envPath = resolve(__dirname, '..', '.env');
const envContent = readFileSync(envPath, 'utf-8');
const env = {};
for (const line of envContent.replace(/\r/g, '').split('\n')) {
  const match = line.match(/^([^=]+)=(.*)$/);
  if (match) env[match[1].trim()] = match[2].trim();
}

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = env.VITE_SUPABASE_SERVICE_ROLE_KEY;
const CAMPAIGN_ID = '69d2969f-281a-4993-85d4-bf47fceecc6f';
const SITE_URL = 'https://suunterveystalo.netlify.app';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

async function main() {
  console.log('=== PDOOH JPG Migration Script ===');
  console.log(`Campaign: ${CAMPAIGN_ID}`);
  console.log();

  // 1. Add jpg_url column if it doesn't exist (safe to run multiple times)
  console.log('Step 0: Ensuring jpg_url column exists on creatives table...');
  const { error: alterError } = await supabase.rpc('exec_sql', {
    sql: `ALTER TABLE creatives ADD COLUMN IF NOT EXISTS jpg_url TEXT;`
  }).maybeSingle();
  if (alterError) {
    // Column might already exist or rpc might not exist — try direct approach
    console.log('  Note: Could not run ALTER TABLE via RPC. Please ensure the jpg_url column exists:');
    console.log('  ALTER TABLE creatives ADD COLUMN IF NOT EXISTS jpg_url TEXT;');
    console.log('  Continuing anyway (column may already exist)...');
  } else {
    console.log('  jpg_url column ready.');
  }
  console.log();

  // 2. Fetch all PDOOH creatives for this campaign
  console.log('Step 1: Fetching PDOOH creatives...');
  const { data: creatives, error: fetchError } = await supabase
    .from('creatives')
    .select('*')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('type', 'pdooh')
    .eq('status', 'ready');

  if (fetchError) {
    console.error('Failed to fetch creatives:', fetchError.message);
    process.exit(1);
  }

  if (!creatives || creatives.length === 0) {
    console.log('No PDOOH creatives found for this campaign.');
    process.exit(0);
  }

  console.log(`Found ${creatives.length} PDOOH creatives to process.`);
  console.log();

  // 3. Launch Puppeteer browser
  console.log('Step 2: Launching browser for HTML-to-JPG rendering...');
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  let processedCount = 0;
  let errorCount = 0;

  for (const creative of creatives) {
    const creativeUrl = creative.image_url || creative.preview_url;
    if (!creativeUrl) {
      console.log(`  Skipping ${creative.id} (${creative.name}) — no URL`);
      errorCount++;
      continue;
    }

    console.log(`  Processing: ${creative.name} (${creative.width}x${creative.height})`);

    try {
      // Fetch HTML content from Supabase Storage
      // Use serve-creative proxy to get correct content-type
      const proxyUrl = `${SITE_URL}/.netlify/functions/serve-creative?url=${encodeURIComponent(creativeUrl)}`;

      // 2160x3840 creatives are just 1080x1920 upscaled via CSS transform:scale(2).
      // Render at native 1080x1920 with deviceScaleFactor:2 for a crisp 2160x3840 image.
      const isUpscaled = (creative.width === 2160 && creative.height === 3840);
      const viewportWidth = isUpscaled ? 1080 : (creative.width || 1080);
      const viewportHeight = isUpscaled ? 1920 : (creative.height || 1920);
      const scaleFactor = isUpscaled ? 2 : 1;

      const page = await browser.newPage();
      await page.setViewport({
        width: viewportWidth,
        height: viewportHeight,
        deviceScaleFactor: scaleFactor,
      });

      // Navigate to the creative HTML via proxy
      await page.goto(proxyUrl, {
        waitUntil: 'networkidle0',
        timeout: 30000,
      });

      // For upscaled creatives, remove the CSS transform so we render the
      // native 1080x1920 content — deviceScaleFactor:2 handles the upscale.
      if (isUpscaled) {
        await page.evaluate(() => {
          // Remove the upscale style that was injected during generation
          const styles = document.querySelectorAll('style');
          styles.forEach(s => {
            if (s.textContent && s.textContent.includes('transform:scale(2)')) {
              s.remove();
            }
          });
          // Reset body dimensions to native 1080x1920
          document.documentElement.style.width = '1080px';
          document.documentElement.style.height = '1920px';
          document.body.style.width = '1080px';
          document.body.style.height = '1920px';
        });
      }

      // Wait a bit for fonts and animations to settle
      await new Promise(r => setTimeout(r, 2000));

      // Screenshot as JPG
      const jpgBuffer = await page.screenshot({
        type: 'jpeg',
        quality: 92,
        fullPage: false,
        clip: {
          x: 0,
          y: 0,
          width: viewportWidth,
          height: viewportHeight,
        },
      });

      await page.close();
      console.log(`    Rendered JPG: ${jpgBuffer.byteLength} bytes`);

      // Upload JPG to Supabase Storage
      const storagePath = creative.image_url
        ? creative.image_url.split('/media/')[1]?.replace(/\.html$/, '.jpg')
        : `campaigns/${CAMPAIGN_ID}/pdooh/${creative.id}.jpg`;

      if (!storagePath) {
        console.log(`    Could not determine storage path, using fallback`);
      }

      const jpgStoragePath = storagePath || `campaigns/${CAMPAIGN_ID}/pdooh/${creative.id}.jpg`;

      const { error: uploadError } = await supabase.storage
        .from('media')
        .upload(jpgStoragePath, jpgBuffer, {
          contentType: 'image/jpeg',
          upsert: true,
        });

      if (uploadError) {
        console.error(`    Upload failed: ${uploadError.message}`);
        errorCount++;
        continue;
      }

      const { data: urlData } = supabase.storage.from('media').getPublicUrl(jpgStoragePath);
      const jpgUrl = urlData.publicUrl;
      console.log(`    Uploaded to: ${jpgUrl}`);

      // Update creative record with jpg_url
      const { error: updateError } = await supabase
        .from('creatives')
        .update({ jpg_url: jpgUrl })
        .eq('id', creative.id);

      if (updateError) {
        console.error(`    DB update failed: ${updateError.message}`);
        errorCount++;
        continue;
      }

      console.log(`    ✓ Updated creative record with jpg_url`);
      processedCount++;
    } catch (err) {
      console.error(`    Error processing ${creative.name}:`, err.message);
      errorCount++;
    }
  }

  await browser.close();
  console.log();
  console.log(`Step 2 complete: ${processedCount} JPGs generated, ${errorCount} errors`);
  console.log();

  if (processedCount === 0) {
    console.log('No JPGs were generated. Skipping BidTheatre update.');
    process.exit(1);
  }

  // 4. Trigger BidTheatre update for all PDOOH campaigns
  console.log('Step 3: Triggering BidTheatre update for PDOOH campaigns...');

  // Fetch all PDOOH BT campaign records
  const { data: btRecords, error: btFetchError } = await supabase
    .from('bidtheatre_campaigns')
    .select('*')
    .eq('campaign_id', CAMPAIGN_ID)
    .eq('channel', 'PDOOH');

  if (btFetchError) {
    console.error('Failed to fetch BT records:', btFetchError.message);
    process.exit(1);
  }

  if (!btRecords || btRecords.length === 0) {
    console.log('No PDOOH BidTheatre campaign records found.');
    process.exit(0);
  }

  console.log(`Found ${btRecords.length} PDOOH BidTheatre campaign records.`);

  // Trigger the update via the Netlify function
  try {
    const response = await fetch(`${SITE_URL}/.netlify/functions/updateBidTheatreCampaign-background`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: CAMPAIGN_ID }),
    });

    if (response.ok) {
      console.log(`  ✓ BidTheatre update triggered successfully (status: ${response.status})`);
      console.log('  Note: Background function is processing — updates will be applied asynchronously.');
    } else {
      const body = await response.text();
      console.error(`  ✗ BidTheatre update failed (status: ${response.status}): ${body}`);
    }
  } catch (err) {
    console.error('  ✗ Failed to trigger BidTheatre update:', err.message);
  }

  console.log();
  console.log('=== Migration complete ===');
  console.log(`  Creatives processed: ${processedCount}/${creatives.length}`);
  console.log(`  Errors: ${errorCount}`);
}

main().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
