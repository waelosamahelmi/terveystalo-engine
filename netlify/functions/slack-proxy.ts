import type { Handler } from '@netlify/functions';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const handler: Handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  try {
    const { webhookUrl, payload } = JSON.parse(event.body || '{}');

    if (!webhookUrl || !payload) {
      return { statusCode: 400, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Missing webhookUrl or payload' }) };
    }

    // Only allow Slack webhook URLs
    const parsed = new URL(webhookUrl);
    if (parsed.hostname !== 'hooks.slack.com') {
      return { statusCode: 403, headers: CORS_HEADERS, body: JSON.stringify({ error: 'Only hooks.slack.com URLs are allowed' }) };
    }

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const text = await response.text();

    return {
      statusCode: response.ok ? 200 : response.status,
      headers: CORS_HEADERS,
      body: JSON.stringify({ ok: response.ok, status: response.status, body: text }),
    };
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    console.error('Slack proxy error:', error);
    return { statusCode: 500, headers: CORS_HEADERS, body: JSON.stringify({ error: message }) };
  }
};

export { handler };
