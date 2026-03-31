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

// Ad dimensions (must match create function exactly)
const AD_DIMENSIONS: Record<string, { width: number; height: number; dimension: number }> = {
  '300x300': { width: 300, height: 300, dimension: 22 },
  '300x431': { width: 300, height: 431, dimension: 697 },
  '300x600': { width: 300, height: 600, dimension: 11 },
  '620x891': { width: 620, height: 891, dimension: 1888 },
  '980x400': { width: 980, height: 400, dimension: 15 },
  '1080x1920': { width: 1080, height: 1920, dimension: 385 },
  '2160x3840': { width: 2160, height: 3840, dimension: 6286 },
};

// Ad group definitions per channel (must match create function)
const DISPLAY_AD_GROUPS = [
  { name: 'Desktop sizes', sizes: ['300x600', '620x891', '980x400'] },
  { name: 'Mobile sizes', sizes: ['300x300', '300x600', '300x431'] },
];

const PDOOH_AD_GROUPS = [
  { name: 'Default campaign', sizes: ['1080x1920'] },
  { name: '2160x3840', sizes: ['2160x3840'] },
];

// ============================================================================
// LOCATION BUNDLES (mirrored from src/lib/metaTemplateVariables.ts)
// ============================================================================

const LOCATION_BUNDLES = [
  { bundleName: 'Kirkkonummi', locations: ['Masala', 'Veikkola', 'Lohja'] },
  { bundleName: 'Helsinki', locations: ['Itäkeskus', 'Ogeli', 'Kamppi', 'Redi'] },
  { bundleName: 'Espoo', locations: ['Leppävaara', 'Iso Omena', 'Lippulaiva'] },
  { bundleName: 'Vantaa', locations: ['Tikkurila', 'Myyrmäki'] },
];

function getBundleForBranch(branchName: string): typeof LOCATION_BUNDLES[number] | null {
  const normalized = branchName
    .replace('Suun Terveystalo ', '')
    .replace('Terveystalo ', '')
    .trim();
  for (const bundle of LOCATION_BUNDLES) {
    if (bundle.locations.includes(normalized)) return bundle;
  }
  return null;
}

// ============================================================================
// UTM & NAMING HELPERS
// ============================================================================

/**
 * Fetch the primary service code for a campaign.
 * Falls back to 'yleinen' if service not found.
 */
async function fetchPrimaryServiceCode(serviceId: string): Promise<string> {
  if (!serviceId) return 'yleinen';
  const { data } = await supabase
    .from('services')
    .select('code')
    .eq('id', serviceId)
    .single();
  return data?.code || 'yleinen';
}

/**
 * Map a service code/name to a UTM-friendly slug.
 */
function getServiceSlug(codeOrName: string): string {
  if (!codeOrName) return 'yleinen';
  const lower = codeOrName.toLowerCase().trim();
  if (lower.startsWith('yleinen')) return 'yleinen';
  return lower.replace(/\s+/g, '_');
}

/**
 * Build Piwik + UTM query parameters for BidTheatre landing URLs.
 */
function buildUtmParams(channel: 'display' | 'pdooh', serviceSlug: string): string {
  const year = new Date().getFullYear();
  const funnel = serviceSlug === 'yleinen' ? 'tietoisuus' : 'harkinta';
  const campaignName = encodeURIComponent(`B2C_taktinen_kampanja_${funnel}_dental_kr2_prospektoiva_marketing-engine_${year}`);
  const content = encodeURIComponent(`banneri_${serviceSlug}`);

  return [
    `pk_campaign=${campaignName}`,
    `pk_source=rtb`,
    `pk_medium=display`,
    `pk_content=${content}`,
    `utm_campaign=${campaignName}`,
    `utm_source=rtb`,
    `utm_medium=display`,
    `utm_content=${content}`,
  ].join('&');
}

