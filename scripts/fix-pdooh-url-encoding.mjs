import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

const BT_API_URL = 'https://asx-api.bidtheatre.com/v2.0/api';

function parseArgs(argv) {
  const out = {
    apply: false,
    includeInactive: false,
    campaignId: '',
    limit: 0,
  };

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--apply') out.apply = true;
    else if (arg === '--include-inactive') out.includeInactive = true;
    else if (arg === '--campaign-id') out.campaignId = String(argv[i + 1] || '').trim();
    else if (arg === '--limit') out.limit = Number(argv[i + 1] || 0) || 0;

    if (arg === '--campaign-id' || arg === '--limit') i++;
  }

  return out;
}

const args = parseArgs(process.argv.slice(2));
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing Supabase env vars: VITE_SUPABASE_URL/SUPABASE_URL + VITE_SUPABASE_SERVICE_ROLE_KEY/SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const btApi = axios.create({
  baseURL: BT_API_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 60000,
});

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sanitizeAdPayload(raw) {
  const payload = {};
  for (const [key, value] of Object.entries(raw || {})) {
    if (value === null || value === undefined) continue;
    if (key === 'links') continue;

    if (typeof value === 'object' && !Array.isArray(value) && value.id !== undefined) {
      payload[key] = value.id;
    } else {
      payload[key] = value;
    }
  }

  return payload;
}

async function retryWithBackoff(fn, maxRetries = 6, baseDelayMs = 1200) {
  let lastErr;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = err?.response?.status;
      if ((status === 429 || status >= 500) && attempt < maxRetries) {
        const waitMs = baseDelayMs * attempt;
        console.log(`Retryable error ${status}, attempt ${attempt}/${maxRetries}. Waiting ${waitMs}ms...`);
        await sleep(waitMs);
        continue;
      }
      throw err;
    }
  }
  throw lastErr;
}

async function getBidTheatreCredentials() {
  const { data, error } = await supabase
    .from('bidtheatre_credentials')
    .select('network_id, username, password, advertiser_id')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error(`Failed to load BidTheatre credentials: ${error?.message || 'unknown error'}`);
  }

  return data;
}

async function getBidTheatreToken(username, password) {
  const resp = await btApi.post('/auth', { username, password });
  const token = resp?.data?.token || resp?.data?.auth?.token || resp?.data?.data?.token;
  if (!token) {
    throw new Error(`Invalid BT auth response: ${JSON.stringify(resp?.data || {})}`);
  }
  return token;
}

async function btRequest(tokenRef, credentials, method, url, data) {
  const run = async () => retryWithBackoff(() => btApi.request({
    method,
    url,
    data,
    headers: { Authorization: `Bearer ${tokenRef.value}` },
  }));

  try {
    return await run();
  } catch (err) {
    if (err?.response?.status === 401) {
      console.log('BT token expired, refreshing...');
      tokenRef.value = await getBidTheatreToken(credentials.username, credentials.password);
      return run();
    }
    throw err;
  }
}

function normalizeContentUrl(url) {
  return String(url || '').replace(/%2520/g, '%20');
}

async function main() {
  console.log('=== Fix PDOOH URL Encoding (%2520 -> %20) ===');
  console.log(`Mode: ${args.apply ? 'APPLY (writes enabled)' : 'DRY-RUN (no writes)'}`);
  if (args.campaignId) console.log(`Filter campaign_id: ${args.campaignId}`);
  if (args.limit > 0) console.log(`Limit updates: ${args.limit}`);
  console.log('');

  const credentials = await getBidTheatreCredentials();
  const tokenRef = { value: await getBidTheatreToken(credentials.username, credentials.password) };
  const networkId = credentials.network_id;

  let query = supabase
    .from('bidtheatre_campaigns')
    .select('id,campaign_id,bt_campaign_id,channel,status')
    .eq('channel', 'PDOOH');

  if (args.campaignId) query = query.eq('campaign_id', args.campaignId);

  const { data: btRows, error: btRowsError } = await query;
  if (btRowsError) throw new Error(`Failed to fetch bidtheatre_campaigns: ${btRowsError.message}`);

  const btCampaignIds = new Set((btRows || []).map((r) => r.bt_campaign_id).filter(Boolean));
  console.log(`PDOOH campaign records found: ${(btRows || []).length} (BT campaign IDs: ${btCampaignIds.size})`);

  if (btCampaignIds.size === 0) {
    console.log('No PDOOH BT campaigns found. Exiting.');
    return;
  }

  const adsResp = await btRequest(tokenRef, credentials, 'get', `/${networkId}/ad`);
  const allAds = adsResp?.data?.ads || [];
  console.log(`Total ads in network: ${allAds.length}`);

  const candidateAds = allAds.filter((ad) => {
    const campaignId = typeof ad.campaign === 'object' ? ad.campaign?.id : ad.campaign;
    if (!btCampaignIds.has(campaignId)) return false;
    if (!args.includeInactive && ad.adStatus !== 'Active') return false;

    const contentURL = String(ad.contentURL || '');
    return contentURL.includes('%2520');
  });

  console.log(`Matching ads needing fix: ${candidateAds.length}`);

  if (candidateAds.length === 0) {
    console.log('Nothing to update.');
    return;
  }

  const toProcess = args.limit > 0 ? candidateAds.slice(0, args.limit) : candidateAds;

  for (const ad of toProcess.slice(0, 20)) {
    const campaignId = typeof ad.campaign === 'object' ? ad.campaign?.id : ad.campaign;
    console.log(`- ad ${ad.id} | campaign ${campaignId} | ${ad.adStatus} | ${String(ad.contentURL).slice(0, 130)}`);
  }
  if (toProcess.length > 20) {
    console.log(`...and ${toProcess.length - 20} more`);
  }

  if (!args.apply) {
    console.log('\nDry-run complete. Re-run with --apply to update these ads.');
    return;
  }

  console.log('\nApplying fixes...');
  let updated = 0;
  let failed = 0;

  for (const ad of toProcess) {
    try {
      const adId = ad.id;
      const adDetailResp = await btRequest(tokenRef, credentials, 'get', `/${networkId}/ad/${adId}`);
      const raw = adDetailResp?.data?.ad || adDetailResp?.data;
      const payload = sanitizeAdPayload(raw);

      const beforeUrl = String(payload.contentURL || '');
      const afterUrl = normalizeContentUrl(beforeUrl);

      if (!beforeUrl.includes('%2520')) {
        continue;
      }

      payload.contentURL = afterUrl;
      payload.adStatus = payload.adStatus || ad.adStatus || 'Active';
      payload.adType = payload.adType || ad.adType;
      payload.campaign = typeof payload.campaign === 'object' ? payload.campaign?.id : payload.campaign;

      if (!payload.campaign || !payload.adType) {
        throw new Error('Missing required fields campaign/adType in PUT payload');
      }

      await btRequest(tokenRef, credentials, 'put', `/${networkId}/ad/${adId}`, payload);
      updated += 1;
      console.log(`✓ Updated ad ${adId}`);

      // Respect BT write limit (60 writes/min)
      await sleep(1100);
    } catch (err) {
      failed += 1;
      console.error(`✗ Failed ad ${ad?.id}: ${err?.response?.data?.error?.message || err?.message || err}`);
    }
  }

  console.log('\n=== Summary ===');
  console.log(`Processed: ${toProcess.length}`);
  console.log(`Updated:   ${updated}`);
  console.log(`Failed:    ${failed}`);
}

main().catch((err) => {
  console.error('Fatal:', err?.response?.data || err?.message || err);
  process.exit(1);
});
