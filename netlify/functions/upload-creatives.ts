import { Handler } from '@netlify/functions';
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || '';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

interface UploadItem {
  storagePath: string;
  html: string;
  creative: {
    campaign_id: string;
    template_id: string;
    name: string;
    type: string;
    size: string;
    width: number;
    height: number;
  };
}

interface UploadResult {
  storagePath: string;
  publicUrl: string;
  success: boolean;
  error?: string;
}

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const { items } = JSON.parse(event.body || '{}') as { items: UploadItem[] };

    if (!items || !items.length) {
      return { statusCode: 400, body: JSON.stringify({ error: 'No items provided' }) };
    }

    const results: UploadResult[] = [];

    for (const item of items) {
      try {
        // Upload HTML to Supabase Storage
        const { error: uploadErr } = await supabase.storage
          .from('media')
          .upload(item.storagePath, Buffer.from(item.html, 'utf-8'), {
            contentType: 'text/html',
            upsert: true,
          });

        if (uploadErr) {
          results.push({ storagePath: item.storagePath, publicUrl: '', success: false, error: uploadErr.message });
          continue;
        }

        const { data: urlData } = supabase.storage.from('media').getPublicUrl(item.storagePath);
        const publicUrl = urlData.publicUrl;

        // Create creative DB record
        const { error: creativeErr } = await supabase.from('creatives').insert({
          campaign_id: item.creative.campaign_id,
          template_id: item.creative.template_id,
          name: item.creative.name,
          type: item.creative.type,
          size: item.creative.size,
          width: item.creative.width,
          height: item.creative.height,
          image_url: publicUrl,
          preview_url: publicUrl,
          status: 'ready',
        });

        if (creativeErr) {
          console.error(`Creative record error for ${item.storagePath}:`, creativeErr.message);
        }

        results.push({ storagePath: item.storagePath, publicUrl, success: true });
      } catch (err: any) {
        results.push({ storagePath: item.storagePath, publicUrl: '', success: false, error: err.message });
      }
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ results }),
    };
  } catch (err: any) {
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};

export { handler };
