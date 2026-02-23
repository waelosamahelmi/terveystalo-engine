import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { format } from 'date-fns';

// Get Supabase credentials from environment variables
function getEnvVar(names) {
  for (const name of names) {
    if (process.env[name]) {
      return process.env[name] || '';
    }
  }
  return '';
}

// Initialize Supabase client
const SUPABASE_URL = getEnvVar([
  'SUPABASE_URL',
  'VITE_SUPABASE_URL',
  'REACT_APP_SUPABASE_URL',
  'NETLIFY_SUPABASE_URL'
]);

const SUPABASE_SERVICE_ROLE_KEY = getEnvVar([
  'SUPABASE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_SERVICE_ROLE_KEY',
  'REACT_APP_SUPABASE_SERVICE_ROLE_KEY',
  'NETLIFY_SUPABASE_SERVICE_ROLE_KEY'
]);

console.log(`Initializing Supabase with URL: ${SUPABASE_URL}`);
console.log(`Anon key available: ${SUPABASE_SERVICE_ROLE_KEY ? 'Yes (starts with: ' + SUPABASE_SERVICE_ROLE_KEY.slice(0, 5) + '...)' : 'No'}`);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Constants
const BT_API_URL = 'https://asx-api.bidtheatre.com/v2.0/api';

// Axios instance for BidTheatre API
const bidTheatreApi = axios.create({
  baseURL: BT_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 60000,
  withCredentials: true,
});

// Fetch BidTheatre credentials from Supabase
async function getBidTheatreCredentials() {
  const { data, error } = await supabase
    .from('bidtheatre_credentials')
    .select('network_id, username, password')
    .order('updated_at', { ascending: false })
    .limit(1)
    .single();

  console.log('Fetched BidTheatre credentials:', { network_id: data?.network_id });

  if (error || !data) {
    throw new Error('Failed to fetch BidTheatre credentials');
  }

  return {
    network_id: data.network_id,
    username: data.username,
    password: data.password,
  };
}

// Authenticate with BidTheatre
async function getBidTheatreToken() {
  const credentials = await getBidTheatreCredentials();
  try {
    console.log(`Attempting to authenticate with BidTheatre using network ID: ${credentials.network_id}`);
    const response = await bidTheatreApi.post('/auth', {
      username: credentials.username,
      password: credentials.password,
    });

    if (!response.data || !response.data.auth || !response.data.auth.token) {
      console.error('Invalid BidTheatre authentication response:', response.data);
      throw new Error('Invalid BidTheatre authentication response structure');
    }

    const token = response.data.auth.token;
    console.log(`Successfully authenticated with BidTheatre, token received (starts with: ${token.substring(0, 10)}...)`);
    return token;
  } catch (error) {
    console.error('Error authenticating with BidTheatre:', error.response?.data || error.message);
    if (error.response?.status === 403) {
      console.error('Authentication failed with 403 Forbidden - check credentials.');
    }
    throw new Error(`BidTheatre authentication failed: ${error.response?.data?.message || error.message}`);
  }
}

// Retry API calls with exponential backoff
const retryWithBackoff = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (axios.isAxiosError(error) && error.response?.status === 429) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }

  throw lastError;
};