/** Append UTM parameters to a landing URL. */
function buildLandingUrlWithUtm(baseUrl: string, channel: 'display' | 'pdooh', serviceSlug: string): string {
  if (!baseUrl) return baseUrl;
  const params = buildUtmParams(channel, serviceSlug);
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${params}`;
}

/**
 * Extract service slug from creative fields.
 */
function getCreativeServiceSlug(creative: any, fallbackSlug: string): string {
  if (creative.service_name) return getServiceSlug(creative.service_name);
  const parts = (creative.name || '').split(' - ');
  if (parts.length >= 3) return getServiceSlug(parts[1]);
  return fallbackSlug;
}

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

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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
// FETCH CREATIVES (matches create function logic)
// ============================================================================

async function fetchCreativesForBranch(
  campaignId: string,
  channel: 'display' | 'pdooh',
  branchLabel: string,
  nationwideAddressMode?: string
) {
  const { data, error } = await supabase
    .from('creatives')
    .select('*')
    .eq('campaign_id', campaignId)
    .eq('type', channel)
    .eq('status', 'ready');

  if (error) {
    console.error(`Failed to fetch creatives: ${error.message}`);
    return [];
  }
  if (!data || data.length === 0) return [];

  // Nationwide without address: all branches share the same creatives
  if (nationwideAddressMode === 'without_address') {
    return data;
  }

  // Nationwide with address: match by bundle name or branch label
  let searchLabel = branchLabel;
  if (nationwideAddressMode === 'with_address') {
    const bundle = getBundleForBranch(branchLabel);
    if (bundle) {
      searchLabel = bundle.bundleName;
    }
  }

  const searchLower = searchLabel.toLowerCase();
  const branchCreatives = data.filter(c => {
    const name = (c.name || '').toLowerCase();
    return name.includes(searchLower);
  });

  // Fallback to all creatives if no branch-specific match found
  return branchCreatives.length > 0 ? branchCreatives : data;
}

// ============================================================================
// UPDATE SINGLE BT CAMPAIGN (one branch + channel)
// ============================================================================

async function updateBtCampaign(
  btRecord: any, // bidtheatre_campaigns row
  campaign: any, // dental_campaigns row
  btToken: string,
  networkId: string,
  serviceSlug: string
) {
  const btCampaignId = btRecord.bt_campaign_id;
  const channelType = btRecord.channel;
  const channelLower = channelType.toLowerCase() as 'display' | 'pdooh';

  console.log(`Updating BT campaign ${btCampaignId} (${channelType}) for branch ${btRecord.branch_id}`);

  // 1. Update campaign name and targetURL with UTMs
  const campaignName = (campaign.name || '').toUpperCase().replace(/\s+/g, '_');
  const baseLandingUrl = campaign.landing_url || 'https://terveystalo.com/suunterveystalo';
  const targetURLWithUtm = buildLandingUrlWithUtm(baseLandingUrl, channelLower, serviceSlug);

  try {
    await retryWithBackoff(() =>
      bidTheatreApi.put(`/${networkId}/campaign/${btCampaignId}`, {
        name: `NØRR3_SUUNTT_B2C_${btCampaignId}_SAVELA_K_${channelType}_${campaignName}`,
        targetURL: targetURLWithUtm,
      }, {
        headers: { Authorization: `Bearer ${btToken}` },
      })
    );
    console.log(`Updated campaign name for BT ${btCampaignId}`);
  } catch (err: any) {
    console.warn(`Failed to update campaign name: ${err.message}`);
  }

  // 2. Update cycle (budget + dates)
  // Use per-branch budget allocations if available, else equal split (matches create function)
  const rawBcb = campaign.branch_channel_budgets;
  const branchChannelBudgets: Record<string, { meta: number; display: number; pdooh: number; audio: number }> | null =
    typeof rawBcb === 'string' ? JSON.parse(rawBcb) : rawBcb || null;
  let budgetPerBranch: number;
  if (branchChannelBudgets && branchChannelBudgets[btRecord.branch_id]) {
    const bb = branchChannelBudgets[btRecord.branch_id];
    budgetPerBranch = channelType === 'DISPLAY' ? (bb.display || 0) : (bb.pdooh || 0);
  } else {
    const totalChannelBudget = channelType === 'DISPLAY'
      ? (campaign.budget_display || 0)
      : (campaign.budget_pdooh || 0);
    const rawIds = campaign.branch_ids || (campaign.branch_id ? [campaign.branch_id] : []);
    const branchIds: string[] = typeof rawIds === 'string' ? JSON.parse(rawIds) : rawIds;
    budgetPerBranch = totalChannelBudget / Math.max(branchIds.length, 1);
  }

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

  // 3. Update geo-targeting using per-branch radius and branch coordinates
  const { data: branchData } = await supabase
    .from('branches')
    .select('name, short_name, city, coordinates, latitude, longitude')
    .eq('id', btRecord.branch_id)
    .single();

  const lat = branchData?.coordinates?.lat || branchData?.latitude || campaign.campaign_coordinates?.lat || 0;
  const lng = branchData?.coordinates?.lng || branchData?.longitude || campaign.campaign_coordinates?.lng || 0;

  // Per-branch radius from branch_radius_settings (in km), matching create function
  const rawBrs = campaign.branch_radius_settings;
  const branchRadiusSettings: Record<string, { radius: number }> | null =
    typeof rawBrs === 'string' ? JSON.parse(rawBrs) : rawBrs || null;
  const radiusKm = branchRadiusSettings?.[btRecord.branch_id]?.radius || campaign.campaign_radius || 10;

  if (btRecord.geo_target_id && btRecord.geo_target_coordinates_id && lat && lng) {
    try {
      await retryWithBackoff(() =>
        bidTheatreApi.put(
          `/${networkId}/geo-target/${btRecord.geo_target_id}/geo-target-coordinate/${btRecord.geo_target_coordinates_id}`,
          { latitude: lat, longitude: lng, radius: radiusKm },
          { headers: { Authorization: `Bearer ${btToken}` } }
        )
      );
      console.log(`Updated geo-target coordinates: ${lat},${lng} r=${radiusKm}km`);
    } catch (err: any) {
      console.warn(`Geo-target update failed: ${err.message}`);
    }
  }

  // 4. Update ads with fresh creatives
  const adGroupIds = btRecord.ad_group_ids || {};
  const existingAdIds = btRecord.ad_ids || {};

  // Delete old ads first
  for (const [, ids] of Object.entries(existingAdIds)) {
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

  // Fetch fresh creatives using the same logic as create function
  const branchLabel = branchData?.short_name || branchData?.name || '';
  const creatives = await fetchCreativesForBranch(
    campaign.id,
    channelType.toLowerCase() as 'display' | 'pdooh',
    branchLabel,
    campaign.nationwide_address_mode
  );

  // Use the same ad group definitions as the create function
  const adGroups = channelType === 'DISPLAY' ? DISPLAY_AD_GROUPS : PDOOH_AD_GROUPS;

  const newAdIds: Record<string, number[]> = {};
  for (const groupName of Object.keys(adGroupIds)) {
    newAdIds[groupName] = [];
  }

  if (creatives && creatives.length > 0) {
    const baseLanding = campaign.landing_url || 'https://terveystalo.com/suunterveystalo';
    const createdAdsByCreativeSize: Record<string, number> = {}; // dedup across groups sharing sizes

    for (const group of adGroups) {
      const groupId = adGroupIds[group.name];
      if (!groupId) {
        console.warn(`No ad group ID for "${group.name}", skipping`);
        continue;
      }

      for (const size of group.sizes) {
        const config = AD_DIMENSIONS[size];
        if (!config) continue;

        const sizeCreatives = creatives.filter(c =>
          c.size === size || (c.width === config.width && c.height === config.height)
        );

        for (const creative of sizeCreatives) {
          // Dedup: reuse ad if same creative+size already created for another group
          const dedupKey = `${creative.id}::${size}`;
          if (createdAdsByCreativeSize[dedupKey]) {
            if (!newAdIds[group.name]) newAdIds[group.name] = [];
            newAdIds[group.name].push(createdAdsByCreativeSize[dedupKey]);
            continue;
          }

          const creativeUrl = creative.image_url || creative.preview_url;
          if (!creativeUrl) {
            console.warn(`No public URL for creative ${creative.id}, skipping`);
            continue;
          }

          const creativeServiceSlug = getCreativeServiceSlug(creative, serviceSlug);
          const landingUrl = buildLandingUrlWithUtm(baseLanding, channelLower, creativeServiceSlug);

          try {
            let adResp;

            if (creative.jpg_url && channelType === 'PDOOH') {
              // --- PDOOH image ad: send JPG directly to BidTheatre ---
              const jpgResponse = await axios.get(creative.jpg_url, { responseType: 'arraybuffer', timeout: 30000 });
              const jpgBase64 = Buffer.from(jpgResponse.data).toString('base64');
              console.log(`Sending JPG image ad for ${creative.name} (${jpgResponse.data.byteLength} bytes)`);

              adResp = await retryWithBackoff(() =>
                bidTheatreApi.post(`/${networkId}/ad`, {
                  campaign: btCampaignId,
                  name: creative.name || `${branchLabel} - ${size}`,
                  adType: 'Image',
                  adStatus: 'Active',
                  imageData: jpgBase64,
                  imageType: 'image/jpeg',
                  targetURL: landingUrl,
                  clickThroughURL: landingUrl,
                  dimension: config.dimension,
                  isSecure: true,
                }, {
                  headers: { Authorization: `Bearer ${btToken}` },
                })
              );
              console.log(`Created JPG image ad ${adResp.data.ad.id} for ${size}`);
            } else {
              // --- HTML banner ad (uses lightweight iframe wrapper) ---
              const html = buildIframeWrapper(creativeUrl, config.width, config.height, landingUrl);
              console.log(`Built iframe wrapper for ${creative.name} (${html.length} bytes)`);

              adResp = await retryWithBackoff(() =>
                bidTheatreApi.post(`/${networkId}/ad`, {
                  campaign: btCampaignId,
                  name: creative.name || `${branchLabel} - ${size}`,
                  adType: 'HTML banner',
                  adStatus: 'Active',
                  html,
                  targetURL: landingUrl,
                  clickThroughURL: landingUrl,
                  dimension: config.dimension,
                  isExpandable: false,
                  isInSync: true,
                  isSecure: true,
                }, {
                  headers: { Authorization: `Bearer ${btToken}` },
                })
              );
              console.log(`Created updated HTML ad ${adResp.data.ad.id} for ${size}`);
            }

            const adId = adResp.data.ad.id;
            createdAdsByCreativeSize[dedupKey] = adId;
            if (!newAdIds[group.name]) newAdIds[group.name] = [];
            newAdIds[group.name].push(adId);
            await sleep(300);
          } catch (adErr: any) {
            console.error(`Ad creation failed for ${size}: ${adErr.response?.data?.message || adErr.message}`);
          }
        }
      }

      // Re-assign ads to group
      if (newAdIds[group.name]?.length > 0) {
        try {
          await retryWithBackoff(() =>
            bidTheatreApi.post(`/${networkId}/adgroup/${groupId}/ad`, { ad: newAdIds[group.name] }, {
              headers: { Authorization: `Bearer ${btToken}` },
            })
          );
        } catch (err: any) {
          console.error(`Ad re-assignment failed for "${group.name}": ${err.message}`);
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

    // Fetch primary service code for UTM parameters
    const serviceCode = await fetchPrimaryServiceCode(campaign.service_id);
    const serviceSlug = getServiceSlug(serviceCode);

    let overallSuccess = true;
    let overallErrors = '';

    // Update each BT campaign (one per branch × channel)
    for (const btRecord of btRecords) {
      try {
        await updateBtCampaign(btRecord, campaign, btToken, networkId, serviceSlug);
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