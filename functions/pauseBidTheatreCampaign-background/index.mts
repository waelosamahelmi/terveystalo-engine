import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { format } from 'date-fns';

// ============================================================================
// CONFIGURATION
// ============================================================================

function getEnvVar(names: string[]): string {
  for (const name of names) {
    if (process.env[name]) return process.env[name] || '';
  }
  return '';
}

const SUPABASE_URL = getEnvVar(['SUPABASE_URL', 'VITE_SUPABASE_URL']);
const SUPABASE_SERVICE_ROLE_KEY = getEnvVar(['SUPABASE_SERVICE_ROLE_KEY', 'VITE_SUPABASE_SERVICE_ROLE_KEY']);

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required environment variables: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY');
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const BT_API_URL = 'https://asx-api.bidtheatre.com/v2.0/api';

const bidTheatreApi = axios.create({
  baseURL: BT_API_URL,
  headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  timeout: 60000,
});

// ============================================================================
// HELPERS
// ============================================================================

async function getBidTheatreCredentials() {
  const { data, error } = await supabase
    .from('bidtheatre_credentials')
    .select('network_id, username, password, advertiser_id')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) throw new Error('Failed to fetch BidTheatre credentials');
  return data;
}

async function getBidTheatreToken() {
  const credentials = await getBidTheatreCredentials();
  const response = await bidTheatreApi.post('/auth', {
    username: credentials.username,
    password: credentials.password,
  });

  const token = response.data?.auth?.token;
  if (!token) throw new Error('Invalid BidTheatre authentication response');
  console.log('BidTheatre authenticated successfully');
  return token;
}

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3, baseDelay = 1000): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (axios.isAxiosError(error) && error.response?.status === 429 && attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, baseDelay * Math.pow(2, attempt - 1)));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

// ============================================================================
// PAUSE SINGLE BT CAMPAIGN
// ============================================================================

async function pauseBtCampaign(
  btRecord: any,
  btToken: string,
  networkId: string
): Promise<{ btCampaignId: number; method: string }> {
  const btCampaignId = btRecord.bt_campaign_id;

  // Try the dedicated pause endpoint first
  try {
    await retryWithBackoff(() =>
      bidTheatreApi.post(`/${networkId}/campaign/${btCampaignId}/pause`, null, {
        headers: { Authorization: `Bearer ${btToken}` },
      })
    );
    console.log(`Paused BT campaign ${btCampaignId} via /pause endpoint`);
    return { btCampaignId, method: 'pause-endpoint' };
  } catch (pauseErr: any) {
    console.warn(`/pause endpoint failed for ${btCampaignId}: ${pauseErr.message}. Trying cycle fallback.`);
  }

  // Fallback: set the cycle end date to today
  try {
    const cycleResp = await retryWithBackoff(() =>
      bidTheatreApi.get(`/${networkId}/campaign/${btCampaignId}/cycle`, {
        headers: { Authorization: `Bearer ${btToken}` },
      })
    );
    const cycle = cycleResp.data?.cycles?.[0];
    if (cycle) {
      const today = format(new Date(), 'yyyy-MM-dd');
      await retryWithBackoff(() =>
        bidTheatreApi.put(`/${networkId}/campaign/${btCampaignId}/cycle/${cycle.id}`, {
          id: cycle.id,
          startDate: cycle.startDate,
          endDate: today,
          deliveryUnit: cycle.deliveryUnit || 'Budget',
          amount: cycle.amount || 0,
          showDiffInvoicePopup: false,
        }, {
          headers: { Authorization: `Bearer ${btToken}` },
        })
      );
      console.log(`Paused BT campaign ${btCampaignId} by setting cycle end to ${today}`);
      return { btCampaignId, method: 'cycle-end-date' };
    }
  } catch (cycleErr: any) {
    console.error(`Cycle fallback also failed for ${btCampaignId}: ${cycleErr.message}`);
    throw cycleErr;
  }

  throw new Error(`No cycle found for BT campaign ${btCampaignId}`);
}

// ============================================================================
// NETLIFY HANDLER
// ============================================================================

export async function handler(event: any) {
  console.log(`pauseBidTheatreCampaign-background started at ${new Date().toISOString()}`);

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let payload: any;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON payload' }) };
  }

  const campaignId = payload.id || payload.campaignId;
  if (!campaignId) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing campaign id' }) };
  }

  try {
    // Fetch all BT campaign records
    const { data: btRecords, error: btError } = await supabase
      .from('bidtheatre_campaigns')
      .select('*')
      .eq('campaign_id', campaignId)
      .neq('status', 'paused');

    if (btError) throw new Error(`Failed to fetch BT records: ${btError.message}`);

    if (!btRecords || btRecords.length === 0) {
      console.log('No active BidTheatre campaigns to pause');
      return { statusCode: 200, body: JSON.stringify({ success: true, message: 'No active campaigns to pause' }) };
    }

    const btToken = await getBidTheatreToken();
    const credentials = await getBidTheatreCredentials();
    const networkId = credentials.network_id;

    let pausedCount = 0;
    let failedCount = 0;
    const now = new Date().toISOString();

    for (const btRecord of btRecords) {
      try {
        const result = await pauseBtCampaign(btRecord, btToken, networkId);
        console.log(`✓ Paused BT ${result.btCampaignId} via ${result.method}`);

        await supabase
          .from('bidtheatre_campaigns')
          .update({ status: 'paused', paused_at: now, updated_at: now })
          .eq('id', btRecord.id);

        pausedCount++;
      } catch (err: any) {
        failedCount++;
        console.error(`✗ Failed to pause BT ${btRecord.bt_campaign_id}: ${err.message}`);

        await supabase
          .from('bidtheatre_campaigns')
          .update({ error_message: `Pause failed: ${err.message}`, updated_at: now })
          .eq('id', btRecord.id);
      }
    }

    // Update parent campaign status
    await supabase.from('dental_campaigns').update({
      bt_sync_status: failedCount === 0 ? 'paused' : 'failed',
      bt_last_sync: now,
    }).eq('id', campaignId);

    await supabase.from('activity_logs').insert({
      action: 'bidtheatre_campaign_paused',
      entity_type: 'campaign',
      entity_id: campaignId,
      details: `Paused ${pausedCount}/${btRecords.length} BT campaigns (${failedCount} failed)`,
      user_id: payload.userId || 'system',
    });

    return {
      statusCode: failedCount === 0 ? 200 : 500,
      body: JSON.stringify({ success: failedCount === 0, paused: pausedCount, failed: failedCount }),
    };
  } catch (error: any) {
    console.error('Fatal error in pauseBidTheatreCampaign:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}