// Netlify Background Function handler for pausing campaigns
export async function handler(event) {
  console.log(`Background pause function started at ${new Date().toISOString()}`);

  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        body: JSON.stringify({ error: 'Method Not Allowed' }),
      };
    }

    let payload;
    try {
      payload = JSON.parse(event.body || '{}');
      console.log('Parsed payload:', JSON.stringify(payload, null, 2));
    } catch (err) {
      console.error('Invalid JSON', err);
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Invalid JSON payload', details: err.message }),
      };
    }

    const { campaignId } = payload;

    if (!campaignId) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Missing campaignId in request body' }),
      };
    }

    // Fetch campaign details from Supabase
    let campaignData;
    try {
      const { data, error } = await supabase
        .from('dental_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (error) {
        throw new Error(`Failed to fetch campaign data: ${error.message}`);
      }

      if (!data) {
        throw new Error(`Campaign with ID ${campaignId} not found`);
      }

      campaignData = data;
      console.log(`Fetched campaign data for ID ${campaignId}:`, JSON.stringify(campaignData, null, 2));
    } catch (err) {
      console.error('Error fetching campaign:', err.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch campaign', details: err.message }),
      };
    }

    // Fetch corresponding bidtheatre_campaigns entries
    let bidTheatreCampaigns;
    try {
      const { data, error } = await supabase
        .from('bidtheatre_campaigns')
        .select('*')
        .eq('campaign_id', campaignId);

      if (error) {
        throw new Error(`Failed to fetch bidtheatre_campaigns data: ${error.message}`);
      }

      bidTheatreCampaigns = data || [];
      console.log(`Fetched bidtheatre_campaigns data for campaign ID ${campaignId}:`, JSON.stringify(bidTheatreCampaigns, null, 2));
    } catch (err) {
      console.error('Error fetching bidtheatre_campaigns:', err.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to fetch bidtheatre_campaigns', details: err.message }),
      };
    }

    // Authenticate with BidTheatre
    let btToken;
    try {
      btToken = await getBidTheatreToken();
      if (!btToken) {
        throw new Error('Failed to authenticate with BidTheatre');
      }
    } catch (err) {
      console.error('Error during BidTheatre authentication:', err.message);
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Authentication failed', details: err.message }),
      };
    }

    const credentials = await getBidTheatreCredentials();
    const BT_NETWORK_ID = credentials.network_id;

    // Identify campaigns to pause using bidtheatre_campaigns table
    const campaignIds = bidTheatreCampaigns.map(campaign => ({
      id: campaign.bt_campaign_id,
      type: campaign.channel === 'DISPLAY' ? 'bt_campaign_id_display' : 'bt_campaign_id_pdooh',
    }));

    if (campaignIds.length === 0) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: `No BidTheatre campaigns found for campaign ID ${campaignId}` }),
      };
    }

    console.log(`Campaigns to pause: ${JSON.stringify(campaignIds)}`);

    const pausedCampaigns = [];
    const errors = [];

    for (const { id: campaignId, type } of campaignIds) {
      try {
        console.log(`Attempting to pause campaign ${campaignId} (${type}) using /pause endpoint`);
        const pauseResponse = await retryWithBackoff(() =>
          bidTheatreApi.post(
            `/${BT_NETWORK_ID}/campaign/${campaignId}/pause`,
            {},
            { headers: { Authorization: `Bearer ${btToken}` } }
          )
        );
        console.log(`Paused campaign ${campaignId} (${type}) using /pause endpoint`);
    
        // Update Supabase
        const { error: updateError } = await supabase
          .from('bidtheatre_campaigns')
          .update({
            paused_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq('bt_campaign_id', campaignId);
    
        if (updateError) throw updateError;
    
        pausedCampaigns.push({ campaignId, type });
      } catch (err) {
        console.warn(`Pause endpoint failed for ${campaignId} (${type}): ${err.message}, falling back to cycle update`);
    
        try {
          const cycleResponse = await retryWithBackoff(() =>
            bidTheatreApi.get(`/${BT_NETWORK_ID}/campaign/${campaignId}/cycle`, {
              headers: { Authorization: `Bearer ${btToken}` },
            })
          );
          const cycle = cycleResponse.data.cycles?.[0];
          if (!cycle) {
            errors.push(`No cycle found for campaign ${campaignId} (${type})`);
            console.error(`No cycle found for ${campaignId} (${type})`);
            continue;
          }
    
          const cycleId = cycle.id;
          const endDate = format(new Date(), 'yyyy-MM-dd HH:mm:ss.SSS');
          const cycleUpdatePayload = {
            id: cycle.id,
            startDate: cycle.startDate,
            endDate,
            deliveryUnit: cycle.deliveryUnit,
            showDiffInvoicePopup: cycle.showDiffInvoicePopup,
            amount: cycle.amount,
          };
    
          await retryWithBackoff(() =>
            bidTheatreApi.put(
              `/${BT_NETWORK_ID}/campaign/${campaignId}/cycle/${cycleId}`,
              cycleUpdatePayload,
              { headers: { Authorization: `Bearer ${btToken}` } }
            )
          );
    
          const { error: updateError } = await supabase
            .from('bidtheatre_campaigns')
            .update({
              paused_at: new Date().toISOString(),
              updated_at: new Date().toISOString(),
            })
            .eq('bt_campaign_id', campaignId);
    
          if (updateError) throw updateError;
    
          pausedCampaigns.push({ campaignId, type });
          console.log(`Paused campaign ${campaignId} (${type}) via cycle update`);
        } catch (cycleErr) {
          errors.push(`Failed to pause ${campaignId} (${type}): ${cycleErr.message}`);
          console.error(`Cycle update failed for ${campaignId} (${type}): ${cycleErr.message}`);
        }
      }
    }
    if (pausedCampaigns.length === 0 && errors.length > 0) {
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Failed to pause any campaigns', details: errors }),
      };
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Paused ${pausedCampaigns.length} campaign(s) for campaign ID ${campaignId}`,
        pausedCampaigns,
        errors: errors.length > 0 ? errors : undefined,
      }),
    };
  } catch (err) {
    console.error('Unhandled error in pauseBidTheatreCampaign-background:', err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error', details: err.message }),
    };
  }
}