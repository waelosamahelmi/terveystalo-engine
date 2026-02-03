import axios from 'axios';
import { supabase } from './supabase';
import { Campaign, Apartment } from '../types';
import { parseISO, format } from 'date-fns';

// Constants
const BT_API_URL = 'https://asx-api.bidtheatre.com/v2.0/api';
const CREATOPY_API_URL = 'https://api.creatopy.com/v1';
const CREATOPY_CLIENT_ID = '5b324250-8429-443b-bc11-dff33c472c89';
const CREATOPY_CLIENT_SECRET = 'eb427fff-2ad7-40fe-b2fd-5c919bc27f4e';

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

// Axios instance for Creatopy API
export const creatopyApi = axios.create({
  baseURL: CREATOPY_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 10000,
});

// Interface for BidTheatre responses
interface BidTheatreResponse {
  success: boolean;
  btCampaignId?: string;
  campaignIds?: { [key: string]: string };
  error?: string;
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
  adgroup_name?: string;
  max_cpm: number;
  name: string;
  paused: boolean;
  target_share: number;
  filterTarget?: number | null;
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

// Fetch advertiser_id from the current user's record in the users table
async function getAdvertiserIdFromUser(): Promise<number> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      console.log('No user session found, using default advertiser_id');
      return 22717; // Default value if no user session
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('advertiser_id')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData) {
      console.log('Failed to fetch user data:', userError?.message);
      return 22717; // Default value if user data cannot be fetched
    }

    if (!userData.advertiser_id) {
      console.log('User has no advertiser_id, using default value');
      return 22717; // Default value if advertiser_id is not set
    }

    console.log(`Fetched advertiser_id ${userData.advertiser_id} for user ${session.user.id}`);
    return userData.advertiser_id;
  } catch (error) {
    console.error('Error fetching advertiser_id from user:', error);
    return 22717; // Default value if an error occurs
  }
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

// Backup Content URLs for each ad size
// TODO: Update URLs with Suun Terveystalo branded backup images
const backupContentURLs: { [key: string]: string } = {
  '1080x1920': 'https://norr3.fi/wp-content/uploads/2025/03/KiMa-automated-2025-backup-1080x1920-px.jpg',
  '980x400': 'https://norr3.fi/wp-content/uploads/2025/03/KiMa-automated-2025-backup-980x400-px.jpg',
  '620x891': 'https://norr3.fi/wp-content/uploads/2025/03/KiMa-automated-2025-backup-620x891-px.jpg',
  '300x600': 'https://norr3.fi/wp-content/uploads/2025/03/KiMa-automated-2025-backup-300x600-px.jpg',
  '300x431': 'https://norr3.fi/wp-content/uploads/2025/03/KiMa-automated-2025-backup-300x431-px.jpg',
  '300x300': 'https://norr3.fi/wp-content/uploads/2025/03/KiMa-automated-2025-backup-300x300-px.jpg',  // TODO: Create 300x300 backup image
};

// Fetch bid strategy templates for a channel from Supabase
async function getBidStrategyTemplates(channel: 'DISPLAY' | 'PDOOH'): Promise<BidStrategyTemplate[]> {
  const { data, error } = await supabase
    .from('bidtheatre_bid_strategies')
    .select('*')
    .eq('channel', channel);

  console.log(`Fetched bid strategy templates for channel ${channel}: ${data?.length || 0} templates`);

  if (error) {
    throw new Error(`Failed to fetch bid strategy templates for ${channel}`);
  }

  return data as BidStrategyTemplate[];
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

// Authenticate with Creatopy and get token
async function getCreatopyToken(): Promise<string | null> {
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
    return null;
  }
}

// Helper function to validate and format date for BidTheatre (YYYY-MM-DD)
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

// Convert meters to kilometers and round up
function convertMetersToKm(meters: number): number {
  const km = meters / 1000;
  const result = Math.ceil(km);
  console.log(`Converted ${meters} meters to ${result} kilometers`);
  return result;
}

// Fetch apartment keys from campaign_apartments table
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

    const apartmentKeys = data.map(row => row.apartment_key);
    return apartmentKeys;
  } catch (error) {
    return [];
  }
}

// Fetch apartment details from apartments table using apartment keys
async function fetchApartmentDetails(apartmentKeys: string[]): Promise<Apartment[]> {
  try {
    const { data, error } = await supabase
      .from('apartments')
      .select('*')
      .in('key', apartmentKeys);

    console.log(`Fetched apartment details for keys ${JSON.stringify(apartmentKeys)}: ${data?.length || 0} apartments`);

    if (error) {
      throw error;
    }

    return data as Apartment[];
  } catch (error) {
    return [];
  }
}

// Poll Creatopy export until the video URL is available
async function pollCreatopyExport(exportId: string, creatopyToken: string, maxAttempts: number = 60, initialDelayMs: number = 5000): Promise<string> {
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

    delayMs = Math.min(delayMs * 1.5, 15000);
  }

  throw new Error(`Creatopy export did not complete after ${maxAttempts} attempts for export ID ${exportId}`);
}

