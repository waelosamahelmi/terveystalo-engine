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

// ============================================================================
// BidTheatre dimension IDs for HTML ad sizes
// ============================================================================

const AD_DIMENSIONS: Record<string, { width: number; height: number; dimension: number }> = {
  '300x300': { width: 300, height: 300, dimension: 10 },
  '300x431': { width: 300, height: 431, dimension: 1888 },
  '300x600': { width: 300, height: 600, dimension: 11 },
  '620x891': { width: 620, height: 891, dimension: 1888 },
  '980x400': { width: 980, height: 400, dimension: 15 },
  '1080x1920': { width: 1080, height: 1920, dimension: 385 },
};

// Ad group definitions per channel
const DISPLAY_AD_GROUPS = [
  { name: 'Mobile sizes', sizes: ['300x600', '300x431'] },
  { name: 'Small desktop', sizes: ['300x600', '300x300'] },
  { name: 'Large desktop sizes', sizes: ['620x891', '980x400'] },
];

const PDOOH_AD_GROUPS = [
  { name: 'Default campaign', sizes: ['1080x1920'] },
];

// ============================================================================
// HELPERS
// ============================================================================

interface ChannelDef {
  channel: 'DISPLAY' | 'PDOOH';
}

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

async function getBidStrategyTemplates(channel: string) {
  const { data, error } = await supabase
    .from('bidtheatre_bid_strategies')
    .select('*')
    .eq('channel', channel);

  if (error) throw new Error(`Failed to fetch bid strategy templates for ${channel}`);
  return data || [];
}

// ============================================================================
// FETCH CREATIVES FROM SUPABASE
// ============================================================================

/**
 * Fetches ready creatives for a campaign + channel, optionally filtered by branch.
 * Creatives are named: "BranchLabel - ServiceName - WxH"
 */
async function fetchCreativesForBranch(
  campaignId: string,
  channel: 'display' | 'pdooh',
  branchLabel: string
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

  // Filter creatives belonging to this branch by name pattern
  const branchLower = branchLabel.toLowerCase();
  const branchCreatives = data.filter(c => {
    const name = (c.name || '').toLowerCase();
    return name.includes(branchLower);
  });

  // If no branch-specific creatives found, return all (fallback for nationwide)
  return branchCreatives.length > 0 ? branchCreatives : data;
}

/**
 * Fetches the HTML content from a public Supabase storage URL.
 */
async function fetchCreativeHtml(publicUrl: string): Promise<string | null> {
  try {
    const response = await axios.get(publicUrl, { timeout: 15000, responseType: 'text' });
    return response.data;
  } catch (error: any) {
    console.error(`Failed to fetch creative HTML from ${publicUrl}:`, error.message);
    return null;
  }
}

// ============================================================================
// CREATE BT CAMPAIGN FOR A SINGLE BRANCH + CHANNEL
// ============================================================================

