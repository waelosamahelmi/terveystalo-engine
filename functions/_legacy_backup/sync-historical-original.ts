import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { format, parse, startOfMonth, endOfMonth } from 'date-fns';

// Reuse interfaces and helper functions from sync-media-costs-background
interface BidTheatreBasicStats {
  nrImps: number;
  nrClicks: number;
  cost: number;
  revenue: number;
  CTR: number;
  activeImps: number;
  engagementRate: number;
}

interface BidTheatreSiteStats {
  id: number;
  name: string;
  nrImps: number;
  cost: number;
  revenue?: number;
  viewableRate?: number;
  rtbSiteURL?: string;
}

interface BidTheatreGeoStats {
  id: number;
  name: string;
  nrImps: number;
  cost: number;
  region?: string;
  latitude?: number;
  longitude?: number;
}

interface BidTheatreGeoCityStats {
  id: number;
  name: string;
  nrImps: number;
  cost: number;
  city?: string;
  latitude?: number;
  longitude?: number;
  regionName?: string;
  cityName?: string;
  regionId?: number;
  quota?: number;
  ctr?: number | null;
  quotaClick?: number | null;
}

interface BidTheatreDeviceStats {
  id: number;
  name: string;
  nrImps: number;
  nrClicks: number;
  deviceType?: { id: number; href: string };
}

interface BidTheatreAudienceStats {
  id: number;
  name: string;
  nrImps: number;
  cost: number;
  audName?: string;
  nrUniques?: number;
  nrClickUniques?: number;
  matchIndexImps?: number;
}

interface BidTheatreHotspotStats {
  id: number;
  name: string;
  nrImps: number;
  cost: number;
  hour?: number;
  weekday?: number;
  day?: number;
  month?: number;
  year?: number;
  timeVisible?: number;
  activeImps?: number;
  nrClicks?: number;
  engagementRate?: number;
}

interface BidTheatreDailyStats {
  date: string;
  nrImps: number;
  cost: number;
  day?: string;
  nrClicks?: number;
  CTR?: number;
  activeImps?: number | null;
  viewableRate?: number | null;
  engagementRate?: number | null;
  revenue?: number;
}

interface BidTheatreStats {
  basic: BidTheatreBasicStats | null;
  devices: BidTheatreDeviceStats[];
  audience: BidTheatreAudienceStats[];
  geo: BidTheatreGeoStats[];
  geoCities: BidTheatreGeoCityStats[];
  sites: BidTheatreSiteStats[];
  hotspots: BidTheatreHotspotStats[];
  daily: BidTheatreDailyStats[];
}

interface CampaignStats {
  display: BidTheatreStats;
  pdooh: BidTheatreStats;
}

// Constants
const BT_API_URL = 'https://asx-api.bidtheatre.com/v2.0/api';

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL!,
  process.env.VITE_SUPABASE_SERVICE_ROLE_KEY!
);

// Helper function to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Get BidTheatre credentials
const getBidTheatreCredentials = async () => {
  try {
    const { data, error } = await supabase
      .from('bidtheatre_credentials')
      .select('network_id, username, password')
      .order('updated_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !data) {
      throw new Error('Failed to fetch BidTheatre credentials');
    }

    return {
      network_id: data.network_id,
      username: data.username,
      password: data.password,
    };
  } catch (error) {
    console.error('Error getting BidTheatre credentials:', error);
    return null;
  }
};

