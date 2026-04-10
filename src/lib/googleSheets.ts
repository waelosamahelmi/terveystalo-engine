import axios from 'axios';
import { Campaign, CampaignApartment, Apartment, DentalCampaign, CampaignStatus, Branch, Service } from '../types';
import { parseISO, format } from 'date-fns';
import { supabase } from './supabase';
import type { AdVersionUrls } from './campaignService';
import { getConjugatedCity, findMatchingBundle, getBundleForBranch } from './metaTemplateVariables';

// Google Sheets API endpoint
const SHEETS_API_ENDPOINT = 'https://sheets.googleapis.com/v4/spreadsheets';
const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID || '1c2nbTb3nwwoO3bzQWcxI32F7WiFQ4PgPk16aUF8-Fdk'; // Default to Suun Terveystalo feed sheet
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = import.meta.env.VITE_GOOGLE_REFRESH_TOKEN;

// Sheet name for Suun Terveystalo feed
const SHEET_NAME = 'FEED';

// Extended column range (A:CH = 86 columns for all fields including meta status/URLs, per-size creative URLs, offer columns, and smartly_id)
const SHEET_RANGE = `${SHEET_NAME}!A:CH`;
const COLUMN_COUNT = 86;

// ============================================================================
// SHEET SYNC TRACKING — update sheet_row_id & sheet_last_sync in DB
// ============================================================================

async function updateSheetSyncTracking(campaignId: string, sheetRowId?: string): Promise<void> {
  try {
    const updates: Record<string, unknown> = {
      sheet_last_sync: new Date().toISOString(),
    };
    if (sheetRowId) {
      updates.sheet_row_id = sheetRowId;
    }
    await supabase
      .from('dental_campaigns')
      .update(updates)
      .eq('id', campaignId);
  } catch (e) {
    console.error('Failed to update sheet sync tracking:', e);
  }
}

// Function to get a new access token using the refresh token
export async function getAccessToken() {
  try {
    // Check if all required credentials are present
    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
      console.debug('Google Sheets sync disabled - missing credentials');
      return null;
    }

    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    if (!response.data.access_token) {
      console.warn('No access token received from Google OAuth');
      return null;
    }
    
    return response.data.access_token;
  } catch (error) {
    // Handle specific error cases
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        console.debug('Google Sheets sync disabled - invalid or expired credentials');
      } else {
        console.error('Error refreshing Google access token:', error.message);
      }
    } else {
      console.error('Unexpected error getting access token:', error);
    }
    return null;
  }
}

// Function to find existing campaign rows in the sheet
export async function findCampaignRows(campaignId: string) {
  try {
    const accessToken = await getAccessToken();
    
    // If no access token, cannot proceed
    if (!accessToken) {
      console.debug('Google Sheets sync skipped - no access token');
      return [];
    }
    
    // Get all values from the sheet
    const response = await axios.get(
      `${SHEETS_API_ENDPOINT}/${SHEET_ID}/values/${SHEET_RANGE}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    const rows = response.data.values || [];
    const campaignRows = [];
    
    // Find rows with matching campaign ID (assuming campaign ID is in column A)
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === campaignId) {
        campaignRows.push({
          rowIndex: i + 1, // 1-based index for the API
          data: rows[i],
        });
      }
    }
    
    return campaignRows;
  } catch (error) {
    console.error('Error finding campaign rows:', error);
    return [];
  }
}

// Function to add campaign data to Google Sheet
export async function addCampaignToSheet(
  campaign: Campaign, 
  campaignApartments: CampaignApartment[],
  apartments: Apartment[]
) {
  try {
    const accessToken = await getAccessToken();
    
    // If no access token, cannot proceed but don't cause campaign creation to fail
    if (!accessToken) {
      console.debug('Google Sheets sync skipped - no access token');
      return true; // Return true to indicate the campaign was created successfully even if sheet sync failed
    }
    
    // Prepare rows for each apartment in the campaign
    const rows = campaignApartments.map(ca => {
      const apt = apartments.find(a => a.key === ca.apartment_key);
      
      // Format dates as dd/mm/yyyy
      let startDate = '';
      let endDate = campaign.campaign_end_date || 'Ongoing';
      
      try {
        if (campaign.campaign_start_date) {
          const parsedStart = parseISO(campaign.campaign_start_date);
          startDate = format(parsedStart, 'dd/MM/yyyy');
        }
      } catch (error) {
        // If parsing fails, try parsing as dd/MM/yyyy
        try {
          const [day, month, year] = campaign.campaign_start_date.split('/');
          const parsedStart = parseISO(`${year}-${month}-${day}`);
          startDate = format(parsedStart, 'dd/MM/yyyy');
        } catch (innerError) {
          console.error(`Failed to parse start date for campaign ${campaign.id}:`, innerError);
          startDate = campaign.campaign_start_date; // Fallback to raw value
        }
      }

      if (campaign.campaign_end_date && campaign.campaign_end_date.toUpperCase() !== 'ONGOING') {
        try {
          const parsedEnd = parseISO(campaign.campaign_end_date);
          endDate = format(parsedEnd, 'dd/MM/yyyy');
        } catch (error) {
          // If parsing fails, try parsing as dd/MM/yyyy
          try {
            const [day, month, year] = campaign.campaign_end_date.split('/');
            const parsedEnd = parseISO(`${year}-${month}-${day}`);
            endDate = format(parsedEnd, 'dd/MM/yyyy');
          } catch (innerError) {
            console.error(`Failed to parse end date for campaign ${campaign.id}:`, innerError);
            endDate = campaign.campaign_end_date; // Fallback to raw value
          }
        }
      }

      // Ensure all values are strings or numbers to prevent serialization issues
      return [
        campaign.id, // campaign_id
        campaign.partner_id, // partner_id
        campaign.partner_name, // partner_name
        campaign.agency_id, // agency_id
        campaign.agent_key, // agent_key
        ca.apartment_key, // key
        `https://www.kiinteistomaailma.fi/${ca.apartment_key}`, // url - always include the URL
        campaign.campaign_address, // campaign_address
        campaign.campaign_postal_code, // campaign_postal_code
        campaign.campaign_city, // campaign_city
        campaign.campaign_radius.toString(), // campaign_radius
        campaign.channel_meta ? 'Yes' : 'No', // channel_meta
        campaign.channel_display ? 'Yes' : 'No', // channel_display
        campaign.channel_pdooh ? 'Yes' : 'No', // channel_pdooh
        campaign.budget_meta.toString(), // budget_meta
        campaign.budget_meta_daily.toString(), // budget_meta_daily
        campaign.budget_display.toString(), // budget_display
        campaign.budget_display_daily.toString(), // budget_display_daily
        campaign.budget_pdooh.toString(), // budget_pdooh
        campaign.budget_pdooh_daily.toString(), // budget_pdooh_daily
        startDate, // campaign_start_date (formatted as dd/mm/yyyy)
        endDate, // campaign_end_date (formatted as dd/mm/yyyy or 'Ongoing')
        campaign.active ? 'Active' : 'Paused', // active
      ];
    });
    
    if (rows.length === 0) {
      console.debug('No apartment rows to add to sheet for campaign:', campaign.id);
      return true; // Still return true even if there are no rows to add
    }
    
    // Append rows to the sheet
    await axios.post(
      `${SHEETS_API_ENDPOINT}/${SHEET_ID}/values/${SHEET_NAME}!A:W:append?valueInputOption=USER_ENTERED`,
      {
        values: rows,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log(`Successfully added ${rows.length} rows to Google Sheet for campaign ${campaign.id}`);
    return true;
  } catch (error) {
    console.error('Error adding campaign to sheet:', error instanceof Error ? error.message : 'Unknown error');
    // Don't throw, just return false to indicate failure
    return false;
  }
}