// Create a campaign in BidTheatre
export const createBidTheatreCampaign = async (campaign: Campaign): Promise<BidTheatreResponse> => {
  let btToken = await getBidTheatreToken();
  if (!btToken) {
    return { success: false, error: 'Failed to authenticate with BidTheatre' };
  }

  let creatopyToken = await getCreatopyToken();
  if (!creatopyToken) {
    return { success: false, error: 'Failed to authenticate with Creatopy' };
  }

  const credentials = await getBidTheatreCredentials();
  console.log(`Fetched BidTheatre credentials for network ${credentials.network_id}`);

  const BT_NETWORK_ID = credentials.network_id;

  // Fetch the advertiser_id from the current user's record
  const advertiserId = await getAdvertiserIdFromUser();
  console.log(`Using advertiser_id: ${advertiserId} for campaign ${campaign.id}`);
  const advertiserIdInt = parseInt(advertiserId.toString(), 10);
console.log(`Using advertiser_id: ${advertiserIdInt} for campaign ${campaign.id}`);

  const channels = [];
  if (campaign.channel_display) channels.push('DISPLAY');
  if (campaign.channel_pdooh) channels.push('PDOOH');

  console.log(`Determined channels for campaign ${campaign.id}: ${channels.join(', ')}`);

  if (channels.length === 0) {
    return { success: true, error: 'No BidTheatre channels selected' };
  }

  const apartmentKeys = await fetchApartmentKeys(campaign.id);
  console.log(`Fetched apartment keys for campaign ${campaign.id}: ${JSON.stringify(apartmentKeys)}`);

  const apartments = await fetchApartmentDetails(apartmentKeys);
  console.log(`Fetched apartment details for campaign ${campaign.id}: ${apartments.length} apartments`);

  const campaignIds: { [key: string]: string } = {};
  let overallSuccess = true;
  let overallError = '';

  for (const channel of channels) {
    console.log(`Starting campaign creation for channel ${channel}, campaign ${campaign.id}`);

    try {
      const campaignPayload = {
        name: `KM / ${channel} / ${campaign.id}`,
        advertiser: advertiserIdInt, // Use the fetched advertiser_id
        campaignManager: credentials.username,
        campaignKPI: 3,
        defaultLineItem: 295489,
        targetURL: 'https://www.kiinteistomaailma.fi/',
        defaultGeoTarget: null,
        expectedTotalImps: channel === 'DISPLAY' ? 8422 : 12500,
        deliveryPriority: 'even',
        defaultFilterTarget: channel === 'DISPLAY' ? 22418 : 32491,
        defaultOptimizationStrategy: channel === 'DISPLAY' ? 538 : 519,
        allowWideTargeting: false,
        renderOBA: false,
        takeScreenshots: false,
      };

      const campaignResponse = await retryWithBackoff(() =>
        bidTheatreApi.post(`/${BT_NETWORK_ID}/campaign`, campaignPayload, {
          headers: { Authorization: `Bearer ${btToken}` },
        })
      );
      const btCampaignId = campaignResponse.data.campaign.id;
      campaignIds[channel] = btCampaignId;

      console.log(`Created campaign for channel ${channel}, campaign ${campaign.id}, BidTheatre ID: ${btCampaignId}`);

      const updateField = channel === 'DISPLAY' ? 'display_bt_id' : 'pdooh_bt_id';
      const { error: updateError } = await supabase
        .from('campaigns')
        .update({ [updateField]: btCampaignId })
        .eq('id', campaign.id);

      if (updateError) {
        overallError += `Failed to update ${updateField} for campaign ${campaign.id}: ${updateError.message}\n`;
      }
      console.log(`Updated campaign ${campaign.id} in Supabase with ${updateField}: ${btCampaignId}`);

      await retryWithBackoff(() =>
        bidTheatreApi.post(`/${BT_NETWORK_ID}/campaign/${btCampaignId}/category`, { category: 3 }, {
          headers: { Authorization: `Bearer ${btToken}` },
        })
      );
      console.log(`Set category for campaign ${btCampaignId}, channel ${channel}`);

      const budget = channel === 'DISPLAY' ? campaign.budget_display : campaign.budget_pdooh;
      if (budget == null || budget <= 0) {
        throw new Error(`Invalid budget for ${channel}: ${budget}. Budget must be a positive number.`);
      }
      console.log(`Validated budget for channel ${channel}: ${budget}`);

      const isOngoing = !campaign.campaign_end_date || campaign.campaign_end_date.toUpperCase() === 'ONGOING';
      let endDate: string | null = null;
      if (isOngoing) {
        const startDate = parseISO(formatDateForBidTheatre(campaign.campaign_start_date));
        const initialEndDate = new Date(startDate);
        initialEndDate.setMonth(startDate.getMonth() + 1);
        endDate = format(initialEndDate, 'yyyy-MM-dd');
      } else {
        endDate = formatDateForBidTheatre(campaign.campaign_end_date);
      }
      console.log(`Determined end date for campaign ${campaign.id}, channel ${channel}: ${endDate}`);

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
        console.log(`Set cycle for campaign ${btCampaignId}, channel ${channel}`);
      } catch (cycleError) {
        throw new Error(`Failed to set cycle for ${channel}: ${cycleError.message}`);
      }

      const adGroups = channel === 'DISPLAY' ? [
        { name: 'Mobile sizes', sizes: ['300x600', '300x431'], autoAddAds: false },
        { name: 'Small desktop', sizes: ['300x600', '300x300'], autoAddAds: false },
        { name: 'Large desktop sizes', sizes: ['620x891', '980x400'], autoAddAds: false },
      ] : [{ name: 'Default campaign', sizes: ['1080x1920'], autoAddAds: false }];

      const adGroupIds: { [key: string]: string } = {};
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
        console.log(`Created ad group ${adGroup.name} for campaign ${btCampaignId}, channel ${channel}, ad group ID: ${adGroupIds[adGroup.name]}`);
      }

      const adIds: { [key: string]: number[] } = {};
      const videoLinearIds: { [key: string]: string } = {};
      for (const adGroup of adGroups) {
        adIds[adGroup.name] = [];
      }
      console.log(`Initialized ad IDs for ad groups: ${JSON.stringify(Object.keys(adIds))}`);

      if (channel === 'DISPLAY') {
        const adConfigs = {
          '300x300': { hash: 'PENDING', width: 300, height: 300 },  // TODO: Update hash when Creatopy template ready
          '300x431': { hash: 'g3jo2pn', width: 300, height: 431 },
          '300x600': { hash: '11jp13n', width: 300, height: 600 },
          '620x891': { hash: 'mqopyyq', width: 620, height: 891 },
          '980x400': { hash: '58z5ylw', width: 980, height: 400 },
        };

        if (!apartmentKeys || apartmentKeys.length === 0) {
          overallError += `No ads created for ${channel} due to missing apartment keys\n`;
          console.log(`No ads created for channel ${channel} due to missing apartment keys`);
        } else {
          for (const aptKey of apartmentKeys) {
            for (const adGroup of adGroups) {
              for (const size of adGroup.sizes) {
                const config = adConfigs[size];
                const adPayload = {
                  campaign: btCampaignId,
                  name: `${aptKey} - ${size}`,
                  adType: 'HTML banner',
                  adStatus: 'Active',
                  html: `<script type="text/javascript">var embedConfig = {"hash": "${config.hash}", "width": ${config.width}, "height": ${config.height}, "t": "{timestamp}", "userId": 762652, "network": "STANDARD", "type": "html5", "clickTag": "https://www.kiinteistomaailma.fi/${aptKey}?utm_source=programmatic&utm_medium=display&utm_campaign=marketing-engine&utm_content=${campaign.id}", "targetId": "${campaign.id}-${aptKey}"};</script><script type="text/javascript" src="https://live-tag.creatopy.net/embed/embed.js"></script>`,
                  dimension: size === '300x300' ? 10 : size === '300x600' ? 11 : size === '620x891' ? 1888 : 15,
                  isExpandable: false,
                  isInSync: true,
                  isSecure: true,
                  backupContentURL: backupContentURLs[size], // Add backup content URL
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
                } catch (adError) {
                  overallError += `Ad creation failed for ${channel} - ${aptKey} - ${size}: ${adError.message}\n`;
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
              console.log(`Assigned ads to ad group ${adGroup.name} for channel ${channel}: ${adIdsToAssign.length} ads`);
            } catch (assignError) {
              overallError += `Ad assignment failed for ${channel} - ${adGroup.name}: ${assignError.message}\n`;
            }
          }
        }
      } else if (channel === 'PDOOH') {
        const adConfigs = {
          '1080x1920': { hash: 'x8x7e3x', width: 1080, height: 1920 },
        };

        if (!apartmentKeys || apartmentKeys.length === 0) {
          overallError += `No ads created for ${channel} due to missing apartment keys\n`;
          console.log(`No ads created for channel ${channel} due to missing apartment keys`);
        } else {
          for (const aptKey of apartmentKeys) {
            const apartment = apartments.find(apt => apt.key === aptKey);
            if (!apartment) {
              overallError += `Apartment ${aptKey} not found for ${channel}\n`;
              console.log(`Apartment ${aptKey} not found for channel ${channel}`);
              continue;
            }
            console.log(`Found apartment ${aptKey} for channel ${channel}`);

            const config = adConfigs['1080x1920'];
            const elementsChanges = [
              {
                elementName: 'images.link',
                changes: [{ attribute: 'SOURCE', value: apartment.images[0]?.url || 'https://via.placeholder.com/1080x1920' }],
              },
              {
                elementName: 'address',
                changes: [{ attribute: 'LABEL', value: `\n${apartment.address}\n` }],
              },
              {
                elementName: 'room_types',
                changes: [{ attribute: 'LABEL', value: `\n${apartment.totalarea} m² / ${apartment.roomtypes}\n` }],
              },
              {
                elementName: 'sales_price_unencumbered',
                changes: [{ attribute: 'LABEL', value: `\n${apartment.salesprice_unencumbered} €\n` }],
              },
              {
                elementName: 'agent_picture_url',
                changes: [{ attribute: 'SOURCE', value: apartment.agent?.pictureUrl || 'https://via.placeholder.com/150' }],
              },
              {
                elementName: 'agent',
                changes: [{ attribute: 'LABEL', value: `\n${apartment.agent?.name || 'Unknown Agent'}\n` }],
              },
            ];

            const exportPayload = {
              templateHash: config.hash,
              type: 'mp4',
              elementsChanges,
            };
            const exportResponse = await creatopyApi.post('/export-with-changes', exportPayload, {
              headers: { Authorization: `Bearer ${creatopyToken}` },
            });
            console.log(`Created Creatopy export for apartment ${aptKey}, channel ${channel}`);

            const exportId = exportResponse.data.response.export.id;
            if (!exportId) {
              throw new Error('Creatopy export ID is undefined in response');
            }

            const videoUrl = await pollCreatopyExport(exportId, creatopyToken);
            console.log(`Polled Creatopy export for apartment ${aptKey}, channel ${channel}, video URL: ${videoUrl}`);

            const videoLinearPayload = {
              campaign: parseInt(btCampaignId),
              name: `${aptKey} - ${campaign.campaign_address}`,
              advertiser: advertiserIdInt, // Use the fetched advertiser_id
            };
            const videoLinearResponse = await retryWithBackoff(() =>
              bidTheatreApi.post(`/${BT_NETWORK_ID}/video-linear`, videoLinearPayload, {
                headers: { Authorization: `Bearer ${btToken}` },
              })
            );
            const videoLinearId = videoLinearResponse.data.videoLinear.id;
            videoLinearIds[aptKey] = videoLinearId;
            console.log(`Created video linear for apartment ${aptKey}, channel ${channel}, video linear ID: ${videoLinearId}`);

            const videoResponse = await axios.get(videoUrl, {
              responseType: 'arraybuffer',
            });

            const videoBlob = new Blob([videoResponse.data], { type: 'video/mp4' });

            const formData = new FormData();
            formData.append('url', videoBlob, `${aptKey}-video.mp4`);
            formData.append('delivery', 'progressive');
            formData.append('bitRate', '5901');
            formData.append('mimeType', 'video/mp4');
            formData.append('duration', '00:00:10');
            formData.append('dimension', '216');
            formData.append('scalable', 'false');
            formData.append('maintainRatio', 'false');

            await retryWithBackoff(() =>
              bidTheatreApi.post(`/${BT_NETWORK_ID}/video-linear/${videoLinearId}/media`, formData, {
                headers: {
                  Authorization: `Bearer ${btToken}`,
                  'Content-Type': 'multipart/form-data',
                },
              })
            );
            console.log(`Uploaded video for apartment ${aptKey}, channel ${channel}, video linear ID: ${videoLinearId}`);

            const adPayload = {
              campaign: parseInt(btCampaignId),
              name: `${aptKey} - ${campaign.campaign_address}`,
              adType: 'Video ad',
              adStatus: 'Active',
              isSecure: true,
              dimension: 385,
              backupContentURL: backupContentURLs['1080x1920'], // Add backup content URL for PDOOH
            };
            const adResponse = await retryWithBackoff(() =>
              bidTheatreApi.post(`/${BT_NETWORK_ID}/ad`, adPayload, {
                headers: { Authorization: `Bearer ${btToken}` },
              })
            );
            const adId = parseInt(adResponse.data.ad.id);
            adIds['Default campaign'].push(adId);
            console.log(`Created ad for apartment ${aptKey}, channel ${channel}, ad ID: ${adId}`);

            const videoCreativePayload = {
              sequence: 1,
              videoCreative: videoLinearId,
            };
            await retryWithBackoff(() =>
              bidTheatreApi.post(`/${BT_NETWORK_ID}/ad/${adId}/video-creative`, videoCreativePayload, {
                headers: { Authorization: `Bearer ${btToken}` },
              })
            );
            console.log(`Added video creative for ad ${adId}, apartment ${aptKey}, channel ${channel}`);
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
              console.log(`Assigned ads to ad group ${adGroup.name} for channel ${channel}: ${adIdsToAssign.length} ads`);
            } catch (assignError) {
              overallError += `Ad assignment failed for ${channel} - ${adGroup.name}: ${assignError.message}\n`;
            }
          }
        }
      }

      let geoTargetId: string;
      let geoTargetCoordinatesId: string;
      try {
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
      } catch (error) {
        throw new Error(`Failed to create geo-target for ${channel} campaign ${btCampaignId}: ${error instanceof Error ? error.message : String(error)}`);
      }

      const bidStrategyTemplates = await getBidStrategyTemplates(channel as 'DISPLAY' | 'PDOOH');
      console.log(`Fetched bid strategy templates for channel ${channel}: ${bidStrategyTemplates.length} templates`);
      if (bidStrategyTemplates.length === 0) {
        bidStrategyTemplates.push({
          id: 0,
          channel: channel as 'DISPLAY' | 'PDOOH',
          rtb_sitelist: 157553,
          adgroup_name: channel === 'DISPLAY' ? 'Large desktop sizes' : undefined,
          max_cpm: 5.0,
          name: `${channel} Bid Strategy`,
          paused: false,
          target_share: 100,
          filterTarget: null,
        });
        console.log(`Added default bid strategy template for channel ${channel}`);
      }

      for (const template of bidStrategyTemplates) {
        const adGroupId = channel === 'DISPLAY' ? adGroupIds[template.adgroup_name!] : adGroupIds['Default campaign'];
        const strategyPayload = {
          rtbSitelist: template.rtb_sitelist,
          adgroup: parseInt(adGroupId),
          maxCPM: template.max_cpm,
          geoTarget: parseInt(geoTargetId),
          name: template.name,
          paused: template.paused,
          targetShare: template.target_share,
          filterTarget: template.filterTarget || null,
        };
        try {
          await retryWithBackoff(() =>
            bidTheatreApi.post(`/${BT_NETWORK_ID}/campaign-target/${btCampaignId}/bid-strategy`, strategyPayload, {
              headers: { Authorization: `Bearer ${btToken}` },
            })
          );
          console.log(`Created bid strategy ${template.name} for campaign ${btCampaignId}, channel ${channel}`);
        } catch (strategyError) {
          overallError += `Bid strategy failed for ${channel} - ${template.name}: ${strategyError.message}\n`;
        }
      }

      try {
        const { error } = await supabase
          .from('bidtheatre_campaigns')
          .insert({
            campaign_id: campaign.id,
            bt_campaign_id: btCampaignId,
            channel: channel,
            geo_target_id: geoTargetId,
            geo_target_coordinates_id: geoTargetCoordinatesId,
            latitude: campaign.campaign_coordinates.lat,
            longitude: campaign.campaign_coordinates.lng,
            radius: campaign.campaign_radius,
            ad_group_ids: adGroupIds,
            ad_ids: adIds,
            video_linear_ids: channel === 'PDOOH' ? videoLinearIds : null,
            is_ongoing: isOngoing,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });

        if (error) {
          overallError += `Failed to save BidTheatre metadata for ${channel}: ${error.message}\n`;
        }
        console.log(`Saved BidTheatre metadata for campaign ${campaign.id}, channel ${channel}`);
      } catch (error) {
        overallError += `Error saving BidTheatre metadata for ${channel}: ${error instanceof Error ? error.message : String(error)}\n`;
      }
    } catch (error) {
      overallSuccess = false;
      overallError += `Error in ${channel}: ${error instanceof Error ? error.message : String(error)}\n`;
    }
  }

  return {
    success: overallSuccess,
    btCampaignId: channels.length === 1 ? campaignIds[channels[0]] : undefined,
    campaignIds: channels.length > 1 ? campaignIds : undefined,
    error: overallError || undefined,
  };
};

