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
  '300x300': { width: 300, height: 300, dimension: 22 },
  '300x431': { width: 300, height: 431, dimension: 697 },
  '300x600': { width: 300, height: 600, dimension: 11 },
  '620x891': { width: 620, height: 891, dimension: 1888 },
  '980x400': { width: 980, height: 400, dimension: 15 },
  '1080x1920': { width: 1080, height: 1920, dimension: 385 },
  '2160x3840': { width: 2160, height: 3840, dimension: 6286 },
};

// Ad group definitions per channel
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
 * Get next sequential BT campaign number by counting distinct dental campaign IDs
 * that already have BT campaigns.
 */
async function getNextCampaignNumber(): Promise<number> {
  const { data } = await supabase
    .from('bidtheatre_campaigns')
    .select('campaign_id');
  const uniqueIds = new Set((data || []).map((r: any) => r.campaign_id));
  return uniqueIds.size + 1;
}

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
 * e.g. 'yleinen-brandiviesti' → 'yleinen', 'hammastarkastus' → 'hammastarkastus'
 */
function getServiceSlug(codeOrName: string): string {
  if (!codeOrName) return 'yleinen';
  const lower = codeOrName.toLowerCase().trim();
  if (lower.startsWith('yleinen')) return 'yleinen';
  return lower.replace(/\s+/g, '_');
}

/**
 * Build Piwik + UTM query parameters for BidTheatre landing URLs.
 * Mirrors both pk_* (Piwik) and utm_* (GA) parameters.
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
 * Tries service_name, then parses creative name pattern "Branch - Service - WxH".
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

// BidTheatre audience IDs mapped from campaign age targeting
const AUDIENCE_MAP: Record<string, number> = {
  '18-35': 145429,  // Suun TT - 18-35 years old
  '18-64': 145431,  // Suun TT - 18-64 years old
  '25-64': 145430,  // Suun TT - 25-64 years old
  '40+':   145433,  // Suun TT - 40 or older
};

/**
 * Map campaign age range (target_age_min, target_age_max) to the best-fit BT audience ID.
 */
function mapAgeRangeToAudience(minAge: number, maxAge: number): number | null {
  if (minAge <= 18 && maxAge <= 35) return AUDIENCE_MAP['18-35'];
  if (minAge <= 18 && maxAge <= 64) return AUDIENCE_MAP['18-64'];
  if (minAge >= 25 && maxAge <= 64) return AUDIENCE_MAP['25-64'];
  if (minAge >= 40) return AUDIENCE_MAP['40+'];
  // Default fallback: 18-64
  return AUDIENCE_MAP['18-64'];
}

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

  const authData = response.data?.auth;
  const token = authData?.token;
  if (!token) throw new Error('Invalid BidTheatre authentication response');
  console.log('BidTheatre authenticated successfully. Auth:', JSON.stringify({
    role: authData?.role,
    defaultNetwork: authData?.defaultNetwork,
    fullName: authData?.fullName,
    email: authData?.email,
    tokenPrefix: token?.substring(0, 8),
  }));
  return token;
}