// Helper: safely format an ISO date string to DD-MM-YYYY
function safeFormatDate(raw?: string | null): string {
  if (!raw) return '';
  if (raw.toUpperCase() === 'ONGOING') return 'Ongoing';
  try {
    return format(parseISO(raw), 'dd-MM-yyyy');
  } catch {
    return raw;
  }
}

// Helper: pad postal code to 5 digits with leading zeros
function formatPostalCode(postalCode?: string | null): string {
  if (!postalCode) return '';
  const cleaned = postalCode.replace(/\D/g, '');
  return cleaned.padStart(5, '0');
}

// Helper: format address for Smartly feed — "Streetname X, City, Finland /radius/kilometer"
function formatSmartlyAddress(address?: string, city?: string, radius?: number): string {
  if (!address) return '';
  const cityPart = city || '';
  const r = radius || 10;
  return `${address}, ${cityPart}, Finland /${r}/kilometer`;
}

// Helper: format address for creative — "Streetname X, City"
function formatCreativeAddress(address?: string, city?: string): string {
  if (!address) return '';
  return city ? `${address}, ${city}` : address;
}

// Helper: format excluded branches for Smartly feed
function formatExcludedBranches(branches: Array<{ address: string; city: string }>, radius: number): string {
  return branches
    .map(b => `${b.address}, ${b.city}, Finland /${radius}/kilometer`)
    .join('; ');
}

// Helper: format gender for sheet (Male / Female / all)
function formatGender(genders?: string[]): string {
  if (!genders || genders.length === 0) return 'all';
  if (genders.includes('all')) return 'all';
  return genders.map(g => {
    if (g === 'male') return 'Male';
    if (g === 'female') return 'Female';
    return g;
  }).join(', ');
}

// Helper: strip leading characters that Google Sheets would interpret as formulas (+, -, =, @)
function sheetSafe(val: string): string {
  if (val) return val.replace(/^[+=\-@]+/, '');
  return val;
}

/**
 * Build Piwik + UTM query string for display landing URLs.
 * Maps service code to funnel stage: yleinen→tietoisuus, specific services→harkinta.
 */
function buildDisplayUtmParams(serviceCode: string): string {
  const slug = (!serviceCode || serviceCode.toLowerCase().startsWith('yleinen'))
    ? 'yleinen'
    : serviceCode.toLowerCase().replace(/\s+/g, '_');
  const year = new Date().getFullYear();
  const funnel = slug === 'yleinen' ? 'tietoisuus' : 'harkinta';
  const campaignName = `B2C_taktinen_kampanja_${funnel}_dental_kr2_prospektoiva_marketing-engine_${year}`;
  const content = `banneri_${slug}`;
  return [
    `pk_campaign=${campaignName}`, `pk_source=rtb`, `pk_medium=display`, `pk_content=${content}`,
    `utm_campaign=${campaignName}`, `utm_source=rtb`, `utm_medium=display`, `utm_content=${content}`,
  ].join('&');
}

/**
 * Build Piwik + UTM query string for Meta (social) landing URLs.
 */
function buildMetaUtmParams(serviceCode: string): string {
  const slug = (!serviceCode || serviceCode.toLowerCase().startsWith('yleinen'))
    ? 'yleinen'
    : serviceCode.toLowerCase().replace(/\s+/g, '_');
  const year = new Date().getFullYear();
  const funnel = slug === 'yleinen' ? 'tietoisuus' : 'harkinta';
  const campaignName = `B2C_taktinen_kampanja_maksettu_${funnel}_dental_kr2_marketing-engine_${year}`;
  const content = `video_${slug}`;
  return [
    `pk_campaign=${campaignName}`, `pk_source=facebook`, `pk_medium=social`, `pk_content=${content}`,
    `utm_campaign=${campaignName}`, `utm_source=facebook`, `utm_medium=social`, `utm_content=${content}`,
  ].join('&');
}

