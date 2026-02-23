import axios from 'axios';
import { supabase } from './supabase';

// Constants
const BT_API_URL = 'https://asx-api.bidtheatre.com/v2.0/api';

// Axios instance for BidTheatre API
export const bidTheatreApi = axios.create({
  baseURL: BT_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 60000,
  withCredentials: true,
});

interface BidTheatreCredentials {
  network_id: string;
  username: string;
  password: string;
}

// Fetch BidTheatre credentials from Supabase
export async function getBidTheatreCredentials(): Promise<BidTheatreCredentials> {
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

// Fetch RTB Sitelists from BidTheatre
export async function getRtbSitelists(): Promise<{ id: number; name: string }[]> {
  let btToken = await getBidTheatreToken();
  if (!btToken) {
    throw new Error('Failed to authenticate with BidTheatre');
  }

  const credentials = await getBidTheatreCredentials();
  const BT_NETWORK_ID = credentials.network_id;

  try {
    const response = await bidTheatreApi.get(`/${BT_NETWORK_ID}/rtb-sitelist`, {
      headers: { Authorization: `Bearer ${btToken}` },
    });

    console.log(`Fetched RTB sitelists for network ${BT_NETWORK_ID}`);

    if (response.data && response.data.code && response.data.code !== 200) {
      throw new Error(`BidTheatre API error: ${response.data.error || 'Unknown error'}`);
    }

    let rtbSitelists = response.data;
    if (response.data && typeof response.data === 'object' && 'rtbSitelists' in response.data) {
      rtbSitelists = response.data.rtbSitelists;
    } else {
      throw new Error('RTB Sitelists response does not contain rtbSitelists property');
    }

    console.log(`Validated RTB sitelists response: ${rtbSitelists.length} sitelists found`);

    if (!Array.isArray(rtbSitelists)) {
      throw new Error('RTB Sitelists response is not an array');
    }

    const mappedSitelists = rtbSitelists.map((sitelist: any) => {
      if (!sitelist.id || !sitelist.name) {
        throw new Error(`Invalid RTB Sitelist: missing id or name - ${JSON.stringify(sitelist)}`);
      }
      return {
        id: sitelist.id,
        name: sitelist.name,
      };
    });

    console.log(`Mapped RTB sitelists: ${mappedSitelists.length} sitelists`);

    return mappedSitelists;
  } catch (error) {
    throw new Error('Failed to fetch RTB Sitelists');
  }
}
// Fetch filter targets from BidTheatre
export async function getFilterTargets(): Promise<{ id: number; name: string }[]> {
  let btToken = await getBidTheatreToken();
  if (!btToken) {
    throw new Error('Failed to authenticate with BidTheatre');
  }

  const credentials = await getBidTheatreCredentials();
  const BT_NETWORK_ID = credentials.network_id;

  try {
    const response = await bidTheatreApi.get(`/${BT_NETWORK_ID}/filter-target`, {
      headers: { Authorization: `Bearer ${btToken}` },
    });

    console.log(`Fetched filter targets for network ${BT_NETWORK_ID}`);

    if (response.data && response.data.code && response.data.code !== 200) {
      throw new Error(`BidTheatre API error: ${response.data.error || 'Unknown error'}`);
    }

    let filterTargets = response.data;
    if (response.data && typeof response.data === 'object' && 'filterTargets' in response.data) {
      filterTargets = response.data.filterTargets;
    } else {
      throw new Error('Filter targets response does not contain filterTargets property');
    }

    console.log(`Validated filter targets response: ${filterTargets.length} targets found`);

    if (!Array.isArray(filterTargets)) {
      throw new Error('Filter targets response is not an array');
    }

    const mappedTargets = filterTargets.map((target: any) => {
      if (!target.id || !target.name) {
        throw new Error(`Invalid filter target: missing id or name - ${JSON.stringify(target)}`);
      }
      return {
        id: target.id,
        name: target.name,
      };
    });

    console.log(`Mapped filter targets: ${mappedTargets.length} targets`);

    return mappedTargets;
  } catch (error) {
    throw new Error('Failed to fetch filter targets');
  }
}

// Authenticate with BidTheatre and get token
export async function getBidTheatreToken(): Promise<string | null> {
  const credentials = await getBidTheatreCredentials();
  try {
    const response = await bidTheatreApi.post('/auth', {
      username: credentials.username,
      password: credentials.password,
    });
    const token = response.data?.auth?.token;
    if (!token) {
      return null;
    }
    return token;
  } catch (error) {
    return null;
  }
}

// Get campaign details from BidTheatre
export const getBidTheatreCampaign = async (
  btCampaignId: string
): Promise<{ success: boolean; campaign?: any; error?: string }> => {
  const btToken = await getBidTheatreToken();
  if (!btToken) {
    return { success: false, error: 'Failed to authenticate with BidTheatre' };
  }

  const credentials = await getBidTheatreCredentials();
  const BT_NETWORK_ID = credentials.network_id;

  try {
    const response = await bidTheatreApi.get(`/${BT_NETWORK_ID}/campaign/${btCampaignId}`, {
      headers: { Authorization: `Bearer ${btToken}` },
    });

    return { success: true, campaign: response.data.campaign };
  } catch (error) {
    return { success: false, error: error.message };
  }
};