// Get BidTheatre authentication token
const getBidTheatreToken = async () => {
  const credentials = await getBidTheatreCredentials();
  if (!credentials) {
    throw new Error('Failed to get BidTheatre credentials');
  }

  try {
    console.log(`Authenticating with BidTheatre using network ID: ${credentials.network_id}`);
    const response = await axios.post(`${BT_API_URL}/auth`, {
      username: credentials.username,
      password: credentials.password,
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    if (!response.data || !response.data.auth || !response.data.auth.token) {
      console.error('Invalid BidTheatre authentication response:', response.data);
      throw new Error('Invalid BidTheatre authentication response structure');
    }

    const token = response.data.auth.token;
    console.log('Successfully authenticated with BidTheatre');
    return token;
  } catch (error: any) {
    console.error('Error authenticating with BidTheatre:', error.response?.data || error.message);
    throw new Error(`BidTheatre authentication failed: ${error.response?.data?.message || error.message}`);
  }
};

// Helper function to make a single API request with retries
async function makeRequest(endpoint: string, params: any, btToken: string, BT_NETWORK_ID: string, retries = 3, baseDelay = 1000) {
  for (let i = 0; i < retries; i++) {
    try {
      if (i > 0) {
        const waitTime = baseDelay * Math.pow(2, i - 1);
        console.log(`Retrying ${endpoint} after ${waitTime}ms delay (attempt ${i+1}/${retries})...`);
        await delay(waitTime);
      }

      const url = `${BT_API_URL}/${BT_NETWORK_ID}/${endpoint}`;
      const queryString = new URLSearchParams(params).toString();
      const fullUrl = `${url}?${queryString}`;
      
      console.log(`Making request to: ${fullUrl}`);
      
      const response = await axios.get(fullUrl, {
        headers: { 
          'Authorization': `Bearer ${btToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });
      
      return response;
    } catch (error: any) {
      console.error(`Error calling ${endpoint}:`, error.response?.status, error.response?.statusText);
      
      if (error.response?.status === 429 && i < retries - 1) {
        console.log(`Rate limited on ${endpoint}, attempt ${i + 1}/${retries}, waiting before retry...`);
        continue;
      } else if (error.response?.status === 401 && i < retries - 1) {
        console.log('Token expired, refreshing and retrying...');
        btToken = await getBidTheatreToken();
        continue;
      }
      throw error;
    }
  }
  throw new Error(`Failed after ${retries} retries`);
}

// Function to fetch campaign stats from BidTheatre
async function fetchCampaignStats(btToken: string, BT_NETWORK_ID: string, campaignId: string, startDate: string, endDate: string): Promise<BidTheatreStats> {
  const baseDelay = 100;

  console.log(`Fetching stats for campaign ${campaignId}: starting with basic stats`);
  const basicStats = await makeRequest('stats-campaign', { campaign: campaignId, startDate, endDate }, btToken, BT_NETWORK_ID);
  await delay(baseDelay);

  console.log(`Fetching device stats for campaign ${campaignId}`);
  const deviceStats = await makeRequest('stats-campaign-device', { campaign: campaignId }, btToken, BT_NETWORK_ID);
  await delay(baseDelay);

  console.log(`Fetching audience stats for campaign ${campaignId}`);
  const audienceStats = await makeRequest('stats-campaign-audience', { campaign: campaignId }, btToken, BT_NETWORK_ID);
  await delay(baseDelay);

  console.log(`Fetching geo stats for campaign ${campaignId}`);
  const geoStats = await makeRequest('stats-campaign-geo', { campaign: campaignId }, btToken, BT_NETWORK_ID);
  await delay(baseDelay);

  console.log(`Fetching geo city stats for campaign ${campaignId}`);
  const geoCityStats = await makeRequest('stats-campaign-geo-city', { campaign: campaignId }, btToken, BT_NETWORK_ID);
  await delay(baseDelay);

  console.log(`Fetching site stats for campaign ${campaignId}`);
  const siteStats = await makeRequest('stats-campaign-site', { campaign: campaignId, startDate, endDate }, btToken, BT_NETWORK_ID);
  await delay(baseDelay);

  console.log(`Fetching hotspot stats for campaign ${campaignId}`);
  const hotspotStats = await makeRequest('stats-campaign-hotspot', { campaign: campaignId }, btToken, BT_NETWORK_ID);
  await delay(baseDelay);

  console.log(`Fetching daily stats for campaign ${campaignId}`);
  const dailyStats = await makeRequest('stats-campaign-day', { campaign: campaignId }, btToken, BT_NETWORK_ID);
  
  console.log(`Completed fetching all stats for campaign ${campaignId}`);

  return {
    basic: basicStats.data.statsCampaign?.[0] || null,
    devices: deviceStats.data.statsCampaignDevice || [],
    audience: audienceStats.data.statsCampaignAudience || [],
    geo: geoStats.data.statsCampaignGeo || [],
    geoCities: geoCityStats.data.statsCampaignGeoCity || [],
    sites: siteStats.data.statsCampaignSites || [],
    hotspots: hotspotStats.data.statsCampaignHotspot || [],
    daily: dailyStats.data.statsCampaignDay || []
  };
}

export const handler: Handler = async (event, context) => {
  try {
    // Parse the request body for year and month
    const requestBody = JSON.parse(event.body || '{}');
    const { year, month } = requestBody;
    
    if (!year || !month) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Year and month are required parameters' })
      };
    }
    
    // Ensure month is between 1 and 12
    if (month < 1 || month > 12) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Month must be between 1 and 12' })
      };
    }

    // Create date objects for the start and end of the specified month
    const targetDate = new Date(year, month - 1, 1); // month is 0-indexed in JS Date
    const startDate = format(startOfMonth(targetDate), 'yyyy-MM-dd');
    const endDate = format(endOfMonth(targetDate), 'yyyy-MM-dd');
    
    console.log(`Syncing historical data for ${year}-${month} (${startDate} to ${endDate})`);
    
    // Get all campaigns (active and inactive)
    const { data: campaigns, error: campaignsError } = await supabase
      .from('campaigns')
      .select('*');

    if (campaignsError) throw campaignsError;
    
    // Get BT credentials and token
    const btToken = await getBidTheatreToken();
    const credentials = await getBidTheatreCredentials();
    
    if (!btToken || !credentials) {
      throw new Error('Failed to get BidTheatre credentials or token');
    }
    
    const BT_NETWORK_ID = credentials.network_id;
    
    console.log(`Processing ${campaigns.length} campaigns for ${year}-${month}`);
    
    // Track successful and failed campaigns
    const results = {
      successful: [] as string[],
      failed: [] as {id: string, reason: string}[]
    };

    // Process each campaign sequentially to avoid rate limits
    for (const campaign of campaigns) {
      try {
        console.log(`Processing campaign ${campaign.id}: ${campaign.name || 'Unnamed'}`);

        // Track all stats for both channels
        const allStats: CampaignStats = {
          display: {
            basic: null,
            devices: [],
            audience: [],
            geo: [],
            geoCities: [],
            sites: [],
            hotspots: [],
            daily: []
          },
          pdooh: {
            basic: null,
            devices: [],
            audience: [],
            geo: [],
            geoCities: [],
            sites: [],
            hotspots: [],
            daily: []
          }
        };

        // Fetch Display channel stats
        if (campaign.display_bt_id) {
          try {
            console.log(`Fetching Display stats for campaign ${campaign.id} with BT ID ${campaign.display_bt_id}`);
            allStats.display = await fetchCampaignStats(btToken, BT_NETWORK_ID, campaign.display_bt_id, startDate, endDate);
            await delay(200);
          } catch (error) {
            console.error(`Error fetching Display stats for campaign ${campaign.id}:`, error);
          }
        }

        // Fetch PDOOH channel stats
        if (campaign.pdooh_bt_id) {
          try {
            console.log(`Fetching PDOOH stats for campaign ${campaign.id} with BT ID ${campaign.pdooh_bt_id}`);
            allStats.pdooh = await fetchCampaignStats(btToken, BT_NETWORK_ID, campaign.pdooh_bt_id, startDate, endDate);
            await delay(200);
          } catch (error) {
            console.error(`Error fetching PDOOH stats for campaign ${campaign.id}:`, error);
          }
        }

        // Calculate viewable rates if available from site stats
        const displayViewableRate = allStats.display.sites.length 
          ? allStats.display.sites.reduce((sum, site) => sum + (site.viewableRate || 0), 0) / allStats.display.sites.length 
          : 0;
        const pdoohViewableRate = allStats.pdooh.sites.length
          ? allStats.pdooh.sites.reduce((sum, site) => sum + (site.viewableRate || 0), 0) / allStats.pdooh.sites.length
          : 0;

        // Upsert into media_costs table
        const { error: upsertError } = await supabase
          .from('media_costs')
          .upsert({
            campaign_id: campaign.id,
            year: year,
            month: month,
            is_monthly_snapshot: true,
            
            // Basic campaign info
            budget_meta: campaign.budget_meta || 0,
            budget_display: campaign.budget_display || 0,
            budget_pdooh: campaign.budget_pdooh || 0,

            // Display channel stats
            impressions_display: allStats.display.basic?.nrImps || 0,
            clicks_display: allStats.display.basic?.nrClicks || 0,
            cost_display: allStats.display.basic?.cost || 0,
            revenue_display: allStats.display.basic?.revenue || 0,
            ctr_display: allStats.display.basic?.CTR || null,
            active_impressions_display: allStats.display.basic?.activeImps || 0,
            viewable_impressions_display: allStats.display.sites.reduce((sum, site) => sum + (site.nrImps || 0), 0) || 0,
            viewable_rate_display: displayViewableRate,
            engagement_rate_display: allStats.display.basic?.engagementRate || null,
            device_stats_display: allStats.display.devices,
            audience_stats_display: allStats.display.audience,
            geo_stats_display: allStats.display.geo,
            geo_city_stats_display: allStats.display.geoCities,
            site_stats_display: allStats.display.sites,
            hotspot_stats_display: allStats.display.hotspots,
            daily_stats_display: allStats.display.daily,

            // PDOOH channel stats
            impressions_pdooh: allStats.pdooh.basic?.nrImps || 0,
            clicks_pdooh: allStats.pdooh.basic?.nrClicks || 0,
            cost_pdooh: allStats.pdooh.basic?.cost || 0,
            revenue_pdooh: allStats.pdooh.basic?.revenue || 0,
            ctr_pdooh: allStats.pdooh.basic?.CTR || null,
            active_impressions_pdooh: allStats.pdooh.basic?.activeImps || 0,
            viewable_impressions_pdooh: allStats.pdooh.sites.reduce((sum, site) => sum + (site.nrImps || 0), 0) || 0,
            viewable_rate_pdooh: pdoohViewableRate,
            engagement_rate_pdooh: allStats.pdooh.basic?.engagementRate || null,
            device_stats_pdooh: allStats.pdooh.devices,
            audience_stats_pdooh: allStats.pdooh.audience,
            geo_stats_pdooh: allStats.pdooh.geo,
            geo_city_stats_pdooh: allStats.pdooh.geoCities,
            site_stats_pdooh: allStats.pdooh.sites,
            hotspot_stats_pdooh: allStats.pdooh.hotspots,
            daily_stats_pdooh: allStats.pdooh.daily
          }, {
            onConflict: 'campaign_id,year,month,is_monthly_snapshot'
          });

        if (upsertError) {
          throw upsertError;
        }
        
        results.successful.push(campaign.id);

      } catch (error: any) {
        console.error(`Error processing campaign ${campaign.id}:`, error);
        results.failed.push({
          id: campaign.id,
          reason: error.message || 'Unknown error'
        });
      }
    }

    // Log success in activity_logs
    await supabase.from('activity_logs').insert({
      action: 'sync_historical_media_costs',
      details: `Synced historical media costs for ${year}-${month}`,
      user_id: 'manual',
      user_email: 'admin@manual.sync'
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ 
        message: `Historical media costs sync completed for ${year}-${month}`,
        summary: {
          total: campaigns.length,
          successful: results.successful.length,
          failed: results.failed.length,
        },
        results
      })
    };

  } catch (error: any) {
    console.error('Error in sync-historical-media-costs function:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to sync historical media costs', 
        details: error.message 
      })
    };
  }
};