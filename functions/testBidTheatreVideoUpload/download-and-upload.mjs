import { v2 as cloudinary } from 'cloudinary';
import fetch from 'node-fetch';

/**
 * Uploads a video to Cloudinary from a URL and sends the generated URL to BidTheatre as JSON
 * @param {string} videoUrl - The URL of the video to upload
 * @param {string} linearId - The BidTheatre linear ID
 * @param {string} btToken - The BidTheatre auth token
 * @param {string} networkId - The BidTheatre network ID
 */
async function downloadAndUploadVideo(videoUrl, linearId, btToken, networkId) {
  try {
    // Configure Cloudinary
    cloudinary.config({
      cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
      api_key: process.env.CLOUDINARY_API_KEY,
      api_secret: process.env.CLOUDINARY_API_SECRET,
    });

    // Upload video to Cloudinary
    console.log(`Uploading video to Cloudinary from ${videoUrl}`);
    const uploadResult = await cloudinary.uploader.upload(videoUrl, {
      resource_type: 'video',
      public_id: `bidtheatre-videos/${linearId}-video`,
      folder: 'bidtheatre-videos',
      overwrite: true,
    });
    console.log(`Video uploaded to Cloudinary, public URL: ${uploadResult.secure_url}`);

    // Build the JSON payload
    const payload = {
      url: uploadResult.secure_url,
      delivery: 'progressive',
      bitRate: 5901, // Integer to match curl
      mimeType: 'video/mp4',
      duration: '00:00:10',
      dimension: 216, // Integer to match curl
      scalable: false,
      maintainRatio: false,
    };

    // Log payload for debugging
    console.log('JSON payload:', JSON.stringify(payload, null, 2));

    // Upload to BidTheatre using node-fetch with JSON
    console.log(`Sending video URL to BidTheatre for linear ID ${linearId}`);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15-second timeout
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
      throw new Error(`Request failed with status code ${uploadResponse.status}: ${JSON.stringify(responseData)}`);
    }

    console.log('BidTheatre upload response:', JSON.stringify(responseData, null, 2));
    console.log('Response headers:', Object.fromEntries(uploadResponse.headers));

    return { success: true, output: JSON.stringify(responseData), response: responseData };
  } catch (error) {
    console.error('Error in downloadAndUploadVideo:', error.message);
    let errorDetails = {
      message: error.message,
      stdout: error.stdout || '',
      stderr: error.stderr || error.message,
    };
    return {
      success: false,
      error: error.message,
      ...errorDetails,
    };
  }
}

// Example usage (can be called from index.mts)
export async function runDownloadAndUpload(videoUrl, linearId, btToken, networkId) {
  console.log(`Starting download and upload for video ${videoUrl} to linear ID ${linearId}`);
  return downloadAndUploadVideo(videoUrl, linearId, btToken, networkId);
}

// Allow direct execution for testing
if (process.argv[2] === '--run') {
  const videoUrl = process.argv[3];
  const linearId = process.argv[4] || '16821';
  const btToken = process.argv[5];
  const networkId = process.argv[6] || '716';

  if (!videoUrl || !btToken) {
    console.error('Usage: node download-and-upload.mjs --run <videoUrl> [linearId] <btToken> [networkId]');
    process.exit(1);
  }

  runDownloadAndUpload(videoUrl, linearId, btToken, networkId)
    .then(result => {
      console.log('Result:', JSON.stringify(result, null, 2));
      process.exit(result.success ? 0 : 1);
    })
    .catch(err => {
      console.error('Execution error:', err);
      process.exit(1);
    });
}