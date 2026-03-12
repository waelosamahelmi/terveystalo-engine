import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { format, startOfMonth, endOfMonth } from 'date-fns';

// ============================================================================
// TYPES
// ============================================================================

interface BidTheatreBasicStats {
  nrImps: number;
  nrClicks: number;
  cost: number;
  revenue: number;
  CTR: number;
  activeImps: number;
  engagementRate: number;
}

interface BidTheatreNamedStats {
  id: number;
  name: string;
  nrImps: number;
  cost: number;
  viewableRate?: number;
}

interface BidTheatreDailyStats {
  date: string;
  nrImps: number;
  cost: number;
}

interface ChannelStats {
  basic: BidTheatreBasicStats | null;
  devices: BidTheatreNamedStats[];
  audience: BidTheatreNamedStats[];
  geo: BidTheatreNamedStats[];
  geoCities: BidTheatreNamedStats[];
  sites: BidTheatreNamedStats[];
  hotspots: BidTheatreNamedStats[];
  daily: BidTheatreDailyStats[];
}

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

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const BT_API_URL = 'https://asx-api.bidtheatre.com/v2.0/api';

// ============================================================================
// BT CREDENTIALS & AUTH
// ============================================================================

async function getBidTheatreCredentials() {
  const { data, error } = await supabase
    .from('bidtheatre_credentials')
    .select('network_id, username, password')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) throw new Error('Failed to fetch BidTheatre credentials');
  return data;
}

async function getBidTheatreToken() {
  const credentials = await getBidTheatreCredentials();
  const response = await axios.post(`${BT_API_URL}/auth`, {
    username: credentials.username,
    password: credentials.password,
  }, {
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
  });

  const token = response.data?.auth?.token;
  if (!token) throw new Error('Invalid BidTheatre authentication response');
  return token;
}

