import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import { parseISO, format, addMonths } from 'date-fns';
import fetch from 'node-fetch';
import { v2 as cloudinary } from 'cloudinary';

// Get Supabase credentials from environment variables
function getEnvVar(names: string[]): string {
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

const SUPABASE_ANON_KEY = getEnvVar([
  'SUPABASE_ANON_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'REACT_APP_SUPABASE_ANON_KEY',
  'NETLIFY_SUPABASE_ANON_KEY'
]);

console.log(`Initializing Supabase with URL: ${SUPABASE_URL}`);
console.log(`Anon key available: ${SUPABASE_ANON_KEY ? 'Yes (starts with: ' + SUPABASE_ANON_KEY.slice(0, 5) + '...)' : 'No'}`);

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Constants
const BT_API_URL = 'https://asx-api.bidtheatre.com/v2.0/api';
const CREATOPY_API_URL = 'https://api.creatopy.com/v1';
const CREATOPY_CLIENT_ID = '5b324250-8429-443b-bc11-dff33c472c89';
const CREATOPY_CLIENT_SECRET = 'eb427fff-2ad7-40fe-b2fd-5c919bc27f4e';

// Backup Content URLs for each ad size - Suun Terveystalo branded
const backupContentURLs = {
  '1080x1920': 'https://norr3.fi/ST-backup-1080x1920.jpg',
  '980x400': 'https://norr3.fi/ST-backup-980x400.jpg',
  '620x891': 'https://norr3.fi/ST-backup-620x891.jpg',
  '300x600': 'https://norr3.fi/ST-backup-300x600.jpg',
  '300x431': 'https://norr3.fi/ST-backup-300x431.jpg',
  '300x300': 'https://norr3.fi/ST-backup-300x300.jpg',
};

// Axios instances
const bidTheatreApi = axios.create({
  baseURL: BT_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 60000,
  withCredentials: true,
});

const creatopyApi = axios.create({
  baseURL: CREATOPY_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000,
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

// Fetch advertiser_id from the user
async function getAdvertiserIdFromUser(userId) {
  try {
    if (!userId) {
      console.log('No user ID provided, using default advertiser_id');
      return 22717;
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('advertiser_id')
      .eq('id', userId)
      .limit(1);

    if (userError) {
      console.error('Error fetching user data:', userError.message);
      return 22717;
    }

    if (!userData || userData.length === 0) {
      console.log('No user data found for user_id:', userId);
      return 22717;
    }

    if (userData.length > 1) {
      console.warn('Multiple users found for user_id:', userId, 'Using the first one');
    }

    const user = userData[0];
    if (!user.advertiser_id) {
      console.log('User has no advertiser_id, using default value');
      return 22717;
    }

    console.log(`Fetched advertiser_id ${user.advertiser_id} for user ${userId}`);
    return user.advertiser_id;
  } catch (error) {
    console.error('Error fetching advertiser_id from user:', error);
    return 22717;
  }
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

// Authenticate with Creatopy
async function getCreatopyToken() {
  try {
    const response = await creatopyApi.post('/auth/token', {
      clientId: CREATOPY_CLIENT_ID,
      clientSecret: CREATOPY_CLIENT_SECRET,
    });
    const token = response.data?.token;
    if (!token) {
      return null;
    }
    return token;
  } catch (error) {
    console.error('Error authenticating with Creatopy:', error);
    return null;
  }
}

// Fetch bid strategy templates
async function getBidStrategyTemplates(channel) {
  const { data, error } = await supabase
    .from('bidtheatre_bid_strategies')
    .select('*')
    .eq('channel', channel);

  console.log(`Fetched bid strategy templates for channel ${channel}: ${data?.length || 0} templates`);

  if (error) {
    throw new Error(`Failed to fetch bid strategy templates for ${channel}`);
  }

  return data;
}

// Format date for BidTheatre (YYYY-MM-DD)
function formatDateForBidTheatre(dateStr) {
  if (!dateStr) {
    throw new Error('Date string is undefined or null');
  }

  try {
    const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (isoDatePattern.test(dateStr)) {
      console.log(`Formatting ISO date: ${dateStr}`);
      const parsedDate = parseISO(dateStr);
      if (isNaN(parsedDate.getTime())) {
        throw new Error(`Invalid ISO date: ${dateStr}`);
      }
      console.log(`Parsed ISO date: ${dateStr} -> ${parsedDate}`);
      return format(parsedDate, 'yyyy-MM-dd');
    }

    const datePattern = /^\d{2}\/\d{2}\/\d{4}$/;
    if (datePattern.test(dateStr)) {
      console.log(`Formatting dd/MM/yyyy date: ${dateStr}`);
      const [day, month, year] = dateStr.split('/');
      if (!day || !month || !year) {
        throw new Error(`Failed to parse date: ${dateStr}. Expected format: dd/MM/yyyy`);
      }
      return `${year}-${month}-${day}`;
    }

    throw new Error(`Invalid date format: ${dateStr}. Expected formats: YYYY-MM-DD or dd/MM/yyyy`);
  } catch (error) {
    throw new Error(`Date parsing error: ${error.message}`);
  }
}

// Convert meters to kilometers
function convertMetersToKm(meters) {
  const km = meters / 1000;
  const result = Math.ceil(km);
  console.log(`Converted ${meters} meters to ${result} kilometers`);
  return result;
}

// Fetch apartment keys
async function fetchApartmentKeys(campaignId) {
  try {
    const { data, error } = await supabase
      .from('campaign_apartments')
      .select('apartment_key')
      .eq('campaign_id', campaignId);

    console.log(`Fetched apartment keys for campaign ${campaignId}: ${data?.length || 0} keys`);

    if (error) {
      throw error;
    }

    const apartmentKeys = data.map(row => row.apartment_key.toString());
    console.log(`Extracted apartment keys: ${JSON.stringify(apartmentKeys)}`);
    return apartmentKeys;
  } catch (error) {
    console.error(`Error fetching apartment keys for campaign ${campaignId}:`, error);
    return [];
  }
}

// Fetch apartment details
async function fetchApartmentDetails(apartmentKeys) {
  if (!apartmentKeys || apartmentKeys.length === 0) {
    console.log('No apartment keys provided to fetchApartmentDetails');
    return [];
  }

  try {
    console.log(`Fetching details for ${apartmentKeys.length} apartments with keys:`, apartmentKeys);

    // First attempt: Bulk query
    const { data, error } = await supabase
      .from('apartments')
      .select('*')
      .in('key', apartmentKeys);

    if (error) {
      console.error('Error fetching apartment details (bulk query):', error.message);
      throw error;
    }

    console.log(`Fetched ${data?.length || 0} apartments out of ${apartmentKeys.length} requested`);

    let fetchedApartments = data || [];

    // If not all apartments were found, try individual queries
    if (fetchedApartments.length < apartmentKeys.length) {
      console.log('Not all apartments were found, trying individual queries');

      const foundKeys = fetchedApartments.map(apt => String(apt.key));
      const missingKeys = apartmentKeys.filter(key => !foundKeys.includes(String(key)));

      console.log(`Missing ${missingKeys.length} apartment keys:`, missingKeys);

      for (const key of missingKeys) {
        console.log(`Trying individual query for apartment key: ${key}`);
        const { data: singleData, error: singleError } = await supabase
          .from('apartments')
          .select('*')
          .eq('key', key);

        if (singleError) {
          console.warn(`Could not fetch apartment with key ${key}:`, singleError.message);
          continue;
        }

        if (singleData && singleData.length === 0) {
          console.warn(`No apartment found with key ${key}`);
          continue;
        }

        if (singleData && singleData.length > 1) {
          console.warn(`Multiple apartments found with key ${key}, using the first one`);
          fetchedApartments.push(singleData[0]);
        } else if (singleData && singleData.length === 1) {
          console.log(`Found apartment with key ${key} on individual query`);
          fetchedApartments.push(singleData[0]);
        }
      }
    }

    console.log('Fetched apartment data:', JSON.stringify(fetchedApartments, null, 2));

    return fetchedApartments;
  } catch (error) {
    console.error('Exception in fetchApartmentDetails:', error);
    return [];
  }
}

// Poll Creatopy export
async function pollCreatopyExport(exportId, creatopyToken, maxAttempts = 15, initialDelayMs = 1500) {
  let delayMs = initialDelayMs;

  console.log(`Starting to poll Creatopy export for ID ${exportId}, max attempts: ${maxAttempts}`);

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const exportFetchResponse = await creatopyApi.get(`/export/${exportId}`, {
      headers: { Authorization: `Bearer ${creatopyToken}` },
    });

    console.log(`Fetched Creatopy export response for ID ${exportId}, attempt ${attempt}: ${JSON.stringify(exportFetchResponse.data)}`);

    const exportData = exportFetchResponse.data.response;

    if (!exportData || !exportData.creatives || exportData.creatives.length === 0) {
      throw new Error(`Invalid Creatopy export response for ID ${exportId}: ${JSON.stringify(exportFetchResponse.data)}`);
    }

    const status = exportData.status;
    const videoUrl = exportData.creatives[0].url;

    if (status === 'complete' && videoUrl) {
      console.log(`Creatopy export completed for ID ${exportId}, video URL: ${videoUrl}`);
      return videoUrl;
    }

    if (status === 'failed' || exportData.errorLog) {
      throw new Error(`Creatopy export failed for ID ${exportId}: ${exportData.errorLog || 'Unknown error'}`);
    }

    console.log(`Creatopy export status for ID ${exportId}: ${status}, waiting ${delayMs}ms before next attempt`);

    await new Promise(resolve => setTimeout(resolve, delayMs));

    delayMs = Math.min(delayMs * 1.5, 5000);
  }

  throw new Error(`Creatopy export did not complete after ${maxAttempts} attempts for export ID ${exportId}`);
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

/**
 * Uploads a video to Cloudinary and sends the URL to BidTheatre
 * @param {string} videoUrl - The URL of the video to upload
 * @param {number} linearId - The BidTheatre linear ID
 * @param {string} btToken - The BidTheatre auth token
 * @param {string} networkId - The BidTheatre network ID
 * @param {number} campaignId - The campaign ID for folder structure
 * @param {string} aptKey - The apartment key for video naming
 * @returns {Promise<{success: boolean, output?: string, error?: string}>}
 */
async function downloadAndUploadVideo(videoUrl, linearId, btToken, networkId, campaignId, aptKey) {
  const maxRetries = 3;
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      cloudinary.config({
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      });

      console.log(`Uploading video (attempt ${attempt}) to Cloudinary from ${videoUrl} for campaign ${campaignId}, apartment ${aptKey}`);
      const uploadResult = await cloudinary.uploader.upload(videoUrl, {
        resource_type: 'video',
        public_id: aptKey,
        folder: `bidtheatre-videos/${campaignId}`,
        overwrite: true,
      });
      console.log(`Video uploaded to Cloudinary, public URL: ${uploadResult.secure_url}`);

      const payload = {
        url: uploadResult.secure_url,
        delivery: 'progressive',
        bitRate: 5901,
        mimeType: 'video/mp4',
        duration: '00:00:10',
        dimension: 216,
        scalable: false,
        maintainRatio: false,
      };

      console.log(`Sending video URL to BidTheatre for linear ID ${linearId}`);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);
      const uploadResponse = await fetch(
        `https://asx-api.bidtheatre.com/v2.0/api/${networkId}/video-linear/${linearId}/media`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${btToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
        }
      );
      clearTimeout(timeoutId);

      const responseData = await uploadResponse.json();
      if (!uploadResponse.ok) {
        throw new Error(`Request failed with status ${uploadResponse.status}: ${JSON.stringify(responseData)}`);
      }

      console.log('BidTheatre upload response:', JSON.stringify(responseData, null, 2));
      return { success: true, output: JSON.stringify(responseData) };
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${attempt} failed for apartment ${aptKey}:`, error.message);
      if (attempt < maxRetries) {
        await new Promise(resolve => setTimeout(resolve, 1000 * Math.pow(2, attempt - 1)));
      }
    }
  }

  console.error(`All retries failed for apartment ${aptKey}:`, lastError.message);
  return {
    success: false,
    error: lastError.message,
    stderr: lastError.message,
  };
}

async function uploadAndCreateVideoAd(
  BT_NETWORK_ID: string,
  btToken: string,
  videoLinearId: number,
  videoUrl: string,
  campaignId: number,
  campaignAddress: string,
  backupUrl: string,
  aptKey: string // Add aptKey parameter
): Promise<number> {
  try {
    // Create the video ad
    console.log(`Creating video ad for campaign ${campaignId}, apartment ${aptKey} at: ${new Date().toISOString()}`);
    const { data: adResp } = await bidTheatreApi.post(
      `/${BT_NETWORK_ID}/ad`,
      {
        campaign: campaignId,
        name: `${aptKey} - ${campaignAddress}`, // Use aptKey instead of videoLinearId
        adType: 'Video ad',
        adStatus: 'Active',
        isSecure: true,
        dimension: 385,
        backupContentURL: backupUrl
      },
      { headers: { Authorization: `Bearer ${btToken}` } }
    );
    console.log('✔️ Video ad created:', adResp);

    // Attach the creative
    console.log(`Attaching video creative to ad ${adResp.ad.id} at: ${new Date().toISOString()}`);
    await bidTheatreApi.post(
      `/${BT_NETWORK_ID}/ad/${adResp.ad.id}/video-creative`,
      { sequence: 1, videoCreative: videoLinearId },
      { headers: { Authorization: `Bearer ${btToken}` } }
    );
    console.log('✔️ Video creative attached to ad:', adResp.ad.id);

    return adResp.ad.id;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      console.error(`Error in uploadAndCreateVideoAd for video linear ID ${videoLinearId}:`, error.response?.data?.message || error.message);
      console.error('Full error details:', error.response?.data);
      throw new Error(`Failed in uploadAndCreateVideoAd: ${error.response?.data?.message || error.message}`);
    }
    console.error(`Unexpected error in uploadAndCreateVideoAd for video linear ID ${videoLinearId}:`, error);
    throw error;
  }
}


// Create a campaign in BidTheatre
const createBidTheatreCampaign = async (campaign) => {
  try {
    // Fetch tokens at the beginning to ensure they're fresh
    console.log(`Starting BidTheatre campaign creation for ${campaign.id} at: ${new Date().toISOString()}`);
    let btToken = await getBidTheatreToken();
    if (!btToken) {
      return { success: false, error: 'Failed to authenticate with BidTheatre' };
    }
    console.log(`Successfully retrieved BidTheatre token at: ${new Date().toISOString()}`);

    let creatopyToken = await getCreatopyToken();
    if (!creatopyToken) {
      return { success: false, error: 'Failed to authenticate with Creatopy' };
    }
    console.log(`Successfully retrieved Creatopy token at: ${new Date().toISOString()}`);

    const credentials = await getBidTheatreCredentials();
    console.log(`Fetched BidTheatre credentials for network ${credentials.network_id}`);

    const BT_NETWORK_ID = credentials.network_id;

    const advertiserId = await getAdvertiserIdFromUser(campaign.user_id);
    console.log(`Using advertiser_id: ${advertiserId} for campaign ${campaign.id}`);
    const advertiserIdInt = parseInt(advertiserId.toString(), 10);
    console.log(`Using advertiser_id: ${advertiserIdInt} for campaign ${campaign.id}`);

    const channels: Channel[] = [];
    if (campaign.channel_display) channels.push({ channel: 'DISPLAY', btCampaignId: '' });
    if (campaign.channel_pdooh) channels.push({ channel: 'PDOOH', btCampaignId: '' });

    console.log(`Determined channels for campaign ${campaign.id}: ${channels.map(c => c.channel).join(', ')}`);

    if (channels.length === 0) {
      return { success: true, error: 'No BidTheatre channels selected' };
    }

    const apartmentKeys: string[] = campaign.apartment_keys || campaign.apartmentKeys || [];
    console.log(`Using apartment keys for campaign ${campaign.id}: ${JSON.stringify(apartmentKeys)}`);

    const apartments = await fetchApartmentDetails(apartmentKeys);
    console.log(`Fetched apartment details for campaign ${campaign.id}: ${apartments.length} apartments`);

    const campaignIds = {};
    let overallSuccess = true;
    let overallError = '';

    for (const channel of channels) {
      console.log(`Starting campaign creation for channel ${channel.channel}, campaign ${campaign.id} at: ${new Date().toISOString()}`);

      let btCampaignId;
      let adGroupIds = {};
      let adIds = {};
      let videoLinearIds = {};
      let isOngoing = false;
      let geoTargetId;
      let geoTargetCoordinatesId;

      try {
        const campaignPayload = {
          name: `ST / ${channel.channel} / ${campaign.id}`,
          advertiser: advertiserIdInt,
          campaignManager: credentials.username,
          campaignKPI: 3,
          defaultLineItem: 295489,
          targetURL: 'https://terveystalo.com/suunterveystalo',
          defaultGeoTarget: null,
          expectedTotalImps: channel.channel === 'DISPLAY' ? 8422 : 12500,
          deliveryPriority: 'even',
          defaultFilterTarget: channel.channel === 'DISPLAY' ? 22418 : 32491,
          defaultOptimizationStrategy: channel.channel === 'DISPLAY' ? 538 : 519,
          allowWideTargeting: false,
          renderOBA: false,
          takeScreenshots: false,
        };

        const campaignResponse = await retryWithBackoff(() =>
          bidTheatreApi.post(`/${BT_NETWORK_ID}/campaign`, campaignPayload, {
            headers: { Authorization: `Bearer ${btToken}` },
          })
        );
        btCampaignId = campaignResponse.data.campaign.id;
        campaignIds[channel.channel] = btCampaignId;

        console.log(`Created campaign for channel ${channel.channel}, campaign ${campaign.id}, BidTheatre ID: ${btCampaignId} at: ${new Date().toISOString()}`);

        await retryWithBackoff(() =>
          bidTheatreApi.post(`/${BT_NETWORK_ID}/campaign/${btCampaignId}/category`, { category: 3 }, {
            headers: { Authorization: `Bearer ${btToken}` },
          })
        );
        console.log(`Set category for campaign ${btCampaignId}, channel ${channel.channel} at: ${new Date().toISOString()}`);

        const budget = channel.channel === 'DISPLAY' ? campaign.budget_display : campaign.budget_pdooh;
        if (budget == null || budget <= 0) {
          throw new Error(`Invalid budget for ${channel.channel}: ${budget}. Budget must be a positive number.`);
        }
        console.log(`Validated budget for channel ${channel.channel}: ${budget} at: ${new Date().toISOString()}`);

        isOngoing = !campaign.campaign_end_date || campaign.campaign_end_date.toUpperCase() === 'ONGOING';
        let endDate: string;
        if (isOngoing) {
          const startDate = parseISO(formatDateForBidTheatre(campaign.campaign_start_date));
          const initialEndDate = addMonths(startDate, 1);
          endDate = format(initialEndDate, 'yyyy-MM-dd');
        } else {
          endDate = formatDateForBidTheatre(campaign.campaign_end_date);
        }
        console.log(`Determined end date for campaign ${campaign.id}, channel ${channel.channel}: ${endDate} at: ${new Date().toISOString()}`);

        const cyclePayload = {
          startDate: formatDateForBidTheatre(campaign.campaign_start_date),
          endDate: endDate,
          deliveryUnit: 'Budget',
          amount: budget,
          showDiffInvoicePopup: false,
        };

        try {
          await retryWithBackoff(() =>
            bidTheatreApi.post(`/${BT_NETWORK_ID}/campaign/${btCampaignId}/cycle`, cyclePayload, {
              headers: { Authorization: `Bearer ${btToken}` },
            })
          );
          console.log(`Set cycle for campaign ${btCampaignId}, channel ${channel.channel} at: ${new Date().toISOString()}`);
        } catch (cycleError) {
          throw new Error(`Failed to set cycle for ${channel.channel}: ${cycleError.message}`);
        }

        const adGroups = channel.channel === 'DISPLAY' ? [
          { name: 'Mobile sizes', sizes: ['300x600', '300x431'], autoAddAds: false },
          { name: 'Small desktop', sizes: ['300x600', '300x300'], autoAddAds: false },
          { name: 'Large desktop sizes', sizes: ['620x891', '980x400'], autoAddAds: false },
        ] : [{ name: 'Default campaign', sizes: ['1080x1920'], autoAddAds: false }];

        for (const adGroup of adGroups) {
          const adGroupPayload = {
            name: adGroup.name,
            campaign: btCampaignId,
            autoAddAds: adGroup.autoAddAds,
          };
          const adGroupResponse = await retryWithBackoff(() =>
            bidTheatreApi.post(`/${BT_NETWORK_ID}/adgroup`, adGroupPayload, {
              headers: { Authorization: `Bearer ${btToken}` },
            })
          );
          adGroupIds[adGroup.name] = adGroupResponse.data.adgroup.id;
          console.log(`Created ad group ${adGroup.name} for campaign ${btCampaignId}, channel ${channel.channel}, ad group ID: ${adGroupIds[adGroup.name]} at: ${new Date().toISOString()}`);
        }

        for (const adGroup of adGroups) {
          adIds[adGroup.name] = [];
        }
        console.log(`Initialized ad IDs for ad groups: ${JSON.stringify(Object.keys(adIds))} at: ${new Date().toISOString()}`);

        if (channel.channel === 'PDOOH' && (!apartmentKeys || apartmentKeys.length === 0)) {
          throw new Error('PDOOH requires at least one apartment key');
        }

        if (channel.channel === 'DISPLAY') {
          const adConfigs = {
            '300x300': { hash: 'PENDING', width: 300, height: 300 },  // TODO: Update hash when Creatopy template ready
            '300x431': { hash: 'g3jo2pn', width: 300, height: 431 },
            '300x600': { hash: '11jp13n', width: 300, height: 600 },
            '620x891': { hash: 'mqopyyq', width: 620, height: 891 },
            '980x400': { hash: '58z5ylw', width: 980, height: 400 },
          };

          if (!apartmentKeys || apartmentKeys.length === 0) {
            overallError += `No ads created for ${channel.channel} due to missing apartment keys\n`;
            console.log(`No ads created for channel ${channel.channel} due to missing apartment keys at: ${new Date().toISOString()}`);
          } else {
            for (const aptKey of apartmentKeys) {
              const apartment = apartments.find(apt => apt.key === aptKey);
              if (!apartment) {
                overallError += `Apartment ${aptKey} not found for ${channel.channel}\n`;
                console.log(`Apartment ${aptKey} not found for channel ${channel.channel} at: ${new Date().toISOString()}`);
                continue;
              }
              for (const adGroup of adGroups) {
                for (const size of adGroup.sizes) {
                  const config = adConfigs[size];
                  const adPayload = {
                    campaign: btCampaignId,
                    name: `${aptKey} - ${size}`,
                    adType: 'HTML banner',
                    adStatus: 'Active',
                    html: `<script type="text/javascript">var embedConfig = {"hash": "${config.hash}", "width": ${config.width}, "height": ${config.height}, "t": "{timestamp}", "userId": 762652, "network": "STANDARD", "type": "html5", "clickTag": "{clickurl}https://terveystalo.com/suunterveystalo?utm_source=programmatic&utm_medium=display&utm_campaign=marketing-engine&utm_content=${campaign.id}", "targetId": "${campaign.id}-${aptKey}"};</script><script type="text/javascript" src="https://live-tag.creatopy.net/embed/embed.js"></script>`,
                    dimension: size === '300x300' ? 10 : size === '300x600' ? 11 : size === '620x891' ? 1888 : 15,
                    isExpandable: false,
                    isInSync: true,
                    isSecure: true,
                    backupContentURL: backupContentURLs[size],
                  };
                  try {
                    const response = await retryWithBackoff(() =>
                      bidTheatreApi.post(`/${BT_NETWORK_ID}/ad`, adPayload, {
                        headers: { Authorization: `Bearer ${btToken}` },
                      })
                    );
                    const adId = parseInt(response.data.ad.id);
                    adIds[adGroup.name].push(adId);
                    console.log(`Created ad for channel ${channel.channel}, apartment ${aptKey}, size ${size}, ad ID: ${adId} at: ${new Date().toISOString()}`);
                  } catch (adError) {
                    overallError += `Ad creation failed for ${channel.channel} - ${aptKey} - ${size}: ${adError.message}\n`;
                    console.log(`Ad creation failed for ${channel.channel} - ${aptKey} - ${size}: ${adError.message} at: ${new Date().toISOString()}`);
                  }
                }
              }
            }
          }

          for (const adGroup of adGroups) {
            const adGroupId = adGroupIds[adGroup.name];
            const adIdsToAssign = adIds[adGroup.name];
            if (adIdsToAssign.length > 0) {
              const assignPayload = { ad: adIdsToAssign };
              try {
                await retryWithBackoff(() =>
                  bidTheatreApi.post(`/${BT_NETWORK_ID}/adgroup/${adGroupId}/ad`, assignPayload, {
                    headers: { Authorization: `Bearer ${btToken}` },
                  })
                );
                console.log(`Assigned ads to ad group ${adGroup.name} for channel ${channel.channel}: ${adIdsToAssign.length} ads at: ${new Date().toISOString()}`);
              } catch (assignError) {
                overallError += `Ad assignment failed for ${channel.channel} - ${adGroup.name}: ${assignError.message}\n`;
                console.log(`Ad assignment failed for ${channel.channel} - ${adGroup.name}: ${assignError.message} at: ${new Date().toISOString()}`);
              }
            }
          }
        } else if (channel.channel === 'PDOOH') {
          const adConfigs = {
            '1080x1920': { hash: 'x8x7e3x', width: 1080, height: 1920 },
          };

          if (!apartmentKeys || apartmentKeys.length === 0) {
            overallError += `No ads created for ${channel.channel} due to missing apartment keys\n`;
            console.log(`No ads created for channel ${channel.channel} due to missing apartment keys at: ${new Date().toISOString()}`);
            throw new Error(`No apartment keys found for campaign ${campaign.id}, aborting PDOOH campaign creation`);
          } else {
            console.log(`Starting PDOOH ad creation for ${apartmentKeys.length} apartments at: ${new Date().toISOString()}`);

            let videoUploadSuccessful = false;

            for (const aptKey of apartmentKeys) {
              console.log(`Processing PDOOH apartment ${aptKey} at: ${new Date().toISOString()}`);
              const apartment = apartments.find(apt => apt.key === aptKey);
              if (!apartment) {
                overallError += `Apartment ${aptKey} not found for ${channel.channel}\n`;
                console.log(`Apartment ${aptKey} not found for channel ${channel.channel} at: ${new Date().toISOString()}`);
                continue;
              }
              console.log(`Found apartment ${aptKey} for channel ${channel.channel} at: ${new Date().toISOString()}`);

              try {
                const config = adConfigs['1080x1920'];
                const elementsChanges = [
                  {
                    elementName: 'images.link',
                    changes: [{ attribute: 'SOURCE', value: apartment.images && apartment.images[0]?.url }],
                  },
                  {
                    elementName: 'apartment details',
                    changes: [{ attribute: 'LABEL', value: `${apartment.address}/ ${apartment.totalarea} m² / ${apartment.roomtypes}` }],
                  },
                  {
                    elementName: 'sales_price',
                    changes: [
                      { attribute: 'LABEL', value: `Myyntihinta ${apartment.salesprice || apartment.salesprice_unencumbered}€` },
                    ],
                  },
                  {
                    elementName: 'sales_price_unencumbered',
                    changes: [
                      { attribute: 'LABEL', value: `${apartment.salesprice_unencumbered || apartment.salesprice} €` },
                    ],
                  },
                  {
                    elementName: 'agent agency',
                    changes: [
                      { attribute: 'LABEL', value: `${apartment.agent?.agency}` },
                    ],
                  },
                  {
                    elementName: 'agent_picture_url',
                    changes: [{ attribute: 'SOURCE', value: apartment.agent?.pictureUrl }],
                  },
                  {
                    elementName: 'agent',
                    changes: [{ attribute: 'LABEL', value: `${apartment.agent?.name}` }],
                  },  
                ];

                const exportPayload = {
                  templateHash: config.hash,
                  type: 'mp4',
                  elementsChanges,
                };
                console.log(`Calling Creatopy export for apartment ${aptKey} at: ${new Date().toISOString()}`);
                const exportResponse = await creatopyApi.post('/export-with-changes', exportPayload, {
                  headers: { Authorization: `Bearer ${creatopyToken}` },
                });
                console.log(`Created Creatopy export for apartment ${aptKey}, channel ${channel.channel}, response: ${JSON.stringify(exportResponse.data)} at: ${new Date().toISOString()}`);

                const exportId = exportResponse.data.response?.export?.id;
                if (!exportId) {
                  throw new Error('Creatopy export ID is undefined in response');
                }

                console.log(`Polling Creatopy export for ID ${exportId} at: ${new Date().toISOString()}`);
                const videoUrl = await pollCreatopyExport(exportId, creatopyToken);
                console.log(`Polled Creatopy export for apartment ${aptKey}, channel ${channel.channel}, video URL: ${videoUrl} at: ${new Date().toISOString()}`);

                const videoLinearPayload = {
                  campaign: parseInt(btCampaignId),
                  name: `${aptKey} - ${campaign.campaign_address || 'Unknown'}`,
                  advertiser: advertiserIdInt,
                };
                console.log(`Creating video linear for apartment ${aptKey} with payload: ${JSON.stringify(videoLinearPayload)} at: ${new Date().toISOString()}`);
                let videoLinearResponse;
                try {
                  videoLinearResponse = await retryWithBackoff(() =>
                    bidTheatreApi.post(`/${BT_NETWORK_ID}/video-linear`, videoLinearPayload, {
                      headers: { Authorization: `Bearer ${btToken}` },
                    })
                  );
                } catch (videoLinearError) {
                  console.error(`Failed to create video linear for apartment ${aptKey}: ${videoLinearError.response?.data?.message || videoLinearError.message}`);
                  console.error(`Error details:`, videoLinearError.response?.data);
                  throw new Error(`Failed to create video linear: ${videoLinearError.response?.data?.message || videoLinearError.message}`);
                }
                const videoLinearId = videoLinearResponse.data?.videoLinear?.id;
                if (!videoLinearId) {
                  throw new Error('Video linear ID is undefined in response');
                }
                videoLinearIds[aptKey] = videoLinearId;
                console.log(`Created video linear for apartment ${aptKey}, channel ${channel.channel}, video linear ID: ${videoLinearId} at: ${new Date().toISOString()}`);

                console.log(`Uploading video for apartment ${aptKey} at: ${new Date().toISOString()}`);

                try {
                  const uploadResult = await downloadAndUploadVideo(videoUrl, videoLinearId, btToken, BT_NETWORK_ID, campaign.id, aptKey);
                  if (!uploadResult.success) {
                    throw new Error(`Video upload failed for apartment ${aptKey}: ${uploadResult.error}`);
                  }
                  console.log(`Video upload successful for apartment ${aptKey}, output: ${uploadResult.output}`);
                  videoUploadSuccessful = true;
                } catch (videoUploadError) {
                  console.error(`Failed to process video for apartment ${aptKey}:`, videoUploadError.message);
                  overallError += `Video upload failed for apartment ${aptKey}: ${videoUploadError.message}\n`;
                  continue; // Skip to next apartment
                }

                const newAdId = await uploadAndCreateVideoAd(
                  BT_NETWORK_ID,
                  btToken,
                  videoLinearId,
                  videoUrl,
                  parseInt(btCampaignId as string, 10),
                  campaign.campaign_address || 'Unknown',
                  backupContentURLs['1080x1920'],
                  aptKey // Pass aptKey here
                );

                adIds['Default campaign'].push(newAdId);
                videoUploadSuccessful = true;
              } catch (error) {
                overallError += `Failed to create PDOOH ad for apartment ${aptKey}: ${error.message}\n`;
                console.log(`Failed to create PDOOH ad for apartment ${aptKey}: ${error.message} at: ${new Date().toISOString()}`);
                continue;
              }
            }

            if (!videoUploadSuccessful) {
              throw new Error(`No video uploads were successful for campaign ${campaign.id}, aborting PDOOH campaign creation`);
            }
          }
        }

        for (const adGroup of adGroups) {
          const adGroupId = adGroupIds[adGroup.name];
          const adIdsToAssign = adIds[adGroup.name];
          if (adIdsToAssign.length > 0) {
            const assignPayload = { ad: adIdsToAssign };
            try {
              await retryWithBackoff(() =>
                bidTheatreApi.post(`/${BT_NETWORK_ID}/adgroup/${adGroupId}/ad`, assignPayload, {
                  headers: { Authorization: `Bearer ${btToken}` },
                })
              );
              console.log(`Assigned ads to ad group ${adGroup.name} for channel ${channel.channel}: ${adIdsToAssign.length} ads at: ${new Date().toISOString()}`);
            } catch (assignError) {
              overallError += `Ad assignment failed for ${channel.channel} - ${adGroup.name}: ${assignError.message}\n`;
              console.log(`Ad assignment failed for ${channel.channel} - ${adGroup.name}: ${assignError.message} at: ${new Date().toISOString()}`);
            }
          }
        }

        const geoTargetPayload = { name: `${campaign.campaign_address}, ${campaign.campaign_city}` };
        const geoTargetResponse = await retryWithBackoff(() =>
          bidTheatreApi.post(`/${BT_NETWORK_ID}/geo-target`, geoTargetPayload, {
            headers: { Authorization: `Bearer ${btToken}` },
          })
        );
        geoTargetId = geoTargetResponse.data.geoTarget.id;
        console.log(`Created geo-target for campaign ${btCampaignId}, channel ${channel.channel}, geo-target ID: ${geoTargetId} at: ${new Date().toISOString()}`);

        const coordinatesResponse = await retryWithBackoff(() =>
          bidTheatreApi.post(`/${BT_NETWORK_ID}/geo-target/${geoTargetId}/geo-target-coordinate`, {
            latitude: campaign.campaign_coordinates?.lat || 0,
            longitude: campaign.campaign_coordinates?.lng || 0,
            radius: convertMetersToKm(campaign.campaign_radius || 1500),
          }, {
            headers: { Authorization: `Bearer ${btToken}` },
          })
        );
        geoTargetCoordinatesId = coordinatesResponse.data.geoTargetCoordinate.id;
        console.log(`Created geo-target coordinates for geo-target ${geoTargetId}, channel ${channel.channel}, coordinates ID: ${geoTargetCoordinatesId} at: ${new Date().toISOString()}`);

        const bidStrategyTemplates = await getBidStrategyTemplates(channel.channel);
        console.log(`Fetched bid strategy templates for channel ${channel.channel}: ${bidStrategyTemplates.length} templates at: ${new Date().toISOString()}`);
        if (bidStrategyTemplates.length === 0) {
          bidStrategyTemplates.push({
            id: 0,
            channel: channel.channel,
            rtb_sitelist: 157553,
            adgroup_name: channel.channel === 'DISPLAY' ? 'Large desktop sizes' : undefined,
            max_cpm: 5.0,
            name: `${channel.channel} Bid Strategy`,
            paused: false,
            filterTarget: null,
          });
          console.log(`Added default bid strategy template for channel ${channel.channel} at: ${new Date().toISOString()}`);
        }

        for (const template of bidStrategyTemplates) {
          const adGroupId = channel.channel === 'DISPLAY' ? adGroupIds[template.adgroup_name] : adGroupIds['Default campaign'];
          const strategyPayload = {
            rtbSitelist: template.rtb_sitelist,
            adgroup: parseInt(adGroupId),
            maxCPM: template.max_cpm,
            geoTarget: parseInt(geoTargetId),
            name: template.name,
            paused: template.paused,
            filterTarget: template.filterTarget || null,
          };
          try {
            await retryWithBackoff(() =>
              bidTheatreApi.post(`/${BT_NETWORK_ID}/campaign-target/${btCampaignId}/bid-strategy`, strategyPayload, {
                headers: { Authorization: `Bearer ${btToken}` },
              })
            );
            console.log(`Created bid strategy ${template.name} for campaign ${btCampaignId}, channel ${channel.channel} at: ${new Date().toISOString()}`);
          } catch (strategyError) {
            overallError += `Bid strategy failed for ${channel.channel} - ${template.name}: ${strategyError.message}\n`;
            console.log(`Bid strategy failed for ${channel.channel} - ${template.name}: ${strategyError.message} at: ${new Date().toISOString()}`);
          }
        }

        const { error } = await supabase
        .from('bidtheatre_campaigns')
        .insert({
          campaign_id: campaign.id,
          bt_campaign_id: btCampaignId,
          channel: channel.channel,
          geo_target_id: geoTargetId,
          geo_target_coordinates_id: geoTargetCoordinatesId,
          latitude: campaign.campaign_coordinates?.lat || null,
          longitude: campaign.campaign_coordinates?.lng || null,
          radius: campaign.campaign_radius,
          ad_group_ids: adGroupIds, // No JSON.stringify
          ad_ids: adIds,           // No JSON.stringify
          video_linear_ids: channel.channel === 'PDOOH' ? videoLinearIds : null, // No JSON.stringify
          is_ongoing: isOngoing,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });

      if (error) {
        overallSuccess = false;
        overallError += `Failed to save BidTheatre metadata for ${channel.channel}: ${error.message}\n`;
        console.log(`Failed to save BidTheatre metadata for ${channel.channel}: ${error.message} at: ${new Date().toISOString()}`);
      } else {
        console.log(`Successfully saved BidTheatre metadata for campaign ${campaign.id}, channel ${channel.channel}: ad_group_ids=${JSON.stringify(adGroupIds)}, ad_ids=${JSON.stringify(adIds)}, video_linear_ids=${JSON.stringify(videoLinearIds)} at: ${new Date().toISOString()}`);
      }
          } catch (error) {
        overallSuccess = false;
        overallError += `Error in ${channel.channel}: ${error.message}\n`;
        console.log(`Error in ${channel.channel}: ${error.message} at: ${new Date().toISOString()}`);
      }
    }

    // Update the campaigns table with both display_bt_id and pdooh_bt_id
const updatePayload = {};
if (campaignIds['DISPLAY']) {
  updatePayload['display_bt_id'] = campaignIds['DISPLAY'];
}
if (campaignIds['PDOOH']) {
  updatePayload['pdooh_bt_id'] = campaignIds['PDOOH'];
}

if (Object.keys(updatePayload).length > 0) {
  const { error: updateError } = await supabase
    .from('campaigns')
    .update(updatePayload)
    .eq('id', campaign.id);

  if (updateError) {
    overallError += `Failed to update campaign ${campaign.id} with BidTheatre IDs: ${updateError.message}\n`;
    console.log(`Failed to update campaign ${campaign.id} with BidTheatre IDs: ${updateError.message} at: ${new Date().toISOString()}`);
  } else {
    console.log(`Successfully updated campaign ${campaign.id} in Supabase with BidTheatre IDs: display_bt_id=${updatePayload['display_bt_id'] || 'N/A'}, pdooh_bt_id=${updatePayload['pdooh_bt_id'] || 'N/A'} at: ${new Date().toISOString()}`);
  }
}

    return {
      success: overallSuccess,
      btCampaignId: channels.length === 1 ? campaignIds[channels[0].channel] : undefined,
      campaignIds: channels.length > 1 ? campaignIds : undefined,
      error: overallError || undefined,
    };
  } catch (error) {
    console.error('Error in createBidTheatreCampaign:', error);
    return { success: false, error: error.message };
  }
};


// Pause a campaign in BidTheatre
const pauseBidTheatreCampaign = async (campaign) => {
  let btToken = await getBidTheatreToken();
  if (!btToken) {
    return { success: false, error: 'Failed to authenticate with BidTheatre' };
  }

  const credentials = await getBidTheatreCredentials();
  console.log(`Fetched BidTheatre credentials for network ${credentials.network_id}`);

  const BT_NETWORK_ID = credentials.network_id;

  const channels: Channel[] = [];
  if (campaign.display_bt_id) channels.push({ channel: 'DISPLAY', btCampaignId: campaign.display_bt_id });
  if (campaign.pdooh_bt_id) channels.push({ channel: 'PDOOH', btCampaignId: campaign.pdooh_bt_id });

  console.log(`Determined channels for pausing campaign ${campaign.id}: ${channels.map(c => c.channel).join(', ')}`);

  if (channels.length === 0) {
    return { success: true, error: 'No BidTheatre channels selected for pausing' };
  }

  let overallSuccess = true;
  let overallError = '';

  for (const { channel, btCampaignId } of channels) {
    try {
      console.log(`Pausing campaign ${btCampaignId} for channel ${channel} at: ${new Date().toISOString()}`);
      await retryWithBackoff(() =>
        bidTheatreApi.post(`/${BT_NETWORK_ID}/campaign/${btCampaignId}/pause`, {}, {
          headers: { Authorization: `Bearer ${btToken}` },
        })
      );
      console.log(`Paused campaign ${btCampaignId} for channel ${channel} at: ${new Date().toISOString()}`);
    } catch (error) {
      overallSuccess = false;
      overallError += `Error pausing campaign ${btCampaignId} for ${channel}: ${error.message}\n`;
      console.log(`Error pausing campaign ${btCampaignId} for ${channel}: ${error.message} at: ${new Date().toISOString()}`);
    }
  }

  return {
    success: overallSuccess,
    error: overallError || undefined,
  };
};

// Mark a BidTheatre campaign as checked
async function markCampaignAsChecked(networkId: string, campaignId: string | number, token: string): Promise<boolean> {
  try {
    console.log(`Marking campaign ${campaignId} as checked at: ${new Date().toISOString()}`);
    const response = await bidTheatreApi.put(`/${networkId}/campaign/${campaignId}/check/1`, 
      {
        checkDone: true,
        checkType: "Skipped"
      },
      {
        headers: { Authorization: `Bearer ${token}` }
      }
    );
    
    console.log(`Campaign ${campaignId} marked as checked, response: ${JSON.stringify(response.data)}`);
    return true;
  } catch (error) {
    console.error(`Error marking campaign ${campaignId} as checked:`, error.response?.data || error.message);
    return false;
  }
}

// Netlify Background Function handler
export async function handler(event) {
  console.log(`Background function started at ${new Date().toISOString()}`);

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' }),
    };
  }

  let campaign;
  let apartmentKeys: string[] = [];

  // 1) Parse JSON
  try {
    campaign = JSON.parse(event.body || '{}');
    console.log('Parsed campaign:', JSON.stringify(campaign, null, 2));
  } catch (err) {
    console.error('Invalid JSON', err);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON payload', details: err.message }),
    };
  }

  // 2) Determine op type
  const isPause = Boolean(campaign.pause || campaign.is_pause);
  const isUpdate = Boolean(campaign.is_update || campaign.display_bt_id || campaign.pdooh_bt_id);

  if (!campaign.id) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing campaign.id' }),
    };
  }

  // 3) Keys from payload override
  if (Array.isArray(campaign.apartment_keys)) {
    apartmentKeys = campaign.apartment_keys;
  }

  // 4) Otherwise fetch from DB
  if (!isPause && apartmentKeys.length === 0) {
    apartmentKeys = await fetchApartmentKeys(campaign.id);
  }

  // 5) Process the campaign immediately
  try {
    console.log(`Processing campaign ${campaign.id} at ${new Date().toISOString()}`);
    const runner = isPause ? pauseBidTheatreCampaign : createBidTheatreCampaign;
    const result = await runner({ ...campaign, apartmentKeys, isUpdate, isPause });
    console.log(`Campaign ${campaign.id} processed, result: ${JSON.stringify(result)}`);

    // Mark campaigns as checked
    if (result.success && !isPause) {
      try {
        const credentials = await getBidTheatreCredentials();
        const BT_NETWORK_ID = credentials.network_id;
        const btToken = await getBidTheatreToken();

        if (result.campaignIds) {
          // Mark all campaign IDs as checked
          for (const [channel, campaignId] of Object.entries(result.campaignIds)) {
            await markCampaignAsChecked(BT_NETWORK_ID, campaignId, btToken);
            console.log(`Marked ${channel} campaign ${campaignId} as checked at: ${new Date().toISOString()}`);
          }
        } else if (result.btCampaignId) {
          // Mark single campaign ID as checked
          await markCampaignAsChecked(BT_NETWORK_ID, result.btCampaignId, btToken);
          console.log(`Marked campaign ${result.btCampaignId} as checked at: ${new Date().toISOString()}`);
        }
      } catch (checkError) {
        console.error(`Error marking campaign(s) as checked: ${checkError.message}`);
        // Continue with response, don't fail the function just because check marking failed
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({
        success: result.success,
        campaignId: campaign.id,
        operationType: isPause ? 'pause' : isUpdate ? 'update' : 'create',
        result,
      }),
    };
  } catch (err) {
    console.error(`Campaign ${campaign.id} processing failed:`, err.message);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Processing failed', details: err.message }),
    };
  }
};

// Interface for Channel
interface Channel {
  channel: 'DISPLAY' | 'PDOOH';
  btCampaignId: string | number;
}