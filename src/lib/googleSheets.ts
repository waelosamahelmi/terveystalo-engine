import axios from 'axios';
import { Campaign, CampaignApartment, Apartment, DentalCampaign, CampaignStatus } from '../types';
import { parseISO, format } from 'date-fns';
import { supabase } from './supabase';

// Google Sheets API endpoint
const SHEETS_API_ENDPOINT = 'https://sheets.googleapis.com/v4/spreadsheets';
const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID || '1c2nbTb3nwwoO3bzQWcxI32F7WiFQ4PgPk16aUF8-Fdk'; // Default to Suun Terveystalo feed sheet
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = import.meta.env.VITE_GOOGLE_REFRESH_TOKEN;

// Sheet name for Suun Terveystalo feed
const SHEET_NAME = 'FEED';

// Extended column range (A:BE = 57 columns for new fields)
const SHEET_RANGE = `${SHEET_NAME}!A:BE`;
const COLUMN_COUNT = 57;

// ============================================================================
// SHEET SYNC TRACKING — update sheet_row_id & sheet_last_sync in DB
// ============================================================================

async function updateSheetSyncTracking(campaignId: string, sheetRowId?: string): Promise<void> {
  try {
    const updates: Record<string, unknown> = {
      sheet_last_sync: new Date().toISOString(),
    };
    if (sheetRowId) {
      updates.sheet_row_id = sheetRowId;
    }
    await supabase
      .from('dental_campaigns')
      .update(updates)
      .eq('id', campaignId);
  } catch (e) {
    console.error('Failed to update sheet sync tracking:', e);
  }
}

// Function to get a new access token using the refresh token
async function getAccessToken() {
  try {
    // Check if all required credentials are present
    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
      console.debug('Google Sheets sync disabled - missing credentials');
      return null;
    }

    const response = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: CLIENT_SECRET,
        refresh_token: REFRESH_TOKEN,
        grant_type: 'refresh_token',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );
    
    if (!response.data.access_token) {
      console.warn('No access token received from Google OAuth');
      return null;
    }
    
    return response.data.access_token;
  } catch (error) {
    // Handle specific error cases
    if (axios.isAxiosError(error)) {
      if (error.response?.status === 401) {
        console.debug('Google Sheets sync disabled - invalid or expired credentials');
      } else {
        console.error('Error refreshing Google access token:', error.message);
      }
    } else {
      console.error('Unexpected error getting access token:', error);
    }
    return null;
  }
}

