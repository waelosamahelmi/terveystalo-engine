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

const SUPABASE_SERVICE_ROLE_KEY = getEnvVar([
  'SUPABASE_SERVICE_ROLE_KEY',
  'VITE_SUPABASE_SERVICE_ROLE_KEY',
  'REACT_APP_SUPABASE_SERVICE_ROLE_KEY',
  'NETLIFY_SUPABASE_SERVICE_ROLE_KEY'
]);

console.log(`Initializing Supabase with URL: ${SUPABASE_URL}`);
console.log(`Service role key available: ${SUPABASE_SERVICE_ROLE_KEY ? 'Yes (starts with: ' + SUPABASE_SERVICE_ROLE_KEY.slice(0, 5) + '...)' : 'No'}`);

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
async function getAdvertiserIdFromUser(userId: string) {
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

    const user = userData[0];
    if (!user.advertiser_id) {
      console.log('User has no advertiser_id, using default value');
      return 22717;
    }

    console.log(`Fetched advertiser_id ${user.advertiser_id} for user ${userId}`);
    return user.advertiser_id;
  } catch (error) {
    console.error('Error fetching advertiser_id:', error);
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
async function getBidStrategyTemplates(channel: string) {
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
function formatDateForBidTheatre(dateStr: string | undefined): string {
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
function convertMetersToKm(meters: number): number {
  const km = meters / 1000;
  const result = Math.ceil(km);
  console.log(`Converted ${meters} meters to ${result} kilometers`);
  return result;
}

// Fetch apartment keys
async function fetchApartmentKeys(campaignId: string): Promise<string[]> {
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
async function fetchApartmentDetails(apartmentKeys: string[]) {
  if (!apartmentKeys || apartmentKeys.length === 0) {
    console.log('No apartment keys provided to fetchApartmentDetails');
    return [];
  }

  try {
    console.log(`Fetching details for ${apartmentKeys.length} apartments with keys:`, apartmentKeys);

    const { data, error } = await supabase
      .from('apartments')
      .select('*')
      .in('key', apartmentKeys);

    if (error) {
      console.error('Error fetching apartment details:', error.message);
      throw error;
    }

    console.log(`Fetched ${data?.length || 0} apartments out of ${apartmentKeys.length} requested`);
    return data || [];
  } catch (error) {
    console.error('Exception in fetchApartmentDetails:', error);
    return [];
  }
}

// Poll Creatopy export
async function pollCreatopyExport(exportId: string, creatopyToken: string, maxAttempts = 15, initialDelayMs = 1500): Promise<string> {
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
const retryWithBackoff = async (fn: () => Promise<any>, maxRetries = 3, baseDelay = 1000) => {
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
 */
/**
 * Uploads a video to Cloudinary and sends the URL to BidTheatre
 */
async function downloadAndUploadVideo(videoUrl: string, linearId: number, btToken: string, networkId: string, campaignId: string, aptKey: string) {
  const maxRetries = 5; // Increased retries for better resilience
  const baseDelay = 2000; // Increased base delay for retries
  let lastError;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      // Validate Cloudinary credentials
      if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
        throw new Error('Cloudinary credentials are missing in environment variables');
      }

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
        timeout: 60000, // Increase timeout for Cloudinary upload
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
      const timeoutId = setTimeout(() => controller.abort(), 30000); // Increased timeout for BidTheatre request
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
      console.error('Error details:', error.response ? JSON.stringify(error.response.data, null, 2) : error);
      if (attempt < maxRetries) {
        const delay = baseDelay * Math.pow(2, attempt - 1);
        console.log(`Retrying after ${delay}ms (attempt ${attempt}/${maxRetries})`);
        await new Promise(resolve => setTimeout(resolve, delay));
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
  aptKey: string
) {
  try {
    console.log(`Creating video ad for campaign ${campaignId} at: ${new Date().toISOString()}`);
    const { data: adResp } = await bidTheatreApi.post(
      `/${BT_NETWORK_ID}/ad`,
      {
        campaign: campaignId,
        name: `${aptKey} - ${campaignAddress}`,
        adType: 'Video ad',
        adStatus: 'Active',
        isSecure: true,
        dimension: 385,
        backupContentURL: backupUrl
      },
      { headers: { Authorization: `Bearer ${btToken}` } }
    );
    console.log('✔️ Video ad created:', adResp);

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

// Update campaign in BidTheatre
async function updateBidTheatreCampaign(
  btToken: string,
  creatopyToken: string,
  campaign: any,
  btCampaignId: string,
  channel: 'DISPLAY' | 'PDOOH',
  BT_NETWORK_ID: string,
  btData: any
) {
  let overallSuccess = true;
  let overallError = '';

  try {
    // Verify campaign existence
    try {
      const campaignResponse = await retryWithBackoff(() =>
        bidTheatreApi.get(`/${BT_NETWORK_ID}/campaign/${btCampaignId}`, {
          headers: { Authorization: `Bearer ${btToken}` },
        })
      );
      console.log(`Campaign ${btCampaignId} exists:`, campaignResponse.data.campaign);
    } catch (err) {
      console.error(`Campaign ${btCampaignId} does not exist or is inaccessible:`, err.message);
      overallError += `Campaign ${btCampaignId} does not exist or is inaccessible: ${err.message}\n`;
      throw new Error(`Campaign ${btCampaignId} does not exist or is inaccessible`);
    }

    const advertiserId = await getAdvertiserIdFromUser(campaign.user_id);
    const advertiserIdInt = parseInt(advertiserId.toString(), 10);
    const credentials = await getBidTheatreCredentials();

    // Update campaign details
    const campaignPayload = {
      name: `ST / ${channel} / ${campaign.id}`,
      advertiser: advertiserIdInt,
      campaignManager: credentials.username,
      campaignKPI: 3,
      defaultLineItem: 295489,
      targetURL: 'https://terveystalo.com/suunterveystalo',
      defaultGeoTarget: null,
      expectedTotalImps: channel === 'DISPLAY' ? 8422 : 12500,
      deliveryPriority: 'even',
      defaultFilterTarget: channel === 'DISPLAY' ? 22418 : 32491,
      defaultOptimizationStrategy: channel === 'DISPLAY' ? 538 : 519,
      allowWideTargeting: false,
      renderOBA: false,
      takeScreenshots: false,
    };

    await retryWithBackoff(() =>
      bidTheatreApi.put(`/${BT_NETWORK_ID}/campaign/${btCampaignId}`, campaignPayload, {
        headers: { Authorization: `Bearer ${btToken}` },
      })
    );
    console.log(`Updated campaign ${btCampaignId} for channel ${channel}`);

    // Update category
    await retryWithBackoff(() =>
      bidTheatreApi.post(`/${BT_NETWORK_ID}/campaign/${btCampaignId}/category`, { category: 3 }, {
        headers: { Authorization: `Bearer ${btToken}` },
      })
    );
    console.log(`Set category for campaign ${btCampaignId}, channel ${channel}`);

    // Update budget cycle
    const budget = channel === 'DISPLAY' ? campaign.budget_display : campaign.budget_pdooh;
    const isOngoing = !campaign.campaign_end_date || campaign.campaign_end_date.toUpperCase() === 'ONGOING';
    let endDate: string;
    if (isOngoing) {
      const startDate = parseISO(formatDateForBidTheatre(campaign.campaign_start_date));
      endDate = formatDateForBidTheatre(format(addMonths(startDate, 1), 'yyyy-MM-dd'));
    } else {
      endDate = formatDateForBidTheatre(campaign.campaign_end_date);
    }

    const cyclePayload = {
      startDate: formatDateForBidTheatre(campaign.campaign_start_date),
      endDate,
      deliveryUnit: 'Budget',
      amount: budget,
      showDiffInvoicePopup: false,
    };

    try {
      const cycleResponse = await retryWithBackoff(() =>
        bidTheatreApi.get(`/${BT_NETWORK_ID}/campaign/${btCampaignId}/cycle`, {
          headers: { Authorization: `Bearer ${btToken}` },
        })
      );

      const cycleId = cycleResponse.data.cycles?.[0]?.id;
      if (cycleId) {
        await retryWithBackoff(() =>
          bidTheatreApi.put(`/${BT_NETWORK_ID}/campaign/${btCampaignId}/cycle/${cycleId}`, cyclePayload, {
            headers: { Authorization: `Bearer ${btToken}` },
          })
        );
        console.log(`Updated cycle ${cycleId} for campaign ${btCampaignId}`);
      } else {
        await retryWithBackoff(() =>
          bidTheatreApi.post(`/${BT_NETWORK_ID}/campaign/${btCampaignId}/cycle`, cyclePayload, {
            headers: { Authorization: `Bearer ${btToken}` },
          })
        );
        console.log(`Created new cycle for campaign ${btCampaignId}`);
      }
    } catch (cycleError) {
      overallError += `Failed to update cycle for ${channel}: ${cycleError.message}\n`;
      throw new Error(`Failed to update cycle: ${cycleError.message}`);
    }

    // Use stored ad_group_ids instead of refetching
    let adGroupIds = btData.ad_group_ids || {};
    const adGroupsConfig = channel === 'DISPLAY' ? [
      { name: 'Mobile sizes', sizes: ['300x600', '300x431'], autoAddAds: false },
      { name: 'Small desktop', sizes: ['300x600', '300x300'], autoAddAds: false },
      { name: 'Large desktop sizes', sizes: ['620x891', '980x400'], autoAddAds: false },
    ] : [{ name: 'Default campaign', sizes: ['1080x1920'], autoAddAds: false }];

    console.log(`Using stored ad_group_ids for campaign ${btCampaignId}:`, adGroupIds);

    let adIds = btData.ad_ids || {};
    let videoLinearIds = channel === 'PDOOH' ? (btData.video_linear_ids || {}) : null;

    for (const adGroup of adGroupsConfig) {
      adIds[adGroup.name] = adIds[adGroup.name] || [];
      if (!adGroupIds[adGroup.name]) {
        console.warn(`Ad group ${adGroup.name} not found in stored ad_group_ids for campaign ${btCampaignId}. Skipping ad processing for this group.`);
        overallError += `Ad group ${adGroup.name} not found in stored ad_group_ids for campaign ${btCampaignId}.\n`;
        continue;
      }
    }

    // Update ads
    const apartmentKeys = campaign.apartment_keys || await fetchApartmentKeys(campaign.id);
    const apartments = await fetchApartmentDetails(apartmentKeys);

    // Pause ads for apartments that are no longer in the campaign (DISPLAY and PDOOH)
    for (const adGroup of adGroupsConfig) {
      const adGroupName = adGroup.name;
      const adGroupId = adGroupIds[adGroupName];
      if (!adGroupId) continue;
      const currentAds = adIds[adGroupName] || [];
      for (const adId of currentAds) {
        try {
          const adResponse = await bidTheatreApi.get(`/${BT_NETWORK_ID}/ad/${adId}`, {
            headers: { Authorization: `Bearer ${btToken}` },
          });
          const adName = adResponse.data.ad.name;
          // For DISPLAY: adName = "<aptKey> - <size>"
          // For PDOOH: adName = "<aptKey> - <address>"
          const aptKey = adName.split(' - ')[0];
          if (!apartmentKeys.includes(aptKey)) {
            // Pause by setting adStatus: 'Inactive'
            await bidTheatreApi.put(`/${BT_NETWORK_ID}/ad/${adId}`,
              {
                adType: channel === 'DISPLAY' ? 'HTML banner' : 'Video ad',
                adStatus: 'Inactive',
                backupContentURL: channel === 'DISPLAY' ? backupContentURLs[adName.split(' - ')[1]] : backupContentURLs['1080x1920'],
                campaign: parseInt(btCampaignId),
              },
              { headers: { Authorization: `Bearer ${btToken}` } }
            );
            console.log(`Paused ad ${adId} for removed apartment ${aptKey} in campaign ${btCampaignId}, channel ${channel}`);
            // Remove from adIds for DB update
            adIds[adGroupName] = adIds[adGroupName].filter(id => id !== adId);
            if (videoLinearIds && videoLinearIds[aptKey]) {
              delete videoLinearIds[aptKey];
            }
          }
        } catch (err) {
          console.warn(`Failed to fetch or pause ad ${adId}: ${err.message}`);
          continue;
        }
      }
    }

    if (channel === 'DISPLAY') {
      const adConfigs = {
        '300x300': { hash: 'PENDING', width: 300, height: 300 },  // TODO: Update hash when Creatopy template ready
        '300x431': { hash: 'g3jo2pn', width: 300, height: 431 },
        '300x600': { hash: '11jp13n', width: 300, height: 600 },
        '620x891': { hash: 'mqopyyq', width: 620, height: 891 },
        '980x400': { hash: '58z5ylw', width: 980, height: 400 },
      };

      if (!apartmentKeys || apartmentKeys.length === 0) {
        overallError += `No ads updated for ${channel} due to missing apartment keys\n`;
        console.log(`No ads updated for channel ${channel} due to missing apartment keys`);
      } else {
        for (const aptKey of apartmentKeys) {
          const apartment = apartments.find(apt => apt.key === aptKey);
          if (!apartment) {
            overallError += `Apartment ${aptKey} not found for ${channel}\n`;
            console.log(`Apartment ${aptKey} not found for channel ${channel}`);
            continue;
          }

          for (const adGroup of adGroupsConfig) {
            const adGroupId = adGroupIds[adGroup.name];
            if (!adGroupId) continue; // Skip if ad group doesn't exist

            for (const size of adGroup.sizes) {
              const adName = `${aptKey} - ${size}`;
              let existingAd = null;
              const currentAds = adIds[adGroup.name] || [];
              for (const adId of currentAds) {
                try {
                  const adResponse = await bidTheatreApi.get(`/${BT_NETWORK_ID}/ad/${adId}`, {
                    headers: { Authorization: `Bearer ${btToken}` },
                  });
                  if (adResponse.data.ad.name === adName) {
                    existingAd = adId;
                    break;
                  }
                } catch (err) {
                  console.warn(`Failed to fetch ad ${adId} for checking: ${err.message}`);
                  continue;
                }
              }

              if (existingAd) {
                const adResponse = await retryWithBackoff(() =>
                  bidTheatreApi.get(`/${BT_NETWORK_ID}/ad/${existingAd}`, {
                    headers: { Authorization: `Bearer ${btToken}` },
                  })
                );
                if (adResponse.data.ad.adStatus === 'Inactive') {
                  await retryWithBackoff(() =>
                    bidTheatreApi.put(
                      `/${BT_NETWORK_ID}/ad/${existingAd}`,
                      {
                        adType: 'HTML banner',
                        adStatus: 'Active',
                        backupContentURL: backupContentURLs[size],
                        campaign: parseInt(btCampaignId),
                      },
                      { headers: { Authorization: `Bearer ${btToken}` } }
                    )
                  );
                  console.log(`Reactivated ad ${existingAd} for apartment ${aptKey}, size ${size}`);
                } else {
                  console.log(`Ad ${existingAd} for apartment ${aptKey}, size ${size} is already active, skipping creation`);
                }
                continue;
              }

              console.log(`No existing ad found for apartment ${aptKey}, size ${size}, proceeding to create new ad`);

              const config = adConfigs[size];
              const adPayload = {
                campaign: parseInt(btCampaignId),
                name: adName,
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
                console.log(`Created ad for channel ${channel}, apartment ${aptKey}, size ${size}, ad ID: ${adId}`);

                await retryWithBackoff(() =>
                  bidTheatreApi.post(`/${BT_NETWORK_ID}/adgroup/${adGroupId}/ad`, { ad: [adId] }, {
                    headers: { Authorization: `Bearer ${btToken}` },
                  })
                );
                console.log(`Assigned ad ${adId} to ad group ${adGroup.name} for channel ${channel}`);
              } catch (adError) {
                overallError += `Ad creation failed for ${channel} - ${aptKey} - ${size}: ${adError.message}\n`;
                console.log(`Ad creation failed for ${channel} - ${aptKey} - ${size}: ${adError.message}`);
              }
            }
          }
        }
      }
    } else if (channel === 'PDOOH') {
      const adConfigs = {
        '1080x1920': { hash: 'x8x7e3x', width: 1080, height: 1920 },
      };

      if (!apartmentKeys || apartmentKeys.length === 0) {
        overallError += `No ads updated for ${channel} due to missing apartment keys\n`;
        console.log(`No ads updated for channel ${channel} due to missing apartment keys`);
      } else {
        for (const aptKey of apartmentKeys) {
          const apartment = apartments.find(apt => apt.key === aptKey);
          if (!apartment) {
            overallError += `Apartment ${aptKey} not found for ${channel}\n`;
            console.log(`Apartment ${aptKey} not found for channel ${channel}`);
            continue;
          }

          const adGroupId = adGroupIds['Default campaign'];
          if (!adGroupId) {
            overallError += `Default campaign ad group not found for ${channel}\n`;
            console.log(`Default campaign ad group not found for channel ${channel}`);
            continue;
          }

          const adName = `${aptKey} - ${campaign.campaign_address || 'Unknown'}`;
          console.log(`Checking for existing ad with name ${adName} for apartment ${aptKey}`);

          let existingAd = null;
          const currentAds = adIds['Default campaign'] || [];
          for (const adId of currentAds) {
            try {
              const adResponse = await bidTheatreApi.get(`/${BT_NETWORK_ID}/ad/${adId}`, {
                headers: { Authorization: `Bearer ${btToken}` },
              });
              if (adResponse.data.ad.name === adName) {
                existingAd = adId;
                break;
              }
            } catch (err) {
              console.warn(`Failed to fetch ad ${adId} for checking: ${err.message}`);
              continue;
            }
          }

          if (existingAd) {
            console.log(`Found existing ad ${existingAd} for apartment ${aptKey}`);
            const adResponse = await retryWithBackoff(() =>
              bidTheatreApi.get(`/${BT_NETWORK_ID}/ad/${existingAd}`, {
                headers: { Authorization: `Bearer ${btToken}` },
              })
            );
            if (adResponse.data.ad.adStatus === 'Inactive') {
              await retryWithBackoff(() =>
                bidTheatreApi.put(
                  `/${BT_NETWORK_ID}/ad/${existingAd}`,
                  {
                    adType: 'Video ad',
                    adStatus: 'Active',
                    backupContentURL: backupContentURLs['1080x1920'],
                    campaign: parseInt(btCampaignId),
                  },
                  { headers: { Authorization: `Bearer ${btToken}` } }
                )
              );
              console.log(`Reactivated ad ${existingAd} for apartment ${aptKey}`);
            } else {
              console.log(`Ad ${existingAd} for apartment ${aptKey} is already active, skipping creation`);
            }
            continue;
          }

          console.log(`No existing ad found for apartment ${aptKey}, proceeding to create new ad`);

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
            console.log(`Calling Creatopy export for apartment ${aptKey}`);
            const exportResponse = await creatopyApi.post('/export-with-changes', exportPayload, {
              headers: { Authorization: `Bearer ${creatopyToken}` },
            });
            console.log(`Created Creatopy export for apartment ${aptKey}, channel ${channel}, response: ${JSON.stringify(exportResponse.data)}`);

            const exportId = exportResponse.data.response?.export?.id;
            if (!exportId) {
              throw new Error('Creatopy export ID is undefined in response');
            }

            console.log(`Polling Creatopy export for ID ${exportId}`);
            const videoUrl = await pollCreatopyExport(exportId, creatopyToken);
            console.log(`Polled Creatopy export for apartment ${aptKey}, channel ${channel}, video URL: ${videoUrl}`);

            const videoLinearPayload = {
              campaign: parseInt(btCampaignId),
              name: adName,
              advertiser: advertiserIdInt,
            };
            console.log(`Creating video linear for apartment ${aptKey} with payload: ${JSON.stringify(videoLinearPayload)}`);
            const videoLinearResponse = await retryWithBackoff(() =>
              bidTheatreApi.post(`/${BT_NETWORK_ID}/video-linear`, videoLinearPayload, {
                headers: { Authorization: `Bearer ${btToken}` },
              })
            );
            const videoLinearId = videoLinearResponse.data?.videoLinear?.id;
            if (!videoLinearId) {
              throw new Error('Video linear ID is undefined in response');
            }
            videoLinearIds[aptKey] = videoLinearId;
            console.log(`Created video linear for apartment ${aptKey}, channel ${channel}, video linear ID: ${videoLinearId}`);

            console.log(`Uploading video for apartment ${aptKey}`);
            const uploadResult = await downloadAndUploadVideo(videoUrl, videoLinearId, btToken, BT_NETWORK_ID, campaign.id, aptKey);
            if (!uploadResult.success) {
              overallError += `Video upload failed for apartment ${aptKey}: ${uploadResult.error}\n`;
              console.log(`Video upload failed for apartment ${aptKey}: ${uploadResult.error}`);
              continue; // Continue with the next apartment instead of failing
            }
            console.log(`Video upload successful for apartment ${aptKey}, output: ${uploadResult.output}`);

            const newAdId = await uploadAndCreateVideoAd(
              BT_NETWORK_ID,
              btToken,
              videoLinearId,
              videoUrl,
              parseInt(btCampaignId, 10),
              campaign.campaign_address || 'Unknown',
              backupContentURLs['1080x1920'],
              aptKey
            );

            adIds['Default campaign'] = adIds['Default campaign'] || [];
            adIds['Default campaign'].push(newAdId);
            console.log(`Created PDOOH ad ${newAdId} for apartment ${aptKey}`);

            await retryWithBackoff(() =>
              bidTheatreApi.post(
                `/${BT_NETWORK_ID}/adgroup/${adGroupId}/ad`,
                { ad: [newAdId] },
                { headers: { Authorization: `Bearer ${btToken}` } }
              )
            );
            console.log(`Assigned PDOOH ad ${newAdId} to ad group Default campaign for channel ${channel}`);
          } catch (error) {
            overallError += `Failed to update PDOOH ad for apartment ${aptKey}: ${error.message}\n`;
            console.log(`Failed to update PDOOH ad for apartment ${aptKey}: ${error.message}`);
            continue;
          }
        }
      }
    }

    // Update geo-targeting
    let geoTargetId = btData.geo_target_id;
    let geoTargetCoordinatesId = btData.geo_target_coordinates_id;
    const coordinatesChanged =
      btData.latitude !== campaign.campaign_coordinates.lat ||
      btData.longitude !== campaign.campaign_coordinates.lng ||
      btData.radius !== campaign.campaign_radius;

    if (coordinatesChanged || !geoTargetId) {
      if (geoTargetId) {
        await retryWithBackoff(() =>
          bidTheatreApi.put(
            `/${BT_NETWORK_ID}/geo-target/${geoTargetId}`,
            { name: `${campaign.campaign_address}, ${campaign.campaign_city}` },
            { headers: { Authorization: `Bearer ${btToken}` } }
          )
        );
        console.log(`Updated geo-target ${geoTargetId}`);

        if (geoTargetCoordinatesId) {
          await retryWithBackoff(() =>
            bidTheatreApi.put(
              `/${BT_NETWORK_ID}/geo-target/${geoTargetId}/geo-target-coordinate/${geoTargetCoordinatesId}`,
              {
                latitude: campaign.campaign_coordinates.lat,
                longitude: campaign.campaign_coordinates.lng,
                radius: convertMetersToKm(campaign.campaign_radius),
              },
              { headers: { Authorization: `Bearer ${btToken}` } }
            )
          );
          console.log(`Updated geo-target coordinates ${geoTargetCoordinatesId}`);
        } else {
          const coordinatesResponse = await retryWithBackoff(() =>
            bidTheatreApi.post(
              `/${BT_NETWORK_ID}/geo-target/${geoTargetId}/geo-target-coordinate`,
              {
                latitude: campaign.campaign_coordinates.lat,
                longitude: campaign.campaign_coordinates.lng,
                radius: convertMetersToKm(campaign.campaign_radius),
              },
              { headers: { Authorization: `Bearer ${btToken}` } }
            )
          );
          geoTargetCoordinatesId = coordinatesResponse.data.geoTargetCoordinate.id;
          console.log(`Created geo-target coordinates ${geoTargetCoordinatesId}`);
        }
      } else {
        const geoTargetPayload = { name: `${campaign.campaign_address}, ${campaign.campaign_city}` };
        const geoTargetResponse = await retryWithBackoff(() =>
          bidTheatreApi.post(`/${BT_NETWORK_ID}/geo-target`, geoTargetPayload, {
            headers: { Authorization: `Bearer ${btToken}` },
          })
        );
        geoTargetId = geoTargetResponse.data.geoTarget.id;
        console.log(`Created geo-target for campaign ${btCampaignId}, channel ${channel}, geo-target ID: ${geoTargetId}`);

        const coordinatesResponse = await retryWithBackoff(() =>
          bidTheatreApi.post(`/${BT_NETWORK_ID}/geo-target/${geoTargetId}/geo-target-coordinate`, {
            latitude: campaign.campaign_coordinates.lat,
            longitude: campaign.campaign_coordinates.lng,
            radius: convertMetersToKm(campaign.campaign_radius),
          }, {
            headers: { Authorization: `Bearer ${btToken}` },
          })
        );
        geoTargetCoordinatesId = coordinatesResponse.data.geoTargetCoordinate.id;
        console.log(`Created geo-target coordinates for geo-target ${geoTargetId}, channel ${channel}, coordinates ID: ${geoTargetCoordinatesId}`);

        await retryWithBackoff(() =>
          bidTheatreApi.post(`/${BT_NETWORK_ID}/campaign/${btCampaignId}/geo-target`, { geoTarget: geoTargetId }, {
            headers: { Authorization: `Bearer ${btToken}` },
          })
        );
        console.log(`Assigned geo-target ${geoTargetId} to campaign ${btCampaignId}`);
      }
    }

    // Update Supabase metadata
    const { error: updateError } = await supabase
      .from('bidtheatre_campaigns')
      .update({
        geo_target_id: geoTargetId,
        geo_target_coordinates_id: geoTargetCoordinatesId,
        latitude: campaign.campaign_coordinates.lat,
        longitude: campaign.campaign_coordinates.lng,
        radius: campaign.campaign_radius,
        ad_group_ids: adGroupIds,
        ad_ids: adIds,
        video_linear_ids: channel === 'PDOOH' ? videoLinearIds : null,
        is_ongoing: isOngoing,
        updated_at: new Date().toISOString(),
      })
      .eq('campaign_id', campaign.id)
      .eq('channel', channel);

    if (updateError) {
      overallError += `Failed to update BidTheatre metadata for ${channel}: ${updateError.message}\n`;
      throw new Error(`Failed to update BidTheatre metadata: ${updateError.message}`);
    }
    console.log(`Updated BidTheatre metadata for campaign ${campaign.id}, channel ${channel}`);
  } catch (error) {
    overallSuccess = false;
    overallError += `Error in ${channel}: ${error.message}\n`;
    console.log(`Error in ${channel}: ${error.message}`);
    throw error;
  }

  if (!overallSuccess) {
    throw new Error(overallError);
  }
}
// Netlify Background Function handler for updating campaigns
export async function handler(event: any) {
  console.log(`Background update function started at ${new Date().toISOString()}`);

  // Netlify Background Functions expect POST requests
  if (event.httpMethod !== 'POST') {
    console.error('Invalid HTTP method:', event.httpMethod);
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
    console.error('Invalid JSON:', err);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid JSON payload', details: err.message }),
    };
  }

  // Extract fields directly from payload since campaign data is not nested
  const { id, btCampaignId, channel, apartment_keys, user_id, budget_display, budget_pdooh, campaign_start_date, campaign_end_date, campaign_coordinates, campaign_address, campaign_city, campaign_radius } = payload;

  // Validate required fields
  if (!id) {
    console.error('Missing id in payload');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing campaign id' }),
    };
  }

  if (!btCampaignId) {
    console.error('Missing btCampaignId in payload');
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing btCampaignId' }),
    };
  }

  if (!channel || !['DISPLAY', 'PDOOH'].includes(channel)) {
    console.error('Invalid or missing channel in payload:', channel);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Missing or invalid channel, must be DISPLAY or PDOOH' }),
    };
  }

  // Construct a campaign object with the required fields
  const campaign = {
    id,
    user_id,
    budget_display,
    budget_pdooh,
    campaign_start_date,
    campaign_end_date,
    campaign_coordinates,
    campaign_address,
    campaign_city,
    campaign_radius,
    apartment_keys,
  };

  console.log(`Updating campaign ${campaign.id} for channel ${channel} with btCampaignId ${btCampaignId}`);

  let btToken;
  try {
    btToken = await getBidTheatreToken();
    if (!btToken) {
      throw new Error('Failed to authenticate with BidTheatre');
    }
    console.log('Successfully authenticated with BidTheatre');
  } catch (err) {
    console.error('Error during BidTheatre authentication:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Authentication failed', details: err.message }),
    };
  }

  let creatopyToken;
  try {
    creatopyToken = await getCreatopyToken();
    if (!creatopyToken) {
      throw new Error('Failed to authenticate with Creatopy');
    }
    console.log('Successfully authenticated with Creatopy');
  } catch (err) {
    console.error('Error during Creatopy authentication:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Creatopy authentication failed', details: err.message }),
    };
  }

  const credentials = await getBidTheatreCredentials();
  const BT_NETWORK_ID = credentials.network_id;
  console.log(`Using network ID: ${BT_NETWORK_ID}`);

  // Validate inputs
  const budget = channel === 'DISPLAY' ? campaign.budget_display : campaign.budget_pdooh;
  if (budget == null || budget <= 0) {
    console.error(`Invalid budget for ${channel}: ${budget}`);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: `Invalid budget for ${channel}: ${budget}` }),
    };
  }

  if (!campaign.campaign_coordinates || campaign.campaign_coordinates.lat === 0 || campaign.campaign_coordinates.lng === 0) {
    console.error('Invalid campaign coordinates:', campaign.campaign_coordinates);
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Valid campaign coordinates are required' }),
    };
  }

  // Fetch or initialize metadata
  let btData;
  try {
    const { data, error } = await supabase
      .from('bidtheatre_campaigns')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('channel', channel)
      .maybeSingle();

    if (error) {
      console.error('Failed to fetch BidTheatre metadata:', error);
      throw new Error(`Failed to fetch BidTheatre metadata: ${error.message}`);
    }

    btData = data;

    if (!btData) {
      console.log('No existing BidTheatre metadata found, initializing new metadata');
      let geoTargetId, geoTargetCoordinatesId, latitude, longitude, radius;
      try {
        const geoTargetResponse = await retryWithBackoff(() =>
          bidTheatreApi.get(`/${BT_NETWORK_ID}/campaign/${btCampaignId}/geo-target`, {
            headers: { Authorization: `Bearer ${btToken}` },
          })
        );
        geoTargetId = geoTargetResponse.data.geoTargets?.[0]?.id;
        console.log(`Fetched geo-target ID: ${geoTargetId}`);

        if (geoTargetId) {
          const coordinatesResponse = await retryWithBackoff(() =>
            bidTheatreApi.get(`/${BT_NETWORK_ID}/geo-target/${geoTargetId}/geo-target-coordinate`, {
              headers: { Authorization: `Bearer ${btToken}` },
            })
          );
          const coordinatesData = coordinatesResponse.data.geoTargetCoordinates?.[0];
          geoTargetCoordinatesId = coordinatesData?.id;
          latitude = coordinatesData?.latitude;
          longitude = coordinatesData?.longitude;
          radius = coordinatesData?.radius ? coordinatesData.radius * 1000 : undefined;
          console.log(`Fetched geo-target coordinates: ID=${geoTargetCoordinatesId}, lat=${latitude}, lng=${longitude}, radius=${radius}`);
        }
      } catch (err) {
        console.warn('Failed to fetch existing geo-target:', err.message);
      }

      let adGroupIds = {};
      try {
        const adGroupsResponse = await retryWithBackoff(() =>
          bidTheatreApi.get(`/${BT_NETWORK_ID}/campaign/${btCampaignId}/adgroup`, {
            headers: { Authorization: `Bearer ${btToken}` },
          })
        );
        const adGroups = adGroupsResponse.data.adgroups || [];
        for (const adGroup of adGroups) {
          adGroupIds[adGroup.name] = adGroup.id;
        }
        console.log(`Fetched ad groups for campaign ${btCampaignId}: ${Object.keys(adGroupIds).join(', ')}`);
      } catch (err) {
        if (axios.isAxiosError(err) && err.response?.status === 404) {
          console.warn(`No ad groups found for campaign ${btCampaignId}, attempting to create required ad groups`);
          const adGroupsConfig = channel === 'DISPLAY' ? [
            { name: 'Mobile sizes', sizes: ['300x600', '300x431'], autoAddAds: false },
            { name: 'Small desktop', sizes: ['300x600', '300x300'], autoAddAds: false },
            { name: 'Large desktop sizes', sizes: ['620x891', '980x400'], autoAddAds: false },
          ] : [{ name: 'Default campaign', sizes: ['1080x1920'], autoAddAds: false }];

          for (const adGroup of adGroupsConfig) {
            try {
              const adGroupPayload = {
                name: adGroup.name,
                campaign: parseInt(btCampaignId),
                autoAddAds: adGroup.autoAddAds,
              };
              const adGroupResponse = await retryWithBackoff(() =>
                bidTheatreApi.post(`/${BT_NETWORK_ID}/adgroup`, adGroupPayload, {
                  headers: { Authorization: `Bearer ${btToken}` },
                })
              );
              adGroupIds[adGroup.name] = adGroupResponse.data.adgroup.id;
              console.log(`Created ad group ${adGroup.name} for campaign ${btCampaignId}, ad group ID: ${adGroupIds[adGroup.name]}`);
            } catch (createErr) {
              console.error(`Failed to create ad group ${adGroup.name} for campaign ${btCampaignId}:`, createErr.message);
              adGroupIds[adGroup.name] = null; // Mark as missing
            }
          }
        } else {
          console.error('Failed to fetch ad groups:', err.message);
          return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Failed to fetch ad groups', details: err.message }),
          };
        }
      }

      const videoLinearIds = channel === 'PDOOH' ? {} : null;
      if (channel === 'PDOOH') {
        for (const aptKey of await fetchApartmentKeys(campaign.id)) {
          try {
            const adResponse = await retryWithBackoff(() =>
              bidTheatreApi.get(`/${BT_NETWORK_ID}/ad`, {
                headers: { Authorization: `Bearer ${btToken}` },
                params: { campaign: btCampaignId, name: `${aptKey} - ${campaign.campaign_address}` },
              })
            );
            const ad = adResponse.data.ads?.[0];
            if (ad) {
              const videoCreativeResponse = await retryWithBackoff(() =>
                bidTheatreApi.get(`/${BT_NETWORK_ID}/ad/${ad.id}/video-creative`, {
                  headers: { Authorization: `Bearer ${btToken}` },
                })
              );
              const videoCreative = videoCreativeResponse.data.videoCreatives?.[0];
              if (videoCreative) {
                videoLinearIds[aptKey] = videoCreative.videoCreative;
              }
            }
          } catch (err) {
            console.warn(`Failed to fetch video linear for ${aptKey}:`, err.message);
          }
        }
      }

      const { data: newData, error: insertError } = await supabase
        .from('bidtheatre_campaigns')
        .insert({
          campaign_id: campaign.id,
          bt_campaign_id: btCampaignId,
          channel,
          geo_target_id: geoTargetId,
          geo_target_coordinates_id: geoTargetCoordinatesId,
          latitude: latitude || campaign.campaign_coordinates.lat,
          longitude: longitude || campaign.campaign_coordinates.lng,
          radius: radius || campaign.campaign_radius,
          ad_group_ids: adGroupIds,
          ad_ids: {},
          video_linear_ids: videoLinearIds,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error('Failed to insert BidTheatre metadata:', insertError);
        throw new Error(`Failed to insert BidTheatre metadata: ${insertError.message}`);
      }
      btData = newData;
      console.log('Initialized new BidTheatre metadata:', btData);
    }
  } catch (err) {
    console.error('Error fetching or initializing metadata:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to fetch metadata', details: err.message }),
    };
  }

  try {
    await updateBidTheatreCampaign(btToken, creatopyToken, campaign, btCampaignId, channel, BT_NETWORK_ID, btData);
    console.log(`Successfully updated campaign ${campaign.id} for channel ${channel}`);
    return {
      statusCode: 200,
      body: JSON.stringify({
        success: true,
        message: `Campaign ${campaign.id} updated successfully for channel ${channel}`,
        btCampaignId,
      }),
    };
  } catch (err) {
    console.error('Failed to update campaign:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Failed to update campaign', details: err.message }),
    };
  }
}