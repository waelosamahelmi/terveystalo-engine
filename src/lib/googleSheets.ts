import axios from 'axios';
import { Campaign, CampaignApartment, Apartment } from '../types';
import { parseISO, format } from 'date-fns';

// Google Sheets API endpoint
const SHEETS_API_ENDPOINT = 'https://sheets.googleapis.com/v4/spreadsheets';
const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID || '1c2nbTb3nwwoO3bzQWcxI32F7WiFQ4PgPk16aUF8-Fdk'; // Default to Suun Terveystalo feed sheet
const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const CLIENT_SECRET = import.meta.env.VITE_GOOGLE_CLIENT_SECRET;
const REFRESH_TOKEN = import.meta.env.VITE_GOOGLE_REFRESH_TOKEN;

// Sheet name for Suun Terveystalo feed
const SHEET_NAME = 'FEED';

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
      `${SHEETS_API_ENDPOINT}/${SHEET_ID}/values/${SHEET_NAME}!A:W`,
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
    const columnCount = liveSheet.properties.gridProperties?.columnCount || 23; // Default to 23 (A:W) if not specified
    console.log(`${SHEET_NAME} sheet column count: ${columnCount}`);

    // Sort row indices in descending order to avoid shifting issues when deleting
    const rowIndices = existingRows.map(row => row.rowIndex).sort((a, b) => b - a);
    
    // Delete each row individually, starting from the bottom
    for (const rowIndex of rowIndices) {
      // First, clear the row to ensure no leftover data (use A:W since we know the sheet structure)
      try {
        await axios.put(
          `${SHEETS_API_ENDPOINT}/${SHEET_ID}/values/${SHEET_NAME}!A${rowIndex}:W${rowIndex}?valueInputOption=RAW`,
          {
            values: [Array(23).fill('')], // Clear exactly 23 columns (A:W)
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