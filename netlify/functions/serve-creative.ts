import type { Handler } from '@netlify/functions';

/**
 * Proxy function to serve HTML creatives with the correct Content-Type.
 * Supabase Storage serves HTML files as plain text/download for XSS protection,
 * so this proxy fetches the HTML and re-serves it as text/html.
 *
 * Usage: /.netlify/functions/serve-creative?url=<supabase_storage_url>
 */
const ALLOWED_HOST = '.supabase.co';

const handler: Handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const url = event.queryStringParameters?.url;
  if (!url) {
    return { statusCode: 400, body: 'Missing url parameter' };
  }

  // Validate that URL points to our Supabase storage only
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return { statusCode: 400, body: 'Invalid URL' };
  }

  if (!parsed.hostname.endsWith(ALLOWED_HOST)) {
    return { statusCode: 403, body: 'Domain not allowed' };
  }

  try {
    const response = await fetch(url, { headers: { Accept: 'text/html' } });

    if (!response.ok) {
      return { statusCode: response.status, body: `Upstream error: ${response.statusText}` };
    }

    const html = await response.text();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
      body: html,
    };
  } catch (err: any) {
    return { statusCode: 502, body: `Fetch failed: ${err.message}` };
  }
};

export { handler };