async function retryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 5, baseDelay = 2000): Promise<T> {
  let lastError: Error | undefined;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      if (axios.isAxiosError(error) && error.response?.status === 429 && attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1); // 2s, 4s, 8s, 16s, 32s
        console.log(`Rate limited (429), retry ${attempt}/${maxRetries} in ${delay}ms`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  throw lastError;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

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

/**
 * Get or create a reusable geo-target for a branch.
 * Checks `branches.bt_geo_target_id` first; if not set, creates one in BT and saves the ID.
 */
async function getOrCreateGeoTarget(
  branch: any,
  radiusKm: number,
  btToken: string,
  networkId: string
): Promise<{ geoTargetId: number; geoTargetCoordinatesId: number }> {
  const lat = branch.coordinates?.lat || branch.latitude || 0;
  const lng = branch.coordinates?.lng || branch.longitude || 0;
  const branchName = branch.short_name || branch.name || 'Branch';
  const branchCity = branch.city || '';

  // Check if branch already has a geo-target in BT
  if (branch.bt_geo_target_id) {
    // Geo-target exists — create a new coordinate entry for this radius
    const coordResp = await retryWithBackoff(() =>
      bidTheatreApi.post(`/${networkId}/geo-target/${branch.bt_geo_target_id}/geo-target-coordinate`, {
        latitude: lat,
        longitude: lng,
        radius: radiusKm,
      }, {
        headers: { Authorization: `Bearer ${btToken}` },
      })
    );
    return {
      geoTargetId: branch.bt_geo_target_id,
      geoTargetCoordinatesId: coordResp.data.geoTargetCoordinate.id,
    };
  }

  // Create new geo-target
  const geoResp = await retryWithBackoff(() =>
    bidTheatreApi.post(`/${networkId}/geo-target`, {
      name: `ST / ${branchName}, ${branchCity}`,
    }, {
      headers: { Authorization: `Bearer ${btToken}` },
    })
  );
  const geoTargetId = geoResp.data.geoTarget.id;

  const coordResp = await retryWithBackoff(() =>
    bidTheatreApi.post(`/${networkId}/geo-target/${geoTargetId}/geo-target-coordinate`, {
      latitude: lat,
      longitude: lng,
      radius: radiusKm,
    }, {
      headers: { Authorization: `Bearer ${btToken}` },
    })
  );

  // Save geo-target ID back to branch for reuse
  await supabase
    .from('branches')
    .update({ bt_geo_target_id: geoTargetId })
    .eq('id', branch.id);

  console.log(`Created reusable geo-target ${geoTargetId} for ${branchName} at ${lat},${lng} r=${radiusKm}km`);

  return {
    geoTargetId,
    geoTargetCoordinatesId: coordResp.data.geoTargetCoordinate.id,
  };
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

  // Nationwide with address: match by bundle name (e.g., "Helsinki") or branch label
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

/**
 * Inject clickTag into HTML creative for BidTheatre click tracking.
 * BidTheatre replaces {clickurl} at serve-time with its tracking redirect URL.
 * 
 * Strategy:
 * 1. If HTML already has a clickTag variable (var clickTag = ...), replace its value
 * 2. If HTML has {{clickTag}} placeholder, replace it
 * 3. Otherwise, inject a clickTag script in the <head> and wrap the body content in a clickable link
 */
function injectClickTag(html: string, landingUrl: string): string {
  const clickTagValue = `{clickurl}${encodeURIComponent(landingUrl)}`;

  // Case 1: Already has clickTag variable declaration
  if (/var\s+clickTag\s*=/.test(html)) {
    return html.replace(
      /var\s+clickTag\s*=\s*['"][^'"]*['"]/,
      `var clickTag = "${clickTagValue}"`
    );
  }

  // Case 2: Has {{clickTag}} placeholder
  if (html.includes('{{clickTag}}')) {
    return html.replace(/\{\{clickTag\}\}/g, clickTagValue);
  }

  // Case 3: Inject clickTag script into head
  const clickTagScript = `<script>var clickTag = "${clickTagValue}";</script>`;

  if (html.includes('</head>')) {
    html = html.replace('</head>', `${clickTagScript}\n</head>`);
  } else if (html.includes('<body')) {
    html = html.replace('<body', `${clickTagScript}\n<body`);
  } else {
    // No head or body tag — prepend
    html = clickTagScript + '\n' + html;
  }

  return html;
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

/**
 * Build a lightweight HTML wrapper that displays a static JPG image.
 * Used for PDOOH creatives where a pre-rendered JPG is available.
 * The image loads instantly (no iframe/JS overhead) and renders identically
 * to the HTML creative but as a static image.
 */
function buildImageWrapper(jpgUrl: string, width: number, height: number, landingUrl: string): string {
  const clickTagValue = `{clickurl}${encodeURIComponent(landingUrl)}`;
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">
<script>var clickTag="${clickTagValue}";</script>
<style>*{margin:0;padding:0;overflow:hidden}body{width:${width}px;height:${height}px;position:relative}</style>
</head><body>
<img src="${jpgUrl}" width="${width}" height="${height}" style="display:block" alt="">
<a href="javascript:void(window.open(clickTag))" style="position:absolute;top:0;left:0;width:${width}px;height:${height}px;z-index:9999;display:block;cursor:pointer"></a>
</body></html>`;
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
  advertiserId: number,
  seqNumber: number,
  serviceSlug: string
) {
  const channelType = channelDef.channel;
  const adGroups = channelType === 'DISPLAY' ? DISPLAY_AD_GROUPS : PDOOH_AD_GROUPS;
  const branchName = branch.short_name || branch.name || 'Branch';
  const branchCity = branch.city || campaign.campaign_city || '';

  console.log(`Creating BT campaign: ${branchName} / ${channelType}`);

  // 1. Create BT campaign
  // KPI: 1=Clicks (traffic objective), 3=Viewability (reach objective)
  const campaignKPI = campaign.campaign_objective === 'reach' ? 3 : 1;

  // Audience: map age range to BT audience ID (DISPLAY only, not PDOOH)
  const audienceId = channelType === 'DISPLAY'
    ? mapAgeRangeToAudience(campaign.target_age_min || 18, campaign.target_age_max || 64)
    : null;

  // Filter targets: Suun TT Display=66781, PDOOH uses campaign default
  const defaultFilterTarget = channelType === 'DISPLAY' ? 66781 : null;

  // Optimization strategy: DISPLAY uses viewability optimization, PDOOH has none
  const defaultOptStrategy = channelType === 'DISPLAY' ? 538 : null;

  // Campaign naming: NØRR3_SUUNTT_B2C_{seqNum}_SAVELA_K_{CHANNEL}_{campaignName}
  const campaignName = (campaign.name || '').toUpperCase().replace(/\s+/g, '_');
  const btCampaignName = `NØRR3_SUUNTT_B2C_${seqNumber}_SAVELA_K_${channelType}_${campaignName}`;

  // Landing URL with UTM parameters
  const baseLandingUrl = campaign.landing_url || 'https://terveystalo.com/suunterveystalo';
  const channelLower = channelType.toLowerCase() as 'display' | 'pdooh';
  const targetURLWithUtm = buildLandingUrlWithUtm(baseLandingUrl, channelLower, serviceSlug);

  const campaignPayload: Record<string, any> = {
    name: btCampaignName,
    advertiser: advertiserId,
    campaignManager: 'janne.savela@norr3.fi',
    campaignKPI,
    targetURL: targetURLWithUtm,
    defaultGeoTarget: null,
    defaultLineItem: 306116, // 0% Margin / At cost
    deliveryPriority: 'even',
    defaultFilterTarget: defaultFilterTarget,
    allowWideTargeting: false,
    renderOBA: false,
    takeScreenshots: true,
  };

  // Only set optimization strategy if defined (PDOOH has none)
  if (defaultOptStrategy) {
    campaignPayload.defaultOptimizationStrategy = defaultOptStrategy;
  }

  // Set audience for DISPLAY campaigns
  if (audienceId) {
    campaignPayload.defaultAudience = audienceId;
  }

  console.log(`BT campaign POST /${networkId}/campaign payload:`, JSON.stringify(campaignPayload));
  console.log(`BT token prefix: ${btToken?.substring(0, 8)}, networkId: ${networkId}`);

  const campaignResp = await retryWithBackoff(() =>
    bidTheatreApi.post(`/${networkId}/campaign`, campaignPayload, {
      headers: { Authorization: `Bearer ${btToken}` },
    })
  );
  const btCampaignId = campaignResp.data.campaign.id;
  console.log(`Created BT campaign ${btCampaignId} for ${branchName} / ${channelType} (KPI=${campaignKPI}, audience=${audienceId})`);

  // 2. Set category (158 = Health & Fitness - Dental Care)
  try {
    await retryWithBackoff(() =>
      bidTheatreApi.post(`/${networkId}/campaign/${btCampaignId}/category`, { category: 158 }, {
        headers: { Authorization: `Bearer ${btToken}` },
      })
    );
  } catch (catErr: any) {
    const body = catErr.response?.data ? JSON.stringify(catErr.response.data) : '';
    throw new Error(`Step 2 (category) failed for campaign ${btCampaignId}: ${catErr.message}${body ? ` | ${body}` : ''}`);
  }

  // 3. Calculate budget per branch — use per-branch allocations if available, else equal split
  const rawBcb = campaign.branch_channel_budgets;
  const branchChannelBudgets: Record<string, { meta: number; display: number; pdooh: number; audio: number }> | null =
    typeof rawBcb === 'string' ? JSON.parse(rawBcb) : rawBcb || null;
  let budgetPerBranch: number;
  if (branchChannelBudgets && branchChannelBudgets[branch.id]) {
    const bb = branchChannelBudgets[branch.id];
    budgetPerBranch = channelType === 'DISPLAY' ? (bb.display || 0) : (bb.pdooh || 0);
  } else {
    const totalChannelBudget = channelType === 'DISPLAY'
      ? (campaign.budget_display || 0)
      : (campaign.budget_pdooh || 0);
    const rawIds = campaign.branch_ids || (campaign.branch_id ? [campaign.branch_id] : []);
    const branchIds: string[] = typeof rawIds === 'string' ? JSON.parse(rawIds) : rawIds;
    budgetPerBranch = totalChannelBudget / Math.max(branchIds.length, 1);
  }

  if (budgetPerBranch <= 0) {
    throw new Error(`Invalid budget for ${channelType}: ${budgetPerBranch} (branch: ${branch.id})`);
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

  let cycleId: number | undefined;
  try {
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
    cycleId = cycleResp.data?.cycle?.id;
  } catch (cycleErr: any) {
    const body = cycleErr.response?.data ? JSON.stringify(cycleErr.response.data) : '';
    throw new Error(`Step 4 (cycle) failed for campaign ${btCampaignId}: ${cycleErr.message}${body ? ` | ${body}` : ''} | budget=${budgetPerBranch}, start=${startDate}, end=${endDate}`);
  }

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
    branchName,
    campaign.nationwide_address_mode
  );
  console.log(`Found ${creatives.length} creatives for ${branchName} / ${channelType}`);

  // 7. Create HTML ads from creatives (deduplicate across ad groups sharing sizes)
  const baseLanding = campaign.landing_url || 'https://terveystalo.com/suunterveystalo';
  const createdAdsByCreativeSize: Record<string, number> = {}; // "creativeId::size" → HTML adId

  for (const group of adGroups) {
    for (const size of group.sizes) {
      const config = AD_DIMENSIONS[size];
      if (!config) continue;

      // Find matching creatives by size
      const sizeCreatives = creatives.filter(c =>
        c.size === size || (c.width === config.width && c.height === config.height)
      );

      for (const creative of sizeCreatives) {
        // Check if this creative+size was already uploaded (e.g. 300x600 in both Desktop and Mobile)
        const dedupKey = `${creative.id}::${size}`;
        if (createdAdsByCreativeSize[dedupKey]) {
          adIds[group.name].push(createdAdsByCreativeSize[dedupKey]);
          console.log(`Reused ads for ${size} (${creative.name}) in "${group.name}"`);
          continue;
        }

        // Get the public URL for the hosted creative HTML
        const creativeUrl = creative.image_url || creative.preview_url;

        if (!creativeUrl) {
          console.warn(`No URL for creative ${creative.id} (${creative.name}), skipping`);
          continue;
        }

        // Build per-creative landing URL with service-specific UTM parameters
        const creativeServiceSlug = getCreativeServiceSlug(creative, serviceSlug);
        const landingUrl = buildLandingUrlWithUtm(baseLanding, channelLower, creativeServiceSlug);

        try {
          let adResp;

          if (creative.jpg_url && channelType === 'PDOOH') {
            // --- PDOOH: send pre-rendered JPG as Image banner ---
            const jpgResponse = await axios.get(creative.jpg_url, { responseType: 'arraybuffer', timeout: 30000 });
            const jpgBase64 = Buffer.from(jpgResponse.data).toString('base64');
            console.log(`Sending Image banner for ${creative.name} (${jpgResponse.data.byteLength} bytes)`);

            adResp = await retryWithBackoff(() =>
              bidTheatreApi.post(`/${networkId}/ad`, {
                campaign: btCampaignId,
                name: creative.name || `${branchName} - ${size}`,
                adType: 'Image banner',
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
          } else {
            // --- HTML banner ad (uses lightweight iframe wrapper) ---
            const wrapperHtml = buildIframeWrapper(creativeUrl, config.width, config.height, landingUrl);
            console.log(`Built iframe wrapper for ${creative.name} (${wrapperHtml.length} bytes, URL: ${creativeUrl})`);

            adResp = await retryWithBackoff(() =>
              bidTheatreApi.post(`/${networkId}/ad`, {
                campaign: btCampaignId,
                name: creative.name || `${branchName} - ${size}`,
                adType: 'HTML banner',
                adStatus: 'Active',
                html: wrapperHtml,
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
          }

          const adId = adResp.data.ad.id;
          adIds[group.name].push(adId);
          createdAdsByCreativeSize[dedupKey] = adId;
          console.log(`Created ad ${adId} for ${size} (${creative.name})`);
          await sleep(300);
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

  // 9. Set geo-targeting using branch coordinates (reusable per branch)
  const lat = branch.coordinates?.lat || branch.latitude || campaign.campaign_coordinates?.lat || 0;
  const lng = branch.coordinates?.lng || branch.longitude || campaign.campaign_coordinates?.lng || 0;

  // Per-branch radius: from branch_radius_settings (km), fall back to campaign_radius (already in km)
  const rawRadiusSettings = campaign.branch_radius_settings || {};
  const branchRadiusSettings = typeof rawRadiusSettings === 'string' ? JSON.parse(rawRadiusSettings) : rawRadiusSettings;
  const branchRadiusSetting = branchRadiusSettings[branch.id];
  const radiusKm = branchRadiusSetting?.radius
    || campaign.campaign_radius
    || 10;

  let geoTargetId: number | undefined;
  let geoTargetCoordinatesId: number | undefined;

  if (lat && lng) {
    const geoResult = await getOrCreateGeoTarget(branch, radiusKm, btToken, networkId);
    geoTargetId = geoResult.geoTargetId;
    geoTargetCoordinatesId = geoResult.geoTargetCoordinatesId;
  }

  // 10. Create bid strategies from templates
  const bidStrategyTemplates = await getBidStrategyTemplates(channelType);
  const bidStrategyIds: number[] = [];

  for (const template of bidStrategyTemplates) {
    // Map bid strategy to ad group:
    // DISPLAY: adgroup_name from template (e.g. 'Desktop sizes', 'Mobile sizes')
    // PDOOH: '2160x3840' group for Outshine strategies, 'Default campaign' for all others
    let adGroupId: number | undefined;
    if (channelType === 'DISPLAY') {
      adGroupId = adGroupIds[template.adgroup_name || 'Desktop sizes'];
    } else {
      // For PDOOH, check if strategy name contains 'Outshine' → use 2160x3840 ad group
      const isOutshine = (template.name || '').toLowerCase().includes('outshine');
      adGroupId = isOutshine
        ? adGroupIds['2160x3840'] || adGroupIds['Default campaign']
        : adGroupIds['Default campaign'];
    }

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
      radius: radiusKm * 1000,
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
  const advertiserId = credentials.advertiser_id || 24674; // Suun Terveystalo
  console.log(`BT config: networkId=${networkId}, advertiserId=${advertiserId}, hasAdvertiserIdInDB=${!!credentials.advertiser_id}, tokenPrefix=${btToken?.substring(0, 8)}`);

  // Quick diagnostic: try a simple GET to verify token works for this network
  try {
    const diagResp = await bidTheatreApi.get(`/${networkId}/advertiser/${advertiserId}`, {
      headers: { Authorization: `Bearer ${btToken}` },
    });
    console.log(`BT diagnostic: GET advertiser ${advertiserId} OK - name: ${diagResp.data?.advertiser?.name}`);
  } catch (diagErr: any) {
    console.error(`BT diagnostic: GET advertiser FAILED - ${diagErr.response?.status} ${JSON.stringify(diagErr.response?.data)}`);
  }

  // Determine active channels
  const channels: ChannelDef[] = [];
  if (campaign.channel_display) channels.push({ channel: 'DISPLAY' });
  if (campaign.channel_pdooh) channels.push({ channel: 'PDOOH' });

  if (channels.length === 0) {
    return { success: true, message: 'No BidTheatre channels selected' };
  }

  // Fetch branches for this campaign (branch_ids may be a JSON string from DB)
  const rawBranchIds = campaign.branch_ids || (campaign.branch_id ? [campaign.branch_id] : []);
  const branchIds: string[] = typeof rawBranchIds === 'string' ? JSON.parse(rawBranchIds) : rawBranchIds;
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

  // Fetch primary service code for UTM parameters
  const serviceCode = await fetchPrimaryServiceCode(campaign.service_id);
  const serviceSlug = getServiceSlug(serviceCode);
  console.log(`Primary service: ${serviceCode} → slug: ${serviceSlug}`);

  // Get sequential campaign number for naming convention
  const seqNumber = await getNextCampaignNumber();
  console.log(`Sequential campaign number: ${seqNumber}`);

  const results: any[] = [];
  const btCampaignIds: Record<string, number[]> = { DISPLAY: [], PDOOH: [] };
  let overallSuccess = true;
  let overallErrors = '';

  // Create one BT campaign per branch × channel
  for (const branch of branches) {
    for (const channelDef of channels) {
      try {
        const result = await createBtCampaignForBranch(
          campaign, branch, channelDef, btToken, networkId, advertiserId, seqNumber, serviceSlug
        );
        results.push(result);
        btCampaignIds[channelDef.channel].push(result.btCampaignId);
        console.log(`✓ ${branch.name} / ${channelDef.channel} → BT #${result.btCampaignId}`);
      } catch (err: any) {
        overallSuccess = false;
        const errBody = err.response?.data ? JSON.stringify(err.response.data) : '';
        const errDetail = errBody ? `${err.message} | BT response: ${errBody}` : err.message;
        overallErrors += `${branch.name} / ${channelDef.channel}: ${errDetail}\n`;
        console.error(`✗ ${branch.name} / ${channelDef.channel}: ${errDetail}`);
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