import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { parseISO, format, addMonths } from 'date-fns';

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

// Ad dimensions (same as create function)
const AD_DIMENSIONS: Record<string, { width: number; height: number; dimension: number }> = {
  '300x300': { width: 300, height: 300, dimension: 10 },
  '300x431': { width: 300, height: 431, dimension: 1888 },
  '300x600': { width: 300, height: 600, dimension: 11 },
  '620x891': { width: 620, height: 891, dimension: 1888 },
  '980x400': { width: 980, height: 400, dimension: 15 },
  '1080x1920': { width: 1080, height: 1920, dimension: 385 },
};

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

function formatDateForBT(dateStr: string): string {
  if (!dateStr) throw new Error('Date string is undefined');
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return dateStr;
  if (/^\d{2}\/\d{2}\/\d{4}$/.test(dateStr)) {
    const [day, month, year] = dateStr.split('/');
    return `${year}-${month}-${day}`;
  }
  const parsed = parseISO(dateStr);
  if (!isNaN(parsed.getTime())) return format(parsed, 'yyyy-MM-dd');
  throw new Error(`Invalid date format: ${dateStr}`);
}

function metersToKm(meters: number): number {
  return Math.max(1, Math.ceil(meters / 1000));
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function fetchCreativeHtml(publicUrl: string): Promise<string | null> {
  try {
    const response = await axios.get(publicUrl, { timeout: 15000, responseType: 'text' });
    return response.data;
  } catch (error: any) {
    console.error(`Failed to fetch creative HTML from ${publicUrl}:`, error.message);
    return null;
  }
}

/**
 * Build a lightweight iframe wrapper HTML for BidTheatre.
 * Instead of sending the full HTML creative (which can exceed BT's size limit),
 * this creates a minimal HTML page (~500 bytes) that dynamically loads the
 * hosted creative via an iframe pointing to the Supabase public URL.
 * 
 * The iframe is created via JavaScript to bypass BidTheatre's HTML sanitizer
 * which strips raw <iframe> tags.
 */
function buildIframeWrapper(creativeUrl: string, width: number, height: number, landingUrl: string): string {
  const clickTagValue = `{clickurl}${encodeURIComponent(landingUrl)}`;
  // Route through serve-creative proxy so HTML is served with correct Content-Type
  // (Supabase Storage serves .html files as plain text/download for XSS protection)
  const siteUrl = process.env.URL || process.env.DEPLOY_PRIME_URL || '';
  const proxyUrl = `${siteUrl}/.netlify/functions/serve-creative?url=${encodeURIComponent(creativeUrl)}`;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<script>var clickTag="${clickTagValue}";</script>
<style>*{margin:0;padding:0;overflow:hidden}body{width:${width}px;height:${height}px;position:relative}</style>
</head><body>
<script>
var f=document.createElement('iframe');
f.src='${proxyUrl}';
f.style.cssText='border:0;width:${width}px;height:${height}px;display:block';
f.setAttribute('scrolling','no');
f.setAttribute('frameborder','0');
document.body.appendChild(f);
var a=document.createElement('a');
a.href='javascript:void(window.open(clickTag))';
a.style.cssText='position:absolute;top:0;left:0;width:${width}px;height:${height}px;z-index:9999;display:block;cursor:pointer';
document.body.appendChild(a);
</script>
</body></html>`;
}

// ============================================================================
// UPDATE SINGLE BT CAMPAIGN (one branch + channel)
// ============================================================================

async function updateBtCampaign(
  btRecord: any, // bidtheatre_campaigns row
  campaign: any, // dental_campaigns row
  btToken: string,
  networkId: string
) {
  const btCampaignId = btRecord.bt_campaign_id;
  const channelType = btRecord.channel;

  console.log(`Updating BT campaign ${btCampaignId} (${channelType}) for branch ${btRecord.branch_id}`);

  // 1. Update campaign name if needed
  try {
    await retryWithBackoff(() =>
      bidTheatreApi.put(`/${networkId}/campaign/${btCampaignId}`, {
        name: `ST / ${channelType} / ${campaign.name || campaign.id.substring(0, 8)}`,
        targetURL: campaign.landing_url || 'https://terveystalo.com/suunterveystalo',
      }, {
        headers: { Authorization: `Bearer ${btToken}` },
      })
    );
    console.log(`Updated campaign name for BT ${btCampaignId}`);
  } catch (err: any) {
    console.warn(`Failed to update campaign name: ${err.message}`);
  }

  // 2. Update cycle (budget + dates)
  const totalChannelBudget = channelType === 'DISPLAY'
    ? (campaign.budget_display || 0)
    : (campaign.budget_pdooh || 0);
  const branchIds: string[] = campaign.branch_ids || (campaign.branch_id ? [campaign.branch_id] : []);
  const budgetPerBranch = totalChannelBudget / Math.max(branchIds.length, 1);

  const startDate = formatDateForBT(campaign.campaign_start_date || campaign.start_date);
  const isOngoing = !campaign.campaign_end_date
    || campaign.campaign_end_date === 'ONGOING'
    || campaign.is_ongoing;

  let endDate: string;
  if (isOngoing) {
    endDate = format(addMonths(parseISO(startDate), 1), 'yyyy-MM-dd');
  } else {
    endDate = formatDateForBT(campaign.campaign_end_date || campaign.end_date);
  }

  // Fetch existing cycle
  try {
    const cycleResp = await retryWithBackoff(() =>
      bidTheatreApi.get(`/${networkId}/campaign/${btCampaignId}/cycle`, {
        headers: { Authorization: `Bearer ${btToken}` },
      })
    );
    const cycle = cycleResp.data?.cycles?.[0];

    if (cycle) {
      await retryWithBackoff(() =>
        bidTheatreApi.put(`/${networkId}/campaign/${btCampaignId}/cycle/${cycle.id}`, {
          id: cycle.id,
          startDate,
          endDate,
          deliveryUnit: 'Budget',
          amount: budgetPerBranch,
          showDiffInvoicePopup: false,
        }, {
          headers: { Authorization: `Bearer ${btToken}` },
        })
      );
      console.log(`Updated cycle ${cycle.id}: budget=${budgetPerBranch}, end=${endDate}`);
    } else {
      // Create new cycle if none exists
      await retryWithBackoff(() =>
        bidTheatreApi.post(`/${networkId}/campaign/${btCampaignId}/cycle`, {
          startDate,
          endDate,
          deliveryUnit: 'Budget',
          amount: budgetPerBranch,
          showDiffInvoicePopup: false,
        }, {
          headers: { Authorization: `Bearer ${btToken}` },
        })
      );
      console.log(`Created new cycle for BT ${btCampaignId}`);
    }
  } catch (err: any) {
    console.error(`Cycle update failed for BT ${btCampaignId}: ${err.message}`);
    throw err;
  }

  // 3. Update geo-targeting if coordinates changed
  const lat = campaign.campaign_coordinates?.lat || 0;
  const lng = campaign.campaign_coordinates?.lng || 0;
  const radius = campaign.campaign_radius || 1500;

  if (btRecord.geo_target_id && btRecord.geo_target_coordinates_id && lat && lng) {
    try {
      await retryWithBackoff(() =>
        bidTheatreApi.put(
          `/${networkId}/geo-target/${btRecord.geo_target_id}/geo-target-coordinate/${btRecord.geo_target_coordinates_id}`,
          { latitude: lat, longitude: lng, radius: metersToKm(radius) },
          { headers: { Authorization: `Bearer ${btToken}` } }
        )
      );
      console.log(`Updated geo-target coordinates`);
    } catch (err: any) {
      console.warn(`Geo-target update failed: ${err.message}`);
    }
  }

  // 4. Update ads with fresh creatives
  const adGroupIds = btRecord.ad_group_ids || {};
  const existingAdIds = btRecord.ad_ids || {};

  // Delete old ads first
  for (const [groupName, ids] of Object.entries(existingAdIds)) {
    for (const adId of (ids as number[])) {
      try {
        await retryWithBackoff(() =>
          bidTheatreApi.delete(`/${networkId}/ad/${adId}`, {
            headers: { Authorization: `Bearer ${btToken}` },
          })
        );
      } catch {
        // Ad may already be deleted; ignore
      }
    }
  }

  // Fetch fresh creatives
  const { data: creatives } = await supabase
    .from('creatives')
    .select('*')
    .eq('campaign_id', campaign.id)
    .eq('type', channelType.toLowerCase())
    .eq('status', 'ready');

  const newAdIds: Record<string, number[]> = {};
  for (const groupName of Object.keys(adGroupIds)) {
    newAdIds[groupName] = [];
  }

  if (creatives && creatives.length > 0) {
    // Determine which sizes belong to which group
    const groupSizeMap: Record<string, string[]> = channelType === 'DISPLAY' ? {
      'Mobile sizes': ['300x600', '300x431'],
      'Small desktop': ['300x600', '300x300'],
      'Large desktop sizes': ['620x891', '980x400'],
    } : {
      'Default campaign': ['1080x1920'],
    };

    for (const [groupName, sizes] of Object.entries(groupSizeMap)) {
      const groupId = adGroupIds[groupName];
      if (!groupId) continue;

      for (const size of sizes) {
        const config = AD_DIMENSIONS[size];
        if (!config) continue;

        const sizeCreatives = creatives.filter(c =>
          c.size === size || (c.width === config.width && c.height === config.height)
        );

        // Filter for branch-specific creatives
        const { data: branch } = await supabase
          .from('branches')
          .select('name, short_name')
          .eq('id', btRecord.branch_id)
          .single();

        const branchLabel = (branch?.short_name || branch?.name || '').toLowerCase();
        const branchCreatives = branchLabel
          ? sizeCreatives.filter(c => (c.name || '').toLowerCase().includes(branchLabel))
          : sizeCreatives;
        const creativesToUse = branchCreatives.length > 0 ? branchCreatives : sizeCreatives;

        for (const creative of creativesToUse) {
          const creativeUrl = creative.image_url || creative.preview_url;
          if (!creativeUrl) {
            console.warn(`No public URL for creative ${creative.id}, skipping`);
            continue;
          }

          const landingUrl = campaign.landing_url || 'https://terveystalo.com/suunterveystalo';

          // Build lightweight iframe wrapper instead of sending full HTML
          const html = buildIframeWrapper(creativeUrl, config.width, config.height, landingUrl);
          console.log(`Built iframe wrapper for ${creative.name} (${html.length} bytes)`);

          // --- HTML banner ad ---
          try {
            const adResp = await retryWithBackoff(() =>
              bidTheatreApi.post(`/${networkId}/ad`, {
                campaign: btCampaignId,
                name: creative.name || `${branchLabel} - ${size}`,
                adType: 'HTML banner',
                adStatus: 'Active',
                html,
                dimension: config.dimension,
                isExpandable: false,
                isInSync: true,
                isSecure: true,
              }, {
                headers: { Authorization: `Bearer ${btToken}` },
              })
            );
            const adId = adResp.data.ad.id;
            if (!newAdIds[groupName]) newAdIds[groupName] = [];
            newAdIds[groupName].push(adId);
            console.log(`Created updated HTML ad ${adId} for ${size}`);
            await sleep(300);
          } catch (adErr: any) {
            console.error(`HTML ad creation failed for ${size}: ${adErr.message}`);
          }


        }
      }

      // Re-assign ads to group
      if (newAdIds[groupName]?.length > 0) {
        try {
          await retryWithBackoff(() =>
            bidTheatreApi.post(`/${networkId}/adgroup/${groupId}/ad`, { ad: newAdIds[groupName] }, {
              headers: { Authorization: `Bearer ${btToken}` },
            })
          );
        } catch (err: any) {
          console.error(`Ad re-assignment failed for "${groupName}": ${err.message}`);
        }
      }
    }
  }

  // 5. Update bidtheatre_campaigns record
  await supabase
    .from('bidtheatre_campaigns')
    .update({
      ad_ids: newAdIds,
      budget: budgetPerBranch,
      is_ongoing: isOngoing,
      updated_at: new Date().toISOString(),
    })
    .eq('id', btRecord.id);

  return { btCampaignId, success: true };
}

// ============================================================================
// NETLIFY HANDLER
// ============================================================================

export async function handler(event: any) {
  console.log(`updateBidTheatreCampaign-background started at ${new Date().toISOString()}`);

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
    // Fetch full campaign data
    const { data: campaign, error: campError } = await supabase
      .from('dental_campaigns')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (campError || !campaign) {
      throw new Error(`Campaign ${campaignId} not found: ${campError?.message}`);
    }

    // Fetch all BT campaign records for this campaign
    const { data: btRecords, error: btError } = await supabase
      .from('bidtheatre_campaigns')
      .select('*')
      .eq('campaign_id', campaignId);

    if (btError) throw new Error(`Failed to fetch BT records: ${btError.message}`);

    if (!btRecords || btRecords.length === 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No BidTheatre campaigns found — launch first' }) };
    }

    const btToken = await getBidTheatreToken();
    const credentials = await getBidTheatreCredentials();
    const networkId = credentials.network_id;

    let overallSuccess = true;
    let overallErrors = '';

    // Update each BT campaign (one per branch × channel)
    for (const btRecord of btRecords) {
      try {
        await updateBtCampaign(btRecord, campaign, btToken, networkId);
        console.log(`✓ Updated BT ${btRecord.bt_campaign_id} (${btRecord.channel})`);
      } catch (err: any) {
        overallSuccess = false;
        const errBody = err.response?.data ? JSON.stringify(err.response.data) : '';
        const errDetail = errBody ? `${err.message} | BT response: ${errBody}` : err.message;
        overallErrors += `BT ${btRecord.bt_campaign_id}: ${errDetail}\n`;
        console.error(`✗ BT ${btRecord.bt_campaign_id}: ${errDetail}`);
      }
    }

    // Update sync status
    await supabase.from('dental_campaigns').update({
      bt_sync_status: overallSuccess ? 'synced' : 'failed',
      bt_last_sync: new Date().toISOString(),
      bt_sync_error: overallErrors || null,
    }).eq('id', campaignId);

    await supabase.from('activity_logs').insert({
      action: 'bidtheatre_campaign_updated',
      entity_type: 'campaign',
      entity_id: campaignId,
      details: `Updated ${btRecords.length} BT campaigns (success: ${overallSuccess})`,
      user_id: campaign.created_by || 'system',
    });

    return {
      statusCode: overallSuccess ? 200 : 500,
      body: JSON.stringify({ success: overallSuccess, updated: btRecords.length, error: overallErrors || undefined }),
    };
  } catch (error: any) {
    console.error('Fatal error in updateBidTheatreCampaign:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}