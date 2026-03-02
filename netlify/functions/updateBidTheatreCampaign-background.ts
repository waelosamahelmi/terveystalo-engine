// ============================================================================
// SUUN TERVEYSTALO - Netlify Function: Update BidTheatre Campaign
// Background function to update existing campaigns in BidTheatre API
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
  total_budget: number;
  budget_meta: number;
  budget_display: number;
  budget_pdooh: number;
  channel_meta: boolean;
  channel_display: boolean;
  channel_pdooh: boolean;
  display_bt_id?: string | null;
  pdooh_bt_id?: string | null;
  target_age_min?: number;
  target_age_max?: number;
  target_genders?: string[];
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

async function updateBidTheatreCampaign(
  token: string,
  networkId: string,
  btCampaignId: string,
  updates: Partial<DentalCampaign>
): Promise<boolean> {
  const updateData: Record<string, unknown> = {};

  if (updates.name) {
    updateData.name = updates.name;
  }

  if (updates.start_date) {
    updateData.startDate = updates.start_date;
  }

  if (updates.end_date) {
    updateData.endDate = updates.end_date;
  }

  if (updates.budget_display !== undefined) {
    updateData.budget = {
      dailyBudget: updates.budget_display / 30,
      totalBudget: updates.budget_display,
    };
  }

  if (updates.budget_pdooh !== undefined) {
    updateData.budget = {
      dailyBudget: updates.budget_pdooh / 30,
      totalBudget: updates.budget_pdooh,
    };
  }

  if (Object.keys(updateData).length === 0) {
    return true; // Nothing to update
  }

  const response = await fetch(`${BT_API_URL}/${networkId}/campaign/${btCampaignId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(updateData),
  });

  if (!response.ok) {
    console.error(`Failed to update BT campaign ${btCampaignId}:`, await response.text());
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
    const campaign: DentalCampaign = JSON.parse(event.body || '{}');

    if (!campaign.id) {
      return { statusCode: 400, body: 'Missing campaign id' };
    }

    console.log('Updating BidTheatre campaigns for:', campaign.id);

    // Get BidTheatre credentials and authenticate
    const token = await getBidTheatreToken();
    const credentials = await getBidTheatreCredentials();

    const results: Record<string, boolean> = {};

    // Update Display campaign if exists
    if (campaign.display_bt_id && campaign.channel_display) {
      results.display = await updateBidTheatreCampaign(
        token,
        credentials.network_id,
        campaign.display_bt_id,
        {
          name: campaign.name,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          budget_display: campaign.budget_display,
        }
      );
    }

    // Update PDOOH campaign if exists
    if (campaign.pdooh_bt_id && campaign.channel_pdooh) {
      results.pdooh = await updateBidTheatreCampaign(
        token,
        credentials.network_id,
        campaign.pdooh_bt_id,
        {
          name: campaign.name,
          start_date: campaign.start_date,
          end_date: campaign.end_date,
          budget_pdooh: campaign.budget_pdooh,
        }
      );
    }

    // Update sync status
    const atLeastOneUpdated = Object.values(results).some(r => r);
    await supabase
      .from('dental_campaigns')
      .update({
        bt_sync_status: atLeastOneUpdated ? 'synced' : 'partial',
        bt_last_sync: new Date().toISOString(),
      })
      .eq('id', campaign.id);

    console.log('BidTheatre campaigns update results:', results);

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: atLeastOneUpdated,
        results,
      }),
    };

  } catch (error) {
    console.error('Error in updateBidTheatreCampaign-background:', error);

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