/** Append UTM query string to a base URL. */
function appendUtm(baseUrl: string, utmParams: string): string {
  if (!baseUrl || !utmParams) return baseUrl || '';
  const separator = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${separator}${utmParams}`;
}

// Helper to format a dental campaign into a sheet row
// Accepts optional overrides for multi-location rows (branch override, service override, budget override, creative URLs)
function formatDentalCampaignRow(
  campaign: DentalCampaign,
  options?: {
    branchOverride?: { name: string; short_name?: string; address: string; postal_code: string; city: string; region?: string; phone?: string; lat?: number; lng?: number };
    serviceOverride?: { name: string; name_fi?: string; code: string; default_price?: string; default_offer_fi?: string };
    budgetOverride?: { total: number; meta: number; display: number; pdooh: number; audio: number };
    excludedBranchesData?: Array<{ address: string; city: string }>;
    creativeUrls?: AdVersionUrls;
    allBranches?: Array<{ name: string; short_name?: string; city: string }>;
    nationwideAddressMode?: 'with_address' | 'without_address';
    radiusOverride?: number;
  }
): string[] {
  const startDate = safeFormatDate(campaign.campaign_start_date || campaign.start_date);
  const endDate = (campaign.is_ongoing || campaign.campaign_end_date?.toUpperCase() === 'ONGOING')
    ? 'Ongoing'
    : safeFormatDate(campaign.campaign_end_date || campaign.end_date);

  const svc = options?.serviceOverride || campaign.service;
  const br = options?.branchOverride || campaign.branch;
  const budgetOv = options?.budgetOverride;

  // Calculate campaign duration in days for daily budget
  // For ongoing campaigns, budget is monthly — use 30 days to derive daily budget
  let campaignDays = 1;
  if (campaign.is_ongoing || campaign.campaign_end_date?.toUpperCase() === 'ONGOING') {
    campaignDays = 30; // Monthly budget → daily = budget / 30
  } else {
    try {
      const rawStart = campaign.campaign_start_date || campaign.start_date;
      const rawEnd = campaign.campaign_end_date || campaign.end_date;
      if (rawStart && rawEnd && rawEnd.toUpperCase() !== 'ONGOING') {
        const s = parseISO(rawStart);
        const e = parseISO(rawEnd);
        const diff = Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24));
        if (diff > 0) campaignDays = diff;
      }
    } catch { /* use default 1 */ }
  }

  const metaBudget = budgetOv?.meta ?? campaign.budget_meta ?? 0;
  const displayBudget = budgetOv?.display ?? campaign.budget_display ?? 0;
  const pdoohBudget = budgetOv?.pdooh ?? campaign.budget_pdooh ?? 0;
  const audioBudget = budgetOv?.audio ?? campaign.budget_audio ?? 0;
  const totalBudget = budgetOv?.total ?? campaign.total_budget ?? 0;

  // Calculate daily budgets from total budgets
  const dailyMeta = metaBudget / campaignDays;
  const dailyDisplay = displayBudget / campaignDays;
  const dailyPdooh = pdoohBudget / campaignDays;
  const dailyAudio = audioBudget / campaignDays;

  const radius = options?.radiusOverride ?? campaign.campaign_radius ?? 10;

  // Smartly address format: "Streetname X, City, Finland /radius/kilometer"
  const smartlyAddress = formatSmartlyAddress(br?.address, br?.city, radius);

  // Creative address format depends on nationwide_address_mode
  let creativeAddr = formatCreativeAddress(br?.address, br?.city);
  const allBranches = options?.allBranches || [];

  if (options?.nationwideAddressMode === 'without_address') {
    // Nationwide without address: no address in creative
    creativeAddr = '';
  } else if (options?.nationwideAddressMode === 'with_address' && br) {
    // Nationwide with address: use bundle address for bundled branches, own address for unbundled
    const branchLabel = (br as any).short_name || br.name || '';
    const bundle = getBundleForBranch(branchLabel);
    if (bundle) {
      creativeAddr = bundle.bundleAddress;
    } else {
      creativeAddr = formatCreativeAddress(br.address, br.city);
    }
  } else if (allBranches.length > 1) {
    // Non-nationwide multi-branch: original bundle matching logic
    const branchNames = allBranches.map(b => b.short_name || b.name || b.city);
    const matchingBundle = findMatchingBundle(branchNames);
    if (matchingBundle) {
      creativeAddr = matchingBundle.bundleAddress;
    } else {
      const uniqueCities = [...new Set(allBranches.map(b => b.short_name || b.name || b.city))];
      creativeAddr = uniqueCities.join(' \u2022 ');
    }
  }

  // Background video gender based on service type:
  // suuhygienisti / hammaskiven poisto → Nainen, hammastarkastus → Mies, brand message → Nainen
  const svcNameLower = (svc?.name_fi || svc?.name || '').toLowerCase();
  const svcCodeLower = (svc?.code || '').toLowerCase();
  const videoGender = svcCodeLower === 'yleinen-brandiviesti' ? 'Nainen'
    : (svcNameLower.includes('suuhygieni') || svcNameLower.includes('hammaskiven poisto')) ? 'Nainen'
    : svcNameLower.includes('hammastarkastus') ? 'Mies'
    : 'Nainen';

  // Meta video URL
  const metaVideoUrl = (campaign as any).meta_video_url || '';

  // Audio track type (Brändillinen / Geneerinen)
  const metaAudioUrl = (campaign as any).meta_audio_url || '';
  const audioTrackType = metaAudioUrl.toLowerCase().includes('br\u00e4ndillinen') ? 'Brändillinen'
    : metaAudioUrl.toLowerCase().includes('geneerinen') ? 'Geneerinen'
    : metaAudioUrl ? 'Custom' : '';

  // Excluded locations in Smartly format
  const excludedLocations = options?.excludedBranchesData
    ? formatExcludedBranches(options.excludedBranchesData, radius)
    : '';

  // Age: always have min and max, default 18 and 65
  const ageMin = campaign.target_age_min ?? 18;
  const ageMax = campaign.target_age_max ?? 65;

  // Gender: Male / Female / all
  const genderStr = formatGender(campaign.target_genders);

  // Summarise creatives: count per channel + list of sizes
  const creatives = campaign.creatives || [];
  const creativeCount = creatives.length;
  const creativeSizes = [...new Set(creatives.map(c => c.size))].join(', ');
  const creativeChannels = [...new Set(creatives.map(c => c.channel))].join(', ');

  // Whether this campaign has meta channel enabled (used for setting "pending" status)
  const hasMetaChannel = !!campaign.channel_meta;

  return [
    // ── Core campaign (A-G) ──
    campaign.id,                                                  // A: campaign_id
    campaign.name || '',                                          // B: campaign_name
    campaign.description || '',                                   // C: description
    campaign.status || 'draft',                                   // D: status
    campaign.ad_type || '',                                       // E: ad_type
    campaign.creative_type || '',                                 // F: creative_type
    campaign.include_pricing || '',                               // G: include_pricing

    // ── Service (H-J) ──
    svc?.name || '',                                              // H: service_name
    svc?.code || '',                                              // I: service_code
    ((campaign as any).service_prices?.[svc?.id] || campaign.offer_text || svc?.default_price || ''), // J: service_price (per-service price > offer_text > default)

    // ── Branch (K-P) ──
    br?.name || '',                                               // K: branch_name
    creativeAddr,                                                 // L: branch_address (creative format: "Streetname X, City")
    formatPostalCode(br?.postal_code),                            // M: branch_postal_code (5-digit padded)
    br?.city || '',                                               // N: branch_city
    br?.region || '',                                             // O: branch_region
    sheetSafe(br?.phone || ''),                                  // P: branch_phone

    // ── Location targeting (Q-V) — use per-branch data when available ──
    smartlyAddress,                                               // Q: target_address (Smartly format: "Streetname X, City, Finland /radius/kilometer")
    formatPostalCode(br?.postal_code || campaign.campaign_postal_code), // R: target_postal_code (5-digit padded)
    br?.city || campaign.campaign_city || '',                     // S: target_city
    radius.toString(),                                            // T: target_radius
    (br as any)?.lat?.toString() || campaign.campaign_coordinates?.lat?.toString() || '', // U: target_lat
    (br as any)?.lng?.toString() || campaign.campaign_coordinates?.lng?.toString() || '', // V: target_lng

    // ── Schedule (W-Y) ──
    startDate,                                                    // W: start_date (DD-MM-YYYY)
    endDate,                                                      // X: end_date (DD-MM-YYYY)
    campaign.is_ongoing ? 'Yes' : 'No',                          // Y: is_ongoing

    // ── Channels (Z-AC) ──
    campaign.channel_meta ? 'Yes' : 'No',                        // Z: channel_meta
    campaign.channel_display ? 'Yes' : 'No',                     // AA: channel_display
    campaign.channel_pdooh ? 'Yes' : 'No',                       // AB: channel_pdooh
    campaign.channel_audio ? 'Yes' : 'No',                       // AC: channel_audio

    // ── Budget (AD-AM) ──
    totalBudget.toString(),                                       // AD: total_budget
    metaBudget.toString(),                                        // AE: budget_meta
    displayBudget.toString(),                                     // AF: budget_display
    pdoohBudget.toString(),                                       // AG: budget_pdooh
    audioBudget.toString(),                                       // AH: budget_audio
    dailyMeta.toFixed(2),                                         // AI: daily_budget_meta (calculated from total meta / days)
    dailyDisplay.toFixed(2),                                      // AJ: daily_budget_display
    dailyPdooh.toFixed(2),                                        // AK: daily_budget_pdooh
    dailyAudio.toFixed(2),                                        // AL: daily_budget_audio
    (campaign.spent_budget || 0).toString(),                      // AM: spent_budget

    // ── Creative content (AN-AT) ──
    (campaign.headline || '').replace(/\|/g, ' '),                // AN: headline (pipe replaced with space)
    campaign.subheadline || '',                                   // AO: subheadline
    ((campaign as any).service_prices?.[svc?.id] || campaign.offer_text || ''), // AP: offer_text (per-service price > offer_text)
    campaign.cta_text || '',                                      // AQ: cta_text
    appendUtm(campaign.landing_url || '', buildMetaUtmParams(svc?.code || '')), // AR: landing_url (with Meta UTMs)
    campaign.background_image_url || '',                          // AS: background_image_url
    (campaign.general_brand_message || '').replace(/<br\s*\/?>/gi, ' '), // AT: general_brand_message (<br> replaced with space)
    (campaign.target_screens_count || 0).toString(),              // AU: target_screens_count

    // ── Audience (AV-AX) ──
    ageMin.toString(),                                            // AV: target_age_min (default 18)
    ageMax.toString(),                                            // AW: target_age_max (default 65)
    genderStr,                                                    // AX: target_genders (Male / Female / all)

    // ── Campaign settings (AY-BB) ──
    campaign.campaign_objective || '',                            // AY: campaign_objective
    campaign.ad_type || '',                                       // AZ: ad_type (for reference)
    svc?.code === 'yleinen-brandiviesti' ? 'Yes' : 'No',         // BA: is_general_brand_message
    campaign.include_pricing || '',                               // BB: include_pricing

    // ── Creatives summary (BC-BE) ──
    creativeCount.toString(),                                     // BC: creatives_count
    creativeSizes,                                                // BD: creative_sizes
    creativeChannels,                                             // BE: creative_channels

    // ── Meta ad copy (BF-BH) ──
    (campaign as any).meta_primary_text || '',                    // BF: meta_primary_text
    (campaign as any).meta_headline || '',                        // BG: meta_headline
    (campaign as any).meta_description || '',                     // BH: meta_description

    // ── Smartly fields (BI-BL) ──
    smartlyAddress,                                               // BI: smartly_address (duplicate for Smartly column)
    dailyMeta.toFixed(2),                                         // BJ: smartly_daily_budget (always the daily meta budget)
    excludedLocations,                                            // BK: excluded_locations (semicolon-separated Smartly format)
    creativeAddr,                                                 // BL: creative_address (Streetname X, City)

    // ── Meta HTML + status + URL (BM-BR) ──
    options?.creativeUrls?.meta_video_url || (campaign as any).meta_video_url || '',  // BM: meta_video_html (1080x1080 feed HTML link)
    options?.creativeUrls?.meta_story_url || (campaign as any).meta_story_url || '', // BN: meta_story_html (1080x1920 stories/reels HTML link)
    hasMetaChannel ? 'pending' : '',                              // BO: meta_video_status ("pending" → server converts to mp4)
    hasMetaChannel ? 'pending' : '',                              // BP: meta_story_status ("pending" → server converts to mp4)
    '',                                                           // BQ: meta_video_url (filled by server after mp4 conversion)
    '',                                                           // BR: meta_story_url (filled by server after mp4 conversion)

    // ── Display creative URLs (BS-BV) ──
    options?.creativeUrls?.display_300x300_url || '',              // BS: display_300x300_url
    options?.creativeUrls?.display_300x431_url || '',              // BT: display_300x431_url
    options?.creativeUrls?.display_300x600_url || '',              // BU: display_300x600_url
    options?.creativeUrls?.display_980x400_url || '',              // BV: display_980x400_url

    // ── PDOOH creative URL (BW) ──
    options?.creativeUrls?.pdooh_1080x1920_url || '',              // BW: pdooh_1080x1920_url

    // ── Offer / Brand columns (BX-CA) ──
    (() => {
      // Build dynamic brand_message based on service elative form
      const svcName = svc?.name_fi || svc?.name || '';
      let svcElative = svcName.toLowerCase();
      if (svcElative.endsWith('äynti')) {
        svcElative = svcElative.slice(0, -5) + 'äynnistä';
      } else if (svcElative.endsWith('nti')) {
        svcElative = svcElative.slice(0, -3) + 'nnistä';
      } else if (svcElative.endsWith('us')) {
        svcElative = svcElative.slice(0, -2) + 'uksesta';
      } else {
        svcElative = svcElative + 'sta';
      }
      return `Sujuvampaa suunterveyttä aina ${svcElative} erikoisosaamista vaativiin hoitoihin.`;
    })(), // BX: brand_message
    (() => {                                                       // BY: offer_message
      if (!br?.city) return 'Sujuvampaa suunterveyttä Suun Terveystaloissa.';
      const branchLabel = (br as any).short_name || br.name || '';
      const isBundle = !!getBundleForBranch(branchLabel);
      const suffix = isBundle ? 'Terveystaloissa' : 'Terveystalossa';
      return `Sujuvampaa suunterveyttä ${getConjugatedCity(br.city)} Suun ${suffix}.`;
    })(),
    (campaign as any).offer_title || svc?.default_offer_fi || svc?.name_fi || svc?.name || '', // BZ: offer_headline (Tarjouksen otsikko)
    ((campaign as any).offer_date || (campaign as any).offer_subtitle || '').replace(/<br\s*\/?>/gi, ' ').replace(/\|/g, ' '), // CA: offer_subtitle (Voimassaoloaika)

    // ── Smartly creative ID (CB) ──
    `${campaign.id}-${(br?.name || 'branch').toLowerCase().replace(/\s+/g, '-')}-${svc?.code || 'unknown'}`, // CB: creative_id (campaign_id-branch-service, unique per ad version)

    // ── Video / Creative extras (CC-CG) ──
    videoGender,                                                  // CC: background_video_gender (Nainen / Mies / Custom)
    '',                                                           // CD: offer_bubble_subtitle (removed – not displayed anywhere)
    (() => {                                                      // CE: service_price (price for this specific service)
      // Per-service edited price takes priority over generic offer_text
      const servicePrices = (campaign as any).service_prices;
      if (servicePrices && svc?.id && servicePrices[svc.id]) {
        return String(servicePrices[svc.id]);
      }
      if (campaign.offer_text) return campaign.offer_text;
      return (svc?.default_price || '').replace(/€/g, '').trim() || '';
    })(),
    audioTrackType,                                               // CF: audio_track_type (Brändillinen / Geneerinen)
    metaVideoUrl,                                                 // CG: meta_video_url (raw URL for reference)
    appendUtm(campaign.landing_url || '', buildMetaUtmParams(svc?.code || '')), // CH: meta_landing_url (with Meta UTMs)
  ];
}

// Helper: fetch services by IDs from Supabase
async function fetchServicesByIds(serviceIds: string[]): Promise<Service[]> {
  if (!serviceIds || serviceIds.length === 0) return [];
  const { data, error } = await supabase
    .from('services')
    .select('*')
    .in('id', serviceIds);
  if (error) {
    console.error('Failed to fetch services for sheet sync:', error);
    return [];
  }
  return data || [];
}

// Helper: fetch branches by IDs from Supabase
async function fetchBranchesByIds(branchIds: string[]): Promise<Branch[]> {
  if (!branchIds || branchIds.length === 0) return [];
  const { data, error } = await supabase
    .from('branches')
    .select('*')
    .in('id', branchIds);
  if (error) {
    console.error('Failed to fetch branches for sheet sync:', error);
    return [];
  }
  return data || [];
}

// Function to add a dental campaign to Google Sheet
// Creates one row per ad version (branch × service), with per-size creative URL columns
export async function addDentalCampaignToSheet(
  campaign: DentalCampaign,
  creativeUrlsByAdVersion?: Record<string, AdVersionUrls>
): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      console.debug('Google Sheets sync skipped - no access token');
      return true;
    }

    // Helper to parse IDs that may be JSON strings or actual arrays
    const parseIds = (val: unknown): string[] => {
      if (Array.isArray(val)) return val;
      if (typeof val === 'string') {
        try { const parsed = JSON.parse(val); if (Array.isArray(parsed)) return parsed; } catch {}
      }
      return [];
    };

    // Fetch excluded branches data for the exclusion column
    const excludedBranchIds = parseIds((campaign as any).excluded_branch_ids);
    let excludedBranchesData: Array<{ address: string; city: string }> = [];
    if (excludedBranchIds.length > 0) {
      const excludedBranches = await fetchBranchesByIds(excludedBranchIds);
      excludedBranchesData = excludedBranches.map(b => ({ address: b.address, city: b.city }));
    }

    // Fetch all branches and services for this campaign
    const branchIds: string[] = parseIds((campaign as any).branch_ids);
    const serviceIds: string[] = parseIds((campaign as any).service_ids);
    const allBranches = branchIds.length > 0 ? await fetchBranchesByIds(branchIds) : [];
    const allServices = serviceIds.length > 0 ? await fetchServicesByIds(serviceIds) : [];

    // Fallback to single branch/service from campaign relation
    const branchList = allBranches.length > 0 ? allBranches : (campaign.branch ? [campaign.branch] : []);
    const serviceList = allServices.length > 0 ? allServices : (campaign.service ? [campaign.service] : []);

    const adVersionCount = branchList.length * serviceList.length || 1;
    const branchChannelBudgets: Record<string, { meta: number; display: number; pdooh: number; audio: number }> | null =
      (campaign as any).branch_channel_budgets || null;

    // Split budget evenly across ad versions (fallback when no per-branch budgets)
    const equalSplitBudget = {
      total: (campaign.total_budget || 0) / adVersionCount,
      meta: (campaign.budget_meta || 0) / adVersionCount,
      display: (campaign.budget_display || 0) / adVersionCount,
      pdooh: (campaign.budget_pdooh || 0) / adVersionCount,
      audio: (campaign.budget_audio || 0) / adVersionCount,
    };

    // Parse per-branch radius settings
    let branchRadiusSettings: Record<string, { radius: number; enabled: boolean }> | null = null;
    const rawRadiusSettings = (campaign as any).branch_radius_settings;
    if (rawRadiusSettings) {
      branchRadiusSettings = typeof rawRadiusSettings === 'string'
        ? JSON.parse(rawRadiusSettings)
        : rawRadiusSettings;
    }

    let rows: string[][] = [];

    if (branchList.length > 0 && serviceList.length > 0) {
      for (const branch of branchList) {
        for (const service of serviceList) {
          const adVersionKey = `${branch.id}::${service.id}`;
          const urls = creativeUrlsByAdVersion?.[adVersionKey];
          if (!urls) {
            console.warn(`No creative URLs found for ad version key: ${adVersionKey}. Available keys:`, Object.keys(creativeUrlsByAdVersion || {}));
          } else {
            console.log(`Sheet row for ${branch.name} × ${service.name}: display URLs present:`, {
              d300x300: !!urls.display_300x300_url,
              d300x431: !!urls.display_300x431_url,
              d300x600: !!urls.display_300x600_url,
              d980x400: !!urls.display_980x400_url,
              pdooh: !!urls.pdooh_1080x1920_url,
            });
          }

          // Use per-branch budgets if available, split by number of services
          let branchBudgetOverride: typeof equalSplitBudget | undefined;
          if (branchChannelBudgets && branchChannelBudgets[branch.id]) {
            const bb = branchChannelBudgets[branch.id];
            const svcCount = serviceList.length || 1;
            branchBudgetOverride = {
              total: (bb.meta + bb.display + bb.pdooh + bb.audio) / svcCount,
              meta: bb.meta / svcCount,
              display: bb.display / svcCount,
              pdooh: bb.pdooh / svcCount,
              audio: bb.audio / svcCount,
            };
          }

          // Get per-branch radius from saved settings
          const branchRadius = branchRadiusSettings?.[branch.id]?.radius;

          rows.push(formatDentalCampaignRow(campaign, {
            branchOverride: {
              name: branch.name,
              short_name: (branch as any).short_name,
              address: branch.address,
              postal_code: branch.postal_code,
              city: branch.city,
              region: branch.region,
              phone: branch.phone,
              lat: (branch as any).lat ?? (branch as any).latitude,
              lng: (branch as any).lng ?? (branch as any).longitude,
            },
            radiusOverride: branchRadius,
            serviceOverride: {
              name: service.name,
              name_fi: service.name_fi,
              code: service.code,
              default_price: service.default_price,
              default_offer_fi: service.default_offer_fi,
            },
            budgetOverride: branchBudgetOverride || (adVersionCount > 1 ? equalSplitBudget : undefined),
            excludedBranchesData,
            creativeUrls: urls,
            allBranches: branchList.map(b => ({ name: b.name, short_name: (b as any).short_name, city: b.city })),
            nationwideAddressMode: (campaign as any).nationwide_address_mode || undefined,
          }));
        }
      }
    }

    if (rows.length === 0) {
      rows = [formatDentalCampaignRow(campaign, {
        excludedBranchesData,
      })];
    }

    // Append smartly_id: sequential row number (1-based) within this campaign
    rows.forEach((row, index) => {
      row.push(String(index + 1)); // CI: smartly_id
    });

    const response = await axios.post(
      `${SHEETS_API_ENDPOINT}/${SHEET_ID}/values/${SHEET_RANGE}:append?valueInputOption=USER_ENTERED`,
      { values: rows },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Extract appended row range to store as sheet_row_id
    const updatedRange = response.data?.updates?.updatedRange || '';
    console.log(`Successfully added dental campaign ${campaign.id} to Google Sheet (${rows.length} rows, ${updatedRange})`);

    // Track sync in database
    await updateSheetSyncTracking(campaign.id, updatedRange);

    return true;
  } catch (error) {
    console.error('Error adding dental campaign to sheet:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// Function to update a dental campaign in Google Sheet
// ATOMIC SEMANTICS: builds new rows first, APPENDS them, verifies success, THEN deletes the old rows.
// If anything fails in the middle, the old rows stay intact. This prevents the "rows wiped on
// transient failure" disaster of April 2026.
export async function updateDentalCampaignInSheet(
  campaign: DentalCampaign,
  creativeUrlsByAdVersion?: Record<string, AdVersionUrls>
): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.debug('Google Sheets sync skipped - no access token');
      return true;
    }

    // 1. Find existing rows for this campaign BEFORE touching anything
    const existingRows = await findCampaignRows(campaign.id);

    // 2. APPEND new rows first — this is the risky write, let it fail fast if it's going to fail
    const addSucceeded = await addDentalCampaignToSheet(campaign, creativeUrlsByAdVersion);

    if (!addSucceeded) {
      console.error(`[updateDentalCampaignInSheet] Append failed for campaign ${campaign.id} — NOT deleting old rows (${existingRows.length} preserved)`);
      return false;
    }

    // 3. Only AFTER the new rows are safely in the sheet, delete the old ones
    // Note: findCampaignRows is called again inside deleteCampaignFromSheet, but we pass
    // the PRE-APPEND row indices via a filter so we don't accidentally delete the rows
    // we just appended.
    if (existingRows.length > 0) {
      const oldRowIndices = new Set(existingRows.map(r => r.rowIndex));
      await deleteCampaignRowsAtIndices(campaign.id, oldRowIndices);
    }

    return true;
  } catch (error) {
    console.error('Error updating dental campaign in sheet:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// Delete specific row indices for a campaign (used by atomic update).
// Only deletes rows that BOTH match the campaign_id AND are in the allowed set —
// prevents accidentally deleting rows we just appended.
async function deleteCampaignRowsAtIndices(
  campaignId: string,
  allowedRowIndices: Set<number>
): Promise<void> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) return;

    // Refresh the row list (row indices shift as we delete)
    // Filter: only keep rows that are BOTH in allowedRowIndices AND still match the campaign
    const currentRows = await findCampaignRows(campaignId);
    const toDelete = currentRows.filter(r => allowedRowIndices.has(r.rowIndex));

    if (toDelete.length === 0) return;

    // Fetch sheet metadata
    const meta = await axios.get(`${SHEETS_API_ENDPOINT}/${SHEET_ID}`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const liveSheet = (meta.data.sheets || []).find((s: any) => s.properties.title === SHEET_NAME);
    if (!liveSheet) {
      console.error(`Could not find ${SHEET_NAME} sheet`);
      return;
    }
    const sheetId = liveSheet.properties.sheetId;

    // Sort descending to avoid index shift issues
    const rowIndices = toDelete.map(r => r.rowIndex).sort((a, b) => b - a);

    for (const rowIndex of rowIndices) {
      await axios.post(
        `${SHEETS_API_ENDPOINT}/${SHEET_ID}:batchUpdate`,
        {
          requests: [{
            deleteDimension: {
              range: { sheetId, dimension: 'ROWS', startIndex: rowIndex - 1, endIndex: rowIndex },
            },
          }],
        },
        { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[deleteCampaignRowsAtIndices] Deleted ${rowIndices.length} old rows for campaign ${campaignId}`);
  } catch (e) {
    console.error('[deleteCampaignRowsAtIndices] failed:', e instanceof Error ? e.message : e);
  }
}