// Function to find existing campaign rows in the sheet
export async function findCampaignRows(campaignId: string) {
  try {
    const accessToken = await getAccessToken();
    
    // If no access token, cannot proceed
    if (!accessToken) {
      console.debug('Google Sheets sync skipped - no access token');
      return [];
    }
    
    // Get all values from the sheet
    const response = await axios.get(
      `${SHEETS_API_ENDPOINT}/${SHEET_ID}/values/${SHEET_RANGE}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    
    const rows = response.data.values || [];
    const campaignRows = [];
    
    // Find rows with matching campaign ID (assuming campaign ID is in column A)
    for (let i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i][0] === campaignId) {
        campaignRows.push({
          rowIndex: i + 1, // 1-based index for the API
          data: rows[i],
        });
      }
    }
    
    return campaignRows;
  } catch (error) {
    console.error('Error finding campaign rows:', error);
    return [];
  }
}

// Function to add campaign data to Google Sheet
export async function addCampaignToSheet(
  campaign: Campaign, 
  campaignApartments: CampaignApartment[],
  apartments: Apartment[]
) {
  try {
    const accessToken = await getAccessToken();
    
    // If no access token, cannot proceed but don't cause campaign creation to fail
    if (!accessToken) {
      console.debug('Google Sheets sync skipped - no access token');
      return true; // Return true to indicate the campaign was created successfully even if sheet sync failed
    }
    
    // Prepare rows for each apartment in the campaign
    const rows = campaignApartments.map(ca => {
      const apt = apartments.find(a => a.key === ca.apartment_key);
      
      // Format dates as dd/mm/yyyy
      let startDate = '';
      let endDate = campaign.campaign_end_date || 'Ongoing';
      
      try {
        if (campaign.campaign_start_date) {
          const parsedStart = parseISO(campaign.campaign_start_date);
          startDate = format(parsedStart, 'dd/MM/yyyy');
        }
      } catch (error) {
        // If parsing fails, try parsing as dd/MM/yyyy
        try {
          const [day, month, year] = campaign.campaign_start_date.split('/');
          const parsedStart = parseISO(`${year}-${month}-${day}`);
          startDate = format(parsedStart, 'dd/MM/yyyy');
        } catch (innerError) {
          console.error(`Failed to parse start date for campaign ${campaign.id}:`, innerError);
          startDate = campaign.campaign_start_date; // Fallback to raw value
        }
      }

      if (campaign.campaign_end_date && campaign.campaign_end_date.toUpperCase() !== 'ONGOING') {
        try {
          const parsedEnd = parseISO(campaign.campaign_end_date);
          endDate = format(parsedEnd, 'dd/MM/yyyy');
        } catch (error) {
          // If parsing fails, try parsing as dd/MM/yyyy
          try {
            const [day, month, year] = campaign.campaign_end_date.split('/');
            const parsedEnd = parseISO(`${year}-${month}-${day}`);
            endDate = format(parsedEnd, 'dd/MM/yyyy');
          } catch (innerError) {
            console.error(`Failed to parse end date for campaign ${campaign.id}:`, innerError);
            endDate = campaign.campaign_end_date; // Fallback to raw value
          }
        }
      }

      // Ensure all values are strings or numbers to prevent serialization issues
      return [
        campaign.id, // campaign_id
        campaign.partner_id, // partner_id
        campaign.partner_name, // partner_name
        campaign.agency_id, // agency_id
        campaign.agent_key, // agent_key
        ca.apartment_key, // key
        `https://www.kiinteistomaailma.fi/${ca.apartment_key}`, // url - always include the URL
        campaign.campaign_address, // campaign_address
        campaign.campaign_postal_code, // campaign_postal_code
        campaign.campaign_city, // campaign_city
        campaign.campaign_radius.toString(), // campaign_radius
        campaign.channel_meta ? 'Yes' : 'No', // channel_meta
        campaign.channel_display ? 'Yes' : 'No', // channel_display
        campaign.channel_pdooh ? 'Yes' : 'No', // channel_pdooh
        campaign.budget_meta.toString(), // budget_meta
        campaign.budget_meta_daily.toString(), // budget_meta_daily
        campaign.budget_display.toString(), // budget_display
        campaign.budget_display_daily.toString(), // budget_display_daily
        campaign.budget_pdooh.toString(), // budget_pdooh
        campaign.budget_pdooh_daily.toString(), // budget_pdooh_daily
        startDate, // campaign_start_date (formatted as dd/mm/yyyy)
        endDate, // campaign_end_date (formatted as dd/mm/yyyy or 'Ongoing')
        campaign.active ? 'Active' : 'Paused', // active
      ];
    });
    
    if (rows.length === 0) {
      console.debug('No apartment rows to add to sheet for campaign:', campaign.id);
      return true; // Still return true even if there are no rows to add
    }
    
    // Append rows to the sheet
    await axios.post(
      `${SHEETS_API_ENDPOINT}/${SHEET_ID}/values/${SHEET_NAME}!A:W:append?valueInputOption=USER_ENTERED`,
      {
        values: rows,
      },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );
    
    console.log(`Successfully added ${rows.length} rows to Google Sheet for campaign ${campaign.id}`);
    return true;
  } catch (error) {
    console.error('Error adding campaign to sheet:', error instanceof Error ? error.message : 'Unknown error');
    // Don't throw, just return false to indicate failure
    return false;
  }
}

