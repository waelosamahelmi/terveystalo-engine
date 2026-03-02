// ============================================================================
// SUUN TERVEYSTALO - Netlify Function: Pause BidTheatre Campaign
// Background function to pause campaigns in BidTheatre API
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

interface PauseRequest {
  campaignId: string;
}

interface BidTheatreCredentials {
  network_id: string;
  username: string;
  password: string;
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

async function pauseBidTheatreCampaign(
  token: string,
  networkId: string,
  btCampaignId: string
): Promise<boolean> {
  const response = await fetch(`${BT_API_URL}/${networkId}/campaign/${btCampaignId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      status: 'PAUSED',
    }),
  });

  if (!response.ok) {
    console.error(`Failed to pause BT campaign ${btCampaignId}:`, await response.text());
    return false;
  }

  return true;
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
    const { campaignId }: PauseRequest = JSON.parse(event.body || '{}');

    if (!campaignId) {
      return { statusCode: 400, body: 'Missing campaignId' };
    }

    console.log('Pausing BidTheatre campaigns for:', campaignId);

    // Fetch campaign to get BT IDs
    const { data: campaign, error: fetchError } = await supabase
      .from('dental_campaigns')
      .select('display_bt_id, pdooh_bt_id')
      .eq('id', campaignId)
      .single();

    if (fetchError || !campaign) {
      return { statusCode: 404, body: 'Campaign not found' };
    }

    // Get BidTheatre credentials and authenticate
    const token = await getBidTheatreToken();
    const credentials = await getBidTheatreCredentials();

    const results: Record<string, boolean> = {};

    // Pause Display campaign if exists
    if (campaign.display_bt_id) {
      results.display = await pauseBidTheatreCampaign(
        token,
        credentials.network_id,
        campaign.display_bt_id
      );
    }

    // Pause PDOOH campaign if exists
    if (campaign.pdooh_bt_id) {
      results.pdooh = await pauseBidTheatreCampaign(
        token,
        credentials.network_id,
        campaign.pdooh_bt_id
      );
    }

    // Update sync status
    const atLeastOnePaused = Object.values(results).some(r => r);
    await supabase
      .from('dental_campaigns')
      .update({
        bt_sync_status: atLeastOnePaused ? 'synced' : 'partial',
        bt_last_sync: new Date().toISOString(),
      })
      .eq('id', campaignId);

    console.log('BidTheatre campaigns pause results:', results);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: atLeastOnePaused,
        results,
      }),
    };

  } catch (error) {
    console.error('Error in pauseBidTheatreCampaign-background:', error);

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