// Utility function to retry API calls with exponential backoff
const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> => {
  let lastError: any;

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

// Update a campaign in BidTheatre
export const updateBidTheatreCampaign = async (
  campaign: Campaign,
  btCampaignId: string,
  channel: 'DISPLAY' | 'PDOOH'
): Promise<BidTheatreResponse> => {
  let btToken = await getBidTheatreToken();
  if (!btToken) {
    return { success: false, error: 'Failed to authenticate with BidTheatre' };
  }

  let creatopyToken = await getCreatopyToken();
  if (!creatopyToken) {
    return { success: false, error: 'Failed to authenticate with Creatopy' };
  }

  const credentials = await getBidTheatreCredentials();
  const BT_NETWORK_ID = credentials.network_id;

  // Fetch the advertiser_id from the current user's record
  const advertiserId = await getAdvertiserIdFromUser();
  console.log(`Using advertiser_id: ${advertiserId} for campaign update ${campaign.id}`);
  const advertiserIdInt = parseInt(advertiserId.toString(), 10);
console.log(`Using advertiser_id: ${advertiserIdInt} for campaign update ${campaign.id}`);

  try {
    const budget = channel === 'DISPLAY' ? campaign.budget_display : campaign.budget_pdooh;
    if (budget == null || budget <= 0) {
      return { success: false, error: `Invalid budget for ${channel}: ${budget}. Budget must be a positive number.` };
    }

    if (!campaign.campaign_coordinates || campaign.campaign_coordinates.lat === 0 || campaign.campaign_coordinates.lng === 0) {
      return { success: false, error: 'Campaign coordinates are required for BidTheatre campaigns.' };
    }

    let btData: any = null;
    const { data, error: fetchError } = await supabase
      .from('bidtheatre_campaigns')
      .select('*')
      .eq('campaign_id', campaign.id)
      .eq('channel', channel)
      .maybeSingle();

    if (fetchError) {
      throw new Error(`Failed to fetch BidTheatre metadata for campaign ${campaign.id}: ${fetchError.message}`);
    }

    btData = data;

    if (!btData) {
      let geoTargetId: string | undefined;
      let geoTargetCoordinatesId: string | undefined;
      let latitude: number | undefined;
      let longitude: number | undefined;
      let radius: number | undefined;

      await retryWithBackoff(async () => {
        const geoTargetResponse = await bidTheatreApi.get(`/${BT_NETWORK_ID}/campaign/${btCampaignId}/geo-target`, {
          headers: { Authorization: `Bearer ${btToken}` },
        });

        geoTargetId = geoTargetResponse.data.geoTargets?.[0]?.id;
        if (geoTargetId) {
          const coordinatesResponse = await bidTheatreApi.get(`/${BT_NETWORK_ID}/geo-target/${geoTargetId}/geo-target-coordinate`, {
            headers: { Authorization: `Bearer ${btToken}` },
          });

          const coordinatesData = coordinatesResponse.data.geoTargetCoordinates?.[0];
          geoTargetCoordinatesId = coordinatesData?.id;
          latitude = coordinatesData?.latitude;
          longitude = coordinatesData?.longitude;
          radius = coordinatesData?.radius ? coordinatesData.radius * 1000 : undefined;
        }
      });

      const adGroupsResponse = await retryWithBackoff(() =>
        bidTheatreApi.get(`/${BT_NETWORK_ID}/campaign/${btCampaignId}/adgroup`, {
          headers: { Authorization: `Bearer ${btToken}` },
        })
      );

      const adGroups = adGroupsResponse.data.adgroups || [];
      const adGroupIds: { [key: string]: string } = {};
      const adIds: { [key: string]: string[] } = {};

      if (channel === 'DISPLAY') {
        const adGroupNames = ['Mobile sizes', 'Small desktop', 'Large desktop sizes'];
        for (const name of adGroupNames) {
          const adGroup = adGroups.find((ag: any) => ag.name === name);
          if (adGroup) {
            adGroupIds[name] = adGroup.id;
          }
        }
      } else {
        const adGroup = adGroups.find((ag: any) => ag.name === 'Default campaign');
        if (adGroup) {
          adGroupIds['Default campaign'] = adGroup.id;
        }
      }

      for (const [adGroupName, adGroupId] of Object.entries(adGroupIds)) {
        const adsResponse = await retryWithBackoff(() =>
          bidTheatreApi.get(`/${BT_NETWORK_ID}/adgroup/${adGroupId}/ad`, {
            headers: { Authorization: `Bearer ${btToken}` },
          })
        );

        adIds[adGroupName] = (adsResponse.data.ads || []).map((ad: any) => ad.id.toString());
      }

      const videoLinearIds: { [key: string]: string } = channel === 'PDOOH' ? {} : null;
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
          } catch (error) {
            // Skip if video linear ID cannot be fetched
          }
        }
      }

      const { data: newData, error: insertError } = await supabase
        .from('bidtheatre_campaigns')
        .insert({
          campaign_id: campaign.id,
          bt_campaign_id: btCampaignId,
          channel: channel,
          geo_target_id: geoTargetId,
          geo_target_coordinates_id: geoTargetCoordinatesId,
          latitude: latitude || campaign.campaign_coordinates.lat,
          longitude: longitude || campaign.campaign_coordinates.lng,
          radius: radius || campaign.campaign_radius,
          ad_group_ids: adGroupIds,
          ad_ids: adIds,
          video_linear_ids: videoLinearIds,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError || !newData) {
        throw new Error(`Failed to create BidTheatre metadata for campaign ${campaign.id}: ${insertError?.message || 'Insert failed'}`);
      }

      btData = newData;
    }

    const campaignPayload = {
      name: `KM / ${channel} / ${campaign.id}`,
      advertiser: advertiserIdInt, // Use the fetched advertiser_id
      campaignManager: credentials.username,
      campaignKPI: 3,
      defaultLineItem: 295489,
      targetURL: 'https://www.kiinteistomaailma.fi/',
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

    const isOngoing = !campaign.campaign_end_date || campaign.campaign_end_date.toUpperCase() === 'ONGOING';
    let endDate: string | null = null;
    if (isOngoing) {
      const startDate = parseISO(formatDateForBidTheatre(campaign.campaign_start_date));
      const initialEndDate = new Date(startDate);
      initialEndDate.setMonth(startDate.getMonth() + 1);
      endDate = format(initialEndDate, 'yyyy-MM-dd');
    } else {
      endDate = formatDateForBidTheatre(campaign.campaign_end_date);
    }

    const cyclePayload = {
      startDate: formatDateForBidTheatre(campaign.campaign_start_date),
      endDate: endDate,
      deliveryUnit: 'Budget',
      amount: budget,
      showDiffInvoicePopup: false,
    };

    const cycleResponse = await retryWithBackoff(() =>
      bidTheatreApi.get(`/${BT_NETWORK_ID}/campaign/${btCampaignId}/cycle`, {
        headers: { Authorization: `Bearer ${btToken}` },
      })
    );

    const cycleId = cycleResponse.data.cycles[0]?.id;
    if (cycleId) {
      await retryWithBackoff(() =>
        bidTheatreApi.put(`/${BT_NETWORK_ID}/campaign/${btCampaignId}/cycle/${cycleId}`, cyclePayload, {
          headers: { Authorization: `Bearer ${btToken}` },
        })
      );
    } else {
      await retryWithBackoff(() =>
        bidTheatreApi.post(`/${BT_NETWORK_ID}/campaign/${btCampaignId}/cycle`, cyclePayload, {
          headers: { Authorization: `Bearer ${btToken}` },
        })
      );
    }

    let geoTargetId = btData.geo_target_id;
    let geoTargetCoordinatesId = btData.geo_target_coordinates_id;
    const coordinatesChanged =
      btData.latitude !== campaign.campaign_coordinates.lat ||
      btData.longitude !== campaign.campaign_coordinates.lng ||
      btData.radius !== campaign.campaign_radius;

    if (coordinatesChanged || !geoTargetId) {
      if (geoTargetId) {
        await retryWithBackoff(() =>
          bidTheatreApi.put(`/${BT_NETWORK_ID}/geo-target/${geoTargetId}`, {
            name: `${campaign.campaign_address}, ${campaign.campaign_city}`,
          }, {
            headers: { Authorization: `Bearer ${btToken}` },
          })
        );

        if (geoTargetCoordinatesId) {
          await retryWithBackoff(() =>
            bidTheatreApi.put(`/${BT_NETWORK_ID}/geo-target/${geoTargetId}/geo-target-coordinate/${geoTargetCoordinatesId}`, {
              latitude: campaign.campaign_coordinates.lat,
              longitude: campaign.campaign_coordinates.lng,
              radius: convertMetersToKm(campaign.campaign_radius),
            }, {
              headers: { Authorization: `Bearer ${btToken}` },
            })
          );
        } else {
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
        }
      } else {
        const newGeoTargetResponse = await retryWithBackoff(() =>
          bidTheatreApi.post(`/${BT_NETWORK_ID}/geo-target`, {
            name: `${campaign.campaign_address}, ${campaign.campaign_city}`,
          }, {
            headers: { Authorization: `Bearer ${btToken}` },
          })
        );

        geoTargetId = newGeoTargetResponse.data.geoTarget.id;
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

        await retryWithBackoff(() =>
          bidTheatreApi.post(`/${BT_NETWORK_ID}/campaign/${btCampaignId}/geo-target`, {
            geoTarget: geoTargetId,
          }, {
            headers: { Authorization: `Bearer ${btToken}` },
          })
        );
      }
    }

    const apartmentKeys = await fetchApartmentKeys(campaign.id);
    const apartments = await fetchApartmentDetails(apartmentKeys);

    const adGroupIds: { [key: string]: string } = btData.ad_group_ids || {};
    const existingAdIds: { [key: string]: string[] } = btData.ad_ids || {};
    const existingVideoLinearIds: { [key: string]: string } = channel === 'PDOOH' ? (btData.video_linear_ids || {}) : {};

    const currentApartmentKeys = new Set(apartmentKeys);
    const adConfigs = channel === 'DISPLAY' ? {
      '300x300': { hash: 'PENDING', width: 300, height: 300 },  // TODO: Update hash when Creatopy template ready
      '300x431': { hash: 'g3jo2pn', width: 300, height: 431 },
      '300x600': { hash: '11jp13n', width: 300, height: 600 },
      '620x891': { hash: 'mqopyyq', width: 620, height: 891 },
      '980x400': { hash: '58z5ylw', width: 980, height: 400 },
    } : {
      '1080x1920': { hash: 'x8x7e3x', width: 1080, height: 1920 },
    };

    const adGroupsConfig = channel === 'DISPLAY' ? [
      { name: 'Mobile sizes', sizes: ['300x600', '300x431'] },
      { name: 'Small desktop', sizes: ['300x600', '300x300'] },
      { name: 'Large desktop sizes', sizes: ['620x891', '980x400'] },
    ] : [{ name: 'Default campaign', sizes: ['1080x1920'] }];

    const newAdIds: { [key: string]: string[] } = { ...existingAdIds };
    const newVideoLinearIds: { [key: string]: string } = channel === 'PDOOH' ? { ...existingVideoLinearIds } : null;

    for (const adGroup of adGroupsConfig) {
      const adGroupName = adGroup.name;
      const adGroupId = adGroupIds[adGroupName];
      if (!adGroupId) {
        continue;
      }

      const currentAds = existingAdIds[adGroupName] || [];
      const adsToPause: string[] = [];
      const adsToAdd: { aptKey: string, size: string }[] = [];

      for (const adId of currentAds) {
        try {
          const adResponse = await retryWithBackoff(() =>
            bidTheatreApi.get(`/${BT_NETWORK_ID}/ad/${adId}`, {
              headers: { Authorization: `Bearer ${btToken}` },
            })
          );
          const adNameParts = adResponse.data.ad.name.split(' - ');
          const aptKey = adNameParts[0];
          if (!currentApartmentKeys.has(aptKey)) {
            adsToPause.push(adId);
          }
        } catch (error) {
          adsToPause.push(adId);
        }
      }

      for (const adId of adsToPause) {
        await retryWithBackoff(() =>
          bidTheatreApi.put(`/${BT_NETWORK_ID}/ad/${adId}`, {
            adType: channel === 'DISPLAY' ? 'HTML banner' : 'Video ad',
            adStatus: 'Inactive',
            backupContentURL: channel === 'DISPLAY' ? backupContentURLs[size] : backupContentURLs['1080x1920'], // Add backup content URL
            campaign: parseInt(btCampaignId),
          }, {
            headers: { Authorization: `Bearer ${btToken}` },
          })
        );
      }

      for (const aptKey of apartmentKeys) {
        for (const size of adGroup.sizes) {
          const adName = `${aptKey} - ${size}`;
          let adExists = false;
          for (const adId of currentAds) {
            try {
              const adResponse = await retryWithBackoff(() =>
                bidTheatreApi.get(`/${BT_NETWORK_ID}/ad/${adId}`, {
                  headers: { Authorization: `Bearer ${btToken}` },
                })
              );
              if (adResponse.data.ad.name === adName) {
                adExists = true;
                if (adsToPause.includes(adId)) {
                  await retryWithBackoff(() =>
                    bidTheatreApi.put(`/${BT_NETWORK_ID}/ad/${adId}`, {
                      adType: channel === 'DISPLAY' ? 'HTML banner' : 'Video ad',
                      adStatus: 'Active',
                      backupContentURL: channel === 'DISPLAY' ? backupContentURLs[size] : backupContentURLs['1080x1920'], // Add backup 
                      campaign: parseInt(btCampaignId),
                    }, {
                      headers: { Authorization: `Bearer ${btToken}` },
                    })
                  );
                }
                break;
              }
            } catch (error) {
              // Skip if ad cannot be fetched
            }
          }

          if (!adExists) {
            adsToAdd.push({ aptKey, size });
          }
        }
      }

      newAdIds[adGroupName] = [...currentAds];
      for (const { aptKey, size } of adsToAdd) {
        const apartment = apartments.find(apt => apt.key === aptKey);
        if (!apartment) {
          continue;
        }

        if (channel === 'DISPLAY') {
          const config = adConfigs[size];
          const adPayload = {
            campaign: parseInt(btCampaignId),
            name: `${aptKey} - ${size}`,
            adType: 'HTML banner',
            adStatus: 'Active',
            html: `<script type="text/javascript">var embedConfig = {"hash": "${config.hash}", "width": ${config.width}, "height": ${config.height}, "t": "{timestamp}", "userId": 762652, "network": "STANDARD", "type": "html5", "clickTag": "https://www.kiinteistomaailma.fi/${aptKey}?utm_source=programmatic&utm_medium=display&utm_campaign=marketing-engine&utm_content=${campaign.id}", "targetId": "${campaign.id}-${aptKey}"};</script><script type="text/javascript" src="https://live-tag.creatopy.net/embed/embed.js"></script>`,
            dimension: size === '300x300' ? 10 : size === '300x600' ? 11 : size === '620x891' ? 1888 : 15,
            isExpandable: false,
            isInSync: true,
            isSecure: true,
            backupContentURL: backupContentURLs[size], // Add backup content URL
          };

          const adResponse = await retryWithBackoff(() =>
            bidTheatreApi.post(`/${BT_NETWORK_ID}/ad`, adPayload, {
              headers: { Authorization: `Bearer ${btToken}` },
            })
          );

          const adId = parseInt(adResponse.data.ad.id);
          newAdIds[adGroupName].push(adId.toString());

          await retryWithBackoff(() =>
            bidTheatreApi.post(`/${BT_NETWORK_ID}/adgroup/${adGroupId}/ad`, {
              ad: [adId],
            }, {
              headers: { Authorization: `Bearer ${btToken}` },
            })
          );
        } else {
          const config = adConfigs['1080x1920'];
          const elementsChanges = [
            {
              elementName: 'images.link',
              changes: [{ attribute: 'SOURCE', value: apartment.images[0]?.url || 'https://via.placeholder.com/1080x1920' }],
            },
            {
              elementName: 'address',
              changes: [{ attribute: 'LABEL', value: `\n${apartment.address}\n` }],
            },
            {
              elementName: 'room_types',
              changes: [{ attribute: 'LABEL', value: `\n${apartment.totalarea} m² / ${apartment.roomtypes}\n` }],
            },
            {
              elementName: 'sales_price_unencumbered',
              changes: [{ attribute: 'LABEL', value: `\n${apartment.salesprice_unencumbered} €\n` }],
            },
            {
              elementName: 'agent_picture_url',
              changes: [{ attribute: 'SOURCE', value: apartment.agent?.pictureUrl || 'https://via.placeholder.com/150' }],
            },
            {
              elementName: 'agent',
              changes: [{ attribute: 'LABEL', value: `\n${apartment.agent?.name || 'Unknown Agent'}\n` }],
            },
          ];

          const exportPayload = {
            templateHash: config.hash,
            type: 'mp4',
            elementsChanges,
          };

          const exportResponse = await creatopyApi.post('/export-with-changes', exportPayload, {
            headers: { Authorization: `Bearer ${creatopyToken}` },
          });

          const exportId = exportResponse.data.response.export.id;
          if (!exportId) {
            throw new Error('Creatopy export ID is undefined in response');
          }

          const videoUrl = await pollCreatopyExport(exportId, creatopyToken);

          const videoLinearPayload = {
            campaign: parseInt(btCampaignId),
            name: `${aptKey} - ${campaign.campaign_address}`,
            advertiser: advertiserIdInt, // Use the fetched advertiser_id
          };

          const videoLinearResponse = await retryWithBackoff(() =>
            bidTheatreApi.post(`/${BT_NETWORK_ID}/video-linear`, videoLinearPayload, {
              headers: { Authorization: `Bearer ${btToken}` },
            })
          );

          const videoLinearId = videoLinearResponse.data.videoLinear.id;
          newVideoLinearIds[aptKey] = videoLinearId;

          const videoResponse = await axios.get(videoUrl, {
            responseType: 'arraybuffer',
          });

          const videoBlob = new Blob([videoResponse.data], { type: 'video/mp4' });

          const formData = new FormData();
          formData.append('url', videoBlob, `${aptKey}-video.mp4`);
          formData.append('delivery', 'progressive');
          formData.append('bitRate', '5901');
          formData.append('mimeType', 'video/mp4');
          formData.append('duration', '00:00:10');
          formData.append('dimension', '216');
          formData.append('scalable', 'false');
          formData.append('maintainRatio', 'false');

          await retryWithBackoff(() =>
            bidTheatreApi.post(`/${BT_NETWORK_ID}/video-linear/${videoLinearId}/media`, formData, {
              headers: {
                Authorization: `Bearer ${btToken}`,
                'Content-Type': 'multipart/form-data',
              },
            })
          );

          const adPayload = {
            campaign: parseInt(btCampaignId),
            name: `${aptKey} - ${campaign.campaign_address}`,
            adType: 'Video ad',
            adStatus: 'Active',
            isSecure: true,
            dimension: 385,
            backupContentURL: backupContentURLs['1080x1920'], // Add backup content URL for PDOOH
          };

          const adResponse = await retryWithBackoff(() =>
            bidTheatreApi.post(`/${BT_NETWORK_ID}/ad`, adPayload, {
              headers: { Authorization: `Bearer ${btToken}` },
            })
          );

          const adId = parseInt(adResponse.data.ad.id);
          newAdIds['Default campaign'] = newAdIds['Default campaign'] || [];
          newAdIds['Default campaign'].push(adId.toString());

          const videoCreativePayload = {
            sequence: 1,
            videoCreative: videoLinearId,
          };

          await retryWithBackoff(() =>
            bidTheatreApi.post(`/${BT_NETWORK_ID}/ad/${adId}/video-creative`, videoCreativePayload, {
              headers: { Authorization: `Bearer ${btToken}` },
            })
          );

          await retryWithBackoff(() =>
            bidTheatreApi.post(`/${BT_NETWORK_ID}/adgroup/${adGroupId}/ad`, {
              ad: [adId],
            }, {
              headers: { Authorization: `Bearer ${btToken}` },
            })
          );
        }
      }
    }

    try {
      const { error } = await supabase
        .from('bidtheatre_campaigns')
        .update({
          geo_target_id: geoTargetId,
          geo_target_coordinates_id: geoTargetCoordinatesId,
          latitude: campaign.campaign_coordinates.lat,
          longitude: campaign.campaign_coordinates.lng,
          radius: campaign.campaign_radius,
          ad_ids: newAdIds,
          video_linear_ids: channel === 'PDOOH' ? newVideoLinearIds : btData.video_linear_ids,
          is_ongoing: isOngoing,
          updated_at: new Date().toISOString(),
        })
        .eq('campaign_id', campaign.id)
        .eq('channel', channel);

      if (error) {
        throw new Error(`Failed to update BidTheatre metadata: ${error.message}`);
      }
    } catch (error) {
      throw error;
    }

    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
};

// Get campaign details from BidTheatre
export const getBidTheatreCampaign = async (
  btCampaignId: string
): Promise<{ success: boolean; campaign?: any; error?: string }> => {
  let btToken = await getBidTheatreToken();
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

// Listener to pause campaigns when active is set to FALSE
export const setupCampaignActiveListener = () => {
  supabase
    .channel('campaigns')
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'campaigns' },
      async (payload) => {
        const { new: updatedCampaign, old: previousCampaign } = payload;
        if (updatedCampaign.active === false && previousCampaign.active === true) {
          const { pdooh_bt_id, display_bt_id } = updatedCampaign;

          let btToken = await getBidTheatreToken();
          if (!btToken) {
            return;
          }

          const credentials = await getBidTheatreCredentials();
          const BT_NETWORK_ID = credentials.network_id;

          const campaignIds = [];
          if (pdooh_bt_id) campaignIds.push({ id: pdooh_bt_id, type: 'pdooh_bt_id' });
          if (display_bt_id) campaignIds.push({ id: display_bt_id, type: 'display_bt_id' });

          for (const { id: campaignId, type } of campaignIds) {
            try {
              const cycleResponse = await bidTheatreApi.get(`/${BT_NETWORK_ID}/campaign/${campaignId}/cycle`, {
                headers: { Authorization: `Bearer ${btToken}` },
              });

              const cycle = cycleResponse.data.cycles[0];
              if (!cycle) {
                continue;
              }

              const cycleId = cycle.id;

              const now = new Date();
              const endDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}.0`;

              await bidTheatreApi.put(
                `/${BT_NETWORK_ID}/campaign/${campaignId}/cycle/${cycleId}`,
                { endDate },
                { headers: { Authorization: `Bearer ${btToken}` } }
              );
            } catch (error) {
              // Skip if error occurs
            }
          }
        }
      }
    )
    .subscribe();
};