async function createBtCampaignForBranch(
  campaign: any,
  branch: any,
  channelDef: ChannelDef,
  btToken: string,
  networkId: string,
  advertiserId: number
) {
  const channelType = channelDef.channel;
  const adGroups = channelType === 'DISPLAY' ? DISPLAY_AD_GROUPS : PDOOH_AD_GROUPS;
  const branchName = branch.short_name || branch.name || 'Branch';
  const branchCity = branch.city || campaign.campaign_city || '';

  console.log(`Creating BT campaign: ${branchName} / ${channelType}`);

  // 1. Create BT campaign
  const campaignPayload = {
    name: `ST / ${channelType} / ${branchName} / ${campaign.id.substring(0, 8)}`,
    advertiser: advertiserId,
    campaignKPI: 3,
    targetURL: campaign.landing_url || 'https://terveystalo.com/suunterveystalo',
    defaultGeoTarget: null,
    expectedTotalImps: channelType === 'DISPLAY' ? 8422 : 12500,
    deliveryPriority: 'even',
    defaultFilterTarget: channelType === 'DISPLAY' ? 22418 : 32491,
    defaultOptimizationStrategy: channelType === 'DISPLAY' ? 538 : 519,
    allowWideTargeting: false,
    renderOBA: false,
    takeScreenshots: false,
  };

  const campaignResp = await retryWithBackoff(() =>
    bidTheatreApi.post(`/${networkId}/campaign`, campaignPayload, {
      headers: { Authorization: `Bearer ${btToken}` },
    })
  );
  const btCampaignId = campaignResp.data.campaign.id;
  console.log(`Created BT campaign ${btCampaignId} for ${branchName} / ${channelType}`);

  // 2. Set category (3 = Health & Beauty)
  await retryWithBackoff(() =>
    bidTheatreApi.post(`/${networkId}/campaign/${btCampaignId}/category`, { category: 3 }, {
      headers: { Authorization: `Bearer ${btToken}` },
    })
  );

  // 3. Calculate budget per branch (split total channel budget equally across branches)
  const totalChannelBudget = channelType === 'DISPLAY'
    ? (campaign.budget_display || 0)
    : (campaign.budget_pdooh || 0);
  const branchIds: string[] = campaign.branch_ids || (campaign.branch_id ? [campaign.branch_id] : []);
  const budgetPerBranch = totalChannelBudget / Math.max(branchIds.length, 1);

  if (budgetPerBranch <= 0) {
    throw new Error(`Invalid budget for ${channelType}: ${budgetPerBranch} (total: ${totalChannelBudget}, branches: ${branchIds.length})`);
  }

  // 4. Set cycle (budget + dates)
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

  const cycleResp = await retryWithBackoff(() =>
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
  const cycleId = cycleResp.data?.cycle?.id;

  // 5. Create ad groups
  const adGroupIds: Record<string, number> = {};
  const adIds: Record<string, number[]> = {};

  for (const group of adGroups) {
    const agResp = await retryWithBackoff(() =>
      bidTheatreApi.post(`/${networkId}/adgroup`, {
        name: group.name,
        campaign: btCampaignId,
        autoAddAds: false,
      }, {
        headers: { Authorization: `Bearer ${btToken}` },
      })
    );
    adGroupIds[group.name] = agResp.data.adgroup.id;
    adIds[group.name] = [];
    console.log(`Created ad group "${group.name}" (ID: ${adGroupIds[group.name]})`);
  }

  // 6. Fetch creatives for this branch + channel from Supabase
  const creatives = await fetchCreativesForBranch(
    campaign.id,
    channelType.toLowerCase() as 'display' | 'pdooh',
    branchName
  );
  console.log(`Found ${creatives.length} creatives for ${branchName} / ${channelType}`);

  // 7. Create HTML ads from creatives
  for (const group of adGroups) {
    for (const size of group.sizes) {
      const config = AD_DIMENSIONS[size];
      if (!config) continue;

      // Find matching creatives by size
      const sizeCreatives = creatives.filter(c =>
        c.size === size || (c.width === config.width && c.height === config.height)
      );

      for (const creative of sizeCreatives) {
        // Get HTML content: stored in DB field or fetch from storage URL
        let html = creative.rendered_html || creative.html_content;

        if (!html && (creative.image_url || creative.preview_url)) {
          html = await fetchCreativeHtml(creative.image_url || creative.preview_url);
        }

        if (!html) {
          console.warn(`No HTML content for creative ${creative.id} (${creative.name}), skipping`);
          continue;
        }

        try {
          const adResp = await retryWithBackoff(() =>
            bidTheatreApi.post(`/${networkId}/ad`, {
              campaign: btCampaignId,
              name: creative.name || `${branchName} - ${size}`,
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
          adIds[group.name].push(adId);
          console.log(`Created ad ${adId} for ${size} (${creative.name})`);
        } catch (adError: any) {
          console.error(`Ad creation failed for ${size}: ${adError.response?.data?.message || adError.message}`);
        }
      }
    }
  }

  // 8. Assign ads to their ad groups
  for (const group of adGroups) {
    const groupAdIds = adIds[group.name];
    if (groupAdIds.length > 0) {
      try {
        await retryWithBackoff(() =>
          bidTheatreApi.post(`/${networkId}/adgroup/${adGroupIds[group.name]}/ad`, { ad: groupAdIds }, {
            headers: { Authorization: `Bearer ${btToken}` },
          })
        );
        console.log(`Assigned ${groupAdIds.length} ads to "${group.name}"`);
      } catch (err: any) {
        console.error(`Ad assignment failed for "${group.name}": ${err.message}`);
      }
    }
  }

  // 9. Set geo-targeting using branch coordinates
  const lat = branch.coordinates?.lat || branch.latitude || campaign.campaign_coordinates?.lat || 0;
  const lng = branch.coordinates?.lng || branch.longitude || campaign.campaign_coordinates?.lng || 0;
  const radius = campaign.campaign_radius || 1500;

  let geoTargetId: number | undefined;
  let geoTargetCoordinatesId: number | undefined;

  if (lat && lng) {
    const geoResp = await retryWithBackoff(() =>
      bidTheatreApi.post(`/${networkId}/geo-target`, {
        name: `${branch.address || branchName}, ${branchCity}`,
      }, {
        headers: { Authorization: `Bearer ${btToken}` },
      })
    );
    geoTargetId = geoResp.data.geoTarget.id;

    const coordResp = await retryWithBackoff(() =>
      bidTheatreApi.post(`/${networkId}/geo-target/${geoTargetId}/geo-target-coordinate`, {
        latitude: lat,
        longitude: lng,
        radius: metersToKm(radius),
      }, {
        headers: { Authorization: `Bearer ${btToken}` },
      })
    );
    geoTargetCoordinatesId = coordResp.data.geoTargetCoordinate.id;
    console.log(`Created geo-target ${geoTargetId} at ${lat},${lng} r=${metersToKm(radius)}km`);
  }

  // 10. Create bid strategies from templates
  const bidStrategyTemplates = await getBidStrategyTemplates(channelType);
  const bidStrategyIds: number[] = [];

  for (const template of bidStrategyTemplates) {
    const adGroupId = channelType === 'DISPLAY'
      ? adGroupIds[template.adgroup_name || 'Large desktop sizes']
      : adGroupIds['Default campaign'];

    if (!adGroupId) {
      console.warn(`No ad group found for strategy "${template.name}", skipping`);
      continue;
    }

    try {
      const stratResp = await retryWithBackoff(() =>
        bidTheatreApi.post(`/${networkId}/campaign-target/${btCampaignId}/bid-strategy`, {
          rtbSitelist: template.rtb_sitelist,
          adgroup: adGroupId,
          maxCPM: template.max_cpm,
          geoTarget: geoTargetId || null,
          name: template.name,
          paused: template.paused,
          filterTarget: template.filterTarget || null,
        }, {
          headers: { Authorization: `Bearer ${btToken}` },
        })
      );
      bidStrategyIds.push(stratResp.data?.bidStrategy?.id || 0);
      console.log(`Created bid strategy "${template.name}"`);
    } catch (err: any) {
      console.error(`Bid strategy "${template.name}" failed: ${err.message}`);
    }
  }

  // 11. Save to bidtheatre_campaigns table
  const { error: insertError } = await supabase
    .from('bidtheatre_campaigns')
    .insert({
      campaign_id: campaign.id,
      branch_id: branch.id,
      channel: channelType,
      bt_campaign_id: btCampaignId,
      bt_advertiser_id: advertiserId,
      geo_target_id: geoTargetId || null,
      geo_target_coordinates_id: geoTargetCoordinatesId || null,
      latitude: lat || null,
      longitude: lng || null,
      radius,
      ad_group_ids: adGroupIds,
      ad_ids: adIds,
      bid_strategy_ids: bidStrategyIds,
      cycle_id: cycleId || null,
      budget: budgetPerBranch,
      is_ongoing: isOngoing,
      status: 'active',
    });

  if (insertError) {
    console.error(`Failed to save BT metadata: ${insertError.message}`);
  }

  return { btCampaignId, branchId: branch.id, channel: channelType, adGroupIds, adIds, geoTargetId };
}

// ============================================================================
// MAIN ORCHESTRATOR
// ============================================================================

async function createBidTheatreCampaign(campaign: any) {
  console.log(`Starting BidTheatre campaign creation for ${campaign.id}`);

  const btToken = await getBidTheatreToken();
  const credentials = await getBidTheatreCredentials();
  const networkId = credentials.network_id;
  const advertiserId = credentials.advertiser_id || 22717;

  // Determine active channels
  const channels: ChannelDef[] = [];
  if (campaign.channel_display) channels.push({ channel: 'DISPLAY' });
  if (campaign.channel_pdooh) channels.push({ channel: 'PDOOH' });

  if (channels.length === 0) {
    return { success: true, message: 'No BidTheatre channels selected' };
  }

  // Fetch branches for this campaign
  const branchIds: string[] = campaign.branch_ids || (campaign.branch_id ? [campaign.branch_id] : []);
  if (branchIds.length === 0) {
    return { success: false, error: 'No branches specified for campaign' };
  }

  const { data: branches, error: branchError } = await supabase
    .from('branches')
    .select('*')
    .in('id', branchIds);

  if (branchError || !branches || branches.length === 0) {
    return { success: false, error: `Failed to fetch branches: ${branchError?.message || 'No branches found'}` };
  }

  console.log(`Processing ${branches.length} branches × ${channels.length} channels`);

  const results: any[] = [];
  const btCampaignIds: Record<string, number[]> = { DISPLAY: [], PDOOH: [] };
  let overallSuccess = true;
  let overallErrors = '';

  // Create one BT campaign per branch × channel
  for (const branch of branches) {
    for (const channelDef of channels) {
      try {
        const result = await createBtCampaignForBranch(
          campaign, branch, channelDef, btToken, networkId, advertiserId
        );
        results.push(result);
        btCampaignIds[channelDef.channel].push(result.btCampaignId);
        console.log(`✓ ${branch.name} / ${channelDef.channel} → BT #${result.btCampaignId}`);
      } catch (err: any) {
        overallSuccess = false;
        overallErrors += `${branch.name} / ${channelDef.channel}: ${err.message}\n`;
        console.error(`✗ ${branch.name} / ${channelDef.channel}: ${err.message}`);
      }
    }
  }

  // Update dental_campaigns with sync status and first BT IDs (backward compat)
  const updatePayload: Record<string, any> = {
    bt_sync_status: overallSuccess ? 'synced' : 'failed',
    bt_last_sync: new Date().toISOString(),
  };
  if (btCampaignIds.DISPLAY.length > 0) {
    updatePayload.bt_campaign_id_display = btCampaignIds.DISPLAY[0];
  }
  if (btCampaignIds.PDOOH.length > 0) {
    updatePayload.bt_campaign_id_pdooh = btCampaignIds.PDOOH[0];
  }
  if (overallErrors) {
    updatePayload.bt_sync_error = overallErrors.substring(0, 500);
  }

  await supabase.from('dental_campaigns').update(updatePayload).eq('id', campaign.id);

  if (overallSuccess) {
    await supabase.from('dental_campaigns').update({ status: 'active' }).eq('id', campaign.id);
  }

  return { success: overallSuccess, results, btCampaignIds, error: overallErrors || undefined };
}

// ============================================================================
// NETLIFY HANDLER
// ============================================================================

export async function handler(event: any) {
  console.log(`createBidTheatreCampaign-background started at ${new Date().toISOString()}`);

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  let campaign: any;
  try {
    campaign = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON payload' }) };
  }

  if (!campaign.id) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Missing campaign.id' }) };
  }

  try {
    const result = await createBidTheatreCampaign(campaign);
    console.log(`Campaign ${campaign.id} processed:`, JSON.stringify(result));

    await supabase.from('activity_logs').insert({
      action: 'bidtheatre_campaign_created',
      entity_type: 'campaign',
      entity_id: campaign.id,
      details: `Created ${result.results?.length || 0} BT campaigns (success: ${result.success})`,
      user_id: campaign.created_by || 'system',
    });

    return { statusCode: result.success ? 200 : 500, body: JSON.stringify(result) };
  } catch (error: any) {
    console.error('Fatal error in createBidTheatreCampaign:', error);

    await supabase.from('dental_campaigns').update({
      bt_sync_status: 'failed',
      bt_sync_error: error.message,
      status: 'draft',
    }).eq('id', campaign.id);

    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
}