// Helper: safely format an ISO date string to dd/MM/yyyy
function safeFormatDate(raw?: string | null): string {
  if (!raw) return '';
  if (raw.toUpperCase() === 'ONGOING') return 'Ongoing';
  try {
    return format(parseISO(raw), 'dd/MM/yyyy');
  } catch {
    return raw;
  }
}

// Helper: strip leading characters that Google Sheets would interpret as formulas (+, -, =, @)
function sheetSafe(val: string): string {
  if (val) return val.replace(/^[+=\-@]+/, '');
  return val;
}

// Helper to format a dental campaign into a sheet row (50 columns A-AX)
function formatDentalCampaignRow(campaign: DentalCampaign): string[] {
  const startDate = safeFormatDate(campaign.campaign_start_date || campaign.start_date);
  const endDate = (campaign.is_ongoing || campaign.campaign_end_date?.toUpperCase() === 'ONGOING')
    ? 'Ongoing'
    : safeFormatDate(campaign.campaign_end_date || campaign.end_date);

  const svc = campaign.service;
  const br = campaign.branch;

  // Summarise creatives: count per channel + list of sizes
  const creatives = campaign.creatives || [];
  const creativeCount = creatives.length;
  const creativeSizes = [...new Set(creatives.map(c => c.size))].join(', ');
  const creativeChannels = [...new Set(creatives.map(c => c.channel))].join(', ');
  const creativeStatuses = [...new Set(creatives.map(c => c.status))].join(', ');
  // BidTheatre creative IDs
  const btCreativeIds = creatives
    .filter(c => c.bt_creative_id)
    .map(c => c.bt_creative_id)
    .join(', ');

  return [
    // ── Core campaign (A-G) ──
    campaign.id,                                                  // A: campaign_id
    campaign.name || '',                                          // B: campaign_name
    campaign.description || '',                                   // C: description
    campaign.status || 'draft',                                   // D: status
    campaign.ad_type || '',                                       // E: ad_type
    campaign.creative_type || '',                                 // F: creative_type
    campaign.include_pricing || '',                               // G: include_pricing

    // ── Service (H-J) ──
    svc?.name || '',                                              // H: service_name
    svc?.code || '',                                              // I: service_code
    svc?.default_price || '',                                     // J: service_price

    // ── Branch (K-P) ──
    br?.name || '',                                               // K: branch_name
    br?.address || '',                                            // L: branch_address
    br?.postal_code || '',                                        // M: branch_postal_code
    br?.city || '',                                               // N: branch_city
    br?.region || '',                                             // O: branch_region
    sheetSafe(br?.phone || ''),                                  // P: branch_phone

    // ── Location targeting (Q-V) ──
    campaign.campaign_address || '',                              // Q: target_address
    campaign.campaign_postal_code || '',                          // R: target_postal_code
    campaign.campaign_city || '',                                 // S: target_city
    (campaign.campaign_radius || 0).toString(),                   // T: target_radius
    campaign.campaign_coordinates?.lat?.toString() || '',         // U: target_lat
    campaign.campaign_coordinates?.lng?.toString() || '',         // V: target_lng

    // ── Schedule (W-Y) ──
    startDate,                                                    // W: start_date
    endDate,                                                      // X: end_date
    campaign.is_ongoing ? 'Yes' : 'No',                          // Y: is_ongoing

    // ── Channels (Z-AC) ──
    campaign.channel_meta ? 'Yes' : 'No',                        // Z: channel_meta
    campaign.channel_display ? 'Yes' : 'No',                     // AA: channel_display
    campaign.channel_pdooh ? 'Yes' : 'No',                       // AB: channel_pdooh
    campaign.channel_audio ? 'Yes' : 'No',                       // AC: channel_audio

    // ── Budget (AD-AM) ──
    (campaign.total_budget || 0).toString(),                      // AD: total_budget
    (campaign.budget_meta || 0).toString(),                       // AE: budget_meta
    (campaign.budget_display || 0).toString(),                    // AF: budget_display
    (campaign.budget_pdooh || 0).toString(),                      // AG: budget_pdooh
    (campaign.budget_audio || 0).toString(),                      // AH: budget_audio
    (campaign.daily_budget_meta || 0).toFixed(2),                 // AI: daily_budget_meta
    (campaign.daily_budget_display || 0).toFixed(2),              // AJ: daily_budget_display
    (campaign.daily_budget_pdooh || 0).toFixed(2),                // AK: daily_budget_pdooh
    (campaign.daily_budget_audio || 0).toFixed(2),                // AL: daily_budget_audio
    (campaign.spent_budget || 0).toString(),                      // AM: spent_budget

    // ── Creative content (AN-AT) ──
    campaign.headline || '',                                      // AN: headline
    campaign.subheadline || '',                                   // AO: subheadline
    campaign.offer_text || '',                                    // AP: offer_text
    campaign.cta_text || '',                                      // AQ: cta_text
    campaign.landing_url || '',                                   // AR: landing_url
    campaign.background_image_url || '',                          // AS: background_image_url
    campaign.general_brand_message || '',                         // AT: general_brand_message
    (campaign.target_screens_count || 0).toString(),              // AU: target_screens_count

    // ── Audience (AV-AX) ──
    (campaign.target_age_min ?? '').toString(),                   // AV: target_age_min
    (campaign.target_age_max ?? '').toString(),                   // AW: target_age_max
    (campaign.target_genders || []).join(', '),                   // AX: target_genders

    // ── New fields (AY-BB) ──
    campaign.campaign_objective || '',                            // AY: campaign_objective
    campaign.ad_type || '',                                       // AZ: ad_type (for reference)
    svc?.code === 'yleinen-brandiviesti' ? 'Yes' : 'No',         // BA: is_general_brand_message
    campaign.include_pricing || '',                               // BB: include_pricing

    // ── Creatives summary (BC-BE) ──
    creativeCount.toString(),                                     // BC: creatives_count
    creativeSizes,                                                // BD: creative_sizes
    creativeChannels,                                             // BE: creative_channels
  ];
}

