// ============================================================================
// SUUN TERVEYSTALO - Netlify Function: Create BidTheatre Campaign
// Background function to sync campaigns to BidTheatre API
// ============================================================================

import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

// Environment variables
const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BT_API_URL = 'https://asx-api.bidtheatre.com/v2.0/api';

// Supabase client with service role for admin access
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ============================================================================
// TYPES
// ============================================================================

interface DentalCampaign {
  id: string;
  name: string;
  start_date: string;
  end_date: string | null;
  is_ongoing: boolean;
  total_budget: number;
  budget_meta: number;
  budget_display: number;
  budget_pdooh: number;
  budget_audio: number;
  channel_meta: boolean;
  channel_display: boolean;
  channel_pdooh: boolean;
  channel_audio: boolean;
  headline: string | null;
  subheadline: string | null;
  offer_text: string | null;
  cta_text: string | null;
  landing_url: string;
  creative_type: string;
  target_age_min?: number;
  target_age_max?: number;
  target_genders?: string[];
  campaign_objective: string;
  branch_id: string;
  branch_ids: string[];
  service_id: string;
  service_ids: string[];
  campaign_address?: string;
  campaign_city?: string;
  campaign_postal_code?: string;
  campaign_radius?: number;
  campaign_coordinates?: { lat: number; lng: number };
}

interface BidTheatreCredentials {
  network_id: string;
  username: string;
  password: string;
}

interface BidStrategyTemplate {
  id: number;
  channel: 'DISPLAY' | 'PDOOH';
  rtb_sitelist: number;
  max_cpm: number;
  paused: boolean;
  filterTarget?: number | null;
}

// ============================================================================
// BIDTHEATRE API FUNCTIONS
// ============================================================================

async function getBidTheatreCredentials(): Promise<BidTheatreCredentials> {
  const { data, error } = await supabase
    .from('bidtheatre_credentials')
    .select('network_id, username, password')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) {
    throw new Error('Failed to fetch BidTheatre credentials');
  }

  return data as BidTheatreCredentials;
}

async function getBidTheatreToken(): Promise<string> {
  const credentials = await getBidTheatreCredentials();

  const response = await fetch(`${BT_API_URL}/auth`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      username: credentials.username,
      password: credentials.password,
    }),
  });

  if (!response.ok) {
    throw new Error('Failed to authenticate with BidTheatre');
  }

  const data = await response.json();
  return data.auth?.token || data.token;
}

async function getBidStrategyTemplates(
  token: string,
  networkId: string
): Promise<BidStrategyTemplate[]> {
  const response = await fetch(`${BT_API_URL}/${networkId}/bid-strategy-template`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch bid strategy templates');
  }

  const data = await response.json();
  return data.bidStrategyTemplates || data;
}