// ============================================================================
// TARGETED CELL UPDATES — used by updateCampaign for non-creative edits
// (budget, radius, dates, status, name). Updates specific cells in place
// WITHOUT deleting or re-adding rows, so a transient failure cannot lose data.
// ============================================================================

type CellFieldUpdates = {
  // Scalars (all rows get the same value)
  total_budget?: number;
  name?: string;
  status?: string;
  campaign_start_date?: string;
  campaign_end_date?: string;
  is_ongoing?: boolean;
  // Per-branch maps (each row gets its own value from these)
  branch_channel_budgets?: Record<string, { meta?: number; display?: number; pdooh?: number; audio?: number }>;
  branch_radius_settings?: Record<string, { radius: number; enabled?: boolean }>;
  // Global fallbacks (used when per-branch maps are absent)
  budget_meta?: number;
  budget_display?: number;
  budget_pdooh?: number;
  budget_audio?: number;
  campaign_radius?: number;
};

// Column letters in the FEED tab — matches formatDentalCampaignRow()
const FEED_COLUMNS = {
  campaign_name: 'B',       // column B
  status: 'D',               // column D
  target_radius: 'T',        // column T
  start_date: 'W',           // column W
  end_date: 'X',             // column X
  is_ongoing: 'Y',           // column Y
  total_budget: 'AD',        // column AD
  budget_meta: 'AE',         // column AE
  budget_display: 'AF',      // column AF
  budget_pdooh: 'AG',        // column AG
  budget_audio: 'AH',        // column AH
  daily_meta: 'AI',          // column AI
  daily_display: 'AJ',       // column AJ
  daily_pdooh: 'AK',         // column AK
  daily_audio: 'AL',         // column AL
  smartly_daily: 'BJ',       // column BJ (duplicate of daily_meta)
} as const;