// Function to add a dental campaign to Google Sheet (one row per campaign, no apartments)
export async function addDentalCampaignToSheet(campaign: DentalCampaign): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();

    if (!accessToken) {
      console.debug('Google Sheets sync skipped - no access token');
      return true;
    }

    const row = formatDentalCampaignRow(campaign);

    const response = await axios.post(
      `${SHEETS_API_ENDPOINT}/${SHEET_ID}/values/${SHEET_RANGE}:append?valueInputOption=USER_ENTERED`,
      { values: [row] },
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      }
    );

    // Extract appended row range to store as sheet_row_id
    const updatedRange = response.data?.updates?.updatedRange || '';
    console.log(`Successfully added dental campaign ${campaign.id} to Google Sheet (${updatedRange})`);

    // Track sync in database
    await updateSheetSyncTracking(campaign.id, updatedRange);

    return true;
  } catch (error) {
    console.error('Error adding dental campaign to sheet:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// Function to update a dental campaign in Google Sheet (delete + re-add)
export async function updateDentalCampaignInSheet(campaign: DentalCampaign): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.debug('Google Sheets sync skipped - no access token');
      return true;
    }

    // Find existing rows for this campaign
    const existingRows = await findCampaignRows(campaign.id);

    if (existingRows.length > 0) {
      // Update in place — overwrite the first matching row
      const rowIndex = existingRows[0].rowIndex;
      const row = formatDentalCampaignRow(campaign);

      await axios.put(
        `${SHEETS_API_ENDPOINT}/${SHEET_ID}/values/${SHEET_NAME}!A${rowIndex}:BE${rowIndex}?valueInputOption=USER_ENTERED`,
        { values: [row] },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log(`Successfully updated dental campaign ${campaign.id} in Google Sheet (row ${rowIndex})`);
      await updateSheetSyncTracking(campaign.id, `${SHEET_NAME}!A${rowIndex}:BE${rowIndex}`);
    } else {
      // No existing row found — append as new
      return await addDentalCampaignToSheet(campaign);
    }

    return true;
  } catch (error) {
    console.error('Error updating dental campaign in sheet:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// Function to update dental campaign status in Google Sheet (column W only)
export async function updateDentalCampaignStatusInSheet(
  campaignId: string,
  status: CampaignStatus
): Promise<boolean> {
  try {
    const accessToken = await getAccessToken();
    if (!accessToken) {
      console.debug('Google Sheets sync skipped - no access token');
      return true;
    }

    const existingRows = await findCampaignRows(campaignId);
    if (existingRows.length === 0) {
      console.debug(`No sheet row found for campaign ${campaignId} — skipping status update`);
      return true;
    }

    // Update status column (D) for each matching row
    for (const row of existingRows) {
      await axios.put(
        `${SHEETS_API_ENDPOINT}/${SHEET_ID}/values/${SHEET_NAME}!D${row.rowIndex}?valueInputOption=USER_ENTERED`,
        { values: [[status]] },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    }

    console.log(`Successfully updated status to "${status}" for campaign ${campaignId} in Google Sheet`);
    await updateSheetSyncTracking(campaignId);
    return true;
  } catch (error) {
    console.error('Error updating dental campaign status in sheet:', error instanceof Error ? error.message : 'Unknown error');
    return false;
  }
}

// Function to update campaign data in Google Sheet
export async function updateCampaignInSheet(
  campaign: Campaign, 
  campaignApartments: CampaignApartment[],
  apartments: Apartment[]
) {
  try {
    // First, find existing rows for this campaign
    const existingRows = await findCampaignRows(campaign.id);
    
    // If rows exist, delete them
    if (existingRows.length > 0) {
      await deleteCampaignFromSheet(campaign.id);
    }
    
    // Then add the updated campaign data
    return await addCampaignToSheet(campaign, campaignApartments, apartments);
  } catch (error) {
    console.error('Error updating campaign in sheet:', error);
    // Don't throw, just return false to indicate failure
    return false;
  }
}

// Function to delete campaign data from Google Sheet
export async function deleteCampaignFromSheet(campaignId: string) {
  try {
    const accessToken = await getAccessToken();
    
    // If no access token, cannot proceed
    if (!accessToken) {
      console.debug('Google Sheets sync skipped - no access token');
      return true; // Return true because the campaign was successfully deleted from the database
    }
    
    // Find existing rows for this campaign
    const existingRows = await findCampaignRows(campaignId);
    
    if (existingRows.length === 0) {
      return true; // Nothing to delete, return success
    }
    
    // Fetch the spreadsheet metadata to get the sheetId of the LIVE sheet and check column count
    const spreadsheetResponse = await axios.get(
      `${SHEETS_API_ENDPOINT}/${SHEET_ID}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const sheets = spreadsheetResponse.data.sheets || [];
    const liveSheet = sheets.find((sheet: any) => sheet.properties.title === SHEET_NAME);
    if (!liveSheet) {
      console.error(`Could not find ${SHEET_NAME} sheet in spreadsheet`);
      return false;
    }
    const sheetId = liveSheet.properties.sheetId;
    const columnCount = liveSheet.properties.gridProperties?.columnCount || COLUMN_COUNT; // Default to 30 (A:AD) if not specified
    console.log(`${SHEET_NAME} sheet column count: ${columnCount}`);

    // Sort row indices in descending order to avoid shifting issues when deleting
    const rowIndices = existingRows.map(row => row.rowIndex).sort((a, b) => b - a);
    
    // Delete each row individually, starting from the bottom
    for (const rowIndex of rowIndices) {
      // First, clear the row to ensure no leftover data (use A:AX since we know the sheet structure)
      try {
        await axios.put(
          `${SHEETS_API_ENDPOINT}/${SHEET_ID}/values/${SHEET_NAME}!A${rowIndex}:AX${rowIndex}?valueInputOption=RAW`,
          {
            values: [Array(COLUMN_COUNT).fill('')], // Clear exactly 50 columns (A:AX)
          },
          {
            headers: {
              Authorization: `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
          }
        );
      } catch (clearError) {
        console.error(`Failed to clear row ${rowIndex} before deletion:`, clearError);
        // Continue with deletion even if clearing fails
      }

      // Then delete the row
      await axios.post(
        `${SHEETS_API_ENDPOINT}/${SHEET_ID}:batchUpdate`,
        {
          requests: [
            {
              deleteDimension: {
                range: {
                  sheetId: sheetId,
                  dimension: 'ROWS',
                  startIndex: rowIndex - 1, // 0-based index for the API
                  endIndex: rowIndex, // exclusive end index
                },
              },
            },
          ],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    console.log(`Successfully deleted ${rowIndices.length} rows from Google Sheet for campaign ${campaignId}`);
    return true;
  } catch (error) {
    console.error('Error deleting campaign from sheet:', error);
    // Don't throw, just return false to indicate failure
    return false;
  }
}

// Function to update campaign status in Google Sheet
export async function updateCampaignStatusInSheet(campaignId: string, active: boolean) {
  try {
    const accessToken = await getAccessToken();
    
    // If no access token, cannot proceed
    if (!accessToken) {
      console.debug('Google Sheets sync skipped - no access token');
      return true; // Return true because the campaign status was updated successfully in the database
    }
    
    // Find existing rows for this campaign
    const existingRows = await findCampaignRows(campaignId);
    
    if (existingRows.length === 0) {
      return false; // No rows to update
    }
    
    // Update the status column (column W, index 22) for each row
    const status = active ? 'Active' : 'Paused';
    
    for (const row of existingRows) {
      await axios.put(
        `${SHEETS_API_ENDPOINT}/${SHEET_ID}/values/${SHEET_NAME}!W${row.rowIndex}?valueInputOption=USER_ENTERED`,
        {
          values: [[status]],
        },
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
        }
      );
    }
    
    return true;
  } catch (error) {
    console.error('Error updating campaign status in sheet:', error);
    // Don't throw, just return false to indicate failure
    return false;
  }
}

// Function to check for deleted apartments and update campaigns
export async function checkForDeletedApartments(
  campaigns: Campaign[],
  campaignApartments: CampaignApartment[],
  apartments: Apartment[]
) {
  try {
    // Create a set of all apartment keys from the feed
    const availableApartmentKeys = new Set(apartments.map(apt => apt.key));
    
    // Find campaign apartments that no longer exist in the feed
    const deletedApartments = campaignApartments.filter(
      ca => !availableApartmentKeys.has(ca.apartment_key)
    );
    
    if (deletedApartments.length === 0) {
      return []; // No deleted apartments
    }
    
    // Group deleted apartments by campaign ID
    const campaignMap = new Map<string, CampaignApartment[]>();
    
    for (const ca of deletedApartments) {
      if (!campaignMap.has(ca.campaign_id)) {
        campaignMap.set(ca.campaign_id, []);
      }
      campaignMap.get(ca.campaign_id)?.push(ca);
    }
    
    // Return the list of affected campaigns and their deleted apartments
    return Array.from(campaignMap.entries()).map(([campaignId, deletedApts]) => {
      const campaign = campaigns.find(c => c.id === campaignId);
      return {
        campaign,
        deletedApartments: deletedApts,
      };
    });
  } catch (error) {
    console.error('Error checking for deleted apartments:', error);
    // Return empty array instead of throwing
    return [];
  }
}