async function getRtbSitelists(
  token: string,
  networkId: string
): Promise<{ id: number; name: string }[]> {
  const response = await fetch(`${BT_API_URL}/${networkId}/rtb-sitelist`, {
    headers: { Authorization: `Bearer ${token}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch RTB sitelists');
  }

  const data = await response.json();
  return data.rtbSitelists || [];
}

// ============================================================================
// ASSET UPLOAD TO CLOUDINARY
// ============================================================================

async function uploadCreativeToCloudinary(
  htmlContent: string,
  width: number,
  height: number,
  campaignName: string
): Promise<string> {
  // For now, return a placeholder URL
  // In production, this would upload to Cloudinary and return the URL
  // The actual implementation depends on Cloudinary SDK configuration
  console.log('Cloudinary upload not fully implemented - using placeholder');
  return `https://res.cloudinary.com/your-cloud-name/image/upload/v1/creatives/${campaignName.replace(/\s+/g, '-').toLowerCase()}_${width}x${height}.jpg`;
}

// ============================================================================
// CAMPAIGN CREATION
// ============================================================================

async function createDisplayCampaign(
  campaign: DentalCampaign,
  token: string,
  networkId: string,
  bidStrategyTemplates: BidStrategyTemplate[],
  creativeUrl: string
): Promise<string | null> {
  // Find Display bid strategy template
  const displayTemplate = bidStrategyTemplates.find(t => t.channel === 'DISPLAY' && !t.paused);
  if (!displayTemplate) {
    console.log('No active Display bid strategy template found');
    return null;
  }

  // Calculate budget and impressions
  const dailyBudget = campaign.budget_display / 30; // Approximate

  const campaignData = {
    name: `${campaign.name} - Display`,
    status: 'ACTIVE',
    startDate: campaign.start_date,
    endDate: campaign.end_date,
    budget: {
      dailyBudget,
      totalBudget: campaign.budget_display,
    },
    bidStrategy: {
      templateId: displayTemplate.id,
      maxCpm: displayTemplate.max_cpm,
    },
    targeting: {
      ageMin: campaign.target_age_min || 18,
      ageMax: campaign.target_age_max || 65,
      genders: campaign.target_genders?.includes('all')
        ? ['MALE', 'FEMALE']
        : campaign.target_genders?.map(g => g.toUpperCase() === 'MALE' ? 'MALE' : 'FEMALE') || ['MALE', 'FEMALE'],
    },
    creatives: [
      {
        name: `${campaign.name} - Display Creative`,
        url: creativeUrl,
        width: 300,
        height: 600,
      },
    ],
  };

  const response = await fetch(`${BT_API_URL}/${networkId}/campaign`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(campaignData),
  });

  if (!response.ok) {
    console.error('Failed to create Display campaign:', await response.text());
    return null;
  }

  const result = await response.json();
  return result.campaign?.id || result.id;
}

async function createPdoohCampaign(
  campaign: DentalCampaign,
  token: string,
  networkId: string,
  bidStrategyTemplates: BidStrategyTemplate[],
  rtbSitelists: { id: number; name: string }[],
  creativeUrl: string
): Promise<string | null> {
  // Find PDOOH bid strategy template
  const pdoohTemplate = bidStrategyTemplates.find(t => t.channel === 'PDOOH' && !t.paused);
  if (!pdoohTemplate) {
    console.log('No active PDOOH bid strategy template found');
    return null;
  }

  // Use the RTB sitelist from the template or find a default one
  const sitelistId = pdoohTemplate.rtb_sitelist || rtbSitelists[0]?.id;
  if (!sitelistId) {
    console.log('No RTB sitelist available for PDOOH');
    return null;
  }

  const dailyBudget = campaign.budget_pdooh / 30;

  const campaignData = {
    name: `${campaign.name} - PDOOH`,
    status: 'ACTIVE',
    startDate: campaign.start_date,
    endDate: campaign.end_date,
    budget: {
      dailyBudget,
      totalBudget: campaign.budget_pdooh,
    },
    bidStrategy: {
      templateId: pdoohTemplate.id,
      maxCpm: pdoohTemplate.max_cpm,
    },
    targeting: {
      rtbSitelist: sitelistId,
      ageMin: campaign.target_age_min || 18,
      ageMax: campaign.target_age_max || 65,
    },
    creatives: [
      {
        name: `${campaign.name} - PDOOH Creative`,
        url: creativeUrl,
        width: 1080,
        height: 1920,
      },
    ],
  };

  const response = await fetch(`${BT_API_URL}/${networkId}/campaign`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(campaignData),
  });

  if (!response.ok) {
    console.error('Failed to create PDOOH campaign:', await response.text());
    return null;
  }

  const result = await response.json();
  return result.campaign?.id || result.id;
}

// ============================================================================
// MAIN HANDLER
// ============================================================================

const handler: Handler = async (event) => {
  // Only accept POST requests
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const campaign: DentalCampaign = JSON.parse(event.body || '{}');

    console.log('Creating BidTheatre campaigns for:', campaign.id);

    // Get BidTheatre credentials and authenticate
    const credentials = await getBidTheatreCredentials();
    const token = await getBidTheatreToken();

    // Fetch bid strategy templates and RTB sitelists
    const [bidStrategyTemplates, rtbSitelists] = await Promise.all([
      getBidStrategyTemplates(token, credentials.network_id),
      getRtbSitelists(token, credentials.network_id),
    ]);

    const btCampaignIds: Record<string, string> = {};

    // Upload creatives and create campaigns
    if (campaign.channel_display) {
      const displayCreativeUrl = await uploadCreativeToCloudinary(
        campaign.headline || campaign.name,
        300,
        600,
        campaign.name
      );
      const displayBtId = await createDisplayCampaign(
        campaign,
        token,
        credentials.network_id,
        bidStrategyTemplates,
        displayCreativeUrl
      );
      if (displayBtId) {
        btCampaignIds.display_bt_id = displayBtId;
      }
    }

    if (campaign.channel_pdooh) {
      const pdoohCreativeUrl = await uploadCreativeToCloudinary(
        campaign.headline || campaign.name,
        1080,
        1920,
        campaign.name
      );
      const pdoohBtId = await createPdoohCampaign(
        campaign,
        token,
        credentials.network_id,
        bidStrategyTemplates,
        rtbSitelists,
        pdoohCreativeUrl
      );
      if (pdoohBtId) {
        btCampaignIds.pdooh_bt_id = pdoohBtId;
      }
    }

    // Update campaign with BT IDs and sync status
    const updateData: Record<string, string | number | boolean | null> = {
      bt_sync_status: 'synced',
      bt_last_sync: new Date().toISOString(),
      ...btCampaignIds,
    };

    // If at least one campaign was created successfully, set to active
    if (Object.keys(btCampaignIds).length > 0) {
      updateData.status = 'active';
    } else {
      updateData.bt_sync_status = 'failed';
      updateData.bt_sync_error = 'No campaigns were created in BidTheatre';
    }

    const { error: updateError } = await supabase
      .from('dental_campaigns')
      .update(updateData)
      .eq('id', campaign.id);

    if (updateError) {
      console.error('Failed to update campaign with BT IDs:', updateError);
    }

    console.log('BidTheatre campaigns created successfully:', btCampaignIds);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        btCampaignIds,
        syncStatus: updateData.bt_sync_status,
      }),
    };

  } catch (error) {
    console.error('Error in createBidTheatreCampaign-background:', error);

    // Try to update campaign with error status
    try {
      const campaign: DentalCampaign = JSON.parse(event.body || '{}');
      await supabase
        .from('dental_campaigns')
        .update({
          bt_sync_status: 'failed',
          bt_sync_error: error instanceof Error ? error.message : 'Unknown error',
          status: 'draft',
        })
        .eq('id', campaign.id);
    } catch (updateError) {
      console.error('Failed to update campaign error status:', updateError);
    }

    return {
      statusCode: 500,
      body: JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};

export { handler };
