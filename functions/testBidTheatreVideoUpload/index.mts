import { createClient } from '@supabase/supabase-js';
import axios from 'axios';
import FormData from 'form-data';
import { Buffer } from 'buffer';
import { runDownloadAndUpload } from './download-and-upload.mjs'; // Import the working curl-based upload function

// Constants
const BT_API_URL = 'https://asx-api.bidtheatre.com/v2.0/api';
const CREATOPY_API_URL = 'https://api.creatopy.com/v1';
const CREATOPY_CLIENT_ID = '5b324250-8429-443b-bc11-dff33c472c89';
const CREATOPY_CLIENT_SECRET = 'eb427fff-2ad7-40fe-b2fd-5c919bc27f4e';

// Get environment variables
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

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Axios instances
const bidTheatreApi = axios.create({
  baseURL: BT_API_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 60000,
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

// Authenticate with BidTheatre
async function getBidTheatreToken() {
  const credentials = await getBidTheatreCredentials();
  try {
    console.log(`Authenticating with BidTheatre using network ID: ${credentials.network_id}`);
    const response = await bidTheatreApi.post('/auth', {
      username: credentials.username,
      password: credentials.password,
    });
    
    if (!response.data || !response.data.auth || !response.data.auth.token) {
      console.error('Invalid BidTheatre authentication response:', response.data);
      throw new Error('Invalid BidTheatre authentication response structure');
    }
    
    const token = response.data.auth.token;
    console.log(`Successfully authenticated with BidTheatre, token received`);
    return token;
  } catch (error) {
    console.error('Error authenticating with BidTheatre:', error.response?.data || error.message);
    throw new Error(`BidTheatre authentication failed: ${error.response?.data?.message || error.message}`);
  }
}

// Authenticate with Creatopy
async function getCreatopyToken() {
  try {
    console.log('Authenticating with Creatopy');
    const response = await creatopyApi.post('/auth/token', {
      clientId: CREATOPY_CLIENT_ID,
      clientSecret: CREATOPY_CLIENT_SECRET,
    });
    const token = response.data?.token;
    if (!token) {
      throw new Error('No token received from Creatopy');
    }
    console.log('Successfully authenticated with Creatopy');
    return token;
  } catch (error) {
    console.error('Error authenticating with Creatopy:', error.response?.data || error.message);
    throw new Error(`Creatopy authentication failed: ${error.response?.data?.message || error.message}`);
  }
}

// Poll Creatopy export
async function pollCreatopyExport(exportId, creatopyToken, maxAttempts = 15, initialDelayMs = 1500) {
  let delayMs = initialDelayMs;
  console.log(`Polling Creatopy export for ID ${exportId}, max attempts: ${maxAttempts}`);

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

// Test the video upload process
export default async function handler(request: Request): Promise<Response> {
  console.log('Test video upload function started at:', new Date().toISOString());
  
  if (request.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method Not Allowed' }),
      { status: 405, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  let requestData: {
    creativeId?: string;
    linearId?: string;
    creativeHash?: string;
    skipVideoDownload?: boolean;
    useFileUpload?: boolean; // New parameter to choose upload method
  };
  
  try {
    const raw = await request.text();
    requestData = JSON.parse(raw);
    console.log('Request data:', requestData);
  } catch (err: any) {
    console.error('Invalid JSON', err);
    return new Response(
      JSON.stringify({ error: 'Invalid JSON payload', details: err.message }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    );
  }
  
  const creativeHash = requestData.creativeHash || 'x8x7e3x'; // Default hash for 1080x1920 template
  const linearId = requestData.linearId || '16821';
  const skipVideoDownload = requestData.skipVideoDownload || false;
  const useFileUpload = requestData.useFileUpload || false; // Whether to use file upload method
  
  try {
    // Step 1: Get tokens for both APIs
    console.log('Getting authentication tokens...');
    
    const [btToken, creatopyToken] = await Promise.all([
      getBidTheatreToken(),
      getCreatopyToken()
    ]);
    
    const credentials = await getBidTheatreCredentials();
    const BT_NETWORK_ID = credentials.network_id;
    
    // Step 2: Generate video from Creatopy using the /export endpoint
    console.log('Creating Creatopy export for creative hash:', creativeHash);
    
    // Use the /export endpoint
    const exportPayload = {
      creativeHash: creativeHash,
      type: 'mp4'
    };
    
    console.log('Export payload:', JSON.stringify(exportPayload));
    
    const exportResponse = await creatopyApi.post('/export', exportPayload, {
      headers: { Authorization: `Bearer ${creatopyToken}` },
    });
    
    console.log('Creatopy export response:', JSON.stringify(exportResponse.data, null, 2));
    
    const exportId = exportResponse.data.response?.export?.id;
    if (!exportId) {
      throw new Error('Creatopy export ID is undefined in response');
    }
    
    // Step 3: Poll for video URL
    const videoUrl = await pollCreatopyExport(exportId, creatopyToken);
    console.log('Retrieved video URL from Creatopy:', videoUrl);

    // Due to timeout constraints, we can return early with just the video URL
    if (skipVideoDownload) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'Video export successful',
          details: {
            creativeHash,
            exportId,
            videoUrl,
            note: 'Video download skipped to avoid timeout. Use the videoUrl directly in a separate test.'
          }
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }
    
    // Choose between direct URL upload or file upload
    if (!useFileUpload) {
      // Step 4a: Use direct URL method (which we now know works)
      console.log('Using direct URL method to upload video');
      
      try {
        // Format URL protocol correctly if needed
        const formattedUrl = videoUrl.replace('{protocol}:', 'https:');
        
        console.log(`Uploading video to BidTheatre for linear ID: ${linearId}`);
        console.log('Video URL:', formattedUrl);
        
        // Create the payload in the exact format needed
        const payload = {
          url: formattedUrl,
          duration: '00:00:10',
          delivery: 'progressive',
          mimeType: 'video/mp4',
          bitRate: 5901,
          dimension: 216
        };
        
        console.log('Request payload:', JSON.stringify(payload, null, 2));
        
        // Make the API request directly 
        const result = await axios({
          method: 'post',
          url: `${BT_API_URL}/${BT_NETWORK_ID}/video-linear/${linearId}/media`,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${btToken}`
          },
          data: payload
        });
        
        console.log('BidTheatre upload response:', JSON.stringify(result.data, null, 2));
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Video media uploaded successfully using direct URL',
            details: {
              creativeHash,
              linearId,
              exportId,
              videoUrl: formattedUrl,
              bidTheatreResponse: result.data
            }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (uploadError) {
        // Error handling for URL upload...
        console.error('Video upload to BidTheatre failed with URL method:', uploadError.message);
        throw uploadError;
      }
    } else {
      // Step 4b: Use the working curl-based download and upload method
      console.log('Using curl-based file upload method - downloading video first...');
      
      try {
        // Format URL protocol correctly if needed
        const formattedUrl = videoUrl.replace('{protocol}:', 'https:');
        
        // Use the working curl implementation from download-and-upload.mjs
        const uploadResult = await runDownloadAndUpload(formattedUrl, linearId, btToken, BT_NETWORK_ID);
        
        if (!uploadResult.success) {
          throw new Error(`Curl-based file upload failed: ${uploadResult.error || 'Unknown error'}`);
        }
        
        console.log('BidTheatre file upload successful using curl');
        
        let responseData = {};
        try {
          // Fix the TypeScript error by ensuring uploadResult.output is a string
          if (uploadResult.output) {
            responseData = JSON.parse(uploadResult.output);
          } else {
            console.log('No output received from curl command');
          }
        } catch (e) {
          console.log('Could not parse BidTheatre response as JSON, using raw output');
          responseData = { rawOutput: uploadResult.output || '' };
        }
        
        return new Response(
          JSON.stringify({
            success: true,
            message: 'Video uploaded successfully using file method (curl)',
            details: {
              creativeHash,
              linearId,
              exportId,
              uploadMethod: 'curl',
              bidTheatreResponse: responseData
            }
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      } catch (fileUploadError) {
        console.error('File upload method failed:', fileUploadError.message);
        
        // Additional error details
        const errorDetails = {
          message: fileUploadError.message || 'Unknown error',
          stdout: fileUploadError.stdout,
          stderr: fileUploadError.stderr,
          videoUrl: videoUrl
        };
        
        return new Response(
          JSON.stringify({
            success: false,
            error: 'Video upload with file method failed',
            details: errorDetails
          }),
          { status: 200, headers: { 'Content-Type': 'application/json' } }
        );
      }
    }
  } catch (error) {
    console.error('Error in test video upload:', error);
    
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        details: error.response?.data || error.cause || {}
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}