// ============================================================================
// API HELPERS
// ============================================================================

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function makeStatsRequest(
  endpoint: string,
  params: Record<string, string>,
  btToken: string,
  networkId: string,
  retries = 3
) {
  const baseDelay = 1000;
  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) await delay(baseDelay * Math.pow(2, i - 1));
      const queryString = new URLSearchParams(params).toString();
      const url = `${BT_API_URL}/${networkId}/${endpoint}?${queryString}`;
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${btToken}`, Accept: 'application/json' },
        timeout: 60000,
      });
      return response;
    } catch (error: any) {
      if (error.response?.status === 429 && i < retries - 1) continue;
      if (error.response?.status === 401 && i < retries - 1) {
        btToken = await getBidTheatreToken();
        continue;
      }
      throw error;
    }
  }
  throw new Error(`Failed after ${retries} retries`);
}

async function fetchBtCampaignStats(
  btToken: string,
  networkId: string,
  btCampaignId: string,
  startDate: string,
  endDate: string
): Promise<ChannelStats> {
  const baseDelay = 100;
  const params = { campaign: btCampaignId, startDate, endDate };
  const paramsNoDate = { campaign: btCampaignId };

  const basicStats = await makeStatsRequest('stats-campaign', params, btToken, networkId);
  await delay(baseDelay);
  const deviceStats = await makeStatsRequest('stats-campaign-device', paramsNoDate, btToken, networkId);
  await delay(baseDelay);
  const audienceStats = await makeStatsRequest('stats-campaign-audience', paramsNoDate, btToken, networkId);
  await delay(baseDelay);
  const geoStats = await makeStatsRequest('stats-campaign-geo', paramsNoDate, btToken, networkId);
  await delay(baseDelay);
  const geoCityStats = await makeStatsRequest('stats-campaign-geo-city', paramsNoDate, btToken, networkId);
  await delay(baseDelay);
  const siteStats = await makeStatsRequest('stats-campaign-site', params, btToken, networkId);
  await delay(baseDelay);
  const hotspotStats = await makeStatsRequest('stats-campaign-hotspot', paramsNoDate, btToken, networkId);
  await delay(baseDelay);
  const dailyStats = await makeStatsRequest('stats-campaign-day', paramsNoDate, btToken, networkId);

  return {
    basic: basicStats.data.statsCampaign?.[0] || null,
    devices: deviceStats.data.statsCampaignDevice || [],
    audience: audienceStats.data.statsCampaignAudience || [],
    geo: geoStats.data.statsCampaignGeo || [],
    geoCities: geoCityStats.data.statsCampaignGeoCity || [],
    sites: siteStats.data.statsCampaignSites || [],
    hotspots: hotspotStats.data.statsCampaignHotspot || [],
    daily: dailyStats.data.statsCampaignDay || [],
  };
}

// ============================================================================
// AGGREGATION — combine stats from multiple branch-level BT campaigns
// ============================================================================

function emptyStats(): ChannelStats {
  return { basic: null, devices: [], audience: [], geo: [], geoCities: [], sites: [], hotspots: [], daily: [] };
}

function mergeBasicStats(a: BidTheatreBasicStats | null, b: BidTheatreBasicStats | null): BidTheatreBasicStats | null {
  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;
  const totalImps = (a.nrImps || 0) + (b.nrImps || 0);
  const totalClicks = (a.nrClicks || 0) + (b.nrClicks || 0);
  return {
    nrImps: totalImps,
    nrClicks: totalClicks,
    cost: (a.cost || 0) + (b.cost || 0),
    revenue: (a.revenue || 0) + (b.revenue || 0),
    CTR: totalImps > 0 ? (totalClicks / totalImps) * 100 : 0,
    activeImps: (a.activeImps || 0) + (b.activeImps || 0),
    engagementRate: ((a.engagementRate || 0) + (b.engagementRate || 0)) / 2,
  };
}

function mergeNamedStats(a: BidTheatreNamedStats[], b: BidTheatreNamedStats[]): BidTheatreNamedStats[] {
  const map = new Map<number, BidTheatreNamedStats>();
  for (const item of [...a, ...b]) {
    const existing = map.get(item.id);
    if (existing) {
      existing.nrImps = (existing.nrImps || 0) + (item.nrImps || 0);
      existing.cost = (existing.cost || 0) + (item.cost || 0);
    } else {
      map.set(item.id, { ...item });
    }
  }
  return Array.from(map.values());
}

function mergeDailyStats(a: BidTheatreDailyStats[], b: BidTheatreDailyStats[]): BidTheatreDailyStats[] {
  const map = new Map<string, BidTheatreDailyStats>();
  for (const item of [...a, ...b]) {
    const existing = map.get(item.date);
    if (existing) {
      existing.nrImps = (existing.nrImps || 0) + (item.nrImps || 0);
      existing.cost = (existing.cost || 0) + (item.cost || 0);
    } else {
      map.set(item.date, { ...item });
    }
  }
  return Array.from(map.values()).sort((x, y) => x.date.localeCompare(y.date));
}

function aggregateChannelStats(statsArray: ChannelStats[]): ChannelStats {
  return statsArray.reduce((acc, curr) => ({
    basic: mergeBasicStats(acc.basic, curr.basic),
    devices: mergeNamedStats(acc.devices, curr.devices),
    audience: mergeNamedStats(acc.audience, curr.audience),
    geo: mergeNamedStats(acc.geo, curr.geo),
    geoCities: mergeNamedStats(acc.geoCities, curr.geoCities),
    sites: mergeNamedStats(acc.sites, curr.sites),
    hotspots: mergeNamedStats(acc.hotspots, curr.hotspots),
    daily: mergeDailyStats(acc.daily, curr.daily),
  }), emptyStats());
}

// ============================================================================
// HANDLER
// ============================================================================

export const handler: Handler = async () => {
  try {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth() + 1;
    const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(now), 'yyyy-MM-dd');

    // Fetch active campaigns
    const { data: campaigns, error: campaignsError } = await supabase
      .from('dental_campaigns')
      .select('*')
      .eq('status', 'active');

    if (campaignsError) throw campaignsError;

    const btToken = await getBidTheatreToken();
    const credentials = await getBidTheatreCredentials();
    const networkId = credentials.network_id;

    console.log(`Processing ${campaigns.length} active campaigns for ${currentYear}-${String(currentMonth).padStart(2, '0')}`);

    for (const campaign of campaigns) {
      try {
        if (!campaign.campaign_start_date) {
          console.log(`Skipping campaign ${campaign.id}: no start date`);
          continue;
        }

        console.log(`Processing campaign ${campaign.id}: ${campaign.name || 'Unnamed'}`);

        // Fetch all BT campaign records for this campaign from bidtheatre_campaigns table
        const { data: btRecords, error: btError } = await supabase
          .from('bidtheatre_campaigns')
          .select('bt_campaign_id, channel, branch_id')
          .eq('campaign_id', campaign.id)
          .neq('status', 'paused');

        if (btError || !btRecords || btRecords.length === 0) {
          console.log(`No active BT records for campaign ${campaign.id}`);
          continue;
        }

        // Collect stats per channel, aggregating across branches
        const displayStatsArr: ChannelStats[] = [];
        const pdoohStatsArr: ChannelStats[] = [];

        for (const btRecord of btRecords) {
          try {
            console.log(`Fetching stats for BT ${btRecord.bt_campaign_id} (${btRecord.channel})`);
            const stats = await fetchBtCampaignStats(btToken, networkId, String(btRecord.bt_campaign_id), startDate, endDate);
            if (btRecord.channel === 'DISPLAY') displayStatsArr.push(stats);
            else if (btRecord.channel === 'PDOOH') pdoohStatsArr.push(stats);
            await delay(200);
          } catch (err: any) {
            console.error(`Stats fetch failed for BT ${btRecord.bt_campaign_id}: ${err.message}`);
          }
        }

        // Aggregate across branches
        const displayStats = aggregateChannelStats(displayStatsArr);
        const pdoohStats = aggregateChannelStats(pdoohStatsArr);

        // Viewable rates
        const displayViewableRate = displayStats.sites.length
          ? displayStats.sites.reduce((sum, s) => sum + (s.viewableRate || 0), 0) / displayStats.sites.length
          : 0;
        const pdoohViewableRate = pdoohStats.sites.length
          ? pdoohStats.sites.reduce((sum, s) => sum + (s.viewableRate || 0), 0) / pdoohStats.sites.length
          : 0;

        // Upsert into media_costs (same schema as original)
        const { error: upsertError } = await supabase
          .from('media_costs')
          .upsert({
            campaign_id: campaign.id,
            year: currentYear,
            month: currentMonth,
            is_monthly_snapshot: true,

            budget_meta: campaign.budget_meta || 0,
            budget_display: campaign.budget_display || 0,
            budget_pdooh: campaign.budget_pdooh || 0,

            // Display
            impressions_display: displayStats.basic?.nrImps || 0,
            clicks_display: displayStats.basic?.nrClicks || 0,
            cost_display: displayStats.basic?.cost || 0,
            revenue_display: displayStats.basic?.revenue || 0,
            ctr_display: displayStats.basic?.CTR || null,
            active_impressions_display: displayStats.basic?.activeImps || 0,
            viewable_impressions_display: displayStats.sites.reduce((sum, s) => sum + (s.nrImps || 0), 0),
            viewable_rate_display: displayViewableRate,
            engagement_rate_display: displayStats.basic?.engagementRate || null,
            device_stats_display: displayStats.devices,
            audience_stats_display: displayStats.audience,
            geo_stats_display: displayStats.geo,
            geo_city_stats_display: displayStats.geoCities,
            site_stats_display: displayStats.sites,
            hotspot_stats_display: displayStats.hotspots,
            daily_stats_display: displayStats.daily,

            // PDOOH
            impressions_pdooh: pdoohStats.basic?.nrImps || 0,
            clicks_pdooh: pdoohStats.basic?.nrClicks || 0,
            cost_pdooh: pdoohStats.basic?.cost || 0,
            revenue_pdooh: pdoohStats.basic?.revenue || 0,
            ctr_pdooh: pdoohStats.basic?.CTR || null,
            active_impressions_pdooh: pdoohStats.basic?.activeImps || 0,
            viewable_impressions_pdooh: pdoohStats.sites.reduce((sum, s) => sum + (s.nrImps || 0), 0),
            viewable_rate_pdooh: pdoohViewableRate,
            engagement_rate_pdooh: pdoohStats.basic?.engagementRate || null,
            device_stats_pdooh: pdoohStats.devices,
            audience_stats_pdooh: pdoohStats.audience,
            geo_stats_pdooh: pdoohStats.geo,
            geo_city_stats_pdooh: pdoohStats.geoCities,
            site_stats_pdooh: pdoohStats.sites,
            hotspot_stats_pdooh: pdoohStats.hotspots,
            daily_stats_pdooh: pdoohStats.daily,
          }, {
            onConflict: 'campaign_id,year,month,is_monthly_snapshot',
          });

        if (upsertError) throw upsertError;
        console.log(`✓ Synced stats for campaign ${campaign.id}`);
      } catch (error: any) {
        console.error(`Error processing campaign ${campaign.id}: ${error.message}`);
      }
    }

    await supabase.from('activity_logs').insert({
      action: 'sync_media_costs',
      details: `Synced media costs for ${currentYear}-${String(currentMonth).padStart(2, '0')}`,
      user_id: 'system',
      user_email: 'system@automated.job',
    });

    return { statusCode: 200, body: JSON.stringify({ message: 'Media costs sync completed' }) };
  } catch (error: any) {
    console.error('Fatal error in sync-media-costs:', error);
    return { statusCode: 500, body: JSON.stringify({ error: error.message }) };
  }
};