/**
 * Update specific fields on existing sheet rows without deleting them.
 * Safe for budget/radius/date/status/name edits — no risk of data loss on partial failure.
 *
 * For multi-branch campaigns, each row gets its own values from the per-branch maps.
 * Rows are matched by campaign_id (column A) and branch_id is derived from column K (branch_name).
 */
export async function updateDentalCampaignCellsInSheet(
  campaignId: string,
  cellUpdates: CellFieldUpdates,
  // Optional: pass existing campaign data so we can compute per-row values
  campaignContext?: {
    branches?: Array<{ id: string; name: string }>;
    total_days?: number;
    service_count?: number;
  }
): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.debug('Google Sheets cell-update skipped — no access token');
      return true;
    }

    // Fetch all rows for this campaign (columns A:CI) so we can read the existing values
    // and compute new ones per-row.
    const response = await axios.get(
      `${SHEETS_API_ENDPOINT}/${SHEET_ID}/values/${SHEET_RANGE}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    );
    const allRows: string[][] = response.data.values || [];
    const matchingRows: { rowIndex: number; data: string[] }[] = [];
    for (let i = 0; i < allRows.length; i++) {
      if (allRows[i] && allRows[i][0] === campaignId) {
        matchingRows.push({ rowIndex: i + 1, data: allRows[i] });
      }
    }

    if (matchingRows.length === 0) {
      console.warn(`[updateDentalCampaignCellsInSheet] No rows found for campaign ${campaignId} — nothing to update`);
      return true;
    }

    const days = campaignContext?.total_days ?? 30; // fallback to monthly
    const svcCount = campaignContext?.service_count ?? 1;
    const branchNameToId = new Map<string, string>();
    (campaignContext?.branches || []).forEach(b => branchNameToId.set(b.name, b.id));

    // Build batch update requests
    const batchUpdates: Array<{ range: string; values: string[][] }> = [];

    for (const row of matchingRows) {
      const rowIdx = row.rowIndex;
      const branchName = row.data[10] || ''; // column K = branch_name
      const branchId = branchNameToId.get(branchName);

      // Determine per-row budgets (per-branch if map provided, else scalar)
      let metaB = 0, dispB = 0, pdoohB = 0, audioB = 0, totalB = 0;
      if (branchId && cellUpdates.branch_channel_budgets?.[branchId]) {
        const bb = cellUpdates.branch_channel_budgets[branchId];
        metaB = (bb.meta ?? 0) / svcCount;
        dispB = (bb.display ?? 0) / svcCount;
        pdoohB = (bb.pdooh ?? 0) / svcCount;
        audioB = (bb.audio ?? 0) / svcCount;
        totalB = metaB + dispB + pdoohB + audioB;
      } else {
        metaB = cellUpdates.budget_meta ?? parseFloat(row.data[30] || '0');
        dispB = cellUpdates.budget_display ?? parseFloat(row.data[31] || '0');
        pdoohB = cellUpdates.budget_pdooh ?? parseFloat(row.data[32] || '0');
        audioB = cellUpdates.budget_audio ?? parseFloat(row.data[33] || '0');
        totalB = cellUpdates.total_budget ?? (metaB + dispB + pdoohB + audioB);
      }

      // Determine per-row radius
      let radius: number | undefined;
      if (branchId && cellUpdates.branch_radius_settings?.[branchId]) {
        radius = cellUpdates.branch_radius_settings[branchId].radius;
      } else if (cellUpdates.campaign_radius !== undefined) {
        radius = cellUpdates.campaign_radius;
      }

      // Build updates for this row
      if (cellUpdates.name !== undefined) {
        batchUpdates.push({
          range: `${SHEET_NAME}!${FEED_COLUMNS.campaign_name}${rowIdx}`,
          values: [[cellUpdates.name]],
        });
      }
      if (cellUpdates.status !== undefined) {
        batchUpdates.push({
          range: `${SHEET_NAME}!${FEED_COLUMNS.status}${rowIdx}`,
          values: [[cellUpdates.status]],
        });
      }
      if (radius !== undefined) {
        batchUpdates.push({
          range: `${SHEET_NAME}!${FEED_COLUMNS.target_radius}${rowIdx}`,
          values: [[String(radius)]],
        });
      }
      if (cellUpdates.campaign_start_date !== undefined) {
        batchUpdates.push({
          range: `${SHEET_NAME}!${FEED_COLUMNS.start_date}${rowIdx}`,
          values: [[safeFormatDate(cellUpdates.campaign_start_date)]],
        });
      }
      if (cellUpdates.campaign_end_date !== undefined) {
        batchUpdates.push({
          range: `${SHEET_NAME}!${FEED_COLUMNS.end_date}${rowIdx}`,
          values: [[
            cellUpdates.is_ongoing || cellUpdates.campaign_end_date?.toUpperCase() === 'ONGOING'
              ? 'Ongoing'
              : safeFormatDate(cellUpdates.campaign_end_date),
          ]],
        });
      }
      if (cellUpdates.is_ongoing !== undefined) {
        batchUpdates.push({
          range: `${SHEET_NAME}!${FEED_COLUMNS.is_ongoing}${rowIdx}`,
          values: [[cellUpdates.is_ongoing ? 'Yes' : 'No']],
        });
      }

      // Budget columns — always recompute if ANY budget field changed, because
      // daily budgets depend on total budgets
      const budgetChanged =
        cellUpdates.total_budget !== undefined ||
        cellUpdates.budget_meta !== undefined ||
        cellUpdates.budget_display !== undefined ||
        cellUpdates.budget_pdooh !== undefined ||
        cellUpdates.budget_audio !== undefined ||
        cellUpdates.branch_channel_budgets !== undefined;

      if (budgetChanged) {
        batchUpdates.push(
          { range: `${SHEET_NAME}!${FEED_COLUMNS.total_budget}${rowIdx}`, values: [[totalB.toString()]] },
          { range: `${SHEET_NAME}!${FEED_COLUMNS.budget_meta}${rowIdx}`, values: [[metaB.toString()]] },
          { range: `${SHEET_NAME}!${FEED_COLUMNS.budget_display}${rowIdx}`, values: [[dispB.toString()]] },
          { range: `${SHEET_NAME}!${FEED_COLUMNS.budget_pdooh}${rowIdx}`, values: [[pdoohB.toString()]] },
          { range: `${SHEET_NAME}!${FEED_COLUMNS.budget_audio}${rowIdx}`, values: [[audioB.toString()]] },
          { range: `${SHEET_NAME}!${FEED_COLUMNS.daily_meta}${rowIdx}`, values: [[(metaB / days).toFixed(2)]] },
          { range: `${SHEET_NAME}!${FEED_COLUMNS.daily_display}${rowIdx}`, values: [[(dispB / days).toFixed(2)]] },
          { range: `${SHEET_NAME}!${FEED_COLUMNS.daily_pdooh}${rowIdx}`, values: [[(pdoohB / days).toFixed(2)]] },
          { range: `${SHEET_NAME}!${FEED_COLUMNS.daily_audio}${rowIdx}`, values: [[(audioB / days).toFixed(2)]] },
          { range: `${SHEET_NAME}!${FEED_COLUMNS.smartly_daily}${rowIdx}`, values: [[(metaB / days).toFixed(2)]] },
        );
      }
    }

    if (batchUpdates.length === 0) {
      console.debug(`[updateDentalCampaignCellsInSheet] No cell updates to apply for campaign ${campaignId}`);
      return true;
    }

    // Use values:batchUpdate — atomic, all-or-nothing on the Google side
    await axios.post(
      `${SHEETS_API_ENDPOINT}/${SHEET_ID}/values:batchUpdate`,
      {
        valueInputOption: 'USER_ENTERED',
        data: batchUpdates,
      },
      { headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );

    console.log(`[updateDentalCampaignCellsInSheet] Updated ${batchUpdates.length} cells across ${matchingRows.length} rows for campaign ${campaignId}`);
    await updateSheetSyncTracking(campaignId);
    return true;
  } catch (error) {
    console.error('[updateDentalCampaignCellsInSheet] failed:', error instanceof Error ? error.message : error);
    return false;
  }
}

// Function to update dental campaign status in Google Sheet (column W only)
export async function updateDentalCampaignStatusInSheet(
  campaignId: string,
  status: CampaignStatus
): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.debug('Google Sheets sync skipped - no access token');
      return true;
    }

    const existingRows = await findCampaignRows(campaignId);
    if (existingRows.length === 0) {
      console.debug(`No sheet row found for campaign ${campaignId} — skipping status update`);
      return true;
    }

    // Update status column (D) for each matching row
    for (const row of existingRows) {
      await axios.put(
        `${SHEETS_API_ENDPOINT}/${SHEET_ID}/values/${SHEET_NAME}!D${row.rowIndex}?valueInputOption=USER_ENTERED`,
        { values: [[status]] },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log(`Successfully updated status to "${status}" for campaign ${campaignId} in Google Sheet`);
    await updateSheetSyncTracking(campaignId);
    return true;
  } catch (error) {
    console.error('Error updating dental campaign status in sheet:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// Function to update campaign data in Google Sheet
export async function updateCampaignInSheet(
  campaign: Campaign, 
  campaignApartments: CampaignApartment[],
  apartments: Apartment[]
) {
  try {
    // First, find existing rows for this campaign
    const existingRows = await findCampaignRows(campaign.id);
    
    // If rows exist, delete them
    if (existingRows.length > 0) {
      await deleteCampaignFromSheet(campaign.id);
    }
    
    // Then add the updated campaign data
    return await addCampaignToSheet(campaign, campaignApartments, apartments);
  } catch (error) {
    console.error('Error updating campaign in sheet:', error);
    // Don't throw, just return false to indicate failure
    return false;
  }
}

// Function to delete campaign data from Google Sheet
export async function deleteCampaignFromSheet(campaignId: string) {
  try {
    const accessToken = await getAccessToken();
    
    // If no access token, cannot proceed
    if (!accessToken) {
      console.debug('Google Sheets sync skipped - no access token');
      return true; // Return true because the campaign was successfully deleted from the database
    }
    
    // Find existing rows for this campaign
    const existingRows = await findCampaignRows(campaignId);
    
    if (existingRows.length === 0) {
      return true; // Nothing to delete, return success
    }
    
    // Fetch the spreadsheet metadata to get the sheetId of the LIVE sheet and check column count
    const spreadsheetResponse = await axios.get(
      `${SHEETS_API_ENDPOINT}/${SHEET_ID}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const sheets = spreadsheetResponse.data.sheets || [];
    const liveSheet = sheets.find((sheet: any) => sheet.properties.title === SHEET_NAME);
    if (!liveSheet) {
      console.error(`Could not find ${SHEET_NAME} sheet in spreadsheet`);
      return false;
    }
    const sheetId = liveSheet.properties.sheetId;
    const columnCount = liveSheet.properties.gridProperties?.columnCount || COLUMN_COUNT; // Default to 30 (A:AD) if not specified
    console.log(`${SHEET_NAME} sheet column count: ${columnCount}`);

    // Sort row indices in descending order to avoid shifting issues when deleting
    const rowIndices = existingRows.map(row => row.rowIndex).sort((a, b) => b - a);
    
    // Delete each row individually, starting from the bottom
    for (const rowIndex of rowIndices) {
      // First, clear the row to ensure no leftover data (use A:AX since we know the sheet structure)
      try {
        await axios.put(
          `${SHEETS_API_ENDPOINT}/${SHEET_ID}/values/${SHEET_NAME}!A${rowIndex}:CA${rowIndex}?valueInputOption=RAW`,
          {
            values: [Array(COLUMN_COUNT).fill('')], // Clear all columns (A:BL)
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (clearError) {
        console.error(`Failed to clear row ${rowIndex} before deletion:`, clearError);
        // Continue with deletion even if clearing fails
      }

      // Then delete the row
      await axios.post(
        `${SHEETS_API_ENDPOINT}/${SHEET_ID}:batchUpdate`,
        {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex - 1, // 0-based index for the API
                  endIndex: rowIndex, // exclusive end index
                },
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    console.log(`Successfully deleted ${rowIndices.length} rows from Google Sheet for campaign ${campaignId}`);
    return true;
  } catch (error) {
    console.error('Error deleting campaign from sheet:', error);
    // Don't throw, just return false to indicate failure
    return false;
  }
}

// Function to update campaign status in Google Sheet
export async function updateCampaignStatusInSheet(campaignId: string, active: boolean) {
  try {
    const accessToken = await getAccessToken();
    
    // If no access token, cannot proceed
    if (!accessToken) {
      console.debug('Google Sheets sync skipped - no access token');
      return true; // Return true because the campaign status was updated successfully in the database
    }
    
    // Find existing rows for this campaign
    const existingRows = await findCampaignRows(campaignId);
    
    if (existingRows.length === 0) {
      return false; // No rows to update
    }
    
    // Update the status column (column W, index 22) for each row
    const status = active ? 'Active' : 'Paused';
    
    for (const row of existingRows) {
      await axios.put(
        `${SHEETS_API_ENDPOINT}/${SHEET_ID}/values/${SHEET_NAME}!W${row.rowIndex}?valueInputOption=USER_ENTERED`,
        {
          values: [[status]],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    return true;
  } catch (error) {
    console.error('Error updating campaign status in sheet:', error);
    // Don't throw, just return false to indicate failure
    return false;
  }
}

// Function to check for deleted apartments and update campaigns
export async function checkForDeletedApartments(
  campaigns: Campaign[],
  campaignApartments: CampaignApartment[],
  apartments: Apartment[]
) {
  try {
    // Create a set of all apartment keys from the feed
    const availableApartmentKeys = new Set(apartments.map(apt => apt.key));
    
    // Find campaign apartments that no longer exist in the feed
    const deletedApartments = campaignApartments.filter(
      ca => !availableApartmentKeys.has(ca.apartment_key)
    );
    
    if (deletedApartments.length === 0) {
      return []; // No deleted apartments
    }
    
    // Group deleted apartments by campaign ID
    const campaignMap = new Map<string, CampaignApartment[]>();
    
    for (const ca of deletedApartments) {
      if (!campaignMap.has(ca.campaign_id)) {
        campaignMap.set(ca.campaign_id, []);
      }
      campaignMap.get(ca.campaign_id)?.push(ca);
    }
    
    // Return the list of affected campaigns and their deleted apartments
    return Array.from(campaignMap.entries()).map(([campaignId, deletedApts]) => {
      const campaign = campaigns.find(c => c.id === campaignId);
      return {
        campaign,
        deletedApartments: deletedApts,
      };
    });
  } catch (error) {
    console.error('Error checking for deleted apartments:', error);
    // Return empty array instead of throwing
    return [];
  }
}